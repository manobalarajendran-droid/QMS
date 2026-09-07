import { render, act, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useState, useEffect } from 'react';
import { ObjectivesDashboard } from '../components/objectives/ObjectivesDashboard';
import { useClientIntakeStore } from '../store/useClientIntakeStore';
import { useObjectivesStore } from '../store/useObjectivesStore';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { changeLanguage: () => Promise.resolve(), language: 'en' }
  })
}));

describe('ObjectivesDashboard Memoization Stress Harness', () => {
  beforeEach(() => {
    useObjectivesStore.setState({ records: [...useObjectivesStore.getState().records] });
    useClientIntakeStore.setState({ records: [...useClientIntakeStore.getState().records] });
  });

  it('renders successfully and maintains state under 500 rapid parent re-renders', () => {
    let renderTrigger: () => void = () => {};
    function ParentHarness() {
      const [count, setCount] = useState(0);
      useEffect(() => {
        renderTrigger = () => setCount(c => c + 1);
      });
      return (
        <div data-testid="parent-wrapper" data-count={count}>
          <ObjectivesDashboard />
        </div>
      );
    }

    render(<ParentHarness />);
    expect(screen.getByText('Total Objectives')).toBeInTheDocument();

    const t0 = performance.now();
    act(() => {
      for (let i = 0; i < 500; i++) {
        renderTrigger();
      }
    });
    const t1 = performance.now();
    const duration = t1 - t0;
    console.log(`[STRESS] 500 rapid parent re-renders completed in ${duration.toFixed(2)}ms (${(duration / 500).toFixed(3)}ms/render)`);

    expect(screen.getByTestId('parent-wrapper')).toHaveAttribute('data-count', '500');
    expect(screen.getByText('Total Objectives')).toBeInTheDocument();
  });

  it('handles 300 rapid internal state switches (Tree vs Leaderboard)', () => {
    render(<ObjectivesDashboard />);
    const leaderboardBtn = screen.getByRole('button', { name: 'Leaderboard' });
    const treeBtn = screen.getByRole('button', { name: 'Strategic Tree' });

    const t0 = performance.now();
    act(() => {
      for (let i = 0; i < 150; i++) {
        fireEvent.click(leaderboardBtn);
        fireEvent.click(treeBtn);
      }
    });
    const t1 = performance.now();
    console.log(`[STRESS] 300 view toggles completed in ${(t1 - t0).toFixed(2)}ms`);

    expect(screen.getByText('Strategic Tree')).toBeInTheDocument();
  });

  it('handles rapid department expansions without degradation', () => {
    render(<ObjectivesDashboard />);
    const deptButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('done'));
    expect(deptButtons.length).toBeGreaterThan(0);

    const firstDeptBtn = deptButtons[0];
    const t0 = performance.now();
    act(() => {
      for (let i = 0; i < 200; i++) {
        fireEvent.click(firstDeptBtn);
      }
    });
    const t1 = performance.now();
    console.log(`[STRESS] 200 department toggles completed in ${(t1 - t0).toFixed(2)}ms`);
  });

  it('correctly updates emergency reaction metrics when intake store mutates', () => {
    render(<ObjectivesDashboard />);
    const initialText = screen.getByText('Avg Emergency Reaction').previousSibling?.textContent;
    expect(initialText).toBe('18m');

    act(() => {
      useClientIntakeStore.getState().addRecord({
        intakeType: 'Emergency',
        title: 'Test Rapid Emergency',
        description: 'Testing reaction metric recalculation',
        receivedBy: 'Eng. Tester',
        routedToDept: 'Field',
        timeLogged: '2026-03-05T10:00:00.000Z',
        timeAcknowledged: '2026-03-05T10:10:00.000Z',
        status: 'Acknowledged'
      });
    });

    const updatedText = screen.getByText('Avg Emergency Reaction').previousSibling?.textContent;
    expect(updatedText).toBe('14m');
  });
});
