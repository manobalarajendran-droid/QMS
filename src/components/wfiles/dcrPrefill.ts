// Hands a W: file over to the "New Change Request" form. The QMS files page saves
// it, the Document changes screen reads it once and opens the form filled in.
import type { WFile } from './wfilesApi';

const KEY = 'qms.dcrPrefill';

export interface DCRPrefill {
  docNo: string;
  title: string;
  wFileId: string;
}

export function saveDCRPrefill(f: WFile): void {
  const prefill: DCRPrefill = {
    docNo: f.docNo ?? '',
    title: f.name.replace(/\.[^.]+$/, ''),
    wFileId: f.id,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(prefill));
  } catch {
    // storage blocked: the form just opens empty
  }
}

/** Returns the saved prefill once, then forgets it. */
export function takeDCRPrefill(): DCRPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<DCRPrefill>;
    if (typeof p.wFileId !== 'string') return null;
    return { docNo: String(p.docNo ?? ''), title: String(p.title ?? ''), wFileId: p.wFileId };
  } catch {
    return null;
  }
}
