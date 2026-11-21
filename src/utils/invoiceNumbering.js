// Keep invoice numbers unique across all workflows that share a prefix. Using
// the current record count can reuse a number after a record is removed.
export const getNextInvoiceNumber = (invoices = [], prefix = 'ALZ-INV', minimumSequence = 0) => {
  const prefixMarker = `${prefix}-`.toLocaleUpperCase();
  const highestExisting = (invoices || []).reduce((highest, invoice) => {
    const currentNumber = String(invoice?.invoiceNo || invoice?.invoiceNumber || '').trim().toLocaleUpperCase();
    if (!currentNumber.startsWith(prefixMarker)) return highest;
    const suffix = currentNumber.slice(prefixMarker.length);
    if (!suffix || !Array.from(suffix).every(character => character >= '0' && character <= '9')) return highest;
    const sequence = Number(suffix);
    return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
  const nextSequence = Math.max(highestExisting, Number(minimumSequence) || 0) + 1;
  return `${prefix}-${String(nextSequence).padStart(4, '0')}`;
}
