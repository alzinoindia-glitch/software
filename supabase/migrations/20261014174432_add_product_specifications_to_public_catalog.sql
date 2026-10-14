alter table if exists public.catalog_products
  add column if not exists specifications jsonb not null default '{}'::jsonb,
  add column if not exists description text;

notify pgrst, 'reload schema';
