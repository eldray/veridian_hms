// modules/index.ts - REMOVE Worklist import
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';

// Import module initializers
import { createAuthRoutes } from './auth/AuthRoutes';
import { createBackupRoutes } from './backup';
import { createPatientRoutes } from './patient';
import { createAppointmentRoutes } from './appointment';
import { createBillingRoutes } from './billing';
import { createDepartmentRoutes } from './department';
import { createAntenatalRoutes } from './antenatal';
import { createAdmissionRoutes } from './admission';
import { encounterRoutes } from './encounter';
import { createReferralRoutes } from './referral/ReferralRoutes';
import { createBedRoutes } from './bed';
import { BillRoutes } from './bill';
import { createDiagnosisRoutes } from './diagnosis/DiagnosisRoutes';
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
import { createPurchaseInvoiceRoutes } from './purchaseInvoice';
import { createLabTestRoutes } from './labTest';
import { createNotificationRoutes } from './notification';
import { createProcedureRoutes } from './procedure';
import { createRequisitionRoutes } from './requisition';
import { createScanTemplateRoutes } from './scanTemplate';
import { createSettingsRoutes } from './settings';
import { createStockItemRoutes } from './stockItem';
import { createStockTransactionRoutes } from './stockTransaction';
import { createWaiverRoutes } from './waiver';
import { createWardRoutes } from './ward';
import { createAuditRoutes } from './audit';
import { createCorporateRoutes } from './corporate';
import { createCommunicationRoutes } from './communication';
import { createProformaInvoiceRoutes } from './proformaInvoice';

export function registerModules(app: Express, prisma: PrismaClient): void {
  console.log('🔧 Registering modules...');

  // ============================================
  // AUTHENTICATION & USER MANAGEMENT
  // ============================================
  const authRoutes = createAuthRoutes(prisma);
  app.use('/auth', authRoutes);
  console.log('✅ Auth routes mounted at /auth');

  // ============================================
  // PATIENT MANAGEMENT
  // ============================================
  app.use('/patients', createPatientRoutes(prisma));
  console.log('✅ Patient routes mounted at /patients');

  // ============================================
  // CLINICAL MODULES
  // ============================================
  app.use('/encounters', encounterRoutes);
  console.log('✅ Encounter routes mounted at /encounters (includes worklist queues)');
  
  app.use('/admissions', createAdmissionRoutes(prisma));
  console.log('✅ Admission routes mounted at /admissions');
  
  app.use('/referrals', createReferralRoutes(prisma));
  console.log('✅ Referral routes mounted at /referrals');
  
  app.use('/antenatal', createAntenatalRoutes(prisma));
  console.log('✅ Antenatal routes mounted at /antenatal');

  // ============================================
  // APPOINTMENTS & SCHEDULING
  // ============================================
  app.use('/appointments', createAppointmentRoutes(prisma));
  console.log('✅ Appointment routes mounted at /appointments');

  // ============================================
  // BILLING & PATIENT FINANCIAL
  // ============================================
  app.use('/billing', createBillingRoutes(prisma));
  console.log('✅ Billing routes mounted at /billing');
  
  app.use('/bills', BillRoutes);
  console.log('✅ Bill routes mounted at /bills');
  
  app.use('/estimates', createProformaInvoiceRoutes(prisma));
  console.log('✅ Patient Estimate routes mounted at /estimates');
  
  app.use('/waivers', createWaiverRoutes());
  console.log('✅ Waiver routes mounted at /waivers');

  // ============================================
  // INSURANCE & CLAIMS
  // ============================================
  app.use('/insurance-providers', createInsuranceProviderRoutes());
  console.log('✅ Insurance Provider routes mounted at /insurance-providers');
  
  app.use('/insurance-claims', createInsuranceClaimRoutes());
  console.log('✅ Insurance Claim routes mounted at /insurance-claims');
  
  app.use('/corporate', createCorporateRoutes());
  console.log('✅ Corporate routes mounted at /corporate');

  // ============================================
  // WARD & BED MANAGEMENT
  // ============================================
  app.use('/wards', createWardRoutes(prisma));
  console.log('✅ Ward routes mounted at /wards');
  
  app.use('/beds', createBedRoutes(prisma));
  console.log('✅ Bed routes mounted at /beds');

  // ============================================
  // STOCK & PHARMACY
  // ============================================
  app.use('/purchase-invoices', createPurchaseInvoiceRoutes());
  console.log('✅ Purchase Invoice routes mounted at /purchase-invoices');
  
  app.use('/stock-items', createStockItemRoutes());
  console.log('✅ Stock Item routes mounted at /stock-items');
  
  app.use('/stock-transactions', createStockTransactionRoutes());
  console.log('✅ Stock Transaction routes mounted at /stock-transactions');
  
  app.use('/requisitions', createRequisitionRoutes(prisma));
  console.log('✅ Requisition routes mounted at /requisitions');

  // ============================================
  // LABORATORY & DIAGNOSTICS
  // ============================================

  app.use('/lab-tests', createLabTestRoutes(prisma));   
  console.log('✅ Lab Test routes mounted at /lab-tests');
  
  app.use('/diagnoses', createDiagnosisRoutes(prisma));
  console.log('✅ Diagnosis routes mounted at /diagnoses');
  
  app.use('/gdrg', createGDRGRoutes(prisma)); 
  console.log('✅ GDRG routes mounted at /gdrg');
  
  app.use('/procedures', createProcedureRoutes(prisma));   
  console.log('✅ Procedure routes mounted at /procedures');
  
  app.use('/scan-templates', createScanTemplateRoutes(prisma));
  console.log('✅ Scan Template routes mounted at /scan-templates');

  // ============================================
  // SERVICE CATALOG & PRICING
  // ============================================
  app.use('/services', createServiceCatalogRoutes());
  console.log('✅ Service Catalog routes mounted at /services');
  
  app.use('/departments', createDepartmentRoutes(prisma));
  console.log('✅ Department routes mounted at /departments');

  // ============================================
  // REPORTS & ANALYTICS
  // ============================================
  app.use('/clinical-reports', createClinicalReportsRoutes(prisma));  // ✅ Pass prisma
  console.log('✅ Clinical Reports routes mounted at /clinical-reports');
  
  app.use('/reports', createReportRoutes(prisma)); 
  console.log('✅ Report routes mounted at /reports');

  app.use('/ghs-reports', createGHSReportRoutes(prisma));  // ✅ Pass prisma
  console.log('✅ GHS Report routes mounted at /ghs-reports');
  
  app.use('/dashboard', dashboardRoutes);
  console.log('✅ Dashboard routes mounted at /dashboard');

  // ============================================
  // SYSTEM & CONFIGURATION
  // ============================================
  app.use('/hospital', createHospitalRoutes());
  console.log('✅ Hospital routes mounted at /hospital');
  
  app.use('/settings', createSettingsRoutes());
  console.log('✅ Settings routes mounted at /settings');
  
  app.use('/backup', createBackupRoutes());
  console.log('✅ Backup routes mounted at /backup');
  
  app.use('/audit', createAuditRoutes());
  console.log('✅ Audit routes mounted at /audit');
  
  app.use('/documents', documentRoutes);
  console.log('✅ Document routes mounted at /documents');

  // ============================================
  // COMMUNICATIONS
  // ============================================
  // modules/index.ts - Look for this line
  app.use('/notifications', createNotificationRoutes(prisma));  // ✅ Pass prisma
  console.log('✅ Notification routes mounted at /notifications');
  
  app.use('/communications', createCommunicationRoutes());
  console.log('✅ Communication routes mounted at /communications');

  console.log('✅ All modules registered successfully');
  console.log('');
  console.log('📋 API Worklist Endpoints (via Encounter module):');
  console.log('   GET /encounters/worklist/vitals     - Vitals queue');
  console.log('   GET /encounters/worklist/medical    - Doctor consultation queue');
  console.log('   GET /encounters/worklist/lab        - Lab test queue');
  console.log('   GET /encounters/worklist/pharmacy   - Pharmacy queue');
}