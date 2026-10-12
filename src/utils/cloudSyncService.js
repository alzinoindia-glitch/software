import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { clearSsdIndexedDb } from './syncAndStorageEngine';
import { clearAllProductImages, syncAllProductImagesToCloud } from './productImageStore';

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

export const getActiveOrgId = async (client = getSupabaseClient()) => {
  if (!client) return null;
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return null;

  const { data: profile, error } = await client
    .from('profiles')
    .select('organization_id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile?.is_active || !profile.organization_id) return null;
  return profile.organization_id;
};

const authRequired = () => ({ success: false, reason: 'Sign in with an authorized shop account to sync data.' });

export const pushCollectionToCloud = (key, data) => {
  if (!isSupabaseConfigured() || !KEY_TO_DOMAIN[key]) return;
  if (conflictedDomains.has(key)) return;
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  const serialized = serializePayload(data);
  const domain = KEY_TO_DOMAIN[key];
  const knownScope = [...versionByScope.keys()].find(scope => scope.endsWith(`:${domain}`));
  if (knownScope && lastCloudPayloads.get(knownScope) === serialized) {
    pendingCloudWrites.delete(key);
    return;
  }
  const previousPending = pendingCloudWrites.get(key);
  const pending = {
    serialized,
    data,
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
      const { data: { user } } = await client.auth.getUser();
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
          payload: data ?? [],
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null
        }).select('version').maybeSingle();
        error = result.error;
        savedVersion = result.data?.version;
      } else {
        const result = await client.from(STORE_STATE_TABLE).update({
          payload: data ?? [],
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null
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
        const latestLocal = pendingCloudWrites.get(key)?.data ?? data ?? [];
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
  } else {
    versionByScope.set(scope, 0);
    lastCloudPayloads.delete(scope);
  }
  setter?.(payload);
  try { localStorage.setItem(`ALZINO_ERP_${key}`, JSON.stringify(payload)); } catch {}
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
  const { data: { user } } = await client.auth.getUser();

  const rows = Object.entries(KEY_TO_DOMAIN)
    .filter(([key]) => stateObj[key] !== undefined)
    .map(([key, domain]) => ({
      organization_id: orgId,
      domain,
      payload: stateObj[key] ?? [],
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null
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
          if (pendingCloudWrites.has(key)) {
            versionByScope.set(scope, 0);
            lastCloudPayloads.delete(scope);
            return;
          }
          versionByScope.delete(scope);
          lastCloudPayloads.set(scope, serializePayload([]));
          setters[key]([]);
          try { localStorage.setItem(`ALZINO_ERP_${key}`, '[]'); } catch {}
          return;
        }
        if (row.payload === undefined) return;
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
  const { data: authListener } = client.auth.onAuthStateChange(() => {
    setTimeout(() => subscribeForCurrentUser().catch(err => console.warn('[CloudSync] Realtime subscription error:', err)), 0);
  });
  const handleAuthReady = () => subscribeForCurrentUser().catch(err => console.warn('[CloudSync] Realtime subscription error:', err));
  window.addEventListener('alzino-cloud-auth-ready', handleAuthReady);

  return () => {
    cancelled = true;
    authListener.subscription.unsubscribe();
    window.removeEventListener('alzino-cloud-auth-ready', handleAuthReady);
    if (channel) client.removeChannel(channel);
  };
};

export const wipeAllDataFromCloud = async () => {
  if (!isSupabaseConfigured()) return { success: false, reason: 'Supabase is not configured.' };
  const client = getSupabaseClient();
  const orgId = await getActiveOrgId(client);
  if (!orgId) return authRequired();
  const { error } = await client.from(STORE_STATE_TABLE).delete().eq('organization_id', orgId);
  if (!error) {
    for (const key of SYNC_KEYS) {
      const scope = scopeKey(orgId, key);
      lastCloudPayloads.delete(scope);
      versionByScope.delete(scope);
    }
  }
  return error ? { success: false, error: error.message } : { success: true };
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
  try { await wipeAllDataFromCloud(); } catch (e) { console.debug('Cloud wipe error:', e); }

  if (setters.setInventory) setters.setInventory([]);
  if (setters.setInvoices) setters.setInvoices([]);
  if (setters.setCustomers) setters.setCustomers([]);
  if (setters.setRepairJobs) setters.setRepairJobs([]);
  if (setters.setUsedPurchases) setters.setUsedPurchases([]);
  if (setters.setSuppliers) setters.setSuppliers([]);
  if (setters.setExpenses) setters.setExpenses([]);
  if (setters.setWarrantyClaims) setters.setWarrantyClaims([]);
  window.dispatchEvent(new Event('storage'));
  return { success: true };
};
