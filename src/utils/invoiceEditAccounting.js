const normalizePhone = value => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const customerKey = (phone, name) => {
  const normalizedPhone = normalizePhone(phone);
  return normalizedPhone ? `phone:${normalizedPhone}` : `name:${String(name || 'Customer').trim().toLocaleLowerCase()}`;
};

const invoiceDue = invoice => {
  const explicitDue = invoice?.balanceDue ?? invoice?.khataDue;
  if (explicitDue !== undefined && explicitDue !== null) return Math.max(0, Number(explicitDue) || 0);
  const total = Math.max(0, Number(invoice?.grandTotal) || 0);
  const fallbackPaid = String(invoice?.paymentMode || '').toLocaleLowerCase().includes('khata') ? 0 : total;
  return Math.max(0, total - Math.max(0, Number(invoice?.paidAmount ?? fallbackPaid) || 0));
};

/** Reconcile the CRM aggregates when an admin edits an invoice or its customer. */
export const reconcileCustomerAfterInvoiceEdit = (customers = [], previousInvoice = {}, updatedInvoice = {}) => {
  const oldKey = customerKey(previousInvoice.customerPhone || previousInvoice.phone, previousInvoice.customerName);
  const newKey = customerKey(updatedInvoice.customerPhone || updatedInvoice.phone, updatedInvoice.customerName);
  const oldTotal = Math.max(0, Number(previousInvoice.grandTotal) || 0);
  const newTotal = Math.max(0, Number(updatedInvoice.grandTotal) || 0);
  const oldDue = invoiceDue(previousInvoice);
  const newDue = invoiceDue(updatedInvoice);

  const matchesKey = customer => customerKey(customer.phone, customer.name) === oldKey;
  const oldIndex = customers.findIndex(matchesKey);
  if (oldIndex < 0) return customers;

  const next = customers.map(customer => ({ ...customer }));
  const oldCustomer = next[oldIndex];
  if (oldKey === newKey) {
    next[oldIndex] = {
      ...oldCustomer,
      name: updatedInvoice.customerName || oldCustomer.name,
      phone: updatedInvoice.customerPhone || updatedInvoice.phone || oldCustomer.phone,
      address: updatedInvoice.customerAddress || oldCustomer.address,
      gstin: updatedInvoice.customerGstin || oldCustomer.gstin,
      totalSpent: Math.max(0, (Number(oldCustomer.totalSpent) || 0) - oldTotal) + newTotal,
      balanceDue: Math.max(0, (Number(oldCustomer.balanceDue) || 0) - oldDue) + newDue
    };
    return next;
  }

  next[oldIndex] = {
    ...oldCustomer,
    totalSpent: Math.max(0, (Number(oldCustomer.totalSpent) || 0) - oldTotal),
    balanceDue: Math.max(0, (Number(oldCustomer.balanceDue) || 0) - oldDue)
  };

  const newIndex = next.findIndex(customer => customerKey(customer.phone, customer.name) === newKey);
  if (newIndex >= 0) {
    const newCustomer = next[newIndex];
    next[newIndex] = {
      ...newCustomer,
      totalSpent: (Number(newCustomer.totalSpent) || 0) + newTotal,
      balanceDue: (Number(newCustomer.balanceDue) || 0) + newDue
    };
    return next;
  }

  const customerSuffix = String(updatedInvoice.invoiceNo || Date.now()).replace(/[^a-z0-9]/gi, '');
  next.push({
    id: `CUST-INV-${customerSuffix}`,
    name: updatedInvoice.customerName || 'Customer',
    phone: updatedInvoice.customerPhone || updatedInvoice.phone || '',
    address: updatedInvoice.customerAddress || 'Bodhan, Telangana',
    gstin: updatedInvoice.customerGstin || '',
    totalSpent: newTotal,
    balanceDue: newDue,
    createdAt: updatedInvoice.date || new Date().toISOString().slice(0, 10)
  });
  return next;
};

const identifiersFrom = value => Array.isArray(value) ? value : String(value || '').split(',');

const stockLineSignature = items => (items || [])
  .map(item => {
    const identifiers = [
      ...identifiersFrom(item.imeis),
      ...identifiersFrom(item.serialNumbers),
      ...(Array.isArray(item.units) ? item.units : []).flatMap(unit => [unit.imei1, unit.imei2, unit.serialNumber, unit.barcode, unit.id])
    ].map(String).map(value => value.trim()).filter(Boolean);
    return `${String(item.id || item.productId || '')}|${Number(item.qty) || 0}|${[...new Set(identifiers)].sort().join(',')}`;
  })
  .sort();

export const hasInvoiceStockChanges = (previousInvoice = {}, updatedInvoice = {}) => {
  const previous = stockLineSignature(previousInvoice.items);
  const updated = stockLineSignature(updatedInvoice.items);
  return previous.length !== updated.length || previous.some((value, index) => value !== updated[index]);
};
