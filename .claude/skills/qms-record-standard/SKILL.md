---
name: qms-record-standard
description: Record Completeness Standard for QAtrial quality-record modules (NCR, Audits, TÜV, DML, DCR, MRM, Objectives, CSI, Vendors, Calibration, Client Intake). Use when auditing, scoring, or building out any quality-record module's forms, detail view, or state machine against the v12 legacy reference.
---

# QMS Record Completeness Standard

A "quality record module" is any screen backed by a Zustand store whose records represent an auditable QMS artifact (NCR, Audit, TÜV finding, DML entry, DCR, MRM minutes, Objective, CSI survey, Vendor evaluation, Calibration record, Client Intake / VoC item). This standard defines the minimum a module's UI must provide before it can be scored **Pass**. It exists because `Management_Representative_Dashboard_v12.html` (the app currently in daily use) already implements this depth for every module — the rewrite carries the data types but several screens don't expose them yet.

Score each module **Pass / Partial / Missing** against each of the 7 items below. A module scores Pass overall only if all 7 items are Pass.

## 1. Ownership
- `raisedBy` (or module equivalent) is captured and shown.
- `assignedTo` is a person picker sourced from `useAuthStore` users, not a free-text field.
- `assignedDept` is a department picker.
- A due date / SLA deadline field exists, is editable, and is shown.
- An overdue badge/indicator is visible in both list and detail view when the due date has passed and the record is still open.

## 2. Action plan
For any module whose record represents a nonconformance, finding, or corrective/improvement item:
- Containment / correction: what was done immediately, owner, date.
- Corrective action: root-cause-driven fix, owner, target date, completion date.
- Preventive action: systemic fix to prevent recurrence, owner, target date, completion date.
- Each action row supports an evidence attachment.
- Use the shared `ActionPlanTable` component (see Phase 2) rather than a bespoke table per module.

Modules without a natural "action plan" concept (e.g. Objectives, Calibration) substitute their own closest equivalent (e.g. Objectives: initiative/milestone owner + target date) — note the substitution explicitly in the gap register rather than marking the item N/A silently.

## 3. State machine
- Every state has an explicit **forward** transition to the next state.
- Every state (other than the initial state) has an explicit **reject / return-to-previous** transition.
- Every non-initial, non-terminal state has a **reopen** path from the terminal state back into it (or into the appropriate earlier state) once closed.
- Every transition requires a reason (free-text, required) and appends an entry to that record's state history: `{ from, to, by, at, reason }`.
- Reaching the terminal "Closed"-equivalent state requires an explicit verification-of-effectiveness step, gated to `qa_manager` or `admin`.
- Use the shared `StateTransitionBar` component (see Phase 2) rather than bespoke buttons per module.

## 4. No orphan fields
Every field defined on the record's TypeScript type (`src/types/index.ts`) is either:
- editable in the create/edit form, or
- shown read-only in the detail view.

A field that exists on the type but appears in neither the form nor the detail view is an **orphan field** and is a Missing-item finding, even if the rest of the module scores well.

## 5. Form validation
- Required fields are enforced with native or explicit validation that blocks submission and shows an inline message — not a silent no-op or a save-anyway.
- Where the record type is subject to a specific ISO 9001 clause (e.g. NCR under 10.2.2: nature of the nonconformity, actions taken, results of corrective action), the form captures the fields that clause requires, and the detail view can render them as a coherent record, not just a bag of loose fields.

## 6. Evidence, comments, export, audit trail
- File/evidence attachment is available on the record (via `useEvidenceStore` / `EvidencePanel`, the pattern already used by Tests and others).
- A comment/discussion thread is available on the record.
- Print/PDF export of the record exists.
- Every state change and every field edit that matters for audit purposes produces an entry in `useAuditStore`'s trail (or the module's own history), attributed to the acting user with a timestamp.

## 7. List view
The module's list/table view supports:
- Filter by status.
- Filter by assignee and by department.
- An overdue filter/indicator.
- Sort (at minimum by due date and by status).
- Free-text search.

## How to apply this standard

- **Auditing (gap register):** for each module, extract the v12 field/dropdown/status-flow reference from the legacy HTML/JSON, map it against the current type/form/detail/store, and score each of the 7 items. Cite file:line for every claim — this is documentation other engineers and the QMS owner will act on directly.
- **Building:** implement the standard using the two shared components introduced for NCR (`src/components/shared/StateTransitionBar.tsx` and `src/components/shared/ActionPlanTable.tsx`) so later modules reuse rather than reinvent them. Keep new type fields optional so existing persisted records (localStorage, `qatrial:*` keys) keep loading without a migration; if a shape change is genuinely unavoidable, stop and ask before writing a `persist` `migrate` function.
- **Never** change an existing status string value, a persist key/name, or a role's permission set as a side effect of closing a gap — those require explicit sign-off, independent of this standard.
