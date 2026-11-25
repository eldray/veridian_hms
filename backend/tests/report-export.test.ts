import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { documentToCsv, documentToPdf, documentToXlsx, reportToDocument } from '../src/utils/reportExport';

describe('report exports', () => {
  const report = {
    facility: { name: 'Fuo Community Hospital', district: 'Tamale' },
    period: { startDate: '2026-11-01', endDate: '2026-11-30' },
    rows: [
      { Section: 'OPD attendance', Indicator: 'Attendances', Value: 125, Unit: '' },
      { Section: 'Financial performance', Indicator: 'Collected', Value: 1250.5, Unit: 'GHS' },
      { Section: 'Data quality', Indicator: 'Missing source', Value: null, Unit: '' },
    ],
  };

  it('creates a CSV with headings, values, UTF-8 BOM and escaped cells', () => {
    const doc = reportToDocument(report, 'Monthly Facility Overview');
    const csv = documentToCsv(doc).toString('utf8');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Monthly Facility Overview');
    expect(csv).toContain('Attendances');
    expect(csv).toContain('125');
    expect(csv).toContain('1250.5');
    expect(csv).toContain('Period: 2026-11-01 to 2026-11-30');
  });

  it('creates a genuine Excel workbook with report index, tables and readable values', async () => {
    const doc = reportToDocument(report, 'Monthly Facility Overview');
    const xlsx = await documentToXlsx(doc);
    expect(xlsx.subarray(0, 2).toString('ascii')).toBe('PK');
    expect(xlsx.length).toBeGreaterThan(100);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsx);
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Report', 'Rows']);
    expect(workbook.getWorksheet('Report')?.getCell('A1').value).toBe('Monthly Facility Overview');
    expect(workbook.getWorksheet('Rows')?.getRow(1).values).toEqual([undefined, 'Section', 'Indicator', 'Value', 'Unit']);
    expect(workbook.getWorksheet('Rows')?.getCell('C2').value).toBe('Attendances');
    expect(workbook.getWorksheet('Rows')?.getCell('D3').value).toBe(1250.5);
  });

  it('creates a genuine PDF document with a PDF signature', async () => {
    const doc = reportToDocument(report, 'Monthly Facility Overview');
    const pdf = await documentToPdf(doc);
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(100);
  });

  it('produces a readable empty-state export instead of a corrupt file', async () => {
    const doc = reportToDocument({}, 'Empty Report');
    expect(documentToCsv(doc).toString('utf8')).toContain('Empty Report');
    expect((await documentToXlsx(doc)).subarray(0, 2).toString('ascii')).toBe('PK');
    expect((await documentToPdf(doc)).subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
