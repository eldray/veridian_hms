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
  currentUser?: { fullName?: string; username?: string; id?: string };
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
    { value: 'stat', label: 'STAT' },
    { value: 'once', label: 'Once Daily' },
    { value: 'bd', label: 'BD' },
    { value: 'tds', label: 'TDS' },
    { value: 'qid', label: 'QID' },
    { value: 'nocte', label: 'Nocte' },
    { value: 'mane', label: 'Mane' },
    { value: '6hrly', label: '6 Hourly' },
    { value: '8hrly', label: '8 Hourly' },
    { value: '12hrly', label: '12 Hourly' },
    { value: '24hrly', label: '24 Hourly' },
    { value: 'prn', label: 'PRN' },
    { value: 'other', label: 'Other' }
  ];

  // Route options
  const routeOptions = [
    { value: 'oral', label: 'Oral' },
    { value: 'iv', label: 'IV' },
    { value: 'im', label: 'IM' },
    { value: 'sc', label: 'SC' },
    { value: 'topical', label: 'Topical' },
    { value: 'inhalation', label: 'Inhalation' },
    { value: 'rectal', label: 'Rectal' },
    { value: 'sublingual', label: 'Sublingual' }
  ];

  // Helper function to get entity ID
  const getEntityId = (entity: { id?: string; id?: string } | null): string | undefined => {
    return entity?.id || entity?.id;
  };

  const getMedicationPrice = (stockItem: StockItem) => {
    return paymentMode === 'cash' ? stockItem.sellingPrice : stockItem.insurancePrice;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'prescribed': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-bg)]';
      case 'dispensed': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
      case 'administered': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
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
    const selectedMed = medicationStockItems.find(item => item.id === currentMed.stockItemId);
    if (!selectedMed?.strength) return [];

    const strength = selectedMed.strength;
    const baseValue = parseFloat(strength.replace(/[^\d.]/g, ''));
    const unit = strength.replace(/[\d.]/g, '').trim();

    if (isNaN(baseValue)) return [];

    return [
      { value: `${baseValue}${unit}`, label: `${baseValue}${unit}` },
      { value: `${baseValue * 2}${unit}`, label: `${baseValue * 2}${unit}` },
      { value: `${baseValue * 3}${unit}`, label: `${baseValue * 3}${unit}` },
      { value: `${baseValue * 0.5}${unit}`, label: `${baseValue * 0.5}${unit}` },
      { value: `${baseValue * 0.25}${unit}`, label: `${baseValue * 0.25}${unit}` }
    ].filter(option => {
      const value = parseFloat(option.value.replace(/[^\d.]/g, ''));
      return value > 0 && value <= 5000;
    });
  };

  const handleMedicationSelect = (stockItem: StockItem) => {
    onMedChange({
      ...currentMed,
      stockItemId: stockItem.id,
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

  const selectedMedication = medicationStockItems.find(item => item.id === currentMed.stockItemId);
  const dosageOptions = getDosageOptions();

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
      <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
        <Pill className="w-5 h-5 text-[var(--icon-cyan-text)]" />
        {isDispensingMode ? 'Medications for Dispensing' : 'Medications'}
      </h2>
      
      <div className="space-y-4">
        {/* Medication Input Form - Only show in non-dispensing mode */}
        {!isDispensingMode && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Medication Search */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Search Medication
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Search medications..."
                    value={medicationSearch}
                    onChange={(e) => {
                      setMedicationSearch(e.target.value);
                      setShowMedicationDropdown(true);
                    }}
                    onFocus={() => setShowMedicationDropdown(true)}
                    className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                    disabled={!canAddEntries}
                  />
                  {medicationSearch && (
                    <button
                      onClick={clearMedicationSelection}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Medication Search Results */}
                {showMedicationDropdown && medicationSearch && (
                  <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                    {filteredMedications.length > 0 ? (
                      filteredMedications.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleMedicationSelect(item)}
                          className="w-full text-left p-2 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors text-sm"
                        >
                          <div className="font-semibold text-[var(--text-primary)]">{item.name}</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {item.strength} • Stock: {item.currentStock}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                            ${getMedicationPrice(item).toFixed(2)} ({paymentMode})
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-[var(--text-secondary)] text-center text-sm">
                        No medications found
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Dosage Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Dosage *
                </label>
                {selectedMedication ? (
                  <select
                    value={currentMed.dosage}
                    onChange={(e) => onMedChange({ ...currentMed, dosage: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
                    disabled={!canAddEntries}
                  >
                    <option value="">Select dosage...</option>
                    {dosageOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Select medication first"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-secondary)] text-sm"
                    disabled
                  />
                )}
                
                {/* Custom dosage input */}
                {currentMed.dosage === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom dosage"
                    onChange={(e) => onMedChange({ ...currentMed, dosage: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
                    disabled={!canAddEntries}
                  />
                )}
              </div>
              
              {/* Frequency Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Frequency
                </label>
                <select
                  value={currentMed.frequency}
                  onChange={(e) => onMedChange({ ...currentMed, frequency: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
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
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Duration
                </label>
                <div className="flex gap-1.5">
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
                    className="w-2/3 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
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
                    className="w-1/3 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
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
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={currentMed.quantity}
                  onChange={(e) => onMedChange({ ...currentMed, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
                  disabled={!canAddEntries}
                />
              </div>

              {/* Route */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Route
                </label>
                <select
                  value={currentMed.route}
                  onChange={(e) => onMedChange({ ...currentMed, route: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--icon-cyan-text)]">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Strength</label>
                  <span className="text-xs text-[var(--text-primary)]">
                    {selectedMedication.strength || 'N/A'}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Unit Price</label>
                  <span className="text-xs text-[var(--text-primary)] flex items-center gap-0.5">
                    <DollarSign className="w-2.5 h-2.5" />
                    {getMedicationPrice(selectedMedication).toFixed(2)}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Total Cost</label>
                  <span className="text-xs text-[var(--text-primary)] flex items-center gap-0.5">
                    <DollarSign className="w-2.5 h-2.5" />
                    {(getMedicationPrice(selectedMedication) * currentMed.quantity).toFixed(2)}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Auth</label>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    selectedMedication.requiresAuthorization
                      ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]'
                      : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                  }`}>
                    {selectedMedication.requiresAuthorization ? 'Required' : 'Not Required'}
                  </span>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Instructions
              </label>
              <input
                type="text"
                placeholder="Special instructions for patient"
                value={currentMed.instructions || ''}
                onChange={(e) => onMedChange({ ...currentMed, instructions: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
                disabled={!canAddEntries}
              />
            </div>
            
            {/* Add Medication Button */}
            {canAddEntries && selectedMedication && currentMed.dosage && currentMed.frequency && (
              <button
                onClick={onAddMedication}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Medication
              </button>
            )}
          </>
        )}

        {/* Dispensing Actions - Only show in dispensing mode */}
        {isDispensingMode && medications.length > 0 && (
          <div className="bg-[var(--icon-cyan-bg)] border border-[var(--icon-cyan-text)] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                <span className="font-semibold text-[var(--icon-cyan-text)] text-sm">
                  {medications.filter(m => m.status === 'prescribed').length} pending
                </span>
              </div>
              {onDispenseAll && selectedAttendanceId && (
                <button
                  onClick={() => onDispenseAll(selectedAttendanceId)}
                  disabled={dispensingId === `all-${selectedAttendanceId}`}
                  className="px-3 py-1.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors disabled:opacity-50 text-xs font-semibold"
                >
                  {dispensingId === `all-${selectedAttendanceId}` ? 'Dispensing...' : 'Dispense All'}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Medication List */}
        {medications.length > 0 && (
          <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
              <h4 className="font-semibold text-[var(--text-primary)]">Prescribed Medications</h4>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              {medications.map((med) => {
                const stockItem = stockItems.find((s) => getEntityId(s) === med.stockItemId);
                const hasStock = stockItem && stockItem.currentStock >= med.quantity;
                const isDispensing = dispensingId === getEntityId(med);
                
                // Get frequency label
                const frequencyLabel = frequencyOptions.find(f => f.value === med.frequency)?.label || med.frequency;
                
                return (
                  <div key={getEntityId(med)} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[var(--text-primary)]">{med.name}</span>
                          {stockItem?.requiresAuthorization && (
                            <Shield className="w-3.5 h-3.5 text-[var(--icon-orange-text)]" />
                          )}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] space-y-0.5">
                          <div>Dosage: {med.dosage} • Frequency: {frequencyLabel}</div>
                          <div>Duration: {med.duration} • Quantity: {med.quantity}</div>
                          {med.instructions && (
                            <div>Instructions: {med.instructions}</div>
                          )}
                        </div>
                      </div>
                      
                      {isDispensingMode && (
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              hasStock ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]'
                            }`}>
                              {stockItem ? `Stock: ${stockItem.currentStock}` : 'N/A'}
                            </div>
                            <div className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusColor(med.status)}`}>
                              {med.status}
                            </div>
                          </div>
                          
                          {med.status === 'prescribed' && onDispenseMedication && selectedAttendanceId && (
                            <button
                              onClick={() => onDispenseMedication(selectedAttendanceId, getEntityId(med) || '')}
                              disabled={!hasStock || isDispensing}
                              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                                hasStock
                                  ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white'
                                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] cursor-not-allowed'
                              } ${isDispensing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isDispensing ? '...' : hasStock ? 'Dispense' : 'No Stock'}
                            </button>
                          )}
                          
                          {med.status === 'dispensed' && (
                            <div className="flex items-center gap-1 text-[var(--icon-green-text)] text-xs">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span className="font-medium">Done</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!isDispensingMode && (
                        <button
                          onClick={() => {
                            const updatedMeds = medications.filter(m => getEntityId(m) !== getEntityId(med));
                            // You'll need to pass a setMedications function to update the parent state
                          }}
                          className="text-[var(--icon-red-text)] hover:text-[var(--icon-red-text)] ml-4"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Authorization Warning */}
        {medications.some(med => {
          const stockItem = stockItems.find(s => getEntityId(s) === med.stockItemId);
          return stockItem?.requiresAuthorization;
        }) && !isDispensingMode && (
          <div className="p-3 bg-[var(--icon-orange-bg)] border border-[var(--icon-orange-text)] rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--icon-orange-text)] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--icon-orange-text)]">Authorization Required</p>
              <p className="text-xs text-[var(--icon-orange-text)]">
                Some medications require insurance authorization.
              </p>
            </div>
          </div>
        )}

        {/* Empty state for dispensing mode */}
        {isDispensingMode && medications.length === 0 && (
          <div className="text-center py-6 text-[var(--text-secondary)]">
            <Package className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-sm">No medications found</p>
            <p className="text-xs">Medications will appear here once prescribed</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicationsSection;