/**
 * Staff Module Index
 * Central export and dependency injection for the Staff module
 */

import { PrismaClient } from '@prisma/client';
import { StaffRepository } from './StaffRepository';
import { StaffService } from './StaffService';
import { StaffController } from './StaffController';
import { StaffRoutes } from './StaffRoutes';
import { UserService } from '../user/UserService';

// Export types
export * from './StaffTypes';

// Export classes
export { StaffRepository, StaffService, StaffController, StaffRoutes };

/**
 * Initialize Staff Module with dependencies
 */
export function initializeStaffModule(prisma: PrismaClient, userService: UserService) {
  const staffRepository = new StaffRepository(prisma);
  const staffService = new StaffService(staffRepository, userService);
  const staffController = new StaffController(staffService);
  const staffRoutes = new StaffRoutes(staffController);

  return {
    repository: staffRepository,
    service: staffService,
    controller: staffController,
    routes: staffRoutes,
  };
}
