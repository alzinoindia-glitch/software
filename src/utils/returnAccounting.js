export const getInvoiceTransactions = (invoices = [], predicate = () => true) => invoices.flatMap((invoice) =>
  (invoice.returnTransactions || [])
    .filter((entry) => entry.status !== 'voided' && predicate(entry, invoice))
    .map((entry) => ({
      ...entry,
      invoiceNo: invoice.invoiceNo,
      customerName: invoice.customerName,
      paymentMode: invoice.paymentMode,
      isRefurbishedResale: invoice.isRefurbishedResale,
      isRepairInvoice: invoice.isRepairInvoice,
      repairJobRef: invoice.repairJobRef,
    }))
);

export const getInvoiceReturns = (invoices = [], predicate = () => true) =>
  getInvoiceTransactions(invoices, (entry, invoice) => entry.type === 'refund' && predicate(entry, invoice));

export const sumRefunds = (invoices = [], predicate = () => true, methodPredicate = () => true) =>
  getInvoiceReturns(invoices, predicate)
    .filter((entry) => methodPredicate(entry.refundMethod || ''))
    .reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0);

export const sumReturnProfitAdjustments = (invoices = [], predicate = () => true) =>
  getInvoiceReturns(invoices, predicate).reduce((sum, entry) => {
    const qty = Number(entry.quantity || 0);
    const profit = Number(entry.originalUnitProfit || 0) * qty;
    const cost = Number(entry.originalUnitCost || 0) * qty;
    return sum + profit + (entry.restocked ? 0 : cost);
  }, 0);

export const sumReplacementRevenueAdjustments = (invoices = [], predicate = () => true) =>
  getInvoiceTransactions(invoices, (entry) => entry.type === 'replacement' && predicate(entry))
    .reduce((sum, entry) => sum + Number(entry.replacement?.valueDifference || 0), 0);

export const sumReplacementProfitAdjustments = (invoices = [], predicate = () => true) =>
  getInvoiceTransactions(invoices, (entry) => entry.type === 'replacement' && predicate(entry))
    .reduce((sum, entry) => sum + (Number(entry.replacement?.unitProfit || 0) - Number(entry.originalUnitProfit || 0)) * Number(entry.quantity || 0), 0);

export const isDateInReportRange = (date, dateFilter, todayStr, currentMonthStr) => {
  if (dateFilter === 'today') return String(date || '').slice(0, 10) === todayStr;
  if (dateFilter === 'month') return String(date || '').startsWith(currentMonthStr);
  return true;
};
