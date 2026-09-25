// src/components/reports/FormAReportView.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  Download, Printer, FileText, Baby, Heart, Shield,
  Syringe, Droplet, Calendar, User,
  Activity, TrendingUp, XCircle, Eye,
  Users, Hospital, Stethoscope, ClipboardList, Building2,
  Ambulance, Mic, Scissors, Droplets, TestTube
} from 'lucide-react';
import { useReportsStore } from '../../store/reportsStore';
import { useToast } from '../../store/toastStore';

interface FormAData {
  facility: {
    name: string;
    district: string;
    region: string;
    ghfCode: string;
    facilityType: 'Basic' | 'Comprehensive';
    emoncServices: {
      bloodTransfusion: boolean;
      pmtct: boolean;
      eidServices: boolean;
      conductDelivery: boolean;
      babyFriendly: boolean;
    };
  };
  period: {
    startDate: string;
    endDate: string;
    year: number;
    month: number;
    monthName: string;
    week?: number;
  };
  antenatal: {
    newRegistrants: number;
    totalAttendances: number;
    iptp: {
      dose1: number;
      dose2: number;
      dose3: number;
      dose4: number;
      dose5Plus: number;
    };
    ttVaccination: {
      dose1: number;
      dose2: number;
      dose3: number;
      dose4: number;
      dose5: number;
      tt2Plus: number;
    };
    itnDistributed: number;
    ironFolateGiven: number;
    malariaTested: number;
    malariaPositive: number;
    malariaTreated: number;
    highRisk: number;
    anaemiaAtBooking: number;
    referralsMade: number;
    firstVisits: number;
    fourthVisits: number;
    mothersBelow150cm: number;
    seenAt36Weeks: number;
    spDosesGiven: number;
    bloodGroupTested: number;
    rhesusNegative: number;
    syphilisTested: number;
    syphilisPositive: number;
    hivTested: number;
    hivPositive: number;
    hepatitisTested: number;
    hepatitisPositive: number;
    urineTested: number;
    urineAbnormal: number;
  };
  delivery: {
    totalDeliveries: number;
    spontaneousVertex: number;
    assistedBreech: number;
    vacuum: number;
    forceps: number;
    caesareanSection: number;
    multiple: number;
    liveBirths: number;
    stillbirthsFresh: number;
    stillbirthsMacerated: number;
    neonatalDeaths: number;
    maternalDeaths: number;
    lowBirthWeight: number;
    hospitalDeliveries: number;
    healthCentreDeliveries: number;
    homeDeliveries: number;
    skilledAttendant: number;
    tbaAttendant: number;
    bEmONCReferrals: number;
    cEmONCReferrals: number;
  };
  postnatal: {
    newMothers: number;
    totalVisits: number;
    pncWithin48Hours: number;
    pncWithin6Weeks: number;
    familyPlanningAccepted: number;
    exclusiveBreastfeeding: number;
    immunizationGiven: number;
    complications: number;
    pncReferrals: number;
  };
  generatedAt: string;
}

export const FormAReportView: React.FC = () => {
  // ✅ Use reportsStore - No isGeneratingReport, use isLoading
  const { formAReport, getGHSFormAReport, isLoading } = useReportsStore();
  const { success, error: toastError } = useToast();

  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<FormAData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [facilityType, setFacilityType] = useState<'Basic' | 'Comprehensive'>('Basic');
  const [emoncServices, setEmoncServices] = useState({
    bloodTransfusion: false,
    pmtct: false,
    eidServices: false,
    conductDelivery: false,
    babyFriendly: false
  });

  // If formAReport from store has data, use it
  useEffect(() => {
    if (formAReport) {
      setReportData(formAReport);
      setShowPreview(true);
    }
  }, [formAReport]);

  const handleGenerate = async () => {
    try {
      let params: any = {};
      if (period === 'monthly') {
        params = { year, month };
      } else if (period === 'custom' && startDate && endDate) {
        params = { startDate, endDate };
      } else if (period === 'yearly') {
        params = { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
      } else if (period === 'quarterly') {
        const quarter = Math.ceil(month / 3);
        const startMonth = (quarter - 1) * 3 + 1;
        params = {
          startDate: `${year}-${String(startMonth).padStart(2, '0')}-01`,
          endDate: `${year}-${String(startMonth + 2).padStart(2, '0')}-${new Date(year, startMonth + 2, 0).getDate()}`
        };
      }

      // Add facility type and EMONC services
      params.facilityType = facilityType;
      params.emoncServices = emoncServices;

      // ✅ Use getGHSFormAReport from reportsStore
      const result = await getGHSFormAReport(params);
      setReportData({ ...result, facility: { ...result.facility, facilityType, emoncServices } });
      setShowPreview(true);
      success('Report Generated', 'GHS Form A report is ready');
    } catch (err: any) {
      toastError('Generation Failed', err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    const rows = [
      ['GHS FORM A - MONTHLY MIDWIVES RETURN'],
      [''],
      ['SECTION 1: FACILITY INFORMATION'],
      ['Facility Name:', reportData.facility.name],
      ['District:', reportData.facility.district],
      ['Region:', reportData.facility.region],
      ['GHF Code:', reportData.facility.ghfCode],
      ['Facility Type:', reportData.facility.facilityType],
      [''],
      ['EMONC Services:'],
      ['Blood Transfusion Services', reportData.facility.emoncServices?.bloodTransfusion ? 'Yes' : 'No'],
      ['PMTCT', reportData.facility.emoncServices?.pmtct ? 'Yes' : 'No'],
      ['EID Services', reportData.facility.emoncServices?.eidServices ? 'Yes' : 'No'],
      ['Conduct Delivery', reportData.facility.emoncServices?.conductDelivery ? 'Yes' : 'No'],
      ['Baby Friendly Services', reportData.facility.emoncServices?.babyFriendly ? 'Yes' : 'No'],
      [''],
      ['SECTION 2: REPORTING PERIOD'],
      ['Month:', reportData.period.monthName],
      ['Year:', reportData.period.year],
      ['Period:', `${reportData.period.startDate} to ${reportData.period.endDate}`],
      [''],
      ['SECTION 3: ANTENATAL CARE'],
      ['New Antenatal Registrants', reportData.antenatal.newRegistrants],
      ['Total Antenatal Attendances', reportData.antenatal.totalAttendances],
      ['First ANC Visits (ANC1)', reportData.antenatal.firstVisits],
      ['Fourth ANC Visits (ANC4+)', reportData.antenatal.fourthVisits],
      [''],
      ['IPTp Coverage:'],
      ['IPTp-1', reportData.antenatal.iptp.dose1],
      ['IPTp-2', reportData.antenatal.iptp.dose2],
      ['IPTp-3', reportData.antenatal.iptp.dose3],
      ['IPTp-4', reportData.antenatal.iptp.dose4],
      ['IPTp-5+', reportData.antenatal.iptp.dose5Plus],
      [''],
      ['TT Vaccination:'],
      ['TT1', reportData.antenatal.ttVaccination.dose1],
      ['TT2', reportData.antenatal.ttVaccination.dose2],
      ['TT3', reportData.antenatal.ttVaccination.dose3],
      ['TT4', reportData.antenatal.ttVaccination.dose4],
      ['TT5', reportData.antenatal.ttVaccination.dose5],
      ['TT2+ (Protected)', reportData.antenatal.ttVaccination.tt2Plus],
      [''],
      ['Malaria in Pregnancy:'],
      ['Tested', reportData.antenatal.malariaTested],
      ['Positive', reportData.antenatal.malariaPositive],
      ['Treated', reportData.antenatal.malariaTreated],
      [''],
      ['Lab Tests:'],
      ['Blood Group Tested', reportData.antenatal.bloodGroupTested],
      ['Rhesus Negative', reportData.antenatal.rhesusNegative],
      ['Syphilis Tested', reportData.antenatal.syphilisTested],
      ['Syphilis Positive', reportData.antenatal.syphilisPositive],
      ['HIV Tested', reportData.antenatal.hivTested],
      ['HIV Positive', reportData.antenatal.hivPositive],
      ['Hepatitis Tested', reportData.antenatal.hepatitisTested],
      ['Hepatitis Positive', reportData.antenatal.hepatitisPositive],
      ['Urine Tested', reportData.antenatal.urineTested],
      ['Urine Abnormal', reportData.antenatal.urineAbnormal],
      [''],
      ['SECTION 4: DELIVERY'],
      ['Total Deliveries', reportData.delivery.totalDeliveries],
      ['Spontaneous Vertex', reportData.delivery.spontaneousVertex],
      ['Assisted Breech', reportData.delivery.assistedBreech],
      ['Vacuum', reportData.delivery.vacuum],
      ['Forceps', reportData.delivery.forceps],
      ['Caesarean Section', reportData.delivery.caesareanSection],
      ['Multiple Births', reportData.delivery.multiple],
      [''],
      ['Delivery Outcomes:'],
      ['Live Births', reportData.delivery.liveBirths],
      ['Fresh Stillbirths', reportData.delivery.stillbirthsFresh],
      ['Macerated Stillbirths', reportData.delivery.stillbirthsMacerated],
      ['Neonatal Deaths', reportData.delivery.neonatalDeaths],
      ['Maternal Deaths', reportData.delivery.maternalDeaths],
      ['Low Birth Weight', reportData.delivery.lowBirthWeight],
      [''],
      ['Referrals:'],
      ['bEmONC Referrals', reportData.delivery.bEmONCReferrals],
      ['cEmONC Referrals', reportData.delivery.cEmONCReferrals],
      [''],
      ['SECTION 5: POSTNATAL CARE'],
      ['New Mothers', reportData.postnatal.newMothers],
      ['Total PNC Visits', reportData.postnatal.totalVisits],
      ['PNC within 48 hours', reportData.postnatal.pncWithin48Hours],
      ['PNC within 6 weeks', reportData.postnatal.pncWithin6Weeks],
      ['Family Planning Accepted', reportData.postnatal.familyPlanningAccepted],
      ['Exclusive Breastfeeding', reportData.postnatal.exclusiveBreastfeeding],
      ['Immunizations Given', reportData.postnatal.immunizationGiven],
      ['Postnatal Complications', reportData.postnatal.complications],
      ['PNC Referrals', reportData.postnatal.pncReferrals],
      [''],
      ['Generated At:', new Date(reportData.generatedAt).toLocaleString()]
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GHS_Form_A_${reportData.period.year}_${reportData.period.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Stat Card Component ───────────────────────────────────────────────────
  const StatCard = ({ label, value, icon: Icon, color, large = false }: any) => (
    <div className={`bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 ${large ? 'col-span-2' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">{label}</p>
          <p className={`font-bold text-[var(--text-primary)] ${large ? 'text-3xl' : 'text-2xl'} mt-1`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-[var(--icon-${color}-bg)]`}>
          <Icon className={`w-5 h-5 text-[var(--icon-${color}-text)]`} />
        </div>
      </div>
    </div>
  );

  const MetricRow = ({ label, value, highlight = false, unit = '' }: any) => (
    <div className={`flex justify-between items-center p-2 rounded ${highlight ? 'bg-pink-50' : 'hover:bg-[var(--bg-main)]'}`}>
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className={`font-bold ${highlight ? 'text-pink-600 text-lg' : 'text-[var(--text-primary)]'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}{unit}
      </span>
    </div>
  );

  // ── Report Preview ──────────────────────────────────────────────────────
  if (!showPreview) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">GHS Form A</h2>
            <p className="text-sm text-[var(--text-secondary)]">Monthly Midwives Return - Maternal Health Report</p>
          </div>
        </div>

        {/* Facility Type Selection */}
        <div className="mb-6 p-4 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" /> Facility Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Facility Type</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2">
                  <input type="radio" value="Basic" checked={facilityType === 'Basic'} onChange={() => setFacilityType('Basic')} className="w-4 h-4" />
                  <span>Basic</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" value="Comprehensive" checked={facilityType === 'Comprehensive'} onChange={() => setFacilityType('Comprehensive')} className="w-4 h-4" />
                  <span>Comprehensive</span>
                </label>
              </div>
            </div>
          </div>

          <h4 className="font-medium text-sm mt-4 mb-2">EMONC Services Available:</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={emoncServices.bloodTransfusion} onChange={(e) => setEmoncServices({ ...emoncServices, bloodTransfusion: e.target.checked })} className="w-4 h-4" />Blood Transfusion</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={emoncServices.pmtct} onChange={(e) => setEmoncServices({ ...emoncServices, pmtct: e.target.checked })} className="w-4 h-4" />PMTCT</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={emoncServices.eidServices} onChange={(e) => setEmoncServices({ ...emoncServices, eidServices: e.target.checked })} className="w-4 h-4" />EID Services</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={emoncServices.conductDelivery} onChange={(e) => setEmoncServices({ ...emoncServices, conductDelivery: e.target.checked })} className="w-4 h-4" />Conduct Delivery</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={emoncServices.babyFriendly} onChange={(e) => setEmoncServices({ ...emoncServices, babyFriendly: e.target.checked })} className="w-4 h-4" />Baby Friendly</label>
          </div>
        </div>

        {/* Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Report Period</label>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setPeriod('monthly')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${period === 'monthly' ? 'bg-pink-600 text-white' : 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)]'}`}>Monthly</button>
              <button onClick={() => setPeriod('quarterly')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${period === 'quarterly' ? 'bg-pink-600 text-white' : 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)]'}`}>Quarterly</button>
              <button onClick={() => setPeriod('yearly')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${period === 'yearly' ? 'bg-pink-600 text-white' : 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)]'}`}>Yearly</button>
              <button onClick={() => setPeriod('custom')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${period === 'custom' ? 'bg-pink-600 text-white' : 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)]'}`}>Custom</button>
            </div>
          </div>

          {period === 'monthly' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg">
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>
            </div>
          )}

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg" />
              </div>
            </div>
          )}
        </div>

        {/* ✅ FIXED: Use isLoading from reportsStore */}
        <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-all">
          {isLoading ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating Report...</>) : (<><Eye className="w-5 h-5" /> Generate GHS Form A Report</>)}
        </button>
      </div>
    );
  }

  // ============================================
  // FORM A REPORT DISPLAY - Matches PDF layout
  // ============================================

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 flex flex-wrap gap-2 sticky top-0 z-10 print:hidden">
        <button onClick={() => setShowPreview(false)} className="px-3 py-2 text-sm text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)]">← Back</button>
        <button onClick={handlePrint} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
        <button onClick={handleExportCSV} className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      {/* Report Content - PDF Style */}
      <div id="form-a-report-content" className="bg-white text-gray-900 rounded-xl shadow-lg overflow-hidden print:shadow-none font-serif">

        {/* Header - GHS Official Format */}
        <div className="text-center py-6 px-4 border-b-2 border-gray-300">
          <h1 className="text-2xl font-bold uppercase tracking-wide">GHANA HEALTH SERVICE</h1>
          <h2 className="text-xl font-semibold text-gray-700 mt-1">MONTHLY MIDWIVES RETURNS</h2>
          <h3 className="text-lg font-medium text-gray-600 mt-1">FORM A</h3>
          <div className="mt-4 text-sm">
            <p className="font-bold">{reportData?.facility.name}</p>
            <p className="text-gray-500">District: {reportData?.facility.district} | Region: {reportData?.facility.region}</p>
            <p className="text-gray-500">GHF Code: {reportData?.facility.ghfCode}</p>
            <p className="text-gray-500">Facility Type: <span className="font-bold">{reportData?.facility.facilityType}</span></p>
            <p className="text-gray-700 font-medium mt-2">Reporting Period: {reportData?.period.monthName} {reportData?.period.year}</p>
            <p className="text-xs text-gray-400">{reportData?.period.startDate} to {reportData?.period.endDate}</p>
          </div>
        </div>

        {/* EMONC Services Section */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600 mb-3">EMONC Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${reportData?.facility.emoncServices?.bloodTransfusion ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">Blood transfusion services</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${reportData?.facility.emoncServices?.pmtct ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">PMTCT</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${reportData?.facility.emoncServices?.eidServices ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">EID Services</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${reportData?.facility?.emoncServices?.conductDelivery ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">Conduct Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${reportData?.facility?.emoncServices?.babyFriendly ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">Baby Friendly Services</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: ANTENATAL CARE */}
        <div className="p-5 border-b border-gray-200">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-pink-700 flex items-center gap-2">
              <Heart className="w-5 h-5" /> SECTION 1: ANTENATAL CARE
            </h3>
            <p className="text-xs text-gray-500 ml-7">Services provided to pregnant women during pregnancy</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{reportData?.antenatal.newRegistrants}</div>
              <div className="text-xs text-gray-600">New Registrants</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{reportData?.antenatal.totalAttendances}</div>
              <div className="text-xs text-gray-600">Total Attendances</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{reportData?.antenatal.firstVisits}</div>
              <div className="text-xs text-gray-600">First ANC (ANC1)</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{reportData?.antenatal.fourthVisits}</div>
              <div className="text-xs text-gray-600">Fourth ANC (ANC4+)</div>
            </div>
          </div>

          {/* Two column layout for ANC data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* IPTp Coverage */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" /> IPTp Coverage (SP)</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="py-2">IPTp-1</td><td className="py-2 text-right font-bold">{reportData?.antenatal.iptp.dose1}</td></tr>
                  <tr className="border-b"><td className="py-2">IPTp-2</td><td className="py-2 text-right font-bold">{reportData?.antenatal.iptp.dose2}</td></tr>
                  <tr className="border-b bg-pink-50"><td className="py-2 font-medium">IPTp-3+ (WHO recommended)</td><td className="py-2 text-right font-bold text-pink-600">{reportData?.antenatal.iptp.dose3}</td></tr>
                  <tr className="border-b"><td className="py-2">IPTp-4</td><td className="py-2 text-right font-bold">{reportData?.antenatal.iptp.dose4}</td></tr>
                  <tr><td className="py-2">IPTp-5+</td><td className="py-2 text-right font-bold">{reportData?.antenatal.iptp.dose5Plus}</td></tr>
                </tbody>
              </table>
            </div>

            {/* TT Vaccination */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3 flex items-center gap-2"><Syringe className="w-4 h-4 text-green-600" /> TT Vaccination</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="py-2">TT1</td><td className="py-2 text-right font-bold">{reportData?.antenatal.ttVaccination.dose1}</td></tr>
                  <tr className="border-b"><td className="py-2">TT2</td><td className="py-2 text-right font-bold">{reportData?.antenatal.ttVaccination.dose2}</td></tr>
                  <tr className="border-b"><td className="py-2">TT3</td><td className="py-2 text-right font-bold">{reportData?.antenatal.ttVaccination.dose3}</td></tr>
                  <tr className="border-b"><td className="py-2">TT4</td><td className="py-2 text-right font-bold">{reportData?.antenatal.ttVaccination.dose4}</td></tr>
                  <tr className="border-b"><td className="py-2">TT5</td><td className="py-2 text-right font-bold">{reportData?.antenatal.ttVaccination.dose5}</td></tr>
                  <tr className="bg-green-50"><td className="py-2 font-medium">TT2+ (Protected)</td><td className="py-2 text-right font-bold text-green-600">{reportData?.antenatal.ttVaccination.tt2Plus}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Malaria in Pregnancy */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3 flex items-center gap-2"><Droplet className="w-4 h-4 text-red-600" /> Malaria in Pregnancy</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="py-2">Tested for Malaria</td><td className="py-2 text-right font-bold">{reportData?.antenatal.malariaTested}</td></tr>
                  <tr className="border-b bg-red-50"><td className="py-2 font-medium">Tested Positive</td><td className="py-2 text-right font-bold text-red-600">{reportData?.antenatal.malariaPositive}</td></tr>
                  <tr><td className="py-2">Treated for Malaria</td><td className="py-2 text-right font-bold">{reportData?.antenatal.malariaTreated}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Laboratory Tests */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3 flex items-center gap-2"><TestTube className="w-4 h-4 text-purple-600" /> Laboratory Tests</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="py-2">Blood Group Tested</td><td className="py-2 text-right font-bold">{reportData?.antenatal.bloodGroupTested || 0}</td></tr>
                  <tr className="border-b"><td className="py-2">Rhesus Negative</td><td className="py-2 text-right font-bold">{reportData?.antenatal.rhesusNegative || 0}</td></tr>
                  <tr className="border-b"><td className="py-2">Syphilis Tested (VDRL)</td><td className="py-2 text-right font-bold">{reportData?.antenatal.syphilisTested || 0}</td></tr>
                  <tr className="border-b"><td className="py-2">Syphilis Positive</td><td className="py-2 text-right font-bold text-red-600">{reportData?.antenatal.syphilisPositive || 0}</td></tr>
                  <tr className="border-b"><td className="py-2">HIV Tested</td><td className="py-2 text-right font-bold">{reportData?.antenatal.hivTested || 0}</td></tr>
                  <tr className="border-b"><td className="py-2">HIV Positive</td><td className="py-2 text-right font-bold text-red-600">{reportData?.antenatal.hivPositive || 0}</td></tr>
                  <tr className="border-b"><td className="py-2">Hepatitis Tested</td><td className="py-2 text-right font-bold">{reportData?.antenatal.hepatitisTested || 0}</td></tr>
                  <tr className="border-b"><td className="py-2">Hepatitis Positive</td><td className="py-2 text-right font-bold text-red-600">{reportData?.antenatal.hepatitisPositive || 0}</td></tr>
                  <tr><td className="py-2">Urine Tested</td><td className="py-2 text-right font-bold">{reportData?.antenatal.urineTested || 0}</td></tr>
                  <tr className="border-t"><td className="py-2">Urine Abnormal</td><td className="py-2 text-right font-bold text-orange-600">{reportData?.antenatal.urineAbnormal || 0}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplements & Prevention */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-teal-600">{reportData?.antenatal.itnDistributed}</div>
              <div className="text-xs text-gray-500">ITN/LLIN Distributed</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-teal-600">{reportData?.antenatal.ironFolateGiven}</div>
              <div className="text-xs text-gray-500">Iron/Folate Given</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-orange-600">{reportData?.antenatal.mothersBelow150cm}</div>
              <div className="text-xs text-gray-500">Mothers &lt;150cm/5ft</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-600">{reportData?.antenatal.seenAt36Weeks}</div>
              <div className="text-xs text-gray-500">Seen at 36 weeks</div>
            </div>
          </div>

          {/* Complications */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
              <div className="text-xl font-bold text-red-600">{reportData?.antenatal.highRisk}</div>
              <div className="text-xs">High Risk Pregnancies</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
              <div className="text-xl font-bold text-orange-600">{reportData?.antenatal.anaemiaAtBooking}</div>
              <div className="text-xs">Anaemia at Booking (Hb&lt;11)</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
              <div className="text-xl font-bold text-yellow-600">{reportData?.antenatal.referralsMade}</div>
              <div className="text-xs">Referrals Made</div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DELIVERY SERVICES */}
        <div className="p-5 border-b border-gray-200">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-blue-700 flex items-center gap-2">
              <Baby className="w-5 h-5" /> SECTION 2: DELIVERY SERVICES
            </h3>
            <p className="text-xs text-gray-500 ml-7">Delivery outcomes and complications</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg"><div className="text-2xl font-bold text-blue-600">{reportData?.delivery.totalDeliveries}</div><div className="text-xs">Total Deliveries</div></div>
            <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-2xl font-bold text-green-600">{reportData?.delivery.liveBirths}</div><div className="text-xs">Live Births</div></div>
            <div className="text-center p-3 bg-red-50 rounded-lg"><div className="text-2xl font-bold text-red-600">{(reportData?.delivery.stillbirthsFresh || 0) + (reportData?.delivery.stillbirthsMacerated || 0)}</div><div className="text-xs">Stillbirths</div></div>
            <div className="text-center p-3 bg-purple-50 rounded-lg"><div className="text-2xl font-bold text-purple-600">{reportData?.delivery.caesareanSection}</div><div className="text-xs">C-Section</div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Delivery Types */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">Mode of Delivery</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="py-2">Spontaneous Vertex</td><td className="py-2 text-right font-bold">{reportData?.delivery.spontaneousVertex}</td></tr>
                  <tr className="border-b"><td className="py-2">Assisted Breech</td><td className="py-2 text-right font-bold">{reportData?.delivery.assistedBreech}</td></tr>
                  <tr className="border-b"><td className="py-2">Vacuum Extraction</td><td className="py-2 text-right font-bold">{reportData?.delivery.vacuum}</td></tr>
                  <tr className="border-b"><td className="py-2">Forceps</td><td className="py-2 text-right font-bold">{reportData?.delivery.forceps}</td></tr>
                  <tr className="border-b bg-purple-50"><td className="py-2 font-medium">Caesarean Section</td><td className="py-2 text-right font-bold text-purple-600">{reportData?.delivery.caesareanSection}</td></tr>
                  <tr><td className="py-2">Multiple Births</td><td className="py-2 text-right font-bold">{reportData?.delivery.multiple}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Place of Delivery */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">Place of Delivery</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="py-2">Hospital</td><td className="py-2 text-right font-bold">{reportData?.delivery.hospitalDeliveries}</td></tr>
                  <tr className="border-b"><td className="py-2">Health Centre/Clinic</td><td className="py-2 text-right font-bold">{reportData?.delivery.healthCentreDeliveries}</td></tr>
                  <tr><td className="py-2">Home/En Route</td><td className="py-2 text-right font-bold">{reportData?.delivery.homeDeliveries}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Stillbirths & Referrals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-bold mb-3">Stillbirth Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-sm">Fresh Stillbirths:</span><br /><span className="text-xl font-bold text-red-600">{reportData?.delivery.stillbirthsFresh}</span></div>
                <div><span className="text-sm">Macerated Stillbirths:</span><br /><span className="text-xl font-bold text-red-600">{reportData?.delivery.stillbirthsMacerated}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between"><span>Low Birth Weight (&lt;2.5kg):</span><span className="font-bold">{reportData?.delivery.lowBirthWeight}</span></div>
                <div className="flex justify-between mt-2"><span>Neonatal Deaths:</span><span className="font-bold text-red-600">{reportData?.delivery.neonatalDeaths}</span></div>
                <div className="flex justify-between mt-2"><span>Maternal Deaths:</span><span className="font-bold text-red-600">{reportData?.delivery.maternalDeaths}</span></div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-bold mb-3">Referrals</h4>
              <div className="space-y-3">
                <div className="flex justify-between p-2 bg-orange-50 rounded"><span>bEmONC Referrals:</span><span className="font-bold text-orange-600">{reportData?.delivery.bEmONCReferrals || 0}</span></div>
                <div className="flex justify-between p-2 bg-red-50 rounded"><span>cEmONC Referrals:</span><span className="font-bold text-red-600">{reportData?.delivery.cEmONCReferrals || 0}</span></div>
                <div className="flex justify-between p-2 bg-yellow-50 rounded"><span>Skilled Attendant:</span><span className="font-bold">{reportData?.delivery.skilledAttendant}</span></div>
                <div className="flex justify-between p-2 bg-gray-100 rounded"><span>TBA Attendant:</span><span className="font-bold">{reportData?.delivery.tbaAttendant}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: POSTNATAL CARE */}
        <div className="p-5">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-green-700 flex items-center gap-2">
              <Users className="w-5 h-5" /> SECTION 3: POSTNATAL CARE
            </h3>
            <p className="text-xs text-gray-500 ml-7">Postnatal services and follow-up</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 bg-teal-50 rounded-lg"><div className="text-2xl font-bold text-teal-600">{reportData?.postnatal.newMothers}</div><div className="text-xs">New Mothers</div></div>
            <div className="text-center p-3 bg-blue-50 rounded-lg"><div className="text-2xl font-bold text-blue-600">{reportData?.postnatal.totalVisits}</div><div className="text-xs">Total PNC Visits</div></div>
            <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-2xl font-bold text-green-600">{reportData?.postnatal.exclusiveBreastfeeding}</div><div className="text-xs">Exclusive BF</div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">PNC Timing</h4>
              <div className="space-y-3">
                <div className="flex justify-between p-2 bg-green-50 rounded"><span>PNC within 48 hours:</span><span className="font-bold text-green-600">{reportData?.postnatal.pncWithin48Hours}</span></div>
                <div className="flex justify-between p-2 bg-blue-50 rounded"><span>PNC within 6 weeks:</span><span className="font-bold text-blue-600">{reportData?.postnatal.pncWithin6Weeks}</span></div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">Postnatal Services</h4>
              <div className="space-y-3">
                <div className="flex justify-between"><span>Family Planning Accepted:</span><span className="font-bold">{reportData?.postnatal.familyPlanningAccepted}</span></div>
                <div className="flex justify-between"><span>Immunizations Given:</span><span className="font-bold">{reportData?.postnatal.immunizationGiven}</span></div>
                <div className="flex justify-between p-2 bg-red-50 rounded"><span>Postnatal Complications:</span><span className="font-bold text-red-600">{reportData?.postnatal.complications}</span></div>
                <div className="flex justify-between p-2 bg-orange-50 rounded"><span>PNC Referrals:</span><span className="font-bold text-orange-600">{reportData?.postnatal.pncReferrals || 0}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 px-4 border-t-2 border-gray-300 text-xs text-gray-400 bg-gray-50">
          <p>Data Entry | DHIS2 - Form A (Monthly Midwives Return)</p>
          <p className="mt-1">Generated on {new Date(reportData?.generatedAt || '').toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default FormAReportView;