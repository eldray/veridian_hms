// src/components/attendance/LoadingAttendanceState.tsx
export const LoadingAttendanceState: React.FC = () => {
  return (
    <div className="space-y-4 p-4 bg-[var(--bg-main)] min-h-screen flex items-center justify-center">
      <div className="text-center bg-[var(--bg-card)] rounded-lg p-6 shadow-sm border border-[var(--border-color)]">
        <div className="w-10 h-10 text-[var(--icon-cyan-text)] animate-spin mx-auto mb-3 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full" />
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Loading...</h2>
        <p className="text-[var(--text-secondary)] text-sm">Loading attendance records.</p>
      </div>
    </div>
  );
}