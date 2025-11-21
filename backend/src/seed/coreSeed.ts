import { PrismaClient, ScanCategory, BodyPart, ServiceType, ServiceCategory, NHISCoverageType } from '@prisma/client';
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
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

// Helper: hash password
const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

// ✅ NEW: Check if core data already exists
const hasCoreData = async (): Promise<boolean> => {
  console.log('🔍 Checking if core data exists...');
  
  try {
    const [
      diagnosisCount, 
      labTestCount, 
      stockItemCount, 
      procedureCount,  // ← Add procedure count
      scanCount,       // ← Add scan count
      wardCount
    ] = await Promise.all([
      prisma.diagnosis.count(),
      prisma.labTestTemplate.count(),
      prisma.stockItem.count(),
      prisma.procedureTemplate.count(),  // ← Count procedure templates
      prisma.scanTemplate.count(),       // ← Count scan templates
      prisma.ward.count()
    ]);

    const hasData = diagnosisCount > 0 && 
                   labTestCount > 0 && 
                   stockItemCount > 0 && 
                   procedureCount > 0 &&   // ← Include procedures
                   scanCount > 0 &&        // ← Include scans
                   wardCount > 0;

    console.log('📊 Core data check:', {
      diagnoses: diagnosisCount,
      labTests: labTestCount,
      stockItems: stockItemCount,
      procedures: procedureCount,    // ← Add to log
      scans: scanCount,              // ← Add to log
      wards: wardCount,
      hasCoreData: hasData
    });

    return hasData;
  } catch (error) {
    console.error('❌ Error checking core data:', error);
    return false;
  }
};

// ✅ NEW: Check if there's any patient data (real or test)
const hasAnyPatientData = async (): Promise<boolean> => {
  try {
    const patientCount = await prisma.patient.count();
    return patientCount > 0;
  } catch (error) {
    console.error('❌ Error checking patient data:', error);
    return false;
  }
};

export const seedCoreData = async (force: boolean = false) => {
  console.log('🏥 Starting core data seeding...');

  try {
    // ✅ SAFETY CHECK: Don't delete data in production unless forced
    if (process.env.NODE_ENV === 'production' && !force) {
      console.log('🚨 PRODUCTION SAFETY: Core data seeding disabled in production');
      return {
        success: false,
        message: 'Core data seeding is disabled in production for safety',
        productionSafety: true
      };
    }

    // ✅ CHECK: If core data exists and we're not forcing, skip seeding
    const coreDataExists = await hasCoreData();
    
    if (coreDataExists && !force) {
      console.log('✅ Core data already exists. Skipping core seeding.');
      console.log('💡 Use force=true to re-seed core data (will preserve patient data)');
      return {
        success: true,
        message: 'Core data already exists. No seeding needed.',
        existingCoreData: true,
        skipped: true
      };
    }

    // ✅ CHECK: Warn if there's patient data
    const hasPatients = await hasAnyPatientData();
    if (hasPatients && !force) {
      console.log('⚠️  WARNING: Patient data detected in database.');
      console.log('⚠️  Core data seeding will preserve patient data but may cause issues.');
      console.log('💡 Recommendation: Backup your database before proceeding.');
      
      // In production, abort if there's patient data
      if (process.env.NODE_ENV === 'production') {
        console.log('🚨 SAFETY STOP: Cannot seed core data with existing patient data in production');
        return {
          success: false,
          message: 'Cannot seed core data with existing patient data in production',
          patientDataDetected: true
        };
      }
    }

    console.log('🔧 Proceeding with core data seeding...');

    // ✅ SAFE CLEANUP: Only delete core data tables, NOT patient-related tables
    console.log('🗑️ Cleaning up old core data (preserving patient data)...');
    
    // Delete only core configuration data, not patient data
    await prisma.serviceCatalog.deleteMany({});
    await prisma.gDRGTariff.deleteMany({});
    await prisma.consultationType.deleteMany({});
    
    // Only delete templates if forcing or no patient data exists
    if (force || !hasPatients) {
      await prisma.labTestTemplate.deleteMany({});
      await prisma.procedureTemplate.deleteMany({});
      await prisma.scanTemplate.deleteMany({});
      await prisma.stockItem.deleteMany({});
      await prisma.diagnosis.deleteMany({});
    }
    
    // Clear wards and beds only if no admissions exist
    const admissionCount = await prisma.admission.count();
    if (admissionCount === 0) {
      await prisma.bed.deleteMany({});
      await prisma.ward.deleteMany({});
    } else {
      console.log('⚠️  Skipping ward/bed cleanup - active admissions exist');
    }
    
    // Insurance providers can be safely updated
    await prisma.insuranceProvider.deleteMany({});
    
    console.log('✅ Core data cleanup completed (patient data preserved)');

    // =============== 0. CREATE ADMIN USER ===============
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      create: {
        username: 'admin',
        password: hashPassword('admin123'),
        fullName: 'System Administrator',
        role: 'admin',
        email: 'admin@hospital.com',
        phone: '+233244111111',
        licenseNumber: 'ADMIN-001',
        isActive: true,
      },
      update: {}, // Don't update if exists
    });
    console.log('✅ Admin user created/verified');

    const adminId = adminUser.id;

    // =============== 1. HOSPITAL ===============
    await prisma.hospital.upsert({
      where: { nhisFacilityCode: 'GH001' },
      create: {
        name: 'General Hospital',
        address: '123 Medical Center Drive, Healthcare City, Accra',
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
      update: {}, // Don't overwrite if exists
    });
    console.log('✅ Hospital configured');

    // =============== 2. INSURANCE PROVIDERS ===============
    const providersData = readJSON('insuranceProviders.json');
    
    for (const p of providersData) {
      await prisma.insuranceProvider.upsert({
        where: { name: p.name },
        create: {
          name: p.name,
          type: p.type || 'private',
          coveragePercentage: p.coveragePercentage || 100,
          contactInfo: p.contactInfo || { 
            phone: p.phone || '+233000000000', 
            email: p.email || 'info@provider.com', 
            address: p.address || 'Accra, Ghana',
            contactPerson: p.contactPerson || 'Manager'
          },
          isActive: p.isActive !== undefined ? p.isActive : true,
        },
        update: {}, // Don't overwrite existing
      });
    }
    console.log('✅ Insurance providers configured');

// In src/seed/coreSeed.ts - UPDATE THE DIAGNOSES SECTION


// =============== 3. DIAGNOSES ===============
// =============== 3. DIAGNOSES ===============
const diagnosesData = readJSON('diagnoses.json');

// Track processing stats
const processingStats = {
  total: diagnosesData.length,
  successful: 0,
  duplicates: 0,
  errors: 0
};

const seenICDCodes = new Set();
const duplicates = [];
const errors = [];

for (const d of diagnosesData) {
  try {
    // Validate required fields
    if (!d.icdCode || !d.name) {
      errors.push({ icdCode: d.icdCode, name: d.name, error: 'Missing ICD code or name' });
      processingStats.errors++;
      continue;
    }

    // ✅ Check for duplicate ICD codes
    if (seenICDCodes.has(d.icdCode)) {
      console.warn(`❌ DUPLICATE ICD CODE: ${d.icdCode} - ${d.name}`);
      duplicates.push({ icdCode: d.icdCode, name: d.name });
      processingStats.duplicates++;
      continue;
    }
    
    seenICDCodes.add(d.icdCode);

    // ✅ Validate and map category to ensure it matches Prisma enum
    const validCategories = [
      'infectiousAndParasitic', 'neoplasms', 'bloodAndImmune', 'endocrineNutritionalMetabolic',
      'mentalAndBehavioral', 'nervousSystem', 'eyeAndAdnexa', 'earAndMastoid', 'circulatory',
      'respiratory', 'digestive', 'skinAndSubcutaneous', 'musculoskeletal', 'genitourinary',
      'pregnancyChildbirthPuerperium', 'perinatalPeriod', 'congenitalMalformations',
      'symptomsSignsAbnormalFindings', 'injuryPoisoningExternalCauses', 'externalMorbidity',
      'factorsInfluencingHealthStatus'
    ];

    // Ensure category is valid, fallback to first category if invalid
    const category = validCategories.includes(d.category) ? d.category : 'infectiousAndParasitic';

    await prisma.diagnosis.upsert({
      where: { icdCode: d.icdCode },
      create: {
        name: d.name,
        icdCode: d.icdCode,
        gdrgCode: d.gdrgCode || `GDRG-${d.icdCode}`, // Provide default if missing
        description: d.description || '',
        category: category,
      },
      update: {}, // Don't overwrite existing
    });

    processingStats.successful++;

  } catch (error) {
    console.error(`❌ ERROR processing diagnosis: ${d.icdCode} - ${d.name}`, error);
    errors.push({ icdCode: d.icdCode, name: d.name, error: error.message });
    processingStats.errors++;
  }
}

// Comprehensive reporting
console.log(`\n📊 DIAGNOSES PROCESSING REPORT:`);
console.log(`✅ Successful: ${processingStats.successful}`);
console.log(`⚠️  Duplicates: ${processingStats.duplicates}`);
console.log(`❌ Errors: ${processingStats.errors}`);
console.log(`📈 Success Rate: ${((processingStats.successful / processingStats.total) * 100).toFixed(1)}%`);

if (duplicates.length > 0) {
  console.warn(`\n⚠️  SKIPPED DUPLICATES (${duplicates.length}):`);
  duplicates.forEach(dup => {
    console.warn(`   - ${dup.icdCode}: ${dup.name}`);
  });
}

if (errors.length > 0) {
  console.error(`\n❌ PROCESSING ERRORS (${errors.length}):`);
  errors.forEach(err => {
    console.error(`   - ${err.icdCode}: ${err.name} - ${err.error}`);
  });
}

console.log(`\n✅ Diagnoses configuration completed`);

// =============== 4. LAB TESTS ===============
const labTestsData = readJSON('labTests.json');

for (const t of labTestsData) {
  await prisma.labTestTemplate.upsert({
    where: { investigationCode: t.investigationCode },
    create: {
      name: t.name,
      investigationCode: t.investigationCode,
      category: t.category || 'hematology',
      subCategory: t.subCategory,
      description: t.description,
      cashPrice: t.cashPrice || 25,
      nhisPrice: t.nhisPrice || t.insurancePrice || (t.cashPrice || 25) * 0.7, // Default to 70% of cash price
      insurancePrice: t.insurancePrice || (t.cashPrice || 25) * 1.15,
      isNHISCovered: t.isNHISCovered !== undefined ? t.isNHISCovered : true,
      isPrivateInsExempted: t.isPrivateInsExempted !== undefined ? t.isPrivateInsExempted : false,
      isActive: t.isActive !== undefined ? t.isActive : true,
      tariffCode: t.tariffCode,
      vatRate: t.vatRate || 0,
      isTaxable: t.isTaxable !== undefined ? t.isTaxable : true,
      specimenType: t.specimenType || 'blood',
      resultTemplate: t.resultTemplate || null,
    },
    update: {
      // Update missing fields if they exist in JSON but not in DB
      nhisPrice: t.nhisPrice || t.insurancePrice || (t.cashPrice || 25) * 0.7,
      isNHISCovered: t.isNHISCovered !== undefined ? t.isNHISCovered : true,
      isPrivateInsExempted: t.isPrivateInsExempted !== undefined ? t.isPrivateInsExempted : false,
      isActive: t.isActive !== undefined ? t.isActive : true,
    },
  });
}
console.log('✅ Lab tests configured');

// =============== 5. PROCEDURES ===============
const proceduresData = readJSON('procedures.json');

for (const p of proceduresData) {
  await prisma.procedureTemplate.upsert({
    where: { procedureCode: p.procedureCode },
    create: {
      name: p.name,
      procedureCode: p.procedureCode,
      description: p.description,
      category: p.category || 'surgical',
      department: p.department || 'surgery',
      cashPrice: p.cashPrice || 100,
      nhisPrice: p.nhisPrice || p.insurancePrice || (p.cashPrice || 100) * 0.7,
      insurancePrice: p.insurancePrice || (p.cashPrice || 100) * 1.15,
      isNHISCovered: p.isNHISCovered !== undefined ? p.isNHISCovered : true,
      isPrivateInsExempted: p.isPrivateInsExempted !== undefined ? p.isPrivateInsExempted : false,
      isActive: p.isActive !== undefined ? p.isActive : true,
      tariffCode: p.tariffCode,
      vatRate: p.vatRate || 0,
      isTaxable: p.isTaxable !== undefined ? p.isTaxable : true,
      duration: p.duration || 30,
    },
    update: {
      // Update missing fields if they exist in JSON but not in DB
      nhisPrice: p.nhisPrice || p.insurancePrice || (p.cashPrice || 100) * 0.7,
      isNHISCovered: p.isNHISCovered !== undefined ? p.isNHISCovered : true,
      isPrivateInsExempted: p.isPrivateInsExempted !== undefined ? p.isPrivateInsExempted : false,
      isActive: p.isActive !== undefined ? p.isActive : true,
    },
  });
}
console.log('✅ Procedures configured');

// =============== 6. SCANS ===============
const scansData = readJSON('scans.json');

const categoryMap: { [key: string]: ScanCategory } = {
  'x_ray': 'xray', 'x_ray ': 'xray', 'xray': 'xray', 'x-ray': 'xray',
  'ultrasound': 'ultrasound', 'us': 'ultrasound',
  'ct_scan': 'ct_scan', 'ct': 'ct_scan', 'ctscan': 'ct_scan',
  'mri': 'mri', 'mammography': 'mammography', 'fluoroscopy': 'fluoroscopy',
  'nuclear': 'nuclear', 'pet_scan': 'pet_scan', 'other': 'other'
};

for (const scan of scansData) {
  if (!scan.name || !scan.scanCode) continue;

  const rawCategory = (scan.category || 'xray').trim().toLowerCase();
  const validCategory = categoryMap[rawCategory] || 'xray';

  await prisma.scanTemplate.upsert({
    where: { scanCode: scan.scanCode },
    create: {
      name: scan.name,
      investigationCode: scan.investigationCode || `SCAN-${scan.scanCode}`,
      scanCode: scan.scanCode,
      description: scan.description || '',
      category: validCategory,
      bodyPart: (scan.bodyPart as BodyPart) || 'chest',
      cashPrice: scan.cashPrice || 150,
      nhisPrice: scan.nhisPrice || scan.insurancePrice || (scan.cashPrice || 150) * 0.7,
      insurancePrice: scan.insurancePrice || (scan.cashPrice || 150) * 1.2,
      isNHISCovered: scan.isNHISCovered !== undefined ? scan.isNHISCovered : true,
      isPrivateInsExempted: scan.isPrivateInsExempted !== undefined ? scan.isPrivateInsExempted : false,
      isActive: scan.isActive !== undefined ? scan.isActive : true,
      tariffCode: scan.tariffCode || `TARIFF-${scan.scanCode}`,
      vatRate: scan.vatRate || 0,
      isTaxable: scan.isTaxable !== undefined ? scan.isTaxable : true,
      preparationInstructions: scan.preparationInstructions || '',
      duration: scan.duration || 30,
      contrastRequired: scan.contrastRequired || false,
      scanType: scan.scanType || 'plain',
    },
    update: {
      // Update missing fields if they exist in JSON but not in DB
      nhisPrice: scan.nhisPrice || scan.insurancePrice || (scan.cashPrice || 150) * 0.7,
      isNHISCovered: scan.isNHISCovered !== undefined ? scan.isNHISCovered : true,
      isPrivateInsExempted: scan.isPrivateInsExempted !== undefined ? scan.isPrivateInsExempted : false,
      isActive: scan.isActive !== undefined ? scan.isActive : true,
    },
  });
}
console.log('✅ Scans configured');

    // =============== 7. STOCK ITEMS ===============
// =============== 7. STOCK ITEMS ===============
const stockFiles = ['medications1.json', 'medications2.json', 'medications3.json', 'nhismedicines.json', 'consumables.json'];

let totalStockProcessed = 0;

for (const file of stockFiles) {
  try {
    const items = readJSON(file);
    const isMedication = !file.includes('consumables');
    
    for (const item of items) {
      if (!item.drugCode) continue;
      
      // Fix field name mappings
      const costPrice = item.costPrice || item.unitPrice || 5;
      const cashPrice = item.cashPrice || item.sellingPrice || 10;
      const insurancePrice = item.insurancePrice || cashPrice * 1.2;
      const nhisPrice = item.nhisPrice || cashPrice * 0.7; // Default to 70% of cash price
      
      await prisma.stockItem.upsert({
        where: { drugCode: item.drugCode },
        create: {
          name: item.name?.trim() || 'Unknown Item',
          category: item.category || (isMedication ? 'medication' : 'consumable'),
          description: item.description || '',
          strength: item.strength || 'N/A',
          unitOfMeasure: item.unitOfMeasure || (isMedication ? 'tablets' : 'units'),
          drugCode: item.drugCode,
          reorderLevel: Math.max(0, item.reorderLevel || 50),
          currentStock: Math.max(0, item.currentStock || 200), // Fixed: Don't use 0 stock
          costPrice: Math.max(0, costPrice),
          cashPrice: Math.max(0, cashPrice),
          nhisPrice: Math.max(0, nhisPrice),
          insurancePrice: Math.max(0, insurancePrice),
          isNHISCovered: item.isNHISCovered !== undefined ? item.isNHISCovered : true,
          isPrivateInsExempted: item.isPrivateInsExempted !== undefined ? item.isPrivateInsExempted : false,
          supplier: item.supplier || 'Default Supplier',
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          batchNumber: item.batchNumber || `BATCH-${Date.now().toString(36).toUpperCase()}`,
          isActive: item.isActive !== undefined ? item.isActive : true,
          tariffCode: item.tariffCode || `TARIFF-${item.drugCode}`,
          vatRate: item.vatRate || 0,
          isTaxable: item.isTaxable !== undefined ? item.isTaxable : true,
          isMedication: isMedication,
        },
        update: {
          // Update missing fields if they exist in JSON but not in DB
          nhisPrice: Math.max(0, nhisPrice),
          isNHISCovered: item.isNHISCovered !== undefined ? item.isNHISCovered : true,
          isPrivateInsExempted: item.isPrivateInsExempted !== undefined ? item.isPrivateInsExempted : false,
          isActive: item.isActive !== undefined ? item.isActive : true,
        },
      });
      
      totalStockProcessed++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error);
  }
}
console.log(`✅ Stock items configured: ${totalStockProcessed} items`);

    // =============== 8. SERVICE CATALOG ===============
    const consultationServices = [
      { 
        name: 'General Outpatient Consultation', 
        code: 'CONS-GEN', 
        serviceType: 'consultation' as ServiceType, 
        serviceCategory: 'opd' as ServiceCategory, 
        nhisServiceCode: 'OPD001', 
        cashPrice: 100, 
        nhisPrice: 0, 
        insurancePrice: 0 
      },
      { 
        name: 'Antenatal Care Visit (1st)', 
        code: 'ANC-01', 
        serviceType: 'consultation' as ServiceType, 
        serviceCategory: 'opd' as ServiceCategory, 
        nhisServiceCode: 'ANC001', 
        cashPrice: 40, 
        nhisPrice: 0, 
        insurancePrice: 0 
      },
      { 
        name: 'Specialist Consultation', 
        code: 'CONS-SPEC', 
        serviceType: 'consultation' as ServiceType, 
        serviceCategory: 'opd' as ServiceCategory, 
        nhisServiceCode: 'OPD002', 
        cashPrice: 200, 
        nhisPrice: 10, 
        insurancePrice: 10 
      },
    ];
    
    for (const svc of consultationServices) {
      await prisma.serviceCatalog.upsert({
        where: { code: svc.code },
        create: {
          name: svc.name,
          code: svc.code,
          serviceType: svc.serviceType,
          serviceCategory: svc.serviceCategory,
          cashPrice: svc.cashPrice,
          nhisPrice: svc.nhisPrice,
          insurancePrice: svc.insurancePrice,
          unit: 'Each',
          vatRate: 0,
          isTaxable: false,
          nhisServiceCode: svc.nhisServiceCode,
          isNHISCovered: true,
          nhisCoverageType: 'full' as NHISCoverageType,
          isPrivateInsuranceExempted: false,
          requiresClinicalNotes: false,
          isActive: true, // ← ADD THIS REQUIRED FIELD
          tariffCode: svc.nhisServiceCode, // ← ADD TARIFF CODE (using nhisServiceCode as base)
          createdById: adminId,
        },
        update: {
          // Update missing fields if they exist in JSON but not in DB
          isActive: true,
          tariffCode: svc.nhisServiceCode,
        },
      });
    }
    console.log('✅ Service catalog configured');
    
    // =============== 9. WARDS & BEDS ===============
    // Only create if no wards exist
    const existingWardCount = await prisma.ward.count();
    
    if (existingWardCount === 0) {
      const wardsToCreate = [
        { wardName: 'General Ward A', wardType: 'general', totalBeds: 20, occupiedBeds: 0, cashDailyRate: 50, nhisDailyRate: 40, insuranceDailyRate: 60, isNHISCovered: true, isPrivateInsExempted: false, tariffCode: 'WARD-GEN-A', vatRate: 0, isTaxable: true },
        { wardName: 'Maternity Ward', wardType: 'maternity', totalBeds: 12, occupiedBeds: 0, cashDailyRate: 80, nhisDailyRate: 60, insuranceDailyRate: 100, isNHISCovered: true, isPrivateInsExempted: false, tariffCode: 'WARD-MAT', vatRate: 0, isTaxable: true },
        { wardName: 'ICU', wardType: 'icu', totalBeds: 6, occupiedBeds: 0, cashDailyRate: 200, nhisDailyRate: 150, insuranceDailyRate: 250, isNHISCovered: true, isPrivateInsExempted: false, tariffCode: 'WARD-ICU', vatRate: 0, isTaxable: true },
      ];

      for (const ward of wardsToCreate) {
        const createdWard = await prisma.ward.create({ data: ward });
        
        // Create beds for this ward
        const beds = Array.from({ length: ward.totalBeds }, (_, i) => ({
          wardId: createdWard.id,
          bedNumber: `${ward.wardName.substring(0, 2).toUpperCase()}-${i + 1}`,
          isOccupied: false,
        }));
        
        await prisma.bed.createMany({ data: beds });
      }
      
      console.log('✅ Wards and beds created');
    } else {
      console.log('ℹ️  Wards already exist, skipping ward creation');
    }

    // =============== 10. GDRG TARIFFS ===============
    const malariaDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'A12.3' } });
    if (malariaDiag) {
      await prisma.gDRGTariff.upsert({
        where: { gdrgCode: malariaDiag.gdrgCode },
        create: {
          gdrgCode: malariaDiag.gdrgCode,
          description: 'Malaria without complications',
          nhiaTariff: 45.5,
          effectiveFrom: new Date('2024-01-01'),
          isActive: true,
        },
        update: {},
      });
    }
    console.log('✅ GDRG tariffs configured');

    // =============== 11. CONSULTATION TYPES ===============
    const consultationTypes = [
      { name: 'General Consultation', code: 'CONS-GEN', cashPrice: 100, nhisPrice: 0, insurancePrice: 0, isNHISCovered: true, isPrivateInsExempted: false, isActive: true },
      { name: 'Specialist Consultation', code: 'CONS-SPEC', cashPrice: 200, nhisPrice: 50, insurancePrice: 50, isNHISCovered: true, isPrivateInsExempted: false, isActive: true }
    ];

    for (const ct of consultationTypes) {
      await prisma.consultationType.upsert({
        where: { code: ct.code },
        create: ct,
        update: {},
      });
    }
    console.log('✅ Consultation types configured');

    console.log('🎉 Core data seeding completed successfully!');
    
    return {
      success: true,
      message: 'Core data seeded successfully',
      preservedPatientData: hasPatients
    };

  } catch (error) {
    console.error('❌ Core data seeding failed:', error);
    throw error;
  }
};