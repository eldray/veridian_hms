// src/utils/pdfTemplates/insuranceClaimPDF.ts
// Insurance / NHIA claim form for one attendance.
// Prints only what the claim actually holds. A missing member number, CCC, G-DRG or facility code
// is shown as blank and listed in a "not ready to submit" box, never replaced by a made-up default.
import {
  NHIS_ATTENDANCE_OPTIONS, NHIS_SERVICE_OUTCOME_LABELS, mapAttendanceToNHIS,
  nhisSpecialtiesFor, normalizeNHISAttendanceCode, normalizeNHISOutcomeCode, OPD_SCHEME_SPECIALTY,
} from '../nhisAttendanceMapping';
import {
  esc, orDash, human, money, fmtDate, ageText, sexText, patientName, diagnosesOf,
  resolveHospital, docTitle, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

const n = (v: unknown): number => Number(v) || 0;
const amt = (v: unknown): string => money(v).replace('GHS ', '');
const STATUS_LABEL: Record<string, string> = {
  draft: 'DRAFT', submitted: 'SUBMITTED', approved: 'APPROVED', rejected: 'REJECTED', paid: 'PAID', partially_paid: 'PART PAID',
};

export const generateInsuranceClaimHTML = (claim: any, patient: any, hospital: any): string => {
  const h = resolveHospital(hospital);
  const att = claim?.Attendance || {};
  const diagnoses = diagnosesOf(att);
  const labTests: any[] = att.LabTest || [];
  const scans: any[] = att.Scan || [];
  const medications: any[] = att.Medication || [];
  const procedures: any[] = att.Procedure || [];
  const services: any[] = att.ServiceRendered || [];

  const isNHIS =
    claim?.InsuranceProvider?.type === 'nhis' || claim?.insuranceProvider?.type === 'nhis' ||
    claim?.typeOfService === 'NHIS' || att.paymentMode === 'nhis';

  const attendedAt = att.dateTime || att.createdAt || claim?.createdAt;
  const claimNo = claim?.claimNumber || '';
  const status = String(claim?.status || 'draft');

  // The member number is the insurer's number; a hospital folder number must never stand in for it.
  const memberNo = String(patient?.insurancePolicyNumber || patient?.nhisNumber || '').trim();
  const ccc = String(att.nhisCCC || '').trim();
  const facilityCode = h.nhisFacilityCode;
  const principalGDRG = String(claim?.principalGDRG || claim?.gdrgCodes?.[0] || '').trim();

  const mapped = mapAttendanceToNHIS(att.attendanceType, !!att.Admission);
  const serviceCode = claim?.typeOfService || mapped.typeOfService;
  const mdc = nhisSpecialtiesFor(serviceCode, [claim?.mdcCode, principalGDRG])[0] || OPD_SCHEME_SPECIALTY;
  const dob = patient?.dateOfBirth ? new Date(patient.dateOfBirth) : null;
  const ref = attendedAt ? new Date(attendedAt) : new Date();
  const ageYears = dob && !isNaN(dob.getTime())
    ? Math.max(0, ref.getFullYear() - dob.getFullYear() - (ref.getMonth() < dob.getMonth() || (ref.getMonth() === dob.getMonth() && ref.getDate() < dob.getDate()) ? 1 : 0))
    : null;
  const ageSplit = ageYears === null ? '' : ageYears >= 12 ? 'A' : 'C';
  const provider = claim?.InsuranceProvider?.name || claim?.insuranceProvider?.name || '';
  const typeOfService = serviceCode === 'IPD' ? 'In-patient' : 'Out-patient';
  const outcome = NHIS_SERVICE_OUTCOME_LABELS[normalizeNHISOutcomeCode(claim?.serviceOutcome)] ?? 'Discharged';
  const attendanceType =
    NHIS_ATTENDANCE_OPTIONS.find((o) => o.value === (normalizeNHISAttendanceCode(claim?.typeOfAttendance) || mapped.typeOfAttendance))?.label ||
    'Emergency / acute episode';

  // ── Line items ────────────────────────────────────────────────────────────────
  const medItems = medications.map((m) => {
    const unit = n(m.unitPrice ?? m.dispensedUnitCost);
    const qty = n(m.quantity) || 1;
    return {
      code: m.StockItem?.drugCode || m.code || '',
      name: m.name || m.ServiceCatalog?.name || 'Medicine',
      detail: [m.dosage, m.frequency, m.duration && `x ${m.duration}`].filter(Boolean).join(' '),
      qty, unit, total: qty * unit,
    };
  });
  const investigations = [...labTests, ...scans].map((i) => ({
    code: i.LabTestTemplate?.investigationCode || i.ScanTemplate?.investigationCode || i.ServiceCatalog?.nhisServiceCode || '',
    name: i.ServiceCatalog?.name || i.name || 'Investigation',
    date: i.requestedAt || i.createdAt,
    total: n(i.unitPrice),
  }));
  const procItems = procedures.map((p) => ({ code: p.ProcedureTemplate?.procedureCode || p.ServiceCatalog?.nhisServiceCode || '', name: p.ProcedureTemplate?.name || p.ServiceCatalog?.name || p.name || 'Procedure', total: n(p.unitPrice) }));
  const svcItems = services.map((s) => ({ code: s.ServiceCatalog?.code || '', name: s.ServiceCatalog?.name || s.name || 'Service', total: n(s.unitPrice) }));

  const totalClaim = n(claim?.totalClaimAmount) || n(claim?.Bill?.totalAmount);
  const medTotal = medItems.reduce((s, m) => s + m.total, 0);
  const invTotal = investigations.reduce((s, i) => s + i.total, 0);
  const procTotal = procItems.reduce((s, p) => s + p.total, 0);
  const svcTotal = svcItems.reduce((s, x) => s + x.total, 0);
  const gdrgAmount = totalClaim - medTotal - invTotal - procTotal - svcTotal;
  const approved = n(claim?.approvedAmount);
  const paid = n(claim?.paidAmount);

  // ── Readiness check (NHIS claims need these to be accepted) ─────────────────────
  const missing: string[] = [];
  if (isNHIS) {
    if (!memberNo) missing.push('member (NHIS) number');
    if (!ccc) missing.push('Claim Check Code (CCC)');
    if (!principalGDRG) missing.push('principal G-DRG code');
    if (!facilityCode) missing.push('facility NHIA code (set it in hospital settings)');
    if (!diagnoses.length) missing.push('diagnosis (ICD-10)');
  }

  const noun = isNHIS ? 'NHIS claim form' : 'Insurance claim';
  const body = `
    ${docTitle(noun, { ref: claimNo, refLabel: 'Claim no.', date: attendedAt, dateLabel: 'Attendance', status: STATUS_LABEL[status] || status.toUpperCase() })}

    ${missing.length ? note(`<b>Not ready to submit — missing:</b> ${missing.map(esc).join('; ')}.`, 'warn') : ''}

    ${section('Member', kvGrid(
      [
        ['Member name', `<b>${esc(patientName(patient))}</b>`],
        [isNHIS ? 'NHIS member no.' : 'Policy / member no.', memberNo ? `<b>${esc(memberNo)}</b>` : '<span class="muted">—</span>'],
        ['Claim check code (CCC)', orDash(ccc)],
        ['Folder no.', orDash(patient?.folderNumber)],
        ['Sex', sexText(patient)],
        ['Date of birth', esc(fmtDate(patient?.dateOfBirth))],
        ['Age at attendance', esc(ageText(patient, attendedAt))],
        ['Contact', orDash(patient?.contact || patient?.phone || patient?.mobile)],
      ],
      4,
    ), { keepTogether: true })}

    ${section('Facility and service', kvGrid(
      [
        ['Facility', `<b>${esc(h.name)}</b>`],
        ['NHIA facility code', orDash(facilityCode)],
        ['Insurer / scheme', orDash(provider)],
        ['Type of service', esc(typeOfService)],
        ['Type of attendance', esc(attendanceType)],
        ['Specialty (MDC) / age split', `${esc(mdc)}${esc(ageSplit)}`],
        ['Principal G-DRG', principalGDRG ? `<b>${esc(principalGDRG)}</b>` : '<span class="muted">—</span>'],
        ['Service outcome', esc(outcome)],
        ...(att.Admission
          ? ([
              ['Admitted', esc(fmtDate(att.Admission.admissionDate))],
              ['Discharged', att.Admission.dischargeDate ? esc(fmtDate(att.Admission.dischargeDate)) : '<span class="muted">—</span>'],
            ] as Array<[string, string]>)
          : []),
      ],
      4,
    ), { keepTogether: true })}

    ${section('Diagnoses', table({
      head: ['#', 'ICD-10', 'Diagnosis', 'Type'],
      widths: ['5%', '14%', '61%', '20%'],
      align: ['c'],
      rows: diagnoses.map((d, i) => [String(i + 1), orDash(d.code), esc(d.name), orDash(d.type)]),
      empty: 'No diagnosis recorded',
    }), { keepTogether: true })}

    ${medItems.length ? section('Medicines', table({
      head: ['Code', 'Medicine', 'Qty', 'Unit price', 'Amount'],
      widths: ['14%', '46%', '8%', '16%', '16%'],
      align: [undefined, undefined, 'c', 'r', 'r'],
      rows: medItems.map((m) => [orDash(m.code), `<b>${esc(m.name)}</b>${m.detail ? `<div class="muted" style="font-size:8pt">${esc(m.detail)}</div>` : ''}`, String(m.qty), esc(amt(m.unit)), esc(amt(m.total))]),
      foot: [['', '', '', 'Subtotal', esc(amt(medTotal))]],
    })) : ''}

    ${investigations.length ? section('Investigations', table({
      head: ['Code', 'Investigation', 'Date', 'Amount'],
      widths: ['16%', '50%', '18%', '16%'],
      align: [undefined, undefined, undefined, 'r'],
      rows: investigations.map((i) => [orDash(i.code), esc(i.name), esc(fmtDate(i.date)), esc(amt(i.total))]),
      foot: [['', '', 'Subtotal', esc(amt(invTotal))]],
    })) : ''}

    ${procItems.length ? section('Procedures', table({
      head: ['Code', 'Procedure', 'Amount'],
      widths: ['16%', '68%', '16%'],
      align: [undefined, undefined, 'r'],
      rows: procItems.map((p) => [orDash(p.code), esc(p.name), esc(amt(p.total))]),
      foot: [['', 'Subtotal', esc(amt(procTotal))]],
    })) : ''}

    ${svcItems.length ? section('Other services', table({
      head: ['Code', 'Service', 'Amount'],
      widths: ['16%', '68%', '16%'],
      align: [undefined, undefined, 'r'],
      rows: svcItems.map((s) => [orDash(s.code), esc(s.name), esc(amt(s.total))]),
      foot: [['', 'Subtotal', esc(amt(svcTotal))]],
    })) : ''}

    ${section('Claim summary', table({
      head: ['Component', 'Amount (GHS)'],
      widths: ['70%', '30%'],
      align: [undefined, 'r'],
      rows: [
        ['G-DRG tariff (consultation, bed, nursing and other bundled services)', esc(amt(Math.max(0, gdrgAmount)))],
        ['Medicines', esc(amt(medTotal))],
        ['Investigations', esc(amt(invTotal))],
        ['Procedures', esc(amt(procTotal))],
        ['Other services', esc(amt(svcTotal))],
      ],
      foot: [
        ['Total claim amount', esc(amt(totalClaim))],
        ...(approved > 0 || paid > 0
          ? [['Approved by insurer', esc(amt(approved))], ['Paid by insurer', esc(amt(paid))], ['Outstanding', esc(amt(Math.max(0, (approved || totalClaim) - paid)))]]
          : []),
      ],
    }), { keepTogether: true })}

    ${note('<b>Declaration:</b> I certify that the services listed were provided to the member named above, that the details are correct, and that no part of this claim has been, or will be, charged to the member.')}

    ${signatures([
      { role: 'Member / guardian', plain: true },
      { role: 'Attending clinician' },
      { role: 'Claims officer (stamp)', plain: true },
    ])}
  `;

  return pageShell({
    title: `${noun} ${claimNo}`,
    hospital: h,
    body,
    footerRef: claimNo ? `Claim ${claimNo}` : undefined,
    printLabel: 'Print claim',
  });
};
