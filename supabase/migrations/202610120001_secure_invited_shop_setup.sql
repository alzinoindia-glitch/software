-- Secure first-shop provisioning for an explicitly invited Supabase user.
-- Never grant anon access to store_state: it contains invoices and customer data.

alter table public.store_state
  drop constraint if exists store_state_domain_check;

alter table public.store_state
  add constraint store_state_domain_check
  check (domain = any (array[
    'shopConfig', 'inventory', 'usedPurchases', 'repairJobs', 'customers',
    'suppliers', 'expenses', 'invoices', 'warrantyClaims'
  ]::text[]));

create or replace function public.bootstrap_invited_shop(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Sign in before setting up a shop.' using errcode = '28000';
  end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'Verify Google Authenticator before setting up the shop.' using errcode = '42501';
  end if;
  if v_name = '' or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Enter a shop name and a URL-safe shop ID.' using errcode = '22023';
  end if;

  -- Serialize first-owner setup so two invitations cannot claim the first shop.
  perform pg_advisory_xact_lock(hashtextextended('public.bootstrap_invited_shop', 0));

  if not exists (
    select 1 from auth.users u
    where u.id = v_user_id and u.invited_at is not null
  ) then
    raise exception 'Only a user invited from the Supabase project can initialize the shop.' using errcode = '42501';
  end if;

  if exists (select 1 from public.organizations limit 1) then
    raise exception 'A shop is already configured. Ask its administrator to add your account.' using errcode = '23505';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user_id;
  insert into public.organizations (name, slug)
  values (v_name, v_slug)
  returning id into v_org_id;

  insert into public.profiles (id, organization_id, full_name, role, is_active, updated_at)
  values (v_user_id, v_org_id, coalesce(v_email, v_name), 'admin'::public.staff_role, true, now())
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    role = 'admin'::public.staff_role,
    is_active = true,
    updated_at = now();

  return v_org_id;
end;
$function$;

revoke all on function public.bootstrap_invited_shop(text, text) from public, anon;
grant execute on function public.bootstrap_invited_shop(text, text) to authenticated;

-- Require a verified TOTP session for every store_state read/write. Cashier PIN
-- entry remains local; a device needs an admin MFA session authorized once.
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
    and (select auth.jwt() ->> 'aal') = 'aal2'
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
    and (select auth.jwt() ->> 'aal') = 'aal2'
$function$;

do $block$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'store_state'
  ) then
    alter publication supabase_realtime add table public.store_state;
  end if;
end;
$block$;
