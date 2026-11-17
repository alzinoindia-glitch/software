import React, { useMemo, useState } from 'react';
import { 
  Receipt, 
  Truck, 
  Plus, 
  Trash2, 
  TrendingDown, 
  Search, 
  IndianRupee,
  Calendar,
  Building2,
  FileCheck,
  ChevronDown
} from 'lucide-react';
import { isImeiTrackedCategory } from '../utils/customTaxonomy';
import { getSupplierBillDocument, saveSupplierBillDocument } from '../utils/supplierBillStore';

const newInwardLine = () => ({ id: `LINE-${Date.now()}-${Math.random()}`, productId: '', quantity: '1', unitCost: '', identifiers: [], imei1Values: [], imei2Values: [] });
const normalizedHeader = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const getCell = (row, ...names) => {
  const keys = Object.keys(row || {});
  const key = keys.find(candidate => names.includes(normalizedHeader(candidate)));
  return key ? row[key] : '';
};

export default function ExpenseSupplier({ 
  initialSubTab = 'expenses',
  expenses, 
  setExpenses, 
  suppliers, 
  setSuppliers, 
  inventory, 
  setInventory, 
  invoices = [],
  role 
}) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab); // expenses | suppliers
  
  // Expense form state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('Tea & Refreshments');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expPaidBy, setExpPaidBy] = useState('Cash');

  // Supplier form state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [expandedSupplierId, setExpandedSupplierId] = useState('');
  const [suppName, setSuppName] = useState('');
  const [suppContact, setSuppContact] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppCity, setSuppCity] = useState('');
  const [suppGstin, setSuppGstin] = useState('');

  // Stock Purchase Inward state
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [inwardItems, setInwardItems] = useState([newInwardLine()]);
  const [inwardDocument, setInwardDocument] = useState(null);
  const [isImportingBill, setIsImportingBill] = useState(false);
  const [inwardInvoiceNumber, setInwardInvoiceNumber] = useState('');
  const [inwardDate, setInwardDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierBillFilter, setSupplierBillFilter] = useState('all');
  const [editingBillId, setEditingBillId] = useState('');

  const expenseCategories = [
    'Shop Rent',
    'Electricity Bill',
    'Tea & Refreshments',
    'Staff Salary',
    'Repair Tools & Consumables',
    'Courier & Freight',
    'Internet & Telephone',
    'Cleaning & Maintenance',
    'Marketing & Banners',
    'Miscellaneous'
  ];

  // Calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expAmount) return;

    const newExp = {
      id: `EXP-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      category: expCategory,
      amount: parseFloat(expAmount),
      notes: expNotes.trim() || expCategory,
      paidBy: expPaidBy,
    };

    setExpenses(prev => [newExp, ...prev]);
    setShowExpenseModal(false);
    setExpAmount('');
    setExpNotes('');
  };

  const handleDeleteExpense = (id) => {
    if (role !== 'admin') {
      alert("Only Admin can delete expense records.");
      return;
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleAddSupplier = (e) => {
    e.preventDefault();
    if (!suppName || !suppPhone) return;

    const phoneDigits = String(suppPhone).replace(/\D/g, '').slice(-10);
    const existingSupplier = suppliers.find(supplier => supplier.id !== editingSupplierId && (() => {
      const existingDigits = String(supplier.phone || '').replace(/\D/g, '').slice(-10);
      return phoneDigits && existingDigits === phoneDigits;
    })());
    if (existingSupplier) {
      alert(`${existingSupplier.name} is already in the supplier directory. Please use that existing supplier.`);
      return;
    }

    const supplierData = {
      name: suppName.trim(),
      contactPerson: suppContact.trim(),
      phone: suppPhone.trim(),
      city: suppCity.trim() || 'Hyderabad',
      gstin: suppGstin.trim(),
    };

    if (editingSupplierId) setSuppliers(prev => prev.map(supplier => supplier.id === editingSupplierId ? { ...supplier, ...supplierData } : supplier));
    else setSuppliers(prev => [{ id: `SUPP-${Date.now()}`, ...supplierData, balancePayable: 0, purchaseBills: [], payments: [] }, ...prev]);
    setShowSupplierModal(false);
    setEditingSupplierId('');
    setSuppName('');
    setSuppContact('');
    setSuppPhone('');
    setSuppCity('');
    setSuppGstin('');
  };

  const editSupplier = supplier => {
    setEditingSupplierId(supplier.id);
    setSuppName(supplier.name || '');
    setSuppContact(supplier.contactPerson || '');
    setSuppPhone(supplier.phone || '');
    setSuppCity(supplier.city || '');
    setSuppGstin(supplier.gstin || '');
    setShowSupplierModal(true);
  };

  const updateInwardLine = (lineId, updates) => setInwardItems(previous => previous.map(line => line.id === lineId ? { ...line, ...updates } : line));

  const editSupplierBill = (supplierId, bill) => {
    if (role !== 'admin') return;
    const lines = (bill.lines?.length ? bill.lines : [{
      productId: bill.productId, productName: bill.productName, quantity: bill.quantity, unitCost: bill.unitCost,
      identifiers: bill.identifiers || [], imei1Values: bill.imei1Values || [], imei2Values: bill.imei2Values || []
    }]).map(line => ({
      ...newInwardLine(), productId: line.productId || '', quantity: String(line.quantity || 1), unitCost: String(line.unitCost || ''),
      identifiers: [...(line.identifiers || [])], imei1Values: [...(line.imei1Values || [])], imei2Values: [...(line.imei2Values || [])], importedName: line.productName || ''
    }));
    setEditingBillId(bill.id);
    setSelectedSupplierId(supplierId);
    setInwardInvoiceNumber(bill.invoiceNumber || '');
    setInwardDate(bill.date || new Date().toISOString().split('T')[0]);
    setInwardItems(lines.length ? lines : [newInwardLine()]);
    setInwardDocument(null);
    setShowInwardModal(true);
  };

  const handleBillFile = async file => {
    if (!file) return;
    setInwardDocument(file);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return;
    setIsImportingBill(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      const billNo = rows[0] && getCell(rows[0], 'invoicenumber', 'invoiceno', 'billnumber', 'billno');
      if (billNo) setInwardInvoiceNumber(String(billNo));
      const lines = rows.map(row => {
        const productName = String(getCell(row, 'product', 'productname', 'item', 'itemname', 'model', 'description') || '').trim();
        const product = inventory.find(item => item.name?.toLowerCase() === productName.toLowerCase() || item.model?.toLowerCase() === productName.toLowerCase())
          || inventory.find(item => productName && (item.name?.toLowerCase().includes(productName.toLowerCase()) || productName.toLowerCase().includes(item.name?.toLowerCase())));
        const list = value => String(value || '').split(/[\n,;]+/).map(value => value.trim()).filter(Boolean);
        let imei1Values = list(getCell(row, 'imei1', 'imei'));
        const imei2Values = list(getCell(row, 'imei2'));
        const identifiers = list(getCell(row, 'serialnumbers', 'serialnumber', 'serialno', 'serial'));
        const genericIds = list(getCell(row, 'imeis'));
        if (product && isImeiTrackedCategory(product.category) && !imei1Values.length) imei1Values = genericIds;
        else if (!identifiers.length) identifiers.push(...genericIds);
        return {
          ...newInwardLine(),
          productId: product?.id || '',
          quantity: String(Number(getCell(row, 'quantity', 'qty', 'units', 'pcs')) || 1),
          unitCost: String(Number(getCell(row, 'unitcost', 'purchasecost', 'cost', 'rate', 'purchaseprice')) || ''),
          identifiers,
          imei1Values,
          imei2Values,
          importedName: productName
        };
      }).filter(line => line.importedName || line.productId);
      if (!lines.length) throw new Error('No product rows were found. Use Product, Quantity, and Unit Cost columns.');
      setInwardItems(lines);
      alert(`Imported ${lines.length} bill line(s). Match any product names that were not recognized.`);
    } catch (error) {
      alert(`Could not read this bill spreadsheet: ${error.message || 'check the file format'}`);
    } finally {
      setIsImportingBill(false);
    }
  };

  const handleStockInward = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId || !inwardItems.length) return;
    const validLines = inwardItems.map(line => ({
      ...line,
      quantity: Number.parseInt(line.quantity, 10),
      unitCost: Number.parseFloat(line.unitCost),
      product: inventory.find(item => item.id === line.productId)
    }));
    if (validLines.some(line => !line.product || !Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isFinite(line.unitCost) || line.unitCost <= 0)) {
      alert('Choose an inventory product and enter a valid quantity and unit cost for every bill line.');
      return;
    }
    if (validLines.some(line => line.identifiers.length > line.quantity || line.imei1Values.length > line.quantity || line.imei2Values.length > line.quantity)) {
      alert('A bill line has more identifiers than received units. Check the spreadsheet quantity and serial/IMEI columns.');
      return;
    }
    const existingSupplier = suppliers.find(s => s.id === selectedSupplierId);
    const existingBill = editingBillId ? existingSupplier?.purchaseBills?.find(bill => bill.id === editingBillId) : null;
    if (editingBillId && (!existingBill || role !== 'admin')) return;
    const invoiceNumber = inwardInvoiceNumber.trim() || existingBill?.invoiceNumber || `SUP-${Date.now().toString().slice(-6)}`;
    const billId = editingBillId || `BILL-${Date.now()}`;
    const billLines = validLines.map(line => ({
      productId: line.productId,
      productName: line.product.name,
      brand: line.product.brand || '',
      quantity: line.quantity,
      unitCost: line.unitCost,
      totalAmount: line.quantity * line.unitCost,
      identifiers: [...new Set([...(line.identifiers || []), ...(line.imei1Values || []), ...(line.imei2Values || [])])],
      imei1Values: [...new Set(line.imei1Values || [])],
      imei2Values: [...new Set(line.imei2Values || [])]
    }));
    const billTotal = billLines.reduce((sum, line) => sum + line.totalAmount, 0);
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (existingBill && billTotal + 0.01 < Number(existingBill.paidAmount || 0)) {
      alert(`This bill already has ${Number(existingBill.paidAmount).toLocaleString('en-IN')} paid. The edited bill total cannot be lower than the amount already paid.`);
      return;
    }
    if (existingBill) {
      const previousByProduct = new Map();
      (existingBill.lines?.length ? existingBill.lines : [{ productId: existingBill.productId, quantity: existingBill.quantity }]).forEach(line => {
        previousByProduct.set(String(line.productId), (previousByProduct.get(String(line.productId)) || 0) + Number(line.quantity || 0));
      });
      const nextByProduct = new Map();
      billLines.forEach(line => nextByProduct.set(String(line.productId), (nextByProduct.get(String(line.productId)) || 0) + Number(line.quantity || 0)));
      for (const [productId, oldQty] of previousByProduct) {
        const remainingTagged = inventory.find(item => String(item.id) === productId)?.units?.filter(unit => unit.supplierBillId === billId).length || 0;
        const soldOrUntracked = Math.max(0, oldQty - remainingTagged);
        const nextQty = nextByProduct.get(productId) || 0;
        if (nextQty < soldOrUntracked) {
          alert(`This bill supplied ${oldQty} units of a product, but only ${remainingTagged} unsold units can be identified. Keep at least ${soldOrUntracked} units on the edited bill to avoid changing sold stock.`);
          return;
        }
        if (!nextByProduct.has(productId) && soldOrUntracked > 0) {
          alert('A product from this bill has already been sold or cannot be traced to an unsold stock unit. Keep it on the edited bill and adjust its remaining quantity instead.');
          return;
        }
      }
      const duplicateBill = (existingSupplier.purchaseBills || []).some(bill => bill.id !== billId && String(bill.invoiceNumber || '').trim().toLowerCase() === invoiceNumber.toLowerCase());
      if (duplicateBill) { alert('This supplier already has a bill with that invoice number.'); return; }
    }
    const attachmentId = inwardDocument ? `SUPDOC-${billId}` : existingBill?.attachment?.id || '';
    try {
      if (inwardDocument) await saveSupplierBillDocument(attachmentId, inwardDocument);
    } catch (error) {
      alert(`Could not save the supplier bill document: ${error.message || 'browser storage unavailable'}`);
      return;
    }
    const bill = {
      id: billId,
      invoiceNumber,
      date: inwardDate,
      productId: billLines.length === 1 ? billLines[0].productId : undefined,
      productName: billLines.length === 1 ? billLines[0].productName : `${billLines.length} products`,
      quantity: billLines.reduce((sum, line) => sum + line.quantity, 0),
      unitCost: billLines.length === 1 ? billLines[0].unitCost : undefined,
      totalAmount: billTotal,
      paidAmount: Number(existingBill?.paidAmount || 0),
      balanceDue: Math.max(0, billTotal - Number(existingBill?.paidAmount || 0)),
      lines: billLines,
      attachment: inwardDocument ? { id: attachmentId, name: inwardDocument.name, type: inwardDocument.type, size: inwardDocument.size } : existingBill?.attachment || null
    };

    setInventory(prev => prev.map(item => {
      const oldLines = existingBill ? (existingBill.lines?.length ? existingBill.lines : [{ productId: existingBill.productId, quantity: existingBill.quantity, unitCost: existingBill.unitCost, identifiers: [] }]) : [];
      const previousQty = oldLines.filter(line => String(line.productId) === String(item.id)).reduce((sum, line) => sum + Number(line.quantity || 0), 0);
      const received = billLines.filter(line => String(line.productId) === String(item.id));
      const addedQty = received.reduce((sum, line) => sum + line.quantity, 0);
      if (!received.length && previousQty === 0) return item;
      const imeiTracked = isImeiTrackedCategory(item.category);
      const appendedIdentifiers = received.flatMap(line => isImeiTrackedCategory(item.category)
        ? [...(line.imei1Values || []), ...(line.imei2Values || [])]
        : line.identifiers);
      const existingUnits = Array.isArray(item.units) ? item.units.filter(unit => unit.supplierBillId !== billId) : [];
      const addedUnits = received.flatMap(line => Array.from({ length: line.quantity }, (_, index) => {
        const identifier = line.identifiers[index] || '';
        const imei1 = line.imei1Values[index] || '';
        const imei2 = line.imei2Values[index] || '';
        return {
          unitId: `UNIT-${billId}-${item.id}-${line.id}-${index}`,
          ...(imeiTracked ? { ...(imei1 ? { imei1 } : {}), ...(imei2 ? { imei2 } : {}) } : (identifier ? { serialNumber: identifier } : {})),
          barcode: `ALZ-${Date.now().toString().slice(-8)}-${String(line.id).slice(-5)}-${index + 1}`,
          rack: item.rack || 'R-01',
          bin: item.bin || 'B-01',
          status: 'In Stock',
          supplierId: selectedSupplierId,
          supplierBillId: billId
        };
      }));
      const totalReceived = received.reduce((sum, line) => sum + line.totalAmount, 0);
      const oldIdentifiers = oldLines.filter(line => String(line.productId) === String(item.id)).flatMap(line => [...(line.identifiers || []), ...(line.imei1Values || []), ...(line.imei2Values || [])]);
      const newIdentifiers = received.flatMap(line => imeiTracked ? [...(line.imei1Values || []), ...(line.imei2Values || [])] : (line.identifiers || []));
      const oldUnitBarcodes = (item.units || []).filter(unit => unit.supplierBillId === billId).map(unit => unit.barcode).filter(Boolean);
      return {
        ...item,
        stock: Math.max(0, (Number(item.stock) || 0) - previousQty + addedQty),
        ...(addedQty ? { buyPrice: totalReceived / addedQty } : {}),
        imeis: imeiTracked ? [...(item.imeis || []).filter(value => !oldIdentifiers.includes(value)), ...appendedIdentifiers] : (item.imeis || []),
        serialNumbers: imeiTracked ? (item.serialNumbers || []) : [...(item.serialNumbers || []).filter(value => !oldIdentifiers.includes(value)), ...appendedIdentifiers],
        barcodes: [...(item.barcodes || []).filter(value => !oldUnitBarcodes.includes(value)), ...addedUnits.map(unit => unit.barcode)],
        barcode: item.barcode && !oldUnitBarcodes.includes(item.barcode) ? item.barcode : (addedUnits[0]?.barcode || ''),
        units: [...existingUnits, ...addedUnits],
        supplierPurchases: [...(item.supplierPurchases || []).filter(purchase => purchase.billId !== billId), ...(addedQty ? [{ supplierId: selectedSupplierId, supplierName: supplier?.name || '', billId, invoiceNumber, date: inwardDate, quantity: addedQty, unitCost: totalReceived / addedQty }] : [])]
      };
    }));

    setSuppliers(prev => prev.map(s => s.id === selectedSupplierId ? {
      ...s,
      balancePayable: Math.max(0, (Number(s.balancePayable) || 0) + (billTotal - Number(existingBill?.paidAmount || 0)) - Number(existingBill?.balanceDue ?? Math.max(0, Number(existingBill?.totalAmount || 0) - Number(existingBill?.paidAmount || 0)))),
      purchaseBills: existingBill ? (s.purchaseBills || []).map(previous => previous.id === billId ? bill : previous) : [bill, ...(s.purchaseBills || [])],
    } : s));

    alert(existingBill ? `Updated supplier bill ${invoiceNumber}. Stock and payable totals were adjusted.` : `Received ${bill.quantity} units from ${supplier?.name || 'supplier'} and recorded bill ${invoiceNumber}.`);
    setShowInwardModal(false);
    setEditingBillId('');
    setInwardItems([newInwardLine()]);
    setInwardDocument(null);
    setInwardInvoiceNumber('');
    setInwardDate(new Date().toISOString().split('T')[0]);
  };

  const handleOpenSupplierBill = async attachment => {
    if (!attachment?.id) return;
    try {
      const file = await getSupplierBillDocument(attachment.id);
      if (!file) return alert('This bill document is not available in this browser.');
      const url = URL.createObjectURL(file);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      alert(`Could not open bill document: ${error.message || 'unknown error'}`);
    }
  };

  const supplierBills = suppliers.flatMap(supplier => (supplier.purchaseBills || []).map(bill => ({
    ...bill,
    supplierId: supplier.id,
    supplierName: supplier.name,
  }))).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const supplierSales = useMemo(() => {
    const totals = new Map();
    invoices.forEach(invoice => (invoice.items || []).forEach(line => {
      let allocations = line.supplierAllocations || [];
      if (!allocations.length) {
        const stockProduct = inventory.find(product => String(product.id) === String(line.id || line.productId));
        const sourceIds = [...new Set([...(stockProduct?.supplierPurchases || []).map(purchase => purchase.supplierId), stockProduct?.supplierId].filter(Boolean).map(String))];
        if (sourceIds.length === 1) allocations = [{ supplierId: sourceIds[0], quantity: Number(line.qty || 0) }];
      }
      allocations.forEach(allocation => {
      if (!allocation.supplierId) return;
      const supplierTotal = totals.get(allocation.supplierId) || { quantity: 0, products: new Map() };
      const productKey = String(line.id || line.productId || line.name);
      const product = supplierTotal.products.get(productKey) || { name: line.name || 'Product', quantity: 0 };
      product.quantity += Number(allocation.quantity || 0);
      supplierTotal.quantity += Number(allocation.quantity || 0);
      supplierTotal.products.set(productKey, product);
      totals.set(allocation.supplierId, supplierTotal);
      });
    }));
    return totals;
  }, [invoices, inventory]);
  const openInwardForSupplier = supplierId => {
    setEditingBillId('');
    setSelectedSupplierId(supplierId || '');
    setInwardItems([newInwardLine()]);
    setInwardDocument(null);
    setInwardInvoiceNumber('');
    setInwardDate(new Date().toISOString().split('T')[0]);
    setShowInwardModal(true);
  };
  const visibleSuppliers = suppliers.filter(supplier => [supplier.name, supplier.contactPerson, supplier.phone, supplier.city, supplier.gstin]
    .some(value => String(value || '').toLowerCase().includes(supplierSearch.trim().toLowerCase())));
  const getSupplierLinkedStock = supplierId => inventory.reduce((sum, product) => {
    const sourcedUnits = (product.units || []).filter(unit => String(unit.supplierId || '') === String(supplierId)).length;
    if (sourcedUnits) return sum + sourcedUnits;
    const sourceIds = [...new Set([...(product.supplierPurchases || []).map(purchase => purchase.supplierId), product.supplierId].filter(Boolean).map(String))];
    return sourceIds.length === 1 && sourceIds[0] === String(supplierId) ? sum + Number(product.stock || 0) : sum;
  }, 0);

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      
      {/* Sleek Minimalist Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{activeSubTab === 'suppliers' ? 'Supplier Portal' : 'Shop Expenses'}</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {activeSubTab === 'suppliers' ? `${suppliers.length} supplier records` : `Total Outflow: ₹${totalExpenses.toLocaleString()}`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.45rem' }}>
          {activeSubTab === 'expenses' && <button
            onClick={() => setShowExpenseModal(true)}
            className="btn-primary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
          >
            <Plus size={15} />
            <span>Add Expense</span>
          </button>}

          {activeSubTab === 'suppliers' && <button
            onClick={() => openInwardForSupplier('')}
            className="btn-primary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
          >
            <Truck size={14} color="var(--accent-primary)" />
            <span>Receive Stock & Add Bill</span>
          </button>}
          {activeSubTab === 'suppliers' && <button onClick={() => { setEditingSupplierId(''); setSuppName(''); setSuppContact(''); setSuppPhone(''); setSuppCity(''); setSuppGstin(''); setShowSupplierModal(true); }} className="btn-outline" style={{ fontSize: '0.82rem' }}><Plus size={14} /> Add Supplier</button>}
        </div>
      </div>

      {/* Expenses Table */}
      {activeSubTab === 'expenses' && (
        <div className="illoca-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Date</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Category</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Amount (₹)</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Paid By</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Notes / Description</th>
                <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{exp.date}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className="mono-tag">{exp.category}</span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--status-red)', fontSize: '0.95rem' }}>
                    ₹{exp.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{exp.paidBy}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{exp.notes}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    {role === 'admin' && (
                      <button 
                        onClick={() => handleDeleteExpense(exp.id)} 
                        className="btn-outline"
                        style={{ padding: '0.25rem 0.45rem', color: 'var(--status-red)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Suppliers Table */}
      {activeSubTab === 'suppliers' && (
        <>
        <div className="illoca-card" style={{ padding: '1rem' }}>
          <h3 style={{ margin: '0 0 0.65rem', fontSize: '1rem' }}>Supplier purchasing & sell-through</h3>
          <p style={{ margin: '0 0 0.85rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Use “Add bill” on a supplier to record each new invoice and inward multiple product lines. Sales are attributed from POS invoices when the received stock carries that supplier’s batch details.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}><input className="input-field" value={supplierSearch} onChange={event => setSupplierSearch(event.target.value)} placeholder="Search supplier name, phone, or city" style={{ maxWidth: 380, minWidth: 220 }} /><span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{visibleSuppliers.length} of {suppliers.length} suppliers</span></div>
          {visibleSuppliers.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '0.7rem' }}>{visibleSuppliers.map(supplier => {
            const bills = supplier.purchaseBills || [];
            const unitsReceived = bills.reduce((sum, bill) => sum + Number(bill.quantity || (bill.lines || []).reduce((qty, line) => qty + Number(line.quantity || 0), 0)), 0);
            const purchaseValue = bills.reduce((sum, bill) => sum + Number(bill.totalAmount || 0), 0);
            const sales = supplierSales.get(supplier.id) || { quantity: 0, products: new Map() };
            const linkedStock = getSupplierLinkedStock(supplier.id);
            const isExpanded = expandedSupplierId === supplier.id;
            const supplierProductSales = [...sales.products.values()].sort((a, b) => b.quantity - a.quantity);
            const toggleSupplierDetails = () => setExpandedSupplierId(current => current === supplier.id ? '' : supplier.id);
            return <article key={supplier.id} role="button" tabIndex={0} aria-expanded={isExpanded} onClick={toggleSupplierDetails} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleSupplierDetails(); } }} style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 12, background: 'var(--surface-primary)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}><div><strong>{supplier.name}</strong><div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 3 }}>{supplier.contactPerson || 'No contact'} · {supplier.phone || 'No phone'}{supplier.city ? ` · ${supplier.city}` : ''}</div></div><div style={{ display: 'flex', gap: 5, flexShrink: 0 }}><button type="button" className="btn-outline" onClick={event => { event.stopPropagation(); editSupplier(supplier); }} style={{ padding: '0.35rem 0.5rem', fontSize: '0.74rem' }}>Edit</button><button type="button" className="btn-primary" onClick={event => { event.stopPropagation(); openInwardForSupplier(supplier.id); }} style={{ padding: '0.35rem 0.55rem', fontSize: '0.74rem' }}><Plus size={13} /> Add bill</button><ChevronDown size={16} aria-hidden="true" style={{ alignSelf: 'center', transition: 'transform 0.18s', transform: isExpanded ? 'rotate(180deg)' : 'none' }} /></div></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 10, fontSize: '0.75rem' }}><span>Bills<strong style={{ display: 'block', fontSize: '1rem' }}>{bills.length}</strong></span><span>Units received<strong style={{ display: 'block', fontSize: '1rem' }}>{unitsReceived}</strong></span><span>Linked stock<strong style={{ display: 'block', fontSize: '1rem' }}>{linkedStock}</strong></span><span>POS units sold<strong style={{ display: 'block', fontSize: '1rem' }}>{sales.quantity}</strong></span></div>
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Purchase value: <strong>₹{purchaseValue.toLocaleString('en-IN')}</strong> · Payable: <strong>₹{(Number(supplier.balancePayable) || 0).toLocaleString('en-IN')}</strong></div>
              {isExpanded && <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--border-color)', cursor: 'default' }} onClick={event => event.stopPropagation()}>
                <strong style={{ fontSize: '0.78rem' }}>Supplier bills ({bills.length})</strong>
                {bills.length ? <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>{[...bills].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).map(bill => {
                  const billLines = bill.lines?.length ? bill.lines : [{ productName: bill.productName || 'Stock item', quantity: bill.quantity, unitCost: bill.unitCost }];
                  return <div key={bill.id} style={{ padding: '0.55rem', borderRadius: 8, background: 'var(--surface-secondary, var(--surface-primary))', border: '1px solid var(--border-color)', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><strong>{bill.invoiceNumber || 'Supplier bill'}</strong><span>{bill.date || 'Date not recorded'}</span></div>
                    <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{billLines.map(line => `${line.productName || 'Stock item'} × ${Number(line.quantity || 0)}`).join(' · ')}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}><span>Total ₹{(Number(bill.totalAmount) || 0).toLocaleString('en-IN')} · Paid ₹{(Number(bill.paidAmount) || 0).toLocaleString('en-IN')}</span><strong>Due ₹{(Number(bill.balanceDue ?? Number(bill.totalAmount || 0) - Number(bill.paidAmount || 0)) || 0).toLocaleString('en-IN')}</strong></div>
                  </div>;
                })}</div> : <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', marginTop: 5 }}>No bills recorded yet.</div>}
                <strong style={{ display: 'block', fontSize: '0.78rem', marginTop: 10 }}>Products sold from this supplier</strong>
                {supplierProductSales.length ? supplierProductSales.map((product, index) => <div key={`${product.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.74rem' }}><span>{index + 1}. {product.name}</span><strong>{product.quantity} sold</strong></div>) : <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', marginTop: 4 }}>No supplier-attributed POS sales yet.</div>}
              </div>}
            </article>;
          })}</div> : <div style={{ color: 'var(--text-secondary)' }}>{suppliers.length ? 'No suppliers match this search.' : 'Add a supplier, then record their purchase bills here.'}</div>}
        </div>
        <div className="illoca-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Supplier Name</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Contact Person & Phone</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>City / Hub</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>GSTIN</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Bills</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Units Sold</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleSuppliers.map(sup => (
                <tr key={sup.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{sup.name}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div>{sup.contactPerson || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{sup.phone}</div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{sup.city}</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{sup.gstin || '—'}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{(sup.purchaseBills || []).length}</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{supplierSales.get(sup.id)?.quantity || 0}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}><div style={{ display: 'flex', gap: 5 }}><button type="button" className="btn-outline" onClick={() => editSupplier(sup)} style={{ padding: '0.3rem 0.5rem' }}>Edit</button><button type="button" className="btn-outline" onClick={() => openInwardForSupplier(sup.id)} style={{ padding: '0.3rem 0.5rem' }}><Plus size={13} /> Add bill</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="illoca-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '0.75rem' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>Received Products & Supplier Bills ({supplierBills.filter(bill => supplierBillFilter === 'all' || bill.supplierId === supplierBillFilter).length})</h3><select className="input-field" value={supplierBillFilter} onChange={event => setSupplierBillFilter(event.target.value)} style={{ width: 'auto', minWidth: 190 }}><option value="all">All suppliers</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
          {supplierBills.filter(bill => supplierBillFilter === 'all' || bill.supplierId === supplierBillFilter).length ? <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '0.6rem' }}>Date</th><th style={{ padding: '0.6rem' }}>Supplier</th><th style={{ padding: '0.6rem' }}>Bill / Invoice No.</th><th style={{ padding: '0.6rem' }}>Products Received</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Qty</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Bill Total</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Paid</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Due (Khata)</th><th style={{ padding: '0.6rem' }}>Actions</th>
            </tr></thead>
            <tbody>{supplierBills.filter(bill => supplierBillFilter === 'all' || bill.supplierId === supplierBillFilter).map(bill => <tr key={bill.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.65rem' }}>{bill.date || '—'}</td><td style={{ padding: '0.65rem', fontWeight: 600 }}>{bill.supplierName}</td><td style={{ padding: '0.65rem' }}>{bill.invoiceNumber}</td><td style={{ padding: '0.65rem' }}>{bill.lines?.length ? bill.lines.map(line => `${line.productName} × ${line.quantity}`).join(', ') : bill.productName}</td><td style={{ padding: '0.65rem', textAlign: 'right' }}>{bill.quantity}</td><td style={{ padding: '0.65rem', textAlign: 'right' }}>₹{(Number(bill.totalAmount) || 0).toLocaleString()}</td><td style={{ padding: '0.65rem', textAlign: 'right' }}>₹{(Number(bill.paidAmount) || 0).toLocaleString()}</td><td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 700 }}>₹{(Number(bill.balanceDue ?? Number(bill.totalAmount || 0) - Number(bill.paidAmount || 0)) || 0).toLocaleString()}</td><td style={{ padding: '0.65rem' }}><div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>{bill.attachment && <button type="button" onClick={() => handleOpenSupplierBill(bill.attachment)} className="btn-outline" style={{ padding: '0.3rem 0.45rem' }}><FileCheck size={13} /> Open</button>}{role === 'admin' && <button type="button" onClick={() => editSupplierBill(bill.supplierId, bill)} className="btn-outline" style={{ padding: '0.3rem 0.45rem' }}>Edit</button>}{!bill.attachment && role !== 'admin' ? '—' : null}</div></td>
            </tr>)}</tbody>
          </table> : <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem' }}>No supplier bills yet. Use “Receive Stock & Add Bill” when products arrive.</div>}
        </div>
        </>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleAddExpense} className="illoca-card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Record Shop Expense</h3>
              <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Expense Category *</label>
                <select 
                  value={expCategory} 
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="input-field"
                >
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  required
                  className="input-field"
                  style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--status-red)' }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Paid Via</label>
                <select 
                  value={expPaidBy} 
                  onChange={(e) => setExpPaidBy(e.target.value)}
                  className="input-field"
                >
                  <option value="Cash">Cash Drawer</option>
                  <option value="UPI">Shop UPI (GPay/PhonePe)</option>
                  <option value="Bank Transfer">Bank Transfer (HDFC)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Tea for customers or TSSPDCL bill"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stock Inward Modal */}
      {showInwardModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleStockInward} className="illoca-card animate-fade-in" style={{ maxWidth: '680px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>{editingBillId ? 'Edit Supplier Bill & Stock Inward' : 'Purchase Stock Inward (From Supplier)'}</h3>
              <button type="button" onClick={() => { setShowInwardModal(false); setEditingBillId(''); }} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Select Supplier</label>
                <select 
                  value={selectedSupplierId} 
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  required
                  disabled={Boolean(editingBillId)}
                  disabled={Boolean(editingBillId)}
                  className="input-field"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.city})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Supplier Bill / Invoice No.</label>
                  <input type="text" value={inwardInvoiceNumber} onChange={e => setInwardInvoiceNumber(e.target.value)} placeholder="e.g. INV-1042" className="input-field" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Received Date *</label>
                  <input type="date" value={inwardDate} onChange={e => setInwardDate(e.target.value)} required className="input-field" />
                </div>
              </div>

              <div className="illoca-card" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); handleBillFile(event.dataTransfer.files?.[0]); }} style={{ padding: '0.85rem', border: '1px dashed var(--border-color)', background: 'var(--bg-main)' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Supplier bill file (PDF, Excel, or CSV)</label>
                <input type="file" accept=".pdf,.xlsx,.xls,.csv,application/pdf" onChange={event => handleBillFile(event.target.files?.[0])} className="input-field" />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                  {isImportingBill ? 'Reading spreadsheet…' : inwardDocument ? `${inwardDocument.name}${/\.(xlsx|xls|csv)$/i.test(inwardDocument.name) ? ' · spreadsheet rows loaded' : ' · PDF attached'}` : 'Drop a bill here. Excel/CSV rows can prefill products, quantities, costs and identifiers.'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Products on this bill</label>
                <button type="button" className="btn-outline" onClick={() => setInwardItems(previous => [...previous, newInwardLine()])} style={{ padding: '0.35rem 0.6rem', fontSize: '0.76rem' }}><Plus size={13} /> Add product</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '32vh', overflowY: 'auto' }}>
                {inwardItems.map((line, index) => (
                  <div key={line.id} className="illoca-card" style={{ padding: '0.7rem', display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) repeat(2, minmax(80px, 0.8fr)) auto', gap: '0.5rem', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Product {index + 1} *</label>
                      <select value={line.productId} onChange={event => updateInwardLine(line.id, { productId: event.target.value })} required className="input-field">
                        <option value="">{line.importedName ? `Match: ${line.importedName}` : 'Choose inventory product'}</option>
                        {inventory.map(product => <option key={product.id} value={product.id}>{product.brand} · {product.name} (Stock: {product.stock})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Qty *</label>
                      <input type="number" min="1" step="1" value={line.quantity} onChange={event => updateInwardLine(line.id, { quantity: event.target.value })} required className="input-field" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Unit cost ₹ *</label>
                      <input type="number" min="0.01" step="0.01" value={line.unitCost} onChange={event => updateInwardLine(line.id, { unitCost: event.target.value })} required className="input-field" />
                    </div>
                    <button type="button" className="btn-outline" title="Remove product" disabled={inwardItems.length === 1} onClick={() => setInwardItems(previous => previous.filter(item => item.id !== line.id))} style={{ color: 'var(--status-red)', padding: '0.45rem' }}><Trash2 size={14} /></button>
                    {(line.identifiers?.length > 0 || line.imei1Values?.length > 0 || line.imei2Values?.length > 0) && <div style={{ gridColumn: '1 / -1', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{line.identifiers.length + line.imei1Values.length + line.imei2Values.length} identifier(s) imported from bill; identifiers can also be added from inventory edit.</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => { setShowInwardModal(false); setEditingBillId(''); }} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                {editingBillId ? 'Save Bill Changes' : 'Inward to Stock'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleAddSupplier} className="illoca-card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>{editingSupplierId ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button type="button" onClick={() => { setShowSupplierModal(false); setEditingSupplierId(''); }} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Supplier Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabad Mobile Hub"
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Contact Person Name</label>
                <input
                  type="text"
                  placeholder="Manager / Sales Rep"
                  value={suppContact}
                  onChange={(e) => setSuppContact(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Phone Number *</label>
                <input
                  type="text"
                  placeholder="10-digit Phone"
                  value={suppPhone}
                  onChange={(e) => setSuppPhone(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>City / Location</label>
                <input
                  type="text"
                  placeholder="Hyderabad / Nizamabad"
                  value={suppCity}
                  onChange={(e) => setSuppCity(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>GSTIN</label>
                <input
                  type="text"
                  placeholder="GST Number"
                  value={suppGstin}
                  onChange={(e) => setSuppGstin(e.target.value.toUpperCase())}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => { setShowSupplierModal(false); setEditingSupplierId(''); }} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                {editingSupplierId ? 'Save Changes' : 'Save Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
