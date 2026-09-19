import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../utils/api';

export default function StaffProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  async function fetchProfile() {
    try {
      const response = await apiClient.get(`/staff/profiles/${id}`);
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center text-red-600">Profile not found</div>;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'employment', label: 'Employment & Grade' },
    { id: 'salary', label: 'Salary & Payslips' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {profile.user.firstName} {profile.user.lastName}
          </h1>
          <p className="text-gray-500">ID: {profile.employeeId}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/dashboard/hr/${id}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Edit Profile
          </button>
          <button
            onClick={() => navigate(`/dashboard/hr/${id}/payslip`)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Generate Payslip
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{profile.user.firstName} {profile.user.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{profile.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{profile.user.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Next of Kin</p>
                <p className="font-medium">{profile.nextOfKinName || 'Not provided'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Career Progress</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <span className="text-sm font-medium text-blue-600">Step {profile.salaryStep?.stepNumber || 0}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Next promotion eligible in {(profile.salaryStep?.stepNumber || 0) + 1} years
            </p>
          </div>
        </div>
      )}

      {activeTab === 'employment' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Employment Details</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Current Grade</p>
              <p className="font-medium text-lg">{profile.jobGrade?.name || 'Not assigned'}</p>
              <p className="text-sm text-gray-600">{profile.jobGrade?.code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Step</p>
              <p className="font-medium">Step {profile.salaryStep?.stepNumber || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Base Salary</p>
              <p className="font-medium text-lg">₵{profile.salaryStep?.amount.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date Joined</p>
              <p className="font-medium">{new Date(profile.dateJoined).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Employment Type</p>
              <p className="font-medium">{profile.employmentType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-medium">{profile.department?.name || 'Not assigned'}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Current Salary Structure</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Salary</span>
                <span className="font-medium">₵{profile.salaryStep?.amount.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Risk Allowance</span>
                <span className="font-medium">+ ₵450.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transport Allowance</span>
                <span className="font-medium">+ ₵200.00</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">Gross Pay</span>
                <span className="font-semibold">
                  ₵{((profile.salaryStep?.amount || 0) + 650).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>SSNIT (5.5%)</span>
                <span>- ₵{((profile.salaryStep?.amount || 0) * 0.055).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Tax (PAYE)</span>
                <span>- ₵320.00</span>
              </div>
              <div className="border-t-2 border-gray-800 pt-3 flex justify-between text-lg">
                <span className="font-bold">NET PAY</span>
                <span className="font-bold text-green-600">
                  ₵{((profile.salaryStep?.amount || 0) + 650 - ((profile.salaryStep?.amount || 0) * 0.055) - 320).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Payslips</h2>
            {profile.payrollRecords && profile.payrollRecords.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500">
                    <th className="pb-2">Month</th>
                    <th className="pb-2">Net Pay</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2\">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.payrollRecords.slice(0, 5).map((record: any) => (
                    <tr key={record.id} className="border-t">
                      <td className="py-3">{record.month}/{record.year}</td>
                      <td className="font-medium">₵{record.netPay}</td>
                      <td>
                        <span className={`px-2 py-1 text-xs rounded-full ${record.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {record.isPaid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">Download PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500">No payslips generated yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Professional Documents</h2>
          {profile.documents && profile.documents.length > 0 ? (
            <div className="space-y-3">
              {profile.documents.map((doc: any) => (
                <div key={doc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{doc.title || doc.type}</p>
                    <p className="text-sm text-gray-500">Expires: {new Date(doc.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${doc.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {doc.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No documents uploaded.</p>
          )}
        </div>
      )}
    </div>
  );
}
