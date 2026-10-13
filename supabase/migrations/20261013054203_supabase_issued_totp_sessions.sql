-- Supabase Auth issues the database JWT after the authenticator function
-- verifies TOTP. The service-managed claim expires independently of JWT
-- lifetime and cannot be written by browser clients.
create or replace function private.is_totp_session()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select coalesce(
    (claims.jwt -> 'app_metadata' ->> 'portal') = any (array['admin', 'cashier']::text[])
    and case
      when (claims.jwt -> 'app_metadata' ->> 'totp_verified_at') ~ '^[0-9]{10}$' then
        (claims.jwt -> 'app_metadata' ->> 'totp_verified_at')::bigint >
          extract(epoch from (now() - interval '4 hours'))::bigint
      else false
    end,
    false
  )
  from (select (select auth.jwt()) as jwt) as claims
$function$;

revoke all on function private.is_totp_session() from public, anon;
grant execute on function private.is_totp_session() to authenticated;

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select p.organization_id
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active
    and (select private.is_totp_session())
$function$;

create or replace function private.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $function$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active
    and (select private.is_totp_session())
$function$;

-- This path is retained only for legacy invited-user provisioning. New setup
-- uses the server-side one-time setup token and never asks staff for email.
