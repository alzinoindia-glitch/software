import test from 'node:test';
import assert from 'node:assert/strict';
import { getInvoiceProfitSummary } from '../src/utils/profitAccounting.js';

test('calculates margin from GST-exclusive sale and supplier cost', () => {
  const summary = getInvoiceProfitSummary({
    grandTotal: 150,
    totalProfit: 42.86,
    items: [{
      qty: 1,
      total: 150,
      taxable: 142.86,
      gstAmount: 7.14,
      buyPrice: 105,
      buyCostBase: 100,
      purchaseGstRate: 5,
      profitCostOfGoods: 100,
      profitCostPerUnit: 100
    }]
  });

  assert.equal(summary.revenue, 142.86);
  assert.equal(summary.cost, 100);
  assert.equal(summary.profit, 42.86);
  assert.equal(Number(summary.marginPct.toFixed(2)), 30);
});

test('does not apply the invoice discount twice when tax values already include it', () => {
  const summary = getInvoiceProfitSummary({
    grandTotal: 105,
    discount: 10,
    discountIncludedInTaxBreakdown: true,
    items: [{
      qty: 1,
      total: 105,
      taxable: 100,
      gstAmount: 5,
      buyPrice: 80,
      profitCostOfGoods: 80
    }]
  });

  assert.equal(summary.revenue, 100);
  assert.equal(summary.profit, 20);
});

test('derives recoverable input GST from a supplier unit cost marked GST-inclusive', () => {
  const summary = getInvoiceProfitSummary({
    items: [{
      qty: 1,
      total: 150,
      taxable: 142.86,
      gstAmount: 7.14,
      buyPrice: 105,
      purchaseGstRate: 5,
      buyPriceIncludesGst: true
    }]
  });

  assert.equal(summary.cost, 100);
  assert.equal(summary.profit, 42.86);
  assert.equal(summary.costCoverageComplete, true);
});

test('recalculates cost by current invoice quantity from the per-unit purchase basis', () => {
  const summary = getInvoiceProfitSummary({
    items: [{ qty: 2, total: 300, taxable: 300, gstAmount: 0, profitCostPerUnit: 100 }]
  });

  assert.equal(summary.cost, 200);
  assert.equal(summary.profit, 100);
});

test('recalculates cost from sold supplier units when the saved quantity changes', () => {
  const summary = getInvoiceProfitSummary({
    items: [{
      qty: 2,
      total: 300,
      taxable: 300,
      profitCostOfGoods: 90,
      soldUnitRecords: [{ purchaseCost: 90 }, { purchaseCost: 100 }]
    }]
  });

  assert.equal(summary.cost, 190);
  assert.equal(summary.profit, 110);
});

test('uses the saved invoice profit when historical purchase cost is unavailable', () => {
  const summary = getInvoiceProfitSummary({
    totalProfit: 25,
    items: [{ qty: 1, total: 118, taxable: 100, gstAmount: 18 }]
  });

  assert.equal(summary.profit, 25);
  assert.equal(summary.cost, null);
  assert.equal(summary.marginPct, null);
  assert.equal(summary.costCoverageComplete, false);
});

test('keeps unknown profit unknown when neither a cost nor a saved profit exists', () => {
  const summary = getInvoiceProfitSummary({
    items: [{ qty: 1, total: 118, taxable: 100, gstAmount: 18 }]
  });

  assert.equal(summary.profit, null);
  assert.equal(summary.marginPct, null);
});
