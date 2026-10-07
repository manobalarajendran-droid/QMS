// Quick checks before a file is sent to the server.
// The server checks again (qms-server/server/lib/evidenceRules.ts), including the file content.

export const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024; // 20 MB, same as the server

const ALLOWED_EXTENSIONS = [
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp',
  'doc', 'xls', 'ppt', 'docx', 'xlsx', 'pptx',
];

/** Value for the file picker's `accept` attribute. */
export const EVIDENCE_ACCEPT = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',');

/** Returns a plain-English problem, or null when the file can be sent. */
export function checkEvidenceFile(fileName: string, size: number): string | null {
  const dot = fileName.lastIndexOf('.');
  const ext = dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Only PDF, pictures (PNG, JPG, GIF, WebP) and Office files (Word, Excel, PowerPoint) can be added.';
  }
  if (size <= 0) return 'The file is empty.';
  if (size > MAX_EVIDENCE_BYTES) return 'The file is bigger than 20 MB.';
  return null;
}

// ── In-app preview ──
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];

export type EvidenceViewKind = 'image' | 'document' | 'none';

function viewExtensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** Which way a file can be previewed. 'none' means: offer download instead. */
export function evidenceViewKind(fileName: string): EvidenceViewKind {
  const ext = viewExtensionOf(fileName);
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (DOC_EXTENSIONS.includes(ext)) return 'document';
  return 'none';
}
