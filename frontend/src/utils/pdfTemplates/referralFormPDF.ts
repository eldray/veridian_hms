// src/utils/pdfTemplates/referralFormPDF.ts
// The printable two-way referral form. Unlike referralLetterPDF, this renders the stored
// Part I / Part II answers, so what the clinician filled in is what the patient carries.
import {
  PART_I_SECTIONS,
  PART_II_SECTIONS,
  readPartI,
  readPartII,
  partHasContent,
} from '../../components/referral/referralForm';

const escapeHtml = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatDay = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : value;
};

const labelFor = (sections: typeof PART_I_SECTIONS, key: string): string => {
  for (const section of sections) {
    const field = section.fields.find(f => f.key === key);
    if (field) return field.label;
  }
  return key;
};

const renderBlock = (
  title: string,
  sections: typeof PART_I_SECTIONS,
  values: Record<string, string>,
): string => {
  const rows = sections.flatMap(section => section.fields.map(field => {
    const value = (values[field.key] ?? '').trim();
    return `
      <tr>
        <th>${escapeHtml(field.label)}</th>
        <td class="${value ? '' : 'blank'}">${value ? escapeHtml(value).replace(/\n/g, '<br/>') : '&nbsp;'}</td>
      </tr>`;
  }));
  return `
    <table class="part">
      <thead><tr><th colspan="2" class="part-title">${escapeHtml(title)}</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
};

export const generateReferralFormHTML = (
  referral: any,
  patient: any,
  hospital: any,
): string => {
  const structured = referral?.structuredForm ?? {};
  const partI = readPartI(structured.partI);
  const partII = readPartII(structured.partII);
  const outgoing = referral?.referralType !== 'incoming';

  const hospitalName = hospital?.name || 'Veridian Hospital';
  const patientName = [patient?.surname, patient?.otherNames].filter(Boolean).join(' ').trim()
    || partI.clientName || 'Patient name not recorded';
  const counterpartFacility = outgoing ? referral?.referredToFacility : referral?.referredFromFacility;
  const counterpartDoctor = outgoing ? referral?.referredToDoctor : referral?.referredFromDoctor;
  const urgency = String(referral?.urgency || 'routine').toUpperCase();

  const identityRows = `
    <tr><th>Patient</th><td>${escapeHtml(patientName)}</td></tr>
    <tr><th>Folder number</th><td>${escapeHtml(patient?.folderNumber || '')}</td></tr>
    <tr><th>Date of birth</th><td>${escapeHtml(patient?.dateOfBirth ? formatDay(patient.dateOfBirth) : (partI.age || ''))}</td></tr>
    <tr><th>Gender</th><td>${escapeHtml(patient?.gender || partI.sex || '')}</td></tr>
    <tr><th>Contact</th><td>${escapeHtml(patient?.contact || '')}</td></tr>
    <tr><th>${outgoing ? 'Referring unit' : 'Referred from'}</th><td>${escapeHtml(outgoing ? (partI.clinicName || hospitalName) : counterpartFacility)}</td></tr>
    <tr><th>${outgoing ? 'Referred to' : 'Referred to'}</th><td>${escapeHtml(outgoing ? counterpartFacility : (partII.institutionName || counterpartDoctor || hospitalName))}</td></tr>
    <tr><th>Referral number</th><td>${escapeHtml(referral?.referralNumber || '')}</td></tr>`;

  const signatureLine = (name: string, title: string) => `
    <div class="sign">
      <div class="sign-line"></div>
      <p class="sign-name">${escapeHtml(name) || 'Signature &amp; stamp'}</p>
      <p class="sign-title">${escapeHtml(title)}</p>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Referral Form - ${escapeHtml(referral?.referralNumber || '')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Verdana, sans-serif; background: #eef2f7; padding: 24px; color: #0f172a; font-size: 12px; }
    .sheet { max-width: 820px; margin: 0 auto; background: #fff; padding: 28px 32px 32px; box-shadow: 0 6px 24px rgba(15,23,42,.12); }
    header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .facility h1 { font-size: 17px; letter-spacing: -.3px; }
    .facility p { font-size: 11px; color: #475569; margin-top: 2px; }
    .doc { text-align: right; }
    .doc .kind { font-size: 13px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; }
    .doc .no { font-family: 'Courier New', monospace; font-size: 12px; margin-top: 3px; }
    .doc .urgency { display: inline-block; margin-top: 6px; padding: 3px 10px; border: 1.5px solid #0f172a; font-size: 10px; font-weight: 700; letter-spacing: .8px; }
    table.part { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    table.part th, table.part td { border: 1px solid #94a3b8; padding: 7px 9px; vertical-align: top; text-align: left; }
    .part-title { background: #0f172a !important; color: #fff; font-size: 11px; letter-spacing: .6px; text-transform: uppercase; padding: 6px 9px !important; }
    table.part tr > th:first-child, table.part td + th { width: 30%; }
    table.part tbody th { font-size: 10.5px; font-weight: 600; color: #334155; background: #f8fafc; }
    table.part td { min-height: 30px; }
    td.blank { color: #cbd5e1; }
    .signatures { display: flex; gap: 24px; margin-top: 20px; padding-top: 12px; border-top: 1px solid #cbd5e1; }
    .sign { flex: 1; }
    .sign-line { border-bottom: 1px solid #0f172a; height: 34px; }
    .sign-name { font-size: 11px; font-weight: 700; margin-top: 4px; }
    .sign-title { font-size: 10px; color: #64748b; }
    .note { margin-top: 16px; font-size: 10px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
    .toolbar { max-width: 820px; margin: 14px auto 0; display: flex; justify-content: center; gap: 10px; }
    .toolbar button { font: inherit; font-size: 13px; font-weight: 600; padding: 9px 22px; border-radius: 8px; border: none; cursor: pointer; }
    .toolbar .print { background: #0f172a; color: #fff; }
    .toolbar .close { background: #e2e8f0; color: #334155; }
    @media print {
      body { background: #fff; padding: 0; font-size: 11px; }
      .sheet { box-shadow: none; max-width: none; padding: 0; }
      .toolbar { display: none; }
      .part-title { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      table.part tbody th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header>
      <div class="facility">
        <h1>${escapeHtml(hospitalName)}</h1>
        <p>${escapeHtml(hospital?.address || '')}</p>
        <p>Tel ${escapeHtml(hospital?.phone || '')} · ${escapeHtml(hospital?.email || '')}</p>
      </div>
      <div class="doc">
        <div class="kind">Two-way referral form</div>
        <div class="no">${escapeHtml(referral?.referralNumber || '')}</div>
        <div class="urgency">${escapeHtml(urgency)}</div>
      </div>
    </header>

    <table class="part">
      <thead><tr><th colspan="2" class="part-title">Patient identification</th></tr></thead>
      <tbody>${identityRows}</tbody>
    </table>

    ${outgoing
      ? renderBlock('Part I — Referral by the health worker', PART_I_SECTIONS, partI as unknown as Record<string, string>)
      : renderBlock('Part II — Report back by the receiving facility', PART_II_SECTIONS, partII as unknown as Record<string, string>)}

    ${outgoing && partHasContent(structured.partII)
      ? renderBlock('Part II — Report back by the receiving facility', PART_II_SECTIONS, partII as unknown as Record<string, string>)
      : ''}
    ${!outgoing && partHasContent(structured.partI)
      ? renderBlock('Part I — Referral by the health worker', PART_I_SECTIONS, partI as unknown as Record<string, string>)
      : ''}

    <div class="signatures">
      ${outgoing
        ? signatureLine(partI.referrerName || referral?.createdBy?.fullName || '', partI.referrerTitle || labelFor(PART_I_SECTIONS, 'referrerTitle'))
        : signatureLine(partII.receiverName || referral?.createdBy?.fullName || '', partII.receiverTitle || '')}
      ${signatureLine('', 'Signature & stamp')}
      ${signatureLine(formatDay(outgoing ? partI.dateOfReferral : (partII.dateReported || partII.dateReceived)), 'Date')}
    </div>

    <p class="note">
      This form accompanies the patient's medical file; the referring unit retains a copy.
      ${escapeHtml(labelFor(PART_I_SECTIONS, 'contactBackName'))}: ${escapeHtml(partI.contactBackName || '—')}
      · ${escapeHtml(labelFor(PART_I_SECTIONS, 'contactBackPhone'))}: ${escapeHtml(partI.contactBackPhone || '—')}
    </p>
  </div>

  <div class="toolbar">
    <button class="print" onclick="window.print()">Print referral form</button>
    <button class="close" onclick="window.close()">Close</button>
  </div>
</body>
</html>`;
};
