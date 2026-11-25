// src/utils/pdfTemplates/thermalPrescriptionPDF.ts
// Prescription slip for a POS receipt printer: patient, allergy alert, each medicine with its directions.
import { esc, orDash, multiline, fmtDate, fmtDateTime, ageText, sexText, patientName, allergyLine, diagnosesOf, clinicianOf } from './printKit';
import {
  resolveHospital, slipHeader, slipTitle, rule, gap, centre, row, field, alertBox, signLine, slipFooter, slipShell,
  getThermalWidth,
} from './thermalKit';

/** Accepts one medication or many; both the single and the combined prescription print on this slip. */
export const generateThermalPrescriptionHTML = (
  medications: any | any[],
  patient: any,
  attendance: any,
  hospital: any,
  prescriberName?: string,
  paperWidth?: number,
): string => {
  const h = resolveHospital(hospital);
  const width = getThermalWidth(paperWidth);
  const meds: any[] = Array.isArray(medications) ? medications : medications ? [medications] : [];

  const first = meds[0] || {};
  const prescriber = clinicianOf(first, 'prescribedBy', 'User_Medication_prescribedByIdToUser', 'prescriber');
  const prescriberLabel = prescriber.name || prescriberName || '';
  const visitNo = attendance?.attendanceNumber || '';
  const issued = meds.map((m) => m?.prescribedAt || m?.createdAt).filter(Boolean).sort()[0] || attendance?.dateTime || new Date().toISOString();
  const rxNo = meds.length === 1 && first?.id ? `RX-${visitNo || 'NA'}-${String(first.id).slice(-6).toUpperCase()}` : `RX-${visitNo || 'NA'}`;

  const allergies = allergyLine(patient);
  const dx = diagnosesOf(attendance);
  const weight = patient?.weight || attendance?.weight || '';

  const medsHtml = meds.length
    ? `<table class="table compact rx-table">
        <thead><tr><th style="width:42%">Medicine</th><th style="width:58%">Instructions</th></tr></thead>
        <tbody>${meds.map((m) => {
          const name = m?.name || m?.medicationName || m?.description || 'Medicine';
          const strength = m?.strength || m?.concentration || '';
          const dose = m?.dosage || m?.dose || '';
          const frequency = m?.frequency || '';
          const duration = m?.duration ? `for ${m.duration}` : '';
          const quantity = m?.quantity != null ? `Qty ${m.quantity}` : '';
          const route = m?.route || '';
          const instructions = m?.instructions || '';
          const directions = [dose, frequency, duration, quantity].filter(Boolean).join(' · ');
          return `<tr><td class="med-name">${esc(name)}${strength ? ` ${esc(strength)}` : ''}</td><td>${esc(directions || 'As directed')}${route ? `<div class="secondary">${esc(route)}</div>` : ''}</td></tr>${instructions ? `<tr><td colspan="2" class="med-directions">${multiline(instructions)}</td></tr>` : ''}`;
        }).join('')}</tbody></table>
    `
    : centre('No medicines', 'sm');

  const body = `
    ${slipHeader(h)}
    ${slipTitle('Prescription')}
    ${row('Rx no.', esc(rxNo))}
    ${row('Date', esc(fmtDateTime(issued)))}
    ${visitNo ? row('Visit no.', esc(visitNo)) : ''}
    ${rule()}
    ${field('Patient', esc(patientName(patient)))}
    ${row('Folder no.', orDash(patient?.folderNumber))}
    ${row('Age / Sex', `${esc(ageText(patient, issued))} / ${sexText(patient)}`)}
    ${weight ? row('Weight', `${esc(weight)} kg`) : ''}
    ${patient?.nhisNumber ? row('NHIS no.', esc(patient.nhisNumber)) : ''}
    ${allergies ? alertBox(`ALLERGY: ${esc(allergies)}`) : `${gap()}${centre('Allergies: none recorded', 'sm')}`}
    ${dx.length ? `${rule()}${field('Diagnosis', dx.map((d) => esc(d.name)).join('; '))}` : ''}
    ${rule()}
    <div class="b">Rx</div>
    ${medsHtml || centre('No medicines', 'sm')}
    ${rule()}
    ${signLine('Prescriber', prescriberLabel)}
    ${prescriber.regNo ? centre(`Reg. no. ${esc(prescriber.regNo)}`, 'sm') : ''}
    ${signLine('Dispensed by / date')}
    ${slipFooter(['Take as directed. Finish the course.', 'Valid 30 days from issue date.'])}
  `;
  return slipShell({ title: `Prescription ${rxNo}`, body, width, printLabel: 'Print prescription' });
};
