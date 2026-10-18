import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { getAuthenticatorIdentity } from './authenticatorSession';
import { clearSsdIndexedDb } from './syncAndStorageEngine';
import { clearAllProductImages, syncAllProductImagesToCloud, getPublishedProductImageUrls, getPublicProductImageUrlFromSignedUrl } from './productImageStore';
import { getProductSellingPrice } from './storefrontProductRules';
import { sanitizePublicSpecifications } from './productSpecifications';

const STORE_STATE_TABLE = 'store_state';

const KEY_TO_DOMAIN = {
  INVENTORY: 'inventory',
  INVOICES: 'invoices',
  CUSTOMERS: 'customers',
  REPAIR_JOBS: 'repairJobs',
  USED_PURCHASES: 'usedPurchases',
  SUPPLIERS: 'suppliers',
  EXPENSES: 'expenses',
  WARRANTY_CLAIMS: 'warrantyClaims',
  SHOP_CONFIG: 'shopConfig',
  CUSTOM_TAXONOMY: 'customTaxonomy',
  CUSTOM_TECHNICIANS: 'customTechnicians'
};

const DOMAIN_TO_KEY = Object.fromEntries(Object.entries(KEY_TO_DOMAIN).map(([key, domain]) => [domain, key]));
const SYNC_KEYS = Object.keys(KEY_TO_DOMAIN);
const debounceTimers = {};
const lastCloudPayloads = new Map();
const versionByScope = new Map();
const pendingCloudWrites = new Map();
const conflictedDomains = new Set();
const scopeKey = (orgId, key) => `${orgId}:${KEY_TO_DOMAIN[key]}`;
const serializePayload = payload => JSON.stringify(payload ?? []);
// A default UPI QR is already stored on its account record. Older settings
// duplicated the same (potentially large) base64 image at the shop-config
// root as well. Keep compatibility for legacy configs without that account,
// but canonicalize synced configs to a single copy.
const compactCloudPayload = (key, payload) => {
  if (key !== 'SHOP_CONFIG' || !payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const defaultAccount = (payload.upiAccounts || []).find(account => account?.isDefault) || payload.upiAccounts?.[0];
  if (!defaultAccount?.qrCodeImage || payload.qrCodeImage !== defaultAccount.qrCodeImage) return payload;
  return { ...payload, qrCodeImage: null };
};
const knownDomainsStorageKey = orgId => `ALZINO_ERP_CLOUD_DOMAINS_${orgId}`;

const getKnownCloudDomains = orgId => {
  try {
    const parsed = JSON.parse(localStorage.getItem(knownDomainsStorageKey(orgId)) || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const rememberCloudDomain = (orgId, key) => {
  try {
    const known = getKnownCloudDomains(orgId);
    known.add(key);
    localStorage.setItem(knownDomainsStorageKey(orgId), JSON.stringify([...known]));
  } catch {}
};

let publicCatalogTimer = null;
let publicCatalogRevision = 0;
// Keep a per-session catalog snapshot so an inventory edit does not download
// every public product row again just to compute the next incremental upsert.
const publishedCatalogSnapshots = new Map();

const fetchPublishedCatalogSnapshot = async (client, organizationId) => {
  const fullColumns = 'id, name, brand, category, sell_price, mrp, stock_status, image_url, offer_text, is_published, specifications, description';
  const legacyColumns = 'id, name, brand, category, sell_price, mrp, stock_status, image_url, offer_text, is_published';
  const fetchAllRows = async columns => {
    const rows = [];
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await client.from('catalog_products')
        .select(columns)
        .eq('organization_id', organizationId)
        .order('id')
        .range(from, from + pageSize - 1);
      if (error) return { rows: null, error };
      rows.push(...(data || []));
      if (!data || data.length < pageSize) return { rows, error: null };
    }
  };

  let result = await fetchAllRows(fullColumns);
  let supportsProductDetails = true;
  if (result.error && /specifications|description|column/i.test(result.error.message || '')) {
    supportsProductDetails = false;
    result = await fetchAllRows(legacyColumns);
  }
  if (result.error) throw result.error;
  return { rows: result.rows, supportsProductDetails };
};

export const getActiveOrgId = async (client = getSupabaseClient()) => {
  if (!client) return null;
  const identity = getAuthenticatorIdentity();
  if (!identity) return null;

  const { data: profile, error } = await client
    .from('profiles')
    .select('organization_id, is_active')
    .eq('id', identity.id)
    .maybeSingle();

  if (error || !profile?.is_active || !profile.organization_id || profile.organization_id !== identity.organizationId) return null;
  return profile.organization_id;
};

// Remove only rows that were included in a verified local archive. A domain is
// updated only if its cloud version still matches the archived snapshot.
export const purgeArchivedCloudRecords = async (archiveOrganizationId, archiveCutoff, archiveDomains, purgePlan) => {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return { success: false, reason: 'Supabase is not configured.' };
  const orgId = await getActiveOrgId(client);
  if (!orgId) return { success: false, reason: 'Sign in with an authorized shop account to archive cloud data.' };
  const identity = getAuthenticatorIdentity();
  const { data: profile, error: profileError } = await client.from('profiles').select('role, is_active').eq('id', identity?.id).maybeSingle();
  if (profileError || !profile?.is_active || profile.role !== 'admin' || identity?.portal !== 'admin') return { success: false, reason: 'Only an active admin account can permanently remove archived records.' };
  if (String(archiveOrganizationId) !== String(orgId)) return { success: false, reason: 'This archive belongs to a different shop and cannot be used to delete this shop’s data.' };

  const domainNames = Object.keys(purgePlan || {});
  const allowedDomains = new Set(['invoices', 'expenses', 'repairJobs', 'usedPurchases', 'warrantyClaims']);
  if (domainNames.some(domain => !allowedDomains.has(domain))) return { success: false, reason: 'Archive cleanup includes a protected record type.' };
  const expected = archiveDomains || {};
  const currentRows = {};
  for (const domain of domainNames) {
    const key = DOMAIN_TO_KEY[domain];
    const archivedRow = expected[domain];
    if (!key || !archivedRow || !Array.isArray(archivedRow.payload)) {
      return { success: false, reason: `Archive is missing a valid ${domain} snapshot.` };
    }
    const { data, error } = await client.from(STORE_STATE_TABLE)
      .select('payload, version')
      .eq('organization_id', orgId)
      .eq('domain', domain)
      .maybeSingle();
    if (error) return { success: false, reason: error.message };
    if (!data || Number(data.version || 0) !== Number(archivedRow.version || 0) ||
        serializePayload(data.payload) !== serializePayload(archivedRow.payload)) {
      return { success: false, reason: `${domain} changed after this archive was made. Create a fresh archive before deleting cloud records.` };
    }
    const requestedIds = new Set((purgePlan[domain] || []).map(String));
    const validIds = new Set(data.payload.filter(record => {
      const rawDate = record?.date || record?.createdAt || record?.created_at || record?.invoiceDate || record?.purchaseDate;
      const timestamp = rawDate ? Date.parse(rawDate) : NaN;
      const id = record?.id ?? record?.invoiceNo ?? record?.jobId ?? record?.voucherNo ?? record?.claimId;
      const status = String(record?.paymentStatus || '').toLowerCase();
      const settled = !status.includes('due') && !status.includes('unpaid') && !status.includes('pending') && Number(record?.balanceDue || record?.balance || 0) <= 0 && Number(record?.khataDue || 0) <= 0;
      let domainEligible = domain === 'expenses' || domain === 'usedPurchases';
      if (domain === 'invoices') domainEligible = settled;
      if (domain === 'repairJobs') domainEligible = record?.status === 'Delivered' && Number(record?.balanceDue || 0) <= 0;
      if (domain === 'warrantyClaims') domainEligible = ['closed', 'resolved', 'completed'].includes(String(record?.status || '').toLowerCase());
      return id != null && Number.isFinite(timestamp) && timestamp < new Date(`${archiveCutoff}T00:00:00`).getTime() && domainEligible;
    }).map(record => String(record?.id ?? record?.invoiceNo ?? record?.jobId ?? record?.voucherNo ?? record?.claimId)));
    if ([...requestedIds].some(id => !validIds.has(id))) return { success: false, reason: `The ${domain} cleanup list contains records outside the selected date or closure rules.` };
    currentRows[domain] = { key, row: data };
  }

  const updatedDomains = {};
  for (const domain of domainNames) {
    const { key, row } = currentRows[domain];
    const ids = new Set((purgePlan[domain] || []).map(String));
    const nextPayload = row.payload.filter(record => !ids.has(String(record?.id ?? record?.invoiceNo ?? record?.jobId ?? record?.voucherNo ?? record?.claimId ?? '')));
    if (nextPayload.length === row.payload.length) {
      updatedDomains[domain] = nextPayload;
      continue;
    }
    const { data, error } = await client.from(STORE_STATE_TABLE)
      .update({ payload: nextPayload, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('domain', domain)
      .eq('version', row.version)
      .select('version')
      .maybeSingle();
    if (error || !data) return { success: false, reason: error?.message || `${domain} changed during deletion. Some earlier archive domains may already be cleared; keep this SSD archive safe.` };
    const scope = scopeKey(orgId, key);
    versionByScope.set(scope, Number(data.version || Number(row.version) + 1));
    lastCloudPayloads.set(scope, serializePayload(nextPayload));
    pendingCloudWrites.delete(key);
    if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
    updatedDomains[domain] = nextPayload;
  }
  return { success: true, updatedDomains };
};

export const syncPublishedCatalog = (inventory = []) => {
  if (!isSupabaseConfigured()) return;
  if (publicCatalogTimer) clearTimeout(publicCatalogTimer);
  // Inventory updates are immutable in the app; keep the existing array
  // reference instead of cloning every product and its nested IMEI/image data.
  const snapshot = Array.isArray(inventory) ? inventory : [];
  const revision = ++publicCatalogRevision;
  publicCatalogTimer = setTimeout(async () => {
    try {
      const client = getSupabaseClient();
      const organizationId = await getActiveOrgId(client);
      if (!organizationId || revision !== publicCatalogRevision) return;
      const catalogImageUrls = await getPublishedProductImageUrls(organizationId, snapshot);
      if (revision !== publicCatalogRevision) return;

      const products = snapshot.filter(item => item?.id && item?.name).map(item => {
        const stock = Math.max(0, Number(item.stock) || 0);
        const sellPrice = getProductSellingPrice(item);
        const imageCandidates = [item.imageUrl, item.publicImageUrl, item.image];
        const publicImage = imageCandidates
          .find(image => typeof image === 'string' && /^https?:\/\//i.test(image) && !/\/storage\/v1\/object\/sign\//i.test(image)) ||
          imageCandidates.map(getPublicProductImageUrlFromSignedUrl).find(Boolean) ||
          catalogImageUrls.get(String(item.id)) || null;
        const publicSpecifications = sanitizePublicSpecifications(item.specifications);
        const specifications = { ...(publicSpecifications && typeof publicSpecifications === 'object' && !Array.isArray(publicSpecifications) ? publicSpecifications : {}) };
        ['ram', 'storage', 'capacity', 'color'].forEach(key => {
          const value = item[key];
          if (value != null && String(value).trim()) specifications[key] = String(value).trim();
        });
        return {
          organization_id: organizationId,
          id: String(item.id),
          name: String(item.name).trim(),
          brand: item.brand || null,
          category: item.category || null,
          sell_price: sellPrice,
          // `catalog_products` requires MRP to be at least the selling price.
          // Inventory imports often use 0 for an unknown MRP, so publish that
          // as NULL instead of rejecting the entire catalog sync.
          mrp: Number(item.mrp) >= sellPrice && Number(item.mrp) > 0 ? Number(item.mrp) : null,
          stock_status: stock > 0 ? 'Available in store' : 'Out of stock',
          image_url: publicImage,
          specifications,
          description: String(item.description || '').trim() || null,
          offer_text: item.offer?.label || item.offerText || null,
          is_published: stock > 0 && sellPrice > 0 && item.isPublished !== false && item.status !== 'Archived',
          updated_at: new Date().toISOString()
        };
      });

      let catalogSnapshot = publishedCatalogSnapshots.get(organizationId);
      if (!catalogSnapshot) {
        catalogSnapshot = await fetchPublishedCatalogSnapshot(client, organizationId);
        if (revision !== publicCatalogRevision) return;
        catalogSnapshot.products = new Map(catalogSnapshot.rows.map(item => [String(item.id), item]));
        delete catalogSnapshot.rows;
        publishedCatalogSnapshots.set(organizationId, catalogSnapshot);
      }
      const { products: existingById, supportsProductDetails } = catalogSnapshot;
      const changedProducts = products.filter(product => {
        const current = existingById.get(String(product.id));
        if (!current) return true;
        return current.name !== product.name ||
          current.brand !== product.brand ||
          current.category !== product.category ||
          Number(current.sell_price) !== product.sell_price ||
          (current.mrp == null ? null : Number(current.mrp)) !== product.mrp ||
          current.stock_status !== product.stock_status ||
          current.image_url !== product.image_url ||
          current.offer_text !== product.offer_text ||
          (supportsProductDetails && (JSON.stringify(current.specifications || {}) !== JSON.stringify(product.specifications) ||
          (current.description || null) !== product.description)) ||
          current.is_published !== product.is_published;
      });
      if (changedProducts.length) {
        const rowsToUpsert = supportsProductDetails ? changedProducts : changedProducts.map(({ specifications, description, ...product }) => product);
        const { error } = await client.from('catalog_products').upsert(rowsToUpsert, {
          onConflict: 'organization_id,id'
        });
        if (error) throw error;
      }

      const currentIds = new Set(products.map(item => item.id));
      const removedIds = [...existingById.keys()].filter(id => !currentIds.has(id));
      for (let offset = 0; offset < removedIds.length; offset += 500) {
        if (revision !== publicCatalogRevision) return;
        const { error } = await client.from('catalog_products')
          .delete()
          .eq('organization_id', organizationId)
          .in('id', removedIds.slice(offset, offset + 500));
        if (error) throw error;
      }
      if (revision !== publicCatalogRevision) return;
      catalogSnapshot.products = new Map(products.map(product => [String(product.id), product]));
    } catch (error) {
      console.warn('[PublicCatalog] Could not sync storefront products:', error.message);
    }
  }, 500);
};

const authRequired = () => ({ success: false, reason: 'Sign in with an authorized shop account to sync data.' });

export const pushCollectionToCloud = (key, data) => {
  if (!isSupabaseConfigured() || !KEY_TO_DOMAIN[key]) return;
  if (conflictedDomains.has(key)) return;
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  const cloudData = compactCloudPayload(key, data);
  const serialized = serializePayload(cloudData);
  const domain = KEY_TO_DOMAIN[key];
  const knownScope = [...versionByScope.keys()].find(scope => scope.endsWith(`:${domain}`));
  if (knownScope && lastCloudPayloads.get(knownScope) === serialized) {
    pendingCloudWrites.delete(key);
    return;
  }
  const previousPending = pendingCloudWrites.get(key);
  const pending = {
    serialized,
    data: cloudData,
    baseVersion: previousPending?.baseVersion ?? (knownScope ? versionByScope.get(knownScope) : undefined)
  };
  pendingCloudWrites.set(key, pending);

  debounceTimers[key] = setTimeout(async () => {
    const currentPending = pendingCloudWrites.get(key);
    if (!currentPending || currentPending.serialized !== serialized) return;
    try {
      const client = getSupabaseClient();
      const orgId = await getActiveOrgId(client);
      if (!orgId) {
        if (pendingCloudWrites.get(key)?.serialized === serialized) pendingCloudWrites.delete(key);
        return;
      }
      const scope = scopeKey(orgId, key);
      // Realtime pulls update React state too. Skip writing the same snapshot
      // back to Supabase so one update doesn't create an echo loop.
      if (lastCloudPayloads.get(scope) === serialized) {
        pendingCloudWrites.delete(key);
        return;
      }
      const identity = getAuthenticatorIdentity();
      let expectedVersion = currentPending.baseVersion ?? versionByScope.get(scope);
      if (expectedVersion === undefined) {
        const { data: current, error: readError } = await client
          .from(STORE_STATE_TABLE)
          .select('payload, version')
          .eq('organization_id', orgId)
          .eq('domain', KEY_TO_DOMAIN[key])
          .maybeSingle();
        if (readError) throw readError;
        if (current) {
          expectedVersion = Number(current.version || 1);
          versionByScope.set(scope, expectedVersion);
          lastCloudPayloads.set(scope, serializePayload(current.payload));
          if (lastCloudPayloads.get(scope) === serialized) return;
        } else {
          expectedVersion = 0;
          versionByScope.set(scope, 0);
        }
      }

      let savedVersion;
      let error;
      if (expectedVersion === 0) {
        const result = await client.from(STORE_STATE_TABLE).insert({
          organization_id: orgId,
          domain: KEY_TO_DOMAIN[key],
          payload: cloudData ?? [],
          updated_at: new Date().toISOString(),
          updated_by: identity?.id ?? null
        }).select('version').maybeSingle();
        error = result.error;
        savedVersion = result.data?.version;
      } else {
        const result = await client.from(STORE_STATE_TABLE).update({
          payload: cloudData ?? [],
          updated_at: new Date().toISOString(),
          updated_by: identity?.id ?? null
        })
          .eq('organization_id', orgId)
          .eq('domain', KEY_TO_DOMAIN[key])
          .eq('version', expectedVersion)
          .select('version')
          .maybeSingle();
        error = result.error;
        savedVersion = result.data?.version;
      }

      if (error) {
        // Concurrent first inserts are resolved the same way as stale updates.
        if (error.code !== '23505') throw error;
      }
      if (!savedVersion) {
        const { data: latest, error: latestError } = await client
          .from(STORE_STATE_TABLE)
          .select('payload, version')
          .eq('organization_id', orgId)
          .eq('domain', KEY_TO_DOMAIN[key])
          .maybeSingle();
        if (latestError) throw latestError;
        const latestPayload = latest?.payload ?? [];
        const latestVersion = Number(latest?.version || 0);
        const latestLocal = pendingCloudWrites.get(key)?.data ?? cloudData ?? [];
        const conflictKey = `ALZINO_ERP_SYNC_CONFLICT_${KEY_TO_DOMAIN[key]}`;
        try { localStorage.setItem(conflictKey, JSON.stringify({ payload: latestLocal, savedAt: new Date().toISOString() })); } catch {}
        versionByScope.set(scope, latestVersion);
        lastCloudPayloads.set(scope, serializePayload(latestPayload));
        conflictedDomains.add(key);
        pendingCloudWrites.delete(key);
        window.dispatchEvent(new CustomEvent('alzino-cloud-sync-conflict', {
          detail: { key, localPayload: latestLocal, cloudPayload: latestPayload, conflictKey }
        }));
        return;
      }
      versionByScope.set(scope, Number(savedVersion));
      lastCloudPayloads.set(scope, serialized);
      const newerPending = pendingCloudWrites.get(key);
      if (newerPending?.serialized === serialized) pendingCloudWrites.delete(key);
      else if (newerPending) newerPending.baseVersion = Number(savedVersion);
      try { localStorage.removeItem(`ALZINO_ERP_SYNC_CONFLICT_${KEY_TO_DOMAIN[key]}`); } catch {}
    } catch (err) {
      console.warn(`[CloudSync] Could not save ${key}:`, err);
      if (pendingCloudWrites.get(key)?.serialized === serialized) pendingCloudWrites.delete(key);
    }
  }, 500);
};

export const resolveCloudConflict = (key) => conflictedDomains.delete(key);

export const pullAllFromCloud = async (setters = {}) => {
  if (!isSupabaseConfigured()) return { success: false, reason: 'Supabase is not configured.' };
  const client = getSupabaseClient();
  if (!client) return { success: false, reason: 'Supabase client is unavailable.' };
  const orgId = await getActiveOrgId(client);
  if (!orgId) return authRequired();

  const { data, error } = await client
    .from(STORE_STATE_TABLE)
    .select('domain, payload, updated_at, version')
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };
  let count = 0;
  const foundDomains = new Set();
  (data || []).forEach(row => {
    const key = DOMAIN_TO_KEY[row.domain];
    if (!key || !setters[key] || row.payload === undefined) return;
    foundDomains.add(key);
    rememberCloudDomain(orgId, key);
    const scope = scopeKey(orgId, key);
    lastCloudPayloads.set(scope, serializePayload(row.payload));
    versionByScope.set(scope, Number(row.version || 1));
    setters[key](row.payload);
    try { localStorage.setItem(`ALZINO_ERP_${key}`, JSON.stringify(row.payload)); } catch {}
    count++;
  });
  for (const key of SYNC_KEYS) {
    if (foundDomains.has(key)) continue;
    versionByScope.set(scopeKey(orgId, key), 0);
    lastCloudPayloads.delete(scopeKey(orgId, key));
    // An absent row means "empty" only on devices that previously received
    // that domain from this shop. Preserve first-device local data so it can
    // still be deliberately seeded to a new, empty shop cloud.
    if (getKnownCloudDomains(orgId).has(key)) {
      pendingCloudWrites.delete(key);
      if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
      conflictedDomains.delete(key);
      setters[key]?.([]);
      try { localStorage.setItem(`ALZINO_ERP_${key}`, '[]'); } catch {}
      try { localStorage.removeItem(`ALZINO_ERP_SYNC_CONFLICT_${KEY_TO_DOMAIN[key]}`); } catch {}
    }
  }
  return { success: true, count, source: STORE_STATE_TABLE };
};

export const pullCollectionFromCloud = async (key, setter) => {
  if (!isSupabaseConfigured() || !KEY_TO_DOMAIN[key]) return { success: false, reason: 'Supabase is not configured.' };
  const client = getSupabaseClient();
  const orgId = await getActiveOrgId(client);
  if (!orgId) return authRequired();
  const { data: row, error } = await client
    .from(STORE_STATE_TABLE)
    .select('payload, version')
    .eq('organization_id', orgId)
    .eq('domain', KEY_TO_DOMAIN[key])
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  const scope = scopeKey(orgId, key);
  const payload = row?.payload ?? [];
  if (row) {
    versionByScope.set(scope, Number(row.version || 1));
    lastCloudPayloads.set(scope, serializePayload(payload));
    rememberCloudDomain(orgId, key);
  } else {
    versionByScope.set(scope, 0);
    lastCloudPayloads.set(scope, serializePayload([]));
    if (getKnownCloudDomains(orgId).has(key)) {
      setter?.([]);
      try { localStorage.setItem(`ALZINO_ERP_${key}`, '[]'); } catch {}
      try { localStorage.removeItem(`ALZINO_ERP_SYNC_CONFLICT_${KEY_TO_DOMAIN[key]}`); } catch {}
    }
  }
  if (row) {
    setter?.(payload);
    try { localStorage.setItem(`ALZINO_ERP_${key}`, JSON.stringify(payload)); } catch {}
  }
  return { success: true, count: row ? 1 : 0, payload };
};

export const pushAllToCloud = async (stateObj = {}) => {
  if (!isSupabaseConfigured()) return { success: false, reason: 'Supabase is not configured.' };
  const client = getSupabaseClient();
  const orgId = await getActiveOrgId(client);
  if (!orgId) return authRequired();

  const { data: currentRows, error: readError } = await client
    .from(STORE_STATE_TABLE)
    .select('domain, payload, version')
    .eq('organization_id', orgId);
  if (readError) return { success: false, error: readError.message };
  const hasExistingBusinessData = currentRows?.some(row => {
    if (row.domain === 'shopConfig') return false;
    if (Array.isArray(row.payload)) return row.payload.length > 0;
    return row.payload && typeof row.payload === 'object' && Object.keys(row.payload).length > 0;
  });
  if (hasExistingBusinessData) {
    return { success: false, reason: 'The shop cloud already has data. Pull it to this device before syncing more changes.' };
  }
  const identity = getAuthenticatorIdentity();

  const rows = Object.entries(KEY_TO_DOMAIN)
    .filter(([key]) => stateObj[key] !== undefined)
    .map(([key, domain]) => ({
      organization_id: orgId,
      domain,
      payload: compactCloudPayload(key, stateObj[key]) ?? [],
      updated_at: new Date().toISOString(),
      updated_by: identity?.id ?? null
    }));

  if (!rows.length) return { success: true, count: 0, target: STORE_STATE_TABLE };
  // A first-device upload is only allowed when the cloud has no business
  // records. Use ignoreDuplicates so a row inserted by another device after
  // the preflight read can never be overwritten by this older local snapshot.
  const { error } = await client.from(STORE_STATE_TABLE).upsert(rows, {
    onConflict: 'organization_id,domain',
    ignoreDuplicates: true
  });
  if (error) return { success: false, error: error.message };
  const { data: savedRows, error: savedRowsError } = await client
    .from(STORE_STATE_TABLE)
    .select('domain, payload, version')
    .eq('organization_id', orgId);
  if (savedRowsError) return { success: false, error: savedRowsError.message };
  rows.forEach(row => {
    const key = DOMAIN_TO_KEY[row.domain];
    if (key) {
      const scope = scopeKey(orgId, key);
      const savedRow = savedRows?.find(current => current.domain === row.domain);
      versionByScope.set(scope, Number(savedRow?.version || 0));
      if (savedRow) lastCloudPayloads.set(scope, serializePayload(savedRow.payload));
    }
  });
  try {
    const { count: imagesCount } = await syncAllProductImagesToCloud(orgId);
    return { success: true, count: rows.length, imagesCount, target: STORE_STATE_TABLE };
  } catch (imageError) {
    return { success: false, error: `Shop data was uploaded, but product photos did not finish syncing: ${imageError.message}` };
  }
};

export const subscribeRealtimeSync = (setters = {}) => {
  if (!isSupabaseConfigured()) return () => {};
  const client = getSupabaseClient();
  if (!client) return () => {};
  let cancelled = false;
  let channel = null;
  let activeOrgId = null;
  const subscribeForCurrentUser = async () => {
    const orgId = await getActiveOrgId(client);
    if (cancelled) return;
    if (!orgId) {
      if (channel) await client.removeChannel(channel);
      channel = null;
      activeOrgId = null;
      return;
    }
    if (orgId === activeOrgId) return;
    if (channel) await client.removeChannel(channel);
    activeOrgId = orgId;
    channel = client.channel(`store-state-${orgId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: STORE_STATE_TABLE,
        filter: `organization_id=eq.${orgId}`
      }, payload => {
        const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
        const key = row?.domain && DOMAIN_TO_KEY[row.domain];
        if (!key || !setters[key]) return;
        const scope = scopeKey(orgId, key);
        if (payload.eventType === 'DELETE') {
          rememberCloudDomain(orgId, key);
          pendingCloudWrites.delete(key);
          if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
          conflictedDomains.delete(key);
          versionByScope.set(scope, 0);
          lastCloudPayloads.set(scope, serializePayload([]));
          setters[key]([]);
          try { localStorage.setItem(`ALZINO_ERP_${key}`, '[]'); } catch {}
          try { localStorage.removeItem(`ALZINO_ERP_SYNC_CONFLICT_${KEY_TO_DOMAIN[key]}`); } catch {}
          return;
        }
        if (row.payload === undefined) return;
        rememberCloudDomain(orgId, key);
        const serialized = serializePayload(row.payload);
        const incomingVersion = Number(row.version || 1);
        const knownVersion = versionByScope.get(scope) || 0;
        if (incomingVersion < knownVersion) return;
        versionByScope.set(scope, incomingVersion);
        const pending = pendingCloudWrites.get(key);
        if (pending) {
          if (pending.serialized !== serialized) lastCloudPayloads.set(scope, serialized);
          return;
        }
        if (conflictedDomains.has(key)) {
          lastCloudPayloads.set(scope, serialized);
          return;
        }
        if (lastCloudPayloads.get(scope) === serialized) {
          return;
        }
        lastCloudPayloads.set(scope, serialized);
        setters[key](row.payload);
        try { localStorage.setItem(`ALZINO_ERP_${key}`, JSON.stringify(row.payload)); } catch {}
      })
      .subscribe();
  };
  subscribeForCurrentUser().catch(err => console.warn('[CloudSync] Realtime subscription error:', err));
  const handleAuthReady = () => subscribeForCurrentUser().catch(err => console.warn('[CloudSync] Realtime subscription error:', err));
  window.addEventListener('alzino-cloud-auth-ready', handleAuthReady);
  window.addEventListener('alzino-cloud-auth-changed', handleAuthReady);

  return () => {
    cancelled = true;
    window.removeEventListener('alzino-cloud-auth-ready', handleAuthReady);
    window.removeEventListener('alzino-cloud-auth-changed', handleAuthReady);
    if (channel) client.removeChannel(channel);
  };
};

export const wipeAllDataFromCloud = async () => {
  if (!isSupabaseConfigured()) return { success: false, reason: 'Supabase is not configured.' };
  const client = getSupabaseClient();
  const orgId = await getActiveOrgId(client);
  if (!orgId) return authRequired();
  if (publicCatalogTimer) clearTimeout(publicCatalogTimer);
  publicCatalogTimer = null;
  publicCatalogRevision++;
  for (const key of SYNC_KEYS) {
    if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
    pendingCloudWrites.delete(key);
    conflictedDomains.delete(key);
  }
  const { error: stateError } = await client.from(STORE_STATE_TABLE).delete().eq('organization_id', orgId);
  if (stateError) return { success: false, error: stateError.message };
  for (const key of SYNC_KEYS) {
    const scope = scopeKey(orgId, key);
    lastCloudPayloads.set(scope, serializePayload([]));
    versionByScope.set(scope, 0);
    rememberCloudDomain(orgId, key);
  }
  const { error: catalogError } = await client.from('catalog_products').delete().eq('organization_id', orgId);
  if (catalogError) return { success: false, error: `Store data was removed, but the public catalog could not be cleared: ${catalogError.message}` };
  return { success: true };
};

export const purgeAllLegacyOfflineData = async (setters = {}) => {
  SYNC_KEYS.filter(key => key !== 'SHOP_CONFIG').forEach(key => {
    try { localStorage.removeItem(`ALZINO_ERP_${key}`); } catch {}
  });
  try {
    await clearSsdIndexedDb();
    await clearAllProductImages();
  } catch (e) {
    console.debug('IndexedDB purge error:', e);
  }
  let cloudResult;
  try { cloudResult = await wipeAllDataFromCloud(); }
  catch (e) { cloudResult = { success: false, reason: e?.message || 'Cloud deletion failed.' }; }

  if (setters.setInventory) setters.setInventory([]);
  if (setters.setInvoices) setters.setInvoices([]);
  if (setters.setCustomers) setters.setCustomers([]);
  if (setters.setRepairJobs) setters.setRepairJobs([]);
  if (setters.setUsedPurchases) setters.setUsedPurchases([]);
  if (setters.setSuppliers) setters.setSuppliers([]);
  if (setters.setExpenses) setters.setExpenses([]);
  if (setters.setWarrantyClaims) setters.setWarrantyClaims([]);
  window.dispatchEvent(new Event('storage'));
  return { success: true, cloudResult };
};
