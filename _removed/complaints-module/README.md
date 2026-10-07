# Removed: the separate Complaints screen

Removed 2026-09-10, on the instruction "merge complaints into client intake".

## Why

Complaints and Client Intake logged the same thing twice. Client Intake had
eight real records, a response clock, department routing, an owner, evidence,
comments and a proper Logged -> Acknowledged -> Mobilized -> Closed path.
Complaints had none of that, held zero records, and its main field was
"product name" - written for a company that ships products, not one that sends
crews to a site.

## What moved across instead of being lost

Three things the Complaints screen had that Client Intake did not:

- severity (minor / major / critical)
- who raised it (client / internal staff / regulator / site)
- root cause

All three are now fields on a Client Intake record, asked for only when the
type is Complaint. They live in `ClientIntakeRecord` in `src/types/index.ts`.

The three trend charts moved too, into the "Trends" panel on Client Intake.
"By product" became "by department", which is the thing a supervisor here can
act on.

## What is in this folder

- `components-complaints/` - the old screen and its form
- `useComplaintStore.ts`   - the old store, which never held a record
- `MobileComplaintForm.tsx` - a mobile form nothing ever imported

Nothing in `src` refers to any of it. It is kept only because this project is
not under version control, so a deleted file cannot be got back.
