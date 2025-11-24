// src/pages/DispenseMedication.tsx - UPDATED VERSION
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import type { Medication, Attendance, Patient, MedicationEntry } from '../types';

// Reusable components
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { DispenseStats } from '../components/reusable/DispenseStats';
import { PrintPrescriptionsSection } from '../components/reusable/PrintPrescriptionsSection';

import {
  ArrowLeft,
  Pill,
  CheckCircle,
  Package,
  Printer,
  RefreshCw,
  AlertCircle,
  Ban
} from 'lucide-react';

// Helper function
const getEntityId = (entity: { id?: string; id?: string } | null): string | undefined => {
  return entity?.id || entity?.id;
};

export default function Pharmacy() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [printingPrescriptionId, setPrintingPrescriptionId] = useState<string | null>(null);
  const [activatingAttendance, setActivatingAttendance] = useState(false);
  const [completingAttendance, setCompletingAttendance] = useState(false);

  // Stores
  const {
    attendances,
    updateAttendance,
    getAttendances,
    updateAttendanceStatus,
    addMedicationToAttendance,
    canAddMedicalEntries,
  } = useAttendanceStore();

  const { patients, loadPatients } = usePatientStore();
  const { stockItems, addTransaction, getStockItems } = useStockStore();
  const { user } = useAuthStore();

  // Load data
  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);

      await Promise.all([
        loadPatients(),
        getAttendances(),
        getStockItems()
      ]);

      success('Data loaded', 'Dispensing ready');
    } catch {
      toastError('Load failed', 'Could not load data. Please try again.');
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
      ]
        .filter(Boolean)
        .map(id => id?.toString())
        .filter(id => id && id !== 'undefined');

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

  // Reset attendance selection when patient changes
  useEffect(() => {
    setSelectedAttendanceId('');
  }, [selectedPatientId]);

  const canAddEntries = selectedAttendance ? canAddMedicalEntries(selectedAttendance) : false;
  const isReadOnly = selectedAttendance && selectedAttendance.status !== 'pending' && selectedAttendance.status !== 'active';

  // Medication data
  const allMedications = selectedAttendance?.medications || [];
  const prescribedMeds = allMedications.filter(m => m.status === 'prescribed');
  const dispensedMeds = allMedications.filter(m => m.status === 'dispensed');

  const totalPendingMeds = prescribedMeds.length;
  const totalDispensedMeds = dispensedMeds.length;
  const dispensedToday = attendances
    .flatMap(a => a.medications || [])
    .filter(m =>
      m.status === 'dispensed' &&
      m.dispensedAt &&
      new Date(m.dispensedAt).toDateString() === new Date().toDateString()
    ).length;

  // Handlers
  const handleRefresh = () => loadData();

  const handleActivateAttendance = async () => {
    if (!selectedAttendanceId || !selectedAttendance) return;

    if (selectedAttendance.status !== 'pending') {
      toastError('Invalid action', 'Only pending attendances can be activated');
      return;
    }

    setActivatingAttendance(true);
    try {
      await updateAttendanceStatus(selectedAttendanceId, 'active');
      success('Activated', 'Ready for dispensing');
      await getAttendances();
    } catch {
      toastError('Failed', 'Could not activate attendance');
    } finally {
      setActivatingAttendance(false);
    }
  };

  const handleCompleteAttendance = async () => {
    if (!selectedAttendanceId || !selectedAttendance) return;

    if (!['active', 'pending', 'admitted'].includes(selectedAttendance.status)) {
      toastError('Invalid action', 'Only active or pending visits can be completed');
      return;
    }

    setCompletingAttendance(true);
    try {
      await updateAttendanceStatus(selectedAttendanceId, 'completed', {
        completedAt: new Date().toISOString()
      });
      success('Visit completed', 'Patient discharged');
      await getAttendances();
    } catch {
      toastError('Failed', 'Could not complete attendance');
    } finally {
      setCompletingAttendance(false);
    }
  };

  const handleCancelAttendance = async () => {
    if (!selectedAttendanceId || !selectedAttendance) return;

    if (selectedAttendance.status === 'completed') {
      toastError('Invalid action', 'Completed visits cannot be cancelled');
      return;
    }

    if (!window.confirm('Cancel this visit? This cannot be undone.')) return;

    try {
      await updateAttendanceStatus(selectedAttendanceId, 'cancelled', {
        cancellationNotes: 'Cancelled by pharmacy',
        cancelledAt: new Date().toISOString()
      });
      success('Cancelled', 'Visit cancelled');
      await getAttendances();
    } catch {
      toastError('Failed', 'Could not cancel attendance');
    }
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setDispensingId(null);
  };

  // Print functions
  const hospitalInfo = {
    name: "MediCare Hospital",
    address: "123 Health Street, Medical City",
    phone: "+1 (555) 123-4567",
    email: "pharmacy@medicarehospital.com"
  };

  const generatePDF = (type: 'prescription', data: any, hospital: any) => {
    const { medication, patient, attendance } = data;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - ${medication.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .info { display: flex; justify-content: space-between; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f4f4f4; }
          .footer { margin-top: 40px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${hospital.name}</h1>
          <p>${hospital.address} | ${hospital.phone}</p>
        </div>
        <div class="info">
          <div>
            <p><strong>Patient:</strong> ${patient.fullName}</p>
            <p><strong>Folder #:</strong> ${patient.folderNumber || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Visit #:</strong> ${attendance.attendanceNumber}</p>
          </div>
        </div>
        <h3>Prescription</h3>
        <table>
          <tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Qty</th></tr>
          <tr>
            <td>${medication.name}</td>
            <td>${medication.dosage}</td>
            <td>${medication.frequency}</td>
            <td>${medication.duration}</td>
            <td>${medication.quantity}</td>
          </tr>
        </table>
        <p><strong>Instructions:</strong> ${medication.instructions || 'Take as directed'}</p>
        <div class="footer">
          <p>Pharmacy: ${hospital.email}</p>
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

  const handlePrintPrescription = async (medication: Medication) => {
    if (!selectedPatient || !selectedAttendance) {
      toastError('Missing info', 'Patient or visit not selected');
      return;
    }
    setPrintingPrescriptionId(getEntityId(medication));
    try {
      const html = generatePDF('prescription', { medication, patient: selectedPatient, attendance: selectedAttendance }, hospitalInfo);
      openPrintWindow(html, `Prescription - ${medication.name}`);
    } catch {
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
        <head><title>All Prescriptions</title>
          <style>
            .page { page-break-after: always; margin: 40px; }
            .page:last-child { page-break-after: avoid; }
          </style>
        </head>
        <body>${pages.map(p => `<div class="page">${p}</div>`).join('')}</body>
        </html>
      `;
      openPrintWindow(combined, `All Prescriptions - ${selectedPatient.fullName}`);
      success(`${prescribedMeds.length} prescriptions', 'Ready to print`);
    } catch {
      toastError('Print failed', 'Could not generate all prescriptions');
    }
  };

  // Dispense function
  const handleDispense = async (medicationId: string) => {
    if (!selectedAttendanceId) return;
    const attendance = attendances.find(a => getEntityId(a) === selectedAttendanceId);
    if (!attendance) return toastError('Not found', 'Attendance missing');

    if (attendance.status !== 'active' && attendance.status !== 'pending' && attendance.status !== 'admitted') {
      return toastError('Cannot dispense', 'Attendance must be active or pending');
    }

    if (isReadOnly) {
      return toastError('Read Only', 'Cannot dispense for completed attendance');
    }

    const medication = attendance.medications?.find(m => getEntityId(m) === medicationId);
    if (!medication) return toastError('Not found', 'Medication missing');

    const stockItem = stockItems.find(s => 
      s.id === medication.stockItemId || s.id === medication.stockItemId
    );
    if (!stockItem || stockItem.currentStock < medication.quantity) {
      return toastError('Low stock', `Only ${stockItem?.currentStock || 0} available`);
    }

    setDispensingId(medicationId);
    try {
      const updatedMeds = attendance.medications?.map(m =>
        getEntityId(m) === medicationId
          ? { 
              ...m, 
              status: 'dispensed', 
              dispensedAt: new Date().toISOString(), 
              dispensedById: user?.id || user?.id || ''
            }
          : m
      );
      await updateAttendance(selectedAttendanceId, { medications: updatedMeds });
      
      await addTransaction({
        stockItemId: medication.stockItemId!,
        transactionType: 'dispense',
        quantity: medication.quantity,
        balanceAfter: (stockItem.currentStock - medication.quantity),
        reference: `Dispensed for ${attendance.attendanceNumber}`,
        notes: `Dispensed: ${medication.name} for patient ${selectedPatient?.fullName}`,
        performedById: user?.id || user?.id || '',
        transactionDate: new Date().toISOString()
      });
      
      success(`${medication.name}`, 'Dispensed successfully');
      await getAttendances();
      await getStockItems();
    } catch {
      toastError('Dispense failed', 'Try again');
    } finally {
      setDispensingId(null);
    }
  };

  // Dispense all function
  const handleDispenseAll = async () => {
    if (!selectedAttendanceId) return;
    const attendance = attendances.find(a => getEntityId(a) === selectedAttendanceId);
    if (!attendance || (attendance.status !== 'active' && attendance.status !== 'pending' && attendance.status !== 'admitted')) {
      return toastError('Cannot dispense', 'Attendance must be active or pending');
    }

    if (isReadOnly) {
      return toastError('Read Only', 'Cannot dispense for completed attendance');
    }

    const meds = attendance.medications?.filter(m => m.status === 'prescribed') || [];
    
    // Check stock for all medications first
    for (const med of meds) {
      const stock = stockItems.find(s => 
        s.id === med.stockItemId || s.id === med.stockItemId
      );
      if (!stock || stock.currentStock < med.quantity) {
        return toastError('Low stock', `${med.name} insufficient stock`);
      }
    }

    setDispensingId('all');
    try {
      const updated = attendance.medications?.map(m =>
        m.status === 'prescribed'
          ? { 
              ...m, 
              status: 'dispensed', 
              dispensedAt: new Date().toISOString(), 
              dispensedById: user?.id || user?.id || ''
            }
          : m
      );
      await updateAttendance(selectedAttendanceId, { medications: updated });
      
      // Create transactions for all medications
      for (const med of meds) {
        const stock = stockItems.find(s => 
          s.id === med.stockItemId || s.id === med.stockItemId
        );
        if (stock) {
          await addTransaction({
            stockItemId: med.stockItemId!,
            transactionType: 'dispense',
            quantity: med.quantity,
            balanceAfter: (stock.currentStock - med.quantity),
            reference: `Bulk dispense - ${attendance.attendanceNumber}`,
            notes: `Dispensed: ${med.name} for patient ${selectedPatient?.fullName}`,
            performedById: user?.id || user?.id || '',
            transactionDate: new Date().toISOString()
          });
        }
      }
      
      success('All medications dispensed', 'Stock updated');
      await getAttendances();
      await getStockItems();
    } catch {
      toastError('Bulk dispense failed', 'Try again');
    } finally {
      setDispensingId(null);
    }
  };

  // Add medication function
  const handleAddMedication = async (medicationData: MedicationEntry) => {
    if (!selectedAttendanceId) return toastError('Select visit', 'Choose an attendance first');
    if (!selectedPatientId) return toastError('Select patient', 'Choose a patient first');

    if (isReadOnly) {
      return toastError('Read Only', 'Cannot add medications to completed attendance');
    }

    const stockItem = stockItems.find(s => 
      s.id === medicationData.stockItemId || s.id === medicationData.stockItemId
    );
    if (!stockItem) return toastError('Not found', 'Stock item missing');
    if (stockItem.currentStock < medicationData.quantity) {
      return toastError('Low stock', `Only ${stockItem.currentStock} available`);
    }

    setIsAddingMedication(true);
    try {
      const newMed: Medication = {
        id: `med-${Date.now()}`,
        attendanceId: selectedAttendanceId,
        patientId: selectedPatientId,
        stockItemId: medicationData.stockItemId,
        name: stockItem.name,
        dosage: medicationData.dosage,
        frequency: medicationData.frequency,
        duration: medicationData.duration,
        quantity: medicationData.quantity,
        route: medicationData.route || 'oral',
        instructions: medicationData.instructions,
        status: 'prescribed',
        prescribedAt: new Date().toISOString(),
        prescribedById: user?.id || user?.id || '',
        cashPrice: stockItem.cashPrice || 0,
        insurancePrice: stockItem.insurancePrice || 0,
        costPrice: stockItem.costPrice || 0,
        isActive: true,
        requiresAuthorization: stockItem.requiresAuthorization || false,
        tariffCode: stockItem.tariffCode,
        vatRate: stockItem.vatRate || 0,
        isTaxable: stockItem.isTaxable || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addMedicationToAttendance(selectedAttendanceId, newMed);
      success('Medication added', 'Ready to dispense');
      await getAttendances();
    } catch {
      toastError('Add failed', 'Could not add medication');
    } finally {
      setIsAddingMedication(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Pill className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Medication Dispensing</h1>
            <p className="text-sm text-gray-600">Dispense, manage, and print prescriptions</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/medical-entries')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm text-gray-700"
          >
            <Package className="w-4 h-4" />
            Medical Entries
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 text-sm text-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <DispenseStats
          totalPending={totalPendingMeds}
          totalDispensed={totalDispensedMeds}
          dispensedToday={dispensedToday}
          readyToPrint={totalPendingMeds}
        />

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

        {/* Patient & Visit Overview */}
        {selectedPatient && selectedAttendance && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Pill className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedPatient.fullName}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>{selectedPatient.age} years • {selectedPatient.gender}</span>
                    <span>•</span>
                    <span>ID: {selectedPatient.folderNumber}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {selectedAttendance.attendanceNumber || 'Current Visit'}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedAttendance.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedAttendance.status === 'active' ? 'bg-green-100 text-green-800' :
                    selectedAttendance.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    selectedAttendance.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedAttendance.status}
                  </span>
                  <span>{new Date(selectedAttendance.dateTime || selectedAttendance.createdAt || '').toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Actions */}
        {selectedAttendance && (
          <AttendanceActions
            attendance={selectedAttendance}
            onActivate={handleActivateAttendance}
            onComplete={handleCompleteAttendance}
            onCancel={handleCancelAttendance}
            isActivating={activatingAttendance}
            isCompleting={completingAttendance}
          />
        )}

        {/* Main Content */}
        {selectedAttendance && (
          <div className="space-y-6">
            {/* Read-only indicator */}
            {isReadOnly && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-yellow-600" />
                  <p className="text-yellow-800 font-medium">View Only Mode</p>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  This visit is {selectedAttendance.status}. Medications can be viewed but not modified.
                </p>
              </div>
            )}

            {/* Print Section */}
            <PrintPrescriptionsSection
              prescribedMeds={prescribedMeds}
              selectedPatient={selectedPatient}
              selectedAttendance={selectedAttendance}
              onPrintAll={handlePrintAllPrescriptions}
              onPrintSingle={handlePrintPrescription}
              printingPrescriptionId={printingPrescriptionId}
              isReadOnly={isReadOnly}
            />

            {/* Medications for Dispensing */}
            {prescribedMeds.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-yellow-600" />
                    Medications Ready for Dispensing ({prescribedMeds.length})
                  </h3>
                  {!isReadOnly && (
                    <button
                      onClick={handleDispenseAll}
                      disabled={dispensingId === 'all'}
                      className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50 font-medium"
                    >
                      {dispensingId === 'all' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Dispensing All...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Dispense All
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {prescribedMeds.map((medication) => (
                    <div
                      key={getEntityId(medication)}
                      className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{medication.name}</h4>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            Pending
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Dosage:</span> {medication.dosage}
                          </div>
                          <div>
                            <span className="font-medium">Frequency:</span> {medication.frequency}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {medication.duration}
                          </div>
                          <div>
                            <span className="font-medium">Qty:</span> {medication.quantity}
                          </div>
                        </div>
                        {medication.instructions && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Instructions:</span> {medication.instructions}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handlePrintPrescription(medication)}
                          disabled={printingPrescriptionId === getEntityId(medication)}
                          className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        
                        {!isReadOnly && (
                          <button
                            onClick={() => handleDispense(getEntityId(medication)!)}
                            disabled={dispensingId === getEntityId(medication)}
                            className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50 text-sm font-medium"
                          >
                            {dispensingId === getEntityId(medication) ? (
                              <>
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Dispensing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Dispense
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dispensed Medications */}
            {dispensedMeds.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Dispensed Medications ({dispensedMeds.length})
                </h3>
                
                <div className="space-y-3">
                  {dispensedMeds.map((medication) => (
                    <div
                      key={getEntityId(medication)}
                      className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{medication.name}</h4>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Dispensed
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Dosage:</span> {medication.dosage}
                          </div>
                          <div>
                            <span className="font-medium">Frequency:</span> {medication.frequency}
                          </div>
                          <div>
                            <span className="font-medium">Qty:</span> {medication.quantity}
                          </div>
                          <div>
                            <span className="font-medium">Dispensed:</span>{" "}
                            {medication.dispensedAt ? new Date(medication.dispensedAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Medication Section - Only show for active/pending */}
            {!isReadOnly && (
              <AddMedicationsSection
                onAddMedication={handleAddMedication}
                stockItems={stockItems}
                isAddingMedication={isAddingMedication}
              />
            )}
          </div>
        )}

        {/* Empty States */}
        {selectedPatientId && !selectedAttendanceId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Attendance Selected</h3>
            <p className="text-yellow-700 mb-4">Please select an existing attendance to dispense medications.</p>
          </div>
        )}

        {selectedAttendance && !canAddEntries && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <Ban className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Cannot Dispense Medications</h3>
            <p className="text-red-700">
              This attendance is <span className="font-bold">{selectedAttendance.status}</span> and cannot be modified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading Screen
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="w-14 h-14 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <h2 className="text-xl font-bold text-gray-900">Loading Pharmacy...</h2>
      <p className="text-gray-600 text-sm mt-1">Fetching patient and medication data</p>
    </div>
  </div>
);

// Add Medications Section Component
const AddMedicationsSection: React.FC<{
  onAddMedication: (med: MedicationEntry) => void;
  stockItems: any[];
  isAddingMedication: boolean;
}> = ({ onAddMedication, stockItems, isAddingMedication }) => {
  const [currentMed, setCurrentMed] = useState<MedicationEntry>({
    stockItemId: '',
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: 1,
    route: 'oral',
    instructions: '',
    status: 'prescribed',
    prescribedBy: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMedication(currentMed);
    setCurrentMed({
      stockItemId: '',
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: 1,
      route: 'oral',
      instructions: '',
      status: 'prescribed',
      prescribedBy: ''
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Pill className="w-5 h-5 text-purple-600" />
        Add New Medication
      </h3>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Medication
          </label>
          <select
            value={currentMed.stockItemId}
            onChange={(e) => {
              const stockItem = stockItems.find(s => 
                s.id === e.target.value || s.id === e.target.value
              );
              setCurrentMed(prev => ({
                ...prev,
                stockItemId: e.target.value,
                name: stockItem?.name || ''
              }));
            }}
            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            required
          >
            <option value="">Select medication</option>
            {stockItems.map(item => (
              <option key={item.id || item.id} value={item.id || item.id}>
                {item.name} ({item.currentStock} in stock)
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dosage
          </label>
          <input
            type="text"
            value={currentMed.dosage}
            onChange={(e) => setCurrentMed(prev => ({ ...prev, dosage: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            placeholder="e.g., 500mg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Frequency
          </label>
          <input
            type="text"
            value={currentMed.frequency}
            onChange={(e) => setCurrentMed(prev => ({ ...prev, frequency: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            placeholder="e.g., 3 times daily"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration
          </label>
          <input
            type="text"
            value={currentMed.duration}
            onChange={(e) => setCurrentMed(prev => ({ ...prev, duration: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            placeholder="e.g., 7 days"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            value={currentMed.quantity}
            onChange={(e) => setCurrentMed(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            min="1"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instructions
          </label>
          <input
            type="text"
            value={currentMed.instructions}
            onChange={(e) => setCurrentMed(prev => ({ ...prev, instructions: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            placeholder="Additional instructions"
          />
        </div>
        
        <div className="md:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={isAddingMedication}
            className="flex items-center gap-2 px-6 py-3 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-600 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            {isAddingMedication ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Pill className="w-4 h-4" />
                Add Medication
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};