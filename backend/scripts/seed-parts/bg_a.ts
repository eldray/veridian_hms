// ═══════════════════════════════════════════════════════════
// ENCOUNTER PLANS — built from COMPLAINT_SCENARIOS
//
// The generator stays free of the database: it emits codes and
// therapeutic-group keys, never names it invented. testSeed.ts
// resolves every code against a real LabTestTemplate / ScanTemplate /
// ProcedureTemplate / Diagnosis / StockItem row and drops the plan
// when the reference data has no such row, so a link can never be
// left dangling and a drug name on a prescription is always a drug
// that is actually stocked.
// ═══════════════════════════════════════════════════════════

/** Roles that appear as the actor on a seeded row, matched to a seeded username by the writer. */
export type ActorRole =
  | 'doctor' | 'nurse' | 'midwife' | 'lab_tech' | 'sonographer'
  | 'pharmacist' | 'accounts' | 'records' | 'admin' | 'hr_officer';

/** Which seeded user performed an action. The salt rotates the choice inside the role pool. */
export interface Actor {
  role: ActorRole;
  salt: number;
}

const actor = (role: ActorRole, salt = iSalt()): Actor => ({ role, salt });
let _saltCounter = 0;
const iSalt = () => (_saltCounter++ % 97);

export interface GeneratedVitals {
  attendanceKey: string;
  folderNumber: string;
  temperature: number;
  pulse: number;
  respiration: number;
  spo2: number;
  systolic: number;
  diastolic: number;
  weight: number;
  height: number;
  bmi: number | null;
  muac: number | null;
  painScore: number;
  notes: string;
  recordedAt: Date;
  recorder: Actor;
}

export interface GeneratedDiagnosisLink {
  attendanceKey: string;
  icdCode: string;
  diagnosisType: 'primary' | 'additional' | 'provisional';
  presentOnAdmission: 'Y' | 'N' | 'U';
  date: Date;
}

export interface GeneratedLab {
  attendanceKey: string;
  testCode: string;
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  requestedAt: Date;
  completedAt: Date | null;
  turnaroundMinutes: number | null;
  priority: 'routine' | 'urgent' | 'stat';
  /** 0..1 — how far the seed should push values outside the reference range. */
  abnormalBias: number;
  criticalValue: boolean;
  requester: Actor;
  performer: Actor | null;
  verifier: Actor | null;
  notes: string | null;
}

export interface GeneratedScan {
  attendanceKey: string;
  scanCode: string;
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  indication: string;
  requestedAt: Date;
  completedAt: Date | null;
  turnaroundMinutes: number | null;
  priority: 'routine' | 'urgent';
  /** Index into SCAN_REPORT_NARRATIVES for the template category, chosen by the writer. */
  narrativeIndex: number;
  normal: boolean;
  requester: Actor;
  performer: Actor | null;
  verifier: Actor | null;
}

export interface GeneratedMedication {
  attendanceKey: string;
  drugGroup: string;
  nameFallback: string;
  dosage: string;
  frequency: string;
  dosesPerDay: number;
  durationDays: number;
  duration: string;
  quantity: number;
  route: string;
  instructions: string;
  status: 'prescribed' | 'dispensed' | 'administered' | 'cancelled';
  prescribedAt: Date;
  dispensedAt: Date | null;
  administeredAt: Date | null;
  isInpatient: boolean;
  /** Doses already given when the seed materialises the MAR chart. */
  dosesAdministered: number;
  prescriber: Actor;
  dispenser: Actor | null;
  nurse: Actor | null;
}

export interface GeneratedProcedure {
  attendanceKey: string;
  procedureCode: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: Date;
  performedAt: Date | null;
  notes: string | null;
  complications: string;
  outcome: string;
  durationMinutes: number;
  bloodLossMl: number | null;
  anesthesiaNotes: string | null;
  intraOperativeNotes: string | null;
  postOperativeNotes: string | null;
  clinicalRecord: Record<string, unknown>;
  surgeon: Actor | null;
  assistant: Actor | null;
  creator: Actor;
}

export interface GeneratedAdmission {
  key: string;
  attendanceKey: string;
  admissionNumber: string;
  folderNumber: string;
  admissionType: 'elective' | 'emergency' | 'transfer' | 'detention_observation';
  admissionSource: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency';
  admissionDate: Date;
  lengthOfStayDays: number;
  dischargeDate: Date | null;
  dischargeStatus: 'home' | 'transfer' | 'expired' | 'against_medical_advice' | null;
  isActive: boolean;
  /** Ward the writer should find a bed in. */
  wardHint: string;
  cancelled: boolean;
  primaryDiagnosisIcd: string | null;
}

export interface GeneratedNursingNote {
  attendanceKey: string;
  admissionKey: string;
  folderNumber: string;
  templateIndex: number;
  noteType: string;
  shift: 'morning' | 'afternoon' | 'night';
  isFlagged: boolean;
  at: Date;
  author: Actor;
}

export interface GeneratedNursingTask {
  attendanceKey: string;
  admissionKey: string;
  folderNumber: string;
  templateIndex: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  scheduledAt: Date;
  completedAt: Date | null;
  notes: string | null;
  author: Actor;
  completer: Actor | null;
}

export interface GeneratedWardCharge {
  attendanceKey: string;
  admissionKey: string;
  folderNumber: string;
  chargeDate: Date;
  wardHint: string;
}

export interface GeneratedBillLinePlan {
  /** What the writer must price: a service already created on this encounter. */
  kind: 'consultation' | 'lab' | 'scan' | 'procedure' | 'medication' | 'ward' | 'consumable';
  /** Index into the encounter array of that kind (labs[0], medications[2], ...). */
  index: number;
  quantity: number;
}

export interface GeneratedBill {
  billNumber: string;
  attendanceKey: string;
  admissionKey: string | null;
  folderNumber: string | null;
  counterClientKey: string | null;
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  billDate: Date;
  dueDate: Date | null;
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled';
  /** Fraction of the patient share already paid; the writer computes the money. */
  paymentFraction: number;
  discountFraction: number;
  paymentMethod: 'cash' | 'mobile_money' | 'card' | 'bank_transfer' | 'cheque';
  receiptReference: string;
  graValidated: boolean;
}

export interface GeneratedClaimItemPlan {
  kind: 'diagnosis' | 'investigation' | 'medicine' | 'procedure' | 'service' | 'gdrg';
  index: number;
}

export interface GeneratedClaim {
  key: string;
  claimNumber: string;
  billNumber: string;
  attendanceKey: string;
  folderNumber: string | null;
  counterClientKey: string | null;
  status: 'draft' | 'finalized';
  createdAt: Date;
  finalizedAt: Date | null;
  insuranceType: 'nhis' | 'private' | 'corporate';
  typeOfService: string;
  typeOfAttendance: string;
  serviceOutcome: string;
  /** Rejection/tracking narrative for the tracking events below. */
  notes: string | null;
  createdBy: Actor;
  finalizedBy: Actor | null;
  trackingEvents: Array<{
    eventType: string;
    status: string | null;
    at: Date;
    amount: number | null;
    payerReference: string | null;
    paymentReference: string | null;
    paymentMethod: string | null;
    notes: string | null;
    recorder: Actor;
  }>;
  batchKey: string | null;
}

export interface GeneratedClaimBatch {
  key: string;
  batchNumber: string;
  insuranceType: 'nhis' | 'private' | 'corporate';
  periodYear: number;
  periodMonth: number;
  status: 'generated' | 'finalized';
  generatedAt: Date;
  finalizedAt: Date | null;
  description: string;
  createdBy: Actor;
  finalizedBy: Actor | null;
}

export interface GeneratedWaiver {
  billNumber: string;
  folderNumber: string;
  waiverType: 'indigent' | 'nhis_exempt' | 'staff_discount' | 'management_discretion' | 'other';
  reason: string;
  /** Fraction of the bill total the waiver covers. */
  fraction: number;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
  approvedAt: Date | null;
  rejectionReason: string | null;
  requestedBy: Actor;
  approvedBy: Actor | null;
}

export interface GeneratedPreAuth {
  referenceNumber: string;
  attendanceKey: string;
  folderNumber: string;
  insuranceType: 'nhis' | 'private' | 'corporate';
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'cancelled' | 'expired';
  requestedAt: Date;
  responseReceivedAt: Date | null;
  /** Codes the request covers; the writer prices them from ServicePricing. */
  serviceKinds: Array<{ kind: 'consultation' | 'lab' | 'scan' | 'procedure' | 'medication'; index: number }>;
  clinicalJustification: string;
  authNumber: string | null;
  authExpiry: Date | null;
  rejectionReason: string | null;
  requestedBy: Actor;
}

export interface GeneratedEligibilityCheck {
  folderNumber: string;
  attendanceKey: string | null;
  membershipId: string;
  checkMethod: 'card_reader' | 'nhia_portal' | 'offline_list' | 'manual';
  status: 'active' | 'expired' | 'suspended' | 'not_found' | 'referred_facility_mismatch';
  at: Date;
  ccCode: string | null;
  membershipExpiry: Date | null;
  checkedBy: Actor;
}

export interface GeneratedEstimate {
  referenceNumber: string;
  folderNumber: string | null;
  counterClientKey: string | null;
  attendanceKey: string | null;
  admissionKey: string | null;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'EXPIRED';
  createdAt: Date;
  expiresAt: Date;
  validityDays: number;
  notes: string;
  termsAndConditions: string;
  items: GeneratedBillLinePlan[];
  createdBy: Actor;
  approvedBy: Actor | null;
  approvedAt: Date | null;
}

export interface GeneratedReferral {
  referralNumber: string;
  attendanceKey: string;
  folderNumber: string;
  referralType: 'outgoing' | 'incoming';
  referralReason: string;
  referralNotes: string;
  urgency: 'routine' | 'urgent' | 'stat';
  referredToFacility: string | null;
  referredToDoctor: string | null;
  referredToDepartment: string | null;
  referredFromFacility: string | null;
  referredFromDoctor: string | null;
  referralDate: Date;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  outcomeNotes: string | null;
  completedAt: Date | null;
  structuredForm: Record<string, unknown>;
  createdBy: Actor;
}

export interface GeneratedCounterClient {
  key: string;
  name: string;
  ageYears: number;
  phone: string;
  createdAt: Date;
}

export interface GeneratedAttendance {
  key: string;
  attendanceNumber: string;
  folderNumber: string | null;
  counterClientKey: string | null;
  scenarioKey: string;
  attendanceType: string;
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  dateTime: Date;
  status: 'pending' | 'admitted' | 'discharged' | 'completed' | 'referred' | 'absconded' | 'cancelled';
  encounterCategory: 'opd' | 'ipd' | 'daycase';
  visitCategory: 'general' | 'specialist' | 'emergency' | 'inpatient';
  serviceCategory: 'opd' | 'ipd' | 'diagnostics' | 'pharmacy' | 'other';
  patientClassification: 'NEW' | 'OLD';
  diagnosisClassification: 'NEW_DIAGNOSIS' | 'OLD_DIAGNOSIS';
  complaints: string;
  historyPresentingComplaint: string;
  reviewOfSystems: Record<string, string>;
  physicalExamination: string;
  physicalExamStructured: Record<string, unknown>;
  assessment: string;
  treatmentPlan: string;
  clinicalOutcome: 'improved' | 'stable' | 'unchanged' | 'deteriorated' | 'deceased';
  allergyReviewStatus: 'not_reviewed' | 'no_known_allergies' | 'allergies_present';
  allergyReviewNotes: string | null;
  allergyReviewedAt: Date | null;
  medicalNotes: string;
  clinicalNotes: Record<string, unknown>;
  followUpDate: Date | null;
  finalizedAt: Date | null;
  insuranceType: 'nhis' | 'private' | 'corporate' | null;
  provider: Actor;
  providerSpecialization: string;
  allergyReviewer: Actor | null;
  finalizer: Actor | null;
  referralToDepartment: string | null;
}

export interface GeneratedBundle {
  attendances: GeneratedAttendance[];
  vitals: GeneratedVitals[];
  diagnoses: GeneratedDiagnosisLink[];
  labs: GeneratedLab[];
  scans: GeneratedScan[];
  medications: GeneratedMedication[];
  procedures: GeneratedProcedure[];
  admissions: GeneratedAdmission[];
  nursingNotes: GeneratedNursingNote[];
  nursingTasks: GeneratedNursingTask[];
  wardCharges: GeneratedWardCharge[];
  bills: GeneratedBill[];
  claims: GeneratedClaim[];
  claimBatches: GeneratedClaimBatch[];
  waivers: GeneratedWaiver[];
  preAuthorisations: GeneratedPreAuth[];
  eligibilityChecks: GeneratedEligibilityCheck[];
  estimates: GeneratedEstimate[];
  referrals: GeneratedReferral[];
  counterClients: GeneratedCounterClient[];
  antenatalBookings: any[];
  ancVisits: any[];
  deliveryRecords: any[];
  newbornRecords: any[];
  postnatalRecords: any[];
}

// ═══════════════════════════════════════════════════════════
// Encounter date distribution
//
// Attendances used to be spread uniformly over a year, which left every
// "today", "this month" and "last 72 hours" screen empty. This skews the
// same volume towards the present so the live worklists have work on them.
// ═══════════════════════════════════════════════════════════
const attendanceDate = (): Date => {
  const r = rand();
  const daysBack =
    r < 0.04 ? 0 :
    r < 0.26 ? intBetween(1, 7) :
    r < 0.52 ? intBetween(8, 30) :
    r < 0.76 ? intBetween(31, 90) :
    r < 0.93 ? intBetween(91, 200) :
    intBetween(201, 365);
  // daysAgo() picks a working hour, and for today that hour can still be ahead of the
  // clock. An encounter in the future makes every downstream timestamp nonsense - a
  // result released before it was asked for, a discharge that has not happened - so the
  // last few hours of today are simply not available to a visit that started today.
  const at = daysAgo(daysBack);
  const latest = Date.now() - 60 * 60_000;
  return at.getTime() > latest ? new Date(latest - intBetween(0, 90) * 60_000) : at;
};

const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);
const addHours = (d: Date, hours: number) => new Date(d.getTime() + hours * 3_600_000);
const addDays = (d: Date, days: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
};

/** Encounters that are booked theatre lists rather than already-closed operations. */
const DAYCASE_SCENARIOS = new Set(['daycase_dressing', 'cataract', 'tonsil_surgery', 'soft_tissue_lump', 'family_planning']);

const ageAt = (dob: Date, at: Date = new Date()): number =>
  Math.max(0, Math.floor((at.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)));

/**
 * A scenario only applies to a patient who could present with it: sex, the age window,
 * and (for the outpatient-only stories) not being already committed elsewhere.
 */
const scenarioFits = (s: (typeof COMPLAINT_SCENARIOS)[number], patient: GeneratedPatient): boolean => {
  const age = ageAt(patient.dateOfBirth);
  if (age < s.minAge || age > s.maxAge) return false;
  if (s.gender === 'female' && patient.gender !== 'female') return false;
  if (s.gender === 'male' && patient.gender !== 'male') return false;
  return true;
};

const scenariosFor = (patient: GeneratedPatient) => {
  const fits = COMPLAINT_SCENARIOS.filter((s) => scenarioFits(s, patient));
  return fits.length ? fits : COMPLAINT_SCENARIOS.filter((s) => s.key === 'walk_in_diagnostics');
};

// ═══════════════════════════════════════════════════════════
// VITALS — profile derived from the presenting diagnosis, so a
// malaria encounter runs warm and a hypertensive one runs high.
// ═══════════════════════════════════════════════════════════
type VitalsProfile =
  | 'routine' | 'febrile' | 'septic' | 'hypertensive' | 'cardiac'
  | 'respiratory' | 'metabolic' | 'surgical' | 'trauma' | 'obstetric' | 'paediatric' | 'neonatal';

const vitalsProfileFor = (scenario: (typeof COMPLAINT_SCENARIOS)[number], patient: GeneratedPatient, at: Date): VitalsProfile => {
  const age = ageAt(patient.dateOfBirth, at);
  if (age < 1) return 'neonatal';
  if (age < 5) return 'paediatric';
  if (/^O[0-9]|^Z3[49]|^Z03\.5|^N98/.test(scenario.icdCodes[0] ?? '')) return 'obstetric';
  if (scenario.key === 'cholera' || scenario.key === 'diabetic_ketoacidosis') return 'septic';
  if (/^A0|^B[0-5]|^J1[0-8]|^L0[0-3]|^N1[02]|^N39/.test(scenario.icdCodes[0] ?? '')) return 'febrile';
  if (/^I10|^I1[1-5]|^G89|^G47/.test(scenario.icdCodes[0] ?? '')) return 'hypertensive';
  if (/^I2[0-5]|^I4[6-8]|^I50/.test(scenario.icdCodes[0] ?? '')) return 'cardiac';
  if (/^J4|^J44|^J45|^J96/.test(scenario.icdCodes[0] ?? '')) return 'respiratory';
  if (/^E1[01]|^E147|^N18|^M10/.test(scenario.icdCodes[0] ?? '')) return 'metabolic';
  if (/^[KS]/.test(scenario.icdCodes[0] ?? '')) return scenario.icdCodes[0]!.startsWith('S') ? 'trauma' : 'surgical';
  if (/^[D-Z]/.test(scenario.icdCodes[0] ?? '')) return 'routine';
  return scenario.admitChance > 0.5 ? 'surgical' : 'routine';
};

/** Ranges per profile: [tempC, pulse, respiration, spo2, systolic, diastolic, pain]. */
const VITALS_RANGES: Record<VitalsProfile, [number, number, number, number, number, number, number]> = {
  routine:     [36.4, 76,  16, 98, 118, 74,  0],
  febrile:     [38.4, 102, 22, 96, 116, 74,  3],
  septic:      [39.2, 124, 28, 92, 92,  56,  5],
  hypertensive:[36.6, 80,  17, 98, 168, 98,  1],
  cardiac:     [36.7, 94,  22, 94, 152, 92,  4],
  respiratory: [37.3, 98,  30, 90, 124, 78,  2],
  metabolic:   [36.9, 88,  20, 97, 136, 84,  1],
  surgical:    [37.6, 96,  20, 96, 126, 78,  6],
  trauma:      [37.1, 108, 22, 95, 112, 68,  7],
  obstetric:   [37.0, 90,  19, 98, 122, 78,  3],
  paediatric:  [37.8, 116, 28, 97, 100, 64,  2],
  neonatal:    [37.2, 138, 42, 97, 72,  44,  1],
};

const buildVitals = (profile: VitalsProfile, patient: GeneratedPatient, at: Date, attendanceKey: string): GeneratedVitals => {
  const [t, p, r, s, sys, dia, pain] = VITALS_RANGES[profile];
  const jitter = (mid: number, spread: number) => mid + between(-spread, spread);
  const age = ageAt(patient.dateOfBirth, at);
  const temperature = +jitter(t, 0.4).toFixed(1);
  const systolic = Math.round(jitter(sys, sys * 0.06));
  const diastolic = Math.round(jitter(dia, dia * 0.08));
  const weight = age < 1 ? +between(2.5, 4.5).toFixed(1)
    : age < 5 ? +between(9, 18).toFixed(1)
    : age < 12 ? +between(18, 40).toFixed(1)
    : +(patient.gender === 'female' ? between(46, 88) : between(52, 104)).toFixed(1);
  const height = age < 1 ? +between(46, 54).toFixed(1)
    : age < 5 ? +between(70, 110).toFixed(1)
    : age < 12 ? +between(110, 150).toFixed(1)
    : +between(150, 186).toFixed(1);
  const bmi = weight > 0 && height > 50 ? +(weight / Math.pow(height / 100, 2)).toFixed(1) : null;
  return {
    attendanceKey,
    folderNumber: patient.folderNumber,
    temperature,
    pulse: Math.round(jitter(p, p * 0.07)),
    respiration: Math.max(8, Math.round(jitter(r, r * 0.12))),
    spo2: Math.min(100, Math.max(85, Math.round(jitter(s, 2)))),
    systolic,
    diastolic,
    weight,
    height,
    bmi,
    muac: age >= 6 && age < 60 ? +between(11.5, 23.5).toFixed(1) : null,
    painScore: Math.max(0, Math.min(10, Math.round(jitter(pain, 1)))),
    notes: profile === 'routine'
      ? 'Observations taken on arrival and tolerated well.'
      : `Observations on arrival consistent with the presentation; repeated on the reassessment and charted.`,
    recordedAt: at,
    recorder: actor(profile === 'neonatal' || profile === 'obstetric' ? 'midwife' : 'nurse'),
  };
};
