// ── Status enums ──────────────────────────────────────────────────────────────

export type RequirementStatus = 'Draft' | 'Active' | 'Closed';
export type TestStatus = 'Not Run' | 'Passed' | 'Failed';

// ── Industry verticals & configuration ────────────────────────────────────────

export type IndustryVertical =
  | 'pharma'
  | 'biotech'
  | 'medical_devices'
  | 'cro'
  | 'clinical_lab'
  | 'logistics'
  | 'cosmetics'
  | 'aerospace'
  | 'chemical_env'
  | 'software_it';

export type RiskTaxonomyType = 'iso14971' | 'ichQ9' | 'fmea' | 'gamp5' | 'generic';
export type SafetyClassType = 'iec62304' | 'gamp5cat' | 'sil' | 'none';

export interface VerticalConfig {
  id: IndustryVertical;
  name: string;
  gxpFocus: string[];
  primaryStandards: string[];
  riskTaxonomy: RiskTaxonomyType;
  safetyClassification?: SafetyClassType;
}

// ── Risk assessment ───────────────────────────────────────────────────────────

export type Severity = 1 | 2 | 3 | 4 | 5;
export type Likelihood = 1 | 2 | 3 | 4 | 5;
export type Detectability = 1 | 2 | 3 | 4 | 5;

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskAssessment {
  id: string;
  requirementId: string;
  severity: Severity;
  likelihood: Likelihood;
  detectability?: Detectability;
  riskScore: number;
  riskLevel: RiskLevel;
  mitigationStrategy?: string;
  residualRisk?: number;
  classifiedBy: 'manual' | 'ai';
  classifiedAt: string;
}

// ── Core domain models ────────────────────────────────────────────────────────

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: RequirementStatus;
  createdAt: string;
  updatedAt: string;
  // Sprint 1 extensions (all optional for backward compatibility)
  tags?: string[];
  jurisdictions?: string[];
  verticals?: string[];
  riskLevel?: RiskLevel;
  regulatoryRef?: string;
  evidenceHints?: string[];
}

export interface Test {
  id: string;
  title: string;
  description: string;
  status: TestStatus;
  linkedRequirementIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Project types ─────────────────────────────────────────────────────────────

export type ProjectType = 'software' | 'embedded' | 'compliance' | 'empty';

export interface ProjectMeta {
  id?: string;
  name: string;
  description: string;
  owner: string;
  version: string;
  type: ProjectType;
  createdAt: string;
  // Sprint 1 extensions
  country?: string;
  vertical?: IndustryVertical;
  modules?: string[];
}

export interface ProjectData {
  version: 1;
  exportedAt: string;
  project?: ProjectMeta;
  requirements: Requirement[];
  tests: Test[];
  counters: { reqCounter: number; testCounter: number };
}

// ── Evaluation & dashboard ────────────────────────────────────────────────────

export interface EvaluationMetrics {
  totalRequirements: number;
  totalTests: number;
  coveragePercent: number;
  coveredRequirements: Requirement[];
  orphanedRequirements: Requirement[];
  orphanedTests: Test[];
  requirementStatusCounts: Record<RequirementStatus, number>;
  testStatusCounts: Record<TestStatus, number>;
}

export interface DashboardFilters {
  requirementStatus: RequirementStatus | 'All';
  testStatus: TestStatus | 'All';
}

export type ViewTab = 'requirements' | 'tests' | 'dashboard' | 'reports' | 'settings' | 'design_control' | 'complaints' | 'suppliers' | 'batches' | 'training' | 'documents' | 'systems' | 'impact' | 'pms' | 'udi' | 'stability' | 'envmon' | 'audit_records' | 'workflows' | 'change_control' | 'deviations' | 'tasks' | 'kpi' | 'forms' | 'etmf' | 'econsent' | 'submissions' | 'scheduled_reports' | 'mr_dashboard' | 'mrm' | 'dml' | 'tuv_tracker' | 'mrm_manager' | 'dml_manager' | 'objectives' | 'voc' | 'compliance_map' | 'dcr_workflow' | 'calibration_register' | 'import_v12';

// ── Templates ─────────────────────────────────────────────────────────────────

export interface TemplateItem {
  title: string;
  description: string;
  category: string;
}

export interface ProjectTemplate {
  type: ProjectType;
  label: string;
  description: string;
  requirements: TemplateItem[];
  tests: (TemplateItem & { linkedReqIndices: number[] })[];
}

// ── AI-generated artefacts ────────────────────────────────────────────────────

export interface AIGeneratedTestCase {
  title: string;
  description: string;
  steps: string[];
  expectedResult: string;
  requirementId: string;
  standard?: string;
  confidence: number; // 0-1
  accepted: boolean;
  generatedBy: string;
  providerId: string;
}

export type GapStatus = 'covered' | 'partial' | 'missing';

export interface AIGapAnalysis {
  standard: string;
  clause: string;
  status: GapStatus;
  linkedRequirementIds: string[];
  linkedTestIds: string[];
  suggestion?: string;
  generatedBy: string;
  providerId: string;
}

export interface AIRiskClassification {
  requirementId: string;
  proposedSeverity: Severity;
  proposedLikelihood: Likelihood;
  reasoning: string;
  safetyClass?: string;
  confidence: number; // 0-1
  generatedBy: string;
  providerId: string;
}

// ── Audit trail ───────────────────────────────────────────────────────────────

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'link'
  | 'unlink'
  | 'approve'
  | 'reject'
  | 'review'
  | 'archive'
  | 'unarchive'
  | 'sign'
  | 'export'
  | 'generate_report'
  | 'ai_generate'
  | 'ai_accept'
  | 'ai_reject'
  | 'login'
  | 'logout'
  | 'import';

export type AuditEntityType =
  | 'ncr'
  | 'csi'
  | 'dml'
  | 'dcr'
  | 'mrm'
  | 'mrm_action'
  | 'tuv'
  | 'supplier'
  | 'calibration'
  | 'objective'
  | 'audit_programme'
  | 'action'
  | 'evfile'
  | 'requirement'
  | 'test'
  | 'risk'
  | 'change_control';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  signature?: ElectronicSignature;
}

// ── Electronic signatures ─────────────────────────────────────────────────────

export type SignatureMeaning = 'authored' | 'reviewed' | 'approved' | 'verified' | 'rejected';

export interface ElectronicSignature {
  signerId: string;
  signerName: string;
  signerRole: string;
  timestamp: string;
  meaning: SignatureMeaning;
  method: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export type ReportType =
  | 'validation_summary'
  | 'traceability_matrix'
  | 'gap_analysis'
  | 'risk_assessment'
  | 'executive_brief'
  | 'submission_package';

export interface ReportSection {
  title: string;
  content: string;
  aiGenerated: boolean;
  reviewedBy?: string;
  approvedBy?: string;
}

export interface ReportConfig {
  type: ReportType;
  projectId: string;
  projectName?: string;
  format: string;
  includeSignatures: boolean;
  targetAuthority?: string;
  generatedAt: string;
  generatedBy: string;
  sections: ReportSection[];
}

// ── LLM provider configuration ───────────────────────────────────────────────

export type LLMProviderType = 'openai-compatible' | 'anthropic';

export type LLMPurpose =
  | 'all'
  | 'test_generation'
  | 'gap_analysis'
  | 'risk_classification'
  | 'report_narrative'
  | 'requirement_decomp'
  | 'capa';

export interface LLMProvider {
  id: string;
  name: string;
  type: LLMProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  purpose: LLMPurpose[];
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  priority: number;
}

// ── Change control ────────────────────────────────────────────────────────────

export interface ChangeControlConfig {
  requireApprovalFor: string[];
  minimumApprovers: number;
  requireReason: boolean;
  requireSignature: boolean;
  autoRevertOnChange: boolean;
}

// ── Country & module configuration ────────────────────────────────────────────

export interface CountryConfig {
  code: string;
  name: string;
  region: string;
  defaultLanguage: string;
  flag: string;
  availableVerticals: IndustryVertical[];
}

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  requirementCount: number;
  testCount: number;
}

// ── Design Control ───────────────────────────────────────────────────────────

export type DesignPhase = 'user_needs' | 'design_input' | 'design_output' | 'verification' | 'validation' | 'transfer' | 'released';

export interface DesignControlItem {
  id: string;
  projectId: string;
  phase: DesignPhase;
  title: string;
  description: string;
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  linkedRequirementIds: string[];
  linkedTestIds: string[];
  attachments: string[]; // file references
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentRecordType = 'DHF' | 'DMR' | 'DHR';

export interface DocumentRecord {
  id: string;
  projectId: string;
  type: DocumentRecordType;
  title: string;
  description: string;
  version: string;
  status: 'draft' | 'active' | 'superseded' | 'obsolete';
  sections: DocumentSection[];
  linkedDesignItems: string[]; // DesignControlItem IDs
  linkedRequirementIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string; // markdown
  order: number;
  linkedArtifacts: string[]; // requirement/test/design item IDs
}

// ── Custom Fields ────────────────────────────────────────────────────────────

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'boolean' | 'url';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[]; // for select/multi_select
  required: boolean;
  appliesTo: ('requirement' | 'test' | 'capa' | 'design_item')[];
  defaultValue?: string;
}

// ── Workflow Engine ──────────────────────────────────────────────────────────

export type WorkflowStepType = 'approval' | 'review' | 'sign' | 'notify' | 'auto_check';

export interface WorkflowDefinition {
  id: string;
  name: string;
  trigger: 'on_status_change' | 'on_create' | 'on_edit' | 'manual';
  entityType: string;
  steps: WorkflowStep[];
  enabled: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  assigneeRole?: string;
  requiredApprovers: number;
  slaHours?: number;
  escalateTo?: string;
  conditions?: { field: string; operator: string; value: string }[];
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  entityType: string;
  entityId: string;
  currentStepIndex: number;
  status: 'active' | 'completed' | 'cancelled' | 'escalated';
  approvals: { stepId: string; userId: string; action: 'approved' | 'rejected'; timestamp: string; reason?: string }[];
  startedAt: string;
  completedAt?: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'approval_needed' | 'task_overdue' | 'capa_deadline' | 'deviation_opened' | 'workflow_escalation' | 'comment_mention' | 'document_review' | 'training_due' | 'audit_reminder' | 'status_change' | 'mention';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  projectId?: string;
  userId: string;
  read: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  entityType: string;
  entityId: string;
  projectId: string;
  userId: string;
  userName: string;
  content: string;
  parentId?: string;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'overdue';

export interface QTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  entityType?: string;
  entityId?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

// ── Base Entity & Approval Metadata ──────────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
}

export interface ApprovalMetadata {
  reviewedBy?: string;
  reviewDate?: string;
  reviewComments?: string;
  approvedBy?: string;
  approvalDate?: string;
  approvalComments?: string;
  rejectedBy?: string;
  rejectionDate?: string;
  rejectionReason?: string;
}

// ── Store Architecture Contracts ─────────────────────────────────────────────

export interface BaseStore<T extends BaseEntity> {
  records: T[];
  addRecord: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => T;
  updateRecord: (id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>) => void;
  deleteRecord: (id: string) => void;
  archiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  setRecords: (records: T[]) => void;
}

export interface LifecycleStore<T extends BaseEntity, TStatus extends string> extends BaseStore<T> {
  updateStatus: (id: string, status: TStatus, reason?: string) => void;
}

export interface ApprovalStore<T extends BaseEntity> extends BaseStore<T> {
  reviewRecord: (id: string, reviewerName: string, comments?: string) => void;
  approveRecord: (id: string, approverName: string, comments?: string) => void;
  rejectRecord: (id: string, rejectorName: string, reason: string) => void;
}

// ── PTA Standard Departments ──────────────────────────────────────────────────

export const PTA_DEPARTMENTS = [
  'IED / QAQC',
  'Projects',
  'OSD',
  'IT',
  'Facility',
  'Procurement',
  'Stores',
  'P&E',
  'HR',
  'Marketing',
  'ESD',
  'Fabrication',
  'Contracts & Planning',
  'MR',
] as const;

export type PTADepartment = (typeof PTA_DEPARTMENTS)[number] | string;

// ── NCR Workflow ─────────────────────────────────────────────────────────────

export type NCRRecordStatus =
  | 'Open'
  | 'Under Investigation'
  | 'Corrective Action Pending'
  | 'Verification'
  | 'Closed'
  // Legacy aliases for backward compatibility:
  | 'Investigation'
  | 'RootCause'
  | 'CAPA_Planned'
  | 'CAPA_InProgress';

export interface NCRRecord extends BaseEntity, ApprovalMetadata {
  ref?: string;
  dt?: string;
  project?: string;
  raisedBy?: string;
  auditeeName?: string;
  auditeeDept?: string;
  refDoc?: string;
  auditeeEmail?: string;
  classification?: 'NCR' | 'Potential NCR' | 'Observation';
  obSubType?: string;
  desc?: string;
  objEvidence?: string;
  rcaCat?: string;
  rca?: string;
  corrAction?: string;
  corrBy?: string;
  containmentAction?: string;
  containmentBy?: string;
  containmentTargetDate?: string;
  containmentDate?: string;
  corrTargetDate?: string;
  corrCompletionDate?: string;
  prevAction?: string;
  prevBy?: string;
  prevTargetDate?: string;
  prevCompletionDate?: string;
  finalDecision?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  status: NCRRecordStatus;
  slaDeadline?: string;
  assignedTo?: string;
  assignedDept?: string;
  stateHistory?: NCRStateHistoryEntry[];
}

export interface NCRStateHistoryEntry {
  from: NCRRecordStatus;
  to: NCRRecordStatus;
  by: string;
  at: string;
  reason: string;
  kind: 'forward' | 'reject' | 'reopen' | 'verify';
}

// ── CSI Survey & 22-Criteria Scoring ─────────────────────────────────────────

export type CSIRecordStatus = 'open' | 'closed' | 'in_progress';
export type CSIRating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Satisfactory' | 'Needs Improvement';
export type CSIIcon = '★' | '✔' | '◑' | '▲' | '✘';

export interface CSICriteriaQuestion {
  code: string; // '1A', '1B', ... '9'
  question: string;
}

export interface CSICriteriaCategory {
  category: string;
  questions: readonly CSICriteriaQuestion[];
}

export const CSI_QUESTIONS: readonly CSICriteriaCategory[] = [
  {
    category: '1. Overall Service',
    questions: [
      { code: '1A', question: 'How would you rate the overall quality of the services provided?' },
      { code: '1B', question: 'Were you satisfied with the level of service you received from our team?' },
    ],
  },
  {
    category: '2. Timeliness and Efficiency',
    questions: [
      { code: '2A', question: 'Were our services delivered within the promised timeframe?' },
      { code: '2B', question: 'Did you find our team to be prompt and efficient in handling your requests?' },
    ],
  },
  {
    category: '3. Communication and Responsiveness',
    questions: [
      { code: '3A', question: 'How satisfied were you with the communication from our team throughout the service process?' },
      { code: '3B', question: 'Did our team respond promptly to your inquiries and concerns?' },
    ],
  },
  {
    category: '4. Expertise and Knowledge',
    questions: [
      { code: '4A', question: 'Did you find our team knowledgeable and competent in addressing your needs?' },
      { code: '4B', question: 'Were you satisfied with the expertise demonstrated by our team in delivering the services?' },
    ],
  },
  {
    category: '5. Problem Resolution',
    questions: [
      { code: '5A', question: 'If you encountered any issues or challenges, were they resolved to your satisfaction?' },
      { code: '5B', question: 'How satisfied were you with the way our team handled any problems or complaints?' },
    ],
  },
  {
    category: '6. Quality Services',
    questions: [
      { code: '6A', question: 'Have you noticed any inconsistencies in the quality of our services across different interactions?' },
      { code: '6B', question: 'How would you compare the overall quality of our services to other contracting companies?' },
      { code: '6C', question: 'Do you believe that our company maintains consistent service standards over time?' },
    ],
  },
  {
    category: '7. Compliance with Safety Regulations',
    questions: [
      { code: '7A', question: 'Do you believe our team adheres to all relevant safety regulations and standards?' },
      { code: '7B', question: 'Did you feel that our team took the necessary precautions to ensure safety during the service?' },
      { code: '7C', question: 'Were you satisfied with the communication and implementation of safety measures during turnaround/projects?' },
    ],
  },
  {
    category: '8. Leadership',
    questions: [
      { code: '8A', question: 'How would you rate the effectiveness of our leadership team in providing direction and vision?' },
      { code: '8B', question: 'How responsive do you find our leadership team?' },
      { code: '8C', question: 'How effective is the communication from our leadership?' },
      { code: '8D', question: 'Do you feel that our leadership takes accountability for deviations and promptly addresses issues?' },
      { code: '8E', question: 'How effective is our leadership team in resolving problems?' },
    ],
  },
  {
    category: '9. Overall Performance (Time, Quality, Safety)',
    questions: [
      { code: '9', question: "How would you rate our company's overall performance in terms of Time, Quality, and Safety?" },
    ],
  },
] as const;

export interface CSIRecord extends BaseEntity, ApprovalMetadata {
  status?: CSIRecordStatus;
  clientName?: string;
  clientDesig?: string;
  projectName?: string;
  surveyDate?: string;
  scores?: Record<string, number>; // map: '1A'..'9' -> 1..10
  totalScore?: number; // 0-100 calculated
  rating?: CSIRating;
  icon?: CSIIcon | string;
  evaluatorName?: string;
  comments?: string;
  // Legacy & V12 compatibility fields:
  cl?: string;
  proj?: string;
  score?: string | number;
  yr?: string | number;
  obs?: string;
  projCode?: string;
  po?: string;
  suggestions?: string;
  dt?: string;
}

export function calculateCSIScore(scores?: Record<string, number>): {
  totalScore: number;
  scoreNormalized: string;
  rating: CSIRating;
  icon: CSIIcon;
  answeredCount: number;
} {
  if (!scores || typeof scores !== 'object') {
    return {
      totalScore: 0,
      scoreNormalized: '0.00',
      rating: 'Needs Improvement',
      icon: '✘',
      answeredCount: 0,
    };
  }

  const validEntries = Object.entries(scores).filter(
    ([, val]) => typeof val === 'number' && !isNaN(val) && val >= 1 && val <= 10
  );

  if (validEntries.length === 0) {
    return {
      totalScore: 0,
      scoreNormalized: '0.00',
      rating: 'Needs Improvement',
      icon: '✘',
      answeredCount: 0,
    };
  }

  const sum = validEntries.reduce((acc, [, val]) => acc + val, 0);
  const avg = sum / validEntries.length; // 1 to 10
  const totalScore = Math.round(avg * 10 * 100) / 100;
  const scoreNormalized = (avg / 10).toFixed(4);

  let rating: CSIRating = 'Needs Improvement';
  let icon: CSIIcon = '✘';

  if (totalScore >= 90) {
    rating = 'Excellent';
    icon = '★';
  } else if (totalScore >= 85) {
    rating = 'Good';
    icon = '✔';
  } else if (totalScore >= 80) {
    rating = 'Satisfactory';
    icon = '◑';
  } else if (totalScore >= 75) {
    rating = 'Fair';
    icon = '▲';
  }

  return {
    totalScore,
    scoreNormalized,
    rating,
    icon,
    answeredCount: validEntries.length,
  };
}

// ── Document Master List (DML) ────────────────────────────────────────────────

export type DMLRecordStatus =
  | 'Active'
  | 'Under Review'
  | 'Draft'
  | 'UnderReview'
  | 'Approved'
  | 'Published'
  | 'Obsolete';

export interface DMLRecord extends BaseEntity, ApprovalMetadata {
  no?: string;
  tt?: string;
  hierarchyLevel?: 'L1' | 'L2' | 'L3' | 'L4';
  dept?: string;
  rv?: string;
  reviewDate?: string;
  ret?: string;
  cl?: string;
  status: DMLRecordStatus;
  nt?: string;
}

// ── Document Change Request (DCR) ─────────────────────────────────────────────

export type DCRStatus =
  | 'Draft'
  | 'Reviewed'
  | 'Approved'
  | 'Rejected'
  // Legacy aliases:
  | 'Pending Review'
  | 'Pending QA Approval'
  | 'Implemented';

export interface DCRRecord extends BaseEntity, ApprovalMetadata {
  dcrNo: string;
  docId: string;
  docNo: string;
  title: string;
  requestor: string;
  department: string;
  changeDescription: string;
  reason: string;
  status: DCRStatus;
  // V12 import fields:
  dt?: string;
  ref?: string;
  reqBy?: string;
  revNo?: string;
  summary?: string;
  comments?: string;
  docTitle?: string;
  // Record Completeness Standard additions:
  assignedTo?: string;
  dueDate?: string;
  stateHistory?: DCRStateHistoryEntry[];
}

export interface DCRStateHistoryEntry {
  from: DCRStatus;
  to: DCRStatus;
  by: string;
  at: string;
  reason: string;
  kind: 'forward' | 'reject' | 'reopen' | 'verify';
}

// ── Management Review Meetings (MRM) ──────────────────────────────────────────

export type MRMStatus =
  | 'Draft'
  | 'Reviewed'
  | 'Approved'
  // Legacy aliases:
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export interface MRMActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Closed';
  closedAt?: string;
  mrmRef?: string;
  clause?: string;
  evidence?: string;
}

export interface MRMRecord extends BaseEntity, ApprovalMetadata {
  meetingDate: string;
  meetingNo: string;
  chairperson: string;
  attendees: string[];
  venue: string;
  status: MRMStatus;
  agendaItems: string[];
  inputs: {
    customerFeedback: boolean;
    objectivesReview: boolean;
    processPerformance: boolean;
    ncrsAndCAPAs: boolean;
    auditFindings: boolean;
    supplierPerformance: boolean;
    resourceAdequacy: boolean;
    riskOpportunities: boolean;
  };
  minutesSummary: string;
  decisions: string;
  actionItems: MRMActionItem[];
  flaggedObjectiveMisses: string[];
  flaggedSLABreaches: string[];
  // V12 backup mappings:
  ref?: string;
  mr?: string;
  att?: string;
  dec?: string;
  min?: string;
  chr?: string;
  nt?: string;
}

// ── TÜV Tracker ───────────────────────────────────────────────────────────────

export type TUVRecordStatus =
  | 'Open'
  | 'Action Taken'
  | 'Verified'
  | 'Closed'
  // Legacy alias:
  | 'In Progress';

export interface TUVRecord extends BaseEntity, ApprovalMetadata {
  num?: string;
  cl?: string;
  desc?: string;
  owner?: string;
  due?: string;
  status: TUVRecordStatus;
  evidence?: string;
  closed?: string;
  actionTaken?: string;
  actionTakenDate?: string;
  verifiedBy?: string;
  verifiedDate?: string;
}

// ── Supplier Evaluation & AVL ─────────────────────────────────────────────────

export type SupplierStatus =
  | 'Under Evaluation'
  | 'Approved'
  | 'Conditional'
  | 'Rejected'
  // Legacy alias:
  | 'Pending Evaluation';

export interface SupplierEvalRecord extends BaseEntity, ApprovalMetadata {
  name: string;
  category: string;
  status: SupplierStatus;
  score: number;
  lastEvalDate: string;
  nextEvalDate: string;
  contactPerson: string;
  email: string;
  findings: string;
}

// ── Calibration Register ──────────────────────────────────────────────────────

export type CalibStatus =
  | 'Valid'
  | 'Due'
  | 'Overdue'
  | 'Out of Service'
  // Legacy aliases:
  | 'Active'
  | 'Due Soon'
  | 'Scrapped';

export interface CalibRecord extends BaseEntity, ApprovalMetadata {
  equipNo: string;
  equipName: string;
  manufacturer: string;
  serialNo: string;
  location: string;
  freqMonths: number;
  lastCalibDate: string;
  nextCalibDate: string;
  status: CalibStatus;
  certificateNo: string;
  notes: string;
  calibrationAgency?: string;
  calibratedBy?: string;
}

// ── Quality Objectives ────────────────────────────────────────────────────────

export type ObjectiveRecordStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Achieved'
  | 'Not Achieved'
  // Legacy aliases:
  | 'Completed'
  | 'Ongoing'
  | 'Pending Submission';

export interface ObjectiveRecord extends BaseEntity, ApprovalMetadata {
  yr?: string;
  dept?: string;
  ref?: string;
  objId?: string;
  desc?: string;
  kpi?: string;
  owner?: string;
  deadline?: string;
  status: ObjectiveRecordStatus;
  pct?: number;
  actual?: string;
  evidence?: string;
  remarks?: string;
  parentId?: string;
}

// ── Audit Programme ───────────────────────────────────────────────────────────

export type AuditProgrammeRecordStatus =
  | 'Planned'
  | 'In Progress'
  | 'Completed'
  | 'Follow-up'
  // Legacy alias:
  | 'Report Issued';

export interface AuditStateHistoryEntry {
  from: AuditProgrammeRecordStatus;
  to: AuditProgrammeRecordStatus;
  by: string;
  at: string;
  reason: string;
  kind: 'forward' | 'reject' | 'reopen' | 'verify';
}

export interface AuditProgrammeRecord extends BaseEntity, ApprovalMetadata {
  ref?: string;
  sc?: string;
  aud?: string;
  dep?: string;
  dt?: string;
  nc?: number | string;
  obs?: number | string;
  fnd?: string;
  status: AuditProgrammeRecordStatus;
  rpt?: string;
  auditee?: string;
  phase?: string;
  ncrIds?: string[];
  completedDate?: string;
  followUpDate?: string;
  stateHistory?: AuditStateHistoryEntry[];
}

// ── Ancillary Modules: Actions & Evfile ────────────────────────────────────────

export type ActionItemStatus = 'Open' | 'In Progress' | 'Completed' | 'Closed';

export interface QMSActionItem extends BaseEntity {
  ref: string;
  mrm?: string;
  cl?: string;
  desc: string;
  own: string;
  due: string;
  st: ActionItemStatus;
  ev?: string;
  closedAt?: string;
}

export type EvfileStatus = 'Pending' | 'Ready' | 'Verified';

export interface EvfileRecord extends BaseEntity {
  num: string;
  item: string;
  ref: string;
  note?: string;
  status: EvfileStatus;
}
