import test from 'node:test';
import assert from 'node:assert/strict';
import { hasInvoiceStockChanges, reconcileCustomerAfterInvoiceEdit } from '../src/utils/invoiceEditAccounting.js';

const originalInvoice = {
  invoiceNo: 'ALZ-EST-0100',
  customerName: 'Asha',
  customerPhone: '9123456789',
  grandTotal: 11000,
  paidAmount: 9000,
  balanceDue: 2000
};

test('adjusts the same customer Khata and lifetime total when an invoice is edited', () => {
  const customers = [{ id: 'CUST-1', name: 'Asha', phone: '+91 9123456789', totalSpent: 11000, balanceDue: 2500 }];
  const updated = reconcileCustomerAfterInvoiceEdit(customers, originalInvoice, {
    ...originalInvoice, grandTotal: 12000, paidAmount: 9000, balanceDue: 3000, khataDue: 3000
  });
  assert.equal(updated[0].totalSpent, 12000);
  assert.equal(updated[0].balanceDue, 3500);
});

test('moves the edited invoice amount and due to a new customer phone', () => {
  const customers = [
    { id: 'CUST-1', name: 'Asha', phone: '9123456789', totalSpent: 11000, balanceDue: 2000 },
    { id: 'CUST-2', name: 'Balu', phone: '9876543210', totalSpent: 500, balanceDue: 100 }
  ];
  const updated = reconcileCustomerAfterInvoiceEdit(customers, originalInvoice, {
    ...originalInvoice, customerName: 'Balu', customerPhone: '9876543210', grandTotal: 12000, balanceDue: 3000, khataDue: 3000
  });
  assert.deepEqual(updated.map(customer => [customer.totalSpent, customer.balanceDue]), [[0, 0], [12500, 3100]]);
});

test('creates a CRM record when the edited invoice is moved to a new customer', () => {
  const updated = reconcileCustomerAfterInvoiceEdit(
    [{ id: 'CUST-1', name: 'Asha', phone: '9123456789', totalSpent: 11000, balanceDue: 2000 }],
    originalInvoice,
    { ...originalInvoice, customerName: 'Chandru', customerPhone: '9000000000', grandTotal: 10000, balanceDue: 1000, khataDue: 1000 }
  );
  assert.equal(updated.length, 2);
  assert.deepEqual([updated[1].name, updated[1].phone, updated[1].totalSpent, updated[1].balanceDue], ['Chandru', '9000000000', 10000, 1000]);
});

test('flags quantity and device identifier edits that need inventory movement', () => {
  const original = { items: [{ id: 'prod-1', qty: 1, imeis: ['imei-1'] }] };
  assert.equal(hasInvoiceStockChanges(original, { items: [{ id: 'prod-1', qty: 2, imeis: ['imei-1', 'imei-2'] }] }), true);
  assert.equal(hasInvoiceStockChanges(original, { items: [{ id: 'prod-1', qty: 1, imeis: ['imei-2'] }] }), true);
  assert.equal(hasInvoiceStockChanges(original, { items: [{ id: 'prod-1', name: 'Corrected title', qty: 1, imeis: ['imei-1'], rate: 900 }] }), false);
});
