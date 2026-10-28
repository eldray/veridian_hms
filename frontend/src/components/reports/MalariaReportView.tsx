// src/components/reports/MalariaReportView.tsx
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

export const MalariaReportView: React.FC<Props> = ({ data, dateRange }) => {
  // ✅ Add defensive check at the beginning
  if (!data || !data.facility) {
    console.error('MalariaReportView: Invalid data structure', data);
    return (
      <div className="bg-[var(--icon-red-bg)] border border-[var(--border-color)] rounded-lg p-4 text-[var(--icon-red-text)]">
        Error: Invalid report data structure. Please try generating the report again.
      </div>
    );
  }

  const hasStockOut = (stock: any) => stock?.stockOutDays > 7;

  return (
    <div className="printable-report space-y-6 text-[var(--text-primary)]" id="malaria-report">
      {/* Header */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6 text-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">GHANA HEALTH SERVICE</h2>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">MONTHLY MALARIA DATA RETURNS ON ANTI-MALARIAS</h3>
        <div className="mt-3 text-sm">
          <p className="font-medium">{data.facility.name}</p>
          <p className="text-[var(--text-secondary)]">District: {data.facility.district} | GHF Code: {data.facility.ghfCode}</p>
          <p className="text-[var(--text-secondary)] mt-1">Reporting Period: {dateRange.start} to {dateRange.end}</p>
        </div>
      </div>

      {/* SECTION 1: OPD Malaria Cases */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-4 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--text-primary)]">OPD Malaria Cases</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Age Group</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Suspected</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Tested</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Confirmed</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Treated with ACT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              <tr className="hover:bg-[var(--bg-main)]">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">Under 5 years</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{data.opdMalaria.under5.suspected}</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{data.opdMalaria.under5.tested}</td>
                <td className="px-4 py-3 text-center font-semibold text-[var(--icon-green-text)]">{data.opdMalaria.under5.confirmed}</td>
                <td className="px-4 py-3 text-center font-semibold text-[var(--icon-cyan-text)]">{data.opdMalaria.under5.treatedWithACT}</td>
              </tr>
              <tr className="hover:bg-[var(--bg-main)]">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">5 years and Above</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{data.opdMalaria.above5.suspected}</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{data.opdMalaria.above5.tested}</td>
                <td className="px-4 py-3 text-center font-semibold text-[var(--icon-green-text)]">{data.opdMalaria.above5.confirmed}</td>
                <td className="px-4 py-3 text-center font-semibold text-[var(--icon-cyan-text)]">{data.opdMalaria.above5.treatedWithACT}</td>
              </tr>
            </tbody>
            <tfoot className="bg-[var(--bg-main)] border-t">
              <tr className="font-semibold">
                <td className="px-4 py-3 text-[var(--text-primary)]">Total</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">
                  {data.opdMalaria.under5.suspected + data.opdMalaria.above5.suspected}
                </td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">
                  {data.opdMalaria.under5.tested + data.opdMalaria.above5.tested}
                </td>
                <td className="px-4 py-3 text-center text-[var(--icon-green-text)]">
                  {data.opdMalaria.under5.confirmed + data.opdMalaria.above5.confirmed}
                </td>
                <td className="px-4 py-3 text-center text-[var(--icon-cyan-text)]">
                  {data.opdMalaria.under5.treatedWithACT + data.opdMalaria.above5.treatedWithACT}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 2: Testing Methods */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-4 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--text-primary)]">Testing Methods</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Method</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Number Tested</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Number Positive</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Positivity Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              <tr className="hover:bg-[var(--bg-main)]">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">Microscopy</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{data.testing.microscopy}</td>
                <td className="px-4 py-3 text-center font-semibold text-[var(--icon-red-text)]">{data.testing.microscopyPositive}</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">
                  {data.testing.microscopy > 0 ? ((data.testing.microscopyPositive / data.testing.microscopy) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr className="hover:bg-[var(--bg-main)]">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">RDT</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{data.testing.rdt}</td>
                <td className="px-4 py-3 text-center font-semibold text-[var(--icon-red-text)]">{data.testing.rdtPositive}</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">
                  {data.testing.rdt > 0 ? ((data.testing.rdtPositive / data.testing.rdt) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Commodity Stock - ASAQ */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-4 bg-[var(--icon-cyan-bg)] border-b border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--icon-cyan-text)]">Artesunate-Amodiaquine (ASAQ)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Age Group</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Opening Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Dispensed</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Closing Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)]">Stock Out &gt;7 days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              <tr className="hover:bg-[var(--bg-main)]"><td className="px-4 py-3">Below 1 year</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_below_1yr.openingStock}</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_below_1yr.dispensed}</td>
                <td className="px-4 py-3 text-center font-semibold">{data.commodities.asaq_below_1yr.closingStock}</td>
                <td className="px-4 py-3 text-center">{hasStockOut(data.commodities.asaq_below_1yr) ? 'Yes' : 'No'}</td>
              </tr>
              <tr className="hover:bg-[var(--bg-main)]"><td className="px-4 py-3">1-5 years</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_1_5yrs.openingStock}</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_1_5yrs.dispensed}</td>
                <td className="px-4 py-3 text-center font-semibold">{data.commodities.asaq_1_5yrs.closingStock}</td>
                <td className="px-4 py-3 text-center">{hasStockOut(data.commodities.asaq_1_5yrs) ? 'Yes' : 'No'}</td>
               </tr>
              <tr className="hover:bg-[var(--bg-main)]"><td className="px-4 py-3">6-13 years</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_6_13yrs.openingStock}</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_6_13yrs.dispensed}</td>
                <td className="px-4 py-3 text-center font-semibold">{data.commodities.asaq_6_13yrs.closingStock}</td>
                <td className="px-4 py-3 text-center">{hasStockOut(data.commodities.asaq_6_13yrs) ? 'Yes' : 'No'}</td>
               </tr>
              <tr className="hover:bg-[var(--bg-main)]"><td className="px-4 py-3">14+ years</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_14_plus.openingStock}</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_14_plus.dispensed}</td>
                <td className="px-4 py-3 text-center font-semibold">{data.commodities.asaq_14_plus.closingStock}</td>
                <td className="px-4 py-3 text-center">{hasStockOut(data.commodities.asaq_14_plus) ? 'Yes' : 'No'}</td>
               </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: Commodity Stock - AL */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-4 bg-[var(--icon-green-bg)] border-b border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--icon-green-text)]">Artemether-Lumefantrine (AL)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b">
              <tr><th className="px-4 py-3 text-left">Age Group</th><th className="px-4 py-3 text-center">Opening Stock</th><th className="px-4 py-3 text-center">Dispensed</th><th className="px-4 py-3 text-center">Closing Stock</th><th className="px-4 py-3 text-center">Stock Out &gt;7 days</th></tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="px-4 py-3">0-3 years</td><td className="px-4 py-3 text-center">{data.commodities.al_0_3yrs.openingStock}</td><td className="px-4 py-3 text-center">{data.commodities.al_0_3yrs.dispensed}</td><td className="px-4 py-3 text-center">{data.commodities.al_0_3yrs.closingStock}</td><td className="px-4 py-3 text-center">{hasStockOut(data.commodities.al_0_3yrs) ? 'Yes' : 'No'}</td></tr>
              <tr><td className="px-4 py-3">4-8 years</td><td className="px-4 py-3 text-center">{data.commodities.al_4_8yrs.openingStock}</td><td className="px-4 py-3 text-center">{data.commodities.al_4_8yrs.dispensed}</td><td className="px-4 py-3 text-center">{data.commodities.al_4_8yrs.closingStock}</td><td className="px-4 py-3 text-center">{hasStockOut(data.commodities.al_4_8yrs) ? 'Yes' : 'No'}</td></tr>
              <tr><td className="px-4 py-3">9-13 years</td><td className="px-4 py-3 text-center">{data.commodities.al_9_13yrs.openingStock}</td><td className="px-4 py-3 text-center">{data.commodities.al_9_13yrs.dispensed}</td><td className="px-4 py-3 text-center">{data.commodities.al_9_13yrs.closingStock}</td><td className="px-4 py-3 text-center">{hasStockOut(data.commodities.al_9_13yrs) ? 'Yes' : 'No'}</td></tr>
              <tr><td className="px-4 py-3">14+ years</td><td className="px-4 py-3 text-center">{data.commodities.al_14_plus.openingStock}</td><td className="px-4 py-3 text-center">{data.commodities.al_14_plus.dispensed}</td><td className="px-4 py-3 text-center">{data.commodities.al_14_plus.closingStock}</td><td className="px-4 py-3 text-center">{hasStockOut(data.commodities.al_14_plus) ? 'Yes' : 'No'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: Other Anti-Malarials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DHAP */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="px-4 py-3 bg-[var(--icon-purple-bg)] border-b border-[var(--border-color)]"><h4 className="font-bold text-[var(--icon-purple-text)]">DHAP 40/320mg</h4></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.dhap_40_320mg.openingStock}</span></div>
            <div className="flex justify-between"><span>Dispensed:</span><span className="font-bold">{data.commodities.dhap_40_320mg.dispensed}</span></div>
            <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.dhap_40_320mg.closingStock}</span></div>
            <div className="flex justify-between"><span>Stock Out &gt;7 days:</span><span className={hasStockOut(data.commodities.dhap_40_320mg) ? 'text-[var(--icon-red-text)] font-bold' : 'text-[var(--icon-green-text)]'}>{hasStockOut(data.commodities.dhap_40_320mg) ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* Quinine Tablets */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="px-4 py-3 bg-[var(--icon-yellow-bg)] border-b border-[var(--border-color)]"><h4 className="font-bold text-[var(--icon-yellow-text)]">Quinine Tablets 300mg</h4></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.quinine_tablet.openingStock}</span></div>
            <div className="flex justify-between"><span>Dispensed:</span><span className="font-bold">{data.commodities.quinine_tablet.dispensed}</span></div>
            <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.quinine_tablet.closingStock}</span></div>
            <div className="flex justify-between"><span>Stock Out &gt;7 days:</span><span className={hasStockOut(data.commodities.quinine_tablet) ? 'text-[var(--icon-red-text)] font-bold' : 'text-[var(--icon-green-text)]'}>{hasStockOut(data.commodities.quinine_tablet) ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* Quinine Injection */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="px-4 py-3 bg-[var(--icon-orange-bg)] border-b border-[var(--border-color)]"><h4 className="font-bold text-[var(--icon-orange-text)]">Quinine Injection</h4></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.quinine_injection.openingStock}</span></div>
            <div className="flex justify-between"><span>Dispensed:</span><span className="font-bold">{data.commodities.quinine_injection.dispensed}</span></div>
            <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.quinine_injection.closingStock}</span></div>
            <div className="flex justify-between"><span>Stock Out &gt;7 days:</span><span className={hasStockOut(data.commodities.quinine_injection) ? 'text-[var(--icon-red-text)] font-bold' : 'text-[var(--icon-green-text)]'}>{hasStockOut(data.commodities.quinine_injection) ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* RDT Kits */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="px-4 py-3 bg-[var(--icon-red-bg)] border-b border-[var(--border-color)]"><h4 className="font-bold text-[var(--icon-red-text)]">RDT Kits</h4></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.rdt_kits.openingStock}</span></div>
            <div className="flex justify-between"><span>Dispensed:</span><span className="font-bold">{data.commodities.rdt_kits.dispensed}</span></div>
            <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.rdt_kits.closingStock}</span></div>
            <div className="flex justify-between"><span>Stock Out &gt;7 days:</span><span className={hasStockOut(data.commodities.rdt_kits) ? 'text-[var(--icon-red-text)] font-bold' : 'text-[var(--icon-green-text)]'}>{hasStockOut(data.commodities.rdt_kits) ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* SP */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="px-4 py-3 bg-[var(--icon-green-bg)] border-b border-[var(--border-color)]"><h4 className="font-bold text-[var(--icon-green-text)]">SP (Sulfadoxine-Pyrimethamine)</h4></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.sp.openingStock}</span></div>
            <div className="flex justify-between"><span>Dispensed:</span><span className="font-bold">{data.commodities.sp.dispensed}</span></div>
            <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.sp.closingStock}</span></div>
            <div className="flex justify-between"><span>Stock Out &gt;7 days:</span><span className={hasStockOut(data.commodities.sp) ? 'text-[var(--icon-red-text)] font-bold' : 'text-[var(--icon-green-text)]'}>{hasStockOut(data.commodities.sp) ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* Artesunate Injections Group */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="px-4 py-3 bg-[var(--icon-cyan-bg)] border-b border-[var(--border-color)]"><h4 className="font-bold text-[var(--icon-cyan-text)]">Artesunate Injection</h4></div>
          <div className="p-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>30mg - Opening Stock:</span><span>{data.commodities.artesunate_injection_30mg.openingStock}</span></div>
            <div className="flex justify-between"><span>30mg - Dispensed:</span><span>{data.commodities.artesunate_injection_30mg.dispensed}</span></div>
            <div className="flex justify-between"><span>30mg - Closing Stock:</span><span className="font-bold">{data.commodities.artesunate_injection_30mg.closingStock}</span></div>
            <div className="border-t my-2"></div>
            <div className="flex justify-between"><span>60mg - Opening Stock:</span><span>{data.commodities.artesunate_injection_60mg.openingStock}</span></div>
            <div className="flex justify-between"><span>60mg - Dispensed:</span><span>{data.commodities.artesunate_injection_60mg.dispensed}</span></div>
            <div className="flex justify-between"><span>60mg - Closing Stock:</span><span className="font-bold">{data.commodities.artesunate_injection_60mg.closingStock}</span></div>
            <div className="border-t my-2"></div>
            <div className="flex justify-between"><span>120mg - Opening Stock:</span><span>{data.commodities.artesunate_injection_120mg.openingStock}</span></div>
            <div className="flex justify-between"><span>120mg - Dispensed:</span><span>{data.commodities.artesunate_injection_120mg.dispensed}</span></div>
            <div className="flex justify-between"><span>120mg - Closing Stock:</span><span className="font-bold">{data.commodities.artesunate_injection_120mg.closingStock}</span></div>
          </div>
        </div>

        {/* Arthemeter Injections */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="px-4 py-3 bg-[var(--icon-cyan-bg)] border-b border-[var(--border-color)]"><h4 className="font-bold text-[var(--icon-cyan-text)]">Arthemeter Injection</h4></div>
          <div className="p-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>40mg - Opening Stock:</span><span>{data.commodities.arthemeter_injection_40mg.openingStock}</span></div>
            <div className="flex justify-between"><span>40mg - Dispensed:</span><span>{data.commodities.arthemeter_injection_40mg.dispensed}</span></div>
            <div className="flex justify-between"><span>40mg - Closing Stock:</span><span className="font-bold">{data.commodities.arthemeter_injection_40mg.closingStock}</span></div>
            <div className="border-t my-2"></div>
            <div className="flex justify-between"><span>80mg - Opening Stock:</span><span>{data.commodities.arthemeter_injection_80mg.openingStock}</span></div>
            <div className="flex justify-between"><span>80mg - Dispensed:</span><span>{data.commodities.arthemeter_injection_80mg.dispensed}</span></div>
            <div className="flex justify-between"><span>80mg - Closing Stock:</span><span className="font-bold">{data.commodities.arthemeter_injection_80mg.closingStock}</span></div>
          </div>
        </div>
      </div>

      {/* SECTION 6: Rectal Artesunate */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-4 bg-[var(--icon-red-bg)] border-b border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--icon-red-text)]">Rectal Artesunate</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-2">50mg</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.rectal_artesunate_50mg.openingStock}</span></div>
              <div className="flex justify-between"><span>Dispensed:</span><span>{data.commodities.rectal_artesunate_50mg.dispensed}</span></div>
              <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.rectal_artesunate_50mg.closingStock}</span></div>
            </div>
          </div>
          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-2">200mg</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.rectal_artesunate_200mg.openingStock}</span></div>
              <div className="flex justify-between"><span>Dispensed:</span><span>{data.commodities.rectal_artesunate_200mg.dispensed}</span></div>
              <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.rectal_artesunate_200mg.closingStock}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-[var(--text-tertiary)]">
        Generated on {new Date().toLocaleString()} | GHS Monthly Malaria Data Returns
      </div>
    </div>
  );
};