// modules/index.ts - Mount routes at root (no /api prefix)
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
import { createWardRoutes } from './ward';
import { createAuditRoutes } from './audit';
import { createCorporateRoutes } from './corporate';
import { createCommunicationRoutes } from './communication';

export function registerModules(app: Express, prisma: PrismaClient): void {
  console.log('🔧 Registering modules...');

  // Auth routes - mount at /auth (server.ts will add /api prefix)
  const authRoutes = createAuthRoutes(prisma);
  app.use('/auth', authRoutes);
  console.log('✅ Auth routes mounted at /auth');

  // Patient module
  app.use('/patients', createPatientRoutes(prisma));
  
  // Appointment module
  app.use('/appointments', createAppointmentRoutes(prisma));
  
  // Billing module
  app.use('/billing', createBillingRoutes(prisma));
  
  // Department module
  app.use('/departments', createDepartmentRoutes(prisma));
  
  // Antenatal module
  app.use('/antenatal', createAntenatalRoutes(prisma));
  
  // Admission module
  app.use('/admissions', AdmissionRoutes);
  
  // Encounter module
  app.use('/encounters', encounterRoutes);
  
  // Referral module
  app.use('/referrals', ReferralRoutes);
  
  // Worklist module
  app.use('/worklist', WorklistRoutes);
  
  // Backup module
  app.use('/backup', createBackupRoutes());
  
  // Bed module
  app.use('/beds', createBedRoutes(prisma));
  
  // Bill module
  app.use('/bills', BillRoutes);

  // Diagnosis module
  app.use('/diagnoses', DiagnosisRoutes);

  // Document module
  app.use('/documents', documentRoutes);

  // Dashboard module
  app.use('/dashboard', dashboardRoutes);

  // Clinical Reports module
  app.use('/clinical-reports', createClinicalReportsRoutes());

  // Report module
  app.use('/reports', createReportRoutes());

  // Service Catalog module
  app.use('/services', createServiceCatalogRoutes());

  // GDRG module
  app.use('/gdrg', createGDRGRoutes());

  // GHS Report module
  app.use('/ghs-reports', createGHSReportRoutes());

  // Hospital module
  app.use('/hospital', createHospitalRoutes());

  // Insurance Provider module
  app.use('/insurance-providers', createInsuranceProviderRoutes());

  // Insurance Claim module
  app.use('/insurance-claims', createInsuranceClaimRoutes());

  // Invoice module
  app.use('/invoices', createInvoiceRoutes());

  // Lab Test module
  app.use('/lab-tests', createLabTestRoutes());

  // Notification module
  app.use('/notifications', createNotificationRoutes());

  // Procedure module
  app.use('/procedures', createProcedureRoutes());

  // Requisition module
  app.use('/requisitions', createRequisitionRoutes());

  // Scan Template module
  app.use('/scan-templates', createScanTemplateRoutes());

  // Settings module
  app.use('/settings', createSettingsRoutes());

  // Stock Item module
  app.use('/stock-items', createStockItemRoutes());

  // Stock Transaction module
  app.use('/stock-transactions', createStockTransactionRoutes());

  // Waiver module
  app.use('/waivers', createWaiverRoutes());

  // Ward module
  app.use('/wards', createWardRoutes(prisma));

  // Corporate Accounts & Employees
  app.use('/corporate', createCorporateRoutes());

  // SMS/WhatsApp Communication
  app.use('/communications', createCommunicationRoutes());

  // Audit Logging Module
  app.use('/audit', createAuditRoutes());

  console.log('✅ All modules registered successfully');
}