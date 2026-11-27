import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReturnKhataAdjustment, getReplacementRefundPaymentFields, requiresReturnRefundReference, sumPendingRefundLiabilities, sumReplacementSettlement, sumReturnProfitAdjustments, sumReplacementProfitAdjustments, sumReturnTaxableRevenueAdjustments, sumReplacementTaxableRevenueAdjustments } from '../src/utils/returnAccounting.js';

test('clears customer Khata when returned goods cancel an unpaid invoice balance', () => {
  const updated = applyReturnKhataAdjustment({ id: 'C1', balanceDue: 1000 }, { outstandingCleared: 1000 });
  assert.equal(updated.balanceDue, 0);
});

test('clears returned invoice debt and records a new exchange balance due', () => {
  const entry = { id: 'RET-1', amount: 400, balanceDue: 400, description: 'Exchange difference' };
  const updated = applyReturnKhataAdjustment(
    { id: 'C1', balanceDue: 1000, khataEntries: [] },
    { outstandingCleared: 1000, newKhataDue: 400, entry }
  );
  assert.equal(updated.balanceDue, 400);
  assert.deepEqual(updated.khataEntries, [entry]);
});

test('never makes customer Khata negative when a return credit exceeds the recorded balance', () => {
  const updated = applyReturnKhataAdjustment({ id: 'C1', balanceDue: 100 }, { outstandingCleared: 250 });
  assert.equal(updated.balanceDue, 0);
});

test('requires traceable references for exchange refunds paid through UPI or bank transfer', () => {
  assert.equal(requiresReturnRefundReference({ action: 'replacement', direction: 'refund', amount: 500, method: 'UPI' }), true);
  assert.equal(requiresReturnRefundReference({ action: 'replacement', direction: 'refund', amount: 500, method: 'Bank transfer' }), true);
  assert.equal(requiresReturnRefundReference({ action: 'replacement', direction: 'refund', amount: 500, method: 'Cash' }), false);
  assert.equal(requiresReturnRefundReference({ action: 'replacement', direction: 'collect', amount: 500, method: 'UPI' }), false);
});

test('tracks an exchange refund as a pending Khata liability until payment', () => {
  assert.deepEqual(getReplacementRefundPaymentFields({ direction: 'refund', amount: 650, method: 'Khata (pay later)' }), {
    amount: 650, method: 'Khata (pay later)', reference: '', paidAmount: 0, pendingAmount: 650, status: 'pending'
  });
});

test('records immediate exchange refunds as paid and leaves other settlements clear', () => {
  assert.deepEqual(getReplacementRefundPaymentFields({ direction: 'refund', amount: 650, method: 'UPI', reference: 'UTR-1' }), {
    amount: 650, method: 'UPI', reference: 'UTR-1', paidAmount: 650, pendingAmount: 0, status: 'paid'
  });
  assert.deepEqual(getReplacementRefundPaymentFields({ direction: 'collect', amount: 650, method: 'Khata due' }), {});
  assert.deepEqual(getReplacementRefundPaymentFields({ direction: 'even', amount: 0, method: 'Cash' }), {});
});

test('separates pending return and exchange refunds from actual settlement inflow or outflow', () => {
  const invoices = [{ returnTransactions: [
    { id: 'R1', type: 'refund', refundAmount: 300, refundPendingAmount: 300, refundMethod: 'Khata (pay later)' },
    { id: 'R2', type: 'replacement', settlement: { direction: 'refund', method: 'Khata (pay later)', amount: 200 }, refundPendingAmount: 200 },
    { id: 'R3', type: 'replacement', settlement: { direction: 'refund', method: 'UPI', amount: 100 }, refundPendingAmount: 0 }
  ] }];
  assert.equal(sumPendingRefundLiabilities(invoices), 500);
  assert.equal(sumReplacementSettlement(invoices), -100);
});

test('partial refund keeps the approved retained amount in taxable sales and profit', () => {
  const invoices = [{ returnTransactions: [{
    type: 'refund', status: 'completed', quantity: 1,
    originalUnitTaxablePaid: 100, originalUnitProfit: 40, originalUnitTaxableCost: 60,
    retainedTaxableAmount: 20, returnValue: 120, refundAmount: 100, restocked: true
  }] }];

  assert.equal(sumReturnTaxableRevenueAdjustments(invoices), -80);
  assert.equal(sumReturnProfitAdjustments(invoices), 20);
});

test('replacement accounting retains partial-return value and adds replacement margin once', () => {
  const invoices = [{ returnTransactions: [{
    type: 'replacement', status: 'completed', quantity: 1,
    originalUnitTaxablePaid: 100, originalUnitProfit: 40, retainedTaxableAmount: 20,
    replacements: [{ quantity: 1, unitTaxablePrice: 200, unitProfit: 140 }]
  }] }];

  assert.equal(sumReplacementTaxableRevenueAdjustments(invoices), 120);
  assert.equal(sumReplacementProfitAdjustments(invoices), 120);
});
