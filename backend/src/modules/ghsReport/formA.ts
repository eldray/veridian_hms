/**
 * GHS Monthly Midwives Returns – FORM A (DHIMS2 layout).
 *
 * Pure builder: takes the raw maternal records for the period and returns a
 * form-shaped payload (sections -> tables -> rows) so the screen, the CSV/Excel/PDF
 * export and the DHIMS2 data entry all use the exact same numbers.
 *
 * Fields that the system does not record are returned with `captured: false`
 * (shown as "n/c" on screen) instead of an invented 0.
 */

export const AGE_GROUPS = ['10-14', '15-19', '20-24', '25-29', '30-34', '35+'] as const;
export type FormAAge = typeof AGE_GROUPS[number];

export interface FormARow { label: string; values: (number | string)[]; captured?: boolean; note?: string }
export interface FormATable { title?: string; groups?: { label: string; span: number }[]; columns: string[]; rows: FormARow[] }
export interface FormASection { id: string; title: string; tables: FormATable[] }

export interface FormAInputs {
  bookings: any[];        // AntenatalBooking + patient.dateOfBirth
  visits: any[];          // ANCVisit (period)
  deliveries: any[];      // DeliveryRecord + Newborn + patient + antenatalBooking
  postnatal: any[];       // PostnatalRecord + patient
  abortions: any[];       // AbortionRecord + patient
  referrals: any[];       // ReferralRecord + attendance.attendanceType
  labTests: any[];        // ANC lab tests + LabTestTemplate
  medications: any[];     // ANC / delivery meds + StockItem
  shortMothers: number;   // distinct ANC mothers < 150cm
}

const lc = (v: any) => String(v ?? '').toLowerCase();
const num = (v: any) => (v == null ? null : Number(v));
/** Newborn weights are entered in grams on the delivery form; the report works in kg. */
const kg = (v: any) => { const n = num(v); if (n == null || Number.isNaN(n)) return null; return n > 20 ? n / 1000 : n; };

export function ageOn(dob: any, asOf: any): number | null {
  if (!dob) return null;
  const b = new Date(dob), t = new Date(asOf);
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return Math.max(0, a);
}

export function ageGroup(dob: any, asOf: any): FormAAge | null {
  const a = ageOn(dob, asOf);
  if (a == null) return null;
  if (a < 15) return '10-14';
  if (a < 20) return '15-19';
  if (a < 25) return '20-24';
  if (a < 30) return '25-29';
  if (a < 35) return '30-34';
  return '35+';
}

function byAge<T>(items: T[], dobOf: (x: T) => any, dateOf: (x: T) => any) {
  const out: Record<string, number> = {};
  AGE_GROUPS.forEach(g => (out[g] = 0));
  let unknown = 0;
  items.forEach(x => {
    const g = ageGroup(dobOf(x), dateOf(x));
    if (g) out[g]++; else unknown++;
  });
  return { counts: out, unknown, total: items.length };
}

const ageTable = (title: string, label: string, r: ReturnType<typeof byAge>): FormATable => ({
  title,
  columns: [...AGE_GROUPS, 'Total'],
  rows: [{ label, values: [...AGE_GROUPS.map(g => r.counts[g]), r.total] }],
});

const single = (title: string, rows: [string, number | string, boolean?][]): FormATable => ({
  title,
  columns: ['Count'],
  rows: rows.map(([label, v, captured]) => ({ label, values: [v], captured: captured !== false })),
});

const matches = (name: any, keys: string[]) => keys.some(k => lc(name).includes(k));
const resultPositive = (r: any) => /posit|reactiv/.test(lc(JSON.stringify(r)));

const hivTested = (s: any) => !!s && !/^(unknown|not tested|untested|n\/a|none|-)$/i.test(String(s).trim());
const hivPositive = (s: any) => /^pos/i.test(String(s ?? '').trim());

export function buildFormA(inp: FormAInputs, facilityFlags?: { conductsDelivery?: boolean }) {
  const { bookings, visits, deliveries, postnatal, abortions, referrals, labTests, medications } = inp;

  const visitsOf = (bookingId: string) => visits.filter(v => v.bookingId === bookingId);
  const medNames = (list: any[]) => list.map(m => lc(m.StockItem?.name ?? m.name));

  // ── Facility / services ────────────────────────────────────────────────────
  const conducts = facilityFlags?.conductsDelivery ?? deliveries.length > 0;
  const facility: FormATable = {
    title: 'EMONC / Services available',
    columns: ['Available'],
    rows: [
      { label: 'Conducts deliveries', values: [conducts ? 'Yes' : 'No'] },
      { label: 'Blood transfusion service', values: ['n/c'], captured: false },
      { label: 'PMTCT services', values: ['Yes'], captured: bookings.some(b => hivTested(b.hivStatus)) },
      { label: 'EID services', values: ['n/c'], captured: false },
      { label: 'Baby Friendly Hospital', values: ['n/c'], captured: false },
    ],
  };

  // ── Antenatal ──────────────────────────────────────────────────────────────
  const regAge = byAge(bookings, b => b.patient?.dateOfBirth, b => b.bookingDate);
  const ga = (b: any) => num(b.gestationalAgeAtBooking ?? b.gestationalAgeWeeks);
  const parityRows: [string, number][] = [
    ['Para 0 (primigravida)', bookings.filter(b => b.para === 0).length],
    ['Para 1-2', bookings.filter(b => b.para >= 1 && b.para <= 2).length],
    ['Para 3-4', bookings.filter(b => b.para >= 3 && b.para <= 4).length],
    ['Para 5+', bookings.filter(b => b.para >= 5).length],
  ];
  const tri1 = bookings.filter(b => ga(b) != null && ga(b)! < 13).length;
  const tri2 = bookings.filter(b => ga(b) != null && ga(b)! >= 13 && ga(b)! < 28).length;
  const tri3 = bookings.filter(b => ga(b) != null && ga(b)! >= 28).length;

  const doseCount = (field: 'iptpDoseNumber' | 'ttDoseNumber', given: 'iptpGiven' | 'ttGiven', n: number, plus = false) =>
    visits.filter(v => v[given] && (plus ? (v[field] ?? 0) >= n : v[field] === n)).length;

  const ifaCount = (b: any) => visitsOf(b.id).filter(v => v.ironGiven || v.folateGiven).length;
  const visitTotals = (b: any) => visitsOf(b.id).length;

  const hbBooking = (b: any) => num(b.hbBooking ?? b.hbLevel);
  const anaemia = bookings.filter(b => hbBooking(b) != null && hbBooking(b)! < 11).length;
  const severeAnaemia = bookings.filter(b => hbBooking(b) != null && hbBooking(b)! < 7).length;
  const anaemia36 = bookings.filter(b => num(b.hb36Weeks) != null && num(b.hb36Weeks)! < 11).length;

  const ancLab = (keys: string[]) => labTests.filter(l => matches(l.LabTestTemplate?.name, keys));
  const syph = ancLab(['syphilis', 'vdrl', 'rpr']);
  const syphBooking = bookings.filter(b => b.vdrl && lc(b.vdrl) !== 'not done');
  const syphTested = Math.max(syph.length, syphBooking.length);
  const syphPos = syph.filter(l => resultPositive(l.result)).length || bookings.filter(b => resultPositive(b.vdrl)).length;
  const hep = ancLab(['hepatitis', 'hbsag', 'hep b']);
  const hepBooking = bookings.filter(b => b.hepatitisBStatus && !/not done|unknown/i.test(b.hepatitisBStatus));
  const tb = ancLab(['tuberculosis', 'gene xpert', 'xpert', 'afb', ' tb', 'tb ']);
  const antiMed = (keys: string[]) => medNames(medications).filter(n => matches(n, keys)).length;

  const antenatalAttendance: FormATable = single('Antenatal attendance', [
    ['New ANC registrants', bookings.length],
    ['Total ANC attendances (all visits)', visits.length],
    ['Mothers making 4th visit', visits.filter(v => v.visitNumber === 4).length],
    ['Mothers making 8th visit', visits.filter(v => v.visitNumber === 8).length],
    ['Seen at 36 weeks', visits.filter(v => v.gestationalAgeWeeks != null && v.gestationalAgeWeeks >= 36 && v.gestationalAgeWeeks <= 38).length],
    ['Td2+ (second or later tetanus dose)', doseCount('ttDoseNumber', 'ttGiven', 2, true)],
    ['Mothers < 150 cm', Math.max(inp.shortMothers, bookings.filter(b => num(b.bookingHeight) != null && num(b.bookingHeight)! < 150).length)],
    ['High-risk pregnancies', bookings.filter(b => b.riskLevel === 'high').length],
    ['Danger signs / referrals made at ANC', visits.filter(v => v.referralMade).length],
  ]);

  const trimester: FormATable = single('Gestation at registration', [
    ['1st trimester (< 13 weeks)', tri1],
    ['2nd trimester (13-27 weeks)', tri2],
    ['3rd trimester (28+ weeks)', tri3],
    ['Gestation not recorded', bookings.length - tri1 - tri2 - tri3],
  ]);

  const ipt: FormATable = single('IPTp (SP) doses', [
    ['IPTp 1', doseCount('iptpDoseNumber', 'iptpGiven', 1)],
    ['IPTp 2', doseCount('iptpDoseNumber', 'iptpGiven', 2)],
    ['IPTp 3', doseCount('iptpDoseNumber', 'iptpGiven', 3)],
    ['IPTp 4', doseCount('iptpDoseNumber', 'iptpGiven', 4)],
    ['IPTp 5+', doseCount('iptpDoseNumber', 'iptpGiven', 5, true)],
  ]);

  const tt: FormATable = single('Tetanus-diphtheria (Td) doses', [
    ['Td 1', doseCount('ttDoseNumber', 'ttGiven', 1)],
    ['Td 2', doseCount('ttDoseNumber', 'ttGiven', 2)],
    ['Td 3', doseCount('ttDoseNumber', 'ttGiven', 3)],
    ['Td 4', doseCount('ttDoseNumber', 'ttGiven', 4)],
    ['Td 5', doseCount('ttDoseNumber', 'ttGiven', 5)],
  ]);

  const ifa: FormATable = single('Iron / Folate (IFA)', [
    ['Received IFA (this period)', visits.filter(v => v.ironGiven || v.folateGiven).length],
    ['Received IFA at 3 or more visits', bookings.filter(b => ifaCount(b) >= 3).length],
    ['Received IFA at 6 or more visits', bookings.filter(b => ifaCount(b) >= 6).length],
    ['Received calcium', visits.filter(v => v.calciumGiven).length],
  ]);

  const malaria: FormATable = single('Malaria in pregnancy & ITN', [
    ['ITN given', bookings.filter(b => b.itnGiven).length],
    ['Tested for malaria', visits.filter(v => v.malariaTestDone).length + bookings.filter(b => b.malariaTested).length],
    ['Malaria positive', visits.filter(v => lc(v.malariaTestResult) === 'positive').length + bookings.filter(b => b.malariaPositive).length],
    ['Malaria treated', visits.filter(v => v.malariaTreatmentGiven).length],
  ]);

  const anaemiaT: FormATable = single('Anaemia', [
    ['Hb < 11 g/dl at registration', anaemia],
    ['Hb < 7 g/dl at registration (severe)', severeAnaemia],
    ['Hb < 11 g/dl at 36 weeks', anaemia36],
    ['Hb not recorded at registration', bookings.filter(b => hbBooking(b) == null).length],
  ]);

  const screening: FormATable = single('Syphilis / Hepatitis B / TB screening', [
    ['Syphilis – tested', syphTested],
    ['Syphilis – positive', syphPos],
    ['Syphilis – treated', antiMed(['penicillin', 'benzathine'])],
    ['Hepatitis B – screened', Math.max(hep.length, hepBooking.length)],
    ['Hepatitis B – positive', Math.max(hep.filter(l => resultPositive(l.result)).length, bookings.filter(b => resultPositive(b.hepatitisBStatus)).length)],
    ['TB – screened', tb.length, tb.length > 0],
    ['TB – positive', tb.filter(l => resultPositive(l.result)).length, tb.length > 0],
    ['TB – treated', antiMed(['rifampicin', 'isoniazid', 'ethambutol']), tb.length > 0],
  ]);

  // PMTCT (A–I) ────────────────────────────────────────────────────────────────
  const tested = bookings.filter(b => hivTested(b.hivStatus));
  const positive = bookings.filter(b => hivPositive(b.hivStatus));
  const pmtct: FormATable = {
    title: 'PMTCT',
    columns: ['Count'],
    rows: [
      { label: 'A. ANC registrants', values: [bookings.length] },
      { label: 'B. Tested for HIV at ANC', values: [tested.length] },
      { label: 'C. Known HIV positive before this pregnancy', values: [bookings.filter(b => b.hivKnownPositive).length] },
      { label: 'D. HIV positive at ANC (new + known)', values: [positive.length] },
      { label: 'E. HIV negative at ANC', values: [tested.length - positive.length] },
      { label: 'F. On ARV treatment', values: [antiMed(['arv', 'antiretroviral', 'tenofovir', 'lamivudine', 'efavirenz', 'dolutegravir'])] },
      { label: 'G. Partner tested', values: [bookings.filter(b => hivTested(b.partnerHivStatus)).length] },
      { label: 'H. Couples tested together', values: [bookings.filter(b => b.malePartnerInvolved && hivTested(b.hivStatus) && hivTested(b.partnerHivStatus)).length] },
      { label: 'I. Infants given ARV prophylaxis', values: ['n/c'], captured: false },
    ],
  };

  // ── Deliveries ─────────────────────────────────────────────────────────────
  const dAge = byAge(deliveries, d => d.patient?.dateOfBirth, d => d.deliveryDate);
  const countBy = (field: string, val: string) => deliveries.filter(d => d[field] === val).length;
  const para = (d: any) => d.antenatalBooking?.para ?? null;

  const babies: { sex: string; weight: number | null; stillborn: boolean; fresh: boolean; died: string | null; parity: number | null; delivery: any; nb: any }[] = [];
  deliveries.forEach(d => {
    const still = d.deliveryOutcome === 'stillbirth_fresh' || d.deliveryOutcome === 'stillbirth_macerated';
    const nbs: any[] = d.Newborn?.length ? d.Newborn : [null];
    nbs.forEach(nb => {
      let died: string | null = null;
      if (!still) {
        if (nb?.outcome === 'dead_within_24hrs' || nb?.outcome === 'dead_1_7days') died = 'early';
        else if (nb?.outcome === 'dead_8_28days') died = 'late';
        else if (!nb && d.deliveryOutcome === 'neonatal_death') died = 'early';
      }
      babies.push({ sex: nb?.gender ?? 'unknown', weight: kg(nb?.birthWeight ?? d.birthWeight), stillborn: still, fresh: d.deliveryOutcome === 'stillbirth_fresh', died, parity: para(d), delivery: d, nb });
    });
  });
  const sexCols = ['Male', 'Female', 'Total'];
  const sexRow = (label: string, f: (b: typeof babies[number]) => boolean): FormARow => {
    const m = babies.filter(b => f(b) && b.sex === 'male').length;
    const fe = babies.filter(b => f(b) && b.sex === 'female').length;
    const t = babies.filter(f).length;
    return { label, values: [m, fe, t] };
  };

  const birthsOutcome: FormATable = {
    title: 'Births by outcome and sex',
    columns: sexCols,
    rows: [
      sexRow('Live births', b => !b.stillborn),
      sexRow('Fresh stillbirths', b => b.stillborn && b.fresh),
      sexRow('Macerated stillbirths', b => b.stillborn && !b.fresh),
      sexRow('Total births', () => true),
    ],
  };

  const birthWeight: FormATable = {
    title: 'Birth weight (kg)',
    columns: ['< 2.5 kg', '>= 2.5 kg', 'Not weighed'],
    rows: [
      { label: 'All babies', values: [babies.filter(b => b.weight != null && b.weight < 2.5).length, babies.filter(b => b.weight != null && b.weight >= 2.5).length, babies.filter(b => b.weight == null).length] },
      { label: 'Primigravidae', values: [babies.filter(b => b.parity === 0 && b.weight != null && b.weight < 2.5).length, babies.filter(b => b.parity === 0 && b.weight != null && b.weight >= 2.5).length, babies.filter(b => b.parity === 0 && b.weight == null).length] },
      { label: 'Multiparae', values: [babies.filter(b => b.parity != null && b.parity > 0 && b.weight != null && b.weight < 2.5).length, babies.filter(b => b.parity != null && b.parity > 0 && b.weight != null && b.weight >= 2.5).length, babies.filter(b => b.parity != null && b.parity > 0 && b.weight == null).length] },
    ],
  };

  const prim = deliveries.filter(d => para(d) === 0);
  const primBabies = babies.filter(b => b.parity === 0);
  const primigravidae: FormATable = {
    title: 'Primigravidae – outcome of delivery',
    columns: sexCols,
    rows: [
      { label: 'Deliveries (mothers)', values: ['', '', prim.length] },
      { label: 'Live births', values: [primBabies.filter(b => !b.stillborn && b.sex === 'male').length, primBabies.filter(b => !b.stillborn && b.sex === 'female').length, primBabies.filter(b => !b.stillborn).length] },
      { label: 'Stillbirths', values: [primBabies.filter(b => b.stillborn && b.sex === 'male').length, primBabies.filter(b => b.stillborn && b.sex === 'female').length, primBabies.filter(b => b.stillborn).length] },
    ],
  };

  const nbCount = (d: any) => (d.Newborn?.length ? d.Newborn.length : 1);
  const outcomeOfDelivery: FormATable = single('Outcome of delivery (number of babies)', [
    ['Single births', deliveries.filter(d => nbCount(d) === 1).length],
    ['Twins', deliveries.filter(d => nbCount(d) === 2).length],
    ['Triplets or more', deliveries.filter(d => nbCount(d) >= 3).length],
  ]);

  const mode: FormATable = single('Type of delivery', [
    ['Spontaneous vertex', countBy('deliveryType', 'spontaneous_vertex')],
    ['Assisted breech', countBy('deliveryType', 'assisted_breech')],
    ['Vacuum extraction', countBy('deliveryType', 'vacuum')],
    ['Forceps', countBy('deliveryType', 'forceps')],
    ['Caesarean section', countBy('deliveryType', 'caesarean_section')],
    ['Multiple', countBy('deliveryType', 'multiple')],
  ]);

  const PLACES: [string, string][] = [
    ['private_hospital', 'Private hospital'], ['government_hospital', 'Government hospital'], ['health_centre', 'Health centre'],
    ['clinic', 'Clinic'], ['chag_facility', 'CHAG facility'], ['private_midwife', 'Private midwife'],
    ['tba_trained', 'TBA (trained)'], ['tba_untrained', 'TBA (untrained)'], ['home', 'Home'],
    ['en_route', 'En route'], ['mines_facility', 'Mines facility'], ['quasi_govt_institution', 'Quasi-government institution'],
  ];
  const place: FormATable = single('Site of delivery', PLACES.map(([k, l]) => [l, countBy('placeOfDelivery', k)] as [string, number]));

  const att = (d: any) => lc(d.attendant);
  const attendant: FormATable = single('Delivery conducted by', [
    ['Doctor', deliveries.filter(d => att(d).includes('doctor')).length],
    ['Midwife', deliveries.filter(d => att(d).includes('midwife')).length],
    ['Nurse', deliveries.filter(d => att(d).includes('nurse')).length],
    ['Community health officer', deliveries.filter(d => att(d).includes('cho') || att(d).includes('community')).length],
    ['TBA (trained)', deliveries.filter(d => att(d).includes('tba') && att(d).includes('trained') && !att(d).includes('untrained')).length],
    ['TBA (untrained)', deliveries.filter(d => att(d).includes('tba') && !(att(d).includes('trained') && !att(d).includes('untrained'))).length],
    ['Other', deliveries.filter(d => !['doctor', 'midwife', 'nurse', 'cho', 'community', 'tba'].some(k => att(d).includes(k))).length],
  ]);

  const cortico = deliveries.filter(d => medications.some(m => m.attendanceId === d.attendanceId && matches(m.StockItem?.name ?? m.name, ['dexamethasone', 'betamethasone']))).length;
  const hasComp = (d: any, keys: string[]) => (d.complications ?? []).some((c: string) => matches(c, keys));
  const pncComp = (keys: string[]) => postnatal.filter(p => (Array.isArray(p.maternalComplications) ? p.maternalComplications : []).some((c: any) => matches(typeof c === 'string' ? c : JSON.stringify(c), keys)) || matches(p.maternalCondition, keys)).length;
  const morbid: FormATable = single('Maternal morbidities & interventions', [
    ['Antenatal corticosteroids given (preterm)', cortico],
    ['Preterm births (< 37 weeks)', deliveries.filter(d => d.gestationWeeks != null && d.gestationWeeks < 37).length],
    ['Postpartum haemorrhage', deliveries.filter(d => hasComp(d, ['pph', 'haemorrhage', 'hemorrhage'])).length],
    ['Eclampsia / pre-eclampsia', deliveries.filter(d => hasComp(d, ['eclampsia'])).length],
    ['Obstructed / prolonged labour', deliveries.filter(d => hasComp(d, ['obstruct', 'prolonged'])).length],
    ['Ruptured uterus', deliveries.filter(d => hasComp(d, ['rupture'])).length],
    ['Sepsis / endometritis', deliveries.filter(d => hasComp(d, ['sepsis', 'endometritis', 'infection'])).length + pncComp(['endometritis', 'sepsis'])],
    ['Obstetric fistula (VVF/RVF) seen', deliveries.filter(d => hasComp(d, ['fistula', 'vvf'])).length],
    ['Foot drop', deliveries.filter(d => hasComp(d, ['foot drop', 'drop foot'])).length],
    ['Puerperal psychosis', pncComp(['psychosis'])],
    ['Mastitis', pncComp(['mastitis'])],
    ['Referred out in labour', deliveries.filter(d => d.referralTo).length],
  ]);

  const deadMoms = deliveries.filter(d => d.maternalOutcome && d.maternalOutcome !== 'alive');
  const mDeaths = byAge(deadMoms, d => d.patient?.dateOfBirth, d => d.deliveryDate);
  const maternalDeaths: FormATable = {
    title: 'Maternal deaths',
    columns: [...AGE_GROUPS, 'Total'],
    rows: [
      { label: 'Maternal deaths', values: [...AGE_GROUPS.map(g => mDeaths.counts[g]), mDeaths.total] },
      { label: 'Direct cause', values: [...AGE_GROUPS.map(g => deadMoms.filter(d => d.maternalOutcome === 'dead_direct_cause' && ageGroup(d.patient?.dateOfBirth, d.deliveryDate) === g).length), deadMoms.filter(d => d.maternalOutcome === 'dead_direct_cause').length] },
      { label: 'Indirect cause', values: [...AGE_GROUPS.map(g => deadMoms.filter(d => d.maternalOutcome === 'dead_indirect_cause' && ageGroup(d.patient?.dateOfBirth, d.deliveryDate) === g).length), deadMoms.filter(d => d.maternalOutcome === 'dead_indirect_cause').length] },
      { label: 'Audited', values: [...AGE_GROUPS.map(g => deadMoms.filter(d => d.maternalDeathsAudited && ageGroup(d.patient?.dateOfBirth, d.deliveryDate) === g).length), deadMoms.filter(d => d.maternalDeathsAudited).length] },
    ],
  };

  const neonatal: FormATable = single('Neonatal deaths', [
    ['Early (0-7 days)', babies.filter(b => b.died === 'early').length],
    ['Late (8-28 days)', babies.filter(b => b.died === 'late').length],
    ['Post-neonatal (29 days – 11 months)', 'n/c', false],
  ]);

  const nbs = deliveries.flatMap(d => d.Newborn ?? []);
  const enc: FormATable = single('Essential newborn care', [
    ['Breastfed within 30 minutes', nbs.filter((n: any) => n.breastfeedingWithin30Min).length],
    ['Eye prophylaxis given', nbs.filter((n: any) => n.eyeProphylaxisGiven).length],
    ['Cord care – chlorhexidine', nbs.filter((n: any) => n.cordCareMethod === 'chlorhexidine').length],
    ['Cord care – methylated spirit', nbs.filter((n: any) => n.cordCareMethod === 'methylated_spirit').length],
    ['Cord care – dry cord', nbs.filter((n: any) => n.cordCareMethod === 'dry_cord').length],
    ['Baby weighed at 6-10 days', nbs.filter((n: any) => n.babyWeightAt6to10Days != null).length],
    ['Resuscitation done', nbs.filter((n: any) => n.resuscitation).length + deliveries.filter(d => !d.Newborn?.length && d.resusCitationDone).length],
  ]);

  // ── Postnatal ──────────────────────────────────────────────────────────────
  const pDay = (p: any) => {
    if (p.dayNumber != null && p.dayNumber > 0 && !p.deliveryRecord?.deliveryDate) return p.dayNumber;
    if (p.deliveryRecord?.deliveryDate) return Math.floor((new Date(p.examinationDate).getTime() - new Date(p.deliveryRecord.deliveryDate).getTime()) / 86400000) + (0);
    return p.dayNumber ?? 1;
  };
  const pAge = byAge(postnatal, p => p.patient?.dateOfBirth, p => p.examinationDate);
  const pncTiming: FormATable = single('PNC attendance by days after delivery', [
    ['Total PNC attendances', postnatal.length],
    ['Within 48 hours (day 0-2)', postnatal.filter(p => pDay(p) <= 2).length],
    ['Day 3-7', postnatal.filter(p => pDay(p) >= 3 && pDay(p) <= 7).length],
    ['Day 8-42 (6 weeks)', postnatal.filter(p => pDay(p) >= 8).length],
  ]);
  const fpm = (p: any) => lc(p.familyPlanningMethodAccepted);
  const FP: [string, string[]][] = [['Pill', ['pill']], ['Injectable', ['inject', 'depo']], ['Implant', ['implant', 'jadelle']], ['IUD', ['iud', 'coil']], ['Condom', ['condom']], ['Sterilisation', ['steril', 'tubal', 'vasect']]];
  const accepted = postnatal.filter(p => p.familyPlanningMethodAccepted);
  const pncFP: FormATable = single('Postnatal family planning', [
    ['FP counselled', postnatal.filter(p => p.familyPlanningDiscussed).length],
    ['FP accepted (any method)', accepted.length],
    ...FP.map(([l, k]) => [`  ${l}`, accepted.filter(p => matches(fpm(p), k)).length] as [string, number]),
    ['  Other method', accepted.filter(p => !FP.some(([, k]) => matches(fpm(p), k))).length],
  ]);
  const pncCare: FormATable = single('Postnatal services', [
    ['Exclusive breastfeeding', postnatal.filter(p => lc(p.breastfeedingStatus).includes('exclusive')).length],
    ['BCG given', postnatal.filter(p => p.bcgGiven).length],
    ['OPV 0 given', postnatal.filter(p => p.opv0Given).length],
    ['Hepatitis B birth dose given', postnatal.filter(p => p.hepB0Given).length],
    ['Baby jaundice', postnatal.filter(p => p.jaundice).length],
    ['Maternal danger signs', postnatal.filter(p => Array.isArray(p.maternalDangerSigns) && p.maternalDangerSigns.length).length],
    ['Baby danger signs', postnatal.filter(p => Array.isArray(p.babyDangerSigns) && p.babyDangerSigns.length).length],
    ['Referred from PNC', postnatal.filter(p => p.referralMade).length],
  ]);

  // ── Male involvement ───────────────────────────────────────────────────────
  const male: FormATable = single('Male partner involvement', [
    ['ANC', new Set([...bookings.filter(b => b.malePartnerInvolved).map(b => b.patientId ?? b.id), ...deliveries.filter(d => d.malePartnerPresentANC).map(d => d.patientId ?? d.id)]).size],
    ['Delivery', deliveries.filter(d => d.malePartnerPresentDelivery).length],
    ['PNC', postnatal.filter(p => p.malePartnerPresentPNC).length],
  ]);

  // ── Birth abnormalities & newborn complications ───────────────────────────
  const anomalies: string[] = nbs.flatMap((n: any) => n.anomalies ?? []);
  const an = (keys: string[]) => anomalies.filter(a => matches(a, keys)).length;
  const KNOWN = ['hare lip', 'cleft', 'anencephaly', 'talipes', 'club foot', 'hydrocephalus', 'spina', 'down', 'trisomy'];
  const abnormal: FormATable = single('Birth abnormalities', [
    ['Cleft lip', an(['hare lip', 'cleft lip'])],
    ['Cleft palate', an(['cleft palate'])],
    ['Anencephaly', an(['anencephaly'])],
    ['Talipes (club foot)', an(['talipes', 'club foot'])],
    ['Hydrocephalus', an(['hydrocephalus'])],
    ['Spina bifida', an(['spina'])],
    ['Down syndrome', an(['down', 'trisomy'])],
    ['Other', anomalies.filter(a => !matches(a, KNOWN)).length],
  ]);
  const newbornDx = (keys: string[]) => postnatal.filter(p => matches(p.babyCondition, keys) || (Array.isArray(p.babyDangerSigns) && p.babyDangerSigns.some((s: any) => matches(typeof s === 'string' ? s : JSON.stringify(s), keys)))).length;
  const newbornComp: FormATable = single('Newborn complications', [
    ['Birth asphyxia', deliveries.filter(d => (d.apgarScore5min != null && d.apgarScore5min < 7) || nbs.some((n: any) => n.deliveryRecordId === d.id && n.apgarScore5min != null && n.apgarScore5min < 7)).length],
    ['Prematurity (< 37 weeks)', deliveries.filter(d => d.gestationWeeks != null && d.gestationWeeks < 37).length],
    ['Low birth weight (< 2.5 kg)', babies.filter(b => b.weight != null && b.weight < 2.5).length],
    ['Neonatal jaundice', postnatal.filter(p => p.jaundice).length],
    ['Neonatal sepsis', newbornDx(['sepsis'])],
    ['Cord / umbilical infection', newbornDx(['umbilical', 'cord infection', 'omphalitis'])],
    ['Ophthalmia neonatorum', newbornDx(['ophthalmia'])],
    ['Congenital anomaly', nbs.filter((n: any) => n.anomalies?.length).length],
    ['Babies referred out', nbs.filter((n: any) => n.referredTo).length],
  ]);

  // ── Abortions ──────────────────────────────────────────────────────────────
  const abAge = byAge(abortions, a => a.patient?.dateOfBirth, a => a.abortionDate);
  const abType = (t: string) => abortions.filter(a => a.abortionType === t).length;
  const abMethod = (m: string) => abortions.filter(a => a.method === m).length;
  const abTables: FormATable[] = [
    ageTable('Abortions by age', 'Abortion cases', abAge),
    single('Abortion by type', [
      ['Spontaneous', abType('spontaneous')], ['Induced (safe)', abType('induced_safe')], ['Induced (unsafe)', abType('induced_unsafe')],
      ['Septic', abType('septic')], ['Incomplete', abType('incomplete')], ['Complete', abType('complete')],
      ['Missed', abType('missed')], ['Recurrent', abType('recurrent')],
    ]),
    single('Abortion management & follow-up', [
      ['Medical', abMethod('medical')], ['Surgical (D&C)', abMethod('surgical_d_and_c')], ['Surgical (MVA)', abMethod('surgical_mva')],
      ['Other / not recorded', abortions.length - abMethod('medical') - abMethod('surgical_d_and_c') - abMethod('surgical_mva')],
      ['With complications', abortions.filter(a => a.complication).length],
      ['Post-abortion FP counselled', abortions.filter(a => a.postAbortionFPCounselled).length],
      ['Post-abortion FP accepted', abortions.filter(a => a.postAbortionFPAccepted).length],
    ]),
  ];

  // ── Referrals ──────────────────────────────────────────────────────────────
  const refStage = (stage: string, dir: string) => referrals.filter(r => r.attendance?.attendanceType === stage && r.referralType === dir).length;
  const referralT: FormATable = {
    title: 'Referrals',
    columns: ['In', 'Out', 'Total'],
    rows: [
      ['Antenatal', 'antenatal'], ['Labour / delivery', 'delivery'], ['Postnatal', 'postnatal'],
    ].map(([l, s]) => ({ label: l, values: [refStage(s, 'incoming'), refStage(s, 'outgoing'), refStage(s, 'incoming') + refStage(s, 'outgoing')] })),
  };
  const refAge = byAge(referrals, r => r.patient?.dateOfBirth ?? r.attendance?.Patient?.dateOfBirth, r => r.referralDate);

  const sections: FormASection[] = [
    { id: 'services', title: 'Facility Services (EMONC)', tables: [facility] },
    { id: 'antenatal', title: '1. Antenatal Care', tables: [
      antenatalAttendance, ageTable('Age at registration', 'New registrants', regAge),
      single('Parity at registration', parityRows), trimester, ipt, tt, ifa, malaria, anaemiaT, screening, pmtct,
    ] },
    { id: 'delivery', title: '2. Deliveries', tables: [
      single('Total deliveries', [['Mothers delivered', deliveries.length]]),
      ageTable('Age of mothers at delivery', 'Deliveries', dAge),
      mode, outcomeOfDelivery, birthsOutcome, birthWeight, primigravidae, place, attendant, enc, morbid, maternalDeaths, neonatal,
    ] },
    { id: 'postnatal', title: '3. Postnatal Care', tables: [pncTiming, ageTable('Age of mothers at PNC', 'PNC attendances', pAge), pncFP, pncCare] },
    { id: 'male', title: '4. Male Involvement', tables: [male] },
    { id: 'newborn', title: '5. Birth Abnormalities & Newborn Complications', tables: [abnormal, newbornComp] },
    { id: 'abortion', title: '6. Abortions', tables: abTables },
    { id: 'referrals', title: '7. Referrals', tables: [referralT, ageTable('Referrals by age', 'Referrals', refAge)] },
  ];

  const notCaptured: string[] = [];
  sections.forEach(s => s.tables.forEach(t => t.rows.forEach(r => { if (r.captured === false) notCaptured.push(`${t.title ? t.title + ' – ' : ''}${r.label}`); })));

  return { sections, notCaptured };
}

export function formAToCSV(report: { period: any; facility: any; form: { sections: FormASection[]; notCaptured: string[] }; generatedAt: Date }): string {
  const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows: string[] = [
    q('GHANA HEALTH SERVICE - MONTHLY MIDWIVES RETURNS (FORM A)'),
    [q('Facility'), q(report.facility.name)].join(','),
    [q('District'), q(report.facility.district)].join(','),
    [q('Region'), q(report.facility.region)].join(','),
    [q('GHF Code'), q(report.facility.ghfCode)].join(','),
    [q('Period'), q(`${report.period.monthName} ${report.period.year}`)].join(','),
    '',
  ];
  report.form.sections.forEach(s => {
    rows.push(q(s.title.toUpperCase()));
    s.tables.forEach(t => {
      if (t.title) rows.push(q(t.title));
      rows.push([q(''), ...t.columns.map(q)].join(','));
      t.rows.forEach(r => rows.push([q(r.label), ...r.values.map(q)].join(',')));
      rows.push('');
    });
  });
  if (report.form.notCaptured.length) {
    rows.push(q('FIELDS NOT CAPTURED BY THE SYSTEM (n/c)'));
    report.form.notCaptured.forEach(n => rows.push(q(n)));
  }
  rows.push('', [q('Report Generated'), q(new Date(report.generatedAt).toISOString())].join(','));
  return rows.join('\n');
}
