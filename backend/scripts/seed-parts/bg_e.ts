// ═══════════════════════════════════════════════════════════
// ATTENDANCES + EVERY SUB-ENTITY
// ═══════════════════════════════════════════════════════════
const sampleIndices = (total: number, count: number): number[] => {
  const chosen = new Set<number>();
  const target = Math.min(count, total);
  let guard = 0;
  while (chosen.size < target && guard++ < target * 20) chosen.add(rnd(total));
  return [...chosen];
};

const scenarioByKey = (key: string, fallback: ComplaintScenario): ComplaintScenario =>
  COMPLAINT_SCENARIOS.find((s) => s.key === key) || fallback;

export const generateAttendances = (patients: GeneratedPatient[]): GeneratedBundle => {
  const b: GeneratedBundle = {
    attendances: [], vitals: [], diagnoses: [], labs: [], scans: [], medications: [],
    procedures: [], admissions: [], nursingNotes: [], nursingTasks: [], wardCharges: [],
    bills: [], claims: [], claimBatches: [], waivers: [], preAuthorisations: [],
    eligibilityChecks: [], estimates: [], referrals: [], counterClients: [],
    antenatalBookings: [], ancVisits: [], deliveryRecords: [], newbornRecords: [], postnatalRecords: [],
  };

  const counters: NumberCounters = {
    attendance: VISIT_NUMBER_BLOCK,
    receipt: RECEIPT_NUMBER_BLOCK,
    referral: REFERRAL_NUMBER_BLOCK,
    admission: 0, estimate: 0, preAuth: 0, batch: 0,
    requisition: REQUISITION_NUMBER_BLOCK,
    transfer: REQUISITION_NUMBER_BLOCK,
    purchaseInvoice: REQUISITION_NUMBER_BLOCK,
  };
  const state = { activeAdmissions: 0 };
  const attendancesByFolder = new Map<string, string[]>();
  const billLinesByKey = new Map<string, GeneratedBillLinePlan[]>();

  const remember = (att: GeneratedAttendance): void => {
    if (!att.folderNumber) return;
    const list = attendancesByFolder.get(att.folderNumber) || [];
    if (list.length < 4) list.push(att.key);
    attendancesByFolder.set(att.folderNumber, list);
  };

  // ── Registered patients ──────────────────────────────────
  for (let i = 0; i < COUNTS.attendances; i++) {
    const patient = pick(patients);
    const scenario = pick(scenariosFor(patient));
    const att = emitEncounter(b, counters, patient, null, scenario, attendanceDate(), state);
    remember(att);
    const bill = b.bills[b.bills.length - 1];
    billLinesByKey.set(att.key, (bill as { lines?: GeneratedBillLinePlan[] }).lines || []);
  }

  // ── Walk-in counter clients ──────────────────────────────
  // Half of the counter tickets are clinical (a lab or a scan), the rest are a
  // pharmacy-only visit, so both the counter order screen and the dispensing
  // screen have real work on them.
  const diagnostics = scenarioByKey('walk_in_diagnostics', COMPLAINT_SCENARIOS[0]);
  for (let c = 0; c < COUNTS.counterClients; c++) {
    const key = `cc-${c + 1}`;
    const age = intBetween(3, 78);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    b.counterClients.push({
      key,
      name: `${chance(0.5) ? pick(MALE_FIRST) : pick(FEMALE_FIRST)} ${pick(SURNAMES)}`,
      ageYears: age,
      phone: `+23324${intBetween(1000000, 9999999)}`,
      createdAt: daysAgo(intBetween(0, 200)),
    });
    const scenario = c % 2 === 0 ? diagnostics : scenarioByKey('daycase_dressing', diagnostics);
    emitEncounter(b, counters, null, key, scenario, attendanceDate(), state);
  }

  // ── Maternity cascade ────────────────────────────────────
  // A booking, the reviews after it, the birth and the six-week check are one pregnancy.
  // Left to the encounter picker they are four unrelated rows, so the register fills with
  // births that have no antenatal history and mothers who never came back. Here the whole
  // cycle is dated from one last menstrual period, which is what lets the writers join it:
  // the booking's expected date of delivery is the day the baby comes.
  const bookingScenarios = ['anc_booking', 'anc_followup', 'anc_malaria_anaemia']
    .map((key) => scenarioByKey(key, diagnostics));
  const labourScenarios = ['labour', 'caesarean', 'postpartum_haemorrhage', 'obstructed_labour']
    .map((key) => scenarioByKey(key, diagnostics));
  const sixWeekReview = scenarioByKey('postnatal_review', diagnostics);

  const mothers = pickDistinct(
    patients.filter((p) => p.gender === 'female' && ageAt(p.dateOfBirth) >= 15 && ageAt(p.dateOfBirth) <= 49),
    COUNTS.maternityCases,
  );

  for (const mother of mothers) {
    // A quarter of them are pregnancies still under care, so the active antenatal register
    // has real bookings on it rather than only pregnancies that have ended.
    const ongoing = chance(0.25);
    // The booking anchors everything: a completed case is booked far enough back that the
    // birth and its six-week check are both in the past by the time the dates are added up.
    const bookingDate = daysAgo(ongoing ? intBetween(21, 160) : intBetween(260, 460));
    const lmp = addDays(bookingDate, -intBetween(75, 130));
    const dueDate = addDays(lmp, 280);

    const booking = emitEncounter(
      b, counters, mother, null, pick(bookingScenarios), bookingDate, state,
      { attendanceType: 'antenatal', lmp, dueDate: ongoing ? undefined : dueDate },
    );
    remember(booking);
    if (ongoing) continue;

    const labour = emitEncounter(
      b, counters, mother, null, pick(labourScenarios), dueDate, state, { attendanceType: 'delivery', lmp },
    );
    remember(labour);
    const review = emitEncounter(
      b, counters, mother, null, sixWeekReview, addDays(dueDate, 42), state, { attendanceType: 'postnatal', puerperiumDay: 42 },
    );
    remember(review);
  }

  for (const bill of b.bills) billLinesByKey.set(bill.attendanceKey, (bill as { lines?: GeneratedBillLinePlan[] }).lines || []);

  // ── WAIVERS ──────────────────────────────────────────────
  const billableBills = b.bills.map((bill, i) => ({ bill, i })).filter((x) => x.bill.status !== 'cancelled');
  for (const i of sampleIndices(billableBills.length, COUNTS.waivers)) {
    const bill = billableBills[i].bill;
    if (!bill.folderNumber) continue;
    const roll = rand();
    const status: GeneratedWaiver['status'] = roll < 0.6 ? 'approved' : roll < 0.85 ? 'pending' : 'rejected';
    const appliedAt = addDays(bill.billDate, intBetween(0, 3));
    b.waivers.push({
      billNumber: bill.billNumber,
      folderNumber: bill.folderNumber,
      waiverType: status === 'approved' && chance(0.5) ? 'indigent' : pick(['indigent', 'nhis_exempt', 'staff_discount', 'management_discretion', 'other']),
      reason: pick(WAIVER_REASONS),
      fraction: status === 'approved' ? between(0.3, 1) : between(0.2, 0.9),
      status,
      appliedAt,
      approvedAt: status === 'approved' ? addDays(appliedAt, intBetween(0, 4)) : null,
      rejectionReason: status === 'rejected' ? 'Not covered by the waiver policy; the balance remains payable by the patient.' : null,
      requestedBy: actor('records'),
      approvedBy: status === 'approved' ? actor('admin') : null,
    });
  }

  // ── PRE-AUTHORISATION ────────────────────────────────────
  const insured = b.attendances.map((att, i) => ({ att, i })).filter((x) => x.att.insuranceType && x.att.status !== 'cancelled');
  for (const i of sampleIndices(insured.length, COUNTS.preAuthorisations)) {
    const att = insured[i].att;
    const lines = (billLinesByKey.get(att.key) || []).filter((l) => l.kind !== 'consultation');
    if (!lines.length) continue;
    const chosen = lines.slice(0, Math.min(lines.length, intBetween(1, 3)));
    const roll = rand();
    const status: GeneratedPreAuth['status'] =
      roll < 0.45 ? 'approved' : roll < 0.6 ? 'partially_approved' : roll < 0.75 ? 'pending' : roll < 0.88 ? 'rejected' : 'expired';
    const requestedAt = addMinutes(att.dateTime, -intBetween(0, 120));
    const responded = status !== 'pending';
    b.preAuthorisations.push({
      referenceNumber: `PRE-${att.attendanceNumber}`,
      attendanceKey: att.key,
      folderNumber: att.folderNumber!,
      insuranceType: att.insuranceType!,
      status,
      requestedAt,
      responseReceivedAt: responded ? addHours(requestedAt, intBetween(2, 72)) : null,
      serviceKinds: chosen.map((l) => ({ kind: l.kind as GeneratedPreAuth['serviceKinds'][number]['kind'], index: l.index })),
      clinicalJustification: `${att.assessment} The requested service is clinically indicated and is on the benefit package for this membership category.`,
      authNumber: status === 'approved' || status === 'partially_approved' ? `AUTH-${att.attendanceNumber}` : null,
      authExpiry: status === 'approved' || status === 'partially_approved' ? addDays(requestedAt, 30) : null,
      rejectionReason: status === 'rejected' ? 'Service is outside the membership benefit package for the recorded diagnosis.' : null,
      requestedBy: actor('records'),
    });
  }

  // ── ESTIMATES (proforma invoices) ────────────────────────
  const estimatable = b.attendances.map((att, i) => ({ att, i })).filter((x) => {
    const lines = billLinesByKey.get(x.att.key) || [];
    return lines.some((l) => l.kind === 'procedure' || l.kind === 'lab' || l.kind === 'scan') && !b.estimates.some((e) => e.attendanceKey === x.att.key);
  });
  for (const i of sampleIndices(estimatable.length, COUNTS.estimates)) {
    const att = estimatable[i].att;
    if (b.estimates.some((e) => e.attendanceKey === att.key)) continue;
    const lines = (billLinesByKey.get(att.key) || []);
    const items = lines.length > 4 ? pickSomeDistinct(lines, 4, 2) : lines.slice(0, 3);
    if (!items.length) continue;
    const createdAt = att.dateTime;
    const validityDays = pick([7, 14, 30]);
    const roll = rand();
    const status: GeneratedEstimate['status'] =
      roll < 0.18 ? 'DRAFT' : roll < 0.42 ? 'SENT' : roll < 0.72 ? 'APPROVED'
      : roll < 0.82 ? 'REJECTED' : roll < 0.94 ? 'EXPIRED' : 'CONVERTED';
    const approved = status === 'APPROVED' || status === 'CONVERTED';
    b.estimates.push({
      referenceNumber: `PRO-${att.attendanceNumber}`,
      folderNumber: att.folderNumber,
      counterClientKey: att.counterClientKey,
      attendanceKey: att.key,
      admissionKey: b.admissions.find((a) => a.attendanceKey === att.key)?.key ?? null,
      status,
      createdAt,
      expiresAt: addDays(createdAt, validityDays),
      validityDays,
      notes: pick(ESTIMATE_NOTES),
      termsAndConditions: 'Estimate only; it is not a bill and does not guarantee admission or a bed. Charges are finalised on the day of service at the tariff published in force at that date.',
      items: items.map((l) => ({ kind: l.kind, index: l.index, quantity: 1 })),
      createdBy: actor('records'),
      approvedBy: approved || status === 'REJECTED' ? actor('admin') : null,
      approvedAt: approved || status === 'REJECTED' ? addDays(createdAt, intBetween(1, 5)) : null,
    });
  }

  // ── NHIS ELIGIBILITY CHECKS ──────────────────────────────
  const members = patients.filter((p) => p.nhisNumber);
  for (let n = 0; n < COUNTS.eligibilityChecks && members.length; n++) {
    const patient = pick(members);
    const expired = Boolean(patient.nhisExpiryDate && patient.nhisExpiryDate.getTime() < Date.now());
    const roll = rand();
    const status: GeneratedEligibilityCheck['status'] = expired
      ? (roll < 0.85 ? 'expired' : 'not_found')
      : roll < 0.85 ? 'active' : roll < 0.92 ? 'suspended' : roll < 0.97 ? 'not_found' : 'referred_facility_mismatch';
    const atts = attendancesByFolder.get(patient.folderNumber) || [];
    b.eligibilityChecks.push({
      folderNumber: patient.folderNumber,
      attendanceKey: atts.length ? pick(atts) : null,
      membershipId: patient.nhisNumber!,
      checkMethod: pick(['card_reader', 'nhia_portal', 'manual', 'offline_list']),
      status,
      at: daysAgo(intBetween(0, 240)),
      ccCode: status === 'active' ? padNumber(intBetween(10000, 19999)) : null,
      membershipExpiry: patient.nhisExpiryDate,
      checkedBy: actor('records'),
    });
  }

  // ── CLAIM BATCHES ────────────────────────────────────────
  const finalized = b.claims.filter((c) => c.status === 'finalized' && c.finalizedAt);
  const groups = new Map<string, GeneratedClaim[]>();
  for (const claim of finalized) {
    const d = claim.finalizedAt!;
    const key = `${claim.insuranceType}-${d.getFullYear()}-${d.getMonth() + 1}`;
    const list = groups.get(key) || [];
    list.push(claim);
    groups.set(key, list);
  }
  const orderedGroups = [...groups.entries()].sort((a, z) => {
    const da = a[1][0].finalizedAt!.getTime();
    const db = z[1][0].finalizedAt!.getTime();
    return db - da;
  }).slice(0, COUNTS.claimBatches);

  for (const [groupKey, claims] of orderedGroups) {
    const [insuranceType, yearText, monthText] = groupKey.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const status: GeneratedClaimBatch['status'] = claims.length > 3 && chance(0.7) ? 'finalized' : 'generated';
    const generatedAt = new Date(year, month - 1, Math.min(28, 20));
    const batch: GeneratedClaimBatch = {
      key: `batch-${b.claimBatches.length + 1}`,
      batchNumber: `BATCH-${padNumber(++counters.receipt)}`,
      insuranceType: insuranceType as GeneratedClaimBatch['insuranceType'],
      periodYear: year,
      periodMonth: month,
      status,
      generatedAt,
      finalizedAt: status === 'finalized' ? addDays(generatedAt, intBetween(1, 6)) : null,
      description: `${insuranceType.toUpperCase()} claim batch for ${new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' })} ${year}, ${claims.length} claims.`,
      createdBy: actor('accounts'),
      finalizedBy: status === 'finalized' ? actor('admin') : null,
    };
    b.claimBatches.push(batch);
    for (const claim of claims) claim.batchKey = batch.key;
  }

  return b;
};

// ═══════════════════════════════════════════════════════════
// APPOINTMENTS
//
// Follow-up dates written on the encounter become real appointments, so the
// appointment list and the clinical record agree with each other.
// ═══════════════════════════════════════════════════════════
export const generateAppointments = (
  patients: GeneratedPatient[],
  bundle: GeneratedBundle,
) => {
  const byFolder = new Map(patients.map((p) => [p.folderNumber, p]));
  const out: Array<{
    appointmentNumber: string;
    folderNumber: string;
    title: string;
    scheduledAt: Date;
    duration: number;
    status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
    type: string;
    notes: string;
    createdBy: Actor;
    clinician: Actor;
  }> = [];
  let counter = APPOINTMENT_NUMBER_BLOCK;

  for (const att of bundle.attendances) {
    if (!att.folderNumber || !att.followUpDate || !byFolder.has(att.folderNumber)) continue;
    if (out.length >= COUNTS.appointments) break;
    const past = att.followUpDate.getTime() < Date.now();
    out.push({
      appointmentNumber: padNumber(++counter),
      folderNumber: att.folderNumber,
      title: `${att.scenarioKey.replace(/_/g, ' ')} review`,
      scheduledAt: att.followUpDate,
      duration: pick([15, 20, 30, 45]),
      status: past ? pick(['completed', 'completed', 'no_show', 'cancelled']) : chance(0.5) ? 'confirmed' : 'scheduled',
      type: att.attendanceType === 'antenatal' ? 'antenatal' : att.attendanceType === 'postnatal' ? 'postnatal' : 'follow_up',
      notes: 'Booked from the follow-up date recorded when the previous encounter was finalised.',
      createdBy: actor('records'),
      clinician: att.provider,
    });
  }

  // Top the list up with routine bookings so the calendar is not empty.
  while (out.length < COUNTS.appointments) {
    const patient = pick(patients);
    const daysOffset = intBetween(-120, 21);
    out.push({
      appointmentNumber: padNumber(++counter),
      folderNumber: patient.folderNumber,
      title: pick(['Follow-up review', 'Chronic clinic review', 'Routine consultation', 'Result review', 'Vaccination']),
      scheduledAt: daysOffset >= 0 ? daysFromNow(daysOffset) : daysAgo(-daysOffset),
      duration: pick([15, 20, 30]),
      status: daysOffset < 0 ? pick(['completed', 'completed', 'no_show']) : daysOffset === 0 ? 'checked_in' : 'scheduled',
      type: pick(['consultation', 'follow_up', 'vaccination', 'lab_test', 'scan']),
      notes: 'Booked at the front desk.',
      createdBy: actor('records'),
      clinician: actor('doctor'),
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// FAMILY PLANNING
// ═══════════════════════════════════════════════════════════
export const generateFamilyPlanning = (patients: GeneratedPatient[]) => {
  const female = patients.filter((p) => p.gender === 'female');
  const pool = female.length ? female : patients;
  const out: any[] = [];
  for (let i = 0; i < COUNTS.familyPlanning; i++) {
    const patient = pick(pool);
    const method = pick([
      'pill_coc', 'pill_pop', 'injectable_dmpa', 'injectable_net_en', 'condom_male',
      'implant_implanon', 'implant_jadelle', 'iud_copper', 'iud_hormonal',
      'female_sterilization', 'lam', 'emergency_contraception',
    ]);
    const category =
      method === 'female_sterilization' ? 'permanent'
        : ['implant_implanon', 'implant_jadelle', 'iud_copper', 'iud_hormonal'].includes(method) ? 'modern_long_acting'
          : method === 'emergency_contraception' ? 'emergency'
            : method === 'lam' ? 'traditional'
              : 'modern_short_acting';
    out.push({
      patientFolderNumber: patient.folderNumber,
      serviceDate: daysAgo(intBetween(0, 365)),
      method,
      methodCategory: category,
      isNewAcceptor: chance(0.4),
      counsellingGiven: true,
      informedConsent: true,
      switchedFrom: chance(0.2) ? 'pill_coc' : null,
      reasonForSwitching: chance(0.2) ? 'Side effects on the previous method; changed after counselling.' : null,
      parity: intBetween(0, 5),
      cypFactor: +between(0.1, 3.0).toFixed(2),
      notes: 'Method provided after counselling on choice, side effects and return to fertility; next visit date explained.',
    });
  }
  return out;
};
