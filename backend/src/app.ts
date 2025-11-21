// routes/index.ts
import { Router } from 'express';
import authRoutes from './routes/authRoutes';
import patientRoutes from './routes/patientRoutes';
import admissionRoutes from './routes/admissionRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import billRoutes from './routes/billRoutes';
import diagnosisRoutes from './routes/diagnosisRoutes';
import hospitalRoutes from './routes/hospitalRoutes';
import insuranceClaimRoutes from './routes/insuranceClaimRoutes'; 
import insuranceProviderRoutes from './routes/insuranceProviderRoutes';
import labTestTemplateRoutes from './routes/labTestRoutes';
import procedureTemplateRoutes from './routes/procedureTemplateRoutes';
import reportRoutes from './routes/reportRoutes';
import scanTemplateRoutes from './routes/scanTemplateRoutes';
import serviceCatalogRoutes from './routes/serviceCatalogRoutes';
import settingsRoutes from './routes/settingsRoutes';
import stockItemRoutes from './routes/stockItemRoutes';
import stockTransactionRoutes from './routes/stockTransactionRoutes';
import wardRoutes from './routes/wardRoutes';
import bedRoutes from './routes/bedRoutes';
import profileRoutes from './routes/profileRoutes';
import departmentRoutes from './routes/departmentRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import backupRoutes from './routes/backupRoutes';
import uploadRoutes from './routes/uploadRoutes';
import dashboardRoutes from './routes/dashboardRoutes'; 

const router = Router();

// API routes - Updated to match your file structure
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/dashboard', dashboardRoutes); 
router.use('/admissions', admissionRoutes);
router.use('/attendances', attendanceRoutes);
router.use('/bills', billRoutes);
router.use('/diagnoses', diagnosisRoutes); // Fixed: should be 'diagnoses' to match your file
router.use('/hospitals', hospitalRoutes); // Fixed: should be 'hospitals' to match your file
router.use('/insurance-claims', insuranceClaimRoutes);
router.use('/insurance-providers', insuranceProviderRoutes);
router.use('/lab-test-templates', labTestTemplateRoutes);
router.use('/procedure-templates', procedureTemplateRoutes);
router.use('/reports', reportRoutes);
router.use('/scan-templates', scanTemplateRoutes);
router.use('/service-catalog', serviceCatalogRoutes);
router.use('/settings', settingsRoutes);
router.use('/stock-items', stockItemRoutes);
router.use('/stock-transactions', stockTransactionRoutes);
router.use('/wards', wardRoutes);
router.use('/beds', bedRoutes);
router.use('/profile', profileRoutes);
router.use('/backup', backupRoutes); // Added missing route
router.use('/upload', uploadRoutes);

// Add to your router
router.use('/departments', departmentRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/notifications', notificationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Hospital Management System API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;