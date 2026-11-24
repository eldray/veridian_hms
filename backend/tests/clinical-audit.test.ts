import { describe, expect, it, vi } from 'vitest';
import { appendClinicalRecordAudit } from '../src/modules/encounter/clinicalAudit';

describe('transactional clinical audit', () => {
  it('records theatre procedure status changes without the operative record narrative', async () => {
    const rows: any[] = [];
    const tx: any = {
      $queryRawUnsafe: vi.fn().mockResolvedValue(1),
      auditLog: {
        findMany: vi.fn(async () => rows.slice(-50).reverse()),
        create: vi.fn(async ({ data }: any) => {
          const row = { id: `audit-${rows.length + 1}`, ...data };
          rows.push(row);
          return row;
        }),
      },
    };
    await appendClinicalRecordAudit(
      tx, 'surgeon-1', 'Procedure', 'procedure-1', 'update',
      { id: 'procedure-1', status: 'in_progress', scheduledDate: null, duration: 30 },
      { id: 'procedure-1', status: 'completed', performedById: 'surgeon-1', performedAt: new Date('2026-11-24T14:00:00Z') },
      { workflow: 'procedure_record_updated', clinicalContentOmitted: true },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].entityType).toBe('Procedure');
    expect(rows[0].previousState).toMatchObject({ status: 'in_progress' });
    expect(rows[0].newState).toMatchObject({ status: 'completed', performedById: 'surgeon-1' });
    expect(rows[0].newState).not.toHaveProperty('clinicalRecord');
    expect(rows[0].newState).not.toHaveProperty('outcome');
  });

  it('records structured laboratory status transitions without result or note content', async () => {
    const rows: any[] = [];
    const tx: any = {
      $queryRawUnsafe: vi.fn().mockResolvedValue(1),
      auditLog: {
        findMany: vi.fn(async () => rows.slice(-50).reverse()),
        create: vi.fn(async ({ data }: any) => {
          const row = { id: `audit-${rows.length + 1}`, ...data };
          rows.push(row);
          return row;
        }),
      },
    };

    await appendClinicalRecordAudit(
      tx, 'lab-tech-1', 'LabTest', 'lab-order-1', 'update',
      { id: 'lab-order-1', status: 'in_progress', priority: 'urgent', performedById: null },
      { id: 'lab-order-1', status: 'completed', priority: 'urgent', performedById: 'lab-tech-1', completedAt: new Date('2026-11-24T13:00:00Z') },
      { workflow: 'lab_order_status_or_result_update', fieldsChanged: ['status', 'result', 'notes'] },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].entityType).toBe('LabTest');
    expect(rows[0].previousState).toMatchObject({ id: 'lab-order-1', status: 'in_progress' });
    expect(rows[0].newState).toMatchObject({ id: 'lab-order-1', status: 'completed', performedById: 'lab-tech-1' });
    expect(rows[0].newState).not.toHaveProperty('result');
    expect(rows[0].newState).not.toHaveProperty('notes');
    expect(rows[0].newState).not.toHaveProperty('attendanceId');
  });
});
