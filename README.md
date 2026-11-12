# ALZINO Retail ERP & POS

ALZINO is a browser based retail operations app for the Bodhan store. It includes inventory, POS billing, invoices, returns, repairs, supplier bills, customer and supplier khata, analytics, barcode labels, and the public product storefront.

## Local development

Requirements: Node.js 20 or later.

```sh
npm ci
npm run dev
```

Useful checks:

```sh
npm run lint
npm run build
```

Vite reads Supabase credentials from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy `VITE_SUPABASE_ANON_KEY`). The Supabase publishable/anon key is public configuration; never place a service-role key in a `VITE_` variable. The public catalog is scoped to the ALZINO organization ID. Set `VITE_PUBLIC_ORGANIZATION_ID` at build time when deploying a separate tenant.

## Data and recovery

- Staff data is stored locally for fast interaction and synchronized to Supabase `store_state` after an authorized admin or cashier session is active.
- Storefront-safe products are published separately to `catalog_products`; unpublished and out-of-stock inventory is not published as available stock.
- Product images are held in Supabase Storage. Keep only storefront-appropriate images in the public `product-images` bucket.
- A local copy is not proof that a cloud save succeeded. The app now surfaces pending/failed syncs, retries transient failures, and retains an outbox marker so an interrupted save can be recovered after reload. Resolve any conflict prompt before continuing edits on that collection.
- Use **Settings → Backup & Restore** to export a backup before migrations, bulk imports, or destructive maintenance. Store backups outside the device running the ERP.
- `store_state` uses one versioned JSON payload per domain. This protects against some simultaneous overwrites but does not merge independent edits inside the same domain. It is a compatibility layer, not the final high-volume data model; migrate transactional domains to row based tables and server-side atomic sale/return operations before using multi-tenant or high concurrency workloads.

## Supabase setup

The checked-in migrations are in `supabase/migrations/`. Apply them in order to a development project first, verify RLS and Storage policies there, then apply them to production through a reviewed Supabase CLI or Dashboard process. Do not copy `supabase_setup.sql` as a schema migration; it is a warning/reference file.

The current invited-shop bootstrap intentionally allows one organization per Supabase project. The public catalog query must include the configured organization ID. If changing this to multiple stores per project, add a reviewed public domain-to-organization mapping and tenant-aware RLS policies before enabling multiple public storefronts.

## Deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` builds and deploys the `main` branch to GitHub Pages. Install, build, artifact upload, and deploy failures are fatal so a broken release cannot appear green. Configure the GitHub Pages environment and required Vite build variables in the repository settings.

`vercel.json` contains SPA rewrites for an alternate Vercel deployment. It does not deploy the site by itself. Use one production host as the source of truth and verify the deployed commit and domain after every release.

## Operational notes

- Staff sessions use server-verified TOTP tokens and are kept in browser session storage. Use dedicated, access-controlled devices and lock the portal when leaving the counter.
- The POS records a verified payment and updates stock/invoice state in separate client state updates today. Keep a verified backup and reconcile invoices against stock when investigating a failed or interrupted write. A database transaction/RPC is required for full atomicity.
- Do not put service credentials, customer data, IMEIs, supplier bills, or private proof documents in the public catalog or public storage buckets.
