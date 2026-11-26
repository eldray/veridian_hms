// src/components/patients/PatientsStats.tsx
interface PatientsStatsProps {
  displayedPatients: any[];
  paginatedPatients: any[];
  searchQuery: string;
}

export const PatientsStats: React.FC<PatientsStatsProps> = ({
  displayedPatients,
  paginatedPatients,
  searchQuery
}) => {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Showing {paginatedPatients.length} of {displayedPatients.length} patients
          </p>
          {searchQuery && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Search: "{searchQuery}"
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] px-1.5 py-0.5 rounded">
            Cash: {displayedPatients.filter(p => p.paymentMode === 'cash').length}
          </span>
          <span className="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] px-1.5 py-0.5 rounded">
            NHIS: {displayedPatients.filter(p => p.paymentMode === 'nhis').length}
          </span>
          <span className="bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] px-1.5 py-0.5 rounded">
            Private: {displayedPatients.filter(p => p.paymentMode === 'private_insurance').length}
          </span>
        </div>
      </div>
    </div>
  );
};