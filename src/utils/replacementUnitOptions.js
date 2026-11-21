const identifiersFromUnit = (unit = {}) => [unit.imei1, unit.imei2, unit.serialNumber, unit.barcode, unit.id]
  .map(value => String(value || '').trim())
  .filter(Boolean);

export const hasTrackedReplacementUnits = (product) =>
  ['imeis', 'serialNumbers', 'units'].some(key => Array.isArray(product?.[key]) && product[key].length > 0);

/** Return selectable IDs in the same priority order used when stock is deducted. */
export const getReplacementUnitOptions = (product) => {
  if (!product) return [];
  const options = [];
  const seen = new Set();
  const unitIdentifiers = new Set();

  (product.units || []).forEach(unit => {
    const identifiers = identifiersFromUnit(unit);
    identifiers.forEach(identifier => unitIdentifiers.add(identifier));
    const value = identifiers[0];
    if (!value || seen.has(value)) return;
    seen.add(value);
    const labelPrefix = unit.imei1 || unit.imei2 ? '' : unit.serialNumber ? 'Serial: ' : unit.barcode ? 'Barcode: ' : '';
    options.push({ value, label: `${labelPrefix}${value}${unit.color ? ` · ${unit.color}` : ''}` });
  });

  [
    ['imeis', 'IMEI: '],
    ['serialNumbers', 'Serial: ']
  ].forEach(([key, prefix]) => {
    (product[key] || []).forEach(rawValue => {
      const value = String(rawValue || '').trim();
      if (!value || seen.has(value) || unitIdentifiers.has(value)) return;
      seen.add(value);
      options.push({ value, label: `${prefix}${value}` });
    });
  });

  return options;
};
