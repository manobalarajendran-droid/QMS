import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Download, Trash2, Paperclip, FileText, AlertTriangle } from 'lucide-react';
import { useAppMode } from '../../hooks/useAppMode';
import { useEvidenceStore, type EvidenceAttachment } from '../../store/useEvidenceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { apiFetch, apiRaw, ApiError } from '../../lib/apiClient';
import { roleHasPermission } from '../../lib/permissions';
import { EVIDENCE_ACCEPT, checkEvidenceFile } from './evidenceFileRules';

type EvidenceEntityType =
  'requirement' | 'test' | 'capa' | 'ncr' | 'dcr' | 'audit' | 'mrm' | 'csi'
  | 'dml' | 'voc' | 'objective' | 'tuv' | 'action';

interface Props {
  entityType: EvidenceEntityType;
  entityId: string;
  /** Not used when signed in (files belong to the record, not a project). Kept for the callers. */
  projectId: string;
  open: boolean;
  onClose: () => void;
}

/** One file as the server sends it (GET /evidence, POST /evidence/upload). */
interface ServerEvidenceFile {
  id: string;
  entityId: string;
  entityType: EvidenceEntityType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  description: string | null;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
}

function toEvidenceAttachment(item: ServerEvidenceFile): EvidenceAttachment {
  return {
    id: item.id,
    entityId: item.entityId,
    entityType: item.entityType as EvidenceAttachment['entityType'],
    name: item.fileName,
    fileName: item.fileName,
    mimeType: item.mimeType,
    sizeBytes: item.fileSize,
    evidenceType: 'document',
    description: item.description || undefined,
    uploadedBy: item.uploadedByName || item.uploadedBy,
    uploadedAt: item.uploadedAt,
    reviewed: false,
  };
}

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message || fallback;
  return fallback;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function EvidencePanel({ entityType, entityId, open, onClose }: Props) {
  const { t } = useTranslation();
  const { mode } = useAppMode();
  const isServerMode = mode === 'server';
  const allAttachments = useEvidenceStore((s) => s.attachments);
  const attachments = useMemo(
    () => allAttachments.filter((a) => a.entityId === entityId),
    [allAttachments, entityId],
  );
  const addAttachment = useEvidenceStore((s) => s.addAttachment);
  const removeAttachment = useEvidenceStore((s) => s.removeAttachment);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [serverAttachments, setServerAttachments] = useState<EvidenceAttachment[]>([]);

  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Offline: anyone on this PC. Signed in: the same roles the server allows.
  const canUpload = !isServerMode || roleHasPermission(currentUser?.role, 'canEdit');
  const canRemove = !isServerMode || roleHasPermission(currentUser?.role, 'canDelete');

  useEffect(() => {
    if (!open || !isServerMode) return;
    let cancelled = false;
    setErrors([]);

    async function loadEvidence() {
      try {
        const response = await apiFetch<{ evidence: ServerEvidenceFile[] }>(
          `/evidence?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
        );
        if (!cancelled) setServerAttachments((response.evidence ?? []).map(toEvidenceAttachment));
      } catch (error) {
        if (!cancelled) {
          setServerAttachments([]);
          setErrors([messageOf(error, 'Could not load the files.')]);
        }
      }
    }

    void loadEvidence();
    return () => {
      cancelled = true;
    };
  }, [entityId, entityType, isServerMode, open]);

  const visibleAttachments = isServerMode ? serverAttachments : attachments;

  const readFileAsDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const addFileLocally = useCallback(async (file: File, desc: string) => {
    const dataUrl = await readFileAsDataUrl(file);
    addAttachment({
      entityId,
      entityType: entityType as EvidenceAttachment['entityType'],
      name: file.name,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      evidenceType: 'document',
      description: desc || undefined,
      dataUrl,
      uploadedBy: currentUser?.displayName || 'Anonymous',
    });
  }, [readFileAsDataUrl, addAttachment, entityId, entityType, currentUser]);

  const uploadToServer = useCallback(async (file: File, desc: string) => {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('entityType', entityType);
    form.append('entityId', entityId);
    if (desc) form.append('description', desc);
    const response = await apiRaw('/evidence/upload', { method: 'POST', body: form });
    const data = (await response.json()) as { evidence: ServerEvidenceFile };
    setServerAttachments((current) => [toEvidenceAttachment(data.evidence), ...current]);
  }, [entityId, entityType]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !canUpload) return;

      setUploading(true);
      setUploadProgress(0);
      const problems: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round((i / files.length) * 100));
        try {
          if (isServerMode) {
            // Quick check here; the server checks again (type, content and size).
            const problem = checkEvidenceFile(file.name, file.size);
            if (problem) {
              problems.push(`${file.name}: ${problem}`);
              continue;
            }
            await uploadToServer(file, description.trim());
          } else {
            await addFileLocally(file, description);
          }
        } catch (error) {
          problems.push(`${file.name}: ${messageOf(error, 'Could not add the file.')}`);
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setErrors(problems);
      setUploading(false);
      setUploadProgress(0);
      if (problems.length === 0) setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [canUpload, isServerMode, description, uploadToServer, addFileLocally],
  );

  const handleDownload = async (attachment: EvidenceAttachment) => {
    if (attachment.dataUrl) {
      const link = document.createElement('a');
      link.href = attachment.dataUrl;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    if (!isServerMode) return;
    try {
      const response = await apiRaw(`/evidence/${encodeURIComponent(attachment.id)}/download`);
      saveBlob(await response.blob(), attachment.fileName);
    } catch (error) {
      setErrors([messageOf(error, 'Could not open the file.')]);
    }
  };

  const handleDelete = async (attachment: EvidenceAttachment) => {
    if (!isServerMode) {
      removeAttachment(attachment.id);
      return;
    }
    if (!window.confirm(`Remove "${attachment.fileName}" from this record? It stays in the audit trail.`)) return;
    try {
      await apiFetch(`/evidence/${encodeURIComponent(attachment.id)}`, { method: 'DELETE' });
      setServerAttachments((current) => current.filter((a) => a.id !== attachment.id));
    } catch (error) {
      setErrors([messageOf(error, 'Could not remove the file.')]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => Math.round(bytes / 1024).toString();

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={onClose}>
      <div
        className="bg-surface-elevated rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center">
              <Paperclip className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              {t('evidence.forEntity', { type: entityType, id: entityId })}
            </h2>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Offline mode warning */}
          {!isServerMode && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <AlertTriangle className="w-4 h-4 text-warning-text shrink-0" />
              <p className="text-xs text-warning-text">{t('evidence.serverRequired')}</p>
            </div>
          )}

          {canUpload ? (<>
          {/* Upload area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-accent bg-accent-subtle'
                : 'border-border hover:border-accent/50 hover:bg-surface-hover'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
            <p className="text-sm text-text-secondary">{t('evidence.dragDrop')}</p>
            {isServerMode && (
              <p className="text-xs text-text-tertiary mt-1">
                PDF, pictures (PNG, JPG, GIF, WebP) or Office files. Up to 20 MB each.
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={isServerMode ? EVIDENCE_ACCEPT : undefined}
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </div>

          {/* Description field */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('evidence.description')}
            </label>
            <input
              type="text"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('evidence.descPlaceholder')}
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
          </div>
          </>) : (
            <p className="text-sm text-text-secondary bg-surface-secondary border border-border rounded-lg p-3">
              Your role can open these files but cannot add new ones.
            </p>
          )}

          {/* Problems */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-danger-subtle border border-danger/30 space-y-1" role="alert">
              {errors.map((message, index) => (
                <p key={index} className="text-xs text-danger-text">{message}</p>
              ))}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-1">
              <p className="text-sm text-text-secondary">{t('evidence.uploading')}</p>
              <div className="w-full bg-surface-tertiary rounded-full h-2">
                <div
                  className="bg-accent rounded-full h-2 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Evidence list */}
          {visibleAttachments.length === 0 ? (
            <div className="text-center py-5 text-text-tertiary">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{t('evidence.noEvidence')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-text-tertiary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{att.fileName}</p>
                      <p className="text-xs text-text-tertiary">
                        {t('evidence.fileSize', { size: formatFileSize(att.sizeBytes) })}
                        {' · '}
                        {att.uploadedBy}
                        {' · '}
                        {formatDate(att.uploadedAt)}
                      </p>
                      {att.description && (
                        <p className="text-xs text-text-secondary mt-0.5">{att.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => void handleDownload(att)}
                      className="p-1.5 text-text-tertiary hover:text-accent rounded-lg hover:bg-accent-subtle transition-colors"
                      title={t('evidence.download')}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {canRemove && (
                      <button
                        onClick={() => void handleDelete(att)}
                        className="p-1.5 text-text-tertiary hover:text-danger-text rounded-lg hover:bg-danger-subtle transition-colors"
                        title={t('evidence.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
