import { describe, expect, it } from 'vitest';
import { NHISClaimXMLBuilder } from '../src/modules/insuranceClaim/xml/NHISClaimXMLBuilder';

describe('NHIS claim pre-authorisation XML', () => {
const validClaimFields = {
  claimCheckCode: '12345',
  typeOfService: 'OPD',
  typeOfAttendance: 'EAE',
  serviceOutcome: 'DISC',
  principalGDRG: 'OPDC06A',
  Patient: {
    nhisNumber: '12345678', surname: 'TEST', otherNames: 'PATIENT',
    dateOfBirth: new Date('1990-01-01T00:00:00.000Z'), gender: 'male', folderNumber: 'F-001',
  },
  Attendance: { nhisCCC: '12345', dateTime: new Date('2026-01-01T00:00:00.000Z'), Admission: null },
  items: [
    { itemCategory: 'gdrg', code: 'OPDC06A', description: 'OPD consultation', quantity: 1, clinician: 'LIC-001', gdrgTariff: { gdrgCode: 'OPDC06A' } },
    { itemCategory: 'diagnosis', code: 'J06.9', description: 'Acute upper respiratory infection', gdrgTariff: { gdrgCode: 'OPDC06A' } },
  ],
};


  const builder = new NHISClaimXMLBuilder();

  it('emits each distinct pre-authorisation number as a separate XML code', () => {
    const xml = builder.buildSingleClaimXml({
      ...validClaimFields,
      claimNumber: 'NHIS-TEST-1',
      preAuthNumber: 'AUTH-001,AUTH-002,AUTH-001',
      items: [...validClaimFields.items, { itemCategory: 'service', code: 'TEST', description: 'Test service', quantity: 1, unitPrice: 1, lineTotal: 1 }],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }, { nhisFacilityCode: 'FAC-001' });

    expect(xml).toContain('<preAuthorizationCodes><code>AUTH-001</code><code>AUTH-002</code></preAuthorizationCodes>');
    expect(xml).not.toContain('<code>AUTH-001</code><code>AUTH-002</code><code>AUTH-001</code>');
  });

  it('escapes authorisation numbers before writing XML', () => {
    const xml = builder.buildSingleClaimXml({
      ...validClaimFields,
      claimNumber: 'NHIS-TEST-2',
      preAuthNumber: 'AUTH<&001',
      items: [...validClaimFields.items, { itemCategory: 'service', code: 'TEST', description: 'Test service', quantity: 1, unitPrice: 1, lineTotal: 1 }],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }, { nhisFacilityCode: 'FAC-001' });

    expect(xml).toContain('<code>AUTH&lt;&amp;001</code>');
  });

  it('keeps the empty XML element when no authorisation is recorded', () => {
    const xml = builder.buildSingleClaimXml({
      ...validClaimFields,
      claimNumber: 'NHIS-TEST-3',
      preAuthNumber: null,
      items: [...validClaimFields.items, { itemCategory: 'service', code: 'TEST', description: 'Test service', quantity: 1, unitPrice: 1, lineTotal: 1 }],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }, { nhisFacilityCode: 'FAC-001' });

    expect(xml).toContain('<preAuthorizationCodes />');
  });
});
