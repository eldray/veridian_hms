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
} from 'lucide-react';
import type { AdditionalInfo } from '../types';

interface AdditionalInfoTabProps {
  additionalInfo: AdditionalInfo;
  onAdditionalInfoChange: (info: AdditionalInfo) => void;
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
    subtitle: 'Blood type, occupation',
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
}: AdditionalInfoTabProps) {
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set(['contact'])
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
        ...additionalInfo.emergencyContact,
        [field]: value,
      },
    });
  };

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
}: {
  additionalInfo: AdditionalInfo;
  updateField: (field: string, value: any) => void;
}) {
  return (
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