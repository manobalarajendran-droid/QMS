# Record Completeness Gap Register

**Phase:** 1 (read-only audit — no source files were modified to produce this document)
**Standard applied:** [`.claude/skills/qms-record-standard/SKILL.md`](../.claude/skills/qms-record-standard/SKILL.md)
**Reference (legacy, in daily production use):** `D:\QMS Dashboard\Management_Representative_Dashboard_v12.html` and its data export `D:\QMS Dashboard\V12 Backup file\PTA_MR_Backup (7).json`
**Method:** For each module, v12's form fields/dropdowns/status flow were extracted by line-cited grep of the legacy HTML and cross-checked against the backup JSON's actual persisted records. The current app's type (`src/types/index.ts`), form component, detail view, and Zustand store were then read in full and mapped field-by-field, transition-by-transition, against that reference and against the Standard's 7 items. Every claim below is cited to a file and line number (or line range) in the current codebase and/or `Management_Representative_Dashboard_v12.html`.

Each module is scored **Pass / Partial / Missing** on each of the Standard's 7 items:
1. Ownership · 2. Action plan · 3. State machine · 4. No orphan fields · 5. Form validation · 6. Evidence/comments/export/audit trail · 7. List view

A module scores **Pass overall** only if all 7 items are Pass. No module in this codebase currently reaches that bar.

---

## Cross-cutting findings (apply to more than one module)

- **`src/components/shared/StateTransitionBar.tsx` and `src/components/shared/ActionPlanTable.tsx` do not exist anywhere in the repository** (confirmed by independent repo-wide greps from two separate audit passes — zero matches). SKILL.md's "Building" section describes these as the pattern to reuse once introduced for NCR in Phase 2; today, every module's "doesn't use the shared component" observation below is a statement that the prerequisite hasn't been built yet, not a module-specific regression.
- **Recurring pattern:** several stores already implement richer, correctly-audited transition functions that their own UI component never calls, instead using a generic `updateRecord`/raw `<select>` that bypasses reviewer/approver capture and proper audit-action typing:
  - DCR: `reviewDCR`/`approveDCR`/`rejectDCR` (`useDCRStore.ts:99-181`) unused by `DCRWorkflow.tsx`.
  - DML: `reviseDocument()` (`useDMLStore.ts:3229-3291`) unused by `DMLManager.tsx`.
  - Internal Audits: `updateStatus()` (`useAuditProgrammeStore.ts:298-321`) unused by `AuditProgramme.tsx`.
  - TÜV: `updateStatus()` (`useTUVStore.ts:186-206`) unused by `TUVTracker.tsx`.
  - Approved Vendors: `updateStatus()` (`useSupplierEvalStore.ts:86-94`) unused by `SupplierDashboard.tsx`.
  - Calibration: `updateStatus()`/`computeCalibStatus()`/`isCalibOverdue()` (`useCalibStore.ts:11-130`) unused by `CalibrationRegister.tsx` — confirmed dead code by repo-wide grep.
  - Client Intake: 2 of 3 real transitions call `updateRecord` directly instead of `updateStatus` (`UnifiedVoC.tsx:46,49`).
  - Objectives and CSI have only ever had a single generic `updateStatus` setter — there is no richer function being bypassed for these two.
- **Dead/unreachable UI files** (render hardcoded mock data, never imported by `AppShell.tsx`, confirmed by repo-wide grep): `src/components/documents/DMLView.tsx`, `src/components/mrm/MRMView.tsx`. The real routed screens are `DMLManager.tsx`, `DCRWorkflow.tsx`, `MRMManager.tsx` (`AppShell.tsx:259-262`). `src/components/audits/AuditSchedule.tsx` (plural folder) is likewise unwired — the real "Internal Audits" screen is `src/components/audit/AuditProgramme.tsx` (singular folder, `Sidebar.tsx:71`, `AppShell.tsx:55,71,257`, tab id `audit_records`). These dead files were excluded from scoring and should eventually be deleted or clearly marked — **stop and ask before deleting**, per the governing constraints.
- **Two parallel, unreconciled "supplier" implementations** exist: `SupplierDashboard.tsx` / `useSupplierEvalStore` / `SupplierEvalRecord` (Zustand, local-only — the one scored under Approved Vendors below) vs. `SupplierScorecard.tsx` / `ShareSupplierLink.tsx` / `SupplierPortalView.tsx` (REST-backed, its own `Supplier` interface, an external vendor-portal feature). This is a material duplication risk flagged for the QMS owner's attention; it is not itself a scored item.
- **`src/store/useCAPAStore.ts` is not the ISO CAPA mechanism for NCR.** It is an unrelated AI-suggested-corrective-actions-for-failed-tests feature keyed by `testId`/`linkedRequirementIds`, not wired into `NCRWorkflow.tsx`. NCR's actual corrective/preventive action fields (`corrAction`, `prevAction`, etc.) live directly on `NCRRecord`.
- **`src/components/audit/AuditTrailViewer.tsx` + `useAuditStore`** is the separate system-wide audit-trail log (the sink every module above calls via `useAuditStore.getState().log(...)`) — it is out of scope as its own "module" for this register.
- Several modules' legacy v12 data model itself has **no formal state machine** (Objectives, CSI — both a single free-standing status dropdown plus an external audit log, no approve/reject functions at all in v12 either). For these two, a weak Item 3 score is largely **parity with v12**, not a regression versus the app currently in daily use — though it still fails to meet the new Standard, which is v12-independent.
- All persisted stores use `localStorage` keys of the form `qatrial:use<Module>Store` — any field additions recommended in the work lists below **must be optional** to avoid breaking already-persisted records, per SKILL.md's explicit instruction. None of the recommendations below require a `persist` `migrate` function or a change to an existing status string value; anywhere one might, it is flagged for sign-off individually.

---

## NCR / CAPA

### a. v12 field extraction

**Form:** `Management_Representative_Dashboard_v12.html` lines 1067–1169, modal id `ncrOv`, titled "QUALITY REPORT | FM-NC-13 Rev 03":
- **A. Classification** (1090–1098): radio `ncrClsType` = `Observation | Potential NCR | NCR`
- **B. General Info** (1100–1107): `ncrRef, ncrDt, ncrProject, ncrRaisedBy, ncrAuditeeName, ncrAuditeeDept, ncrRefDoc, ncrAuditeeEmail`
- **C. Description** (1109–1121): conditional radio `ncrObSubType` = `Potential for Weakness | Good Practice` (Observation only); `ncrDesc`, `ncrObjEvidence`
- **D. Causes** [Potential NCR/NCR only] (1123–1136): radio `ncrRcaCat` = `Human Error | Process Gap | Training | Management System Failure | Other`; `ncrRca` textarea
- **E. Corrective Action** [Potential NCR/NCR only] (1138–1143): `ncrCorrAction`, `ncrCorrBy`
- **F. Preventive Action** [Potential NCR/NCR only] (1145–1150): `ncrPrevAction`, `ncrPrevBy`
- **G. MR Decision** (1152–1162): radio `ncrFinalDec` = `Accepted & Closed | Rejected / Further Action | Escalate to Management | Open` (default); `ncrVerifiedBy`, `ncrVerifiedDate`

No rewrite equivalent exists for the AI OCR "Smart Entry" dropzone (1079–1088) or the Google Calendar SLA reminder integration (3300–3322).

**Critical finding — `saveNCR()` (3263–3299):** v12's persisted status field `st` is **binary**: `st = finalDecision==="Accepted & Closed" ? "Closed" : "Open"`. v12 has **no multi-stage workflow** — Investigation/RootCause/CAPA_Planned/CAPA_InProgress/Verification do not exist in v12's data model at all. SLA thresholds (`saveNCR`, confirmed again `renNCR:2442`): NCR=14d, Potential NCR=2d, Observation=30d (0/N/A if `obSubType==="Good Practice"`).

`renNCR()` (2423–2520+): free-text search across ref/project/desc/auditeeName/rca, type filter, status filter, year filter, stats cards. `printNCR()` (2948–2966)/`expNCR()` (4743–4771) are **log-level only** exports, not per-record.

**Backup JSON** (`ncr`, 25 records): clsType NCR=17, Potential NCR=3, Observation=5; **all 25 have `st:"Closed"`**. Record 1 (`ref: "JULY-2024-01"`) keys match sections A–G exactly, confirming that shape as ground truth.

### b. Current-app field mapping table

Type: `NCRRecord` (`src/types/index.ts:564–590`, extends `BaseEntity` L488-493, `ApprovalMetadata` L495-504). Form: `NCRFormModal` (`src/components/ncr/NCRWorkflow.tsx:427–463`, **create-only, no edit mode**). Detail: `NCRDetailModal` (`NCRWorkflow.tsx:165–425`).

| v12 field | new-app field | edited in form? | shown in detail? | gap |
|---|---|---|---|---|
| ncrRef | `ref` | Yes — :438 | Yes — :221 | OK |
| ncrDt | `dt` | No | No | **Orphan** |
| ncrProject | `project` | Yes — :439 | Yes — :229 | OK |
| ncrRaisedBy | `raisedBy` | Yes — :440 | No | Editable only |
| ncrAuditeeName | `auditeeName` | No | No | **Orphan** |
| ncrAuditeeDept | `auditeeDept` | Yes — :442 | No | Editable only |
| ncrRefDoc | `refDoc` | No | No | **Orphan** |
| ncrAuditeeEmail | `auditeeEmail` | No | No | **Orphan** |
| ncrClsType | `classification` | Yes — :443-447 | Yes — :227 | OK |
| ncrObSubType | `obSubType` | No | No | **Orphan** |
| ncrDesc | `desc` | Yes — :449 | Yes — :262 | OK |
| ncrObjEvidence | `objEvidence` | Yes — :452 | Yes — :269 | OK |
| ncrRcaCat | `rcaCat` | No | No | **Orphan** |
| ncrRca | `rca` | Only during RootCause status (5-Whys editor, :286-309) | Not shown once status advances | Partial — vanishes from view |
| ncrCorrAction | `corrAction` | No (no edit form exists) | Only in Verification status — :335 | Never user-editable |
| ncrCorrBy | `corrBy` | Yes, mislabeled "Assigned To (Action Owner)" — :441 | No | Editable + mislabeled |
| ncrPrevAction | `prevAction` | No | No | **Orphan** |
| ncrPrevBy | `prevBy` | No | No | **Orphan** |
| ncrFinalDec | `finalDecision` | No (set by `approveNCR`, useNCRStore.ts:378) | No | **Orphan** |
| ncrVerifiedBy | `verifiedBy` | No (useNCRStore.ts:379) | No | **Orphan** |
| ncrVerifiedDate | `verifiedDate` | No (useNCRStore.ts:380) | No | **Orphan** |
| st (binary) | `status` | Via Kanban/approve/reject | Yes — badge :222 | OK (see §c) |
| — | `slaDeadline` | No | No (`calculateSLA` recomputes from `createdAt`, ignoring this field — :143-163) | **Orphan** |
| — | `assignedTo` | No (`corrBy` used instead) | No | **Orphan** |
| — | `assignedDept` | No | No | **Orphan** |
| — | `reviewedBy/reviewDate/reviewComments` | No | No | **Orphan ×3** (no review stage exists) |
| — | `approvedBy/approvalDate/approvalComments` | Set by button click (useNCRStore.ts:375-377) | No | Set but never displayed |
| — | `rejectedBy/rejectionDate/rejectionReason` | Set by button with hardcoded string (:347) | No | Set but never displayed |
| BaseEntity `isArchived` | `isArchived` | Yes — :241-246 | Implicit via filter :60 | OK |

### c. State × transition matrix

Type-level (`NCRRecordStatus`, types/index.ts:552-562): `Open | Under Investigation | Corrective Action Pending | Verification | Closed` + legacy `Investigation | RootCause | CAPA_Planned | CAPA_InProgress`. The Kanban (`NCRWorkflow.tsx:14-22`) uses **only the legacy-alias set** — the primary values `Under Investigation`/`Corrective Action Pending` are never rendered as columns.

| Status | Forward | Reject/return | Reopen from terminal |
|---|---|---|---|
| Open | → Investigation, :367 | N/A (initial) | N/A |
| Investigation | → RootCause, :368 | none | N/A |
| RootCause | → CAPA_Planned, `handleSaveRCA` :211 & duplicate button :369 | none | N/A |
| CAPA_Planned | → CAPA_InProgress, :370 | none | N/A |
| CAPA_InProgress | → Verification, :371 | none | N/A |
| Verification | `approveNCR()` → Closed, :341 | `rejectNCR()` → **`'Corrective Action Pending'`**, :347/useNCRStore.ts:398-424 | N/A |
| Closed | terminal | — | **none found anywhere in useNCRStore.ts** |

**Confirmed bug:** `rejectNCR` targets `'Corrective Action Pending'` (useNCRStore.ts:404) — a value **absent from the Kanban's `STATUSES` array** (NCRWorkflow.tsx:14-22). A rejected NCR silently disappears from every visible column.

No transition requires a reason (`updateStatus` calls at :367-371 pass none despite the store signature accepting one, useNCRStore.ts:346); Verification buttons hardcode fixed strings instead of prompting. The "State History" sidebar (:384-419) is a **derived visual stepper**, not an actual `{from,to,by,at,reason}` log (that data exists in `useAuditStore` but is never read back). Terminal Closed is gated to `isMR` client-side only (:179,338) — no store-level enforcement.

### d. 7-item score

| # | Item | Score | Justification |
|---|---|---|---|
| 1 | Ownership | **Missing** | `assignedTo`/`assignedDept` orphaned; `corrBy` is free text mislabeled as owner, not a `useAuthStore` picker; SLA badge only on Kanban card, absent from detail modal |
| 2 | Action plan | **Missing** | `corrAction`/`prevAction`/`prevBy` never editable via any UI; no evidence-per-row; no `ActionPlanTable` exists |
| 3 | State machine | **Partial** | Forward chain exists at every stage; terminal close role-gated; but reject/return exists only at Verification, no reopen-from-Closed, reason not required |
| 4 | No orphan fields | **Missing** | ≥13 fields orphaned (see table) |
| 5 | Form validation | **Partial** | Native `required` on 8 create-form fields; ISO 10.2.2 corrective/preventive fields have zero form presence |
| 6 | Evidence/comments/export/audit trail | **Missing** | No `EvidencePanel`/`CommentThread`/export anywhere in `ncr/*`; only audit-log sub-item passes |
| 7 | List view | **Missing** | Zero search/filter/sort controls (only "Show Archived") |

**Overall: fails 4 of 7 outright (Missing), 2 Partial, 0 Pass.**

### e. Ordered work list

1. Fix the reject-target bug (`rejectNCR` → `'Corrective Action Pending'`, useNCRStore.ts:404, absent from Kanban `STATUSES`).
2. Add reject/return transitions at every non-initial stage before Verification, and a reopen-from-Closed path.
3. Require a free-text reason on every transition; surface `{from,to,by,at,reason}` (already in `useAuditStore`) in place of the derived stepper.
4. Add an edit mode to `NCRFormModal`; close the 13 orphan fields.
5. Replace `corrBy` free text with a real `assignedTo` picker (`useAuthStore`) + `assignedDept` picker; wire `slaDeadline` into `calculateSLA`.
6. Build the shared `ActionPlanTable` for containment/corrective/preventive rows with per-row evidence.
7. Wire `EvidencePanel`/`CommentThread` into the detail modal; add per-record print/export.
8. Add list/filter controls (status, assignee/department, overdue, sort, search).

*Note (not in scope): `useCAPAStore.ts` is an unrelated AI-suggested-corrective-actions feature keyed by `testId` — not the ISO CAPA mechanism, not wired into `NCRWorkflow.tsx`.*

---

## Internal Audits

*Screen identity confirmed: `src/components/audit/AuditProgramme.tsx` + `useAuditProgrammeStore` is the actual "Internal Audits" nav item (`Sidebar.tsx:71`, `AppShell.tsx:55,71,257`, tab id `audit_records`). `src/components/audits/AuditSchedule.tsx` (plural folder) is unwired/unused. `AuditTrailViewer.tsx`/`useAuditStore` is the separate system audit-trail log, correctly excluded.*

### a. v12 field extraction

**Form:** HTML 1172–1270, modal id `iaOv`, "Internal Audit — FM-IAP-06 / FM-IAR-09": `iaRef, iaDt`, `iaPhase` select, `iaAuditee`, `iaScType` select with 6 presets (1191-1202, drives `updateAuditScope()`), ~28 ISO-clause checkboxes `iaCl` (1205-1239, drives `updateClausePills()` 3416-3433), auto-built/editable `iaSc` (1243-1246), `iaAud` (default "MANOBALA (MR)"), `iaDep` (free text), `iaNC`/`iaObs` (number), `iaFnd` (textarea), `iaSt` select with **4 options**: `Planned | In Progress | Completed | Report Issued`, `iaRpt`.

`saveAudit()` (3459-3482) builds `{id, ref, sc, aud, dep, auditee, phase, dt, nc, obs, fnd, st, rpt}` — **no auto-generated ref**, a blank ref saves silently.

`renIA()` (2609-2719): programme summary card, a **department-coverage grid** across all PTA departments (2669-2687, absent from rewrite), phase-filterable register, inline **per-record print button** (`printAudit(id)`, 2988-3026 — a full FM-IAR-09 formatted PDF with signature blocks, no rewrite equivalent).

**Backup JSON** (`audits`, 13 records): all 13 `st:"Planned"`. Record 100 keys: `dt, id, nc, sc, st, aud, dep, fnd, obs, ref, rpt, phase, auditee` — **no `completedDate`, `followUpDate`, or `ncrIds` key anywhere**, confirming these 3 `AuditProgrammeRecord` fields are new-app-only.

### b. Current-app field mapping table

Type: `AuditProgrammeRecord` (types/index.ts:991-1007). Single modal (form/detail combined): `AuditProgramme.tsx:178-347`.

| v12 field | new-app field | edited in form? | shown in list? | gap |
|---|---|---|---|---|
| iaRef | `ref` | Yes — :197-202 | Yes — :122 | OK |
| iaDt | `dt` | Yes — :206-211 | Yes — :126-127 | OK |
| iaSc | `sc` | Yes, **plain text**, not the checkbox/preset system — :214-220 | Yes — :130 | Degraded UX vs v12 |
| iaAud | `aud` | Yes — :232-238 | Yes — :134 | OK |
| iaDep | `dep` | Yes — :223-229 | Yes — :131 | OK |
| iaNC | `nc` | Yes — :270-276 | Yes — :142 | OK |
| iaObs | `obs` | Yes — :278-285 | Yes — :146 | OK |
| iaFnd | `fnd` | Yes — :290-297 | No | Editable only |
| iaSt (4 options) | `status` | Yes, **only 2 of 4** (`Planned`/`Report Issued`) — :250-258 | Yes — :153 | `In Progress`/`Completed`/`Follow-up` unreachable |
| iaRpt | `rpt` | Yes — :261-267 | Yes (conditional) — :155 | OK |
| iaAuditee | `auditee` | Yes — :241-247 | Yes (conditional) — :134-137 | OK |
| iaPhase | `phase` | **No** | No | **Orphan** |
| — | `ncrIds` | Yes — :300-327 | Yes (count only) — :156-161 | OK, but no linked-NCR status shown |
| — | `completedDate` | No | No | **Orphan** |
| — | `followUpDate` | No | No | **Orphan** |
| ApprovalMetadata (×9) | — | No — no approve/reject function exists | No | **Orphan ×9** |
| `isArchived` | — | Store has functions (useAuditProgrammeStore.ts:336-382), **never called** from the component | No | Functionally orphaned at UI layer |

### c. State × transition matrix

Type-level: `Planned | In Progress | Completed | Follow-up` + legacy `Report Issued`. UI-exposed (:256-257): **only `Planned` and `Report Issued`** — a raw 2-value dropdown, no gating, no role check, no reason capture.

| Status | Forward | Reject/return | Reopen |
|---|---|---|---|
| Planned | Flip dropdown → Report Issued (:250-258) → `updateRecord` | — | — |
| Report Issued | — | none | Trivially possible by flipping back — not a dedicated, reasoned action |

The store's own `updateStatus(id,status,notes)` (useAuditProgrammeStore.ts:298-321) — auto-sets `completedDate`, logs `status_change` — is **never invoked** by the component (destructures only `records, addRecord, updateRecord`). No reject/reopen function exists in the store at all.

### d. 7-item score

| # | Item | Score | Justification |
|---|---|---|---|
| 1 | Ownership | **Missing** | No due-date/SLA field beyond `dt`/orphaned `followUpDate`; no overdue indicator; `aud`/`dep`/`auditee` are free text, not pickers |
| 2 | Action plan | **Partial** | `ncrIds` linking is a legitimate substitution, but linked-NCR status/progress is never shown beyond a pick-count |
| 3 | State machine | **Missing** | 2-option `<select>` with no role gate/reason/reject/reopen; the transition-aware `updateStatus` is never called |
| 4 | No orphan fields | **Missing** | `phase, completedDate, followUpDate` + all 9 ApprovalMetadata fields never appear in the form |
| 5 | Form validation | **Missing** | Zero `required`/validation attributes across the entire modal |
| 6 | Evidence/comments/export/audit trail | **Missing** | No `EvidencePanel`/`CommentThread`; no print/export (v12 had per-record `printAudit(id)`); only audit-log sub-item passes |
| 7 | List view | **Missing** | Only free-text search; no status/assignee/department/overdue filter, no sort |

**Overall: 6 Missing, 1 Partial — the weakest score of all 11 modules.**

### e. Ordered work list

1. Wire `updateStatus(id,status,notes)` (useAuditProgrammeStore.ts:298-321) into the UI, exposing all 4 real status values with role-gated closing.
2. Add reject/return and reopen-from-terminal transitions plus a required reason field; surface `{from,to,by,at,reason}`.
3. Close orphan fields — add `phase`, `completedDate`, `followUpDate` to the form or a new read-only detail panel.
4. Add a due-date/SLA concept with a visible overdue indicator; replace free-text `aud`/`dep`/`auditee` with real pickers.
5. Restore the v12 structured-scope mechanism (ISO clause checklist + presets) or at minimum add required-field validation.
6. Add per-record print/export (v12 precedent: `printAudit(id)`); wire `EvidencePanel`/`CommentThread`.
7. Add list-view filters (status, assignee/department, overdue) and sort controls.
8. Wire the store's existing `archiveRecord`/`unarchiveRecord`/`toggleArchive` into the UI.

### f. Status — Phase 3 (2026-09-08)

**✅ DONE — reference-pattern replication complete.** `AuditProgramme.tsx` fully rewritten; `useAuditProgrammeStore.ts`'s `transitionStatus` (added this phase) is now the only path the UI uses for status changes — `updateStatus`/`updateRecord` remain for direct/legacy writes (e.g. accepting the legacy `Report Issued` value) but are no longer how the workflow bar drives state.

| # | Item | Score (post-rewrite) | Evidence |
|---|---|---|---|
| 1 | Ownership | **Pass** | `aud` (Auditor) is a `useAuthStore().users` picker (with fallback option for legacy/custom values); `dep` via `PTA_DEPARTMENTS` `DeptSelect`; `dt`/`followUpDate` due-date fields + `isOverdueAudit()` overdue badge on card and detail header, state-aware (Follow-up checks `followUpDate`, Completed is never overdue, otherwise checks `dt`) |
| 2 | Action plan | **Pass** (documented substitution) | An internal audit's "action" is the audit itself plus any linked NCRs it raises, not a CAPA-style 3-stage plan — captured via the state machine (Planned → In Progress → Completed → Follow-up) plus the "Linked NCRs" card, consistent with v12 and the module's actual purpose |
| 3 | State machine | **Pass** | Canonical bar `Planned → In Progress → Completed → Follow-up` (legacy `Report Issued` normalized to `Completed` for display/navigation only, never mutated); every transition requires reason text and is recorded in `stateHistory` (`{from,to,by,at,reason,kind}`); `Follow-up` is terminal with a dedicated "Follow-up Verified" panel; reopen from terminal `Follow-up` returns to `In Progress` (skips the pre-terminal `Completed` gate, matching the NCR reopen precedent), restricted to `isMR` |
| 4 | No orphan fields | **Pass** | `phase`, `completedDate`, `followUpDate`, `rpt` surfaced in the form and/or detail view; all `ApprovalMetadata` fields (`reviewedBy`, `reviewComments`, `approvedBy`, `approvalComments`, `rejectedBy`, `rejectionReason`, dates) surfaced conditionally in a "Review / Approval Trail" card when present |
| 5 | Form validation | **Pass** | Native HTML5 `required` attributes on all mandatory fields (ref, scope, auditor, department, due date), blocking submit with inline browser messaging — matches the pattern established on NCR/DCR |
| 6 | Evidence/comments/export/audit trail | **Pass** | `EvidencePanel entityType="audit"`, `CommentThread entityType="audit"`, `window.print()` export button, and every transition audit-logged via `useAuditStore` in the store layer |
| 7 | List view | **Pass** | Search box, status/department/auditor/overdue filters, "Show Archived" toggle, sort by newest/oldest/due/ref |

**Overall (post-rewrite): 7 of 7 items Pass.**

Verification evidence (2026-09-08):
- `npx tsc --noEmit` — clean, zero errors.
- `npm run build` — clean production build, no errors (fixed one unused-import build error, `FileText`, along the way — build-mode `tsc -b` catches `noUnusedLocals` violations that the standalone typecheck run did not).
- `npm test -- --run` — **159 passed (159) across 13 test files**, including 12 new tests in `src/store/__tests__/useAuditProgrammeStore.test.ts` covering `addRecord`, the full forward path (Planned→In Progress→Completed→Follow-up, with auto-set `completedDate`/`followUpDate`), reject, reopen-from-terminal, `updateRecord` (including direct legacy-status writes), `updateStatus`, `deleteRecord`, and archive/unarchive/toggleArchive.
- Live browser verification against the running dev server: walked the full state machine end-to-end on a live record (Planned → In Progress → Completed → Follow-up → reopened to In Progress), confirming `stateHistory` accumulates correctly with `by`/`at`/`reason`/`kind` at each step; confirmed the legacy seed record `IA-2025-01` (`status: 'Report Issued'`) displays as "Completed" via `normalizeStatus` without mutating the stored value, and its transition bar correctly offers "Verify & Close" as the only forward option; confirmed the OVERDUE badge correctly appears/clears through every transition; confirmed Evidence and Comments panels open with no errors; created, edited, and deleted a test record (`IA-TEST-99`) via the New Audit / Edit / Delete flows, confirming required-field validation blocks empty submission and both modals correctly read/write all fields.

---

## TÜV Tracker

### a. v12 field extraction

**Form:** HTML 1272–1293, modal id `tuvOv`. `num`/`cl`/`desc` shown in a read-only info block — **not editable via the modal at all**. `openTUVModal(id)` (3486-3497) only operates on an existing record — **v12 has no create-new-TÜV-record path**; the 7 recommendations are a fixed, seeded list. Editable: `tuvSt` (select: `Open | In Progress | Closed`), `tuvEv` (Evidence/Closure Notes), `tuvOwner` (text), `tuvClosed` (**plain text**, not a date input). No Delete button in this modal.

`renTUV()` (2724-2746): cards (not a table); status counts; per-card "Xd to deadline" countdown from a `due` the modal never lets you edit; either the evidence text or a red "⚠ No evidence recorded yet" warning if empty. `printTUV()` (3028-3035) is log-level only.

**Related, out-of-scope v12 feature:** `renTNCR()`/`D.tuvnc` (4214+) is a separate "TÜV Recertification NC" tracker, confirmed absent from the backup JSON entirely and with no corresponding type/store in the rewrite — flagged as a footnote, not scored.

**Backup JSON** (`tuv`, 7 records): 6 Closed / 1 In Progress. Record 1 keys `cl, id, st, due, num, desc, owner, evidence, closed` match `TUVRecord` exactly.

### b. Current-app field mapping table

Type: `TUVRecord` (types/index.ts:887-900). Single modal: `TUVTracker.tsx:167-294`.

| v12 field | new-app field | edited in form? | shown in list? | gap |
|---|---|---|---|---|
| num (read-only in v12) | `num` | Yes — :184-192 | Yes — :112 | Rewrite allows editing a field v12 treats as fixed |
| cl (read-only in v12) | `cl` | Yes — :193-201 | Yes — :114 | Same caveat |
| desc (read-only in v12) | `desc` | Yes — :202-210 | Yes — :117 | Same caveat |
| tuvOwner | `owner` | Yes — :211-219 | Yes — :120 | OK |
| due (fixed at seed in v12) | `due` | Yes — :220-228 (date) | Yes, countdown — :122-133 | Improvement over v12 |
| tuvSt | `status` | Yes — :229-240 (select) | Yes — :124 | OK |
| tuvEv | `evidence` | Yes — :250-259 | Yes, with fallback — :139-149 | OK |
| tuvClosed (plain text in v12) | `closed` | Yes — :241-249 (date) | Yes (conditional) — :134-136 | Improvement over v12 |
| — | `actionTaken` | No | No | **Orphan** |
| — | `actionTakenDate` | No | No | **Orphan** |
| — | `verifiedBy` | No | No | **Orphan** |
| — | `verifiedDate` | No | No | **Orphan** |
| ApprovalMetadata (×9) | — | No — no approve/reject/review function exists | No | **Orphan ×9** |
| `isArchived` | — | Store has archive functions (useTUVStore.ts:221-267), **never called** | No | Functionally orphaned at UI layer |

### c. State × transition matrix

Type-level: `Open | Action Taken | Verified | Closed` + legacy `In Progress`. UI-exposed (:236-238): **only `Open`, `In Progress`, `Closed`** — `Action Taken`/`Verified` are entirely unreachable.

| Status | Forward | Reject/return | Reopen |
|---|---|---|---|
| Open | Free unguarded dropdown → In Progress/Closed (:229-240) | — | — |
| In Progress | Free dropdown → Closed (or back to Open) | — | — |
| Closed | Via (1) the plain dropdown, **zero gate**, or (2) **"Verify & Close"** button (:264-275) — the only evidence-gated forward-to-terminal control in any of the 11 modules, rendered only when `status!=='Closed' && formData.evidence` is truthy, auto-stamps `closed=today` | none | Manually re-selecting `Open` while editing — unguarded, no reason |

No role gate exists anywhere in `TUVTracker.tsx`. The store's `updateStatus(id,status,notes)` (useTUVStore.ts:186-206) is **never called** by the component (always `updateRecord`).

### d. 7-item score

| # | Item | Score | Justification |
|---|---|---|---|
| 1 | Ownership | **Partial** | `due` drives a real overdue badge in the list; `owner` is free text not a picker; overdue indicator absent from the edit/detail modal itself |
| 2 | Action plan | **Partial** | `evidence` is a valid substitution but a single free-text note with no owner/date structure, while `actionTaken`/`actionTakenDate` that would support exactly that are orphaned |
| 3 | State machine | **Partial** | "Verify & Close" is a genuine evidence-gated terminal transition but lacks role-gating/reason; no reject/reopen transitions exist; the plain dropdown allows ungated backward moves |
| 4 | No orphan fields | **Missing** | `actionTaken, actionTakenDate, verifiedBy, verifiedDate` + all 9 ApprovalMetadata fields never appear |
| 5 | Form validation | **Missing** | Zero `required`/validation attributes anywhere in the modal |
| 6 | Evidence/comments/export/audit trail | **Missing** | No `EvidencePanel`/`CommentThread`/export; only audit-log sub-item passes |
| 7 | List view | **Partial** | Free-text search and per-row overdue exist, but no status/owner/overdue filter, no sort |

**Overall: 3 Missing, 4 Partial — the least-bad score of all 11 modules, but still zero Pass items.**

### e. Ordered work list

1. Add role-gating (qa_manager/admin) and a required reason field to "Verify & Close" and the plain status dropdown.
2. Add reject/return and reopen-from-terminal functions to `useTUVStore.ts`; surface `{from,to,by,at,reason}`.
3. Wire `actionTaken`/`actionTakenDate`/`verifiedBy`/`verifiedDate` into the form.
4. Replace the single `evidence` textarea with a lightweight action-plan structure (action taken + owner + date, verification by + date).
5. Turn `owner` into a real person-picker sourced from `useAuthStore`.
6. Add required-field validation to the modal (num, desc, owner, due at minimum).
7. Wire `EvidencePanel`/`CommentThread`; add per-record print/export (net-new, no v12 precedent).
8. Add status/overdue filter and sort controls to the list.
9. **Confirm with the QMS owner** whether creating new TÜV recommendations should be allowed at all — v12 deliberately restricts this to the fixed seeded list of 7, while the rewrite's "+ Add Recommendation" button (TUVTracker.tsx:64-70) silently diverges from that.

---

## DML (Document Master List)

### a. v12 field extraction

**List/filter panel** — lines 320-334: search `dml-q`; level filter `dml-lv` (L1-L4); department filter `dml-dept` (14 options); status filter `dml-st` (All/Active/Under Review/Draft/Obsolete).

**Modal form** — lines 828-838: `dmlNo`, `dmlLv` (select L1-L4), `dmlTt`, `dmlDept` (select, 14 depts), `dmlCl` (ISO clause text), `dmlRv` (revision text), `dmlRd` "Revision Date", `dmlRet` (retention text), `dmlSt` (select, **only 4 values**), `dmlNt` (notes).

**Save logic** — lines 3175-3190: `saveDML()` builds `{id,no,tt,lv,dept,cl,rv,rd,ret,st,nt}`, `logAudit`.

**Backup JSON** (`dml`, 208 records): all 208 use only the 4-value `st` set and department values from the 14-department list.

### b. Current-app field mapping table

Type: `DMLRecord` (types/index.ts). Live UI: `src/components/documents/DMLManager.tsx` (routed `AppShell.tsx:259`). **`DMLView.tsx` is dead code** (hardcoded `mockDml`, never imported outside itself) — excluded from scoring.

| v12 field | new-app field | edited in form? | shown in detail? | gap |
|---|---|---|---|---|
| `no` | `no` | Yes, required — :364-372 | Yes — :202 | none |
| `tt` | `tt` | Yes, required — :374-382 | Yes — :197 | none |
| `lv` | `hierarchyLevel` | Yes, select L1-L4 — :384-396 | Yes — :199-201 | renamed only |
| `dept` | `dept` | Yes, but **free-text**, :425-431 | Yes — :224-226 | v12 used a 14-option select; regression, blocks Item 1's department-picker requirement |
| `cl` | `cl` | Yes, free text — :398-405 | Yes — :228-230 | none |
| `rv` | `rv` | Yes, free text — :407-414 | Yes — :203 | none |
| `rd` ("Revision Date") | `reviewDate` | Yes, date — :416-423 | Yes | semantic drift: conflates last-revision date with ISO 7.5 periodic-review-due date |
| `ret` | `ret` | Yes, free text — :434-441 | **No**, list only | Partial — editable but not in detail view |
| `st` | `status` | Yes, select, 5 values — :207-215 | Yes | v12 had 4 values; `DMLRecordStatus` type also still lists legacy `'Active'`/`'Under Review'` as dead/ambiguous aliases no seed record or form option produces |
| `nt` | `nt` | Yes, textarea — :444-451 | Not shown directly (only truncated title in list) | Partial, borderline orphan |
| — | `reviewedBy, reviewDate*, approvedBy, approvalDate, approvalComments, rejectedBy, rejectionDate, rejectionReason` (ApprovalMetadata) | **No** — only ever set by `reviseDocument()` (useDMLStore.ts:3229-3291), which is **never called** from `DMLManager.tsx` | **No** | **Orphan fields ×7** |
| `isArchived` | `isArchived` | Yes, Archive button — :217 | Yes, "(Archived)" suffix — :172 | none |

*`reviewDate` conflict: the same type field name is used both for the plain revision date and (nominally) as an ApprovalMetadata field — see note above.*

### c. State × transition matrix

Store: `useDMLStore.ts`. Live transitions: `DMLManager.tsx:250-317` (button-driven) plus a generic `<select>` (:207-215) that allows **jumping to any of the 5 statuses with no guardrails**.

| State | Forward | Reject/return | Reopen | Notes |
|---|---|---|---|---|
| Draft | "Submit for Review →" (:250-256) → `updateRecord` | n/a (initial) | n/a | No reason captured |
| UnderReview | "Approve →" (:260-265) | "← Reject" (:266-271) → Draft | n/a | Reject has **no reason/comment field** |
| Approved | "Publish →" (:274-281) | **None found** | n/a | Missing per Item 3 |
| Published | "Trigger Periodic Review" (→ UnderReview) / "Create New Revision" (:290-309, does **not** call `reviseDocument`; duplicates simplified logic inline, uses a home-grown regex instead of `computeNextRevision()`) | "Mark Obsolete" (:310-315) | n/a | Two competing "new revision" code paths exist |
| Obsolete (terminal) | none | none | **No reopen path exists anywhere** | Missing per Item 3 |

No transition captures a required reason or appends an on-record `{from,to,by,at,reason}` history entry — audit trail is a side-channel only. `StateTransitionBar` does not exist in the codebase (confirmed by repo-wide grep).

### d. 7-item score

| # | Item | Score | Justification |
|---|---|---|---|
| 1 | Ownership | **Missing** | No `raisedBy`/`assignedTo`/due-date-as-SLA concept; `dept` is free text despite `PTA_DEPARTMENTS` existing; no overdue badge anywhere |
| 2 | Action plan | **Missing** (substitution un-noted) | DML's closest equivalent (revision/review cycle) is not explicitly documented as a substitution anywhere in code |
| 3 | State machine | **Partial** | Draft→UnderReview→Approved→Published forward chain and one reject path exist, but Approved has no reject path, Obsolete is a dead end, no reason captured, no on-record history |
| 4 | No orphan fields | **Missing** | 7 ApprovalMetadata fields never editable/shown; `ret`/`nt` editable-only |
| 5 | Form validation | **Partial** | `no`, `tt`, `hierarchyLevel` are `required`; no ISO-7.5-specific field set enforced |
| 6 | Evidence/comments/export/audit trail | **Missing** | No `EvidencePanel`/`CommentThread`/print export in `documents/`; audit logging exists but with a `'dml'` vs `'DML'` entity-type casing inconsistency between store and component |
| 7 | List view | **Partial** | Search/level/status filter/archived toggle exist; no department filter, no assignee filter, no overdue filter, no sort |

### e. Ordered work list

1. Wire `reviseDocument()` (useDMLStore.ts:3229-3291) into "Create New Revision" in place of the duplicated inline logic; surface `reviewedBy`/`approvedBy`/approval fields as a real approval step.
2. Add a reject-from-Approved transition and an Obsolete→prior-state reopen transition (qa_manager/admin-gated), each requiring a reason appended to a `stateHistory` array.
3. Convert `dept` to a `<select>` sourced from `PTA_DEPARTMENTS`; add an owner/assignee picker (`useAuthStore`) plus a genuine due-date/SLA field with a real overdue badge.
4. Surface `ret` and `nt` in the detail view.
5. Fix the `'dml'`/`'DML'` entity-type casing inconsistency (data-hygiene, not a status/persist-key change — flagged for awareness, not sign-off).
6. Add department/overdue filters and due-date/status sort to the list panel.
7. Add `EvidencePanel`/`CommentThread` and a print/export control.
8. Delete or clearly mark `DMLView.tsx` as dead code (**stop and ask before deleting**).

---

## DCR (Document Change Request)

### a. v12 field extraction

**List panel** — lines 727-762: search `dcr-q`, year filter, status filter (3 values: Approved/Pending/Rejected). Stats bar: Total/Approved/Pending/Rejected.

**Modal form** — lines 840-868: `dcrRef`, `dcrDt`, `dcrDocNo`, `dcrRevNo`, `dcrDocTitle`, `dcrReqBy` (default "Manobala Rajendran"), `dcrReason`, `dcrSummary`, `dcrComments`, `dcrReviewedBy` (default "Manobala Rajendran"), `dcrApprovedBy` (default "General Manager"), `dcrSt` (select, only 3 values).

**Save logic** — lines 4150-4209, `saveDCR()` — **critical cross-module sync at lines 4188-4197**:
```
if(obj.st==="Approved"){ const dIdx=D.dml.findIndex(d=>d.no.trim()===obj.docNo.trim());
  if(dIdx>=0){ D.dml[dIdx].rv=obj.revNo; D.dml[dIdx].rd=obj.dt; D.dml[dIdx].st="Active"; } }
```
Approving a DCR auto-propagates revision number/date/Active status into the matching DML record by doc-number lookup.

**Backup JSON** (`dcr`, 8 records): **all** `st:"Approved"` in production data.

### b. Current-app field mapping table

Type: `DCRRecord`. Live UI: `src/components/documents/DCRWorkflow.tsx` (routed `AppShell.tsx:260`).

| v12 field | new-app field | edited in form? | shown in detail? | gap |
|---|---|---|---|---|
| `ref` | `dcrNo` | Auto-generated only (`generateDCRNo()`, useDCRStore.ts:28-30) | Yes — :146,72 | acceptable |
| `dt` | (n/a — uses `createdAt`) | not present | shown as "Created" — :157-159 | v12's explicit change-effective-date has no equivalent |
| `docNo` | `docNo` | Yes — :90-96 | Yes — :147 | none |
| `docTitle` | `title` | Yes — :98-105 | Yes — :147 | none |
| `reqBy` | `requestor` | **Not editable** — hardcoded literal `'Current User'`, :25 | Yes — :154 | Ownership Item 1 violation |
| — | `department` | Yes, free text — :107-113 | Yes — :154 | not a `PTA_DEPARTMENTS` picker |
| — | `changeDescription` | Yes — :116-123 | Yes — :165-167 | new-app-only, fine |
| `reason` | `reason` | Yes — :126-133 | Yes — :168-171 | none |
| `summary` | `summary` | **Not present in creation form** | **Not shown** | **Orphan** |
| `comments` | `comments` | **Not present** | **Not shown** | **Orphan** |
| `revNo` | `revNo` | **Not present** | **Not shown** | **Orphan** |
| dcrReviewedBy | `reviewedBy` | Only via `reviewDCR()` (useDCRStore.ts:99-125) — **never called** from `DCRWorkflow.tsx` | Not shown | **Orphan** |
| dcrApprovedBy | `approvedBy` | Only via `approveDCR()` (:127-153) — **also never called** | Not shown | **Orphan** |
| — | `rejectedBy, rejectionDate, rejectionReason` | `rejectDCR()` exists (:155-181) but the reject button calls `updateRecord(id,{status:'Rejected'})` directly (:183-185), bypassing it | Not shown | **Orphan ×3** |
| `dcrSt` | `status` | Yes, via "Advance Stage"/"Reject Request" (:178-186); create defaults to `'Draft'` | Yes — :73,149 | v12 had 3 values; new type has 7 |
| — | `docId` | Always `''` literal at creation (:25) | not shown | dead field |
| `isArchived` | `isArchived` | Yes, Archive button (:187-189) | Archived records simply disappear (:18) — no visible confirmation | Partial |

### c. State × transition matrix

Store: `useDCRStore.ts`. `advanceStatus()` (:30-36) walks a **hardcoded 5-state linear array** `['Draft','Pending Review','Pending QA Approval','Approved','Implemented']`, bypassing `reviewDCR`/`approveDCR`/`rejectDCR` entirely via generic `updateRecord`.

| State | Forward | Reject/return | Reopen | Notes |
|---|---|---|---|---|
| Draft | "Advance Stage" → Pending Review (:30-36,178-180) | n/a (initial) | n/a | No reason captured |
| Pending Review | "Advance Stage" → Pending QA Approval | "Reject Request" → jumps **straight to terminal `Rejected`**, not a return-to-previous (:182-186) | n/a | Doesn't match "return-to-previous" semantics |
| Pending QA Approval | "Advance Stage" → Approved | Same blanket jump to Rejected | n/a | Same issue |
| Approved | "Advance Stage" → Implemented | Same blanket jump to Rejected (rejecting an Approved DCR) | n/a | Approving via UI never calls `approveDCR()`, so approval fields never populate |
| Implemented (terminal) | none | button hidden (:177,182) | **No reopen path** | Missing |
| Rejected (terminal) | none | n/a | **No reopen path anywhere** | Missing |

`'Reviewed'` (the value `reviewDCR()` would set) is a dead status no UI path ever produces. **No DCR↔DML sync exists anywhere** — confirmed absent by full read of both files. **This is a direct, hard functional regression versus v12's `saveDCR()` lines 4188-4197.**

### d. 7-item score

| # | Item | Score (pre-rewrite) | Justification |
|---|---|---|---|
| 1 | Ownership | **Missing** | `requestor` hardcoded to `'Current User'`; `department` free text; `DCRRecord` has no due-date/SLA field at all |
| 2 | Action plan | **Missing** (un-noted substitution) | `changeDescription`/`reason` have no owner/date/evidence structure; no substitution note in code |
| 3 | State machine | **Missing** (Partial-to-Missing, resolved down: reject is a blanket jump not return-to-previous, no reopen from either terminal, no reason captured, richer store functions unreachable) | See matrix above |
| 4 | No orphan fields | **Missing** | `summary`, `comments`, `revNo` + 9 ApprovalMetadata fields all orphaned |
| 5 | Form validation | **Missing** | Only guard is a **silent no-op** (`if (!form.title) return;`, :24) — no inline message, no `required` attributes |
| 6 | Evidence/comments/export/audit trail | **Missing** | No `EvidencePanel`/`CommentThread`/export; richer `'review'`/`'approve'`/`'reject'` audit types never actually produced since the UI bypasses those functions |
| 7 | List view | **Missing** | No status/year/department/assignee/overdue filter, no sort, **no search box at all** — the weakest list view among DML/DCR/MRM |

**Overall (pre-rewrite): 7 of 7 items Missing — the worst score of all 11 modules.**

### e. Ordered work list

1. **Restore the DCR→DML sync** on approval (mirroring v12 `saveDCR()` lines 4188-4197) — the single highest-value fix, since it's a confirmed regression against the production app.
2. Rewire "Advance Stage"/"Reject Request" to call `reviewDCR`/`approveDCR`/`rejectDCR` (useDCRStore.ts:99-181) instead of generic `updateRecord`.
3. Replace the blanket "Reject → Rejected" jump with a genuine return-to-previous-state transition; add reopen paths from both terminal states (qa_manager/admin-gated); require + persist a reason on every transition.
4. Add `requestor` as a real picker (`useAuthStore().users`), replacing the hardcoded literal; convert `department` to a `PTA_DEPARTMENTS` select.
5. Add a due-date/SLA field and overdue badge.
6. Surface `summary`, `comments`, `revNo` in the form and detail view.
7. Replace the silent no-op validation with real required-field validation and inline error messaging.
8. Add status/department/assignee/overdue filters, sort, and a search box to the list panel.
9. Add evidence attachment, comment thread, and print/export.

### f. Status — Phase 3 (2026-09-08)

**✅ DONE — reference-pattern replication complete.** `DCRWorkflow.tsx` fully rewritten; `useDCRStore.ts`'s pre-existing `reviewDCR`/`approveDCR`/`rejectDCR`/`transitionStatus` (including the DCR→DML sync in `approveDCR`) are now the only paths the UI uses.

| # | Item | Score (post-rewrite) | Evidence |
|---|---|---|---|
| 1 | Ownership | **Pass** | `requestor`/`assignedTo` are `useAuthStore().users` pickers (with fallback option for out-of-list values); `department`/dept-assignment via `PTA_DEPARTMENTS` `DeptSelect`; `dueDate` field + `isOverdueDCR()` overdue badge on card and detail header |
| 2 | Action plan | **Pass** (documented substitution) | DCR's "action" is the change itself (`changeDescription`/`reason`) plus its approval trail, not a CAPA-style 3-stage plan — captured via the state machine + Review/Approval Trail card, consistent with v12 and the module's actual purpose |
| 3 | State machine | **Pass** | Canonical bar `Draft → Pending Review → Pending QA Approval → Approved`; dedicated hard-reject to out-of-band `Rejected` with its own reopen-to-Draft panel; generic bar's reject returns to the previous state; every transition requires reason text and is recorded in `stateHistory` (`{from,to,by,at,reason,kind}`); `Approved` is terminal via `onReopen`; Pending QA Approval → Approved is gated behind a dedicated "QA Approval Gate" panel restricted to `isMR` |
| 4 | No orphan fields | **Pass** | `summary`, `comments`, `revNo`, `dt`, `ref`, `reqBy`, `docTitle` surfaced in the form and/or the "Imported Record Data" detail card; all 9 `ApprovalMetadata` fields surfaced in the "Review / Approval Trail" card |
| 5 | Form validation | **Pass** | Native HTML5 `required` attributes on all mandatory fields (docNo, title, requestor, department, changeDescription, reason), blocking submit with inline browser messaging — matches the pattern established on NCR |
| 6 | Evidence/comments/export/audit trail | **Pass** | `EvidencePanel entityType="dcr"`, `CommentThread entityType="dcr"`, `window.print()` export button, and every transition already audit-logged via `useAuditStore` in the store layer |
| 7 | List view | **Pass** | Search box, status/department/assignee/overdue filters, sort by newest/oldest/due/dcrNo |

**Overall (post-rewrite): 7 of 7 items Pass.**

Verification evidence (2026-09-08):
- `npx tsc --noEmit` — clean, zero errors.
- `npm test -- --run` — **147 passed (147) across 12 test files**, including 14 new tests in `src/store/__tests__/useDCRStore.test.ts` covering every forward/reject/reopen transition and both branches (match/no-match) of the DCR→DML sync, plus the pre-existing `qms_smoke.test.tsx` DCR smoke test.
- `npm run build` — clean production build, no errors.
- Live browser verification against the running dev server: approved a seeded DCR (`docNo: 'PT/QSP/MR/05'`, `revNo: 'Rev 07'`) via the QA Approval Gate and confirmed the matching DML record ("Corrective Action") transitioned `UnderReview` → `Active` and `Rev 06` → `Rev 07` in the live UI, confirming the DCR→DML sync (item in Ordered work list #1) works end-to-end, not just at the unit-test level.

---

## MRM (Management Review Meeting)

### a. v12 field extraction

**Panels** — lines 356-393: MRM Schedule card; a **live-computed** "Mandatory Inputs — ISO Cl.9.3.2" card recalculated at render time from cross-module data; MRM Register table; a **separate** MRM Action Tracker table with its own status filter and "+ Add Action" button.

**MRM modal** — lines 995-1016: `mrmRef`, `mrmDt`, `mrmChr` (default "General Manager"), `mrmMr` (default "MANOBALA Rajendran"), `mrmAtt` (**free-text textarea**, unstructured), `mrmDec`, `mrmAR`/`mrmAC` (manually-entered counts), `mrmSt` (select, **only 3 values**: Planned/Completed/Minutes Issued), `mrmMin` (Minutes Ref/File Location).

**Separate Action modal:** `actRef`, `actMRM` (free-text link), `actDesc`, `actCl`, `actOwn`, `actDue`, `actSt` (Open/In Progress/Closed), `actEv` ("Closure Evidence").

**Backup JSON** (`mrm`, only 2 records): Record 1 has `st:"Closed"` — a value that **does not exist** in the modal's own dropdown, a v12-internal data/UI mismatch in production data itself. `actions` (5 records) linked via free-text `mrm:"MRM-2025-02"` join, not an id reference.

### b. Current-app field mapping table

Type: `MRMRecord`/`MRMActionItem`. Live UI: `src/components/mrm/MRMManager.tsx` (routed `AppShell.tsx:262`). **`MRMView.tsx` is dead code** (hardcoded `mockMrm`/`mockActions`) — excluded from scoring.

| v12 field | new-app field | edited in form? | shown in detail? | gap |
|---|---|---|---|---|
| `ref` | `meetingNo` | Yes — :487-494 | Yes — :218,187 | none |
| `dt` | `meetingDate` | Yes, required — :496-504 | Yes — :219,188 | none |
| `chr` | `chairperson` | Yes — :506-512 | Yes — :219 | none |
| — | `venue` | Yes — :514-520 | Yes — :219 | new-app-only, correctly wired |
| `mrmAtt` (free text) | `attendees: string[]` | Yes, comma-separated string split into array (:463,475) | Yes, joined — :220-223 | Not a real multi-select picker (same gap v12 had) |
| `mrmDec` | `decisions` | Yes — :308-314 | Conditional (accordion) — :299-316 | acceptable |
| `mrmAR`/`mrmAC` | *(no equivalent field)* | n/a | n/a | New app instead derives `openActionsCount` live from `actionItems` (:83) — **an improvement**, no gap |
| `mrmSt` | `status` | Yes, 7 values — :226-234 | Yes — StatusBadge | v12 had 3; see state-machine notes for a real inconsistency this creates |
| `mrmMin` (Minutes Ref/File) | *(no equivalent field)* | n/a | n/a | **New-app-only functional loss** versus v12 — nothing captures minutes-file location |
| — | `inputs: {8 booleans}` | Yes, 8 checkboxes — :270-286 | Yes | **Architecture regression**: v12's checklist was live-computed from real cross-module data; the new app's is a flat, manually-toggled checklist that can be checked true with zero actual verification. (The live-computation pattern *does* exist elsewhere in this same file — `openNCRCount`/`preRead` auto-flags, :82,85,138-150,246-258 — but is not connected to this checklist.) |
| actions (flat, top-level in v12) | `actionItems: MRMActionItem[]` nested per meeting | Yes — :326-337,340-384 | Yes | Architecturally more correct than v12's fragile free-text join, but `MRMActionItem.clause`/`.evidence` fields exist on the type and are **never editable or shown** in the action rows |
| `actEv` (Closure Evidence) | `evidence?` on `MRMActionItem` | **No** | **No** | **Orphan** — closest thing to an evidence mechanism in the module, unwired |
| — | `flaggedObjectiveMisses`, `flaggedSLABreaches` | Auto-populated (`generatePreReadPack`, :90-119) | Yes, red alert boxes — :246-258 | Not an orphan — a genuinely good, intentional design |
| — | `reviewedBy, reviewDate, reviewComments, approvedBy, approvalDate, approvalComments` | Populated via `reviewMinutes`/`approveMinutes` (useMRMStore.ts:133-187), which **are** wired to buttons (:394-409) | Yes — :418-423 | Correctly implemented, unlike DML/DCR's equivalent fields |
| — | `rejectedBy, rejectionDate, rejectionReason` | **No reject function exists**; `MRMStatus` has no `'Rejected'` value | n/a | Structurally unreachable |
| — | `agendaItems: string[]` | Yes, at creation only — :532-539 | **Not shown anywhere in the detail view** | **Orphan** after creation |

### c. State × transition matrix

Store: `useMRMStore.ts`. **Two competing UI controls** operate on the same field: a free-jump `<select>` over all 7 `MRMStatus` values (:226-234, no guardrails) and a separate, disciplined "Approval Workflow" panel (:392-427) recognizing only Draft/Reviewed/Approved.

| State | Forward | Reject/return | Reopen | Notes |
|---|---|---|---|---|
| Draft | "Submit for Review" → `reviewMinutes()` (:394-401, useMRMStore.ts:133-159) | n/a (initial) | n/a | Properly wired, captures reviewer name |
| Reviewed | "Approve Minutes" → `approveMinutes()` (:404-409) | "Return to Draft" (:410-415) — calls generic `updateStatus`, **not** a dedicated reject function; no reason captured despite the type having `rejectedBy`/`rejectionReason` | n/a | Partial |
| Approved | none via the Approval Workflow panel (:424-426 shows a static dead-end message) | none | n/a | Dead-ends |
| Scheduled/In Progress/Completed/Cancelled | **Only reachable via the free-jump `<select>`** (:231), with **zero relationship** to the Approval Workflow panel | none | none | A materially broken state machine — a user can jump Draft→"Completed" with one click, bypassing review/approval entirely |

No transition requires/captures a reason on-record; no state history array; no verification gate for "Completed"; no reject function or Rejected state exists for MRM at all; no reopen path from any of the 4 dropdown-only states or from Approved.

### d. 7-item score

| # | Item | Score | Justification |
|---|---|---|---|
| 1 | Ownership | **Missing** | `chairperson`/`attendees` are free text, not `useAuthStore` pickers; no top-level assignee/department/due-date/SLA field on `MRMRecord`; nested `MRMActionItem.dueDate` has no overdue badge anywhere |
| 2 | Action plan | **Partial** | `actionItems` is a correct, reasonably-wired substitution, but `clause`/`evidence` fields are orphaned and no substitution is explicitly documented |
| 3 | State machine | **Missing** | Two independent, non-communicating status-transition mechanisms on the same field; no reject-with-reason function for MRM at all; no state history; no reopen; no gate on Completed |
| 4 | No orphan fields | **Missing** | `agendaItems` (post-creation), `MRMActionItem.clause`/`.evidence`, `rejectedBy`/`rejectionDate`/`rejectionReason` all orphaned |
| 5 | Form validation | **Partial** | `meetingNo`/`meetingDate` are `required`; no ISO-9.3-specific enforcement (e.g. the 8-item checklist is never gated) |
| 6 | Evidence/comments/export/audit trail | **Missing** | No `EvidencePanel`/`CommentThread`/print export in `mrm/`; action-item audit calls use `entityType:'mrm'` instead of the more specific `'mrm_action'` already in the type union |
| 7 | List view | **Missing** | Only a Show/Hide Archived toggle; no search/status/chairperson/department/overdue filter/sort; **no standalone cross-meeting Action Tracker view** exists at all (v12 had one) — actions are only visible nested inside one selected meeting |

### e. Ordered work list

1. Unify the two competing status mechanisms: remove/restrict the free-jump `<select>`, route all changes through guarded functions, adding `rejectMinutes`/reopen functions and a `'Rejected'` `MRMStatus` value (**flag this type addition for sign-off** — an addition, not a change to an existing value, but confirm before touching the type).
2. Add `clause`/`evidence` inputs to each action-item row (closes Item 2 and Item 6 gaps together).
3. Reconnect the 8-item ISO 9.3.2 `inputs` checklist to real cross-module data using the live-computation pattern already present in this file (`generatePreReadPack`).
4. Surface `agendaItems` in the detail view; add a minutes-file/reference field to `MRMRecord` to close the v12 functional gap.
5. Add a standalone, filterable cross-meeting Action Tracker view (replacing what v12's separate table provided).
6. Add chairperson/attendees as real pickers (`useAuthStore().users`); add search/status/overdue filters and sort to the meeting list.
7. Fix action-item audit calls to use `'mrm_action'` instead of `'mrm'`.
8. Add evidence attachment, comment thread, print/export to the meeting detail view.
9. Delete or clearly mark `MRMView.tsx` as dead code (**stop and ask before deleting**).

---

## Strategic Objectives

### a. v12 field extraction

Tab: `data-tab="obj"` (line 267). **List/filter panel** (648-681): year filter, "Copy HOD Link"/"Export Excel"/"+ Add Objective" buttons, stats cards, department KPI grid.

**Edit modal `objOv`** (1018-1065): `objYr` select, `objDept` select (9 fixed options: IED/QAQC, Projects, OSD, IT, Facility, Procurement, Store, P&E, HR), `objRef`, `objObjId`, `objDesc`, `objKpi`, `objOwner` (free text), `objDeadline` (**free-text, not a date input**), `objPct` (0-100), `objStatus` select, **7 values**: In Progress, Ongoing, Completed, Not Started, Pending Submission, **Delayed, On Hold**, `objActual`, `objEvidence` (Yes/Partial/No select), `objRemarks`.

`saveObj()`/`delObj()` (3775-3796): builds full record, `logAudit`. **No approve/reject/review function exists in v12** — grep for `approveObj|rejectObj|reviewObj` = 0 hits; v12 itself has no formal state machine here, only a free dropdown plus an append-only audit log.

**Backup JSON** (`obj`): field names `id, yr, kpi, pct, ref, dept, desc, objId, owner, actual, status, remarks, deadline, evidence` match the modal 1:1.

### b. Current-app field mapping table

Type: `ObjectiveRecord` (types/index.ts:952-979). Form: `ObjectiveFormModal` in `ObjectivesDashboard.tsx` (~220-352). No separate read-only detail — clicking a row opens the edit modal.

| v12 field | new-app field | edited in form? | shown in list/detail? | gap |
|---|---|---|---|---|
| `objYr` | `yr` | Yes — :242-247 (text, required) | Yes — year filter :110-113 | v12 was a select, new app free text |
| `objDept` | `dept` | Yes — :252-257 (**plain text**, required) | Yes — tree grouping | Regression: 9-option picker replaced with free text |
| `objRef` | `ref` | Yes — :262-266 (default "NEW") | Not shown in tree card | Partial |
| — | `objId` | **No** | **No** | **Orphan** |
| `objDesc` | `desc` | Yes — :280-285 | Yes | OK |
| `objKpi` | `kpi` | Yes — :290-295 | Yes | OK |
| `objOwner` | `owner` | Yes — :271-275 (**free text, no picker**) | Yes | Ownership gap |
| `objDeadline` | `deadline` | Yes — :326-330 (native date input — improvement over v12) | Yes | OK, improved format |
| `objStatus` | `status` | Yes — :301-311, **only 5 of 7 options** | Yes — StatusBadge | **Regression**: "Delayed"/"On Hold" dropped; an imported v12 record with those statuses can't be re-saved through this form |
| `objPct` | `pct` | Yes — :314-321 | Yes — progress bar | OK |
| `objActual` | `actual` | **No** | **No** | **Orphan** |
| `objEvidence` | `evidence` | **No** | **No** | **Orphan** |
| `objRemarks` | `remarks` | Yes — :335-340 | Not shown in tree card | Partial |
| — | `parentId` | **No** (only set via seed data) | Used internally for tree nesting only, never labeled | Orphan (structural use only) |
| ApprovalMetadata (×9) | — | No | No | **Orphan ×9** — no review/approval UI exists at all |
| `isArchived` | — | No button despite store having `archiveRecord`/`toggleArchive`/`unarchiveRecord` | No | Store capability unused by UI |

**Substitution note (per SKILL.md):** Objectives has no NCR-style action-plan concept; the closest equivalent (`owner`+`deadline`) is scored under Item 2 below rather than marked N/A.

### c. State × transition matrix

`ObjectiveRecordStatus` = `'Not Started'|'In Progress'|'Achieved'|'Not Achieved'|'Completed'|'Ongoing'|'Pending Submission'` — the form only exposes 5 of these 7 (`'Achieved'`/`'Not Achieved'` reachable only programmatically/via seed data).

| State | Forward | Reject/return | Reopen | Citation |
|---|---|---|---|---|
| Not Started / In Progress / Ongoing / Completed / Achieved / Not Achieved / Pending Submission | Plain `updateStatus(id,status,remarks?)` — any state to any state, no adjacency rules | none | none (calling `updateStatus` backward is possible but not a guarded/audited "reopen" action) | useObjectivesStore.ts:15,853-880 |

`updateStatus` logs to `useAuditStore` with an optional `reason` passed through, so status changes are audit-captured — but there is no per-record `{from,to,by,at,reason}` history array, no enforced adjacency, no distinct forward/reject/reopen functions, no terminal-verification gate. **v12 has the same characteristic** (single free dropdown + audit log) — parity with v12, not a regression, but it does not meet the new Standard.

### d. 7-item score

| # | Item | Score | Justification |
|---|---|---|---|
| 1 | Ownership | **Partial** | `owner`/`dept` captured and shown but both free text, not pickers (`useAuthStore` unused here); `deadline` editable/shown but no overdue badge anywhere |
| 2 | Action plan (substituted: owner+deadline) | **Partial** | Substituted pair exists and is editable, satisfying the substitution in spirit, but `owner` is unvalidated free text with no evidence-attachment hook |
| 3 | State machine | **Missing** | Single generic setter, no forward/reject/reopen distinction, no adjacency rules, no per-record history, no terminal gate |
| 4 | No orphan fields | **Missing** | `objId`, `actual`, `evidence`, `parentId`, all 9 ApprovalMetadata fields, `isArchived` never surfaced |
| 5 | Form validation | **Partial** | `yr`/`dept` are `required`; status select missing 2 of 7 valid enum values; no numeric-range enforcement beyond native min/max on `pct` |
| 6 | Evidence/comments/export/audit trail | **Missing** | No evidence attachment (the `evidence` field is an unrendered text value, not a file); `CommentThread` exists generically but isn't wired in; no print/export (v12's "Export Excel"/"Copy HOD Link" both dropped); audit logging exists on status change only |
| 7 | List view | **Partial** | Only a year filter — **parity with v12** (which also only had a year filter), not a regression, but the Standard requires status/assignee/dept/overdue/sort, none of which exist in either app |

### e. Ordered work list

1. Add "Delayed"/"On Hold" as valid select options, aligning with the type's full enum.
2. Close orphan fields — add `objId`, `actual`, `evidence` to form/detail; wire `isArchived`/`archiveRecord` into an Archive button (or remove the dead store methods); surface `parentId` explicitly; add a minimal read-only Approval panel for the 9 ApprovalMetadata fields, or formally document that Objectives is out of scope for review/approval.
3. Replace free-text `owner`/`dept` with pickers (`useAuthStore.users`; a fixed department list).
4. Build and wire the shared `StateTransitionBar`: forward, reject/return, reopen-from-Completed, each requiring a reason and appending to a history array; gate "Completed"/"Achieved" behind qa_manager/admin verification.
5. Add overdue detection (`deadline < today && status not in {Completed, Achieved}`) with a badge.
6. Add list-view filters (status, dept, owner, overdue) and sort by deadline/status, alongside the existing year filter.
7. Extend `EvidencePanel`'s `entityType` union to include `'objective'`; wire in `CommentThread`; rebuild a print/export function.

---

## CSI (Customer Satisfaction Index)

### a. v12 field extraction

Tab: `data-tab="cs"` (line 268). Panel header: "FM-CSS-01 Rev 02 · ISO Cl.9.1.2 · PT/QSP/MKT/02 · 22 questions · 9 categories · Score 1–10 per question" (686, 3549-3551).

**List/filter panel** (692-723): search, year select, **rating filter** `cs-rating-f` (Excellent≥90%/Good≥85%/Satisfactory≥80%/Fair≥75%/Needs Improvement), "Export Excel", category-performance breakdown grid.

**Edit modal** (~1296-1327): Project Info (`csDt, csProjCode, csCl, csPo, csProj, csYr`), a dynamically built 9-category × 22-question 1-10 radio scale (`buildCSQuestions()`/`getCSScores()`, 3558-3583), `csSuggestions`, `csClientName`, `csClientDesig`.

`CS_QUESTIONS` (3546-3556) is confirmed structurally identical to `CSI_QUESTIONS` in `types/index.ts`. `saveCS()` (3511-3543): **score/rating/icon are always derived from the 22 answers, never manually typed**. `printSurvey()` (3585-3606) is a full per-record PDF export (all 22 Q&A, per-category averages, signature block) — **entirely absent from the current app**. No approve/reject/review function exists for CS in v12 either.

**Backup JSON** (`cs`): confirms both legacy shape (`cl,id,yr,obs,icon,proj,score,rating`) and rich 2026-record shape (`dt,po,scores{9 categories},projCode,clientName,clientDesig,suggestions`) — e.g. TASNEE record id 30.

### b. Current-app field mapping table

Type: `CSIRecord` (types/index.ts:592-700). Form: `CSIFormModal` in `CSIDashboard.tsx` (~226-332). Master-detail (list ~95-118, detail ~156-196).

| v12 field | new-app field | edited in form? | shown in list/detail? | gap |
|---|---|---|---|---|
| `csCl` | `cl` | Yes, required — :251-257 | Yes | OK |
| `csProj` | `proj` | Yes, required — :261-267 | Yes | OK |
| `csDt` | `dt` | Yes, required — :271-277 | Yes | OK |
| `csYr` | `yr` | Yes, required — :281-287 | Used as filter | OK |
| — | `score` | Yes, **manually typed 0-100, required** — :291-297 | Yes — :172 | **Inversion of v12 behavior**: v12 always derives score from 22 answers; new app requires typing a raw percentage |
| — | `scores: Record<string,number>` (22-question map) | **No** — the 22-radio UI is never rendered | **No** | **Orphan + functional regression** — the ISO-referenced survey instrument is gone from the UI even though the data model and seed data support it |
| — | `totalScore` | No | No | Orphan |
| — | `rating` | Computed automatically on submit — :234-241 | Yes — StatusBadge :176 | OK (derived, appropriately not directly editable) |
| — | `icon` | No | No | Orphan — v12's ★/✔/◑/▲/✘ dropped |
| `csSuggestions` | `suggestions` | Yes — :302-311 | Yes, conditional — :184-188 | OK |
| — | `obs` | Yes — :312-320 | Yes, conditional — :190-194 | OK |
| `csProjCode` | `projCode` | No | No | Orphan |
| `csPo` | `po` | No | No | Orphan |
| `csClientName` | `clientName` | No | No | Orphan |
| `csClientDesig` | `clientDesig` | No | No | Orphan |
| — | `evaluatorName` | No | No | Orphan |
| — | `comments` | No | No | Orphan |
| — | `status` (`CSIRecordStatus`) | No | No — confirmed absent from `CSIDashboard.tsx` via grep | Orphan |
| — | `projectName`, `surveyDate` | No | No | Orphan, likely new-app-only, never populated |
| `isArchived` | `isArchived` | Store's archive functions **are** wired (`handleArchive`, :164) | Yes — :109,66 | OK — the one module of the three (DML/DCR/MRM-adjacent audit) where archive is actually exposed |
| ApprovalMetadata (×9) | — | No | No | **Orphan ×9** |

### c. State × transition matrix

`CSIRecordStatus = 'open'|'closed'|'in_progress'`.

| State | Forward | Reject/return | Reopen | Citation |
|---|---|---|---|---|
| open/in_progress/closed | Plain `updateStatus(id,status)`, any-to-any | none | none — `status` is not even exposed anywhere in the form/detail UI, effectively unreachable from the UI | useCSIStore.ts:28,333-351 |

`updateStatus` logs `status_change` with no `reason` parameter. `archiveRecord`/`unarchiveRecord`/`toggleArchive` (366-412) are properly implemented with descriptive audit reasons and are the strongest transition-adjacent behavior in this module, but they're a binary archive flag, not the record's actual lifecycle status.

### d. 7-item score

| # | Item | Score | Justification |
|---|---|---|---|
| 1 | Ownership | **Missing** | No `raisedBy`/`assignedTo`/`assignedDept` concept exists at all; `evaluatorName` exists on the type but is never captured in the form; no due date/SLA/overdue — CSI is a point-in-time record with no ownership concept in either app |
| 2 | Action plan (substitution: none exists in either app for low-rating follow-up) | **Missing** | Neither v12 nor the rewrite has an owner/target-date follow-up mechanism tied to a low rating; noted explicitly per SKILL.md rather than marked N/A |
| 3 | State machine | **Missing** | `status` never rendered in the UI at all; the store setter is any-to-any with no reason/history/gate |
| 4 | No orphan fields | **Missing** | 13 fields orphaned: `scores, totalScore, icon, projCode, po, clientName, clientDesig, evaluatorName, comments, status, projectName, surveyDate` + 9 ApprovalMetadata fields |
| 5 | Form validation | **Partial** | Core fields `required`, but the ISO 9.1.2 22-question instrument is not captured at all — the form accepts a raw manually-typed percentage instead, the inverse of what the clause-driven instrument requires |
| 6 | Evidence/comments/export/audit trail | **Missing** | No evidence attachment; `CommentThread` exists generically but unwired; `printSurvey()` (v12, incl. signature block) was not carried over; audit trail covers archive/status_change but not regular field edits |
| 7 | List view | **Partial** | Year filter/search/archived toggle exist, but v12's rating filter (`cs-rating-f`) was dropped and no status/assignee/dept/overdue filter or sort exists — **behind v12's own list view**, not just behind the Standard |

### e. Ordered work list

1. **Restore the 22-question survey instrument** in the form — render `CSI_QUESTIONS` (already correct in `types/index.ts`) and call the already-implemented `calculateCSIScore()`, removing the manual percentage input. Highest-impact fix: restores ISO Cl.9.1.2 traceability and fixes Items 4 and 5 together.
2. Close remaining orphan fields — add `clientName`, `clientDesig`, `projCode`, `po` to the form/detail; either surface or formally deprecate `status`/`comments`/`evaluatorName`.
3. Rebuild a `printSurvey()`-equivalent export (per-category averages, overall score box, suggestions, signature block).
4. Wire in `CommentThread`.
5. Restore the rating filter (`cs-rating-f`) and extend search to `suggestions`/`obs` (v12 already searched these; the rewrite's search only checks `cl`/`proj`).
6. Formally document that Items 1/2/3 are out-of-scope-by-design for this record type (per SKILL.md's substitution guidance), rather than forcing a person-picker/state-machine onto a point-in-time survey — unless the QMS owner wants a genuinely new low-rating-follow-up sub-feature.

---

## Approved Vendors (Supplier / Subcontractor Evaluation, AVL)

### a. v12 field extraction

Tab "Supplier Evaluation" (line 265), subtitle "PT-QSP/PUR/01 Rev 08 · ISO 9001:2015 Cl.8.4 · A/B/C classification" (533).

**Modal form** (904-926): `supName`, `supScope` (textarea), `supContact`, `supEvalDt` (date), `supScore` (0-100), `supCls` (select: A "Approved/Low Risk", B "Conditional/Monitor", C "High Risk/Restricted" — drives the A/B/C badge), `supNextDue` (date), `supSt` (select: Approved/Conditional/Suspended), `supRemarks`.

`renSup()` (4322-4356): search across name+scope+contact; class filter; status filter; sort by name only; "Re-Eval Overdue" stat where `nextDue < TODAY`. Excel export via `expSup()`, no PDF. No corrective-action/action-plan sub-fields exist in v12 for suppliers — only free-text `remarks`.

**Backup JSON ground truth:** the backup has **no `suppliers` array at all** — key inventory is `cs, dcr, dml, mrm, ncr, obj, tuv, audits, evfile, actions` plus metadata keys. `D.suppliers` is lazily initialized to `[]` in the legacy code — the register exists in code but had **zero populated records** in this production backup, so there is no real-world field-population ground truth, only the live form code, to compare against.

### b. Current-app field mapping table

Type: `SupplierEvalRecord extends BaseEntity, ApprovalMetadata` (types/index.ts:912-922). Component: `SupplierDashboard.tsx`. Store: `useSupplierEvalStore.ts`.

| v12 field | new-app field | edited in form? | shown in detail? | gap |
|---|---|---|---|---|
| `name` | `name` | Yes, required — :190-197 | Yes — :83 | none |
| `scope` | *(none)* | — | — | **Classification's scope-of-supply field is entirely gone** — v12's most-searched field has no equivalent |
| `contact` | `contactPerson` | Yes, create-only — :210-217 | **No** | captured once, never shown/editable again |
| — | `email` | Yes, create-only — :219-227 | **No** | new-app-only, still write-only |
| `evalDt` | `lastEvalDate` | Yes, create-only — :230-238 | **No** | write-only after creation |
| `score` | `score` | No (hardcoded `0` on create, :165) | Yes, editable — :104 | fine, edit-only by design |
| `cls` (A/B/C) | *(none)* | — | — | **Classification entirely dropped** — no A/B/C field, no equivalent risk tiering anywhere |
| `nextDue` | `nextEvalDate` | Yes, create — :241-247 | Yes, editable — :108-111 | none |
| `st` | `status` | No at create (hardcoded `'Pending Evaluation'`, :165); editable via free select — :88-98 | Yes | select allows jumping to any status with no gating |
| `remarks` | `findings` | No (hardcoded `''` at create) | Yes, editable — :119 | fine |
| — | `category` | Yes, required, free text — :200-207 | Yes, read-only — :86 | not editable after creation |
| — | `approvedBy` | Written by `approveSupplier`/`rejectSupplier` (store :147-195) | Yes, "Status set by" — :144 | **Semantic bug**: `rejectSupplier` also writes the rejector's name into `approvedBy` (:179) instead of `rejectedBy` |
| — | `approvalDate` | Written by both approve/reject | Yes — :145 | same overload |
| — | `approvalComments` | Written by both | **No** | Orphan — write-only |
| — | `reviewedBy` | Never written | Read as a fallback `approvedBy \|\| reviewedBy` (:144) | dead field |
| — | `reviewDate` | Never written | Fallback (:145) | dead field |
| — | `reviewComments` | Never written | **No** | Orphan |
| — | `rejectedBy` | **Never written** (bug above) | **No** | Orphan |
| — | `rejectionDate` | Never written | **No** | Orphan |
| — | `rejectionReason` | Never written — reject button passes no reason (:135) | **No** | Orphan; violates "reason required" |
| — | `isArchived` | No archive control in this component at all (store has functions, :103-145, unused here) | **No** | Orphan |

**Orphan fields:** `approvalComments`, `reviewComments`, `rejectedBy`, `rejectionDate`, `rejectionReason`, `isArchived`.
**Write-once/invisible-after-creation:** `contactPerson`, `email`, `lastEvalDate`, `category`.

**Architecture note:** a second, entirely disconnected "supplier" implementation exists (`SupplierScorecard.tsx`/`ShareSupplierLink.tsx`/`SupplierPortalView.tsx`, REST-backed, own `Supplier` interface) — a material duplication risk, not scored here (see Cross-cutting findings).

### c. State × transition matrix

`SupplierStatus = 'Under Evaluation'|'Approved'|'Conditional'|'Rejected'|'Pending Evaluation'`.

| State | Forward | Reject/return | Reopen | Notes |
|---|---|---|---|---|
| Pending Evaluation (initial) | none dedicated — only the raw `<select>` (:88-98) via generic `updateRecord` | n/a | n/a | |
| Under Evaluation | `approveSupplier` (:147-170), gated in UI only when `status==='Under Evaluation'` (:126-140) | `rejectSupplier` (:172-195), same UI gate | — | Neither requires a reason from the caller |
| Approved / Conditional / Rejected | none dedicated | none dedicated | Any of these is reachable from any other via the unguarded `<select>` (:88-98), which bypasses `approveSupplier`/`rejectSupplier` entirely and logs only a generic `'update'` audit action (:77-83), not `'status_change'` | No verification/role gate on the terminal state; `approveSupplier` has no role check anywhere |

**Summary:** the store defines a real `updateStatus(id,status,reason?)` (:86-94) that logs a proper `status_change` entry, but `SupplierDashboard.tsx` never calls it — every status change via the detail-view `<select>` is logged generically, no `{from,to,by,at,reason}` history is appended, and any state can jump to any other with one click, defeating the approve/reject buttons entirely.

### d. 7-item score

| # | Item | Score | Justification |
|---|---|---|---|
| 1 | Ownership | **Missing** | No `raisedBy`/`assignedTo`/`assignedDept` at all; `contactPerson`/`email` are the vendor's own contact, not an internal owner; no overdue indicator anywhere (unlike v12's "Re-Eval Overdue" stat tile) |
| 2 | Action plan (substitute: corrective-action owner/date for Conditional/Rejected suppliers) | **Missing** | Only a single free-text `findings` field; no owner, target date, or evidence attachment for any follow-up |
| 3 | State machine | **Missing** | Forward/reject functions exist in the store but the UI's status `<select>` bypasses them entirely with no guard, no required reason, no history, no reopen path, no role gate |
| 4 | No orphan fields | **Missing** | 6 true orphans + 4 write-once/never-shown-again fields |
| 5 | Form validation | **Partial** | `name`/`category` are `required`; no ISO 8.4 clause-specific fields (selection/performance-monitoring criteria); no validation at all on edit-view fields |
| 6 | Evidence/comments/export/audit trail | **Partial** | Store methods call `useAuditStore.log(...)` on create/update/delete/approve/reject, but no `EvidencePanel`/`CommentThread`; no print/PDF export (v12 at least has Excel) |
| 7 | List view | **Missing** | No search, no status/class/category filter, no sort, no overdue filter — a straight `records.map()`; v12 had search + class filter + status filter + name sort |

**Overall: 5 Missing, 2 Partial — fails all 7 items to some degree; none reach Pass.**

### e. Ordered work list

1. Fix the state machine: route the status `<select>` through `updateStatus` (or dedicated `advanceEvaluation`/`returnToEvaluation`/`reopenEvaluation` functions) with a required reason and a `{from,to,by,at,reason}` history array; gate `approveSupplier` to qa_manager/admin; fix `rejectSupplier` to write `rejectedBy`/`rejectionDate`/`rejectionReason` instead of overloading the approval fields.
2. Add ownership fields (`assignedTo` picker, `assignedDept`) and compute/display an overdue badge when `nextEvalDate` has passed and status isn't terminal.
3. Restore the A/B/C classification field, and surface `contactPerson`/`email`/`lastEvalDate`/`category` in the detail view as editable fields, not just at creation.
4. Add a corrective-action substitute block (owner + target date + evidence) for Conditional/Rejected suppliers, using the shared `ActionPlanTable` once available.
5. Wire in `EvidencePanel`/`CommentThread`, and add a print/export action.
6. Add search, status filter, class filter, sort-by-due-date/status, and an overdue filter to the list.
7. Reconcile or explicitly deprecate the parallel API-backed `SupplierScorecard`/`SupplierPortalView` implementation.

---

## Calibration Register

### a. v12 field extraction

Tab "Calibration Register" (line 266), subtitle "ISO 9001:2015 Cl.7.1.5 · Monitoring & Measuring Resources" (564).

**Modal form** (928-953): `calibName`, `calibEqId`, `calibDept`, `calibFreq` (free text, e.g. "12 Months"), `calibLast` (date), `calibDue` (date), `calibAgency`, `calibCertNo`, `calibRemarks`.

**Computed status** — `calibStatus(due)` (4423-4430): `Overdue` if days-until-due `<0`, `Due Soon` if `<=30`, else `OK`. This is purely computed from `due`; **there is no persisted/manual status field in v12 at all** (no "Out of Service"/"Scrapped" concept exists in v12 — entirely new-app invention).

`renCalib()` (4431-4461): search across `eqName+eqId+dept+agency`; status filter; sort by `due` ascending; stats tiles. No action-plan concept exists in v12 for calibration — only free-text `remarks`.

**Backup JSON ground truth:** same file — **no `calib` array exists** in the backup either. `D.calib` is lazily initialized to `[]` — same conclusion as Suppliers: implemented in legacy code, zero populated records in this production backup.

### b. Current-app field mapping table

Type: `CalibRecord extends BaseEntity, ApprovalMetadata` (types/index.ts:936-950). Component: `CalibrationRegister.tsx`. Store: `useCalibStore.ts`.

| v12 field | new-app field | edited in form? | shown in detail? | gap |
|---|---|---|---|---|
| `eqName` | `equipNo`/`equipName` (split) | Yes, both required — :235-253 | Yes, editable — :125,129 | v12 conflated name/ID; new app's split is an improvement, not a gap |
| `eqId` | `serialNo` | Yes — :264-271 | Yes, editable — :153-154 | none |
| `dept` | `location` | Yes — :272-280 | Yes, editable — :160-162 | new app calls it "location" not "dept" — no department picker |
| `freq` | `freqMonths` (numeric) | Yes — :281-290 | Yes, editable — :175-176 | v12 was free text; new app's numeric field is a cleaner improvement |
| `last` | `lastCalibDate` | Yes — :291-298 | Yes, editable — :172 | none |
| `due` | `nextCalibDate` | Yes — :300-308 | Yes, editable, highlighted — :179-180 | none |
| `agency` | `calibrationAgency` | **No** — not in create modal | **No** — not in detail view | **True orphan**; confirmed unused anywhere else in `src/` |
| `certNo` | `certificateNo` | **No** — not in create modal | Yes, editable — :184-185 | write-only-after-creation gap |
| `remarks` | `notes` | **No** — not in create modal | Yes, editable — :191 | same pattern |
| — | `manufacturer` | Yes — :255-262 | Yes, editable — :157-158 | new-app-only, fully wired, fine |
| — | `status` | No at create (hardcoded `'Active'`, :206); editable via `<select>` (:139-147) offering only `Active`/`Out of Service`/`Scrapped` | Yes | Select never offers the canonical `Valid`/`Due`/`Overdue` values from the type |
| — | `calibratedBy` | **No** | **No** | **True orphan**; confirmed unused anywhere in `src/` |
| ApprovalMetadata (×9) | — | **No** | **No** | **All 9 are true orphans** — no approval workflow UI exists at all |
| `isArchived` | — | No archive control in this component (store has functions, unused here) | **No** | Orphan |

**Orphan fields:** `calibrationAgency`, `calibratedBy`, all 9 ApprovalMetadata fields, `isArchived` — **12 of 21 total type fields orphaned, the worst ratio of any module scored.**

### c. State × transition matrix

`CalibStatus = 'Valid'|'Due'|'Overdue'|'Out of Service'|'Active'|'Due Soon'|'Scrapped'`.

| State | Forward | Reject/return | Reopen | Notes |
|---|---|---|---|---|
| Active/Valid (default) | none dedicated | none | — | Status changed only via the free `<select>` → `updateRecord`, not the store's own `updateStatus` |
| Due/Due Soon/Overdue | none — purely computed client-side each render, never persisted | none | — | This computed value **duplicates and diverges from** the store's own `computeCalibStatus`/`isCalibOverdue`/`getCalibDaysRemaining` helpers, which are defined but **never imported or called anywhere in `src/`** — confirmed dead code by repo-wide grep |
| Out of Service | Via unguarded `<select>` | Via unguarded `<select>` | Via unguarded `<select>`, back to Active | No role gate, no reason, no history entry beyond a generic audit `'update'` log |
| Scrapped | Via unguarded `<select>` | n/a | Via unguarded `<select>`, back to Active | A "scrapped" instrument can be silently un-scrapped with one click, no verification-of-effectiveness step |

**Summary:** the store defines a correct `updateStatus(id,status,reason?)` (:115-130), but the component never calls it. There is no forward/reject/reopen distinction — every status is one unguarded dropdown click away from every other, and the dropdown's own options (`Active/Out of Service/Scrapped`) don't even match the canonical `CalibStatus` values (`Valid/Due/Overdue`).

### d. 7-item score

| # | Item | Score | Justification |
|---|---|---|---|
| 1 | Ownership | **Partial** | `nextCalibDate` functions as a de facto due date and an overdue indicator exists in list and stats tile, but there is no `raisedBy`/`assignedTo`/`assignedDept` on the type at all, and `calibratedBy`/`calibrationAgency` (the closest owner-equivalents) are orphaned |
| 2 | Action plan (substitute: out-of-tolerance follow-up/re-calibration owner+date) | **Missing** | No field or UI exists for recording an out-of-tolerance finding, its owner, or a re-calibration target date; `notes` is not even in the create form |
| 3 | State machine | **Missing** | No forward/reject/reopen distinction is used by the UI; correct store helpers are dead code; status options don't match the type's canonical values; no reason required; no history; no role gate |
| 4 | No orphan fields | **Missing** | 12 of 21 type fields never appear in the form or detail view |
| 5 | Form validation | **Partial** | `equipNo`/`equipName` are `required`; no other field validated; no ISO 7.1.5-specific capture (traceability to a measurement standard, calibration result, acceptance criteria) exists anywhere |
| 6 | Evidence/comments/export/audit trail | **Partial** | Store calls `useAuditStore.log(...)` on create/update/delete/archive, but no `EvidencePanel`/`CommentThread`; no print/PDF/Excel export button (v12 has Excel export, this module has none) |
| 7 | List view | **Missing** | Free-text search only — no status filter (despite v12 having one), no assignee/dept filter, no explicit overdue filter beyond stat tiles, no sort control |

**Overall: 4 Missing, 3 Partial — fails all 7 items; nothing reaches Pass.**

### e. Ordered work list

1. Fix the state machine: import and actually use the store's existing `computeCalibStatus`/`isCalibOverdue`/`updateStatus` instead of the component's divergent inline computation; align the `<select>` options to the canonical `CalibStatus` values; require a reason and append a `{from,to,by,at,reason}` history entry; gate "Out of Service"/"Scrapped" (and reopening from them) to qa_manager/admin.
2. Implement the out-of-tolerance/re-calibration follow-up substitute: owner + target date + evidence attachment when a check fails.
3. Wire `calibrationAgency` and `calibratedBy` into both the create form and the detail view.
4. Add ownership fields (`assignedTo`/`assignedDept` — e.g. instrument custodian) to `CalibRecord`.
5. Add status filter, sort-by-due-date, and an explicit overdue filter to the list; include Certificate No. and Notes in the create form instead of post-creation-only.
6. Wire in `EvidencePanel` (for calibration certificates) and `CommentThread`, plus a print/export action.
7. Either wire the 9 ApprovalMetadata fields into a real review/verification step (e.g. QA sign-off on a calibration certificate) or drop them from `CalibRecord` if calibration genuinely has no approval workflow — leaving them permanently orphaned is worse than removing them.

---

## Client Intake (Voice of Customer / VoC)

### a. v12 field extraction

**No v12 equivalent exists.** Confirmed three independent ways: (1) grep for `voice of customer|\bvoc\b|client intake|intakeType|emergency response|complaint intake` against the 5615-line v12 HTML returns **zero matches**; (2) the backup JSON's top-level array keys are only `cs, dml, dcr, ncr, obj, tuv, audits, evfile, actions, mrm` — no `voc` key; (3) v12's own canonical `REGISTER_LABELS` const (line 4629) — the definitive list of every register the app implements — is `{dml, mrm, actions, ncr, audits, tuv, cs, obj, dcr, tuvnc, suppliers, calib, users}`, with no VoC/intake entry.

The only tangential trace is a **paper-form reference** inside the DML register itself: `{id:80, no:"FM-CCR-28", tt:"Customer Complaint Record", ..., dept:"Marketing", cl:"9.1.2"}` (v12 line 1413) — a form number in the document register with no implemented UI, data array, or workflow behind it anywhere in v12.

**Conclusion:** Client Intake / VoC is a wholly new module in the rewrite with no legacy field/dropdown/workflow reference to extract; the field-mapping table below is "new-app only" for essentially every field.

### b. Current-app field mapping table

Type: `ClientIntakeRecord` (`src/store/useClientIntakeStore.ts`) — **does not extend `BaseEntity`/`ApprovalMetadata`**, unlike every other module's type. Form: inline "New intake" form in `UnifiedVoC.tsx` (~90-158, not a modal). List: same file (~161-233, flat, unfiltered).

| v12 field | new-app field | edited in form? | shown in list? | gap |
|---|---|---|---|---|
| none | `id` | Generated as `'clientintakestores-' + Date.now() + '-' + idCounter` (store line 114) | implicit | Inconsistent ID format vs. `generateRecordId()` used by other stores |
| none | `intakeType: 'Complaint'\|'Emergency'\|'Inquiry'` | Yes — :96-105 select | Yes, type icon — :174 | new-app only, OK |
| none | `receivedBy` | Yes, free text — :136-139 | Yes — :178 | new-app only; no picker |
| none | `routedToDept` | Yes, select from local `DEPTS` const — :106-115 | Yes — :178 | dept-only, not a person picker |
| none | `timeLogged`/`timeAcknowledged`/`timeMobilized` | Set automatically by workflow buttons (:46,49) | Used in KPI calc | OK — system-set, appropriate |
| none | `description` | Yes, textarea — :126-129 | Yes, conditional — :185 | OK |
| none | `title` | Yes, required — blocks submit **silently** (`if(!form.title)return;`, :39) | Yes — :176 | Silent no-op, not an inline message |
| none | `status: ClientIntakeRecordStatus` | Not directly form-edited; changed via workflow buttons | Yes — StatusBadge | OK for a workflow-driven field |
| — | *(no `ApprovalMetadata`, no `isArchived` — type doesn't extend those interfaces)* | n/a | n/a | Not orphans (the type doesn't declare them), but flagged: the only module of the 11 whose type doesn't extend `BaseEntity`/`ApprovalMetadata`; the store has **no `archiveRecord`/`unarchiveRecord`/`toggleArchive`/`setRecords`** at all |

No field is technically "orphaned" in the strict Item-4 sense — every declared field is either editable or shown — but the type itself is missing several fields the Standard's Item 1 requires: no distinct `assignedTo` separate from `receivedBy`, no due-date/SLA field stored per record (only ad hoc computed KPI averages across all records, hardcoded 240-minute thresholds in JSX, :56-77), no `raisedBy`/customer-identity field distinct from `title`/`description`.

### c. State × transition matrix

`ClientIntakeRecordStatus = 'Logged'|'Acknowledged'|'Mobilized'|'Closed'`.

| State | Forward | Reject/return | Reopen | Citation |
|---|---|---|---|---|
| Logged | "Acknowledge →" calls `updateRecord(...,{status:"Acknowledged"})` — **bypasses `updateStatus` entirely**, so not captured by the status-change audit path | none | n/a (initial) | UnifiedVoC.tsx:46 |
| Acknowledged | "Crew Mobilized →" (Emergency only) calls `updateRecord`, same bypass; non-Emergency goes straight to Closed | none | none | :49,220-224 |
| Mobilized | "Close" calls `updateStatus(r.id,"Closed")` — the **only** transition that goes through the store's audited path | none | none | :51, useClientIntakeStore.ts:31,150-166 |
| Closed | — | — | **None found — hard terminal dead-end**, confirmed via full read of both files | |

`updateStatus` (:150-166) is a plain setter with no `reason` parameter. Two of the three real workflow transitions bypass it via generic `updateRecord`. No adjacency-rule engine, no reason requirement, no history array, no reopen path, no terminal-verification gate.

### d. 7-item score

| # | Item | Score | Justification |
|---|---|---|---|
| 1 | Ownership | **Missing** | `receivedBy` is free text, not a picker; `routedToDept` is dept-only with no accompanying person `assignedTo`; no due-date/SLA field stored per record — only hardcoded 240-minute thresholds computed across all records; no overdue badge anywhere |
| 2 | Action plan (substitute: Acknowledge/Mobilize timestamps as a mini action trail) | **Partial** | `timeAcknowledged`/`timeMobilized` function as an implicit two-step trail with owner-by-department, but no named person-owner and no target date/SLA per step |
| 3 | State machine | **Missing** | Closed is a hard terminal dead-end with no reopen; 2 of 3 transitions bypass the store's own audited setter; no reason requirement; no history array; no verification gate |
| 4 | No orphan fields | **Pass** (narrowly) | Every declared field is either editable or shown — the only Pass score found across all 11 modules — though the type under-specifies the ownership/due-date fields the Standard expects to exist |
| 5 | Form validation | **Partial** | `title` blocks submission when empty but as a **silent no-op with no inline message**, which the Standard explicitly disqualifies; no other field validated |
| 6 | Evidence/comments/export/audit trail | **Missing** | No evidence attachment; no comment thread; no print/export; audit trail exists only for the one transition that calls `updateStatus` |
| 7 | List view | **Missing** | Flat, unfiltered, unsorted — no status/assignee/dept/overdue filter, no sort, **no free-text search at all** — the weakest list view of any module alongside DCR |

### e. Ordered work list

1. Fix the silent validation on `title` — replace the silent no-op with an inline required-field message; add validation to `intakeType`, `routedToDept`, `receivedBy`.
2. Route all workflow transitions through `updateStatus`, adding a `reason` parameter and using it on every transition (currently 2 of 3 bypass it via `updateRecord`).
3. Add a reopen path from Closed — currently a hard terminal dead-end; gate to qa_manager/admin, require a reason.
4. Add `assignedTo` (picker from `useAuthStore`) and a due-date/SLA field per record, replacing the current all-records-averaged 240-minute KPI thresholds with a per-record deadline and overdue badge.
5. Build the shared `StateTransitionBar` for the Logged→Acknowledged→Mobilized→Closed flow (preserving the Emergency vs. non-Emergency branching), with required-reason capture and a `{from,to,by,at,reason}` history array.
6. Add list-view filters and search — status, `intakeType`, `routedToDept`, `assignedTo` (once added), overdue toggle, sort, and free-text search.
7. Add evidence attachment (extend `EvidencePanel`'s `entityType` union), comment thread, and export/print.
8. Align store conventions with the other modules: extend `ClientIntakeRecord` to `BaseEntity`/`ApprovalMetadata`; add archive functions to the store; switch the `id` generator to the shared `generateRecordId()` helper — **first confirm nothing parses the current ID format** before changing it.

---

## Summary: modules ranked by number of Missing items

Scoring convention: each module's 7 items are counted as Missing / Partial / Pass exactly as scored above (a score explicitly written as "Partial-to-Missing" in working notes is counted as Missing, since the underlying justification described a functionally broken behavior in every case it occurred). Ranked worst (most Missing items) to least-bad. **No module reaches 0 Missing items; no module scores Pass overall.**

| Rank | Module | Missing | Partial | Pass | Note |
|---|---|---|---|---|---|
| 1 | **DCR (Document Change Request)** | 7 | 0 | 0 | Fails every item outright; also has a confirmed functional regression vs. v12 (no DCR→DML sync on approval) |
| 2 | **Internal Audits** | 6 | 1 | 0 | Weakest single-item spread; only a 2-of-4-value status dropdown drives the entire workflow |
| 3 | **NCR / CAPA** | 5 | 2 | 0 | Confirmed Kanban-vanishing bug on reject; this is the Phase 2 reference-module target regardless of rank |
| 3 | **MRM** | 5 | 2 | 0 | Two non-communicating status mechanisms on the same field |
| 3 | **CSI** | 5 | 2 | 0 | 22-question ISO survey instrument present in the type but entirely missing from the form (inverted vs. v12) |
| 3 | **Approved Vendors** | 5 | 2 | 0 | State machine fully bypassable via one unguarded dropdown; `approvedBy`/`rejectedBy` semantically conflated |
| 7 | **DML** | 4 | 3 | 0 | Best-implemented approval fields of the three document modules, but still unused by the UI |
| 7 | **Calibration** | 4 | 3 | 0 | Worst orphan-field ratio of any module (12 of 21 type fields) |
| 7 | **Client Intake / VoC** | 4 | 2 | 1 | No v12 precedent at all; the only module to score a (narrow) Pass on any item (Item 4) |
| 10 | **Strategic Objectives** | 3 | 4 | 0 | Weak state machine is largely parity with v12, not a regression |
| 10 | **TÜV Tracker** | 3 | 4 | 0 | Best overall spread — has the only genuinely evidence-gated terminal transition ("Verify & Close") found across all 11 modules |

**This ranking sets the Phase 3 replication order** (per the governing brief: "apply same standard in Phase 1 ranking order, one module per commit"), with the explicit exception that **NCR/CAPA is built first regardless of rank**, as the designated Phase 2 reference-module implementation.

---

*End of Phase 1 deliverable. Per the governing brief: do not proceed to Phase 2 (NCR/CAPA reference-module build) until the user replies "go".*
