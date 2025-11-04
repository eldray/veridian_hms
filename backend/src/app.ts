// server.ts
import express from 'express';
import cors from 'cors';
import { pathToRegexp } from 'path-to-regexp';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import settingsRoutes from './routes/settingsRoutes';
import patientRoutes from './routes/patientRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import billRoutes from './routes/billRoutes';
import stockItemRoutes from './routes/stockItemRoutes';
import stockTransactionRoutes from './routes/stockTransactionRoutes';
import admissionRoutes from './routes/admissionRoutes';
import wardRoutes from './routes/wardRoutes';
import bedRoutes from './routes/bedRoutes';
import diagnosisRoutes from './routes/diagnosisRoutes';
import insuranceProviderRoutes from './routes/insuranceProviderRoutes';
import insuranceRoutes from './routes/insuranceRoutes';
import labTestTemplateRoutes from './routes/labTestTemplateRoutes';
import procedureTemplateRoutes from './routes/procedureTemplateRoutes';
import serviceCatalogRoutes from './routes/serviceCatalogRoutes';
import hospitalRoutes from './routes/hospitalRoutes';
import vitalsRoutes from './routes/vitalsRoutes';
import reportRoutes from './routes/reportRoutes';
import backupRoutes from './routes/backupRoutes';

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Auth & User Management
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);

// Patient & Clinical Management
app.use('/api/patients', patientRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/vitals', vitalsRoutes);

// Billing & Financial
app.use('/api/bills', billRoutes);
app.use('/api/insurance-providers', insuranceProviderRoutes);
app.use('/api/insurance-claims', insuranceRoutes);

// Inventory & Stock Management
app.use('/api/stock-items', stockItemRoutes);
app.use('/api/stock-transactions', stockTransactionRoutes);

// Facility & Ward Management
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/beds', bedRoutes);

// Medical Services & Templates
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/lab-test-templates', labTestTemplateRoutes);
app.use('/api/procedure-templates', procedureTemplateRoutes);
app.use('/api/service-catalog', serviceCatalogRoutes);

// Reports & Analytics
app.use('/api/reports', reportRoutes);

//Backup and Restores
app.use('/api/backup', backupRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: [
      'auth', 'profile', 'settings', 'patients', 'attendances', 'admissions',
      'vitals', 'bills', 'insurance-providers', 'insurance-claims', 'stock-items',
      'stock-transactions', 'hospitals', 'wards', 'beds', 'diagnoses',
      'lab-test-templates', 'procedure-templates', 'service-catalog', 'reports'
    ]
  });
});



export default app;
