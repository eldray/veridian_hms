import { describe, expect, it } from 'vitest';
import { NHISClaimXMLBuilder } from '../src/modules/insuranceClaim/xml/NHISClaimXMLBuilder';

describe('NHIS claim XML itemization safeguards', () => {
  const builder = new NHISClaimXMLBuilder();
  const hospital = { nhisFacilityCode: 'FAC-TEST' };

  it('rejects a batch when a claim has no items instead of silently exporting an incomplete batch', () => {
    expect(() => builder.buildBatchXml({
      batchNumber: 'BATCH-TEST',
      periodYear: 2026,
      periodMonth: 10,
      claims: [
        { claimNumber: 'NHIS-VALID', items: [{ itemCategory: 'gdrg', code: 'OPD01', description: 'OPD', quantity: 1, lineTotal: 100 }] },
        { claimNumber: 'NHIS-EMPTY', items: [] },
      ],
    }, hospital)).toThrow(/NHIS-EMPTY.*no itemized lines/i);
  });

  it('rejects a batch when claim items were not loaded', () => {
    expect(() => builder.buildBatchXml({
      batchNumber: 'BATCH-TEST',
      periodYear: 2026,
      periodMonth: 10,
      claims: [{ claimNumber: 'NHIS-MISSING' }],
    }, hospital)).toThrow(/NHIS-MISSING.*no itemized lines/i);
  });

  it('rejects single-claim XML when an old claim has no itemized lines', () => {
    expect(() => builder.buildSingleClaimXml({
      claimNumber: 'NHIS-LEGACY',
      items: [],
    }, hospital)).toThrow(/NHIS-LEGACY.*no itemized lines/i);
  });

  it('exports all claims when every claim has itemized lines', () => {
    const xml = builder.buildBatchXml({
      batchNumber: 'BATCH-TEST',
      periodYear: 2026,
      periodMonth: 10,
      claims: [
        { claimNumber: 'NHIS-1001', items: [{ itemCategory: 'gdrg', code: 'OPD01', description: 'OPD', quantity: 1, lineTotal: 100 }] },
        { claimNumber: 'NHIS-1002', items: [{ itemCategory: 'medicine', code: 'MED01', description: 'Medicine', quantity: 1, lineTotal: 10 }] },
      ],
    }, hospital);
    expect(xml).toContain('<claimid>NHIS-1001</claimid>');
    expect(xml).toContain('<claimid>NHIS-1002</claimid>');
    expect(xml).toContain('Claims 2');
  });
});
