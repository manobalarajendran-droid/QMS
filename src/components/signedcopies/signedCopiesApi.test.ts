import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();
vi.mock('../../lib/apiClient', () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
import { addLink, listLinks, removeLink } from './signedCopiesApi';

const note = { tab: 'csi' as const, rowId: 'r1', wFileId: 'f1', fileName: 'a.pdf', kind: 'link' as const };

// apiFetch already prefixes the API base (/api), so paths here start at /signed-copies.
describe('signedCopiesApi', () => {
  beforeEach(() => apiFetch.mockReset());
  it('lists the links of one tab', async () => {
    apiFetch.mockResolvedValue({ links: [{ id: 'L1', ...note }] });
    expect(await listLinks('csi')).toEqual([{ id: 'L1', ...note }]);
    expect(apiFetch).toHaveBeenCalledWith('/signed-copies?tab=csi');
  });
  it('posts a new link as JSON', async () => {
    apiFetch.mockResolvedValue({ link: { id: 'L1', ...note } });
    expect(await addLink(note)).toEqual({ id: 'L1', ...note });
    const [path, opts] = apiFetch.mock.calls[0];
    expect(path).toBe('/signed-copies');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(note);
  });
  it('removes a link by id', async () => {
    apiFetch.mockResolvedValue({ ok: true });
    await removeLink('L 1');
    expect(apiFetch).toHaveBeenCalledWith('/signed-copies/L%201/remove', { method: 'POST' });
  });
});
