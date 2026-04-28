// src/pages/DispenseMedication.tsx - COMPLETE REDESIGN
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';

import {
  ChevronLeft,
  Pill,
  CheckCircle,
  Package,
  Printer,
  RefreshCw,
  AlertCircle,
  Ban,
  Clock,
  User,
  Activity,
  DollarSign,
  FileText,
  TrendingUp,
  AlertTriangle,
  X,
} from 'lucide-react';

// Helper function
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?.id || entity?._id;
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> },
    admitted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Activity className="w-3 h-3" /> },
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: <Ban className="w-3 h-3" /> },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Loading Screen
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
    <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
      <div className="w-14 h-14 border-4 border-[var(--icon-purple-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Pharmacy...</h2>
      <p className="text-[var(--text-secondary)] text-sm mt-1">Fetching patient and medication data</p>
    </div>
  </div>
);

export default function Pharmacy() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [printingPrescriptionId, setPrintingPrescriptionId] = useState<string | null>(null);

  const hasLoaded = useRef(false);

  // Stores
  const {
    attendances,
    getAttendances,
    updateAttendanceStatus,
    updateMedicationStatus,
    canAddMedicalEntries,
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { stockItems, getStockItems } = useStockStore();
  const { user } = useAuthStore();

  // Load data
  const loadData = async (force = false) => {
    if (!force && hasLoaded.current) return;
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([loadPatients(), getAttendances(), getStockItems()]);
      hasLoaded.current = true;
      success('Data loaded', 'Dispensing ready');
    } catch (err: any) {
      toastError('Load failed', err.message || 'Could not load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Patient matching logic
  const patientAttendances = useMemo(() => {
    if (!selectedPatientId || !attendances.length) return [];
    const filtered = attendances.filter(attendance => {
      const possiblePatientIds = [
        attendance.patientId,
        attendance.patient?.id,
        attendance.data?.patientId
      ].filter(Boolean).map(id => id?.toString()).filter(id => id && id !== 'undefined');
      return possiblePatientIds.includes(selectedPatientId);
    });
    return filtered
      .sort((a, b) => new Date(b.dateTime || b.createdAt || '').getTime() - new Date(a.dateTime || a.createdAt || '').getTime())
      .map(attendance => ({
        ...attendance,
        patient: patients.find(p => getEntityId(p) === selectedPatientId) || attendance.patient
      }));
  }, [attendances, selectedPatientId, patients]);

  const selectedPatient = patients.find(p => getEntityId(p) === selectedPatientId);
  const selectedAttendance = patientAttendances.find(a => getEntityId(a) === selectedAttendanceId);

  useEffect(() => {
    setSelectedAttendanceId('');
  }, [selectedPatientId]);

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;
  const isReadOnly = selectedAttendance && selectedAttendance.status !== 'pending' && selectedAttendance.status !== 'admitted';

  // Medications from attendance
  const allMedications = (selectedAttendance?.Medication || []).map((med: any) => ({
    ...med,
    id: med.id,
    name: med.name,
    dosage: med.dosage,
    frequency: med.frequency,
    duration: med.duration,
    quantity: med.quantity,
    route: med.route,
    instructions: med.instructions,
    status: med.status,
    prescribedAt: med.prescribedAt,
    dispensedAt: med.dispensedAt,
    stockItemId: med.stockItemId,
    unitCost: med.dispensedUnitCost,
  }));

  const prescribedMeds = allMedications.filter(m => m.status === 'prescribed');
  const dispensedMeds = allMedications.filter(m => m.status === 'dispensed');

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setDispensingId(null);
  };

  const handleRefresh = () => loadData(true);

  // Hospital info for printing
  const hospitalInfo = {
    name: "Veridian Hospital",
    address: "123 Health Street, Medical City",
    phone: "+233 (0) 30 123 4567",
    email: "pharmacy@veridianhospital.com"
  };

  const generatePDF = (type: 'prescription', data: any, hospital: any) => {
    const { medication, patient, attendance } = data;
    const patientName = `${patient.surname || ''} ${patient.otherNames || ''}`.trim();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - ${medication.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .info { display: flex; justify-content: space-between; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f4f4f4; }
          .footer { margin-top: 40px; text-align: center; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          .signature { margin-top: 40px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${hospital.name}</h1>
          <p>${hospital.address} | ${hospital.phone} | ${hospital.email}</p>
        </div>
        <div class="info">
          <div>
            <p><strong>Patient:</strong> ${patientName}</p>
            <p><strong>Folder #:</strong> ${patient.folderNumber || 'N/A'}</p>
            <p><strong>Age/Gender:</strong> ${patient.age || '?'}y / ${patient.gender || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Visit #:</strong> ${attendance.attendanceNumber}</p>
            <p><strong>Prescribed By:</strong> Dr. ${medication.prescribedBy?.fullName || 'Staff'}</p>
          </div>
        </div>
        <h3>Prescription</h3>
        <table>
          <tr><th>Medication</th><td>${medication.name}</td></tr>
          <tr><th>Dosage</th><td>${medication.dosage}</td></tr>
          <tr><th>Frequency</th><td>${medication.frequency}</td></tr>
          <tr><th>Duration</th><td>${medication.duration}</td></tr>
          <tr><th>Quantity</th><td>${medication.quantity}</td></tr>
          <tr><th>Route</th><td>${medication.route || 'Oral'}</td></tr>
        </table>
        <p><strong>Instructions:</strong> ${medication.instructions || 'Take as directed by physician'}</p>
        <div class="signature">
          <div>_____________________<br/>Pharmacist's Signature</div>
          <div>_____________________<br/>Patient's Signature</div>
        </div>
        <div class="footer">
          <p>This is a computer-generated prescription. Valid with original signature.</p>
        </div>
      </body>
      </html>
    `;
  };

  const openPrintWindow = (html: string, title: string) => {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.title = title;
      printWin.document.close();
      printWin.focus();
      printWin.print();
      printWin.close();
      success('Prescription opened', 'Ready to print.');
    } else {
      toastError('Print failed', 'Please allow popups.');
    }
  };

  const handlePrintPrescription = async (medication: any) => {
    if (!selectedPatient || !selectedAttendance) {
      toastError('Missing info', 'Patient or visit not selected');
      return;
    }
    setPrintingPrescriptionId(getEntityId(medication));
    try {
      const html = generatePDF('prescription', { medication, patient: selectedPatient, attendance: selectedAttendance }, hospitalInfo);
      openPrintWindow(html, `Prescription - ${medication.name}`);
    } catch (err) {
      toastError('Print failed', 'Could not generate prescription');
    } finally {
      setPrintingPrescriptionId(null);
    }
  };

  const handlePrintAllPrescriptions = async () => {
    if (!selectedPatient || !selectedAttendance || prescribedMeds.length === 0) {
      toastError('No prescriptions', 'Nothing to print');
      return;
    }
    try {
      const pages = prescribedMeds.map(med =>
        generatePDF('prescription', { medication: med, patient: selectedPatient, attendance: selectedAttendance }, hospitalInfo)
      );
      const combined = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>All Prescriptions</title>
          <style>
            .page { page-break-after: always; margin: 40px; }
            .page:last-child { page-break-after: avoid; }
          </style>
        </head>
        <body>${pages.map(p => `<div class="page">${p}</div>`).join('')}</body>
        </html>
      `;
      openPrintWindow(combined, `All Prescriptions - ${selectedPatient.surname} ${selectedPatient.otherNames}`);
      success(`${prescribedMeds.length} prescriptions`, 'Ready to print');
    } catch (err) {
      toastError('Print failed', 'Could not generate all prescriptions');
    }
  };

  const handleDispense = async (medicationId: string) => {
    if (!selectedAttendanceId) return;
    const attendance = attendances.find(a => getEntityId(a) === selectedAttendanceId);
    if (!attendance || (attendance.status !== 'pending' && attendance.status !== 'admitted')) {
      return toastError('Cannot dispense', 'Attendance must be active or pending');
    }
    if (isReadOnly) {
      return toastError('Read Only', 'Cannot dispense for completed attendance');
    }

    const medication = allMedications.find(m => getEntityId(m) === medicationId);
    if (!medication) return toastError('Not found', 'Medication missing');

    const stockItem = stockItems.find(s => s.id === medication.stockItemId);
    
    if (!stockItem || stockItem.currentStock < medication.quantity) {
      return toastError('Low stock', `Only ${stockItem?.currentStock || 0} available`);
    }

    setDispensingId(medicationId);
    try {
      const response = await fetch(`/api/attendances/${selectedAttendanceId}/medications/${medicationId}/dispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ quantity: medication.quantity, dispensedBy: user?.id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Dispense failed');
      }

      success(`${medication.name}`, 'Dispensed successfully');
      await getAttendances();
      await getStockItems();
    } catch (err: any) {
      toastError('Dispense failed', err.message);
    } finally {
      setDispensingId(null);
    }
  };

  const handleDispenseAll = async () => {
    if (!selectedAttendanceId) return;
    const attendance = attendances.find(a => getEntityId(a) === selectedAttendanceId);
    if (!attendance || (attendance.status !== 'pending' && attendance.status !== 'admitted')) {
      return toastError('Cannot dispense', 'Attendance must be active or pending');
    }
    if (isReadOnly) {
      return toastError('Read Only', 'Cannot dispense for completed attendance');
    }

    const meds = allMedications.filter(m => m.status === 'prescribed');
    
    for (const med of meds) {
      const stock = stockItems.find(s => s.id === med.stockItemId);
      if (!stock || stock.currentStock < med.quantity) {
        return toastError('Low stock', `${med.name} insufficient stock`);
      }
    }

    setDispensingId('all');
    try {
      for (const med of meds) {
        const response = await fetch(`/api/attendances/${selectedAttendanceId}/medications/${med.id}/dispense`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ quantity: med.quantity, dispensedBy: user?.id })
        });
        if (!response.ok) throw new Error(`Failed to dispense ${med.name}`);
      }
      success('All medications dispensed', 'Stock updated');
      await getAttendances();
      await getStockItems();
    } catch (err: any) {
      toastError('Bulk dispense failed', err.message);
    } finally {
      setDispensingId(null);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all duration-200 border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <Pill className="w-5 h-5 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Medication Dispensing</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Dispense, manage, and print prescriptions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/medical-entries')}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm"
          >
            <FileText className="w-4 h-4" />
            Medical Entries
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Patient & Attendance Selection */}
      <PatientAttendanceSelector
        patients={patients}
        attendances={attendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={setSelectedPatientId}
        onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={handleClearSelection}
      />

      {/* Patient & Visit Header */}
      {selectedPatient && selectedAttendance && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--icon-purple-bg)] to-[var(--icon-purple-text)] flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-[var(--text-primary)] text-base">
                    {selectedPatient.surname} {selectedPatient.otherNames}
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {selectedPatient.gender === 'male' ? '👨' : '👩'} • {selectedPatient.age || '?'}y
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[10px] bg-[var(--bg-main)] px-1.5 py-0.5 rounded">#{selectedPatient.folderNumber}</span>
                  <span>•</span>
                  <span>{selectedPatient.contact}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  📋 {selectedAttendance.attendanceNumber || 'New Visit'}
                </span>
              </div>
              <div className="bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  📅 {new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}
                </span>
              </div>
              <StatusBadge status={selectedAttendance.status} />
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {selectedAttendance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{prescribedMeds.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Pending Dispense</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{dispensedMeds.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Dispensed</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Printer className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{prescribedMeds.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Ready to Print</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {prescribedMeds.length > 0 ? Math.round((dispensedMeds.length / (prescribedMeds.length + dispensedMeds.length)) * 100) : 0}%
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Completion Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedAttendance ? (
        <div className="space-y-6">
          {/* Read-only indicator */}
          {isReadOnly && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                This visit is <strong>{selectedAttendance.status}</strong>. Medications can be viewed but not modified.
              </p>
            </div>
          )}

          {/* Print Section */}
          {prescribedMeds.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Printer className="w-4 h-4 text-purple-600" />
                  Print Prescriptions ({prescribedMeds.length})
                </h3>
                <button
                  onClick={handlePrintAllPrescriptions}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-700 hover:text-white transition-all"
                >
                  <Printer className="w-3 h-3" />
                  Print All
                </button>
              </div>
              <div className="divide-y divide-[var(--border-color)] max-h-[200px] overflow-y-auto">
                {prescribedMeds.map((med) => (
                  <div key={med.id} className="p-3 hover:bg-[var(--bg-main)] flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{med.name}</span>
                      <div className="text-xs text-[var(--text-secondary)]">{med.dosage} • {med.frequency}</div>
                    </div>
                    <button
                      onClick={() => handlePrintPrescription(med)}
                      disabled={printingPrescriptionId === med.id}
                      className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medications Ready for Dispensing */}
          {prescribedMeds.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Package className="w-4 h-4 text-yellow-600" />
                  Ready for Dispensing ({prescribedMeds.length})
                </h3>
                {!isReadOnly && (
                  <button
                    onClick={handleDispenseAll}
                    disabled={dispensingId === 'all'}
                    className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-700 hover:text-white transition-all disabled:opacity-50"
                  >
                    {dispensingId === 'all' ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    Dispense All
                  </button>
                )}
              </div>
              <div className="divide-y divide-[var(--border-color)]">
                {prescribedMeds.map((med) => {
                  const stockItem = stockItems.find(s => s.id === med.stockItemId);
                  const hasStock = stockItem && stockItem.currentStock >= med.quantity;
                  const isLowStock = stockItem && stockItem.currentStock < med.quantity && stockItem.currentStock > 0;
                  
                  return (
                    <div key={med.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-[var(--text-primary)]">{med.name}</span>
                            <StatusBadge status={med.status} />
                            {!hasStock && stockItem && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                <AlertTriangle className="w-3 h-3" />
                                Out of Stock
                              </span>
                            )}
                            {isLowStock && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                <AlertCircle className="w-3 h-3" />
                                Low Stock: {stockItem.currentStock} left
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-xs">
                            <div><span className="text-[var(--text-secondary)]">Dosage:</span> <span className="font-medium">{med.dosage}</span></div>
                            <div><span className="text-[var(--text-secondary)]">Frequency:</span> <span className="font-medium">{med.frequency}</span></div>
                            <div><span className="text-[var(--text-secondary)]">Duration:</span> <span className="font-medium">{med.duration}</span></div>
                            <div><span className="text-[var(--text-secondary)]">Qty:</span> <span className="font-medium">{med.quantity}</span></div>
                          </div>
                          {med.instructions && (
                            <p className="text-xs text-[var(--text-secondary)] mt-2">{med.instructions}</p>
                          )}
                          {stockItem && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                              Stock: <span className={hasStock ? 'text-green-600' : 'text-red-600'}>{stockItem.currentStock} units</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePrintPrescription(med)}
                            disabled={printingPrescriptionId === med.id}
                            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                            title="Print Prescription"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {!isReadOnly && (
                            <button
                              onClick={() => handleDispense(med.id)}
                              disabled={dispensingId === med.id || !hasStock}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                hasStock
                                  ? 'bg-green-100 text-green-700 hover:bg-green-700 hover:text-white'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {dispensingId === med.id ? (
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Dispense
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dispensed Medications */}
          {dispensedMeds.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Dispensed Medications ({dispensedMeds.length})
                </h3>
              </div>
              <div className="divide-y divide-[var(--border-color)]">
                {dispensedMeds.map((med) => (
                  <div key={med.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[var(--text-primary)]">{med.name}</span>
                          <StatusBadge status={med.status} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-xs">
                          <div><span className="text-[var(--text-secondary)]">Dosage:</span> <span className="font-medium">{med.dosage}</span></div>
                          <div><span className="text-[var(--text-secondary)]">Frequency:</span> <span className="font-medium">{med.frequency}</span></div>
                          <div><span className="text-[var(--text-secondary)]">Qty:</span> <span className="font-medium">{med.quantity}</span></div>
                          <div><span className="text-[var(--text-secondary)]">Dispensed:</span> <span className="font-medium">{med.dispensedAt ? new Date(med.dispensedAt).toLocaleDateString() : 'N/A'}</span></div>
                        </div>
                        {med.unitCost && (
                          <p className="text-xs text-[var(--text-secondary)] mt-2">
                            Unit Cost: GHS {med.unitCost.toFixed(2)} • Total: GHS {(med.unitCost * med.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Medications Message */}
          {allMedications.length === 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-8 text-center">
              <Package className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Medications</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                No medications have been prescribed for this visit.
              </p>
              <button
                onClick={() => navigate('/dashboard/medical-entries')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm"
              >
                <Pill className="w-4 h-4" />
                Go to Medical Entries
              </button>
            </div>
          )}
        </div>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-1">No Attendance Selected</h3>
          <p className="text-sm text-yellow-700">Please select an attendance to dispense medications</p>
        </div>
      ) : null}
    </div>
  );
}