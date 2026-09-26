// src/components/scans/ScanResultForm.tsx — template-driven + custom fields
import React, { useState, useRef, useMemo } from 'react';
import {
  X, Upload, Image as ImageIcon, Trash2, FileText, Plus,
} from 'lucide-react';
import { useToast } from '../../store/toastStore';

interface ScanResultFormProps {
  scan: any;
  onSaveResult: (scanId: string, resultData: any) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

interface TemplateField {
  fieldName: string;
  fieldType: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox';
  label: string;
  options?: string[];
  unit?: string;
  referenceRange?: string;
}

interface CustomField {
  id: string;
  fieldName: string;
  label: string;
  value: string;
}

// ── Resolve the resultTemplate from wherever it lives on the scan ──────────
const resolveResultTemplate = (scan: any): TemplateField[] => {
  const candidates = [
    scan?.ScanTemplate?.resultTemplate,
    scan?.ServiceCatalog?.ScanTemplate?.resultTemplate,
    scan?.ServiceCatalog?.metadata?.resultTemplate,
    scan?.resultTemplate,
    scan?.template?.resultTemplate,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c as TemplateField[];
  }
  return [];
};

// ── Load previously-saved values for this scan ──────────────────────────────
const resolveSavedValues = (scan: any): Record<string, any> => {
  const r = scan?.result;
  if (r && typeof r === 'object' && r.values && typeof r.values === 'object') {
    return r.values;
  }
  if (r && typeof r === 'object' && !Array.isArray(r)) {
    const out: Record<string, any> = {};
    Object.keys(r).forEach((k) => { out[k] = r[k]; });
    return out;
  }
  return {};
};

export const ScanResultForm: React.FC<ScanResultFormProps> = ({
  scan,
  onSaveResult,
  onClose,
  saving,
}) => {
  const { error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const template = useMemo(() => resolveResultTemplate(scan), [scan]);
  const hasTemplate = template.length > 0;

  // 🔧 FIXED: Detect whether the template already declares these fields, so we
  // don't render duplicate inputs for them in the footer sections.
  const templateHasImpression = useMemo(
    () => template.some((f) => f.fieldName.toLowerCase() === 'impression'),
    [template]
  );
  const templateHasComment = useMemo(
    () => template.some((f) => f.fieldName.toLowerCase() === 'comment'),
    [template]
  );
  const templateHasNotes = useMemo(
    () =>
      template.some((f) =>
        ['notes', 'additional_notes', 'additionalnotes'].includes(f.fieldName.toLowerCase())
      ),
    [template]
  );

  const [values, setValues] = useState<Record<string, any>>(() => resolveSavedValues(scan));
  const [impression, setImpression] = useState<string>(scan?.impression || '');
  const [notes, setNotes] = useState<string>(
    scan?.result && typeof scan.result === 'string' ? scan.result : ''
  );
  const [findingsText, setFindingsText] = useState<string>(
    typeof scan?.findings === 'string' ? scan.findings : ''
  );
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(scan?.imageUrls || []);
  const [uploading, setUploading] = useState(false);

  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    const saved = resolveSavedValues(scan);
    return Object.entries(saved)
      .filter(([key]) => key.startsWith('custom_') && !key.endsWith('__label'))
      .map(([key, value]) => ({
        id: key,
        fieldName: key,
        label: (saved as any)[`${key}__label`] || 'Additional Finding',
        value: String(value ?? ''),
      }));
  });

  const setValue = (fieldName: string, v: any) =>
    setValues((prev) => ({ ...prev, [fieldName]: v }));

  // ── Custom field handlers ────────────────────────────────────────────────
  const addCustomField = () => {
    const ts = Date.now();
    const fieldName = `custom_${ts}`;
    setCustomFields((prev) => [
      ...prev,
      { id: fieldName, fieldName, label: '', value: '' },
    ]);
  };

  const updateCustomField = (id: string, patch: Partial<CustomField>) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  // ── Image upload ────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 10) {
      toastError('Too many images', 'Maximum 10 images allowed');
      return;
    }
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((p) => [...p, ...newPreviews]);
    setImages((p) => [...p, ...files]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews((p) => p.filter((_, i) => i !== index));
    setImages((p) => p.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    const formData = new FormData();
    images.forEach((img) => formData.append('images', img));

    const res = await fetch(`/api/encounters/scans/${scan.id}/upload-images`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token')}`,
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Image upload failed');
    }
    return data.data?.imageUrls || [];
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setUploading(true);
    try {
      const uploaded = await uploadImages();
      const allImages = [...(scan?.imageUrls || []), ...uploaded];

      const mergedValues: Record<string, any> = { ...values };
      customFields.forEach((f) => {
        if (!f.label.trim()) return;
        mergedValues[f.fieldName] = f.value;
        mergedValues[`${f.fieldName}__label`] = f.label.trim();
      });

      // 🔧 FIXED: If the template already carries the impression/comment, read
      // it from values so the top-level `impression` column stays in sync with
      // what the user typed inside the template row.
      const effectiveImpression = templateHasImpression
        ? String(mergedValues['impression'] ?? '')
        : impression;

      const payload: any = {
        imageUrls: allImages,
        status: 'completed',
        completedAt: new Date().toISOString(),
        impression: effectiveImpression || null,
        notes: notes || null,
      };

      if (hasTemplate) {
        payload.result = {
          templateId: scan?.ServiceCatalog?.code || scan?.scanType || 'scan',
          values: mergedValues,
        };

        const summaryLines = template
          .filter((f) => {
            const v = mergedValues[f.fieldName];
            return v !== undefined && v !== null && String(v).trim() !== '';
          })
          .map((f) => `${f.label}: ${mergedValues[f.fieldName]}`);
        const customLines = customFields
          .filter((f) => f.label.trim() && f.value.trim())
          .map((f) => `${f.label}: ${f.value}`);
        payload.findings = [...summaryLines, ...customLines].join('\n');
      } else {
        payload.findings = findingsText;
        payload.result = notes || null;
      }

      await onSaveResult(scan.id, payload);
    } catch (err: any) {
      toastError('Save failed', err?.message || 'Could not save scan result');
    } finally {
      setUploading(false);
    }
  };

  // ── Template field renderer ─────────────────────────────────────────────
  const renderInput = (field: TemplateField) => {
    const baseCls =
      'w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg ' +
      'text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500';

    const val = values[field.fieldName] ?? '';

    switch (field.fieldType) {
      case 'textarea':
        return (
          <textarea
            value={val}
            onChange={(e) => setValue(field.fieldName, e.target.value)}
            rows={2}
            className={`${baseCls} resize-none`}
            placeholder={`Enter ${field.label.toLowerCase()}…`}
          />
        );
      case 'select':
        return (
          <select
            value={val}
            onChange={(e) => setValue(field.fieldName, e.target.value)}
            className={baseCls}
          >
            <option value="">-- Select --</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            step="any"
            value={val}
            onChange={(e) => setValue(field.fieldName, e.target.value)}
            className={baseCls}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={val}
            onChange={(e) => setValue(field.fieldName, e.target.value)}
            className={baseCls}
          />
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={!!val}
              onChange={(e) => setValue(field.fieldName, e.target.checked)}
              className="rounded border-[var(--border-color)]"
            />
            {field.label}
          </label>
        );
      default:
        return (
          <input
            type="text"
            value={val}
            onChange={(e) => setValue(field.fieldName, e.target.value)}
            className={baseCls}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[var(--border-color)]">

          {/* Header */}
          <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
            <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Enter Results: {scan?.name || scan?.scanType || scan?.ServiceCatalog?.name || 'Scan'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-card)] rounded-lg">
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>

            {/* Scan meta strip */}
            <div className="bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] px-4 py-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <div>
                <span className="text-[var(--text-tertiary)]">Body Part: </span>
                <span className="text-[var(--text-primary)] font-medium">{scan?.bodyPart || '—'}</span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Requested: </span>
                <span className="text-[var(--text-primary)] font-medium">
                  {scan?.requestedAt ? new Date(scan.requestedAt).toLocaleDateString() : '—'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Priority: </span>
                <span className="text-[var(--text-primary)] font-medium">{scan?.priority || 'routine'}</span>
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Images
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-3 text-center cursor-pointer hover:border-indigo-400 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-[var(--text-tertiary)] mx-auto mb-1" />
                <p className="text-xs text-[var(--text-secondary)]">Click to upload (max 10)</p>
              </div>

              {imagePreviews.length > 0 && (
                <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={preview}
                        alt={`Scan ${idx + 1}`}
                        className="w-full h-16 object-cover rounded-lg border border-[var(--border-color)]"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── TEMPLATE-DRIVEN FIELDS ────────────────────────────────── */}
            {hasTemplate ? (
              <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-2 border-b border-[var(--border-color)]">
                  <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                    Scan Findings
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {template.map((field) => {
                    const isWide = field.fieldType === 'textarea';
                    return (
                      <div
                        key={field.fieldName}
                        className={isWide ? '' : 'grid grid-cols-1 sm:grid-cols-[180px_1fr] sm:items-center gap-2'}
                      >
                        {field.fieldType === 'checkbox' ? (
                          renderInput(field)
                        ) : (
                          <>
                            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                              {field.label}
                              {field.referenceRange && (
                                <span className="text-[10px] text-[var(--text-tertiary)] font-normal">
                                  ({field.referenceRange})
                                </span>
                              )}
                            </label>
                            <div className={isWide ? 'mt-1' : ''}>
                              {renderInput(field)}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                  Findings
                </label>
                <textarea
                  value={findingsText}
                  onChange={(e) => setFindingsText(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Describe radiological findings…"
                />
              </div>
            )}

            {/* ── ADDITIONAL FINDINGS (custom fields) ───────────────────── */}
            <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  Additional Findings
                </span>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
                    bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]
                    hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Add Field
                </button>
              </div>

              <div className="p-4 space-y-2">
                {customFields.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)] text-center py-2">
                    Click <strong>Add Field</strong> above to record a finding not covered by the template.
                  </p>
                ) : (
                  customFields.map((field) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 sm:grid-cols-[200px_1fr_auto] gap-2 items-start"
                    >
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                        placeholder="Field name (e.g. Spleen, Free Fluid)"
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <textarea
                        rows={2}
                        value={field.value}
                        onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                        placeholder="Enter findings for this field…"
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(field.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all self-start"
                        title="Remove this field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── STANDALONE IMPRESSION — only when template does NOT include one ─── */}
            {/* 🔧 FIXED: This block is skipped when the template already declares
                an `impression` field, avoiding the duplicate input you saw. */}
            {!templateHasImpression && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                  Impression / Conclusion
                </label>
                <textarea
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Clinical impression based on findings…"
                />
              </div>
            )}

            {/* ── STANDALONE NOTES — only when template doesn't carry a notes field ─── */}
            {!templateHasNotes && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Any additional comments…"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition-colors text-sm text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || uploading}
              className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50"
            >
              {saving || uploading ? 'Saving…' : 'Save Results'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};