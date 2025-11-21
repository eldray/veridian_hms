--
-- PostgreSQL database dump
--

\restrict ZSIUXFjzamqMzZs7XU2JePc2Po8HZWnH7G1bySH4ErmrlJBJRiVuK3THpEb3Wko

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS "notifications_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS "departments_headId_fkey";
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS "appointments_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS "appointments_doctorId_fkey";
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS "appointments_departmentId_fkey";
ALTER TABLE IF EXISTS ONLY public."Vitals" DROP CONSTRAINT IF EXISTS "Vitals_recordedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Vitals" DROP CONSTRAINT IF EXISTS "Vitals_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public."Vitals" DROP CONSTRAINT IF EXISTS "Vitals_attendanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_departmentId_fkey";
ALTER TABLE IF EXISTS ONLY public."StockTransaction" DROP CONSTRAINT IF EXISTS "StockTransaction_stockItemId_fkey";
ALTER TABLE IF EXISTS ONLY public."ServiceRendered" DROP CONSTRAINT IF EXISTS "ServiceRendered_serviceItemId_fkey";
ALTER TABLE IF EXISTS ONLY public."ServiceRendered" DROP CONSTRAINT IF EXISTS "ServiceRendered_performedById_fkey";
ALTER TABLE IF EXISTS ONLY public."ServiceRendered" DROP CONSTRAINT IF EXISTS "ServiceRendered_attendanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."ServiceCatalog" DROP CONSTRAINT IF EXISTS "ServiceCatalog_wardId_fkey";
ALTER TABLE IF EXISTS ONLY public."ServiceCatalog" DROP CONSTRAINT IF EXISTS "ServiceCatalog_stockItemId_fkey";
ALTER TABLE IF EXISTS ONLY public."ServiceCatalog" DROP CONSTRAINT IF EXISTS "ServiceCatalog_scanTemplateId_fkey";
ALTER TABLE IF EXISTS ONLY public."ServiceCatalog" DROP CONSTRAINT IF EXISTS "ServiceCatalog_procedureTemplateId_fkey";
ALTER TABLE IF EXISTS ONLY public."ServiceCatalog" DROP CONSTRAINT IF EXISTS "ServiceCatalog_labTestTemplateId_fkey";
ALTER TABLE IF EXISTS ONLY public."ServiceCatalog" DROP CONSTRAINT IF EXISTS "ServiceCatalog_diagnosisId_fkey";
ALTER TABLE IF EXISTS ONLY public."ServiceCatalog" DROP CONSTRAINT IF EXISTS "ServiceCatalog_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."Scan" DROP CONSTRAINT IF EXISTS "Scan_verifiedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Scan" DROP CONSTRAINT IF EXISTS "Scan_templateId_fkey";
ALTER TABLE IF EXISTS ONLY public."Scan" DROP CONSTRAINT IF EXISTS "Scan_performedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Scan" DROP CONSTRAINT IF EXISTS "Scan_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."Scan" DROP CONSTRAINT IF EXISTS "Scan_attendanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."Procedure" DROP CONSTRAINT IF EXISTS "Procedure_templateId_fkey";
ALTER TABLE IF EXISTS ONLY public."Procedure" DROP CONSTRAINT IF EXISTS "Procedure_performedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Procedure" DROP CONSTRAINT IF EXISTS "Procedure_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."Procedure" DROP CONSTRAINT IF EXISTS "Procedure_attendanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."Procedure" DROP CONSTRAINT IF EXISTS "Procedure_assistantId_fkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_receivedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_billId_fkey";
ALTER TABLE IF EXISTS ONLY public."Patient" DROP CONSTRAINT IF EXISTS "Patient_insuranceProviderId_fkey";
ALTER TABLE IF EXISTS ONLY public."Medication" DROP CONSTRAINT IF EXISTS "Medication_stockItemId_fkey";
ALTER TABLE IF EXISTS ONLY public."Medication" DROP CONSTRAINT IF EXISTS "Medication_prescribedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Medication" DROP CONSTRAINT IF EXISTS "Medication_dispensedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Medication" DROP CONSTRAINT IF EXISTS "Medication_attendanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."Medication" DROP CONSTRAINT IF EXISTS "Medication_administeredById_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTest" DROP CONSTRAINT IF EXISTS "LabTest_verifiedById_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTest" DROP CONSTRAINT IF EXISTS "LabTest_templateId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTest" DROP CONSTRAINT IF EXISTS "LabTest_performedById_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTest" DROP CONSTRAINT IF EXISTS "LabTest_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTest" DROP CONSTRAINT IF EXISTS "LabTest_attendanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."InsuranceClaim" DROP CONSTRAINT IF EXISTS "InsuranceClaim_updatedById_fkey";
ALTER TABLE IF EXISTS ONLY public."InsuranceClaim" DROP CONSTRAINT IF EXISTS "InsuranceClaim_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public."InsuranceClaim" DROP CONSTRAINT IF EXISTS "InsuranceClaim_insuranceProviderId_fkey";
ALTER TABLE IF EXISTS ONLY public."InsuranceClaim" DROP CONSTRAINT IF EXISTS "InsuranceClaim_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."InsuranceClaim" DROP CONSTRAINT IF EXISTS "InsuranceClaim_billId_fkey";
ALTER TABLE IF EXISTS ONLY public."InsuranceClaim" DROP CONSTRAINT IF EXISTS "InsuranceClaim_attendanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."GDRGTariff" DROP CONSTRAINT IF EXISTS "GDRGTariff_gdrgCode_fkey";
ALTER TABLE IF EXISTS ONLY public."Bill" DROP CONSTRAINT IF EXISTS "Bill_updatedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Bill" DROP CONSTRAINT IF EXISTS "Bill_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public."Bill" DROP CONSTRAINT IF EXISTS "Bill_insuranceProviderId_fkey";
ALTER TABLE IF EXISTS ONLY public."Bill" DROP CONSTRAINT IF EXISTS "Bill_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."Bill" DROP CONSTRAINT IF EXISTS "Bill_attendanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."Bill" DROP CONSTRAINT IF EXISTS "Bill_admissionId_fkey";
ALTER TABLE IF EXISTS ONLY public."Bed" DROP CONSTRAINT IF EXISTS "Bed_wardId_fkey";
ALTER TABLE IF EXISTS ONLY public."Bed" DROP CONSTRAINT IF EXISTS "Bed_currentPatientId_fkey";
ALTER TABLE IF EXISTS ONLY public."Attendance" DROP CONSTRAINT IF EXISTS "Attendance_wardId_fkey";
ALTER TABLE IF EXISTS ONLY public."Attendance" DROP CONSTRAINT IF EXISTS "Attendance_updatedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Attendance" DROP CONSTRAINT IF EXISTS "Attendance_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public."Attendance" DROP CONSTRAINT IF EXISTS "Attendance_insuranceProviderId_fkey";
ALTER TABLE IF EXISTS ONLY public."Attendance" DROP CONSTRAINT IF EXISTS "Attendance_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."Attendance" DROP CONSTRAINT IF EXISTS "Attendance_bedId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceDiagnosis" DROP CONSTRAINT IF EXISTS "AttendanceDiagnosis_diagnosisId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceDiagnosis" DROP CONSTRAINT IF EXISTS "AttendanceDiagnosis_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceDiagnosis" DROP CONSTRAINT IF EXISTS "AttendanceDiagnosis_attendanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."Admission" DROP CONSTRAINT IF EXISTS "Admission_wardId_fkey";
ALTER TABLE IF EXISTS ONLY public."Admission" DROP CONSTRAINT IF EXISTS "Admission_principalDiagnosisId_fkey";
ALTER TABLE IF EXISTS ONLY public."Admission" DROP CONSTRAINT IF EXISTS "Admission_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public."Admission" DROP CONSTRAINT IF EXISTS "Admission_bedId_fkey";
ALTER TABLE IF EXISTS ONLY public."Admission" DROP CONSTRAINT IF EXISTS "Admission_attendanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."AdmissionSecondaryDiagnosis" DROP CONSTRAINT IF EXISTS "AdmissionSecondaryDiagnosis_diagnosisId_fkey";
ALTER TABLE IF EXISTS ONLY public."AdmissionSecondaryDiagnosis" DROP CONSTRAINT IF EXISTS "AdmissionSecondaryDiagnosis_admissionId_fkey";
DROP INDEX IF EXISTS public.departments_name_key;
DROP INDEX IF EXISTS public."departments_headId_key";
DROP INDEX IF EXISTS public."appointments_appointmentNumber_key";
DROP INDEX IF EXISTS public."Vitals_patientId_idx";
DROP INDEX IF EXISTS public."Vitals_attendanceId_idx";
DROP INDEX IF EXISTS public."User_username_key";
DROP INDEX IF EXISTS public."StockItem_drugCode_key";
DROP INDEX IF EXISTS public."ServiceCatalog_serviceType_isPending_idx";
DROP INDEX IF EXISTS public."ServiceCatalog_serviceCategory_serviceType_idx";
DROP INDEX IF EXISTS public."ServiceCatalog_nhisServiceCode_idx";
DROP INDEX IF EXISTS public."ServiceCatalog_nhisCoverageType_idx";
DROP INDEX IF EXISTS public."ServiceCatalog_isPrivateInsuranceExempted_idx";
DROP INDEX IF EXISTS public."ServiceCatalog_code_key";
DROP INDEX IF EXISTS public."ServiceCatalog_code_idx";
DROP INDEX IF EXISTS public."ScanTemplate_scanCode_key";
DROP INDEX IF EXISTS public."ProcedureTemplate_procedureCode_key";
DROP INDEX IF EXISTS public."Payment_transactionDate_idx";
DROP INDEX IF EXISTS public."Payment_billId_idx";
DROP INDEX IF EXISTS public."Patient_surname_idx";
DROP INDEX IF EXISTS public."Patient_paymentMode_idx";
DROP INDEX IF EXISTS public."Patient_otherNames_idx";
DROP INDEX IF EXISTS public."Patient_folderNumber_key";
DROP INDEX IF EXISTS public."Patient_folderNumber_idx";
DROP INDEX IF EXISTS public."LabTestTemplate_investigationCode_key";
DROP INDEX IF EXISTS public."InsuranceClaim_claimNumber_key";
DROP INDEX IF EXISTS public."InsuranceClaim_attendanceId_key";
DROP INDEX IF EXISTS public."Hospital_nhisFacilityCode_key";
DROP INDEX IF EXISTS public."GDRGTariff_isActive_idx";
DROP INDEX IF EXISTS public."GDRGTariff_gdrgCode_effectiveFrom_idx";
DROP INDEX IF EXISTS public."Diagnosis_gdrgCode_key";
DROP INDEX IF EXISTS public."ConsultationType_code_key";
DROP INDEX IF EXISTS public."Bill_status_idx";
DROP INDEX IF EXISTS public."Bill_patientId_idx";
DROP INDEX IF EXISTS public."Bill_billNumber_key";
DROP INDEX IF EXISTS public."Bill_billNumber_idx";
DROP INDEX IF EXISTS public."Bill_billDate_idx";
DROP INDEX IF EXISTS public."Bill_attendanceId_key";
DROP INDEX IF EXISTS public."Bill_attendanceId_idx";
DROP INDEX IF EXISTS public."Bed_wardId_bedNumber_key";
DROP INDEX IF EXISTS public."Bed_currentPatientId_key";
DROP INDEX IF EXISTS public."Attendance_status_idx";
DROP INDEX IF EXISTS public."Attendance_paymentMode_idx";
DROP INDEX IF EXISTS public."Attendance_patientId_idx";
DROP INDEX IF EXISTS public."Attendance_insuranceClaimId_key";
DROP INDEX IF EXISTS public."Attendance_dateTime_idx";
DROP INDEX IF EXISTS public."Attendance_attendanceType_idx";
DROP INDEX IF EXISTS public."Attendance_attendanceNumber_key";
DROP INDEX IF EXISTS public."Admission_status_idx";
DROP INDEX IF EXISTS public."Admission_patientId_idx";
DROP INDEX IF EXISTS public."Admission_attendanceId_key";
DROP INDEX IF EXISTS public."Admission_admissionNumber_key";
DROP INDEX IF EXISTS public."Admission_admissionNumber_idx";
DROP INDEX IF EXISTS public."AdmissionSecondaryDiagnosis_admissionId_diagnosisId_diagnos_key";
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_pkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_pkey;
ALTER TABLE IF EXISTS ONLY public."Ward" DROP CONSTRAINT IF EXISTS "Ward_pkey";
ALTER TABLE IF EXISTS ONLY public."Vitals" DROP CONSTRAINT IF EXISTS "Vitals_pkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."StockTransaction" DROP CONSTRAINT IF EXISTS "StockTransaction_pkey";
ALTER TABLE IF EXISTS ONLY public."StockItem" DROP CONSTRAINT IF EXISTS "StockItem_pkey";
ALTER TABLE IF EXISTS ONLY public."ServiceRendered" DROP CONSTRAINT IF EXISTS "ServiceRendered_pkey";
ALTER TABLE IF EXISTS ONLY public."ServiceCatalog" DROP CONSTRAINT IF EXISTS "ServiceCatalog_pkey";
ALTER TABLE IF EXISTS ONLY public."Scan" DROP CONSTRAINT IF EXISTS "Scan_pkey";
ALTER TABLE IF EXISTS ONLY public."ScanTemplate" DROP CONSTRAINT IF EXISTS "ScanTemplate_pkey";
ALTER TABLE IF EXISTS ONLY public."Procedure" DROP CONSTRAINT IF EXISTS "Procedure_pkey";
ALTER TABLE IF EXISTS ONLY public."ProcedureTemplate" DROP CONSTRAINT IF EXISTS "ProcedureTemplate_pkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_pkey";
ALTER TABLE IF EXISTS ONLY public."Patient" DROP CONSTRAINT IF EXISTS "Patient_pkey";
ALTER TABLE IF EXISTS ONLY public."Medication" DROP CONSTRAINT IF EXISTS "Medication_pkey";
ALTER TABLE IF EXISTS ONLY public."LabTest" DROP CONSTRAINT IF EXISTS "LabTest_pkey";
ALTER TABLE IF EXISTS ONLY public."LabTestTemplate" DROP CONSTRAINT IF EXISTS "LabTestTemplate_pkey";
ALTER TABLE IF EXISTS ONLY public."InsuranceProvider" DROP CONSTRAINT IF EXISTS "InsuranceProvider_pkey";
ALTER TABLE IF EXISTS ONLY public."InsuranceClaim" DROP CONSTRAINT IF EXISTS "InsuranceClaim_pkey";
ALTER TABLE IF EXISTS ONLY public."Hospital" DROP CONSTRAINT IF EXISTS "Hospital_pkey";
ALTER TABLE IF EXISTS ONLY public."GDRGTariff" DROP CONSTRAINT IF EXISTS "GDRGTariff_pkey";
ALTER TABLE IF EXISTS ONLY public."Diagnosis" DROP CONSTRAINT IF EXISTS "Diagnosis_pkey";
ALTER TABLE IF EXISTS ONLY public."ConsultationType" DROP CONSTRAINT IF EXISTS "ConsultationType_pkey";
ALTER TABLE IF EXISTS ONLY public."Bill" DROP CONSTRAINT IF EXISTS "Bill_pkey";
ALTER TABLE IF EXISTS ONLY public."Bed" DROP CONSTRAINT IF EXISTS "Bed_pkey";
ALTER TABLE IF EXISTS ONLY public."Attendance" DROP CONSTRAINT IF EXISTS "Attendance_pkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceDiagnosis" DROP CONSTRAINT IF EXISTS "AttendanceDiagnosis_pkey";
ALTER TABLE IF EXISTS ONLY public."Admission" DROP CONSTRAINT IF EXISTS "Admission_pkey";
ALTER TABLE IF EXISTS ONLY public."AdmissionSecondaryDiagnosis" DROP CONSTRAINT IF EXISTS "AdmissionSecondaryDiagnosis_pkey";
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.departments;
DROP TABLE IF EXISTS public.appointments;
DROP TABLE IF EXISTS public."Ward";
DROP TABLE IF EXISTS public."Vitals";
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."StockTransaction";
DROP TABLE IF EXISTS public."StockItem";
DROP TABLE IF EXISTS public."ServiceRendered";
DROP TABLE IF EXISTS public."ServiceCatalog";
DROP TABLE IF EXISTS public."ScanTemplate";
DROP TABLE IF EXISTS public."Scan";
DROP TABLE IF EXISTS public."ProcedureTemplate";
DROP TABLE IF EXISTS public."Procedure";
DROP TABLE IF EXISTS public."Payment";
DROP TABLE IF EXISTS public."Patient";
DROP TABLE IF EXISTS public."Medication";
DROP TABLE IF EXISTS public."LabTestTemplate";
DROP TABLE IF EXISTS public."LabTest";
DROP TABLE IF EXISTS public."InsuranceProvider";
DROP TABLE IF EXISTS public."InsuranceClaim";
DROP TABLE IF EXISTS public."Hospital";
DROP TABLE IF EXISTS public."GDRGTariff";
DROP TABLE IF EXISTS public."Diagnosis";
DROP TABLE IF EXISTS public."ConsultationType";
DROP TABLE IF EXISTS public."Bill";
DROP TABLE IF EXISTS public."Bed";
DROP TABLE IF EXISTS public."AttendanceDiagnosis";
DROP TABLE IF EXISTS public."Attendance";
DROP TABLE IF EXISTS public."AdmissionSecondaryDiagnosis";
DROP TABLE IF EXISTS public."Admission";
DROP TYPE IF EXISTS public."VisitCategory";
DROP TYPE IF EXISTS public."UserRole";
DROP TYPE IF EXISTS public."SpecimenType";
DROP TYPE IF EXISTS public."ServiceType";
DROP TYPE IF EXISTS public."ServiceCategory";
DROP TYPE IF EXISTS public."SecondaryDiagnosisType";
DROP TYPE IF EXISTS public."ScanStatus";
DROP TYPE IF EXISTS public."ScanPriority";
DROP TYPE IF EXISTS public."ScanCategory";
DROP TYPE IF EXISTS public."ProcedureStatus";
DROP TYPE IF EXISTS public."ProcedureCategory";
DROP TYPE IF EXISTS public."Priority";
DROP TYPE IF EXISTS public."PresentOnAdmission";
DROP TYPE IF EXISTS public."PaymentMode";
DROP TYPE IF EXISTS public."PaymentMethod";
DROP TYPE IF EXISTS public."NotificationType";
DROP TYPE IF EXISTS public."NotificationPriority";
DROP TYPE IF EXISTS public."NHISCoverageType";
DROP TYPE IF EXISTS public."MedicationStatus";
DROP TYPE IF EXISTS public."LabTestStatus";
DROP TYPE IF EXISTS public."LabCategory";
DROP TYPE IF EXISTS public."InsuranceType";
DROP TYPE IF EXISTS public."Gender";
DROP TYPE IF EXISTS public."FacilityType";
DROP TYPE IF EXISTS public."EncounterCategory";
DROP TYPE IF EXISTS public."DischargeStatus";
DROP TYPE IF EXISTS public."DiagnosisVariant";
DROP TYPE IF EXISTS public."DiagnosisType";
DROP TYPE IF EXISTS public."DiagnosisCategory";
DROP TYPE IF EXISTS public."ClaimStatus";
DROP TYPE IF EXISTS public."BodyPart";
DROP TYPE IF EXISTS public."BillStatus";
DROP TYPE IF EXISTS public."AttendanceType";
DROP TYPE IF EXISTS public."AttendanceStatus";
DROP TYPE IF EXISTS public."AppointmentType";
DROP TYPE IF EXISTS public."AppointmentStatus";
DROP TYPE IF EXISTS public."AdmissionType";
DROP TYPE IF EXISTS public."AdmissionSource";
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: hospital_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO hospital_user;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: hospital_user
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AdmissionSource; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."AdmissionSource" AS ENUM (
    'home',
    'referral',
    'another_facility',
    'opd',
    'emergency'
);


ALTER TYPE public."AdmissionSource" OWNER TO hospital_user;

--
-- Name: AdmissionType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."AdmissionType" AS ENUM (
    'elective',
    'emergency',
    'transfer'
);


ALTER TYPE public."AdmissionType" OWNER TO hospital_user;

--
-- Name: AppointmentStatus; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."AppointmentStatus" AS ENUM (
    'scheduled',
    'confirmed',
    'checked_in',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);


ALTER TYPE public."AppointmentStatus" OWNER TO hospital_user;

--
-- Name: AppointmentType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."AppointmentType" AS ENUM (
    'consultation',
    'follow_up',
    'procedure',
    'antenatal',
    'postnatal',
    'vaccination',
    'lab_test',
    'scan',
    'other'
);


ALTER TYPE public."AppointmentType" OWNER TO hospital_user;

--
-- Name: AttendanceStatus; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."AttendanceStatus" AS ENUM (
    'pending',
    'completed',
    'cancelled',
    'admitted',
    'discharged'
);


ALTER TYPE public."AttendanceStatus" OWNER TO hospital_user;

--
-- Name: AttendanceType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."AttendanceType" AS ENUM (
    'emergency_acute',
    'antenatal',
    'postnatal',
    'chronic_followup',
    'specialist_consultation',
    'delivery',
    'surgery',
    'general_consultation'
);


ALTER TYPE public."AttendanceType" OWNER TO hospital_user;

--
-- Name: BillStatus; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."BillStatus" AS ENUM (
    'draft',
    'pending',
    'partial',
    'paid',
    'cancelled'
);


ALTER TYPE public."BillStatus" OWNER TO hospital_user;

--
-- Name: BodyPart; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."BodyPart" AS ENUM (
    'head',
    'chest',
    'neck',
    'abdomen',
    'pelvis',
    'spine',
    'extremities',
    'breast',
    'other'
);


ALTER TYPE public."BodyPart" OWNER TO hospital_user;

--
-- Name: ClaimStatus; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."ClaimStatus" AS ENUM (
    'draft',
    'not_required',
    'pending',
    'submitted',
    'approved',
    'partially_approved',
    'rejected',
    'paid'
);


ALTER TYPE public."ClaimStatus" OWNER TO hospital_user;

--
-- Name: DiagnosisCategory; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."DiagnosisCategory" AS ENUM (
    'medical',
    'surgical',
    'obstetric',
    'pediatric',
    'psychiatric'
);


ALTER TYPE public."DiagnosisCategory" OWNER TO hospital_user;

--
-- Name: DiagnosisType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."DiagnosisType" AS ENUM (
    'principal',
    'secondary',
    'comorbidity'
);


ALTER TYPE public."DiagnosisType" OWNER TO hospital_user;

--
-- Name: DiagnosisVariant; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."DiagnosisVariant" AS ENUM (
    'adult',
    'child',
    'complicated',
    'uncomplicated'
);


ALTER TYPE public."DiagnosisVariant" OWNER TO hospital_user;

--
-- Name: DischargeStatus; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."DischargeStatus" AS ENUM (
    'home',
    'transfer',
    'expired',
    'against_medical_advice'
);


ALTER TYPE public."DischargeStatus" OWNER TO hospital_user;

--
-- Name: EncounterCategory; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."EncounterCategory" AS ENUM (
    'opd',
    'ipd',
    'daycase'
);


ALTER TYPE public."EncounterCategory" OWNER TO hospital_user;

--
-- Name: FacilityType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."FacilityType" AS ENUM (
    'Tertiary',
    'Secondary',
    'Primary',
    'Clinic',
    'Health_Center',
    'Maternity_Home'
);


ALTER TYPE public."FacilityType" OWNER TO hospital_user;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."Gender" AS ENUM (
    'male',
    'female',
    'other'
);


ALTER TYPE public."Gender" OWNER TO hospital_user;

--
-- Name: InsuranceType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."InsuranceType" AS ENUM (
    'nhis',
    'private'
);


ALTER TYPE public."InsuranceType" OWNER TO hospital_user;

--
-- Name: LabCategory; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."LabCategory" AS ENUM (
    'hematology',
    'biochemistry',
    'microbiology',
    'serology',
    'immunology',
    'toxicology',
    'molecular',
    'cytology',
    'histopathology'
);


ALTER TYPE public."LabCategory" OWNER TO hospital_user;

--
-- Name: LabTestStatus; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."LabTestStatus" AS ENUM (
    'requested',
    'completed',
    'cancelled'
);


ALTER TYPE public."LabTestStatus" OWNER TO hospital_user;

--
-- Name: MedicationStatus; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."MedicationStatus" AS ENUM (
    'prescribed',
    'dispensed',
    'administered',
    'cancelled'
);


ALTER TYPE public."MedicationStatus" OWNER TO hospital_user;

--
-- Name: NHISCoverageType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."NHISCoverageType" AS ENUM (
    'full',
    'partial',
    'not_covered'
);


ALTER TYPE public."NHISCoverageType" OWNER TO hospital_user;

--
-- Name: NotificationPriority; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."NotificationPriority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE public."NotificationPriority" OWNER TO hospital_user;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."NotificationType" AS ENUM (
    'info',
    'success',
    'warning',
    'error',
    'system',
    'appointment',
    'billing',
    'clinical'
);


ALTER TYPE public."NotificationType" OWNER TO hospital_user;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'cash',
    'mobile_money',
    'card',
    'bank_transfer',
    'cheque'
);


ALTER TYPE public."PaymentMethod" OWNER TO hospital_user;

--
-- Name: PaymentMode; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."PaymentMode" AS ENUM (
    'cash',
    'nhis',
    'private_insurance'
);


ALTER TYPE public."PaymentMode" OWNER TO hospital_user;

--
-- Name: PresentOnAdmission; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."PresentOnAdmission" AS ENUM (
    'Y',
    'N',
    'U'
);


ALTER TYPE public."PresentOnAdmission" OWNER TO hospital_user;

--
-- Name: Priority; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."Priority" AS ENUM (
    'routine',
    'urgent',
    'stat'
);


ALTER TYPE public."Priority" OWNER TO hospital_user;

--
-- Name: ProcedureCategory; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."ProcedureCategory" AS ENUM (
    'surgical',
    'diagnostic',
    'therapeutic',
    'obstetric',
    'pediatric',
    'dental',
    'ophthalmic'
);


ALTER TYPE public."ProcedureCategory" OWNER TO hospital_user;

--
-- Name: ProcedureStatus; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."ProcedureStatus" AS ENUM (
    'scheduled',
    'completed',
    'cancelled'
);


ALTER TYPE public."ProcedureStatus" OWNER TO hospital_user;

--
-- Name: ScanCategory; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."ScanCategory" AS ENUM (
    'xray',
    'ultrasound',
    'ct_scan',
    'mri',
    'fluoroscopy',
    'mammography',
    'nuclear',
    'pet_scan',
    'other'
);


ALTER TYPE public."ScanCategory" OWNER TO hospital_user;

--
-- Name: ScanPriority; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."ScanPriority" AS ENUM (
    'routine',
    'urgent'
);


ALTER TYPE public."ScanPriority" OWNER TO hospital_user;

--
-- Name: ScanStatus; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."ScanStatus" AS ENUM (
    'requested',
    'completed',
    'cancelled'
);


ALTER TYPE public."ScanStatus" OWNER TO hospital_user;

--
-- Name: SecondaryDiagnosisType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."SecondaryDiagnosisType" AS ENUM (
    'comorbidity',
    'complication'
);


ALTER TYPE public."SecondaryDiagnosisType" OWNER TO hospital_user;

--
-- Name: ServiceCategory; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."ServiceCategory" AS ENUM (
    'opd',
    'ipd',
    'diagnostics',
    'pharmacy',
    'other'
);


ALTER TYPE public."ServiceCategory" OWNER TO hospital_user;

--
-- Name: ServiceType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."ServiceType" AS ENUM (
    'consultation',
    'ward',
    'lab_test',
    'scan',
    'medication',
    'procedure',
    'diagnosis',
    'miscellaneous'
);


ALTER TYPE public."ServiceType" OWNER TO hospital_user;

--
-- Name: SpecimenType; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."SpecimenType" AS ENUM (
    'blood',
    'urine',
    'stool',
    'csf',
    'sputum',
    'fluid',
    'semen',
    'tissue',
    'saliva',
    'swab',
    'other'
);


ALTER TYPE public."SpecimenType" OWNER TO hospital_user;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."UserRole" AS ENUM (
    'admin',
    'doctor',
    'nurse',
    'midwife',
    'records',
    'lab_tech',
    'pharmacist',
    'accounts',
    'sonographer'
);


ALTER TYPE public."UserRole" OWNER TO hospital_user;

--
-- Name: VisitCategory; Type: TYPE; Schema: public; Owner: hospital_user
--

CREATE TYPE public."VisitCategory" AS ENUM (
    'general',
    'specialist',
    'emergency',
    'inpatient'
);


ALTER TYPE public."VisitCategory" OWNER TO hospital_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Admission; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Admission" (
    id text NOT NULL,
    "admissionNumber" text NOT NULL,
    "patientId" text NOT NULL,
    "attendanceId" text,
    "wardId" text NOT NULL,
    "bedId" text NOT NULL,
    "admissionDate" timestamp(3) without time zone NOT NULL,
    "admissionTime" text NOT NULL,
    "admittingDoctor" text NOT NULL,
    "reasonForAdmission" text NOT NULL,
    diagnosis text NOT NULL,
    status text DEFAULT 'admitted'::text NOT NULL,
    "dischargeDate" timestamp(3) without time zone,
    "dischargeTime" text,
    "dischargeSummary" text,
    "dailyNotes" jsonb,
    "createdBy" text NOT NULL,
    "admissionType" public."AdmissionType" DEFAULT 'emergency'::public."AdmissionType" NOT NULL,
    "admissionSource" public."AdmissionSource" DEFAULT 'home'::public."AdmissionSource" NOT NULL,
    "dischargeStatus" public."DischargeStatus",
    "lengthOfStay" integer DEFAULT 0 NOT NULL,
    "principalDiagnosisId" text NOT NULL,
    "principalIcdCode" text NOT NULL,
    "principalPresentOnAdmission" public."PresentOnAdmission" DEFAULT 'Y'::public."PresentOnAdmission" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Admission" OWNER TO hospital_user;

--
-- Name: AdmissionSecondaryDiagnosis; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."AdmissionSecondaryDiagnosis" (
    id text NOT NULL,
    "admissionId" text NOT NULL,
    "diagnosisId" text NOT NULL,
    "icdCode" text NOT NULL,
    "presentOnAdmission" public."PresentOnAdmission" DEFAULT 'Y'::public."PresentOnAdmission" NOT NULL,
    "diagnosisType" public."SecondaryDiagnosisType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AdmissionSecondaryDiagnosis" OWNER TO hospital_user;

--
-- Name: Attendance; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Attendance" (
    id text NOT NULL,
    "attendanceNumber" text NOT NULL,
    "patientId" text NOT NULL,
    "insuranceProviderId" text,
    "bedId" text,
    "wardId" text,
    "attendanceType" public."AttendanceType" NOT NULL,
    "dateTime" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paymentMode" public."PaymentMode" NOT NULL,
    "nhisCCC" text,
    complaints text DEFAULT 'No complaints recorded'::text NOT NULL,
    "medicalNotes" text,
    "encounterCategory" public."EncounterCategory" DEFAULT 'opd'::public."EncounterCategory" NOT NULL,
    "visitCategory" public."VisitCategory" DEFAULT 'general'::public."VisitCategory" NOT NULL,
    "totalBill" double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "outstandingBalance" double precision DEFAULT 0 NOT NULL,
    "insuranceClaimId" text,
    "preAuthNumber" text,
    "preAuthApproved" boolean DEFAULT false NOT NULL,
    "preAuthAmount" double precision,
    status public."AttendanceStatus" DEFAULT 'pending'::public."AttendanceStatus" NOT NULL,
    "referringFacility" text,
    "createdById" text NOT NULL,
    "updatedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Attendance" OWNER TO hospital_user;

--
-- Name: AttendanceDiagnosis; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."AttendanceDiagnosis" (
    id text NOT NULL,
    "attendanceId" text NOT NULL,
    "diagnosisId" text NOT NULL,
    "primary" boolean DEFAULT false NOT NULL,
    notes text,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" text NOT NULL,
    "icdCode" text,
    "presentOnAdmission" public."PresentOnAdmission",
    "diagnosisType" public."DiagnosisType",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AttendanceDiagnosis" OWNER TO hospital_user;

--
-- Name: Bed; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Bed" (
    id text NOT NULL,
    "wardId" text NOT NULL,
    "bedNumber" text NOT NULL,
    "isOccupied" boolean DEFAULT false NOT NULL,
    "currentPatientId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Bed" OWNER TO hospital_user;

--
-- Name: Bill; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Bill" (
    id text NOT NULL,
    "billNumber" text NOT NULL,
    "patientId" text NOT NULL,
    "attendanceId" text NOT NULL,
    "admissionId" text,
    items jsonb NOT NULL,
    subtotal double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    "totalAmount" double precision DEFAULT 0 NOT NULL,
    "insuranceCovered" double precision DEFAULT 0 NOT NULL,
    "patientPayable" double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    status public."BillStatus" DEFAULT 'draft'::public."BillStatus" NOT NULL,
    "paymentMode" public."PaymentMode" NOT NULL,
    "insuranceProviderId" text,
    "preAuthNumber" text,
    "claimNumber" text,
    "claimStatus" public."ClaimStatus" DEFAULT 'not_required'::public."ClaimStatus" NOT NULL,
    "createdById" text NOT NULL,
    "updatedById" text,
    "billDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Bill" OWNER TO hospital_user;

--
-- Name: ConsultationType; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."ConsultationType" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "cashPrice" double precision NOT NULL,
    "nhisPrice" double precision DEFAULT 0 NOT NULL,
    "insurancePrice" double precision NOT NULL,
    "isNHISCovered" boolean DEFAULT true NOT NULL,
    "isPrivateInsExempted" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ConsultationType" OWNER TO hospital_user;

--
-- Name: Diagnosis; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Diagnosis" (
    id text NOT NULL,
    name text NOT NULL,
    "icdCode" text NOT NULL,
    "gdrgCode" text NOT NULL,
    variant public."DiagnosisVariant",
    description text,
    "isPending" boolean DEFAULT true NOT NULL,
    "requiresAuthorization" boolean DEFAULT false NOT NULL,
    "tariffCode" text,
    "isChronic" boolean DEFAULT false NOT NULL,
    "isNHISCovered" boolean DEFAULT true NOT NULL,
    category public."DiagnosisCategory" DEFAULT 'medical'::public."DiagnosisCategory" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Diagnosis" OWNER TO hospital_user;

--
-- Name: GDRGTariff; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."GDRGTariff" (
    id text NOT NULL,
    "gdrgCode" text NOT NULL,
    description text NOT NULL,
    "nhiaTariff" double precision NOT NULL,
    "effectiveFrom" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GDRGTariff" OWNER TO hospital_user;

--
-- Name: Hospital; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Hospital" (
    id text NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    "imageUrl" text,
    "nhisFacilityCode" text NOT NULL,
    "nhisFacilityType" public."FacilityType" DEFAULT 'Primary'::public."FacilityType" NOT NULL,
    "nhisAccreditationNumber" text,
    "nhisAccreditationDate" timestamp(3) without time zone,
    "nhisAccreditationExpiry" timestamp(3) without time zone,
    "bankName" text,
    "bankAccountNumber" text,
    "bankBranch" text,
    "nhisContactPerson" text,
    "nhisContactPhone" text,
    "nhisContactEmail" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Hospital" OWNER TO hospital_user;

--
-- Name: InsuranceClaim; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."InsuranceClaim" (
    id text NOT NULL,
    "claimNumber" text NOT NULL,
    "billId" text NOT NULL,
    "patientId" text NOT NULL,
    "insuranceProviderId" text NOT NULL,
    "attendanceId" text NOT NULL,
    "totalClaimAmount" double precision DEFAULT 0 NOT NULL,
    "approvedAmount" double precision,
    "rejectedAmount" double precision,
    "paidAmount" double precision,
    status public."ClaimStatus" DEFAULT 'draft'::public."ClaimStatus" NOT NULL,
    "submissionDate" timestamp(3) without time zone,
    "approvalDate" timestamp(3) without time zone,
    "paymentDate" timestamp(3) without time zone,
    "preAuthNumber" text,
    "diagnosisCodes" text[],
    "procedureCodes" text[],
    notes text,
    "createdById" text NOT NULL,
    "updatedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."InsuranceClaim" OWNER TO hospital_user;

--
-- Name: InsuranceProvider; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."InsuranceProvider" (
    id text NOT NULL,
    name text NOT NULL,
    type public."InsuranceType" NOT NULL,
    "coveragePercentage" double precision NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "contactInfo" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."InsuranceProvider" OWNER TO hospital_user;

--
-- Name: LabTest; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."LabTest" (
    id text NOT NULL,
    "attendanceId" text NOT NULL,
    "templateId" text NOT NULL,
    status public."LabTestStatus" DEFAULT 'requested'::public."LabTestStatus" NOT NULL,
    result jsonb,
    "normalRange" text,
    units text,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "performedById" text,
    "verifiedById" text,
    notes text,
    "createdById" text NOT NULL,
    priority public."Priority" DEFAULT 'routine'::public."Priority" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LabTest" OWNER TO hospital_user;

--
-- Name: LabTestTemplate; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."LabTestTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    "investigationCode" text NOT NULL,
    category public."LabCategory" NOT NULL,
    "subCategory" text,
    description text,
    "cashPrice" double precision NOT NULL,
    "nhisPrice" double precision DEFAULT 0 NOT NULL,
    "insurancePrice" double precision NOT NULL,
    "isNHISCovered" boolean DEFAULT true NOT NULL,
    "isPrivateInsExempted" boolean DEFAULT false NOT NULL,
    "nhisRequiresAuth" boolean DEFAULT false NOT NULL,
    "privateInsRequiresAuth" boolean DEFAULT false NOT NULL,
    "isPending" boolean DEFAULT true NOT NULL,
    "tariffCode" text,
    "vatRate" double precision DEFAULT 0 NOT NULL,
    "isTaxable" boolean DEFAULT true NOT NULL,
    "specimenType" public."SpecimenType" NOT NULL,
    "resultTemplate" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LabTestTemplate" OWNER TO hospital_user;

--
-- Name: Medication; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Medication" (
    id text NOT NULL,
    "attendanceId" text NOT NULL,
    "stockItemId" text,
    name text NOT NULL,
    dosage text,
    frequency text,
    duration text,
    quantity integer DEFAULT 1 NOT NULL,
    route text,
    instructions text,
    status public."MedicationStatus" DEFAULT 'prescribed'::public."MedicationStatus" NOT NULL,
    "prescribedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dispensedAt" timestamp(3) without time zone,
    "administeredAt" timestamp(3) without time zone,
    "dispensedById" text,
    "administeredById" text,
    "prescribedById" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Medication" OWNER TO hospital_user;

--
-- Name: Patient; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Patient" (
    id text NOT NULL,
    "folderNumber" text NOT NULL,
    surname text NOT NULL,
    "otherNames" text NOT NULL,
    gender public."Gender" NOT NULL,
    "dateOfBirth" timestamp(3) without time zone NOT NULL,
    age integer NOT NULL,
    contact text NOT NULL,
    address text NOT NULL,
    "paymentMode" public."PaymentMode",
    "insuranceDetails" jsonb,
    "additionalInfo" jsonb,
    "billingAddress" jsonb,
    employer jsonb,
    "imageUrl" text,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "registeredBy" text NOT NULL,
    "insuranceProviderId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Patient" OWNER TO hospital_user;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "billId" text NOT NULL,
    amount double precision NOT NULL,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    reference text,
    "transactionDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "receivedById" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payment" OWNER TO hospital_user;

--
-- Name: Procedure; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Procedure" (
    id text NOT NULL,
    "attendanceId" text NOT NULL,
    "templateId" text NOT NULL,
    status public."ProcedureStatus" DEFAULT 'scheduled'::public."ProcedureStatus" NOT NULL,
    "scheduledDate" timestamp(3) without time zone,
    "performedAt" timestamp(3) without time zone,
    "performedById" text,
    "assistantId" text,
    notes text,
    complications text,
    outcome text,
    cost double precision,
    duration integer,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Procedure" OWNER TO hospital_user;

--
-- Name: ProcedureTemplate; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."ProcedureTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    "procedureCode" text NOT NULL,
    description text,
    category public."ProcedureCategory" NOT NULL,
    department text NOT NULL,
    "cashPrice" double precision NOT NULL,
    "nhisPrice" double precision DEFAULT 0 NOT NULL,
    "insurancePrice" double precision NOT NULL,
    "isNHISCovered" boolean DEFAULT true NOT NULL,
    "isPrivateInsExempted" boolean DEFAULT false NOT NULL,
    "nhisRequiresAuth" boolean DEFAULT false NOT NULL,
    "privateInsRequiresAuth" boolean DEFAULT false NOT NULL,
    "isPending" boolean DEFAULT true NOT NULL,
    "tariffCode" text,
    "vatRate" double precision DEFAULT 0 NOT NULL,
    "isTaxable" boolean DEFAULT true NOT NULL,
    duration integer DEFAULT 30 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProcedureTemplate" OWNER TO hospital_user;

--
-- Name: Scan; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Scan" (
    id text NOT NULL,
    "attendanceId" text NOT NULL,
    "templateId" text NOT NULL,
    "scanType" text NOT NULL,
    description text NOT NULL,
    "bodyPart" text,
    status public."ScanStatus" DEFAULT 'requested'::public."ScanStatus" NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    result text,
    findings text,
    impression text,
    "performedById" text,
    "verifiedById" text,
    "imageUrls" text[],
    "createdById" text NOT NULL,
    priority public."ScanPriority" DEFAULT 'routine'::public."ScanPriority" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Scan" OWNER TO hospital_user;

--
-- Name: ScanTemplate; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."ScanTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    "investigationCode" text NOT NULL,
    "scanCode" text NOT NULL,
    description text NOT NULL,
    category public."ScanCategory" NOT NULL,
    "bodyPart" public."BodyPart" NOT NULL,
    "cashPrice" double precision NOT NULL,
    "nhisPrice" double precision DEFAULT 0 NOT NULL,
    "insurancePrice" double precision NOT NULL,
    "isNHISCovered" boolean DEFAULT true NOT NULL,
    "isPrivateInsExempted" boolean DEFAULT false NOT NULL,
    "nhisRequiresAuth" boolean DEFAULT false NOT NULL,
    "privateInsRequiresAuth" boolean DEFAULT false NOT NULL,
    "isPending" boolean DEFAULT true NOT NULL,
    "tariffCode" text,
    "vatRate" double precision DEFAULT 0 NOT NULL,
    "isTaxable" boolean DEFAULT true NOT NULL,
    "preparationInstructions" text,
    duration integer NOT NULL,
    "contrastRequired" boolean DEFAULT false NOT NULL,
    "scanType" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ScanTemplate" OWNER TO hospital_user;

--
-- Name: ServiceCatalog; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."ServiceCatalog" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "serviceCategory" public."ServiceCategory" DEFAULT 'opd'::public."ServiceCategory" NOT NULL,
    "serviceType" public."ServiceType" NOT NULL,
    "cashPrice" double precision NOT NULL,
    "nhisPrice" double precision DEFAULT 0 NOT NULL,
    "insurancePrice" double precision NOT NULL,
    "nhisServiceCode" text,
    "isNHISCovered" boolean DEFAULT true NOT NULL,
    "tariffCode" text,
    "nhisCoverageType" public."NHISCoverageType" DEFAULT 'full'::public."NHISCoverageType" NOT NULL,
    "nhisRequiresAuth" boolean DEFAULT false NOT NULL,
    "privateInsRequiresAuth" boolean DEFAULT false NOT NULL,
    "isPrivateInsuranceExempted" boolean DEFAULT false NOT NULL,
    unit text DEFAULT 'Each'::text NOT NULL,
    "isPending" boolean DEFAULT true NOT NULL,
    "requiresClinicalNotes" boolean DEFAULT false NOT NULL,
    "vatRate" double precision DEFAULT 0 NOT NULL,
    "isTaxable" boolean DEFAULT true NOT NULL,
    "diagnosisId" text,
    "labTestTemplateId" text,
    "procedureTemplateId" text,
    "stockItemId" text,
    "wardId" text,
    "scanTemplateId" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceCatalog" OWNER TO hospital_user;

--
-- Name: ServiceRendered; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."ServiceRendered" (
    id text NOT NULL,
    "attendanceId" text NOT NULL,
    "serviceItemId" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "performedById" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServiceRendered" OWNER TO hospital_user;

--
-- Name: StockItem; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."StockItem" (
    id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    description text,
    strength text NOT NULL,
    "unitOfMeasure" text NOT NULL,
    "drugCode" text NOT NULL,
    "reorderLevel" integer NOT NULL,
    "currentStock" integer DEFAULT 0 NOT NULL,
    "costPrice" double precision NOT NULL,
    "cashPrice" double precision NOT NULL,
    "nhisPrice" double precision DEFAULT 0 NOT NULL,
    "insurancePrice" double precision NOT NULL,
    "isNHISCovered" boolean DEFAULT true NOT NULL,
    "isPrivateInsExempted" boolean DEFAULT false NOT NULL,
    "nhisRequiresAuth" boolean DEFAULT false NOT NULL,
    "privateInsRequiresAuth" boolean DEFAULT false NOT NULL,
    supplier text,
    "expiryDate" timestamp(3) without time zone,
    "batchNumber" text,
    "isPending" boolean DEFAULT true NOT NULL,
    "tariffCode" text,
    "vatRate" double precision DEFAULT 0 NOT NULL,
    "isTaxable" boolean DEFAULT true NOT NULL,
    "isMedication" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StockItem" OWNER TO hospital_user;

--
-- Name: StockTransaction; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."StockTransaction" (
    id text NOT NULL,
    "stockItemId" text NOT NULL,
    "transactionType" text NOT NULL,
    quantity integer NOT NULL,
    "balanceAfter" integer NOT NULL,
    reference text,
    notes text,
    "transactionDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "performedBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StockTransaction" OWNER TO hospital_user;

--
-- Name: User; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "fullName" text NOT NULL,
    role public."UserRole" NOT NULL,
    email text,
    phone text,
    "licenseNumber" text,
    specialization text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "departmentId" text
);


ALTER TABLE public."User" OWNER TO hospital_user;

--
-- Name: Vitals; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Vitals" (
    id text NOT NULL,
    "attendanceId" text NOT NULL,
    "patientId" text NOT NULL,
    "bloodPressure" text,
    temperature double precision,
    pulse integer,
    respiration integer,
    spo2 double precision,
    weight double precision,
    height double precision,
    bmi double precision,
    notes text,
    "recordedById" text NOT NULL,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Vitals" OWNER TO hospital_user;

--
-- Name: Ward; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public."Ward" (
    id text NOT NULL,
    "wardName" text NOT NULL,
    "wardType" text NOT NULL,
    "totalBeds" integer NOT NULL,
    "occupiedBeds" integer DEFAULT 0 NOT NULL,
    "cashDailyRate" double precision NOT NULL,
    "nhisDailyRate" double precision,
    "insuranceDailyRate" double precision NOT NULL,
    "isNHISCovered" boolean DEFAULT true NOT NULL,
    "nhisRequiresAuth" boolean DEFAULT false NOT NULL,
    "isPrivateInsExempted" boolean DEFAULT false NOT NULL,
    "isPending" boolean DEFAULT true NOT NULL,
    "requiresAuthorization" boolean DEFAULT false NOT NULL,
    "tariffCode" text,
    "vatRate" double precision DEFAULT 0 NOT NULL,
    "isTaxable" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Ward" OWNER TO hospital_user;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public.appointments (
    id text NOT NULL,
    "appointmentNumber" text NOT NULL,
    "patientId" text NOT NULL,
    "doctorId" text,
    "departmentId" text,
    title text NOT NULL,
    description text,
    "appointmentDate" timestamp(3) without time zone NOT NULL,
    "appointmentTime" text NOT NULL,
    duration integer DEFAULT 30 NOT NULL,
    status public."AppointmentStatus" DEFAULT 'scheduled'::public."AppointmentStatus" NOT NULL,
    type public."AppointmentType" DEFAULT 'consultation'::public."AppointmentType" NOT NULL,
    "isNHIS" boolean DEFAULT false NOT NULL,
    "nhisCCC" text,
    "reminderSent" boolean DEFAULT false NOT NULL,
    "checkedIn" boolean DEFAULT false NOT NULL,
    "checkedInAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL
);


ALTER TABLE public.appointments OWNER TO hospital_user;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public.departments (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "headId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    color text DEFAULT '#3B82F6'::text,
    icon text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.departments OWNER TO hospital_user;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: hospital_user
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type public."NotificationType" DEFAULT 'info'::public."NotificationType" NOT NULL,
    priority public."NotificationPriority" DEFAULT 'medium'::public."NotificationPriority" NOT NULL,
    "actionType" text,
    "actionId" text,
    "actionUrl" text,
    "isRead" boolean DEFAULT false NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "readAt" timestamp(3) without time zone
);


ALTER TABLE public.notifications OWNER TO hospital_user;

--
-- Data for Name: Admission; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Admission" (id, "admissionNumber", "patientId", "attendanceId", "wardId", "bedId", "admissionDate", "admissionTime", "admittingDoctor", "reasonForAdmission", diagnosis, status, "dischargeDate", "dischargeTime", "dischargeSummary", "dailyNotes", "createdBy", "admissionType", "admissionSource", "dischargeStatus", "lengthOfStay", "principalDiagnosisId", "principalIcdCode", "principalPresentOnAdmission", "createdAt", "updatedAt") FROM stdin;
cmi620sx900v6lwf4nxr2d5w1	ADM-1763559885933	cmi620nx400u9lwf4yeal9cx2	cmi620psb00uolwf4p5xxctbv	cmi620kjy00tclwf4tlkcd1nl	cmi620knv00tflwf42lzi497k	2025-11-19 13:44:45.933	14:30	Dr. Kofi Mensah	Hypertensive urgency for monitoring	Essential hypertension with elevated BP	admitted	\N	\N	\N	\N	Dr. Kofi Mensah	elective	opd	\N	1	cmi620irl001xlwf4dj1vnj0d	I10	Y	2025-11-19 13:44:45.934	2025-11-19 13:44:45.934
\.


--
-- Data for Name: AdmissionSecondaryDiagnosis; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."AdmissionSecondaryDiagnosis" (id, "admissionId", "diagnosisId", "icdCode", "presentOnAdmission", "diagnosisType", "createdAt") FROM stdin;
cmi620szr00v8lwf42uqseo4d	cmi620sx900v6lwf4nxr2d5w1	cmi620irm002clwf4dbbz4ja2	D50.9	Y	comorbidity	2025-11-19 13:44:46.023
\.


--
-- Data for Name: Attendance; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Attendance" (id, "attendanceNumber", "patientId", "insuranceProviderId", "bedId", "wardId", "attendanceType", "dateTime", "paymentMode", "nhisCCC", complaints, "medicalNotes", "encounterCategory", "visitCategory", "totalBill", "paidAmount", "outstandingBalance", "insuranceClaimId", "preAuthNumber", "preAuthApproved", "preAuthAmount", status, "referringFacility", "createdById", "updatedById", "createdAt", "updatedAt") FROM stdin;
cmi620oog00uelwf450ps58ln	ATT-1763559880428-L7A6QD	cmi620o2t00ualwf4pt2dvjh1	cmi620ibm0002lwf46xjfggq6	\N	\N	general_consultation	2025-11-19 13:44:40.429	nhis	24593	Fever, headache, and body pains for 3 days	\N	opd	general	0	0	0	\N	\N	f	\N	completed	\N	cmi4w23pn0000lwdloibukura	\N	2025-11-19 13:44:40.431	2025-11-19 13:44:40.431
cmi620psb00uolwf4p5xxctbv	ATT-1763559881866-9U8L5Q	cmi620nx400u9lwf4yeal9cx2	\N	\N	\N	chronic_followup	2025-11-19 13:44:41.866	cash	\N	Routine hypertension follow-up, BP monitoring	\N	opd	general	0	0	0	\N	\N	f	\N	completed	\N	cmi4w23pn0000lwdloibukura	\N	2025-11-19 13:44:41.867	2025-11-19 13:44:41.867
\.


--
-- Data for Name: AttendanceDiagnosis; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."AttendanceDiagnosis" (id, "attendanceId", "diagnosisId", "primary", notes, date, "createdById", "icdCode", "presentOnAdmission", "diagnosisType", "createdAt") FROM stdin;
cmi620oog00uglwf498pc4s57	cmi620oog00uelwf450ps58ln	cmi620iri000mlwf4vw2525bu	t	\N	2025-11-19 13:44:40.429	cmi620m0u00u1lwf4uyccj1bv	B54	Y	principal	2025-11-19 13:44:40.431
cmi620psb00uqlwf4eztao8g3	cmi620psb00uolwf4p5xxctbv	cmi620irl001xlwf4dj1vnj0d	t	\N	2025-11-19 13:44:41.866	cmi620m0u00u1lwf4uyccj1bv	I10	Y	principal	2025-11-19 13:44:41.867
\.


--
-- Data for Name: Bed; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Bed" (id, "wardId", "bedNumber", "isOccupied", "currentPatientId", "createdAt", "updatedAt") FROM stdin;
cmi620knv00tglwf4nd1d07fz	cmi620kjy00tclwf4tlkcd1nl	GA-2	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00thlwf42trpq3i8	cmi620kjy00tclwf4tlkcd1nl	GA-3	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tilwf4otw9iy44	cmi620kjy00tclwf4tlkcd1nl	GA-4	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tjlwf45ffdfar3	cmi620kjy00tclwf4tlkcd1nl	GA-5	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tklwf4i3ymt27y	cmi620kjy00tclwf4tlkcd1nl	GA-6	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tllwf4ypm34qxl	cmi620kjy00tclwf4tlkcd1nl	GA-7	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tmlwf44hegc2ab	cmi620kjy00tclwf4tlkcd1nl	GA-8	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tnlwf4smdhx3gf	cmi620kjy00tclwf4tlkcd1nl	GA-9	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tolwf43q96nvtl	cmi620kjy00tclwf4tlkcd1nl	GA-10	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tplwf4nnyihzbl	cmi620kjy00tclwf4tlkcd1nl	GA-11	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tqlwf48c3gp3th	cmi620kjy00tclwf4tlkcd1nl	GA-12	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00trlwf4y4bpvtbd	cmi620kjy00tclwf4tlkcd1nl	GA-13	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tslwf4v5e7aqjr	cmi620kjy00tclwf4tlkcd1nl	GA-14	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00ttlwf4imuluy70	cmi620kjy00tclwf4tlkcd1nl	GA-15	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tulwf4ahf4lh8t	cmi620kjy00tclwf4tlkcd1nl	GA-16	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tvlwf4864sxmvh	cmi620kjy00tclwf4tlkcd1nl	GA-17	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00twlwf47r3l0rth	cmi620kjy00tclwf4tlkcd1nl	GA-18	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00txlwf48yfxb49r	cmi620kjy00tclwf4tlkcd1nl	GA-19	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tylwf40thj52yc	cmi620kjy00tclwf4tlkcd1nl	GA-20	f	\N	2025-11-19 13:44:35.227	2025-11-19 13:44:35.227
cmi620knv00tflwf42lzi497k	cmi620kjy00tclwf4tlkcd1nl	GA-1	t	cmi620nx400u9lwf4yeal9cx2	2025-11-19 13:44:35.227	2025-11-19 13:44:46.248
\.


--
-- Data for Name: Bill; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Bill" (id, "billNumber", "patientId", "attendanceId", "admissionId", items, subtotal, discount, "taxAmount", "totalAmount", "insuranceCovered", "patientPayable", "paidAmount", balance, status, "paymentMode", "insuranceProviderId", "preAuthNumber", "claimNumber", "claimStatus", "createdById", "updatedById", "billDate", "dueDate", "createdAt", "updatedAt") FROM stdin;
cmi620p2a00uklwf4wsimisei	BILL-1763559880928-3DV6TK	cmi620o2t00ualwf4pt2dvjh1	cmi620oog00uelwf450ps58ln	\N	[{"category": "consultation", "quantity": 1, "unitPrice": 0, "totalPrice": 0, "description": "General Consultation"}]	0	0	0	0	0	0	0	0	paid	nhis	cmi620ibm0002lwf46xjfggq6	\N	\N	not_required	cmi4w23pn0000lwdloibukura	\N	2025-11-19 13:44:40.928	\N	2025-11-19 13:44:40.93	2025-11-19 13:44:40.93
cmi620q7y00uslwf40juvrl4s	BILL-1763559882427-QF4U2V	cmi620nx400u9lwf4yeal9cx2	cmi620psb00uolwf4p5xxctbv	\N	[{"category": "consultation", "quantity": 1, "unitPrice": 80, "totalPrice": 80, "description": "Chronic Disease Follow-up"}]	80	0	0	80	0	80	80	0	paid	cash	\N	\N	\N	not_required	cmi4w23pn0000lwdloibukura	\N	2025-11-19 13:44:42.427	\N	2025-11-19 13:44:42.429	2025-11-19 13:44:42.429
\.


--
-- Data for Name: ConsultationType; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."ConsultationType" (id, name, code, "cashPrice", "nhisPrice", "insurancePrice", "isNHISCovered", "isPrivateInsExempted", "isActive", "createdAt", "updatedAt") FROM stdin;
cmi620ksj00tzlwf4wakcka70	General Consultation	CONS-GEN	100	0	0	t	f	t	2025-11-19 13:44:35.395	2025-11-19 13:44:35.395
cmi620ksj00u0lwf4e2hf8oxs	Specialist Consultation	CONS-SPEC	200	50	50	t	f	t	2025-11-19 13:44:35.395	2025-11-19 13:44:35.395
\.


--
-- Data for Name: Diagnosis; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Diagnosis" (id, name, "icdCode", "gdrgCode", variant, description, "isPending", "requiresAuthorization", "tariffCode", "isChronic", "isNHISCovered", category, "createdAt", "updatedAt") FROM stdin;
cmi620iri000glwf42kksy4uc	Cholera due to Vibrio cholerae 01, biovar cholerae	A00.0	A01Z	\N	Acute infectious diarrheal disease	f	f	DIAG-A000	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iri000mlwf4vw2525bu	Malaria, unspecified	B54	A02Z	\N	Uncomplicated malaria in adults (≥5 years)	f	f	DIAG-B54-ADULT	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iri000nlwf4erfhk5e2	Malaria in children under 5 years	B54P	A02C	\N	Malaria in pediatric patients (≤5 years)	f	f	DIAG-B54-CHILD	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iri000olwf4pvrhlgcz	Severe malaria with cerebral involvement	B50.0	A02X	\N	Cerebral malaria requiring hospitalization	f	t	DIAG-B500	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iri000slwf4qf1m1391	Tuberculosis of lung, confirmed by sputum microscopy	A15.0	A04Z	\N	Pulmonary TB with bacteriological confirmation	f	t	DIAG-A150	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irj000ulwf4d4oorndy	Miliary tuberculosis	A19.9	A04X	\N	Disseminated TB affecting multiple organs	f	t	DIAG-A199	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irj000wlwf44fx7ejqp	HIV disease resulting in tuberculosis	B20	A05X	\N	HIV with TB co-infection	f	t	DIAG-B20-TB	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irj000ylwf49jjxz5q4	HIV disease, unspecified	B24	A05Z	\N	Chronic HIV infection without specified complications	f	t	DIAG-B24	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irj000zlwf4xnyq8fsf	Acute hepatitis A	A00.0	A03Z	\N	Viral hepatitis A with hepatic necrosis	f	t	DIAG-A000-HEP	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irj0011lwf47d149z4d	Hepatitis C, chronic	B18.2	A03X	\N	Chronic viral hepatitis C	f	t	DIAG-B182	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irj0014lwf4dzf7hdgd	Schistosomiasis, unspecified	B65.9	A06Z	\N	Bilharzia, chronic parasitic infection	f	f	DIAG-B659	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irj0017lwf4ska4u0em	Scabies	A88.0	S02Z	\N	Contagious skin infestation	f	f	DIAG-A880	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irk0019lwf4uoo5p630	Tinea corporis	B35.6	S03Z	\N	Ringworm of body	f	f	DIAG-B356	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irk001alwf410tg3cig	Impetigo	L01.0	S01Z	\N	Superficial bacterial skin infection	f	f	DIAG-L010	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irk001blwf4kk14c8vj	Cellulitis of leg	L03.115	S04X	\N	Bacterial skin infection requiring antibiotics	f	t	DIAG-L03115	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irk001elwf4fd4sn8mo	Psoriasis, unspecified	L40.9	S05Z	\N	Chronic autoimmune skin disorder	f	t	DIAG-L409	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irk001flwf4bzob6cbn	Benign neoplasm of skin	D23.9	S06Z	\N	Non-cancerous skin growth	f	t	DIAG-D239	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irk001glwf41bo50a7p	Malignant melanoma of skin, unspecified	C43.9	S07X	\N	Skin cancer requiring oncology care	f	t	DIAG-C439	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irk001hlwf4qmecl7g0	Pneumonia, unspecified organism	J18.9	D03Z	\N	Lung infection requiring antibiotics	f	t	DIAG-J189	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irk001klwf4u05e2ysn	Acute bronchitis	J20.9	D02Z	\N	Inflammation of bronchial tubes	f	f	DIAG-J209	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irk001llwf4popq9v92	Chronic bronchitis	J42	D04Z	\N	Long-term inflammation of bronchi	f	f	DIAG-J42	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irl001olwf4vrpsczol	Asthma, unspecified	J45.909	D01Z	\N	Reversible airway obstruction	f	f	DIAG-J459	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irl001qlwf41a7tcuxh	Allergic rhinitis	J30.9	E02Z	\N	Nasal inflammation due to allergens	f	f	DIAG-J309	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irl001slwf4lyg7w25l	Acute tonsillitis	J03.90	E01Z	\N	Infection of tonsils	f	f	DIAG-J0390	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irl001ulwf435xhbyz5	Conjunctivitis, unspecified	H10.9	E03Z	\N	Inflammation of the conjunctiva	f	f	DIAG-H109	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irl001vlwf4bniyoxl5	Cataract, unspecified	H26.9	E04X	\N	Clouding of the eye lens	f	t	DIAG-H269	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irl001wlwf4vmwy0qzt	Glaucoma, unspecified	H40.9	E04Z	\N	Optic nerve damage from high intraocular pressure	f	t	DIAG-H409	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irl001xlwf4dj1vnj0d	Hypertension, unspecified	I10	C01Z	\N	Primary (essential) hypertension	f	f	DIAG-I10	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irl001ylwf4w8ypvqgz	Hypertensive heart disease	I11.9	C02Z	\N	Hypertension with heart complications	f	t	DIAG-I119	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irl0020lwf433uvdxag	Heart failure, unspecified	I50.9	C03Z	\N	Inability of heart to pump effectively	f	t	DIAG-I509	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irl0022lwf4vz41msbo	Acute myocardial infarction	I21.9	C04X	\N	Heart attack requiring emergency care	f	t	DIAG-I219	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002alwf4r7a2xp0u	Hypothyroidism, unspecified	E03.9	C05Z	\N	Underactive thyroid gland	f	f	DIAG-E039	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002clwf4dbbz4ja2	Iron deficiency anemia	D50.9	H01Z	\N	Anemia due to low iron	f	f	DIAG-D509	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002dlwf4isv2b1kd	Sickle-cell anemia without crisis	D57.1	H02Z	\N	Chronic hemolytic anemia common in Ghana	f	f	DIAG-D571	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002elwf4magxdyfp	Sickle-cell crisis	D57.00	H02X	\N	Acute painful episode of sickle cell disease	f	t	DIAG-D5700	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002flwf4s7odn2rn	Aplastic anemia	D61.9	H03X	\N	Bone marrow failure leading to low blood counts	f	t	DIAG-D619	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002glwf4pyec4rcz	Acute lymphoblastic leukemia	C91.00	H04X	\N	Cancer of white blood cells	f	t	DIAG-C9100	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002hlwf4abv2t7mn	Chronic kidney disease, stage 3	N18.3	U03Z	\N	Moderate kidney impairment	f	t	DIAG-N183	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002ilwf4w0wh4xsh	Chronic kidney disease, stage 5	N18.5	U04X	\N	End-stage renal disease	f	t	DIAG-N185	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002klwf4bq4f5mop	Urinary tract infection, site unspecified	N39.0	U01Z	\N	UTI without specification	f	f	DIAG-N390	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002llwf4cbxraoiy	Acute pyelonephritis	N10	U02X	\N	Kidney infection	f	t	DIAG-N10	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002mlwf4bi0z84rx	Benign prostatic hyperplasia	N40.1	U02Z	\N	Enlarged prostate in men	f	t	DIAG-N401	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002olwf4dudqadyb	Ovarian cyst, unspecified	N83.20	G01Z	\N	Fluid-filled sac in ovary	f	t	DIAG-N8320	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002qlwf4j6ynwiik	Infertility, female	N97.9	G02Z	\N	Inability to conceive after 12 months	f	t	DIAG-N979	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002slwf4lvj1wgsg	Pregnancy, unspecified trimester	Z33.1	OB01Z	\N	Confirmed pregnancy status	f	f	DIAG-Z331	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002tlwf4ehtq0d7s	Ectopic pregnancy	O00.9	OB02X	\N	Pregnancy outside the uterus	f	t	DIAG-O009	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irm002ulwf4ovfizxjk	Antepartum hemorrhage, unspecified	O46.90	OB03X	\N	Vaginal bleeding during pregnancy	f	t	DIAG-O4690	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn002wlwf4e69jo1ag	Normal vaginal delivery	O80	OBGY34A	\N	Spontaneous delivery without complications	f	f	DIAG-O80	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn002xlwf4sf9mehye	Cesarean section, single fetus	O82	OBGY35X	\N	Surgical delivery of baby	f	t	DIAG-O82	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn002ylwf4p35zmdrn	Postpartum hemorrhage	O72.1	OB04X	\N	Excessive bleeding after delivery	f	t	DIAG-O721	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn002zlwf48uwps5t0	Osteoarthritis, unspecified site	M19.90	M01Z	\N	Degenerative joint disease	f	f	DIAG-M1990	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn0030lwf45o95mp3h	Rheumatoid arthritis	M06.9	M02Z	\N	Autoimmune inflammatory arthritis	f	t	DIAG-M069	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn0032lwf4ygyyhgsq	Low back pain	M54.5	M03Z	\N	Pain in lumbar region	f	f	DIAG-M545	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn0034lwf4w2ztn45u	Fracture of shaft of femur	S72.309A	M04X	\N	Broken thigh bone	f	t	DIAG-S72309A	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn0035lwf4z0esy9rj	Sprain of ankle	S93.409A	M05Z	\N	Ligament injury of ankle	f	f	DIAG-S93409A	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn0036lwf46oyd80nt	Epilepsy, unspecified	G40.909	N01Z	\N	Recurrent seizures without known cause	f	t	DIAG-G409	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn0037lwf485of1knk	Migraine, unspecified	G43.909	N02Z	\N	Recurrent severe headaches	f	f	DIAG-G439	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn0039lwf4x3giuxx6	Alzheimer's disease	G30.9	N03X	\N	Progressive neurodegenerative disorder	f	t	DIAG-G309	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn003alwf4nc1bdywo	Depressive disorder, unspecified	F32.9	P01Z	\N	Mood disorder with depressed mood	f	t	DIAG-F329	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn003clwf4663cfek8	Schizophrenia, unspecified	F20.9	P02X	\N	Psychotic disorder with delusions	f	t	DIAG-F209	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn003dlwf4kwetsog8	Bipolar disorder, current episode depressed	F31.3	P02Z	\N	Mood swings with depressive phase	f	t	DIAG-F313	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn003elwf4p7t0zxgj	Alcohol dependence	F10.20	P03Z	\N	Chronic alcohol use disorder	f	t	DIAG-F1020	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn003flwf4ao4kjxvg	Acute gastritis	K29.00	GI01Z	\N	Inflammation of stomach lining	f	f	DIAG-K2900	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irn003hlwf4zkejvw7x	Peptic ulcer, site unspecified	K27.9	GI02Z	\N	Ulcer in stomach or duodenum	f	f	DIAG-K279	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro003jlwf4vso0kdw6	Ulcerative colitis	K51.90	GI03X	\N	Inflammatory bowel disease	f	t	DIAG-K5190	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro003mlwf47gzhyx8x	Appendicitis, unspecified	K35.80	GI04X	\N	Inflammation of appendix	f	t	DIAG-K3580	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro003nlwf46js82e8i	Inguinal hernia, unilateral	K40.90	GI05X	\N	Protrusion of abdominal contents	f	t	DIAG-K4090	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro003olwf4noo1ciu8	Cirrhosis of liver, unspecified	K74.69	GI06X	\N	End-stage liver disease	f	t	DIAG-K7469	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro003plwf4j6f1ep0y	Gallstone disease without cholecystitis	K80.20	GI05Z	\N	Asymptomatic gallstones	f	f	DIAG-K8020	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro003vlwf4iptq5o4a	Benign neoplasm of breast	D24.9	G03Z	\N	Non-cancerous breast lump	f	t	DIAG-D249	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro003wlwf482oc4tco	Malignant neoplasm of breast, unspecified	C50.919	G04X	\N	Breast cancer	f	t	DIAG-C50919	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro003zlwf40p89tjmq	Prostate cancer	C61	U05X	\N	Malignant neoplasm of prostate	f	t	DIAG-C61	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro0040lwf4jjo7g57o	Colorectal cancer, unspecified	C18.9	GI07X	\N	Cancer of colon or rectum	f	t	DIAG-C189	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro0041lwf4ejarbhud	Lung cancer, unspecified	C34.90	D05X	\N	Malignant neoplasm of bronchus/lung	f	t	DIAG-C3490	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620iro0044lwf424ihh1rq	Malnutrition, unspecified	E46	NUT01Z	\N	Inadequate intake of nutrients	f	f	DIAG-E46	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irp0045lwf4w2kff1fj	Severe protein-energy malnutrition	E43	NUT01X	\N	Kwashiorkor or marasmus	f	t	DIAG-E43	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irp0046lwf4pt8iw0gm	Vitamin A deficiency	E50.9	NUT02Z	\N	Deficiency causing night blindness	f	f	DIAG-E509	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irp0047lwf4027rend6	Obesity, unspecified	E66.9	C06Z	\N	Excess body fat	f	f	DIAG-E669	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irp0049lwf4stanpte0	Febrile convulsions	R56.00	N04Z	\N	Seizures due to high fever in children	f	f	DIAG-R5600	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irp004ilwf451ty3tto	Fatigue, unspecified	R53.83	GEN01Z	\N	Generalized tiredness	f	f	DIAG-R5383	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irp004qlwf4xet0yrz1	Pneumonia in child under 5 years	J18.9P	D03C	\N	Lower respiratory infection in pediatric patients	f	t	DIAG-J189-CHILD	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irp004rlwf4utslo9n0	Acute diarrhea with severe dehydration	A09-D	A01X	\N	Life-threatening fluid loss requiring IV rehydration	f	t	DIAG-A09-SEVDEHY	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irp004tlwf4pimk4u7t	Measles, uncomplicated	A00.2	A07Z	\N	Viral exanthematous fever with rash	f	f	DIAG-A002-MEZ	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irq004zlwf40wg3gpam	Autism spectrum disorder	F84.0	P04Z	\N	Neurodevelopmental disorder with social deficits	f	t	DIAG-F840	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irq0051lwf4gj2xs2vf	Epilepsy in child under 12 years	G40.909C	N01C	\N	Recurrent seizures in pediatric patients	f	t	DIAG-G409-CHILD	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irq0052lwf432qed8z2	Syphilis, primary	A50.0	STI01Z	\N	Sexually transmitted infection with chancre	f	f	DIAG-A500	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irq0059lwf406kxdvie	Snake bite, unspecified	T63.001A	TOX02X	\N	Envenomation requiring antivenom	f	t	DIAG-T63001A	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irq005blwf4gxgtl38o	Pesticide poisoning, unspecified	T60.9X1A	TOX01X	\N	Acute toxicity from agricultural chemicals	f	t	DIAG-T609X1A	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irq005clwf468an5aqk	Heat stroke	T67.0X1A	ENV01X	\N	Life-threatening hyperthermia	f	t	DIAG-T670X1A	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irr005vlwf4n9mtr906	Albinism, ocular or oculocutaneous	Q82.8	GEN02Z	\N	Genetic condition with visual impairment	f	f	DIAG-Q828	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irr005xlwf4nwou3g61	Dental caries	K02.9	DENT01Z	\N	Tooth decay	f	f	DIAG-K029	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irr005ylwf49na86swg	Encounter for general adult medical examination	Z00.00	OPDC06A	\N	Annual health check	f	f	DIAG-Z0000	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
cmi620irr005zlwf4nr4242hu	Encounter for surgical aftercare	Z48.812	SURG01Z	\N	Post-op wound check	f	f	DIAG-Z48812	f	t	medical	2025-11-19 13:44:32.759	2025-11-19 13:44:32.759
\.


--
-- Data for Name: GDRGTariff; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."GDRGTariff" (id, "gdrgCode", description, "nhiaTariff", "effectiveFrom", "effectiveTo", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Hospital; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Hospital" (id, name, address, phone, email, "imageUrl", "nhisFacilityCode", "nhisFacilityType", "nhisAccreditationNumber", "nhisAccreditationDate", "nhisAccreditationExpiry", "bankName", "bankAccountNumber", "bankBranch", "nhisContactPerson", "nhisContactPhone", "nhisContactEmail", "isActive", "createdAt", "updatedAt") FROM stdin;
cmi620i6c0001lwf4zrufzf8b	General Hospital	123 Medical Center Drive, Healthcare City, Accra	+233-24-123-4567	info@generalhospital.gov.gh	\N	GH001	Secondary	NHIS/ACC/2024/001	2024-01-15 00:00:00	2025-01-14 00:00:00	Ghana Commercial Bank	1234567890	Accra Central	Dr. Kwame Mensah	+233-24-765-4321	nhis@generalhospital.gov.gh	t	2025-11-19 13:44:32.004	2025-11-19 13:44:32.004
\.


--
-- Data for Name: InsuranceClaim; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."InsuranceClaim" (id, "claimNumber", "billId", "patientId", "insuranceProviderId", "attendanceId", "totalClaimAmount", "approvedAmount", "rejectedAmount", "paidAmount", status, "submissionDate", "approvalDate", "paymentDate", "preAuthNumber", "diagnosisCodes", "procedureCodes", notes, "createdById", "updatedById", "createdAt", "updatedAt") FROM stdin;
cmi620pen00umlwf4ngwddcvs	CLAIM-1763559881373	cmi620p2a00uklwf4wsimisei	cmi620o2t00ualwf4pt2dvjh1	cmi620ibm0002lwf46xjfggq6	cmi620oog00uelwf450ps58ln	45.5	0	0	0	submitted	\N	\N	\N	\N	{B54}	{CONS-GEN}	\N	cmi4w23pn0000lwdloibukura	\N	2025-11-19 13:44:41.375	2025-11-19 13:44:41.375
\.


--
-- Data for Name: InsuranceProvider; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."InsuranceProvider" (id, name, type, "coveragePercentage", "isActive", "contactInfo", "createdAt", "updatedAt") FROM stdin;
cmi620ibm0002lwf46xjfggq6	National Health Insurance Scheme (NHIS)	nhis	50	t	{"email": "claims@nhis.gov.gh", "phone": "+233302011122", "address": "NHIS Headquarters, Accra", "contactPerson": "NHIS Claims Manager"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibm0003lwf4ol31ut0k	Star Assurance	private	100	t	{"email": "info@starassurance.com", "phone": "+233302345678", "address": "Star House, Accra Central", "contactPerson": "Health Claims Department"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibm0004lwf4eug1sgii	Enterprise Insurance	private	100	t	{"email": "health@enterpriseinsurance.com", "phone": "+233302345679", "address": "Enterprise Tower, Accra", "contactPerson": "Medical Claims Manager"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibm0005lwf4xjfkyf2h	Metropolitan Health Insurance	private	100	t	{"email": "claims@metropolitan.com", "phone": "+233302345680", "address": "Metropolitan House, Kumasi", "contactPerson": "Claims Processing Unit"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibm0006lwf434qnbe83	SIC Life Insurance Company	private	100	t	{"email": "healthcare@siclife.com", "phone": "+233302345681", "address": "SIC Life Building, Accra", "contactPerson": "Health Insurance Division"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibm0007lwf4gtzv5hhj	Glico Healthcare	private	100	t	{"email": "support@glicohealth.com", "phone": "+233302345682", "address": "Glico Plaza, Accra", "contactPerson": "Customer Service Manager"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibm0008lwf4sb18wg58	Premier Health Insurance	private	100	t	{"email": "claims@premierhealth.com", "phone": "+233302345683", "address": "Premier House, Takoradi", "contactPerson": "Claims Administrator"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibn0009lwf4jtp87dia	Apex Health Insurance	private	100	t	{"email": "info@apexhealth.com", "phone": "+233302345684", "address": "Apex Center, Accra", "contactPerson": "Health Services Coordinator"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibn000alwf4ahll2j4a	Phoenix Health Insurance	private	100	t	{"email": "services@phoenixhealth.com", "phone": "+233302345685", "address": "Phoenix Building, Tamale", "contactPerson": "Medical Claims Officer"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibn000blwf4sf027t50	Acacia Health Insurance	private	100	t	{"email": "support@acaciahealth.com", "phone": "+233302345686", "address": "Acacia Complex, Cape Coast", "contactPerson": "Client Relations Manager"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibn000clwf4v6ddi1hv	Cosmopolitan Health Insurance	private	100	t	{"email": "claims@cosmopolitanhealth.com", "phone": "+233302345687", "address": "Cosmopolitan Tower, Accra", "contactPerson": "Claims Processing Department"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibn000dlwf46ov36azj	Equity Health Insurance	private	100	t	{"email": "info@equityhealth.com", "phone": "+233302345688", "address": "Equity House, Kumasi", "contactPerson": "Health Insurance Specialist"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibn000elwf4omvbu15n	GAB Health Insurance	private	100	t	{"email": "health@gabinsurance.com", "phone": "+233302345689", "address": "GAB Plaza, Accra", "contactPerson": "Medical Benefits Manager"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
cmi620ibn000flwf4phd0uzcp	Nationwide Medical Insurance	private	100	t	{"email": "claims@nationwidemedical.com", "phone": "+233302345690", "address": "Nationwide Center, Accra", "contactPerson": "National Claims Director"}	2025-11-19 13:44:32.194	2025-11-19 13:44:32.194
\.


--
-- Data for Name: LabTest; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."LabTest" (id, "attendanceId", "templateId", status, result, "normalRange", units, "requestedAt", "completedAt", "performedById", "verifiedById", notes, "createdById", priority, "createdAt", "updatedAt") FROM stdin;
cmi620set00v2lwf4xd0d34g7	cmi620oog00uelwf450ps58ln	cmi620izx0063lwf4gqsjfbjy	completed	{"test": "Malaria Parasite", "result": "Positive", "species": "Plasmodium falciparum", "parasiteCount": "+++"}	Negative	Qualitative	2025-11-19 13:44:45.269	2025-11-19 13:44:45.435	cmi620mrv00u5lwf4ltytgjcg	\N	\N	cmi620m0u00u1lwf4uyccj1bv	routine	2025-11-19 13:44:45.269	2025-11-19 13:44:45.439
\.


--
-- Data for Name: LabTestTemplate; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."LabTestTemplate" (id, name, "investigationCode", category, "subCategory", description, "cashPrice", "nhisPrice", "insurancePrice", "isNHISCovered", "isPrivateInsExempted", "nhisRequiresAuth", "privateInsRequiresAuth", "isPending", "tariffCode", "vatRate", "isTaxable", "specimenType", "resultTemplate", "createdAt", "updatedAt") FROM stdin;
cmi620j05007glwf432qv7oh0	Ascitic Fluid Analysis	inve51m	microbiology	body_fluids	Ascitic fluid examination	70	0	49	t	f	f	f	f	LAB-INVE51M	0	f	fluid	[{"label": "Appearance", "options": ["Straw-colored", "Cloudy", "Bloody", "Chylous"], "fieldName": "appearance", "fieldType": "select", "referenceRange": "Straw-colored"}, {"unit": "g/L", "label": "Serum-Ascites Albumin Gradient", "fieldName": "saa_gradient", "fieldType": "number", "referenceRange": "≥1.1 (Portal hypertension)"}, {"unit": "cells/μL", "label": "Cell Count", "fieldName": "cell_count", "fieldType": "number", "referenceRange": "<250"}, {"label": "Culture", "options": ["No growth", "Growth observed"], "fieldName": "culture_result", "fieldType": "select", "referenceRange": "No growth"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j05007hlwf4mxuohrdr	Synovial Fluid Analysis	inve52m	microbiology	body_fluids	Joint fluid analysis	65	0	45	t	f	f	f	f	LAB-INVE52M	0	f	fluid	[{"label": "Appearance", "options": ["Clear, straw-colored", "Cloudy", "Bloody", "Purulent"], "fieldName": "appearance", "fieldType": "select", "referenceRange": "Clear, straw-colored"}, {"unit": "cells/μL", "label": "White Cell Count", "fieldName": "wbc_count", "fieldType": "number", "referenceRange": "<200"}, {"label": "Crystals", "options": ["None seen", "Urate crystals", "Calcium pyrophosphate", "Hydroxyapatite"], "fieldName": "crystals", "fieldType": "select", "referenceRange": "None seen"}, {"label": "Culture", "options": ["No growth", "Growth observed"], "fieldName": "culture_result", "fieldType": "select", "referenceRange": "No growth"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j06007ilwf4q4g9mrp4	Sputum for AFB (TB)	inve53m	microbiology	mycobacteriology	Sputum for acid-fast bacilli	40	0	28	t	f	f	f	f	LAB-INVE53M	0	f	sputum	[{"label": "AFB Smear", "options": ["Negative", "Scanty (1-9/100 fields)", "+1 (10-99/100 fields)", "+2 (1-10/field)", "+3 (>10/field)"], "fieldName": "afb_smear", "fieldType": "select", "referenceRange": "Negative"}, {"label": "Sputum Quality", "options": ["Saliva", "Mucoid", "Mucopurulent", "Purulent"], "fieldName": "appearance", "fieldType": "select", "referenceRange": "Mucopurulent"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j06007jlwf4hgosd56t	GeneXpert MTB/RIF	inve54m	molecular	tb	Molecular test for TB and rifampicin resistance	120	0	85	t	f	f	f	f	LAB-INVE54M	0	f	sputum	[{"label": "M. tuberculosis Detected", "options": ["Not detected", "Detected", "Invalid", "Error"], "fieldName": "mtb_detected", "fieldType": "select", "referenceRange": "Not detected"}, {"label": "Rifampicin Resistance", "options": ["Not detected", "Detected", "Indeterminate"], "fieldName": "rifampicin_resistance", "fieldType": "select", "referenceRange": "Not detected"}, {"label": "Semi-quantitative Result", "options": ["Very low", "Low", "Medium", "High"], "fieldName": "semi_quantitative", "fieldType": "select", "referenceRange": "N/A"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j06007klwf4ysgqhi9h	COVID-19 PCR Test	inve55m	molecular	viral	SARS-CoV-2 PCR test	150	0	105	t	f	f	f	f	LAB-INVE55M	0	f	swab	[{"label": "SARS-CoV-2 PCR", "options": ["Not detected", "Detected", "Inconclusive"], "fieldName": "covid_pcr", "fieldType": "select", "referenceRange": "Not detected"}, {"label": "Cycle Threshold (Ct) Value", "fieldName": "ct_value", "fieldType": "number", "referenceRange": "N/A"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j06007llwf4xgyvb0a8	COVID-19 Antigen Test	inve56m	microbiology	viral	Rapid SARS-CoV-2 antigen test	60	0	42	t	f	f	f	f	LAB-INVE56M	0	f	swab	[{"label": "SARS-CoV-2 Antigen", "options": ["Negative", "Positive", "Invalid"], "fieldName": "covid_antigen", "fieldType": "select", "referenceRange": "Negative"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izx0062lwf41lfelids	Full Blood Count	inve01h	hematology	complete	Complete blood count with differential	35	0	25	t	f	f	f	f	LAB-INVE01H	0	f	blood	[{"unit": "x 10^9/L", "label": "White Blood Cell Count", "fieldName": "wbc", "fieldType": "number", "referenceRange": "4.0–11.0"}, {"unit": "x 10^12/L", "label": "Red Blood Cell Count", "fieldName": "rbc", "fieldType": "number", "referenceRange": "4.5–5.9"}, {"unit": "g/dL", "label": "Hemoglobin", "fieldName": "hb", "fieldType": "number", "referenceRange": "13.5–17.5"}, {"unit": "%", "label": "Hematocrit", "fieldName": "hct", "fieldType": "number", "referenceRange": "40–52"}, {"unit": "x 10^9/L", "label": "Platelet Count", "fieldName": "plt", "fieldType": "number", "referenceRange": "150–450"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izx0063lwf4gqsjfbjy	Malaria Parasite Test	inve02d	microbiology	parasitology	Malaria parasite test by microscopy	15	0	10	t	f	f	f	f	LAB-INVE02D	0	f	blood	[{"label": "Malaria Parasite", "options": ["Negative", "Positive (+)", "Positive (++)", "Positive (+++)", "Positive (++++)"], "fieldName": "mp_result", "fieldType": "select", "referenceRange": "Negative"}, {"label": "Plasmodium Species", "options": ["Not detected", "P. falciparum", "P. vivax", "P. ovale", "P. malariae", "Mixed"], "fieldName": "species", "fieldType": "select", "referenceRange": "Not applicable"}, {"unit": "parasites/μL", "label": "Parasite Density", "fieldName": "parasite_density", "fieldType": "number", "referenceRange": "0"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izx0064lwf4fgpi7txj	Blood Glucose (Random)	inve03b	biochemistry	glucose	Random blood glucose test	12	0	8	t	f	f	f	f	LAB-INVE03B	0	f	blood	[{"unit": "mmol/L", "label": "Random Blood Glucose", "fieldName": "glucose_random", "fieldType": "number", "referenceRange": "3.9–7.8"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izx0065lwf4nhz9vg7g	Blood Glucose (Fasting)	inve04b	biochemistry	glucose	Fasting blood glucose test	15	0	10	t	f	f	f	f	LAB-INVE04B	0	f	blood	[{"unit": "mmol/L", "label": "Fasting Blood Glucose", "fieldName": "glucose_fasting", "fieldType": "number", "referenceRange": "3.9–5.6"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izy0066lwf4z8egn50e	Urinalysis (Routine)	inve05u	biochemistry	urine	Complete urinalysis with microscopy	18	0	12	t	f	f	f	f	LAB-INVE05U	0	f	urine	[{"label": "Appearance", "options": ["Clear", "Hazy", "Cloudy", "Turbid"], "fieldName": "appearance", "fieldType": "select", "referenceRange": "Clear"}, {"label": "Color", "fieldName": "color", "fieldType": "text", "referenceRange": "Straw"}, {"label": "Specific Gravity", "fieldName": "specific_gravity", "fieldType": "number", "referenceRange": "1.005–1.030"}, {"label": "pH", "fieldName": "ph", "fieldType": "number", "referenceRange": "4.5–8.0"}, {"label": "Protein", "options": ["Negative", "Trace", "+1", "+2", "+3", "+4"], "fieldName": "protein", "fieldType": "select", "referenceRange": "Negative"}, {"label": "Glucose", "options": ["Negative", "+1", "+2", "+3", "+4"], "fieldName": "glucose", "fieldType": "select", "referenceRange": "Negative"}, {"label": "Ketones", "options": ["Negative", "Trace", "+1", "+2", "+3"], "fieldName": "ketones", "fieldType": "select", "referenceRange": "Negative"}, {"label": "Blood", "options": ["Negative", "+1", "+2", "+3"], "fieldName": "blood", "fieldType": "select", "referenceRange": "Negative"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izy0067lwf4ybzewuu0	Pregnancy Test (Urine)	inve06u	serology	pregnancy	Qualitative urine pregnancy test	10	0	7	t	f	f	f	f	LAB-INVE06U	0	f	urine	[{"label": "Pregnancy Test", "options": ["Negative", "Positive"], "fieldName": "pregnancy_test", "fieldType": "select", "referenceRange": "Negative"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izy0068lwf4rgv1yd0n	Widal Test	inve07s	serology	febrile_illness	Widal test for typhoid fever	25	0	18	t	f	f	f	f	LAB-INVE07S	0	f	blood	[{"label": "S. typhi O antigen", "options": ["Negative (<1:80)", "Positive (1:80)", "Positive (1:160)", "Positive (1:320)", "Positive (≥1:640)"], "fieldName": "salmonella_typhi_o", "fieldType": "select", "referenceRange": "Negative (<1:80)"}, {"label": "S. typhi H antigen", "options": ["Negative (<1:80)", "Positive (1:80)", "Positive (1:160)", "Positive (1:320)", "Positive (≥1:640)"], "fieldName": "salmonella_typhi_h", "fieldType": "select", "referenceRange": "Negative (<1:80)"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izy0069lwf4ag4pefqg	HIV Screening Test	inve08s	serology	hiv	HIV rapid test screening	20	0	15	t	f	f	f	f	LAB-INVE08S	0	f	blood	[{"label": "HIV Screening Test", "options": ["Negative", "Positive", "Invalid"], "fieldName": "hiv_screening", "fieldType": "select", "referenceRange": "Negative"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izy006alwf4h0n2143h	Hepatitis B Surface Antigen	inve09s	serology	hepatitis	HBsAg test for Hepatitis B	22	0	16	t	f	f	f	f	LAB-INVE09S	0	f	blood	[{"label": "Hepatitis B Surface Antigen", "options": ["Negative", "Positive"], "fieldName": "hbsag", "fieldType": "select", "referenceRange": "Negative"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izy006blwf4skv6clbh	Stool Microscopy	inve10d	microbiology	parasitology	Stool examination for ova and parasites	20	0	14	t	f	f	f	f	LAB-INVE10D	0	f	stool	[{"label": "Consistency", "options": ["Formed", "Soft", "Loose", "Watery"], "fieldName": "consistency", "fieldType": "select", "referenceRange": "Formed"}, {"label": "Color", "fieldName": "color", "fieldType": "text", "referenceRange": "Brown"}, {"label": "Ova/Cysts", "options": ["Not seen", "Present"], "fieldName": "ova_cysts", "fieldType": "select", "referenceRange": "Not seen"}, {"label": "Parasites Identified", "fieldName": "parasites", "fieldType": "text", "referenceRange": "None"}, {"label": "Occult Blood", "options": ["Negative", "Positive"], "fieldName": "occult_blood", "fieldType": "select", "referenceRange": "Negative"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izz006clwf49pq6kzkg	Liver Function Tests	inve11b	biochemistry	liver	Comprehensive liver function panel	45	0	32	t	f	f	f	f	LAB-INVE11B	0	f	blood	[{"unit": "U/L", "label": "ALT (SGPT)", "fieldName": "alt", "fieldType": "number", "referenceRange": "7–56"}, {"unit": "U/L", "label": "AST (SGOT)", "fieldName": "ast", "fieldType": "number", "referenceRange": "5–40"}, {"unit": "U/L", "label": "Alkaline Phosphatase", "fieldName": "alp", "fieldType": "number", "referenceRange": "44–147"}, {"unit": "μmol/L", "label": "Total Bilirubin", "fieldName": "total_bilirubin", "fieldType": "number", "referenceRange": "3.4–20.5"}, {"unit": "μmol/L", "label": "Direct Bilirubin", "fieldName": "direct_bilirubin", "fieldType": "number", "referenceRange": "0–5.1"}, {"unit": "g/L", "label": "Total Protein", "fieldName": "total_protein", "fieldType": "number", "referenceRange": "60–80"}, {"unit": "g/L", "label": "Albumin", "fieldName": "albumin", "fieldType": "number", "referenceRange": "35–50"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izz006dlwf4el3931bq	Renal Function Tests	inve12b	biochemistry	renal	Kidney function test panel	40	0	28	t	f	f	f	f	LAB-INVE12B	0	f	blood	[{"unit": "mmol/L", "label": "Urea", "fieldName": "urea", "fieldType": "number", "referenceRange": "2.5–7.1"}, {"unit": "μmol/L", "label": "Creatinine", "fieldName": "creatinine", "fieldType": "number", "referenceRange": "62–106"}, {"unit": "mmol/L", "label": "Sodium", "fieldName": "sodium", "fieldType": "number", "referenceRange": "136–145"}, {"unit": "mmol/L", "label": "Potassium", "fieldName": "potassium", "fieldType": "number", "referenceRange": "3.5–5.1"}, {"unit": "mmol/L", "label": "Chloride", "fieldName": "chloride", "fieldType": "number", "referenceRange": "98–107"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izz006elwf4n1n2n282	Lipid Profile	inve13b	biochemistry	lipids	Complete lipid profile	38	0	27	t	f	f	f	f	LAB-INVE13B	0	f	blood	[{"unit": "mmol/L", "label": "Total Cholesterol", "fieldName": "total_cholesterol", "fieldType": "number", "referenceRange": "<5.2"}, {"unit": "mmol/L", "label": "HDL Cholesterol", "fieldName": "hdl_cholesterol", "fieldType": "number", "referenceRange": ">1.0"}, {"unit": "mmol/L", "label": "LDL Cholesterol", "fieldName": "ldl_cholesterol", "fieldType": "number", "referenceRange": "<2.6"}, {"unit": "mmol/L", "label": "Triglycerides", "fieldName": "triglycerides", "fieldType": "number", "referenceRange": "<1.7"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izz006flwf4ri8shkm0	Blood Group and Rh Typing	inve14h	hematology	blood_group	ABO and Rh blood grouping	15	0	10	t	f	f	f	f	LAB-INVE14H	0	f	blood	[{"label": "ABO Blood Group", "options": ["A", "B", "AB", "O"], "fieldName": "abo_group", "fieldType": "select", "referenceRange": "N/A"}, {"label": "Rh Type", "options": ["Positive", "Negative"], "fieldName": "rh_type", "fieldType": "select", "referenceRange": "N/A"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620izz006glwf4wkirsokd	Sickle Cell Test	inve15h	hematology	hemoglobinopathy	Sickle cell solubility test	18	0	12	t	f	f	f	f	LAB-INVE15H	0	f	blood	[{"label": "Sickle Cell Test", "options": ["Negative", "Positive"], "fieldName": "sickle_cell_test", "fieldType": "select", "referenceRange": "Negative"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j00006hlwf4u2lz115d	Electrolytes, Urea and Creatinine (EUC)	inve16b	biochemistry	renal	Electrolytes with renal function tests	35	0	25	t	f	f	f	f	LAB-INVE16B	0	f	blood	[{"unit": "mmol/L", "label": "Sodium", "fieldName": "sodium", "fieldType": "number", "referenceRange": "136–145"}, {"unit": "mmol/L", "label": "Potassium", "fieldName": "potassium", "fieldType": "number", "referenceRange": "3.5–5.1"}, {"unit": "mmol/L", "label": "Chloride", "fieldName": "chloride", "fieldType": "number", "referenceRange": "98–107"}, {"unit": "mmol/L", "label": "Bicarbonate", "fieldName": "bicarbonate", "fieldType": "number", "referenceRange": "22–29"}, {"unit": "mmol/L", "label": "Urea", "fieldName": "urea", "fieldType": "number", "referenceRange": "2.5–7.1"}, {"unit": "μmol/L", "label": "Creatinine", "fieldName": "creatinine", "fieldType": "number", "referenceRange": "62–106"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j00006ilwf4czw1g1ni	Thyroid Function Tests (TFT)	inve17b	biochemistry	endocrine	Thyroid stimulating hormone and free T4	55	0	40	t	f	f	f	f	LAB-INVE17B	0	f	blood	[{"unit": "mIU/L", "label": "TSH", "fieldName": "tsh", "fieldType": "number", "referenceRange": "0.4–4.0"}, {"unit": "pmol/L", "label": "Free T4", "fieldName": "free_t4", "fieldType": "number", "referenceRange": "12–22"}, {"unit": "pmol/L", "label": "Free T3", "fieldName": "free_t3", "fieldType": "number", "referenceRange": "3.1–6.8"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j00006jlwf40tgl4dip	Prostate Specific Antigen (PSA)	inve18b	biochemistry	tumor_markers	Prostate cancer screening test	45	0	32	t	f	f	f	f	LAB-INVE18B	0	f	blood	[{"unit": "ng/mL", "label": "Total PSA", "fieldName": "total_psa", "fieldType": "number", "referenceRange": "<4.0"}, {"unit": "ng/mL", "label": "Free PSA", "fieldName": "free_psa", "fieldType": "number", "referenceRange": "N/A"}, {"unit": "%", "label": "Free/Total PSA Ratio", "fieldName": "free_ratio", "fieldType": "number", "referenceRange": ">25%"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j00006klwf4kdh2b5t7	HbA1c (Glycated Hemoglobin)	inve19b	hematology	diabetes	3-month average blood glucose control	40	0	28	t	f	f	f	f	LAB-INVE19B	0	f	blood	[{"unit": "%", "label": "HbA1c", "fieldName": "hba1c", "fieldType": "number", "referenceRange": "4.0–5.6"}, {"unit": "mmol/L", "label": "Estimated Average Glucose", "fieldName": "estimated_average_glucose", "fieldType": "number", "referenceRange": "3.9–7.0"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j00006llwf4fjmq50qv	C-Reactive Protein (CRP)	inve20b	biochemistry	inflammation	Inflammatory marker test	30	0	22	t	f	f	f	f	LAB-INVE20B	0	f	blood	[{"unit": "mg/L", "label": "C-Reactive Protein", "fieldName": "crp", "fieldType": "number", "referenceRange": "<5.0"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j01006mlwf45fvcije5	Rheumatoid Factor (RF)	inve21s	serology	autoimmune	Rheumatoid arthritis screening	35	0	25	t	f	f	f	f	LAB-INVE21S	0	f	blood	[{"unit": "IU/mL", "label": "Rheumatoid Factor", "fieldName": "rheumatoid_factor", "fieldType": "number", "referenceRange": "<14"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j01006nlwf4n0hr5ixw	ASO Titre	inve22s	serology	streptococcal	Anti-streptolysin O titre for rheumatic fever	38	0	27	t	f	f	f	f	LAB-INVE22S	0	f	blood	[{"label": "ASO Titre", "options": ["<200 IU/mL", "200–400 IU/mL", ">400 IU/mL"], "fieldName": "aso_titre", "fieldType": "select", "referenceRange": "<200 IU/mL"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j01006olwf48618th28	VDRL/RPR Test	inve23s	serology	syphilis	Syphilis screening test	25	0	18	t	f	f	f	f	LAB-INVE23S	0	f	blood	[{"label": "VDRL/RPR", "options": ["Non-reactive", "Reactive"], "fieldName": "vdrl", "fieldType": "select", "referenceRange": "Non-reactive"}, {"label": "Titre if Reactive", "fieldName": "titre", "fieldType": "text", "referenceRange": "N/A"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j01006plwf4j4hzrvs3	Hepatitis C Antibody	inve24s	serology	hepatitis	Hepatitis C virus screening	40	0	28	t	f	f	f	f	LAB-INVE24S	0	f	blood	[{"label": "Hepatitis C Antibody", "options": ["Negative", "Positive"], "fieldName": "hcv_ab", "fieldType": "select", "referenceRange": "Negative"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j01006qlwf4dg1x0jvi	Blood Culture and Sensitivity	inve25m	microbiology	bacteriology	Blood culture for bacteremia with antibiotic sensitivity	85	0	60	t	f	f	f	f	LAB-INVE25M	0	f	blood	[{"label": "Culture Result", "options": ["No growth", "Growth observed"], "fieldName": "culture_result", "fieldType": "select", "referenceRange": "No growth"}, {"label": "Organism Identified", "fieldName": "organism", "fieldType": "text", "referenceRange": "None"}, {"label": "Sensitive Antibiotics", "fieldName": "sensitive_antibiotics", "fieldType": "textarea", "referenceRange": "N/A"}, {"label": "Resistant Antibiotics", "fieldName": "resistant_antibiotics", "fieldType": "textarea", "referenceRange": "N/A"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j01006rlwf4dspif3bg	Urine Culture and Sensitivity	inve26m	microbiology	bacteriology	Urine culture for UTI with antibiotic sensitivity	65	0	45	t	f	f	f	f	LAB-INVE26M	0	f	urine	[{"label": "Culture Result", "options": ["No significant growth", "Significant growth", "Mixed growth", "Contaminated"], "fieldName": "culture_result", "fieldType": "select", "referenceRange": "No significant growth"}, {"label": "Organism Identified", "fieldName": "organism", "fieldType": "text", "referenceRange": "None"}, {"unit": "CFU/mL", "label": "Colony Count", "fieldName": "colony_count", "fieldType": "number", "referenceRange": "<10^5"}, {"label": "Sensitive Antibiotics", "fieldName": "sensitive_antibiotics", "fieldType": "textarea", "referenceRange": "N/A"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j01006slwf4yj2peia3	Wound Swab Culture	inve27m	microbiology	bacteriology	Wound swab for infection with sensitivity	60	0	42	t	f	f	f	f	LAB-INVE27M	0	f	swab	[{"label": "Culture Result", "options": ["No growth", "Growth observed", "Mixed growth"], "fieldName": "culture_result", "fieldType": "select", "referenceRange": "No growth"}, {"label": "Organism Identified", "fieldName": "organism", "fieldType": "text", "referenceRange": "None"}, {"label": "Sensitive Antibiotics", "fieldName": "sensitive_antibiotics", "fieldType": "textarea", "referenceRange": "N/A"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j02006tlwf4hay58jc1	High Vaginal Swab (HVS)	inve28m	microbiology	gynecology	Vaginal swab for infection screening	45	0	32	t	f	f	f	f	LAB-INVE28M	0	f	swab	[{"label": "Pus Cells", "options": ["None", "Scanty", "Moderate", "Many"], "fieldName": "pus_cells", "fieldType": "select", "referenceRange": "Scanty"}, {"label": "Epithelial Cells", "options": ["None", "Scanty", "Moderate", "Many"], "fieldName": "epithelial_cells", "fieldType": "select", "referenceRange": "Moderate"}, {"label": "Clue Cells", "options": ["Absent", "Present"], "fieldName": "clue_cells", "fieldType": "select", "referenceRange": "Absent"}, {"label": "Trichomonas vaginalis", "options": ["Not seen", "Seen"], "fieldName": "trichomonas", "fieldType": "select", "referenceRange": "Not seen"}, {"label": "Yeast Cells", "options": ["Not seen", "Few", "Many"], "fieldName": "yeast_cells", "fieldType": "select", "referenceRange": "Not seen"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j02006ulwf4n4njv4l5	Semen Analysis	inve29m	microbiology	andrology	Complete semen analysis for fertility	70	0	50	t	f	f	f	f	LAB-INVE29M	0	f	semen	[{"unit": "mL", "label": "Volume", "fieldName": "volume", "fieldType": "number", "referenceRange": "1.5–5.0"}, {"unit": "minutes", "label": "Liquefaction Time", "fieldName": "liquefaction_time", "fieldType": "number", "referenceRange": "<60"}, {"unit": "million/mL", "label": "Sperm Count", "fieldName": "sperm_count", "fieldType": "number", "referenceRange": ">15"}, {"unit": "%", "label": "Motility", "fieldName": "motility", "fieldType": "number", "referenceRange": ">40%"}, {"unit": "%", "label": "Normal Morphology", "fieldName": "morphology", "fieldType": "number", "referenceRange": ">4%"}, {"unit": "%", "label": "Vitality", "fieldName": "vitality", "fieldType": "number", "referenceRange": ">58%"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j02006vlwf4j4yzkk76	Peripheral Blood Film	inve30h	hematology	morphology	Blood film examination for cell morphology	25	0	18	t	f	f	f	f	LAB-INVE30H	0	f	blood	[{"label": "Red Cell Morphology", "fieldName": "red_cell_morphology", "fieldType": "textarea", "referenceRange": "Normocytic normochromic"}, {"label": "White Cell Morphology", "fieldName": "white_cell_morphology", "fieldType": "textarea", "referenceRange": "Normal differential"}, {"label": "Platelet Morphology", "fieldName": "platelet_morphology", "fieldType": "textarea", "referenceRange": "Adequate in number"}, {"label": "Blood Parasites", "fieldName": "parasites", "fieldType": "textarea", "referenceRange": "None seen"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j02006wlwf40nqibdby	Erythrocyte Sedimentation Rate (ESR)	inve31h	hematology	inflammation	ESR for inflammatory conditions	15	0	10	t	f	f	f	f	LAB-INVE31H	0	f	blood	[{"unit": "mm/hr", "label": "ESR (Westergren)", "fieldName": "esr", "fieldType": "number", "referenceRange": "Male: 0–15, Female: 0–20"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j02006xlwf4dq3isnxf	Coagulation Profile (PT/INR/APTT)	inve32h	hematology	coagulation	Coagulation screening tests	55	0	40	t	f	f	f	f	LAB-INVE32H	0	f	blood	[{"unit": "seconds", "label": "Prothrombin Time", "fieldName": "pt", "fieldType": "number", "referenceRange": "11–13.5"}, {"label": "INR", "fieldName": "inr", "fieldType": "number", "referenceRange": "0.8–1.2"}, {"unit": "seconds", "label": "APTT", "fieldName": "aptt", "fieldType": "number", "referenceRange": "25–35"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j03006ylwf4rnsi4343	Dengue NS1 Antigen	inve33s	serology	viral	Early dengue fever detection	50	0	35	t	f	f	f	f	LAB-INVE33S	0	f	blood	[{"label": "Dengue NS1 Antigen", "options": ["Negative", "Positive"], "fieldName": "dengue_ns1", "fieldType": "select", "referenceRange": "Negative"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j03006zlwf49uigwilo	Troponin I	inve34b	biochemistry	cardiac	Cardiac marker for myocardial infarction	65	0	45	t	f	f	f	f	LAB-INVE34B	0	f	blood	[{"unit": "ng/mL", "label": "Troponin I", "fieldName": "troponin_i", "fieldType": "number", "referenceRange": "<0.04"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j030070lwf4gwvs5j5x	Amylase and Lipase	inve35b	biochemistry	pancreatic	Pancreatic enzymes for pancreatitis	48	0	34	t	f	f	f	f	LAB-INVE35B	0	f	blood	[{"unit": "U/L", "label": "Amylase", "fieldName": "amylase", "fieldType": "number", "referenceRange": "28–100"}, {"unit": "U/L", "label": "Lipase", "fieldName": "lipase", "fieldType": "number", "referenceRange": "13–60"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j030071lwf46o1emxcw	Iron Studies	inve36b	biochemistry	hematinic	Iron profile for anemia evaluation	60	0	42	t	f	f	f	f	LAB-INVE36B	0	f	blood	[{"unit": "μg/dL", "label": "Serum Iron", "fieldName": "serum_iron", "fieldType": "number", "referenceRange": "50–170"}, {"unit": "μg/dL", "label": "Total Iron Binding Capacity", "fieldName": "tibc", "fieldType": "number", "referenceRange": "250–400"}, {"unit": "%", "label": "Transferrin Saturation", "fieldName": "transferrin_saturation", "fieldType": "number", "referenceRange": "20–50"}, {"unit": "ng/mL", "label": "Ferritin", "fieldName": "ferritin", "fieldType": "number", "referenceRange": "Male: 30–400, Female: 15–150"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j030072lwf4exwal37a	Vitamin B12 and Folate	inve37b	biochemistry	hematinic	Vitamin B12 and folic acid levels	75	0	52	t	f	f	f	f	LAB-INVE37B	0	f	blood	[{"unit": "pg/mL", "label": "Vitamin B12", "fieldName": "vitamin_b12", "fieldType": "number", "referenceRange": "200–900"}, {"unit": "ng/mL", "label": "Folate", "fieldName": "folate", "fieldType": "number", "referenceRange": ">3.0"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j030073lwf4n52op5d9	Calcium, Phosphate and Magnesium	inve38b	biochemistry	bone_metabolism	Bone metabolism minerals	35	0	25	t	f	f	f	f	LAB-INVE38B	0	f	blood	[{"unit": "mmol/L", "label": "Calcium", "fieldName": "calcium", "fieldType": "number", "referenceRange": "2.10–2.55"}, {"unit": "mmol/L", "label": "Phosphate", "fieldName": "phosphate", "fieldType": "number", "referenceRange": "0.80–1.50"}, {"unit": "mmol/L", "label": "Magnesium", "fieldName": "magnesium", "fieldType": "number", "referenceRange": "0.70–1.00"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j030074lwf4nh7nb36k	Uric Acid	inve39b	biochemistry	metabolic	Uric acid for gout evaluation	18	0	12	t	f	f	f	f	LAB-INVE39B	0	f	blood	[{"unit": "μmol/L", "label": "Uric Acid", "fieldName": "uric_acid", "fieldType": "number", "referenceRange": "Male: 210–420, Female: 150–360"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j040075lwf4fu3g92tg	Glycated Serum Protein (Fructosamine)	inve40b	biochemistry	diabetes	2-3 week average glucose control	45	0	32	t	f	f	f	f	LAB-INVE40B	0	f	blood	[{"unit": "μmol/L", "label": "Fructosamine", "fieldName": "fructosamine", "fieldType": "number", "referenceRange": "200–285"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j040076lwf4wmxqvc0l	Cortisol (AM)	inve41b	biochemistry	endocrine	Morning cortisol level	55	0	38	t	f	f	f	f	LAB-INVE41B	0	f	blood	[{"unit": "nmol/L", "label": "Cortisol (8 AM)", "fieldName": "cortisol_am", "fieldType": "number", "referenceRange": "171–536"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j040077lwf44bw7qief	Prolactin	inve42b	biochemistry	endocrine	Prolactin hormone level	50	0	35	t	f	f	f	f	LAB-INVE42B	0	f	blood	[{"unit": "mIU/L", "label": "Prolactin", "fieldName": "prolactin", "fieldType": "number", "referenceRange": "Male: 86–324, Female: 102–496"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j040078lwf4chdaarxr	Testosterone Total	inve43b	biochemistry	endocrine	Total testosterone level	65	0	45	t	f	f	f	f	LAB-INVE43B	0	f	blood	[{"unit": "nmol/L", "label": "Testosterone Total", "fieldName": "testosterone_total", "fieldType": "number", "referenceRange": "Male: 8.64–29.0, Female: 0.29–1.67"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j040079lwf4yfa07gv3	Beta HCG Quantitative	inve44b	biochemistry	pregnancy	Quantitative pregnancy hormone	40	0	28	t	f	f	f	f	LAB-INVE44B	0	f	blood	[{"unit": "mIU/mL", "label": "Beta HCG", "fieldName": "beta_hcg", "fieldType": "number", "referenceRange": "Non-pregnant: <5"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j04007alwf4uo7jxx7s	CA-125	inve45b	biochemistry	tumor_markers	Ovarian cancer marker	70	0	49	t	f	f	f	f	LAB-INVE45B	0	f	blood	[{"unit": "U/mL", "label": "CA-125", "fieldName": "ca_125", "fieldType": "number", "referenceRange": "<35"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j04007blwf4o2j3qwpz	CEA (Carcinoembryonic Antigen)	inve46b	biochemistry	tumor_markers	Colorectal cancer marker	65	0	45	t	f	f	f	f	LAB-INVE46B	0	f	blood	[{"unit": "ng/mL", "label": "CEA", "fieldName": "cea", "fieldType": "number", "referenceRange": "Non-smoker: <2.5, Smoker: <5.0"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j04007clwf4edcd4fql	Alpha-fetoprotein (AFP)	inve47b	biochemistry	tumor_markers	Liver cancer and fetal defect marker	60	0	42	t	f	f	f	f	LAB-INVE47B	0	f	blood	[{"unit": "IU/mL", "label": "Alpha-fetoprotein", "fieldName": "afp", "fieldType": "number", "referenceRange": "<7.0"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j05007dlwf4fjxmes8m	Helicobacter pylori Stool Antigen	inve48m	microbiology	gastrointestinal	H. pylori infection detection	55	0	38	t	f	f	f	f	LAB-INVE48M	0	f	stool	[{"label": "H. pylori Antigen", "options": ["Negative", "Positive"], "fieldName": "h_pylori_antigen", "fieldType": "select", "referenceRange": "Negative"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j05007elwf4wtvjxw2q	CSF Analysis	inve49m	microbiology	cns	Cerebrospinal fluid analysis	85	0	60	t	f	f	f	f	LAB-INVE49M	0	f	csf	[{"label": "Appearance", "options": ["Clear and colorless", "Cloudy", "Xanthochromic", "Bloody"], "fieldName": "appearance", "fieldType": "select", "referenceRange": "Clear and colorless"}, {"unit": "mg/dL", "label": "Protein", "fieldName": "protein", "fieldType": "number", "referenceRange": "15–45"}, {"unit": "mmol/L", "label": "Glucose", "fieldName": "glucose", "fieldType": "number", "referenceRange": "2.8–4.4"}, {"unit": "cells/μL", "label": "Cell Count", "fieldName": "cell_count", "fieldType": "number", "referenceRange": "0–5"}, {"label": "Cell Differential", "fieldName": "differential", "fieldType": "textarea", "referenceRange": "Lymphocytes predominant"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
cmi620j05007flwf4cvwdnxto	Pleural Fluid Analysis	inve50m	microbiology	body_fluids	Pleural fluid examination	75	0	52	t	f	f	f	f	LAB-INVE50M	0	f	fluid	[{"label": "Appearance", "options": ["Straw-colored", "Bloody", "Turbid", "Purulent"], "fieldName": "appearance", "fieldType": "select", "referenceRange": "Straw-colored"}, {"unit": "g/L", "label": "Protein", "fieldName": "protein", "fieldType": "number", "referenceRange": "<30 (Transudate)"}, {"unit": "U/L", "label": "LDH", "fieldName": "ldh", "fieldType": "number", "referenceRange": "<200 (Transudate)"}, {"unit": "cells/μL", "label": "Cell Count", "fieldName": "cell_count", "fieldType": "number", "referenceRange": "<1000"}, {"label": "Culture", "options": ["No growth", "Growth observed"], "fieldName": "culture_result", "fieldType": "select", "referenceRange": "No growth"}]	2025-11-19 13:44:33.065	2025-11-19 13:44:33.065
\.


--
-- Data for Name: Medication; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Medication" (id, "attendanceId", "stockItemId", name, dosage, frequency, duration, quantity, route, instructions, status, "prescribedAt", "dispensedAt", "administeredAt", "dispensedById", "administeredById", "prescribedById", notes, "createdAt", "updatedAt") FROM stdin;
cmi620r6l00uylwf4si1k3107	cmi620oog00uelwf450ps58ln	cmi620jsg00eklwf4z86y7gzd	Artesunate 50mg	2 tabs	Once daily	3 days	6	oral	Take with food	dispensed	2025-11-19 13:44:43.676	2025-11-19 13:44:44.925	\N	cmi620ndj00u7lwf47lrzz1j2	\N	cmi620m0u00u1lwf4uyccj1bv	\N	2025-11-19 13:44:43.676	2025-11-19 13:44:44.926
cmi620rre00v0lwf4wg5ac25x	cmi620oog00uelwf450ps58ln	cmi620jnv00bilwf4i5nb0y9e	Paracetamol 500mg	1 tab	8 hourly	3 days	9	oral	Take for fever	dispensed	2025-11-19 13:44:44.426	2025-11-19 13:44:45.112	\N	cmi620ndj00u7lwf47lrzz1j2	\N	cmi620m0u00u1lwf4uyccj1bv	\N	2025-11-19 13:44:44.426	2025-11-19 13:44:45.113
\.


--
-- Data for Name: Patient; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Patient" (id, "folderNumber", surname, "otherNames", gender, "dateOfBirth", age, contact, address, "paymentMode", "insuranceDetails", "additionalInfo", "billingAddress", employer, "imageUrl", "registeredAt", "registeredBy", "insuranceProviderId", "createdAt", "updatedAt") FROM stdin;
cmi620nx400u9lwf4yeal9cx2	PAT-10000	Mensah	Kwame	male	1985-05-15 00:00:00	40	+233244123456	123 Main St, Accra, Ghana	cash	{}	\N	\N	\N	\N	2025-11-19 13:44:39.448	System Administrator	\N	2025-11-19 13:44:39.449	2025-11-19 13:44:39.449
cmi620o2t00ualwf4pt2dvjh1	PAT-10001	Serwaa	Ama	female	1990-08-22 00:00:00	35	+233244234567	456 Oak Ave, Kumasi, Ghana	nhis	{"endDate": "2024-12-31", "memberId": "NHIS-24593", "startDate": "2024-01-01", "providerName": "National Health Insurance Scheme"}	\N	\N	\N	\N	2025-11-19 13:44:39.651	System Administrator	\N	2025-11-19 13:44:39.653	2025-11-19 13:44:39.653
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Payment" (id, "billId", amount, "paymentMethod", reference, "transactionDate", "receivedById", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Procedure; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Procedure" (id, "attendanceId", "templateId", status, "scheduledDate", "performedAt", "performedById", "assistantId", notes, complications, outcome, cost, duration, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProcedureTemplate; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."ProcedureTemplate" (id, name, "procedureCode", description, category, department, "cashPrice", "nhisPrice", "insurancePrice", "isNHISCovered", "isPrivateInsExempted", "nhisRequiresAuth", "privateInsRequiresAuth", "isPending", "tariffCode", "vatRate", "isTaxable", duration, "createdAt", "updatedAt") FROM stdin;
cmi620j47008zlwf4h3ocluab	Lumbar Puncture	neuro01A	CSF collection for meningitis workup	therapeutic	internal_medicine	200	0	170	t	f	f	f	f	PROC-NEURO01A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j470090lwf4uzjd2wqv	Blood Transfusion, Whole Blood (1 Unit)	ther05A	Transfusion of screened donor blood	therapeutic	internal_medicine	500	0	420	t	f	f	f	f	PROC-THER05A	0	f	120	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j470091lwf4kllcbafi	Wound Dressing, Simple	ther06A	Cleaning and dressing of minor wound	therapeutic	internal_medicine	20	0	18	t	f	f	f	f	PROC-THER06A	0	f	15	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j470092lwf48f9101ia	Wound Dressing, Complex	ther06X	Dressing for infected or large wound	therapeutic	internal_medicine	50	0	42	t	f	f	f	f	PROC-THER06X	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j470093lwf4m0unl7vu	Removal of Impacted Ear Wax	ent01A	Syringing or manual extraction	therapeutic	internal_medicine	30	0	25	t	f	f	f	f	PROC-ENT01A	0	f	15	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j470094lwf4yalk3sja	Nasal Packing for Epistaxis	ent02A	Control of nosebleed with anterior pack	therapeutic	internal_medicine	60	0	50	t	f	f	f	f	PROC-ENT02A	0	f	20	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j470095lwf411kv9d33	Removal of Foreign Body from Nose	ent03A	Extraction of nasal foreign body in child	therapeutic	pediatrics	40	0	35	t	f	f	f	f	PROC-ENT03A	0	f	15	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j470096lwf4v0s4ta2l	Circumcision, Adult	surg09A	Elective or therapeutic male circumcision	surgical	surgery	300	0	260	t	f	f	f	f	PROC-SURG09A	0	f	45	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j470097lwf4k4k9b1e3	Mastectomy, Simple	surg10X	Surgical removal of breast for cancer	surgical	surgery	3000	0	2600	t	f	f	f	f	PROC-SURG10X	0	f	150	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j42007mlwf41toedx47	Normal Vaginal Delivery	obgy02A	Uncomplicated vaginal childbirth	obstetric	obstetrics	800	0	700	t	f	f	f	f	PROC-OBGY02A	0	f	120	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j42007nlwf4xw6xvese	Cesarean Section, Single Fetus	obgy03X	Surgical delivery via abdominal incision	obstetric	obstetrics	2500	0	2200	t	f	f	f	f	PROC-OBGY03X	0	f	90	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j42007olwf4k0hdxi1w	Episiotomy with Repair	obgy04A	Surgical incision during delivery with suturing	obstetric	obstetrics	300	0	260	t	f	f	f	f	PROC-OBGY04A	0	f	20	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j42007plwf4901d0kmv	Manual Removal of Placenta	obgy05A	Removal of retained placenta postpartum	obstetric	obstetrics	400	0	350	t	f	f	f	f	PROC-OBGY05A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j42007qlwf43dhx5hva	Dilation and Curettage (D&C)	obgy06A	Uterine scraping for incomplete miscarriage	obstetric	obstetrics	600	0	520	t	f	f	f	f	PROC-OBGY06A	0	f	45	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j42007rlwf4tahoutj2	Insertion of Intrauterine Contraceptive Device (IUCD)	obgy07A	Long-acting reversible contraception	therapeutic	obstetrics	150	0	120	t	f	f	f	f	PROC-OBGY07A	0	f	15	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j42007slwf4mwez2bjo	Appendectomy	surg01A	Surgical removal of appendix	surgical	surgery	1500	0	1300	t	f	f	f	f	PROC-SURG01A	0	f	90	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j43007tlwf4bp8negxr	Hernia Repair, Inguinal	surg02A	Open repair of inguinal hernia	surgical	surgery	1800	0	1600	t	f	f	f	f	PROC-SURG02A	0	f	120	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j43007ulwf498zqk4ll	Incision and Drainage of Abscess	surg03A	Drainage of skin or soft tissue abscess	surgical	surgery	250	0	220	t	f	f	f	f	PROC-SURG03A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j43007vlwf4y8fqub0v	Cataract Surgery, Phacoemulsification	ophth01X	Removal of cloudy lens with IOL implant	ophthalmic	ophthalmology	2000	0	1800	t	f	f	f	f	PROC-OPHTH01X	0	f	60	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j43007wlwf4hpkdlgtx	Suturing of Laceration (Minor)	surg04A	Wound closure with sutures (<5cm)	surgical	surgery	120	0	100	t	f	f	f	f	PROC-SURG04A	0	f	20	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j43007xlwf4ccmfdsll	Suturing of Laceration (Major)	surg04X	Wound closure with sutures (≥5cm or complex)	surgical	surgery	250	0	220	t	f	f	f	f	PROC-SURG04X	0	f	45	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j43007ylwf4suzxdtti	Tooth Extraction, Simple	dent01A	Removal of non-impacted tooth	dental	dental	80	0	70	t	f	f	f	f	PROC-DENT01A	0	f	15	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j43007zlwf4b1b79d4q	Dental Filling, Amalgam	dent02A	Restoration of carious tooth	dental	dental	60	0	50	t	f	f	f	f	PROC-DENT02A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j430080lwf438l9yjr4	Full Blood Count (FBC)	lab01A	Complete hemogram including Hb, WBC, platelets	diagnostic	laboratory	30	0	25	t	f	f	f	f	PROC-LAB01A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j430081lwf49dvar0at	Malaria Rapid Diagnostic Test (RDT)	lab02A	Point-of-care test for Plasmodium antigens	diagnostic	laboratory	15	0	12	t	f	f	f	f	PROC-LAB02A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j430082lwf4h821c7lw	Blood Glucose (Random)	lab03A	Point-of-care blood sugar test	diagnostic	laboratory	10	0	8	t	f	f	f	f	PROC-LAB03A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j430083lwf4w7cmvf4d	HIV Rapid Test	lab04A	Screening for HIV antibodies	diagnostic	laboratory	20	0	18	t	f	f	f	f	PROC-LAB04A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j440084lwf4rls61a5e	Urinalysis, Routine	lab05A	Dipstick and microscopic urine analysis	diagnostic	laboratory	25	0	22	t	f	f	f	f	PROC-LAB05A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j440085lwf4dbzswcd1	Sputum for AFB (TB Test)	lab06A	Acid-fast bacilli smear for tuberculosis	diagnostic	laboratory	35	0	30	t	f	f	f	f	PROC-LAB06A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j440086lwf46r8w6me3	Pregnancy Test (Urine)	lab07A	Qualitative hCG detection	diagnostic	laboratory	10	0	8	t	f	f	f	f	PROC-LAB07A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j440087lwf49ixw1soo	Chest X-Ray, PA View	rad01A	Plain radiograph of chest	diagnostic	radiology	60	0	50	t	f	f	f	f	PROC-RAD01A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j440088lwf4i9ol86k8	Abdominal Ultrasound	rad02A	Imaging of abdominal organs	diagnostic	radiology	120	0	100	t	f	f	f	f	PROC-RAD02A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j440089lwf4y1xbzbb9	Pelvic Ultrasound	rad03A	Transabdominal imaging of uterus and ovaries	diagnostic	radiology	100	0	85	t	f	f	f	f	PROC-RAD03A	0	f	20	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j44008alwf4f5saj60f	Intravenous (IV) Fluid Administration	ther01A	Infusion of normal saline or Ringer’s lactate	therapeutic	internal_medicine	40	0	35	t	f	f	f	f	PROC-THER01A	0	f	60	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j44008blwf4igrrcrpp	Intramuscular Injection	ther02A	Single IM drug administration	therapeutic	internal_medicine	15	0	12	t	f	f	f	f	PROC-THER02A	0	f	5	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j44008clwf4jp4dvt4l	Subcutaneous Injection	ther03A	SC drug administration (e.g., insulin)	therapeutic	internal_medicine	12	0	10	t	f	f	f	f	PROC-THER03A	0	f	5	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j44008dlwf4q2ozi0ud	Nebulization Therapy	ther04A	Bronchodilator delivery for asthma/COPD	therapeutic	internal_medicine	25	0	22	t	f	f	f	f	PROC-THER04A	0	f	15	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j44008elwf45sofhje3	Vaccination, Routine (e.g., Tetanus, Measles)	ped01A	Administering EPI or catch-up vaccine	pediatric	pediatrics	10	0	8	t	f	f	f	f	PROC-PED01A	0	f	5	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008flwf4sz5ymbqa	Growth Monitoring (Under-5)	ped02A	Weight, height, and MUAC measurement	pediatric	pediatrics	5	0	4	t	f	f	f	f	PROC-PED02A	0	f	10	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008glwf4suyo7qis	Circumcision, Neonatal	ped03A	Ritual or medical male circumcision in infants	pediatric	pediatrics	50	0	40	t	f	f	f	f	PROC-PED03A	0	f	20	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008hlwf4f0l87i12	Excision of Sebaceous Cyst	surg05A	Removal of benign skin cyst	surgical	surgery	200	0	170	t	f	f	f	f	PROC-SURG05A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008ilwf4ib37zdhj	Reduction of Dislocated Shoulder	surg06A	Closed reduction of glenohumeral joint	surgical	surgery	300	0	260	t	f	f	f	f	PROC-SURG06A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008jlwf4j97u1e01	Cast Application, Arm	surg07A	Plaster immobilization for fracture	surgical	surgery	180	0	150	t	f	f	f	f	PROC-SURG07A	0	f	45	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008klwf4ms38kzuj	Cast Application, Leg	surg07B	Plaster immobilization for tibia/fibula fracture	surgical	surgery	220	0	190	t	f	f	f	f	PROC-SURG07B	0	f	60	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008llwf46ue2mnwi	Removal of Skin Tag	surg08A	Excision or cauterization of acrochordon	surgical	surgery	100	0	85	t	f	f	f	f	PROC-SURG08A	0	f	15	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008mlwf4kypdz5ed	Incision and Drainage of Bartholin’s Abscess	obgy08A	Drainage of vulvar gland abscess	obstetric	obstetrics	350	0	300	t	f	f	f	f	PROC-OBGY08A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008nlwf4skpkzgqg	Pap Smear (Cervical Cytology)	obgy09A	Screening for cervical cancer	diagnostic	obstetrics	60	0	50	t	f	f	f	f	PROC-OBGY09A	0	f	10	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008olwf4qxfhhhpy	Antenatal Ultrasound (Dating Scan)	obgy10A	First-trimester fetal viability scan	diagnostic	obstetrics	90	0	75	t	f	f	f	f	PROC-OBGY10A	0	f	20	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j45008plwf4z35z8jl8	Fetal Doppler Heart Rate Check	obgy11A	Monitoring fetal heartbeat in pregnancy	diagnostic	obstetrics	20	0	18	t	f	f	f	f	PROC-OBGY11A	0	f	5	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j46008qlwf4hff3sjq3	Removal of Foreign Body from Eye	ophth02A	Superficial corneal or conjunctival FB removal	ophthalmic	ophthalmology	80	0	70	t	f	f	f	f	PROC-OPHTH02A	0	f	15	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j46008rlwf4gl0zi1ln	Eye Examination, Comprehensive	ophth03A	Visual acuity, refraction, and fundoscopy	diagnostic	ophthalmology	50	0	42	t	f	f	f	f	PROC-OPHTH03A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j46008slwf4woicw60v	Scaling and Polishing (Dental Cleaning)	dent03A	Professional teeth cleaning	dental	dental	70	0	60	t	f	f	f	f	PROC-DENT03A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j46008tlwf4ym7nuhed	Root Canal Treatment, Single Canal	dent04A	Endodontic therapy for infected pulp	dental	dental	250	0	220	t	f	f	f	f	PROC-DENT04A	0	f	60	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j46008ulwf4c9hpsjzz	Blood Typing and Crossmatch	lab08A	Pre-transfusion compatibility testing	diagnostic	laboratory	45	0	40	t	f	f	f	f	PROC-LAB08A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j46008vlwf4i34f1bud	Stool Microscopy for Ova and Parasites	lab09A	Detection of intestinal parasites	diagnostic	laboratory	30	0	26	t	f	f	f	f	PROC-LAB09A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j46008wlwf4xfgo7lj4	Widal Test (Typhoid Serology)	lab10A	Serological test for Salmonella typhi	diagnostic	laboratory	40	0	35	t	f	f	f	f	PROC-LAB10A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j47008xlwf4n5nhoc6b	HbA1c Test	lab11A	Glycated hemoglobin for diabetes monitoring	diagnostic	laboratory	60	0	50	t	f	f	f	f	PROC-LAB11A	0	f	30	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
cmi620j47008ylwf4xa4chy6w	ECG (Electrocardiogram)	rad04A	Recording of heart electrical activity	diagnostic	radiology	50	0	42	t	f	f	f	f	PROC-RAD04A	0	f	15	2025-11-19 13:44:33.217	2025-11-19 13:44:33.217
\.


--
-- Data for Name: Scan; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Scan" (id, "attendanceId", "templateId", "scanType", description, "bodyPart", status, "requestedAt", "completedAt", result, findings, impression, "performedById", "verifiedById", "imageUrls", "createdById", priority, "createdAt", "updatedAt") FROM stdin;
cmi620sog00v4lwf420f70df4	cmi620oog00uelwf450ps58ln	cmi620j980098lwf4ibczpli0	Chest X-Ray	Chest X-ray to rule out pneumonia in malaria case	chest	completed	2025-11-19 13:44:45.617	2025-11-19 13:44:45.8	\N	Clear lung fields, normal cardiac silhouette	No active cardiopulmonary disease	cmi620n7o00u6lwf4jozu9beu	\N	{/uploads/scans/chest-xray-malaria-001.jpg}	cmi620m0u00u1lwf4uyccj1bv	routine	2025-11-19 13:44:45.617	2025-11-19 13:44:45.801
\.


--
-- Data for Name: ScanTemplate; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."ScanTemplate" (id, name, "investigationCode", "scanCode", description, category, "bodyPart", "cashPrice", "nhisPrice", "insurancePrice", "isNHISCovered", "isPrivateInsExempted", "nhisRequiresAuth", "privateInsRequiresAuth", "isPending", "tariffCode", "vatRate", "isTaxable", "preparationInstructions", duration, "contrastRequired", "scanType", "createdAt", "updatedAt") FROM stdin;
cmi620j980098lwf4ibczpli0	Chest X-ray	XRAY-CHEST-01	scan01x	Plain radiograph of the chest	xray	chest	100	0	85	t	f	f	f	f	SCAN-SCAN01X	0	f	Remove metal objects and jewelry	10	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j980099lwf4dva17947	Abdominal Ultrasound	SCAN-INV-1763559873394-1	scan02u	Ultrasound imaging of abdominal organs	ultrasound	abdomen	95	0	80	t	f	f	f	f	TARIFF-SCAN-1763559873394-1	0	f	Fasting for 6 hours required	30	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j98009alwf4b5wj4p0w	Pelvic Ultrasound (Transabdominal)	SCAN-INV-1763559873394-2	scan03u	Ultrasound of uterus and ovaries via abdomen	ultrasound	pelvis	85	0	70	t	f	f	f	f	TARIFF-SCAN-1763559873394-2	0	f	Full bladder required – drink 1L water 1 hour before	20	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j98009blwf4dumli5i2	Obstetric Ultrasound (Dating Scan)	SCAN-INV-1763559873394-3	scan04u	First-trimester fetal viability and dating	ultrasound	pelvis	90	0	75	t	f	f	f	f	TARIFF-SCAN-1763559873394-3	0	f	Full bladder preferred	25	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j98009clwf4gkwjyofu	Renal Ultrasound	SCAN-INV-1763559873394-4	scan05u	Imaging of kidneys and bladder	ultrasound	abdomen	80	0	68	t	f	f	f	f	TARIFF-SCAN-1763559873394-4	0	f	Full bladder required	20	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j99009dlwf4zcyt5b3o	X-ray, Skull (AP/Lateral)	XRAY-SKULL-01	scan06x	Radiograph of skull bones	xray	head	90	0	75	t	f	f	f	f	SCAN-SCAN06X	0	f	Remove hairpins and metal	10	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j99009elwf403gjgmfp	X-ray, Abdomen (Supine)	XRAY-ABDOMEN-01	scan07x	Plain abdominal X-ray for obstruction or calcifications	xray	abdomen	95	0	80	t	f	f	f	f	SCAN-SCAN07X	0	f	No special preparation	10	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j99009flwf4bzyvtw80	X-ray, Lumbar Spine	XRAY-SPINE-01	scan08x	Radiograph of lower back vertebrae	xray	spine	110	0	90	t	f	f	f	f	SCAN-SCAN08X	0	f	Remove belts and metal	15	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j99009glwf4p2qit2sg	X-ray, Cervical Spine	XRAY-SPINE-02	scan09x	Radiograph of neck vertebrae	xray	spine	105	0	88	t	f	f	f	f	SCAN-SCAN09X	0	f	Remove necklaces and collars	12	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j99009hlwf4hetebrwr	X-ray, Femur	XRAY-EXTREMITY-01	scan10x	Radiograph of thigh bone	xray	extremities	85	0	70	t	f	f	f	f	SCAN-SCAN10X	0	f	Remove clothing over area	10	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j99009ilwf4vfg9om7i	X-ray, Tibia/Fibula	XRAY-EXTREMITY-02	scan11x	Radiograph of lower leg bones	xray	extremities	80	0	68	t	f	f	f	f	SCAN-SCAN11X	0	f	Remove footwear and socks	10	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j99009jlwf4bqultc9h	X-ray, Ankle	XRAY-EXTREMITY-03	scan12x	Radiograph of ankle joint	xray	extremities	75	0	65	t	f	f	f	f	SCAN-SCAN12X	0	f	Remove shoes and socks	10	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j99009klwf4582eldc1	X-ray, Shoulder	XRAY-EXTREMITY-04	scan13x	Radiograph of shoulder joint	xray	extremities	80	0	68	t	f	f	f	f	SCAN-SCAN13X	0	f	Wear sleeveless top or remove shirt	10	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j99009llwf4xegr88ic	X-ray, Hand	XRAY-EXTREMITY-05	scan14x	Radiograph of hand bones	xray	extremities	70	0	60	t	f	f	f	f	SCAN-SCAN14X	0	f	Remove rings and bracelets	8	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9a009mlwf4j8b8hkum	Mammography (Screening)	MAMMO-SCREEN-01	scan15m	X-ray imaging of breast tissue for cancer screening	mammography	breast	180	0	150	t	f	f	f	f	SCAN-SCAN15M	0	f	Avoid deodorant or powder on day of exam	20	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9a009nlwf47ch7m9p3	Thyroid Ultrasound	SCAN-INV-1763559873395-15	scan16u	Ultrasound of thyroid gland	ultrasound	neck	85	0	70	t	f	f	f	f	TARIFF-SCAN-1763559873395-15	0	f	No special preparation	15	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9a009olwf4c9krelzh	Scrotal Ultrasound	SCAN-INV-1763559873395-16	scan17u	Ultrasound of testes and scrotum	ultrasound	pelvis	90	0	75	t	f	f	f	f	TARIFF-SCAN-1763559873395-16	0	f	No special preparation	20	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9a009plwf4hqpex00m	X-ray, Pelvis	XRAY-PELVIS-01	scan18x	Radiograph of pelvic bones	xray	pelvis	95	0	80	t	f	f	f	f	SCAN-SCAN18X	0	f	Remove metal objects and clothing below waist	10	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9a009qlwf4m97jp7z8	X-ray, Ribs	XRAY-CHEST-02	scan19x	Radiograph to assess rib fractures	xray	chest	90	0	75	t	f	f	f	f	SCAN-SCAN19X	0	f	Remove upper body clothing	12	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9a009rlwf4zd594ndp	Barium Swallow (Fluoroscopy)	FLUORO-SWALLOW-01	scan20f	Real-time X-ray of swallowing with contrast	fluoroscopy	chest	250	0	210	t	f	f	f	f	SCAN-SCAN20F	0	f	Fasting for 6 hours; inform if pregnant	30	t	contrast	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9a009slwf4npnmae7z	Intravenous Urogram (IVU)	XRAY-IVU-01	scan21x	X-ray of kidneys, ureters, and bladder with contrast	xray	abdomen	300	0	250	t	f	f	f	f	SCAN-SCAN21X	0	f	Fasting for 4 hours; laxative may be given	60	t	contrast	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9a009tlwf4kaewhm2h	Hysterosalpingogram (HSG)	XRAY-HSG-01	scan22x	X-ray of uterus and fallopian tubes with contrast	xray	pelvis	280	0	230	t	f	f	f	f	SCAN-SCAN22X	0	f	Schedule between days 7–10 of cycle; antibiotics may be prescribed	30	t	contrast	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9b009ulwf4h9tvm7yu	CT Scan, Head (Plain)	CT-HEAD-01	scan23c	Cross-sectional imaging of brain	ct_scan	head	450	0	380	t	f	f	f	f	SCAN-SCAN23C	0	f	Remove all metal from head/neck	15	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9b009vlwf4s86zlai0	CT Scan, Abdomen (With Contrast)	CT-ABDOMEN-01	scan24c	Detailed imaging of abdominal organs with contrast	ct_scan	abdomen	600	0	500	t	f	f	f	f	SCAN-SCAN24C	0	f	Fasting for 4–6 hours; IV access required	25	t	contrast	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9b009wlwf44mspmpht	CT Scan, Chest (Plain)	CT-CHEST-01	scan25c	High-resolution imaging of lungs and mediastinum	ct_scan	chest	500	0	420	t	f	f	f	f	SCAN-SCAN25C	0	f	Remove upper body metal	20	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9b009xlwf49mg5k0wv	X-ray, Sinuses	XRAY-SINUS-01	scan26x	Radiograph of paranasal sinuses	xray	head	85	0	70	t	f	f	f	f	SCAN-SCAN26X	0	f	No special preparation	10	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9b009ylwf4id4v958d	Breast Ultrasound	SCAN-INV-1763559873395-26	scan27u	Ultrasound evaluation of breast lumps	ultrasound	breast	100	0	85	t	f	f	f	f	SCAN-SCAN27U	0	f	No special preparation	20	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9b009zlwf4lqrmolso	Doppler Ultrasound, Lower Limb Veins	SCAN-INV-1763559873395-27	scan28u	Assessment of deep vein thrombosis (DVT)	ultrasound	extremities	150	0	125	t	f	f	f	f	TARIFF-SCAN-1763559873395-27	0	f	Wear loose clothing; no lotions on legs	40	f	doppler	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9c00a0lwf4w1o6dfqt	Doppler Ultrasound, Carotid Arteries	SCAN-INV-1763559873395-28	scan29u	Evaluation of neck artery stenosis	ultrasound	neck	160	0	135	t	f	f	f	f	TARIFF-SCAN-1763559873395-28	0	f	No special preparation	30	f	doppler	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
cmi620j9c00a1lwf4vqkxcpx3	X-ray, Wrist	XRAY-EXTREMITY-06	scan30x	Radiograph of wrist joint	xray	extremities	70	0	60	t	f	f	f	f	SCAN-SCAN30X	0	f	Remove bracelets and watches	8	f	plain	2025-11-19 13:44:33.403	2025-11-19 13:44:33.403
\.


--
-- Data for Name: ServiceCatalog; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."ServiceCatalog" (id, name, code, description, "serviceCategory", "serviceType", "cashPrice", "nhisPrice", "insurancePrice", "nhisServiceCode", "isNHISCovered", "tariffCode", "nhisCoverageType", "nhisRequiresAuth", "privateInsRequiresAuth", "isPrivateInsuranceExempted", unit, "isPending", "requiresClinicalNotes", "vatRate", "isTaxable", "diagnosisId", "labTestTemplateId", "procedureTemplateId", "stockItemId", "wardId", "scanTemplateId", "createdById", "createdAt", "updatedAt") FROM stdin;
cmi620kii00t9lwf46ck0wfdv	General Outpatient Consultation	CONS-GEN	\N	opd	consultation	100	0	0	OPD001	t	\N	full	f	f	f	Each	f	f	0	f	\N	\N	\N	\N	\N	\N	cmi4w23pn0000lwdloibukura	2025-11-19 13:44:35.034	2025-11-19 13:44:35.034
cmi620kii00talwf480ca3r3w	Antenatal Care Visit (1st)	ANC-01	\N	opd	consultation	40	0	0	ANC001	t	\N	full	f	f	f	Each	f	f	0	f	\N	\N	\N	\N	\N	\N	cmi4w23pn0000lwdloibukura	2025-11-19 13:44:35.034	2025-11-19 13:44:35.034
cmi620kii00tblwf45gxoc7vd	Specialist Consultation	CONS-SPEC	\N	opd	consultation	200	10	10	OPD002	t	\N	full	f	f	f	Each	f	f	0	f	\N	\N	\N	\N	\N	\N	cmi4w23pn0000lwdloibukura	2025-11-19 13:44:35.034	2025-11-19 13:44:35.034
\.


--
-- Data for Name: ServiceRendered; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."ServiceRendered" (id, "attendanceId", "serviceItemId", quantity, date, "performedById", notes, "createdAt") FROM stdin;
cmi620oog00uilwf4dv7q8mc6	cmi620oog00uelwf450ps58ln	cmi620kii00t9lwf46ck0wfdv	1	2025-11-19 13:44:40.431	cmi620m0u00u1lwf4uyccj1bv	\N	2025-11-19 13:44:40.431
\.


--
-- Data for Name: StockItem; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."StockItem" (id, name, category, description, strength, "unitOfMeasure", "drugCode", "reorderLevel", "currentStock", "costPrice", "cashPrice", "nhisPrice", "insurancePrice", "isNHISCovered", "isPrivateInsExempted", "nhisRequiresAuth", "privateInsRequiresAuth", supplier, "expiryDate", "batchNumber", "isPending", "tariffCode", "vatRate", "isTaxable", "isMedication", "createdAt", "updatedAt") FROM stdin;
cmi620jno00a2lwf4qyvzvz1e	Vitamin C Tablet, 500mg	Vitamin Supplement	Immune support and antioxidant protection	500mg	tablet	VITC-5001	50	200	5	10	0	0.5	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM4	f	VITC-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jno00a3lwf458j076vy	Multivitamin Tablet (A-Z)	Vitamin Supplement	Daily nutritional supplement for overall health	Multivitamin	tablet	MULTIVIT1	50	200	5	10	0	1.2	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM4	f	MULTIVIT1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jno00a4lwf42teqytq3	Calcium Carbonate Tablet, 500mg	Mineral Supplement	Bone health and calcium deficiency treatment	500mg	tablet	CALC-CARB1	50	200	5	10	0	0.8	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM4	f	CALC-CARB1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnp00a5lwf4b97aa4xs	Zinc Sulfate Tablet, 20mg	Mineral Supplement	Zinc deficiency and immune support	20mg	tablet	ZINC-SULF1	50	200	5	10	0	0.4	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM4	f	ZINC-SULF1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnp00a6lwf4zjr7w5bu	Vitamin D3 Capsule, 1000IU	Vitamin Supplement	Bone health and calcium absorption	1000IU	capsule	VITD3-1K1	50	200	5	10	0	1.5	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	VITD3-1K1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnp00a7lwf49vnu8iiw	Omega-3 Fish Oil Capsule, 1000mg	Nutritional Supplement	Heart health and anti-inflammatory support	1000mg	capsule	OMEGA3-1K1	50	200	5	10	0	2	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	OMEGA3-1K1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnp00a8lwf466ohfw24	Probiotics Capsule, 10 Billion CFU	Probiotic Supplement	Gut health and digestive support	10 Billion CFU	capsule	PROBIO-10B1	50	200	5	10	0	3.5	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	PROBIO-10B1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnp00a9lwf4tz9ag2dh	L-Lysine Tablet, 500mg	Amino Acid Supplement	Cold sore prevention and immune support	500mg	tablet	L-LYS-5001	50	200	5	10	0	0.7	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	L-LYS-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnp00aalwf4p0x01bou	Coenzyme Q10 Capsule, 100mg	Antioxidant Supplement	Energy production and heart health support	100mg	capsule	COQ10-1001	50	200	5	10	0	4	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	COQ10-1001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnp00ablwf4adtxt4t1	Ginkgo Biloba Extract Tablet, 120mg	Herbal Supplement	Cognitive function and circulation support	120mg	tablet	GINK-1201	50	200	5	10	0	2.5	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	GINK-1201	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnp00aclwf4s1fn4gqe	Milk Thistle Capsule, 150mg	Herbal Supplement	Liver health and detoxification support	150mg	capsule	MILKTH-1501	50	200	5	10	0	1.8	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	MILKTH-1501	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnq00adlwf40vbc21ux	Turmeric Capsule, 500mg	Herbal Supplement	Anti-inflammatory and antioxidant support	500mg	capsule	TURM-5001	50	200	5	10	0	1	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	TURM-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnq00aelwf4h9haglnw	Echinacea Tablet, 400mg	Herbal Supplement	Immune system boost and cold prevention	400mg	tablet	ECHIN-4001	50	200	5	10	0	1.2	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	ECHIN-4001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnq00aflwf44lbw2rgo	Garlic Capsule, 500mg	Herbal Supplement	Cardiovascular health and immune support	500mg	capsule	GARLIC-5001	50	200	5	10	0	0.9	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	GARLIC-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnq00aglwf4fp3p3oap	Biotin Tablet, 5000mcg	Vitamin Supplement	Hair, skin, and nail health support	5000mcg	tablet	BIOTIN-5K1	50	200	5	10	0	0.6	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	BIOTIN-5K1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnq00ahlwf43wcecih1	Collagen Powder, 10g	Nutritional Supplement	Joint and skin health support	10g	sachet	COLLAGEN-10G1	50	200	5	10	0	5	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	COLLAGEN-10G1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnq00ailwf4668hxw86	L-Carnitine Liquid, 1000mg/10ml	Amino Acid Supplement	Energy and fat metabolism support	1000mg/10ml	bottle	L-CARN-1K1	50	200	5	10	0	8	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	L-CARN-1K1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnq00ajlwf4zisvt0ns	Melatonin Tablet, 3mg	Sleep Aid	Sleep regulation and jet lag relief	3mg	tablet	MELAT-3MG1	50	200	5	10	0	1.1	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	MELAT-3MG1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnq00aklwf4xfzods68	5-HTP Capsule, 100mg	Mood Supplement	Mood and sleep support	100mg	capsule	5HTP-1001	50	200	5	10	0	2.2	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	5HTP-1001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnr00allwf49ub5uqo7	Ashwagandha Capsule, 500mg	Herbal Supplement	Stress reduction and energy boost	500mg	capsule	ASHW-5001	50	200	5	10	0	3	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	ASHW-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnr00amlwf452c8bvw7	Valerian Root Capsule, 500mg	Herbal Supplement	Natural sleep aid and anxiety relief	500mg	capsule	VALER-5001	50	200	5	10	0	1.5	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	VALER-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnr00anlwf4tyougowv	St. John's Wort Capsule, 300mg	Herbal Supplement	Mild depression and mood support	300mg	capsule	STJW-3001	50	200	5	10	0	2.8	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	STJW-3001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnr00aolwf4egf3rdzt	Glucosamine Chondroitin Tablet, 1500mg	Joint Supplement	Joint health and arthritis support	1500mg	tablet	GLUC-CHON1	50	200	5	10	0	4.5	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	GLUC-CHON1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnr00aplwf4tzkifm6j	MSM (Methylsulfonylmethane) Powder, 1000mg	Joint Supplement	Joint pain relief and anti-inflammatory	1000mg	powder	MSM-1K1	50	200	5	10	0	6	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	MSM-1K1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnr00aqlwf4k5tjivsc	Hyaluronic Acid Capsule, 100mg	Joint Supplement	Joint lubrication and skin hydration	100mg	capsule	HYAL-1001	50	200	5	10	0	3.2	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	HYAL-1001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnr00arlwf4cxhjuiqt	L-Theanine Tablet, 200mg	Mood Supplement	Stress reduction and focus enhancement	200mg	tablet	L-THEAN1	50	200	5	10	0	2.1	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	L-THEAN1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnr00aslwf43cpce0mb	Rhodiola Rosea Capsule, 500mg	Adaptogen Supplement	Stress adaptation and energy support	500mg	capsule	RHOD-5001	50	200	5	10	0	4.2	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	RHOD-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jns00atlwf4sbulhces	Panax Ginseng Capsule, 500mg	Herbal Supplement	Energy, cognitive function, and immune support	500mg	capsule	GINS-5001	50	200	5	10	0	2.8	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	GINS-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jns00aulwf4cx8iqfub	Maca Root Powder, 500mg	Herbal Supplement	Hormonal balance and energy boost	500mg	powder	MACA-5001	50	200	5	10	0	3.5	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	MACA-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jns00avlwf44d2o2l00	Saw Palmetto Capsule, 320mg	Herbal Supplement	Prostate health and urinary support	320mg	capsule	SAWPAL-3201	50	200	5	10	0	2.9	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	SAWPAL-3201	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jns00awlwf41gjm4xki	Cranberry Extract Capsule, 500mg	Urinary Health Supplement	Urinary tract infection prevention	500mg	capsule	CRAN-5001	50	200	5	10	0	1.6	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	CRAN-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jns00axlwf4b3cry763	Prostate Support Tablet, 500mg	Men's Health Supplement	Prostate health and urinary flow support	500mg	tablet	PROST-SUP1	50	200	5	10	0	4.8	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	PROST-SUP1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnt00aylwf404vuy1qj	Evening Primrose Oil Capsule, 1300mg	Women's Health Supplement	Hormonal balance and PMS relief	1300mg	capsule	EPO-13001	50	200	5	10	0	3.8	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	EPO-13001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnt00azlwf4ql0gjmuk	Iron Bisglycinate Capsule, 25mg	Iron Supplement	Gentle iron for anemia prevention	25mg	capsule	IRON-BIS1	50	200	5	10	0	0.95	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	IRON-BIS1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnt00b0lwf44500uket	Vitamin B12 Tablet, 1000mcg	Vitamin Supplement	B12 deficiency and energy support	1000mcg	tablet	VITB12-1K1	50	200	5	10	0	0.55	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	VITB12-1K1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnt00b1lwf4feamfvs1	Vitamin E Capsule, 400IU	Vitamin Supplement	Antioxidant and skin health support	400IU	capsule	VITE-4001	50	200	5	10	0	0.75	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	VITE-4001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnt00b2lwf4zsmslr4k	Selenium Tablet, 200mcg	Mineral Supplement	Antioxidant and thyroid health support	200mcg	tablet	SELEN-2001	50	200	5	10	0	0.65	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	SELEN-2001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnt00b3lwf4wy00ji2u	Chromium Picolinate Tablet, 200mcg	Mineral Supplement	Blood sugar regulation and metabolism support	200mcg	tablet	CHROM-2001	50	200	5	10	0	0.85	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	CHROM-2001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnt00b4lwf4hdvqob60	Potassium Citrate Tablet, 99mg	Mineral Supplement	Urinary alkalization and kidney stone prevention	99mg	tablet	POT-CIT1	50	200	5	10	0	1.05	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	POT-CIT1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnt00b5lwf4gcoan2pz	Lutein Tablet, 20mg	Eye Health Supplement	Macular health and blue light protection	20mg	tablet	LUT-20MG1	50	200	5	10	0	2.3	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	LUT-20MG1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnu00b6lwf4ox20nxy6	Bilberry Extract Capsule, 160mg	Eye Health Supplement	Vision support and antioxidant for eyes	160mg	capsule	BILB-1601	50	200	5	10	0	3.1	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	BILB-1601	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnu00b7lwf4sfx0xyfo	Lutein + Zeaxanthin Capsule, 20mg/4mg	Eye Health Supplement	Macular pigment protection and eye health	20mg/4mg	capsule	LUT-ZEA1	50	200	5	10	0	2.9	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	LUT-ZEA1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnu00b8lwf4yca119kz	Alpha Lipoic Acid Capsule, 600mg	Antioxidant Supplement	Neuropathy and blood sugar support	600mg	capsule	ALA-6001	50	200	5	10	0	4.5	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	ALA-6001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnu00b9lwf4d50x1rnk	NAC (N-Acetyl Cysteine) Capsule, 600mg	Antioxidant Supplement	Liver detox and respiratory health	600mg	capsule	NAC-6001	50	200	5	10	0	2.7	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	NAC-6001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnu00balwf4sm469g62	Quercetin Tablet, 500mg	Antioxidant Supplement	Allergy relief and immune support	500mg	tablet	QUERC-5001	50	200	5	10	0	1.9	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	QUERC-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnu00bblwf427mmfvhi	Resveratrol Capsule, 250mg	Antioxidant Supplement	Anti-aging and cardiovascular support	250mg	capsule	RESV-2501	50	200	5	10	0	5.2	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	RESV-2501	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnu00bclwf4vtw7z851	Pycnogenol Capsule, 50mg	Antioxidant Supplement	Circulation and skin health support	50mg	capsule	PYCN-501	50	200	5	10	0	6.5	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	PYCN-501	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnv00bdlwf4ub6ctlrv	Grape Seed Extract Capsule, 100mg	Antioxidant Supplement	Vascular health and antioxidant protection	100mg	capsule	GSE-1001	50	200	5	10	0	2.4	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	GSE-1001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnv00belwf48eam0y1n	Pomegranate Extract Capsule, 500mg	Antioxidant Supplement	Heart health and antioxidant support	500mg	capsule	POME-5001	50	200	5	10	0	3	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	POME-5001	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnv00bflwf4v6xyxq6i	Green Tea Extract Capsule, 500mg	Antioxidant Supplement	Weight management and antioxidant protection	500mg	capsule	GREEN-TEA1	50	200	5	10	0	1.8	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	GREEN-TEA1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnv00bglwf43avigf42	Cranberry + D-Mannose Capsule, 500mg	Urinary Health Supplement	UTI prevention and bladder health	500mg	capsule	CRAN-DMAN1	50	200	5	10	0	2.2	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	CRAN-DMAN1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnv00bhlwf4cjekuicp	D-Mannose Powder, 900mg	Urinary Health Supplement	Bladder infection prevention	900mg	powder	D-MANN1	50	200	5	10	0	4	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	D-MANN1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnv00bilwf4i5nb0y9e	Paracetamol Infusion, 1g/100mL	Analgesic	Intravenous pain relief and fever reduction in hospital settings	1g/100mL	bottle	PARA-INF1	50	200	5	10	0	25	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	PARA-INF1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnv00bjlwf4yh7kd8ev	Immunocin Capsules	Vitamin Supplement	Daily nutritional supplement for overall health	Multivitamin	tablet	IMMUNCAP1	50	200	5	10	0	1.2	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	IMMUNCAP1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnv00bklwf4b6j4g9mg	Magnesium Oxide Tablet, 400mg	Mineral Supplement	Magnesium deficiency and laxative use	400mg	tablet	MAG-OX1	50	200	5	10	0	0.9	t	f	f	f	Private Pharmacy	\N	BATCH-MI620JM5	f	MAG-OX1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnw00bllwf4qzjbw127	Nifedipine Tablet 10mg	medication	Calcium channel blocker for hypertension	10mg	tablet	NIFED-TAB-10	60	200	5	10	0	0.45	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-NIFED1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnw00bmlwf4bzh6dezo	Nifedipine Tablet 20mg	medication	Calcium channel blocker retard	20mg	tablet	NIFED-TAB-20	50	180	5	10	0	0.7	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-NIFED2	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnw00bnlwf4p7ijhv4t	Propranolol Tablet 40mg	medication	Beta-blocker for hypertension and migraine	40mg	tablet	PROPRAN-TAB-40	65	220	5	10	0	0.35	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-PROPR1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnw00bolwf4lsumwmkv	Spironolactone Tablet 25mg	medication	Potassium-sparing diuretic	25mg	tablet	SPIRO-TAB-25	45	150	5	10	0	0.5	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-SPIRO1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnw00bplwf4egirrcuu	Furosemide Tablet 40mg	medication	Loop diuretic for edema	40mg	tablet	FURO-TAB-40	55	190	5	10	0	0.3	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-FURO1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnw00bqlwf4kf87nzkj	Furosemide Injection 20mg/2ml	medication	Loop diuretic injection	20mg/2ml	ampoule	FURO-INJ-20	25	70	5	10	0	3.15	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-FURO2	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnw00brlwf4yb6w1zv2	Digoxin Tablet 0.25mg	medication	Cardiac glycoside for heart failure	0.25mg	tablet	DIGOX-TAB-0.25	40	120	5	10	0	0.45	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-DIGOX1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnx00bslwf46jjq8nym	Nitroglycerin Tablet 0.5mg	medication	Vasodilator for angina	0.5mg	tablet	NITRO-TAB-0.5	35	100	5	10	0	0.9	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-NITRO1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnx00btlwf4tt16rxbb	Isosorbide Dinitrate Tablet 10mg	medication	Vasodilator for angina prophylaxis	10mg	tablet	ISOSORB-TAB-10	30	90	5	10	0	0.6	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-ISOS1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnx00bulwf42xr4ptb8	Clopidogrel Tablet 75mg	medication	Antiplatelet for cardiovascular protection	75mg	tablet	CLOPID-TAB-75	80	300	5	10	0	2.3	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-CLOPID1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnx00bvlwf477923i17	Lisinopril Tablet 5mg	medication	ACE inhibitor for hypertension	5mg	tablet	LISINO-TAB-5	70	250	5	10	0	0.8	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-LISINO1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnx00bwlwf4cwutwkk0	Lisinopril Tablet 10mg	medication	ACE inhibitor for hypertension	10mg	tablet	LISINO-TAB-10	60	200	5	10	0	1.2	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-LISINO2	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnx00bxlwf4gw3v6nyo	Valsartan Tablet 80mg	medication	Angiotensin II receptor blocker	80mg	tablet	VALSAR-TAB-80	55	180	5	10	0	1.8	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-VALS1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnx00bylwf4whrrur1h	Hydrochlorothiazide Tablet 12.5mg	medication	Thiazide diuretic	12.5mg	tablet	HCTZ-TAB-12.5	65	220	5	10	0	0.25	t	f	f	f	CardioCare Ltd	\N	BATCH-MI620JM5	f	MED-HCTZ1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnx00bzlwf40fy892xs	Ranitidine Tablet 150mg	medication	H2 blocker for acid reflux	150mg	tablet	RANIT-TAB-150	85	320	5	10	0	0.5	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM5	f	MED-RANIT1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jny00c0lwf4g4roev2r	Ranitidine Tablet 300mg	medication	H2 blocker for acid reflux	300mg	tablet	RANIT-TAB-300	70	250	5	10	0	0.9	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM5	f	MED-RANIT2	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jny00c1lwf414o9ht6a	Cimetidine Tablet 400mg	medication	H2 blocker for ulcers	400mg	tablet	CIMET-TAB-400	60	200	5	10	0	0.45	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM5	f	MED-CIMET1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jny00c2lwf4luu9x85m	Famotidine Tablet 20mg	medication	H2 blocker for acid control	20mg	tablet	FAMOT-TAB-20	75	280	5	10	0	0.6	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM5	f	MED-FAMOT1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jny00c3lwf47ciykvik	Famotidine Tablet 40mg	medication	H2 blocker for acid control	40mg	tablet	FAMOT-TAB-40	65	220	5	10	0	0.99	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM5	f	MED-FAMOT2	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jny00c4lwf4rmu6hue2	Esomeprazole Capsule 20mg	medication	Proton pump inhibitor	20mg	capsule	ESOME-CAP-20	55	180	5	10	0	1.6	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM5	f	MED-ESOME1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jny00c5lwf4z0d9kjn3	Esomeprazole Capsule 40mg	medication	Proton pump inhibitor	40mg	capsule	ESOME-CAP-40	45	150	5	10	0	2.3	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM5	f	MED-ESOME2	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jny00c6lwf4z4ragry8	Lansoprazole Capsule 30mg	medication	Proton pump inhibitor	30mg	capsule	LANSO-CAP-30	50	170	5	10	0	1.35	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM5	f	MED-LANSO1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jny00c7lwf4an4tnmsv	Pantoprazole Tablet 40mg	medication	Proton pump inhibitor	40mg	tablet	PANTO-TAB-40	60	200	5	10	0	1.5	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-PANTO1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnz00c8lwf41vn0sphn	Metoclopramide Tablet 10mg	medication	Antiemetic for nausea and vomiting	10mg	tablet	METOCLO-TAB-10	65	220	5	10	0	0.3	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-METOC1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnz00c9lwf4j1wde17p	Metoclopramide Injection 10mg/2ml	medication	Antiemetic injection	10mg/2ml	ampoule	METOCLO-INJ-10	30	80	5	10	0	2.25	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-METOC2	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnz00calwf4i3zyeucf	Domperidone Tablet 10mg	medication	Antiemetic and prokinetic	10mg	tablet	DOMPER-TAB-10	70	250	5	10	0	0.45	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-DOMP1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnz00cblwf4rycg7zdp	Ondansetron Tablet 4mg	medication	Antiemetic for chemotherapy nausea	4mg	tablet	ONDAN-TAB-4	40	120	5	10	0	1.2	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-ONDAN1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnz00cclwf427rjqls3	Ondansetron Injection 4mg/2ml	medication	Antiemetic injection	4mg/2ml	ampoule	ONDAN-INJ-4	25	70	5	10	0	4.5	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-ONDAN2	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnz00cdlwf45d0no3kg	Hyoscine Butylbromide Tablet 10mg	medication	Antispasmodic for abdominal cramps	10mg	tablet	HYOSCINE-TAB-10	55	190	5	10	0	0.5	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-HYOS1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnz00celwf4aov9bwd1	Hyoscine Butylbromide Solution 20mg/mL	medication	Antispasmodic injection	20mg/ml	ampoule	HYOSCINE-INJ-20	30	80	5	10	0	3.15	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-HYOS2	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jnz00cflwf4sg7cnv3x	Dicyclomine Tablet 10mg	medication	Antispasmodic for IBS	10mg	tablet	DICYCLO-TAB-10	45	150	5	10	0	0.35	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-DICY1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo000cglwf4kemhqut7	Loperamide Capsule 2mg	medication	Antidiarrheal medication	2mg	capsule	LOPER-CAP-2	80	300	5	10	0	0.3	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-LOPER1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo000chlwf4l0l4pepp	Kaolin Mixture Suspension N/A	medication	Antidiarrheal suspension	N/A	bottle	KAOLIN-MIX-1	35	100	5	10	0	5.4	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-KAOL1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo000cilwf4633e9dw5	Oral Rehydration Salts	medical_supply	WHO formula for dehydration	N/A	sachet	ORS-SACHET	200	800	5	10	0	0.45	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM6	f	SUPP-ORS1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo000cjlwf4b429d4ld	Lactulose Suspension 3.35g/5mL	medication	Osmotic laxative for constipation	3.35g/5ml	bottle	LACTU-SYRUP	40	120	5	10	0	13.5	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-LACTU1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo000cklwf41voi9crp	Bisacodyl Tablet 5mg	medication	Stimulant laxative	5mg	tablet	BISACO-TAB-5	50	170	5	10	0	0.25	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-BISAC1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo000cllwf48mg3822s	Senna Tablet 7.5mg	medication	Herbal laxative	7.5mg	tablet	SENNA-TAB-7.5	60	200	5	10	0	0.15	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-SENNA1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo000cmlwf4gx9l4yua	Psyllium Husk	supplement	Bulk-forming laxative	3.5g	sachet	PSYLLIUM-SACH	45	150	5	10	0	0.9	t	f	f	f	Supplements Ghana	\N	BATCH-MI620JM6	f	SUPP-PSYL1	0	t	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo000cnlwf4pegwepev	Magnesium Hydroxide Suspension 400mg/5mL	medication	Antacid and laxative	400mg/5ml	bottle	MILK-MAGMA	30	90	5	10	0	7.65	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-MILKM1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo100colwf41pax8417	Aluminium Hydroxide Tablet 500mg	medication	Antacid for heartburn	500mg	tablet	ALUHYD-TAB-500	65	220	5	10	0	0.2	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-ALUHY1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo100cplwf48y53t88u	Simethicone Tablet 40mg	medication	Antiflatulent for gas relief	40mg	tablet	SIMETHI-TAB-40	55	190	5	10	0	0.35	t	f	f	f	GI Care Ltd	\N	BATCH-MI620JM6	f	MED-SIMET1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo100cqlwf4v6xpog1d	Charcoal Tablet 250mg	medication	Activated charcoal for poisoning	250mg	tablet	CHARCOAL-TAB-250	25	70	5	10	0	0.45	t	f	f	f	Emergency Meds	\N	BATCH-MI620JM6	f	MED-CHAR1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo100crlwf4dla4o5ou	Prednisolone Tablet 5mg	medication	Corticosteroid for inflammation and allergies	5mg	tablet	PREDNI-TAB-5	60	200	5	10	0	0.3	t	f	f	f	Steroids Pharma	\N	BATCH-MI620JM6	f	MED-PRED1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo100cslwf47bxqkb7b	Dexamethasone Tablet 4mg	medication	Potent corticosteroid for severe inflammation	4mg	tablet	DEXA-TAB-4	45	150	5	10	0	0.45	t	f	f	f	Steroids Pharma	\N	BATCH-MI620JM6	f	MED-DEXA1	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620jo100ctlwf4pl6rnc3r	Dexamethasone Injection 8mg/2ml	medication	Corticosteroid injection	8mg/2ml	ampoule	DEXA-INJ-8	25	70	5	10	0	3.6	t	f	f	f	Steroids Pharma	\N	BATCH-MI620JM6	f	MED-DEXA2	0	f	t	2025-11-19 13:44:33.921	2025-11-19 13:44:33.921
cmi620js800culwf4e4k1vknj	Hydrocortisone Injection 200mg	medication	Corticosteroid injection for emergency	100mg	vial	HYDRO-INJ-200	20	50	5	10	0	9	t	f	f	f	Steroids Pharma	\N	BATCH-MI620JM6	f	MED-HYDRO1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js800cvlwf4uixmq9wn	Cetirizine Tablet 10mg	medication	Antihistamine for allergies	10mg	tablet	CETIRI-TAB-10	120	500	5	10	0	0.25	t	f	f	f	Allergy Care	\N	BATCH-MI620JM6	f	MED-CETI1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js800cwlwf41xjdh764	Loratadine Tablet 10mg	medication	Non-sedating antihistamine	10mg	tablet	LORATA-TAB-10	100	400	5	10	0	0.35	t	f	f	f	Allergy Care	\N	BATCH-MI620JM6	f	MED-LORA1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js800cxlwf4vf1ge8cj	Chlorpheniramine Tablet 4mg	medication	Antihistamine for allergies and cold	4mg	tablet	CHLORPH-TAB-4	150	600	5	10	0	0.12	t	f	f	f	Allergy Care	\N	BATCH-MI620JM6	f	MED-CHLORPH1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js800cylwf4b8zphqsi	Promethazine Tablet 25mg	medication	Antihistamine for allergies and sedation	25mg	tablet	PROMETH-TAB-25	80	300	5	10	0	0.3	t	f	f	f	Allergy Care	\N	BATCH-MI620JM6	f	MED-PROM1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js800czlwf4gpvymk8t	Promethazine Solution 25mg/mL	medication	Antihistamine injection	25mg/ml	ampoule	PROMETH-INJ-25	30	80	5	10	0	2.25	t	f	f	f	Allergy Care	\N	BATCH-MI620JM6	f	MED-PROM2	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js900d0lwf40q94ft2w	Pheniramine Solution 22.5mg/mL	medication	Antihistamine injection	22.5mg/ml	ampoule	PHENIR-INJ-22.5	35	100	5	10	0	1.8	t	f	f	f	Allergy Care	\N	BATCH-MI620JM6	f	MED-PHENIR1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js900d1lwf44gv1f228	Epinephrine Solution 1mg/mL	medication	Emergency treatment for anaphylaxis	1mg/ml	ampoule	EPINEP-INJ-1	20	50	5	10	0	13.5	t	f	f	f	Emergency Meds	\N	BATCH-MI620JM6	f	MED-EPINE1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js900d2lwf49rr01wfr	Aminophylline Tablet 100mg	medication	Bronchodilator for asthma and COPD	100mg	tablet	AMINOPH-TAB-100	40	120	5	10	0	0.5	t	f	f	f	Respiratory Care	\N	BATCH-MI620JM6	f	MED-AMINOP1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js900d3lwf4jiykb2ik	Aminophylline Injection 250mg/10ml	medication	Bronchodilator injection	250mg/10ml	ampoule	AMINOPH-INJ-250	25	70	5	10	0	7.2	t	f	f	f	Respiratory Care	\N	BATCH-MI620JM6	f	MED-AMINOP2	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js900d4lwf4yghbfstn	Theophylline Tablet 200mg	medication	Bronchodilator for asthma	200mg	tablet	THEOPH-TAB-200	35	100	5	10	0	0.6	t	f	f	f	Respiratory Care	\N	BATCH-MI620JM6	f	MED-THEOP1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620js900d5lwf4x1vftptm	Montelukast Tablet 10mg	medication	Leukotriene receptor antagonist for asthma	10mg	tablet	MONTEL-TAB-10	50	180	5	10	0	1.6	t	f	f	f	Respiratory Care	\N	BATCH-MI620JM6	f	MED-MONTE1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsa00d6lwf4ch8lr1ro	Montelukast Tablet 4mg	medication	Pediatric chewable tablet	4mg	tablet	MONTEL-TAB-4	40	120	5	10	0	1.2	t	f	f	f	Respiratory Care	\N	BATCH-MI620JM6	f	MED-MONTE2	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsa00d7lwf4mcwyuex6	Montelukast Sachet 4mg	medication	Pediatric granules	4mg	sachet	MONTEL-SACH-4	30	80	5	10	0	1.4	t	f	f	f	Respiratory Care	\N	BATCH-MI620JM6	f	MED-MONTE3	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsa00d8lwf4dmrjyfo3	Levocetirizine Tablet 5mg	medication	Antihistamine for allergies	5mg	tablet	LEVOCET-TAB-5	70	250	5	10	0	0.5	t	f	f	f	Allergy Care	\N	BATCH-MI620JM6	f	MED-LEVOC1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsa00d9lwf4lx1dimcs	Pseudoephedrine Tablet 60mg	medication	Decongestant for cold and flu	60mg	tablet	PSEUDO-TAB-60	90	350	5	10	0	0.35	t	f	f	f	Cold Care	\N	BATCH-MI620JM6	f	MED-PSEUD1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsa00dalwf4h54exsrs	Guaifenesin Tablet 100mg	medication	Expectorant for cough	100mg	tablet	GUAIFE-TAB-100	80	300	5	10	0	0.2	t	f	f	f	Cold Care	\N	BATCH-MI620JM6	f	MED-GUAIF1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsa00dblwf4775akse0	Ambroxol Tablet 30mg	medication	Mucolytic for productive cough	30mg	tablet	AMBROX-TAB-30	65	220	5	10	0	0.4	t	f	f	f	Cold Care	\N	BATCH-MI620JM6	f	MED-AMBRO1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsb00dclwf41fwdw5tt	Bromhexine Tablet 8mg	medication	Mucolytic for chest congestion	8mg	tablet	BROMHEX-TAB-8	75	280	5	10	0	0.25	t	f	f	f	Cold Care	\N	BATCH-MI620JM6	f	MED-BROMH1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsb00ddlwf4r1l3cvn9	Carbocisteine Capsule 375mg	medication	Mucolytic for respiratory conditions	375mg	capsule	CARBOCIS-CAP-375	55	190	5	10	0	0.5	t	f	f	f	Cold Care	\N	BATCH-MI620JM6	f	MED-CARBOC1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsb00delwf4ezetc22v	Normal Saline 500ml	medication	Intravenous fluid 0.9% sodium chloride	500ml	bag	NS-BAG-500	50	150	5	10	0	4.05	t	f	f	f	IV Fluids Ltd	\N	BATCH-MI620JM6	f	SUPP-NS1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsb00dflwf4lbdz1ixq	Dextrose 5% 500ml	medication	Intravenous fluid 5% dextrose	500ml	bag	D5W-BAG-500	45	140	5	10	0	4.95	t	f	f	f	IV Fluids Ltd	\N	BATCH-MI620JM6	f	SUPP-D5W1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsb00dglwf43rpbdji2	Dextrose Saline	medication	Intravenous fluid dextrose 4.3% in saline	4.3%/0.18%	bag	DS-BAG-500	40	120	5	10	0	5.85	t	f	f	f	IV Fluids Ltd	\N	BATCH-MI620JM6	f	SUPP-DS1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsb00dhlwf4qs4f88yi	Ringer's Lactate 500ml	medication	Intravenous fluid for resuscitation	500ml	bag	RL-BAG-500	35	100	5	10	0	6.75	t	f	f	f	IV Fluids Ltd	\N	BATCH-MI620JM6	f	SUPP-RL1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsb00dilwf4ckbh6nyw	IV Giving Set	consumable	Intravenous infusion set	N/A	piece	IV-SET	100	400	5	10	0	2.7	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM6	f	SUPP-IVSET1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsc00djlwf4gacbrkkv	Syringe 5ml	consumable	Disposable syringe 5ml	5ml	piece	SYRINGE-5ML	200	800	5	10	0	0.45	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM6	f	SUPP-SYR5	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsc00dklwf4plaxoqu2	Syringe 10ml	consumable	Disposable syringe 10ml	10ml	piece	SYRINGE-10ML	150	600	5	10	0	0.63	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM6	f	SUPP-SYR10	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsc00dllwf4zwxkjag3	Needle 21G	consumable	Disposable needle 21 gauge	21G	piece	NEEDLE-21G	180	700	5	10	0	0.27	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM6	f	SUPP-NEED21	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsc00dmlwf4eld9cngc	Needle 23G	consumable	Disposable needle 23 gauge	23G	piece	NEEDLE-23G	160	600	5	10	0	0.23	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM6	f	SUPP-NEED23	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsc00dnlwf4pn9c1ar2	Calamine Lotion Suspension N/A	medication	Topical for itchy skin and rashes	N/A	bottle	CALAMINE-LOT	40	120	5	10	0	5.85	t	f	f	f	Dermatology Care	\N	BATCH-MI620JM6	f	MED-CALAM1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsc00dolwf4obx27k2s	Zinc Oxide Ointment Ointment 20%	medication	Topical for diaper rash and skin protection	20%	tube	ZINC-OINT-20	50	170	5	10	0	4.05	t	f	f	f	Dermatology Care	\N	BATCH-MI620JM6	f	MED-ZINC1	0	f	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsc00dplwf4ewk0eqlz	Povidone Iodine	consumable	Antiseptic solution for wound care	10%	bottle	POVIDONE-SOL	45	140	5	10	0	4.95	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM6	f	SUPP-POVID1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsd00dqlwf4gj28uwox	Hydrogen Peroxide	consumable	Antiseptic solution for wound cleaning	3%	bottle	H2O2-SOL-3	40	120	5	10	0	3.15	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM6	f	SUPP-H2O2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsd00drlwf4g2h2gkqp	Acetazolamide Injection, 500 mg	Diuretic	Carbonic anhydrase inhibitor for glaucoma and altitude sickness	500 mg	ampoule	ACETAZIN1	50	200	5	10	0	17.16	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACETAZIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsd00dslwf48yzi3pq9	Acetazolamide Tablet, 250 mg	Diuretic	Carbonic anhydrase inhibitor for glaucoma and altitude sickness	250 mg	tablet	ACETAZTA1	50	200	5	10	0	0.88	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACETAZTA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsd00dtlwf4c3r47m5f	Acetylcysteine Injection, 200 mg/mL	Injectable	Administered via injection	200 mg	ml	ACETYLIN1	50	200	5	10	0	62.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACETYLIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsd00dulwf40cnzcqyv	Acetylsalicylic Acid Tablet, 300 mg	NSAID	Pain, fever, and antiplatelet	300 mg	tablet	ACETYLTA1	50	200	5	10	0	0.55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACETYLTA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsd00dvlwf4ii7fw64z	Acetylsalicylic Acid Tablet, 75 mg (Dispersible)	NSAID	Pain, fever, and antiplatelet	75 mg	tablet	ACETYLDT1	50	200	5	10	0	0.33	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACETYLDT1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsd00dwlwf4uh4ef5zy	Actinomycin D Injection 0.5 mg Intravenous	Antineoplastic	Chemotherapy for cancer	0.5 mg	vial	ACTINOIN1	50	200	5	10	0	205.57	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACTINOIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jse00dxlwf48tdeu1c4	Activated Charcoal Powder, 50 g	Antidote	Poisoning and overdose management	50 g	g	ACTCHAPO1	50	200	5	10	0	38.55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACTCHAPO1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jse00dylwf467004qk3	Acyclovir Cream, 5%	Antiviral	Herpes simplex and varicella-zoster treatment	5%	g	ACICLOCR1	50	200	5	10	0	38.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACICLOCR1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jse00dzlwf4t0ftoyic	Acyclovir Eye Ointment, 3%	Antiviral	Herpes simplex and varicella-zoster treatment	3%	g	ACICLOEO1	50	200	5	10	0	52.03	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACICLOEO1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jse00e0lwf4b9mgrkaa	Acyclovir Injection, 250 mg vial	Antiviral	Herpes simplex and varicella-zoster treatment	250 mg	vial	ACICLOIN1	50	200	5	10	0	136.13	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACICLOIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jse00e1lwf4qe8wv4si	Acyclovir Suspension, 200 mg/5 mL	Antiviral	Herpes simplex and varicella-zoster treatment	200 mg	ml	ACICLOSU2	50	200	5	10	0	276.91	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACICLOSU2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jse00e2lwf4b5x7fjqy	Acyclovir Tablet, 200 mg	Antiviral	Herpes simplex and varicella-zoster treatment	200 mg	tablet	ACICLOTA1	50	200	5	10	0	1.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ACICLOTA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jse00e3lwf437rzxq8p	Adrenaline Injection, 1 mg/1mL (1:1000)	Emergency Drug	Anaphylaxis and cardiac arrest	1 mg	ml	ADRENAIN1	50	200	5	10	0	7.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ADRENAIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00e4lwf4bmk7v3bm	Adrenaline Injection, 1:10,000	Emergency Drug	Anaphylaxis and cardiac arrest	N/A	vial	ADRENAIN2	50	200	5	10	0	6.55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ADRENAIN2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00e5lwf44p8u0qw0	Adriamycin Injection, 50 mg	Injectable	Administered via injection	50 mg	vial	ADRIAMIN1	50	200	5	10	0	172.59	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ADRIAMIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00e6lwf4o3y625s8	Albendazole Syrup, 100 mg/5 mL	Anthelmintic	Treatment of intestinal worms	100 mg	ml	ALBENDSY1	50	200	5	10	0	4.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ALBENDSY1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00e7lwf4lzi6w3k0	Albendazole Tablet, 200 mg	Anthelmintic	Treatment of intestinal worms	200 mg	tablet	ALBENDTA1	50	200	5	10	0	4.68	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ALBENDTA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00e8lwf4v5zyrstt	Albendazole Tablet, 400 mg	Anthelmintic	Treatment of intestinal worms	400 mg	tablet	ALBENDTA2	50	200	5	10	0	1.17	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ALBENDTA2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00e9lwf4ca7622la	Allopurinol Tablet, 100 mg	Antigout	Gout and hyperuricemia treatment	100 mg	tablet	ALLOPUTA1	50	200	5	10	0	0.94	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ALLOPUTA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00ealwf43phbl8un	Allopurinol Tablet, 300 mg	Antigout	Gout and hyperuricemia treatment	300 mg	tablet	ALLOPUTA2	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ALLOPUTA2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00eblwf4n4378pr5	Amino Acid Solution Injection, 10%	Injectable	Administered via injection	10%	ml	AMIACIIN1	50	200	5	10	0	106	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMIACIIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00eclwf4g9hfrpii	Amino Acid Solution Injection, 20%	Injectable	Administered via injection	20%	ml	AMIACIIN2	50	200	5	10	0	48.05	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMIACIIN2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00edlwf4xbi3wd4z	Aminophylline Injection, 250 mg/10 mL	Injectable	Administered via injection	250 mg	ampoule	AMINOPIN1	50	200	5	10	0	11.55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMINOPIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsf00eelwf49wz7rwa2	Amiodarone Tablet, 200 mg	Oral Solid	Taken by mouth	200 mg	tablet	AMIODATA1	50	200	5	10	0	1.93	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMIODATA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00eflwf4vhjogsgy	Amitriptyline Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	AMITRITA1	50	200	5	10	0	0.66	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMITRITA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00eglwf4tul6yn30	Amitriptyline Tablet, 25 mg	Oral Solid	Taken by mouth	25 mg	tablet	AMITRITA2	50	200	5	10	0	0.18	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMITRITA2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00ehlwf4opm19hvf	Amitriptyline Tablet, 50 mg	Oral Solid	Taken by mouth	50 mg	tablet	AMITRITA3	50	200	5	10	0	0.66	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMITRITA3	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00eilwf4ew09umlw	Amlodipine Tablet, 10 mg	Antihypertensive	Calcium channel blocker for hypertension	10 mg	tablet	AMLODITA2	50	200	5	10	0	0.12	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMLODITA2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00ejlwf4n5tk53h7	Amlodipine Tablet, 5 mg	Antihypertensive	Calcium channel blocker for hypertension	5 mg	tablet	AMLODITA1	50	200	5	10	0	0.11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMLODITA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00eklwf4z86y7gzd	Amodiaquine + Artesunate Granular Powder, 150 mg + 50 mg	Antimalarial	Severe malaria treatment	150 mg	sachet	AMOARTPO2	50	200	5	10	0	5.78	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOARTPO2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00ellwf4bd94lt0u	Amodiaquine + Artesunate Granular Powder, 75 mg + 25 mg	Antimalarial	Severe malaria treatment	75 mg	sachet	AMOARTPO1	50	200	5	10	0	13.97	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOARTPO1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00emlwf4axeyyvbg	Amodiaquine + Artesunate Tablet, 135 mg + 50 mg (12 tabs)	Antimalarial	Severe malaria treatment	135 mg	unit	AMOARTTA2	50	200	5	10	0	5.07	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOARTTA2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00enlwf4uoqg7t75	Amodiaquine + Artesunate Tablet, 135 mg + 50 mg (3's)	Antimalarial	Severe malaria treatment	135 mg	unit	AMOARTTA4	50	200	5	10	0	0.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOARTTA4	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00eolwf4mc2vpp7x	Amodiaquine + Artesunate Tablet, 270 mg + 100 mg (3's)	Antimalarial	Severe malaria treatment	270 mg	unit	AMOARTTA5	50	200	5	10	0	1.28	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOARTTA5	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsg00eplwf45dzsg4jt	Amodiaquine + Artesunate Tablet, 270 mg + 100 mg (6's)	Antimalarial	Severe malaria treatment	270 mg	unit	AMOARTTA6	50	200	5	10	0	2.15	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOARTTA6	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00eqlwf4b9aivccj	Amodiaquine + Artesunate Tablet, 67.5 mg + 25 mg (3's)	Antimalarial	Severe malaria treatment	67.5 mg	unit	AMOARTTA3	50	200	5	10	0	0.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOARTTA3	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00erlwf49q8uzn6p	Amodiaquine + Artesunate Tablet, 67.5 mg + 25 mg (6 tabs)	Antimalarial	Severe malaria treatment	67.5 mg	unit	AMOARTTA1	50	200	5	10	0	5.15	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOARTTA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00eslwf4z2vahnid	Amoxicillin + Clavulanic Acid Injection, 1.2g	Antibiotic	Broad-spectrum penicillin antibiotic	1.2g	vial	COAMOXIN2	50	200	5	10	0	16.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	COAMOXIN2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00etlwf4f8gual37	Amoxicillin + Clavulanic Acid Injection, 500 mg + 100 mg	Antibiotic	Broad-spectrum penicillin antibiotic	500 mg	vial	COAMOXIN1	50	200	5	10	0	18.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	COAMOXIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00eulwf47oaukmhw	Amoxicillin + Clavulanic Acid Suspension, 250 mg + 62 mg	Antibiotic	Broad-spectrum penicillin antibiotic	250 mg	ml	COAMOXSU1	50	200	5	10	0	19.52	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	COAMOXSU1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00evlwf4xjesh182	Amoxicillin + Clavulanic Acid Suspension, 400 mg + 57 mg	Antibiotic	Broad-spectrum penicillin antibiotic	400 mg	ml	COAMOXSU2	50	200	5	10	0	25.86	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	COAMOXSU2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00ewlwf4blq1vmtw	Amoxicillin + Clavulanic Acid Tablet, 500 mg + 125 mg	Antibiotic	Broad-spectrum penicillin antibiotic	500 mg	tablet	COAMOXTA1	50	200	5	10	0	2.31	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	COAMOXTA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00exlwf48m7ddnjj	Amoxicillin + Clavulanic Acid Tablet, 875 mg + 125 mg	Antibiotic	Broad-spectrum penicillin antibiotic	875 mg	tablet	COAMOXTA2	50	200	5	10	0	2.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	COAMOXTA2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00eylwf4y02soma4	Amoxicillin 250 mg, Dispersible Tablet	Antibiotic	Broad-spectrum penicillin antibiotic	250 mg	tablet	AMOXICDT1	50	200	5	10	0	1.87	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOXICDT1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00ezlwf4xc12ywtc	Amoxicillin Capsule, 250 mg	Antibiotic	Broad-spectrum penicillin antibiotic	250 mg	capsule	AMOXICCA1	50	200	5	10	0	0.47	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOXICCA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsh00f0lwf4g3mlvgrd	Amoxicillin Capsule, 500 mg	Antibiotic	Broad-spectrum penicillin antibiotic	500 mg	capsule	AMOXICCA2	50	200	5	10	0	0.83	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOXICCA2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsi00f1lwf4pfrxvgze	Amoxicillin Suspension, 125 mg/5 mL	Antibiotic	Broad-spectrum penicillin antibiotic	125 mg	ml	AMOXICSU1	50	200	5	10	0	16.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMOXICSU1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsi00f2lwf4f01man1c	Ampicillin Injection, 500 mg	Injectable	Administered via injection	500 mg	vial	AMPICIIN1	50	200	5	10	0	3.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AMPICIIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsi00f3lwf40bafgd5v	Anastrozole Tablet, 1 mg	Oral Solid	Taken by mouth	1 mg	tablet	ANASTRTA1	50	200	5	10	0	9.68	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ANASTRTA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsi00f4lwf4wr7e6esy	Anti RH Immunoglobulin Injection, 1500IU /5ml	Injectable	Administered via injection	1500IU	vial	ANIMGLIN1	50	200	5	10	0	827.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ANIMGLIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsi00f5lwf4vqucarwl	Anti Tetanus Serum Injection 1500 IU	Injectable	Administered via injection	1500 IU	vial	ANTESEIN1	50	200	5	10	0	42.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ANTESEIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsi00f6lwf4nobn4650	Aqueous Cream BP	Topical	Applied to skin	N/A	g	AQUEOUCR1	50	200	5	10	0	29.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AQUEOUCR1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsi00f7lwf428nr1412	Artemether + Lumefantrine Suspension, (Powder For Reconstitution) 20 mg + 120 mg / 5 mL	Antimalarial	Treatment of uncomplicated malaria	20 mg	ml	ARTLUMSU1	50	200	5	10	0	25.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTLUMSU1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsi00f8lwf41pawj7ld	Artemether + Lumefantrine Tablet, 20 mg + 120 mg (12's)	Antimalarial	Treatment of uncomplicated malaria	20 mg	unit	ARTLUMTA3	50	200	5	10	0	1.25	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTLUMTA3	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsi00f9lwf4kfylvtb0	Artemether + Lumefantrine Tablet, 20 mg + 120 mg (18's)	Antimalarial	Treatment of uncomplicated malaria	20 mg	unit	ARTLUMTA4	50	200	5	10	0	1.88	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTLUMTA4	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsi00falwf4fruxmucs	Artemether + Lumefantrine Tablet, 20 mg + 120 mg (24’s)	Antimalarial	Treatment of uncomplicated malaria	20 mg	unit	ARTLUMTA1	50	200	5	10	0	2.24	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTLUMTA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00fblwf46i8f6sr3	Artemether + Lumefantrine Tablet, 20 mg + 120 mg (6's)	Antimalarial	Treatment of uncomplicated malaria	20 mg	unit	ARTLUMTA2	50	200	5	10	0	0.61	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTLUMTA2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00fclwf4hzfw4t6a	Artemether Injection 80mg/mL	Antimalarial	Treatment of uncomplicated malaria	80mg	ampoule	 ARTEMEIN2	50	200	5	10	0	5.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	 ARTEMEIN2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00fdlwf4we057ic7	Artermether + Lumefantrine Dispersible, (20 mg + 120 mg) Tablet	Antimalarial	Artemisinin-based combination therapy	20 mg	tablet	ARTLUMDT1	50	200	5	10	0	4.39	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTLUMDT1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00felwf4urwth8fj	Artesunate injection 120mg	Antimalarial	Severe malaria treatment	120mg	vial	ARTESUIN3	50	200	5	10	0	6.25	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTESUIN3	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00fflwf4l2zx20sa	Artesunate Injection, 30 mg	Antimalarial	Severe malaria treatment	30 mg	vial	ARTESUIN1	50	200	5	10	0	3.18	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTESUIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00fglwf4kefmgoi9	Artesunate Injection, 60 mg	Antimalarial	Severe malaria treatment	60 mg	vial	ARTESUIN2	50	200	5	10	0	3.18	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTESUIN2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00fhlwf4sirzzd5v	Artesunate suppository 100mg	Antimalarial	Severe malaria treatment	100mg	unit	ARTESURE2	50	200	5	10	0	6.05	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTESURE2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00filwf4bpu4tgew	Artesunate Suppository, 50 mg	Antimalarial	Severe malaria treatment	50 mg	unit	ARTESURE1	50	200	5	10	0	5.49	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ARTESURE1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00fjlwf4yi6s5i9r	Atenolol + Hydrochlorthiazide Tablet, 100 mg + 25 mg	Antihypertensive	Beta-blocker for hypertension and angina	100 mg	tablet	ATEHYDTA2	50	200	5	10	0	1.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ATEHYDTA2	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00fklwf4tlsx63mk	Atenolol + Hydrochlorthiazide Tablet, 50 mg + 25 mg	Antihypertensive	Beta-blocker for hypertension and angina	50 mg	tablet	ATEHYDTA1	50	200	5	10	0	0.77	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ATEHYDTA1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jsj00fllwf4gp4512qk	Atenolol Injection, 500 microgram/10 mL	Antihypertensive	Beta-blocker for hypertension and angina	10 mL	ampoule	ATENOLIN1	50	200	5	10	0	8.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ATENOLIN1	0	t	t	2025-11-19 13:44:34.079	2025-11-19 13:44:34.079
cmi620jva00fmlwf4ks4qtvnq	Atenolol Tablet, 100 mg	Antihypertensive	Beta-blocker for hypertension and angina	100 mg	tablet	ATENOLTA3	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ATENOLTA3	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jva00fnlwf457b7canx	Atenolol Tablet, 25 mg	Antihypertensive	Beta-blocker for hypertension and angina	25 mg	tablet	ATENOLTA1	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ATENOLTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvb00folwf4l3f6lvu7	Atenolol Tablet, 50 mg	Antihypertensive	Beta-blocker for hypertension and angina	50 mg	tablet	ATENOLTA2	50	200	5	10	0	0.54	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ATENOLTA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvb00fplwf4fxo9lh2f	Atorvastatin Tablet, 10 mg	Lipid Regulator	Cholesterol-lowering statin	10 mg	tablet	ATORVATA1	50	200	5	10	0	0.23	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ATORVATA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvb00fqlwf4x4gpxzuy	Atorvastatin Tablet, 20 mg	Lipid Regulator	Cholesterol-lowering statin	20 mg	tablet	ATORVATA2	50	200	5	10	0	0.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ATORVATA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvb00frlwf4l11stykk	Atropine Eye Drops, 1%	Other Medicines	General medication	1%	ml	ATROPIID1	50	200	5	10	0	36.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ATROPIID1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvb00fslwf4wbz8sv39	Atropine Injection, 0.6 mg/mL	Injectable	Administered via injection	0.6 mg	ml	ATROPIIN1	50	200	5	10	0	5.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	ATROPIIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvc00ftlwf4ekpd0mir	Azithromycin Capsule, 250 mg	Antibiotic	Macrolide antibiotic for respiratory infections	250 mg	capsule	AZITHRCA1	50	200	5	10	0	3.58	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AZITHRCA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvc00fulwf4dwpfcnfm	Azithromycin Oral Suspension, 200 mg/5 mL/15mL	Antibiotic	Macrolide antibiotic for respiratory infections	200 mg	ml	AZITHRSU1	50	200	5	10	0	35.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AZITHRSU1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvc00fvlwf44lci1nz6	Azithromycin Oral Suspension, 200 mg/5 mL/30mL	Antibiotic	Macrolide antibiotic for respiratory infections	200 mg	ml	AZITHRSU2	50	200	5	10	0	40.13	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	AZITHRSU2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvc00fwlwf4jc0o8sw0	Badoe's Solution Injection, 1000 mL	Injectable	Administered via injection	1000 mL	ml	BADOESIN1	50	200	5	10	0	22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BADOESIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvc00fxlwf44zs07l7i	Beclometasone dipropionate Inhaler, 100 microgram/metered dose (200 doses)	Other Medicines	General medication	N/A	unit	BECDIPGA2	50	200	5	10	0	87.94	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BECDIPGA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvc00fylwf4l43cog9n	Beclometasone dipropionate Inhaler, 200 microgram/metered dose (200 doses)	Other Medicines	General medication	N/A	unit	BECDIPGA3	50	200	5	10	0	87.94	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BECDIPGA3	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvc00fzlwf4b21hwgpm	Beclometasone dipropionate Inhaler, 50 microgram/metered dose (200 doses)	Other Medicines	General medication	N/A	unit	BECDIPGA1	50	200	5	10	0	119.9	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BECDIPGA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvd00g0lwf4s61h3pr5	Bendroflumethiazide Tablet, 2.5 mg	Oral Solid	Taken by mouth	2.5 mg	tablet	BENDROTA1	50	200	5	10	0	0.12	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BENDROTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvd00g1lwf428ye3e6c	Benzatropine Injection, 1 mg/mL	Injectable	Administered via injection	1 mg	ml	BENZATIN1	50	200	5	10	0	110.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BENZATIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvd00g2lwf47kvksfg2	Benzatropine Tablet, 2 mg	Oral Solid	Taken by mouth	2 mg	tablet	BENZATTA1	50	200	5	10	0	6.93	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BENZATTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvd00g3lwf4yjbs1ug8	Benzoic Acid + Salicylic Acid Ointment, 6% + 3%	Topical	Applied to skin	6%	g	BEACSAOI1	50	200	5	10	0	17.6	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BEACSAOI1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvd00g4lwf4jlpwtvi5	Benzoyl Peroxide Cream, 10%	Topical	Applied to skin	10%	g	BENPERCR2	50	200	5	10	0	131.45	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BENPERCR2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvd00g5lwf4e7e9orqf	Benzoyl Peroxide Cream, 5%	Topical	Applied to skin	5%	g	BENPERCR1	50	200	5	10	0	118.25	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BENPERCR1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvd00g6lwf4bdrbrgnb	Benzyl Benzoate Lotion, 25%	Other Medicines	General medication	25%	ml	BENBENLO1	50	200	5	10	0	24.86	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BENBENLO1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvd00g7lwf48mpvpfz7	Benzyl Benzoate Lotion, 25%	Other Medicines	General medication	25%	ml	BENBENLO2	50	200	5	10	0	28.6	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BENBENLO2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvd00g8lwf4s7gib3m5	Benzylpenicillin Injection, 1 MU	Injectable	Administered via injection	N/A	vial	BENZYLIN1	50	200	5	10	0	3.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BENZYLIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jve00g9lwf4k0du9phf	Benzylpenicillin Injection, 5 MU	Injectable	Administered via injection	N/A	vial	BENZYLIN2	50	200	5	10	0	11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BENZYLIN2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jve00galwf4zyq6eeye	Betamethasone Valerate cream, 0.1%	Topical	Applied to skin	0.1%	g	BETVALCR2	50	200	5	10	0	38.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BETVALCR2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jve00gblwf43tlqmor6	Betaxolol HCL Eye Drops, 0.5%	Other Medicines	General medication	0.5%	ml	BETAXOID1	50	200	5	10	0	19.89	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BETAXOID1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jve00gclwf42paltt7c	Bisacodyl Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	BISACOTA1	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BISACOTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jve00gdlwf4qler93si	Bisoprolol Tablet 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	BISOPRTA2	50	200	5	10	0	1.02	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BISOPRTA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jve00gelwf4dfqxp2nw	Bisoprolol Tablet 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	BISOPRTA1	50	200	5	10	0	0.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BISOPRTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jve00gflwf4t4cmspa8	Bromocriptine Tablet, 2.5 mg	Oral Solid	Taken by mouth	2.5 mg	tablet	BROMOCTA1	50	200	5	10	0	9.46	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BROMOCTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jve00gglwf49d13aoka	Budesonide + Formoterol Inhaler 160 microgram/4.5 microgram (60 Doses)	Other Medicines	General medication	N/A	unit	BUDFORGA2	50	200	5	10	0	151.25	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BUDFORGA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jve00ghlwf46k3dium7	Budesonide + Formoterol Inhaler 80 microgram/4.5 microgram (60 Doses)	Other Medicines	General medication	N/A	unit	BUDFORGA1	50	200	5	10	0	143	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BUDFORGA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvf00gilwf4aqwx5gm1	Budesonide DPI, 100 microgram (100 Doses)	Other Medicines	General medication	N/A	unit	BUDESOGA1	50	200	5	10	0	108.11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BUDESOGA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvf00gjlwf435piqhk4	Budesonide DPI, 200 microgram (100 Doses)	Other Medicines	General medication	N/A	unit	BUDESOGA2	50	200	5	10	0	212.78	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	BUDESOGA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvf00gklwf4r43u7kg9	Calamine Cream, 15%	Topical	Applied to skin	15%	g	CALAMICR1	50	200	5	10	0	18.04	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CALAMICR1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvf00gllwf4wy26a0ll	Calamine Lotion, 15%	Other Medicines	General medication	15%	ml	CALAMILO1	50	200	5	10	0	11.55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CALAMILO1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvf00gmlwf4vhtzasgx	Calciferol Tablet, 10,000 units	Oral Solid	Taken by mouth	000 units	tablet	CALCIFTA1	50	200	5	10	0	4.78	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CALCIFTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvf00gnlwf4yxoc5oo3	Calcium Gluconate Injection, 100 mg/mL in 10 mL	Mineral Supplement	Bone health and muscle function	100 mg	ampoule	CALGLUIN1	50	200	5	10	0	29.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CALGLUIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvf00golwf4jyoqtxx5	Calcium Carbonate Tablet, 500 mg	Mineral Supplement	Bone health and muscle function	500 mg	tablet	CALCARTA1	50	200	5	10	0	3.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CALCARTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvf00gplwf4mbgfrwnn	Calcium with Vitamin D Tablet, (97 mg + 10 microgram)	Vitamin Supplement	Essential nutrient supplementation	97 mg	tablet	CALVITTA1	50	200	5	10	0	1.47	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CALVITTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvf00gqlwf4ynilx1x5	Capecitabine Tablet, 500 mg	Oral Solid	Taken by mouth	500 mg	tablet	CAPECITA1	50	200	5	10	0	19.14	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CAPECITA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvf00grlwf4xodg6dra	Carbamazepine Sustained-Release Tablet, 200 mg	Oral Solid	Taken by mouth	200 mg	tablet	CARBAMTA3	50	200	5	10	0	2.92	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARBAMTA3	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvg00gslwf4vcaasys2	Carbamazepine Sustained-Release Tablet, 400 mg	Oral Solid	Taken by mouth	400 mg	tablet	CARBAMTA4	50	200	5	10	0	6.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARBAMTA4	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvg00gtlwf44ke4tuge	Carbamazepine Tablet, 100 mg	Oral Solid	Taken by mouth	100 mg	tablet	CARBAMTA1	50	200	5	10	0	1.21	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARBAMTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvg00gulwf4ijysfdg7	Carbamazepine Tablet, 200 mg	Oral Solid	Taken by mouth	200 mg	tablet	CARBAMTA2	50	200	5	10	0	1.04	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARBAMTA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvg00gvlwf4srxd4zj2	Carbimazole Tablet, 20 mg	Oral Solid	Taken by mouth	20 mg	tablet	CARBIMTA2	50	200	5	10	0	2.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARBIMTA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvg00gwlwf4zrbbga48	Carbimazole Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	CARBIMTA1	50	200	5	10	0	1.16	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARBIMTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvg00gxlwf43gbxen65	Carbocisteine Paediatric Syrup , 125 mg/5 mL	Oral Liquid	Liquid oral medication	125 mg	ml	CARBOCSY1	50	200	5	10	0	14.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARBOCSY1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvg00gylwf41y2142h0	Carbocisteine Syrup, 250 mg/5 mL	Oral Liquid	Liquid oral medication	250 mg	ml	CARBOCSY2	50	200	5	10	0	11.06	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARBOCSY2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvg00gzlwf4810qzd8v	Carboplatin Injection, 150 mg Intravenous	Injectable	Administered via injection	150 mg	vial	CARBOPIN1	50	200	5	10	0	385	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARBOPIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvg00h0lwf4epsvvk1t	Carboplatin Injection, 450 mg Intravenous	Injectable	Administered via injection	450 mg	vial	CARBOPIN2	50	200	5	10	0	559.68	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARBOPIN2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvh00h1lwf4m5r5tu2n	Carvedilol Tablet 12.5 mg	Oral Solid	Taken by mouth	12.5 mg	tablet	CARVEDTA2	50	200	5	10	0	1.41	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARVEDTA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvh00h2lwf47ps43iok	Carvedilol Tablet 3.125 mg	Oral Solid	Taken by mouth	3.125 mg	tablet	CARVEDTA1	50	200	5	10	0	1.04	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CARVEDTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvh00h3lwf4uy7996mu	Cefaclor Capsule, 250 mg	Other Medicines	General medication	250 mg	capsule	CEFACLCA1	50	200	5	10	0	6.86	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFACLCA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvh00h4lwf4bgna2k1h	Cefaclor Capsule, 500 mg	Other Medicines	General medication	500 mg	capsule	CEFACLCA2	50	200	5	10	0	12.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFACLCA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvh00h5lwf4g3gs4jb4	Cefaclor Suspension, 125 mg/5 mL	Oral Liquid	Liquid oral medication	125 mg	ml	CEFACLSU1	50	200	5	10	0	40.15	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFACLSU1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvh00h6lwf4qsyz6e4n	Cefaclor Suspension, 250 mg/5 mL	Oral Liquid	Liquid oral medication	250 mg	ml	CEFACLSU2	50	200	5	10	0	59.95	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFACLSU2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvi00h7lwf4ct7dtn6f	Cefotaxime Injection, 1 g	Injectable	Administered via injection	1 g	vial	CEFOTAIN2	50	200	5	10	0	20.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFOTAIN2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvi00h8lwf48a9vs7ac	Cefotaxime Injection, 500 mg	Injectable	Administered via injection	500 mg	vial	CEFOTAIN1	50	200	5	10	0	14.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFOTAIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvi00h9lwf420v4f29v	Ceftriazone Injection, 1g	Injectable	Administered via injection	1g	vial	CEFTRIIN3	50	200	5	10	0	13.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFTRIIN3	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvi00halwf4stmnqelw	Ceftriazone Injection, 500 mg	Injectable	Administered via injection	500 mg	vial	CEFTRIIN2	50	200	5	10	0	8.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFTRIIN2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvi00hblwf4pvthw3pa	Cefuroxime Injection 1.5 g	Antibiotic	Second-generation cephalosporin	1.5 g	vial	CEFUROIN2	50	200	5	10	0	35.42	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFUROIN2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvi00hclwf4ilk6vn46	Cefuroxime Injection, 750 mg	Antibiotic	Second-generation cephalosporin	750 mg	vial	CEFUROIN1	50	200	5	10	0	13.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFUROIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvi00hdlwf4piumyj8p	Cefuroxime Suspension, 125 mg/5 mL	Antibiotic	Second-generation cephalosporin	125 mg	ml	CEFUROSU1	50	200	5	10	0	20.56	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFUROSU1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvi00helwf4obc0n5rv	Cefuroxime Tablet, 125 mg	Antibiotic	Second-generation cephalosporin	125 mg	tablet	CEFUROTA1	50	200	5	10	0	4.29	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFUROTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvi00hflwf43lakepj4	Cefuroxime Tablet, 250 mg	Antibiotic	Second-generation cephalosporin	250 mg	tablet	CEFUROTA2	50	200	5	10	0	2.17	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CEFUROTA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvi00hglwf4264b6mei	Celecoxib Tablet 100 mg	Oral Solid	Taken by mouth	100 mg	tablet	CELECOTA1	50	200	5	10	0	1.32	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CELECOTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvj00hhlwf4n9skmscn	Celecoxib Tablet 200 mg	Oral Solid	Taken by mouth	200 mg	tablet	CELECOTA2	50	200	5	10	0	2.75	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CELECOTA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvj00hilwf44xsxrt1r	Cetirizine Syrup, 5 mg/5 mL	Oral Liquid	Liquid oral medication	5 mg	ml	CETIRISY1	50	200	5	10	0	8.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CETIRISY1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvj00hjlwf4y1dymrzt	Cetirizine Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	CETIRITA1	50	200	5	10	0	0.07	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CETIRITA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvj00hklwf40o2fc8gc	Cetrimide Solution	Other Medicines	General medication	N/A	ml	CETRIMSO1	50	200	5	10	0	7.15	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CETRIMSO1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvj00hllwf4yn65cw4p	Chloramphenicol Ear Drops, 5%	Other Medicines	General medication	5%	ml	CHLORAED1	50	200	5	10	0	6.88	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLORAED1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvj00hmlwf4vpcn966o	Chloramphenicol Eye Drops, 0.5%	Other Medicines	General medication	0.5%	ml	CHLORAID1	50	200	5	10	0	6.38	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLORAID1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvj00hnlwf4mwks0bqi	Chloramphenicol Eye Ointment, 1%	Topical	Applied to skin	1%	g	CHLORAEO1	50	200	5	10	0	8.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLORAEO1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvj00holwf4dhx7tpwd	Chloramphenicol Injection, 1 g	Injectable	Administered via injection	1 g	g	CHLORAIN1	50	200	5	10	0	1.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLORAIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvj00hplwf4vjhnehu5	Chloramphenicol Suspension, 125mg/5mL	Oral Liquid	Liquid oral medication	125mg	ml	CHLORASU1	50	200	5	10	0	8.58	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLORASU1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvj00hqlwf4nqr30iyf	Chlorhexidine Cream, 1%	Topical	Applied to skin	1%	g	CHLORHCR1	50	200	5	10	0	28.6	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLORHCR1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvk00hrlwf4aq91d8x0	Chlorhexidine Gel 7.1 % ( digluconate ) delivering 4% chlorhexidine	Other Medicines	General medication	7.1 %	g	CHLORHGE1	50	200	5	10	0	24.75	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLORHGE1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvk00hslwf43yvwscco	Chlorhexidine Mouth wash 0.12%	Other Medicines	General medication	0.12%	ml	CHLORHMW2	50	200	5	10	0	22.69	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLORHMW2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvk00htlwf4venazi7t	Chlorhexidine Solution, 2.5%	Other Medicines	General medication	2.5%	ml	CHLORHSO1	50	200	5	10	0	75.13	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLORHSO1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvk00hulwf4kut8mr4s	Chlorphenamine Syrup, 2 mg/5 mL	Oral Liquid	Liquid oral medication	2 mg	ml	CHLPHESY1	50	200	5	10	0	11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLPHESY1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvk00hvlwf47ike808p	Chlorphenamine Tablet, 4 mg	Oral Solid	Taken by mouth	4 mg	tablet	CHLPHETA1	50	200	5	10	0	0.16	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLPHETA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvk00hwlwf4zmf12jnl	Chlorpromazine Injection, 25 mg/mL in 2 mL	Injectable	Administered via injection	25 mg	ampoule	CHLPROIN1	50	200	5	10	0	7.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLPROIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvk00hxlwf4cm1kpgsh	Chlorpromazine Tablet, 100 mg	Oral Solid	Taken by mouth	100 mg	tablet	CHLPROTA3	50	200	5	10	0	0.58	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLPROTA3	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvk00hylwf4zhcwo7x4	Chlorpromazine Tablet, 25 mg	Oral Solid	Taken by mouth	25 mg	tablet	CHLPROTA1	50	200	5	10	0	5.94	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLPROTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvk00hzlwf4oysfwd5d	Chlorpromazine Tablet, 50 mg	Oral Solid	Taken by mouth	50 mg	tablet	CHLPROTA2	50	200	5	10	0	0.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHLPROTA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvk00i0lwf4jrp23v24	Cholera Replacement Fluid Injection, (5:4:1) 1 Litre	Injectable	Administered via injection	N/A	ml	CHREFLIN2	50	200	5	10	0	19.6	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHREFLIN2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00i1lwf4hp6linmn	Cholera Replacement Fluid Injection, (5:4:1) 500 mL	Injectable	Administered via injection	500 mL	ml	CHREFLIN1	50	200	5	10	0	10.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CHREFLIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00i2lwf475p70wfg	Ciprofloxacin + Tinidazole Tablet, 500 mg + 500 mg	Antibiotic	Fluoroquinolone for bacterial infections	500 mg	tablet	CIPTINTA1	50	200	5	10	0	2.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CIPTINTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00i3lwf42tr6t5u3	Ciprofloxacin Eye Drops, 0.3%	Antibiotic	Fluoroquinolone for bacterial infections	0.3%	ml	CIPROFID1	50	200	5	10	0	5.17	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CIPROFID1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00i4lwf4nqx6m1et	Ciprofloxacin Infusion, 2 mg/mL in 100 mL	Antibiotic	Fluoroquinolone for bacterial infections	2 mg	bottle	CIPROFIN1	50	200	5	10	0	9.35	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CIPROFIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00i5lwf45s0u9o1z	Ciprofloxacin Tablet, 250 mg	Antibiotic	Fluoroquinolone for bacterial infections	250 mg	tablet	CIPROFTA1	50	200	5	10	0	0.61	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CIPROFTA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00i6lwf45et4k2eb	Ciprofloxacin Tablet, 500 mg	Antibiotic	Fluoroquinolone for bacterial infections	500 mg	tablet	CIPROFTA2	50	200	5	10	0	0.61	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CIPROFTA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00i7lwf4jhqecead	Clarithromycin Capsule, 250 mg	Other Medicines	General medication	250 mg	capsule	CLARITCA1	50	200	5	10	0	3.08	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLARITCA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00i8lwf45zrcy246	Clarithromycin Capsule, 500 mg	Other Medicines	General medication	500 mg	capsule	CLARITCA2	50	200	5	10	0	5.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLARITCA2	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00i9lwf4qoyoa366	Clarithromycin Paediatric Suspension, 125 mg/5 mL	Oral Liquid	Liquid oral medication	125 mg	ml	CLARITSU1	50	200	5	10	0	110.28	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLARITSU1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00ialwf4a3bqay09	Clindamycin Capsule, 150 mg	Other Medicines	General medication	150 mg	capsule	CLINDACA1	50	200	5	10	0	0.77	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLINDACA1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvl00iblwf4tfcraap9	Clindamycin Injection, 150 mg/mL in 2 mL	Injectable	Administered via injection	150 mg	vial	CLINDAIN1	50	200	5	10	0	29.17	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLINDAIN1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvm00iclwf4xmn7n2cs	Clindamycin Suspension, 75 mg/5 mL	Oral Liquid	Liquid oral medication	75 mg	ml	CLINDASU1	50	200	5	10	0	207.9	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLINDASU1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jvm00idlwf4s6pzsgpc	Clindamycin Topical Solution, 1%	Other Medicines	General medication	1%	ml	CLINDASO1	50	200	5	10	0	100.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLINDASO1	0	t	t	2025-11-19 13:44:34.195	2025-11-19 13:44:34.195
cmi620jyl00ielwf4lf9xsphz	Clobetasol Propionate Cream, 0.05%	Topical	Applied to skin	0.05%	g	CLOPROCR1	50	200	5	10	0	57.48	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLOPROCR1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyl00iflwf4rrge2f5m	Clotrimazole + Hydrocortisone Cream, 1% + 1%	Antifungal	Topical treatment for candidiasis	1%	g	CLOHYDCR1	50	200	5	10	0	16.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLOHYDCR1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyl00iglwf46hpy4obi	Clotrimazole Cream, 1%	Antifungal	Topical treatment for candidiasis	1%	g	CLOTRICR1	50	200	5	10	0	8.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLOTRICR1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyl00ihlwf47bl8ztpz	Clotrimazole Cream, 2%	Antifungal	Topical treatment for candidiasis	2%	g	CLOTRICR2	50	200	5	10	0	11.55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLOTRICR2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyl00iilwf4rh0texl8	Clotrimazole Pessary, 100 mg	Antifungal	Topical treatment for candidiasis	100 mg	unit	CLOTRIVP1	50	200	5	10	0	11.55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLOTRIVP1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyl00ijlwf4jb1wmbt8	Clotrimazole Pessary, 200 mg	Antifungal	Topical treatment for candidiasis	200 mg	unit	CLOTRIVP2	50	200	5	10	0	24.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLOTRIVP2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jym00iklwf4t4s5gkxi	Clotrimazole Pessary, 500 mg	Antifungal	Topical treatment for candidiasis	500 mg	unit	CLOTRIVP3	50	200	5	10	0	21.01	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLOTRIVP3	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jym00illwf441ut5q43	Cloxacillin Injection, 250 mg	Injectable	Administered via injection	250 mg	vial	CLOXACIN1	50	200	5	10	0	2.71	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLOXACIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jym00imlwf458t03cwm	Cloxacillin Injection, 500 mg	Injectable	Administered via injection	500 mg	vial	CLOXACIN2	50	200	5	10	0	11.28	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CLOXACIN2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jym00inlwf4wruoyuwk	Codeine Tablet, 30 mg	Oral Solid	Taken by mouth	30 mg	tablet	CODEINTA1	50	200	5	10	0	1.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CODEINTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jym00iolwf415n1bf0d	Conjugated Oestrogen + Norgesterol Tablet, 625 microgram + 150 microgram	Oral Solid	Taken by mouth	N/A	tablet	COOENOTA1	50	200	5	10	0	3.77	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	COOENOTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jym00iplwf4cw13kt3y	Conjugated Oestrogen Tablet, 625 microgram	Oral Solid	Taken by mouth	N/A	tablet	CONOESTA1	50	200	5	10	0	6.02	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CONOESTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jym00iqlwf4un91u4dh	Conjugated Oestrogen Vaginal cream, 625 microgram/g	Topical	Applied to skin	N/A	g	CONOESVC1	50	200	5	10	0	255.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM6	f	CONOESVC1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyn00irlwf4ch89h8mi	Corticosteroid + Antibiotic Eye Drops	Other Medicines	General medication	N/A	ml	CORANTID1	50	200	5	10	0	41.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	CORANTID1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyn00islwf4exk07c7j	Corticosteroid + Antibiotic Eye Ointment	Topical	Applied to skin	N/A	g	CORANTEO1	50	200	5	10	0	53.9	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	CORANTEO1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyn00itlwf42cz98c91	Co-trimoxazole Suspension, (200+40) mg/5 mL	Oral Liquid	Liquid oral medication	5 mL	ml	COTRIMSU1	50	200	5	10	0	9.46	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	COTRIMSU1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyn00iulwf465icbna8	Cotrimoxazole Tablet, (400+80) mg	Oral Solid	Taken by mouth	N/A	tablet	COTRIMTA1	50	200	5	10	0	0.23	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	COTRIMTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyn00ivlwf4ob567olc	Cyclopentolate Eye Drops, 1%	Other Medicines	General medication	1%	ml	CYCLOPID1	50	200	5	10	0	42.13	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	CYCLOPID1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyn00iwlwf41roacb10	Cyclophosphamide Injection, 500 mg	Injectable	Administered via injection	500 mg	vial	CYCLOPIN1	50	200	5	10	0	39.47	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	CYCLOPIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyn00ixlwf4e7guu17s	Dalteparin Sodium Injection, 5000 units/0.2 mL	Injectable	Administered via injection	5000 units	g	DALSODIN1	50	200	5	10	0	102.08	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DALSODIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyn00iylwf4xvep4gt6	Darrow's Solution Injection, Half Strength 250 mL	Injectable	Administered via injection	250 mL	ml	DARROWIN1	50	200	5	10	0	8.71	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DARROWIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyo00izlwf4q6bvdhe2	Dexamethasone Eye Drops, 1%	Other Medicines	General medication	1%	ml	DEXAMEID1	50	200	5	10	0	8.84	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXAMEID1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyo00j0lwf4od4jzpqn	Dexamethasone Eye Ointment, 1%	Topical	Applied to skin	1%	g	DEXAMEEO1	50	200	5	10	0	42.63	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXAMEEO1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyo00j1lwf4tf2l5q0w	Dexamethasone Injection, 4 mg/mL	Injectable	Administered via injection	4 mg	ml	DEXAMEIN1	50	200	5	10	0	3.02	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXAMEIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyo00j2lwf42t3dhf4s	Dexamethasone Injection, 8 mg/2 mL	Injectable	Administered via injection	8 mg	ml	DEXAMEIN2	50	200	5	10	0	2.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXAMEIN2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyo00j3lwf4bsp5jp67	Dexamethasone Tablet, 2 mg	Oral Solid	Taken by mouth	2 mg	tablet	DEXAMETA2	50	200	5	10	0	6.43	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXAMETA2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyo00j4lwf4ij28fj1g	Dexamethasone Tablet, 4 mg	Oral Solid	Taken by mouth	4 mg	tablet	DEXAMETA3	50	200	5	10	0	4.71	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXAMETA3	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyo00j5lwf4cu75djd4	Dexamethasone Tablet, 500 microgram	Oral Solid	Taken by mouth	N/A	tablet	DEXAMETA1	50	200	5	10	0	0.06	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXAMETA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyo00j6lwf4n3uz32qe	Dextromethorphan Containing Cough Syrup	Oral Liquid	Liquid oral medication	N/A	ml	DEXTROTA1	50	200	5	10	0	40.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXTROTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyp00j7lwf44sn9hxv8	Dextrose in Sodium Chloride Intravenous Infusion, 4.3% in 0.18% (250 mL)	Other Medicines	General medication	4.3%	ml	DESOCHIN1	50	200	5	10	0	12.67	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DESOCHIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyp00j8lwf4dmfiwrow	Dextrose in Sodium Chloride Intravenous Infusion, 5% in 0.9% (500 mL)	Other Medicines	General medication	5%	ml	DESOCHIN2	50	200	5	10	0	12.93	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DESOCHIN2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyp00j9lwf4xhogyfhw	Dextrose Infusion, 10% (250 mL)	Other Medicines	General medication	10%	ml	DEXTROIN3	50	200	5	10	0	9.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXTROIN3	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyp00jalwf4wl6wq7j7	Dextrose Infusion, 10% (500 mL)	Other Medicines	General medication	10%	ml	DEXTROIN4	50	200	5	10	0	14.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXTROIN4	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyp00jblwf4cke1hykr	Dextrose Infusion, 5% (250 mL)	Other Medicines	General medication	5%	ml	DEXTROIN1	50	200	5	10	0	11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXTROIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyp00jclwf4mecrwn50	Dextrose Infusion, 5% (500 mL)	Other Medicines	General medication	5%	ml	DEXTROIN2	50	200	5	10	0	11.86	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXTROIN2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyp00jdlwf4im5lmqko	Dextrose Infusion, 50% (250 mL)	Other Medicines	General medication	50%	ml	DEXTROIN6	50	200	5	10	0	17.42	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DEXTROIN6	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyp00jelwf4xtg5cnqf	Diazepam Injection, 5 mg/mL in 2 mL	Injectable	Administered via injection	5 mg	ampoule	DIAZEPIN1	50	200	5	10	0	7.9	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIAZEPIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyq00jflwf4p8zka02n	Diazepam Rectal Tubes, 2 mg/mL in 1.25 mL	Other Medicines	General medication	2 mg	tube	DIAZEPRS1	50	200	5	10	0	5.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIAZEPRS1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyq00jglwf4tqi0gz5y	Diazepam Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	DIAZEPTA2	50	200	5	10	0	0.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIAZEPTA2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyq00jhlwf4rsp4oxdh	Diazepam Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	DIAZEPTA1	50	200	5	10	0	0.16	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIAZEPTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyq00jilwf4p480p9sg	Diclofenac Capsule, 75 mg	NSAID	Pain and inflammation relief	75 mg	capsule	DICLOFCA1	50	200	5	10	0	0.4	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DICLOFCA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyq00jjlwf4emq2q8o7	Diclofenac Gel	NSAID	Pain and inflammation relief	N/A	g	DICLOFGE1	50	200	5	10	0	5.41	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DICLOFGE1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyq00jklwf453471e95	Diclofenac Injection, 75mg/3mL	NSAID	Pain and inflammation relief	75mg	ampoule	DICLOFIN1	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DICLOFIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyq00jllwf4onqiu4hx	Diclofenac Suppository, 100 mg	NSAID	Pain and inflammation relief	100 mg	unit	DICLOFRE2	50	200	5	10	0	0.96	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DICLOFRE2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyq00jmlwf4pr0clur4	Diclofenac Suppository, 50 mg	NSAID	Pain and inflammation relief	50 mg	unit	DICLOFRE1	50	200	5	10	0	1.71	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DICLOFRE1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyr00jnlwf4dckkpbz4	Diclofenac Tablet, 50 mg	NSAID	Pain and inflammation relief	50 mg	tablet	DICLOFTA2	50	200	5	10	0	0.13	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DICLOFTA2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyr00jolwf4bk634p8j	Diethylstilboestrol Tablet, 1 mg	Oral Solid	Taken by mouth	1 mg	tablet	DIESTITA1	50	200	5	10	0	0.11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIESTITA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyr00jplwf4uscnu4yl	Diethylstilboestrol Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	DIESTITA2	50	200	5	10	0	8.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIESTITA2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyr00jqlwf4o1jki5ut	Digoxin Elixir, 50 microgram/mL	Other Medicines	General medication	N/A	ml	DIGOXIEL1	50	200	5	10	0	1.38	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIGOXIEL1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyr00jrlwf436w54kee	Digoxin Tablet, 125 microgram	Oral Solid	Taken by mouth	N/A	tablet	DIGOXITA2	50	200	5	10	0	1.71	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIGOXITA2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyr00jslwf4ick1dv35	Digoxin Tablet, 250 microgram	Oral Solid	Taken by mouth	N/A	tablet	DIGOXITA3	50	200	5	10	0	1.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIGOXITA3	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyr00jtlwf41be3et2w	Digoxin Tablet, 62.5 microgram	Oral Solid	Taken by mouth	N/A	tablet	DIGOXITA1	50	200	5	10	0	1.03	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIGOXITA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyr00julwf4uumnz2ib	Dihydroartemisin + Piperaquine Granular Powder, 10 mg + 80 mg	Other Medicines	General medication	10 mg	sachet	DIHPIPPO1	50	200	5	10	0	3.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIHPIPPO1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jys00jvlwf47o8rdblc	Dihydrocodeine Tablet, 30 mg	Oral Solid	Taken by mouth	30 mg	tablet	DIHYDRTA1	50	200	5	10	0	0.72	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DIHYDRTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jys00jwlwf4vzx2nq62	Disopyramide Capsule, 100 mg	Other Medicines	General medication	100 mg	capsule	DISOPYCA1	50	200	5	10	0	6.6	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DISOPYCA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jys00jxlwf4vtv4cxdr	Disopyramide Phosphate Injection, 10 mg/mL in 5 mL	Injectable	Administered via injection	10 mg	ampoule	DISPHOIN1	50	200	5	10	0	357.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DISPHOIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jys00jylwf40y85zstl	Docetaxel Injection, 20 mg/mL	Injectable	Administered via injection	20 mg	ampoule	DOCETAIN1	50	200	5	10	0	212.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DOCETAIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jys00jzlwf4bsixyc03	Domperidone Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	DOMPERTA1	50	200	5	10	0	1.76	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DOMPERTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jys00k0lwf4ghn4bs6v	Dopamine Injection, 40 mg/mL in 5 mL	Injectable	Administered via injection	40 mg	vial	DOPAMIIN1	50	200	5	10	0	24.75	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DOPAMIIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jys00k1lwf4zhvgg4uk	Doxapram Injection, 20 mg/mL in 5 mL	Injectable	Administered via injection	20 mg	vial	DOXAPRIN1	50	200	5	10	0	187	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DOXAPRIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jys00k2lwf4ulm2lz4k	Doxorubicin Injection 50 mg Intravenous	Injectable	Administered via injection	50 mg	vial	DOXORUIN1	50	200	5	10	0	130	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DOXORUIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyt00k3lwf47am2mjb0	Doxycycline Capsule, 100 mg	Antibiotic	Tetracycline antibiotic for infections	100 mg	capsule	DOXYCYCA1	50	200	5	10	0	0.92	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	DOXYCYCA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyt00k4lwf4tkam1b5t	Enoxaparin Sodium Injection, 40 mg/0.4 mL	Injectable	Administered via injection	40 mg	g	ENOSODIN2	50	200	5	10	0	126.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ENOSODIN2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyt00k5lwf45sp3lwdk	Ephedrine HCI Injection, 30 mg/mL	Injectable	Administered via injection	30 mg	ampoule	EPHEDRIN1	50	200	5	10	0	23.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	EPHEDRIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyt00k6lwf49xrhh437	Ephedrine Nasal Drops, 0.5%	Other Medicines	General medication	0.5%	ml	EPHEDRND1	50	200	5	10	0	6.83	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	EPHEDRND1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyt00k7lwf407accijy	Ephedrine Nasal Drops, 1%	Other Medicines	General medication	1%	ml	EPHEDRND2	50	200	5	10	0	9.9	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	EPHEDRND2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyt00k8lwf4r4b5o9mb	Ergometrine Injection, 0.2 mg/mL	Injectable	Administered via injection	0.2 mg	ml	ERGOMEIN1	50	200	5	10	0	10.04	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ERGOMEIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyt00k9lwf4dn9x37gs	Ergometrine Injection, 0.5 mg/ml	Injectable	Administered via injection	0.5 mg	ml	ERGOMEIN2	50	200	5	10	0	12.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ERGOMEIN2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyt00kalwf4kbililqp	Ergometrine Tablet, 0.5 mg	Oral Solid	Taken by mouth	0.5 mg	tablet	ERGOMETA1	50	200	5	10	0	0.66	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ERGOMETA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyu00kblwf47kunnzrl	Ergotamine Tablet, 2 mg	Oral Solid	Taken by mouth	2 mg	tablet	ERGOTATA1	50	200	5	10	0	5.15	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ERGOTATA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyu00kclwf4wagseu4y	Erythromycin Syrup, 125 mg/5 mL	Oral Liquid	Liquid oral medication	125 mg	ml	ERYTHRSY1	50	200	5	10	0	23.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ERYTHRSY1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyu00kdlwf49fbry6q8	Erythromycin Tablet, 250 mg	Oral Solid	Taken by mouth	250 mg	tablet	ERYTHRTA1	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ERYTHRTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyu00kelwf4md8jnhcl	Esomeprazole Capsule, 20 mg	Antacid	Proton pump inhibitor for acid reflux	20 mg	capsule	ESOMEPCA1	50	200	5	10	0	1.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ESOMEPCA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyu00kflwf4sqdxd9m3	Esomeprazole Capsule, 40 mg	Antacid	Proton pump inhibitor for acid reflux	40 mg	capsule	ESOMEPCA2	50	200	5	10	0	3.4	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ESOMEPCA2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyu00kglwf4y5y8jfvb	Ethosuximide Syrup, 250 mg/5 mL	Oral Liquid	Liquid oral medication	250 mg	ml	ETHOSUSY1	50	200	5	10	0	21.51	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ETHOSUSY1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyu00khlwf4wces7b45	Ethosuximide Tablet, 250 mg	Oral Solid	Taken by mouth	250 mg	tablet	ETHOSUTA1	50	200	5	10	0	4.95	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ETHOSUTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyu00kilwf4mpufplo8	Etoposide Injection 100 mg Intravenous	Injectable	Administered via injection	100 mg	vial	ETOPOSIN1	50	200	5	10	0	59.95	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ETOPOSIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyv00kjlwf40mxuih6w	Ferric Ammonium Citrate Mixture (FAC)	Other Medicines	General medication	N/A	ml	FEAMCISU1	50	200	5	10	0	7.48	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FEAMCISU1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyv00kklwf45l5ufwqf	Ferrous Fumarate Tablet, 100 mg (Elemental Iron)	Iron Supplement	Iron deficiency anemia treatment	100 mg	tablet	FERFUMTA1	50	200	5	10	0	0.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FERFUMTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyv00kllwf46kfrzif7	Ferrous Sulphate (BPC) Syrup, 60 mg/5 mL	Iron Supplement	Iron deficiency anemia treatment	60 mg	ml	FERSULSY1	50	200	5	10	0	18.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FERSULSY1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyv00kmlwf4rgl3c9zx	Ferrous Sulphate + Folic Acid Tablet, 50 mg (Elemental Iron) + 400 microgram	Iron Supplement	Iron deficiency anemia treatment	50 mg	tablet	FESUFOTA1	50	200	5	10	0	0.67	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FESUFOTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyv00knlwf4htbynxv8	Ferrous Sulphate Tablet, 60 mg (Elemental Iron)	Iron Supplement	Iron deficiency anemia treatment	60 mg	tablet	FERSULTA1	50	200	5	10	0	0.11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FERSULTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyv00kolwf49debs9ma	Finasteride Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	FINASTTA1	50	200	5	10	0	4.33	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FINASTTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyv00kplwf47fjcbgxq	Flucloxacillin Capsule, 250 mg	Other Medicines	General medication	250 mg	capsule	FLUCLOCA1	50	200	5	10	0	0.82	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUCLOCA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyv00kqlwf4fjvdlbrc	Flucloxacillin Injection, 250 mg	Injectable	Administered via injection	250 mg	vial	FLUCLOIN1	50	200	5	10	0	10.18	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUCLOIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyw00krlwf4su1c2so5	Flucloxacillin Injection, 500 mg	Injectable	Administered via injection	500 mg	vial	FLUCLOIN2	50	200	5	10	0	19.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUCLOIN2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyw00kslwf48qevve7z	Flucloxacillin Suspension, 125 mg/5 mL	Oral Liquid	Liquid oral medication	125 mg	ml	FLUCLOSU1	50	200	5	10	0	15.95	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUCLOSU1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyw00ktlwf4t8qoq9hq	Fluconazole Capsule, 150 mg	Antifungal	Systemic and mucosal fungal infections	150 mg	capsule	FLUCONCA1	50	200	5	10	0	10.67	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUCONCA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyw00kulwf4tm8wvpzx	Fluconazole Capsule, 200 mg	Antifungal	Systemic and mucosal fungal infections	200 mg	capsule	FLUCONCA2	50	200	5	10	0	8.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUCONCA2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyw00kvlwf43dibubco	Fluconazole Suspension, 10 mg/mL	Antifungal	Systemic and mucosal fungal infections	10 mg	ml	FLUCONSU1	50	200	5	10	0	32.45	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUCONSU1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyw00kwlwf4g4e59slo	Fluconazole Suspension, 50 mg/5 mL	Antifungal	Systemic and mucosal fungal infections	50 mg	ml	FLUCONSU2	50	200	5	10	0	50	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUCONSU2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyw00kxlwf48enmg7uj	Fluconazole Tablet, 50 mg	Antifungal	Systemic and mucosal fungal infections	50 mg	tablet	FLUCONTA1	50	200	5	10	0	27.72	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUCONTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyw00kylwf4x9fgzbg5	Fludrocortisone Tablet, 100 microgram	Oral Solid	Taken by mouth	N/A	tablet	FLUDROTA1	50	200	5	10	0	10.78	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUDROTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyx00kzlwf4n1x2270v	Fluoxetine Capsule, 20 mg	Other Medicines	General medication	20 mg	capsule	FLUOXECA1	50	200	5	10	0	1.43	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUOXECA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyx00l0lwf4w44xmsef	Flupentixol Tablet, 1mg	Oral Solid	Taken by mouth	1mg	tablet	FLUPENTA2	50	200	5	10	0	1.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUPENTA2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyx00l1lwf450hzr51m	Flupentixol Tablet, 500 microgram	Oral Solid	Taken by mouth	N/A	tablet	FLUPENTA1	50	200	5	10	0	1.53	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUPENTA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyx00l2lwf4ww15ulx3	Fluphenazine Deconoate Injection, 25 mg/mL	Injectable	Administered via injection	25 mg	ml	FLUDECIN1	50	200	5	10	0	12.21	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUDECIN1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyx00l3lwf4j9vkc2y1	Fluticasone + Salmeterol Inhaler, 250 microgram/50 microgram (60 Doses)	Other Medicines	General medication	N/A	unit	FLUSALGA1	50	200	5	10	0	275	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUSALGA1	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyx00l4lwf4vfzep2rz	Fluticasone MDI, 125 microgram (120 Dose)	Other Medicines	General medication	N/A	unit	FLUTICGA2	50	200	5	10	0	191.73	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUTICGA2	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620jyx00l5lwf4g3c8odfq	Fluticasone MDI, 250 microgram (120 Dose)	Other Medicines	General medication	N/A	unit	FLUTICGA3	50	200	5	10	0	128.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUTICGA3	0	t	t	2025-11-19 13:44:34.313	2025-11-19 13:44:34.313
cmi620k4d00l6lwf4m15v09sb	Fluvastatin Capsule, 20 mg	Other Medicines	General medication	20 mg	capsule	FLUVASCA1	50	200	5	10	0	1.69	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FLUVASCA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4d00l7lwf4qcu1ew1m	Folic Acid Tablet, 5 mg	Vitamin Supplement	Folate for anemia and pregnancy	5 mg	tablet	FOLACITA1	50	200	5	10	0	0.05	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FOLACITA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4d00l8lwf4ek23ffw0	Furosemide Injection, 10 mg/mL in 2 mL	Diuretic	Loop diuretic for edema and hypertension	10 mg	ampoule	FUROSEIN1	50	200	5	10	0	1.56	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FUROSEIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4d00l9lwf4avsydw7b	Furosemide Tablet, 40 mg	Diuretic	Loop diuretic for edema and hypertension	40 mg	tablet	FUROSETA1	50	200	5	10	0	0.28	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	FUROSETA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4d00lalwf4fmflxjnr	Gelatin Infusion (Succinylated Gelatin)	Other Medicines	General medication	N/A	ml	GELATIIN1	50	200	5	10	0	82.61	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GELATIIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4d00lblwf4jumh06dq	Gentamicin Ear Drops, 0.3%	Other Medicines	General medication	0.3%	ml	GENTAMED1	50	200	5	10	0	6.62	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GENTAMED1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00lclwf4102a8bpl	Gentamicin Eye Drops, 0.3%	Other Medicines	General medication	0.3%	ml	GENTAMID1	50	200	5	10	0	6.6	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GENTAMID1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00ldlwf49j3ikqcx	Gentamicin Injection, 40 mg/mL in 2 mL	Injectable	Administered via injection	40 mg	ampoule	GENTAMIN1	50	200	5	10	0	2.75	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GENTAMIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00lelwf46k3aox72	Glibenclamide Tablet, 5 mg	Antidiabetic	Sulfonylurea for type 2 diabetes	5 mg	tablet	GLIBENTA1	50	200	5	10	0	0.15	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GLIBENTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00lflwf4ma3khxr5	Gliclazide Tablet, 80 mg	Oral Solid	Taken by mouth	80 mg	tablet	GLICLATA1	50	200	5	10	0	0.66	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GLICLATA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00lglwf407hzocro	Glimepiride Tablet, 1 mg	Oral Solid	Taken by mouth	1 mg	tablet	GLIMEPTA1	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GLIMEPTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00lhlwf45vw36y0n	Glimepiride Tablet, 2 mg	Oral Solid	Taken by mouth	2 mg	tablet	GLIMEPTA2	50	200	5	10	0	0.19	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GLIMEPTA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00lilwf43qqgcosl	Glimepiride Tablet, 3 mg	Oral Solid	Taken by mouth	3 mg	tablet	GLIMEPTA3	50	200	5	10	0	1.57	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GLIMEPTA3	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00ljlwf4qiwjq8se	Glimepiride Tablet, 4 mg	Oral Solid	Taken by mouth	4 mg	tablet	GLIMEPTA4	50	200	5	10	0	0.24	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GLIMEPTA4	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00lklwf4m3pzcvya	Glucagon Injection, 1 mg	Injectable	Administered via injection	1 mg	ampoule	GLUCAGIN1	50	200	5	10	0	455.4	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GLUCAGIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00lllwf4xremtozx	Glyceryl Trinitrate Sublingual Tablet, 500 microgram	Oral Solid	Taken by mouth	N/A	tablet	GLTRSUTA1	50	200	5	10	0	121.63	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GLTRSUTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00lmlwf4ygsmmaji	Granisetron Injection, 1 mg/1mL	Injectable	Administered via injection	1 mg	ampoule	GRANISIN1	50	200	5	10	0	83.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GRANISIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4e00lnlwf40l8wlhir	Granisetron Tablet, 1 mg	Oral Solid	Taken by mouth	1 mg	tablet	GRANISTA1	50	200	5	10	0	17.88	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GRANISTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lolwf4dxfdppq8	Griseofulvin Suspension, 125 mg/5 mL	Oral Liquid	Liquid oral medication	125 mg	ml	GRISEOSU1	50	200	5	10	0	29.26	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GRISEOSU1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lplwf4utq4i6xf	Griseofulvin Tablet, 125 mg	Oral Solid	Taken by mouth	125 mg	tablet	GRISEOTA1	50	200	5	10	0	0.35	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GRISEOTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lqlwf4a583orah	Griseofulvin Tablet, 500 mg	Oral Solid	Taken by mouth	500 mg	tablet	GRISEOTA2	50	200	5	10	0	2.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GRISEOTA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lrlwf4aw2lhuet	Guaifenesin Containing Expectorant Syrup	Oral Liquid	Liquid oral medication	N/A	ml	GUAIFESY1	50	200	5	10	0	34.92	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	GUAIFESY1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lslwf4tnxmf45i	Haloperidol Injection, 5 mg/5 mL	Injectable	Administered via injection	5 mg	ampoule	HALOPEIN1	50	200	5	10	0	9.24	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HALOPEIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00ltlwf46o2yyw3u	Haloperidol Tablet, 0.5 mg	Oral Solid	Taken by mouth	0.5 mg	tablet	HALOPETA1	50	200	5	10	0	0.95	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HALOPETA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lulwf4nrre3ejv	Haloperidol Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	HALOPETA2	50	200	5	10	0	1.41	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HALOPETA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lvlwf4ngkk8bry	Haloperidol Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	HALOPETA3	50	200	5	10	0	1.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HALOPETA3	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lwlwf4d8ygcpga	Heparin Injection, 1000 units/mL in 5 mL	Injectable	Administered via injection	1000 units	ampoule	HEPARIIN1	50	200	5	10	0	111.21	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HEPARIIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lxlwf4wf0geb2f	Heparin Injection, 5000 units/mL in 1mL	Injectable	Administered via injection	5000 units	ampoule	HEPARIIN2	50	200	5	10	0	90.86	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HEPARIIN2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lylwf49pppxjic	Heparin Injection, 5000 units/mL in 5 mL	Injectable	Administered via injection	5000 units	vial	HEPARIIN3	50	200	5	10	0	137.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HEPARIIN3	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4f00lzlwf4wkhl8reo	Human Immune Tetanus Globulins Injection, 250 IU/mL	Injectable	Administered via injection	250 IU	ml	HUIMTEIN1	50	200	5	10	0	42.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HUIMTEIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00m0lwf4khvt289l	Human Immune Tetanus Globulins Injection, 500 IU/mL	Injectable	Administered via injection	500 IU	ml	HUIMTEIN2	50	200	5	10	0	42.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HUIMTEIN2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00m1lwf43fqkhqv4	Hydralazine Injection, 20 mg	Injectable	Administered via injection	20 mg	ampoule	HYDRALIN1	50	200	5	10	0	26.95	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HYDRALIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00m2lwf400f3a5vg	Hydralazine Tablet, 25 mg	Oral Solid	Taken by mouth	25 mg	tablet	HYDRALTA1	50	200	5	10	0	3.25	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HYDRALTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00m3lwf4p89rvte9	Hydrocortisone Cream, 1%	Topical	Applied to skin	1%	g	HYDROCCR1	50	200	5	10	0	12.06	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HYDROCCR1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00m4lwf49f99wc66	Hydrocortisone Eye Drops, 1%	Other Medicines	General medication	1%	ml	HYDROCID1	50	200	5	10	0	16.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HYDROCID1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00m5lwf4z51ao63l	Hydrocortisone Eye Ointment, 1%	Topical	Applied to skin	1%	g	HYDROCEO1	50	200	5	10	0	13.86	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HYDROCEO1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00m6lwf405bg5w4o	Hydrocortisone Sodium Succinate Injection, 100 mg	Injectable	Administered via injection	100 mg	vial	HYSOSUIN1	50	200	5	10	0	11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HYSOSUIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00m7lwf44uxn0sga	Hydroxocobalamin Injection, 1 mg/mL	Injectable	Administered via injection	1 mg	ml	HYDROXIN1	50	200	5	10	0	9.61	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HYDROXIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00m8lwf4kfgf1rev	Hydroxyurea Capsule, 500mg	Other Medicines	General medication	500mg	capsule	HYDROXCA1	50	200	5	10	0	3.52	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HYDROXCA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00m9lwf4idvqy35h	Hyoscine Butylbromide Injection, 20 mg/ mL	Injectable	Administered via injection	20 mg	ml	HYOBUTIN1	50	200	5	10	0	6.6	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HYOBUTIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00malwf4tnnqkffc	Hyoscine Butylbromide Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	HYOBUTTA1	50	200	5	10	0	0.99	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	HYOBUTTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4g00mblwf431n2ruvl	Ibuprofen Suspension, 100 mg/5 mL	NSAID	Pain, inflammation, and fever	100 mg	ml	IBUPROSU1	50	200	5	10	0	12.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	IBUPROSU1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00mclwf4088xv3kp	Ibuprofen Tablet, 200 mg	NSAID	Pain, inflammation, and fever	200 mg	tablet	IBUPROTA1	50	200	5	10	0	0.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	IBUPROTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00mdlwf48gy0u421	Ibuprofen Tablet, 400 mg	NSAID	Pain, inflammation, and fever	400 mg	tablet	IBUPROTA2	50	200	5	10	0	0.28	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	IBUPROTA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00melwf4gem4thri	Imipramine Tablet, 25 mg	Oral Solid	Taken by mouth	25 mg	tablet	IMIPRATA1	50	200	5	10	0	0.33	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	IMIPRATA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00mflwf4v4j76s57	Insulin premixed (30/70) HM Injection, 100 units/mL in 10 mL	Antidiabetic	Hormone replacement for diabetes	100 units	vial	INPRMIIN1	50	200	5	10	0	84.42	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	INPRMIIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00mglwf41ni08n6v	Insulin Soluble HM, 100 units/mL in 10 mL	Antidiabetic	Hormone replacement for diabetes	100 units	vial	INSSOLIN1	50	200	5	10	0	80.87	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	INSSOLIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00mhlwf4flmg2k6s	Intralipid Solution (for TPN)	Other Medicines	General medication	N/A	ml	INTRALSO1	50	200	5	10	0	165	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	INTRALSO1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00milwf4yqnc673m	Ipratropium Bromide Nebulizer 250 micrograms	Other Medicines	General medication	N/A	unit	IPRBROGA1	50	200	5	10	0	11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	IPRBROGA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00mjlwf4me6rdqhj	Ipratropium Bromide Nebulizer 500 micrograms	Other Medicines	General medication	N/A	unit	IPRBROGA2	50	200	5	10	0	14.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	IPRBROGA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00mklwf4630ytit1	Iron (III) Polymaltose Complex Capsule	Other Medicines	General medication	N/A	capsule	IROPOLCA1	50	200	5	10	0	0.28	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	IROPOLCA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00mllwf4ymt9ks2h	Iron (III) Polymaltose Complex Suspension	Oral Liquid	Liquid oral medication	N/A	ml	IROPOLSU1	50	200	5	10	0	9.75	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	IROPOLSU1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00mmlwf4q2nrbt5y	Iron Dextran Injection, 100mg/2mL	Injectable	Administered via injection	100mg	ml	IRODEXIN1	50	200	5	10	0	27.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	IRODEXIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00mnlwf4cwjl937r	Iron Sucrose Injection, 20 mg/mL	Injectable	Administered via injection	20 mg	ampoule	IROSUCIN1	50	200	5	10	0	60.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	IROSUCIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4h00molwf43m2gbkmk	Isophane Insulin Injection (HM), 100 units/mL in 10 mL	Antidiabetic	Hormone replacement for diabetes	100 units	vial	ISOINSIN1	50	200	5	10	0	100.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ISOINSIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mplwf4z29g7irc	Isosorbide Dinitrate Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	ISODINTA1	50	200	5	10	0	1.97	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ISODINTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mqlwf4m5oz7xrc	Itraconazole Capsule, 100 mg	Other Medicines	General medication	100 mg	capsule	ITRACOCA1	50	200	5	10	0	5.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ITRACOCA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mrlwf4rqbqztd5	Itraconazole Suspension, 10 mg/mL	Oral Liquid	Liquid oral medication	10 mg	ml	ITRACOSU1	50	200	5	10	0	7.33	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ITRACOSU1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mslwf4al7nushy	Ketoconazole Cream, 30g	Topical	Applied to skin	30g	tube	KETOCOCR1	50	200	5	10	0	22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	KETOCOCR1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mtlwf45g7e2mlu	Ketoconazole Tablet, 200 mg	Oral Solid	Taken by mouth	200 mg	tablet	KETOCOTA1	50	200	5	10	0	8.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	KETOCOTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mulwf4k424q3n5	Labetalol Injection, 5 mg/mL in 20 mL	Injectable	Administered via injection	5 mg	ampoule	LABETAIN1	50	200	5	10	0	85.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LABETAIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mvlwf4kuwikftq	Labetalol Tablet, 100 mg	Oral Solid	Taken by mouth	100 mg	tablet	LABETATA1	50	200	5	10	0	3.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LABETATA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mwlwf4v8e5lbnj	Labetalol Tablet, 200 mg	Oral Solid	Taken by mouth	200 mg	tablet	LABETATA2	50	200	5	10	0	4.4	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LABETATA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mxlwf4cjj5dcv0	Lactulose Liquid 3.1–3.7 g/5 mL	Other Medicines	General medication	3.7 g	ml	LACTULLI1	50	200	5	10	0	75.35	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LACTULLI1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mylwf4r8rciqti	Lamotrigine Tablet 100 mg	Oral Solid	Taken by mouth	100 mg	tablet	LAMOTRTA1	50	200	5	10	0	2.05	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LAMOTRTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00mzlwf42gsuen3g	Levofloxacin infusion 500mg	Other Medicines	General medication	500mg	ml	LEVOFLIN1	50	200	5	10	0	189.64	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LEVOFLIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00n0lwf4821u7pjf	Levothyroxine Sodium Tablet, 100 microgram	Oral Solid	Taken by mouth	N/A	tablet	LEVSODTA3	50	200	5	10	0	1.32	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LEVSODTA3	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4i00n1lwf4eacijod9	Levothyroxine Sodium Tablet, 25 microgram	Oral Solid	Taken by mouth	N/A	tablet	LEVSODTA1	50	200	5	10	0	0.92	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LEVSODTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00n2lwf49my6g17b	Levothyroxine Sodium Tablet, 50 microgram	Oral Solid	Taken by mouth	N/A	tablet	LEVSODTA2	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LEVSODTA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00n3lwf4e628h1xv	Lidocaine Cream, 2%	Topical	Applied to skin	2%	g	LIDOCACR1	50	200	5	10	0	38.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LIDOCACR1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00n4lwf44fdyv793	Lidocaine Gel, 4%	Other Medicines	General medication	4%	g	LIDOCAGE1	50	200	5	10	0	76.67	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LIDOCAGE1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00n5lwf4ja797uf2	Lisinopril + Hydrochlorthiazide Tablet, (10 mg + 12.5 mg)	Oral Solid	Taken by mouth	10 mg	tablet	LISHYDTA1	50	200	5	10	0	1.26	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LISHYDTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00n6lwf47xlrvux0	Lisinopril + Hydrochlorthiazide Tablet, (20 mg + 12.5 mg)	Oral Solid	Taken by mouth	20 mg	tablet	LISHYDTA2	50	200	5	10	0	2.57	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LISHYDTA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00n7lwf423hd7kn3	Lisinopril Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	LISINOTA3	50	200	5	10	0	0.21	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LISINOTA3	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00n8lwf4853t8q8g	Lisinopril Tablet, 2.5 mg	Oral Solid	Taken by mouth	2.5 mg	tablet	LISINOTA1	50	200	5	10	0	0.47	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LISINOTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00n9lwf46oa6jxff	Lisinopril Tablet, 20 mg	Oral Solid	Taken by mouth	20 mg	tablet	LISINOTA4	50	200	5	10	0	0.9	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LISINOTA4	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00nalwf4i6sgmkvs	Lisinopril Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	LISINOTA2	50	200	5	10	0	0.38	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LISINOTA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00nblwf4xe9d1sm0	Lodoxamide Eye Drops, 0.1%	Other Medicines	General medication	0.1%	ml	LODOXAID1	50	200	5	10	0	8.9	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LODOXAID1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00nclwf4uzsilsr0	Lorazepam Injection, 4 mg/mL in 1mL	Injectable	Administered via injection	4 mg	ampoule	LORAZEIN1	50	200	5	10	0	93.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LORAZEIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00ndlwf4pkm45hl5	Lorazepam Tablet, 1 mg	Oral Solid	Taken by mouth	1 mg	tablet	LORAZETA1	50	200	5	10	0	1.76	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LORAZETA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00nelwf4d946yd8d	Lorazepam Tablet, 2 mg	Oral Solid	Taken by mouth	2 mg	tablet	LORAZETA2	50	200	5	10	0	0.44	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LORAZETA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00nflwf4x39lcoa5	Lorazepam Tablet, 2.5 mg	Oral Solid	Taken by mouth	2.5 mg	tablet	LORAZETA3	50	200	5	10	0	2.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LORAZETA3	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00nglwf456oqh9w3	Losartan Tablet, 100 mg	Antihypertensive	ARB for hypertension	100 mg	tablet	LOSARTTA3	50	200	5	10	0	0.54	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LOSARTTA3	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00nhlwf4idr9rdep	Losartan Tablet, 25 mg	Antihypertensive	ARB for hypertension	25 mg	tablet	LOSARTTA1	50	200	5	10	0	1.32	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LOSARTTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4j00nilwf4fcy2n7ec	Losartan Tablet, 50 mg	Antihypertensive	ARB for hypertension	50 mg	tablet	LOSARTTA2	50	200	5	10	0	0.26	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	LOSARTTA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00njlwf4ryktud6q	Magnesium Sulphate Injection, 20% (10 mL)	Injectable	Administered via injection	20%	ampoule	MAGSULIN1	50	200	5	10	0	5.96	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MAGSULIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nklwf4bgn3mbgf	Magnesium Sulphate Injection, 50% (10 mL)	Injectable	Administered via injection	50%	ampoule	MAGSULIN3	50	200	5	10	0	19.54	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MAGSULIN3	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nllwf4uebdx65g	Magnesium Sulphate Salt	Other Medicines	General medication	N/A	g	MAGSULPO1	50	200	5	10	0	33	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MAGSULPO1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nmlwf46i4bk10l	Magnesium Trisilicate + Aluminium Hydroxide Mixture	Other Medicines	General medication	N/A	ml	MATRALMI1	50	200	5	10	0	22.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MATRALMI1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nnlwf41squv6l8	Magnesium Trisilicate + Aluminium Hydroxide Tablet	Oral Solid	Taken by mouth	N/A	tablet	MATRALTA1	50	200	5	10	0	0.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MATRALTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nolwf4ihv1ssr1	Magnesium Trisilicate Mixture	Other Medicines	General medication	N/A	ml	MAGTRIMI1	50	200	5	10	0	7.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MAGTRIMI1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nplwf4kcj9ie7v	Magnesium Trisilicate Tablet, 500 mg	Oral Solid	Taken by mouth	500 mg	tablet	MAGTRITA1	50	200	5	10	0	3.58	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MAGTRITA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nqlwf43p2jcwxc	Mannitol Injection, 10%	Injectable	Administered via injection	10%	ml	MANNITIN1	50	200	5	10	0	36.04	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MANNITIN1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nrlwf4i010f950	Mannitol Injection, 20%	Injectable	Administered via injection	20%	ml	MANNITIN2	50	200	5	10	0	30.42	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MANNITIN2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nslwf4x8p4qwpq	Mebendazole Suspension, 100 mg/5 mL	Anthelmintic	Treatment of pinworm and roundworm	100 mg	ml	MEBENDSU1	50	200	5	10	0	44	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MEBENDSU1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00ntlwf4fvtvkj9f	Mebendazole Tablet, 100 mg	Anthelmintic	Treatment of pinworm and roundworm	100 mg	tablet	MEBENDTA1	50	200	5	10	0	14.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MEBENDTA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nulwf4pzege85l	Mebendazole Tablet, 500 mg	Anthelmintic	Treatment of pinworm and roundworm	500 mg	tablet	MEBENDTA2	50	200	5	10	0	23.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MEBENDTA2	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nvlwf4yazmpavr	Mebeverine Tablet, 135 mg	Oral Solid	Taken by mouth	135 mg	tablet	MEBEVETA1	50	200	5	10	0	1.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MEBEVETA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nwlwf4kq0jmsdz	Medroxyprogesterone Acetate Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	MEDACETA1	50	200	5	10	0	8.53	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MEDACETA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620k4k00nxlwf4ervcb1uz	Mefenamic Acid Capsule, 250 mg	Other Medicines	General medication	250 mg	capsule	MEFACICA1	50	200	5	10	0	2.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MEFACICA1	0	t	t	2025-11-19 13:44:34.522	2025-11-19 13:44:34.522
cmi620kca00nylwf48p0lwujw	Mefenamic Acid Tablet, 500 mg	Oral Solid	Taken by mouth	500 mg	tablet	MEFACITA1	50	200	5	10	0	1.29	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MEFACITA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kca00nzlwf4o5wvw5nd	Metformin Tablet, 500 mg	Antidiabetic	First-line oral treatment for type 2 diabetes	500 mg	tablet	METFORTA1	50	200	5	10	0	0.15	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METFORTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kca00o0lwf47p1l6joe	Methotrexate Injection, 2.5 mg/ mL	Injectable	Administered via injection	2.5 mg	ampoule	METHOTIN1	50	200	5	10	0	0.11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METHOTIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kca00o1lwf4ba11cvej	Methotrexate Injection, 25 mg/ mL in 2mL	Injectable	Administered via injection	25 mg	ampoule	METHOTIN2	50	200	5	10	0	54.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METHOTIN2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kca00o2lwf4v87x1nc9	Methotrexate Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	METHOTTA2	50	200	5	10	0	38.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METHOTTA2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcb00o3lwf4v7sn5npu	Methotrexate Tablet, 2.5 mg	Oral Solid	Taken by mouth	2.5 mg	tablet	METHOTTA1	50	200	5	10	0	3.08	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METHOTTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcb00o4lwf4rglelmp2	Methyl Cellulose Eye Drops, 0.3%	Other Medicines	General medication	0.3%	ml	METCELID1	50	200	5	10	0	22.55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METCELID1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcb00o5lwf4ok16c42p	Methyldopa Tablet, 250 mg	Oral Solid	Taken by mouth	250 mg	tablet	METHYLTA1	50	200	5	10	0	0.93	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METHYLTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcb00o6lwf445jiv8r2	Metoclopramide Injection, 5 mg/mL in 2 mL	Injectable	Administered via injection	5 mg	ampoule	METOCLIN1	50	200	5	10	0	8.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METOCLIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcb00o7lwf4ti03f8mn	Metoclopramide Syrup, 5 mg/5 mL	Oral Liquid	Liquid oral medication	5 mg	ml	METOCLSY1	50	200	5	10	0	92.4	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METOCLSY1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcb00o8lwf4g61ripbm	Metoclopramide Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	METOCLTA1	50	200	5	10	0	0.77	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METOCLTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcb00o9lwf4jpsxl3ty	Metolazone Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	METOLATA1	50	200	5	10	0	5.39	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METOLATA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcb00oalwf4ty2h1v9w	Metoprolol Tartrate Tablet 100 mg	Oral Solid	Taken by mouth	100 mg	tablet	METTARTA1	50	200	5	10	0	1.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METTARTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcc00oblwf41u5b8r60	Metronidazole Injection, 5 mg/mL in 100 mL	Antibiotic	Antiprotozoal and anaerobic bacterial infections	5 mg	bottle	METRONIN1	50	200	5	10	0	9.01	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METRONIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcc00oclwf4b1113u46	Metronidazole Suppository, 500 mg	Antibiotic	Antiprotozoal and anaerobic bacterial infections	500 mg	unit	METRONRE1	50	200	5	10	0	15.95	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METRONRE1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcc00odlwf4c2dal5g7	Metronidazole Suspension, 100 mg/5 mL (as benzoate)	Antibiotic	Antiprotozoal and anaerobic bacterial infections	100 mg	ml	METRONSU1	50	200	5	10	0	10.92	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METRONSU1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcc00oelwf432t9kpe2	Metronidazole Suspension, 200 mg/5 mL(as benzoate)	Antibiotic	Antiprotozoal and anaerobic bacterial infections	200 mg	ml	METRONSU2	50	200	5	10	0	12.02	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METRONSU2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcc00oflwf495han0bn	Metronidazole Tablet, 200 mg	Antibiotic	Antiprotozoal and anaerobic bacterial infections	200 mg	tablet	METRONTA1	50	200	5	10	0	0.13	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METRONTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcc00oglwf4dbfaj56q	Metronidazole Tablet, 400 mg	Antibiotic	Antiprotozoal and anaerobic bacterial infections	400 mg	tablet	METRONTA2	50	200	5	10	0	0.25	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	METRONTA2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcc00ohlwf4xt8ihatx	Miconazole + Hydrocortisone Cream, 2% + 1%	Topical	Applied to skin	2%	g	MICHYDCR1	50	200	5	10	0	51.86	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MICHYDCR1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcc00oilwf4obyfkpp3	Miconazole Cream, 2%	Topical	Applied to skin	2%	g	MICONACR1	50	200	5	10	0	38.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MICONACR1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcd00ojlwf46blfirj0	Miconazole Oral Gel, 25 mg/mL	Other Medicines	General medication	25 mg	g	MICONAOG1	50	200	5	10	0	73.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MICONAOG1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcd00oklwf44510umii	Miconazole Ovule, 400 mg	Other Medicines	General medication	400 mg	unit	MICONAVP1	50	200	5	10	0	46.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MICONAVP1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcd00ollwf4nqd8tngt	Midazolam Injection, 5 mg/5mL	Injectable	Administered via injection	5 mg	ampoule	MIDAZOIN1	50	200	5	10	0	70.13	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MIDAZOIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcd00omlwf49qlb3ibx	Midazolam Tablet, 15 mg	Oral Solid	Taken by mouth	15 mg	tablet	MIDAZOTA1	50	200	5	10	0	13.89	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MIDAZOTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcd00onlwf441op3xos	Morphine Injection, 10 mg/mL	Injectable	Administered via injection	10 mg	ampoule	MORPHIIN1	50	200	5	10	0	21.97	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MORPHIIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcd00oolwf4apni5774	Morphine Injection, 10 mg/mL (Preservative Free)	Injectable	Administered via injection	10 mg	ampoule	MORPHIIN2	50	200	5	10	0	39.55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MORPHIIN2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcd00oplwf48lsipp25	Morphine Sulphate Tablet, 10 mg (Slow release)	Oral Solid	Taken by mouth	10 mg	tablet	MORSULTA1	50	200	5	10	0	5.61	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MORSULTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kce00oqlwf4au3j21lr	Morphine Sulphate Tablet, 30 mg (Slow release)	Oral Solid	Taken by mouth	30 mg	tablet	MORSULTA2	50	200	5	10	0	8.83	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MORSULTA2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kce00orlwf4gtkb23tq	Multivitamin Drops	Vitamin Supplement	Essential nutrient supplementation	N/A	ml	MULTIVDR1	50	200	5	10	0	24.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MULTIVDR1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kce00oslwf4ck648d7i	Multivitamin Syrup	Vitamin Supplement	Essential nutrient supplementation	N/A	ml	MULTIVSY1	50	200	5	10	0	8.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MULTIVSY1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kce00otlwf4w4ey6l66	Multivitamin Tablet	Vitamin Supplement	Essential nutrient supplementation	N/A	tablet	MULTIVTA1	50	200	5	10	0	0.07	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	MULTIVTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kce00oulwf4wdapyywz	Naloxone Injection, 400 microgram/mL in 1mL	Injectable	Administered via injection	1mL	ampoule	NALOXOIN1	50	200	5	10	0	28.54	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NALOXOIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kce00ovlwf4snrn86n9	Neomycin Tablet, 500 mg	Oral Solid	Taken by mouth	500 mg	tablet	NEOMYCTA1	50	200	5	10	0	55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NEOMYCTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kce00owlwf4z5e6okkr	Neostigmine Bromide Tablet, 15 mg	Oral Solid	Taken by mouth	15 mg	tablet	NEOBROTA1	50	200	5	10	0	6.47	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NEOBROTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kce00oxlwf4gtlqx7te	Neostigmine Injection, 2.5 mg/mL	Injectable	Administered via injection	2.5 mg	ampoule	NEOSTIIN1	50	200	5	10	0	27.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NEOSTIIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcf00oylwf4nridnv0i	Nifedipine Capsule, 10 mg	Other Medicines	General medication	10 mg	capsule	NIFEDICA1	50	200	5	10	0	1.21	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NIFEDICA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcf00ozlwf4uuresuoe	Nifedipine Tablet, 10 mg (slow release)	Oral Solid	Taken by mouth	10 mg	tablet	NIFEDITA1	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NIFEDITA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcf00p0lwf4mee8mqmm	Nifedipine Tablet, 20 mg (slow release)	Oral Solid	Taken by mouth	20 mg	tablet	NIFEDITA2	50	200	5	10	0	0.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NIFEDITA2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcf00p1lwf49y2anxk9	Nifedipine Tablet, 30 mg (GITS)	Oral Solid	Taken by mouth	30 mg	tablet	NIFEDITA3	50	200	5	10	0	0.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NIFEDITA3	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcf00p2lwf41bz3ts99	Nitrofurantoin Tablet, 100 mg	Oral Solid	Taken by mouth	100 mg	tablet	NITROFTA1	50	200	5	10	0	4.18	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NITROFTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcf00p3lwf4prebbd03	Norethisterone Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	NORETHTA1	50	200	5	10	0	2.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NORETHTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcf00p4lwf4wku3dx2b	Nystatin Ointment, 100,000 IU	Antifungal	Oral and topical candidiasis	000 IU	g	NYSTATOI1	50	200	5	10	0	25.74	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NYSTATOI1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcf00p5lwf4phl2p52u	Nystatin Pessary, 100,000 IU	Antifungal	Oral and topical candidiasis	000 IU	unit	NYSTATTA1	50	200	5	10	0	52.71	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NYSTATTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcg00p6lwf4vm5sezd0	Nystatin Suspension, 100,000 IU/mL	Antifungal	Oral and topical candidiasis	000 IU	ml	NYSTATSU1	50	200	5	10	0	71.17	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NYSTATSU1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcg00p7lwf4zbo4xa90	Nystatin Tablet, 500,000 IU	Antifungal	Oral and topical candidiasis	000 IU	tablet	NYSTATTA2	50	200	5	10	0	36.14	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	NYSTATTA2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcg00p8lwf4ka6v08as	Olanzapine Tablet 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	OLANZATA1	50	200	5	10	0	1.63	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	OLANZATA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcg00p9lwf42ahd80yl	Omeprazole Injection, 40 mg	Antacid	Proton pump inhibitor for acid reflux	40 mg	vial	OMEPRAIN2	50	200	5	10	0	19.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	OMEPRAIN2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcg00palwf46fe6ned1	Omeprazole Tablet, 20 mg	Antacid	Proton pump inhibitor for acid reflux	20 mg	tablet	OMEPRATA1	50	200	5	10	0	0.23	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	OMEPRATA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcg00pblwf478ryqerk	Ondansetrone Tablet, 4 mg	Oral Solid	Taken by mouth	4 mg	tablet	ONDANSTA1	50	200	5	10	0	1.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ONDANSTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcg00pclwf4jvtf96yv	Oral Rehydration Salts Powder	Other Medicines	General medication	N/A	sachet	ORRESAPO1	50	200	5	10	0	1.47	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	ORRESAPO1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcg00pdlwf4lqwfoep7	Oxytocin Injection, 10 units/mL	Injectable	Administered via injection	10 units	ampoule	OXYTOCIN2	50	200	5	10	0	10.19	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM7	f	OXYTOCIN2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kch00pelwf42b2128cl	Oxytocin Injection, 5 units/mL	Injectable	Administered via injection	5 units	ampoule	OXYTOCIN1	50	200	5	10	0	16.47	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	OXYTOCIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kch00pflwf47dfblbcc	Paclitaxel Injection, 100 mg/16.7mL	Injectable	Administered via injection	100 mg	vial	PACLITIN1	50	200	5	10	0	343.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PACLITIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kch00pglwf4gy80xs26	Paracetamol Suppository, 125 mg	Analgesic	Pain relief and fever reduction	125 mg	unit	PARACERE1	50	200	5	10	0	1.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PARACERE1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kch00phlwf4ijl7htde	Paracetamol Suppository, 250 mg	Analgesic	Pain relief and fever reduction	250 mg	unit	PARACERE2	50	200	5	10	0	2.34	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PARACERE2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kch00pilwf4vn4sfms4	Paracetamol Suppository, 500 mg	Analgesic	Pain relief and fever reduction	500 mg	unit	PARACERE3	50	200	5	10	0	2.41	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PARACERE3	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kch00pjlwf4khz0tbpa	Paracetamol Syrup, 120 mg/5 mL	Analgesic	Pain relief and fever reduction	120 mg	ml	PARACESY1	50	200	5	10	0	8.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PARACESY1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kch00pklwf4rnbe0r8k	Paracetamol Tablet, 500 mg	Analgesic	Pain relief and fever reduction	500 mg	tablet	PARACETA1	50	200	5	10	0	0.12	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PARACETA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kch00pllwf4dw5gt8b0	Paraffin Liquid	Other Medicines	General medication	N/A	ml	PARAFFLI1	50	200	5	10	0	25.3	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PARAFFLI1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kci00pmlwf4nl7rwtb8	Pethidine Injection, 50 mg/mL in 2 mL	Injectable	Administered via injection	50 mg	ampoule	PETHIDIN1	50	200	5	10	0	39.56	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PETHIDIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kci00pnlwf4upzlajet	Phenobarbital Elixir, 15 mg/5 mL	Other Medicines	General medication	15 mg	ml	PHENOBEL1	50	200	5	10	0	60.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHENOBEL1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kci00polwf40ihus0lc	Phenobarbital Injection, 200 mg/mL	Injectable	Administered via injection	200 mg	ampoule	PHENOBIN1	50	200	5	10	0	34.58	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHENOBIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kci00pplwf4zv1ixkqm	Phenobarbital Tablet, 30 mg	Oral Solid	Taken by mouth	30 mg	tablet	PHENOBTA1	50	200	5	10	0	0.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHENOBTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kci00pqlwf4bov4xdw1	Phenobarbital Tablet, 60 mg	Oral Solid	Taken by mouth	60 mg	tablet	PHENOBTA2	50	200	5	10	0	0.33	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHENOBTA2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kci00prlwf4evve5pcn	Phenol 5% in Almond Oil Injection	Injectable	Administered via injection	5%	ml	PHENOLIN1	50	200	5	10	0	0.38	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHENOLIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kci00pslwf4ch3hl7q8	Phenoxymethyl Penicillin Tablet, 250 mg	Oral Solid	Taken by mouth	250 mg	tablet	PHEPENTA1	50	200	5	10	0	0.84	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHEPENTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kci00ptlwf4q48846x6	Phenytoin Injection, 50 mg/mL in 5 mL	Injectable	Administered via injection	50 mg	ampoule	PHENYTIN1	50	200	5	10	0	38.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHENYTIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcj00pulwf48u44jqi2	Phenytoin Sodium Capsule, 100 mg	Other Medicines	General medication	100 mg	capsule	PHENYTCA2	50	200	5	10	0	1.54	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHENYTCA2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcj00pvlwf40tza94za	Phenytoin Sodium Tablet, 100 mg	Oral Solid	Taken by mouth	100 mg	tablet	PHENYTTA1	50	200	5	10	0	1.32	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHENYTTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcj00pwlwf4haopnfrk	Phytomenadione Injection, 1 mg/mL (Paediatric)	Injectable	Administered via injection	1 mg	ampoule	PHYTOMIN1	50	200	5	10	0	6.93	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHYTOMIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcj00pxlwf4phzifs38	Phytomenadione Injection, 10 mg/mL	Injectable	Administered via injection	10 mg	ampoule	PHYTOMIN2	50	200	5	10	0	12.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PHYTOMIN2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcj00pylwf4plxipxv7	Pilocarpine Eye Drops, 2%	Other Medicines	General medication	2%	ml	PILOCAID1	50	200	5	10	0	35.75	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PILOCAID1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcj00pzlwf433b0tg9y	Pilocarpine Eye Drops, 4%	Other Medicines	General medication	4%	ml	PILOCAID2	50	200	5	10	0	19.25	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PILOCAID2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcj00q0lwf48fhz57nb	Pioglitazone Tablet, 15 mg	Oral Solid	Taken by mouth	15 mg	tablet	PIOGLITA1	50	200	5	10	0	0.74	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PIOGLITA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcj00q1lwf4mklszhk0	Pioglitazone Tablet, 30 mg	Oral Solid	Taken by mouth	30 mg	tablet	PIOGLITA2	50	200	5	10	0	0.91	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PIOGLITA2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kck00q2lwf4ef8ovtu1	Piracetam Tablet, 800 mg	Oral Solid	Taken by mouth	800 mg	tablet	PIRACETA1	50	200	5	10	0	5.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PIRACETA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kck00q3lwf4bzo98qzu	Potassium Chloride Injection, 20 mEq/10 mL	Injectable	Administered via injection	10 mL	vial	POTCHLIN1	50	200	5	10	0	17.16	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	POTCHLIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kck00q4lwf4eg6pvgop	Potassium Chloride Tablet, 600 mg (Enteric Coated)	Oral Solid	Taken by mouth	600 mg	tablet	POTCHLTA1	50	200	5	10	0	3.85	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	POTCHLTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kck00q5lwf4u1o1h3ry	Potassium Citrate Mixture BP	Other Medicines	General medication	N/A	ml	POTCITMI1	50	200	5	10	0	9.35	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	POTCITMI1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kck00q6lwf4m5rndb6b	Povidone Iodine Aqueous Solution, 10%	Other Medicines	General medication	10%	ml	POVIDOSO1	50	200	5	10	0	46.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	POVIDOSO1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kck00q7lwf45jitg24d	Povidone Iodine Ointment, 10%	Topical	Applied to skin	10%	g	POVIDOOI1	50	200	5	10	0	28.88	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	POVIDOOI1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kck00q8lwf46bcbphwv	Praziquantel Tablet, 600 mg	Oral Solid	Taken by mouth	600 mg	tablet	PRAZIQTA1	50	200	5	10	0	11.55	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PRAZIQTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcl00q9lwf42p15s1pj	Sodium Chloride Infusion, 0.45% (250 mL)	Other Medicines	General medication	0.45%	ml	SODCHLIN1	50	200	5	10	0	48.38	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SODCHLIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcl00qalwf4r6qjvwv7	Sodium Chloride Infusion, 0.9% (500 mL)	Other Medicines	General medication	0.9%	ml	SODCHLIN3	50	200	5	10	0	14.36	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SODCHLIN3	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcl00qblwf48ntnyfeg	Sodium Chloride Nasal Drops, 0.9%	Other Medicines	General medication	0.9%	ml	SODCHLND1	50	200	5	10	0	6.6	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SODCHLND1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcl00qclwf4bqc1s9mx	Sodium Valproate Capsule (Slow Release), 500 mg	Other Medicines	General medication	500 mg	capsule	SODVALCA2	50	200	5	10	0	11.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SODVALCA2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcl00qdlwf42gtrpxeo	Sodium Valproate Capsule, 200 mg	Other Medicines	General medication	200 mg	capsule	SODVALCA1	50	200	5	10	0	3.08	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SODVALCA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcl00qelwf4kzwxf8h9	Sodium Valproate Syrup, 200 mg/5 Ml	Oral Liquid	Liquid oral medication	200 mg	ml	SODVALSY1	50	200	5	10	0	294.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SODVALSY1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcl00qflwf4u76h0ivu	Sodium Valproate Tablet, 200 mg	Oral Solid	Taken by mouth	200 mg	tablet	SODVALTA1	50	200	5	10	0	3.28	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SODVALTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcl00qglwf4in5dgugo	Soothing Agent + Local Anaesthetic + Steroid Ointment	Topical	Applied to skin	N/A	g	SOANSTOI1	50	200	5	10	0	85.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SOANSTOI1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcm00qhlwf4a05ohpin	Soothing Agent + Local Anaesthetic + Steroid Suppository	Other Medicines	General medication	N/A	unit	SOANSTRE1	50	200	5	10	0	7.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SOANSTRE1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcm00qilwf42lnuv0w2	Soothing Agent + Local Anaesthetic Ointment	Topical	Applied to skin	N/A	g	SOOANAOI1	50	200	5	10	0	42.46	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SOOANAOI1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcm00qjlwf4sbgu6csi	Soothing Agent + Local Anaesthetic Suppository	Other Medicines	General medication	N/A	unit	SOOANARE1	50	200	5	10	0	6.93	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SOOANARE1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcm00qklwf4pcmm4ppn	Spironolactone Tablet, 25 mg	Oral Solid	Taken by mouth	25 mg	tablet	SPIRONTA1	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SPIRONTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcm00qllwf4mdvxh2i0	Spironolactone Tablet, 50 mg	Oral Solid	Taken by mouth	50 mg	tablet	SPIRONTA2	50	200	5	10	0	1.45	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SPIRONTA2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcm00qmlwf4dmt008k5	Streptokinase Injection, 100,000 unit-vial	Injectable	Administered via injection	000 unit	vial	STREPTIN1	50	200	5	10	0	432	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	STREPTIN1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcn00qnlwf4tp04nvcq	Streptokinase Injection, 250,000 unit-vial	Injectable	Administered via injection	000 unit	vial	STREPTIN2	50	200	5	10	0	482	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	STREPTIN2	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcn00qolwf4rexjjlu7	Streptokinase Injection, 750,000 unit-vial	Injectable	Administered via injection	000 unit	vial	STREPTIN3	50	200	5	10	0	557.19	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	STREPTIN3	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620kcn00qplwf41z56pw6p	Sulfasalazine Tablet, 500 mg	Oral Solid	Taken by mouth	500 mg	tablet	SULFASTA1	50	200	5	10	0	4.73	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SULFASTA1	0	t	t	2025-11-19 13:44:34.805	2025-11-19 13:44:34.805
cmi620ke800qqlwf4mcq9lssu	Tamoxifen Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	TAMOXITA1	50	200	5	10	0	2.97	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TAMOXITA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke800qrlwf45axqdwoy	Tamoxifen Tablet, 20 mg	Oral Solid	Taken by mouth	20 mg	tablet	TAMOXITA2	50	200	5	10	0	4.11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TAMOXITA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke800qslwf4adr0zv06	Tamsulosin Capsule, 400 microgram	Other Medicines	General medication	N/A	capsule	TAMSULCA1	50	200	5	10	0	2.18	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TAMSULCA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900qtlwf48wjzktjh	Terazosin Tablet, 2 mg	Oral Solid	Taken by mouth	2 mg	tablet	TERAZOTA1	50	200	5	10	0	2.86	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TERAZOTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900qulwf4ila66324	Terazosin Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	TERAZOTA2	50	200	5	10	0	4.38	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TERAZOTA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900qvlwf4im5p8wcu	Terbinafine HCl Tablet, 250 mg	Oral Solid	Taken by mouth	250 mg	tablet	TERBINTA1	50	200	5	10	0	3.02	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TERBINTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900qwlwf4o35gi6gl	Tetracycline Capsule, 250 mg	Other Medicines	General medication	250 mg	capsule	TETRACCA1	50	200	5	10	0	0.28	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TETRACCA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900qxlwf4nj66qkcw	Tetracycline Eye Ointment, 1%	Topical	Applied to skin	1%	g	TETRACEO2	50	200	5	10	0	8.25	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TETRACEO2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900qylwf4ks2u1ibq	Theophylline Tablet, 200 mg (slow release)	Oral Solid	Taken by mouth	200 mg	tablet	THEOPHTA1	50	200	5	10	0	16.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	THEOPHTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900qzlwf4mb6q9wla	Thiamine Injection, 100mg/2mL	Injectable	Administered via injection	100mg	ampoule	THIAMIIN1	50	200	5	10	0	11	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	THIAMIIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900r0lwf4jra8c2au	Thiamine Tablet, 100 mg	Oral Solid	Taken by mouth	100 mg	tablet	THIAMITA2	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	THIAMITA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900r1lwf4blf2t2o4	Thiamine Tablet, 50 mg	Oral Solid	Taken by mouth	50 mg	tablet	THIAMITA1	50	200	5	10	0	0.66	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	THIAMITA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900r2lwf4wavdt3gu	Tiabendazole Tablet, 500 mg	Oral Solid	Taken by mouth	500 mg	tablet	TIABENTA1	50	200	5	10	0	1.58	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TIABENTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900r3lwf42qg49x2q	Timolol Maleate Eye Drops, 0.5%	Other Medicines	General medication	0.5%	ml	TIMMALID1	50	200	5	10	0	13.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TIMMALID1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900r4lwf4a10jsk1w	Tinidazole Capsule, 500 mg	Other Medicines	General medication	500 mg	capsule	TINIDACA1	50	200	5	10	0	28.05	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TINIDACA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900r5lwf4y8shila3	Tirofiban Infusion, 250 micrograms/ml (concentrate)	Other Medicines	General medication	N/A	ml	TIROFIIN2	50	200	5	10	0	514.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TIROFIIN2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900r6lwf4frrb9k6g	Tirofiban Infusion, 50 micrograms/mL	Other Medicines	General medication	N/A	ml	TIROFIIN1	50	200	5	10	0	371.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TIROFIIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900r7lwf4w33w8yzr	Tolbutamide Tablet, 500 mg	Oral Solid	Taken by mouth	500 mg	tablet	TOLBUTTA1	50	200	5	10	0	9.65	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TOLBUTTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900r8lwf449osipjx	Tranexamic Acid Capsule, 250 mg	Other Medicines	General medication	250 mg	capsule	TRAACICA1	50	200	5	10	0	3.52	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TRAACICA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900r9lwf4ig71y06b	Tranexamic Acid Injection, 500 mg/5mL	Injectable	Administered via injection	500 mg	ampoule	TRAACIIN1	50	200	5	10	0	26.82	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TRAACIIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900ralwf4m0vcsz2k	Tranexamic Acid Tablet, 500 mg	Oral Solid	Taken by mouth	500 mg	tablet	TRAACITA1	50	200	5	10	0	4.67	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TRAACITA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900rblwf4rp8e1vx8	Trihexyphenidyl Tablet, 2 mg	Oral Solid	Taken by mouth	2 mg	tablet	TRIHEXTA1	50	200	5	10	0	2.64	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TRIHEXTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900rclwf4gs95o6x5	Trihexyphenidyl Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	TRIHEXTA2	50	200	5	10	0	1.82	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	TRIHEXTA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900rdlwf42jxnn4tg	Verapamil Tablet, 40 mg	Oral Solid	Taken by mouth	40 mg	tablet	VERAPATA1	50	200	5	10	0	0.44	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	VERAPATA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900relwf4krcab0pn	Verapamil Tablet, 80 mg	Oral Solid	Taken by mouth	80 mg	tablet	VERAPATA2	50	200	5	10	0	1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	VERAPATA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900rflwf48zpqnthd	Vincristine Injection 1 mg Intravenous	Injectable	Administered via injection	1 mg	vial	VINCRIIN1	50	200	5	10	0	67.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	VINCRIIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620ke900rglwf4jc9gkx56	Vincristine Injection 2 mg Intravenous	Injectable	Administered via injection	2 mg	vial	VINCRIIN2	50	200	5	10	0	20.91	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	VINCRIIN2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rhlwf4ut7tojms	Warfarin Tablet, 1 mg	Oral Solid	Taken by mouth	1 mg	tablet	WARFARTA1	50	200	5	10	0	0.36	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	WARFARTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rilwf4324pk3om	Warfarin Tablet, 3 mg	Oral Solid	Taken by mouth	3 mg	tablet	WARFARTA2	50	200	5	10	0	0.61	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	WARFARTA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rjlwf4hqh12znq	Warfarin Tablet, 5 mg (scored)	Oral Solid	Taken by mouth	5 mg	tablet	WARFARTA3	50	200	5	10	0	0.81	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	WARFARTA3	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rklwf4ci4wqf0c	Water for Injection	Injectable	Administered via injection	N/A	ml	WATFORIN1	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	WATFORIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rllwf4q1ggqek1	Zinc Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	ZINCOOTA1	50	200	5	10	0	0.18	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	ZINCOOTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rmlwf4o2vqkqlc	Zinc Tablet, 20 mg	Oral Solid	Taken by mouth	20 mg	tablet	ZINCOOTA2	50	200	5	10	0	0.16	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	ZINCOOTA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rnlwf44rjknqu5	Prazosin Tablet, 500 microgram	Oral Solid	Taken by mouth	N/A	tablet	PRAZOSTA1	50	200	5	10	0	2.9	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PRAZOSTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rolwf40v45iud6	Prednisolone 5mg Dispersible Tablets	Oral Solid	Taken by mouth	5mg	tablet	PREDNIDT1	50	200	5	10	0	0.28	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PREDNIDT1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rplwf4ak5k89kw	Prednisolone Eye Drops, 0.5%	Other Medicines	General medication	0.5%	ml	PREDNIID1	50	200	5	10	0	15.4	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PREDNIID1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rqlwf4434faorp	Prednisolone Eye Drops, 1%	Other Medicines	General medication	1%	ml	PREDNIID2	50	200	5	10	0	22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PREDNIID2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rrlwf450xkfmxp	Prednisolone Oral Solution, 5mg/5ml	Other Medicines	General medication	5mg	ml	PREDNISY1	50	200	5	10	0	62.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PREDNISY1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rslwf4kehnmsmc	Prednisolone Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	PREDNITA1	50	200	5	10	0	0.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PREDNITA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rtlwf4grh1jy57	Primidone Tablet, 250 mg	Oral Solid	Taken by mouth	250 mg	tablet	PRIMIDTA1	50	200	5	10	0	0.33	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PRIMIDTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rulwf41jntv5bt	Procaine Benzylpenicillin Injection, 4 MU	Injectable	Administered via injection	N/A	vial	PROBENIN1	50	200	5	10	0	9.9	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROBENIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rvlwf4y54h8a5e	Promethazine Hydrochloride Elixir, 5 mg/5 mL	Other Medicines	General medication	5 mg	ml	PROHYDEL1	50	200	5	10	0	9.21	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROHYDEL1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rwlwf4q0qzhspj	Promethazine Hydrochloride Injection, 25 mg/mL in 2 mL	Injectable	Administered via injection	25 mg	ampoule	PROHYDIN1	50	200	5	10	0	2.2	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROHYDIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rxlwf4bmnspqgm	Promethazine Hydrochloride Tablet, 25 mg	Oral Solid	Taken by mouth	25 mg	tablet	PROMETTA1	50	200	5	10	0	0.28	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROMETTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rylwf4her3fu7c	Promethazine Theoclate Tablet, 25 mg	Oral Solid	Taken by mouth	25 mg	tablet	PROTHETA1	50	200	5	10	0	0.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROTHETA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00rzlwf4c2e202ks	Propranolol Injection, 1 mg/mL in 1mL	Injectable	Administered via injection	1 mg	ampoule	PROPRAIN1	50	200	5	10	0	0.18	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROPRAIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00s0lwf45ud6pgij	Propranolol Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	PROPRATA1	50	200	5	10	0	0.84	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROPRATA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00s1lwf4jo7g55di	Propranolol Tablet, 40 mg	Oral Solid	Taken by mouth	40 mg	tablet	PROPRATA2	50	200	5	10	0	0.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROPRATA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00s2lwf4nvolohup	Propranolol Tablet, 80 mg	Oral Solid	Taken by mouth	80 mg	tablet	PROPRATA3	50	200	5	10	0	1.88	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROPRATA3	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00s3lwf4j4uworn6	Propylthiouracil Tablet, 50 mg	Oral Solid	Taken by mouth	50 mg	tablet	PROPYLTA1	50	200	5	10	0	5.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROPYLTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kea00s4lwf4kvw47bd7	Protamine Sulphate Injection, 10 mg/mL in 5 mL	Injectable	Administered via injection	10 mg	ampoule	PROSULIN1	50	200	5	10	0	47.52	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	PROSULIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00s5lwf4telcm3qw	Quinine Injection, 300 mg/mL in 2 mL	Injectable	Administered via injection	300 mg	ampoule	QUINININ1	50	200	5	10	0	4.67	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	QUINININ1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00s6lwf4jpzjvcxv	Quinine Syrup, 75 mg/5 mL	Oral Liquid	Liquid oral medication	75 mg	ml	QUININSY1	50	200	5	10	0	12.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	QUININSY1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00s7lwf46qg16rbk	Quinine Tablet, 300 mg	Oral Solid	Taken by mouth	300 mg	tablet	QUININTA1	50	200	5	10	0	1.47	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	QUININTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00s8lwf4q035zalh	Ramipril Tablet, 2.5 mg	Oral Solid	Taken by mouth	2.5 mg	tablet	RAMIPRTA1	50	200	5	10	0	1.01	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RAMIPRTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00s9lwf4i9bseh1q	Ramipril Tablet, 5 mg	Oral Solid	Taken by mouth	5 mg	tablet	RAMIPRTA2	50	200	5	10	0	1.22	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RAMIPRTA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00salwf499unbrar	Ranitidine Tablet, 150 mg	Antacid	H2 blocker for ulcers and reflux	150 mg	tablet	RANITITA1	50	200	5	10	0	1.99	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RANITITA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00sblwf4kxfu4q7b	Retinol Soft Capsule, 200,000 IU	Other Medicines	General medication	000 IU	capsule	RETSOFCA2	50	200	5	10	0	0.24	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RETSOFCA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00sclwf4ftz51gn9	Ringer - Lactate Solution, 500 mL	Other Medicines	General medication	500 mL	ml	RINLACSO1	50	200	5	10	0	13.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RINLACSO1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00sdlwf4d9x4s24f	Risperidone Liquid, 1 mg/mL	Other Medicines	General medication	1 mg	ml	RISPERLI1	50	200	5	10	0	4.29	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RISPERLI1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00selwf47i2v5xsz	Risperidone Tablet, 1 mg	Oral Solid	Taken by mouth	1 mg	tablet	RISPERTA2	50	200	5	10	0	1.1	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RISPERTA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00sflwf4zapveezq	Risperidone Tablet, 2 mg	Oral Solid	Taken by mouth	2 mg	tablet	RISPERTA3	50	200	5	10	0	1.6	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RISPERTA3	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00sglwf4da8a38d1	Risperidone Tablet, 500 microgram	Oral Solid	Taken by mouth	N/A	tablet	RISPERTA1	50	200	5	10	0	5.67	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RISPERTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00shlwf4pyu45om8	Rituximab Injection 100mg/10ml	Injectable	Administered via injection	100mg	vial	RITUXIIN1	50	200	5	10	0	2300	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RITUXIIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00silwf4nbckrbnl	Rituximab Injection 500mg/10ml	Injectable	Administered via injection	500mg	vial	RITUXIIN2	50	200	5	10	0	6515	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	RITUXIIN2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00sjlwf4c8d7ujiq	Salbutamol Inhaler, 100 microgram/metered dose, 200 doses	Other Medicines	General medication	N/A	unit	SALBUTGA1	50	200	5	10	0	49.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SALBUTGA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00sklwf4sqbr95h2	Salbutamol Nebules, 2.5 mg	Other Medicines	General medication	2.5 mg	unit	SALBUTGA2	50	200	5	10	0	10.12	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SALBUTGA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00sllwf40z3quhn6	Salbutamol Nebules, 5 mg	Other Medicines	General medication	5 mg	unit	SALBUTGA3	50	200	5	10	0	17.6	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SALBUTGA3	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00smlwf4x74r5zk7	Salbutamol Sulphate Injection, 500 microgram/mL in 1mL	Injectable	Administered via injection	1mL	ampoule	SALSULIN1	50	200	5	10	0	16.5	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SALSULIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00snlwf4flusdd0q	Salbutamol Syrup, 2 mg/5 mL	Oral Liquid	Liquid oral medication	2 mg	ml	SALBUTSY1	50	200	5	10	0	18.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SALBUTSY1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00solwf4gem14mm4	Salicylic Acid Ointment, 2%	Topical	Applied to skin	2%	g	SALACIOI1	50	200	5	10	0	18.7	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SALACIOI1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00splwf4c8x2vn34	Secnidazole Tablet, 500 mg	Oral Solid	Taken by mouth	500 mg	tablet	SECNIDTA1	50	200	5	10	0	8.8	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SECNIDTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00sqlwf4x7q0388z	Selenium Sulphide Shampoo, 2.5%	Other Medicines	General medication	2.5%	ml	SELSULSH1	50	200	5	10	0	12.93	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SELSULSH1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620keb00srlwf48kwvjsqz	Sertraline Tablet, 100 mg	Oral Solid	Taken by mouth	100 mg	tablet	SERTRATA2	50	200	5	10	0	1.93	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SERTRATA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00sslwf4jua2d20o	Sertraline Tablet, 50 mg	Oral Solid	Taken by mouth	50 mg	tablet	SERTRATA1	50	200	5	10	0	1.34	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SERTRATA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00stlwf4t540jjpm	Silver Sulphadiazine Cream, 1%	Topical	Applied to skin	1%	g	SILSULCR1	50	200	5	10	0	26.4	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SILSULCR1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00sulwf46h99wsnv	Simple Linctus BPC (Paediatric)	Other Medicines	General medication	N/A	ml	SIMLINSY1	50	200	5	10	0	6.97	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SIMLINSY1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00svlwf4fv57aco8	Simple Linctus BPC	Other Medicines	General medication	N/A	ml	SIMLINSY2	50	200	5	10	0	7.54	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SIMLINSY2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00swlwf438ic834n	Simvastatin Tablet, 10 mg	Oral Solid	Taken by mouth	10 mg	tablet	SIMVASTA1	50	200	5	10	0	0.66	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SIMVASTA1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00sxlwf4a1mbp6pg	Simvastatin Tablet, 20 mg	Oral Solid	Taken by mouth	20 mg	tablet	SIMVASTA2	50	200	5	10	0	1.02	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SIMVASTA2	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00sylwf4byglrx00	Simvastatin Tablet, 40 mg	Oral Solid	Taken by mouth	40 mg	tablet	SIMVASTA3	50	200	5	10	0	1.26	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SIMVASTA3	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00szlwf4bzqzcx29	Simvastatin Tablet, 80 mg	Oral Solid	Taken by mouth	80 mg	tablet	SIMVASTA4	50	200	5	10	0	1.98	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SIMVASTA4	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00t0lwf44elnptyl	Sodium Bicarbonate Injection, 8.4% in 10 mL	Injectable	Administered via injection	8.4%	ampoule	SODBICIN1	50	200	5	10	0	50.05	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	SODBICIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00t1lwf4suz8u2fa	5-Fluorouracil Injection, 50 mg/mL	Injectable	Administered via injection	50 mg	ml	5FLUORIN1	50	200	5	10	0	14.46	t	f	f	f	NHIS Supplier	\N	BATCH-MI620JM8	f	5FLUORIN1	0	t	t	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00t2lwf4kstevddg	Surgical Spirit	medical_supply	Antiseptic for skin preparation	70%	bottle	SURG-SPIRIT	35	100	5	10	0	2.7	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM8	f	SUPP-SURG1	0	t	f	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00t3lwf4686z4u0l	Cotton Wool	medical_supply	Sterile cotton wool for wound care	N/A	pack	COTTON-PACK	60	200	5	10	0	1.8	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM8	f	SUPP-COTTON1	0	t	f	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00t4lwf4wgr5jkaf	Gauze Swabs	medical_supply	Sterile gauze for wound dressing	N/A	pack	GAUZE-PACK	55	180	5	10	0	2.25	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM8	f	SUPP-GAUZE1	0	t	f	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00t5lwf4380rodsi	Bandage	medical_supply	Crepe bandage for support	N/A	roll	BANDAGE-CREPE	50	160	5	10	0	1.98	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM8	f	SUPP-BAND1	0	t	f	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00t6lwf4j0kv6vsu	Adhesive Plaster	medical_supply	Surgical tape for dressings	N/A	roll	PLASTER-ROLL	45	140	5	10	0	1.35	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM8	f	SUPP-PLAST1	0	t	f	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00t7lwf4sez1k9lu	Surgical Gloves	medical_supply	Disposable sterile gloves	N/A	box	GLOVES-BOX	30	80	5	10	0	13.5	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM8	f	SUPP-GLOV1	0	t	f	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
cmi620kec00t8lwf4m5rsbycg	Face Mask	medical_supply	Surgical face mask	N/A	box	MASK-BOX	40	120	5	10	0	10.8	t	f	f	f	Medical Supplies Ltd	\N	BATCH-MI620JM8	f	SUPP-MASK1	0	t	f	2025-11-19 13:44:34.88	2025-11-19 13:44:34.88
\.


--
-- Data for Name: StockTransaction; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."StockTransaction" (id, "stockItemId", "transactionType", quantity, "balanceAfter", reference, notes, "transactionDate", "performedBy", "createdAt", "updatedAt") FROM stdin;
cmi620tpd00valwf4i7teg645	cmi620jsg00eklwf4z86y7gzd	dispense	-6	194	MED-MAL-001	Dispensed for malaria treatment - Artesunate	2025-11-19 13:44:46.945	Pharmacist Nana Kwaku	2025-11-19 13:44:46.945	2025-11-19 13:44:46.945
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."User" (id, username, password, "fullName", role, email, phone, "licenseNumber", specialization, "isActive", "createdAt", "updatedAt", "departmentId") FROM stdin;
cmi4w23pn0000lwdloibukura	admin	$2b$10$O5AiyZBF4/ZQ7kblO6NIJeHhV90N3WnsjSUGvIWxvmizhNap1RpDS	System Administrator	admin	admin@hospital.com	+233244111111	ADMIN-001	\N	t	2025-11-18 18:10:02.666	2025-11-18 18:10:02.666	\N
cmi620m0u00u1lwf4uyccj1bv	doctor1	$2b$10$IcVey8BUqAmuKUjL2GP7leUrTh9gXYPN2adkgZgaQrCyu2Ye2nxNa	Dr. Kofi Mensah	doctor	doctor@hospital.com	+233244222222	MD-12345	General Medicine	t	2025-11-19 13:44:36.991	2025-11-19 13:44:36.991	\N
cmi620m7l00u2lwf4u06igy6j	nurse1	$2b$10$I0Q.TQVsbKEZiM5SeXgskeuE7U0FALekr67VeC2NhPYItrxROIeDa	Nurse Akua Johnson	nurse	nurse@hospital.com	+233244333333	RN-54321	\N	t	2025-11-19 13:44:37.233	2025-11-19 13:44:37.233	\N
cmi620mdr00u3lwf4db9x06d6	midwife1	$2b$10$3F.vW8vf0XGlxoJYeca1pO2rldx335NyA7hirMVB3CkKvjqIBrN5u	Midwife Abena Serwaa	midwife	midwife@hospital.com	+233244444444	MW-98765	\N	t	2025-11-19 13:44:37.455	2025-11-19 13:44:37.455	\N
cmi620miy00u4lwf4tjhpyrv0	records1	$2b$10$/W0JZO1SSu3OmHooTUK5JOrXh1D6HfkHu.KROW/MqgY/fmrVwU5F6	Records Officer Kwame Osei	records	records@hospital.com	+233244555555	\N	\N	t	2025-11-19 13:44:37.642	2025-11-19 13:44:37.642	\N
cmi620mrv00u5lwf4ltytgjcg	lab1	$2b$10$X/ZXIp2ICw2sdgZ1MuA1i.kbbzGiPLg1KGRpKZOcvyaJA/O0gClme	Lab Tech Yaw Asare	lab_tech	lab@hospital.com	+233244666666	LT-11223	\N	t	2025-11-19 13:44:37.964	2025-11-19 13:44:37.964	\N
cmi620n7o00u6lwf4jozu9beu	sonographer1	$2b$10$tsNGC8/HmR3fwcjuiwt6Ee/Lp.qCLJLoa/5RkkNtmGcv1MuI.idnW	Sonographer Ama Boateng	sonographer	sonographer@hospital.com	+233244999999	SN-11223	\N	t	2025-11-19 13:44:38.532	2025-11-19 13:44:38.532	\N
cmi620ndj00u7lwf47lrzz1j2	pharma1	$2b$10$tSqHvLITy1zTzs0pbDG7yu5e8eXSaIXdH3qAf/2LDvHfoiTlicuMu	Pharmacist Nana Kwaku	pharmacist	pharma@hospital.com	+233244777777	PH-44556	\N	t	2025-11-19 13:44:38.743	2025-11-19 13:44:38.743	\N
cmi620nkm00u8lwf4nnot43tv	accounts1	$2b$10$Uyp6MhjDqiIbP9iyfWPvReSU5XZsO/da23CaJ6SO6KJbB3ywHsfEm	Accountant Esi Brown	accounts	accounts@hospital.com	+233244888888	\N	\N	t	2025-11-19 13:44:38.998	2025-11-19 13:44:38.998	\N
\.


--
-- Data for Name: Vitals; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Vitals" (id, "attendanceId", "patientId", "bloodPressure", temperature, pulse, respiration, spo2, weight, height, bmi, notes, "recordedById", "recordedAt", "createdAt", "updatedAt") FROM stdin;
cmi620qvl00uwlwf40w9noy88	cmi620oog00uelwf450ps58ln	cmi620o2t00ualwf4pt2dvjh1	130/85	38.2	92	18	97	65	165	23.9	\N	cmi620m7l00u2lwf4u06igy6j	2025-11-19 13:44:43.281	2025-11-19 13:44:43.281	2025-11-19 13:44:43.281
\.


--
-- Data for Name: Ward; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public."Ward" (id, "wardName", "wardType", "totalBeds", "occupiedBeds", "cashDailyRate", "nhisDailyRate", "insuranceDailyRate", "isNHISCovered", "nhisRequiresAuth", "isPrivateInsExempted", "isPending", "requiresAuthorization", "tariffCode", "vatRate", "isTaxable", "createdAt", "updatedAt") FROM stdin;
cmi620kjy00tclwf4tlkcd1nl	General Ward A	general	20	0	50	40	60	t	f	f	f	f	WARD-GEN-A	0	t	2025-11-19 13:44:35.086	2025-11-19 13:44:35.086
cmi620kjy00tdlwf4p9wuujr2	Maternity Ward	maternity	12	0	80	60	100	t	f	f	f	f	WARD-MAT	0	t	2025-11-19 13:44:35.086	2025-11-19 13:44:35.086
cmi620kjy00telwf4yu614ffb	ICU	icu	6	0	200	150	250	t	t	f	f	t	WARD-ICU	0	t	2025-11-19 13:44:35.086	2025-11-19 13:44:35.086
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public.appointments (id, "appointmentNumber", "patientId", "doctorId", "departmentId", title, description, "appointmentDate", "appointmentTime", duration, status, type, "isNHIS", "nhisCCC", "reminderSent", "checkedIn", "checkedInAt", "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public.departments (id, name, description, "headId", "isActive", color, icon, "createdAt", "updatedAt") FROM stdin;
cmi4w26zv00uclwdlloeu8oq6	Internal Medicine	General and specialist medical care	cmi620m0u00u1lwf4uyccj1bv	t	#3B82F6	\N	2025-11-18 18:10:06.955	2025-11-19 13:44:39.926
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: hospital_user
--

COPY public.notifications (id, "userId", title, message, type, priority, "actionType", "actionId", "actionUrl", "isRead", "isArchived", "createdAt", "readAt") FROM stdin;
cmi620tvu00vclwf4mtgog28o	cmi620m0u00u1lwf4uyccj1bv	New Malaria Case	Malaria case registered for Ama Serwaa. Test results available.	clinical	medium	lab_results	cmi620oog00uelwf450ps58ln	/attendances/cmi620oog00uelwf450ps58ln	f	f	2025-11-19 13:44:47.178	\N
\.


--
-- Name: AdmissionSecondaryDiagnosis AdmissionSecondaryDiagnosis_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."AdmissionSecondaryDiagnosis"
    ADD CONSTRAINT "AdmissionSecondaryDiagnosis_pkey" PRIMARY KEY (id);


--
-- Name: Admission Admission_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceDiagnosis AttendanceDiagnosis_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."AttendanceDiagnosis"
    ADD CONSTRAINT "AttendanceDiagnosis_pkey" PRIMARY KEY (id);


--
-- Name: Attendance Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY (id);


--
-- Name: Bed Bed_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Bed"
    ADD CONSTRAINT "Bed_pkey" PRIMARY KEY (id);


--
-- Name: Bill Bill_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_pkey" PRIMARY KEY (id);


--
-- Name: ConsultationType ConsultationType_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ConsultationType"
    ADD CONSTRAINT "ConsultationType_pkey" PRIMARY KEY (id);


--
-- Name: Diagnosis Diagnosis_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Diagnosis"
    ADD CONSTRAINT "Diagnosis_pkey" PRIMARY KEY (id);


--
-- Name: GDRGTariff GDRGTariff_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."GDRGTariff"
    ADD CONSTRAINT "GDRGTariff_pkey" PRIMARY KEY (id);


--
-- Name: Hospital Hospital_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Hospital"
    ADD CONSTRAINT "Hospital_pkey" PRIMARY KEY (id);


--
-- Name: InsuranceClaim InsuranceClaim_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."InsuranceClaim"
    ADD CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY (id);


--
-- Name: InsuranceProvider InsuranceProvider_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."InsuranceProvider"
    ADD CONSTRAINT "InsuranceProvider_pkey" PRIMARY KEY (id);


--
-- Name: LabTestTemplate LabTestTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."LabTestTemplate"
    ADD CONSTRAINT "LabTestTemplate_pkey" PRIMARY KEY (id);


--
-- Name: LabTest LabTest_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."LabTest"
    ADD CONSTRAINT "LabTest_pkey" PRIMARY KEY (id);


--
-- Name: Medication Medication_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Medication"
    ADD CONSTRAINT "Medication_pkey" PRIMARY KEY (id);


--
-- Name: Patient Patient_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Patient"
    ADD CONSTRAINT "Patient_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: ProcedureTemplate ProcedureTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ProcedureTemplate"
    ADD CONSTRAINT "ProcedureTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Procedure Procedure_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Procedure"
    ADD CONSTRAINT "Procedure_pkey" PRIMARY KEY (id);


--
-- Name: ScanTemplate ScanTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ScanTemplate"
    ADD CONSTRAINT "ScanTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Scan Scan_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Scan"
    ADD CONSTRAINT "Scan_pkey" PRIMARY KEY (id);


--
-- Name: ServiceCatalog ServiceCatalog_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceCatalog"
    ADD CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY (id);


--
-- Name: ServiceRendered ServiceRendered_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceRendered"
    ADD CONSTRAINT "ServiceRendered_pkey" PRIMARY KEY (id);


--
-- Name: StockItem StockItem_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."StockItem"
    ADD CONSTRAINT "StockItem_pkey" PRIMARY KEY (id);


--
-- Name: StockTransaction StockTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."StockTransaction"
    ADD CONSTRAINT "StockTransaction_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vitals Vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Vitals"
    ADD CONSTRAINT "Vitals_pkey" PRIMARY KEY (id);


--
-- Name: Ward Ward_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Ward"
    ADD CONSTRAINT "Ward_pkey" PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: AdmissionSecondaryDiagnosis_admissionId_diagnosisId_diagnos_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "AdmissionSecondaryDiagnosis_admissionId_diagnosisId_diagnos_key" ON public."AdmissionSecondaryDiagnosis" USING btree ("admissionId", "diagnosisId", "diagnosisType");


--
-- Name: Admission_admissionNumber_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Admission_admissionNumber_idx" ON public."Admission" USING btree ("admissionNumber");


--
-- Name: Admission_admissionNumber_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Admission_admissionNumber_key" ON public."Admission" USING btree ("admissionNumber");


--
-- Name: Admission_attendanceId_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Admission_attendanceId_key" ON public."Admission" USING btree ("attendanceId");


--
-- Name: Admission_patientId_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Admission_patientId_idx" ON public."Admission" USING btree ("patientId");


--
-- Name: Admission_status_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Admission_status_idx" ON public."Admission" USING btree (status);


--
-- Name: Attendance_attendanceNumber_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Attendance_attendanceNumber_key" ON public."Attendance" USING btree ("attendanceNumber");


--
-- Name: Attendance_attendanceType_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Attendance_attendanceType_idx" ON public."Attendance" USING btree ("attendanceType");


--
-- Name: Attendance_dateTime_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Attendance_dateTime_idx" ON public."Attendance" USING btree ("dateTime");


--
-- Name: Attendance_insuranceClaimId_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Attendance_insuranceClaimId_key" ON public."Attendance" USING btree ("insuranceClaimId");


--
-- Name: Attendance_patientId_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Attendance_patientId_idx" ON public."Attendance" USING btree ("patientId");


--
-- Name: Attendance_paymentMode_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Attendance_paymentMode_idx" ON public."Attendance" USING btree ("paymentMode");


--
-- Name: Attendance_status_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Attendance_status_idx" ON public."Attendance" USING btree (status);


--
-- Name: Bed_currentPatientId_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Bed_currentPatientId_key" ON public."Bed" USING btree ("currentPatientId");


--
-- Name: Bed_wardId_bedNumber_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Bed_wardId_bedNumber_key" ON public."Bed" USING btree ("wardId", "bedNumber");


--
-- Name: Bill_attendanceId_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Bill_attendanceId_idx" ON public."Bill" USING btree ("attendanceId");


--
-- Name: Bill_attendanceId_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Bill_attendanceId_key" ON public."Bill" USING btree ("attendanceId");


--
-- Name: Bill_billDate_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Bill_billDate_idx" ON public."Bill" USING btree ("billDate");


--
-- Name: Bill_billNumber_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Bill_billNumber_idx" ON public."Bill" USING btree ("billNumber");


--
-- Name: Bill_billNumber_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Bill_billNumber_key" ON public."Bill" USING btree ("billNumber");


--
-- Name: Bill_patientId_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Bill_patientId_idx" ON public."Bill" USING btree ("patientId");


--
-- Name: Bill_status_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Bill_status_idx" ON public."Bill" USING btree (status);


--
-- Name: ConsultationType_code_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "ConsultationType_code_key" ON public."ConsultationType" USING btree (code);


--
-- Name: Diagnosis_gdrgCode_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Diagnosis_gdrgCode_key" ON public."Diagnosis" USING btree ("gdrgCode");


--
-- Name: GDRGTariff_gdrgCode_effectiveFrom_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "GDRGTariff_gdrgCode_effectiveFrom_idx" ON public."GDRGTariff" USING btree ("gdrgCode", "effectiveFrom");


--
-- Name: GDRGTariff_isActive_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "GDRGTariff_isActive_idx" ON public."GDRGTariff" USING btree ("isActive");


--
-- Name: Hospital_nhisFacilityCode_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Hospital_nhisFacilityCode_key" ON public."Hospital" USING btree ("nhisFacilityCode");


--
-- Name: InsuranceClaim_attendanceId_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "InsuranceClaim_attendanceId_key" ON public."InsuranceClaim" USING btree ("attendanceId");


--
-- Name: InsuranceClaim_claimNumber_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "InsuranceClaim_claimNumber_key" ON public."InsuranceClaim" USING btree ("claimNumber");


--
-- Name: LabTestTemplate_investigationCode_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "LabTestTemplate_investigationCode_key" ON public."LabTestTemplate" USING btree ("investigationCode");


--
-- Name: Patient_folderNumber_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Patient_folderNumber_idx" ON public."Patient" USING btree ("folderNumber");


--
-- Name: Patient_folderNumber_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "Patient_folderNumber_key" ON public."Patient" USING btree ("folderNumber");


--
-- Name: Patient_otherNames_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Patient_otherNames_idx" ON public."Patient" USING btree ("otherNames");


--
-- Name: Patient_paymentMode_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Patient_paymentMode_idx" ON public."Patient" USING btree ("paymentMode");


--
-- Name: Patient_surname_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Patient_surname_idx" ON public."Patient" USING btree (surname);


--
-- Name: Payment_billId_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Payment_billId_idx" ON public."Payment" USING btree ("billId");


--
-- Name: Payment_transactionDate_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Payment_transactionDate_idx" ON public."Payment" USING btree ("transactionDate");


--
-- Name: ProcedureTemplate_procedureCode_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "ProcedureTemplate_procedureCode_key" ON public."ProcedureTemplate" USING btree ("procedureCode");


--
-- Name: ScanTemplate_scanCode_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "ScanTemplate_scanCode_key" ON public."ScanTemplate" USING btree ("scanCode");


--
-- Name: ServiceCatalog_code_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "ServiceCatalog_code_idx" ON public."ServiceCatalog" USING btree (code);


--
-- Name: ServiceCatalog_code_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "ServiceCatalog_code_key" ON public."ServiceCatalog" USING btree (code);


--
-- Name: ServiceCatalog_isPrivateInsuranceExempted_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "ServiceCatalog_isPrivateInsuranceExempted_idx" ON public."ServiceCatalog" USING btree ("isPrivateInsuranceExempted");


--
-- Name: ServiceCatalog_nhisCoverageType_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "ServiceCatalog_nhisCoverageType_idx" ON public."ServiceCatalog" USING btree ("nhisCoverageType");


--
-- Name: ServiceCatalog_nhisServiceCode_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "ServiceCatalog_nhisServiceCode_idx" ON public."ServiceCatalog" USING btree ("nhisServiceCode");


--
-- Name: ServiceCatalog_serviceCategory_serviceType_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "ServiceCatalog_serviceCategory_serviceType_idx" ON public."ServiceCatalog" USING btree ("serviceCategory", "serviceType");


--
-- Name: ServiceCatalog_serviceType_isPending_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "ServiceCatalog_serviceType_isPending_idx" ON public."ServiceCatalog" USING btree ("serviceType", "isPending");


--
-- Name: StockItem_drugCode_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "StockItem_drugCode_key" ON public."StockItem" USING btree ("drugCode");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Vitals_attendanceId_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Vitals_attendanceId_idx" ON public."Vitals" USING btree ("attendanceId");


--
-- Name: Vitals_patientId_idx; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE INDEX "Vitals_patientId_idx" ON public."Vitals" USING btree ("patientId");


--
-- Name: appointments_appointmentNumber_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "appointments_appointmentNumber_key" ON public.appointments USING btree ("appointmentNumber");


--
-- Name: departments_headId_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX "departments_headId_key" ON public.departments USING btree ("headId");


--
-- Name: departments_name_key; Type: INDEX; Schema: public; Owner: hospital_user
--

CREATE UNIQUE INDEX departments_name_key ON public.departments USING btree (name);


--
-- Name: AdmissionSecondaryDiagnosis AdmissionSecondaryDiagnosis_admissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."AdmissionSecondaryDiagnosis"
    ADD CONSTRAINT "AdmissionSecondaryDiagnosis_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES public."Admission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AdmissionSecondaryDiagnosis AdmissionSecondaryDiagnosis_diagnosisId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."AdmissionSecondaryDiagnosis"
    ADD CONSTRAINT "AdmissionSecondaryDiagnosis_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES public."Diagnosis"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Admission Admission_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public."Attendance"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Admission Admission_bedId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES public."Bed"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Admission Admission_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Admission Admission_principalDiagnosisId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_principalDiagnosisId_fkey" FOREIGN KEY ("principalDiagnosisId") REFERENCES public."Diagnosis"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Admission Admission_wardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES public."Ward"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AttendanceDiagnosis AttendanceDiagnosis_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."AttendanceDiagnosis"
    ADD CONSTRAINT "AttendanceDiagnosis_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public."Attendance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceDiagnosis AttendanceDiagnosis_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."AttendanceDiagnosis"
    ADD CONSTRAINT "AttendanceDiagnosis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AttendanceDiagnosis AttendanceDiagnosis_diagnosisId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."AttendanceDiagnosis"
    ADD CONSTRAINT "AttendanceDiagnosis_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES public."Diagnosis"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attendance Attendance_bedId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES public."Bed"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Attendance Attendance_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attendance Attendance_insuranceProviderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES public."InsuranceProvider"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Attendance Attendance_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attendance Attendance_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Attendance Attendance_wardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES public."Ward"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bed Bed_currentPatientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Bed"
    ADD CONSTRAINT "Bed_currentPatientId_fkey" FOREIGN KEY ("currentPatientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bed Bed_wardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Bed"
    ADD CONSTRAINT "Bed_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES public."Ward"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Bill Bill_admissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES public."Admission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bill Bill_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public."Attendance"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Bill Bill_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Bill Bill_insuranceProviderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES public."InsuranceProvider"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bill Bill_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Bill Bill_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: GDRGTariff GDRGTariff_gdrgCode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."GDRGTariff"
    ADD CONSTRAINT "GDRGTariff_gdrgCode_fkey" FOREIGN KEY ("gdrgCode") REFERENCES public."Diagnosis"("gdrgCode") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InsuranceClaim InsuranceClaim_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."InsuranceClaim"
    ADD CONSTRAINT "InsuranceClaim_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public."Attendance"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InsuranceClaim InsuranceClaim_billId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."InsuranceClaim"
    ADD CONSTRAINT "InsuranceClaim_billId_fkey" FOREIGN KEY ("billId") REFERENCES public."Bill"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InsuranceClaim InsuranceClaim_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."InsuranceClaim"
    ADD CONSTRAINT "InsuranceClaim_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InsuranceClaim InsuranceClaim_insuranceProviderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."InsuranceClaim"
    ADD CONSTRAINT "InsuranceClaim_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES public."InsuranceProvider"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InsuranceClaim InsuranceClaim_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."InsuranceClaim"
    ADD CONSTRAINT "InsuranceClaim_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InsuranceClaim InsuranceClaim_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."InsuranceClaim"
    ADD CONSTRAINT "InsuranceClaim_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LabTest LabTest_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."LabTest"
    ADD CONSTRAINT "LabTest_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public."Attendance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LabTest LabTest_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."LabTest"
    ADD CONSTRAINT "LabTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabTest LabTest_performedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."LabTest"
    ADD CONSTRAINT "LabTest_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LabTest LabTest_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."LabTest"
    ADD CONSTRAINT "LabTest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."LabTestTemplate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabTest LabTest_verifiedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."LabTest"
    ADD CONSTRAINT "LabTest_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Medication Medication_administeredById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Medication"
    ADD CONSTRAINT "Medication_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Medication Medication_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Medication"
    ADD CONSTRAINT "Medication_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public."Attendance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Medication Medication_dispensedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Medication"
    ADD CONSTRAINT "Medication_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Medication Medication_prescribedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Medication"
    ADD CONSTRAINT "Medication_prescribedById_fkey" FOREIGN KEY ("prescribedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Medication Medication_stockItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Medication"
    ADD CONSTRAINT "Medication_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES public."StockItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Patient Patient_insuranceProviderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Patient"
    ADD CONSTRAINT "Patient_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES public."InsuranceProvider"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_billId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES public."Bill"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_receivedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Procedure Procedure_assistantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Procedure"
    ADD CONSTRAINT "Procedure_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Procedure Procedure_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Procedure"
    ADD CONSTRAINT "Procedure_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public."Attendance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Procedure Procedure_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Procedure"
    ADD CONSTRAINT "Procedure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Procedure Procedure_performedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Procedure"
    ADD CONSTRAINT "Procedure_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Procedure Procedure_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Procedure"
    ADD CONSTRAINT "Procedure_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."ProcedureTemplate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Scan Scan_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Scan"
    ADD CONSTRAINT "Scan_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public."Attendance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Scan Scan_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Scan"
    ADD CONSTRAINT "Scan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Scan Scan_performedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Scan"
    ADD CONSTRAINT "Scan_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Scan Scan_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Scan"
    ADD CONSTRAINT "Scan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."ScanTemplate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Scan Scan_verifiedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Scan"
    ADD CONSTRAINT "Scan_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceCatalog ServiceCatalog_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceCatalog"
    ADD CONSTRAINT "ServiceCatalog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceCatalog ServiceCatalog_diagnosisId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceCatalog"
    ADD CONSTRAINT "ServiceCatalog_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES public."Diagnosis"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceCatalog ServiceCatalog_labTestTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceCatalog"
    ADD CONSTRAINT "ServiceCatalog_labTestTemplateId_fkey" FOREIGN KEY ("labTestTemplateId") REFERENCES public."LabTestTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceCatalog ServiceCatalog_procedureTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceCatalog"
    ADD CONSTRAINT "ServiceCatalog_procedureTemplateId_fkey" FOREIGN KEY ("procedureTemplateId") REFERENCES public."ProcedureTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceCatalog ServiceCatalog_scanTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceCatalog"
    ADD CONSTRAINT "ServiceCatalog_scanTemplateId_fkey" FOREIGN KEY ("scanTemplateId") REFERENCES public."ScanTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceCatalog ServiceCatalog_stockItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceCatalog"
    ADD CONSTRAINT "ServiceCatalog_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES public."StockItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceCatalog ServiceCatalog_wardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceCatalog"
    ADD CONSTRAINT "ServiceCatalog_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES public."Ward"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceRendered ServiceRendered_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceRendered"
    ADD CONSTRAINT "ServiceRendered_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public."Attendance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceRendered ServiceRendered_performedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceRendered"
    ADD CONSTRAINT "ServiceRendered_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ServiceRendered ServiceRendered_serviceItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."ServiceRendered"
    ADD CONSTRAINT "ServiceRendered_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES public."ServiceCatalog"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockTransaction StockTransaction_stockItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."StockTransaction"
    ADD CONSTRAINT "StockTransaction_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES public."StockItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Vitals Vitals_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Vitals"
    ADD CONSTRAINT "Vitals_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public."Attendance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Vitals Vitals_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Vitals"
    ADD CONSTRAINT "Vitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vitals Vitals_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public."Vitals"
    ADD CONSTRAINT "Vitals_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: appointments appointments_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT "appointments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: appointments appointments_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: appointments appointments_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: departments departments_headId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_headId_fkey" FOREIGN KEY ("headId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: hospital_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict ZSIUXFjzamqMzZs7XU2JePc2Po8HZWnH7G1bySH4ErmrlJBJRiVuK3THpEb3Wko

