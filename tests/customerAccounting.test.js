import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCustomerSpend } from '../src/utils/customerAccounting.js';

test('a repair invoice and its delivered job count once at the billed total', () => {
  const summary = calculateCustomerSpend({
    invoices: [
      { invoiceNo: 'ALZ-INV-1', grandTotal: 2500 },
      { invoiceNo: 'ALZ-SRV-1', isRepairInvoice: true, repairJobRef: 'REPAIR-1', grandTotal: 900 }
    ],
    repairs: [{ recordId: 'REPAIR-1', status: 'Delivered', billedAt: 1500, estimatedCost: 1800 }]
  });
  assert.deepEqual(summary, { salesSpend: 2500, repairSpend: 900, computedTotal: 3400, totalSpent: 3400 });
});

test('only a delivered legacy repair without an invoice adds fallback spend', () => {
  const summary = calculateCustomerSpend({ repairs: [
    { recordId: 'R1', status: 'Delivered', billedAt: 700 },
    { recordId: 'R2', status: 'Received', estimatedCost: 5000 }
  ] });
  assert.equal(summary.repairSpend, 700);
  assert.equal(summary.totalSpent, 700);
});

test('recorded lifetime spend remains the floor when it exceeds reconstructed invoices', () => {
  const summary = calculateCustomerSpend({ invoices: [{ grandTotal: 1000 }], recordedTotal: 1350 });
  assert.equal(summary.totalSpent, 1350);
});
