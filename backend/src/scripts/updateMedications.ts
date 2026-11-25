import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Medication {
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
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  isMedication: boolean;
}

function updateMedicationNames(medications: Medication[]): Medication[] {
  const formulationMap: { [key: string]: string } = {
    'tablet': 'Tablet',
    'capsule': 'Capsule',
    'suppository': 'Suppository',
    'bottle': 'Suspension',
    'syrup': 'Syrup',
    'inhaler': 'Inhaler',
    'vial': 'Injection',
    'ampoule': 'Injection',
    'tube': 'Cream',
    'container': 'Powder',
    'sachet': 'Sachet',
    'roll': 'Roll',
    'pack': 'Pack',
    'box': 'Box',
    'piece': 'Unit'
  };

  return medications.map(med => {
    // Skip if it's a medical supply or non-medication
    if (med.category === 'medical_supply' || !med.isMedication) {
      return med;
    }

    let formulation = formulationMap[med.unitOfMeasure] || med.unitOfMeasure;
    
    // Special handling based on strength pattern
    if (med.strength.includes('mg/5ml') || med.strength.includes('/5ml')) {
      formulation = 'Suspension';
    } else if (med.strength.includes('mg/ml') || med.strength.includes('/ml')) {
      formulation = 'Solution';
    } else if (med.strength.includes('mcg/dose') || med.strength.includes('/dose')) {
      formulation = 'Inhaler';
    } else if (med.strength.includes('IU/ml')) {
      formulation = 'Injection';
    } else if (med.strength.includes('%')) {
      if (med.unitOfMeasure === 'tube') formulation = 'Ointment';
      else if (med.unitOfMeasure === 'bottle') formulation = 'Solution';
    }

    // Special cases based on description
    if (med.unitOfMeasure === 'tube') {
      const desc = med.description?.toLowerCase() || '';
      if (desc.includes('cream')) formulation = 'Cream';
      else if (desc.includes('ointment')) formulation = 'Ointment';
      else if (desc.includes('gel')) formulation = 'Gel';
    }
    
    if (med.unitOfMeasure === 'bottle') {
      const desc = med.description?.toLowerCase() || '';
      if (desc.includes('syrup')) formulation = 'Syrup';
      else if (desc.includes('mixture')) formulation = 'Mixture';
      else if (desc.includes('lotion')) formulation = 'Lotion';
      else if (desc.includes('suspension')) formulation = 'Suspension';
    }

    // Clean up the strength for display
    let displayStrength = med.strength.trim();
    
    // Format strength for better readability
    if (displayStrength.includes('mg/5ml')) {
      displayStrength = displayStrength.replace('mg/5ml', 'mg/5mL');
    } else if (displayStrength.includes('/5ml')) {
      displayStrength = displayStrength.replace('/5ml', '/5mL');
    } else if (displayStrength.includes('mg/ml')) {
      displayStrength = displayStrength.replace('mg/ml', 'mg/mL');
    } else if (displayStrength.includes('/ml')) {
      displayStrength = displayStrength.replace('/ml', '/mL');
    } else if (displayStrength.includes('mcg/dose')) {
      displayStrength = displayStrength.replace('mcg/dose', 'mcg per dose');
    } else if (displayStrength.includes('IU/ml')) {
      displayStrength = displayStrength.replace('IU/ml', 'IU/mL');
    }

    // Update the name with both formulation AND strength
    const newName = `${med.name} ${formulation} ${displayStrength}`;
    
    return {
      ...med,
      name: newName
    };
  });
}

// Read, process, and write the file
async function processMedicationsFile() {
  try {
    // Read the input file
    const inputPath = path.join(__dirname, 'medications.json');
    const rawData = await fs.promises.readFile(inputPath, 'utf-8');
    const medications: Medication[] = JSON.parse(rawData);
    
    // Update medication names
    const updatedMedications = updateMedicationNames(medications);
    
    // Write to output file
    const outputPath = path.join(__dirname, 'medications-updated.json');
    await fs.promises.writeFile(outputPath, JSON.stringify(updatedMedications, null, 2));
    
    console.log(`✅ Successfully updated ${updatedMedications.length} medications`);
    console.log(`📁 Output saved to: medications-updated.json`);
    
    // Show examples of the changes
    console.log('\n📋 Examples of updated names:');
    const examples = updatedMedications.filter(med => med.isMedication && med.category !== 'medical_supply');
    examples.slice(0, 8).forEach(med => {
      console.log(`  → ${med.name}`);
    });
    
    console.log(`\n💊 Total medications updated: ${examples.length}`);
    console.log(`🏥 Medical supplies unchanged: ${updatedMedications.length - examples.length}`);
    
  } catch (error) {
    console.error('❌ Error processing file:', error);
    console.log('Please make sure medications.json exists in the same folder');
  }
}

// Run the script
processMedicationsFile();
