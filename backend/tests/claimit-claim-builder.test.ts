import { describe, expect, it } from 'vitest';
import {
  buildClaimItClaim,
  claimGdrgCodes,
  findClaimItBlockers,
  toClaimItJson,
  toClaimItXml,
} from '../src/modules/insuranceClaim/claimit/ClaimItClaimBuilder';

/**
 * A claim as `InsuranceClaimRepository.findByIdWithDetails` hands it over: the claim header, the
 * patient, the encounter, and itemised lines carrying their GDRG tariff and diagnosis.
 */
const claimFixture = (overrides: Record<string, any> = {}) => ({
  id: 'claim_1',
  claimNumber: 'NHIS-10001',
  status: 'finalized',
  claimCheckCode: '74374',
  preAuthNumber: '29841747, 29841748',
  typeOfService: 'IPD',
  typeOfAttendance: 'EAE',
  serviceOutcome: 'DISC',
  principalGDRG: 'MEDI30A',
  createdAt: new Date('2026-03-04T09:00:00Z'),
  Patient: {
    nhisNumber: '11111111',
    surname: 'OWUSU AFRIYIE',
    otherNames: 'ENOCK',
    dateOfBirth: new Date('2005-05-11T00:00:00Z'),
    gender: 'male',
    folderNumber: '2942 / 21',
    insuranceDetails: { relationship: 'self' },
  },
  Attendance: {
    nhisCCC: '74374',
    dateTime: new Date('2026-03-02T08:00:00Z'),
    Admission: { admissionDate: new Date('2026-03-02T00:00:00Z'), dischargeDate: new Date('2026-03-04T00:00:00Z') },
  },
  items: [
    { itemNumber: 1, itemCategory: 'gdrg', code: 'MEDI30A', description: 'Malaria', quantity: 1, gdrgTariff: { gdrgCode: 'MEDI30A' } },
    {
      itemNumber: 2, itemCategory: 'diagnosis', code: 'B50.9', description: 'Plasmodium Falciparum Malaria',
      quantity: 1, gdrgTariff: { gdrgCode: 'MEDI28A' }, diagnosis: { icdCode: 'B50.9', name: 'Plasmodium Falciparum Malaria' },
    },
    {
      itemNumber: 3, itemCategory: 'procedure', code: 'PRO01', description: 'Emergency appendicectomy', quantity: 1,
      serviceDate: new Date('2026-03-03T10:00:00Z'), gdrgTariff: { gdrgCode: 'ASUR01A' },
      diagnosis: { icdCode: 'K35.8', name: 'Acute appendicitis' }, clinician: 'DVA-0012',
    },
    {
      itemNumber: 4, itemCategory: 'investigation', code: 'FBC', description: 'Full blood count', quantity: 1,
      serviceDate: new Date('2026-03-02T11:00:00Z'), gdrgTariff: { gdrgCode: 'INVE09D' },
    },
    {
      itemNumber: 5, itemCategory: 'medicine', code: 'ARTESUIN3', description: 'Artesunate', quantity: 3,
      serviceDate: new Date('2026-03-02T12:00:00Z'), prescriptionText: '86mg 0,bd,4days',
    },
  ],
  ...overrides,
});

describe('CLAIM-it claim payload', () => {
  it('sends the header in the flat shape and code values the spec lists', () => {
    const claim = buildClaimItClaim(claimFixture());

    expect(claim.claimID).toBe('NHIS-10001');
    expect(claim.claimCheckCode).toBe('74374');
    // §2.1: one element holding every authorization code, separated by commas.
    expect(claim.preAuthorizationCodes).toBe('29841747,29841748');
    expect(claim.physicianID).toBe('DVA-0012');
    expect(claim.memberNo).toBe('11111111');
    expect(claim.dateOfBirth).toBe('2005-05-11');
    expect(claim.gender).toBe('M');
    expect(claim.hospitalRecNo).toBe('2942 / 21');
    expect(claim.isDependant).toBe('0');
    expect(claim.typeOfService).toBe('IPD');
    expect(claim.includesPharmacy).toBe('1');
    expect(claim.serviceOutcome).toBe('DISC');
    expect(claim.principalGDRG).toBe('MEDI30A');
  });

  it('repeats every day of an admission as its own date of service', () => {
    expect(buildClaimItClaim(claimFixture()).dateOfService).toEqual(['2026-03-02', '2026-03-03', '2026-03-04']);
  });

  it('reads the specialties off the GDRG codes on the claim', () => {
    // MEDI30A/MEDI28A are Adult Medicine and ASUR01A is Adult Surgery; INVE09D is not a specialty.
    expect(buildClaimItClaim(claimFixture()).specialtyAttended).toEqual(['MEDI', 'ASUR']);
  });

  it('carries the ICD-10 and diagnosis wording that a procedure line needs', () => {
    const claim = buildClaimItClaim(claimFixture());
    expect(claim.procedure).toEqual([
      { serviceDate: '2026-03-03', gdrgCode: 'ASUR01A', icd10: 'K35.8', diagnosis: 'Acute appendicitis' },
    ]);
    expect(claim.investigation[0]).toEqual({ serviceDate: '2026-03-02', gdrgCode: 'INVE09D' });
    expect(claim.medicine[0]).toEqual({
      medicineCode: 'ARTESUIN3', dispensedQty: 3, serviceDate: '2026-03-02', prescription: { unparsed: '86mg 0,bd,4days' },
    });
  });

  it('translates the outcome this app records into the outcome CLAIM-it accepts', () => {
    expect(buildClaimItClaim(claimFixture({ serviceOutcome: 'DTH' })).serviceOutcome).toBe('DIED');
    expect(buildClaimItClaim(claimFixture({ serviceOutcome: 'REF' })).serviceOutcome).toBe('TFOT');
    expect(buildClaimItClaim(claimFixture({ serviceOutcome: 'ABS' })).serviceOutcome).toBe('ABSC');
  });

  it('escapes a name that would otherwise break the document', () => {
    const claim = buildClaimItClaim(claimFixture({
      Patient: { ...claimFixture().Patient, surname: 'ASante&<Co>', otherNames: 'K."O"', folderNumber: `A'B` },
    }));
    const xml = toClaimItXml([claim]);
    expect(xml).toContain('<surname>ASante&amp;&lt;Co&gt;</surname>');
    expect(xml).toContain('<otherNames>K.&quot;O&quot;</otherNames>');
    expect(xml).toContain("<hospitalRecNo>A&apos;B</hospitalRecNo>");
  });
});

describe('CLAIM-it XML document', () => {
  it('writes <claimID> with the capitalisation the spec uses, flat under <claim>', () => {
    const xml = toClaimItXml([buildClaimItClaim(claimFixture())]);
    expect(xml).toContain('<claimID>NHIS-10001</claimID>');
    expect(xml).not.toContain('<claimid>');
    expect(xml).not.toContain('<memberInfo>');
    expect(xml).not.toContain('<serviceInfo>');
    expect(xml).not.toContain('<datesOfService>');
    expect(xml).toContain('    <memberNo>11111111</memberNo>');
  });

  it('emits repeated sibling elements instead of entries inside a container', () => {
    const xml = toClaimItXml([buildClaimItClaim(claimFixture())]);
    expect(xml.match(/<dateOfService>/g)).toHaveLength(3);
    // Three, by design: §2.1 nests the diagnosis wording inside each <diagnosis> element, so the
    // procedure's own <diagnosis> and the diagnosis block's wrapper and its text all appear.
    expect(xml.match(/<diagnosis>/g)).toHaveLength(3);
    expect(xml.match(/<medicine>/g)).toHaveLength(1);
    expect(xml).not.toContain('<entry>');
    expect(xml).not.toContain('<diagnoses>');
  });

  it('orders the elements the way §2.1 shows them', () => {
    const xml = toClaimItXml([buildClaimItClaim(claimFixture())]);
    const order = ['claimID', 'claimCheckCode', 'preAuthorizationCodes', 'physicianID', 'memberNo', 'surname',
      'otherNames', 'dateOfBirth', 'gender', 'hospitalRecNo', 'isDependant', 'typeOfService', 'isUnbundled',
      'includesPharmacy', 'typeOfAttendance', 'serviceOutcome', 'dateOfService', 'specialtyAttended',
      'investigation', 'procedure', 'diagnosis', 'medicine', 'principalGDRG'];
    const positions = order.map((tag) => xml.indexOf(`<${tag}>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('wraps a batch of claims in one <claims> container', () => {
    const claims = [buildClaimItClaim(claimFixture()), buildClaimItClaim(claimFixture({ claimNumber: 'NHIS-10002' }))];
    const xml = toClaimItXml(claims);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<claims>')).toBe(true);
    expect(xml.endsWith('</claims>')).toBe(true);
    expect(xml.match(/<claim>/g)).toHaveLength(2);
  });

  it('keeps the JSON form on the same fields as the XML form', () => {
    const claim = buildClaimItClaim(claimFixture());
    const payload = toClaimItJson([claim]);
    expect(payload.claims).toHaveLength(1);
    expect(payload.claims[0].claimID).toBe('NHIS-10001');
    expect(payload.claims[0].dateOfService).toEqual(claim.dateOfService);
    expect(payload.claims[0].procedure).toEqual(claim.procedure);
  });
});

describe('CLAIM-it pre-flight check', () => {
  /** The same two inputs the submission service hands over: the payload and the claim's bundled GDRGs. */
  const blockersFor = (overrides: Record<string, any> = {}) => {
    const raw = claimFixture(overrides);
    return findClaimItBlockers(buildClaimItClaim(raw), claimGdrgCodes(raw));
  };

  it('accepts a claim that carries everything the payer needs', () => {
    expect(blockersFor()).toEqual([]);
  });

  const cases: Array<[string, Record<string, any>, string]> = [
    ['a patient with no NHIS number', { Patient: { ...claimFixture().Patient, nhisNumber: '' } }, 'no NHIS number'],
    ['an NHIS number that is neither 8 nor 10 digits', { Patient: { ...claimFixture().Patient, nhisNumber: '123456' } }, 'is not an 8-digit number'],
    ['no claim check code', { claimCheckCode: '', Attendance: { ...claimFixture().Attendance, nhisCCC: null } }, 'no Claim Check Code'],
    ['a 4-digit claim check code', { claimCheckCode: '7437' }, 'not the 5 digits'],
    ['a claim with no diagnosis line', { items: claimFixture().items.filter((i: any) => i.itemCategory !== 'diagnosis') }, 'no diagnosis line'],
    ['an admission that has not been discharged', { serviceOutcome: 'CONT' }, 'An admission still open cannot be claimed'],
    ['an inpatient claim with no principal GDRG', { principalGDRG: '' }, 'needs the principal GDRG'],
    ['a principal GDRG outside the claim', { principalGDRG: 'PAED99A' }, 'is not one of the GDRG codes on this claim'],
    ['a procedure with no diagnosis attached', {
      items: claimFixture().items.map((i: any) => (i.itemCategory === 'procedure' ? { ...i, diagnosis: null } : i)),
    }, 'Procedure line 1 has no diagnosis attached'],
    ['a medicine with no prescription text', {
      items: claimFixture().items.map((i: any) => (i.itemCategory === 'medicine' ? { ...i, prescriptionText: '' } : i)),
    }, 'has no prescription text'],
    ['a draft claim type of service', { typeOfService: 'OPD-CONSULT' }, 'must be OPD, IPD, DIA or PHC'],
    ['no folder number', { Patient: { ...claimFixture().Patient, folderNumber: '' } }, 'no folder number'],
  ];

  it.each(cases)('names what is wrong when a claim has %s', (_label, overrides, expected) => {
    const blockers = blockersFor(overrides);
    expect(blockers.map((b) => b.message).join(' | ')).toContain(expected);
  });

  it('reports every problem at once so the desk fixes the claim in one pass', () => {
    const blockers = blockersFor({
      claimCheckCode: '',
      Patient: { ...claimFixture().Patient, nhisNumber: '', otherNames: '' },
    });
    expect(blockers.length).toBeGreaterThanOrEqual(3);
    expect(blockers.every((b) => b.field && b.message)).toBe(true);
  });

  it('does not send a claim whose encounter is still open', () => {
    const blockers = blockersFor({
      Attendance: { ...claimFixture().Attendance, Admission: { admissionDate: new Date('2026-03-02T00:00:00Z'), dischargeDate: null } },
      serviceOutcome: 'CONT',
    });
    expect(blockers.some((b) => b.field === 'serviceOutcome')).toBe(true);
  });
});
