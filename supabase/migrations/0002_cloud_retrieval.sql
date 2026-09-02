-- ChimneyAI Pro v39 multi-device retrieval foundation

alter table public.pro_cases
  add column if not exists client_updated_at timestamptz;

create index if not exists pro_cases_owner_updated_idx
  on public.pro_cases(owner_id,updated_at desc);

create index if not exists pro_case_sources_case_idx
  on public.pro_case_sources(case_id);

create index if not exists pro_case_revisions_case_created_idx
  on public.pro_case_revisions(case_id,created_at desc);

-- Source records can be updated after a local file is uploaded/restored.
drop policy if exists "owners update pro case sources" on public.pro_case_sources;
create policy "owners update pro case sources" on public.pro_case_sources
for update using (auth.uid()=owner_id)
with check (auth.uid()=owner_id);

-- Allow owners to delete their own cloud source objects later without widening access.
drop policy if exists "owners delete pro case sources" on storage.objects;
create policy "owners delete pro case sources" on storage.objects
for delete to authenticated
using (
  bucket_id='pro-case-sources'
  and exists (
    select 1 from public.pro_cases c
    where c.id=((storage.foldername(name))[2])::uuid
      and c.owner_id=auth.uid()
  )
);
