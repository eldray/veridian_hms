// src/components/reports/ANCReportView.tsx
// COMPLETE FORM A REPORT - Combines Antenatal, Delivery, and Postnatal

import React, { useState, useEffect } from 'react';
import { 
  Download, Printer, FileText, Baby, Heart, Shield, 
  Syringe, Droplet, AlertTriangle, Calendar, User,
  Activity, TrendingUp, CheckCircle, XCircle, Eye,
  Users, Hospital, Stethoscope, ClipboardList
} from 'lucide-react';
import { useAntenatalStore } from '../../store/antenatalStore';
import { useToast } from '../../store/toastStore';

interface FormAData {
  facility: {
    name: string;
    district: string;
    region: string;
    ghfCode: string;
  };
  period: {
    startDate: string;
    endDate: string;
    year: number;
    month: number;
    monthName: string;
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
  };
  generatedAt: string;
}

export const ANCReportView: React.FC = () => {
  const { ancReport, generateANCReport, isGeneratingReport } = useAntenatalStore();
  const { success, error: toastError } = useToast();
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<FormAData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<'antenatal' | 'delivery' | 'postnatal'>('antenatal');

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
      
      // This should call the new Form A endpoint
      const result = await generateANCReport(params);
      setReportData(result);
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
      ['GHS FORM A - MATERNAL HEALTH REPORT'],
      [''],
      ['FACILITY INFORMATION'],
      ['Facility Name:', reportData.facility.name],
      ['District:', reportData.facility.district],
      ['Region:', reportData.facility.region],
      ['GHF Code:', reportData.facility.ghfCode],
      ['Reporting Period:', `${reportData.period.monthName} ${reportData.period.year}`],
      [''],
      ['SECTION A: ANTENATAL CARE'],
      ['New Antenatal Registrants', reportData.antenatal.newRegistrants],
      ['Total Antenatal Attendances', reportData.antenatal.totalAttendances],
      ['First ANC Visits (ANC1)', reportData.antenatal.firstVisits],
      ['Fourth ANC Visits (ANC4+)', reportData.antenatal.fourthVisits],
      [''],
      ['IPTp Coverage (Intermittent Preventive Treatment)'],
      ['IPTp-1', reportData.antenatal.iptp.dose1],
      ['IPTp-2', reportData.antenatal.iptp.dose2],
      ['IPTp-3', reportData.antenatal.iptp.dose3],
      ['IPTp-4', reportData.antenatal.iptp.dose4],
      ['IPTp-5+', reportData.antenatal.iptp.dose5Plus],
      [''],
      ['TT Vaccination (Tetanus Toxoid)'],
      ['TT1', reportData.antenatal.ttVaccination.dose1],
      ['TT2', reportData.antenatal.ttVaccination.dose2],
      ['TT3', reportData.antenatal.ttVaccination.dose3],
      ['TT4', reportData.antenatal.ttVaccination.dose4],
      ['TT5', reportData.antenatal.ttVaccination.dose5],
      ['TT2+ (Protected at birth)', reportData.antenatal.ttVaccination.tt2Plus],
      [''],
      ['Other ANC Services'],
      ['ITN/LLIN Distributed', reportData.antenatal.itnDistributed],
      ['Iron/Folate Given', reportData.antenatal.ironFolateGiven],
      ['Mothers below 150cm/5ft', reportData.antenatal.mothersBelow150cm],
      ['Pregnant women seen at 36 weeks', reportData.antenatal.seenAt36Weeks],
      [''],
      ['Malaria in Pregnancy'],
      ['Malaria Tested', reportData.antenatal.malariaTested],
      ['Malaria Positive', reportData.antenatal.malariaPositive],
      ['Malaria Treated', reportData.antenatal.malariaTreated],
      [''],
      ['Complications & Referrals'],
      ['High Risk Pregnancies', reportData.antenatal.highRisk],
      ['Anaemia at Booking (Hb<11)', reportData.antenatal.anaemiaAtBooking],
      ['Referrals Made', reportData.antenatal.referralsMade],
      [''],
      ['SECTION B: DELIVERY'],
      ['Total Deliveries', reportData.delivery.totalDeliveries],
      ['Spontaneous Vertex', reportData.delivery.spontaneousVertex],
      ['Assisted Breech', reportData.delivery.assistedBreech],
      ['Vacuum', reportData.delivery.vacuum],
      ['Forceps', reportData.delivery.forceps],
      ['Caesarean Section', reportData.delivery.caesareanSection],
      ['Multiple Births', reportData.delivery.multiple],
      [''],
      ['Delivery Outcomes'],
      ['Live Births', reportData.delivery.liveBirths],
      ['Fresh Stillbirths', reportData.delivery.stillbirthsFresh],
      ['Macerated Stillbirths', reportData.delivery.stillbirthsMacerated],
      ['Neonatal Deaths', reportData.delivery.neonatalDeaths],
      ['Maternal Deaths', reportData.delivery.maternalDeaths],
      ['Low Birth Weight (<2.5kg)', reportData.delivery.lowBirthWeight],
      [''],
      ['Place of Delivery'],
      ['Hospital Deliveries', reportData.delivery.hospitalDeliveries],
      ['Health Centre/Clinic', reportData.delivery.healthCentreDeliveries],
      ['Home/En Route', reportData.delivery.homeDeliveries],
      [''],
      ['Birth Attendant'],
      ['Skilled Attendant', reportData.delivery.skilledAttendant],
      ['Traditional Birth Attendant', reportData.delivery.tbaAttendant],
      [''],
      ['SECTION C: POSTNATAL CARE'],
      ['New Mothers', reportData.postnatal.newMothers],
      ['Total PNC Visits', reportData.postnatal.totalVisits],
      ['PNC within 48 hours', reportData.postnatal.pncWithin48Hours],
      ['PNC within 6 weeks', reportData.postnatal.pncWithin6Weeks],
      ['Family Planning Accepted', reportData.postnatal.familyPlanningAccepted],
      ['Exclusive Breastfeeding', reportData.postnatal.exclusiveBreastfeeding],
      ['Immunizations Given', reportData.postnatal.immunizationGiven],
      ['Postnatal Complications', reportData.postnatal.complications],
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

  const SectionTitle = ({ title, icon: Icon, subtitle }: any) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-pink-600" />
        </div>
        <h3 className="font-bold text-lg text-[var(--text-primary)]">{title}</h3>
      </div>
      {subtitle && <p className="text-xs text-[var(--text-secondary)] ml-10">{subtitle}</p>}
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

  const TwoColumnGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  );

  // Selection UI before report is shown
  if (!showPreview) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">GHS Form A</h2>
            <p className="text-sm text-[var(--text-secondary)]">Maternal Health Report (ANC + Delivery + Postnatal)</p>
          </div>
        </div>

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

        <button onClick={handleGenerate} disabled={isGeneratingReport} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-all">
          {isGeneratingReport ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating Report...</>) : (<><Eye className="w-5 h-5" /> Generate GHS Form A Report</>)}
        </button>
      </div>
    );
  }

  // ============================================
  // COMPLETE FORM A REPORT DISPLAY
  // ============================================
  
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 flex flex-wrap gap-2 sticky top-0 z-10 print:hidden">
        <button onClick={() => setShowPreview(false)} className="px-3 py-2 text-sm text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)]">← Back</button>
        <button onClick={handlePrint} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
        <button onClick={handleExportCSV} className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      {/* Section Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 print:hidden">
        <button onClick={() => setActiveSection('antenatal')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'antenatal' ? 'bg-pink-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>Antenatal</button>
        <button onClick={() => setActiveSection('delivery')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'delivery' ? 'bg-pink-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>Delivery</button>
        <button onClick={() => setActiveSection('postnatal')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'postnatal' ? 'bg-pink-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}>Postnatal</button>
      </div>

      {/* Report Content - PDF Style */}
      <div id="form-a-report-content" className="bg-white text-gray-900 rounded-xl shadow-lg overflow-hidden print:shadow-none">
        
        {/* Header */}
        <div className="text-center py-6 px-4 border-b">
          <h1 className="text-2xl font-bold mb-1">GHANA HEALTH SERVICE</h1>
          <h2 className="text-xl font-semibold text-gray-700">FORM A: MATERNAL HEALTH REPORT</h2>
          <div className="mt-3 text-sm">
            <p className="font-medium">{reportData?.facility.name}</p>
            <p className="text-gray-500">District: {reportData?.facility.district} | Region: {reportData?.facility.region}</p>
            <p className="text-gray-500 mt-1">GHF Code: {reportData?.facility.ghfCode}</p>
            <p className="text-gray-500 mt-1">Reporting Period: {reportData?.period.monthName} {reportData?.period.year}</p>
            <p className="text-xs text-gray-400 mt-1">{reportData?.period.startDate} to {reportData?.period.endDate}</p>
          </div>
        </div>

        {/* ============================================ */}
        {/* ANTENATAL SECTION */}
        {/* ============================================ */}
        <div className={`p-5 border-b ${activeSection !== 'antenatal' ? 'print:block' : ''}`}>
          <SectionTitle title="ANTENATAL CARE" icon={Heart} subtitle="ANC services and interventions" />
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-pink-50 rounded-lg"><div className="text-2xl font-bold text-pink-600">{reportData?.antenatal.newRegistrants}</div><div className="text-xs">New Registrants</div></div>
            <div className="text-center p-3 bg-blue-50 rounded-lg"><div className="text-2xl font-bold text-blue-600">{reportData?.antenatal.totalAttendances}</div><div className="text-xs">Total Attendances</div></div>
            <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-2xl font-bold text-green-600">{reportData?.antenatal.firstVisits}</div><div className="text-xs">First ANC Visits</div></div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg"><div className="text-2xl font-bold text-yellow-600">{reportData?.antenatal.fourthVisits}</div><div className="text-xs">Fourth ANC Visits</div></div>
          </div>

          <TwoColumnGrid>
            {/* IPTp Coverage */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3"><Shield className="w-5 h-5 text-blue-600" /><h4 className="font-bold">IPTp Coverage</h4></div>
              <div className="space-y-2">
                <MetricRow label="IPTp-1 (First dose)" value={reportData?.antenatal.iptp.dose1} />
                <MetricRow label="IPTp-2 (Second dose)" value={reportData?.antenatal.iptp.dose2} />
                <MetricRow label="IPTp-3 (Third dose)" value={reportData?.antenatal.iptp.dose3} highlight />
                <MetricRow label="IPTp-4 (Fourth dose)" value={reportData?.antenatal.iptp.dose4} />
                <MetricRow label="IPTp-5+ (Fifth+ dose)" value={reportData?.antenatal.iptp.dose5Plus} />
              </div>
            </div>

            {/* TT Vaccination */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3"><Syringe className="w-5 h-5 text-green-600" /><h4 className="font-bold">TT Vaccination</h4></div>
              <div className="space-y-2">
                <MetricRow label="TT1" value={reportData?.antenatal.ttVaccination.dose1} />
                <MetricRow label="TT2" value={reportData?.antenatal.ttVaccination.dose2} />
                <MetricRow label="TT3" value={reportData?.antenatal.ttVaccination.dose3} />
                <MetricRow label="TT4" value={reportData?.antenatal.ttVaccination.dose4} />
                <MetricRow label="TT5" value={reportData?.antenatal.ttVaccination.dose5} />
                <MetricRow label="TT2+ (Protected at birth)" value={reportData?.antenatal.ttVaccination.tt2Plus} highlight />
              </div>
            </div>

            {/* Malaria in Pregnancy */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3"><Droplet className="w-5 h-5 text-red-600" /><h4 className="font-bold">Malaria in Pregnancy</h4></div>
              <div className="space-y-2">
                <MetricRow label="Tested for Malaria" value={reportData?.antenatal.malariaTested} />
                <MetricRow label="Tested Positive" value={reportData?.antenatal.malariaPositive} highlight />
                <MetricRow label="Treated for Malaria" value={reportData?.antenatal.malariaTreated} />
                <MetricRow label="Treatment Rate" value={reportData?.antenatal.malariaPositive ? Math.round((reportData.antenatal.malariaTreated / reportData.antenatal.malariaPositive) * 100) : 0} unit="%" />
              </div>
            </div>

            {/* Supplements & Preventive */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3"><Activity className="w-5 h-5 text-purple-600" /><h4 className="font-bold">Supplements & Prevention</h4></div>
              <div className="space-y-2">
                <MetricRow label="ITN/LLIN Distributed" value={reportData?.antenatal.itnDistributed} />
                <MetricRow label="Iron/Folate Given" value={reportData?.antenatal.ironFolateGiven} />
                <MetricRow label="Mothers below 150cm/5ft" value={reportData?.antenatal.mothersBelow150cm} />
                <MetricRow label="Seen at 36 weeks" value={reportData?.antenatal.seenAt36Weeks} />
              </div>
            </div>
          </TwoColumnGrid>

          {/* Complications & Referrals */}
          <div className="mt-4 border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-orange-600" /><h4 className="font-bold">Complications & Referrals</h4></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricRow label="High Risk Pregnancies" value={reportData?.antenatal.highRisk} />
              <MetricRow label="Anaemia at Booking (Hb<11)" value={reportData?.antenatal.anaemiaAtBooking} />
              <MetricRow label="Referrals Made" value={reportData?.antenatal.referralsMade} />
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* DELIVERY SECTION */}
        {/* ============================================ */}
        <div className={`p-5 border-b ${activeSection !== 'delivery' ? 'print:block' : ''}`}>
          <SectionTitle title="DELIVERY SERVICES" icon={Baby} subtitle="Delivery outcomes and complications" />
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg"><div className="text-2xl font-bold text-blue-600">{reportData?.delivery.totalDeliveries}</div><div className="text-xs">Total Deliveries</div></div>
            <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-2xl font-bold text-green-600">{reportData?.delivery.liveBirths}</div><div className="text-xs">Live Births</div></div>
            <div className="text-center p-3 bg-red-50 rounded-lg"><div className="text-2xl font-bold text-red-600">{reportData?.delivery.stillbirthsFresh + reportData?.delivery.stillbirthsMacerated}</div><div className="text-xs">Stillbirths</div></div>
            <div className="text-center p-3 bg-purple-50 rounded-lg"><div className="text-2xl font-bold text-purple-600">{reportData?.delivery.caesareanSection}</div><div className="text-xs">C-Section</div></div>
          </div>

          <TwoColumnGrid>
            {/* Delivery Types */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">Mode of Delivery</h4>
              <div className="space-y-2">
                <MetricRow label="Spontaneous Vertex" value={reportData?.delivery.spontaneousVertex} />
                <MetricRow label="Assisted Breech" value={reportData?.delivery.assistedBreech} />
                <MetricRow label="Vacuum Extraction" value={reportData?.delivery.vacuum} />
                <MetricRow label="Forceps" value={reportData?.delivery.forceps} />
                <MetricRow label="Caesarean Section" value={reportData?.delivery.caesareanSection} highlight />
                <MetricRow label="Multiple Births" value={reportData?.delivery.multiple} />
              </div>
            </div>

            {/* Delivery Outcomes */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">Maternal & Neonatal Outcomes</h4>
              <div className="space-y-2">
                <MetricRow label="Maternal Deaths" value={reportData?.delivery.maternalDeaths} highlight />
                <MetricRow label="Neonatal Deaths" value={reportData?.delivery.neonatalDeaths} />
                <MetricRow label="Low Birth Weight (<2.5kg)" value={reportData?.delivery.lowBirthWeight} />
              </div>
            </div>

            {/* Place of Delivery */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">Place of Delivery</h4>
              <div className="space-y-2">
                <MetricRow label="Hospital" value={reportData?.delivery.hospitalDeliveries} />
                <MetricRow label="Health Centre/Clinic" value={reportData?.delivery.healthCentreDeliveries} />
                <MetricRow label="Home/En Route" value={reportData?.delivery.homeDeliveries} />
              </div>
            </div>

            {/* Birth Attendant */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">Birth Attendant</h4>
              <div className="space-y-2">
                <MetricRow label="Skilled Attendant (Doctor/Midwife/Nurse)" value={reportData?.delivery.skilledAttendant} />
                <MetricRow label="Traditional Birth Attendant" value={reportData?.delivery.tbaAttendant} />
              </div>
            </div>
          </TwoColumnGrid>

          {/* Stillbirth Details */}
          <div className="mt-4 border rounded-lg p-4 bg-gray-50">
            <h4 className="font-bold mb-3">Stillbirth Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <MetricRow label="Fresh Stillbirths" value={reportData?.delivery.stillbirthsFresh} />
              <MetricRow label="Macerated Stillbirths" value={reportData?.delivery.stillbirthsMacerated} />
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* POSTNATAL SECTION */}
        {/* ============================================ */}
        <div className={`p-5 ${activeSection !== 'postnatal' ? 'print:block' : ''}`}>
          <SectionTitle title="POSTNATAL CARE" icon={Users} subtitle="Postnatal services and follow-up" />
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 bg-teal-50 rounded-lg"><div className="text-2xl font-bold text-teal-600">{reportData?.postnatal.newMothers}</div><div className="text-xs">New Mothers</div></div>
            <div className="text-center p-3 bg-blue-50 rounded-lg"><div className="text-2xl font-bold text-blue-600">{reportData?.postnatal.totalVisits}</div><div className="text-xs">Total PNC Visits</div></div>
            <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-2xl font-bold text-green-600">{reportData?.postnatal.exclusiveBreastfeeding}</div><div className="text-xs">Exclusive BF</div></div>
          </div>

          <TwoColumnGrid>
            {/* PNC Timing */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">PNC Timing</h4>
              <div className="space-y-2">
                <MetricRow label="PNC within 48 hours" value={reportData?.postnatal.pncWithin48Hours} />
                <MetricRow label="PNC within 6 weeks" value={reportData?.postnatal.pncWithin6Weeks} />
              </div>
            </div>

            {/* Services */}
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">Postnatal Services</h4>
              <div className="space-y-2">
                <MetricRow label="Family Planning Accepted" value={reportData?.postnatal.familyPlanningAccepted} />
                <MetricRow label="Immunizations Given" value={reportData?.postnatal.immunizationGiven} />
                <MetricRow label="Postnatal Complications" value={reportData?.postnatal.complications} highlight />
              </div>
            </div>
          </TwoColumnGrid>
        </div>

        {/* Footer */}
        <div className="text-center py-4 px-4 border-t text-xs text-gray-400">
          Generated on {new Date(reportData?.generatedAt || '').toLocaleString()} | GHS Form A - Maternal Health Report
        </div>
      </div>
    </div>
  );
};

export default ANCReportView;