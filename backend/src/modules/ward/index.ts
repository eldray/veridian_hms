/**
 * Ward Module
 * Exports all ward module components
 */

export { WardController } from './WardController';
export { WardService } from './WardService';
export { WardRepository } from './WardRepository';
export { createWardRoutes } from './WardRoutes';

export type { 
  CreateWardDTO, 
  UpdateWardDTO, 
  WardFilters, 
  WardWithAvailability,
  AvailableBedResponse,
  WardStats
} from './WardTypes';
