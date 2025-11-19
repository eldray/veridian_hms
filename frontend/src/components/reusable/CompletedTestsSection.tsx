// src/components/reusable/CompletedTestsSection.tsx - UPDATED
import React from 'react';
import { LabTest } from '../types';
import { CheckCircle } from 'lucide-react';

interface CompletedTestsSectionProps {
  completedTests: LabTest[];
}

export const CompletedTestsSection: React.FC<CompletedTestsSectionProps> = ({
  completedTests
}) => {
  const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
    return entity?._id || entity?.id;
  };

  if (completedTests.length === 0) return null;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-[var(--icon-green-text)]" />
        Completed Tests ({completedTests.length})
      </h3>
      <div className="space-y-3">
        {completedTests.map((test) => (
          <div
            key={getEntityId(test)}
            className="p-4 bg-[var(--icon-green-bg)] rounded-lg border border-[var(--icon-green-text)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{test.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Completed: {test.completedAt ? new Date(test.completedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <span className="px-3 py-1 text-sm font-bold rounded-full bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--icon-green-text)]">
                Completed
              </span>
            </div>
            {test.result && (
              <div className="mt-2 p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">Result: {test.result}</p>
                {test.normalRange && (
                  <p className="text-sm text-[var(--text-secondary)]">Normal Range: {test.normalRange}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};