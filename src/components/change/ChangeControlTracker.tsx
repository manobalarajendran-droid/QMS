import { useState } from 'react';
import { useRouteRecord } from '../../lib/router';
import { useTranslation } from 'react-i18next';
import { Plus, FileEdit, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { roleHasPermission } from '../../lib/permissions';
import { ChangeControlForm } from './ChangeControlForm';
import {
  useChangeRequestStore,
  withOverdueFlags,
  type ChangeRequestRecord,
  type ChangeTask,
} from '../../store/useChangeRequestStore';
import { generateRecordId } from '../../lib/idGenerator';

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-500/10 text-success-text',
  medium: 'bg-yellow-500/10 text-warning-text',
  high: 'bg-orange-500/10 text-warning-text',
  critical: 'bg-red-500/10 text-danger-text',
};

export function ChangeControlTracker() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Change requests live in the shared store now. They used to be fetched
  // from a server that is not part of the deployed app, so this screen only
  // ever showed "Failed to load change controls".
  const items = useChangeRequestStore((s) => s.records);
  const updateRecord = useChangeRequestStore((s) => s.updateRecord);
  const deleteRecord = useChangeRequestStore((s) => s.deleteRecord);

  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChangeRequestRecord | null>(null);
  const [expandedId, setExpandedId] = useRouteRecord('change_control');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const canEdit = roleHasPermission(user?.role, 'canEdit');
  const canDelete = roleHasPermission(user?.role, 'canDelete');

  const handleExpand = (cc: ChangeRequestRecord) => {
    setExpandedId(expandedId === cc.id ? null : cc.id);
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      setError('Insufficient permissions: requires canDelete');
      return;
    }
    deleteRecord(id);
    setError('');
  };

  const handleAddTask = (ccId: string) => {
    if (!newTaskTitle.trim() || !canEdit) return;
    const cc = items.find((r) => r.id === ccId);
    if (!cc) return;
    const task: ChangeTask = {
      id: generateRecordId('cctask'),
      title: newTaskTitle.trim(),
      assignee: newTaskAssignee.trim(),
      dueDate: newTaskDue || null,
      status: 'open',
    };
    updateRecord(ccId, { tasks: [...(cc.tasks || []), task] });
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setNewTaskDue('');
    setError('');
  };

  const handleCompleteTask = (ccId: string, taskId: string) => {
    if (!canEdit) return;
    const cc = items.find((r) => r.id === ccId);
    if (!cc) return;
    updateRecord(ccId, {
      tasks: (cc.tasks || []).map((task) =>
        task.id === taskId
          ? { ...task, status: 'completed' as const, completedAt: new Date().toISOString() }
          : task,
      ),
    });
    setError('');
  };

  const handleVerifyEffectiveness = (ccId: string) => {
    if (!canEdit) return;
    updateRecord(ccId, {
      effectivenessVerified: true,
      effectivenessCheckDate: new Date().toISOString(),
    });
    setError('');
  };

  if (showForm || editing) {
    return (
      <ChangeControlForm
        changeControl={editing}
        onSaved={() => { setShowForm(false); setEditing(null); }}
        onCancel={() => { setShowForm(false); setEditing(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{t('changeControl.title')}</h2>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent bg-accent-subtle rounded-lg hover:bg-accent/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('changeControl.create')}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">
          <p>{t('changeControl.noItems')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((cc) => (
            <div key={cc.id} className="rounded-xl border overflow-hidden backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-2xl bg-white/20 dark:bg-white/5 animate-fade-in">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
                onClick={() => handleExpand(cc)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-tertiary">{cc.changeNumber}</span>
                  <span className="text-sm font-medium text-text-primary">{cc.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_COLORS[cc.riskLevel] || ''}`}>
                    {cc.riskLevel}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent-subtle text-accent">{cc.status}</span>
                  <span className="text-xs text-text-tertiary">{cc.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(cc); }}
                      className="p-1 text-text-tertiary hover:text-accent transition-colors"
                    >
                      <FileEdit className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(cc.id); }}
                      className="p-1 text-text-tertiary hover:text-danger-text transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {expandedId === cc.id && (
                <div className="border-t p-5 space-y-5 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-2xl bg-white/20 dark:bg-white/5 animate-fade-in">
                  {/* Status timeline */}
                  <div className="flex items-center gap-1">
                    {['initiated', 'assessment', 'approval', 'implementation', 'verification', 'closed'].map((s, i, arr) => (
                      <div key={s} className="flex items-center">
                        <div className={`text-xs px-2 py-1 rounded ${
                          s === cc.status ? 'bg-accent text-accent-fg font-medium' :
                          arr.indexOf(cc.status) > i ? 'bg-green-500/10 text-success-text' :
                          'bg-surface-secondary text-text-tertiary'
                        }`}>
                          {s}
                        </div>
                        {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-text-tertiary mx-0.5" />}
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  {cc.description && (
                    <div>
                      <span className="text-xs font-medium text-text-secondary">{t('changeControl.description')}</span>
                      <p className="text-sm text-text-primary mt-1">{cc.description}</p>
                    </div>
                  )}

                  {/* Implementation tasks */}
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-2">{t('changeControl.tasks')}</h4>
                    {(cc.tasks || []).length === 0 ? (
                      <p className="text-xs text-text-tertiary">{t('changeControl.noTasks')}</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-text-tertiary text-xs">
                            <th className="pb-1">{t('changeControl.taskTitle')}</th>
                            <th className="pb-1">{t('changeControl.taskAssignee')}</th>
                            <th className="pb-1">{t('changeControl.taskDue')}</th>
                            <th className="pb-1">{t('changeControl.taskStatus')}</th>
                            <th className="pb-1"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {withOverdueFlags(cc.tasks || []).map((task) => (
                            <tr key={task.id} className="border-t border-border">
                              <td className="py-1.5 text-text-primary">{task.title}</td>
                              <td className="py-1.5 text-text-secondary">{task.assignee}</td>
                              <td className="py-1.5 text-text-secondary">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                              </td>
                              <td className="py-1.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  task.status === 'completed' ? 'bg-green-500/10 text-success-text' :
                                  task.status === 'overdue' ? 'bg-red-500/10 text-danger-text' :
                                  'bg-yellow-500/10 text-warning-text'
                                }`}>
                                  {task.status}
                                </span>
                              </td>
                              <td className="py-1.5">
                                {task.status !== 'completed' && (
                                  <button
                                    onClick={() => handleCompleteTask(cc.id, task.id)}
                                    className="text-xs text-accent hover:underline"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Add task form */}
                    {canEdit && (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-surface-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                          placeholder={t('changeControl.newTaskPlaceholder')}
                        />
                        <input
                          type="text"
                          value={newTaskAssignee}
                          onChange={(e) => setNewTaskAssignee(e.target.value)}
                          className="w-28 px-2 py-1.5 bg-surface-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                          placeholder={t('changeControl.taskAssignee')}
                        />
                        <input
                          type="date"
                          value={newTaskDue}
                          onChange={(e) => setNewTaskDue(e.target.value)}
                          className="px-2 py-1.5 bg-surface-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <button
                          onClick={() => handleAddTask(cc.id)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs bg-accent text-accent-fg rounded hover:bg-accent/90 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {t('changeControl.addTask')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Effectiveness verification */}
                  {cc.status === 'verification' && (
                    <div className="bg-surface-secondary rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-text-primary mb-2">{t('changeControl.effectivenessVerification')}</h4>
                      {cc.effectivenessVerified ? (
                        <div className="flex items-center gap-2 text-success-text text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          {t('changeControl.effectivenessVerified')}
                          {cc.effectivenessCheckDate && (
                            <span className="text-text-tertiary text-xs">
                              ({new Date(cc.effectivenessCheckDate).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      ) : canEdit ? (
                        <button
                          onClick={() => handleVerifyEffectiveness(cc.id)}
                          className="text-sm px-3 py-1.5 bg-success text-success-fg rounded-lg hover:bg-success/90 transition-colors"
                        >
                          {t('changeControl.verifyEffectiveness')}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
