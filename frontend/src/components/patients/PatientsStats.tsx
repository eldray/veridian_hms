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
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-800">
            Showing {paginatedPatients.length} of {displayedPatients.length} patients
          </p>
          {searchQuery && (
            <p className="text-xs text-blue-600 mt-0.5">
              Search: "{searchQuery}"
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-700">
          <span className="bg-blue-100 px-1.5 py-0.5 rounded">
            Cash: {displayedPatients.filter(p => p.paymentMode === 'cash').length}
          </span>
          <span className="bg-green-100 px-1.5 py-0.5 rounded">
            NHIS: {displayedPatients.filter(p => p.paymentMode === 'nhis').length}
          </span>
          <span className="bg-purple-100 px-1.5 py-0.5 rounded">
            Private: {displayedPatients.filter(p => p.paymentMode === 'private_insurance').length}
          </span>
        </div>
      </div>
    </div>
  );
};