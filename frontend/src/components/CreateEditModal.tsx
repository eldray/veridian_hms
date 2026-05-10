// components/CreateEditModal.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface CreateEditModalProps {
  type: 'diagnoses' | 'lab-tests' | 'procedures' | 'scans';
  item?: any;
  onSave: (data: any) => void;
  onClose: () => void;
  metadata: {
    scanCategories: string[];
    scanBodyParts: string[];
    scanTypes: string[];
    morbidityGroups?: Array<{ value: string; label: string; category: string }>;
    labCategories?: string[];
    procedureCategories?: string[];
    departments?: string[];
    specimenTypes?: string[];
  };
}

const defaultFormData = {
  diagnoses: {
    name: '',
    icdCode: '',
    gdrgGroupCode: '',
    morbidityGroup: '',
    description: '',
    isChronic: false,
    isNHISCovered: true,
    tariffCode: '',
    isActive: true,
    requiresAuthorization: false
  },
  'lab-tests': {
    name: '',
    investigationCode: '',
    category: '',
    subCategory: '',
    description: '',
    specimenType: '',
    isActive: true,
    isNHISCovered: true,
    isPrivateInsExempted: false,
    tariffCode: '',
    vatRate: 0,
    isTaxable: true
  },
  procedures: {
    name: '',
    procedureCode: '',
    category: '',
    department: '',
    description: '',
    isActive: true,
    isNHISCovered: true,
    isPrivateInsExempted: false,
    tariffCode: '',
    vatRate: 0,
    isTaxable: true,
    duration: 30
  },
  scans: {
    name: '',
    scanCode: '',
    description: '',
    category: '',
    bodyPart: '',
    preparationInstructions: '',
    scanType: '',
    isActive: true,
    isNHISCovered: true,
    isPrivateInsExempted: false,
    tariffCode: '',
    vatRate: 0,
    isTaxable: true,
    duration: 30,
    contrastRequired: false
  }
};

// Complete Morbidity Groups
const FULL_MORBIDITY_GROUPS = [
  { value: 'afp_polio', label: 'AFP/Polio', category: 'Communicable Immunizable' },
  { value: 'meningitis', label: 'Meningitis', category: 'Communicable Immunizable' },
  { value: 'neonatal_tetanus', label: 'Neonatal Tetanus', category: 'Communicable Immunizable' },
  { value: 'pertussis_whooping_cough', label: 'Pertussis (Whooping Cough)', category: 'Communicable Immunizable' },
  { value: 'diphtheria', label: 'Diphtheria', category: 'Communicable Immunizable' },
  { value: 'measles', label: 'Measles', category: 'Communicable Immunizable' },
  { value: 'yellow_fever', label: 'Yellow Fever', category: 'Communicable Immunizable' },
  { value: 'tetanus', label: 'Tetanus', category: 'Communicable Immunizable' },
  { value: 'tuberculosis', label: 'Tuberculosis', category: 'Communicable Immunizable' },
  { value: 'uncomplicated_malaria_suspected', label: 'Uncomplicated Malaria (Suspected)', category: 'Communicable Non-Immunizable' },
  { value: 'uncomplicated_malaria_tested', label: 'Uncomplicated Malaria (Tested)', category: 'Communicable Non-Immunizable' },
  { value: 'uncomplicated_malaria_positive', label: 'Uncomplicated Malaria (Positive)', category: 'Communicable Non-Immunizable' },
  { value: 'uncomplicated_malaria_not_tested_treated', label: 'Uncomplicated Malaria (Not Tested/Treated)', category: 'Communicable Non-Immunizable' },
  { value: 'uncomplicated_malaria_tested_negative_treated', label: 'Uncomplicated Malaria (Tested Negative/Treated)', category: 'Communicable Non-Immunizable' },
  { value: 'malaria_in_pregnancy_suspected', label: 'Malaria in Pregnancy (Suspected)', category: 'Communicable Non-Immunizable' },
  { value: 'malaria_in_pregnancy_tested', label: 'Malaria in Pregnancy (Tested)', category: 'Communicable Non-Immunizable' },
  { value: 'malaria_in_pregnancy_positive', label: 'Malaria in Pregnancy (Positive)', category: 'Communicable Non-Immunizable' },
  { value: 'malaria_in_pregnancy_not_tested_treated', label: 'Malaria in Pregnancy (Not Tested/Treated)', category: 'Communicable Non-Immunizable' },
  { value: 'malaria_in_pregnancy_tested_negative_treated', label: 'Malaria in Pregnancy (Tested Negative/Treated)', category: 'Communicable Non-Immunizable' },
  { value: 'severe_malaria_lab_confirmed', label: 'Severe Malaria (Lab Confirmed)', category: 'Communicable Non-Immunizable' },
  { value: 'severe_malaria_non_lab_confirmed', label: 'Severe Malaria (Non-Lab Confirmed)', category: 'Communicable Non-Immunizable' },
  { value: 'typhoid_fever', label: 'Typhoid Fever', category: 'Communicable Non-Immunizable' },
  { value: 'suspected_cholera', label: 'Suspected Cholera', category: 'Communicable Non-Immunizable' },
  { value: 'diarrhoea_diseases', label: 'Diarrhoea Diseases', category: 'Communicable Non-Immunizable' },
  { value: 'viral_hepatitis', label: 'Viral Hepatitis', category: 'Communicable Non-Immunizable' },
  { value: 'schistosomiasis_bilharzia', label: 'Schistosomiasis (Bilharzia)', category: 'Communicable Non-Immunizable' },
  { value: 'suspected_guinea_worm', label: 'Suspected Guinea Worm', category: 'Communicable Non-Immunizable' },
  { value: 'onchocerciasis', label: 'Onchocerciasis', category: 'Communicable Non-Immunizable' },
  { value: 'buruli_ulcer', label: 'Buruli Ulcer', category: 'Communicable Non-Immunizable' },
  { value: 'leprosy', label: 'Leprosy', category: 'Communicable Non-Immunizable' },
  { value: 'hiv_aids_related_conditions', label: 'HIV/AIDS Related Conditions', category: 'Communicable Non-Immunizable' },
  { value: 'mumps', label: 'Mumps', category: 'Communicable Non-Immunizable' },
  { value: 'intestinal_worms', label: 'Intestinal Worms', category: 'Communicable Non-Immunizable' },
  { value: 'chicken_pox', label: 'Chicken Pox', category: 'Communicable Non-Immunizable' },
  { value: 'upper_respiratory_tract_infections', label: 'Upper Respiratory Tract Infections', category: 'Communicable Non-Immunizable' },
  { value: 'pneumonia', label: 'Pneumonia', category: 'Communicable Non-Immunizable' },
  { value: 'septicaemia', label: 'Septicaemia', category: 'Communicable Non-Immunizable' },
  { value: 'malnutrition', label: 'Malnutrition', category: 'Non-Communicable' },
  { value: 'obesity', label: 'Obesity', category: 'Non-Communicable' },
  { value: 'anaemia', label: 'Anaemia', category: 'Non-Communicable' },
  { value: 'other_nutritional_diseases', label: 'Other Nutritional Diseases', category: 'Non-Communicable' },
  { value: 'hypertension', label: 'Hypertension', category: 'Non-Communicable' },
  { value: 'cardiac_diseases', label: 'Cardiac Diseases', category: 'Non-Communicable' },
  { value: 'stroke', label: 'Stroke', category: 'Non-Communicable' },
  { value: 'diabetes_mellitus', label: 'Diabetes Mellitus', category: 'Non-Communicable' },
  { value: 'rheumatism_arthritis', label: 'Rheumatism/Arthritis', category: 'Non-Communicable' },
  { value: 'sickle_cell_disease', label: 'Sickle Cell Disease', category: 'Non-Communicable' },
  { value: 'asthma', label: 'Asthma', category: 'Non-Communicable' },
  { value: 'chronic_obstructive_pulmonary_disease', label: 'COPD', category: 'Non-Communicable' },
  { value: 'breast_cancer', label: 'Breast Cancer', category: 'Non-Communicable' },
  { value: 'cervical_cancer', label: 'Cervical Cancer', category: 'Non-Communicable' },
  { value: 'lymphoma', label: 'Lymphoma', category: 'Non-Communicable' },
  { value: 'prostate_cancer', label: 'Prostate Cancer', category: 'Non-Communicable' },
  { value: 'hepatocellular_carcinoma', label: 'Hepatocellular Carcinoma', category: 'Non-Communicable' },
  { value: 'all_other_cancers', label: 'All Other Cancers', category: 'Non-Communicable' },
  { value: 'schizophrenia', label: 'Schizophrenia', category: 'Mental Health' },
  { value: 'acute_psychotic_disorder', label: 'Acute Psychotic Disorder', category: 'Mental Health' },
  { value: 'mono_symptoms_delusion', label: 'Mono-Symptoms Delusion', category: 'Mental Health' },
  { value: 'depression', label: 'Depression', category: 'Mental Health' },
  { value: 'substance_abuse', label: 'Substance Abuse', category: 'Mental Health' },
  { value: 'epilepsy', label: 'Epilepsy', category: 'Mental Health' },
  { value: 'autism', label: 'Autism', category: 'Mental Health' },
  { value: 'mental_retardation', label: 'Mental Retardation', category: 'Mental Health' },
  { value: 'attention_deficit_hyperactivity_disorder', label: 'ADHD', category: 'Mental Health' },
  { value: 'conversion_disorders', label: 'Conversion Disorders', category: 'Mental Health' },
  { value: 'post_traumatic_stress_syndrome', label: 'PTSD', category: 'Mental Health' },
  { value: 'generalized_anxiety', label: 'Generalized Anxiety', category: 'Mental Health' },
  { value: 'other_anxiety_disorders', label: 'Other Anxiety Disorders', category: 'Mental Health' },
  { value: 'neurosis', label: 'Neurosis', category: 'Mental Health' },
  { value: 'acute_eye_infection', label: 'Acute Eye Infection', category: 'Specialized' },
  { value: 'cataract', label: 'Cataract', category: 'Specialized' },
  { value: 'trachoma', label: 'Trachoma', category: 'Specialized' },
  { value: 'otitis_media', label: 'Otitis Media', category: 'Specialized' },
  { value: 'other_acute_ear_infection', label: 'Other Acute Ear Infection', category: 'Specialized' },
  { value: 'dental_caries', label: 'Dental Caries', category: 'Specialized' },
  { value: 'dental_swellings', label: 'Dental Swellings', category: 'Specialized' },
  { value: 'traumatic_conditions_oral', label: 'Traumatic Conditions (Oral)', category: 'Specialized' },
  { value: 'periodontal_diseases', label: 'Periodontal Diseases', category: 'Specialized' },
  { value: 'cerebral_palsy', label: 'Cerebral Palsy', category: 'Specialized' },
  { value: 'liver_diseases', label: 'Liver Diseases', category: 'Specialized' },
  { value: 'acute_urinary_tract_infection', label: 'Acute UTI', category: 'Specialized' },
  { value: 'skin_diseases', label: 'Skin Diseases', category: 'Specialized' },
  { value: 'ulcer', label: 'Ulcer', category: 'Specialized' },
  { value: 'kidney_related_diseases', label: 'Kidney Related Diseases', category: 'Specialized' },
  { value: 'other_oral_conditions', label: 'Other Oral Conditions', category: 'Specialized' },
  { value: 'gynaecological_conditions', label: 'Gynaecological Conditions', category: 'Obstetrics & Gynaecology' },
  { value: 'pregnancy_related_complications', label: 'Pregnancy Related Complications', category: 'Obstetrics & Gynaecology' },
  { value: 'anaemia_in_pregnancy', label: 'Anaemia in Pregnancy', category: 'Obstetrics & Gynaecology' },
  { value: 'gonorrhoea', label: 'Gonorrhoea', category: 'Reproductive Tract' },
  { value: 'genital_ulcer', label: 'Genital Ulcer', category: 'Reproductive Tract' },
  { value: 'vaginal_discharge', label: 'Vaginal Discharge', category: 'Reproductive Tract' },
  { value: 'urethral_discharge', label: 'Urethral Discharge', category: 'Reproductive Tract' },
  { value: 'other_diseases_male_reproductive_system', label: 'Other Male Reproductive Diseases', category: 'Reproductive Tract' },
  { value: 'other_diseases_female_reproductive_system', label: 'Other Female Reproductive Diseases', category: 'Reproductive Tract' },
  { value: 'transport_injuries_road_traffic_accidents', label: 'Road Traffic Accidents', category: 'Injuries' },
  { value: 'home_injuries', label: 'Home Injuries', category: 'Injuries' },
  { value: 'occupational_industrial_injuries', label: 'Occupational/Industrial Injuries', category: 'Injuries' },
  { value: 'burns', label: 'Burns', category: 'Injuries' },
  { value: 'poisoning_occupational', label: 'Poisoning (Occupational)', category: 'Injuries' },
  { value: 'dog_bite', label: 'Dog Bite', category: 'Injuries' },
  { value: 'human_bites', label: 'Human Bites', category: 'Injuries' },
  { value: 'snake_bite', label: 'Snake Bite', category: 'Injuries' },
  { value: 'sexual_abuse', label: 'Sexual Abuse', category: 'Injuries' },
  { value: 'domestic_violence', label: 'Domestic Violence', category: 'Injuries' },
  { value: 'pyrexia_unknown_origin_non_malaria', label: 'Pyrexia Unknown Origin (Non-Malaria)', category: 'Injuries' },
  { value: 'brought_in_dead', label: 'Brought In Dead', category: 'Injuries' },
  { value: 'other_animal_bites', label: 'Other Animal Bites', category: 'Injuries' },
  { value: 'all_other_diseases', label: 'All Other Diseases', category: 'Injuries' },
];

// Default options
const DEFAULT_LAB_CATEGORIES = ['hematology', 'biochemistry', 'microbiology', 'serology', 'immunology', 'toxicology', 'molecular', 'cytology', 'histopathology'];
const DEFAULT_PROCEDURE_CATEGORIES = ['surgical', 'diagnostic', 'therapeutic', 'obstetric', 'pediatric', 'dental', 'ophthalmic'];
const DEFAULT_DEPARTMENTS = ['General Surgery', 'Orthopedics', 'OB/GYN', 'Cardiology', 'Neurology', 'Urology', 'ENT', 'Ophthalmology', 'Dental'];
const DEFAULT_SPECIMEN_TYPES = ['blood', 'urine', 'stool', 'csf', 'sputum', 'fluid', 'semen', 'tissue', 'saliva', 'swab', 'other'];

export default function CreateEditModal({ type, item, onSave, onClose, metadata }: CreateEditModalProps) {
  const [formData, setFormData] = useState(defaultFormData[type]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const morbidityGroups = metadata?.morbidityGroups?.length ? metadata.morbidityGroups : FULL_MORBIDITY_GROUPS;
  const labCategories = metadata?.labCategories?.length ? metadata.labCategories : DEFAULT_LAB_CATEGORIES;
  const procedureCategories = metadata?.procedureCategories?.length ? metadata.procedureCategories : DEFAULT_PROCEDURE_CATEGORIES;
  const departments = metadata?.departments?.length ? metadata.departments : DEFAULT_DEPARTMENTS;
  const specimenTypes = metadata?.specimenTypes?.length ? metadata.specimenTypes : DEFAULT_SPECIMEN_TYPES;
  
  const scanCategories = metadata?.scanCategories?.length ? metadata.scanCategories : [
    'xray', 'ultrasound', 'ct_scan', 'mri', 'fluoroscopy', 'mammography', 'nuclear', 'pet_scan', 'other'
  ];
  
  const scanBodyParts = metadata?.scanBodyParts?.length ? metadata.scanBodyParts : [
    'head', 'chest', 'neck', 'abdomen', 'pelvis', 'spine', 'extremities', 'breast', 'other'
  ];
  
  const scanTypes = metadata?.scanTypes?.length ? metadata.scanTypes : [
    'X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'Mammography', 'Fluoroscopy'
  ];

  useEffect(() => {
    if (item) {
      console.log(`📝 Editing ${type}:`, item);
      // Ensure code fields are properly mapped
      let mappedItem = { ...item };
      
      // For lab tests, ensure investigationCode is set
      if (type === 'lab-tests' && !mappedItem.investigationCode && mappedItem.code) {
        mappedItem.investigationCode = mappedItem.code;
      }
      // For procedures, ensure procedureCode is set
      if (type === 'procedures' && !mappedItem.procedureCode && mappedItem.code) {
        mappedItem.procedureCode = mappedItem.code;
      }
      // For scans, ensure scanCode is set
      if (type === 'scans' && !mappedItem.scanCode && mappedItem.code) {
        mappedItem.scanCode = mappedItem.code;
      }
      
      setFormData(mappedItem);
    } else {
      setFormData(defaultFormData[type]);
    }
  }, [item, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getTitle = () => {
    const titles: Record<string, string> = {
      'diagnoses': `${item ? 'Edit' : 'Create New'} Diagnosis`,
      'lab-tests': `${item ? 'Edit' : 'Create New'} Lab Test`,
      'procedures': `${item ? 'Edit' : 'Create New'} Procedure`,
      'scans': `${item ? 'Edit' : 'Create New'} Scan`
    };
    return titles[type] || `${item ? 'Edit' : 'Create New'} Item`;
  };

  const renderDiagnosisForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Diagnosis Name *</label>
          <input type="text" required value={formData.name || ''} onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">ICD Code *</label>
          <input type="text" required value={formData.icdCode || ''} onChange={(e) => handleChange('icdCode', e.target.value.toUpperCase())}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">G-DRG Code</label>
          <input type="text" value={formData.gdrgGroupCode || ''} onChange={(e) => handleChange('gdrgGroupCode', e.target.value.toUpperCase())}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-mono" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Morbidity Group *</label>
          <select 
            required 
            value={formData.morbidityGroup || ''} 
            onChange={(e) => handleChange('morbidityGroup', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
          >
            <option value="">Select Morbidity Group</option>
            {morbidityGroups.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Current value: {formData.morbidityGroup || 'None'}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Description</label>
        <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={3}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
      </div>

      <div className="flex gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isChronic || false} onChange={(e) => handleChange('isChronic', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          Chronic Condition
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isNHISCovered !== false} onChange={(e) => handleChange('isNHISCovered', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          NHIS Covered
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.requiresAuthorization || false} onChange={(e) => handleChange('requiresAuthorization', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          Requires Authorization
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isActive !== false} onChange={(e) => handleChange('isActive', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          Active
        </label>
      </div>
    </div>
  );

  const renderLabTestForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Test Name *</label>
          <input type="text" required value={formData.name || ''} onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Current: {formData.name || 'Not set'}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Investigation Code *</label>
          <input 
            type="text" 
            required 
            value={formData.investigationCode || ''} 
            onChange={(e) => handleChange('investigationCode', e.target.value.toUpperCase())}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-mono" 
            placeholder="e.g., LAB-INVE01D"
          />
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Current code: {formData.investigationCode || 'Not set'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Category *</label>
          <select required value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
            <option value="">Select Category</option>
            {labCategories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Specimen Type *</label>
          <select required value={formData.specimenType || ''} onChange={(e) => handleChange('specimenType', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
            <option value="">Select Specimen</option>
            {specimenTypes.map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Sub Category</label>
        <input type="text" value={formData.subCategory || ''} onChange={(e) => handleChange('subCategory', e.target.value)}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Description</label>
        <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={2}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
      </div>

      <div className="flex gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isNHISCovered !== false} onChange={(e) => handleChange('isNHISCovered', e.target.checked)} 
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          NHIS Covered
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isPrivateInsExempted || false} onChange={(e) => handleChange('isPrivateInsExempted', e.target.checked)} 
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          Private Insurance Exempted
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isActive !== false} onChange={(e) => handleChange('isActive', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          Active
        </label>
      </div>
    </div>
  );

  const renderProcedureForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Procedure Name *</label>
          <input type="text" required value={formData.name || ''} onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Procedure Code *</label>
          <input type="text" required value={formData.procedureCode || ''} onChange={(e) => handleChange('procedureCode', e.target.value.toUpperCase())}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-mono" 
            placeholder="e.g., SURG-001" />
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Current code: {formData.procedureCode || 'Not set'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Category *</label>
          <select required value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
            <option value="">Select Category</option>
            {procedureCategories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Department *</label>
          <select required value={formData.department || ''} onChange={(e) => handleChange('department', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
            <option value="">Select Department</option>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Description</label>
        <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={2}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Duration (minutes)</label>
          <input type="number" value={formData.duration || 30} onChange={(e) => handleChange('duration', parseInt(e.target.value))}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
        </div>
      </div>

      <div className="flex gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isNHISCovered !== false} onChange={(e) => handleChange('isNHISCovered', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          NHIS Covered
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isPrivateInsExempted || false} onChange={(e) => handleChange('isPrivateInsExempted', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          Private Insurance Exempted
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isActive !== false} onChange={(e) => handleChange('isActive', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          Active
        </label>
      </div>
    </div>
  );

  const renderScanForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Scan Name *</label>
          <input type="text" required value={formData.name || ''} onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Scan Code *</label>
          <input type="text" required value={formData.scanCode || ''} onChange={(e) => handleChange('scanCode', e.target.value.toUpperCase())}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-mono"
            placeholder="e.g., SCAN-XR001" />
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Current code: {formData.scanCode || 'Not set'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Category *</label>
          <select required value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
            <option value="">Select Category</option>
            {scanCategories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Body Part *</label>
          <select required value={formData.bodyPart || ''} onChange={(e) => handleChange('bodyPart', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
            <option value="">Select Body Part</option>
            {scanBodyParts.map(part => <option key={part} value={part}>{part.charAt(0).toUpperCase() + part.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Scan Type</label>
          <select value={formData.scanType || ''} onChange={(e) => handleChange('scanType', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
            <option value="">Select Scan Type</option>
            {scanTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Duration (minutes)</label>
          <input type="number" value={formData.duration || 30} onChange={(e) => handleChange('duration', parseInt(e.target.value))}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Preparation Instructions</label>
        <textarea value={formData.preparationInstructions || ''} onChange={(e) => handleChange('preparationInstructions', e.target.value)} rows={2}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Description</label>
        <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={2}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
      </div>

      <div className="flex gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.contrastRequired || false} onChange={(e) => handleChange('contrastRequired', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          Contrast Required
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isNHISCovered !== false} onChange={(e) => handleChange('isNHISCovered', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          NHIS Covered
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isPrivateInsExempted || false} onChange={(e) => handleChange('isPrivateInsExempted', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          Private Insurance Exempted
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isActive !== false} onChange={(e) => handleChange('isActive', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)]" />
          Active
        </label>
      </div>
    </div>
  );

  const renderForm = () => {
    switch (type) {
      case 'diagnoses': return renderDiagnosisForm();
      case 'lab-tests': return renderLabTestForm();
      case 'procedures': return renderProcedureForm();
      case 'scans': return renderScanForm();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] sticky top-0 bg-[var(--bg-card)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{getTitle()}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {renderForm()}
          
          <div className="flex gap-3 justify-end pt-6 mt-4 border-t border-[var(--border-color)]">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors disabled:opacity-50 text-sm font-medium"
            >
              <Save className="w-4 h-4" /> 
              {isSubmitting ? 'Saving...' : (item ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}