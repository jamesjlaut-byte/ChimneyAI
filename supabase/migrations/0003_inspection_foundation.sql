-- ChimneyAI Inspection OS Phase 1: additive data foundation.
-- Existing pro_cases, revisions, sources, policies, and storage are unchanged.

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_inspection_id text not null,
  schema_version integer not null default 1 check (schema_version = 1),
  pro_case_client_id text,
  status text not null check (status in ('draft','in_progress','ready_for_review','completed','delivered','archived')),
  report_status text not null check (report_status in ('not_started','draft','ready_for_review','completed','delivered')),
  signature_status text not null check (signature_status in ('not_requested','pending','signed')),
  inspection_type text not null default '',
  inspection_date text not null default '',
  customer_json jsonb not null,
  property_json jsonb not null,
  technician_json jsonb not null default '{}'::jsonb,
  aggregate_json jsonb not null,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,client_inspection_id)
);

create table if not exists public.inspection_revisions (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  revision_number integer not null check (revision_number >= 0),
  reason text,
  snapshot_json jsonb not null,
  created_at timestamptz not null default now(),
  unique(inspection_id,revision_number)
);

create index if not exists inspections_owner_updated_idx on public.inspections(owner_id,updated_at desc);
create index if not exists inspection_revisions_inspection_idx on public.inspection_revisions(inspection_id,revision_number desc);

alter table public.inspections enable row level security;
alter table public.inspection_revisions enable row level security;

drop policy if exists "owners manage own inspections" on public.inspections;
create policy "owners manage own inspections" on public.inspections for all
  using (auth.uid()=owner_id) with check (auth.uid()=owner_id);

drop policy if exists "owners read own inspection revisions" on public.inspection_revisions;
create policy "owners read own inspection revisions" on public.inspection_revisions for select
  using (
    auth.uid()=owner_id
    and exists (
      select 1 from public.inspections inspection
      where inspection.id=inspection_revisions.inspection_id and inspection.owner_id=auth.uid()
    )
  );

drop policy if exists "owners create own inspection revisions" on public.inspection_revisions;
create policy "owners create own inspection revisions" on public.inspection_revisions for insert
  with check (
    auth.uid()=owner_id
    and exists (
      select 1 from public.inspections inspection
      where inspection.id=inspection_revisions.inspection_id and inspection.owner_id=auth.uid()
    )
  );
