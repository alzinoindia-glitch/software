const numeric = value => {
  const parsed = Number(String(value || '').replace(/[,₹\s]/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const textOf = item => String(item?.str || '').trim();
const xOf = item => Number(item?.transform?.[4] || 0);
const yOf = item => Number(item?.transform?.[5] || 0);

export function parseSupplierPdfItems(items) {
  const text = items.map(textOf).filter(Boolean).join(' ');
  const invoiceNumber = text.match(/\bINV[-/][A-Z0-9-]+\b/i)?.[0] || '';
  const dateMatch = text.match(/\b(?:invoice\s+date|date)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
  const invoiceDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}` : '';
  const gstText = text.toLowerCase().replace(/[()]/g, ' ');
  const includesGst = /\b(?:tax|gst)\s+inclusive\b|\binclusive\s+(?:of\s+)?(?:all\s+)?(?:tax|gst)\b|\b(?:tax|gst)\s+included\b/.test(gstText)
    ? true
    : /\b(?:tax|gst)\s+exclusive\b|\bexclusive\s+(?:of\s+)?(?:all\s+)?(?:tax|gst)\b|\b(?:tax|gst)\s+(?:extra|additional)\b/.test(gstText)
      ? false
      : null;

  const headerItems = items.filter(item => /^(item\s*&\s*description|description|hsn|qty|quantity|rate|amount)$/i.test(textOf(item)));
  const headerY = Math.max(...headerItems.map(yOf));
  if (!Number.isFinite(headerY) || !headerItems.some(item => /^(item\s*&\s*description|description)$/i.test(textOf(item)))) {
    return { invoiceNumber, invoiceDate, includesGst, lines: [] };
  }

  // The invoice template aligns the table values in fixed text columns. Row
  // numbers provide reliable anchors even when a product description wraps.
  const rowStarts = items.filter(item => xOf(item) >= 35 && xOf(item) < 62 && yOf(item) < headerY - 2 && /^\d{1,3}$/.test(textOf(item)))
    .sort((a, b) => yOf(b) - yOf(a));
  const subtotalY = items.filter(item => /sub\s*total/i.test(textOf(item))).map(yOf).sort((a, b) => b - a)[0];
  const rows = rowStarts.map((start, index) => {
    const top = yOf(start) + 1;
    const bottom = rowStarts[index + 1] ? yOf(rowStarts[index + 1]) + 1 : (subtotalY || 28) + 1;
    const cell = items.filter(item => yOf(item) <= top && yOf(item) > bottom && item !== start && textOf(item));
    const inColumn = (item, min, max) => xOf(item) >= min && xOf(item) < max;
    const description = cell.filter(item => inColumn(item, 62, 180)).sort((a, b) => yOf(b) - yOf(a)).map(textOf).join(' ').replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
    const hsn = cell.filter(item => inColumn(item, 180, 245)).sort((a, b) => yOf(b) - yOf(a)).map(textOf).join('').replace(/\D/g, '');
    const quantity = numeric(cell.find(item => inColumn(item, 245, 278) && /\d/.test(textOf(item)))?.str);
    const amount = numeric(cell.filter(item => xOf(item) >= 510 && /\d/.test(textOf(item))).sort((a, b) => xOf(b) - xOf(a))[0]?.str);
    const rate = numeric(cell.filter(item => xOf(item) >= 278 && xOf(item) < 350 && /\d/.test(textOf(item))).sort((a, b) => xOf(b) - xOf(a))[0]?.str);
    const gstTokens = cell.filter(item => xOf(item) >= 350 && xOf(item) < 510).map(textOf).join(' ');
    const gstRates = [...gstTokens.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(match => Number(match[1]));
    const gstRate = gstRates.length ? gstRates.reduce((sum, value) => sum + value, 0) : null;
    const unitCost = amount && quantity ? amount / quantity : rate;
    return { name: description, hsn: hsn || '', quantity: quantity || 0, unitCost, gstRate, unitCostIncludesGst: includesGst };
  }).filter(line => line.name && line.quantity > 0 && line.unitCost > 0);

  return { invoiceNumber, invoiceDate, includesGst, lines: rows };
}
