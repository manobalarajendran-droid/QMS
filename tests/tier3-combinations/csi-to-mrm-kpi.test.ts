import { describe, it, expect, beforeEach } from 'vitest';
import { useCSIStore } from '../../src/store/useCSIStore';
import { useMRMStore } from '../../src/store/useMRMStore';

describe('Tier 3 — Cross-Feature Combinations: CSI Survey Feedback to MRM KPI Review', () => {
  beforeEach(() => {
    localStorage.clear();
    useCSIStore.setState({ records: [] });
    useMRMStore.setState({ records: [] });
  });

  it('T3-CSI-MRM-01: aggregates customer surveys into executive MRM review and action item', () => {
    // 1. Submit 3 customer surveys
    useCSIStore.getState().addRecord({
      cl: 'AR-RAZI Chemical',
      proj: 'Catalyst Replacement Phase 1',
      score: '0.94',
      rating: 'Excellent',
    });
    useCSIStore.getState().addRecord({
      cl: 'TASNEE Petrochemicals',
      proj: 'Furnace Re-tubing',
      score: '0.88',
      rating: 'Good',
    });
    useCSIStore.getState().addRecord({
      cl: 'SABIC SAFCO',
      proj: 'Reformer Overhaul',
      score: '0.68',
      rating: 'Fair',
      obs: 'Technician mobilization was delayed by 36 hours',
    });

    const csiList = useCSIStore.getState().records;
    const scores = csiList.map((c) => parseFloat(c.score || '0'));
    const avgScore = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3));

    expect(avgScore).toBeCloseTo(0.833, 2);

    // Identify surveys needing improvement (Fair or Poor)
    const flaggedSurveys = csiList.filter((c) => c.rating === 'Fair' || c.rating === 'Poor');
    expect(flaggedSurveys).toHaveLength(1);
    expect(flaggedSurveys[0].cl).toBe('SABIC SAFCO');

    // 2. Schedule MRM with Agenda for Customer Feedback Review (Clause 9.1.2)
    const mrm = useMRMStore.getState().addRecord({
      meetingNo: 'MRM-2026-Q1',
      date: '2026-03-31',
      chairperson: 'General Manager',
      attendees: ['T. Manobala (MR)', 'Operations Manager', 'Turnaround Superintendent'],
      agenda: ['Clause 9.1.2 Customer Satisfaction Review (Avg: ' + (avgScore * 100).toFixed(1) + '%)'],
      status: 'In Progress',
      actionItems: [
        {
          id: 'act-safco-01',
          action: `Root cause analysis on 36-hour mobilization delay for SAFCO project (${flaggedSurveys[0].obs})`,
          owner: 'Operations Manager',
          dueDate: '2026-04-10',
          status: 'Open',
        },
      ],
    });

    expect(mrm.agenda[0]).toContain('Customer Satisfaction Review');
    expect(mrm.actionItems[0].action).toContain('SAFCO project');
  });
});
