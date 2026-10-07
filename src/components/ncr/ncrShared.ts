import type { NCRRecord, NCRRecordStatus } from '../../store/useNCRStore';
import { PTA_DEPARTMENTS } from '../../types';

/** The NCR stages in order, as stored on the record. */
export const STATUSES: NCRRecordStatus[] = [
  'Open',
  'Investigation',
  'RootCause',
  'CAPA_Planned',
  'CAPA_InProgress',
  'Verification',
  'Closed',
];

/** Plain names for each stage, as shown to people. */
export const STATUS_LABELS: Record<NCRRecordStatus, string> = {
  Open: 'Raised',
  'Under Investigation': 'Investigation',
  'Corrective Action Pending': 'Action plan',
  Investigation: 'Investigation',
  RootCause: 'Root cause',
  CAPA_Planned: 'Action plan',
  CAPA_InProgress: 'Doing actions',
  Verification: 'Check it worked',
  Closed: 'Closed',
};

/** What to do in each stage, shown at the top of the stage card. */
export const STAGE_HINTS: Record<NCRRecordStatus, string> = {
  Open: 'Check the finding is clear and has an owner, then start the investigation.',
  'Under Investigation': 'Find out what happened and how far it spread.',
  'Corrective Action Pending': 'Plan the actions that will stop it happening again.',
  Investigation: 'Find out what happened and how far it spread. Record a quick fix (containment) if needed.',
  RootCause: 'Ask "why" until you reach the real cause. Save your notes before moving on.',
  CAPA_Planned: 'Plan the correction, the corrective action and the preventive action, each with an owner and a date.',
  CAPA_InProgress: 'Do the actions and fill in the date each one was finished.',
  Verification: 'A QA manager checks the actions worked, then closes the NCR or sends it back.',
  Closed: 'This NCR is closed. Reopen it only if the problem came back.',
};

export const CLASSIFICATIONS = ['NCR', 'Potential NCR', 'Observation'] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];
const DEFAULT_CLASSIFICATION: Classification = 'NCR';

export const SLA_DAYS: Record<Classification, number> = {
  NCR: 14,
  'Potential NCR': 2,
  Observation: 30,
};

export const CLASSIFICATION_STYLES: Record<Classification, string> = {
  NCR: 'bg-danger-subtle text-danger-text border-danger/25',
  'Potential NCR': 'bg-warning-subtle text-warning-text border-warning/30',
  Observation: 'bg-accent-subtle text-accent-text border-accent/25',
};

export const OBSERVATION_SUBTYPES = ['Potential for Weakness', 'Good Practice'];
export const RCA_CATEGORIES = ['Human Error', 'Process Gap', 'Management System Failure', 'Other'];

export const inputCls =
  'w-full rounded-lg border border-border bg-surface-secondary p-2 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent';

/**
 * Departments for NCR forms. P&E and Contracts & Planning are one department,
 * and IED is the QA/QC department, so each shows once.
 */
export const NCR_DEPARTMENTS: string[] = PTA_DEPARTMENTS.filter((d) => d !== 'P&E').map((d) =>
  d === 'Contracts & Planning' ? 'Contracts & Planning (P&E)' : d,
);

/** Old records may say "P&E" or "Contracts & Planning": treat both as one. */
export function normaliseDept(value: string | undefined): string {
  if (!value) return '';
  if (value === 'P&E' || value === 'Contracts & Planning') return 'Contracts & Planning (P&E)';
  return value;
}

export function classificationOf(record: NCRRecord): Classification {
  const value = record.classification;
  return CLASSIFICATIONS.includes(value as Classification) ? (value as Classification) : DEFAULT_CLASSIFICATION;
}

export function getNextStatus(current: NCRRecordStatus): NCRRecordStatus | null {
  const idx = STATUSES.indexOf(current);
  if (idx === -1 || idx === STATUSES.length - 1) return null;
  return STATUSES[idx + 1];
}

export function getPrevStatus(current: NCRRecordStatus): NCRRecordStatus | null {
  const idx = STATUSES.indexOf(current);
  if (idx <= 0) return null;
  return STATUSES[idx - 1];
}

/** Map old status names onto the seven stages. */
export function stageIndex(status: NCRRecordStatus): number {
  if (status === 'Under Investigation') return 1;
  if (status === 'Corrective Action Pending') return 3;
  return Math.max(0, STATUSES.indexOf(status));
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SOON_DAYS = 3;

export function calculateSLA(record: NCRRecord) {
  if (record.status === 'Closed') return null;
  let deadlineDate: Date;
  if (record.slaDeadline) deadlineDate = new Date(record.slaDeadline);
  else if (record.createdAt) deadlineDate = new Date(new Date(record.createdAt).getTime() + SLA_DAYS[classificationOf(record)] * DAY_MS);
  else return null;
  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / DAY_MS);
  const variant: 'green' | 'red' | 'amber' = daysLeft < 0 ? 'red' : daysLeft <= SOON_DAYS ? 'amber' : 'green';
  return { daysLeft, variant, deadlineDate };
}
