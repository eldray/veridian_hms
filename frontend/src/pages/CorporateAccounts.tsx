// src/pages/CorporateAccounts.tsx
import { useEffect, useState } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useCorporateStore } from '../store/corporateStore';
import { useAuthStore } from '../store/authStore';
import { isAdminLike } from '../config/access';
import { useToast } from '../store/toastStore';
import { useNavigate, useParams } from 'react-router-dom';
import InsuranceTabs from '../components/InsuranceTabs';
import {
  Badge, Button, Card, cn, INPUT, SELECT, PageHeader, SearchInput, Segmented, StatCard,
  TH, TH_ROW, TD, TD_MONO, TR, TABLE_SHELL,
} from '../components/ui';
import {
  Plus,
  Edit,
  Trash2,
  Briefcase,
  Building,
  XCircle,
  RefreshCw,
  Grid3X3,
  List,
  Phone,
  Mail,
  User,
  Power,
  PowerOff,
  Users,
  DollarSign,
  Wallet,
  Calendar,
  UserPlus,
  FileText
} from 'lucide-react';

export default function CorporateAccounts() {
  const navigate = useNavigate();
  const { id: accountId } = useParams();
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();

  const {
    corporateAccounts,
    currentAccount,
    currentEmployees,
    statistics,
    getCorporateAccounts,
    getCorporateAccount,
    createCorporateAccount,
    updateCorporateAccount,
    deactivateCorporateAccount,
    getCorporateEmployees,
    addCorporateEmployee,
    updateCorporateEmployee,
    removeCorporateEmployee,
    getCorporateStatistics,
    generateMonthlyBill,
    isLoading,
    clearCurrentAccount
  } = useCorporateStore();

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingData, setBillingData] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), discountPercentage: 0 });
  
  // Form Data for Corporate Account
  const [formData, setFormData] = useState({
    companyName: '',
    registrationNumber: '',
    taxId: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    creditLimit: 0,
    paymentTerms: 30,
    discountPercentage: 0,
    isActive: true
  });

  // Form Data for Employee
  const [employeeData, setEmployeeData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    otherNames: '',
    department: '',
    position: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (accountId && !currentAccount) {
      loadAccount(accountId);
    }
  }, [accountId]);

  const loadData = async () => {
    try {
      await Promise.all([
        getCorporateAccounts(),
        getCorporateStatistics()
      ]);
    } catch (error) {
      toastError('Load Failed', 'Could not load corporate accounts');
    }
  };

  const loadAccount = async (id: string) => {
    try {
      await getCorporateAccount(id);
      await getCorporateEmployees(id);
    } catch (error) {
      toastError('Load Failed', 'Could not load account details');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCorporateAccount(formData);
      success('Account Created', `${formData.companyName} created successfully`);
      resetForm();
      await loadData();
    } catch (error: any) {
      toastError('Create Failed', error?.message || 'Could not create account');
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      await updateCorporateAccount(editingAccount.id, formData);
      success('Account Updated', `${formData.companyName} updated successfully`);
      resetForm();
      await loadData();
      if (accountId) await loadAccount(accountId);
    } catch (error: any) {
      toastError('Update Failed', error?.message || 'Could not update account');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    try {
      await addCorporateEmployee(accountId, employeeData);
      success('Employee Added', `${employeeData.firstName} ${employeeData.lastName} added successfully`);
      resetEmployeeForm();
      await loadAccount(accountId);
    } catch (error: any) {
      toastError('Add Failed', error?.message || 'Could not add employee');
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    try {
      await updateCorporateEmployee(editingEmployee.id, employeeData);
      success('Employee Updated', `${employeeData.firstName} ${employeeData.lastName} updated successfully`);
      resetEmployeeForm();
      await loadAccount(accountId!);
    } catch (error: any) {
      toastError('Update Failed', error?.message || 'Could not update employee');
    }
  };

  const handleRemoveEmployee = async (employeeId: string, employeeName: string) => {
    if (!(await confirmDialog({ title: 'Remove employee', message: `Remove ${employeeName} from this corporate account?`, confirmText: 'Remove' }))) return;
    try {
      await removeCorporateEmployee(employeeId);
      success('Employee Removed', `${employeeName} removed successfully`);
      await loadAccount(accountId!);
    } catch (error: any) {
      toastError('Remove Failed', error?.message || 'Could not remove employee');
    }
  };

  const handleToggleAccountStatus = async (account: any) => {
    const newStatus = !account.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    if (!(await confirmDialog({ title: 'Change account status', message: `${action.charAt(0).toUpperCase() + action.slice(1)} ${account.companyName}?`, confirmText: 'Continue', type: 'warning' }))) return;
    try {
      await deactivateCorporateAccount(account.id);
      success('Status Updated', `${account.companyName} ${action}d successfully`);
      await loadData();
      if (accountId && account.id === accountId) {
        await loadAccount(accountId);
      }
    } catch (error: any) {
      toastError('Update Failed', error?.message || 'Could not update status');
    }
  };

  const handleGenerateMonthlyBill = async () => {
    if (!accountId) return;
    try {
      const result = await generateMonthlyBill(accountId, billingData);
      success('Bill Generated', `Monthly bill for ${billingData.month}/${billingData.year} generated successfully`);
      setShowBillingModal(false);
      // Monthly generation creates one proforma invoice per eligible patient.
      const firstInvoiceId = result.proformaInvoices?.[0]?.id;
      if (firstInvoiceId) {
        navigate(`/dashboard/estimates/${firstInvoiceId}`);
      }
    } catch (error: any) {
      toastError('Generation Failed', error?.message || 'Could not generate monthly bill');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingAccount(null);
    setFormData({
      companyName: '',
      registrationNumber: '',
      taxId: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      creditLimit: 0,
      paymentTerms: 30,
      discountPercentage: 0,
      isActive: true
    });
  };

  const resetEmployeeForm = () => {
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    setEmployeeData({
      employeeId: '',
      firstName: '',
      lastName: '',
      otherNames: '',
      department: '',
      position: '',
      phone: '',
      email: '',
      dateOfBirth: '',
      gender: '',
      enrollmentDate: new Date().toISOString().split('T')[0],
      isActive: true
    });
  };

  const editAccount = (account: any) => {
    setEditingAccount(account);
    setFormData({
      companyName: account.companyName,
      registrationNumber: account.registrationNumber || '',
      taxId: account.taxId || '',
      contactPerson: account.contactPerson,
      email: account.email,
      phone: account.phone,
      address: account.address || '',
      creditLimit: account.creditLimit,
      paymentTerms: account.paymentTerms,
      discountPercentage: account.discountPercentage,
      isActive: account.isActive
    });
    setShowForm(true);
  };

  const editEmployee = (employee: any) => {
    setEditingEmployee(employee);
    setEmployeeData({
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      otherNames: employee.otherNames || '',
      department: employee.department || '',
      position: employee.position || '',
      phone: employee.phone || '',
      email: employee.email || '',
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      gender: employee.gender || '',
      enrollmentDate: employee.enrollmentDate ? new Date(employee.enrollmentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isActive: employee.isActive
    });
    setShowEmployeeForm(true);
  };

  const filteredAccounts = corporateAccounts.filter(account =>
    account.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.phone.includes(searchTerm)
  );

  // If viewing a single account (detail view)
  if (accountId && currentAccount) {
    return (
      <div className="space-y-6 p-6 text-[var(--text-primary)]">
        <PageHeader
          title={currentAccount.companyName}
          subtitle="Corporate account — staff, credit and monthly invoices"
          icon={Briefcase}
          accent="indigo"
          onBack={() => {
            clearCurrentAccount();
            navigate('/dashboard/insurance/corporate/accounts');
          }}
          actions={(
            <>
              <Button variant="secondary" icon={FileText} onClick={() => setShowBillingModal(true)}>Generate bill</Button>
              {isAdminLike(user?.role) && (
                <Button variant="secondary" icon={Edit} onClick={() => editAccount(currentAccount)}>Edit account</Button>
              )}
              <Button variant="soft" accent="green" icon={UserPlus} onClick={() => setShowEmployeeForm(true)}>Add employee</Button>
              <Button variant="secondary" iconOnly icon={RefreshCw} aria-label="Reload account" onClick={() => loadAccount(accountId)} />
            </>
          )}
        />

        {/* Account Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Credit limit" size="money" icon={Wallet} accent="indigo" hint="Monthly credit limit" value={`GHS ${currentAccount.creditLimit.toLocaleString()}`} />
          <StatCard
            label="Current balance"
            size="money"
            icon={DollarSign}
            accent={currentAccount.currentBalance > 0 ? 'red' : 'green'}
            hint="Outstanding balance"
            value={`GHS ${currentAccount.currentBalance.toLocaleString()}`}
          />
          <StatCard label="Employees" icon={Users} accent="cyan" hint="Active employees" value={currentEmployees.length} />
          <StatCard label="Payment terms" icon={Calendar} accent="yellow" hint="Days to pay an invoice" value={`${currentAccount.paymentTerms} days`} />
        </div>

        {/* Account Details Card */}
        <Card title="Account details" icon={Building}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Company Name</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{currentAccount.companyName}</p>
                </div>
                {currentAccount.registrationNumber && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Registration Number</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5">{currentAccount.registrationNumber}</p>
                  </div>
                )}
                {currentAccount.taxId && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Tax ID</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5">{currentAccount.taxId}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Contact Person</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{currentAccount.contactPerson}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Email</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{currentAccount.email}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Phone</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{currentAccount.phone}</p>
                </div>
                {currentAccount.address && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Address</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5">{currentAccount.address}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Status</p>
                  <div className="mt-1">
                    <Badge tone={currentAccount.isActive ? 'green' : 'neutral'} dot size="sm">
                      {currentAccount.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
        </Card>

        {/* Employees List */}
        <Card
          title={`Employees (${currentEmployees.length})`}
          icon={Users}
          accent="green"
          padded={false}
          actions={<Button size="sm" variant="soft" accent="green" icon={UserPlus} onClick={() => setShowEmployeeForm(true)}>Add employee</Button>}
        >
          {currentEmployees.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)]">No employees added yet</p>
              <Button
                size="sm"
                variant="secondary"
                icon={UserPlus}
                className="mt-3"
                onClick={() => setShowEmployeeForm(true)}
              >
                Add your first employee
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={TH_ROW}>
                  <tr>
                    <th className={cn(TH, 'px-6')}>Employee ID</th>
                    <th className={cn(TH, 'px-6')}>Name</th>
                    <th className={cn(TH, 'px-6')}>Department/Position</th>
                    <th className={cn(TH, 'px-6')}>Contact</th>
                    <th className={cn(TH, 'px-6')}>Status</th>
                    <th className={cn(TH, 'px-6')}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEmployees.map((employee) => (
                    <tr key={employee.id} className={TR}>
                      <td className={cn(TD_MONO, 'px-6 py-4')}>{employee.employeeId}</td>
                      <td className={cn(TD, 'px-6 py-4')}>
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{employee.firstName} {employee.lastName}</div>
                          {employee.otherNames && (
                            <div className="text-xs text-[var(--text-secondary)]">{employee.otherNames}</div>
                          )}
                        </div>
                      </td>
                      <td className={cn(TD, 'px-6 py-4')}>
                        <div>
                          {employee.department && <div className="text-sm text-[var(--text-primary)]">{employee.department}</div>}
                          {employee.position && <div className="text-xs text-[var(--text-secondary)]">{employee.position}</div>}
                        </div>
                      </td>
                      <td className={cn(TD, 'px-6 py-4')}>
                        <div className="space-y-1 text-sm">
                          {employee.phone && (
                            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                              <Phone className="w-3 h-3" />
                              {employee.phone}
                            </div>
                          )}
                          {employee.email && (
                            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                              <Mail className="w-3 h-3" />
                              {employee.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={cn(TD, 'px-6 py-4')}>
                        <Badge tone={employee.isActive ? 'green' : 'neutral'} dot size="sm">
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className={cn(TD, 'px-6 py-4')}>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            iconOnly
                            icon={Edit}
                            className="text-[var(--icon-blue-text)]"
                            aria-label="Edit employee"
                            onClick={() => editEmployee(employee)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            iconOnly
                            icon={Trash2}
                            aria-label="Remove employee"
                            className="text-[var(--icon-red-text)]"
                            onClick={() => handleRemoveEmployee(employee.id, `${employee.firstName} ${employee.lastName}`)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Employee Form Modal */}
        {showEmployeeForm && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-2xl mt-8 mb-8 shadow-xl border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-[var(--icon-green-text)]" />
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </h2>
                </div>
                <Button variant="ghost" iconOnly icon={XCircle} aria-label="Close" onClick={resetEmployeeForm} />
              </div>
              
              <form onSubmit={editingEmployee ? handleUpdateEmployee : handleAddEmployee} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Employee ID *</label>
                    <input
                      type="text"
                      required
                      value={employeeData.employeeId}
                      onChange={(e) => setEmployeeData({ ...employeeData, employeeId: e.target.value })}
                      className={cn(INPUT, 'w-full')}
                      placeholder="e.g., EMP-001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">First Name *</label>
                    <input
                      type="text"
                      required
                      value={employeeData.firstName}
                      onChange={(e) => setEmployeeData({ ...employeeData, firstName: e.target.value })}
                      className={cn(INPUT, 'w-full')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={employeeData.lastName}
                      onChange={(e) => setEmployeeData({ ...employeeData, lastName: e.target.value })}
                      className={cn(INPUT, 'w-full')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Other Names</label>
                    <input
                      type="text"
                      value={employeeData.otherNames}
                      onChange={(e) => setEmployeeData({ ...employeeData, otherNames: e.target.value })}
                      className={cn(INPUT, 'w-full')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Department</label>
                    <input
                      type="text"
                      value={employeeData.department}
                      onChange={(e) => setEmployeeData({ ...employeeData, department: e.target.value })}
                      className={cn(INPUT, 'w-full')}
                      placeholder="e.g., Sales, IT, HR"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Position</label>
                    <input
                      type="text"
                      value={employeeData.position}
                      onChange={(e) => setEmployeeData({ ...employeeData, position: e.target.value })}
                      className={cn(INPUT, 'w-full')}
                      placeholder="e.g., Manager, Officer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={employeeData.phone}
                      onChange={(e) => setEmployeeData({ ...employeeData, phone: e.target.value })}
                      className={cn(INPUT, 'w-full')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Email</label>
                    <input
                      type="email"
                      value={employeeData.email}
                      onChange={(e) => setEmployeeData({ ...employeeData, email: e.target.value })}
                      className={cn(INPUT, 'w-full')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={employeeData.dateOfBirth}
                      onChange={(e) => setEmployeeData({ ...employeeData, dateOfBirth: e.target.value })}
                      className={cn(INPUT, 'w-full')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Gender</label>
                    <select
                      value={employeeData.gender}
                      onChange={(e) => setEmployeeData({ ...employeeData, gender: e.target.value as 'male' | 'female' | 'other' })}
                      className={cn(SELECT, 'w-full')}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Enrollment Date</label>
                    <input
                      type="date"
                      value={employeeData.enrollmentDate}
                      onChange={(e) => setEmployeeData({ ...employeeData, enrollmentDate: e.target.value })}
                      className={cn(INPUT, 'w-full')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Status</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={employeeData.isActive === true}
                        onChange={() => setEmployeeData({ ...employeeData, isActive: true })}
                        className="w-4 h-4 text-[var(--icon-green-text)]"
                      />
                      <span className="text-sm text-[var(--text-primary)]">Active</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={employeeData.isActive === false}
                        onChange={() => setEmployeeData({ ...employeeData, isActive: false })}
                        className="w-4 h-4 text-[var(--icon-red-text)]"
                      />
                      <span className="text-sm text-[var(--text-primary)]">Inactive</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
                  <Button variant="secondary" onClick={resetEmployeeForm}>Cancel</Button>
                  <Button type="submit" variant="soft" accent="green">{editingEmployee ? 'Update Employee' : 'Add Employee'}</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Billing Modal */}
        {showBillingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md shadow-xl border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <FileText className="w-6 h-6 text-[var(--icon-purple-text)]" />
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Generate Monthly Bill</h2>
                </div>
                <Button variant="ghost" iconOnly icon={XCircle} aria-label="Close" onClick={() => setShowBillingModal(false)} />
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Month *</label>
                  <select
                    value={billingData.month}
                    onChange={(e) => setBillingData({ ...billingData, month: parseInt(e.target.value) })}
                    className={cn(SELECT, 'w-full')}
                  >
                    <option value={1}>January</option>
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Year *</label>
                  <input
                    type="number"
                    min={2020}
                    max={2030}
                    required
                    value={billingData.year}
                    onChange={(e) => setBillingData({ ...billingData, year: parseInt(e.target.value) })}
                    className={cn(INPUT, 'w-full')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Discount (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={billingData.discountPercentage}
                    onChange={(e) => setBillingData({ ...billingData, discountPercentage: parseFloat(e.target.value) || 0 })}
                    className={cn(INPUT, 'w-full')}
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Optional: Apply discount to monthly bill</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-[var(--border-color)] mt-6">
                <Button variant="secondary" onClick={() => setShowBillingModal(false)}>Cancel</Button>
                <Button variant="soft" accent="purple" onClick={handleGenerateMonthlyBill}>Generate Bill</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View (all corporate accounts)
  return (
    <div className="space-y-5 p-4 md:p-6 text-[var(--text-primary)]">
      <PageHeader
        title="Corporate accounts"
        subtitle="Employers that bill the facility for their staff — credit limits, members and monthly invoices."
        meta={statistics
          ? `${statistics.activeAccounts} active accounts • ${statistics.totalEmployees} employees • GHS ${statistics.totalOutstanding.toFixed(2)} outstanding`
          : undefined}
        icon={Briefcase}
        accent="indigo"
        backTo="/dashboard"
        tabs={<InsuranceTabs family="corporate" section="accounts" />}
        actions={(
          <>
            {isAdminLike(user?.role) && (
              <Button variant="soft" accent="indigo" icon={Plus} onClick={() => setShowForm(true)}>
                New account
              </Button>
            )}
            <Button icon={RefreshCw} loading={isLoading} onClick={loadData}>Refresh</Button>
          </>
        )}
      />

      {/* Filters and View Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by company name, contact person, email or phone…"
        />
        <Segmented
          aria-label="Account layout"
          accent="indigo"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'grid', label: 'Grid', icon: Grid3X3 },
            { value: 'list', label: 'List', icon: List },
          ]}
        />
      </div>

      {/* Account Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-2xl mt-8 mb-8 shadow-xl border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-[var(--icon-indigo-text)]" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {editingAccount ? 'Edit Corporate Account' : 'New Corporate Account'}
                </h2>
              </div>
              <Button variant="ghost" iconOnly icon={XCircle} aria-label="Close" onClick={resetForm} />
            </div>
            
            <form onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className={cn(INPUT, 'w-full')}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Registration Number</label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className={cn(INPUT, 'w-full')}
                    placeholder="Business registration number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Tax ID</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className={cn(INPUT, 'w-full')}
                    placeholder="Tax/VAT number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className={cn(INPUT, 'w-full')}
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={cn(INPUT, 'w-full')}
                    placeholder="contact@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={cn(INPUT, 'w-full')}
                    placeholder="Phone number"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className={cn(INPUT, 'w-full')}
                    placeholder="Company address"
                  />
                </div>
              </div>

              <div className="border-t border-[var(--border-color)] pt-5">
                <h3 className="font-medium mb-3 text-[var(--text-primary)] flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Financial Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Credit Limit (GHS)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                      className={cn(INPUT, 'w-full')}
                    />
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Maximum monthly credit</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Payment Terms (days)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: parseInt(e.target.value) || 30 })}
                      className={cn(INPUT, 'w-full')}
                    />
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Days to pay invoice</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discountPercentage}
                      onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || 0 })}
                      className={cn(INPUT, 'w-full')}
                    />
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Early payment discount</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Status</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.isActive === true}
                      onChange={() => setFormData({ ...formData, isActive: true })}
                      className="w-4 h-4 text-[var(--icon-green-text)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.isActive === false}
                      onChange={() => setFormData({ ...formData, isActive: false })}
                      className="w-4 h-4 text-[var(--icon-red-text)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Inactive</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
                <Button variant="secondary" onClick={resetForm}>Cancel</Button>
                <Button type="submit" variant="soft" accent="indigo">{editingAccount ? 'Update Account' : 'Create Account'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accounts Display */}
      {isLoading ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" 
          : "space-y-4"
        }>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            viewMode === 'grid' ? (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse">
                <div className="h-5 bg-[var(--bg-main)] rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-[var(--bg-main)] rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-[var(--bg-main)] rounded w-2/3"></div>
              </div>
            ) : (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-[var(--bg-main)] rounded w-1/4"></div>
                  <div className="h-4 bg-[var(--bg-main)] rounded w-1/6"></div>
                </div>
              </div>
            )
          ))}
        </div>
      ) : filteredAccounts.length === 0 ? (
        <Card padded={false} className="p-8 text-center">
          <Briefcase className="w-14 h-14 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">No corporate accounts found</p>
          <p className="text-[var(--text-tertiary)] text-sm mt-1">Create your first corporate account</p>
        </Card>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAccounts.map((account) => (
            <div 
              key={account.id} 
              onClick={() => navigate(`/dashboard/insurance/corporate/accounts/${account.id}`)}
              className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[var(--icon-indigo-bg)] flex items-center justify-center">
                    <Briefcase className="w-5.5 h-5.5 text-[var(--icon-indigo-text)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{account.companyName}</h3>
                    <div className="mt-1">
                      <Badge tone={account.isActive ? 'green' : 'neutral'} dot>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--text-secondary)]">Credit Limit</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">GHS {account.creditLimit.toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Current Balance:</span>
                  <span className={`font-medium ${account.currentBalance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>
                    GHS {account.currentBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Employees:</span>
                  <span className="font-medium text-[var(--text-primary)]">{account._count?.employees || 0}</span>
                </div>
                {account.contactPerson && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <User className="w-3.5 h-3.5" />
                    <span className="flex-1 truncate">{account.contactPerson}</span>
                  </div>
                )}
                {account.email && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="flex-1 truncate">{account.email}</span>
                  </div>
                )}
                {account.phone && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{account.phone}</span>
                  </div>
                )}
              </div>

              {isAdminLike(user?.role) && (
                <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Edit}
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); editAccount(account); }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={account.isActive ? 'dangerSoft' : 'secondary'}
                    icon={account.isActive ? PowerOff : Power}
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); handleToggleAccountStatus(account); }}
                  >
                    {account.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className={TABLE_SHELL}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={TH_ROW}>
                <tr>
                  <th className={cn(TH, 'px-6')}>Company</th>
                  <th className={cn(TH, 'px-6')}>Contact</th>
                  <th className={cn(TH, 'px-6')}>Financial</th>
                  <th className={cn(TH, 'px-6')}>Employees</th>
                  <th className={cn(TH, 'px-6')}>Status</th>
                  {isAdminLike(user?.role) && (
                    <th className={cn(TH, 'px-6')}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr 
                    key={account.id} 
                    onClick={() => navigate(`/dashboard/insurance/corporate/accounts/${account.id}`)}
                    className={cn(TR, 'cursor-pointer')}
                  >
                    <td className={cn(TD, 'px-6 py-4')}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--icon-indigo-bg)] flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-[var(--icon-indigo-text)]" />
                        </div>
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{account.companyName}</div>
                          {account.registrationNumber && (
                            <div className="text-xs text-[var(--text-secondary)]">Reg: {account.registrationNumber}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={cn(TD, 'px-6 py-4')}>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <User className="w-3.5 h-3.5" />
                          {account.contactPerson}
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <Mail className="w-3.5 h-3.5" />
                          {account.email}
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <Phone className="w-3.5 h-3.5" />
                          {account.phone}
                        </div>
                      </div>
                    </td>
                    <td className={cn(TD, 'px-6 py-4')}>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-[var(--text-secondary)]">Credit Limit:</span>
                          <span className="font-medium text-[var(--text-primary)] ml-2">GHS {account.creditLimit.toLocaleString()}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-[var(--text-secondary)]">Balance:</span>
                          <span className={`font-medium ml-2 ${account.currentBalance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>
                            GHS {account.currentBalance.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-[var(--text-secondary)]">Terms:</span>
                          <span className="text-[var(--text-primary)] ml-2">{account.paymentTerms} days</span>
                        </div>
                      </div>
                    </td>
                    <td className={cn(TD, 'px-6 py-4')}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        <span className="text-lg font-semibold text-[var(--text-primary)]">{account._count?.employees || 0}</span>
                      </div>
                    </td>
                    <td className={cn(TD, 'px-6 py-4')}>
                      <Badge tone={account.isActive ? 'green' : 'neutral'} dot size="sm">
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {isAdminLike(user?.role) && (
                      <td className={cn(TD, 'px-6 py-4 text-right')} onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-1.5">
                          <Button size="xs" variant="ghost" iconOnly icon={Edit} aria-label="Edit account" onClick={() => editAccount(account)} />
                          <Button
                            size="xs"
                            variant="ghost"
                            iconOnly
                            icon={account.isActive ? PowerOff : Power}
                            aria-label={account.isActive ? 'Deactivate account' : 'Activate account'}
                            className={account.isActive ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}
                            onClick={() => handleToggleAccountStatus(account)}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}