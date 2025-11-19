// scripts/migrateToPostgres.ts
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// Temporarily import old Mongoose models
import AdmissionModel from './oldModels/Admission';
import AttendanceModel from './oldModels/Attendance';
import BedModel from './oldModels/Bed';
import BillModel from './oldModels/Bill';
import DiagnosisModel from './oldModels/Diagnosis';
import GDRGTariffModel from './oldModels/GDRGTariff';
import HospitalModel from './oldModels/Hospital';
import InsuranceClaimModel from './oldModels/InsuranceClaim';
import InsuranceProviderModel from './oldModels/InsuranceProvider';
import LabTestTemplateModel from './oldModels/LabTestTemplate';
import PatientModel from './oldModels/Patient';
import ProcedureTemplateModel from './oldModels/ProcedureTemplate';
import ScanTemplateModel from './oldModels/ScanTemplate';
import ServiceCatalogModel from './oldModels/ServiceCatalog';
import StockItemModel from './oldModels/StockItem';
import StockTransactionModel from './oldModels/StockTransaction';
import UserModel from './oldModels/User';
import VitalsModel from './oldModels/Vitals';
import WardModel from './oldModels/Ward';

const prisma = new PrismaClient();

// Helper: Convert ObjectId to string or null
const oid = (id: any) => (id ? id.toString() : null);

// Helper: Convert string ID to number (for Prisma Int IDs)
// We use hash to avoid collisions (since MongoDB IDs are strings)
const idToNumber = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) || 1; // Ensure positive & non-zero
};

// Main migration function
async function migrate() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI!);

  console.log('🚀 Starting data migration...');

  // 1. Users
  console.log('Migrating Users...');
  const users = await UserModel.find({});
  const userMap = new Map<string, number>();
  for (const u of users) {
    const id = idToNumber(u._id.toString());
    userMap.set(u._id.toString(), id);
    await prisma.user.upsert({
      where: { id },
      create: {
        id,
        username: u.username,
        password: u.password,
        fullName: u.fullName,
        role: u.role,
        email: u.email,
        phone: u.phone,
        licenseNumber: u.licenseNumber,
        specialization: u.specialization,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      },
      update: {},
    });
  }

  // 2. Hospital (only one expected)
  console.log('Migrating Hospital...');
  const hospital = await HospitalModel.findOne({});
  if (hospital) {
    await prisma.hospital.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        name: hospital.name,
        address: hospital.address,
        phone: hospital.phone,
        email: hospital.email,
        imageUrl: hospital.imageUrl,
        nhisFacilityCode: hospital.nhisFacilityCode,
        nhisFacilityType: hospital.nhisFacilityType,
        nhisAccreditationNumber: hospital.nhisAccreditationNumber,
        nhisAccreditationDate: hospital.nhisAccreditationDate,
        nhisAccreditationExpiry: hospital.nhisAccreditationExpiry,
        bankName: hospital.bankName,
        bankAccountNumber: hospital.bankAccountNumber,
        bankBranch: hospital.bankBranch,
        nhisContactPerson: hospital.nhisContactPerson,
        nhisContactPhone: hospital.nhisContactPhone,
        nhisContactEmail: hospital.nhisContactEmail,
        isActive: hospital.isActive,
        createdAt: hospital.createdAt,
        updatedAt: hospital.updatedAt,
      },
      update: {},
    });
  }

  // 3. Insurance Providers
  console.log('Migrating Insurance Providers...');
  const providers = await InsuranceProviderModel.find({});
  const providerMap = new Map<string, number>();
  for (const p of providers) {
    const id = idToNumber(p._id.toString());
    providerMap.set(p._id.toString(), id);
    await prisma.insuranceProvider.upsert({
      where: { id },
      create: {
        id,
        name: p.name,
        type: p.type,
        coveragePercentage: p.coveragePercentage,
        startDate: p.startDate,
        expiryDate: p.expiryDate,
        isActive: p.isActive,
        contactInfo: p.contactInfo
          ? JSON.stringify(p.contactInfo)
          : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
      update: {},
    });
  }

  // 4. Patients
  console.log('Migrating Patients...');
  const patients = await PatientModel.find({});
  const patientMap = new Map<string, number>();
  for (const p of patients) {
    const id = idToNumber(p._id.toString());
    patientMap.set(p._id.toString(), id);

    await prisma.patient.upsert({
      where: { id },
      create: {
        id,
        folderNumber: p.folderNumber,
        fullName: p.fullName,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth,
        age: p.age,
        contact: p.contact,
        address: p.address,
        paymentMode: p.paymentMode as any,
        imageUrl: p.imageUrl,
        registeredAt: p.registeredAt,
        registeredBy: p.registeredBy,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
      update: {},
    });

    // Insurance Details
    if (p.insuranceDetails) {
      await prisma.insuranceDetails.upsert({
        where: { patientId: id },
        create: {
          patientId: id,
          providerId: p.insuranceDetails.providerId
            ? providerMap.get(p.insuranceDetails.providerId.toString()) || null
            : null,
          memberId: p.insuranceDetails.memberId,
          groupNumber: p.insuranceDetails.groupNumber,
          relationship: p.insuranceDetails.relationship,
          startDate: p.insuranceDetails.startDate,
          endDate: p.insuranceDetails.endDate,
          isActive: p.insuranceDetails.isActive,
          copayment: p.insuranceDetails.copayment,
          deductible: p.insuranceDetails.deductible,
          coverageLimit: p.insuranceDetails.coverageLimit,
        },
        update: {},
      });
    }

    // Additional Info
    if (p.additionalInfo) {
      await prisma.additionalInfo.upsert({
        where: { patientId: id },
        create: {
          patientId: id,
          title: p.additionalInfo.title,
          email: p.additionalInfo.email,
          houseNumber: p.additionalInfo.houseNumber,
          idType: p.additionalInfo.idType,
          idNumber: p.additionalInfo.idNumber,
          bloodType: p.additionalInfo.bloodType as any,
          occupation: p.additionalInfo.occupation,
          nextOfKin: p.additionalInfo.nextOfKin,
          emergencyContact: p.additionalInfo.emergencyContact
            ? JSON.stringify(p.additionalInfo.emergencyContact)
            : null,
        },
        update: {},
      });
    }

    // Billing Address
    if (p.billingAddress) {
      await prisma.billingAddress.upsert({
        where: { patientId: id },
        create: {
          patientId: id,
          street: p.billingAddress.street,
          city: p.billingAddress.city,
          state: p.billingAddress.state,
          postalCode: p.billingAddress.postalCode,
        },
        update: {},
      });
    }

    // Employer
    if (p.employer) {
      await prisma.employer.upsert({
        where: { patientId: id },
        create: {
          patientId: id,
          name: p.employer.name,
          address: p.employer.address,
          phone: p.employer.phone,
        },
        update: {},
      });
    }
  }

  // 5. Wards
  console.log('Migrating Wards...');
  const wards = await WardModel.find({});
  const wardMap = new Map<string, number>();
  for (const w of wards) {
    const id = idToNumber(w._id.toString());
    wardMap.set(w._id.toString(), id);
    await prisma.ward.upsert({
      where: { id },
      create: {
        id,
        wardName: w.wardName,
        wardType: w.wardType,
        totalBeds: w.totalBeds,
        occupiedBeds: w.occupiedBeds,
        cashDailyRate: w.cashDailyRate,
        insuranceDailyRate: w.insuranceDailyRate,
        isPending: w.isPending,
        requiresAuthorization: w.requiresAuthorization,
        tariffCode: w.tariffCode,
        vatRate: w.vatRate,
        isTaxable: w.isTaxable,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      },
      update: {},
    });
  }

  // 6. Beds
  console.log('Migrating Beds...');
  const beds = await BedModel.find({});
  const bedMap = new Map<string, number>();
  for (const b of beds) {
    const id = idToNumber(b._id.toString());
    bedMap.set(b._id.toString(), id);
    await prisma.bed.upsert({
      where: { id },
      create: {
        id,
        wardId: b.wardId ? wardMap.get(b.wardId.toString()) || 1 : 1,
        bedNumber: b.bedNumber,
        isOccupied: b.isOccupied,
        currentPatientId: b.currentPatientId
          ? patientMap.get(b.currentPatientId.toString()) || null
          : null,
      },
      update: {},
    });
  }

  // 7. Diagnoses
  console.log('Migrating Diagnoses...');
  const diagnoses = await DiagnosisModel.find({});
  const diagMap = new Map<string, number>();
  for (const d of diagnoses) {
    const id = idToNumber(d._id.toString());
    diagMap.set(d._id.toString(), id);
    await prisma.diagnosis.upsert({
      where: { id },
      create: {
        id,
        name: d.name,
        icdCode: d.icdCode,
        gdrgCode: d.gdrgCode,
        variant: d.variant,
        description: d.description,
        isPending: d.isPending,
        requiresAuthorization: d.requiresAuthorization,
        tariffCode: d.tariffCode,
        isChronic: d.isChronic,
        isNHISCovered: d.isNHISCovered,
        category: d.category,
      },
      update: {},
    });
  }

  // 8. GDRG Tariffs
  console.log('Migrating GDRG Tariffs...');
  const tariffs = await GDRGTariffModel.find({});
  for (const t of tariffs) {
    await prisma.gDRGTariff.upsert({
      where: { gdrgCode: t.gdrgCode },
      create: {
        gdrgCode: t.gdrgCode,
        description: t.description,
        nhiaTariff: t.nhiaTariff,
        effectiveFrom: t.effectiveFrom,
        effectiveTo: t.effectiveTo,
        isActive: t.isActive,
      },
      update: {},
    });
  }

  // 9. Lab Test Templates
  console.log('Migrating Lab Test Templates...');
  const labTemplates = await LabTestTemplateModel.find({});
  const labTemplateMap = new Map<string, number>();
  for (const t of labTemplates) {
    const id = idToNumber(t._id.toString());
    labTemplateMap.set(t._id.toString(), id);
    await prisma.labTestTemplate.upsert({
      where: { id },
      create: {
        id,
        name: t.name,
        investigationCode: t.investigationCode,
        category: t.category,
        subCategory: t.subCategory,
        description: t.description,
        cashPrice: t.cashPrice,
        insurancePrice: t.insurancePrice,
        costPrice: t.costPrice,
        isPending: t.isPending,
        requiresAuthorization: t.requiresAuthorization,
        tariffCode: t.tariffCode,
        vatRate: t.vatRate,
        isTaxable: t.isTaxable,
        specimenType: t.specimenType as any,
        resultTemplate: t.resultTemplate ? JSON.stringify(t.resultTemplate) : null,
      },
      update: {},
    });
  }

  // 10. Procedure Templates
  console.log('Migrating Procedure Templates...');
  const procTemplates = await ProcedureTemplateModel.find({});
  const procTemplateMap = new Map<string, number>();
  for (const t of procTemplates) {
    const id = idToNumber(t._id.toString());
    procTemplateMap.set(t._id.toString(), id);
    await prisma.procedureTemplate.upsert({
      where: { id },
      create: {
        id,
        name: t.name,
        procedureCode: t.procedureCode,
        description: t.description,
        cashPrice: t.cashPrice,
        insurancePrice: t.insurancePrice,
        costPrice: t.costPrice,
        isPending: t.isPending,
        requiresAuthorization: t.requiresAuthorization,
        tariffCode: t.tariffCode,
        vatRate: t.vatRate,
        isTaxable: t.isTaxable,
        duration: t.duration,
        category: t.category as any,
        department: t.department,
      },
      update: {},
    });
  }

  // 11. Scan Templates
  console.log('Migrating Scan Templates...');
  const scanTemplates = await ScanTemplateModel.find({});
  const scanTemplateMap = new Map<string, number>();
  for (const t of scanTemplates) {
    const id = idToNumber(t._id.toString());
    scanTemplateMap.set(t._id.toString(), id);
    await prisma.scanTemplate.upsert({
      where: { id },
      create: {
        id,
        name: t.name,
        investigationCode: t.investigationCode,
        description: t.description,
        category: t.category as any,
        bodyPart: t.bodyPart as any,
        cashPrice: t.cashPrice,
        insurancePrice: t.insurancePrice,
        costPrice: t.costPrice,
        isPending: t.isPending,
        requiresAuthorization: t.requiresAuthorization,
        visaRate: t.vatRate, // note: typo fix if needed
        isTaxable: t.isTaxable,
        preparationInstructions: t.preparationInstructions,
        duration: t.duration,
        contrastRequired: t.contrastRequired,
        scanType: t.scanType,
      },
      update: {},
    });
  }

  // 12. Stock Items
  console.log('Migrating Stock Items...');
  const stockItems = await StockItemModel.find({});
  const stockItemMap = new Map<string, number>();
  for (const s of stockItems) {
    const id = idToNumber(s._id.toString());
    stockItemMap.set(s._id.toString(), id);
    await prisma.stockItem.upsert({
      where: { id },
      create: {
        id,
        name: s.name,
        category: s.category,
        description: s.description,
        strength: s.strength,
        unitOfMeasure: s.unitOfMeasure,
        drugCode: s.drugCode,
        reorderLevel: s.reorderLevel,
        currentStock: s.currentStock,
        unitPrice: s.unitPrice,
        sellingPrice: s.sellingPrice,
        insurancePrice: s.insurancePrice,
        supplier: s.supplier,
        expiryDate: s.expiryDate,
        batchNumber: s.batchNumber,
        isPending: s.isPending,
        requiresAuthorization: s.requiresAuthorization,
        tariffCode: s.tariffCode,
        vatRate: s.vatRate,
        isTaxable: s.isTaxable,
        isMedication: s.isMedication,
      },
      update: {},
    });
  }

  // 13. Service Catalog
  console.log('Migrating Service Catalog...');
  const services = await ServiceCatalogModel.find({});
  for (const s of services) {
    const id = idToNumber(s._id.toString());
    await prisma.serviceCatalog.upsert({
      where: { id },
      create: {
        id,
        name: s.name,
        code: s.code,
        description: s.description,
        serviceType: s.serviceType as any,
        category: s.category,
        diagnosisId: s.diagnosisId ? diagMap.get(s.diagnosisId.toString()) || null : null,
        labTestTemplateId: s.labTestTemplateId
          ? labTemplateMap.get(s.labTestTemplateId.toString()) || null
          : null,
        procedureTemplateId: s.procedureTemplateId
          ? procTemplateMap.get(s.procedureTemplateId.toString()) || null
          : null,
        stockItemId: s.stockItemId
          ? stockItemMap.get(s.stockItemId.toString()) || null
          : null,
        wardId: s.wardId ? wardMap.get(s.wardId.toString()) || null : null,
        scanTemplateId: s.scanTemplateId
          ? scanTemplateMap.get(s.scanTemplateId.toString()) || null
          : null,
        cashPrice: s.cashPrice,
        insurancePrice: s.insurancePrice,
        costPrice: s.costPrice,
        unit: s.unit,
        isPending: s.isPending,
        requiresAuthorization: s.requiresAuthorization,
        tariffCode: s.tariffCode,
        vatRate: s.vatRate,
        isTaxable: s.isTaxable,
        nhisServiceCode: s.nhisServiceCode,
        nhisCategory: s.nhisCategory,
        requiresClinicalNotes: s.requiresClinicalNotes,
      },
      update: {},
    });
  }

  // 14. Attendances
  console.log('Migrating Attendances...');
  const attendances = await AttendanceModel.find({});
  const attendanceMap = new Map<string, number>();
  for (const a of attendances) {
    const id = idToNumber(a._id.toString());
    attendanceMap.set(a._id.toString(), id);

    await prisma.attendance.upsert({
      where: { id },
      create: {
        id,
        attendanceNumber: a.attendanceNumber,
        patientId: patientMap.get(a.patientId.toString()) || 1,
        insuranceProviderId: a.insuranceProviderId
          ? providerMap.get(a.insuranceProviderId.toString()) || null
          : null,
        dateTime: a.dateTime,
        attendanceType: a.attendanceType,
        paymentMode: a.paymentMode as any,
        nhisCCC: a.nhisCCC,
        complaints: a.complaints,
        medicalNotes: a.medicalNotes,
        attendingClinicianId: userMap.get(a.attendingClinician.toString()) || 1,
        createdBy: userMap.get(a.createdBy.toString()) || 1,
        updatedBy: a.updatedBy ? userMap.get(a.updatedBy.toString()) || null : null,
        status: a.status as any,
        admissionId: a.admissionId
          ? idToNumber(a.admissionId.toString())
          : null,
        bedId: a.bedId ? bedMap.get(a.bedId.toString()) || null : null,
        wardId: a.wardId ? wardMap.get(a.wardId.toString()) || null : null,
        billId: a.billId ? idToNumber(a.billId.toString()) : null,
        previousAttendanceId: a.previousAttendanceId
          ? idToNumber(a.previousAttendanceId.toString())
          : null,
        totalBill: a.totalBill,
        paidAmount: a.paidAmount,
        outstandingBalance: a.outstandingBalance,
        insuranceClaimId: a.insuranceClaimId
          ? idToNumber(a.insuranceClaimId.toString())
          : null,
        preAuthNumber: a.preAuthNumber,
        preAuthApproved: a.preAuthApproved,
        preAuthAmount: a.preAuthAmount,
        encounterCategory: a.encounterCategory as any,
        visitCategory: a.visitCategory as any,
        referringFacility: a.referringFacility,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      },
      update: {},
    });

    // Migrate embedded arrays (diagnoses, vitals, etc.)
    for (const diag of a.diagnoses || []) {
      await prisma.diagnosisEntry.create({
        data: {
          attendanceId: id,
          diagnosisId: diag.diagnosisId
            ? diagMap.get(diag.diagnosisId.toString()) || 1
            : 1,
          primary: diag.primary,
          notes: diag.notes,
          date: diag.date,
          createdBy: userMap.get(diag.createdBy.toString()) || 1,
          icdCode: diag.icdCode,
          presentOnAdmission: diag.presentOnAdmission as any,
          diagnosisType: diag.diagnosisType as any,
        },
      });
    }

    for (const med of a.medications || []) {
      await prisma.medication.create({
        data: {
          attendanceId: id,
          stockItemId: med.stockItemId
            ? stockItemMap.get(med.stockItemId.toString()) || null
            : null,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          quantity: med.quantity,
          route: med.route,
          instructions: med.instructions,
          status: med.status as any,
          prescribedAt: med.prescribedAt,
          dispensedAt: med.dispensedAt,
          administeredAt: med.administeredAt,
          dispensedById: med.dispensedBy
            ? userMap.get(med.dispensedBy.toString()) || null
            : null,
          administeredById: med.administeredBy
            ? userMap.get(med.administeredBy.toString()) || null
            : null,
          prescribedById: userMap.get(med.prescribedBy.toString()) || 1,
          notes: med.notes,
        },
      });
    }

    for (const test of a.labTests || []) {
      await prisma.labTest.create({
        data: {
          attendanceId: id,
          templateId: labTemplateMap.get(test.templateId.toString()) || 1,
          status: test.status as any,
          result: test.result ? JSON.stringify(test.result) : null,
          normalRange: test.normalRange,
          units: test.units,
          requestedAt: test.requestedAt,
          completedAt: test.completedAt,
          performedById: test.performedBy
            ? userMap.get(test.performedBy.toString()) || null
            : null,
          verifiedById: test.verifiedBy
            ? userMap.get(test.verifiedBy.toString()) || null
            : null,
          notes: test.notes,
          createdBy: userMap.get(test.createdBy.toString()) || 1,
          priority: test.priority as any,
        },
      });
    }

    // ... (you can add scans, procedures, vitals similarly)
  }

  // 15. Admissions
  console.log('Migrating Admissions...');
  const admissions = await AdmissionModel.find({});
  for (const a of admissions) {
    const id = idToNumber(a._id.toString());
    await prisma.admission.upsert({
      where: { id },
      create: {
        id,
        admissionNumber: a.admissionNumber,
        patientId: patientMap.get(a.patientId.toString()) || 1,
        attendanceId: attendanceMap.get(a.attendanceId.toString()) || null,
        wardId: wardMap.get(a.wardId.toString()) || 1,
        bedId: bedMap.get(a.bedId.toString()) || 1,
        admissionDate: a.admissionDate,
        admissionTime: a.admissionTime,
        admittingDoctor: a.admittingDoctor,
        reasonForAdmission: a.reasonForAdmission,
        diagnosis: a.diagnosis,
        status: a.status,
        dischargeDate: a.dischargeDate,
        dischargeTime: a.dischargeTime,
        dischargeSummary: a.dischargeSummary,
        dailyNotes: a.dailyNotes ? JSON.stringify(a.dailyNotes) : null,
        createdBy: a.createdBy,
        admissionType: a.admissionType as any,
        admissionSource: a.admissionSource as any,
        dischargeStatus: a.dischargeStatus as any,
        lengthOfStay: a.lengthOfStay,
        principalDiagnosisId: diagMap.get(a.principalDiagnosis.diagnosisId.toString()) || 1,
        secondaryDiagnoses: a.secondaryDiagnoses
          ? JSON.stringify(a.secondaryDiagnoses)
          : null,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      },
      update: {},
    });
  }

  // 16. Bills
  console.log('Migrating Bills...');
  const bills = await BillModel.find({});
  for (const b of bills) {
    const id = idToNumber(b._id.toString());
    await prisma.bill.upsert({
      where: { id },
      create: {
        id,
        billNumber: b.billNumber,
        patientId: patientMap.get(b.patientId.toString()) || 1,
        attendanceId: attendanceMap.get(b.attendanceId.toString()) || 1,
        admissionId: b.admissionId
          ? idToNumber(b.admissionId.toString())
          : null,
        items: b.items ? JSON.stringify(b.items) : null,
        subtotal: b.subtotal,
        discount: b.discount,
        taxAmount: b.taxAmount,
        totalAmount: b.totalAmount,
        insuranceCovered: b.insuranceCovered,
        patientPayable: b.patientPayable,
        paidAmount: b.paidAmount,
        balance: b.balance,
        status: b.status as any,
        paymentMode: b.paymentMode as any,
        insuranceProviderId: b.insuranceProviderId
          ? providerMap.get(b.insuranceProviderId.toString()) || null
          : null,
        preAuthNumber: b.preAuthNumber,
        claimNumber: b.claimNumber,
        claimStatus: b.claimStatus as any,
        createdBy: userMap.get(b.createdBy.toString()) || 1,
        updatedBy: b.updatedBy
          ? userMap.get(b.updatedBy.toString()) || null
          : null,
        billDate: b.billDate,
        dueDate: b.dueDate,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      },
      update: {},
    });
  }

  // 17. Insurance Claims
  console.log('Migrating Insurance Claims...');
  const claims = await InsuranceClaimModel.find({});
  for (const c of claims) {
    const id = idToNumber(c._id.toString());
    await prisma.insuranceClaim.upsert({
      where: { id },
      create: {
        id,
        claimNumber: c.claimNumber,
        billId: idToNumber(c.billId.toString()),
        patientId: patientMap.get(c.patientId.toString()) || 1,
        insuranceProviderId: providerMap.get(c.insuranceProviderId.toString()) || 1,
        attendanceId: attendanceMap.get(c.attendanceId.toString()) || 1,
        totalClaimAmount: c.totalClaimAmount,
        approvedAmount: c.approvedAmount,
        rejectedAmount: c.rejectedAmount,
        paidAmount: c.paidAmount,
        status: c.status as any,
        submissionDate: c.submissionDate,
        approvalDate: c.approvalDate,
        paymentDate: c.paymentDate,
        preAuthNumber: c.preAuthNumber,
        diagnosisCodes: c.diagnosisCodes ? JSON.stringify(c.diagnosisCodes) : null,
        procedureCodes: c.procedureCodes ? JSON.stringify(c.procedureCodes) : null,
        notes: c.notes,
        createdBy: userMap.get(c.createdBy.toString()) || 1,
        updatedBy: c.updatedBy
          ? userMap.get(c.updatedBy.toString()) || null
          : null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      },
      update: {},
    });
  }

  // 18. Stock Transactions, Vitals, etc. — add similarly if needed

  console.log('✅ Migration completed successfully!');
  await mongoose.disconnect();
  await prisma.$disconnect();
}

// Run migration
migrate().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
