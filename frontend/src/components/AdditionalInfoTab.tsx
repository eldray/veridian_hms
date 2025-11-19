// src/components/AdditionalInfoTab.tsx - UPDATED WITH RESPONSIVE DESIGN
import { Mail, Home, IdCard, Heart, Briefcase, Users, Phone } from 'lucide-react';
import type { AdditionalInfo } from '../types';

interface AdditionalInfoTabProps {
  additionalInfo: AdditionalInfo;
  onAdditionalInfoChange: (info: AdditionalInfo) => void;
}

export default function AdditionalInfoTab({ 
  additionalInfo, 
  onAdditionalInfoChange 
}: AdditionalInfoTabProps) {
  
  const updateField = (field: string, value: any) => {
    onAdditionalInfoChange({
      ...additionalInfo,
      [field]: value
    });
  };

  const updateEmergencyContact = (field: string, value: string) => {
    onAdditionalInfoChange({
      ...additionalInfo,
      emergencyContact: {
        ...additionalInfo.emergencyContact,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Optional Info Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Additional Information (Optional)
        </h3>
        <p className="text-blue-700 text-xs">
          These fields are optional and can be filled later if needed.
        </p>
      </div>

      {/* Contact Information */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={additionalInfo.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="patient@example.com"
              className="w-full px-3 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Home className="w-4 h-4 inline mr-2 text-green-600" />
              House Number
            </label>
            <input
              type="text"
              value={additionalInfo.houseNumber || ''}
              onChange={(e) => updateField('houseNumber', e.target.value)}
              placeholder="House/Apartment number"
              className="w-full px-3 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Identification */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <IdCard className="w-5 h-5 text-purple-600" />
          Identification
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Type
            </label>
            <select
              value={additionalInfo.idType || ''}
              onChange={(e) => updateField('idType', e.target.value)}
              className="w-full px-3 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            >
              <option value="">Select ID Type</option>
              <option value="GhanaCard">Ghana Card</option>
              <option value="Voter ID">Voter ID</option>
              <option value="Passport">Passport</option>
              <option value="Driver License">Driver License</option>
              <option value="NHIS Card">NHIS Card</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Number
            </label>
            <input
              type="text"
              value={additionalInfo.idNumber || ''}
              onChange={(e) => updateField('idNumber', e.target.value)}
              placeholder="ID number"
              className="w-full px-3 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-600" />
          Medical Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Blood Type
            </label>
            <select
              value={additionalInfo.bloodType || ''}
              onChange={(e) => updateField('bloodType', e.target.value)}
              className="w-full px-3 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            >
              <option value="">Select Blood Type</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-2 text-orange-600" />
              Occupation
            </label>
            <input
              type="text"
              value={additionalInfo.occupation || ''}
              onChange={(e) => updateField('occupation', e.target.value)}
              placeholder="Patient's occupation"
              className="w-full px-3 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          Emergency Contact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Next of Kin
            </label>
            <input
              type="text"
              value={additionalInfo.nextOfKin || ''}
              onChange={(e) => updateField('nextOfKin', e.target.value)}
              placeholder="Name of next of kin"
              className="w-full px-3 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={additionalInfo.emergencyContact?.name || ''}
                  onChange={(e) => updateEmergencyContact('name', e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship
                </label>
                <input
                  type="text"
                  value={additionalInfo.emergencyContact?.relationship || ''}
                  onChange={(e) => updateEmergencyContact('relationship', e.target.value)}
                  placeholder="Relationship to patient"
                  className="w-full px-3 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2 text-blue-600" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={additionalInfo.emergencyContact?.phone || ''}
                  onChange={(e) => updateEmergencyContact('phone', e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-3 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}