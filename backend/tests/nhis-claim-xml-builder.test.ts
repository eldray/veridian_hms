import { describe, expect, it } from 'vitest';
import { NHISClaimXMLBuilder } from '../src/modules/insuranceClaim/xml/NHISClaimXMLBuilder';

const builder = new NHISClaimXMLBuilder();
const hospital = { nhisFacilityCode: 'FAC-TEST' };

const exportableClaim = (overrides: any = {}) => ({
  claimNumber: 'NHIS-TEST-1001',
  claimCheckCode: '12345',
  typeOfService: 'OPD',
  typeOfAttendance: 'EAE',
  serviceOutcome: 'DISC',
  principalGDRG: 'OPDC06A',
  createdAt: new Date('2026-10-01T10:00:00Z'),
  Patient: {
    nhisNumber: '12345678', surname: 'TEST', otherNames: 'PATIENT',
    dateOfBirth: new Date('1990-01-01T00:00:00Z'), gender: 'male', folderNumber: 'F-001',
  },
  Attendance: { nhisCCC: '12345', dateTime: new Date('2026-10-01T10:00:00Z'), Admission: null },
  items: [
    { itemCategory: 'gdrg', code: 'OPDC06A', description: 'OPD consultation', quantity: 1, clinician: 'LIC-001', gdrgTariff: { gdrgCode: 'OPDC06A' } },
    { itemCategory: 'diagnosis', code: 'J06.9', description: 'Acute upper respiratory infection', quantity: 1, gdrgTariff: { gdrgCode: 'OPDC06A' } },
  ],
  ...overrides,
});

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


  it('uses the diagnosis linked to each procedure rather than repeating the first claim diagnosis', () => {
    const xml = builder.buildSingleClaimXml(exportableClaim({
      claimNumber: 'NHIS-LINKED-DIAG',
      principalGDRG: 'MEDI31A',
      typeOfService: 'IPD',
      items: [
        { itemCategory: 'gdrg', code: 'MEDI31A', description: 'Pneumonia', quantity: 1, clinician: 'LIC-001', gdrgTariff: { gdrgCode: 'MEDI31A' } },
        { itemCategory: 'diagnosis', code: 'J18.9', description: 'Pneumonia', gdrgTariff: { gdrgCode: 'MEDI31A' } },
        { itemCategory: 'diagnosis', code: 'K35.8', description: 'Acute appendicitis', gdrgTariff: { gdrgCode: 'ASUR01A' } },
        { itemCategory: 'procedure', code: 'PRO01', description: 'Appendicectomy', serviceDate: new Date('2026-08-05T10:00:00Z'), gdrgTariff: { gdrgCode: 'ASUR01A' }, diagnosis: { icdCode: 'K35.8', name: 'Acute appendicitis' } },
      ],
    }), hospital);
    const proceduresXml = xml.split('<procedures>')[1]?.split('</procedures>')[0] ?? '';
    expect(proceduresXml).toContain('<diagnosis>Acute appendicitis</diagnosis>');
    expect(proceduresXml).not.toContain('<diagnosis>Pneumonia</diagnosis>');
  });

  it('exports all claims when every claim has itemized lines', () => {
    const xml = builder.buildBatchXml({
      batchNumber: 'BATCH-TEST',
      periodYear: 2026,
      periodMonth: 10,
      claims: [
        exportableClaim({ claimNumber: 'NHIS-1001' }),
        exportableClaim({ claimNumber: 'NHIS-1002' }),
      ],
    }, hospital);
    expect(xml).toContain('<claimid>NHIS-1001</claimid>');
    expect(xml).toContain('<claimid>NHIS-1002</claimid>');
    expect(xml).toContain('Claims 2');
  });
  it('blocks export when the NHIS number is invalid', () => {
    const claim = exportableClaim({ Patient: { ...exportableClaim().Patient, nhisNumber: '1234' } });
    expect(() => builder.buildSingleClaimXml(claim, hospital)).toThrow(/NHIS membership number must contain 8 or 10 digits/);
  });

  it('blocks export when the CCC is not exactly five digits', () => {
    expect(() => builder.buildSingleClaimXml(exportableClaim({ claimCheckCode: '1234' }), hospital))
      .toThrow(/Claim Check Code must contain exactly five digits/);
  });

  it('blocks export when a required clinician licence is missing', () => {
    const claim = exportableClaim({ items: exportableClaim().items.map((item: any) => ({ ...item, clinician: '' })) });
    expect(() => builder.buildSingleClaimXml(claim, hospital)).toThrow(/missing physician or prescriber licence/);
  });

  it('blocks an investigation without its own service date instead of using claim creation date', () => {
    const claim = exportableClaim({ items: [
      ...exportableClaim().items,
      { itemCategory: 'investigation', code: 'INVE01', gdrgTariff: { gdrgCode: 'INVE01' } },
    ] });
    expect(() => builder.buildSingleClaimXml(claim, hospital)).toThrow(/investigation line 1 has no valid service date/);
  });

  it('blocks a medicine without a dispensing date instead of using claim creation date', () => {
    const claim = exportableClaim({ items: [
      ...exportableClaim().items,
      { itemCategory: 'medicine', code: 'PARACETA01', quantity: 2, prescriptionText: '500mg bd' },
    ] });
    expect(() => builder.buildSingleClaimXml(claim, hospital)).toThrow(/medicine line 1 has no valid dispensing date/);
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
    typeOfAttendance: 'EAE',
    serviceOutcome: 'DISC',
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
      { itemCategory: 'gdrg', code: 'MEDI31A', description: 'Pneumonia', quantity: 1, lineTotal: 100, clinician: 'LIC-001', serviceDate: new Date('2026-08-01T10:00:00Z'), gdrgTariff: { gdrgCode: 'MEDI31A' } },
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
      items: admissionClaim.items.map((item: any) => item.itemCategory === 'gdrg' ? { ...item, code: 'ZOOM02A', gdrgTariff: { gdrgCode: 'ZOOM02A' } } : item),
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
