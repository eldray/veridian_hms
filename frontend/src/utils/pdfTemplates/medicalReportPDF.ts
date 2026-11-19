// src/utils/pdfTemplates/medicalReportPDF.ts
// Medical report: a doctor's formal report on a patient, for an employer, insurer, school,
// court, embassy or another clinician. The doctor completes the free-text fields; patient
// details and hospital letterhead come from the record. Built on printKit.
import {
  esc, orDash, multiline, fmtDate, allergyLine, diagnosesOf,
  resolveHospital, docTitle, patientBanner, section, signatures, note, kvGrid, pageShell,
} from './printKit';

export interface MedicalReportContent {
  addressee?: string;       // "To whom it may concern", an employer, insurer, court …
  purpose?: string;         // why the report is requested
  history?: string;         // presenting complaint / relevant history
  examination?: string;     // examination findings
  investigations?: string;  // results relied upon
  diagnosis?: string;       // free text; falls back to the visit's recorded diagnoses
  treatment?: string;       // treatment given / ongoing
  prognosis?: string;
  fitness?: '' | 'fit' | 'fit_light_duties' | 'unfit';
  unfitFrom?: string;
  unfitTo?: string;
  followUp?: string;
  remarks?: string;
  doctorName?: string;
  doctorRegNo?: string;
  doctorTitle?: string;     // e.g. Medical Officer
  reportDate?: string;
}

export const FITNESS_LABEL: Record<string, string> = {
  fit: 'Fit for normal duties',
  fit_light_duties: 'Fit for light duties only',
  unfit: 'Unfit for duty',
};

const block = (text?: string) =>
  `<div class="text-block">${text && text.trim() ? multiline(text) : '<span class="muted">Not stated.</span>'}</div>`;

export const generateMedicalReportHTML = (
  report: MedicalReportContent,
  patient: any,
  attendance: any,
  hospital: any,
): string => {
  const h = resolveHospital(hospital);
  const r = report || {};
  const issued = r.reportDate || new Date().toISOString();
  const visitNo = attendance?.attendanceNumber || '';
  const refNo = `MR-${visitNo || 'NA'}`;
  const recorded = diagnosesOf(attendance);
  const diagnosisHtml = r.diagnosis?.trim()
    ? multiline(r.diagnosis)
    : recorded.length
      ? recorded.map((d) => `${esc(d.name)}${d.code ? ` <span class="muted">(${esc(d.code)})</span>` : ''}`).join('<br>')
      : '';
  const allergies = allergyLine(patient);
  const fitness = r.fitness ? FITNESS_LABEL[r.fitness] : '';

  const body = `
    ${docTitle('Medical report', { ref: refNo, refLabel: 'Report no.', date: issued, dateLabel: 'Date of report' })}

    <div class="text-block" style="margin:6px 0 8px">
      <b>To:</b> ${r.addressee?.trim() ? esc(r.addressee) : 'Whom it may concern'}
    </div>

    ${patientBanner(
      patient,
      [
        ['Visit no.', orDash(visitNo)],
        ['Seen on', esc(fmtDate(attendance?.dateTime || attendance?.createdAt))],
        ['Report requested for', orDash(r.purpose)],
        ['Report date', esc(fmtDate(issued))],
      ],
      attendance?.dateTime || issued,
    )}

    ${section('History', block(r.history), { keepTogether: true })}
    ${section('Examination findings', block(r.examination), { keepTogether: true })}
    ${r.investigations?.trim() ? section('Investigations', block(r.investigations), { keepTogether: true }) : ''}
    ${section('Diagnosis', `<div class="text-block">${diagnosisHtml || '<span class="muted">Not stated.</span>'}</div>`, { keepTogether: true })}
    ${section('Treatment', block(r.treatment), { keepTogether: true })}
    ${section('Prognosis and opinion', block(r.prognosis), { keepTogether: true })}

    ${fitness || r.unfitFrom || r.unfitTo
      ? section(
          'Fitness for duty',
          kvGrid(
            [
              ['Opinion', fitness ? `<b>${esc(fitness)}</b>` : '<span class="muted">—</span>'],
              ['From', r.unfitFrom ? esc(fmtDate(r.unfitFrom)) : '&nbsp;'],
              ['To', r.unfitTo ? esc(fmtDate(r.unfitTo)) : '&nbsp;'],
              ['Review / follow-up', orDash(r.followUp)],
            ],
            4,
          ),
          { keepTogether: true },
        )
      : ''}

    ${allergies ? note(`<b>Allergies on record:</b> ${esc(allergies)}`) : ''}
    ${r.remarks?.trim() ? section('Further remarks', block(r.remarks), { keepTogether: true }) : ''}

    ${note('This report is issued at the request of the patient (or the patient\'s guardian) from the hospital record and is confidential. It reflects the examination and records up to the date shown. It is not valid without the doctor\'s signature and the hospital stamp.')}

    ${signatures([
      { role: r.doctorTitle || 'Medical practitioner', name: r.doctorName, regNo: r.doctorRegNo, date: issued },
      { role: 'Hospital stamp', plain: true },
    ])}
  `;

  return pageShell({
    title: `Medical report ${refNo}`,
    hospital: h,
    body,
    footerRef: refNo,
    printLabel: 'Print medical report',
  });
};
