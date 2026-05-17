/**
 * Modules Index
 * Central registration point for all modules
 */

import { Express } from 'express';
import { PrismaClient } from '@prisma/client';

// Import module initializers (new modular architecture)
import { createBackupRoutes } from './backup';
import { initializeUserModule } from './user';
import { initializeStaffModule } from './staff';
import { createPatientRoutes } from './patient';
import { createAppointmentRoutes } from './appointment';
import { createBillingRoutes } from './billing';
import { createDepartmentRoutes } from './department';
import { createAntenatalRoutes } from './antenatal';
import { AdmissionRoutes } from './admission';
import { encounterRoutes } from './encounter';
import ReferralRoutes from './referral/ReferralRoutes';
import WorklistRoutes from './worklist/WorklistRoutes';
import { createBedRoutes } from './bed';
import { BillRoutes } from './bill';
import DiagnosisRoutes from './diagnosis/DiagnosisRoutes';
import documentRoutes from './document/DocumentRoutes';
import dashboardRoutes from './dashboard/DashboardRoutes';
import { createClinicalReportsRoutes } from './clinicalReports';
import { createReportRoutes } from './report';
import { createServiceCatalogRoutes } from './serviceCatalog';
import { createGDRGRoutes } from './gdrg';
import { createGHSReportRoutes } from './ghsReport';
import { createHospitalRoutes } from './hospital';
import { createInsuranceProviderRoutes } from './insuranceProvider';
import { createInsuranceClaimRoutes } from './insuranceClaim';
import { createInvoiceRoutes } from './invoice';
import { createLabTestRoutes } from './labTest';
import { createNotificationRoutes } from './notification';
import { createProcedureRoutes } from './procedure';
import { createRequisitionRoutes } from './requisition';
import { createScanTemplateRoutes } from './scanTemplate';
import { createSettingsRoutes } from './settings';
import { createStockItemRoutes } from './stockItem';
import { createStockTransactionRoutes } from './stockTransaction';
import { createWaiverRoutes } from './waiver';
import { WardRoutes } from './ward';

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
  app.use('/api/departments', createDepartmentRoutes(prisma));
  
  // Antenatal module (NEW - ANC bookings, visits, delivery, postnatal care)
  app.use('/api/antenatal', createAntenatalRoutes(prisma));
  
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
  
  // Backup module (NEW - Database backup and restore operations)
  app.use('/api/backup', createBackupRoutes());
  
  // Bed module (NEW - Bed management within wards)
  app.use('/api/beds', createBedRoutes(prisma));
  
  // Bill module (NEW - Bill and payment management with line items, waivers, statistics)
  app.use('/api/bills', BillRoutes);

  // Diagnosis module (NEW - ICD-10 diagnosis management)
  app.use('/api/diagnoses', DiagnosisRoutes.getRouter());

  // Document module (NEW - Document upload and management)
  app.use('/api/documents', documentRoutes.getRouter());

  // Dashboard module (NEW - Analytics and statistics dashboard)
  app.use('/api/dashboard', dashboardRoutes.getRouter());

  // Clinical Reports module (NEW - Lab, Scan, Procedure, Medication, Vitals reports)
  app.use('/api/clinical-reports', createClinicalReportsRoutes());

  // Report module (NEW - Comprehensive hospital reports: demographic, financial, clinical, etc.)
  app.use('/api/reports', createReportRoutes());

  // Service Catalog module (NEW - Hospital service items management with NHIS integration)
  app.use('/api/services', createServiceCatalogRoutes());

  // GDRG module (NEW - Ghana DRG tariff management with NHIS integration)
  app.use('/api/gdrg', createGDRGRoutes());

  // GHS Report module (NEW - GHS report generation and submission)
  app.use('/api/ghs-reports', createGHSReportRoutes());

  // Hospital module (NEW - Hospital information and NHIS settings)
  app.use('/api/hospital', createHospitalRoutes());

  // Insurance Provider module (NEW - Insurance company management)
  app.use('/api/insurance-providers', createInsuranceProviderRoutes());

  // Insurance Claim module (NEW - Insurance claim processing)
  app.use('/api/insurance-claims', createInsuranceClaimRoutes());

  // Invoice module (NEW - Supplier invoice management)
  app.use('/api/invoices', createInvoiceRoutes());

  // Lab Test module (NEW - Lab test template management)
  app.use('/api/lab-tests', createLabTestRoutes());

  // Notification module (NEW - System notifications and messaging)
  app.use('/api/notifications', createNotificationRoutes());

  // Procedure module (NEW - Procedure template management)
  app.use('/api/procedures', createProcedureRoutes());

  // Requisition module (NEW - Stock requisition management)
  app.use('/api/requisitions', createRequisitionRoutes());

  // Scan Template module (NEW - Scan template management)
  app.use('/api/scan-templates', createScanTemplateRoutes());

  // Settings module (NEW - System settings management)
  app.use('/api/settings', createSettingsRoutes());

  // Stock Item module (NEW - Inventory stock item management)
  app.use('/api/stock-items', createStockItemRoutes());

  // Stock Transaction module (NEW - Stock movement tracking)
  app.use('/api/stock-transactions', createStockTransactionRoutes());

  // Waiver module (NEW - Financial waiver management)
  app.use('/api/waivers', createWaiverRoutes());

  // Ward module (NEW - Ward management)
  app.use('/api/wards', WardRoutes.getRouter());

  // Register other modules here as they are created/migrated
  // app.use('/api/attendance', createAttendanceRoutes(prisma));
  // app.use('/api/inventory', createInventoryRoutes(prisma));
  // app.use('/api/medical-records', createMedicalRecordRoutes(prisma));
  
  console.log('✅ All modules registered successfully');
  console.log('   - User Module: /api/auth (Unified identity management)');
  console.log('   - Staff Module: /api/staff (All hospital personnel)');
  console.log('   - Patient Module: /api/patients');
  console.log('   - Appointment Module: /api/appointments');
  console.log('   - Billing Module: /api/billing');
  console.log('   - Department Module: /api/departments');
  console.log('   - Antenatal Module: /api/antenatal');
  console.log('   - Admission Module: /api/admissions');
  console.log('   - Encounter Module: /api/encounters');
  console.log('   - Referral Module: /api/referrals');
  console.log('   - Worklist Module: /api/worklist');
  console.log('   - Backup Module: /api/backup');
  console.log('   - Bed Module: /api/beds');
  console.log('   - Bill Module: /api/bills');
  console.log('   - Diagnosis Module: /api/diagnoses');
  console.log('   - Document Module: /api/documents');
  console.log('   - Dashboard Module: /api/dashboard');
  console.log('   - Clinical Reports Module: /api/clinical-reports');
  console.log('   - Report Module: /api/reports');
  console.log('   - Service Catalog Module: /api/services');
  console.log('   - GDRG Module: /api/gdrg');
  console.log('   - GHS Report Module: /api/ghs-reports');
  console.log('   - Hospital Module: /api/hospital');
  console.log('   - Insurance Provider Module: /api/insurance-providers');
  console.log('   - Insurance Claim Module: /api/insurance-claims');
  console.log('   - Invoice Module: /api/invoices');
  console.log('   - Lab Test Module: /api/lab-tests');
  console.log('   - Notification Module: /api/notifications');
  console.log('   - Procedure Module: /api/procedures');
  console.log('   - Requisition Module: /api/requisitions');
  console.log('   - Scan Template Module: /api/scan-templates');
  console.log('   - Settings Module: /api/settings');
  console.log('   - Stock Item Module: /api/stock-items');
  console.log('   - Stock Transaction Module: /api/stock-transactions');
  console.log('   - Waiver Module: /api/waivers');
  console.log('   - Ward Module: /api/wards');
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
    name: 'Antenatal (NEW)',
    path: '/api/antenatal',
    status: 'active',
    description: 'Complete antenatal care management including ANC bookings, visits, delivery records, and postnatal care.',
    endpoints: [
      'GET /', 'GET /:id', 'GET /attendance/:attendanceId', 'GET /patient/:patientId/active',
      'POST /', 'PUT /:id', 'POST /:id/close', 'DELETE /:id',
      'GET /bookings/:bookingId/visits', 'GET /visits/:id', 'POST /visits', 'PUT /visits/:id', 'DELETE /visits/:id',
      'GET /deliveries', 'GET /deliveries/:id', 'POST /deliveries', 'PUT /deliveries/:id', 'DELETE /deliveries/:id',
      'GET /postnatal', 'GET /postnatal/:id', 'POST /postnatal', 'PUT /postnatal/:id', 'DELETE /postnatal/:id',
      'GET /stats/anc', 'GET /stats/delivery', 'GET /stats/postnatal'
    ],
    features: [
      'ANC booking with gravida/para tracking',
      'EDD calculation from LMP',
      'Risk level assessment (low/moderate/high)',
      'ANC visit recording with vitals',
      'IPTp and TT immunization tracking',
      'Danger signs monitoring',
      'Delivery record management',
      'Newborn recording',
      'Postnatal care tracking',
      'Comprehensive statistics'
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
  },
  {
    name: 'Backup (NEW)',
    path: '/api/backup',
    status: 'active',
    description: 'Database backup and restore operations using PostgreSQL pg_dump and psql utilities.',
    endpoints: [
      'POST / (Create backup)',
      'POST /restore (Restore from backup file)',
      'GET / (List all backups)',
      'GET /download/:filename (Download backup file)',
      'DELETE /:filename (Delete backup)'
    ],
    features: [
      'Automated SQL dump creation with timestamps',
      'Database restoration from backup files',
      'Backup file listing with metadata',
      'Secure backup download',
      'Backup deletion management',
      'PostgreSQL pg_dump integration'
    ]
  },
  {
    name: 'Bed (NEW)',
    path: '/api/beds',
    status: 'active',
    description: 'Bed management within wards including bed creation, occupancy tracking, and ward bed count synchronization.',
    endpoints: [
      'GET / (List all beds with optional filtering)',
      'GET /:id (Get bed by ID)',
      'POST / (Create new bed)',
      'PUT /:id (Update bed details)',
      'DELETE /:id (Delete bed)'
    ],
    features: [
      'Bed creation with ward assignment',
      'Bed number uniqueness validation per ward',
      'Occupancy status tracking',
      'Automatic ward bed count updates',
      'Patient assignment tracking',
      'Ward existence validation',
      'Protected deletion of occupied beds'
    ]
  },
  {
    name: 'Bill (NEW)',
    path: '/api/bills',
    status: 'active',
    description: 'Comprehensive billing management with line items, payments, waivers, insurance coverage, and detailed statistics.',
    endpoints: [
      'GET / (List all bills with filtering and pagination)',
      'GET /statistics (Get bill statistics)',
      'GET /:id (Get bill by ID)',
      'GET /:id/line-items (Get bill line items)',
      'POST / (Create new bill)',
      'PUT /:id (Update bill)',
      'DELETE /:id (Delete bill)',
      'POST /:id/payment (Add payment to bill)',
      'POST /line-items/:lineItemId/void (Void bill line item)',
      'POST /:billId/apply-waiver (Apply waiver to bill)'
    ],
    features: [
      'Bill generation with line items',
      'Multiple payment modes (cash, mobile money, card, insurance)',
      'Partial and full payment tracking',
      'Line item voiding with reason tracking',
      'Waiver application and management',
      'Insurance coverage calculation',
      'Real-time balance updates',
      'Attendance integration for outstanding balances',
      'Comprehensive billing statistics',
      'Auto-generated bill numbers'
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
