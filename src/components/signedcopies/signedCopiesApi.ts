// Calls to the signed-copies API (qms-server routes/signedCopies.ts). Only links are sent, never files.
// apiFetch adds the API base (/api) and the JSON header itself.
import { apiFetch } from '../../lib/apiClient';
import type { SignedTab } from './matchRules';
import type { LinkNote } from './resolveSignedCopies';

const BASE = '/signed-copies';

export async function listLinks(tab: SignedTab): Promise<LinkNote[]> {
  const res = await apiFetch<{ links: LinkNote[] }>(`${BASE}?tab=${tab}`);
  return res.links;
}

export async function addLink(input: Omit<LinkNote, 'id'>): Promise<LinkNote> {
  const res = await apiFetch<{ link: LinkNote }>(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.link;
}

export async function removeLink(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`${BASE}/${encodeURIComponent(id)}/remove`, { method: 'POST' });
}
