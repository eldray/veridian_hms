// src/types/index.ts
// ======================
// CORE ENUMS (UPDATED TO MATCH BACKEND)
// ======================

export type UserRole =
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'midwife'
  | 'records'
  | 'lab_tech'
  | 'pharmacist'
  | 'accounts'
  | 'sonographer';

export type Gender = 'male' | 'female' | 'other';
export type PaymentMode = 'cash' | 'nhis' | 'private_insurance' | 'corporate';
export type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'bank_transfer' | 'cheque';

// Attendance
export type AttendanceType = 
  | 'emergency_acute'
  | 'antenatal'
  | 'postnatal'
  | 'chronic_followup'
  | 'specialist_consultation'
  | 'delivery'
  | 'surgery';

export type AttendanceStatus = 'pending' | 'completed' | 'cancelled' | 'admitted' | 'discharged';
export type EncounterCategory = 'opd' | 'ipd' | 'daycase';
export type VisitCategory = 'general' | 'specialist' | 'emergency' | 'inpatient';

// Admissions
export type AdmissionType = 'elective' | 'emergency' | 'transfer' | 'detention_observation';
export type AdmissionSource = 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency';
export type DischargeStatus = 'home' | 'transfer' | 'expired' | 'against_medical_advice';
export type PresentOnAdmission = 'Y' | 'N' | 'U';
export type SecondaryDiagnosisType = 'comorbidity' | 'complication';

// Billing
export type BillStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled';
export type ClaimStatus = 'draft' | 'not_required' | 'pending' | 'submitted' | 'approved' | 'partially_approved' | 'rejected' | 'paid';

// Clinical
export type LabTestStatus = 'requested' | 'completed' | 'cancelled';
export type ProcedureStatus = 'scheduled' | 'completed' | 'cancelled';
export type ScanStatus = 'requested' | 'completed' | 'cancelled';
export type MedicationStatus = 'prescribed' | 'dispensed' | 'administered' | 'cancelled';
export type Priority = 'routine' | 'urgent' | 'stat';
export type ScanPriority = 'routine' | 'urgent';
export type DiagnosisType = 'principal' | 'secondary' | 'comorbidity';
export type DiagnosisVariant = 'adult' | 'child' | 'complicated' | 'uncomplicated';

// Appointments
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentType = 'consultation' | 'follow_up' | 'procedure' | 'antenatal' | 'postnatal' | 'vaccination' | 'lab_test' | 'scan' | 'other';

// Notifications
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system' | 'appointment' | 'billing' | 'clinical';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// Lab
export type LabCategory = 
  | 'hematology'
  | 'biochemistry'
  | 'microbiology'
  | 'serology'
  | 'immunology'
  | 'toxicology'
  | 'molecular'
  | 'cytology'
  | 'histopathology';

export type ProcedureCategory = 
  | 'surgical'
  | 'diagnostic'
  | 'therapeutic'
  | 'obstetric'
  | 'pediatric'
  | 'dental'
  | 'ophthalmic';

export type ScanCategory = 
  | 'xray'
  | 'ultrasound'
  | 'ct_scan'
  | 'mri'
  | 'fluoroscopy'
  | 'mammography'
  | 'nuclear'
  | 'pet_scan'
  | 'other';

export type SpecimenType = 
  | 'blood'
  | 'urine'
  | 'stool'
  | 'csf'
  | 'sputum'
  | 'fluid'
  | 'semen'
  | 'tissue'
  | 'saliva'
  | 'swab'
  | 'other';

export type BodyPart = 
  | 'head'
  | 'chest'
  | 'neck'
  | 'abdomen'
  | 'pelvis'
  | 'spine'
  | 'extremities'
  | 'breast'
  | 'other';

export type FacilityType = 
  | 'Tertiary'
  | 'Secondary'
  | 'Primary'
  | 'Clinic'
  | 'Health_Center'
  | 'Maternity_Home';

// Service Catalog
export type ServiceType = 'consultation' | 'ward' | 'lab_test' | 'scan' | 'medication' | 'procedure' | 'diagnosis' | 'miscellaneous';
export type ServiceCategory = 'opd' | 'ipd' | 'diagnostics' | 'pharmacy' | 'other';
export type NHISCoverageType = 'full' | 'partial' | 'not_covered';

// ======================
// GHS MORBIDITY GROUPS (From backend schema)
// ======================

export type MorbidityGroup = 
  | 'afp_polio'
  | 'meningitis'
  | 'neonatal_tetanus'
  | 'pertussis_whooping_cough'
  | 'diphtheria'
  | 'measles'
  | 'yellow_fever'
  | 'tetanus'
  | 'tuberculosis'
  | 'uncomplicated_malaria_suspected'
  | 'uncomplicated_malaria_tested'
  | 'uncomplicated_malaria_positive'
  | 'uncomplicated_malaria_not_tested_treated'
  | 'uncomplicated_malaria_tested_negative_treated'
  | 'malaria_in_pregnancy_suspected'
  | 'malaria_in_pregnancy_tested'
  | 'malaria_in_pregnancy_positive'
  | 'malaria_in_pregnancy_not_tested_treated'
  | 'malaria_in_pregnancy_tested_negative_treated'
  | 'severe_malaria_lab_confirmed'
  | 'severe_malaria_non_lab_confirmed'
  | 'typhoid_fever'
  | 'suspected_cholera'
  | 'diarrhoea_diseases'
  | 'viral_hepatitis'
  | 'schistosomiasis_bilharzia'
  | 'suspected_guinea_worm'
  | 'onchocerciasis'
  | 'buruli_ulcer'
  | 'leprosy'
  | 'hiv_aids_related_conditions'
  | 'mumps'
  | 'intestinal_worms'
  | 'chicken_pox'
  | 'upper_respiratory_tract_infections'
  | 'pneumonia'
  | 'septicaemia'
  | 'malnutrition'
  | 'obesity'
  | 'anaemia'
  | 'other_nutritional_diseases'
  | 'hypertension'
  | 'cardiac_diseases'
  | 'stroke'
  | 'diabetes_mellitus'
  | 'rheumatism_arthritis'
  | 'sickle_cell_disease'
  | 'asthma'
  | 'chronic_obstructive_pulmonary_disease'
  | 'breast_cancer'
  | 'cervical_cancer'
  | 'lymphoma'
  | 'prostate_cancer'
  | 'hepatocellular_carcinoma'
  | 'all_other_cancers'
  | 'schizophrenia'
  | 'acute_psychotic_disorder'
  | 'mono_symptoms_delusion'
  | 'depression'
  | 'substance_abuse'
  | 'epilepsy'
  | 'autism'
  | 'mental_retardation'
  | 'attention_deficit_hyperactivity_disorder'
  | 'conversion_disorders'
  | 'post_traumatic_stress_syndrome'
  | 'generalized_anxiety'
  | 'other_anxiety_disorders'
  | 'neurosis'
  | 'acute_eye_infection'
  | 'cataract'
  | 'trachoma'
  | 'otitis_media'
  | 'other_acute_ear_infection'
  | 'dental_caries'
  | 'dental_swellings'
  | 'traumatic_conditions_oral'
  | 'periodontal_diseases'
  | 'cerebral_palsy'
  | 'liver_diseases'
  | 'acute_urinary_tract_infection'
  | 'skin_diseases'
  | 'ulcer'
  | 'kidney_related_diseases'
  | 'other_oral_conditions'
  | 'gynaecological_conditions'
  | 'pregnancy_related_complications'
  | 'anaemia_in_pregnancy'
  | 'gonorrhoea'
  | 'genital_ulcer'
  | 'vaginal_discharge'
  | 'urethral_discharge'
  | 'other_diseases_male_reproductive_system'
  | 'other_diseases_female_reproductive_system'
  | 'transport_injuries_road_traffic_accidents'
  | 'home_injuries'
  | 'occupational_industrial_injuries'
  | 'burns'
  | 'poisoning_occupational'
  | 'dog_bite'
  | 'human_bites'
  | 'snake_bite'
  | 'sexual_abuse'
  | 'domestic_violence'
  | 'pyrexia_unknown_origin_non_malaria'
  | 'brought_in_dead'
  | 'other_animal_bites'
  | 'all_other_diseases'
  | 're_attendances'
  | 'referrals';

// ======================
// GDRG TYPES (From backend schema)
// ======================

export type GDRGMDC = 'ASUR' | 'DENT' | 'ENTH' | 'INVE' | 'MEDI' | 'OBGY' | 'OPDC' | 'OPHT' | 'ORTH' | 'PAED' | 'PSUR' | 'RSUR' | 'ZOOM';

export interface GDRGTariff {
  id: string;
  gdrgCode: string;
  mdc: GDRGMDC;
  description: string;
  nhiaTariff: number;
  ageSplit: string;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  applicableLevels: number[];
  nhisServiceCode?: string | null;
  isZoomCode: boolean;
  allowsAddOn: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GDRGTariffDiagnosis {
  gdrgTariffId: string;
  diagnosisId: string;
  isPrimary: boolean;
  mappedIcdCode?: string | null;
  createdAt: string;
}

// Insurance
export type InsuranceType = 'nhis' | 'private';
export type ClaimSubmissionMethod = 'portal' | 'paper' | 'edi_batch' | 'api';
export type BatchStatus = 'draft' | 'submitted' | 'acknowledged' | 'partially_paid' | 'paid' | 'disputed';

// Stock & Requisitions
export type StockTransactionType = 'purchase' | 'adjustment' | 'requisition' | 'sale';
export type RequisitionStatus = 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'cancelled';
export type RequisitionUrgency = 'routine' | 'urgent' | 'emergency';

// ======================
// USER & AUTHENTICATION
// ======================

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specialization?: string;
  departmentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ======================
// PATIENT
// ======================

export interface InsuranceDetails {
  providerId?: string;
  memberId: string;
  groupNumber?: string;
  relationship?: 'self' | 'spouse' | 'child' | 'other';
  startDate: string;
  endDate: string;
  isActive: boolean;
  copayment?: number;
  deductible?: number;
  coverageLimit?: number;
}

export interface AdditionalInfo {
  title?: string;
  email?: string;
  houseNumber?: string;
  idType?: 'GhanaCard' | 'Voter ID' | 'Passport' | 'Driver License' | 'NHIS Card' | 'Other';
  idNumber?: string;
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  occupation?: string;
  nextOfKin?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export interface Patient {
  id: string;
  folderNumber: string;
  surname: string;
  otherNames: string;
  gender: Gender;
  dateOfBirth: string;
  contact: string;
  address: string;
  paymentMode?: PaymentMode;
  insuranceProviderId?: string;
  insuranceDetails?: InsuranceDetails;
  additionalInfo?: AdditionalInfo;
  billingAddress?: any;
  employer?: any;
  imageUrl?: string;
  registeredAt: string;
  registeredBy: string;
  createdAt: string;
  updatedAt: string;
}

// ======================
// ATTENDANCE
// ======================

export interface AttendanceDiagnosis {
  id: string;
  attendanceId: string;
  diagnosisId: string;
  primary: boolean;
  notes?: string;
  date: string;
  createdById: string;
  icdCode?: string;
  gdrgCode?: string;
  presentOnAdmission?: PresentOnAdmission;
  diagnosisType?: DiagnosisType;
  createdAt: string;
  
  // Relations
  diagnosis?: Diagnosis;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  serviceType: 'consultation' | 'lab_test' | 'procedure' | 'medication' | 'scan' | 'ward' | 'diagnosis' | 'miscellaneous';
  serviceCategory: 'opd' | 'ipd' | 'diagnostics' | 'pharmacy' | 'other';
  subType?: string;
  
  // NHIS fields
  nhisServiceCode?: string;
  tariffCode?: string;
  isNHISCovered: boolean;
  nhisCoverageType: 'full' | 'partial' | 'not_covered';
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isPrivateInsuranceExempted: boolean;
  
  // Metadata
  unit: string;
  requiresClinicalNotes: boolean;
  metadata?: any;
  isActive: boolean;
  
  // Relations
  pricing?: ServicePricing;
  diagnosis?: Diagnosis;
  labTestTemplate?: LabTestTemplate;
  procedureTemplate?: ProcedureTemplate;
  scanTemplate?: ScanTemplate;
  stockItem?: StockItem;
  ward?: Ward;
  
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRendered {
  id: string;
  attendanceId: string;
  serviceItemId: string;
  quantity: number;
  date: string;
  performedById: string;
  notes?: string;
  createdAt: string;
  
  serviceCatalog?: ServiceCatalog;
}

export interface Attendance {
  id: string;
  attendanceNumber: string;
  patientId: string;
  insuranceProviderId?: string;
  bedId?: string;
  wardId?: string;
  attendanceType: AttendanceType;
  dateTime: string;
  paymentMode: PaymentMode;
  nhisCCC?: string;
  complaints: string;
  medicalNotes?: string;
  encounterCategory: EncounterCategory;
  visitCategory: VisitCategory;
  gdrgCategory?: string;
  serviceCategory?: ServiceCategory;
  totalBill: number;
  paidAmount: number;
  outstandingBalance: number;
  insuranceClaimId?: string;
  preAuthNumber?: string;
  preAuthApproved: boolean;
  preAuthAmount?: number;
  status: AttendanceStatus;
  referringFacility?: string;
  createdById: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  patient?: Patient;
  insuranceProvider?: InsuranceProvider;
  bed?: Bed;
  ward?: Ward;
  insuranceClaim?: InsuranceClaim;
  bill?: Bill;
  admission?: Admission;
  diagnoses: AttendanceDiagnosis[];
  labTests: LabTest[];
  medications: Medication[];
  procedures: Procedure[];
  scans: Scan[];
  servicesRendered: ServiceRendered[];
  vitals: Vitals[];
}

// ======================
// DIAGNOSIS (UPDATED WITH MORBIDITY GROUP)
// ======================

export interface Diagnosis {
  id: string;
  name: string;
  icdCode: string;
  gdrgGroupCode: string;
  variant?: DiagnosisVariant;
  description?: string;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  isChronic: boolean;
  isNHISCovered: boolean;
  morbidityGroup: MorbidityGroup;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  gdrgTariffDiagnoses?: GDRGTariffDiagnosis[];
}

// ======================
// BILLING
// ======================

export interface BillLineItem {
  id: string;
  billId: string;
  serviceCatalogId?: string;
  description: string;
  serviceType: ServiceType;
  quantity: number;
  unitPrice: number;
  pricingBasis: PaymentMode;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  insuranceCoveredAmount: number;
  patientPayableAmount: number;
  discount: number;
  pricingSnapshotId?: string;
  isVoided: boolean;
  voidedById?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  
  serviceCatalog?: ServiceCatalog;
  voidedBy?: User;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  transactionDate: string;
  receivedById: string;
  notes?: string;
  isVoided: boolean;
  voidedById?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
  
  bill?: Bill;
  receivedBy?: User;
}

export interface Bill {
  id: string;
  billNumber: string;
  patientId: string;
  attendanceId: string;
  admissionId?: string;
  subtotal: number;
  discount: number;
  waiverAmount: number;
  taxAmount: number;
  totalAmount: number;
  insuranceCovered: number;
  patientPayable: number;
  paidAmount: number;
  balance: number;
  status: BillStatus;
  paymentMode: PaymentMode;
  insuranceProviderId?: string;
  preAuthNumber?: string;
  claimNumber?: string;
  claimStatus: ClaimStatus;
  createdById: string;
  updatedById?: string;
  billDate: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  patient?: Patient;
  attendance?: Attendance;
  admission?: Admission;
  insuranceProvider?: InsuranceProvider;
  payments: Payment[];
  insuranceClaims: InsuranceClaim[];
  lineItems: BillLineItem[];
}

// ======================
// INSURANCE
// ======================

export interface InsuranceProvider {
  id: string;
  name: string;
  type: InsuranceType;
  coveragePercentage: number;
  claimSubmissionMethod: ClaimSubmissionMethod;
  portalUrl?: string;
  contactInfo?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimSubmissionBatch {
  id: string;
  batchNumber: string;
  insuranceProviderId: string;
  claimPeriodStart: string;
  claimPeriodEnd: string;
  totalClaims: number;
  totalClaimAmount: number;
  submissionMethod: ClaimSubmissionMethod;
  submissionDate?: string;
  nhiaReferenceNumber?: string;
  portalBatchId?: string;
  status: BatchStatus;
  acknowledgedAt?: string;
  notes?: string;
  submittedById?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  
  claims: InsuranceClaim[];
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  billId: string;
  patientId: string;
  insuranceProviderId: string;
  attendanceId: string;
  totalClaimAmount: number;
  approvedAmount?: number;
  rejectedAmount?: number;
  paidAmount?: number;
  status: ClaimStatus;
  submissionDate?: string;
  approvalDate?: string;
  paymentDate?: string;
  preAuthNumber?: string;
  batchId?: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  labTestCodes: string[];
  serviceCodes: string[];
  scanCodes: string[];
  gdrgCodes: string[];
  nhisServiceCodes: string[];
  notes?: string;
  createdById: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  bill?: Bill;
  patient?: Patient;
  insuranceProvider?: InsuranceProvider;
  attendance?: Attendance;
  batch?: ClaimSubmissionBatch;
}

// types/index.ts - ADD THIS
export interface BillLineItem {
  id: string;
  billId: string;
  serviceCatalogId?: string;
  description: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  pricingBasis: PaymentMode;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  insuranceCoveredAmount: number;
  patientPayableAmount: number;
  discount: number;
  isVoided: boolean;
  voidReason?: string;
  serviceCatalog?: {
    name: string;
    code: string;
    nhisServiceCode?: string;
  };
}

export interface Bill {
  id: string;
  billNumber: string;
  patientId: string;
  attendanceId: string;
  admissionId?: string;
  subtotal: number;
  discount: number;
  waiverAmount: number;
  taxAmount: number;
  totalAmount: number;
  insuranceCovered: number;
  patientPayable: number;
  paidAmount: number;
  balance: number;
  status: BillStatus;
  paymentMode: PaymentMode;
  insuranceProviderId?: string;
  preAuthNumber?: string;
  claimNumber?: string;
  claimStatus: string;
  billDate: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  BillLineItem?: BillLineItem[];  // ← ADD THIS
  Patient?: {
    surname: string;
    otherNames: string;
    folderNumber: string;
    contact?: string;
  };
  Attendance?: {
    attendanceNumber: string;
    attendanceType: string;
    dateTime: string;
  };
  InsuranceProvider?: {
    name: string;
    coveragePercentage: number;
  };
}

// ======================
// CLINICAL ENTRIES
// ======================

export interface Vitals {
  id: string;
  attendanceId: string;
  patientId: string;
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  respiration?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  muac?: number;
  notes?: string;
  recordedById: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}




export interface Scan {
  id: string;
  attendanceId: string;
  serviceCatalogId?: string;
  templateId?: string;
  scanType: string;
  description: string;
  bodyPart?: string;
  status: ScanStatus;
  priority: 'routine' | 'urgent';
  requestedAt: string;
  completedAt?: string;
  result?: string;
  findings?: string;
  impression?: string;
  imageUrls: string[];
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  ServiceCatalog?: ServiceCatalogItem;
  serviceCatalog?: ServiceCatalogItem;
}

// ======================
// ADMISSIONS & WARDS
// ======================

export interface Ward {
  id: string;
  wardName: string;
  wardType: string;
  totalBeds: number;
  occupiedBeds: number;
  isNHISCovered: boolean;
  nhisRequiresAuth: boolean;
  isPrivateInsExempted: boolean;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  dailyCashRate: number;
  dailyNHISRate: number;
  dailyInsuranceRate: number;
  createdAt: string;
  updatedAt: string;
  
  beds: Bed[];
  admissions: Admission[];
}

export interface Bed {
  id: string;
  wardId: string;
  bedNumber: string;
  isOccupied: boolean;
  currentPatientId?: string;
  createdAt: string;
  updatedAt: string;
  
  ward?: Ward;
  currentPatient?: Patient;
  admissions: Admission[];
}

export interface AdmissionSecondaryDiagnosis {
  id: string;
  admissionId: string;
  diagnosisId: string;
  icdCode: string;
  presentOnAdmission: PresentOnAdmission;
  diagnosisType: SecondaryDiagnosisType;
  createdAt: string;
}

export interface Admission {
  id: string;
  admissionNumber: string;
  patientId: string;
  attendanceId?: string;
  wardId: string;
  bedId: string;
  admissionDate: string;
  admissionTime: string;
  admittingDoctor: string;
  reasonForAdmission: string;
  diagnosis: string;
  status: string;
  dischargeDate?: string;
  dischargeTime?: string;
  dischargeSummary?: string;
  dailyNotes?: any;
  createdBy: string;
  admissionType: AdmissionType;
  admissionSource: AdmissionSource;
  dischargeStatus?: DischargeStatus;
  lengthOfStay: number;
  principalDiagnosisId: string;
  principalIcdCode: string;
  principalPresentOnAdmission: PresentOnAdmission;
  createdAt: string;
  updatedAt: string;
  
  patient?: Patient;
  attendance?: Attendance;
  ward?: Ward;
  bed?: Bed;
  principalDiagnosis?: Diagnosis;
  secondaryDiagnoses: AdmissionSecondaryDiagnosis[];
  bills: Bill[];
}

// ======================
// SERVICE CATALOG
// ======================

export interface ServicePricing {
  id: string;
  serviceCatalogId: string;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  vatRate: number;
  isTaxable: boolean;
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
}

export interface ServiceCatalog {
  id: string;
  name: string;
  code: string;
  description?: string;
  serviceCategory: ServiceCategory;
  serviceType: ServiceType;
  nhisServiceCode?: string;
  isNHISCovered: boolean;
  tariffCode?: string;
  nhisCoverageType: NHISCoverageType;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isPrivateInsuranceExempted: boolean;
  unit: string;
  isPending: boolean;
  requiresClinicalNotes: boolean;
  subType?: string;
  metadata?: any;
  isActive: boolean;
  diagnosisId?: string;
  labTestTemplateId?: string;
  procedureTemplateId?: string;
  stockItemId?: string;
  wardId?: string;
  scanTemplateId?: string;
  consultationTypeId?: string;
  createdById?: string;
  gdrgTariffId?: string;
  createdAt: string;
  updatedAt: string;
  
  pricing?: ServicePricing;
  gdrgTariff?: GDRGTariff;
  diagnosis?: Diagnosis;
  labTestTemplate?: LabTestTemplate;
  procedureTemplate?: ProcedureTemplate;
  scanTemplate?: ScanTemplate;
  stockItem?: StockItem;
  ward?: Ward;
  consultationType?: ConsultationType;
}

// ======================
// TEMPLATES
// ======================

export interface LabTestTemplate {
  id: string;
  name: string;
  investigationCode: string;
  category: LabCategory;
  subCategory?: string;
  description?: string;
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isActive: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  specimenType: SpecimenType;
  resultTemplate?: any;
  normalRangeTemplate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ProcedureTemplate {
  id: string;
  name: string;
  procedureCode: string;
  description?: string;
  category: ProcedureCategory;
  department: string;
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isActive: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  duration: number;
  createdAt: string;
  updatedAt: string;
}



// UPDATE LabTest type to include ServiceCatalog
export interface LabTest {
  id: string;
  attendanceId: string;
  serviceCatalogId?: string;
  templateId?: string;  // Keep for backward compatibility
  status: LabTestStatus;
  priority: 'routine' | 'urgent' | 'stat';
  requestedAt: string;
  completedAt?: string;
  result?: any;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  ServiceCatalog?: ServiceCatalogItem;
  serviceCatalog?: ServiceCatalogItem;
}

// UPDATE Procedure type
export interface Procedure {
  id: string;
  attendanceId: string;
  serviceCatalogId?: string;
  templateId?: string;
  status: ProcedureStatus;
  scheduledDate?: string;
  performedAt?: string;
  notes?: string;
  complications?: string;
  outcome?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  ServiceCatalog?: ServiceCatalogItem;
  serviceCatalog?: ServiceCatalogItem;
}

// UPDATE Medication type
export interface Medication {
  id: string;
  attendanceId: string;
  stockItemId?: string;
  serviceCatalogId?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity: number;
  route?: string;
  instructions?: string;
  status: MedicationStatus;
  prescribedAt: string;
  dispensedAt?: string;
  administeredAt?: string;
  prescribedById: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  ServiceCatalog?: ServiceCatalogItem;
  serviceCatalog?: ServiceCatalogItem;
  StockItem?: StockItem;
}

// UPDATE Scan type
export interface Scan {
  id: string;
  attendanceId: string;
  serviceCatalogId?: string;
  templateId?: string;
  scanType: string;
  description: string;
  bodyPart?: string;
  status: ScanStatus;
  priority: 'routine' | 'urgent';
  requestedAt: string;
  completedAt?: string;
  result?: string;
  findings?: string;
  impression?: string;
  imageUrls: string[];
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  ServiceCatalog?: ServiceCatalogItem;
  serviceCatalog?: ServiceCatalogItem;
}

export interface ScanTemplate {
  id: string;
  name: string;
  investigationCode: string;
  scanCode: string;
  description: string;
  category: ScanCategory;
  bodyPart: BodyPart;
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isActive: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  preparationInstructions?: string;
  duration: number;
  contrastRequired: boolean;
  scanType?: string;
  createdAt: string;
  updatedAt: string;
}

// ======================
// STOCK & INVENTORY
// ======================

export interface StockItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  strength: string | null;
  unitOfMeasure: string;
  drugCode: string | null;
  reorderLevel: number;
  currentStock: number;
  costPrice: number;
  supplier: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  isActive: boolean;
  isMedication: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockBatch {
  id: string;
  stockItemId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  receivedDate: string;
  costPrice: number;
  isActive: boolean;
  createdAt: string;
}

export interface StockTransaction {
  id: string;
  stockItemId: string;
  transactionType: StockTransactionType;
  quantity: number;
  balanceAfter: number;
  reference?: string;
  notes?: string;
  transactionDate: string;
  performedBy: string;
  requisitionId?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  totalAmount: number;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  
  invoiceItems: InvoiceItem[];
  stockTransactions: StockTransaction[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  stockItemId: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: string;
  createdAt: string;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  requestingDepartmentId: string;
  requestedById: string;
  urgency: RequisitionUrgency;
  requiredDate?: string;
  purpose?: string;
  status: RequisitionStatus;
  approvedById?: string;
  approvedAt?: string;
  fulfilledById?: string;
  fulfilledAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  requisitionItems: RequisitionItem[];
}

export interface RequisitionItem {
  id: string;
  requisitionId: string;
  stockItemId: string;
  quantityRequested: number;
  quantityApproved?: number;
  quantityFulfilled: number;
  purpose?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ======================
// APPOINTMENTS & DEPARTMENTS
// ======================

export interface Department {
  id: string;
  name: string;
  description?: string;
  headId?: string;
  isActive: boolean;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  
  head?: User;
  users: User[];
  appointments: Appointment[];
}

export interface Appointment {
  id: string;
  appointmentNumber: string;
  patientId: string;
  doctorId?: string;
  departmentId?: string;
  title: string;
  description?: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  status: AppointmentStatus;
  type: AppointmentType;
  isNHIS: boolean;
  nhisCCC?: string;
  reminderSent: boolean;
  checkedIn: boolean;
  checkedInAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  patient?: Patient;
  doctor?: User;
  department?: Department;
}

// ======================
// NOTIFICATIONS
// ======================

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  actionType?: string;
  actionId?: string;
  actionUrl?: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  readAt?: string;
  
  user?: User;
}

// ======================
// CONSULTATION TYPES
// ======================

export interface ConsultationType {
  id: string;
  name: string;
  code: string;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ======================
// HOSPITAL
// ======================

export interface HospitalInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  imageUrl?: string;
  nhisFacilityCode: string;
  nhisFacilityType: FacilityType;
  nhisAccreditationNumber?: string;
  nhisAccreditationDate?: string;
  nhisAccreditationExpiry?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  nhisContactPerson?: string;
  nhisContactPhone?: string;
  nhisContactEmail?: string;
  ghsDistrictCode?: string;
  ghaHFCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ======================
// GHS REPORT TYPES
// ======================

export type GHSAgeGroup = 
  | 'under_28_days'
  | 'one_to_eleven_months'
  | 'one_to_four_years'
  | 'five_to_nine_years'
  | 'ten_to_fourteen_years'
  | 'fifteen_to_seventeen_years'
  | 'eighteen_to_nineteen_years'
  | 'twenty_to_thirty_four_years'
  | 'thirty_five_to_forty_nine_years'
  | 'fifty_to_fifty_nine_years'
  | 'sixty_to_sixty_nine_years'
  | 'seventy_plus_years';

export interface OPDReport {
  period: { startDate: string; endDate: string; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  ageGroups: Record<GHSAgeGroup, {
    insured: { male: number; female: number };
    nonInsured: { male: number; female: number };
    new: number;
    old: number;
  }>;
  totals: {
    totalAttendances: number;
    insured: { male: number; female: number; total: number };
    nonInsured: { male: number; female: number; total: number };
    new: number;
    old: number;
  };
}

export interface IPDGroupData {
  admissions: { insured: { male: number; female: number }; nonInsured: { male: number; female: number } };
  deaths: { insured: { male: number; female: number }; nonInsured: { male: number; female: number } };
}

export interface IPDReport {
  period: { startDate: string; endDate: string; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  ageGroups: Record<GHSAgeGroup, IPDGroupData>;
  malaria: {
    under5_admitted: number;
    above5_admitted: number;
    under5_deaths: number;
    above5_deaths: number;
  };
  totals: {
    totalAdmissions: number;
    totalDeaths: number;
    insured: { admissions: number; deaths: number };
    nonInsured: { admissions: number; deaths: number };
  };
}

export interface ANCReport {
  period: { startDate: string; endDate: string; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  newRegistrants: number;
  totalVisits: number;
  iptp1: number;
  iptp2: number;
  iptp3: number;
  iptp4: number;
  tt2Plus: number;
  itnGiven: number;
  highRisk: number;
  anaemiaInPregnancy: number;
}

export interface DeliveryReport {
  period: { startDate: string; endDate: string; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  totalDeliveries: number;
  spontaneous: number;
  caesarean: number;
  liveBirths: number;
  stillbirths: number;
  maternalDeaths: number;
  lowBirthWeight: number;
}

export interface MalariaReport {
  period: { startDate: string; endDate: string; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  opdMalaria: {
    under5: { suspected: number; confirmed: number; treatedWithACT: number };
    above5: { suspected: number; confirmed: number; treatedWithACT: number };
  };
  testing: {
    microscopy: number;
    microscopyPositive: number;
    rdt: number;
    rdtPositive: number;
  };
}

// src/types/index.ts

export interface Notification {
  id: string;
  userId: string;
  senderId?: string;
  sender?: {
    id: string;
    fullName: string;
    role: string;
  };
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system' | 'appointment' | 'billing' | 'clinical';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionType?: string;
  actionId?: string;
  actionUrl?: string;
  isRead: boolean;
  isArchived?: boolean;
  createdAt: string;
  readAt?: string;
  metadata?: Record<string, any>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  unreadPercentage: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ======================
// UTILITY TYPES
// ======================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
  error?: string;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  period?: string;
}

export interface PatientFilters {
  page?: number;
  limit?: number;
  search?: string;
  surname?: string;
  otherNames?: string;
  nhisNumber?: string;
  hospitalNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  region?: string;
  district?: string;
  town?: string;
}