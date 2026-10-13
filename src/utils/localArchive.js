import { getActiveOrgId } from './cloudSyncService';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { exportAllProductImages } from './productImageStore';
import { getAuthenticatorIdentity } from './authenticatorSession';

const ARCHIVE_FORMAT = 'alzino-ssd-archive';
const ARCHIVE_VERSION = 1;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = bytes => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

const fromBase64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

const deriveArchiveKey = async (password, salt) => {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const blobToDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Could not read a product photo.'));
  reader.readAsDataURL(blob);
});

const appendCloudImages = async (organizationId, assets) => {
  const client = getSupabaseClient();
  const bucket = client.storage.from('product-images');
  let folders = [];
  const { data, error } = await bucket.list(organizationId, { limit: 1000, offset: 0 });
  if (error) throw new Error(`Could not list product photos: ${error.message}`);
  folders = (data || []).filter(item => item.id === null || item.metadata === null).map(item => item.name);
  for (const productId of folders) {
    const { data: files, error: listError } = await bucket.list(`${organizationId}/${productId}`, { limit: 100, offset: 0 });
    if (listError) throw new Error(`Could not list photos for product ${productId}: ${listError.message}`);
    for (const file of (files || []).filter(item => item.name && /\.(jpg|jpeg|png|webp)$/i.test(item.name))) {
      const path = `${organizationId}/${productId}/${file.name}`;
      const { data: blob, error: downloadError } = await bucket.download(path);
      if (downloadError) throw new Error(`Could not download ${file.name}: ${downloadError.message}`);
      assets[`${productId}:${file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '')}`] = await blobToDataUrl(blob);
    }
  }
};

const recordDate = record => {
  const raw = record?.date || record?.createdAt || record?.created_at || record?.invoiceDate || record?.purchaseDate;
  const time = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(time) ? time : null;
};

const stableRecordId = record => record?.id ?? record?.invoiceNo ?? record?.jobId ?? record?.voucherNo ?? record?.claimId ?? null;
const isSettled = record => {
  const status = String(record?.paymentStatus || '').toLowerCase();
  return !status.includes('due') && !status.includes('unpaid') && !status.includes('pending') &&
    Number(record?.balanceDue || record?.balance || 0) <= 0 && Number(record?.khataDue || 0) <= 0;
};

const eligibleForRemoval = (domain, record) => {
  if (domain === 'invoices') return isSettled(record);
  if (domain === 'repairJobs') return record?.status === 'Delivered' && Number(record?.balanceDue || 0) <= 0;
  if (domain === 'warrantyClaims') return ['closed', 'resolved', 'completed'].includes(String(record?.status || '').toLowerCase());
  return domain === 'expenses' || domain === 'usedPurchases';
};

export const buildSsdArchive = async ({ cutoff, password }) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const client = getSupabaseClient();
  const organizationId = await getActiveOrgId(client);
  if (!organizationId) throw new Error('Sign in with an authorized admin shop account before creating an archive.');
  const identity = getAuthenticatorIdentity();
  const { data: profile, error: profileError } = await client.from('profiles').select('role, is_active').eq('id', identity?.id).maybeSingle();
  if (profileError || !profile?.is_active || profile.role !== 'admin' || identity?.portal !== 'admin') throw new Error('Only an active admin account can create a shop archive.');
  const { data: rows, error } = await client.from('store_state')
    .select('domain, payload, version, updated_at')
    .eq('organization_id', organizationId);
  if (error) throw new Error(`Could not read shop data: ${error.message}`);

  const domains = Object.fromEntries((rows || []).map(row => [row.domain, {
    payload: row.payload,
    version: Number(row.version || 0),
    updatedAt: row.updated_at || null
  }]));
  const cutoffTime = new Date(`${cutoff}T00:00:00`).getTime();
  const purgePlan = {};
  for (const domain of ['invoices', 'expenses', 'repairJobs', 'usedPurchases', 'warrantyClaims']) {
    const payload = domains[domain]?.payload;
    if (!Array.isArray(payload)) continue;
    const ids = payload.filter(record => {
      const date = recordDate(record);
      const id = stableRecordId(record);
      return id != null && date != null && date < cutoffTime && eligibleForRemoval(domain, record);
    }).map(stableRecordId).map(String);
    if (ids.length) purgePlan[domain] = ids;
  }

  const assets = await exportAllProductImages();
  await appendCloudImages(organizationId, assets);
  const archive = {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    archiveId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    organizationId,
    cutoff,
    domains,
    assets,
    purgePlan,
    recordCounts: Object.fromEntries(Object.entries(domains).map(([domain, value]) => [domain, Array.isArray(value.payload) ? value.payload.length : 0]))
  };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveArchiveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(archive)));
  return {
    archiveId: archive.archiveId,
    cutoff,
    recordCounts: archive.recordCounts,
    purgeCounts: Object.fromEntries(Object.entries(purgePlan).map(([domain, ids]) => [domain, ids.length])),
    file: new Blob([JSON.stringify({ format: ARCHIVE_FORMAT, version: ARCHIVE_VERSION, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) })], { type: 'application/json' })
  };
};

export const saveSsdArchive = async (file, suggestedName) => {
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'Encrypted ALZINO archive', accept: { 'application/json': ['.alzino.json'] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();
    return;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

export const openSsdArchive = async (file, password) => {
  const envelope = JSON.parse(await file.text());
  if (envelope?.format !== ARCHIVE_FORMAT || envelope?.version !== ARCHIVE_VERSION) throw new Error('This is not a supported ALZINO SSD archive.');
  const key = await deriveArchiveKey(password, fromBase64(envelope.salt));
  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.ciphertext));
  } catch {
    throw new Error('Could not unlock this archive. Check the archive password and try again.');
  }
  const archive = JSON.parse(decoder.decode(plaintext));
  if (archive?.format !== ARCHIVE_FORMAT || archive.version !== ARCHIVE_VERSION || !archive.archiveId || !archive.domains) {
    throw new Error('The archive contents are incomplete or invalid.');
  }
  return archive;
};
