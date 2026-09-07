import os
import re

file_path = "d:/QMS Dashboard/QAtrial/src/components/ncr/NCRWorkflow.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add a state for showing the form modal
if "const [showForm, setShowForm] = useState(false);" not in content:
    content = content.replace(
        "const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);",
        "const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);\n  const [showForm, setShowForm] = useState(false);\n  const [showArchived, setShowArchived] = useState(false);"
    )

# Add buttons to the header
header_replacement = """<div className="mb-6 flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold text-text-primary">NCR Workflow Board</h2>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-border" />
            Show Archived
          </label>
          <button onClick={() => setShowForm(true)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-2">
            + New NCR
          </button>
        </div>
      </div>"""

content = re.sub(
    r'<div className="mb-6 flex items-center justify-between shrink-0">.*?</div>',
    header_replacement,
    content,
    flags=re.DOTALL
)

# Filter records
if "const filteredRecords = records.filter(r => showArchived ? true : !r.isArchived);" not in content:
    content = content.replace(
        "const selectedRecord = records.find((r) => r.id === selectedRecordId) || null;",
        "const selectedRecord = records.find((r) => r.id === selectedRecordId) || null;\n  const filteredRecords = records.filter(r => showArchived ? true : !r.isArchived);"
    )

content = content.replace("{records.filter(r => r.status === status).length}", "{filteredRecords.filter(r => r.status === status).length}")
content = content.replace("records\n                .filter(r => r.status === status)", "filteredRecords\n                .filter(r => r.status === status)")

# Add Delete & Archive buttons
detail_modal_replacement = """<button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-text-tertiary hover:text-text-primary">
            <X className="w-6 h-6" />
          </button>
        </div>"""

if "onClick={() => updateRecord(record.id, { isArchived: !record.isArchived })}" not in content:
    content = content.replace(
        detail_modal_replacement,
        """<div className="flex items-center gap-2">
            <button onClick={() => {
               if (window.confirm('Delete this NCR?')) {
                 useNCRStore.getState().deleteRecord(record.id);
                 onClose();
               }
            }} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
              Delete
            </button>
            <button onClick={() => {
               updateRecord(record.id, { isArchived: !record.isArchived });
               onClose();
            }} className="p-2 text-amber-500 hover:bg-amber-50 rounded-full transition-colors">
              {record.isArchived ? 'Unarchive' : 'Archive'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-text-tertiary hover:text-text-primary">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>"""
    )


# Add Form Modal
form_modal = """
      {showForm && (
        <NCRFormModal 
          onClose={() => setShowForm(false)} 
          onSubmit={(data) => {
            useNCRStore.getState().addRecord({...data, status: 'Open'});
            setShowForm(false);
          }} 
        />
      )}
"""
if "NCRFormModal" not in content:
    content = content.replace("</div>\n  );\n}", form_modal + "    </div>\n  );\n}")

# Implement NCRFormModal
ncr_form_modal = """
function NCRFormModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    ref: '', project: '', raisedBy: '', auditeeName: '', auditeeDept: '', classification: 'NCR', desc: '', objEvidence: ''
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-2xl rounded-xl p-6 shadow-2xl border border-border">
        <h3 className="text-xl font-bold mb-4">Create New NCR</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <input placeholder="Reference" className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.ref} onChange={e => setFormData({...formData, ref: e.target.value})} required />
          <input placeholder="Project" className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} required />
          <input placeholder="Raised By" className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.raisedBy} onChange={e => setFormData({...formData, raisedBy: e.target.value})} required />
          <input placeholder="Auditee Dept" className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.auditeeDept} onChange={e => setFormData({...formData, auditeeDept: e.target.value})} required />
          <select className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.classification} onChange={e => setFormData({...formData, classification: e.target.value as any})}>
            <option value="NCR">NCR</option>
            <option value="Potential NCR">Potential NCR</option>
            <option value="Observation">Observation</option>
          </select>
          <div className="col-span-2">
            <textarea placeholder="Description" className="border border-border bg-surface p-2 rounded w-full focus:ring-2 focus:ring-accent outline-none" rows={3} value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} required />
          </div>
          <div className="col-span-2">
            <textarea placeholder="Objective Evidence" className="border border-border bg-surface p-2 rounded w-full focus:ring-2 focus:ring-accent outline-none" rows={2} value={formData.objEvidence} onChange={e => setFormData({...formData, objEvidence: e.target.value})} required />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded hover:bg-surface-hover">Cancel</button>
          <button onClick={() => onSubmit(formData)} className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover">Submit</button>
        </div>
      </div>
    </div>
  );
}
"""
if "function NCRFormModal" not in content:
    content += ncr_form_modal

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated NCRWorkflow.tsx")
