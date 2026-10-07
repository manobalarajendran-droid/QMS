// Which sidebar screen holds each signed-copy tab.
import type { ViewTab } from '../../types';
import type { SignedTab } from './matchRules';

export const TAB_SCREEN: Record<SignedTab, ViewTab> = {
  ncr: 'deviations',
  dcr: 'dcr_workflow',
  csi: 'pms',
  objectives: 'objectives',
  audit: 'audit_records',
  tuv: 'tuv_tracker',
  mrm: 'mrm_manager',
};
