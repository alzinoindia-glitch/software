import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextInvoiceNumber } from '../src/utils/invoiceNumbering.js';

test('uses the highest existing sequence instead of collection length', () => {
  const invoices = [
    { invoiceNo: 'ALZ-INV-0083' },
    { invoiceNo: 'ALZ-INV-0087' },
    { invoiceNo: 'ALZ-EST-0099' }
  ];
  assert.equal(getNextInvoiceNumber(invoices, 'ALZ-INV', 82), 'ALZ-INV-0088');
});

test('keeps sequence numbers unique across workflows sharing an invoice prefix', () => {
  const invoices = [{ invoiceNumber: 'ALZ-INV-0201' }, { invoiceNo: 'ALZ-REF-0103' }];
  assert.equal(getNextInvoiceNumber(invoices, 'ALZ-INV', 82), 'ALZ-INV-0202');
  assert.equal(getNextInvoiceNumber(invoices, 'ALZ-REF', 100), 'ALZ-REF-0104');
});

test('starts an unused prefix at its configured minimum sequence', () => {
  assert.equal(getNextInvoiceNumber([], 'ALZ-EST', 82), 'ALZ-EST-0083');
  assert.equal(getNextInvoiceNumber([], 'ALZ-SRV', 200), 'ALZ-SRV-0201');
});
