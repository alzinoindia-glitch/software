-- Bump the row version on every update. Clients use the previous version in a
-- conditional UPDATE so simultaneous device edits cannot silently overwrite.
create or replace function private.increment_store_state_version()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.version := old.version + 1;
  return new;
end;
$function$;

drop trigger if exists store_state_increment_version on public.store_state;
create trigger store_state_increment_version
before update on public.store_state
for each row
execute function private.increment_store_state_version();
