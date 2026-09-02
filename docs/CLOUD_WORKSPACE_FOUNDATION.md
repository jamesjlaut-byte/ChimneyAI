# ChimneyAI v38 — Cloud Workspace Foundation

v38 adds the first production-shaped cloud architecture while preserving browser-first operation.

If Supabase environment variables are absent, ChimneyAI remains browser-only. If configured, Pro exposes passwordless email sign-in and saved cases can sync metadata, conversation history, revision snapshots, and available Source File Vault bytes to private object storage.

Tables: `pro_cases`, `pro_case_sources`, `pro_case_revisions`.

Row Level Security is enabled and records are owned by `auth.uid()`. Every sync creates a revision snapshot.

Important: this code is cloud-ready, not cloud-verified. No live Supabase project was connected or migration applied during v38 generation.
