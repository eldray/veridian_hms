// src/modules/insuranceClaim/helpers/claimSubmission.ts
//
// InsuranceClaim has no submission date column. A submission is recorded as an
// InsuranceClaimTrackingEvent with eventType 'submission' (see recordTrackingEvent in
// InsuranceClaimController), and a claim can be re-submitted, so the date a caller
// wants is the one on the latest such event.
//
// Selecting `submissionDate` directly on InsuranceClaim makes Prisma reject the whole
// query ("Unknown field `submissionDate` for select statement on model `InsuranceClaim`").
// Select `latestSubmissionEvent` inside the claim instead, then run the result through
// `withSubmissionDate` so callers still receive a plain `submissionDate` on each claim.

/** Nested select that fetches the most recent submission event of a claim. */
export const latestSubmissionEvent = {
  trackingEvents: {
    where: { eventType: 'submission' },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { submissionDate: true, createdAt: true },
  },
} as const;

/** A claim row with `trackingEvents` folded into a single `submissionDate`. */
export const withSubmissionDate = <T extends { trackingEvents?: Array<{ submissionDate: Date | null; createdAt: Date }> }>(
  claim: T,
): Omit<T, 'trackingEvents'> & { submissionDate: Date | null } => {
  const { trackingEvents, ...rest } = claim;
  const latest = trackingEvents?.[0];
  return { ...rest, submissionDate: latest ? (latest.submissionDate ?? latest.createdAt) : null };
};