// Product Terms & Conditions presets, URL barcode/QR resolution & variant aggregation for ALZINO
import { getProductSellingPrice } from './storefrontProductRules';

export const STANDARD_PRODUCT_TERMS_PRESETS = [
  {
    id: 'brand-warranty-1yr',
    label: '🛡️ 1 Year Brand Warranty',
    text: '1 Year Official Manufacturer Brand Warranty valid across all authorized service centers across India.'
  },
  {
    id: 'replace-7day',
    label: '⚡ 7-Day Replacement',
    text: '7-Day replacement guarantee from date of invoice against genuine manufacturing hardware defects.'
  },
  {
    id: 'no-physical-damage',
    label: '🚫 Physical / Water Damage Excluded',
    text: 'Warranty strictly does not cover accidental screen drops, glass cracks, liquid/water ingress, or unauthorized third-party tampering.'
  },
  {
    id: 'box-bill-mandatory',
    label: '📦 Original Box & Bill Mandatory',
    text: 'Original product packaging with matching IMEI barcode label and store tax invoice are mandatory for warranty claims or service support.'
  },
  {
    id: 'sealed-genuine',
    label: '✨ 100% Genuine Sealed Unit',
    text: '100% Brand New, genuine Indian retail stock with valid IMEI registered on brand warranty server.'
  },
  {
    id: 'accessories-6mo',
    label: '🔌 In-Box Accessories Warranty',
    text: 'In-box charging adapter, USB cable, and battery carry 6 months official brand warranty.'
  },
  {
    id: 'exchange-credit',
    label: '🏷️ Store Exchange Policy',
    text: 'No cash refunds. In case of verified hardware defect within 7 days, exchange for identical unit or store credit will be issued.'
  },
  {
    id: 'store-care-support',
    label: '🛠️ Free ALZINO Store Support',
    text: 'Free claim submission guidance, invoice re-print, and diagnostics assistance provided at ALZINO Bodhan store.'
  }
];

export const DEFAULT_PRODUCT_TERMS = [
  STANDARD_PRODUCT_TERMS_PRESETS[0].text,
  STANDARD_PRODUCT_TERMS_PRESETS[1].text,
  STANDARD_PRODUCT_TERMS_PRESETS[2].text,
  STANDARD_PRODUCT_TERMS_PRESETS[3].text
];

/**
 * Normalizes terms and conditions from any format (string, array of strings, or undefined)
 */
export function normalizeProductTerms(terms) {
  if (!terms) return [...DEFAULT_PRODUCT_TERMS];
  if (Array.isArray(terms)) {
    const cleaned = terms.map(t => typeof t === 'string' ? t.trim() : (t?.text || '')).filter(Boolean);
    return cleaned.length > 0 ? cleaned : [...DEFAULT_PRODUCT_TERMS];
  }
  if (typeof terms === 'string' && terms.trim()) {
    // If separated by newlines or bullets
    const lines = terms.split(/\r?\n|•/).map(s => s.trim()).filter(Boolean);
    return lines.length > 0 ? lines : [terms.trim()];
  }
  return [...DEFAULT_PRODUCT_TERMS];
}

/**
 * Generate a smart scan URL for product QR code
 */
export function buildProductScanUrl(product, baseUrl = '') {
  if (!product) return '';
  const origin = baseUrl || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://alzino.shop');
  const prodId = product.id || product.barcode || '';
  return `${origin}/?product=${encodeURIComponent(prodId)}`;
}

/**
 * Look up a product in inventory by any scanned QR URL, raw barcode, ID or IMEI
 */
export function findProductFromScan(query, inventory = []) {
  if (!query || !inventory || inventory.length === 0) return null;
  let clean = String(query).trim();

  // If query is a URL (e.g. https://alzino.shop/?product=PROD-1234 or /?product=...)
  if (clean.includes('product=') || clean.includes('scan=') || clean.includes('code=')) {
    try {
      const url = new URL(clean, 'https://alzino.shop');
      const paramVal = url.searchParams.get('product') || url.searchParams.get('scan') || url.searchParams.get('code');
      if (paramVal) clean = decodeURIComponent(paramVal).trim();
    } catch {
      const match = clean.match(/(?:product|scan|code)=([^&#]+)/i);
      if (match && match[1]) {
        clean = decodeURIComponent(match[1]).trim();
      }
    }
  }

  // Also strip any leading QR- prefix if comparing with raw ID
  const lowerClean = clean.toLowerCase();

  // 1. Exact ID match
  let found = inventory.find(i => (i.id || '').toLowerCase() === lowerClean);
  if (found) return found;

  // 2. Barcode match (primary barcode)
  found = inventory.find(i => (i.barcode || '').toLowerCase() === lowerClean);
  if (found) return found;

  // 3. Any barcode in barcodes array
  found = inventory.find(i => Array.isArray(i.barcodes) && i.barcodes.some(b => (b || '').toLowerCase() === lowerClean));
  if (found) return found;

  // 4. IMEI match
  found = inventory.find(i => {
    if (Array.isArray(i.imeis) && i.imeis.some(im => (im || '').toLowerCase() === lowerClean)) return true;
    if (i.imei1 && i.imei1.toLowerCase() === lowerClean) return true;
    if (i.imei2 && i.imei2.toLowerCase() === lowerClean) return true;
    if (Array.isArray(i.units)) {
      return i.units.some(u => 
        (u.imei1 && u.imei1.toLowerCase() === lowerClean) ||
        (u.imei2 && u.imei2.toLowerCase() === lowerClean) ||
        (u.barcode && u.barcode.toLowerCase() === lowerClean)
      );
    }
    return false;
  });
  if (found) return found;

  // 5. Fallback: Check if clean string is contained in ID or barcode
  found = inventory.find(i => (i.id || '').toLowerCase().includes(lowerClean) || (i.barcode || '').toLowerCase().includes(lowerClean));
  return found || null;
}

/**
 * Find all available color variants for a product model across inventory and units
 */
export function findAvailableColorsForProduct(product, inventory = []) {
  if (!product) return [];

  const colorMap = new Map();

  // 1. Add current product's own color
  if (product.color) {
    const key = product.color.trim().toLowerCase();
    colorMap.set(key, {
      id: product.id,
      color: product.color.trim(),
      colorHex: product.colorHex || '#333333',
      image: product.image || null,
      images: product.images || null,
      stock: product.stock || 0,
      sellPrice: getProductSellingPrice(product),
      mrp: product.mrp,
      ram: product.ram,
      storage: product.storage,
      isCurrent: true
    });
  }

  // 2. Look for sibling products in inventory with the same brand and model
  const prodBrand = (product.brand || '').trim().toLowerCase();
  const prodModel = (product.model || '').trim().toLowerCase();

  if (prodBrand && (prodModel || product.name)) {
    inventory.forEach(item => {
      const itemBrand = (item.brand || '').trim().toLowerCase();
      const itemModel = (item.model || '').trim().toLowerCase();

      const isModelMatch = prodModel && itemModel
        ? (itemBrand === prodBrand && itemModel === prodModel)
        : (itemBrand === prodBrand && item.name && product.name && item.name.toLowerCase().includes(prodModel || prodBrand));

      if (isModelMatch && item.color) {
        const key = item.color.trim().toLowerCase();
        const existing = colorMap.get(key);
        if (!existing) {
          colorMap.set(key, {
            id: item.id,
            color: item.color.trim(),
            colorHex: item.colorHex || '#333333',
            image: item.image || null,
            images: item.images || null,
            stock: item.stock || 0,
            sellPrice: getProductSellingPrice(item),
            mrp: item.mrp,
            ram: item.ram,
            storage: item.storage,
            isCurrent: item.id === product.id
          });
        } else {
          // If already exists, accumulate stock and pick real image if missing
          existing.stock += (item.stock || 0);
          if (!existing.image && item.image) existing.image = item.image;
        }
      }

      // Check item's units
      if (isModelMatch && Array.isArray(item.units)) {
        item.units.forEach(u => {
          if (u.color) {
            const key = u.color.trim().toLowerCase();
            const existing = colorMap.get(key);
            if (!existing) {
              colorMap.set(key, {
                id: item.id,
                color: u.color.trim(),
                colorHex: u.colorHex || '#333333',
                image: u.image || item.image || null,
                images: item.images || null,
                stock: 1,
                sellPrice: getProductSellingPrice(item),
                mrp: item.mrp,
                ram: item.ram,
                storage: item.storage,
                isCurrent: item.id === product.id
              });
            }
          }
        });
      }
    });
  }

  // 3. Also check product's own internal units
  if (Array.isArray(product.units)) {
    product.units.forEach(u => {
      if (u.color) {
        const key = u.color.trim().toLowerCase();
        const existing = colorMap.get(key);
        if (!existing) {
          colorMap.set(key, {
            id: product.id,
            color: u.color.trim(),
            colorHex: u.colorHex || '#333333',
            image: u.image || product.image || null,
            images: product.images || null,
            stock: 1,
            sellPrice: getProductSellingPrice(product),
            mrp: product.mrp,
            ram: product.ram,
            storage: product.storage,
            isCurrent: true
          });
        }
      }
    });
  }

  return Array.from(colorMap.values());
}
