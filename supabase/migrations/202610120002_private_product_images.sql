insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Shop members read product photos" on storage.objects;
create policy "Shop members read product photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select private.current_organization_id())::text
);

drop policy if exists "Shop members add product photos" on storage.objects;
create policy "Shop members add product photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select private.current_organization_id())::text
);

drop policy if exists "Shop members update product photos" on storage.objects;
create policy "Shop members update product photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select private.current_organization_id())::text
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select private.current_organization_id())::text
);

drop policy if exists "Shop members remove product photos" on storage.objects;
create policy "Shop members remove product photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select private.current_organization_id())::text
);
