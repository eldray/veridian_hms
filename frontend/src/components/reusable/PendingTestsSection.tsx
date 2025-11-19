// src/components/reusable/PendingTestsSection.tsx - UPDATED
import React from 'react';
import { LabTest } from '../types';
import { FileText, CheckCircle } from 'lucide-react';

interface PendingTestsSectionProps {
  pendingTests: LabTest[];
  selectedTest: { attendanceId: string; testId: string } | null;
  onTestSelect: (test: { attendanceId: string; testId: string }) => void;
  onMarkInProgress: (testId: string) => void;
  selectedAttendanceId: string;
  canUpdateLabTest: boolean;
}

export const PendingTestsSection: React.FC<PendingTestsSectionProps> = ({
  pendingTests,
  selectedTest,
  onTestSelect,
  onMarkInProgress,
  selectedAttendanceId,
  canUpdateLabTest
}) => {
  const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
    return entity?._id || entity?.id;
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-[var(--icon-blue-text)]" />
        Lab Requests ({pendingTests.length})
      </h2>
      
      {pendingTests.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm">No pending lab requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingTests.map((test) => (
            <div
              key={getEntityId(test)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                selectedTest?.testId === getEntityId(test)
                  ? 'bg-[var(--icon-blue-bg)] border-[var(--icon-blue-text)] shadow-md'
                  : test.status === 'in_progress'
                  ? 'bg-[var(--icon-blue-bg)] border-[var(--icon-blue-text)] hover:border-[var(--icon-blue-text)]'
                  : 'bg-[var(--bg-main)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
              }`}
              onClick={() =>
                onTestSelect({
                  attendanceId: selectedAttendanceId,
                  testId: getEntityId(test) || '',
                })
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-bold text-[var(--text-primary)] text-sm">{test.name}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Requested: {new Date(test.requestedAt).toLocaleString()}
                  </p>
                  {test.priority === 'urgent' && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-bold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-full">
                      URGENT
                    </span>
                  )}
                  {test.notes && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{test.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {test.status === 'requested' && canUpdateLabTest && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkInProgress(getEntityId(test) || '');
                      }}
                      className="px-2 py-1 text-xs bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded hover:bg-[var(--icon-blue-text)] hover:text-white transition-colors"
                    >
                      Start
                    </button>
                  )}
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    test.status === 'in_progress'
                      ? 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border border-[var(--icon-blue-text)]'
                      : 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)]'
                  }`}>
                    {test.status === 'in_progress' ? 'In Progress' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};