// src/pages/maternal/components/FamilyPlanningTab.tsx
import React from 'react';
import { ShieldCheck, CheckCircle, Calendar, Pill, TrendingUp, Edit, Plus, Clock, AlertCircle } from 'lucide-react';
import { SectionCard, EmptySlate } from './shared/TableComponents';

interface FamilyPlanningTabProps {
  currentAttendance: any;
  canAddEntries: boolean;
  onEdit: () => void;
}

export const FamilyPlanningTab: React.FC<FamilyPlanningTabProps> = ({
  currentAttendance,
  canAddEntries,
  onEdit,
}) => {
  const hasFPRecord = currentAttendance?.familyPlanningDiscussed;

  return (
    <div className="p-4 space-y-4">
      {/* Always show the section card - even without data */}
      <SectionCard
        icon={<ShieldCheck className="w-4 h-4 text-purple-600" />}
        title="Family Planning Services"
        action={canAddEntries && (
          <button 
            onClick={onEdit} 
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              hasFPRecord 
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-700 hover:text-white'
                : 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white'
            }`}
          >
            {hasFPRecord ? <Edit className="w-3 h-3" /> : <Plus className="w-3 h-3" />} 
            {hasFPRecord ? 'Edit FP Record' : 'Add FP Record'}
          </button>
        )}
      >
        {hasFPRecord ? (
          <div className="p-4 space-y-4">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
                <ShieldCheck className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-purple-700">FP Discussed</p>
                <p className="text-[10px] text-purple-600">Yes</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
                <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-green-700">Counselling</p>
                <p className="text-[10px] text-green-600">{currentAttendance.fpCounsellingGiven ? 'Given' : 'Not Given'}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-blue-700">Next Follow-up</p>
                <p className="text-[10px] text-blue-600">
                  {currentAttendance.nextFollowUp ? new Date(currentAttendance.nextFollowUp).toLocaleDateString() : 'Not set'}
                </p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center">
                <Pill className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-cyan-700">Method</p>
                <p className="text-[10px] text-cyan-600 truncate">
                  {currentAttendance.familyPlanningMethodAccepted?.replace(/_/g, ' ') || 'Not selected'}
                </p>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3">
                <h4 className="text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Method Details
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Method Accepted:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {currentAttendance.familyPlanningMethodAccepted?.replace(/_/g, ' ') || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Method Provided Today:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {currentAttendance.fpMethodProvided?.replace(/_/g, ' ') || 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <h4 className="text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                  Side Effects & Follow-up
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-secondary)]">Side Effects:</span>
                    <p className="font-medium text-[var(--text-primary)] mt-0.5">
                      {currentAttendance.sideEffects || 'None reported'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Next Follow-up:</span>
                    <p className="font-medium text-[var(--text-primary)] mt-0.5">
                      {currentAttendance.nextFollowUp ? new Date(currentAttendance.nextFollowUp).toLocaleString() : 'Not scheduled'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {currentAttendance.notes && (
              <div className="border rounded-lg p-3 bg-[var(--bg-main)]">
                <h4 className="text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  Additional Notes
                </h4>
                <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">
                  {currentAttendance.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">No Family Planning Record</p>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">
              Family planning services help patients space pregnancies and prevent unintended pregnancies.
            </p>
            {canAddEntries && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Family Planning Record
              </button>
            )}
          </div>
        )}
      </SectionCard>

      {/* FP Statistics - Only show if there are records */}
      {hasFPRecord && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4">
          <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Family Planning Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-purple-600">1</p>
              <p className="text-[10px] text-purple-600">Total FP Visits</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {currentAttendance.fpMethodProvided ? '1' : '0'}
              </p>
              <p className="text-[10px] text-green-600">Methods Provided</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {currentAttendance.sideEffects ? '1' : '0'}
              </p>
              <p className="text-[10px] text-blue-600">Side Effects Reported</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-600">
                {currentAttendance.nextFollowUp ? '1' : '0'}
              </p>
              <p className="text-[10px] text-cyan-600">Follow-ups Scheduled</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};