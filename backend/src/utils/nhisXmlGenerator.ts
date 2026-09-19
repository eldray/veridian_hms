import { xmlBuilder } from 'xmlbuilder2';

interface ClaimData {
  facilityCode: string;
  claimId: string;
  patientName: string;
  nhisNumber: string;
  dateOfAdmission: string;
  dateOfDischarge: string;
  diagnosisCodes: string[];
  services: Array<{ code: string; description: string; cost: number }>;
}

export function generateNHISClaimXML(data: ClaimData): string {
  const doc = xmlBuilder.create()
    .dec({ version: '1.0', encoding: 'UTF-8' })
    .ele('claims:Claim', { 
      'xmlns:claims': 'http://www.nhis.gov.gh/claims/v4.2',
      'version': '4.2'
    });

  // Header
  doc.ele('claims:Header')
    .ele('claims:FacilityCode').txt(data.facilityCode).up()
    .ele('claims:ClaimID').txt(data.claimId).up()
    .ele('claims:SubmissionDate').txt(new Date().toISOString()).up();

  // Patient Info
  doc.ele('claims:Patient')
    .ele('claims:NHISNumber').txt(data.nhisNumber).up()
    .ele('claims:FullName').txt(data.patientName).up();

  // Admission Details
  doc.ele('claims:Admission')
    .ele('claims:DateOfAdmission').txt(data.dateOfAdmission).up()
    .ele('claims:DateOfDischarge').txt(data.dateOfDischarge).up();

  // Diagnoses
  const diagnoses = doc.ele('claims:Diagnoses');
  data.diagnosisCodes.forEach((code, index) => {
    diagnoses.ele('claims:Diagnosis', { type: index === 0 ? 'Primary' : 'Secondary' })
      .txt(code).up();
  });

  // Services
  const services = doc.ele('claims:Services');
  data.services.forEach(service => {
    services.ele('claims:ServiceItem')
      .ele('claims:Code').txt(service.code).up()
      .ele('claims:Description').txt(service.description).up()
      .ele('claims:Cost').txt(service.cost.toString()).up();
  });

  return doc.end({ prettyPrint: true });
}

export function validateNHISXML(xmlString: string): boolean {
  // Basic validation for required namespaces and tags
  return (
    xmlString.includes('xmlns:claims="http://www.nhis.gov.gh/claims/v4.2"') &&
    xmlString.includes('<claims:Header>') &&
    xmlString.includes('<claims:Patient>') &&
    xmlString.includes('<claims:Services>')
  );
}
