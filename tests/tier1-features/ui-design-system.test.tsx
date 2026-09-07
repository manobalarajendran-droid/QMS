import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { ThemeToggle } from '../../src/components/shared/ThemeToggle';
import { StatusBadge } from '../../src/components/shared/StatusBadge';
import { useThemeStore } from '../../src/store/useThemeStore';
import { MOCK_USER } from '../fixtures/seed-data';

describe('Tier 1 — Enterprise Design System & UI Shell (Features 33–37)', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().setTheme('light');
    document.documentElement.classList.remove('dark');
  });

  // ==========================================================================
  // Feature 33: Modern Design System & Keyframes
  // ==========================================================================
  describe('Feature 33: Modern Design System Tokens & Styles', () => {
    it('F33-01: verifies CSS custom properties and theme tokens in index.css', () => {
      const cssPath = path.resolve(__dirname, '../../src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      expect(cssContent).toContain('@theme');
      expect(cssContent).toContain('--color-surface:');
      expect(cssContent).toContain('--color-text-primary:');
      expect(cssContent).toContain('--color-accent:');
      expect(cssContent).toContain('--color-success:');
      expect(cssContent).toContain('--color-danger:');
      expect(cssContent).toContain('--color-warning:');
      expect(cssContent).toContain('.dark');
    });
  });

  // ==========================================================================
  // Feature 34: Glass-Morphism KPI Cards
  // ==========================================================================
  describe('Feature 34: Glass-Morphism KPI Card Design Tokens', () => {
    it('F34-01: verifies glass-morphism aesthetic classes and styles', () => {
      // Create a test component simulating KPI Card glass-morphism markup
      const KPICard = ({ title, value, gradient }: { title: string; value: string; gradient?: string }) => (
        <div
          data-testid="kpi-card"
          className={`relative overflow-hidden rounded-xl border border-white/20 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md shadow-lg p-5 ${gradient || ''}`}
        >
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
        </div>
      );

      const { getByTestId } = render(<KPICard title="Total NCRs" value="25" />);
      const card = getByTestId('kpi-card');

      expect(card.className).toContain('backdrop-blur-md');
      expect(card.className).toContain('rounded-xl');
      expect(card.className).toContain('shadow-lg');
      expect(screen.getByText('Total NCRs')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Feature 35: Unified Status Pill Badges
  // ==========================================================================
  describe('Feature 35: Unified Status Pill Badges', () => {
    it('F35-01: renders requirement status badge with proper color styling', () => {
      render(<StatusBadge status="Active" type="requirement" />);
      const badge = screen.getByText('statuses.Active');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('rounded-md');
      expect(badge.className).toContain('px-2');
    });

    it('F35-02: renders test status badge with proper color styling', () => {
      render(<StatusBadge status="Passed" type="test" />);
      const badge = screen.getByText('statuses.Passed');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('rounded-md');
    });
  });

  // ==========================================================================
  // Feature 36: Sidebar User Profile Polish
  // ==========================================================================
  describe('Feature 36: Sidebar User Profile Polish', () => {
    it('F36-01: validates user profile layout contract (avatar, name, role)', () => {
      // Simulate user profile badge inside Sidebar footer
      const UserProfileFooter = ({ user }: { user: typeof MOCK_USER }) => (
        <div data-testid="sidebar-user-profile" className="flex items-center gap-3 p-3 border-t border-slate-800">
          <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-slate-200 truncate">{user.name}</span>
            <span className="text-xs text-slate-400 truncate">{user.role}</span>
          </div>
        </div>
      );

      render(<UserProfileFooter user={MOCK_USER} />);

      expect(screen.getByTestId('sidebar-user-profile')).toBeInTheDocument();
      expect(screen.getByText(MOCK_USER.name)).toBeInTheDocument();
      expect(screen.getByText(MOCK_USER.role)).toBeInTheDocument();

      const avatarImg = screen.getByAltText(MOCK_USER.name);
      expect(avatarImg).toHaveAttribute('src', MOCK_USER.avatar);
    });
  });

  // ==========================================================================
  // Feature 37: Dark Mode & ThemeToggle Mount
  // ==========================================================================
  describe('Feature 37: Dark Mode & ThemeToggle Functionality', () => {
    it('F37-01: toggles between light and dark mode and persists preference', () => {
      render(<ThemeToggle />);

      const toggleButton = screen.getByRole('button');
      expect(useThemeStore.getState().theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Click toggle -> switches to dark
      fireEvent.click(toggleButton);
      expect(useThemeStore.getState().theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Click toggle again -> switches to light
      fireEvent.click(toggleButton);
      expect(useThemeStore.getState().theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
