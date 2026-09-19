import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/api';

interface StaffProfile {
  id: string;
  employeeId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  jobGrade?: {
    name: string;
    code: string;
  };
  salaryStep?: {
    stepNumber: number;
    amount: number;
  };
  employmentType: string;
  department?: {
    name: string;
  };
  documents: Array<{
    type: string;
    expiryDate: string;
  }>;
}

export default function StaffDirectory() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    try {
      const response = await apiClient.get('/staff/profiles?take=100');
      setStaff(response.data.profiles || response.data);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user.lastName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || s.employmentType === filterType;

    return matchesSearch && matchesType;
  });

  const getExpiryWarning = (docs: any[]) => {
    if (!docs || docs.length === 0) return null;
    const soonExpiring = docs.find((d) => {
      const daysUntil = Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 30;
    });
    if (soonExpiring) {
      const days = Math.ceil((new Date(soonExpiring.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return `⚠️ ${soonExpiring.type} expires in ${days} days`;
    }
    return null;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading staff directory...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">👥 Staff Directory</h1>
        <button
          onClick={() => navigate('/dashboard/hr/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add New Staff
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search by Name, ID, or Email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="ALL">All Types</option>
          <option value="PERMANENT">Permanent</option>
          <option value="CONTRACT">Contract</option>
          <option value="LOCUM">Locum</option>
          <option value="INTERN">Intern</option>
        </select>
      </div>

      {/* Staff List */}
      <div className="space-y-4">
        {filteredStaff.map((profile) => {
          const warning = getExpiryWarning(profile.documents);
          return (
            <div
              key={profile.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/dashboard/hr/${profile.id}`)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profile.user.firstName} {profile.user.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">ID: {profile.employeeId}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {profile.jobGrade?.name || 'No Grade'} • {profile.jobGrade?.code || ''}
                  </p>
                  <p className="text-sm text-gray-500">
                    {profile.department?.name || 'No Department'} • {profile.employmentType}
                  </p>
                  {warning && <p className="text-sm text-orange-600 mt-2 font-medium">{warning}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    Step {profile.salaryStep?.stepNumber || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    ₵{profile.salaryStep?.amount.toLocaleString() || '0'}
                  </p>
                  <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Active
                  </span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/hr/${profile.id}`);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Profile →
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/hr/${profile.id}/payslip`);
                  }}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  Generate Payslip
                </button>
              </div>
            </div>
          );
        })}

        {filteredStaff.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No staff members found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
