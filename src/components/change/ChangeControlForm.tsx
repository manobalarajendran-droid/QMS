import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { roleHasPermission } from '../../lib/permissions';
import {
  useChangeRequestStore,
  nextChangeNumber,
  type ChangeRequestRecord,
  type ChangeRequestStatus,
} from '../../store/useChangeRequestStore';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { startApprovalFor, activeApprovalFor } from '../../lib/approvalRouting';

const TYPES = ['product', 'process', 'document', 'system'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const STATUS_ORDER = ['initiated', 'assessment', 'approval', 'implementation', 'verification', 'closed'];

const NEXT_STATUS: Record<string, string> = {
  initiated: 'assessment',
  assessment: 'approval',
  approval: 'implementation',
  implementation: 'verification',
  verification: 'closed',
};

interface Props {
  changeControl?: ChangeRequestRecord | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function ChangeControlForm({ changeControl, onSaved, onCancel }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const records = useChangeRequestStore((s) => s.records);
  const addRecord = useChangeRequestStore((s) => s.addRecord);
  const updateRecord = useChangeRequestStore((s) => s.updateRecord);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('document');
  const [description, setDescription] = useState('');
  const [justification, setJustification] = useState('');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [impactAssessment, setImpactAssessment] = useState('');
  const [affectedDocuments, setAffectedDocuments] = useState('');
  const [affectedTraining, setAffectedTraining] = useState('');
  const [affectedValidation, setAffectedValidation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!changeControl;
  const canEdit = roleHasPermission(user?.role, 'canEdit');

  useEffect(() => {
    if (changeControl) {
      setTitle(changeControl.title || '');
      setType(changeControl.type || 'document');
      setDescription(changeControl.description || '');
      setJustification(changeControl.justification || '');
      setRiskLevel(changeControl.riskLevel || 'medium');
      setImpactAssessment(changeControl.impactAssessment || '');
      setAffectedDocuments((changeControl.affectedDocuments || []).join(', '));
      setAffectedTraining((changeControl.affectedTraining || []).join(', '));
      setAffectedValidation((changeControl.affectedValidation || []).join(', '));
    }
  }, [changeControl]);

  const handleSave = () => {
    if (!canEdit) { setError('Insufficient permissions: requires canEdit'); return; }
    if (!title.trim()) { setError(t('changeControl.titleRequired')); return; }
    setSaving(true);
    setError('');

    const asList = (value: string) =>
      value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];

    const fields = {
      title,
      type,
      description,
      justification,
      riskLevel,
      impactAssessment: impactAssessment || null,
      affectedDocuments: asList(affectedDocuments),
      affectedTraining: asList(affectedTraining),
      affectedValidation: asList(affectedValidation),
    };

    if (isEdit && changeControl) {
      updateRecord(changeControl.id, fields);
    } else {
      addRecord({
        ...fields,
        changeNumber: nextChangeNumber(records),
        status: 'initiated',
        tasks: [],
        effectivenessVerified: false,
        raisedBy: user?.name || '',
      });
    }

    setSaving(false);
    onSaved?.();
  };

  const handleAdvanceStatus = () => {
    if (!changeControl || !canEdit) return;
    const next = NEXT_STATUS[changeControl.status];
    if (!next) return;

    const actor = { id: user?.id || '', name: user?.name, role: user?.role };

    // Somebody has pushed the change past approval by hand, so the run sitting
    // in the approvers' inbox is no longer about anything. Close it.
    if (changeControl.status === 'approval') {
      const running = activeApprovalFor('change_control', changeControl.id);
      if (running) {
        useWorkflowStore
          .getState()
          .cancelWorkflow(running.id, actor, 'Change moved on without waiting for the approvers');
      }
    }

    updateRecord(changeControl.id, { status: next as ChangeRequestStatus });

    // Reaching approval is what puts the change in front of the approvers. If
    // nobody has drawn up a route for change requests this does nothing, and
    // the change is advanced by hand as before.
    if (next === 'approval') {
      startApprovalFor('change_control', changeControl.id, changeControl.changeNumber, actor);
    }

    onSaved?.();
  };

  return (
    <div className="rounded-xl border p-4 space-y-5 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-2xl bg-white/20 dark:bg-white/5 animate-fade-in">
      <h3 className="text-lg font-semibold text-text-primary">
        {isEdit ? t('changeControl.edit') : t('changeControl.create')}
      </h3>

      {isEdit && changeControl && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-text-tertiary">{changeControl.changeNumber}</span>
          <div className="flex items-center gap-1">
            {STATUS_ORDER.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${
                  STATUS_ORDER.indexOf(changeControl.status) >= i ? 'bg-accent' : 'bg-border'
                }`} />
                {i < STATUS_ORDER.length - 1 && (
                  <div className={`w-4 h-0.5 ${
                    STATUS_ORDER.indexOf(changeControl.status) > i ? 'bg-accent' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <span className="text-xs text-accent font-medium">{changeControl.status}</span>
          {NEXT_STATUS[changeControl.status] && (
            <button
              onClick={handleAdvanceStatus}
              disabled={saving || !canEdit}
              className="text-xs px-2 py-1 bg-accent text-accent-fg rounded hover:bg-accent/90 transition-colors"
            >
              {t('changeControl.advanceTo', { status: NEXT_STATUS[changeControl.status] })}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 text-danger-text rounded-lg px-4 py-2 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">{t('changeControl.title')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">{t('changeControl.type')}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {(TYPES.includes(type) ? TYPES : [...TYPES, type]).map((tp) => (
              <option key={tp} value={tp}>{t(`changeControl.type_${tp}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">{t('changeControl.description')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canEdit}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">{t('changeControl.justification')}</label>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          disabled={!canEdit}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">{t('changeControl.riskLevel')}</label>
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {RISK_LEVELS.map((rl) => (
              <option key={rl} value={rl}>{rl}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">{t('changeControl.impactAssessment')}</label>
          <input
            type="text"
            value={impactAssessment}
            onChange={(e) => setImpactAssessment(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">{t('changeControl.affectedDocuments')}</label>
          <input
            type="text"
            value={affectedDocuments}
            onChange={(e) => setAffectedDocuments(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder={t('changeControl.commaSeparated')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">{t('changeControl.affectedTraining')}</label>
          <input
            type="text"
            value={affectedTraining}
            onChange={(e) => setAffectedTraining(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder={t('changeControl.commaSeparated')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">{t('changeControl.affectedValidation')}</label>
          <input
            type="text"
            value={affectedValidation}
            onChange={(e) => setAffectedValidation(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder={t('changeControl.commaSeparated')}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !canEdit}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? t('common.saving') : t('common.save')}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
