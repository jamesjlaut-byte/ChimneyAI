# ChimneyAI v37 — Persistent Source File Vault

v37 closes the largest integrity gap in browser-local Pro cases: the exact source bytes can now survive after the immediate chat attachment is gone.

## Storage architecture
Source bytes are stored in browser IndexedDB, keyed by the SHA-256 of the exact uploaded bytes.

The saved Pro case continues to store:
- file name
- role
- MIME type
- byte size
- page count when available
- extraction-truncation status
- SHA-256
- technician source note
- storage state
- integrity state

The actual Blob is stored separately in the Source File Vault.

## Workflow
1. Attach a manual, label photo, report, or field photo.
2. Add it to the case source manifest.
3. Select Persist bytes.
4. Save the Pro case.
5. Later reload the case.
6. ChimneyAI checks whether the SHA-256 key still exists in the local vault.
7. Select Verify hash to recompute SHA-256 from stored bytes.
8. Select Open/download to retrieve that exact stored file.

If the browser copy is gone but the case retains the fingerprint, Restore exact file lets the technician choose a file. ChimneyAI recomputes SHA-256 and refuses the restore if the bytes do not match the recorded fingerprint.

## Why this matters
This creates an auditable distinction between:
- what the technician says the source was,
- what file was actually uploaded,
- whether the later stored bytes are exactly the same file.

## Limits
IndexedDB is device/browser local. Clearing site data can erase the vault. v37 is not a cloud backup or records-retention system.

The production step remains authenticated cloud object storage with workspace permissions and immutable source-version records.
