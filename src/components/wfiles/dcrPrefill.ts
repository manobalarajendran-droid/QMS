// Hands a W: file over to the "New Change Request" form. The QMS files page saves
// it, the Document changes screen reads it once and opens the form filled in.
import type { WFile } from './wfilesApi';

const KEY = 'qms.dcrPrefill';

export interface DCRPrefill {
  docNo: string;
  title: string;
  /** W: file the DCR replaces; '' when there is none (a new yearly document). */
  wFileId: string;
  department?: string;
  reason?: string;
  /** Yearly set tag, see annualSet.ts. */
  annualKey?: string;
}

/** Saves a ready-made prefill (the yearly set screen uses this). */
export function saveDCRPrefillData(prefill: DCRPrefill): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(prefill));
  } catch {
    // storage blocked: the form just opens empty
  }
}

/** The links a new DCR keeps from its prefill: the W: file and the yearly tag. */
export function prefillLinks(p: DCRPrefill): { wFileId?: string; annualKey?: string } {
  return {
    ...(p.wFileId ? { wFileId: p.wFileId } : {}),
    ...(p.annualKey ? { annualKey: p.annualKey } : {}),
  };
}

export function saveDCRPrefill(f: WFile): void {
  saveDCRPrefillData({ docNo: f.docNo ?? '', title: f.name.replace(/\.[^.]+$/, ''), wFileId: f.id });
}

/** Returns the saved prefill once, then forgets it. */
export function takeDCRPrefill(): DCRPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<DCRPrefill>;
    if (typeof p.wFileId !== 'string') return null;
    const opt = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
    return {
      docNo: String(p.docNo ?? ''), title: String(p.title ?? ''), wFileId: p.wFileId,
      department: opt(p.department), reason: opt(p.reason), annualKey: opt(p.annualKey),
    };
  } catch {
    return null;
  }
}
