// parseNHISMedicines.ts
import * as fs from 'fs';
import * as path from 'path';
import PDFParser from 'pdf2json';

interface IStockItem {
  name: string;
  category: string;
  description?: string;
  strength: string;
  unitOfMeasure: string;
  drugCode: string;
  reorderLevel: number;
  currentStock: number;
  unitPrice: number;
  sellingPrice: number;
  insurancePrice: number;
  supplier: string;
  expiryDate?: Date;
  batchNumber?: string;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  isMedication: boolean;
}

class NHISMedicineParser {
  private pdfPath: string;

  constructor(pdfFileName: string = '2025 NHIS ML.pdf') {
    this.pdfPath = path.join(process.cwd(), pdfFileName);
  }

  private determineCategory(genericName: string): string {
    const name = genericName.toLowerCase();

    // Antibiotics
    if (name.includes('cillin') || name.includes('mycin') || name.includes('cef') || 
        name.includes('doxy') || name.includes('metro') || name.includes('cipro') || 
        name.includes('azithro') || name.includes('clarithro') || name.includes('clinda') || 
        name.includes('erythro') || name.includes('tetracycline')) {
      return 'Antibiotics';
    }

    // Antimalarials
    if (name.includes('artemether') || name.includes('lumefantrine') || name.includes('quinine') || 
        name.includes('artesunate') || name.includes('amodiaquine')) {
      return 'Antimalarials';
    }

    // Analgesics/Pain Relief
    if (name.includes('paracetamol') || name.includes('ibuprofen') || name.includes('diclofenac') || 
        name.includes('morphine') || name.includes('codeine') || name.includes('aspirin') || 
        name.includes('acetylsalicylic') || name.includes('mefenamic')) {
      return 'Analgesics/Pain Relief';
    }

    // Cardiovascular
    if (name.includes('atenolol') || name.includes('amlodipine') || name.includes('lisinopril') || 
        name.includes('losartan') || name.includes('nifedipine') || name.includes('propranolol') || 
        name.includes('digoxin') || name.includes('furosemide') || name.includes('atorvastatin') || 
        name.includes('simvastatin')) {
      return 'Cardiovascular';
    }

    // Antidiabetic
    if (name.includes('insulin') || name.includes('metformin') || name.includes('gliben') || 
        name.includes('gliclazide') || name.includes('glimepiride')) {
      return 'Antidiabetic';
    }

    // Add more categories as needed...
    return 'General Medications';
  }

  private parseTextElements(textElements: any[]): IStockItem[] {
    const medicines: IStockItem[] = [];
    let currentLine = '';
    const lines: string[] = [];

    // Group text elements into lines based on their y-position
    const groupedByLine: { [key: string]: string[] } = {};

    textElements.forEach(element => {
      if (element.R && element.R[0] && element.R[0].T) {
        const text = decodeURIComponent(element.R[0].T);
        const yPos = Math.round(element.y);
        
        if (!groupedByLine[yPos]) {
          groupedByLine[yPos] = [];
        }
        groupedByLine[yPos].push(text.trim());
      }
    });

    // Create lines from grouped text
    Object.keys(groupedByLine)
      .sort((a, b) => parseFloat(b) - parseFloat(a)) // Sort by y-position (top to bottom)
      .forEach(yPos => {
        const line = groupedByLine[yPos].join(' ').trim();
        if (line && line.length > 10) { // Filter out very short lines
          lines.push(line);
        }
      });

    console.log(`📝 Found ${lines.length} text lines in PDF`);

    // Parse medicine lines
    let inMedicineSection = false;

    for (const line of lines) {
      // Look for the start of the medicine list
      if (line.includes('List of Medicines and Prices') || line.includes('CODE') && line.includes('GENERIC NAME')) {
        inMedicineSection = true;
        continue;
      }

      // Look for the end of the medicine list
      if (line.includes('Copyright') || line.includes('NHIS Medicines List 2025')) {
        inMedicineSection = false;
        continue;
      }

      if (!inMedicineSection) continue;

      // Try to parse medicine line
      const medicine = this.parseMedicineLine(line);
      if (medicine) {
        medicines.push(medicine);
      }
    }

    return medicines;
  }

  private parseMedicineLine(line: string): IStockItem | null {
    // Clean the line
    const cleanLine = line.trim().replace(/\s+/g, ' ');
    
    // Skip header lines and empty lines
    if (!cleanLine || 
        cleanLine.includes('CODE') || 
        cleanLine.includes('GENERIC NAME') || 
        cleanLine.includes('UNIT OF PRICING') ||
        cleanLine.includes('PRICE') ||
        cleanLine.includes('LEVEL OF PRESCRIBING') ||
        cleanLine.length < 10) {
      return null;
    }

    // Pattern for medicine lines: CODE NAME UNIT PRICE LEVEL
    // This is a simplified pattern - you may need to adjust based on the actual PDF structure
    const pattern = /^([A-Z0-9]+)\s+(.+?)\s+(Tablet|Capsule|Injection|Syrup|Suspension|Cream|Ointment|Drops|Solution|Inhaler|Mixture|Powder|Sachet|Suppository|Ampoule|Vial|Bottle)\s+([\d.]+)\s+([A-Z0-9]+)$/i;
    
    const match = cleanLine.match(pattern);
    if (!match) {
      // Try alternative pattern without strict unit matching
      const altPattern = /^([A-Z0-9]+)\s+(.+?)\s+([\d.]+)\s+([A-Z0-9]+)$/i;
      const altMatch = cleanLine.match(altPattern);
      
      if (!altMatch) return null;

      const code = altMatch[1];
      const description = altMatch[2];
      const price = parseFloat(altMatch[3]);
      const level = altMatch[4];

      // Extract unit from description if possible
      let unitOfPricing = 'Unit';
      const unitMatch = description.match(/(Tablet|Capsule|Injection|Syrup|Suspension|Cream|Ointment)/i);
      if (unitMatch) {
        unitOfPricing = unitMatch[1];
      }

      return {
        name: description.split(',')[0]?.trim() || description,
        category: this.determineCategory(description),
        description: description,
        strength: this.extractStrength(description),
        unitOfMeasure: unitOfPricing.toLowerCase(),
        drugCode: code,
        reorderLevel: 50,
        currentStock: 100,
        unitPrice: price * 0.8,
        sellingPrice: parseFloat((price * 1.2).toFixed(2)),
        insurancePrice: price,
        supplier: 'NHIS Supplier',
        isActive: true,
        requiresAuthorization: level === 'SM' || level === 'D',
        tariffCode: code,
        vatRate: 0,
        isTaxable: false,
        isMedication: true,
      };
    }

    const code = match[1];
    const description = match[2];
    const unitOfPricing = match[3];
    const price = parseFloat(match[4]);
    const level = match[5];

    return {
      name: description.split(',')[0]?.trim() || description,
      category: this.determineCategory(description),
      description: description,
      strength: this.extractStrength(description),
      unitOfMeasure: unitOfPricing.toLowerCase(),
      drugCode: code,
      reorderLevel: 50,
      currentStock: 100,
      unitPrice: price * 0.8,
      sellingPrice: parseFloat((price * 1.2).toFixed(2)),
      insurancePrice: price,
      supplier: 'NHIS Supplier',
      isActive: true,
      requiresAuthorization: level === 'SM' || level === 'D',
      tariffCode: code,
      vatRate: 0,
      isTaxable: false,
      isMedication: true,
    };
  }

  private extractStrength(description: string): string {
    const strengthMatch = description.match(/(\d+\s*mg|\d+\s*mcg|\d+%|\d+\s*IU|\d+\s*ml|\d+\s*mg\/ml)/i);
    return strengthMatch ? strengthMatch[1] : 'Various';
  }

  public parsePDF(): Promise<IStockItem[]> {
    return new Promise((resolve, reject) => {
      console.log('📄 Reading PDF file with pdf2json...');

      if (!fs.existsSync(this.pdfPath)) {
        reject(new Error(`PDF file not found at: ${this.pdfPath}`));
        return;
      }

      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('❌ PDF parsing error:', errData.parserError);
        reject(new Error(errData.parserError || 'Unknown PDF parsing error'));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          console.log('✅ PDF parsed successfully');
          console.log('📊 PDF structure:', {
            pages: pdfData.formImage?.Pages?.length || 0,
            textElements: pdfData.formImage?.Pages?.[0]?.Texts?.length || 0
          });

          const medicines: IStockItem[] = [];
          
          // Extract text from all pages
          if (pdfData.formImage?.Pages) {
            pdfData.formImage.Pages.forEach((page: any, pageIndex: number) => {
              console.log(`📄 Processing page ${pageIndex + 1} with ${page.Texts?.length || 0} text elements`);
              
              if (page.Texts) {
                const pageMedicines = this.parseTextElements(page.Texts);
                medicines.push(...pageMedicines);
              }
            });
          }

          console.log(`✅ Extracted ${medicines.length} medicines from PDF`);
          resolve(medicines);
        } catch (error) {
          reject(error);
        }
      });

      // Load the PDF
      pdfParser.loadPDF(this.pdfPath);
    });
  }

  public async parseAndSave(outputFileName: string = 'nhis_medicines.json'): Promise<void> {
    try {
      const medicines = await this.parsePDF();

      const outputPath = path.join(process.cwd(), outputFileName);
      fs.writeFileSync(outputPath, JSON.stringify(medicines, null, 2), 'utf-8');

      console.log(`\n✅ Successfully saved ${medicines.length} medicines to ${outputFileName}`);
      console.log(`📁 File location: ${outputPath}`);

      // Print statistics
      const categories = medicines.reduce((acc, med) => {
        acc[med.category] = (acc[med.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n📈 Medicines by Category:');
      Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
          console.log(`   ${category}: ${count}`);
        });

      // Show sample
      if (medicines.length > 0) {
        console.log('\n🔍 Sample medicines:');
        medicines.slice(0, 5).forEach(med => {
          console.log(`   ${med.drugCode}: ${med.name} - GHS ${med.insurancePrice}`);
        });
      }

    } catch (error) {
      console.error('❌ Error parsing PDF:', error);
      
      // Fallback: Use manual extraction with known data
      console.log('🔄 Attempting fallback manual extraction...');
      await this.fallbackManualExtraction(outputFileName);
    }
  }

  private async fallbackManualExtraction(outputFileName: string): Promise<void> {
    // Use the data you provided from the PDF
    const knownMedicines = [
      { code: 'ACETAZIN1', name: 'Acetazolamide', strength: '500 mg', unit: 'Ampoule', price: 17.16, level: 'C' },
      { code: 'ACETAZTA1', name: 'Acetazolamide', strength: '250 mg', unit: 'Tablet', price: 0.88, level: 'C' },
      { code: 'ACETYLIN1', name: 'Acetylcysteine', strength: '200 mg/mL', unit: '1 mL', price: 62.98, level: 'B1' },
      { code: 'ACETYLTA1', name: 'Acetylsalicylic Acid', strength: '300 mg', unit: 'Tablet', price: 0.55, level: 'A' },
      { code: 'ACETYLDT1', name: 'Acetylsalicylic Acid', strength: '75 mg (Dispersible)', unit: 'Tablet', price: 0.33, level: 'B2' },
      { code: 'PARACETA1', name: 'Paracetamol', strength: '500 mg', unit: 'Tablet', price: 0.12, level: 'A' },
      { code: 'AMOXICCA1', name: 'Amoxicillin', strength: '250 mg', unit: 'Capsule', price: 0.47, level: 'A' },
      { code: 'AMOXICCA2', name: 'Amoxicillin', strength: '500 mg', unit: 'Capsule', price: 0.83, level: 'A' },
      { code: 'AMLODITA1', name: 'Amlodipine', strength: '5 mg', unit: 'Tablet', price: 0.11, level: 'B1' },
      { code: 'METFORTA1', name: 'Metformin', strength: '500 mg', unit: 'Tablet', price: 0.15, level: 'B1' },
      { code: 'LOSARTTA2', name: 'Losartan', strength: '50 mg', unit: 'Tablet', price: 0.26, level: 'C' },
      { code: 'SIMVASTA2', name: 'Simvastatin', strength: '20 mg', unit: 'Tablet', price: 1.02, level: 'C' },
      { code: 'ATORVATA1', name: 'Atorvastatin', strength: '10 mg', unit: 'Tablet', price: 0.23, level: 'C' },
      { code: 'CETIRITA1', name: 'Cetirizine', strength: '10 mg', unit: 'Tablet', price: 0.07, level: 'A' },
    ];

    const medicines = knownMedicines.map(med => ({
      name: med.name,
      category: this.determineCategory(med.name),
      description: `${med.name} ${med.strength} - ${med.unit}`,
      strength: med.strength,
      unitOfMeasure: med.unit.toLowerCase(),
      drugCode: med.code,
      reorderLevel: 50,
      currentStock: 100,
      unitPrice: med.price * 0.8,
      sellingPrice: parseFloat((med.price * 1.2).toFixed(2)),
      insurancePrice: med.price,
      supplier: 'NHIS Supplier',
      isActive: true,
      requiresAuthorization: med.level === 'SM' || med.level === 'D',
      tariffCode: med.code,
      vatRate: 0,
      isTaxable: false,
      isMedication: true,
    }));

    const outputPath = path.join(process.cwd(), outputFileName.replace('.json', '_manual.json'));
    fs.writeFileSync(outputPath, JSON.stringify(medicines, null, 2), 'utf-8');
    console.log(`✅ Created manual extraction with ${medicines.length} medicines at ${outputPath}`);
  }
}

// Alternative: Direct text extraction from your provided PDF content
class DirectTextExtractor {
  public static extractFromProvidedText(): IStockItem[] {
    // Use the exact text content you provided from the PDF
    const pdfText = `
    ACETAZIN1 Acetazolamide Injection, 500 mg Ampoule 17.16 C
    ACETAZTA1 Acetazolamide Tablet, 250 mg Tablet 0.88 C
    ACETYLIN1 Acetylcysteine Injection, 200 mg/mL 1 mL 62.98 B1
    ACETYLTA1 Acetylsalicylic Acid Tablet, 300 mg Tablet 0.55 A
    ACETYLDT1 Acetylsalicylic Acid Tablet, 75 mg (Dispersible) Tablet 0.33 B2
    PARACETA1 Paracetamol Tablet, 500 mg Tablet 0.12 A
    AMOXICCA1 Amoxicillin Capsule, 250 mg Capsule 0.47 A
    AMOXICCA2 Amoxicillin Capsule, 500 mg Capsule 0.83 A
    AMLODITA1 Amlodipine Tablet, 5 mg Tablet 0.11 B1
    METFORTA1 Metformin Tablet, 500 mg Tablet 0.15 B1
    LOSARTTA2 Losartan Tablet, 50 mg Tablet 0.26 C
    SIMVASTA2 Simvastatin Tablet, 20 mg Tablet 1.02 C
    ATORVATA1 Atorvastatin Tablet, 10 mg Tablet 0.23 C
    CETIRITA1 Cetirizine Tablet, 10 mg Tablet 0.07 A
    `;

    const parser = new NHISMedicineParser();
    const medicines: IStockItem[] = [];
    const lines = pdfText.split('\n');

    for (const line of lines) {
      const medicine = parser.parseMedicineLine(line.trim());
      if (medicine) {
        medicines.push(medicine);
      }
    }

    return medicines;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting NHIS Medicine Extraction...');
    
    const parser = new NHISMedicineParser('2025NHIS.pdf');
    await parser.parseAndSave('nhis_medicines.json');
    
  } catch (error) {
    console.error('💥 All parsing methods failed, using direct text extraction...');
    
    const medicines = DirectTextExtractor.extractFromProvidedText();
    const outputPath = path.join(process.cwd(), 'nhis_medicines_direct.json');
    fs.writeFileSync(outputPath, JSON.stringify(medicines, null, 2), 'utf-8');
    console.log(`✅ Created direct extraction with ${medicines.length} medicines`);
  }
}
// Run if this file is executed directly
// ES module equivalent of if (require.main === module)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}

// Export everything at the end to avoid duplicate exports
export { NHISMedicineParser, DirectTextExtractor, type IStockItem };
