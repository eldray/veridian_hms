/**
 * Staff Controller
 * HTTP request handlers for unified staff management
 */

import { Response, NextFunction } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { StaffService } from './StaffService';
import {
  CreateStaffDTO,
  UpdateStaffDTO,
  StaffListQueryDTO,
  StaffRoleType,
  StaffStatus,
  EmploymentType,
  AuthenticatedRequest,
} from './StaffTypes';
import { UserRole } from '../user/UserTypes';

export class StaffController extends BaseController {
  private staffService: StaffService;

  constructor(staffService: StaffService) {
    super();
    this.staffService = staffService;
  }

  /**
   * POST /api/staff
   * Create new staff profile (Admin only)
   */
  createStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new Error('Forbidden: Admin access required');
      }

      const dto: CreateStaffDTO = req.body;
      const result = await this.staffService.createStaff(dto, req.user.id);
      this.sendCreated(res, result.staff, result.message);
    });
  };

  /**
   * GET /api/staff/me
   * Get current user's staff profile
   */
  getMyProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        throw new Error('Unauthorized');
      }

      const staff = await this.staffService.getStaffByUserId(req.user.id);
      this.sendSuccess(res, staff, 'Staff profile retrieved successfully');
    });
  };

  /**
   * GET /api/staff/:id
   * Get staff profile by ID
   */
  getStaffById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      const { id } = req.params;
      const staff = await this.staffService.getStaffById(id);
      this.sendSuccess(res, staff, 'Staff profile retrieved successfully');
    });
  };

  /**
   * GET /api/staff/employee/:employeeId
   * Get staff profile by employee ID
   */
  getStaffByEmployeeId = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      const { employeeId } = req.params;
      const staff = await this.staffService.getStaffByEmployeeId(employeeId);
      this.sendSuccess(res, staff, 'Staff profile retrieved successfully');
    });
  };

  /**
   * PUT /api/staff/:id
   * Update staff profile
   */
  updateStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        throw new Error('Unauthorized');
      }

      const { id } = req.params;
      
      // Check permissions: Admin or own profile
      const staff = await this.staffService.getStaffById(id);
      if (req.user.role !== UserRole.ADMIN && staff.userId !== req.user.id) {
        throw new Error('Forbidden: Can only update own profile');
      }

      const dto: UpdateStaffDTO = req.body;
      const result = await this.staffService.updateStaff(id, dto, req.user.id);
      this.sendSuccess(res, result.staff, result.message);
    });
  };

  /**
   * GET /api/staff
   * Get all staff with pagination and filters
   */
  getAllStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      const query: StaffListQueryDTO = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        roleType: req.query.roleType as StaffRoleType,
        status: req.query.status as StaffStatus,
        departmentId: req.query.departmentId as string,
        employmentType: req.query.employmentType as EmploymentType,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await this.staffService.getAllStaff(query);
      this.sendPaginated(
        res,
        result.data,
        result.total,
        result.page,
        result.limit,
        'Staff retrieved successfully'
      );
    });
  };

  /**
   * GET /api/staff/statistics
   * Get staff statistics (Admin only)
   */
  getStatistics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new Error('Forbidden: Admin access required');
      }

      const stats = await this.staffService.getStatistics();
      this.sendSuccess(res, stats, 'Statistics retrieved successfully');
    });
  };

  /**
   * POST /api/staff/:id/activate
   * Activate staff profile (Admin only)
   */
  activateStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new Error('Forbidden: Admin access required');
      }

      const { id } = req.params;
      const result = await this.staffService.activateStaff(id);
      this.sendSuccess(res, result.staff, result.message);
    });
  };

  /**
   * POST /api/staff/:id/leave
   * Put staff on leave (Admin or self)
   */
  putOnLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        throw new Error('Unauthorized');
      }

      const { id } = req.params;
      const staff = await this.staffService.getStaffById(id);
      
      // Check permissions
      if (req.user.role !== UserRole.ADMIN && staff.userId !== req.user.id) {
        throw new Error('Forbidden');
      }

      const result = await this.staffService.putOnLeave(id);
      this.sendSuccess(res, result.staff, result.message);
    });
  };

  /**
   * POST /api/staff/:id/terminate
   * Terminate staff (Admin only)
   */
  terminateStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new Error('Forbidden: Admin access required');
      }

      const { id } = req.params;
      const result = await this.staffService.terminateStaff(id, req.user.id);
      this.sendSuccess(res, result.staff, result.message);
    });
  };

  /**
   * GET /api/staff/doctors/available
   * Get available doctors by specialty
   */
  getAvailableDoctors = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      const { specialization, date } = req.query;
      const doctors = await this.staffService.findAvailableDoctors(
        specialization as string,
        date ? new Date(date as string) : undefined
      );
      this.sendSuccess(res, doctors, 'Available doctors retrieved successfully');
    });
  };

  /**
   * GET /api/staff/doctors/department/:departmentId
   * Get doctors by department
   */
  getDoctorsByDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      const { departmentId } = req.params;
      const doctors = await this.staffService.getDoctorsByDepartment(departmentId);
      this.sendSuccess(res, doctors, 'Doctors retrieved successfully');
    });
  };
}
