import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollText, X } from 'lucide-react';
import { ImportWizard } from '../import/ImportWizard';
import { ExportPanel } from '../import/ExportPanel';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useProjectStore } from '../../store/useProjectStore';
import { useRequirementsStore } from '../../store/useRequirementsStore';
import { useTestsStore } from '../../store/useTestsStore';
import { useAuditStore } from '../../store/useAuditStore';
import { useAppMode } from '../../hooks/useAppMode';
import { useApiProjects } from '../../hooks/useApiProjects';
import { useApiRequirements } from '../../hooks/useApiRequirements';
import { useApiTests } from '../../hooks/useApiTests';
import { useApiAudit } from '../../hooks/useApiAudit';
import { WorkspaceManager } from '../auth/WorkspaceManager';
import { ProjectDataProvider } from '../../context/ProjectDataContext';
import { getProjectId } from '../../lib/projectUtils';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { ViewTab } from '../../types';

// ── Lazy-loaded legacy components ────────────────────────────────────────────
const RequirementsTable = lazy(() => import('../requirements/RequirementsTable').then((m) => ({ default: m.RequirementsTable })));
const TestsTable = lazy(() => import('../tests/TestsTable').then((m) => ({ default: m.TestsTable })));
const EvaluationDashboard = lazy(() => import('../dashboard/EvaluationDashboard').then((m) => ({ default: m.EvaluationDashboard })));
const AuditTrailViewer = lazy(() => import('../audit/AuditTrailViewer').then((m) => ({ default: m.AuditTrailViewer })));
const ReportGenerator = lazy(() => import('../reports/ReportGenerator').then((m) => ({ default: m.ReportGenerator })));
const SettingsPage = lazy(() => import('../settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const DesignControlView = lazy(() => import('../design/DesignControlView'));
const ComplaintTrending = lazy(() => import('../complaints/ComplaintTrending').then((m) => ({ default: m.ComplaintTrending })));
const BatchRecordForm = lazy(() => import('../pharma/BatchRecordForm').then((m) => ({ default: m.BatchRecordForm })));
const TrainingDashboard = lazy(() => import('../training/TrainingDashboard').then((m) => ({ default: m.TrainingDashboard })));
const DocumentManager = lazy(() => import('../documents/DocumentManager').then((m) => ({ default: m.DocumentManager })));
const SystemInventory = lazy(() => import('../gamp/SystemInventory').then((m) => ({ default: m.SystemInventory })));
const ImpactAnalysis = lazy(() => import('../traceability/ImpactAnalysis').then((m) => ({ default: m.ImpactAnalysis })));
const UDIManager = lazy(() => import('../device/UDIManager').then((m) => ({ default: m.UDIManager })));
const StabilityStudyView = lazy(() => import('../pharma/StabilityStudy').then((m) => ({ default: m.StabilityStudy })));
const EnvironmentalMonitoring = lazy(() => import('../pharma/EnvironmentalMonitoring').then((m) => ({ default: m.EnvironmentalMonitoring })));
const SetupWizard = lazy(() => import('../wizard/SetupWizard').then((m) => ({ default: m.SetupWizard })));
const WorkflowInbox = lazy(() => import('../workflows/WorkflowInbox').then((m) => ({ default: m.WorkflowInbox })));
const ChangeControlTracker = lazy(() => import('../change/ChangeControlTracker').then((m) => ({ default: m.ChangeControlTracker })));
const TaskDashboard = lazy(() => import('../tasks/TaskDashboard').then((m) => ({ default: m.TaskDashboard })));
const KPIDashboardManager = lazy(() => import('../kpi/KPIDashboardManager').then((m) => ({ default: m.KPIDashboardManager })));
const FormManagerView = lazy(() => import('../forms/FormManagerView').then((m) => ({ default: m.FormManagerView })));
const ETMFView = lazy(() => import('../etmf/ETMFView').then((m) => ({ default: m.ETMFView })));
const EConsentManager = lazy(() => import('../econsent/EConsentManager').then((m) => ({ default: m.EConsentManager })));
const SubmissionBuilder = lazy(() => import('../submissions/SubmissionBuilder').then((m) => ({ default: m.SubmissionBuilder })));
const ScheduledReports = lazy(() => import('../reports/ScheduledReports').then((m) => ({ default: m.ScheduledReports })));

// ── PTA QMS Core Components ───────────────────────────────────────────────────
const MRDashboard = lazy(() => import('../dashboard/MRDashboard').then((m) => ({ default: m.MRDashboard })));
const NCRWorkflow = lazy(() => import('../ncr/NCRWorkflow').then((m) => ({ default: m.NCRWorkflow })));
const TUVTracker = lazy(() => import('../tuv/TUVTracker').then((m) => ({ default: m.TUVTracker })));
const AuditProgramme = lazy(() => import('../audit/AuditProgramme').then((m) => ({ default: m.AuditProgramme })));
const DMLManager = lazy(() => import('../documents/DMLManager').then((m) => ({ default: m.DMLManager })));
const DCRWorkflow = lazy(() => import('../documents/DCRWorkflow').then((m) => ({ default: m.DCRWorkflow })));
const ComplianceMap = lazy(() => import('../compliance/ComplianceMap').then((m) => ({ default: m.ComplianceMap })));
const MRMManager = lazy(() => import('../mrm/MRMManager').then((m) => ({ default: m.MRMManager })));
const ObjectivesDashboard = lazy(() => import('../objectives/ObjectivesDashboard').then((m) => ({ default: m.ObjectivesDashboard })));
const CSIDashboard = lazy(() => import('../compliance/CSIDashboard').then((m) => ({ default: m.CSIDashboard })));
const SupplierDashboard = lazy(() => import('../compliance/SupplierDashboard').then((m) => ({ default: m.SupplierDashboard })));
const CalibrationRegister = lazy(() => import('../compliance/CalibrationRegister').then((m) => ({ default: m.CalibrationRegister })));
const UnifiedVoC = lazy(() => import('../voc/UnifiedVoC').then((m) => ({ default: m.UnifiedVoC })));
const ImportV12 = lazy(() => import('../admin/ImportV12').then((m) => ({ default: m.ImportV12 })));

const TAB_TITLES: Partial<Record<ViewTab, string>> = {
  mr_dashboard: 'MR Dashboard',
  voc: 'Client Intake (VoC)',
  deviations: 'NCR / CAPA',
  audit_records: 'Internal Audits',
  tuv_tracker: 'TÜV Tracker',
  dml_manager: 'Document Master List',
  dcr_workflow: 'DCR Workflow',
  compliance_map: 'ISO 9001 Gap Map',
  mrm_manager: 'MRM Meetings',
  objectives: 'Strategic Objectives',
  pms: 'Customer Satisfaction (CSI)',
  suppliers: 'Approved Vendors',
  calibration_register: 'Calibration Register',
  import_v12: 'V12 Data Import',
  settings: 'Settings',
  requirements: 'Requirements',
  tests: 'Tests',
  dashboard: 'Evaluation Dashboard',
  reports: 'Reports',
  design_control: 'Design Control',
  complaints: 'Complaint Trending',
  batches: 'Batch Records',
  training: 'Training',
  documents: 'Documents',
  systems: 'Systems',
  impact: 'Impact Analysis',
  udi: 'UDI Manager',
  stability: 'Stability Studies',
  envmon: 'Environmental Monitoring',
  workflows: 'Workflows',
  change_control: 'Change Control',
  tasks: 'Tasks',
  kpi: 'KPI Dashboard',
  forms: 'Forms',
  etmf: 'eTMF',
  econsent: 'eConsent',
  submissions: 'Submissions',
  scheduled_reports: 'Scheduled Reports',
};

function TabSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ViewTab>('mr_dashboard');

  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const clearProject = useProjectStore((s) => s.clearProject);
  const requirements = useRequirementsStore((s) => s.requirements);
  const setRequirements = useRequirementsStore((s) => s.setRequirements);
  const tests = useTestsStore((s) => s.tests);
  const setTests = useTestsStore((s) => s.setTests);

  const { mode } = useAppMode();
  const isServerMode = mode === 'server';

  const {
    projects,
    loading: projectsLoading,
    activeProject,
    setActiveProject,
    refetch: refetchProjects,
  } = useApiProjects(isServerMode);
  const activeProjectId = isServerMode ? activeProject?.id ?? getProjectId(project) : '';
  const requirementApi = useApiRequirements(activeProjectId);
  const testApi = useApiTests(activeProjectId);
  const auditApi = useApiAudit(activeProjectId);

  const [showWizard, setShowWizard] = useState(false);
  const [confirmNewProject, setConfirmNewProject] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);

  useEffect(() => {
    if (!isServerMode || projectsLoading) return;
    if (projects.length === 0) {
      setActiveProject(null);
      clearProject();
      setRequirements([], 1);
      setTests([], 1);
      useAuditStore.setState({ entries: [] });
      return;
    }
    const storedProjectId = getProjectId(project);
    if (storedProjectId) {
      const matchedProject = projects.find((candidate) => candidate.id === storedProjectId);
      if (matchedProject && activeProject?.id !== matchedProject.id) {
        setActiveProject(matchedProject);
        return;
      }
    }
    if (!activeProject) {
      setActiveProject(projects[0]);
    }
  }, [activeProject, clearProject, isServerMode, project, projects, projectsLoading, setActiveProject, setRequirements, setTests]);

  useEffect(() => {
    if (!isServerMode || !activeProject) return;
    setProject(activeProject);
  }, [activeProject, isServerMode, setProject]);

  useEffect(() => {
    if (!isServerMode) return;
    setRequirements(requirementApi.requirements, requirementApi.requirements.length + 1);
  }, [isServerMode, requirementApi.requirements, setRequirements]);

  useEffect(() => {
    if (!isServerMode) return;
    setTests(testApi.tests, testApi.tests.length + 1);
  }, [isServerMode, setTests, testApi.tests]);

  useEffect(() => {
    if (!isServerMode) return;
    useAuditStore.setState({ entries: auditApi.entries });
  }, [auditApi.entries, isServerMode]);

  const hasLocalData = project !== null || requirements.length > 0 || tests.length > 0;
  const wizardVisible = showWizard || (isServerMode ? !projectsLoading && projects.length === 0 : !hasLocalData);
  const shellLoading = isServerMode && !wizardVisible && (
    projectsLoading || (Boolean(activeProjectId) && (requirementApi.loading || testApi.loading))
  );

  const projectDataValue = useMemo(
    () => ({
      isServerMode,
      loading: shellLoading,
      projects,
      activeProject,
      setActiveProject,
      refetchProjects,
      createRequirement: requirementApi.create,
      updateRequirement: requirementApi.update,
      removeRequirement: requirementApi.remove,
      createTest: testApi.create,
      updateTest: testApi.update,
      removeTest: testApi.remove,
      refetchAudit: auditApi.refetch,
    }),
    [activeProject, auditApi.refetch, isServerMode, projects, refetchProjects,
     requirementApi.create, requirementApi.remove, requirementApi.update,
     setActiveProject, shellLoading, testApi.create, testApi.remove, testApi.update],
  );

  const handleConfirmNewProject = () => {
    if (isServerMode) {
      setConfirmNewProject(false);
      setShowWizard(true);
      return;
    }
    useRequirementsStore.getState().setRequirements([], 1);
    useTestsStore.getState().setTests([], 1);
    clearProject();
    setConfirmNewProject(false);
    setShowWizard(true);
  };

  return (
    <ProjectDataProvider value={projectDataValue}>
      {wizardVisible ? (
        <Suspense fallback={<TabSpinner />}>
          <SetupWizard onComplete={() => setShowWizard(false)} />
        </Suspense>
      ) : (
        <div className="flex h-screen overflow-hidden bg-surface-secondary">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setShowTeam={setShowTeam}
            setShowAuditTrail={setShowAuditTrail}
          />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <TopBar title={TAB_TITLES[activeTab] || 'Dashboard'} />
            <main className="flex-1 overflow-y-auto p-4">
              {shellLoading ? (
                <TabSpinner />
              ) : (
                <Suspense fallback={<TabSpinner />}>
                  {/* ── PTA QMS Primary Navigation ────────────────────────── */}
                  {activeTab === 'mr_dashboard' && <MRDashboard onNavigate={setActiveTab} />}
                  {activeTab === 'deviations' && <NCRWorkflow />}
                  {activeTab === 'audit_records' && <AuditProgramme />}
                  {activeTab === 'tuv_tracker' && <TUVTracker />}
                  {activeTab === 'dml_manager' && <DMLManager />}
                  {activeTab === 'dcr_workflow' && <DCRWorkflow />}
                  {activeTab === 'compliance_map' && <ComplianceMap />}
                  {activeTab === 'mrm_manager' && <MRMManager />}
                  {activeTab === 'objectives' && <ObjectivesDashboard />}
                  {activeTab === 'pms' && <CSIDashboard />}
                  {activeTab === 'suppliers' && <SupplierDashboard />}
                  {activeTab === 'calibration_register' && <CalibrationRegister />}
                  {activeTab === 'voc' && <UnifiedVoC />}
                  {activeTab === 'import_v12' && <ImportV12 />}
                  {activeTab === 'settings' && <SettingsPage />}
                  {/* ── Legacy / Extended Modules ─────────────────────────── */}
                  {activeTab === 'requirements' && <RequirementsTable />}
                  {activeTab === 'tests' && <TestsTable />}
                  {activeTab === 'dashboard' && <EvaluationDashboard />}
                  {activeTab === 'reports' && <ReportGenerator />}
                  {activeTab === 'design_control' && <DesignControlView />}
                  {activeTab === 'complaints' && <ComplaintTrending />}
                  {activeTab === 'batches' && <BatchRecordForm />}
                  {activeTab === 'training' && <TrainingDashboard />}
                  {activeTab === 'documents' && <DocumentManager />}
                  {activeTab === 'systems' && <SystemInventory />}
                  {activeTab === 'impact' && <ImpactAnalysis />}
                  {activeTab === 'udi' && <UDIManager />}
                  {activeTab === 'stability' && <StabilityStudyView />}
                  {activeTab === 'envmon' && <EnvironmentalMonitoring />}
                  {activeTab === 'workflows' && <WorkflowInbox />}
                  {activeTab === 'change_control' && <ChangeControlTracker />}
                  {activeTab === 'tasks' && <TaskDashboard />}
                  {activeTab === 'kpi' && <KPIDashboardManager />}
                  {activeTab === 'forms' && <FormManagerView />}
                  {activeTab === 'etmf' && <ETMFView />}
                  {activeTab === 'econsent' && <EConsentManager />}
                  {activeTab === 'submissions' && <SubmissionBuilder />}
                  {activeTab === 'scheduled_reports' && <ScheduledReports />}
                </Suspense>
              )}
            </main>
          </div>

          <ConfirmDialog
            open={confirmNewProject}
            title={t('confirm.newProjectTitle')}
            message={t('confirm.newProjectMessage')}
            onConfirm={handleConfirmNewProject}
            onCancel={() => setConfirmNewProject(false)}
          />

          {showAuditTrail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAuditTrail(false)}>
              <div
                className="bg-surface rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col border border-border"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-5 h-5 text-accent" />
                    <h2 className="text-base font-semibold text-text-primary">{t('audit.title')}</h2>
                  </div>
                  <button onClick={() => setShowAuditTrail(false)} className="text-text-tertiary hover:text-text-secondary transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <Suspense fallback={<TabSpinner />}>
                    <AuditTrailViewer />
                  </Suspense>
                </div>
              </div>
            </div>
          )}

          <WorkspaceManager open={showTeam} onClose={() => setShowTeam(false)} />
          <ImportWizard open={showImportWizard} onClose={() => setShowImportWizard(false)} />
          <ExportPanel open={showExportPanel} onClose={() => setShowExportPanel(false)} />
        </div>
      )}
    </ProjectDataProvider>
  );
}
