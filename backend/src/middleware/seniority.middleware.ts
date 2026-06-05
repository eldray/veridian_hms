// middleware/seniority.middleware.ts
// Re-export all seniority-related middleware for easy imports

export {
    requireMinSeniority,
    requireTraineeOrHigher,
    requireJuniorOrHigher,
    requireSeniorOrHigher,
    requirePrincipalOnly,
    requireRoleWithMinSeniority,
    requireSeniorDoctor,
    requireSeniorNurse,
    requireSeniorPharmacist,
    requirePrincipalDoctor,
    seniorityLevels
  } from './authMiddleware';