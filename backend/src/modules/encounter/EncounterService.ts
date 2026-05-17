// modules/encounter/EncounterService.ts
import { PrismaClient } from '@prisma/client';
import { EncounterRepository } from './EncounterRepository';
import { CreateEncounterDTO, UpdateEncounterDTO, AddDiagnosisDTO, AddVitalsDTO, AddPrescriptionDTO, AddLabOrderDTO } from './EncounterTypes';

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

    // Generate initial bill if needed
    await this.generateInitialBill(encounter.id);

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
    const validStatuses = ['pending', 'admitted', 'completed', 'discharged'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return this.repository.update(id, { status: status as any });
  }

  // ============================================
  // ADD DIAGNOSIS
  // ============================================
  async addDiagnosis(encounterId: string, data: AddDiagnosisDTO, userId: string) {
    // Validate attendance allows diagnosis addition
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged') {
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

    return this.repository.addVitals(encounterId, data, userId);
  }

  // ============================================
  // UPDATE VITALS
  // ============================================
  async updateVitals(vitalsId: string, data: Partial<AddVitalsDTO>) {
    return this.prisma.vitals.update({
      where: { id: vitalsId },
      data
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

    if (encounter.status === 'completed' || encounter.status === 'discharged') {
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

    const prescription = await this.repository.addPrescription(encounterId, data, userId);

    // Add to billing
    await this.addServiceToBill(encounterId, data.serviceCatalogId, userId);

    return prescription;
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
  // ADD LAB ORDER
  // ============================================
  async addLabOrder(encounterId: string, data: AddLabOrderDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged') {
      throw new Error(`Cannot add lab order to ${encounter.status} encounter`);
    }

    const labOrder = await this.repository.addLabOrder(encounterId, data, userId);

    // Add to billing
    const labTest = await this.prisma.labTest.findUnique({
      where: { id: data.testId }
    });

    if (labTest?.serviceCatalogId) {
      await this.addServiceToBill(encounterId, labTest.serviceCatalogId, userId);
    }

    return labOrder;
  }

  // ============================================
  // UPDATE LAB ORDER STATUS
  // ============================================
  async updateLabOrderStatus(labOrderId: string, status: string, results?: any, performedById?: string) {
    const validStatuses = ['pending', 'collected', 'processing', 'completed', 'verified', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status };
    if (results) updateData.results = results;
    if (performedById) updateData.performedById = performedById;
    if (status === 'completed') updateData.completedAt = new Date();

    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: updateData
    });
  }

  // ============================================
  // REMOVE LAB ORDER
  // ============================================
  async removeLabOrder(encounterId: string, labOrderId: string) {
    return this.prisma.labOrder.delete({
      where: {
        id: labOrderId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // GET WORKLISTS (CLINICAL QUEUES)
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
      return; // Already added
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

    // Trigger bill generation
    await this.generateBillFromEncounter(encounterId);
  }

  // ============================================
  // HELPER: Generate Initial Bill
  // ============================================
  private async generateInitialBill(encounterId: string) {
    // Placeholder for billing service integration
    // In production, call BillingService.generateBillFromAttendance(encounterId)
    console.log(`Bill generation triggered for encounter ${encounterId}`);
  }

  // ============================================
  // HELPER: Generate Bill from Encounter
  // ============================================
  private async generateBillFromEncounter(encounterId: string) {
    // Placeholder for billing service integration
    console.log(`Bill updated for encounter ${encounterId}`);
  }

  // ============================================
  // DELETE ENCOUNTER
  // ============================================
  async deleteEncounter(id: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        Medication: true,
        LabOrder: true,
        ServiceRendered: true
      }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    // Check if encounter has related records
    if (encounter.Medication.length > 0 || encounter.LabOrder.length > 0 || encounter.ServiceRendered.length > 0) {
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
