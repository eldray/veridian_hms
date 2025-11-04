// src/pages/LabResults.tsx - UPDATED WIDE LAYOUT
import { useState, useEffect } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { LabTest, Attendance, Patient } from '../types/api';
import { Search, FlaskConical, CheckCircle, Clock, Hospital, Activity } from 'lucide-react';

export default function LabResults() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTest, setSelectedTest] = useState<{
    attendanceId: string;
    testId: string;
  } | null>(null);
  const [result, setResult] = useState('');
  const [normalRange, setNormalRange] = useState('');
  const [units, setUnits] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { attendances, updateLabTestStatus, getAttendances } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();

  useEffect(() => {
    getAttendances();
    loadPatients();
  }, [getAttendances, loadPatients]);

  // Get attendances with pending lab tests (status: 'requested')
  const pendingTests = attendances.filter((attendance: Attendance) =>
    attendance.labTests?.some((t: LabTest) => t.status === 'requested')
  );

  const displayedAttendances = searchQuery
    ? pendingTests.filter((attendance: Attendance) => {
        const patient = patients.find((p: Patient) => p._id === attendance.patientId);
        return (
          attendance.attendanceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient?.folderNumber?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : pendingTests;

  const handleSubmitResult = async () => {
    if (!selectedTest || !result.trim()) {
      alert('Please enter test result');
      return;
    }

    setIsLoading(true);
    try {
      await updateLabTestStatus(
        selectedTest.attendanceId,
        selectedTest.testId,
        {
          status: 'completed',
          result: result,
          normalRange: normalRange || undefined,
          units: units || undefined,
          notes: notes || undefined,
          performedBy: user?._id || '',
        }
      );

      // Reset form
      setSelectedTest(null);
      setResult('');
      setNormalRange('');
      setUnits('');
      setNotes('');
    } catch (error) {
      console.error('Error submitting lab result:', error);
      alert('Failed to submit lab result');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkInProgress = async (attendanceId: string, testId: string) => {
    try {
      await updateLabTestStatus(attendanceId, testId, {
        status: 'in_progress',
        performedBy: user?._id || '',
      });
    } catch (error) {
      console.error('Error updating test status:', error);
    }
  };

  const completedToday = attendances
    .flatMap((a: Attendance) => a.labTests || [])
    .filter(
      (t: LabTest) =>
        t.status === 'completed' &&
        t.completedAt &&
        new Date(t.completedAt).toDateString() === new Date().toDateString()
    ).length;

  const totalPending = pendingTests.reduce(
    (sum: number, a: Attendance) => sum + (a.labTests?.filter((t: LabTest) => t.status === 'requested').length || 0),
    0
  );

  const inProgressCount = attendances.reduce(
    (sum: number, a: Attendance) => sum + (a.labTests?.filter((t: LabTest) => t.status === 'in_progress').length || 0),
    0
  );

  const selectedTestData = selectedTest 
    ? attendances
        .find((a: Attendance) => a._id === selectedTest.attendanceId)
        ?.labTests?.find((t: LabTest) => t._id === selectedTest.testId)
    : null;

  const selectedPatient = selectedTest 
    ? patients.find((p: Patient) => p._id === attendances.find((a: Attendance) => a._id === selectedTest.attendanceId)?.patientId)
    : null;

  const selectedAttendance = selectedTest 
    ? attendances.find((a: Attendance) => a._id === selectedTest.attendanceId)
    : null;

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen"> {/* ← CHANGED TO MATCH OTHER PAGES */}
      {/* Header - Consistent with other pages */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Hospital className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Laboratory Results</h1>
              <p className="text-blue-100 text-lg">Enter and manage lab test results</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Pending Tests</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPending}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg">
              <FlaskConical className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">In Progress</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{inProgressCount}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Completed Today</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{completedToday}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
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

      {/* Main Content - Wider layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8"> {/* ← CHANGED TO 3-COLUMN LAYOUT */}
        {/* Pending Tests List - Takes 2 columns */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-blue-600" />
            Pending Tests
          </h2>
          {displayedAttendances.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
              <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                {searchQuery ? 'No pending tests found' : 'No pending lab tests'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {displayedAttendances.map((attendance: Attendance) => {
                const patient = patients.find((p: Patient) => p._id === attendance.patientId);
                const pendingLabTests = attendance.labTests?.filter((t: LabTest) => t.status === 'requested') || [];
                const inProgressTests = attendance.labTests?.filter((t: LabTest) => t.status === 'in_progress') || [];

                return (
                  <div
                    key={attendance._id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
                  >
                    <div className="mb-6">
                      <h3 className="font-bold text-xl text-gray-900 mb-2">
                        {patient?.fullName || 'Unknown Patient'}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap">
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
                      {attendance.diagnoses?.length > 0 && (
                        <p className="text-sm text-gray-600 mt-3">
                          <span className="font-semibold">Diagnosis:</span>{' '}
                          {attendance.diagnoses.find((d: any) => d.primary)?.name || attendance.diagnoses[0]?.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* In Progress Tests */}
                      {inProgressTests.map((test: LabTest) => (
                        <div
                          key={test._id}
                          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            selectedTest?.testId === test._id
                              ? 'bg-gradient-to-r from-blue-50 to-teal-50 border-blue-500 shadow-lg'
                              : 'bg-gradient-to-br from-blue-50 to-teal-50 border-blue-200 hover:border-blue-300 hover:shadow-lg'
                          }`}
                          onClick={() =>
                            setSelectedTest({
                              attendanceId: attendance._id,
                              testId: test._id,
                            })
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-lg text-gray-900">{test.name}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Requested: {new Date(test.requestedAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="px-4 py-2 text-sm font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              In Progress
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Pending Tests */}
                      {pendingLabTests.map((test: LabTest) => (
                        <div
                          key={test._id}
                          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            selectedTest?.testId === test._id
                              ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-500 shadow-lg'
                              : 'bg-gradient-to-br from-gray-50 to-yellow-50 border-gray-200 hover:border-gray-300 hover:shadow-lg'
                          }`}
                          onClick={() =>
                            setSelectedTest({
                              attendanceId: attendance._id,
                              testId: test._id,
                            })
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-lg text-gray-900">{test.name}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Requested: {new Date(test.requestedAt).toLocaleString()}
                              </p>
                              {test.priority === 'urgent' && (
                                <span className="inline-block mt-2 px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full">
                                  URGENT
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkInProgress(attendance._id, test._id);
                                }}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Start
                              </button>
                              <span className="px-4 py-2 text-sm font-bold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                                Pending
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Result Entry Form - Takes 1 column */}
        <div className="xl:sticky xl:top-6 h-fit">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              Enter Test Result
            </h2>

            {!selectedTest ? (
              <div className="text-center py-12">
                <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Select a test from the list to enter results</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl p-6 border border-blue-200">
                  <p className="text-sm text-blue-900 font-medium mb-2">Selected Test</p>
                  <p className="font-bold text-xl text-blue-900 mb-2">{selectedTestData?.name}</p>
                  {selectedPatient && (
                    <p className="text-blue-900">
                      Patient: <span className="font-semibold">{selectedPatient.fullName}</span>
                    </p>
                  )}
                  {selectedAttendance && (
                    <p className="text-blue-900 text-sm mt-1">
                      Attendance: {selectedAttendance.attendanceNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Test Result <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    rows={4}
                    placeholder="Enter detailed test results..."
                    className="w-full px-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Normal Range
                    </label>
                    <input
                      type="text"
                      value={normalRange}
                      onChange={(e) => setNormalRange(e.target.value)}
                      placeholder="e.g., 0-100"
                      className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Units
                    </label>
                    <input
                      type="text"
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      placeholder="e.g., mg/dL"
                      className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any additional observations or notes..."
                    className="w-full px-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSubmitResult}
                    disabled={isLoading || !result.trim()}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Submitting...' : 'Submit Result'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTest(null);
                      setResult('');
                      setNormalRange('');
                      setUnits('');
                      setNotes('');
                    }}
                    className="px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
