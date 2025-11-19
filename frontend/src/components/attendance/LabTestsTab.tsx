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
        <FlaskConical className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">No Lab Tests</h3>
        <p className="text-gray-600 text-sm">No lab tests requested.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-3">
        {labTests.map((test: any, index: number) => (
          <div key={test.id || index} className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all duration-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-2">
              <h4 className="font-bold text-gray-900 text-sm">{test.testName || test.name}</h4>
              <div className="flex items-center gap-1">
                {test.completed ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded border border-green-200">
                    Completed
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded border border-yellow-200">
                    {test.requested ? 'Requested' : 'Pending'}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Type</p>
                <p className="font-semibold text-gray-900 text-sm">{test.testType || 'N/A'}</p>
              </div>
              {test.requestedAt && (
                <div className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium">Requested</p>
                  <p className="font-semibold text-gray-900 text-xs">
                    {new Date(test.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {test.completedAt && (
                <div className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium">Completed</p>
                  <p className="font-semibold text-gray-900 text-xs">
                    {new Date(test.completedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {test.performedBy && (
                <div className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium">By</p>
                  <p className="font-semibold text-gray-900 text-xs">{test.performedBy}</p>
                </div>
              )}
            </div>
            {test.result && (
              <div className="bg-green-50 rounded p-2 border border-green-200 mb-2">
                <p className="text-xs text-gray-600 font-medium">Result</p>
                <p className="font-semibold text-gray-900 text-sm">{test.result}</p>
              </div>
            )}
            {test.notes && (
              <div className="bg-blue-50 rounded p-2 border border-blue-200">
                <p className="text-xs text-gray-600 font-medium">Notes</p>
                <p className="text-gray-900 text-xs">{test.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};