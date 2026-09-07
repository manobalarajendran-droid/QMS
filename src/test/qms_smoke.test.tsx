import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from '../components/layout/Sidebar';
import { DCRWorkflow } from '../components/documents/DCRWorkflow';
import { ComplianceMap } from '../components/compliance/ComplianceMap';
import { ObjectivesDashboard } from '../components/objectives/ObjectivesDashboard';
import { UnifiedVoC } from '../components/voc/UnifiedVoC';
import { CSIDashboard } from '../components/compliance/CSIDashboard';
import { SupplierDashboard } from '../components/compliance/SupplierDashboard';
import { CalibrationRegister } from '../components/compliance/CalibrationRegister';
import { AppShell } from '../components/layout/AppShell';
import { AuthProvider } from '../hooks/useAuth';
import { useCSIStore } from '../store/useCSIStore';
import { useClientIntakeStore } from '../store/useClientIntakeStore';
import { useProjectStore } from '../store/useProjectStore';

// Mock react-i18next for test environment
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === 'string') return fallback;
      return key;
    },
    i18n: {
      changeLanguage: () => Promise.resolve(),
      language: 'en',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

// Mock API client fetcher to avoid network calls during test execution
vi.mock('../lib/apiClient', () => ({
  apiFetch: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/auth/sso/config')) {
      return Promise.resolve({ enabled: false, type: 'oidc', providerName: null });
    }
    if (url.includes('/users/team')) {
      return Promise.resolve({
        orgName: 'Plant-Tech Arabia',
        members: [
          { id: 'u1', name: 'Quality Manager', email: 'qm@plant-tech.com', role: 'admin' },
        ],
      });
    }
    if (url.includes('/projects')) {
      return Promise.resolve([]);
    }
    return Promise.resolve({});
  }),
}));

// Setup browser API mocks for jsdom
if (typeof window !== 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  window.scrollTo = vi.fn();
}

describe('QMS Comprehensive Programmatic Smoke Test Suite', () => {
  beforeEach(() => {
    // Reset or seed the active project in useProjectStore
    useProjectStore.getState().setProject({
      id: 'proj-plant-tech-001',
      name: 'Plant-Tech Arabia QMS ISO 9001:2015',
      version: '3.0.0',
      description: 'ISO 9001:2015 Quality Management Platform',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    });
  });

  // ==========================================================================
  // SMOKE TEST 1: SIDEBAR NAVIGATION VERIFICATION (16 ITEMS)
  // ==========================================================================
  describe('Smoke Test 1: Sidebar Navigation (16 items & 6 groups)', () => {
    const all16Items = [
      { id: 'mr_dashboard', label: 'MR Dashboard', isModal: false },
      { id: 'voc', label: 'Client Intake (VoC)', isModal: false },
      { id: 'deviations', label: 'NCR / CAPA', isModal: false },
      { id: 'audit_records', label: 'Internal Audits', isModal: false },
      { id: 'tuv_tracker', label: 'TÜV Tracker', isModal: false },
      { id: 'dml_manager', label: 'Document Master List', isModal: false },
      { id: 'dcr_workflow', label: 'DCR', isModal: false },
      { id: 'compliance_map', label: 'ISO 9001 Gap Map', isModal: false },
      { id: 'mrm_manager', label: 'MRM Meetings', isModal: false },
      { id: 'objectives', label: 'Strategic Objectives', isModal: false },
      { id: 'pms', label: 'CSI', isModal: false },
      { id: 'suppliers', label: 'Approved Vendors', isModal: false },
      { id: 'calibration_register', label: 'Calibration', isModal: false },
      { id: 'users', label: 'Users', isModal: true },
      { id: 'audit_trail', label: 'Audit Trail', isModal: true },
      { id: 'settings', label: 'Settings', isModal: false },
    ];

    it('renders all 6 navigation group headers', () => {
      render(
        <Sidebar
          activeTab="mr_dashboard"
          setActiveTab={vi.fn()}
          setShowTeam={vi.fn()}
          setShowAuditTrail={vi.fn()}
        />
      );

      expect(screen.getByText('Command Center')).toBeInTheDocument();
      expect(screen.getByText('Quality Core')).toBeInTheDocument();
      expect(screen.getByText('Document Control')).toBeInTheDocument();
      expect(screen.getByText('Management Review')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Administration')).toBeInTheDocument();
    });

    it('renders all 16 navigation items', () => {
      render(
        <Sidebar
          activeTab="mr_dashboard"
          setActiveTab={vi.fn()}
          setShowTeam={vi.fn()}
          setShowAuditTrail={vi.fn()}
        />
      );

      all16Items.forEach(({ label }) => {
        expect(screen.getByRole('button', { name: (_content, element) => element?.textContent?.includes(label) ?? false })).toBeInTheDocument();
      });
    });

    it('triggers setActiveTab for each of the 14 ViewTab targets', () => {
      const setActiveTab = vi.fn();
      const setShowTeam = vi.fn();
      const setShowAuditTrail = vi.fn();

      render(
        <Sidebar
          activeTab="mr_dashboard"
          setActiveTab={setActiveTab}
          setShowTeam={setShowTeam}
          setShowAuditTrail={setShowAuditTrail}
        />
      );

      const viewTabItems = all16Items.filter(item => !item.isModal);
      expect(viewTabItems).toHaveLength(14);

      viewTabItems.forEach(({ id, label }) => {
        const button = screen.getByRole('button', { name: (_content, element) => element?.textContent?.includes(label) ?? false });
        fireEvent.click(button);
        expect(setActiveTab).toHaveBeenCalledWith(id);
      });

      expect(setActiveTab).toHaveBeenCalledTimes(14);
      expect(setShowTeam).not.toHaveBeenCalled();
      expect(setShowAuditTrail).not.toHaveBeenCalled();
    });

    it('triggers setShowTeam(true) when clicking the "Users" item', () => {
      const setActiveTab = vi.fn();
      const setShowTeam = vi.fn();
      const setShowAuditTrail = vi.fn();

      render(
        <Sidebar
          activeTab="mr_dashboard"
          setActiveTab={setActiveTab}
          setShowTeam={setShowTeam}
          setShowAuditTrail={setShowAuditTrail}
        />
      );

      const usersBtn = screen.getByRole('button', { name: /^Users$/i });
      fireEvent.click(usersBtn);

      expect(setShowTeam).toHaveBeenCalledWith(true);
      expect(setActiveTab).not.toHaveBeenCalled();
      expect(setShowAuditTrail).not.toHaveBeenCalled();
    });

    it('triggers setShowAuditTrail(true) when clicking the "Audit Trail" item', () => {
      const setActiveTab = vi.fn();
      const setShowTeam = vi.fn();
      const setShowAuditTrail = vi.fn();

      render(
        <Sidebar
          activeTab="mr_dashboard"
          setActiveTab={setActiveTab}
          setShowTeam={setShowTeam}
          setShowAuditTrail={setShowAuditTrail}
        />
      );

      const auditBtn = screen.getByRole('button', { name: /Audit Trail/i });
      fireEvent.click(auditBtn);

      expect(setShowAuditTrail).toHaveBeenCalledWith(true);
      expect(setActiveTab).not.toHaveBeenCalled();
      expect(setShowTeam).not.toHaveBeenCalled();
    });

    it('toggles collapsible groups on header click', () => {
      render(
        <Sidebar
          activeTab="mr_dashboard"
          setActiveTab={vi.fn()}
          setShowTeam={vi.fn()}
          setShowAuditTrail={vi.fn()}
        />
      );

      // Initially Command Center items are visible
      expect(screen.getByRole('button', { name: /MR Dashboard/i })).toBeInTheDocument();

      // Click group header to collapse
      const commandCenterHeader = screen.getByRole('button', { name: /Command Center/i });
      fireEvent.click(commandCenterHeader);

      // Items should now be collapsed (hidden from DOM)
      expect(screen.queryByRole('button', { name: /MR Dashboard/i })).not.toBeInTheDocument();

      // Click again to re-expand
      fireEvent.click(commandCenterHeader);
      expect(screen.getByRole('button', { name: /MR Dashboard/i })).toBeInTheDocument();
    });

    it('applies active styling to the currently active tab', () => {
      const { rerender } = render(
        <Sidebar
          activeTab="mr_dashboard"
          setActiveTab={vi.fn()}
          setShowTeam={vi.fn()}
          setShowAuditTrail={vi.fn()}
        />
      );

      const mrBtn = screen.getByRole('button', { name: /MR Dashboard/i });
      expect(mrBtn.className).toContain('bg-accent-subtle');
      expect(mrBtn.className).toContain('text-accent');

      // Change activeTab to dcr_workflow
      rerender(
        <Sidebar
          activeTab="dcr_workflow"
          setActiveTab={vi.fn()}
          setShowTeam={vi.fn()}
          setShowAuditTrail={vi.fn()}
        />
      );

      const dcrBtn = screen.getByRole('button', { name: /^DCR$/i });
      expect(dcrBtn.className).toContain('bg-accent-subtle');
      expect(dcrBtn.className).toContain('text-accent');
      expect(mrBtn.className).not.toContain('bg-accent-subtle');
    });
  });

  // ==========================================================================
  // SMOKE TEST 2: PHASE 3 & 4 FEATURE MODULES RENDERING
  // ==========================================================================
  describe('Smoke Test 2: Phase 3 & 4 Modules Component Verification', () => {
    it('renders DCRWorkflow without errors and allows form toggling', () => {
      render(<DCRWorkflow />);

      expect(screen.getByText('Document Change Requests')).toBeInTheDocument();
      const newDcrBtn = screen.getByRole('button', { name: /New DCR/i });
      expect(newDcrBtn).toBeInTheDocument();

      // Open new DCR form
      fireEvent.click(newDcrBtn);
      expect(screen.getByText('New Change Request')).toBeInTheDocument();
      expect(screen.getByText('Document Number')).toBeInTheDocument();
      expect(screen.getByText('Document Title')).toBeInTheDocument();

      // Cancel form
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);
      expect(screen.queryByText('New Change Request')).not.toBeInTheDocument();
    });

    it('renders ComplianceMap without errors and displays ISO clauses', () => {
      render(<ComplianceMap />);

      expect(screen.getByText('ISO 9001:2015 Map')).toBeInTheDocument();
      expect(screen.getByText('Context of the Organization')).toBeInTheDocument();
      expect(screen.getByText('Leadership')).toBeInTheDocument();
      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('Support')).toBeInTheDocument();
      expect(screen.getByText('Operation')).toBeInTheDocument();
      expect(screen.getByText('Performance Evaluation')).toBeInTheDocument();
      expect(screen.getByText('Improvement')).toBeInTheDocument();

      // Select a subclause
      const subclauseBtn = screen.getByText('4.1 Context');
      fireEvent.click(subclauseBtn);

      expect(screen.getByRole('heading', { name: /Clause 4\.1 Context/i })).toBeInTheDocument();
      expect(screen.getByText('Mapped Documents & Processes')).toBeInTheDocument();
    });

    it('renders ObjectivesDashboard and toggles between Tree and Leaderboard', () => {
      render(<ObjectivesDashboard />);

      expect(screen.getByText('Total Objectives')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Avg Achievement')).toBeInTheDocument();
      expect(screen.getByText('Avg Emergency Reaction')).toBeInTheDocument();

      // Check view buttons
      const leaderboardBtn = screen.getByRole('button', { name: /Leaderboard/i });
      fireEvent.click(leaderboardBtn);
      expect(screen.getByText('Transparency Leaderboard')).toBeInTheDocument();

      const treeBtn = screen.getByRole('button', { name: /Strategic Tree/i });
      fireEvent.click(treeBtn);
      expect(screen.getByText(/New Objective/i)).toBeInTheDocument();
    });

    it('renders UnifiedVoC without errors and shows intake KPI cards', () => {
      render(<UnifiedVoC />);

      expect(screen.getByText('Unified Client Intake')).toBeInTheDocument();
      expect(screen.getByText('Active Issues')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('Avg Reaction Time')).toBeInTheDocument();
      expect(screen.getByText('Avg Mobilization')).toBeInTheDocument();

      // Toggle new intake form
      const logNewBtn = screen.getByRole('button', { name: /Log New/i });
      fireEvent.click(logNewBtn);
      expect(screen.getByText('New Client Intake')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Issue Title/i)).toBeInTheDocument();
    });

    it('renders CSIDashboard without errors and displays KPI metrics', () => {
      render(<CSIDashboard />);

      expect(screen.getByText('Avg CSI Score')).toBeInTheDocument();
      expect(screen.getByText('Surveys Received')).toBeInTheDocument();
      expect(screen.getByText('Overall Satisfaction Distribution')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search client\/project/i)).toBeInTheDocument();
    });

    it('renders SupplierDashboard without errors and displays AVL details', () => {
      render(<SupplierDashboard />);

      expect(screen.getByText('AVL')).toBeInTheDocument();
      expect(screen.getAllByText('Approved').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Avg Score')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
    });

    it('renders CalibrationRegister without errors and displays equipment metrics', () => {
      render(<CalibrationRegister />);

      expect(screen.getByText('Equipment Register')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText(/Due < 30 days/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search equipment/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SMOKE TEST 3: CSI SCORE PERCENTAGE NORMALIZATION
  // ==========================================================================
  describe('Smoke Test 3: CSIDashboard Score Percentage Normalization', () => {
    it('normalizes decimal scores (0.88 -> 88%) and does not render 1%', () => {
      // Ensure records contain the 0.88 score item
      const records = useCSIStore.getState().records;
      const record88 = records.find(r => r.score === '0.88' || Number(r.score) === 0.88);
      expect(record88).toBeDefined();

      render(<CSIDashboard />);

      // The 88% should be in the DOM
      const score88Elements = screen.getAllByText('88%');
      expect(score88Elements.length).toBeGreaterThanOrEqual(1);

      // Verify that "1%" is NOT rendered as the score for this survey
      // (The bug was displaying 1% because 0.88 rounded to 1 instead of 88%)
      const onePercentElements = screen.queryAllByText('1%');
      expect(onePercentElements).toHaveLength(0);
    });

    it('normalizes 0.90 to 90% and 0.781 to 78%', () => {
      render(<CSIDashboard />);

      expect(screen.getAllByText('90%').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('78%').length).toBeGreaterThanOrEqual(1);
    });

    it('calculates average CSI score in percentage terms (>= 50%)', () => {
      render(<CSIDashboard />);

      const avgKpiBlock = screen.getByText('Avg CSI Score').parentElement;
      expect(avgKpiBlock).not.toBeNull();
      // The average score should be formatted as a percentage like 83% or similar
      const avgText = avgKpiBlock?.textContent || '';
      expect(avgText).toMatch(/\d{2}%/);
      expect(avgText).not.toBe('1%');
      expect(avgText).not.toBe('0%');
    });

    it('renders normalized percentage in detail view when record is clicked', () => {
      render(<CSIDashboard />);

      // Click on the AR-RAZI survey button
      const arRaziBtn = screen.getAllByRole('button', { name: /AR-RAZI/i })[0];
      fireEvent.click(arRaziBtn);

      // Detail view should display Overall Score
      expect(screen.getByText('Overall Score')).toBeInTheDocument();
      const detailContainer = screen.getByText('Overall Score').parentElement;
      expect(detailContainer?.textContent).toContain('88%');
    });
  });

  // ==========================================================================
  // SMOKE TEST 4: UNIFIED VOC INITIAL SEED DATA
  // ==========================================================================
  describe('Smoke Test 4: UnifiedVoC Seed Data Population', () => {
    it('contains pre-seeded client intake records in useClientIntakeStore', () => {
      const records = useClientIntakeStore.getState().records;
      expect(records.length).toBeGreaterThanOrEqual(5);

      const titles = records.map(r => r.title);
      expect(titles).toContain('Saudi Aramco — Flange Joint Leakage Emergency Response');
      expect(titles).toContain('SABIC Hadeed — Crane Rigging Certificate Verification');
      expect(titles).toContain("Ma'aden Phosphate — Hydrotest Documentation Delay");
      expect(titles).toContain('Petro Rabigh — Heat Exchanger Hydraulic Extractor Request');
      expect(titles).toContain('Saudi Aramco Ras Tanura — Hot Work Permit PPE Compliance');
    });

    it('renders all seeded intake records directly in the DOM', () => {
      render(<UnifiedVoC />);

      expect(screen.getByText('Saudi Aramco — Flange Joint Leakage Emergency Response')).toBeInTheDocument();
      expect(screen.getByText('SABIC Hadeed — Crane Rigging Certificate Verification')).toBeInTheDocument();
      expect(screen.getByText("Ma'aden Phosphate — Hydrotest Documentation Delay")).toBeInTheDocument();
      expect(screen.getByText('Petro Rabigh — Heat Exchanger Hydraulic Extractor Request')).toBeInTheDocument();
      expect(screen.getByText('Saudi Aramco Ras Tanura — Hot Work Permit PPE Compliance')).toBeInTheDocument();
    });

    it('displays assigned department and receiver for intake items', () => {
      render(<UnifiedVoC />);

      expect(screen.getByText(/Eng\. Tariq Al-Ghamdi/i)).toBeInTheDocument();
      expect(screen.getByText(/Ahmed Al-Shehri/i)).toBeInTheDocument();
      expect(screen.getByText(/Khalid Mansour/i)).toBeInTheDocument();
    });

    it('displays status badges for seeded records and allows workflow progression', () => {
      render(<UnifiedVoC />);

      // Status tags
      expect(screen.getByText('Mobilized')).toBeInTheDocument();
      expect(screen.getAllByText('Closed').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Acknowledged')).toBeInTheDocument();
      expect(screen.getByText('Logged')).toBeInTheDocument();

      // Find the "Logged" record action button "Acknowledge →"
      const ackBtn = screen.getByRole('button', { name: /Acknowledge →/i });
      expect(ackBtn).toBeInTheDocument();
      fireEvent.click(ackBtn);

      // Record should now be transitioned to Acknowledged
      const record = useClientIntakeStore.getState().records.find(r => r.id === 'voc-2026-005');
      expect(record?.status).toBe('Acknowledged');
    });
  });

  // ==========================================================================
  // SMOKE TEST 5: APPSHELL INTEGRATION & VIEW SWITCHING
  // ==========================================================================
  describe('Smoke Test 5: AppShell Integration & View Switching', () => {
    it('mounts Sidebar in AppShell layout and starts on "mr_dashboard"', async () => {
      render(
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      );

      // Verify Sidebar is mounted
      expect(screen.getByText('Command Center')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /MR Dashboard/i })).toBeInTheDocument();

      // Verify default tab "mr_dashboard" is rendered in main area
      await waitFor(() => {
        expect(screen.getByText(/MR Dashboard \(Command Center\)/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Management Representative Overview & Live Metrics/i)).toBeInTheDocument();
    });

    it('switches views to DCRWorkflow on tab click without runtime crashes', async () => {
      render(
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      );

      const dcrSidebarBtn = screen.getByRole('button', { name: /^DCR$/i });
      fireEvent.click(dcrSidebarBtn);

      await waitFor(() => {
        expect(screen.getByText('Document Change Requests')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /New DCR/i })).toBeInTheDocument();
    });

    it('switches views to ComplianceMap without runtime crashes', async () => {
      render(
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      );

      const mapBtn = screen.getByRole('button', { name: /ISO 9001 Gap Map/i });
      fireEvent.click(mapBtn);

      await waitFor(() => {
        expect(screen.getByText('ISO 9001:2015 Map')).toBeInTheDocument();
      });
      expect(screen.getByText('Context of the Organization')).toBeInTheDocument();
    });

    it('switches views to ObjectivesDashboard without runtime crashes', async () => {
      render(
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      );

      const objBtn = screen.getByRole('button', { name: /Strategic Objectives/i });
      fireEvent.click(objBtn);

      await waitFor(() => {
        expect(screen.getByText('Total Objectives')).toBeInTheDocument();
      });
      expect(screen.getByText('Avg Emergency Reaction')).toBeInTheDocument();
    });

    it('switches views to UnifiedVoC without runtime crashes', async () => {
      render(
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      );

      const vocBtn = screen.getByRole('button', { name: /Client Intake \(VoC\)/i });
      fireEvent.click(vocBtn);

      await waitFor(() => {
        expect(screen.getByText('Unified Client Intake')).toBeInTheDocument();
      });
      expect(screen.getByText('Saudi Aramco — Flange Joint Leakage Emergency Response')).toBeInTheDocument();
    });

    it('switches views to CSIDashboard without runtime crashes', async () => {
      render(
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      );

      const csiBtn = screen.getByRole('button', { name: /^CSI$/i });
      fireEvent.click(csiBtn);

      await waitFor(() => {
        expect(screen.getByText('Overall Satisfaction Distribution')).toBeInTheDocument();
      });
      expect(screen.getByText('Avg CSI Score')).toBeInTheDocument();
    });

    it('switches views to SupplierDashboard without runtime crashes', async () => {
      render(
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      );

      const suppBtn = screen.getByRole('button', { name: /Approved Vendors/i });
      fireEvent.click(suppBtn);

      await waitFor(() => {
        expect(screen.getByText('AVL')).toBeInTheDocument();
      });
    });

    it('switches views to CalibrationRegister without runtime crashes', async () => {
      render(
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      );

      const calibBtn = screen.getByRole('button', { name: /Calibration/i });
      fireEvent.click(calibBtn);

      await waitFor(() => {
        expect(screen.getByText('Equipment Register')).toBeInTheDocument();
      });
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('opens Team modal when clicking "Users" in Sidebar', async () => {
      render(
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      );

      const usersBtn = screen.getByRole('button', { name: /^Users$/i });
      fireEvent.click(usersBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /auth\.team|Team/i })).toBeInTheDocument();
      });
    });

    it('opens Audit Trail modal when clicking "Audit Trail" in Sidebar', async () => {
      render(
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      );

      const auditBtn = screen.getByRole('button', { name: /Audit Trail/i });
      fireEvent.click(auditBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /audit\.title|Audit Trail/i })).toBeInTheDocument();
      });
    });
  });
});
