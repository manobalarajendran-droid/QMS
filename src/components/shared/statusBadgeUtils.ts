import type { RequirementStatus, TestStatus } from '../../types';

export type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray';

/* Borders are the badge's own text colour at low alpha, so the legacy
   requirement/test badges read as the same outline pill as everything else
   without needing a second set of tokens. */
export const REQ_COLORS: Record<RequirementStatus, string> = {
  Draft: 'bg-badge-draft-bg text-badge-draft-text border-badge-draft-text/25',
  Active: 'bg-badge-active-bg text-badge-active-text border-badge-active-text/25',
  Closed: 'bg-badge-closed-bg text-badge-closed-text border-badge-closed-text/25',
};

export const TEST_COLORS: Record<TestStatus, string> = {
  'Not Run': 'bg-badge-notrun-bg text-badge-notrun-text border-badge-notrun-text/25',
  Passed: 'bg-badge-passed-bg text-badge-passed-text border-badge-passed-text/25',
  Failed: 'bg-badge-failed-bg text-badge-failed-text border-badge-failed-text/25',
};

export function resolveStatusVariant(status?: string): BadgeVariant {
  const s = (status || '').toLowerCase().trim();

  // Green: Active, Closed, Achieved, Published, Implemented, Approved, Completed, Passed, Valid, Report Issued, Resolved
  if (['active', 'closed', 'achieved', 'completed', 'published', 'implemented', 'approved', 'passed', 'valid', 'report issued', 'resolved', 'released', 'submitted', 'qualified', 'covered'].includes(s)) {
    return 'green';
  }
  // Amber: In Progress, Under Review, Pending Review, Ongoing, Due Soon, Due, Conditional, Reviewed, CAPA Planned, Acknowledged, Pending Submission
  if ([
    'in progress', 'in_progress', 'under review', 'underreview', 'pending review', 'pending qa approval', 'review',
    'reviewed', 'capa_planned', 'capa_inprogress', 'capa planned', 'capa in progress', 'corrective action pending',
    'ongoing', 'due soon', 'due', 'conditional', 'acknowledged', 'pending submission', 'partial'
  ].includes(s)) {
    return 'amber';
  }
  // Red: Open, Overdue, Rejected, Not Achieved, Failed, Scrapped, Cancelled, Logged, Out of Service
  if (['open', 'overdue', 'rejected', 'not achieved', 'failed', 'scrapped', 'cancelled', 'logged', 'out of service', 'delayed', 'terminated', 'disqualified', 'missing'].includes(s)) {
    return 'red';
  }
  // Blue: Under Investigation, Root Cause, Investigation, Scheduled, Mobilized, Pending Evaluation, Under Evaluation
  if (['under investigation', 'investigation', 'investigating', 'rootcause', 'root cause analysis', 'scheduled', 'mobilized', 'pending evaluation', 'under evaluation'].includes(s)) {
    return 'blue';
  }
  // Gray: Draft, Not Started, Obsolete, Archived, Planned, Not Run
  return 'gray';
}

/**
 * Outline pills, not filled blocks. A register page shows dozens of these at
 * once; a solid fill turns the table into a colour field and buries the row
 * text. The border carries the state, the fill stays near-white.
 */
export const VARIANT_STYLES: Record<BadgeVariant, string> = {
  green: 'border-emerald-300 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-400',
  amber: 'border-amber-300 bg-amber-50/70 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-400',
  red:   'border-rose-300 bg-rose-50/70 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-400',
  blue:  'border-sky-300 bg-sky-50/70 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/30 dark:text-sky-400',
  gray:  'border-slate-300 bg-slate-50/70 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
};
