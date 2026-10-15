-- Product photos approved for the storefront use a separate public bucket.
-- The original product-images bucket stays private for admin and offline use.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-product-images',
  'catalog-product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Shop members list public catalog photos" on storage.objects;
create policy "Shop members list public catalog photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'catalog-product-images'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
);

drop policy if exists "Shop members add public catalog photos" on storage.objects;
create policy "Shop members add public catalog photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'catalog-product-images'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
);

drop policy if exists "Shop members update public catalog photos" on storage.objects;
create policy "Shop members update public catalog photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'catalog-product-images'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
)
with check (
  bucket_id = 'catalog-product-images'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
);

drop policy if exists "Shop members remove public catalog photos" on storage.objects;
create policy "Shop members remove public catalog photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'catalog-product-images'
  and (storage.foldername(name))[1] = (select (private.current_organization_id())::text)
  and not (select private.is_cashier_portal())
);
