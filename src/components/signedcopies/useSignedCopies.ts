// One tab's signed copies: W: files (shared useWFiles list) + saved links, matched by resolveSignedCopies.
// Callers must pass a `rows` array that stays the same between renders (wrap it in useMemo).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../lib/apiClient';
import { useWFiles } from '../wfiles/useWFiles';
import type { SignedTab } from './matchRules';
import { resolveSignedCopies, type LinkNote, type Resolved, type SignedRow } from './resolveSignedCopies';
import { addLink, listLinks, removeLink } from './signedCopiesApi';

export interface UseSignedCopies {
  resolved: Resolved;
  /** 'loading' also while the saved links load, so counts are never shown half-known. */
  filesState: 'loading' | 'ready' | 'error';
  linksState: 'loading' | 'ready' | 'error';
  linksError: string | null;
  busy: boolean;
  link(rowId: string, file: { id: string; name: string }, kind?: LinkNote['kind']): Promise<void>;
  unlink(linkId: string): Promise<void>;
  reload(): void;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

export function useSignedCopies(tab: SignedTab, rows: SignedRow[]): UseSignedCopies {
  const w = useWFiles();
  const [links, setLinks] = useState<LinkNote[]>([]);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linksTick, setLinksTick] = useState(0);
  const [linksState, setLinksState] = useState<'loading' | 'ready' | 'error'>('loading');
  const loadedTab = useRef<SignedTab | null>(null);

  useEffect(() => {
    let live = true;
    // A plain reload keeps the list on screen; a new tab starts from empty and "loading".
    if (loadedTab.current !== tab) { setLinks([]); setLinksState('loading'); }
    listLinks(tab)
      .then((l) => { if (live) { loadedTab.current = tab; setLinks(l); setLinksError(null); setLinksState('ready'); } })
      .catch((e) => { if (live) { setLinksError(errText(e)); setLinksState('error'); } });
    return () => { live = false; };
  }, [tab, linksTick]);

  const files = w.state.kind === 'ready' ? w.files : null;
  const resolved = useMemo(() => resolveSignedCopies(tab, rows, files, links), [tab, rows, files, links]);

  const link = useCallback(async (rowId: string, file: { id: string; name: string }, kind: LinkNote['kind'] = 'link') => {
    setBusy(true);
    try {
      const saved = await addLink({ tab, rowId, wFileId: file.id, fileName: file.name, kind });
      setLinks((prev) => (prev.some((l) => l.id === saved.id) ? prev : [...prev, saved]));
      setLinksError(null);
    } catch (e) { setLinksError(errText(e)); } finally { setBusy(false); }
  }, [tab]);

  const unlink = useCallback(async (linkId: string) => {
    setBusy(true);
    try {
      await removeLink(linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      setLinksError(null);
    } catch (e) {
      setLinksError(errText(e));
      // 404: someone else already removed it. Reload so the stale link leaves the screen.
      if (e instanceof ApiError && e.status === 404) setLinksTick((t) => t + 1);
    } finally { setBusy(false); }
  }, []);

  const reloadFiles = w.reload;
  const reload = useCallback(() => { reloadFiles(); setLinksTick((t) => t + 1); }, [reloadFiles]);

  const filesState = linksState === 'loading' && w.state.kind !== 'error' ? 'loading' : w.state.kind;
  return { resolved, filesState, linksState, linksError, busy, link, unlink, reload };
}
