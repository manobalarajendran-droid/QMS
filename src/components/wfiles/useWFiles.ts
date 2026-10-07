// Loads the W: file list once per page visit and shares it between screens
// (Document Master List, evidence panels). The laptop helper is slow to walk W:,
// so every screen reuses the same list until someone presses "Reload".
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDMLStore } from '../../store/useDMLStore';
import { readWFiles, type WFile, type WFilesLoad } from './wfilesApi';
import { buildWFileIndex, type WFileIndex } from './wfileIndex';

export type WFilesState = { kind: 'loading' } | WFilesLoad;

let cached: WFilesLoad | null = null;
let pending: Promise<WFilesLoad> | null = null;
const listeners = new Set<(s: WFilesLoad) => void>();

function load(fresh: boolean): Promise<WFilesLoad> {
  if (cached && !fresh) return Promise.resolve(cached);
  if (pending && !fresh) return pending;
  pending = readWFiles().then((s) => {
    cached = s;
    pending = null;
    listeners.forEach((l) => l(s));
    return s;
  });
  return pending;
}

export interface UseWFiles {
  state: WFilesState;
  files: WFile[];
  /** Matches W: files to Document Master List rows. */
  index: WFileIndex;
  reload: () => void;
}

/** W: files plus the DML link index. Pass enabled=false to skip loading. */
export function useWFiles(enabled = true): UseWFiles {
  const [state, setState] = useState<WFilesState>(cached ?? { kind: 'loading' });
  const records = useDMLStore((s) => s.records);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const onLoad = (s: WFilesLoad) => { if (live) setState(s); };
    listeners.add(onLoad);
    void load(false).then(onLoad);
    return () => { live = false; listeners.delete(onLoad); };
  }, [enabled]);

  const reload = useCallback(() => {
    setState({ kind: 'loading' });
    void load(true);
  }, []);

  const files = useMemo(() => (state.kind === 'ready' ? state.files : []), [state]);
  const index = useMemo(() => buildWFileIndex(files, records.map((r) => r.no)), [files, records]);
  return { state, files, index, reload };
}
