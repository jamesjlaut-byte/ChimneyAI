# Component draft recovery — September 15, 2026

## Change

Guided inspection drafts now retain both the technician-selected status and field note in same-tab session storage. Version 1 note-only drafts remain readable. Version 2 accepts only existing finding statuses (or an unselected status); it cannot carry review-confirmation metadata. Saving a draft does not save an inspection finding or increase checklist completion.

The existing saved-finding revision check remains in place. A conflicting older draft is displayed separately, including its status, rather than applied over changed saved work. Returning both fields to their saved values clears the draft; reverting only the note does not discard a changed status. Storage failures remain visible to the technician.

## Verification

- `pnpm test`: 100 passing tests, including all supported status round-trips, invalid statuses, inspection/system scoping, status-only persistence, partial/full reversion, and storage failures. Existing version 1 compatibility and input-bound tests pass.
- `pnpm lint` and `pnpm build`: passed.
- Local production browser: fictional inspection created; selected Unable to inspect and entered a fictional note; checklist remained 0/10 until explicit Save; Save advanced to component 2 and 1/10; a subsequent reload recovered the saved inspection at component 2.
- Responsive browser viewport 390 × 844: content width 390, viewport width 390 (no horizontal overflow); Save worked; no captured console warnings/errors.
- Unsaved reload was blocked/cancelled by the browser automation's handling of the before-unload guard. Do not treat this run as end-to-end proof of unsaved reload recovery. Serialization/validation is covered by automated tests; physical-phone reload/background-eviction testing is still needed.

## Field acceptance test still needed

In a test inspection on real iPhone Safari, select a status, type a note, reload and choose to leave when warned. Reopen Guided inspection: both fields should recover with an unsaved-draft message, and the component must remain undocumented until Save. Repeat with only a status selected. Closing the tab or clearing browser data is not guaranteed recovery; this is not cloud synchronization or full offline durability.
