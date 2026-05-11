# Maternity Data Seeding Guide

## Overview
This script creates 5 test patients with complete maternity records including:
- **Antenatal bookings** with multiple ANC visits
- **Delivery records** with newborn information
- **Postnatal visits** for follow-up care

## Patients Created

### 1. MAT-TEST-001: Akosua Osei (Primigravida - Delivered)
- **Scenario**: First pregnancy, successfully delivered
- **Payment**: NHIS
- **Details**: 
  - G1P0, booked at 12 weeks
  - Delivered at 40 weeks (5 days ago)
  - 2 postnatal visits completed
  - Single live birth

### 2. MAT-TEST-002: Frederica Amankwah (Multigravida - Currently Pregnant)
- **Scenario**: Multiple pregnancies, currently in ANC care
- **Payment**: NHIS
- **Details**:
  - G3P2, booked at 16 weeks
  - Currently 28 weeks pregnant
  - EDD: February 15, 2025
  - Multiple ANC visits recorded
  - No delivery yet (active pregnancy)

### 3. MAT-TEST-003: Victoria Dapaah (High Risk - Delivered)
- **Scenario**: High risk pregnancy, delivered
- **Payment**: Cash
- **Details**:
  - G2P1, booked at 20 weeks
  - Risk factors: Advanced maternal age, Previous CS
  - Delivered at 38 weeks (15 days ago)
  - 3 postnatal visits completed
  - Single live birth

### 4. MAT-TEST-004: Christina Boateng (Cesarean Section)
- **Scenario**: Cesarean section delivery
- **Payment**: NHIS
- **Details**:
  - G2P1, booked at 14 weeks
  - CS at 39 weeks (30 days ago)
  - Indication: Previous CS
  - Spinal anaesthesia
  - 4 postnatal visits completed
  - Single live birth

### 5. MAT-TEST-005: Benedicta Nyarko (Twins Delivery)
- **Scenario**: Twin pregnancy, delivered
- **Payment**: Private Insurance (Acacia Health)
- **Details**:
  - G1P0, booked at 10 weeks
  - Delivered twins at 36 weeks (45 days ago)
  - Preterm labour complication
  - 5 postnatal visits completed
  - Two live births (Male & Female)

## Data Structure

For each patient, the script creates:

### Antenatal Care
- **Patient Record**: Demographics, insurance details
- **Booking Attendance**: Initial antenatal visit
- **Antenatal Booking**: Gravida, para, LMP, EDD, risk assessment
- **ANC Visits**: Monthly visits with:
  - Gestational age, weight, BP
  - Fundal height, fetal heart rate
  - IPTp and TT doses
  - Danger signs screening

### Delivery (for delivered patients)
- **Delivery Attendance**: Intrapartum admission
- **Delivery Record**: Mode of delivery, outcomes, complications
- **Newborn(s)**: Birth weight, APGAR scores, measurements
- **Linked to ANC booking**

### Postnatal Care
- **Postnatal Attendances**: Follow-up visits
- **Postnatal Visits**: 
  - Maternal assessment (BP, involution, wound healing)
  - Breastfeeding support
  - Family planning counseling
  - Baby assessment

## How to Run

### Option 1: Full Database Seed (includes maternity data)
```bash
cd backend
npm run seed
```

### Option 2: Standalone Maternity Seed
```bash
cd backend
npx tsx src/seed/seedMaternityData.ts
```

### Option 3: Force Re-seed (deletes existing maternity data first)
```bash
cd backend
npx tsx src/seed/seedMaternityData.ts --force
```

## Database Requirements

Ensure PostgreSQL is running and `.env` file contains:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hmis_db?schema=public"
ENABLE_SEEDING=true
NODE_ENV=development
```

## Accessing the Data

### Via API Endpoints

**Get Antenatal Bookings:**
```
GET /api/antenatal/bookings?isActive=true
```

**Get Specific Booking:**
```
GET /api/antenatal/booking/:id
```

**Get ANC Visits:**
```
GET /api/antenatal/visits/:bookingId
```

**Get Delivery Records:**
```
GET /api/delivery/records?patientId=:id
```

**Get Postnatal Visits:**
```
GET /api/postnatal/visits?patientId=:id
```

### Via Frontend
- Navigate to **Antenatal Care** module to view bookings and visits
- Navigate to **Labour & Delivery** to view delivery records
- Navigate to **Postnatal Care** to view follow-up visits

## Data Safety Features

✅ **Production Protection**: Won't seed in production without `--force` flag
✅ **Real Data Detection**: Checks for existing real patients before seeding
✅ **Duplicate Prevention**: Skips if maternity test data already exists
✅ **Clean Deletion**: Properly cascades deletes through related tables

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"
**Solution**: Create `.env` file in backend directory with database connection string

### Error: "Database does not exist"
**Solution**: Create the database first:
```sql
CREATE DATABASE hmis_db;
```

### Error: "Real data detected"
**Solution**: This is a safety feature. Either:
- Use `--force` flag to override (only in development!)
- Or delete test patients manually first

## Notes

- All dates are relative to current date (e.g., "5 days ago")
- Midwife user is auto-created if not exists
- All clinical values are realistic but fictional
- NHIS membership numbers follow pattern: NHIS-MAT-XXX
- Folder numbers: MAT-TEST-001 through MAT-TEST-005
