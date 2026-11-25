/**
 * GHS / DHIMS2 "Monthly Family Planning Returns" data entry form.
 *   1. Commodity logistics (balances, receipts, issues, prices, cedis)
 *   2. Types of clients (new / continuing acceptors and visits by age)
 *   3. Marital status of acceptors by age, counselled only
 *
 * Pure builder. Stock figures come from the stock ledger, client figures from
 * FamilyPlanningService rows. Anything the system cannot know is flagged n/c.
 */
import { AGE_GROUPS, ageGroup, FormATable, FormASection } from './formA';

type Kind = 'stock' | 'procedure' | 'na';
interface Commodity {
  key: string; label: string; price: number; priceLabel: string; kind: Kind;
  methods: string[];            // FPMethod values that map to this row
  stockKeys: string[];          // lower-case name fragments of the stock item
  group?: string;
}

// Order, labels and MoH unit prices exactly as on the form.
export const FP_COMMODITIES: Commodity[] = [
  { key: 'male_condom', label: 'MALE CONDOM (LATEX)', price: 0.1, priceLabel: '0.1/3pieces', kind: 'stock', methods: ['condom_male'], stockKeys: ['male condom', 'condom'] },
  { key: 'female_condom', label: 'FEMALE CONDOM', price: 0.03, priceLabel: '0.03/piece', kind: 'stock', methods: ['condom_female'], stockKeys: ['female condom'] },
  { key: 'jadelle', label: 'LEVONORGESTREL 75 mg 2 ROD (JADELLE)', price: 2, priceLabel: '2.0/piece', kind: 'stock', methods: ['implant_jadelle'], stockKeys: ['jadelle', 'levonorgestrel 75'] },
  { key: 'implanon', label: 'ETONOGESTREL 68mg 1 ROD (IMPLANON NXT)', price: 2, priceLabel: '2.0/piece', kind: 'stock', methods: ['implant_implanon'], stockKeys: ['implanon', 'etonogestrel'] },
  { key: 'zarin', label: 'SINO-IMPLANT (ZARIN)', price: 2, priceLabel: '2.0/piece', kind: 'stock', methods: [], stockKeys: ['zarin', 'sino-implant', 'sino implant'] },
  { key: 'cycle_beads', label: 'NATURAL – CYCLE BEADS', price: 1, priceLabel: '1.0/piece', kind: 'stock', methods: ['calendar'], stockKeys: ['cycle bead'] },
  { key: 'depo', label: 'DMPA 150 mg (DEPO PROVERA)', price: 0.5, priceLabel: '0.5/dose', kind: 'stock', methods: ['injectable_dmpa'], stockKeys: ['depo', 'dmpa', 'medroxyprogesterone'] },
  { key: 'sayana_admin', label: 'DMPA-SC (SAYANA PRESS) – PROVIDER ADMIN', price: 0.5, priceLabel: '0.5/dose', kind: 'stock', methods: [], stockKeys: ['sayana'] },
  { key: 'sayana_self', label: 'DMPA-SC (SAYANA PRESS) – SELF-INJECT', price: 0.5, priceLabel: '0.5/dose', kind: 'na', methods: [], stockKeys: [] },
  { key: 'cic', label: 'CIC (NORIGYNON)', price: 0.5, priceLabel: '0.5/dose', kind: 'stock', methods: ['injectable_net_en'], stockKeys: ['norigynon', 'cyclofem'] },
  { key: 'copper_t', label: 'COPPER T Cu380A INTRAUTERINE DEVICE', price: 2, priceLabel: '2.0/unit', kind: 'stock', methods: ['iud_copper'], stockKeys: ['copper t', 'tcu380', 'cu380', 'iucd', 'iud'] },
  { key: 'lng_ius', label: 'LEVONORGESTREL INTRA-UTERINE SYSTEM (LNG/IUS)', price: 2, priceLabel: '2.0/cycle', kind: 'stock', methods: ['iud_hormonal'], stockKeys: ['lng/ius', 'mirena', 'intra-uterine system', 'intrauterine system'] },
  { key: 'cs_btl', label: 'C/S BTL', price: 10, priceLabel: '10', kind: 'procedure', methods: [], stockKeys: [] },
  { key: 'btl', label: 'BTL', price: 10, priceLabel: '10', kind: 'procedure', methods: ['female_sterilization'], stockKeys: [] },
  { key: 'vasectomy', label: 'VASECTOMY', price: 10, priceLabel: '10', kind: 'procedure', methods: ['male_sterilization'], stockKeys: [] },
  { key: 'lam', label: 'LAM', price: 0, priceLabel: '', kind: 'na', methods: ['lam'], stockKeys: [] },
  { key: 'micro_g', label: 'ETHINYLESTRADIOL/IRON/LEVONORGESTREL 0.03/75/0.15 mg (MICRO G)', price: 0.2, priceLabel: '0.2/cycle', kind: 'stock', methods: ['pill_coc'], stockKeys: ['micro g', 'microgynon', 'ethinylestradiol', 'combined oral'] },
  { key: 'ecp', label: 'LEVONORGESTREL 0.75 mg (ALL EMERGENCY CONTRACEPTIVE PILLS)', price: 2, priceLabel: '2.0/pack', kind: 'stock', methods: ['emergency_contraception'], stockKeys: ['emergency', 'postinor', 'levonorgestrel 0.75', 'levonorgestrel 1.5'] },
  { key: 'microlut', label: 'LEVONORGESTREL 30mcg (MICROLUT)', price: 0.2, priceLabel: '0.2/cycle', kind: 'stock', methods: ['pill_pop'], stockKeys: ['microlut', 'levonorgestrel 30', 'progestin'] },
];

const OTHER_ROW = 'OTHER METHODS (not on the DHIMS2 form)';
const OTHER_METHODS = ['withdrawal', 'other_traditional'];
const GHS_SUPPLIER = /\bghs\b|ghana health|\brms\b|\bcms\b|\bmoh\b|ministry|central medical|regional medical/i;

const lc = (v: any) => String(v ?? '').toLowerCase();
const n = (v: any) => (v == null ? 0 : Number(v) || 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

export interface FPReturnsInputs {
  services: any[];       // FamilyPlanningService + patient { dateOfBirth, maritalStatus }
  stockItems: any[];     // StockItem (id, name, supplier, currentStock)
  transactions: any[];   // StockTransaction up to period end (all history needed for balances) with Invoice.supplierName
  start: Date;
  end: Date;
}

function matchStock(items: any[]) {
  const map = new Map<string, any[]>();
  const used = new Set<string>();
  FP_COMMODITIES.forEach(c => {
    if (c.kind !== 'stock') return;
    const found = items.filter(i => !used.has(i.id) && c.stockKeys.some(k => lc(i.name).includes(k))
      && !(c.key === 'male_condom' && lc(i.name).includes('female')));
    found.forEach(i => used.add(i.id));
    map.set(c.key, found);
  });
  return map;
}

export function buildFPReturns(inp: FPReturnsInputs) {
  const { services, stockItems, transactions, start, end } = inp;
  const notCaptured: string[] = [];

  // ───────── 1. Commodity logistics ─────────
  const stockMap = matchStock(stockItems);
  const txByItem = new Map<string, any[]>();
  transactions.forEach(t => { (txByItem.get(t.stockItemId) ?? txByItem.set(t.stockItemId, []).get(t.stockItemId)!).push(t); });

  const logisticsRows = FP_COMMODITIES.map(c => {
    if (c.kind === 'na') {
      return { label: c.label, values: Array(13).fill(''), captured: true, note: 'not reported' } as any;
    }
    const zero = { begin: 0, recG: 0, recO: 0, issG: 0, issO: 0, loss: 0, tout: 0, end: 0 };
    const f = { ...zero };
    if (c.kind === 'stock') {
      (stockMap.get(c.key) ?? []).forEach(item => {
        const isGhs = GHS_SUPPLIER.test(item.supplier ?? '');
        const txs = (txByItem.get(item.id) ?? []).sort((a, b) => +new Date(a.transactionDate) - +new Date(b.transactionDate));
        let rec = 0, iss = 0, loss = 0, tout = 0;
        txs.filter(t => new Date(t.transactionDate) >= start && new Date(t.transactionDate) <= end).forEach(t => {
          const q = Math.abs(n(t.quantity));
          if (t.transactionType === 'purchase') {
            const g = GHS_SUPPLIER.test(t.Invoice?.supplierName ?? '') || (!t.Invoice && isGhs);
            if (g) f.recG += q; else f.recO += q;
            rec += q;
          } else if (t.transactionType === 'sale' || t.transactionType === 'requisition') {
            if (isGhs) f.issG += q; else f.issO += q;
            iss += q;
          } else if (t.transactionType === 'transfer_out') { f.tout += q; tout += q; }
          else if (t.transactionType === 'adjustment' && /expir|damag|loss|lost|wast|demonstrat|spoil/i.test(`${t.reference ?? ''} ${t.notes ?? ''}`)) { f.loss += q; loss += q; }
        });
        // ending balance = balance after the last movement on or before period end
        const upto = txs.filter(t => new Date(t.transactionDate) <= end);
        const endBal = upto.length ? n(upto[upto.length - 1].balanceAfter) : (txs.length ? 0 : n(item.currentStock));
        // beginning balance is derived so the row always reconciles: end = begin + received − issued − loss − transfer
        const beginBal = Math.max(0, endBal - rec + iss + loss + tout);
        f.begin += beginBal; f.end += endBal;
      });
    } else {
      // procedures: nothing is stocked; counted as services below
    }
    let recT = f.recG + f.recO, issT = f.issG + f.issO;
    let collected = 0;
    if (c.kind === 'stock') collected = r2(f.issG * c.price);
    else {
      const cnt = services.filter(s => c.methods.includes(s.method)).length;
      collected = r2(cnt * c.price);
      issT = cnt;
    }
    const retained = r2(collected * 0.5);
    return {
      label: c.label,
      values: c.kind === 'stock'
        ? [f.begin, f.recG, f.recO, recT, f.issG, f.issO, issT, f.loss, f.tout, f.end, c.priceLabel, collected, retained]
        : ['', '', '', '', '', '', issT, '', '', '', c.priceLabel, collected, retained],
      captured: true,
      note: c.kind === 'stock' && (stockMap.get(c.key) ?? []).length === 0 ? 'no matching stock item' : undefined,
    } as any;
  });

  const logistics: FormATable = {
    title: 'Commodity logistics',
    groups: [{ label: '', span: 1 }, { label: 'Received', span: 3 }, { label: 'Issued / Dispensed', span: 3 }, { label: '', span: 6 }],
    columns: ['1 Beginning balance', '2 GHS', '3 Other sources', '4 Total', '5 GHS', '6 Other sources', '7 Total', '8 Loss / demo / expired', '9 Transfer out', '10 Ending balance', '11 Unit price (GHS)', '12 Cedis collected', '13 Cedis retained (50%)'],
    rows: logisticsRows,
  };
  const unmatched = FP_COMMODITIES.filter(c => c.kind === 'stock' && !(stockMap.get(c.key) ?? []).length);
  if (unmatched.length) notCaptured.push(`No stock item found for: ${unmatched.map(c => c.label.split(' (')[0].replace(/ \d.*$/, '')).join('; ')} – their balances show 0 (stock names must contain the brand, e.g. "Jadelle")`);

  // ───────── 2. Types of clients ─────────
  const rowOfMethod = (m: string): string => FP_COMMODITIES.find(c => c.methods.includes(m))?.key ?? (OTHER_METHODS.includes(m) ? 'other' : 'other');
  const blank = () => ({ new: Object.fromEntries(AGE_GROUPS.map(a => [a, 0])) as Record<string, number>, cont: Object.fromEntries(AGE_GROUPS.map(a => [a, 0])) as Record<string, number>, visit: Object.fromEntries(AGE_GROUPS.map(a => [a, 0])) as Record<string, number>, contSet: new Map<string, Set<string>>() });
  const acc = new Map<string, ReturnType<typeof blank>>();
  [...FP_COMMODITIES.map(c => c.key), 'other'].forEach(k => acc.set(k, blank()));
  const seenCont = new Set<string>();
  services.forEach(s => {
    const g = ageGroup(s.patient?.dateOfBirth, s.serviceDate);
    if (!g) return;
    const a = acc.get(rowOfMethod(s.method))!;
    if (s.isNewAcceptor) a.new[g]++;
    else {
      a.visit[g]++;                                           // every return visit
      const key = `${rowOfMethod(s.method)}|${s.patientId}`;  // continuing acceptor counted once per method
      if (!seenCont.has(key)) { seenCont.add(key); a.cont[g]++; }
    }
  });
  const sum = (o: Record<string, number>) => AGE_GROUPS.reduce((t, g) => t + o[g], 0);
  const clientRows = [...FP_COMMODITIES.map(c => ({ key: c.key, label: c.label, na: c.kind === 'na' && c.key === 'sayana_self' })), { key: 'other', label: OTHER_ROW, na: false }]
    .filter(r => r.key !== 'other' || sum(acc.get('other')!.new) + sum(acc.get('other')!.cont) + sum(acc.get('other')!.visit) > 0)
    .map(r => {
      const a = acc.get(r.key)!;
      return { label: r.label, values: [...AGE_GROUPS.map(g => a.new[g]), sum(a.new), ...AGE_GROUPS.map(g => a.cont[g]), sum(a.cont), ...AGE_GROUPS.map(g => a.visit[g]), sum(a.visit)] };
    });
  const ageCols = [...AGE_GROUPS.map(String), 'Total'];
  const clients: FormATable = {
    title: 'Types of clients',
    groups: [{ label: 'New acceptors', span: 7 }, { label: 'Continuing acceptors', span: 7 }, { label: 'Visits', span: 7 }],
    columns: [...ageCols.map(c => (c === 'Total' ? 'Total' : c)), ...ageCols, ...ageCols],
    rows: clientRows,
  };

  // ───────── 3. Marital status ─────────
  const marital = (v: any) => {
    const m = lc(v);
    if (!m) return null;
    if (/never|single|unmarried/.test(m)) return 0;
    if (/cohab|co-hab|living together/.test(m)) return 2;
    if (/divorc|separat/.test(m)) return 3;
    if (/widow/.test(m)) return 4;
    if (/married/.test(m)) return 1;
    return null;
  };
  const mt: Record<string, number[]> = Object.fromEntries(AGE_GROUPS.map(a => [a, [0, 0, 0, 0, 0, 0]]));
  let maritalKnown = 0, acceptors = 0;
  // an acceptor (new or continuing) counted once for the month
  const seenP = new Set<string>();
  services.forEach(s => {
    if (seenP.has(s.patientId)) return;
    seenP.add(s.patientId);
    const g = ageGroup(s.patient?.dateOfBirth, s.serviceDate);
    if (!g) return;
    acceptors++;
    const m = marital(s.patient?.maritalStatus);
    if (m != null) { mt[g][m]++; maritalKnown++; }
    mt[g][5]++;
  });
  const colTot = [0, 1, 2, 3, 4, 5].map(i => AGE_GROUPS.reduce((t, g) => t + mt[g][i], 0));
  const maritalT: FormATable = {
    title: 'Marital status (new and continuing acceptors)',
    columns: ['Never married', 'Married', 'Co-habiting', 'Divorced', 'Widow(er)', 'Total', 'Counselled only'],
    rows: [
      ...AGE_GROUPS.map(g => ({ label: `${g} years`, values: [...mt[g], 'n/c'] })),
      { label: 'Total', values: [...colTot, 'n/c'] },
    ],
  };
  if (acceptors > 0 && maritalKnown < acceptors) notCaptured.push(`Marital status recorded for ${maritalKnown} of ${acceptors} acceptors (patient registration does not capture it yet)`);
  notCaptured.push(
    'Counselled only (no way to record a counselling-only visit)',
    'Sayana Press self-inject / provider-admin split',
    'C/S BTL vs BTL (all sterilisations are counted under BTL)',
    'GHS vs other-source split is inferred from the supplier name',
    'Postpartum/post-abortion FP flags are not linked to a specific delivery/abortion record, so cross-record validation is not yet possible',
  );

  const sections: FormASection[] = [
    { id: 'logistics', title: 'Commodity Logistics', tables: [logistics] },
    { id: 'clients', title: 'Types of Clients', tables: [clients] },
    { id: 'marital', title: 'Marital Status & Counselling', tables: [maritalT] },
  ];
  return { sections, notCaptured };
}
