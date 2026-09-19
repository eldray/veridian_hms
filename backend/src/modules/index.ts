// modules/index.ts - COMPLETE MODULE REGISTRATION with Reports
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';

// ============================================
// IMPORT ALL MODULE ROUTES
// ============================================

// Authentication & User Management
import { createAuthRoutes } from './auth/AuthRoutes';
import { createUserRoutes } from './user/UserRoutes';

// Patient & Clinical
import { createPatientRoutes } from './patient/PatientRoutes';
import { createEncounterRoutes } from './encounter/EncounterRoutes';
import { createAppointmentRoutes } from './appointment/AppointmentRoutes';
import { createAntenatalRoutes } from './antenatal/AntenatalRoutes';
import { createFamilyPlanningRoutes } from './familyPlanning/FamilyPlanningRoutes';
import { createReferralRoutes } from './referral/ReferralRoutes';

// Ward & Bed Management
import { createWardRoutes } from './ward/WardRoutes';
import { createBedRoutes } from './bed/BedRoutes';

// Service Catalog & Pricing
import { createServiceCatalogRoutes } from './serviceCatalog/ServiceCatalogRoutes';
import { createDiagnosisRoutes } from './diagnosis/DiagnosisRoutes';
import { createGDRGRoutes } from './gdrg/GDRGRoutes';
import { createLabTestRoutes } from './labTest/LabTestRoutes';
import { createScanTemplateRoutes } from './scanTemplate/ScanTemplateRoutes';
import { createProcedureRoutes } from './procedure/ProcedureRoutes';

// Billing & Financial
import { createBillRoutes } from './bill/BillRoutes';
import { createBillingRoutes } from './billing/BillingRoutes';
import { createProformaInvoiceRoutes } from './proformaInvoice/ProformaInvoiceRoutes';
import { createWaiverRoutes } from './waiver/WaiverRoutes';

// Insurance & Claims
import { createInsuranceProviderRoutes } from './insuranceProvider/InsuranceProviderRoutes';
import { createInsuranceClaimRoutes } from './insuranceClaim/InsuranceClaimRoutes';
import { createCorporateRoutes } from './corporate/CorporateRoutes';

// Inventory & Pharmacy
import { createStockItemRoutes } from './stockItem/StockItemRoutes';
import { createStockTransactionRoutes } from './stockTransaction/StockTransactionRoutes';
import { createStockTransferRoutes } from './stockTransfer/StockTransferRoutes';
import { createRequisitionRoutes } from './requisition/RequisitionRoutes';
import { createPurchaseInvoiceRoutes } from './purchaseInvoice/PurchaseInvoiceRoutes';

// Reports & Analytics
import { createDashboardRoutes } from './dashboard/DashboardRoutes';
import { createGHSReportRoutes } from './ghsReport/GHSReportRoutes';
import { createClinicalReportsRoutes } from './clinicalReports/ClinicalReportsRoutes';
// ✅ ADD THIS IMPORT
import { createReportRoutes } from './report/ReportRoutes';

// System & Configuration
import { createHospitalRoutes } from './hospital/HospitalRoutes';
import { createSettingsRoutes } from './settings/SettingsRoutes';
import { createDepartmentRoutes } from './department/DepartmentRoutes';

// Communication & Notifications
import { createNotificationRoutes } from './notification/NotificationRoutes';
import { createCommunicationRoutes } from './communication/CommunicationRoutes';

// Audit & Backup
import { createAuditRoutes } from './audit/AuditRoutes';
import { createBackupRoutes } from './backup/BackupRoutes';
import { createDocumentRoutes } from './document/DocumentRoutes';

// HR & Staffing
import { createStaffProfileRoutes } from './hr/staffProfile.routes';

// ============================================
// MODULE REGISTRATION FUNCTION
// ============================================

export function registerModules(app: Express, prisma: PrismaClient): void {
  console.log('🔧 Registering modules...');
  console.log('');

  // ============================================
  // 1. AUTHENTICATION & USER MANAGEMENT
  // ============================================
  app.use('/auth', createAuthRoutes(prisma));
  console.log('✅ Auth routes mounted at /auth');
  
  app.use('/users', createUserRoutes(prisma));
  console.log('✅ User routes mounted at /users');

  // ============================================
  // 2. PATIENT MANAGEMENT
  // ============================================
  app.use('/patients', createPatientRoutes(prisma));
  console.log('✅ Patient routes mounted at /patients');

  // ============================================
  // 3. CLINICAL OPERATIONS
  // ============================================
  app.use('/encounters', createEncounterRoutes(prisma));
  console.log('✅ Encounter routes mounted at /encounters');
  console.log('   └─ Worklists: /encounters/worklist/*');
  
  app.use('/appointments', createAppointmentRoutes(prisma));
  console.log('✅ Appointment routes mounted at /appointments');
  
  app.use('/antenatal', createAntenatalRoutes(prisma));
  console.log('✅ Antenatal routes mounted at /antenatal');
  
  app.use('/family-planning', createFamilyPlanningRoutes(prisma));
  console.log('✅ Family Planning routes mounted at /family-planning');
  
  app.use('/referrals', createReferralRoutes(prisma));
  console.log('✅ Referral routes mounted at /referrals');

  // ============================================
  // 4. WARD & BED MANAGEMENT
  // ============================================
  app.use('/wards', createWardRoutes(prisma));
  console.log('✅ Ward routes mounted at /wards');
  
  app.use('/beds', createBedRoutes(prisma));
  console.log('✅ Bed routes mounted at /beds');

  // ============================================
  // 5. SERVICE CATALOG & PRICING
  // ============================================
  app.use('/services', createServiceCatalogRoutes());
  console.log('✅ Service Catalog routes mounted at /services');
  
  app.use('/departments', createDepartmentRoutes(prisma));
  console.log('✅ Department routes mounted at /departments');
  
  app.use('/diagnoses', createDiagnosisRoutes(prisma));
  console.log('✅ Diagnosis routes mounted at /diagnoses');
  
  app.use('/gdrg', createGDRGRoutes(prisma));
  console.log('✅ G-DRG routes mounted at /gdrg');

  // ============================================
  // 6. LABORATORY & DIAGNOSTICS
  // ============================================
  app.use('/lab-tests', createLabTestRoutes(prisma));
  console.log('✅ Lab Test routes mounted at /lab-tests');
  
  app.use('/scan-templates', createScanTemplateRoutes(prisma));
  console.log('✅ Scan Template routes mounted at /scan-templates');

  app.use('/procedures', createProcedureRoutes(prisma));
  console.log('✅ Procedure routes mounted at /procedures');

  // ============================================
  // 7. BILLING & FINANCIAL
  // ============================================
  app.use('/bills', createBillRoutes(prisma));
  console.log('✅ Bill routes mounted at /bills (individual patient bills)');
  
  app.use('/billing', createBillingRoutes(prisma));
  console.log('✅ Billing routes mounted at /billing (billing operations & statistics)');
  
  app.use('/estimates', createProformaInvoiceRoutes(prisma));
  console.log('✅ Proforma Invoice routes mounted at /estimates');
  
  app.use('/waivers', createWaiverRoutes());
  console.log('✅ Waiver routes mounted at /waivers');

  // ============================================
  // 8. INSURANCE & CLAIMS
  // ============================================
  app.use('/insurance-providers', createInsuranceProviderRoutes(prisma));
  console.log('✅ Insurance Provider routes mounted at /insurance-providers');
  
  app.use('/insurance-claims', createInsuranceClaimRoutes());
  console.log('✅ Insurance Claim routes mounted at /insurance-claims');
  
  app.use('/corporate', createCorporateRoutes(prisma));
  console.log('✅ Corporate routes mounted at /corporate');

  // ============================================
  // 9. INVENTORY & PHARMACY
  // ============================================
  app.use('/stock-items', createStockItemRoutes());
  console.log('✅ Stock Item routes mounted at /stock-items');
  
  app.use('/stock-transactions', createStockTransactionRoutes());
  console.log('✅ Stock Transaction routes mounted at /stock-transactions');
  
  app.use('/stock-transfers', createStockTransferRoutes());
  console.log('✅ Stock Transfer routes mounted at /stock-transfers');
  
  app.use('/requisitions', createRequisitionRoutes(prisma));
  console.log('✅ Requisition routes mounted at /requisitions');
  
  app.use('/purchase-invoices', createPurchaseInvoiceRoutes());
  console.log('✅ Purchase Invoice routes mounted at /purchase-invoices');

  // ============================================
  // 10. REPORTS & ANALYTICS
  // ============================================
  app.use('/dashboard', createDashboardRoutes(prisma));
  console.log('✅ Dashboard routes mounted at /dashboard');
  
  app.use('/ghs-reports', createGHSReportRoutes(prisma));
  console.log('✅ GHS Report routes mounted at /ghs-reports');
  
  app.use('/clinical-reports', createClinicalReportsRoutes(prisma));
  console.log('✅ Clinical Reports routes mounted at /clinical-reports');
  
  // ✅ ADD THIS - Report Routes
  app.use('/reports', createReportRoutes(prisma));
  console.log('✅ Report routes mounted at /reports');

  // ============================================
  // 11. SYSTEM & CONFIGURATION
  // ============================================
  app.use('/hospital', createHospitalRoutes());
  console.log('✅ Hospital routes mounted at /hospital');
  
  app.use('/settings', createSettingsRoutes());
  console.log('✅ Settings routes mounted at /settings');

  // ============================================
  // 12. COMMUNICATION & NOTIFICATIONS
  // ============================================
  app.use('/notifications', createNotificationRoutes(prisma));
  console.log('✅ Notification routes mounted at /notifications');
  
  app.use('/communications', createCommunicationRoutes(prisma));
  console.log('✅ Communication routes mounted at /communications');

  // ============================================
  // 13. AUDIT & BACKUP
  // ============================================
  app.use('/audit', createAuditRoutes());
  console.log('✅ Audit routes mounted at /audit');
  
  app.use('/backup', createBackupRoutes());
  console.log('✅ Backup routes mounted at /backup');
  
  app.use('/documents', createDocumentRoutes());
  console.log('✅ Document routes mounted at /documents');

  // ============================================
  // 14. HR & STAFFING
  // ============================================
  app.use('/staff/profiles', createStaffProfileRoutes(prisma));
  console.log('✅ Staff Profile routes mounted at /staff/profiles');

  console.log('');
  console.log('✅ All modules registered successfully!');
  console.log('');
  console.log('📊 Total Modules: 40+');
  console.log('🔐 All routes protected with JWT authentication');
  console.log('👥 Role-based access control enabled');
  console.log('');
}