export const getSupplierBillKey = bill => {
  const invoiceNumber = String(bill?.invoiceNumber || '').trim().toLocaleLowerCase();
  return invoiceNumber ? `invoice:${invoiceNumber}` : `id:${bill?.id || ''}`;
};

export const countUniqueSupplierBills = bills => new Set((bills || []).map(getSupplierBillKey)).size;
