// src/components/referral/referralForm.ts
// The single definition of the two-way referral form, shared by the entry panels, the
// detail view and the printable form. The key lists mirror PART_I_KEYS / PART_II_KEYS in
// backend/src/modules/referral/ReferralTypes.ts — the server drops any key it does not know.

export type ReferralPartI = {
  clientName: string;
  age: string;
  sex: string;
  parity: string;
  clinicName: string;
  dateOfReferral: string;
  generalCondition: string;
  patientComplaints: string;
  clinicalFindings: string;
  diagnosis: string;
  actionsTaken: string;
  reasonForReferral: string;
  requestedAction: string;
  transportNeeds: string;
  contactBackName: string;
  contactBackPhone: string;
  referrerName: string;
  referrerTitle: string;
};

export type ReferralPartII = {
  institutionName: string;
  dateReceived: string;
  findings: string;
  actionsTaken: string;
  recommendations: string;
  patientDisposition: string;
  dateReported: string;
  receiverName: string;
  receiverTitle: string;
};

export type PartKey = keyof ReferralPartI | keyof ReferralPartII;

export interface FieldSpec {
  key: string;
  label: string;
  /** Full-width fields carry prose; half-width ones carry identifiers. */
  wide?: boolean;
  required?: boolean;
  rows?: number;
  input?: 'text' | 'textarea' | 'date' | 'select';
  options?: string[];
  placeholder?: string;
  hint?: string;
}

export interface FieldSection {
  title: string;
  fields: FieldSpec[];
}

const today = () => new Date().toISOString().slice(0, 10);

/** Part I — "Referral by the health worker", the section the sending facility completes. */
export const PART_I_SECTIONS: FieldSection[] = [
  {
    title: 'Patient',
    fields: [
      { key: 'clientName', label: 'Client name', required: true },
      { key: 'age', label: 'Age', placeholder: 'e.g. 34 years' },
      { key: 'sex', label: 'Sex', input: 'select', options: ['', 'Male', 'Female'] },
      { key: 'parity', label: 'Parity', placeholder: 'e.g. G3 P2+0', hint: 'Obstetric referrals only' },
    ],
  },
  {
    title: 'Referring unit',
    fields: [
      { key: 'clinicName', label: 'Clinic / unit', placeholder: 'e.g. Antenatal Clinic' },
      { key: 'dateOfReferral', label: 'Date of referral', input: 'date' },
    ],
  },
  {
    title: 'Clinical summary',
    fields: [
      { key: 'generalCondition', label: 'General condition', input: 'textarea', wide: true, rows: 2, required: true, placeholder: 'Consciousness, hydration, vital signs…' },
      { key: 'patientComplaints', label: 'Patient complaints', input: 'textarea', wide: true, rows: 2, required: true, placeholder: 'What the patient presented with, and for how long' },
      { key: 'clinicalFindings', label: 'Examination & investigation findings', input: 'textarea', wide: true, rows: 2, placeholder: 'What you found on examination and on the results you have' },
      { key: 'diagnosis', label: 'Provisional diagnosis', input: 'textarea', wide: true, rows: 2 },
      { key: 'actionsTaken', label: 'Action taken / treatment given', input: 'textarea', wide: true, rows: 2, required: true, placeholder: 'Drugs given with doses, fluids, stabilisation before transfer' },
    ],
  },
  {
    title: 'Referral request',
    fields: [
      { key: 'reasonForReferral', label: 'Reason for referral', input: 'textarea', wide: true, rows: 2, required: true },
      { key: 'requestedAction', label: 'What is requested of the receiving facility', input: 'textarea', wide: true, rows: 2, placeholder: 'e.g. Specialist review and exclusion of pre-eclampsia' },
      { key: 'transportNeeds', label: 'Transport & special precautions', input: 'textarea', wide: true, rows: 1, placeholder: 'Ambulance, oxygen, positioning, infection precautions' },
    ],
  },
  {
    title: 'Contact back',
    fields: [
      { key: 'contactBackName', label: 'Focal point', placeholder: 'Who the receiver should call' },
      { key: 'contactBackPhone', label: 'Contact number' },
    ],
  },
  {
    title: 'Signed by',
    fields: [
      { key: 'referrerName', label: 'Name', required: true },
      { key: 'referrerTitle', label: 'Title / designation', placeholder: 'e.g. Midwife, Medical Officer' },
    ],
  },
];

/** Part II — "Report back by the receiving health facility". */
export const PART_II_SECTIONS: FieldSection[] = [
  {
    title: 'Receiving facility',
    fields: [
      { key: 'institutionName', label: 'Institution', required: true },
      { key: 'dateReceived', label: 'Date received', input: 'date', required: true },
    ],
  },
  {
    title: 'Report back',
    fields: [
      { key: 'findings', label: 'Findings on assessment', input: 'textarea', wide: true, rows: 2, required: true },
      { key: 'actionsTaken', label: 'Action taken', input: 'textarea', wide: true, rows: 2 },
      { key: 'recommendations', label: 'Recommendations for follow-up', input: 'textarea', wide: true, rows: 2, placeholder: 'What the referring facility should continue doing' },
      { key: 'patientDisposition', label: 'Patient disposition', input: 'select', options: ['', 'Discharged', 'Admitted', 'Referred back to referring facility', 'Referred onward', 'Expired'] },
    ],
  },
  {
    title: 'Signed by',
    fields: [
      { key: 'receiverName', label: 'Name', required: true },
      { key: 'receiverTitle', label: 'Title / designation' },
      { key: 'dateReported', label: 'Date reported', input: 'date' },
    ],
  },
];

export function emptyPartI(overrides: Partial<ReferralPartI> = {}): ReferralPartI {
  return {
    clientName: '', age: '', sex: '', parity: '',
    clinicName: '', dateOfReferral: today(),
    generalCondition: '', patientComplaints: '', clinicalFindings: '', diagnosis: '',
    actionsTaken: '', reasonForReferral: '', requestedAction: '', transportNeeds: '',
    contactBackName: '', contactBackPhone: '',
    referrerName: '', referrerTitle: '',
    ...overrides,
  };
}

export function emptyPartII(overrides: Partial<ReferralPartII> = {}): ReferralPartII {
  return {
    institutionName: '', dateReceived: today(),
    findings: '', actionsTaken: '', recommendations: '', patientDisposition: '',
    dateReported: today(),
    receiverName: '', receiverTitle: '',
    ...overrides,
  };
}

/** A stored structured form is arbitrary JSON, so read it defensively and fill the gaps. */
export function readPartI(raw: unknown): ReferralPartI {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const part = emptyPartI();
  for (const key of Object.keys(part) as (keyof ReferralPartI)[]) {
    const value = source[key];
    if (typeof value === 'string' || typeof value === 'number') part[key] = String(value);
  }
  return part;
}

export function readPartII(raw: unknown): ReferralPartII {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const part = emptyPartII();
  for (const key of Object.keys(part) as (keyof ReferralPartII)[]) {
    const value = source[key];
    if (typeof value === 'string' || typeof value === 'number') part[key] = String(value);
  }
  return part;
}

/** A part counts as filled once any of its declared fields carries text. */
export function partHasContent(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  return Object.values(raw as Record<string, unknown>).some(v => String(v ?? '').trim() !== '');
}

/** Missing required answers, as the labels the form can show the user. */
export function missingRequired(sections: FieldSection[], values: Record<string, string>): string[] {
  const labels: string[] = [];
  for (const section of sections) {
    for (const field of section.fields) {
      if (field.required && !(values[field.key] ?? '').trim()) labels.push(field.label);
    }
  }
  return labels;
}
