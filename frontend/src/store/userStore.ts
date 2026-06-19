// src/store/userStore.ts - COMPLETE USER MANAGEMENT (Admin functions)
import { create } from 'zustand';
import {
  getAllUsers as getAllUsersApi,
  getUserById as getUserByIdApi,
  updateUser as updateUserApi,
  deactivateUser as deactivateUserApi,
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  getUsersByDepartment as getUsersByDepartmentApi,
  updateUserDepartment as updateUserDepartmentApi,
  register,
  getShifts as getShiftsApi,
  getShiftById,
  createShift as createShiftApi,
  updateShift as updateShiftApi,
  deleteShift as deleteShiftApi,
  getLeaves as getLeavesApi,
  getLeaveById,
  createLeave as createLeaveApi,
  updateLeave as updateLeaveApi,
  deleteLeave as deleteLeaveApi,
} from '../api';
import type { User, Seniority } from '../types';

// Seniority configuration
export const SENIORITY_LEVELS: Record<Seniority, number> = {
  TRAINEE: 0,
  JUNIOR: 1,
  SENIOR: 2,
  PRINCIPAL: 3
};

export const SENIORITY_OPTIONS = [
  { value: 'TRAINEE', label: 'Trainee', level: 0, description: 'In training, requires supervision' },
  { value: 'JUNIOR', label: 'Junior Staff', level: 1, description: 'Regular staff member' },
  { value: 'SENIOR', label: 'Senior Staff', level: 2, description: 'Experienced, can supervise others' },
  { value: 'PRINCIPAL', label: 'Principal', level: 3, description: 'Highest authority in role' }
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
  approver?: User;
  createdAt: string;
  updatedAt: string;
}

interface UserState {
  // State
  users: User[];
  currentEditUser: User | null;
  shifts: Shift[];
  leaves: Leave[];
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
  
  // Profile Management (self)
  getUserProfile: () => Promise<User>;
  updateUserProfile: (data: Partial<User>) => Promise<User>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getCurrentUserPermissions: () => Promise<string[]>;
  
  // Seniority Management
  updateUserSeniority: (userId: string, seniority: Seniority) => Promise<void>;
  getUsersBySeniority: (minSeniority: Seniority) => User[];
  hasMinSeniority: (userSeniority: Seniority, requiredSeniority: Seniority) => boolean;
  
  // Department Assignment
  getUsersByDepartment: (departmentId: string) => Promise<User[]>;
  updateUserDepartment: (userId: string, departmentId: string) => Promise<void>;
  
  // Shift Management
  getShifts: (filters?: { userId?: string; departmentId?: string; shiftDate?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => Promise<void>;
  getShiftById: (shiftId: string) => Promise<Shift>;
  createShift: (data: { userId: string; shiftDate: string; startTime: string; endTime: string; shiftType?: 'morning' | 'afternoon' | 'night' | 'on_call'; notes?: string }) => Promise<Shift>;
  updateShift: (shiftId: string, data: Partial<Shift>) => Promise<Shift>;
  deleteShift: (shiftId: string) => Promise<void>;
  
  // Leave Management
  getLeaves: (filters?: { userId?: string; departmentId?: string; status?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => Promise<void>;
  getLeaveById: (leaveId: string) => Promise<Leave>;
  createLeave: (data: { leaveType: string; startDate: string; endDate: string; reason?: string }) => Promise<Leave>;
  updateLeave: (leaveId: string, data: { status?: string; reason?: string }) => Promise<Leave>;
  deleteLeave: (leaveId: string) => Promise<void>;
  approveLeave: (leaveId: string) => Promise<Leave>;
  rejectLeave: (leaveId: string, reason?: string) => Promise<Leave>;
  
  clearError: () => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  currentEditUser: null,
  shifts: [],
  leaves: [],
  userStats: null,
  permissions: [],
  isLoading: false,
  error: null,
  pagination: null,

  // ==========================================
  // User CRUD Operations
  // ==========================================

  getAllUsers: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAllUsersApi(filters);
      const users = response.users || response.data || response;
      
      const usersWithSeniority = Array.isArray(users) 
        ? users.map((user: User) => ({
            ...user,
            seniority: user.seniority || 'JUNIOR'
          }))
        : [];
      
      set({
        users: usersWithSeniority,
        pagination: response.pagination || null,
        isLoading: false
      });
    } catch (error: unknown) {
      console.error('Failed to fetch users:', error);
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch users'
      });
      throw error;
    }
  },

  getUserById: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getUserByIdApi(userId);
      set({ isLoading: false });
      return user;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch user'
      });
      throw error;
    }
  },

  updateUser: async (userId: string, data: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await updateUserApi(userId, data);
      const users = get().users.map(user =>
        user.id === userId ? { ...updatedUser, seniority: updatedUser.seniority || user.seniority } : user
      );
      set({ users, isLoading: false });
      return updatedUser;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to update user'
      });
      throw error;
    }
  },

  deactivateUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deactivateUserApi(userId);
      const users = get().users.map(user =>
        user.id === userId ? { ...user, isActive: false } : user
      );
      set({ users, isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to deactivate user'
      });
      throw error;
    }
  },

  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await register({
        ...userData,
        seniority: userData.seniority || 'JUNIOR'
      });
      
      const newUser = response.user || response.data?.user || response;
      
      // Refresh user list
      await get().getAllUsers();
      
      set({ isLoading: false });
      return newUser;
    } catch (error: unknown) {
      console.error('Failed to create user:', error);
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to create user'
      });
      throw error;
    }
  },

  // ==========================================
  // Profile Management (Self)
  // ==========================================

  getUserProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await getUserProfile();
      set({ isLoading: false });
      return user;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch profile'
      });
      throw error;
    }
  },

  updateUserProfile: async (data: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      const user = await updateUserProfile(data);
      set({ isLoading: false });
      return user;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to update profile'
      });
      throw error;
    }
  },

  changeUserPassword: async (currentPassword: string, newPassword: string) => {
    set({ isLoading: true, error: null });
    try {
      await changeUserPassword(currentPassword, newPassword);
      set({ isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to change password'
      });
      throw error;
    }
  },

  getCurrentUserPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const permissions = await getCurrentUserPermissions();
      set({ permissions, isLoading: false });
      return permissions;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch permissions'
      });
      throw error;
    }
  },

  // ==========================================
  // Seniority Management
  // ==========================================

  updateUserSeniority: async (userId: string, seniority: Seniority) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await updateUserApi(userId, { seniority });
      
      const users = get().users.map(user =>
        user.id === userId ? { ...user, seniority: updatedUser.seniority || seniority } : user
      );
      
      set({ users, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to update user seniority:', error);
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to update user seniority'
      });
      throw error;
    }
  },

  getUsersBySeniority: (minSeniority: Seniority) => {
    const users = get().users;
    const minLevel = SENIORITY_LEVELS[minSeniority];
    
    return users.filter(user => {
      const userLevel = SENIORITY_LEVELS[user.seniority as Seniority] || 0;
      return userLevel >= minLevel && user.isActive;
    });
  },

  hasMinSeniority: (userSeniority: Seniority, requiredSeniority: Seniority) => {
    return SENIORITY_LEVELS[userSeniority] >= SENIORITY_LEVELS[requiredSeniority];
  },

  // ==========================================
  // Department Assignment
  // ==========================================

  getUsersByDepartment: async (departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await getUsersByDepartmentApi(departmentId);
      set({ isLoading: false });
      return users;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch department users'
      });
      throw error;
    }
  },

  updateUserDepartment: async (userId: string, departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      await updateUserDepartmentApi(userId, departmentId);

      const updatedUsers = get().users.map(user =>
        user.id === userId ? { ...user, departmentId } : user
      );

      set({ users: updatedUsers, isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to update user department'
      });
      throw error;
    }
  },

  // ==========================================
  // Shift Management
  // ==========================================

  getShifts: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getShiftsApi(filters);
      const shifts = response.data || response || [];
      set({ shifts, isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch shifts'
      });
      throw error;
    }
  },

  getShiftById: async (shiftId: string) => {
    set({ isLoading: true, error: null });
    try {
      const shift = await getShiftById(shiftId);
      set({ isLoading: false });
      return shift;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch shift'
      });
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
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to create shift'
      });
      throw error;
    }
  },

  updateShift: async (shiftId: string, data: Partial<Shift>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedShift = await updateShiftApi(shiftId, data);
      const shifts = get().shifts.map(shift =>
        shift.id === shiftId ? updatedShift : shift
      );
      set({ shifts, isLoading: false });
      return updatedShift;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to update shift'
      });
      throw error;
    }
  },

  deleteShift: async (shiftId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteShiftApi(shiftId);
      const shifts = get().shifts.filter(shift => shift.id !== shiftId);
      set({ shifts, isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to delete shift'
      });
      throw error;
    }
  },

  // ==========================================
  // Leave Management
  // ==========================================

  getLeaves: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getLeavesApi(filters);
      const leaves = response.data || response || [];
      set({ leaves, isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch leaves'
      });
      throw error;
    }
  },

  getLeaveById: async (leaveId: string) => {
    set({ isLoading: true, error: null });
    try {
      const leave = await getLeaveById(leaveId);
      set({ isLoading: false });
      return leave;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch leave request'
      });
      throw error;
    }
  },

  createLeave: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const leave = await createLeaveApi(data);
      const leaves = [leave, ...get().leaves];
      set({ leaves, isLoading: false });
      return leave;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to create leave request'
      });
      throw error;
    }
  },

  updateLeave: async (leaveId: string, data: { status?: string; reason?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const updatedLeave = await updateLeaveApi(leaveId, data);
      const leaves = get().leaves.map(leave =>
        leave.id === leaveId ? updatedLeave : leave
      );
      set({ leaves, isLoading: false });
      return updatedLeave;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to update leave request'
      });
      throw error;
    }
  },

  deleteLeave: async (leaveId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteLeaveApi(leaveId);
      const leaves = get().leaves.filter(leave => leave.id !== leaveId);
      set({ leaves, isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to delete leave request'
      });
      throw error;
    }
  },

  approveLeave: async (leaveId: string) => {
    return get().updateLeave(leaveId, { status: 'approved' });
  },

  rejectLeave: async (leaveId: string, reason?: string) => {
    return get().updateLeave(leaveId, { status: 'rejected', reason });
  },

  // ==========================================
  // Utility Functions
  // ==========================================

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      users: [],
      currentEditUser: null,
      shifts: [],
      leaves: [],
      userStats: null,
      permissions: [],
      isLoading: false,
      error: null,
      pagination: null
    });
  }
}));