const HOSPITALS = [
  'Korle Bu Teaching Hospital', 'Komfo Anokye Teaching Hospital', 'Takoradi Teaching Hospital',
  'Cape Coast Teaching Hospital', 'Tamale Teaching Hospital', 'Ga East Municipal Hospital',
  'Srikarda Memorial Hospital', 'Nkawkaw Government Hospital',
];
const REFERABLE_DEPARTMENTS = ['Surgery', 'Internal Medicine', 'Obstetrics & Gynaecology', 'Paediatrics', 'Orthopaedics', 'Neurosurgery', 'Cardiology', 'Ophthalmology', 'Dermatology'];

/**
 * Beds are finite and the writer can only assign an active admission a bed that
 * is genuinely free, so the number of encounters left open on the ward is capped.
 */
const MAX_ACTIVE_ADMISSIONS = 40;

/**
 * What the maternity cascade fixes about an encounter. Every field is optional: a visit
 * that merely happened to draw an obstetric scenario leaves them unset, and the generator
 * invents dates that are self-consistent for that one visit.
 */
interface MaternityPlan {
  /** The visit type, instead of drawing one from the scenario's list. */
  attendanceType?: string;
  /** Last menstrual period - every gestational age in the story is measured from it. */
  lmp?: Date;
  /** The birth this booking is heading to, so a review is never dated after it. */
  dueDate?: Date;
  /** Days since the birth, for the postnatal check. */
  puerperiumDay?: number;
}

const maternityContext = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  patient: GeneratedPatient,
  obs: MaternityPlan = {},
): void => {
  const female = patient.gender === 'female';
  if (!female) return;

  const isBooking = att.attendanceType === 'antenatal' && scenario.key !== 'premature_rom';
  if (isBooking) {
    const bookingKey = `anc-${att.key}`;
    const lmpDate = obs.lmp ?? addDays(att.dateTime, -intBetween(30, 210));
    const eddDate = addDays(lmpDate, 280);
    const gestation = Math.min(40, Math.max(6, Math.floor((att.dateTime.getTime() - lmpDate.getTime()) / (7 * 86_400_000))));
    const riskLevel = scenario.key === 'anc_malaria_anaemia' ? 'high' : chance(0.15) ? 'medium' : 'low';
    const isActive = att.dateTime.getTime() > Date.now() - 240 * 86_400_000;
    b.antenatalBookings.push({
      bookingKey,
      attendanceKey: att.key,
      folderNumber: patient.folderNumber,
      bookingDate: att.dateTime,
      lmp: lmpDate,
      edd: eddDate,
      gravida: intBetween(1, 5),
      para: intBetween(0, 4),
      gestationalAgeWeeks: gestation,
      riskLevel,
      bloodGroup: pick(['O+', 'A+', 'B+', 'AB+', 'O-']),
      hivStatus: chance(0.04) ? 'Positive' : 'Negative',
      hbLevel: +between(scenario.key === 'anc_malaria_anaemia' ? 7 : 10, 14).toFixed(1),
      isActive,
    });
    // A booking is the first antenatal contact, so the routine reviews that follow it are
    // dated forward from it - and a review that has not happened yet is not written.
    // The count is drawn once: re-rolling it every step would make the length of the
    // follow-up a coin toss per visit instead of a plan for the pregnancy.
    const reviewCount = intBetween(1, 6);
    for (let v = 1; v <= reviewCount; v++) {
      const visitDate = addDays(att.dateTime, v * 28);
      if (visitDate.getTime() > Date.now()) break;
      // A review after the birth is not a review, so the cascade stops at the delivery it knows about.
      if (obs.dueDate && visitDate.getTime() > obs.dueDate.getTime() - 7 * 86_400_000) break;
      const visitGestation = Math.min(41, gestation + v * 4);
      b.ancVisits.push({
        bookingKey,
        visitNumber: v,
        visitDate,
        gestationalAgeWeeks: visitGestation,
        weight: +between(52, 96).toFixed(1),
        bloodPressure: `${intBetween(100, 152)}/${intBetween(60, 96)}`,
        // The symphysis-fundal height in centimetres tracks the gestational age from 20 weeks.
        fundalHeight: Math.max(6, visitGestation - 2),
        fetalHeartRate: intBetween(118, 160),
        riskLevel,
      });
    }
    return;
  }

  if (att.attendanceType === 'delivery') {
    const deliveryKey = `del-${att.key}`;
    const isTwins = chance(0.05);
    const caesarean = scenario.key === 'caesarean' || scenario.key === 'obstructed_labour' || chance(0.25);
    const outcome: string = scenario.outcome === 'deceased'
      ? 'stillbirth_fresh'
      : chance(0.96) ? 'live_birth' : 'stillbirth_fresh';
    const validOutcomes = ['live_birth', 'neonatal_death', 'stillbirth_fresh', 'stillbirth_macerated'];
    const deliveryOutcome = validOutcomes.includes(outcome) ? outcome : 'live_birth';
    const deliveryType = caesarean ? 'caesarean_section' : isTwins ? 'multiple' : 'spontaneous_vertex';
    // With a known last period the gestation is the arithmetic of the pregnancy, not a guess,
    // so the booking, the reviews and this birth all report the same baby.
    const gestationWeeks = obs.lmp
      ? Math.max(24, Math.min(42, Math.floor((att.dateTime.getTime() - obs.lmp.getTime()) / (7 * 86_400_000))))
      : Math.min(42, intBetween(scenario.key === 'premature_rom' ? 30 : 36, scenario.key === 'premature_rom' ? 36 : 42));

    b.deliveryRecords.push({
      deliveryKey,
      attendanceKey: att.key,
      folderNumber: patient.folderNumber,
      deliveryDate: att.dateTime,
      deliveryType,
      deliveryOutcome,
      placeOfDelivery: 'private_hospital',
      attendant: 'Midwife on duty',
      gestationWeeks,
      birthWeight: isTwins ? 2400 : intBetween(2500, 4000),
      apgarScore1min: deliveryOutcome === 'live_birth' ? intBetween(6, 9) : 0,
      apgarScore5min: deliveryOutcome === 'live_birth' ? intBetween(8, 10) : 0,
      maternalOutcome: scenario.outcome === 'deceased' ? 'dead_direct_cause' : 'alive',
      complications: scenario.key === 'postpartum_haemorrhage'
        ? ['Primary postpartum haemorrhage']
        : isTwins ? ['Preterm labour'] : [],
      malePartnerPresentANC: chance(0.45),
      malePartnerPresentDelivery: chance(0.3),
      malePartnerPresentPNC: chance(0.25),
      maternalDeathsAudited: scenario.outcome === 'deceased',
    });

    const babies = isTwins ? 2 : 1;
    for (let n = 1; n <= babies; n++) {
      b.newbornRecords.push({
        deliveryKey,
        order: n,
        birthWeight: isTwins ? intBetween(2000, 2800) : intBetween(2500, 4000),
        gender: chance(0.5) ? 'male' : 'female',
        apgarScore1min: deliveryOutcome === 'live_birth' ? intBetween(6, 9) : 0,
        apgarScore5min: deliveryOutcome === 'live_birth' ? intBetween(8, 10) : 0,
        // A stillbirth is reported as a stillbirth for the baby too; only a baby that was
        // born alive and then died is recorded as a neonatal death.
        outcome: deliveryOutcome === 'live_birth' ? 'alive'
          : deliveryOutcome === 'neonatal_death' ? 'dead_within_24hrs'
            : deliveryOutcome === 'stillbirth_macerated' ? 'stillbirth_macerated' : 'stillbirth_fresh',
        anomalies: [],
        breastfeedingWithin30Min: deliveryOutcome === 'live_birth',
        eyeProphylaxisGiven: true,
        cordCareMethod: 'dry_cord',
      });
    }
  }

  if (att.attendanceType === 'postnatal' && scenario.key === 'postnatal_review') {
    // The day number is the distance from the birth, so what the record reports is the
    // puerperium the register then links it to. A mother whose baby was delivered elsewhere
    // has no birth here to be dated from, and the visit says how long she has been followed.
    const attended = (b.deliveryRecords as Array<{ folderNumber: string; deliveryDate: Date }>)
      .filter((d) => d.folderNumber === patient.folderNumber && d.deliveryDate.getTime() <= att.dateTime.getTime())
      .sort((a, c) => c.deliveryDate.getTime() - a.deliveryDate.getTime())[0];
    const daysSinceBirth = attended
      ? Math.floor((att.dateTime.getTime() - attended.deliveryDate.getTime()) / 86_400_000)
      : null;
    b.postnatalRecords.push({
      attendanceKey: att.key,
      folderNumber: patient.folderNumber,
      examinationDate: att.dateTime,
      // The cascade dates the check from the birth, so the day number it reports is the real one.
      dayNumber: obs.puerperiumDay ?? (daysSinceBirth !== null && daysSinceBirth >= 1 ? daysSinceBirth : pick([1, 3, 7, 14, 42])),
      maternalCondition: scenario.outcome === 'improved' ? 'good' : 'fair',
      maternalComplications: [],
      maternalDangerSigns: chance(0.1) ? ['Fever'] : [],
      babyDangerSigns: chance(0.08) ? ['Poor feeding'] : [],
      breastfeedingStatus: pick(['exclusive', 'exclusive', 'mixed']),
      babyCondition: 'good',
      lochia: 'normal',
      perinealCondition: chance(0.2) ? 'granulation' : 'intact',
      latching: 'good',
      jaundice: chance(0.1),
      cordCondition: 'dry',
      bcgGiven: true,
      opv0Given: true,
      hepB0Given: true,
      familyPlanningDiscussed: chance(0.6),
      malePartnerPresentPNC: chance(0.35),
    });
  }
};

/**
 * One encounter, end to end: the story, the observations it was seen in, what
 * was ordered, what came back, what was prescribed, whether it was admitted,
 * what it was billed for and where it went afterwards.
 */
const emitEncounter = (
  b: GeneratedBundle,
  counters: NumberCounters,
  patient: GeneratedPatient | null,
  counterClientKey: string | null,
  scenario: ComplaintScenario,
  dateTime: Date,
  state: { activeAdmissions: number },
  obs: MaternityPlan = {},
): GeneratedAttendance => {
  const index = b.attendances.length + 1;
  const key = `att-${index}`;
  const attendanceNumber = padNumber(++counters.attendance);
  const daysBack = Math.max(0, Math.floor((Date.now() - dateTime.getTime()) / 86_400_000));
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - dateTime.getTime()) / 60_000));
  const paymentMode = patient ? patient.paymentMode : 'cash';
  const allergies = patient ? patient.allergies : [];
  const profile = vitalsProfileFor(scenario, patient || syntheticPatient(counterClientKey, scenario), dateTime);

  const attendanceType = obs.attendanceType ?? randomOf(scenario.types, 'general_consultation');
  const forcesAdmission = attendanceType === 'surgery' || attendanceType === 'delivery';
  // A counter ticket has no patient behind it, and a bed is issued to a patient, so a
  // walk-in can never be an admission or a daycase. Both worklists read patient-backed
  // encounters, and an ipd row without an admission strand the writer with no bed to bill.
  const admits = !!patient && (forcesAdmission || chance(scenario.admitChance));
  const daycaseCandidate = !admits && !!patient && DAYCASE_SCENARIOS.has(scenario.key) && scenario.procedureCodes.length > 0;
  const isDaycase = daycaseCandidate && chance(0.75);
  const encounterCategory: GeneratedAttendance['encounterCategory'] = admits ? 'ipd' : isDaycase ? 'daycase' : 'opd';

  const losGuess = encounterCategory === 'daycase' ? 1 : Math.max(1, intBetween(scenario.losDays[0], scenario.losDays[1]));
  const canStayOpen = encounterCategory === 'ipd' && daysBack < losGuess && state.activeAdmissions < MAX_ACTIVE_ADMISSIONS;

  let status: GeneratedAttendance['status'];
  if (chance(0.006)) status = 'cancelled';
  else if (encounterCategory === 'ipd') status = canStayOpen && chance(0.55) ? 'admitted' : chance(0.03) ? 'absconded' : 'discharged';
  else if (encounterCategory === 'daycase') status = daysBack === 0 && chance(0.4) ? 'pending' : 'completed';
  else if (scenario.key === 'detention') status = 'admitted';
  else if (daysBack === 0 && chance(0.4)) status = 'pending';
  else status = 'completed';
  if (status === 'admitted') state.activeAdmissions++;

  const visitCategory: GeneratedAttendance['visitCategory'] =
    attendanceType === 'emergency_acute' ? 'emergency'
    : attendanceType === 'specialist_consultation' ? 'specialist'
    : encounterCategory !== 'opd' ? 'inpatient'
    : 'general';
  const serviceCategory: GeneratedAttendance['serviceCategory'] =
    encounterCategory === 'opd'
      ? scenario.key === 'walk_in_diagnostics' ? 'diagnostics' : 'opd'
      : encounterCategory === 'daycase' ? 'opd' : 'ipd';

  const hasAllergies = allergies.length > 0;
  const allergyReviewStatus: GeneratedAttendance['allergyReviewStatus'] = hasAllergies
    ? 'allergies_present'
    : status === 'pending' && chance(0.35) ? 'not_reviewed' : 'no_known_allergies';

  const providerSpecialization = scenario.specialization;
  const att: GeneratedAttendance = {
    key,
    attendanceNumber,
    folderNumber: patient ? patient.folderNumber : null,
    counterClientKey,
    scenarioKey: scenario.key,
    attendanceType,
    paymentMode,
    dateTime,
    status,
    encounterCategory,
    visitCategory,
    serviceCategory,
    patientClassification: chance(0.35) ? 'NEW' : 'OLD',
    diagnosisClassification: chance(0.7) ? 'NEW_DIAGNOSIS' : 'OLD_DIAGNOSIS',
    complaints: scenario.complaints,
    historyPresentingComplaint: scenario.history,
    reviewOfSystems: {} as Record<string, string>,
    physicalExamination: scenario.examination,
    physicalExamStructured: {},
    assessment: scenario.assessment,
    treatmentPlan: `${scenario.treatmentPlan} ${pick(GENERAL_SAFETY_NET)}`,
    clinicalOutcome: status === 'pending' || status === 'admitted' ? 'stable' : scenario.outcome,
    allergyReviewStatus,
    allergyReviewNotes: hasAllergies
      ? `Allergy list reviewed with the patient: ${allergies.map((a) => a.allergen).join(', ')}. Conflicting drugs avoided on the prescription.`
      : allergyReviewStatus === 'no_known_allergies'
        ? 'Asked directly about drug, food and latex allergy; the patient denies any reaction and the list is empty.'
        : null,
    allergyReviewedAt: allergyReviewStatus === 'not_reviewed' ? null : dateTime,
    medicalNotes: `${scenario.assessment} ${scenario.advice} ${pick(CONSULT_ADVICE_POOL)}`,
    clinicalNotes: {
      scenarioKey: scenario.key,
      triage: { category: visitCategory, painScore: 0 },
      safetyNetAdvice: scenario.advice,
      documentation: { historyTakenBy: 'Clinician on duty', examination: 'Complete examination recorded in the structured fields' },
      followUpPlan: scenario.followUpDays,
    },
    followUpDate: null,
    finalizedAt: null,
    insuranceType: paymentMode === 'nhis' ? 'nhis'
      : paymentMode === 'private_insurance' ? 'private'
      : paymentMode === 'corporate' ? 'corporate' : null,
    provider: actor('doctor'),
    providerSpecialization,
    allergyReviewer: allergyReviewStatus === 'not_reviewed' ? null : actor('doctor'),
    finalizer: null,
    referralToDepartment: null,
  };

  const vitals = chance(COUNTS.vitalsPerAttendance)
    ? buildVitals(profile, patient || syntheticPatient(counterClientKey, scenario), dateTime, key)
    : null;
  if (vitals) b.vitals.push(vitals);
  att.reviewOfSystems = buildReviewOfSystems(scenario, profile);
  att.physicalExamStructured = buildStructuredExam(vitals, scenario, profile);
  if (vitals) (att.clinicalNotes as Record<string, unknown>).triage = {
    category: visitCategory,
    painScore: vitals.painScore,
    temperatureC: vitals.temperature,
    bloodPressure: `${vitals.systolic}/${vitals.diastolic}`,
    oxygenSaturation: vitals.spo2,
  };

  // ── DIAGNOSIS: a pending encounter is still a working diagnosis
  if (status !== 'cancelled' && status !== 'pending' && scenario.icdCodes.length) {
    const codes = pickSomeDistinct(scenario.icdCodes, 3, 1);
    codes.forEach((icdCode, i) => {
      b.diagnoses.push({
        attendanceKey: key,
        icdCode,
        diagnosisType: i === 0 ? 'primary' : 'additional',
        presentOnAdmission: encounterCategory === 'ipd' ? (chance(0.8) ? 'Y' : 'N') : 'U',
        date: addMinutes(dateTime, intBetween(15, 120)),
      });
    });
  } else if (status === 'pending' && scenario.icdCodes.length && chance(0.6)) {
    b.diagnoses.push({
      attendanceKey: key,
      icdCode: scenario.icdCodes[0],
      diagnosisType: 'provisional',
      presentOnAdmission: 'Y',
      date: addMinutes(dateTime, intBetween(10, 45)),
    });
  }

  const made = { labs: 0, scans: 0, meds: 0, procs: 0, wardDays: 0, consultation: status !== 'cancelled' };
  const isLive = daysBack === 0;
  made.labs = emitLabs(b, att, scenario, profile, elapsedMinutes, isLive);
  made.scans = emitScans(b, att, scenario, elapsedMinutes, isLive);
  made.procs = emitProcedures(b, att, scenario, encounterCategory !== 'opd', isLive);

  const wardHint = wardTypeFor(scenario, patient || syntheticPatient(counterClientKey, scenario), profile);
  const admission = (encounterCategory !== 'opd' && patient)
    ? emitAdmission(b, att, scenario, patient, counters, daysBack, wardHint)
    : null;
  made.wardDays = admission ? b.wardCharges.filter((w) => w.admissionKey === admission.key).length : 0;

  // Inpatient drugs are issued from the ward stock and charted, so they are written
  // after the admission exists and can be timed across the stay.
  made.meds = emitMedications(b, att, scenario, patient, allergies, encounterCategory !== 'opd', admission?.lengthOfStayDays ?? losGuess);

  // A settled encounter is signed off by the clinician who saw the patient. An absconded
  // admission is closed the same way - the record has to leave the open worklist - and a
  // referred one is closed by whoever wrote the referral letter.
  if (status === 'completed' || status === 'discharged' || status === 'absconded') {
    const offset = intBetween(25, 240);
    if (elapsedMinutes > offset) att.finalizedAt = addMinutes(dateTime, offset);
    att.finalizer = att.provider;
  }
  if (status === 'completed' || status === 'discharged') {
    if (chance(0.6)) att.followUpDate = addDays(dateTime, randomOf(scenario.followUpDays, 14));
  }

  b.attendances.push(att);
  emitBill(b, att, patient, counterClientKey, made, admission, counters);

  // ── CLAIM for an insured encounter that was billed
  const claimChance = paymentMode === 'nhis' ? COUNTS.claimsPerNHISAttendance
    : paymentMode === 'private_insurance' ? 0.6 : paymentMode === 'corporate' ? 0.4 : 0;
  if (att.insuranceType && patient && chance(claimChance) && status !== 'cancelled') {
    const finalized = chance(0.75);
    const createdAt = att.finalizedAt ? new Date(att.finalizedAt) : addMinutes(dateTime, intBetween(60, 1440));
    const claimKey = `clm-${b.claims.length + 1}`;
    const prefix = att.insuranceType === 'nhis' ? 'NHIS' : att.insuranceType === 'private' ? 'PRIV' : 'CORP';
    const claim: GeneratedClaim = {
      key: claimKey,
      claimNumber: `${prefix}-${attendanceNumber}`,
      billNumber: `BILL-${attendanceNumber}`,
      attendanceKey: key,
      folderNumber: patient.folderNumber,
      counterClientKey: null,
      status: finalized ? 'finalized' : 'draft',
      createdAt,
      finalizedAt: finalized ? addMinutes(createdAt, intBetween(30, 2880)) : null,
      insuranceType: att.insuranceType,
      typeOfService: encounterCategory === 'ipd' ? 'inpatient' : attendanceType === 'delivery' ? 'maternity' : 'outpatient',
      typeOfAttendance: attendanceType,
      serviceOutcome: att.clinicalOutcome,
      notes: finalized && chance(0.25) ? pick(CLAIM_REJECTION_NOTES) : null,
      createdBy: actor('accounts'),
      finalizedBy: finalized ? actor('accounts') : null,
      trackingEvents: [],
      batchKey: null,
    };
    if (finalized) {
      claim.trackingEvents.push({
        eventType: 'submitted', status: 'submitted', at: claim.finalizedAt!, amount: null,
        payerReference: `PAYREF-${attendanceNumber}`, paymentReference: null, paymentMethod: null,
        notes: 'Batch file handed to the payer for adjudication.', recorder: actor('accounts'),
      });
      const outcomeRoll = rand();
      if (outcomeRoll < 0.45) {
        claim.trackingEvents.push({
          eventType: 'paid', status: 'paid', at: addDays(claim.finalizedAt!, intBetween(20, 120)),
          amount: null, payerReference: null, paymentReference: `PMT-${attendanceNumber}`,
          paymentMethod: 'bank_transfer', notes: 'Adjudicated at the published tariff and settled.',
          recorder: actor('accounts'),
        });
      } else if (outcomeRoll < 0.65) {
        claim.trackingEvents.push({
          eventType: 'rejected', status: 'rejected', at: addDays(claim.finalizedAt!, intBetween(10, 60)),
          amount: null, payerReference: null, paymentReference: null, paymentMethod: null,
          notes: pick(CLAIM_REJECTION_NOTES), recorder: actor('accounts'),
        });
      } else if (outcomeRoll < 0.8) {
        claim.trackingEvents.push({
          eventType: 'partially_approved', status: 'partially approved', at: addDays(claim.finalizedAt!, intBetween(10, 60)),
          amount: null, payerReference: null, paymentReference: null, paymentMethod: null,
          notes: pick(CLAIM_REJECTION_NOTES), recorder: actor('accounts'),
        });
      } else {
        claim.trackingEvents.push({
          eventType: 'under_review', status: 'under review', at: addDays(claim.finalizedAt!, intBetween(2, 20)),
          amount: null, payerReference: null, paymentReference: null, paymentMethod: null,
          notes: 'Awaiting adjudication by the payer.', recorder: actor('accounts'),
        });
      }
    }
    b.claims.push(claim);
  }

  // ── REFERRAL
  if (chance(COUNTS.referralsPerAttendance) && patient) {
    emitReferral(b, att, patient, scenario, counters);
    if (att.status !== 'cancelled' && att.status !== 'pending' && rand() < 0.4) {
      att.status = 'referred';
      att.referralToDepartment = randomOf(REFERABLE_DEPARTMENTS, 'Surgery');
    }
  }

  if (patient) maternityContext(b, att, scenario, patient, obs);
  return att;
};

/** A walk-in has no registered patient; the emitters still need age and sex for vitals. */
const syntheticPatient = (counterClientKey: string | null, scenario: ComplaintScenario): GeneratedPatient => {
  const seedIndex = counterClientKey ? parseInt(counterClientKey.replace(/\D/g, ''), 10) || 1 : 1;
  const age = Math.max(scenario.minAge, Math.min(scenario.maxAge, 5 + (seedIndex * 7) % 80));
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - age);
  return {
    folderNumber: '',
    surname: 'Walk-in',
    otherNames: 'Client',
    gender: seedIndex % 2 === 0 ? 'male' : 'female',
    dateOfBirth: dob,
    contact: '', address: '', paymentMode: 'cash', nhisNumber: null, nhisActive: false,
    nhisExpiryDate: null, phoneNumber: '', insuranceDetails: {}, registeredAt: new Date(),
    maritalStatus: 'single', residenceRegion: '', residenceDistrict: '', residenceCommunity: '',
    employer: null, allergies: [], histories: [], consents: [],
  };
};
