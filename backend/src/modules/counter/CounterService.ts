import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { ConflictError, ValidationError } from '../../utils/errors';
import { EncounterRepository } from '../encounter/EncounterRepository';
import { EncounterService } from '../encounter/EncounterService';
import { BillService } from '../bill/BillService';
import { CounterRepository } from './CounterRepository';
import { AddOrderInput, AddSaleItemInput, CounterTicketFilters, CreateTicketInput } from './CounterTypes';

/**
 * The counter: sell a drug, order a lab test or a scan, take the money — for someone who
 * is not joining the clinical register.
 *
 * Orders, results, dispensing and bills are written by the encounter and bill
 * repositories unchanged. What this service adds is the identity (a CounterClient
 * instead of a Patient) and the rule that a counter ticket stays a counter ticket:
 * a walk-in cannot be discharged, referred, admitted or claimed, and a clinical
 * encounter cannot be served through this screen by mistake.
 */
export class CounterService extends BaseService {
  private prisma: PrismaClient;
  private repository: CounterRepository;
  private encounters: EncounterRepository;
  private encounterService: EncounterService;
  private bills: BillService;

  constructor(prisma: PrismaClient) {
    super('CounterService');
    this.prisma = prisma;
    this.repository = new CounterRepository(prisma);
    this.encounters = new EncounterRepository(prisma);
    this.encounterService = new EncounterService(prisma);
    this.bills = new BillService(prisma);
  }

  async searchClients(query: string, limit = 20) {
    return this.repository.searchClients(query, limit);
  }

  async listTickets(filters: CounterTicketFilters) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const result = await this.repository.listTickets({
      query: filters.query,
      status: filters.status,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page,
      limit,
    });
    return {
      data: result.data,
      pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    };
  }

  async createTicket(input: CreateTicketInput, userId: string) {
    const actorId = await this.encounters.requireActorId(userId);
    const ticket = await this.repository.createTicket({ ...input, actorId });
    this.logInfo('Counter ticket opened', { ticketId: ticket.id, counterClientId: ticket.counterClientId, patientId: ticket.patientId });
    return ticket;
  }

  async getTicket(id: string) {
    const ticket = await this.repository.findTicket(id);
    // The visit screen reads the encounter through the same projection, so the counter
    // page shows the same orders, results and bills it would show at the desk.
    const detail = await this.encounters.findById(id);
    return { ...(detail ?? ticket), CounterClient: ticket.CounterClient, Patient: ticket.Patient };
  }

  /** Every ticket write: prove it is a counter ticket and that it is still open. */
  private async requireOpenTicket(id: string) {
    const ticket = await this.repository.findTicket(id);
    // Same closed set the encounter repository guards clinical orders with, so a ticket
    // cannot be sold against once its money or care has been closed out by another screen.
    if (['completed', 'cancelled', 'discharged', 'referred', 'absconded'].includes(ticket.status)) {
      throw new ConflictError(`This ticket is already ${ticket.status}. Open a new one instead.`);
    }
    return ticket;
  }

  async addSaleItem(ticketId: string, data: AddSaleItemInput, userId: string) {
    await this.requireOpenTicket(ticketId);
    const actorId = await this.encounters.requireActorId(userId);
    if (!Number.isSafeInteger(data.quantity) || data.quantity <= 0) {
      throw new ValidationError('Quantity must be a positive whole number');
    }
    return this.repository.createSaleLine(ticketId, data, actorId);
  }

  /**
   * Handing the goods over is the pharmacy step, so it runs the pharmacy's own guarded
   * dispensing (batch allocation, stock balance, double-deduction protection).
   */
  async dispenseItem(ticketId: string, medicationId: string, data: { quantity: number }, userId: string) {
    await this.requireOpenTicket(ticketId);
    return this.encounters.updateMedication(ticketId, medicationId, {
      status: 'dispensed',
      quantity: data.quantity,
    }, userId);
  }

  async cancelSaleItem(ticketId: string, medicationId: string) {
    await this.requireOpenTicket(ticketId);
    // Only an undispatched basket line may be dropped here. Stock that already left the
    // shelf needs the documented stock-correction workflow, same as in the pharmacy.
    return this.encounters.removeMedication(ticketId, medicationId);
  }

  async addLabOrder(ticketId: string, data: AddOrderInput, userId: string) {
    await this.requireOpenTicket(ticketId);
    return this.encounters.addLabTest(ticketId, {
      templateId: data.templateId ?? undefined,
      serviceCatalogId: data.serviceCatalogId ?? undefined,
      priority: data.priority,
      notes: data.notes ?? undefined,
    } as any, userId);
  }

  async removeLabOrder(ticketId: string, labTestId: string) {
    await this.requireOpenTicket(ticketId);
    return this.encounters.removeLabTest(ticketId, labTestId);
  }

  async addScanOrder(ticketId: string, data: AddOrderInput, userId: string) {
    await this.requireOpenTicket(ticketId);
    return this.encounters.addScan(ticketId, {
      templateId: data.templateId ?? undefined,
      serviceCatalogId: data.serviceCatalogId ?? undefined,
      priority: data.priority,
      notes: data.notes ?? undefined,
    } as any, userId);
  }

  async removeScanOrder(ticketId: string, scanId: string) {
    await this.requireOpenTicket(ticketId);
    return this.encounters.removeScan(ticketId, scanId);
  }

  /**
   * Raise the bill for what the counter has already done. This is the same priced,
   * tariff-dated path the clinical screens use; the counter only adds the route so a
   * pharmacist can bill a basket without being given the whole billing screen.
   */
  async raiseBill(ticketId: string, userId: string) {
    await this.requireOpenTicket(ticketId);
    const bill = await this.bills.generateFromEncounter(ticketId, userId);
    this.logInfo('Counter bill raised', { ticketId, billId: (bill as any)?.id });
    return bill;
  }

  /** The bill this ticket raised, if any — the counter page shows the same numbers accounts does. */
  async getBill(ticketId: string) {
    await this.repository.findTicket(ticketId);
    const bill = await this.prisma.bill.findFirst({
      where: { attendanceId: ticketId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, billNumber: true, status: true, subtotal: true, discount: true, taxAmount: true,
        totalAmount: true, paidAmount: true, balance: true, paymentMode: true, createdAt: true,
      },
    });
    return bill;
  }

  /**
   * Closing a ticket, and only when the counter's own work is finished. The bill is not
   * raised here on purpose: it is raised from the bill flow so the money and the goods
   * leave the counter through the same audited path as any other bill.
   */
  async closeTicket(ticketId: string, userId: string) {
    const ticket = await this.repository.findTicket(ticketId);
    if (ticket.status === 'cancelled') throw new ConflictError('This ticket was cancelled');
    if (ticket.status === 'completed') return ticket;

    const outstanding = await this.findOutstanding(ticketId);
    if (outstanding.unpaidBills > 0) {
      throw new ValidationError('The bill for this ticket still has a balance. Collect the payment before closing it.');
    }
    if (outstanding.pendingOrders > 0) {
      throw new ValidationError(`${outstanding.pendingOrders} lab or scan order(s) have no result yet. Enter the result or cancel the order before closing.`);
    }
    if (outstanding.undispensed > 0) {
      throw new ValidationError(`${outstanding.undispensed} item(s) have not been handed over yet. Dispense or cancel them before closing.`);
    }
    return this.encounterService.completeEncounter(ticketId, userId);
  }

  private async findOutstanding(ticketId: string) {
    const [unpaidBills, pendingLabs, pendingScans, undispensed] = await Promise.all([
      this.prisma.bill.count({ where: { attendanceId: ticketId, balance: { gt: 0 }, status: { not: 'cancelled' } } }),
      this.prisma.labTest.count({ where: { attendanceId: ticketId, status: { in: ['requested', 'in_progress'] } } }),
      this.prisma.scan.count({ where: { attendanceId: ticketId, status: { in: ['requested', 'in_progress'] } } }),
      this.prisma.medication.count({ where: { attendanceId: ticketId, status: 'prescribed' } }),
    ]);
    return { unpaidBills, pendingOrders: pendingLabs + pendingScans, undispensed };
  }

  async linkClientToPatient(clientId: string, patientId: string) {
    return this.repository.linkClientToPatient(clientId, patientId);
  }
}
