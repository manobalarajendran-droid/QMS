import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { AlertTriangle, Plus, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { roleHasPermission } from '../../lib/permissions';
import { ComplaintForm } from './ComplaintForm';
import {
  useComplaintStore,
  computeTrending,
  type ComplaintRecord,
} from '../../store/useComplaintStore';
import { StatusBadge } from '../shared/StatusBadge';
import type { BadgeVariant } from '../shared/statusBadgeUtils';

const SEVERITY_VARIANTS: Record<string, BadgeVariant> = {
  critical: 'red',
  major: 'amber',
  minor: 'amber',
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#eab308',
  major: '#f97316',
  critical: '#ef4444',
};

export function ComplaintTrending() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Complaints live in the shared store now, and the trend numbers that the
  // old server worked out are calculated here from the same records.
  const complaints = useComplaintStore((s) => s.records);
  const addRecord = useComplaintStore((s) => s.addRecord);
  const updateRecord = useComplaintStore((s) => s.updateRecord);

  const [showForm, setShowForm] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<ComplaintRecord | null>(null);
  const [error, setError] = useState('');
  const canEdit = roleHasPermission(user?.role, 'canEdit');

  const trending = useMemo(() => computeTrending(complaints), [complaints]);

  const handleSave = (data: Partial<ComplaintRecord> & { id?: string }) => {
    if (!canEdit) {
      setError('Insufficient permissions: requires canEdit');
      return;
    }
    if (data.id) {
      updateRecord(data.id, data);
    } else {
      addRecord({
        productName: data.productName || '',
        reportDate: data.reportDate || new Date().toISOString().slice(0, 10),
        severity: data.severity || 'minor',
        description: data.description || '',
        reporterType: data.reporterType || 'customer',
        investigationStatus: data.investigationStatus || 'open',
        rootCause: data.rootCause,
      });
    }
    setShowForm(false);
    setEditingComplaint(null);
    setError('');
  };

  const severityPieData = Object.entries(trending.bySeverity)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: t(`complaints.sev_${name}`), value, fill: SEVERITY_COLORS[name] }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">{t('complaints.title')}</h2>
        </div>
        {canEdit && (
          <button
            onClick={() => { setEditingComplaint(null); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent-fg bg-accent rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('complaints.addComplaint')}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-text-tertiary font-medium uppercase">{t('complaints.totalComplaints')}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{trending.total}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-text-tertiary font-medium uppercase">{t('complaints.openComplaints')}</p>
          <p className="text-2xl font-bold text-warning-text mt-1">{trending.openCount}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-text-tertiary font-medium uppercase">{t('complaints.closedComplaints')}</p>
          <p className="text-2xl font-bold text-success-text mt-1">{trending.closedCount}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-text-tertiary" />
            <p className="text-xs text-text-tertiary font-medium uppercase">{t('complaints.mttr')}</p>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-1">{trending.meanTimeToResolution}d</p>
        </div>
      </div>

      {/* Charts Row */}
      {trending.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Complaints by Month */}
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-accent" />
              {t('complaints.byMonth')}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trending.byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* By Severity (Pie) */}
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">{t('complaints.bySeverity')}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={severityPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>
                  {severityPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* By Product (Bar) */}
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">{t('complaints.byProduct')}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trending.byProduct}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="product" tick={{ fontSize: 10 }} stroke="var(--color-text-tertiary)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Complaints List */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('complaints.productName')}</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('complaints.severity')}</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('complaints.status')}</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('complaints.reportDate')}</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-center text-text-tertiary">
                  {t('complaints.noComplaints')}
                </td>
              </tr>
            ) : (
              complaints.map((comp) => (
                <tr key={comp.id} className="border-b border-border hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-text-primary font-medium">{comp.productName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={SEVERITY_VARIANTS[comp.severity] || 'gray'}
                      status={t(`complaints.sev_${comp.severity}`)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t(`complaints.status_${comp.investigationStatus}`)} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(comp.reportDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit && (
                      <button
                        onClick={() => { setEditingComplaint(comp); setShowForm(true); }}
                        className="text-xs text-accent hover:underline"
                      >
                        {t('common.edit')}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ComplaintForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingComplaint(null); }}
        onSave={handleSave}
        initialData={editingComplaint}
      />
    </div>
  );
}
