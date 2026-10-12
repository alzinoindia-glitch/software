import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://iaugdtkalwjcwnjadony.supabase.co';

// Retrieve credentials from .env or localStorage config
export const getSupabaseCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const customConfig = localStorage.getItem('ALZINO_ERP_SUPABASE_CONFIG');
    if (customConfig) {
      const parsed = JSON.parse(customConfig);
      return {
        url: (parsed.url || envUrl || DEFAULT_SUPABASE_URL).trim(),
        anonKey: (parsed.anonKey || envKey || '').trim()
      };
    }
  } catch (e) {
    console.debug('Error reading local supabase config:', e);
  }

  if (envKey) {
    return { url: (envUrl || DEFAULT_SUPABASE_URL).trim(), anonKey: envKey.trim() };
  }

  return { url: DEFAULT_SUPABASE_URL, anonKey: '' };
};

export const isSupabaseConfigured = () => {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 20);
};

let cachedClient = null;
let lastUrl = '';
let lastKey = '';

export const getSupabaseClient = () => {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

  if (cachedClient && lastUrl === url && lastKey === anonKey) {
    return cachedClient;
  }

  lastUrl = url;
  lastKey = anonKey;
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return cachedClient;
};

export const saveSupabaseCredentials = (url, anonKey) => {
  if (!url || !anonKey) {
    localStorage.removeItem('ALZINO_ERP_SUPABASE_CONFIG');
    cachedClient = null;
    return;
  }
  localStorage.setItem('ALZINO_ERP_SUPABASE_CONFIG', JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
  cachedClient = null; // force re-instantiation
};
