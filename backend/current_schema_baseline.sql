-- CreateEnum
CREATE TYPE "ClaimItOutcome" AS ENUM ('passed', 'warned', 'error', 'unknown');

-- CreateEnum
CREATE TYPE "ClaimItemCategory" AS ENUM ('diagnosis', 'investigation', 'medicine', 'procedure', 'service', 'gdrg');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('requested', 'approved', 'dispatched', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('generated', 'finalized');

-- CreateEnum
CREATE TYPE "ProformaInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('APPOINTMENT_REMINDER', 'APPOINTMENT_CONFIRMATION', 'LAB_RESULT_READY', 'PRESCRIPTION_READY', 'PAYMENT_REMINDER', 'BILL_NOTIFICATION', 'WELCOME_MESSAGE', 'GENERAL_NOTIFICATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "CommunicationChannelType" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "FPMethod" AS ENUM ('pill_coc', 'pill_pop', 'injectable_dmpa', 'injectable_net_en', 'condom_male', 'condom_female', 'implant_implanon', 'implant_jadelle', 'iud_copper', 'iud_hormonal', 'female_sterilization', 'male_sterilization', 'lam', 'withdrawal', 'calendar', 'other_traditional', 'emergency_contraception');

-- CreateEnum
CREATE TYPE "FPMethodCategory" AS ENUM ('modern_short_acting', 'modern_long_acting', 'permanent', 'traditional', 'emergency');

-- CreateEnum
CREATE TYPE "GDRGMDC" AS ENUM ('ASUR', 'DENT', 'ENTH', 'INVE', 'MEDI', 'OBGY', 'OPDC', 'OPHT', 'ORTH', 'PAED', 'PSUR', 'RSUR', 'ZOOM');

-- CreateEnum
CREATE TYPE "MorbidityGroup" AS ENUM ('afp_polio', 'meningitis', 'neonatal_tetanus', 'pertussis_whooping_cough', 'diphtheria', 'measles', 'yellow_fever', 'tetanus', 'tuberculosis', 'uncomplicated_malaria_suspected', 'uncomplicated_malaria_tested', 'uncomplicated_malaria_positive', 'uncomplicated_malaria_not_tested_treated', 'uncomplicated_malaria_tested_negative_treated', 'malaria_in_pregnancy_suspected', 'malaria_in_pregnancy_tested', 'malaria_in_pregnancy_positive', 'malaria_in_pregnancy_not_tested_treated', 'malaria_in_pregnancy_tested_negative_treated', 'severe_malaria_lab_confirmed', 'severe_malaria_non_lab_confirmed', 'typhoid_fever', 'suspected_cholera', 'diarrhoea_diseases', 'viral_hepatitis', 'schistosomiasis_bilharzia', 'suspected_guinea_worm', 'onchocerciasis', 'buruli_ulcer', 'leprosy', 'hiv_aids_related_conditions', 'mumps', 'intestinal_worms', 'chicken_pox', 'upper_respiratory_tract_infections', 'pneumonia', 'septicaemia', 'malnutrition', 'obesity', 'anaemia', 'other_nutritional_diseases', 'hypertension', 'cardiac_diseases', 'stroke', 'diabetes_mellitus', 'rheumatism_arthritis', 'sickle_cell_disease', 'asthma', 'chronic_obstructive_pulmonary_disease', 'breast_cancer', 'cervical_cancer', 'lymphoma', 'prostate_cancer', 'hepatocellular_carcinoma', 'all_other_cancers', 'schizophrenia', 'acute_psychotic_disorder', 'mono_symptoms_delusion', 'depression', 'substance_abuse', 'epilepsy', 'autism', 'mental_retardation', 'attention_deficit_hyperactivity_disorder', 'conversion_disorders', 'post_traumatic_stress_syndrome', 'generalized_anxiety', 'other_anxiety_disorders', 'neurosis', 'acute_eye_infection', 'cataract', 'trachoma', 'otitis_media', 'other_acute_ear_infection', 'dental_caries', 'dental_swellings', 'traumatic_conditions_oral', 'periodontal_diseases', 'cerebral_palsy', 'liver_diseases', 'acute_urinary_tract_infection', 'skin_diseases', 'ulcer', 'kidney_related_diseases', 'other_oral_conditions', 'gynaecological_conditions', 'pregnancy_related_complications', 'anaemia_in_pregnancy', 'gonorrhoea', 'genital_ulcer', 'vaginal_discharge', 'urethral_discharge', 'other_diseases_male_reproductive_system', 'other_diseases_female_reproductive_system', 'transport_injuries_road_traffic_accidents', 'home_injuries', 'occupational_industrial_injuries', 'burns', 'poisoning_occupational', 'dog_bite', 'human_bites', 'snake_bite', 'sexual_abuse', 'domestic_violence', 'pyrexia_unknown_origin_non_malaria', 'brought_in_dead', 'other_animal_bites', 'all_other_diseases', 're_attendances', 'referrals');

-- CreateEnum
CREATE TYPE "AdmissionType" AS ENUM ('elective', 'emergency', 'transfer', 'detention_observation');

-- CreateEnum
CREATE TYPE "AdmissionSource" AS ENUM ('home', 'referral', 'another_facility', 'opd', 'emergency');

-- CreateEnum
CREATE TYPE "DischargeStatus" AS ENUM ('home', 'transfer', 'expired', 'against_medical_advice');

-- CreateEnum
CREATE TYPE "PresentOnAdmission" AS ENUM ('Y', 'N', 'U');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('emergency_acute', 'antenatal', 'postnatal', 'immunization', 'chronic_followup', 'specialist_consultation', 'delivery', 'surgery', 'general_consultation', 'walk_in');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('cash', 'nhis', 'private_insurance', 'corporate');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('pending', 'admitted', 'discharged', 'completed', 'referred', 'absconded', 'cancelled');

-- CreateEnum
CREATE TYPE "ClinicalConditionOutcome" AS ENUM ('improved', 'stable', 'unchanged', 'deteriorated', 'deceased', 'unknown');

-- CreateEnum
CREATE TYPE "AllergyReviewStatus" AS ENUM ('not_reviewed', 'no_known_allergies', 'allergies_present');

-- CreateEnum
CREATE TYPE "EncounterCategory" AS ENUM ('opd', 'ipd', 'daycase');

-- CreateEnum
CREATE TYPE "VisitCategory" AS ENUM ('general', 'specialist', 'emergency', 'inpatient');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('draft', 'pending', 'partial', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('draft', 'finalized');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('CHPS', 'Tertiary', 'Secondary', 'Primary', 'Clinic', 'Health_Center', 'Maternity_Home');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('nhis', 'private', 'corporate');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('consultation', 'ward', 'lab_test', 'scan', 'medication', 'procedure', 'diagnosis', 'miscellaneous');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('opd', 'ipd', 'diagnostics', 'pharmacy', 'other');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'admin', 'hr_officer', 'doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'pharmacist', 'accounts', 'sonographer');

-- CreateEnum
CREATE TYPE "LabTestStatus" AS ENUM ('requested', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProcedureStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('requested', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('prescribed', 'dispensed', 'administered', 'cancelled');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('routine', 'urgent', 'stat');

-- CreateEnum
CREATE TYPE "ScanPriority" AS ENUM ('routine', 'urgent');

-- CreateEnum
CREATE TYPE "DiagnosisType" AS ENUM ('provisional', 'primary', 'additional');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('consultation', 'follow_up', 'procedure', 'antenatal', 'postnatal', 'vaccination', 'lab_test', 'scan', 'other');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error', 'system', 'appointment', 'billing', 'clinical', 'sms', 'whatsapp');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "NHISCoverageType" AS ENUM ('full', 'partial', 'not_covered');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'mobile_money', 'card', 'bank_transfer', 'cheque');

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('purchase', 'adjustment', 'requisition', 'sale', 'transfer_in', 'transfer_out', 'write_off');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('draft', 'submitted', 'approved', 'fulfilled', 'cancelled');

-- CreateEnum
CREATE TYPE "RequisitionUrgency" AS ENUM ('routine', 'urgent', 'emergency');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "BodyPart" AS ENUM ('head', 'chest', 'neck', 'abdomen', 'pelvis', 'spine', 'extremities', 'breast', 'eye', 'skeleton', 'other');

-- CreateEnum
CREATE TYPE "ProcedureCategory" AS ENUM ('surgical', 'diagnostic', 'therapeutic', 'obstetric', 'pediatric', 'dental', 'ophthalmic', 'laparoscopic', 'laparotomy', 'orthopedic', 'urology', 'ent', 'dermatology', 'neurology', 'emergency', 'minor');

-- CreateEnum
CREATE TYPE "LabCategory" AS ENUM ('hematology', 'biochemistry', 'microbiology', 'serology', 'immunology', 'toxicology', 'molecular', 'cytology', 'histopathology', 'pulmonology', 'neurology', 'cardiology', 'radiology', 'pathology', 'ophthalmology', 'pft', 'eeg', 'ecg', 'angiography', 'eye', 'gastroenterology', 'endocrinology', 'urinalysis');

-- CreateEnum
CREATE TYPE "ScanCategory" AS ENUM ('xray', 'ultrasound', 'ct_scan', 'mri', 'fluoroscopy', 'mammography', 'nuclear', 'pet_scan', 'dental_xray', 'nuclear_medicine', 'echocardiography', 'bone_densitometry', 'other');

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

-- CreateEnum
CREATE TYPE "GHSReportType" AS ENUM ('opd_morbidity', 'opd_attendance', 'ipd_morbidity', 'idsr', 'form_a_morbidity', 'form_a_services', 'form_a_complete', 'malaria_data', 'monthly_summary');

-- CreateEnum
CREATE TYPE "MalariaCommodityType" AS ENUM ('asaq_below_1yr', 'asaq_1_5yrs', 'asaq_6_13yrs', 'asaq_14_plus', 'al_0_3yrs', 'al_4_8yrs', 'al_9_13yrs', 'al_14_plus', 'dhap_40_320mg', 'quinine_tablet', 'quinine_injection', 'artesunate_injection_30mg', 'artesunate_injection_60mg', 'artesunate_injection_120mg', 'arthemeter_injection_40mg', 'arthemeter_injection_80mg', 'rectal_artesunate_50mg', 'rectal_artesunate_200mg', 'rdt_kits', 'sp');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('spontaneous_vertex', 'assisted_breech', 'vacuum', 'forceps', 'caesarean_section', 'multiple');

-- CreateEnum
CREATE TYPE "DeliveryOutcome" AS ENUM ('live_birth', 'stillbirth_fresh', 'stillbirth_macerated', 'neonatal_death');

-- CreateEnum
CREATE TYPE "MaternalOutcome" AS ENUM ('alive', 'dead_direct_cause', 'dead_indirect_cause', 'dead_unknown');

-- CreateEnum
CREATE TYPE "NewbornOutcome" AS ENUM ('alive', 'stillbirth_fresh', 'stillbirth_macerated', 'dead_within_24hrs', 'dead_1_7days', 'dead_8_28days', 'referred_out');

-- CreateEnum
CREATE TYPE "AbortionType" AS ENUM ('spontaneous', 'induced_safe', 'induced_unsafe', 'septic', 'incomplete', 'complete', 'missed', 'recurrent');

-- CreateEnum
CREATE TYPE "AbortionMethod" AS ENUM ('medical', 'surgical_d_and_c', 'surgical_mva', 'other');

-- CreateEnum
CREATE TYPE "PatientClassification" AS ENUM ('NEW', 'OLD');

-- CreateEnum
CREATE TYPE "DiagnosisClassification" AS ENUM ('NEW_DIAGNOSIS', 'OLD_DIAGNOSIS');

-- CreateEnum
CREATE TYPE "CordCareMethod" AS ENUM ('dry_cord', 'chlorhexidine', 'methylated_spirit', 'alcohol', 'other');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('TRAINEE', 'JUNIOR', 'SENIOR', 'PRINCIPAL');

-- CreateEnum
CREATE TYPE "PlaceOfDelivery" AS ENUM ('private_hospital', 'government_hospital', 'health_centre', 'clinic', 'chag_facility', 'private_midwife', 'tba_trained', 'tba_untrained', 'home', 'en_route', 'mines_facility', 'quasi_govt_institution');

-- CreateEnum
CREATE TYPE "GraValidationStatus" AS ENUM ('pending', 'validated', 'rejected');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('treatment', 'data_sharing', 'research', 'nhis_claims', 'billing');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('granted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "PayslipLineItemType" AS ENUM ('earning', 'deduction');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'CONTRACT', 'LOCUM', 'INTERN', 'NATIONAL_SERVICE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LICENSE', 'CERTIFICATE', 'ID_CARD', 'DEGREE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'EMERGENCY', 'UNPAID', 'STUDY', 'COMPASSIONATE');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('morning', 'afternoon', 'night', 'on_call');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('proposed', 'scheduled', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "DoseStatus" AS ENUM ('scheduled', 'due', 'administered', 'late', 'missed', 'refused', 'held', 'discontinued');

-- CreateEnum
CREATE TYPE "NursingNoteType" AS ENUM ('general', 'observation', 'shift_handover', 'escalation', 'medication', 'procedure', 'patient_communication', 'family_communication');

-- CreateEnum
CREATE TYPE "NursingTaskType" AS ENUM ('vitals', 'medication', 'wound_care', 'iv_change', 'position_change', 'fluid_balance', 'blood_glucose', 'catheter_care', 'general', 'other');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "NursingTaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

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
    "cashPrice" DECIMAL(15,2) NOT NULL,
    "nhisPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "insurancePrice" DECIMAL(15,2) NOT NULL,
    "corporatePrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
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
    "maritalStatus" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "contact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "residenceCommunity" TEXT,
    "residenceDistrict" TEXT,
    "residenceRegion" TEXT,
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
    "nhisNumber" TEXT,
    "cccId" TEXT,
    "nhisExpiryDate" TIMESTAMP(3),
    "nhisActive" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumber" TEXT,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounterClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageYears" INTEGER,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "registeredPatientId" TEXT,

    CONSTRAINT "CounterClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAllergy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" TEXT,
    "notes" TEXT,

    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMedicalHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "diagnosedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "PatientMedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientSurgicalHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "surgeryDate" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "PatientSurgicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientFamilyHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PatientFamilyHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientConsent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "notes" TEXT,
    "documentUrl" TEXT,

    CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id")
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
    "annualLimit" DECIMAL(15,2),
    "requiresPreAuth" BOOLEAN NOT NULL DEFAULT false,
    "coPaymentAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
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
    "estimatedTotalCost" DECIMAL(15,2) NOT NULL,
    "clinicalJustification" TEXT,
    "status" "PreAuthStatus" NOT NULL DEFAULT 'pending',
    "responseReceivedAt" TIMESTAMP(3),
    "approvedAmount" DECIMAL(15,2),
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
    "patientId" TEXT,
    "counterClientId" TEXT,
    "insuranceProviderId" TEXT,
    "corporateAccountId" TEXT,
    "bedId" TEXT,
    "wardId" TEXT,
    "attendanceType" "AttendanceType" NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMode" "PaymentMode" NOT NULL,
    "nhisCCC" TEXT,
    "nhisCCCCode" TEXT,
    "nhisCCCGeneratedAt" TIMESTAMP(3),
    "nhisCCCValidUntil" TIMESTAMP(3),
    "complaints" TEXT,
    "historyPresentingComplaint" TEXT,
    "reviewOfSystems" JSONB,
    "physicalExamination" TEXT,
    "physicalExamStructured" JSONB,
    "assessment" TEXT,
    "treatmentPlan" TEXT,
    "clinicalOutcome" "ClinicalConditionOutcome",
    "allergyReviewStatus" "AllergyReviewStatus",
    "allergyReviewNotes" TEXT,
    "allergyReviewedAt" TIMESTAMP(3),
    "allergyReviewedById" TEXT,
    "providerId" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "medicalNotes" TEXT,
    "clinicalNotes" JSONB,
    "encounterCategory" "EncounterCategory" NOT NULL DEFAULT 'opd',
    "visitCategory" "VisitCategory" NOT NULL DEFAULT 'general',
    "gdrgCategory" TEXT,
    "serviceCategory" "ServiceCategory",
    "followUpDate" TIMESTAMP(3),
    "totalBill" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstandingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "preAuthNumber" TEXT,
    "preAuthApproved" BOOLEAN NOT NULL DEFAULT false,
    "preAuthAmount" DECIMAL(15,2),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'pending',
    "referringFacility" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "corporateEmployeeId" TEXT,
    "patientClassification" "PatientClassification",
    "diagnosisClassification" "DiagnosisClassification",

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
    "cost" DECIMAL(15,2),
    "duration" INTEGER,
    "createdById" TEXT NOT NULL,
    "anesthesiaNotes" TEXT,
    "intraOperativeNotes" TEXT,
    "postOperativeNotes" TEXT,
    "clinicalRecord" JSONB,
    "bloodLoss" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdrg_tariff_procedures" (
    "gdrgTariffId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "mappedCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gdrg_tariff_procedures_pkey" PRIMARY KEY ("gdrgTariffId","procedureId")
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
    "dispensedQuantity" INTEGER,
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
    "dispensedUnitCost" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "administeredDoses" JSONB,

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
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL,
    "wardName" TEXT NOT NULL,
    "wardType" TEXT NOT NULL,
    "totalBeds" INTEGER NOT NULL,
    "occupiedBeds" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isNHISCovered" BOOLEAN NOT NULL DEFAULT true,
    "nhisRequiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "isPrivateInsExempted" BOOLEAN NOT NULL DEFAULT false,
    "isPending" BOOLEAN NOT NULL DEFAULT true,
    "requiresAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "tariffCode" TEXT,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "dailyCashRate" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dailyNHISRate" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dailyInsuranceRate" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dailyCorporateRate" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GDRGTariff" (
    "id" TEXT NOT NULL,
    "gdrgCode" TEXT NOT NULL,
    "mdc" "GDRGMDC" NOT NULL,
    "description" TEXT NOT NULL,
    "nhiaTariff" DECIMAL(15,2) NOT NULL,
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
    "diagnosisType" "DiagnosisType" NOT NULL DEFAULT 'provisional',
    "classification" "DiagnosisClassification",
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "icdCode" TEXT,
    "presentOnAdmission" "PresentOnAdmission",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "counterClientId" TEXT,
    "attendanceId" TEXT NOT NULL,
    "admissionId" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "waiverAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxBreakdown" JSONB,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "insuranceCovered" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "patientPayable" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "BillStatus" NOT NULL DEFAULT 'draft',
    "paymentMode" "PaymentMode" NOT NULL,
    "corporateAccountId" TEXT,
    "insuranceProviderId" TEXT,
    "preAuthNumber" TEXT,
    "claimNumber" TEXT,
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'draft',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "graDeclarationCode" TEXT,
    "graQrCodeData" TEXT,
    "graValidationStatus" "GraValidationStatus",

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_line_items" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "serviceCatalogId" TEXT,
    "sourceKey" TEXT,
    "description" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "pricingBasis" "PaymentMode" NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxBreakdown" JSONB,
    "lineTotal" DECIMAL(15,2) NOT NULL,
    "insuranceCoveredAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "patientPayableAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
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
    "amountRequested" DECIMAL(15,2) NOT NULL,
    "amountApproved" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "WaiverStatus" NOT NULL DEFAULT 'pending',
    "appliedAt" TIMESTAMP(3),
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
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "idempotencyKey" TEXT,
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
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "refundMethod" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "reason" TEXT NOT NULL,
    "refundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "momo_payment_intents" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "payerPhone" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "paymentIdempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerStatus" TEXT,
    "providerTransactionId" TEXT,
    "paymentId" TEXT,
    "initiatedById" TEXT NOT NULL,
    "lastCheckedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "momo_payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "billId" TEXT,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "insuranceProviderId" TEXT NOT NULL,
    "corporateAccountId" TEXT,
    "totalClaimAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "ClaimStatus" NOT NULL DEFAULT 'draft',
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "preAuthNumber" TEXT,
    "diagnosisCodes" JSONB,
    "procedureCodes" JSONB,
    "labTestCodes" JSONB,
    "serviceCodes" JSONB,
    "scanCodes" JSONB,
    "principalGDRG" TEXT,
    "claimCheckCode" TEXT,
    "typeOfService" TEXT,
    "typeOfAttendance" TEXT,
    "serviceOutcome" TEXT,
    "mdcCode" TEXT,
    "datesOfService" JSONB,
    "medicationCodes" JSONB,
    "gdrgCodes" JSONB,
    "nhisServiceCodes" JSONB,
    "metadata" JSONB,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "batch_id" TEXT,

    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claim_tracking_events" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT,
    "submissionDate" TIMESTAMP(3),
    "payerReference" TEXT,
    "amount" DECIMAL(15,2),
    "paymentReference" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_claim_tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_batch_tracking_events" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT,
    "submissionDate" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    "payerReference" TEXT,
    "amount" DECIMAL(15,2),
    "paymentReference" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_batch_tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claimit_submissions" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "batchId" TEXT,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "outcome" "ClaimItOutcome" NOT NULL,
    "payload" JSONB NOT NULL,
    "issues" JSONB NOT NULL DEFAULT '[]',
    "payerCost" DECIMAL(15,2),
    "initialCost" DECIMAL(15,2),
    "reportSummary" JSONB,
    "responseMs" INTEGER,
    "requestId" TEXT,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claimit_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "insuranceType" "InsuranceType" NOT NULL,
    "insuranceProviderId" TEXT,
    "corporateAccountId" TEXT,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "totalClaims" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "BatchStatus" NOT NULL DEFAULT 'generated',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "xmlFilePath" TEXT,
    "printFilePath" TEXT,
    "description" TEXT,
    "claimFamily" TEXT NOT NULL DEFAULT 'ALL',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claim_items" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "billLineItemId" TEXT,
    "serviceCatalogId" TEXT,
    "diagnosisId" TEXT,
    "gdrgTariffId" TEXT,
    "labTestId" TEXT,
    "scanId" TEXT,
    "procedureId" TEXT,
    "medicationId" TEXT,
    "itemNumber" INTEGER NOT NULL,
    "itemCategory" "ClaimItemCategory" NOT NULL,
    "itemType" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "noOfDays" INTEGER,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "lineTotal" DECIMAL(15,2) NOT NULL,
    "serviceDate" TIMESTAMP(3),
    "authNo" TEXT,
    "clinician" TEXT,
    "prescriberNo" TEXT,
    "medicineType" TEXT,
    "prescriptionText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_claim_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ward_charge_records" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "admissionId" TEXT,
    "wardId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "chargeDate" TIMESTAMP(3) NOT NULL,
    "dailyRate" DECIMAL(15,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "nhisPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cashPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "insurancePrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "corporatePrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "billLineItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ward_charge_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "admissionType" "AdmissionType" NOT NULL DEFAULT 'emergency',
    "admissionSource" "AdmissionSource" NOT NULL DEFAULT 'home',
    "dischargeStatus" "DischargeStatus",
    "status" TEXT NOT NULL DEFAULT 'active',
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargeDate" TIMESTAMP(3),
    "dailyNotes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
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
    "structuredForm" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AntenatalBooking" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "currentAttendanceId" TEXT,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "lmp" TIMESTAMP(3),
    "edd" TIMESTAMP(3),
    "gestationalAgeWeeks" INTEGER,
    "gestationalAgeAtBooking" INTEGER,
    "gravida" INTEGER NOT NULL,
    "para" INTEGER NOT NULL,
    "previousCSection" BOOLEAN NOT NULL DEFAULT false,
    "previousComplications" TEXT,
    "bloodGroup" TEXT,
    "hivStatus" TEXT,
    "hbLevel" DOUBLE PRECISION,
    "vdrl" TEXT,
    "iptpDoses" JSONB NOT NULL,
    "iptp1Date" TIMESTAMP(3),
    "iptp2Date" TIMESTAMP(3),
    "iptp3Date" TIMESTAMP(3),
    "iptp4Date" TIMESTAMP(3),
    "iptp5Date" TIMESTAMP(3),
    "ttDoses" JSONB NOT NULL,
    "tt1Date" TIMESTAMP(3),
    "tt2Date" TIMESTAMP(3),
    "tt3Date" TIMESTAMP(3),
    "tt4Date" TIMESTAMP(3),
    "tt5Date" TIMESTAMP(3),
    "malariaTested" BOOLEAN NOT NULL DEFAULT false,
    "malariaPositive" BOOLEAN NOT NULL DEFAULT false,
    "malariaTreatment" TEXT,
    "malariaIPTpGiven" BOOLEAN NOT NULL DEFAULT false,
    "hbBooking" DOUBLE PRECISION,
    "hb36Weeks" DOUBLE PRECISION,
    "anaemiaDiagnosed" BOOLEAN NOT NULL DEFAULT false,
    "ironFolateGiven" BOOLEAN NOT NULL DEFAULT false,
    "itnGiven" BOOLEAN NOT NULL DEFAULT false,
    "itnGivenDate" TIMESTAMP(3),
    "malePartnerInvolved" BOOLEAN NOT NULL DEFAULT false,
    "partnerHivStatus" TEXT,
    "hivKnownPositive" BOOLEAN NOT NULL DEFAULT false,
    "hepatitisBStatus" TEXT,
    "bookingHeight" DOUBLE PRECISION,
    "bookingWeight" DOUBLE PRECISION,
    "bookingBP" TEXT,
    "riskLevel" "AntenatalRisk" NOT NULL,
    "riskFactors" JSONB,
    "deliveryRecordId" TEXT,
    "deliveryOutcome" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "abortionRecordId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AntenatalBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ANCVisit" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "visitNumber" INTEGER NOT NULL,
    "gravida" INTEGER,
    "para" INTEGER,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "gestationalAgeWeeks" INTEGER,
    "gestationalAgeDays" INTEGER,
    "weight" DOUBLE PRECISION,
    "bloodPressure" TEXT,
    "fundalHeight" INTEGER,
    "fetalHeartRate" INTEGER,
    "fetalMovements" BOOLEAN,
    "presentation" TEXT,
    "oedema" BOOLEAN NOT NULL DEFAULT false,
    "oedemaGrade" TEXT,
    "urinalysisProtein" BOOLEAN,
    "urinalysisGlucose" BOOLEAN,
    "urinalysisBlood" BOOLEAN,
    "iptpGiven" BOOLEAN NOT NULL DEFAULT false,
    "iptpDoseNumber" INTEGER,
    "iptpDrug" TEXT,
    "ttGiven" BOOLEAN NOT NULL DEFAULT false,
    "ttDoseNumber" INTEGER,
    "ironGiven" BOOLEAN NOT NULL DEFAULT false,
    "folateGiven" BOOLEAN NOT NULL DEFAULT false,
    "calciumGiven" BOOLEAN NOT NULL DEFAULT false,
    "malariaTestDone" BOOLEAN NOT NULL DEFAULT false,
    "malariaTestResult" TEXT,
    "malariaTreatmentGiven" BOOLEAN NOT NULL DEFAULT false,
    "dangerSignsPresent" BOOLEAN NOT NULL DEFAULT false,
    "dangerSignsList" TEXT[],
    "referralMade" BOOLEAN NOT NULL DEFAULT false,
    "referredTo" TEXT,
    "nextVisitDate" TIMESTAMP(3),
    "returnInstructions" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ANCVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postnatal_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "antenatalBookingId" TEXT,
    "deliveryRecordId" TEXT,
    "examinationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dayNumber" INTEGER NOT NULL DEFAULT 1,
    "maternalCondition" TEXT,
    "maternalComplications" JSONB NOT NULL DEFAULT '[]',
    "bloodPressure" TEXT,
    "temperature" DOUBLE PRECISION,
    "pulse" INTEGER,
    "fundalHeight" INTEGER,
    "lochia" TEXT,
    "perinealCondition" TEXT,
    "caesareanWound" TEXT,
    "breastfeedingStatus" TEXT,
    "breastfeedingDifficulties" JSONB NOT NULL DEFAULT '[]',
    "latching" TEXT,
    "babyCondition" TEXT,
    "babyWeight" DOUBLE PRECISION,
    "babyTemperature" DOUBLE PRECISION,
    "babyFeeding" TEXT,
    "jaundice" BOOLEAN NOT NULL DEFAULT false,
    "jaundiceSeverity" TEXT,
    "cordCondition" TEXT,
    "bcgGiven" BOOLEAN NOT NULL DEFAULT false,
    "opv0Given" BOOLEAN NOT NULL DEFAULT false,
    "hepB0Given" BOOLEAN NOT NULL DEFAULT false,
    "familyPlanningDiscussed" BOOLEAN NOT NULL DEFAULT false,
    "familyPlanningMethodAccepted" TEXT,
    "maternalDangerSigns" JSONB NOT NULL DEFAULT '[]',
    "babyDangerSigns" JSONB NOT NULL DEFAULT '[]',
    "referralMade" BOOLEAN NOT NULL DEFAULT false,
    "referredTo" TEXT,
    "referralReason" TEXT,
    "nextVisitDate" TIMESTAMP(3),
    "nextVisitType" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "malePartnerPresentPNC" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "postnatal_records_pkey" PRIMARY KEY ("id")
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
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
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
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "preparationInstructions" TEXT,
    "duration" INTEGER NOT NULL,
    "contrastRequired" BOOLEAN NOT NULL DEFAULT false,
    "scanType" TEXT,
    "resultTemplate" JSONB,
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
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
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
    "cashPrice" DECIMAL(15,2) NOT NULL,
    "nhisPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "insurancePrice" DECIMAL(15,2) NOT NULL,
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
    "costPrice" DECIMAL(15,2) NOT NULL,
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
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "isMedication" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_item_payer_rules" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "insuranceProviderId" TEXT NOT NULL,
    "isCovered" BOOLEAN,
    "authorizationRequired" BOOLEAN,
    "prescribingLevel" TEXT,
    "copaymentMode" TEXT NOT NULL DEFAULT 'none',
    "copaymentAmount" DECIMAL(15,2),
    "copaymentPercentage" DOUBLE PRECISION,
    "tariffPrice" DECIMAL(15,2),
    "sourceFile" TEXT,
    "sourceVersion" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_item_payer_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_item_department_balances" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "departmentId" TEXT,
    "wardId" TEXT,
    "locationKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_item_department_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costPrice" DECIMAL(15,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departmentId" TEXT,
    "wardId" TEXT,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "receivedAtDepartmentId" TEXT,
    "receivedAtWardId" TEXT,
    "corporateAccountId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(15,2) NOT NULL,
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
    "performedBy" TEXT,
    "requisitionId" TEXT,
    "invoiceId" TEXT,
    "departmentId" TEXT,
    "wardId" TEXT,
    "batchAllocations" JSONB,
    "adjustmentDirection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisition" (
    "id" TEXT NOT NULL,
    "requisitionNumber" TEXT NOT NULL,
    "requestingDepartmentId" TEXT,
    "supplyingDepartmentId" TEXT,
    "requestingWardId" TEXT,
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
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'requested',
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantityRequested" INTEGER NOT NULL,
    "quantitySent" INTEGER NOT NULL DEFAULT 0,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "batchAllocations" JSONB,

    CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
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
    "isStore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "appointmentNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT,
    "clinicianRole" "UserRole",
    "departmentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled',
    "type" "AppointmentType" NOT NULL DEFAULT 'consultation',
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "attendanceId" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
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
    "nhis_api_base_url" TEXT,
    "nhis_api_client_id" TEXT,
    "nhis_api_token_endpoint" TEXT,
    "nhis_api_eligibility_endpoint" TEXT,
    "nhis_api_ccc_endpoint" TEXT,
    "nhis_api_active" BOOLEAN NOT NULL DEFAULT false,
    "nhis_api_last_token_refresh" TIMESTAMP(3),
    "nhis_api_token_expires_at" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_configuration" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultExempt" BOOLEAN NOT NULL DEFAULT true,
    "taxId" TEXT,
    "payerModes" TEXT[] DEFAULT ARRAY['cash']::TEXT[],
    "components" JSONB NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_configuration_pkey" PRIMARY KEY ("id")
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
    "imageUrl" TEXT,
    "licenseNumber" TEXT,
    "specialization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,
    "seniority" "Seniority" NOT NULL DEFAULT 'JUNIOR',
    "resetToken" TEXT,
    "resetExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "senderId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL,
    "actionType" TEXT,
    "actionId" TEXT,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
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
    "placeOfDelivery" "PlaceOfDelivery" NOT NULL DEFAULT 'private_hospital',
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
    "antenatalBookingId" TEXT,
    "malePartnerPresentANC" BOOLEAN NOT NULL DEFAULT false,
    "malePartnerPresentDelivery" BOOLEAN NOT NULL DEFAULT false,
    "malePartnerPresentPNC" BOOLEAN NOT NULL DEFAULT false,
    "maternalDeathsAudited" BOOLEAN NOT NULL DEFAULT false,
    "auditNotes" TEXT,

    CONSTRAINT "delivery_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newborn_records" (
    "id" TEXT NOT NULL,
    "deliveryRecordId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "birthWeight" DOUBLE PRECISION NOT NULL,
    "gender" "Gender" NOT NULL,
    "apgarScore1min" INTEGER,
    "apgarScore5min" INTEGER,
    "resuscitation" BOOLEAN NOT NULL DEFAULT false,
    "outcome" "NewbornOutcome" NOT NULL,
    "anomalies" TEXT[],
    "referredTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "breastfeedingWithin30Min" BOOLEAN NOT NULL DEFAULT false,
    "eyeProphylaxisGiven" BOOLEAN NOT NULL DEFAULT false,
    "cordCareMethod" "CordCareMethod" NOT NULL DEFAULT 'dry_cord',
    "babyWeightAt6to10Days" DOUBLE PRECISION,
    "weightAt6to10DaysDate" TIMESTAMP(3),

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
    "postAbortionFPCounselled" BOOLEAN NOT NULL DEFAULT false,
    "postAbortionFPAccepted" BOOLEAN NOT NULL DEFAULT false,
    "fpMethodAccepted" TEXT,
    "antenatalBookingId" TEXT,

    CONSTRAINT "abortion_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProformaInvoice" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "attendanceId" TEXT,
    "admissionId" TEXT,
    "status" "ProformaInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxBreakdown" JSONB,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "validityDays" INTEGER NOT NULL DEFAULT 7,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "termsAndConditions" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "convertedToBillId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "graDeclarationCode" TEXT,
    "graQrCodeData" TEXT,
    "graValidationStatus" "GraValidationStatus",
    "corporateAccountId" TEXT,

    CONSTRAINT "ProformaInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProformaInvoiceItem" (
    "id" TEXT NOT NULL,
    "proformaInvoiceId" TEXT NOT NULL,
    "serviceCatalogId" TEXT,
    "description" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "pricingBasis" "PaymentMode" NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxBreakdown" JSONB,
    "totalPrice" DECIMAL(15,2) NOT NULL,
    "isInsuranceCovered" BOOLEAN NOT NULL DEFAULT false,
    "insuranceCoverage" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "patientResponsibility" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "ProformaInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "senderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_templates" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CommunicationType" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "templateId" TEXT,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "cost" DECIMAL(15,2),
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_planning_services" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "FPMethod" NOT NULL,
    "methodCategory" "FPMethodCategory" NOT NULL,
    "isNewAcceptor" BOOLEAN NOT NULL DEFAULT false,
    "counsellingGiven" BOOLEAN NOT NULL DEFAULT true,
    "informedConsent" BOOLEAN NOT NULL DEFAULT false,
    "sideEffects" TEXT,
    "contraindications" TEXT,
    "medicalEligibilityCategory" INTEGER,
    "nextFollowUpDate" TIMESTAMP(3),
    "followUpStatus" TEXT,
    "isPostpartum" BOOLEAN NOT NULL DEFAULT false,
    "isPostAbortion" BOOLEAN NOT NULL DEFAULT false,
    "postpartumWeeks" INTEGER,
    "postpartumDeliveryRecordId" TEXT,
    "postnatalRecordId" TEXT,
    "postAbortionRecordId" TEXT,
    "cypFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "providedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_planning_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_accounts" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "creditLimit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "insuranceProviderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_employees" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "otherNames" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "phone" TEXT,
    "email" TEXT,
    "department" TEXT,
    "position" TEXT,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_grades" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "baseSalary" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_steps" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "yearsRequired" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dateJoined" TIMESTAMP(3) NOT NULL,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'PERMANENT',
    "departmentId" TEXT,
    "jobGradeId" TEXT,
    "salaryStepId" TEXT,
    "bio" TEXT,
    "nextOfKinName" TEXT,
    "nextOfKinPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_documents" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" DECIMAL(10,2) NOT NULL,
    "allowances" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(10,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "payslipUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_line_items" (
    "id" TEXT NOT NULL,
    "payrollRecordId" TEXT NOT NULL,
    "type" "PayslipLineItemType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslip_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "shiftType" "ShiftType" NOT NULL DEFAULT 'morning',
    "status" "ShiftStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'pending',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_doses" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "doseNumber" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "administeredAt" TIMESTAMP(3),
    "administeredById" TEXT,
    "status" "DoseStatus" NOT NULL DEFAULT 'scheduled',
    "dose" TEXT,
    "route" TEXT,
    "site" TEXT,
    "notes" TEXT,
    "varianceReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_doses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_notes" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "admissionId" TEXT,
    "noteType" "NursingNoteType" NOT NULL DEFAULT 'general',
    "shift" "ShiftType",
    "content" TEXT NOT NULL,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "nursing_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_tasks" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "admissionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "taskType" "NursingTaskType" NOT NULL DEFAULT 'general',
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "status" "NursingTaskStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nursing_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "codeHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "password_reset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "diseaseTargets" TEXT[],
    "recommendedAge" TEXT,
    "doseSchedule" JSONB,
    "defaultDoseVolume" TEXT,
    "defaultRoute" TEXT,
    "stockItemId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "immunization_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "doseNumber" TEXT NOT NULL,
    "administeredAt" TIMESTAMP(3) NOT NULL,
    "doseVolume" TEXT,
    "route" TEXT,
    "administrationSite" TEXT,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "nextDoseDue" TIMESTAMP(3),
    "adverseReaction" TEXT,
    "notes" TEXT,
    "administeredById" TEXT,
    "recordedById" TEXT NOT NULL,
    "stockTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "immunization_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserAdditionalDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserAdditionalDepartments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RoleToUser_AB_pkey" PRIMARY KEY ("A","B")
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
CREATE INDEX "service_pricing_serviceCatalogId_effectiveDate_idx" ON "service_pricing"("serviceCatalogId", "effectiveDate");

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
CREATE INDEX "Patient_nhisNumber_idx" ON "Patient"("nhisNumber");

-- CreateIndex
CREATE INDEX "Patient_phoneNumber_idx" ON "Patient"("phoneNumber");

-- CreateIndex
CREATE INDEX "Patient_dateOfBirth_idx" ON "Patient"("dateOfBirth");

-- CreateIndex
CREATE INDEX "Patient_gender_idx" ON "Patient"("gender");

-- CreateIndex
CREATE INDEX "Patient_folderNumber_idx" ON "Patient"("folderNumber");

-- CreateIndex
CREATE INDEX "Patient_otherNames_idx" ON "Patient"("otherNames");

-- CreateIndex
CREATE INDEX "Patient_paymentMode_idx" ON "Patient"("paymentMode");

-- CreateIndex
CREATE INDEX "Patient_surname_idx" ON "Patient"("surname");

-- CreateIndex
CREATE INDEX "Patient_contact_idx" ON "Patient"("contact");

-- CreateIndex
CREATE INDEX "Patient_createdAt_idx" ON "Patient"("createdAt");

-- CreateIndex
CREATE INDEX "Patient_residenceDistrict_idx" ON "Patient"("residenceDistrict");

-- CreateIndex
CREATE INDEX "Patient_residenceRegion_idx" ON "Patient"("residenceRegion");

-- CreateIndex
CREATE UNIQUE INDEX "CounterClient_registeredPatientId_key" ON "CounterClient"("registeredPatientId");

-- CreateIndex
CREATE INDEX "CounterClient_name_idx" ON "CounterClient"("name");

-- CreateIndex
CREATE INDEX "CounterClient_phone_idx" ON "CounterClient"("phone");

-- CreateIndex
CREATE INDEX "CounterClient_createdAt_idx" ON "CounterClient"("createdAt");

-- CreateIndex
CREATE INDEX "PatientAllergy_patientId_idx" ON "PatientAllergy"("patientId");

-- CreateIndex
CREATE INDEX "PatientMedicalHistory_patientId_idx" ON "PatientMedicalHistory"("patientId");

-- CreateIndex
CREATE INDEX "PatientSurgicalHistory_patientId_idx" ON "PatientSurgicalHistory"("patientId");

-- CreateIndex
CREATE INDEX "PatientFamilyHistory_patientId_idx" ON "PatientFamilyHistory"("patientId");

-- CreateIndex
CREATE INDEX "PatientConsent_patientId_idx" ON "PatientConsent"("patientId");

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
CREATE INDEX "Attendance_nhisCCCCode_idx" ON "Attendance"("nhisCCCCode");

-- CreateIndex
CREATE INDEX "Attendance_patientId_dateTime_idx" ON "Attendance"("patientId", "dateTime");

-- CreateIndex
CREATE INDEX "Attendance_counterClientId_idx" ON "Attendance"("counterClientId");

-- CreateIndex
CREATE INDEX "Attendance_insuranceProviderId_idx" ON "Attendance"("insuranceProviderId");

-- CreateIndex
CREATE INDEX "Attendance_bedId_idx" ON "Attendance"("bedId");

-- CreateIndex
CREATE INDEX "Attendance_wardId_idx" ON "Attendance"("wardId");

-- CreateIndex
CREATE INDEX "Attendance_attendanceType_idx" ON "Attendance"("attendanceType");

-- CreateIndex
CREATE INDEX "Attendance_dateTime_idx" ON "Attendance"("dateTime");

-- CreateIndex
CREATE INDEX "Attendance_patientId_idx" ON "Attendance"("patientId");

-- CreateIndex
CREATE INDEX "Attendance_paymentMode_idx" ON "Attendance"("paymentMode");

-- CreateIndex
CREATE INDEX "Attendance_providerId_idx" ON "Attendance"("providerId");

-- CreateIndex
CREATE INDEX "Attendance_finalizedAt_idx" ON "Attendance"("finalizedAt");

-- CreateIndex
CREATE INDEX "Attendance_clinicalOutcome_idx" ON "Attendance"("clinicalOutcome");

-- CreateIndex
CREATE INDEX "Attendance_corporateAccountId_idx" ON "Attendance"("corporateAccountId");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX "Attendance_gdrgCategory_idx" ON "Attendance"("gdrgCategory");

-- CreateIndex
CREATE INDEX "Attendance_serviceCategory_idx" ON "Attendance"("serviceCategory");

-- CreateIndex
CREATE INDEX "Attendance_encounterCategory_idx" ON "Attendance"("encounterCategory");

-- CreateIndex
CREATE INDEX "Attendance_visitCategory_idx" ON "Attendance"("visitCategory");

-- CreateIndex
CREATE INDEX "Attendance_dateTime_status_idx" ON "Attendance"("dateTime", "status");

-- CreateIndex
CREATE INDEX "LabTest_attendanceId_status_idx" ON "LabTest"("attendanceId", "status");

-- CreateIndex
CREATE INDEX "LabTest_templateId_idx" ON "LabTest"("templateId");

-- CreateIndex
CREATE INDEX "LabTest_requestedAt_idx" ON "LabTest"("requestedAt");

-- CreateIndex
CREATE INDEX "LabTest_attendanceId_idx" ON "LabTest"("attendanceId");

-- CreateIndex
CREATE INDEX "LabTest_serviceCatalogId_idx" ON "LabTest"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "LabTest_status_idx" ON "LabTest"("status");

-- CreateIndex
CREATE INDEX "Scan_attendanceId_status_idx" ON "Scan"("attendanceId", "status");

-- CreateIndex
CREATE INDEX "Scan_templateId_idx" ON "Scan"("templateId");

-- CreateIndex
CREATE INDEX "Scan_requestedAt_idx" ON "Scan"("requestedAt");

-- CreateIndex
CREATE INDEX "Scan_attendanceId_idx" ON "Scan"("attendanceId");

-- CreateIndex
CREATE INDEX "Scan_serviceCatalogId_idx" ON "Scan"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "Scan_status_idx" ON "Scan"("status");

-- CreateIndex
CREATE INDEX "Procedure_attendanceId_status_idx" ON "Procedure"("attendanceId", "status");

-- CreateIndex
CREATE INDEX "Procedure_templateId_idx" ON "Procedure"("templateId");

-- CreateIndex
CREATE INDEX "Procedure_performedAt_idx" ON "Procedure"("performedAt");

-- CreateIndex
CREATE INDEX "Procedure_attendanceId_idx" ON "Procedure"("attendanceId");

-- CreateIndex
CREATE INDEX "Procedure_serviceCatalogId_idx" ON "Procedure"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "Procedure_status_idx" ON "Procedure"("status");

-- CreateIndex
CREATE INDEX "gdrg_tariff_procedures_procedureId_idx" ON "gdrg_tariff_procedures"("procedureId");

-- CreateIndex
CREATE INDEX "Medication_attendanceId_status_idx" ON "Medication"("attendanceId", "status");

-- CreateIndex
CREATE INDEX "Medication_prescribedAt_idx" ON "Medication"("prescribedAt");

-- CreateIndex
CREATE INDEX "Medication_stockItemId_idx" ON "Medication"("stockItemId");

-- CreateIndex
CREATE INDEX "Medication_attendanceId_idx" ON "Medication"("attendanceId");

-- CreateIndex
CREATE INDEX "Medication_serviceCatalogId_idx" ON "Medication"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "Medication_status_idx" ON "Medication"("status");

-- CreateIndex
CREATE INDEX "Vitals_attendanceId_recordedAt_idx" ON "Vitals"("attendanceId", "recordedAt");

-- CreateIndex
CREATE INDEX "Vitals_patientId_recordedAt_idx" ON "Vitals"("patientId", "recordedAt");

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
CREATE INDEX "AttendanceDiagnosis_diagnosisType_idx" ON "AttendanceDiagnosis"("diagnosisType");

-- CreateIndex
CREATE INDEX "AttendanceDiagnosis_classification_createdAt_idx" ON "AttendanceDiagnosis"("classification", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceDiagnosis_createdAt_idx" ON "AttendanceDiagnosis"("createdAt");

-- CreateIndex
CREATE INDEX "AttendanceDiagnosis_createdAt_diagnosisId_idx" ON "AttendanceDiagnosis"("createdAt", "diagnosisId");

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
CREATE INDEX "Bill_counterClientId_idx" ON "Bill"("counterClientId");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE INDEX "Bill_admissionId_idx" ON "Bill"("admissionId");

-- CreateIndex
CREATE INDEX "Bill_billDate_status_idx" ON "Bill"("billDate", "status");

-- CreateIndex
CREATE INDEX "Bill_createdAt_idx" ON "Bill"("createdAt");

-- CreateIndex
CREATE INDEX "bill_line_items_billId_idx" ON "bill_line_items"("billId");

-- CreateIndex
CREATE INDEX "bill_line_items_serviceCatalogId_idx" ON "bill_line_items"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "bill_line_items_serviceType_idx" ON "bill_line_items"("serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "bill_line_items_billId_sourceKey_key" ON "bill_line_items"("billId", "sourceKey");

-- CreateIndex
CREATE INDEX "patient_waivers_patientId_idx" ON "patient_waivers"("patientId");

-- CreateIndex
CREATE INDEX "patient_waivers_status_idx" ON "patient_waivers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_billId_idx" ON "Payment"("billId");

-- CreateIndex
CREATE INDEX "Payment_transactionDate_idx" ON "Payment"("transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refundNumber_key" ON "refunds"("refundNumber");

-- CreateIndex
CREATE INDEX "refunds_billId_idx" ON "refunds"("billId");

-- CreateIndex
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- CreateIndex
CREATE INDEX "refunds_refundedAt_idx" ON "refunds"("refundedAt");

-- CreateIndex
CREATE UNIQUE INDEX "momo_payment_intents_providerReference_key" ON "momo_payment_intents"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "momo_payment_intents_idempotencyKey_key" ON "momo_payment_intents"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "momo_payment_intents_paymentIdempotencyKey_key" ON "momo_payment_intents"("paymentIdempotencyKey");

-- CreateIndex
CREATE INDEX "momo_payment_intents_billId_status_idx" ON "momo_payment_intents"("billId", "status");

-- CreateIndex
CREATE INDEX "momo_payment_intents_initiatedById_createdAt_idx" ON "momo_payment_intents"("initiatedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceClaim_claimNumber_key" ON "InsuranceClaim"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceClaim_attendanceId_key" ON "InsuranceClaim"("attendanceId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_claimNumber_idx" ON "InsuranceClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "InsuranceClaim_status_idx" ON "InsuranceClaim"("status");

-- CreateIndex
CREATE INDEX "InsuranceClaim_status_finalizedAt_idx" ON "InsuranceClaim"("status", "finalizedAt");

-- CreateIndex
CREATE INDEX "InsuranceClaim_batch_id_idx" ON "InsuranceClaim"("batch_id");

-- CreateIndex
CREATE INDEX "InsuranceClaim_corporateAccountId_idx" ON "InsuranceClaim"("corporateAccountId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_corporateAccountId_status_idx" ON "InsuranceClaim"("corporateAccountId", "status");

-- CreateIndex
CREATE INDEX "InsuranceClaim_insuranceProviderId_status_idx" ON "InsuranceClaim"("insuranceProviderId", "status");

-- CreateIndex
CREATE INDEX "InsuranceClaim_finalizedAt_idx" ON "InsuranceClaim"("finalizedAt");

-- CreateIndex
CREATE INDEX "insurance_claim_tracking_events_claimId_createdAt_idx" ON "insurance_claim_tracking_events"("claimId", "createdAt");

-- CreateIndex
CREATE INDEX "insurance_claim_tracking_events_eventType_createdAt_idx" ON "insurance_claim_tracking_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "insurance_claim_tracking_events_status_idx" ON "insurance_claim_tracking_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_claim_tracking_events_claimId_paymentReference_key" ON "insurance_claim_tracking_events"("claimId", "paymentReference");

-- CreateIndex
CREATE INDEX "claim_batch_tracking_events_batchId_createdAt_idx" ON "claim_batch_tracking_events"("batchId", "createdAt");

-- CreateIndex
CREATE INDEX "claim_batch_tracking_events_eventType_createdAt_idx" ON "claim_batch_tracking_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "claim_batch_tracking_events_status_idx" ON "claim_batch_tracking_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "claim_batch_tracking_events_batchId_paymentReference_key" ON "claim_batch_tracking_events"("batchId", "paymentReference");

-- CreateIndex
CREATE INDEX "claimit_submissions_claimId_createdAt_idx" ON "claimit_submissions"("claimId", "createdAt");

-- CreateIndex
CREATE INDEX "claimit_submissions_batchId_idx" ON "claimit_submissions"("batchId");

-- CreateIndex
CREATE INDEX "claimit_submissions_outcome_idx" ON "claimit_submissions"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "claimit_submissions_claimId_attemptNo_key" ON "claimit_submissions"("claimId", "attemptNo");

-- CreateIndex
CREATE UNIQUE INDEX "claim_batches_batchNumber_key" ON "claim_batches"("batchNumber");

-- CreateIndex
CREATE INDEX "claim_batches_periodYear_periodMonth_idx" ON "claim_batches"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "claim_batches_status_idx" ON "claim_batches"("status");

-- CreateIndex
CREATE INDEX "claim_batches_batchNumber_idx" ON "claim_batches"("batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "claim_batches_insuranceType_insuranceProviderId_corporateAc_key" ON "claim_batches"("insuranceType", "insuranceProviderId", "corporateAccountId", "periodYear", "periodMonth", "claimFamily");

-- CreateIndex
CREATE INDEX "insurance_claim_items_claimId_idx" ON "insurance_claim_items"("claimId");

-- CreateIndex
CREATE INDEX "insurance_claim_items_itemCategory_idx" ON "insurance_claim_items"("itemCategory");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_claim_items_claimId_itemNumber_key" ON "insurance_claim_items"("claimId", "itemNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ward_charge_records_billLineItemId_key" ON "ward_charge_records"("billLineItemId");

-- CreateIndex
CREATE INDEX "ward_charge_records_attendanceId_idx" ON "ward_charge_records"("attendanceId");

-- CreateIndex
CREATE INDEX "ward_charge_records_chargeDate_idx" ON "ward_charge_records"("chargeDate");

-- CreateIndex
CREATE INDEX "ward_charge_records_isBilled_idx" ON "ward_charge_records"("isBilled");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_attendanceId_key" ON "admissions"("attendanceId");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_admissionNumber_key" ON "admissions"("admissionNumber");

-- CreateIndex
CREATE INDEX "admissions_admissionNumber_idx" ON "admissions"("admissionNumber");

-- CreateIndex
CREATE INDEX "admissions_admissionDate_idx" ON "admissions"("admissionDate");

-- CreateIndex
CREATE INDEX "admissions_dischargeDate_idx" ON "admissions"("dischargeDate");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_wardId_bedNumber_key" ON "Bed"("wardId", "bedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "referral_records_referralNumber_key" ON "referral_records"("referralNumber");

-- CreateIndex
CREATE UNIQUE INDEX "referral_records_attendanceId_key" ON "referral_records"("attendanceId");

-- CreateIndex
CREATE INDEX "referral_records_patientId_idx" ON "referral_records"("patientId");

-- CreateIndex
CREATE INDEX "referral_records_referralDate_idx" ON "referral_records"("referralDate");

-- CreateIndex
CREATE INDEX "referral_records_status_idx" ON "referral_records"("status");

-- CreateIndex
CREATE INDEX "referral_records_attendanceId_idx" ON "referral_records"("attendanceId");

-- CreateIndex
CREATE UNIQUE INDEX "AntenatalBooking_attendanceId_key" ON "AntenatalBooking"("attendanceId");

-- CreateIndex
CREATE UNIQUE INDEX "AntenatalBooking_currentAttendanceId_key" ON "AntenatalBooking"("currentAttendanceId");

-- CreateIndex
CREATE UNIQUE INDEX "AntenatalBooking_deliveryRecordId_key" ON "AntenatalBooking"("deliveryRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "AntenatalBooking_abortionRecordId_key" ON "AntenatalBooking"("abortionRecordId");

-- CreateIndex
CREATE INDEX "AntenatalBooking_patientId_idx" ON "AntenatalBooking"("patientId");

-- CreateIndex
CREATE INDEX "AntenatalBooking_attendanceId_idx" ON "AntenatalBooking"("attendanceId");

-- CreateIndex
CREATE INDEX "AntenatalBooking_edd_idx" ON "AntenatalBooking"("edd");

-- CreateIndex
CREATE INDEX "AntenatalBooking_isActive_idx" ON "AntenatalBooking"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ANCVisit_attendanceId_key" ON "ANCVisit"("attendanceId");

-- CreateIndex
CREATE UNIQUE INDEX "ANCVisit_bookingId_visitNumber_key" ON "ANCVisit"("bookingId", "visitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "postnatal_records_attendanceId_key" ON "postnatal_records"("attendanceId");

-- CreateIndex
CREATE INDEX "postnatal_records_patientId_idx" ON "postnatal_records"("patientId");

-- CreateIndex
CREATE INDEX "postnatal_records_attendanceId_idx" ON "postnatal_records"("attendanceId");

-- CreateIndex
CREATE INDEX "postnatal_records_examinationDate_idx" ON "postnatal_records"("examinationDate");

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
CREATE INDEX "stock_item_payer_rules_insuranceProviderId_isCovered_idx" ON "stock_item_payer_rules"("insuranceProviderId", "isCovered");

-- CreateIndex
CREATE INDEX "stock_item_payer_rules_stockItemId_authorizationRequired_idx" ON "stock_item_payer_rules"("stockItemId", "authorizationRequired");

-- CreateIndex
CREATE UNIQUE INDEX "stock_item_payer_rules_stockItemId_insuranceProviderId_key" ON "stock_item_payer_rules"("stockItemId", "insuranceProviderId");

-- CreateIndex
CREATE INDEX "stock_item_department_balances_departmentId_stockItemId_idx" ON "stock_item_department_balances"("departmentId", "stockItemId");

-- CreateIndex
CREATE INDEX "stock_item_department_balances_wardId_stockItemId_idx" ON "stock_item_department_balances"("wardId", "stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_item_department_balances_stockItemId_locationKey_key" ON "stock_item_department_balances"("stockItemId", "locationKey");

-- CreateIndex
CREATE INDEX "stock_batches_stockItemId_expiryDate_idx" ON "stock_batches"("stockItemId", "expiryDate");

-- CreateIndex
CREATE INDEX "stock_batches_departmentId_idx" ON "stock_batches"("departmentId");

-- CreateIndex
CREATE INDEX "stock_batches_departmentId_stockItemId_idx" ON "stock_batches"("departmentId", "stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_batches_stockItemId_batchNumber_departmentId_wardId_key" ON "stock_batches"("stockItemId", "batchNumber", "departmentId", "wardId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_supplierName_idx" ON "Invoice"("supplierName");

-- CreateIndex
CREATE INDEX "Invoice_receivedAtDepartmentId_idx" ON "Invoice"("receivedAtDepartmentId");

-- CreateIndex
CREATE INDEX "Invoice_receivedAtWardId_idx" ON "Invoice"("receivedAtWardId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_invoiceId_stockItemId_key" ON "InvoiceItem"("invoiceId", "stockItemId");

-- CreateIndex
CREATE INDEX "StockTransaction_stockItemId_transactionDate_idx" ON "StockTransaction"("stockItemId", "transactionDate");

-- CreateIndex
CREATE INDEX "StockTransaction_transactionType_idx" ON "StockTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "StockTransaction_transactionDate_idx" ON "StockTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "StockTransaction_requisitionId_idx" ON "StockTransaction"("requisitionId");

-- CreateIndex
CREATE INDEX "StockTransaction_invoiceId_idx" ON "StockTransaction"("invoiceId");

-- CreateIndex
CREATE INDEX "StockTransaction_departmentId_idx" ON "StockTransaction"("departmentId");

-- CreateIndex
CREATE INDEX "StockTransaction_wardId_idx" ON "StockTransaction"("wardId");

-- CreateIndex
CREATE INDEX "StockTransaction_departmentId_transactionDate_idx" ON "StockTransaction"("departmentId", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Requisition_requisitionNumber_key" ON "Requisition"("requisitionNumber");

-- CreateIndex
CREATE INDEX "Requisition_requestingWardId_idx" ON "Requisition"("requestingWardId");

-- CreateIndex
CREATE INDEX "Requisition_requestingDepartmentId_idx" ON "Requisition"("requestingDepartmentId");

-- CreateIndex
CREATE INDEX "Requisition_supplyingDepartmentId_idx" ON "Requisition"("supplyingDepartmentId");

-- CreateIndex
CREATE INDEX "Requisition_status_idx" ON "Requisition"("status");

-- CreateIndex
CREATE INDEX "RequisitionItem_requisitionId_idx" ON "RequisitionItem"("requisitionId");

-- CreateIndex
CREATE INDEX "RequisitionItem_stockItemId_idx" ON "RequisitionItem"("stockItemId");

-- CreateIndex
CREATE INDEX "RequisitionItem_performedBy_idx" ON "RequisitionItem"("performedBy");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_transferNumber_key" ON "StockTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "StockTransfer_originId_status_idx" ON "StockTransfer"("originId", "status");

-- CreateIndex
CREATE INDEX "StockTransfer_destinationId_status_idx" ON "StockTransfer"("destinationId", "status");

-- CreateIndex
CREATE INDEX "StockTransfer_transferNumber_idx" ON "StockTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "StockTransfer_createdAt_idx" ON "StockTransfer"("createdAt");

-- CreateIndex
CREATE INDEX "StockTransfer_status_idx" ON "StockTransfer"("status");

-- CreateIndex
CREATE INDEX "StockTransferItem_stockItemId_idx" ON "StockTransferItem"("stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransferItem_transferId_stockItemId_key" ON "StockTransferItem"("transferId", "stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_headId_key" ON "departments"("headId");

-- CreateIndex
CREATE INDEX "departments_isActive_idx" ON "departments"("isActive");

-- CreateIndex
CREATE INDEX "departments_headId_idx" ON "departments"("headId");

-- CreateIndex
CREATE INDEX "departments_isStore_idx" ON "departments"("isStore");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointmentNumber_key" ON "appointments"("appointmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_attendanceId_key" ON "appointments"("attendanceId");

-- CreateIndex
CREATE INDEX "appointments_scheduledAt_idx" ON "appointments"("scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_patientId_status_idx" ON "appointments"("patientId", "status");

-- CreateIndex
CREATE INDEX "appointments_clinicianId_scheduledAt_idx" ON "appointments"("clinicianId", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_departmentId_scheduledAt_idx" ON "appointments"("departmentId", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_status_scheduledAt_idx" ON "appointments"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_scheduledAt_status_idx" ON "appointments"("scheduledAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_nhisFacilityCode_key" ON "hospitals"("nhisFacilityCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_userId_key" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_senderId_idx" ON "Notification"("senderId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

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
CREATE UNIQUE INDEX "delivery_records_antenatalBookingId_key" ON "delivery_records"("antenatalBookingId");

-- CreateIndex
CREATE INDEX "delivery_records_deliveryDate_idx" ON "delivery_records"("deliveryDate");

-- CreateIndex
CREATE INDEX "delivery_records_patientId_idx" ON "delivery_records"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "newborn_records_deliveryRecordId_order_key" ON "newborn_records"("deliveryRecordId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "abortion_records_antenatalBookingId_key" ON "abortion_records"("antenatalBookingId");

-- CreateIndex
CREATE INDEX "abortion_records_abortionDate_idx" ON "abortion_records"("abortionDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProformaInvoice_referenceNumber_key" ON "ProformaInvoice"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProformaInvoice_attendanceId_key" ON "ProformaInvoice"("attendanceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProformaInvoice_convertedToBillId_key" ON "ProformaInvoice"("convertedToBillId");

-- CreateIndex
CREATE INDEX "ProformaInvoice_patientId_idx" ON "ProformaInvoice"("patientId");

-- CreateIndex
CREATE INDEX "ProformaInvoice_status_idx" ON "ProformaInvoice"("status");

-- CreateIndex
CREATE INDEX "ProformaInvoice_referenceNumber_idx" ON "ProformaInvoice"("referenceNumber");

-- CreateIndex
CREATE INDEX "ProformaInvoice_createdAt_idx" ON "ProformaInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "ProformaInvoiceItem_proformaInvoiceId_idx" ON "ProformaInvoiceItem"("proformaInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "communication_channels_name_key" ON "communication_channels"("name");

-- CreateIndex
CREATE INDEX "communication_templates_channelId_idx" ON "communication_templates"("channelId");

-- CreateIndex
CREATE INDEX "communication_templates_type_idx" ON "communication_templates"("type");

-- CreateIndex
CREATE INDEX "communication_logs_recipient_idx" ON "communication_logs"("recipient");

-- CreateIndex
CREATE INDEX "communication_logs_status_idx" ON "communication_logs"("status");

-- CreateIndex
CREATE INDEX "communication_logs_createdAt_idx" ON "communication_logs"("createdAt");

-- CreateIndex
CREATE INDEX "communication_logs_channelId_idx" ON "communication_logs"("channelId");

-- CreateIndex
CREATE INDEX "family_planning_services_postpartumDeliveryRecordId_idx" ON "family_planning_services"("postpartumDeliveryRecordId");

-- CreateIndex
CREATE INDEX "family_planning_services_postnatalRecordId_idx" ON "family_planning_services"("postnatalRecordId");

-- CreateIndex
CREATE INDEX "family_planning_services_postAbortionRecordId_idx" ON "family_planning_services"("postAbortionRecordId");

-- CreateIndex
CREATE INDEX "family_planning_services_patientId_idx" ON "family_planning_services"("patientId");

-- CreateIndex
CREATE INDEX "family_planning_services_serviceDate_idx" ON "family_planning_services"("serviceDate");

-- CreateIndex
CREATE INDEX "family_planning_services_method_idx" ON "family_planning_services"("method");

-- CreateIndex
CREATE INDEX "family_planning_services_methodCategory_idx" ON "family_planning_services"("methodCategory");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_accounts_registrationNumber_key" ON "corporate_accounts"("registrationNumber");

-- CreateIndex
CREATE INDEX "corporate_accounts_insuranceProviderId_idx" ON "corporate_accounts"("insuranceProviderId");

-- CreateIndex
CREATE INDEX "corporate_accounts_registrationNumber_idx" ON "corporate_accounts"("registrationNumber");

-- CreateIndex
CREATE INDEX "corporate_employees_accountId_idx" ON "corporate_employees"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_employees_accountId_employeeId_key" ON "corporate_employees"("accountId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "job_grades_name_key" ON "job_grades"("name");

-- CreateIndex
CREATE UNIQUE INDEX "job_grades_code_key" ON "job_grades"("code");

-- CreateIndex
CREATE INDEX "job_grades_level_idx" ON "job_grades"("level");

-- CreateIndex
CREATE INDEX "salary_steps_gradeId_idx" ON "salary_steps"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "salary_steps_gradeId_stepNumber_key" ON "salary_steps"("gradeId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_userId_key" ON "staff_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_employeeId_key" ON "staff_profiles"("employeeId");

-- CreateIndex
CREATE INDEX "staff_profiles_employeeId_idx" ON "staff_profiles"("employeeId");

-- CreateIndex
CREATE INDEX "staff_profiles_departmentId_idx" ON "staff_profiles"("departmentId");

-- CreateIndex
CREATE INDEX "staff_profiles_jobGradeId_idx" ON "staff_profiles"("jobGradeId");

-- CreateIndex
CREATE INDEX "staff_profiles_isActive_idx" ON "staff_profiles"("isActive");

-- CreateIndex
CREATE INDEX "staff_documents_staffId_idx" ON "staff_documents"("staffId");

-- CreateIndex
CREATE INDEX "staff_documents_expiryDate_idx" ON "staff_documents"("expiryDate");

-- CreateIndex
CREATE INDEX "payroll_records_staffId_idx" ON "payroll_records"("staffId");

-- CreateIndex
CREATE INDEX "payroll_records_year_month_idx" ON "payroll_records"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_staffId_month_year_key" ON "payroll_records"("staffId", "month", "year");

-- CreateIndex
CREATE INDEX "payslip_line_items_payrollRecordId_idx" ON "payslip_line_items"("payrollRecordId");

-- CreateIndex
CREATE INDEX "payslip_line_items_payrollRecordId_type_idx" ON "payslip_line_items"("payrollRecordId", "type");

-- CreateIndex
CREATE INDEX "shifts_staffId_shiftDate_idx" ON "shifts"("staffId", "shiftDate");

-- CreateIndex
CREATE INDEX "shifts_shiftDate_idx" ON "shifts"("shiftDate");

-- CreateIndex
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

-- CreateIndex
CREATE INDEX "leave_requests_staffId_startDate_idx" ON "leave_requests"("staffId", "startDate");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_startDate_endDate_idx" ON "leave_requests"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "medication_doses_medicationId_scheduledAt_idx" ON "medication_doses"("medicationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "medication_doses_status_scheduledAt_idx" ON "medication_doses"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "medication_doses_administeredById_idx" ON "medication_doses"("administeredById");

-- CreateIndex
CREATE INDEX "medication_doses_administeredAt_idx" ON "medication_doses"("administeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "medication_doses_medicationId_doseNumber_key" ON "medication_doses"("medicationId", "doseNumber");

-- CreateIndex
CREATE INDEX "nursing_notes_patientId_createdAt_idx" ON "nursing_notes"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "nursing_notes_attendanceId_createdAt_idx" ON "nursing_notes"("attendanceId", "createdAt");

-- CreateIndex
CREATE INDEX "nursing_notes_admissionId_createdAt_idx" ON "nursing_notes"("admissionId", "createdAt");

-- CreateIndex
CREATE INDEX "nursing_notes_shift_createdAt_idx" ON "nursing_notes"("shift", "createdAt");

-- CreateIndex
CREATE INDEX "nursing_notes_isFlagged_idx" ON "nursing_notes"("isFlagged");

-- CreateIndex
CREATE INDEX "nursing_notes_noteType_idx" ON "nursing_notes"("noteType");

-- CreateIndex
CREATE INDEX "nursing_tasks_attendanceId_status_idx" ON "nursing_tasks"("attendanceId", "status");

-- CreateIndex
CREATE INDEX "nursing_tasks_patientId_createdAt_idx" ON "nursing_tasks"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "nursing_tasks_admissionId_idx" ON "nursing_tasks"("admissionId");

-- CreateIndex
CREATE INDEX "nursing_tasks_scheduledAt_idx" ON "nursing_tasks"("scheduledAt");

-- CreateIndex
CREATE INDEX "nursing_tasks_priority_status_idx" ON "nursing_tasks"("priority", "status");

-- CreateIndex
CREATE INDEX "password_reset_requests_status_requestedAt_idx" ON "password_reset_requests"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "password_reset_requests_userId_status_idx" ON "password_reset_requests"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vaccines_code_key" ON "vaccines"("code");

-- CreateIndex
CREATE INDEX "vaccines_name_idx" ON "vaccines"("name");

-- CreateIndex
CREATE INDEX "vaccines_isActive_idx" ON "vaccines"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "immunization_records_stockTransactionId_key" ON "immunization_records"("stockTransactionId");

-- CreateIndex
CREATE INDEX "immunization_records_patientId_administeredAt_idx" ON "immunization_records"("patientId", "administeredAt");

-- CreateIndex
CREATE INDEX "immunization_records_attendanceId_idx" ON "immunization_records"("attendanceId");

-- CreateIndex
CREATE INDEX "immunization_records_vaccineId_administeredAt_idx" ON "immunization_records"("vaccineId", "administeredAt");

-- CreateIndex
CREATE INDEX "immunization_records_nextDoseDue_idx" ON "immunization_records"("nextDoseDue");

-- CreateIndex
CREATE INDEX "immunization_records_batchNumber_idx" ON "immunization_records"("batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "immunization_records_attendanceId_vaccineId_doseNumber_key" ON "immunization_records"("attendanceId", "vaccineId", "doseNumber");

-- CreateIndex
CREATE INDEX "_UserAdditionalDepartments_B_index" ON "_UserAdditionalDepartments"("B");

-- CreateIndex
CREATE INDEX "_RoleToUser_B_index" ON "_RoleToUser"("B");

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
ALTER TABLE "CounterClient" ADD CONSTRAINT "CounterClient_registeredPatientId_fkey" FOREIGN KEY ("registeredPatientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedicalHistory" ADD CONSTRAINT "PatientMedicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientSurgicalHistory" ADD CONSTRAINT "PatientSurgicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientFamilyHistory" ADD CONSTRAINT "PatientFamilyHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_corporateEmployeeId_fkey" FOREIGN KEY ("corporateEmployeeId") REFERENCES "corporate_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_counterClientId_fkey" FOREIGN KEY ("counterClientId") REFERENCES "CounterClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_allergyReviewedById_fkey" FOREIGN KEY ("allergyReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "gdrg_tariff_procedures" ADD CONSTRAINT "gdrg_tariff_procedures_gdrgTariffId_fkey" FOREIGN KEY ("gdrgTariffId") REFERENCES "GDRGTariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdrg_tariff_procedures" ADD CONSTRAINT "gdrg_tariff_procedures_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "ServiceCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_counterClientId_fkey" FOREIGN KEY ("counterClientId") REFERENCES "CounterClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "momo_payment_intents" ADD CONSTRAINT "momo_payment_intents_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "claim_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_tracking_events" ADD CONSTRAINT "insurance_claim_tracking_events_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_tracking_events" ADD CONSTRAINT "insurance_claim_tracking_events_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_batch_tracking_events" ADD CONSTRAINT "claim_batch_tracking_events_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "claim_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_batch_tracking_events" ADD CONSTRAINT "claim_batch_tracking_events_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claimit_submissions" ADD CONSTRAINT "claimit_submissions_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claimit_submissions" ADD CONSTRAINT "claimit_submissions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "claim_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claimit_submissions" ADD CONSTRAINT "claimit_submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_batches" ADD CONSTRAINT "claim_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_batches" ADD CONSTRAINT "claim_batches_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_batches" ADD CONSTRAINT "claim_batches_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_batches" ADD CONSTRAINT "claim_batches_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_items" ADD CONSTRAINT "insurance_claim_items_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_items" ADD CONSTRAINT "insurance_claim_items_billLineItemId_fkey" FOREIGN KEY ("billLineItemId") REFERENCES "bill_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_items" ADD CONSTRAINT "insurance_claim_items_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_items" ADD CONSTRAINT "insurance_claim_items_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_items" ADD CONSTRAINT "insurance_claim_items_gdrgTariffId_fkey" FOREIGN KEY ("gdrgTariffId") REFERENCES "GDRGTariff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_items" ADD CONSTRAINT "insurance_claim_items_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_items" ADD CONSTRAINT "insurance_claim_items_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_items" ADD CONSTRAINT "insurance_claim_items_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_items" ADD CONSTRAINT "insurance_claim_items_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_charge_records" ADD CONSTRAINT "ward_charge_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_charge_records" ADD CONSTRAINT "ward_charge_records_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_charge_records" ADD CONSTRAINT "ward_charge_records_billLineItemId_fkey" FOREIGN KEY ("billLineItemId") REFERENCES "bill_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_records" ADD CONSTRAINT "referral_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_records" ADD CONSTRAINT "referral_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_records" ADD CONSTRAINT "referral_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntenatalBooking" ADD CONSTRAINT "AntenatalBooking_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntenatalBooking" ADD CONSTRAINT "AntenatalBooking_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntenatalBooking" ADD CONSTRAINT "AntenatalBooking_currentAttendanceId_fkey" FOREIGN KEY ("currentAttendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntenatalBooking" ADD CONSTRAINT "AntenatalBooking_deliveryRecordId_fkey" FOREIGN KEY ("deliveryRecordId") REFERENCES "delivery_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntenatalBooking" ADD CONSTRAINT "AntenatalBooking_abortionRecordId_fkey" FOREIGN KEY ("abortionRecordId") REFERENCES "abortion_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntenatalBooking" ADD CONSTRAINT "AntenatalBooking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ANCVisit" ADD CONSTRAINT "ANCVisit_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "AntenatalBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ANCVisit" ADD CONSTRAINT "ANCVisit_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ANCVisit" ADD CONSTRAINT "ANCVisit_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postnatal_records" ADD CONSTRAINT "postnatal_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postnatal_records" ADD CONSTRAINT "postnatal_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postnatal_records" ADD CONSTRAINT "postnatal_records_antenatalBookingId_fkey" FOREIGN KEY ("antenatalBookingId") REFERENCES "AntenatalBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postnatal_records" ADD CONSTRAINT "postnatal_records_deliveryRecordId_fkey" FOREIGN KEY ("deliveryRecordId") REFERENCES "delivery_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postnatal_records" ADD CONSTRAINT "postnatal_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item_payer_rules" ADD CONSTRAINT "stock_item_payer_rules_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item_payer_rules" ADD CONSTRAINT "stock_item_payer_rules_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item_department_balances" ADD CONSTRAINT "stock_item_department_balances_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item_department_balances" ADD CONSTRAINT "stock_item_department_balances_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item_department_balances" ADD CONSTRAINT "stock_item_department_balances_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_receivedAtDepartmentId_fkey" FOREIGN KEY ("receivedAtDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_receivedAtWardId_fkey" FOREIGN KEY ("receivedAtWardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_fulfilledById_fkey" FOREIGN KEY ("fulfilledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_requestingDepartmentId_fkey" FOREIGN KEY ("requestingDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_supplyingDepartmentId_fkey" FOREIGN KEY ("supplyingDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_requestingWardId_fkey" FOREIGN KEY ("requestingWardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionItem" ADD CONSTRAINT "RequisitionItem_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionItem" ADD CONSTRAINT "RequisitionItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionItem" ADD CONSTRAINT "RequisitionItem_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_originId_fkey" FOREIGN KEY ("originId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_headId_fkey" FOREIGN KEY ("headId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newborn_records" ADD CONSTRAINT "newborn_records_deliveryRecordId_fkey" FOREIGN KEY ("deliveryRecordId") REFERENCES "delivery_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abortion_records" ADD CONSTRAINT "abortion_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abortion_records" ADD CONSTRAINT "abortion_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abortion_records" ADD CONSTRAINT "abortion_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_convertedToBillId_fkey" FOREIGN KEY ("convertedToBillId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoiceItem" ADD CONSTRAINT "ProformaInvoiceItem_proformaInvoiceId_fkey" FOREIGN KEY ("proformaInvoiceId") REFERENCES "ProformaInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoiceItem" ADD CONSTRAINT "ProformaInvoiceItem_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "communication_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "communication_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "communication_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_planning_services" ADD CONSTRAINT "family_planning_services_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_planning_services" ADD CONSTRAINT "family_planning_services_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_planning_services" ADD CONSTRAINT "family_planning_services_providedById_fkey" FOREIGN KEY ("providedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_planning_services" ADD CONSTRAINT "family_planning_services_postpartumDeliveryRecordId_fkey" FOREIGN KEY ("postpartumDeliveryRecordId") REFERENCES "delivery_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_planning_services" ADD CONSTRAINT "family_planning_services_postnatalRecordId_fkey" FOREIGN KEY ("postnatalRecordId") REFERENCES "postnatal_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_planning_services" ADD CONSTRAINT "family_planning_services_postAbortionRecordId_fkey" FOREIGN KEY ("postAbortionRecordId") REFERENCES "abortion_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_accounts" ADD CONSTRAINT "corporate_accounts_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_employees" ADD CONSTRAINT "corporate_employees_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "corporate_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_steps" ADD CONSTRAINT "salary_steps_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "job_grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_jobGradeId_fkey" FOREIGN KEY ("jobGradeId") REFERENCES "job_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_salaryStepId_fkey" FOREIGN KEY ("salaryStepId") REFERENCES "salary_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_documents" ADD CONSTRAINT "staff_documents_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_documents" ADD CONSTRAINT "staff_documents_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_line_items" ADD CONSTRAINT "payslip_line_items_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "payroll_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_tasks" ADD CONSTRAINT "nursing_tasks_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_tasks" ADD CONSTRAINT "nursing_tasks_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_tasks" ADD CONSTRAINT "nursing_tasks_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_tasks" ADD CONSTRAINT "nursing_tasks_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_tasks" ADD CONSTRAINT "nursing_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccines" ADD CONSTRAINT "vaccines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_stockTransactionId_fkey" FOREIGN KEY ("stockTransactionId") REFERENCES "StockTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAdditionalDepartments" ADD CONSTRAINT "_UserAdditionalDepartments_A_fkey" FOREIGN KEY ("A") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAdditionalDepartments" ADD CONSTRAINT "_UserAdditionalDepartments_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoleToUser" ADD CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoleToUser" ADD CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

