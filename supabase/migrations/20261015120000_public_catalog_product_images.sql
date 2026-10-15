-- Reuse the existing public catalog-media bucket. Its organization-scoped
-- INSERT/UPDATE/DELETE policies are defined in
-- 20261013050807_totp_only_sessions.sql. Public buckets do not need a SELECT
-- policy for downloads; Supabase serves public object URLs directly.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-media',
  'catalog-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = true;
