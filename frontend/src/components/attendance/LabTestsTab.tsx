// src/components/attendance/LabTestsTab.tsx
import { FlaskConical } from 'lucide-react';

interface LabTestsTabProps {
  attendance: any;
}

export const LabTestsTab: React.FC<LabTestsTabProps> = ({ attendance }) => {
  const labTests = attendance.labTests || [];

  if (labTests.length === 0) {
    return (
      <div className="p-6 text-center">
        <FlaskConical className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Lab Tests</h3>
        <p className="text-[var(--text-secondary)] text-sm">No lab tests requested.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-3">
        {labTests.map((test: any, index: number) => (
          <div key={test.id || index} className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)] hover:shadow-md transition-all duration-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-2">
              <h4 className="font-bold text-[var(--text-primary)] text-sm">{test.testName || test.name}</h4>
              <div className="flex items-center gap-1">
                {test.completed ? (
                  <span className="px-2 py-1 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] text-xs font-bold rounded border border-[var(--border-color)]">
                    Completed
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] text-xs font-bold rounded border border-[var(--border-color)]">
                    {test.requested ? 'Requested' : 'Pending'}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
              <div className="bg-[var(--bg-card)] rounded p-2 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)] font-medium">Type</p>
                <p className="font-semibold text-[var(--text-primary)] text-sm">{test.testType || 'N/A'}</p>
              </div>
              {test.requestedAt && (
                <div className="bg-[var(--bg-card)] rounded p-2 border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Requested</p>
                  <p className="font-semibold text-[var(--text-primary)] text-xs">
                    {new Date(test.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {test.completedAt && (
                <div className="bg-[var(--bg-card)] rounded p-2 border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Completed</p>
                  <p className="font-semibold text-[var(--text-primary)] text-xs">
                    {new Date(test.completedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {test.performedBy && (
                <div className="bg-[var(--bg-card)] rounded p-2 border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-secondary)] font-medium">By</p>
                  <p className="font-semibold text-[var(--text-primary)] text-xs">{test.performedBy}</p>
                </div>
              )}
            </div>
            {test.result && (
              <div className="bg-[var(--icon-green-bg)] rounded p-2 border border-[var(--border-color)] mb-2">
                <p className="text-xs text-[var(--text-secondary)] font-medium">Result</p>
                <p className="font-semibold text-[var(--text-primary)] text-sm">{test.result}</p>
              </div>
            )}
            {test.notes && (
              <div className="bg-[var(--icon-blue-bg)] rounded p-2 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)] font-medium">Notes</p>
                <p className="text-[var(--text-primary)] text-xs">{test.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};