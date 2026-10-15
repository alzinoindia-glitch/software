export function isRefurbishedProduct(item) {
  const category = String(item?.category || '').trim().toLowerCase();
  const name = String(item?.name || '').trim().toLowerCase();
  return item?.type === 'refurbished' || /^used mobiles?$/.test(category) ||
    name.startsWith('used ') || name.includes('refurbished') || name.includes('pre-owned');
}

export function isSmartphoneProduct(item) {
  const category = String(item?.category || '').trim().toLowerCase();
  const name = String(item?.name || '').trim().toLowerCase();
  const department = String(item?.department || '').trim().toLowerCase();
  const type = String(item?.type || '').trim().toLowerCase();

  // Older/imported stock may be tagged as "New Mobiles" or assigned to the
  // mobiles department despite being a cable, accessory, or appliance. Honor
  // explicit non-phone categories and product names in both pills and counts.
  const nonPhoneCategory = /accessor|cable|connector|charger|audio|earbud|headphone|earphone|home appliance|appliance|spare part|wearable|case|cover|screen guard|tempered glass/i.test(category);
  const nonPhoneName = /\b(cables?|connectors?|chargers?|charging|adapters?|power\s*banks?|powerbanks?|earbuds?|airdopes|airpods|headphones?|headsets?|earphones?|neckbands?|speakers?|cases?|covers?|tempered|screen\s*guards?|glass\s*guards?|power\s*strips?|extension\s*boards?|heaters?|cookers?|kettles?|toasters?|irons?|mixers?|fans?|washing\s*machines?|televisions?|smart\s*tvs?|refrigerators?|fridges?|coolers?|air\s*conditioners?)\b/i.test(name);

  return (department === 'mobiles' || category === 'new mobiles') &&
    !isRefurbishedProduct(item) &&
    !['accessory', 'appliance'].includes(type) &&
    department !== 'accessories' && department !== 'appliances' &&
    !nonPhoneCategory && !nonPhoneName;
}

export function firstPositiveAmount(...values) {
  const amount = values
    .map(value => typeof value === 'string' ? Number(value.replace(/[₹,\s]/g, '')) : Number(value))
    .find(value => Number.isFinite(value) && value > 0);
  return amount ?? 0;
}

// Inventory, catalog imports, and storefront cards use different names for
// the same customer selling price.
export function getProductSellingPrice(product, fallback = 0) {
  return firstPositiveAmount(
    product?.sellPrice,
    product?.sellingPrice,
    product?.sell_price,
    product?.selling_price,
    product?.targetSellPrice,
    product?.target_sell_price,
    product?.expectedSellingPrice,
    product?.expected_selling_price,
    product?.price,
    fallback
  );
}
