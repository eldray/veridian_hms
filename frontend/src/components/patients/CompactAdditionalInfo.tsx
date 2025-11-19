import { Mail, FileText, Heart, Users } from 'lucide-react';

interface CompactAdditionalInfoProps {
  patient: any;
}

export const CompactAdditionalInfo: React.FC<CompactAdditionalInfoProps> = ({ patient }) => {
  const additionalInfo = patient.additionalInfo || {};

  return (
    <div className="space-y-3">
      {/* Contact & Identification - 2 cards per row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Contact Information */}
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="flex items-center gap-1 mb-2">
            <Mail className="w-3 h-3 text-blue-600" />
            <h4 className="font-semibold text-gray-900 text-xs">Contact Information</h4>
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <p className="text-gray-600 text-xs font-medium">Email</p>
              <p className="font-medium text-gray-900 text-xs">{additionalInfo.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-medium">House Number</p>
              <p className="font-medium text-gray-900 text-xs">{additionalInfo.houseNumber || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Identification */}
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="flex items-center gap-1 mb-2">
            <FileText className="w-3 h-3 text-purple-600" />
            <h4 className="font-semibold text-gray-900 text-xs">Identification</h4>
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <p className="text-gray-600 text-xs font-medium">ID Type</p>
              <p className="font-medium text-gray-900 text-xs">{additionalInfo.idType || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-medium">ID Number</p>
              <p className="font-medium text-gray-900 text-xs">{additionalInfo.idNumber || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Medical & Emergency Contact - 2 cards per row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Medical Information */}
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="flex items-center gap-1 mb-2">
            <Heart className="w-3 h-3 text-red-600" />
            <h4 className="font-semibold text-gray-900 text-xs">Medical Information</h4>
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <p className="text-gray-600 text-xs font-medium">Blood Type</p>
              <p className="font-medium text-gray-900 text-xs">{additionalInfo.bloodType || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-medium">Occupation</p>
              <p className="font-medium text-gray-900 text-xs">{additionalInfo.occupation || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="flex items-center gap-1 mb-2">
            <Users className="w-3 h-3 text-green-600" />
            <h4 className="font-semibold text-gray-900 text-xs">Emergency Contact</h4>
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <p className="text-gray-600 text-xs font-medium">Next of Kin</p>
              <p className="font-medium text-gray-900 text-xs">{additionalInfo.nextOfKin || 'Not provided'}</p>
            </div>
            {additionalInfo.emergencyContact && (
              <>
                <div>
                  <p className="text-gray-600 text-xs font-medium">Contact Name</p>
                  <p className="font-medium text-gray-900 text-xs">{additionalInfo.emergencyContact.name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs font-medium">Relationship</p>
                  <p className="font-medium text-gray-900 text-xs">{additionalInfo.emergencyContact.relationship || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs font-medium">Phone</p>
                  <p className="font-medium text-gray-900 text-xs">{additionalInfo.emergencyContact.phone || 'Not provided'}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};