// src/utils/pdfTemplates/referralLetterPDF.ts
// Referral letter: addressed to the receiving clinician, summarises why the patient is sent.
// Built on printKit. Nothing is invented: missing facts are left blank to be written in by hand.
import {
  esc, orDash, multiline, fmtDate, patientBanner, allergyLine, diagnosesOf, clinicianOf,
  resolveHospital, docTitle, section, signatures, note, pageShell,
} from './printKit';

export const generateReferralLetterHTML = (referral: any, patient: any, hospital: any): string => {
  const h = resolveHospital(hospital);
  const refNo = referral?.referralNumber || '';
  const date = referral?.referralDate || referral?.createdAt || new Date().toISOString();
  const urgency = String(referral?.urgency || 'routine').toUpperCase();

  const facility = referral?.referredToFacility || '';
  const doctor = referral?.referredToDoctor || '';
  const dept = referral?.referredToDepartment || '';
  const reason = referral?.referralReason || referral?.reason || '';
  const notes = referral?.referralNotes || '';

  const sender = clinicianOf(referral, 'createdBy', 'referringDoctor');
  const senderName = referral?.referringClinician || sender.name;
  const allergies = allergyLine(patient);
  const diagnoses = diagnosesOf(referral?.attendance || referral?.Attendance);

  const salutation = doctor ? `Dear ${esc(doctor)},` : 'Dear Colleague,';

  const body = `
    ${docTitle('Referral letter', { ref: refNo, refLabel: 'Referral no.', date, dateLabel: 'Date', status: urgency })}

    <div class="text-block" style="margin:6px 0 10px">
      <b>To:</b> ${doctor ? esc(doctor) : '<span class="muted">The receiving clinician</span>'}<br>
      ${dept ? `${esc(dept)}<br>` : ''}
      ${facility ? `<b>${esc(facility)}</b>` : '<span class="muted">Receiving facility: ______________________________</span>'}
    </div>

    ${patientBanner(
      patient,
      [
        ['Referral no.', orDash(refNo)],
        ['Urgency', `<b>${esc(urgency)}</b>`],
        ['Referred from', esc(h.name)],
        ['Referral date', esc(fmtDate(date))],
      ],
      date,
    )}

    ${allergies ? note(`<b>ALLERGIES:</b> ${esc(allergies)}`, 'warn') : ''}

    <div class="text-block" style="margin:10px 0 4px">${salutation}</div>
    <div class="text-block" style="margin-bottom:8px">
      I would be grateful if you would see and manage the patient named above, referred from ${esc(h.name)}.
    </div>

    ${section('Reason for referral', `<div class="text-block">${reason ? multiline(reason) : '<span class="muted">Not stated.</span>'}</div>`, { keepTogether: true })}

    ${diagnoses.length
      ? section('Diagnosis', `<div class="text-block">${diagnoses.map((d) => `${esc(d.name)}${d.code ? ` <span class="muted">(${esc(d.code)})</span>` : ''}`).join('<br>')}</div>`, { keepTogether: true })
      : ''}

    ${notes ? section('Clinical notes', `<div class="text-block">${multiline(notes)}</div>`) : ''}

    <div class="text-block" style="margin:8px 0">
      Please send a report on your findings and the care given to the address below. Thank you for your assistance.
    </div>
    <div class="text-block" style="margin-bottom:6px">Yours sincerely,</div>

    ${signatures([
      { role: 'Referring clinician', name: senderName, regNo: sender.regNo, date },
      { role: 'Facility stamp', plain: true },
    ])}

    ${note(`Reply to: <b>${esc(h.name)}</b>${h.address ? `, ${esc(h.address)}` : ''}${h.phone ? ` · Tel ${esc(h.phone)}` : ''}${h.email ? ` · ${esc(h.email)}` : ''}. This letter contains confidential patient information intended only for the addressee.`)}
  `;

  return pageShell({
    title: `Referral letter ${refNo}`,
    hospital: h,
    body,
    footerRef: refNo ? `Referral ${refNo}` : undefined,
    printLabel: 'Print referral letter',
  });
};
