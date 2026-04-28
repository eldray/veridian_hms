// components/CreateEditModal.tsx - FIXED with fallbacks
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

export default function CreateEditModal({ type, item, onSave, onClose, metadata }: CreateEditModalProps) {
  const [formData, setFormData] = useState(defaultFormData[type]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
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
    return `${item ? 'Edit' : 'Create New'} ${type.slice(0, -1).replace('-', ' ')}`;
  };
  
  const scanCategories = metadata?.scanCategories?.length ? metadata.scanCategories : [
    'xray', 'ultrasound', 'ct_scan', 'mri', 'fluoroscopy', 'mammography', 'nuclear', 'pet_scan', 'other'
  ];
  
  const scanBodyParts = metadata?.scanBodyParts?.length ? metadata.scanBodyParts : [
    'head', 'chest', 'neck', 'abdomen', 'pelvis', 'spine', 'extremities', 'breast', 'other'
  ];
  
  const scanTypes = metadata?.scanTypes?.length ? metadata.scanTypes : [
    'X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'Mammography', 'Fluoroscopy'
  ];

  const specimenTypes = ['blood', 'urine', 'stool', 'csf', 'sputum', 'fluid', 'semen', 'tissue', 'saliva', 'swab', 'other'];
  const labCategories = ['hematology', 'biochemistry', 'microbiology', 'serology', 'immunology', 'toxicology', 'molecular', 'cytology', 'histopathology'];
  const procedureCategories = ['surgical', 'diagnostic', 'therapeutic', 'obstetric', 'pediatric', 'dental', 'ophthalmic'];
  const departments = ['General Surgery', 'Orthopedics', 'OB/GYN', 'Cardiology', 'Neurology', 'Urology', 'ENT', 'Ophthalmology', 'Dental'];

  const renderDiagnosisForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Diagnosis Name *</label>
          <input type="text" required value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">ICD Code *</label>
          <input type="text" required value={formData.icdCode} onChange={(e) => handleChange('icdCode', e.target.value.toUpperCase())}
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
          <select required value={formData.morbidityGroup} onChange={(e) => handleChange('morbidityGroup', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
            <option value="">Select Morbidity Group</option>
            <option value="hypertension">Hypertension</option>
            <option value="diabetes_mellitus">Diabetes Mellitus</option>
            <option value="pneumonia">Pneumonia</option>
            <option value="uncomplicated_malaria_tested">Uncomplicated Malaria</option>
            <option value="asthma">Asthma</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Description</label>
        <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={3}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input type="checkbox" checked={formData.isChronic} onChange={(e) => handleChange('isChronic', e.target.checked)}
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
      </div>
    </div>
  );

  const renderLabTestForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Test Name *</label>
          <input type="text" required value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Investigation Code *</label>
          <input type="text" required value={formData.investigationCode} onChange={(e) => handleChange('investigationCode', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Category *</label>
          <select required value={formData.category} onChange={(e) => handleChange('category', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
            <option value="">Select Category</option>
            {labCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Specimen Type *</label>
          <select required value={formData.specimenType} onChange={(e) => handleChange('specimenType', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
            <option value="">Select Specimen</option>
            {specimenTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Sub Category</label>
        <input type="text" value={formData.subCategory || ''} onChange={(e) => handleChange('subCategory', e.target.value)}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg" />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Description</label>
        <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={2}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg" />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={formData.isNHISCovered !== false} onChange={(e) => handleChange('isNHISCovered', e.target.checked)} className="rounded" />
          NHIS Covered
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={formData.isPrivateInsExempted || false} onChange={(e) => handleChange('isPrivateInsExempted', e.target.checked)} className="rounded" />
          Private Insurance Exempted
        </label>
      </div>
    </div>
  );

  const renderProcedureForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Procedure Name *</label>
          <input type="text" required value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Procedure Code *</label>
          <input type="text" required value={formData.procedureCode} onChange={(e) => handleChange('procedureCode', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border rounded-lg font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Category *</label>
          <select required value={formData.category} onChange={(e) => handleChange('category', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border rounded-lg">
            <option value="">Select Category</option>
            {procedureCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Department *</label>
          <select required value={formData.department} onChange={(e) => handleChange('department', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border rounded-lg">
            <option value="">Select Department</option>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={2}
          className="w-full p-2 bg-[var(--bg-card)] border rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-2">Duration (minutes)</label><input type="number" value={formData.duration || 30} onChange={(e) => handleChange('duration', parseInt(e.target.value))} className="w-full p-2 bg-[var(--bg-card)] border rounded-lg" /></div>
      </div>
    </div>
  );

  const renderScanForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Scan Name *</label>
          <input type="text" required value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Scan Code *</label>
          <input type="text" required value={formData.scanCode} onChange={(e) => handleChange('scanCode', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border rounded-lg font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Category *</label>
          <select required value={formData.category} onChange={(e) => handleChange('category', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border rounded-lg">
            <option value="">Select Category</option>
            {scanCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Body Part *</label>
          <select required value={formData.bodyPart} onChange={(e) => handleChange('bodyPart', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border rounded-lg">
            <option value="">Select Body Part</option>
            {scanBodyParts.map(part => <option key={part} value={part}>{part}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Scan Type</label>
          <select value={formData.scanType || ''} onChange={(e) => handleChange('scanType', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border rounded-lg">
            <option value="">Select Scan Type</option>
            {scanTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
          <input type="number" value={formData.duration || 30} onChange={(e) => handleChange('duration', parseInt(e.target.value))}
            className="w-full p-2 bg-[var(--bg-card)] border rounded-lg" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Preparation Instructions</label>
        <textarea value={formData.preparationInstructions || ''} onChange={(e) => handleChange('preparationInstructions', e.target.value)} rows={2}
          className="w-full p-2 bg-[var(--bg-card)] border rounded-lg" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={2}
          className="w-full p-2 bg-[var(--bg-card)] border rounded-lg" />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={formData.contrastRequired || false} onChange={(e) => handleChange('contrastRequired', e.target.checked)} className="rounded" />
          Contrast Required
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
      <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{getTitle()}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-main)] rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {renderForm()}
          <div className="flex gap-3 justify-end pt-6 border-t border-[var(--border-color)]">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)]">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : (item ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}