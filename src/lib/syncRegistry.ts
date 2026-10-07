import { registerStore } from './qmsSync';
import { useNCRStore } from '../store/useNCRStore';
import { useDMLStore } from '../store/useDMLStore';
import { useDCRStore } from '../store/useDCRStore';
import { useObjectivesStore } from '../store/useObjectivesStore';
import { useCSIStore } from '../store/useCSIStore';
import { useTUVStore } from '../store/useTUVStore';
import { useAuditProgrammeStore } from '../store/useAuditProgrammeStore';
import { useMRMStore } from '../store/useMRMStore';
import { useClientIntakeStore } from '../store/useClientIntakeStore';
import { useChangeRequestStore } from '../store/useChangeRequestStore';
import { useTaskStore } from '../store/useTaskStore';
import { useKPIStore } from '../store/useKPIStore';
import { useWorkflowStore } from '../store/useWorkflowStore';

/**
 * The stores that hold company records and therefore belong in the shared
 * database. Everything left out is deliberately local: theme, language,
 * notifications, AI history and the like are per-person preferences, and
 * pushing them to a shared table would mean one person's dark mode toggled
 * everyone else's.
 *
 * Every store listed here has the same `records` + `setRecords` shape, which
 * is what lets one binder handle all of them. If you add a store, give it
 * that shape or the binder will not see its data.
 */
/**
 * The approval store keeps two lists instead of one `records` array, so it
 * gets a small stand-in for each. The binder only ever reads `records`, calls
 * `setRecords` and subscribes, so this is all it needs.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function sliceOfWorkflowStore(
  read: () => any[],
  write: (rows: any[]) => void,
): any {
  return {
    getState: () => ({ records: read(), setRecords: write }),
    subscribe: (listener: () => void) => useWorkflowStore.subscribe(listener),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

let registered = false;

export function registerSyncedStores(): void {
  if (registered) return;
  registered = true;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  registerStore('ncr', useNCRStore as any);
  registerStore('dml', useDMLStore as any);
  registerStore('dcr', useDCRStore as any);
  registerStore('objectives', useObjectivesStore as any);
  registerStore('csi', useCSIStore as any);
  registerStore('tuv', useTUVStore as any);
  registerStore('audit_programme', useAuditProgrammeStore as any);
  registerStore('mrm', useMRMStore as any);
  registerStore('client_intake', useClientIntakeStore as any);
  registerStore('change_control', useChangeRequestStore as any);
  registerStore('tasks', useTaskStore as any);
  registerStore('kpi', useKPIStore as any);
  registerStore(
    'workflows',
    sliceOfWorkflowStore(
      () => useWorkflowStore.getState().definitions,
      (rows) => useWorkflowStore.getState().setDefinitions(rows),
    ),
  );
  registerStore(
    'workflow_runs',
    sliceOfWorkflowStore(
      () => useWorkflowStore.getState().instances,
      (rows) => useWorkflowStore.getState().setInstances(rows),
    ),
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
