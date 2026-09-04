# Phone photo upload audit and verification

## Status

Implemented locally; NOT a declaration of physical-phone acceptance or successful production deployment. No connected iPhone/Android or live model key was available for this pass.

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
- Long edge starts at 2304 px, never upscales. JPEG quality is tried at 0.92, 0.86, then 0.80. Dimensions fall by 20% only if necessary to meet the batch budget. This can reduce fine detail in complex multi-photo batches: use smaller batches/close-ups for critical labels or cracks. No claim that compressed images establish defects or dimensions.
- Total binary photo budget is 3,300,000 bytes, divided by active/selected photo count. One photo may use the whole budget; six get 550,000 each. Growing a batch re-encodes large existing copies from their original source, not from a compressed derivative.
- Browser sends binary multipart data, not base64 JSON. The server reconstructs model data URLs after accepting the bounded body. Legacy JSON remains supported.
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

1. Deploy approved commits and confirm production serves the new bundle.
2. On a real iPhone Safari, test Camera and Photo Library with JPEG and multiple HEIC variants, including portrait/mirrored orientation and iCloud-only photos.
3. On real Android Chrome, test camera/library JPEGs and batch selection.
4. Test actual chimney close-ups and labels with a configured model; confirm legibility with a technician. Upload success is not evidence of inspection-analysis accuracy.
5. Verify hosted Supabase bucket limits/quota and poor-signal sync separately before promising large-original cloud archival.

## Sources

- https://vercel.com/docs/functions/limitations
- https://developers.openai.com/api/docs/guides/images-vision
- https://github.com/hoppergee/heic-to (LGPL-3.0; pinned dependency and lockfile; underlying libheif attribution/license retained in dependency)
- HEIC test fixture: https://github.com/strukturag/libheif/blob/master/examples/example.heic
