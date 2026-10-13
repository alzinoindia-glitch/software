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

// Treat singular and plural spellings as one canonical inventory category.
export function normalizeProductCategory(category) {
  const value = String(category || '').trim();
  if (/^(used mobiles?|refurbished mobiles?|pre[- ]owned mobiles?)$/i.test(value)) return 'Used Mobiles';
  return value;
}

export function productCategoriesMatch(left, right) {
  return normalizeProductCategory(left).toLowerCase() === normalizeProductCategory(right).toLowerCase();
}

// Older inventory imports may identify a used handset by its refurbished type
// or name while retaining a legacy category. Keep those rows in the same used
// mobile workflows without changing their persisted category value.
export function isUsedMobileProduct(item) {
  if (!item || typeof item !== 'object') return false;
  const name = String(item.name || item.model || '').trim().toLowerCase();
  return normalizeProductCategory(item.category).toLowerCase() === 'used mobiles' ||
    String(item.type || '').toLowerCase() === 'refurbished' ||
    item.isRefurbishedResale === true ||
    /^(used\s|refurbished\s|pre[- ]owned\s)/i.test(name) ||
    name.includes('refurbished') || name.includes('pre-owned');
}

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
const CUSTOM_SUBCATEGORIES_KEY = 'ALZINO_CUSTOM_SUBCATEGORIES_BY_CAT';
const CUSTOM_TECHNICIANS_KEY = 'ALZINO_CUSTOM_TECHNICIANS';
const readMap = key => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
const readList = key => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const notifyTaxonomyUpdated = detail => {
  window.dispatchEvent(new CustomEvent('alzino:taxonomy-updated', { detail: { ...detail, taxonomy: getCustomTaxonomy() } }));
};
const notifyTechniciansUpdated = technicians => {
  window.dispatchEvent(new CustomEvent('alzino:technicians-updated', { detail: { technicians } }));
};

export function getCustomTaxonomy() {
  return {
    categories: readList(CUSTOM_CATEGORIES_KEY),
    brandsByCategory: readMap(CUSTOM_BRANDS_KEY),
    subcategoriesByCategory: readMap(CUSTOM_SUBCATEGORIES_KEY)
  };
}

export function applyCustomTaxonomy(taxonomy = {}) {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(Array.isArray(taxonomy.categories) ? taxonomy.categories : []));
    localStorage.setItem(CUSTOM_BRANDS_KEY, JSON.stringify(taxonomy.brandsByCategory && typeof taxonomy.brandsByCategory === 'object' ? taxonomy.brandsByCategory : {}));
    localStorage.setItem(CUSTOM_SUBCATEGORIES_KEY, JSON.stringify(taxonomy.subcategoriesByCategory && typeof taxonomy.subcategoriesByCategory === 'object' ? taxonomy.subcategoriesByCategory : {}));
    notifyTaxonomyUpdated({ type: 'cloud-sync' });
  } catch (error) {
    console.warn('Could not save synced product options:', error);
  }
}

export function getCustomTechnicians() {
  return readList(CUSTOM_TECHNICIANS_KEY).filter(name => name && !name.includes('Anwar') && !name.includes('Srinivas') && !name.includes('Mohsin'));
}

export function applyCustomTechnicians(technicians = []) {
  const cleanList = Array.isArray(technicians) ? technicians.filter(name => typeof name === 'string' && name.trim()) : [];
  try {
    localStorage.setItem(CUSTOM_TECHNICIANS_KEY, JSON.stringify(cleanList));
    notifyTechniciansUpdated(cleanList);
  } catch (error) {
    console.warn('Could not save synced repair technicians:', error);
  }
}

export function saveCustomTechnicians(technicians = []) {
  applyCustomTechnicians(technicians);
}

export const BASE_SUBCATEGORIES_BY_CATEGORY = {
  'New Mobiles': ['Smartphones', 'Feature Phones', 'Tablets'],
  'Used Mobiles': ['Refurbished Mobiles', 'Pre-owned Mobiles', 'Refurbished Tablets'],
  'Mobile Accessories': ['Phone Cases', 'Screen Protectors', 'Chargers', 'Cables', 'Earphones & Headphones', 'Power Banks', 'Mobile Pouches', 'Smartwatches'],
  'Home Appliances': ['Refrigerators & Freezers', 'Washing Machines', 'Air Conditioners', 'Air Coolers', 'Televisions', 'Kitchen Appliances', 'Fans', 'Water Heaters', 'Water Purifiers', 'Irons'],
  'Spare Parts': ['Displays', 'Batteries', 'Charging Parts', 'Cameras', 'Speakers', 'Motherboards', 'Connectors'],
  Universal: ['General']
};

export function getCustomSubcategoriesMap() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_SUBCATEGORIES_KEY) || '{}'); } catch { return {}; }
}

export function saveCustomSubcategory(subcategory, category = 'General') {
  const value = String(subcategory || '').trim();
  const catKey = String(category || 'General').trim() || 'General';
  if (!value || ['other', 'all'].includes(value.toLowerCase())) return;
  try {
    const map = getCustomSubcategoriesMap();
    const existing = map[catKey] || [];
    if (!existing.some(item => item.toLowerCase() === value.toLowerCase())) {
      map[catKey] = [...existing, value];
      localStorage.setItem(CUSTOM_SUBCATEGORIES_KEY, JSON.stringify(map));
      notifyTaxonomyUpdated({ type: 'subcategory', category: catKey, subcategory: value });
    }
  } catch (e) { console.error('Failed to save custom subcategory:', e); }
}

export function getAvailableSubcategories(category, inventory = []) {
  const catKey = String(category || 'General').trim() || 'General';
  const values = new Set([...(BASE_SUBCATEGORIES_BY_CATEGORY[catKey] || []), ...(getCustomSubcategoriesMap()[catKey] || [])]);
  if (Array.isArray(inventory)) inventory.forEach(item => {
    if (item?.category === catKey && item?.subCategory?.trim()) values.add(item.subCategory.trim());
  });
  return [...values];
}

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
      notifyTaxonomyUpdated({ type: 'category', category: trimmed });
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
      notifyTaxonomyUpdated({ type: 'brand', brand: trimmedBrand, category: catKey });
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
      catSet.add(normalizeProductCategory(c));
    }
  });

  // Active inventory items
  if (Array.isArray(inventory)) {
    inventory.forEach(item => {
      if (item?.category && item.category.trim() &&
          item.category.toLowerCase() !== 'other' &&
          item.category.toLowerCase() !== 'all') {
        catSet.add(normalizeProductCategory(item.category));
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
