// src/pages/ShiftManagement.tsx
import { useEffect, useMemo, useState } from 'react';
import { useShiftStore } from '../store/shiftStore';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useHospitalStore } from '../store/hospitalStore';
import { useToast } from '../store/toastStore';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import {
  Calendar, Clock, Plus, Search, RefreshCw, X, Trash2, Edit,
  ChevronLeft, ChevronRight, ChevronDown, User as UserIcon,
  Printer, List, Table2, Grid3x3, Building,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const SHIFT_TYPES = [
  { value: 'morning',   label: 'Morning',   letter: 'M', color: 'bg-green-100 text-green-700'   },
  { value: 'afternoon', label: 'Afternoon', letter: 'A', color: 'bg-orange-100 text-orange-700' },
  { value: 'night',     label: 'Night',     letter: 'N', color: 'bg-purple-100 text-purple-700' },
  { value: 'on_call',   label: 'On Call',   letter: 'C', color: 'bg-blue-100 text-blue-700'     },
];

const ADMIN_LIKE_ROLES = ['admin', 'super_admin', 'hr_officer'];

const shiftColor = (letter: string) => {
  switch (letter) {
    case 'M': return 'bg-green-100 text-green-700 border-green-200';
    case 'A': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'N': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'C': return 'bg-blue-100 text-blue-700 border-blue-200';
    default:  return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
  }
};

const shiftLetter = (type: string) =>
  SHIFT_TYPES.find((t) => t.value === type)?.letter ?? '?';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const toInputDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toKey = (d: Date) => toInputDate(d);

const startOfWeek = (d: Date) => {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const timeToHHmm = (iso: string) => {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '08:00';
  }
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ViewMode = 'list' | 'week' | 'month';

interface DeptGroup {
  departmentId: string | null;
  departmentName: string;
  departmentColor: string;
  staffRows: Array<{ id: string; name: string; role: string; departmentId: string | null }>;
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function ShiftManagement() {
  const {
    shifts, total, departments, isLoading,
    fetchShifts, fetchDepartments, createShift, updateShift, deleteShift,
  } = useShiftStore();
  const { users, getAllUsers } = useUserStore();
  const { hospital, fetchHospital } = useHospitalStore();
  const { hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();

  const canSeeAllDepartments = hasRole(ADMIN_LIKE_ROLES);

  const [view, setView] = useState<ViewMode>('week');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterShiftType, setFilterShiftType] = useState('all');
  const [filterUserId, setFilterUserId] = useState('all');
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('all');
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [formData, setFormData] = useState({
    userId: '',
    shiftDate: toInputDate(new Date()),
    startTime: '08:00',
    endTime: '14:00',
    shiftType: 'morning' as 'morning' | 'afternoon' | 'night' | 'on_call',
    notes: '',
  });

  // ── Bootstrapping ────────────────────────────
  useEffect(() => {
    void getAllUsers({ isActive: true });
    void fetchHospital().catch(() => {});
    if (canSeeAllDepartments) {
      void fetchDepartments();
    }
  }, [canSeeAllDepartments]);

  // ── Shift fetching per view ──────────────────
  useEffect(() => {
    const departmentId = filterDepartmentId !== 'all' ? filterDepartmentId : undefined;

    if (view === 'week') {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      void fetchShifts({
        fromDate: weekStart.toISOString(),
        toDate: end.toISOString(),
        limit: 1000,
        departmentId,
      });
    } else if (view === 'month') {
      const ms = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
      const me = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0, 23, 59, 59);
      void fetchShifts({
        fromDate: ms.toISOString(),
        toDate: me.toISOString(),
        limit: 2000,
        departmentId,
      });
    } else {
      void fetchShifts({ limit: 1000, departmentId });
    }
  }, [view, weekStart, monthCursor, filterDepartmentId]);

  const userList = Array.isArray(users) ? users : [];

  // ── Filtering ────────────────────────────────
  const filteredShifts = useMemo(() => {
    let list = [...shifts];

    if (filterUserId !== 'all') list = list.filter((s) => s.userId === filterUserId);
    if (filterShiftType !== 'all') list = list.filter((s) => s.shiftType === filterShiftType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const name = s.user?.fullName?.toLowerCase() ?? '';
        const notes = s.notes?.toLowerCase() ?? '';
        return name.includes(q) || notes.includes(q);
      });
    }
    return list.sort((a, b) => new Date(a.shiftDate).getTime() - new Date(b.shiftDate).getTime());
  }, [shifts, filterUserId, filterShiftType, searchQuery]);

  // ── Departments lookup ───────────────────────
  const departmentById = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const d of departments) {
      map.set(d.id, { name: d.name, color: d.color || '#0891b2' });
    }
    return map;
  }, [departments]);

  const userById = useMemo(() => {
    const map = new Map<string, { id: string; fullName: string; role: string; departmentId: string | null; username?: string }>();
    for (const u of userList) {
      map.set(u.id, {
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        departmentId: (u as any).departmentId ?? null,
        username: (u as any).username,
      });
    }
    return map;
  }, [userList]);

  // ── Grid data ────────────────────────────────
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart],
  );

  const monthDays = useMemo(() => {
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(first);
      d.setDate(i + 1);
      return d;
    });
  }, [monthCursor]);

  /**
   * Build the department-grouped structure.
   * If filterDepartmentId !== 'all', we return a single group.
   * Otherwise we group all staff by their departmentId.
   */
  const buildDeptGroups = (list: any[]): DeptGroup[] => {
    // grid: userId → dateKey → shifts[]
    const grid = new Map<string, Map<string, any[]>>();

    // staff seen in this list
    const staffSeen = new Map<string, { id: string; name: string; role: string; departmentId: string | null }>();

    for (const s of list) {
      if (!s.userId) continue;
      const meta = userById.get(s.userId);

      if (!staffSeen.has(s.userId)) {
        staffSeen.set(s.userId, {
          id: s.userId,
          name: s.user?.fullName || meta?.fullName || '—',
          role: s.user?.role || meta?.role || '',
          departmentId: meta?.departmentId ?? null,
        });
      }

      if (!grid.has(s.userId)) grid.set(s.userId, new Map());
      const dateKey = (s.shiftDate || '').split('T')[0];
      if (!dateKey) continue;
      const cellMap = grid.get(s.userId)!;
      if (!cellMap.has(dateKey)) cellMap.set(dateKey, []);
      cellMap.get(dateKey)!.push(s);
    }

    // Group staff by department
    const groups = new Map<string, { name: string; color: string; rows: DeptGroup['staffRows'] }>();

    for (const staff of staffSeen.values()) {
      const deptId = staff.departmentId ?? '__unassigned__';
      const deptMeta = departmentById.get(deptId);

      const deptName =
        deptId === '__unassigned__'
          ? 'Unassigned'
          : deptMeta?.name ?? 'Unknown Department';
      const deptColor =
        deptId === '__unassigned__'
          ? '#94a3b8'
          : deptMeta?.color ?? '#0891b2';

      if (!groups.has(deptId)) {
        groups.set(deptId, { name: deptName, color: deptColor, rows: [] });
      }
      groups.get(deptId)!.rows.push(staff);
    }

    // Sort departments alphabetically, with Unassigned last
    const ordered = Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === '__unassigned__') return 1;
      if (b[0] === '__unassigned__') return -1;
      return a[1].name.localeCompare(b[1].name);
    });

    return ordered.map(([deptId, group]) => ({
      departmentId: deptId === '__unassigned__' ? null : deptId,
      departmentName: group.name,
      departmentColor: group.color,
      staffRows: group.rows.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  };

  // Build a lookup: userId → dateKey → shifts[] for rendering cells
  const buildGrid = (list: any[]) => {
    const grid = new Map<string, Map<string, any[]>>();
    for (const s of list) {
      if (!s.userId) continue;
      if (!grid.has(s.userId)) grid.set(s.userId, new Map());
      const dateKey = (s.shiftDate || '').split('T')[0];
      if (!dateKey) continue;
      const cellMap = grid.get(s.userId)!;
      if (!cellMap.has(dateKey)) cellMap.set(dateKey, []);
      cellMap.get(dateKey)!.push(s);
    }
    return grid;
  };

  const weekDeptGroups = useMemo(() => buildDeptGroups(filteredShifts), [filteredShifts, userById, departmentById]);
  const monthDeptGroups = useMemo(() => buildDeptGroups(filteredShifts), [filteredShifts, userById, departmentById]);
  const weekGrid = useMemo(() => buildGrid(filteredShifts), [filteredShifts]);
  const monthGrid = useMemo(() => buildGrid(filteredShifts), [filteredShifts]);

  const todayKey = toKey(new Date());

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
      shiftDate: (shift.shiftDate || '').split('T')[0] || toInputDate(new Date()),
      startTime: timeToHHmm(shift.startTime),
      endTime: timeToHHmm(shift.endTime),
      shiftType: shift.shiftType,
      notes: shift.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId && !editingId) {
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
      // refresh current view
      const departmentId = filterDepartmentId !== 'all' ? filterDepartmentId : undefined;
      if (view === 'week') {
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 6);
        void fetchShifts({ fromDate: weekStart.toISOString(), toDate: end.toISOString(), limit: 1000, departmentId });
      } else if (view === 'month') {
        const ms = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
        const me = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0, 23, 59, 59);
        void fetchShifts({ fromDate: ms.toISOString(), toDate: me.toISOString(), limit: 2000, departmentId });
      } else {
        void fetchShifts({ limit: 1000, departmentId });
      }
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

  const toggleDeptCollapsed = (deptId: string) => {
    setCollapsedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  // ── Printing ─────────────────────────────────
  const handlePrint = async (kind: 'week' | 'month') => {
    setPrinting(true);
    try {
      // Pass department context to the PDF
      const departmentContext = filterDepartmentId !== 'all'
        ? departmentById.get(filterDepartmentId)?.name ?? null
        : null;

      if (kind === 'week') {
        const html = generatePDF(
          'shiftRota',
          {
            shifts: filteredShifts,
            weekStart: weekStart.toISOString(),
            departments,
            users: userList,
            departmentName: departmentContext,
          },
          hospital,
        );
        openPrintWindow(html, `Shift Rota — week of ${weekStart.toDateString()}`);
        success('Print ready', 'Weekly rota opened');
      } else {
        const html = generatePDF(
          'shiftSummary',
          {
            shifts: filteredShifts,
            month: monthCursor.getMonth() + 1,
            year: monthCursor.getFullYear(),
            departments,
            users: userList,
            departmentName: departmentContext,
          },
          hospital,
        );
        openPrintWindow(
          html,
          `Shift Summary — ${monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        );
        success('Print ready', 'Monthly rota opened');
      }
    } catch (err: any) {
      toastError('Print failed', err?.message || 'Could not generate the document');
    } finally {
      setPrinting(false);
    }
  };

  // ── Nav ──────────────────────────────────────
  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const todayWeek = () => setWeekStart(startOfWeek(new Date()));

  const prevMonth = () => { const d = new Date(monthCursor); d.setMonth(d.getMonth() - 1); setMonthCursor(d); };
  const nextMonth = () => { const d = new Date(monthCursor); d.setMonth(d.getMonth() + 1); setMonthCursor(d); };
  const todayMonth = () => { const d = new Date(); d.setDate(1); setMonthCursor(d); };

  const inputClass =
    'w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]';

  // Staff filtered by department (for the create form)
  const staffForForm = useMemo(() => {
    if (filterDepartmentId === 'all') return userList;
    return userList.filter((u: any) => (u as any).departmentId === filterDepartmentId);
  }, [userList, filterDepartmentId]);

  // ── Cell renderer ────────────────────────────
  const renderGridCell = (cells: any[] | undefined, onEdit: (s: any) => void) => {
    if (!cells || cells.length === 0) {
      return <span className="text-[var(--text-tertiary)] text-[10px]">—</span>;
    }
    const letters = cells.map((c) => shiftLetter(c.shiftType)).join('+');
    const primary = shiftLetter(cells[0].shiftType);
    return (
      <button
        type="button"
        onClick={() => onEdit(cells[0])}
        title={cells.map((c) => `${c.shiftType}: ${formatTime(c.startTime)}–${formatTime(c.endTime)}`).join(' | ')}
        className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md border text-[10px] font-bold ${shiftColor(primary)} hover:opacity-80 transition-opacity`}
      >
        {letters}
      </button>
    );
  };

  // ── Render ───────────────────────────────────
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
            <p className="text-sm text-[var(--text-secondary)]">Schedule and manage staff shifts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const departmentId = filterDepartmentId !== 'all' ? filterDepartmentId : undefined;
              if (view === 'week') {
                const end = new Date(weekStart);
                end.setDate(end.getDate() + 6);
                void fetchShifts({ fromDate: weekStart.toISOString(), toDate: end.toISOString(), limit: 1000, departmentId });
              } else if (view === 'month') {
                const ms = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
                const me = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0, 23, 59, 59);
                void fetchShifts({ fromDate: ms.toISOString(), toDate: me.toISOString(), limit: 2000, departmentId });
              } else {
                void fetchShifts({ limit: 1000, departmentId });
              }
            }}
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

      {/* Tabs + Print */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 max-w-md">
          {[
            { id: 'list',  label: 'List',  icon: List    },
            { id: 'week',  label: 'Week',  icon: Table2  },
            { id: 'month', label: 'Month', icon: Grid3x3 },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id as ViewMode)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  view === t.id
                    ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePrint('week')}
            disabled={printing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" /> Weekly Rota
          </button>
          <button
            onClick={() => handlePrint('month')}
            disabled={printing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" /> Monthly Rota
          </button>
        </div>
      </div>

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

          {/* Department filter — admin only */}
          {canSeeAllDepartments && (
            <select
              value={filterDepartmentId}
              onChange={(e) => {
                setFilterDepartmentId(e.target.value);
                setFilterUserId('all');
              }}
              className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm min-w-[200px]"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm min-w-[180px]"
          >
            <option value="all">All staff</option>
            {(filterDepartmentId === 'all' ? userList : staffForForm).map((u: any) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>

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

        {canSeeAllDepartments && filterDepartmentId !== 'all' && (
          <p className="text-[10px] text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border-color)]">
            Scoped to <strong className="text-[var(--text-primary)]">{departmentById.get(filterDepartmentId)?.name ?? '—'}</strong>
          </p>
        )}
      </div>

      {/* ───────── LIST VIEW ───────── */}
      {view === 'list' && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center">
              <RefreshCw className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-3 animate-spin" />
              <p className="text-sm text-[var(--text-secondary)]">Loading shifts…</p>
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-14 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No shifts found</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Add a shift to get started</p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Shift
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {filteredShifts.map((shift) => {
                const meta = userById.get(shift.userId);
                const dept = meta?.departmentId ? departmentById.get(meta.departmentId) : null;
                return (
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
                          {shift.user?.fullName || meta?.fullName || '—'}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
                          {dept && (
                            <span className="inline-flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dept.color }} />
                              {dept.name}
                            </span>
                          )}
                          {!dept && <span className="italic">Unassigned</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(shift.shiftDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${shiftColor(shiftLetter(shift.shiftType))}`}>
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────── WEEK VIEW ───────── */}
      {view === 'week' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} –{' '}
              {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prevWeek} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]">
                <ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" />
              </button>
              <button onClick={todayWeek} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-xs font-medium text-[var(--text-primary)]">
                Today
              </button>
              <button onClick={nextWeek} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]">
                <ChevronRight className="w-4 h-4 text-[var(--text-primary)]" />
              </button>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <th className="sticky left-0 bg-[var(--bg-main)] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] min-w-[200px] z-10">
                      Staff
                    </th>
                    {weekDays.map((d) => {
                      const key = toKey(d);
                      const isToday = key === todayKey;
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <th
                          key={key}
                          className={`px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider ${
                            isToday
                              ? 'text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]'
                              : isWeekend
                              ? 'text-[var(--text-tertiary)] bg-[var(--bg-main)]'
                              : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-primary)]'}`}>
                            {d.getDate()}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {weekDeptGroups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
                        No shifts scheduled this week
                      </td>
                    </tr>
                  ) : (
                    weekDeptGroups.map((group) => {
                      const groupKey = group.departmentId ?? '__unassigned__';
                      const isCollapsed = collapsedDepts.has(groupKey);
                      return (
                        <>
                          {/* Department group header */}
                          <tr key={`header-${groupKey}`} className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
                            <td colSpan={8} className="px-3 py-1.5">
                              <button
                                onClick={() => toggleDeptCollapsed(groupKey)}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                <span className="inline-block w-2 h-2 rounded-full" style={{ background: group.departmentColor }} />
                                {group.departmentName}
                                <span className="ml-1 text-[var(--text-tertiary)] font-normal normal-case tracking-normal">
                                  · {group.staffRows.length} staff
                                </span>
                              </button>
                            </td>
                          </tr>

                          {/* Staff rows */}
                          {!isCollapsed && group.staffRows.map((row) => {
                            const cellMap = weekGrid.get(row.id) ?? new Map();
                            return (
                              <tr key={row.id} className="hover:bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                                <td className="sticky left-0 bg-[var(--bg-card)] px-3 py-2 z-10">
                                  <div className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                                    {row.name}
                                  </div>
                                  <div className="text-[10px] text-[var(--text-tertiary)] capitalize">
                                    {row.role.replace(/_/g, ' ')}
                                  </div>
                                </td>
                                {weekDays.map((d) => {
                                  const key = toKey(d);
                                  const isToday = key === todayKey;
                                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                  return (
                                    <td
                                      key={key}
                                      className={`px-1 py-2 text-center ${
                                        isToday ? 'bg-[var(--icon-cyan-bg)]/40' : isWeekend ? 'bg-[var(--bg-main)]/50' : ''
                                      }`}
                                    >
                                      {renderGridCell(cellMap.get(key), openEdit)}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-[var(--border-color)] px-4 py-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              {SHIFT_TYPES.map((t) => (
                <span key={t.value} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${shiftColor(t.letter)}`}>
                    {t.letter}
                  </span>
                  {t.label}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
                Total: {filteredShifts.length} shifts this week
              </span>
            </div>
          </div>
        </>
      )}

      {/* ───────── MONTH VIEW ───────── */}
      {view === 'month' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]">
                <ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" />
              </button>
              <button onClick={todayMonth} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-xs font-medium text-[var(--text-primary)]">
                This Month
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]">
                <ChevronRight className="w-4 h-4 text-[var(--text-primary)]" />
              </button>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="border-collapse" style={{ minWidth: `${200 + monthDays.length * 34}px` }}>
                <thead>
                  <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <th className="sticky left-0 bg-[var(--bg-main)] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] min-w-[200px] z-10">
                      Staff
                    </th>
                    {monthDays.map((d) => {
                      const key = toKey(d);
                      const isToday = key === todayKey;
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <th
                          key={key}
                          className={`px-0.5 py-2 text-center text-[10px] font-bold ${
                            isToday
                              ? 'text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]'
                              : isWeekend
                              ? 'text-[var(--text-tertiary)] bg-[var(--bg-main)]'
                              : 'text-[var(--text-secondary)]'
                          }`}
                          style={{ minWidth: '32px' }}
                        >
                          {d.getDate()}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {monthDeptGroups.length === 0 ? (
                    <tr>
                      <td colSpan={monthDays.length + 1} className="px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
                        No shifts scheduled this month
                      </td>
                    </tr>
                  ) : (
                    monthDeptGroups.map((group) => {
                      const groupKey = group.departmentId ?? '__unassigned__';
                      const isCollapsed = collapsedDepts.has(groupKey);
                      return (
                        <>
                          <tr key={`header-${groupKey}`} className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
                            <td colSpan={monthDays.length + 1} className="px-3 py-1.5">
                              <button
                                onClick={() => toggleDeptCollapsed(groupKey)}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                <span className="inline-block w-2 h-2 rounded-full" style={{ background: group.departmentColor }} />
                                {group.departmentName}
                                <span className="ml-1 text-[var(--text-tertiary)] font-normal normal-case tracking-normal">
                                  · {group.staffRows.length} staff
                                </span>
                              </button>
                            </td>
                          </tr>

                          {!isCollapsed && group.staffRows.map((row) => {
                            const cellMap = monthGrid.get(row.id) ?? new Map();
                            return (
                              <tr key={row.id} className="hover:bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                                <td className="sticky left-0 bg-[var(--bg-card)] px-3 py-1.5 z-10">
                                  <div className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                                    {row.name}
                                  </div>
                                  <div className="text-[10px] text-[var(--text-tertiary)] capitalize">
                                    {row.role.replace(/_/g, ' ')}
                                  </div>
                                </td>
                                {monthDays.map((d) => {
                                  const key = toKey(d);
                                  const isToday = key === todayKey;
                                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                  return (
                                    <td
                                      key={key}
                                      className={`px-0.5 py-1.5 text-center ${
                                        isToday ? 'bg-[var(--icon-cyan-bg)]/40' : isWeekend ? 'bg-[var(--bg-main)]/50' : ''
                                      }`}
                                    >
                                      {renderGridCell(cellMap.get(key), openEdit)}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-[var(--border-color)] px-4 py-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              {SHIFT_TYPES.map((t) => (
                <span key={t.value} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${shiftColor(t.letter)}`}>
                    {t.letter}
                  </span>
                  {t.label}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
                Total: {filteredShifts.length} shifts this month
              </span>
            </div>
          </div>
        </>
      )}

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
                  required={!editingId}
                  className={inputClass}
                >
                  <option value="">— Select staff —</option>
                  {staffForForm.map((u: any) => {
                    const deptId = (u as any).departmentId;
                    const deptName = deptId ? departmentById.get(deptId)?.name : null;
                    return (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.username}){deptName ? ` — ${deptName}` : ''}
                      </option>
                    );
                  })}
                </select>
                {canSeeAllDepartments && filterDepartmentId !== 'all' && (
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                    Showing staff from <strong className="text-[var(--text-primary)]">
                      {departmentById.get(filterDepartmentId)?.name ?? '—'}
                    </strong> only.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Date *</label>
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
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End *</label>
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
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Shift Type *</label>
                <select
                  value={formData.shiftType}
                  onChange={(e) => setFormData({ ...formData, shiftType: e.target.value as any })}
                  required
                  className={inputClass}
                >
                  {SHIFT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="Optional note"
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