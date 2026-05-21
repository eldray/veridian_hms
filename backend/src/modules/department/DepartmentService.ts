/**
 * Department Service
 * Business logic for department operations
 */

import { PrismaClient } from '@prisma/client';
import { DepartmentRepository } from './DepartmentRepository';
import { CreateDepartmentDTO, UpdateDepartmentDTO, DepartmentFilters, DepartmentStats } from './DepartmentTypes';

export class DepartmentService {
  private repository: DepartmentRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.repository = new DepartmentRepository(prisma);
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

    // Validate head user if provided
    if (data.headId) {
      const headUser = await this.prisma.user.findUnique({
        where: { id: data.headId },
        select: { id: true, fullName: true, role: true }
      });

      if (!headUser) {
        throw new Error('Head user not found');
      }
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

    // Validate head user if provided
    if (data.headId) {
      const headUser = await this.prisma.user.findUnique({
        where: { id: data.headId },
        select: { id: true, fullName: true, role: true }
      });

      if (!headUser) {
        throw new Error('Head user not found');
      }
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
}