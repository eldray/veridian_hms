// src/components/medical-entries/MedicationsSection.tsx - UPDATED WITH DISPENSING MODE
import React from 'react';
import { Medication } from '../../types';
import { MedicationEntry } from '../../types/medical-entries';
import { Pill, Plus, CheckCircle, AlertCircle, Package } from 'lucide-react';

interface MedicationsSectionProps {
  medications: Medication[];
  currentMed: MedicationEntry;
  onMedChange: (med: MedicationEntry) => void;
  onAddMedication: () => void;
  stockItems: any[];
  canAddEntries: boolean;
  isDispensingMode?: boolean;
  onDispenseMedication?: (attendanceId: string, medicationId: string) => void;
  onDispenseAll?: (attendanceId: string) => void;
  dispensingId?: string | null;
  selectedAttendanceId?: string;
}

const MedicationsSection: React.FC<MedicationsSectionProps> = ({
  medications,
  currentMed,
  onMedChange,
  onAddMedication,
  stockItems,
  canAddEntries,
  isDispensingMode = false,
  onDispenseMedication,
  onDispenseAll,
  dispensingId,
  selectedAttendanceId
}) => {
  const medicationStockItems = stockItems.filter((s) => s.category === 'medication');

  // Helper function to get entity ID
  const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
    return entity?._id || entity?.id;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
        <Pill className="w-5 h-5 text-blue-600" />
        {isDispensingMode ? 'Medications for Dispensing' : 'Medications'}
      </h2>
      
      <div className="space-y-4">
        {/* Medication Input Form - Only show in non-dispensing mode */}
        {!isDispensingMode && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Medication
                </label>
                <select
                  value={currentMed.stockItemId}
                  onChange={(e) => {
                    const item = medicationStockItems.find((s) => s._id === e.target.value);
                    onMedChange({
                      ...currentMed,
                      stockItemId: e.target.value,
                      name: item?.name || '',
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={!canAddEntries}
                >
                  <option value="">Select medication...</option>
                  {medicationStockItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} - Stock: {item.currentStock}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dosage *
                </label>
                <input
                  type="text"
                  placeholder="e.g., 500mg"
                  value={currentMed.dosage}
                  onChange={(e) => onMedChange({ ...currentMed, dosage: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={!canAddEntries}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Frequency
                </label>
                <input
                  type="text"
                  placeholder="e.g., 3 times daily"
                  value={currentMed.frequency}
                  onChange={(e) => onMedChange({ ...currentMed, frequency: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={!canAddEntries}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration
                </label>
                <input
                  type="text"
                  placeholder="e.g., 7 days"
                  value={currentMed.duration}
                  onChange={(e) => onMedChange({ ...currentMed, duration: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={!canAddEntries}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={currentMed.quantity}
                  onChange={(e) => onMedChange({ ...currentMed, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={!canAddEntries}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Route
                </label>
                <select
                  value={currentMed.route}
                  onChange={(e) => onMedChange({ ...currentMed, route: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={!canAddEntries}
                >
                  <option value="oral">Oral</option>
                  <option value="iv">IV</option>
                  <option value="im">IM</option>
                  <option value="sc">Subcutaneous</option>
                  <option value="topical">Topical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Instructions
              </label>
              <input
                type="text"
                placeholder="Special instructions for patient"
                value={currentMed.instructions}
                onChange={(e) => onMedChange({ ...currentMed, instructions: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={!canAddEntries}
              />
            </div>
            
            {canAddEntries && (
              <button
                onClick={onAddMedication}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add Medication
              </button>
            )}
          </>
        )}

        {/* Dispensing Actions - Only show in dispensing mode */}
        {isDispensingMode && medications.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-800">
                  {medications.filter(m => m.status === 'prescribed').length} medications pending dispensing
                </span>
              </div>
              {onDispenseAll && selectedAttendanceId && (
                <button
                  onClick={() => onDispenseAll(selectedAttendanceId)}
                  disabled={dispensingId === `all-${selectedAttendanceId}`}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                >
                  {dispensingId === `all-${selectedAttendanceId}` ? 'Dispensing...' : 'Dispense All'}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Medication List */}
        {medications.length > 0 && (
          <div className="mt-4 border border-gray-300 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Medication
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Dosage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Route
                  </th>
                  {isDispensingMode && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {medications.map((med) => {
                  const stockItem = stockItems.find((s) => getEntityId(s) === med.stockItemId);
                  const hasStock = stockItem && stockItem.currentStock >= med.quantity;
                  const isDispensing = dispensingId === getEntityId(med);
                  
                  return (
                    <tr key={getEntityId(med)} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{med.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{med.dosage}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{med.frequency}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{med.duration}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{med.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{med.route}</td>
                      
                      {isDispensingMode && (
                        <>
                          <td className="px-4 py-3 text-sm">
                            {stockItem ? (
                              <div className={`flex items-center gap-1 ${
                                hasStock ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {hasStock ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <AlertCircle className="w-4 h-4" />
                                )}
                                <span className="font-medium">
                                  {stockItem.currentStock} {stockItem.unitOfMeasure}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              med.status === 'dispensed' 
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : med.status === 'prescribed'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}>
                              {med.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {med.status === 'prescribed' && onDispenseMedication && selectedAttendanceId && (
                              <button
                                onClick={() => onDispenseMedication(selectedAttendanceId, getEntityId(med) || '')}
                                disabled={!hasStock || isDispensing}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                  hasStock
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                } ${isDispensing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isDispensing ? 'Dispensing...' : hasStock ? 'Dispense' : 'Out of Stock'}
                              </button>
                            )}
                            {med.status === 'dispensed' && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">Dispensed</span>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state for dispensing mode */}
        {isDispensingMode && medications.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No medications found</p>
            <p className="text-sm">Medications will appear here once they are prescribed</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicationsSection;
