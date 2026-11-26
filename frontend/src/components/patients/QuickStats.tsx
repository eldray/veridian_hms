// src/components/patients/QuickStats.tsx
interface QuickStatsProps {
  displayedPatients: any[];
}

export const QuickStats: React.FC<QuickStatsProps> = ({ displayedPatients }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-[var(--icon-cyan-bg)] rounded-lg p-3 text-center border border-[var(--icon-cyan-text)]">
        <p className="text-lg font-bold text-[var(--icon-cyan-text)]">{displayedPatients.length}</p>
        <p className="text-xs text-[var(--icon-cyan-text)] font-medium">Total Patients</p>
      </div>
      <div className="bg-[var(--icon-green-bg)] rounded-lg p-3 text-center border border-[var(--icon-green-text)]">
        <p className="text-lg font-bold text-[var(--icon-green-text)]">
          {displayedPatients.filter(p => p.paymentMode === 'nhis').length}
        </p>
        <p className="text-xs text-[var(--icon-green-text)] font-medium">NHIS</p>
      </div>
      <div className="bg-[var(--icon-purple-bg)] rounded-lg p-3 text-center border border-[var(--icon-purple-text)]">
        <p className="text-lg font-bold text-[var(--icon-purple-text)]">
          {displayedPatients.filter(p => p.paymentMode === 'private_insurance').length}
        </p>
        <p className="text-xs text-[var(--icon-purple-text)] font-medium">Private</p>
      </div>
      <div className="bg-[var(--bg-main)] rounded-lg p-3 text-center border border-[var(--border-color)]">
        <p className="text-lg font-bold text-[var(--text-secondary)]">
          {displayedPatients.filter(p => p.paymentMode === 'cash').length}
        </p>
        <p className="text-xs text-[var(--text-primary)] font-medium">Cash</p>
      </div>
    </div>
  );
};