const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');

// Keep invoice numbers unique across all workflows that share a prefix. Using
// the current record count can reuse a number after a record is removed.
export const getNextInvoiceNumber = (invoices = [], prefix = 'ALZ-INV', minimumSequence = 0) => {
  const matcher = new RegExp('^' + escapeRegExp(prefix) + '-(\\\\d+)$', 'i');
  const highestExisting = (invoices || []).reduce((highest, invoice) => {
    const currentNumber = invoice?.invoiceNo || invoice?.invoiceNumber || '';
    const match = String(currentNumber).trim().match(matcher);
    const sequence = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
  const nextSequence = Math.max(highestExisting, Number(minimumSequence) || 0) + 1;
  return prefix + '-' + String(nextSequence).padStart(4, '0');
}
