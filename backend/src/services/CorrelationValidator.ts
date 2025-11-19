import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class CorrelationValidator {
  static async validateAttendanceComplete(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        bill: true,
        diagnoses: true,
        servicesRendered: true
      }
    });
    
    if (!attendance) {
      return { isValid: false, errors: ['Attendance not found'] };
    }

    const errors = [];
    if (!attendance.bill) errors.push('Missing bill');
    if (!attendance.diagnoses.length) errors.push('No diagnoses recorded');
    if (!attendance.servicesRendered.length) errors.push('No services rendered');
    
    return { isValid: errors.length === 0, errors };
  }

  static async validateAdmissionData(admissionId: string) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        attendance: true,
        bed: true,
        ward: true,
        principalDiagnosis: true
      }
    });

    if (!admission) {
      return { isValid: false, errors: ['Admission not found'] };
    }

    const errors = [];
    if (!admission.attendance) errors.push('Missing attendance record');
    if (!admission.bed) errors.push('Missing bed assignment');
    if (!admission.ward) errors.push('Missing ward assignment');
    if (!admission.principalDiagnosis) errors.push('Missing principal diagnosis');
    
    return { isValid: errors.length === 0, errors };
  }

  static async validateInsuranceClaimReady(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        bill: true,
        diagnoses: { include: { diagnosis: true } },
        servicesRendered: { include: { serviceItem: true } }
      }
    });

    if (!attendance) {
      return { isValid: false, errors: ['Attendance not found'] };
    }

    const errors = [];
    if (!attendance.bill) errors.push('Missing bill');
    if (!attendance.diagnoses.find(d => d.primary)) errors.push('Missing primary diagnosis');
    
    for (const service of attendance.servicesRendered) {
      if (!service.serviceItem.nhisServiceCode) {
        errors.push(`Service ${service.serviceItem.name} missing NHIS code`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
}