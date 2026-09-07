# QAtrial — Pre-Deployment Audit (Phase 1)

**Date:** 2026-09-07
**Build under test:** `main`, dev server `npm run dev` @ http://localhost:5174
**Mode:** standalone (`VITE_API_URL` unset) — the mode QC staff will run
**Method:** every sidebar page and every modal/detail panel opened and exercised in a live browser, cross-referenced against source. No application source file was modified during this phase.

---

## Scope note

The sidebar renders **17** navigation items, not 18. Items found, by group:

| Group | Items |
|---|---|
| Command Center | MR Dashboard, VOC |
| Quality Core | NCR/CAPA, Audit Records, TÜV Tracker |
| Document Control | DML Manager, DCR Workflow, Compliance Map |
| Management Review | MRM Manager, Objectives |
| Performance | PMS (CSI), Suppliers, Calibration Register |
| Administration | Users, Audit Trail, V12 Import, Settings |

Source: [`src/components/layout/Sidebar.tsx`](../src/components/layout/Sidebar.tsx). If an 18th page is expected, it is not wired into the sidebar.

---

## Findings

| # | Page | Class | What the user sees | Root cause (file:line) | Proposed fix | Severity |
|---|---|---|---|---|---|---|
| 1 | **All pages (systemic)** | 2, 8 | Sidebar shows "Plant-Tech MR / Management Representative", but every role-gated control in the app is invisible. There is no login screen and no way to become an admin. | `src/App.tsx:61-64` returns `<AppShell/>` directly in standalone, so `LoginPage` (`App.tsx:5,77`) never renders. `src/hooks/useAuth.ts:88,96,128,144,158` set `user` **only** from server calls (`/auth/me`, login, register). With no server, `useAuth().user` is permanently `null`, so `roleHasPermission(undefined, …)` is `false` at all 39 gated call sites across 29 components. | In standalone, seed `useAuth` from `useAuthStore` (or default to an `admin` identity) so role gates resolve. | **Blocker** |
| 2 | **Quality Core → NCR/CAPA** | 1, 2, 5 | Opening NCR-IED-FEB-2026-02 (status *Open*) shows all seven workflow stages in State History, but the only buttons are **Delete** and **Archive**. No way to start Investigation, and no message explaining why. The NCR can never be progressed or closed. | `src/components/ncr/NCRWorkflow.tsx:179` `isMR = user?.role === 'admin' \|\| 'qa_manager'` → always `false` (see #1). `:362` `{isMR && (…Workflow Actions…)}` has **no else branch**, so the whole section vanishes silently. | Fix #1; add an else branch stating the required role, matching the pattern already used at `NCRWorkflow.tsx:274` and `:330`. | **Blocker** |
| 3 | **Document Control → DML Manager** | 3 | Banner reads "⚠ 179 document(s) due for review" with entries like "Process Interaction Diagram — due 01-10-2017". Documents genuinely overdue are missing from the list. | `src/components/documents/DMLManager.tsx:70` `new Date(r.reviewDate)` on DD-MM-YYYY data. All 208 seeded `reviewDate` values are DD-MM-YYYY (`src/store/useDMLStore.ts:37+`): **27 parse to `Invalid Date`** (day > 12) and are silently dropped from the review-due filter; the other **181 parse to the wrong date**. | Parse with an explicit DD-MM-YYYY parser instead of `new Date(string)`. | **Major** |
| 4 | **Administration → Users** | 8, 1, 2 | The Team panel opens completely empty — no members, no invite form, only a close X. | `src/components/auth/WorkspaceManager.tsx:82` calls `apiFetch('/users/team')`, which fails in standalone. The catch at `:88-91` falls back to `user` from `useAuth()`, which is `null` (#1), so `members` stays `[]`. The invite form at `:213` is `{isAdmin && …}` with no else. | Fix #1; fall back to `useAuthStore` users in standalone, and add an else branch to the invite gate. | **Major** |
| 5 | **Quality Core → NCR/CAPA (+ New NCR)** | 6 | Clicking **Submit** on a completely blank form creates a blank NCR record. No validation message, no success confirmation. | `src/components/ncr/NCRWorkflow.tsx:419-450`: 7 inputs carry `required`, but there is **no `<form>` element** — the button is a plain `onClick` handler (`:448`). Verified in the live DOM: 7 `[required]` fields, 0 `<form>` elements. `onSubmit` at `:106-109` adds the record and closes with no feedback. | Wrap the modal fields in `<form onSubmit={…}>` so `required` fires; show a confirmation on success. | **Major** |
| 6 | **Management Review → Objectives (New Objective)** | 6 | Same as #5 — labels say "Year \*" and "Department \*" but a blank objective saves silently. | `src/components/objectives/ObjectivesDashboard.tsx:220-345`; save button at `:345` is a plain `onClick`, no `<form>` wrapper. | Same as #5. | **Major** |
| 7 | **Administration → Audit Trail (and 8 other screens)** | 3 | Literal untranslated keys render on screen: the search label reads `common.search` and the empty state reads `common.noData`. | 9 keys referenced in code are absent from `public/locales/en/common.json` (whose `common` object has only 13 keys) — 24 call sites total. Highest impact: `common.noData` ×8 (e.g. `src/components/audit/AuditTrailViewer.tsx:248`), `common.required` ×4, `common.search` ×3 (`AuditTrailViewer.tsx:211`), `common.loading` ×2, `common.close` ×2, `common.all` ×2. | Add the 9 missing keys to `public/locales/en/common.json`. | **Major** |
| 8 | **Administration → V12 Data Import** | 4, 6 | On the **HTML** legacy path: five preview rows (DCR, TÜV, Audits, Actions, Evidence) render blank, and **Import All** then reports green "Success" even when nothing was imported. | `src/components/admin/ImportV12.tsx:116-117` sets only 5 of the 11 preview keys, but the preview JSX at `:232-236` always renders `preview.dcr/tuv/audits/actions/evfile`. `handleImport` at `:158-175` reads `extractedData.dcrData.forEach(…)` on `undefined`; the TypeError is swallowed by the surrounding try/catch, and the row still reports success. | Initialise all 11 keys on the HTML branch and report per-entity counts (including zero) instead of a blanket success. | **Major** |
| 9 | **Sidebar (all pages)** | 3 | The app displays "Plant-Tech MR — Management Representative" even though nobody is logged in. This hides finding #1 from the user, who reasonably assumes they already hold the MR role. | `src/components/layout/Sidebar.tsx` identity fallback: `: { name: 'Plant-Tech MR', role: 'Management Representative' }`. `'Management Representative'` is not a valid role in **either** permission matrix, so it can never satisfy a gate. | Remove the fabricated fallback, or make it a real `admin` identity so the displayed role is honoured. | **Major** |
| 10 | **All pages (permissions)** | 2 | Two different role lists are in force, so which actions a role can perform depends on which file the component happens to import. | `src/lib/permissions.ts` defines 7 roles (admin, qa_manager, qa_engineer, auditor, reviewer, editor, viewer — **no** `department_spoc`), while `src/store/useAuthStore.ts` `ROLE_PERMISSIONS` defines 6 (**with** `department_spoc`, **without** editor/viewer). `NCRWorkflow.tsx:180` gates on `department_spoc`, which `permissions.ts` does not recognise. | Consolidate to one matrix. *(Changing any role's permission set requires your approval per the brief.)* | **Major** |
| 11 | **Command Center → MR Dashboard** | 1 | The landing page renders zero interactive controls — metrics only, nothing clickable, no drill-through to the records behind the numbers. | `src/components/dashboard/MRDashboard.tsx` — no action or navigation elements rendered. Confirmed live: 0 `<button>` elements in `<main>`. | Make the metric cards navigate to their source register. | Minor |
| 12 | **Administration → Settings** | 1 | The AI Providers tab shows "No AI provider configured. **Go to Settings to add one.**" — while the user is already in Settings. | Shared empty-state string reused outside its original context. | Point the message at the adjacent **Add Provider** button. | Minor |
| 13 | **Performance → Calibration Register** | 6 | Editing a record writes on every keystroke. There is no Save button and no "saved" indicator, so the user cannot tell whether the change took. | `src/components/compliance/CalibrationRegister.tsx:112-170` — every field calls `updateRecord(...)` directly in `onChange`. (Data *does* persist; only the feedback is missing.) | Add a saved-state indicator, or an explicit Save action. | Minor |
| 14 | **Sidebar** | — | 17 nav items present where 18 were expected. | `src/components/layout/Sidebar.tsx` nav definition. | Confirm which page is missing. | Minor |

---

## Verified clean

These were tested and did **not** reproduce the defect classes they were checked for:

- **Class 7 — persistence.** Verified empirically, not by inspection: edited a Calibration certificate number, confirmed `qatrial:useCalibStore` was written, performed a full page reload, and the value survived. An audit entry was written at the same time. All 32 stores in `src/store/` carry a correct `persist` name (`qatrial:*`). The test edit was reverted. **No data-loss defect found.**
- **Class 5 — workflow state machines**, on every workflow except NCR:
  - **DCR Workflow** — Advance Stage / Reject Request / Archive / Delete, all ungated.
  - **MRM Manager** — full status ladder (Draft → Scheduled → In Progress → Reviewed → Approved → Completed → Cancelled) plus an explicit notice, "Minutes must be marked as 'Draft' to begin approval workflow."
  - **TÜV Tracker** and **Audit Records** — editable modals with Open / In Progress / Closed status selects.
  - **VOC** — has an **Acknowledge →** progression.
- **Class 3 — invisible buttons.** The hypothesis that raw Tailwind classes render invisibly against the custom theme was tested and **disproven**: the `@theme` block in `src/index.css` *extends* the default Tailwind palette rather than replacing it. `bg-indigo-600` resolves to `oklch(0.511 0.262 276.966)` and `bg-green-600` to `oklch(0.627 0.194 149.214)` — both visible. The V12 **Scan File** button is present and rendered at 100×40 px.
- **Class 8 — server-mode crashes.** All 15 content pages render with zero console errors. Seed data is intact (NCR-IED-FEB-2026-02, 43 objectives, 15 CSI surveys, CSI average 83%). Only the Users panel (#4) actually depends on a live server.
- **Role gates that are correctly built.** `src/components/mrm/MRMManager.tsx:424` and `src/components/compliance/SupplierDashboard.tsx:148` both gate on record *status* rather than role and both carry explicit fallback branches. These are the pattern the NCR fix should follow.

---

## Correction to one of the two reported examples

> "Administration → V12 Data Import: after choosing a file, the user sees no Scan/Import button."

The Scan button is unconditional and visible (`ImportV12.tsx:217`), and the **JSON** import path works end to end: Scan → populated preview → green Import All. The failure is specific to the **HTML** legacy path — see finding #8. Worth confirming which file type was used, in case there is a third path not covered here.

---

## Blocker / Major summary

| Severity | Count | Findings |
|---|---|---|
| Blocker | 2 | #1, #2 |
| Major | 8 | #3, #4, #5, #6, #7, #8, #9, #10 |
| Minor | 4 | #11, #12, #13, #14 |

Findings #2 and #4 are downstream of #1. Fixing #1 resolves the invisibility; #2 and #4 still need their own missing-explanation branches so the app degrades legibly if the gate ever closes again.
