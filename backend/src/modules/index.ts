/**
 * Modules Index
 * Central registration point for all modules
 */

import { Express } from 'express';
import { PrismaClient } from '@prisma/client';

// Import module initializers (new modular architecture)
import { initializeUserModule } from './user';
import { initializeStaffModule } from './staff';
import { createPatientRoutes } from './patient';
import { createAppointmentRoutes } from './appointment';
import { createBillingRoutes } from './billing';
import { departmentRoutes } from './department';
import { AdmissionRoutes } from './admission/AdmissionRoutes';
import { encounterRoutes } from './encounter';
import ReferralRoutes from './referral/ReferralRoutes';
import WorklistRoutes from './worklist/WorklistRoutes';

// Legacy imports (to be migrated)
// import attendanceRoutes from './attendance';
// import inventoryRoutes from './inventory';
// import medicalRecordRoutes from './medical-record';

/**
 * Register all module routes with the Express app
 */
export function registerModules(app: Express, prisma: PrismaClient): void {
  // Initialize new modular architecture
  const userModule = initializeUserModule(prisma);
  const staffModule = initializeStaffModule(prisma, userModule.service);
  
  // Auth/User module (must be first for authentication)
  app.use('/api/auth', userModule.routes.getRouter());
  
  // Staff module (unified management for all hospital personnel)
  app.use('/api/staff', staffModule.routes.getRouter());
  
  // Patient module
  app.use('/api/patients', createPatientRoutes(prisma));
  
  // Appointment module
  app.use('/api/appointments', createAppointmentRoutes(prisma));
  
  // Billing module
  app.use('/api/billing', createBillingRoutes(prisma));
  
  // Department module
  app.use('/api/departments', departmentRoutes);
  
  // Admission module (NEW - Ward/Bed management, admissions, discharges)
  const admissionRoutes = new AdmissionRoutes();
  app.use('/api/admissions', admissionRoutes.getRouter());
  
  // Encounter module (NEW - Clinical encounters: consultations, antenatal, delivery, postnatal)
  // This replaces the old attendanceController with proper modular architecture
  app.use('/api/encounters', encounterRoutes);
  
  // Referral module (NEW - Patient referrals: incoming/outgoing, status tracking)
  app.use('/api/referrals', ReferralRoutes);
  
  // Worklist module (NEW - Clinical queues: vitals, medical, lab, pharmacy, radiology)
  app.use('/api/worklist', WorklistRoutes);
  
  // Register other modules here as they are created/migrated
  // app.use('/api/attendance', createAttendanceRoutes(prisma));
  // app.use('/api/inventory', createInventoryRoutes(prisma));
  // app.use('/api/medical-records', createMedicalRecordRoutes(prisma));
  
  console.log('✅ All modules registered successfully');
  console.log('   - User Module: /api/auth (Unified identity management)');
  console.log('   - Staff Module: /api/staff (All hospital personnel)');
  console.log('   - Admission Module: /api/admissions (Ward/Bed management)');
  console.log('   - Encounter Module: /api/encounters (Clinical encounters)');
  console.log('   - Referral Module: /api/referrals (Patient referrals - NEW)');
  console.log('   - Worklist Module: /api/worklist (Clinical queues - NEW)');
}

/**
 * Module metadata for documentation and management
 */
export const moduleMetadata = [
  {
    name: 'User (Authentication)',
    path: '/api/auth',
    status: 'active',
    description: 'Unified identity management for all users (Staff, Patients, Admins). Handles authentication, authorization, and token management.',
    endpoints: [
      'POST /register', 'POST /login', 'POST /refresh-token',
      'POST /change-password', 'GET /me', 'PUT /me',
      'GET / (Admin)', 'GET /statistics (Admin)',
      'POST /:id/suspend (Admin)', 'POST /:id/activate (Admin)', 'DELETE /:id (Admin)'
    ]
  },
  {
    name: 'Staff (Unified Personnel)',
    path: '/api/staff',
    status: 'active',
    description: 'Unified staff profile management for ALL hospital personnel (Doctors, Nurses, Receptionists, Lab Technicians, Pharmacists, etc.). Replaces isolated Doctor module.',
    endpoints: [
      'GET /me', 'GET /:id', 'GET /employee/:employeeId', 'PUT /:id',
      'POST / (Admin)', 'GET / (Admin)', 'GET /statistics (Admin)',
      'POST /:id/activate (Admin)', 'POST /:id/leave', 'POST /:id/terminate (Admin)',
      'GET /doctors/available', 'GET /doctors/department/:departmentId'
    ],
    roles: ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST', 'ADMIN_STAFF', 'CLEANING_STAFF', 'SECURITY']
  },
  {
    name: 'Patient',
    path: '/api/patients',
    status: 'active',
    description: 'Patient management operations',
    endpoints: ['GET /', 'GET /:id', 'POST /', 'PUT /:id', 'DELETE /:id', 'GET /search', 'GET /statistics/summary']
  },
  {
    name: 'Appointment',
    path: '/api/appointments',
    status: 'active',
    description: 'Appointment scheduling and management',
    endpoints: [
      'GET /', 'GET /:id', 'POST /', 'PUT /:id', 'DELETE /:',
      'POST /:id/cancel', 'GET /today', 'GET /statistics', 'GET /availability/check'
    ]
  },
  {
    name: 'Billing',
    path: '/api/billing',
    status: 'active',
    description: 'Invoice and payment management',
    endpoints: [
      'GET /invoices', 'GET /invoices/:id', 'POST /invoices', 'PUT /invoices/:id',
      'POST /invoices/:id/pay', 'POST /invoices/:id/mark-paid', 'GET /invoices/overdue',
      'GET /statistics', 'GET /revenue/daily'
    ]
  },
  {
    name: 'Department',
    path: '/api/departments',
    status: 'active',
    description: 'Department organization and head doctor assignment',
    endpoints: [
      'GET /', 'GET /:id', 'GET /:id/stats', 'POST /', 'PUT /:id',
      'PATCH /:id/status', 'PUT /:id/head-doctor', 'DELETE /:id', 'GET /statistics'
    ]
  },
  {
    name: 'Admission (NEW)',
    path: '/api/admissions',
    status: 'active',
    description: 'Ward and bed management, patient admissions, transfers, discharges, and daily clinical notes.',
    endpoints: [
      'GET /', 'GET /:id', 'GET /patient/:patientId', 'GET /stats', 'GET /inpatients',
      'POST /', 'PUT /:id', 'DELETE /:id',
      'POST /:id/discharge', 'POST /:id/daily-notes'
    ],
    features: [
      'Auto-generated admission numbers',
      'Real-time bed occupancy tracking',
      'Ward transfer support',
      'Discharge workflows with summaries',
      'Daily clinical notes',
      'Admission statistics and reporting'
    ]
  },
  {
    name: 'Encounter (NEW)',
    path: '/api/encounters',
    status: 'active',
    description: 'Clinical encounters for all visit types: emergency, acute, general consultation, antenatal, postnatal, delivery. Includes vitals, diagnosis, prescriptions, lab orders.',
    endpoints: [
      'GET /', 'GET /:id', 'GET /patient/:patientId', 'GET /today',
      'POST /', 'PUT /:id', 'DELETE /:id',
      'POST /:id/vitals', 'POST /:id/diagnosis', 'POST /:id/prescription', 'POST /:id/lab-order',
      'GET /nhis/verify/:cccNumber', 'GET /worklist/medical'
    ],
    features: [
      '7 encounter types (emergency_acute, emergency_general, antenatal, postnatal, delivery, general, special)',
      'NHIS integration with CCC verification',
      'Vitals recording with WHO ranges',
      'ICD-10 diagnosis management',
      'Prescription and lab order generation',
      'Clinical worklist integration'
    ]
  },
  {
    name: 'Referral (NEW)',
    path: '/api/referrals',
    status: 'active',
    description: 'Patient referral management for incoming and outgoing referrals with status tracking and urgency levels.',
    endpoints: [
      'GET /', 'GET /:id', 'GET /patient/:patientId', 'GET /stats/summary',
      'POST /outgoing', 'POST /incoming', 'PUT /:id/status', 'DELETE /:id'
    ],
    features: [
      'Outgoing referrals (to other facilities)',
      'Incoming referrals (from other facilities)',
      'Urgency levels (routine, urgent, stat)',
      'Status tracking (pending, accepted, rejected, completed)',
      'Linkage to attendance/encounter records',
      'Referral number auto-generation'
    ]
  },
  {
    name: 'Worklist (NEW)',
    path: '/api/worklist',
    status: 'active',
    description: 'Clinical worklists/queues for different departments showing pending patients with priority sorting.',
    endpoints: [
      'GET /vitals', 'GET /medical', 'GET /laboratory', 'GET /pharmacy', 'GET /radiology',
      'GET /summary', 'GET /stats'
    ],
    features: [
      'Vitals worklist (patients awaiting triage)',
      'Medical worklist (patients awaiting doctor consultation)',
      'Laboratory worklist (pending lab tests)',
      'Pharmacy worklist (pending prescriptions)',
      'Radiology worklist (pending scans)',
      'Priority calculation based on vitals',
      'Wait time tracking'
    ]
  }
];

/**
 * Architecture Notes:
 * 
 * UNIFIED IDENTITY MODEL:
 * - User table stores credentials and core identity for ALL system users
 * - StaffProfile table extends User with role-specific details
 * - PatientProfile table extends User with patient-specific details
 * 
 * BENEFITS:
 * - Single sign-on across all roles
 * - Easy role changes (e.g., staff member who is also a patient)
 * - Consistent authentication and authorization
 * - Simplified user management
 * - Scalable role addition (just add new enum value, no schema changes)
 */
