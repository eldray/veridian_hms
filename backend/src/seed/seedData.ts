// seed/seedData.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import UserModel from '../models/User.js';
import PatientModel from '../models/Patient.js';
import AttendanceModel from '../models/Attendance.js';
import StockItemModel from '../models/StockItem.js';
import DiagnosisModel from '../models/Diagnosis.js';
import InsuranceProviderModel from '../models/InsuranceProvider.js';
import LabTestTemplateModel from '../models/LabTestTemplate.js';
import ProcedureTemplateModel from '../models/ProcedureTemplate.js';
import HospitalModel from '../models/Hospital.js';
import WardModel from '../models/Ward.js';
import bcrypt from 'bcryptjs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedData = async () => {
  try {
    console.log('Starting database seeding...');

    // Seed users with new fields
    if (await UserModel.countDocuments() === 0) {
      const mockUsers = [
        { 
          username: 'admin', 
          password: await bcrypt.hash('admin123', 10), 
          fullName: 'System Administrator', 
          role: 'admin', 
          email: 'admin@hospital.com', 
          phone: '+233244111111',
          licenseNumber: 'ADMIN-001',
          isActive: true
        },
        { 
          username: 'doctor1', 
          password: await bcrypt.hash('doctor123', 10), 
          fullName: 'Dr. John Smith', 
          role: 'doctor', 
          email: 'doctor@hospital.com', 
          phone: '+233244222222',
          licenseNumber: 'MD-12345',
          specialization: 'General Medicine',
          isActive: true
        },
        { 
          username: 'nurse1', 
          password: await bcrypt.hash('nurse123', 10), 
          fullName: 'Nurse Mary Johnson', 
          role: 'nurse', 
          email: 'nurse@hospital.com', 
          phone: '+233244333333',
          licenseNumber: 'RN-54321',
          isActive: true
        },
        { 
          username: 'midwife1', 
          password: await bcrypt.hash('midwife123', 10), 
          fullName: 'Midwife Grace Mensah', 
          role: 'midwife', 
          email: 'midwife@hospital.com', 
          phone: '+233244444444',
          licenseNumber: 'MW-98765',
          isActive: true
        },
        { 
          username: 'records1', 
          password: await bcrypt.hash('records123', 10), 
          fullName: 'Records Officer David Osei', 
          role: 'records', 
          email: 'records@hospital.com', 
          phone: '+233244555555',
          isActive: true
        },
        { 
          username: 'lab1', 
          password: await bcrypt.hash('lab123', 10), 
          fullName: 'Lab Tech David Lee', 
          role: 'lab_tech', 
          email: 'lab@hospital.com', 
          phone: '+233244666666',
          licenseNumber: 'LT-11223',
          isActive: true
        },
        { 
          username: 'pharma1', 
          password: await bcrypt.hash('pharma123', 10), 
          fullName: 'Pharmacist Sarah Wilson', 
          role: 'pharmacist', 
          email: 'pharma@hospital.com', 
          phone: '+233244777777',
          licenseNumber: 'PH-44556',
          isActive: true
        },
        { 
          username: 'accounts1', 
          password: await bcrypt.hash('accounts123', 10), 
          fullName: 'Accountant Michael Brown', 
          role: 'accounts', 
          email: 'accounts@hospital.com', 
          phone: '+233244888888',
          isActive: true
        },
      ];
      await UserModel.insertMany(mockUsers);
      console.log('✅ Seeded mock users');
    } else {
      console.log('✅ Users already seeded');
    }

    // Seed hospital
    if (await HospitalModel.countDocuments() === 0) {
      const hospital = {
        name: 'General Hospital',
        address: '123 Medical Center Drive, Healthcare City',
        phone: '+1 (555) 123-4567',
        email: 'info@generalhospital.com',
        imageUrl: 'hospital_logo.jpg',
      };
      await HospitalModel.create(hospital);
      console.log('✅ Seeded hospital');
    } else {
      console.log('✅ Hospital already seeded');
    }

    // Seed wards
    if (await WardModel.countDocuments() === 0) {
      await seedWards();
    } else {
      console.log('✅ Wards already seeded');
    }

    // Seed insurance providers (needed for patients)
    let insuranceProviders: any[] = [];
    if (await InsuranceProviderModel.countDocuments() === 0) {
      insuranceProviders = await seedInsuranceProviders();
    } else {
      insuranceProviders = await InsuranceProviderModel.find();
      console.log('✅ Insurance providers already seeded');
    }

    // Seed patients (depends on insurance providers)
    if (await PatientModel.countDocuments() === 0) {
      await seedPatients(insuranceProviders);
    } else {
      console.log('✅ Patients already seeded');
    }

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

    // Seed attendances (depends on patients)
    if (await AttendanceModel.countDocuments() === 0) {
      await seedAttendances();
    } else {
      console.log('✅ Attendances already seeded');
    }

    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('💥 Error during database seeding:', error);
    throw error;
  }
};

// NEW: Seed Wards Function
async function seedWards() {
  const mockWards = [
    {
      wardName: 'General Ward A',
      wardType: 'general',
      totalBeds: 20,
      occupiedBeds: 8,
      cashDailyRate: 50,
      insuranceDailyRate: 60,
      isActive: true,
      requiresAuthorization: false,
      vatRate: 0,
      isTaxable: true
    },
    {
      wardName: 'General Ward B',
      wardType: 'general',
      totalBeds: 15,
      occupiedBeds: 5,
      cashDailyRate: 50,
      insuranceDailyRate: 60,
      isActive: true,
      requiresAuthorization: false,
      vatRate: 0,
      isTaxable: true
    },
    {
      wardName: 'Private Ward',
      wardType: 'private',
      totalBeds: 10,
      occupiedBeds: 3,
      cashDailyRate: 120,
      insuranceDailyRate: 150,
      isActive: true,
      requiresAuthorization: true,
      vatRate: 0,
      isTaxable: true
    },
    {
      wardName: 'Maternity Ward',
      wardType: 'maternity',
      totalBeds: 12,
      occupiedBeds: 4,
      cashDailyRate: 80,
      insuranceDailyRate: 100,
      isActive: true,
      requiresAuthorization: false,
      vatRate: 0,
      isTaxable: true
    },
    {
      wardName: 'Pediatric Ward',
      wardType: 'pediatric',
      totalBeds: 8,
      occupiedBeds: 2,
      cashDailyRate: 60,
      insuranceDailyRate: 75,
      isActive: true,
      requiresAuthorization: false,
      vatRate: 0,
      isTaxable: true
    },
    {
      wardName: 'ICU',
      wardType: 'icu',
      totalBeds: 6,
      occupiedBeds: 1,
      cashDailyRate: 200,
      insuranceDailyRate: 250,
      isActive: true,
      requiresAuthorization: true,
      vatRate: 0,
      isTaxable: true
    }
  ];

  await WardModel.insertMany(mockWards);
  console.log(`✅ Seeded ${mockWards.length} wards with dual pricing`);
}

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

// UPDATED: Patients Seeding with new structure
async function seedPatients(insuranceProviders: any[]) {
  const baseFolderNumber = 10000;
  
  const mockPatients = [
    {
      folderNumber: `PAT-${baseFolderNumber}`,
      fullName: 'Kwame Mensah',
      gender: 'male',
      dateOfBirth: new Date('1985-05-15'),
      contact: '233244123456',
      address: '123 Main Street, Accra',
      paymentMode: undefined,
      additionalInfo: {
        title: 'Mr',
        email: 'kwame.mensah@email.com',
        houseNumber: 'H123',
        idType: 'GhanaCard',
        idNumber: 'GHA-123456789-X',
        bloodType: 'O+',
        occupation: 'Teacher',
        nextOfKin: 'Ama Mensah',
        emergencyContact: {
          name: 'Ama Mensah',
          relationship: 'Wife',
          phone: '233244654321'
        }
      },
      registeredBy: 'System Administrator'
    },
    {
      folderNumber: `PAT-${baseFolderNumber + 1}`,
      fullName: 'Ama Serwaa',
      gender: 'female',
      dateOfBirth: new Date('1990-08-22'),
      contact: '233244234567',
      address: '456 Oak Avenue, Kumasi',
      paymentMode: 'nhis',
      insuranceDetails: {
        insuranceNumber: 'NHIS-2024-001',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      },
      additionalInfo: {
        title: 'Mrs',
        email: 'ama.serwaa@email.com',
        houseNumber: 'H456',
        idType: 'GhanaCard',
        idNumber: 'GHA-987654321-Y',
        bloodType: 'A+',
        occupation: 'Nurse',
        nextOfKin: 'Kofi Serwaa',
        emergencyContact: {
          name: 'Kofi Serwaa',
          relationship: 'Husband',
          phone: '233244765432'
        }
      },
      registeredBy: 'System Administrator'
    },
    {
      folderNumber: `PAT-${baseFolderNumber + 2}`,
      fullName: 'Kofi Annan',
      gender: 'male',
      dateOfBirth: new Date('1978-12-10'),
      contact: '233244345678',
      address: '789 Pine Road, Takoradi',
      paymentMode: 'private_insurance',
      insuranceDetails: {
        insuranceNumber: 'PHIS-001',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-02-28'),
        providerId: insuranceProviders.find(p => p.type === 'private')?._id,
        providerName: insuranceProviders.find(p => p.type === 'private')?.name
      },
      additionalInfo: {
        title: 'Mr',
        email: 'kofi.annan@email.com',
        houseNumber: 'H789',
        idType: 'GhanaCard',
        idNumber: 'GHA-456789123-Z',
        bloodType: 'B+',
        occupation: 'Engineer',
        nextOfKin: 'Efua Annan',
        emergencyContact: {
          name: 'Efua Annan',
          relationship: 'Wife',
          phone: '233244876543'
        }
      },
      registeredBy: 'System Administrator'
    },
    {
      folderNumber: `PAT-${baseFolderNumber + 3}`,
      fullName: 'Esi Boateng',
      gender: 'female',
      dateOfBirth: new Date('1995-03-30'),
      contact: '233244456789',
      address: '321 Cedar Lane, Tamale',
      paymentMode: 'cash',
      additionalInfo: {
        title: 'Miss',
        email: 'esi.boateng@email.com',
        houseNumber: 'H321',
        idType: 'Voter ID',
        idNumber: 'VOT-789123456',
        bloodType: 'AB+',
        occupation: 'Student',
        nextOfKin: 'Yaw Boateng',
        emergencyContact: {
          name: 'Yaw Boateng',
          relationship: 'Father',
          phone: '233244987654'
        }
      },
      registeredBy: 'System Administrator'
    },
    {
      folderNumber: `PAT-${baseFolderNumber + 4}`,
      fullName: 'Yaw Asare',
      gender: 'male',
      dateOfBirth: new Date('1982-07-18'),
      contact: '233244567890',
      address: '654 Maple Street, Cape Coast',
      paymentMode: undefined,
      additionalInfo: {
        title: 'Mr',
        email: 'yaw.asare@email.com',
        houseNumber: 'H654',
        idType: 'Passport',
        idNumber: 'P12345678',
        bloodType: 'O-',
        occupation: 'Farmer',
        nextOfKin: 'Akua Asare',
        emergencyContact: {
          name: 'Akua Asare',
          relationship: 'Sister',
          phone: '233244098765'
        }
      },
      registeredBy: 'System Administrator'
    },
    {
      folderNumber: `PAT-${baseFolderNumber + 5}`,
      fullName: 'Akosua Adoma',
      gender: 'female',
      dateOfBirth: new Date('1988-11-05'),
      contact: '233244678901',
      address: '987 Palm Street, Koforidua',
      paymentMode: 'private_insurance',
      insuranceDetails: {
        insuranceNumber: 'PHIS-002',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2025-03-31'),
        providerId: insuranceProviders.find(p => p.type === 'private')?._id,
        providerName: insuranceProviders.find(p => p.type === 'private')?.name
      },
      additionalInfo: {
        title: 'Mrs',
        email: 'akosua.adoma@email.com',
        houseNumber: 'H987',
        idType: 'GhanaCard',
        idNumber: 'GHA-654987321-U',
        bloodType: 'A-',
        occupation: 'Banker',
        nextOfKin: 'Kwabena Adoma',
        emergencyContact: {
          name: 'Kwabena Adoma',
          relationship: 'Husband',
          phone: '233244109876'
        }
      },
      registeredBy: 'System Administrator'
    },
    {
      folderNumber: `PAT-${baseFolderNumber + 6}`,
      fullName: 'Michael Agyeman',
      gender: 'male',
      dateOfBirth: new Date('1992-04-12'),
      contact: '233244112233',
      address: '555 New Street, Sunyani',
      paymentMode: undefined,
      additionalInfo: {},
      registeredBy: 'System Administrator'
    }
  ];

  const patientsWithAge = mockPatients.map(patient => {
    const age = calculateAge(patient.dateOfBirth);
    return { ...patient, age };
  });

  await PatientModel.insertMany(patientsWithAge);
  console.log(`✅ Seeded ${patientsWithAge.length} patients with updated structure`);
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
        unitOfMeasure: item.unitOfMeasure || item.unit || 'pieces',
        reorderLevel: item.reorderLevel || 10,
        currentStock: item.currentStock || 100,
        unitPrice: item.unitPrice || 1,
        sellingPrice: item.sellingPrice || (item.unitPrice || 1) * 1.2,
        // ADDED DUAL PRICING:
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
        unitOfMeasure: item.unitOfMeasure || 'tablets',
        reorderLevel: item.reorderLevel || 50,
        currentStock: item.currentStock || 200,
        unitPrice: item.unitPrice || 5,
        sellingPrice: item.sellingPrice || 10,
        // ADDED DUAL PRICING:
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

// UPDATED: Diagnoses Seeding with dual pricing
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
      icdCode: diagnosis.icdCode || diagnosis.code || `D${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      description: diagnosis.description || diagnosis.name,
      // UPDATED WITH DUAL PRICING:
      cashPrice: diagnosis.cashPrice || diagnosis.price || 50,
      insurancePrice: diagnosis.insurancePrice || (diagnosis.price || 50) * 1.2,
      costPrice: diagnosis.costPrice || (diagnosis.price || 50) * 0.6,
      isActive: true,
      requiresAuthorization: diagnosis.requiresAuthorization || false,
      vatRate: 0,
      isTaxable: true
    }));
    
    await DiagnosisModel.insertMany(validDiagnoses);
    console.log(`✅ Seeded ${validDiagnoses.length} diagnoses with dual pricing`);
  } catch (error) {
    console.error('❌ Error seeding diagnoses:', error);
    throw error;
  }
}

// UPDATED: Lab Tests Seeding with dual pricing
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
      description: test.description || test.name,
      // UPDATED WITH DUAL PRICING:
      cashPrice: test.cashPrice || test.price || 25,
      insurancePrice: test.insurancePrice || (test.price || 25) * 1.15,
      costPrice: test.costPrice || (test.price || 25) * 0.5,
      isActive: true,
      requiresAuthorization: test.requiresAuthorization || false,
      vatRate: 0,
      isTaxable: true,
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
    console.log(`✅ Seeded ${validLabTests.length} lab test templates with dual pricing`);
  } catch (error) {
    console.error('❌ Error seeding lab test templates:', error);
    throw error;
  }
}

// UPDATED: Procedures Seeding with dual pricing
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
      code: procedure.code || `PROC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      description: procedure.description || procedure.name,
      // UPDATED WITH DUAL PRICING:
      cashPrice: procedure.cashPrice || procedure.price || 100,
      insurancePrice: procedure.insurancePrice || (procedure.price || 100) * 1.25,
      costPrice: procedure.costPrice || (procedure.price || 100) * 0.4,
      isActive: true,
      requiresAuthorization: procedure.requiresAuthorization || false,
      vatRate: 0,
      isTaxable: true,
      duration: procedure.duration || 30
    }));
    
    await ProcedureTemplateModel.insertMany(validProcedures);
    console.log(`✅ Seeded ${validProcedures.length} procedure templates with dual pricing`);
  } catch (error) {
    console.error('❌ Error seeding procedure templates:', error);
    throw error;
  }
}

// Insurance Providers Seeding (unchanged)
async function seedInsuranceProviders() {
  const dataDir = path.join(__dirname, '../data');
  const providersPath = path.join(dataDir, 'insuranceProviders.json');
  
  if (!fs.existsSync(providersPath)) {
    throw new Error(`insuranceProviders.json not found at: ${providersPath}`);
  }

  try {
    const providers = readJSON5File(providersPath);
    
    const validProviders = providers.map((provider: any) => ({
      name: provider.name,
      type: provider.type || (provider.name.toLowerCase().includes('nhis') ? 'nhis' : 'private'),
      coveragePercentage: provider.coveragePercentage || (provider.type === 'nhis' ? 80 : 70),
      startDate: provider.startDate ? new Date(provider.startDate) : new Date(),
      expiryDate: provider.expiryDate ? new Date(provider.expiryDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      contactPerson: provider.contactPerson,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      isActive: provider.isActive !== undefined ? provider.isActive : true
    }));
    
    const insertedProviders = await InsuranceProviderModel.insertMany(validProviders);
    console.log(`✅ Seeded ${validProviders.length} insurance providers`);
    return insertedProviders;
  } catch (error) {
    console.error('❌ Error seeding insurance providers:', error);
    throw error;
  }
}

// UPDATED: Attendances Seeding with proper billing structure
async function seedAttendances() {
  const patients = await PatientModel.find();
  const users = await UserModel.find();
  
  if (patients.length === 0) {
    console.log('❌ No patients found for seeding attendances');
    return;
  }

  const mockAttendances = [
    {
      patientId: patients[0]._id,
      dateTime: new Date('2024-01-15T09:30:00'),
      attendanceType: 'general_opd',
      paymentMode: 'cash',
      complaints: 'Fever, headache, and body pains for 3 days',
      diagnosis: 'Malaria',
      medicalNotes: 'Patient presented with high fever and headache. Prescribed antimalarial medication.',
      attendingClinician: users.find(u => u.role === 'doctor')?._id,
      status: 'completed',
      totalBill: 85.50,
      paidAmount: 85.50,
      outstandingBalance: 0,
      vitals: {
        bloodPressure: '120/80',
        temperature: 38.5,
        pulse: 88,
        respiration: 18,
        spo2: 98,
        weight: 75,
        height: 175,
        bmi: 24.5
      },
      createdBy: users.find(u => u.role === 'doctor')?._id
    },
    {
      patientId: patients[1]._id,
      dateTime: new Date('2024-01-16T10:15:00'),
      attendanceType: 'antenatal_care',
      paymentMode: 'nhis',
      nhisCCC: 'ANC-001',
      complaints: 'Routine antenatal checkup - 24 weeks pregnant',
      diagnosis: 'Normal Pregnancy',
      medicalNotes: 'Patient doing well. Fetal heartbeat normal. Next appointment in 4 weeks.',
      attendingClinician: users.find(u => u.role === 'doctor')?._id,
      status: 'completed',
      totalBill: 0,
      paidAmount: 0,
      outstandingBalance: 0,
      vitals: {
        bloodPressure: '110/70',
        temperature: 36.8,
        pulse: 82,
        respiration: 16,
        spo2: 99,
        weight: 68,
        height: 162,
        bmi: 25.9
      },
      createdBy: users.find(u => u.role === 'doctor')?._id
    },
    {
      patientId: patients[2]._id,
      dateTime: new Date('2024-01-17T14:20:00'),
      attendanceType: 'specialist_consultation',
      paymentMode: 'private_insurance',
      complaints: 'Persistent lower back pain for 2 months',
      diagnosis: 'Lumbar Spondylosis',
      medicalNotes: 'Referred to physiotherapy. Prescribed pain relief and muscle relaxants.',
      attendingClinician: users.find(u => u.role === 'doctor')?._id,
      status: 'pending',
      totalBill: 150.00,
      paidAmount: 0,
      outstandingBalance: 150.00,
      vitals: {
        bloodPressure: '130/85',
        temperature: 37.0,
        pulse: 76,
        respiration: 17,
        spo2: 97,
        weight: 82,
        height: 180,
        bmi: 25.3
      },
      createdBy: users.find(u => u.role === 'doctor')?._id
    }
  ];

  try {
    console.log('🔄 Creating attendances...');
    
    const createdAttendances = [];
    for (const attendanceData of mockAttendances) {
      try {
        const attendance = new AttendanceModel(attendanceData);
        const savedAttendance = await attendance.save();
        createdAttendances.push(savedAttendance);
        console.log(`   ✅ Created attendance: ${savedAttendance.attendanceNumber}`);
      } catch (error) {
        console.error(`   ❌ Failed to create attendance:`, error);
      }
    }
    
    console.log(`✅ Seeded ${createdAttendances.length} attendances`);
    
  } catch (error) {
    console.error('❌ Error seeding attendances:', error);
    throw error;
  }
}

// Helper function to calculate age
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
}

export default seedData;
