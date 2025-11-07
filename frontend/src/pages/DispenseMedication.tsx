// src/pages/DispenseMedication.tsx - UPDATED WITH PRESCRIPTION PRINTING
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { MedicationsSection } from '../components/medical-entries';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import type { Medication, Attendance, Patient, StockItem, MedicationEntry } from '../types';
import {
  Search,
  Package,
  CheckCircle,
  AlertCircle,
  Hospital,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  User,
  Calendar,
  Pill,
  Activity,
  Printer,
  FileText
} from 'lucide-react';

// 🔑 Helper to get consistent ID
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

export default function DispenseMedication() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [activatingAttendanceId, setActivatingAttendanceId] = useState<string | null>(null);
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [printingPrescriptionId, setPrintingPrescriptionId] = useState<string | null>(null);

  const { 
    attendances, 
    updateAttendance, 
    getAttendances, 
    updateAttendanceStatus, 
    canPerformActivities, 
    activateAttendance,
    addMedicationToAttendance
  } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { stockItems, addTransaction, getStockItems } = useStockStore();
  const { user } = useAuthStore();

  useEffect(() => {
    getAttendances();
    loadPatients();
    getStockItems();
  }, [getAttendances, loadPatients, getStockItems]);

  // Enhanced patient matching function
  const findPatient = (attendance: any) => {
    if (attendance?.patient?.fullName) {
      return attendance.patient;
    }

    let actualPatientId: string | null = null;
    
    if (attendance.patientId && typeof attendance.patientId === 'object') {
      actualPatientId = (
        attendance.patientId._id ||
        attendance.patientId.id ||
        attendance.patientId.patientId ||
        attendance.patientId.patientID
      )?.toString();
    } else if (attendance.patientId) {
      actualPatientId = attendance.patientId.toString();
    }

    if (actualPatientId) {
      const patient = patients.find(p => {
        const patientId = getEntityId(p);
        return patientId === actualPatientId;
      });
      if (patient) return patient;
    }

    if (attendance.patient && typeof attendance.patient === 'object') {
      const patientObjId = getEntityId(attendance.patient);
      if (patientObjId) {
        const patient = patients.find(p => getEntityId(p) === patientObjId);
        if (patient) return patient;
      }
    }

    return null;
  };

  // Get attendances with proper patient data
  const attendancesWithPatients = attendances.map(attendance => ({
    ...attendance,
    patient: findPatient(attendance)
  }));

  // Filter patients based on search term
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contact.includes(searchQuery) ||
      p.folderNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get attendances for selected patient
  const patientAttendances = attendancesWithPatients.filter((attendance: Attendance) => {
    const patient = attendance.patient;
    return patient && (getEntityId(patient) === selectedPatientId);
  });

  // Get the latest pending attendance for auto-selection
  const getLatestPendingAttendance = () => {
    const pendingAttendances = patientAttendances.filter(a => a.status === 'pending');
    return pendingAttendances.sort((a, b) => 
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    )[0];
  };

  // Auto-select latest pending attendance when patient is selected
  useEffect(() => {
    if (selectedPatientId && patientAttendances.length > 0) {
      const latestPending = getLatestPendingAttendance();
      if (latestPending) {
        setSelectedAttendanceId(getEntityId(latestPending) || '');
      } else {
        setSelectedAttendanceId(getEntityId(patientAttendances[0]) || '');
      }
    }
  }, [selectedPatientId, patientAttendances]);

  // Get selected entities
  const selectedPatient = patients.find((p) => getEntityId(p) === selectedPatientId);
  const selectedAttendance = attendancesWithPatients.find((a) => getEntityId(a) === selectedAttendanceId);

  // Get medications for selected attendance
  const allMedications = selectedAttendance?.medications || [];
  const prescribedMeds = allMedications.filter((m) => m.status === 'prescribed');
  const dispensedMeds = allMedications.filter((m) => m.status === 'dispensed');

  // Stats
  const totalPendingMeds = prescribedMeds.length;
  const totalDispensedMeds = dispensedMeds.length;

  const dispensedToday = attendancesWithPatients
    .flatMap(a => a.medications || [])
    .filter(m => 
      m.status === 'dispensed' &&
      m.dispensedAt &&
      new Date(m.dispensedAt).toDateString() === new Date().toDateString()
    ).length;

  // Hospital info for PDF generation
  const hospitalInfo = {
    name: "MediCare Hospital",
    address: "123 Health Street, Medical City",
    phone: "+1 (555) 123-4567",
    email: "pharmacy@medicarehospital.com"
  };

  // Print prescription
  const handlePrintPrescription = async (medication: Medication) => {
    if (!selectedPatient || !selectedAttendance) {
      setMessage({ type: 'error', text: 'Patient or attendance information missing' });
      return;
    }

    setPrintingPrescriptionId(getEntityId(medication));
    try {
      const htmlContent = generatePDF('prescription', {
        medication,
        patient: selectedPatient,
        attendance: selectedAttendance
      }, hospitalInfo);

      openPrintWindow(htmlContent, `Prescription - ${medication.name}`);
      
      setMessage({ type: 'success', text: 'Prescription generated successfully!' });
    } catch (error: any) {
      console.error('Error generating prescription:', error);
      setMessage({ type: 'error', text: 'Failed to generate prescription' });
    } finally {
      setPrintingPrescriptionId(null);
    }
  };

  // Print all prescriptions
  const handlePrintAllPrescriptions = async () => {
    if (!selectedPatient || !selectedAttendance || prescribedMeds.length === 0) {
      setMessage({ type: 'error', text: 'No prescriptions to print' });
      return;
    }

    try {
      // Generate individual prescriptions and combine them
      const prescriptionHTMLs = prescribedMeds.map(medication => 
        generatePDF('prescription', {
          medication,
          patient: selectedPatient,
          attendance: selectedAttendance
        }, hospitalInfo)
      );

      // Combine all prescriptions into one print window
      const combinedHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>All Prescriptions - ${selectedPatient.fullName}</title>
          <style>
            .prescription-page {
              page-break-after: always;
              margin-bottom: 40px;
            }
            .prescription-page:last-child {
              page-break-after: avoid;
            }
          </style>
        </head>
        <body>
          ${prescriptionHTMLs.map(html => 
            `<div class="prescription-page">${html}</div>`
          ).join('')}
        </body>
        </html>
      `;

      openPrintWindow(combinedHTML, `All Prescriptions - ${selectedPatient.fullName}`);
      
      setMessage({ type: 'success', text: `Generated ${prescribedMeds.length} prescriptions!` });
    } catch (error: any) {
      console.error('Error generating prescriptions:', error);
      setMessage({ type: 'error', text: 'Failed to generate prescriptions' });
    }
  };

  // Activate attendance
  const handleActivateAttendance = async (attendanceId: string) => {
    setActivatingAttendanceId(attendanceId);
    setMessage(null);
    try {
      await activateAttendance(attendanceId);
      await getAttendances();
      setMessage({ type: 'success', text: 'Attendance activated successfully!' });
    } catch (error: any) {
      console.error('Failed to activate attendance:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || `Cannot activate: attendance is "${attendances.find(a => getEntityId(a) === attendanceId)?.status || 'unknown'}"`
      });
    } finally {
      setActivatingAttendanceId(null);
    }
  };

  // Dispense single medication
  const handleDispense = async (medicationId: string) => {
    if (!selectedAttendanceId) return;

    const attendance = attendances.find((a) => getEntityId(a) === selectedAttendanceId);
    if (!attendance) {
      setMessage({ type: 'error', text: 'Attendance not found' });
      return;
    }

    if (attendance.status !== 'active') {
      setMessage({ 
        type: 'error', 
        text: `Cannot dispense: attendance is "${attendance.status}". Must be "active".`
      });
      return;
    }

    const medication = attendance.medications?.find((m) => getEntityId(m) === medicationId);
    if (!medication) {
      setMessage({ type: 'error', text: 'Medication not found' });
      return;
    }

    const stockItem = stockItems.find((s) => getEntityId(s) === medication.stockItemId);
    if (!stockItem) {
      setMessage({ type: 'error', text: 'Stock item not found for this medication' });
      return;
    }

    if (stockItem.currentStock < medication.quantity) {
      setMessage({
        type: 'error',
        text: `Insufficient stock. Available: ${stockItem.currentStock}${stockItem.unitOfMeasure}, Required: ${medication.quantity}`,
      });
      return;
    }

    setDispensingId(medicationId);
    setMessage(null);

    try {
      const updatedMedications = attendance.medications?.map((m) =>
        getEntityId(m) === medicationId
          ? {
              ...m,
              status: 'dispensed',
              dispensedAt: new Date().toISOString(),
              dispensedBy: getEntityId(user) || user?.username || '',
            }
          : m
      );

      await updateAttendance(selectedAttendanceId, { medications: updatedMedications });

      await addTransaction({
        stockItemId: medication.stockItemId!,
        transactionType: 'stock_out',
        quantity: medication.quantity,
        reference: `Dispensed for ${attendance.attendanceNumber}`,
        notes: `Dispensed to patient: ${medication.name}`,
        performedBy: getEntityId(user) || '',
      });

      setMessage({ type: 'success', text: `${medication.name} dispensed successfully!` });
      await getAttendances();
    } catch (error: any) {
      console.error('Error dispensing medication:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to dispense medication' });
    } finally {
      setDispensingId(null);
    }
  };

  // Dispense all prescribed meds
  const handleDispenseAll = async () => {
    if (!selectedAttendanceId) return;

    const attendance = attendances.find((a) => getEntityId(a) === selectedAttendanceId);
    if (!attendance) {
      setMessage({ type: 'error', text: 'Attendance not found' });
      return;
    }

    if (attendance.status !== 'active') {
      setMessage({ 
        type: 'error', 
        text: `Cannot dispense: attendance is "${attendance.status}". Must be "active".`
      });
      return;
    }

    const prescribedMeds = attendance.medications?.filter((m) => m.status === 'prescribed') || [];

    for (const med of prescribedMeds) {
      const stockItem = stockItems.find((s) => getEntityId(s) === med.stockItemId);
      if (!stockItem || stockItem.currentStock < med.quantity) {
        setMessage({ type: 'error', text: `Insufficient stock for ${med.name}` });
        return;
      }
    }

    setDispensingId('all');
    setMessage(null);

    try {
      const updatedMedications = attendance.medications?.map((m) =>
        m.status === 'prescribed'
          ? {
              ...m,
              status: 'dispensed',
              dispensedAt: new Date().toISOString(),
              dispensedBy: getEntityId(user) || user?.username || '',
            }
          : m
      );

      await updateAttendance(selectedAttendanceId, { medications: updatedMedications });

      for (const med of prescribedMeds) {
        await addTransaction({
          stockItemId: med.stockItemId!,
          transactionType: 'stock_out',
          quantity: med.quantity,
          reference: `Dispensed for ${attendance.attendanceNumber}`,
          notes: `Dispensed to patient: ${med.name}`,
          performedBy: getEntityId(user) || '',
        });
      }

      setMessage({ type: 'success', text: 'All medications dispensed successfully!' });
      await getAttendances();
    } catch (error: any) {
      console.error('Error dispensing all medications:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to dispense all medications' });
    } finally {
      setDispensingId(null);
    }
  };

  // Add new medication (even if not prescribed)
  const handleAddMedication = async (medicationData: MedicationEntry) => {
    if (!selectedAttendanceId) {
      setMessage({ type: 'error', text: 'Please select an attendance first' });
      return;
    }

    const stockItem = stockItems.find((s) => s._id === medicationData.stockItemId);
    if (!stockItem) {
      setMessage({ type: 'error', text: 'Stock item not found' });
      return;
    }

    if (stockItem.currentStock < medicationData.quantity) {
      setMessage({ type: 'error', text: `Insufficient stock. Only ${stockItem.currentStock} items available` });
      return;
    }

    setIsAddingMedication(true);
    try {
      const newMed: Medication = {
        _id: `med-${Date.now()}`,
        stockItemId: medicationData.stockItemId,
        name: stockItem.name,
        dosage: medicationData.dosage,
        frequency: medicationData.frequency,
        duration: medicationData.duration,
        quantity: medicationData.quantity,
        route: medicationData.route,
        instructions: medicationData.instructions,
        status: 'prescribed', // Set as prescribed initially
        prescribedAt: new Date().toISOString(),
        prescribedBy: user?.fullName || user?.username || ''
      };

      await addMedicationToAttendance(selectedAttendanceId, newMed);
      setMessage({ type: 'success', text: 'Medication added successfully!' });
      await getAttendances();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add medication' });
    } finally {
      setIsAddingMedication(false);
    }
  };

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/medical-entries')}
              className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Pill className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Medication Dispensing</h1>
              <p className="text-blue-100 text-lg">Dispense, manage, and print patient medications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Pending Dispensing</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPendingMeds}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Dispensed</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalDispensedMeds}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Dispensed Today</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dispensedToday}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shadow-lg">
              <Printer className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Ready to Print</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPendingMeds}</p>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Patient and Attendance Selection - SIDE BY SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5 text-blue-600" />
            Patient Selection
          </h2>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient by name, contact, or folder number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              
              {/* Patient Search Results */}
              {showPatientDropdown && searchQuery && (
                <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-gray-300 rounded-xl bg-white shadow-lg">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => {
                      const pid = getEntityId(patient);
                      if (!pid) return null;
                      return (
                        <button
                          key={pid}
                          onClick={() => {
                            setSelectedPatientId(pid);
                            setSearchQuery(patient.fullName);
                            setShowPatientDropdown(false);
                          }}
                          className="w-full text-left p-4 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{patient.fullName}</div>
                          <div className="text-sm text-gray-600">
                            {patient.gender} • {patient.contact} • {patient.folderNumber}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-gray-500 text-center">No patients found</div>
                  )}
                </div>
              )}
            </div>
            
            {selectedPatient && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
                <div className="font-bold text-lg text-gray-900">{selectedPatient.fullName}</div>
                <div className="text-sm text-gray-700 mt-1">
                  {selectedPatient.age} years • {selectedPatient.gender} • {selectedPatient.folderNumber}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Selection */}
        {selectedPatientId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                <Calendar className="w-5 h-5 text-green-600" />
                Select Attendance
              </h2>
            </div>
            
            {patientAttendances.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm mb-2">No attendances found for this patient</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <select
                    value={selectedAttendanceId}
                    onChange={(e) => setSelectedAttendanceId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                  >
                    <option value="">Select an attendance...</option>
                    {patientAttendances.map((attendance) => {
                      const aid = getEntityId(attendance);
                      if (!aid) return null;
                      return (
                        <option key={aid} value={aid}>
                          {attendance.attendanceNumber} - {new Date(attendance.dateTime).toLocaleDateString()} - {attendance.status}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Selected Attendance Details */}
                {selectedAttendance && (
                  <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {selectedAttendance.attendanceNumber}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(selectedAttendance.dateTime).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600 capitalize">
                          {selectedAttendance.attendanceType?.replace('_', ' ')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <div
                          className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                            selectedAttendance.status === 'active'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : selectedAttendance.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          {selectedAttendance.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Medications for Dispensing */}
      {selectedAttendance && (
        <div className="space-y-6">
          {/* Print All Prescriptions Button */}
          {totalPendingMeds > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Printer className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Print Prescriptions</h3>
                    <p className="text-sm text-gray-600">
                      Generate printable prescriptions for all pending medications
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePrintAllPrescriptions}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-semibold flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print All Prescriptions ({totalPendingMeds})
                </button>
              </div>
            </div>
          )}

          {/* Medications for Dispensing */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                <Package className="w-5 h-5 text-blue-600" />
                Medications for Dispensing ({totalPendingMeds})
              </h2>
              {selectedAttendance.status === 'active' && totalPendingMeds > 0 && (
                <button
                  onClick={handleDispenseAll}
                  disabled={!!dispensingId}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {dispensingId === 'all' ? 'Dispensing All...' : 'Dispense All'}
                </button>
              )}
            </div>

            {totalPendingMeds === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg">No medications pending dispensing</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prescribedMeds.map((medication) => (
                  <div
                    key={getEntityId(medication)}
                    className="p-4 border-2 border-yellow-200 bg-yellow-50 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg text-gray-900">{medication.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {medication.dosage} • {medication.frequency} • {medication.duration}
                        </div>
                        <div className="text-sm text-gray-600">
                          Quantity: {medication.quantity} • Route: {medication.route}
                        </div>
                        {medication.instructions && (
                          <div className="text-sm text-gray-500 mt-1">{medication.instructions}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Print Prescription Button */}
                        <button
                          onClick={() => handlePrintPrescription(medication)}
                          disabled={!!printingPrescriptionId}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50"
                          title="Print Prescription"
                        >
                          <Printer className="w-4 h-4" />
                          {printingPrescriptionId === getEntityId(medication) ? 'Printing...' : 'Print'}
                        </button>

                        {selectedAttendance.status === 'pending' && (
                          <button
                            onClick={() => handleActivateAttendance(selectedAttendanceId)}
                            disabled={activatingAttendanceId === selectedAttendanceId}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50"
                          >
                            <PlayCircle className="w-4 h-4" />
                            {activatingAttendanceId === selectedAttendanceId ? 'Activating...' : 'Activate'}
                          </button>
                        )}
                        {selectedAttendance.status === 'active' && (
                          <button
                            onClick={() => handleDispense(getEntityId(medication) || '')}
                            disabled={dispensingId === getEntityId(medication)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 font-semibold flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {dispensingId === getEntityId(medication) ? 'Dispensing...' : 'Dispense'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Medications Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Pill className="w-5 h-5 text-green-600" />
              Add Medications
            </h2>
            <MedicationsSection
              medications={[]}
              currentMed={{
                stockItemId: '',
                name: '',
                dosage: '',
                frequency: '',
                duration: '',
                quantity: 1,
                route: 'oral',
                instructions: ''
              }}
              onMedChange={() => {}} // Not needed for this implementation
              onAddMedication={handleAddMedication}
              stockItems={stockItems}
              canAddEntries={true}
              isAdding={isAddingMedication}
            />
          </div>

          {/* Dispensed Medications */}
          {totalDispensedMeds > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Dispensed Medications ({totalDispensedMeds})
              </h2>
              <div className="space-y-3">
                {dispensedMeds.map((medication) => (
                  <div
                    key={getEntityId(medication)}
                    className="p-4 bg-green-50 rounded-xl border border-green-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{medication.name}</div>
                        <div className="text-sm text-gray-600">
                          {medication.dosage} • {medication.frequency} • {medication.duration}
                        </div>
                        <div className="text-sm text-gray-500">
                          Dispensed: {medication.dispensedAt ? new Date(medication.dispensedAt).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                      <span className="px-3 py-1 text-sm font-bold rounded-full bg-green-100 text-green-800 border border-green-200">
                        Dispensed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedAttendance && selectedPatient && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Selected</h3>
          <p className="text-gray-600">Select an attendance to view and manage medications</p>
        </div>
      )}

      {!selectedPatient && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Patient Selected</h3>
          <p className="text-gray-600">Search and select a patient to get started</p>
        </div>
      )}
    </div>
  );
}
