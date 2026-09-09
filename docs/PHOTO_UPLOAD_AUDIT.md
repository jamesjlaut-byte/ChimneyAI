# Phone photo upload audit and verification

## Status

The large-photo pipeline through commit `d2ec16d` was deployed successfully. The hardening changes described below are implemented and verified locally, but are NOT a declaration of physical-phone acceptance. No connected iPhone/Android was available for this pass.

## Original pipeline and rejection points

| Layer | Finding |
| --- | --- |
| Chat picker | File input accepts selected camera/library files; no intrinsic byte cap. Previously excluded HEIC. |
| `lib/client-attachments.ts` | Original immediate rejection: images above 3 MiB; message said images must be 3 MB or smaller. No original automatic optimization. Prior local commit changed this to 50 MiB, but was not yet published. |
| `components/ChimneyChat.tsx` | JSON-serialized image data URLs; combined request rejected above 4,000,000 bytes. Base64 adds approximately 33%. Six active attachments maximum, not an inspection-wide photo limit. |
| `lib/chat-request.ts` | 4,000,000-byte request budget; JPEG/PNG/WebP/GIF data URLs. Original source-byte metadata capped at 15 MiB before the preceding photo fix. |
| `app/api/chat/route.ts` | Content-length and actual body checks return 413 `payload_too_large`; strict schema returns 400 `invalid_request`. Formerly JSON only. |
| `next.config.ts` | 3mb Server Actions setting does NOT control `/api/chat` Route Handler. CSP restricts connect-src; no image-size middleware exists. Camera permission policy concerns getUserMedia, not the native file picker. |
| Vercel | Function request/response limit is 4.5 MB. Raising frontend limits cannot bypass this. |
| Inspection capture | `lib/inspection-photo.ts` originally capped originals at 20 MiB. Prior local fix raised it to 50 MiB. Capture stores original files in IndexedDB, not Vercel. |
| Local storage | IndexedDB stores original binary evidence, subject to device quota/eviction. Photos are not stored as base64 in localStorage. This is not guaranteed archival storage. |
| Cloud storage | `lib/workspace-sync.ts` sends original Blob directly to private Supabase `pro-case-sources`, with ownership policies. No bucket file-size override is in the migration. Actual hosted project/global limits cannot be inferred from SQL and were not verified. This optional authenticated flow is separate from ordinary chat uploads. |
| Model | Server sends optimized JPEG as Responses API `input_image`, `detail: high`. Native HEIC is not passed to OpenAI. Current official image guidance supports JPEG/PNG/WebP/nonanimated GIF; model-specific resizing/context limits remain. Model quota/credentials are separate failure modes. |

The user's exact historical request was not captured; the confirmed immediate rejection in the published source was the 3 MiB frontend check. The other barriers above would still prevent a limit-only fix.

## Implementation

- Browser decodes the photo before sending; native decoding applies EXIF orientation, then canvas bakes the oriented pixels into JPEG. Do not rotate a second time.
- HEIC/HEIF uses native decoding first, then lazy `heic-to/csp` 1.5.2 fallback. Conversion stays local. No unsafe-eval CSP relaxation or external converter.
- Long edge starts at 2304 px, never upscales. JPEG quality is tried at 0.85, then 0.80. Dimensions fall by 20% only if necessary to meet the batch budget. This can reduce fine detail in complex multi-photo batches: use smaller batches/close-ups for critical labels or cracks. No claim that compressed images establish defects or dimensions.
- Total binary photo budget is 3,300,000 bytes, divided by active/selected photo count. One photo may use the whole budget; six get 550,000 each. Growing a batch re-encodes large existing copies from their original source, not from a compressed derivative.
- Browser sends binary multipart data, not base64 JSON. The server reconstructs model data URLs after accepting the bounded body. Legacy JSON remains supported.
- Active image `sha256` and `byte_size` now identify the optimized bytes, and the multipart decoder verifies them. Separate `original_sha256`, `original_byte_size`, and `original_mime_type` describe the untouched original. The source vault/manifest continues to identify and persist the original. These hashes are not interchangeable.
- The composer shows original-to-optimized size and a conservative multipart request estimate before Send. Requests estimated above 4 MB disable Send with a smaller-batch explanation.
- Reader cancels an oversized body even when Content-Length is missing. Overall 4,000,000-byte transport budget remains; exceptionally large conversation/source metadata can still require fewer photos per request.
- Preserve case-sensitive multipart boundary headers separately from Blob.type. Never fetch a data URL under production connect-src; decode it locally.
- Preserve original File references and SHA-256 without creating a duplicate full-size original Blob. Preparation is sequential, active chat files capped at six, decoded canvases/object URLs released. Inspection originals and optimized previews persist in IndexedDB; only optimized preview URLs render.
- Progress reports optimization and upload; thumbnail previews appear before Send. No false server-upload claim for inspection photos saved locally. Native picker is not forced into capture-only mode, retaining Photo Library access.

## Tests actually performed

- Production build and automated safety/transport tests, including multipart roundtrip, six 550 KB images, one 3.3 MB image, oversized streamed body, legacy JSON, missing parts and case-sensitive browser boundaries.
- Real browser file input in the available Codex in-app browser at desktop and 390px mobile viewport. This is NOT physical Safari/iPhone or Android Chrome.
- 4032x3024 synthetic label/line JPEGs padded to 2, 5, 10, 16 MiB: approximately 88 KB at 2304x1728. Padding tests source byte limits independently from image complexity; these are not actual camera captures.
- EXIF orientation 6 JPEG: output 1728x2304, approximately 89 KB.
- Public libheif sample HEIC: output JPEG 1280x854, approximately 478 KB. Successful decoding does not independently prove every fallback/native branch or every iPhone HEIC variant.
- Unpadded random-noise PNG: 36,592,556 bytes, 4032x3024; single-photo output 2304x1728, approximately 3,029,379 bytes. A fixed 550 KB budget originally shrank it to 943x708; this discovery motivated adaptive budgets.
- Six-photo submissions and adding five photos to an existing large attachment reached the post-validation `openai_not_configured` response. No 400/413 after transport fixes. This proves local transport/schema acceptance, not a successful model answer.
- Existing preceding fix verified original 36.6 MB source SHA in the browser vault.

## Release acceptance still required

### Latest fingerprint and preflight verification

The follow-up pass tested 4032x3024 JPEG fixtures padded to exactly 2, 5, 8, 12 and 15 MiB, plus EXIF orientation 6. At quality 0.85 the landscape files became 79,013-byte 2304x1728 JPEGs; the portrait became 79,955 bytes at 1728x2304. The displayed optimized fingerprint matched an independent SHA-256 of the rendered JPEG bytes. The page displayed a conservative 0.48 MB upload estimate before Send. All six passed the multipart decoder's optimized-byte hash/size checks and reached the missing-model-key response. This remains synthetic/local transport verification, not physical-iPhone/model acceptance.

Restoring the previously persisted 36,592,556-byte PNG from the vault succeeded: the vault retained original SHA `fd9876410502fd0c1d00d71bfac3501e4d127446ad52c9be9973931a70b3209a`, while the regenerated active viewing copy displayed its different optimized hash. Automated tests also reject an optimized upload that incorrectly supplies the original hash.

GitHub main was checked read-only and remained at `94b698fae9e692d88046d9db07ec4a0847ee9117`. Local implementation and GitHub publication are separate states. Do not mark the user acceptance test complete until the following checks pass.

1. Deploy the targeted hardening commit and apply `supabase/migrations/0007_source_bucket_limits.sql` to the hosted Supabase project.
2. On a real iPhone Safari, test Camera and Photo Library with JPEG and multiple HEIC variants, including portrait/mirrored orientation and iCloud-only photos.
3. On real Android Chrome, test camera/library JPEGs and batch selection.
4. Test actual chimney close-ups and labels with a configured model; confirm legibility with a technician. Upload success is not evidence of inspection-analysis accuracy.
5. Verify hosted Supabase bucket limits/quota and poor-signal sync separately before promising large-original cloud archival.

## Targeted hardening verification — 2026-09-05

- Active and same-selection duplicates are compared by the original SHA-256 before image optimization. A regenerated optimized JPEG from the same original is rejected; different originals remain distinct even if their optimized copies converge.
- All browser-vault writes now pass through one verified merge path. It hashes the incoming original, checks size, verifies any existing original, preserves stronger metadata and existing previews, accepts a newly verified preview, skips unnecessary identical writes, and serializes default-store writes with Web Locks where supported.
- Photo type normalization now covers canonical HEIC/HEIF, sequence and `image/x-*` aliases, and empty/octet-stream MIME reports with supported extensions. Unsupported image types and misleading document MIME types remain rejected. GIF remains chat-only, not a guided-inspection photo type.
- Migration `0007_source_bucket_limits.sql` explicitly configures the private source bucket for 50 MiB originals and the supported source MIME types. Its unique version avoids colliding with the existing `0003_inspection_foundation.sql`. This local migration does not prove that the hosted project has applied it.
- Supabase object-conflict responses now return `already_present` behavior and do not increase `uploaded_sources`.
- Automated verification: 52 tests passed, including the existing six-photo multipart and 4,000,000-byte request-boundary coverage. ESLint and `next build` passed.
- Browser verification: the final production build loaded `/pro` in the available Codex in-app browser with meaningful content and no framework error overlay. The available CUA file picker could not inject fixtures, so the previous synthetic 15 MiB/HEIC/six-photo browser transport checks were not repeated through this browser interface. New duplicate, merge, alias, and cloud-conflict behavior was verified through deterministic regression tests.
- Not tested and not claimed: physical iPhone Safari Camera, Photo Library, HEIC orientation, iCloud-only selection, physical Android Chrome, live hosted Supabase migration state, or a full live-model response.

## Concurrent evidence saves — 2026-09-09

- Added a per-store, per-original SHA-256 write queue. Without Web Locks, simultaneous inspection/chat saves in the same page could previously both read a missing record and overwrite a preview. Writes now verify and merge sequentially; a rejected write does not block subsequent valid saves.
- Web Locks still provide additional cross-tab serialization where available. The fallback queue is page-local, not a guarantee against simultaneous writes from separate tabs on browsers without Web Locks.
- Added deterministic regression coverage for concurrent preview/chat saves, uppercase/lowercase fingerprints, and recovery after rejected bytes. All 54 tests passed, including six-photo multipart and request-boundary checks. This is not physical-iPhone or hosted-cloud acceptance.
- No photo limits, optimization settings, UI, dependencies, or inspection behavior changed.

## Aborted vault transactions — 2026-09-09

- Vault reads, lists, saves, and deletes now share transaction completion/error handling. A successful IndexedDB request is not reported as a successful operation until its transaction commits.
- Transactions aborted without an error event now reject with a retry message rather than leaving the UI and same-photo write queue waiting indefinitely. Original storage errors (including quota failures) are retained. Database connections close on success, abort, request error, and synchronous failure.
- Added four simulated IndexedDB regression tests covering abort after request success, save-queue recovery, quota/request/synchronous failures, connection cleanup, and committed operations. All 58 tests passed. These tests exercise the public vault functions with simulated browser events; they do not establish physical-iPhone acceptance or hosted-cloud archival.
- No changes to UI, accepted photo sizes/types, compression, provenance, or database schema.

## Public persistence regression coverage — 2026-09-09

- Tests now call `persistAttachmentBytes`, `persistRawFile`, and `verifyStoredSourceFile` through simulated IndexedDB, rather than testing only the merge helper.
- A synthetic 16 MiB original with a separate small optimized data URL is persisted and rehashed from a structured-cloned stored record. Assertions check that the original bytes, byte count, and original fingerprint are saved, not the AI derivative.
- Existing guided-inspection previews and useful metadata survive chat persistence and raw-file restoration without a replacement write. Same-sized altered originals and optimized-only attachments are rejected before opening the vault.
- All 61 tests passed. Fixtures contain synthetic byte payloads, not decodable camera photographs; these are persistence/provenance tests, not image decoding, live Supabase restore, physical-iPhone, or model-analysis acceptance. No application code changed in this pass.

## Live browser verification and follow-up repair — 2026-09-09

- On production commit `1206a13`, the Codex in-app browser uploaded a synthetic 4032×3024 JPEG padded from 1,902,377 bytes to 16 MiB. It optimized to approximately 685 KB, reached the configured model, and received an image-specific description. Padding tests original-file size acceptance; it does not simulate a highly complex 16 MiB camera image.
- Active-photo and same-selection duplicates showed “This exact photo is already attached.” The 16 MiB original was persisted, hash-verified, recovered after page reload, and restored to chat with the same original fingerprint (`c7ff302bb4a406099aec0bcde08271eab328fa6a37a940635dcc0a75f1b40cf4`).
- Six distinct originals with identical image pixels (different trailing padding bytes) remained six attachments despite identical optimized hashes. Each was approximately 530 KB; the displayed combined estimate was 3.19 / 4.00 MB. A 390×844 viewport displayed the thumbnails and composer without horizontal clipping. Browser console capture reported no warnings/errors.
- The six-photo follow-up exposed an unrelated API history defect: production logs returned `400 Invalid value: 'input_text'. Supported values are: 'output_text' and 'refusal'.` The route incorrectly encoded prior assistant replies as input-text blocks. This was not a 413 or a photo-size rejection.
- `buildModelInput` now preserves assistant history using the Responses API's string-content message format, while current user evidence retains image and document input blocks. Model selection, technical/safety prompts, provenance, upload limits, and UI are unchanged. Three regressions cover follow-up history, six photos, and document placement; all 64 tests, lint, and build passed.
- After deploying fix `311d39d`, the same six-photo request was retried in the existing production conversation. It succeeded: the model described the six synthetic grids and preserved the technician-review labeling. The six optimized previews were 1843×1382 at approximately 530 KB each. This verifies a live multipart follow-up with prior assistant history, not just initial-message transport. A dependency `url.parse()` deprecation warning was observed separately; it did not prevent successful analysis.
- Official format reference: https://developers.openai.com/api/docs/guides/conversation-state . Physical iPhone, live HEIC orientation/iCloud selection, guided-inspection preview retention through the UI, and live cloud restore remain unverified in this pass.

## Sources

- https://vercel.com/docs/functions/limitations
- https://developers.openai.com/api/docs/guides/images-vision
- https://github.com/hoppergee/heic-to (LGPL-3.0; pinned dependency and lockfile; underlying libheif attribution/license retained in dependency)
- HEIC test fixture: https://github.com/strukturag/libheif/blob/master/examples/example.heic
