const emitProcedures = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  isInpatient: boolean,
  isLive: boolean,
): number => {
  if (!scenario.procedureCodes.length) return 0;
  const wantsProcedure = isInpatient || DAYCASE_SCENARIOS.has(scenario.key) || att.attendanceType === 'surgery';
  if (!wantsProcedure || !chance(COUNTS.proceduresPerSurgicalAttendance)) return 0;

  const codes = pickSomeDistinct(scenario.procedureCodes, 2, 1);
  for (const procedureCode of codes) {
    // A same-day emergency encounter is still on the theatre list; an old one is finished.
    const scheduledAt = isLive && att.status === 'pending'
      ? daysFromNow(intBetween(1, 4))
      : addMinutes(att.dateTime, intBetween(60, 720));
    const completed = !(isLive && att.status === 'pending') && chance(0.93);
    const inProgress = !completed && isLive;
    const performedAt = completed ? new Date(Math.min(Date.now(), addMinutes(scheduledAt, intBetween(45, 240)).getTime())) : null;

    b.procedures.push({
      attendanceKey: att.key,
      procedureCode,
      status: att.status === 'cancelled' ? 'cancelled' : completed ? 'completed' : inProgress ? 'in_progress' : 'scheduled',
      scheduledDate: scheduledAt,
      performedAt,
      notes: completed || inProgress ? pick(INTRAOPERATIVE_TEMPLATES) : 'Booked on the theatre list; pre-assessment clinic cleared the patient.',
      complications: pick(PROCEDURE_COMPLICATIONS),
      outcome: completed ? pick(PROCEDURE_OUTCOMES) : 'Pending',
      durationMinutes: intBetween(25, 210),
      bloodLossMl: completed ? intBetween(20, 600) : null,
      anesthesiaNotes: completed || inProgress ? pick(ANAESTHESIA_PLANS) : 'Anaesthetic pre-assessment pending; airway assessment not yet documented.',
      intraOperativeNotes: completed ? pick(INTRAOPERATIVE_TEMPLATES) : null,
      postOperativeNotes: completed ? pick(POSTOPERATIVE_TEMPLATES) : null,
      clinicalRecord: {
        form: 'theatre_and_anaesthesia_record',
        preAssessment: {
          asaGrade: pick(['I', 'II', 'II', 'III']),
          airway: pick(['Mallampati I', 'Mallampati II', 'Mallampati III']),
          fastingStatus: 'Confirmed with the patient before induction.',
          consent: 'Written informed consent for the procedure and anaesthesia held in the notes.',
        },
       WHO: {
          signIn: 'Patient identity, site and procedure confirmed with the patient awake.',
          timeOut: 'Team introduction, allergies, anticipated blood loss and imaging displayed before incision.',
          signOut: 'Instrument, sponge and needle counts declared complete; specimen labelled and handed over.',
        },
        anaesthesiaPlan: completed || inProgress ? pick(ANAESTHESIA_PLANS) : null,
        intraoperative: completed ? pick(INTRAOPERATIVE_TEMPLATES) : null,
        postoperative: completed ? pick(POSTOPERATIVE_TEMPLATES) : null,
        complications: pick(PROCEDURE_COMPLICATIONS),
        outcome: completed ? pick(PROCEDURE_OUTCOMES) : 'Pending',
        bloodLossMl: completed ? intBetween(20, 600) : null,
        handover: 'Patient handed over to the ward team with the operative findings, fluid balance and analgesic plan.',
      },
      surgeon: completed || inProgress ? actor('doctor') : null,
      assistant: completed ? actor('doctor') : null,
      creator: actor('records'),
    });
  }
  return b.procedures.filter((p) => p.attendanceKey === att.key).length;
};

const emitAdmission = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  patient: GeneratedPatient,
  counters: NumberCounters,
  daysBack: number,
  wardHint: string,
): GeneratedAdmission | null => {
  const shouldAdmit = att.encounterCategory === 'ipd' || att.encounterCategory === 'daycase';
  if (!shouldAdmit) return null;

  const losDays = att.encounterCategory === 'daycase' ? 1 : intBetween(scenario.losDays[0], scenario.losDays[1]);
  // A stay that started within the last few days is still open; anything older has closed.
  // The writer caps genuinely active admissions to the beds it actually has free.
  const isActive = att.encounterCategory === 'ipd' && daysBack < losDays && att.status === 'admitted';
  const admissionDate = att.dateTime;
  const dischargeDate = isActive ? null : addDays(admissionDate, Math.max(1, losDays));
  const outcome = scenario.outcome;
  const dischargeStatus: GeneratedAdmission['dischargeStatus'] = isActive
    ? null
    : outcome === 'deceased' ? 'expired'
    : chance(0.05) ? 'against_medical_advice'
    : chance(0.12) ? 'transfer'
    : 'home';

  const admission: GeneratedAdmission = {
    key: `adm-${b.admissions.length + 1}`,
    attendanceKey: att.key,
    admissionNumber: att.attendanceNumber,
    folderNumber: patient.folderNumber,
    admissionType: scenario.admissionType,
    admissionSource: att.visitCategory === 'emergency'
      ? 'emergency'
      : scenario.admissionType === 'transfer' ? 'another_facility'
      : scenario.admissionType === 'elective' ? chance(0.5) ? 'referral' : 'opd'
      : chance(0.6) ? 'opd' : 'home',
    admissionDate,
    lengthOfStayDays: Math.max(1, losDays),
    dischargeDate,
    dischargeStatus,
    isActive,
    wardHint,
    cancelled: att.status === 'cancelled',
    primaryDiagnosisIcd: scenario.icdCodes[0] ?? null,
  };
  b.admissions.push(admission);

  const nursingAuthor = wardHint === 'maternity' ? 'midwife' : 'nurse';
  const noteCount = isActive || losDays > 0 ? COUNTS.nursingNotesPerAdmission : 0;
  const lastDay = isActive ? Math.max(0, Math.min(losDays, Math.floor((Date.now() - admissionDate.getTime()) / 86_400_000))) : losDays;
  for (let n = 0; n < noteCount; n++) {
    const dayOffset = lastDay > 0 ? Math.min(lastDay, Math.round(((n + 1) / noteCount) * lastDay)) : 0;
    const at = addMinutes(addDays(admissionDate, dayOffset), intBetween(0, 11 * 60));
    if (at.getTime() > Date.now()) continue;
    b.nursingNotes.push({
      attendanceKey: att.key,
      admissionKey: admission.key,
      folderNumber: patient.folderNumber,
      templateIndex: n === 0 ? 0 : n === noteCount - 1 && !isActive ? 4 : rnd(NURSING_NOTE_TEMPLATES.length),
      noteType: '',
      shift: intBetween(0, 2) === 0 ? 'morning' : intBetween(0, 2) === 1 ? 'afternoon' : 'night',
      isFlagged: false,
      at,
      author: actor(nursingAuthor as ActorRole),
    });
  }
  // Correct the note type from the template the index points at, so the writer
  // never has to guess which narrative it is filling in.
  for (const note of b.nursingNotes.filter((x) => x.admissionKey === admission.key && !x.noteType)) {
    const template = NURSING_NOTE_TEMPLATES[note.templateIndex];
    note.noteType = template?.type || 'general';
    note.isFlagged = Boolean(template?.flagged);
  }

  const taskCount = COUNTS.nursingTasksPerAdmission;
  for (let t = 0; t < taskCount; t++) {
    const scheduledAt = addMinutes(admissionDate, intBetween(30, Math.max(60, lastDay * 24 * 60)));
    const done = isActive ? chance(0.55) : chance(0.85);
    const overdue = !isActive && !done && chance(0.4);
    b.nursingTasks.push({
      attendanceKey: att.key,
      admissionKey: admission.key,
      folderNumber: patient.folderNumber,
      templateIndex: rnd(NURSING_TASK_TEMPLATES.length),
      status: done ? 'completed' : overdue ? 'skipped' : isActive ? (chance(0.3) ? 'in_progress' : 'pending') : 'pending',
      scheduledAt,
      completedAt: done ? addMinutes(scheduledAt, intBetween(5, 120)) : null,
      notes: done ? 'Completed as charted and handed over at the bedside.' : null,
      author: actor(nursingAuthor as ActorRole),
      completer: done ? actor(nursingAuthor as ActorRole) : null,
    });
  }

  // One bed charge per night actually occupied, never beyond today.
  const chargeDays = isActive ? Math.max(1, lastDay) : Math.max(1, losDays);
  for (let d = 0; d < chargeDays; d++) {
    const chargeDate = addDays(admissionDate, d);
    if (chargeDate.getTime() > Date.now()) break;
    b.wardCharges.push({
      attendanceKey: att.key,
      admissionKey: admission.key,
      folderNumber: patient.folderNumber,
      chargeDate,
      wardHint,
    });
  }
  void counters;
  return admission;
};

const emitBill = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  patient: GeneratedPatient | null,
  counterClientKey: string | null,
  made: { labs: number; scans: number; meds: number; procs: number; wardDays: number; consultation: boolean },
  admission: GeneratedAdmission | null,
  counters: NumberCounters,
): GeneratedBill => {
  const billNumber = `BILL-${att.attendanceNumber}`;
  const roll = rand();
  const settled = att.status === 'cancelled';
  const paymentFraction = settled
    ? 0
    : att.paymentMode === 'cash'
      ? roll < 0.62 ? 1 : roll < 0.85 ? between(0.2, 0.9) : 0
      : roll < 0.30 ? 1 : roll < 0.72 ? between(0.1, 0.8) : 0;

  const status: GeneratedBill['status'] = settled
    ? 'cancelled'
    : paymentFraction >= 1 ? 'paid'
    : paymentFraction > 0 ? 'partial'
    : att.status === 'pending' || att.status === 'admitted' ? 'draft'
    : 'pending';

  const bill: GeneratedBill = {
    billNumber,
    attendanceKey: att.key,
    admissionKey: admission ? admission.key : null,
    folderNumber: patient ? patient.folderNumber : null,
    counterClientKey,
    paymentMode: att.paymentMode,
    billDate: att.status === 'pending' ? att.dateTime : addMinutes(att.dateTime, intBetween(20, 240)),
    dueDate: att.paymentMode === 'cash' ? addDays(att.dateTime, intBetween(7, 60)) : null,
    status,
    paymentFraction,
    discountFraction: chance(0.12) ? between(0.05, 0.2) : 0,
    paymentMethod: att.paymentMode === 'cash'
      ? pick(['cash', 'cash', 'mobile_money', 'mobile_money', 'card', 'bank_transfer'])
      : pick(['bank_transfer', 'mobile_money', 'cheque']),
    receiptReference: paymentFraction > 0 ? `RCP-${padNumber(++counters.receipt)}` : '',
    graValidated: status === 'paid' && chance(0.7),
  };

  const lines: GeneratedBillLinePlan[] = [];
  if (made.consultation) lines.push({ kind: 'consultation', index: 0, quantity: 1 });
  for (let i = 0; i < made.labs; i++) lines.push({ kind: 'lab', index: i, quantity: 1 });
  for (let i = 0; i < made.scans; i++) lines.push({ kind: 'scan', index: i, quantity: 1 });
  for (let i = 0; i < made.procs; i++) lines.push({ kind: 'procedure', index: i, quantity: 1 });
  for (let i = 0; i < made.meds; i++) {
    const med = b.medications.filter((m) => m.attendanceKey === att.key)[i];
    if (med && med.status !== 'cancelled') lines.push({ kind: 'medication', index: i, quantity: 1 });
  }
  for (let i = 0; i < made.wardDays; i++) lines.push({ kind: 'ward', index: i, quantity: 1 });

  (bill as GeneratedBill & { lines: GeneratedBillLinePlan[] }).lines = lines;
  b.bills.push(bill);
  return bill;
};

const emitReferral = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  patient: GeneratedPatient,
  scenario: ComplaintScenario,
  counters: NumberCounters,
): void => {
  const outgoing = chance(0.7);
  const facility = randomOf(HOSPITALS, 'Korle Bu Teaching Hospital');
  const department = randomOf(REFERABLE_DEPARTMENTS, 'Surgery');
  b.referrals.push({
    referralNumber: `REF-${padNumber(++counters.referral)}`,
    attendanceKey: att.key,
    folderNumber: patient.folderNumber,
    referralType: outgoing ? 'outgoing' : 'incoming',
    referralReason: scenario.assessment,
    referralNotes: outgoing
      ? `Referred to ${facility} for ${pick(['specialist opinion', 'further investigation', 'definitive management', 'a service not available at this facility'])}.`
      : `Accepted from ${facility}; the referral letter and the investigations already done are attached to this record.`,
    urgency: att.visitCategory === 'emergency' ? 'urgent' : chance(0.3) ? 'urgent' : 'routine',
    referredToFacility: outgoing ? facility : HOSPITALS[0],
    referredToDoctor: outgoing ? `Dr ${randomOf(SURNAMES, 'Mensah')}` : null,
    referredToDepartment: outgoing ? department : null,
    referredFromFacility: outgoing ? null : facility,
    referredFromDoctor: outgoing ? null : `Dr ${randomOf(SURNAMES, 'Osei')}`,
    referralDate: att.dateTime,
    status: outgoing
      ? att.status === 'referred' ? (chance(0.5) ? 'pending' : 'accepted') : pick(['completed', 'accepted', 'pending'])
      : pick(['accepted', 'completed']),
    outcomeNotes: chance(0.5)
      ? 'Specialist opinion received and the patient returned for continued care at this facility.'
      : null,
    completedAt: null,
    structuredForm: {
      part1: {
        patientFolderNumber: patient.folderNumber,
        referringFacility: outgoing ? 'This facility' : facility,
        referringOfficer: `Dr ${randomOf(SURNAMES, 'Mensah')}`,
        reasonForReferral: scenario.assessment,
        provisionalDiagnosis: scenario.icdCodes[0] ?? null,
        treatmentGiven: scenario.treatmentPlan,
        patientCondition: scenario.outcome === 'deceased' ? 'Critical' : 'Stable',
      },
      part2: {
        dateReceived: att.dateTime.toISOString(),
        diagnosisOnAdmission: scenario.icdCodes[0] ?? null,
        treatmentGivenAtReceivingFacility: scenario.treatmentPlan,
        outcomeOfTreatment: scenario.outcome,
        remarks: 'Reply dispatched to the referring facility.',
      },
    },
    createdBy: actor(outgoing ? 'doctor' : 'records'),
  });
  const last = b.referrals[b.referrals.length - 1];
  if (last.status === 'completed') last.completedAt = addDays(att.dateTime, intBetween(1, 21));
};
