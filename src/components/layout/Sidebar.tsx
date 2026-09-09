import { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, ClipboardCheck, 
  FileText, Landmark, Users, Settings, ScrollText, 
  Building2, Server, ChevronDown, CheckSquare, Layers, Target, Upload, PanelLeftClose, PanelRightClose
} from 'lucide-react';
import type { ViewTab } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';

interface SidebarProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  setShowTeam: (show: boolean) => void;
  setShowAuditTrail: (show: boolean) => void;
}

type NavGroup = {
  id: string;
  label: string;
  items: {
    id: ViewTab | 'users' | 'audit_trail';
    label: string;
    icon: React.ReactNode;
  }[];
};

export function Sidebar({ activeTab, setActiveTab, setShowTeam, setShowAuditTrail }: SidebarProps) {
  const { user: authUser } = useAuth();
  const localUser = useAuthStore((s) => s.currentUser);
  const user = authUser
    ? { name: authUser.name, role: authUser.role }
    : localUser
      ? { name: localUser.displayName, role: localUser.role }
      : { name: 'Plant-Tech MR', role: 'admin' };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'command_center': true,
    'quality_core': true,
    'document_control': true,
    'mrm': true,
    'performance': true,
    'admin': true,
  });

  const [collapsed, setCollapsed] = useState(false);

  const toggleGroup = (id: string) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedGroups(prev => ({ ...prev, [id]: true }));
      return;
    }
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const navGroups: NavGroup[] = [
    {
      id: 'command_center',
      label: 'Command Center',
      items: [
        { id: 'mr_dashboard', label: 'MR Dashboard', icon: <ShieldCheck className="h-4 w-4 shrink-0" /> },
        { id: 'voc', label: 'Client Intake (VoC)', icon: <Server className="h-4 w-4 shrink-0" /> },
      ],
    },
    {
      id: 'quality_core',
      label: 'Quality Core',
      items: [
        { id: 'deviations', label: 'NCR / CAPA', icon: <AlertTriangle className="h-4 w-4 shrink-0" /> },
        { id: 'audit_records', label: 'Internal Audits', icon: <ClipboardCheck className="h-4 w-4 shrink-0" /> },
        { id: 'tuv_tracker', label: 'TÜV Tracker', icon: <CheckSquare className="h-4 w-4 shrink-0" /> },
      ],
    },
    {
      id: 'document_control',
      label: 'Document Control',
      items: [
        { id: 'dml_manager', label: 'Document Master List', icon: <FileText className="h-4 w-4 shrink-0" /> },
        { id: 'dcr_workflow', label: 'DCR', icon: <Layers className="h-4 w-4 shrink-0" /> },
        { id: 'compliance_map', label: 'ISO 9001 Gap Map', icon: <ShieldCheck className="h-4 w-4 shrink-0" /> },
      ],
    },
    {
      id: 'mrm',
      label: 'Management Review',
      items: [
        { id: 'mrm_manager', label: 'MRM Meetings', icon: <Landmark className="h-4 w-4 shrink-0" /> },
        { id: 'objectives', label: 'Strategic Objectives', icon: <Target className="h-4 w-4 shrink-0" /> },
      ],
    },
    {
      id: 'performance',
      label: 'Performance',
      items: [
        { id: 'pms', label: 'CSI', icon: <CheckSquare className="h-4 w-4 shrink-0" /> },
        { id: 'suppliers', label: 'Approved Vendors', icon: <Building2 className="h-4 w-4 shrink-0" /> },
        { id: 'calibration_register', label: 'Calibration', icon: <Settings className="h-4 w-4 shrink-0" /> },
      ],
    },
    {
      id: 'admin',
      label: 'Administration',
      items: [
        { id: 'users', label: 'Users', icon: <Users className="h-4 w-4 shrink-0" /> },
        { id: 'audit_trail', label: 'Audit Trail', icon: <ScrollText className="h-4 w-4 shrink-0" /> },
        { id: 'import_v12', label: 'V12 Data Import', icon: <Upload className="h-4 w-4 shrink-0" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4 shrink-0" /> },
      ],
    },
  ];

  const handleItemClick = (id: ViewTab | 'users' | 'audit_trail') => {
    if (id === 'users') {
      setShowTeam(true);
    } else if (id === 'audit_trail') {
      setShowAuditTrail(true);
    } else {
      setActiveTab(id as ViewTab);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, var(--color-sidebar-grad-from) 0%, var(--color-sidebar-grad-via) 55%, var(--color-sidebar-grad-to) 100%)',
      }}
      className={`border-r border-white/10 h-full flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3">
        {!collapsed && <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">Navigation</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-auto rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <PanelRightClose className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="scrollbar-none flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-2.5">
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {!collapsed ? (
              <button
                onClick={() => toggleGroup(group.id)}
                className="mb-1 flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45 transition-colors hover:text-white/80"
              >
                <span className="truncate">{group.label}</span>
                <ChevronDown className={`h-3 w-3 shrink-0 text-white/50 transition-transform duration-200 ${expandedGroups[group.id] ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            ) : (
              <div className="px-2 text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 text-center w-full truncate border-b border-white/10 pb-1">
                {group.label.charAt(0)}
              </div>
            )}

            {(expandedGroups[group.id] || collapsed) && (
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      data-tab={item.id}
                      onClick={() => handleItemClick(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12.5px] font-medium transition-colors ${
                        isActive
                          ? 'bg-white/15 font-semibold text-white'
                          : 'text-[color:var(--color-sidebar-text)] hover:bg-white/10 hover:text-white'
                      } ${collapsed ? 'justify-center' : 'justify-start'}`}
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1 left-0 top-1 w-[2px] rounded-full"
                          style={{ background: 'var(--color-sidebar-active-rail)' }}
                        />
                      )}
                      <span className={isActive ? 'text-white' : 'text-[color:var(--color-sidebar-text)]'}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom User Profile Section */}
      <div data-testid="sidebar-user-profile" className="mt-auto shrink-0 border-t border-white/10 p-2.5">
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'px-1'}`}>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[color:var(--color-sidebar-grad-from)] to-[color:var(--color-sidebar-active-rail)] text-[11px] font-bold text-white ring-1 ring-white/20"
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="truncate text-[12.5px] font-semibold text-white">{user.name}</div>
              <div className="truncate text-[11px] capitalize text-white/50">{user.role.replace('_', ' ')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
