// src/utils/pdfTemplates/referralFormPDF.ts
// Two-way referral form. Renders the stored Part I / Part II answers, so what the clinician
// filled in is what the patient carries. Built on printKit.
import {
  PART_I_SECTIONS, PART_II_SECTIONS, readPartI, readPartII, partHasContent,
} from '../../components/referral/referralForm';
import {
  esc, orDash, multiline, fmtDate, patientName as pName, ageText, sexText, allergyLine,
  resolveHospital, docTitle, section, signatures, note, kvGrid, pageShell,
} from './printKit';

type Sections = typeof PART_I_SECTIONS;

// Short fields sit in a grid, prose fields get their own full-width block.
const renderPart = (title: string, sections: Sections, values: Record<string, string>): string => {
  const inner = sections
    .map((s) => {
      const short = s.fields.filter((f) => !f.wide);
      const wide = s.fields.filter((f) => f.wide);
      const val = (k: string) => {
        const v = String(values[k] ?? '').trim();
        return /^\d{4}-\d{2}-\d{2}/.test(v) ? fmtDate(v) : v;
      };
      return `
        <div style="font-size:8pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin:6px 0 2px">${esc(s.title)}</div>
        ${short.length ? kvGrid(short.map((f) => [f.label, val(f.key) ? esc(val(f.key)) : '&nbsp;'] as [string, string]), Math.min(4, Math.max(2, short.length))) : ''}
        ${wide
          .map(
            (f) => `<div class="kv keep" style="border:1px solid var(--rule);border-top:0;padding:4px 6px">
              <div class="kv-k">${esc(f.label)}</div>
              <div class="kv-v" style="min-height:${val(f.key) ? 0 : 22}px">${val(f.key) ? multiline(val(f.key)) : '&nbsp;'}</div>
            </div>`,
          )
          .join('')}`;
    })
    .join('');
  return section(title, inner);
};

export const generateReferralFormHTML = (referral: any, patient: any, hospital: any): string => {
  const h = resolveHospital(hospital);
  const structured = referral?.structuredForm ?? {};
  const partI = readPartI(structured.partI);
  const partII = readPartII(structured.partII);
  const outgoing = referral?.referralType !== 'incoming';
  const refNo = referral?.referralNumber || '';
  const urgency = String(referral?.urgency || 'routine').toUpperCase();
  const when = partI.dateOfReferral || referral?.referralDate || referral?.createdAt;

  const name = pName(patient) || partI.clientName || '';
  const counterpartFacility = outgoing ? referral?.referredToFacility : referral?.referredFromFacility;
  const counterpartDoctor = outgoing ? referral?.referredToDoctor : referral?.referredFromDoctor;
  const from = outgoing ? (partI.clinicName ? `${partI.clinicName}, ${h.name}` : h.name) : counterpartFacility;
  const to = outgoing ? counterpartFacility : (partII.institutionName || h.name);
  const allergies = allergyLine(patient);

  const identity = section(
    'Patient and referral',
    kvGrid(
      [
        ['Patient', `<b>${esc(name || 'Not recorded')}</b>`],
        ['Folder no.', orDash(patient?.folderNumber)],
        ['Age', patient?.dateOfBirth ? esc(ageText(patient, when)) : orDash(partI.age)],
        ['Sex', patient ? sexText(patient) : orDash(partI.sex)],
        ['Date of birth', patient?.dateOfBirth ? esc(fmtDate(patient.dateOfBirth)) : '<span class="muted">—</span>'],
        ['Contact', orDash(patient?.contact || patient?.phone)],
        ['NHIS no.', orDash(patient?.nhisNumber || patient?.insurancePolicyNumber)],
        ['Referral date', when ? esc(fmtDate(when)) : '<span class="muted">—</span>'],
        ['Referred from', orDash(from)],
        ['Referred to', orDash(to)],
        ['Attention', orDash(counterpartDoctor)],
        ['Urgency', `<b>${esc(urgency)}</b>`],
      ],
      4,
    ),
    { keepTogether: true },
  );

  const p1 = renderPart('Part I — Referral by the health worker', PART_I_SECTIONS, partI as unknown as Record<string, string>);
  const p2 = renderPart('Part II — Report back by the receiving facility', PART_II_SECTIONS, partII as unknown as Record<string, string>);
  const showP1 = outgoing || partHasContent(structured.partI);
  const showP2 = true; // outgoing: left blank for the receiving facility to complete and return

  const sigs = [
    outgoing
      ? { role: partI.referrerTitle || 'Referring health worker', name: partI.referrerName || referral?.createdBy?.fullName || '', regNo: referral?.createdBy?.licenseNumber, date: partI.dateOfReferral || when }
      : { role: partII.receiverTitle || 'Receiving health worker', name: partII.receiverName || referral?.createdBy?.fullName || '', regNo: referral?.createdBy?.licenseNumber, date: partII.dateReported || partII.dateReceived },
    { role: 'Facility stamp', plain: true },
  ];

  const body = `
    ${docTitle('Two-way referral form', { ref: refNo, refLabel: 'Referral no.', date: when, dateLabel: 'Referred', status: urgency })}
    ${identity}
    ${allergies ? note(`<b>ALLERGIES:</b> ${esc(allergies)}`, 'warn') : ''}
    ${showP1 ? p1 : ''}
    ${showP2 ? p2 : ''}
    ${note(`This form travels with the patient. The receiving facility completes Part II and returns it to <b>${esc(partI.contactBackName || h.name)}</b>${partI.contactBackPhone ? ` (${esc(partI.contactBackPhone)})` : h.phone ? ` (${esc(h.phone)})` : ''}. The referring unit keeps a copy in the patient's file. Patient information is confidential.`)}
    ${signatures(sigs)}
  `;

  return pageShell({
    title: `Referral form ${refNo}`,
    hospital: h,
    body,
    footerRef: refNo ? `Referral ${refNo}` : undefined,
    printLabel: 'Print referral form',
  });
};
