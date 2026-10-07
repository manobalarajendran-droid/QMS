import { useState, useMemo } from 'react';
import { useRouteRecord } from '../../lib/router';
import { useTranslation } from 'react-i18next';
import { Inbox, CheckCircle2, XCircle, UserPlus, Clock, Plus, Settings2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { roleHasPermission } from '../../lib/permissions';
import { useWorkflowStore, pendingApprovalsFor } from '../../store/useWorkflowStore';
import { settleApproval } from '../../lib/approvalRouting';
import type { WorkflowInstance, WorkflowDefinition } from '../../types';
import { WorkflowBuilder } from './WorkflowBuilder';
import { WorkflowStatus } from './WorkflowStatus';

/**
 * The approvals waiting on you.
 *
 * These used to be asked for from a server that is not part of the deployed
 * app, so this screen only ever showed an error. The routes and the runs both
 * live in the app now, in `store/useWorkflowStore.ts`.
 *
 * A row only appears here if the step in front of the run is actually yours -
 * handed to you, or in your role, or open to anybody - and you have not
 * already acted on it.
 */

interface ExecutionItem {
  id: string;
  entityType: string;
  entityId: string;
  currentStep: number;
  status: string;
  startedAt: string;
  /** When the run reached the step it is on. The clock for the step runs from here. */
  stepStartedAt: string;
  template: {
    name: string;
    steps: {
      id: string;
      order: number;
      name: string;
      type: string;
      assigneeRole: string;
      requiredApprovers: number;
      slaHours: number | null;
      escalateTo: string | null;
    }[];
  };
  actions: {
    id: string;
    stepOrder: number;
    userId: string;
    userName: string;
    action: string;
    reason: string | null;
    timestamp: string;
  }[];
}

/** Turn a run and its route into the flat shape this screen and the progress bar read. */
function toExecutionItem(instance: WorkflowInstance, def: WorkflowDefinition): ExecutionItem {
  const steps = def.steps.map((step, order) => ({
    id: step.id,
    order,
    name: step.name,
    type: step.type,
    assigneeRole: step.assigneeRole || '',
    requiredApprovers: step.requiredApprovers,
    slaHours: step.slaHours ?? null,
    escalateTo: step.escalateTo ?? null,
  }));
  const orderOf = (stepId: string) => steps.findIndex((s) => s.id === stepId);

  const actions = [
    ...instance.approvals.map((a, i) => ({
      id: instance.id + '-a' + i,
      stepOrder: orderOf(a.stepId),
      userId: a.userId,
      userName: a.userName || a.userId,
      action: a.action,
      reason: a.reason ?? null,
      timestamp: a.timestamp,
    })),
    ...(instance.delegations || []).map((d, i) => ({
      id: instance.id + '-d' + i,
      stepOrder: orderOf(d.stepId),
      userId: d.byUserId,
      userName: d.byUserName || d.byUserId,
      action: 'delegated',
      reason: d.reason ?? null,
      timestamp: d.at,
    })),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // The last thing that happened is when the current step started waiting.
  const lastAt = actions.length > 0 ? actions[actions.length - 1].timestamp : instance.startedAt;

  return {
    id: instance.id,
    entityType: instance.entityType,
    entityId: instance.entityId,
    currentStep: instance.currentStepIndex,
    status: instance.status,
    startedAt: instance.startedAt,
    stepStartedAt: lastAt,
    template: { name: instance.entityLabel ? def.name + ' - ' + instance.entityLabel : def.name, steps },
    actions,
  };
}

export function WorkflowInbox() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const members = useTeamMembers();

  const instances = useWorkflowStore((s) => s.instances);
  const definitions = useWorkflowStore((s) => s.definitions);
  const approveStep = useWorkflowStore((s) => s.approveStep);
  const delegateStep = useWorkflowStore((s) => s.delegateStep);
  const removeDefinition = useWorkflowStore((s) => s.removeDefinition);

  const [error, setError] = useState('');
  const [view, setView] = useState<'inbox' | 'templates'>('inbox');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | undefined>();
  const [actionReason, setActionReason] = useState<Record<string, string>>({});
  const [delegateTo, setDelegateTo] = useState<Record<string, string>>({});
  const [selectedExecutionId, setSelectedExecutionId] = useRouteRecord('workflows');

  const canAdmin = roleHasPermission(user?.role, 'canAdmin');

  const actor = useMemo(
    () => ({ id: user?.id || '', name: user?.name, role: user?.role }),
    [user?.id, user?.name, user?.role],
  );

  const pending = useMemo(() => {
    if (!user) return [];
    return pendingApprovalsFor(instances, definitions, actor)
      .map((instance) => {
        const def = definitions.find((d) => d.id === instance.workflowId);
        return def ? toExecutionItem(instance, def) : null;
      })
      .filter((item): item is ExecutionItem => item !== null);
  }, [instances, definitions, actor, user]);

  const templates = definitions;

  const selectedExecution = useMemo(() => {
    if (!selectedExecutionId) return null;
    const instance = instances.find((i) => i.id === selectedExecutionId);
    if (!instance) return null;
    const def = definitions.find((d) => d.id === instance.workflowId);
    return def ? toExecutionItem(instance, def) : null;
  }, [selectedExecutionId, instances, definitions]);

  const handleAction = (executionId: string, action: string) => {
    if (!user) return;
    const reason = actionReason[executionId] || '';

    if (action === 'delegated') {
      const typed = (delegateTo[executionId] || '').trim();
      if (!typed) {
        setError(t('workflows.delegateToPlaceholder'));
        return;
      }
      // The box takes free text, so match it against the people an admin has
      // switched on - by name, by email, or by id.
      const needle = typed.toLowerCase();
      const match = members.find(
        (m) =>
          m.id === typed ||
          m.email.toLowerCase() === needle ||
          m.name.toLowerCase() === needle,
      ) || members.find((m) => m.name.toLowerCase().includes(needle));

      if (!match) {
        setError(`No active user matches "${typed}"`);
        return;
      }
      delegateStep(executionId, actor, match.id, match.name, reason);
      setDelegateTo({ ...delegateTo, [executionId]: '' });
    } else {
      approveStep(executionId, actor, action === 'approved' ? 'approved' : 'rejected', reason);
      // If that was the last word on this run, the record it was about has to
      // move on too.
      settleApproval(executionId);
    }

    setError('');
    setActionReason({ ...actionReason, [executionId]: '' });
  };

  const deleteTemplate = (id: string) => {
    if (!canAdmin) {
      setError('Insufficient permissions: requires canAdmin');
      return;
    }
    removeDefinition(id);
    setError('');
  };

  const getSlaRemaining = (exec: ExecutionItem) => {
    const step = exec.template.steps[exec.currentStep];
    if (!step?.slaHours) return null;
    const startedAt = new Date(exec.stepStartedAt).getTime();
    const deadline = startedAt + step.slaHours * 60 * 60 * 1000;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return t('workflows.overdue');
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  if (showBuilder) {
    return (
      <WorkflowBuilder
        templateId={editTemplateId}
        onSaved={() => { setShowBuilder(false); setEditTemplateId(undefined); }}
        onCancel={() => { setShowBuilder(false); setEditTemplateId(undefined); }}
      />
    );
  }

  if (selectedExecution) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedExecutionId(null)}
          className="text-sm text-accent hover:underline"
        >
          {t('common.back')}
        </button>
        <WorkflowStatus
          steps={selectedExecution.template.steps}
          currentStep={selectedExecution.currentStep}
          status={selectedExecution.status}
          actions={selectedExecution.actions}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex items-center gap-4 border-b border-border pb-2">
        <button
          onClick={() => setView('inbox')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-t-lg transition-colors ${
            view === 'inbox'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Inbox className="w-4 h-4" />
          {t('workflows.inbox')} ({pending.length})
        </button>
        <button
          onClick={() => setView('templates')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-t-lg transition-colors ${
            view === 'templates'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          {t('workflows.templates')} ({templates.length})
        </button>
      </div>

      {view === 'inbox' && (
        <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>{t('workflows.noInboxItems')}</p>
            </div>
          ) : (
            pending.map((exec) => {
              const currentStepDef = exec.template.steps[exec.currentStep];
              const sla = getSlaRemaining(exec);
              return (
                <div key={exec.id} className="bg-surface rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">{exec.template.name}</h4>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {exec.entityType.replace(/_/g, ' ')} &middot; {t('workflows.stepN', { n: exec.currentStep + 1 })}: {currentStepDef?.name || ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sla && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          sla === t('workflows.overdue') ? 'bg-red-500/10 text-danger-text' : 'bg-yellow-500/10 text-warning-text'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {sla}
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedExecutionId(exec.id)}
                        className="text-xs text-accent hover:underline"
                      >
                        {t('workflows.viewProgress')}
                      </button>
                    </div>
                  </div>

                  {/* Reason input */}
                  <div>
                    <input
                      type="text"
                      value={actionReason[exec.id] || ''}
                      onChange={(e) => setActionReason({ ...actionReason, [exec.id]: e.target.value })}
                      className="w-full px-3 py-1.5 bg-surface-secondary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder={t('workflows.reasonPlaceholder')}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleAction(exec.id, 'approved')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-success text-success-fg rounded-lg hover:bg-success/90 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('workflows.approve')}
                    </button>
                    <button
                      onClick={() => handleAction(exec.id, 'rejected')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-danger text-danger-fg rounded-lg hover:bg-danger/90 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {t('workflows.reject')}
                    </button>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={delegateTo[exec.id] || ''}
                        onChange={(e) => setDelegateTo({ ...delegateTo, [exec.id]: e.target.value })}
                        className="px-2 py-1.5 bg-surface-secondary border border-border rounded text-text-primary text-xs w-32 focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder={t('workflows.delegateToPlaceholder')}
                      />
                      <button
                        onClick={() => handleAction(exec.id, 'delegated')}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
                      >
                        <UserPlus className="w-3 h-3" />
                        {t('workflows.delegate')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {view === 'templates' && (
        <div className="space-y-4">
          {canAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => { setEditTemplateId(undefined); setShowBuilder(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent bg-accent-subtle rounded-lg hover:bg-accent/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('workflows.createTemplate')}
              </button>
            </div>
          )}

          {templates.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary">
              <p>{t('workflows.noTemplates')}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((tpl) => (
                <div key={tpl.id} className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">{tpl.name}</h4>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {tpl.entityType.replace(/_/g, ' ')} &middot; {tpl.steps?.length || 0} {t('workflows.steps').toLowerCase()} &middot;{' '}
                      {tpl.enabled ? t('workflows.active') : t('workflows.disabled')}
                    </p>
                  </div>
                  {canAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditTemplateId(tpl.id); setShowBuilder(true); }}
                        className="text-xs text-accent hover:underline"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => deleteTemplate(tpl.id)}
                        className="text-xs text-danger-text hover:underline"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
