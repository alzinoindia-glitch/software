import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const SYNC_TABLE = 'alzino_erp_sync';
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

// Debounce map for automatic continuous saving to cloud
const debounceTimers = {};

/**
 * Push a single collection into Supabase (debounced by 1s)
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
        // Also update local storage so offline cache remains updated
        try {
          localStorage.setItem(`ALZINO_ERP_${key}`, JSON.stringify(colData));
        } catch (e) {}
        loadedCount++;
      }
    });

    return { success: true, count: loadedCount };
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

    return { success: true, count: records.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Subscribe to Supabase Realtime postgres_changes
 * Whenever another device or admin edits inventory or bills, this device receives the change live!
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
        { event: '*', schema: 'public', table: SYNC_TABLE },
        (payload) => {
          const row = payload.new;
          if (row && row.key && setters[row.key] && row.data !== undefined) {
            console.log(`[CloudSync] Live update received from another login for: ${row.key}`);
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
