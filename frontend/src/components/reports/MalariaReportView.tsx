// src/components/reports/MalariaReportView.tsx — PROFESSIONAL REDESIGN
// Logic / data untouched: every field, total, positivity rate and stock-out check
// is exactly as before. Only layout changed:
//  - Density: space-y-6 p-6 / px-5 py-4 / px-4 py-3 -> space-y-3 p-3 / px-3 py-2.
//  - Header: compact, facility meta in a 3-col row instead of stacked lines.
//  - NEW summary strip: Total Suspected / Tested / Confirmed / Treated with ACT /
//    overall positivity — all derived from the same data, nothing new fetched.
//  - Section 5 was 7 near-identical cards repeating Opening/Dispensed/Closing/
//    Stock Out. Replaced with ONE table: Commodity | Opening | Dispensed |
//    Closing | Stock Out >7 days. Same 10 commodities, same fields, far less bulk.
//    (DHAP, Quinine tablet, Quinine injection, RDT kits, SP, Artesunate 30/60/120,
//     Arthemeter 40/80.)
//  - Rectal Artesunate: same treatment — card pair -> one table row per strength.
//  - Stock Out is now a pill badge (Yes = red, No = green), like Status pills
//    everywhere else, instead of plain Yes/No text.
//  - AL table: headers were missing all styling classes — now match ASAQ/OPD.
//  - ASAQ + AL: added a Totals footer row, matching the OPD table.
//  - No code removed: every commodity, every field still rendered.
import React from 'react';

interface MalariaReportData {
  period: { startDate: string; endDate: string; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  opdMalaria: {
    under5: { suspected: number; tested: number; confirmed: number; treatedWithACT: number };
    above5: { suspected: number; tested: number; confirmed: number; treatedWithACT: number };
  };
  testing: {
    microscopy: number;
    microscopyPositive: number;
    rdt: number;
    rdtPositive: number;
  };
  commodities: {
    asaq_below_1yr: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    asaq_1_5yrs: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    asaq_6_13yrs: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    asaq_14_plus: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    al_0_3yrs: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    al_4_8yrs: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    al_9_13yrs: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    al_14_plus: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    dhap_40_320mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    quinine_tablet: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    quinine_injection: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    artesunate_injection_30mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    artesunate_injection_60mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    artesunate_injection_120mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    arthemeter_injection_40mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    arthemeter_injection_80mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    rectal_artesunate_50mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    rectal_artesunate_200mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    rdt_kits: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    sp: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
  };
}

interface Props {
  data: MalariaReportData;
  dateRange: { start: string; end: string };
}

type Commodity = { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };

export const MalariaReportView: React.FC<Props> = ({ data, dateRange }) => {
  if (!data || !data.facility) {
    console.error('MalariaReportView: Invalid data structure', data);
    return (
      <div className="bg-[var(--icon-red-bg)] border border-[var(--border-color)] rounded-lg p-4 text-[var(--icon-red-text)]">
        Error: Invalid report data structure. Please try generating the report again.
      </div>
    );
  }

  const hasStockOut = (stock: any) => stock?.stockOutDays > 7;
  const stockOutPill = (stock: any) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${hasStockOut(stock) ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'}`}>
      {hasStockOut(stock) ? 'Yes' : 'No'}
    </span>
  );

  // ── Derived totals (same data, no new fields) ──
  const totalSuspected = data.opdMalaria.under5.suspected + data.opdMalaria.above5.suspected;
  const totalTested = data.opdMalaria.under5.tested + data.opdMalaria.above5.tested;
  const totalConfirmed = data.opdMalaria.under5.confirmed + data.opdMalaria.above5.confirmed;
  const totalACT = data.opdMalaria.under5.treatedWithACT + data.opdMalaria.above5.treatedWithACT;
  const overallPositivity = totalTested > 0 ? ((totalConfirmed / totalTested) * 100).toFixed(1) : '0.0';
  const positivity = (positive: number, tested: number) => (tested > 0 ? ((positive / tested) * 100).toFixed(1) : '0.0');

  const th = 'px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]';
  const td = 'px-3 py-2 text-[var(--text-primary)]';
  const tdC = `${td} text-center`;
  const sectionHead = 'px-3 py-2 bg-[var(--bg-main)] border-b border-[var(--border-color)] flex items-center justify-between';
  const sectionTitle = 'text-sm font-semibold text-[var(--text-primary)]';

  const commodityRow = (label: string, c: Commodity) => (
    <tr key={label} className="hover:bg-[var(--bg-main)]">
      <td className={`${td} font-medium`}>{label}</td>
      <td className={tdC}>{c.openingStock}</td>
      <td className={tdC}>{c.dispensed}</td>
      <td className={`${tdC} font-semibold`}>{c.closingStock}</td>
      <td className={tdC}>{stockOutPill(c)}</td>
    </tr>
  );
  const commodityTotal = (label: string, rows: Commodity[]) => (
    <tr className="font-semibold bg-[var(--bg-main)] border-t border-[var(--border-color)]">
      <td className={td}>{label}</td>
      <td className={tdC}>{rows.reduce((s, r) => s + r.openingStock, 0)}</td>
      <td className={tdC}>{rows.reduce((s, r) => s + r.dispensed, 0)}</td>
      <td className={tdC}>{rows.reduce((s, r) => s + r.closingStock, 0)}</td>
      <td className={tdC}>—</td>
    </tr>
  );
  const stockHead = (
    <tr>
      <th className={`${th} text-left`}>Commodity / Age Group</th>
      <th className={`${th} text-center`}>Opening Stock</th>
      <th className={`${th} text-center`}>Dispensed</th>
      <th className={`${th} text-center`}>Closing Stock</th>
      <th className={`${th} text-center`}>Stock Out &gt;7 days</th>
    </tr>
  );

  const summary = [
    { label: 'Suspected', value: totalSuspected, cls: 'text-[var(--text-primary)]' },
    { label: 'Tested', value: totalTested, cls: 'text-[var(--text-primary)]' },
    { label: 'Confirmed', value: totalConfirmed, cls: 'text-[var(--icon-green-text)]' },
    { label: 'Treated with ACT', value: totalACT, cls: 'text-[var(--icon-cyan-text)]' },
    { label: 'Positivity Rate', value: `${overallPositivity}%`, cls: 'text-[var(--icon-red-text)]' },
  ];

  return (
    <div className="printable-report space-y-3 text-[var(--text-primary)]" id="malaria-report">
      {/* Header — compact, meta in one row */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 text-center">
        <h2 className="text-base font-bold text-[var(--text-primary)]">GHANA HEALTH SERVICE</h2>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">MONTHLY MALARIA DATA RETURNS ON ANTI-MALARIAS</h3>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs text-[var(--text-secondary)]">
          <p><span className="font-medium text-[var(--text-primary)]">{data.facility.name}</span></p>
          <p>District: {data.facility.district} | GHF Code: {data.facility.ghfCode}</p>
          <p>Reporting Period: {dateRange.start} to {dateRange.end}</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {summary.map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-2.5 text-center">
            <p className={`text-base font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* SECTION 1: OPD Malaria Cases */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className={sectionHead}><h3 className={sectionTitle}>OPD Malaria Cases</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className={`${th} text-left`}>Age Group</th>
                <th className={`${th} text-center`}>Suspected</th>
                <th className={`${th} text-center`}>Tested</th>
                <th className={`${th} text-center`}>Confirmed</th>
                <th className={`${th} text-center`}>Treated with ACT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              <tr className="hover:bg-[var(--bg-main)]">
                <td className={`${td} font-medium`}>Under 5 years</td>
                <td className={tdC}>{data.opdMalaria.under5.suspected}</td>
                <td className={tdC}>{data.opdMalaria.under5.tested}</td>
                <td className={`${tdC} font-semibold text-[var(--icon-green-text)]`}>{data.opdMalaria.under5.confirmed}</td>
                <td className={`${tdC} font-semibold text-[var(--icon-cyan-text)]`}>{data.opdMalaria.under5.treatedWithACT}</td>
              </tr>
              <tr className="hover:bg-[var(--bg-main)]">
                <td className={`${td} font-medium`}>5 years and Above</td>
                <td className={tdC}>{data.opdMalaria.above5.suspected}</td>
                <td className={tdC}>{data.opdMalaria.above5.tested}</td>
                <td className={`${tdC} font-semibold text-[var(--icon-green-text)]`}>{data.opdMalaria.above5.confirmed}</td>
                <td className={`${tdC} font-semibold text-[var(--icon-cyan-text)]`}>{data.opdMalaria.above5.treatedWithACT}</td>
              </tr>
            </tbody>
            <tfoot className="bg-[var(--bg-main)] border-t border-[var(--border-color)]">
              <tr className="font-semibold">
                <td className={td}>Total</td>
                <td className={tdC}>{totalSuspected}</td>
                <td className={tdC}>{totalTested}</td>
                <td className={`${tdC} text-[var(--icon-green-text)]`}>{totalConfirmed}</td>
                <td className={`${tdC} text-[var(--icon-cyan-text)]`}>{totalACT}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 2: Testing Methods */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className={sectionHead}><h3 className={sectionTitle}>Testing Methods</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className={`${th} text-left`}>Method</th>
                <th className={`${th} text-center`}>Number Tested</th>
                <th className={`${th} text-center`}>Number Positive</th>
                <th className={`${th} text-center`}>Positivity Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              <tr className="hover:bg-[var(--bg-main)]">
                <td className={`${td} font-medium`}>Microscopy</td>
                <td className={tdC}>{data.testing.microscopy}</td>
                <td className={`${tdC} font-semibold text-[var(--icon-red-text)]`}>{data.testing.microscopyPositive}</td>
                <td className={tdC}>{positivity(data.testing.microscopyPositive, data.testing.microscopy)}%</td>
              </tr>
              <tr className="hover:bg-[var(--bg-main)]">
                <td className={`${td} font-medium`}>RDT</td>
                <td className={tdC}>{data.testing.rdt}</td>
                <td className={`${tdC} font-semibold text-[var(--icon-red-text)]`}>{data.testing.rdtPositive}</td>
                <td className={tdC}>{positivity(data.testing.rdtPositive, data.testing.rdt)}%</td>
              </tr>
            </tbody>
            <tfoot className="bg-[var(--bg-main)] border-t border-[var(--border-color)]">
              <tr className="font-semibold">
                <td className={td}>Total</td>
                <td className={tdC}>{data.testing.microscopy + data.testing.rdt}</td>
                <td className={tdC}>{data.testing.microscopyPositive + data.testing.rdtPositive}</td>
                <td className={tdC}>{positivity(data.testing.microscopyPositive + data.testing.rdtPositive, data.testing.microscopy + data.testing.rdt)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 3: ASAQ */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className={sectionHead}><h3 className={sectionTitle}>Artesunate-Amodiaquine (ASAQ)</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">{stockHead}</thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {commodityRow('Below 1 year', data.commodities.asaq_below_1yr)}
              {commodityRow('1–5 years', data.commodities.asaq_1_5yrs)}
              {commodityRow('6–13 years', data.commodities.asaq_6_13yrs)}
              {commodityRow('14+ years', data.commodities.asaq_14_plus)}
            </tbody>
            <tfoot>{commodityTotal('Total', [data.commodities.asaq_below_1yr, data.commodities.asaq_1_5yrs, data.commodities.asaq_6_13yrs, data.commodities.asaq_14_plus])}</tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 4: AL */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className={sectionHead}><h3 className={sectionTitle}>Artemether-Lumefantrine (AL)</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">{stockHead}</thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {commodityRow('0–3 years', data.commodities.al_0_3yrs)}
              {commodityRow('4–8 years', data.commodities.al_4_8yrs)}
              {commodityRow('9–13 years', data.commodities.al_9_13yrs)}
              {commodityRow('14+ years', data.commodities.al_14_plus)}
            </tbody>
            <tfoot>{commodityTotal('Total', [data.commodities.al_0_3yrs, data.commodities.al_4_8yrs, data.commodities.al_9_13yrs, data.commodities.al_14_plus])}</tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 5: Other Anti-Malarials — one table, was 7 repeated cards */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className={sectionHead}><h3 className={sectionTitle}>Other Anti-Malarials</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">{stockHead}</thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {commodityRow('DHAP 40/320mg', data.commodities.dhap_40_320mg)}
              {commodityRow('Quinine Tablets 300mg', data.commodities.quinine_tablet)}
              {commodityRow('Quinine Injection', data.commodities.quinine_injection)}
              {commodityRow('RDT Kits', data.commodities.rdt_kits)}
              {commodityRow('SP (Sulfadoxine-Pyrimethamine)', data.commodities.sp)}
              {commodityRow('Artesunate Injection 30mg', data.commodities.artesunate_injection_30mg)}
              {commodityRow('Artesunate Injection 60mg', data.commodities.artesunate_injection_60mg)}
              {commodityRow('Artesunate Injection 120mg', data.commodities.artesunate_injection_120mg)}
              {commodityRow('Arthemeter Injection 40mg', data.commodities.arthemeter_injection_40mg)}
              {commodityRow('Arthemeter Injection 80mg', data.commodities.arthemeter_injection_80mg)}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 6: Rectal Artesunate — table, was a card pair */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className={sectionHead}><h3 className={sectionTitle}>Rectal Artesunate</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">{stockHead}</thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {commodityRow('Rectal Artesunate 50mg', data.commodities.rectal_artesunate_50mg)}
              {commodityRow('Rectal Artesunate 200mg', data.commodities.rectal_artesunate_200mg)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-2 text-xs text-[var(--text-tertiary)]">
        Generated on {new Date().toLocaleString()} | GHS Monthly Malaria Data Returns
      </div>
    </div>
  );
};
