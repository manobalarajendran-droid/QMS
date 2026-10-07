import type { ReactNode } from 'react';
import {
  Sun, Inbox, AlertTriangle, ClipboardCheck, CheckSquare, MessageSquareHeart,
  FileText, GitBranch, Landmark, Target, ShieldCheck, Users, ListTodo,
  Workflow, Map, ScrollText, Upload, FolderOpen, CalendarCheck,
} from 'lucide-react';
import type { ViewTab } from '../types';

/**
 * The one menu definition. The sidebar, the phone menu and Ctrl+K search all
 * read it, so a screen is named the same way everywhere.
 */

export interface NavItem {
  /** The screen opened when the item is clicked. */
  id: ViewTab;
  label: string;
  icon: ReactNode;
  /** Every screen that lights this item up (merged screens have two). */
  screens: ViewTab[];
  /** Words that also find this item in search. */
  keywords?: string;
  adminOnly?: boolean;
  /** Full admins only (QA manager may not open it). */
  onlyAdmin?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  /** Folded shut until opened. */
  startClosed?: boolean;
}

const ic = 'h-4 w-4 shrink-0';

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'my_work',
    label: 'My work',
    items: [
      { id: 'today', label: 'Today', icon: <Sun className={ic} aria-hidden="true" />, screens: ['today'], keywords: 'home inbox overdue due' },
      { id: 'approvals', label: 'Approvals', icon: <Inbox className={ic} aria-hidden="true" />, screens: ['approvals'], keywords: 'approve review sign waiting' },
    ],
  },
  {
    id: 'improve',
    label: 'Improve',
    items: [
      { id: 'deviations', label: 'NCR / CAPA', icon: <AlertTriangle className={ic} aria-hidden="true" />, screens: ['deviations'], keywords: 'nonconformance corrective preventive' },
      { id: 'audit_records', label: 'Audits', icon: <ClipboardCheck className={ic} aria-hidden="true" />, screens: ['audit_records'], keywords: 'internal audit programme' },
      { id: 'tuv_tracker', label: 'TUV findings', icon: <CheckSquare className={ic} aria-hidden="true" />, screens: ['tuv_tracker'], keywords: 'tuv certification external' },
      { id: 'voc', label: 'Customer feedback', icon: <MessageSquareHeart className={ic} aria-hidden="true" />, screens: ['voc', 'pms'], keywords: 'client intake complaint csi survey satisfaction' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    items: [
      { id: 'dml_manager', label: 'Document Master List', icon: <FileText className={ic} aria-hidden="true" />, screens: ['dml_manager'], keywords: 'dml procedure form register' },
      { id: 'dcr_workflow', label: 'Document changes', icon: <GitBranch className={ic} aria-hidden="true" />, screens: ['dcr_workflow', 'change_control'], keywords: 'dcr change request revision' },
      { id: 'w_files', label: 'QMS files (W:)', icon: <FolderOpen className={ic} aria-hidden="true" />, screens: ['w_files'], keywords: 'repository folder procedure form manual pdf w drive files' },
      { id: 'annual_set', label: 'Yearly QMS set', icon: <CalendarCheck className={ic} aria-hidden="true" />, screens: ['annual_set'], keywords: 'objectives issue log risk register opportunity annual yearly' },
    ],
  },
  {
    id: 'leadership',
    label: 'Leadership',
    items: [
      { id: 'mrm_manager', label: 'Management review', icon: <Landmark className={ic} aria-hidden="true" />, screens: ['mrm_manager'], keywords: 'mrm meeting actions' },
      { id: 'objectives', label: 'Objectives & KPIs', icon: <Target className={ic} aria-hidden="true" />, screens: ['objectives', 'kpi'], keywords: 'kpi targets goals' },
      { id: 'mr_dashboard', label: 'MR overview', icon: <ShieldCheck className={ic} aria-hidden="true" />, screens: ['mr_dashboard'], keywords: 'dashboard summary management representative' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { id: 'users', label: 'Users', icon: <Users className={ic} aria-hidden="true" />, screens: ['users'], keywords: 'people accounts roles', adminOnly: true, onlyAdmin: true },
    ],
  },
  {
    id: 'more',
    label: 'More tools',
    startClosed: true,
    items: [
      { id: 'tasks', label: 'Tasks', icon: <ListTodo className={ic} aria-hidden="true" />, screens: ['tasks'], keywords: 'to do' },
      { id: 'workflows', label: 'Approval steps', icon: <Workflow className={ic} aria-hidden="true" />, screens: ['workflows'], keywords: 'workflow routing' },
      { id: 'compliance_map', label: 'ISO 9001 map', icon: <Map className={ic} aria-hidden="true" />, screens: ['compliance_map'], keywords: 'clause gap compliance' },
      { id: 'audit_trail', label: 'History log', icon: <ScrollText className={ic} aria-hidden="true" />, screens: ['audit_trail'], keywords: 'audit trail changes who', adminOnly: true },
      { id: 'import_v12', label: 'Data import', icon: <Upload className={ic} aria-hidden="true" />, screens: ['import_v12'], keywords: 'v12 excel upload', adminOnly: true },
    ],
  },
];

/** Title shown in the top bar for each screen. */
export const SCREEN_TITLES: Record<ViewTab, string> = {
  today: 'Today',
  approvals: 'Approvals',
  deviations: 'NCR / CAPA',
  audit_records: 'Audits',
  tuv_tracker: 'TUV findings',
  voc: 'Customer feedback',
  pms: 'Customer feedback',
  dml_manager: 'Document Master List',
  dcr_workflow: 'Document changes',
  w_files: 'QMS files (W:)',
  annual_set: 'Yearly QMS set',
  change_control: 'Document changes',
  mrm_manager: 'Management review',
  objectives: 'Objectives & KPIs',
  kpi: 'Objectives & KPIs',
  mr_dashboard: 'MR overview',
  users: 'Users',
  tasks: 'Tasks',
  workflows: 'Approval steps',
  compliance_map: 'ISO 9001 map',
  audit_trail: 'History log',
  import_v12: 'Data import',
};

/** Merged screens: the tab strip shown above each half. */
export const SUB_TABS: Partial<Record<ViewTab, { id: ViewTab; label: string }[]>> = (() => {
  const docs = [
    { id: 'dcr_workflow' as ViewTab, label: 'Document change requests (DCR)' },
    { id: 'change_control' as ViewTab, label: 'Change requests' },
  ];
  const feedback = [
    { id: 'voc' as ViewTab, label: 'Client intake' },
    { id: 'pms' as ViewTab, label: 'Satisfaction surveys (CSI)' },
  ];
  const goals = [
    { id: 'objectives' as ViewTab, label: 'Objectives' },
    { id: 'kpi' as ViewTab, label: 'KPI boards' },
  ];
  return {
    dcr_workflow: docs, change_control: docs,
    voc: feedback, pms: feedback,
    objectives: goals, kpi: goals,
  };
})();

/** Screens only admins and QA managers may open, even by typing the link (L6). */
export const ADMIN_SCREENS: ReadonlySet<string> = new Set(['users', 'audit_trail', 'import_v12']);

export function isAdminRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'qa_manager';
}

/** Screens only full admins may open (user asked 5 Oct: Users = admins only). */
export const ONLY_ADMIN_SCREENS: ReadonlySet<string> = new Set(['users']);

/** True when this role may not open this screen. */
export function isScreenBlocked(screen: string, role: string | undefined): boolean {
  if (ONLY_ADMIN_SCREENS.has(screen)) return role !== 'admin';
  return ADMIN_SCREENS.has(screen) && !isAdminRole(role);
}

/** The menu as this user may see it. */
export function visibleGroups(role: string | undefined): NavGroup[] {
  const admin = isAdminRole(role);
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => (admin || !i.adminOnly) && (!i.onlyAdmin || role === 'admin')) }))
    .filter((g) => g.items.length > 0);
}
