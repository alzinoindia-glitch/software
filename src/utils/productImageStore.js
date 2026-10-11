// ALZINO Product Image Store
// Product photos (front & back) are stored in a dedicated on-device IndexedDB
// database instead of localStorage, because base64 images quickly exceed the
// ~5MB localStorage quota. Inventory records only keep a lightweight reference
// (`images: { front: true, back: true, v: <timestamp> }`).

import { useEffect, useState } from 'react';

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

export const saveProductImage = (productId, side, dataUrl) =>
  tx('readwrite', (s) => (dataUrl ? s.put(dataUrl, keyFor(productId, side)) : s.delete(keyFor(productId, side))));

export const getProductImage = async (productId, side) => {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(keyFor(productId, side));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const deleteProductImages = (productId) =>
  tx('readwrite', (s) => IMAGE_SIDES.forEach((side) => s.delete(keyFor(productId, side))));

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
