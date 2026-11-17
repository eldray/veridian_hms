// src/utils/pdfTemplates/prescriptionPDF.ts
// Single-medicine prescription. Built on printKit so it matches every other hospital document.
import {
  esc, orDash, payerText, multiline, fmtDate, fmtDateTime, allergyLine, diagnosesOf, clinicianOf,
  resolveHospital, docTitle, patientBanner, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

export const generatePrescriptionHTML = (
  medication: any,
  patient: any,
  attendance: any,
  hospital: any,
): string => {
  const h = resolveHospital(hospital);
  const med = medication || {};

  const prescriber = clinicianOf(
    med,
    'prescribedBy',
    'User_Medication_prescribedByIdToUser',
    'prescriber',
    'prescribedByName',
    'prescriberName',
  );
  const dispenser = clinicianOf(med, 'dispensedBy', 'User_Medication_dispensedByIdToUser');
  const prescribedAt = med.prescribedAt || med.createdAt || new Date().toISOString();
  const visitNo = attendance?.attendanceNumber || '';
  // Stable per prescription: reprinting the same prescription must show the same number.
  const rxNo = `RX-${visitNo || 'NA'}-${String(med.id || '').slice(-6).toUpperCase() || '000000'}`;

  const name = med.name || med.medicationName || 'Unnamed medicine';
  const strength = med.strength || med.concentration || '';
  const dose = med.dosage || med.dose || '';
  const route = med.route || med.administrationRoute || '';
  const frequency = med.frequency || '';
  const duration = med.duration || '';
  const quantity = med.quantity ?? '';
  const directions =
    med.instructions || med.specialInstructions ||
    [dose && `Take ${dose}`, route && `by ${route}`, frequency, duration && `for ${duration}`].filter(Boolean).join(' ');

  const allergies = allergyLine(patient);
  const diagnoses = diagnosesOf(attendance);
  const weight = patient?.weight || attendance?.weight || attendance?.Vitals?.[0]?.weight || '';

  const banner = patientBanner(
    patient,
    [
      ['Visit no.', orDash(visitNo)],
      ['Visit date', esc(fmtDate(attendance?.dateTime || attendance?.createdAt || prescribedAt))],
      ['Weight', weight ? `${esc(weight)} kg` : '<span class="muted">—</span>'],
      ['Payer', payerText(attendance?.paymentMode || patient?.paymentMode)],
    ],
    prescribedAt,
  );

  const body = `
    ${docTitle('Prescription', { ref: rxNo, refLabel: 'Rx no.', date: prescribedAt, dateLabel: 'Issued' })}
    ${banner}

    ${allergies
      ? note(`<b>ALLERGIES:</b> ${esc(allergies)}`, 'warn')
      : note('<b>Allergies:</b> none recorded — confirm with the patient before dispensing.')}

    ${diagnoses.length
      ? section('Diagnosis', `<div class="text-block">${diagnoses
          .map((d) => `${esc(d.name)}${d.code ? ` <span class="muted">(${esc(d.code)})</span>` : ''}${d.type ? ` <span class="muted">— ${esc(d.type)}</span>` : ''}`)
          .join('<br>')}</div>`, { keepTogether: true })
      : ''}

    ${section(
      'Medicine prescribed',
      table({
        head: ['Medicine', 'Strength', 'Dose', 'Route', 'Frequency', 'Duration', 'Qty'],
        widths: ['27%', '11%', '12%', '10%', '17%', '13%', '10%'],
        align: [undefined, undefined, undefined, undefined, undefined, undefined, 'c'],
        rows: [[`<b>${esc(name)}</b>`, orDash(strength), orDash(dose), orDash(route), orDash(frequency), orDash(duration), orDash(quantity)]],
      }),
      { keepTogether: true },
    )}

    ${section(
      'Directions for the patient',
      `<div class="text-block"><b>${multiline(directions || 'As directed by the prescriber.')}</b></div>
       ${med.notes || med.prescriberNotes ? `<div class="text-block" style="margin-top:4px"><span class="muted">Prescriber's note:</span> ${multiline(med.notes || med.prescriberNotes)}</div>` : ''}`,
      { keepTogether: true },
    )}

    ${section(
      'For pharmacy use',
      kvGrid(
        [
          ['Dispensed by', orDash(dispenser.name)],
          ['Date / time dispensed', med.dispensedAt ? esc(fmtDateTime(med.dispensedAt)) : '&nbsp;'],
          ['Batch no.', med.dispensedBatchNumber ? esc(med.dispensedBatchNumber) : '&nbsp;'],
          ['Expiry date', med.dispensedExpiryDate ? esc(fmtDate(med.dispensedExpiryDate)) : '&nbsp;'],
        ],
        4,
      ),
      { keepTogether: true },
    )}

    ${note('Take exactly as directed and finish the course. Keep out of reach of children. Report any rash, swelling or breathing difficulty to a health worker immediately. This prescription is valid for 30 days from the date of issue.')}

    ${signatures([
      { role: 'Prescriber', name: prescriber.name, regNo: prescriber.regNo, date: prescribedAt },
      { role: 'Dispensing pharmacist', name: dispenser.name, regNo: dispenser.regNo },
      { role: 'Patient / guardian (received)', plain: true },
    ])}
  `;

  return pageShell({
    title: `Prescription ${rxNo}`,
    hospital: h,
    body,
    footerRef: rxNo,
    printLabel: 'Print prescription',
  });
};
