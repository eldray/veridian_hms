// src/utils/pdfTemplates/visitSummaryPDF.ts
// Outpatient visit summary: what happened at this attendance, on one page where possible.
import { getScanDisplayName } from '../scan';
import {
  esc, orDash, payerText, multiline, fmtDate, fmtDateTime, allergyLine, diagnosesOf, clinicianOf,
  resolveHospital, docTitle, patientBanner, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

const arr = (...c: any[]): any[] => {
  for (const x of c) if (Array.isArray(x) && x.length) return x;
  return [];
};

/** Latest vitals set whether the API sent one object or a list. */
const latestVitals = (att: any): any | null => {
  const raw = att?.vitals || att?.vitalSigns || att?.Vitals || att?.vitalsRecords;
  if (!raw) return null;
  if (!Array.isArray(raw)) return raw;
  return [...raw].sort((a, b) => String(b?.recordedAt || b?.createdAt || '').localeCompare(String(a?.recordedAt || a?.createdAt || '')))[0] || null;
};

export const generateVisitSummaryHTML = (attendance: any, patient: any, hospital: any): string => {
  const h = resolveHospital(hospital);
  const att = attendance || {};
  const visitNo = att.attendanceNumber || '';
  const visitAt = att.dateTime || att.createdAt || new Date().toISOString();
  const refNo = `VS-${visitNo || 'NA'}`;

  const complaints = att.complaints || att.chiefComplaint || '';
  const exam = att.examination || att.physicalExam || '';
  const notes = att.medicalNotes || att.notes || att.clinicalNotes || '';
  const assessment = att.assessment || '';
  const vitals = latestVitals(att);
  const diagnoses = diagnosesOf(att);
  const meds = arr(att.medications, att.Medication);
  const labs = arr(att.labTests, att.LabTest);
  const procedures = arr(att.procedures, att.Procedure);
  const scans = arr(att.scans, att.Scan);
  const allergies = allergyLine(patient);
  const clinician = clinicianOf(att, 'provider', 'User', 'attendingDoctor', 'attendingClinician');
  const status = String(att.status || '').replace(/_/g, ' ');
  const kind = String(att.attendanceType || att.type || '').replace(/_/g, ' ');

  const vitalPairs: Array<[string, string]> = vitals
    ? ([
        ['Blood pressure', vitals.systolic ? `${vitals.systolic}/${vitals.diastolic ?? '—'} mmHg` : ''],
        ['Pulse', vitals.heartRate ? `${vitals.heartRate} bpm` : ''],
        ['Resp. rate', vitals.respiratoryRate ? `${vitals.respiratoryRate} /min` : ''],
        ['Temperature', vitals.temperature ? `${vitals.temperature} °C` : ''],
        ['SpO₂', vitals.oxygenSaturation ? `${vitals.oxygenSaturation} %` : ''],
        ['Weight', vitals.weight ? `${vitals.weight} kg` : ''],
        ['Height', vitals.height ? `${vitals.height} cm` : ''],
        ['BMI', vitals.bmi ? String(vitals.bmi) : ''],
      ] as Array<[string, string]>).filter(([, v]) => v).map(([k, v]) => [k, esc(v)] as [string, string])
    : [];

  const body = `
    ${docTitle('Visit summary', { ref: visitNo || refNo, refLabel: 'Visit no.', date: visitAt, dateLabel: 'Visit date', status: status ? status.toUpperCase() : undefined })}
    ${patientBanner(
      patient,
      [
        ['Visit type', orDash(kind.length <= 4 ? kind.toUpperCase() : kind.replace(/^./, (c) => c.toUpperCase()))],
        ['Seen by', orDash(clinician.name)],
        ['Visit time', esc(fmtDateTime(visitAt))],
        ['Payer', payerText(att.paymentMode || patient?.paymentMode)],
      ],
      visitAt,
    )}

    ${allergies
      ? note(`<b>ALLERGIES:</b> ${esc(allergies)}`, 'warn')
      : note('<b>Allergies:</b> none recorded.')}

    ${complaints ? section('Presenting complaint', `<div class="text-block">${multiline(complaints)}</div>`, { keepTogether: true }) : ''}

    ${vitalPairs.length ? section('Vital signs', kvGrid(vitalPairs, 4), { keepTogether: true }) : ''}

    ${exam ? section('Examination', `<div class="text-block">${multiline(typeof exam === 'string' ? exam : JSON.stringify(exam))}</div>`) : ''}

    ${section(
      'Diagnosis',
      table({
        head: ['Diagnosis', 'ICD-10', 'Type'],
        widths: ['64%', '16%', '20%'],
        rows: diagnoses.map((d) => [esc(d.name), orDash(d.code), orDash(d.type)]),
        empty: 'No diagnosis recorded',
      }),
      { keepTogether: true },
    )}

    ${assessment ? section('Assessment', `<div class="text-block">${multiline(assessment)}</div>`, { keepTogether: true }) : ''}

    ${meds.length
      ? section(
          'Medicines prescribed',
          table({
            head: ['Medicine', 'Dose', 'Route', 'Frequency', 'Duration', 'Qty'],
            widths: ['32%', '15%', '10%', '19%', '15%', '9%'],
            align: [undefined, undefined, undefined, undefined, undefined, 'c'],
            rows: meds.map((m) => [
              `<b>${esc(m?.name || m?.medicationName || 'Medicine')}</b>`,
              orDash(m?.dosage || m?.dose),
              orDash(m?.route),
              orDash(m?.frequency),
              orDash(m?.duration),
              orDash(m?.quantity),
            ]),
          }),
        )
      : ''}

    ${labs.length
      ? section(
          'Laboratory investigations',
          table({
            head: ['Test', 'Status', 'Result'],
            widths: ['42%', '18%', '40%'],
            rows: labs.map((t) => {
              const params: any[] = Array.isArray(t?.parameters) ? t.parameters : [];
              const result = params.length
                ? params.filter((p) => p?.value !== undefined && String(p.value) !== '').map((p) => `${esc(p.name || p.fieldName)}: ${esc(p.value)}${p.unit ? ` ${esc(p.unit)}` : ''}`).join('; ')
                : esc(typeof t?.result === 'object' && t?.result ? t.result.value : t?.result ?? '');
              return [esc(t?.testName || t?.name || t?.LabTestTemplate?.name || 'Test'), esc(String(t?.status || '').replace(/_/g, ' ')), result || '<span class="muted">—</span>'];
            }),
          }),
        )
      : ''}

    ${scans.length
      ? section(
          'Imaging',
          table({
            head: ['Study', 'Status', 'Impression'],
            widths: ['38%', '16%', '46%'],
            rows: scans.map((s) => [esc(getScanDisplayName(s)), esc(String(s?.status || '').replace(/_/g, ' ')), orDash(s?.impression || s?.conclusion)]),
          }),
        )
      : ''}

    ${procedures.length
      ? section(
          'Procedures',
          table({
            head: ['Procedure', 'Date', 'Status'],
            widths: ['54%', '24%', '22%'],
            rows: procedures.map((p) => [
              esc(p?.name || p?.ProcedureTemplate?.name || 'Procedure'),
              esc(fmtDate(p?.scheduledDate || p?.performedAt || p?.createdAt)),
              esc(String(p?.status || '').replace(/_/g, ' ')),
            ]),
          }),
        )
      : ''}

    ${notes ? section('Clinical notes', `<div class="text-block">${multiline(notes)}</div>`) : ''}

    ${signatures([{ role: 'Attending clinician', name: clinician.name, regNo: clinician.regNo, date: visitAt }])}
  `;

  return pageShell({
    title: `Visit summary ${visitNo}`,
    hospital: h,
    body,
    footerRef: visitNo ? `Visit ${visitNo}` : undefined,
    printLabel: 'Print summary',
  });
};
