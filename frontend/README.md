# Hospital Management System (HMS) - Complete Frontend Application

A comprehensive Hospital Management System built with React, TypeScript, and Tailwind CSS for managing healthcare facility operations.

## Project Overview

This is a fully functional frontend Hospital Management System designed for private healthcare facilities. The system manages patient registration, clinical workflows, billing with payment processing, insurance claims, stock management with medication dispensing, lab results entry, and admissions through an intuitive role-based interface.

**Status**: All core modules completed with working workflows. Includes unified Medical Entries Dashboard for streamlined clinical workflow. Uses browser localStorage for data persistence.

## System Architecture

### Tech Stack
- **React 18.3.1** - UI framework
- **TypeScript 5.8.3** - Type safety
- **Vite 7.0.0** - Build tool (21s build time)
- **Tailwind CSS 3.4.17** - Styling
- **Zustand 4.4.7** - State management with localStorage persistence
- **React Router DOM 6.30.1** - Client-side routing
- **Lucide React** - Icon library

### All Completed Features

1. **Role-Based Access Control** ✅
   - 6 user roles with specific permissions
   - Role-specific navigation items
   - Protected routes and conditional UI

2. **Patient Management** ✅
   - Comprehensive registration with insurance support
   - Search and filtering
   - Emergency contacts management

3. **Clinical Workflow - Attendance** ✅
   - Complete vitals tracking with auto BMI calculation
   - Diagnosis with ICD coding
   - Medication prescriptions
   - Lab test ordering
   - Medical notes
   - Automatic bill generation

4. **Payment Processing** ✅
   - Multiple payment modes (Cash, Card, Mobile Money, Bank Transfer, Insurance)
   - Payment amount validation
   - Reference number tracking
   - Receipt generation

5. **PDF Generation** ✅
   - Professional receipt printing
   - Insurance claim form generation (NHIS and Private)
   - Hospital branding and signatures
   - Browser print functionality

6. **Medication Dispensing** ✅
   - Pending medications queue
   - Stock availability checking
   - Single and bulk dispensing
   - Automatic stock deduction
   - Dispensing history tracking

7. **Lab Results Entry** ✅
   - Pending tests dashboard
   - Result entry with notes
   - Lab technician assignment
   - Completion tracking

8. **Pharmacy & Stock Management** ✅
   - Stock monitoring with alerts
   - Expiry date tracking
   - Transaction logging
   - Low stock notifications

9. **Admissions & Ward Management** ✅
   - Ward and bed tracking
   - Occupancy rate calculation
   - Active admissions monitoring

10. **Billing System** ✅
    - Bill generation and tracking
    - Payment processing
    - Outstanding balance management
    - Receipt printing integration

11. **Reports & Analytics** ✅
    - Date range filtering
    - Statistics dashboard
    - Registration type breakdown
    - Top diagnoses analysis

12. **Dashboard** ✅
    - Real-time statistics
    - Recent activity feed
    - Quick actions
    - Role-based content

13. **Medical Entries Dashboard** ✅ (NEW)
    - Unified interface for all medical workflows
    - Three integrated modes: Clinical Workflow, Lab Results Entry, Medication Dispensing
    - Role-based tab visibility (doctor/nurse/lab tech/pharmacist)
    - Clinical workflow: Complete patient attendance with vitals, diagnosis, medications, and lab test ordering
    - Lab results entry: View pending tests and submit results with notes
    - Medication dispensing: View pending prescriptions and dispense with automatic stock updates
    - All-in-one medical dashboard eliminates navigation between separate pages

## Project Structure

```
src/
├── utils/
│   └── pdfGenerator.ts       # PDF generation utilities (receipts & claims)
├── types/
│   └── index.ts              # Complete TypeScript type definitions
├── store/                    # Zustand stores with localStorage persistence
│   ├── authStore.ts          # Authentication and user management
│   ├── patientStore.ts       # Patient CRUD operations
│   ├── attendanceStore.ts    # Clinical attendance tracking
│   ├── billingStore.ts       # Bills, payments, insurance claims
│   ├── stockStore.ts         # Inventory and transaction management
│   └── admissionStore.ts     # Ward and admission management
├── components/
│   └── LoginForm.tsx         # Authentication UI with demo credentials
├── layouts/
│   └── DashboardLayout.tsx   # Main layout with role-based navigation
├── pages/
│   ├── Dashboard.tsx         # Dashboard with stats and quick actions
│   ├── MedicalEntries.tsx    # Unified medical workflow dashboard (NEW)
│   ├── Patients.tsx          # Patient list and search
│   ├── PatientRegistration.tsx  # Patient registration form
│   ├── Attendance.tsx        # Attendance listing
│   ├── NewAttendance.tsx     # Clinical workflow form
│   ├── Billing.tsx           # Billing overview with PDF generation
│   ├── ProcessPayment.tsx    # Payment processing interface
│   ├── Pharmacy.tsx          # Stock management interface
│   ├── DispenseMedication.tsx # Medication dispensing workflow
│   ├── LabResults.tsx        # Lab result entry interface
│   ├── Admissions.tsx        # Ward and admission management
│   └── Reports.tsx           # Analytics and reporting
└── App.tsx                   # Router configuration with all routes
```

## User Roles & Demo Credentials

| Role | Username | Password | Key Features |
|------|----------|----------|--------------|
| Admin | admin | admin123 | Full system access, all modules |
| Doctor | doctor1 | doctor123 | Clinical workflow, prescriptions, billing, admissions |
| Nurse | nurse1 | nurse123 | Patient registration, vitals, medical notes, admissions |
| Lab Tech | lab1 | lab123 | Lab result entry, patient viewing |
| Pharmacist | pharma1 | pharma123 | Stock management, medication dispensing |
| Accountant | accounts1 | accounts123 | Billing, payment processing, reports |

## Key Workflows

### Medical Entries Dashboard Workflow (NEW)
**Unified interface for all medical workflows - Accessible to doctors, nurses, lab techs, and pharmacists**

#### Clinical Workflow Mode (Doctors/Nurses)
1. Navigate to Medical Entries dashboard
2. Select "Clinical Workflow" tab
3. Search and select patient
4. Record vital signs (BP, temp, pulse, etc.) - BMI auto-calculated
5. Enter chief complaint, diagnosis, and ICD code
6. Add medications from stock (with dosage, frequency, duration)
7. Order lab tests (type, name, notes)
8. Add medical notes
9. Submit to create attendance record and generate bill

#### Lab Results Entry Mode (Lab Techs)
1. Navigate to Medical Entries dashboard
2. Select "Lab Results Entry" tab
3. View list of pending lab tests
4. Select a test from the dropdown
5. Enter test results and observations
6. Submit to mark test as completed

#### Medication Dispensing Mode (Pharmacists)
1. Navigate to Medical Entries dashboard
2. Select "Medication Dispensing" tab
3. View all pending prescriptions with stock availability
4. Click "Dispense" for medications with sufficient stock
5. System automatically updates medication status and deducts stock

### Payment Processing Workflow
1. Navigate to Billing module
2. Select bill with outstanding balance
3. Click "Process Payment"
4. Choose payment method
5. Enter amount and reference (if applicable)
6. Submit payment
7. Print receipt using PDF generation

### Medication Dispensing Workflow
1. Navigate to Pharmacy → Dispense
2. View pending prescriptions
3. Check stock availability
4. Click "Dispense" for single items or "Dispense All"
5. System automatically:
   - Marks medication as dispensed
   - Deducts from stock
   - Records dispenser and timestamp

### Lab Results Workflow
1. Navigate to Lab Results
2. View pending tests
3. Select test from list
4. Enter results and notes
5. Submit
6. System marks test as completed with timestamp and technician

### PDF Generation
- **Receipts**: Automatically available for bills with payments
- **Claims**: Generate NHIS or Private Insurance claim forms
- Both open in new window for printing/saving

## State Management

All stores use Zustand with localStorage persistence:

- **authStore**: User authentication (key: `hms-auth-storage`)
- **patientStore**: Patient records
- **attendanceStore**: Clinical visits and medications
- **billingStore**: Bills, payments, and claims
- **stockStore**: Inventory and transactions
- **admissionStore**: Ward and admission data

Data persists across browser sessions until localStorage is cleared.

## Important Implementation Details

### Automatic Calculations
- **BMI**: Weight (kg) / (Height (m))²
- **Bill Total**: Consultation fee + medications + lab tests + procedures
- **Stock Balance**: Current stock ± transaction quantity
- **Occupancy Rate**: (Occupied beds / Total beds) × 100

### Payment Validation
- Amount must be > 0
- Amount cannot exceed outstanding balance
- Reference required for Card, Mobile Money, Bank Transfer

### Stock Availability
- Checks current stock before dispensing
- Prevents negative stock
- Alerts when dispensing not possible

### PDF Generation
- Uses browser print functionality
- Professional HTML templates
- Hospital branding included
- Opens in new window for printing

## Build Commands

```bash
# Install dependencies
npm install

# Build for production (21s)
npm run build
```

Build output: 364KB JS (84KB gzipped), 21.5KB CSS (4.4KB gzipped)

## Important Notes

### Entry Point
**Do NOT modify** the script tag in `index.html`:
```html
<script type="module" src="/src/main.tsx"></script>
```

### Data Persistence
- Uses browser localStorage
- Data persists across sessions
- Lost when localStorage is cleared
- All stores auto-sync with localStorage

### PDF Generation
- Uses window.open() for print dialogs
- Requires popup permission
- Generates professional HTML receipts and claims
- Hospital information can be customized in code

## Navigation Structure

Role-based navigation items:
- Dashboard (all roles)
- Medical Entries (admin, doctor, nurse, lab_tech, pharmacist) - NEW UNIFIED DASHBOARD
- Patients (admin, doctor, nurse, lab_tech, accounts)
- Attendance (admin, doctor, nurse, lab_tech)
- Lab Results (admin, lab_tech)
- Billing (admin, doctor, accounts)
- Pharmacy (admin, pharmacist, doctor)
- Dispense (admin, pharmacist)
- Admissions (admin, doctor, nurse)
- Reports (admin, accounts)

## Routes Configuration

```
/dashboard - Main dashboard
/medical-entries - Unified medical workflow dashboard (NEW)
/patients - Patient listing
/patients/register - Patient registration
/attendance - Attendance listing
/attendance/new - New attendance form
/billing - Billing overview
/billing/:billId/payment - Payment processing
/pharmacy - Stock management
/pharmacy/dispense - Medication dispensing
/lab-results - Lab result entry
/admissions - Ward management
/reports - Analytics
```

## Healthcare-Specific Features

### Clinical Data Tracking
- 7 vital sign parameters + BMI
- ICD-coded diagnoses
- Medication tracking with dispensing status
- Lab test ordering and result entry
- Complete medical notes

### Billing & Payments
- Multi-item bill generation
- 5 payment modes
- Partial payment support
- Professional receipt generation
- Outstanding balance tracking

### Stock Management
- Automatic stock deduction on dispensing
- Low stock alerts
- Expiry monitoring (30-day threshold)
- Transaction history with references

### Lab Workflow
- Test ordering by doctors
- Result entry by lab technicians
- Notes and observations
- Completion timestamp tracking

### PDF Documents
- **Receipts**: Payment confirmation with bill summary
- **Claims**: NHIS/Private insurance forms with diagnosis and services

## Production Ready Features

- ✅ Unified Medical Entries Dashboard (NEW)
- ✅ Payment processing with validation
- ✅ PDF receipt generation
- ✅ Insurance claim form generation
- ✅ Medication dispensing with stock tracking
- ✅ Lab result entry workflow
- ✅ Role-based access control
- ✅ Data persistence
- ✅ Search and filtering
- ✅ Automatic calculations
- ✅ Smart alerts and notifications
- ✅ Multi-mode workflow interface (Clinical/Lab/Pharmacy in one dashboard)

## Known Limitations (Frontend-Only)

1. **Demo authentication** - credentials in code
2. **Browser storage** - data lost when cleared
3. **No backend API** - all operations client-side
4. **No real-time sync** - single user only
5. **PDF via print** - not true PDF generation
6. **No file uploads** - patient photos not implemented

## Future Enhancements with Backend

To deploy as production system:
1. Enable Youware Backend for persistent database
2. Implement JWT authentication
3. Add real PDF generation library
4. Implement file upload for patient photos
5. Add real-time notifications
6. Add audit logging
7. Implement email notifications for claims

## Browser Compatibility

Tested on modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires:
- ES2020+ support
- CSS Grid and Flexbox
- Local Storage API
- Window.open() for PDF printing

