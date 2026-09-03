-- Keep finalized cloud inspections consistent with browser persistence rules.
-- Signed or delivered aggregates may only change through a higher report revision.

create or replace function public.protect_finalized_inspection_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  old_revision bigint := 0;
  new_revision bigint := 0;
begin
  if tg_op = 'DELETE' then
    if old.signature_status = 'signed' or old.report_status = 'delivered' then
      raise exception 'Signed or delivered inspections cannot be deleted';
    end if;
    return old;
  end if;

  if old.signature_status = 'signed' or old.report_status = 'delivered' then
    if jsonb_typeof(old.aggregate_json #> '{report,revision}') = 'number'
      and (old.aggregate_json #>> '{report,revision}') ~ '^[0-9]+$' then
      old_revision := (old.aggregate_json #>> '{report,revision}')::bigint;
    end if;
    if jsonb_typeof(new.aggregate_json #> '{report,revision}') = 'number'
      and (new.aggregate_json #>> '{report,revision}') ~ '^[0-9]+$' then
      new_revision := (new.aggregate_json #>> '{report,revision}')::bigint;
    end if;
    if new_revision <= old_revision then
      raise exception 'Signed or delivered inspection changes require a higher report revision';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_finalized_inspection_mutation() from public;

drop trigger if exists protect_finalized_inspection_mutation on public.inspections;
create trigger protect_finalized_inspection_mutation
before update or delete on public.inspections
for each row execute function public.protect_finalized_inspection_mutation();
