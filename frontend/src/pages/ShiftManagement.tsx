// src/pages/ShiftManagement.tsx
// Professional redesign: Patients/Attendance shell + Leave pattern.
// Nothing removed: all constants, helpers, dept grouping, grid builders,
// handlers, printing, filters, modals are exactly as before.
// New:
//  1) Searchable staff picker in Add/Edit Shift (replaces the long <select>).
//     Type a name / username / department / role, pick from the filtered
//     dropdown. Edit mode still locks the staff member, as before.
//  2) List view rebuilt as a real TABLE (TABLE_SHELL): Staff | Department |
//     Date | Time | Type | Notes | Actions — one data point per column,
//     instead of everything crammed into one flex row.
//  3) Pagination (same Pagination component as Patients/Attendance/Leave):
//     List paginates shifts; Week/Month paginate staff rows (dept groups are
//     re-grouped after slicing, so headers stay correct).
//  4) PageHeader + SearchInput + FilterSelect + Segmented + stats strip.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useShiftStore } from '../store/shiftStore';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useHospitalStore } from '../store/hospitalStore';
import { useToast } from '../store/toastStore';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import {
  Calendar, Clock, Plus, RefreshCw, X, Trash2, Edit,
  ChevronLeft, ChevronRight, ChevronDown, User as UserIcon,
  Printer, List, Table2, Grid3x3, Search, Check,
} from 'lucide-react';
import {
  Button, FilterSelect, PageHeader, Pagination,
  SearchInput, Segmented, TABLE_SHELL, TD, TH, TH_ROW, TR,
} from '../components/ui';

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
const shiftLetter = (type: string) => SHIFT_TYPES.find((t) => t.value === type)?.letter ?? '?';
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
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};
const timeToHHmm = (iso: string) => {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return '08:00'; }
};
type ViewMode = 'list' | 'week' | 'month';
interface DeptGroup {
  departmentId: string | null;
  departmentName: string;
  departmentColor: string;
  staffRows: Array<{ id: string; name: string; role: string; departmentId: string | null }>;
}

// ── Searchable staff picker (Add/Edit modal) ──────────────────────────────
// Replaces the long native <select>. Type to filter by name / username /
// department / role, click a row to pick. Keeps the same value shape:
// onPick(userId). Edit mode renders the locked staff member instead.
function StaffPicker({ staff, departmentById, value, onPick, disabled, required }: {
  staff: any[]; departmentById: Map<string, { name: string; color: string }>;
  value: string; onPick: (id: string) => void; disabled?: boolean; required?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const lastValue = useRef(value);
  useEffect(() => { if (lastValue.current !== value) { lastValue.current = value; setQuery(''); setOpen(false); } }, [value]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = staff.find((u: any) => u.id === value);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open ]);
  useEffect(() => { setHighlight(0); }, [query]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((u: any) => {
      const dept = (u as any).departmentId ? departmentById.get((u as any).departmentId)?.name ?? '' : '';
      return [u.fullName, u.username, dept, u.role].filter(Boolean).some((f: string) => f.toLowerCase().includes(q));
    });
  }, [staff, query, departmentById]);
  const inputClass = 'w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]';
  if (disabled && selected) {
    return (
      <div className={`${inputClass} flex items-center gap-2 opacity-70`}>
        <UserIcon className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
        <span className="truncate">{selected.fullName} ({selected.username})</span>
        <span className="ml-auto text-[10px] text-[var(--text-tertiary)] shrink-0">Locked</span>
      </div>
    );
  }
  return (
    <div ref={wrapRef} className="relative">
      <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text" value={selected ? (open ? query : selected.fullName) : query}
        onChange={(e) => { setQuery(e.target.value); if (selected) onPick(''); setOpen(true); }}
        onFocus={() => { setQuery(''); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, matches.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && matches[highlight]) { e.preventDefault(); onPick(matches[highlight].id); setQuery(''); setOpen(false); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Search staff by name, username, department…"
        required={required && !value}
        className={`${inputClass} pl-9 pr-8`}
        aria-label="Search staff member" autoComplete="off"
      />
      {value && (
        <button type="button" aria-label="Clear staff" onClick={() => { onPick(''); setQuery(''); setOpen(true); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--bg-card)]">
          <X className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        </button>
      )}
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg">
          {matches.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[var(--text-secondary)]">No staff match “{query}”. Try another name or department.</p>
          ) : matches.slice(0, 50).map((u: any, i: number) => {
            const deptId = (u as any).departmentId;
            const dept = deptId ? departmentById.get(deptId) : null;
            const isSel = u.id === value;
            return (
              <button key={u.id} type="button" onMouseDown={(e) => { e.preventDefault(); onPick(u.id); setQuery(''); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm ${i === highlight ? 'bg-[var(--bg-main)]' : ''} ${isSel ? 'bg-[var(--icon-cyan-bg)]/40' : ''}`}>
                <span className="w-7 h-7 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center shrink-0"><UserIcon className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" /></span>
                <span className="min-w-0 flex-1"><span className="block font-medium text-[var(--text-primary)] truncate">{u.fullName}</span><span className="block text-[11px] text-[var(--text-tertiary)] truncate">@{u.username}{u.role ? ` · ${String(u.role).replace(/_/g, ' ')}` : ''}{dept ? ` · ${dept.name}` : ''}</span></span>
                {isSel && <Check className="w-4 h-4 text-[var(--icon-cyan-text)] shrink-0" />}
              </button>
            );
          })}
          {matches.length > 50 && <p className="px-3 py-2 text-[10px] text-[var(--text-tertiary)] border-t border-[var(--border-color)]">Showing first 50 of {matches.length} — keep typing to narrow.</p>}
        </div>
      )}
    </div>
  );
}

export default function ShiftManagement() {
  const { shifts, total, departments, isLoading, fetchShifts, fetchDepartments, createShift, updateShift, deleteShift } = useShiftStore();
  const { users, getAllUsers } = useUserStore();
  const { hospital, fetchHospital } = useHospitalStore();
  const { hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const canSeeAllDepartments = hasRole(ADMIN_LIKE_ROLES);
  const [view, setView] = useState<ViewMode>('week');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [monthCursor, setMonthCursor] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShiftType, setFilterShiftType] = useState('all');
  const [filterUserId, setFilterUserId] = useState('all');
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('all');
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [formData, setFormData] = useState({
    userId: '', shiftDate: toInputDate(new Date()), startTime: '08:00', endTime: '14:00',
    shiftType: 'morning' as 'morning' | 'afternoon' | 'night' | 'on_call', notes: '',
  });
  useEffect(() => {
    void getAllUsers({ isActive: true });
    void fetchHospital().catch(() => {});
    if (canSeeAllDepartments) void fetchDepartments();
  }, [canSeeAllDepartments]);
  useEffect(() => {
    const departmentId = filterDepartmentId !== 'all' ? filterDepartmentId : undefined;
    if (view === 'week') {
      const end = new Date(weekStart); end.setDate(end.getDate() + 6);
      void fetchShifts({ fromDate: weekStart.toISOString(), toDate: end.toISOString(), limit: 1000, departmentId });
    } else if (view === 'month') {
      const ms = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
      const me = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0, 23, 59, 59);
      void fetchShifts({ fromDate: ms.toISOString(), toDate: me.toISOString(), limit: 2000, departmentId });
    } else {
      void fetchShifts({ limit: 1000, departmentId });
    }
  }, [view, weekStart, monthCursor, filterDepartmentId]);
  const userList = Array.isArray(users) ? users : [];
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
  const departmentById = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const d of departments) map.set(d.id, { name: d.name, color: d.color || '#0891b2' });
    return map;
  }, [departments]);
  const userById = useMemo(() => {
    const map = new Map<string, { id: string; fullName: string; role: string; departmentId: string | null; username?: string }>();
    for (const u of userList) map.set(u.id, { id: u.id, fullName: u.fullName, role: u.role, departmentId: (u as any).departmentId ?? null, username: (u as any).username });
    return map;
  }, [userList]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);
  const monthDays = useMemo(() => {
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => { const d = new Date(first); d.setDate(i + 1); return d; });
  }, [monthCursor]);
  const buildDeptGroups = (list: any[]): DeptGroup[] => {
    const grid = new Map<string, Map<string, any[]>>();
    const staffSeen = new Map<string, { id: string; name: string; role: string; departmentId: string | null }>();
    for (const s of list) {
      if (!s.userId) continue;
      const meta = userById.get(s.userId);
      if (!staffSeen.has(s.userId)) staffSeen.set(s.userId, { id: s.userId, name: s.user?.fullName || meta?.fullName || '—', role: s.user?.role || meta?.role || '', departmentId: meta?.departmentId ?? null });
      if (!grid.has(s.userId)) grid.set(s.userId, new Map());
      const dateKey = (s.shiftDate || '').split('T')[0];
      if (!dateKey) continue;
      const cellMap = grid.get(s.userId)!;
      if (!cellMap.has(dateKey)) cellMap.set(dateKey, []);
      cellMap.get(dateKey)!.push(s);
    }
    const groups = new Map<string, { name: string; color: string; rows: DeptGroup['staffRows'] }>();
    for (const staff of staffSeen.values()) {
      const deptId = staff.departmentId ?? '__unassigned__';
      const deptMeta = departmentById.get(deptId);
      const deptName = deptId === '__unassigned__' ? 'Unassigned' : deptMeta?.name ?? 'Unknown Department';
      const deptColor = deptId === '__unassigned__' ? '#94a3b8' : deptMeta?.color ?? '#0891b2';
      if (!groups.has(deptId)) groups.set(deptId, { name: deptName, color: deptColor, rows: [] });
      groups.get(deptId)!.rows.push(staff);
    }
    const ordered = Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === '__unassigned__') return 1;
      if (b[0] === '__unassigned__') return -1;
      return a[1].name.localeCompare(b[1].name);
    });
    return ordered.map(([deptId, group]) => ({
      departmentId: deptId === '__unassigned__' ? null : deptId,
      departmentName: group.name, departmentColor: group.color,
      staffRows: group.rows.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  };
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

  // ── Pagination — Patients/Attendance/Leave pattern ────────────────────────
  // Pagination applies to the LIST view only. Week/Month are rotas: they must
  // show every department and every staff member at once (paginating them hid
  // departments and broke the rota), so they are never sliced.
  useEffect(() => { setCurrentPage(1); }, [view, searchQuery, filterShiftType, filterUserId, filterDepartmentId, weekStart, monthCursor]);
  const totalStaffRows = (view === 'week' ? weekDeptGroups : monthDeptGroups).reduce((n, g) => n + g.staffRows.length, 0);
  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / itemsPerPage));
  const goToPage = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedShifts = filteredShifts.slice(startIndex, startIndex + itemsPerPage);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ userId: '', shiftDate: toInputDate(new Date()), startTime: '08:00', endTime: '14:00', shiftType: 'morning', notes: '' });
    setShowForm(true);
  };
  const openEdit = (shift: any) => {
    setEditingId(shift.id);
    setFormData({ userId: shift.userId, shiftDate: (shift.shiftDate || '').split('T')[0] || toInputDate(new Date()), startTime: timeToHHmm(shift.startTime), endTime: timeToHHmm(shift.endTime), shiftType: shift.shiftType, notes: shift.notes ?? '' });
    setShowForm(true);
  };
  const refreshCurrentView = () => {
    const departmentId = filterDepartmentId !== 'all' ? filterDepartmentId : undefined;
    if (view === 'week') {
      const end = new Date(weekStart); end.setDate(end.getDate() + 6);
      void fetchShifts({ fromDate: weekStart.toISOString(), toDate: end.toISOString(), limit: 1000, departmentId });
    } else if (view === 'month') {
      const ms = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
      const me = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0, 23, 59, 59);
      void fetchShifts({ fromDate: ms.toISOString(), toDate: me.toISOString(), limit: 2000, departmentId });
    } else {
      void fetchShifts({ limit: 1000, departmentId });
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId && !editingId) { toastError('Missing user', 'Choose a staff member'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateShift(editingId, { shiftDate: formData.shiftDate, startTime: formData.startTime, endTime: formData.endTime, shiftType: formData.shiftType, notes: formData.notes || undefined } as any);
        success('Shift updated', 'The shift has been updated');
      } else {
        await createShift({ userId: formData.userId, shiftDate: formData.shiftDate, startTime: formData.startTime, endTime: formData.endTime, shiftType: formData.shiftType, notes: formData.notes || undefined });
        success('Shift created', 'The shift has been scheduled');
      }
      setShowForm(false); setEditingId(null); refreshCurrentView();
    } catch (err: any) { toastError('Failed', err?.response?.data?.message || 'Could not save shift'); }
    finally { setSaving(false); }
  };
  const handleDelete = async (shiftId: string) => {
    if (!(await confirmDialog({ title: 'Delete shift', message: 'Delete this shift?', confirmText: 'Delete' }))) return;
    try { await deleteShift(shiftId); success('Deleted', 'Shift removed'); }
    catch (err: any) { toastError('Failed', err?.response?.data?.message || 'Could not delete shift'); }
  };
  const toggleDeptCollapsed = (deptId: string) => {
    setCollapsedDepts((prev) => { const next = new Set(prev); if (next.has(deptId)) next.delete(deptId); else next.add(deptId); return next; });
  };
  const handlePrint = async (kind: 'week' | 'month') => {
    setPrinting(true);
    try {
      const departmentContext = filterDepartmentId !== 'all' ? departmentById.get(filterDepartmentId)?.name ?? null : null;
      if (kind === 'week') {
        const html = generatePDF('shiftRota', { shifts: filteredShifts, weekStart: weekStart.toISOString(), departments, users: userList, departmentName: departmentContext }, hospital);
        openPrintWindow(html, `Shift Rota — week of ${weekStart.toDateString()}`);
        success('Print ready', 'Weekly rota opened');
      } else {
        const html = generatePDF('shiftSummary', { shifts: filteredShifts, month: monthCursor.getMonth() + 1, year: monthCursor.getFullYear(), departments, users: userList, departmentName: departmentContext }, hospital);
        openPrintWindow(html, `Shift Summary — ${monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
        success('Print ready', 'Monthly rota opened');
      }
    } catch (err: any) { toastError('Print failed', err?.message || 'Could not generate the document'); }
    finally { setPrinting(false); }
  };
  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const todayWeek = () => setWeekStart(startOfWeek(new Date()));
  const prevMonth = () => { const d = new Date(monthCursor); d.setMonth(d.getMonth() - 1); setMonthCursor(d); };
  const nextMonth = () => { const d = new Date(monthCursor); d.setMonth(d.getMonth() + 1); setMonthCursor(d); };
  const todayMonth = () => { const d = new Date(); d.setDate(1); setMonthCursor(d); };
  const inputClass = 'w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]';
  const staffForForm = useMemo(() => {
    if (filterDepartmentId === 'all') return userList;
    return userList.filter((u: any) => (u as any).departmentId === filterDepartmentId);
  }, [userList, filterDepartmentId]);
  const renderGridCell = (cells: any[] | undefined, onEdit: (s: any) => void) => {
    if (!cells || cells.length === 0) return <span className="text-[var(--text-tertiary)] text-[10px]">—</span>;
    const letters = cells.map((c) => shiftLetter(c.shiftType)).join('+');
    const primary = shiftLetter(cells[0].shiftType);
    return (
      <button type="button" onClick={() => onEdit(cells[0])} title={cells.map((c) => `${c.shiftType}: ${formatTime(c.startTime)}–${formatTime(c.endTime)}`).join(' | ')}
        className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md border text-[10px] font-bold ${shiftColor(primary)} hover:opacity-80 transition-opacity`}>
        {letters}
      </button>
    );
  };
  const rowActions = (shift: any) => (
    <div className="flex items-center gap-1.5">
      <Button variant="soft" accent="cyan" size="sm" iconOnly icon={Edit} aria-label="Edit shift" onClick={() => openEdit(shift)} />
      <Button variant="dangerSoft" size="sm" iconOnly icon={Trash2} aria-label="Delete shift" onClick={() => handleDelete(shift.id)} />
    </div>
  );
  const shiftTypeBadge = (type: string) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${shiftColor(shiftLetter(type))}`}>
      {type.replace('_', ' ')}
    </span>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <PageHeader title="Shift Management" subtitle="Schedule and manage staff shifts"
        meta={<>{total} total loaded • {filteredShifts.length} in current view</>}
        icon={Calendar} accent="cyan"
        actions={<>
          <Button icon={RefreshCw} loading={isLoading} onClick={refreshCurrentView}>{isLoading ? 'Refreshing...' : 'Refresh'}</Button>
          <Button variant="soft" accent="cyan" icon={Plus} onClick={openCreate}>Add Shift</Button>
        </>} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: 'Shifts in view', value: filteredShifts.length, color: 'text-[var(--icon-cyan-text)]', bg: 'bg-[var(--icon-cyan-bg)]', icon: Calendar },
          { label: 'Morning', value: filteredShifts.filter((s) => s.shiftType === 'morning').length, color: 'text-green-700', bg: 'bg-green-100', icon: Clock },
          { label: 'Afternoon', value: filteredShifts.filter((s) => s.shiftType === 'afternoon').length, color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock },
          { label: 'Night / On Call', value: filteredShifts.filter((s) => s.shiftType === 'night' || s.shiftType === 'on_call').length, color: 'text-purple-700', bg: 'bg-purple-100', icon: Clock },
        ] as const).map((s) => (
          <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] flex items-center justify-between">
            <div><p className="text-xs text-[var(--text-secondary)]">{s.label}</p><p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{s.value}</p></div>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
          </div>
        ))}
      </div>

      {/* Tabs + Print — Patients/Leave pattern */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Segmented aria-label="Shift view" accent="cyan" value={view} onChange={(v) => setView(v as ViewMode)}
          options={[{ value: 'list', label: 'List', icon: List }, { value: 'week', label: 'Week', icon: Table2 }, { value: 'month', label: 'Month', icon: Grid3x3 }]} />
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Printer} disabled={printing} onClick={() => handlePrint('week')}>Weekly Rota</Button>
          <Button variant="secondary" size="sm" icon={Printer} disabled={printing} onClick={() => handlePrint('month')}>Monthly Rota</Button>
        </div>
      </div>

      {/* Filters — Patients pattern */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <SearchInput className="w-full lg:max-w-sm" value={searchQuery} onChange={setSearchQuery} placeholder="Search by staff name or notes…" />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {canSeeAllDepartments && (
              <FilterSelect aria-label="Department" value={filterDepartmentId} onChange={(v) => { setFilterDepartmentId(v); setFilterUserId('all'); }}
                options={[{ value: 'all', label: 'All Departments' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} />
            )}
            <FilterSelect aria-label="Staff member" value={filterUserId} onChange={setFilterUserId}
              options={[{ value: 'all', label: 'All staff' }, ...(filterDepartmentId === 'all' ? userList : staffForForm).map((u: any) => ({ value: u.id, label: u.fullName }))]} />
            <FilterSelect aria-label="Shift type" value={filterShiftType} onChange={setFilterShiftType}
              options={[{ value: 'all', label: 'All shift types' }, ...SHIFT_TYPES.map((t) => ({ value: t.value, label: t.label }))]} />
            {view === 'list' && (
              <FilterSelect aria-label="Rows per page" value={String(itemsPerPage)} onChange={(v) => setItemsPerPage(Number(v))}
                options={[{ value: '10', label: '10 per page' }, { value: '15', label: '15 per page' }, { value: '20', label: '20 per page' }, { value: '25', label: '25 per page' }]} />
            )}
          </div>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border-color)]">
          {view === 'list'
            ? <>Showing {paginatedShifts.length} of {filteredShifts.length} shifts • {total} total loaded</>
            : <>Showing all {totalStaffRows} staff • {filteredShifts.length} shifts in view</>}
          {canSeeAllDepartments && filterDepartmentId !== 'all' && <> · Scoped to <strong className="text-[var(--text-primary)]">{departmentById.get(filterDepartmentId)?.name ?? '—'}</strong></>}
        </p>
      </div>

      {/* ───────── LIST VIEW — now a real table ───────── */}
      {view === 'list' && (
        <>
          {isLoading ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-10 text-center">
              <RefreshCw className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-3 animate-spin" />
              <p className="text-sm text-[var(--text-secondary)]">Loading shifts…</p>
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
              <Calendar className="w-14 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No shifts found</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Add a shift to get started</p>
              <Button variant="soft" accent="cyan" icon={Plus} onClick={openCreate}>Add Shift</Button>
            </div>
          ) : (
            <div className={TABLE_SHELL}>
              <table className="w-full">
                <thead><tr className={TH_ROW}>
                  <th className={TH}>Staff</th><th className={TH}>Department</th>
                  <th className={`${TH} whitespace-nowrap`}>Date</th><th className={`${TH} whitespace-nowrap`}>Time</th>
                  <th className={TH}>Type</th><th className={TH}>Notes</th><th className={TH}>Actions</th>
                </tr></thead>
                <tbody>
                  {paginatedShifts.map((shift) => {
                    const meta = userById.get(shift.userId);
                    const dept = meta?.departmentId ? departmentById.get(meta.departmentId) : null;
                    return (
                      <tr key={shift.id} className={TR}>
                        <td className={`${TD} sticky left-0 z-10 bg-[var(--bg-card)]`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center shrink-0"><UserIcon className="w-4 h-4 text-[var(--icon-cyan-text)]" /></div>
                            <div className="min-w-0"><p className="font-semibold text-[var(--text-primary)] whitespace-nowrap truncate">{shift.user?.fullName || meta?.fullName || '—'}</p><p className="text-[11px] text-[var(--text-tertiary)] truncate">@{meta?.username ?? '—'}{meta?.role ? ` · ${meta.role.replace(/_/g, ' ')}` : ''}</p></div>
                          </div>
                        </td>
                        <td className={TD}>{dept ? (<span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dept.color }} />{dept.name}</span>) : <span className="italic text-[var(--text-tertiary)]">Unassigned</span>}</td>
                        <td className={`${TD} whitespace-nowrap`}>{new Date(shift.shiftDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td className={`${TD} whitespace-nowrap`}>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</td>
                        <td className={TD}>{shiftTypeBadge(shift.shiftType)}</td>
                        <td className={TD}><span className="block max-w-[240px] truncate" title={shift.notes}>{shift.notes || '—'}</span></td>
                        <td className={TD}>{rowActions(shift)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredShifts.length > 0 && <Pagination page={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={filteredShifts.length} noun="shifts" onChange={goToPage} />}
        </>
      )}

      {/* ───────── WEEK VIEW ───────── */}
      {view === 'week' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prevWeek} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]"><ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" /></button>
              <button onClick={todayWeek} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-xs font-medium text-[var(--text-primary)]">Today</button>
              <button onClick={nextWeek} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]"><ChevronRight className="w-4 h-4 text-[var(--text-primary)]" /></button>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <th className="sticky left-0 bg-[var(--bg-main)] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] min-w-[200px] z-10">Staff</th>
                    {weekDays.map((d) => {
                      const key = toKey(d); const isToday = key === todayKey; const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <th key={key} className={`px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]' : isWeekend ? 'text-[var(--text-tertiary)] bg-[var(--bg-main)]' : 'text-[var(--text-secondary)]'}`}>
                          <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-primary)]'}`}>{d.getDate()}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {weekDeptGroups.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-[var(--text-secondary)]">No shifts scheduled this week</td></tr>
                  ) : weekDeptGroups.map((group) => {
                    const groupKey = group.departmentId ?? '__unassigned__';
                    const isCollapsed = collapsedDepts.has(groupKey);
                    return (
                      <Fragment key={`week-${groupKey}`}>
                        <tr className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
                          <td colSpan={8} className="px-3 py-1.5">
                            <button onClick={() => toggleDeptCollapsed(groupKey)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                              <span className="inline-block w-2 h-2 rounded-full" style={{ background: group.departmentColor }} />
                              {group.departmentName}
                              <span className="ml-1 text-[var(--text-tertiary)] font-normal normal-case tracking-normal">· {group.staffRows.length} staff</span>
                            </button>
                          </td>
                        </tr>
                        {!isCollapsed && group.staffRows.map((row) => {
                          const cellMap = weekGrid.get(row.id) ?? new Map();
                          return (
                            <tr key={row.id} className="hover:bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <td className="sticky left-0 bg-[var(--bg-card)] px-3 py-2 z-10">
                                <div className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[180px]">{row.name}</div>
                                <div className="text-[10px] text-[var(--text-tertiary)] capitalize">{row.role.replace(/_/g, ' ')}</div>
                              </td>
                              {weekDays.map((d) => {
                                const key = toKey(d); const isToday = key === todayKey; const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                return (
                                  <td key={key} className={`px-1 py-2 text-center ${isToday ? 'bg-[var(--icon-cyan-bg)]/40' : isWeekend ? 'bg-[var(--bg-main)]/50' : ''}`}>
                                    {renderGridCell(cellMap.get(key), openEdit)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--border-color)] px-4 py-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              {SHIFT_TYPES.map((t) => (
                <span key={t.value} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${shiftColor(t.letter)}`}>{t.letter}</span>{t.label}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">Total: {filteredShifts.length} shifts this week · {totalStaffRows} staff</span>
            </div>
          </div>
        </>
      )}

      {/* ───────── MONTH VIEW ───────── */}
      {view === 'month' && (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-semibold text-[var(--text-primary)]">{monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]"><ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" /></button>
              <button onClick={todayMonth} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-xs font-medium text-[var(--text-primary)]">This Month</button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]"><ChevronRight className="w-4 h-4 text-[var(--text-primary)]" /></button>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              {/* w-full + table-fixed + colgroup: the table stretches to the
                  full container width and the day columns share the leftover
                  space evenly, instead of stopping at 200 + days*34px and
                  leaving an empty gap on wide screens. minWidth keeps the
                  horizontal scroll on narrow screens. */}
              <table className="w-full border-collapse table-fixed" style={{ minWidth: `${200 + monthDays.length * 34}px` }}>
                <colgroup>
                  <col style={{ width: '200px' }} />
                  {monthDays.map((d) => (<col key={toKey(d)} style={{ width: `${100 / monthDays.length}%` }} />))}
                </colgroup>
                <thead>
                  <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <th className="sticky left-0 bg-[var(--bg-main)] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] z-10">Staff</th>
                    {monthDays.map((d) => {
                      const key = toKey(d); const isToday = key === todayKey; const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <th key={key} className={`px-0.5 py-2 text-center text-[10px] font-bold ${isToday ? 'text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]' : isWeekend ? 'text-[var(--text-tertiary)] bg-[var(--bg-main)]' : 'text-[var(--text-secondary)]'}`}>{d.getDate()}</th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {monthDeptGroups.length === 0 ? (
                    <tr><td colSpan={monthDays.length + 1} className="px-4 py-12 text-center text-sm text-[var(--text-secondary)]">No shifts scheduled this month</td></tr>
                  ) : monthDeptGroups.map((group) => {
                    const groupKey = group.departmentId ?? '__unassigned__';
                    const isCollapsed = collapsedDepts.has(groupKey);
                    return (
                      <Fragment key={`month-${groupKey}`}>
                        <tr className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
                          <td colSpan={monthDays.length + 1} className="px-3 py-1.5">
                            <button onClick={() => toggleDeptCollapsed(groupKey)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                              <span className="inline-block w-2 h-2 rounded-full" style={{ background: group.departmentColor }} />
                              {group.departmentName}
                              <span className="ml-1 text-[var(--text-tertiary)] font-normal normal-case tracking-normal">· {group.staffRows.length} staff</span>
                            </button>
                          </td>
                        </tr>
                        {!isCollapsed && group.staffRows.map((row) => {
                          const cellMap = monthGrid.get(row.id) ?? new Map();
                          return (
                            <tr key={row.id} className="hover:bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <td className="sticky left-0 bg-[var(--bg-card)] px-3 py-1.5 z-10">
                                <div className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[180px]">{row.name}</div>
                                <div className="text-[10px] text-[var(--text-tertiary)] capitalize">{row.role.replace(/_/g, ' ')}</div>
                              </td>
                              {monthDays.map((d) => {
                                const key = toKey(d); const isToday = key === todayKey; const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                return (
                                  <td key={key} className={`px-0.5 py-1.5 text-center ${isToday ? 'bg-[var(--icon-cyan-bg)]/40' : isWeekend ? 'bg-[var(--bg-main)]/50' : ''}`}>
                                    {renderGridCell(cellMap.get(key), openEdit)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--border-color)] px-4 py-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              {SHIFT_TYPES.map((t) => (
                <span key={t.value} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${shiftColor(t.letter)}`}>{t.letter}</span>{t.label}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">Total: {filteredShifts.length} shifts this month · {totalStaffRows} staff</span>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{editingId ? 'Edit Shift' : 'Schedule Shift'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-[var(--bg-card)]"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Staff Member *</label>
                <StaffPicker staff={staffForForm} departmentById={departmentById} value={formData.userId}
                  onPick={(id) => setFormData({ ...formData, userId: id })}
                  disabled={!!editingId} required={!editingId} />
                {canSeeAllDepartments && filterDepartmentId !== 'all' && (
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Showing staff from <strong className="text-[var(--text-primary)]">{departmentById.get(filterDepartmentId)?.name ?? '—'}</strong> only.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Date *</label>
                <input type="date" value={formData.shiftDate} onChange={(e) => setFormData({ ...formData, shiftDate: e.target.value })} required className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start *</label>
                  <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End *</label>
                  <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} required className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Shift Type *</label>
                <select value={formData.shiftType} onChange={(e) => setFormData({ ...formData, shiftType: e.target.value as any })} required className={inputClass}>
                  {SHIFT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className={`${inputClass} resize-none`} placeholder="Optional note" />
              </div>
              <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium disabled:opacity-50">
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
