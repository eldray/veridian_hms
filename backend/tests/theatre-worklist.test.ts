import { describe, expect, it, vi } from 'vitest';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';

describe('theatre worklist procedure selection', () => {
  it('returns actionable procedure IDs with in-progress procedures first', async () => {
    const procedure = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'scheduled-1', attendanceId: 'attendance-1', status: 'scheduled',
          scheduledDate: new Date('2026-10-24T10:00:00Z'),
          ProcedureTemplate: { name: 'Dressing' },
          Attendance: {
            patientId: 'patient-1',
            Patient: { surname: 'Mensah', otherNames: 'Ama', dateOfBirth: new Date('1990-01-01'), gender: 'female', folderNumber: 'F-1' },
            Bed: null,
          },
        },
        {
          id: 'progress-1', attendanceId: 'attendance-1', status: 'in_progress',
          scheduledDate: new Date('2026-10-24T09:00:00Z'),
          ProcedureTemplate: { name: 'Wound suturing' },
          Attendance: {
            patientId: 'patient-1',
            Patient: { surname: 'Mensah', otherNames: 'Ama', dateOfBirth: new Date('1990-01-01'), gender: 'female', folderNumber: 'F-1' },
            Bed: null,
          },
        },
      ]),
    };
    const repository = new EncounterRepository({ procedure } as any);

    const result = await repository.getProceduresWorklist();

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('attendance-1');
    expect(result.data[0].procedureIds).toEqual(['progress-1', 'scheduled-1']);
  });
});
