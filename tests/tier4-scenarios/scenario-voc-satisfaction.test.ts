import { describe, it, expect, beforeEach } from 'vitest';
import { useCSIStore } from '../../src/store/useCSIStore';
import { useMRMStore } from '../../src/store/useMRMStore';
import { VALID_CSI_MAX_SCORES, VALID_CSI_MIXED_SCORES } from '../fixtures/seed-data';

describe('Tier 4 — Real-World Scenario 2: VoC Client Intake to 22-Criteria CSI & Management Review', () => {
  beforeEach(() => {
    localStorage.clear();
    useCSIStore.setState({ records: [] });
    useMRMStore.setState({ records: [] });
  });

  it('T4-SCEN-02: captures client turnaround evaluation and feeds results to executive review', () => {
    // 1. Client completes turnaround project and submits formal 22-criteria evaluation
    const sum = Object.values(VALID_CSI_MIXED_SCORES).reduce((a, b) => a + b, 0);
    const scorePct = (sum / 220) * 100;
    const rating = scorePct >= 90 ? 'Excellent' : scorePct >= 75 ? 'Good' : scorePct >= 60 ? 'Fair' : 'Poor';

    const survey = useCSIStore.getState().addRecord({
      cl: 'SABIC AR-RAZI',
      proj: 'Methanol Unit 2 Turnaround 2026',
      yr: '2026',
      projCode: 'PTA-TAM-2026-AR',
      clientName: 'Sultan Al-Ghamdi',
      clientDesig: 'Plant Maintenance Superintendent',
      scores: VALID_CSI_MIXED_SCORES,
      score: (scorePct / 100).toFixed(2),
      rating,
      icon: rating === 'Excellent' ? '★' : '✔',
      obs: 'Outstanding execution on catalyst change-out; safety compliance 100%.',
      suggestions: 'Earlier mobilization of replacement gaskets recommended.',
    });

    expect(survey.id).toBeDefined();
    expect(survey.rating).toBe('Good');
    expect(parseFloat(survey.score)).toBeGreaterThan(0.8);

    // 2. Aggregate into annual CSI statistics
    const allSurveys = useCSIStore.getState().records;
    const avgScore = allSurveys.reduce((acc, s) => acc + parseFloat(s.score), 0) / allSurveys.length;
    expect(avgScore).toBeGreaterThan(0.8);

    // 3. Management Review Meeting incorporates survey feedback into Minutes & Actions
    const mrm = useMRMStore.getState().addRecord({
      meetingNo: 'MRM-2026-ANNUAL',
      date: '2026-04-01',
      chairperson: 'Managing Director',
      attendees: ['T. Manobala (MR)', 'Operations Manager', 'Procurement Head'],
      agenda: ['Review of Customer Satisfaction Index (CSI) 2026 Performance'],
      status: 'Scheduled',
      actionItems: [
        {
          id: 'act-gasket-procure',
          action: 'Establish framework agreement with gasket vendor to enable pre-turnaround buffer stock (per client suggestion)',
          owner: 'Procurement Head',
          dueDate: '2026-05-15',
          status: 'Open',
        },
      ],
    });

    expect(mrm.actionItems).toHaveLength(1);
    expect(mrm.actionItems[0].action).toContain('pre-turnaround buffer stock');
  });
});
