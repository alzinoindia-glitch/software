const numericOrZero = value => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const normalizePhone = value => String(value || '').replace(/\D/g, '').slice(-10);

export const getRepairBalanceDue = (job = {}, invoice = null) => {
  if (invoice) {
    if (invoice.balanceDue !== undefined && invoice.balanceDue !== null) return Math.max(0, numericOrZero(invoice.balanceDue));
    if (invoice.khataDue !== undefined && invoice.khataDue !== null) return Math.max(0, numericOrZero(invoice.khataDue));
    return Math.max(0, numericOrZero(invoice.grandTotal) - numericOrZero(invoice.paidAmount));
  }
  if (job.balanceDue !== undefined && job.balanceDue !== null) return Math.max(0, numericOrZero(job.balanceDue));
  return Math.max(0, numericOrZero(job.finalPrice || job.finalCost || job.estimatedCost) - numericOrZero(job.advancePaid));
};

export const applyRepairInvoiceToCustomerLedger = (customers = [], {
  phone = '', name = 'Customer', address = '', gstin = '', invoiceTotal = 0, khataDue = 0, newCustomerId
} = {}) => {
  const phoneDigits = normalizePhone(phone);
  if (phoneDigits.length !== 10) return customers;

  const customerIndex = customers.findIndex(customer => normalizePhone(customer.phone || customer.mobile) === phoneDigits);
  if (customerIndex >= 0) {
    return customers.map((customer, index) => index === customerIndex ? {
      ...customer,
      totalSpent: numericOrZero(customer.totalSpent) + numericOrZero(invoiceTotal),
      balanceDue: numericOrZero(customer.balanceDue) + numericOrZero(khataDue)
    } : customer);
  }

  return [{
    id: newCustomerId || `CUST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || '').trim() || 'Customer',
    phone: String(phone || '').trim(),
    address: String(address || '').trim(),
    gstin: String(gstin || '').trim(),
    totalSpent: numericOrZero(invoiceTotal),
    balanceDue: numericOrZero(khataDue)
  }, ...customers];
};
