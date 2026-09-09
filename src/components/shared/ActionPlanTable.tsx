import { useState } from 'react';
import { Paperclip, Pencil } from 'lucide-react';
import { EvidencePanel } from '../evidence/EvidencePanel';

export interface ActionPlanRow {
  key: 'containment' | 'corrective' | 'preventive';
  label: string;
  description?: string;
  owner?: string;
  targetDate?: string;
  completionDate?: string;
}

interface ActionPlanTableProps {
  rows: ActionPlanRow[];
  editable: boolean;
  entityId: string;
  projectId: string;
  onChange: (key: ActionPlanRow['key'], field: 'description' | 'owner' | 'targetDate' | 'completionDate', value: string) => void;
}

function isOverdue(row: ActionPlanRow): boolean {
  if (row.completionDate || !row.targetDate) return false;
  return new Date(row.targetDate) < new Date(new Date().toDateString());
}

export function ActionPlanTable({ rows, editable, entityId, projectId, onChange }: ActionPlanTableProps) {
  const [evidenceRowKey, setEvidenceRowKey] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-surface-secondary text-left text-xs uppercase tracking-wide text-text-tertiary">
              <th className="px-3 py-2 font-semibold">Action</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 font-semibold">Owner</th>
              <th className="px-3 py-2 font-semibold">Target Date</th>
              <th className="px-3 py-2 font-semibold">Completed</th>
              <th className="px-3 py-2 font-semibold">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const overdue = isOverdue(row);
              return (
                <tr key={row.key} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-text-primary align-top whitespace-nowrap">
                    {row.label}
                    {overdue && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger-subtle text-danger-text">
                        OVERDUE
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top min-w-[200px]">
                    {editable ? (
                      <textarea
                        rows={2}
                        value={row.description ?? ''}
                        onChange={(e) => onChange(row.key, 'description', e.target.value)}
                        className="w-full bg-surface border border-border rounded-md p-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder={`Describe the ${row.label.toLowerCase()}…`}
                      />
                    ) : (
                      <span className="text-text-secondary whitespace-pre-wrap">{row.description || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top min-w-[140px]">
                    {editable ? (
                      <input
                        type="text"
                        value={row.owner ?? ''}
                        onChange={(e) => onChange(row.key, 'owner', e.target.value)}
                        className="w-full bg-surface border border-border rounded-md p-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Owner name"
                      />
                    ) : (
                      <span className="text-text-secondary">{row.owner || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {editable ? (
                      <input
                        type="date"
                        value={row.targetDate ?? ''}
                        onChange={(e) => onChange(row.key, 'targetDate', e.target.value)}
                        className="bg-surface border border-border rounded-md p-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    ) : (
                      <span className="text-text-secondary">{row.targetDate || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {editable ? (
                      <input
                        type="date"
                        value={row.completionDate ?? ''}
                        onChange={(e) => onChange(row.key, 'completionDate', e.target.value)}
                        className="bg-surface border border-border rounded-md p-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    ) : (
                      <span className="text-text-secondary">{row.completionDate || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <button
                      onClick={() => setEvidenceRowKey(row.key)}
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      <Paperclip className="w-3 h-3" /> Attach
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!editable && (
        <p className="text-xs text-text-tertiary flex items-center gap-1">
          <Pencil className="w-3 h-3" /> Read-only for your role.
        </p>
      )}
      {evidenceRowKey && (
        <EvidencePanel
          entityType="ncr"
          entityId={`${entityId}:${evidenceRowKey}`}
          projectId={projectId}
          open={true}
          onClose={() => setEvidenceRowKey(null)}
        />
      )}
    </div>
  );
}
