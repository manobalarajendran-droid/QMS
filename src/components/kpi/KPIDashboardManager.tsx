import { useState } from 'react';
import { useRouteRecord } from '../../lib/router';
import { useTranslation } from 'react-i18next';
import { Plus, BarChart3, Lock, Globe, Trash2, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { roleHasPermission } from '../../lib/permissions';
import { useKPIStore } from '../../store/useKPIStore';
import { KPIDashboardView } from './KPIDashboardView';

/**
 * The list of saved KPI dashboards.
 *
 * Dashboards used to be kept on a server that is not deployed, so this screen
 * only ever showed an error. They are kept with the rest of the records now.
 */
export function KPIDashboardManager() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const dashboards = useKPIStore((s) => s.records);
  const addRecord = useKPIStore((s) => s.addRecord);
  const deleteRecord = useKPIStore((s) => s.deleteRecord);

  const [creating, setCreating] = useState(false);
  const [selectedDashboardId, setSelectedDashboardId] = useRouteRecord('kpi');

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPublic, setNewPublic] = useState(true);
  const [error, setError] = useState('');
  const canEdit = roleHasPermission(user?.role, 'canEdit');
  const canAdmin = roleHasPermission(user?.role, 'canAdmin');
  // Same rule as the server: only roles that can delete may withdraw a dashboard.
  const canDelete = roleHasPermission(user?.role, 'canDelete');

  const handleCreate = () => {
    if (!canEdit) {
      setError('Insufficient permissions: requires canEdit');
      return;
    }
    if (!newName.trim()) {
      setError(t('kpi.nameRequired'));
      return;
    }
    setError('');
    const created = addRecord({
      name: newName.trim(),
      description: newDesc.trim(),
      createdBy: user?.id || '',
      createdByName: user?.name || '',
      isPublic: newPublic,
      widgets: [],
    });
    setCreating(false);
    setNewName('');
    setNewDesc('');
    setNewPublic(true);
    setSelectedDashboardId(created.id);
  };

  const handleDelete = (id: string, name: string) => {
    if (!canDelete) return;
    if (!window.confirm(`Remove the dashboard "${name}"? It is kept on the server for the audit trail.`)) return;
    deleteRecord(id);
  };

  // If a dashboard is selected, show the dashboard view
  if (selectedDashboardId) {
    return (
      <KPIDashboardView
        dashboardId={selectedDashboardId}
        onBack={() => setSelectedDashboardId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">{t('kpi.title')}</h2>
          <p className="text-sm text-text-secondary">{t('kpi.subtitle')}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-accent-fg bg-accent rounded-lg hover:bg-accent/90 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('kpi.createDashboard')}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create Form */}
      {creating && (
        <div className="rounded-xl border p-4 space-y-4 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-2xl bg-white/20 dark:bg-white/5 animate-fade-in">
          <h3 className="text-lg font-semibold text-text-primary">{t('kpi.createDashboard')}</h3>
          {error && (
            <div className="bg-red-500/10 text-danger-text rounded-lg px-4 py-2 text-sm">{error}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">{t('kpi.dashboardName')}</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t('kpi.dashboardNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">{t('kpi.description')}</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t('kpi.descriptionPlaceholder')}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newPublic}
              onChange={(e) => setNewPublic(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm text-text-secondary">{t('kpi.publicDashboard')}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-accent text-accent-fg rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
            >
              {t('kpi.create')}
            </button>
            <button
              onClick={() => { setCreating(false); setError(''); }}
              className="px-4 py-2 text-sm text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Dashboard List */}
      {dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-text-tertiary">
          <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">{t('kpi.noDashboards')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((dash) => (
            <div
              key={dash.id}
              className="rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer group relative backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-2xl bg-white/20 dark:bg-white/5 animate-fade-in"
              onClick={() => setSelectedDashboardId(dash.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary truncate">{dash.name}</h3>
                  {dash.description && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{dash.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  {dash.isPublic ? (
                    <Globe className="w-3.5 h-3.5 text-success-text" aria-label={t('kpi.public')} />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-text-tertiary" aria-label={t('kpi.private')} />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 text-xs text-text-tertiary">
                <span className="inline-flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {t('kpi.widgetCount', { count: dash.widgets.length })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {dash.createdBy === user?.id ? t('kpi.you') : dash.createdByName || '-'}
                </span>
              </div>

              {/* Delete button — only visible on hover */}
              {canDelete && (dash.createdBy === user?.id || canAdmin) && (
                <button
                  type="button"
                  aria-label={`Remove dashboard ${dash.name}`}
                  onClick={(e) => { e.stopPropagation(); handleDelete(dash.id, dash.name); }}
                  className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger-text transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
