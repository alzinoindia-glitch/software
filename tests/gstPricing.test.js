import test from 'node:test';
import assert from 'node:assert/strict';
import { getPurchaseCostBreakdown, getSalePriceBreakdown } from '../src/utils/gstPricing.js';

test('keeps GST-inclusive supplier cost unchanged in inventory landed cost', () => {
  const purchase = getPurchaseCostBreakdown(1180, 18, true);
  assert.deepEqual(purchase, { entered: 1180, taxable: 1000, gst: 180, gross: 1180 });
});

test('adds GST once only when the supplier quoted a pre-GST cost', () => {
  const purchase = getPurchaseCostBreakdown(1000, 18, false);
  assert.deepEqual(purchase, { entered: 1000, taxable: 1000, gst: 180, gross: 1180 });
});

test('does not add GST again to a GST-inclusive selling price', () => {
  const sale = getSalePriceBreakdown(1180, 1, 18, true, true);
  assert.deepEqual(sale, { taxable: 1000, gst: 180, gross: 1180 });
});

test('keeps zero-rate products at zero GST on a GST invoice', () => {
  const sale = getSalePriceBreakdown(1000, 1, 0, true, true);
  assert.deepEqual(sale, { taxable: 1000, gst: 0, gross: 1000 });
});
