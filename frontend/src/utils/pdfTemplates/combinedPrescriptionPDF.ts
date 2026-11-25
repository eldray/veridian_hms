// src/utils/pdfTemplates/combinedPrescriptionPDF.ts
// All medicines for one visit on one prescription sheet. Built on printKit.
import {
  esc, orDash, payerText, multiline, fmtDate, fmtDateTime, allergyLine, diagnosesOf, clinicianOf,
  resolveHospital, docTitle, patientBanner, section, table, signatures, note, pageShell,
} from './printKit';

export const generateCombinedPrescriptionHTML = (
  medications: any[],
  patient: any,
  attendance: any,
  hospital: any,
  prescriberName: string,
): string => {
  const h = resolveHospital(hospital);
  const meds = Array.isArray(medications) ? medications : [];

  const visitNo = attendance?.attendanceNumber || '';
  const issued =
    meds.map((m) => m?.prescribedAt || m?.createdAt).filter(Boolean).sort()[0] ||
    attendance?.dateTime || attendance?.createdAt || new Date().toISOString();
  const rxNo = `RX-${visitNo || 'NA'}`;

  const first = meds[0] || {};
  const prescriber = clinicianOf(first, 'prescribedBy', 'User_Medication_prescribedByIdToUser', 'prescriber');
  const prescriberLabel = prescriber.name || prescriberName || '';
  const allergies = allergyLine(patient);
  const diagnoses = diagnosesOf(attendance);
  const weight = patient?.weight || attendance?.weight || '';

  const rows = meds.map((m, i) => {
    const name = m?.name || m?.medicationName || m?.description || 'Unnamed medicine';
    const sub = [m?.strength || m?.concentration, m?.code && `Code ${m.code}`].filter(Boolean).join(' · ');
    return [
      String(i + 1),
      `<b>${esc(name)}</b>${sub ? `<div class="muted" style="font-size:8pt">${esc(sub)}</div>` : ''}`,
      orDash(m?.dosage || m?.dose),
      orDash(m?.route || m?.administrationRoute),
      orDash(m?.frequency),
      orDash(m?.duration),
      orDash(m?.quantity),
    ];
  });

  const directions = meds
    .map((m, i) => ({ i: i + 1, name: m?.name || m?.medicationName || m?.description, text: m?.instructions || m?.specialInstructions }))
    .filter((d) => d.text);

  const body = `
    ${docTitle('Prescription', { ref: rxNo, refLabel: 'Rx no.', date: issued, dateLabel: 'Issued' })}
    ${patientBanner(
      patient,
      [
        ['Visit no.', orDash(visitNo)],
        ['Visit date', esc(fmtDate(attendance?.dateTime || attendance?.createdAt || issued))],
        ['Weight', weight ? `${esc(weight)} kg` : '<span class="muted">—</span>'],
        ['Payer', payerText(attendance?.paymentMode || patient?.paymentMode)],
      ],
      issued,
    )}

    ${allergies
      ? note(`<b>ALLERGIES:</b> ${esc(allergies)}`, 'warn')
      : note('<b>Allergies:</b> none recorded — confirm with the patient before dispensing.')}

    ${diagnoses.length
      ? section('Diagnosis', `<div class="text-block">${diagnoses
          .map((d) => `${esc(d.name)}${d.code ? ` <span class="muted">(${esc(d.code)})</span>` : ''}${d.type ? ` <span class="muted">— ${esc(d.type)}</span>` : ''}`)
          .join('<br>')}</div>`, { keepTogether: true })
      : ''}

    ${section(
      `Medicines prescribed (${meds.length})`,
      table({
        head: ['#', 'Medicine', 'Dose', 'Route', 'Frequency', 'Duration', 'Qty'],
        widths: ['5%', '34%', '14%', '9%', '17%', '12%', '9%'],
        align: ['c', undefined, undefined, undefined, undefined, undefined, 'c'],
        rows,
        empty: 'No medicines on this prescription',
      }),
    )}

    ${directions.length
      ? section(
          'Directions for the patient',
          table({
            head: ['#', 'Medicine', 'Directions'],
            widths: ['5%', '30%', '65%'],
            align: ['c'],
            rows: directions.map((d) => [String(d.i), esc(d.name || ''), multiline(d.text)]),
          }),
        )
      : ''}

    ${section(
      'For pharmacy use',
      table({
        head: ['#', 'Medicine', 'Qty dispensed', 'Batch no.', 'Expiry', 'Dispensed by / date'],
        widths: ['5%', '31%', '12%', '16%', '14%', '22%'],
        align: ['c'],
        rows: meds.map((m, i) => [
          String(i + 1),
          esc(m?.name || m?.medicationName || m?.description || ''),
          '&nbsp;',
          m?.dispensedBatchNumber ? esc(m.dispensedBatchNumber) : '&nbsp;',
          m?.dispensedExpiryDate ? esc(fmtDate(m.dispensedExpiryDate)) : '&nbsp;',
          m?.dispensedAt ? esc(fmtDateTime(m.dispensedAt)) : '&nbsp;',
        ]),
      }),
    )}

    ${note('Take exactly as directed and finish each course. Keep out of reach of children. Report any rash, swelling or breathing difficulty to a health worker immediately. This prescription is valid for 30 days from the date of issue.')}

    ${signatures([
      { role: 'Prescriber', name: prescriberLabel, regNo: prescriber.regNo, date: issued },
      { role: 'Dispensing pharmacist' },
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
