# Signed Copies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each row in the NCR, DCR, CSI and Objectives tabs (then Audit, TUV and MRM) shows its signed copy from W:. Each tab shows the counts of signed, missing and not linked. The Desktop QMS files that are not on W: are handed over as a sorted copy pack.

**Architecture:** W: files reach the portal only through the laptop helper (`/list`, which gives `WFile`). One pure function, `resolveSignedCopies`, matches the files to the rows using per-tab name rules plus hand links saved in D1 (`SignedCopyLink`). The card, the tracker, the "Not linked" list and the overview page all read from that one result.

**Tech Stack:** React + Vite + zustand (qms-cloudflare), Hono Worker + D1 (qms-server), vitest, node:sqlite for SQL tests, Python for the copy pack.

**Spec:** `docs/superpowers/specs/2026-10-07-signed-copies-design.md` (approved 7 Oct 2026).

## Global Constraints

- W: (`\\192.168.3.10\Master QMS Repository`) is READ ONLY: no script or code writes, moves or deletes anything there.
- The Desktop QMS folders are READ ONLY: the pack COPIES files and never moves them.
- Files are never stored in the cloud. The DB holds only links (row ↔ W: file id + name).
- The real seed data is never changed or reclassified.
- Name clean-up for matching: lower case, letters and digits only (`norm`).
- Link `kind` is exactly `link` or `not_this_one`.
- `SignedCopyLink` is never hard-deleted. Only `removedBy`/`removedAt` may be filled in, once.
- Only users with `canEdit` (admin, qa_manager, qa_engineer, department_spoc, editor) may add or remove links. Anyone signed in may read.
- Obsolete files (`isObsoleteName`: /OBSOLETE|SUPERSEDED/i) never count as a signed copy.
- The user-facing text matches the spec exactly: "No signed copy on W:", "W: not reachable now. The laptop helper may be off.", "Can't count, W: offline", "This file is no longer on W:".
- QMS prod deploys are allowed without asking.
- Training has no tab in the portal, so it is deferred (it is reported to the user, not built).
- Risks/Issues/Opportunities already show their W: files per department and year in the `annual_set` screen (`annualSet.ts filesFor`). No new card is added there.

## Review Focus

1. **One file matching two rows** (e.g. two NCRs for the same client and year): the file must not be auto-linked. It goes to "Not linked" with "matches more than one row". The test is in Task 2.
2. **Helper offline** (`useWFiles` state is not `ready`): the tracker must say "Can't count, W: offline", not "0 of 10 signed". The test is in Task 2 (`counts` is `null` when files are `null`).
3. **A linked file renamed or moved on W:**: the row keeps the link and shows the saved name in orange. It still counts as signed (the user linked it), but it is flagged `missingOnW`. The test is in Task 2.
4. **A double click on Link** (the same link posted twice): the server must not store two active links for the same tab+row+file. It returns the existing one. The test is in Task 3 (unique partial index).
5. **Rows with empty key fields** (no client, or no date): such a row must never auto-match (an empty key would match every file). It shows "missing" and can still be hand-linked. The test is in Task 2.

---

## File map

| File | Job |
|---|---|
| `D:\QMS Evidence\_pack-tools\build_pack.py` (+ test) (new) | Builds the copy pack from `c_vs_w.csv` (copy only) |
| `qms-server/migrations/0008_signed_copy_links.sql` (new) | The table, indexes and guard triggers |
| `qms-server/server/lib/signedCopyRules.ts` (+ `.test.ts`) (new) | Input checks |
| `qms-server/server/lib/signedCopySql.ts` (+ `.node.test.ts`) (new) | SQL strings, tested on node:sqlite |
| `qms-server/server/routes/signedCopies.ts` (new), `server/worker.ts` (modify) | The API |
| `qms-cloudflare/vitest.config.ts` (new), `package.json` (modify) | Front-end tests |
| `src/components/signedcopies/matchRules.ts` (+ test) (new) | Per-tab folders and row keys |
| `src/components/signedcopies/resolveSignedCopies.ts` (+ test) (new) | The pure matcher |
| `src/components/signedcopies/signedCopiesApi.ts`, `useSignedCopies.ts` (new) | API calls + store hook |
| `src/components/signedcopies/SignedCopyCard.tsx` (new) | The card in each detail view |
| `src/components/signedcopies/trackerText.ts` (+ test), `SignedCopyTracker.tsx` (new) | The "X of Y signed" line at the top of each list + the not-linked list |
| `src/components/signedcopies/SignedCopiesOverview.tsx` (new) | The overview page |
| `src/components/signedcopies/tabScreen.ts` (+ test) (new) | Which screen holds each tab (overview links) |
| 7 list screens (NCR, DCR, CSI, Objectives, Audit, TUV, MRM) (modify) | Add the card and the tracker |
| `src/types/index.ts`, `src/lib/router.ts`, `src/lib/nav.tsx`, `AppShell.tsx` (modify) | The new `signed_copies` screen |

---

### Task 1: Desktop copy pack

**Files:**
- Create: `D:\QMS Evidence\_pack-tools\build_pack.py`
- Test: `D:\QMS Evidence\_pack-tools\test_build_pack.py`
- Input: `c_vs_w.csv` from the session scratchpad (`C:\Users\40003335\AppData\Local\Temp\claude\D--Claude-Code\ee1b9ac0-eb16-4557-a9f2-d5f85ab00b40\scratchpad\`), with columns Status, Hash, Name, Size, Modified, CPath, Root, WMatch. Copy it next to the tool first, because the scratchpad is temporary.

**Interfaces:**
- Produces: `place(name: str, cpath: str) -> str`, which returns a W:-style folder (relative) or `_Check-by-hand`; the folder `D:\QMS Evidence\_to-W-pack-2026-10-07\` with `PACK-CHECKLIST.xlsx`.

- [ ] **Step 1: Copy the CSV and write the failing test**

```powershell
New-Item -ItemType Directory -Force "D:\QMS Evidence\_pack-tools" | Out-Null
Copy-Item "C:\Users\40003335\AppData\Local\Temp\claude\D--Claude-Code\ee1b9ac0-eb16-4557-a9f2-d5f85ab00b40\scratchpad\c_vs_w.csv" "D:\QMS Evidence\_pack-tools\c_vs_w.csv"
```

```python
# test_build_pack.py
from build_pack import place, R, BLANK

def test_ncr_record():
    assert place('FM-NC-13_AR-RAZI-P-II-NCR-03_2025.pdf', r'\NCR\2025\x.pdf') == R + r'\NCR-CAPA Records (MR + Process Owner)'

def test_dcr_record():
    assert place('DOCUMENT CHANGE REQUEST- 002 - FM-NC-13.pdf', r'\DCR\x.pdf') == R + r'\Document Control Records (MR only)'

def test_css_survey():
    assert place('FM-CSS-01_CHEMANOL_2025.pdf', r'\CSS\x.pdf') == R + r'\Customer Records (MKT + GM)'

def test_objective():
    assert place('PT-OBJ-04 OPS QUALITY OBJECTIVE 2026.docx', r'\Objectives\x.docx') == '03 - Quality Objectives (All HODs)'

def test_internal_audit():
    assert place('Internal Audit Report_P&E_2025.pdf', r'\Audit\x.pdf') == R + r'\Audit Records (MR + Auditors only)'

def test_risk_register():
    assert place('FM-RR-18 Risk Register OPS 2025.xlsx', r'\Risk\x.xlsx') == R + r'\Context & Planning Records (HODs + MR)'

def test_blank_form_by_folder():
    assert place('FM-PR-07.docx', r'\Forms\Blank\FM-PR-07.docx') == BLANK

def test_qsp_procedure():
    assert place('QSP-MR-01 Control of Documents.pdf', r'\Procedures\x.pdf') == '01 - QSP Procedures (HODs + Departments)'

def test_unknown_goes_to_check_by_hand():
    assert place('scan0001.pdf', r'\misc\scan0001.pdf') == '_Check-by-hand'
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd "D:\QMS Evidence\_pack-tools"; python -m pytest test_build_pack.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'build_pack'`

- [ ] **Step 3: Write `build_pack.py`**

```python
"""Build the copy pack: Desktop QMS files that are not on W:, sorted into W:'s folder layout.
COPY ONLY. Never writes to W: or to the Desktop. Run: python build_pack.py"""
import csv, hashlib, os, re, shutil, sys
from pathlib import Path

R = '06 - Records (Owner-Controlled, Audit Read)'
BLANK = '04 - Forms - Blank Templates\\_From-Desktop (check before copying)'
HERE = Path(__file__).parent
PACK = Path(r'D:\QMS Evidence\_to-W-pack-2026-10-07')
DESK = Path(os.environ['USERPROFILE']) / 'Desktop'

# The first rule that matches wins. Each is tested on the Desktop path + name, upper case.
RULES = [
    (r'DOCUMENT CHANGE REQUEST|\bDCR\b', R + r'\Document Control Records (MR only)'),
    (r'NCR|CAPA|FM-NC-13', R + r'\NCR-CAPA Records (MR + Process Owner)'),
    (r'FM-CSS|CUSTOMER SATISF|\bCSS\b|\bCSI\b|APPRECIATION', R + r'\Customer Records (MKT + GM)'),
    (r'TUV|INTERNAL AUDIT|AUDIT REPORT|AUDIT PLAN|\\AUDIT', R + r'\Audit Records (MR + Auditors only)'),
    (r'RISK REG|FM-RR-18|ISSUES? LOG|FM-IL-15|OPPORTUNIT|FM-OR-19|\bMRM\b|MANAGEMENT REVIEW', R + r'\Context & Planning Records (HODs + MR)'),
    (r'TRAINING|COMPETENC', R + r'\HR Records (HR + GM only)'),
    (r'PT-OBJ|OBJECTIVE', '03 - Quality Objectives (All HODs)'),
    (r'\bQSP\b|QSP-', '01 - QSP Procedures (HODs + Departments)'),
    (r'\bWI-|WORK INSTRUCTION', '02 - Work Instructions (HODs + Departments)'),
    (r'\\(BLANK|FORMS?|TEMPLATES?)\\', BLANK),
    (r'QUALITY MANUAL|QUALITY POLICY|ORGANI[SZ]ATION CHART|CERTIFICATE', '00 - Foundation (All Employees - Read)'),
]

def place(name: str, cpath: str) -> str:
    text = (cpath + '\\' + name).upper()
    for pattern, folder in RULES:
        if re.search(pattern, text):
            return folder
    return '_Check-by-hand'

def sha1(p: Path) -> str:
    h = hashlib.sha1()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest().upper()

def source_path(root_leaf: str, cpath: str) -> Path:
    """Find the Desktop root by its leaf name (names hold emoji, so match by name, not by typed path)."""
    rel = cpath.lstrip('\\')
    for top in DESK.iterdir():
        for cand in (top, *(top.iterdir() if top.is_dir() else [])):
            if cand.is_dir() and cand.name == root_leaf and (cand / rel).exists():
                return cand / rel
    raise FileNotFoundError(f'{root_leaf}\\{rel}')

def free_name(folder: Path, name: str) -> Path:
    target, n = folder / name, 2
    while target.exists():
        target = folder / f'{Path(name).stem} ({n}){Path(name).suffix}'
        n += 1
    return target

def main() -> int:
    if PACK.exists() and any(PACK.iterdir()):
        print(f'Pack folder is not empty: {PACK}. Rename it first.')
        return 1
    with open(HERE / 'c_vs_w.csv', encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    seen, out = set(), []
    for r in rows:
        if r['Status'] == 'same file on W:' or r['Hash'] in seen:
            continue
        seen.add(r['Hash'])
        src = source_path(r['Root'], r['CPath'])
        folder = '_Same-name-different' if r['Status'].startswith('same name') else place(r['Name'], r['CPath'])
        dest = free_name(PACK / folder, r['Name'])
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)  # copy, never move
        ok = sha1(dest) == r['Hash']
        out.append([r['Name'], str(src), folder, r['WMatch'], r['Modified'], int(r['Size']), 'OK' if ok else 'HASH MISMATCH'])
    write_checklist(out)
    bad = sum(1 for o in out if o[-1] != 'OK')
    print(f'Copied {len(out)} files. Hash mismatches: {bad}.')
    return 1 if bad else 0

def write_checklist(out: list) -> None:
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = 'Pack'
    ws.append(['File', 'From (Desktop)', 'Goes to on W:', 'Same name on W:', 'Modified', 'Size', 'Copy check', 'Copied to W:? (tick)'])
    for o in out:
        ws.append(o + [''])
    ws.auto_filter.ref = ws.dimensions
    wb.save(PACK / 'PACK-CHECKLIST.xlsx')

if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 4: Run the tests until they pass**

Run: `python -m pytest test_build_pack.py -q`
Expected: `9 passed`. If one fails, change only the order or pattern in `RULES`.

- [ ] **Step 5: Dry check of the spread before copying**

Run: `python -c "import csv,collections,build_pack as b; rs=[r for r in csv.DictReader(open('c_vs_w.csv',encoding='utf-8-sig')) if r['Status']=='NOT on W:']; u={r['Hash']:r for r in rs}.values(); c=collections.Counter(b.place(r['Name'],r['CPath']) for r in u); print(sum(c.values())); print(c.most_common())"`
Expected: the first line is `1738`. If `_Check-by-hand` is over 300, read 20 of those names, add one rule + one test per real pattern found, and rerun Step 4.

- [ ] **Step 6: Build the pack and check it**

Run: `python build_pack.py`
Expected: `Copied N files. Hash mismatches: 0.`, where N = 1738 + the number of unique hashes among the 68 same-name files. Then rerun the compare (`compare_c_w.ps1`) and confirm it still reports 3140 Desktop docs (the Desktop is unchanged).

- [ ] **Step 7: Save the tools in git (the pack files are not committed)**

```powershell
cd "D:\QMS Evidence\_pack-tools"; git init; git add build_pack.py test_build_pack.py; git commit -m "feat: Desktop-to-W: copy pack builder"
```

---

### Task 2: Match rules + the pure matcher (front end)

**Files:**
- Create: `qms-cloudflare/vitest.config.ts`; Modify: `qms-cloudflare/package.json` (add `"test": "vitest run"` and devDependency `vitest`)
- Create: `src/components/signedcopies/matchRules.ts`, `matchRules.test.ts`
- Create: `src/components/signedcopies/resolveSignedCopies.ts`, `resolveSignedCopies.test.ts`

**Interfaces:**
- Consumes: `WFile` (`src/components/wfiles/wfilesApi.ts`: `{id, name, folder, size, at, docNo}`; `folder` uses `/` and is relative to the W: root), `isObsoleteName` (`src/components/wfiles/wfileIndex.ts`).
- Produces:
  - `type SignedTab = 'ncr' | 'dcr' | 'csi' | 'objectives' | 'audit' | 'tuv' | 'mrm'`
  - `SIGNED_TABS: SignedTab[]`, `TAB_LABEL: Record<SignedTab, string>`, `RULES: Record<SignedTab, { folders: string[] }>`
  - `type KeyGroup = string[]`; `norm(s: string): string`; `rowKeys(tab: SignedTab, row: Record<string, unknown>): KeyGroup[]` (every group must match, any one key of a group is enough; `[]` means "never auto-match")
  - `interface LinkNote { id: string; tab: SignedTab; rowId: string; wFileId: string; fileName: string; kind: 'link' | 'not_this_one' }`
  - `interface RowFile { file: WFile | null; fileName: string; how: 'auto' | 'hand'; linkId?: string; old: boolean; missingOnW: boolean }`
  - `interface NotLinkedFile { file: WFile; reason: 'no_row' | 'many_rows' }`
  - `interface SignedRow { id: string; groups: KeyGroup[] }`
  - `resolveSignedCopies(tab, rows: SignedRow[], files: WFile[] | null, links: LinkNote[]): Resolved`, with `Resolved = { byRow: Record<string, RowFile[]>; notLinked: NotLinkedFile[]; counts: { signed: number; missing: number; notLinked: number } | null }`

- [ ] **Step 1: Add vitest**

```bash
cd "D:/QMS Dashboard/qms-cloudflare" && npm i -D vitest
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/**/*.test.ts'] } });
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Read the real row values (read only) to confirm the key formats**

In `qms-server`, find each tab's table with `grep -n "CREATE TABLE" migrations/*.sql`, then for each run `npx wrangler d1 execute pta-qms-db --remote --command "SELECT * FROM <table> LIMIT 3"` (SELECT only, never change data). Note what `ref`, `project`, `dt`, `dcrNo`, `clientName`/`cl`, `yr`, `dept`, `dep`/`auditee`, `num`, `meetingDate` really hold. If a field name or format differs from the tests below, change the TEST and `build()` to the real name first, then go on.

- [ ] **Step 3: Write the failing tests for the rules**

```ts
// src/components/signedcopies/matchRules.test.ts
import { describe, it, expect } from 'vitest';
import { norm, rowKeys, RULES } from './matchRules';

const hit = (groups: string[][], name: string) =>
  groups.length > 0 && groups.every((g) => g.some((k) => norm(name).includes(k)));

describe('matchRules', () => {
  it('norm keeps letters and digits only, lower case', () => {
    expect(norm('NCR-03 / AR-RAZI')).toBe('ncr03arrazi');
  });
  it('NCR: number + client + year', () => {
    const g = rowKeys('ncr', { ref: 'NCR-03', project: 'AR-RAZI-P-II', dt: '2025-04-02' });
    expect(hit(g, 'FM-NC-13_AR-RAZI-P-II-NCR-03_2025.pdf')).toBe(true);
    expect(hit(g, 'FM-NC-13_AR-RAZI-P-II-NCR-04_2025.pdf')).toBe(false);
  });
  it('DCR: the words + the number', () => {
    const g = rowKeys('dcr', { dcrNo: 'DCR-002' });
    expect(hit(g, 'DOCUMENT CHANGE REQUEST- 002 - FM-NC-13.pdf')).toBe(true);
    expect(hit(g, 'DOCUMENT CHANGE REQUEST- 003 - FM-NC-13.pdf')).toBe(false);
  });
  it('CSI: customer + year', () => {
    const g = rowKeys('csi', { clientName: 'CHEMANOL', yr: 2025 });
    expect(hit(g, 'FM-CSS-01_CHEMANOL_2025.pdf')).toBe(true);
    expect(hit(g, 'FM-CSS-01_CHEMANOL_2024.pdf')).toBe(false);
  });
  it('Objectives: department + year', () => {
    expect(hit(rowKeys('objectives', { dept: 'OPS', yr: 2026 }), 'PT-OBJ-04 OPS QUALITY OBJECTIVE 2026.docx')).toBe(true);
  });
  it('Audit: area + year', () => {
    expect(hit(rowKeys('audit', { dep: 'P&E', dt: '2025-03-10' }), 'Internal Audit Report_P&E_2025.pdf')).toBe(true);
  });
  it('TUV: "tuv" + number', () => {
    expect(hit(rowKeys('tuv', { num: 'NC-05' }), 'TUV NC-05 closure.pdf')).toBe(true);
  });
  it('MRM: words + year', () => {
    expect(hit(rowKeys('mrm', { meetingDate: '2025-12-20' }), 'MRM Minutes 2025.pdf')).toBe(true);
  });
  it('a row with an empty key field never auto-matches', () => {
    expect(rowKeys('csi', { clientName: '', yr: 2025 })).toEqual([]);
    expect(rowKeys('ncr', { ref: 'NCR-03', project: 'AR-RAZI' })).toEqual([]);
  });
  it('every tab has at least one W: folder', () => {
    for (const r of Object.values(RULES)) expect(r.folders.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `npx vitest run src/components/signedcopies/matchRules.test.ts`
Expected: FAIL, "Failed to resolve import ./matchRules"

- [ ] **Step 5: Write `matchRules.ts`**

```ts
// Per-tab rules: which W: folders hold a tab's signed copies, and which row values must be in the file name.
export type SignedTab = 'ncr' | 'dcr' | 'csi' | 'objectives' | 'audit' | 'tuv' | 'mrm';
export type KeyGroup = string[];
type Row = Record<string, unknown>;

export const SIGNED_TABS: SignedTab[] = ['ncr', 'dcr', 'csi', 'objectives', 'audit', 'tuv', 'mrm'];
export const TAB_LABEL: Record<SignedTab, string> = {
  ncr: 'NCR', dcr: 'DCR', csi: 'Customer satisfaction', objectives: 'Quality objectives',
  audit: 'Internal audit', tuv: 'TUV audit', mrm: 'Management review',
};

const R = '06 - Records (Owner-Controlled, Audit Read)';
export const RULES: Record<SignedTab, { folders: string[] }> = {
  ncr: { folders: [`${R}/NCR-CAPA Records (MR + Process Owner)`] },
  dcr: { folders: [`${R}/Document Control Records (MR only)`] },
  csi: { folders: [`${R}/Customer Records (MKT + GM)`] },
  objectives: { folders: ['03 - Quality Objectives (All HODs)'] },
  audit: { folders: [`${R}/Audit Records (MR + Auditors only)`] },
  tuv: { folders: [`${R}/Audit Records (MR + Auditors only)`] },
  mrm: { folders: [`${R}/Context & Planning Records (HODs + MR)`] },
};

export function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const text = (v: unknown) => (v == null ? '' : norm(String(v)));
const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const year = (...vs: unknown[]) => {
  for (const v of vs) {
    const m = String(v ?? '').match(/(19|20)\d{2}/);
    if (m) return m[0];
  }
  return '';
};

/** Groups of keys. Returns [] when any needed value is empty, so the row never auto-matches. */
export function rowKeys(tab: SignedTab, row: Row): KeyGroup[] {
  const groups = build(tab, row);
  return groups.every((g) => g.length > 0 && g.every((k) => k !== '')) ? groups : [];
}

function build(tab: SignedTab, r: Row): KeyGroup[] {
  switch (tab) {
    case 'ncr': return [[text(r.ref)], [text(r.project)], [year(r.dt)]];
    case 'dcr': return [['dcr', 'documentchangerequest'], [digits(r.dcrNo)]];
    case 'csi': return [[text(r.clientName ?? r.cl)], [year(r.yr, r.surveyDate, r.dt)]];
    case 'objectives': return [[text(r.dept)], [year(r.yr)]];
    case 'audit': return [[text(r.dep ?? r.auditee)], [year(r.dt, r.completedDate)]];
    case 'tuv': return [['tuv'], [text(r.num)]];
    case 'mrm': return [['mrm', 'managementreview'], [year(r.meetingDate)]];
  }
}
```

Note: the DCR number test passes because `"002"` is in `documentchangerequest002fmnc13` and `"003"` is not. If Step 2 shows DCR numbers without leading zeros (e.g. `2`), pad with `.padStart(3, '0')` in `digits` and add a test for it.

- [ ] **Step 6: Run the rule tests**

Run: `npx vitest run src/components/signedcopies/matchRules.test.ts`
Expected: `10 passed`

- [ ] **Step 7: Write the failing tests for the matcher**

```ts
// src/components/signedcopies/resolveSignedCopies.test.ts
import { describe, it, expect } from 'vitest';
import { resolveSignedCopies, type LinkNote } from './resolveSignedCopies';
import type { WFile } from '../wfiles/wfilesApi';

const F = '06 - Records (Owner-Controlled, Audit Read)/Customer Records (MKT + GM)';
const file = (id: string, name: string, folder = F): WFile => ({ id, name, folder, size: 1, at: '2025-01-01', docNo: null });
const rowA = { id: 'a', groups: [['chemanol'], ['2025']] };
const rowB = { id: 'b', groups: [['sadaf'], ['2025']] };
const link = (p: Partial<LinkNote>): LinkNote => ({ id: 'L1', tab: 'csi', rowId: 'a', wFileId: 'f9', fileName: 'x.pdf', kind: 'link', ...p });

describe('resolveSignedCopies', () => {
  it('auto-links a file that matches exactly one row', () => {
    const r = resolveSignedCopies('csi', [rowA, rowB], [file('f1', 'FM-CSS-01_CHEMANOL_2025.pdf')], []);
    expect(r.byRow.a[0]).toMatchObject({ how: 'auto', fileName: 'FM-CSS-01_CHEMANOL_2025.pdf' });
    expect(r.counts).toEqual({ signed: 1, missing: 1, notLinked: 0 });
  });
  it('a file matching two rows is not auto-linked and goes to Not linked', () => {
    const r = resolveSignedCopies('csi', [rowA, { id: 'c', groups: [['chemanol'], ['2025']] }], [file('f1', 'CHEMANOL 2025.pdf')], []);
    expect(r.byRow.a).toEqual([]);
    expect(r.notLinked).toEqual([{ file: expect.objectContaining({ id: 'f1' }), reason: 'many_rows' }]);
  });
  it('a hand link wins, and that file is not auto-linked elsewhere', () => {
    const r = resolveSignedCopies('csi', [rowA, rowB], [file('f1', 'CHEMANOL_2025.pdf')], [link({ rowId: 'b', wFileId: 'f1' })]);
    expect(r.byRow.b[0]).toMatchObject({ how: 'hand', linkId: 'L1' });
    expect(r.byRow.a).toEqual([]);
  });
  it('"not this one" blocks the auto match', () => {
    const r = resolveSignedCopies('csi', [rowA], [file('f1', 'CHEMANOL_2025.pdf')], [link({ wFileId: 'f1', kind: 'not_this_one' })]);
    expect(r.byRow.a).toEqual([]);
    expect(r.notLinked[0].reason).toBe('no_row');
  });
  it('obsolete files are shown as old and never count', () => {
    const r = resolveSignedCopies('csi', [rowA], [file('f1', 'CHEMANOL_2025 OBSOLETE.pdf')], []);
    expect(r.byRow.a[0].old).toBe(true);
    expect(r.counts?.signed).toBe(0);
  });
  it('files outside the tab folders are ignored', () => {
    const r = resolveSignedCopies('csi', [rowA], [file('f1', 'CHEMANOL_2025.pdf', '00 - Foundation (All Employees - Read)')], []);
    expect(r.byRow.a).toEqual([]);
    expect(r.notLinked).toEqual([]);
  });
  it('helper offline: counts are null, hand links still listed by name', () => {
    const r = resolveSignedCopies('csi', [rowA], null, [link({ fileName: 'saved.pdf' })]);
    expect(r.counts).toBeNull();
    expect(r.byRow.a[0]).toMatchObject({ file: null, fileName: 'saved.pdf', missingOnW: false });
  });
  it('a linked file no longer on W: is flagged but still counts', () => {
    const r = resolveSignedCopies('csi', [rowA], [], [link({ fileName: 'gone.pdf' })]);
    expect(r.byRow.a[0]).toMatchObject({ file: null, missingOnW: true });
    expect(r.counts?.signed).toBe(1);
  });
  it('a row with no keys never auto-matches', () => {
    const r = resolveSignedCopies('csi', [{ id: 'z', groups: [] }], [file('f1', 'anything.pdf')], []);
    expect(r.byRow.z).toEqual([]);
  });
});
```

- [ ] **Step 8: Run it to see it fail**

Run: `npx vitest run src/components/signedcopies/resolveSignedCopies.test.ts`
Expected: FAIL, "Failed to resolve import ./resolveSignedCopies"

- [ ] **Step 9: Write `resolveSignedCopies.ts`**

```ts
// One pure matcher used by the card, the tracker, the Not linked list and the overview.
import type { WFile } from '../wfiles/wfilesApi';
import { isObsoleteName } from '../wfiles/wfileIndex';
import { norm, RULES, type KeyGroup, type SignedTab } from './matchRules';

export interface LinkNote { id: string; tab: SignedTab; rowId: string; wFileId: string; fileName: string; kind: 'link' | 'not_this_one' }
export interface RowFile { file: WFile | null; fileName: string; how: 'auto' | 'hand'; linkId?: string; old: boolean; missingOnW: boolean }
export interface NotLinkedFile { file: WFile; reason: 'no_row' | 'many_rows' }
export interface SignedRow { id: string; groups: KeyGroup[] }
export interface Resolved {
  byRow: Record<string, RowFile[]>;
  notLinked: NotLinkedFile[];
  counts: { signed: number; missing: number; notLinked: number } | null;
}

const inFolders = (tab: SignedTab, f: WFile) =>
  RULES[tab].folders.some((p) => f.folder === p || f.folder.startsWith(p + '/'));
const matches = (groups: KeyGroup[], name: string) => {
  const n = norm(name);
  return groups.length > 0 && groups.every((g) => g.some((k) => k !== '' && n.includes(k)));
};

export function resolveSignedCopies(tab: SignedTab, rows: SignedRow[], files: WFile[] | null, links: LinkNote[]): Resolved {
  const byId = new Map((files ?? []).map((f) => [f.id, f]));
  const byRow: Record<string, RowFile[]> = Object.fromEntries(rows.map((r) => [r.id, []]));
  const handFiles = new Set<string>();
  const blocked = new Set<string>();

  for (const l of links) {
    if (!(l.rowId in byRow)) continue;
    if (l.kind === 'not_this_one') { blocked.add(`${l.rowId}|${l.wFileId}`); continue; }
    const f = byId.get(l.wFileId) ?? null;
    handFiles.add(l.wFileId);
    byRow[l.rowId] = [...byRow[l.rowId], {
      file: f, fileName: f?.name ?? l.fileName, how: 'hand', linkId: l.id,
      old: isObsoleteName(l.fileName), missingOnW: files !== null && f === null,
    }];
  }

  const notLinked: NotLinkedFile[] = [];
  for (const f of files ?? []) {
    if (!inFolders(tab, f) || handFiles.has(f.id)) continue;
    const hits = rows.filter((r) => !blocked.has(`${r.id}|${f.id}`) && matches(r.groups, f.name));
    if (hits.length === 1) {
      const id = hits[0].id;
      byRow[id] = [...byRow[id], { file: f, fileName: f.name, how: 'auto', old: isObsoleteName(f.name), missingOnW: false }];
    } else if (!isObsoleteName(f.name)) {
      notLinked.push({ file: f, reason: hits.length > 1 ? 'many_rows' : 'no_row' });
    }
  }

  if (files === null) return { byRow, notLinked: [], counts: null };
  const signed = rows.filter((r) => byRow[r.id].some((x) => !x.old)).length;
  return { byRow, notLinked, counts: { signed, missing: rows.length - signed, notLinked: notLinked.length } };
}
```

- [ ] **Step 10: Run all front-end tests and the type check**

Run: `npm test && npm run typecheck`
Expected: `19 passed`, and no type errors.

- [ ] **Step 11: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/components/signedcopies
git commit -m "feat: signed-copy match rules and matcher"
```

---

### Task 3: The links table (D1 migration + SQL)

All paths in this task are under `D:\QMS Dashboard\qms-server`.

**Files:**
- Create: `migrations/0008_signed_copy_links.sql`
- Create: `server/lib/signedCopySql.ts`
- Test: `server/lib/signedCopySql.node.test.ts` (runs on Node with `node:sqlite`)

**Interfaces:**
- Produces: table `SignedCopyLink`; SQL strings `INSERT_LINK_SQL`, `LIST_LINKS_SQL`, `FIND_ACTIVE_SQL`, `FIND_BY_ID_SQL`, `REMOVE_LINK_SQL`; types `SignedCopyKind = 'link' | 'not_this_one'` and `SignedCopyLinkRow = { id; tab; rowId; wFileId; fileName; kind }` (all strings, kind is `SignedCopyKind`).

- [ ] **Step 1: Write the migration**

```sql
-- Signed copies: notes that say "this row in this tab <-> this W: file".
-- The files stay on W:. Rows are never deleted: "unlink" fills removedAt / removedBy.
CREATE TABLE IF NOT EXISTS "SignedCopyLink" (
  "id"        TEXT PRIMARY KEY NOT NULL,
  "orgId"     TEXT NOT NULL,
  "tab"       TEXT NOT NULL,
  "rowId"     TEXT NOT NULL,
  "wFileId"   TEXT NOT NULL,
  "fileName"  TEXT NOT NULL,
  "kind"      TEXT NOT NULL CHECK ("kind" IN ('link', 'not_this_one')),
  "createdBy" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "removedBy" TEXT,
  "removedAt" TEXT
);

CREATE INDEX IF NOT EXISTS "SignedCopyLink_row_idx"
  ON "SignedCopyLink" ("orgId", "tab", "rowId");

-- Only one live note per row + file + kind.
CREATE UNIQUE INDEX IF NOT EXISTS "SignedCopyLink_one_active"
  ON "SignedCopyLink" ("orgId", "tab", "rowId", "wFileId", "kind")
  WHERE "removedAt" IS NULL;

CREATE TRIGGER IF NOT EXISTS "SignedCopyLink_no_hard_delete"
BEFORE DELETE ON "SignedCopyLink"
BEGIN
  SELECT RAISE(ABORT, 'Signed copy links are never deleted; set removedAt instead');
END;

CREATE TRIGGER IF NOT EXISTS "SignedCopyLink_fixed_columns"
BEFORE UPDATE ON "SignedCopyLink"
WHEN NEW."id" IS NOT OLD."id"
  OR NEW."orgId" IS NOT OLD."orgId"
  OR NEW."tab" IS NOT OLD."tab"
  OR NEW."rowId" IS NOT OLD."rowId"
  OR NEW."wFileId" IS NOT OLD."wFileId"
  OR NEW."fileName" IS NOT OLD."fileName"
  OR NEW."kind" IS NOT OLD."kind"
  OR NEW."createdBy" IS NOT OLD."createdBy"
  OR NEW."createdAt" IS NOT OLD."createdAt"
  OR OLD."removedAt" IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Only removedAt / removedBy can be set, and only once');
END;
```

- [ ] **Step 2: Write the failing SQL test**

```ts
// server/lib/signedCopySql.node.test.ts
// Runs on Node (uses node:sqlite), so it is type-checked by tsconfig.node-tests.json.
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { FIND_ACTIVE_SQL, FIND_BY_ID_SQL, INSERT_LINK_SQL, LIST_LINKS_SQL, REMOVE_LINK_SQL } from './signedCopySql.js';

const migration = readFileSync(new URL('../../migrations/0008_signed_copy_links.sql', import.meta.url), 'utf8');
const NOW = '2026-10-07T10:00:00.000Z';

describe('SignedCopyLink table', () => {
  let db: DatabaseSync;
  beforeEach(() => { db = new DatabaseSync(':memory:'); db.exec(migration); });
  const add = (id: string, kind = 'link', org = 'org') =>
    db.prepare(INSERT_LINK_SQL).run(id, org, 'csi', 'row1', 'f1', 'a.pdf', kind, 'u1', NOW);
  const list = (org = 'org') => db.prepare(LIST_LINKS_SQL).all(org, 'csi');

  it('adds and lists a link', () => {
    add('L1');
    expect(list()).toEqual([{ id: 'L1', tab: 'csi', rowId: 'row1', wFileId: 'f1', fileName: 'a.pdf', kind: 'link' }]);
    expect(db.prepare(FIND_ACTIVE_SQL).get('org', 'csi', 'row1', 'f1', 'link')).toMatchObject({ id: 'L1' });
    expect(db.prepare(FIND_BY_ID_SQL).get('L1', 'org')).toMatchObject({ id: 'L1', removedAt: null });
  });
  it('blocks a second live copy of the same note', () => {
    add('L1');
    expect(() => add('L2')).toThrow(/UNIQUE/);
    expect(() => add('L3', 'not_this_one')).not.toThrow();
  });
  it('a removed link is not listed and can be added again', () => {
    add('L1');
    expect(db.prepare(REMOVE_LINK_SQL).run(NOW, 'u2', 'L1', 'org').changes).toBe(1);
    expect(list()).toEqual([]);
    expect(() => add('L2')).not.toThrow();
  });
  it('remove works once, and only in the same org', () => {
    add('L1');
    expect(db.prepare(REMOVE_LINK_SQL).run(NOW, 'u2', 'L1', 'other').changes).toBe(0);
    db.prepare(REMOVE_LINK_SQL).run(NOW, 'u2', 'L1', 'org');
    expect(db.prepare(REMOVE_LINK_SQL).run(NOW, 'u3', 'L1', 'org').changes).toBe(0);
  });
  it('never hard-deletes and never changes fixed columns', () => {
    add('L1');
    expect(() => db.exec(`DELETE FROM "SignedCopyLink"`)).toThrow(/never deleted/);
    expect(() => db.exec(`UPDATE "SignedCopyLink" SET "rowId" = 'row2'`)).toThrow(/Only removedAt/);
  });
  it('rejects an unknown kind', () => {
    expect(() => add('L1', 'maybe')).toThrow(/CHECK/);
  });
  it('lists only the asked org', () => {
    add('L1', 'link', 'other');
    expect(list()).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `cd "D:/QMS Dashboard/qms-server" && npx vitest run --config vitest.server.config.ts server/lib/signedCopySql.node.test.ts`
Expected: FAIL, "Failed to resolve import ./signedCopySql.js"

- [ ] **Step 4: Write `server/lib/signedCopySql.ts`**

```ts
// SQL for the SignedCopyLink table (migration 0008). Shared by the route and the Node SQL test.
export type SignedCopyKind = 'link' | 'not_this_one';
export interface SignedCopyLinkRow {
  id: string; tab: string; rowId: string; wFileId: string; fileName: string; kind: SignedCopyKind;
}

const COLS = `"id","tab","rowId","wFileId","fileName","kind"`;

export const INSERT_LINK_SQL = `INSERT INTO "SignedCopyLink"
  ("id","orgId","tab","rowId","wFileId","fileName","kind","createdBy","createdAt")
  VALUES (?,?,?,?,?,?,?,?,?)`;

export const LIST_LINKS_SQL = `SELECT ${COLS} FROM "SignedCopyLink"
  WHERE "orgId" = ? AND "tab" = ? AND "removedAt" IS NULL ORDER BY "createdAt"`;

export const FIND_ACTIVE_SQL = `SELECT ${COLS} FROM "SignedCopyLink"
  WHERE "orgId" = ? AND "tab" = ? AND "rowId" = ? AND "wFileId" = ? AND "kind" = ? AND "removedAt" IS NULL`;

export const FIND_BY_ID_SQL = `SELECT ${COLS}, "removedAt" FROM "SignedCopyLink" WHERE "id" = ? AND "orgId" = ?`;

export const REMOVE_LINK_SQL = `UPDATE "SignedCopyLink" SET "removedAt" = ?, "removedBy" = ?
  WHERE "id" = ? AND "orgId" = ? AND "removedAt" IS NULL`;
```

- [ ] **Step 5: Run the SQL test**

Run: `npx vitest run --config vitest.server.config.ts server/lib/signedCopySql.node.test.ts`
Expected: `7 passed`

- [ ] **Step 6: Commit**

```bash
git add migrations/0008_signed_copy_links.sql server/lib/signedCopySql.ts server/lib/signedCopySql.node.test.ts
git commit -m "feat: SignedCopyLink table for signed-copy links"
```

---

### Task 4: Input checks + the signed-copies API

All paths in this task are under `D:\QMS Dashboard\qms-server`.

**Files:**
- Create: `server/lib/signedCopyRules.ts`, `server/lib/signedCopyRules.test.ts`
- Create: `server/routes/signedCopies.ts`
- Modify: `server/worker.ts` (one import after line 35, one entry in the `routes` array after `['/api/files-host', filesHostRoutes],` at line 90)

**Interfaces:**
- Consumes: Task 3 SQL strings, `SignedCopyKind`, `SignedCopyLinkRow`; `authMiddleware`, `getUser`, `requirePermission` from `../middleware/auth.js`; `logAudit` from `../services/audit.service.js` (takes `orgId, userId, action, entityType, entityId, previousValue?, newValue?`); `getEnv().pta_qms_db`.
- Produces (HTTP, all need a signed-in user):
  - `GET /api/signed-copies?tab=csi` -> `200 { links: SignedCopyLinkRow[] }`
  - `POST /api/signed-copies` body `{ tab, rowId, wFileId, fileName, kind }` (needs `canEdit`) -> `201 { link }`, or `200 { link }` when the same live note already exists
  - `POST /api/signed-copies/:id/remove` (needs `canEdit`) -> `200 { ok: true }`, or `404` if not found / already removed
  - Errors: `400 { message }` bad input, `403 { message }` no org, `500 { message }` database error
  - Server tab list `SIGNED_TABS` = `ncr, dcr, csi, objectives, audit, tuv, mrm` (must equal the front end's list in `matchRules.ts`).

- [ ] **Step 1: Write the failing rules test**

```ts
// server/lib/signedCopyRules.test.ts
import { describe, expect, it } from 'vitest';
import { MAX_ID_LENGTH, MAX_NAME_LENGTH, isSignedTab, parseLinkInput } from './signedCopyRules.js';

const good = { tab: 'ncr', rowId: 'r1', wFileId: 'f1', fileName: 'NCR-03.pdf', kind: 'link' };

describe('signedCopyRules', () => {
  it('knows the seven tabs only', () => {
    for (const t of ['ncr', 'dcr', 'csi', 'objectives', 'audit', 'tuv', 'mrm']) expect(isSignedTab(t)).toBe(true);
    expect(isSignedTab('training')).toBe(false);
  });
  it('accepts a good link and trims text', () => {
    expect(parseLinkInput({ ...good, rowId: ' r1 ' })).toEqual({ ok: true, value: good });
  });
  it('rejects an unknown tab or kind', () => {
    expect(parseLinkInput({ ...good, tab: 'x' })).toEqual({ ok: false, message: 'Unknown tab.' });
    expect(parseLinkInput({ ...good, kind: 'maybe' })).toEqual({ ok: false, message: 'Unknown link type.' });
  });
  it('rejects empty, missing or too long text', () => {
    expect(parseLinkInput({ ...good, wFileId: '  ' }).ok).toBe(false);
    expect(parseLinkInput({ ...good, rowId: null }).ok).toBe(false);
    expect(parseLinkInput({ ...good, wFileId: 'a'.repeat(MAX_ID_LENGTH + 1) }).ok).toBe(false);
    expect(parseLinkInput({ ...good, fileName: 'a'.repeat(MAX_NAME_LENGTH + 1) }).ok).toBe(false);
    expect(parseLinkInput({ ...good, wFileId: 'a'.repeat(MAX_ID_LENGTH) }).ok).toBe(true);
  });
  it('rejects a body that is not an object', () => {
    expect(parseLinkInput(null).ok).toBe(false);
    expect(parseLinkInput('x').ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run --config vitest.server.config.ts server/lib/signedCopyRules.test.ts`
Expected: FAIL, "Failed to resolve import ./signedCopyRules.js"

- [ ] **Step 3: Write `server/lib/signedCopyRules.ts`**

```ts
// Input checks for the signed-copies API. Keep SIGNED_TABS the same as the front end's matchRules.ts.
import type { SignedCopyKind } from './signedCopySql.js';

export const SIGNED_TABS = ['ncr', 'dcr', 'csi', 'objectives', 'audit', 'tuv', 'mrm'] as const;
export type SignedTab = (typeof SIGNED_TABS)[number];
// Same limits as the W: file links in routes/evidence.ts.
export const MAX_ID_LENGTH = 512;
export const MAX_NAME_LENGTH = 255;

export interface LinkInput { tab: SignedTab; rowId: string; wFileId: string; fileName: string; kind: SignedCopyKind }
export type Parsed = { ok: true; value: LinkInput } | { ok: false; message: string };

export const isSignedTab = (v: unknown): v is SignedTab =>
  typeof v === 'string' && (SIGNED_TABS as readonly string[]).includes(v);

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t !== '' && t.length <= max ? t : null;
}

export function parseLinkInput(body: unknown): Parsed {
  if (!body || typeof body !== 'object') return { ok: false, message: 'Send the link as JSON.' };
  const b = body as Record<string, unknown>;
  if (!isSignedTab(b.tab)) return { ok: false, message: 'Unknown tab.' };
  if (b.kind !== 'link' && b.kind !== 'not_this_one') return { ok: false, message: 'Unknown link type.' };
  const rowId = cleanText(b.rowId, MAX_ID_LENGTH);
  const wFileId = cleanText(b.wFileId, MAX_ID_LENGTH);
  const fileName = cleanText(b.fileName, MAX_NAME_LENGTH);
  if (!rowId) return { ok: false, message: 'Missing or too long row id.' };
  if (!wFileId) return { ok: false, message: 'Missing or too long file id.' };
  if (!fileName) return { ok: false, message: 'Missing or too long file name.' };
  return { ok: true, value: { tab: b.tab, rowId, wFileId, fileName, kind: b.kind } };
}
```

- [ ] **Step 4: Run the rules test**

Run: `npx vitest run --config vitest.server.config.ts server/lib/signedCopyRules.test.ts`
Expected: `5 passed`

- [ ] **Step 5: Write `server/routes/signedCopies.ts`**

```ts
import { Hono, type Context } from 'hono';
import { getEnv } from '../env.js';
import { authMiddleware, getUser, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';
import { isSignedTab, parseLinkInput } from '../lib/signedCopyRules.js';
import {
  FIND_ACTIVE_SQL, FIND_BY_ID_SQL, INSERT_LINK_SQL, LIST_LINKS_SQL, REMOVE_LINK_SQL,
  type SignedCopyLinkRow,
} from '../lib/signedCopySql.js';

// Signed copies: links between a row in a sidebar tab and a file on W:.
// Only the link is kept here (table SignedCopyLink). The file stays on W:.
const signedCopies = new Hono();
signedCopies.use('*', authMiddleware);

const db = () => getEnv().pta_qms_db;
function orgOf(c: Context): string | null { return getUser(c).orgId ?? null; }
const NO_ORG = { message: 'Your login is not linked to an organisation.' };

signedCopies.get('/', async (c) => {
  const orgId = orgOf(c);
  if (!orgId) return c.json(NO_ORG, 403);
  const tab = c.req.query('tab');
  if (!isSignedTab(tab)) return c.json({ message: 'Unknown tab.' }, 400);
  const { results } = await db().prepare(LIST_LINKS_SQL).bind(orgId, tab).all<SignedCopyLinkRow>();
  return c.json({ links: results ?? [] });
});

signedCopies.post('/', requirePermission('canEdit'), async (c) => {
  const user = getUser(c);
  const orgId = orgOf(c);
  if (!orgId) return c.json(NO_ORG, 403);
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ message: 'Send the link as JSON.' }, 400); }
  const parsed = parseLinkInput(body);
  if (!parsed.ok) return c.json({ message: parsed.message }, 400);
  const v = parsed.value;

  const existing = await db().prepare(FIND_ACTIVE_SQL)
    .bind(orgId, v.tab, v.rowId, v.wFileId, v.kind).first<SignedCopyLinkRow>();
  if (existing) return c.json({ link: existing }, 200);

  const id = crypto.randomUUID();
  try {
    await db().prepare(INSERT_LINK_SQL)
      .bind(id, orgId, v.tab, v.rowId, v.wFileId, v.fileName, v.kind, user.userId, new Date().toISOString()).run();
    await logAudit({
      orgId, userId: user.userId, action: `signed_copy_${v.kind}`, entityType: `signed_copy_${v.tab}`,
      entityId: v.rowId, newValue: { linkId: id, wFileId: v.wFileId, fileName: v.fileName },
    });
  } catch (error) {
    console.error('Signed copy link error:', error);
    return c.json({ message: 'Could not save the link. Please try again.' }, 500);
  }
  const link: SignedCopyLinkRow = { id, tab: v.tab, rowId: v.rowId, wFileId: v.wFileId, fileName: v.fileName, kind: v.kind };
  return c.json({ link }, 201);
});

signedCopies.post('/:id/remove', requirePermission('canEdit'), async (c) => {
  const user = getUser(c);
  const orgId = orgOf(c);
  if (!orgId) return c.json(NO_ORG, 403);
  const id = c.req.param('id');
  const row = await db().prepare(FIND_BY_ID_SQL).bind(id, orgId)
    .first<SignedCopyLinkRow & { removedAt: string | null }>();
  if (!row || row.removedAt) return c.json({ message: 'Link not found.' }, 404);
  try {
    const res = await db().prepare(REMOVE_LINK_SQL).bind(new Date().toISOString(), user.userId, id, orgId).run();
    if (!res.meta.changes) return c.json({ message: 'Link not found.' }, 404);
    await logAudit({
      orgId, userId: user.userId, action: 'signed_copy_remove', entityType: `signed_copy_${row.tab}`,
      entityId: row.rowId, previousValue: { linkId: id, wFileId: row.wFileId, fileName: row.fileName, kind: row.kind },
    });
  } catch (error) {
    console.error('Signed copy remove error:', error);
    return c.json({ message: 'Could not remove the link. Please try again.' }, 500);
  }
  return c.json({ ok: true });
});

export default signedCopies;
```

- [ ] **Step 6: Add the route to `server/worker.ts`**

After line 35 (`import evidenceRoutes from './routes/evidence.js';`) add:

```ts
import signedCopyRoutes from './routes/signedCopies.js';
```

In the `routes` array, after `['/api/files-host', filesHostRoutes],` add:

```ts
  ['/api/signed-copies', signedCopyRoutes],
```

- [ ] **Step 7: Run all server tests and the type check**

Run: `npm run test:server && npm run typecheck`
Expected: all pass (the 12 new tests plus the old ones), no type errors.

- [ ] **Step 8: Try it locally**

```bash
npx wrangler d1 migrations apply pta_qms_db --local
npx wrangler dev
```

Use the database name from `wrangler.toml` if it is not `pta_qms_db`. With a local login token, call `GET /api/signed-copies?tab=csi`. Expected: `{ "links": [] }`. Call it with `tab=x`. Expected: `400 { "message": "Unknown tab." }`. Stop `wrangler dev` after.

- [ ] **Step 9: Commit**

```bash
git add server/lib/signedCopyRules.ts server/lib/signedCopyRules.test.ts server/routes/signedCopies.ts server/worker.ts
git commit -m "feat: signed-copies API (list, link, unlink)"
```

---

### Task 5: Front-end API calls + the `useSignedCopies` hook

All paths in this task are under `D:\QMS Dashboard\qms-cloudflare`.

**Files:**
- Create: `src/components/signedcopies/signedCopiesApi.ts`, `signedCopiesApi.test.ts`
- Create: `src/components/signedcopies/useSignedCopies.ts`

**Interfaces:**
- Consumes: `apiFetch<T>(path, options?)` from `src/lib/apiClient.ts`; `useWFiles()` from `src/components/wfiles/useWFiles.ts` (`state.kind` is `'loading' | 'ready' | 'error'`, `files`, `reload()`); Task 2 `SignedTab` (from `matchRules.ts`), `resolveSignedCopies`, `LinkNote`, `SignedRow`, `Resolved` (from `resolveSignedCopies.ts`); Task 4 HTTP API.
- Produces:
  - `listLinks(tab: SignedTab): Promise<LinkNote[]>`
  - `addLink(input: Omit<LinkNote, 'id'>): Promise<LinkNote>`
  - `removeLink(id: string): Promise<void>`
  - `useSignedCopies(tab: SignedTab, rows: SignedRow[]): UseSignedCopies` with
    `UseSignedCopies = { resolved: Resolved; filesState: 'loading' | 'ready' | 'error'; linksError: string | null; busy: boolean; link(rowId, file: { id; name }, kind?): Promise<void>; unlink(linkId: string): Promise<void>; reload(): void }`

- [ ] **Step 1: Write the failing API test**

```ts
// src/components/signedcopies/signedCopiesApi.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();
vi.mock('../../lib/apiClient', () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
import { addLink, listLinks, removeLink } from './signedCopiesApi';

const note = { tab: 'csi' as const, rowId: 'r1', wFileId: 'f1', fileName: 'a.pdf', kind: 'link' as const };

describe('signedCopiesApi', () => {
  beforeEach(() => apiFetch.mockReset());
  it('lists the links of one tab', async () => {
    apiFetch.mockResolvedValue({ links: [{ id: 'L1', ...note }] });
    expect(await listLinks('csi')).toEqual([{ id: 'L1', ...note }]);
    expect(apiFetch).toHaveBeenCalledWith('/api/signed-copies?tab=csi');
  });
  it('posts a new link as JSON', async () => {
    apiFetch.mockResolvedValue({ link: { id: 'L1', ...note } });
    expect(await addLink(note)).toEqual({ id: 'L1', ...note });
    const [path, opts] = apiFetch.mock.calls[0];
    expect(path).toBe('/api/signed-copies');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(note);
  });
  it('removes a link by id', async () => {
    apiFetch.mockResolvedValue({ ok: true });
    await removeLink('L 1');
    expect(apiFetch).toHaveBeenCalledWith('/api/signed-copies/L%201/remove', { method: 'POST' });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/components/signedcopies/signedCopiesApi.test.ts`
Expected: FAIL, "Failed to resolve import ./signedCopiesApi"

- [ ] **Step 3: Write `signedCopiesApi.ts`**

```ts
// Calls to the signed-copies API (qms-server routes/signedCopies.ts). Only links are sent, never files.
import { apiFetch } from '../../lib/apiClient';
import type { SignedTab } from './matchRules';
import type { LinkNote } from './resolveSignedCopies';

const BASE = '/api/signed-copies';

export async function listLinks(tab: SignedTab): Promise<LinkNote[]> {
  const res = await apiFetch<{ links: LinkNote[] }>(`${BASE}?tab=${tab}`);
  return res.links;
}

export async function addLink(input: Omit<LinkNote, 'id'>): Promise<LinkNote> {
  const res = await apiFetch<{ link: LinkNote }>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.link;
}

export async function removeLink(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`${BASE}/${encodeURIComponent(id)}/remove`, { method: 'POST' });
}
```

If `apiFetch` already sets the JSON header, drop the `headers` line (check `src/lib/apiClient.ts`).

- [ ] **Step 4: Run the API test**

Run: `npx vitest run src/components/signedcopies/signedCopiesApi.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Write `useSignedCopies.ts`**

```ts
// One tab's signed copies: W: files (shared useWFiles list) + saved links, matched by resolveSignedCopies.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWFiles } from '../wfiles/useWFiles';
import type { SignedTab } from './matchRules';
import { resolveSignedCopies, type LinkNote, type Resolved, type SignedRow } from './resolveSignedCopies';
import { addLink, listLinks, removeLink } from './signedCopiesApi';

export interface UseSignedCopies {
  resolved: Resolved;
  filesState: 'loading' | 'ready' | 'error';
  linksError: string | null;
  busy: boolean;
  link(rowId: string, file: { id: string; name: string }, kind?: LinkNote['kind']): Promise<void>;
  unlink(linkId: string): Promise<void>;
  reload(): void;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

export function useSignedCopies(tab: SignedTab, rows: SignedRow[]): UseSignedCopies {
  const w = useWFiles();
  const [links, setLinks] = useState<LinkNote[]>([]);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linksTick, setLinksTick] = useState(0);

  useEffect(() => {
    let live = true;
    listLinks(tab)
      .then((l) => { if (live) { setLinks(l); setLinksError(null); } })
      .catch((e) => { if (live) setLinksError(errText(e)); });
    return () => { live = false; };
  }, [tab, linksTick]);

  const files = w.state.kind === 'ready' ? w.files : null;
  const resolved = useMemo(() => resolveSignedCopies(tab, rows, files, links), [tab, rows, files, links]);

  const link = useCallback(async (rowId: string, file: { id: string; name: string }, kind: LinkNote['kind'] = 'link') => {
    setBusy(true);
    try {
      const saved = await addLink({ tab, rowId, wFileId: file.id, fileName: file.name, kind });
      setLinks((prev) => (prev.some((l) => l.id === saved.id) ? prev : [...prev, saved]));
      setLinksError(null);
    } catch (e) { setLinksError(errText(e)); } finally { setBusy(false); }
  }, [tab]);

  const unlink = useCallback(async (linkId: string) => {
    setBusy(true);
    try {
      await removeLink(linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      setLinksError(null);
    } catch (e) { setLinksError(errText(e)); } finally { setBusy(false); }
  }, []);

  const reloadFiles = w.reload;
  const reload = useCallback(() => { reloadFiles(); setLinksTick((t) => t + 1); }, [reloadFiles]);

  return { resolved, filesState: w.state.kind, linksError, busy, link, unlink, reload };
}
```

Callers must pass a `rows` array that stays the same between renders (wrap it in `useMemo`). If they don't, the match runs again on every render.

- [ ] **Step 6: Type check + signed-copies tests**

Run: `npx tsc -b --noEmit && npx vitest run src/components/signedcopies`
Expected: no type errors; all signed-copies tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/signedcopies/signedCopiesApi.ts src/components/signedcopies/signedCopiesApi.test.ts src/components/signedcopies/useSignedCopies.ts
git commit -m "feat: signed-copies API calls and useSignedCopies hook"
```

---

### Task 6: The signed-copy card in the NCR, DCR, CSI and Objectives detail views

All paths in this task are under `D:\QMS Dashboard\qms-cloudflare`. The project has no React test library, so the words and buttons on the card come from a pure function that is tested on Node. The card itself is checked in the browser in Task 8.

**Files:**
- Create: `src/components/signedcopies/useTabSignedCopies.ts`
- Create: `src/components/signedcopies/rowFileView.ts`, `rowFileView.test.ts`
- Create: `src/components/signedcopies/SignedCopyCard.tsx`
- Modify: `src/components/ncr/NCRRecordPage.tsx` (above the `{evidence && <EvidencePanel` line, about line 119)
- Modify: `src/components/documents/DCRWorkflow.tsx` (above the `{showEvidence && (` block, about line 510)
- Modify: `src/components/compliance/CSIDashboard.tsx` (above the `{showEvidence && (` block, about line 363)
- Modify: `src/components/objectives/ObjectivesDashboard.tsx` (above the `{record && showEvidence && (` block, about line 685)

**Interfaces:**
- Consumes: Task 2 `rowKeys(tab, row)`, `SignedTab`, `RowFile`, `SignedRow`; Task 5 `useSignedCopies`, `UseSignedCopies`; `useWFileOpener()` returns `{ open, busyId, error, viewer }`; `WFileButton({ file, opener, note? })`; `WFileAttachPicker({ onPick(file: WFile), busy })`; `roleHasPermission(role, 'canEdit')` from `src/lib/permissions`; `useAuthStore((s) => s.currentUser)`.
- Produces:
  - `useTabSignedCopies(tab: SignedTab, records: ReadonlyArray<{ id: string }>): UseSignedCopies`
  - `rowFileView(rf: RowFile): { note: string; tone: 'ok' | 'warn' | 'muted'; action: 'unlink' | 'not_this_one' | null; actionLabel: string }`
  - `<SignedCopyCard tab={SignedTab} records={...} rowId={string} />`

- [ ] **Step 1: Write `useTabSignedCopies.ts`**

```ts
// Turns a tab's store records into SignedRow keys once per change, then runs useSignedCopies.
import { useMemo } from 'react';
import { rowKeys, type SignedTab } from './matchRules';
import type { SignedRow } from './resolveSignedCopies';
import { useSignedCopies, type UseSignedCopies } from './useSignedCopies';

export function useTabSignedCopies(tab: SignedTab, records: ReadonlyArray<{ id: string }>): UseSignedCopies {
  const rows = useMemo<SignedRow[]>(
    () => records.map((r) => ({ id: r.id, groups: rowKeys(tab, r as Record<string, unknown>) })),
    [tab, records],
  );
  return useSignedCopies(tab, rows);
}
```

`records` must be the store array itself (for example `useNCRStore((s) => s.records)`), so it only changes when the data changes.

- [ ] **Step 2: Write the failing `rowFileView` test**

```ts
// src/components/signedcopies/rowFileView.test.ts
import { describe, expect, it } from 'vitest';
import { rowFileView } from './rowFileView';
import type { RowFile } from './resolveSignedCopies';

const base: RowFile = { file: { id: 'f1', name: 'a.pdf' } as RowFile['file'], fileName: 'a.pdf', how: 'auto', old: false, missingOnW: false };

describe('rowFileView', () => {
  it('auto match: found by name, can say "Not this one"', () => {
    expect(rowFileView(base)).toEqual({ note: 'Found by name', tone: 'ok', action: 'not_this_one', actionLabel: 'Not this one' });
  });
  it('hand link: can unlink', () => {
    expect(rowFileView({ ...base, how: 'hand', linkId: 'L1' })).toMatchObject({ note: 'Linked by hand', action: 'unlink', actionLabel: 'Unlink' });
  });
  it('old copy is muted', () => {
    expect(rowFileView({ ...base, old: true })).toMatchObject({ note: 'Older copy', tone: 'muted' });
  });
  it('a linked file no longer on W: is orange and can be unlinked', () => {
    expect(rowFileView({ ...base, file: null, how: 'hand', linkId: 'L1', missingOnW: true }))
      .toEqual({ note: 'Not found on W: (moved or renamed?)', tone: 'warn', action: 'unlink', actionLabel: 'Unlink' });
  });
  it('helper offline: hand link shown by name, still can unlink', () => {
    expect(rowFileView({ ...base, file: null, how: 'hand', linkId: 'L1' }))
      .toMatchObject({ note: 'Linked by hand (W: offline)', tone: 'muted', action: 'unlink' });
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/components/signedcopies/rowFileView.test.ts`
Expected: FAIL, "Failed to resolve import ./rowFileView"

- [ ] **Step 4: Write `rowFileView.ts`**

```ts
// Words, colour and button for one file on a row's signed-copy card.
import type { RowFile } from './resolveSignedCopies';

export interface RowFileView {
  note: string;
  tone: 'ok' | 'warn' | 'muted';
  action: 'unlink' | 'not_this_one' | null;
  actionLabel: string;
}

export function rowFileView(rf: RowFile): RowFileView {
  const byHand = rf.how === 'hand' && !!rf.linkId;
  const action = byHand ? 'unlink' : rf.how === 'auto' ? 'not_this_one' : null;
  const actionLabel = action === 'unlink' ? 'Unlink' : action === 'not_this_one' ? 'Not this one' : '';
  if (rf.missingOnW) return { note: 'Not found on W: (moved or renamed?)', tone: 'warn', action, actionLabel };
  if (!rf.file) return { note: 'Linked by hand (W: offline)', tone: 'muted', action, actionLabel };
  if (rf.old) return { note: 'Older copy', tone: 'muted', action, actionLabel };
  return { note: byHand ? 'Linked by hand' : 'Found by name', tone: 'ok', action, actionLabel };
}
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run src/components/signedcopies/rowFileView.test.ts`
Expected: `5 passed`

- [ ] **Step 6: Write `SignedCopyCard.tsx`**

```tsx
// "Signed copy" card for one row: its W: files, plus Link / Unlink / Not this one for editors.
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { roleHasPermission } from '../../lib/permissions';
import { useWFileOpener } from '../wfiles/useWFileOpener';
import { WFileButton } from '../wfiles/WFileOpen';
import { WFileAttachPicker } from '../wfiles/WFileAttachPicker';
import type { SignedTab } from './matchRules';
import { rowFileView } from './rowFileView';
import { useTabSignedCopies } from './useTabSignedCopies';

const TONE = { ok: 'text-text-secondary', warn: 'text-orange-600', muted: 'text-text-tertiary' } as const;

interface Props { tab: SignedTab; records: ReadonlyArray<{ id: string }>; rowId: string }

export function SignedCopyCard({ tab, records, rowId }: Props) {
  const sc = useTabSignedCopies(tab, records);
  const opener = useWFileOpener();
  const canEdit = roleHasPermission(useAuthStore((s) => s.currentUser)?.role, 'canEdit');
  const [picking, setPicking] = useState(false);
  const files = sc.resolved.byRow[rowId] ?? [];

  return (
    <section className="bg-surface rounded-xl border border-border p-4 print:hidden" aria-label="Signed copy">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider">Signed copy</h3>
        {canEdit && sc.filesState === 'ready' && (
          <button type="button" onClick={() => setPicking((p) => !p)} className="text-xs text-accent hover:underline">
            {picking ? 'Close' : 'Link a file'}
          </button>
        )}
      </div>
      {sc.filesState === 'loading' && <p className="text-xs text-text-tertiary">Looking on W:…</p>}
      {sc.filesState === 'error' && <p className="text-xs text-orange-600">W: is offline. Start the laptop helper to see files.</p>}
      {files.length === 0 && sc.filesState === 'ready' && <p className="text-xs text-text-tertiary">No signed copy found on W: yet.</p>}
      <ul className="space-y-1.5">
        {files.map((rf) => {
          const v = rowFileView(rf);
          return (
            <li key={rf.linkId ?? rf.file?.id ?? rf.fileName} className="flex items-center gap-2 text-sm">
              {rf.file ? <WFileButton file={rf.file} opener={opener} /> : <span className="truncate">{rf.fileName}</span>}
              <span className={`text-xs ${TONE[v.tone]}`}>{v.note}</span>
              {canEdit && v.action && (
                <button type="button" disabled={sc.busy} className="ml-auto text-xs text-text-secondary hover:underline disabled:opacity-50"
                  onClick={() => (v.action === 'unlink' ? sc.unlink(rf.linkId!) : rf.file && sc.link(rowId, rf.file, 'not_this_one'))}>
                  {v.actionLabel}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {picking && <WFileAttachPicker busy={sc.busy} onPick={(f) => { void sc.link(rowId, f); setPicking(false); }} />}
      {sc.linksError && <p className="mt-2 text-xs text-red-600">{sc.linksError}</p>}
      {opener.error && <p className="mt-2 text-xs text-red-600">{opener.error}</p>}
      {opener.viewer}
    </section>
  );
}
```

If `useAuthStore`'s user role field is not `role`, use the same expression the tab file already uses for `canEdit`.

- [ ] **Step 7: Put the card in the four detail views**

In each file add `import { SignedCopyCard } from '../signedcopies/SignedCopyCard';` and the line below, just above the `EvidencePanel` block named in **Files**. If the file does not already read the store array, add the selector line shown.

```tsx
// NCRRecordPage.tsx  (add: const ncrRecords = useNCRStore((s) => s.records);)
<SignedCopyCard tab="ncr" records={ncrRecords} rowId={record.id} />
// DCRWorkflow.tsx, inside DCRDetailPanel  (add: const dcrRecords = useDCRStore((s) => s.records);)
<SignedCopyCard tab="dcr" records={dcrRecords} rowId={record.id} />
// CSIDashboard.tsx  (records already exists at line 48)
<SignedCopyCard tab="csi" records={records} rowId={selected.id} />
// ObjectivesDashboard.tsx, inside ObjectiveModal  (add: const objRecords = useObjectivesStore((s) => s.records);)
{record && <SignedCopyCard tab="objectives" records={objRecords} rowId={record.id} />}
```

Hooks go at the top of the component, before any early `return`.

- [ ] **Step 8: Type check, tests, build**

Run: `npx tsc -b --noEmit && npx vitest run src/components/signedcopies && npm run build`
Expected: no type errors; all signed-copies tests pass; build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/components/signedcopies/useTabSignedCopies.ts src/components/signedcopies/rowFileView.ts src/components/signedcopies/rowFileView.test.ts src/components/signedcopies/SignedCopyCard.tsx src/components/ncr/NCRRecordPage.tsx src/components/documents/DCRWorkflow.tsx src/components/compliance/CSIDashboard.tsx src/components/objectives/ObjectivesDashboard.tsx
git commit -m "feat: signed-copy card in NCR, DCR, CSI and Objectives"
```

---

### Task 7: "X of Y signed" and the not-linked list on the four list screens

All paths are under `D:\QMS Dashboard\qms-cloudflare`.

**Files:**
- Create: `src/components/signedcopies/trackerText.ts`, `trackerText.test.ts`
- Create: `src/components/signedcopies/SignedCopyTracker.tsx`
- Modify: `src/components/ncr/NCRWorkflow.tsx` (store array at line 43)
- Modify: `src/components/documents/DCRWorkflow.tsx` (store array at line 72)
- Modify: `src/components/compliance/CSIDashboard.tsx` (store array at line 48)
- Modify: `src/components/objectives/ObjectivesDashboard.tsx` (store array at line 60)

**Interfaces:**
- Consumes: Task 5/6 `useTabSignedCopies`, `UseSignedCopies` (`resolved.counts`, `resolved.notLinked`, `link`, `busy`, `filesState`, `linksError`); `NotLinkedFile`; `useWFileOpener`, `WFileButton`.
- Produces:
  - `trackerText(counts: { signed: number; missing: number; notLinked: number } | null): { main: string; sub: string }`
  - `<SignedCopyTracker tab={SignedTab} records={...} rowLabel={(r) => string} />`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/signedcopies/trackerText.test.ts
import { describe, expect, it } from 'vitest';
import { trackerText } from './trackerText';

describe('trackerText', () => {
  it('W: offline: says it cannot count', () => {
    expect(trackerText(null)).toEqual({ main: "Can't count, W: offline", sub: '' });
  });
  it('shows X of Y and the not-linked files', () => {
    expect(trackerText({ signed: 12, missing: 3, notLinked: 2 }))
      .toEqual({ main: '12 of 15 signed', sub: '3 missing · 2 files not linked' });
  });
  it('all signed, nothing loose', () => {
    expect(trackerText({ signed: 4, missing: 0, notLinked: 0 })).toEqual({ main: '4 of 4 signed', sub: '' });
  });
  it('no rows at all', () => {
    expect(trackerText({ signed: 0, missing: 0, notLinked: 1 })).toEqual({ main: 'No rows yet', sub: '1 file not linked' });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/components/signedcopies/trackerText.test.ts`
Expected: FAIL, "Failed to resolve import ./trackerText"

- [ ] **Step 3: Write `trackerText.ts`**

```ts
// The words on a list screen's signed-copy line.
type Counts = { signed: number; missing: number; notLinked: number } | null;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function trackerText(counts: Counts): { main: string; sub: string } {
  if (!counts) return { main: "Can't count, W: offline", sub: '' };
  const total = counts.signed + counts.missing;
  const parts: string[] = [];
  if (counts.missing) parts.push(`${counts.missing} missing`);
  if (counts.notLinked) parts.push(plural(counts.notLinked, 'file not linked', 'files not linked'));
  return { main: total ? `${counts.signed} of ${total} signed` : 'No rows yet', sub: parts.join(' · ') };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/components/signedcopies/trackerText.test.ts`
Expected: `4 passed`

- [ ] **Step 5: Write `SignedCopyTracker.tsx`**

```tsx
// List-screen line: "X of Y signed", plus the W: files in this tab's folder that match no row (or many rows).
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { roleHasPermission } from '../../lib/permissions';
import { useWFileOpener } from '../wfiles/useWFileOpener';
import { WFileButton } from '../wfiles/WFileOpen';
import type { SignedTab } from './matchRules';
import { trackerText } from './trackerText';
import { useTabSignedCopies } from './useTabSignedCopies';

interface Props<R extends { id: string }> { tab: SignedTab; records: ReadonlyArray<R>; rowLabel: (r: R) => string }

const REASON = { no_row: 'Matches no row', many_rows: 'Matches more than one row' } as const;

export function SignedCopyTracker<R extends { id: string }>({ tab, records, rowLabel }: Props<R>) {
  const sc = useTabSignedCopies(tab, records);
  const opener = useWFileOpener();
  const canEdit = roleHasPermission(useAuthStore((s) => s.currentUser)?.role, 'canEdit');
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<Record<string, string>>({});
  if (sc.filesState === 'loading') return <p className="text-xs text-text-tertiary print:hidden">Counting signed copies…</p>;
  const t = trackerText(sc.resolved.counts);
  const loose = sc.resolved.notLinked;

  return (
    <div className="text-sm print:hidden">
      <div className="flex items-center gap-3">
        <span className="font-medium">{t.main}</span>
        {t.sub && <span className="text-xs text-text-tertiary">{t.sub}</span>}
        {loose.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-accent hover:underline">
            {open ? 'Hide' : 'Show'} not-linked files
          </button>
        )}
      </div>
      {open && (
        <ul className="mt-2 space-y-1.5 bg-surface rounded-xl border border-border p-3">
          {loose.map((n) => (
            <li key={n.file.id} className="flex flex-wrap items-center gap-2">
              <WFileButton file={n.file} opener={opener} />
              <span className="text-xs text-text-tertiary">{REASON[n.reason]}</span>
              {canEdit && (
                <span className="ml-auto flex items-center gap-1">
                  <select aria-label={`Row for ${n.file.name}`} value={pick[n.file.id] ?? ''}
                    onChange={(e) => setPick((p) => ({ ...p, [n.file.id]: e.target.value }))}
                    className="text-xs border border-border rounded px-1 py-0.5 bg-surface">
                    <option value="">Pick a row…</option>
                    {records.map((r) => <option key={r.id} value={r.id}>{rowLabel(r)}</option>)}
                  </select>
                  <button type="button" disabled={sc.busy || !pick[n.file.id]}
                    onClick={() => void sc.link(pick[n.file.id], n.file)}
                    className="text-xs text-accent hover:underline disabled:opacity-50">Link</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {sc.linksError && <p className="mt-1 text-xs text-red-600">{sc.linksError}</p>}
      {opener.error && <p className="mt-1 text-xs text-red-600">{opener.error}</p>}
      {opener.viewer}
    </div>
  );
}
```

All hooks run before the early `return`, so the hook order never changes.

- [ ] **Step 6: Put the tracker on the four list screens**

In each file add `import { SignedCopyTracker } from '../signedcopies/SignedCopyTracker';` and put one line just under the screen's title row (the first header block in the returned JSX). For `rowLabel`, use the same fields the screen already shows in the first column of its table (check the record type in `src/types/index.ts`). Example for NCR:

```tsx
<SignedCopyTracker tab="ncr" records={records} rowLabel={(r) => `${r.ncrNumber} ${r.title ?? ''}`.trim()} />
```

Do the same with `tab="dcr"`, `tab="csi"` and `tab="objectives"`, each with its own `records` array (lines named in **Files**) and its own number + title fields.

- [ ] **Step 7: Type check, tests, build**

Run: `npx tsc -b --noEmit && npx vitest run src/components/signedcopies && npm run build`
Expected: no type errors; all signed-copies tests pass; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/signedcopies/trackerText.ts src/components/signedcopies/trackerText.test.ts src/components/signedcopies/SignedCopyTracker.tsx src/components/ncr/NCRWorkflow.tsx src/components/documents/DCRWorkflow.tsx src/components/compliance/CSIDashboard.tsx src/components/objectives/ObjectivesDashboard.tsx
git commit -m "feat: signed-copy count and not-linked list on four list screens"
```

---

### Task 8: Deploy part 1 to prod and check it in the browser

Standing approval: QMS prod deploys are allowed without asking. Do the steps in this order: database, then server, then front end. If the front end goes out first, the card shows "Could not load links" until the server is live.

**Files:** none in the repo. One line is added to `D:\QMS Dashboard\DEPLOY-PLAN.md` in Step 6.

- [ ] **Step 1: Run every test and type check one more time**

```bash
cd "D:/QMS Dashboard/qms-server" && npm run test:server && npm run typecheck
cd "D:/QMS Dashboard/qms-cloudflare" && npx vitest run && npm run build
```

Expected: all pass. Stop if anything fails.

- [ ] **Step 2: Add the links table to the live database**

```bash
cd "D:/QMS Dashboard/qms-server"
npx wrangler d1 migrations list pta-qms-db --remote
npx wrangler d1 migrations apply pta-qms-db --remote
npx wrangler d1 migrations list pta-qms-db --remote
```

Expected: the first list shows only `0008_signed_copy_links.sql` as not applied. The last list shows nothing left to apply. If the first list shows any other file, stop and tell the user.

- [ ] **Step 3: Deploy the server**

```bash
cd "D:/QMS Dashboard/qms-server" && npx wrangler deploy
```

Expected: "Deployed" with a version id. Write it down for Step 6.

- [ ] **Step 4: Deploy the front end**

```bash
cd "D:/QMS Dashboard/qms-cloudflare" && npm run deploy
```

Expected: build passes, then "Deployed" with a version id. Write it down.

- [ ] **Step 5: Check it in the browser (live site, real data: look only)**

The laptop helper and tunnel must be running so W: is online.
1. Open the NCR screen. Expected: "X of Y signed" under the title, no red error.
2. Open one NCR. Expected: the "Signed copy" card above the evidence panel. If a file was found by name, it says "Found by name" and opens in the viewer.
3. Open DCR, Customer satisfaction and Objectives. Expected: the same line and card on each.
4. Read the browser console. Expected: no errors from `/api/signed-copies`.
5. Do NOT link, unlink or click "Not this one" on real rows. Linking was tested on the local server in Task 4. If the user wants a live link test, ask them which row to use first.

- [ ] **Step 6: Note the deploy**

Add this line at the end of `D:\QMS Dashboard\DEPLOY-PLAN.md`, with the two version ids from Steps 3 and 4:

```text
- 2026-10-07 signed copies part 1 (NCR, DCR, CSI, Objectives): D1 0008 applied; server <id from Step 3>; front end <id from Step 4>.
```

No git commit: `DEPLOY-PLAN.md` is outside both repos.

---

### Task 9: Audit, TUV and Management review, plus one overview page

All paths are under `D:\QMS Dashboard\qms-cloudflare`. The match rules for `audit`, `tuv` and `mrm` already exist (Task 2). This task puts the card and the tracker on those three screens and adds one page that shows all seven tabs together. Training is NOT in this plan (left for later, as the spec says).

**Files:**
- Create: `src/components/signedcopies/tabScreen.ts`, `tabScreen.test.ts`
- Create: `src/components/signedcopies/SignedCopiesOverview.tsx`
- Modify: `src/components/audit/AuditProgramme.tsx` (store array line 64; `EvidencePanel` line 465)
- Modify: `src/components/tuv/TUVTracker.tsx` (store array line 52; `TUVModal` at line 327, its `EvidencePanel` at line 554)
- Modify: `src/components/mrm/MRMManager.tsx` (store array line 122; `EvidencePanel` line 799)
- Modify: `src/types/index.ts` (`ViewTab`, line 132)
- Modify: `src/lib/router.ts` (`SCREEN_SLUGS`)
- Modify: `src/lib/nav.tsx` (Documents group after `annual_set` at line 64; `SCREEN_TITLES`; `isScreenBlocked` at line 155)
- Modify: `src/components/layout/AppShell.tsx` (one lazy import, one `case`)

**Interfaces:**
- Consumes: `SignedCopyCard` (Task 6), `SignedCopyTracker` and `trackerText` (Task 7), `useTabSignedCopies` (Task 6), `SIGNED_TABS`, `TAB_LABEL`, `SignedTab` (Task 2), `navigate(screen: ViewTab, recordId?: string | null): void` from `src/lib/router.ts`.
- Record fields used for row labels: `AuditProgrammeRecord.ref`, `.dep`, `.dt` (all optional strings); `TUVRecord.num`, `.desc` (optional); `MRMRecord.meetingNo`, `.meetingDate` (strings).
- Produces: `TAB_SCREEN: Record<SignedTab, ViewTab>`; screen id `signed_copies`, address `#/signed-copies`, component `SignedCopiesOverview`.

- [ ] **Step 1: Put the card in the three detail views**

In each of the three files add:

```tsx
import { SignedCopyCard } from '../signedcopies/SignedCopyCard';
```

Put the card on the line just above each `EvidencePanel`:

```tsx
// AuditProgramme.tsx, above line 465
<SignedCopyCard tab="audit" records={records} rowId={record.id} />
// MRMManager.tsx, above line 799
<SignedCopyCard tab="mrm" records={records} rowId={record.id} />
// TUVTracker.tsx, inside TUVModal, above line 554
<SignedCopyCard tab="tuv" records={records} rowId={record.id} />
```

Use the variable name each view already uses for the open record (it may be `record`, `selected` or similar; read the 20 lines above the `EvidencePanel`). If `records` is not in scope in that component, read it there with the store hook: `useAuditProgrammeStore((s) => s.records)`, `useMRMStore((s) => s.records)`, `useTUVStore((s) => s.records)`. For `TUVModal`, add the hook inside `TUVModal` instead of adding a new prop.

- [ ] **Step 2: Put the tracker on the three list screens**

In each file add `import { SignedCopyTracker } from '../signedcopies/SignedCopyTracker';` and put one line just under the title row (the first header block in the returned JSX):

```tsx
<SignedCopyTracker tab="audit" records={records}
  rowLabel={(r) => [r.ref, r.dep, r.dt].filter(Boolean).join(' ') || r.id} />
<SignedCopyTracker tab="tuv" records={records}
  rowLabel={(r) => [r.num, r.desc?.slice(0, 60)].filter(Boolean).join(' ') || r.id} />
<SignedCopyTracker tab="mrm" records={records}
  rowLabel={(r) => `${r.meetingNo} ${r.meetingDate}`.trim() || r.id} />
```

- [ ] **Step 3: Type check and build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/audit/AuditProgramme.tsx src/components/tuv/TUVTracker.tsx src/components/mrm/MRMManager.tsx
git commit -m "feat: signed copies in Audit, TUV and Management review"
```

- [ ] **Step 5: Write the failing test for the tab-to-screen map**

```ts
// src/components/signedcopies/tabScreen.test.ts
import { describe, expect, it } from 'vitest';
import { SCREEN_SLUGS } from '../../lib/router';
import { SIGNED_TABS } from './matchRules';
import { TAB_SCREEN } from './tabScreen';

describe('TAB_SCREEN', () => {
  it('sends every signed tab to a real screen', () => {
    for (const tab of SIGNED_TABS) expect(SCREEN_SLUGS[TAB_SCREEN[tab]]).toBeTruthy();
  });
  it('has no extra tabs', () => {
    expect(Object.keys(TAB_SCREEN).sort()).toEqual([...SIGNED_TABS].sort());
  });
});
```

Run: `npx vitest run src/components/signedcopies/tabScreen.test.ts`
Expected: FAIL, "Failed to resolve import ./tabScreen". If `SCREEN_SLUGS` is not exported from `router.ts`, add `export` to it in this step.

- [ ] **Step 6: Write `tabScreen.ts`**

```ts
// Which sidebar screen holds each signed-copy tab.
import type { ViewTab } from '../../types';
import type { SignedTab } from './matchRules';

export const TAB_SCREEN: Record<SignedTab, ViewTab> = {
  ncr: 'deviations',
  dcr: 'dcr_workflow',
  csi: 'pms',
  objectives: 'objectives',
  audit: 'audit_records',
  tuv: 'tuv_tracker',
  mrm: 'mrm_manager',
};
```

Run: `npx vitest run src/components/signedcopies/tabScreen.test.ts`
Expected: `2 passed`

- [ ] **Step 7: Write `SignedCopiesOverview.tsx`**

```tsx
// "Signed copies" page: one line per sidebar tab with "X of Y signed". Click a line to open that tab.
import { navigate } from '../../lib/router';
import { useNCRStore } from '../../store/useNCRStore';
import { useDCRStore } from '../../store/useDCRStore';
import { useCSIStore } from '../../store/useCSIStore';
import { useObjectivesStore } from '../../store/useObjectivesStore';
import { useAuditProgrammeStore } from '../../store/useAuditProgrammeStore';
import { useTUVStore } from '../../store/useTUVStore';
import { useMRMStore } from '../../store/useMRMStore';
import { TAB_LABEL, type SignedTab } from './matchRules';
import { TAB_SCREEN } from './tabScreen';
import { trackerText } from './trackerText';
import { useTabSignedCopies } from './useTabSignedCopies';

function TabLine({ tab, records }: { tab: SignedTab; records: ReadonlyArray<{ id: string }> }) {
  const sc = useTabSignedCopies(tab, records);
  const t = sc.filesState === 'loading' ? { main: 'Counting…', sub: '' } : trackerText(sc.resolved.counts);
  return (
    <li>
      <button type="button" onClick={() => navigate(TAB_SCREEN[tab])}
        className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover rounded-xl">
        <span className="w-48 font-medium">{TAB_LABEL[tab]}</span>
        <span>{t.main}</span>
        {t.sub && <span className="text-xs text-text-tertiary">{t.sub}</span>}
      </button>
    </li>
  );
}

export function SignedCopiesOverview() {
  const ncr = useNCRStore((s) => s.records);
  const dcr = useDCRStore((s) => s.records);
  const csi = useCSIStore((s) => s.records);
  const objectives = useObjectivesStore((s) => s.records);
  const audit = useAuditProgrammeStore((s) => s.records);
  const tuv = useTUVStore((s) => s.records);
  const mrm = useMRMStore((s) => s.records);
  return (
    <div className="p-4 max-w-3xl">
      <h1 className="text-[16px] font-semibold tracking-tight text-text-primary">Signed copies</h1>
      <p className="text-xs text-text-tertiary mb-3">Files stay on W:. This page only counts them.</p>
      <ul className="bg-surface rounded-xl border border-border divide-y divide-border">
        <TabLine tab="ncr" records={ncr} />
        <TabLine tab="dcr" records={dcr} />
        <TabLine tab="csi" records={csi} />
        <TabLine tab="objectives" records={objectives} />
        <TabLine tab="audit" records={audit} />
        <TabLine tab="tuv" records={tuv} />
        <TabLine tab="mrm" records={mrm} />
      </ul>
    </div>
  );
}
```

Seven `TabLine`s share the one W: file list (Task 5 `useSignedCopies` caches it), so the page makes one file-list call plus seven small link calls.

- [ ] **Step 8: Add the screen to the app**

`src/types/index.ts` line 132:

```ts
  | 'users' | 'audit_trail' | 'import_v12' | 'w_files' | 'annual_set' | 'signed_copies';
```

`src/lib/router.ts`, in `SCREEN_SLUGS` after `annual_set: 'annual-set',`:

```ts
  signed_copies: 'signed-copies',
```

`src/lib/nav.tsx`: add `FileCheck` to the existing `lucide-react` import, then in the Documents group after the `annual_set` item:

```tsx
      { id: 'signed_copies', label: 'Signed copies', icon: <FileCheck className={ic} aria-hidden="true" />, screens: ['signed_copies'], keywords: 'signed scanned copy record ncr dcr audit tuv mrm csi objectives' },
```

and in `SCREEN_TITLES` after the `annual_set` entry:

```ts
  signed_copies: 'Signed copies',
```

In `isScreenBlocked` (line 155): if it lists screens per role, give `signed_copies` the same rule as `w_files`.

`src/components/layout/AppShell.tsx`, next to the other `lazyWithRetry` lines:

```ts
const SignedCopiesOverview = lazyWithRetry(() => import('../signedcopies/SignedCopiesOverview').then((m) => ({ default: m.SignedCopiesOverview })));
```

and after `case 'w_files': return <WFilesPage />;`:

```tsx
    case 'signed_copies': return <SignedCopiesOverview />;
```

- [ ] **Step 9: Type check, tests, build**

Run: `npx tsc -b --noEmit && npx vitest run && npm run build`
Expected: no errors; all tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/components/signedcopies/tabScreen.ts src/components/signedcopies/tabScreen.test.ts src/components/signedcopies/SignedCopiesOverview.tsx src/types/index.ts src/lib/router.ts src/lib/nav.tsx src/components/layout/AppShell.tsx
git commit -m "feat: signed copies overview page"
```

- [ ] **Step 11: Deploy and check**

No database or server change in this task. Front end only:

```bash
cd "D:/QMS Dashboard/qms-cloudflare" && npm run deploy
```

In the browser (look only, do not change data):
1. Open `#/signed-copies`. Expected: seven lines, each "X of Y signed" or "Can't count, W: offline".
2. Click "Internal audit" (or the audit label in `TAB_LABEL`). Expected: the Audit screen opens with its tracker line.
3. Open one audit, one TUV finding and one management review. Expected: the "Signed copy" card on each.
4. Read the console. Expected: no errors.

Add this line at the end of `D:\QMS Dashboard\DEPLOY-PLAN.md`:

```text
- 2026-10-07 signed copies part 2 (Audit, TUV, MRM + overview page): front end <id from the deploy output>.
```

---
