// src/components/claims/ClaimItUI.tsx
//
// The parts of the screen that show what CLAIM-it said. Both the single-claim page and the batching
// page render the same outcomes, so the wording and colours live here once.
import React from 'react';
import { Hint } from './ClaimUI';
import type {
  ClaimItBlockedClaim,
  ClaimItIssue,
  ClaimItOutcome,
  ClaimItStatus,
  ClaimItSubmissionRow,
} from '../../api';

const OUTCOME_STYLE: Record<ClaimItOutcome, { label: string; color: string; background: string }> = {
  passed: { label: 'PASSED', color: '#1b5e20', background: '#c8e6c9' },
  warned: { label: 'ACCEPTED, WITH WARNINGS', color: '#8d6e00', background: '#fff3cd' },
  error: { label: 'REJECTED', color: '#b71c1c', background: '#ffcdd2' },
  unknown: { label: 'UNCONFIRMED', color: '#4527a0', background: '#e8eaf6' },
};

export const ClaimItOutcomeBadge: React.FC<{ outcome: ClaimItOutcome }> = ({ outcome }) => {
  const style = OUTCOME_STYLE[outcome] ?? OUTCOME_STYLE.unknown;
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap" style={{ color: style.color, background: style.background }}>
      {style.label}
    </span>
  );
};

/** CLAIM-it's own code / info / help triple — the code is what gets quoted to the claims office. */
export const ClaimItIssues: React.FC<{ issues: ClaimItIssue[] }> = ({ issues }) => {
  if (!issues?.length) return null;
  return (
    <ul className="mt-1 space-y-1">
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${index}`} className="text-[12px] leading-snug">
          <span className={issue.level === 'warning' ? 'text-amber-700 font-medium' : 'text-red-700 font-medium'}>
            {issue.code ? `${issue.code}: ` : ''}
          </span>
          <span className="text-[var(--text-primary)]">{issue.info || issue.help || 'No detail returned.'}</span>
          {issue.help && issue.info ? <span className="text-[var(--text-secondary)]"> — {issue.help}</span> : null}
        </li>
      ))}
    </ul>
  );
};

const money = (value: string | null | undefined) => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : String(value);
};

const when = (value: string | Date | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

/** Every attempt for one claim, newest first. */
export const ClaimItSubmissionHistory: React.FC<{ submissions: ClaimItSubmissionRow[] }> = ({ submissions }) => {
  if (!submissions.length) {
    return <Hint>This claim has not been sent to CLAIM-it yet.</Hint>;
  }
  return (
    <ol className="space-y-3">
      {submissions.map((row) => (
        <li key={row.id} className="border border-[var(--border-color)] p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text-secondary)]">
            <ClaimItOutcomeBadge outcome={row.outcome} />
            <span>Attempt {row.attemptNo}</span>
            <span>{when(row.createdAt)}</span>
            {row.submittedBy ? <span>by {row.submittedBy}</span> : null}
            {row.payerCost != null ? <span>CLAIM-it cost: {money(row.payerCost)}</span> : null}
            {row.responseMs != null ? <span>{row.responseMs} ms</span> : null}
          </div>
          <ClaimItIssues issues={row.issues} />
          {row.reportSummary?.transportError ? (
            <p className="text-[12px] text-[var(--text-secondary)] mt-1">
              The request went out but no import report came back: {row.reportSummary.transportError}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
};

/** Claims the backend would not put on the wire, each with the field that stops it. */
export const ClaimItHeldBack: React.FC<{ held: ClaimItBlockedClaim[] }> = ({ held }) => {
  if (!held.length) return null;
  return (
    <div className="mt-3">
      <p className="text-[12px] font-medium text-amber-800">
        Not sent — {held.length} {held.length === 1 ? 'claim is' : 'claims are'} not ready:
      </p>
      <ul className="mt-1 space-y-2">
        {held.map((claim) => (
          <li key={claim.claimId} className="text-[12px] border border-amber-200 bg-amber-50 p-2">
            <span className="font-medium text-amber-900">{claim.claimNumber}</span>
            <ul className="mt-0.5 list-disc pl-5 text-[var(--text-secondary)]">
              {claim.reasons.map((reason, index) => (
                <li key={`${reason.field ?? 'claim'}-${index}`}>
                  {reason.field ? <span className="font-medium">{reason.field}: </span> : null}
                  {reason.message ?? 'Not ready to send.'}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** The only note a screen shows when sending cannot happen, so the operator knows what to change. */
export const ClaimItStatusNote: React.FC<{ status: ClaimItStatus | null }> = ({ status }) => {
  if (!status) return null;
  if (status.configured && status.enabled) return null;
  return <Hint>{status.message}</Hint>;
};

/** One line per claim answered, straight out of a batch import report. */
export const ClaimItBatchOutcomes: React.FC<{
  results: Array<{ claimNumber: string; outcome: ClaimItOutcome; errors: ClaimItIssue[]; warnings: ClaimItIssue[]; cost: string | null; message: string }>;
}> = ({ results }) => (
  <ul className="mt-3 space-y-2">
    {results.map((row) => (
      <li key={row.claimNumber} className="border border-[var(--border-color)] p-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          <ClaimItOutcomeBadge outcome={row.outcome} />
          <span className="font-medium text-[var(--text-primary)]">{row.claimNumber}</span>
          {row.cost != null ? <span className="text-[var(--text-secondary)]">CLAIM-it cost {money(row.cost)}</span> : null}
        </div>
        <ClaimItIssues issues={[...row.errors, ...row.warnings]} />
      </li>
    ))}
  </ul>
);
