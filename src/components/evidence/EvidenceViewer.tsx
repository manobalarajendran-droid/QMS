// In-app preview for one evidence file. Images use a plain <img>; PDF, Word and
// Excel go through the file-viewer library, which is loaded on demand only.
import { Suspense, lazy, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Download } from 'lucide-react';
import { evidenceViewKind } from './evidenceFileRules';

const EvidenceDocView = lazy(() => import('./EvidenceDocView'));

interface EvidenceViewerProps {
  blob: Blob;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
}

export function EvidenceViewer({ blob, fileName, onClose, onDownload }: EvidenceViewerProps) {
  const { t } = useTranslation();
  const kind = evidenceViewKind(fileName);
  const imageUrl = useMemo(() => (kind === 'image' ? URL.createObjectURL(blob) : null), [blob, kind]);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loading = <p className="p-6 text-sm text-text-tertiary">{t('common.loading', 'Loading...')}</p>;

  // Portal to <body>: the evidence panel can sit inside a drawer with a CSS
  // transform, which would otherwise trap this fixed overlay inside the drawer.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={fileName}
      data-testid="evidence-viewer"
    >
      <div className="bg-surface-elevated rounded-xl shadow-2xl w-full max-w-5xl h-full max-h-[92vh] flex flex-col border border-border">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border">
          <p className="text-sm font-medium text-text-primary truncate">{fileName}</p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onDownload}
              className="p-1.5 text-text-tertiary hover:text-accent rounded-lg hover:bg-accent-subtle transition-colors"
              title={t('evidence.download')}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-text-tertiary hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
              title={t('common.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto bg-surface">
          {kind === 'image' && imageUrl && (
            <img src={imageUrl} alt={fileName} className="max-w-full max-h-full mx-auto object-contain" />
          )}
          {kind === 'document' && (
            <Suspense fallback={loading}>
              <EvidenceDocView blob={blob} fileName={fileName} />
            </Suspense>
          )}
          {kind === 'none' && (
            <div className="p-6 text-sm text-text-secondary">
              {t('evidence.noPreview', 'This file type cannot be shown here. Please download it.')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
