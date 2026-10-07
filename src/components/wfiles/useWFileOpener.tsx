// Opens a W: file in the portal viewer (PDF, pictures) or saves it (Office files).
// Shared by the Document Master List and the evidence panel so both behave like
// the "QMS files (W:)" screen.
import { useState, type ReactNode } from 'react';
import { EvidenceViewer } from '../evidence/EvidenceViewer';
import { evidenceViewKind } from '../evidence/evidenceFileRules';
import { fetchFile, saveBlob } from './wfilesApi';

export interface WFileRef { id: string; name: string }

export interface WFileOpener {
  open: (f: WFileRef) => Promise<void>;
  busyId: string | null;
  error: string;
  /** Put this once in the screen; it shows the viewer when a file is open. */
  viewer: ReactNode;
}

export function useWFileOpener(): WFileOpener {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<{ blob: Blob; name: string } | null>(null);

  const open = async (f: WFileRef) => {
    setBusyId(f.id);
    setError('');
    try {
      const blob = await fetchFile(f.id);
      if (evidenceViewKind(f.name) === 'none') saveBlob(blob, f.name);
      else setViewing({ blob, name: f.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the file. Is the W: helper running?');
    } finally {
      setBusyId(null);
    }
  };

  const viewer = viewing ? (
    <EvidenceViewer blob={viewing.blob} fileName={viewing.name}
      onClose={() => setViewing(null)} onDownload={() => saveBlob(viewing.blob, viewing.name)} />
  ) : null;

  return { open, busyId, error, viewer };
}
