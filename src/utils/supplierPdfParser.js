const numeric = value => {
  const parsed = Number(String(value || '').replace(/[,₹\s]/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const textOf = item => String(item?.str || '').trim();
const xOf = item => Number(item?.transform?.[4] || 0);
const yOf = item => Number(item?.transform?.[5] || 0);
const isNumberCell = value => /^\s*(?:₹\s*)?[\d,]+(?:\.\d+)?\s*(?:pcs?|units?|nos?\.?)?\s*$/i.test(String(value || ''));

const groupByBaseline = items => {
  const groups = [];
  [...items].filter(item => textOf(item)).sort((a, b) => yOf(b) - yOf(a)).forEach(item => {
    let group = groups.find(row => Math.abs(row.y - yOf(item)) <= 2.5);
    if (!group) {
      group = { y: yOf(item), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  });
  return groups.map(group => ({ ...group, items: group.items.sort((a, b) => xOf(a) - xOf(b)) }))
    .sort((a, b) => b.y - a.y);
};

const headerKind = value => {
  const text = String(value || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/\b(qty|quantity|units)\b/.test(text)) return 'quantity';
  if (/\b(hsn|sac)\b/.test(text)) return 'hsn';
  if (/\b(rate|unit price|price|unit cost|cost)\b/.test(text)) return 'rate';
  if (/\b(amount|line total|total|taxable value|net amount)\b/.test(text)) return 'amount';
  if (/\b(description|particulars|product|item|goods)\b/.test(text)) return 'description';
  return '';
};

const columnRange = (columns, kind) => {
  const column = columns.find(item => item.kind === kind);
  if (!column) return null;
  const positions = [...new Set(columns.map(item => item.x))].sort((a, b) => a - b);
  const index = positions.indexOf(column.x);
  return {
    min: index === 0 ? -Infinity : (positions[index - 1] + column.x) / 2,
    max: index === positions.length - 1 ? Infinity : (column.x + positions[index + 1]) / 2,
    x: column.x
  };
};

const inColumn = (item, range) => Boolean(range && xOf(item) >= range.min && xOf(item) < range.max);
const findNumeric = (items, range) => items.filter(item => inColumn(item, range) && isNumberCell(textOf(item)))
  .map(item => numeric(textOf(item))).find(value => value > 0) || 0;

export function parseSupplierPdfItems(items, inheritedColumns = null) {
  const safeItems = (items || []).filter(item => textOf(item));
  const hasSelectableText = safeItems.length > 0;
  const text = safeItems.map(textOf).join(' ');
  const labeledInvoiceNumber = text.match(/\b(?:tax\s+invoice|invoice|bill)\s*(?:no\.?|number|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9/-]{1,})/i)?.[1] || '';
  const invoiceNumber = labeledInvoiceNumber || text.match(/\bINV[-/][A-Z0-9-]+\b/i)?.[0] || '';
  const dateMatch = text.match(/\b(?:invoice\s+date|date)\s*:?\s*(?:(\d{1,2})[/-](\d{1,2})[/-](\d{4})|(\d{4})[-/](\d{1,2})[-/](\d{1,2}))/i);
  const invoiceDate = dateMatch
    ? (dateMatch[4]
      ? dateMatch[4] + '-' + dateMatch[5].padStart(2, '0') + '-' + dateMatch[6].padStart(2, '0')
      : dateMatch[3] + '-' + dateMatch[2].padStart(2, '0') + '-' + dateMatch[1].padStart(2, '0'))
    : '';
  const gstText = text.toLowerCase().replace(/[()]/g, ' ');
  const includesGst = /\b(?:tax|gst)\s+inclusive\b|\binclusive\s+(?:of\s+)?(?:all\s+)?(?:tax|gst)\b|\b(?:tax|gst)\s+included\b/.test(gstText)
    ? true
    : /\b(?:tax|gst)\s+exclusive\b|\bexclusive\s+(?:of\s+)?(?:all\s+)?(?:tax|gst)\b|\b(?:tax|gst)\s+(?:extra|additional)\b/.test(gstText)
      ? false
      : null;

  const baselines = groupByBaseline(safeItems);
  const detectedHeader = baselines.map(row => {
    const columns = row.items.map(item => ({ kind: headerKind(textOf(item)), x: xOf(item) })).filter(item => item.kind);
    const kinds = new Set(columns.map(item => item.kind));
    return { y: row.y, columns, score: Number(kinds.has('description')) + Number(kinds.has('quantity')) + Number(kinds.has('rate') || kinds.has('amount')) };
  }).filter(row => row.score >= 3).sort((a, b) => b.score - a.score || b.y - a.y)[0];
  const header = detectedHeader || (inheritedColumns?.length && baselines.length
    ? { y: Math.max(...baselines.map(row => row.y)) + 3, columns: inheritedColumns }
    : null);

  if (!header) return { hasSelectableText, invoiceNumber, invoiceDate, includesGst, columns: null, lines: [] };
  const descriptionColumn = columnRange(header.columns, 'description');
  const quantityColumn = columnRange(header.columns, 'quantity');
  const hsnColumn = columnRange(header.columns, 'hsn');
  const rateColumn = columnRange(header.columns, 'rate');
  const amountColumn = columnRange(header.columns, 'amount');
  const subtotalY = safeItems.filter(item => /sub\s*total|grand\s*total|amount\s*due|round\s*off/i.test(textOf(item)))
    .map(yOf).filter(y => y < header.y).sort((a, b) => b - a)[0];
  const dataBottom = subtotalY ?? Math.min(...safeItems.filter(item => yOf(item) < header.y).map(yOf), 0);
  const anchors = baselines.filter(row => row.y < header.y - 2 && row.y > dataBottom - 2)
    .map(row => {
      const quantity = findNumeric(row.items, quantityColumn);
      const description = row.items.some(item => inColumn(item, descriptionColumn) && headerKind(textOf(item)) !== 'description' && /[a-zA-Z]{2,}/.test(textOf(item)));
      const hasPrice = findNumeric(row.items, rateColumn) > 0 || findNumeric(row.items, amountColumn) > 0;
      return { ...row, quantity, valid: quantity > 0 && description && hasPrice };
    }).filter(row => row.valid).sort((a, b) => b.y - a.y);

  const rows = anchors.map((anchor, index) => {
    const nextAnchor = anchors[index + 1];
    const bottom = nextAnchor ? nextAnchor.y + 2 : dataBottom - 1;
    const cell = safeItems.filter(item => yOf(item) <= anchor.y + 2 && yOf(item) > bottom);
    const descriptionMax = hsnColumn ? hsnColumn.min : quantityColumn?.min;
    const name = cell.filter(item => descriptionColumn && xOf(item) >= descriptionColumn.min && xOf(item) < descriptionMax)
      .sort((a, b) => yOf(b) - yOf(a)).map(textOf).join(' ').replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
    const hsn = cell.filter(item => inColumn(item, hsnColumn)).map(textOf).join('').replace(/\D/g, '');
    const amount = findNumeric(cell, amountColumn);
    const rate = findNumeric(cell, rateColumn);
    const unitCost = amount && anchor.quantity ? amount / anchor.quantity : rate;
    const taxText = cell.filter(item => rateColumn && amountColumn && xOf(item) > rateColumn.x && xOf(item) < amountColumn.x).map(textOf).join(' ');
    const gstRates = [...taxText.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(match => Number(match[1]));
    const gstRate = gstRates.length ? gstRates.reduce((sum, value) => sum + value, 0) : null;
    return { name, hsn, quantity: anchor.quantity, unitCost, gstRate, unitCostIncludesGst: includesGst };
  }).filter(line => line.name.length >= 2 && line.quantity > 0 && line.unitCost > 0);

  return { hasSelectableText, invoiceNumber, invoiceDate, includesGst, columns: header.columns, lines: rows };
}

export function parseSupplierPdfPages(pages) {
  let columns = null;
  const results = (pages || []).map(items => {
    const result = parseSupplierPdfItems(items, columns);
    if (result.columns?.length) columns = result.columns;
    return result;
  });
  return {
    hasSelectableText: results.some(result => result.hasSelectableText),
    invoiceNumber: results.find(result => result.invoiceNumber)?.invoiceNumber || '',
    invoiceDate: results.find(result => result.invoiceDate)?.invoiceDate || '',
    includesGst: results.find(result => result.includesGst != null)?.includesGst ?? null,
    lines: results.flatMap(result => result.lines)
  };
}

export function supplierPdfOcrWordsToItems(words, viewport, scale = 1) {
  return (words || []).filter(word => String(word?.text || '').trim() && word?.bbox).map(word => {
    const x = Number(word.bbox.x0);
    const yTop = Number(word.bbox.y1);
    if (!Number.isFinite(x) || !Number.isFinite(yTop)) return null;
    return {
      str: String(word.text).trim(),
      // Tesseract uses rendered canvas coordinates (top-left origin). The PDF
      // table parser groups text by PDF baselines (bottom-left origin).
      transform: [0, 0, 0, 0, x / scale, (Number(viewport.height) - yTop) / scale]
    };
  }).filter(Boolean);
}
