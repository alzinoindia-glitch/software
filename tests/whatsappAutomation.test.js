import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWhatsAppRepairText } from '../src/utils/whatsappAutomation.js';

test('repair payment reminder uses the actual outstanding balance and bill amounts', () => {
  const message = generateWhatsAppRepairText({
    jobId: 'ALZ-REP-1', customerName: 'Iliyas', deviceModel: 'OnePlus',
    invoiceNo: 'ALZ-SRV-1', billedAt: 1500, paidAmount: 500, balanceDue: 1000,
  }, { name: 'ALZINO' }, 'payment-pending');
  assert.match(message, /successfully delivered/i);
  assert.match(message, /Final Bill Amount:\* ₹1,500/);
  assert.match(message, /Paid:\* ₹500/);
  assert.match(message, /Outstanding Balance:\* ₹1,000/);
  assert.doesNotMatch(message, /\[Amount\]/);
});

test('repair delivery WhatsApp message distinguishes paid from pending', () => {
  const unpaid = generateWhatsAppRepairText({ customerName: 'Iliyas', deviceModel: 'OnePlus', balanceDue: 1000 }, {}, 'delivered');
  const paid = generateWhatsAppRepairText({ customerName: 'Iliyas', deviceModel: 'OnePlus', balanceDue: 0 }, {}, 'delivered');
  assert.match(unpaid, /Pending ₹1,000/);
  assert.match(paid, /Paid in full/);
});
