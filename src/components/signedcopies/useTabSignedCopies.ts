// Turns a tab's store records into SignedRow keys once per change, then runs useSignedCopies.
import { useMemo } from 'react';
import { rowKeys, type SignedTab } from './matchRules';
import type { SignedRow } from './resolveSignedCopies';
import { useSignedCopies, type UseSignedCopies } from './useSignedCopies';

export function useTabSignedCopies(tab: SignedTab, records: ReadonlyArray<{ id: string }>): UseSignedCopies {
  const rows = useMemo<SignedRow[]>(
    () => records.map((r) => ({ id: r.id, groups: rowKeys(tab, r as unknown as Record<string, unknown>) })),
    [tab, records],
  );
  return useSignedCopies(tab, rows);
}
