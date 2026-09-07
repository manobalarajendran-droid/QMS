import { useTranslation } from 'react-i18next';

import type { RequirementStatus, TestStatus } from '../../types';

export type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray';

export interface StatusBadgeProps {
  status?: string;
  variant?: BadgeVariant;
  className?: string;
  type?: 'requirement' | 'test'; // Backward compatibility
}

const REQ_COLORS: Record<RequirementStatus, string> = {
  Draft: 'bg-badge-draft-bg text-badge-draft-text',
  Active: 'bg-badge-active-bg text-badge-active-text',
  Closed: 'bg-badge-closed-bg text-badge-closed-text',
};

const TEST_COLORS: Record<TestStatus, string> = {
  'Not Run': 'bg-badge-notrun-bg text-badge-notrun-text',
  Passed: 'bg-badge-passed-bg text-badge-passed-text',
  Failed: 'bg-badge-failed-bg text-badge-failed-text',
};

export function resolveStatusVariant(status?: string): BadgeVariant {
  const s = (status || '').toLowerCase().trim();

  // Green: Active, Closed, Achieved, Published, Implemented, Approved, Completed, Passed, Valid, Report Issued
  if (['active', 'closed', 'achieved', 'completed', 'published', 'implemented', 'approved', 'passed', 'valid', 'report issued'].includes(s)) {
    return 'green';
  }
  // Amber: In Progress, Under Review, Pending Review, Ongoing, Due Soon, Due, Conditional, Reviewed, CAPA Planned, Acknowledged, Pending Submission
  if ([
    'in progress', 'under review', 'underreview', 'pending review', 'pending qa approval',
    'reviewed', 'capa_planned', 'capa_inprogress', 'corrective action pending',
    'ongoing', 'due soon', 'due', 'conditional', 'acknowledged', 'pending submission'
  ].includes(s)) {
    return 'amber';
  }
  // Red: Open, Overdue, Rejected, Not Achieved, Failed, Scrapped, Cancelled, Logged, Out of Service
  if (['open', 'overdue', 'rejected', 'not achieved', 'failed', 'scrapped', 'cancelled', 'logged', 'out of service'].includes(s)) {
    return 'red';
  }
  // Blue: Under Investigation, Root Cause, Investigation, Scheduled, Mobilized, Pending Evaluation, Under Evaluation
  if (['under investigation', 'investigation', 'rootcause', 'scheduled', 'mobilized', 'pending evaluation', 'under evaluation'].includes(s)) {
    return 'blue';
  }
  // Gray: Draft, Not Started, Obsolete, Archived, Planned, Not Run
  return 'gray';
}

export const VARIANT_STYLES: Record<BadgeVariant, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
  red: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
  blue: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60',
  gray: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export function StatusBadge({ status, variant, className = '', type }: StatusBadgeProps) {
  const { t } = useTranslation();

  // Backward compatibility with legacy tests and requirement/test views
  if (type) {
    const colors = type === 'requirement'
      ? REQ_COLORS[status as RequirementStatus]
      : TEST_COLORS[status as TestStatus];
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colors || ''} ${className}`}>
        {t(`statuses.${status}`)}
      </span>
    );
  }

  const activeVariant = variant || resolveStatusVariant(status);
  const colorClasses = VARIANT_STYLES[activeVariant];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses} ${className}`}>
      {status || '—'}
    </span>
  );
}

