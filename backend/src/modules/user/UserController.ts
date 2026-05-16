/**
 * User Controller
 * HTTP request handlers for user identity management
 */

import { Response, NextFunction } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { UserService } from './UserService';
import {
  CreateUserDTO,
  UpdateUserDTO,
  LoginRequestDTO,
  ChangePasswordDTO,
  UserListQueryDTO,
  UserRole,
  AuthenticatedRequest,
} from './UserTypes';

export class UserController extends BaseController {
  private userService: UserService;

  constructor(userService: UserService) {
    super();
    this.userService = userService;
  }

  /**
   * POST /api/users/register
   * Register a new user
   */
  register = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      const dto: CreateUserDTO = req.body;
      const result = await this.userService.register(dto);
      this.sendCreated(res, result.user, result.message);
    });
  };

  /**
   * POST /api/users/login
   * Login user
   */
  login = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      const dto: LoginRequestDTO = req.body;
      const result = await this.userService.login(dto);
      this.sendSuccess(res, result, 'Login successful');
    });
  };

  /**
   * POST /api/users/refresh-token
   * Refresh access token
   */
  refreshToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      const { refreshToken } = req.body;
      const result = await this.userService.refreshToken(refreshToken);
      this.sendSuccess(res, result, 'Token refreshed successfully');
    });
  };

  /**
   * POST /api/users/change-password
   * Change password
   */
  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        throw new Error('Unauthorized');
      }
      const dto: ChangePasswordDTO = req.body;
      const result = await this.userService.changePassword(req.user.id, dto);
      this.sendSuccess(res, result, result.message);
    });
  };

  /**
   * GET /api/users/me
   * Get current user profile
   */
  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        throw new Error('Unauthorized');
      }
      const user = await this.userService.getProfile(req.user.id);
      this.sendSuccess(res, user, 'Profile retrieved successfully');
    });
  };

  /**
   * PUT /api/users/me
   * Update current user profile
   */
  updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        throw new Error('Unauthorized');
      }
      const dto: UpdateUserDTO = req.body;
      const user = await this.userService.updateProfile(req.user.id, dto);
      this.sendSuccess(res, user, 'Profile updated successfully');
    });
  };

  /**
   * GET /api/users
   * Get all users (Admin only)
   */
  getAllUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new Error('Forbidden: Admin access required');
      }

      const query: UserListQueryDTO = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        role: req.query.role as UserRole,
        status: req.query.status as any,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await this.userService.getAllUsers(query);
      this.sendPaginated(res, result.data, result.total, result.page, result.limit, 'Users retrieved successfully');
    });
  };

  /**
   * GET /api/users/statistics
   * Get user statistics (Admin only)
   */
  getStatistics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new Error('Forbidden: Admin access required');
      }

      const stats = await this.userService.getStatistics();
      this.sendSuccess(res, stats, 'Statistics retrieved successfully');
    });
  };

  /**
   * POST /api/users/:id/suspend
   * Suspend user (Admin only)
   */
  suspendUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new Error('Forbidden: Admin access required');
      }

      const { id } = req.params;
      const result = await this.userService.suspendUser(id, req.user.id);
      this.sendSuccess(res, result, result.message);
    });
  };

  /**
   * POST /api/users/:id/activate
   * Activate user (Admin only)
   */
  activateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new Error('Forbidden: Admin access required');
      }

      const { id } = req.params;
      const result = await this.userService.activateUser(id);
      this.sendSuccess(res, result, result.message);
    });
  };

  /**
   * DELETE /api/users/:id
   * Delete user (Admin only)
   */
  deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, async () => {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new Error('Forbidden: Admin access required');
      }

      const { id } = req.params;
      const result = await this.userService.deleteUser(id, req.user.id);
      this.sendSuccess(res, result, result.message);
    });
  };
}
