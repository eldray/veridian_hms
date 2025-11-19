// src/components/patients/QuickStats.tsx
interface QuickStatsProps {
  displayedPatients: any[];
}

export const QuickStats: React.FC<QuickStatsProps> = ({ displayedPatients }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
        <p className="text-lg font-bold text-blue-600">{displayedPatients.length}</p>
        <p className="text-xs text-blue-700 font-medium">Total Patients</p>
      </div>
      <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
        <p className="text-lg font-bold text-green-600">
          {displayedPatients.filter(p => p.paymentMode === 'nhis').length}
        </p>
        <p className="text-xs text-green-700 font-medium">NHIS</p>
      </div>
      <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
        <p className="text-lg font-bold text-purple-600">
          {displayedPatients.filter(p => p.paymentMode === 'private_insurance').length}
        </p>
        <p className="text-xs text-purple-700 font-medium">Private</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
        <p className="text-lg font-bold text-gray-600">
          {displayedPatients.filter(p => p.paymentMode === 'cash').length}
        </p>
        <p className="text-xs text-gray-700 font-medium">Cash</p>
      </div>
    </div>
  );
};