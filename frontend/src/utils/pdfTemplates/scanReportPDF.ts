// src/utils/pdfTemplates/scanReportPDF.ts
// Radiology / ultrasound report: indication, findings (template-aware), impression, reporter.
import { getScanDisplayName, humanScanModality } from '../scan';
import {
  esc, orDash, payerText, multiline, fmtDate, fmtDateTime, clinicianOf,
  resolveHospital, docTitle, patientBanner, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

interface TemplateField {
  fieldName: string;
  fieldType: string;
  label: string;
  unit?: string;
  referenceRange?: string;
}

const resolveResultTemplate = (scan: any): TemplateField[] => {
  const candidates = [
    scan?.ScanTemplate?.resultTemplate,
    scan?.ServiceCatalog?.ScanTemplate?.resultTemplate,
    scan?.ServiceCatalog?.metadata?.resultTemplate,
    scan?.resultTemplate,
  ];
  for (const c of candidates) if (Array.isArray(c) && c.length > 0) return c as TemplateField[];
  return [];
};

const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

/** Findings as label/value rows: from the template when structured, else from the saved text. */
const findingsRows = (scan: any): { rows: string[][]; text: string } => {
  const tpl = resolveResultTemplate(scan);
  const values = scan?.result && typeof scan.result === 'object' && scan.result.values ? scan.result.values : null;

  if (tpl.length > 0 && values) {
    const rows: string[][] = [];
    for (const f of tpl) {
      const v = values[f.fieldName];
      if (blank(v)) continue;
      rows.push([esc(f.label), `${esc(v)}${f.unit ? ` ${esc(f.unit)}` : ''}`, orDash(f.referenceRange)]);
    }
    for (const k of Object.keys(values)) {
      if (!k.startsWith('custom_') || k.endsWith('__label') || blank(values[k])) continue;
      rows.push([esc(values[`${k}__label`] || 'Additional finding'), esc(values[k]), '<span class="muted">—</span>']);
    }
    if (rows.length) return { rows, text: '' };
  }

  const plain = typeof scan?.findings === 'string' ? scan.findings.trim() : '';
  if (plain) {
    const lines = plain.split('\n').filter((l: string) => l.trim());
    if (lines.length > 1 && lines.every((l: string) => l.includes(':'))) {
      return {
        rows: lines.map((l: string) => {
          const i = l.indexOf(':');
          return [esc(l.slice(0, i).trim()), esc(l.slice(i + 1).trim()), '<span class="muted">—</span>'];
        }),
        text: '',
      };
    }
    return { rows: [], text: plain };
  }
  return { rows: [], text: '' };
};

export const generateScanReportHTML = (
  scans: any[],
  patient: any,
  attendance: any,
  hospital: any,
): string => {
  const h = resolveHospital(hospital);
  const list = Array.isArray(scans) ? scans : [];
  const visitNo = attendance?.attendanceNumber || '';
  const reportedAt =
    list.map((s) => s?.completedAt || s?.performedAt || s?.updatedAt).filter(Boolean).sort().pop() || new Date().toISOString();
  const reportNo = `RAD-${visitNo || 'NA'}`;
  const requester =
    clinicianOf(list[0] || {}, 'orderedBy', 'requestedBy').name ||
    String(attendance?.attendingClinician || attendance?.attendingDoctor?.fullName || attendance?.attendingDoctor || '').trim();
  const indication = String(attendance?.complaints || attendance?.chiefComplaint || '').trim();

  const performerOf = (s: any) =>
    String(s?.performedBy?.fullName || (typeof s?.performedBy === 'string' ? s.performedBy : '') || s?.performedByName || '').trim();

  const blocks = list
    .map((s) => {
      const name = getScanDisplayName(s);
      const bodyPart = s?.bodyPart || s?.ServiceCatalog?.metadata?.bodyPart || '';
      const modality = humanScanModality(s);
      const status = String(s?.status || 'completed').replace(/_/g, ' ');
      const done = /complet|final|reported/i.test(status);
      const when = s?.completedAt || s?.performedAt || s?.updatedAt;
      const impression = String(s?.impression || s?.conclusion || '').trim();
      const images: string[] = Array.isArray(s?.imageUrls) ? s.imageUrls : [];
      const { rows, text } = findingsRows(s);

      const findings = rows.length
        ? table({
            head: ['Finding', 'Observation', 'Reference'],
            widths: ['34%', '44%', '22%'],
            rows,
          })
        : text
          ? `<div class="text-block">${multiline(text)}</div>`
          : '<div class="muted">No findings recorded.</div>';

      return section(
        `${name}${bodyPart ? ` — ${bodyPart}` : ''}${done ? '' : ' (not final)'}`,
        `${kvGrid(
          [
            ['Modality', orDash(modality === '—' ? '' : modality)],
            ['Body part', orDash(bodyPart)],
            ['Examined', when ? esc(fmtDateTime(when)) : '<span class="muted">—</span>'],
            ['Status', esc(status)],
          ],
          4,
        )}
        <div style="height:6px"></div>
        <div class="kv-k" style="margin-bottom:2px">Findings</div>
        ${findings}
        ${impression ? `<div class="note" style="margin-top:8px"><b>Impression:</b> ${multiline(impression)}</div>` : '<div class="note warn"><b>Impression:</b> not recorded.</div>'}
        ${images.length ? `<div class="muted" style="font-size:8.5pt;margin-top:4px">${images.length} image${images.length === 1 ? '' : 's'} stored with this study.</div>` : ''}`,
      );
    })
    .join('');

  const performers = Array.from(new Set(list.map(performerOf).filter(Boolean)));

  const body = `
    ${docTitle('Imaging report', { ref: reportNo, refLabel: 'Report no.', date: reportedAt, dateLabel: 'Reported' })}
    ${patientBanner(
      patient,
      [
        ['Visit no.', orDash(visitNo)],
        ['Requested by', orDash(requester)],
        ['Ward / dept.', orDash(attendance?.Ward?.wardName || attendance?.ward?.wardName || attendance?.department || attendance?.Department?.name)],
        ['Payer', payerText(attendance?.paymentMode || patient?.paymentMode)],
      ],
      reportedAt,
    )}
    ${indication ? section('Clinical indication', `<div class="text-block">${multiline(indication)}</div>`, { keepTogether: true }) : ''}
    ${blocks || note('No imaging studies on this report.')}
    ${note('This report is a clinical document to be read with the patient\'s history and examination. Findings may need correlation with other investigations.')}
    ${signatures([
      { role: 'Examined / reported by', name: performers.join(', '), date: reportedAt },
      { role: 'Reviewed by (radiologist / physician)' },
    ])}
  `;

  return pageShell({
    title: `Imaging report ${reportNo}`,
    hospital: h,
    body,
    footerRef: reportNo,
    printLabel: 'Print report',
  });
};
