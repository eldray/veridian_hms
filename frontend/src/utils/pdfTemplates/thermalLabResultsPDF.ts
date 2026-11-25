// src/utils/pdfTemplates/thermalLabResultsPDF.ts
// Laboratory result slip for a POS receipt printer: each parameter, value, unit, range, H/L flag.
import { esc, orDash, fmtDateTime, ageText, sexText, patientName } from './printKit';
import {
  resolveHospital, slipHeader, slipTitle, rule, gap, centre, row, field, signLine, slipFooter, slipShell,
  getThermalWidth,
} from './thermalKit';

const flagFor = (p: any): 'H' | 'L' | '' => {
  const { value, lowThreshold, highThreshold, normalRange, fieldType } = p || {};
  if (fieldType && fieldType !== 'number') return '';
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (value === '' || value == null || isNaN(n)) return '';
  if (typeof lowThreshold === 'number' && n < lowThreshold) return 'L';
  if (typeof highThreshold === 'number' && n > highThreshold) return 'H';
  if (typeof lowThreshold === 'number' || typeof highThreshold === 'number') return '';
  const m = String(normalRange || '').replace(/[–—]/g, '-').match(/([<>])?\s*(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?/);
  if (!m) return '';
  const a = parseFloat(m[2]);
  const b = m[3] ? parseFloat(m[3]) : undefined;
  if (m[1] === '>') return n > a ? '' : 'L';
  if (m[1] === '<') return n < a ? '' : 'H';
  return b === undefined ? '' : n < a ? 'L' : n > b ? 'H' : '';
};

export const generateThermalLabResultsHTML = (
  labTests: any[],
  patient: any,
  attendance: any,
  hospital: any,
  paperWidth?: number,
): string => {
  const h = resolveHospital(hospital);
  const width = getThermalWidth(paperWidth);
  const tests = Array.isArray(labTests) ? labTests : [];
  const visitNo = attendance?.attendanceNumber || '';
  const reportedAt = tests.map((t) => t?.completedAt || t?.updatedAt).filter(Boolean).sort().pop() || new Date().toISOString();
  const performedBy = String(tests.find((t) => t?.performedByName)?.performedByName || '').trim();

  const blocks = tests
    .map((t) => {
      const name = t?.testName || t?.name || t?.LabTestTemplate?.name || 'Laboratory test';
      const params: any[] = Array.isArray(t?.parameters) ? t.parameters : [];
      const lines = params.length
        ? `<table class="table compact"><thead><tr><th style="width:48%">Test</th><th style="width:25%">Result</th><th style="width:27%">Ref.</th></tr></thead><tbody>${params.map((p) => {
            const f = flagFor(p);
            const v = p?.value !== undefined && String(p.value) !== '' ? esc(p.value) : '-';
            return `<tr><td>${esc(p?.name || p?.fieldName || 'Parameter')}</td><td><b>${v}${p?.unit ? ` ${esc(p.unit)}` : ''}${f ? ` ${f}` : ''}</b></td><td class="secondary">${esc(p?.normalRange || '-')}</td></tr>`;
          }).join('')}</tbody></table>
        `
        : (() => {
            const raw = t?.result ?? t?.value;
            const val = typeof raw === 'object' && raw ? raw.value : raw;
            return `<div class="item"><div class="b">${val !== undefined && val !== '' ? esc(val) : 'Pending'}${t?.units || t?.unit ? ` ${esc(t.units || t.unit)}` : ''}</div>${t?.normalRange ? `<div class="detail sm">Ref: ${esc(t.normalRange)}</div>` : ''}</div>`;
          })();
      return `<div class="b">${esc(name)}</div>
        ${t?.specimenType ? `<div class="sm">Specimen: ${esc(t.specimenType)}</div>` : ''}
        ${lines}
        ${t?.notes ? `<div class="sm">Note: ${esc(t.notes)}</div>` : ''}
        ${rule()}`;
    })
    .join('');

  const body = `
    ${slipHeader(h)}
    ${slipTitle('Lab result')}
    ${row('Date', esc(fmtDateTime(reportedAt)))}
    ${visitNo ? row('Visit no.', esc(visitNo)) : ''}
    ${rule()}
    ${field('Patient', esc(patientName(patient)))}
    ${row('Folder no.', orDash(patient?.folderNumber))}
    ${row('Age / Sex', `${esc(ageText(patient, reportedAt))} / ${sexText(patient)}`)}
    ${rule()}
    ${blocks || centre('No results', 'sm')}
    ${centre('H = high   L = low', 'xs')}
    ${signLine('Performed by', performedBy)}
    ${slipFooter(['Read with the clinical picture.'])}
  `;
  return slipShell({ title: 'Lab result', body, width, printLabel: 'Print result' });
};
