import test from 'node:test';
import assert from 'node:assert/strict';
import { getInvoicePrintZoom } from '../src/utils/printLayout.js';

test('A4 invoice stays at natural scale when its content fits', () => {
  assert.equal(getInvoicePrintZoom(800, 1000), 1);
});

test('A4 invoice scales down only enough to fit the printable page height', () => {
  assert.equal(getInvoicePrintZoom(2000, 1000), 0.5);
});

test('invalid print measurements fall back to a safe natural scale', () => {
  assert.equal(getInvoicePrintZoom(0, 1000), 1);
  assert.equal(getInvoicePrintZoom(100, Number.NaN), 1);
});
