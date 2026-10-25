import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { getPatientAllergies } from '../../api';
import type { PatientAllergy } from '../../types';

type AllergyReviewStatus = 'not_reviewed' | 'no_known_allergies' | 'allergies_present';

interface AllergyBannerProps {
  patientId?: string | null;
  /** Allergies already loaded with the patient; omit to fetch them by id. */
  allergies?: PatientAllergy[] | null;
  /** Allergy review recorded on the selected attendance, when there is one. */
  allergyReviewStatus?: AllergyReviewStatus | null;
  className?: string;
}

const shell = 'flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5';

export function AllergyBanner({
  patientId,
  allergies,
  allergyReviewStatus,
  className = '',
}: AllergyBannerProps) {
  const [fetched, setFetched] = useState<PatientAllergy[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (Array.isArray(allergies)) {
      setFetched(null);
      setFailed(false);
      return;
    }
    if (!patientId) {
      setFetched(null);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setFetched(null);
    setFailed(false);
    getPatientAllergies(patientId)
      .then((list) => {
        if (!cancelled) setFetched(list);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, allergies]);

  if (failed) {
    return (
      <div
        role="alert"
        className={`${shell} bg-[var(--icon-yellow-bg)] border-[var(--icon-yellow-text)] ${className}`}
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--icon-yellow-text)]" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--icon-yellow-text)]">
            Allergy information could not be loaded
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Open the patient record and check the allergy list before prescribing or dispensing.
          </p>
        </div>
      </div>
    );
  }

  const recorded = Array.isArray(allergies) ? allergies : fetched;
  if (!recorded) return null;

  if (recorded.length > 0) {
    return (
      <div
        role="alert"
        className={`${shell} bg-[var(--icon-red-bg)] border-[var(--icon-red-text)] ${className}`}
      >
        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--icon-red-text)]" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--icon-red-text)]">
            Allergy alert — {recorded.length} recorded allerg{recorded.length === 1 ? 'y' : 'ies'}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {recorded.map((allergy) => (
              <span
                key={allergy.id || allergy.allergen}
                className="rounded-md bg-[var(--bg-card)] px-2 py-0.5 text-[11px] text-[var(--text-primary)]"
              >
                <strong>{allergy.allergen}</strong>
                {allergy.reaction ? ` — ${allergy.reaction}` : ''}
                {allergy.severity ? ` (${allergy.severity})` : ''}
              </span>
            ))}
          </div>
          {allergyReviewStatus === 'not_reviewed' && (
            <p className="text-[10px] text-[var(--icon-red-text)] mt-1">
              Allergy status has not been confirmed for this visit. Confirm with the patient before treatment.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (allergyReviewStatus === 'not_reviewed') {
    return (
      <div
        role="alert"
        className={`${shell} bg-[var(--icon-yellow-bg)] border-[var(--icon-yellow-text)] ${className}`}
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--icon-yellow-text)]" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--icon-yellow-text)]">
            Allergy status not reviewed for this visit
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Confirm the patient's allergy status before prescribing or dispensing.
          </p>
        </div>
      </div>
    );
  }

  if (allergyReviewStatus === 'allergies_present') {
    return (
      <div
        role="alert"
        className={`${shell} bg-[var(--icon-yellow-bg)] border-[var(--icon-yellow-text)] ${className}`}
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--icon-yellow-text)]" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--icon-yellow-text)]">
            Allergies recorded as present, but no allergen details are on file
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Ask the patient and add the missing allergy details to their record.
          </p>
        </div>
      </div>
    );
  }

  if (allergyReviewStatus === 'no_known_allergies') {
    return (
      <div
        role="status"
        className={`${shell} bg-[var(--icon-green-bg)] border-[var(--icon-green-text)] ${className}`}
      >
        <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--icon-green-text)]" />
        <p className="text-xs font-bold text-[var(--icon-green-text)]">
          No known allergies — confirmed for this visit
        </p>
      </div>
    );
  }

  return null;
}
