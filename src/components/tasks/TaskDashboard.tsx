import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  ArrowRight,
  Plus,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { VARIANT_STYLES } from '../shared/statusBadgeUtils';
import {
  useTaskStore,
  migrateLegacyTasks,
  isOverdue,
  type TaskRecord,
} from '../../store/useTaskStore';
import type { TaskPriority } from '../../types';

type FilterTab = 'all' | 'open' | 'in_progress' | 'overdue' | 'completed';

const PRIORITY_VARIANT: Record<TaskPriority, 'green' | 'amber' | 'red'> = {
  low: 'green',
  medium: 'amber',
  high: 'amber',
  critical: 'red',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'text-text-secondary',
  in_progress: 'text-accent',
  completed: 'text-success-text',
  overdue: 'text-danger-text',
};

export function TaskDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Tasks come from the shared store now. They used to be read from a raw
  // localStorage array that only a panel nothing rendered ever wrote to, so
  // this screen was permanently empty and there was no way to add anything.
  const tasks = useTaskStore((s) => s.records);
  const addRecord = useTaskStore((s) => s.addRecord);
  const updateRecord = useTaskStore((s) => s.updateRecord);
  const teamMembers = useTeamMembers();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');

  useEffect(() => { migrateLegacyTasks(); }, []);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const member = teamMembers.find((m) => m.id === newAssignee);
    addRecord({
      title: newTitle.trim(),
      description: '',
      assigneeId: newAssignee,
      assigneeName: member?.name || '',
      dueDate: newDue || undefined,
      priority: newPriority,
      status: 'open',
      createdBy: user?.name || '',
    });
    setNewTitle('');
    setNewAssignee('');
    setNewDue('');
    setNewPriority('medium');
    setShowNew(false);
  };

  const handleComplete = (task: TaskRecord) => {
    updateRecord(task.id, { status: 'completed', completedAt: new Date().toISOString() });
  };

  const handleReassign = (task: TaskRecord, newAssigneeId: string) => {
    const member = teamMembers.find((m) => m.id === newAssigneeId);
    updateRecord(task.id, { assigneeId: newAssigneeId, assigneeName: member?.name || '' });
  };

  const filteredTasks = tasks.filter((task) => {
    switch (activeFilter) {
      case 'open':
        return task.status === 'open';
      case 'in_progress':
        return task.status === 'in_progress';
      case 'overdue':
        return isOverdue(task);
      case 'completed':
        return task.status === 'completed';
      default:
        return true;
    }
  });

  const counts = {
    all: tasks.length,
    open: tasks.filter((t) => t.status === 'open').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    overdue: tasks.filter((t) => isOverdue(t)).length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  const filters: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: t('tasks.filterAll'), count: counts.all },
    { id: 'open', label: t('tasks.filterOpen'), count: counts.open },
    { id: 'in_progress', label: t('tasks.filterInProgress'), count: counts.in_progress },
    { id: 'overdue', label: t('tasks.filterOverdue'), count: counts.overdue },
    { id: 'completed', label: t('tasks.filterCompleted'), count: counts.completed },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">{t('tasks.dashboardTitle')}</h2>
        </div>
        <button
          onClick={() => setShowNew((open) => !open)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('tasks.create')}
        </button>
      </div>

      {/* New task */}
      {showNew && (
        <div className="p-4 bg-surface rounded-xl border border-border flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('tasks.titlePlaceholder')}
            className="flex-1 min-w-48 px-2.5 py-1.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            className="px-2.5 py-1.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
          >
            <option value="">{t('tasks.unassigned')}</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name || m.email}</option>
            ))}
          </select>
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            className="px-2.5 py-1.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
          >
            {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            type="date"
            value={newDue}
            onChange={(e) => setNewDue(e.target.value)}
            className="px-2.5 py-1.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
          />
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('tasks.add')}
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-surface rounded-xl border border-border">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">{t('tasks.totalTasks')}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{counts.all}</p>
        </div>
        <div className="p-4 bg-surface rounded-xl border border-border">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">{t('tasks.filterOpen')}</p>
          <p className="text-2xl font-bold text-accent mt-1">{counts.open + counts.in_progress}</p>
        </div>
        <div className="p-4 bg-surface rounded-xl border border-border">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">{t('tasks.filterOverdue')}</p>
          <p className="text-2xl font-bold text-danger-text mt-1">{counts.overdue}</p>
        </div>
        <div className="p-4 bg-surface rounded-xl border border-border">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">{t('tasks.filterCompleted')}</p>
          <p className="text-2xl font-bold text-success-text mt-1">{counts.completed}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-border">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeFilter === f.id
                ? 'text-accent'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">({f.count})</span>
            {activeFilter === f.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Task Cards */}
      <div className="space-y-2">
        {filteredTasks.length === 0 && (
          <div className="py-12 text-center text-text-tertiary">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('tasks.noTasks')}</p>
          </div>
        )}
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 rounded-xl border transition-colors ${
              isOverdue(task)
                ? 'border-danger/30 bg-danger/5'
                : 'border-border bg-surface hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p
                    className={`text-sm font-medium ${
                      task.status === 'completed'
                        ? 'line-through text-text-tertiary'
                        : 'text-text-primary'
                    }`}
                  >
                    {task.title}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${VARIANT_STYLES[PRIORITY_VARIANT[task.priority]]}`}>
                    {task.priority}
                  </span>
                  {isOverdue(task) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-danger-text font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      {t('tasks.overdue')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-text-tertiary">
                  <span className={`inline-flex items-center gap-1 ${STATUS_COLORS[isOverdue(task) ? 'overdue' : task.status]}`}>
                    {task.status === 'completed' ? (
                      <CheckSquare className="w-3 h-3" />
                    ) : task.status === 'in_progress' ? (
                      <ArrowRight className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    {t(`tasks.status_${task.status}`)}
                  </span>
                  <span>
                    <UserCheck className="w-3 h-3 inline mr-0.5" />
                    {task.assigneeName || t('tasks.unassigned')}
                  </span>
                  {task.dueDate && (
                    <span className={isOverdue(task) ? 'text-danger-text' : ''}>
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {task.entityType && (
                    <span className="text-accent-text bg-accent-subtle px-1.5 py-0.5 rounded">
                      {task.entityType}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {task.status !== 'completed' && (
                  <button
                    onClick={() => handleComplete(task)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    <CheckSquare className="w-3 h-3" />
                    {t('tasks.complete')}
                  </button>
                )}
                {task.status !== 'completed' && teamMembers.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleReassign(task, e.target.value);
                    }}
                    className="px-2 py-1 text-xs bg-surface border border-border rounded-lg text-text-secondary"
                  >
                    <option value="">{t('tasks.reassign')}</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
