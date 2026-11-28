// src/utils/pdfTemplates/dischargeSummaryPDF.ts
// Inpatient discharge summary: what the next clinician or the patient's own doctor needs.
import { getWardName, getBedNumber } from '../wardDisplay';
import {
  esc, orDash, payerText, multiline, fmtDate, fmtDateTime, allergyLine, clinicianOf,
  resolveHospital, docTitle, patientBanner, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

const DISCHARGE_STATUS: Record<string, string> = {
  home: 'Discharged home',
  transfer: 'Transferred to another facility',
  expired: 'Died in hospital',
  against_medical_advice: 'Left against medical advice',
};

/** Whole days between admission and discharge; same-day stays count as 1 day. */
const stayDays = (from: unknown, to: unknown): string => {
  const a = from ? new Date(from as any) : null;
  const b = to ? new Date(to as any) : null;
  if (!a || !b || isNaN(a.getTime()) || isNaN(b.getTime())) return '';
  const days = Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86_400_000));
  return `${days} day${days === 1 ? '' : 's'}`;
};

export const generateDischargeSummaryHTML = (
  admission: any,
  attendance: any,
  patient: any,
  clinicalData: any,
  hospital: any,
): string => {
  const h = resolveHospital(hospital);
  const adm = admission || {};
  const admissionNo = adm.admissionNumber || '';
  const admittedAt = adm.admissionDate || adm.createdAt;
  const dischargedAt = adm.dischargeDate || null;
  const refNo = `DS-${admissionNo || attendance?.attendanceNumber || 'NA'}`;

  const doctor = clinicianOf(adm, 'doctor', 'admittingDoctor', 'admittedBy');
  const ward = getWardName(adm, attendance) || '';
  const bed = getBedNumber(adm, attendance) || '';
  const outcome = DISCHARGE_STATUS[String(adm.dischargeStatus || '')] || (adm.status === 'discharged' ? 'Discharged' : String(adm.status || ''));
  const los = adm.lengthOfStay ? String(adm.lengthOfStay) : stayDays(admittedAt, dischargedAt);
  const allergies = allergyLine(patient);

  const diagnoses: any[] = Array.isArray(clinicalData?.diagnoses) ? clinicalData.diagnoses : [];
  const meds: any[] = Array.isArray(clinicalData?.medications) ? clinicalData.medications : [];
  const procedures: any[] = Array.isArray(clinicalData?.procedures) ? clinicalData.procedures : [];

  const reason = adm.reasonForAdmission || '';
  const admissionDx = adm.admissionDiagnosis || '';
  const dischargeDx = adm.dischargeDiagnosis || '';
  const course = adm.dischargeSummary || '';
  const followUp = adm.followUpInstructions || '';

  const died = String(adm.dischargeStatus) === 'expired';

  const body = `
    ${docTitle('Discharge summary', { ref: admissionNo || refNo, refLabel: 'Admission no.', date: dischargedAt || new Date(), dateLabel: dischargedAt ? 'Discharged' : 'Printed', status: dischargedAt ? undefined : 'NOT YET DISCHARGED' })}
    ${patientBanner(
      patient,
      [
        ['Ward / bed', orDash([ward, bed && `Bed ${bed}`].filter(Boolean).join(' · '))],
        ['Admitted', admittedAt ? esc(fmtDateTime(admittedAt)) : '<span class="muted">—</span>'],
        ['Discharged', dischargedAt ? esc(fmtDateTime(dischargedAt)) : '<span class="muted">—</span>'],
        ['Length of stay', orDash(los)],
        ['Admitting doctor', orDash(doctor.name)],
        ['Outcome', orDash(outcome)],
        ['Visit no.', orDash(attendance?.attendanceNumber)],
        ['Payer', payerText(adm.paymentMode || attendance?.paymentMode || patient?.paymentMode)],
      ],
      dischargedAt || admittedAt || new Date(),
    )}

    ${allergies
      ? note(`<b>ALLERGIES:</b> ${esc(allergies)}`, 'warn')
      : note('<b>Allergies:</b> none recorded.')}

    ${reason ? section('Reason for admission', `<div class="text-block">${multiline(reason)}</div>`, { keepTogether: true }) : ''}

    ${section(
      'Diagnoses',
      kvGrid(
        [
          ['Admission diagnosis', admissionDx ? multiline(admissionDx) : '<span class="muted">Not specified</span>'],
          ['Discharge diagnosis', dischargeDx ? multiline(dischargeDx) : '<span class="muted">Not recorded</span>'],
        ],
        2,
      ) +
        (diagnoses.length
          ? `<div style="height:6px"></div>${table({
              head: ['Recorded diagnosis', 'ICD-10', 'Type'],
              widths: ['64%', '16%', '20%'],
              rows: diagnoses.map((d: any) => [
                esc(d?.Diagnosis?.name || d?.diagnosis?.name || d?.name || ''),
                orDash(d?.icdCode || d?.Diagnosis?.icdCode || d?.code),
                orDash(String(d?.diagnosisType || d?.type || '').replace(/_/g, ' ')),
              ]),
            })}`
          : ''),
      { keepTogether: true },
    )}

    ${procedures.length
      ? section(
          'Procedures during stay',
          table({
            head: ['Procedure', 'Date', 'Status'],
            widths: ['58%', '22%', '20%'],
            rows: procedures.map((p: any) => [
              esc(p?.name || p?.ProcedureTemplate?.name || 'Procedure'),
              esc(fmtDate(p?.scheduledDate || p?.performedAt || p?.createdAt)),
              esc(String(p?.status || '').replace(/_/g, ' ')),
            ]),
          }),
        )
      : ''}

    ${section('Course in hospital', course ? `<div class="text-block">${multiline(course)}</div>` : '<div class="muted">No summary of the hospital course has been recorded.</div>')}

    ${died
      ? ''
      : section(
          'Medicines on discharge',
          table({
            head: ['Medicine', 'Dose', 'Route', 'Frequency', 'Duration'],
            widths: ['36%', '16%', '10%', '20%', '18%'],
            rows: meds.map((m: any) => [
              `<b>${esc(m?.name || m?.medicationName || 'Medicine')}</b>`,
              orDash(m?.dosage || m?.dose),
              orDash(m?.route),
              orDash(m?.frequency),
              orDash(m?.duration),
            ]),
            empty: 'No medicines recorded for discharge',
          }),
        )}

    ${died
      ? ''
      : section(
          'Follow-up and advice',
          `<div class="text-block">${followUp ? multiline(followUp) : '<span class="muted">No follow-up instructions recorded.</span>'}</div>` +
            note('Return to the hospital or the nearest health facility at once for fever that returns, difficulty breathing, severe pain, bleeding, persistent vomiting, confusion or any worsening of the condition.', 'warn'),
        )}

    ${signatures([
      { role: 'Discharging doctor', name: doctor.name, regNo: doctor.regNo, date: dischargedAt },
      { role: died ? 'Next of kin (informed)' : 'Patient / guardian (received)', plain: true },
    ])}
  `;

  return pageShell({
    title: `Discharge summary ${admissionNo}`,
    hospital: h,
    body,
    footerRef: admissionNo ? `Admission ${admissionNo}` : refNo,
    printLabel: 'Print summary',
  });
};
