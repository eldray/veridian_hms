// backend/src/modules/insuranceClaim/claimit/ClaimItClaimBuilder.ts
//
// Builds the claim body CLAIM-it accepts, from the CLAIMS data already itemised in this database.
//
// Format source: "CLAIM-it Data Exchange Protocols - XML Specification" v2.1 (2023-05-15),
// §2.1 for the element list, §2.2 for the accepted code values, §2.3 for what is required.
// The API takes the same document as JSON on /json-api, so one build produces an object and the
// serializer renders it either way - there is no second copy of the mapping to fall out of step.
//
// Note the difference from ./../xml/NHISClaimXMLBuilder, which stays as it is for the manual
// download: this spec is FLAT (`<memberNo>` sits directly under `<claim>`, dates repeat as
// `<dateOfService>`), the id tag is `<claimID>` with a capital ID, and investigations, procedures,
// diagnoses and medicines are repeated sibling elements rather than `<entry>` rows in a container.
// XML element names are case-sensitive, so none of that is cosmetic.

import type { HttpFieldDetail } from '../../../utils/httpError';

/** §2.2 - the eleven specialties CLAIM-it will accept in <specialtyAttended>. */
const SPECIALTIES = new Set(['ENTH', 'ASUR', 'DENT', 'OPHT', 'ORTH', 'MEDI', 'PAED', 'PSUR', 'OBGY', 'RSUR', 'OPDC']);

/** §2.2 - DISC / DIED / TFOT / ABSC. */
const SERVICE_OUTCOMES = new Set(['DISC', 'DIED', 'TFOT', 'ABSC']);

/**
 * The outcomes this app records, in the words CLAIM-it uses.
 *
 * `mapAttendanceToServiceOutcome` emits DTH / REF / ABS, and claim generation stores CONT for an
 * encounter that is still open; none of those are CLAIM-it codes, so they would come back as an
 * ERROR line on the import report.
 */
const SERVICE_OUTCOME_ALIASES: Record<string, string> = { DTH: 'DIED', REF: 'TFOT', ABS: 'ABSC' };

const TYPE_OF_SERVICE = new Set(['OPD', 'IPD', 'DIA', 'PHC']);
const TYPE_OF_ATTENDANCE = new Set(['EAE', 'CFU', 'ANC', 'PNC']);

/** GDRG codes in the spec samples (INVE09D, DENT01A, MEDI28A): four letters, digits, one letter. */
const GDRG_CODE = /^[A-Z]{4}\d{1,2}[A-Z]$/;

/** §2.3 - member number is the 8-digit NHIS number or the 10-digit HIN accepted in v2.0. */
const MEMBER_NUMBER = /^\d{8}$|^\d{10}$/;

/** §2.3 - the claim check code is 5 digits. */
const CLAIM_CHECK_CODE = /^\d{5}$/;

export interface ClaimItInvestigation {
  serviceDate: string;
  gdrgCode: string;
}

export interface ClaimItProcedure {
  serviceDate: string;
  gdrgCode: string;
  icd10: string;
  diagnosis: string;
}

export interface ClaimItDiagnosis {
  gdrgCode: string;
  icd10: string;
  diagnosis: string;
}

export interface ClaimItMedicine {
  medicineCode: string;
  dispensedQty: number;
  serviceDate: string;
  prescription: { unparsed: string };
}

export interface ClaimItClaim {
  claimID: string;
  claimCheckCode: string;
  preAuthorizationCodes: string;
  physicianID: string;
  memberNo: string;
  surname: string;
  otherNames: string;
  dateOfBirth: string;
  gender: string;
  hospitalRecNo: string;
  isDependant: string;
  typeOfService: string;
  isUnbundled: string;
  includesPharmacy: string;
  typeOfAttendance: string;
  serviceOutcome: string;
  dateOfService: string[];
  specialtyAttended: string[];
  investigation: ClaimItInvestigation[];
  procedure: ClaimItProcedure[];
  diagnosis: ClaimItDiagnosis[];
  medicine: ClaimItMedicine[];
  principalGDRG: string;
}

const isoDate = (value: unknown): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

/** Every calendar day the patient was under care; a plain visit is its own single date. */
const datesOfService = (claim: any, attendance: any, admission: any): string[] => {
  if (Array.isArray(claim?.datesOfService) && claim.datesOfService.length) {
    return claim.datesOfService.map((d: unknown) => isoDate(d)).filter(Boolean);
  }
  if (admission?.admissionDate) {
    const midnight = (value: unknown): Date => {
      const date = value instanceof Date ? new Date(value) : new Date(String(value));
      date.setHours(0, 0, 0, 0);
      return date;
    };
    const dates: string[] = [];
    const cursor = midnight(admission.admissionDate);
    const end = midnight(admission.dischargeDate ?? new Date());
    while (cursor.getTime() <= end.getTime()) {
      const day = cursor.toISOString().slice(0, 10);
      if (!dates.includes(day)) dates.push(day);
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }
  const single = isoDate(attendance?.dateTime ?? claim?.createdAt);
  return single ? [single] : [];
};

/**
 * The specialties this encounter touched, read off the GDRG codes on the claim.
 *
 * A GDRG code begins with its specialty (MEDI28A is Adult Medicine), and the codes are already the
 * same eleven CLAIM-it lists, so the claim's own lines answer this. Nothing is invented: a claim
 * carrying no recognisable GDRG simply sends no specialty, and the pre-flight check names it.
 */
const specialtiesFrom = (gdrgCodes: string[]): string[] => {
  const found = gdrgCodes
    .map((code) => String(code).match(/^[A-Z]+/)?.[0] ?? '')
    .filter((prefix) => SPECIALTIES.has(prefix));
  return Array.from(new Set(found));
};

const memberNumber = (patient: any): string => {
  const raw = String(patient?.nhisNumber ?? '').replace(/[\s\-]/g, '');
  return /^\d{8}$|^\d{10}$/.test(raw) ? raw : String(patient?.nhisNumber ?? '').trim();
};

/**
 * A claim as CLAIM-it wants it.
 *
 * `claim.items` must be loaded with `gdrgTariff` and `diagnosis`; the lines are the payload, so
 * a claim built without them would submit an empty claim and NHIS would pay nothing for it.
 */
export function buildClaimItClaim(claim: any): ClaimItClaim {
  const patient = claim?.Patient ?? claim?.patient ?? {};
  const attendance = claim?.Attendance ?? claim?.attendance ?? {};
  const admission = attendance?.Admission ?? attendance?.admission ?? null;
  const items: any[] = Array.isArray(claim?.items) ? claim.items : [];
  const byCategory = (category: string) => items.filter((item) => item?.itemCategory === category);

  const diagnoses = byCategory('diagnosis').map((item) => ({
    gdrgCode: String(item?.gdrgTariff?.gdrgCode ?? ''),
    icd10: String(item?.diagnosis?.icdCode ?? item?.code ?? ''),
    diagnosis: String(item?.diagnosis?.name ?? item?.description ?? ''),
  }));

  const procedures = byCategory('procedure').map((item) => ({
    serviceDate: isoDate(item?.serviceDate ?? claim?.createdAt),
    gdrgCode: String(item?.gdrgTariff?.gdrgCode ?? ''),
    // §2.3 requires the procedure's own diagnosis: its ICD-10 and its wording.
    icd10: String(item?.diagnosis?.icdCode ?? ''),
    diagnosis: String(item?.diagnosis?.name ?? ''),
  }));

  const investigations = byCategory('investigation').map((item) => ({
    serviceDate: isoDate(item?.serviceDate ?? claim?.createdAt),
    gdrgCode: String(item?.gdrgTariff?.gdrgCode ?? ''),
  }));

  const medicines = byCategory('medicine').map((item) => ({
    medicineCode: String(item?.code ?? ''),
    dispensedQty: Number(item?.quantity ?? 1) || 1,
    serviceDate: isoDate(item?.serviceDate ?? claim?.createdAt),
    prescription: { unparsed: String(item?.prescriptionText ?? '') },
  }));

  const relationship = patient?.insuranceDetails?.relationship;
  const gender = patient?.gender === 'male' ? 'M' : patient?.gender === 'female' ? 'F' : '';
  const recordedOutcome = String(claim?.serviceOutcome ?? '');
  const outcome = SERVICE_OUTCOME_ALIASES[recordedOutcome] ?? recordedOutcome ?? 'DISC';

  return {
    claimID: String(claim?.claimNumber ?? ''),
    claimCheckCode: String(claim?.claimCheckCode ?? attendance?.nhisCCC ?? ''),
    preAuthorizationCodes: String(claim?.preAuthNumber ?? '')
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean)
      .join(','),
    physicianID: firstPhysician(items),
    memberNo: memberNumber(patient),
    surname: String(patient?.surname ?? '').trim(),
    otherNames: String(patient?.otherNames ?? '').trim(),
    dateOfBirth: isoDate(patient?.dateOfBirth),
    gender,
    hospitalRecNo: String(patient?.folderNumber ?? '').trim(),
    isDependant: relationship && relationship !== 'self' ? '1' : '0',
    typeOfService: String(claim?.typeOfService ?? ''),
    // Bundled (0) is what the itemised claim has always been billed as. Whether a claim with
    // separately billed lines should send 1 is a billing rule CLAIM-it applies, not something this
    // mapping can guess from the data.
    isUnbundled: '0',
    includesPharmacy: medicines.length > 0 ? '1' : '0',
    typeOfAttendance: String(claim?.typeOfAttendance ?? ''),
    serviceOutcome: outcome,
    dateOfService: datesOfService(claim, attendance, admission),
    specialtyAttended: specialtiesFrom([
      String(claim?.principalGDRG ?? ''),
      ...diagnoses.map((d) => d.gdrgCode),
      ...procedures.map((p) => p.gdrgCode),
      ...investigations.map((i) => i.gdrgCode),
    ]),
    investigation: investigations,
    procedure: procedures,
    diagnosis: diagnoses,
    medicine: medicines,
    principalGDRG: String(claim?.principalGDRG ?? ''),
  };
}

/**
 * The medical director's number for the claim.
 *
 * There is no licence number on a User row, so - exactly as the XML download does - the first
 * clinician recorded on a line is used. `physicianID` is required, so when no line carries one the
 * pre-flight check names it instead of letting CLAIM-it reject the claim.
 */
function firstPhysician(items: any[]): string {
  for (const item of items) {
    const value = String(item?.clinician ?? item?.prescriberNo ?? '').trim();
    if (value) return value;
  }
  return '';
}

/** The GDRG codes the claim's own lines carry; the principal is chosen from among these. */
const lineGdrgCodes = (claim: ClaimItClaim): string[] =>
  Array.from(new Set([
    ...claim.diagnosis.map((d) => d.gdrgCode),
    ...claim.procedure.map((p) => p.gdrgCode),
    ...claim.investigation.map((i) => i.gdrgCode),
  ].filter(Boolean)));

/**
 * The GDRG codes held on the claim record but not sent as their own element.
 *
 * A bundled admission carries its billing GDRG as a `gdrg` line, which CLAIM-it reads through
 * `<principalGDRG>` rather than as a separate element - so the validator needs to know it exists,
 * or every correctly generated inpatient claim looks like it named a principal from outside the claim.
 */
export function claimGdrgCodes(claim: any): string[] {
  const items: any[] = Array.isArray(claim?.items) ? claim.items : [];
  return Array.from(new Set(
    items
      .filter((item) => item?.itemCategory === 'gdrg' || item?.itemCategory === 'service')
      .map((item) => String(item?.gdrgTariff?.gdrgCode ?? item?.code ?? ''))
      .filter((code) => GDRG_CODE.test(code)),
  ));
}

/**
 * What stops this claim being paid, said as the field to fix.
 *
 * §2.3 lists what is required, and CLAIM-it answers a submission with one ERROR line per claim and
 * a code nobody reading a toast can act on. Checking the same rules here - before the HTTP call -
 * turns "the batch failed" into "the patient has no NHIS number".
 */
export function findClaimItBlockers(claim: ClaimItClaim, bundledGdrgCodes: string[] = []): HttpFieldDetail[] {
  const blockers: HttpFieldDetail[] = [];
  const add = (field: string, message: string, code = 'REQUIRED') => blockers.push({ field, message, code });

  if (!claim.claimID) add('claimID', 'The claim has no claim number to reference it by.');

  if (!claim.memberNo) add('memberNo', `Claim ${claim.claimID || '(unnumbered)'} has no NHIS number for the patient.`);
  else if (!MEMBER_NUMBER.test(claim.memberNo)) {
    add('memberNo', `NHIS number "${claim.memberNo}" is not an 8-digit number or a 10-digit HIN.`);
  }

  if (!claim.surname) add('surname', 'The patient surname is empty on this claim.');
  if (!claim.otherNames) add('otherNames', 'The patient other names are empty on this claim.');
  if (!claim.hospitalRecNo) add('hospitalRecNo', 'The patient has no folder number on this claim.');
  if (!claim.dateOfBirth) add('dateOfBirth', 'The patient date of birth is missing, so CLAIM-it cannot check the age split.');
  if (!claim.gender) add('gender', 'The patient gender is not M or F, which CLAIM-it requires.');

  if (!claim.claimCheckCode) add('claimCheckCode', 'This claim has no Claim Check Code; generate the CCC before submitting.');
  else if (!CLAIM_CHECK_CODE.test(claim.claimCheckCode)) {
    add('claimCheckCode', `Claim Check Code "${claim.claimCheckCode}" is not the 5 digits CLAIM-it expects.`);
  }

  if (!claim.dateOfService.length) add('dateOfService', 'The claim carries no date of service.');
  if (!claim.typeOfService) add('typeOfService', 'The type of service is not set on this claim.');
  else if (!TYPE_OF_SERVICE.has(claim.typeOfService)) {
    add('typeOfService', `Type of service "${claim.typeOfService}" must be OPD, IPD, DIA or PHC.`);
  }
  if (!claim.typeOfAttendance) add('typeOfAttendance', 'The type of attendance is not set on this claim.');
  else if (!TYPE_OF_ATTENDANCE.has(claim.typeOfAttendance)) {
    add('typeOfAttendance', `Type of attendance "${claim.typeOfAttendance}" must be EAE, CFU, ANC or PNC.`);
  }
  if (!SERVICE_OUTCOMES.has(claim.serviceOutcome)) {
    add('serviceOutcome', `Service outcome "${claim.serviceOutcome || '(blank)'}" must be DISC, DIED, TFOT or ABSC. An admission still open cannot be claimed.`);
  }

  const lineCodes = lineGdrgCodes(claim);
  // The GDRGs "used in the claim", as CLAIM-it means it: every code the claim carries, whether or
  // not it becomes its own element.
  const usedCodes = Array.from(new Set([...lineCodes, ...bundledGdrgCodes]));
  const allCodes = Array.from(new Set([claim.principalGDRG, ...usedCodes].filter(Boolean)));
  if (allCodes.length === 0) add('principalGDRG', 'The claim has no GDRG code, so there is nothing for CLAIM-it to price.');
  if (!claim.specialtyAttended.length && allCodes.length) {
    add('specialtyAttended', `None of the GDRG codes on this claim (${allCodes.join(', ')}) start with a recognised specialty.`);
  }
  if (claim.typeOfService === 'IPD' && !claim.principalGDRG) {
    add('principalGDRG', 'An inpatient claim needs the principal GDRG that the visit is billed under.');
  }
  // §2.2: the principal is the code CLAIM-it bills, so it must be one the claim already uses.
  if (claim.principalGDRG && usedCodes.length > 0 && !usedCodes.includes(claim.principalGDRG)) {
    add('principalGDRG', `Principal GDRG "${claim.principalGDRG}" is not one of the GDRG codes on this claim (${usedCodes.join(', ')}).`);
  }
  for (const code of allCodes) {
    if (!GDRG_CODE.test(code)) add('principalGDRG', `GDRG code "${code}" is not in the expected form, for example MEDI28A.`);
  }

  if (!claim.diagnosis.length) add('diagnosis', 'The claim has no diagnosis line; every claim needs at least one ICD-10 diagnosis.');
  for (const [index, entry] of claim.diagnosis.entries()) {
    if (!entry.icd10) add(`diagnosis[${index}]`, `Diagnosis line ${index + 1} ("${entry.diagnosis || entry.gdrgCode}") has no ICD-10 code.`);
    if (!entry.gdrgCode) add(`diagnosis[${index}]`, `Diagnosis line ${index + 1} ("${entry.diagnosis}") has no GDRG code.`);
  }
  for (const [index, entry] of claim.procedure.entries()) {
    // §2.3: procedure GDRGs only, and each needs its own date and major diagnosis.
    if (!entry.icd10 || !entry.diagnosis) {
      add(`procedure[${index}]`, `Procedure line ${index + 1} has no diagnosis attached to it; CLAIM-it requires the ICD-10 and description for every procedure.`);
    }
    if (!entry.serviceDate) add(`procedure[${index}]`, `Procedure line ${index + 1} has no date of service.`);
    if (!entry.gdrgCode) add(`procedure[${index}]`, `Procedure line ${index + 1} has no GDRG code.`);
  }
  for (const [index, entry] of claim.investigation.entries()) {
    if (!entry.gdrgCode) add(`investigation[${index}]`, `Investigation line ${index + 1} has no GDRG code.`);
    if (!entry.serviceDate) add(`investigation[${index}]`, `Investigation line ${index + 1} has no date of service.`);
  }
  for (const [index, entry] of claim.medicine.entries()) {
    if (!entry.medicineCode) add(`medicine[${index}]`, `Medicine line ${index + 1} has no medicine code.`);
    if (!entry.prescription.unparsed) add(`medicine[${index}]`, `Medicine line ${index + 1} ("${entry.medicineCode}") has no prescription text.`);
    if (!entry.serviceDate) add(`medicine[${index}]`, `Medicine line ${index + 1} has no dispensing date.`);
  }

  return blockers;
}

const esc = (value: string): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const leaf = (name: string, value: string): string => `    <${name}>${esc(value)}</${name}>`;

/** The claim as the spec's element list, in the spec's order. */
export function claimToXmlLines(claim: ClaimItClaim): string[] {
  const lines: string[] = [
    '  <claim>',
    leaf('claimID', claim.claimID),
    leaf('claimCheckCode', claim.claimCheckCode),
    leaf('preAuthorizationCodes', claim.preAuthorizationCodes),
    leaf('physicianID', claim.physicianID),
    leaf('memberNo', claim.memberNo),
    leaf('surname', claim.surname),
    leaf('otherNames', claim.otherNames),
    leaf('dateOfBirth', claim.dateOfBirth),
    leaf('gender', claim.gender),
    leaf('hospitalRecNo', claim.hospitalRecNo),
    leaf('isDependant', claim.isDependant),
    leaf('typeOfService', claim.typeOfService),
    leaf('isUnbundled', claim.isUnbundled),
    leaf('includesPharmacy', claim.includesPharmacy),
    leaf('typeOfAttendance', claim.typeOfAttendance),
    leaf('serviceOutcome', claim.serviceOutcome),
  ];

  for (const date of claim.dateOfService) lines.push(leaf('dateOfService', date));
  for (const specialty of claim.specialtyAttended) lines.push(leaf('specialtyAttended', specialty));

  for (const entry of claim.investigation) {
    lines.push('    <investigation>', leaf('serviceDate', entry.serviceDate), leaf('gdrgCode', entry.gdrgCode), '    </investigation>');
  }
  for (const entry of claim.procedure) {
    lines.push(
      '    <procedure>',
      leaf('serviceDate', entry.serviceDate),
      leaf('gdrgCode', entry.gdrgCode),
      leaf('icd10', entry.icd10),
      leaf('diagnosis', entry.diagnosis),
      '    </procedure>',
    );
  }
  for (const entry of claim.diagnosis) {
    lines.push(
      '    <diagnosis>',
      leaf('gdrgCode', entry.gdrgCode),
      leaf('icd10', entry.icd10),
      leaf('diagnosis', entry.diagnosis),
      '    </diagnosis>',
    );
  }
  for (const entry of claim.medicine) {
    lines.push(
      '    <medicine>',
      leaf('medicineCode', entry.medicineCode),
      leaf('dispensedQty', String(entry.dispensedQty)),
      leaf('serviceDate', entry.serviceDate),
      '    <prescription>',
      leaf('unparsed', entry.prescription.unparsed),
      '    </prescription>',
      '    </medicine>',
    );
  }

  lines.push(leaf('principalGDRG', claim.principalGDRG), '  </claim>');
  return lines;
}

/** `<claims>` batch document, exactly as §2.1 shows it. */
export function toClaimItXml(claims: ClaimItClaim[]): string {
  const body = claims.flatMap((claim) => claimToXmlLines(claim)).join('\n');
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<claims>', body, '</claims>'].join('\n');
}

/**
 * The same claim for /json-api.
 *
 * Repeated XML elements become arrays here (`<dateOfService>` twice is `dateOfService` of two), and
 * `<medicine>`/`<prescription>` nesting is kept as an object so the two formats describe one claim.
 * The element a claim ends with in XML, `principalGDRG`, is sent as the spec lists it - last.
 */
export function toClaimItJson(claims: ClaimItClaim[]) {
  return { claims: claims.map((claim) => ({ ...claim })) };
}
