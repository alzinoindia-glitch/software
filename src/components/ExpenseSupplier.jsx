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
  FileCheck
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
        