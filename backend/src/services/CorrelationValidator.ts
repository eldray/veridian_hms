// services/CorrelationValidator.ts - UPDATED
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class CorrelationValidator {
  static async validateAttendanceComplete(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Bill: true,
        AttendanceDiagnosis: {  // ✅ UPDATED: Correct relation name
          include: { Diagnosis: true }
        },
        ServiceRendered: {  // ✅ UPDATED: Correct relation name
          include: { ServiceCatalog: true }
        }
      }
    });
    
    if (!attendance) return { isValid: false, errors: ['Attendance not found'] };

    const errors = [];
    if (!attendance.Bill) errors.push('Missing bill');
    if (!attendance.AttendanceDiagnosis.length) errors.push('No diagnoses recorded');
    if (!attendance.ServiceRendered.length) errors.push('No services rendered');
    
    return { isValid: errors.length === 0, errors };
  }

  static async validateAdmissionData(admissionId: string) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        Attendance: true,
        Bed: true,
        Ward: true,
        Diagnosis: true  // ✅ UPDATED: Use Diagnosis (principal diagnosis relation)
      }
    });

    if (!admission) return { isValid: false, errors: ['Admission not found'] };

    const errors = [];
    if (!admission.Attendance) errors.push('Missing attendance record');
    if (!admission.Bed) errors.push('Missing bed assignment');
    if (!admission.Ward) errors.push('Missing ward assignment');
    if (!admission.Diagnosis) errors.push('Missing principal diagnosis');
    
    return { isValid: errors.length === 0, errors };
  }

  static async validateInsuranceClaimReady(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Bill: true,
        AttendanceDiagnosis: {  // ✅ UPDATED: Correct relation name
          include: { Diagnosis: true }
        },
        ServiceRendered: {  // ✅ UPDATED: Correct relation name
          include: { ServiceCatalog: true }
        },
        InsuranceProvider: true
      }
    });

    if (!attendance) return { isValid: false, errors: ['Attendance not found'] };

    const errors = [];
    if (!attendance.Bill) errors.push('Missing bill');
    
    const hasPrimaryDiagnosis = attendance.AttendanceDiagnosis.some(d => d.primary);
    if (!hasPrimaryDiagnosis) errors.push('Missing primary diagnosis');
    
    for (const service of attendance.ServiceRendered) {
      if (!service.ServiceCatalog.nhisServiceCode) {
        errors.push(`Service ${service.ServiceCatalog.name} missing NHIS code`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static async validateBillingComplete(billId: string) {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        BillLineItem: {  // ✅ UPDATED: Use normalised line items
          where: { isVoided: false }
        },
        Payment: true
      }
    });

    if (!bill) return { isValid: false, errors: ['Bill not found'] };

    const errors = [];
    if (!bill.BillLineItem.length) errors.push('No bill line items found');
    
    const totalFromItems = bill.BillLineItem.reduce((sum, item) => sum + item.lineTotal, 0);
    if (Math.abs(totalFromItems - bill.totalAmount) > 0.01) {
      errors.push(`Bill total mismatch: ${bill.totalAmount} vs line items ${totalFromItems}`);
    }
    
    const totalPaid = bill.Payment.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - bill.paidAmount) > 0.01) {
      errors.push(`Payment total mismatch: ${bill.paidAmount} vs payments ${totalPaid}`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
}