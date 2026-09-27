// src/components/nursing/NursingNotesPanel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  StickyNote, Plus, X, Check, Trash2, Pencil, Flag, Search,
  MessageSquare, AlertTriangle, FileText, User as UserIcon,
  Clock, Eye, Calendar,
} from 'lucide-react';
import { useNursingStore } from '../../store/nursingStore';
import { useToast } from '../../store/toastStore';
import type { NursingNote, NursingNoteType } from '../../api/nursing';

interface NursingNotesPanelProps {
  patientId: string;
  attendanceId?: string | null;
  admissionId?: string | null;
  currentUserId?: string;
  currentRole?: string;
}

// ─────────────────────────────────────────────
// Note type config
// ─────────────────────────────────────────────

const NOTE_TYPES: {
  value: NursingNoteType;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'general',               label: 'General',        color: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',     icon: FileText },
  { value: 'observation',           label: 'Observation',    color: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]',     icon: StickyNote },
  { value: 'shift_handover',        label: 'Handover',       color: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]', icon: MessageSquare },
  { value: 'escalation',            label: 'Escalation',     color: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',       icon: AlertTriangle },
  { value: 'medication',            label: 'Medication',     color: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]', icon: StickyNote },
  { value: 'procedure',             label: 'Procedure',      color: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',   icon: StickyNote },
  { value: 'patient_communication', label: 'Patient Comm.',  color: 'bg-[var(--bg-main)] text-[var(--text-secondary)]',          icon: UserIcon },
  { value: 'family_communication',  label: 'Family Comm.',   color: 'bg-[var(--bg-main)] text-[var(--text-secondary)]',          icon: UserIcon },
];

const SHIFTS = ['morning', 'afternoon', 'night'] as const;

const noteTypeConf = (t: NursingNoteType) =>
  NOTE_TYPES.find((x) => x.value === t) ?? NOTE_TYPES[0];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const formatWhen = (iso: string) => {
  try {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday
      ? `Today ${time}`
      : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  } catch {
    return iso;
  }
};

const formatFull = (iso: string) => {
  try {
    return new Date(iso).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

// Approximate line-clamp via a length threshold. CSS `-webkit-line-clamp`
// is available in browsers but we also want a JS-side detector to decide
// whether to render "Read more".
const PREVIEW_CHARS = 260;
const needsTruncation = (content: string) =>
  content.length > PREVIEW_CHARS || content.split('\n').length > 5;

const truncateContent = (content: string) => {
  if (!needsTruncation(content)) return content;
  // Take the first 5 lines, then cap at PREVIEW_CHARS
  const lines = content.split('\n');
  const firstFive = lines.slice(0, 5).join('\n');
  if (firstFive.length <= PREVIEW_CHARS) return firstFive;
  return firstFive.slice(0, PREVIEW_CHARS).trim() + '…';
};

// ═════════════════════════════════════════════
// Add / Edit modal
// ═════════════════════════════════════════════

const NoteEditorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    content: string;
    noteType: NursingNoteType;
    shift: string;
    isFlagged: boolean;
  }) => Promise<void>;
  initial?: Partial<NursingNote>;
}> = ({ isOpen, onClose, onSave, initial }) => {
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<NursingNoteType>('general');
  const [shift, setShift] = useState('');
  const [isFlagged, setIsFlagged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContent(initial?.content ?? '');
      setNoteType((initial?.noteType as NursingNoteType) ?? 'general');
      setShift(initial?.shift ?? '');
      setIsFlagged(initial?.isFlagged ?? false);
      setError('');
    }
  }, [isOpen, initial]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Note content is required');
      return;
    }
    setSaving(true);
    try {
      await onSave({ content: content.trim(), noteType, shift, isFlagged });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-lg border border-[var(--border-color)] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
              <StickyNote className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {initial?.id ? 'Edit Note' : 'Add Nursing Note'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-main)]">
            <X className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--icon-red-bg)] border border-[var(--icon-red-text)] text-xs text-[var(--icon-red-text)]">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as NursingNoteType)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
              >
                {NOTE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                Shift
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
              >
                <option value="">— Any —</option>
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
              Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Write your note here…"
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
            />
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
              {content.length} chars
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFlagged}
              onChange={(e) => setIsFlagged(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-color)]"
            />
            <span className="text-xs text-[var(--text-primary)]">
              Flag for shift handover
            </span>
          </label>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !content.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors disabled:opacity-50"
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════
// Note detail modal
// ═════════════════════════════════════════════

const NoteDetailModal: React.FC<{
  note: NursingNote | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (note: NursingNote) => void;
  onDelete: (note: NursingNote) => void;
}> = ({ note, canEdit, onClose, onEdit, onDelete }) => {
  if (!note) return null;
  const conf = noteTypeConf(note.noteType);
  const Icon = conf.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-2xl border border-[var(--border-color)] shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${conf.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${conf.color}`}>
                  {conf.label}
                </span>
                {note.shift && (
                  <span className="text-[10px] text-[var(--text-secondary)] capitalize">
                    · {note.shift}
                  </span>
                )}
                {note.isFlagged && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--icon-orange-text)]">
                    <Flag className="w-3 h-3" /> FLAGGED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {formatFull(note.createdAt)}
                {note.editedAt && (
                  <>
                    <span>·</span>
                    <span className="italic">edited {formatWhen(note.editedAt)}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
            {note.content}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-main)] rounded-b-xl">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <div className="w-6 h-6 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-3 h-3 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)] leading-tight">
                {note.createdBy.fullName}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] capitalize leading-tight">
                {note.createdBy.role?.replace(/_/g, ' ') ?? 'Staff'}
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { onEdit(note); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => { onDelete(note); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] hover:bg-[var(--icon-red-text)] hover:text-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════
// Note card (grid item)
// ═════════════════════════════════════════════

const NoteCard: React.FC<{
  note: NursingNote;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ note, canEdit, onOpen, onEdit, onDelete }) => {
  const conf = noteTypeConf(note.noteType);
  const Icon = conf.icon;
  const truncated = truncateContent(note.content);
  const truncatedFlag = needsTruncation(note.content);

  return (
    <div
      className={`group relative flex flex-col rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
        note.isFlagged
          ? 'border-[var(--icon-orange-text)] bg-[var(--icon-orange-bg)]/30'
          : 'border-[var(--border-color)] bg-[var(--bg-card)]'
      }`}
      onClick={onOpen}
    >
      {/* Header row: type badge + flag */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${conf.color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${conf.color}`}>
          {conf.label}
        </span>
        {note.isFlagged && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-[var(--icon-orange-text)]">
            <Flag className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Time + shift */}
      <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)] mb-2">
        <Clock className="w-3 h-3" />
        <span>{formatWhen(note.createdAt)}</span>
        {note.shift && (
          <>
            <span>·</span>
            <span className="capitalize">{note.shift}</span>
          </>
        )}
      </div>

      {/* Content preview */}
      <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed flex-1">
        {truncated}
      </p>

      {truncatedFlag && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="mt-2 text-[10px] font-semibold text-[var(--icon-cyan-text)] hover:underline text-left"
        >
          Read more →
        </button>
      )}

      {/* Footer: author + actions */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-2.5 h-2.5 text-[var(--icon-cyan-text)]" />
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] truncate">
            {note.createdBy.fullName}
          </span>
        </div>

        {canEdit && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-colors"
              title="Edit"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════
// Main panel
// ═════════════════════════════════════════════

export const NursingNotesPanel: React.FC<NursingNotesPanelProps> = ({
  patientId,
  attendanceId,
  admissionId,
  currentUserId,
  currentRole,
}) => {
  const {
    notes,
    notesLoading,
    notesError,
    fetchNotes,
    createNote,
    editNote,
    removeNote,
  } = useNursingStore();
  const { success, error: toastError } = useToast();

  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<NursingNote | null>(null);
  const [detailNote, setDetailNote] = useState<NursingNote | null>(null);
  const [filterType, setFilterType] = useState<'all' | NursingNoteType>('all');
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void fetchNotes({
      patientId,
      noteType: filterType === 'all' ? undefined : filterType,
      isFlagged: filterFlagged ? true : undefined,
      search: search.trim() || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, filterType, filterFlagged, search]);

  const isAdminLike = currentRole === 'super_admin' || currentRole === 'admin';

  const canEdit = (note: NursingNote) => isAdminLike || note.createdById === currentUserId;

  // ── Create ──
  const handleCreate = async (data: {
    content: string;
    noteType: NursingNoteType;
    shift: string;
    isFlagged: boolean;
  }) => {
    try {
      await createNote({
        patientId,
        attendanceId: attendanceId ?? null,
        admissionId: admissionId ?? null,
        content: data.content,
        noteType: data.noteType,
        shift: (data.shift || null) as any,
        isFlagged: data.isFlagged,
      });
      success('Note added', 'Note recorded successfully');
      await fetchNotes({ patientId });
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || err.message);
      throw err;
    }
  };

  // ── Edit ──
  const handleEdit = async (data: {
    content: string;
    noteType: NursingNoteType;
    shift: string;
    isFlagged: boolean;
  }) => {
    if (!editing) return;
    try {
      await editNote(editing.id, {
        content: data.content,
        noteType: data.noteType,
        shift: data.shift || null,
        isFlagged: data.isFlagged,
      });
      success('Note updated', 'Changes saved');
      setEditing(null);
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || err.message);
      throw err;
    }
  };

  // ── Delete ──
  const handleDelete = async (note: NursingNote) => {
    if (!window.confirm('Delete this note permanently?')) return;
    try {
      await removeNote(note.id);
      success('Note deleted', 'Note removed');
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || err.message);
    }
  };

  // ── Sorted notes for display (newest first) ──
  const displayNotes = useMemo(() => {
    return [...notes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notes]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
        >
          <option value="all">All types</option>
          {NOTE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setFilterFlagged((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            filterFlagged
              ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] border-[var(--icon-orange-text)]'
              : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-card)]'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          Flagged only
        </button>

        <button
          type="button"
          onClick={() => { setEditing(null); setShowEditor(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Note
        </button>
      </div>

      {/* Error */}
      {notesError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--icon-red-bg)] border border-[var(--icon-red-text)] text-xs text-[var(--icon-red-text)]">
          <AlertTriangle className="w-3.5 h-3.5" />
          {notesError}
        </div>
      )}

      {/* Grid */}
      {notesLoading ? (
        <div className="text-center py-10">
          <div className="w-6 h-6 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[var(--text-tertiary)] mt-2">Loading notes…</p>
        </div>
      ) : displayNotes.length === 0 ? (
        <div className="text-center py-12 bg-[var(--bg-main)] rounded-xl border border-dashed border-[var(--border-color)]">
          <StickyNote className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)] font-medium">No notes yet</p>
          <button
            onClick={() => setShowEditor(true)}
            className="mt-2 text-xs text-[var(--icon-cyan-text)] hover:underline font-medium"
          >
            Add the first note
          </button>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {displayNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              canEdit={canEdit(note)}
              onOpen={() => setDetailNote(note)}
              onEdit={() => { setEditing(note); setShowEditor(true); }}
              onDelete={() => handleDelete(note)}
            />
          ))}
        </div>
      )}

      {/* Editor modal */}
      <NoteEditorModal
        isOpen={showEditor}
        onClose={() => { setShowEditor(false); setEditing(null); }}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing ?? undefined}
      />

      {/* Detail modal */}
      <NoteDetailModal
        note={detailNote}
        canEdit={detailNote ? canEdit(detailNote) : false}
        onClose={() => setDetailNote(null)}
        onEdit={(n) => { setEditing(n); setShowEditor(true); }}
        onDelete={(n) => handleDelete(n)}
      />
    </div>
  );
};

export default NursingNotesPanel;