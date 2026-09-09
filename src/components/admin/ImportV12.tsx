import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import { useNCRStore } from '../../store/useNCRStore';
import { useObjectivesStore } from '../../store/useObjectivesStore';
import { useCSIStore } from '../../store/useCSIStore';
import { useDMLStore } from '../../store/useDMLStore';
import { useMRMStore } from '../../store/useMRMStore';
import { useDCRStore } from '../../store/useDCRStore';
import { useTUVStore } from '../../store/useTUVStore';
import { useAuditProgrammeStore } from '../../store/useAuditProgrammeStore';
import { useCAPAStore } from '../../store/useCAPAStore';
import { useEvidenceStore } from '../../store/useEvidenceStore';

export function ImportV12() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [status, setStatus] = useState<any>({});

  const ncrStore = useNCRStore();
  const objStore = useObjectivesStore();
  const csStore = useCSIStore();
  const dmlStore = useDMLStore();
  const mrmStore = useMRMStore();
  const dcrStore = useDCRStore();
  const tuvStore = useTUVStore();
  const auditStore = useAuditProgrammeStore();
  const capaStore = useCAPAStore();
  const evidenceStore = useEvidenceStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus({});
      setPreview(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    const text = await file.text();
    
    // Handle JSON Backup Files from v12 "Export Backup"
    if (file.name.toLowerCase().endsWith('.json')) {
      try {
        const data = JSON.parse(text);
        const ncrData = data.ncr || [];
        const objData = data.obj || [];
        const csData = data.cs || [];
        const dmlData = data.dml || [];
        const mrmData = data.mrm || [];
        const dcrData = data.dcr || [];
        const tuvData = data.tuv || [];
        const auditsData = data.audits || [];
        const actionsData = data.actions || [];
        const evfileData = data.evfile || [];
        const customDeptsData = data.customDepts || [];

        setExtractedData({ ncrData, objData, csData, dmlData, mrmData, dcrData, tuvData, auditsData, actionsData, evfileData, customDeptsData });
        setPreview({
          ncr: ncrData.length,
          obj: objData.length,
          cs: csData.length,
          dml: dmlData.length,
          mrm: mrmData.length,
          dcr: dcrData.length,
          tuv: tuvData.length,
          audits: auditsData.length,
          actions: actionsData.length,
          evfile: evfileData.length,
        } as any);
      } catch (err) {
        console.error('Failed to parse JSON backup', err);
        alert('Invalid JSON backup file.');
      }
      setLoading(false);
      return;
    }

    // Legacy fallback for HTML files containing SEED_* arrays
    const extract = (varName: string) => {
      const startIdx = text.indexOf(`const ${varName} = [`);
      if (startIdx === -1) return [];
      
      const arrStart = text.indexOf('[', startIdx);
      let arrEnd = -1;
      let brackets = 0;
      for (let i = arrStart; i < text.length; i++) {
        if (text[i] === '[') brackets++;
        if (text[i] === ']') brackets--;
        if (brackets === 0) {
          arrEnd = i;
          break;
        }
      }
      if (arrEnd !== -1) {
        const arrStr = text.substring(arrStart, arrEnd + 1);
        try {
          return new Function(`return ${arrStr};`)() || [];
        } catch (err) {
          console.error('Parse error for', varName, err);
          return [];
        }
      }
      return [];
    };

    const ncrData = extract('SEED_NCR');
    const objData = extract('SEED_OBJ');
    const csData = extract('SEED_CS');
    const dmlData = extract('SEED_DML');
    const mrmData = extract('SEED_MRM');
    // Legacy v12 HTML exports never contained these entities — initialise
    // them as empty so the preview and import status match the shape
    // produced by the JSON backup branch instead of leaving them undefined.
    const dcrData: any[] = [];
    const tuvData: any[] = [];
    const auditsData: any[] = [];
    const actionsData: any[] = [];
    const evfileData: any[] = [];
    const customDeptsData: any[] = [];

    setExtractedData({ ncrData, objData, csData, dmlData, mrmData, dcrData, tuvData, auditsData, actionsData, evfileData, customDeptsData });
    setPreview({
      ncr: ncrData.length,
      obj: objData.length,
      cs: csData.length,
      dml: dmlData.length,
      mrm: mrmData.length,
      dcr: dcrData.length,
      tuv: tuvData.length,
      audits: auditsData.length,
      actions: actionsData.length,
      evfile: evfileData.length,
    });
    setLoading(false);
  };

  const handleImport = () => {
    if (!extractedData) return;
    setLoading(true);
    const newStatus: any = {};
    
    try {
      extractedData.ncrData.forEach((item: any) => ncrStore.addRecord({ ...item, status: item.status || 'Open' }));
      newStatus.ncr = { count: extractedData.ncrData.length, error: false };
    } catch (e) { newStatus.ncr = { count: 0, error: true }; }

    try {
      extractedData.objData.forEach((item: any) => objStore.addRecord({ ...item, status: item.status || 'Not Started' }));
      newStatus.obj = { count: extractedData.objData.length, error: false };
    } catch (e) { newStatus.obj = { count: 0, error: true }; }

    try {
      extractedData.csData.forEach((item: any) => csStore.addRecord({ ...item, status: item.status || 'open' }));
      newStatus.cs = { count: extractedData.csData.length, error: false };
    } catch (e) { newStatus.cs = { count: 0, error: true }; }

    try {
      extractedData.dmlData.forEach((item: any) => dmlStore.addRecord({ ...item, status: item.status || 'Draft' }));
      newStatus.dml = { count: extractedData.dmlData.length, error: false };
    } catch (e) { newStatus.dml = { count: 0, error: true }; }

    try {
      extractedData.mrmData.forEach((item: any) => mrmStore.addRecord({ ...item, status: item.status || 'Scheduled' }));
      newStatus.mrm = { count: extractedData.mrmData.length, error: false };
    } catch (e) { newStatus.mrm = { count: 0, error: true }; }

    try {
      extractedData.dcrData.forEach((item: any) => dcrStore.addRecord({ ...item, status: item.status || 'Draft' }));
      newStatus.dcr = { count: extractedData.dcrData.length, error: false };
    } catch (e) { newStatus.dcr = { count: 0, error: true }; }

    try {
      extractedData.tuvData.forEach((item: any) => tuvStore.addRecord({ ...item, status: item.status || 'Open' }));
      newStatus.tuv = { count: extractedData.tuvData.length, error: false };
    } catch (e) { newStatus.tuv = { count: 0, error: true }; }

    try {
      extractedData.auditsData.forEach((item: any) => auditStore.addRecord({ ...item, status: item.status || 'Planned' }));
      newStatus.audits = { count: extractedData.auditsData.length, error: false };
    } catch (e) { newStatus.audits = { count: 0, error: true }; }

    try {
      extractedData.actionsData.forEach((item: any) => capaStore.addRecord({ ...item, status: item.status || 'Open' }));
      newStatus.actions = { count: extractedData.actionsData.length, error: false };
    } catch (e) { newStatus.actions = { count: 0, error: true }; }

    try {
      if (extractedData.evfileData && extractedData.evfileData.length > 0) {
        // useEvidenceStore has addAttachment method
        extractedData.evfileData.forEach((item: any) => evidenceStore.addAttachment({
          entityId: item.entityId,
          entityType: item.entityType || 'other',
          name: item.name || 'Legacy Evidence',
          fileName: item.fileName || item.name || 'legacy.pdf',
          mimeType: item.fileType || 'application/pdf',
          size: item.size || 0,
          url: item.fileUrl || item.url || '',
          uploadedBy: item.uploadedBy || 'System'
        } as any));
      }
      newStatus.evfile = { count: extractedData.evfileData?.length || 0, error: false };
    } catch (e) { newStatus.evfile = { count: 0, error: true }; }

    try {
      if (extractedData.customDeptsData && extractedData.customDeptsData.length > 0) {
        // Ignored for now
      }
      newStatus.customDepts = { count: 0, error: false };
    } catch (e) { newStatus.customDepts = { count: 0, error: true }; }

    setStatus(newStatus);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload className="text-accent-text" />
          V12 Data Import Bridge
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Upload v12 HTML File or JSON Backup</label>
            <input type="file" accept=".html,.json" onChange={handleFileChange} className="block w-full text-sm text-text-tertiary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-subtle file:text-accent-text hover:file:bg-accent-subtle" />
          </div>
          <button onClick={handleScan} disabled={!file || loading} className="px-4 py-2 bg-accent text-accent-fg rounded-lg disabled:opacity-50">
            {loading ? 'Scanning...' : 'Scan File'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-lg font-bold mb-4">Preview</h3>
          <ul className="space-y-2 mb-4">
            <li className="flex justify-between border-b pb-2"><span>NCR Records:</span> <span className="font-semibold">{preview.ncr}</span></li>
            <li className="flex justify-between border-b pb-2"><span>Objectives:</span> <span className="font-semibold">{preview.obj}</span></li>
            <li className="flex justify-between border-b pb-2"><span>CSI Records:</span> <span className="font-semibold">{preview.cs}</span></li>
            <li className="flex justify-between border-b pb-2"><span>DML Records:</span> <span className="font-semibold">{preview.dml}</span></li>
            <li className="flex justify-between border-b pb-2"><span>MRM Records:</span> <span className="font-semibold">{preview.mrm}</span></li>
            <li className="flex justify-between border-b pb-2"><span>DCR Records:</span> <span className="font-semibold">{preview.dcr}</span></li>
            <li className="flex justify-between border-b pb-2"><span>TUV Records:</span> <span className="font-semibold">{preview.tuv}</span></li>
            <li className="flex justify-between border-b pb-2"><span>Audit Records:</span> <span className="font-semibold">{preview.audits}</span></li>
            <li className="flex justify-between border-b pb-2"><span>CAPA Actions:</span> <span className="font-semibold">{preview.actions}</span></li>
            <li className="flex justify-between border-b pb-2"><span>Evidence Files:</span> <span className="font-semibold">{preview.evfile}</span></li>
          </ul>
          
          <button onClick={handleImport} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 font-medium">
            Import All
          </button>
        </div>
      )}

      {Object.keys(status).length > 0 && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-lg font-bold mb-4">Import Status</h3>
          <ul className="space-y-2">
            {Object.entries(status).map(([key, val]: [string, any]) => (
              <li key={key} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="uppercase font-medium text-text-secondary">{key}</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm text-text-tertiary">{val.count} imported</span>
                  {val.error ? <XCircle className="text-danger-text w-5 h-5" /> : <CheckCircle className="text-success-text w-5 h-5" />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
