// src/components/settings/MedicalServicesManagement.tsx - REDESIGNED WITH MORBIDITY DROPDOWN
import React, { useState, useEffect } from 'react';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import CreateEditModal from '../components/CreateEditModal';
import { useToast } from '../store/toastStore';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText, 
  FlaskConical, 
  Scissors, 
  Scan,
  CheckCircle, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  getDiagnoses as apiGetDiagnoses,
  getLabTestTemplates as apiGetLabTestTemplates,
  getProcedureTemplates as apiGetProcedureTemplates,
  getScanTemplates as apiGetScanTemplates,
} from '../api';

type ActiveTab = 'diagnoses' | 'lab-tests' | 'procedures' | 'scans';

interface MedicalServicesManagementProps {
  initialTab?: ActiveTab;
}

// Complete list of morbidity groups from Ghana NHIS classification
const MORBIDITY_GROUPS = [
  // Communicable Immunizable
  { value: 'afp_polio', label: 'AFP/Polio', category: 'Communicable Immunizable' },
  { value: 'meningitis', label: 'Meningitis', category: 'Communicable Immunizable' },
  { value: 'neonatal_tetanus', label: 'Neonatal Tetanus', category: 'Communicable Immunizable' },
  { value: 'pertussis_whooping_cough', label: 'Pertussis (Whooping Cough)', category: 'Communicable Immunizable' },
  { value: 'diphtheria', label: 'Diphtheria', category: 'Communicable Immunizable' },
  { value: 'measles', label: 'Measles', category: 'Communicable Immunizable' },
  { value: 'yellow_fever', label: 'Yellow Fever', category: 'Communicable Immunizable' },
  { value: 'tetanus', label: 'Tetanus', category: 'Communicable Immunizable' },
  { value: 'tuberculosis', label: 'Tuberculosis', category: 'Communicable Immunizable' },
  
  // Communicable Non-Immunizable
  { value: 'uncomplicated_malaria_suspected', label: 'Uncomplicated Malaria (Suspected)', category: 'Communicable Non-Immunizable' },
  { value: 'uncomplicated_malaria_tested', label: 'Uncomplicated Malaria (Tested)', category: 'Communicable Non-Immunizable' },
  { value: 'uncomplicated_malaria_positive', label: 'Uncomplicated Malaria (Positive)', category: 'Communicable Non-Immunizable' },
  { value: 'uncomplicated_malaria_not_tested_treated', label: 'Uncomplicated Malaria (Not Tested/Treated)', category: 'Communicable Non-Immunizable' },
  { value: 'uncomplicated_malaria_tested_negative_treated', label: 'Uncomplicated Malaria (Tested Negative/Treated)', category: 'Communicable Non-Immunizable' },
  { value: 'malaria_in_pregnancy_suspected', label: 'Malaria in Pregnancy (Suspected)', category: 'Communicable Non-Immunizable' },
  { value: 'malaria_in_pregnancy_tested', label: 'Malaria in Pregnancy (Tested)', category: 'Communicable Non-Immunizable' },
  { value: 'malaria_in_pregnancy_positive', label: 'Malaria in Pregnancy (Positive)', category: 'Communicable Non-Immunizable' },
  { value: 'malaria_in_pregnancy_not_tested_treated', label: 'Malaria in Pregnancy (Not Tested/Treated)', category: 'Communicable Non-Immunizable' },
  { value: 'malaria_in_pregnancy_tested_negative_treated', label: 'Malaria in Pregnancy (Tested Negative/Treated)', category: 'Communicable Non-Immunizable' },
  { value: 'severe_malaria_lab_confirmed', label: 'Severe Malaria (Lab Confirmed)', category: 'Communicable Non-Immunizable' },
  { value: 'severe_malaria_non_lab_confirmed', label: 'Severe Malaria (Non-Lab Confirmed)', category: 'Communicable Non-Immunizable' },
  { value: 'typhoid_fever', label: 'Typhoid Fever', category: 'Communicable Non-Immunizable' },
  { value: 'suspected_cholera', label: 'Suspected Cholera', category: 'Communicable Non-Immunizable' },
  { value: 'diarrhoea_diseases', label: 'Diarrhoea Diseases', category: 'Communicable Non-Immunizable' },
  { value: 'viral_hepatitis', label: 'Viral Hepatitis', category: 'Communicable Non-Immunizable' },
  { value: 'schistosomiasis_bilharzia', label: 'Schistosomiasis (Bilharzia)', category: 'Communicable Non-Immunizable' },
  { value: 'suspected_guinea_worm', label: 'Suspected Guinea Worm', category: 'Communicable Non-Immunizable' },
  { value: 'onchocerciasis', label: 'Onchocerciasis', category: 'Communicable Non-Immunizable' },
  { value: 'buruli_ulcer', label: 'Buruli Ulcer', category: 'Communicable Non-Immunizable' },
  { value: 'leprosy', label: 'Leprosy', category: 'Communicable Non-Immunizable' },
  { value: 'hiv_aids_related_conditions', label: 'HIV/AIDS Related Conditions', category: 'Communicable Non-Immunizable' },
  { value: 'mumps', label: 'Mumps', category: 'Communicable Non-Immunizable' },
  { value: 'intestinal_worms', label: 'Intestinal Worms', category: 'Communicable Non-Immunizable' },
  { value: 'chicken_pox', label: 'Chicken Pox', category: 'Communicable Non-Immunizable' },
  { value: 'upper_respiratory_tract_infections', label: 'Upper Respiratory Tract Infections', category: 'Communicable Non-Immunizable' },
  { value: 'pneumonia', label: 'Pneumonia', category: 'Communicable Non-Immunizable' },
  { value: 'septicaemia', label: 'Septicaemia', category: 'Communicable Non-Immunizable' },
  
  // Non-Communicable Diseases
  { value: 'malnutrition', label: 'Malnutrition', category: 'Non-Communicable' },
  { value: 'obesity', label: 'Obesity', category: 'Non-Communicable' },
  { value: 'anaemia', label: 'Anaemia', category: 'Non-Communicable' },
  { value: 'other_nutritional_diseases', label: 'Other Nutritional Diseases', category: 'Non-Communicable' },
  { value: 'hypertension', label: 'Hypertension', category: 'Non-Communicable' },
  { value: 'cardiac_diseases', label: 'Cardiac Diseases', category: 'Non-Communicable' },
  { value: 'stroke', label: 'Stroke', category: 'Non-Communicable' },
  { value: 'diabetes_mellitus', label: 'Diabetes Mellitus', category: 'Non-Communicable' },
  { value: 'rheumatism_arthritis', label: 'Rheumatism/Arthritis', category: 'Non-Communicable' },
  { value: 'sickle_cell_disease', label: 'Sickle Cell Disease', category: 'Non-Communicable' },
  { value: 'asthma', label: 'Asthma', category: 'Non-Communicable' },
  { value: 'chronic_obstructive_pulmonary_disease', label: 'COPD', category: 'Non-Communicable' },
  { value: 'breast_cancer', label: 'Breast Cancer', category: 'Non-Communicable' },
  { value: 'cervical_cancer', label: 'Cervical Cancer', category: 'Non-Communicable' },
  { value: 'lymphoma', label: 'Lymphoma', category: 'Non-Communicable' },
  { value: 'prostate_cancer', label: 'Prostate Cancer', category: 'Non-Communicable' },
  { value: 'hepatocellular_carcinoma', label: 'Hepatocellular Carcinoma', category: 'Non-Communicable' },
  { value: 'all_other_cancers', label: 'All Other Cancers', category: 'Non-Communicable' },
  
  // Mental Health
  { value: 'schizophrenia', label: 'Schizophrenia', category: 'Mental Health' },
  { value: 'acute_psychotic_disorder', label: 'Acute Psychotic Disorder', category: 'Mental Health' },
  { value: 'mono_symptoms_delusion', label: 'Mono-Symptoms Delusion', category: 'Mental Health' },
  { value: 'depression', label: 'Depression', category: 'Mental Health' },
  { value: 'substance_abuse', label: 'Substance Abuse', category: 'Mental Health' },
  { value: 'epilepsy', label: 'Epilepsy', category: 'Mental Health' },
  { value: 'autism', label: 'Autism', category: 'Mental Health' },
  { value: 'mental_retardation', label: 'Mental Retardation', category: 'Mental Health' },
  { value: 'attention_deficit_hyperactivity_disorder', label: 'ADHD', category: 'Mental Health' },
  { value: 'conversion_disorders', label: 'Conversion Disorders', category: 'Mental Health' },
  { value: 'post_traumatic_stress_syndrome', label: 'PTSD', category: 'Mental Health' },
  { value: 'generalized_anxiety', label: 'Generalized Anxiety', category: 'Mental Health' },
  { value: 'other_anxiety_disorders', label: 'Other Anxiety Disorders', category: 'Mental Health' },
  { value: 'neurosis', label: 'Neurosis', category: 'Mental Health' },
  
  // Specialized Conditions
  { value: 'acute_eye_infection', label: 'Acute Eye Infection', category: 'Specialized' },
  { value: 'cataract', label: 'Cataract', category: 'Specialized' },
  { value: 'trachoma', label: 'Trachoma', category: 'Specialized' },
  { value: 'otitis_media', label: 'Otitis Media', category: 'Specialized' },
  { value: 'other_acute_ear_infection', label: 'Other Acute Ear Infection', category: 'Specialized' },
  { value: 'dental_caries', label: 'Dental Caries', category: 'Specialized' },
  { value: 'dental_swellings', label: 'Dental Swellings', category: 'Specialized' },
  { value: 'traumatic_conditions_oral', label: 'Traumatic Conditions (Oral)', category: 'Specialized' },
  { value: 'periodontal_diseases', label: 'Periodontal Diseases', category: 'Specialized' },
  { value: 'cerebral_palsy', label: 'Cerebral Palsy', category: 'Specialized' },
  { value: 'liver_diseases', label: 'Liver Diseases', category: 'Specialized' },
  { value: 'acute_urinary_tract_infection', label: 'Acute UTI', category: 'Specialized' },
  { value: 'skin_diseases', label: 'Skin Diseases', category: 'Specialized' },
  { value: 'ulcer', label: 'Ulcer', category: 'Specialized' },
  { value: 'kidney_related_diseases', label: 'Kidney Related Diseases', category: 'Specialized' },
  { value: 'other_oral_conditions', label: 'Other Oral Conditions', category: 'Specialized' },
  
  // Obstetrics & Gynaecology
  { value: 'gynaecological_conditions', label: 'Gynaecological Conditions', category: 'Obstetrics & Gynaecology' },
  { value: 'pregnancy_related_complications', label: 'Pregnancy Related Complications', category: 'Obstetrics & Gynaecology' },
  { value: 'anaemia_in_pregnancy', label: 'Anaemia in Pregnancy', category: 'Obstetrics & Gynaecology' },
  
  // Reproductive Tract
  { value: 'gonorrhoea', label: 'Gonorrhoea', category: 'Reproductive Tract' },
  { value: 'genital_ulcer', label: 'Genital Ulcer', category: 'Reproductive Tract' },
  { value: 'vaginal_discharge', label: 'Vaginal Discharge', category: 'Reproductive Tract' },
  { value: 'urethral_discharge', label: 'Urethral Discharge', category: 'Reproductive Tract' },
  { value: 'other_diseases_male_reproductive_system', label: 'Other Male Reproductive Diseases', category: 'Reproductive Tract' },
  { value: 'other_diseases_female_reproductive_system', label: 'Other Female Reproductive Diseases', category: 'Reproductive Tract' },
  
  // Injuries
  { value: 'transport_injuries_road_traffic_accidents', label: 'Road Traffic Accidents', category: 'Injuries' },
  { value: 'home_injuries', label: 'Home Injuries', category: 'Injuries' },
  { value: 'occupational_industrial_injuries', label: 'Occupational/Industrial Injuries', category: 'Injuries' },
  { value: 'burns', label: 'Burns', category: 'Injuries' },
  { value: 'poisoning_occupational', label: 'Poisoning (Occupational)', category: 'Injuries' },
  { value: 'dog_bite', label: 'Dog Bite', category: 'Injuries' },
  { value: 'human_bites', label: 'Human Bites', category: 'Injuries' },
  { value: 'snake_bite', label: 'Snake Bite', category: 'Injuries' },
  { value: 'sexual_abuse', label: 'Sexual Abuse', category: 'Injuries' },
  { value: 'domestic_violence', label: 'Domestic Violence', category: 'Injuries' },
  { value: 'pyrexia_unknown_origin_non_malaria', label: 'Pyrexia Unknown Origin (Non-Malaria)', category: 'Injuries' },
  { value: 'brought_in_dead', label: 'Brought In Dead', category: 'Injuries' },
  { value: 'other_animal_bites', label: 'Other Animal Bites', category: 'Injuries' },
  { value: 'all_other_diseases', label: 'All Other Diseases', category: 'Injuries' },
];

// Group morbidity options by category for the select dropdown
const getMorbidityOptionsByCategory = () => {
  const grouped: { [key: string]: typeof MORBIDITY_GROUPS } = {};
  MORBIDITY_GROUPS.forEach(item => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });
  return grouped;
};

export default function MedicalServicesManagement({ initialTab = 'diagnoses' }: MedicalServicesManagementProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [morbidityFilter, setMorbidityFilter] = useState<string>('all');
  const [showMorbidityDropdown, setShowMorbidityDropdown] = useState(false);
  
  // Total counts state
  const [totalCounts, setTotalCounts] = useState({
    diagnoses: 0,
    labTests: 0,
    procedures: 0,
    scans: 0,
  });
  
  const { success, error: toastError } = useToast();
  
  const {
    diagnoses,
    labTestTemplates,
    procedureTemplates,
    scanTemplates,
    isLoadingDiagnoses,
    isLoadingLabTests,
    isLoadingProcedures,
    isLoadingScans,
    scanCategories,
    scanBodyParts,
    scanTypes,
    getDiagnoses,
    getLabTestTemplates,
    getProcedureTemplates,
    getScanTemplates,
    createDiagnosis,
    updateDiagnosis,
    deleteDiagnosis,
    createLabTestTemplate,
    updateLabTestTemplate,
    deleteLabTestTemplate,
    createProcedureTemplate,
    updateProcedureTemplate,
    deleteProcedureTemplate,
    createScanTemplate,
    updateScanTemplate,
    deleteScanTemplate,
    getScanCategories,
    getScanBodyParts,
    getScanTypes
  } = useMedicalServicesStore();

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Load metadata
  useEffect(() => {
    loadMetadata();
  }, []);

  // Load all counts when component mounts
  useEffect(() => {
    loadAllCounts();
  }, []);

  const loadAllCounts = async () => {
    try {
      const [allDiagnoses, allLabTests, allProcedures, allScans] = await Promise.all([
        apiGetDiagnoses({ limit: 10000 }),
        apiGetLabTestTemplates({ limit: 10000 }),
        apiGetProcedureTemplates({ limit: 10000 }),
        apiGetScanTemplates({ limit: 10000 }),
      ]);
      
      setTotalCounts({
        diagnoses: Array.isArray(allDiagnoses) ? allDiagnoses.length : 0,
        labTests: Array.isArray(allLabTests) ? allLabTests.length : 0,
        procedures: Array.isArray(allProcedures) ? allProcedures.length : 0,
        scans: Array.isArray(allScans) ? allScans.length : 0,
      });
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const loadData = async () => {
    try {
      switch (activeTab) {
        case 'diagnoses':
          await getDiagnoses({ limit: 1000 });
          break;
        case 'lab-tests':
          await getLabTestTemplates({ limit: 1000 });
          break;
        case 'procedures':
          await getProcedureTemplates({ limit: 1000 });
          break;
        case 'scans':
          await getScanTemplates({ limit: 1000 });
          break;
      }
    } catch (error: any) {
      toastError('Load failed', `Failed to load ${activeTab}`);
    }
  };

  const loadMetadata = async () => {
    try {
      await Promise.all([
        getScanCategories(),
        getScanBodyParts(),
        getScanTypes()
      ]);
    } catch (error) {
      console.warn('Some metadata failed to load');
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'diagnoses': return diagnoses;
      case 'lab-tests': return labTestTemplates;
      case 'procedures': return procedureTemplates;
      case 'scans': return scanTemplates;
      default: return [];
    }
  };

  const getFilteredData = () => {
    let data = getCurrentData();
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter((item: any) => {
        switch (activeTab) {
          case 'diagnoses':
            return (
              item.name?.toLowerCase().includes(term) ||
              item.icdCode?.toLowerCase().includes(term) ||
              item.gdrgGroupCode?.toLowerCase().includes(term) ||
              item.morbidityGroup?.toLowerCase().includes(term)
            );
          case 'lab-tests':
            return (
              item.name?.toLowerCase().includes(term) ||
              item.investigationCode?.toLowerCase().includes(term) ||
              item.category?.toLowerCase().includes(term)
            );
          case 'procedures':
            return (
              item.name?.toLowerCase().includes(term) ||
              item.procedureCode?.toLowerCase().includes(term) ||
              item.category?.toLowerCase().includes(term)
            );
          case 'scans':
            return (
              item.name?.toLowerCase().includes(term) ||
              item.scanCode?.toLowerCase().includes(term) ||
              item.category?.toLowerCase().includes(term)
            );
          default:
            return false;
        }
      });
    }
    
    // Apply morbidity filter (only for diagnoses tab)
    if (activeTab === 'diagnoses' && morbidityFilter !== 'all') {
      data = data.filter((item: any) => item.morbidityGroup === morbidityFilter);
    }
    
    return data;
  };

  const handleCreate = async (data: any) => {
    try {
      switch (activeTab) {
        case 'diagnoses':
          await createDiagnosis(data);
          success('Diagnosis created', 'Diagnosis added successfully');
          break;
        case 'lab-tests':
          await createLabTestTemplate(data);
          success('Lab test created', 'Lab test template added successfully');
          break;
        case 'procedures':
          await createProcedureTemplate(data);
          success('Procedure created', 'Procedure template added successfully');
          break;
        case 'scans':
          await createScanTemplate(data);
          success('Scan created', 'Scan template added successfully');
          break;
      }
      setShowCreateModal(false);
      await loadData();
      await loadAllCounts();
    } catch (error: any) {
      toastError('Create failed', error.message || 'Failed to create item');
    }
  };

  const handleEdit = async (data: any) => {
    if (!editingItem) return;

    try {
      switch (activeTab) {
        case 'diagnoses':
          await updateDiagnosis(editingItem.id, data);
          success('Diagnosis updated', 'Diagnosis updated successfully');
          break;
        case 'lab-tests':
          await updateLabTestTemplate(editingItem.id, data);
          success('Lab test updated', 'Lab test template updated successfully');
          break;
        case 'procedures':
          await updateProcedureTemplate(editingItem.id, data);
          success('Procedure updated', 'Procedure template updated successfully');
          break;
        case 'scans':
          await updateScanTemplate(editingItem.id, data);
          success('Scan updated', 'Scan template updated successfully');
          break;
      }
      setEditingItem(null);
      await loadData();
      await loadAllCounts();
    } catch (error: any) {
      toastError('Update failed', error.message || 'Failed to update item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      switch (activeTab) {
        case 'diagnoses':
          await deleteDiagnosis(id);
          success('Diagnosis deleted', 'Diagnosis removed successfully');
          break;
        case 'lab-tests':
          await deleteLabTestTemplate(id);
          success('Lab test deleted', 'Lab test template removed successfully');
          break;
        case 'procedures':
          await deleteProcedureTemplate(id);
          success('Procedure deleted', 'Procedure template removed successfully');
          break;
        case 'scans':
          await deleteScanTemplate(id);
          success('Scan deleted', 'Scan template removed successfully');
          break;
      }
      setDeleteConfirm(null);
      await loadData();
      await loadAllCounts();
    } catch (error: any) {
      toastError('Delete failed', error.message || 'Failed to delete item');
    }
  };

  const getIsLoading = () => {
    switch (activeTab) {
      case 'diagnoses': return isLoadingDiagnoses;
      case 'lab-tests': return isLoadingLabTests;
      case 'procedures': return isLoadingProcedures;
      case 'scans': return isLoadingScans;
      default: return false;
    }
  };

  const tabs = [
    { id: 'diagnoses' as ActiveTab, label: 'Diagnoses', icon: FileText, color: 'purple', count: totalCounts.diagnoses },
    { id: 'lab-tests' as ActiveTab, label: 'Lab Tests', icon: FlaskConical, color: 'blue', count: totalCounts.labTests },
    { id: 'procedures' as ActiveTab, label: 'Procedures', icon: Scissors, color: 'green', count: totalCounts.procedures },
    { id: 'scans' as ActiveTab, label: 'Scans', icon: Scan, color: 'orange', count: totalCounts.scans },
  ];

  const filteredData = getFilteredData();
  const isLoading = getIsLoading();

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, morbidityFilter]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getStatusBadge = (item: any) => {
    const isActive = item.isActive !== false;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 text-green-700' 
          : 'bg-yellow-100 text-yellow-700'
      }`}>
        <CheckCircle className="w-3 h-3" />
        {isActive ? 'Active' : 'Pending'}
      </span>
    );
  };

  const getCode = (item: any) => {
    switch (activeTab) {
      case 'diagnoses':
        return `${item.icdCode || 'N/A'}${item.gdrgGroupCode ? ` / ${item.gdrgGroupCode}` : ''}`;
      case 'lab-tests':
        // Lab tests use the service catalog code
        return item.code || item.investigationCode || 'N/A';
      case 'procedures':
        // Procedures use the service catalog code
        return item.code || item.procedureCode || 'N/A';
      case 'scans':
        // Scans use the service catalog code
        return item.code || item.scanCode || 'N/A';
      default:
        return 'N/A';
    }
  };

  const getCategory = (item: any) => {
    switch (activeTab) {
      case 'lab-tests':
        // Get category from the LabTestTemplate relation or serviceCategory
        return item.LabTestTemplate?.category || item.serviceCategory || item.category || 'General';
      case 'procedures':
        return item.serviceCategory || item.category || 'General';
      case 'scans':
        return item.serviceCategory || item.category || 'General';
      default:
        return item.category || 'General';
    }
  };

  const getMorbidityGroupLabel = (value: string) => {
    const found = MORBIDITY_GROUPS.find(m => m.value === value);
    return found ? found.label : value || 'Unassigned';
  };

  const morbidityOptionsByCategory = getMorbidityOptionsByCategory();
  const selectedMorbidityLabel = morbidityFilter === 'all' ? 'All Morbidities' : getMorbidityGroupLabel(morbidityFilter);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-4 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActiveTab = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
                setCurrentPage(1);
                setMorbidityFilter('all');
              }}
              className={`bg-[var(--bg-card)] rounded-xl p-3 border transition-all text-center ${
                isActiveTab
                  ? `border-[var(--icon-${tab.color}-text)] bg-[var(--icon-${tab.color}-bg)]/10`
                  : 'border-[var(--border-color)] hover:border-[var(--icon-cyan-text)]'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${
                isActiveTab ? `text-[var(--icon-${tab.color}-text)]` : 'text-[var(--text-secondary)]'
              }`} />
              <p className={`text-xl font-bold ${
                isActiveTab ? `text-[var(--icon-${tab.color}-text)]` : 'text-[var(--text-primary)]'
              }`}>
                {tab.count}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{tab.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search, Filter and Add Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)] text-sm"
            />
          </div>
        </div>
        
        {/* Morbidity Filter Dropdown - Only show for Diagnoses tab */}
        {activeTab === 'diagnoses' && (
          <div className="relative">
            <button
              onClick={() => setShowMorbidityDropdown(!showMorbidityDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition-colors text-sm"
            >
              <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-[var(--text-primary)]">{selectedMorbidityLabel}</span>
            </button>
            
            {showMorbidityDropdown && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg z-20">
                <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] p-2">
                  <button
                    onClick={() => {
                      setMorbidityFilter('all');
                      setShowMorbidityDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm ${
                      morbidityFilter === 'all'
                        ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                    }`}
                  >
                    All Morbidities
                  </button>
                </div>
                {Object.entries(morbidityOptionsByCategory).map(([category, items]) => (
                  <div key={category} className="border-b border-[var(--border-color)] last:border-0">
                    <div className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-main)] uppercase sticky top-[45px]">
                      {category}
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => {
                          setMorbidityFilter(item.value);
                          setShowMorbidityDropdown(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm ${
                          morbidityFilter === item.value
                            ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                            : 'text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add New
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-[var(--text-secondary)] text-sm">Loading {activeTab}...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[var(--text-secondary)] mb-2">
              No {activeTab} found
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {searchTerm || morbidityFilter !== 'all' ? 'Try adjusting your search or filter terms' : `Get started by creating your first ${activeTab.slice(0, -1)}`}
            </p>
            {!searchTerm && morbidityFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Create {activeTab.slice(0, -1)}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Code</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Category</th>
                    {activeTab === 'diagnoses' && (
                      <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Morbidity Group</th>
                    )}
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--text-primary)]">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-[var(--text-secondary)] truncate max-w-xs mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">
                        {getCode(item)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-[var(--bg-main)] text-[var(--text-secondary)] rounded text-xs">
                          {activeTab === 'lab-tests' && item.specimenType 
                            ? `${item.category} / ${item.specimenType}`
                            : item.category || 'General'}
                        </span>
                      </td>
                      {activeTab === 'diagnoses' && (
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded text-xs">
                            {getMorbidityGroupLabel(item.morbidityGroup)}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {getStatusBadge(item)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-bg)] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="p-1.5 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-[var(--border-color)] px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs text-[var(--text-secondary)]">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} items
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1.5 border border-[var(--border-color)] rounded-lg text-xs bg-[var(--bg-main)] text-[var(--text-primary)]"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingItem) && (
        <CreateEditModal
          type={activeTab}
          item={editingItem}
          onSave={editingItem ? handleEdit : handleCreate}
          onClose={() => {
            setShowCreateModal(false);
            setEditingItem(null);
          }}
          metadata={{
            scanCategories,
            scanBodyParts,
            scanTypes,
            morbidityGroups: MORBIDITY_GROUPS
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[var(--icon-red-text)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Delete {activeTab.slice(0, -1)}</h3>
                <p className="text-xs text-[var(--text-secondary)]">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete this {activeTab.slice(0, -1)}? This will remove it permanently from the system.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}