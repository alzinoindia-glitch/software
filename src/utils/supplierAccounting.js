export const getSupplierBillKey = bill => {
  const invoiceNumber = String(bill?.invoiceNumber || '').trim().toLocaleLowerCase();
  return invoiceNumber ? `invoice:${invoiceNumber}` : `id:${bill?.id || ''}`;
};

export const countUniqueSupplierBills = bills => new Set((bills || []).map(getSupplierBillKey)).size;


// Calculates cost of goods sold from the exact units selected for a sale. Each
// supplier receipt stores its own landed unit cost, so later price changes do
// not rewrite the cost basis of older inventory.
export const getSupplierUnitCostBreakdown = ({
  units = [],
  selectedUnitIds = [],
  quantity = 0,
  fallbackUnitCost = 0,
  supplierId = '',
  supplierName = ''
} = {}) => {
  const count = Math.max(0, Math.floor(Number(quantity) || 0));
  const fallbackCost = Math.max(0, Number(fallbackUnitCost) || 0);
  const selectedIds = new Set((selectedUnitIds || []).map(String));
  const selectedUnits = (units || []).filter(unit => selectedIds.has(String(unit.id))).slice(0, count);
  const allocations = new Map();
  let totalCost = 0;

  const addAllocation = (unit, unitCost) => {
    if (!unit?.supplierId) return;
    const id = String(unit.supplierId);
    const billId = String(unit.supplierBillId || '');
    const key = `${id}:${billId}`;
    const current = allocations.get(key) || {
      supplierId: id,
      supplierName: unit.supplierName || '',
      supplierBillId: billId,
      quantity: 0,
      purchaseCostTotal: 0
    };
    current.quantity += 1;
    current.purchaseCostTotal += unitCost;
    allocations.set(key, current);
  };

  selectedUnits.forEach(unit => {
    const storedCost = unit?.purchaseCost;
    const unitCost = storedCost !== undefined && storedCost !== null && storedCost !== '' && Number.isFinite(Number(storedCost))
      ? Math.max(0, Number(storedCost))
      : fallbackCost;
    totalCost += unitCost;
    addAllocation(unit, unitCost);
  });

  const untrackedQuantity = Math.max(0, count - selectedUnits.length);
  totalCost += untrackedQuantity * fallbackCost;
  if (!allocations.size && supplierId) {
    allocations.set(String(supplierId), {
      supplierId: String(supplierId),
      supplierName: supplierName || '',
      supplierBillId: '',
      quantity: count,
      purchaseCostTotal: count * fallbackCost
    });
  }

  const supplierAllocations = [...allocations.values()].map(allocation => ({
    ...allocation,
    unitCost: allocation.quantity ? allocation.purchaseCostTotal / allocation.quantity : 0,
    purchaseCostTotal: Math.round((allocation.purchaseCostTotal + Number.EPSILON) * 100) / 100
  }));

  return {
    quantity: count,
    totalCost: Math.round((totalCost + Number.EPSILON) * 100) / 100,
    averageUnitCost: count ? totalCost / count : fallbackCost,
    supplierAllocations,
    soldUnitRecords: selectedUnits.map(unit => {
      const storedCost = unit?.purchaseCost;
      const purchaseCost = storedCost !== undefined && storedCost !== null && storedCost !== '' && Number.isFinite(Number(storedCost))
        ? Math.max(0, Number(storedCost))
        : fallbackCost;
      return {
        identifier: String(unit.id || unit.imei || unit.barcode || unit.serialNumber || ''),
        imei: String(unit.imei || ''),
        barcode: String(unit.barcode || ''),
        serialNumber: String(unit.serialNumber || ''),
        supplierId: String(unit.supplierId || ''),
        supplierName: unit.supplierName || '',
        supplierBillId: String(unit.supplierBillId || ''),
        purchaseCost,
        unitRecord: unit.unitRecord || null
      };
    }).filter(record => record.identifier),
    attributedQuantity: supplierAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0),
    unattributedQuantity: Math.max(0, count - supplierAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0))
  };
};
