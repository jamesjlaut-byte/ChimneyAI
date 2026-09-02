# ChimneyAI v39 — multi-device cloud case retrieval

v39 adds the read side of the Pro cloud architecture.

## Cloud Case Browser
After a real Supabase environment is configured and the migrations are applied, a signed-in technician can:
- list their cloud Pro cases
- see appliance identity and source counts
- open a cloud case
- inspect recent revision availability
- import a cloud case into the current browser
- restore a cloud source file into the browser Source File Vault
- recompute SHA-256 after cloud download before accepting the file locally

## No silent overwrites
ChimneyAI compares the browser case timestamp with the cloud timestamp.

Possible states:
- cloud only
- synced
- local newer
- cloud newer
- conflict

`Import safely` refuses to overwrite a local case when the browser copy appears newer or ambiguous.
`Replace local` is intentionally explicit.

This is the beginning of conflict-safe multi-device work, not a full collaborative merge engine.

## Cloud source verification
When restoring a source file from private object storage:
1. download the Blob
2. recompute SHA-256 from the downloaded bytes
3. compare against the source record
4. compare byte size
5. refuse persistence if either integrity check fails
6. store verified bytes in the local Source File Vault

## v39 migration
`0002_cloud_retrieval.sql` adds:
- `client_updated_at`
- owner/update indexes
- case/source/revision lookup indexes
- update policy for owned source records
- delete policy for owned source objects

## Important status
This remains unverified against a live Supabase project until environment variables are supplied, migrations are applied, and authentication/RLS/storage tests are run.
