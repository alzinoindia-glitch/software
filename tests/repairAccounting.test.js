import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRepairInvoiceToCustomerLedger } from '../src/utils/repairAccounting.js';

test('repair customer lifetime spend uses the discounted invoice total and numeric legacy totals', () => {
  const customers = [{ id: 'C1', phone: '9121212292', totalSpent: '1500', balanceDue: '300' }];
  const updated = applyRepairInvoiceToCustomerLedger(customers, { phone: '+91 91212 12292', invoiceTotal: 900, khataDue: 200 });
  assert.equal(updated[0].totalSpent, 2400);
  assert.equal(updated[0].balanceDue, 500);
  assert.equal(updated[0].phone, '9121212292');
});

test('repair invoice creates a customer with recorded amount and Khata due', () => {
  const updated = applyRepairInvoiceToCustomerLedger([], { phone: '9121212292', name: 'Asha', invoiceTotal: 1200, khataDue: 400, newCustomerId: 'C2' });
  assert.deepEqual(updated[0], { id: 'C2', name: 'Asha', phone: '9121212292', address: '', gstin: '', totalSpent: 1200, balanceDue: 400 });
});

test('repair invoice does not create an incomplete phone ledger entry', () => {
  const customers = [];
  assert.equal(applyRepairInvoiceToCustomerLedger(customers, { phone: '1234', invoiceTotal: 500 }), customers);
});
