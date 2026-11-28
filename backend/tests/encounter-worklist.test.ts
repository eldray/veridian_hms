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
  it('keeps pending visits without a recorded vitals task', async () => {
    const { repository, findMany } = queueRepository([
      attendanceRow({ status: 'completed', Vitals: [] }),
    ]);
    const result = await repository.getVitalsWorklist();
    const where = firstWhere(findMany);

    expect(result.view).toBe('pending');
    expect(where.status).toEqual({ not: 'cancelled' });
    expect(where.vitalsStartedAt).toBeNull();
    expect(result.buckets.today).toBe(1);
    expect(where.NOT).toEqual({ Vitals: { some: {} } });
  });

  it('shows completed vitals by the actual recorded task, regardless of attendance closure', async () => {
    const recordedAt = new Date();
    const { repository, findMany } = queueRepository([
      attendanceRow({ status: 'pending', Vitals: [{ recordedAt, bloodPressure: '120/80' }] }),
    ]);
    const result = await repository.getVitalsWorklist({ view: 'completed' });
    const where = firstWhere(findMany);

    expect(where.Vitals.some.recordedAt.gte).toBeInstanceOf(Date);
    expect(where.status).toEqual({ not: 'cancelled' });
    expect(result.data[0].status).toBe('completed');
    expect(result.data[0].lastVitals.recordedAt).toEqual(recordedAt);
    expect(result.buckets.closed).toBe(1);
  });

  it('shows in-progress vitals only when an explicit start event exists', async () => {
    const startedAt = new Date();
    const { repository, findMany } = queueRepository([
      attendanceRow({ status: 'completed', vitalsStartedAt: startedAt, Vitals: [] }),
    ]);
    const result = await repository.getVitalsWorklist({ view: 'in_progress' });
    const where = firstWhere(findMany);

    expect(where.vitalsStartedAt).toEqual({ not: null });
    expect(where.NOT).toEqual({ Vitals: { some: {} } });
    expect(result.inProgress).toBe(1);
    expect(result.data[0].status).toBe('in_progress');
    expect(result.data[0].vitalsStartedAt).toEqual(startedAt);
  });

  it('records an audited vitals start event without completing the task', async () => {
    const started = { id: 'attendance-1', status: 'completed', vitalsStartedAt: new Date() };
    const attendance = {
      findUnique: vi.fn()
        .mockResolvedValueOnce({ id: 'attendance-1', status: 'completed', vitalsStartedAt: null })
        .mockResolvedValueOnce(started),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const tx = {
      attendance,
      vitals: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    const result = await repository.startVitalsTask('attendance-1', 'nurse-1');

    expect(attendance.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attendance-1', status: { not: 'cancelled' }, vitalsStartedAt: null },
      data: expect.objectContaining({ vitalsStartedById: 'nurse-1' }),
    }));
    expect(result.vitalsStartedAt).toBeInstanceOf(Date);
  });

  it('applies explicit date ranges to the vitals task completion timestamp', async () => {
    const dateFrom = new Date(Date.UTC(2026, 9, 1));
    const dateTo = new Date(Date.UTC(2026, 9, 31, 23, 59, 59, 999));
    const { repository, findMany } = queueRepository();

    await repository.getVitalsWorklist({ view: 'completed', dateFrom, dateTo });

    expect(firstWhere(findMany).Vitals.some.recordedAt).toEqual({ gte: dateFrom, lte: dateTo });
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

  it('uses saved clinical draft content as consultation in-progress, not open attendance alone', async () => {
    const draftUpdatedAt = new Date();
    const { repository, findMany } = queueRepository([
      attendanceRow({ medicalNotes: 'History documented', finalizedAt: null, updatedAt: draftUpdatedAt }),
    ]);

    const result = await repository.getMedicalWorklist({ view: 'in_progress' });
    const where = firstWhere(findMany);

    expect(where.finalizedAt).toBeNull();
    expect(where.AND).toEqual([expect.objectContaining({ OR: expect.arrayContaining([
      { medicalNotes: { not: null } },
      { assessment: { not: null } },
    ]) })]);
    expect(where.status).toBeUndefined();
    expect(where.updatedAt).toBeUndefined();
    expect(result.data[0].status).toBe('in_progress');
    expect(result.inProgress).toBe(1);
  });

  it('uses clinical finalisation, not attendance closure, for completed consultations', async () => {
    const finalizedAt = new Date();
    const { repository, findMany } = queueRepository([
      attendanceRow({ status: 'pending', finalizedAt, medicalNotes: 'Consultation complete' }),
    ]);

    const result = await repository.getMedicalWorklist({ view: 'completed' });
    const where = firstWhere(findMany);

    expect(where.finalizedAt).toEqual({ gte: expect.any(Date) });
    expect(where.status).toBeUndefined();
    expect(result.data[0].status).toBe('completed');
    expect(result.data[0].finalizedAt).toEqual(finalizedAt);
    expect(result.buckets.closed).toBe(1);
  });

  it('keeps unfinished clinical drafts visible even when the attendance has closed', async () => {
    const { repository, findMany } = queueRepository([
      attendanceRow({ status: 'completed', medicalNotes: 'Assessment started', finalizedAt: null }),
    ]);

    const result = await repository.getMedicalWorklist({ view: 'in_progress' });

    expect(firstWhere(findMany).status).toBeUndefined();
    expect(result.data[0].status).toBe('in_progress');
  });

  it('uses the saved ANC visit record as completion even if attendance remains open', async () => {
    const visitDate = new Date();
    const { repository, findMany } = queueRepository([
      attendanceRow({
        status: 'pending', attendanceType: 'antenatal',
        antenatalVisits: [{ id: 'anc-visit-1', visitDate }],
      }),
    ]);

    const result = await repository.getMaternalWorklist({ view: 'completed' });
    const where = firstWhere(findMany);

    expect(where.status).toEqual({ not: 'cancelled' });
    expect(where.OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ attendanceType: 'antenatal', antenatalVisits: { some: { visitDate: { gte: expect.any(Date) } } } }),
    ]));
    expect(result.data[0].status).toBe('completed');
    expect(result.data[0].completedAt).toEqual(visitDate);
    expect(result.buckets.closed).toBe(1);
  });

  it('does not mark a closed maternal attendance complete without its own clinical record', async () => {
    const { repository, findMany } = queueRepository([
      attendanceRow({ status: 'completed', attendanceType: 'postnatal' }),
    ]);

    const result = await repository.getMaternalWorklist({ view: 'completed' });

    expect(firstWhere(findMany).status).toEqual({ not: 'cancelled' });
    expect(firstWhere(findMany).OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ attendanceType: 'postnatal', postnatalRecords: { some: { examinationDate: { gte: expect.any(Date) } } } }),
    ]));
    // Prisma's relation predicate excludes this closed visit because it has no PostnatalRecord.
    expect(result.data[0].status).toBe('pending');
  });

  it('does not invent maternal in-progress work when the form has no saved draft state', async () => {
    const { repository, findMany } = queueRepository();
    const result = await repository.getMaternalWorklist({ view: 'in_progress' });

    expect(firstWhere(findMany).OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ attendanceType: 'antenatal', maternalStartedAt: { not: null }, antenatalVisits: { none: {} } }),
    ]));
    expect(result.inProgress).toBe(0);
  });

  it('shows a started maternal task as in progress even after attendance closure', async () => {
    const startedAt = new Date();
    const { repository, findMany } = queueRepository([
      attendanceRow({ status: 'completed', attendanceType: 'antenatal', maternalStartedAt: startedAt, antenatalVisits: [] }),
    ]);

    const result = await repository.getMaternalWorklist({ view: 'in_progress' });

    expect(firstWhere(findMany).status).toEqual({ not: 'cancelled' });
    expect(result.data[0].status).toBe('in_progress');
    expect(result.data[0].maternalStartedAt).toEqual(startedAt);
    expect(result.inProgress).toBe(1);
  });

  it('records a maternal task start event without completing the clinical record', async () => {
    const started = { id: 'attendance-1', status: 'completed', attendanceType: 'antenatal', maternalStartedAt: new Date() };
    const attendance = {
      findUnique: vi.fn()
        .mockResolvedValueOnce({ id: 'attendance-1', status: 'completed', attendanceType: 'antenatal', maternalStartedAt: null })
        .mockResolvedValueOnce(started),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const tx = {
      attendance,
      aNCVisit: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'midwife-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    const result = await repository.startMaternalTask('attendance-1', 'midwife-1');

    expect(attendance.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attendance-1', status: { not: 'cancelled' }, maternalStartedAt: null },
      data: expect.objectContaining({ maternalStartedById: 'midwife-1' }),
    }));
    expect(result.maternalStartedAt).toBeInstanceOf(Date);
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
    expect(where.status).toEqual({ not: 'cancelled' });
    expect(where.OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ attendanceType: 'antenatal', maternalStartedAt: null, antenatalVisits: { none: {} } }),
    ]));
    expect(result.data[0].attendanceNumber).toBe('ANC-0000003');
    expect(result.data[0].riskLevel).toBe('high');
    expect(result.buckets).toEqual({ today: 1, inpatients: 0, overdue: 0, closed: 0 });
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

  it('reads each shared task status case-insensitively', () => {
    expect(parseWorklistQuery({ view: ' OUTSTANDING ' }).view).toBe('outstanding');
    expect(parseWorklistQuery({ view: ' IN_PROGRESS ' }).view).toBe('in_progress');
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
    expect(() => parseWorklistQuery({ view: 'admitted' })).toThrow(/pending, in_progress, completed or outstanding/i);
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


describe('clinical request worklist timestamps', () => {
  const requestAttendance = (id: string) => ({
    patientId: `patient-${id}`, attendanceNumber: `ATT-${id}`, dateTime: daysAgo(12), status: 'pending',
    Patient: { surname: 'Mensah', otherNames: id, dateOfBirth: new Date('1990-01-01'), gender: 'female', folderNumber: `F-${id}` },
    CounterClient: null, Bed: null,
  });

  it('filters lab requests by requestedAt and places the newest request first, even on an older visit', async () => {
    const older = new Date('2026-11-24T08:15:00Z');
    const newest = new Date('2026-11-24T10:45:00Z');
    const labTest = { findMany: vi.fn(async (_args: any) => [
      { id: 'older-request', attendanceId: 'old-visit', status: 'requested', requestedAt: older, Attendance: requestAttendance('old'), LabTestTemplate: { name: 'FBC' } },
      { id: 'new-request', attendanceId: 'new-visit', status: 'requested', requestedAt: newest, Attendance: requestAttendance('new'), LabTestTemplate: { name: 'Malaria RDT' } },
    ]) };
    const repository = new EncounterRepository({ labTest } as any);
    const result = await repository.getLabWorklist({ dateFrom: new Date('2026-11-24T00:00:00Z'), dateTo: new Date('2026-11-24T23:59:59Z') });
    const args = labTest.findMany.mock.calls[0][0];

    expect(args.where.requestedAt).toEqual({ gte: new Date('2026-11-24T00:00:00Z'), lte: new Date('2026-11-24T23:59:59Z') });
    expect(args.where.Attendance?.is?.dateTime).toBeUndefined();
    expect(args.orderBy).toEqual({ requestedAt: 'desc' });
    expect(result.data.map((row: any) => row.attendanceId)).toEqual(['new-visit', 'old-visit']);
    expect(result.data[0].tests[0].id).toBe('new-request');
  });

  it('filters pharmacy prescriptions by prescribedAt and sorts newest request groups first', async () => {
    const older = new Date('2026-11-24T08:15:00Z');
    const newest = new Date('2026-11-24T10:45:00Z');
    const medication = { findMany: vi.fn(async (_args: any) => [
      { id: 'older-rx', attendanceId: 'old-visit', name: 'Paracetamol', status: 'prescribed', prescribedAt: older, dispensedAt: null, StockItem: null, Attendance: requestAttendance('old') },
      { id: 'new-rx', attendanceId: 'new-visit', name: 'Amoxicillin', status: 'prescribed', prescribedAt: newest, dispensedAt: null, StockItem: null, Attendance: requestAttendance('new') },
    ]) };
    const repository = new EncounterRepository({ medication } as any);
    const result = await repository.getPharmacyWorklist({ dateFrom: new Date('2026-11-24T00:00:00Z'), dateTo: new Date('2026-11-24T23:59:59Z') });
    const args = medication.findMany.mock.calls[0][0];

    expect(args.where.prescribedAt).toEqual({ gte: new Date('2026-11-24T00:00:00Z'), lte: new Date('2026-11-24T23:59:59Z') });
    expect(args.where.dispensingStartedAt).toBeNull();
    expect(args.where.Attendance?.is?.dateTime).toBeUndefined();
    expect(args.orderBy).toEqual({ prescribedAt: 'desc' });
    expect(result.data.map((row: any) => row.attendanceId)).toEqual(['new-visit', 'old-visit']);
    expect(result.data[0].medications[0].id).toBe('new-rx');
  });

  it('separates started pharmacy dispensing tasks from pending prescriptions', async () => {
    const startedAt = new Date('2026-11-24T10:00:00Z');
    const medication = { findMany: vi.fn(async (_args: any) => [
      { id: 'started-rx', attendanceId: 'started-visit', name: 'Amoxicillin', status: 'prescribed', prescribedAt: new Date('2026-11-24T09:00:00Z'), dispensingStartedAt: startedAt, dispensedAt: null, StockItem: null, Attendance: requestAttendance('started') },
    ]) };
    const repository = new EncounterRepository({ medication } as any);
    const result = await repository.getPharmacyWorklist({ view: 'in_progress' });
    const args = medication.findMany.mock.calls[0][0];

    expect(args.where.status).toBe('prescribed');
    expect(args.where.dispensingStartedAt).toEqual({ not: null });
    expect(result.view).toBe('in_progress');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe('in_progress');
    expect(result.data[0].inProgressCount).toBe(1);
    expect(result.buckets.closed).toBe(0);
    expect(result.data[0].medications[0].dispensingStartedAt).toEqual(startedAt);
  });

  it('records a pharmacy start event without changing medication status or stock', async () => {
    const started = { id: 'rx-1', attendanceId: 'visit-1', status: 'prescribed', dispensingStartedAt: new Date(), dispensingStartedById: 'pharmacist-1' };
    const medication = {
      findUnique: vi.fn()
        .mockResolvedValueOnce({ id: 'rx-1', attendanceId: 'visit-1', status: 'prescribed', dispensingStartedAt: null })
        .mockResolvedValueOnce(started),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const tx = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'visit-1', status: 'pending' }) },
      medication,
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'pharmacist-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    const result = await repository.startMedicationDispensing('visit-1', 'rx-1', 'pharmacist-1');

    expect(tx.attendance.findUnique).toHaveBeenCalled();
    expect(medication.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'rx-1', attendanceId: 'visit-1', status: 'prescribed', dispensingStartedAt: null },
      data: expect.objectContaining({ dispensingStartedById: 'pharmacist-1' }),
    }));
    expect(result.status).toBe('prescribed');
    expect(result.dispensingStartedAt).toBeInstanceOf(Date);
  });

  it('filters scan requests by requestedAt and sorts newest request groups first', async () => {
    const older = new Date('2026-11-24T08:15:00Z');
    const newest = new Date('2026-11-24T10:45:00Z');
    const scan = { findMany: vi.fn(async (_args: any) => [
      { id: 'older-scan', attendanceId: 'old-visit', status: 'requested', requestedAt: older, priority: 'routine', scanType: 'X-ray', Attendance: requestAttendance('old'), ScanTemplate: { name: 'Chest X-ray' }, User_Scan_performedByIdToUser: null },
      { id: 'new-scan', attendanceId: 'new-visit', status: 'requested', requestedAt: newest, priority: 'routine', scanType: 'Ultrasound', Attendance: requestAttendance('new'), ScanTemplate: { name: 'Ultrasound' }, User_Scan_performedByIdToUser: null },
    ]) };
    const repository = new EncounterRepository({ scan } as any);
    const result = await repository.getRadiologyWorklist({ dateFrom: new Date('2026-11-24T00:00:00Z'), dateTo: new Date('2026-11-24T23:59:59Z') });
    const args = scan.findMany.mock.calls[0][0];

    expect(args.where.requestedAt).toEqual({ gte: new Date('2026-11-24T00:00:00Z'), lte: new Date('2026-11-24T23:59:59Z') });
    expect(args.where.Attendance?.is?.dateTime).toBeUndefined();
    expect(args.orderBy).toEqual({ requestedAt: 'desc' });
    expect(result.data.map((row: any) => row.attendanceId)).toEqual(['new-visit', 'old-visit']);
    expect(result.data[0].scans[0].id).toBe('new-scan');
  });

  it('filters theatre procedures by creation time and sorts newest procedure groups first', async () => {
    const older = new Date('2026-11-24T08:15:00Z');
    const newest = new Date('2026-11-24T10:45:00Z');
    const procedure = { findMany: vi.fn(async (_args: any) => [
      { id: 'older-procedure', attendanceId: 'old-visit', status: 'scheduled', createdAt: older, scheduledDate: null, Attendance: requestAttendance('old'), ProcedureTemplate: { name: 'Dressing' }, User_Procedure_performedByIdToUser: null },
      { id: 'new-procedure', attendanceId: 'new-visit', status: 'scheduled', createdAt: newest, scheduledDate: null, Attendance: requestAttendance('new'), ProcedureTemplate: { name: 'Minor suturing' }, User_Procedure_performedByIdToUser: null },
    ]) };
    const repository = new EncounterRepository({ procedure } as any);
    const result = await repository.getProceduresWorklist({ dateFrom: new Date('2026-11-24T00:00:00Z'), dateTo: new Date('2026-11-24T23:59:59Z') });
    const args = procedure.findMany.mock.calls[0][0];

    expect(args.where.createdAt).toEqual({ gte: new Date('2026-11-24T00:00:00Z'), lte: new Date('2026-11-24T23:59:59Z') });
    expect(args.where.Attendance?.is?.dateTime).toBeUndefined();
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
    expect(result.data.map((row: any) => row.attendanceId)).toEqual(['new-visit', 'old-visit']);
    expect(result.data[0].procedureNames).toBe('Minor suturing');
  });

  it('filters completed lab work by result update time, not visit date', async () => {
    const labTest = { findMany: vi.fn(async (_args: any) => []) };
    const repository = new EncounterRepository({ labTest } as any);
    await repository.getLabWorklist({ view: 'completed', dateFrom: new Date('2026-11-24T00:00:00Z') });
    const where = labTest.findMany.mock.calls[0][0].where;
    expect(where.updatedAt.gte).toEqual(new Date('2026-11-24T00:00:00Z'));
    expect(where.Attendance).toBeUndefined();
  });
});
