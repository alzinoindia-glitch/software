// ALZINO Product Image Store
// Product photos (front & back) are stored in a dedicated on-device IndexedDB
// database instead of localStorage, because base64 images quickly exceed the
// ~5MB localStorage quota. Inventory records only keep a lightweight reference
// (`images: { front: true, back: true, v: <timestamp> }`).

import { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { getAuthenticatorIdentity } from './authenticatorSession';

const DB_NAME = 'ALZINO_PRODUCT_IMAGES';
const STORE = 'images';
const PUBLIC_CATALOG_BUCKET = 'catalog-product-images';
export const IMAGE_SIDES = ['front', 'back'];

let dbPromise = null;
let authorizedOrgCache = { orgId: null, expiresAt: 0, pending: null };
let authCacheGeneration = 0;
const signedImageUrls = new Map();
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
const publicRemotePath = remotePath;
const publicImageVersions = new Map();

const getAuthorizedOrganization = async () => {
  if (!isSupabaseConfigured()) return null;
  if (authorizedOrgCache.expiresAt > Date.now()) return authorizedOrgCache.orgId;
  if (authorizedOrgCache.pending) return authorizedOrgCache.pending;
  const client = getSupabaseClient();
  if (!client) return null;
  const generation = authCacheGeneration;
  const pending = (async () => {
    let orgId = null;
    try {
      const identity = getAuthenticatorIdentity();
      if (!identity) return null;
      const { data: profile } = await client.from('profiles').select('organization_id, is_active').eq('id', identity.id).maybeSingle();
      orgId = profile?.is_active && profile.organization_id === identity.organizationId ? profile.organization_id : null;
      return orgId;
    } finally {
      if (generation === authCacheGeneration) authorizedOrgCache = { orgId, expiresAt: Date.now() + 15_000, pending: null };
    }
  })();
  authorizedOrgCache.pending = pending;
  return pending;
};

if (typeof window !== 'undefined') {
  window.addEventListener('alzino-cloud-auth-changed', () => {
    authCacheGeneration++;
    authorizedOrgCache = { orgId: null, expiresAt: 0, pending: null };
    signedImageUrls.clear();
  });
}

const uploadRemoteImage = async (organizationId, productId, side, dataUrl) => {
  const blob = await fetch(dataUrl).then(response => response.blob());
  const { error } = await getSupabaseClient().storage.from('product-images').upload(
    remotePath(organizationId, productId, side),
    blob,
    { upsert: true, contentType: blob.type || 'image/jpeg', cacheControl: '3600' }
  );
  if (error) throw error;
  signedImageUrls.delete(remotePath(organizationId, productId, side));
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
      const path = remotePath(organizationId, productId, side);
      const cached = signedImageUrls.get(path);
      if (cached?.expiresAt > Date.now()) return cached.url;
      const { data, error } = await getSupabaseClient().storage.from('product-images').createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) {
        signedImageUrls.set(path, { url: data.signedUrl, expiresAt: Date.now() + 55 * 60 * 1000 });
        return data.signedUrl;
      }
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
    const { error: publicError } = await getSupabaseClient().storage.from(PUBLIC_CATALOG_BUCKET).remove(paths);
    if (publicError) throw publicError;
    paths.forEach(path => signedImageUrls.delete(path));
    paths.forEach(path => publicImageVersions.delete(path));
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
  const uploads = Object.entries(images).flatMap(([key, dataUrl]) => {
    const separator = key.lastIndexOf(':');
    const productId = key.slice(0, separator);
    const side = key.slice(separator + 1);
    return productId && IMAGE_SIDES.includes(side) && dataUrl ? [[productId, side, dataUrl]] : [];
  });
  let count = 0;
  for (let i = 0; i < uploads.length; i += 4) {
    const batch = uploads.slice(i, i + 4);
    await Promise.all(batch.map(([productId, side, dataUrl]) => uploadRemoteImage(organizationId, productId, side, dataUrl)));
    count += batch.length;
  }
  return { count };
};

const readLocalProductImage = async (productId, side) => {
  try {
    const db = await openDb();
    return await new Promise(resolve => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(keyFor(productId, side));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const getPrivateProductImageBlob = async (organizationId, productId, side) => {
  const local = await readLocalProductImage(productId, side);
  if (local) {
    try {
      const response = await fetch(local);
      if (response.ok) return response.blob();
    } catch {}
  }
  const { data, error } = await getSupabaseClient().storage.from('product-images')
    .createSignedUrl(remotePath(organizationId, productId, side), 300);
  if (error || !data?.signedUrl) return null;
  const response = await fetch(data.signedUrl);
  return response.ok ? response.blob() : null;
};

/**
 * Copy only published product photos into the public catalog bucket. Original
 * photos remain in the private bucket; draft products never receive public URLs.
 */
export const syncPublishedProductImagesToCloud = async (organizationId, products = []) => {
  const client = getSupabaseClient();
  if (!client || !organizationId) return new Map();
  const imageUrls = new Map();
  const removals = [];
  const uploads = [];

  products.forEach(product => {
    if (!product?.id) return;
    const shouldPublish = Number(product.stock) > 0 && product.isPublished !== false && product.status !== 'Archived';
    IMAGE_SIDES.forEach(side => {
      const path = publicRemotePath(organizationId, product.id, side);
      if (!shouldPublish || product.images?.[side] === false) {
        removals.push(path);
        publicImageVersions.delete(path);
        return;
      }
      const inlineImage = side === 'front'
        ? (product.frontImage || product.image)
        : product.backImage;
      const hasImage = Boolean(product.images?.[side] || (typeof inlineImage === 'string' && inlineImage.startsWith('data:image/')));
      if (!hasImage) return;
      const version = String(product.images?.v || product.updatedAt || 'stored');
      if (publicImageVersions.get(path) === version) {
        const { data } = client.storage.from(PUBLIC_CATALOG_BUCKET).getPublicUrl(path);
        if (data?.publicUrl) imageUrls.set(String(product.id), imageUrls.get(String(product.id)) || data.publicUrl);
        return;
      }
      uploads.push({ product, side, path, version, inlineImage });
    });
  });

  for (let index = 0; index < removals.length; index += 100) {
    const { error } = await client.storage.from(PUBLIC_CATALOG_BUCKET).remove(removals.slice(index, index + 100));
    if (error) console.warn('[ProductImages] Public catalog photo cleanup deferred:', error.message);
  }

  for (let index = 0; index < uploads.length; index += 4) {
    await Promise.all(uploads.slice(index, index + 4).map(async ({ product, side, path, version, inlineImage }) => {
      try {
        const blob = typeof inlineImage === 'string' && inlineImage.startsWith('data:image/')
          ? await fetch(inlineImage).then(response => response.blob())
          : await getPrivateProductImageBlob(organizationId, product.id, side);
        if (!blob) return;
        const { error } = await client.storage.from(PUBLIC_CATALOG_BUCKET).upload(path, blob, {
          upsert: true,
          contentType: blob.type || 'image/jpeg',
          cacheControl: '3600'
        });
        if (error) throw error;
        publicImageVersions.set(path, version);
        const { data } = client.storage.from(PUBLIC_CATALOG_BUCKET).getPublicUrl(path);
        if (data?.publicUrl) imageUrls.set(String(product.id), imageUrls.get(String(product.id)) || data.publicUrl);
      } catch (error) {
        console.warn(`[ProductImages] Public photo sync deferred for ${product.id}:`, error.message);
      }
    }));
  }

  return imageUrls;
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
      const publicBucket = getSupabaseClient().storage.from(PUBLIC_CATALOG_BUCKET);
      const publicPaths = [];
      const collectPublic = async (prefix) => {
        const { data, error } = await publicBucket.list(prefix, { limit: 1000 });
        if (error) throw error;
        for (const item of data || []) {
          const path = `${prefix}/${item.name}`;
          if (item.id) publicPaths.push(path);
          else await collectPublic(path);
        }
      };
      await collectPublic(organizationId);
      for (let i = 0; i < publicPaths.length; i += 100) {
        const { error } = await publicBucket.remove(publicPaths.slice(i, i + 100));
        if (error) throw error;
      }
    }
  } catch (error) {
    console.warn('[ProductImages] Cloud photo cleanup failed:', error.message);
  }
  signedImageUrls.clear();
  return localCleared;
};
