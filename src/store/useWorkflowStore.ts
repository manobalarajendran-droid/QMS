import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkflowDefinition, WorkflowInstance, WorkflowStep } from '../types';
import { useAuditStore } from './useAuditStore';

/**
 * The approval engine.
 *
 * A definition is the route a piece of work takes - a list of steps, each with
 * who may act on it and how many people have to agree. An instance is one run
 * of that route against one record.
 *
 * All of this happens inside the app. There is no approval server.
 */

/** Who is acting. The role decides whose inbox a step belongs in. */
export interface WorkflowActor {
  id: string;
  name?: string;
  role?: string;
}

interface WorkflowState {
  definitions: WorkflowDefinition[];
  instances: WorkflowInstance[];

  /** Used by the sync so a change made on another machine can land here. */
  setDefinitions: (definitions: WorkflowDefinition[]) => void;
  setInstances: (instances: WorkflowInstance[]) => void;

  addDefinition: (def: WorkflowDefinition) => void;
  updateDefinition: (id: string, patch: Partial<WorkflowDefinition>) => void;
  removeDefinition: (id: string) => void;

  startWorkflow: (
    definitionId: string,
    entityType: string,
    entityId: string,
    actor?: WorkflowActor,
    entityLabel?: string,
  ) => WorkflowInstance | null;
  approveStep: (
    instanceId: string,
    actor: WorkflowActor,
    action: 'approved' | 'rejected',
    reason?: string,
  ) => void;
  delegateStep: (
    instanceId: string,
    actor: WorkflowActor,
    toUserId: string,
    toUserName?: string,
    reason?: string,
  ) => void;
  cancelWorkflow: (instanceId: string, actor: WorkflowActor, reason?: string) => void;

  getActiveWorkflows: (entityId?: string) => WorkflowInstance[];
  getMyPendingApprovals: (actor: WorkflowActor) => WorkflowInstance[];
  definitionOf: (instance: WorkflowInstance) => WorkflowDefinition | undefined;
  currentStepOf: (instance: WorkflowInstance) => WorkflowStep | undefined;
}

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter += 1;
  return prefix + '-' + Date.now() + '-' + idCounter;
}

function now(): string {
  return new Date().toISOString();
}

const DEFAULT_DEFINITIONS: WorkflowDefinition[] = [
  {
    id: 'wf-req-approval',
    name: 'Requirement Approval',
    trigger: 'manual',
    entityType: 'requirement',
    enabled: true,
    steps: [
      { id: 'step-review', name: 'Review', type: 'review', requiredApprovers: 1, slaHours: 48 },
      { id: 'step-approve', name: 'Approve', type: 'approval', requiredApprovers: 1, slaHours: 72 },
      { id: 'step-sign', name: 'Sign', type: 'sign', requiredApprovers: 1, slaHours: 24 },
    ],
  },
  {
    id: 'wf-change-approval',
    name: 'Change Request Approval',
    description: 'What a change request goes through once it reaches the approval stage.',
    trigger: 'manual',
    entityType: 'change_control',
    enabled: true,
    steps: [
      {
        id: 'step-cc-review',
        name: 'Impact Review',
        type: 'review',
        assigneeRole: 'qa_engineer',
        requiredApprovers: 1,
        slaHours: 48,
        logic: 'and',
        rejectAction: 'cancel',
      },
      {
        id: 'step-cc-approve',
        name: 'Approval',
        type: 'approval',
        assigneeRole: 'qa_manager',
        requiredApprovers: 1,
        slaHours: 72,
        logic: 'and',
        rejectAction: 'cancel',
      },
    ],
  },
  {
    id: 'wf-design-gate',
    name: 'Design Gate Review',
    trigger: 'manual',
    entityType: 'design_item',
    enabled: true,
    steps: [
      { id: 'step-dg-review', name: 'Review', type: 'review', requiredApprovers: 1, slaHours: 48 },
      { id: 'step-dg-approve', name: 'Gate Approval', type: 'approval', requiredApprovers: 2, slaHours: 72 },
      { id: 'step-dg-sign', name: 'Sign Off', type: 'sign', requiredApprovers: 1, slaHours: 24 },
    ],
  },
];

/**
 * Whether the step in front of an instance is this person's to act on.
 *
 * A step handed to somebody is theirs alone. Otherwise a step with a role on it
 * belongs to the people holding that role, and an admin can always act. A step
 * with no role on it is open to anybody.
 */
function stepIsMine(
  instance: WorkflowInstance,
  step: WorkflowStep,
  actor: WorkflowActor,
): boolean {
  const handedOver = (instance.delegations || [])
    .filter((d) => d.stepId === step.id)
    .slice(-1)[0];
  if (handedOver) return handedOver.toUserId === actor.id;
  if (!step.assigneeRole) return true;
  if (actor.role === 'admin') return true;
  return actor.role === step.assigneeRole;
}

/**
 * The runs waiting on one person.
 *
 * Exported so the inbox screen can work it out from the lists it is already
 * watching, and get the same answer as the store method below.
 */
export function pendingApprovalsFor(
  instances: WorkflowInstance[],
  definitions: WorkflowDefinition[],
  actor: WorkflowActor,
): WorkflowInstance[] {
  return instances.filter((i) => {
    if (i.status !== 'active') return false;
    const def = definitions.find((d) => d.id === i.workflowId);
    const currentStep = def?.steps[i.currentStepIndex];
    if (!currentStep) return false;
    if (!stepIsMine(i, currentStep, actor)) return false;
    return !i.approvals.some(
      (a) => a.stepId === currentStep.id && a.userId === actor.id
    );
  });
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      definitions: DEFAULT_DEFINITIONS,
      instances: [],

      setDefinitions: (definitions) => set({ definitions }),
      setInstances: (instances) => set({ instances }),

      addDefinition: (def) => {
        set((state) => ({ definitions: [...state.definitions, def] }));
        useAuditStore.getState().log('create', 'workflow_definition', def.id, undefined, JSON.stringify({ name: def.name }));
      },

      updateDefinition: (id, patch) => {
        const prev = get().definitions.find((d) => d.id === id);
        set((state) => ({
          definitions: state.definitions.map((d) =>
            d.id === id ? { ...d, ...patch, updatedAt: now() } : d
          ),
        }));
        useAuditStore.getState().log(
          'update',
          'workflow_definition',
          id,
          prev ? JSON.stringify({ name: prev.name }) : undefined,
          JSON.stringify(patch)
        );
      },

      removeDefinition: (id) => {
        const prev = get().definitions.find((d) => d.id === id);
        set((state) => ({
          definitions: state.definitions.filter((d) => d.id !== id),
        }));
        useAuditStore.getState().log('delete', 'workflow_definition', id, prev ? JSON.stringify({ name: prev.name }) : undefined);
      },

      startWorkflow: (definitionId, entityType, entityId, actor, entityLabel) => {
        const def = get().definitions.find((d) => d.id === definitionId);
        if (!def || !def.enabled) return null;

        const instance: WorkflowInstance = {
          id: generateId('wfi'),
          workflowId: definitionId,
          entityType,
          entityId,
          entityLabel,
          currentStepIndex: 0,
          status: 'active',
          approvals: [],
          delegations: [],
          startedAt: now(),
          startedBy: actor?.id,
        };

        set((state) => ({ instances: [...state.instances, instance] }));
        useAuditStore.getState().log(
          'create',
          'workflow_instance',
          instance.id,
          undefined,
          JSON.stringify({ workflowName: def.name, entityType, entityId })
        );

        return instance;
      },

      approveStep: (instanceId, actor, action, reason) => {
        const instance = get().instances.find((i) => i.id === instanceId);
        if (!instance || instance.status !== 'active') return;

        const def = get().definitions.find((d) => d.id === instance.workflowId);
        if (!def) return;

        const currentStep = def.steps[instance.currentStepIndex];
        if (!currentStep) return;

        const approval = {
          stepId: currentStep.id,
          userId: actor.id,
          userName: actor.name,
          action,
          timestamp: now(),
          reason,
        };

        let approvals = [...instance.approvals, approval];
        let newStepIndex = instance.currentStepIndex;
        let newStatus: WorkflowInstance['status'] = instance.status;
        let completedAt: string | undefined = instance.completedAt;

        if (action === 'rejected') {
          // What a rejection does is set on the step itself. Sending the work
          // back is the everyday case; stopping the whole route is the harsh
          // one, and stays the default so nothing changes silently.
          const rejectAction = currentStep.rejectAction || 'cancel';
          if (rejectAction === 'cancel') {
            newStatus = 'cancelled';
            completedAt = now();
          } else {
            const target = rejectAction === 'goto_step' ? (currentStep.rejectTarget ?? 0) : 0;
            newStepIndex = Math.min(Math.max(0, target), def.steps.length - 1);
            // Every step from there on has to be agreed again, so the ticks
            // already on those steps no longer count.
            const reopened = new Set(def.steps.slice(newStepIndex).map((s) => s.id));
            approvals = approvals.filter(
              (a) => !(reopened.has(a.stepId) && a.action === 'approved')
            );
          }
        } else {
          const agreed = approvals.filter(
            (a) => a.stepId === currentStep.id && a.action === 'approved'
          );
          if (agreed.length >= currentStep.requiredApprovers) {
            if (instance.currentStepIndex >= def.steps.length - 1) {
              newStatus = 'completed';
              completedAt = now();
            } else {
              newStepIndex = instance.currentStepIndex + 1;
            }
          }
        }

        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? {
                  ...i,
                  approvals,
                  currentStepIndex: newStepIndex,
                  status: newStatus,
                  completedAt,
                }
              : i
          ),
        }));

        useAuditStore.getState().log(
          action === 'approved' ? 'approve' : 'reject',
          'workflow_instance',
          instanceId,
          'Step: ' + currentStep.name,
          'Action: ' + action,
          reason
        );
      },

      delegateStep: (instanceId, actor, toUserId, toUserName, reason) => {
        const instance = get().instances.find((i) => i.id === instanceId);
        if (!instance || instance.status !== 'active') return;
        const def = get().definitions.find((d) => d.id === instance.workflowId);
        const currentStep = def?.steps[instance.currentStepIndex];
        if (!currentStep) return;

        const handOver = {
          stepId: currentStep.id,
          toUserId,
          toUserName,
          byUserId: actor.id,
          byUserName: actor.name,
          at: now(),
          reason,
        };

        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? { ...i, delegations: [...(i.delegations || []), handOver] }
              : i
          ),
        }));

        useAuditStore.getState().log(
          'update',
          'workflow_instance',
          instanceId,
          'Step: ' + currentStep.name,
          'Handed to: ' + (toUserName || toUserId),
          reason
        );
      },

      cancelWorkflow: (instanceId, actor, reason) => {
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId && i.status === 'active'
              ? { ...i, status: 'cancelled' as const, completedAt: now() }
              : i
          ),
        }));
        useAuditStore.getState().log(
          'delete',
          'workflow_instance',
          instanceId,
          undefined,
          'Stopped by: ' + (actor.name || actor.id),
          reason
        );
      },

      getActiveWorkflows: (entityId) => {
        const instances = get().instances.filter((i) => i.status === 'active');
        if (entityId) return instances.filter((i) => i.entityId === entityId);
        return instances;
      },

      getMyPendingApprovals: (actor) =>
        pendingApprovalsFor(get().instances, get().definitions, actor),

      definitionOf: (instance) => get().definitions.find((d) => d.id === instance.workflowId),

      currentStepOf: (instance) => {
        const def = get().definitions.find((d) => d.id === instance.workflowId);
        return def?.steps[instance.currentStepIndex];
      },
    }),
    {
      name: 'pta-qms:workflow',
      version: 1,
      /**
       * Routes that ship with the app are added to whatever is already saved
       * on this machine, matched on id. Anything the company has built or
       * edited itself is left exactly as it is.
       */
      migrate: (persisted: unknown, _version: number) => {
        const state = (persisted || {}) as Partial<WorkflowState>;
        const saved = Array.isArray(state.definitions) ? state.definitions : [];
        const missing = DEFAULT_DEFINITIONS.filter(
          (d) => !saved.some((s2) => s2.id === d.id),
        );
        return { ...state, definitions: [...saved, ...missing] } as WorkflowState;
      },
    }
  )
);
