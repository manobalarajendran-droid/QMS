import { useWorkflowStore, type WorkflowActor } from '../store/useWorkflowStore';
import { useChangeRequestStore } from '../store/useChangeRequestStore';
import type { WorkflowInstance } from '../types';

/**
 * What sends a record into the approvals inbox, and what happens to that
 * record once the approvers are done with it.
 *
 * The approval engine knows nothing about change requests or any other kind of
 * record - it only walks a run through its steps. This file is the one place
 * the two are tied together, so covering another record type later means
 * adding a case here rather than touching the engine.
 */

/** The run still waiting on somebody for this record, if there is one. */
export function activeApprovalFor(
  entityType: string,
  entityId: string,
): WorkflowInstance | undefined {
  return useWorkflowStore
    .getState()
    .instances.find(
      (i) => i.status === 'active' && i.entityType === entityType && i.entityId === entityId,
    );
}

/**
 * Start the approval route set up for this kind of record.
 *
 * Returns nothing if there is no switched-on route for it, or if the record is
 * already sitting in somebody's inbox. Both are normal - a company that has not
 * drawn up a route for change requests simply carries on without approvals.
 */
export function startApprovalFor(
  entityType: string,
  entityId: string,
  entityLabel: string,
  actor: WorkflowActor,
): WorkflowInstance | null {
  const existing = activeApprovalFor(entityType, entityId);
  if (existing) return existing;

  const { definitions, startWorkflow } = useWorkflowStore.getState();
  const route = definitions.find((d) => d.enabled && d.entityType === entityType);
  if (!route) return null;

  return startWorkflow(route.id, entityType, entityId, actor, entityLabel);
}

/**
 * Pass the outcome of a finished run back to the record it was about.
 *
 * Call this straight after an approve, reject or cancel. While the run is
 * still active it does nothing.
 */
export function settleApproval(instanceId: string): void {
  const instance = useWorkflowStore.getState().instances.find((i) => i.id === instanceId);
  if (!instance || instance.status === 'active') return;

  if (instance.entityType === 'change_control') {
    const store = useChangeRequestStore.getState();
    const record = store.records.find((r) => r.id === instance.entityId);
    // Only act while the change is still parked at the approval stage, so a
    // late outcome cannot drag a change that has already moved on backwards.
    if (!record || record.status !== 'approval') return;

    if (instance.status === 'completed') {
      store.updateRecord(record.id, { status: 'implementation' });
    } else if (instance.status === 'cancelled') {
      // Turned down, so it goes back for another look rather than dying.
      store.updateRecord(record.id, { status: 'assessment' });
    }
  }
}
