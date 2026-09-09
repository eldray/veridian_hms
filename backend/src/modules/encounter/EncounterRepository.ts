import { PrismaClient, Attendance, Admission } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { 
  CreateEncounterDTO, UpdateEncounterDTO, EncounterFilters, 
  AddDiagnosisDTO, AddVitalsDTO, AddPrescriptionDTO, AddLabTestDTO 
} from './EncounterTypes';
import { getCounterService } from '../../services/CounterService';

// ✅ FIXED: Extends BaseRepository for enterprise consistency
export class EncounterRepository extends BaseRepository<Attendance, CreateEncounterDTO, UpdateEncounterDTO> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'attendance');
  }

  // ============================================
  // CORE ENCOUNTER OPERATIONS
  // ============================================
  
  async create(data: CreateEncounterDTO, userId: string) {
    const counterService = getCounterService(); 
    return this.getModel().create({
      data: {
        attendanceNumber: counterService.nextAttendanceNumber(),
        patientId: data.patientId,
        attendanceType: data.attendanceType,
        paymentMode: data.paymentMode,
        nhisCCC: data.nhisCCC,
        insuranceProviderId: data.insuranceProviderId,
        
        // ✅ FIXED: Use complaint field directly (not complaints)
        complaints: data.complaint || '', 
        medicalNotes: data.medicalNotes || '', // Keep this separate
        
        status: 'pending',
        createdById: userId,
        dateTime: new Date(), 
      },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true } }
      }
    });
  }

  async findById(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true } },
        AttendanceDiagnosis: { include: { Diagnosis: true }, orderBy: { date: 'desc' } },
        Vitals: { orderBy: { recordedAt: 'desc' }, take: 5 },
        Medication: { include: { StockItem: { select: { id: true, name: true, currentStock: true, unitOfMeasure: true } }, User_Medication_prescribedByIdToUser: { select: { fullName: true } } } },
        LabTest: { include: { LabTestTemplate: true, User_LabTest_performedByIdToUser: { select: { fullName: true } } }, orderBy: { requestedAt: 'desc' } },
        Procedure: { include: { ProcedureTemplate: true } },
        Scan: { include: { ScanTemplate: true } },
        referral: { select: { id: true, referralNumber: true, referralType: true, referralReason: true, status: true } },
        ServiceRendered: { include: { ServiceCatalog: { include: { pricing: true } } } }
      }
    });
  }

  async findManyEncounters(filters: EncounterFilters) {
    const { patientId, attendanceType, status, paymentMode, dateFrom, dateTo, page = 1, limit = 1000 } = filters;
    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (attendanceType) where.attendanceType = attendanceType;
    if (status) where.status = status;
    if (paymentMode) where.paymentMode = paymentMode;
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = dateFrom;
      if (dateTo) where.dateTime.lte = dateTo;
    }

    // ✅ Uses BaseRepository pagination helper
    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { dateTime: 'desc' },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true, contact: true } },
        AttendanceDiagnosis: { include: { Diagnosis: true }, orderBy: { date: 'desc' } },
        Vitals: { orderBy: { recordedAt: 'desc' }, take: 5 },
        Medication: { include: { StockItem: { select: { id: true, name: true, currentStock: true } } } },
        LabTest: { include: { LabTestTemplate: true }, orderBy: { requestedAt: 'desc' } },
        Procedure: { include: { ProcedureTemplate: true } },
        Scan: { include: { ScanTemplate: true } },
        referral: { select: { id: true, referralNumber: true, referralType: true, status: true } }
      }
    });
  }

  async updateEncounter(id: string, data: UpdateEncounterDTO) {
    return this.getModel().update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } } }
    });
  }

  async updateStatus(id: string, status: string) {
    return this.getModel().update({ where: { id }, data: { status: status as any } });
  }

  // ============================================
  // CLINICAL SUB-RESOURCES (Diagnoses, Vitals, etc.)
  // ============================================

  async addDiagnosis(encounterId: string, data: AddDiagnosisDTO, userId: string) {
    if (data.diagnosisType === 'primary') {
      await this.prisma.attendanceDiagnosis.updateMany({
        where: { attendanceId: encounterId, diagnosisType: 'primary' },
        data: { diagnosisType: 'additional' }
      });
    }
    const existing = await this.prisma.attendanceDiagnosis.findFirst({ where: { attendanceId: encounterId, diagnosisId: data.diagnosisId } });
    if (existing) throw new Error('Diagnosis already added to this encounter');

    const diagnosis = await this.prisma.diagnosis.findUnique({ where: { id: data.diagnosisId } });
    return this.prisma.attendanceDiagnosis.create({
      data: { attendanceId: encounterId, diagnosisId: data.diagnosisId, diagnosisType: data.diagnosisType, notes: data.notes, createdById: userId, icdCode: diagnosis?.icdCode || '' },
      include: { Diagnosis: true }
    });
  }

  async removeDiagnosis(encounterId: string, diagnosisId: string) {
    return this.prisma.attendanceDiagnosis.deleteMany({ where: { attendanceId: encounterId, diagnosisId } });
  }

  async addVitals(encounterId: string, data: AddVitalsDTO, userId: string) {
    const attendance = await this.getModel().findUnique({ where: { id: encounterId }, select: { patientId: true } });
    if (!attendance) throw new Error('Encounter not found');
    return this.prisma.vitals.create({
      data: { attendanceId: encounterId, patientId: attendance.patientId, ...data, recordedById: userId, recordedAt: new Date() },
      include: { User: { select: { fullName: true } } }
    });
  }

  async updateVitals(vitalsId: string, data: any) {
    return this.prisma.vitals.update({ where: { id: vitalsId }, data });
  }

  async deleteVitals(vitalsId: string) {
    return this.prisma.vitals.delete({ where: { id: vitalsId } });
  }

  async addPrescription(encounterId: string, data: AddPrescriptionDTO, userId: string) {
    const stockItem = await this.prisma.stockItem.findUnique({ where: { id: data.stockItemId } });
    if (!stockItem) throw new Error('Stock item not found');
    return this.prisma.medication.create({
      data: { attendanceId: encounterId, stockItemId: data.stockItemId, serviceCatalogId: data.serviceCatalogId, name: stockItem.name, dosage: data.dosage, frequency: data.frequency, duration: data.duration, route: data.route, instructions: data.instructions, quantity: data.quantity || 1, status: 'prescribed', prescribedById: userId, prescribedAt: new Date() },
      include: { StockItem: { select: { id: true, name: true, currentStock: true, unitOfMeasure: true } } }
    });
  }

  // ✅ PRODUCTION FIX: Dispensing must deduct stock safely using a transaction
  async dispenseMedication(encounterId: string, medicationId: string, quantity: number, userId: string, batchNumber?: string, expiryDate?: Date) {
    return this.prisma.$transaction(async (tx) => {
      const med = await tx.medication.findUnique({ where: { id: medicationId }, include: { StockItem: true } });
      if (!med) throw new Error('Medication not found');
      if (med.stockItemId && med.StockItem && med.StockItem.currentStock < quantity) throw new Error('Insufficient stock');

      // Update medication status
      const updatedMed = await tx.medication.update({
        where: { id: medicationId },
        data: { status: 'dispensed', dispensedAt: new Date(), dispensedById: userId, dispensedBatchNumber: batchNumber, dispensedExpiryDate: expiryDate, quantity }
      });

      // Deduct stock safely
      if (med.stockItemId && med.StockItem) {
        await tx.stockItem.update({
          where: { id: med.stockItemId },
          data: { currentStock: { decrement: quantity } }
        });
        // Log transaction
        await tx.stockTransaction.create({
          data: { stockItemId: med.stockItemId, transactionType: 'sale', quantity: -quantity, balanceAfter: med.StockItem.currentStock - quantity, performedBy: userId, reference: medicationId }
        });
      }
      return updatedMed;
    });
  }

  // Generic medication update: handles dispensing (atomic stock deduction, guarded
  // against double-deduction) and administration recording in one place.
  async updateMedication(encounterId: string, medicationId: string, data: any, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const med = await tx.medication.findUnique({ where: { id: medicationId }, include: { StockItem: true } });
      if (!med) throw new Error('Medication not found');

      const updateData: any = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.administeredDoses !== undefined) updateData.administeredDoses = data.administeredDoses;

      const isDispensing = data.status === 'dispensed' && med.status !== 'dispensed';
      const isAdministering = data.status === 'administered';

      if (isDispensing) {
        const qty = data.quantity ?? med.quantity ?? 1;
        if (med.stockItemId) {
          if (!med.StockItem || med.StockItem.currentStock < qty) {
            throw new Error(`Insufficient stock. Available: ${med.StockItem?.currentStock || 0}`);
          }
          await tx.stockItem.update({ where: { id: med.stockItemId }, data: { currentStock: { decrement: qty } } });
          await tx.stockTransaction.create({
            data: { stockItemId: med.stockItemId, transactionType: 'sale', quantity: -qty, balanceAfter: med.StockItem.currentStock - qty, performedBy: userId, reference: medicationId }
          });
        }
        updateData.quantity = qty;
        updateData.dispensedAt = data.dispensedAt ? new Date(data.dispensedAt) : new Date();
        updateData.dispensedById = data.dispensedById || userId;
        if (data.batchNumber !== undefined) updateData.dispensedBatchNumber = data.batchNumber;
        updateData.dispensedUnitCost = data.dispensedUnitCost ?? med.StockItem?.costPrice ?? null;
      } else if (data.quantity !== undefined) {
        updateData.quantity = data.quantity;
      }

      if (isAdministering) {
        updateData.administeredAt = data.administeredAt ? new Date(data.administeredAt) : new Date();
        updateData.administeredById = data.administeredById || userId;
      }

      return tx.medication.update({
        where: { id: medicationId },
        data: updateData,
        include: { StockItem: { select: { id: true, name: true, currentStock: true, unitOfMeasure: true } } }
      });
    });
  }

  async removeMedication(encounterId: string, medicationId: string) {
    // Soft delete is safer for medical records
    return this.prisma.medication.update({ where: { id: medicationId }, data: { status: 'cancelled' } });
  }

  async addLabTest(encounterId: string, data: AddLabTestDTO, userId: string) {
    return this.prisma.labTest.create({
      data: { attendanceId: encounterId, templateId: data.templateId, serviceCatalogId: data.serviceCatalogId, status: 'requested', priority: data.priority || 'routine', requestedAt: new Date(), createdById: userId, notes: data.notes },
      include: { LabTestTemplate: true, ServiceCatalog: { select: { id: true, name: true, code: true } } }
    });
  }

  async updateLabTestStatus(labOrderId: string, status: string, data: any, userId?: string) {
    const updateData: any = { status, ...data };
    if (status === 'completed') updateData.completedAt = new Date();
    if (userId && status === 'in_progress') updateData.performedById = userId;
    return this.prisma.labTest.update({ where: { id: labOrderId }, data: updateData });
  }

  async removeLabTest(encounterId: string, labOrderId: string) {
    return this.prisma.labTest.update({ where: { id: labOrderId }, data: { status: 'cancelled' } });
  }

  async addScan(encounterId: string, data: any, userId: string) {
    const template = await this.prisma.scanTemplate.findUnique({ where: { id: data.templateId } });
    if (!template) throw new Error('Scan template not found');
    return this.prisma.scan.create({
      data: { attendanceId: encounterId, templateId: template.id, serviceCatalogId: data.serviceCatalogId, scanType: template.scanType || template.name, description: template.description, bodyPart: data.bodyPart, status: 'requested', priority: data.priority || 'routine', requestedAt: new Date(), createdById: userId },
      include: { ScanTemplate: true }
    });
  }

  async updateScanStatus(scanId: string, status: string, data: any) {
    const updateData: any = { status, ...data };
    if (status === 'completed') updateData.completedAt = new Date();
    return this.prisma.scan.update({ where: { id: scanId }, data: updateData });
  }

  async removeScan(encounterId: string, scanId: string) {
    return this.prisma.scan.update({ where: { id: scanId }, data: { status: 'cancelled' } });
  }

  async addProcedure(encounterId: string, data: any, userId: string) {
    const template = await this.prisma.procedureTemplate.findUnique({ where: { id: data.templateId } });
    if (!template) throw new Error('Procedure template not found');
    return this.prisma.procedure.create({
      data: { attendanceId: encounterId, templateId: template.id, serviceCatalogId: data.serviceCatalogId, status: 'scheduled', scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null, notes: data.notes, duration: data.duration, createdById: userId },
      include: { ProcedureTemplate: true }
    });
  }

  async updateProcedureStatus(procedureId: string, status: string, data: any) {
    const updateData: any = { status, ...data };
    if (status === 'completed') updateData.performedAt = new Date();
    return this.prisma.procedure.update({ where: { id: procedureId }, data: updateData });
  }

  async removeProcedure(encounterId: string, procedureId: string) {
    return this.prisma.procedure.update({ where: { id: procedureId }, data: { status: 'cancelled' } });
  }

  async addService(encounterId: string, data: any, userId: string) {
    return this.prisma.serviceRendered.create({
      data: { attendanceId: encounterId, serviceItemId: data.serviceCatalogId, quantity: data.quantity || 1, date: new Date(), performedById: userId, notes: data.notes }
    });
  }

  async removeService(encounterId: string, serviceRenderedId: string) {
    return this.prisma.serviceRendered.delete({ where: { id: serviceRenderedId } });
  }

  // ============================================
  // ADMISSION & DISCHARGE (IPD/DAYCASE)
  // ============================================

  async createFormalAdmission(data: any, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const admission = await tx.admission.create({
        data: { attendanceId: data.attendanceId, admissionNumber: getCounterService().nextAdmissionNumber(), admissionType: data.admissionType || 'emergency', admissionSource: data.admissionSource || 'opd' }
      });
      await tx.attendance.update({ where: { id: data.attendanceId }, data: { status: 'admitted', bedId: data.bedId, wardId: data.wardId } });
      return admission;
    });
  }

  async getAllAdmissions(filters: any) {
    const where: any = {};
    if (filters.status) where.dischargeStatus = null; // Active admissions
    if (filters.wardId) { /* Requires joining attendance */ }
    
    return this.prisma.admission.findMany({
      where, include: { attendance: { include: { Patient: true, Bed: { include: { Ward: true } } } } },
      orderBy: { admissionDate: 'desc' }
    });
  }

  async addDailyNotes(admissionId: string, data: any, userId: string) {
    const admission = await this.prisma.admission.findUnique({ where: { id: admissionId } });
    if (!admission) throw new Error('Admission not found');
    
    const notes = admission.dailyNotes as any[] || [];
    notes.push({ ...data, recordedBy: userId, recordedAt: new Date() });
    
    return this.prisma.admission.update({ where: { id: admissionId }, data: { dailyNotes: notes } });
  }

  async dischargeFromEncounter(encounterId: string, data: any, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.attendance.findUnique({ where: { id: encounterId }, include: { Admission: true } });
      if (!encounter) throw new Error('Encounter not found');

      await tx.attendance.update({ where: { id: encounterId }, data: { status: 'discharged' } });
      
      if (encounter.Admission) {
        await tx.admission.update({
          where: { id: encounter.Admission.id },
          data: { dischargeDate: new Date(), dischargeStatus: data.dischargeStatus || 'home' }
        });
      }
      return { message: 'Patient discharged successfully', dischargeDate: new Date() };
    });
  }

  async getBedOccupancy() {
    const beds = await this.prisma.bed.findMany({ include: { Ward: true } });
    const activeAttendances = await this.getModel().findMany({ where: { status: 'admitted', bedId: { not: null } }, include: { Patient: true, Bed: { include: { Ward: true } } } });
    
    return {
      data: activeAttendances.map(a => ({ bed: a.Bed?.bedNumber, ward: a.Bed?.Ward?.wardName, patient: `${a.Patient.surname} ${a.Patient.otherNames}` })),
      summary: { totalBeds: beds.length, occupied: activeAttendances.length, available: beds.length - activeAttendances.length }
    };
  }

  async getEncounterStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = dateFrom;
      if (dateTo) where.dateTime.lte = dateTo;
    }
    return this.getModel().groupBy({ by: ['attendanceType', 'status'], where, _count: { id: true } });
  }

  // ============================================
  // WORKLISTS (Your brilliant logic, preserved exactly)
  // ============================================

  async getVitalsWorklist(): Promise<any> {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activeAttendances = await this.getModel().findMany({
      where: { status: { in: ['pending', 'admitted'] }, encounterCategory: { in: ['opd', 'ipd', 'daycase'] } },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true }}, Bed: { include: { Ward: true }}, Vitals: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      orderBy: { dateTime: 'asc' }
    });

    const processedItems = activeAttendances.map(attendance => {
      const lastVitals = attendance.Vitals?.[0];
      const hasVitalsToday = lastVitals ? new Date(lastVitals.recordedAt).toDateString() === today.toDateString() : false;
      const waitTime = hasVitalsToday ? 0 : Math.floor((Date.now() - new Date(attendance.dateTime).getTime()) / 60000);
      let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      if (!hasVitalsToday) { const waitHours = waitTime / 60; if (waitHours > 48) priority = 'stat'; else if (waitHours > 24) priority = 'urgent'; }

      return {
        id: attendance.id, patientId: attendance.patientId, attendanceId: attendance.id,
        patient: { name: `${attendance.Patient.surname} ${attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(attendance.Patient.dateOfBirth), gender: attendance.Patient.gender, folderNumber: attendance.Patient.folderNumber },
        location: attendance.Bed ? { ward: attendance.Bed.Ward?.wardName, bed: attendance.Bed.bedNumber } : undefined,
        hasVitalsToday, lastVitals: lastVitals ? { bloodPressure: lastVitals.bloodPressure, temperature: lastVitals.temperature, pulse: lastVitals.pulse, respiration: lastVitals.respiration, spo2: lastVitals.spo2, recordedAt: lastVitals.recordedAt } : null,
        waitTime, priority, status: hasVitalsToday ? 'vitals_done' : 'pending_vitals', encounterCategory: attendance.encounterCategory
      };
    });
    return { total: processedItems.length, pending: processedItems.filter(i => !i.hasVitalsToday).length, recent: processedItems.filter(i => i.hasVitalsToday).length, data: processedItems };
  }

  async getMedicalWorklist(): Promise<any> {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activeAttendances = await this.getModel().findMany({
      where: { status: { in: ['pending', 'admitted'] }, encounterCategory: { in: ['opd', 'ipd', 'daycase'] } },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } }, Bed: { include: { Ward: true } }, Vitals: { where: { recordedAt: { gte: today } }, orderBy: { recordedAt: 'desc' }, take: 1 }, AttendanceDiagnosis: { take: 1 } },
      orderBy: { dateTime: 'asc' }
    });

    const processedItems = activeAttendances.map(attendance => {
      const hasVitalsToday = (attendance.Vitals?.length || 0) > 0;
      const hasMedicalNotesToday = attendance.medicalNotes !== null && attendance.medicalNotes !== '';
      const hasDiagnosis = (attendance.AttendanceDiagnosis?.length || 0) > 0;
      const isPending = hasVitalsToday && !hasMedicalNotesToday && !hasDiagnosis;
      const waitTime = isPending ? Math.floor((Date.now() - new Date(attendance.dateTime).getTime()) / 60000) : 0;
      let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      const waitHours = waitTime / 60;
      if (waitHours > 48) priority = 'stat'; else if (waitHours > 24) priority = 'urgent';

      return {
        id: attendance.id, patientId: attendance.patientId, attendanceId: attendance.id,
        patient: { name: `${attendance.Patient.surname} ${attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(attendance.Patient.dateOfBirth), gender: attendance.Patient.gender, folderNumber: attendance.Patient.folderNumber },
        location: attendance.Bed ? { ward: attendance.Bed.Ward?.wardName, bed: attendance.Bed.bedNumber } : undefined,
        hasMedicalNotesToday, vitals: attendance.Vitals?.[0], hasDiagnosis, waitTime, priority,
        status: isPending ? 'pending_doctor' : (hasMedicalNotesToday ? 'reviewed' : 'pending_vitals_first'), encounterCategory: attendance.encounterCategory
      };
    });
    return { total: processedItems.length, pending: processedItems.filter(i => i.status === 'pending_doctor').length, reviewed: processedItems.filter(i => i.hasMedicalNotesToday).length, data: processedItems };
  }

  async getLabWorklist(): Promise<any> {
    const allLabTests = await this.prisma.labTest.findMany({
      where: { status: { in: ['requested', 'in_progress', 'completed'] } },
      include: { Attendance: { include: { Patient: true, Bed: { include: { Ward: true } } } }, LabTestTemplate: true }, orderBy: { requestedAt: 'asc' }
    });
    const groupedByAttendance = new Map();
    for (const test of allLabTests) {
      const attendanceId = test.attendanceId;
      if (!groupedByAttendance.has(attendanceId)) {
        groupedByAttendance.set(attendanceId, { attendanceId, patientId: test.Attendance.patientId, patient: { name: `${test.Attendance.Patient.surname} ${test.Attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(test.Attendance.Patient.dateOfBirth), gender: test.Attendance.Patient.gender, folderNumber: test.Attendance.Patient.folderNumber }, location: test.Attendance.Bed ? { ward: test.Attendance.Bed.Ward?.wardName, bed: test.Attendance.Bed.bedNumber } : undefined, tests: [], requestedCount: 0, inProgressCount: 0, completedCount: 0, oldestRequestedAt: test.requestedAt });
      }
      const group = groupedByAttendance.get(attendanceId); group.tests.push(test);
      if (test.status === 'requested') group.requestedCount++; else if (test.status === 'in_progress') group.inProgressCount++; else if (test.status === 'completed') group.completedCount++;
      if (new Date(test.requestedAt) < new Date(group.oldestRequestedAt)) group.oldestRequestedAt = test.requestedAt;
    }
    const processedItems = [];
    for (const group of groupedByAttendance.values()) {
      const hasPendingTests = group.requestedCount > 0 || group.inProgressCount > 0;
      const allCompleted = group.completedCount > 0 && group.requestedCount === 0 && group.inProgressCount === 0;
      let waitTime = 0; let priority = 'routine';
      if (hasPendingTests) { waitTime = Math.floor((Date.now() - new Date(group.oldestRequestedAt).getTime()) / 60000); const waitHours = waitTime / 60; if (waitHours > 48) priority = 'stat'; else if (waitHours > 24) priority = 'urgent'; }
      processedItems.push({ id: group.attendanceId, patientId: group.patientId, attendanceId: group.attendanceId, patient: group.patient, location: group.location, testCount: group.tests.length, requestedCount: group.requestedCount, inProgressCount: group.inProgressCount, completedCount: group.completedCount, hasPendingTests, hasResults: allCompleted, oldestRequestedAt: group.oldestRequestedAt, tests: group.tests, waitTime, priority, status: hasPendingTests ? 'pending' : (allCompleted ? 'completed' : 'partial') });
    }
    return { total: processedItems.length, pending: processedItems.filter(i => i.hasPendingTests).length, completed: processedItems.filter(i => i.hasResults).length, inProgress: processedItems.filter(i => i.inProgressCount > 0).length, data: processedItems };
  }

  async getPharmacyWorklist(): Promise<any> {
    const allMedications = await this.prisma.medication.findMany({
      where: { status: { in: ['prescribed', 'dispensed'] } },
      include: { Attendance: { include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } }, Bed: { include: { Ward: true } } } }, StockItem: true }, orderBy: { prescribedAt: 'asc' }
    });
    const groupedByAttendance = new Map<string, any>();
    for (const med of allMedications) {
      const attendanceId = med.attendanceId;
      if (!groupedByAttendance.has(attendanceId)) {
        groupedByAttendance.set(attendanceId, { attendanceId: med.attendanceId, patientId: med.Attendance.patientId, patient: { name: `${med.Attendance.Patient.surname} ${med.Attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(med.Attendance.Patient.dateOfBirth), gender: med.Attendance.Patient.gender, folderNumber: med.Attendance.Patient.folderNumber }, location: med.Attendance.Bed ? { ward: med.Attendance.Bed.Ward?.wardName, bed: med.Attendance.Bed.bedNumber } : undefined, medications: [], prescribedCount: 0, dispensedCount: 0, oldestPrescribedAt: med.prescribedAt, newestPrescribedAt: med.prescribedAt });
      }
      const group = groupedByAttendance.get(attendanceId)!; group.medications.push(med);
      if (med.status === 'prescribed') group.prescribedCount++; else if (med.status === 'dispensed') group.dispensedCount++;
      if (new Date(med.prescribedAt) < new Date(group.oldestPrescribedAt)) group.oldestPrescribedAt = med.prescribedAt;
      if (new Date(med.prescribedAt) > new Date(group.newestPrescribedAt)) group.newestPrescribedAt = med.prescribedAt;
    }
    const processedItems: any[] = [];
    for (const group of groupedByAttendance.values()) {
      const hasPendingPrescriptions = group.prescribedCount > 0;
      const allDispensed = group.prescribedCount === 0 && group.dispensedCount > 0;
      let waitTime = 0; let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      if (hasPendingPrescriptions) { waitTime = Math.floor((Date.now() - new Date(group.oldestPrescribedAt).getTime()) / 60000); const waitHours = waitTime / 60; if (waitHours > 48) priority = 'stat'; else if (waitHours > 24) priority = 'urgent'; }
      processedItems.push({ id: group.attendanceId, patientId: group.patientId, attendanceId: group.attendanceId, patient: group.patient, location: group.location, prescriptionCount: group.prescribedCount + group.dispensedCount, prescribedCount: group.prescribedCount, dispensedCount: group.dispensedCount, hasPendingPrescriptions, hasBeenDispensed: allDispensed, oldestPrescribedAt: group.oldestPrescribedAt, medications: group.medications.map((m: any) => ({ id: m.id, name: m.StockItem?.name || m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration, status: m.status, prescribedAt: m.prescribedAt, dispensedAt: m.dispensedAt })), waitTime, priority, status: hasPendingPrescriptions ? 'pending' : (allDispensed ? 'dispensed' : 'partial'), encounterCategory: 'ipd' });
    }
    return { total: processedItems.length, pending: processedItems.filter(i => i.hasPendingPrescriptions).length, dispensed: processedItems.filter(i => i.hasBeenDispensed).length, data: processedItems };
  }

  async getRadiologyWorklist(): Promise<any> {
    const allScans = await this.prisma.scan.findMany({
      where: { status: { in: ['requested', 'in_progress', 'completed'] } },
      include: { Attendance: { include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } }, Bed: { include: { Ward: true } } } }, ScanTemplate: true, User_Scan_performedByIdToUser: { select: { fullName: true } } }, orderBy: { requestedAt: 'asc' }
    });
    const groupedByAttendance = new Map<string, any>();
    for (const scan of allScans) {
      const attendanceId = scan.attendanceId;
      if (!groupedByAttendance.has(attendanceId)) {
        groupedByAttendance.set(attendanceId, { attendanceId: scan.attendanceId, patientId: scan.Attendance.patientId, patient: { name: `${scan.Attendance.Patient.surname} ${scan.Attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(scan.Attendance.Patient.dateOfBirth), gender: scan.Attendance.Patient.gender, folderNumber: scan.Attendance.Patient.folderNumber }, location: scan.Attendance.Bed ? { ward: scan.Attendance.Bed.Ward?.wardName, bed: scan.Attendance.Bed.bedNumber } : undefined, scans: [], requestedCount: 0, inProgressCount: 0, completedCount: 0, oldestRequestedAt: scan.requestedAt, highestPriority: 'routine' });
      }
      const group = groupedByAttendance.get(attendanceId)!; group.scans.push(scan);
      if (scan.status === 'requested') group.requestedCount++; else if (scan.status === 'in_progress') group.inProgressCount++; else if (scan.status === 'completed') group.completedCount++;
      if (new Date(scan.requestedAt) < new Date(group.oldestRequestedAt)) group.oldestRequestedAt = scan.requestedAt;
      let priorityWeight = (scan.priority as string) === 'stat' ? 3 : scan.priority === 'urgent' ? 2 : 1;
      let currentWeight = (group.highestPriority as string) === 'stat' ? 3 : group.highestPriority === 'urgent' ? 2 : 1;
      if (priorityWeight > currentWeight) group.highestPriority = scan.priority || 'routine';
    }
    const processedItems: any[] = [];
    for (const group of groupedByAttendance.values()) {
      const hasPendingScans = group.requestedCount > 0 || group.inProgressCount > 0;
      const allCompleted = group.completedCount > 0 && group.requestedCount === 0 && group.inProgressCount === 0;
      let waitTime = 0; let priority: 'routine' | 'urgent' | 'stat' = group.highestPriority as any;
      if (hasPendingScans) { waitTime = Math.floor((Date.now() - new Date(group.oldestRequestedAt).getTime()) / 60000); const waitHours = waitTime / 60; if (priority !== 'stat' && waitHours > 48) priority = 'stat'; else if (priority !== 'stat' && waitHours > 24 && priority !== 'urgent') priority = 'urgent'; }
      processedItems.push({ id: group.attendanceId, patientId: group.patientId, attendanceId: group.attendanceId, patient: group.patient, location: group.location, scanCount: group.scans.length, requestedCount: group.requestedCount, inProgressCount: group.inProgressCount, completedCount: group.completedCount, hasPendingScans, hasResults: allCompleted, oldestRequestedAt: group.oldestRequestedAt, scanTypes: group.scans.map((s: any) => s.ScanTemplate?.name || s.scanType || 'Unknown').join(', '), waitTime, priority, status: hasPendingScans ? 'pending' : (allCompleted ? 'completed' : 'partial'), encounterCategory: 'ipd' });
    }
    return { total: processedItems.length, pending: processedItems.filter(i => i.hasPendingScans).length, completed: processedItems.filter(i => i.hasResults).length, inProgress: processedItems.filter(i => i.inProgressCount > 0).length, data: processedItems };
  }

  async getProceduresWorklist(): Promise<any> {
    const allProcedures = await this.prisma.procedure.findMany({
      where: { status: { in: ['scheduled', 'completed'] } },
      include: { Attendance: { include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true } }, Bed: { include: { Ward: true } } } }, ProcedureTemplate: true, User_Procedure_performedByIdToUser: { select: { fullName: true } } }, orderBy: { scheduledDate: 'asc' }
    });
    const groupedByAttendance = new Map<string, any>();
    for (const procedure of allProcedures) {
      const attendanceId = procedure.attendanceId;
      if (!groupedByAttendance.has(attendanceId)) {
        groupedByAttendance.set(attendanceId, { attendanceId: procedure.attendanceId, patientId: procedure.Attendance.patientId, patient: { name: `${procedure.Attendance.Patient.surname} ${procedure.Attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(procedure.Attendance.Patient.dateOfBirth), gender: procedure.Attendance.Patient.gender, folderNumber: procedure.Attendance.Patient.folderNumber }, location: procedure.Attendance.Bed ? { ward: procedure.Attendance.Bed.Ward?.wardName, bed: procedure.Attendance.Bed.bedNumber } : undefined, procedures: [], scheduledCount: 0, completedCount: 0, earliestScheduledDate: null });
      }
      const group = groupedByAttendance.get(attendanceId)!; group.procedures.push(procedure);
      if (procedure.status === 'scheduled') group.scheduledCount++; else if (procedure.status === 'completed') group.completedCount++;
      if (procedure.scheduledDate && (!group.earliestScheduledDate || new Date(procedure.scheduledDate) < new Date(group.earliestScheduledDate))) group.earliestScheduledDate = procedure.scheduledDate;
    }
    const processedItems: any[] = [];
    for (const group of groupedByAttendance.values()) {
      const hasPendingProcedures = group.scheduledCount > 0;
      const hasBeenPerformed = group.completedCount > 0 && group.scheduledCount === 0;
      let waitTime = 0; let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      if (hasPendingProcedures && group.earliestScheduledDate) {
        waitTime = Math.floor((new Date(group.earliestScheduledDate).getTime() - Date.now()) / 60000); waitTime = Math.max(0, waitTime);
        const isOverdue = new Date(group.earliestScheduledDate) < new Date();
        if (isOverdue) { const overdueHours = Math.abs(waitTime) / 60; if (overdueHours > 24) priority = 'stat'; else if (overdueHours > 12) priority = 'urgent'; } 
        else { const waitHours = waitTime / 60; if (waitHours < 1) priority = 'stat'; else if (waitHours < 6) priority = 'urgent'; }
      }
      processedItems.push({ id: group.attendanceId, patientId: group.patientId, attendanceId: group.attendanceId, patient: group.patient, location: group.location, procedureCount: group.procedures.length, scheduledCount: group.scheduledCount, inProgressCount: 0, completedCount: group.completedCount, hasPendingProcedures, hasBeenPerformed, earliestScheduledDate: group.earliestScheduledDate, procedureNames: group.procedures.map((p: any) => p.ProcedureTemplate?.name || 'Unknown').join(', '), waitTime, priority, status: hasBeenPerformed ? 'completed' : 'scheduled', encounterCategory: 'ipd' });
    }
    return { total: processedItems.length, scheduled: processedItems.filter(i => i.status === 'scheduled').length, inProgress: 0, completed: processedItems.filter(i => i.status === 'completed').length, data: processedItems };
  }

  async getMaternalWorklist(): Promise<any> {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maternalAttendances = await this.getModel().findMany({
      where: { attendanceType: { in: ['antenatal', 'delivery', 'postnatal'] }, status: { in: ['pending', 'admitted'] } },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, dateOfBirth: true, gender: true, folderNumber: true }}, Bed: { include: { Ward: true }}, Vitals: { orderBy: { recordedAt: 'desc' }, take: 1 }, antenatalBookings: true, currentAntenatalBookings: true, antenatalVisits: { orderBy: { visitDate: 'desc' }, take: 1 }, deliveryRecords: { orderBy: { deliveryDate: 'desc' }, take: 1 }, postnatalRecords: { orderBy: { examinationDate: 'desc' }, take: 1 } },
      orderBy: { dateTime: 'asc' }
    });
    const processedItems = maternalAttendances.map(attendance => {
      const antenatal = attendance.antenatalBookings[0] || attendance.currentAntenatalBookings[0];
      const delivery = attendance.deliveryRecords[0];
      const postnatal = attendance.postnatalRecords[0];
      const lastVitals = attendance.Vitals?.[0];
      const hasBeenAttended = attendance.status === 'completed' || attendance.status === 'discharged';
      const completedToday = hasBeenAttended && new Date(attendance.updatedAt).toDateString() === today.toDateString();
      const waitTime = !hasBeenAttended ? Math.floor((Date.now() - new Date(attendance.dateTime).getTime()) / 60000) : 0;
      let priority: 'routine' | 'urgent' | 'stat' = 'routine';
      const riskLevel = antenatal?.riskLevel || 'low';
      if (!hasBeenAttended) { const waitHours = waitTime / 60; if (riskLevel === 'high' || waitHours > 48) priority = 'stat'; else if (riskLevel === 'medium' || waitHours > 24) priority = 'urgent'; }
      return { id: attendance.id, patientId: attendance.patientId, attendanceId: attendance.id, patient: { name: `${attendance.Patient.surname} ${attendance.Patient.otherNames || ''}`.trim(), age: this.calculateAge(attendance.Patient.dateOfBirth), gender: attendance.Patient.gender, folderNumber: attendance.Patient.folderNumber }, location: attendance.Bed ? { ward: attendance.Bed.Ward?.wardName, bed: attendance.Bed.bedNumber } : undefined, visitType: attendance.attendanceType as any, status: attendance.status, hasBeenAttended: completedToday, completedAt: completedToday ? attendance.updatedAt : undefined, waitTime, priority, riskLevel, encounterCategory: attendance.encounterCategory, gestationalAge: antenatal?.gestationalAgeWeeks, edd: antenatal?.edd, deliveryDate: delivery?.deliveryDate, deliveryType: delivery?.deliveryType, postnatalDay: postnatal?.dayNumber, complaints: attendance.medicalNotes, latestVitals: lastVitals ? { bloodPressure: lastVitals.bloodPressure, temperature: lastVitals.temperature, pulse: lastVitals.pulse } : undefined };
    });
    return { total: processedItems.length, pending: processedItems.filter(i => !i.hasBeenAttended).length, recent: processedItems.filter(i => i.hasBeenAttended).length, data: processedItems };
  }

  // ============================================
  // HELPERS
  // ============================================
  private calculateAge(dateOfBirth: Date): number {
    const birthDate = new Date(dateOfBirth); const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }
}