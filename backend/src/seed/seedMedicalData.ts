import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import DiagnosisModel from '../models/Diagnosis.js';
import LabTestTemplateModel from '../models/LabTestTemplate.js';
import ProcedureTemplateModel from '../models/ProcedureTemplate.js';
import ScanTemplateModel from '../models/ScanTemplate.js';
import StockItemModel from '../models/StockItem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to read JSON files with comments
function readJSON5File(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON5.parse(fileContent);
  } catch (error) {
    console.error(`❌ Error parsing ${filePath}:`, error);
    throw error;
  }
}

// UPDATED: Stock Items Seeding with dual pricing
async function seedStockItems() {
  const dataDir = path.join(__dirname, '../data');
  console.log('📁 Looking for stock data files in:', dataDir);
  
  if (!fs.existsSync(dataDir)) {
    throw new Error(`Data directory not found: ${dataDir}`);
  }

  const stockItems = [];

  // Load consumables
  const consumablesPath = path.join(dataDir, 'consumables.json');
  if (fs.existsSync(consumablesPath)) {
    try {
      const consumables = readJSON5File(consumablesPath);
      console.log(`📦 Loaded ${consumables.length} consumables`);
      
      const processedConsumables = consumables.map((item: any) => ({
        name: item.name,
        category: 'consumable',
        description: item.description || item.name,
        strength: item.strength || 'N/A',
        unitOfMeasure: item.unitOfMeasure || item.unit || 'pieces',
        drugCode: item.drugCode || `CONS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        reorderLevel: item.reorderLevel || 10,
        currentStock: item.currentStock || 100,
        unitPrice: item.unitPrice || 1,
        sellingPrice: item.sellingPrice || (item.unitPrice || 1) * 1.2,
        insurancePrice: item.insurancePrice || (item.sellingPrice || 1.2) * 1.15,
        supplier: item.supplier || 'General Supplier',
        isActive: true,
        requiresAuthorization: false,
        vatRate: 0,
        isTaxable: true,
        isMedication: false
      }));
      
      stockItems.push(...processedConsumables);
    } catch (error) {
      console.error('❌ Error processing consumables.json:', error);
      throw error;
    }
  } else {
    throw new Error(`consumables.json not found at: ${consumablesPath}`);
  }

  // Load medications
  const medicationsPath = path.join(dataDir, 'medications.json');
  if (fs.existsSync(medicationsPath)) {
    try {
      const medications = readJSON5File(medicationsPath);
      console.log(`💊 Loaded ${medications.length} medications`);
      
      const processedMedications = medications.map((item: any) => ({
        name: item.name,
        category: 'medication',
        description: item.description || item.name,
        strength: item.strength || 'N/A',
        unitOfMeasure: item.unitOfMeasure || 'tablets',
        drugCode: item.drugCode || `MED-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        reorderLevel: item.reorderLevel || 50,
        currentStock: item.currentStock || 200,
        unitPrice: item.unitPrice || 5,
        sellingPrice: item.sellingPrice || 10,
        insurancePrice: item.insurancePrice || (item.sellingPrice || 10) * 1.2,
        supplier: item.supplier || 'Pharmaceutical Supplier',
        isActive: true,
        requiresAuthorization: item.requiresAuthorization || false,
        vatRate: 0,
        isTaxable: true,
        isMedication: true
      }));
      
      stockItems.push(...processedMedications);
    } catch (error) {
      console.error('❌ Error processing medications.json:', error);
      throw error;
    }
  } else {
    throw new Error(`medications.json not found at: ${medicationsPath}`);
  }

  await StockItemModel.insertMany(stockItems);
  console.log(`✅ Seeded ${stockItems.length} stock items with dual pricing`);
}

// UPDATED: Diagnoses Seeding with new schema
async function seedDiagnoses() {
  const dataDir = path.join(__dirname, '../data');
  const diagnosesPath = path.join(dataDir, 'diagnoses.json');
  
  if (!fs.existsSync(diagnosesPath)) {
    throw new Error(`diagnoses.json not found at: ${diagnosesPath}`);
  }

  try {
    const diagnoses = readJSON5File(diagnosesPath);
    
    const validDiagnoses = diagnoses.map((diagnosis: any) => ({
      name: diagnosis.name,
      icdCode: diagnosis.icdCode || diagnosis.code || `ICD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      gdrgCode: diagnosis.gdrgCode || `GDRG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      variant: diagnosis.variant || 'adult',
      description: diagnosis.description || diagnosis.name,
      cashPrice: diagnosis.cashPrice || diagnosis.price || 50,
      insurancePrice: diagnosis.insurancePrice || (diagnosis.price || 50) * 1.2,
      costPrice: diagnosis.costPrice || (diagnosis.price || 50) * 0.6,
      isActive: true,
      requiresAuthorization: diagnosis.requiresAuthorization || false,
      tariffCode: diagnosis.tariffCode,
      vatRate: 0,
      isTaxable: true
    }));
    
    await DiagnosisModel.insertMany(validDiagnoses);
    console.log(`✅ Seeded ${validDiagnoses.length} diagnoses with new schema`);
  } catch (error) {
    console.error('❌ Error seeding diagnoses:', error);
    throw error;
  }
}

// UPDATED: Lab Tests Seeding with new schema
async function seedLabTests() {
  const dataDir = path.join(__dirname, '../data');
  const labTestsPath = path.join(dataDir, 'labTests.json');
  
  if (!fs.existsSync(labTestsPath)) {
    throw new Error(`labTests.json not found at: ${labTestsPath}`);
  }

  try {
    const labTests = readJSON5File(labTestsPath);
    
    const validLabTests = labTests.map((test: any) => ({
      name: test.name,
      investigationCode: test.investigationCode || `INVE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      category: test.category || 'hematology',
      subCategory: test.subCategory,
      description: test.description || test.name,
      cashPrice: test.cashPrice || test.price || 25,
      insurancePrice: test.insurancePrice || (test.price || 25) * 1.15,
      costPrice: test.costPrice || (test.price || 25) * 0.5,
      isActive: true,
      requiresAuthorization: test.requiresAuthorization || false,
      tariffCode: test.tariffCode,
      vatRate: 0,
      isTaxable: true,
      specimenType: test.specimenType || 'blood',
      resultTemplate: test.resultTemplate || [
        {
          fieldName: 'result',
          fieldType: 'text',
          label: 'Test Result',
          referenceRange: 'Normal Range',
          options: []
        }
      ]
    }));
    
    await LabTestTemplateModel.insertMany(validLabTests);
    console.log(`✅ Seeded ${validLabTests.length} lab test templates with new schema`);
  } catch (error) {
    console.error('❌ Error seeding lab test templates:', error);
    throw error;
  }
}

// UPDATED: Procedures Seeding with new schema
async function seedProcedures() {
  const dataDir = path.join(__dirname, '../data');
  const proceduresPath = path.join(dataDir, 'procedures.json');
  
  if (!fs.existsSync(proceduresPath)) {
    throw new Error(`procedures.json not found at: ${proceduresPath}`);
  }

  try {
    const procedures = readJSON5File(proceduresPath);
    
    const validProcedures = procedures.map((procedure: any) => ({
      name: procedure.name,
      procedureCode: procedure.procedureCode || `PROC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      description: procedure.description || procedure.name,
      cashPrice: procedure.cashPrice || procedure.price || 100,
      insurancePrice: procedure.insurancePrice || (procedure.price || 100) * 1.25,
      costPrice: procedure.costPrice || (procedure.price || 100) * 0.4,
      isActive: true,
      requiresAuthorization: procedure.requiresAuthorization || false,
      tariffCode: procedure.tariffCode,
      vatRate: 0,
      isTaxable: true,
      duration: procedure.duration || 30,
      category: procedure.category || 'surgical',
      department: procedure.department || 'surgery'
    }));
    
    await ProcedureTemplateModel.insertMany(validProcedures);
    console.log(`✅ Seeded ${validProcedures.length} procedure templates with new schema`);
  } catch (error) {
    console.error('❌ Error seeding procedure templates:', error);
    throw error;
  }
}

// NEW: Scan Templates Seeding
async function seedScans() {
  const dataDir = path.join(__dirname, '../data');
  const scansPath = path.join(dataDir, 'scans.json');
  
  if (!fs.existsSync(scansPath)) {
    console.log('ℹ️  No scans.json found, skipping scan templates');
    return;
  }

  try {
    const scans = readJSON5File(scansPath);
    
    const validScans = scans.map((scan: any) => ({
      name: scan.name,
      scanCode: scan.scanCode || `SCAN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      description: scan.description || scan.name,
      category: scan.category || 'xray',
      bodyPart: scan.bodyPart || 'chest',
      cashPrice: scan.cashPrice || scan.price || 150,
      insurancePrice: scan.insurancePrice || (scan.price || 150) * 1.2,
      costPrice: scan.costPrice || (scan.price || 150) * 0.5,
      isActive: true,
      requiresAuthorization: scan.requiresAuthorization || false,
      tariffCode: scan.tariffCode,
      vatRate: 0,
      isTaxable: true,
      preparationInstructions: scan.preparationInstructions,
      duration: scan.duration || 30,
      contrastRequired: scan.contrastRequired || false,
      scanType: scan.scanType || 'plain'
    }));
    
    await ScanTemplateModel.insertMany(validScans);
    console.log(`✅ Seeded ${validScans.length} scan templates`);
  } catch (error) {
    console.error('❌ Error seeding scan templates:', error);
    throw error;
  }
}

// Main medical data seeding function
const seedMedicalData = async () => {
  try {
    console.log('🏥 Starting medical data seeding...');

    // Seed stock items
    if (await StockItemModel.countDocuments() === 0) {
      await seedStockItems();
    } else {
      console.log('✅ Stock items already seeded');
    }

    // Seed diagnoses
    if (await DiagnosisModel.countDocuments() === 0) {
      await seedDiagnoses();
    } else {
      console.log('✅ Diagnoses already seeded');
    }

    // Seed lab test templates
    if (await LabTestTemplateModel.countDocuments() === 0) {
      await seedLabTests();
    } else {
      console.log('✅ Lab test templates already seeded');
    }

    // Seed procedure templates
    if (await ProcedureTemplateModel.countDocuments() === 0) {
      await seedProcedures();
    } else {
      console.log('✅ Procedure templates already seeded');
    }

    // Seed scan templates
    if (await ScanTemplateModel.countDocuments() === 0) {
      await seedScans();
    } else {
      console.log('✅ Scan templates already seeded');
    }

    console.log('🎉 Medical data seeding completed successfully!');
    
  } catch (error) {
    console.error('💥 Error during medical data seeding:', error);
    throw error;
  }
};

export default seedMedicalData;
