// src/components/medical-entries/MedicationsSection.tsx - UPDATED WITH SEARCH AND DROPDOWNS
import React, { useState, useEffect } from 'react';
import { Medication, StockItem } from '../../types';
import { MedicationEntry } from '../../types/medical-entries';
import { Pill, Plus, CheckCircle, AlertCircle, Package, DollarSign, Shield, Search, X } from 'lucide-react';

interface MedicationsSectionProps {
  medications: Medication[];
  currentMed: MedicationEntry;
  onMedChange: (med: MedicationEntry) => void;
  onAddMedication: () => void;
  stockItems: StockItem[];
  canAddEntries: boolean;
  isDispensingMode?: boolean;
  onDispenseMedication?: (attendanceId: string, medicationId: string) => void;
  onDispenseAll?: (attendanceId: string) => void;
  dispensingId?: string | null;
  selectedAttendanceId?: string;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance';
  currentUser?: { fullName?: string; username?: string; _id?: string };
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
  selectedAttendanceId,
  paymentMode = 'cash',
  currentUser
}) => {
  const [medicationSearch, setMedicationSearch] = useState('');
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
  const [filteredMedications, setFilteredMedications] = useState<StockItem[]>([]);

  const medicationStockItems = stockItems.filter((s) => s.isMedication && s.isActive);

  // Frequency options
  const frequencyOptions = [
    { value: 'stat', label: 'STAT (Immediately)' },
    { value: 'once', label: 'Once Daily' },
    { value: 'bd', label: 'BD (Twice Daily)' },
    { value: 'tds', label: 'TDS (Three Times Daily)' },
    { value: 'qid', label: 'QID (Four Times Daily)' },
    { value: 'nocte', label: 'Nocte (At Night)' },
    { value: 'mane', label: 'Mane (In the Morning)' },
    { value: '6hrly', label: 'Every 6 Hours' },
    { value: '8hrly', label: 'Every 8 Hours' },
    { value: '12hrly', label: 'Every 12 Hours' },
    { value: '24hrly', label: 'Every 24 Hours' },
    { value: '48hrly', label: 'Every 48 Hours' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'prn', label: 'PRN (As Required)' },
    { value: 'other', label: 'Other (Specify in Instructions)' }
  ];

  // Route options
  const routeOptions = [
    { value: 'oral', label: 'Oral' },
    { value: 'iv', label: 'IV (Intravenous)' },
    { value: 'im', label: 'IM (Intramuscular)' },
    { value: 'sc', label: 'SC (Subcutaneous)' },
    { value: 'topical', label: 'Topical' },
    { value: 'inhalation', label: 'Inhalation' },
    { value: 'rectal', label: 'Rectal' },
    { value: 'vaginal', label: 'Vaginal' },
    { value: 'ocular', label: 'Ocular' },
    { value: 'otic', label: 'Otic (Ear)' },
    { value: 'nasal', label: 'Nasal' },
    { value: 'transdermal', label: 'Transdermal' },
    { value: 'sublingual', label: 'Sublingual' }
  ];

  // Helper function to get entity ID
  const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
    return entity?._id || entity?.id;
  };

  const getMedicationPrice = (stockItem: StockItem) => {
    return paymentMode === 'cash' ? stockItem.sellingPrice : stockItem.insurancePrice;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'prescribed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'dispensed': return 'bg-green-100 text-green-800 border-green-200';
      case 'administered': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter medications based on search
  useEffect(() => {
    if (medicationSearch.trim()) {
      const filtered = medicationStockItems.filter(item =>
        item.name.toLowerCase().includes(medicationSearch.toLowerCase()) ||
        item.strength?.toLowerCase().includes(medicationSearch.toLowerCase()) ||
        item.drugCode?.toLowerCase().includes(medicationSearch.toLowerCase())
      );
      setFilteredMedications(filtered);
    } else {
      setFilteredMedications([]);
    }
  }, [medicationSearch, medicationStockItems]);

  // Get dosage options based on selected medication strength
  const getDosageOptions = () => {
    const selectedMed = medicationStockItems.find(item => item._id === currentMed.stockItemId);
    if (!selectedMed?.strength) return [];

    const strength = selectedMed.strength;
    const baseValue = parseFloat(strength.replace(/[^\d.]/g, ''));
    const unit = strength.replace(/[\d.]/g, '').trim();

    if (isNaN(baseValue)) return [];

    return [
      { value: `${baseValue}${unit}`, label: `${baseValue}${unit} (Single Dose)` },
      { value: `${baseValue * 2}${unit}`, label: `${baseValue * 2}${unit} (Double Dose)` },
      { value: `${baseValue * 3}${unit}`, label: `${baseValue * 3}${unit} (Triple Dose)` },
      { value: `${baseValue * 0.5}${unit}`, label: `${baseValue * 0.5}${unit} (Half Dose)` },
      { value: `${baseValue * 0.25}${unit}`, label: `${baseValue * 0.25}${unit} (Quarter Dose)` }
    ].filter(option => {
      const value = parseFloat(option.value.replace(/[^\d.]/g, ''));
      return value > 0 && value <= 5000; // Reasonable dosage limits
    });
  };

  const handleMedicationSelect = (stockItem: StockItem) => {
    onMedChange({
      ...currentMed,
      stockItemId: stockItem._id,
      name: stockItem.name,
      status: 'prescribed'
    });
    setMedicationSearch(stockItem.name);
    setShowMedicationDropdown(false);
  };

  const clearMedicationSelection = () => {
    onMedChange({
      ...currentMed,
      stockItemId: '',
      name: '',
      dosage: ''
    });
    setMedicationSearch('');
  };

  const selectedMedication = medicationStockItems.find(item => item._id === currentMed.stockItemId);
  const dosageOptions = getDosageOptions();

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
              {/* Medication Search */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search Medication
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by medication name, strength, or code..."
                    value={medicationSearch}
                    onChange={(e) => {
                      setMedicationSearch(e.target.value);
                      setShowMedicationDropdown(true);
                    }}
                    onFocus={() => setShowMedicationDropdown(true)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    disabled={!canAddEntries}
                  />
                  {medicationSearch && (
                    <button
                      onClick={clearMedicationSelection}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Medication Search Results */}
                {showMedicationDropdown && medicationSearch && (
                  <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto border border-gray-300 rounded-xl bg-white shadow-lg">
                    {filteredMedications.length > 0 ? (
                      filteredMedications.map((item) => (
                        <button
                          key={item._id}
                          onClick={() => handleMedicationSelect(item)}
                          className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-600">
                            Strength: {item.strength} • Stock: {item.currentStock}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Code: {item.drugCode} • Price: {getMedicationPrice(item).toFixed(2)} ({paymentMode})
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-gray-500 text-center">
                        No medications found
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Dosage Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dosage *
                </label>
                {selectedMedication ? (
                  <select
                    value={currentMed.dosage}
                    onChange={(e) => onMedChange({ ...currentMed, dosage: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    disabled={!canAddEntries}
                  >
                    <option value="">Select dosage...</option>
                    {dosageOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value="custom">Custom dosage...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Select medication first"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500"
                    disabled
                  />
                )}
                
                {/* Custom dosage input */}
                {currentMed.dosage === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom dosage (e.g., 750mg)"
                    onChange={(e) => onMedChange({ ...currentMed, dosage: e.target.value })}
                    className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    disabled={!canAddEntries}
                  />
                )}
              </div>
              
              {/* Frequency Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  value={currentMed.frequency}
                  onChange={(e) => onMedChange({ ...currentMed, frequency: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={!canAddEntries}
                >
                  <option value="">Select frequency...</option>
                  {frequencyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="e.g., 7"
                    value={currentMed.duration.replace(/[^\d]/g, '') || ''}
                    onChange={(e) => onMedChange({ 
                      ...currentMed, 
                      duration: e.target.value ? `${e.target.value} days` : '' 
                    })}
                    className="w-2/3 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    disabled={!canAddEntries}
                  />
                  <select
                    value={currentMed.duration.includes('days') ? 'days' : 
                           currentMed.duration.includes('weeks') ? 'weeks' : 
                           currentMed.duration.includes('months') ? 'months' : 'days'}
                    onChange={(e) => {
                      const days = currentMed.duration.replace(/[^\d]/g, '');
                      onMedChange({ 
                        ...currentMed, 
                        duration: days ? `${days} ${e.target.value}` : '' 
                      });
                    }}
                    className="w-1/3 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    disabled={!canAddEntries}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={currentMed.quantity}
                  onChange={(e) => onMedChange({ ...currentMed, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={!canAddEntries}
                />
              </div>

              {/* Route */}
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
                  <option value="">Select route...</option>
                  {routeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Medication Details */}
            {selectedMedication && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Strength</label>
                  <span className="text-sm text-gray-600">
                    {selectedMedication.strength || 'N/A'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Unit Price</label>
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {getMedicationPrice(selectedMedication).toFixed(2)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Total Cost</label>
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {(getMedicationPrice(selectedMedication) * currentMed.quantity).toFixed(2)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Authorization</label>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    selectedMedication.requiresAuthorization
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedMedication.requiresAuthorization ? 'Required' : 'Not Required'}
                  </span>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Instructions
              </label>
              <input
                type="text"
                placeholder="Special instructions for patient (e.g., Take with food, Avoid alcohol, etc.)"
                value={currentMed.instructions || ''}
                onChange={(e) => onMedChange({ ...currentMed, instructions: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={!canAddEntries}
              />
            </div>
            
            {/* Add Medication Button */}
            {canAddEntries && selectedMedication && currentMed.dosage && currentMed.frequency && (
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Price
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
                  const totalPrice = stockItem ? 
                    (paymentMode === 'cash' ? stockItem.sellingPrice : stockItem.insurancePrice) * med.quantity 
                    : 0;
                  
                  // Get frequency label
                  const frequencyLabel = frequencyOptions.find(f => f.value === med.frequency)?.label || med.frequency;
                  
                  return (
                    <tr key={getEntityId(med)} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {med.name}
                          {stockItem?.requiresAuthorization && (
                            <Shield className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{med.dosage}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{frequencyLabel}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{med.duration}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{med.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                        {routeOptions.find(r => r.value === med.route)?.label || med.route}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {totalPrice.toFixed(2)}
                        </div>
                      </td>
                      
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
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(med.status)}`}>
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

        {/* Authorization Warning */}
        {medications.some(med => {
          const stockItem = stockItems.find(s => getEntityId(s) === med.stockItemId);
          return stockItem?.requiresAuthorization;
        }) && !isDispensingMode && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Authorization Required</p>
              <p className="text-xs text-orange-700">
                Some medications require insurance authorization before they can be dispensed.
              </p>
            </div>
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
