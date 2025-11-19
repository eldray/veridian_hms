// src/components/attendance/ProceduresTab.tsx
import { Scissors } from 'lucide-react';

interface ProceduresTabProps {
  attendance: any;
}

export const ProceduresTab: React.FC<ProceduresTabProps> = ({ attendance }) => {
  const procedures = attendance.procedures || [];

  if (procedures.length === 0) {
    return (
      <div className="p-12 text-center">
        <Scissors className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">No Procedures</h3>
        <p className="text-gray-600 text-lg">No procedures have been performed for this attendance.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="space-y-6">
        {procedures.map((procedure: any, index: number) => (
          <div key={procedure.id || index} className="bg-gradient-to-br from-gray-50 to-orange-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <h4 className="font-bold text-xl text-gray-900">{procedure.procedureName || procedure.name}</h4>
              {(procedure.cost || 0) > 0 && (
                <span className="px-4 py-2 bg-green-100 text-green-800 text-lg font-bold rounded-full border border-green-200">
                  ${(procedure.cost || 0).toFixed(2)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Description</p>
                <p className="font-semibold text-gray-900">{procedure.description || 'No description'}</p>
              </div>
              {procedure.performedAt && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">Performed</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(procedure.performedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {procedure.performedBy && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">Performed By</p>
                  <p className="font-semibold text-gray-900">{procedure.performedBy}</p>
                </div>
              )}
            </div>
            {procedure.notes && (
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Notes</p>
                <p className="text-gray-900">{procedure.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};