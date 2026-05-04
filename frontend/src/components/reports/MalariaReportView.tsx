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
  if (!data) return null;

  const hasStockOut = (stock: any) => stock.stockOutDays > 7;

  return (
    <div className="space-y-6" id="malaria-report">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">GHANA HEALTH SERVICE</h2>
        <h3 className="text-lg font-semibold text-gray-700 mt-1">MONTHLY MALARIA DATA RETURNS ON ANTI-MALARIAS</h3>
        <div className="mt-3 text-sm">
          <p className="font-medium">{data.facility.name}</p>
          <p className="text-gray-500">District: {data.facility.district} | GHF Code: {data.facility.ghfCode}</p>
          <p className="text-gray-500 mt-1">Reporting Period: {dateRange.start} to {dateRange.end}</p>
        </div>
      </div>

      {/* SECTION 1: OPD Malaria Cases */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">OPD Malaria Cases</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Age Group</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Suspected</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tested</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Confirmed</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Treated with ACT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">Under 5 years</td>
                <td className="px-4 py-3 text-center text-gray-700">{data.opdMalaria.under5.suspected}</td>
                <td className="px-4 py-3 text-center text-gray-700">{data.opdMalaria.under5.tested}</td>
                <td className="px-4 py-3 text-center font-semibold text-green-600">{data.opdMalaria.under5.confirmed}</td>
                <td className="px-4 py-3 text-center font-semibold text-blue-600">{data.opdMalaria.under5.treatedWithACT}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">5 years and Above</td>
                <td className="px-4 py-3 text-center text-gray-700">{data.opdMalaria.above5.suspected}</td>
                <td className="px-4 py-3 text-center text-gray-700">{data.opdMalaria.above5.tested}</td>
                <td className="px-4 py-3 text-center font-semibold text-green-600">{data.opdMalaria.above5.confirmed}</td>
                <td className="px-4 py-3 text-center font-semibold text-blue-600">{data.opdMalaria.above5.treatedWithACT}</td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr className="font-semibold">
                <td className="px-4 py-3 text-gray-900">Total</td>
                <td className="px-4 py-3 text-center text-gray-900">
                  {data.opdMalaria.under5.suspected + data.opdMalaria.above5.suspected}
                </td>
                <td className="px-4 py-3 text-center text-gray-900">
                  {data.opdMalaria.under5.tested + data.opdMalaria.above5.tested}
                </td>
                <td className="px-4 py-3 text-center text-green-700">
                  {data.opdMalaria.under5.confirmed + data.opdMalaria.above5.confirmed}
                </td>
                <td className="px-4 py-3 text-center text-blue-700">
                  {data.opdMalaria.under5.treatedWithACT + data.opdMalaria.above5.treatedWithACT}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 2: Testing Methods */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Testing Methods</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Method</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Number Tested</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Number Positive</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Positivity Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">Microscopy</td>
                <td className="px-4 py-3 text-center text-gray-700">{data.testing.microscopy}</td>
                <td className="px-4 py-3 text-center font-semibold text-red-600">{data.testing.microscopyPositive}</td>
                <td className="px-4 py-3 text-center text-gray-700">
                  {data.testing.microscopy > 0 ? ((data.testing.microscopyPositive / data.testing.microscopy) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">RDT</td>
                <td className="px-4 py-3 text-center text-gray-700">{data.testing.rdt}</td>
                <td className="px-4 py-3 text-center font-semibold text-red-600">{data.testing.rdtPositive}</td>
                <td className="px-4 py-3 text-center text-gray-700">
                  {data.testing.rdt > 0 ? ((data.testing.rdtPositive / data.testing.rdt) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Commodity Stock - ASAQ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 bg-blue-50 border-b border-blue-200">
          <h3 className="font-bold text-blue-800">Artesunate-Amodiaquine (ASAQ)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Age Group</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Opening Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Dispensed</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Closing Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Stock Out &gt;7 days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50"><td className="px-4 py-3">Below 1 year</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_below_1yr.openingStock}</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_below_1yr.dispensed}</td>
                <td className="px-4 py-3 text-center font-semibold">{data.commodities.asaq_below_1yr.closingStock}</td>
                <td className="px-4 py-3 text-center">{hasStockOut(data.commodities.asaq_below_1yr) ? 'Yes' : 'No'}</td>
              </tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-3">1-5 years</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_1_5yrs.openingStock}</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_1_5yrs.dispensed}</td>
                <td className="px-4 py-3 text-center font-semibold">{data.commodities.asaq_1_5yrs.closingStock}</td>
                <td className="px-4 py-3 text-center">{hasStockOut(data.commodities.asaq_1_5yrs) ? 'Yes' : 'No'}</td>
              </tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-3">6-13 years</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_6_13yrs.openingStock}</td>
                <td className="px-4 py-3 text-center">{data.commodities.asaq_6_13yrs.dispensed}</td>
                <td className="px-4 py-3 text-center font-semibold">{data.commodities.asaq_6_13yrs.closingStock}</td>
                <td className="px-4 py-3 text-center">{hasStockOut(data.commodities.asaq_6_13yrs) ? 'Yes' : 'No'}</td>
              </tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-3">14+ years</td>
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 bg-green-50 border-b border-green-200">
          <h3 className="font-bold text-green-800">Artemether-Lumefantrine (AL)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
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
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-200"><h4 className="font-bold text-purple-800">DHAP 40/320mg</h4></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.dhap_40_320mg.openingStock}</span></div>
            <div className="flex justify-between"><span>Dispensed:</span><span className="font-bold">{data.commodities.dhap_40_320mg.dispensed}</span></div>
            <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.dhap_40_320mg.closingStock}</span></div>
            <div className="flex justify-between"><span>Stock Out &gt;7 days:</span><span className={hasStockOut(data.commodities.dhap_40_320mg) ? 'text-red-600 font-bold' : 'text-green-600'}>{hasStockOut(data.commodities.dhap_40_320mg) ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* Quinine Tablets */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200"><h4 className="font-bold text-yellow-800">Quinine Tablets 300mg</h4></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.quinine_tablet.openingStock}</span></div>
            <div className="flex justify-between"><span>Dispensed:</span><span className="font-bold">{data.commodities.quinine_tablet.dispensed}</span></div>
            <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.quinine_tablet.closingStock}</span></div>
            <div className="flex justify-between"><span>Stock Out &gt;7 days:</span><span className={hasStockOut(data.commodities.quinine_tablet) ? 'text-red-600 font-bold' : 'text-green-600'}>{hasStockOut(data.commodities.quinine_tablet) ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* Quinine Injection */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-200"><h4 className="font-bold text-orange-800">Quinine Injection</h4></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.quinine_injection.openingStock}</span></div>
            <div className="flex justify-between"><span>Dispensed:</span><span className="font-bold">{data.commodities.quinine_injection.dispensed}</span></div>
            <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.quinine_injection.closingStock}</span></div>
            <div className="flex justify-between"><span>Stock Out &gt;7 days:</span><span className={hasStockOut(data.commodities.quinine_injection) ? 'text-red-600 font-bold' : 'text-green-600'}>{hasStockOut(data.commodities.quinine_injection) ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* RDT Kits */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 bg-red-50 border-b border-red-200"><h4 className="font-bold text-red-800">RDT Kits</h4></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.rdt_kits.openingStock}</span></div>
            <div className="flex justify-between"><span>Dispensed:</span><span className="font-bold">{data.commodities.rdt_kits.dispensed}</span></div>
            <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.rdt_kits.closingStock}</span></div>
            <div className="flex justify-between"><span>Stock Out &gt;7 days:</span><span className={hasStockOut(data.commodities.rdt_kits) ? 'text-red-600 font-bold' : 'text-green-600'}>{hasStockOut(data.commodities.rdt_kits) ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* SP */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 bg-teal-50 border-b border-teal-200"><h4 className="font-bold text-teal-800">SP (Sulfadoxine-Pyrimethamine)</h4></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between"><span>Opening Stock:</span><span className="font-bold">{data.commodities.sp.openingStock}</span></div>
            <div className="flex justify-between"><span>Dispensed:</span><span className="font-bold">{data.commodities.sp.dispensed}</span></div>
            <div className="flex justify-between"><span>Closing Stock:</span><span className="font-bold">{data.commodities.sp.closingStock}</span></div>
            <div className="flex justify-between"><span>Stock Out &gt;7 days:</span><span className={hasStockOut(data.commodities.sp) ? 'text-red-600 font-bold' : 'text-green-600'}>{hasStockOut(data.commodities.sp) ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* Artesunate Injections Group */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 bg-cyan-50 border-b border-cyan-200"><h4 className="font-bold text-cyan-800">Artesunate Injection</h4></div>
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
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-200"><h4 className="font-bold text-indigo-800">Arthemeter Injection</h4></div>
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 bg-red-50 border-b border-red-200">
          <h3 className="font-bold text-red-800">Rectal Artesunate</h3>
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
      <div className="text-center py-4 text-xs text-gray-400">
        Generated on {new Date().toLocaleString()} | GHS Monthly Malaria Data Returns
      </div>
    </div>
  );
};