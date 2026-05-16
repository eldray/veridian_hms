/**
 * Staff Service
 * Business logic for unified staff profile management
 */

import { BaseService } from '../../shared/base/BaseService';
import { StaffRepository } from './StaffRepository';
import {
  IStaffProfile,
  CreateStaffDTO,
  UpdateStaffDTO,
  StaffListQueryDTO,
  StaffStatisticsDTO,
  StaffRoleType,
  StaffStatus,
} from './StaffTypes';
import { UserService } from '../user/UserService';
import { UserRole } from '../user/UserTypes';

export class StaffService extends BaseService {
  private staffRepository: StaffRepository;
  private userService: UserService;

  constructor(staffRepository: StaffRepository, userService: UserService) {
    super('StaffService');
    this.staffRepository = staffRepository;
    this.userService = userService;
  }

  /**
   * Create new staff profile (Admin only)
   */
  async createStaff(dto: CreateStaffDTO, adminId: string): Promise<{ staff: IStaffProfile; message: string }> {
    this.logger.info(`Creating staff profile for user: ${dto.userId}`);

    // Verify user exists and has STAFF role
    const user = await this.userService.getProfile(dto.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== UserRole.STAFF) {
      throw new Error('User must have STAFF role to create a staff profile');
    }

    // Check if staff profile already exists for this user
    const existingStaff = await this.staffRepository.findByUserId(dto.userId);
    if (existingStaff) {
      throw new Error('Staff profile already exists for this user');
    }

    // Validate license for medical roles
    if (this.isMedicalRole(dto.roleType)) {
      if (!dto.licenseNumber || !dto.licenseExpiryDate) {
        throw new Error('License number and expiry date are required for medical roles');
      }

      if (dto.licenseExpiryDate <= new Date()) {
        throw new Error('License has expired');
      }
    }

    // Create staff profile
    const staff = await this.staffRepository.create(dto);

    this.logger.info(`Staff profile created: ${staff.id} (Employee ID: ${staff.employeeId})`);

    return {
      staff,
      message: 'Staff profile created successfully',
    };
  }

  /**
   * Get staff profile by user ID
   */
  async getStaffByUserId(userId: string): Promise<IStaffProfile> {
    const staff = await this.staffRepository.findByUserId(userId);
    if (!staff) {
      throw new Error('Staff profile not found');
    }

    return staff;
  }

  /**
   * Get staff profile by employee ID
   */
  async getStaffByEmployeeId(employeeId: string): Promise<IStaffProfile> {
    const staff = await this.staffRepository.findByEmployeeId(employeeId);
    if (!staff) {
      throw new Error('Staff profile not found');
    }

    return staff;
  }

  /**
   * Get staff profile by ID
   */
  async getStaffById(id: string): Promise<IStaffProfile> {
    const staff = await this.staffRepository.findByIdWithRelations(id);
    if (!staff) {
      throw new Error('Staff profile not found');
    }

    return staff;
  }

  /**
   * Update staff profile
   */
  async updateStaff(id: string, dto: UpdateStaffDTO, updaterId: string): Promise<{ staff: IStaffProfile; message: string }> {
    this.logger.info(`Updating staff profile: ${id} by user: ${updaterId}`);

    const existingStaff = await this.staffRepository.findByIdWithRelations(id);
    if (!existingStaff) {
      throw new Error('Staff profile not found');
    }

    // Validate license changes for medical roles
    if (dto.roleType && this.isMedicalRole(dto.roleType)) {
      if (!dto.licenseNumber || !dto.licenseExpiryDate) {
        throw new Error('License number and expiry date are required for medical roles');
      }

      if (dto.licenseExpiryDate && dto.licenseExpiryDate <= new Date()) {
        throw new Error('License has expired');
      }
    }

    // Prevent changing to terminated status if there are active appointments
    if (dto.status === StaffStatus.TERMINATED && existingStaff.status !== StaffStatus.TERMINATED) {
      // Note: In production, check Appointment module for active appointments
      this.logger.warn(`Staff ${id} being terminated - verify no active appointments`);
    }

    const staff = await this.staffRepository.update(id, dto);

    this.logger.info(`Staff profile updated: ${id}`);

    return {
      staff,
      message: 'Staff profile updated successfully',
    };
  }

  /**
   * Get all staff with pagination and filters
   */
  async getAllStaff(query: StaffListQueryDTO) {
    return this.staffRepository.findAllWithFilters(query);
  }

  /**
   * Get staff statistics
   */
  async getStatistics(): Promise<StaffStatisticsDTO> {
    return this.staffRepository.getStatistics();
  }

  /**
   * Activate staff profile
   */
  async activateStaff(id: string): Promise<{ staff: IStaffProfile; message: string }> {
    const staff = await this.staffRepository.findByIdWithRelations(id);
    if (!staff) {
      throw new Error('Staff profile not found');
    }

    const updatedStaff = await this.staffRepository.update(id, { status: StaffStatus.ACTIVE });

    this.logger.info(`Staff activated: ${id}`);

    return {
      staff: updatedStaff,
      message: 'Staff profile activated successfully',
    };
  }

  /**
   * Put staff on leave
   */
  async putOnLeave(id: string, reason?: string): Promise<{ staff: IStaffProfile; message: string }> {
    const staff = await this.staffRepository.findByIdWithRelations(id);
    if (!staff) {
      throw new Error('Staff profile not found');
    }

    const updatedStaff = await this.staffRepository.update(id, { status: StaffStatus.ON_LEAVE });

    this.logger.info(`Staff on leave: ${id}`);

    return {
      staff: updatedStaff,
      message: 'Staff marked as on leave',
    };
  }

  /**
   * Terminate staff
   */
  async terminateStaff(id: string, adminId: string): Promise<{ staff: IStaffProfile; message: string }> {
    const staff = await this.staffRepository.findByIdWithRelations(id);
    if (!staff) {
      throw new Error('Staff profile not found');
    }

    // Note: In production, check for active appointments, pending tasks, etc.
    
    const updatedStaff = await this.staffRepository.update(id, { 
      status: StaffStatus.TERMINATED,
      endDate: new Date(),
    });

    this.logger.warn(`Staff terminated: ${id} by admin: ${adminId}`);

    return {
      staff: updatedStaff,
      message: 'Staff terminated successfully',
    };
  }

  /**
   * Find available doctors by specialty
   */
  async findAvailableDoctors(specialization?: string, date?: Date) {
    return this.staffRepository.findAvailableDoctors(specialization, date);
  }

  /**
   * Get doctors by department
   */
  async getDoctorsByDepartment(departmentId: string): Promise<IStaffProfile[]> {
    const query: StaffListQueryDTO = {
      roleType: StaffRoleType.DOCTOR,
      departmentId,
      status: StaffStatus.ACTIVE,
      limit: 100,
    };

    const result = await this.staffRepository.findAllWithFilters(query);
    return result.data;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private isMedicalRole(roleType: StaffRoleType): boolean {
    const medicalRoles: StaffRoleType[] = [
      StaffRoleType.DOCTOR,
      StaffRoleType.NURSE,
      StaffRoleType.LAB_TECHNICIAN,
      StaffRoleType.PHARMACIST,
    ];

    return medicalRoles.includes(roleType);
  }
}
