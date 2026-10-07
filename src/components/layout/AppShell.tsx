import { Suspense, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { hardReload } from '../../lib/bootRecovery';
import { navigate, useRoute, HOME_SCREEN } from '../../lib/router';
import { SCREEN_TITLES, isScreenBlocked } from '../../lib/nav';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { NoAccess } from './NoAccess';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SyncStatusBar } from './SyncStatusBar';
import { PhoneBar } from './PhoneBar';
import { SubTabs } from './SubTabs';
import { CommandPalette } from './CommandPalette';
import { SyncConflictBanner } from './SyncConflictBanner';
import { ShardBackground } from '../auth/ShardBackground';
import type { ViewTab } from '../../types';

// ── Screens (lazy-loaded) ────────────────────────────────────────────────────
const TodayView = lazyWithRetry(() => import('../today/TodayView').then((m) => ({ default: m.TodayView })));
const ApprovalsView = lazyWithRetry(() => import('../today/ApprovalsView').then((m) => ({ default: m.ApprovalsView })));
const AuditTrailViewer = lazyWithRetry(() => import('../audit/AuditTrailViewer').then((m) => ({ default: m.AuditTrailViewer })));
const UserManager = lazyWithRetry(() => import('../admin/UserManager').then((m) => ({ default: m.UserManager })));
const WorkflowInbox = lazyWithRetry(() => import('../workflows/WorkflowInbox').then((m) => ({ default: m.WorkflowInbox })));
const ChangeControlTracker = lazyWithRetry(() => import('../change/ChangeControlTracker').then((m) => ({ default: m.ChangeControlTracker })));
const TaskDashboard = lazyWithRetry(() => import('../tasks/TaskDashboard').then((m) => ({ default: m.TaskDashboard })));
const KPIDashboardManager = lazyWithRetry(() => import('../kpi/KPIDashboardManager').then((m) => ({ default: m.KPIDashboardManager })));
const MRDashboard = lazyWithRetry(() => import('../dashboard/MRDashboard').then((m) => ({ default: m.MRDashboard })));
const NCRWorkflow = lazyWithRetry(() => import('../ncr/NCRWorkflow').then((m) => ({ default: m.NCRWorkflow })));
const TUVTracker = lazyWithRetry(() => import('../tuv/TUVTracker').then((m) => ({ default: m.TUVTracker })));
const AuditProgramme = lazyWithRetry(() => import('../audit/AuditProgramme').then((m) => ({ default: m.AuditProgramme })));
const DMLManager = lazyWithRetry(() => import('../documents/DMLManager').then((m) => ({ default: m.DMLManager })));
const DCRWorkflow = lazyWithRetry(() => import('../documents/DCRWorkflow').then((m) => ({ default: m.DCRWorkflow })));
const ComplianceMap = lazyWithRetry(() => import('../compliance/ComplianceMap').then((m) => ({ default: m.ComplianceMap })));
const MRMManager = lazyWithRetry(() => import('../mrm/MRMManager').then((m) => ({ default: m.MRMManager })));
const ObjectivesDashboard = lazyWithRetry(() => import('../objectives/ObjectivesDashboard').then((m) => ({ default: m.ObjectivesDashboard })));
const CSIDashboard = lazyWithRetry(() => import('../compliance/CSIDashboard').then((m) => ({ default: m.CSIDashboard })));
const UnifiedVoC = lazyWithRetry(() => import('../voc/UnifiedVoC').then((m) => ({ default: m.UnifiedVoC })));
const ImportV12 = lazyWithRetry(() => import('../admin/ImportV12').then((m) => ({ default: m.ImportV12 })));

function renderScreen(screen: ViewTab): ReactNode {
  switch (screen) {
    case 'today': return <TodayView />;
    case 'approvals': return <ApprovalsView />;
    case 'mr_dashboard': return <MRDashboard onNavigate={(t) => navigate(t)} />;
    case 'deviations': return <NCRWorkflow />;
    case 'audit_records': return <AuditProgramme />;
    case 'tuv_tracker': return <TUVTracker />;
    case 'dml_manager': return <DMLManager />;
    case 'dcr_workflow': return <DCRWorkflow />;
    case 'change_control': return <ChangeControlTracker />;
    case 'compliance_map': return <ComplianceMap />;
    case 'mrm_manager': return <MRMManager />;
    case 'objectives': return <ObjectivesDashboard />;
    case 'kpi': return <KPIDashboardManager />;
    case 'pms': return <CSIDashboard />;
    case 'voc': return <UnifiedVoC />;
    case 'import_v12': return <ImportV12 />;
    case 'users': return <UserManager />;
    case 'audit_trail': return <AuditTrailViewer />;
    case 'workflows': return <WorkflowInbox />;
    case 'tasks': return <TaskDashboard />;
    default: return <TodayView />;
  }
}

function TabSpinner() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

function ScreenError({ screen }: { screen: ViewTab }) {
  return (
    <div className="glass-card flex h-64 flex-col items-center justify-center rounded-2xl border border-border p-6 text-center">
      <p className="mb-2 text-sm font-semibold text-text-primary">This screen did not load</p>
      <p className="mb-4 text-xs text-text-secondary">Your saved records are safe. Reload the screen, or go back to Today.</p>
      <div className="flex items-center gap-3">
        <button type="button" onClick={hardReload} className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-accent-hover">
          Reload screen
        </button>
        {screen !== HOME_SCREEN && (
          <button type="button" onClick={() => navigate(HOME_SCREEN)} className="rounded-lg border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-text-primary shadow-sm transition-colors hover:bg-surface-hover">
            Go to Today
          </button>
        )}
      </div>
    </div>
  );
}

export function AppShell() {
  const { screen } = useRoute();
  const me = useCurrentUser();
  const blocked = isScreenBlocked(screen, me.role);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.title = `${SCREEN_TITLES[screen]} · PTA QMS`;
  }, [screen]);

  return (
    // Transparent on purpose: the page wallpaper is the fixed gradient on
    // <body>, and every glass card in the app shows it through itself.
    <div className="relative flex h-screen overflow-hidden bg-transparent">
      <a href="#main" className="sr-only z-[60] rounded bg-surface px-3 py-2 text-text-primary focus:not-sr-only focus:fixed focus:left-2 focus:top-2">
        Skip to content
      </a>
      {/* Dark mode only: the same black slabs as the login page. */}
      <div className="hidden dark:block" aria-hidden="true"><ShardBackground /></div>
      <div className="relative z-10 flex h-full w-full">
        <Sidebar activeScreen={screen} onOpenSearch={openSearch} mobileOpen={menuOpen} onCloseMobile={closeMenu} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar title={SCREEN_TITLES[screen]} onOpenSearch={openSearch} />
          <SyncStatusBar />
          <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto p-4 pb-24 focus:outline-none md:p-6 md:pb-6">
            <SubTabs screen={screen} />
            <ErrorBoundary key={screen} fallback={<ScreenError screen={screen} />}>
              <Suspense fallback={<TabSpinner />}>{blocked ? <NoAccess /> : renderScreen(screen)}</Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <PhoneBar activeScreen={screen} onOpenSearch={openSearch} onOpenMenu={() => setMenuOpen(true)} />
      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} />}
      <SyncConflictBanner />
    </div>
  );
}
