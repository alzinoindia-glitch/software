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
  SHOP_CONFIG: 'shopConfig'
};

const DOMAIN_TO_KEY = Object.fromEntries(Object.entries(KEY_TO_DOMAIN).map(([key, domain]) => [domain, key]));
const SYNC_KEYS = Object.keys(KEY_TO_DOMAIN);
const debounceTimers = {};

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
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);

  debounceTimers[key] = setTimeout(async () => {
    try {
      const client = getSupabaseClient();
      const orgId = await getActiveOrgId(client);
      if (!orgId) return;
      const { data: { user } } = await client.auth.getUser();
      const { error } = await client.from(STORE_STATE_TABLE).upsert({
        organization_id: orgId,
        domain: KEY_TO_DOMAIN[key],
        payload: data ?? [],
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null
      }, { onConflict: 'organization_id,domain' });

      if (error) console.warn(`[CloudSync] Could not save ${key}:`, error.message);
    } catch (err) {
      console.warn(`[CloudSync] Could not save ${key}:`, err);
    }
  }, 1200);
};

export const pullAllFromCloud = async (setters = {}) => {
  if (!isSupabaseConfigured()) return { success: false, reason: 'Supabase is not configured.' };
  const client = getSupabaseClient();
  if (!client) return { success: false, reason: 'Supabase client is unavailable.' };
  const orgId = await getActiveOrgId(client);
  if (!orgId) return authRequired();

  const { data, error } = await client
    .from(STORE_STATE_TABLE)
    .select('domain, payload, updated_at')
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };
  let count = 0;
  (data || []).forEach(row => {
    const key = DOMAIN_TO_KEY[row.domain];
    if (!key || !setters[key] || row.payload === undefined) return;
    setters[key](row.payload);
    try { localStorage.setItem(`ALZINO_ERP_${key}`, JSON.stringify(row.payload)); } catch {}
    count++;
  });
  return { success: true, count, source: STORE_STATE_TABLE };
};

export const pushAllToCloud = async (stateObj = {}) => {
  if (!isSupabaseConfigured()) return { success: false, reason: 'Supabase is not configured.' };
  const client = getSupabaseClient();
  const orgId = await getActiveOrgId(client);
  if (!orgId) return authRequired();

  const { data: currentRows, error: readError } = await client
    .from(STORE_STATE_TABLE)
    .select('domain, payload')
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
  const { error } = await client.from(STORE_STATE_TABLE).upsert(rows, { onConflict: 'organization_id,domain' });
  if (error) return { success: false, error: error.message };
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
        const row = payload.new;
        const key = row?.domain && DOMAIN_TO_KEY[row.domain];
        if (!key || !setters[key] || row.payload === undefined) return;
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
