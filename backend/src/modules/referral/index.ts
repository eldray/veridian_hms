// modules/referral/index.ts
export { ReferralController } from './ReferralController';
export { ReferralService } from './ReferralService';
export { ReferralRepository } from './ReferralRepository';
export { createReferralRoutes, default as ReferralRoutes } from './ReferralRoutes';

export type { 
  CreateOutgoingReferralDTO,
  CreateIncomingReferralDTO,
  UpdateReferralStatusDTO,
  ReferralFilters,
  ReferralResponse,
  ReferralStats
} from './ReferralTypes';