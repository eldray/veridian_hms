// src/seed/coreSeed.ts - COMPLETE PRESERVED VERSION
import { PrismaClient, ServiceType, ServiceCategory, NHISCoverageType, UserRole, Gender, InsuranceType } from '@prisma/client';
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

// ✅ SCHEMA COMPLIANCE: Add missing required fields automatically
const addSchemaDefaults = (data: any, type: string) => {
  const baseDefaults = {
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
        normalRangeTemplate: data.normalRangeTemplate || null,
        isNHISCovered: data.isNHISCovered ?? true,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        vatRate: data.vatRate ?? 0,
        isTaxable: data.isTaxable ?? true,
        tariffCode: data.tariffCode || `LAB-${data.investigationCode}`,
        isActive: true,
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
        isActive: true,
      };

      case 'procedureTemplate':
        // Map invalid category names to valid enum values
        const categoryMap: Record<string, string> = {
          // Surgical categories
          'General Surgery': 'surgical',
          'Thoracic Surgery': 'surgical',
          'Vascular Surgery': 'surgical',
          'Neurosurgery': 'surgical',
          'Paediatric Surgery': 'pediatric',
          'Gynaecology': 'obstetric',
          'Obstetrics': 'obstetric',
          'Orthopaedics': 'orthopedic',
          'Reconstructive Surgery': 'surgical',
          'Plastic Surgery': 'surgical',
          
          // Specialty categories
          'Urology': 'urology',
          'ENT': 'ent',
          'Dental': 'dental',
          'Ophthalmology': 'ophthalmic',
          'Neurology': 'neurology',
          'Dermatology': 'dermatology',
          
          // Procedure types
          'Endoscopy': 'diagnostic',
          'Laparoscopic Surgery': 'laparoscopic',
          'Laparoscopic': 'laparoscopic',
          'Laparotomy': 'laparotomy',
          'Interventional Radiology': 'diagnostic',
          
          // Other
          'Family Planning': 'therapeutic',
          'Nursing Procedure': 'therapeutic',
          'Emergency': 'emergency',
          'Observation': 'therapeutic',
          'Administrative': 'therapeutic',
          'Diagnostic': 'diagnostic',
          'Family Planning': 'therapeutic',
        };
        
        const mappedCategory = categoryMap[data.category] || 'therapeutic';
        
        return {
          ...baseDefaults,
          name: data.name || 'Unknown Procedure',
          procedureCode: data.procedureCode,
          description: data.description || '',
          category: mappedCategory,  // Use mapped value
          department: data.department || 'general',
          duration: data.duration ?? 60,
          isNHISCovered: data.isNHISCovered ?? true,
          isPrivateInsExempted: data.isPrivateInsExempted ?? false,
          nhisRequiresAuth: data.nhisRequiresAuth ?? false,
          privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
          vatRate: data.vatRate ?? 0,
          isTaxable: data.isTaxable ?? true,
          tariffCode: data.tariffCode || `PROC-${data.procedureCode}`,
          isActive: true,
        };

    case 'diagnosis':
      return {
        ...baseDefaults,
        name: data.name || 'Unknown Diagnosis',
        icdCode: data.icdCode,
        description: data.description || null,
        isActive: true,
        requiresAuthorization: data.requiresAuthorization ?? false,
        tariffCode: data.tariffCode || `DIAG-${data.icdCode}`,
        isChronic: data.isChronic ?? false,
        isNHISCovered: data.isNHISCovered ?? true,
        morbidityGroup: data.morbidityGroup || 'all_other_diseases',
      };

    case 'stockItem':
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
        isActive: true,
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
        isActive: data.isActive ?? true,
        requiresClinicalNotes: data.requiresClinicalNotes ?? false,
        unit: data.unit || 'Each',
        metadata: data.metadata || null,
        tariffCode: data.tariffCode || null,
        diagnosisId: data.diagnosisId || null,
        labTestTemplateId: data.labTestTemplateId || null,
        procedureTemplateId: data.procedureTemplateId || null,
        stockItemId: data.stockItemId || null,
        wardId: data.wardId || null,
        scanTemplateId: data.scanTemplateId || null,
        consultationTypeId: data.consultationTypeId || null,
        createdById: data.createdById || null,
        gdrgTariffId: data.gdrgTariffId || null,
      };

    case 'ward':
      return {
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
        dailyCashRate: data.dailyCashRate || data.cashPrice || data.cashDailyRate || 0,
        dailyNHISRate: data.dailyNHISRate || data.nhisPrice || data.nhisDailyRate || 0,
        dailyInsuranceRate: data.dailyInsuranceRate || data.insurancePrice || data.insuranceDailyRate || 0,
      };

    default:
      return { ...data, ...baseDefaults };
  }
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
      prisma.procedureTemplate.count().catch(() => 0), // ✅ ADD THIS
      prisma.labTestTemplate.count().catch(() => 0),   // ✅ ADD THIS
      prisma.scanTemplate.count().catch(() => 0),      // ✅ ADD THIS
    ]);

    const [diagnosisCount, serviceCatalogCount, stockItemCount, departmentCount, insuranceProviderCount, servicePricingCount, procedureTemplateCount, labTestTemplateCount, scanTemplateCount] = counts;

    const hasData = diagnosisCount > 0 && 
                   serviceCatalogCount > 0 && 
                   stockItemCount > 0 && 
                   departmentCount > 0 &&
                   insuranceProviderCount > 0 &&
                   procedureTemplateCount > 0 &&      // ✅ ADD THIS
                   labTestTemplateCount > 0 &&        // ✅ ADD THIS
                   scanTemplateCount > 0;             // ✅ ADD THIS

    console.log('📊 Core data check:', {
      diagnoses: diagnosisCount,
      serviceCatalog: serviceCatalogCount,
      servicePricing: servicePricingCount,
      stockItems: stockItemCount,
      departments: departmentCount,
      insuranceProviders: insuranceProviderCount,
      procedureTemplates: procedureTemplateCount,
      labTestTemplates: labTestTemplateCount,
      scanTemplates: scanTemplateCount,
      hasCoreData: hasData
    });

    return hasData;
  } catch (error) {
    console.error('❌ Error checking core data:', error);
    return false;
  }
};

export const seedCoreData = async (force: boolean = false) => {
  console.log('🏥 Starting core data seeding...');

  try {
    if (process.env.NODE_ENV === 'production' && !force) {
      console.log('🚨 PRODUCTION SAFETY: Core data seeding disabled in production');
      return { success: false, message: 'Disabled in production', productionSafety: true };
    }

    const coreDataExists = await hasCoreData();
    if (coreDataExists && !force) {
      console.log('✅ Core data already exists. Skipping.');
      return { success: true, message: 'Core data exists', skipped: true };
    }

    console.log('🔧 Proceeding with core data seeding...');

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
    const defaultDepartments = [
      { name: 'Medical', description: 'Internal Medicine Department', color: '#3B82F6', icon: 'stethoscope' },
      { name: 'Surgery', description: 'Surgical Department', color: '#EF4444', icon: 'scissors' },
      { name: 'Pediatrics', description: 'Children\'s Health', color: '#10B981', icon: 'baby' },
      { name: 'Obstetrics & Gynecology', description: 'Women\'s Health', color: '#EC4899', icon: 'heart' },
      { name: 'Radiology', description: 'Medical Imaging', color: '#8B5CF6', icon: 'scan' },
      { name: 'Laboratory', description: 'Diagnostic Laboratory', color: '#F59E0B', icon: 'flask' },
      { name: 'Pharmacy', description: 'Medication Dispensing', color: '#06B6D4', icon: 'pill' },
      { name: 'Emergency', description: 'Emergency Medicine', color: '#EF4444', icon: 'alert-triangle' },
    ];

    const departments = Array.isArray(departmentsData) ? departmentsData : defaultDepartments;
    for (const dept of departments) {
      await prisma.department.upsert({
        where: { name: dept.name },
        create: {
          name: dept.name,
          description: dept.description || '',
          color: dept.color || '#3B82F6',
          icon: dept.icon || 'default',
          isActive: true,
        },
        update: {},
      });
    }
    console.log(`✅ ${departments.length} departments configured`);

    // =============== 3. INSURANCE PROVIDERS ===============
    const providersData = readJSON('insuranceProviders.json');
    const defaultProviders = [
      { name: 'National Health Insurance Scheme', type: InsuranceType.nhis, coveragePercentage: 100, contactInfo: { phone: '+233302111111', email: 'info@nhis.gov.gh' } },
      { name: 'Acacia Health Insurance', type: InsuranceType.private, coveragePercentage: 80, contactInfo: { phone: '+233302222222', email: 'info@acacia.com' } },
      { name: 'Metropolitan Insurance', type: InsuranceType.private, coveragePercentage: 75, contactInfo: { phone: '+233302333333', email: 'info@metro.com' } },
    ];

    const providers = Array.isArray(providersData) ? providersData : defaultProviders;
    for (const p of providers) {
      await prisma.insuranceProvider.upsert({
        where: { name: p.name },
        create: {
          name: p.name,
          type: p.type || InsuranceType.private,
          coveragePercentage: p.coveragePercentage ?? 100,
          contactInfo: p.contactInfo || { phone: '+233000000000', email: 'info@provider.com' },
          isActive: true,
          claimSubmissionMethod: 'portal',
        },
        update: {},
      });
    }
    console.log(`✅ ${providers.length} insurance providers configured`);

    // =============== 4. DIAGNOSES ===============
    const diagnosesData = readJSON('diagnoses.json');
    if (diagnosesData && Array.isArray(diagnosesData)) {
      let successful = 0;
      for (const d of diagnosesData) {
        if (!d.icdCode || !d.name) continue;
        try {
          const diagnosisData = addSchemaDefaults(d, 'diagnosis');
          await prisma.diagnosis.upsert({
            where: { icdCode: d.icdCode },
            create: diagnosisData,
            update: diagnosisData,
          });
          successful++;
        } catch (error: any) {
          console.error(`❌ Diagnosis ${d.icdCode}:`, error.message);
        }
      }
      console.log(`✅ Diagnoses: ${successful}/${diagnosesData.length}`);
    }

    // =============== 5. GDRG TARIFFS ===============
  const gdrgData = readJSON('gdrgTariffs.json');
  if (gdrgData?.gdrgTariffs && Array.isArray(gdrgData.gdrgTariffs)) {
    let successful = 0;
    let failed = 0;
    console.log(`📋 Found ${gdrgData.gdrgTariffs.length} GDRG tariffs to seed`);
    
    for (const tariff of gdrgData.gdrgTariffs) {
      try {
        // Skip if no gdrgCode
        if (!tariff.gdrgCode) {
          console.warn(`⚠️ Skipping GDRG tariff: missing gdrgCode`);
          failed++;
          continue;
        }

        await prisma.gDRGTariff.upsert({
          where: { gdrgCode: tariff.gdrgCode },
          create: {
            gdrgCode: tariff.gdrgCode,
            mdc: tariff.mdc || 'MEDI',
            description: tariff.description || 'No description',
            nhiaTariff: parseFloat(tariff.nhiaTariff) || 0,
            ageSplit: tariff.ageSplit || 'A',
            minAgeYears: tariff.minAgeYears ? parseInt(tariff.minAgeYears) : null,
            maxAgeYears: tariff.maxAgeYears ? parseInt(tariff.maxAgeYears) : null,
            applicableLevels: tariff.applicableLevels || [1, 2, 3],
            nhisServiceCode: tariff.nhisServiceCode || null,
            isZoomCode: tariff.isZoomCode || false,
            allowsAddOn: tariff.allowsAddOn || false,
            encounterCategory: tariff.encounterCategory || null,
            attendanceTypes: tariff.attendanceTypes || [],
            isAntenatal: tariff.isAntenatal || false,
            isDelivery: tariff.isDelivery || false,
            effectiveFrom: tariff.effectiveFrom ? new Date(tariff.effectiveFrom) : new Date(),
            effectiveTo: tariff.effectiveTo ? new Date(tariff.effectiveTo) : null,
            isActive: tariff.isActive ?? true,
            notes: tariff.notes || null,
          },
          update: {
            mdc: tariff.mdc || 'MEDI',
            description: tariff.description || 'No description',
            nhiaTariff: parseFloat(tariff.nhiaTariff) || 0,
            ageSplit: tariff.ageSplit || 'A',
            minAgeYears: tariff.minAgeYears ? parseInt(tariff.minAgeYears) : null,
            maxAgeYears: tariff.maxAgeYears ? parseInt(tariff.maxAgeYears) : null,
            applicableLevels: tariff.applicableLevels || [1, 2, 3],
            nhisServiceCode: tariff.nhisServiceCode || null,
            isZoomCode: tariff.isZoomCode || false,
            allowsAddOn: tariff.allowsAddOn || false,
            encounterCategory: tariff.encounterCategory || null,
            attendanceTypes: tariff.attendanceTypes || [],
            isAntenatal: tariff.isAntenatal || false,
            isDelivery: tariff.isDelivery || false,
            effectiveFrom: tariff.effectiveFrom ? new Date(tariff.effectiveFrom) : new Date(),
            effectiveTo: tariff.effectiveTo ? new Date(tariff.effectiveTo) : null,
            isActive: tariff.isActive ?? true,
            notes: tariff.notes || null,
            updatedAt: new Date()
          },
        });
        successful++;
        
        if (successful % 50 === 0) {
          console.log(`📊 GDRG progress: ${successful}/${gdrgData.gdrgTariffs.length}`);
        }
      } catch (error: any) {
        failed++;
        console.error(`❌ GDRG Tariff ${tariff.gdrgCode}:`, error.message);
      }
    }
    console.log(`✅ GDRG Tariffs: ${successful} successful, ${failed} failed (total: ${gdrgData.gdrgTariffs.length})`);
  } else {
    console.log(`⚠️ No GDRG tariffs found. File: gdrgTariffs.json`);
    if (gdrgData) {
      console.log(`📄 File has keys:`, Object.keys(gdrgData));
    }
  }

    // =============== 6. LAB TEST TEMPLATES ===============
    const labTestsData = readJSON('labTests.json');
    const labTemplateMap = new Map();
    
    if (labTestsData && Array.isArray(labTestsData)) {
      for (const test of labTestsData) {
        if (!test.investigationCode) continue;
        try {
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
        if (!scan.scanCode) continue;
        try {
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
        if (!proc.procedureCode) continue;
        try {
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

    // =============== 10. LOAD PRICING CONFIGURATION ===============
    const pricingConfig = readJSON('servicePricing.json') || { labTests: {}, scans: {}, procedures: {}, consultations: {}, medications: {} };

    // =============== 11. SERVICE CATALOG WITH PRICING ===============
    console.log('🔄 Creating unified service catalog with pricing...');
    
    const serviceCatalogEntries: any[] = [];

    // Add consultation services
    for (const ct of consultationTypes) {
      const pricing = pricingConfig.consultations?.[ct.code] || { cashPrice: ct.cashPrice, nhisPrice: ct.nhisPrice, insurancePrice: ct.insurancePrice };
      serviceCatalogEntries.push({
        name: ct.name,
        code: ct.code,
        serviceType: ServiceType.consultation,
        serviceCategory: ServiceCategory.opd,
        subType: ct.code === 'CONS-GEN' ? 'general' : 'specialist',
        nhisServiceCode: ct.code,
        consultationTypeId: consultationTypeMap.get(ct.code)?.id,
        isActive: true,
        pricing,
      });
    }

    // Add lab test services
    for (const [code, template] of labTemplateMap) {
      const pricing = pricingConfig.labTests?.[code] || { cashPrice: 80, nhisPrice: 60, insurancePrice: 75 };
      serviceCatalogEntries.push({
        name: template.name,
        code: `LAB-${code}`,
        serviceType: ServiceType.lab_test,
        serviceCategory: ServiceCategory.diagnostics,
        subType: template.category,
        nhisServiceCode: code,
        labTestTemplateId: template.id,
        isActive: true,
        pricing,
      });
    }

    // Add scan services
    for (const [code, template] of scanTemplateMap) {
      const pricing = pricingConfig.scans?.[code] || { cashPrice: 200, nhisPrice: 150, insurancePrice: 180 };
      serviceCatalogEntries.push({
        name: template.name,
        code: `SCAN-${code}`,
        serviceType: ServiceType.scan,
        serviceCategory: ServiceCategory.diagnostics,
        subType: template.category,
        nhisServiceCode: code,
        scanTemplateId: template.id,
        isActive: true,
        pricing,
      });
    }

    // Add procedure services
    for (const [code, template] of procedureTemplateMap) {
      const pricing = pricingConfig.procedures?.[code] || { cashPrice: 500, nhisPrice: 350, insurancePrice: 450 };
      serviceCatalogEntries.push({
        name: template.name,
        code: `PROC-${code}`,
        serviceType: ServiceType.procedure,
        serviceCategory: ServiceCategory.ipd,
        subType: template.category,
        nhisServiceCode: code,
        procedureTemplateId: template.id,
        isActive: true,
        pricing,
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
          metadata: service.metadata || null,
          unit: service.serviceType === 'ward' ? 'Day' : 'Each',
          createdById: adminId,
          consultationTypeId: service.consultationTypeId || null,
          labTestTemplateId: service.labTestTemplateId || null,
          scanTemplateId: service.scanTemplateId || null,
          procedureTemplateId: service.procedureTemplateId || null,
          isActive: service.isActive ?? true,
        }, 'serviceCatalog');

        const catalog = await prisma.serviceCatalog.upsert({
          where: { code: service.code },
          create: catalogData,
          update: catalogData,
        });

        if (service.pricing) {
          await createServicePricing(catalog.id, service.pricing);
        }
      } catch (error: any) {
        console.error(`❌ Service catalog ${service.code}:`, error.message);
      }
    }
    console.log(`✅ ${serviceCatalogEntries.length} service catalog entries with pricing configured`);

    // =============== 12. STOCK ITEMS (Medications & Consumables) ===============
    // ✅ PRESERVED: All original stock files
    const stockFiles = ['medications1.json', 'medications2.json', 'medications3.json', 'nhismedicines.json', 'consumables.json'];
    let totalStockProcessed = 0;

    for (const file of stockFiles) {
      const items = readJSON(file);
      if (!items || !Array.isArray(items)) {
        console.warn(`⚠️ No items found in ${file}, skipping...`);
        continue;
      }
      
      const isMedication = !file.includes('consumables');
      console.log(`📦 Processing ${file} (${isMedication ? 'Medication' : 'Consumable'}) with ${items.length} items`);
      
      for (const item of items) {
        if (!item.drugCode) {
          console.warn(`⚠️ Skipping item without drugCode in ${file}`);
          continue;
        }
        
        try {
          // ✅ Set default quantities if not provided
          const stockData = addSchemaDefaults({
            ...item,
            isMedication,
            // Default quantities for stock items - ALL set to 100
            currentStock: item.currentStock ?? 100, // Fixed quantity of 100 for all items
            reorderLevel: item.reorderLevel ?? 50,
            costPrice: item.costPrice ?? item.unitPrice ?? Math.floor(Math.random() * 100) + 10,
          }, 'stockItem');

          const stockItem = await prisma.stockItem.upsert({
            where: { drugCode: item.drugCode },
            create: stockData,
            update: stockData,
          });

          // Create ServiceCatalog entry for this stock item
          const serviceCode = `MED-${item.drugCode}`;
          const pricing = pricingConfig.medications?.[item.drugCode] || { 
            cashPrice: item.cashPrice ?? item.sellingPrice ?? item.unitPrice ?? 50,
            nhisPrice: item.nhisPrice ?? item.insurancePrice ?? (item.unitPrice ?? 50) * 0.7,
            insurancePrice: item.insurancePrice ?? item.unitPrice ?? 45,
          };

          const serviceCatalogData = addSchemaDefaults({
            name: item.name?.trim() || 'Unknown Medication',
            code: serviceCode,
            serviceType: ServiceType.medication,
            serviceCategory: ServiceCategory.pharmacy,
            subType: item.category || (isMedication ? 'medication' : 'consumable'),
            nhisServiceCode: item.drugCode,
            stockItemId: stockItem.id,
            metadata: { strength: item.strength || 'N/A', unitOfMeasure: item.unitOfMeasure || 'units' },
            createdById: adminId,
            isActive: true,
          }, 'serviceCatalog');

          const catalog = await prisma.serviceCatalog.upsert({
            where: { code: serviceCode },
            create: serviceCatalogData,
            update: serviceCatalogData,
          });

          await createServicePricing(catalog.id, pricing);
          totalStockProcessed++;
          
          if (totalStockProcessed % 50 === 0) {
            console.log(`📊 Processed ${totalStockProcessed} stock items so far...`);
          }
        } catch (error: any) {
          console.error(`❌ Stock item ${item.drugCode}:`, error.message);
        }
      }
      console.log(`✅ Completed ${file} - ${items.length} items processed`);
    }
    console.log(`✅ TOTAL: ${totalStockProcessed} stock items with service catalog entries configured`);

    // =============== 13. WARDS & BEDS ===============
    const wardsData = readJSON('wards.json');
    const existingWardCount = await prisma.ward.count();
    
    if (existingWardCount === 0) {
      const defaultWards = [
        { wardName: 'General Ward A', wardType: 'general', totalBeds: 20, dailyCashRate: 100, dailyNHISRate: 50, dailyInsuranceRate: 80 },
        { wardName: 'Maternity Ward', wardType: 'maternity', totalBeds: 12, dailyCashRate: 120, dailyNHISRate: 60, dailyInsuranceRate: 100 },
        { wardName: 'ICU', wardType: 'icu', totalBeds: 6, dailyCashRate: 500, dailyNHISRate: 300, dailyInsuranceRate: 450 },
        { wardName: 'Pediatric Ward', wardType: 'pediatric', totalBeds: 15, dailyCashRate: 80, dailyNHISRate: 40, dailyInsuranceRate: 70 },
        { wardName: 'Surgical Ward', wardType: 'surgical', totalBeds: 18, dailyCashRate: 150, dailyNHISRate: 80, dailyInsuranceRate: 130 },
      ];

      const wardsToCreate = Array.isArray(wardsData) ? wardsData : defaultWards;

      for (const ward of wardsToCreate) {
        try {
          const wardData = addSchemaDefaults(ward, 'ward');
          const createdWard = await prisma.ward.create({ data: wardData });
          
          // Create beds
          const beds = Array.from({ length: ward.totalBeds || 10 }, (_, i) => ({
            wardId: createdWard.id,
            bedNumber: `${ward.wardName.substring(0, 3).toUpperCase()}-${(i + 1).toString().padStart(2, '0')}`,
            isOccupied: false,
          }));
          await prisma.bed.createMany({ data: beds });

          // Create ServiceCatalog + ServicePricing for ward
          const serviceCode = `WARD-${ward.wardName.replace(/\s+/g, '_').toUpperCase()}`;
          const pricing = {
            cashPrice: ward.dailyCashRate ?? ward.cashPrice ?? ward.cashDailyRate ?? 100,
            nhisPrice: ward.dailyNHISRate ?? ward.nhisPrice ?? ward.nhisDailyRate ?? 50,
            insurancePrice: ward.dailyInsuranceRate ?? ward.insurancePrice ?? ward.insuranceDailyRate ?? 80,
          };

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
            isActive: true,
          }, 'serviceCatalog');

          const catalog = await prisma.serviceCatalog.upsert({
            where: { code: serviceCode },
            create: serviceCatalogData,
            update: serviceCatalogData,
          });

          await createServicePricing(catalog.id, pricing);
          console.log(`✅ Created ward: ${ward.wardName} with ${ward.totalBeds} beds`);
        } catch (error: any) {
          console.error(`❌ Error creating ward ${ward.wardName}:`, error.message);
        }
      }
      console.log(`✅ ${wardsToCreate.length} wards with beds and pricing created`);
    } else {
      console.log('ℹ️ Wards already exist, skipping ward creation');
    }

    console.log('🎉 Core data seeding completed successfully!');
    
    return { success: true, message: 'Core data seeded successfully' };

  } catch (error: any) {
    console.error('❌ Core data seeding failed:', error);
    throw error;
  }
};