// modules/encounter/EncounterService.ts
import { PrismaClient } from '@prisma/client';
import { EncounterRepository } from './EncounterRepository';
import { 
  CreateEncounterDTO, 
  UpdateEncounterDTO, 
  AddDiagnosisDTO, 
  AddVitalsDTO, 
  AddPrescriptionDTO, 
  AddLabTestDTO, 
  AddScanDTO, 
  AddProcedureDTO, 
  AddServiceDTO 
} from './EncounterTypes';

export class EncounterService {
  private repository: EncounterRepository;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.repository = new EncounterRepository(this.prisma);
  }

  // ============================================
  // CREATE ENCOUNTER WITH BILLING
  // ============================================
  async createEncounter(data: CreateEncounterDTO, userId: string) {
    // Validate NHIS CCC if payment mode is NHIS
    if (data.paymentMode === 'nhis' && !data.nhisCCC) {
      throw new Error('NHIS CCC number is required for NHIS payments');
    }

    // Validate Corporate Account if payment mode is Corporate
    if (data.paymentMode === 'corporate' && !data.corporateAccountId) {
      throw new Error('Corporate Account ID is required for corporate payments');
    }

    // Auto-link NHIS provider if needed
    let insuranceProviderId = data.insuranceProviderId;
    if (data.paymentMode === 'nhis' && !insuranceProviderId) {
      const nhisProvider = await this.prisma.insuranceProvider.findFirst({
        where: { type: 'nhis', isActive: true }
      });
      if (nhisProvider) {
        insuranceProviderId = nhisProvider.id;
      } else {
        throw new Error('NHIS insurance provider not found in system');
      }
    }

    // For cash and corporate payments, ensure no insurance provider is set
    if (data.paymentMode === 'cash' || data.paymentMode === 'corporate') {
      insuranceProviderId = null;
    }

    // Verify corporate account exists if provided
    if (data.corporateAccountId) {
      const corporateAccount = await this.prisma.corporateAccount.findUnique({
        where: { id: data.corporateAccountId }
      });
      if (!corporateAccount) {
        throw new Error('Corporate account not found');
      }
      if (!corporateAccount.isActive) {
        throw new Error('Corporate account is not active');
      }
    }

    // Create the encounter
    const encounter = await this.repository.create(
      { ...data, insuranceProviderId },
      userId
    );

    return encounter;
  }

  // ============================================
  // GET ENCOUNTER BY ID
  // ============================================
  async getEncounterById(id: string) {
    const encounter = await this.repository.findById(id);
    if (!encounter) {
      throw new Error('Encounter not found');
    }
    return encounter;
  }

  // ============================================
  // GET ALL ENCOUNTERS WITH FILTERS
  // ============================================
  async getEncounters(filters: any) {
    return this.repository.findMany(filters);
  }

  // ============================================
  // UPDATE ENCOUNTER STATUS
  // ============================================
  async updateEncounterStatus(id: string, status: string) {
    const validStatuses = ['pending', 'admitted', 'completed', 'discharged', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return this.repository.update(id, { status: status as any });
  }

  // ============================================
  // ADD DIAGNOSIS
  // ============================================
  async addDiagnosis(encounterId: string, data: AddDiagnosisDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add diagnosis to ${encounter.status} encounter`);
    }

    return this.repository.addDiagnosis(encounterId, data, userId);
  }

  // ============================================
  // SET PRIMARY DIAGNOSIS
  // ============================================
  async setPrimaryDiagnosis(encounterId: string, diagnosisId: string, userId: string) {
    return this.addDiagnosis(encounterId, {
      diagnosisId,
      diagnosisType: 'primary'
    }, userId);
  }

  // ============================================
  // REMOVE DIAGNOSIS
  // ============================================
  async removeDiagnosis(encounterId: string, diagnosisId: string) {
    return this.prisma.attendanceDiagnosis.delete({
      where: {
        attendanceId_diagnosisId: {
          attendanceId: encounterId,
          diagnosisId
        }
      }
    });
  }

  // ============================================
  // ADD VITALS
  // ============================================
  async addVitals(encounterId: string, data: AddVitalsDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add vitals to ${encounter.status} encounter`);
    }

    return this.repository.addVitals(encounterId, data, userId);
  }

  // ============================================
  // UPDATE VITALS
  // ============================================
  async updateVitals(vitalsId: string, data: Partial<AddVitalsDTO>) {
    const updateData: any = {};
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.bloodPressureSystolic !== undefined && data.bloodPressureDiastolic !== undefined) {
      updateData.bloodPressure = `${data.bloodPressureSystolic}/${data.bloodPressureDiastolic}`;
    }
    if (data.pulse !== undefined) updateData.pulse = data.pulse;
    if (data.respiratoryRate !== undefined) updateData.respiration = data.respiratoryRate;
    if (data.oxygenSaturation !== undefined) updateData.spo2 = data.oxygenSaturation;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.muac !== undefined) updateData.muac = data.muac;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.prisma.vitals.update({
      where: { id: vitalsId },
      data: updateData
    });
  }

  // ============================================
  // DELETE VITALS
  // ============================================
  async deleteVitals(vitalsId: string) {
    return this.prisma.vitals.delete({
      where: { id: vitalsId }
    });
  }

  // ============================================
  // ADD PRESCRIPTION
  // ============================================
  async addPrescription(encounterId: string, data: AddPrescriptionDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add prescription to ${encounter.status} encounter`);
    }

    // Validate stock item exists
    const stockItem = await this.prisma.stockItem.findUnique({
      where: { id: data.stockItemId }
    });

    if (!stockItem) {
      throw new Error('Stock item not found');
    }

    // Validate service catalog for pricing
    const serviceCatalog = await this.prisma.serviceCatalog.findUnique({
      where: { id: data.serviceCatalogId }
    });

    if (!serviceCatalog || serviceCatalog.serviceType !== 'medication') {
      throw new Error('Invalid service catalog item for medication');
    }

    return this.repository.addPrescription(encounterId, data, userId);
  }

  // ============================================
  // DISPENSE MEDICATION
  // ============================================
  async dispenseMedication(
    encounterId: string,
    medicationId: string,
    quantity: number,
    userId: string,
    batchNumber?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const medication = await tx.medication.findUnique({
        where: { id: medicationId },
        include: { StockItem: true }
      });

      if (!medication) {
        throw new Error('Medication not found');
      }

      if (medication.status !== 'prescribed') {
        throw new Error('Medication is not in prescribed state');
      }

      const stockItem = medication.StockItem;
      if (!stockItem) {
        throw new Error('Stock item not found for this medication');
      }

      if (stockItem.currentStock < quantity) {
        throw new Error(
          `Insufficient stock. Available: ${stockItem.currentStock}, Required: ${quantity}`
        );
      }

      // Update stock
      await tx.stockItem.update({
        where: { id: stockItem.id },
        data: { currentStock: stockItem.currentStock - quantity }
      });

      // Update medication
      const updatedMedication = await tx.medication.update({
        where: { id: medicationId },
        data: {
          status: 'dispensed',
          quantity,
          dispensedAt: new Date(),
          dispensedById: userId,
          dispensedBatchNumber: batchNumber || null,
          dispensedUnitCost: stockItem.costPrice
        }
      });

      // Create stock transaction
      await tx.stockTransaction.create({
        data: {
          stockItemId: stockItem.id,
          transactionType: 'sale',
          quantity,
          balanceAfter: stockItem.currentStock - quantity,
          reference: `Dispensed from encounter ${encounterId}`,
          performedBy: userId,
          notes: `Medication: ${medication.name}`
        }
      });

      return updatedMedication;
    });
  }

  // ============================================
  // UPDATE MEDICATION STATUS
  // ============================================
  async updateMedicationStatus(medicationId: string, status: string) {
    const validStatuses = ['prescribed', 'dispensed', 'administered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return this.prisma.medication.update({
      where: { id: medicationId },
      data: { status }
    });
  }

  // ============================================
  // REMOVE MEDICATION
  // ============================================
  async removeMedication(encounterId: string, medicationId: string) {
    return this.prisma.medication.delete({
      where: {
        id: medicationId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // ADD LAB TEST
  // ============================================
  async addLabTest(encounterId: string, data: AddLabTestDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add lab test to ${encounter.status} encounter`);
    }

    const labTest = await this.repository.addLabTest(encounterId, data, userId);

    // Add to billing
    const labTestTemplate = await this.prisma.labTestTemplate.findUnique({
      where: { id: data.templateId },
      include: { ServiceCatalog: true }
    });

    if (labTestTemplate?.ServiceCatalog) {
      await this.addServiceToBill(encounterId, labTestTemplate.ServiceCatalog.id, userId);
    }

    return labTest;
  }

  // ============================================
  // UPDATE LAB TEST STATUS
  // ============================================
  async updateLabTestStatus(labTestId: string, status: string, results?: any, performedById?: string) {
    const validStatuses = ['requested', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status };
    if (results) updateData.result = results;
    if (performedById) updateData.performedById = performedById;
    if (status === 'completed') updateData.completedAt = new Date();

    return this.prisma.labTest.update({
      where: { id: labTestId },
      data: updateData
    });
  }

  // ============================================
  // REMOVE LAB TEST
  // ============================================
  async removeLabTest(encounterId: string, labTestId: string) {
    return this.prisma.labTest.delete({
      where: {
        id: labTestId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // ADD SCAN
  // ============================================
  async addScan(encounterId: string, data: AddScanDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add scan to ${encounter.status} encounter`);
    }

    const scan = await this.repository.addScan(encounterId, data, userId);

    await this.addServiceToBill(encounterId, data.serviceCatalogId, userId);

    return scan;
  }

  // ============================================
  // UPDATE SCAN STATUS
  // ============================================
  async updateScanStatus(scanId: string, status: string, results?: string, performedById?: string) {
    const validStatuses = ['requested', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status };
    if (results) updateData.result = results;
    if (performedById) updateData.performedById = performedById;
    if (status === 'completed') updateData.completedAt = new Date();

    return this.prisma.scan.update({
      where: { id: scanId },
      data: updateData
    });
  }

  // ============================================
  // REMOVE SCAN
  // ============================================
  async removeScan(encounterId: string, scanId: string) {
    return this.prisma.scan.delete({
      where: {
        id: scanId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // ADD PROCEDURE
  // ============================================
  async addProcedure(encounterId: string, data: AddProcedureDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add procedure to ${encounter.status} encounter`);
    }

    const procedure = await this.repository.addProcedure(encounterId, data, userId);

    await this.addServiceToBill(encounterId, data.serviceCatalogId, userId);

    return procedure;
  }

  // ============================================
  // UPDATE PROCEDURE STATUS
  // ============================================
  async updateProcedureStatus(procedureId: string, status: string, performedById?: string) {
    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status };
    if (performedById) updateData.performedById = performedById;
    if (status === 'completed') updateData.completedAt = new Date();

    return this.prisma.procedure.update({
      where: { id: procedureId },
      data: updateData
    });
  }

  // ============================================
  // REMOVE PROCEDURE
  // ============================================
  async removeProcedure(encounterId: string, procedureId: string) {
    return this.prisma.procedure.delete({
      where: {
        id: procedureId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // ADD SERVICE TO ENCOUNTER
  // ============================================
  async addService(encounterId: string, data: AddServiceDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add service to ${encounter.status} encounter`);
    }

    await this.repository.addService(encounterId, data, userId);

    return encounter;
  }

  // ============================================
  // REMOVE SERVICE FROM ENCOUNTER
  // ============================================
  async removeService(encounterId: string, serviceRenderedId: string) {
    return this.prisma.serviceRendered.delete({
      where: {
        id: serviceRenderedId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // GET WORKLISTS
  // ============================================
  async getVitalsWorklist() {
    return this.repository.getVitalsWorklist();
  }

  async getMedicalWorklist() {
    return this.repository.getMedicalWorklist();
  }

  async getLabWorklist() {
    return this.repository.getLabWorklist();
  }

  async getPharmacyWorklist() {
    return this.repository.getPharmacyWorklist();
  }

  async getRadiologyWorklist() {
    return this.repository.getRadiologyWorklist();
  }

  // ============================================
  // HELPER: Add Service to Bill
  // ============================================
  private async addServiceToBill(encounterId: string, serviceCatalogId: string, userId: string) {
    const existingService = await this.prisma.serviceRendered.findFirst({
      where: {
        attendanceId: encounterId,
        serviceItemId: serviceCatalogId
      }
    });

    if (existingService) {
      return;
    }

    await this.prisma.serviceRendered.create({
      data: {
        attendanceId: encounterId,
        serviceItemId: serviceCatalogId,
        quantity: 1,
        date: new Date(),
        performedById: userId
      }
    });
  }

  // ============================================
  // DELETE ENCOUNTER
  // ============================================
  async deleteEncounter(id: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        Medication: { take: 1 },
        LabTest: { take: 1 },
        Scan: { take: 1 },
        Procedure: { take: 1 },
        ServiceRendered: { take: 1 },
        AttendanceDiagnosis: { take: 1 },
        Vitals: { take: 1 },
        Bill: true
      }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.Medication.length > 0 || 
        encounter.LabTest.length > 0 || 
        encounter.Scan.length > 0 || 
        encounter.Procedure.length > 0 || 
        encounter.ServiceRendered.length > 0 ||
        encounter.AttendanceDiagnosis.length > 0 ||
        encounter.Vitals.length > 0 ||
        encounter.Bill) {
      throw new Error('Cannot delete encounter with related records. Please remove all services first.');
    }

    return this.prisma.attendance.delete({
      where: { id }
    });
  }

  // ============================================
  // GET ENCOUNTER STATISTICS
  // ============================================
  async getEncounterStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = dateFrom;
      if (dateTo) where.dateTime.lte = dateTo;
    }

    const [total, byType, byStatus, byPaymentMode] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.groupBy({
        by: ['attendanceType'],
        where,
        _count: true
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      this.prisma.attendance.groupBy({
        by: ['paymentMode'],
        where,
        _count: true
      })
    ]);

    return {
      total,
      byType: byType.map(item => ({ type: item.attendanceType, count: item._count })),
      byStatus: byStatus.map(item => ({ status: item.status, count: item._count })),
      byPaymentMode: byPaymentMode.map(item => ({ mode: item.paymentMode, count: item._count }))
    };
  }
}