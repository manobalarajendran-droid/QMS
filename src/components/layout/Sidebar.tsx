import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, PanelLeftClose, PanelRightClose, Search, X } from 'lucide-react';
import type { ViewTab } from '../../types';
import { navigate } from '../../lib/router';
import { visibleGroups } from '../../lib/nav';
import { useInbox, countInbox, isMine } from '../../lib/inbox';
import { useCurrentUser } from '../../hooks/useCurrentUser';

interface SidebarProps {
  activeScreen: ViewTab;
  onOpenSearch: () => void;
  /** Phone only: the menu is open as a drawer. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eead4] focus-visible:ring-offset-0';

function useBadges(): Partial<Record<ViewTab, number>> {
  const items = useInbox();
  const me = useCurrentUser();
  return useMemo(() => {
    const mine = items.filter((i) => isMine(i, me.name));
    const mineCounts = countInbox(mine);
    const canApprove = me.can.canApprove;
    const approvals = canApprove ? countInbox(items).approvals : mineCounts.approvals;
    return { today: mineCounts.overdue + mineCounts.week, approvals };
  }, [items, me.name, me.role]);
}

export function Sidebar({ activeScreen, onOpenSearch, mobileOpen, onCloseMobile }: SidebarProps) {
  const me = useCurrentUser();
  const groups = useMemo(() => visibleGroups(me.role), [me.role]);
  const badges = useBadges();
  const [collapsed, setCollapsed] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.filter((g) => g.startClosed).map((g) => [g.id, true])),
  );

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseMobile(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onCloseMobile]);

  const narrow = collapsed && !mobileOpen;
  const open = (id: ViewTab) => {
    navigate(id);
    onCloseMobile();
  };
  const toggleGroup = (id: string) => setClosedGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const shell = mobileOpen
    ? 'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] shadow-2xl'
    : `hidden md:flex ${narrow ? 'w-14' : 'w-56'}`;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" aria-hidden="true" onClick={onCloseMobile} />
      )}
      <nav
        aria-label="Main menu"
        className={`${shell} h-full shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#0b2138]/95 via-[#0e3450]/92 to-[#11485c]/90 backdrop-blur-2xl backdrop-saturate-200 transition-[width] duration-200 md:from-[#0b2138]/82 md:via-[#0e3450]/80 md:to-[#11485c]/78`}
      >
        <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-white/10 px-2.5">
          {!narrow && (
            <button
              type="button"
              onClick={() => { onCloseMobile(); onOpenSearch(); }}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5 text-left text-[12px] text-white/75 transition-colors hover:bg-white/15 hover:text-white ${FOCUS}`}
            >
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">Search or jump</span>
              <kbd className="hidden rounded border border-white/20 px-1 text-[10px] text-white/60 md:inline">Ctrl K</kbd>
            </button>
          )}
          {mobileOpen ? (
            <button type="button" onClick={onCloseMobile} aria-label="Close menu" className={`rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white ${FOCUS}`}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Widen menu' : 'Narrow menu'}
              aria-expanded={!collapsed}
              className={`mx-auto rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white ${FOCUS}`}
            >
              {collapsed ? <PanelRightClose className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
            </button>
          )}
        </div>

        <div className="scrollbar-rail flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-2.5">
          {groups.map((group) => {
            const shut = !narrow && closedGroups[group.id];
            const listId = `nav-group-${group.id}`;
            return (
              <div key={group.id}>
                {narrow ? (
                  <div className="mb-1 border-b border-white/10" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!shut}
                    aria-controls={listId}
                    className={`mb-1 flex w-full items-center justify-between rounded px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/60 transition-colors hover:text-white ${FOCUS}`}
                  >
                    <span className="truncate">{group.label}</span>
                    <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${shut ? '-rotate-90' : ''}`} aria-hidden="true" />
                  </button>
                )}
                {!shut && (
                  <ul id={listId} className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = item.screens.includes(activeScreen);
                      const count = badges[item.id] ?? 0;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            data-tab={item.id}
                            onClick={() => open(item.id)}
                            title={narrow ? item.label : undefined}
                            aria-label={narrow ? item.label : undefined}
                            aria-current={active ? 'page' : undefined}
                            className={`relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12.5px] font-medium transition-colors ${FOCUS} ${
                              active ? 'bg-white/15 font-semibold text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                            } ${narrow ? 'justify-center' : ''}`}
                          >
                            {active && <span aria-hidden="true" className="absolute bottom-1 left-0 top-1 w-[2px] rounded-full bg-[#2dd4bf]" />}
                            {item.icon}
                            {!narrow && <span className="flex-1 truncate text-left">{item.label}</span>}
                            {!narrow && count > 0 && (
                              <span className="rounded-full bg-white/15 px-1.5 text-[10.5px] font-semibold tabular-nums text-white">
                                {count}
                                <span className="sr-only"> open</span>
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div data-testid="sidebar-user-profile" className="mt-auto shrink-0 border-t border-white/10 p-2.5">
          <div className={`flex items-center gap-2.5 ${narrow ? 'justify-center' : 'px-1'}`}>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#0b2138] to-[#2dd4bf] text-[11px] font-bold text-white ring-1 ring-white/20"
              title={me.name || 'Signed in'}
              aria-hidden="true"
            >
              {(me.name || '?').charAt(0).toUpperCase()}
            </div>
            {!narrow && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-white">{me.name || 'Signed in'}</div>
                <div className="truncate text-[11px] capitalize text-white/60">{me.role.replace(/_/g, ' ')}</div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
