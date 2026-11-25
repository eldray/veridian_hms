import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { medicationService } from '../../services/medicationService';
import { nursingService } from '../../services/nursingService';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { formatDate, formatTime } from '../../utils/dateUtils';

interface Medication {
  id: string;
  name: string;
  dose: string;
  route: string;
  frequency: string;
  startDate: string;
  endDate?: string;
}

interface MedicationAdministration {
  id: string;
  medicationId: string;
  medicationName: string;
  dose: string;
  route: string;
  scheduledTime: string;
  administeredAt?: string;
  administeredBy?: string;
  administeredByName?: string;
  status: 'DUE' | 'GIVEN' | 'REFUSED' | 'MISSED';
  notes?: string;
}

interface ClinicalNote {
  id: string;
  patientId: string;
  authorId: string;
  authorName: string;
  category: 'GENERAL' | 'WOUND' | 'EDUCATION' | 'CRITICAL';
  content: string;
  createdAt: string;
}

const MedicationChart: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [administrations, setAdministrations] = useState<MedicationAdministration[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<MedicationAdministration | null>(null);
  const [noteCategory, setNoteCategory] = useState('GENERAL');
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const [medsResponse, adminResponse, notesResponse] = await Promise.all([
        medicationService.getActiveMedications(patientId),
        nursingService.getMedicationAdministrations(patientId),
        nursingService.getClinicalNotes(patientId)
      ]);
      
      setMedications(medsResponse.data);
      setAdministrations(adminResponse.data);
      setNotes(notesResponse.data);
    } catch (error) {
      console.error('Failed to load patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GIVEN': return 'green';
      case 'REFUSED': return 'red';
      case 'MISSED': return 'gray';
      default: return 'yellow';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'GIVEN': return '✓ Given';
      case 'REFUSED': return '✗ Refused';
      case 'MISSED': return '⚠ Missed';
      default: return '⏰ Due';
    }
  };

  const handleAdminister = async (adminId: string, notes?: string) => {
    try {
      await nursingService.administerMedication(adminId, notes);
      await loadPatientData();
      setShowAdminModal(false);
    } catch (error) {
      alert('Failed to record administration');
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    
    try {
      await nursingService.addClinicalNote(patientId!, noteCategory, noteContent);
      await loadPatientData();
      setShowNoteModal(false);
      setNoteContent('');
    } catch (error) {
      alert('Failed to add note');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'WOUND': return 'orange';
      case 'EDUCATION': return 'blue';
      case 'CRITICAL': return 'red';
      default: return 'green';
    }
  };

  // Group administrations by date
  const groupedByDate = administrations.reduce((acc, admin) => {
    const date = formatDate(admin.scheduledTime);
    if (!acc[date]) acc[date] = [];
    acc[date].push(admin);
    return acc;
  }, {} as Record<string, MedicationAdministration[]>);

  if (loading) {
    return <div className="p-8 text-center">Loading medication chart...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Medication Administration Record (MAR)</h2>
        <Button onClick={() => setShowNoteModal(true)} variant="primary">
          📝 Add Clinical Note
        </Button>
      </div>

      {/* MAR Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Medication / Dose</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Route</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Frequency</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Today's Administrations</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((med) => {
                const todayAdmins = administrations.filter(
                  a => a.medicationId === med.id && 
                       formatDate(a.scheduledTime) === formatDate(new Date().toISOString())
                );

                return (
                  <tr key={med.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{med.name}</div>
                      <div className="text-sm text-gray-500">{med.dose}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{med.route}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{med.frequency}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {todayAdmins.length === 0 ? (
                          <span className="text-sm text-gray-400">No administrations today</span>
                        ) : (
                          todayAdmins.map((admin) => (
                            <div
                              key={admin.id}
                              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors
                                ${admin.status === 'GIVEN' ? 'bg-green-100 text-green-800' : ''}
                                ${admin.status === 'REFUSED' ? 'bg-red-100 text-red-800' : ''}
                                ${admin.status === 'DUE' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}
                                ${admin.status === 'MISSED' ? 'bg-gray-100 text-gray-800' : ''}
                              `}
                              onClick={() => {
                                if (admin.status === 'DUE') {
                                  setSelectedAdmin(admin);
                                  setShowAdminModal(true);
                                }
                              }}
                            >
                              {getStatusLabel(admin.status)} • {formatTime(admin.scheduledTime)}
                              {admin.administeredByName && ` by ${admin.administeredByName}`}
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Clinical Notes Section */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">📋 Clinical Notes & Care Plan</h3>
        </div>
        
        <div className="space-y-4">
          {notes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No clinical notes yet</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="border-l-4 pl-4 py-2" style={{ borderColor: getCategoryColor(note.category) }}>
                <div className="flex justify-between items-start mb-2">
                  <Badge color={getCategoryColor(note.category)}>{note.category}</Badge>
                  <span className="text-xs text-gray-500">
                    {formatDate(note.createdAt)} • {note.authorName}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Administration Modal */}
      {showAdminModal && selectedAdmin && (
        <Modal
          title="Record Medication Administration"
          onClose={() => setShowAdminModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medication
              </label>
              <p className="text-gray-900 font-medium">{selectedAdmin.medicationName}</p>
              <p className="text-sm text-gray-600">{selectedAdmin.dose} • {selectedAdmin.route}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Time
              </label>
              <p className="text-gray-900">{formatTime(selectedAdmin.scheduledTime)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., Patient tolerated well, no adverse effects..."
                onChange={(e) => setSelectedAdmin({...selectedAdmin, notes: e.target.value})}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => handleAdminister(selectedAdmin.id, selectedAdmin.notes)}
                variant="primary"
                className="flex-1"
              >
                ✓ Mark as Given
              </Button>
              <Button
                onClick={() => setShowAdminModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <Modal
          title="Add Clinical Note"
          onClose={() => setShowNoteModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <Select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value)}
                options={[
                  { value: 'GENERAL', label: 'General Observation' },
                  { value: 'WOUND', label: 'Wound Care' },
                  { value: 'EDUCATION', label: 'Patient Education' },
                  { value: 'CRITICAL', label: 'Critical Finding' }
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note Content *
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={5}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Enter detailed clinical observation..."
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleAddNote} variant="primary" className="flex-1">
                Save Note
              </Button>
              <Button onClick={() => setShowNoteModal(false)} variant="secondary" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MedicationChart;
