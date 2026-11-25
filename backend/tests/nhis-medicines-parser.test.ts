import { afterEach, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExcelToJSONConverter } from '../src/scripts/parseNHISMedicines';

describe('NHIS medicines workbook conversion', () => {
  let directory: string | undefined;
  afterEach(async () => {
    if (directory) await fs.rm(directory, { recursive: true, force: true });
    directory = undefined;
  });

  it('locates a delayed header and filters invalid prices and incomplete rows', async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nhis-medicines-'));
    const workbookPath = path.join(directory, 'medicines.xlsx');
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Medicines').addRows([
      ['NHIS Medicines List'],
      ['Effective tariff'],
      ['Code', 'Generic Name', 'Unit of Pricing', 'Price(GH¢)', 'Level of Prescribing'],
      ['NHIS001', 'Amoxicillin 500mg tablet', 'Tablet', 1.25, 'C'],
      ['NHIS002', 'Paracetamol 500mg tablet', 'Tablet', 0, 'A'],
      ['NHIS003', 'Missing unit', '', 2, 'A'],
    ]);
    await workbook.xlsx.writeFile(workbookPath);
    const converter = new ExcelToJSONConverter(workbookPath);
    await converter.readExcelFile();
    expect(converter.convertToJSON()).toMatchObject([{
      name: 'Amoxicillin 500mg tablet',
      drugCode: 'NHIS001',
      unitOfMeasure: 'tablet',
      unitPrice: 1.25,
      insurancePrice: 1.25,
      requiresAuthorization: true,
    }]);
    expect(converter.convertToJSON()).toHaveLength(1);
  });

  it('rejects workbooks without the expected columns', async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nhis-medicines-'));
    const workbookPath = path.join(directory, 'invalid.xlsx');
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Sheet1').addRows([['Name', 'Price'], ['Drug A', 1]]);
    await workbook.xlsx.writeFile(workbookPath);
    const converter = new ExcelToJSONConverter(workbookPath);
    await expect(converter.readExcelFile()).rejects.toThrow(/Could not find Code and Generic Name/);
  });
});
