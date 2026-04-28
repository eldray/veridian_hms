// src/components/medical-entries/modals/MedicationModal.tsx - FIXED (No infinite loop)
import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Pill, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useAttendanceStore } from '../../../store/attendanceStore';
import { useMedicalServicesStore } from '../../../store/medicalServicesStore';
import { useToast } from '../../../store/toastStore';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string | null;
  stockItems: any[];
  canAdd: boolean;
  userId?: string;
}

export const MedicationModal: React.FC<MedicationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  attendanceId,
  stockItems,
  canAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [selectedServiceCatalog, setSelectedServiceCatalog] = useState<any>(null);
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks'>('days');
  const [route, setRoute] = useState('oral');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [medicationServiceCatalogs, setMedicationServiceCatalogs] = useState<any[]>([]);
  
  // ✅ Add ref to prevent multiple loads
  const hasLoaded = useRef(false);

  const { addMedication } = useAttendanceStore();
  const { serviceCatalog, getServiceCatalog } = useMedicalServicesStore();
  const { success, error } = useToast();

  // ✅ FIXED: Load service catalogs only once when modal opens
  useEffect(() => {
    if (isOpen && !hasLoaded.current) {
      hasLoaded.current = true;
      const loadServiceCatalogs = async () => {
        try {
          await getServiceCatalog({ serviceType: 'medication' });
        } catch (err) {
          console.error('Error loading medication service catalogs:', err);
        }
      };
      loadServiceCatalogs();
    }
    
    // Reset the ref when modal closes
    if (!isOpen) {
      hasLoaded.current = false;
    }
  }, [isOpen, getServiceCatalog]);

  // ✅ FIXED: Update medicationServiceCatalogs when serviceCatalog changes (but don't trigger re-fetch)
  useEffect(() => {
    if (serviceCatalog.length > 0) {
      const medServices = serviceCatalog.filter(sc => sc.stockItemId);
      setMedicationServiceCatalogs(medServices);
    }
  }, [serviceCatalog]);

  // Filter medications (only isMedication = true)
  const medicationStockItems = stockItems.filter(s => s.isMedication && s.isActive);

  const filteredMeds = medicationStockItems.filter(med =>
    med.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.drugCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.strength?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const frequencyOptions = [
    { value: 'once', label: 'Once Daily' },
    { value: 'bd', label: 'Twice Daily (BD)' },
    { value: 'tds', label: 'Three Times Daily (TDS)' },
    { value: 'qid', label: 'Four Times Daily (QID)' },
    { value: 'stat', label: 'STAT (Immediately)' },
    { value: 'prn', label: 'As Needed (PRN)' },
    { value: 'nocte', label: 'At Night (Nocte)' },
    { value: 'mane', label: 'In Morning (Mane)' },
  ];

  const routeOptions = [
    { value: 'oral', label: 'Oral' },
    { value: 'iv', label: 'Intravenous (IV)' },
    { value: 'im', label: 'Intramuscular (IM)' },
    { value: 'sc', label: 'Subcutaneous (SC)' },
    { value: 'topical', label: 'Topical' },
    { value: 'inhalation', label: 'Inhalation' },
    { value: 'rectal', label: 'Rectal' },
  ];

  const handleSelectMed = (med: any) => {
    setSelectedMed(med);
    setSearchTerm(med.name);
    setShowDropdown(false);
    
    // Find the service catalog for this medication
    const serviceCat = medicationServiceCatalogs.find(sc => sc.stockItemId === med.id);
    setSelectedServiceCatalog(serviceCat || null);
    
    // Auto-populate dosage from strength if available
    if (med.strength && !dosage) {
      setDosage(med.strength);
    }
  };

  const clearSelection = () => {
    setSelectedMed(null);
    setSelectedServiceCatalog(null);
    setSearchTerm('');
    setDosage('');
    setFrequency('');
    setDuration('');
    setDurationUnit('days');
    setRoute('oral');
    setInstructions('');
  };

  const getDurationDisplay = () => {
    if (!duration) return '';
    return `${duration} ${durationUnit}`;
  };

  const handleSubmit = async () => {
    if (!attendanceId) {
      error('No Attendance', 'Please select an attendance first');
      return;
    }

    if (!selectedMed) {
      error('No Medication', 'Please select a medication');
      return;
    }

    if (!selectedServiceCatalog) {
      error('No Pricing', 'This medication has no pricing configured. Please contact administrator.');
      return;
    }

    if (!dosage) {
      error('Missing Dosage', 'Please enter the dosage');
      return;
    }

    if (!frequency) {
      error('Missing Frequency', 'Please select the frequency');
      return;
    }

    setIsSubmitting(true);
    try {
      await addMedication(attendanceId, {
        stockItemId: selectedMed.id,
        serviceCatalogId: selectedServiceCatalog.id,
        dosage: dosage,
        frequency: frequency,
        duration: getDurationDisplay(),
        route: route,
        instructions: instructions,
      });

      success('Medication Prescribed', `${selectedMed.name} has been prescribed`);
      clearSelection();
      onSuccess();
    } catch (err: any) {
      error('Prescription Failed', err.message || 'Could not prescribe medication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const outOfStock = selectedMed ? selectedMed.currentStock === 0 : false;
  const lowStockWarning = selectedMed && selectedMed.currentStock > 0 && selectedMed.currentStock < (selectedMed.reorderLevel || 50);
  const hasPricing = selectedServiceCatalog !== null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Pill className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Prescribe Medication</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Select a medication and specify dosage
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            {/* Medication Search */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Search Medication *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                    if (selectedMed) setSelectedMed(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by drug name or code..."
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                  disabled={!canAdd}
                />
              </div>

              {/* Dropdown */}
              {showDropdown && searchTerm && filteredMeds.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-lg">
                  {filteredMeds.map((med) => {
                    const isOutOfStock = med.currentStock === 0;
                    const isLowStock = med.currentStock > 0 && med.currentStock < (med.reorderLevel || 50);
                    const hasServiceCat = medicationServiceCatalogs.some(sc => sc.stockItemId === med.id);
                    
                    return (
                      <button
                        key={med.id}
                        onClick={() => handleSelectMed(med)}
                        className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors ${isOutOfStock ? 'opacity-70' : ''}`}
                      >
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">
                          {med.name}
                          {!hasServiceCat && (
                            <span className="ml-2 text-xs text-red-500">(No pricing)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                          <span className="text-gray-500 dark:text-gray-400">
                            {med.strength || 'No strength specified'}
                          </span>
                          <span className={`flex items-center gap-1 ${isOutOfStock ? 'text-red-600 dark:text-red-400' : isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            <AlertCircle className="w-3 h-3" />
                            Stock: {med.currentStock}
                          </span>
                          {!hasServiceCat && (
                            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                              No Pricing
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Medication Display */}
            {selectedMed && (
              <div className={`rounded-lg p-3 border ${
                !hasPricing 
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  : outOfStock 
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' 
                    : lowStockWarning 
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' 
                      : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      {selectedMed.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {selectedMed.strength || 'Strength N/A'} • Stock: {selectedMed.currentStock}
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                
                {/* Pricing error */}
                {!hasPricing && (
                  <div className="mt-3 flex items-start gap-2 p-2 rounded bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-red-700 dark:text-red-300">
                      <span className="font-semibold">PRICING ERROR:</span> This medication has no service catalog entry. Cannot prescribe until pricing is configured.
                    </div>
                  </div>
                )}
                
                {/* Out of stock warning */}
                {hasPricing && outOfStock && (
                  <div className="mt-3 flex items-start gap-2 p-2 rounded bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-red-700 dark:text-red-300">
                      <span className="font-semibold">OUT OF STOCK:</span> This medication has 0 units available. Prescription will be recorded but cannot be dispensed until restocked.
                    </div>
                  </div>
                )}
                
                {/* Low stock warning */}
                {hasPricing && lowStockWarning && !outOfStock && (
                  <div className="mt-3 flex items-start gap-2 p-2 rounded bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      <span className="font-semibold">Low stock alert:</span> Only {selectedMed.currentStock} units available. Consider prescribing alternative or requesting restock.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dosage & Frequency Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Dosage *
                </label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g., 500mg, 1 tablet"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                  disabled={!selectedMed || !hasPricing}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Frequency *
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                  disabled={!selectedMed || !hasPricing}
                >
                  <option value="">Select frequency...</option>
                  {frequencyOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration & Route Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Duration
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g., 7"
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                    disabled={!selectedMed || !hasPricing}
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as 'days' | 'weeks')}
                    className="w-24 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white text-sm"
                    disabled={!selectedMed || !hasPricing}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Route of Administration
                </label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                  disabled={!selectedMed || !hasPricing}
                >
                  {routeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Instructions (Optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                placeholder="e.g., Take with food, avoid alcohol, etc."
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none"
                disabled={!selectedMed || !hasPricing}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedMed || !selectedServiceCatalog || !dosage || !frequency || isSubmitting}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Prescribing...
                </div>
              ) : (
                'Prescribe Medication'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};