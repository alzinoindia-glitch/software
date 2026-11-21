import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupplierUnitCostBreakdown } from '../src/utils/supplierAccounting.js';

test('uses the selected units actual costs and preserves supplier bill attribution', () => {
  const result = getSupplierUnitCostBreakdown({
    quantity: 2,
    fallbackUnitCost: 99,
    units: [
      { id: 'imei-1', supplierId: 'supplier-a', supplierName: 'Supplier A', supplierBillId: 'bill-a', purchaseCost: 100 },
      { id: 'imei-2', supplierId: 'supplier-b', supplierName: 'Supplier B', supplierBillId: 'bill-b', purchaseCost: 140 },
      { id: 'imei-3', supplierId: 'supplier-a', supplierBillId: 'bill-c', purchaseCost: 180 }
    ],
    selectedUnitIds: ['imei-1', 'imei-2']
  });

  assert.equal(result.totalCost, 240);
  assert.equal(result.averageUnitCost, 120);
  assert.equal(result.attributedQuantity, 2);
  assert.equal(result.unattributedQuantity, 0);
  assert.deepEqual(result.supplierAllocations.map(item => [item.supplierId, item.supplierBillId, item.quantity, item.purchaseCostTotal]), [
    ['supplier-a', 'bill-a', 1, 100],
    ['supplier-b', 'bill-b', 1, 140]
  ]);
});

test('uses the current fallback cost only for units without a stored batch cost', () => {
  const result = getSupplierUnitCostBreakdown({
    quantity: 2,
    fallbackUnitCost: 50,
    units: [
      { id: 'serial-1', supplierId: 'supplier-a', supplierBillId: 'bill-a' },
      { id: 'serial-2', supplierId: 'supplier-b', supplierBillId: 'bill-b', purchaseCost: 80 }
    ],
    selectedUnitIds: ['serial-1', 'serial-2']
  });
  assert.equal(result.totalCost, 130);
  assert.equal(result.averageUnitCost, 65);
  assert.equal(result.supplierAllocations[0].purchaseCostTotal, 50);
});

test('falls back to product cost and supplier for products without selected unit records', () => {
  const result = getSupplierUnitCostBreakdown({
    quantity: 3,
    fallbackUnitCost: 25,
    supplierId: 'supplier-legacy',
    supplierName: 'Legacy Supplier'
  });
  assert.equal(result.totalCost, 75);
  assert.equal(result.supplierAllocations.length, 1);
  assert.equal(result.supplierAllocations[0].quantity, 3);
  assert.equal(result.unattributedQuantity, 0);
});
