import { describe, expect, it } from 'vitest';
import { NHISClaimXMLBuilder } from '../src/modules/insuranceClaim/xml/NHISClaimXMLBuilder';

const builder = new NHISClaimXMLBuilder();
const hospital = { nhisFacilityCode: 'FAC-TEST' };

describe('NHIS claim XML itemization safeguards', () => {
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

// The shape below is copied from the August 2026 batch this facility submitted, not from the
// specification prose: an admission sends its two endpoints, an outpatient visit reports OPDC,
// every procedure entry names the diagnosis it was done for, and only a claim the desk marked
// unbundled sends <isUnbundled>1</isUnbundled>.
describe('NHIS claim XML follows the batch the facility actually submitted', () => {
  const admissionClaim = {
    claimNumber: 'NHIS-2001',
    claimCheckCode: '12345',
    typeOfService: 'IPD',
    mdcCode: 'MEDI',
    principalGDRG: 'MEDI31A',
    createdAt: new Date('2026-08-05T10:00:00Z'),
    Patient: { nhisNumber: '11111111', surname: 'ABRAHAM', otherNames: 'K', dateOfBirth: new Date('1980-02-02'), gender: 'male', folderNumber: '1/2' },
    Attendance: {
      nhisCCC: '12345',
      dateTime: new Date('2026-08-01T10:00:00Z'),
      Admission: { admissionDate: new Date('2026-08-01T10:00:00Z'), dischargeDate: new Date('2026-08-05T10:00:00Z') },
    },
    items: [
      { itemCategory: 'gdrg', code: 'MEDI31A', description: 'Pneumonia', quantity: 1, lineTotal: 100, serviceDate: new Date('2026-08-01T10:00:00Z'), gdrgTariff: { gdrgCode: 'MEDI31A' } },
      { itemCategory: 'diagnosis', code: 'J18.9', description: 'PNEUMONIA', quantity: 1, lineTotal: 0, gdrgTariff: { gdrgCode: 'MEDI31A' } },
      { itemCategory: 'procedure', code: 'ZOOM05A', description: 'Dressing', quantity: 1, lineTotal: 0, serviceDate: new Date('2026-08-02T10:00:00Z'), gdrgTariff: { gdrgCode: 'ZOOM05A' } },
    ],
  };

  it('sends the stay endpoints instead of one date per day in hospital', () => {
    const xml = builder.buildSingleClaimXml(admissionClaim, hospital);
    expect((xml.match(/<date>/g) ?? [])).toHaveLength(2);
    expect(xml).toContain('<date>2026-08-01</date>');
    expect(xml).toContain('<date>2026-08-05</date>');
    expect(xml).not.toContain('<date>2026-08-03</date>');
  });

  it('pairs each procedure entry with the diagnosis it was done for', () => {
    const xml = builder.buildSingleClaimXml(admissionClaim, hospital);
    expect(xml).toMatch(/<procedures>[\s\S]*?<diagnosis>PNEUMONIA<\/diagnosis>[\s\S]*?<\/procedures>/);
  });

  it('keeps an admission under its clinical family and an outpatient visit under OPDC', () => {
    expect(builder.buildSingleClaimXml(admissionClaim, hospital)).toContain('<mdcCode>MEDI</mdcCode>');
    const outpatient = builder.buildSingleClaimXml({
      ...admissionClaim,
      typeOfService: 'OPD',
      mdcCode: null as any,
      principalGDRG: 'ZOOM02A',
      Attendance: { ...admissionClaim.Attendance, Admission: null },
    }, hospital);
    expect(outpatient).toContain('<mdcCode>OPDC</mdcCode>');
  });

  it('only sends unbundled when the desk marked the draft that way', () => {
    expect(builder.buildSingleClaimXml(admissionClaim, hospital)).toContain('<isUnbundled>0</isUnbundled>');
    const unbundled = builder.buildSingleClaimXml({ ...admissionClaim, metadata: { isUnbundled: true } }, hospital);
    expect(unbundled).toContain('<isUnbundled>1</isUnbundled>');
  });
});
