-- Persist shop-defined categories, brands, subcategories, and repair staff so
-- every admin-authorized device offers the same options.
alter table public.store_state
  drop constraint if exists store_state_domain_check;

alter table public.store_state
  add constraint store_state_domain_check
  check (domain = any (array[
    'shopConfig', 'inventory', 'usedPurchases', 'repairJobs', 'customers',
    'suppliers', 'expenses', 'invoices', 'warrantyClaims',
    'customTaxonomy', 'customTechnicians'
  ]::text[]));
