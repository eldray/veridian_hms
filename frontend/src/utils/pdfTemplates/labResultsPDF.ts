// src/utils/pdfTemplates/labResultsPDF.ts
// Laboratory report: one block per test, results against reference ranges, abnormal values flagged.
import { getWardName } from '../wardDisplay';
import {
  esc, orDash, payerText, multiline, fmtDate, fmtDateTime, clinicianOf,
  resolveHospital, docTitle, patientBanner, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

type Flag = '' | 'H' | 'L';

/** H / L when the value is outside the range; blank when normal or not numeric. Normal results are not flagged. */
const flagFor = (param: any): Flag => {
  const { value, lowThreshold, highThreshold, normalRange, fieldType } = param || {};
  if (fieldType && fieldType !== 'number') return '';
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '';

  const hasLow = typeof lowThreshold === 'number';
  const hasHigh = typeof highThreshold === 'number';
  if (hasLow || hasHigh) {
    if (hasLow && num < lowThreshold) return 'L';
    if (hasHigh && num > highThreshold) return 'H';
    return '';
  }
  if (normalRange) {
    const cleaned = String(normalRange).replace(/[–—]/g, '-');
    const m = cleaned.match(/([<>])?\s*(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?/);
    if (m) {
      const op = m[1];
      const a = parseFloat(m[2]);
      const b = m[3] ? parseFloat(m[3]) : undefined;
      if (op === '>') return num > a ? '' : 'L';
      if (op === '<') return num < a ? '' : 'H';
      if (b !== undefined) return num < a ? 'L' : num > b ? 'H' : '';
    }
  }
  return '';
};

const flagCell = (f: Flag): string =>
  f === 'H' ? '<span class="flag-h">H ▲</span>' : f === 'L' ? '<span class="flag-l">L ▼</span>' : '';

export const generateLabResultsHTML = (
  labTests: any[],
  patient: any,
  attendance: any,
  hospital: any,
): string => {
  const h = resolveHospital(hospital);
  const tests = Array.isArray(labTests) ? labTests : [];
  const visitNo = attendance?.attendanceNumber || '';
  const reportedAt =
    tests.map((t) => t?.completedAt || t?.updatedAt).filter(Boolean).sort().pop() || new Date().toISOString();
  const reportNo = `LAB-${visitNo || 'NA'}`;

  const testName = (t: any) => t?.testName || t?.name || t?.LabTestTemplate?.name || t?.ServiceCatalog?.name || 'Laboratory test';
  const requester =
    clinicianOf(tests[0] || {}, 'orderedBy', 'requestedBy', 'User_LabTest_orderedByIdToUser').name ||
    String(attendance?.attendingClinician || attendance?.attendingDoctor?.fullName || attendance?.attendingDoctor || '').trim();
  const performedBy = String(tests.find((t) => t?.performedByName)?.performedByName || '').trim();
  const verifiedBy = String(tests.find((t) => t?.verifiedByName)?.verifiedByName || '').trim();

  const blocks = tests
    .map((t) => {
      const params: any[] = Array.isArray(t?.parameters) ? t.parameters : [];
      const status = String(t?.status || 'completed').replace(/_/g, ' ');
      const final = /complet|final|verified|approved/i.test(status);
      const meta = kvGrid(
        [
          ['Specimen', orDash(t?.specimenType || t?.LabTestTemplate?.specimenType)],
          ['Collected', t?.collectedAt || t?.sampleCollectedAt ? esc(fmtDateTime(t.collectedAt || t.sampleCollectedAt)) : '<span class="muted">—</span>'],
          ['Reported', t?.completedAt ? esc(fmtDateTime(t.completedAt)) : '<span class="muted">Pending</span>'],
          ['Priority / status', `${esc(String(t?.priority || 'routine').toUpperCase())} · ${esc(status)}`],
        ],
        4,
      );

      let results: string;
      if (params.length) {
        results = table({
          head: ['Test / parameter', 'Result', 'Unit', 'Reference range', 'Flag'],
          widths: ['34%', '18%', '12%', '26%', '10%'],
          align: [undefined, 'r', undefined, undefined, 'c'],
          rows: params.map((p) => {
            const f = flagFor(p);
            const v = p?.value !== undefined && p?.value !== null && String(p.value) !== '' ? esc(p.value) : '<span class="muted">—</span>';
            return [
              esc(p?.name || p?.fieldName || 'Parameter'),
              f ? `<b>${v}</b>` : v,
              orDash(p?.unit),
              orDash(p?.normalRange),
              flagCell(f),
            ];
          }),
        });
      } else {
        const raw = t?.result ?? t?.value;
        const val = typeof raw === 'object' && raw ? raw.value : raw;
        const f = flagFor({ value: val, normalRange: t?.normalRange });
        results = table({
          head: ['Test', 'Result', 'Unit', 'Reference range', 'Flag'],
          widths: ['30%', '28%', '10%', '22%', '10%'],
          align: [undefined, undefined, undefined, undefined, 'c'],
          rows: [[esc(testName(t)), val !== undefined && val !== '' ? (f ? `<b>${esc(val)}</b>` : esc(val)) : '<span class="muted">Pending</span>', orDash(t?.units || t?.unit), orDash(t?.normalRange), flagCell(f)]],
        });
      }

      return section(
        `${testName(t)}${final ? '' : ' — not final'}`,
        `${meta}<div style="height:5px"></div>${results}${t?.notes ? note(`<b>Comment:</b> ${multiline(t.notes)}`) : ''}`,
      );
    })
    .join('');

  const body = `
    ${docTitle('Laboratory report', { ref: reportNo, refLabel: 'Report no.', date: reportedAt, dateLabel: 'Reported' })}
    ${patientBanner(
      patient,
      [
        ['Visit no.', orDash(visitNo)],
        ['Requested by', orDash(requester)],
        ['Ward / dept.', orDash(getWardName(attendance) || attendance?.department || attendance?.Department?.name)],
        ['Payer', payerText(attendance?.paymentMode || patient?.paymentMode)],
      ],
      reportedAt,
    )}
    ${blocks || note('No laboratory tests on this report.')}
    ${note('<b>H</b> = above reference range, <b>L</b> = below reference range. Reference ranges are those of this laboratory and may vary with age and sex. Results must be read with the clinical picture by a qualified health professional.')}
    ${signatures([
      { role: 'Performed by (laboratory)', name: performedBy, date: reportedAt },
      { role: 'Verified by (supervisor)', name: verifiedBy },
    ])}
  `;

  return pageShell({
    title: `Laboratory report ${reportNo}`,
    hospital: h,
    body,
    footerRef: reportNo,
    printLabel: 'Print report',
  });
};
