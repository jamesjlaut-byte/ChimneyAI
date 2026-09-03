# ChimneyAI Inspection OS audit and build phases

Audit date: September 3, 2026  
Repository: standalone ChimneyAI  
Decision scope: preserve Homeowner AI, Pro AI, uploads/PDF extraction, source provenance, Source File Vault, manual controls, calculators, saved cases, cloud foundations, and safety prompts. This plan does not merge ChimneyAI with VerifySweep or add CRM, scheduling, invoicing, dispatch, or payments.

## Executive decision

`ProCase` should remain the backward-compatible technical research record. A new versioned `Inspection` aggregate should optionally reference a Pro Case and reuse its source fingerprints/manual record. Expanding `ProCase` into customer/property/report storage would make old browser/cloud records ambiguous, couple chat history to inspection lifecycle, and create a risky destructive migration. A separate aggregate avoids duplication by storing references (`pro_case_id`, source SHA-256 values) rather than copied file bytes.

Phase 1 is a data foundation, not a visual redesign. It should add strict types, normalization, safe browser persistence, legacy-link mapping, deterministic lifecycle rules, and an additive cloud migration. Guided screens, photo analysis, reports, signatures, workspaces, and advanced AI belong to later phases.

## A. Current architecture

- Next.js 15 App Router with React 19 and strict TypeScript.
- Static landing, `/homeowner`, `/pro`, and `/legal`; dynamic `/api/chat` and `/api/health`.
- One client chat shell composes Pro tools without a global state library.
- Browser-first persistence: localStorage for cases/drafts and IndexedDB for exact source bytes.
- Optional browser Supabase client for passwordless auth, private storage, cases, sources, and revision snapshots.
- Zod validates the server chat boundary; the OpenAI Responses API receives bounded messages and attachments.
- CSS is hand-authored and responsive; no component framework is present.

## B. Current Pro Case model

`ProCase` is a version-tolerant research record containing identity, a technical question, private notes, normalized source/manual metadata, a manual-metadata hash, up to 200 messages, up to 100 source fingerprints, timestamps, and optional cloud-sync metadata. It deliberately has no customer, property, technician, inspection status, components, findings, measurements, signatures, or report revisions.

Cases use localStorage key `chimneyai_pro_cases_v4`, keep the newest 100 records, normalize untrusted stored JSON, and export Markdown. Active Pro work uses a separate versioned local draft. Existing Pro Cases must not be silently reinterpreted as completed inspections.

## C. Current cloud model

- `pro_cases`, `pro_case_sources`, and `pro_case_revisions` are owner-scoped through Supabase RLS.
- Exact bytes use the private `pro-case-sources` bucket and case/owner-aware object policies.
- Sync verifies local SHA-256 and byte size before upload.
- Cloud import refuses to overwrite newer/conflicting browser work unless the user explicitly chooses replacement.
- Foundation limitations: no configured production Supabase project has been verified; no company/workspace roles; revisions list but do not diff; each sync adds a snapshot; no offline mutation queue.

## D. Current chat architecture

- Homeowner and Pro share the interaction shell but use distinct system prompts and routes.
- Requests retain the newest 40 valid messages, six active attachments, and bounded source metadata.
- Images are sent as data URLs; PDFs/text are locally extracted and sent as bounded text.
- Failed user requests and client-visible service errors are excluded from later model context.
- Abort handling prevents stale responses after clearing work.
- AI responses remain free text. They are visibly marked for technician review but cannot yet become structured, confirmed findings.

## E. Current source/manual architecture

- Source Desk records task, appliance identity, source type/status/title, and technician goal.
- Manual Finder uses a curated official-manufacturer registry rather than treating broad search results as proof.
- Manual Verification records exact model, document identity, revision/date, HTTPS URL, pages, and notes.
- Model mismatch and manufacturer-domain divergence are surfaced.
- A metadata SHA-256 is explicitly distinguished from the exact PDF fingerprint.
- Missing pieces: source-to-finding relationships, manual revision comparison, exact-manual retrieval, and Appliance Passport reuse.

## F. Current file vault

- Each prepared upload gets a SHA-256 fingerprint and provenance record.
- Exact bytes can be explicitly persisted in IndexedDB and reverified before reuse.
- Cloud upload/download verifies SHA-256 and byte size.
- Browser-site-data deletion can remove local bytes; fingerprint records can outlive them.
- Files are case-level, not inspection/photo/component/finding relationships. There is no quota visibility, background queue, annotation, or offline sync status.

## G. Current field tools

- Pro Source Desk, evidence-readiness strip, Manual Finder, Manual Verification, Source File Vault, calculators, saved cases, and cloud browser.
- Photo second-look and label scan are careful prompt shortcuts, not structured computer-vision workflows.
- Tools are individually useful but live in separate drawers and do not share a visible inspection hierarchy.

## H. Current calculators

- Rectangular opening and rectangular/round flue area ratio.
- Segmental-arch radius, arc length, and central angle.
- Hearth width/centered side-extension/depth geometry.
- Inputs, formulas, units, and non-compliance limitations are visible.
- Values are component-local transient state and cannot be saved to a case, finding, source, or report.

## I. Current report-language capability

The Pro prompt produces objective wording, separates observations from requirements and interpretation, and refuses unsupported safety/compliance language. The Source Desk can set a report-language task. Output remains chat text: the raw note is not preserved alongside a suggestion, there is no approve/reject/edit state, and no customer-facing report entity exists.

## J. Current photo capability

- JPG, PNG, WEBP, and GIF uploads up to 3 MB; SHA-256 provenance and optional exact-byte persistence.
- Multiple images can be sent for second look or label reading.
- No direct camera capture hint, video, categories, captions, annotations, component/finding links, confidence review, or previous/current comparison.
- AI never writes a photo conclusion directly into a final record because no final finding record exists yet.

## K. What is already excellent

- Explicit technician authority and refusal to issue AI safety clearances.
- Strong separation of field fact, calculation, source requirement, interpretation, and recommendation.
- Exact-file SHA-256 provenance with byte-level verification.
- Conservative exact-model/manual applicability controls.
- Browser-first fallback and conflict-aware cloud import.
- PDF.js implementation matches the installed package and preserves functional extraction.
- Bounded, validated request/storage boundaries and adversarial prompt protections.

## L. What is partial

- Case/draft persistence is reliable research continuity, not inspection continuity.
- Cloud sync is code-complete foundation without verified production configuration.
- Label/photo AI is useful free-text assistance without structured confidence/approval.
- Evidence readiness covers source identity, not inspection completeness.
- Manual Finder routes to official sources but does not identify/download the exact applicable document.
- Calculators are transparent but disconnected from durable work.

## M. What is placeholder or foundation only

- Company/workspace roles mentioned in UI copy.
- Cloud multi-device behavior until Supabase is configured and integration-tested.
- Revision history beyond snapshot listing.
- Appliance Passport, report workflow, customer signature, property history, voice, photo classification, and camera measurement.

## N. Missing for a real field inspection

- Customer, property, technician, and multi-system inspection identities.
- Explicit inspection/report lifecycle and immutable delivered revisions.
- System-specific components and guided/adaptive checklist.
- Structured raw observations, technician-confirmed findings, recommendations, photos, measurements, and sources.
- Deterministic QC/contradiction checks.
- Offline-safe inspection/photo mutation queue.
- Premium PDF, acknowledgement/signature, protected delivery, and history.

## O. Top 20 improvements

Scores: 10 is greatest impact/time saved/differentiation; effort 10 is hardest.

| # | Improvement | Impact | Time saved | Differentiation | Effort | Risk |
|---:|---|---:|---:|---:|---:|---|
| 1 | Versioned Inspection aggregate and lifecycle | 10 | 8 | 9 | 7 | Medium |
| 2 | Safe local inspection normalization/persistence | 10 | 8 | 7 | 6 | Medium |
| 3 | Customer/property/system identities with reuse | 9 | 9 | 7 | 6 | Medium |
| 4 | Structured findings with technician confirmation | 10 | 9 | 10 | 8 | High |
| 5 | System-specific guided component checklist | 10 | 10 | 9 | 8 | High |
| 6 | Photo records linked to components/findings | 10 | 9 | 9 | 8 | High |
| 7 | Deterministic missing-documentation QC | 10 | 9 | 9 | 7 | Medium |
| 8 | Raw-note to approved report-language pipeline | 9 | 10 | 9 | 7 | High |
| 9 | Persisted measurements/calculations with method | 9 | 8 | 8 | 6 | Medium |
| 10 | Appliance Passport and verified-manual reuse | 9 | 9 | 10 | 8 | High |
| 11 | Premium revisioned PDF report | 10 | 10 | 8 | 9 | High |
| 12 | Touch acknowledgement/signature | 8 | 8 | 7 | 7 | High |
| 13 | Offline photo/note queue and sync state | 10 | 9 | 9 | 10 | High |
| 14 | Structured photo second-look approval | 9 | 8 | 10 | 9 | High |
| 15 | Structured label OCR confirmation | 9 | 9 | 10 | 9 | High |
| 16 | Source/manual citations attached to findings | 9 | 7 | 10 | 7 | Medium |
| 17 | Property history and prior/current comparison | 9 | 8 | 10 | 9 | High |
| 18 | Voice-first observation capture | 8 | 10 | 8 | 8 | Medium |
| 19 | Company roles and technician profiles | 8 | 7 | 6 | 9 | High |
| 20 | Calibrated camera-assisted measurement research | 6 | 7 | 10 | 10 | High |

## Migration and compatibility plan

1. Preserve `chimneyai_pro_cases_v4`, active draft v1, current IndexedDB database, and existing Supabase tables unchanged.
2. Store inspections under a new versioned key and validate every read; invalid/unknown versions are ignored rather than coerced.
3. Link `Inspection.pro_case_id` optionally. Never convert a legacy case automatically because customer/property/system identity and inspection scope cannot be inferred reliably.
4. Reuse source bytes by SHA-256. Inspection evidence stores source references and relationship metadata, not duplicate blobs.
5. Allow a technician to explicitly link an old Pro Case to an inspection in a later UI phase.
6. Add cloud tables/migrations only; do not rename/drop existing case tables or policies.
7. Treat local/cloud timestamps as conflict signals, not proof of which content is correct.

## Eight build phases

### Phase 1 — Inspection data foundation

- Strict versioned entities for customer, property, technician reference, system/appliance, inspection, finding, measurement, photo/evidence relationship, and report lifecycle.
- Explicit enums for inspection/report states, technician confirmation, component status, measurement method/confidence, and source relationships.
- Normalization, caps, referential validation, deterministic lifecycle transitions, and browser persistence.
- Optional Pro Case link and SHA-256 evidence references.
- Additive Supabase schema with owner RLS and no destructive migration.
- Fictional model/storage/migration tests. No new guided UI yet.

### Phase 2 — Mobile guided inspection

Customer → property → system → inspection type → adaptive component runner, large field controls, visible offline/draft state, and minimal repeated entry.

### Phase 3 — Photo and findings workflow

Photo records, categories, captions, component linkage, raw notes, AI suggestion review, confirm/reject/edit/request-view actions, and finding/recommendation traceability.

### Phase 4 — Measurements and source integration

Persist calculator inputs/results/methods, source/manual citations, Appliance Passport manual link, contradiction checks, and deterministic QC foundations.

### Phase 5 — Report builder and signature

Confirmed-only report projection, premium PDF, acknowledgement/signature, immutable revisions after signature, download, and protected sharing/email architecture.

### Phase 6 — Property history and Appliance Passport

Prior inspections, photos, measurements, repairs, manuals, verified appliance identity, and explicit previous/current comparisons.

### Phase 7 — Company workspaces and technicians

Owner/admin/technician/office/read-only authorization enforced server-side, company branding, technician credentials, assignments, and audit history.

### Phase 8 — Advanced AI and camera features

Structured label OCR, chimney-specific photo classification/second look, voice commands, calibrated camera-assisted measurement experiments, and adversarial evaluations.

## Phase 1 acceptance gates

- Existing Pro Cases, active draft, chat, PDFs/images, Source File Vault, manuals, calculators, cloud case code, and Homeowner mode remain unchanged and pass regression tests.
- A fictional multi-system inspection round-trips through normalization and browser serialization without losing supported relationships.
- Corrupted, non-array, and structurally invalid browser inspection payloads recover to an empty safe collection rather than surfacing partial records.
- Invalid IDs, enums, cross-inspection relationships, excessive collections, fabricated confirmation, and unsafe lifecycle transitions are rejected or conservatively normalized.
- Inspection scope is restricted to Level 1, Level 2, limited scope, service documentation, or an explicit other state; legacy Level 1/2 labels normalize safely.
- A finding cannot become technician-confirmed through an AI field alone.
- Technician confirm/reject states retain reviewer identity and timestamp; incomplete review provenance is downgraded to an unconfirmed AI suggestion.
- Finding review and measurement verification provenance must match the technician assigned to the inspection; mismatched identities are not accepted as technician decisions.
- AI finding and photo-category confidence is restricted to low/moderate/high and remains absent when no suggestion exists.
- Signed or delivered records cannot be replaced without advancing the report revision, and incomplete signature/delivery states are conservatively downgraded.
- Completion cannot precede inspection start; completed and delivered states require a completion timestamp, and delivery cannot precede completion.
- Whole-collection browser saves enforce the same revision rules and cannot silently delete a signed or delivered inspection.
- Cloud persistence rejects deletion of signed or delivered inspections and requires a higher report revision before changing their aggregate.
- A measurement records unit, method, confidence, and technician verification independently.
- Verified measurements require a finite value, measurement type, unit, verifier identity, and verification timestamp; incomplete camera claims remain estimates.
- A photo/evidence relation references a valid source SHA-256 without copying bytes.
- Finding source fingerprints must resolve to inspection-wide evidence or evidence belonging to the same chimney system; unrelated-system fingerprints are removed.
- Existing cloud tables remain intact; new inspection tables are additive and owner-scoped.
- Inspection revision RLS verifies both the revision owner and ownership of its referenced parent inspection.
- A forward migration applies the same parent-ownership requirement to legacy Pro Case source and revision rows.
- Type check, tests, production build, Pro evals, mobile/desktop smoke checks, saved-case recovery, file-vault recovery, and unconfigured-cloud fallback pass.
