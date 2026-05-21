// modules/admission/AdmissionService.ts
import { PrismaClient } from '@prisma/client';
import { AdmissionRepository } from './AdmissionRepository';
import { getCounterService } from '../../services/CounterService';

export class AdmissionService {
  private repository: AdmissionRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {  // ✅ Accept prisma
    this.prisma = prisma;
    this.repository = new AdmissionRepository(prisma);
  }

  async getAdmissions(where: any, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const { admissions, total } = await this.repository.findAll(where, skip, limit);

    const admissionsWithFullName = admissions.map((admission: any) => ({
      ...admission,
      patient: admission.Patient
        ? {
            ...admission.Patient,
            fullName: `${admission.Patient.surname} ${admission.Patient.otherNames || ''}`.trim(),
            age: this.calculateAge(admission.Patient.dateOfBirth),
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

  async getAdmissionById(id: string) {
    const admission = await this.repository.findById(id);

    if (!admission) {
      throw new Error('Admission not found');
    }

    const attendanceDiagnoses = admission.Attendance?.AttendanceDiagnosis || [];
    const primaryDiagnosis = attendanceDiagnoses.find((d: any) => d.diagnosisType === 'primary');
    const additionalDiagnoses = attendanceDiagnoses.filter(
      (d: any) => d.diagnosisType === 'additional'
    );
    const provisionalDiagnoses = attendanceDiagnoses.filter(
      (d: any) => d.diagnosisType === 'provisional'
    );

    return {
      ...admission,
      patient: admission.Patient
        ? {
            ...admission.Patient,
            fullName: `${admission.Patient.surname} ${admission.Patient.otherNames || ''}`.trim(),
            age: this.calculateAge(admission.Patient.dateOfBirth),
          }
        : null,
      primaryDiagnosis,
      additionalDiagnoses,
      provisionalDiagnoses,
    };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  async createAdmission(data: any, user: any) {
    const {
      patientId,
      wardId,
      bedId,
      attendanceId,
      primaryDiagnosisId,
      ...admissionData
    } = data;

    const bed = await this.repository.findBed(bedId);
    if (!bed) throw new Error('Bed not found');
    if (bed.isOccupied) throw new Error('Bed not available');
    if (bed.wardId !== wardId) throw new Error('Bed does not belong to specified ward');

    const existingAdmission = await this.repository.findActiveByPatientId(patientId);
    if (existingAdmission) {
      throw new Error('Patient already has an active admission');
    }

    let finalAttendanceId = attendanceId;

    if (!finalAttendanceId) {
      const counterService = getCounterService();
      const attendance = await this.repository.createAttendance({
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
      const attendance = await this.repository.findAttendance(finalAttendanceId);
      if (!attendance) throw new Error('Attendance record not found');
      if (attendance.patientId !== patientId) throw new Error('Attendance does not belong to patient');
      await this.repository.updateAttendance(finalAttendanceId, { status: 'admitted' });
    }

    // ✅ Use counter service for admission number
    const counterService = getCounterService();
    const admissionNumber = counterService.nextAdmissionNumber();

    const primaryDiagnosis = await this.repository.findDiagnosis(primaryDiagnosisId);
    if (!primaryDiagnosis) {
      throw new Error('Primary diagnosis not found');
    }

    await this.repository.createAttendanceDiagnosis({
      attendanceId: finalAttendanceId,
      diagnosisId: primaryDiagnosisId,
      diagnosisType: 'primary',
      icdCode: primaryDiagnosis.icdCode,
      createdById: user.id,
      presentOnAdmission: admissionData.presentOnAdmission || 'Y',
      date: new Date(),
    });

    const admission = await this.repository.create({
      admissionNumber,
      patientId,
      wardId,
      bedId,
      attendanceId: finalAttendanceId,
      admittingDoctor: admissionData.admittingDoctor,
      reasonForAdmission: admissionData.reasonForAdmission,
      diagnosis: primaryDiagnosis.name,
      admissionDate: admissionData.admissionDate ? new Date(admissionData.admissionDate) : new Date(),
      admissionTime: admissionData.admissionTime || new Date().toTimeString().slice(0, 5),
      status: 'admitted',
      admissionType: admissionData.admissionType || 'emergency',
      admissionSource: admissionData.admissionSource || 'home',
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.repository.updateBed(bedId, {
      isOccupied: true,
      currentPatientId: patientId,
    });

    await this.repository.updateWard(wardId, { occupiedBeds: { increment: 1 } });

    const createdAdmission = await this.repository.findById(admission.id);

    return {
      admission: createdAdmission,
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
      date: new Date(),
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

    if (diagnosisRecord.diagnosisType === 'primary') {
      throw new Error('Cannot remove primary diagnosis. Change primary diagnosis first.');
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

    // Find existing primary diagnosis record
    const existingPrimaryRecords = await this.repository.findExistingDiagnosis(
      admission.Attendance.id,
      admission.Attendance.AttendanceDiagnosis?.find((d: any) => d.diagnosisType === 'primary')?.diagnosisId || ''
    );

    if (existingPrimaryRecords && existingPrimaryRecords.id) {
      await this.repository.updateAttendanceDiagnosis(existingPrimaryRecords.id, {
        diagnosisType: 'additional',
      });
    }

    // Check if new diagnosis already exists
    const existingNewDiagnosis = await this.repository.findExistingDiagnosis(
      admission.Attendance.id,
      primaryDiagnosisId
    );

    if (existingNewDiagnosis) {
      await this.repository.updateAttendanceDiagnosis(existingNewDiagnosis.id, {
        diagnosisType: 'primary',
      });
    } else {
      await this.repository.createAttendanceDiagnosis({
        attendanceId: admission.Attendance.id,
        diagnosisId: primaryDiagnosisId,
        diagnosisType: 'primary',
        icdCode: newPrimaryDiagnosis.icdCode,
        presentOnAdmission: presentOnAdmission || 'Y',
        createdById: user?.id,
        date: new Date(),
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

    const { dischargeDate, dischargeTime, dischargeStatus, conditionAtDischarge } = data;

    // Update admission status
    await this.repository.update(id, {
      status: 'discharged',
      dischargeDate: dischargeDate ? new Date(dischargeDate) : new Date(),
      dischargeTime: dischargeTime || new Date().toTimeString().slice(0, 5),
      dischargeStatus: dischargeStatus || 'stable',
      updatedAt: new Date(),
    });

    // Update bed occupancy
    await this.repository.updateBed(admission.bedId, {
      isOccupied: false,
      currentPatientId: null,
    });

    // Update ward occupancy
    await this.repository.updateWard(admission.wardId, { occupiedBeds: { decrement: 1 } });

    // Update attendance status
    if (admission.attendanceId) {
      await this.repository.updateAttendance(admission.attendanceId, {
        status: 'discharged',
      });
    }

    return { message: 'Patient discharged successfully' };
  }

  // Add daily notes - using existing dailyNotes JSON field
  async addDailyNotes(id: string, data: any, user: any) {
    const { notes, noteType } = data;

    const admission = await this.repository.findById(id);
    if (!admission) {
      throw new Error('Admission not found');
    }

    // Get existing notes or initialize empty array
    const currentNotes = admission.dailyNotes || [];
    
    // Create new note
    const newNote = {
      id: Date.now().toString(),
      notes,
      noteType: noteType || 'general',
      createdBy: user?.fullName || user?.username || user?.id,
      createdAt: new Date().toISOString(),
    };

    // Add to existing notes
    const updatedNotes = [...currentNotes, newNote];

    // Update admission with new notes
    await this.repository.update(id, {
      dailyNotes: updatedNotes,
    });

    return { note: newNote };
  }
  // Get admission stats
  async getAdmissionStats() {
    return this.repository.getStats();
  }

  // Get admissions by patient ID with pagination
  async getAdmissionsByPatientId(patientId: string, page: number = 1, limit: number = 10) {
    const { admissions, total } = await this.repository.findByPatientId(patientId, page, limit);
    
    return {
      admissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
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

    // If updating bed, validate availability
    if (data.bedId && data.bedId !== admission.bedId) {
      const newBed = await this.repository.findBed(data.bedId);
      if (!newBed) throw new Error('New bed not found');
      if (newBed.isOccupied) throw new Error('New bed is not available');
      
      // Release old bed
      await this.repository.updateBed(admission.bedId, {
        isOccupied: false,
        currentPatientId: null,
      });
      
      // Occupy new bed
      await this.repository.updateBed(data.bedId, {
        isOccupied: true,
        currentPatientId: admission.patientId,
      });
    }

    const updatedAdmission = await this.repository.update(id, {
      ...data,
      updatedAt: new Date(),
    });

    return { admission: updatedAdmission };
  }
}