/**
 * User Module Index
 * Central export and dependency injection for the User module
 */

import { PrismaClient } from '@prisma/client';
import { UserRepository } from './UserRepository';
import { UserService } from './UserService';
import { UserController } from './UserController';
import { UserRoutes } from './UserRoutes';

// Export types
export * from './UserTypes';

// Export classes
export { UserRepository, UserService, UserController, UserRoutes };

/**
 * Initialize User Module with dependencies
 */
export function initializeUserModule(prisma: PrismaClient) {
  const userRepository = new UserRepository(prisma);
  const userService = new UserService(userRepository);
  const userController = new UserController(userService);
  const userRoutes = new UserRoutes(userController);

  return {
    repository: userRepository,
    service: userService,
    controller: userController,
    routes: userRoutes,
  };
}
