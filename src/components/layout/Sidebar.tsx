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
      : { name: 'Plant-Tech MR', role: 'Management Representative' };

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
        { id: 'mr_dashboard', label: 'MR Dashboard', icon: <ShieldCheck className="w-5 h-5 shrink-0" /> },
        { id: 'voc', label: 'Client Intake (VoC)', icon: <Server className="w-5 h-5 shrink-0" /> },
      ],
    },
    {
      id: 'quality_core',
      label: 'Quality Core',
      items: [
        { id: 'deviations', label: 'NCR / CAPA', icon: <AlertTriangle className="w-5 h-5 shrink-0" /> },
        { id: 'audit_records', label: 'Internal Audits', icon: <ClipboardCheck className="w-5 h-5 shrink-0" /> },
        { id: 'tuv_tracker', label: 'TÜV Tracker', icon: <CheckSquare className="w-5 h-5 shrink-0" /> },
      ],
    },
    {
      id: 'document_control',
      label: 'Document Control',
      items: [
        { id: 'dml_manager', label: 'Document Master List', icon: <FileText className="w-5 h-5 shrink-0" /> },
        { id: 'dcr_workflow', label: 'DCR', icon: <Layers className="w-5 h-5 shrink-0" /> },
        { id: 'compliance_map', label: 'ISO 9001 Gap Map', icon: <ShieldCheck className="w-5 h-5 shrink-0" /> },
      ],
    },
    {
      id: 'mrm',
      label: 'Management Review',
      items: [
        { id: 'mrm_manager', label: 'MRM Meetings', icon: <Landmark className="w-5 h-5 shrink-0" /> },
        { id: 'objectives', label: 'Strategic Objectives', icon: <Target className="w-5 h-5 shrink-0" /> },
      ],
    },
    {
      id: 'performance',
      label: 'Performance',
      items: [
        { id: 'pms', label: 'CSI', icon: <CheckSquare className="w-5 h-5 shrink-0" /> },
        { id: 'suppliers', label: 'Approved Vendors', icon: <Building2 className="w-5 h-5 shrink-0" /> },
        { id: 'calibration_register', label: 'Calibration', icon: <Settings className="w-5 h-5 shrink-0" /> },
      ],
    },
    {
      id: 'admin',
      label: 'Administration',
      items: [
        { id: 'users', label: 'Users', icon: <Users className="w-5 h-5 shrink-0" /> },
        { id: 'audit_trail', label: 'Audit Trail', icon: <ScrollText className="w-5 h-5 shrink-0" /> },
        { id: 'import_v12', label: 'V12 Data Import', icon: <Upload className="w-5 h-5 shrink-0" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5 shrink-0" /> },
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
      className={`bg-slate-900 border-r border-slate-800 h-full flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
        {!collapsed && <span className="font-bold text-slate-100 truncate">Menu</span>}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors mx-auto"
        >
          {collapsed ? <PanelRightClose className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-6 scrollbar-none">
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {!collapsed ? (
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-200 transition-colors"
              >
                <span className="truncate">{group.label}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${expandedGroups[group.id] ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            ) : (
              <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center w-full truncate border-b border-slate-800 pb-1">
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
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-accent-subtle text-accent font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                      } ${collapsed ? 'justify-center' : 'justify-start'}`}
                    >
                      <span className={isActive ? 'text-accent' : 'text-slate-400 group-hover:text-slate-300'}>
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
      <div data-testid="sidebar-user-profile" className="mt-auto border-t border-slate-800 p-3 shrink-0">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-1'}`}>
          <div 
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-indigo-500/20 shrink-0" 
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-100 truncate">{user.name}</div>
              <div className="text-xs text-slate-400 truncate capitalize">{user.role.replace('_', ' ')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
