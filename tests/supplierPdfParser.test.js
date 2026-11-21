import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSupplierPdfItems } from '../src/utils/supplierPdfParser.js';

const textItem = (str, x, y) => ({ str, transform: [1, 0, 0, 1, x, y] });

test('extracts product rows from a variable supplier table with wrapped descriptions', () => {
  const items = [
    textItem('Invoice No: INV-AM2627-2660', 40, 780),
    textItem('Invoice Date: 15/11/2026', 410, 780),
    textItem('Prices are GST inclusive', 40, 750),
    textItem('Description', 48, 710),
    textItem('HSN', 235, 710),
    textItem('Qty', 320, 710),
    textItem('Rate', 405, 710),
    textItem('Amount', 540, 710),
    textItem('Wireless Earbuds Model X', 48, 686),
    textItem('with charging case', 48, 676),
    textItem('85183000', 235, 686),
    textItem('2', 320, 686),
    textItem('100.00', 405, 686),
    textItem('18%', 500, 686),
    textItem('236.00', 540, 686),
    textItem('USB-C Cable 1m', 48, 650),
    textItem('85444200', 235, 650),
    textItem('1', 320, 650),
    textItem('50.00', 405, 650),
    textItem('59.00', 540, 650),
    textItem('Subtotal', 440, 625)
  ];

  const result = parseSupplierPdfItems(items);
  assert.equal(result.invoiceNumber, 'INV-AM2627-2660');
  assert.equal(result.invoiceDate, '2026-11-15');
  assert.equal(result.includesGst, true);
  assert.equal(result.lines.length, 2);
  assert.deepEqual(result.lines[0], {
    name: 'Wireless Earbuds Model X with charging case',
    hsn: '85183000',
    quantity: 2,
    unitCost: 118,
    gstRate: 18,
    unitCostIncludesGst: true
  });
  assert.equal(result.lines[1].name, 'USB-C Cable 1m');
  assert.equal(result.lines[1].quantity, 1);
});

test('recognizes alternate header wording and GST-exclusive invoices', () => {
  const result = parseSupplierPdfItems([
    textItem('Bill No: 981', 40, 800),
    textItem('Date: 2026-11-18', 410, 800),
    textItem('GST extra', 40, 760),
    textItem('Particulars', 80, 700),
    textItem('Quantity', 350, 700),
    textItem('Unit Price', 465, 700),
    textItem('Line Total', 585, 700),
    textItem('Screen protector', 80, 676),
    textItem('3', 350, 676),
    textItem('₹200.00', 465, 676),
    textItem('₹600.00', 585, 676),
    textItem('Grand Total', 480, 640)
  ]);
  assert.equal(result.invoiceNumber, '981');
  assert.equal(result.invoiceDate, '2026-11-18');
  assert.equal(result.includesGst, false);
  assert.equal(result.lines.length, 1);
  assert.equal(result.lines[0].name, 'Screen protector');
  assert.equal(result.lines[0].quantity, 3);
  assert.equal(result.lines[0].unitCost, 200);
});

test('does not guess product lines when a table header is absent', () => {
  const result = parseSupplierPdfItems([
    textItem('Invoice INV-ACME-43', 50, 800),
    textItem('Phone case', 50, 680),
    textItem('2', 400, 680),
    textItem('100', 550, 680)
  ]);
  assert.equal(result.lines.length, 0);
});
