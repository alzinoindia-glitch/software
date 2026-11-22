import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRepairInvoiceToCustomerLedger, getRepairBalanceDue } from '../src/utils/repairAccounting.js';

test('repair customer lifetime spend uses the discounted invoice total and numeric legacy totals', () => {
  const customers = [{ id: 'C1', phone: '9121212292', totalSpent: '1500', balanceDue: '300' }];
  const updated = applyRepairInvoiceToCustomerLedger(customers, {
    phone: '+91 91212 12292', invoiceTotal: 900, khataDue: 200
  });
  assert.equal(updated[0].totalSpent, 2400);
  assert.equal(updated[0].balanceDue, 500);
  assert.equal(updated[0].phone, '9121212292');
});

test('repair invoice creates a customer with recorded amount and Khata due', () => {
  const updated = applyRepairInvoiceToCustomerLedger([], {
    phone: '9121212292', name: 'Asha', invoiceTotal: 1200, khataDue: 400, newCustomerId: 'C2'
  });
  assert.deepEqual(updated[0], {
    id: 'C2', name: 'Asha', phone: '9121212292', address: '', gstin: '', totalSpent: 1200, balanceDue: 400
  });
});

test('repair invoice does not create an incomplete phone ledger entry', () => {
  const customers = [];
  assert.equal(applyRepairInvoiceToCustomerLedger(customers, { phone: '1234', invoiceTotal: 500 }), customers);
});

test('repair balance comes from the final invoice even after device delivery', () => {
  assert.equal(getRepairBalanceDue({ status: 'Delivered', balanceDue: 0 }, {
    grandTotal: 1500, paidAmount: 500, balanceDue: 1000
  }), 1000);
});

test('legacy repair invoice due falls back to total less payments', () => {
  assert.equal(getRepairBalanceDue({}, { grandTotal: 1500, paidAmount: 500 }), 1000);
});
