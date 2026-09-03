-- Constrain new and updated cloud records without rejecting legacy rows that may
-- have been written before inspection types became explicit in schema version 1.

alter table public.inspections
  drop constraint if exists inspections_inspection_type_check;

alter table public.inspections
  alter column inspection_type set default 'other';

alter table public.inspections
  add constraint inspections_inspection_type_check
  check (inspection_type in ('level_1','level_2','limited_scope','service_documentation','other'))
  not valid;
