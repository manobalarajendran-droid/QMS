# Signed copies in the portal: design

Date: 7 Oct 2026. Status: waiting for user review.

## 1. Goal

User's words: "I want all the qms documents in the portal, which should help me organize, maintain and track."
Track what: "All the signed copies respective to their side bar tabs."

Success means:
- Each row in each sidebar tab (an NCR, a DCR, a survey, an objective, an audit and so on) shows its signed copy from W:, or clearly says it is missing.
- Each tab shows how many rows have a signed copy and how many are missing.
- W: files that belong to no row are listed, so they can be linked or cleaned up.
- The QMS documents that are on the Desktop but not on W: are handed back as a sorted pack. The user copies the pack onto W: themselves.

## 2. Fixed rules

- W: (`\\192.168.3.10\Master QMS Repository`) is **read only** for the portal and for Claude.
- Files are never stored in the cloud. The portal reads W: only through the laptop helper (`D:\Claude Code\qms-file-store\server.js`, port 8788) and the tunnel.
- The database holds only **links** (notes saying "this row ↔ this W: file"). It never holds the files.
- The real seed data is never changed or reclassified.

## 3. What the user sees

### 3.1 "Signed copy" card in each row's detail view

One shared component, `SignedCopyCard`, used by every tab. It follows the pattern of `DMLWFileCard`.

- It lists the matched W: file(s). One click opens a file (`WFileButton` + `useWFileOpener`).
- Each file has a small label: **auto** (found by the name rule) or **linked by hand**.
- If no file matches, a red line says "No signed copy on W:", with a **Link a file** button.
- **Link a file** opens a picker (based on `WFileAttachPicker`) that lists only the files in that tab's W: folder(s). A search box filters by name.
- **Unlink** (on each file) removes a wrong link. For an auto match, Unlink saves a "not this one" note, so the same auto match does not come back.
- Files named old/obsolete (`isObsoleteName`) are shown greyed as "old copy". They never count as the signed copy.

### 3.2 Tracker at the top of each tab

A thin bar: "**8 of 10 signed · 2 missing · 3 not linked**".
- Clicking "missing" filters the tab to the rows with no signed copy.
- Clicking "not linked" opens the "Not linked" list (3.3).

### 3.3 "Not linked" list per tab

These are the W: files in the tab's folder(s) that match no row. Each line has **Open** and **Link to row…** (choose the row from a list).

### 3.4 "Signed copies" overview page

A new sidebar item (under the documents group). It has one line per tab: tab name, signed, missing, not linked, and a link to that tab. Everyone can see it.

## 4. Match rules (one per tab)

All rules live in one front-end file: `src/components/signedcopies/matchRules.ts`. Each rule has:
- `folders`: the W: folder path prefix(es) to look in.
- `keys(row)`: the values from the row that must all appear in the file name.

Names are compared after a simple clean-up: lower case, letters and digits only. So `NCR-03` and `ncr 03` both count.

| Tab | W: folder(s) | Values that must be in the file name |
|---|---|---|
| NCR | 06 - Records / NCR-CAPA | NCR number + client + year |
| DCR | 06 - Records / Document Control | DCR number (e.g. `002`, with "DOCUMENT CHANGE REQUEST" or "DCR") |
| Customer satisfaction (CSI) | 06 - Records / Customer | customer + year |
| Quality objectives | 03 - Quality Objectives | department code (e.g. OPS) + year |
| Internal audit | 06 - Records / Audit | area (e.g. P&E) + year |
| TUV audit | 06 - Records / Audit | "TUV" + year |
| Management review | 06 - Records / Context & Planning | "MRM"/"Management Review" + year |
| Risks / Issues / Opportunities | 06 - Records / Context & Planning | register type + year |
| Training | 06 - Records / HR | course or person + year |

Example real names these rules must match:
- `FM-NC-13_AR-RAZI-P-II-NCR-03_2025.pdf` → NCR 03, client AR-RAZI, year 2025
- `DOCUMENT CHANGE REQUEST- 002 - FM-NC-13.pdf` → DCR 002
- `FM-CSS-01_CHEMANOL_2025.pdf` → CSI for CHEMANOL, 2025
- `PT-OBJ-04 OPS QUALITY OBJECTIVE 2026.docx` → OPS objectives, 2026
- `Internal Audit Report_P&E_2025.pdf` → P&E internal audit, 2025

The order of priority is:
1. A hand link always wins.
2. A "not this one" note blocks that auto match.
3. An auto match counts only if the file matches **exactly one** row. A file that matches two or more rows is not auto-linked. It goes to "Not linked", with a note saying it matches more than one row.
4. Old/obsolete files never count.

The exact folder names and the field names of each tab's row are checked against the code and W: during planning. The table above gives the intent.

## 5. How links are saved

### 5.1 New D1 table (migration `0008_signed_copy_links.sql`)

`SignedCopyLink`:

| Column | Meaning |
|---|---|
| id | text, primary key |
| tab | text, e.g. `ncr`, `dcr`, `csi` |
| rowId | text, the row's id in that tab |
| wFileId | text, the W: file id from the helper |
| fileName | text, the file name at link time (shown if the file later moves) |
| kind | `link` or `not_this_one` |
| createdBy, createdAt | who and when |
| removedBy, removedAt | filled when unlinked (soft delete) |

- It is never hard-deleted. As in `0005_evidence_files.sql`, triggers block DELETE, and they block changes to any column except removedBy/removedAt.
- There is an index on (tab, rowId).

### 5.2 API (qms-server, Hono)

- `GET /api/signed-copies?tab=ncr` returns the active links (removedAt is null) for that tab.
- `POST /api/signed-copies` with `{tab, rowId, wFileId, fileName, kind}` adds a link.
- `POST /api/signed-copies/:id/remove` soft-deletes a link.
- Anyone signed in can read. Only users who can edit that tab can add or remove links (the same permission check the tab already uses).
- Inputs are checked: `tab` must be a known tab, and `kind` must be one of the two values. The ids and the name are non-empty strings with a length limit.

### 5.3 Front end

- `useSignedCopies(tab)`: a store hook that loads the links and adds or removes them.
- `resolveSignedCopies(tab, rows, wIndex, links)`: a pure function. It returns, per row, the file(s) and how each was linked, plus the "not linked" files and the counts. The card, the tracker, the "Not linked" list and the overview page all use this one function.

## 6. When things go wrong

- **Laptop/helper off**: the card says "W: not reachable now. The laptop helper may be off." The tracker says "Can't count, W: offline". Saved links are still listed by file name, but they cannot be opened.
- **A linked file was renamed or moved on W:**: the link stays. The card shows the saved name in orange: "This file is no longer on W:". The user can unlink it and link the new file.
- **A save fails** (network or permission): a red message, and nothing changes on screen.

## 7. Desktop documents: copy pack (user's choice)

Background: a read-only compare on 7 Oct found these Desktop QMS folders:
- `Desktop\✅ QMS ORGANIZED\✅ QMS ORGANIZED`
- `Desktop\02 · QMS & ISO 9001`

Of the **3140** documents checked:
- **844** are the same as a file on W:.
- **68** have the same name as a W: file but different content (possibly newer or older versions).
- **2228** are not on W: (**1738** unique).

The portal will **not** read the Desktop. Instead:

1. Claude builds a pack on D: (`D:\QMS Evidence\_to-W-pack-2026-10-07\`, never on W:). Its folders mirror W:'s folder layout (`00 - Foundation`, `03 - Quality Objectives`, `06 - Records\NCR-CAPA`, and so on). Each unique missing file is **copied** there. The Desktop files are never moved or changed.
2. Files that cannot be placed with confidence go to `_Check-by-hand\`. They are not guessed.
3. Excluded: `_Backup-before-Claude…`, `_to_delete`, `~$` temp files and exact duplicates (only one copy of each).
4. `PACK-CHECKLIST.xlsx` lists each file: where it came from, where it goes on W:, its type (signed record / blank form / procedure / photo / email), and its date.
5. The 68 same-name files go to `_Same-name-different\`, each beside a note of the W: file's date and size. The checklist says which one is newer. The user decides which to keep.
6. The user reviews the pack and copies it onto W:. After that, the portal finds the files on its next W: read, and the auto rules link them.

Blank master forms (738 files) are kept in the pack under their own folder, because they are not signed copies. The user decides if they belong on W:.

## 8. Testing

- **Rule tests** (vitest): every rule is tested against the real W: file names listed in 4, and against the clash, "not this one" and obsolete cases.
- **API tests**: add, list, remove; the permission check; that a removed link is not listed; that the DELETE trigger blocks hard deletes.
- **Browser check** on each tab after deploy: the card, the tracker counts, Link and Unlink, and the "Not linked" list. Also with the helper off.
- **Pack check**: file counts in the pack = unique missing count. Each copied file's hash = its source hash.

## 9. Build order

1. The copy pack (section 7). It touches no portal code, and it gives W: more files to match.
2. The table, API, `resolveSignedCopies`, the card and the tracker, for **NCR, DCR, CSI and Objectives**. Then deploy to prod and check.
3. The other tabs (Audit, TUV, Management review, Risk/Issues/Opportunities, Training), the "Not linked" lists and the overview page.

## 10. Not in scope

- Uploading or editing files from the portal (W: stays read only).
- Moving or deleting anything on the Desktop or on W:.
- Reading file contents (OCR) to check signatures. "Signed copy" means the file the user keeps on W: for that row.
