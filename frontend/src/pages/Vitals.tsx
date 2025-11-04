// src/pages/Vitals.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import type { Vitals } from '../types';
import { 
  Heart, 
  Save, 
  Search,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Hospital,
  ArrowLeft,
  Activity,
  Thermometer,
  Gauge,
  Wind,
  Droplets,
  Scale,
  Ruler
} from 'lucide-react';

export default function Vitals() {
  const navigate = useNavigate();
  const { patients, loadPatients } = usePatientStore();
  const { 
    attendances, 
    loadAttendances, 
    addVitalsToAttendance,
    getVitalsByAttendance 
  } = useAttendanceStore();
  const { user } = useAuthStore();

  // Load initial data
  useEffect(() => {
    loadPatients();
    loadAttendances();
  }, []);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedAttendance, setSelectedAttendance] = useState<string>('');

  // Vitals state
  const [vitals, setVitals] = useState<Vitals>({
    bloodPressure: '',
    temperature: undefined,
    pulse: undefined,
    respiration: undefined,
    spo2: undefined,
    weight: undefined,
    height: undefined,
    recordedAt: new Date().toISOString(),
    recordedBy: user?.fullName || user?.username || ''
  });

  // Previous vitals
  const [previousVitals, setPreviousVitals] = useState<Vitals[]>([]);

  // Success/error state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter patients based on search term
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contact.includes(searchTerm) ||
      p.folderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get active attendances for selected patient
  const activeAttendances = attendances.filter(
    a => a.patientId === selectedPatient && 
    ['pending', 'active'].includes(a.status)
  );

  const selectedPatientData = patients.find((p) => p.id === selectedPatient);
  const selectedAttendanceData = attendances.find((a) => a.id === selectedAttendance);

  // Load previous vitals when attendance is selected
  useEffect(() => {
    if (selectedAttendance) {
      const loadPreviousVitals = async () => {
        try {
          const vitalsData = await getVitalsByAttendance(selectedAttendance);
          setPreviousVitals(vitalsData || []);
        } catch (error) {
          console.error('Failed to load previous vitals:', error);
          setPreviousVitals([]);
        }
      };
      loadPreviousVitals();
    }
  }, [selectedAttendance, getVitalsByAttendance]);

  // Calculate BMI
  React.useEffect(() => {
    if (vitals.weight && vitals.height) {
      const heightInMeters = vitals.height / 100;
      const bmi = vitals.weight / (heightInMeters * heightInMeters);
      setVitals((prev) => ({ ...prev, bmi: parseFloat(bmi.toFixed(1)) }));
    }
  }, [vitals.weight, vitals.height]);

  const handleSubmitVitals = async () => {
    if (!selectedPatient || !selectedAttendance) {
      setMessage({ type: 'error', text: 'Please select a patient and active attendance' });
      return;
    }

    if (!vitals.bloodPressure && !vitals.temperature && !vitals.pulse && 
        !vitals.respiration && !vitals.spo2 && !vitals.weight && !vitals.height) {
      setMessage({ type: 'error', text: 'Please enter at least one vital sign' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await addVitalsToAttendance(selectedAttendance, vitals);
      
      setMessage({ 
        type: 'success', 
        text: 'Vitals recorded successfully!' 
      });

      // Reset form after 2 seconds
      setTimeout(() => {
        setVitals({
          bloodPressure: '',
          temperature: undefined,
          pulse: undefined,
          respiration: undefined,
          spo2: undefined,
          weight: undefined,
          height: undefined,
          recordedAt: new Date().toISOString(),
          recordedBy: user?.fullName || user?.username || ''
        });
      }, 2000);

    } catch (error: any) {
      console.error('Failed to save vitals:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to save vitals' 
      });
    } finally {
      setIsLoading(false);
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
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Vital Signs</h1>
              <p className="text-blue-100 text-lg">
                Record and monitor patient vital signs
              </p>
            </div>
          </div>
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

      {/* Patient and Attendance Selection */}
      <div className="space-y-6">
        {/* Patient Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5 text-blue-600" />
            Patient Selection
          </h2>
          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Search patient by name, contact, or folder number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            {searchTerm && (
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-xl bg-white">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient._id || patient.id}
                    onClick={() => {
                      setSelectedPatient(patient._id || patient.id);
                      setSearchTerm('');
                      setSelectedAttendance('');
                    }}
                    className="w-full text-left p-4 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-900">{patient.fullName}</div>
                    <div className="text-sm text-gray-600">
                      {patient.gender} • {patient.contact} • {patient.folderNumber}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedPatientData && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
                <div className="font-bold text-lg text-gray-900">{selectedPatientData.fullName}</div>
                <div className="text-sm text-gray-700 mt-1">
                  {selectedPatientData.age} years • {selectedPatientData.gender} • {selectedPatientData.folderNumber}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Selection */}
        {selectedPatient && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Calendar className="w-5 h-5 text-green-600" />
              Select Active Attendance
            </h2>
            {activeAttendances.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-4">No active attendances found for this patient</p>
                <button
                  onClick={() => navigate('/dashboard/attendance/new')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                >
                  Create New Attendance
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeAttendances.map((attendance) => (
                  <button
                    key={attendance._id || attendance.id}
                    onClick={() => setSelectedAttendance(attendance._id || attendance.id)}
                    className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                      selectedAttendance === (attendance._id || attendance.id)
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{attendance.attendanceNumber}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {new Date(attendance.dateTime).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {attendance.attendanceType?.replace('_', ' ')}
                    </div>
                    <div className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                      attendance.status === 'active' 
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}>
                      {attendance.status}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vitals Entry Form */}
      {selectedAttendance && (
        <div className="space-y-6">
          {/* Current Vitals */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
              <Activity className="w-7 h-7 text-blue-600" />
              Record Vital Signs
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Blood Pressure */}
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-red-600" />
                  Blood Pressure
                </label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={vitals.bloodPressure || ''}
                  onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-2">mmHg</p>
              </div>

              {/* Temperature */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-600" />
                  Temperature
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="37.0"
                  value={vitals.temperature || ''}
                  onChange={(e) =>
                    setVitals({ ...vitals, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-2">°C</p>
              </div>

              {/* Pulse */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Pulse Rate
                </label>
                <input
                  type="number"
                  placeholder="72"
                  value={vitals.pulse || ''}
                  onChange={(e) => setVitals({ ...vitals, pulse: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-2">bpm</p>
              </div>

              {/* Respiration */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Wind className="w-4 h-4 text-green-600" />
                  Respiration
                </label>
                <input
                  type="number"
                  placeholder="16"
                  value={vitals.respiration || ''}
                  onChange={(e) => setVitals({ ...vitals, respiration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-2">breaths/min</p>
              </div>

              {/* SpO2 */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  SpO2
                </label>
                <input
                  type="number"
                  placeholder="98"
                  value={vitals.spo2 || ''}
                  onChange={(e) => setVitals({ ...vitals, spo2: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-2">%</p>
              </div>

              {/* Weight */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-yellow-600" />
                  Weight
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={vitals.weight || ''}
                  onChange={(e) => setVitals({ ...vitals, weight: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-2">kg</p>
              </div>

              {/* Height */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-teal-600" />
                  Height
                </label>
                <input
                  type="number"
                  placeholder="170"
                  value={vitals.height || ''}
                  onChange={(e) => setVitals({ ...vitals, height: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-2">cm</p>
              </div>

              {/* BMI */}
              {vitals.bmi && (
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    BMI (calculated)
                  </label>
                  <div className="text-2xl font-bold text-gray-900">{vitals.bmi}</div>
                  <p className="text-xs text-gray-500 mt-2">
                    {vitals.bmi < 18.5 ? 'Underweight' : 
                     vitals.bmi < 25 ? 'Normal' : 
                     vitals.bmi < 30 ? 'Overweight' : 'Obese'}
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleSubmitVitals}
                disabled={isLoading}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-xl shadow-lg flex items-center gap-3 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    <span>Record Vitals</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Previous Vitals */}
          {previousVitals.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Previous Vitals</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        BP
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Temp
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Pulse
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Resp
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        SpO2
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Weight
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Height
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        BMI
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previousVitals.map((vital, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(vital.recordedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{vital.bloodPressure || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{vital.temperature || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{vital.pulse || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{vital.respiration || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{vital.spo2 || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{vital.weight || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{vital.height || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{vital.bmi || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
