import { useEffect, useMemo, useState } from 'react';
import api from '../../api/api';
import { useToast } from '../../store/toastStore';
import { Card, Button, INPUT } from '../ui';

type EpiLine = {
  section: 'vaccine_stock' | 'other_commodity'; itemKey: string; itemLabel: string;
  beginningBalance: string; quantityReceived: string; quantityUsed: string; dosesOpened: string;
  vvmStatusChange: string; quantityExpired: string; otherLosses: string; stockAtEnd: string; stockoutDays: string;
};
const vaccineItems = ['BCG','Hep B','OPV','IPV','Rotavirus','Penta','PCV','Measles-Rubella','YF','Men A','Td','Malaria Vaccine','HPV','Janssen','AstraZeneca','PfizerBioNTech','Moderna','Other COVID-19 Vaccines'];
const commodityItems = ['LLIN','Vitamin A (100,000 IU) - Blue','Vitamin A (200,000 IU) - Red','AD Syringe 0.05ml','AD Syringe 0.5ml','Dilution 2ml','Dilution 5ml','Safety boxes'];
const numericFields = [
  ['beginningBalance','Beginning balance'],['quantityReceived','Received'],
  ['dosesOpened','Doses opened'],['vvmStatusChange','VVM status 3/4'],
  ['quantityExpired','Expired'],['otherLosses','Other losses'],
  ['stockAtEnd','Stock at end'],['stockoutDays','Stockout days']
] as const;
const commodityFields = [
  ['beginningBalance','Beginning'],['quantityReceived','Received'],['quantityUsed','Used'],
  ['quantityExpired','Expired'],['otherLosses','Other losses'],['stockAtEnd','Stock at hand'],['stockoutDays','Stockout days']
] as const;
const emptyLine = (section: EpiLine['section'], itemLabel: string): EpiLine => ({
  section, itemKey: itemLabel.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''),
  itemLabel, beginningBalance:'', quantityReceived:'', quantityUsed:'', dosesOpened:'',
  vvmStatusChange:'', quantityExpired:'', otherLosses:'', stockAtEnd:'', stockoutDays:''
});
const toInput = (value: unknown) => value === null || value === undefined ? '' : String(value);
const lineFrom = (section: EpiLine['section'], label: string, source?: any): EpiLine => ({
  ...emptyLine(section,label),
  ...(source ? Object.fromEntries(['beginningBalance','quantityReceived','quantityUsed','dosesOpened','vvmStatusChange','quantityExpired','otherLosses','stockAtEnd','stockoutDays'].map(k => [k,toInput(source[k])])) : {})
});
export default function EPIMonthlyStockReturnEditor({ from, to }: { from: string; to: string }) {
  const { success, error: toastError } = useToast();
  const [lines,setLines] = useState<EpiLine[]>([]);
  const [notes,setNotes] = useState('');
  const [facility,setFacility] = useState('Fuo Community Hospital');
  const [loading,setLoading] = useState(false);
  const [saving,setSaving] = useState(false);
  const [hasSaved,setHasSaved] = useState(false);
  const period = useMemo(() => ({ periodStart: from, periodEnd: to }),[from,to]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get('/immunization/epi-monthly-returns',{params:{from,to}})
      .then(({data}) => {
        if (!alive) return;
        const saved = data?.data;
        const existing = new Map((saved?.lines || []).map((x:any) => [x.section+':'+x.itemKey,x]));
        setLines([
          ...vaccineItems.map(label => lineFrom('vaccine_stock',label,existing.get('vaccine_stock:'+emptyLine('vaccine_stock',label).itemKey))),
          ...commodityItems.map(label => lineFrom('other_commodity',label,existing.get('other_commodity:'+emptyLine('other_commodity',label).itemKey)))
        ]);
        setNotes(saved?.notes || ''); setFacility(saved?.facility || 'Fuo Community Hospital'); setHasSaved(Boolean(saved));
      })
      .catch((e:any) => { if (alive) toastError(e.response?.data?.message || 'Unable to load monthly stock return.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  },[from,to,toastError]);
  const update = (index:number,key:keyof EpiLine,value:string) => setLines(current => current.map((line,i) => i===index ? {...line,[key]:value} : line));
  const save = async () => {
    const fields = ['beginningBalance','quantityReceived','quantityUsed','dosesOpened','vvmStatusChange','quantityExpired','otherLosses','stockAtEnd','stockoutDays'] as const;
    for (const line of lines) for (const field of fields) {
      if (line[field] !== '' && (!/^\\d+$/.test(line[field]) || Number(line[field]) < 0)) {
        toastError(line.itemLabel+': enter a non-negative whole number or leave the field blank.'); return;
      }
      if (field === 'stockoutDays' && line[field] !== '' && Number(line[field]) > 31) {
        toastError(line.itemLabel+': stockout days cannot exceed 31.'); return;
      }
    }
    setSaving(true);
    try {
      await api.put('/immunization/epi-monthly-returns',{
        ...period, facility, notes,
        lines: lines.map(line => Object.fromEntries(Object.entries(line).map(([k,v]) => [k, ['section','itemKey','itemLabel','notes'].includes(k) ? v : v === '' ? null : Number(v)])))
      });
      setHasSaved(true); success('Monthly EPI stock return saved.');
    } catch(e:any) { toastError(e.response?.data?.message || 'Unable to save monthly EPI stock return.'); }
    finally { setSaving(false); }
  };
  const renderTable = (section:EpiLine['section'], fields:readonly (readonly [keyof EpiLine,string])[]) => {
    const rows = lines.map((line,index)=>({line,index})).filter(x=>x.line.section===section);
    return <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-xs border-collapse">
      <thead><tr><th className="sticky left-0 bg-[var(--bg-main)] px-3 py-2 text-left">Vaccine / commodity</th>{fields.map(([key,label])=><th key={key} className="px-2 py-2 text-right text-[10px] text-[var(--text-tertiary)]">{label}</th>)}</tr></thead>
      <tbody>{rows.map(({line,index})=><tr key={line.itemKey} className="border-t border-[var(--border-color)]">
        <td className="sticky left-0 bg-[var(--bg-card)] px-3 py-2 font-medium text-[var(--text-primary)]">{line.itemLabel}</td>
        {fields.map(([key])=><td key={key} className="px-1 py-1"><input aria-label={line.itemLabel+' '+key} inputMode="numeric" type="number" min="0" max={key==='stockoutDays'?31:undefined} value={line[key] as string} onChange={e=>update(index,key,e.target.value)} className={INPUT+' w-20 text-right'} /></td>)}
      </tr>)}</tbody>
    </table></div>;
  };
  return <Card title="Vaccine stock and other commodities" description="Enter figures from the monthly stock cards and physical counts. Blank means not recorded; enter 0 only when the verified figure is zero." padded={false}>
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs text-[var(--text-secondary)]">Reporting period from<input readOnly value={from} className={INPUT+' mt-1 w-full opacity-80'} /></label>
        <label className="text-xs text-[var(--text-secondary)]">Reporting period to<input readOnly value={to} className={INPUT+' mt-1 w-full opacity-80'} /></label>
        <label className="text-xs text-[var(--text-secondary)]">Facility<input value={facility} onChange={e=>setFacility(e.target.value)} className={INPUT+' mt-1 w-full'} /></label>
      </div>
      <div><h4 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Status and utilization of vaccine stocks</h4>{renderTable('vaccine_stock',numericFields)}</div>
      <div><h4 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Other commodities</h4>{renderTable('other_commodity',commodityFields)}</div>
      <label className="block text-xs text-[var(--text-secondary)]">Notes / source of verification<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className={INPUT+' mt-1 w-full'} placeholder="e.g. checked against vaccine stock cards and physical count" /></label>
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-[var(--text-tertiary)]">{loading?'Loading saved figures…':hasSaved?'Saved monthly return loaded.':'No saved monthly return for this period yet.'}</span><Button onClick={save} disabled={loading||saving}>{saving?'Saving…':'Save stock and commodity return'}</Button></div>
    </div>
  </Card>;
}
