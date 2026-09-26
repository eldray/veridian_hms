// src/store/userStore.ts
import { create } from 'zustand';
import {
  adminCreateUser,
  getAllUsers as getAllUsersApi,
  getUserById as getUserByIdApi,
  updateUser as updateUserApi,
  deactivateUser as deactivateUserApi,
  getUserProfile,
  updateUserProfile,
  changeUserPassword as changeUserPasswordApi,
  getUsersByDepartment as getUsersByDepartmentApi,
  updateUserDepartment as updateUserDepartmentApi,
  getShifts as getShiftsApi,
  getShiftById as getShiftByIdApi,
  createShift as createShiftApi,
  updateShift as updateShiftApi,
  deleteShift as deleteShiftApi,
  getLeaves as getLeavesApi,
  getLeaveById as getLeaveByIdApi,
  createLeave as createLeaveApi,
  updateLeave as updateLeaveApi,
  deleteLeave as deleteLeaveApi,
  getFullProfile as getFullProfileApi,
  updateFullProfile as updateFullProfileApi,
  getUserPayslips as getUserPayslipsApi,
  getMyPayslips as getMyPayslipsApi,
  getAllPayslips as getAllPayslipsApi,
  generatePayslip as generatePayslipApi,
  runPayroll as runPayrollApi,
  updatePayslip as updatePayslipApi,
  getPayslipById as getPayslipByIdApi,
  addPayslipLineItem as addPayslipLineItemApi,
  updatePayslipLineItem as updatePayslipLineItemApi,
  deletePayslipLineItem as deletePayslipLineItemApi,
  getUserDocuments as getUserDocumentsApi,
  getMyDocuments as getMyDocumentsApi,
  getAllDocuments as getAllDocumentsApi,
  uploadUserDocument as uploadUserDocumentApi,
  updateDocument as updateDocumentApi,
  verifyDocument as verifyDocumentApi,
  unverifyDocument as unverifyDocumentApi,
  deleteDocument as deleteDocumentApi,
  getCurrentUserPermissions as getCurrentUserPermissionsApi,
} from '../api';
import type { User, Seniority } from '../types';

export const SENIORITY_LEVELS: Record<Seniority, number> = {
  TRAINEE: 0,
  JUNIOR: 1,
  SENIOR: 2,
  PRINCIPAL: 3,
};

export const SENIORITY_OPTIONS = [
  { value: 'TRAINEE', label: 'Trainee', level: 0, description: 'In training, requires supervision' },
  { value: 'JUNIOR', label: 'Junior Staff', level: 1, description: 'Regular staff member' },
  { value: 'SENIOR', label: 'Senior Staff', level: 2, description: 'Experienced, can supervise others' },
  { value: 'PRINCIPAL', label: 'Principal', level: 3, description: 'Highest authority in role' },
];

export interface Shift {
  id: string;
  userId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'night' | 'on_call';
  notes: string | null;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Leave {
  id: string;
  userId: string;
  leaveType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid';
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string | null;
  user?: User;
  approver?: User | null;
  approvedBy?: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayslipLineItem {
  id: string;
  payrollRecordId: string;
  type: 'earning' | 'deduction';
  category: string;
  description: string | null;
  amount: number | string;
  taxable: boolean;
  createdAt: string;
}

export interface Payslip {
  id: string;
  staffId: string;
  month: number;
  year: number;
  baseSalary: number | string;
  allowances: number | string;
  deductions: number | string;
  netPay: number | string;
  isPaid: boolean;
  payslipUrl: string | null;
  paidAt: string | null;
  notes: string | null;
  lineItems?: PayslipLineItem[];
  staff?: {
    id: string;
    user: {
      id: string;
      fullName: string;
      role: string;
      department?: { id: string; name: string } | null;
    };
    jobGrade?: any;
    salaryStep?: any;
  };
}

export interface FullProfile {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  licenseNumber: string | null;
  specialization: string | null;
  role: string;
  seniority: Seniority;
  isActive: boolean;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  headedDepartment: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  staffProfile: {
    id: string;
    employeeId: string;
    dateJoined: string;
    employmentType: string;
    jobGradeId: string | null;
    salaryStepId: string | null;
    bio: string | null;
    nextOfKinName: string | null;
    nextOfKinPhone: string | null;
    jobGrade?: { id: string; name: string; code: string } | null;
    salaryStep?: { id: string; stepNumber: number; amount: number | string } | null;
    documents: any[];
    payrollRecords: Payslip[];
  } | null;
}

interface UserState {
  users: User[];
  currentEditUser: User | null;
  currentFullProfile: FullProfile | null;
  shifts: Shift[];
  leaves: Leave[];
  myPayslips: Payslip[];
  allPayslips: {
    records: Payslip[];
    total?: number;
    totals: { count: number; gross: number; net: number; deductions: number; paid: number; pending: number };
  } | null;
  myDocuments: any[];
  allDocuments: any[];
  userStats: any;
  permissions: string[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;

  // User CRUD
  getAllUsers: (filters?: { role?: string; departmentId?: string; isActive?: boolean; search?: string; page?: number; limit?: number }) => Promise<void>;
  getUserById: (userId: string) => Promise<User>;
  updateUser: (userId: string, data: Partial<User>) => Promise<User>;
  deactivateUser: (userId: string) => Promise<void>;
  createUser: (userData: {
    username: string;
    password: string;
    fullName: string;
    role: string;
    seniority?: Seniority;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    specialization?: string;
    departmentId?: string;
  }) => Promise<User>;

  // Full profile
  getFullProfile: (userId: string) => Promise<FullProfile>;
  updateFullProfile: (userId: string, payload: { user?: any; hr?: any }) => Promise<FullProfile>;
  clearFullProfile: () => void;

  // Profile (self)
  getUserProfile: () => Promise<User>;
  updateUserProfile: (data: Partial<User>) => Promise<User>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getCurrentUserPermissions: () => Promise<string[]>;

  // Seniority
  updateUserSeniority: (userId: string, seniority: Seniority) => Promise<void>;
  getUsersBySeniority: (minSeniority: Seniority) => User[];
  hasMinSeniority: (userSeniority: Seniority, requiredSeniority: Seniority) => boolean;

  // Department
  getUsersByDepartment: (departmentId: string) => Promise<User[]>;
  updateUserDepartment: (userId: string, departmentId: string) => Promise<void>;

  // Shifts
  getShifts: (filters?: { userId?: string; departmentId?: string; shiftDate?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => Promise<void>;
  getShiftById: (shiftId: string) => Promise<Shift>;
  createShift: (data: { userId: string; shiftDate: string; startTime: string; endTime: string; shiftType?: 'morning' | 'afternoon' | 'night' | 'on_call'; notes?: string }) => Promise<Shift>;
  updateShift: (shiftId: string, data: Partial<Shift>) => Promise<Shift>;
  deleteShift: (shiftId: string) => Promise<void>;

  // Leaves
  getLeaves: (filters?: { userId?: string; departmentId?: string; status?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => Promise<void>;
  getLeaveById: (leaveId: string) => Promise<Leave>;
  createLeave: (data: { leaveType: string; startDate: string; endDate: string; reason?: string }) => Promise<Leave>;
  updateLeave: (leaveId: string, data: { status?: string; reason?: string }) => Promise<Leave>;
  deleteLeave: (leaveId: string) => Promise<void>;
  approveLeave: (leaveId: string) => Promise<Leave>;
  rejectLeave: (leaveId: string, reason?: string) => Promise<Leave>;

  // Payslips
  getMyPayslips: () => Promise<void>;
  getUserPayslips: (userId: string) => Promise<Payslip[]>;
  getAllPayslips: (filters?: { month?: number; year?: number; userId?: string; isPaid?: boolean; page?: number; limit?: number }) => Promise<void>;
  generatePayslip: (userId: string, month: number, year: number) => Promise<Payslip>;
  runPayroll: (month: number, year: number) => Promise<any>;
  updatePayslip: (payslipId: string, data: { isPaid?: boolean; payslipUrl?: string | null; notes?: string | null }) => Promise<Payslip>;
  getPayslipById: (payslipId: string) => Promise<Payslip>;
  addPayslipLineItem: (payslipId: string, data: { type: 'earning' | 'deduction'; category: string; description?: string; amount: number; taxable?: boolean }) => Promise<Payslip>;
  updatePayslipLineItem: (payslipId: string, lineItemId: string, data: { category?: string; description?: string; amount?: number; taxable?: boolean }) => Promise<Payslip>;
  deletePayslipLineItem: (payslipId: string, lineItemId: string) => Promise<Payslip>;

  // Documents
  getMyDocuments: () => Promise<void>;
  getUserDocuments: (userId: string) => Promise<any[]>;
  getAllDocuments: () => Promise<void>;
  uploadDocument: (userId: string, data: { file: File; type: string; title: string; expiryDate?: string }) => Promise<any>;
  updateDocument: (documentId: string, data: any) => Promise<any>;
  verifyDocument: (documentId: string) => Promise<any>;
  unverifyDocument: (documentId: string) => Promise<any>;
  deleteDocument: (documentId: string) => Promise<void>;

  clearError: () => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  currentEditUser: null,
  currentFullProfile: null,
  shifts: [],
  leaves: [],
  myPayslips: [],
  allPayslips: null,
  myDocuments: [],
  allDocuments: [],
  userStats: null,
  permissions: [],
  isLoading: false,
  error: null,
  pagination: null,

  // ==========================================
  // Users
  // ==========================================

  getAllUsers: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response: any = await getAllUsersApi(filters);
      const users = Array.isArray(response) ? response : (response?.users ?? response?.data ?? []);
      const usersWithSeniority = Array.isArray(users)
        ? users.map((user: User) => ({ ...user, seniority: user.seniority || 'JUNIOR' }))
        : [];
      set({
        users: usersWithSeniority,
        pagination: response?.pagination || null,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch users' });
      throw error;
    }
  },

  getUserById: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getUserByIdApi(userId);
      set({ isLoading: false });
      return user;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch user' });
      throw error;
    }
  },

  updateUser: async (userId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await updateUserApi(userId, data);
      const users = get().users.map((user) =>
        user.id === userId ? { ...updatedUser, seniority: updatedUser.seniority || user.seniority } : user
      );
      set({ users, isLoading: false });
      return updatedUser;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to update user' });
      throw error;
    }
  },

  deactivateUser: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await deactivateUserApi(userId);
      const users = get().users.map((user) =>
        user.id === userId ? { ...user, isActive: false } : user
      );
      set({ users, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to deactivate user' });
      throw error;
    }
  },

  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      // ✅ Admin endpoint (not public /auth/register)
      const response: any = await adminCreateUser({
        ...userData,
        seniority: userData.seniority || 'JUNIOR',
      });

      const newUser = response?.user || response?.data?.user || response?.data || response;

      await get().getAllUsers();

      set({ isLoading: false });
      return newUser;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to create user' });
      throw error;
    }
  },

  // ==========================================
  // Full profile
  // ==========================================

  getFullProfile: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await getFullProfileApi(userId);
      set({ currentFullProfile: profile, isLoading: false });
      return profile;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch profile' });
      throw error;
    }
  },

  updateFullProfile: async (userId, payload) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await updateFullProfileApi(userId, payload);
      set({ currentFullProfile: profile, isLoading: false });
      return profile;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to update profile' });
      throw error;
    }
  },

  clearFullProfile: () => set({ currentFullProfile: null }),

  // ==========================================
  // Self profile
  // ==========================================

  getUserProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await getUserProfile();
      set({ isLoading: false });
      return user;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch profile' });
      throw error;
    }
  },

  updateUserProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const user = await updateUserProfile(data);
      set({ isLoading: false });
      return user;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to update profile' });
      throw error;
    }
  },

  changeUserPassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      // ✅ API signature is (userId, data). userId is injected from JWT by the server,
      //    so we pass a dummy and the request body carries the credentials.
      await changeUserPasswordApi('', { currentPassword, newPassword });
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to change password' });
      throw error;
    }
  },

  getCurrentUserPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const permissions = await getCurrentUserPermissionsApi();
      set({ permissions, isLoading: false });
      return permissions;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch permissions' });
      throw error;
    }
  },

  // ==========================================
  // Seniority
  // ==========================================

  updateUserSeniority: async (userId, seniority) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await updateUserApi(userId, { seniority });
      const users = get().users.map((user) =>
        user.id === userId ? { ...user, seniority: updatedUser.seniority || seniority } : user
      );
      set({ users, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to update user seniority' });
      throw error;
    }
  },

  getUsersBySeniority: (minSeniority) => {
    const users = get().users;
    const minLevel = SENIORITY_LEVELS[minSeniority];
    return users.filter((user) => {
      const userLevel = SENIORITY_LEVELS[user.seniority as Seniority] || 0;
      return userLevel >= minLevel && user.isActive;
    });
  },

  hasMinSeniority: (userSeniority, requiredSeniority) => {
    return SENIORITY_LEVELS[userSeniority] >= SENIORITY_LEVELS[requiredSeniority];
  },

  // ==========================================
  // Department
  // ==========================================

  getUsersByDepartment: async (departmentId) => {
    set({ isLoading: true, error: null });
    try {
      const users = await getUsersByDepartmentApi(departmentId);
      set({ isLoading: false });
      return users;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch department users' });
      throw error;
    }
  },

  updateUserDepartment: async (userId, departmentId) => {
    set({ isLoading: true, error: null });
    try {
      await updateUserDepartmentApi(userId, departmentId);
      const updatedUsers = get().users.map((user) =>
        user.id === userId ? { ...user, departmentId } : user
      );
      set({ users: updatedUsers, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to update user department' });
      throw error;
    }
  },

  // ==========================================
  // Shifts
  // ==========================================

  getShifts: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getShiftsApi(filters);
      const shifts = response?.data || response || [];
      set({ shifts, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch shifts' });
      throw error;
    }
  },

  getShiftById: async (shiftId) => {
    set({ isLoading: true, error: null });
    try {
      const shift = await getShiftByIdApi(shiftId);
      set({ isLoading: false });
      return shift;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch shift' });
      throw error;
    }
  },

  createShift: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const shift = await createShiftApi(data);
      const shifts = [shift, ...get().shifts];
      set({ shifts, isLoading: false });
      return shift;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to create shift' });
      throw error;
    }
  },

  updateShift: async (shiftId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedShift = await updateShiftApi(shiftId, data);
      const shifts = get().shifts.map((shift) => (shift.id === shiftId ? updatedShift : shift));
      set({ shifts, isLoading: false });
      return updatedShift;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to update shift' });
      throw error;
    }
  },

  deleteShift: async (shiftId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteShiftApi(shiftId);
      const shifts = get().shifts.filter((shift) => shift.id !== shiftId);
      set({ shifts, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to delete shift' });
      throw error;
    }
  },

  // ==========================================
  // Leaves
  // ==========================================

  getLeaves: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getLeavesApi(filters);
      const leaves = response?.data || response || [];
      set({ leaves, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch leaves' });
      throw error;
    }
  },

  getLeaveById: async (leaveId) => {
    set({ isLoading: true, error: null });
    try {
      const leave = await getLeaveByIdApi(leaveId);
      set({ isLoading: false });
      return leave;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch leave request' });
      throw error;
    }
  },

  createLeave: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const leave = await createLeaveApi(data as any);
      const leaves = [leave, ...get().leaves];
      set({ leaves, isLoading: false });
      return leave;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to create leave request' });
      throw error;
    }
  },

  updateLeave: async (leaveId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedLeave = await updateLeaveApi(leaveId, data as any);
      const leaves = get().leaves.map((leave) => (leave.id === leaveId ? updatedLeave : leave));
      set({ leaves, isLoading: false });
      return updatedLeave;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to update leave request' });
      throw error;
    }
  },

  deleteLeave: async (leaveId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteLeaveApi(leaveId);
      const leaves = get().leaves.filter((leave) => leave.id !== leaveId);
      set({ leaves, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to delete leave request' });
      throw error;
    }
  },

  approveLeave: async (leaveId) => get().updateLeave(leaveId, { status: 'approved' }),
  rejectLeave: async (leaveId, reason) => get().updateLeave(leaveId, { status: 'rejected', reason }),

  // ==========================================
  // Payslips
  // ==========================================

  getMyPayslips: async () => {
    set({ isLoading: true, error: null });
    try {
      const records = await getMyPayslipsApi();
      set({ myPayslips: records, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch payslips' });
      throw error;
    }
  },

  getUserPayslips: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const records = await getUserPayslipsApi(userId);
      set({ isLoading: false });
      return records;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch user payslips' });
      throw error;
    }
  },

  getAllPayslips: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const result = await getAllPayslipsApi(filters);
      set({ allPayslips: result, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch payslips' });
      throw error;
    }
  },

  generatePayslip: async (userId, month, year) => {
    set({ isLoading: true, error: null });
    try {
      const record = await generatePayslipApi(userId, month, year);
      set({ isLoading: false });
      return record;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to generate payslip' });
      throw error;
    }
  },

  runPayroll: async (month, year) => {
    set({ isLoading: true, error: null });
    try {
      const result = await runPayrollApi(month, year);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to run payroll' });
      throw error;
    }
  },

  updatePayslip: async (payslipId, data) => {
    set({ isLoading: true, error: null });
    try {
      const record = await updatePayslipApi(payslipId, data);
      set({ isLoading: false });
      return record;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to update payslip' });
      throw error;
    }
  },

  getPayslipById: async (payslipId) => {
    try {
      return await getPayslipByIdApi(payslipId);
    } catch (err: any) {
      set({ error: err?.response?.data?.message || 'Failed to fetch payslip' });
      throw err;
    }
  },

  addPayslipLineItem: async (payslipId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await addPayslipLineItemApi(payslipId, data);
      set({ isLoading: false });
      return updated;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Failed to add line item' });
      throw err;
    }
  },

  updatePayslipLineItem: async (payslipId, lineItemId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updatePayslipLineItemApi(payslipId, lineItemId, data);
      set({ isLoading: false });
      return updated;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Failed to update line item' });
      throw err;
    }
  },

  deletePayslipLineItem: async (payslipId, lineItemId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await deletePayslipLineItemApi(payslipId, lineItemId);
      set({ isLoading: false });
      return updated;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Failed to delete line item' });
      throw err;
    }
  },

  // ==========================================
  // Documents
  // ==========================================

  getMyDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const docs = await getMyDocumentsApi();
      set({ myDocuments: docs, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch documents' });
      throw error;
    }
  },

  getUserDocuments: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const docs = await getUserDocumentsApi(userId);
      set({ isLoading: false });
      return docs;
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch user documents' });
      throw error;
    }
  },

  getAllDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const docs = await getAllDocumentsApi();
      set({ allDocuments: docs, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch documents' });
      throw error;
    }
  },

  uploadDocument: async (userId, data) => {
    set({ isLoading: true, error: null });
    try {
      const doc = await uploadUserDocumentApi(userId, data);
      set({ isLoading: false });
      return doc;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Upload failed' });
      throw err;
    }
  },

  updateDocument: async (documentId, data) => {
    set({ isLoading: true, error: null });
    try {
      const doc = await updateDocumentApi(documentId, data);
      set({ isLoading: false });
      return doc;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Update failed' });
      throw err;
    }
  },

  verifyDocument: async (documentId) => {
    set({ isLoading: true, error: null });
    try {
      const doc = await verifyDocumentApi(documentId);
      set({ isLoading: false });
      return doc;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Verify failed' });
      throw err;
    }
  },

  unverifyDocument: async (documentId) => {
    set({ isLoading: true, error: null });
    try {
      const doc = await unverifyDocumentApi(documentId);
      set({ isLoading: false });
      return doc;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Unverify failed' });
      throw err;
    }
  },

  deleteDocument: async (documentId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteDocumentApi(documentId);
      set({ isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Delete failed' });
      throw err;
    }
  },

  // ==========================================
  // Utilities
  // ==========================================

  clearError: () => set({ error: null }),

  reset: () => {
    set({
      users: [],
      currentEditUser: null,
      currentFullProfile: null,
      shifts: [],
      leaves: [],
      myPayslips: [],
      allPayslips: null,
      myDocuments: [],
      allDocuments: [],
      userStats: null,
      permissions: [],
      isLoading: false,
      error: null,
      pagination: null,
    });
  },
}));