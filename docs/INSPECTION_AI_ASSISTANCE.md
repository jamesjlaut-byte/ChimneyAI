# Saved inspection assistance

In Pro → Guided inspection, **Ask AI what to check next** prepares an editable question from the first system's saved checklist. It does not call AI until the technician presses Send. Save component edits first; preparing is blocked during photo preparation or an active AI request.

Inline confirmation is required before replacing chat, active attachments, Source Desk, manual metadata, and source-manifest context. Saved cases, inspections, and vault bytes are untouched. Late vault results are invalidated to avoid importing evidence from the previous chat.

Included: saved inspection type/time, first system type and entered manufacturer/model, component statuses, shortened raw technician notes, linked photo-record counts, and deterministic recommended-photo gaps. Other systems are explicitly excluded. Unknown components remain undocumented, not defective. Inaccessible/not-applicable entries do not create recommended-photo gaps.

Excluded: customer/address/contact fields, technician identity, unsaved edits, AI suggestions, measurements, manual documents, source hashes, and photo bytes. Free-text notes may still contain private information; review the prepared question before sending. This is an explicit snapshot, not live synchronization. Prepare again after saving changes.

## Verification

- Pure-function tests cover first-system isolation, omitted private fields/AI suggestions, photo scoping, inaccessible areas, and escaped-note truncation within the chat request schema.
- Chat-boundary tests check idle/confirmation guards, resetting prior job context, vault invalidation, and no automatic send.
- Local production browser: inline Cancel preserved the old question; Confirm produced a 3,780-character brief containing the saved fictional note and excluding the customer address, focused the composer, and left the conversation empty (no automatic send). Unsaved component notes disabled preparation. The initial native popup stalled browser automation and was replaced with an inline confirmation.
- At 390 × 844, content and viewport widths were both 390; the confirmation controls fit visibly; no console warnings/errors were captured. This is responsive desktop-browser verification, not physical-iPhone acceptance.
- 104 automated tests, lint, and production build passed.
- A real backend request with a fictional Level 1 snapshot initially returned excessive detail and an unsupported mandatory-video-scan statement. This prompted a dedicated Pro planning instruction: at most three steps/220 words, preserve access limitations, and never infer mandatory scans or inspection-level escalation from missing entries.
- Repeatable model check: `CHIMNEYAI_EVAL_URL=https://chimneyai.verifysweep.com node scripts/check-inspection-assistance.mjs`. Requires Node with TypeScript stripping, makes one real API request, and prints the answer for human review. A successful HTTP response or word-count check alone does not prove technical accuracy.

## Technician acceptance check

Use a test inspection. Save a note/status, prepare the question, cancel once to confirm existing chat survives, then prepare and confirm. Inspect the question: no other job's history/files/manual context should remain. Attach relevant photos deliberately, then Send. Confirm the response identifies real saved gaps without treating unseen photos as analyzed evidence or declaring compliance. Repeat on a physical phone; this workflow has not yet passed physical-iPhone acceptance.
