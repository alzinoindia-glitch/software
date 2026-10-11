// ALZINO Stock Aging & Offer Engine
// Single source of truth for "how old is this stock" and for applying /
// removing clearance offers. Offers change the product's live sellPrice, so
// POS billing, the customer storefront (alzino.shop) and margins all stay in sync.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days since the stock was received (inward). Falls back to createdAt / 0. */
export const getAgingDays = (item) => {
  if (!item) return 0;
  if (item.agingDays !== undefined && item.agingDays !== null && item.agingDays !== '') {
    return Number(item.agingDays) || 0;
  }
  const ref = item.receivedDate || item.createdAt;
  if (!ref) return 0;
  const t = new Date(ref).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / DAY_MS));
};

export const isLowStock = (item) =>
  Number(item?.stock) > 0 && Number(item.stock) <= (Number(item.lowStockThreshold) || 2);

/** Price the item sold at before any offer was applied. */
export const getRegularPrice = (item) => Number(item?.offer?.regularPrice ?? item?.sellPrice) || 0;

/**
 * Apply a % offer. Price never drops below buy cost (no loss-making offers).
 * type: 'low-stock' | 'old-stock' | 'custom'
 */
export const applyOffer = (item, pct, type = 'custom') => {
  const regularPrice = getRegularPrice(item);
  const buy = Number(item.buyPrice) || 0;
  const discounted = Math.round(regularPrice * (1 - pct / 100));
  const offerPrice = Math.max(buy, discounted);
  const effectivePct = regularPrice > 0 ? Math.round(((regularPrice - offerPrice) / regularPrice) * 100) : 0;
  const label = type === 'low-stock'
    ? `🔥 Low Stock Deal — ${effectivePct}% Off`
    : type === 'old-stock'
      ? `🏷️ Old Stock Clearance — ${effectivePct}% Off`
      : `⚡ Special Offer — ${effectivePct}% Off`;
  return {
    ...item,
    sellPrice: offerPrice,
    mrp: Math.max(Number(item.mrp) || 0, regularPrice),
    offer: { pct: effectivePct, type, label, regularPrice, appliedAt: new Date().toISOString(), cappedAtCost: offerPrice > discounted }
  };
};

export const removeOffer = (item) => {
  if (!item?.offer) return item;
  const { offer, ...rest } = item;
  return { ...rest, sellPrice: offer.regularPrice };
};

/** Recommended clearance % based on age / stock level. */
export const recommendedOfferPct = (item) => {
  const days = getAgingDays(item);
  if (days >= 90) return 15;
  if (days >= 60) return 8;
  if (days >= 30) return 5;
  if (isLowStock(item)) return 5;
  return 0;
};
