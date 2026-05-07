// services/NHISXMLGenerator.ts
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
            ServiceRendered: { include: { ServiceCatalog: true } },
            LabTest: { include: { ServiceCatalog: true } },
            Scan: { include: { ServiceCatalog: true } },
            Medication: {
              include: { ServiceCatalog: true, StockItem: true, dispensedBy: { select: { fullName: true } } }
            },
            Admission: true
          }
        },
        Bill: { include: { BillLineItem: true } }
      }
    });

    if (!claim) throw new Error('Claim not found');

    const attendance = claim.Attendance;
    const patient = claim.Patient;
    const admission = attendance?.Admission;

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

    const patientAge = calculateAge(patient.dateOfBirth, attendance?.dateTime || new Date());
    const ageGroup = patientAge >= 12 ? 'A' : 'C';

    // Determine MDC
    const primaryDiagnosis = attendance?.AttendanceDiagnosis?.find(d => d.diagnosisType === 'primary');
    const morbidityGroup = primaryDiagnosis?.Diagnosis?.morbidityGroup || '';
    let mdcCode = 'MEDI';
    if (attendance?.attendanceType === 'antenatal' || attendance?.attendanceType === 'delivery') mdcCode = 'OBGY';
    else if (attendance?.attendanceType === 'surgery') mdcCode = 'ASUR';
    const finalMdcCode = `${mdcCode}${ageGroup}`;

    // Type of service
    const typeOfService = admission ? 'IPD' : 'OPD';
    const typeOfAttendance = attendance?.attendanceType === 'emergency_acute' ? 'EAE' : 'GEN';
    const serviceOutcome = attendance?.status === 'completed' ? 'DISC' : 'CONT';

    // Dates of service
    const datesOfService = [];
    if (admission) {
      let currentDate = new Date(admission.admissionDate);
      const dischargeDate = admission.dischargeDate || new Date();
      while (currentDate <= dischargeDate) {
        datesOfService.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      datesOfService.push(new Date(attendance?.dateTime || new Date()).toISOString().split('T')[0]);
    }

    // Investigations
    const investigations = [];
    for (const lab of attendance?.LabTest || []) {
      if (lab.ServiceCatalog?.nhisServiceCode) {
        investigations.push({
          serviceDate: lab.requestedAt?.toISOString().split('T')[0] || datesOfService[0],
          gdrgCode: lab.ServiceCatalog.nhisServiceCode
        });
      }
    }
    for (const scan of attendance?.Scan || []) {
      if (scan.ServiceCatalog?.nhisServiceCode) {
        investigations.push({
          serviceDate: scan.requestedAt?.toISOString().split('T')[0] || datesOfService[0],
          gdrgCode: scan.ServiceCatalog.nhisServiceCode
        });
      }
    }

    // Diagnoses
    const diagnoses = [];
    for (const diag of attendance?.AttendanceDiagnosis || []) {
      if (diag.Diagnosis) {
        diagnoses.push({
          gdrgCode: claim.gdrgCodes?.[0] || 'OPDC06A',
          icd10: diag.Diagnosis.icdCode || '',
          diagnosis: diag.Diagnosis.name || ''
        });
      }
    }

    // Medicines
    const medicines = [];
    for (const med of attendance?.Medication || []) {
      if (med.status === 'dispensed' && (med.ServiceCatalog?.code || med.StockItem?.drugCode)) {
        medicines.push({
          medicineCode: med.ServiceCatalog?.code || med.StockItem?.drugCode || '',
          dispensedQty: med.quantity || 1,
          serviceDate: med.dispensedAt?.toISOString().split('T')[0] || datesOfService[0],
          prescription: `${med.dosage || ''} ${med.frequency || ''} x ${med.duration || ''}`.trim() || 'As prescribed'
        });
      }
    }

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<claims>\n';
    xml += `  <claim>\n`;
    xml += `    <claimid>${claim.claimNumber}</claimid>\n`;
    xml += `    <claimCheckCode>${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}</claimCheckCode>\n`;
    xml += `    <preAuthorizationCodes/>\n`;
    xml += `    <physicianID>${attendance?.createdById || '1234568'}</physicianID>\n`;
    xml += `    <principalGDRG>${claim.gdrgCodes?.[0] || 'OPDC06A'}</principalGDRG>\n`;
    
    xml += `    <memberInfo>\n`;
    xml += `      <memberNo>${attendance?.nhisCCC || patient.folderNumber || ''}</memberNo>\n`;
    xml += `      <surname>${escapeXml(patient.surname || '')}</surname>\n`;
    xml += `      <otherNames>${escapeXml(patient.otherNames || '')}</otherNames>\n`;
    xml += `      <dateOfBirth>${patient.dateOfBirth.toISOString().split('T')[0]}</dateOfBirth>\n`;
    xml += `      <gender>${patient.gender === 'male' ? 'M' : 'F'}</gender>\n`;
    xml += `      <hospitalRecNo>${patient.folderNumber || ''}</hospitalRecNo>\n`;
    xml += `      <isDependant>0</isDependant>\n`;
    xml += `    </memberInfo>\n`;
    
    xml += `    <serviceInfo>\n`;
    xml += `      <typeOfService>${typeOfService}</typeOfService>\n`;
    xml += `      <isUnbundled>0</isUnbundled>\n`;
    xml += `      <includesPharmacy>${medicines.length > 0 ? '1' : '0'}</includesPharmacy>\n`;
    xml += `      <typeOfAttendance>${typeOfAttendance}</typeOfAttendance>\n`;
    xml += `      <serviceOutcome>${serviceOutcome}</serviceOutcome>\n`;
    xml += `      <specialtiesAttended>\n`;
    xml += `        <mdcCode>${finalMdcCode}</mdcCode>\n`;
    xml += `      </specialtiesAttended>\n`;
    xml += `      <datesOfService>\n`;
    for (const date of datesOfService) {
      xml += `        <date>${date}</date>\n`;
    }
    xml += `      </datesOfService>\n`;
    xml += `    </serviceInfo>\n`;
    
    if (investigations.length > 0) {
      xml += `    <investigations>\n`;
      for (const inv of investigations) {
        xml += `      <entry>\n`;
        xml += `        <serviceDate>${inv.serviceDate}</serviceDate>\n`;
        xml += `        <gdrgCode>${inv.gdrgCode}</gdrgCode>\n`;
        xml += `      </entry>\n`;
      }
      xml += `    </investigations>\n`;
    }
    
    xml += `    <diagnoses>\n`;
    for (const diag of diagnoses) {
      xml += `      <entry>\n`;
      xml += `        <gdrgCode>${diag.gdrgCode}</gdrgCode>\n`;
      xml += `        <icd10>${diag.icd10}</icd10>\n`;
      xml += `        <diagnosis>${escapeXml(diag.diagnosis)}</diagnosis>\n`;
      xml += `      </entry>\n`;
    }
    xml += `    </diagnoses>\n`;
    
    if (medicines.length > 0) {
      xml += `    <medicines>\n`;
      for (const med of medicines) {
        xml += `      <entry>\n`;
        xml += `        <medicineCode>${med.medicineCode}</medicineCode>\n`;
        xml += `        <dispensedQty>${med.dispensedQty}</dispensedQty>\n`;
        xml += `        <serviceDate>${med.serviceDate}</serviceDate>\n`;
        xml += `        <prescription>\n`;
        xml += `          <unparsed>${escapeXml(med.prescription)}</unparsed>\n`;
        xml += `        </prescription>\n`;
        xml += `      </entry>\n`;
      }
      xml += `    </medicines>\n`;
    }
    
    xml += `  </claim>\n`;
    xml += `</claims>`;
    return xml;
  }
}