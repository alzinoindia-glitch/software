const numericOrZero = value => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export const applyPaymentToInvoice = (invoice, payment = {}) => {
  if (!invoice) return invoice;
  const requestedAmount = numericOrZero(payment.amount);
  const due = Math.max(0, numericOrZero(invoice.balanceDue ?? invoice.khataDue));
  const applied = Math.min(due, Math.max(0, requestedAmount));
  if (applied <= 0) return invoice;

  const balanceDue = Math.max(0, due - applied);
  const paidAmount = numericOrZero(invoice.paidAmount) + applied;
  return {
    ...invoice,
    paidAmount,
    balanceDue,
    khataDue: balanceDue,
    paymentStatus: balanceDue > 0 ? 'PARTIAL' : 'PAID',
    payments: [...(Array.isArray(invoice.payments) ? invoice.payments : []), { ...payment, amount: applied }],
  };
};
