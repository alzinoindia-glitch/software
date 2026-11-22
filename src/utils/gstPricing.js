const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// Apply one bill-level discount across taxable value and GST in the same
// proportion as each line's gross value, keeping invoice totals reconcilable.
export const applySaleDiscount = (breakdowns, discount = 0) => {
  const grossTotal = breakdowns.reduce((sum, line) => sum + Math.max(0, Number(line.gross) || 0), 0);
  const appliedDiscount = Math.min(grossTotal, Math.max(0, Number(discount) || 0));
  if (!grossTotal || !appliedDiscount) return breakdowns.map(line => ({ ...line }));
  const factor = (grossTotal - appliedDiscount) / grossTotal;
  return breakdowns.map(line => ({
    taxable: roundMoney(Math.max(0, Number(line.taxable) || 0) * factor),
    gst: roundMoney(Math.max(0, Number(line.gst) || 0) * factor),
    gross: roundMoney(Math.max(0, Number(line.gross) || 0) * factor)
  }));
};

export const getPurchaseCostBreakdown = (enteredAmount, gstRate = 0, includesGst = true) => {
  const entered = Math.max(0, Number(enteredAmount) || 0);
  const rate = Math.max(0, Number(gstRate) || 0);
  if (!rate) return { entered, taxable: roundMoney(entered), gst: 0, gross: roundMoney(entered) };
  const taxable = includesGst ? entered / (1 + rate / 100) : entered;
  const gst = includesGst ? entered - taxable : taxable * rate / 100;
  return { entered, taxable: roundMoney(taxable), gst: roundMoney(gst), gross: roundMoney(includesGst ? entered : entered + gst) };
};

export const getSalePriceBreakdown = (unitPrice, quantity = 1, gstRate = 0, includesGst = false, isGst = true) => {
  const amount = Math.max(0, Number(unitPrice) || 0) * Math.max(0, Number(quantity) || 0);
  const rate = isGst ? Math.max(0, Number(gstRate) || 0) : 0;
  if (!rate) return { taxable: roundMoney(amount), gst: 0, gross: roundMoney(amount) };
  const taxable = includesGst ? amount / (1 + rate / 100) : amount;
  const gst = includesGst ? amount - taxable : amount * rate / 100;
  return { taxable: roundMoney(taxable), gst: roundMoney(gst), gross: roundMoney(includesGst ? amount : amount + gst) };
};
