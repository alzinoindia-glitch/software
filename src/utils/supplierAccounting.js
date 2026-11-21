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
        imei1: String(unit.imei1 || ''),
        imei2: String(unit.imei2 || ''),
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


// Returns reduce supplier sell-through for the exact batch that was sold when a
// returned IMEI, serial or stock-unit barcode is available. Legacy returns with
// no unit identifier are deducted from the oldest recorded supplier allocation.
export const getNetSupplierAllocations = (line = {}, returnTransactions = []) => {
  const lineQuantity = Math.max(0, Number(line.qty || 0));
  const allocations = (line.supplierAllocations || []).map(allocation => ({
    ...allocation,
    quantity: Math.max(0, Number(allocation.quantity || 0)),
    purchaseCostTotal: Math.max(0, Number(allocation.purchaseCostTotal || 0))
  }));
  let unattributedQuantity = Math.max(0, Number(
    line.unattributedSupplierQuantity ?? Math.max(0, lineQuantity - allocations.reduce((sum, item) => sum + item.quantity, 0))
  ) || 0);
  const soldUnits = line.soldUnitRecords || [];
  let unassignedReturnCount = 0;

  const decrementAllocation = (supplierId, supplierBillId = '', returnedUnitCost) => {
    const exact = allocations.find(allocation => String(allocation.supplierId || '') === String(supplierId || '')
      && String(allocation.supplierBillId || '') === String(supplierBillId || '')
      && allocation.quantity > 0);
    const allocation = exact || allocations.find(item => String(item.supplierId || '') === String(supplierId || '') && item.quantity > 0);
    if (!allocation) return false;
    const previousQuantity = allocation.quantity;
    allocation.quantity = Math.max(0, previousQuantity - 1);
    const hasExactUnitCost = returnedUnitCost !== undefined && returnedUnitCost !== null
      && returnedUnitCost !== '' && Number.isFinite(Number(returnedUnitCost));
    if (hasExactUnitCost) {
      allocation.purchaseCostTotal = Math.round((Math.max(0, allocation.purchaseCostTotal - Math.max(0, Number(returnedUnitCost))) + Number.EPSILON) * 100) / 100;
    } else if (previousQuantity > 0) {
      // Older invoices may not retain a per-unit cost; approximate those at
      // the batch's remaining average cost.
      allocation.purchaseCostTotal *= allocation.quantity / previousQuantity;
    }
    return true;
  };

  (returnTransactions || []).filter(entry => entry?.status !== 'voided').forEach(entry => {
    const quantity = Math.max(0, Number(entry?.quantity || 0));
    const identifiers = [...new Set((entry?.returnedImeis || []).map(String))];
    let matchedReturns = 0;
    identifiers.forEach(identifier => {
      const unit = soldUnits.find(record => [
        record.identifier, record.imei, record.imei1, record.imei2, record.serialNumber, record.barcode
      ].some(value => value && String(value) === identifier));
      if (!unit) return;
      if (unit.supplierId && decrementAllocation(unit.supplierId, unit.supplierBillId, unit.purchaseCost)) matchedReturns += 1;
      else if (!unit.supplierId && unattributedQuantity > 0) {
        unattributedQuantity = Math.max(0, unattributedQuantity - 1);
        matchedReturns += 1;
      }
    });
    unassignedReturnCount += Math.max(0, quantity - matchedReturns);
  });

  allocations.forEach(allocation => {
    if (unassignedReturnCount <= 0) return;
    const removed = Math.min(allocation.quantity, unassignedReturnCount);
    const previousQuantity = allocation.quantity;
    allocation.quantity -= removed;
    if (previousQuantity > 0) allocation.purchaseCostTotal *= allocation.quantity / previousQuantity;
    unassignedReturnCount -= removed;
  });
  if (unassignedReturnCount > 0) {
    unattributedQuantity = Math.max(0, unattributedQuantity - unassignedReturnCount);
  }

  return {
    allocations: allocations.filter(allocation => allocation.quantity > 0),
    unattributedQuantity
  };
};
