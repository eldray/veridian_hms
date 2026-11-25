// src/components/settings/TaxSettingsTab.tsx
//
// Ghana's tax regime, stored as components rather than one opaque percentage so
// a return can be filed per levy. Healthcare is exempt unless a service is
// explicitly marked taxable in the service catalog; this screen only decides
// whether tax applies at all, to which payer types, and at what rates.
import { useEffect, useMemo, useState } from 'react';
import { Calculator, Info, Plus, Save, Trash2 } from 'lucide-react';
import { getTaxConfiguration, updateTaxConfiguration } from '../../api';
import { Button, cn, INPUT } from '../../components/ui';
import { useToast } from '../../store/toastStore';
import {
  computeTaxBreakdown,
  effectiveRate,
  GHANA_TAX_COMPONENTS,
  type TaxComponent,
} from '../../utils/tax';

const PAYER_OPTIONS = [
  { value: 'cash', label: 'Cash / self-pay' },
  { value: 'nhis', label: 'NHIS' },
  { value: 'private_insurance', label: 'Private insurance' },
  { value: 'corporate', label: 'Corporate account' },
];

const LABEL = 'block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5';
const SECTION = 'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3';

const emptyComponent = (order: number): TaxComponent => ({
  code: '',
  name: '',
  rate: 0,
  compound: false,
  order,
  active: true,
});

export default function TaxSettingsTab() {
  const { success, error: toastError } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [defaultExempt, setDefaultExempt] = useState(true);
  const [taxId, setTaxId] = useState('');
  const [payerModes, setPayerModes] = useState<string[]>(['cash']);
  const [components, setComponents] = useState<TaxComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const config = await getTaxConfiguration();
      setIsEnabled(Boolean(config?.isEnabled));
      setDefaultExempt(config?.defaultExempt !== false);
      setTaxId(config?.taxId || '');
      setPayerModes(Array.isArray(config?.payerModes) && config.payerModes.length > 0 ? config.payerModes : ['cash']);
      const rows = Array.isArray(config?.components) ? config.components : [];
      setComponents(rows.length > 0 ? rows : GHANA_TAX_COMPONENTS.map((row) => ({ ...row })));
    } catch (err: any) {
      toastError('Could not load tax settings', err?.response?.data?.message || err?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rate = useMemo(() => effectiveRate(components), [components]);
  const preview = useMemo(() => computeTaxBreakdown(100, components), [components]);

  const togglePayer = (mode: string) => {
    setPayerModes((current) =>
      current.includes(mode) ? current.filter((row) => row !== mode) : [...current, mode],
    );
  };

  const updateComponent = (index: number, patch: Partial<TaxComponent>) => {
    setComponents((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeComponent = (index: number) => {
    setComponents((current) => current.filter((_, i) => i !== index));
  };

  const addComponent = () => {
    setComponents((current) => [...current, emptyComponent(current.length + 1)]);
  };

  const loadGhanaPreset = () => {
    setComponents(GHANA_TAX_COMPONENTS.map((row) => ({ ...row })));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateTaxConfiguration({
        isEnabled,
        defaultExempt,
        taxId: taxId.trim() || null,
        payerModes,
        components: components.map((row, index) => ({ ...row, order: index + 1 })),
      });
      success('Tax settings saved', isEnabled ? 'New bills will apply the configured tax.' : 'Tax is turned off; bills stay exempt.');
      await load();
    } catch (err: any) {
      toastError('Save failed', err?.response?.data?.message || err?.message || 'Could not save tax settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={cn(SECTION, 'p-6 text-center text-sm text-[var(--text-tertiary)]')}>Loading tax settings…</div>;
  }

  return (
    <div className="space-y-3">
      <div className={SECTION}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Tax on patient bills
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
              When disabled, every bill and estimate is exempt. When enabled, tax applies only to services
              marked <span className="font-medium">Taxable</span> in the service catalog and only to the payer
              types selected below.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={() => setIsEnabled((value) => !value)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
              isEnabled ? 'bg-[var(--icon-green-text)]' : 'bg-[var(--border-color)]',
            )}
          >
            <span className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
              isEnabled ? 'translate-x-5' : 'translate-x-0.5',
            )} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <label className="block">
            <span className={LABEL}>Tax identification number (TIN / VAT ID)</span>
            <input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="e.g. C0012345678" className={cn(INPUT, 'w-full')} />
          </label>
          <label className="flex items-start gap-2 mt-5 md:mt-6 cursor-pointer">
            <input type="checkbox" checked={defaultExempt} onChange={(e) => setDefaultExempt(e.target.checked)} className="mt-0.5" />
            <span className="text-xs text-[var(--text-secondary)]">
              Treat services as exempt unless marked taxable
              <span className="block text-[11px] text-[var(--text-tertiary)]">Recommended for Ghana healthcare.</span>
            </span>
          </label>
        </div>

        <div className="mt-3">
          <span className={LABEL}>Applies to payer types</span>
          <div className="flex flex-wrap gap-2">
            {PAYER_OPTIONS.map((option) => {
              const checked = payerModes.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => togglePayer(option.value)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    checked
                      ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]/30'
                      : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={SECTION}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tax components</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Levies are charged on the value; a compound component (VAT) is charged on the value plus the levies.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={loadGhanaPreset}>Ghana preset</Button>
            <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addComponent}>Add component</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-color)]">
                <th className="text-left px-2 py-1.5">Code</th>
                <th className="text-left px-2 py-1.5">Name</th>
                <th className="text-right px-2 py-1.5 w-24">Rate %</th>
                <th className="text-center px-2 py-1.5 w-24">Compound</th>
                <th className="text-center px-2 py-1.5 w-20">Active</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {components.map((component, index) => (
                <tr key={`${component.code}-${index}`} className="border-b border-[var(--border-color)] last:border-0">
                  <td className="px-2 py-1.5">
                    <input
                      value={component.code}
                      onChange={(e) => updateComponent(index, { code: e.target.value.toUpperCase() })}
                      placeholder="VAT"
                      className={cn(INPUT, 'w-full text-xs font-mono')}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={component.name}
                      onChange={(e) => updateComponent(index, { name: e.target.value })}
                      placeholder="Value Added Tax"
                      className={cn(INPUT, 'w-full text-xs')}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={component.rate}
                      onChange={(e) => updateComponent(index, { rate: Number(e.target.value) })}
                      className={cn(INPUT, 'w-full text-xs text-right tabular-nums')}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={component.compound === true}
                      onChange={(e) => updateComponent(index, { compound: e.target.checked })}
                      aria-label={`${component.name || 'Component'} is compound`}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={component.active !== false}
                      onChange={(e) => updateComponent(index, { active: e.target.checked })}
                      aria-label={`${component.name || 'Component'} is active`}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={Trash2}
                      aria-label={`Remove ${component.name || component.code || 'component'}`}
                      className="text-[var(--icon-red-text)]"
                      onClick={() => removeComponent(index)}
                    />
                  </td>
                </tr>
              ))}
              {components.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-6 text-center text-[var(--text-tertiary)]">No components yet. Add one or load the Ghana preset.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Effective rate on a taxable item</span>
            <span className="font-bold text-[var(--text-primary)] tabular-nums">{rate.toFixed(2)}%</span>
          </div>
          {preview.components.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-tertiary)]">
              {preview.components.map((row) => (
                <span key={row.code}>{row.name}: GHS {row.amount.toFixed(2)} on GHS 100</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={cn(SECTION, 'flex items-start gap-2 text-xs text-[var(--text-secondary)]')}>
        <Info className="w-4 h-4 text-[var(--icon-cyan-text)] flex-shrink-0 mt-0.5" />
        <p>
          Tax is charged on the patient-payable share of each line, so an insurer-covered amount is not taxed.
          Changing these rates affects new bills and estimates only; existing bills keep the component trail
          recorded when they were raised.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="button" icon={Save} loading={saving} onClick={save}>Save tax settings</Button>
      </div>
    </div>
  );
}
