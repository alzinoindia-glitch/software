const amountOrZero = value => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const isRepairInvoice = invoice => Boolean(invoice?.isRepairInvoice || invoice?.repairJobRef || invoice?.repairJobId);

const invoiceMatchesRepair = (invoice, repair) => {
  const references = [repair?.recordId, repair?.id, repair?.jobId].filter(Boolean).map(String);
  return references.includes(String(invoice?.repairJobRef || ''))
    || Boolean(repair?.jobId && String(invoice?.repairJobId || '') === String(repair.jobId))
    || Boolean(repair?.invoiceNo && String(invoice?.invoiceNo || '') === String(repair.invoiceNo));
};

/** Count repair invoices once; use delivered repair jobs only as a legacy fallback. */
export const calculateCustomerSpend = ({ invoices = [], repairs = [], recordedTotal = 0 } = {}) => {
  const repairInvoices = invoices.filter(isRepairInvoice);
  const salesSpend = invoices
    .filter(invoice => !isRepairInvoice(invoice))
    .reduce((sum, invoice) => sum + amountOrZero(invoice.grandTotal), 0);
  const invoicedRepairSpend = repairInvoices.reduce((sum, invoice) => sum + amountOrZero(invoice.grandTotal), 0);
  const legacyDeliveredRepairSpend = repairs
    .filter(repair => repair?.status === 'Delivered' && !repairInvoices.some(invoice => invoiceMatchesRepair(invoice, repair)))
    .reduce((sum, repair) => sum + amountOrZero(repair.billedAt ?? repair.finalPrice ?? repair.finalCost), 0);
  const repairSpend = invoicedRepairSpend + legacyDeliveredRepairSpend;
  const computedTotal = salesSpend + repairSpend;

  return {
    salesSpend,
    repairSpend,
    computedTotal,
    totalSpent: Math.max(amountOrZero(recordedTotal), computedTotal)
  };
};
