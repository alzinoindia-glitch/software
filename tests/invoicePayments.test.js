import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPaymentToInvoice } from '../src/utils/invoicePayments.js';

test('partial Khata payment reduces due and keeps a payment record', () => {
  const invoice = { invoiceNo: 'ALZ-SRV-1', grandTotal: 1000, paidAmount: 0, balanceDue: 1000, paymentStatus: 'KHATA_DUE' };
  const updated = applyPaymentToInvoice(invoice, { id: 'PAY-1', amount: 400, mode: 'UPI', reference: 'UTR123' });
  assert.equal(updated.balanceDue, 600);
  assert.equal(updated.khataDue, 600);
  assert.equal(updated.paidAmount, 400);
  assert.equal(updated.paymentStatus, 'PARTIAL');
  assert.deepEqual(updated.payments, [{ id: 'PAY-1', amount: 400, mode: 'UPI', reference: 'UTR123' }]);
  assert.equal(invoice.balanceDue, 1000);
});

test('final Khata payment marks the invoice paid without a negative balance', () => {
  const updated = applyPaymentToInvoice({ grandTotal: 1000, paidAmount: 700, balanceDue: 300 }, { amount: 500, mode: 'Cash' });
  assert.equal(updated.balanceDue, 0);
  assert.equal(updated.khataDue, 0);
  assert.equal(updated.paidAmount, 1000);
  assert.equal(updated.paymentStatus, 'PAID');
  assert.equal(updated.payments.at(-1).amount, 300);
});
