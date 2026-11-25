import React from 'react';
import { User, Calendar, FlaskConical, Package } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

/** Consistent, theme-aware empty state used across patient and clinical workflows. */
const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description }) => (
  <div
    role="status"
    className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-7 text-center"
  >
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bg-main)] text-[var(--text-tertiary)]">
      <Icon aria-hidden="true" className="h-5 w-5" />
    </div>
    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
    <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">{description}</p>
  </div>
);

export const NoPatientSelected: React.FC = () => (
  <EmptyState
    icon={User}
    title="No Patient Selected"
    description="Search and select a patient to get started"
  />
);

export const NoAttendanceSelected: React.FC = () => (
  <EmptyState
    icon={Calendar}
    title="No Attendance Selected"
    description="Select an attendance to view and manage data"
  />
);

export const NoLabTestsSelected: React.FC = () => (
  <EmptyState
    icon={FlaskConical}
    title="No Lab Tests"
    description="Select a test to enter results"
  />
);

export const NoMedicationsSelected: React.FC = () => (
  <EmptyState
    icon={Package}
    title="No Medications"
    description="No medications available for dispensing"
  />
);
