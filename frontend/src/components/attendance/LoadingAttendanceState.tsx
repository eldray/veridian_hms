// src/components/attendance/LoadingAttendanceState.tsx
export const LoadingAttendanceState: React.FC = () => {
  return (
    <div className="space-y-4 p-4 bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-center bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3 border-2 border-blue-600 border-t-transparent rounded-full" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Loading...</h2>
        <p className="text-gray-600 text-sm">Loading attendance records.</p>
      </div>
    </div>
  );
}