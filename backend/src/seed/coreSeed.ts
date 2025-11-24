import { PrismaClient, ServiceType, ServiceCategory, NHISCoverageType, UserRole, Gender, InsuranceType, Priority, ScanPriority, PaymentMode, AdmissionType, AdmissionSource, PresentOnAdmission, SecondaryDiagnosisType, AttendanceType, EncounterCategory, VisitCategory, BillStatus, ClaimStatus, DiagnosisCategory, LabTestStatus, ProcedureStatus, ScanStatus, MedicationStatus, AppointmentStatus, AppointmentType, NotificationType, NotificationPriority, PaymentMethod, StockTransactionType, RequisitionStatus, RequisitionUrgency } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Helper: read JSON file
const readJSON = (fileName: string) => {
  const filePath = path.join(__dirname, '..', 'data', fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File not found: ${filePath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

// Helper: hash password
const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

// ✅ SAFE DATABASE OPERATIONS
const safeDbOperation = async (operation: () => Promise<any>, tableName: string = 'unknown') => {
  try {
    return await operation();
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('undefined') || error.message?.includes('not a function')) {
      console.log(`ℹ️ Table or method not available, skipping: ${tableName}`);
      return 0;
    }
    console.error(`❌ Error in safeDbOperation for ${tableName}:`, error.message);
    throw error;
  }
};

// ✅ SCHEMA COMPLIANCE: Add missing required fields automatically
const addSchemaDefaults = (data: any, type: string) => {
  const baseDefaults = {
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  switch (type) {
    case 'labTestTemplate':
      return {
        ...baseDefaults,
        name: data.name || 'Unknown Lab Test',
        investigationCode: data.investigationCode,
        category: data.category || 'hematology',
        subCategory: data.subCategory || null,
        description: data.description || '',
        specimenType: data.specimenType || 'blood',
        resultTemplate: data.resultTemplate || null,
        isNHISCovered: data.isNHISCovered ?? true,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        vatRate: data.vatRate ?? 0,
        isTaxable: data.isTaxable ?? true,
        tariffCode: data.tariffCode || `LAB-${data.investigationCode}`,
      };

    case 'scanTemplate':
      return {
        ...baseDefaults,
        name: data.name || 'Unknown Scan',
        scanCode: data.scanCode,
        investigationCode: data.investigationCode || data.scanCode,
        description: data.description || 'Imaging study',
        category: data.category || 'xray',
        bodyPart: data.bodyPart || 'other',
        scanType: data.scanType || null,
        preparationInstructions: data.preparationInstructions || 'No special preparation needed',
        duration: data.duration ?? 30,
        contrastRequired: data.contrastRequired ?? false,
        isNHISCovered: data.isNHISCovered ?? true,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        vatRate: data.vatRate ?? 0,
        isTaxable: data.isTaxable ?? true,
        tariffCode: data.tariffCode || `SCAN-${data.scanCode}`,
      };

    case 'procedureTemplate':
      return {
        ...baseDefaults,
        name: data.name || 'Unknown Procedure',
        procedureCode: data.procedureCode,
        description: data.description || '',
        category: data.category || 'diagnostic',
        department: data.department || 'general',
        duration: data.duration ?? 60,
        isNHISCovered: data.isNHISCovered ?? true,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        vatRate: data.vatRate ?? 0,
        isTaxable: data.isTaxable ?? true,
        tariffCode: data.tariffCode || `PROC-${data.procedureCode}`,
      };

    case 'stockItem':
      // NO pricing fields here - pricing goes through ServiceCatalog -> ServicePricing
      return {
        ...baseDefaults,
        name: data.name?.trim() || 'Unknown Item',
        drugCode: data.drugCode,
        category: data.category || 'medication',
        description: data.description || '',
        strength: data.strength || 'N/A',
        unitOfMeasure: data.unitOfMeasure || 'units',
        reorderLevel: Math.max(0, data.reorderLevel ?? 50),
        currentStock: Math.max(0, data.currentStock ?? 200),
        costPrice: Math.max(0, data.costPrice ?? data.unitPrice ?? 0),
        supplier: data.supplier || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        batchNumber: data.batchNumber || null,
        isMedication: data.isMedication ?? true,
        isNHISCovered: data.isNHISCovered ?? true,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        vatRate: data.vatRate ?? 0,
        isTaxable: data.isTaxable ?? true,
        tariffCode: data.tariffCode || `MED-${data.drugCode}`,
      };

      case 'diagnosis':
        return {
          // Remove baseDefaults since Diagnosis doesn't have isActive
          createdAt: new Date(),
          updatedAt: new Date(),
          name: data.name || 'Unknown Diagnosis',
          icdCode: data.icdCode,
          gdrgCode: data.gdrgCode || data.icdCode,
          variant: data.variant || null,
          description: data.description || null,
          category: data.category || DiagnosisCategory.infectiousAndParasitic,
          // Remove isPending - Diagnosis model doesn't have this field
          requiresAuthorization: data.requiresAuthorization ?? false,
          isChronic: data.isChronic ?? false,
          isNHISCovered: data.isNHISCovered ?? true,
          tariffCode: data.tariffCode || `DIAG-${data.icdCode}`,
        };

    case 'serviceCatalog':
      return {
        ...baseDefaults,
        name: data.name,
        code: data.code,
        description: data.description || null,
        serviceType: data.serviceType,
        serviceCategory: data.serviceCategory || ServiceCategory.opd,
        subType: data.subType || null,
        nhisServiceCode: data.nhisServiceCode || null,
        isNHISCovered: data.isNHISCovered ?? true,
        nhisCoverageType: data.nhisCoverageType || NHISCoverageType.full,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        isPrivateInsuranceExempted: data.isPrivateInsuranceExempted ?? false,
        isPending: data.isPending ?? false,
        requiresClinicalNotes: data.requiresClinicalNotes ?? false,
        unit: data.unit || 'Each',
        metadata: data.metadata || null,
        tariffCode: data.tariffCode || null,
      };

    case 'ward':
      // NO pricing fields here - pricing goes through ServiceCatalog -> ServicePricing
      return {
        // Remove isActive from here
        createdAt: new Date(),
        updatedAt: new Date(),
        wardName: data.wardName,
        wardType: data.wardType || 'general',
        totalBeds: data.totalBeds ?? 10,
        occupiedBeds: data.occupiedBeds ?? 0,
        isNHISCovered: data.isNHISCovered ?? true,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        isPending: data.isPending ?? false,
        requiresAuthorization: data.requiresAuthorization ?? false,
        vatRate: data.vatRate ?? 0,
        isTaxable: data.isTaxable ?? false,
        tariffCode: data.tariffCode || `WARD-${data.wardName?.replace(/\s+/g, '_').toUpperCase()}`,
      };

    default:
      return { ...data, ...baseDefaults };
  }
};

// ✅ Check if core data already exists
const hasCoreData = async (): Promise<boolean> => {
  console.log('🔍 Checking if core data exists...');
  
  try {
    const counts = await Promise.all([
      prisma.diagnosis.count().catch(() => 0),
      prisma.serviceCatalog.count().catch(() => 0),
      prisma.stockItem.count().catch(() => 0),
      prisma.department.count().catch(() => 0),
      prisma.insuranceProvider.count().catch(() => 0),
      prisma.servicePricing.count().catch(() => 0),
    ]);

    const [diagnosisCount, serviceCatalogCount, stockItemCount, departmentCount, insuranceProviderCount, servicePricingCount] = counts;

    const hasData = diagnosisCount > 0 && 
                   serviceCatalogCount > 0 && 
                   stockItemCount > 0 && 
                   departmentCount > 0 &&
                   insuranceProviderCount > 0;

    console.log('📊 Core data check:', {
      diagnoses: diagnosisCount,
      serviceCatalog: serviceCatalogCount,
      servicePricing: servicePricingCount,
      stockItems: stockItemCount,
      departments: departmentCount,
      insuranceProviders: insuranceProviderCount,
      hasCoreData: hasData
    });

    return hasData;
  } catch (error) {
    console.error('❌ Error checking core data:', error);
    return false;
  }
};

// ✅ Check if there's any patient data
const hasAnyPatientData = async (): Promise<boolean> => {
  try {
    const patientCount = await prisma.patient.count().catch(() => 0);
    return patientCount > 0;
  } catch (error) {
    console.error('❌ Error checking patient data:', error);
    return false;
  }
};

// ✅ SAFE CLEANUP FUNCTION
const safeCleanup = async () => {
  console.log('🗑️ Cleaning up old core data (preserving patient data)...');
  
  const cleanupTables = [
    'servicePricing',
    'serviceCatalog', 
    'gDRGTariff',
    'insuranceProvider',
    'department',
    'stockItem',
    'diagnosis',
    'labTestTemplate',
    'procedureTemplate',
    'scanTemplate',
    'consultationType',
  ];

  for (const table of cleanupTables) {
    try {
      const model = (prisma as any)[table];
      if (model?.deleteMany) {
        await model.deleteMany({});
        console.log(`✅ Cleaned up: ${table}`);
      }
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log(`ℹ️ Table not available, skipping: ${table}`);
      } else {
        console.error(`❌ Error cleaning up ${table}:`, error.message);
      }
    }
  }
  
  // Clear wards and beds only if no admissions exist
  try {
    const admissionCount = await prisma.admission.count().catch(() => 0);
    if (admissionCount === 0) {
      await prisma.bed.deleteMany({}).catch(() => {});
      await prisma.ward.deleteMany({}).catch(() => {});
      console.log('✅ Cleaned up wards and beds');
    } else {
      console.log('⚠️ Skipping ward/bed cleanup - active admissions exist');
    }
  } catch (error: any) {
    console.log('ℹ️ Could not check admissions, skipping ward/bed cleanup');
  }
  
  console.log('✅ Core data cleanup completed');
};

// ✅ SAFE SERVICE PRICING CREATION
const createServicePricing = async (serviceCatalogId: string, pricing: { cashPrice: number; nhisPrice: number; insurancePrice: number }) => {
  try {
    await prisma.servicePricing.upsert({
      where: { serviceCatalogId },
      create: {
        serviceCatalogId,
        cashPrice: pricing.cashPrice ?? 0,
        nhisPrice: pricing.nhisPrice ?? 0,
        insurancePrice: pricing.insurancePrice ?? 0,
        vatRate: 0,
        isTaxable: false,
        effectiveDate: new Date(),
        isActive: true,
      },
      update: {
        cashPrice: pricing.cashPrice ?? 0,
        nhisPrice: pricing.nhisPrice ?? 0,
        insurancePrice: pricing.insurancePrice ?? 0,
        isActive: true,
      },
    });
  } catch (error: any) {
    console.error(`❌ Error creating service pricing:`, error.message);
  }
};

export const seedCoreData = async (force: boolean = false) => {
  console.log('🏥 Starting core data seeding...');

  try {
    // Safety checks
    if (process.env.NODE_ENV === 'production' && !force) {
      console.log('🚨 PRODUCTION SAFETY: Core data seeding disabled in production');
      return { success: false, message: 'Disabled in production', productionSafety: true };
    }

    const coreDataExists = await hasCoreData();
    if (coreDataExists && !force) {
      console.log('✅ Core data already exists. Skipping.');
      return { success: true, message: 'Core data exists', skipped: true };
    }

    const hasPatients = await hasAnyPatientData();
    if (hasPatients && !force) {
      console.log('⚠️ Patient data detected. Use force=true to proceed.');
    }

    console.log('🔧 Proceeding with core data seeding...');
    await safeCleanup();

    // =============== 0. CREATE ADMIN USER ===============
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      create: {
        username: 'admin',
        password: hashPassword('admin123'),
        fullName: 'System Administrator',
        role: UserRole.admin,
        email: 'admin@hospital.com',
        phone: '+233244111111',
        licenseNumber: 'ADMIN-001',
        isActive: true,
      },
      update: {},
    });
    console.log('✅ Admin user created/verified');
    const adminId = adminUser.id;

    // =============== 1. HOSPITAL ===============
    await prisma.hospital.upsert({
      where: { nhisFacilityCode: 'GH001' },
      create: {
        name: 'General Hospital',
        address: '123 Medical Center Drive, Accra',
        phone: '+233-24-123-4567',
        email: 'info@generalhospital.gov.gh',
        nhisFacilityCode: 'GH001',
        nhisFacilityType: 'Secondary',
        nhisAccreditationNumber: 'NHIS/ACC/2024/001',
        nhisAccreditationDate: new Date('2024-01-15'),
        nhisAccreditationExpiry: new Date('2025-01-14'),
        bankName: 'Ghana Commercial Bank',
        bankAccountNumber: '1234567890',
        bankBranch: 'Accra Central',
        nhisContactPerson: 'Dr. Kwame Mensah',
        nhisContactPhone: '+233-24-765-4321',
        nhisContactEmail: 'nhis@generalhospital.gov.gh',
        isActive: true,
      },
      update: {},
    });
    console.log('✅ Hospital configured');

 // =============== 2. DEPARTMENTS ===============
const departmentsData = readJSON('departments.json');

if (!Array.isArray(departmentsData)) {
  console.log('❌ No departments data found in departments.json');
  process.exit(1);
}

for (const dept of departmentsData) {
  await prisma.department.upsert({
    where: { name: dept.name },
    create: {
      name: dept.name,
      description: dept.description || '',
      color: dept.color || '#3B82F6',
      icon: dept.icon || 'default',
      isActive: dept.isActive ?? true,
    },
    update: {},
  });
}
console.log(`✅ ${departmentsData.length} departments configured`);

    // =============== 3. INSURANCE PROVIDERS ===============
    const providersData = readJSON('insuranceProviders.json');
    const defaultProviders = [
      { name: 'National Health Insurance Scheme', type: InsuranceType.nhis, coveragePercentage: 100, contactInfo: { phone: '+233302111111', email: 'info@nhis.gov.gh' } },
      { name: 'Acacia Health Insurance', type: InsuranceType.private, coveragePercentage: 80, contactInfo: { phone: '+233302222222', email: 'info@acacia.com' } },
    ];

    const providers = Array.isArray(providersData) ? providersData : defaultProviders;
    for (const p of providers) {
      try {
        await prisma.insuranceProvider.upsert({
          where: { name: p.name },
          create: {
            name: p.name,
            type: p.type || InsuranceType.private,
            coveragePercentage: p.coveragePercentage ?? 100,
            contactInfo: p.contactInfo || { phone: '+233000000000', email: 'info@provider.com' },
            isActive: p.isActive ?? true,
          },
          update: {},
        });
      } catch (error: any) {
        console.error(`❌ Error with insurance provider ${p.name}:`, error.message);
      }
    }
    console.log(`✅ ${providers.length} insurance providers configured`);

    // =============== 4. DIAGNOSES ===============
    const diagnosesData = readJSON('diagnoses.json');
    if (diagnosesData && Array.isArray(diagnosesData)) {
      const stats = { total: diagnosesData.length, successful: 0, errors: 0 };
      const seenCodes = new Set<string>();

      for (const d of diagnosesData) {
        try {
          if (!d.icdCode || !d.name) { stats.errors++; continue; }
          if (seenCodes.has(d.icdCode)) { continue; }
          seenCodes.add(d.icdCode);

          const diagnosisData = addSchemaDefaults(d, 'diagnosis');

          await prisma.diagnosis.upsert({
            where: { icdCode: d.icdCode },
            create: diagnosisData,
            update: diagnosisData,
          });
          stats.successful++;
        } catch (error: any) {
          console.error(`❌ Diagnosis ${d.icdCode}:`, error.message);
          stats.errors++;
        }
      }
      console.log(`✅ Diagnoses: ${stats.successful}/${stats.total} (${stats.errors} errors)`);
    }

    // =============== 5. GDRG TARIFFS ===============
    const gdrgData = readJSON('gdrgTariffs.json');
    if (gdrgData?.tariffs && Array.isArray(gdrgData.tariffs)) {
      const stats = { total: gdrgData.tariffs.length, successful: 0, errors: 0 };

      for (const tariff of gdrgData.tariffs) {
        try {
          await prisma.gDRGTariff.upsert({
            where: { gdrgCode: tariff.gdrgCode },
            create: {
              gdrgCode: tariff.gdrgCode,
              description: tariff.description || 'No description',
              category: tariff.category || 'GENERAL',
              nhiaTariff: parseFloat(tariff.nhiaTariff) || 0,
              ageGroup: tariff.ageGroup || null,
              effectiveFrom: new Date(gdrgData.effective_date || '2022-10-01'),
              isActive: tariff.isActive ?? true,
            },
            update: {
              description: tariff.description || 'No description',
              category: tariff.category || 'GENERAL',
              nhiaTariff: parseFloat(tariff.nhiaTariff) || 0,
            },
          });
          stats.successful++;
        } catch (error: any) {
          stats.errors++;
        }
      }
      console.log(`✅ GDRG Tariffs: ${stats.successful}/${stats.total}`);
    }

    // =============== 6. LAB TEST TEMPLATES ===============
    const labTestsData = readJSON('labTests.json');
    const labTemplateMap = new Map();
    
    if (labTestsData && Array.isArray(labTestsData)) {
      for (const test of labTestsData) {
        try {
          if (!test.investigationCode) continue;
          const labData = addSchemaDefaults(test, 'labTestTemplate');
          
          const template = await prisma.labTestTemplate.upsert({
            where: { investigationCode: test.investigationCode },
            create: labData,
            update: labData,
          });
          labTemplateMap.set(test.investigationCode, template);
        } catch (error: any) {
          console.error(`❌ Lab template ${test.investigationCode}:`, error.message);
        }
      }
      console.log(`✅ ${labTemplateMap.size} lab test templates configured`);
    }

    // =============== 7. SCAN TEMPLATES ===============
    const scansData = readJSON('scans.json');
    const scanTemplateMap = new Map();
    
    if (scansData && Array.isArray(scansData)) {
      for (const scan of scansData) {
        try {
          if (!scan.scanCode) continue;
          const scanData = addSchemaDefaults(scan, 'scanTemplate');
          
          const template = await prisma.scanTemplate.upsert({
            where: { scanCode: scan.scanCode },
            create: scanData,
            update: scanData,
          });
          scanTemplateMap.set(scan.scanCode, template);
        } catch (error: any) {
          console.error(`❌ Scan template ${scan.scanCode}:`, error.message);
        }
      }
      console.log(`✅ ${scanTemplateMap.size} scan templates configured`);
    }

    // =============== 8. PROCEDURE TEMPLATES ===============
    const proceduresData = readJSON('procedures.json');
    const procedureTemplateMap = new Map();
    
    if (proceduresData && Array.isArray(proceduresData)) {
      for (const proc of proceduresData) {
        try {
          if (!proc.procedureCode) continue;
          const procData = addSchemaDefaults(proc, 'procedureTemplate');
          
          const template = await prisma.procedureTemplate.upsert({
            where: { procedureCode: proc.procedureCode },
            create: procData,
            update: procData,
          });
          procedureTemplateMap.set(proc.procedureCode, template);
        } catch (error: any) {
          console.error(`❌ Procedure template ${proc.procedureCode}:`, error.message);
        }
      }
      console.log(`✅ ${procedureTemplateMap.size} procedure templates configured`);
    }

    // =============== 9. CONSULTATION TYPES ===============
    const consultationTypes = [
      { name: 'General Outpatient Consultation', code: 'CONS-GEN', cashPrice: 100, nhisPrice: 0, insurancePrice: 120, isNHISCovered: false },
      { name: 'Specialist Consultation', code: 'CONS-SPEC', cashPrice: 200, nhisPrice: 50, insurancePrice: 150, isNHISCovered: true },
      { name: 'Emergency Consultation', code: 'CONS-EMERG', cashPrice: 150, nhisPrice: 30, insurancePrice: 180, isNHISCovered: true },
    ];

    const consultationTypeMap = new Map();
    for (const ct of consultationTypes) {
      const consultationType = await prisma.consultationType.upsert({
        where: { code: ct.code },
        create: {
          name: ct.name,
          code: ct.code,
          cashPrice: ct.cashPrice,
          nhisPrice: ct.nhisPrice,
          insurancePrice: ct.insurancePrice,
          isNHISCovered: ct.isNHISCovered,
          isPrivateInsExempted: false,
          isActive: true,
        },
        update: {},
      });
      consultationTypeMap.set(ct.code, consultationType);
    }
    console.log(`✅ ${consultationTypes.length} consultation types configured`);

    // =============== 10. SERVICE CATALOG WITH PRICING ===============
    console.log('🔄 Creating unified service catalog with pricing...');

    const serviceCatalogEntries: any[] = [];

    // Add consultation services
    for (const ct of consultationTypes) {
      serviceCatalogEntries.push({
        name: ct.name,
        code: ct.code,
        serviceType: ServiceType.consultation,
        serviceCategory: ServiceCategory.opd,
        subType: ct.code === 'CONS-GEN' ? 'general' : 'specialist',
        nhisServiceCode: ct.code,
        consultationTypeId: consultationTypeMap.get(ct.code)?.id,
        metadata: { duration: ct.code === 'CONS-GEN' ? 15 : 30 },
        pricing: { cashPrice: ct.cashPrice, nhisPrice: ct.nhisPrice, insurancePrice: ct.insurancePrice },
      });
    }

    // Add lab test services
    for (const [code, template] of labTemplateMap) {
      serviceCatalogEntries.push({
        name: template.name,
        code: `LAB-${code}`,
        serviceType: ServiceType.lab_test,
        serviceCategory: ServiceCategory.diagnostics,
        subType: template.category,
        nhisServiceCode: code,
        labTestTemplateId: template.id,
        metadata: { specimenType: template.specimenType, category: template.category },
        pricing: { cashPrice: 50, nhisPrice: 35, insurancePrice: 60 },
      });
    }

    // Add scan services
    for (const [code, template] of scanTemplateMap) {
      serviceCatalogEntries.push({
        name: template.name,
        code: `SCAN-${code}`,
        serviceType: ServiceType.scan,
        serviceCategory: ServiceCategory.diagnostics,
        subType: template.category,
        nhisServiceCode: code,
        scanTemplateId: template.id,
        metadata: { bodyPart: template.bodyPart, duration: template.duration },
        pricing: { cashPrice: 150, nhisPrice: 100, insurancePrice: 180 },
      });
    }

    // Add procedure services
    for (const [code, template] of procedureTemplateMap) {
      serviceCatalogEntries.push({
        name: template.name,
        code: `PROC-${code}`,
        serviceType: ServiceType.procedure,
        serviceCategory: ServiceCategory.ipd,
        subType: template.category,
        nhisServiceCode: code,
        procedureTemplateId: template.id,
        metadata: { duration: template.duration, department: template.department },
        pricing: { cashPrice: 500, nhisPrice: 350, insurancePrice: 600 },
      });
    }

    // Create ServiceCatalog entries with ServicePricing
    for (const service of serviceCatalogEntries) {
      try {
        const catalogData = addSchemaDefaults({
          name: service.name,
          code: service.code,
          serviceType: service.serviceType,
          serviceCategory: service.serviceCategory,
          subType: service.subType,
          nhisServiceCode: service.nhisServiceCode,
          isNHISCovered: (service.pricing?.nhisPrice ?? 0) > 0,
          nhisCoverageType: NHISCoverageType.full,
          nhisRequiresAuth: service.serviceType === ServiceType.procedure,
          privateInsRequiresAuth: service.serviceType === ServiceType.procedure,
          requiresClinicalNotes: service.serviceType === ServiceType.consultation,
          metadata: service.metadata,
          unit: service.serviceType === ServiceType.ward ? 'Day' : 'Each',
          createdById: adminId,
          consultationTypeId: service.consultationTypeId || null,
          labTestTemplateId: service.labTestTemplateId || null,
          scanTemplateId: service.scanTemplateId || null,
          procedureTemplateId: service.procedureTemplateId || null,
          stockItemId: service.stockItemId || null,
          wardId: service.wardId || null,
        }, 'serviceCatalog');

        const catalog = await prisma.serviceCatalog.upsert({
          where: { code: service.code },
          create: catalogData,
          update: catalogData,
        });

        // Create ServicePricing
        if (service.pricing) {
          await createServicePricing(catalog.id, service.pricing);
        }
      } catch (error: any) {
        console.error(`❌ Service catalog ${service.code}:`, error.message);
      }
    }
    console.log(`✅ ${serviceCatalogEntries.length} service catalog entries with pricing configured`);

    // =============== 11. STOCK ITEMS ===============
    const stockFiles = ['medications1.json', 'medications2.json', 'medications3.json', 'nhismedicines.json', 'consumables.json'];
    let totalStockProcessed = 0;

    for (const file of stockFiles) {
      try {
        const items = readJSON(file);
        if (!items || !Array.isArray(items)) continue;
        
        const isMedication = !file.includes('consumables');
        
        for (const item of items) {
          if (!item.drugCode) continue;
          
          try {
            const stockData = addSchemaDefaults({
              ...item,
              isMedication,
            }, 'stockItem');

            const stockItem = await prisma.stockItem.upsert({
              where: { drugCode: item.drugCode },
              create: stockData,
              update: stockData,
            });

            // Create ServiceCatalog + ServicePricing for this stock item
            const serviceCode = `MED-${item.drugCode}`;
            const serviceCatalogData = addSchemaDefaults({
              name: item.name?.trim() || 'Unknown Medication',
              code: serviceCode,
              serviceType: ServiceType.medication,
              serviceCategory: ServiceCategory.pharmacy,
              subType: item.category || 'medication',
              nhisServiceCode: item.drugCode,
              stockItemId: stockItem.id,
              metadata: { strength: item.strength, unitOfMeasure: item.unitOfMeasure },
              createdById: adminId,
            }, 'serviceCatalog');

            const catalog = await prisma.serviceCatalog.upsert({
              where: { code: serviceCode },
              create: serviceCatalogData,
              update: serviceCatalogData,
            });

            // Create pricing from item data
            await createServicePricing(catalog.id, {
              cashPrice: item.cashPrice ?? item.sellingPrice ?? item.unitPrice ?? 10,
              nhisPrice: item.nhisPrice ?? item.insurancePrice ?? item.unitPrice ?? 5,
              insurancePrice: item.insurancePrice ?? item.unitPrice ?? 8,
            });

            totalStockProcessed++;
          } catch (error: any) {
            console.error(`❌ Stock item ${item.drugCode}:`, error.message);
          }
        }
        console.log(`✅ Processed ${file}`);
      } catch (error: any) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    }
    console.log(`✅ ${totalStockProcessed} stock items with service catalog entries configured`);

    // =============== 12. WARDS & BEDS ===============
    const wardsData = readJSON('wards.json');
    const existingWardCount = await prisma.ward.count().catch(() => 0);
    
    if (existingWardCount === 0) {
      const defaultWards = [
        { wardName: 'General Ward A', wardType: 'general', totalBeds: 20, cashPrice: 100, nhisPrice: 50, insurancePrice: 80 },
        { wardName: 'Maternity Ward', wardType: 'maternity', totalBeds: 12, cashPrice: 120, nhisPrice: 60, insurancePrice: 100 },
        { wardName: 'ICU', wardType: 'icu', totalBeds: 6, cashPrice: 500, nhisPrice: 300, insurancePrice: 450 },
        { wardName: 'Pediatric Ward', wardType: 'pediatric', totalBeds: 15, cashPrice: 80, nhisPrice: 40, insurancePrice: 70 },
      ];

      const wardsToCreate = Array.isArray(wardsData) ? wardsData : defaultWards;

      for (const ward of wardsToCreate) {
        try {
          const wardData = addSchemaDefaults(ward, 'ward');
          const createdWard = await prisma.ward.create({ data: wardData });
          
          // Create beds
          const beds = Array.from({ length: ward.totalBeds || 10 }, (_, i) => ({
            wardId: createdWard.id,
            bedNumber: `${ward.wardName.substring(0, 2).toUpperCase()}-${i + 1}`,
            isOccupied: false,
          }));
          await prisma.bed.createMany({ data: beds });

          // Create ServiceCatalog + ServicePricing for ward
          const serviceCode = `WARD-${ward.wardName.replace(/\s+/g, '-').toUpperCase()}`;
          const serviceCatalogData = addSchemaDefaults({
            name: `${ward.wardName} - Daily Rate`,
            code: serviceCode,
            serviceType: ServiceType.ward,
            serviceCategory: ServiceCategory.ipd,
            subType: ward.wardType,
            wardId: createdWard.id,
            unit: 'Day',
            metadata: { wardType: ward.wardType, totalBeds: ward.totalBeds },
            createdById: adminId,
          }, 'serviceCatalog');

          const catalog = await prisma.serviceCatalog.upsert({
            where: { code: serviceCode },
            create: serviceCatalogData,
            update: serviceCatalogData,
          });

          await createServicePricing(catalog.id, {
            cashPrice: ward.cashPrice ?? ward.cashDailyRate ?? 100,
            nhisPrice: ward.nhisPrice ?? ward.nhisDailyRate ?? 50,
            insurancePrice: ward.insurancePrice ?? ward.insuranceDailyRate ?? 80,
          });

        } catch (error: any) {
          console.error(`❌ Error creating ward ${ward.wardName}:`, error.message);
        }
      }
      console.log(`✅ ${wardsToCreate.length} wards with beds and pricing created`);
    } else {
      console.log('ℹ️ Wards already exist, skipping ward creation');
    }

    console.log('🎉 Core data seeding completed successfully!');
    
    return {
      success: true,
      message: 'Core data seeded successfully',
      preservedPatientData: hasPatients
    };

  } catch (error: any) {
    console.error('❌ Core data seeding failed:', error);
    throw error;
  }
};