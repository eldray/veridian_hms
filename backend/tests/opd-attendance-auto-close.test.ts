import { describe, expect, it, vi } from 'vitest';
import { runOpdAttendanceAutoCloseJob } from '../src/cron/opdAttendanceClosureCron';

describe('OPD attendance auto-closure', () => {
  it('closes only signed OPD visits from before the current Ghana day', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });
    const prisma: any = { attendance: { updateMany } };
    const now = new Date('2026-11-22T02:00:00.000Z');

    const result = await runOpdAttendanceAutoCloseJob(prisma, now);

    expect(result.closed).toBe(3);
    expect(result.cutoff.toISOString()).toBe('2026-11-22T00:00:00.000Z');
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        encounterCategory: 'opd',
        status: 'pending',
        finalizedAt: { not: null },
        dateTime: { lt: new Date('2026-11-22T00:00:00.000Z') },
        Admission: { is: null },
        LabTest: { none: { status: { in: ['requested', 'in_progress'] } } },
        Scan: { none: { status: { in: ['requested', 'in_progress'] } } },
        Medication: { none: { status: 'prescribed' } },
        Procedure: { none: { status: { in: ['scheduled', 'in_progress'] } } },
      },
      data: {
        status: 'completed',
        autoClosedAt: now,
        bedId: null,
      },
    });
  });
});
