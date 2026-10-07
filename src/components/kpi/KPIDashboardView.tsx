import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { roleHasPermission } from '../../lib/permissions';
import { useKPIStore } from '../../store/useKPIStore';
import { computeWidgetData, useMetricSources } from '../../lib/kpiMetrics';
import { KPIWidgetCard } from './KPIWidgetCard';
import { KPIBuilder } from './KPIBuilder';

interface Props {
  dashboardId: string;
  onBack: () => void;
}

/**
 * One dashboard and its cards.
 *
 * The numbers are worked out from the live records, so a card is already up
 * to date by the time it is drawn. Refresh is still there because anything
 * counted against today's date - overdue, due soon - changes as the day
 * passes without anybody editing a record.
 */
export function KPIDashboardView({ dashboardId, onBack }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const dashboard = useKPIStore((s) => s.records.find((d) => d.id === dashboardId));
  const updateRecord = useKPIStore((s) => s.updateRecord);
  const sources = useMetricSources();

  const [addingWidget, setAddingWidget] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(0);

  const widgetData = useMemo(() => {
    void refreshedAt;
    const map = new Map<string, ReturnType<typeof computeWidgetData>>();
    for (const widget of dashboard?.widgets || []) {
      map.set(widget.id, computeWidgetData(widget, sources));
    }
    return map;
  }, [dashboard, sources, refreshedAt]);

  const getWidgetData = (widgetId: string) =>
    widgetData.get(widgetId) || { labels: [], values: [], total: 0 };

  const deleteWidget = (widgetId: string) => {
    if (!dashboard) return;
    updateRecord(dashboard.id, {
      widgets: dashboard.widgets.filter((w) => w.id !== widgetId),
    });
  };

  const handleWidgetSaved = () => {
    setAddingWidget(false);
    setEditingWidgetId(null);
  };

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const canManage = !!user
    && roleHasPermission(user.role, 'canEdit')
    && (dashboard.createdBy === user.id || roleHasPermission(user.role, 'canAdmin'));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-text-primary">{dashboard.name}</h2>
            {dashboard.description && (
              <p className="text-sm text-text-secondary">{dashboard.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshedAt(Date.now())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('kpi.refresh')}
          </button>
          {canManage && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                editMode
                  ? 'text-accent bg-accent-subtle'
                  : 'text-text-secondary bg-surface border border-border hover:bg-surface-hover'
              }`}
            >
              <Edit className="w-4 h-4" />
              {editMode ? t('kpi.doneEditing') : t('kpi.editDashboard')}
            </button>
          )}
          {editMode && canManage && (
            <button
              onClick={() => setAddingWidget(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent-fg bg-accent rounded-lg hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('kpi.addWidget')}
            </button>
          )}
        </div>
      </div>

      {/* Widget Builder */}
      {addingWidget && (
        <KPIBuilder
          dashboardId={dashboardId}
          onSaved={handleWidgetSaved}
          onCancel={() => setAddingWidget(false)}
        />
      )}

      {editingWidgetId && (
        <KPIBuilder
          dashboardId={dashboardId}
          widgetId={editingWidgetId}
          existingWidget={dashboard.widgets.find((w) => w.id === editingWidgetId)}
          onSaved={handleWidgetSaved}
          onCancel={() => setEditingWidgetId(null)}
        />
      )}

      {/* Widget Grid */}
      {dashboard.widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-text-tertiary">
          <p className="text-sm">{t('kpi.noWidgets')}</p>
          {!addingWidget && canManage && (
            <button
              onClick={() => setAddingWidget(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent bg-accent-subtle rounded-lg hover:bg-accent/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('kpi.addWidget')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dashboard.widgets.map((widget) => (
            <div key={widget.id} className={`relative ${widget.size === 'large' ? 'md:col-span-2' : ''}`}>
              {editMode && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                  <button
                    onClick={() => setEditingWidgetId(widget.id)}
                    className="p-1 rounded bg-surface/80 backdrop-blur-sm text-text-tertiary hover:text-accent transition-colors border border-border"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteWidget(widget.id)}
                    className="p-1 rounded bg-surface/80 backdrop-blur-sm text-text-tertiary hover:text-danger-text transition-colors border border-border"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <KPIWidgetCard widget={widget} data={getWidgetData(widget.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
