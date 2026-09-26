import { Request, Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { UserService } from './UserService';
import { AuthRequest } from '../../middleware/authMiddleware';
import {
  UpdateUserDTO, UserFilters,
  CreateShiftDTO, UpdateShiftDTO, ShiftFilters,
  CreateLeaveDTO, UpdateLeaveDTO, LeaveFilters,
  PayslipFilters,
} from './UserTypes';

const ADMIN_LIKE_ROLES = ['admin', 'super_admin', 'hr_officer'];

export class UserController extends BaseController {
  private service: UserService;

  constructor(prisma: any) {
    super();
    this.service = new UserService(prisma);
  }

  private actorOf(req: AuthRequest) {
    return {
      userId: req.user?.userId ?? '',
      role: req.user?.role ?? '',
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    };
  }

  private isAdminLike(req: AuthRequest, allowHr = true): boolean {
    const role = req.user?.role ?? '';
    const roles = allowHr ? ADMIN_LIKE_ROLES : ['admin', 'super_admin'];
    return roles.includes(role);
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  createUser = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.service.createUser(req.body, this.actorOf(req));
    return this.created(res, user, 'User created successfully');
  });

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
    return this.paginated(
      res,
      result.users,
      { page: filters.page!, limit: filters.limit!, total: result.total },
      'Users retrieved',
    );
  });

  getUserById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.service.getUserById(req.params.id);
    if (!user) return this.notFound(res, 'User');
    return this.ok(res, user, 'User retrieved successfully');
  });

  updateUser = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;
    const updateData: UpdateUserDTO = req.body;
    const result = await this.service.updateUser(userId, updateData, this.actorOf(req));

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
    const user = await this.service.deactivateUser(req.params.id, this.actorOf(req));
    return this.ok(res, user, 'User deactivated successfully');
  });

  getMyPermissions = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return this.unauthorized(res, 'User not authenticated');
    const result = await this.service.getUserPermissions(userId, req.user?.role);
    return res.json(result.permissions);
  });

  // ==========================================
  // SHIFTS
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
    return this.paginated(
      res,
      result.shifts,
      { page: filters.page!, limit: filters.limit!, total: result.total },
      'Shifts retrieved',
    );
  });

  getShiftById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const shift = await this.service.getShiftById(req.params.id);
    if (!shift) return this.notFound(res, 'Shift');
    return this.ok(res, shift, 'Shift retrieved successfully');
  });

  createShift = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: CreateShiftDTO = req.body;
    const shift = await this.service.createShift(data, this.actorOf(req));
    return this.created(res, shift, 'Shift created successfully');
  });

  updateShift = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: UpdateShiftDTO = req.body;
    const shift = await this.service.updateShift(req.params.id, data, { userId: req.user!.userId });
    return this.ok(res, shift, 'Shift updated successfully');
  });

  deleteShift = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteShift(req.params.id, { userId: req.user!.userId });
    return this.ok(res, null, 'Shift deleted successfully');
  });

  // ==========================================
  // STAFF PROFILE
  // ==========================================

  getStaffProfile = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await this.service.getStaffProfile(req.params.id);
    if (!profile) return this.notFound(res, 'Staff profile');
    return this.ok(res, profile, 'Staff profile retrieved');
  });

  updateStaffProfile = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await this.service.updateStaffProfile(req.params.id, req.body);
    return this.ok(res, profile, 'Staff profile updated');
  });

  // ==========================================
  // FULL PROFILE
  // ==========================================

  getFullProfile = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;

    if (!actorId || !actorRole) return this.unauthorized(res, 'Not authenticated');

    const isSelf = actorId === userId;
    if (!isSelf && !this.isAdminLike(req)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this profile' });
    }

    const profile = await this.service.getFullProfile(userId);
    return this.ok(res, profile, 'Full profile retrieved');
  });

  updateFullProfile = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;
    const payload = req.body || {};
    const profile = await this.service.updateFullProfile(userId, payload, this.actorOf(req));
    return this.ok(res, profile, 'Profile updated successfully');
  });

  // ==========================================
  // PAYROLL
  // ==========================================

  getMyPayslips = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return this.unauthorized(res, 'Not authenticated');
    const records = await this.service.getPayslipsForUser(userId);
    return this.ok(res, records, 'Payslips retrieved');
  });

  getUserPayslips = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;
    const actorId = req.user?.userId;
    const isSelf = actorId === userId;
    if (!isSelf && !this.isAdminLike(req)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const records = await this.service.getPayslipsForUser(userId);
    return this.ok(res, records, 'Payslips retrieved');
  });

  getAllPayslips = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters: PayslipFilters = {
      month: req.query.month ? parseInt(req.query.month as string) : undefined,
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      userId: req.query.userId as string | undefined,
      isPaid: req.query.isPaid === 'true' ? true : req.query.isPaid === 'false' ? false : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 500,
    };
    const result = await this.service.getPayslips(filters);
    return res.json({ success: true, data: result });
  });

  generatePayslip = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;
    const { month, year } = req.body;
    if (!month || !year) return this.badRequest(res, 'month and year are required');

    const record = await this.service.generatePayslipForUser(userId, Number(month), Number(year));
    return this.created(res, record, 'Payslip generated');
  });

  runPayroll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { month, year } = req.body;
    if (!month || !year) return this.badRequest(res, 'month and year are required');

    const result = await this.service.runPayrollForMonth(Number(month), Number(year));
    return this.ok(res, result, 'Payroll run complete');
  });

  updatePayslip = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { payslipId } = req.params;
    const record = await this.service.updatePayslip(
      payslipId,
      req.body || {},
      { userId: req.user!.userId },
    );
    return this.ok(res, record, 'Payslip updated');
  });

  getPayslipById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { payslipId } = req.params;
    const record = await this.service.getPayslipById(payslipId);
    return this.ok(res, record, 'Payslip retrieved');
  });

  addPayslipLineItem = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { payslipId } = req.params;
    const updated = await this.service.addPayslipLineItem(payslipId, req.body, { userId: req.user!.userId });
    return this.ok(res, updated, 'Line item added');
  });

  updatePayslipLineItem = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { payslipId, lineItemId } = req.params;
    const updated = await this.service.updatePayslipLineItem(payslipId, lineItemId, req.body, { userId: req.user!.userId });
    return this.ok(res, updated, 'Line item updated');
  });

  deletePayslipLineItem = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { payslipId, lineItemId } = req.params;
    const updated = await this.service.deletePayslipLineItem(payslipId, lineItemId, { userId: req.user!.userId });
    return this.ok(res, updated, 'Line item removed');
  });

  // ==========================================
  // DOCUMENTS
  // ==========================================

  getMyDocuments = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return this.unauthorized(res, 'Not authenticated');
    const docs = await this.service.getDocumentsForUser(userId);
    return this.ok(res, docs, 'Documents retrieved');
  });

  getUserDocuments = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;
    const actorId = req.user?.userId;
    const isSelf = actorId === userId;
    if (!isSelf && !this.isAdminLike(req)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const docs = await this.service.getDocumentsForUser(userId);
    return this.ok(res, docs, 'Documents retrieved');
  });

  getAllDocuments = this.asyncHandler(async (_req: AuthRequest, res: Response) => {
    const docs = await this.service.getDocumentsForAll();
    return this.ok(res, docs, 'Documents retrieved');
  });

  getDocumentById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await this.service.getDocumentById(req.params.documentId);
    return this.ok(res, doc, 'Document retrieved');
  });

  uploadUserDocument = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return this.badRequest(res, 'No file uploaded');

    const { type, title, expiryDate } = req.body;
    if (!type || !title) return this.badRequest(res, 'type and title are required');

    const fileUrl = `/uploads/documents/${file.filename}`;

    const doc = await this.service.createDocument(userId, {
      type,
      title,
      fileUrl,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    });

    return this.created(res, doc, 'Document uploaded');
  });

  updateDocument = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await this.service.updateDocument(req.params.documentId, req.body);
    return this.ok(res, doc, 'Document updated');
  });

  verifyDocument = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const verifierId = req.user?.userId;
    if (!verifierId) return this.unauthorized(res, 'Not authenticated');
    const doc = await this.service.verifyDocument(req.params.documentId, verifierId);
    return this.ok(res, doc, 'Document verified');
  });

  unverifyDocument = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await this.service.unverifyDocument(req.params.documentId);
    return this.ok(res, doc, 'Document unverified');
  });

  deleteDocument = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteDocument(req.params.documentId);
    return this.ok(res, null, 'Document deleted');
  });

  // ==========================================
  // LEAVES
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
    return this.paginated(
      res,
      result.leaves,
      { page: filters.page!, limit: filters.limit!, total: result.total },
      'Leaves retrieved',
    );
  });

  getLeaveById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const leave = await this.service.getLeaveById(req.params.id);
    if (!leave) return this.notFound(res, 'Leave request');
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
    const data: UpdateLeaveDTO = req.body;
    const leave = await this.service.updateLeave(leaveId, data, {
      userId: req.user!.userId,
      role: req.user!.role,
    });
    return this.ok(res, leave, 'Leave request updated successfully');
  });

  deleteLeave = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const leaveId = req.params.id;
    await this.service.deleteLeave(leaveId, {
      userId: req.user!.userId,
      role: req.user!.role,
    });
    return this.ok(res, null, 'Leave request deleted successfully');
  });
}