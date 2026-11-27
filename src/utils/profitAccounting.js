import { applySaleDiscount, getPurchaseCostBreakdown, getSalePriceBreakdown } from './gstPricing.js';
import { getInvoiceItemProfitCost } from './supplierAccounting.js';

const amount = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const roundMoney = value => Math.round((amount(value) + Number.EPSILON) * 100) / 100;
const hasValue = value => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));

const getLineSaleBreakdown = (item, invoice) => {
  const quantity = Math.max(0, amount(item?.qty));
  const gross = hasValue(item?.total)
    ? Math.max(0, amount(item.total))
    : Math.max(0, amount(item?.rate) * quantity);

  // New invoices persist this exact post-discount tax split. Keep it as the
  // source of truth instead of deriving GST a second time from the grand total.
  if (hasValue(item?.taxable)) {
    const taxable = Math.max(0, amount(item.taxable));
    const gst = hasValue(item?.gstAmount) ? Math.max(0, amount(item.gstAmount)) : Math.max(0, gross - taxable);
    return { gross: hasValue(item?.total) ? gross : roundMoney(taxable + gst), taxable, gst };
  }

  const gstRate = Math.max(0, amount(item?.gstRate));
  const isGst = !invoice?.isNonGst && item?.isGst !== false && gstRate > 0;
  const includesGst = hasValue(item?.total)
    ? true
    : (typeof item?.priceIncludesGst === 'boolean' ? item.priceIncludesGst : invoice?.priceIncludesGst !== false);
  return getSalePriceBreakdown(gross, 1, gstRate, includesGst, isGst);
};

const hasRecordedPurchaseCost = (item, invoice) => hasValue(item?.profitCostOfGoods)
  || hasValue(item?.profitCostPerUnit)
  || hasValue(item?.buyCostBase)
  || hasValue(item?.costOfGoods)
  || (item?.soldUnitRecords || []).some(unit => hasValue(unit?.purchaseCost)
    || hasValue(unit?.purchaseCostEntered)
    || hasValue(unit?.unitRecord?.purchaseCost)
    || hasValue(unit?.unitRecord?.purchaseCostEntered))
  || (hasValue(item?.buyPrice) && (invoice?.isNonGst || item?.buyPriceIncludesGst === false
    || (hasValue(item?.purchaseGstRate) && item?.buyPriceIncludesGst === true)));

const getItemTaxableCost = (item, invoice) => {
  const quantity = Math.max(0, amount(item?.qty));
  if ((item?.soldUnitRecords || []).length) return getInvoiceItemProfitCost(item);
  if (hasValue(item?.profitCostPerUnit)) return Math.max(0, amount(item.profitCostPerUnit) * quantity);
  if (hasValue(item?.buyCostBase)) return Math.max(0, amount(item.buyCostBase) * quantity);
  if (hasValue(item?.profitCostOfGoods)) return Math.max(0, amount(item.profitCostOfGoods));
  if (hasValue(item?.costOfGoods)) {
    const totalCost = Math.max(0, amount(item.costOfGoods));
    return Number(item.purchaseGstRate) > 0 && item.buyPriceIncludesGst !== false
      ? getPurchaseCostBreakdown(totalCost, item.purchaseGstRate, true).taxable
      : totalCost;
  }
  const unitCost = Math.max(0, amount(item?.buyPrice));
  if (invoice?.isNonGst || item?.buyPriceIncludesGst === false || !Number(item?.purchaseGstRate)) return unitCost * quantity;
  return getPurchaseCostBreakdown(unitCost, item.purchaseGstRate, true).taxable * quantity;
};

/**
 * Summarize one invoice on a GST-exclusive basis. GST collected from customers
 * and recoverable input GST are excluded from profit and margin. Missing cost
 * data stays unknown rather than being presented as zero profit.
 */
export const getInvoiceProfitSummary = (invoice = {}) => {
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const sourceLines = items.map(item => getLineSaleBreakdown(item, invoice));
  const grossBeforeDiscount = sourceLines.reduce((sum, line) => sum + line.gross, 0);
  const discount = invoice.discountIncludedInTaxBreakdown === true
    ? 0
    : Math.min(grossBeforeDiscount, Math.max(0, amount(invoice.discount)));
  const lines = applySaleDiscount(sourceLines, discount).map((line, index) => {
    const item = items[index];
    const costKnown = hasRecordedPurchaseCost(item, invoice);
    const cost = costKnown ? roundMoney(getItemTaxableCost(item, invoice)) : null;
    const recordedProfit = hasValue(item?.profit) ? roundMoney(item.profit) : null;
    const profit = cost !== null ? roundMoney(line.taxable - cost) : recordedProfit;
    return {
      item,
      revenue: roundMoney(line.taxable),
      gst: roundMoney(line.gst),
      gross: roundMoney(line.gross),
      cost,
      profit,
      marginPct: profit !== null && line.taxable > 0 ? profit / line.taxable * 100 : null
    };
  });

  const revenue = roundMoney(lines.reduce((sum, line) => sum + line.revenue, 0));
  const completeProfitCoverage = lines.every(line => line.profit !== null);
  const repairProfit = hasValue(invoice.totalProfit) ? amount(invoice.totalProfit) : null;
  const savedProfit = hasValue(invoice.totalProfit) ? roundMoney(invoice.totalProfit) : null;
  const profit = invoice.isRepairInvoice
    ? repairProfit
    : (completeProfitCoverage && lines.length
      ? roundMoney(lines.reduce((sum, line) => sum + line.profit, 0))
      : savedProfit);
  const cost = lines.length && lines.every(line => line.cost !== null)
    ? roundMoney(lines.reduce((sum, line) => sum + line.cost, 0))
    : null;
  const costCoverageComplete = lines.every(line => line.cost !== null)
    && !(invoice.isRepairInvoice && items.some(item => item?.costCoverage && item.costCoverage !== 'Complete'));

  return {
    revenue: lines.length ? revenue : roundMoney(hasValue(invoice.taxableAmount) ? invoice.taxableAmount : invoice.grandTotal),
    grossRevenue: lines.length ? roundMoney(lines.reduce((sum, line) => sum + line.gross, 0)) : roundMoney(invoice.grandTotal),
    cost,
    profit,
    marginPct: profit !== null && costCoverageComplete && revenue > 0 ? profit / revenue * 100 : null,
    lines,
    costCoverageComplete
  };
};

export const getInvoiceLineProfit = (invoice, lineIndex) =>
  getInvoiceProfitSummary(invoice).lines[Number(lineIndex)]?.profit ?? null;
