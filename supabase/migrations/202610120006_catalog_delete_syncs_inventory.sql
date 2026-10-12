-- Keep the inventory collection in sync when an authorized admin deletes a
-- public catalog row directly in Supabase. The invoker's existing RLS policies
-- still authorize both the catalog DELETE and the inventory UPDATE.
create or replace function private.remove_catalog_product_from_inventory()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  update public.store_state as state
  set payload = coalesce(
    (
      select jsonb_agg(product)
      from jsonb_array_elements(
        case
          when jsonb_typeof(state.payload) = 'array' then state.payload
          else '[]'::jsonb
        end
      ) as products(product)
      where products.product ->> 'id' is distinct from old.id
    ),
    '[]'::jsonb
  )
  where state.organization_id = old.organization_id
    and state.domain = 'inventory';

  return old;
end;
$function$;

revoke all on function private.remove_catalog_product_from_inventory() from public, anon;
grant execute on function private.remove_catalog_product_from_inventory() to authenticated;

drop trigger if exists catalog_delete_sync_inventory on public.catalog_products;
create trigger catalog_delete_sync_inventory
after delete on public.catalog_products
for each row
execute function private.remove_catalog_product_from_inventory();
