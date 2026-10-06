// src/components/AdditionalInfoTab.tsx
import { useState } from 'react';
import {
  Mail,
  Home,
  IdCard,
  Heart,
  Briefcase,
  Users,
  Phone,
  ChevronDown,
  Info,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  AdditionalInfo,
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalHistory,
  PatientSurgicalHistory,
} from '../types';

interface AdditionalInfoTabProps {
  additionalInfo: AdditionalInfo;
  onAdditionalInfoChange: (info: AdditionalInfo) => void;
  clinicalHistory: {
    allergies: PatientAllergy[];
    medicalHistories: PatientMedicalHistory[];
    surgicalHistories: PatientSurgicalHistory[];
    familyHistories: PatientFamilyHistory[];
  };
  onClinicalHistoryChange: (history: AdditionalInfoTabProps['clinicalHistory']) => void;
}

// ── shared styles ─────────────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-lg ' +
  'bg-[var(--bg-main)] text-[var(--text-primary)] ' +
  'placeholder:text-[var(--text-tertiary)] ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] ' +
  'focus:border-[var(--icon-cyan-text)] transition-all';

const labelCls = 'block text-xs font-medium text-[var(--text-secondary)] mb-1.5';

// ── section definitions ───────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'contact'        as const,
    title:    'Contact information',
    subtitle: 'Email, house number',
    iconBg:    'var(--icon-cyan-bg)',
    iconColor: 'var(--icon-cyan-text)',
    Icon: Mail,
  },
  {
    id: 'identification' as const,
    title:    'Identification',
    subtitle: 'ID type, ID number',
    iconBg:    'var(--icon-purple-bg)',
    iconColor: 'var(--icon-purple-text)',
    Icon: IdCard,
  },
  {
    id: 'medical'        as const,
    title:    'Medical information',
    subtitle: 'Blood type, occupation, allergies, and history',
    iconBg:    'var(--icon-red-bg)',
    iconColor: 'var(--icon-red-text)',
    Icon: Heart,
  },
  {
    id: 'emergency'      as const,
    title:    'Emergency contact',
    subtitle: 'Next of kin, contact details',
    iconBg:    'var(--icon-green-bg)',
    iconColor: 'var(--icon-green-text)',
    Icon: Users,
  },
];

type SectionId = (typeof SECTIONS)[number]['id'];

// ── main component ────────────────────────────────────────────────────────────
export default function AdditionalInfoTab({
  additionalInfo,
  onAdditionalInfoChange,
  clinicalHistory,
  onClinicalHistoryChange,
}: AdditionalInfoTabProps) {
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set(['contact', 'medical'])
  );

  const toggleSection = (id: SectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateField = (field: string, value: any) => {
    onAdditionalInfoChange({ ...additionalInfo, [field]: value });
  };

  const updateEmergencyContact = (field: string, value: string) => {
    onAdditionalInfoChange({
      ...additionalInfo,
      emergencyContact: {
        ...(additionalInfo.emergencyContact || { name: '', relationship: '', phone: '' }),
        [field]: value,
      },
    });
  };

  const updateAllergy = (index: number, patch: Partial<PatientAllergy>) =>
    onClinicalHistoryChange({
      ...clinicalHistory,
      allergies: clinicalHistory.allergies.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  const updateMedicalHistory = (index: number, patch: Partial<PatientMedicalHistory>) =>
    onClinicalHistoryChange({
      ...clinicalHistory,
      medicalHistories: clinicalHistory.medicalHistories.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  const updateSurgicalHistory = (index: number, patch: Partial<PatientSurgicalHistory>) =>
    onClinicalHistoryChange({
      ...clinicalHistory,
      surgicalHistories: clinicalHistory.surgicalHistories.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  const updateFamilyHistory = (index: number, patch: Partial<PatientFamilyHistory>) =>
    onClinicalHistoryChange({
      ...clinicalHistory,
      familyHistories: clinicalHistory.familyHistories.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });

  return (
    <div className="space-y-4">

      {/* Optional info banner */}
      <div
        className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border"
        style={{ background: 'var(--icon-cyan-bg)', borderColor: 'var(--border-color)' }}
      >
        <Info
          className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
          style={{ color: 'var(--icon-cyan-text)' }}
        />
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--icon-cyan-text)' }}>
            All fields are optional
          </p>
          <p
            className="text-xs mt-0.5 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            These details can be filled now or updated later from the patient's profile.
          </p>
        </div>
      </div>

      {/* Accordion wrapper */}
      <div
        className="rounded-xl overflow-hidden border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        {/* Sub-header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Additional information
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {openSections.size} of {SECTIONS.length}{' '}
            section{openSections.size !== 1 ? 's' : ''} open
          </span>
        </div>

        {/* Accordion items */}
        {SECTIONS.map((section, idx) => {
          const isOpen = openSections.has(section.id);
          const isLast = idx === SECTIONS.length - 1;
          const medicalEntryCount = clinicalHistory.allergies.length
            + clinicalHistory.medicalHistories.length
            + clinicalHistory.surgicalHistories.length
            + clinicalHistory.familyHistories.length;

          return (
            <div
              key={section.id}
              style={
                isLast
                  ? undefined
                  : { borderBottom: '0.5px solid var(--border-color)' }
              }
            >
              {/* Header row */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    'var(--bg-main)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    'transparent')
                }
              >
                <div className="flex items-center gap-3">
                  {/* Icon pip */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isOpen ? section.iconBg : 'var(--bg-main)',
                      border: '0.5px solid var(--border-color)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <section.Icon
                      className="w-3.5 h-3.5"
                      style={{
                        color: isOpen ? section.iconColor : 'var(--text-tertiary)',
                        transition: 'color 0.2s',
                      }}
                    />
                  </div>

                  {/* Labels */}
                  <div>
                    <p
                      className="text-xs font-medium leading-tight"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {section.title}
                      {section.id === 'medical' && medicalEntryCount > 0 && (
                        <span
                          className="ml-2 rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{ background: section.iconBg, color: section.iconColor }}
                        >
                          {medicalEntryCount}
                        </span>
                      )}
                    </p>
                    <p
                      className="text-xs leading-tight mt-0.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {section.subtitle}
                    </p>
                  </div>
                </div>

                {/* Chevron */}
                <ChevronDown
                  className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
                  style={{
                    color: 'var(--text-tertiary)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {/* Expandable content */}
              {isOpen && (
                <div
                  className="px-4 pb-5"
                  style={{ borderTop: '0.5px solid var(--border-color)' }}
                >
                  <div className="pt-4">
                    {section.id === 'contact' && (
                      <ContactSection
                        additionalInfo={additionalInfo}
                        updateField={updateField}
                      />
                    )}
                    {section.id === 'identification' && (
                      <IdentificationSection
                        additionalInfo={additionalInfo}
                        updateField={updateField}
                      />
                    )}
                    {section.id === 'medical' && (
                      <MedicalSection
                        additionalInfo={additionalInfo}
                        updateField={updateField}
                        clinicalHistory={clinicalHistory}
                        updateAllergy={updateAllergy}
                        updateMedicalHistory={updateMedicalHistory}
                        updateSurgicalHistory={updateSurgicalHistory}
                        updateFamilyHistory={updateFamilyHistory}
                        onClinicalHistoryChange={onClinicalHistoryChange}
                      />
                    )}
                    {section.id === 'emergency' && (
                      <EmergencySection
                        additionalInfo={additionalInfo}
                        updateField={updateField}
                        updateEmergencyContact={updateEmergencyContact}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section sub-components ────────────────────────────────────────────────────

function ContactSection({
  additionalInfo,
  updateField,
}: {
  additionalInfo: AdditionalInfo;
  updateField: (field: string, value: any) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={labelCls}>
          <span className="flex items-center gap-1.5">
            <Mail className="w-3 h-3" style={{ color: 'var(--icon-cyan-text)' }} />
            Email address
          </span>
        </label>
        <input
          type="email"
          value={additionalInfo.email || ''}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="patient@example.com"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>
          <span className="flex items-center gap-1.5">
            <Home className="w-3 h-3" style={{ color: 'var(--icon-cyan-text)' }} />
            House number
          </span>
        </label>
        <input
          type="text"
          value={additionalInfo.houseNumber || ''}
          onChange={(e) => updateField('houseNumber', e.target.value)}
          placeholder="House / apartment number"
          className={inputCls}
        />
      </div>
    </div>
  );
}

function IdentificationSection({
  additionalInfo,
  updateField,
}: {
  additionalInfo: AdditionalInfo;
  updateField: (field: string, value: any) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={labelCls}>
          <span className="flex items-center gap-1.5">
            <IdCard className="w-3 h-3" style={{ color: 'var(--icon-purple-text)' }} />
            ID type
          </span>
        </label>
        <select
          value={additionalInfo.idType || ''}
          onChange={(e) => updateField('idType', e.target.value)}
          className={inputCls}
        >
          <option value="">Select ID type</option>
          <option value="GhanaCard">Ghana Card</option>
          <option value="Voter ID">Voter ID</option>
          <option value="Passport">Passport</option>
          <option value="Driver License">Driver License</option>
          <option value="NHIS Card">NHIS Card</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className={labelCls}>ID number</label>
        <input
          type="text"
          value={additionalInfo.idNumber || ''}
          onChange={(e) => updateField('idNumber', e.target.value)}
          placeholder="Enter ID number"
          className={inputCls}
        />
      </div>
    </div>
  );
}

function MedicalSection({
  additionalInfo,
  updateField,
  clinicalHistory,
  updateAllergy,
  updateMedicalHistory,
  updateSurgicalHistory,
  updateFamilyHistory,
  onClinicalHistoryChange,
}: {
  additionalInfo: AdditionalInfo;
  updateField: (field: string, value: any) => void;
  clinicalHistory: AdditionalInfoTabProps['clinicalHistory'];
  updateAllergy: (index: number, patch: Partial<PatientAllergy>) => void;
  updateMedicalHistory: (index: number, patch: Partial<PatientMedicalHistory>) => void;
  updateSurgicalHistory: (index: number, patch: Partial<PatientSurgicalHistory>) => void;
  updateFamilyHistory: (index: number, patch: Partial<PatientFamilyHistory>) => void;
  onClinicalHistoryChange: AdditionalInfoTabProps['onClinicalHistoryChange'];
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            <span className="flex items-center gap-1.5">
              <Heart className="w-3 h-3" style={{ color: 'var(--icon-red-text)' }} />
              Blood type
            </span>
          </label>
          <select
            value={additionalInfo.bloodType || ''}
            onChange={(e) => updateField('bloodType', e.target.value)}
            className={inputCls}
          >
            <option value="">Select blood type</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" style={{ color: 'var(--icon-orange-text)' }} />
              Occupation
            </span>
          </label>
          <input
            type="text"
            value={additionalInfo.occupation || ''}
            onChange={(e) => updateField('occupation', e.target.value)}
            placeholder="Patient's occupation"
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-3">
        <HistoryGroup
          title="Allergies"
          onAdd={() => onClinicalHistoryChange({
            ...clinicalHistory,
            allergies: [...clinicalHistory.allergies, { allergen: '', reaction: '', severity: 'mild', notes: '' }],
          })}
        >
          {clinicalHistory.allergies.map((allergy, index) => (
            <div key={allergy.id || `allergy-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)' }}>
              <input aria-label="Allergen" value={allergy.allergen} onChange={(e) => updateAllergy(index, { allergen: e.target.value })} placeholder="Allergen (e.g. penicillin)" className={inputCls} />
              <input aria-label="Allergic reaction" value={allergy.reaction || ''} onChange={(e) => updateAllergy(index, { reaction: e.target.value })} placeholder="Reaction" className={inputCls} />
              <select aria-label="Allergy severity" value={allergy.severity || ''} onChange={(e) => updateAllergy(index, { severity: e.target.value as PatientAllergy['severity'] })} className={inputCls}>
                <option value="">Severity not known</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
              <input aria-label="Allergy notes" value={allergy.notes || ''} onChange={(e) => updateAllergy(index, { notes: e.target.value })} placeholder="Notes" className={inputCls} />
              <RemoveHistoryButton onClick={() => onClinicalHistoryChange({
                ...clinicalHistory,
                allergies: clinicalHistory.allergies.filter((_, itemIndex) => itemIndex !== index),
              })} />
            </div>
          ))}
        </HistoryGroup>

        <HistoryGroup
          title="Medical conditions"
          onAdd={() => onClinicalHistoryChange({
            ...clinicalHistory,
            medicalHistories: [...clinicalHistory.medicalHistories, { condition: '', diagnosedAt: '', notes: '' }],
          })}
        >
          {clinicalHistory.medicalHistories.map((history, index) => (
            <div key={history.id || `medical-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)' }}>
              <input aria-label="Medical condition" value={history.condition} onChange={(e) => updateMedicalHistory(index, { condition: e.target.value })} placeholder="Condition (e.g. asthma)" className={inputCls} />
              <input aria-label="Date diagnosed" type="date" value={history.diagnosedAt || ''} onChange={(e) => updateMedicalHistory(index, { diagnosedAt: e.target.value })} className={inputCls} />
              <input aria-label="Medical history notes" value={history.notes || ''} onChange={(e) => updateMedicalHistory(index, { notes: e.target.value })} placeholder="Notes" className={inputCls} />
              <RemoveHistoryButton onClick={() => onClinicalHistoryChange({
                ...clinicalHistory,
                medicalHistories: clinicalHistory.medicalHistories.filter((_, itemIndex) => itemIndex !== index),
              })} />
            </div>
          ))}
        </HistoryGroup>

        <HistoryGroup
          title="Surgical history"
          onAdd={() => onClinicalHistoryChange({
            ...clinicalHistory,
            surgicalHistories: [...clinicalHistory.surgicalHistories, { procedure: '', surgeryDate: '', notes: '' }],
          })}
        >
          {clinicalHistory.surgicalHistories.map((history, index) => (
            <div key={history.id || `surgery-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)' }}>
              <input aria-label="Surgical procedure" value={history.procedure} onChange={(e) => updateSurgicalHistory(index, { procedure: e.target.value })} placeholder="Procedure" className={inputCls} />
              <input aria-label="Surgery date" type="date" value={history.surgeryDate || ''} onChange={(e) => updateSurgicalHistory(index, { surgeryDate: e.target.value })} className={inputCls} />
              <input aria-label="Surgical history notes" value={history.notes || ''} onChange={(e) => updateSurgicalHistory(index, { notes: e.target.value })} placeholder="Notes" className={inputCls} />
              <RemoveHistoryButton onClick={() => onClinicalHistoryChange({
                ...clinicalHistory,
                surgicalHistories: clinicalHistory.surgicalHistories.filter((_, itemIndex) => itemIndex !== index),
              })} />
            </div>
          ))}
        </HistoryGroup>

        <HistoryGroup
          title="Family history"
          onAdd={() => onClinicalHistoryChange({
            ...clinicalHistory,
            familyHistories: [...clinicalHistory.familyHistories, { relation: '', condition: '', notes: '' }],
          })}
        >
          {clinicalHistory.familyHistories.map((history, index) => (
            <div key={history.id || `family-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)' }}>
              <input aria-label="Family member relationship" value={history.relation} onChange={(e) => updateFamilyHistory(index, { relation: e.target.value })} placeholder="Relative (e.g. mother)" className={inputCls} />
              <input aria-label="Family condition" value={history.condition} onChange={(e) => updateFamilyHistory(index, { condition: e.target.value })} placeholder="Condition" className={inputCls} />
              <input aria-label="Family history notes" value={history.notes || ''} onChange={(e) => updateFamilyHistory(index, { notes: e.target.value })} placeholder="Notes" className={inputCls} />
              <RemoveHistoryButton onClick={() => onClinicalHistoryChange({
                ...clinicalHistory,
                familyHistories: clinicalHistory.familyHistories.filter((_, itemIndex) => itemIndex !== index),
              })} />
            </div>
          ))}
        </HistoryGroup>
      </div>
    </div>
  );
}

function HistoryGroup({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-[var(--icon-cyan-bg)]" style={{ color: 'var(--icon-cyan-text)' }}>
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      {children || (
        <p className="rounded-lg border border-dashed border-[var(--border-color)] px-3 py-2 text-[11px] text-[var(--text-tertiary)]">
          No {title.toLowerCase()} recorded yet.
        </p>
      )}
    </section>
  );
}

function RemoveHistoryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove history entry" className="inline-flex w-fit items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-[var(--icon-red-bg)]" style={{ color: 'var(--icon-red-text)', borderColor: 'var(--border-color)' }}>
      <Trash2 className="w-3 h-3" /> Remove
    </button>
  );
}

function EmergencySection({
  additionalInfo,
  updateField,
  updateEmergencyContact,
}: {
  additionalInfo: AdditionalInfo;
  updateField: (field: string, value: any) => void;
  updateEmergencyContact: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Next of kin + relationship */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            <span className="flex items-center gap-1.5">
              <Users className="w-3 h-3" style={{ color: 'var(--icon-green-text)' }} />
              Next of kin
            </span>
          </label>
          <input
            type="text"
            value={additionalInfo.nextOfKin || ''}
            onChange={(e) => updateField('nextOfKin', e.target.value)}
            placeholder="Name of next of kin"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Relationship to patient</label>
          <input
            type="text"
            value={additionalInfo.emergencyContact?.relationship || ''}
            onChange={(e) => updateEmergencyContact('relationship', e.target.value)}
            placeholder="e.g. Spouse, Parent, Sibling"
            className={inputCls}
          />
        </div>
      </div>

      {/* Emergency contact sub-card */}
      <div
        className="rounded-lg p-3.5 border"
        style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
      >
        <p
          className="text-xs font-medium mb-3 flex items-center gap-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Phone className="w-3 h-3" style={{ color: 'var(--icon-green-text)' }} />
          Emergency contact details
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Full name</label>
            <input
              type="text"
              value={additionalInfo.emergencyContact?.name || ''}
              onChange={(e) => updateEmergencyContact('name', e.target.value)}
              placeholder="Full name"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Relationship</label>
            <input
              type="text"
              value={additionalInfo.emergencyContact?.relationship || ''}
              onChange={(e) => updateEmergencyContact('relationship', e.target.value)}
              placeholder="Relationship"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3 h-3" style={{ color: 'var(--icon-cyan-text)' }} />
                Phone number
              </span>
            </label>
            <input
              type="tel"
              value={additionalInfo.emergencyContact?.phone || ''}
              onChange={(e) => updateEmergencyContact('phone', e.target.value)}
              placeholder="Phone number"
              className={inputCls}
            />
          </div>
        </div>
      </div>
    </div>
  );
}