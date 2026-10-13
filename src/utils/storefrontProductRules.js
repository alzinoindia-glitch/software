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
