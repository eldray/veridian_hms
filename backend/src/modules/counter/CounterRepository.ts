import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { getCounterService } from '../../services/CounterService';
import { CounterClientSummary } from './CounterTypes';

const TICKET_INCLUDE = {
  Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true } },
  CounterClient: { select: { id: true, name: true, ageYears: true, phone: true, registeredPatientId: true } },
  User_Attendance_createdByIdToUser: { select: { fullName: true } },
} as const;

/**
 * Counter customers and their tickets. The ticket itself is an Attendance, so the
 * orders, results, dispensing and billing rows are written by the existing encounter
 * and bill repositories — this class only owns the counter's own identity rows.
 */
export class CounterRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'counterClient');
  }

  private normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /**
   * A returning customer is asked for their name and phone, never a folder number.
   * Match on both so "Kofi" and "Kofi Mensah" stay separate people, and so two
   * different customers who share a phone do not merge into one history.
   */
  async findMatchingClient(name: string, phone?: string | null) {
    const candidates = await this.prisma.counterClient.findMany({
      where: { name: { equals: name.trim(), mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    const wanted = this.normalizeName(name);
    const wantedPhone = (phone || '').replace(/\D/g, '');
    return candidates.find((client) => {
      if (this.normalizeName(client.name) !== wanted) return false;
      // Without a phone on either side there is nothing to separate two same-named
      // customers, so a new row is created rather than guessing they are the same.
      if (!wantedPhone) return !((client.phone || '').replace(/\D/g, ''));
      return (client.phone || '').replace(/\D/g, '') === wantedPhone;
    }) ?? null;
  }

  async createClient(data: { name: string; ageYears?: number | null; phone?: string | null }) {
    const name = data.name.trim();
    if (!name) throw new ValidationError('A name is required');
    return this.prisma.counterClient.create({
      data: {
        name,
        ageYears: data.ageYears ?? null,
        phone: data.phone?.trim() || null,
      },
    });
  }

  async findClientById(id: string) {
    const client = await this.prisma.counterClient.findUnique({ where: { id } });
    if (!client) throw new NotFoundError('Counter customer', id);
    return client;
  }

  async searchClients(query: string, limit: number): Promise<CounterClientSummary[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const digits = trimmed.replace(/\D/g, '');
    const clients = await this.prisma.counterClient.findMany({
      where: {
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      select: {
        id: true, name: true, ageYears: true, phone: true, createdAt: true, registeredPatientId: true,
        _count: { select: { Attendance: true } },
        Attendance: { orderBy: { dateTime: 'desc' }, take: 1, select: { dateTime: true } },
      },
    });

    return clients.map((client: any) => ({
      id: client.id,
      name: client.name,
      ageYears: client.ageYears,
      phone: client.phone,
      createdAt: client.createdAt,
      registeredPatientId: client.registeredPatientId,
      ticketCount: client._count?.Attendance ?? 0,
      lastVisit: client.Attendance?.[0]?.dateTime ?? null,
    }));
  }

  /**
   * Creates the ticket. A walk-in is a person with no folder, so the counter client is
   * created here when the caller handed over a name instead of an existing identity.
   */
  async createTicket(data: {
    patientId?: string | null;
    clientId?: string | null;
    client?: { name: string; ageYears?: number | null; phone?: string | null } | null;
    reason?: string | null;
    actorId: string;
  }) {
    let patientId: string | null = null;
    let counterClientId: string | null = null;

    if (data.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: data.patientId },
        select: { id: true },
      });
      if (!patient) throw new NotFoundError('Patient', data.patientId);
      patientId = patient.id;
    } else if (data.clientId) {
      counterClientId = (await this.findClientById(data.clientId)).id;
    } else if (data.client?.name) {
      const existing = await this.findMatchingClient(data.client.name, data.client.phone);
      counterClientId = existing
        ? existing.id
        : (await this.createClient({ name: data.client.name, ageYears: data.client.ageYears, phone: data.client.phone })).id;
    }

    if (!patientId && !counterClientId) {
      throw new ValidationError('A counter ticket needs a name, an existing counter customer or a registered patient');
    }
    // The database enforces exactly-one-of; check here so the staff member gets a
    // readable message instead of a foreign-key error.
    if (patientId && counterClientId) {
      throw new ValidationError('A counter ticket is either a registered patient or a walk-in, not both');
    }

    return this.prisma.attendance.create({
      data: {
        attendanceNumber: getCounterService().nextAttendanceNumber(),
        patientId,
        counterClientId,
        attendanceType: 'walk_in',
        encounterCategory: 'opd',
        paymentMode: 'cash',
        status: 'pending',
        complaints: data.reason?.trim() || null,
        createdById: data.actorId,
        dateTime: new Date(),
      },
      include: TICKET_INCLUDE,
    });
  }

  /** Every read and write on a ticket funnels through here: it must exist and be a counter ticket. */
  async findTicket(id: string) {
    const ticket = await this.prisma.attendance.findUnique({ where: { id }, include: TICKET_INCLUDE });
    if (!ticket) throw new NotFoundError('Counter ticket', id);
    if (ticket.attendanceType !== 'walk_in') {
      throw new ValidationError('This visit is a clinical encounter, not a counter ticket. Use the visit screen.');
    }
    return ticket;
  }

  async findTicketClientAttendanceIds(clientId: string) {
    const rows = await this.prisma.attendance.findMany({
      where: { counterClientId: clientId },
      select: { id: true },
      take: 500,
    });
    return rows.map((row: { id: string }) => row.id);
  }

  async listTickets(filters: {
    query?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page: number;
    limit: number;
  }) {
    const { query, status, dateFrom, dateTo, page, limit } = filters;
    const where: any = { attendanceType: 'walk_in' };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = dateFrom;
      if (dateTo) where.dateTime.lte = dateTo;
    }
    if (query?.trim()) {
      const trimmed = query.trim();
      const digits = trimmed.replace(/\D/g, '');
      const matchingClients = digits.length >= 3
        ? await this.prisma.counterClient.findMany({
            where: { OR: [{ phone: { contains: digits } }, { name: { contains: trimmed, mode: 'insensitive' } }] },
            select: { id: true },
            take: 200,
          })
        : await this.prisma.counterClient.findMany({
            where: { name: { contains: trimmed, mode: 'insensitive' } },
            select: { id: true },
            take: 200,
          });
      where.OR = [
        { attendanceNumber: { contains: trimmed, mode: 'insensitive' } },
        { CounterClient: { id: { in: matchingClients.map((client: { id: string }) => client.id) } } },
        { Patient: { OR: [{ surname: { contains: trimmed, mode: 'insensitive' } }, { otherNames: { contains: trimmed, mode: 'insensitive' } }, { folderNumber: { contains: trimmed, mode: 'insensitive' } }] } },
      ];
    }

    // Tickets are Attendance rows, not CounterClient rows, so this list cannot use the
    // base pagination helper (which is bound to this repository's own model).
    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: TICKET_INCLUDE,
        orderBy: [{ dateTime: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Attaches a real folder to a counter identity once the customer registers.
   * Financial rows already raised keep the identity they were created with; only new
   * tickets need the patient. Unique column: one counter identity links once.
   */
  async linkClientToPatient(clientId: string, patientId: string) {
    const client = await this.findClientById(clientId);
    if (client.registeredPatientId) throw new ConflictError('This counter customer is already linked to a patient folder');
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) throw new NotFoundError('Patient', patientId);
    // A concurrent link loses against the unique column instead of overwriting the first folder.
    const linked = await this.prisma.counterClient.updateMany({
      where: { id: clientId, registeredPatientId: null },
      data: { registeredPatientId: patientId },
    });
    if (linked.count !== 1) throw new ConflictError('This counter customer was linked while you were saving; refresh the ticket');
    return this.prisma.counterClient.findUniqueOrThrow({
      where: { id: clientId },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } } },
    });
  }

  /**
   * An over-the-counter sale line. It is a Medication row so it reuses the pharmacy's
   * atomic stock deduction on dispense and the bill generator's existing 'dispensed'
   * rule — no second, softer inventory path.
   */
  async createSaleLine(ticketId: string, data: { stockItemId: string; quantity: number; notes?: string | null }, actorId: string) {
    const stock = await this.prisma.stockItem.findUnique({
      where: { id: data.stockItemId },
      select: { id: true, name: true, unitOfMeasure: true, currentStock: true },
    });
    if (!stock) throw new NotFoundError('Stock item', data.stockItemId);

    // Pricing and the bill line both come from the catalog entry, so a sale of an item
    // nobody priced would silently bill nothing. Fail before the basket line is made.
    const catalog = await this.prisma.serviceCatalog.findFirst({
      where: { stockItemId: data.stockItemId, serviceType: 'medication', isActive: true },
      select: { id: true, name: true },
    });
    if (!catalog) {
      throw new ValidationError(`"${stock.name}" has no active medication service in the price list. Ask an administrator to price it before selling it.`);
    }

    return this.prisma.medication.create({
      data: {
        attendanceId: ticketId,
        stockItemId: data.stockItemId,
        serviceCatalogId: catalog.id,
        name: stock.name,
        quantity: data.quantity,
        status: 'prescribed',
        instructions: data.notes?.trim() || null,
        prescribedById: actorId,
        prescribedAt: new Date(),
      },
      include: {
        StockItem: { select: { id: true, name: true, currentStock: true, unitOfMeasure: true } },
        ServiceCatalog: { select: { id: true, name: true, code: true } },
      },
    });
  }
}
