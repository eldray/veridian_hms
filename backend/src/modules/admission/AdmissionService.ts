// modules/admission/AdmissionService.ts
import { AdmissionRepository } from './AdmissionRepository';
import { NotificationService } from '../../services/NotificationService';

export class AdmissionService {
  private repository: AdmissionRepository;

  constructor() {
    this.repository = new AdmissionRepository();
  }

  // Get all admissions with filtering and pagination
  async getAdmissions(where: any, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const { admissions, total } = await this.repository.findAll(where, skip, limit);

    // Transform to include primary diagnosis and full name
    const admissionsWithFullName = admissions.map((admission: any) => ({
      ...admission,
      patient: admission.Patient
        ? {
            ...admission.Patient,
            fullName: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim(),
          }
        : null,
      primaryDiagnosis: admission.Attendance?.AttendanceDiagnosis[0]?.Diagnosis || null,
    }));

    return {
      admissions: admissionsWithFullName,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get admission by ID
  async getAdmissionById(id: string) {
    const admission = await this.repository.findById(id);

    if (!admission) {
      throw new Error('Admission not found');
    }

    // Separate diagnoses by type
    const attendanceDiagnoses = admission.Attendance?.AttendanceDiagnosis || [];
    const primaryDiagnosis = attendanceDiagnoses.find((d: any) => d.diagnosisType === 'primary');
    const additionalDiagnoses = attendanceDiagnoses.filter(
      (d: any) => d.diagnosisType === 'additional'
    );
    const provisionalDiagnoses = attendanceDiagnoses.filter(
      (d: any) => d.diagnosisType === 'provisional'
    );

    // Transform response
    const admissionWithFullName = {
      ...admission,
      patient: admission.Patient
        ? {
            ...admission.Patient,
            fullName: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim(),
          }
        : null,
      primaryDiagnosis,
      additionalDiagnoses,
      provisionalDiagnoses,
      Attendance: admission.Attendance
        ? {
            ...admission.Attendance,
            AttendanceDiagnosis: undefined,
          }
        : null,
    };

    return admissionWithFullName;
  }

  // Create admission
  async createAdmission(data: any, user: any) {
    const {
      patientId,
      wardId,
      bedId,
      attendanceId,
      primaryDiagnosisId,
      ...admissionData
    } = data;

    // Validate bed availability
    const bed = await this.repository.findBed(bedId);
    if (!bed) throw new Error('Bed not found');
    if (bed.isOccupied) throw new Error('Bed not available');
    if (bed.wardId !== wardId) throw new Error('Bed does not belong to specified ward');

    // Check if patient already has active admission
    const existingAdmission = await this.repository.findActiveByPatientId(patientId);
    if (existingAdmission) {
      throw new Error('Patient already has an active admission');
    }

    // Handle attendance: either use existing or create new
    let finalAttendanceId = attendanceId;

    if (!finalAttendanceId) {
      // Create a new attendance record for this admission
      const attendance = await this.repository.createAttendance({
        attendanceNumber: `ATT-${Date.now()}`,
        patientId,
        attendanceType: 'general_consultation',
        dateTime: new Date(),
        paymentMode: admissionData.paymentMode || 'nhis',
        status: 'admitted',
        encounterCategory: 'ipd',
        visitCategory: 'inpatient',
        serviceCategory: 'ipd',
        complaints: admissionData.reasonForAdmission,
        createdById: user.id,
      });
      finalAttendanceId = attendance.id;
    } else {
      // Validate existing attendance
      const attendance = await this.repository.findAttendance(finalAttendanceId);

      if (!attendance) throw new Error('Attendance record not found');
      if (attendance.patientId !== patientId)
        throw new Error('Attendance does not belong to patient');

      // Update attendance status to 'admitted'
      await this.repository.updateAttendance(finalAttendanceId, { status: 'admitted' });
    }

    // Generate admission number
    const admissionCount = await this.repository.countForCurrentMonth();
    const admissionNumber = `ADM-${String(admissionCount + 1).padStart(6, '0')}`;

    // Get primary diagnosis info
    const primaryDiagnosis = await this.repository.findDiagnosis(primaryDiagnosisId);
    if (!primaryDiagnosis) {
      throw new Error('Primary diagnosis not found');
    }

    // We need to use a transaction for the remaining operations
    // Since we've already made some calls, we'll need to refactor slightly
    // For now, let's assume the repository handles transactions internally
    // or we pass the transaction context

    // Create primary diagnosis record in AttendanceDiagnosis
    await this.repository.createAttendanceDiagnosis({
      attendanceId: finalAttendanceId,
      diagnosisId: primaryDiagnosisId,
      diagnosisType: 'primary',
      icdCode: primaryDiagnosis.icdCode,
      createdById: user.id,
      presentOnAdmission: admissionData.presentOnAdmission || 'Y',
    });

    // Create admission
    const admission = await this.repository.create({
      admissionNumber,
      patientId,
      wardId,
      bedId,
      attendanceId: finalAttendanceId,
      admittingDoctor: admissionData.admittingDoctor,
      reasonForAdmission: admissionData.reasonForAdmission,
      diagnosis: primaryDiagnosis.name,
      admissionDate: admissionData.admissionDate
        ? new Date(admissionData.admissionDate)
        : new Date(),
      admissionTime: admissionData.admissionTime || new Date().toTimeString().slice(0, 5),
      status: 'admitted',
      admissionType: admissionData.admissionType || 'emergency',
      admissionSource: admissionData.admissionSource || 'home',
      createdBy: user.id,
    });

    // Update bed occupancy
    await this.repository.updateBed(bedId, {
      isOccupied: true,
      currentPatientId: patientId,
    });

    // Update ward occupancy
    await this.repository.updateWard(wardId, {
      occupiedBeds: { increment: 1 },
    });

    // Transform response
    const resultWithFullName = {
      ...admission,
      patient: admission.Patient
        ? {
            ...admission.Patient,
            fullName: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim(),
          }
        : null,
      primaryDiagnosis: admission.Attendance?.AttendanceDiagnosis[0]?.Diagnosis || null,
    };

    // Send notifications
    await NotificationService.sendAdmissionNotifications(admission.id);

    return {
      admission: resultWithFullName,
      relationship: attendanceId ? 'Extended from attendance' : 'New attendance created',
    };
  }

  // Add secondary diagnosis
  async addSecondaryDiagnosis(id: string, data: any, user: any) {
    const { diagnosisId, diagnosisType, notes, presentOnAdmission } = data;

    const admission = await this.repository.findByIdWithAttendance(id);
    if (!admission) {
      throw new Error('Admission not found');
    }

    if (!admission.Attendance) {
      throw new Error('Admission has no associated attendance');
    }

    const diagnosis = await this.repository.findDiagnosis(diagnosisId);
    if (!diagnosis) {
      throw new Error('Diagnosis not found');
    }

    // Check if diagnosis already exists for this attendance
    const existing = await this.repository.findExistingDiagnosis(
      admission.Attendance.id,
      diagnosisId
    );
    if (existing) {
      throw new Error('Diagnosis already added to this admission');
    }

    const attendanceDiagnosis = await this.repository.createAttendanceDiagnosis({
      attendanceId: admission.Attendance.id,
      diagnosisId,
      diagnosisType,
      notes,
      icdCode: diagnosis.icdCode,
      presentOnAdmission: presentOnAdmission || 'Y',
      createdById: user?.id,
    });

    return { diagnosis: attendanceDiagnosis };
  }

  // Remove diagnosis
  async removeDiagnosis(id: string, diagnosisRecordId: string) {
    const admission = await this.repository.findByIdWithAttendance(id);
    if (!admission) {
      throw new Error('Admission not found');
    }

    const diagnosisRecord = await this.repository.findExistingDiagnosis(
      admission.Attendance!.id,
      diagnosisRecordId
    );
    if (!diagnosisRecord) {
      throw new Error('Diagnosis record not found for this admission');
    }

    await this.repository.deleteAttendanceDiagnosis(diagnosisRecord.id);
    return { message: 'Diagnosis removed successfully' };
  }

  // Update primary diagnosis
  async updatePrimaryDiagnosis(id: string, data: any, user: any) {
    const { primaryDiagnosisId, presentOnAdmission } = data;

    const admission = await this.repository.findByIdWithAttendance(id);
    if (!admission) {
      throw new Error('Admission not found');
    }

    if (!admission.Attendance) {
      throw new Error('Admission has no associated attendance');
    }

    const newPrimaryDiagnosis = await this.repository.findDiagnosis(primaryDiagnosisId);
    if (!newPrimaryDiagnosis) {
      throw new Error('New primary diagnosis not found');
    }

    // Find existing primary diagnosis
    const existingPrimary = await this.repository.findExistingDiagnosis(
      admission.Attendance.id,
      admission.Attendance.AttendanceDiagnosis?.find((d: any) => d.diagnosisType === 'primary')
        ?.diagnosisId
    );

    if (existingPrimary) {
      // Change existing primary to additional
      await this.repository.updateAttendanceDiagnosis(existingPrimary.id, {
        diagnosisType: 'additional',
      });
    }

    // Check if new diagnosis already exists
    const existingNewDiagnosis = await this.repository.findExistingDiagnosis(
      admission.Attendance.id,
      primaryDiagnosisId
    );

    if (existingNewDiagnosis) {
      // Change it to primary
      await this.repository.updateAttendanceDiagnosis(existingNewDiagnosis.id, {
        diagnosisType: 'primary',
      });
    } else {
      // Create new primary diagnosis
      await this.repository.createAttendanceDiagnosis({
        attendanceId: admission.Attendance.id,
        diagnosisId: primaryDiagnosisId,
        diagnosisType: 'primary',
        icdCode: newPrimaryDiagnosis.icdCode,
        presentOnAdmission: presentOnAdmission || 'Y',
        createdById: user?.id,
      });
    }

    // Update admission diagnosis field
    await this.repository.update(id, {
      diagnosis: newPrimaryDiagnosis.name,
    });

    return { message: 'Primary diagnosis updated successfully' };
  }

  // Discharge patient
  async dischargePatient(id: string, data: any, user: any) {
    const admission = await this.repository.findById(id);
    if (!admission) {
      throw new Error('Admission not found');
    }

    if (admission.status === 'discharged') {
      throw new Error('Patient already discharged');
    }

    const { dischargeDate, dischargeTime, dischargeStatus, dischargeNotes, conditionAtDischarge } =
      data;

    // Update admission status
    await this.repository.update(id, {
      status: 'discharged',
      dischargeDate: dischargeDate ? new Date(dischargeDate) : new Date(),
      dischargeTime: dischargeTime || new Date().toTimeString().slice(0, 5),
      dischargeStatus: dischargeStatus || 'stable',
      dischargeNotes,
      conditionAtDischarge,
      dischargedBy: user.id,
    });

    // Update bed occupancy
    await this.repository.updateBed(admission.bedId, {
      isOccupied: false,
      currentPatientId: null,
    });

    // Update ward occupancy
    await this.repository.updateWard(admission.wardId, {
      occupiedBeds: { decrement: 1 },
    });

    // Update attendance status
    if (admission.Attendance) {
      await this.repository.updateAttendance(admission.Attendance.id, {
        status: 'discharged',
      });
    }

    // Send notifications
    await NotificationService.sendDischargeNotifications(id);

    return { message: 'Patient discharged successfully' };
  }

  // Add daily notes
  async addDailyNotes(id: string, data: any, user: any) {
    const { notes, noteType } = data;

    const admission = await this.repository.findById(id);
    if (!admission) {
      throw new Error('Admission not found');
    }

    const dailyNote = await this.repository.createDailyNote({
      admissionId: id,
      notes,
      noteType: noteType || 'general',
      createdById: user.id,
    });

    return { note: dailyNote };
  }

  // Get admission stats
  async getAdmissionStats() {
    return this.repository.getStats();
  }

  // Get admissions by patient ID
  async getAdmissionsByPatientId(patientId: string) {
    return this.repository.findByPatientId(patientId);
  }

  // Delete admission
  async deleteAdmission(id: string) {
    const admission = await this.repository.findById(id);
    if (!admission) {
      throw new Error('Admission not found');
    }

    if (admission.status === 'admitted') {
      throw new Error('Cannot delete an active admission. Discharge patient first.');
    }

    await this.repository.delete(id);
    return { message: 'Admission deleted successfully' };
  }

  // Update admission
  async updateAdmission(id: string, data: any, user: any) {
    const admission = await this.repository.findById(id);
    if (!admission) {
      throw new Error('Admission not found');
    }

    const updatedAdmission = await this.repository.update(id, {
      ...data,
      updatedBy: user.id,
      updatedAt: new Date(),
    });

    return { admission: updatedAdmission };
  }
}
