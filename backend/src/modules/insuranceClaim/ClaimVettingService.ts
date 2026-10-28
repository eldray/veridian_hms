/**
 * Claim vetting rules for Veridian HMS.
 *
 * These checks are deliberately advisory. They must never rewrite diagnoses,
 * prescriptions, investigation results, service dates or claim identifiers.
 * STG reference: Ghana Ministry of Health, Standard Treatment Guidelines,
 * 7th edition (2017), especially malaria (chapter entry at PDF p. 186).
 */
export type VettingSeverity = 'high' | 'medium' | 'low';
export type VettingIssue = {
  ruleId: string;
  severity: VettingSeverity;
  category: string;
  message: string;
  recommendation: string;
  evidence?: string;
  itemIndex?: number;
  suggestedIcd10SearchUrl?: string;
};

export interface VettingDiagnosis {
  name: string;
  icd10?: string | null;
}
export interface VettingItem {
  name: string;
  code?: string;
  date?: string | Date | null;
  quantity?: number | null;
  dose?: number | null;
  doseUnit?: string;
  unitStrength?: number | null;
  unitStrengthUnit?: string;
  frequency?: string | null;
  durationHours?: number | null;
  route?: string | null;
  formulation?: string | null;
  zoomFlag?: boolean | null;
}
export interface ClaimVettingInput {
  claimId?: string | null;
  ccc?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  memberNumber?: string | null;
  attendanceId?: string | null;
  claimDate?: string | Date | null;
  serviceDate?: string | Date | null;
  ageYears?: number | null;
  diagnoses?: VettingDiagnosis[];
  medicines?: VettingItem[];
  investigations?: VettingItem[];
  attendancesForPatient?: Array<{ claimId?: string; attendanceId?: string; serviceDate?: string | Date | null }>;
}
export interface VettingResult {
  claimId?: string | null;
  issues: VettingIssue[];
  sortedMedicines: VettingItem[];
  sortedInvestigations: VettingItem[];
}

const norm = (v: unknown) => String(v ?? '').normalize('NFKD').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const dateKey = (v: string | Date | null | undefined): number | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
const sameDay = (a: string | Date | null | undefined, b: string | Date | null | undefined) => {
  const x = dateKey(a), y = dateKey(b);
  return x !== null && y !== null && x === y;
};
const isMissingCode = (code?: string | null) => !code || !/^[A-Z][0-9A-Z](?:[0-9A-Z.]{0,5})$/i.test(code.trim());

function issue(ruleId: string, severity: VettingSeverity, category: string, message: string, recommendation: string, extra: Partial<VettingIssue> = {}): VettingIssue {
  return { ruleId, severity, category, message, recommendation, ...extra };
}

/**
 * A deliberately conservative first-pass vetter. A missing test or diagnosis is
 * a prompt to verify the record, not proof that care was inappropriate.
 */
export function vetClaim(c: ClaimVettingInput): VettingResult {
  const issues: VettingIssue[] = [];
  const dx = (c.diagnoses ?? []).map(d => norm(d.name));
  const allDx = dx.join(' | ');
  const meds = c.medicines ?? [];
  const inv = c.investigations ?? [];
  const invText = inv.map(i => norm(i.name + ' ' + i.code)).join(' | ');
  const add = (x: VettingIssue) => issues.push(x);

  if (c.ccc != null && /^0+$/.test(String(c.ccc).trim())) {
    add(issue('ccc-all-zero', 'high', 'DATA QUALITY', 'CCC is recorded as all zeroes (00000).', 'Verify the member CCC against the NHIS card/member verification system; do not submit until verified.'));
  }
  if (c.claimDate && c.serviceDate && !sameDay(c.claimDate, c.serviceDate)) {
    add(issue('claim-service-date-mismatch', 'high', 'DATA QUALITY', 'Claim date differs from the attendance/service date.', 'Compare the claim header, attendance, medicine and investigation dates; correct only after checking the source record.'));
  }
  if (c.diagnoses?.some(d => isMissingCode(d.icd10))) {
    for (const d of c.diagnoses.filter(x => isMissingCode(x.icd10))) {
      add(issue('missing-icd10', 'medium', 'UNCLEAR DIAGNOSIS', `Diagnosis “${d.name}” has no valid-looking ICD-10 code.`, 'Confirm the clinician-entered diagnosis and select the matching ICD-10 code. Do not infer a diagnosis solely to justify treatment.', { suggestedIcd10SearchUrl: 'https://icd.who.int/browse10/2019/en' }));
    }
  }

  // Ghana STG 2017, malaria section: definitive diagnosis should be supported
  // by blood film and/or RDT; the guideline recognises exceptions where prompt
  // testing is unavailable, especially suspected severe malaria and under-5s.
  if (/\bMALARIA\b|MALARIAL/.test(allDx) && !/MPS|MALARIA.*(RDT|RAPID)|RAPID.*MALARIA|BLOOD FILM|PARASIT/.test(invText)) {
    const exception = (c.ageYears != null && c.ageYears < 5) || /SEVERE MALARIA/.test(allDx);
    add(issue('malaria-test-not-found', exception ? 'medium' : 'high', 'TREATMENT TO DIAGNOSIS MISMATCH',
      'Malaria is diagnosed but no malaria microscopy/MPS or rapid diagnostic test is listed in the claim investigations.',
      'Check the clinical record/lab register for an MPS/blood film or malaria RDT. If testing was unavailable and an STG exception applied, document and review that context rather than fabricating an investigation.',
      { evidence: 'Ghana STG 2017, malaria section: laboratory confirmation by blood film and/or RDT is recommended; limited exceptions are described.' }));
  }

  if (/HELICOBACTER|H PYLORI|PYLORI/.test(allDx) || meds.some(m => /OMEPRAZOLE|CLARITHROMYCIN|AMOXICILLIN/.test(norm(m.name)) && /GASTRITIS|PEPTIC|DYSPEPSIA/.test(allDx))) {
    if (!/H PYLORI|HELICOBACTER|STOOL ANTIGEN|UREA BREATH|RAPID UREASE|GASTRIC BIOPSY/.test(invText)) {
      add(issue('h-pylori-test-not-found', 'medium', 'TREATMENT TO DIAGNOSIS MISMATCH', 'H. pylori-related diagnosis/treatment is present but no supporting H. pylori test is listed.', 'Verify whether a relevant test/result exists in the laboratory record. This is a documentation prompt, not a requirement to test every patient with dyspepsia.'));
    }
  }
  if (/IRON DEFICIENCY|IRON DEFICIENCY ANAEMIA|IRON DEFICIENCY ANEMIA/.test(allDx) && !/FBC|FULL BLOOD COUNT|HAEMOGLOBIN|HEMOGLOBIN|\bHB\b|CBC/.test(invText)) {
    add(issue('iron-deficiency-no-fbc-hb', 'medium', 'TREATMENT TO DIAGNOSIS MISMATCH', 'Iron-deficiency diagnosis has no FBC/CBC or haemoglobin investigation listed.', 'Check for FBC/CBC or Hb results and attach/document them where available; review clinical context and other evidence before changing the diagnosis.'));
  }
  if (/TYPHOID|ENTERIC FEVER/.test(allDx) && !/WIDAL|BLOOD CULTURE|STOOL CULTURE/.test(invText)) {
    add(issue('enteric-fever-test-not-found', 'low', 'TREATMENT TO DIAGNOSIS MISMATCH', 'Enteric fever is recorded without a related investigation in the claim.', 'Verify the investigations and clinical evidence. Do not treat Widal alone as definitive proof; use clinical judgement and local protocol.'));
  }
  if (/\bUTI\b|URINARY TRACT INFECTION|CYSTITIS/.test(allDx) && !/URINE|URINALYSIS|URINE R E|URINE CULTURE/.test(invText)) {
    add(issue('uti-investigation-not-found', 'low', 'TREATMENT TO DIAGNOSIS MISMATCH', 'UTI is recorded without urinalysis/urine microscopy or culture listed.', 'Check whether urine testing was performed or clinically indicated and document the source record.'));
  }

  const systemicAbx = meds.filter(m => /AMOXICILLIN|AMOXICLAV|CO AMOXICLAV|AZITHROMYCIN|CEFTRIAXONE|CEFUROXIME|CIPROFLOXACIN|CLARITHROMYCIN|CLINDAMYCIN|DOXYCYCLINE|FLUCLOXACILLIN|GENTAMICIN|METRONIDAZOLE/.test(norm(m.name)) && !/EYE|EAR|TOPICAL|CREAM|OINTMENT/.test(norm(m.formulation ?? m.route ?? '')));
  const bacterialDx = /PNEUMONIA|BRONCHOPNEUMONIA|BACTERIAL|TYPHOID|ENTERIC FEVER|\bUTI\b|URINARY TRACT INFECTION|PYELONEPHRITIS|CYSTITIS|OTITIS|TONSILLITIS|CELLULITIS|ABSCESS|IMPETIGO|SEPSIS|MENINGITIS|PID|GONORRHOEA|GONORRHEA|SYPHILIS|CHLAMYDIA|URETHRITIS|HELICOBACTER|H PYLORI|DYSENTERY|CHOLERA|MASTITIS|OSTEOMYELITIS|WOUND INFECTION/;
  if (systemicAbx.length && dx.length && !bacterialDx.test(allDx)) {
    add(issue('antibiotic-no-supporting-diagnosis', 'high', 'INAPPROPRIATE PRESCRIPTION',
      `${systemicAbx.map(m => m.name).join(', ')} listed without an obvious bacterial diagnosis; diagnoses recorded: ${c.diagnoses?.map(d => d.name).join(', ')}.`,
      'Review against the Ghana STG and the full clinical record. Remove/clarify only if the prescription is unsupported; if a bacterial condition was genuinely diagnosed, ensure the clinician records it accurately.'));
  }

  meds.forEach((m, i) => {
    if (m.quantity == null || !Number.isFinite(Number(m.quantity))) {
      add(issue('quantity-missing', 'high', 'OVERSUPPLY OF MEDICINES', `${m.name}: quantity is blank or not numeric.`, 'Check the original prescription and dispensing record, then enter the actual quantity.', { itemIndex: i }));
    } else if (Number(m.quantity) < 0) {
      add(issue('quantity-negative', 'high', 'DATA QUALITY', `${m.name}: quantity is negative.`, 'Correct against the source prescription/dispensing record.', { itemIndex: i }));
    } else if (Number(m.quantity) === 0) {
      add(issue('quantity-zero-review', 'medium', 'DATA QUALITY', `${m.name}: quantity is zero.`, 'Confirm whether the medicine was actually dispensed/billed. A zero may be valid for a cancelled or not-dispensed line; do not automatically replace it.', { itemIndex: i }));
    }
    if (/\bIV\b|INTRAVENOUS|INJECTION|\bINJ\b/.test(norm([m.name,m.formulation,m.route].join(' '))) && m.zoomFlag !== true) {
      add(issue('iv-injection-no-zoom-flag', 'medium', 'DATA QUALITY', `${m.name}: IV/injection entry is not marked as Zoom.`, 'Verify the applicable NHIS/Zoom requirement and source record, then mark it only if the claim genuinely qualifies.', { itemIndex: i }));
    }
    if (m.quantity != null && Number(m.quantity) > 0 && m.dose != null && m.unitStrength != null && m.unitStrength > 0 && m.durationHours != null && m.durationHours > 0) {
      const f = norm(m.frequency ?? '');
      const perDay = /QID|FOUR TIMES/.test(f) ? 4 : /TDS|TID|THREE TIMES/.test(f) ? 3 : /BD|BID|TWICE/.test(f) ? 2 : /OD|DAILY|ONCE/.test(f) ? 1 : null;
      const doseUnit = norm(m.doseUnit ?? '');
      const strengthUnit = norm(m.unitStrengthUnit ?? '');
      if (perDay && doseUnit && strengthUnit && doseUnit === strengthUnit) {
        const expected = Math.ceil((m.dose / m.unitStrength) * perDay * (m.durationHours / 24));
        if (Number(m.quantity) !== expected) {
          add(issue('quantity-vs-regimen-review', 'medium', 'OVERSUPPLY OF MEDICINES', `${m.name}: recorded quantity ${m.quantity}; dose/frequency/duration suggests about ${expected} unit(s) before pack-size/administration adjustments.`, 'For children, calculate from prescribed dose, product concentration/strength, route, frequency and duration, then apply the actual vial/ampoule/pack size. Verify against the prescription; this estimate must not auto-correct the claim.', { itemIndex: i }));
        }
      }
    }
  });

  // Claim-level duplicates: same patient and same service date, or multiple
  // attendances in the supplied period. These are possible duplicates only.
  if (c.attendancesForPatient?.length) {
    const possible = c.attendancesForPatient.filter(a => a.attendanceId !== c.attendanceId && sameDay(a.serviceDate, c.serviceDate));
    if (possible.length) {
      add(issue('same-patient-multiple-attendance', 'high', 'DUPLICATION OF CLAIMS', `Patient has ${possible.length} other attendance(s) on the same service date.`, 'Compare attendance IDs, service details and claim numbers. Keep separate claims when they represent legitimate distinct services; consolidate/correct only confirmed duplicates.'));
    }
  }

  return {
    claimId: c.claimId,
    issues,
    sortedMedicines: [...meds].sort((a,b) => (dateKey(a.date) ?? Number.MAX_SAFE_INTEGER) - (dateKey(b.date) ?? Number.MAX_SAFE_INTEGER)),
    sortedInvestigations: [...inv].sort((a,b) => (dateKey(a.date) ?? Number.MAX_SAFE_INTEGER) - (dateKey(b.date) ?? Number.MAX_SAFE_INTEGER)),
  };
}
