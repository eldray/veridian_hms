// ═══════════════════════════════════════════════════════════
// NARRATIVE FILL-INS
//
// The scenario carries the story; these pools carry the connective
// tissue (system-by-system review, dispensing advice, observations)
// so no two encounters read identically even when they share a
// presentation.
// ═══════════════════════════════════════════════════════════

const ROS_SYSTEMS: Array<{ system: string; findings: string[] }> = [
  { system: 'general', findings: ['Feverish and unwell', 'Afebrile and comfortable at rest', 'Weak, tired and off food', 'Conscious, oriented and cooperative'] },
  { system: 'cardiovascular', findings: ['No chest pain, no palpitations, no ankle swelling', 'Exertional breathlessness and orthopnoea', 'Chest tightness on effort, relieved by rest', 'Palpitations reported with the fever'] },
  { system: 'respiratory', findings: ['Cough with sputum, no breathlessness at rest', 'Dry cough, no wheeze', 'Short of breath on mild exertion', 'No cough, no wheeze, no haemoptysis'] },
  { system: 'gastrointestinal', findings: ['Nausea with two episodes of vomiting', 'Loose stools, no blood in stool', 'Epigastric pain related to meals', 'No abdominal pain, bowel action normal'] },
  { system: 'genitourinary', findings: ['Burning micturition and frequency', 'No dysuria, urine clear', 'Reduced urine output over the last day', 'No urinary symptoms'] },
  { system: 'musculoskeletal', findings: ['Generalised body ache and joint pain', 'Pain over the injured limb, unable to bear weight', 'Lower back pain radiating down the leg', 'No joint swelling or stiffness'] },
  { system: 'neurological', findings: ['Headache with neck stiffness', 'No weakness, no sensory loss, no seizure', 'Dizzy on standing, no loss of consciousness', 'Blurred vision and difficulty concentrating'] },
  { system: 'skin', findings: ['Itchy rash over the trunk', 'Wound clean, no discharge', 'No rash, no ulcer', 'Scattered healing lesions in different stages'] },
  { system: 'haematologic', findings: ['No bleeding from gums or nose, no easy bruising', 'Passing dark urine, no bleeding', 'Easy bruising and prolonged bleeding from cuts', 'No bleeding tendency'] },
];

const ROUTE_ADVICE: Record<string, string> = {
  oral: 'Swallow the tablets whole with water after food unless told otherwise.',
  IV: 'The intravenous dose is given on the ward by nursing staff and recorded on the administration chart.',
  IM: 'The injection is given by nursing staff into the upper outer quadrant of the gluteal muscle.',
  SC: 'Inject subcutaneously into the abdomen, rotating the site with each dose.',
  Topical: 'Apply a thin layer to the affected area, wash the hands afterwards and do not cover the area tightly.',
  Inhalation: 'Shake the inhaler, exhale away from the mouthpiece and rinse the mouth after the steroid dose.',
  Nebulisation: 'Give by nebuliser through a face mask while the patient is sitting upright.',
};

const DISPENSING_ADVICE = [
  'Complete the full course even if you feel better after a day or two.',
  'Take with food to reduce stomach upset.',
  'Do not share this medicine with anyone else.',
  'Return if the symptoms come back after finishing the course.',
];

const CONSULT_ADVICE_POOL = [
  'Reviewed in the clinic, treated on the day and discharged home with a written instruction sheet.',
  'Assessed at triage, examined by the medical officer on duty and managed conservatively.',
  'Seen jointly with the consultant on the ward round; plan agreed with the patient and family.',
  'Discussed the findings, the expected course and the warning signs with the patient before discharge.',
];

const LAB_NOTES_POOL = [
  'Sample collected and received in good condition; result released after internal quality check.',
  'Processed on arrival; the requesting clinician was called with the result.',
  'Repeated once for a haemolysed specimen; the second sample was satisfactory.',
  'Result discussed verbally with the medical officer on duty before release.',
];

const SCAN_NOTES_POOL = [
  'Images obtained with the patient in the position described; no prior study available for comparison.',
  'Comparison made with the previous study held in the record.',
  'Findings dictated and transcribed the same session; verified by the reporting radiologist.',
  'Preliminary findings telephoned to the requesting clinician for immediate management.',
];

const MAR_VARIANCE_REASONS = [
  'Given fifteen minutes late on the round; no change in observations.',
  'Held for a low blood pressure reading and re-charted at the next scheduled dose.',
  'Refused by the patient at the time; offered again and taken after the next meal.',
];

const pickSomeDistinct = <T>(pool: T[], max: number, min = 1): T[] => {
  const n = Math.min(pool.length, Math.max(min, intBetween(min, max)));
  return pickDistinct(pool, n);
};

const randomOf = <T>(pool: T[], fallback: T): T => (pool.length ? pick(pool) : fallback);

/**
 * A seeded prescription must survive the live allergy conflict check, so the
 * generator never offers a therapeutic group whose stems collide with an
 * allergen recorded on that patient.
 */
const groupConflicts = (groupKey: string, allergies: GeneratedAllergy[]): boolean => {
  const preset = DRUG_GROUPS[groupKey];
  if (!preset) return false;
  const stems = (preset.nameStems || []).map((s) => s.toLowerCase());
  return allergies.some((a) => {
    const allergen = a.allergen.toLowerCase();
    return stems.some((stem) => allergen.includes(stem) || stem.includes(allergen));
  });
};

const usableDrugGroups = (scenario: ComplaintScenario, allergies: GeneratedAllergy[]): string[] => {
  const allowed = scenario.drugGroups.filter((g) => !groupConflicts(g, allergies));
  if (allowed.length) return allowed;
  const safeAlternatives = Object.keys(DRUG_GROUPS).filter(
    (g) => g !== 'general' && !groupConflicts(g, allergies),
  );
  return safeAlternatives.length ? [pick(safeAlternatives)] : ['general'];
};

/**
 * The body system a diagnosis belongs to, from the ICD-10 chapter letter. A review of
 * systems that does not cover the system the patient was actually diagnosed in reads as a
 * template, so the involved systems are always asked about.
 */
const SYSTEMS_FOR_ICD_LETTER: Record<string, string[]> = {
  A: ['general'], B: ['general'], C: ['general', 'haematologic'], D: ['general', 'haematologic'],
  E: ['general', 'gastrointestinal'], F: ['general', 'neurological'],
  G: ['neurological'], H: ['general', 'skin'], I: ['cardiovascular'], J: ['respiratory'],
  K: ['gastrointestinal', 'genitourinary'], L: ['skin', 'musculoskeletal'], M: ['musculoskeletal'],
  N: ['genitourinary'], O: ['general', 'genitourinary'], Q: ['general'], R: ['general'],
  S: ['musculoskeletal', 'skin'], T: ['general', 'skin'], Z: ['general'],
};

/**
 * Which body systems the recorded story actually touches. A review of systems that leaves the
 * system the patient was diagnosed in as "not assessed" reads as a template, so the involved
 * systems are read out of the complaint, the history and the examination text - the ICD chapter
 * only adds the system the coding implies, which the free text does not always spell out.
 */
const ROS_KEYWORDS: Array<{ system: string; pattern: RegExp }> = [
  { system: 'neurological', pattern: /headache|neck stiff|stiff neck|seizure|fit|confus|drows|unconscious|vertigo|gidd|weakness|numb|tingling|tremor|strok|kernig|brudzinski|photophobia|papilloedema|slurred/i },
  { system: 'respiratory', pattern: /cough|whee|breath|asthma|sputum|haemoptysis|pleur|chest pain|pneumonia|expectorat|cyanos|desatur/i },
  { system: 'cardiovascular', pattern: /palpitat|orthopnoea|ankle swoll|tightness|oedema|cardiac|angina|hypertens|murmur|syncope on exertion|junction/i },
  { system: 'gastrointestinal', pattern: /vomit|nausea|diarrhoe|diarrhea|abdomin|epigastr|dyspeps|hæatemesis|blood in stool|constip|inguinal|umbilic|appendic|periton|bowel/i },
  { system: 'genitourinary', pattern: /urina|urine|mictur|dysuri|frequen|loin|vaginal|pre-eclam|eclamps|prolaps|menstrual|testic|penile|urethra|cathet/i },
  { system: 'musculoskeletal', pattern: /joint|back ache|back pain|limb|fractur|injur|swelling over|sprain|deformity|unable to bear weight|muscle|bone|rachi/i },
  { system: 'skin', pattern: /rash|skin|wound|ulcer|itch|pruritu|cellulitis|lesion|petechi|purpura|swelling and redness|burn|scar|jaundice/i },
  { system: 'haematologic', pattern: /bleed|bruis|pale|pallor|anaemi|anemia|transfusion|sickle|petechial/i },
  { system: 'general', pattern: /fever|pyrex|weak|tired|off food|weight loss|night sweat|rigour|chill|malais|unwell|appetite|vomiting and fever/i },
];

const KNOWN_ROS_SYSTEMS = ROS_SYSTEMS.map((entry) => entry.system);

const involvedSystemsFor = (scenario: ComplaintScenario, profile: VitalsProfile): string[] => {
  const text = `${scenario.complaints} ${scenario.history} ${scenario.examination}`;
  const fromText = ROS_KEYWORDS.filter((k) => k.pattern.test(text)).map((k) => k.system);
  const first = (scenario.icdCodes[0] ?? '').charAt(0).toUpperCase();
  const fromCode = SYSTEMS_FOR_ICD_LETTER[first] ?? [];
  const fromProfile = profile === 'septic' || profile === 'febrile' ? ['general', 'haematologic']
    : profile === 'trauma' ? ['musculoskeletal', 'skin']
      : profile === 'respiratory' ? ['respiratory']
        : profile === 'cardiac' || profile === 'hypertensive' ? ['cardiovascular']
          : [];
  // Two to five systems is what a focused history actually covers; the list is ordered so
  // the story-driven systems survive the cap. Names the review does not carry are dropped
  // here rather than later, so the count of covered systems is what the caller asked for.
  return [...new Set([...fromText, ...fromProfile, ...fromCode])]
    .filter((system) => KNOWN_ROS_SYSTEMS.includes(system))
    .slice(0, 5);
};

const buildReviewOfSystems = (scenario: ComplaintScenario, profile: VitalsProfile) => {
  const involved = involvedSystemsFor(scenario, profile);
  const rest = ROS_SYSTEMS.filter((entry) => !involved.includes(entry.system));
  // Six systems covered and the rest recorded as not asked about is what a real focused
  // history looks like; asking about everything reads as a checklist. pickDistinct takes an
  // exact number, where pickSomeDistinct takes a range - the total has to be the total.
  const chosen = [
    ...ROS_SYSTEMS.filter((entry) => involved.includes(entry.system)),
    ...pickDistinct(rest, Math.max(1, Math.min(rest.length, 6 - involved.length))),
  ];
  const out: Record<string, string> = {};
  for (const entry of chosen) {
    out[entry.system] = pick(entry.findings);
  }
  // A system the clinician did not ask about is recorded as not assessed,
  // never as a negative finding; the review screen distinguishes the two.
  for (const entry of ROS_SYSTEMS) {
    if (!out[entry.system]) out[entry.system] = 'Not assessed at this attendance';
  }
  return out;
};

/**
 * The examination block is written from the same "involved systems" list as the review of
 * systems, so a meningitis record that reported neck rigidity in the free text does not then
 * go on to record a normal neurological examination in the structured part next to it.
 */
const EXAM_LINES: Record<string, { key: string; involved: string; negative: string }> = {
  cardiovascular: {
    key: 'cardiovascular',
    involved: 'Heart sounds S1 and S2 dual, JVP not elevated, no ankle oedema; the chest is painful on palpation over the precordium',
    negative: 'Heart sounds S1 and S2 dual, no murmur, JVP not elevated, no ankle oedema',
  },
  respiratory: {
    key: 'respiratory',
    involved: 'Chest resonant with reduced air entry over the affected zone, crepitations present, respiratory rate raised',
    negative: 'Chest clear, equal air entry bilaterally, no crepitation, no wheeze',
  },
  gastrointestinal: {
    key: 'abdomen',
    involved: 'Abdomen soft, tender over the relevant region, no guarding, bowel sounds present, no organomegaly felt',
    negative: 'Abdomen soft, non-tender, no organomegaly, bowel sounds normal',
  },
  genitourinary: {
    key: 'genitourinary',
    involved: 'Loins tender on percussion, suprapubic discomfort, external genitalia normal, no catheter in situ',
    negative: 'No loin tenderness, suprapubic region soft and non-tender, no genital abnormality',
  },
  neurological: {
    key: 'neurological',
    involved: 'Conscious but drowsy, neck rigid with a positive Kernig sign, no focal weakness, cranial nerves intact, fundi normal',
    negative: 'Conscious and oriented, cranial nerves intact, no focal neurology, neck supple, fundi normal',
  },
  musculoskeletal: {
    key: 'local',
    involved: 'Swelling, tenderness and deformity over the affected limb, painful on movement, distally neurovascularly intact',
    negative: 'Joints mobile and non-tender, no deformity, no swelling, distally intact',
  },
  skin: {
    key: 'skin',
    involved: 'Rash present in the described distribution, warm and blanching on pressure, no ulceration, cannula site clean',
    negative: 'Skin intact and warm, no rash, no ulcer, cannula sites clean and dry',
  },
};

const buildStructuredExam = (
  vitals: GeneratedVitals | null,
  scenario: ComplaintScenario,
  profile: VitalsProfile,
) => {
  const involved = involvedSystemsFor(scenario, profile);
  const examined: Record<string, string> = {};
  for (const [system, line] of Object.entries(EXAM_LINES)) {
    examined[line.key] = involved.includes(system) ? line.involved : line.negative;
  }
  examined.general = profile === 'septic'
    ? 'Drowsy, pale and peripherally shut down, capillary refill delayed'
    : 'Conscious, oriented, afebrile to well hydrated, no distress at rest';
  return {
    general: {
      consciousness: profile === 'septic' ? 'Drowsy but rousable' : 'Conscious and oriented',
      hydration: profile === 'septic' ? 'Dehydrated, skin pinch slow' : 'Adequate',
      pallor: profile === 'febrile' && chance(0.4) ? 'Mildly pale' : 'Not pale',
      jaundice: profile === 'metabolic' && chance(0.2) ? 'Icteric' : 'Not icteric',
      temperatureC: vitals?.temperature ?? null,
      pulse: vitals?.pulse ?? null,
      bloodPressure: vitals ? `${vitals.systolic}/${vitals.diastolic}` : null,
      respiratoryRate: vitals?.respiration ?? null,
      oxygenSaturation: vitals?.spo2 ?? null,
      painScore: vitals?.painScore ?? null,
    },
    examinedSystems: examined,
    // Named examinations that were offered and declined, or simply not indicated - the
    // clinical record shows these as not done rather than as negative findings.
    notExamined: ['Fundoscopy', 'Rectal examination'],
  };
};

// ═══════════════════════════════════════════════════════════
// COUNTERS for the families the live CounterService mints.
// Bills, admissions and claims are derived from the visit number, so they never
// get their own block. Receipts and claim batches share the receipt block because
// one counter mints both.
// ═══════════════════════════════════════════════════════════
/**
 * Estimate (PROFORMA) reference numbers are minted from the visit counter, so
 * CounterService reads ProformaInvoice.referenceNumber when it works out where that
 * counter resumes. Seeding them above the visit block would push every future visit
 * number past six digits; below it they are simply a number the counter never sees.
 */
export const ESTIMATE_NUMBER_BLOCK = FOLDER_NUMBER_BLOCK;
/** CounterService starts every independent sequence at 10000 and pads to five digits. */
const COUNTER_BASE = 10000;
export const REQUISITION_NUMBER_BLOCK = COUNTER_BASE;
export const TRANSFER_NUMBER_BLOCK = COUNTER_BASE;
export const PURCHASE_INVOICE_PREFIX = `PIN-${new Date().getFullYear()}-`;
export const WARD_TYPE_HINTS = ['general', 'maternity', 'icu', 'pediatric', 'surgical'] as const;

interface NumberCounters {
  attendance: number;
  receipt: number;
  referral: number;
  admission: number;
  estimate: number;
  preAuth: number;
  batch: number;
  requisition: number;
  transfer: number;
  purchaseInvoice: number;
}

// ═══════════════════════════════════════════════════════════
// SUB-ENTITY EMITTERS
// ═══════════════════════════════════════════════════════════

const wardTypeFor = (scenario: ComplaintScenario, patient: GeneratedPatient, profile: VitalsProfile): string => {
  const age = ageAt(patient.dateOfBirth);
  if (scenario.specialization === 'Obstetrics') return 'maternity';
  if (age < 12 || scenario.specialization === 'Pediatrics') return 'pediatric';
  if (profile === 'septic' || (scenario.admitChance >= 0.9 && scenario.losDays[1] >= 5)) return 'icu';
  if (scenario.specialization === 'Surgery' || profile === 'trauma' || profile === 'surgical') return 'surgical';
  return 'general';
};

const emitLabs = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  profile: VitalsProfile,
  elapsedMinutes: number,
  isLive: boolean,
): number => {
  const codes = scenario.labCodes.length
    ? pickSomeDistinct(scenario.labCodes, Math.min(3, scenario.labCodes.length), 1).slice()
    : chance(COUNTS.labTestsPerAttendance)
      ? pickSomeDistinct(FALLBACK_LAB_CODES, 2, 1)
      : [];
  if (profile === 'septic' || profile === 'metabolic') { if (codes.length < 2) codes.push(FALLBACK_LAB_CODES[0]); }

  for (const testCode of codes) {
    const roll = rand();
    let status: GeneratedLab['status'];
    if (isLive) status = roll < 0.45 ? 'requested' : roll < 0.75 ? 'in_progress' : 'completed';
    else if (roll < 0.84) status = 'completed';
    else if (roll < 0.90) status = 'in_progress';
    else if (roll < 0.96) status = 'requested';
    else status = 'cancelled';

    const priority: GeneratedLab['priority'] =
      profile === 'septic' || profile === 'trauma' ? (chance(0.6) ? 'stat' : 'urgent')
      : att.visitCategory === 'emergency' ? (chance(0.4) ? 'urgent' : 'routine')
      : chance(0.18) ? 'urgent' : 'routine';

    const wantTurnaround = priority === 'stat' ? intBetween(20, 55)
      : priority === 'urgent' ? intBetween(45, 180)
      : intBetween(90, 720);
    // Never claim a result that has not happened yet: a same-day encounter can
    // only be completed inside the time that has actually elapsed.
    const canComplete = status === 'completed' && (wantTurnaround <= elapsedMinutes);
    const completedAt = canComplete ? addMinutes(att.dateTime, wantTurnaround) : null;

    b.labs.push({
      attendanceKey: att.key,
      testCode,
      status: canComplete ? 'completed' : status === 'completed' ? 'in_progress' : status,
      requestedAt: att.dateTime,
      completedAt,
      turnaroundMinutes: completedAt ? wantTurnaround : null,
      priority,
      abnormalBias: profile === 'routine' ? between(0.05, 0.4) : between(0.45, 0.95),
      criticalValue: completedAt !== null && chance(priority === 'stat' ? 0.18 : 0.06),
      requester: actor('doctor'),
      performer: completedAt || status === 'in_progress' ? actor('lab_tech') : null,
      verifier: completedAt ? actor(chance(0.85) ? 'lab_tech' : 'admin') : null,
      notes: completedAt ? pick(LAB_NOTES_POOL) : null,
    });
  }
  return b.labs.filter((l) => l.attendanceKey === att.key).length;
};

const emitScans = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  elapsedMinutes: number,
  isLive: boolean,
): number => {
  if (!scenario.scanCodes.length) return 0;
  const codes = pickSomeDistinct(scenario.scanCodes, Math.min(2, scenario.scanCodes.length), 1);

  for (const scanCode of codes) {
    const roll = rand();
    let status: GeneratedScan['status'];
    if (isLive) status = roll < 0.5 ? 'requested' : roll < 0.8 ? 'in_progress' : 'completed';
    else if (roll < 0.82) status = 'completed';
    else if (roll < 0.88) status = 'in_progress';
    else if (roll < 0.96) status = 'requested';
    else status = 'cancelled';

    const priority: GeneratedScan['priority'] = att.visitCategory === 'emergency' && chance(0.5) ? 'urgent' : 'routine';
    const wantTurnaround = priority === 'urgent' ? intBetween(35, 150) : intBetween(120, 1440);
    const canComplete = status === 'completed' && (wantTurnaround <= elapsedMinutes);
    const completedAt = canComplete ? addMinutes(att.dateTime, wantTurnaround) : null;
    const normal = chance(0.45);

    b.scans.push({
      attendanceKey: att.key,
      scanCode,
      status: canComplete ? 'completed' : status === 'completed' ? 'in_progress' : status,
      indication: scenario.complaints,
      requestedAt: att.dateTime,
      completedAt,
      turnaroundMinutes: completedAt ? wantTurnaround : null,
      priority,
      narrativeIndex: rnd(20),
      normal,
      requester: actor('doctor'),
      performer: completedAt || status === 'in_progress' ? actor('sonographer') : null,
      verifier: completedAt ? actor(chance(0.8) ? 'sonographer' : 'doctor') : null,
    });
  }
  return b.scans.filter((s) => s.attendanceKey === att.key).length;
};

const emitMedications = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  patient: GeneratedPatient | null,
  allergies: GeneratedAllergy[],
  isInpatient: boolean,
  losDays: number,
): number => {
  if (att.status === 'cancelled') return 0;
  const groups = usableDrugGroups(scenario, allergies);
  const count = isInpatient
    ? Math.min(groups.length, Math.max(2, intBetween(2, 4)))
    : Math.min(groups.length, Math.max(1, intBetween(1, groups.length)));

  const startAt = att.dateTime;
  const chosen = groups.slice(0, count);
  for (const groupKey of chosen) {
    const preset = DRUG_GROUPS[groupKey] || DRUG_GROUPS[COUNTS ? FALLBACK_DRUG_GROUP : 'general'];
    const frequencyMeta = FREQUENCY_LABELS.find((f) => f.label.toUpperCase() === preset.frequency.toUpperCase());
    const dosesPerDay = preset.dosesPerDay || frequencyMeta?.dosesPerDay || 1;
    const durationDays = isInpatient
      ? Math.max(1, Math.min(preset.durationDays[0] ?? 3, Math.max(1, losDays)))
      : randomOf(preset.durationDays, 5);
    const dosage = randomOf(preset.dosage, '1 tablet');
    const route = randomOf(preset.route, 'oral');
    const quantity = Math.max(1, dosesPerDay * durationDays);
    const instructions = [
      `${dosage} ${preset.frequency} by ${route.toLowerCase()} for ${durationDays} day(s).`,
      ROUTE_ADVICE[route] || ROUTE_ADVICE.oral,
      pick(DISPENSING_ADVICE),
    ].join(' ');

    // Dispensing evidence only exists when the pharmacy actually issued the item,
    // and only inpatient prescriptions go on the drug chart (MAR).
    const dispenseRate = isInpatient ? COUNTS.dispenseRateInpatient : COUNTS.dispenseRateOutpatient;
    const dispensed = chance(dispenseRate);
    const dispensedAt = dispensed ? addMinutes(startAt, intBetween(8, 90)) : null;
    const charted = isInpatient && dispensed;
    const totalDoses = Math.max(1, dosesPerDay * durationDays);
    const elapsedDays = Math.max(0, Math.min(durationDays, (Date.now() - startAt.getTime()) / 86_400_000));
    const dosesAdministered = charted
      ? Math.max(att.status === 'discharged' || att.status === 'completed' ? totalDoses : 0,
          Math.min(totalDoses, Math.round(elapsedDays * dosesPerDay)))
      : 0;

    b.medications.push({
      attendanceKey: att.key,
      drugGroup: groupKey,
      // Only used if the writer finds no stocked item in the group; it is never
      // presented as a real product unless the database actually holds it.
      nameFallback: 'Paracetamol 500mg',
      dosage,
      frequency: preset.frequency,
      dosesPerDay,
      durationDays,
      duration: `${durationDays} day${durationDays === 1 ? '' : 's'}`,
      quantity,
      route,
      instructions,
      // A cancelled encounter never reaches this function, so the chart states below are
      // the only ones a live prescription can be in.
      status: charted && dosesAdministered >= totalDoses ? 'administered'
        : dispensed ? 'dispensed'
        : 'prescribed',
      prescribedAt: startAt,
      dispensedAt,
      administeredAt: charted && dosesAdministered > 0 ? addMinutes(startAt, intBetween(10, 60)) : null,
      isInpatient: charted,
      dosesAdministered,
      prescriber: actor('doctor'),
      dispenser: dispensed ? actor('pharmacist') : null,
      nurse: charted ? actor(isInpatient && scenario.specialization === 'Obstetrics' ? 'midwife' : 'nurse') : null,
    });
  }
  return b.medications.filter((m) => m.attendanceKey === att.key).length;
};
