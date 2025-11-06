// src/components/AdditionalInfoTab.tsx
import { Mail, Home, IdCard, Heart, Briefcase, Users, Phone, User } from 'lucide-react';
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
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          Additional Information (Optional)
        </h3>
        <p className="text-blue-700 text-sm">
          These fields are optional and can be filled later if needed.
        </p>
      </div>

      {/* Contact Information */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <Mail className="w-6 h-6 text-blue-600" />
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Email Address
            </label>
            <input
              type="email"
              value={additionalInfo.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="patient@example.com"
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <Home className="w-4 h-4 inline mr-2 text-green-600" />
              House Number
            </label>
            <input
              type="text"
              value={additionalInfo.houseNumber || ''}
              onChange={(e) => updateField('houseNumber', e.target.value)}
              placeholder="House/Apartment number"
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
            />
          </div>
        </div>
      </div>

      {/* Identification */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <IdCard className="w-6 h-6 text-purple-600" />
          Identification
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              ID Type
            </label>
            <select
              value={additionalInfo.idType || ''}
              onChange={(e) => updateField('idType', e.target.value)}
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
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
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              ID Number
            </label>
            <input
              type="text"
              value={additionalInfo.idNumber || ''}
              onChange={(e) => updateField('idNumber', e.target.value)}
              placeholder="ID number"
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
            />
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <Heart className="w-6 h-6 text-red-600" />
          Medical Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Blood Type
            </label>
            <select
              value={additionalInfo.bloodType || ''}
              onChange={(e) => updateField('bloodType', e.target.value)}
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
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
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <Briefcase className="w-4 h-4 inline mr-2 text-orange-600" />
              Occupation
            </label>
            <input
              type="text"
              value={additionalInfo.occupation || ''}
              onChange={(e) => updateField('occupation', e.target.value)}
              placeholder="Patient's occupation"
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <Users className="w-6 h-6 text-green-600" />
          Emergency Contact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Next of Kin
            </label>
            <input
              type="text"
              value={additionalInfo.nextOfKin || ''}
              onChange={(e) => updateField('nextOfKin', e.target.value)}
              placeholder="Name of next of kin"
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
            />
          </div>

          <div className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={additionalInfo.emergencyContact?.name || ''}
                  onChange={(e) => updateEmergencyContact('name', e.target.value)}
                  placeholder="Full name"
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Relationship
                </label>
                <input
                  type="text"
                  value={additionalInfo.emergencyContact?.relationship || ''}
                  onChange={(e) => updateEmergencyContact('relationship', e.target.value)}
                  placeholder="Relationship to patient"
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <Phone className="w-4 h-4 inline mr-2 text-blue-600" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={additionalInfo.emergencyContact?.phone || ''}
                  onChange={(e) => updateEmergencyContact('phone', e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}