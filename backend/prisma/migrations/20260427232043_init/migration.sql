-- CreateEnum
CREATE TYPE "GDRGMDC" AS ENUM ('ASUR', 'DENT', 'ENTH', 'INVE', 'MEDI', 'OBGY', 'OPDC', 'OPHT', 'ORTH', 'PAED', 'PSUR', 'RSUR', 'ZOOM');

-- CreateEnum
CREATE TYPE "MorbidityGroup" AS ENUM ('afp_polio', 'meningitis', 'neonatal_tetanus', 'pertussis_whooping_cough', 'diphtheria', 'measles', 'yellow_fever', 'tetanus', 'tuberculosis', 'uncomplicated_malaria_suspected', 'uncomplicated_malaria_tested', 'uncomplicated_malaria_positive', 'uncomplicated_malaria_not_tested_treated', 'uncomplicated_malaria_tested_negative_treated', 'malaria_in_pregnancy_suspected', 'malaria_in_pregnancy_tested', 'malaria_in_pregnancy_positive', 'malaria_in_pregnancy_not_tested_treated', 'malaria_in_pregnancy_tested_negative_treated', 'severe_malaria_lab_confirmed', 'severe_malaria_non_lab_confirmed', 'typhoid_fever', 'suspected_cholera', 'diarrhoea_diseases', 'viral_hepatitis', 'schistosomiasis_bilharzia', 'suspected_guinea_worm', 'onchocerciasis', 'buruli_ulcer', 'leprosy', 'hiv_aids_related_conditions', 'mumps', 'intestinal_worms', 'chicken_pox', 'upper_respiratory_tract_infections', 'pneumonia', 'septicaemia', 'malnutrition', 'obesity', 'anaemia', 'other_nutritional_diseases', 'hypertension', 'cardiac_diseases', 'stroke', 'diabetes_mellitus', 'rheumatism_arthritis', 'sickle_cell_disease', 'asthma', 'chronic_obstructive_pulmonary_disease', 'breast_cancer', 'cervical_cancer', 'lymphoma', 'prostate_cancer', 'hepatocellular_carcinoma', 'all_other_cancers', 'schizophrenia', 'acute_psychotic_disorder', 'mono_symptoms_delusion', 'depression', 'substance_abuse', 'epilepsy', 'autism', 'mental_retardation', 'attention_deficit_hyperactivity_disorder', 'conversion_disorders', 'post_traumatic_stress_syndrome', 'generalized_anxiety', 'other_anxiety_disorders', 'neurosis', 'acute_eye_infection', 'cataract', 'trachoma', 'otitis_media', 'other_acute_ear_infection', 'dental_caries', 'dental_swellings', 'traumatic_conditions_oral', 'periodontal_diseases', 'cerebral_palsy', 'liver_diseases', 'acute_urinary_tract_infection', 'skin_diseases', 'ulcer', 'kidney_related_diseases', 'other_oral_conditions', 'gynaecological_conditions', 'pregnancy_related_complications', 'anaemia_in_pregnancy', 'gonorrhoea', 'genital_ulcer', 'vaginal_discharge', 'urethral_discharge', 'other_diseases_male_reproductive_system', 'other_diseases_female_reproductive_system', 'transport_injuries_road_traffic_accidents', 'home_injuries', 'occupational_industrial_injuries', 'burns', 'poisoning_occupational', 'dog_bite', 'human_bites', 'snake_bite', 'sexual_abuse', 'domestic_violence', 'pyrexia_unknown_origin_non_malaria', 'brought_in_dead', 'other_animal_bites', 'all_other_diseases', 're_attendances', 'referrals');

-- CreateEnum
CREATE TYPE "GHSReportType" AS ENUM ('opd_morbidity', 'ipd_morbidity', 'idsr', 'form_a_morbidity', 'form_a_services', 'malaria_data', 'anc_return', 'delivery_register', 'abortion_data', 'monthly_summary');

-- CreateEnum
CREATE TYPE "MalariaCommodityType" AS ENUM ('asaq_below_1yr', 'asaq_1_5yrs', 'asaq_6_13yrs', 'asaq_14_plus', 'al_0_3yrs', 'al_4_8yrs', 'al_9_13yrs', 'al_14_plus', 'dhap_40_320mg', 'quinine_tablet', 'quinine_injection', 'artesunate_injection_30mg', 'artesunate_injection_60mg', 'artesunate_injection_120mg', 'arthemeter_injection_40mg', 'arthemeter_injection_80mg', 'rectal_artesunate_50mg', 'rectal_artesunate_200mg', 'rdt_kits', 'sp');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('spontaneous_vertex', 'assisted_breech', 'vacuum', 'forceps', 'caesarean_section', 'multiple');

-- CreateEnum
CREATE TYPE "DeliveryOutcome" AS ENUM ('live_birth', 'stillbirth_fresh', 'stillbirth_macerated', 'neonatal_death');

-- CreateEnum
CREATE TYPE "PlaceOfDelivery" AS ENUM ('hospital', 'health_centre', 'clinic', 'home', 'en_route');

-- CreateEnum
CREATE TYPE "MaternalOutcome" AS ENUM ('alive', 'dead_direct_cause', 'dead_indirect_cause', 'dead_unknown');

-- CreateEnum
CREATE TYPE "NewbornOutcome" AS ENUM ('alive', 'dead_within_24hrs', 'dead_1_7days', 'dead_8_28days', 'referred_out');

-- CreateEnum
CREATE TYPE "AbortionType" AS ENUM ('spontaneous', 'induced_safe', 'induced_unsafe', 'septic', 'incomplete', 'complete', 'missed', 'recurrent');

-- CreateEnum
CREATE TYPE "AbortionMethod" AS ENUM ('medical', 'surgical_d_and_c', 'surgical_mva', 'other');

-- CreateEnum
CREATE TYPE "AdmissionType" AS ENUM ('elective', 'emergency', 'transfer', 'detention_observation');

-- CreateEnum
CREATE TYPE "AdmissionSource" AS ENUM ('home', 'referral', 'another_facility', 'opd', 'emergency');

-- CreateEnum
CREATE TYPE "DischargeStatus" AS ENUM ('home', 'transfer', 'expired', 'against_medical_advice');

-- CreateEnum
CREATE TYPE "PresentOnAdmission" AS ENUM ('Y', 'N', 'U');

-- CreateEnum
CREATE TYPE "SecondaryDiagnosisType" AS ENUM ('comorbidity', 'complication');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('emergency_acute', 'antenatal', 'postnatal', 'chronic_followup', 'specialist_consultation', 'delivery', 'surgery', 'general_consultation');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('cash', 'nhis', 'private_insurance');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('pending', 'completed', 'cancelled', 'admitted', 'discharged');

-- CreateEnum
CREATE TYPE "EncounterCategory" AS ENUM ('opd', 'ipd', 'daycase');

-- CreateEnum
CREATE TYPE "VisitCategory" AS ENUM ('general', 'specialist', 'emergency', 'inpatient');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('draft', 'pending', 'partial', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('draft', 'not_required', 'pending', 'submitted', 'approved', 'partially_approved', 'rejected', 'paid');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('Tertiary', 'Secondary', 'Primary', 'Clinic', 'Health_Center', 'Maternity_Home');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('nhis', 'private');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('consultation', 'ward', 'lab_test', 'scan', 'medication', 'procedure', 'diagnosis', 'miscellaneous');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('opd', 'ipd', 'diagnostics', 'pharmacy', 'other');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'pharmacist', 'accounts', 'sonographer');

-- CreateEnum
CREATE TYPE "LabTestStatus" AS ENUM ('requested', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProcedureStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('requested', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('prescribed', 'dispensed', 'administered', 'cancelled');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('routine', 'urgent', 'stat');

-- CreateEnum
CREATE TYPE "ScanPriority" AS ENUM ('routine', 'urgent');

-- CreateEnum
CREATE TYPE "DiagnosisType" AS ENUM ('principal', 'secondary', 'comorbidity');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('consultation', 'follow_up', 'procedure', 'antenatal', 'postnatal', 'vaccination', 'lab_test', 'scan', 'other');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error', 'system', 'appointment', 'billing', 'clinical');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "NHISCoverageType" AS ENUM ('full', 'partial', 'not_covered');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'mobile_money', 'card', 'bank_transfer', 'cheque');

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('purchase', 'adjustment', 'requisition', 'sale');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('draft', 'submitted', 'approved', 'fulfilled', 'cancelled');

-- CreateEnum
CREATE TYPE "RequisitionUrgency" AS ENUM ('routine', 'urgent', 'emergency');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "BodyPart" AS ENUM ('head', 'chest', 'neck', 'abdomen', 'pelvis', 'spine', 'extremities', 'breast', 'other');

-- CreateEnum
CREATE TYPE "DiagnosisVariant" AS ENUM ('adult', 'child', 'complicated', 'uncomplicated');

-- CreateEnum
CREATE TYPE "LabCategory" AS ENUM ('hematology', 'biochemistry', 'microbiology', 'serology', 'immunology', 'toxicology', 'molecular', 'cytology', 'histopathology');

-- CreateEnum
CREATE TYPE "ProcedureCategory" AS ENUM ('surgical', 'diagnostic', 'therapeutic', 'obstetric', 'pediatric', 'dental', 'ophthalmic');

-- CreateEnum
CREATE TYPE "ScanCategory" AS ENUM ('xray', 'ultrasound', 'ct_scan', 'mri', 'fluoroscopy', 'mammography', 'nuclear', 'pet_scan', 'other');

-- CreateEnum
CREATE TYPE "SpecimenType" AS ENUM ('blood', 'urine', 'stool', 'csf', 'sputum', 'fluid', 'semen', 'tissue', 'saliva', 'swab', 'other');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'void', 'approve', 'reject', 'submit', 'print', 'login', 'logout');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('ghs_opd_morbidity', 'ghs_ipd_morbidity', 'ghs_under5_morbidity', 'ghs_antenatal', 'nhia_monthly_claim', 'nhia_quarterly_claim', 'revenue_summary', 'daily_collections', 'stock_consumption', 'bed_occupancy', 'lab_turnaround', 'custom');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "DocumentTemplateType" AS ENUM ('receipt', 'referral_letter', 'discharge_summary', 'admission_letter', 'lab_result', 'scan_report', 'prescription', 'nhia_claim_form');

-- CreateEnum
CREATE TYPE "EligibilityCheckMethod" AS ENUM ('card_reader', 'nhia_portal', 'offline_list', 'manual');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('active', 'expired', 'suspended', 'not_found', 'referred_facility_mismatch');

-- CreateEnum
CREATE TYPE "PreAuthStatus" AS ENUM ('pending', 'approved', 'partially_approved', 'rejected', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('draft', 'submitted', 'acknowledged', 'partially_paid', 'paid', 'disputed');

-- CreateEnum
CREATE TYPE "ClaimSubmissionMethod" AS ENUM ('portal', 'paper', 'edi_batch', 'api');

-- CreateEnum
CREATE TYPE "WaiverType" AS ENUM ('indigent', 'nhis_exempt', 'staff_discount', 'management_discretion', 'other');

-- CreateEnum
CREATE TYPE "WaiverStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('outgoing', 'incoming');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'accepted', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AntenatalRisk" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "performedById" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "previousState" JSONB,
    "newState" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "reportType" "ReportType" NOT NULL,
    "parameters" JSONB,
    "templatePath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_executions" (
    "id" TEXT NOT NULL,
    "reportDefinitionId" TEXT NOT NULL,
    "reportPeriodStart" TIMESTAMP(3) NOT NULL,
    "reportPeriodEnd" TIMESTAMP(3) NOT NULL,
    "parameters" JSONB,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "outputPath" TEXT,
    "submittedToGHS" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "ghsReferenceNo" TEXT,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "templateType" "DocumentTemplateType" NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "filePath" TEXT,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_pricing" (
    "id" TEXT NOT NULL,
    "serviceCatalogId" TEXT NOT NULL,
    "cashPrice" DOUBLE PRECISION NOT NULL,
    "nhisPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurancePrice" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "serviceCategory" "ServiceCategory" NOT NULL DEFAULT 'opd',
    "serviceType" "ServiceType" NOT NULL,
    "nhisServiceCode" TEXT,
    "isNHISCovered" BOOLEAN NOT NULL DEFAULT true,
    "tariffCode" TEXT,
    "nhisCoverageType" "NHISCoverageType" NOT NULL DEFAULT 'full',
    "nhisRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "privateInsRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "isPrivateInsuranceExempted" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT NOT NULL DEFAULT 'Each',
    "isPending" BOOLEAN NOT NULL DEFAULT true,
    "requiresClinicalNotes" BOOLEAN NOT NULL DEFAULT false,
    "subType" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "diagnosisId" TEXT,
    "labTestTemplateId" TEXT,
    "procedureTemplateId" TEXT,
    "stockItemId" TEXT,
    "wardId" TEXT,
    "scanTemplateId" TEXT,
    "consultationTypeId" TEXT,
    "createdById" TEXT,
    "gdrgTariffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "folderNumber" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "otherNames" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "contact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "paymentMode" "PaymentMode",
    "insuranceDetails" JSONB,
    "additionalInfo" JSONB,
    "billingAddress" JSONB,
    "employer" JSONB,
    "imageUrl" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredBy" TEXT NOT NULL,
    "insuranceProviderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhis_eligibility_checks" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "membershipId" TEXT NOT NULL,
    "checkMethod" "EligibilityCheckMethod" NOT NULL,
    "checkTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EligibilityStatus" NOT NULL,
    "memberName" TEXT,
    "registeredFacilityCode" TEXT,
    "ccCode" TEXT,
    "membershipExpiry" TIMESTAMP(3),
    "responseReference" TEXT,
    "rawResponse" JSONB,
    "checkedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nhis_eligibility_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InsuranceType" NOT NULL,
    "coveragePercentage" DOUBLE PRECISION NOT NULL,
    "claimSubmissionMethod" "ClaimSubmissionMethod" NOT NULL DEFAULT 'portal',
    "portalUrl" TEXT,
    "contactInfo" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_plans" (
    "id" TEXT NOT NULL,
    "insuranceProviderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceCategory" "ServiceCategory" NOT NULL,
    "coveragePercentage" DOUBLE PRECISION NOT NULL,
    "annualLimit" DOUBLE PRECISION,
    "requiresPreAuth" BOOLEAN NOT NULL DEFAULT false,
    "coPaymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coPaymentPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_authorisation_requests" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "insuranceProviderId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedServices" JSONB NOT NULL,
    "estimatedTotalCost" DOUBLE PRECISION NOT NULL,
    "clinicalJustification" TEXT,
    "status" "PreAuthStatus" NOT NULL DEFAULT 'pending',
    "responseReceivedAt" TIMESTAMP(3),
    "approvedAmount" DOUBLE PRECISION,
    "approvedServices" JSONB,
    "rejectionReason" TEXT,
    "authNumber" TEXT,
    "authExpiry" TIMESTAMP(3),
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_authorisation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "attendanceNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "insuranceProviderId" TEXT,
    "bedId" TEXT,
    "wardId" TEXT,
    "attendanceType" "AttendanceType" NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMode" "PaymentMode" NOT NULL,
    "nhisCCC" TEXT,
    "nhisEligibilityCheckId" TEXT,
    "complaints" TEXT NOT NULL DEFAULT 'No complaints recorded',
    "medicalNotes" TEXT,
    "encounterCategory" "EncounterCategory" NOT NULL DEFAULT 'opd',
    "visitCategory" "VisitCategory" NOT NULL DEFAULT 'general',
    "gdrgCategory" TEXT,
    "serviceCategory" "ServiceCategory",
    "totalBill" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insuranceClaimId" TEXT,
    "preAuthNumber" TEXT,
    "preAuthApproved" BOOLEAN NOT NULL DEFAULT false,
    "preAuthAmount" DOUBLE PRECISION,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'pending',
    "referringFacility" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "serviceCatalogId" TEXT,
    "status" "LabTestStatus" NOT NULL DEFAULT 'requested',
    "result" JSONB,
    "normalRange" TEXT,
    "units" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "turnaroundMinutes" INTEGER,
    "performedById" TEXT,
    "verifiedById" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'routine',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "serviceCatalogId" TEXT,
    "scanType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bodyPart" TEXT,
    "status" "ScanStatus" NOT NULL DEFAULT 'requested',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "turnaroundMinutes" INTEGER,
    "result" TEXT,
    "findings" TEXT,
    "impression" TEXT,
    "performedById" TEXT,
    "verifiedById" TEXT,
    "imageUrls" TEXT[],
    "createdById" TEXT NOT NULL,
    "priority" "ScanPriority" NOT NULL DEFAULT 'routine',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "serviceCatalogId" TEXT,
    "status" "ProcedureStatus" NOT NULL DEFAULT 'scheduled',
    "scheduledDate" TIMESTAMP(3),
    "performedAt" TIMESTAMP(3),
    "performedById" TEXT,
    "assistantId" TEXT,
    "notes" TEXT,
    "complications" TEXT,
    "outcome" TEXT,
    "cost" DOUBLE PRECISION,
    "duration" INTEGER,
    "createdById" TEXT NOT NULL,
    "anesthesiaNotes" TEXT,
    "intraOperativeNotes" TEXT,
    "postOperativeNotes" TEXT,
    "bloodLoss" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "stockItemId" TEXT,
    "serviceCatalogId" TEXT,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "route" TEXT,
    "instructions" TEXT,
    "status" "MedicationStatus" NOT NULL DEFAULT 'prescribed',
    "prescribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispensedAt" TIMESTAMP(3),
    "administeredAt" TIMESTAMP(3),
    "dispensedById" TEXT,
    "administeredById" TEXT,
    "prescribedById" TEXT NOT NULL,
    "notes" TEXT,
    "dispensedBatchNumber" TEXT,
    "dispensedExpiryDate" TIMESTAMP(3),
    "dispensedUnitCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vitals" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bloodPressure" TEXT,
    "temperature" DOUBLE PRECISION,
    "pulse" INTEGER,
    "respiration" INTEGER,
    "spo2" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "muac" DOUBLE PRECISION,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GDRGTariff" (
    "id" TEXT NOT NULL,
    "gdrgCode" TEXT NOT NULL,
    "mdc" "GDRGMDC" NOT NULL,
    "description" TEXT NOT NULL,
    "nhiaTariff" DOUBLE PRECISION NOT NULL,
    "ageSplit" TEXT NOT NULL DEFAULT 'A',
    "minAgeYears" INTEGER,
    "maxAgeYears" INTEGER,
    "applicableLevels" INTEGER[],
    "nhisServiceCode" TEXT,
    "isZoomCode" BOOLEAN NOT NULL DEFAULT false,
    "allowsAddOn" BOOLEAN NOT NULL DEFAULT false,
    "encounterCategory" "EncounterCategory",
    "attendanceTypes" "AttendanceType"[],
    "isAntenatal" BOOLEAN NOT NULL DEFAULT false,
    "isDelivery" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GDRGTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GDRGTariffDiagnosis" (
    "gdrgTariffId" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "mappedIcdCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GDRGTariffDiagnosis_pkey" PRIMARY KEY ("gdrgTariffId","diagnosisId")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icdCode" TEXT NOT NULL,
    "variant" "DiagnosisVariant",
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "tariffCode" TEXT,
    "isChronic" BOOLEAN NOT NULL DEFAULT false,
    "isNHISCovered" BOOLEAN NOT NULL DEFAULT true,
    "morbidityGroup" "MorbidityGroup" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceDiagnosis" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "icdCode" TEXT,
    "presentOnAdmission" "PresentOnAdmission",
    "diagnosisType" "DiagnosisType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "admissionId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waiverAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insuranceCovered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "patientPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BillStatus" NOT NULL DEFAULT 'draft',
    "paymentMode" "PaymentMode" NOT NULL,
    "insuranceProviderId" TEXT,
    "preAuthNumber" TEXT,
    "claimNumber" TEXT,
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'not_required',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_line_items" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "serviceCatalogId" TEXT,
    "description" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "pricingBasis" "PaymentMode" NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "insuranceCoveredAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "patientPayableAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricingSnapshotId" TEXT,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_waivers" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "billId" TEXT,
    "waiverType" "WaiverType" NOT NULL,
    "reason" TEXT NOT NULL,
    "amountRequested" DOUBLE PRECISION NOT NULL,
    "amountApproved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "WaiverStatus" NOT NULL DEFAULT 'pending',
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "supportingDocs" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_waivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT NOT NULL,
    "notes" TEXT,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "insuranceProviderId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "totalClaimAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedAmount" DOUBLE PRECISION,
    "rejectedAmount" DOUBLE PRECISION,
    "paidAmount" DOUBLE PRECISION,
    "status" "ClaimStatus" NOT NULL DEFAULT 'draft',
    "submissionDate" TIMESTAMP(3),
    "approvalDate" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    "preAuthNumber" TEXT,
    "batchId" TEXT,
    "diagnosisCodes" TEXT[],
    "procedureCodes" TEXT[],
    "labTestCodes" TEXT[],
    "serviceCodes" TEXT[],
    "scanCodes" TEXT[],
    "gdrgCodes" TEXT[],
    "nhisServiceCodes" TEXT[],
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_submission_batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "insuranceProviderId" TEXT NOT NULL,
    "claimPeriodStart" TIMESTAMP(3) NOT NULL,
    "claimPeriodEnd" TIMESTAMP(3) NOT NULL,
    "totalClaims" INTEGER NOT NULL DEFAULT 0,
    "totalClaimAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "submissionMethod" "ClaimSubmissionMethod" NOT NULL,
    "submissionDate" TIMESTAMP(3),
    "nhiaReferenceNumber" TEXT,
    "portalBatchId" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'draft',
    "acknowledgedAt" TIMESTAMP(3),
    "notes" TEXT,
    "submittedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_submission_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ward_charge_records" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "admissionId" TEXT,
    "wardId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "chargeDate" TIMESTAMP(3) NOT NULL,
    "dailyRate" DOUBLE PRECISION NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "nhisPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurancePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "billLineItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ward_charge_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "wardId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "admissionTime" TEXT NOT NULL,
    "admittingDoctor" TEXT NOT NULL,
    "reasonForAdmission" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'admitted',
    "dischargeDate" TIMESTAMP(3),
    "dischargeTime" TEXT,
    "dischargeSummary" TEXT,
    "dailyNotes" JSONB,
    "createdBy" TEXT NOT NULL,
    "admissionType" "AdmissionType" NOT NULL DEFAULT 'emergency',
    "admissionSource" "AdmissionSource" NOT NULL DEFAULT 'home',
    "dischargeStatus" "DischargeStatus",
    "lengthOfStay" INTEGER NOT NULL DEFAULT 0,
    "principalDiagnosisId" TEXT NOT NULL,
    "principalIcdCode" TEXT NOT NULL,
    "principalPresentOnAdmission" "PresentOnAdmission" NOT NULL DEFAULT 'Y',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionSecondaryDiagnosis" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,
    "icdCode" TEXT NOT NULL,
    "presentOnAdmission" "PresentOnAdmission" NOT NULL DEFAULT 'Y',
    "diagnosisType" "SecondaryDiagnosisType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionSecondaryDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL,
    "wardName" TEXT NOT NULL,
    "wardType" TEXT NOT NULL,
    "totalBeds" INTEGER NOT NULL,
    "occupiedBeds" INTEGER NOT NULL DEFAULT 0,
    "isNHISCovered" BOOLEAN NOT NULL DEFAULT true,
    "nhisRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "isPrivateInsExempted" BOOLEAN NOT NULL DEFAULT false,
    "isPending" BOOLEAN NOT NULL DEFAULT true,
    "requiresAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "tariffCode" TEXT,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "dailyCashRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyNHISRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyInsuranceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "currentPatientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_records" (
    "id" TEXT NOT NULL,
    "referralNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "referralType" "ReferralType" NOT NULL,
    "referralReason" TEXT NOT NULL,
    "referralNotes" TEXT,
    "urgency" "Priority" NOT NULL DEFAULT 'routine',
    "referredToFacility" TEXT,
    "referredToDoctor" TEXT,
    "referredToDepartment" TEXT,
    "referredFromFacility" TEXT,
    "referredFromDoctor" TEXT,
    "referralDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReferralStatus" NOT NULL DEFAULT 'pending',
    "outcomeNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antenatal_bookings" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "gestationalAgeWeeks" INTEGER,
    "estimatedDeliveryDate" TIMESTAMP(3),
    "gravida" INTEGER NOT NULL DEFAULT 1,
    "para" INTEGER NOT NULL DEFAULT 0,
    "lmp" TIMESTAMP(3),
    "bloodGroup" TEXT,
    "rhesusStatus" TEXT,
    "hivStatus" TEXT,
    "syphilisStatus" TEXT,
    "hepatitisBStatus" TEXT,
    "bookingWeight" DOUBLE PRECISION,
    "bookingBP" TEXT,
    "riskLevel" "AntenatalRisk" NOT NULL DEFAULT 'low',
    "riskNotes" TEXT,
    "midwifeId" TEXT,
    "doctorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deliveryOutcome" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antenatal_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anc_visits" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "visitNumber" INTEGER NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "gestationalAgeWeeks" INTEGER,
    "weight" DOUBLE PRECISION,
    "bloodPressure" TEXT,
    "fetalHeartRate" INTEGER,
    "presentingPart" TEXT,
    "oedema" BOOLEAN NOT NULL DEFAULT false,
    "urinalysis" TEXT,
    "fundalHeight" DOUBLE PRECISION,
    "fetalMovement" BOOLEAN,
    "supplementsGiven" TEXT,
    "ttVaccineGiven" BOOLEAN NOT NULL DEFAULT false,
    "itnGiven" BOOLEAN NOT NULL DEFAULT false,
    "nextVisitDate" TIMESTAMP(3),
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anc_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "investigationCode" TEXT NOT NULL,
    "category" "LabCategory" NOT NULL,
    "subCategory" TEXT,
    "description" TEXT,
    "isNHISCovered" BOOLEAN NOT NULL DEFAULT true,
    "isPrivateInsExempted" BOOLEAN NOT NULL DEFAULT false,
    "nhisRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "privateInsRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tariffCode" TEXT,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "specimenType" "SpecimenType" NOT NULL,
    "resultTemplate" JSONB,
    "normalRangeTemplate" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "investigationCode" TEXT NOT NULL,
    "scanCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ScanCategory" NOT NULL,
    "bodyPart" "BodyPart" NOT NULL,
    "isNHISCovered" BOOLEAN NOT NULL DEFAULT true,
    "isPrivateInsExempted" BOOLEAN NOT NULL DEFAULT false,
    "nhisRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "privateInsRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tariffCode" TEXT,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "preparationInstructions" TEXT,
    "duration" INTEGER NOT NULL,
    "contrastRequired" BOOLEAN NOT NULL DEFAULT false,
    "scanType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "procedureCode" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProcedureCategory" NOT NULL,
    "department" TEXT NOT NULL,
    "isNHISCovered" BOOLEAN NOT NULL DEFAULT true,
    "isPrivateInsExempted" BOOLEAN NOT NULL DEFAULT false,
    "nhisRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "privateInsRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tariffCode" TEXT,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cashPrice" DOUBLE PRECISION NOT NULL,
    "nhisPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurancePrice" DOUBLE PRECISION NOT NULL,
    "isNHISCovered" BOOLEAN NOT NULL DEFAULT true,
    "isPrivateInsExempted" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "strength" TEXT NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "drugCode" TEXT NOT NULL,
    "reorderLevel" INTEGER NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "isNHISCovered" BOOLEAN NOT NULL DEFAULT true,
    "isPrivateInsExempted" BOOLEAN NOT NULL DEFAULT false,
    "nhisRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "privateInsRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "supplier" TEXT,
    "expiryDate" TIMESTAMP(3),
    "batchNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tariffCode" TEXT,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "isMedication" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "transactionType" "StockTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedBy" TEXT NOT NULL,
    "requisitionId" TEXT,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisition" (
    "id" TEXT NOT NULL,
    "requisitionNumber" TEXT NOT NULL,
    "requestingDepartmentId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "urgency" "RequisitionUrgency" NOT NULL DEFAULT 'routine',
    "requiredDate" TIMESTAMP(3),
    "purpose" TEXT,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'draft',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "fulfilledById" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionItem" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantityRequested" INTEGER NOT NULL,
    "quantityApproved" INTEGER,
    "quantityFulfilled" INTEGER NOT NULL DEFAULT 0,
    "purpose" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "headId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT DEFAULT '#3B82F6',
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "appointmentNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "departmentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "appointmentTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled',
    "type" "AppointmentType" NOT NULL DEFAULT 'consultation',
    "isNHIS" BOOLEAN NOT NULL DEFAULT false,
    "nhisCCC" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "imageUrl" TEXT,
    "nhisFacilityCode" TEXT NOT NULL,
    "nhisFacilityType" "FacilityType" NOT NULL DEFAULT 'Primary',
    "nhisAccreditationNumber" TEXT,
    "nhisAccreditationDate" TIMESTAMP(3),
    "nhisAccreditationExpiry" TIMESTAMP(3),
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankBranch" TEXT,
    "nhisContactPerson" TEXT,
    "nhisContactPhone" TEXT,
    "nhisContactEmail" TEXT,
    "ghsDistrictCode" TEXT,
    "ghaHFCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "specialization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'info',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'medium',
    "actionType" TEXT,
    "actionId" TEXT,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRendered" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRendered_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ghs_report_submissions" (
    "id" TEXT NOT NULL,
    "reportType" "GHSReportType" NOT NULL,
    "reportingYear" INTEGER NOT NULL,
    "reportingMonth" INTEGER,
    "reportingQuarter" INTEGER,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "filePath" TEXT,
    "submittedToDHIMS2" BOOLEAN NOT NULL DEFAULT false,
    "dhims2Reference" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ghs_report_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idsr_alerts" (
    "id" TEXT NOT NULL,
    "diseaseCode" TEXT NOT NULL,
    "diseaseName" TEXT NOT NULL,
    "alertDate" TIMESTAMP(3) NOT NULL,
    "suspectedCases" INTEGER NOT NULL,
    "confirmedCases" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "alertTriggered" BOOLEAN NOT NULL DEFAULT false,
    "alertAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "responseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idsr_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "malaria_commodity_stocks" (
    "id" TEXT NOT NULL,
    "commodityType" "MalariaCommodityType" NOT NULL,
    "reportingMonth" TIMESTAMP(3) NOT NULL,
    "openingStock" INTEGER NOT NULL,
    "received" INTEGER NOT NULL,
    "dispensed" INTEGER NOT NULL,
    "closingStock" INTEGER NOT NULL,
    "stockOutDays" INTEGER NOT NULL DEFAULT 0,
    "facilityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "malaria_commodity_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "admissionId" TEXT,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "deliveryType" "DeliveryType" NOT NULL,
    "deliveryOutcome" "DeliveryOutcome" NOT NULL,
    "placeOfDelivery" "PlaceOfDelivery" NOT NULL,
    "attendant" TEXT NOT NULL,
    "birthWeight" DOUBLE PRECISION,
    "gestationWeeks" INTEGER,
    "apgarScore1min" INTEGER,
    "apgarScore5min" INTEGER,
    "resusCitationDone" BOOLEAN NOT NULL DEFAULT false,
    "maternalOutcome" "MaternalOutcome" NOT NULL,
    "referralTo" TEXT,
    "complications" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "abortionRecordId" TEXT,

    CONSTRAINT "delivery_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newborn_records" (
    "id" TEXT NOT NULL,
    "deliveryRecordId" TEXT NOT NULL,
    "birthWeight" DOUBLE PRECISION NOT NULL,
    "gender" "Gender" NOT NULL,
    "apgarScore1min" INTEGER,
    "apgarScore5min" INTEGER,
    "resuscitation" BOOLEAN NOT NULL DEFAULT false,
    "outcome" "NewbornOutcome" NOT NULL,
    "anomalies" TEXT[],
    "referredTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newborn_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abortion_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "abortionDate" TIMESTAMP(3) NOT NULL,
    "gestationalWeeks" INTEGER NOT NULL,
    "abortionType" "AbortionType" NOT NULL,
    "complication" TEXT,
    "method" "AbortionMethod",
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abortion_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_performedById_idx" ON "audit_logs"("performedById");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "report_definitions_code_key" ON "report_definitions"("code");

-- CreateIndex
CREATE INDEX "report_executions_reportDefinitionId_idx" ON "report_executions"("reportDefinitionId");

-- CreateIndex
CREATE INDEX "report_executions_reportPeriodStart_reportPeriodEnd_idx" ON "report_executions"("reportPeriodStart", "reportPeriodEnd");

-- CreateIndex
CREATE INDEX "report_executions_status_idx" ON "report_executions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_code_key" ON "document_templates"("code");

-- CreateIndex
CREATE INDEX "generated_documents_entityType_entityId_idx" ON "generated_documents"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "service_pricing_serviceCatalogId_key" ON "service_pricing"("serviceCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalog_code_key" ON "ServiceCatalog"("code");

-- CreateIndex
CREATE INDEX "ServiceCatalog_code_idx" ON "ServiceCatalog"("code");

-- CreateIndex
CREATE INDEX "ServiceCatalog_isPrivateInsuranceExempted_idx" ON "ServiceCatalog"("isPrivateInsuranceExempted");

-- CreateIndex
CREATE INDEX "ServiceCatalog_nhisCoverageType_idx" ON "ServiceCatalog"("nhisCoverageType");

-- CreateIndex
CREATE INDEX "ServiceCatalog_nhisServiceCode_idx" ON "ServiceCatalog"("nhisServiceCode");

-- CreateIndex
CREATE INDEX "ServiceCatalog_serviceCategory_serviceType_idx" ON "ServiceCatalog"("serviceCategory", "serviceType");

-- CreateIndex
CREATE INDEX "ServiceCatalog_serviceType_isPending_idx" ON "ServiceCatalog"("serviceType", "isPending");

-- CreateIndex
CREATE INDEX "ServiceCatalog_isActive_idx" ON "ServiceCatalog"("isActive");

-- CreateIndex
CREATE INDEX "ServiceCatalog_gdrgTariffId_idx" ON "ServiceCatalog"("gdrgTariffId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_folderNumber_key" ON "Patient"("folderNumber");

-- CreateIndex
CREATE INDEX "Patient_folderNumber_idx" ON "Patient"("folderNumber");

-- CreateIndex
CREATE INDEX "Patient_otherNames_idx" ON "Patient"("otherNames");

-- CreateIndex
CREATE INDEX "Patient_paymentMode_idx" ON "Patient"("paymentMode");

-- CreateIndex
CREATE INDEX "Patient_surname_idx" ON "Patient"("surname");

-- CreateIndex
CREATE INDEX "nhis_eligibility_checks_patientId_idx" ON "nhis_eligibility_checks"("patientId");

-- CreateIndex
CREATE INDEX "nhis_eligibility_checks_attendanceId_idx" ON "nhis_eligibility_checks"("attendanceId");

-- CreateIndex
CREATE INDEX "nhis_eligibility_checks_membershipId_idx" ON "nhis_eligibility_checks"("membershipId");

-- CreateIndex
CREATE INDEX "nhis_eligibility_checks_checkTimestamp_idx" ON "nhis_eligibility_checks"("checkTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_providers_name_key" ON "insurance_providers"("name");

-- CreateIndex
CREATE INDEX "insurance_plans_insuranceProviderId_serviceCategory_idx" ON "insurance_plans"("insuranceProviderId", "serviceCategory");

-- CreateIndex
CREATE INDEX "insurance_plans_isActive_idx" ON "insurance_plans"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "pre_authorisation_requests_referenceNumber_key" ON "pre_authorisation_requests"("referenceNumber");

-- CreateIndex
CREATE INDEX "pre_authorisation_requests_attendanceId_idx" ON "pre_authorisation_requests"("attendanceId");

-- CreateIndex
CREATE INDEX "pre_authorisation_requests_status_idx" ON "pre_authorisation_requests"("status");

-- CreateIndex
CREATE INDEX "pre_authorisation_requests_referenceNumber_idx" ON "pre_authorisation_requests"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_attendanceNumber_key" ON "Attendance"("attendanceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_insuranceClaimId_key" ON "Attendance"("insuranceClaimId");

-- CreateIndex
CREATE INDEX "Attendance_attendanceType_idx" ON "Attendance"("attendanceType");

-- CreateIndex
CREATE INDEX "Attendance_dateTime_idx" ON "Attendance"("dateTime");

-- CreateIndex
CREATE INDEX "Attendance_patientId_idx" ON "Attendance"("patientId");

-- CreateIndex
CREATE INDEX "Attendance_paymentMode_idx" ON "Attendance"("paymentMode");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX "Attendance_gdrgCategory_idx" ON "Attendance"("gdrgCategory");

-- CreateIndex
CREATE INDEX "Attendance_serviceCategory_idx" ON "Attendance"("serviceCategory");

-- CreateIndex
CREATE INDEX "LabTest_attendanceId_idx" ON "LabTest"("attendanceId");

-- CreateIndex
CREATE INDEX "LabTest_serviceCatalogId_idx" ON "LabTest"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "LabTest_status_idx" ON "LabTest"("status");

-- CreateIndex
CREATE INDEX "Scan_attendanceId_idx" ON "Scan"("attendanceId");

-- CreateIndex
CREATE INDEX "Scan_serviceCatalogId_idx" ON "Scan"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "Scan_status_idx" ON "Scan"("status");

-- CreateIndex
CREATE INDEX "Procedure_attendanceId_idx" ON "Procedure"("attendanceId");

-- CreateIndex
CREATE INDEX "Procedure_serviceCatalogId_idx" ON "Procedure"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "Procedure_status_idx" ON "Procedure"("status");

-- CreateIndex
CREATE INDEX "Medication_attendanceId_idx" ON "Medication"("attendanceId");

-- CreateIndex
CREATE INDEX "Medication_serviceCatalogId_idx" ON "Medication"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "Medication_status_idx" ON "Medication"("status");

-- CreateIndex
CREATE INDEX "Vitals_attendanceId_idx" ON "Vitals"("attendanceId");

-- CreateIndex
CREATE INDEX "Vitals_patientId_idx" ON "Vitals"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "GDRGTariff_gdrgCode_key" ON "GDRGTariff"("gdrgCode");

-- CreateIndex
CREATE INDEX "GDRGTariff_gdrgCode_idx" ON "GDRGTariff"("gdrgCode");

-- CreateIndex
CREATE INDEX "GDRGTariff_mdc_idx" ON "GDRGTariff"("mdc");

-- CreateIndex
CREATE INDEX "GDRGTariff_nhisServiceCode_idx" ON "GDRGTariff"("nhisServiceCode");

-- CreateIndex
CREATE INDEX "GDRGTariff_encounterCategory_idx" ON "GDRGTariff"("encounterCategory");

-- CreateIndex
CREATE INDEX "GDRGTariff_isActive_idx" ON "GDRGTariff"("isActive");

-- CreateIndex
CREATE INDEX "GDRGTariffDiagnosis_mappedIcdCode_idx" ON "GDRGTariffDiagnosis"("mappedIcdCode");

-- CreateIndex
CREATE UNIQUE INDEX "Diagnosis_icdCode_key" ON "Diagnosis"("icdCode");

-- CreateIndex
CREATE INDEX "Diagnosis_icdCode_idx" ON "Diagnosis"("icdCode");

-- CreateIndex
CREATE INDEX "Diagnosis_morbidityGroup_idx" ON "Diagnosis"("morbidityGroup");

-- CreateIndex
CREATE INDEX "AttendanceDiagnosis_attendanceId_idx" ON "AttendanceDiagnosis"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceDiagnosis_diagnosisId_idx" ON "AttendanceDiagnosis"("diagnosisId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_billNumber_key" ON "Bill"("billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_attendanceId_key" ON "Bill"("attendanceId");

-- CreateIndex
CREATE INDEX "Bill_attendanceId_idx" ON "Bill"("attendanceId");

-- CreateIndex
CREATE INDEX "Bill_billDate_idx" ON "Bill"("billDate");

-- CreateIndex
CREATE INDEX "Bill_billNumber_idx" ON "Bill"("billNumber");

-- CreateIndex
CREATE INDEX "Bill_patientId_idx" ON "Bill"("patientId");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE INDEX "bill_line_items_billId_idx" ON "bill_line_items"("billId");

-- CreateIndex
CREATE INDEX "bill_line_items_serviceCatalogId_idx" ON "bill_line_items"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "bill_line_items_serviceType_idx" ON "bill_line_items"("serviceType");

-- CreateIndex
CREATE INDEX "patient_waivers_patientId_idx" ON "patient_waivers"("patientId");

-- CreateIndex
CREATE INDEX "patient_waivers_status_idx" ON "patient_waivers"("status");

-- CreateIndex
CREATE INDEX "Payment_billId_idx" ON "Payment"("billId");

-- CreateIndex
CREATE INDEX "Payment_transactionDate_idx" ON "Payment"("transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceClaim_claimNumber_key" ON "InsuranceClaim"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceClaim_attendanceId_key" ON "InsuranceClaim"("attendanceId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_claimNumber_idx" ON "InsuranceClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "InsuranceClaim_status_idx" ON "InsuranceClaim"("status");

-- CreateIndex
CREATE INDEX "InsuranceClaim_submissionDate_idx" ON "InsuranceClaim"("submissionDate");

-- CreateIndex
CREATE INDEX "InsuranceClaim_batchId_idx" ON "InsuranceClaim"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "claim_submission_batches_batchNumber_key" ON "claim_submission_batches"("batchNumber");

-- CreateIndex
CREATE INDEX "claim_submission_batches_status_idx" ON "claim_submission_batches"("status");

-- CreateIndex
CREATE INDEX "claim_submission_batches_submissionDate_idx" ON "claim_submission_batches"("submissionDate");

-- CreateIndex
CREATE INDEX "claim_submission_batches_batchNumber_idx" ON "claim_submission_batches"("batchNumber");

-- CreateIndex
CREATE INDEX "ward_charge_records_attendanceId_idx" ON "ward_charge_records"("attendanceId");

-- CreateIndex
CREATE INDEX "ward_charge_records_chargeDate_idx" ON "ward_charge_records"("chargeDate");

-- CreateIndex
CREATE INDEX "ward_charge_records_isBilled_idx" ON "ward_charge_records"("isBilled");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_admissionNumber_key" ON "Admission"("admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_attendanceId_key" ON "Admission"("attendanceId");

-- CreateIndex
CREATE INDEX "Admission_admissionNumber_idx" ON "Admission"("admissionNumber");

-- CreateIndex
CREATE INDEX "Admission_patientId_idx" ON "Admission"("patientId");

-- CreateIndex
CREATE INDEX "Admission_status_idx" ON "Admission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionSecondaryDiagnosis_admissionId_diagnosisId_diagnos_key" ON "AdmissionSecondaryDiagnosis"("admissionId", "diagnosisId", "diagnosisType");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_currentPatientId_key" ON "Bed"("currentPatientId");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_wardId_bedNumber_key" ON "Bed"("wardId", "bedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "referral_records_referralNumber_key" ON "referral_records"("referralNumber");

-- CreateIndex
CREATE INDEX "referral_records_patientId_idx" ON "referral_records"("patientId");

-- CreateIndex
CREATE INDEX "referral_records_referralDate_idx" ON "referral_records"("referralDate");

-- CreateIndex
CREATE INDEX "referral_records_status_idx" ON "referral_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "antenatal_bookings_patientId_key" ON "antenatal_bookings"("patientId");

-- CreateIndex
CREATE INDEX "anc_visits_bookingId_idx" ON "anc_visits"("bookingId");

-- CreateIndex
CREATE INDEX "anc_visits_visitDate_idx" ON "anc_visits"("visitDate");

-- CreateIndex
CREATE UNIQUE INDEX "LabTestTemplate_investigationCode_key" ON "LabTestTemplate"("investigationCode");

-- CreateIndex
CREATE UNIQUE INDEX "ScanTemplate_scanCode_key" ON "ScanTemplate"("scanCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureTemplate_procedureCode_key" ON "ProcedureTemplate"("procedureCode");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationType_code_key" ON "ConsultationType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_drugCode_key" ON "StockItem"("drugCode");

-- CreateIndex
CREATE INDEX "stock_batches_stockItemId_expiryDate_idx" ON "stock_batches"("stockItemId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "stock_batches_stockItemId_batchNumber_key" ON "stock_batches"("stockItemId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_supplierName_idx" ON "Invoice"("supplierName");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_invoiceId_stockItemId_key" ON "InvoiceItem"("invoiceId", "stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Requisition_requisitionNumber_key" ON "Requisition"("requisitionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_headId_key" ON "departments"("headId");

-- CreateIndex
CREATE INDEX "departments_isActive_idx" ON "departments"("isActive");

-- CreateIndex
CREATE INDEX "departments_headId_idx" ON "departments"("headId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointmentNumber_key" ON "appointments"("appointmentNumber");

-- CreateIndex
CREATE INDEX "appointments_appointmentDate_idx" ON "appointments"("appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_patientId_status_idx" ON "appointments"("patientId", "status");

-- CreateIndex
CREATE INDEX "appointments_doctorId_appointmentDate_idx" ON "appointments"("doctorId", "appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_departmentId_appointmentDate_idx" ON "appointments"("departmentId", "appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_status_appointmentDate_idx" ON "appointments"("status", "appointmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_nhisFacilityCode_key" ON "Hospital"("nhisFacilityCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "ghs_report_submissions_reportType_reportingYear_reportingMo_idx" ON "ghs_report_submissions"("reportType", "reportingYear", "reportingMonth");

-- CreateIndex
CREATE INDEX "ghs_report_submissions_submittedToDHIMS2_idx" ON "ghs_report_submissions"("submittedToDHIMS2");

-- CreateIndex
CREATE INDEX "idsr_alerts_diseaseCode_alertDate_idx" ON "idsr_alerts"("diseaseCode", "alertDate");

-- CreateIndex
CREATE INDEX "idsr_alerts_alertTriggered_alertAcknowledged_idx" ON "idsr_alerts"("alertTriggered", "alertAcknowledged");

-- CreateIndex
CREATE INDEX "malaria_commodity_stocks_reportingMonth_idx" ON "malaria_commodity_stocks"("reportingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "malaria_commodity_stocks_commodityType_reportingMonth_facil_key" ON "malaria_commodity_stocks"("commodityType", "reportingMonth", "facilityId");

-- CreateIndex
CREATE INDEX "delivery_records_deliveryDate_idx" ON "delivery_records"("deliveryDate");

-- CreateIndex
CREATE INDEX "delivery_records_patientId_idx" ON "delivery_records"("patientId");

-- CreateIndex
CREATE INDEX "abortion_records_abortionDate_idx" ON "abortion_records"("abortionDate");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_reportDefinitionId_fkey" FOREIGN KEY ("reportDefinitionId") REFERENCES "report_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pricing" ADD CONSTRAINT "service_pricing_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_labTestTemplateId_fkey" FOREIGN KEY ("labTestTemplateId") REFERENCES "LabTestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_procedureTemplateId_fkey" FOREIGN KEY ("procedureTemplateId") REFERENCES "ProcedureTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_scanTemplateId_fkey" FOREIGN KEY ("scanTemplateId") REFERENCES "ScanTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_consultationTypeId_fkey" FOREIGN KEY ("consultationTypeId") REFERENCES "ConsultationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_gdrgTariffId_fkey" FOREIGN KEY ("gdrgTariffId") REFERENCES "GDRGTariff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhis_eligibility_checks" ADD CONSTRAINT "nhis_eligibility_checks_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhis_eligibility_checks" ADD CONSTRAINT "nhis_eligibility_checks_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhis_eligibility_checks" ADD CONSTRAINT "nhis_eligibility_checks_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_plans" ADD CONSTRAINT "insurance_plans_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_authorisation_requests" ADD CONSTRAINT "pre_authorisation_requests_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_authorisation_requests" ADD CONSTRAINT "pre_authorisation_requests_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_authorisation_requests" ADD CONSTRAINT "pre_authorisation_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_authorisation_requests" ADD CONSTRAINT "pre_authorisation_requests_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LabTestTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ScanTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProcedureTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_prescribedById_fkey" FOREIGN KEY ("prescribedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GDRGTariffDiagnosis" ADD CONSTRAINT "GDRGTariffDiagnosis_gdrgTariffId_fkey" FOREIGN KEY ("gdrgTariffId") REFERENCES "GDRGTariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GDRGTariffDiagnosis" ADD CONSTRAINT "GDRGTariffDiagnosis_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDiagnosis" ADD CONSTRAINT "AttendanceDiagnosis_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDiagnosis" ADD CONSTRAINT "AttendanceDiagnosis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDiagnosis" ADD CONSTRAINT "AttendanceDiagnosis_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_waivers" ADD CONSTRAINT "patient_waivers_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_waivers" ADD CONSTRAINT "patient_waivers_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_waivers" ADD CONSTRAINT "patient_waivers_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_waivers" ADD CONSTRAINT "patient_waivers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "claim_submission_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_submission_batches" ADD CONSTRAINT "claim_submission_batches_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_submission_batches" ADD CONSTRAINT "claim_submission_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_charge_records" ADD CONSTRAINT "ward_charge_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_charge_records" ADD CONSTRAINT "ward_charge_records_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_principalDiagnosisId_fkey" FOREIGN KEY ("principalDiagnosisId") REFERENCES "Diagnosis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionSecondaryDiagnosis" ADD CONSTRAINT "AdmissionSecondaryDiagnosis_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionSecondaryDiagnosis" ADD CONSTRAINT "AdmissionSecondaryDiagnosis_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_currentPatientId_fkey" FOREIGN KEY ("currentPatientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_records" ADD CONSTRAINT "referral_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_records" ADD CONSTRAINT "referral_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_records" ADD CONSTRAINT "referral_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenatal_bookings" ADD CONSTRAINT "antenatal_bookings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenatal_bookings" ADD CONSTRAINT "antenatal_bookings_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenatal_bookings" ADD CONSTRAINT "antenatal_bookings_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anc_visits" ADD CONSTRAINT "anc_visits_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "antenatal_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anc_visits" ADD CONSTRAINT "anc_visits_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_fulfilledById_fkey" FOREIGN KEY ("fulfilledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_requestingDepartmentId_fkey" FOREIGN KEY ("requestingDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionItem" ADD CONSTRAINT "RequisitionItem_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionItem" ADD CONSTRAINT "RequisitionItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_headId_fkey" FOREIGN KEY ("headId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRendered" ADD CONSTRAINT "ServiceRendered_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRendered" ADD CONSTRAINT "ServiceRendered_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRendered" ADD CONSTRAINT "ServiceRendered_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ghs_report_submissions" ADD CONSTRAINT "ghs_report_submissions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idsr_alerts" ADD CONSTRAINT "idsr_alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_abortionRecordId_fkey" FOREIGN KEY ("abortionRecordId") REFERENCES "abortion_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newborn_records" ADD CONSTRAINT "newborn_records_deliveryRecordId_fkey" FOREIGN KEY ("deliveryRecordId") REFERENCES "delivery_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abortion_records" ADD CONSTRAINT "abortion_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abortion_records" ADD CONSTRAINT "abortion_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abortion_records" ADD CONSTRAINT "abortion_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
