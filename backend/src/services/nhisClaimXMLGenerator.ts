// services/nhisClaimXMLGenerator.ts - UPDATED WITH MEDICINES SUPPORT
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
      return {
        name: process.env.FACILITY_NAME || 'Healthcare Facility',
        nhisFacilityCode: process.env.FACILITY_CODE || 'FAC001',
        nhisAccreditationNumber: process.env.NHIS_ACCREDITATION_NUMBER || 'ACC001',
        eClaimAuthorizationNumber: parseInt(process.env.ECLAIM_AUTH_NUMBER || '12345')
      };
    }

    return hospital;
  } catch (error) {
    console.error('Error fetching hospital info:', error);
    return {
      name: process.env.FACILITY_NAME || 'Healthcare Facility',
      nhisFacilityCode: process.env.FACILITY_CODE || 'FAC001',
      nhisAccreditationNumber: process.env.NHIS_ACCREDITATION_NUMBER || 'ACC001',
      eClaimAuthorizationNumber: parseInt(process.env.ECLAIM_AUTH_NUMBER || '12345')
    };
  }
};

/**
 * Format date to DD/MM/YYYY as required by NHIS
 */
const formatNHISDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Convert boolean to Yes/No as required by NHIS
 */
const toYesNo = (value: boolean): string => value ? 'Yes' : 'No';

/**
 * Convert gender to M/F as required by NHIS
 */
const formatGender = (gender: string): string => {
  return gender?.toLowerCase() === 'female' ? 'F' : 'M';
};

/**
 * Generate medicines XML for NHIS claims
 * IMPORTANT: Medicines are a core part of NHIS claims as evidenced by the vetting report
 * The report shows separate adjustments for medicines under:
 * - "Inappropriate Prescription" (GHS 1,533.44)
 * - "Treatment to Diagnosis Mismatch" (GHS 60.76)
 */
const generateMedicinesXml = (medications: any[] = []): string => {
  if (!medications || medications.length === 0) {
    return '';
  }

  // Generate XML for each medicine item
  const medicinesXml = medications.map((med: any, index: number) => {
    // Use NHIS drug code if available, otherwise use internal code
    const drugCode = med.nhisDrugCode || med.drugCode || `DRG${(index + 1).toString().padStart(3, '0')}`;
    
    return `
      <Medicine>
        <Date>${med.dateAdministered ? formatNHISDate(new Date(med.dateAdministered)) : formatNHISDate(new Date())}</Date>
        <DrugCode>${escapeXml(drugCode)}</DrugCode>
        <DrugName>${escapeXml(med.drugName || med.name)}</DrugName>
        <Strength>${escapeXml(med.strength || '')}</Strength>
        <Dosage>${escapeXml(med.dosage || '')}</Dosage>
        <Frequency>${escapeXml(med.frequency || '')}</Frequency>
        <Duration>${escapeXml(med.duration || '')}</Duration>
        <Quantity>${med.quantity || 1}</Quantity>
        <UnitPrice>${med.unitPrice?.toFixed(2) || '0.00'}</UnitPrice>
        <TotalCost>${med.totalCost?.toFixed(2) || med.unitPrice?.toFixed(2) || '0.00'}</TotalCost>
        <PrescribingDoctor>${escapeXml(med.prescribingDoctor || '')}</PrescribingDoctor>
      </Medicine>`;
  }).join('');

  return medicinesXml;
};

/**
 * Generate treatments XML for services and procedures
 */
const generateTreatmentsXml = (services: any[] = []): string => {
  if (!services || services.length === 0) {
    return '';
  }

  const treatmentsXml = services.map((service: any, index: number) => `
      <Treatment>
        <Date>${service.serviceDate ? formatNHISDate(new Date(service.serviceDate)) : formatNHISDate(new Date())}</Date>
        <Type>${service.serviceType || 'Investigation'}</Type>
        <TreatmentCode>${escapeXml(service.nhisServiceCode || service.code)}</TreatmentCode>
        <Description>${escapeXml(service.description || service.name)}</Description>
        <Tariff>${service.nhisTariff?.toFixed(2) || service.cost?.toFixed(2) || '0.00'}</Tariff>
        <Quantity>${service.quantity || 1}</Quantity>
        <TotalCost>${service.totalCost?.toFixed(2) || service.cost?.toFixed(2) || '0.00'}</TotalCost>
      </Treatment>`).join('');

  return treatmentsXml;
};

/**
 * Generate NHIS-compliant XML according to the XSD schema
 */
export const generateNHISClaimXML = async (claimData: any): Promise<string> => {
  const hospital = await getHospitalInfo();

  const {
    claimType,
    patient,
    clinical,
    services = [],
    medications = [],
    drgInformation,
    claimNumber,
    attendance
  } = claimData;

  const isIPD = claimType === 'IPD';
  const serviceType = isIPD ? 'INP' : 'OUT';

  // Format dates for NHIS
  const currentDate = formatNHISDate(new Date());
  const serviceYear = new Date().getFullYear().toString();
  const serviceMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  // Determine outcome type based on discharge status
  const getOutcomeType = (): string => {
    if (!isIPD) return 'DIS'; // Default for OPD
    switch (clinical.dischargeStatus) {
      case 'home': return 'DIS';
      case 'transfer': return 'TFR';
      case 'expired': return 'DIE';
      case 'against_medical_advice': return 'DAA';
      default: return 'DIS';
    }
  };

  // Determine admission type
  const getAdmissionType = (): string => {
    switch (clinical.admissionType) {
      case 'elective': return 'CRO';
      case 'emergency': return 'EME';
      case 'transfer': return 'ACU';
      default: return 'EME';
    }
  };

  // Generate treatments and medicines XML
  const treatmentsXml = generateTreatmentsXml(services);
  const medicinesXml = generateMedicinesXml(medications);

  // Calculate totals
  const servicesTotal = services.reduce((sum: number, service: any) => 
    sum + (service.totalCost || service.cost || 0), 0);
  const medicinesTotal = medications.reduce((sum: number, med: any) => 
    sum + (med.totalCost || med.unitPrice || 0), 0);
  const totalClaimAmount = servicesTotal + medicinesTotal;

  const xml = `<?xml version="1.0"?>
<Batch>
  <GeneralInformation>
    <VersionInformation>
      <XMLFormatVersion>1.0</XMLFormatVersion>
      <GDRGVersion>2024</GDRGVersion>
      <TariffVersion>2024</TariffVersion>
      <ICDVersion>10</ICDVersion>
    </VersionInformation>
    <BatchInformation>
      <BatchNumber>BATCH-${Date.now()}</BatchNumber>
      <BatchAmount>${totalClaimAmount.toFixed(2)}</BatchAmount>
      <BatchCurrency>GHS</BatchCurrency>
      <ClaimsCount>1</ClaimsCount>
      <CreationDate>${currentDate}</CreationDate>
      <ServiceYear>${serviceYear}</ServiceYear>
      <ServiceMonth>${serviceMonth}</ServiceMonth>
    </BatchInformation>
    <ProviderInformation>
      <ProviderAccreditationNumber>${escapeXml(hospital.nhisAccreditationNumber)}</ProviderAccreditationNumber>
      <eClaimAuthorizationNumber>${hospital.eClaimAuthorizationNumber}</eClaimAuthorizationNumber>
    </ProviderInformation>
  </GeneralInformation>
  <Patients>
    <PatientData>
      <Surname>${escapeXml(patient.surname || patient.fullName?.split(' ')[0] || '')}</Surname>
      <OtherName>${escapeXml(patient.otherNames || patient.fullName?.split(' ').slice(1).join(' ') || '')}</OtherName>
      <DateOfBirth>${patient.dateOfBirth ? formatNHISDate(new Date(patient.dateOfBirth)) : ''}</DateOfBirth>
      <MemberNumber>${escapeXml(patient.nhisNumber || patient.nhisCCC || '')}</MemberNumber>
      <HospitalRecordNumber>${escapeXml(patient.folderNumber || '')}</HospitalRecordNumber>
      <Gender>${formatGender(patient.gender)}</Gender>
      <Claims>
        <Claim>
          <ClaimIdentificationNumber>${escapeXml(claimNumber)}</ClaimIdentificationNumber>
          <ServiceType>${serviceType}</ServiceType>
          <PharmacyIncluded>${medications.length > 0 ? 'Yes' : 'No'}</PharmacyIncluded>
          <AllInclusive>No</AllInclusive>
          <OutcomeType>${getOutcomeType()}</OutcomeType>
          ${isIPD ? `<DurationLength>${clinical.lengthOfStay || 1}</DurationLength>` : ''}
          ${isIPD ? `<AdmissionType>${getAdmissionType()}</AdmissionType>` : ''}
          <SpecialityCode>${clinical.specialtyCode || 'GEN'}</SpecialityCode>
          <AdmissionDate>${clinical.admissionDate ? formatNHISDate(new Date(clinical.admissionDate)) : currentDate}</AdmissionDate>
          ${isIPD && clinical.dischargeDate ? `<DischargeDate>${formatNHISDate(new Date(clinical.dischargeDate))}</DischargeDate>` : ''}
          ${isIPD ? `<InPatientCode>${escapeXml(drgInformation?.gdrgCode || clinical.primaryDiagnosis?.gdrgCode)}</InPatientCode>` : ''}
          ${!isIPD ? `<OutpatientCode>${escapeXml(clinical.primaryDiagnosis?.gdrgCode)}</OutpatientCode>` : ''}
          ${!isIPD ? `<InvestigationCode>INV001</InvestigationCode>` : ''}
          ${isIPD ? `<InPatientTariffAmount>${servicesTotal.toFixed(2)}</InPatientTariffAmount>` : ''}
          ${!isIPD ? `<OutPatientTariffAmount>${servicesTotal.toFixed(2)}</OutPatientTariffAmount>` : ''}
          <TotalCost>${totalClaimAmount.toFixed(2)}</TotalCost>
          <TreatmentsCount>${services.length}</TreatmentsCount>
          <MedicinesCount>${medications.length}</MedicinesCount>
          <Treatments>
            ${treatmentsXml}
          </Treatments>
          <Medicines>
            ${medicinesXml}
          </Medicines>
        </Claim>
      </Claims>
    </PatientData>
  </Patients>
</Batch>`;

  return xml;
};

// Helper: Escape XML special characters
const escapeXml = (str: string | null | undefined): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};