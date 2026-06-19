// src/modules/user/UserController.ts - CORRECTED FOR YOUR BASECONTROLLER
import { Request, Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { UserService } from './UserService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { UpdateUserDTO, UserFilters, CreateShiftDTO, UpdateShiftDTO, ShiftFilters, CreateLeaveDTO, UpdateLeaveDTO, LeaveFilters } from './UserTypes';

export class UserController extends BaseController {
  private service: UserService;

  constructor(prisma: any) {
    super();
    this.service = new UserService(prisma);
  }

  // ==========================================
  // USER ENDPOINTS
  // ==========================================

  getAllUsers = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters: UserFilters = {
      role: req.query.role as string,
      departmentId: req.query.departmentId as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    const result = await this.service.getAllUsers(filters);
    return this.paginated(res, result.users, { page: filters.page!, limit: filters.limit!, total: result.total }, 'Users retrieved');
  });

  getUserById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;
    const user = await this.service.getUserById(userId);
    if (!user) {
      return this.notFound(res, 'User');
    }
    return this.ok(res, user, 'User retrieved successfully');
  });

  updateUser = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;
    const currentUserId = req.user?.userId;
    if (!currentUserId) return this.unauthorized(res, 'User not authenticated');

    const updateData: UpdateUserDTO = req.body;
    const result = await this.service.updateUser(userId, updateData, currentUserId);

    if (result.tokensRefreshed) {
      return res.json({
        success: true,
        data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
        message: 'User updated successfully. Tokens refreshed.',
      });
    }

    return this.ok(res, result.user, 'User updated successfully');
  });

  deactivateUser = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;
    const user = await this.service.deactivateUser(userId);
    return this.ok(res, user, 'User deactivated successfully');
  });

  // Returns the current logged-in user's effective permission strings.
  // The frontend (getCurrentUserPermissions) expects the response body to BE
  // the string[] directly, so we return the array as the top-level body.
  getMyPermissions = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return this.unauthorized(res, 'User not authenticated');

    const result = await this.service.getUserPermissions(userId, req.user?.role);
    return res.json(result.permissions);
  });

  // ==========================================
  // SHIFT ENDPOINTS
  // ==========================================

  getAllShifts = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters: ShiftFilters = {
      userId: req.query.userId as string,
      departmentId: req.query.departmentId as string,
      shiftDate: req.query.shiftDate ? new Date(req.query.shiftDate as string) : undefined,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    const result = await this.service.getAllShifts(filters);
    return this.paginated(res, result.shifts, { page: filters.page!, limit: filters.limit!, total: result.total }, 'Shifts retrieved');
  });

  getShiftById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const shiftId = req.params.id;
    const shift = await this.service.getShiftById(shiftId);
    if (!shift) {
      return this.notFound(res, 'Shift');
    }
    return this.ok(res, shift, 'Shift retrieved successfully');
  });

  createShift = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: CreateShiftDTO = req.body;
    const shift = await this.service.createShift(data);
    return this.created(res, shift, 'Shift created successfully');
  });

  updateShift = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const shiftId = req.params.id;
    const data: UpdateShiftDTO = req.body;
    const shift = await this.service.updateShift(shiftId, data);
    return this.ok(res, shift, 'Shift updated successfully');
  });

  deleteShift = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const shiftId = req.params.id;
    await this.service.deleteShift(shiftId);
    return this.ok(res, null, 'Shift deleted successfully');
  });

  // ==========================================
  // LEAVE ENDPOINTS
  // ==========================================

  getAllLeaves = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters: LeaveFilters = {
      userId: req.query.userId as string,
      departmentId: req.query.departmentId as string,
      status: req.query.status as any,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    const result = await this.service.getAllLeaves(filters);
    return this.paginated(res, result.leaves, { page: filters.page!, limit: filters.limit!, total: result.total }, 'Leaves retrieved');
  });

  getLeaveById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const leaveId = req.params.id;
    const leave = await this.service.getLeaveById(leaveId);
    if (!leave) {
      return this.notFound(res, 'Leave request');
    }
    return this.ok(res, leave, 'Leave request retrieved successfully');
  });

  createLeave = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return this.unauthorized(res, 'User not authenticated');

    const data: CreateLeaveDTO = req.body;
    const leave = await this.service.createLeave(userId, data);
    return this.created(res, leave, 'Leave request created successfully');
  });

  updateLeave = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const leaveId = req.params.id;
    const approverId = req.user?.userId;
    const data: UpdateLeaveDTO = req.body;
    const leave = await this.service.updateLeave(leaveId, data, approverId);
    return this.ok(res, leave, 'Leave request updated successfully');
  });

  deleteLeave = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const leaveId = req.params.id;
    await this.service.deleteLeave(leaveId);
    return this.ok(res, null, 'Leave request deleted successfully');
  });
}