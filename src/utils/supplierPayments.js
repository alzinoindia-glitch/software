const roundMoney = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const getDue = row => Math.max(0, Number(row?.balanceDue ?? (Number(row?.totalAmount ?? row?.amount ?? 0) - Number(row?.paidAmount || 0))) || 0);

const allocateAcrossRows = (rows, amount, idField, referenceField) => {
  const updates = new Map();
  const allocations = [];
  let remaining = amount;
  const ordered = (rows || []).map((row, index) => ({ row, index, due: getDue(row) }))
    .sort((a, b) => String(a.row.date || '').localeCompare(String(b.row.date || '')) || a.index - b.index);

  ordered.forEach(({ row, index, due }) => {
    if (remaining <= 0 || due <= 0) return;
    const applied = roundMoney(Math.min(due, remaining));
    const newDue = roundMoney(Math.max(0, due - applied));
    updates.set(index, {
      ...row,
      paidAmount: roundMoney(Number(row.paidAmount || 0) + applied),
      balanceDue: newDue
    });
    allocations.push({
      [idField]: String(row.id || ''),
      ...(referenceField ? { [referenceField]: String(row.invoiceNumber || '') } : {}),
      amount: applied
    });
    remaining = roundMoney(Math.max(0, remaining - applied));
  });

  const updatedRows = (rows || []).map((row, index) => updates.get(index) || row);
  return { updatedRows, allocations, remaining };
};

export const applySupplierPayment = (supplier, payment) => {
  if (!supplier) return { success: false, reason: 'Select a supplier before recording a payment.' };
  const amount = roundMoney(payment?.amount);
  if (!(amount > 0)) return { success: false, reason: 'Enter a payment amount greater than zero.' };

  const bills = supplier.purchaseBills || [];
  const khataEntries = supplier.khataEntries || [];
  const recordedBillsDue = bills.reduce((sum, bill) => sum + getDue(bill), 0);
  const recordedKhataDue = khataEntries.reduce((sum, entry) => sum + getDue(entry), 0);
  const trackedDue = roundMoney(recordedBillsDue + recordedKhataDue);
  const legacyDue = roundMoney(Math.max(0, (Number(supplier.balancePayable) || 0) - trackedDue));
  const totalDue = roundMoney(trackedDue + legacyDue);

  if (amount > totalDue + 0.001) {
    return { success: false, reason: `Payment cannot exceed the current supplier payable of ₹${totalDue.toLocaleString('en-IN')}.` };
  }

  const billResult = allocateAcrossRows(bills, amount, 'billId', 'invoiceNumber');
  const khataResult = allocateAcrossRows(khataEntries, billResult.remaining, 'khataId');
  const legacyAllocation = roundMoney(Math.min(legacyDue, khataResult.remaining));
  const updatedSupplier = {
    ...supplier,
    purchaseBills: billResult.updatedRows,
    khataEntries: khataResult.updatedRows,
    balancePayable: roundMoney(Math.max(0, totalDue - amount)),
    payments: [{
      ...payment,
      amount,
      allocations: {
        bills: billResult.allocations,
        khataEntries: khataResult.allocations,
        unassignedPriorBalance: legacyAllocation
      }
    }, ...(supplier.payments || [])]
  };
  return { success: true, supplier: updatedSupplier };
};
