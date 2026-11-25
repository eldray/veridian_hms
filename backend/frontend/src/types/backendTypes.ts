// AUTO-GENERATED from Prisma schema
// DO NOT EDIT MANUALLY
// Generated on: 2026-06-05T20:44:34.635Z
export enum GDRGMDC {
  ASUR = 'ASUR',
  DENT = 'DENT',
  ENTH = 'ENTH',
  INVE = 'INVE',
  MEDI = 'MEDI',
  OBGY = 'OBGY',
  OPDC = 'OPDC',
  OPHT = 'OPHT',
  ORTH = 'ORTH',
  PAED = 'PAED',
  PSUR = 'PSUR',
  RSUR = 'RSUR',
  ZOOM = 'ZOOM',
}
export enum MorbidityGroup {
  afp_polio = 'afp_polio',
  meningitis = 'meningitis',
  neonatal_tetanus = 'neonatal_tetanus',
  pertussis_whooping_cough = 'pertussis_whooping_cough',
  diphtheria = 'diphtheria',
  measles = 'measles',
  yellow_fever = 'yellow_fever',
  tetanus = 'tetanus',
  tuberculosis = 'tuberculosis',
  uncomplicated_malaria_suspected = 'uncomplicated_malaria_suspected',
  uncomplicated_malaria_tested = 'uncomplicated_malaria_tested',
  uncomplicated_malaria_positive = 'uncomplicated_malaria_positive',
  uncomplicated_malaria_not_tested_treated = 'uncomplicated_malaria_not_tested_treated',
  uncomplicated_malaria_tested_negative_treated = 'uncomplicated_malaria_tested_negative_treated',
  malaria_in_pregnancy_suspected = 'malaria_in_pregnancy_suspected',
  malaria_in_pregnancy_tested = 'malaria_in_pregnancy_tested',
  malaria_in_pregnancy_positive = 'malaria_in_pregnancy_positive',
  malaria_in_pregnancy_not_tested_treated = 'malaria_in_pregnancy_not_tested_treated',
  malaria_in_pregnancy_tested_negative_treated = 'malaria_in_pregnancy_tested_negative_treated',
  severe_malaria_lab_confirmed = 'severe_malaria_lab_confirmed',
  severe_malaria_non_lab_confirmed = 'severe_malaria_non_lab_confirmed',
  typhoid_fever = 'typhoid_fever',
  suspected_cholera = 'suspected_cholera',
  diarrhoea_diseases = 'diarrhoea_diseases',
  viral_hepatitis = 'viral_hepatitis',
  schistosomiasis_bilharzia = 'schistosomiasis_bilharzia',
  suspected_guinea_worm = 'suspected_guinea_worm',
  onchocerciasis = 'onchocerciasis',
  buruli_ulcer = 'buruli_ulcer',
  leprosy = 'leprosy',
  hiv_aids_related_conditions = 'hiv_aids_related_conditions',
  mumps = 'mumps',
  intestinal_worms = 'intestinal_worms',
  chicken_pox = 'chicken_pox',
  upper_respiratory_tract_infections = 'upper_respiratory_tract_infections',
  pneumonia = 'pneumonia',
  septicaemia = 'septicaemia',
  malnutrition = 'malnutrition',
  obesity = 'obesity',
  anaemia = 'anaemia',
  other_nutritional_diseases = 'other_nutritional_diseases',
  hypertension = 'hypertension',
  cardiac_diseases = 'cardiac_diseases',
  stroke = 'stroke',
  diabetes_mellitus = 'diabetes_mellitus',
  rheumatism_arthritis = 'rheumatism_arthritis',
  sickle_cell_disease = 'sickle_cell_disease',
  asthma = 'asthma',
  chronic_obstructive_pulmonary_disease = 'chronic_obstructive_pulmonary_disease',
  breast_cancer = 'breast_cancer',
  cervical_cancer = 'cervical_cancer',
  lymphoma = 'lymphoma',
  prostate_cancer = 'prostate_cancer',
  hepatocellular_carcinoma = 'hepatocellular_carcinoma',
  all_other_cancers = 'all_other_cancers',
  schizophrenia = 'schizophrenia',
  acute_psychotic_disorder = 'acute_psychotic_disorder',
  mono_symptoms_delusion = 'mono_symptoms_delusion',
  depression = 'depression',
  substance_abuse = 'substance_abuse',
  epilepsy = 'epilepsy',
  autism = 'autism',
  mental_retardation = 'mental_retardation',
  attention_deficit_hyperactivity_disorder = 'attention_deficit_hyperactivity_disorder',
  conversion_disorders = 'conversion_disorders',
  post_traumatic_stress_syndrome = 'post_traumatic_stress_syndrome',
  generalized_anxiety = 'generalized_anxiety',
  other_anxiety_disorders = 'other_anxiety_disorders',
  neurosis = 'neurosis',
  acute_eye_infection = 'acute_eye_infection',
  cataract = 'cataract',
  trachoma = 'trachoma',
  otitis_media = 'otitis_media',
  other_acute_ear_infection = 'other_acute_ear_infection',
  dental_caries = 'dental_caries',
  dental_swellings = 'dental_swellings',
  traumatic_conditions_oral = 'traumatic_conditions_oral',
  periodontal_diseases = 'periodontal_diseases',
  cerebral_palsy = 'cerebral_palsy',
  liver_diseases = 'liver_diseases',
  acute_urinary_tract_infection = 'acute_urinary_tract_infection',
  skin_diseases = 'skin_diseases',
  ulcer = 'ulcer',
  kidney_related_diseases = 'kidney_related_diseases',
  other_oral_conditions = 'other_oral_conditions',
  gynaecological_conditions = 'gynaecological_conditions',
  pregnancy_related_complications = 'pregnancy_related_complications',
  anaemia_in_pregnancy = 'anaemia_in_pregnancy',
  gonorrhoea = 'gonorrhoea',
  genital_ulcer = 'genital_ulcer',
  vaginal_discharge = 'vaginal_discharge',
  urethral_discharge = 'urethral_discharge',
  other_diseases_male_reproductive_system = 'other_diseases_male_reproductive_system',
  other_diseases_female_reproductive_system = 'other_diseases_female_reproductive_system',
  transport_injuries_road_traffic_accidents = 'transport_injuries_road_traffic_accidents',
  home_injuries = 'home_injuries',
  occupational_industrial_injuries = 'occupational_industrial_injuries',
  burns = 'burns',
  poisoning_occupational = 'poisoning_occupational',
  dog_bite = 'dog_bite',
  human_bites = 'human_bites',
  snake_bite = 'snake_bite',
  sexual_abuse = 'sexual_abuse',
  domestic_violence = 'domestic_violence',
  pyrexia_unknown_origin_non_malaria = 'pyrexia_unknown_origin_non_malaria',
  brought_in_dead = 'brought_in_dead',
  other_animal_bites = 'other_animal_bites',
  all_other_diseases = 'all_other_diseases',
  re_attendances = 're_attendances',
  referrals = 'referrals',
}
export enum BatchStatus {
  draft = 'draft',
  generated = 'generated',
  submitted = 'submitted',
  exported = 'exported',
}
export enum ProformaInvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED = 'CONVERTED',
  EXPIRED = 'EXPIRED',
}
export enum CommunicationType {
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CONFIRMATION = 'APPOINTMENT_CONFIRMATION',
  LAB_RESULT_READY = 'LAB_RESULT_READY',
  PRESCRIPTION_READY = 'PRESCRIPTION_READY',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  BILL_NOTIFICATION = 'BILL_NOTIFICATION',
  WELCOME_MESSAGE = 'WELCOME_MESSAGE',
  GENERAL_NOTIFICATION = 'GENERAL_NOTIFICATION',
  CUSTOM = 'CUSTOM',
}
export enum CommunicationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}
export enum CommunicationChannelType {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}
export enum FPMethod {
  pill_coc = 'pill_coc',
  pill_pop = 'pill_pop',
  injectable_dmpa = 'injectable_dmpa',
  injectable_net_en = 'injectable_net_en',
  condom_male = 'condom_male',
  condom_female = 'condom_female',
  implant_implanon = 'implant_implanon',
  implant_jadelle = 'implant_jadelle',
  iud_copper = 'iud_copper',
  iud_hormonal = 'iud_hormonal',
  female_sterilization = 'female_sterilization',
  male_sterilization = 'male_sterilization',
  lam = 'lam',
  withdrawal = 'withdrawal',
  calendar = 'calendar',
  other_traditional = 'other_traditional',
  emergency_contraception = 'emergency_contraception',
}
export enum FPMethodCategory {
  modern_short_acting = 'modern_short_acting',
  modern_long_acting = 'modern_long_acting',
  permanent = 'permanent',
  traditional = 'traditional',
  emergency = 'emergency',
}
export enum AdmissionType {
  elective = 'elective',
  emergency = 'emergency',
  transfer = 'transfer',
  detention_observation = 'detention_observation',
}
export enum AdmissionSource {
  home = 'home',
  referral = 'referral',
  another_facility = 'another_facility',
  opd = 'opd',
  emergency = 'emergency',
}
export enum DischargeStatus {
  home = 'home',
  transfer = 'transfer',
  expired = 'expired',
  against_medical_advice = 'against_medical_advice',
}
export enum PresentOnAdmission {
  Y = 'Y',
  N = 'N',
  U = 'U',
}
export enum AttendanceType {
  emergency_acute = 'emergency_acute',
  antenatal = 'antenatal',
  postnatal = 'postnatal',
  chronic_followup = 'chronic_followup',
  specialist_consultation = 'specialist_consultation',
  delivery = 'delivery',
  surgery = 'surgery',
  general_consultation = 'general_consultation',
}
export enum PaymentMode {
  cash = 'cash',
  nhis = 'nhis',
  private_insurance = 'private_insurance',
  corporate = 'corporate',
}
export enum AttendanceStatus {
  pending = 'pending',
  completed = 'completed',
  cancelled = 'cancelled',
  admitted = 'admitted',
  discharged = 'discharged',
}
export enum EncounterCategory {
  opd = 'opd',
  ipd = 'ipd',
  daycase = 'daycase',
}
export enum VisitCategory {
  general = 'general',
  specialist = 'specialist',
  emergency = 'emergency',
  inpatient = 'inpatient',
}
export enum BillStatus {
  draft = 'draft',
  pending = 'pending',
  partial = 'partial',
  paid = 'paid',
  cancelled = 'cancelled',
}
export enum ClaimStatus {
  draft = 'draft',
  not_required = 'not_required',
  pending = 'pending',
  submitted = 'submitted',
  approved = 'approved',
  partially_approved = 'partially_approved',
  rejected = 'rejected',
  paid = 'paid',
}
export enum FacilityType {
  Tertiary = 'Tertiary',
  Secondary = 'Secondary',
  Primary = 'Primary',
  Clinic = 'Clinic',
  Health_Center = 'Health_Center',
  Maternity_Home = 'Maternity_Home',
}
export enum InsuranceType {
  nhis = 'nhis',
  private = 'private',
  corporate = 'corporate',
}
export enum ServiceType {
  consultation = 'consultation',
  ward = 'ward',
  lab_test = 'lab_test',
  scan = 'scan',
  medication = 'medication',
  procedure = 'procedure',
  diagnosis = 'diagnosis',
  miscellaneous = 'miscellaneous',
}
export enum ServiceCategory {
  opd = 'opd',
  ipd = 'ipd',
  diagnostics = 'diagnostics',
  pharmacy = 'pharmacy',
  other = 'other',
}
export enum UserRole {
  admin = 'admin',
  doctor = 'doctor',
  nurse = 'nurse',
  midwife = 'midwife',
  records = 'records',
  lab_tech = 'lab_tech',
  pharmacist = 'pharmacist',
  accounts = 'accounts',
  sonographer = 'sonographer',
}
export enum LabTestStatus {
  requested = 'requested',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
}
export enum ProcedureStatus {
  scheduled = 'scheduled',
  completed = 'completed',
  cancelled = 'cancelled',
}
export enum ScanStatus {
  requested = 'requested',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
}
export enum MedicationStatus {
  prescribed = 'prescribed',
  dispensed = 'dispensed',
  administered = 'administered',
  cancelled = 'cancelled',
}
export enum Priority {
  routine = 'routine',
  urgent = 'urgent',
  stat = 'stat',
}
export enum ScanPriority {
  routine = 'routine',
  urgent = 'urgent',
}
export enum DiagnosisType {
  provisional = 'provisional',
  primary = 'primary',
  additional = 'additional',
}
export enum AppointmentStatus {
  scheduled = 'scheduled',
  confirmed = 'confirmed',
  checked_in = 'checked_in',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
  no_show = 'no_show',
}
export enum AppointmentType {
  consultation = 'consultation',
  follow_up = 'follow_up',
  procedure = 'procedure',
  antenatal = 'antenatal',
  postnatal = 'postnatal',
  vaccination = 'vaccination',
  lab_test = 'lab_test',
  scan = 'scan',
  other = 'other',
}
export enum NotificationType {
  info = 'info',
  success = 'success',
  warning = 'warning',
  error = 'error',
  system = 'system',
  appointment = 'appointment',
  billing = 'billing',
  clinical = 'clinical',
  sms = 'sms',
  whatsapp = 'whatsapp',
}
export enum NotificationPriority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  urgent = 'urgent',
}
export enum NHISCoverageType {
  full = 'full',
  partial = 'partial',
  not_covered = 'not_covered',
}
export enum PaymentMethod {
  cash = 'cash',
  mobile_money = 'mobile_money',
  card = 'card',
  bank_transfer = 'bank_transfer',
  cheque = 'cheque',
}
export enum StockTransactionType {
  purchase = 'purchase',
  adjustment = 'adjustment',
  requisition = 'requisition',
  sale = 'sale',
}
export enum RequisitionStatus {
  draft = 'draft',
  submitted = 'submitted',
  approved = 'approved',
  fulfilled = 'fulfilled',
  cancelled = 'cancelled',
}
export enum RequisitionUrgency {
  routine = 'routine',
  urgent = 'urgent',
  emergency = 'emergency',
}
export enum Gender {
  male = 'male',
  female = 'female',
  other = 'other',
}
export enum BodyPart {
  head = 'head',
  chest = 'chest',
  neck = 'neck',
  abdomen = 'abdomen',
  pelvis = 'pelvis',
  spine = 'spine',
  extremities = 'extremities',
  breast = 'breast',
  eye = 'eye',
  skeleton = 'skeleton',
  other = 'other',
}
export enum ProcedureCategory {
  surgical = 'surgical',
  diagnostic = 'diagnostic',
  therapeutic = 'therapeutic',
  obstetric = 'obstetric',
  pediatric = 'pediatric',
  dental = 'dental',
  ophthalmic = 'ophthalmic',
  laparoscopic = 'laparoscopic',
  laparotomy = 'laparotomy',
  orthopedic = 'orthopedic',
  urology = 'urology',
  ent = 'ent',
  dermatology = 'dermatology',
  neurology = 'neurology',
  emergency = 'emergency',
  minor = 'minor',
}
export enum LabCategory {
  hematology = 'hematology',
  biochemistry = 'biochemistry',
  microbiology = 'microbiology',
  serology = 'serology',
  immunology = 'immunology',
  toxicology = 'toxicology',
  molecular = 'molecular',
  cytology = 'cytology',
  histopathology = 'histopathology',
  pulmonology = 'pulmonology',
  neurology = 'neurology',
  cardiology = 'cardiology',
  radiology = 'radiology',
  pathology = 'pathology',
  ophthalmology = 'ophthalmology',
  pft = 'pft',
  eeg = 'eeg',
  ecg = 'ecg',
  angiography = 'angiography',
  eye = 'eye',
  gastroenterology = 'gastroenterology',
  endocrinology = 'endocrinology',
  urinalysis = 'urinalysis',
}
export enum ScanCategory {
  xray = 'xray',
  ultrasound = 'ultrasound',
  ct_scan = 'ct_scan',
  mri = 'mri',
  fluoroscopy = 'fluoroscopy',
  mammography = 'mammography',
  nuclear = 'nuclear',
  pet_scan = 'pet_scan',
  dental_xray = 'dental_xray',
  nuclear_medicine = 'nuclear_medicine',
  other = 'other',
}
export enum SpecimenType {
  blood = 'blood',
  urine = 'urine',
  stool = 'stool',
  csf = 'csf',
  sputum = 'sputum',
  fluid = 'fluid',
  semen = 'semen',
  tissue = 'tissue',
  saliva = 'saliva',
  swab = 'swab',
  other = 'other',
}
export enum AuditAction {
  create = 'create',
  update = 'update',
  delete = 'delete',
  void = 'void',
  approve = 'approve',
  reject = 'reject',
  submit = 'submit',
  print = 'print',
  login = 'login',
  logout = 'logout',
}
export enum ReportType {
  ghs_opd_morbidity = 'ghs_opd_morbidity',
  ghs_ipd_morbidity = 'ghs_ipd_morbidity',
  ghs_under5_morbidity = 'ghs_under5_morbidity',
  ghs_antenatal = 'ghs_antenatal',
  nhia_monthly_claim = 'nhia_monthly_claim',
  nhia_quarterly_claim = 'nhia_quarterly_claim',
  revenue_summary = 'revenue_summary',
  daily_collections = 'daily_collections',
  stock_consumption = 'stock_consumption',
  bed_occupancy = 'bed_occupancy',
  lab_turnaround = 'lab_turnaround',
  custom = 'custom',
}
export enum ReportStatus {
  pending = 'pending',
  running = 'running',
  completed = 'completed',
  failed = 'failed',
}
export enum DocumentTemplateType {
  receipt = 'receipt',
  referral_letter = 'referral_letter',
  discharge_summary = 'discharge_summary',
  admission_letter = 'admission_letter',
  lab_result = 'lab_result',
  scan_report = 'scan_report',
  prescription = 'prescription',
  nhia_claim_form = 'nhia_claim_form',
}
export enum EligibilityCheckMethod {
  card_reader = 'card_reader',
  nhia_portal = 'nhia_portal',
  offline_list = 'offline_list',
  manual = 'manual',
}
export enum EligibilityStatus {
  active = 'active',
  expired = 'expired',
  suspended = 'suspended',
  not_found = 'not_found',
  referred_facility_mismatch = 'referred_facility_mismatch',
}
export enum PreAuthStatus {
  pending = 'pending',
  approved = 'approved',
  partially_approved = 'partially_approved',
  rejected = 'rejected',
  cancelled = 'cancelled',
  expired = 'expired',
}
export enum ClaimSubmissionMethod {
  portal = 'portal',
  paper = 'paper',
  edi_batch = 'edi_batch',
  api = 'api',
}
export enum WaiverType {
  indigent = 'indigent',
  nhis_exempt = 'nhis_exempt',
  staff_discount = 'staff_discount',
  management_discretion = 'management_discretion',
  other = 'other',
}
export enum WaiverStatus {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
}
export enum ReferralType {
  outgoing = 'outgoing',
  incoming = 'incoming',
}
export enum ReferralStatus {
  pending = 'pending',
  accepted = 'accepted',
  completed = 'completed',
  cancelled = 'cancelled',
}
export enum AntenatalRisk {
  low = 'low',
  medium = 'medium',
  high = 'high',
}
export enum GHSReportType {
  opd_morbidity = 'opd_morbidity',
  opd_attendance = 'opd_attendance',
  ipd_morbidity = 'ipd_morbidity',
  idsr = 'idsr',
  form_a_morbidity = 'form_a_morbidity',
  form_a_services = 'form_a_services',
  form_a_complete = 'form_a_complete',
  malaria_data = 'malaria_data',
  monthly_summary = 'monthly_summary',
}
export enum MalariaCommodityType {
  asaq_below_1yr = 'asaq_below_1yr',
  asaq_1_5yrs = 'asaq_1_5yrs',
  asaq_6_13yrs = 'asaq_6_13yrs',
  asaq_14_plus = 'asaq_14_plus',
  al_0_3yrs = 'al_0_3yrs',
  al_4_8yrs = 'al_4_8yrs',
  al_9_13yrs = 'al_9_13yrs',
  al_14_plus = 'al_14_plus',
  dhap_40_320mg = 'dhap_40_320mg',
  quinine_tablet = 'quinine_tablet',
  quinine_injection = 'quinine_injection',
  artesunate_injection_30mg = 'artesunate_injection_30mg',
  artesunate_injection_60mg = 'artesunate_injection_60mg',
  artesunate_injection_120mg = 'artesunate_injection_120mg',
  arthemeter_injection_40mg = 'arthemeter_injection_40mg',
  arthemeter_injection_80mg = 'arthemeter_injection_80mg',
  rectal_artesunate_50mg = 'rectal_artesunate_50mg',
  rectal_artesunate_200mg = 'rectal_artesunate_200mg',
  rdt_kits = 'rdt_kits',
  sp = 'sp',
}
export enum DeliveryType {
  spontaneous_vertex = 'spontaneous_vertex',
  assisted_breech = 'assisted_breech',
  vacuum = 'vacuum',
  forceps = 'forceps',
  caesarean_section = 'caesarean_section',
  multiple = 'multiple',
}
export enum DeliveryOutcome {
  live_birth = 'live_birth',
  stillbirth_fresh = 'stillbirth_fresh',
  stillbirth_macerated = 'stillbirth_macerated',
  neonatal_death = 'neonatal_death',
}
export enum MaternalOutcome {
  alive = 'alive',
  dead_direct_cause = 'dead_direct_cause',
  dead_indirect_cause = 'dead_indirect_cause',
  dead_unknown = 'dead_unknown',
}
export enum NewbornOutcome {
  alive = 'alive',
  dead_within_24hrs = 'dead_within_24hrs',
  dead_1_7days = 'dead_1_7days',
  dead_8_28days = 'dead_8_28days',
  referred_out = 'referred_out',
}
export enum AbortionType {
  spontaneous = 'spontaneous',
  induced_safe = 'induced_safe',
  induced_unsafe = 'induced_unsafe',
  septic = 'septic',
  incomplete = 'incomplete',
  complete = 'complete',
  missed = 'missed',
  recurrent = 'recurrent',
}
export enum AbortionMethod {
  medical = 'medical',
  surgical_d_and_c = 'surgical_d_and_c',
  surgical_mva = 'surgical_mva',
  other = 'other',
}
export enum PatientClassification {
  NEW = 'NEW',
  OLD = 'OLD',
}
export enum DiagnosisClassification {
  NEW_DIAGNOSIS = 'NEW_DIAGNOSIS',
  OLD_DIAGNOSIS = 'OLD_DIAGNOSIS',
}
export enum CordCareMethod {
  dry_cord = 'dry_cord',
  chlorhexidine = 'chlorhexidine',
  methylated_spirit = 'methylated_spirit',
  alcohol = 'alcohol',
  other = 'other',
}
export enum Seniority {
  TRAINEE = 'TRAINEE',
  JUNIOR = 'JUNIOR',
  SENIOR = 'SENIOR',
  PRINCIPAL = 'PRINCIPAL',
}
export enum PlaceOfDelivery {
  private_hospital = 'private_hospital',
  government_hospital = 'government_hospital',
  health_centre = 'health_centre',
  clinic = 'clinic',
  chag_facility = 'chag_facility',
  private_midwife = 'private_midwife',
  tba_trained = 'tba_trained',
  tba_untrained = 'tba_untrained',
  home = 'home',
  en_route = 'en_route',
  mines_facility = 'mines_facility',
  quasi_govt_institution = 'quasi_govt_institution',
}

export interface AuditLog {
    id: string;
    entityType: string;
    entityId: string;
    performedById: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    previousState?: any | null;
    newState?: any | null;
    metadata?: any | null;
    timestamp: string;
}

export interface ReportDefinition {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    parameters?: any | null;
    templatePath?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    executions: ReportExecution[];
}

export interface ReportExecution {
    id: string;
    reportDefinitionId: string;
    reportPeriodStart: string;
    reportPeriodEnd: string;
    parameters?: any | null;
    outputPath?: string | null;
    submittedToGHS: boolean;
    submittedAt?: string | null;
    ghsReferenceNo?: string | null;
    generatedById: string;
    generatedAt: string;
    completedAt?: string | null;
    errorMessage?: string | null;
    createdAt: string;
}

export interface DocumentTemplate {
    id: string;
    name: string;
    code: string;
    content: string;
    isActive: boolean;
    isDefault: boolean;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    generatedDocs: GeneratedDocument[];
}

export interface GeneratedDocument {
    id: string;
    templateId: string;
    entityType: string;
    entityId: string;
    filePath?: string | null;
    generatedById: string;
    generatedAt: string;
}

export interface ServicePricing {
    id: string;
    serviceCatalogId: string;
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    corporatePrice: number;
    vatRate: number;
    isTaxable: boolean;
    effectiveDate: string;
    expiryDate?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ServiceCatalog {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    nhisServiceCode?: string | null;
    isNHISCovered: boolean;
    tariffCode?: string | null;
    nhisRequiresAuth: boolean;
    privateInsRequiresAuth: boolean;
    isPrivateInsuranceExempted: boolean;
    unit: string;
    isPending: boolean;
    requiresClinicalNotes: boolean;
    subType?: string | null;
    metadata?: any | null;
    isActive: boolean;
    diagnosisId?: string | null;
    labTestTemplateId?: string | null;
    procedureTemplateId?: string | null;
    stockItemId?: string | null;
    wardId?: string | null;
    scanTemplateId?: string | null;
    consultationTypeId?: string | null;
    createdById?: string | null;
    gdrgTariffId?: string | null;
    ServiceRendered: ServiceRendered[];
    createdAt: string;
    updatedAt: string;
    labTests: LabTest[];
    scans: Scan[];
    procedures: Procedure[];
    medications: Medication[];
    BillLineItem: BillLineItem[];
    ProformaInvoiceItem: ProformaInvoiceItem[];
    gdrgProcedureLinks: GDRGTariffProcedure[];
}

export interface Patient {
    id: string;
    folderNumber: string;
    surname: string;
    otherNames: string;
    dateOfBirth: string;
    contact: string;
    address: string;
    insuranceDetails?: any | null;
    additionalInfo?: any | null;
    billingAddress?: any | null;
    employer?: any | null;
    imageUrl?: string | null;
    registeredAt: string;
    registeredBy: string;
    insuranceProviderId?: string | null;
    createdAt: string;
    updatedAt: string;
    nhisNumber?: string | null;
    nhisExpiryDate?: string | null;
    nhisActive: boolean;
    phoneNumber?: string | null;
    Attendance: Attendance[];
    Bill: Bill[];
    InsuranceClaim: InsuranceClaim[];
    Vitals: Vitals[];
    appointments: Appointment[];
    NHISEligibilityCheck: NHISEligibilityCheck[];
    ReferralRecord: ReferralRecord[];
    antenatalBookings: AntenatalBooking[];
    PatientWaiver: PatientWaiver[];
    deliveryRecords: DeliveryRecord[];
    abortionRecords: AbortionRecord[];
    postnatalRecords: PostnatalRecord[];
    proformaInvoices: ProformaInvoice[];
    familyPlanningServices: FamilyPlanningService[];
}

export interface NHISEligibilityCheck {
    id: string;
    patientId: string;
    attendanceId?: string | null;
    membershipId: string;
    checkTimestamp: string;
    memberName?: string | null;
    registeredFacilityCode?: string | null;
    ccCode?: string | null;
    membershipExpiry?: string | null;
    responseReference?: string | null;
    rawResponse?: any | null;
    checkedById: string;
    createdAt: string;
}

export interface InsuranceProvider {
    id: string;
    name: string;
    coveragePercentage: number;
    portalUrl?: string | null;
    contactInfo?: any | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    Attendance: Attendance[];
    Bill: Bill[];
    InsuranceClaim: InsuranceClaim[];
    Patient: Patient[];
    InsurancePlan: InsurancePlan[];
    PreAuthorisationRequest: PreAuthorisationRequest[];
    CorporateAccount: CorporateAccount[];
}

export interface InsurancePlan {
    id: string;
    insuranceProviderId: string;
    name: string;
    coveragePercentage: number;
    annualLimit?: number | null;
    requiresPreAuth: boolean;
    coPaymentAmount: number;
    coPaymentPercentage: number;
    isActive: boolean;
    effectiveDate: string;
    expiryDate?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PreAuthorisationRequest {
    id: string;
    referenceNumber: string;
    attendanceId: string;
    patientId: string;
    insuranceProviderId: string;
    requestedById: string;
    requestedAt: string;
    requestedServices: any;
    estimatedTotalCost: number;
    clinicalJustification?: string | null;
    responseReceivedAt?: string | null;
    approvedAmount?: number | null;
    approvedServices?: any | null;
    rejectionReason?: string | null;
    authNumber?: string | null;
    authExpiry?: string | null;
    updatedById?: string | null;
    updatedAt: string;
    createdAt: string;
}

export interface Attendance {
    id: string;
    attendanceNumber: string;
    patientId: string;
    insuranceProviderId?: string | null;
    corporateAccountId?: string | null;
    bedId?: string | null;
    appointmentId?: string | null;
    wardId?: string | null;
    dateTime: string;
    nhisCCC?: string | null;
    nhisEligibilityCheckId?: string | null;
    referralId?: string | null;
    nhisCCCCode?: string | null;
    nhisCCCGeneratedAt?: string | null;
    nhisCCCValidUntil?: string | null;
    complaints: string;
    medicalNotes?: string | null;
    gdrgCategory?: string | null;
    historyPresentingComplaint?: string | null;
    onsetDurationQuality?: string | null;
    physicalExamination?: string | null;
    treatmentPlan?: string | null;
    followUpDate?: string | null;
    familyPlanningServices: FamilyPlanningService[];
    antenatalBookings: AntenatalBooking[];
    currentAntenatalBookings: AntenatalBooking[];
    antenatalVisits: ANCVisit[];
    totalBill: number;
    paidAmount: number;
    outstandingBalance: number;
    insuranceClaimId?: string | null;
    preAuthNumber?: string | null;
    preAuthApproved: boolean;
    preAuthAmount?: number | null;
    referringFacility?: string | null;
    createdById: string;
    updatedById?: string | null;
    createdAt: string;
    updatedAt: string;
    AttendanceDiagnosis: AttendanceDiagnosis[];
    LabTest: LabTest[];
    Medication: Medication[];
    Procedure: Procedure[];
    Scan: Scan[];
    ServiceRendered: ServiceRendered[];
    Vitals: Vitals[];
    NHISEligibilityCheck: NHISEligibilityCheck[];
    PreAuthorisationRequest: PreAuthorisationRequest[];
    WardChargeRecord: WardChargeRecord[];
    deliveryRecords: DeliveryRecord[];
    abortionRecords: AbortionRecord[];
    postnatalRecords: PostnatalRecord[];
    proformaInvoices: ProformaInvoice[];
    corporateEmployeeId?: string | null;
}

export interface LabTest {
    id: string;
    attendanceId: string;
    templateId: string;
    serviceCatalogId?: string | null;
    result?: any | null;
    normalRange?: string | null;
    units?: string | null;
    requestedAt: string;
    completedAt?: string | null;
    turnaroundMinutes?: number | null;
    performedById?: string | null;
    verifiedById?: string | null;
    notes?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
}

export interface Scan {
    id: string;
    attendanceId: string;
    templateId: string;
    serviceCatalogId?: string | null;
    scanType: string;
    description: string;
    bodyPart?: string | null;
    requestedAt: string;
    completedAt?: string | null;
    turnaroundMinutes?: number | null;
    result?: string | null;
    findings?: string | null;
    impression?: string | null;
    performedById?: string | null;
    verifiedById?: string | null;
    imageUrls: String[];
    createdById: string;
    createdAt: string;
    updatedAt: string;
}

export interface Procedure {
    id: string;
    attendanceId: string;
    templateId: string;
    serviceCatalogId?: string | null;
    scheduledDate?: string | null;
    performedAt?: string | null;
    performedById?: string | null;
    assistantId?: string | null;
    notes?: string | null;
    complications?: string | null;
    outcome?: string | null;
    cost?: number | null;
    duration?: number | null;
    createdById: string;
    anesthesiaNotes?: string | null;
    intraOperativeNotes?: string | null;
    postOperativeNotes?: string | null;
    bloodLoss?: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface GDRGTariffProcedure {
    gdrgTariffId: string;
    procedureId: string;
    isPrimary: boolean;
    mappedCode?: string | null;
    createdAt: string;
}

export interface Medication {
    id: string;
    attendanceId: string;
    stockItemId?: string | null;
    serviceCatalogId?: string | null;
    name: string;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    quantity: number;
    route?: string | null;
    instructions?: string | null;
    prescribedAt: string;
    dispensedAt?: string | null;
    administeredAt?: string | null;
    dispensedById?: string | null;
    administeredById?: string | null;
    prescribedById: string;
    notes?: string | null;
    dispensedBatchNumber?: string | null;
    dispensedExpiryDate?: string | null;
    dispensedUnitCost?: number | null;
    createdAt: string;
    updatedAt: string;
    administeredDoses?: any | null;
}

export interface Vitals {
    id: string;
    attendanceId: string;
    patientId: string;
    bloodPressure?: string | null;
    temperature?: number | null;
    pulse?: number | null;
    respiration?: number | null;
    spo2?: number | null;
    weight?: number | null;
    height?: number | null;
    bmi?: number | null;
    muac?: number | null;
    notes?: string | null;
    recordedById: string;
    recordedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface Ward {
    id: string;
    wardName: string;
    wardType: string;
    totalBeds: number;
    occupiedBeds: number;
    isActive: boolean;
    isNHISCovered: boolean;
    nhisRequiresAuth: boolean;
    isPrivateInsExempted: boolean;
    isPending: boolean;
    requiresAuthorization: boolean;
    tariffCode?: string | null;
    vatRate: number;
    isTaxable: boolean;
    dailyCashRate: number;
    dailyNHISRate: number;
    dailyInsuranceRate: number;
    createdAt: string;
    updatedAt: string;
    Attendance: Attendance[];
    Bed: Bed[];
    ServiceCatalog: ServiceCatalog[];
    WardChargeRecord: WardChargeRecord[];
}

export interface GDRGTariff {
    id: string;
    gdrgCode: string;
    description: string;
    nhiaTariff: number;
    ageSplit: string;
    minAgeYears?: number | null;
    maxAgeYears?: number | null;
    applicableLevels: Int[];
    nhisServiceCode?: string | null;
    isZoomCode: boolean;
    allowsAddOn: boolean;
    attendanceTypes: AttendanceType[];
    isAntenatal: boolean;
    isDelivery: boolean;
    effectiveFrom: string;
    effectiveTo?: string | null;
    isActive: boolean;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    diagnoses: GDRGTariffDiagnosis[];
    ServiceCatalog: ServiceCatalog[];
    procedures: GDRGTariffProcedure[];
}

export interface GDRGTariffDiagnosis {
    gdrgTariffId: string;
    diagnosisId: string;
    isPrimary: boolean;
    mappedIcdCode?: string | null;
    createdAt: string;
}

export interface Diagnosis {
    id: string;
    name: string;
    icdCode: string;
    description?: string | null;
    isActive: boolean;
    requiresAuthorization: boolean;
    tariffCode?: string | null;
    isChronic: boolean;
    isNHISCovered: boolean;
    createdAt: string;
    updatedAt: string;
    gdrgTariffDiagnoses: GDRGTariffDiagnosis[];
    attendanceDiagnoses: AttendanceDiagnosis[];
    ServiceCatalog: ServiceCatalog[];
}

export interface AttendanceDiagnosis {
    id: string;
    attendanceId: string;
    diagnosisId: string;
    notes?: string | null;
    date: string;
    createdById: string;
    icdCode?: string | null;
    createdAt: string;
}

export interface Bill {
    id: string;
    billNumber: string;
    patientId: string;
    attendanceId: string;
    admissionId?: string | null;
    subtotal: number;
    discount: number;
    waiverAmount: number;
    taxAmount: number;
    totalAmount: number;
    insuranceCovered: number;
    patientPayable: number;
    paidAmount: number;
    balance: number;
    corporateAccountId?: string | null;
    insuranceProviderId?: string | null;
    preAuthNumber?: string | null;
    claimNumber?: string | null;
    createdById: string;
    updatedById?: string | null;
    billDate: string;
    dueDate?: string | null;
    createdAt: string;
    updatedAt: string;
    InsuranceClaim: InsuranceClaim[];
    Payment: Payment[];
    BillLineItem: BillLineItem[];
    PatientWaiver: PatientWaiver[];
}

export interface BillLineItem {
    id: string;
    billId: string;
    serviceCatalogId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatAmount: number;
    lineTotal: number;
    insuranceCoveredAmount: number;
    patientPayableAmount: number;
    discount: number;
    pricingSnapshotId?: string | null;
    isVoided: boolean;
    voidedById?: string | null;
    voidedAt?: string | null;
    voidReason?: string | null;
    createdAt: string;
}

export interface PatientWaiver {
    id: string;
    patientId: string;
    billId?: string | null;
    reason: string;
    amountRequested: number;
    amountApproved: number;
    requestedById: string;
    approvedById?: string | null;
    approvedAt?: string | null;
    rejectionReason?: string | null;
    supportingDocs: String[];
    createdAt: string;
    updatedAt: string;
}

export interface Payment {
    id: string;
    billId: string;
    amount: number;
    reference?: string | null;
    transactionDate: string;
    receivedById: string;
    notes?: string | null;
    isVoided: boolean;
    voidedById?: string | null;
    voidedAt?: string | null;
    voidReason?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InsuranceClaim {
    id: string;
    claimNumber: string;
    billId?: string | null;
    patientId: string;
    attendanceId: string;
    insuranceProviderId: string;
    corporateAccountId?: string | null;
    totalClaimAmount: number;
    approvedAmount?: number | null;
    rejectedAmount?: number | null;
    paidAmount?: number | null;
    submissionDate?: string | null;
    approvalDate?: string | null;
    paymentDate?: string | null;
    preAuthNumber?: string | null;
    diagnosisCodes: String[];
    procedureCodes: String[];
    labTestCodes: String[];
    serviceCodes: String[];
    scanCodes: String[];
    principalGDRG?: string | null;
    claimCheckCode?: string | null;
    typeOfService?: string | null;
    typeOfAttendance?: string | null;
    serviceOutcome?: string | null;
    mdcCode?: string | null;
    datesOfService: String[];
    medicationCodes: String[];
    gdrgCodes: String[];
    nhisServiceCodes: String[];
    metadata?: any | null;
    notes?: string | null;
    createdById: string;
    updatedById?: string | null;
    createdAt: string;
    updatedAt: string;
    batchId?: string | null;
}

export interface ClaimBatch {
    id: string;
    batchNumber: string;
    batchDate: string;
    description?: string | null;
    totalAmount: number;
    xmlGeneratedAt?: string | null;
    xmlFilePath?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    claims: InsuranceClaim[];
}

export interface WardChargeRecord {
    id: string;
    attendanceId: string;
    admissionId?: string | null;
    wardId: string;
    bedId: string;
    chargeDate: string;
    dailyRate: number;
    nhisPrice: number;
    cashPrice: number;
    insurancePrice: number;
    corporatePrice: number;
    isBilled: boolean;
    billLineItemId?: string | null;
    createdAt: string;
}

export interface Admission {
    id: string;
    attendanceId: string;
    admissionNumber: string;
    admissionDate: string;
    dischargeDate?: string | null;
    dailyNotes?: any | null;
    createdAt: string;
    updatedAt: string;
    bills: Bill[];
    deliveryRecords: DeliveryRecord[];
    proformaInvoices: ProformaInvoice[];
}

export interface Bed {
    id: string;
    wardId: string;
    bedNumber: string;
    isOccupied: boolean;
    currentPatientId?: string | null;
    createdAt: string;
    updatedAt: string;
    Attendance: Attendance[];
}

export interface ReferralRecord {
    id: string;
    referralNumber: string;
    patientId: string;
    attendanceId?: string | null;
    referralReason: string;
    referralNotes?: string | null;
    referredToFacility?: string | null;
    referredToDoctor?: string | null;
    referredToDepartment?: string | null;
    referredFromFacility?: string | null;
    referredFromDoctor?: string | null;
    referralDate: string;
    outcomeNotes?: string | null;
    completedAt?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
}

export interface AntenatalBooking {
    id: string;
    patientId: string;
    attendanceId: string;
    currentAttendanceId?: string | null;
    bookingDate: string;
    lmp?: string | null;
    edd?: string | null;
    gestationalAgeWeeks?: number | null;
    gestationalAgeAtBooking?: number | null;
    gravida: number;
    para: number;
    previousCSection: boolean;
    previousComplications?: string | null;
    bloodGroup?: string | null;
    hivStatus?: string | null;
    hbLevel?: number | null;
    vdrl?: string | null;
    iptpDoses: any;
    iptp1Date?: string | null;
    iptp2Date?: string | null;
    iptp3Date?: string | null;
    iptp4Date?: string | null;
    iptp5Date?: string | null;
    ttDoses: any;
    tt1Date?: string | null;
    tt2Date?: string | null;
    tt3Date?: string | null;
    tt4Date?: string | null;
    tt5Date?: string | null;
    malariaTested: boolean;
    malariaPositive: boolean;
    malariaTreatment?: string | null;
    malariaIPTpGiven: boolean;
    hbBooking?: number | null;
    hb36Weeks?: number | null;
    anaemiaDiagnosed: boolean;
    ironFolateGiven: boolean;
    itnGiven: boolean;
    itnGivenDate?: string | null;
    riskFactors?: any | null;
    deliveryRecordId?: string | null;
    deliveryOutcome?: string | null;
    deliveryDate?: string | null;
    isActive: boolean;
    isCompleted: boolean;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    visits: ANCVisit[];
    postnatalRecords: PostnatalRecord[];
}

export interface ANCVisit {
    id: string;
    bookingId: string;
    attendanceId: string;
    visitNumber: number;
    visitDate: string;
    gestationalAgeWeeks?: number | null;
    weight?: number | null;
    bloodPressure?: string | null;
    fundalHeight?: number | null;
    fetalHeartRate?: number | null;
    fetalMovements?: boolean | null;
    presentation?: string | null;
    oedema: boolean;
    oedemaGrade?: string | null;
    urinalysisProtein?: boolean | null;
    urinalysisGlucose?: boolean | null;
    urinalysisBlood?: boolean | null;
    iptpGiven: boolean;
    iptpDoseNumber?: number | null;
    iptpDrug?: string | null;
    ttGiven: boolean;
    ttDoseNumber?: number | null;
    ironGiven: boolean;
    folateGiven: boolean;
    calciumGiven: boolean;
    malariaTestDone: boolean;
    malariaTestResult?: string | null;
    malariaTreatmentGiven: boolean;
    dangerSignsPresent: boolean;
    dangerSignsList: String[];
    referralMade: boolean;
    referredTo?: string | null;
    nextVisitDate?: string | null;
    returnInstructions?: string | null;
    recordedById: string;
    createdAt: string;
    updatedAt: string;
}

export interface PostnatalRecord {
    id: string;
    patientId: string;
    attendanceId: string;
    antenatalBookingId?: string | null;
    deliveryRecordId?: string | null;
    examinationDate: string;
    dayNumber: number;
    maternalCondition?: string | null;
    maternalComplications: any;
    bloodPressure?: string | null;
    temperature?: number | null;
    pulse?: number | null;
    fundalHeight?: number | null;
    lochia?: string | null;
    perinealCondition?: string | null;
    caesareanWound?: string | null;
    breastfeedingStatus?: string | null;
    breastfeedingDifficulties: any;
    latching?: string | null;
    babyCondition?: string | null;
    babyWeight?: number | null;
    babyTemperature?: number | null;
    babyFeeding?: string | null;
    jaundice: boolean;
    jaundiceSeverity?: string | null;
    cordCondition?: string | null;
    bcgGiven: boolean;
    opv0Given: boolean;
    hepB0Given: boolean;
    familyPlanningDiscussed: boolean;
    familyPlanningMethodAccepted?: string | null;
    maternalDangerSigns: any;
    babyDangerSigns: any;
    referralMade: boolean;
    referredTo?: string | null;
    referralReason?: string | null;
    nextVisitDate?: string | null;
    nextVisitType?: string | null;
    notes?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
}

export interface LabTestTemplate {
    id: string;
    name: string;
    investigationCode: string;
    subCategory?: string | null;
    description?: string | null;
    isNHISCovered: boolean;
    isPrivateInsExempted: boolean;
    nhisRequiresAuth: boolean;
    privateInsRequiresAuth: boolean;
    isActive: boolean;
    tariffCode?: string | null;
    vatRate: number;
    isTaxable: boolean;
    resultTemplate?: any | null;
    normalRangeTemplate?: any | null;
    createdAt: string;
    updatedAt: string;
    LabTest: LabTest[];
    ServiceCatalog: ServiceCatalog[];
}

export interface ScanTemplate {
    id: string;
    name: string;
    investigationCode: string;
    scanCode: string;
    description: string;
    isNHISCovered: boolean;
    isPrivateInsExempted: boolean;
    nhisRequiresAuth: boolean;
    privateInsRequiresAuth: boolean;
    isActive: boolean;
    tariffCode?: string | null;
    vatRate: number;
    isTaxable: boolean;
    preparationInstructions?: string | null;
    duration: number;
    contrastRequired: boolean;
    scanType?: string | null;
    createdAt: string;
    updatedAt: string;
    Scan: Scan[];
    ServiceCatalog: ServiceCatalog[];
}

export interface ProcedureTemplate {
    id: string;
    name: string;
    procedureCode: string;
    description?: string | null;
    department: string;
    isNHISCovered: boolean;
    isPrivateInsExempted: boolean;
    nhisRequiresAuth: boolean;
    privateInsRequiresAuth: boolean;
    isActive: boolean;
    tariffCode?: string | null;
    vatRate: number;
    isTaxable: boolean;
    duration: number;
    createdAt: string;
    updatedAt: string;
    Procedure: Procedure[];
    ServiceCatalog: ServiceCatalog[];
}

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
    serviceCatalogs: ServiceCatalog[];
}

export interface StockItem {
    id: string;
    name: string;
    category: string;
    description?: string | null;
    strength: string;
    unitOfMeasure: string;
    drugCode: string;
    reorderLevel: number;
    currentStock: number;
    costPrice: number;
    isNHISCovered: boolean;
    isPrivateInsExempted: boolean;
    nhisRequiresAuth: boolean;
    privateInsRequiresAuth: boolean;
    supplier?: string | null;
    expiryDate?: string | null;
    batchNumber?: string | null;
    isActive: boolean;
    tariffCode?: string | null;
    vatRate: number;
    isTaxable: boolean;
    isMedication: boolean;
    createdAt: string;
    updatedAt: string;
    InvoiceItem: InvoiceItem[];
    Medication: Medication[];
    RequisitionItem: RequisitionItem[];
    ServiceCatalog: ServiceCatalog[];
    StockTransaction: StockTransaction[];
    StockBatch: StockBatch[];
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

export interface Invoice {
    id: string;
    invoiceNumber: string;
    supplierName: string;
    invoiceDate: string;
    totalAmount: number;
    notes?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    InvoiceItem: InvoiceItem[];
    StockTransaction: StockTransaction[];
    corporateAccountId?: string | null;
}

export interface InvoiceItem {
    id: string;
    invoiceId: string;
    stockItemId: string;
    quantity: number;
    unitCost: number;
    batchNumber?: string | null;
    expiryDate?: string | null;
    createdAt: string;
}

export interface StockTransaction {
    id: string;
    stockItemId: string;
    quantity: number;
    balanceAfter: number;
    reference?: string | null;
    notes?: string | null;
    transactionDate: string;
    performedBy: string;
    requisitionId?: string | null;
    invoiceId?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Requisition {
    id: string;
    requisitionNumber: string;
    requestingDepartmentId: string;
    requestedById: string;
    requiredDate?: string | null;
    purpose?: string | null;
    approvedById?: string | null;
    approvedAt?: string | null;
    fulfilledById?: string | null;
    fulfilledAt?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    RequisitionItem: RequisitionItem[];
    StockTransaction: StockTransaction[];
}

export interface RequisitionItem {
    id: string;
    requisitionId: string;
    stockItemId: string;
    quantityRequested: number;
    quantityApproved?: number | null;
    quantityFulfilled: number;
    purpose?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Department {
    id: string;
    name: string;
    description?: string | null;
    headId?: string | null;
    isActive: boolean;
    color?: string | null;
    icon?: string | null;
    createdAt: string;
    updatedAt: string;
    Requisitions: Requisition[];
    users: User[];
    appointments: Appointment[];
}

export interface Appointment {
    id: string;
    appointmentNumber: string;
    patientId: string;
    clinicianId?: string | null;
    departmentId?: string | null;
    title: string;
    description?: string | null;
    appointmentDate: string;
    appointmentTime: string;
    duration: number;
    reminderSent: boolean;
    checkedIn: boolean;
    checkedInAt?: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

export interface Hospital {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    imageUrl?: string | null;
    nhisFacilityCode: string;
    nhisAccreditationNumber?: string | null;
    nhisAccreditationDate?: string | null;
    nhisAccreditationExpiry?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankBranch?: string | null;
    nhisContactPerson?: string | null;
    nhisContactPhone?: string | null;
    nhisContactEmail?: string | null;
    ghsDistrictCode?: string | null;
    ghaHFCode?: string | null;
    nhisApiBaseUrl?: string | null;
    nhisApiClientId?: string | null;
    nhisApiClientSecret?: string | null;
    nhisApiTokenEndpoint?: string | null;
    nhisApiEligibilityEndpoint?: string | null;
    nhisApiCccEndpoint?: string | null;
    nhisApiActive: boolean;
    nhisApiLastTokenRefresh?: string | null;
    nhisApiAccessToken?: string | null;
    nhisApiTokenExpiresAt?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: string;
    username: string;
    password: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    licenseNumber?: string | null;
    specialization?: string | null;
    isActive: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
    departmentId?: string | null;
    Attendance_Attendance_createdByIdToUser: Attendance[];
    Attendance_Attendance_updatedByIdToUser: Attendance[];
    AttendanceDiagnosis: AttendanceDiagnosis[];
    Bill_Bill_createdByIdToUser: Bill[];
    Bill_Bill_updatedByIdToUser: Bill[];
    InsuranceClaim_InsuranceClaim_createdByIdToUser: InsuranceClaim[];
    InsuranceClaim_InsuranceClaim_updatedByIdToUser: InsuranceClaim[];
    Invoice: Invoice[];
    LabTest_LabTest_createdByIdToUser: LabTest[];
    LabTest_LabTest_performedByIdToUser: LabTest[];
    LabTest_LabTest_verifiedByIdToUser: LabTest[];
    Medication_Medication_administeredByIdToUser: Medication[];
    Medication_Medication_dispensedByIdToUser: Medication[];
    Medication_Medication_prescribedByIdToUser: Medication[];
    Payment: Payment[];
    Payment_voidedBy: Payment[];
    Procedure_Procedure_assistantIdToUser: Procedure[];
    Procedure_Procedure_createdByIdToUser: Procedure[];
    Procedure_Procedure_performedByIdToUser: Procedure[];
    Requisition_Requisition_approvedByIdToUser: Requisition[];
    Requisition_Requisition_fulfilledByIdToUser: Requisition[];
    Requisition_Requisition_requestedByIdToUser: Requisition[];
    Scan_Scan_createdByIdToUser: Scan[];
    Scan_Scan_performedByIdToUser: Scan[];
    Scan_Scan_verifiedByIdToUser: Scan[];
    ServiceCatalog: ServiceCatalog[];
    ServiceRendered: ServiceRendered[];
    Vitals: Vitals[];
    clinicianAppointments: Appointment[];
    AuditLog: AuditLog[];
    ReportExecution: ReportExecution[];
    DocumentTemplate: DocumentTemplate[];
    GeneratedDocument: GeneratedDocument[];
    NHISEligibilityCheck: NHISEligibilityCheck[];
    PreAuthorisationRequest_requested: PreAuthorisationRequest[];
    PreAuthorisationRequest_updated: PreAuthorisationRequest[];
    refreshTokens: RefreshToken[];
    claimBatchesCreated: ClaimBatch[];
    BillLineItem_voided: BillLineItem[];
    PatientWaiver_requested: PatientWaiver[];
    PatientWaiver_approved: PatientWaiver[];
    ReferralRecord: ReferralRecord[];
    ANCVisit: ANCVisit[];
    ghsReportSubmissions: GHSReportSubmission[];
    idsrAlerts: IDSRAlert[];
    deliveryRecords: DeliveryRecord[];
    antenatalBookingsCreated: AntenatalBooking[];
    postnatalRecords: PostnatalRecord[];
    notificationsReceived: Notification[];
    notificationsSent: Notification[];
    proformaInvoicesCreated: ProformaInvoice[];
    proformaInvoicesApproved: ProformaInvoice[];
    abortionRecords: AbortionRecord[];
    familyPlanningServicesProvided: FamilyPlanningService[];
}

export interface RefreshToken {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface Notification {
    id: string;
    userId: string;
    senderId?: string | null;
    title: string;
    message: string;
    actionType?: string | null;
    actionId?: string | null;
    actionUrl?: string | null;
    isRead: boolean;
    isArchived: boolean;
    createdAt: string;
    readAt?: string | null;
    updatedAt: string;
}

export interface ServiceRendered {
    id: string;
    attendanceId: string;
    serviceItemId: string;
    quantity: number;
    date: string;
    performedById: string;
    notes?: string | null;
    createdAt: string;
}

export interface GHSReportSubmission {
    id: string;
    reportingYear: number;
    reportingMonth?: number | null;
    reportingQuarter?: number | null;
    periodStart: string;
    periodEnd: string;
    data: any;
    filePath?: string | null;
    submittedToDHIMS2: boolean;
    dhims2Reference?: string | null;
    submittedAt?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
}

export interface IDSRAlert {
    id: string;
    diseaseCode: string;
    diseaseName: string;
    alertDate: string;
    suspectedCases: number;
    confirmedCases: number;
    deaths: number;
    alertTriggered: boolean;
    alertAcknowledged: boolean;
    acknowledgedAt?: string | null;
    acknowledgedById?: string | null;
    responseNotes?: string | null;
    createdAt: string;
}

export interface MalariaCommodityStock {
    id: string;
    reportingMonth: string;
    openingStock: number;
    received: number;
    dispensed: number;
    closingStock: number;
    stockOutDays: number;
    facilityId: string;
    createdAt: string;
    updatedAt: string;
}

export interface DeliveryRecord {
    id: string;
    patientId: string;
    attendanceId: string;
    admissionId?: string | null;
    deliveryDate: string;
    attendant: string;
    birthWeight?: number | null;
    gestationWeeks?: number | null;
    apgarScore1min?: number | null;
    apgarScore5min?: number | null;
    resusCitationDone: boolean;
    referralTo?: string | null;
    complications: String[];
    createdById: string;
    createdAt: string;
    updatedAt: string;
    antenatalBookingId?: string | null;
    malePartnerPresentANC: boolean;
    malePartnerPresentDelivery: boolean;
    malePartnerPresentPNC: boolean;
    maternalDeathsAudited: boolean;
    auditNotes?: string | null;
    Newborn: NewbornRecord[];
    abortionRecordId?: string | null;
    postnatalRecords: PostnatalRecord[];
}

export interface NewbornRecord {
    id: string;
    deliveryRecordId: string;
    birthWeight: number;
    apgarScore1min?: number | null;
    apgarScore5min?: number | null;
    resuscitation: boolean;
    anomalies: String[];
    referredTo?: string | null;
    createdAt: string;
    breastfeedingWithin30Min: boolean;
    eyeProphylaxisGiven: boolean;
    babyWeightAt6to10Days?: number | null;
    weightAt6to10DaysDate?: string | null;
}

export interface AbortionRecord {
    id: string;
    patientId: string;
    attendanceId: string;
    abortionDate: string;
    gestationalWeeks: number;
    complication?: string | null;
    createdById: string;
    createdAt: string;
    postAbortionFPCounselled: boolean;
    postAbortionFPAccepted: boolean;
    deliveryRecords: DeliveryRecord[];
}

export interface ProformaInvoice {
    id: string;
    referenceNumber: string;
    patientId: string;
    attendanceId?: string | null;
    admissionId?: string | null;
    subtotal: number;
    discount: number;
    taxAmount: number;
    totalAmount: number;
    validityDays: number;
    expiresAt?: string | null;
    notes?: string | null;
    termsAndConditions?: string | null;
    createdById: string;
    approvedById?: string | null;
    approvedAt?: string | null;
    convertedToBillId?: string | null;
    createdAt: string;
    updatedAt: string;
    items: ProformaInvoiceItem[];
    corporateAccountId?: string | null;
}

export interface ProformaInvoiceItem {
    id: string;
    proformaInvoiceId: string;
    serviceCatalogId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatAmount: number;
    totalPrice: number;
    isInsuranceCovered: boolean;
    insuranceCoverage: number;
    patientResponsibility: number;
}

export interface CommunicationChannel {
    id: string;
    name: string;
    provider: string;
    apiKey?: string | null;
    apiSecret?: string | null;
    senderId?: string | null;
    isActive: boolean;
    settings?: any | null;
    createdAt: string;
    updatedAt: string;
    templates: CommunicationTemplate[];
    logs: CommunicationLog[];
}

export interface CommunicationTemplate {
    id: string;
    channelId: string;
    name: string;
    subject?: string | null;
    body: string;
    variables?: any | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    logs: CommunicationLog[];
}

export interface CommunicationLog {
    id: string;
    channelId: string;
    templateId?: string | null;
    recipient: string;
    message: string;
    sentAt?: string | null;
    deliveredAt?: string | null;
    readAt?: string | null;
    failedAt?: string | null;
    failureReason?: string | null;
    metadata?: any | null;
    cost?: number | null;
    providerMessageId?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface FamilyPlanningService {
    id: string;
    patientId: string;
    serviceDate: string;
    isNewAcceptor: boolean;
    counsellingGiven: boolean;
    informedConsent: boolean;
    sideEffects?: string | null;
    contraindications?: string | null;
    nextFollowUpDate?: string | null;
    followUpStatus?: string | null;
    isPostpartum: boolean;
    isPostAbortion: boolean;
    postpartumWeeks?: number | null;
    cypFactor: number;
    providedById: string;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CorporateAccount {
    id: string;
    companyName: string;
    registrationNumber?: string | null;
    taxId?: string | null;
    contactPerson: string;
    email: string;
    phone: string;
    address?: string | null;
    creditLimit: number;
    currentBalance: number;
    paymentTerms: number;
    discountPercentage: number;
    isActive: boolean;
    insuranceProviderId?: string | null;
    createdAt: string;
    updatedAt: string;
    bills: Bill[];
    employees: CorporateEmployee[];
    invoices: Invoice[];
    proformaInvoices: ProformaInvoice[];
    Attendance: Attendance[];
    InsuranceClaim: InsuranceClaim[];
}

export interface CorporateEmployee {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    otherNames?: string | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    email?: string | null;
    department?: string | null;
    position?: string | null;
    enrollmentDate: string;
    endDate?: string | null;
    isActive: boolean;
    accountId: string;
    createdAt: string;
    updatedAt: string;
    attendances: Attendance[];
}
// Common API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Common Form Data Types
export interface CreatePatientData {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  contact: string;
  emergencyContact?: string;
  address?: string;
  nhisNumber?: string;
}

export interface CreateAdmissionData {
  patientId: string;
  wardId: string;
  bedId: string;
  reasonForAdmission: string;
  diagnosis: string;
  admittingDoctor: string;
}

export interface CreateAttendanceData {
  patientId: string;
  attendanceType: string;
  paymentMode: string;
  attendingClinician: string;
  department: string;
}

export interface BillItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  serviceItemId?: string;
}

export interface CreateBillData {
  patientId: string;
  attendanceId: string;
  paymentMode: string;
  items: BillItemData[];
}

// NHIS Specific Types
export interface NHISClaimStatus {
  attendanceNumber: string;
  patientName: string;
  isClaimReady: boolean;
  validation: {
    canSubmit: boolean;
    errors: string[];
  };
  missingRequirements: {
    nhisNumber: boolean;
    primaryDiagnosis: boolean;
    servicesWithMissingCodes: string[];
  };
}

// Search and Filter Types
export interface PatientSearchFilters {
  search?: string;
  gender?: string;
  isActive?: boolean;
}

export interface AdmissionFilters {
  status?: string;
  wardId?: string;
  startDate?: string;
  endDate?: string;
}


