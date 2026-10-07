// One tab's signed copies: W: files (shared useWFiles list) + saved links, matched by resolveSignedCopies.
// Callers must pass a `rows` array that stays the same between renders (wrap it in useMemo).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWFiles } from '../wfiles/useWFiles';
import type { SignedTab } from './matchRules';
import { resolveSignedCopies, type LinkNote, type Resolved, type SignedRow } from './resolveSignedCopies';
import { addLink, listLinks, removeLink } from './signedCopiesApi';

export interface UseSignedCopies {
  resolved: Resolved;
  filesState: 'loading' | 'ready' | 'error';
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

  useEffect(() => {
    let live = true;
    listLinks(tab)
      .then((l) => { if (live) { setLinks(l); setLinksError(null); } })
      .catch((e) => { if (live) setLinksError(errText(e)); });
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
    } catch (e) { setLinksError(errText(e)); } finally { setBusy(false); }
  }, []);

  const reloadFiles = w.reload;
  const reload = useCallback(() => { reloadFiles(); setLinksTick((t) => t + 1); }, [reloadFiles]);

  return { resolved, filesState: w.state.kind, linksError, busy, link, unlink, reload };
}
