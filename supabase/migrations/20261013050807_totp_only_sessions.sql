-- Server-verified authenticator login. Credentials and attempt counters are
-- never readable through the browser-facing Data API.
create table if not exists public.authenticator_credentials (
  portal text primary key check (portal in ('admin', 'cashier')),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  secret text not null,
  is_active boolean not null default false,
  last_used_step bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.authenticator_credentials enable row level security;
revoke all on public.authenticator_credentials from public, anon, authenticated;
grant all on public.authenticator_credentials to service_role;

create table if not exists private.authenticator_login_attempts (
  bucket_hash text primary key check (bucket_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  blocked_until timestamptz
);

revoke all on private.authenticator_login_attempts from public, anon, authenticated, service_role;

create or replace function public.take_authenticator_login_attempt(p_bucket_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := now();
  v_allowed boolean := false;
begin
  if p_bucket_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  insert into private.authenticator_login_attempts as attempts (
    bucket_hash, window_started_at, attempt_count, blocked_until
  ) values (p_bucket_hash, v_now, 1, null)
  on conflict (bucket_hash) do update set
    window_started_at = case
      when attempts.window_started_at < v_now - interval '15 minutes' then v_now
      else attempts.window_started_at
    end,
    attempt_count = case
      when attempts.window_started_at < v_now - interval '15 minutes' then 1
      else attempts.attempt_count + 1
    end,
    blocked_until = case
      when attempts.window_started_at < v_now - interval '15 minutes' then null
      when attempts.attempt_count >= 5 then coalesce(attempts.blocked_until, v_now + interval '15 minutes')
      else attempts.blocked_until
    end
  returning blocked_until is null and attempt_count <= 5 into v_allowed;

  return coalesce(v_allowed, false);
end;
$function$;

create or replace function public.clear_authenticator_login_attempt(p_bucket_hash text)
returns void
language sql
security definer
set search_path = ''
as $function$
  delete from private.authenticator_login_attempts where bucket_hash = p_bucket_hash
$function$;

create or replace function public.consume_authenticator_step(p_portal text, p_step bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_updated integer;
begin
  update public.authenticator_credentials
  set last_used_step = p_step, updated_at = now()
  where portal = p_portal and is_active and last_used_step < p_step;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$function$;

create or replace function public.activate_authenticator_credentials(p_admin_step bigint, p_cashier_step bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select count(*) from public.authenticator_credentials
      where portal in ('admin', 'cashier') and not is_active) <> 2 then
    return false;
  end if;
  update public.authenticator_credentials
  set is_active = true,
      last_used_step = case portal when 'admin' then p_admin_step else p_cashier_step end,
      updated_at = now()
  where portal in ('admin', 'cashier');
  return true;
end;
$function$;

revoke all on function public.take_authenticator_login_attempt(text) from public, anon, authenticated;
revoke all on function public.clear_authenticator_login_attempt(text) from public, anon, authenticated;
revoke all on function public.consume_authenticator_step(text, bigint) from public, anon, authenticated;
revoke all on function public.activate_authenticator_credentials(bigint, bigint) from public, anon, authenticated;
grant execute on function public.take_authenticator_login_attempt(text) to service_role;
grant execute on function public.clear_authenticator_login_attempt(text) to service_role;
grant execute on function public.consume_authenticator_step(text, bigint) to service_role;
grant execute on function public.activate_authenticator_credentials(bigint, bigint) to service_role;

create or replace function private.is_cashier_portal()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'portal') = 'cashier', false)
$function$;

revoke all on function private.is_cashier_portal() from public, anon;
grant execute on function private.is_cashier_portal() to authenticated;

-- Cashier access is limited at the database layer as well as in the UI.
drop policy if exists "staff read store state" on public.store_state;
create policy "staff read permitted store state"
on public.store_state for select to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (
    (select private.current_staff_role()) = 'admin'::public.staff_role
    or (select private.is_cashier_portal()) = false
    or domain = any (array['inventory', 'repairJobs', 'customers', 'invoices']::text[])
  )
);

-- Cashier tokens may read the catalog, but they cannot edit products or shop
-- media. Manager and admin permissions keep their existing behavior.
drop policy if exists "staff create catalog" on public.catalog_products;
create policy "staff create catalog"
on public.catalog_products for insert to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and not (select private.is_cashier_portal())
);

drop policy if exists "staff update catalog" on public.catalog_products;
create policy "staff update catalog"
on public.catalog_products for update to authenticated
using (
  organization_id = (select private.current_organization_id())
  and not (select private.is_cashier_portal())
)
with check (
  organization_id = (select private.current_organization_id())
  and not (select private.is_cashier_portal())
);

drop policy if exists "ALZINO staff upload organization catalog media" on storage.objects;
create policy "ALZINO staff upload organization catalog media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'catalog-media'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
);

drop policy if exists "ALZINO staff update organization catalog media" on storage.objects;
create policy "ALZINO staff update organization catalog media"
on storage.objects for update to authenticated
using (
  bucket_id = 'catalog-media'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
)
with check (
  bucket_id = 'catalog-media'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
);

drop policy if exists "ALZINO staff delete organization catalog media" on storage.objects;
create policy "ALZINO staff delete organization catalog media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'catalog-media'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
);

drop policy if exists "Shop members add product photos" on storage.objects;
create policy "Shop members add product photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
);

drop policy if exists "Shop members update product photos" on storage.objects;
create policy "Shop members update product photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
);

drop policy if exists "Shop members remove product photos" on storage.objects;
create policy "Shop members remove product photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
);

drop policy if exists "staff read organization proofs" on storage.objects;
create policy "staff read organization proofs"
on storage.objects for select to authenticated
using (
  bucket_id = 'used-mobile-proofs'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and (select private.current_staff_role()) = 'admin'::public.staff_role
);
