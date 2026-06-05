// DepartmentTypes.ts
import { Department, Seniority } from '@prisma/client';  // ✅ ADD Seniority import

export interface CreateDepartmentDTO {
  name: string;
  description?: string;
  headId?: string;
  color?: string;
  icon?: string;
}

export interface UpdateDepartmentDTO {
  name?: string;
  description?: string;
  headId?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface DepartmentFilters {
  isActive?: boolean;
  hasHead?: boolean;
  page?: number;
  limit?: number;
}

export interface DepartmentUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  specialization: string | null;
  createdAt: Date;
}

export interface DepartmentWithRelations extends Department {
  head?: {
    id: string;
    fullName: string;
    role: string;
    email: string | null;
    phone: string | null;
    specialization: string | null;
  } | null;
  users?: DepartmentUser[];
  _count?: {
    users: number;
    appointments: number;
  };
}

export interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  inactiveDepartments: number;
  departmentsWithHeads: number;
  departmentsWithoutHeads: number;
  totalStaff: number;
  averageStaffPerDepartment: number;
}

export interface DepartmentResponse {
  success: boolean;
  data?: DepartmentWithRelations | DepartmentWithRelations[];
  message?: string;
  count?: number;
  stats?: DepartmentStats;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ✅ ADD this interface
export interface EligibleDepartmentHead {
  id: string;
  fullName: string;
  role: string;
  seniority: Seniority;  // Now Seniority is imported from @prisma/client
  specialization: string | null;
  departmentId: string | null;
  department: {
    id: string;
    name: string;
  } | null;
}