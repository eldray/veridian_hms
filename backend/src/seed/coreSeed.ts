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

export const seedCoreData = async () => {
  console.log('🏥 Seeding core application data...');

  try {
    // ✅ COMPREHENSIVE CLEANUP - Delete in correct dependency order
    console.log('🗑️ Starting comprehensive data cleanup...');
    
    // Start with the most dependent tables
    await prisma.serviceRendered.deleteMany({});
    await prisma.labTest.deleteMany({});
    await prisma.medication.deleteMany({});
    await prisma.procedure.deleteMany({});
    await prisma.scan.deleteMany({});
    await prisma.vitals.deleteMany({});
    await prisma.attendanceDiagnosis.deleteMany({});
    await prisma.bill.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.admissionSecondaryDiagnosis.deleteMany({});
    await prisma.admission.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.patient.deleteMany({});
    
    // Clear service catalog references
    await prisma.serviceCatalog.deleteMany({});
    
    // Now delete templates and base data
    await prisma.labTestTemplate.deleteMany({});
    await prisma.procedureTemplate.deleteMany({});
    await prisma.scanTemplate.deleteMany({});
    await prisma.stockItem.deleteMany({});
    await prisma.diagnosis.deleteMany({});
    await prisma.consultationType.deleteMany({});
    await prisma.gDRGTariff.deleteMany({});
    
    // Clear wards and beds
    await prisma.bed.deleteMany({});
    await prisma.ward.deleteMany({});
    
    // Clear other base data
    await prisma.insuranceProvider.deleteMany({});
    await prisma.hospital.deleteMany({});
    
    // Keep users for admin access
    console.log('✅ All existing data cleared');

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
      update: {},
    });
    console.log('✅ Admin user created');

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
      update: {},
    });
    console.log('✅ Hospital seeded');

    // =============== 2. INSURANCE PROVIDERS ===============
    const providersData = readJSON('insuranceProviders.json');
    
    // Clear existing providers first
    await prisma.insuranceProvider.deleteMany({});
    
    await prisma.insuranceProvider.createMany({
      data: providersData.map(p => ({
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
      })),
      skipDuplicates: true,
    });
    console.log('✅ Insurance providers seeded');

    // =============== 3. DIAGNOSES ===============
    const diagnosesData = readJSON('diagnoses.json');
    
    // Clear existing diagnoses first
    await prisma.diagnosis.deleteMany({});
    
    await prisma.diagnosis.createMany({
      data: diagnosesData.map(d => ({
        name: d.name,
        icdCode: d.icdCode,
        gdrgCode: d.gdrgCode,
        variant: d.variant,
        description: d.description,
        isPending: d.isPending !== undefined ? d.isPending : false,
        requiresAuthorization: d.requiresAuthorization || false,
        tariffCode: d.tariffCode,
        isChronic: d.isChronic || false,
        isNHISCovered: d.isNHISCovered !== undefined ? d.isNHISCovered : true,
        category: d.category || 'medical',
      })),
      skipDuplicates: true,
    });
    console.log('✅ Diagnoses seeded');

    // =============== 4. LAB TESTS ===============
    const labTestsData = readJSON('labTests.json');
    
    await prisma.labTestTemplate.deleteMany({});
    
    await prisma.labTestTemplate.createMany({
      data: labTestsData.map(t => ({
        name: t.name,
        investigationCode: t.investigationCode,
        category: t.category || 'hematology',
        subCategory: t.subCategory,
        description: t.description,
        cashPrice: t.cashPrice || 25,
        nhisPrice: t.nhisPrice || 0,
        insurancePrice: t.insurancePrice || (t.cashPrice || 25) * 1.15,
        // FIXED: Removed costPrice (not in schema)
        isNHISCovered: t.isNHISCovered !== undefined ? t.isNHISCovered : true,
        isPrivateInsExempted: t.isPrivateInsExempted || false,
        nhisRequiresAuth: t.nhisRequiresAuth || false,
        privateInsRequiresAuth: t.privateInsRequiresAuth || false,
        isPending: t.isPending !== undefined ? t.isPending : false,
        tariffCode: t.tariffCode,
        vatRate: t.vatRate || 0,
        isTaxable: t.isTaxable !== undefined ? t.isTaxable : true,
        specimenType: t.specimenType || 'blood',
        resultTemplate: t.resultTemplate || null,
      })),
      skipDuplicates: true,
    });
    console.log('✅ Lab tests seeded');

    // =============== 5. PROCEDURES ===============
    const proceduresData = readJSON('procedures.json');
    
    await prisma.procedureTemplate.deleteMany({});
    
    await prisma.procedureTemplate.createMany({
      data: proceduresData.map(p => ({
        name: p.name,
        procedureCode: p.procedureCode,
        description: p.description,
        category: p.category || 'surgical',
        department: p.department || 'surgery',
        cashPrice: p.cashPrice || 100,
        nhisPrice: p.nhisPrice || 0,
        insurancePrice: p.insurancePrice || (p.cashPrice || 100) * 1.25,
        // FIXED: Removed costPrice (not in schema)
        isNHISCovered: p.isNHISCovered !== undefined ? p.isNHISCovered : true,
        isPrivateInsExempted: p.isPrivateInsExempted || false,
        nhisRequiresAuth: p.nhisRequiresAuth || false,
        privateInsRequiresAuth: p.privateInsRequiresAuth || false,
        isPending: p.isPending !== undefined ? p.isPending : false,
        tariffCode: p.tariffCode,
        vatRate: p.vatRate || 0,
        isTaxable: p.isTaxable !== undefined ? p.isTaxable : true,
        duration: p.duration || 30,
      })),
      skipDuplicates: true,
    });
    console.log('✅ Procedures seeded');

    // =============== 6. SCANS ===============
    const scansData = readJSON('scans.json');

    // Map your JSON categories to the actual Prisma enum values
    const categoryMap: { [key: string]: ScanCategory } = {
      'x_ray': 'xray',
      'x_ray ': 'xray',
      'xray': 'xray',
      'x-ray': 'xray',
      'ultrasound': 'ultrasound',
      'us': 'ultrasound',
      'ct_scan': 'ct_scan',
      'ct': 'ct_scan',
      'ctscan': 'ct_scan',
      'mri': 'mri',
      'mammography': 'mammography',
      'fluoroscopy': 'fluoroscopy',
      'nuclear': 'nuclear',
      'pet_scan': 'pet_scan',
      'other': 'other'
    };

    // Track used scanCodes to ensure uniqueness
    const usedScanCodes = new Set();

    const validScans = scansData
      .filter(scan => {
        if (!scan.name) {
          console.warn('Skipping scan without name');
          return false;
        }
        return true;
      })
      .map((scan, index) => {
        // Clean and map category
        const rawCategory = (scan.category || 'xray').trim().toLowerCase();
        const validCategory = categoryMap[rawCategory] || 'xray';
        
        // Generate unique investigationCode
        const uniqueInvestigationCode = scan.investigationCode && scan.investigationCode !== 'INVE30E' 
          ? scan.investigationCode 
          : `SCAN-INV-${Date.now()}-${index}`;

        // Generate unique scanCode - this is the main identifier
        let scanCode = scan.scanCode;
        if (!scanCode || usedScanCodes.has(scanCode)) {
          // Create a meaningful scan code based on category and name
          const categoryPrefix = validCategory.toUpperCase().substring(0, 3);
          const nameAbbr = scan.name
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 3)
            .toUpperCase();
          
          scanCode = `${categoryPrefix}-${nameAbbr}-${index + 1}`;
          
          // Ensure uniqueness
          let counter = 1;
          while (usedScanCodes.has(scanCode)) {
            scanCode = `${categoryPrefix}-${nameAbbr}-${index + 1}-${counter}`;
            counter++;
          }
        }
        
        usedScanCodes.add(scanCode);

        return {
          name: scan.name,
          investigationCode: uniqueInvestigationCode,
          scanCode: scanCode,
          description: scan.description || '',
          category: validCategory,
          bodyPart: (scan.bodyPart as BodyPart) || 'chest',
          cashPrice: scan.cashPrice || 150,
          nhisPrice: scan.nhisPrice || 0,
          insurancePrice: scan.insurancePrice || (scan.cashPrice || 150) * 1.2,
          // FIXED: Removed costPrice (not in schema)
          isNHISCovered: scan.isNHISCovered !== undefined ? scan.isNHISCovered : true,
          isPrivateInsExempted: scan.isPrivateInsExempted || false,
          nhisRequiresAuth: scan.nhisRequiresAuth || false,
          privateInsRequiresAuth: scan.privateInsRequiresAuth || false,
          isPending: scan.isPending !== undefined ? scan.isPending : false,
          tariffCode: scan.tariffCode || `TARIFF-SCAN-${Date.now()}-${index}`,
          vatRate: scan.vatRate || 0,
          isTaxable: scan.isTaxable !== undefined ? scan.isTaxable : true,
          preparationInstructions: scan.preparationInstructions || '',
          duration: scan.duration || 30,
          contrastRequired: scan.contrastRequired || false,
          scanType: scan.scanType || 'plain',
        };
      });

    console.log(`📊 Processing ${validScans.length} valid scans`);

    await prisma.scanTemplate.deleteMany({});

    if (validScans.length > 0) {
      await prisma.scanTemplate.createMany({
        data: validScans,
        skipDuplicates: true,
      });
      console.log('✅ Scans seeded');
    } else {
      console.log('⚠️ No valid scans to seed');
    }

    // =============== 7. STOCK ITEMS ===============
    const stockFiles = ['medications1.json', 'medications2.json', 'medications3.json', 'nhismedicines.json', 'consumables.json'];
    const stockMap = new Map<string, any>();

    console.log(`📦 Loading stock items from ${stockFiles.length} files...`);

    let totalItemsProcessed = 0;
    let duplicateItemsSkipped = 0;

    for (const file of stockFiles) {
      try {
        console.log(`📁 Reading file: ${file}`);
        const items = readJSON(file);
        console.log(`   Found ${items.length} items in ${file}`);
        
        for (const item of items) {
          totalItemsProcessed++;
          
          // Generate a unique key - prefer drugCode, fallback to name + strength
          const uniqueKey = item.drugCode || `${item.name}-${item.strength || 'N/A'}`.toLowerCase().replace(/\s+/g, '-');
          
          if (stockMap.has(uniqueKey)) {
            duplicateItemsSkipped++;
            console.warn(`   ⚠️ Duplicate item skipped: ${item.name} (${uniqueKey})`);
            continue;
          }
          
          stockMap.set(uniqueKey, {
            ...item,
            sourceFile: file,
            isMedication: !file.includes('consumables')
          });
        }
      } catch (error) {
        console.error(`❌ Error reading file ${file}:`, error);
        continue;
      }
    }

    console.log(`📊 Summary: Processed ${totalItemsProcessed} items, ${duplicateItemsSkipped} duplicates skipped, ${stockMap.size} unique items to seed`);

    // Delete existing stock items
    console.log('🗑️ Clearing existing stock items...');
    await prisma.stockItem.deleteMany({});

    // Prepare data for insertion - FIXED to match schema
    const stockItemsToCreate = Array.from(stockMap.values()).map((item, index) => {
      const isMedication = item.isMedication;
      const defaultCategory = isMedication ? 'medication' : 'consumable';
      
      return {
        name: item.name?.trim() || `Unknown Item ${index + 1}`,
        category: item.category || defaultCategory,
        description: item.description || '',
        strength: item.strength || 'N/A',
        unitOfMeasure: item.unitOfMeasure || (isMedication ? 'tablets' : 'units'),
        drugCode: item.drugCode || `DRUG-${Date.now()}-${index}`,
        reorderLevel: Math.max(0, item.reorderLevel || 50),
        currentStock: Math.max(0, item.currentStock || 200),
        // FIXED: Using correct field names from schema
        costPrice: Math.max(0, item.costPrice || 5),
        cashPrice: Math.max(0, item.cashPrice || 10),
        nhisPrice: Math.max(0, item.nhisPrice || 0),
        insurancePrice: Math.max(0, item.insurancePrice || (item.cashPrice || 10) * 1.2),
        // FIXED: Added missing insurance fields
        isNHISCovered: item.isNHISCovered !== undefined ? item.isNHISCovered : true,
        isPrivateInsExempted: item.isPrivateInsExempted || false,
        nhisRequiresAuth: item.nhisRequiresAuth || false,
        privateInsRequiresAuth: item.privateInsRequiresAuth || false,
        supplier: item.supplier || 'Default Supplier',
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        batchNumber: item.batchNumber || `BATCH-${Date.now().toString(36).toUpperCase()}`,
        isPending: item.isPending !== undefined ? item.isPending : false,
        // FIXED: Removed requiresAuthorization (not in schema for StockItem)
        tariffCode: item.tariffCode || `TARIFF-${defaultCategory.toUpperCase()}-${index + 1}`,
        vatRate: item.vatRate || 0,
        isTaxable: item.isTaxable !== undefined ? item.isTaxable : true,
        isMedication: isMedication,
      };
    });

    // Insert stock items
    if (stockItemsToCreate.length > 0) {
      console.log(`💾 Inserting ${stockItemsToCreate.length} stock items...`);
      
      const BATCH_SIZE = 100;
      for (let i = 0; i < stockItemsToCreate.length; i += BATCH_SIZE) {
        const batch = stockItemsToCreate.slice(i, i + BATCH_SIZE);
        await prisma.stockItem.createMany({
          data: batch,
          skipDuplicates: true,
        });
        console.log(`   ✅ Batch ${Math.floor(i/BATCH_SIZE) + 1} completed: ${batch.length} items`);
      }
      
      console.log(`🎉 Stock items seeded successfully! Total: ${stockItemsToCreate.length} items`);
      
      const medicationCount = stockItemsToCreate.filter(item => item.isMedication).length;
      const consumableCount = stockItemsToCreate.filter(item => !item.isMedication).length;
      
      console.log(`📈 Breakdown: ${medicationCount} medications, ${consumableCount} consumables`);
      
    } else {
      console.log('⚠️ No stock items to seed');
    }

    // Verify the insertion
    const finalCount = await prisma.stockItem.count();
    console.log(`🔍 Verification: ${finalCount} stock items in database`);

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

    await prisma.serviceCatalog.deleteMany({});
    
    await prisma.serviceCatalog.createMany({
      data: consultationServices.map(svc => ({
        name: svc.name,
        code: svc.code,
        serviceType: svc.serviceType,
        serviceCategory: svc.serviceCategory,
        cashPrice: svc.cashPrice,
        nhisPrice: svc.nhisPrice,
        insurancePrice: svc.insurancePrice,
        // FIXED: Removed costPrice (not in schema)
        unit: 'Each',
        isPending: false,
        // FIXED: Removed requiresAuthorization (not in schema)
        vatRate: 0,
        isTaxable: false,
        nhisServiceCode: svc.nhisServiceCode,
        // FIXED: Removed nhisCategory (not in schema)
        isNHISCovered: true,
        nhisCoverageType: 'full' as NHISCoverageType,
        nhisRequiresAuth: false,
        privateInsRequiresAuth: false,
        isPrivateInsuranceExempted: false,
        requiresClinicalNotes: false,
        createdById: adminId,
      })),
      skipDuplicates: true,
    });
    console.log('✅ Service catalog seeded');

    // =============== 9. WARDS & BEDS ===============
    await prisma.ward.deleteMany({});
    
    await prisma.ward.createMany({
      data: [
        { 
          wardName: 'General Ward A', 
          wardType: 'general', 
          totalBeds: 20, 
          occupiedBeds: 0, 
          cashDailyRate: 50, 
          nhisDailyRate: 40,
          insuranceDailyRate: 60, 
          isNHISCovered: true,
          nhisRequiresAuth: false,
          isPrivateInsExempted: false,
          isPending: false, 
          requiresAuthorization: false, 
          tariffCode: 'WARD-GEN-A', 
          vatRate: 0, 
          isTaxable: true 
        },
        { 
          wardName: 'Maternity Ward', 
          wardType: 'maternity', 
          totalBeds: 12, 
          occupiedBeds: 0, 
          cashDailyRate: 80, 
          nhisDailyRate: 60,
          insuranceDailyRate: 100, 
          isNHISCovered: true,
          nhisRequiresAuth: false,
          isPrivateInsExempted: false,
          isPending: false, 
          requiresAuthorization: false, 
          tariffCode: 'WARD-MAT', 
          vatRate: 0, 
          isTaxable: true 
        },
        { 
          wardName: 'ICU', 
          wardType: 'icu', 
          totalBeds: 6, 
          occupiedBeds: 0, 
          cashDailyRate: 200, 
          nhisDailyRate: 150,
          insuranceDailyRate: 250, 
          isNHISCovered: true,
          nhisRequiresAuth: true,
          isPrivateInsExempted: false,
          isPending: false, 
          requiresAuthorization: true, 
          tariffCode: 'WARD-ICU', 
          vatRate: 0, 
          isTaxable: true 
        },
      ],
      skipDuplicates: true,
    });

    // Create beds for general ward
    const generalWard = await prisma.ward.findFirst({ where: { wardName: 'General Ward A' } });
    if (generalWard) {
      await prisma.bed.deleteMany({});
      
      const beds = Array.from({ length: 20 }, (_, i) => ({
        wardId: generalWard.id,
        bedNumber: `GA-${i + 1}`,
        isOccupied: false,
      }));
      await prisma.bed.createMany({ data: beds, skipDuplicates: true });
    }
    console.log('✅ Wards and beds seeded');

    // =============== 10. GDRG TARIFFS ===============
    await prisma.gDRGTariff.deleteMany({});
    
    const malariaDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'A12.3' } });
    if (malariaDiag) {
      await prisma.gDRGTariff.create({
        data: {
          gdrgCode: malariaDiag.gdrgCode,
          description: 'Malaria without complications',
          nhiaTariff: 45.5,
          effectiveFrom: new Date('2024-01-01'),
          isActive: true,
        },
      });
    }
    console.log('✅ GDRG tariffs seeded');

    // =============== 11. CONSULTATION TYPES ===============
    await prisma.consultationType.deleteMany({});
    
    await prisma.consultationType.createMany({
      data: [
        {
          name: 'General Consultation',
          code: 'CONS-GEN',
          cashPrice: 100,
          nhisPrice: 0,
          insurancePrice: 0,
          isNHISCovered: true,
          isPrivateInsExempted: false,
          isActive: true,
        },
        {
          name: 'Specialist Consultation',
          code: 'CONS-SPEC',
          cashPrice: 200,
          nhisPrice: 50,
          insurancePrice: 50,
          isNHISCovered: true,
          isPrivateInsExempted: false,
          isActive: true,
        }
      ],
      skipDuplicates: true,
    });
    console.log('✅ Consultation types seeded');

    console.log('🎉 Core data seeding completed!');
  } catch (error) {
    console.error('❌ Core data seeding failed:', error);
    throw error;
  }
};