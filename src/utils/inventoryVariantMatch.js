const normalizeProductIdentity = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const sameKnownVariant = (existing, candidate) => {
  const existingCategory = normalizeProductIdentity(existing.category);
  const candidateCategory = normalizeProductIdentity(candidate.category);
  if (existingCategory && candidateCategory && existingCategory !== candidateCategory) return false;

  const existingBrand = normalizeProductIdentity(existing.brand);
  const candidateBrand = normalizeProductIdentity(candidate.brand);
  if (existingBrand && candidateBrand && existingBrand !== candidateBrand) return false;

  const existingModel = normalizeProductIdentity(existing.model);
  const candidateModel = normalizeProductIdentity(candidate.model);
  if (existingModel && candidateModel && existingModel !== candidateModel) return false;

  for (const field of ['ram', 'storage', 'capacity', 'color']) {
    const existingValue = normalizeProductIdentity(existing[field]);
    const candidateValue = normalizeProductIdentity(candidate[field]);
    if (existingValue && candidateValue && existingValue !== candidateValue) return false;
  }
  return true;
};

/**
 * Only merges a stock receipt when the product name or model matches exactly
 * after punctuation/case normalization and any known variant attributes agree.
 * Ambiguous duplicate names return null for admin review instead of risking
 * stock being attached to the wrong variant.
 */
export function findMatchingInventoryVariant(inventory, candidate) {
  const candidateName = normalizeProductIdentity(candidate?.name || candidate?.productName);
  const candidateModel = normalizeProductIdentity(candidate?.model);
  if (!candidateName && !candidateModel) return null;

  const matches = (inventory || []).filter(item => {
    const nameMatches = candidateName && normalizeProductIdentity(item.name) === candidateName;
    const modelMatches = candidateModel && normalizeProductIdentity(item.model) === candidateModel;
    if (!nameMatches && !modelMatches) return false;
    return sameKnownVariant(item, candidate || {});
  });
  return matches.length === 1 ? matches[0] : null;
}
