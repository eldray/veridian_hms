// src/scripts/parseNHISMedicines.ts
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === NHIS Row from Excel ===
interface ExcelRow {
  'Code': string;
  'Generic Name': string;
  'Unit of Pricing': string;
  'Price(GH¢)': number | string;
  'Level of Prescribing': string;
  '__EMPTY_1'?: string;
  '__EMPTY_2'?: string;
  '__EMPTY_3'?: string;
  '__EMPTY_4'?: string;
  '__EMPTY_5'?: string;
}

// === Your StockItem Model (JSON version) ===
interface StockItemJSON {
  name: string;           // ← NHIS "Generic Name"
  category: string;       // ← Therapeutic group (Antimalarial, Vitamin, etc.)
  description: string;    // ← Brief clinical use
  strength: string;
  unitOfMeasure: string;
  drugCode: string;
  reorderLevel: number;
  currentStock: number;
  unitPrice: number;
  sellingPrice: number;
  insurancePrice: number;
  supplier: string;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  isMedication: boolean;
}

// === Therapeutic Category + Description Map ===
const DRUG_USE_MAP: Record<string, { category: string; description: string }> = {
  // ANTIBIOTICS
  amoxicillin: { category: 'Antibiotic', description: 'Broad-spectrum penicillin antibiotic' },
  amoxycillin: { category: 'Antibiotic', description: 'Broad-spectrum penicillin antibiotic' },
  ciprofloxacin: { category: 'Antibiotic', description: 'Fluoroquinolone for bacterial infections' },
  metronidazole: { category: 'Antibiotic', description: 'Antiprotozoal and anaerobic bacterial infections' },
  doxycycline: { category: 'Antibiotic', description: 'Tetracycline antibiotic for infections' },
  azithromycin: { category: 'Antibiotic', description: 'Macrolide antibiotic for respiratory infections' },
  cefuroxime: { category: 'Antibiotic', description: 'Second-generation cephalosporin' },
  ceftriaxone: { category: 'Antibiotic', description: 'Third-generation cephalosporin injection' },

  // ANTIMALARIALS
  artemether: { category: 'Antimalarial', description: 'Treatment of uncomplicated malaria' },
  lumefantrine: { category: 'Antimalarial', description: 'Artemisinin-based combination therapy' },
  artesunate: { category: 'Antimalarial', description: 'Severe malaria treatment' },
  sulfadoxine: { category: 'Antimalarial', description: 'Malaria prophylaxis and treatment' },
  pyrimethamine: { category: 'Antimalarial', description: 'Malaria prophylaxis and treatment' },

  // ANTIVIRALS
  acyclovir: { category: 'Antiviral', description: 'Herpes simplex and varicella-zoster treatment' },
  oseltamivir: { category: 'Antiviral', description: 'Influenza A and B treatment' },

  // ANTIFUNGALS
  fluconazole: { category: 'Antifungal', description: 'Systemic and mucosal fungal infections' },
  clotrimazole: { category: 'Antifungal', description: 'Topical treatment for candidiasis' },
  nystatin: { category: 'Antifungal', description: 'Oral and topical candidiasis' },

  // ANALGESICS / ANTI-INFLAMMATORY
  paracetamol: { category: 'Analgesic', description: 'Pain relief and fever reduction' },
  acetaminophen: { category: 'Analgesic', description: 'Pain relief and fever reduction' },
  ibuprofen: { category: 'NSAID', description: 'Pain, inflammation, and fever' },
  diclofenac: { category: 'NSAID', description: 'Pain and inflammation relief' },
  aspirin: { category: 'NSAID', description: 'Pain, fever, and antiplatelet' },
  acetylsalicylic: { category: 'NSAID', description: 'Pain, fever, and antiplatelet' },

  // DIURETICS
  furosemide: { category: 'Diuretic', description: 'Loop diuretic for edema and hypertension' },
  hydrochlorothiazide: { category: 'Diuretic', description: 'Thiazide diuretic for hypertension' },
  acetazolamide: { category: 'Diuretic', description: 'Carbonic anhydrase inhibitor for glaucoma and altitude sickness' },

  // CARDIOVASCULAR
  atenolol: { category: 'Antihypertensive', description: 'Beta-blocker for hypertension and angina' },
  amlodipine: { category: 'Antihypertensive', description: 'Calcium channel blocker for hypertension' },
  enalapril: { category: 'Antihypertensive', description: 'ACE inhibitor for hypertension and heart failure' },
  losartan: { category: 'Antihypertensive', description: 'ARB for hypertension' },
  atorvastatin: { category: 'Lipid Regulator', description: 'Cholesterol-lowering statin' },

  // ANTIDIABETICS
  metformin: { category: 'Antidiabetic', description: 'First-line oral treatment for type 2 diabetes' },
  glibenclamide: { category: 'Antidiabetic', description: 'Sulfonylurea for type 2 diabetes' },
  insulin: { category: 'Antidiabetic', description: 'Hormone replacement for diabetes' },

  // VITAMINS & SUPPLEMENTS
  vitamin: { category: 'Vitamin Supplement', description: 'Essential nutrient supplementation' },
  ascorbic: { category: 'Vitamin Supplement', description: 'Vitamin C for immune support' },
  ferrous: { category: 'Iron Supplement', description: 'Iron deficiency anemia treatment' },
  folic: { category: 'Vitamin Supplement', description: 'Folate for anemia and pregnancy' },
  calcium: { category: 'Mineral Supplement', description: 'Bone health and muscle function' },

  // GASTROINTESTINAL
  omeprazole: { category: 'Antacid', description: 'Proton pump inhibitor for acid reflux' },
  ranitidine: { category: 'Antacid', description: 'H2 blocker for ulcers and reflux' },
  albendazole: { category: 'Anthelmintic', description: 'Treatment of intestinal worms' },
  mebendazole: { category: 'Anthelmintic', description: 'Treatment of pinworm and roundworm' },

  // OTHERS
  adrenaline: { category: 'Emergency Drug', description: 'Anaphylaxis and cardiac arrest' },
  activated: { category: 'Antidote', description: 'Poisoning and overdose management' },
  actinomycin: { category: 'Antineoplastic', description: 'Chemotherapy for cancer' },
  allopurinol: { category: 'Antigout', description: 'Gout and hyperuricemia treatment' },
};

export function parseExcelRows(allRows: unknown[][]): ExcelRow[] {
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, allRows.length); i++) {
    const row = allRows[i];
    if (row.includes('Code') && row.includes('Generic Name')) {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex < 0) throw new Error('Could not find Code and Generic Name columns in the first 10 rows');
  const headers = allRows[headerRowIndex].map(value => value == null ? '' : String(value).trim());
  return allRows.slice(headerRowIndex + 1).map(values => {
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = values[index] ?? null;
    });
    return record as ExcelRow;
  }).filter(row => {
    if (!row['Code'] || !row['Generic Name'] || !row['Unit of Pricing']) return false;
    if (row['Code'] === 'Code') return false;
    const price = parseFloat(String(row['Price(GH¢)'] ?? ''));
    return Number.isFinite(price) && price > 0;
  });
}

export class ExcelToJSONConverter {
  private excelData: ExcelRow[] = [];

  constructor(private filePath: string) {}

  public async readExcelFile(): Promise<void> {
    try {
      console.log(`Reading Excel from: ${this.filePath}`);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.filePath);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('The workbook contains no worksheets');
      const allRows: unknown[][] = [];
      worksheet.eachRow({ includeEmpty: true }, row => {
        allRows.push(row.values.slice(1) as unknown[]);
      });
      this.excelData = parseExcelRows(allRows);
      console.log(`Valid rows: ${this.excelData.length}`);
    } catch (error) {
      console.error('Excel read error:', error);
      throw error;
    }
  }

  private extractStrength(name: string): string {
    const match = name.match(/(\d+(?:\.\d+)?\s*(mg|mcg|μg|g|ml|mL|IU|units?|%))/i);
    return match ? match[1].trim() : 'N/A';
  }

  private normalizeUnit(unit: string): string {
    const map: Record<string, string> = {
      'tablet': 'tablet', 'capsule': 'capsule', 'ampoule': 'ampoule',
      'vial': 'vial', 'ml': 'ml', 'g': 'g', 'bottle': 'bottle',
      'tube': 'tube', 'sachet': 'sachet', 'pack': 'pack'
    };
    const lower = unit.toLowerCase();
    return Object.keys(map).find(k => lower.includes(k)) || 'unit';
  }

  private getTherapeuticInfo(genericName: string): { category: string; description: string } {
    const lower = genericName.toLowerCase();

    for (const [key, info] of Object.entries(DRUG_USE_MAP)) {
      if (lower.includes(key)) {
        return info;
      }
    }

    // Fallback based on form
    if (lower.includes('injection')) return { category: 'Injectable', description: 'Administered via injection' };
    if (lower.includes('tablet')) return { category: 'Oral Solid', description: 'Taken by mouth' };
    if (lower.includes('syrup') || lower.includes('suspension')) return { category: 'Oral Liquid', description: 'Liquid oral medication' };
    if (lower.includes('cream') || lower.includes('ointment')) return { category: 'Topical', description: 'Applied to skin' };

    return { category: 'Other Medicines', description: 'General medication' };
  }

  private convertRowToStockItem(row: ExcelRow): StockItemJSON {
    const fullName = row['Generic Name'].trim();
    const { category, description } = this.getTherapeuticInfo(fullName);
    const strength = this.extractStrength(fullName);
    const unitPrice = parseFloat(row['Price(GH¢)'] as any) || 0;
    const sellingPrice = Math.round((unitPrice * 1.2) * 100) / 100;

    return {
      name: fullName,                                      // ← NHIS Generic Name
      category,                                            // ← Therapeutic group
      description,                                         // ← Clinical use
      strength,
      unitOfMeasure: this.normalizeUnit(row['Unit of Pricing']),
      drugCode: row['Code'],
      reorderLevel: 50,
      currentStock: 0,
      unitPrice,
      sellingPrice,
      insurancePrice: unitPrice,
      supplier: 'NHIS Supplier',
      isActive: true,
      requiresAuthorization: ['C', 'D', 'B1', 'B2'].includes(row['Level of Prescribing'] || ''),
      tariffCode: row['Code'],
      vatRate: 0,
      isTaxable: true,
      isMedication: true
    };
  }

  public convertToJSON(): StockItemJSON[] {
    return this.excelData.map(row => this.convertRowToStockItem(row));
  }

  public saveToFile(outputPath: string): void {
    const data = this.convertToJSON();
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Saved ${data.length} items to ${outputPath}`);

    const catCount: Record<string, number> = {};
    data.forEach(i => catCount[i.category] = (catCount[i.category] || 0) + 1);
    console.log('\nCategories:');
    Object.entries(catCount).forEach(([c, n]) => console.log(`  ${c}: ${n}`));
  }

  public async convert(excelPath: string, jsonPath: string): Promise<void> {
    this.filePath = excelPath;
    await this.readExcelFile();
    this.saveToFile(jsonPath);
  }
}

// === RUN ===
const main = async () => {
  const root = path.resolve(__dirname, '..', '..');
  const excelFile = path.join(root, 'NHIS_Medicines.xlsx');
  const jsonFile = path.join(root, 'nhis-medicines.json');

  console.log('Starting NHIS → StockItem conversion...');
  await new ExcelToJSONConverter(excelFile).convert(excelFile, jsonFile);
  console.log('Done!');
};

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
