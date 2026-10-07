import { useState, useMemo } from 'react';
import { useDMLStore } from '../../store/useDMLStore';
import { ShieldCheck, FileText, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';

const ISO_CLAUSES = [
  { id: '4', title: 'Context of the Organization', sub: ['4.1 Context', '4.2 Interested Parties', '4.3 Scope', '4.4 QMS & Processes'] },
  { id: '5', title: 'Leadership', sub: ['5.1 Leadership & Commitment', '5.2 Policy', '5.3 Roles, Responsibilities & Authorities'] },
  { id: '6', title: 'Planning', sub: ['6.1 Risks & Opportunities', '6.2 Quality Objectives', '6.3 Planning of Changes'] },
  { id: '7', title: 'Support', sub: ['7.1 Resources', '7.2 Competence', '7.3 Awareness', '7.4 Communication', '7.5 Documented Information'] },
  { id: '8', title: 'Operation', sub: ['8.1 Operational Planning', '8.2 Requirements', '8.3 Design & Development', '8.4 External Providers', '8.5 Production & Service', '8.6 Release', '8.7 Nonconforming Outputs'] },
  { id: '9', title: 'Performance Evaluation', sub: ['9.1 Monitoring & Measurement', '9.2 Internal Audit', '9.3 Management Review'] },
  { id: '10', title: 'Improvement', sub: ['10.1 General', '10.2 Nonconformity & Corrective Action', '10.3 Continual Improvement'] },
];

export function ComplianceMap() {
  const dmlRecords = useDMLStore((s) => s.records);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '4': true, '5': true });
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  // Map DML records to clauses based on the 'cl' field
  const mappedDocs = useMemo(() => {
    const map: Record<string, typeof dmlRecords> = {};
    dmlRecords.forEach((doc) => {
      if (doc.cl) {
        // e.g. "Cl. 9.2", "4.4"
        const matches = doc.cl.match(/\d+\.\d+/g);
        if (matches) {
          matches.forEach(m => {
            if (!map[m]) map[m] = [];
            map[m].push(doc);
          });
        }
      }
    });
    return map;
  }, [dmlRecords]);

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const getSubDocs = (subName: string) => {
    const prefix = subName.split(' ')[0]; // e.g., "4.1"
    return mappedDocs[prefix] || [];
  };

  const getClauseStatus = (clauseId: string) => {
    const subs = ISO_CLAUSES.find(c => c.id === clauseId)?.sub || [];
    let hasDocs = false;
    let missingDocs = false;
    subs.forEach(s => {
      const docs = getSubDocs(s);
      if (docs.length > 0) hasDocs = true;
      else missingDocs = true;
    });
    if (hasDocs && !missingDocs) return 'complete';
    if (hasDocs && missingDocs) return 'partial';
    return 'empty';
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Sidebar with clauses */}
      <div className="w-[340px] shrink-0 flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-sm p-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <div>
            <h1 className="text-[16px] font-semibold tracking-tight text-text-primary">ISO 9001 Gap Map</h1>
            <p className="text-[11px] text-text-tertiary mt-0.5">Clause compliance coverage</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
          {ISO_CLAUSES.map((clause) => {
            const status = getClauseStatus(clause.id);
            return (
              <div key={clause.id} className="border border-border/60 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggle(clause.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-surface-secondary hover:bg-surface-hover transition-colors text-left"
                >
                  {expanded[clause.id] ? <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />}
                  <span className="font-semibold text-[11px] text-text-tertiary uppercase tracking-[0.08em] w-5">Cl {clause.id}</span>
                  <span className="flex-1 text-[12.5px] font-semibold text-text-primary truncate">{clause.title}</span>
                  {status === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 text-success-text shrink-0" />}
                  {status === 'partial' && <AlertTriangle className="w-3.5 h-3.5 text-warning-text shrink-0" />}
                  {status === 'empty' && <Info className="w-3.5 h-3.5 text-text-tertiary shrink-0" />}
                </button>
                
                {expanded[clause.id] && (
                  <div className="px-2 py-1.5 space-y-0.5 bg-surface">
                    {clause.sub.map((sub) => {
                      const docs = getSubDocs(sub);
                      const isSelected = selectedSub === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => setSelectedSub(sub)}
                          className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left text-[12.5px] transition-colors ${
                            isSelected ? 'bg-accent-subtle text-accent-text' : 'hover:bg-surface-hover text-text-secondary'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${docs.length > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
                          <span className="flex-1">{sub}</span>
                          {docs.length > 0 && <span className="text-[10px] bg-surface-secondary border border-border/60 px-1.5 py-0.5 rounded">{docs.length} docs</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border/60 bg-surface shadow-sm overflow-hidden">
        {selectedSub ? (
          <>
            <div className="px-5 py-4 border-b border-border/60 bg-surface-secondary">
              <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-2">
                Clause {selectedSub}
              </h3>
              <p className="text-[11px] text-text-tertiary mt-0.5">Mapped Documents &amp; Processes</p>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              {getSubDocs(selectedSub).length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {getSubDocs(selectedSub).map((doc) => (
                    <div key={doc.id} className="border border-border/60 rounded-xl p-4 flex gap-3 hover:border-accent transition-colors shadow-sm">
                      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${doc.hierarchyLevel === 'L1' ? 'bg-purple-100 text-purple-700' : doc.hierarchyLevel === 'L2' ? 'bg-blue-100 text-blue-700' : doc.hierarchyLevel === 'L3' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12.5px] font-semibold text-text-primary truncate" title={doc.tt || doc.no}>{doc.tt || doc.no}</h4>
                        <div className="text-[11px] text-text-tertiary mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-medium bg-surface-secondary border border-border/60 px-1.5 py-0.5 rounded">{doc.no}</span>
                          <span>Rev {doc.rv || '0'}</span>
                          <span>{doc.dept || 'General'}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={doc.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-danger-text mb-3">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h4 className="text-[12.5px] font-semibold text-text-primary">Gap Identified</h4>
                  <p className="text-[11px] text-text-tertiary mt-1 max-w-sm">No active documents are currently mapped to Clause {selectedSub}. You may need to create a new procedure or update an existing document's ISO clause mapping.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <ShieldCheck className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-[12.5px]">Select an ISO 9001 clause to view mapped compliance documents</p>
          </div>
        )}
      </div>
    </div>
  );
}

