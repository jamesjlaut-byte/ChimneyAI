-- Require child Pro records to belong to an authenticated user's own parent case.
-- This forward migration replaces the earlier owner_id-only row policies.

drop policy if exists "owners manage own case sources" on public.pro_case_sources;
drop policy if exists "owners update pro case sources" on public.pro_case_sources;

create policy "owners read own case sources" on public.pro_case_sources for select
  using (
    auth.uid()=owner_id
    and exists (
      select 1 from public.pro_cases parent_case
      where parent_case.id=pro_case_sources.case_id and parent_case.owner_id=auth.uid()
    )
  );

create policy "owners create own case sources" on public.pro_case_sources for insert
  with check (
    auth.uid()=owner_id
    and exists (
      select 1 from public.pro_cases parent_case
      where parent_case.id=pro_case_sources.case_id and parent_case.owner_id=auth.uid()
    )
  );

create policy "owners update own case sources" on public.pro_case_sources for update
  using (
    auth.uid()=owner_id
    and exists (
      select 1 from public.pro_cases parent_case
      where parent_case.id=pro_case_sources.case_id and parent_case.owner_id=auth.uid()
    )
  )
  with check (
    auth.uid()=owner_id
    and exists (
      select 1 from public.pro_cases parent_case
      where parent_case.id=pro_case_sources.case_id and parent_case.owner_id=auth.uid()
    )
  );

create policy "owners delete own case sources" on public.pro_case_sources for delete
  using (
    auth.uid()=owner_id
    and exists (
      select 1 from public.pro_cases parent_case
      where parent_case.id=pro_case_sources.case_id and parent_case.owner_id=auth.uid()
    )
  );

drop policy if exists "owners read own revisions" on public.pro_case_revisions;
drop policy if exists "owners create own revisions" on public.pro_case_revisions;

create policy "owners read own case revisions" on public.pro_case_revisions for select
  using (
    auth.uid()=owner_id
    and exists (
      select 1 from public.pro_cases parent_case
      where parent_case.id=pro_case_revisions.case_id and parent_case.owner_id=auth.uid()
    )
  );

create policy "owners create own case revisions" on public.pro_case_revisions for insert
  with check (
    auth.uid()=owner_id
    and exists (
      select 1 from public.pro_cases parent_case
      where parent_case.id=pro_case_revisions.case_id and parent_case.owner_id=auth.uid()
    )
  );
