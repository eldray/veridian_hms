// src/pages/ShiftManagement.tsx
import { useEffect, useMemo, useState } from 'react';
import { useShiftStore } from '../store/shiftStore';
import { useUserStore } from '../store/userStore';
import { useToast } from '../store/toastStore';
import {
  Calendar, Clock, Plus, Search, RefreshCw, X, Trash2, Edit,
  ChevronLeft, ChevronRight, User as UserIcon, Filter,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const SHIFT_TYPES = [
  { value: 'morning',   label: 'Morning',   time: '08:00 – 14:00', color: 'bg-green-100 text-green-700'   },
  { value: 'afternoon', label: 'Afternoon', time: '14:00 – 20:00', color: 'bg-orange-100 text-orange-700' },
  { value: 'night',     label: 'Night',     time: '20:00 – 08:00', color: 'bg-purple-100 text-purple-700' },
  { value: 'on_call',   label: 'On Call',   time: '24h',           color: 'bg-blue-100 text-blue-700'     },
];

const SHIFT_COLORS: Record<string, string> = {
  morning:   'bg-green-100 text-green-700 border-green-200',
  afternoon: 'bg-orange-100 text-orange-700 border-orange-200',
  night:     'bg-purple-100 text-purple-700 border-purple-200',
  on_call:   'bg-blue-100 text-blue-700 border-blue-200',
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const toInputDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ─────────────────────────────────────────────
// Weekly strip
// ─────────────────────────────────────────────
const WeekStrip: React.FC<{
  weekStart: Date;
  shiftsByDay: Record<string, number>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}> = ({ weekStart, shiftsByDay, onPrev, onNext, onToday }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = toInputDate(new Date());

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Week of {weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Shift count per day</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]"
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" />
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-xs font-medium text-[var(--text-primary)]"
          >
            Today
          </button>
          <button
            onClick={onNext}
            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4 text-[var(--text-primary)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const key = toInputDate(d);
          const count = shiftsByDay[key] ?? 0;
          const isToday = key === today;
          return (
            <div
              key={key}
              className={`rounded-lg p-2 border ${
                isToday
                  ? 'bg-[var(--icon-cyan-bg)] border-[var(--icon-cyan-text)]'
                  : 'bg-[var(--bg-main)] border-[var(--border-color)]'
              }`}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                isToday ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-tertiary)]'
              }`}>
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </p>
              <p className={`text-lg font-bold ${isToday ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-primary)]'}`}>
                {d.getDate()}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                {count} shift{count !== 1 ? 's' : ''}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function ShiftManagement() {
  const {
    shifts, total, isLoading,
    fetchShifts, createShift, updateShift, deleteShift,
  } = useShiftStore();
  const { users, getAllUsers } = useUserStore();
  const { success, error: toastError } = useToast();

  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff));
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterShiftType, setFilterShiftType] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    userId: '',
    shiftDate: toInputDate(new Date()),
    startTime: '08:00',
    endTime: '14:00',
    shiftType: 'morning' as 'morning' | 'afternoon' | 'night' | 'on_call',
    notes: '',
  });

  useEffect(() => {
    void getAllUsers({ isActive: true });
  }, []);

  useEffect(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    void fetchShifts({
      fromDate: weekStart.toISOString(),
      toDate: weekEnd.toISOString(),
    });
  }, [weekStart]);

  const userList = Array.isArray(users) ? users : [];

  const visibleShifts = useMemo(() => {
    let list = shifts;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const name = s.user?.fullName?.toLowerCase() ?? '';
        const uname = s.user?.username?.toLowerCase() ?? '';
        const notes = s.notes?.toLowerCase() ?? '';
        return name.includes(q) || uname.includes(q) || notes.includes(q);
      });
    }

    if (filterShiftType !== 'all') {
      list = list.filter((s) => s.shiftType === filterShiftType);
    }

    return [...list].sort((a, b) => new Date(a.shiftDate).getTime() - new Date(b.shiftDate).getTime());
  }, [shifts, searchQuery, filterShiftType]);

  const shiftsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of shifts) {
      const key = s.shiftDate.split('T')[0];
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [shifts]);

  // ── Handlers ─────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setFormData({
      userId: '',
      shiftDate: toInputDate(new Date()),
      startTime: '08:00',
      endTime: '14:00',
      shiftType: 'morning',
      notes: '',
    });
    setShowForm(true);
  };

  const openEdit = (shift: any) => {
    setEditingId(shift.id);
    setFormData({
      userId: shift.userId,
      shiftDate: shift.shiftDate.split('T')[0],
      startTime: formatTime(shift.startTime).replace(/\s?(AM|PM)$/i, (m) => m).padStart(5, '0'),
      endTime: formatTime(shift.endTime).padStart(5, '0'),
      shiftType: shift.shiftType,
      notes: shift.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId) {
      toastError('Missing user', 'Choose a staff member');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateShift(editingId, {
          shiftDate: formData.shiftDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          shiftType: formData.shiftType,
          notes: formData.notes || undefined,
        } as any);
        success('Shift updated', 'The shift has been updated');
      } else {
        await createShift({
          userId: formData.userId,
          shiftDate: formData.shiftDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          shiftType: formData.shiftType,
          notes: formData.notes || undefined,
        });
        success('Shift created', 'The shift has been scheduled');
      }
      setShowForm(false);
      setEditingId(null);
      // Refresh
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      void fetchShifts({ fromDate: weekStart.toISOString(), toDate: weekEnd.toISOString() });
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || 'Could not save shift');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (shiftId: string) => {
    if (!window.confirm('Delete this shift?')) return;
    try {
      await deleteShift(shiftId);
      success('Deleted', 'Shift removed');
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || 'Could not delete shift');
    }
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const todayWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    setWeekStart(new Date(d.setDate(diff)));
  };

  const inputClass =
    'w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]';

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--icon-cyan-bg)] flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Shift Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Schedule and manage staff shifts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchShifts({ fromDate: weekStart.toISOString(), toDate: new Date(weekStart.getTime() + 6 * 86400000).toISOString() })}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium text-[var(--text-primary)] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Shift
          </button>
        </div>
      </div>

      {/* Week strip */}
      <WeekStrip
        weekStart={weekStart}
        shiftsByDay={shiftsByDay}
        onPrev={prevWeek}
        onNext={nextWeek}
        onToday={todayWeek}
      />

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by staff name or notes…"
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
            />
          </div>
          <select
            value={filterShiftType}
            onChange={(e) => setFilterShiftType(e.target.value)}
            className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm min-w-[160px]"
          >
            <option value="all">All shift types</option>
            {SHIFT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border-color)]">
          Showing {visibleShifts.length} of {total} shifts for this week
        </p>
      </div>

      {/* List */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-3 animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">Loading shifts…</p>
          </div>
        ) : visibleShifts.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-14 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No shifts this week</p>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Add the first shift to get started
            </p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Shift
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {visibleShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--bg-main)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {shift.user?.fullName || '—'}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      @{shift.user?.username ?? '—'}
                      {shift.user?.role && ` · ${shift.user.role.replace(/_/g, ' ')}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(shift.shiftDate)}
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      SHIFT_COLORS[shift.shiftType] ?? 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    {shift.shiftType.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(shift)}
                    className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)]"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(shift.id)}
                    className="p-1.5 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)]"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div
            className="bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {editingId ? 'Edit Shift' : 'Schedule Shift'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-[var(--bg-card)]">
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Staff Member *
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  disabled={!!editingId}
                  required
                  className={inputClass}
                >
                  <option value="">— Select staff —</option>
                  {userList.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.shiftDate}
                  onChange={(e) => setFormData({ ...formData, shiftDate: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Start *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    End *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Shift Type *
                </label>
                <select
                  value={formData.shiftType}
                  onChange={(e) => setFormData({ ...formData, shiftType: e.target.value as any })}
                  required
                  className={inputClass}
                >
                  {SHIFT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} ({t.time})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="Optional note for the shift"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingId ? 'Update Shift' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}