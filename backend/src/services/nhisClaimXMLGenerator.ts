// services/nhisClaimXMLGenerator.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Gets hospital/facility information for NHIS claims
 */
const getHospitalInfo = async () => {
  try {
    const hospital = await prisma.hospital.findFirst({
      where: { isActive: true }
    });

    if (!hospital) {
      // Fallback to environment variables
      return {
        name: process.env.FACILITY_NAME || 'Healthcare Facility',
        nhisFacilityCode: process.env.FACILITY_CODE || 'FAC001',
        nhisFacilityType: 'Primary',
        address: process.env.FACILITY_ADDRESS || 'Not specified',
        phone: process.env.FACILITY_PHONE || 'Not specified',
        email: process.env.FACILITY_EMAIL || 'Not specified',
        nhisAccreditationNumber: null,
        nhisContactPerson: null
      };
    }

    return hospital;
  } catch (error) {
    console.error('Error fetching hospital info:', error);
    return {
      name: process.env.FACILITY_NAME || 'Healthcare Facility',
      nhisFacilityCode: process.env.FACILITY_CODE || 'FAC001',
      nhisFacilityType: 'Primary',
      address: 'Not specified',
      phone: 'Not specified',
      email: 'Not specified',
      nhisAccreditationNumber: null,
      nhisContactPerson: null
    };
  }
};

/**
 * Generates NHIS e-claims XML using Prisma Hospital model data
 */
export const generateNHISClaimXML = async (claimData: any): Promise<string> => {
  const hospital = await getHospitalInfo();

  const {
    claimType,
    encounterType,
    patient,
    clinical,
    services,
    drgInformation
  } = claimData;

  const isIPD = claimType === 'IPD';
  const visitType = isIPD ? 'INPATIENT' :
    (encounterType === 'emergency' ? 'EMERGENCY' : 'OPD');

  // === Diagnoses ===
  const primaryDiagnosisXml = `
    <PrimaryDiagnosis>
      <ICDCode>${escapeXml(clinical.primaryDiagnosis.icdCode)}</ICDCode>
      <GDRGCode>${escapeXml(clinical.primaryDiagnosis.gdrgCode)}</GDRGCode>
      ${isIPD ? `<PresentOnAdmission>${escapeXml(clinical.primaryDiagnosis.presentOnAdmission)}</PresentOnAdmission>` : ''}
    </PrimaryDiagnosis>`;

  const secondaryDiagnosesXml = clinical.secondaryDiagnoses
    ? clinical.secondaryDiagnoses.map((diag: any) => `
    <SecondaryDiagnosis>
      <ICDCode>${escapeXml(diag.icdCode)}</ICDCode>
      ${isIPD ? `<PresentOnAdmission>${escapeXml(diag.presentOnAdmission || 'U')}</PresentOnAdmission>` : ''}
    </SecondaryDiagnosis>`).join('')
    : '';

  // === Services or DRG ===
  let servicesXml = '';
  if (isIPD && drgInformation) {
    servicesXml = `
    <DRGInformation>
      <GDRGCode>${escapeXml(drgInformation.gdrgCode)}</GDRGCode>
      <DRGWeight>${drgInformation.drgWeight}</DRGWeight>
      <BaseRate>${drgInformation.baseRate}</BaseRate>
      <TotalPayment>${drgInformation.totalPayment}</TotalPayment>
      <LengthOfStay>${clinical.lengthOfStay || 0}</LengthOfStay>
    </DRGInformation>`;
  } else if (services && services.length > 0) {
    servicesXml = `
    <Services>
      ${services.map((service: any, index: number) => `
      <Service>
        <LineNumber>${index + 1}</LineNumber>
        <NHISServiceCode>${escapeXml(service.nhisServiceCode || service.code)}</NHISServiceCode>
        <Description>${escapeXml(service.description || service.name)}</Description>
        <Quantity>${service.quantity || 1}</Quantity>
        <UnitPrice>${service.unitPrice || service.cashPrice || 0}</UnitPrice>
        <TotalPrice>${(service.totalPrice || (service.unitPrice || service.cashPrice || 0) * (service.quantity || 1)).toFixed(2)}</TotalPrice>
        <ServiceDate>${service.serviceDate ? new Date(service.serviceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</ServiceDate>
      </Service>`).join('')}
    </Services>`;
  }

  // === Final XML ===
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NHISClaim xmlns="http://www.nhis.gov.gh/schemas/claim/v1">
  <Header>
    <ClaimNumber>${escapeXml(claimData.claimNumber || `NHIS-${Date.now()}`)}</ClaimNumber>
    <FacilityCode>${escapeXml(hospital.nhisFacilityCode)}</FacilityCode>
    <FacilityName>${escapeXml(hospital.name)}</FacilityName>
    <FacilityType>${escapeXml(hospital.nhisFacilityType)}</FacilityType>
    <FacilityAddress>${escapeXml(hospital.address)}</FacilityAddress>
    <FacilityPhone>${escapeXml(hospital.phone)}</FacilityPhone>
    ${hospital.nhisAccreditationNumber ? `<AccreditationNumber>${escapeXml(hospital.nhisAccreditationNumber)}</AccreditationNumber>` : ''}
    <SubmissionDate>${new Date().toISOString().split('T')[0]}</SubmissionDate>
    <ClaimType>${escapeXml(claimType)}</ClaimType>
    <EncounterType>${escapeXml(visitType)}</EncounterType>
  </Header>
  
  <PatientInformation>
    <NHISNumber>${escapeXml(patient.nhisNumber || patient.nhisCCC || '')}</NHISNumber>
    <FullName>${escapeXml(patient.fullName || '')}</FullName>
    <DateOfBirth>${patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : ''}</DateOfBirth>
    <Gender>${escapeXml(patient.gender || 'U')}</Gender>
  </PatientInformation>
  
  <EncounterInformation>
    <AttendanceDate>${clinical.attendanceDate ? new Date(clinical.attendanceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</AttendanceDate>
    ${isIPD ? `
    <AdmissionDate>${clinical.admissionDate ? new Date(clinical.admissionDate).toISOString().split('T')[0] : ''}</AdmissionDate>
    <DischargeDate>${clinical.dischargeDate ? new Date(clinical.dischargeDate).toISOString().split('T')[0] : ''}</DischargeDate>
    <AdmissionType>${escapeXml(clinical.admissionType || 'emergency')}</AdmissionType>
    <DischargeStatus>${escapeXml(clinical.dischargeStatus || 'home')}</DischargeStatus>` : ''}
  </EncounterInformation>
  
  <ClinicalInformation>
    <Diagnoses>
      ${primaryDiagnosisXml}
      ${secondaryDiagnosesXml}
    </Diagnoses>
  </ClinicalInformation>
  
  <BillingInformation>
    ${servicesXml}
  </BillingInformation>
  
  <ProviderInformation>
    <ProviderName>${escapeXml(hospital.name)}</ProviderName>
    <ProviderID>${escapeXml(hospital.nhisFacilityCode)}</ProviderID>
    <ProviderType>${escapeXml(hospital.nhisFacilityType)}</ProviderType>
    <ProviderAddress>${escapeXml(hospital.address)}</ProviderAddress>
    <ProviderPhone>${escapeXml(hospital.phone)}</ProviderPhone>
    <AttendingPhysician>${escapeXml(clinical.attendingPhysician || 'Medical Officer')}</AttendingPhysician>
    ${hospital.nhisContactPerson ? `<NHISContactPerson>${escapeXml(hospital.nhisContactPerson)}</NHISContactPerson>` : ''}
  </ProviderInformation>
</NHISClaim>`;

  return xml;
};

// Helper: Escape XML special characters
const escapeXml = (str: string | null | undefined): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};