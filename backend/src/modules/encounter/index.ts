// modules/encounter/index.ts
export { EncounterController } from './EncounterController';
export { EncounterService } from './EncounterService';
export { EncounterRepository } from './EncounterRepository';
export * from './EncounterTypes';

import encounterRoutes from './EncounterRoutes';
export { encounterRoutes };
