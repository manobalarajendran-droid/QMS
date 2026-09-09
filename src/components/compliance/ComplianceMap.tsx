import { useState, useMemo } from 'react';
import { useDMLStore } from '../../store/useDMLStore';
import { ShieldCheck, FileText, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

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
      <div className="w-96 shrink-0 flex flex-col gap-3 overflow-hidden bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
          <ShieldCheck className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-text-primary dark:text-white">ISO 9001:2015 Map</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {ISO_CLAUSES.map((clause) => {
            const status = getClauseStatus(clause.id);
            return (
              <div key={clause.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggle(clause.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-surface-secondary hover:bg-surface-hover transition-colors text-left"
                >
                  {expanded[clause.id] ? <ChevronDown className="w-4 h-4 text-text-tertiary" /> : <ChevronRight className="w-4 h-4 text-text-tertiary" />}
                  <span className="font-bold text-text-secondary w-6">Cl {clause.id}</span>
                  <span className="flex-1 text-sm font-semibold text-text-secondary truncate">{clause.title}</span>
                  {status === 'complete' && <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" />}
                  {status === 'partial' && <AlertTriangle className="w-4 h-4 text-warning-text shrink-0" />}
                  {status === 'empty' && <Info className="w-4 h-4 text-text-tertiary shrink-0" />}
                </button>
                
                {expanded[clause.id] && (
                  <div className="p-2 space-y-1 bg-surface">
                    {clause.sub.map((sub) => {
                      const docs = getSubDocs(sub);
                      const isSelected = selectedSub === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => setSelectedSub(sub)}
                          className={`w-full flex items-start gap-2 px-3 py-2 rounded text-left text-sm transition-colors ${
                            isSelected ? 'bg-accent-subtle text-accent-text' : 'hover:bg-surface-hover text-text-secondary'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${docs.length > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
                          <span className="flex-1">{sub}</span>
                          {docs.length > 0 && <span className="text-xs bg-surface-tertiary px-1.5 py-0.5 rounded">{docs.length} docs</span>}
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
      <div className="flex-1 flex flex-col bg-surface rounded-xl border border-border overflow-hidden">
        {selectedSub ? (
          <>
            <div className="p-5 border-b border-border bg-surface-secondary">
              <h3 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
                Clause {selectedSub}
              </h3>
              <p className="text-sm text-text-tertiary mt-1">Mapped Documents & Processes</p>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              {getSubDocs(selectedSub).length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {getSubDocs(selectedSub).map((doc) => (
                    <div key={doc.id} className="border border-border rounded-lg p-4 flex gap-3 hover:border-accent transition-colors">
                      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${doc.hierarchyLevel === 'L1' ? 'bg-purple-100 text-purple-700' : doc.hierarchyLevel === 'L2' ? 'bg-blue-100 text-blue-700' : doc.hierarchyLevel === 'L3' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-text-primary truncate" title={doc.tt || doc.no}>{doc.tt || doc.no}</h4>
                        <div className="text-xs text-text-tertiary mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-medium bg-surface-tertiary px-1.5 py-0.5 rounded">{doc.no}</span>
                          <span>Rev {doc.rv || '0'}</span>
                          <span>{doc.dept || 'General'}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          doc.status === 'Published' ? 'bg-green-100 text-green-700' :
                          doc.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                          doc.status === 'UnderReview' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-surface-tertiary text-text-secondary'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-danger-text mb-3">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-text-primary">Gap Identified</h4>
                  <p className="text-xs text-text-tertiary mt-1 max-w-sm">No active documents are currently mapped to Clause {selectedSub}. You may need to create a new procedure or update an existing document's ISO clause mapping.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <ShieldCheck className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select an ISO 9001 clause to view mapped compliance documents</p>
          </div>
        )}
      </div>
    </div>
  );
}
