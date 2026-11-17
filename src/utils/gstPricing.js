const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

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
