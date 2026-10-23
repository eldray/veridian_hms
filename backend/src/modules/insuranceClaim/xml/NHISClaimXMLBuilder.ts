import { Prisma } from '@prisma/client';

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
    const claims = (batch.claims ?? []).filter((c: any) => c && c.items);

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

    // ── Header ──
    const claimId = this.esc(claim.claimNumber ?? '');
    const claimCheckCode = this.esc(claim.claimCheckCode ?? attendance.nhisCCC ?? '');
    // Claims may include multiple medicines authorised under different numbers.
    // The database stores these as a comma-separated list; emit one XML <code> per number.
    const preAuthNumbers = typeof claim.preAuthNumber === 'string'
      ? Array.from(new Set(claim.preAuthNumber.split(',').map((value: string) => value.trim()).filter(Boolean)))
      : [];
    const preAuthXml = preAuthNumbers.length
      ? `<preAuthorizationCodes>${preAuthNumbers.map((number: string) => `<code>${this.esc(number)}</code>`).join('')}</preAuthorizationCodes>`
      : `<preAuthorizationCodes />`;
    const physicianId = this.esc(this.resolvePhysicianLicense(items));

    // ── Member info ──
    const memberNo = this.esc(patient.nhisNumber ?? '');
    const surname = this.esc(patient.surname ?? '');
    const otherNames = this.esc(patient.otherNames ?? '');
    const dob = this.isoDate(patient.dateOfBirth);
    const gender = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'U';
    const hospitalRecNo = this.esc(patient.folderNumber ?? '');
    const isDependant = this.isDependant(patient);

    // ── Service info ──
    const typeOfService = this.esc(claim.typeOfService ?? 'OPD');
    const includesPharmacy =
      items.some((i) => i.itemCategory === 'medicine') ? '1' : '0';
    const typeOfAttendance = this.esc(claim.typeOfAttendance ?? 'EAE');
    const serviceOutcome = this.esc(claim.serviceOutcome ?? 'DISC');
    const mdcCode = this.esc(claim.mdcCode ?? this.deriveMdcFromGdrg(claim.principalGDRG));
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
        const serviceDate = this.isoDate(i.serviceDate ?? claim.createdAt);
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
    const procedureItems = items
      .filter((i) => i.itemCategory === 'procedure')
      .map((i) => {
        const serviceDate = this.isoDate(i.serviceDate ?? claim.createdAt);
        const gdrgCode = this.esc(i.gdrgTariff?.gdrgCode ?? i.code ?? '');
        return `      <entry>
        <serviceDate>${this.esc(serviceDate)}</serviceDate>
        <gdrgCode>${gdrgCode}</gdrgCode>
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
        const serviceDate = this.isoDate(i.serviceDate ?? claim.createdAt);
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
      '      <isUnbundled>0</isUnbundled>',
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

  // ==========================================
  // HELPERS
  // ==========================================

  private resolvePhysicianLicense(items: any[]): string {
    for (const item of items) {
      if (item?.clinician) return String(item.clinician);
      if (item?.prescriberNo) return String(item.prescriberNo);
    }
    return '';
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
    if (Array.isArray(claim.datesOfService) && claim.datesOfService.length) {
      return claim.datesOfService.map((d: any) => String(d));
    }
    if (admission && admission.admissionDate) {
      const start = this.startOfDay(new Date(admission.admissionDate));
      const end = this.startOfDay(
        admission.dischargeDate ? new Date(admission.dischargeDate) : new Date(),
      );
      const dates: string[] = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        dates.push(this.isoDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      return dates;
    }
    return [this.isoDate(attendance.dateTime ?? claim.createdAt)];
  }

  private deriveMdcFromGdrg(gdrg: string | null | undefined): string {
    if (!gdrg) return '';
    const match = gdrg.match(/^[A-Z]+/);
    return match ? match[0] : '';
  }

  private startOfDay(d: Date): Date {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
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