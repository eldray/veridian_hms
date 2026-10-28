import { describe, expect, it } from 'vitest';
import { vetClaim } from '../src/modules/insuranceClaim/ClaimVettingService';

describe('claim vetting rules', () => {
  it('flags malaria without a malaria test and CCC 00000', () => {
    const result = vetClaim({
      claimId: 'C1', ccc: '00000', diagnoses: [{ name: 'Malaria', icd10: 'B54' }],
      investigations: [], medicines: []
    });
    expect(result.issues.map(x => x.ruleId)).toContain('malaria-test-not-found');
    expect(result.issues.map(x => x.ruleId)).toContain('ccc-all-zero');
  });
  it('does not flag malaria test when MPS is listed', () => {
    const result = vetClaim({ diagnoses: [{ name: 'Malaria' }], investigations: [{ name: 'MPS' }] });
    expect(result.issues.map(x => x.ruleId)).not.toContain('malaria-test-not-found');
  });
  it('flags antibiotic without bacterial diagnosis', () => {
    const result = vetClaim({
      diagnoses: [{ name: 'Bronchitis', icd10: 'J40' }],
      medicines: [{ name: 'Amoxicillin', quantity: 10 }]
    });
    expect(result.issues.map(x => x.ruleId)).toContain('antibiotic-no-supporting-diagnosis');
  });
  it('flags claim/service date mismatch and missing diagnosis code with lookup link', () => {
    const result = vetClaim({
      claimDate: '2026-01-02', serviceDate: '2026-01-01',
      diagnoses: [{ name: 'Fever' }]
    });
    expect(result.issues.map(x => x.ruleId)).toContain('claim-service-date-mismatch');
    expect(result.issues.find(x => x.ruleId === 'missing-icd10')?.suggestedIcd10SearchUrl).toContain('icd.who.int');
  });
  it('sorts medicines and investigations by date without mutating input', () => {
    const medicines = [{ name: 'Later', date: '2026-02-02' }, { name: 'Earlier', date: '2026-01-02' }];
    const result = vetClaim({ medicines, investigations: [{ name: 'B', date: '2026-02-01' }, { name: 'A', date: '2026-01-01' }] });
    expect(result.sortedMedicines.map(x => x.name)).toEqual(['Earlier', 'Later']);
    expect(result.sortedInvestigations.map(x => x.name)).toEqual(['A', 'B']);
    expect(medicines[0].name).toBe('Later');
  });
});
