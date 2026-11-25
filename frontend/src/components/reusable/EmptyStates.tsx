import React from 'react';
import { User, Calendar, FlaskConical, Package } from 'lucide-react';

export const NoPatientSelected: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
    <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
    <h3 className="text-base font-semibold text-gray-900 mb-2">No Patient Selected</h3>
    <p className="text-gray-600 text-sm">Search and select a patient to get started</p>
  </div>
);

export const NoAttendanceSelected: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
    <h3 className="text-base font-semibold text-gray-900 mb-2">No Attendance Selected</h3>
    <p className="text-gray-600 text-sm">Select an attendance to view and manage data</p>
  </div>
);

export const NoLabTestsSelected: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
    <FlaskConical className="w-12 h-12 text-gray-400 mx-auto mb-3" />
    <h3 className="text-base font-semibold text-gray-900 mb-2">No Lab Tests</h3>
    <p className="text-gray-600 text-sm">Select a test to enter results</p>
  </div>
);

export const NoMedicationsSelected: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
    <h3 className="text-base font-semibold text-gray-900 mb-2">No Medications</h3>
    <p className="text-gray-600 text-sm">No medications available for dispensing</p>
  </div>
);