// components/CreateEditModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { 
  DiagnosisCategory,
  DiagnosisVariant,
  LabCategory,
  SpecimenType,
  ProcedureCategory,
  ScanCategory,
  BodyPart
} from '../../types';

interface CreateEditModalProps {
  type: 'diagnoses' | 'lab-tests' | 'procedures' | 'scans';
  item?: any;
  onSave: (data: any) => void;
  onClose: () => void;
  metadata: {
    diagnosisCategories: string[];
    diagnosisVariants: string[];
    scanCategories: string[];
    scanBodyParts: string[];
    scanTypes: string[];
  };
}

// Default form data structures
const defaultFormData = {
  diagnoses: {
    name: '',
    icdCode: '',
    gdrgCode: '',
    category: '' as DiagnosisCategory,
    variant: '' as DiagnosisVariant,
    description: '',
    isChronic: false,
    isNHISCovered: true,
    tariffCode: '',
    isPending: false
  },
  'lab-tests': {
    name: '',
    investigationCode: '',
    category: '' as LabCategory,
    subCategory: '',
    description: '',
    specimenType: '' as SpecimenType,
    cashPrice: 0,
    nhisPrice: 0,
    insurancePrice: 0,
    isNHISCovered: true,
    isPrivateInsExempted: false,
    tariffCode: '',
    isPending: false,
    vatRate: 0,
    isTaxable: true,
    resultTemplate: null
  },
  procedures: {
    name: '',
    procedureCode: '',
    category: '' as ProcedureCategory,
    department: '',
    description: '',
    cashPrice: 0,
    nhisPrice: 0,
    insurancePrice: 0,
    isNHISCovered: true,
    isPrivateInsExempted: false,
    tariffCode: '',
    isPending: false,
    vatRate: 0,
    isTaxable: true,
    duration: 30
  },
  scans: {
    name: '',
    scanCode: '',
    description: '',
    category: '' as ScanCategory,
    bodyPart: '' as BodyPart,
    preparationInstructions: '',
    scanType: '',
    cashPrice: 0,
    nhisPrice: 0,
    insurancePrice: 0,
    isNHISCovered: true,
    isPrivateInsExempted: false,
    tariffCode: '',
    isPending: false,
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getTitle = () => {
    return `${item ? 'Edit' : 'Create New'} ${type.slice(0, -1).replace('-', ' ')}`;
  };

  const renderDiagnosisForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Diagnosis Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            ICD Code *
          </label>
          <input
            type="text"
            required
            value={formData.icdCode}
            onChange={(e) => handleChange('icdCode', e.target.value.toUpperCase())}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)] font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            G-DRG Code *
          </label>
          <input
            type="text"
            required
            value={formData.gdrgCode}
            onChange={(e) => handleChange('gdrgCode', e.target.value.toUpperCase())}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)] font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Category *
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          >
            <option value="">Select Category</option>
            {metadata.diagnosisCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Variant
          </label>
          <select
            value={formData.variant}
            onChange={(e) => handleChange('variant', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          >
            <option value="">Select Variant</option>
            {metadata.diagnosisVariants.map(variant => (
              <option key={variant} value={variant}>{variant}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Tariff Code
          </label>
          <input
            type="text"
            value={formData.tariffCode}
            onChange={(e) => handleChange('tariffCode', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
        />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={formData.isChronic}
            onChange={(e) => handleChange('isChronic', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)]"
          />
          Chronic Condition
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={formData.isNHISCovered}
            onChange={(e) => handleChange('isNHISCovered', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)]"
          />
          NHIS Covered
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={formData.isPending}
            onChange={(e) => handleChange('isPending', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)]"
          />
          Pending Approval
        </label>
      </div>
    </div>
  );

  const renderLabTestForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Test Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Investigation Code *
          </label>
          <input
            type="text"
            required
            value={formData.investigationCode}
            onChange={(e) => handleChange('investigationCode', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)] font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Category *
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          >
            <option value="">Select Category</option>
            <option value="hematology">Hematology</option>
            <option value="biochemistry">Biochemistry</option>
            <option value="microbiology">Microbiology</option>
            <option value="serology">Serology</option>
            <option value="immunology">Immunology</option>
            <option value="toxicology">Toxicology</option>
            <option value="molecular">Molecular</option>
            <option value="cytology">Cytology</option>
            <option value="histopathology">Histopathology</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Sub Category
          </label>
          <input
            type="text"
            value={formData.subCategory}
            onChange={(e) => handleChange('subCategory', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Specimen Type *
          </label>
          <select
            required
            value={formData.specimenType}
            onChange={(e) => handleChange('specimenType', e.target.value)}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          >
            <option value="">Select Specimen</option>
            <option value="blood">Blood</option>
            <option value="urine">Urine</option>
            <option value="stool">Stool</option>
            <option value="csf">CSF</option>
            <option value="sputum">Sputum</option>
            <option value="fluid">Fluid</option>
            <option value="semen">Semen</option>
            <option value="tissue">Tissue</option>
            <option value="saliva">Saliva</option>
            <option value="swab">Swab</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Cash Price (GHS) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.cashPrice}
            onChange={(e) => handleChange('cashPrice', parseFloat(e.target.value))}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            NHIS Price (GHS)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.nhisPrice}
            onChange={(e) => handleChange('nhisPrice', parseFloat(e.target.value))}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Insurance Price (GHS) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.insurancePrice}
            onChange={(e) => handleChange('insurancePrice', parseFloat(e.target.value))}
            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
        />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={formData.isNHISCovered}
            onChange={(e) => handleChange('isNHISCovered', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)]"
          />
          NHIS Covered
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={formData.isPrivateInsExempted}
            onChange={(e) => handleChange('isPrivateInsExempted', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)]"
          />
          Private Insurance Exempted
        </label>
        <label className="flex items-center gap-2 text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={formData.isPending}
            onChange={(e) => handleChange('isPending', e.target.checked)}
            className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)]"
          />
          Pending Approval
        </label>
      </div>
    </div>
  );

  // Similar forms for procedures and scans would follow the same pattern...

  const renderForm = () => {
    switch (type) {
      case 'diagnoses':
        return renderDiagnosisForm();
      case 'lab-tests':
        return renderLabTestForm();
      case 'procedures':
        // Similar structure for procedures
        return <div>Procedure form would go here...</div>;
      case 'scans':
        // Similar structure for scans
        return <div>Scan form would go here...</div>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition-colors text-[var(--text-secondary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {renderForm()}

          <div className="flex gap-3 justify-end pt-6 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors disabled:opacity-50"
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