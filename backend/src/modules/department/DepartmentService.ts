// DepartmentService.ts - Add seniority validation for department heads

import { PrismaClient, Seniority } from '@prisma/client';
import { DepartmentRepository } from './DepartmentRepository';
import { CreateDepartmentDTO, UpdateDepartmentDTO, DepartmentFilters, DepartmentStats } from './DepartmentTypes';

export class DepartmentService {
  private repository: DepartmentRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.repository = new DepartmentRepository(prisma);
  }

  // Helper to check if user has required seniority for department head
  private async validateDepartmentHeadSeniority(userId: string, departmentName?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        fullName: true, 
        role: true, 
        seniority: true,
        departmentId: true
      }
    });

    if (!user) {
      throw new Error('Head user not found');
    }

    // Only SENIOR or PRINCIPAL can be department heads
    const allowedSeniority: Seniority[] = ['SENIOR', 'PRINCIPAL'];
    
    if (!allowedSeniority.includes(user.seniority)) {
      throw new Error(`Department head must have SENIOR or PRINCIPAL seniority level. Current: ${user.seniority}`);
    }

    // Validate role matches department type (optional - based on department name)
    if (departmentName) {
      const departmentType = this.getDepartmentTypeFromName(departmentName);
      if (departmentType && !this.isRoleMatchForDepartment(user.role, departmentType)) {
        throw new Error(`User role (${user.role}) does not match department type (${departmentType}). For example, a Nurse cannot head the Medical Department.`);
      }
    }

    return;
  }

  // Helper to determine department type from name
  private getDepartmentTypeFromName(departmentName: string): string | null {
    const name = departmentName.toLowerCase();
    
    if (name.includes('medical') || name.includes('medicine') || name.includes('doctor')) return 'medical';
    if (name.includes('nursing') || name.includes('nurse')) return 'nursing';
    if (name.includes('pharmacy') || name.includes('pharmacist')) return 'pharmacy';
    if (name.includes('lab') || name.includes('laboratory')) return 'lab';
    if (name.includes('radiology') || name.includes('imaging') || name.includes('scan')) return 'radiology';
    if (name.includes('finance') || name.includes('billing') || name.includes('accounts')) return 'finance';
    if (name.includes('records') || name.includes('medical records')) return 'records';
    if (name.includes('surgery') || name.includes('surgical')) return 'surgical';
    if (name.includes('obstetrics') || name.includes('gynecology') || name.includes('obgyn')) return 'obgyn';
    if (name.includes('pediatrics') || name.includes('child')) return 'pediatrics';
    
    return null;
  }

  // Helper to check if user role matches department type
  private isRoleMatchForDepartment(userRole: string, departmentType: string): boolean {
    const roleMatches: Record<string, string[]> = {
      'medical': ['doctor', 'admin'],
      'nursing': ['nurse', 'admin'],
      'pharmacy': ['pharmacist', 'admin'],
      'lab': ['lab_tech', 'admin'],
      'radiology': ['sonographer', 'doctor', 'admin'],
      'finance': ['accounts', 'admin'],
      'records': ['records', 'admin'],
      'surgical': ['doctor', 'admin'],
      'obgyn': ['doctor', 'midwife', 'admin'],
      'pediatrics': ['doctor', 'nurse', 'admin']
    };
    
    const allowedRoles = roleMatches[departmentType] || [];
    return allowedRoles.includes(userRole) || userRole === 'admin';
  }

  async getAllDepartments(filters: DepartmentFilters) {
    return this.repository.findAll(filters);
  }

  async getDepartmentById(id: string) {
    const department = await this.repository.findById(id);
    if (!department) {
      throw new Error('Department not found');
    }
    return department;
  }

  async createDepartment(data: CreateDepartmentDTO, userId?: string) {
    // Check for duplicate name
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new Error('A department with this name already exists');
    }

    // Validate head user if provided (must have SENIOR or PRINCIPAL seniority)
    if (data.headId) {
      await this.validateDepartmentHeadSeniority(data.headId, data.name);
    }

    return this.repository.create(data);
  }

  async updateDepartment(id: string, data: UpdateDepartmentDTO, userId?: string) {
    // Check if department exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Department not found');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.repository.findByName(data.name, id);
      if (duplicate) {
        throw new Error('A department with this name already exists');
      }
    }

    // Validate head user if provided (must have SENIOR or PRINCIPAL seniority)
    if (data.headId) {
      const departmentName = data.name || existing.name;
      await this.validateDepartmentHeadSeniority(data.headId, departmentName);
    }

    return this.repository.update(id, data);
  }

  async deleteDepartment(id: string) {
    const department = await this.repository.findById(id);
    if (!department) {
      throw new Error('Department not found');
    }

    // Check if department has users
    const userCount = await this.repository.getUserCount(id);
    if (userCount > 0) {
      throw new Error('Cannot delete department with assigned users. Remove all users first.');
    }

    return this.repository.delete(id);
  }

  async getStatistics(): Promise<DepartmentStats> {
    return this.repository.getStatistics();
  }

  async getUsersByDepartment(departmentId: string) {
    const department = await this.repository.findById(departmentId);
    if (!department) {
      throw new Error('Department not found');
    }
    return this.repository.getUsersByDepartment(departmentId);
  }

  async assignUserToDepartment(departmentId: string, userId: string) {
    // Validate department exists
    const department = await this.repository.findById(departmentId);
    if (!department) {
      throw new Error('Department not found');
    }

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if already assigned to this department
    if (user.departmentId === departmentId) {
      throw new Error('User is already assigned to this department');
    }

    return this.repository.assignUserToDepartment(departmentId, userId);
  }

  async removeUserFromDepartment(departmentId: string, userId: string) {
    // Validate department exists
    const department = await this.repository.findById(departmentId);
    if (!department) {
      throw new Error('Department not found');
    }

    // Check if user is in this department
    const isInDepartment = await this.repository.checkUserInDepartment(departmentId, userId);
    if (!isInDepartment) {
      throw new Error('User not found in this department');
    }

    return this.repository.removeUserFromDepartment(departmentId, userId);
  }

  async bulkUpdateDepartments(departmentIds: string[], data: UpdateDepartmentDTO) {
    if (departmentIds.length === 0) {
      throw new Error('No department IDs provided');
    }

    return this.repository.bulkUpdate(departmentIds, data);
  }

  // Get eligible department heads (users with SENIOR or PRINCIPAL seniority)
  async getEligibleDepartmentHeads() {
    const eligibleUsers = await this.prisma.user.findMany({
      where: {
        seniority: { in: ['SENIOR', 'PRINCIPAL'] },
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        seniority: true,
        specialization: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { seniority: 'desc' },
        { fullName: 'asc' }
      ]
    });

    return eligibleUsers;
  }
}