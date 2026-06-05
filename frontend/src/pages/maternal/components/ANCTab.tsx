// src/pages/maternal/components/ANCTab.tsx
import React from 'react';
import { Baby, Calendar, Heart, Ruler, TrendingUp, Shield, Syringe, Eye, Edit, Trash2 } from 'lucide-react';
import { SectionCard, EmptySlate, StatusBadge, TD, TH } from './TableComponents';

interface ANCTabProps {
  hasActiveBooking: boolean;
  currentBooking: any;
  currentVisits: any[];
  latestVitals: any;
  selectedAttendanceId: string;
  onEditVisit: (visit: any) => void;
  onDeleteVisit: (id: string) => void;
  onViewVisit: (visit: any) => void;
}

export const ANCTab: React.FC<ANCTabProps> = ({
  hasActiveBooking,
  currentBooking,
  currentVisits,
  latestVitals,
  selectedAttendanceId,
  onEditVisit,
  onDeleteVisit,
  onViewVisit,
}) => {
  const iptpSummary = {
    dose1: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 1).length,
    dose2: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 2).length,
    dose3: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 3).length,
    dose4: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber === 4).length,
    dose5: currentVisits.filter(v => v.iptpGiven && v.iptpDoseNumber >= 5).length,
  };

  const ttSummary = {
    dose1: currentVisits.filter(v => v.ttGiven && v.ttDoseNumber === 1).length,
    dose2: currentVisits.filter(v => v.ttGiven && v.ttDoseNumber === 2).length,
    tt2Plus: currentVisits.filter(v => v.ttGiven && v.ttDoseNumber >= 2).length,
  };

  if (!hasActiveBooking) {
    return (
      <div className="p-4 text-center">
        <EmptySlate icon={<Baby className="w-12 h-12" />} label="No active pregnancy record" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { icon: <Baby className="w-4 h-4 text-pink-500" />, label: 'G/P', value: `${currentBooking?.gravida || 0}/${currentBooking?.para || 0}` },
          { icon: <Calendar className="w-4 h-4 text-purple-500" />, label: 'Weeks', value: currentBooking?.gestationalAgeWeeks || '?' },
          { icon: <Heart className="w-4 h-4 text-red-500" />, label: 'FHR (bpm)', value: latestVitals?.fetalHeartRate || '—' },
          { icon: <Ruler className="w-4 h-4 text-blue-500" />, label: 'Fundal Ht', value: latestVitals?.fundalHeight ? `${latestVitals.fundalHeight}cm` : '—' },
          { icon: <TrendingUp className="w-4 h-4 text-[var(--icon-green-text)]" />, label: 'Visits', value: currentVisits.length },
          { icon: <Shield className="w-4 h-4 text-[var(--icon-cyan-text)]" />, label: 'TT2+', value: ttSummary.tt2Plus },
        ].map((s, i) => (
          <div key={i} className="bg-[var(--bg-main)] rounded-xl p-3 border border-[var(--border-color)] text-center">
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className="text-sm font-bold text-[var(--text-primary)]">{s.value}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* IPTp Summary Bar */}
      {currentVisits.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Syringe className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            <span className="text-xs font-bold text-[var(--icon-cyan-text)]">IPTp</span>
          </div>
          {['IPTp-1', 'IPTp-2', 'IPTp-3', 'IPTp-4', 'IPTp-5+'].map((label, i) => (
            <div key={i} className="text-center">
              <p className="text-xs font-bold text-[var(--icon-cyan-text)]">{Object.values(iptpSummary)[i]}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ANC Visit History */}
      <SectionCard
        icon={<Baby className="w-4 h-4 text-pink-600" />}
        title={`ANC Visit History (${currentVisits.length})`}
        maxH="max-h-96"
      >
        {currentVisits.length === 0 ? (
          <EmptySlate icon={<Baby className="w-9 h-9" />} label="No ANC visits recorded yet" />
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <TH>#</TH><TH>Date</TH><TH>GA(wks)</TH><TH>Weight</TH><TH>BP</TH><TH>FHR</TH>
                <TH>Fundal</TH><TH>IPTp</TH><TH>TT</TH><TH>Danger</TH><TH></TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {currentVisits.map((v: any) => {
                const isCurrent = v.attendanceId === selectedAttendanceId;
                return (
                  <tr key={v.id} className={`hover:bg-[var(--bg-main)] transition-colors ${isCurrent ? 'bg-pink-50/20' : ''}`}>
                    <TD>{v.visitNumber}{isCurrent && <span className="ml-1 text-[9px] text-pink-500">(now)</span>}</TD>
                    <TD>{new Date(v.visitDate).toLocaleDateString()}</TD>
                    <TD>{v.gestationalAgeWeeks || '—'}</TD>
                    <TD>{v.weight ? `${v.weight}kg` : '—'}</TD>
                    <TD>{v.bloodPressure || '—'}</TD>
                    <TD>{v.fetalHeartRate || '—'}</TD>
                    <TD>{v.fundalHeight ? `${v.fundalHeight}cm` : '—'}</TD>
                    <TD>{v.iptpGiven ? `D${v.iptpDoseNumber}` : '—'}</TD>
                    <TD>{v.ttGiven ? `D${v.ttDoseNumber}` : '—'}</TD>
                    <TD>{v.dangerSignsPresent ? <span className="text-[var(--icon-red-text)] font-bold">Yes</span> : '—'}</TD>
                    <TD>
                      <div className="flex gap-0.5">
                        <button onClick={() => onViewVisit(v)} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)]">
                          <Eye className="w-3 h-3" />
                        </button>
                        <button onClick={() => onEditVisit(v)} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)]">
                          <Edit className="w-3 h-3" />
                        </button>
                        <button onClick={() => onDeleteVisit(v.id)} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)]">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Malaria & Danger Signs Summary */}
      {currentVisits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <Syringe className="w-4 h-4 text-[var(--icon-yellow-text)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">Malaria in Pregnancy</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Tested</span>
                <span className="font-bold">{currentVisits.filter(v => v.malariaTestDone).length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Positive</span>
                <span className="font-bold text-[var(--icon-red-text)]">{currentVisits.filter(v => v.malariaTestResult === 'Positive').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Treated</span>
                <span className="font-bold">{currentVisits.filter(v => v.malariaTreatmentGiven).length}</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <Shield className="w-4 h-4 text-[var(--icon-orange-text)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">Danger Signs & Referrals</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Danger Signs</span>
                <span className="font-bold text-[var(--icon-red-text)]">{currentVisits.filter(v => v.dangerSignsPresent).length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Referrals Made</span>
                <span className="font-bold">{currentVisits.filter(v => v.referralMade).length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};