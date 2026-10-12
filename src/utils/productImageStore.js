// ALZINO Product Image Store
// Product photos (front & back) are stored in a dedicated on-device IndexedDB
// database instead of localStorage, because base64 images quickly exceed the
// ~5MB localStorage quota. Inventory records only keep a lightweight reference
// (`images: { front: true, back: true, v: <timestamp> }`).

import { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const DB_NAME = 'ALZINO_PRODUCT_IMAGES';
const STORE = 'images';
export const IMAGE_SIDES = ['front', 'back'];

let dbPromise = null;
const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const keyFor = (productId, side) => `${productId}:${side}`;
const remotePath = (organizationId, productId, side) => `${organizationId}/${productId}/${side}.jpg`;

const getAuthorizedOrganization = async () => {
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const [{ data: { user } }, { data: assurance }] = await Promise.all([
    client.auth.getUser(),
    client.auth.mfa.getAuthenticatorAssuranceLevel()
  ]);
  if (!user || assurance?.currentLevel !== 'aal2') return null;
  const { data: profile } = await client.from('profiles').select('organization_id, is_active').eq('id', user.id).maybeSingle();
  return profile?.is_active ? profile.organization_id : null;
};

const uploadRemoteImage = async (organizationId, productId, side, dataUrl) => {
  const blob = await fetch(dataUrl).then(response => response.blob());
  const { error } = await getSupabaseClient().storage.from('product-images').upload(
    remotePath(organizationId, productId, side),
    blob,
    { upsert: true, contentType: blob.type || 'image/jpeg', cacheControl: '3600' }
  );
  if (error) throw error;
};

const tx = async (mode, fn) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const result = fn(store);
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  });
};

export const saveProductImage = async (productId, side, dataUrl) => {
  await tx('readwrite', store => (dataUrl ? store.put(dataUrl, keyFor(productId, side)) : store.delete(keyFor(productId, side))));
  try {
    const organizationId = await getAuthorizedOrganization();
    if (!organizationId) return;
    if (dataUrl) {
      await uploadRemoteImage(organizationId, productId, side, dataUrl);
    } else {
      const { error } = await getSupabaseClient().storage.from('product-images').remove([remotePath(organizationId, productId, side)]);
      if (error) throw error;
    }
  } catch (error) {
    // Keep the offline copy. A later manual cloud push can retry the upload.
    console.warn('[ProductImages] Cloud photo sync deferred:', error.message);
  }
};

export const getProductImage = async (productId, side) => {
  try {
    const db = await openDb();
    const localImage = await new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(keyFor(productId, side));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    const organizationId = await getAuthorizedOrganization();
    if (organizationId) {
      const { data, error } = await getSupabaseClient().storage.from('product-images').createSignedUrl(remotePath(organizationId, productId, side), 3600);
      if (!error && data?.signedUrl) return data.signedUrl;
    }
    return localImage;
  } catch {
    return null;
  }
};

export const deleteProductImages = async (productId) => {
  await tx('readwrite', store => IMAGE_SIDES.forEach(side => store.delete(keyFor(productId, side))));
  try {
    const organizationId = await getAuthorizedOrganization();
    if (!organizationId) return;
    const paths = IMAGE_SIDES.map(side => remotePath(organizationId, productId, side));
    const { error } = await getSupabaseClient().storage.from('product-images').remove(paths);
    if (error) throw error;
  } catch (error) {
    console.warn('[ProductImages] Cloud photo removal deferred:', error.message);
  }
};

// Export every stored image (used by SSD backups so photos travel with the data)
export const exportAllProductImages = async () => {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const out = {};
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) { out[cursor.key] = cursor.value; cursor.continue(); } else resolve(out);
      };
      req.onerror = () => resolve(out);
    });
  } catch {
    return {};
  }
};

export const syncAllProductImagesToCloud = async (organizationId) => {
  const client = getSupabaseClient();
  if (!client || !organizationId) return { count: 0 };
  const images = await exportAllProductImages();
  let count = 0;
  for (const [key, dataUrl] of Object.entries(images)) {
    const separator = key.lastIndexOf(':');
    const productId = key.slice(0, separator);
    const side = key.slice(separator + 1);
    if (!productId || !IMAGE_SIDES.includes(side) || !dataUrl) continue;
    await uploadRemoteImage(organizationId, productId, side, dataUrl);
    count++;
  }
  return { count };
};

export const importAllProductImages = (map = {}) =>
  tx('readwrite', (s) => Object.entries(map).forEach(([k, v]) => s.put(v, k)));

/**
 * Compress an uploaded/captured image file into a JPEG data URL.
 * Keeps photos crisp enough for catalog display while staying ~40–90KB each.
 */
export const compressImageFile = (file, maxSize = 720, quality = 0.78) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Please choose an image file (JPG, PNG, WEBP or HEIC).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

/**
 * React hook: loads a product's stored front/back images.
 * `version` should change whenever images are updated (product.images.v).
 */
export const useProductImages = (productId, version) => {
  const [images, setImages] = useState({ front: null, back: null });
  useEffect(() => {
    let cancelled = false;
    if (!productId) {
      setImages({ front: null, back: null });
      return undefined;
    }
    Promise.all(IMAGE_SIDES.map((side) => getProductImage(productId, side))).then(([front, back]) => {
      if (!cancelled) setImages({ front, back });
    });
    return () => { cancelled = true; };
  }, [productId, version]);
  return images;
};

export const clearAllProductImages = async () => {
  let localCleared = false;
  try {
    const db = await openDb();
    localCleared = await new Promise((resolve) => {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).clear();
      t.oncomplete = () => resolve(true);
      t.onerror = () => resolve(false);
    });
  } catch {
    localCleared = false;
  }
  try {
    const organizationId = await getAuthorizedOrganization();
    if (organizationId) {
      const bucket = getSupabaseClient().storage.from('product-images');
      const paths = [];
      const collect = async (prefix) => {
        const { data, error } = await bucket.list(prefix, { limit: 1000 });
        if (error) throw error;
        for (const item of data || []) {
          const path = `${prefix}/${item.name}`;
          if (item.id) paths.push(path);
          else await collect(path);
        }
      };
      await collect(organizationId);
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await bucket.remove(paths.slice(i, i + 100));
        if (error) throw error;
      }
    }
  } catch (error) {
    console.warn('[ProductImages] Cloud photo cleanup failed:', error.message);
  }
  return localCleared;
};
