import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { clearSsdIndexedDb } from './syncAndStorageEngine';
import { clearAllProductImages } from './productImageStore';

const SYNC_TABLE = 'alzino_erp_sync';
const STORE_STATE_TABLE = 'store_state';

const KEY_TO_DOMAIN = {
  INVENTORY: 'inventory',
  INVOICES: 'invoices',
  CUSTOMERS: 'customers',
  REPAIR_JOBS: 'repairJobs',
  USED_PURCHASES: 'usedPurchases',
  SUPPLIERS: 'suppliers',
  EXPENSES: 'expenses',
  SHOP_CONFIG: 'shopConfig'
};

const DOMAIN_TO_KEY = {
  inventory: 'INVENTORY',
  invoices: 'INVOICES',
  customers: 'CUSTOMERS',
  repairJobs: 'REPAIR_JOBS',
  usedPurchases: 'USED_PURCHASES',
  suppliers: 'SUPPLIERS',
  expenses: 'EXPENSES',
  shopConfig: 'SHOP_CONFIG'
};

const SYNC_KEYS = [
  'INVENTORY',
  'INVOICES',
  'CUSTOMERS',
  'REPAIR_JOBS',
  'USED_PURCHASES',
  'SUPPLIERS',
  'EXPENSES',
  'WARRANTY_CLAIMS',
  'SHOP_CONFIG'
];

let cachedOrgId = null;

/**
 * Find or create active Organization ID from Supabase
 */
export const getActiveOrgId = async (client) => {
  if (cachedOrgId) return cachedOrgId;
  try {
    const saved = localStorage.getItem('ALZINO_ERP_ORG_ID');
    if (saved) {
      cachedOrgId = saved;
      return saved;
    }
    // Query existing organizations
    const { data: orgs } = await client.from('organizations').select('id, slug').limit(1);
    if (orgs && orgs.length > 0) {
      cachedOrgId = orgs[0].id;
      localStorage.setItem('ALZINO_ERP_ORG_ID', orgs[0].id);
      return orgs[0].id;
    }
  } catch (err) {
    console.debug('[CloudSync] Org ID lookup notice:', err);
  }
  return null;
};

// Debounce map for automatic continuous saving to cloud
const debounceTimers = {};

/**
 * Push a single collection into Supabase (debounced by 1.2s)
 */
export const pushCollectionToCloud = (key, data) => {
  if (!isSupabaseConfigured()) return;
  const client = getSupabaseClient();
  if (!client) return;

  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }

  debounceTimers[key] = setTimeout(async () => {
    try {
      const orgId = await getActiveOrgId(client);
      const domain = KEY_TO_DOMAIN[key];

      // 1. If store_state schema is present and we have an orgId or domain:
      if (domain && orgId) {
        const { error: storeErr } = await client
          .from(STORE_STATE_TABLE)
          .upsert({
            organization_id: orgId,
            domain,
            payload: data || [],
            updated_at: new Date().toISOString()
          }, { onConflict: 'organization_id,domain' });

        if (!storeErr) {
          console.debug(`[CloudSync] ✓ Synced ${domain} to store_state`);
          return;
        }
      }

      // 2. Fallback to alzino_erp_sync key-value table:
      const payload = {
        key,
        data: data || [],
        updated_at: new Date().toISOString()
      };
      const { error } = await client
        .from(SYNC_TABLE)
        .upsert(payload, { onConflict: 'key' });

      if (error) {
        console.warn(`[CloudSync] Error saving ${key} to Supabase:`, error.message);
      } else {
        console.debug(`[CloudSync] ✓ Synced ${key} to Supabase`);
      }
    } catch (err) {
      console.warn(`[CloudSync] Exception saving ${key}:`, err);
    }
  }, 1200);
};

/**
 * Fetch and populate all collections from Supabase into app state
 */
export const pullAllFromCloud = async (setters = {}) => {
  if (!isSupabaseConfigured()) {
    return { success: false, reason: 'Supabase not configured' };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, reason: 'No client available' };
  }

  try {
    const orgId = await getActiveOrgId(client);

    // 1. Check store_state table first (Official Database Schema)
    try {
      let storeQuery = client.from(STORE_STATE_TABLE).select('organization_id, domain, payload, updated_at');
      if (orgId) {
        storeQuery = storeQuery.eq('organization_id', orgId);
      }
      const { data: storeRows, error: storeErr } = await storeQuery;

      if (!storeErr && storeRows && storeRows.length > 0) {
        let loaded = 0;
        storeRows.forEach(row => {
          const k = DOMAIN_TO_KEY[row.domain];
          if (k && setters[k] && row.payload !== undefined) {
            setters[k](row.payload);
            try {
              localStorage.setItem(`ALZINO_ERP_${k}`, JSON.stringify(row.payload));
            } catch (e) {}
            loaded++;
          }
        });
        if (loaded > 0) {
          return { success: true, count: loaded, source: 'store_state' };
        }
      }
    } catch (e) {
      console.debug('[CloudSync] store_state check notice:', e);
    }

    // 2. Fallback to alzino_erp_sync table
    const { data, error } = await client
      .from(SYNC_TABLE)
      .select('key, data, updated_at');

    if (error) {
      console.warn('[CloudSync] Error pulling from Supabase:', error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: true, count: 0, message: 'Cloud database is currently empty' };
    }

    let loadedCount = 0;
    data.forEach(row => {
      const { key, data: colData } = row;
      if (setters[key] && colData !== undefined) {
        setters[key](colData);
        try {
          localStorage.setItem(`ALZINO_ERP_${key}`, JSON.stringify(colData));
        } catch (e) {}
        loadedCount++;
      }
    });

    return { success: true, count: loadedCount, source: 'alzino_erp_sync' };
  } catch (err) {
    console.warn('[CloudSync] Exception during pullAllFromCloud:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Push all local store state collections to Supabase in 1 batch
 */
export const pushAllToCloud = async (stateObj = {}) => {
  if (!isSupabaseConfigured()) {
    return { success: false, reason: 'Supabase not configured' };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, reason: 'No client available' };
  }

  try {
    const orgId = await getActiveOrgId(client);

    // 1. If store_state schema is accessible and we have orgId:
    if (orgId) {
      const domainRecords = [];
      Object.entries(KEY_TO_DOMAIN).forEach(([k, domain]) => {
        if (stateObj[k] !== undefined) {
          domainRecords.push({
            organization_id: orgId,
            domain,
            payload: stateObj[k] || [],
            updated_at: new Date().toISOString()
          });
        }
      });

      if (domainRecords.length > 0) {
        const { error: storeErr } = await client
          .from(STORE_STATE_TABLE)
          .upsert(domainRecords, { onConflict: 'organization_id,domain' });

        if (!storeErr) {
          return { success: true, count: domainRecords.length, target: 'store_state' };
        }
      }
    }

    // 2. Fallback to alzino_erp_sync
    const records = [];
    SYNC_KEYS.forEach(k => {
      if (stateObj[k] !== undefined) {
        records.push({
          key: k,
          data: stateObj[k],
          updated_at: new Date().toISOString()
        });
      }
    });

    if (records.length === 0) return { success: true, count: 0 };

    const { error } = await client
      .from(SYNC_TABLE)
      .upsert(records, { onConflict: 'key' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: records.length, target: 'alzino_erp_sync' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Subscribe to Supabase Realtime broadcast across both schemas
 */
export const subscribeRealtimeSync = (setters = {}) => {
  if (!isSupabaseConfigured()) return () => {};
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('alzino-erp-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: STORE_STATE_TABLE },
        (payload) => {
          const row = payload.new;
          if (row && row.domain) {
            const k = DOMAIN_TO_KEY[row.domain];
            if (k && setters[k] && row.payload !== undefined) {
              console.log(`[CloudSync] Live update received from store_state: ${row.domain}`);
              setters[k](row.payload);
              try {
                localStorage.setItem(`ALZINO_ERP_${k}`, JSON.stringify(row.payload));
              } catch (e) {}
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SYNC_TABLE },
        (payload) => {
          const row = payload.new;
          if (row && row.key && setters[row.key] && row.data !== undefined) {
            console.log(`[CloudSync] Live update received from alzino_erp_sync: ${row.key}`);
            setters[row.key](row.data);
            try {
              localStorage.setItem(`ALZINO_ERP_${row.key}`, JSON.stringify(row.data));
            } catch (e) {}
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[CloudSync] Realtime subscription error:', err);
    return () => {};
  }
};

/**
 * Wipe all collections from Supabase tables (store_state and alzino_erp_sync)
 */
export const wipeAllDataFromCloud = async () => {
  if (!isSupabaseConfigured()) return { success: false, reason: 'Supabase not configured' };
  const client = getSupabaseClient();
  if (!client) return { success: false, reason: 'No client' };

  try {
    const orgId = await getActiveOrgId(client);
    if (orgId) {
      await client.from(STORE_STATE_TABLE).delete().eq('organization_id', orgId);
    } else {
      await client.from(STORE_STATE_TABLE).delete().neq('domain', '');
    }
    await client.from(SYNC_TABLE).delete().neq('key', '');
    console.log('[CloudSync] ✓ Cleared cloud tables');
    return { success: true };
  } catch (err) {
    console.warn('[CloudSync] Error wiping cloud data:', err);
    return { success: false, error: err };
  }
};

/**
 * Master purge: removes all offline-first local data and resets database cleanly
 */
export const purgeAllLegacyOfflineData = async (setters = {}) => {
  const legacyKeys = [
    'INVENTORY',
    'INVOICES',
    'CUSTOMERS',
    'REPAIR_JOBS',
    'USED_PURCHASES',
    'SUPPLIERS',
    'EXPENSES',
    'WARRANTY_CLAIMS'
  ];

  // 1. Wipe from LocalStorage
  legacyKeys.forEach(k => {
    try {
      localStorage.removeItem(`ALZINO_ERP_${k}`);
    } catch (e) {}
  });

  // 2. Clear IndexedDB stores
  try {
    await clearSsdIndexedDb();
    await clearAllProductImages();
  } catch (e) {
    console.debug('IndexedDB purge error:', e);
  }

  // 3. Clear from cloud if configured
  try {
    await wipeAllDataFromCloud();
  } catch (e) {
    console.debug('Cloud wipe error:', e);
  }

  // 4. Update React state if setters provided
  if (setters.setInventory) setters.setInventory([]);
  if (setters.setInvoices) setters.setInvoices([]);
  if (setters.setCustomers) setters.setCustomers([]);
  if (setters.setRepairJobs) setters.setRepairJobs([]);
  if (setters.setUsedPurchases) setters.setUsedPurchases([]);
  if (setters.setSuppliers) setters.setSuppliers([]);
  if (setters.setExpenses) setters.setExpenses([]);
  if (setters.setWarrantyClaims) setters.setWarrantyClaims([]);

  // 5. Broadcast to other open browser tabs
  try {
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}

  return { success: true };
};
