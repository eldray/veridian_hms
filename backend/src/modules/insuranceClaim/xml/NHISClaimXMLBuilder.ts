import { Prisma } from '@prisma/client';
import {
  isNHISClaimUnbundled,
  nhisDatesOfService,
  nhisSpecialtiesFor,
} from '../../../utils/nhisAttendanceMapping';

/**
 * Builds NHIS batch XML in the exact format shown in the samples:
 *
 *   <claims>
 *     <claim>
 *       <claimid>NHIS-1002</claimid>
 *       <claimCheckCode>87152</claimCheckCode>
 *       <preAuthorizationCodes />
 *       <physicianID>1234568</physicianID>
 *       <principalGDRG>OPDC06A</principalGDRG>
 *       <memberInfo>…</memberInfo>
 *       <serviceInfo>…</serviceInfo>
 *       <diagnoses><entry>…</entry></diagnoses>
 *       <investigations><entry>…</entry></investigations>
 *       <procedures><entry>…</entry></procedures>
 *       <medicines><entry>…</entry></medicines>
 *     </claim>
 *     …
 *   </claims>
 */
export class NHISClaimXMLBuilder {
  buildBatchXml(batch: any, hospital: any): string {
    const facilityCode = hospital?.nhisFacilityCode ?? '';
    const claims = batch.claims ?? [];
    if (!claims.length) {
      throw new Error('Cannot generate NHIS XML for an empty claim batch.');
    }
    const claimWithoutItems = claims.find((claim: any) => !Array.isArray(claim?.items) || claim.items.length === 0);
    if (claimWithoutItems) {
      throw new Error(`Claim ${claimWithoutItems.claimNumber ?? claimWithoutItems.id ?? 'unknown'} has no itemized lines; NHIS XML generation was stopped to prevent silent omission.`);
    }

    const claimsXml = claims
      .map((claim: any) => this.buildClaimXml(claim, hospital))
      .join('\n');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<claims>',
      `  <!-- Batch ${this.esc(batch.batchNumber)} | Facility ${this.esc(facilityCode)} | Period ${batch.periodYear}-${String(batch.periodMonth).padStart(2, '0')} | Claims ${claims.length} -->`,
      claimsXml,
      '</claims>',
    ].join('\n');
  }


    buildSingleClaimXml(claim: any, hospital: any): string {
    if (!Array.isArray(claim?.items) || claim.items.length === 0) {
      throw new Error(`Claim ${claim?.claimNumber ?? claim?.id ?? 'unknown'} has no itemized lines; NHIS XML generation was stopped.`);
    }
    const claimXml = this.buildClaimXml(claim, hospital);
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<claims>',
      `  <!-- Single claim download | Claim ${this.esc(claim.claimNumber ?? '')} | Facility ${this.esc(hospital?.nhisFacilityCode ?? '')} -->`,
      claimXml,
      '</claims>',
    ].join('\n');
  }

  
  buildClaimXml(claim: any, hospital: any): string {
    const patient = claim.Patient ?? claim.patient ?? {};
    const attendance = claim.Attendance ?? claim.attendance ?? {};
    const admission = attendance?.Admission ?? null;
    const items: any[] = claim.items ?? [];
    this.validateClaimForExport(claim, patient, attendance, items);

    // ── Header ──
    const claimId = this.esc(claim.claimNumber ?? '');
    const claimCheckCode = this.esc(claim.claimCheckCode ?? attendance.nhisCCC ?? '');
    // Claims may include multiple medicines authorised under different numbers.
    // The database stores these as a comma-separated list; emit one XML <code> per number.
    const preAuthNumbers = typeof claim.preAuthNumber === 'string'
      ? Array.from(new Set(claim.preAuthNumber.split(',').map((value: string) => value.trim()).filter(Boolean)))
      : [];
    const preAuthXml = preAuthNumbers.length
      ? `<preAuthorizationCodes>${preAuthNumbers.map((number) => `<code>${this.esc(String(number))}</code>`).join('')}</preAuthorizationCodes>`
      : `<preAuthorizationCodes />`;
    const physicianId = this.esc(this.resolvePhysicianLicense(items, attendance));

    // ── Member info ──
    const memberNo = this.esc(patient.nhisNumber ?? '');
    const surname = this.esc(patient.surname ?? '');
    const otherNames = this.esc(patient.otherNames ?? '');
    const dob = this.isoDate(patient.dateOfBirth);
    const gender = ['male', 'M'].includes(String(patient.gender)) ? 'M' : ['female', 'F'].includes(String(patient.gender)) ? 'F' : 'U';
    const hospitalRecNo = this.esc(patient.folderNumber ?? '');
    const isDependant = this.isDependant(patient);

    // ── Service info ──
    const typeOfService = this.esc(claim.typeOfService ?? 'OPD');
    const includesPharmacy =
      items.some((i) => i.itemCategory === 'medicine') ? '1' : '0';
    // Unbundled cases bill each service outside the G-DRG bundle, and the flag lives on the draft
    // the desk edited because no column was added for it.
    const isUnbundled = isNHISClaimUnbundled(claim) ? '1' : '0';
    const typeOfAttendance = this.esc(claim.typeOfAttendance ?? 'EAE');
    const serviceOutcome = this.esc(claim.serviceOutcome ?? 'DISC');
    const mdcCode = this.esc(claim.mdcCode ?? this.deriveMdcFromGdrg(claim.principalGDRG, claim.typeOfService));
    const datesOfService = this.resolveDatesOfService(claim, attendance, admission)
      .map((d) => `        <date>${this.esc(d)}</date>`)
      .join('\n');

    // ── Diagnoses ──
    const diagnosisItems = items
      .filter((i) => i.itemCategory === 'diagnosis')
      .map((i) => {
        const gdrgCode = this.esc(i.gdrgTariff?.gdrgCode ?? claim.principalGDRG ?? '');
        const icd10 = this.esc(i.code ?? '');
        const description = this.esc(i.description ?? '');
        return `      <entry>
        <gdrgCode>${gdrgCode}</gdrgCode>
        <icd10>${icd10}</icd10>
        <diagnosis>${description}</diagnosis>
      </entry>`;
      })
      .join('\n');
    const diagnosesXml = diagnosisItems
      ? `    <diagnoses>\n${diagnosisItems}\n    </diagnoses>`
      : '';

    // ── Investigations (labs + scans) ──
    const investigationItems = items
      .filter((i) => i.itemCategory === 'investigation')
      .map((i) => {
        const serviceDate = this.isoDate(i.serviceDate);
        const gdrgCode = this.esc(i.gdrgTariff?.gdrgCode ?? i.code ?? '');
        return `      <entry>
        <serviceDate>${this.esc(serviceDate)}</serviceDate>
        <gdrgCode>${gdrgCode}</gdrgCode>
      </entry>`;
      })
      .join('\n');
    const investigationsXml = investigationItems
      ? `    <investigations>\n${investigationItems}\n    </investigations>`
      : '';

    // ── Procedures ──
    // The submitted file pairs every procedure entry with the diagnosis it was done for, so the
    // payer can price the operation against a case rather than against nothing.
    const fallbackIndicationText = String(
      items.find((i) => i.itemCategory === 'diagnosis')?.description ?? ''
    );
    const procedureItems = items
      .filter((i) => i.itemCategory === 'procedure')
      .map((i) => {
        const serviceDate = this.isoDate(i.serviceDate);
        const gdrgCode = this.esc(i.gdrgTariff?.gdrgCode ?? i.code ?? '');
        return `      <entry>
        <serviceDate>${this.esc(serviceDate)}</serviceDate>
        <gdrgCode>${gdrgCode}</gdrgCode>
        <diagnosis>${this.esc(i.diagnosis?.name ?? fallbackIndicationText)}</diagnosis>
      </entry>`;
      })
      .join('\n');
    const proceduresXml = procedureItems
      ? `    <procedures>\n${procedureItems}\n    </procedures>`
      : '';

    // ── Medicines ──
    const medicineItems = items
      .filter((i) => i.itemCategory === 'medicine')
      .map((i) => {
        const code = this.esc(i.code ?? '');
        const qty = String(i.quantity ?? 1);
        const serviceDate = this.isoDate(i.serviceDate);
        const prescription = this.esc(i.prescriptionText ?? '');
        return `      <entry>
        <medicineCode>${code}</medicineCode>
        <dispensedQty>${qty}</dispensedQty>
        <serviceDate>${this.esc(serviceDate)}</serviceDate>
        <prescription>
          <unparsed>${prescription}</unparsed>
        </prescription>
      </entry>`;
      })
      .join('\n');
    const medicinesXml = medicineItems
      ? `    <medicines>\n${medicineItems}\n    </medicines>`
      : '';

    return [
      '  <claim>',
      `    <claimid>${claimId}</claimid>`,
      `    <claimCheckCode>${claimCheckCode}</claimCheckCode>`,
      `    ${preAuthXml}`,
      `    <physicianID>${physicianId}</physicianID>`,
      `    <principalGDRG>${this.esc(claim.principalGDRG ?? '')}</principalGDRG>`,
      '    <memberInfo>',
      `      <memberNo>${memberNo}</memberNo>`,
      `      <surname>${surname}</surname>`,
      `      <otherNames>${otherNames}</otherNames>`,
      `      <dateOfBirth>${this.esc(dob)}</dateOfBirth>`,
      `      <gender>${gender}</gender>`,
      `      <hospitalRecNo>${hospitalRecNo}</hospitalRecNo>`,
      `      <isDependant>${isDependant}</isDependant>`,
      '    </memberInfo>',
      '    <serviceInfo>',
      `      <typeOfService>${typeOfService}</typeOfService>`,
      '      <isUnbundled>' + isUnbundled + '</isUnbundled>',
      `      <includesPharmacy>${includesPharmacy}</includesPharmacy>`,
      `      <typeOfAttendance>${typeOfAttendance}</typeOfAttendance>`,
      `      <serviceOutcome>${serviceOutcome}</serviceOutcome>`,
      '      <specialtiesAttended>',
      `        <mdcCode>${mdcCode}</mdcCode>`,
      '      </specialtiesAttended>',
      '      <datesOfService>',
      datesOfService,
      '      </datesOfService>',
      '    </serviceInfo>',
      diagnosesXml,
      investigationsXml,
      proceduresXml,
      medicinesXml,
      '  </claim>',
    ]
      .filter((line) => line !== '')
      .join('\n');
  }

  private validateClaimForExport(claim: any, patient: any, attendance: any, items: any[]): void {
    const label = String(claim?.claimNumber ?? claim?.id ?? 'unknown');
    const fail = (message: string): never => {
      throw new Error(`Claim ${label} cannot be exported: ${message}.`);
    };
    const required = (value: unknown, field: string) => {
      if (value === null || value === undefined || String(value).trim() === '') fail(`missing ${field}`);
    };

    required(claim?.claimNumber, 'claim number');
    const ccc = String(claim?.claimCheckCode ?? attendance?.nhisCCC ?? '').trim();
    if (!/^\d{5}$/.test(ccc)) fail('Claim Check Code must contain exactly five digits');
    const memberNo = String(patient?.nhisNumber ?? '').replace(/\s/g, '');
    if (!/^(\d{8}|\d{10})$/.test(memberNo)) fail('NHIS membership number must contain 8 or 10 digits');
    required(patient?.surname, 'patient surname');
    required(patient?.otherNames, 'patient other names');
    if (!this.isoDate(patient?.dateOfBirth)) fail('patient date of birth is missing or invalid');
    if (!['male', 'female', 'M', 'F'].includes(String(patient?.gender ?? ''))) fail('patient gender must be male or female');
    required(patient?.folderNumber, 'hospital folder number');
    required(this.resolvePhysicianLicense(items, attendance), 'physician or prescriber licence');
    required(claim?.principalGDRG, 'principal G-DRG');
    const gdrgLines = items.filter((item) => item?.itemCategory === 'gdrg');
    if (!gdrgLines.some((item) => String(item?.gdrgTariff?.gdrgCode ?? item?.code ?? '') === String(claim.principalGDRG))) {
      fail('principal G-DRG is not present on a G-DRG claim line');
    }
    if (!['OPD', 'IPD', 'DIA', 'PHC'].includes(String(claim?.typeOfService ?? ''))) fail('type of service must be OPD, IPD, DIA or PHC');
    if (!['EAE', 'CFU', 'ANC', 'PNC'].includes(String(claim?.typeOfAttendance ?? ''))) fail('type of attendance must be EAE, CFU, ANC or PNC');
    if (!['DISC', 'DIED', 'TFOT', 'ABSC'].includes(String(claim?.serviceOutcome ?? ''))) fail('service outcome must be DISC, DIED, TFOT or ABSC');
    if (!this.resolveDatesOfService(claim, attendance, attendance?.Admission ?? null).length) fail('service dates are missing or invalid');

    const diagnoses = items.filter((item) => item?.itemCategory === 'diagnosis');
    if (!diagnoses.length) fail('at least one diagnosis line is required');
    diagnoses.forEach((item, index) => {
      required(item?.code, `diagnosis line ${index + 1} ICD-10 code`);
      required(item?.description, `diagnosis line ${index + 1} description`);
      required(item?.gdrgTariff?.gdrgCode ?? claim?.principalGDRG, `diagnosis line ${index + 1} G-DRG code`);
    });
    items.filter((item) => item?.itemCategory === 'investigation').forEach((item, index) => {
      required(item?.gdrgTariff?.gdrgCode ?? item?.code, `investigation line ${index + 1} code`);
      if (!this.isoDate(item?.serviceDate)) fail(`investigation line ${index + 1} has no valid service date`);
    });
    items.filter((item) => item?.itemCategory === 'procedure').forEach((item, index) => {
      required(item?.gdrgTariff?.gdrgCode ?? item?.code, `procedure line ${index + 1} code`);
      if (!this.isoDate(item?.serviceDate)) fail(`procedure line ${index + 1} has no valid service date`);
      required(item?.diagnosis?.name ?? diagnoses[0]?.description, `procedure line ${index + 1} diagnosis`);
    });
    items.filter((item) => item?.itemCategory === 'medicine').forEach((item, index) => {
      required(item?.code, `medicine line ${index + 1} NHIS medicine code`);
      const quantity = Number(item?.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) fail(`medicine line ${index + 1} quantity must be greater than zero`);
      if (!this.isoDate(item?.serviceDate)) fail(`medicine line ${index + 1} has no valid dispensing date`);
      required(item?.prescriptionText, `medicine line ${index + 1} prescription`);
    });
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private resolvePhysicianLicense(items: any[], attendance?: any): string {
    for (const item of items) {
      if (item?.clinician) return String(item.clinician);
      if (item?.prescriberNo) return String(item.prescriberNo);
    }
    // Older generated claims may not have copied the licence onto each line. The encounter's
    // assigned provider is the authoritative fallback, not the user who happened to create it.
    return String(attendance?.User_Attendance_providerIdToUser?.licenseNumber ?? '').trim();
  }

  private isDependant(patient: any): string {
    const details = patient?.insuranceDetails;
    if (!details || typeof details !== 'object') return '0';
    const relationship = (details as any).relationship;
    if (!relationship) return '0';
    return relationship === 'self' ? '0' : '1';
  }

  private resolveDatesOfService(
    claim: any,
    attendance: any,
    admission: any,
  ): string[] {
    return nhisDatesOfService(claim, attendance, admission, claim.typeOfService);
  }

  private deriveMdcFromGdrg(gdrg: string | null | undefined, typeOfService?: string | null): string {
    // An outpatient visit reports the OPD scheme whatever family its code is in; only an admission
    // reports the clinical family. Same rule claim generation and the CLAIM-it body use.
    return nhisSpecialtiesFor(typeOfService ?? 'OPD', [gdrg ?? ''])[0] ?? '';
  }

  private isoDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }

  private esc(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}