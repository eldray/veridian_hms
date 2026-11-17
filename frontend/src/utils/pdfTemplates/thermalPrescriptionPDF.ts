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

  const medsHtml = meds
    .map((m, i) => {
      const name = m?.name || m?.medicationName || m?.description || 'Medicine';
      const strength = m?.strength || m?.concentration || '';
      const how = [m?.dosage || m?.dose, m?.route, m?.frequency, m?.duration && `x ${m.duration}`].filter(Boolean).join(', ');
      return `<div class="item">
        <div class="name">${i + 1}. ${esc(name)}${strength ? ` ${esc(strength)}` : ''}</div>
        <div class="detail">${esc(how || 'As directed')}</div>
        ${m?.quantity ? `<div class="detail">Qty: <b>${esc(m.quantity)}</b></div>` : ''}
        ${m?.instructions ? `<div class="detail sm">${multiline(m.instructions)}</div>` : ''}
      </div>`;
    })
    .join('');

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
