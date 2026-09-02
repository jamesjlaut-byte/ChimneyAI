# ChimneyAI v36 — actual source-file fingerprints

v35 hashed the typed manual identity metadata. v36 now also hashes the actual uploaded file bytes in the user's browser.

## What gets fingerprinted
Each prepared attachment receives:
- file name
- MIME type
- byte size
- prepared timestamp
- SHA-256 of the exact uploaded bytes
- PDF page count when available
- whether extracted document text was truncated

## Source File Manifest
ChimneyAI Pro now has a Source File Manifest. A technician can classify each fingerprinted attachment as:
- manufacturer manual
- listing/rating label
- inspection report
- field photo
- other source

The technician can also add a note describing why the source matters.

## Saved Pro Case integration
When a Pro case is saved, the source manifest is saved with it. Exported Markdown research records include all actual file SHA-256 fingerprints.

## Important distinction
There are now two hashes with different meanings:

1. Manual identity metadata hash
   - hashes typed manufacturer/model/manual/revision/source metadata
   - useful for detecting changes in the research record

2. Actual file SHA-256
   - hashes the exact uploaded bytes
   - identifies that exact PDF/image/file

Neither hash proves that a document is official, current, applicable to the installed appliance, or that a field installation complies with it.

## Remaining limitation
v36 saves file provenance, not file bytes, in the browser-local case record. Attachment-byte persistence and cloud case storage are future work.
