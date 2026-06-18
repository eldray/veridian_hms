// src/pages/Departments.tsx - REDESIGNED
import { useEffect, useState, React } from 'react';
import { useDepartmentStore } from '../store/departmentStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import api from '../api/api';
import {
  Plus, Search, Building, Users, Edit, Trash2, RefreshCw,
  UserCheck, Calendar, Crown, ArrowLeft, Grid3x3, List,
  CheckCircle, XCircle, User, UserPlus, UserMinus, Shield,
  TrendingUp, GraduationCap, Loader, X, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Seniority Badge ───────────────────────────────────────────────────────────
const SENIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  TRAINEE: { label: 'Trainee', bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]', icon: GraduationCap },
  JUNIOR: { label: 'Junior', bg: 'bg-[var(--icon-cyan-bg)]', text: 'text-[var(--icon-cyan-text)]', icon: User },
  SENIOR: { label: 'Senior', bg: 'bg-[var(--icon-orange-bg)]', text: 'text-[var(--icon-orange-text)]', icon: TrendingUp },
  PRINCIPAL: { label: 'Principal', bg: 'bg-[var(--icon-yellow-bg)]', text: 'text-[var(--icon-yellow-text)]', icon: Shield },
};

const SeniorityBadge = ({ seniority }: { seniority: string }) => {
  const c = SENIORITY_CONFIG[seniority] || SENIORITY_CONFIG.JUNIOR;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>
      <Icon className="w-2.5 h-2.5" />{c.label}
    </span>
  );
};

// ── Modal Shell ───────────────────────────────────────────────────────────────
const ModalShell: React.FC<{
  title: string; subtitle?: string; icon: React.ReactNode;
  iconBg: string; onClose: () => void; children: React.ReactNode;
  footer?: React.ReactNode; maxW?: string;
}> = ({ title, subtitle, icon, iconBg, onClose, children, footer, maxW = 'max-w-md' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative bg-[var(--bg-card)] rounded-xl w-full ${maxW} border border-[var(--border-color)] overflow-hidden flex flex-col`}
      style={{ maxHeight: '85vh', boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
            {subtitle && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--border-color)] transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin' }}>{children}</div>
      {footer && (
        <div className="flex-shrink-0 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]">{footer}</div>
      )}
    </div>
  </div>
);

const inputCls =
  'w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-lg ' +
  'bg-[var(--bg-main)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] ' +
  'focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all';

const SkeletonCard = () => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-[var(--bg-main)] rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-[var(--bg-main)] rounded w-2/3" />
        <div className="h-3 bg-[var(--bg-main)] rounded w-1/2" />
      </div>
    </div>
    <div className="h-3 bg-[var(--bg-main)] rounded w-full mb-2" />
    <div className="h-3 bg-[var(--bg-main)] rounded w-3/4" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function Departments() {
  const {
    departments, getDepartments, createDepartment, updateDepartment,
    deleteDepartment, assignDepartmentHead, getEligibleHeads,
    getDepartmentUsers, assignUserToDepartment, removeUserFromDepartment,
    eligibleHeads, departmentUsers, isLoading,
  } = useDepartmentStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);

  const [showHeadModal, setShowHeadModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [assigningUser, setAssigningUser] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', description: '', color: '#0891b2', icon: 'building', isActive: true,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { await getDepartments(); await getEligibleHeads(); }
    catch { error('Load Failed', 'Failed to load department data'); }
  };

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users');
      setAllUsers(res.data?.data || res.data || []);
    } catch { error('Load Failed', 'Could not load users'); }
    finally { setLoadingUsers(false); }
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableUsers = allUsers.filter(u => !departmentUsers.some(du => du.id === u.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, formData);
        success('Updated', 'Department updated successfully');
      } else {
        await createDepartment(formData);
        success('Created', 'Department created successfully');
      }
      closeForm();
      await loadData();
    } catch { error('Save Failed', 'Failed to save department'); }
  };

  const closeForm = () => {
    setShowForm(false); setEditingDept(null);
    setFormData({ name: '', description: '', color: '#0891b2', icon: 'building', isActive: true });
  };

  const openEdit = (dept: any) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, description: dept.description || '', color: dept.color || '#0891b2', icon: dept.icon || 'building', isActive: dept.isActive });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this department? This cannot be undone.')) return;
    try { await deleteDepartment(id); success('Deleted', 'Department removed'); await loadData(); }
    catch { error('Delete Failed', 'Failed to delete department'); }
  };

  const openHeadModal = async (dept: any) => {
    setSelectedDept(dept); setSelectedUserId(dept.head?.id || '');
    await getEligibleHeads(); setShowHeadModal(true);
  };

  const handleAssignHead = async () => {
    if (!selectedDept || !selectedUserId) return;
    try {
      await assignDepartmentHead(selectedDept.id, selectedUserId);
      success('Head Assigned', `Head assigned to ${selectedDept.name}`);
      setShowHeadModal(false); setSelectedDept(null); setSelectedUserId('');
      await loadData();
    } catch (err: any) { error('Failed', err.message); }
  };

  const handleRemoveHead = async (dept: any) => {
    if (!window.confirm(`Remove ${dept.head?.fullName} as head of ${dept.name}?`)) return;
    try { await updateDepartment(dept.id, { headId: null }); success('Removed', 'Head removed'); await loadData(); }
    catch (err: any) { error('Failed', err.message); }
  };

  const openStaffModal = async (dept: any) => {
    setSelectedDept(dept); setSelectedUserId('');
    await loadAllUsers(); await getDepartmentUsers(dept.id);
    setShowStaffModal(true);
  };

  const handleAssignUser = async () => {
    if (!selectedDept || !selectedUserId) return;
    setAssigningUser(true);
    try {
      await assignUserToDepartment(selectedDept.id, { userId: selectedUserId });
      success('Assigned', 'User added to department');
      await getDepartmentUsers(selectedDept.id); await getDepartments();
      setSelectedUserId(''); await loadAllUsers();
    } catch (err: any) { error('Failed', err.message); }
    finally { setAssigningUser(false); }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!selectedDept || !window.confirm(`Remove ${userName} from ${selectedDept.name}?`)) return;
    setRemovingId(userId);
    try {
      await removeUserFromDepartment(selectedDept.id, userId);
      success('Removed', `${userName} removed`);
      await getDepartmentUsers(selectedDept.id); await getDepartments(); await loadAllUsers();
    } catch (err: any) { error('Failed', err.message); }
    finally { setRemovingId(null); }
  };

  const getDeptIcon = (iconName: string) => {
    const map: any = { building: Building, users: Users, calendar: Calendar, crown: Crown };
    return map[iconName] || Building;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-4">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
          <div className="h-5 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center">
              <Building className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Departments</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">
                {departments.length} department{departments.length !== 1 ? 's' : ''} configured
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
            {(['list', 'grid'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`p-1.5 rounded-md transition-all ${viewMode === m ? 'bg-[var(--bg-card)] text-[var(--icon-cyan-text)] shadow-sm' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>
                {m === 'list' ? <List className="w-3.5 h-3.5" /> : <Grid3x3 className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          <button onClick={loadData} disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>

          {isAdmin && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
              <Plus className="w-3.5 h-3.5" /> New Department
            </button>
          )}
        </div>
      </div>

      {/* ── SEARCH ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        <input type="text" placeholder="Search departments…" value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={`${inputCls} pl-9`} />
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-main)] flex items-center justify-center">
            <Building className="w-7 h-7 text-[var(--text-tertiary)] opacity-40" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {searchTerm ? 'No departments found' : 'No departments yet'}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {searchTerm ? 'Try a different search term' : 'Create your first department to get started'}
          </p>
          {isAdmin && !searchTerm && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all mt-1">
              <Plus className="w-3.5 h-3.5" /> Create Department
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (

        /* ── GRID VIEW ────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(dept => {
            const Icon = getDeptIcon(dept.icon || 'building');
            return (
              <div key={dept.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden hover:shadow-md transition-all group">
                {/* Color strip */}
                <div className="h-1 w-full" style={{ background: dept.color || '#0891b2' }} />

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: dept.color || '#0891b2' }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{dept.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${dept.isActive ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'
                          }`}>
                          {dept.isActive ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                          {dept.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {dept.description && (
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mb-3">{dept.description}</p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] mb-3">
                    <div className="flex items-center gap-1.5 flex-1">
                      <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      <span className="text-[11px] text-[var(--text-secondary)]">Staff</span>
                      <span className="ml-auto text-xs font-bold text-[var(--text-primary)]">{dept._count?.users || 0}</span>
                    </div>
                    <div className="w-px h-4 bg-[var(--border-color)]" />
                    <div className="flex items-center gap-1.5 flex-1">
                      <Crown className="w-3.5 h-3.5 text-[var(--icon-yellow-text)]" />
                      <span className="text-[11px] text-[var(--text-secondary)]">Head</span>
                      <span className="ml-auto text-[10px] font-semibold text-[var(--text-primary)] truncate max-w-[60px]">
                        {dept.head ? dept.head.fullName.split(' ')[0] : '—'}
                      </span>
                    </div>
                  </div>

                  {dept.head && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--icon-yellow-bg)] border border-[var(--border-color)] mb-3">
                      <Crown className="w-3 h-3 text-[var(--icon-yellow-text)] flex-shrink-0" />
                      <span className="text-[10px] font-semibold text-[var(--icon-yellow-text)] truncate">{dept.head.fullName}</span>
                      {dept.head.seniority && <SeniorityBadge seniority={dept.head.seniority} />}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => openHeadModal(dept)}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-bg)] hover:border-[var(--icon-yellow-text)] transition-all">
                        <Crown className="w-3 h-3" />
                        {dept.head ? 'Change Head' : 'Assign Head'}
                      </button>
                      <button onClick={() => openStaffModal(dept)}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] hover:border-[var(--icon-cyan-text)] transition-all">
                        <Users className="w-3 h-3" /> Manage Staff
                      </button>
                      <button onClick={() => openEdit(dept)}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] hover:border-[var(--icon-green-text)] transition-all">
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => handleDelete(dept.id)}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] hover:border-[var(--icon-red-text)] transition-all">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ── LIST VIEW ────────────────────────────────────────────────── */
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              {filtered.length} department{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-[var(--border-color)]">
            {filtered.map(dept => {
              const Icon = getDeptIcon(dept.icon || 'building');
              return (
                <div key={dept.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-main)] transition-colors group">
                  {/* Color dot + icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: dept.color || '#0891b2' }}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Name + description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{dept.name}</p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${dept.isActive ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'
                        }`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {dept.description && (
                      <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">{dept.description}</p>
                    )}
                  </div>

                  {/* Head */}
                  <div className="w-44 flex-shrink-0 hidden md:block">
                    {dept.head ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-[var(--icon-yellow-bg)] flex items-center justify-center flex-shrink-0">
                          <Crown className="w-3 h-3 text-[var(--icon-yellow-text)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{dept.head.fullName}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] capitalize">{dept.head.role?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--text-tertiary)] italic">No head assigned</span>
                    )}
                  </div>

                  {/* Staff count */}
                  <div className="flex items-center gap-1.5 w-16 flex-shrink-0 hidden sm:flex">
                    <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">{dept._count?.users || 0}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">staff</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAdmin && !dept.head && (
                      <button onClick={() => openHeadModal(dept)} title="Assign Head"
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-bg)] transition-all">
                        <Crown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isAdmin && dept.head && (
                      <button onClick={() => handleRemoveHead(dept)} title="Remove Head"
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all">
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => openStaffModal(dept)} title="Manage Staff"
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all">
                      <Users className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(dept)} title="Edit"
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] transition-all">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(dept.id)} title="Delete"
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ASSIGN HEAD MODAL ─────────────────────────────────────────── */}
      {showHeadModal && selectedDept && (
        <ModalShell title="Assign Department Head" subtitle={selectedDept.name}
          icon={<Crown className="w-4 h-4 text-[var(--icon-yellow-text)]" />}
          iconBg="bg-[var(--icon-yellow-bg)]"
          onClose={() => { setShowHeadModal(false); setSelectedDept(null); setSelectedUserId(''); }}
          footer={
            <div className="flex gap-3">
              <button onClick={() => { setShowHeadModal(false); setSelectedDept(null); setSelectedUserId(''); }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all">
                Cancel
              </button>
              <button onClick={handleAssignHead} disabled={!selectedUserId}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-text)] hover:text-white disabled:opacity-50 transition-all">
                Assign as Head
              </button>
            </div>
          }>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Select Head of Department</p>
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className={inputCls}>
                <option value="">— Select a user —</option>
                {(eligibleHeads || []).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} · {u.role?.replace('_', ' ')} ({u.seniority})
                  </option>
                ))}
              </select>
              {(eligibleHeads || []).length === 0 && (
                <p className="text-[10px] text-[var(--icon-red-text)] mt-1.5">No eligible users. Heads require SENIOR or PRINCIPAL seniority.</p>
              )}
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--icon-yellow-bg)] border border-[var(--border-color)]">
              <Shield className="w-3.5 h-3.5 text-[var(--icon-yellow-text)] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-[var(--icon-yellow-text)]">
                Department heads must have <strong>SENIOR</strong> or <strong>PRINCIPAL</strong> seniority level.
              </p>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── MANAGE STAFF MODAL ────────────────────────────────────────── */}
      {showStaffModal && selectedDept && (
        <ModalShell title="Manage Staff" subtitle={selectedDept.name}
          icon={<Users className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
          iconBg="bg-[var(--icon-cyan-bg)]"
          onClose={() => { setShowStaffModal(false); setSelectedDept(null); setSelectedUserId(''); }}
          footer={
            <button onClick={() => { setShowStaffModal(false); setSelectedDept(null); setSelectedUserId(''); }}
              className="w-full py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all">
              Close
            </button>
          }>
          <div className="space-y-5">
            {/* Current staff */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Current Staff · {departmentUsers.length}
              </p>
              {departmentUsers.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <Users className="w-8 h-8 text-[var(--text-tertiary)] opacity-30" />
                  <p className="text-xs text-[var(--text-tertiary)]">No staff assigned yet</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {departmentUsers.map((staff: any) => (
                    <div key={staff.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] group">
                      <div className="w-7 h-7 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">{staff.fullName}</p>
                          {staff.seniority && <SeniorityBadge seniority={staff.seniority} />}
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)] capitalize">{staff.role?.replace('_', ' ')}</p>
                      </div>
                      <button onClick={() => handleRemoveUser(staff.id, staff.fullName)}
                        disabled={removingId === staff.id}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50">
                        {removingId === staff.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add staff */}
            <div className="pt-4 border-t border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Add Staff Member</p>
              <div className="flex gap-2">
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                  className={`${inputCls} flex-1`} disabled={loadingUsers || assigningUser}>
                  <option value="">— Select a user —</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} · {u.role?.replace('_', ' ')} {u.seniority ? `(${u.seniority})` : ''}
                    </option>
                  ))}
                </select>
                <button onClick={handleAssignUser} disabled={!selectedUserId || assigningUser}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 transition-all flex-shrink-0">
                  {assigningUser ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
              {availableUsers.length === 0 && !loadingUsers && (
                <p className="text-[10px] text-[var(--icon-yellow-text)] mt-1.5">All users are already assigned to this department.</p>
              )}
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── CREATE / EDIT FORM MODAL ───────────────────────────────────── */}
      {showForm && (
        <ModalShell title={editingDept ? 'Edit Department' : 'New Department'}
          subtitle={editingDept ? `Editing ${editingDept.name}` : 'Add a new department'}
          icon={<Building className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
          iconBg="bg-[var(--icon-cyan-bg)]"
          onClose={closeForm}
          footer={
            <div className="flex gap-3">
              <button onClick={closeForm}
                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all">
                Cancel
              </button>
              <button form="dept-form" type="submit"
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-text)] text-white hover:opacity-90 transition-all">
                {editingDept ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          }>
          <form id="dept-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Name *</p>
              <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Cardiology, Pediatrics…" className={inputCls} />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Description</p>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3} placeholder="Brief description of this department…"
                className={`${inputCls} resize-none`} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Color</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-9 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] cursor-pointer p-0.5" />
                  <span className="text-xs font-mono text-[var(--text-secondary)]">{formData.color}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Icon</p>
                <select value={formData.icon} onChange={e => setFormData({ ...formData, icon: e.target.value })} className={inputCls}>
                  <option value="building">Building</option>
                  <option value="users">Users</option>
                  <option value="calendar">Calendar</option>
                  <option value="crown">Crown</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: formData.color }}>
                {React.createElement(getDeptIcon(formData.icon), { className: 'w-5 h-5' })}
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">{formData.name || 'Department Name'}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">{formData.description || 'Preview'}</p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">Active Department</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Inactive departments are hidden from most views</p>
              </div>
            </label>
          </form>
        </ModalShell>
      )}
    </div>
  );
}