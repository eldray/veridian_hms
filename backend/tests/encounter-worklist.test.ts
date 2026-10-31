import { describe, expect, it, vi } from 'vitest';
import {
  CLOSED_ATTENDANCE_STATUSES,
  EncounterRepository,
  attendanceQueueRank,
  compareAttendanceQueueRows,
  queueTimeKey,
} from '../src/modules/encounter/EncounterRepository';
import { EncounterService } from '../src/modules/encounter/EncounterService';
import { parseWorklistQuery } from '../src/modules/encounter/EncounterController';

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

/**
 * A queue row shaped the way Prisma returns it for the attendance queues: the visit itself plus the
 * includes each worklist asks for. Every queue reads the same fields, so one builder keeps the tests
 * about behaviour rather than about fixture bookkeeping.
 */
const attendanceRow = (overrides: any = {}) => ({
  id: 'attendance-1',
  attendanceNumber: 'ATT-0000001',
  patientId: 'patient-1',
  status: 'pending',
  dateTime: new Date(),
  updatedAt: new Date(),
  encounterCategory: 'opd',
  attendanceType: 'general_consultation',
  medicalNotes: null,
  Patient: {
    id: 'patient-1', surname: 'Mensah', otherNames: 'Ama',
    dateOfBirth: new Date('1990-01-01'), gender: 'female', folderNumber: 'F-00001',
  },
  Bed: null,
  Vitals: [],
  AttendanceDiagnosis: [],
  antenatalBookings: [],
  currentAntenatalBookings: [],
  antenatalVisits: [],
  deliveryRecords: [],
  postnatalRecords: [],
  LabTest: [],
  Scan: [],
  Procedure: [],
  ...overrides,
});

/** Fresh copies on every call: the queue sorts in place, and a shared array would leak that order. */
const queueRepository = (rows: any[] = []) => {
  const attendance = { findMany: vi.fn(async () => rows.map((row) => ({ ...row }))) };
  const prisma: any = { attendance, labTest: { findMany: vi.fn(async () => []) } };
  return { repository: new EncounterRepository(prisma), attendance, findMany: attendance.findMany };
};

const firstWhere = (findMany: any) => findMany.mock.calls[0][0].where;

describe('attendance queue ranking', () => {
  it('puts today in front, then inpatients, then visits left open, and closed visits last', () => {
    expect(attendanceQueueRank({ status: 'pending', dateTime: new Date() })).toBe(0);
    expect(attendanceQueueRank({ status: 'admitted', dateTime: new Date() })).toBe(0);
    expect(attendanceQueueRank({ status: 'admitted', dateTime: daysAgo(9) })).toBe(1);
    expect(attendanceQueueRank({ status: 'pending', dateTime: daysAgo(9) })).toBe(2);
    expect(attendanceQueueRank({ status: 'completed', dateTime: new Date() })).toBe(3);
  });

  it('treats every way a visit can be closed as closed', () => {
    for (const status of CLOSED_ATTENDANCE_STATUSES) {
      expect(attendanceQueueRank({ status, dateTime: new Date() })).toBe(3);
    }
  });

  it('refuses to let an unreadable visit date claim the front of the queue', () => {
    expect(attendanceQueueRank({ status: 'pending', dateTime: 'not-a-date' })).toBe(2);
    expect(attendanceQueueRank({ status: 'pending', dateTime: null })).toBe(2);
    expect(queueTimeKey('not-a-date')).toBeGreaterThan(queueTimeKey(new Date()));
    expect(queueTimeKey(undefined)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('serves the longest-waiting patient first inside a rank', () => {
    const rows = [
      { status: 'pending', dateTime: daysAgo(1) },
      { status: 'pending', dateTime: daysAgo(5) },
      { status: 'pending', dateTime: null },
      { status: 'pending', dateTime: new Date() },
    ];

    const sorted = [...rows].sort(compareAttendanceQueueRows);

    expect(sorted.map((r) => r.dateTime)).toEqual([rows[3].dateTime, rows[1].dateTime, rows[0].dateTime, null]);
  });
});

describe('vitals worklist view', () => {
  it('asks only for visits that are still open by default', async () => {
    const { repository, findMany } = queueRepository();

    const result = await repository.getVitalsWorklist();
    const where = firstWhere(findMany);

    expect(result.view).toBe('pending');
    expect(where.status).toEqual({ in: ['pending', 'admitted'] });
    expect(CLOSED_ATTENDANCE_STATUSES.some((s) => where.status.in.includes(s))).toBe(false);
    expect(where.dateTime).toBeUndefined();
  });

  it('orders today before an older pending visit and an earlier admission', async () => {
    const { repository } = queueRepository([
      attendanceRow({ id: 'overdue', attendanceNumber: 'ATT-2', status: 'pending', dateTime: daysAgo(9) }),
      attendanceRow({ id: 'inpatient', attendanceNumber: 'ATT-3', status: 'admitted', dateTime: daysAgo(20) }),
      attendanceRow({ id: 'today', attendanceNumber: 'ATT-1', status: 'pending', dateTime: new Date() }),
    ]);

    const result = await repository.getVitalsWorklist();

    expect(result.data.map((row: any) => row.id)).toEqual(['today', 'inpatient', 'overdue']);
    expect(result.buckets).toEqual({ today: 1, inpatients: 1, overdue: 1, closed: 0 });
    expect(result.data.map((row: any) => row.queueRank)).toEqual([0, 1, 2]);
  });

  it('carries the attendance number and visit date on every row', async () => {
    const openedOn = daysAgo(3);
    const { repository } = queueRepository([
      attendanceRow({ attendanceNumber: 'ATT-0000042', dateTime: openedOn, status: 'pending' }),
    ]);

    const [row] = (await repository.getVitalsWorklist()).data;

    expect(row.attendanceNumber).toBe('ATT-0000042');
    expect(row.attendanceDateTime).toEqual(openedOn);
    expect(row.attendanceStatus).toBe('pending');
  });

  it('reads a date filter as the visit date', async () => {
    const dateFrom = new Date(Date.UTC(2026, 9, 1));
    const dateTo = new Date(Date.UTC(2026, 9, 31, 23, 59, 59, 999));
    const { repository, findMany } = queueRepository();

    await repository.getVitalsWorklist({ view: 'pending', dateFrom, dateTo });

    expect(firstWhere(findMany).dateTime).toEqual({ gte: dateFrom, lte: dateTo });
  });

  it('reads the completed view as visits closed today once the queue moved on', async () => {
    const { repository, findMany } = queueRepository();

    const result = await repository.getVitalsWorklist({ view: 'completed' });
    const where = firstWhere(findMany);

    expect(result.view).toBe('completed');
    expect(where.status.in).toEqual(CLOSED_ATTENDANCE_STATUSES);
    expect(where.dateTime).toBeUndefined();
    expect(where.updatedAt.gte.getUTCHours()).toBe(0);
    expect(where.updatedAt.gte.getUTCMinutes()).toBe(0);
    expect(where.updatedAt.gte.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('lets an explicit range date the completed view by the visit instead', async () => {
    const dateFrom = new Date(Date.UTC(2026, 9, 5));
    const { repository, findMany } = queueRepository();

    await repository.getVitalsWorklist({ view: 'completed', dateFrom });
    const where = firstWhere(findMany);

    expect(where.dateTime).toEqual({ gte: dateFrom });
    expect(where.updatedAt).toBeUndefined();
  });

  it('reads the queue newest-first and re-ranks it itself', async () => {
    const { repository, findMany } = queueRepository([attendanceRow()]);

    await repository.getVitalsWorklist();
    const args = findMany.mock.calls[0][0];

    expect(args.orderBy).toEqual({ dateTime: 'desc' });
    expect(args.take).toBeGreaterThan(0);
  });
});

describe('medical and maternal worklist views', () => {
  it('defaults the doctor queue to open visits and names each one', async () => {
    const { repository, findMany } = queueRepository([
      attendanceRow({ attendanceNumber: 'ATT-0000007', dateTime: daysAgo(2), status: 'pending' }),
    ]);

    const result = await repository.getMedicalWorklist();

    expect(result.view).toBe('pending');
    expect(firstWhere(findMany).status).toEqual({ in: ['pending', 'admitted'] });
    expect(result.data[0].attendanceNumber).toBe('ATT-0000007');
    expect(result.data[0].attendanceStatus).toBe('pending');
  });

  it('keeps the maternity queue on maternity visit types', async () => {
    const { repository, findMany } = queueRepository([
      attendanceRow({
        attendanceNumber: 'ANC-0000003', attendanceType: 'antenatal',
        status: 'admitted', dateTime: daysAgo(40),
        antenatalBookings: [{ riskLevel: 'high', gestationalAgeWeeks: 32, edd: daysAgo(-60) }],
      }),
    ]);

    const result = await repository.getMaternalWorklist({ view: 'pending' });
    const where = firstWhere(findMany);

    expect(where.attendanceType).toEqual({ in: ['antenatal', 'delivery', 'postnatal'] });
    expect(where.status).toEqual({ in: ['pending', 'admitted'] });
    expect(result.data[0].attendanceNumber).toBe('ANC-0000003');
    expect(result.data[0].riskLevel).toBe('high');
    expect(result.buckets).toEqual({ today: 0, inpatients: 1, overdue: 0, closed: 0 });
  });
});

describe('outstanding results worklist', () => {
  const withOutstanding = (rows: any[]) => {
    const prisma: any = { attendance: { findMany: vi.fn(async () => rows.map((row) => ({ ...row }))) } };
    return { repository: new EncounterRepository(prisma), findMany: prisma.attendance.findMany };
  };

  it('surfaces a closed visit whose lab, scan or procedure was never answered', async () => {
    const { repository } = withOutstanding([
      attendanceRow({
        id: 'closed-lab', status: 'completed', attendanceNumber: 'ATT-0000100', updatedAt: daysAgo(2),
        LabTest: [{ id: 'lab-1', status: 'requested', requestedAt: daysAgo(4), LabTestTemplate: { name: 'Full blood count' } }],
      }),
      attendanceRow({
        id: 'closed-scan', status: 'discharged', attendanceNumber: 'ATT-0000101', updatedAt: daysAgo(1),
        Scan: [{ id: 'scan-1', status: 'in_progress', requestedAt: daysAgo(3), ScanTemplate: { name: 'Chest X-ray' } }],
      }),
      attendanceRow({
        id: 'closed-procedure', status: 'discharged', attendanceNumber: 'ATT-0000102', updatedAt: daysAgo(6),
        Procedure: [{ id: 'proc-1', status: 'scheduled', scheduledDate: daysAgo(7), ProcedureTemplate: { name: 'Wound dressing' } }],
      }),
      attendanceRow({ id: 'closed-clean', status: 'completed', attendanceNumber: 'ATT-0000103', updatedAt: daysAgo(1) }),
    ]);

    const result = await repository.getOutstandingResultsWorklist();

    expect(result.view).toBe('outstanding');
    expect(result.data.map((row: any) => row.id)).toEqual(['closed-procedure', 'closed-lab', 'closed-scan']);
    expect(result.data.every((row: any) => row.attendanceNumber)).toBe(true);
    expect(result.data.find((row: any) => row.id === 'closed-clean')).toBeUndefined();

    const labRow = result.data.find((row: any) => row.id === 'closed-lab');
    expect(labRow.outstanding).toEqual([
      { kind: 'lab', id: 'lab-1', name: 'Full blood count', requestedAt: expect.any(Date), status: 'requested' },
    ]);
    expect(labRow.outstandingCount).toBe(1);
    expect(labRow.labCount).toBe(1);
    expect(labRow.status).toBe('outstanding_results');
    expect(labRow.priority).toBe('urgent');
  });

  it('bundles several unanswered items on one visit into one row', async () => {
    const { repository } = withOutstanding([
      attendanceRow({
        id: 'closed-both', status: 'discharged', attendanceNumber: 'ATT-0000110', updatedAt: daysAgo(3),
        LabTest: [{ id: 'lab-1', status: 'requested', requestedAt: daysAgo(4), LabTestTemplate: { name: 'Malaria RDT' } }],
        Scan: [{ id: 'scan-1', status: 'requested', requestedAt: daysAgo(4), ScanTemplate: { name: 'Abdominal ultrasound' } }],
      }),
    ]);

    const [row] = (await repository.getOutstandingResultsWorklist()).data;

    expect(row.outstandingCount).toBe(2);
    expect(row.outstanding.map((item: any) => item.kind)).toEqual(['lab', 'scan']);
  });

  it('asks for closed visits carrying an open investigation', async () => {
    const { repository, findMany } = withOutstanding([]);

    await repository.getOutstandingResultsWorklist();
    const where = firstWhere(findMany);

    expect(where.status.in).toEqual(CLOSED_ATTENDANCE_STATUSES);
    expect(where.OR).toEqual([
      { LabTest: { some: { status: { in: ['requested', 'in_progress'] } } } },
      { Scan: { some: { status: { in: ['requested', 'in_progress'] } } } },
      { Procedure: { some: { status: { in: ['scheduled', 'in_progress'] } } } },
    ]);
    expect(where.updatedAt.gte.getTime()).toBeLessThan(Date.now() - 29 * DAY);

    const include = findMany.mock.calls[0][0].include;
    expect(include.LabTest.where.status.in).toEqual(['requested', 'in_progress']);
    expect(include.Procedure.where.status.in).toEqual(['scheduled', 'in_progress']);
  });

  it('names a counter customer whose visit was closed with a test still open', async () => {
    const { repository } = withOutstanding([
      attendanceRow({
        id: 'counter', status: 'completed', attendanceNumber: 'ATT-0000120', updatedAt: daysAgo(1),
        Patient: null, patientId: null, CounterClient: { name: 'Akwaba Walk-in', ageYears: 34 },
        LabTest: [{ id: 'lab-9', status: 'requested', requestedAt: daysAgo(2), LabTestTemplate: { name: 'Blood glucose' } }],
      }),
    ]);

    const [row] = (await repository.getOutstandingResultsWorklist()).data;

    expect(row.patient.name).toBe('Akwaba Walk-in');
    expect(row.patient.isCounter).toBe(true);
    expect(row.patient.folderNumber).toBeNull();
    expect(row.attendanceNumber).toBe('ATT-0000120');
  });
});

describe('lab queue attendance identity', () => {
  it('shows which visit a requested test belongs to', async () => {
    const labTest = {
      findMany: vi.fn(async () => [{
        id: 'lab-1', attendanceId: 'attendance-1', status: 'requested', requestedAt: daysAgo(1),
        updatedAt: new Date(), completedAt: null,
        Attendance: {
          patientId: 'patient-1', attendanceNumber: 'ATT-0000099', dateTime: daysAgo(1), status: 'pending',
          Patient: { surname: 'Boateng', otherNames: 'Kofi', dateOfBirth: new Date('1985-04-02'), gender: 'male', folderNumber: 'F-00009' },
          CounterClient: null, Bed: null,
        },
        LabTestTemplate: { name: 'Urinalysis' },
      }]),
    };
    const repository = new EncounterRepository({ labTest } as any);

    const result = await repository.getLabWorklist();

    expect(result.data[0].attendanceNumber).toBe('ATT-0000099');
    expect(result.data[0].attendanceStatus).toBe('pending');
    expect(result.data[0].patient.folderNumber).toBe('F-00009');
  });
});

describe('worklist query parsing', () => {
  it('treats no parameters as the default pending queue', () => {
    expect(parseWorklistQuery({})).toEqual({ view: undefined, dateFrom: null, dateTo: null });
  });

  it('reads a view case-insensitively', () => {
    expect(parseWorklistQuery({ view: ' OUTSTANDING ' }).view).toBe('outstanding');
  });

  it('expands a single day into that whole day', () => {
    const query = parseWorklistQuery({ date: '2026-10-30' });

    expect(query.dateFrom).toEqual(new Date(Date.UTC(2026, 9, 30, 0, 0, 0, 0)));
    expect(query.dateTo).toEqual(new Date(Date.UTC(2026, 9, 30, 23, 59, 59, 999)));
  });

  it('keeps an open-ended range open on the side nobody filled in', () => {
    const query = parseWorklistQuery({ dateFrom: '2026-10-01' });

    expect(query.dateFrom).toEqual(new Date(Date.UTC(2026, 9, 1)));
    expect(query.dateTo).toBeNull();
  });

  const codeOf = (run: () => unknown) => {
    try {
      run();
      throw new Error('expected the query to be rejected');
    } catch (error: any) {
      return error?.details?.[0]?.code;
    }
  };

  it('names why a query was rejected', () => {
    expect(codeOf(() => parseWorklistQuery({ view: 'bogus' }))).toBe('invalid_view');
    expect(codeOf(() => parseWorklistQuery({ date: 'last tuesday' }))).toBe('invalid_date');
    expect(codeOf(() => parseWorklistQuery({ dateFrom: '2026-10-30T25:00:00Z' }))).toBe('invalid_date');
    expect(codeOf(() => parseWorklistQuery({ date: '2026-10-30', dateFrom: '2026-10-01' }))).toBe('conflicting_dates');
    expect(codeOf(() => parseWorklistQuery({ dateFrom: '2026-10-30', dateTo: '2026-10-01' }))).toBe('inverted_range');
  });

  it('rejects a view the queue cannot answer rather than silently defaulting', () => {
    expect(() => parseWorklistQuery({ view: 'admitted' })).toThrow(/pending, completed or outstanding/i);
  });
});

describe('worklist cache keys', () => {
  const service = new EncounterService({} as any);
  const cacheKey = (name: string, query?: any) => (service as any).worklistCacheKey(name, query);

  it('separates the queues that share a department', () => {
    expect(cacheKey('vitals')).toBe('worklist:vitals:pending::');
  });

  it('never serves one view another view cached', () => {
    expect(cacheKey('vitals', { view: 'pending' })).not.toBe(cacheKey('vitals', { view: 'completed' }));
    expect(cacheKey('vitals', { view: 'outstanding' })).not.toBe(cacheKey('vitals'));
  });

  it('never serves one date range another range cached', () => {
    const base = cacheKey('medical', { view: 'completed' });
    const lastWeek = new Date(Date.now() - 7 * DAY);
    const lastFortnight = new Date(Date.now() - 14 * DAY);

    expect(cacheKey('medical', { view: 'completed', dateFrom: lastWeek })).not.toBe(base);
    expect(cacheKey('medical', { view: 'completed', dateTo: lastWeek })).not.toBe(base);
    expect(cacheKey('medical', { view: 'completed', dateFrom: lastWeek })).not.toBe(
      cacheKey('medical', { view: 'completed', dateFrom: lastFortnight }),
    );
    expect(cacheKey('medical', { view: 'completed', dateFrom: lastWeek })).toBe(
      cacheKey('medical', { view: 'completed', dateFrom: new Date(lastWeek.getTime()) }),
    );
    expect(cacheKey('maternal', { view: 'completed', dateFrom: lastWeek })).not.toBe(
      cacheKey('vitals', { view: 'completed', dateFrom: lastWeek }),
    );
  });
});
