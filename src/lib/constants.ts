import type { RequirementStatus, TestStatus } from '../types';

export const REQUIREMENT_STATUSES: RequirementStatus[] = ['Draft', 'Active', 'Closed'];
export const TEST_STATUSES: TestStatus[] = ['Not Run', 'Passed', 'Failed'];

export const CHART_COLORS = {
  requirement: {
    Draft: '#9ca3af',
    Active: '#3b82f6',
    Closed: '#22c55e',
  },
  test: {
    'Not Run': '#9ca3af',
    Passed: '#22c55e',
    Failed: '#ef4444',
  },
};
