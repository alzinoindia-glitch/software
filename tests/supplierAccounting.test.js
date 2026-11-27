import test from 'node:test';
import assert from 'node:assert/strict';
import { getInvoiceItemProfitCost, getNetSupplierAllocations, getSupplierUnitCostBreakdown } from '../src/utils/supplierAccounting.js';
import { applySupplierPayment } from '../src/utils/supplierPayments.js';

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
  assert.deepEqual(result.soldUnitRecords.map(unit => [unit.identifier, unit.supplierBillId, unit.purchaseCost]), [
    ['imei-1', 'bill-a', 100],
    ['imei-2', 'bill-b', 140]
  ]);
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


test('removes returned serialized units from their exact supplier bill sell-through', () => {
  const result = getNetSupplierAllocations({
    qty: 2,
    supplierAllocations: [
      { supplierId: 'supplier-a', supplierBillId: 'bill-a', quantity: 1, purchaseCostTotal: 100 },
      { supplierId: 'supplier-b', supplierBillId: 'bill-b', quantity: 1, purchaseCostTotal: 200 }
    ],
    soldUnitRecords: [
      { identifier: 'imei-a', supplierId: 'supplier-a', supplierBillId: 'bill-a' },
      { identifier: 'imei-b', supplierId: 'supplier-b', supplierBillId: 'bill-b' }
    ]
  }, [{ quantity: 1, returnedImeis: ['imei-b'] }]);

  assert.deepEqual(result.allocations.map(item => [item.supplierId, item.supplierBillId, item.quantity]), [
    ['supplier-a', 'bill-a', 1]
  ]);
  assert.equal(result.unattributedQuantity, 0);
});

test('deducts legacy returns without identifiers from the oldest supplier allocation', () => {
  const result = getNetSupplierAllocations({
    qty: 3,
    supplierAllocations: [
      { supplierId: 'supplier-a', supplierBillId: 'bill-a', quantity: 2, purchaseCostTotal: 200 },
      { supplierId: 'supplier-b', supplierBillId: 'bill-b', quantity: 1, purchaseCostTotal: 150 }
    ]
  }, [{ quantity: 1, returnedImeis: [] }]);

  assert.deepEqual(result.allocations.map(item => [item.supplierId, item.quantity]), [
    ['supplier-a', 1],
    ['supplier-b', 1]
  ]);
});


test('subtracts the returned unit actual cost from a mixed-cost supplier bill', () => {
  const result = getNetSupplierAllocations({
    qty: 2,
    supplierAllocations: [
      { supplierId: 'supplier-a', supplierBillId: 'bill-a', quantity: 2, purchaseCostTotal: 300 }
    ],
    soldUnitRecords: [
      { identifier: 'imei-a', supplierId: 'supplier-a', supplierBillId: 'bill-a', purchaseCost: 100 },
      { identifier: 'imei-b', supplierId: 'supplier-a', supplierBillId: 'bill-a', purchaseCost: 200 }
    ]
  }, [{ quantity: 1, returnedImeis: ['imei-b'] }]);

  assert.deepEqual(result.allocations.map(item => [item.quantity, item.purchaseCostTotal]), [[1, 100]]);
});


test('allocates supplier payments to oldest bills then Khata and updates payable', () => {
  const supplier = {
    balancePayable: 400,
    purchaseBills: [
      { id: 'bill-new', date: '2026-11-02', totalAmount: 200, paidAmount: 0, balanceDue: 200 },
      { id: 'bill-old', date: '2026-10-01', totalAmount: 100, paidAmount: 0, balanceDue: 100 }
    ],
    khataEntries: [{ id: 'khata-1', amount: 100, paidAmount: 0, balanceDue: 100 }],
    payments: []
  };
  const result = applySupplierPayment(supplier, { id: 'pay-1', date: '2026-11-21', amount: 250, mode: 'UPI', note: 'UTR-123' });

  assert.equal(result.success, true);
  assert.equal(result.supplier.purchaseBills.find(bill => bill.id === 'bill-old').balanceDue, 0);
  assert.equal(result.supplier.purchaseBills.find(bill => bill.id === 'bill-new').balanceDue, 50);
  assert.equal(result.supplier.khataEntries[0].balanceDue, 100);
  assert.equal(result.supplier.balancePayable, 150);
  assert.deepEqual(result.supplier.payments[0].allocations.bills, [
    { billId: 'bill-old', invoiceNumber: '', amount: 100 },
    { billId: 'bill-new', invoiceNumber: '', amount: 150 }
  ]);
});

test('rejects supplier payments above the recorded payable without changing the supplier', () => {
  const supplier = { balancePayable: 20, purchaseBills: [], khataEntries: [], payments: [] };
  const result = applySupplierPayment(supplier, { id: 'pay-over', amount: 21, mode: 'Cash' });

  assert.equal(result.success, false);
  assert.equal(supplier.balancePayable, 20);
  assert.equal(supplier.payments.length, 0);
});

test('uses the taxable supplier cost when computing profit for GST-inclusive purchases', () => {
  const cost = getSupplierUnitCostBreakdown({
    quantity: 1,
    fallbackUnitCost: 125,
    fallbackGstRate: 25,
    units: [{
      id: 'serial-125', supplierId: 'supplier-a', supplierName: 'Supplier A', supplierBillId: 'bill-1',
      purchaseCost: 125, purchaseCostEntered: 125, purchaseCostIncludesGst: true, purchaseGstRate: 25
    }],
    selectedUnitIds: ['serial-125']
  });

  assert.equal(cost.totalCost, 125);
  assert.equal(cost.taxableCostTotal, 100);
  assert.equal(getInvoiceItemProfitCost({ qty: 1, soldUnitRecords: cost.soldUnitRecords }), 100);
  assert.equal(150 - getInvoiceItemProfitCost({ qty: 1, soldUnitRecords: cost.soldUnitRecords }), 50);
});

test('recalculates invoice cost when its quantity is edited', () => {
  assert.equal(getInvoiceItemProfitCost({ qty: 2, profitCostPerUnit: 100, profitCostOfGoods: 100 }), 200);
  assert.equal(getInvoiceItemProfitCost({ qty: 2, profitCostPerUnit: 110, soldUnitRecords: [
    { purchaseCost: 125, purchaseCostEntered: 125, purchaseCostIncludesGst: true, purchaseGstRate: 25 },
    { purchaseCost: 150, purchaseCostEntered: 150, purchaseCostIncludesGst: true, purchaseGstRate: 25 }
  ] }), 220);
});
