// services/NHISXMLGenerator.ts - UPDATED with proper field mapping

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NHISXMLGenerator {

  static async generateNHISClaimXML(claimId: string): Promise<string> {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: {
        InsuranceProvider: true,
        Patient: true,
        Attendance: {
          include: {
            AttendanceDiagnosis: { include: { Diagnosis: true } },
            ServiceRendered: { include: { ServiceCatalog: { include: { pricing: true } } } },
            LabTest: { include: { ServiceCatalog: true } },
            Scan: { include: { ServiceCatalog: true } },
            Procedure: { include: { ServiceCatalog: true } },
            Medication: {
              include: { 
                ServiceCatalog: true, 
                StockItem: true,
                dispensedBy: { select: { fullName: true } }
              }
            },
            Admission: true
          }
        },
        Bill: { include: { BillLineItem: { include: { serviceCatalog: true } } } }
      }
    });

    if (!claim) throw new Error('Claim not found');

    const attendance = claim.Attendance;
    const patient = claim.Patient;

    // Helper functions
    const calculateAge = (dob: Date, refDate: Date): number => {
      let age = refDate.getFullYear() - dob.getFullYear();
      const monthDiff = refDate.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < dob.getDate())) age--;
      return Math.max(0, age);
    };

    const escapeXml = (str: string): string => {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    };

    const formatDate = (date: Date): string => {
      if (!date) return '';
      const d = new Date(date);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    const formatXmlDate = (date: Date): string => {
      if (!date) return '';
      return date.toISOString().split('T')[0];
    };

    const patientAge = calculateAge(patient.dateOfBirth, attendance?.dateTime || new Date());
    const ageSplit = patientAge >= 12 ? 'A' : 'C';

    // Get MDC from GDRG code
    const principalGDRG = claim.principalGDRG || claim.gdrgCodes?.[0] || '';
    let mdcCode = principalGDRG.slice(0, 4) || 'MEDI';
    const finalMdcCode = `${mdcCode}${ageSplit}`;

    // Type of service
    const typeOfService = attendance?.Admission ? 'IPD' : 'OPD';
    let typeOfAttendance = 'GEN';
    if (attendance?.attendanceType === 'emergency_acute') typeOfAttendance = 'EAE';
    else if (attendance?.attendanceType === 'antenatal') typeOfAttendance = 'ANC';
    else if (attendance?.attendanceType === 'delivery') typeOfAttendance = 'DEL';
    else if (attendance?.attendanceType === 'surgery') typeOfAttendance = 'SUR';
    
    const serviceOutcome = attendance?.status === 'completed' ? 'DISC' : 'CONT';

    // Dates of service
    const datesOfService = claim.datesOfService || [];
    if (datesOfService.length === 0 && attendance?.dateTime) {
      datesOfService.push(formatXmlDate(attendance.dateTime));
    }

    // ✅ DIAGNOSES - All diagnoses with proper format
    const diagnoses = [];
    for (const diag of attendance?.AttendanceDiagnosis || []) {
      if (diag.Diagnosis) {
        diagnoses.push({
          gdrgCode: principalGDRG,
          icd10: diag.Diagnosis.icdCode || '',
          diagnosis: diag.Diagnosis.name || ''
        });
      }
    }

    // ✅ INVESTIGATIONS - Lab Tests (use investigationCode)
    const investigations = [];
    for (const lab of attendance?.LabTest || []) {
      const nhisCode = lab.ServiceCatalog?.investigationCode || lab.ServiceCatalog?.nhisServiceCode;
      if (nhisCode) {
        investigations.push({
          serviceDate: lab.requestedAt ? formatXmlDate(lab.requestedAt) : datesOfService[0],
          gdrgCode: nhisCode,
          description: lab.ServiceCatalog?.name || ''
        });
      }
    }
    
    // ✅ SCANS - Also use investigationCode (same as Lab Tests per NHIS)
    for (const scan of attendance?.Scan || []) {
      const nhisCode = scan.ServiceCatalog?.investigationCode || scan.ServiceCatalog?.nhisServiceCode;
      if (nhisCode) {
        investigations.push({
          serviceDate: scan.requestedAt ? formatXmlDate(scan.requestedAt) : datesOfService[0],
          gdrgCode: nhisCode,
          description: scan.ServiceCatalog?.name || ''
        });
      }
    }

    // ✅ MEDICINES - Use drugCode from StockItem
    const medicines = [];
    for (const med of attendance?.Medication || []) {
      const drugCode = med.StockItem?.drugCode || med.ServiceCatalog?.code;
      if (drugCode && (med.status === 'dispensed' || med.status === 'prescribed')) {
        const unitPrice = med.dispensedUnitCost || med.StockItem?.costPrice || 0;
        const qty = med.quantity || 1;
        medicines.push({
          medicineCode: drugCode,
          dispensedQty: qty,
          unitPrice: unitPrice,
          totalPrice: unitPrice * qty,
          serviceDate: med.dispensedAt ? formatXmlDate(med.dispensedAt) : (med.prescribedAt ? formatXmlDate(med.prescribedAt) : datesOfService[0]),
          prescription: `${med.dosage || ''} ${med.frequency || ''} x ${med.duration || ''}`.trim() || 'As prescribed'
        });
      }
    }

    // ✅ Calculate totals
    const gdrgAmount = claim.totalClaimAmount - medicines.reduce((sum, m) => sum + m.totalPrice, 0);
    const medicationsTotal = medicines.reduce((sum, m) => sum + m.totalPrice, 0);

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<NHISClaim xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n';
    
    // Header
    xml += '  <Header>\n';
    xml += `    <ClaimNumber>${claim.claimNumber}</ClaimNumber>\n`;
    xml += `    <ClaimDate>${formatXmlDate(claim.createdAt)}</ClaimDate>\n`;
    xml += `    <ClaimCheckCode>${claim.claimCheckCode || '00000'}</ClaimCheckCode>\n`;
    xml += `    <FacilityCode>${process.env.NHIS_FACILITY_CODE || '030610076'}</FacilityCode>\n`;
    xml += '  </Header>\n';
    
    // Patient Info
    xml += '  <PatientInfo>\n';
    xml += `    <MemberNumber>${attendance?.nhisCCC || ''}</MemberNumber>\n`;
    xml += `    <Surname>${escapeXml(patient.surname || '')}</Surname>\n`;
    xml += `    <OtherNames>${escapeXml(patient.otherNames || '')}</OtherNames>\n`;
    xml += `    <DateOfBirth>${formatXmlDate(patient.dateOfBirth)}</DateOfBirth>\n`;
    xml += `    <Gender>${patient.gender === 'male' ? 'M' : 'F'}</Gender>\n`;
    xml += `    <FolderNumber>${patient.folderNumber || ''}</FolderNumber>\n`;
    xml += `    <Age>${patientAge}</Age>\n`;
    xml += '  </PatientInfo>\n';
    
    // Service Info
    xml += '  <ServiceInfo>\n';
    xml += `    <TypeOfService>${typeOfService}</TypeOfService>\n`;
    xml += `    <TypeOfAttendance>${typeOfAttendance}</TypeOfAttendance>\n`;
    xml += `    <ServiceOutcome>${serviceOutcome}</ServiceOutcome>\n`;
    xml += `    <MDCCode>${finalMdcCode}</MDCCode>\n`;
    xml += '    <DatesOfService>\n';
    for (const date of datesOfService) {
      xml += `      <Date>${date}</Date>\n`;
    }
    xml += '    </DatesOfService>\n';
    xml += '  </ServiceInfo>\n';
    
    // Diagnoses
    xml += '  <Diagnoses>\n';
    for (const diag of diagnoses) {
      xml += '    <Diagnosis>\n';
      xml += `      <ICD10Code>${diag.icd10}</ICD10Code>\n`;
      xml += `      <GDRGCode>${diag.gdrgCode}</GDRGCode>\n`;
      xml += `      <Description>${escapeXml(diag.diagnosis)}</Description>\n`;
      xml += '    </Diagnosis>\n';
    }
    xml += '  </Diagnoses>\n';
    
    // Investigations
    if (investigations.length > 0) {
      xml += '  <Investigations>\n';
      for (const inv of investigations) {
        xml += '    <Investigation>\n';
        xml += `      <ServiceDate>${inv.serviceDate}</ServiceDate>\n`;
        xml += `      <NHISCode>${inv.gdrgCode}</NHISCode>\n`;
        xml += `      <Description>${escapeXml(inv.description)}</Description>\n`;
        xml += '    </Investigation>\n';
      }
      xml += '  </Investigations>\n';
    }
    
    // Medicines
    if (medicines.length > 0) {
      xml += '  <Medicines>\n';
      for (const med of medicines) {
        xml += '    <Medicine>\n';
        xml += `      <DrugCode>${med.medicineCode}</DrugCode>\n`;
        xml += `      <DispensedQuantity>${med.dispensedQty}</DispensedQuantity>\n`;
        xml += `      <UnitPrice>${med.unitPrice.toFixed(2)}</UnitPrice>\n`;
        xml += `      <TotalPrice>${med.totalPrice.toFixed(2)}</TotalPrice>\n`;
        xml += `      <ServiceDate>${med.serviceDate}</ServiceDate>\n`;
        xml += `      <Prescription>${escapeXml(med.prescription)}</Prescription>\n`;
        xml += '    </Medicine>\n';
      }
      xml += '  </Medicines>\n';
    }
    
    // Claim Summary
    xml += '  <ClaimSummary>\n';
    xml += `    <PrincipalGDRG>${principalGDRG}</PrincipalGDRG>\n`;
    xml += `    <GDRGAmount>${gdrgAmount.toFixed(2)}</GDRGAmount>\n`;
    xml += `    <MedicationsAmount>${medicationsTotal.toFixed(2)}</MedicationsAmount>\n`;
    xml += `    <TotalClaimAmount>${claim.totalClaimAmount.toFixed(2)}</TotalClaimAmount>\n`;
    xml += '  </ClaimSummary>\n';
    
    xml += '</NHISClaim>';
    
    return xml;
  }
}