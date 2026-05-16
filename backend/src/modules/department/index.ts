/**
 * Department Module
 * Exports all department module components
 */

export { DepartmentController } from './DepartmentController';
export { DepartmentService } from './DepartmentService';
export { DepartmentRepository } from './DepartmentRepository';
export { createDepartmentRoutes } from './DepartmentRoutes';

export type {
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
  DepartmentFilters,
  DepartmentWithRelations,
  DepartmentStats,
  DepartmentResponse
} from './DepartmentTypes';
