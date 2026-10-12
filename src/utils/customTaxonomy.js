// ALZINO Smart Taxonomy Engine: Persistent Categories & Brands Manager
// Ensures any category or brand added via "Other (Add Custom)" automatically persists
// and appears as a permanent, first-class option in all dropdowns and filters.

export const BASE_CATEGORIES = [
  'New Mobiles',
  'Used Mobiles',
  'Mobile Accessories',
  'Home Appliances',
  'Spare Parts',
  'Universal'
];

export const BASE_MOBILE_BRANDS = [
  'Samsung',
  'Apple',
  'OnePlus',
  'Vivo',
  'Oppo',
  'Realme',
  'Xiaomi / Redmi',
  'Motorola',
  'Google Pixel',
  'iQOO',
  'Nothing',
  'Poco',
  'Infinix',
  'Tecno',
  'Karbonn',
  'Lava',
  'itel',
  'Nokia',
  'Jio',
  'Micromax',
  'Universal'
];

export const BASE_APPLIANCE_BRANDS = [
  'Samsung',
  'LG',
  'Sony',
  'Whirlpool',
  'Voltas',
  'Haier',
  'Godrej',
  'Panasonic',
  'Daikin',
  'Blue Star',
  'Lloyd',
  'Symphony',
  'Philips',
  'Bajaj',
  'Havells',
  'Crompton',
  'IFB',
  'Universal'
];

export const BASE_ACCESSORY_BRANDS = [
  'Apple',
  'Samsung',
  'ALZINO Tech',
  'boAt',
  'Noise',
  'OnePlus',
  'Realme',
  'Portronics',
  'Anker',
  'Ambrane',
  'pTron',
  'Boult',
  'Fire-Boltt',
  'Universal'
];

export const BASE_SPARE_PARTS_BRANDS = [
  'Apple',
  'Samsung',
  'Vivo',
  'Oppo',
  'OnePlus',
  'Xiaomi',
  'Realme',
  'Universal'
];

const CUSTOM_CATEGORIES_KEY = 'ALZINO_CUSTOM_CATEGORIES';
const CUSTOM_BRANDS_KEY = 'ALZINO_CUSTOM_BRANDS_BY_CAT';

/**
 * Get all custom user-added categories from localStorage
 */
export function getCustomCategories() {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save a newly added category to persistent storage
 */
export function saveCustomCategory(category) {
  if (!category) return;
  const trimmed = category.trim();
  if (!trimmed || trimmed.toLowerCase() === 'other' || trimmed.toLowerCase() === 'all') return;

  try {
    const existing = getCustomCategories();
    const isAlreadyBase = BASE_CATEGORIES.some(c => c.toLowerCase() === trimmed.toLowerCase());
    const isAlreadyCustom = existing.some(c => c.toLowerCase() === trimmed.toLowerCase());

    if (!isAlreadyBase && !isAlreadyCustom) {
      const updated = [...existing, trimmed];
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('alzino:taxonomy-updated', { detail: { type: 'category', category: trimmed } }));
    }
  } catch (e) {
    console.error('Failed to save custom category:', e);
  }
}

/**
 * Get all custom user-added brands grouped by category
 */
export function getCustomBrandsMap() {
  try {
    const raw = localStorage.getItem(CUSTOM_BRANDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Save a newly added brand for a given category to persistent storage
 */
export function saveCustomBrand(brand, category = 'General') {
  if (!brand) return;
  const trimmedBrand = brand.trim();
  if (!trimmedBrand || trimmedBrand.toLowerCase() === 'other' || trimmedBrand.toLowerCase() === 'all') return;

  try {
    const map = getCustomBrandsMap();
    const catKey = (category && category.trim()) ? category.trim() : 'General';
    const listForCat = map[catKey] || [];

    if (!listForCat.some(b => b.toLowerCase() === trimmedBrand.toLowerCase())) {
      map[catKey] = [...listForCat, trimmedBrand];
      localStorage.setItem(CUSTOM_BRANDS_KEY, JSON.stringify(map));
      window.dispatchEvent(new CustomEvent('alzino:taxonomy-updated', { detail: { type: 'brand', brand: trimmedBrand, category: catKey } }));
    }
  } catch (e) {
    console.error('Failed to save custom brand:', e);
  }
}

/**
 * Returns deduplicated array of all available categories:
 * Base default categories + persistent custom categories + any categories found in active inventory items
 */
export function getAvailableCategories(inventory = []) {
  const catSet = new Set(BASE_CATEGORIES);

  // Stored custom categories
  const custom = getCustomCategories();
  custom.forEach(c => {
    if (c && c.toLowerCase() !== 'other' && c.toLowerCase() !== 'all') {
      catSet.add(c);
    }
  });

  // Active inventory items
  if (Array.isArray(inventory)) {
    inventory.forEach(item => {
      if (item?.category && item.category.trim() &&
          item.category.toLowerCase() !== 'other' &&
          item.category.toLowerCase() !== 'all') {
        catSet.add(item.category.trim());
      }
    });
  }

  return Array.from(catSet);
}

/**
 * Returns deduplicated array of available brands for a given category:
 * Base category brands + persistent custom brands for this category + any brands found in active inventory items
 */
export function getAvailableBrandsForCategory(category, inventory = []) {
  let base = [];
  if (category === 'Home Appliances') base = BASE_APPLIANCE_BRANDS;
  else if (category === 'Mobile Accessories') base = BASE_ACCESSORY_BRANDS;
  else if (category === 'New Mobiles' || category === 'Used Mobiles') base = BASE_MOBILE_BRANDS;
  else if (category === 'Spare Parts') base = BASE_SPARE_PARTS_BRANDS;
  else base = ['Universal', 'Samsung', 'Apple', 'LG', 'Sony', 'boAt', 'Noise', 'Voltas'];

  const brandSet = new Set(base);

  // Persistent custom brands map
  const customMap = getCustomBrandsMap();
  const catKey = (category && category.trim()) ? category.trim() : 'General';
  const customForCat = customMap[catKey] || [];
  customForCat.forEach(b => {
    if (b && b.toLowerCase() !== 'other' && b.toLowerCase() !== 'all') brandSet.add(b);
  });
  
  // General custom brands fallback
  const customGeneral = customMap['General'] || [];
  customGeneral.forEach(b => {
    if (b && b.toLowerCase() !== 'other' && b.toLowerCase() !== 'all') brandSet.add(b);
  });

  // Active inventory items
  if (Array.isArray(inventory)) {
    inventory.forEach(item => {
      if (item?.brand && item.brand.trim() &&
          item.brand.toLowerCase() !== 'other' &&
          item.brand.toLowerCase() !== 'all') {
        // If it matches this category or the category is a custom one
        if (!category || item.category === category || !BASE_CATEGORIES.includes(category)) {
          brandSet.add(item.brand.trim());
        }
      }
    });
  }

  return Array.from(brandSet);
}
