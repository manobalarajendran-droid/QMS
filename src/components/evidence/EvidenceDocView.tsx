// Renders PDF, Word and Excel files inside the evidence viewer.
// This file is only loaded through a dynamic import (see EvidenceViewer.tsx), so
// the file-viewer library lands in its own chunk and never slows the first page.
import { useEffect, useState } from 'react';
import FileViewer, { type ViewerOptions } from '@file-viewer/react';
import { pdfRenderer } from '@file-viewer/renderer-pdf';
import { wordRenderer } from '@file-viewer/renderer-word';
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet';

// The renderer packages type their mount element as HTMLDivElement while the
// options type expects HTMLElement; they are the same at runtime, so cast once.
const VIEWER_OPTIONS = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, wordRenderer, spreadsheetRenderer],
} as unknown as ViewerOptions;

interface EvidenceDocViewProps {
  blob: Blob;
  fileName: string;
}

export default function EvidenceDocView({ blob, fileName }: EvidenceDocViewProps) {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    blob.arrayBuffer().then((data) => {
      if (!cancelled) setBuffer(data);
    });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  if (!buffer) return null;

  return (
    <FileViewer
      className="w-full h-full"
      buffer={buffer}
      filename={fileName}
      size={blob.size}
      options={VIEWER_OPTIONS}
    />
  );
}
