# ChimneyAI product audit and phased improvement plan

Audit date: September 3, 2026  
Scope: the existing standalone ChimneyAI repository and deployed Homeowner/Pro routes. This plan does not merge ChimneyAI with VerifySweep or FlueFire and does not add CRM, scheduling, invoicing, dispatch, or payments.

## Executive finding

ChimneyAI is a functioning, safety-conscious chimney technical research workspace. Its strongest differentiators today are source discipline, exact-file provenance, manual verification, chimney-specific prompts, and conservative calculations. It is not yet an end-to-end field inspection and customer-report product. The safest path is to preserve the current research workspace, first eliminate field data-loss and mobile-friction risks, then introduce a structured inspection record alongside chat.

## A. Current features

- Branded landing page with distinct `/homeowner` and `/pro` experiences.
- Homeowner and professional system prompts with explicit no-clearance, no-fabrication, source, and onsite-verification guardrails.
- OpenAI Responses API chat with validated request sizes, roles, attachment types, and rate limiting.
- JPG, PNG, WEBP, GIF, PDF, TXT, Markdown, and CSV preparation in the browser.
- Local PDF text extraction with page markers, truncation disclosure, SHA-256 hashing, and PDF.js worker cleanup.
- Pro Source Desk for task, manufacturer, model, serial, listing mark, fuel/appliance, source type, and source status.
- Official Manual Finder backed by a small curated manufacturer registry.
- Manual Verification Record with model-conflict detection, source URL review, page references, revision data, and a metadata identity hash.
- Source File Manifest and IndexedDB Source File Vault with exact-byte SHA-256 verification.
- Opening/flue area ratio, segmental-arch geometry, and hearth geometry helpers with non-compliance disclaimers.
- Browser-local saved Pro research cases and Markdown export.
- Optional Supabase passwordless sign-in, case sync/retrieval, revisions, RLS schema, and private source-file storage code.
- Legal/privacy/AI disclaimer, production metadata, sitemap, manifest, security headers, and health endpoint.
- Seventeen automated safety/data-integrity checks and a separate Pro answer evaluation suite.

## B. Broken or incomplete features

- Live AI answers are unavailable while the configured OpenAI account lacks quota/credits. The UI preserves the request and explains the service condition.
- Supabase is optional but not configured or live-tested; cloud sign-in, sync, retrieval, and storage are code-complete foundations rather than verified production features.
- Active chat/source/manual state is not automatically recovered after refresh, browser termination, or an accidental navigation. Only an explicitly saved case survives.
- The label-scan action is a prompt shortcut over an uploaded image. It does not yet produce structured OCR fields, confidence, or confirm/reject/edit controls.
- Manual lookup routes users to curated manufacturer pages; it does not retrieve an exact manual automatically or verify model/revision applicability.
- Calculations are standalone UI state. Inputs, method, and result are not stored in a case or attached to a finding/report.
- Markdown case export is a technical research record, not a customer-ready inspection PDF.
- Cloud revisions can be listed but not visually diffed or merged.

## C. UX problems

- Pro is still chat-first plus a stack of drawers, rather than a guided inspection sequence.
- Source Desk, manual verification, source vault, calculators, saved cases, and cloud controls are separate forms. Context does not flow through a visible inspection hierarchy.
- All Pro drawers start closed, so first-time users must discover the workspace and decide what to open.
- Appliance type is free text, so the interface cannot hide irrelevant questions or load system-specific checklists.
- Findings are unstructured conversation text; there is no System → Component → Observation → Evidence → Status → Recommendation relationship.
- Photo attachments form a flat tray. They cannot be categorized, captioned, linked to an observation, compared before/after, or reviewed as AI suggestions.
- The technician manually triggers case saves; there is no persistent “draft saved” feedback.
- Calculators require re-entry and do not feed their verified inputs/results into the active inspection context.
- The Manual Finder, Manual Verification Record, and Source Vault are logically related but require multiple expansions and repeated identity review.
- AI report language is returned in chat rather than staged as an editable suggestion awaiting technician approval.

## D. Missing core features

- Structured inspection record, inspection type/level, appliance/system selection, adaptive checklist, and component findings.
- Customer/property/inspection identity fields and safe reuse of entered context within the inspection.
- Photo categories, observation linkage, captions, annotations, measurement method, and technician confirmation.
- Finding status/recommendation workflow, quality-control review, and missing-documentation checks.
- Draft autosave/recovery and offline sync queue.
- Customer-ready PDF report, acknowledgement/signatures, and controlled share/email workflow.
- Company/report branding and technician profiles.
- Property history and previous/current comparison.
- Structured OCR review for labels and exact-manual retrieval.
- Voice capture/transcription integrated with observations.

## E. Data-model problems

- `ProCase` models a research case, not an inspection. It has no customer, property, inspection date/type/level, system list, component findings, recommendations, signatures, or report snapshot.
- Messages and source records are durable, but calculator values and results are transient.
- Photos are represented as generic chat attachments/source files; category, caption, annotation, observation association, and AI-review state are absent.
- Source status and integrity are strong, but technician confirmation state for AI-generated findings/report language is absent.
- `fuel_type` doubles as appliance type and is unconstrained free text.
- Browser cases are capped at 100 without search/archive/export-all or storage-size visibility.
- Cloud tables mirror the research-case shape and will need additive versioned inspection fields rather than destructive replacement.

## F. AI opportunities

- Convert short notes into clearly labeled draft report language with concise/standard/detailed tone, requiring technician approval.
- Suggest the next checklist item and missing photos from current structured inspection context.
- Classify a photo into chimney-specific categories with confidence and technician confirm/reject/edit controls.
- Extract label fields into a review form without silently committing manufacturer/model/listing data.
- Generate a final missing-documentation review from deterministic checklist rules plus optional AI assistance.
- Summarize confirmed findings only; exclude rejected/unreviewed AI suggestions from customer output.
- Recommend which measurement inputs are still needed without estimating unavailable dimensions.
- Retrieve/cite an exact manufacturer manual only after confirmed model identity and source verification.

## G. Mobile problems

Verified at 390 × 844 and 1440 × 1000 against production:

- No horizontal overflow and no browser console warnings were observed.
- The approved primary logo is centered and 340 px wide on a 390 px phone; it consumes 340 px of vertical space, placing the chat near 700 px down the page.
- Navigation links are about 31 px high; Send is about 36 px; several drawer/action buttons are 32–41 px. These are smaller than a comfortable 44 px field-use target.
- The composer does not include bottom safe-area padding for gesture-navigation devices.
- Dense Source/Manual forms correctly collapse to one column, but still demand substantial typing.
- The current attach flow uses a generic file picker and does not expose a direct camera-capture affordance.
- There is no visible offline/draft state at the top of the active workspace.

## H. Report-generation problems

- No structured report schema exists, so a defensible PDF cannot be generated reliably from current conversation text.
- No distinction exists between AI-suggested, technician-confirmed, rejected, and customer-visible findings.
- No deterministic mapping connects component findings, photos, measurements, recommendations, limitations, and signatures.
- No pagination/photo sizing rules, immutable generated-report snapshot, or report revision history exists.
- No company profile, technician profile, customer acknowledgement, or signature storage exists.
- Current Markdown export is useful for research traceability but is not intended as a customer inspection report.

## I. Top 10 ranked improvements

| Rank | Improvement | Why it matters | Technician benefit | Customer benefit | Difficulty | Dependencies | Likely files/components |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Recoverable active Pro draft | Refresh/navigation can lose unsaved field work | Prevents re-entry and lost evidence | More complete records | Medium | Versioned local draft schema | `ChimneyChat`, new draft helper, tests |
| 2 | Mobile field controls and safe area | Several primary controls are under 44 px | Easier use with gloves/one hand | Faster onsite completion | Low | CSS only | `globals.css` |
| 3 | Structured inspection foundation | Chat cannot represent an inspection defensibly | One source of truth for the job | Clear, consistent report data | High | Additive versioned types/storage | New inspection model/components |
| 4 | Adaptive system/level checklist | Free text creates irrelevant and missed questions | Fewer clicks; fewer omissions | More consistent inspection coverage | High | Structured inspection foundation | Checklist definitions/runner |
| 5 | Structured findings and AI approval | AI text is not a technician finding | Fast note-to-report workflow with control | Clear accountability | High | Finding schema, AI endpoint contract | Findings editor, API, prompts |
| 6 | Smart photo records | Flat uploads disconnect evidence from observations | Faster documentation and retrieval | Understandable photo-backed findings | High | Finding schema, local blob storage | Attachment/photo manager |
| 7 | Deterministic completion review | Missing evidence is currently manual to notice | Prevents forgotten photos/answers | More complete report | Medium | Checklist/findings/photo schema | QC rules and review panel |
| 8 | Persisted calculations | Calculator work disappears and cannot support reports | No duplicate measurement entry | Transparent math/method | Medium | Inspection measurement schema | Calculator components/model |
| 9 | Customer PDF report and signatures | No deliverable inspection report exists | Finish before leaving property | Premium understandable report | High | Confirmed findings, profile, report schema | Report renderer/signature UI |
| 10 | Reviewed label OCR/manual retrieval | Current workflow still requires manual transfer/search | Faster exact appliance identification | Better source-controlled recommendations | High | Vision/OCR, confidence, retrieval index | Label review/manual services |

## Phased implementation plan

### Phase 1 — Must fix now

1. **Active Pro draft autosave and recovery.** Why: unsaved work can be lost. Technician: resumes after refresh or poor-signal interruption. Customer: less missing documentation. Difficulty: medium. Dependencies: browser storage and schema version. Files: `ChimneyChat.tsx`, `lib/pro-draft.ts`, tests.
2. **Mobile touch targets and safe-area composer spacing.** Why: primary controls are too small for phone field use. Technician: more reliable one-handed/gloved operation. Customer: faster inspection. Difficulty: low. Dependencies: none. Files: `app/globals.css`.
3. **Explicit draft state and recovery controls.** Why: silent persistence is confusing and can restore unwanted data. Technician: knows when work is protected and can discard it. Customer: clearer record continuity. Difficulty: medium. Dependencies: item 1. Files: `ChimneyChat.tsx`, CSS.
4. **Keep build, safety, upload, and source-provenance gates green.** Why: the existing technical workspace is the foundation. Technician: no regression to PDFs/manuals/cases. Customer: trustworthy evidence handling. Difficulty: ongoing. Dependencies: tests/build/browser verification. Files: tests and affected components only.

### Phase 2 — Inspection workflow

1. **Additive inspection record and step shell.** Why: establishes Customer/Property/System/Inspection without deleting research cases. Technician: avoids repeated entry. Customer: coherent job record. Difficulty: high. Dependencies: versioned schema/migration and privacy decisions. Files: new `lib/inspections.ts`, inspection components, additive Supabase migration.
2. **System-specific checklist definitions.** Why: masonry, factory-built, solid-fuel, pellet, and gas systems require different prompts. Technician: sees relevant items only. Customer: fewer missed components. Difficulty: high. Dependencies: inspection record, domain review. Files: checklist registry/runner.
3. **Structured findings/recommendations.** Why: conversation text cannot power a report. Technician: component-based documentation. Customer: readable findings. Difficulty: high. Dependencies: inspection/checklist schemas. Files: findings model/editor/template library.
4. **Photo categories and finding association.** Why: evidence must stay with the observation. Technician: faster review. Customer: understandable proof. Difficulty: high. Dependencies: finding schema/blob storage. Files: photo manager, source provenance extension.
5. **Deterministic missing-documentation review.** Why: quality control should not depend on AI availability. Technician: catches omissions. Customer: complete report. Difficulty: medium. Dependencies: checklist/photo/findings state. Files: QC rule engine/panel.

### Phase 3 — AI intelligence

1. **Technician-approved report-language suggestions.** Why: reduces writing while preserving responsibility. Technician: faster professional language. Customer: clearer explanations. Difficulty: medium. Dependencies: structured findings and approval state. Files: AI route/schema/prompts/findings editor.
2. **Context-aware “what next?” assistant.** Why: removes repeated job explanation. Technician: guided progress. Customer: consistent coverage. Difficulty: high. Dependencies: current inspection context serialization. Files: assistant context builder/prompts.
3. **Photo classification and potential-condition review.** Why: chimney-specific visual organization is a major differentiator. Technician: fewer sorting clicks. Customer: better organized evidence. Difficulty: high. Dependencies: image model/evaluation set/confidence UI. Files: vision endpoint/photo review.
4. **Label OCR confirmation workflow.** Why: speeds exact appliance identity without guessing. Technician: fast data entry. Customer: better manual applicability. Difficulty: high. Dependencies: OCR/vision and confidence thresholds. Files: label extraction schema/review UI.
5. **AI-assisted QC after deterministic rules.** Why: can identify contextual gaps rules miss. Technician: second review. Customer: better completeness. Difficulty: medium. Dependencies: structured inspection and confirmed-only boundaries. Files: QC prompt/API/panel.

### Phase 4 — Advanced tools

1. **Persisted measurement/calculation records.** Why: calculations need provenance. Technician: reuse in findings/reports. Customer: transparent results. Difficulty: medium. Dependencies: inspection schema. Files: calculator model/components.
2. **Arch opening area and richer flue inputs.** Why: current arch helper does not calculate opening area or connect to flue ratio. Technician: less manual math. Customer: clearer documentation. Difficulty: medium. Dependencies: validated formulas/domain review. Files: calculator library/UI/tests.
3. **Photo annotations and before/after sets.** Why: defects and completed work need visual clarity. Technician: defensible documentation. Customer: easier understanding. Difficulty: high. Dependencies: image editor/storage. Files: annotation/photo components.
4. **Voice-first observation entry.** Why: reduces typing in the field. Technician: hands-light workflow. Customer: more complete notes. Difficulty: high. Dependencies: browser microphone permission, transcription, offline fallback. Files: capture/transcription/observation UI.
5. **Experimental calibrated camera measurement.** Why: may accelerate measurements, but precision cannot be assumed. Technician: assisted estimates with method/confidence. Customer: transparent uncertainty. Difficulty: very high. Dependencies: calibration/reference object and validation research. Files: experimental isolated module.

### Phase 5 — Scale and commercial product

1. **Customer-ready PDF reports and signatures.** Why: creates the final deliverable. Technician: completes onsite. Customer: premium report. Difficulty: high. Dependencies: confirmed structured inspection, legal/privacy/storage decisions. Files: report renderer, signature component, immutable snapshots.
2. **Company and technician profiles.** Why: eliminates repeated report identity entry. Technician: automatic branding/credentials. Customer: clear provider identity. Difficulty: medium. Dependencies: auth/workspace roles. Files: profile schema/settings/report integration.
3. **Property history and comparison.** Why: repeat-service evidence is highly valuable. Technician: sees prior conditions/measurements. Customer: understands change over time. Difficulty: high. Dependencies: cloud production readiness and inspection schema. Files: history queries/comparison UI.
4. **Offline mutation queue and conflict merge.** Why: field service cannot depend on signal. Technician: works continuously. Customer: no data loss. Difficulty: very high. Dependencies: durable local store, sync engine, conflict UI. Files: service worker/local queue/workspace sync.
5. **Exact-manual indexing/retrieval at scale.** Why: expands the source-control moat. Technician: faster verified research. Customer: better-grounded recommendations. Difficulty: very high. Dependencies: licensing, source ingestion, revision tracking, retrieval evaluations. Files: ingestion/search/citation services.

## Phase 1 acceptance criteria

- Refreshing Pro after meaningful edits offers or automatically restores a versioned browser-local active draft.
- A technician can discard the active draft without deleting saved cases or Source File Vault bytes.
- Draft persistence failures are visible and do not crash chat or remove current work.
- Primary mobile navigation, attach/send, drawer, and case actions have a minimum 44 px interactive height where layout permits.
- Composer padding respects phone bottom safe areas.
- Existing Homeowner/Pro chat, PDFs, images, manual verification, calculators, saved cases, source provenance/vault, cloud code, safety prompts, tests, and production build remain intact.
