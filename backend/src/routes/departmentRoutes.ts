import express from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentUsers,
  assignUserToDepartment,
  removeUserFromDepartment,
  getDepartmentStats,
  bulkUpdateDepartments
} from '../controllers/departmentController';
import { protect, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/departments - Get all departments
router.get('/', getDepartments);

// GET /api/departments/:id - Get department by ID
router.get('/:id', getDepartmentById);

// GET /api/departments/:id/users - Get department users
router.get('/:id/users', getDepartmentUsers);

// GET /api/departments/:id/stats - Get department statistics
router.get('/:id/stats', getDepartmentStats);

// POST /api/departments - Create new department
router.post('/', requireAdmin, createDepartment);

// POST /api/departments/bulk-update - Bulk update departments
router.post('/bulk-update', requireAdmin, bulkUpdateDepartments);

// PUT /api/departments/:id - Update department
router.put('/:id', requireAdmin, updateDepartment);

// POST /api/departments/:id/assign-user - Assign user to department
router.post('/:id/assign-user', requireAdmin, assignUserToDepartment);

// POST /api/departments/:id/remove-user - Remove user from department
router.post('/:id/remove-user', requireAdmin, removeUserFromDepartment);

// DELETE /api/departments/:id - Delete department
router.delete('/:id', requireAdmin, deleteDepartment);

export default router;