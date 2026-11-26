import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, ClipboardList, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../../api/api';

type RecordRow = {
  id: string; testedAt: string; entryPoint: string; testingStatus: string; result: string;
  resultConfirmed: boolean; counsellingPreTest: boolean; counsellingPostTest: boolean;
  previouslyKnownPositive: boolean; newlyIdentifiedPositive: boolean; linkageStatus: string;
};

const inputClass = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]';
const labelClass = 'mb-1 block text-xs font-medium text-[var(--text-secondary)]';

export default function HIVTestingPanel({ patientId, attendanceId }: { patientId: string; attendanceId?: string }) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<any>({
    entryPoint: 'OPD', testingApproach: 'provider_initiated',
    consentGiven: false, testingConsentGiven: false, counsellingPreTest: false, counsellingPostTest: false,
    testingStatus: 'not_started', result: 'pending', resultConfirmed: false,
    firstTimeTester: null, previousTesting: 'unknown', previouslyKnownPositive: false,
    newlyIdentifiedPositive: false, indexTesting: false, stiRelated: false,
    keyPopulationCategory: '', linkageStatus: 'not_assessed',
    testAlgorithm: '', testKit: '', referralFacility: '', referralOutcome: '', notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/hiv-testing/patient/' + patientId);
      setRecords(response.data?.data || response.data?.records || []);
    } catch {
      setMessage('Could not load HTS history. Check your access and try again.');
    } finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { void load(); }, [load]);

  const update = (key: string, value: any) => setForm((old: any) => ({ ...old, [key]: value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.consentGiven) { setMessage('Document consent for HTS counselling before saving.'); return; }
    if (['testing', 'completed'].includes(form.testingStatus) && !form.testingConsentGiven) { setMessage('Separate consent for HIV testing is required before testing begins.'); return; }
    if (form.testingStatus === 'completed' && form.result === 'pending') { setMessage('A completed test must have a recorded result.'); return; }
    if (form.testingStatus === 'declined' && form.result !== 'pending') { setMessage('A declined test cannot have a test result.'); return; }
    setSaving(true); setMessage('');
    try {
      await api.post('/hiv-testing', { ...form, firstTimeTester: form.firstTimeTester === 'yes' ? true : form.firstTimeTester === 'no' ? false : null, patientId, attendanceId });
      setMessage('HTS record saved.');
      setShowForm(false);
      setForm((old: any) => ({ ...old, consentGiven: false, testingConsentGiven: false, result: 'pending', resultConfirmed: false, testingStatus: 'not_started', counsellingPreTest: false, counsellingPostTest: false, notes: '' }));
      await load();
    } catch (error: any) {
      setMessage(error.response?.data?.message || error.message || 'Could not save HTS record.');
    } finally { setSaving(false); }
  };

  const field = (title: string, key: string, options: string[]) => (
    <label className="block"><span className={labelClass}>{title}</span>
      <select className={inputClass} value={form[key] ?? ''} onChange={e => update(key, e.target.value)}>
        {options.map(option => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
      </select>
    </label>
  );
  const check = (title: string, key: string) => (
    <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
      <input type="checkbox" checked={!!form[key]} onChange={e => update(key, e.target.checked)} className="h-4 w-4 rounded border-[var(--border-color)] accent-[var(--icon-cyan-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]" /> {title}
    </label>
  );

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> HIV Counselling &amp; Testing (HTS)</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">This is where you record each HIV counselling episode, whether or not the client proceeds to testing. Records are confidential and retained separately.</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void load()} className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"><RefreshCw className="inline h-4 w-4 mr-1" /> Refresh</button>
        <button type="button" aria-expanded={showForm} onClick={() => setShowForm(v => !v)} className="rounded-lg bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] px-3 py-2 text-sm font-medium hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"><Plus className="inline h-4 w-4 mr-1" /> Record counselling / test</button>
      </div>
    </div>
    {message && <div role="status" className="rounded-lg border border-[var(--border-color)] p-3 text-sm text-[var(--text-secondary)]">{message}</div>}
    <div className="rounded-lg border border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)] p-3 text-xs text-[var(--icon-cyan-text)]">
      <strong>Where to enter counselling:</strong> Select <strong>Record counselling / test</strong>, document HTS counselling consent, then choose <strong>Counselling</strong> as the episode status and tick pre-test and/or post-test counselling as applicable. Separate HIV testing consent is required only when testing is to begin.
    </div>
    {showForm && <form onSubmit={save} className="rounded-xl border border-[var(--border-color)] p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><ClipboardList className="h-4 w-4" /> HTS counselling episode / testing record</div>
      <p className="text-xs text-[var(--text-secondary)]">For a counselling-only visit, keep the test result as Pending and set the episode status to Counselling. Do not record a test result unless a test was performed.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {field('Entry point', 'entryPoint', ['OPD','IPD','ANC','CWC','Family Planning','Maternity','Outreach','Other'])}
        {field('Testing approach', 'testingApproach', ['provider_initiated','client_initiated','index_testing','other'])}
        {field('Episode status', 'testingStatus', ['not_started','counselling','testing','completed','declined'])}
        {field('Test result', 'result', ['pending','positive','negative','invalid','inconclusive'])}
        {field('Previous testing history', 'previousTesting', ['unknown','never_tested','tested_before','known_positive'])}
        {field('First-time tester', 'firstTimeTester', ['unknown','yes','no'])}
        {field('Linkage outcome', 'linkageStatus', ['not_assessed','not_applicable','referred','linked','declined','unable_to_contact'])}
        <label className="block"><span className={labelClass}>Test algorithm / sequence</span><input className={inputClass} value={form.testAlgorithm} onChange={e => update('testAlgorithm',e.target.value)} /></label>
        <label className="block"><span className={labelClass}>Test kit(s)</span><input className={inputClass} value={form.testKit} onChange={e => update('testKit',e.target.value)} /></label>
        <label className="block"><span className={labelClass}>Key population category (optional)</span><input className={inputClass} value={form.keyPopulationCategory} onChange={e => update('keyPopulationCategory',e.target.value)} /></label>
        <label className="block"><span className={labelClass}>Referral facility</span><input className={inputClass} value={form.referralFacility} onChange={e => update('referralFacility',e.target.value)} /></label>
        <label className="block"><span className={labelClass}>Referral outcome</span><input className={inputClass} value={form.referralOutcome} onChange={e => update('referralOutcome',e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-lg bg-[var(--bg-main)] p-3">
        {check('Consent for HTS counselling documented', 'consentGiven')}
        {check('Separate consent for HIV testing', 'testingConsentGiven')}
        {check('Pre-test counselling completed', 'counsellingPreTest')}
        {check('Post-test counselling completed', 'counsellingPostTest')}
        {check('Final result confirmed', 'resultConfirmed')}
        {check('Previously known positive', 'previouslyKnownPositive')}
        {check('Newly identified positive', 'newlyIdentifiedPositive')}
        {check('Index testing', 'indexTesting')}
        {check('STI-related testing', 'stiRelated')}
      </div>
      <label className="block"><span className={labelClass}>Counselling / follow-up notes (avoid unnecessary identifying details)</span><textarea className={inputClass} rows={3} value={form.notes} onChange={e => update('notes',e.target.value)} /></label>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]">Cancel</button><button disabled={saving} className="rounded-lg bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] px-4 py-2 text-sm font-semibold hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)] disabled:opacity-50">{saving ? 'Saving…' : 'Save HTS record'}</button></div>
    </form>}
    <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
      <table className="w-full text-sm text-[var(--text-primary)]"><thead className="bg-[var(--bg-main)] text-[var(--text-secondary)]"><tr>{['Date','Entry point','Status','Result','Counselling','Previous positive','New positive','Linkage'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-[var(--border-color)]">
        {loading ? <tr><td colSpan={8} className="p-5 text-center text-[var(--text-secondary)]">Loading confidential history…</td></tr>
        : records.length === 0 ? <tr><td colSpan={8} className="p-5 text-center text-[var(--text-secondary)]">No HTS records for this patient.</td></tr>
        : records.map(row => <tr key={row.id} className="transition-colors hover:bg-[var(--bg-main)]"><td className="px-3 py-2 whitespace-nowrap text-[var(--text-secondary)]">{new Date(row.testedAt).toLocaleDateString('en-GB')}</td><td className="px-3 py-2 text-[var(--text-secondary)]">{row.entryPoint}</td><td className="px-3 py-2 text-[var(--text-secondary)]">{row.testingStatus.replaceAll('_', ' ')}</td><td className="px-3 py-2 text-[var(--text-secondary)]">{row.result}{row.result === 'positive' && !row.resultConfirmed ? ' (unconfirmed)' : ''}</td><td className="px-3 py-2 text-[var(--text-secondary)]">{row.counsellingPreTest ? 'Pre' : ''}{row.counsellingPreTest && row.counsellingPostTest ? ' + ' : ''}{row.counsellingPostTest ? 'Post' : '—'}</td><td className="px-3 py-2 text-[var(--text-secondary)]">{row.previouslyKnownPositive ? 'Yes' : 'No'}</td><td className="px-3 py-2 text-[var(--text-secondary)]">{row.newlyIdentifiedPositive ? 'Yes' : 'No'}</td><td className="px-3 py-2 text-[var(--text-secondary)]">{row.linkageStatus.replaceAll('_', ' ')}</td></tr>)}
      </tbody></table>
    </div>
    <p className="flex items-start gap-2 text-xs text-[var(--text-tertiary)]"><AlertCircle className="h-4 w-4 shrink-0" /> A reactive screening result is not automatically a confirmed HIV diagnosis. Follow the approved national testing algorithm and record linkage only when confirmed.</p>
  </div>;
}
