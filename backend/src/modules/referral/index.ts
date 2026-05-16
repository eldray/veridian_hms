// backend/src/modules/referral/index.ts

export { ReferralTypes, CreateOutgoingReferralDTO, CreateIncomingReferralDTO, UpdateReferralStatusDTO, ReferralFilters, ReferralResponse } from './ReferralTypes';
export { ReferralRepository } from './ReferralRepository';
export { ReferralService } from './ReferralService';
export { ReferralController } from './ReferralController';
export { default as ReferralRoutes } from './ReferralRoutes';
