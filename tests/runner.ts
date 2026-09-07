#!/usr/bin/env tsx
/**
 * Automated Opaque-Box E2E Test Runner for Plant-Tech Arabia QMS Dashboard
 * Supports progressive execution: --tier=1|2|3|4|all, --milestone=m1|m2|m3|m4|m5|m6
 * Exits with code 0 on pass, non-zero on failure.
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const cwd = path.resolve(__dirname, '..');
const configPath = 'tests/vitest.config.ts';

const TIER_TARGETS: Record<string, string> = {
  '1': 'tests/tier1-features/',
  '2': 'tests/tier2-boundaries/',
  '3': 'tests/tier3-combinations/',
  '4': 'tests/tier4-scenarios/',
  'all': 'tests/',
};

const MILESTONE_TARGETS: Record<string, string> = {
  'm1': 'tests/tier1-features/core-data-layer.test.ts',
  'm2': 'tests/tier1-features/v12-import-bridge.test.ts',
  'm3': 'tests/tier1-features/workflow-modules.test.ts',
  'm4': 'tests/tier1-features/compliance-registers.test.ts',
  'm5': 'tests/tier1-features/ui-design-system.test.tsx',
  'm6': 'tests/tier1-features/test-integrity-hardening.test.ts',
};

function parseTarget(): { filter: string; description: string } {
  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      const tier = arg.split('=')[1].toLowerCase();
      if (TIER_TARGETS[tier]) {
        return {
          filter: TIER_TARGETS[tier],
          description: `Tier ${tier.toUpperCase()} Tests`,
        };
      }
    }
    if (arg.startsWith('--milestone=')) {
      const ms = arg.split('=')[1].toLowerCase();
      if (MILESTONE_TARGETS[ms]) {
        return {
          filter: MILESTONE_TARGETS[ms],
          description: `Milestone ${ms.toUpperCase()} Tests`,
        };
      }
    }
  }
  return { filter: 'tests/', description: 'Full Opaque-Box E2E Suite (Tiers 1–4)' };
}

function run(): void {
  const { filter, description } = parseTarget();

  console.log('================================================================');
  console.log('  PTA QMS Dashboard — Automated Opaque-Box E2E Test Runner');
  console.log('================================================================');
  console.log(`Target:      ${description}`);
  console.log(`Filter:      ${filter}`);
  console.log(`Config:      ${configPath}`);
  console.log('----------------------------------------------------------------\n');

  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const vitestArgs = ['vitest', 'run', '--config', configPath, filter];

  const startTime = Date.now();
  const result = spawnSync(npxCmd, vitestArgs, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n----------------------------------------------------------------');
  if (result.status === 0) {
    console.log(`✅ [PASS] ${description} completed successfully in ${duration}s.`);
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.error(`❌ [FAIL] ${description} failed with exit code ${result.status} in ${duration}s.`);
    console.log('================================================================\n');
    process.exit(result.status || 1);
  }
}

run();
