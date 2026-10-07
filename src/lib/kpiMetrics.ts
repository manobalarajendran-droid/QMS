import { useMemo } from 'react';
import { useNCRStore } from '../store/useNCRStore';
import { useDMLStore } from '../store/useDMLStore';
import { useTUVStore } from '../store/useTUVStore';
import { useObjectivesStore } from '../store/useObjectivesStore';
import { useAuditProgrammeStore } from '../store/useAuditProgrammeStore';
import { useCSIStore } from '../store/useCSIStore';
import { useChangeRequestStore } from '../store/useChangeRequestStore';
import { useTaskStore } from '../store/useTaskStore';
import { useClientIntakeStore } from '../store/useClientIntakeStore';

/**
 * Where the numbers on a KPI card come from.
 *
 * The KPI screens used to ask a server on localhost for two things: the list
 * of what can be measured, and the measured values themselves. That server is
 * not part of the deployed app, so every card was empty. Both jobs are done
 * here instead, straight off the records the app already holds - which also
 * means a card updates the moment somebody edits a record, with no refresh.
 *
 * Adding a new measure is adding a line to SOURCES below. Nothing else needs
 * to change: the builder reads its choices from the same place.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export interface KPIFilters {
  projectId?: string;
  dateRange?: { from?: string; to?: string };
}

export interface KPIWidgetSpec {
  type: string;
  title: string;
  dataSource: string;
  metric: string;
  groupBy?: string | null;
  filters?: KPIFilters | null;
  size: string;
}

export interface KPIWidgetData {
  labels: string[];
  values: number[];
  total: number;
}

/** One measurable number. No `value` means "how many records". */
interface MetricDef {
  /** Only count records that pass this test. */
  only?: (r: Row) => boolean;
  /** The number to take off each record, when counting is not what is wanted. */
  value?: (r: Row) => number;
  /** Take the average of `value` instead of the sum. */
  average?: boolean;
}

interface SourceDef {
  /** The date a record belongs to, used by the date filter. */
  date: (r: Row) => string;
  /** The project a record belongs to, if it has one. */
  project?: (r: Row) => string;
  metrics: Record<string, MetricDef>;
  groupBy: Record<string, (r: Row) => string>;
}

const text = (v: unknown): string => String(v ?? '').trim();
const label = (v: unknown): string => text(v) || 'Not set';
const monthOf = (v: unknown): string => text(v).slice(0, 7) || 'Not set';
const today = (): string => new Date().toISOString().slice(0, 10);

/** A date that has already passed. */
const pastDue = (due: unknown): boolean => {
  const d = text(due).slice(0, 10);
  return d !== '' && d < today();
};

const daysBetween = (from: unknown, to: unknown): number => {
  const a = new Date(text(from));
  const b = new Date(text(to));
  const diff = (b.getTime() - a.getTime()) / 86400000;
  return Number.isFinite(diff) && diff >= 0 ? diff : NaN;
};

const isOneOf = (v: unknown, list: string[]): boolean => list.includes(text(v).toLowerCase());

const NCR_CLOSED = ['closed'];
const TUV_CLOSED = ['closed', 'verified'];
const DOC_CURRENT = ['active', 'approved', 'published'];
const CC_CLOSED = ['closed'];
const INTAKE_CLOSED = ['closed'];

const SOURCES: Record<string, SourceDef> = {
  deviations: {
    date: (r) => text(r.dt) || text(r.createdAt),
    project: (r) => text(r.project),
    metrics: {
      total: {},
      open: { only: (r) => !isOneOf(r.status, NCR_CLOSED) },
      closed: { only: (r) => isOneOf(r.status, NCR_CLOSED) },
      overdue: { only: (r) => !isOneOf(r.status, NCR_CLOSED) && pastDue(r.corrTargetDate) },
      average_days_to_close: {
        average: true,
        only: (r) => isOneOf(r.status, NCR_CLOSED),
        value: (r) => daysBetween(r.dt, r.corrCompletionDate || r.verifiedDate || r.updatedAt),
      },
    },
    groupBy: {
      status: (r) => label(r.status),
      classification: (r) => label(r.classification),
      department: (r) => label(r.auditeeDept || r.assignedDept),
      root_cause: (r) => label(r.rcaCat),
      raised_by: (r) => label(r.raisedBy),
      month: (r) => monthOf(r.dt || r.createdAt),
    },
  },

  documents: {
    date: (r) => text(r.reviewDate) || text(r.createdAt),
    metrics: {
      total: {},
      current: { only: (r) => isOneOf(r.status, DOC_CURRENT) },
      in_draft_or_review: { only: (r) => !isOneOf(r.status, [...DOC_CURRENT, 'obsolete']) },
      review_overdue: { only: (r) => !isOneOf(r.status, ['obsolete']) && pastDue(r.reviewDate) },
    },
    groupBy: {
      status: (r) => label(r.status),
      department: (r) => label(r.dept),
      level: (r) => label(r.hierarchyLevel),
      owner: (r) => label(r.assignedTo),
    },
  },

  audit_findings: {
    date: (r) => text(r.due) || text(r.createdAt),
    metrics: {
      total: {},
      open: { only: (r) => !isOneOf(r.status, TUV_CLOSED) },
      closed: { only: (r) => isOneOf(r.status, TUV_CLOSED) },
      overdue: { only: (r) => !isOneOf(r.status, TUV_CLOSED) && pastDue(r.due) },
    },
    groupBy: {
      status: (r) => label(r.status),
      clause: (r) => label(r.cl),
      owner: (r) => label(r.owner),
      department: (r) => label(r.assignedDept),
    },
  },

  objectives: {
    date: (r) => text(r.deadline) || text(r.createdAt),
    metrics: {
      total: {},
      achieved: { only: (r) => isOneOf(r.status, ['achieved', 'completed']) },
      not_achieved: { only: (r) => isOneOf(r.status, ['not achieved', 'delayed']) },
      overdue: {
        only: (r) => !isOneOf(r.status, ['achieved', 'completed']) && pastDue(r.deadline),
      },
      average_progress: { average: true, value: (r) => Number(r.pct) },
    },
    groupBy: {
      status: (r) => label(r.status),
      department: (r) => label(r.dept),
      year: (r) => label(r.yr),
      owner: (r) => label(r.owner),
    },
  },


  internal_audits: {
    date: (r) => text(r.dt) || text(r.createdAt),
    metrics: {
      total: {},
      completed: { only: (r) => isOneOf(r.status, ['completed', 'report issued']) },
      planned: { only: (r) => isOneOf(r.status, ['planned']) },
      findings_raised: { value: (r) => Number(r.nc) || 0 },
      observations_raised: { value: (r) => Number(r.obs) || 0 },
    },
    groupBy: {
      status: (r) => label(r.status),
      department: (r) => label(r.dep),
      auditor: (r) => label(r.aud),
      month: (r) => monthOf(r.dt || r.createdAt),
    },
  },


  customer_satisfaction: {
    date: (r) => text(r.surveyDate) || text(r.dt) || text(r.createdAt),
    project: (r) => text(r.projectName) || text(r.proj) || text(r.projCode),
    metrics: {
      total: {},
      average_score: { average: true, value: (r) => Number(r.totalScore ?? r.score) },
      follow_up_open: { only: (r) => !isOneOf(r.status, ['closed']) },
    },
    groupBy: {
      rating: (r) => label(r.rating),
      client: (r) => label(r.clientName || r.cl),
      year: (r) => label(r.yr),
      month: (r) => monthOf(r.surveyDate || r.dt),
    },
  },

  change_requests: {
    date: (r) => text(r.createdAt),
    metrics: {
      total: {},
      open: { only: (r) => !isOneOf(r.status, CC_CLOSED) },
      closed: { only: (r) => isOneOf(r.status, CC_CLOSED) },
      effectiveness_verified: { only: (r) => r.effectivenessVerified === true },
      overdue_actions: {
        value: (r) =>
          (Array.isArray(r.tasks) ? r.tasks : []).filter(
            (task: Row) => task.status !== 'completed' && pastDue(task.dueDate),
          ).length,
      },
    },
    groupBy: {
      status: (r) => label(r.status),
      type: (r) => label(r.type),
      risk: (r) => label(r.riskLevel),
      raised_by: (r) => label(r.raisedBy),
    },
  },

  tasks: {
    date: (r) => text(r.dueDate) || text(r.createdAt),
    metrics: {
      total: {},
      open: { only: (r) => r.status !== 'completed' },
      completed: { only: (r) => r.status === 'completed' },
      overdue: { only: (r) => r.status !== 'completed' && pastDue(r.dueDate) },
    },
    groupBy: {
      status: (r) => label(r.status),
      priority: (r) => label(r.priority),
      assignee: (r) => label(r.assigneeName),
      raised_from: (r) => label(r.entityType),
    },
  },

  /**
   * Everything a client sends in: complaints, emergencies and inquiries.
   *
   * This used to be a separate `complaints` source reading a separate store.
   * That store was empty and the screen behind it duplicated Client Intake, so
   * both were removed and this reads the records people actually keep. The
   * response-time measures are new here - the old source had no clock at all.
   */
  client_intake: {
    date: (r) => text(r.timeLogged) || text(r.createdAt),
    metrics: {
      total: {},
      open: { only: (r) => !isOneOf(r.status, INTAKE_CLOSED) },
      closed: { only: (r) => isOneOf(r.status, INTAKE_CLOSED) },
      complaints: { only: (r) => text(r.intakeType) === 'Complaint' },
      emergencies: { only: (r) => text(r.intakeType) === 'Emergency' },
      overdue: { only: (r) => !isOneOf(r.status, INTAKE_CLOSED) && pastDue(r.dueDate) },
      average_days_to_close: {
        average: true,
        only: (r) => isOneOf(r.status, INTAKE_CLOSED),
        value: (r) => daysBetween(r.timeLogged, r.closedAt || r.updatedAt),
      },
      average_reaction_minutes: {
        average: true,
        only: (r) => Boolean(r.timeAcknowledged),
        value: (r) =>
          (new Date(r.timeAcknowledged).getTime() - new Date(r.timeLogged).getTime()) / 60000,
      },
    },
    groupBy: {
      status: (r) => label(r.status),
      type: (r) => label(r.intakeType),
      severity: (r) => label(r.severity),
      department: (r) => label(r.routedToDept),
      raised_by: (r) => label(r.reporterType),
      assignee: (r) => label(r.assignedTo),
      month: (r) => monthOf(r.timeLogged || r.createdAt),
    },
  },
};

/** What the builder offers, worked out from the table above. */
export const KPI_CATALOG = Object.entries(SOURCES).map(([dataSource, def]) => ({
  dataSource,
  metrics: Object.keys(def.metrics),
  groupByOptions: Object.keys(def.groupBy),
}));

export type MetricSources = Record<string, Row[]>;

/**
 * Every list a KPI card can be built on. This is a hook so that a card
 * redraws when somebody changes a record anywhere else in the app.
 */
export function useMetricSources(): MetricSources {
  const deviations = useNCRStore((s) => s.records);
  const documents = useDMLStore((s) => s.records);
  const auditFindings = useTUVStore((s) => s.records);
  const objectives = useObjectivesStore((s) => s.records);
  const internalAudits = useAuditProgrammeStore((s) => s.records);
  const csi = useCSIStore((s) => s.records);
  const changeRequests = useChangeRequestStore((s) => s.records);
  const tasks = useTaskStore((s) => s.records);
  const clientIntake = useClientIntakeStore((s) => s.records);

  return useMemo(
    () => ({
      deviations,
      documents,
      audit_findings: auditFindings,
      objectives,
      internal_audits: internalAudits,
      customer_satisfaction: csi,
      change_requests: changeRequests,
      tasks,
      client_intake: clientIntake,
    }),
    [
      deviations, documents, auditFindings, objectives,
      internalAudits, csi, changeRequests, tasks, clientIntake,
    ],
  );
}

const round = (n: number): number => Math.round(n * 10) / 10;

function measure(rows: Row[], def: MetricDef): number {
  const kept = def.only ? rows.filter(def.only) : rows;
  if (!def.value) return kept.length;

  const numbers = kept.map(def.value).filter((n) => Number.isFinite(n));
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return round(def.average ? sum / numbers.length : sum);
}

const EMPTY: KPIWidgetData = { labels: [], values: [], total: 0 };

/** Turn one card's settings into the numbers it should show. */
export function computeWidgetData(widget: KPIWidgetSpec, sources: MetricSources): KPIWidgetData {
  const source = SOURCES[widget.dataSource];
  if (!source) return EMPTY;

  const metric = source.metrics[widget.metric];
  if (!metric) return EMPTY;

  let rows = sources[widget.dataSource] || [];

  const from = widget.filters?.dateRange?.from;
  const to = widget.filters?.dateRange?.to;
  if (from || to) {
    rows = rows.filter((r) => {
      const d = source.date(r).slice(0, 10);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }

  const project = text(widget.filters?.projectId).toLowerCase();
  if (project && source.project) {
    const pick = source.project;
    rows = rows.filter((r) => pick(r).toLowerCase().includes(project));
  }

  const total = measure(rows, metric);

  const groupKey = widget.groupBy || '';
  const group = groupKey ? source.groupBy[groupKey] : undefined;
  if (!group) {
    return { labels: [widget.metric.replace(/_/g, ' ')], values: [total], total };
  }

  const buckets = new Map<string, Row[]>();
  for (const r of rows) {
    const key = group(r);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(r);
    else buckets.set(key, [r]);
  }

  let entries = [...buckets.entries()].map(
    ([name, bucketRows]) => [name, measure(bucketRows, metric)] as [string, number],
  );

  // Months and years read left to right in date order. Everything else reads
  // biggest first, and only as many bars as fit on a card.
  entries = groupKey.includes('month') || groupKey.includes('year')
    ? entries.sort(([a], [b]) => a.localeCompare(b))
    : entries.sort(([, a], [, b]) => b - a).slice(0, 12);

  return {
    labels: entries.map(([name]) => name),
    values: entries.map(([, value]) => value),
    total,
  };
}
