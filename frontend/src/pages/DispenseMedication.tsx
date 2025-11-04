// src/pages/DispenseMedication.tsx
import { useState, useEffect } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { Medication, Attendance, Patient, StockItem } from '../types/api';
import { Search, Package, CheckCircle, AlertCircle, Hospital } from 'lucide-react';

export default function DispenseMedication() {
  const [searchQuery, setSearchQuery] = useState('');
  const { attendances, updateAttendance, getAttendances } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { stockItems, addTransaction, getStockItems } = useStockStore();
  const { user } = useAuthStore();

  useEffect(() => {
    getAttendances();
    loadPatients();
    getStockItems();
  }, [getAttendances, loadPatients, getStockItems]);

  // Get attendances with prescribed but not dispensed medications
  const pendingDispensing = attendances.filter((attendance: Attendance) =>
    attendance.medications?.some((med: Medication) => med.status === 'prescribed')
  );

  const displayedAttendances = searchQuery
    ? pendingDispensing.filter((attendance: Attendance) => {
        const patient = patients.find((p: Patient) => p._id === attendance.patientId);
        return (
          attendance.attendanceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient?.folderNumber?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : pendingDispensing;

  const handleDispense = async (attendanceId: string, medicationId: string) => {
    const attendance = attendances.find((a: Attendance) => a._id === attendanceId);
    if (!attendance) return;

    const medication = attendance.medications?.find((m: Medication) => m._id === medicationId);
    if (!medication) return;

    // Check stock availability
    const stockItem = stockItems.find((s: StockItem) => s._id === medication.stockItemId);
    if (!stockItem) {
      alert('Stock item not found');
      return;
    }

    if (stockItem.currentStock < medication.quantity) {
      alert(
        `Insufficient stock. Available: ${stockItem.currentStock}, Required: ${medication.quantity}`
      );
      return;
    }

    try {
      // Update medication status to dispensed
      const updatedMedications = attendance.medications?.map((m: Medication) =>
        m._id === medicationId
          ? {
              ...m,
              status: 'dispensed' as const,
              dispensedAt: new Date().toISOString(),
              dispensedBy: user?._id || '',
            }
          : m
      );

      await updateAttendance(attendanceId, { medications: updatedMedications });

      // Update stock
      await addTransaction({
        stockItemId: medication.stockItemId,
        transactionType: 'stock_out',
        quantity: medication.quantity,
        reference: `Dispensed for ${attendance.attendanceNumber}`,
        notes: `Dispensed to patient for ${medication.name}`,
        performedBy: user?._id || '',
      });

    } catch (error) {
      console.error('Error dispensing medication:', error);
      alert('Failed to dispense medication');
    }
  };

  const handleDispenseAll = async (attendanceId: string) => {
    const attendance = attendances.find((a: Attendance) => a._id === attendanceId);
    if (!attendance) return;

    const prescribedMeds = attendance.medications?.filter((m: Medication) => m.status === 'prescribed') || [];

    // Check stock for all medications
    for (const med of prescribedMeds) {
      const stockItem = stockItems.find((s: StockItem) => s._id === med.stockItemId);
      if (!stockItem || stockItem.currentStock < med.quantity) {
        alert(`Insufficient stock for ${med.name}`);
        return;
      }
    }

    try {
      // Dispense all medications
      const updatedMedications = attendance.medications?.map((m: Medication) =>
        m.status === 'prescribed'
          ? {
              ...m,
              status: 'dispensed' as const,
              dispensedAt: new Date().toISOString(),
              dispensedBy: user?._id || '',
            }
          : m
      );

      await updateAttendance(attendanceId, { medications: updatedMedications });

      // Update stock for all medications
      for (const med of prescribedMeds) {
        await addTransaction({
          stockItemId: med.stockItemId,
          transactionType: 'stock_out',
          quantity: med.quantity,
          reference: `Dispensed for ${attendance.attendanceNumber}`,
          notes: `Dispensed to patient for ${med.name}`,
          performedBy: user?._id || '',
        });
      }
    } catch (error) {
      console.error('Error dispensing all medications:', error);
      alert('Failed to dispense medications');
    }
  };

  const totalPendingMeds = pendingDispensing.reduce(
    (sum: number, a: Attendance) => sum + (a.medications?.filter((m: Medication) => m.status === 'prescribed').length || 0),
    0
  );

  const dispensedToday = attendances
    .filter((a: Attendance) =>
      a.medications?.some(
        (m: Medication) =>
          m.status === 'dispensed' &&
          m.dispensedAt &&
          new Date(m.dispensedAt).toDateString() === new Date().toDateString()
      )
    )
    .reduce(
      (sum: number, a: Attendance) =>
        sum +
        (a.medications?.filter(
          (m: Medication) =>
            m.status === 'dispensed' &&
            m.dispensedAt &&
            new Date(m.dispensedAt).toDateString() === new Date().toDateString()
        ).length || 0),
      0
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Hospital className="w-8 h-8" />
                Medication Dispensing
              </h1>
              <p className="text-blue-100 mt-2">Dispense prescribed medications to patients</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Pending Dispensing</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{pendingDispensing.length}</p>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Total Medications</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalPendingMeds}</p>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Dispensed Today</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{dispensedToday}</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by attendance number, patient name, or folder number..."
              className="w-full pl-12 pr-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
            />
          </div>
        </div>

        {/* Pending Dispensing List */}
        {displayedAttendances.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">
              {searchQuery ? 'No pending dispensing found' : 'No medications pending dispensing'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedAttendances.map((attendance: Attendance) => {
              const patient = patients.find((p: Patient) => p._id === attendance.patientId);
              const prescribedMeds = attendance.medications?.filter((m: Medication) => m.status === 'prescribed') || [];

              return (
                <div
                  key={attendance._id}
                  className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">
                        {patient?.fullName || 'Unknown Patient'}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full border">
                          {attendance.attendanceNumber}
                        </span>
                        {patient?.folderNumber && (
                          <span className="text-sm text-gray-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                            {patient.folderNumber}
                          </span>
                        )}
                        <span className="text-sm text-gray-600">
                          {new Date(attendance.dateTime).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDispenseAll(attendance._id)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold"
                    >
                      Dispense All
                    </button>
                  </div>

                  <div className="space-y-4">
                    {prescribedMeds.map((medication: Medication) => {
                      const stockItem = stockItems.find((s: StockItem) => s._id === medication.stockItemId);
                      const hasStock = stockItem && stockItem.currentStock >= medication.quantity;

                      return (
                        <div
                          key={medication._id}
                          className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                            hasStock 
                              ? 'bg-gradient-to-br from-gray-50 to-blue-50 border-gray-200 hover:shadow-lg' 
                              : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-gray-900 mb-2">{medication.name}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-xl p-3 border border-gray-200">
                                  <p className="text-sm text-gray-600 font-medium">Dosage</p>
                                  <p className="font-semibold text-gray-900">{medication.dosage}</p>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-gray-200">
                                  <p className="text-sm text-gray-600 font-medium">Frequency</p>
                                  <p className="font-semibold text-gray-900">{medication.frequency}</p>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-gray-200">
                                  <p className="text-sm text-gray-600 font-medium">Duration</p>
                                  <p className="font-semibold text-gray-900">{medication.duration}</p>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-gray-200">
                                  <p className="text-sm text-gray-600 font-medium">Quantity</p>
                                  <p className="font-semibold text-gray-900">{medication.quantity}</p>
                                </div>
                              </div>
                              {stockItem && (
                                <div className="mt-4">
                                  <p className={`text-sm font-semibold ${
                                    hasStock ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    Stock Available: {stockItem.currentStock} {stockItem.unitOfMeasure}
                                  </p>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleDispense(attendance._id, medication._id)}
                              disabled={!hasStock}
                              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                                hasStock
                                  ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 shadow-md hover:shadow-lg'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {hasStock ? 'Dispense' : 'Out of Stock'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
