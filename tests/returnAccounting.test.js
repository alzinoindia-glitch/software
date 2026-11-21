import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReturnKhataAdjustment, requiresReturnRefundReference } from '../src/utils/returnAccounting.js';

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
