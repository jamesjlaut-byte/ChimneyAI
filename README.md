# ChimneyAI

This is the first clean split after separating the business app into FlueFire.

## Included
- landing page that separates Homeowner vs Pro
- independent Homeowner AI system prompt
- independent ChimneyAI Pro system prompt
- dedicated chat interfaces for each
- OpenAI Responses API server route
- health endpoint
- homeowner safety/authority guardrails
- professional technical guardrails
- responsive mobile layout
- starter prompts for each audience
- architecture and roadmap docs

## Run
1. Copy `.env.example` to `.env.local`
2. Add `OPENAI_API_KEY`
3. Run `npm install`
4. Run `npm run dev`

## Environment configuration

Required for live Homeowner AI and Pro AI answers:

- `OPENAI_API_KEY` — server-only OpenAI API key

Optional:

- `OPENAI_MODEL` — model override; defaults to `gpt-5-mini` when omitted
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL for Cloud Workspace
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — matching Supabase publishable/anonymous key

The two Supabase variables must be supplied together. Without them, ChimneyAI remains in browser-first mode and local cases, source fingerprints, and the Browser Source File Vault continue to work. Apply the migrations in `supabase/migrations` before enabling cloud cases in production.

`GET /api/health` reports `configured` or `degraded` configuration without returning secret values. A missing OpenAI key or a partial Supabase pair produces `degraded`; fully omitted optional Supabase configuration does not. The endpoint confirms environment-variable presence only—provider billing, quota, and request availability are validated by an actual AI request.

FlueFire v29 is intentionally not copied into this project. It remains a separate application foundation.

## Added in v31
- homeowner PDF report upload
- homeowner image upload
- Pro image/document upload
- local PDF text extraction
- image-aware model requests
- attachment-specific anti-overreach instructions
- Pro fireplace-opening/flue area calculator
- rectangular and round flue arithmetic
- calculator explicitly separated from compliance conclusions

## Added in v32
- Pro Source Desk
- source type and source-status controls
- manufacturer/model/serial/listing context
- dedicated UL/listing-label scan workflow
- explicit uploaded-vs-verified source distinction
- manual page-marker citation discipline
- no invented manual pages
- technical photo second-look shortcut
- segmental arch geometry calculator
- hearth measurement helper

## Added in v33
- Official Manual Finder in ChimneyAI Pro
- initial verified manufacturer source registry
- Majestic official manual lookup
- Heat & Glo official manual lookup
- exact-model requirement before source-controlled workflow
- manual variant/revision ambiguity guardrails
- source-controlled question generator
- explicit distinction between navigation to an official source and automatic verification

## Added in v34
- expanded official manual/support registry: Majestic, Heat & Glo, Heatilator, Regency, Napoleon
- verification date metadata for known official sources
- exact Manual Verification Record
- manual title / document number / revision / date / official URL / relevant pages
- saved Pro technical cases
- browser-local case persistence
- reload manufacturer/model/source/manual research context
- explicit separation between research record and proof of field compliance

## Added in v35
- saved Pro case conversation history
- reloadable case conversations
- manual metadata SHA-256 identity fingerprint
- exportable Markdown technical research record
- private case notes
- one-tap source-controlled research summary prompt
- explicit metadata-hash vs PDF-hash distinction

## Added in v36
- SHA-256 hashing of actual uploaded file bytes
- byte size, MIME, page count and extraction-completeness provenance
- Pro Source File Manifest
- manual / label / report / field-photo source roles
- source notes
- saved-case source fingerprint persistence
- actual file hashes included in case export
- clear separation between metadata identity hash and actual file-byte hash
- cleaned consolidated roadmap

## Added in v37
- Persistent browser Source File Vault using IndexedDB
- exact source-file Blob storage keyed by SHA-256
- persisted/session-only/missing source states
- stored-file SHA-256 re-verification
- open/download exact stored source
- delete persistent bytes without deleting case provenance
- restore missing source only when selected file matches recorded SHA-256
- explicit browser-local retention limitation

## Added in v38
- optional Supabase cloud workspace foundation
- passwordless Pro email sign-in scaffold
- browser-only safe fallback when cloud is not configured
- user-owned Pro case schema
- private source-file object-storage architecture
- Row Level Security policies
- revision snapshots for every cloud sync
- per-case Sync cloud control
- source uploads from the browser Source File Vault
- explicit cloud-ready vs cloud-tested distinction

## Added in v39
- Cloud Case Browser
- cloud case listing and retrieval across devices
- timestamp-based local/cloud version state
- safe import that refuses silent overwrite of newer local work
- explicit Replace local action
- cloud source download
- SHA-256 and byte-size verification after cloud download
- verified restoration into the browser Source File Vault
- cloud revision count/history foundation
- migration for client timestamps, indexes, and source policies
