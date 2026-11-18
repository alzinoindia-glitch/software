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
  ChevronDown,
  X
} from 'lucide-react';
import { isImeiTrackedCategory } from '../utils/customTaxonomy';
import { getSupplierBillDocument, saveSupplierBillDocument } from '../utils/supplierBillStore';
import { getPurchaseCostBreakdown } from '../utils/gstPricing';
import { countUniqueSupplierBills } from '../utils/supplierAccounting';

const newInwardLine = () => ({ id: `LINE-${Date.now()}-${Math.random()}`, productId: '', quantity: '1', unitCost: '', unitCostIncludesGst: true, isNewProduct: false, newProductName: '', newProductCategory: '', newProductBrand: '', newProductHsn: '', newProductSellPrice: '', newProductMrp: '', newProductGstRate: '18', identifiers: [], imei1Values: [], imei2Values: [] });
const productGstRate = product => Math.max(0, Number(product?.gstRate ?? (product?.isGst ? 18 : 0)) || 0);
const normalizedHeader = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const getCell = (row, ...names) => {
  const keys = Object.keys(row || {});
  const key = keys.find(candidate => names.includes(normalizedHeader(candidate)));
  return key ? row[key] : '';
};
const parseGstFlag = value => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (/^(yes|true|1|included|inclusive|incl|with gst)$/.test(normalized)) return true;
  if (/^(no|false|0|excluded|exclusive|excl|without gst|gst extra)$/.test(normalized)) return false;
  return null;
};
const inferGstInclusionFromRow = row => {
  const entries = Object.entries(row || {}).map(([key, value]) => [normalizedHeader(key), value]);
  const explicitFlag = entries.find(([key]) => ['gstincluded', 'taxincluded', 'priceincludesgst', 'unitcostincludesgst', 'costincludesgst'].includes(key));
  if (explicitFlag) {
    const parsed = parseGstFlag(explicitFlag[1]);
    if (parsed !== null) return parsed;
  }
  if (entries.some(([key]) => ['taxablevalue', 'unitcostexcludinggst', 'costexcludinggst', 'priceexcludinggst', 'baseratebeforetax'].includes(key))) return false;
  return null;
};
const inferGstInclusionFromText = text => {
  const normalized = String(text || '').toLowerCase().replace(/\s+/g, ' ');
  if (/\b(inclusive of|includes?|included in|incl\.?\s*)\s*(all\s+)?(applicable\s+)?(gst|tax(?:es)?)\b|\b(gst|tax)\s+(is\s+)?included\b/.test(normalized)) return true;
  if (/\b(exclusive of|excludes?|excluding|plus|extra)\s*(all\s+)?(applicable\s+)?(gst|tax(?:es)?)\b|\b(gst|tax)\s+(will be\s+)?charged extra\b/.test(normalized)) return false;
  return null;
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
  const [expPayeeName, setExpPayeeName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expPaidBy, setExpPaidBy] = useState('Cash');

  // Supplier form state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplierProfileId, setSelectedSupplierProfileId] = useState('');
  const [supplierReorderLines, setSupplierReorderLines] = useState([]);
  const [reorderProductId, setReorderProductId] = useState('');
  const [reorderQuantity, setReorderQuantity] = useState('1');
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
  const [inwardGstHint, setInwardGstHint] = useState(null);
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
    'Miscellaneous',
    'Other'
  ];
  const expenseNeedsPayeeName = ['Staff Salary', 'Other', 'Miscellaneous'].includes(expCategory);

  // Calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expAmount || (expenseNeedsPayeeName && !expPayeeName.trim())) return;

    const newExp = {
      id: `EXP-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      category: expCategory,
      payeeName: expenseNeedsPayeeName ? expPayeeName.trim() : '',
      amount: parseFloat(expAmount),
      notes: expNotes.trim() || expCategory,
      paidBy: expPaidBy,
    };

    setExpenses(prev => [newExp, ...prev]);
    setShowExpenseModal(false);
    setExpAmount('');
    setExpPayeeName('');
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
      ...newInwardLine(), productId: line.productId || '', quantity: String(line.quantity || 1), unitCost: String(line.unitCostEntered ?? line.unitCost ?? ''), unitCostIncludesGst: line.unitCostIncludesGst !== false,
      identifiers: [...(line.identifiers || [])], imei1Values: [...(line.imei1Values || [])], imei2Values: [...(line.imei2Values || [])], importedName: line.productName || ''
    }));
    setEditingBillId(bill.id);
    setSelectedSupplierId(supplierId);
    setInwardInvoiceNumber(bill.invoiceNumber || '');
    setInwardDate(bill.date || new Date().toISOString().split('T')[0]);
    setInwardItems(lines.length ? lines : [newInwardLine()]);
    setInwardDocument(null);
    setInwardGstHint(null);
    setShowInwardModal(true);
  };

  const handleBillFile = async file => {
    if (!file) return;
    setInwardDocument(file);
    setInwardGstHint(null);
    if (/\.pdf$/i.test(file.name)) {
      try {
        const [pdfjs, workerUrl] = await Promise.all([
          import('pdfjs-dist/build/pdf.mjs'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const pages = await Promise.all(Array.from({ length: pdf.numPages }, async (_, index) => {
          const page = await pdf.getPage(index + 1);
          const content = await page.getTextContent();
          return content.items.map(item => item.str || '').join(' ');
        }));
        const detected = inferGstInclusionFromText(pages.join(' '));
        if (detected !== null) {
          setInwardGstHint({ includesGst: detected, source: 'uploaded PDF' });
          setInwardItems(previous => previous.map(line => line.gstInclusionSource === 'admin' ? line : {
            ...line,
            unitCostIncludesGst: detected,
            gstInclusionSource: 'uploaded PDF'
          }));
        }
      } catch (error) {
        console.warn('Could not inspect supplier bill PDF for GST wording:', error);
      }
      return;
    }
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
          unitCostIncludesGst: inferGstInclusionFromRow(row),
          gstInclusionSource: inferGstInclusionFromRow(row) === null ? 'unknown' : 'uploaded spreadsheet',
          identifiers,
          imei1Values,
          imei2Values,
          importedName: productName
        };
      }).filter(line => line.importedName || line.productId);
      if (!lines.length) throw new Error('No product rows were found. Use Product, Quantity, and Unit Cost columns.');
      setInwardItems(lines);
      const detectedGstLines = lines.filter(line => line.unitCostIncludesGst !== null).length;
      alert(`Imported ${lines.length} bill line(s).${detectedGstLines ? ` GST inclusion was detected on ${detectedGstLines} line(s); please verify it against the bill.` : ''} Match any product names that were not recognized.`);
    } catch (error) {
      alert(`Could not read this bill spreadsheet: ${error.message || 'check the file format'}`);
    } finally {
      setIsImportingBill(false);
    }
  };

  const handleStockInward = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId || !inwardItems.length) return;
    const validLines = inwardItems.map((line, index) => {
      const quantity = Number.parseInt(line.quantity, 10);
      const unitCost = Number.parseFloat(line.unitCost);
      if (!line.isNewProduct) return { ...line, quantity, unitCost, product: inventory.find(item => String(item.id) === String(line.productId)) };
      const productId = line.productId || `PROD-SUPP-${Date.now()}-${index}`;
      return {
        ...line,
        productId,
        quantity,
        unitCost,
        product: {
          id: productId,
          name: String(line.newProductName || '').trim(),
          category: String(line.newProductCategory || '').trim(),
          brand: String(line.newProductBrand || '').trim() || 'General',
          hsn: String(line.newProductHsn || '').trim(),
          sellPrice: Number(line.newProductSellPrice) || unitCost,
          mrp: Number(line.newProductMrp) || Number(line.newProductSellPrice) || unitCost,
          gstRate: Number.isFinite(Number(line.newProductGstRate)) ? Number(line.newProductGstRate) : 18,
          isGst: Number.isFinite(Number(line.newProductGstRate)) ? Number(line.newProductGstRate) > 0 : true,
          stock: 0,
          lowStockThreshold: 2,
          rack: 'R-01',
          bin: 'B-01',
          locations: [],
          units: [],
          imeis: [],
          serialNumbers: [],
          barcodes: [],
          status: 'Active',
          isPublished: false,
          supplierId: selectedSupplierId,
          supplierName: suppliers.find(supplier => String(supplier.id) === String(selectedSupplierId))?.name || ''
        }
      };
    });
    if (validLines.some(line => !line.product || (line.isNewProduct && (!line.product.name || !line.product.category)) || !Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isFinite(line.unitCost) || line.unitCost <= 0)) {
      alert('Choose an inventory product or enter a name and category for each new product, then enter a valid quantity and unit cost.');
      return;
    }
    if (validLines.some(line => line.identifiers.length > line.quantity || line.imei1Values.length > line.quantity || line.imei2Values.length > line.quantity)) {
      alert('A bill line has more identifiers than received units. Check the spreadsheet quantity and serial/IMEI columns.');
      return;
    }
    if (validLines.some(line => line.isNewProduct && isImeiTrackedCategory(line.product.category) && line.imei1Values.length < line.quantity)) {
      alert('Enter one IMEI per new mobile unit before adding it to stock.');
      return;
    }
    const existingSupplier = suppliers.find(s => s.id === selectedSupplierId);
    const existingBill = editingBillId ? existingSupplier?.purchaseBills?.find(bill => bill.id === editingBillId) : null;
    if (editingBillId && (!existingBill || role !== 'admin')) return;
    const invoiceNumber = inwardInvoiceNumber.trim() || existingBill?.invoiceNumber || `SUP-${Date.now().toString().slice(-6)}`;
    const billId = editingBillId || `BILL-${Date.now()}`;
    const billLines = validLines.map(line => {
      const gstRate = productGstRate(line.product);
      const cost = getPurchaseCostBreakdown(line.unitCost, gstRate, line.unitCostIncludesGst);
      return {
      productId: line.productId,
      productName: line.product.name,
      brand: line.product.brand || '',
      quantity: line.quantity,
      unitCost: cost.gross,
      unitCostEntered: line.unitCost,
      unitCostIncludesGst: Boolean(line.unitCostIncludesGst),
      gstRate,
      taxableUnitCost: cost.taxable,
      gstUnitAmount: cost.gst,
      totalAmount: Math.round((cost.gross * line.quantity + Number.EPSILON) * 100) / 100,
      taxableAmount: Math.round((cost.taxable * line.quantity + Number.EPSILON) * 100) / 100,
      gstAmount: Math.round((cost.gst * line.quantity + Number.EPSILON) * 100) / 100,
      identifiers: [...new Set([...(line.identifiers || []), ...(line.imei1Values || []), ...(line.imei2Values || [])])],
      imei1Values: [...new Set(line.imei1Values || [])],
      imei2Values: [...new Set(line.imei2Values || [])]
      };
    });
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

    const newInventoryProducts = validLines.filter(line => line.isNewProduct).map(line => {
      const purchaseCost = getPurchaseCostBreakdown(line.unitCost, productGstRate(line.product), line.unitCostIncludesGst);
      const imeiTracked = isImeiTrackedCategory(line.product.category);
      const identifiers = imeiTracked ? [...(line.imei1Values || []), ...(line.imei2Values || [])] : (line.identifiers || []);
      const units = Array.from({ length: line.quantity }, (_, index) => ({
        unitId: `UNIT-${billId}-${line.productId}-${index}`,
        ...(imeiTracked ? { ...(line.imei1Values[index] ? { imei1: line.imei1Values[index] } : {}), ...(line.imei2Values[index] ? { imei2: line.imei2Values[index] } : {}) } : (line.identifiers[index] ? { serialNumber: line.identifiers[index] } : {})),
        barcode: `ALZ-${Date.now().toString().slice(-8)}-${String(line.id).slice(-5)}-${index + 1}`,
        rack: 'R-01', bin: 'B-01', status: 'In Stock', supplierId: selectedSupplierId,
        supplierName: supplier?.name || '', supplierBillId: billId
      }));
      return {
        ...line.product,
        buyPrice: purchaseCost.gross,
        buyCostEntered: line.unitCost,
        buyCostBase: purchaseCost.taxable,
        buyCostGst: purchaseCost.gst,
        buyPriceIncludesGst: Boolean(line.unitCostIncludesGst),
        stock: line.quantity,
        locations: [{ rack: 'R-01', bin: 'B-01', qty: line.quantity }],
        receivedDate: inwardDate,
        createdAt: new Date().toISOString(),
        units,
        imeis: imeiTracked ? identifiers : [],
        serialNumbers: imeiTracked ? [] : identifiers,
        barcodes: units.map(unit => unit.barcode),
        barcode: units[0]?.barcode || '',
        supplierPurchases: [{ supplierId: selectedSupplierId, supplierName: supplier?.name || '', billId, invoiceNumber, date: inwardDate, quantity: line.quantity, unitCost: purchaseCost.gross, unitCostEntered: line.unitCost, unitCostIncludesGst: Boolean(line.unitCostIncludesGst), gstRate: productGstRate(line.product) }]
      };
    });
    setInventory(prev => [...newInventoryProducts, ...prev.map(item => {
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
      const latestReceived = received[received.length - 1];
      const oldIdentifiers = oldLines.filter(line => String(line.productId) === String(item.id)).flatMap(line => [...(line.identifiers || []), ...(line.imei1Values || []), ...(line.imei2Values || [])]);
      const newIdentifiers = received.flatMap(line => imeiTracked ? [...(line.imei1Values || []), ...(line.imei2Values || [])] : (line.identifiers || []));
      const oldUnitBarcodes = (item.units || []).filter(unit => unit.supplierBillId === billId).map(unit => unit.barcode).filter(Boolean);
      return {
        ...item,
        stock: Math.max(0, (Number(item.stock) || 0) - previousQty + addedQty),
        ...(addedQty ? {
          buyPrice: totalReceived / addedQty,
          buyCostEntered: latestReceived.unitCostEntered,
          buyCostBase: latestReceived.taxableUnitCost,
          buyCostGst: latestReceived.gstUnitAmount,
          buyPriceIncludesGst: latestReceived.unitCostIncludesGst
        } : {}),
        imeis: imeiTracked ? [...(item.imeis || []).filter(value => !oldIdentifiers.includes(value)), ...appendedIdentifiers] : (item.imeis || []),
        serialNumbers: imeiTracked ? (item.serialNumbers || []) : [...(item.serialNumbers || []).filter(value => !oldIdentifiers.includes(value)), ...appendedIdentifiers],
        barcodes: [...(item.barcodes || []).filter(value => !oldUnitBarcodes.includes(value)), ...addedUnits.map(unit => unit.barcode)],
        barcode: item.barcode && !oldUnitBarcodes.includes(item.barcode) ? item.barcode : (addedUnits[0]?.barcode || ''),
        units: [...existingUnits, ...addedUnits],
        supplierPurchases: [...(item.supplierPurchases || []).filter(purchase => purchase.billId !== billId), ...(addedQty ? [{ supplierId: selectedSupplierId, supplierName: supplier?.name || '', billId, invoiceNumber, date: inwardDate, quantity: addedQty, unitCost: totalReceived / addedQty, unitCostEntered: latestReceived.unitCostEntered, unitCostIncludesGst: latestReceived.unitCostIncludesGst, gstRate: latestReceived.gstRate }] : [])]
      };
    })]);

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
    setInwardGstHint(null);
    setInwardGstHint(null);
    setInwardInvoiceNumber('');
    setInwardDate(new Date().toISOString().split('T')[0]);
    setSupplierReorderLines([]);
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
  const supplierBillCount = countUniqueSupplierBills(supplierBills.map(bill => ({ ...bill, invoiceNumber: `${bill.supplierId}:${bill.invoiceNumber || bill.id}` })));
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
  const supplierSaleRows = useMemo(() => invoices.flatMap(invoice => (invoice.items || []).flatMap(line => {
    let allocations = line.supplierAllocations || [];
    if (!allocations.length) {
      const stockProduct = inventory.find(product => String(product.id) === String(line.id || line.productId));
      const sourceIds = [...new Set([...(stockProduct?.supplierPurchases || []).map(purchase => purchase.supplierId), stockProduct?.supplierId].filter(Boolean).map(String))];
      if (sourceIds.length === 1) allocations = [{ supplierId: sourceIds[0], quantity: Number(line.qty || 0) }];
    }
    return allocations.map(allocation => ({
      supplierId: String(allocation.supplierId || ''),
      invoiceNo: invoice.invoiceNo || invoice.id || 'Invoice',
      date: invoice.date || '',
      customerName: invoice.customerName || 'Counter Customer',
      productName: line.name || 'Product',
      quantity: Number(allocation.quantity || 0),
    })).filter(row => row.supplierId && row.quantity > 0);
  })).sort((a, b) => String(b.date).localeCompare(String(a.date))), [invoices, inventory]);
  const unattributedSupplierSales = useMemo(() => {
    const totals = new Map();
    invoices.forEach(invoice => (invoice.items || []).forEach(line => {
      if (line.supplierAllocations?.length) return;
      const productId = String(line.id || line.productId || '');
      const product = inventory.find(item => String(item.id) === productId);
      const sources = [...new Set([...(product?.supplierPurchases || []).map(purchase => purchase.supplierId), product?.supplierId].filter(Boolean).map(String))];
      if (sources.length < 2) return;
      totals.set(productId, (totals.get(productId) || 0) + Number(line.qty || 0));
    }));
    return totals;
  }, [invoices, inventory]);
  const openInwardForSupplier = (supplierId, draftLines = []) => {
    setEditingBillId('');
    setSelectedSupplierId(supplierId || '');
    setInwardItems(draftLines.length ? draftLines.map(draft => {
      const product = inventory.find(item => String(item.id) === String(draft.productId));
      const lastPurchase = (product?.supplierPurchases || []).filter(purchase => String(purchase.supplierId) === String(supplierId)).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
      return {
        ...newInwardLine(),
        productId: String(draft.productId || ''),
        quantity: String(draft.quantity || 1),
        unitCost: String(lastPurchase?.unitCostEntered ?? product?.buyCostEntered ?? product?.buyPrice ?? ''),
        unitCostIncludesGst: lastPurchase?.unitCostIncludesGst ?? product?.buyPriceIncludesGst !== false,
        gstInclusionSource: lastPurchase ? 'supplier purchase record' : 'product setting'
      };
    }) : [newInwardLine()]);
    setInwardDocument(null);
    setInwardGstHint(null);
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
  const selectedSupplier = suppliers.find(supplier => String(supplier.id) === String(selectedSupplierProfileId));
  const selectedSupplierBills = selectedSupplier?.purchaseBills || [];
  const selectedSupplierRecordedBillIds = new Set(selectedSupplierBills.map(bill => String(bill.id)));
  const selectedSupplierRecordedInvoiceNumbers = new Set(selectedSupplierBills.map(bill => String(bill.invoiceNumber || '').trim().toLowerCase()).filter(Boolean));
  const selectedSupplierUnbilledPurchases = inventory.flatMap(product => (product.supplierPurchases || [])
    .filter(purchase => String(purchase.supplierId || '') === String(selectedSupplier?.id || '')
      && !(purchase.billId && selectedSupplierRecordedBillIds.has(String(purchase.billId)))
      && !(purchase.invoiceNumber && selectedSupplierRecordedInvoiceNumbers.has(String(purchase.invoiceNumber).trim().toLowerCase())))
    .map(purchase => ({ ...purchase, productName: product.name })));
  const selectedSupplierSales = supplierSales.get(selectedSupplierProfileId) || { quantity: 0, products: new Map() };
  const selectedSupplierBillCount = countUniqueSupplierBills(selectedSupplierBills);
  const selectedSupplierUnitsReceived = selectedSupplierBills.reduce((sum, bill) => sum + Number(bill.quantity || (bill.lines || []).reduce((quantity, line) => quantity + Number(line.quantity || 0), 0)), 0)
    + selectedSupplierUnbilledPurchases.reduce((sum, purchase) => sum + Number(purchase.quantity || 0), 0);
  const selectedSupplierPurchaseValue = selectedSupplierBills.reduce((sum, bill) => sum + Number(bill.totalAmount || 0), 0)
    + selectedSupplierUnbilledPurchases.reduce((sum, purchase) => sum + Number(purchase.unitCost || 0) * Number(purchase.quantity || 0), 0);
  const selectedSupplierBillsDue = selectedSupplierBills.reduce((sum, bill) => sum + Math.max(0, Number(bill.balanceDue ?? Number(bill.totalAmount || 0) - Number(bill.paidAmount || 0)) || 0), 0);
  const selectedSupplierOtherKhataDue = (selectedSupplier?.khataEntries || []).reduce((sum, entry) => sum + Math.max(0, Number(entry.balanceDue ?? Number(entry.amount || 0) - Number(entry.paidAmount || 0)) || 0), 0);
  const selectedSupplierInventory = (() => {
    if (!selectedSupplier) return [];
    const rows = new Map();
    const ensureRow = (productId, productName = '') => {
      const key = String(productId || `name:${productName}`);
      if (!rows.has(key)) rows.set(key, { key, productId: productId || '', productName, purchased: 0, purchaseValue: 0, billCount: 0, lastPurchaseDate: '', lastPurchaseQuantity: 0, lastPurchaseUnitCost: null, lastPurchaseInvoiceNumber: '' });
      return rows.get(key);
    };
    [...selectedSupplierBills].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach(bill => {
      const lines = bill.lines?.length ? bill.lines : [{ productId: bill.productId, productName: bill.productName, quantity: bill.quantity, totalAmount: bill.totalAmount }];
      lines.forEach(line => {
        const row = ensureRow(line.productId, line.productName);
        row.productName ||= line.productName || 'Stock product';
        const lineQuantity = Number(line.quantity || 0);
        const lineTotal = Number(line.totalAmount || (Number(line.unitCost || 0) * lineQuantity));
        row.purchased += lineQuantity;
        row.purchaseValue += lineTotal;
        row.billCount += 1;
        if (String(bill.date || '') >= row.lastPurchaseDate) {
          row.lastPurchaseDate = String(bill.date || '');
          row.lastPurchaseQuantity = lineQuantity;
          row.lastPurchaseUnitCost = Number(line.unitCost ?? (lineQuantity > 0 ? lineTotal / lineQuantity : 0));
          row.lastPurchaseInvoiceNumber = bill.invoiceNumber || '';
        }
      });
    });
    inventory.forEach(product => {
      const purchases = (product.supplierPurchases || []).filter(purchase => String(purchase.supplierId || '') === String(selectedSupplier.id));
      const units = (product.units || []).filter(unit => String(unit.supplierId || '') === String(selectedSupplier.id));
      const isLinked = purchases.length || units.length || String(product.supplierId || '') === String(selectedSupplier.id);
      if (!isLinked) return;
      const row = ensureRow(product.id, product.name);
      row.productName ||= product.name || 'Stock product';
      const unbilledPurchases = purchases.filter(purchase => !(purchase.billId && selectedSupplierRecordedBillIds.has(String(purchase.billId)))
        && !(purchase.invoiceNumber && selectedSupplierRecordedInvoiceNumbers.has(String(purchase.invoiceNumber).trim().toLowerCase())));
      [...unbilledPurchases].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach(purchase => {
        const quantity = Number(purchase.quantity || 0);
        row.purchased += quantity;
        row.purchaseValue += Number(purchase.unitCost || 0) * quantity;
        if (String(purchase.date || '') >= row.lastPurchaseDate) {
          row.lastPurchaseDate = String(purchase.date || '');
          row.lastPurchaseQuantity = quantity;
          row.lastPurchaseUnitCost = Number(purchase.unitCost ?? purchase.unitCostEntered ?? 0);
          row.lastPurchaseInvoiceNumber = purchase.invoiceNumber || '';
        }
      });
      if (!row.lastPurchaseDate) row.lastPurchaseDate = purchases.map(purchase => String(purchase.date || '')).sort().at(-1) || '';
      const sourceIds = [...new Set([...(product.supplierPurchases || []).map(purchase => purchase.supplierId), product.supplierId].filter(Boolean).map(String))];
      const availableSupplierUnits = units.filter(unit => !['sold', 'returned', 'removed'].includes(String(unit.status || '').toLowerCase()));
      const hasUnitBatches = (product.units || []).length > 0;
      row.linkedStock = hasUnitBatches
        ? availableSupplierUnits.length
        : sourceIds.length === 1 && sourceIds[0] === String(selectedSupplier.id)
          ? Number(product.stock || 0)
          : null;
      row.currentStock = Number(product.stock || 0);
      row.category = product.category || '—';
      row.sold = selectedSupplierSales.products.get(String(product.id))?.quantity || 0;
      row.unattributedSold = unattributedSupplierSales.get(String(product.id)) || 0;
      row.buyPrice = Number(product.buyPrice || 0);
      row.lowStockThreshold = Number(product.lowStockThreshold || 2);
      row.reorderQuantity = Math.max(1, row.lowStockThreshold - row.currentStock);
      row.lastUnitCost ??= Number(product.buyCostEntered ?? product.buyPrice ?? 0);
    });
    return [...rows.values()].sort((a, b) => String(a.productName).localeCompare(String(b.productName)));
  })();
  const addSupplierReorderLine = (productId, quantity = 1) => {
    if (!productId) return;
    const parsedQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);
    setSupplierReorderLines(previous => {
      const existing = previous.find(line => String(line.productId) === String(productId));
      return existing
        ? previous.map(line => String(line.productId) === String(productId) ? { ...line, quantity: Number(line.quantity || 0) + parsedQuantity } : line)
        : [...previous, { productId: String(productId), quantity: parsedQuantity }];
    });
    setReorderProductId('');
    setReorderQuantity('1');
  };
  const openSupplierProfile = supplierId => {
    setSupplierReorderLines([]);
    setReorderProductId('');
    setReorderQuantity('1');
    setSelectedSupplierProfileId(supplierId);
  };

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
                <th style={{ padding: '0.65rem 0.5rem' }}>Name</th>
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
                  <td style={{ padding: '0.75rem 0.5rem' }}>{exp.payeeName || '—'}</td>
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
            const billCount = countUniqueSupplierBills(bills);
            const unitsReceived = bills.reduce((sum, bill) => sum + Number(bill.quantity || (bill.lines || []).reduce((qty, line) => qty + Number(line.quantity || 0), 0)), 0);
            const purchaseValue = bills.reduce((sum, bill) => sum + Number(bill.totalAmount || 0), 0);
            const sales = supplierSales.get(supplier.id) || { quantity: 0, products: new Map() };
            const linkedStock = getSupplierLinkedStock(supplier.id);
            return <article key={supplier.id} role="button" tabIndex={0} onClick={() => openSupplierProfile(supplier.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSupplierProfile(supplier.id); } }} style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 12, background: 'var(--surface-primary)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}><div><strong>{supplier.name}</strong><div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 3 }}>{supplier.contactPerson || 'No contact'} · {supplier.phone || 'No phone'}{supplier.city ? ` · ${supplier.city}` : ''}</div></div><div style={{ display: 'flex', gap: 5, flexShrink: 0 }}><button type="button" className="btn-outline" onClick={event => { event.stopPropagation(); editSupplier(supplier); }} style={{ padding: '0.35rem 0.5rem', fontSize: '0.74rem' }}>Edit</button><button type="button" className="btn-primary" onClick={event => { event.stopPropagation(); openInwardForSupplier(supplier.id); }} style={{ padding: '0.35rem 0.55rem', fontSize: '0.74rem' }}><Plus size={13} /> Add bill</button><ChevronDown size={16} aria-hidden="true" /></div></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 10, fontSize: '0.75rem' }}><span>Bills<strong style={{ display: 'block', fontSize: '1rem' }}>{billCount}</strong></span><span>Units received<strong style={{ display: 'block', fontSize: '1rem' }}>{unitsReceived}</strong></span><span>Linked stock<strong style={{ display: 'block', fontSize: '1rem' }}>{linkedStock}</strong></span><span>POS units sold<strong style={{ display: 'block', fontSize: '1rem' }}>{sales.quantity}</strong></span></div>
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Purchase value: <strong>₹{purchaseValue.toLocaleString('en-IN')}</strong> · Payable: <strong>₹{(Number(supplier.balancePayable) || 0).toLocaleString('en-IN')}</strong></div>
              <div style={{ marginTop: 8, color: 'var(--accent-primary)', fontSize: '0.72rem', fontWeight: 700 }}>Open supplier bills, inventory and sales history</div>
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
                  <td style={{ padding: '0.75rem 0.5rem' }}>{countUniqueSupplierBills(sup.purchaseBills)}</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{supplierSales.get(sup.id)?.quantity || 0}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}><div style={{ display: 'flex', gap: 5 }}><button type="button" className="btn-outline" onClick={() => editSupplier(sup)} style={{ padding: '0.3rem 0.5rem' }}>Edit</button><button type="button" className="btn-outline" onClick={() => openInwardForSupplier(sup.id)} style={{ padding: '0.3rem 0.5rem' }}><Plus size={13} /> Add bill</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="illoca-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '0.75rem' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>Received Products & Supplier Bills ({supplierBillFilter === 'all' ? supplierBillCount : countUniqueSupplierBills(supplierBills.filter(bill => bill.supplierId === supplierBillFilter))} bills · {supplierBills.filter(bill => supplierBillFilter === 'all' || bill.supplierId === supplierBillFilter).length} product entries)</h3><select className="input-field" value={supplierBillFilter} onChange={event => setSupplierBillFilter(event.target.value)} style={{ width: 'auto', minWidth: 190 }}><option value="all">All suppliers</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
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

      {selectedSupplier && (
        <div
          className="drawer-overlay"
          role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) setSelectedSupplierProfileId(''); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 2400 }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-profile-title"
            onMouseDown={event => event.stopPropagation()}
            className="illoca-card animate-fade-in supplier-profile-dialog"
            style={{ width: 'min(1120px, 100%)', maxHeight: '92vh', overflowY: 'auto', padding: '1.1rem', background: 'var(--surface-primary)' }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={19} color="var(--accent-primary)" /><h2 id="supplier-profile-title" style={{ margin: 0, fontSize: '1.18rem' }}>{selectedSupplier.name}</h2></div>
                <div style={{ marginTop: 5, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{selectedSupplier.contactPerson || 'No contact person'} · {selectedSupplier.phone || 'No phone'} · {selectedSupplier.city || 'Location not recorded'}{selectedSupplier.gstin ? ` · GSTIN ${selectedSupplier.gstin}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                <button type="button" className="btn-outline" onClick={() => { setSelectedSupplierProfileId(''); editSupplier(selectedSupplier); }}>Edit supplier</button>
                <button type="button" className="btn-primary" onClick={() => { setSelectedSupplierProfileId(''); openInwardForSupplier(selectedSupplier.id); }}><Plus size={14} /> Add bill</button>
                <button type="button" className="btn-outline" disabled={!supplierReorderLines.length} onClick={() => { openInwardForSupplier(selectedSupplier.id, supplierReorderLines); setSelectedSupplierProfileId(''); }}>Create bill from reorder list ({supplierReorderLines.length})</button>
                <button type="button" className="btn-outline" aria-label="Close supplier profile" onClick={() => setSelectedSupplierProfileId('')}><X size={17} /></button>
              </div>
            </header>

            <div className="supplier-profile-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 8, marginTop: 12 }}>
              {[
                ['Bills', selectedSupplierBillCount],
                ['Units received', selectedSupplierUnitsReceived],
                ['Linked stock now', getSupplierLinkedStock(selectedSupplier.id)],
                ['Units sold', selectedSupplierSales.quantity],
                ['Purchase value', `₹${selectedSupplierPurchaseValue.toLocaleString('en-IN')}`],
                ['Bills due', `₹${selectedSupplierBillsDue.toLocaleString('en-IN')}`],
                ['Other Khata due', `₹${selectedSupplierOtherKhataDue.toLocaleString('en-IN')}`],
                ['Total payable', `₹${(Number(selectedSupplier.balancePayable) || 0).toLocaleString('en-IN')}`],
              ].map(([label, value]) => <div key={label} style={{ padding: '0.7rem 0.8rem', border: '1px solid var(--border-color)', borderRadius: 10, background: 'var(--surface-secondary, var(--surface-primary))' }}><small style={{ color: 'var(--text-secondary)' }}>{label}</small><strong style={{ display: 'block', fontSize: '1.05rem', marginTop: 3 }}>{value}</strong></div>)}
            </div>

            <section style={{ marginTop: 16 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.98rem' }}>Inventory linked to this supplier</h3>
              <p style={{ margin: '-2px 0 8px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Compare the latest quantity received with stock still available and units sold before adding the next bill.</p>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 920 }}>
                  <thead><tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}><th style={{ padding: 9 }}>Product</th><th style={{ padding: 9 }}>Category</th><th style={{ padding: 9 }}>Received total</th><th style={{ padding: 9 }}>Last bill qty</th><th style={{ padding: 9 }}>Supplier stock left</th><th style={{ padding: 9 }}>Current total stock</th><th style={{ padding: 9 }}>Sold from supplier</th><th style={{ padding: 9 }}>Mixed-source sales not traced</th><th style={{ padding: 9 }}>Last received</th><th style={{ padding: 9 }}>Last buy cost / unit</th><th style={{ padding: 9 }}>Reorder</th></tr></thead>
                  <tbody>{selectedSupplierInventory.length ? selectedSupplierInventory.map(product => <tr key={product.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 9, fontWeight: 700 }}>{product.productName}{!product.currentStock && product.currentStock !== 0 ? <small style={{ display: 'block', color: 'var(--status-red)' }}>Product not found in inventory</small> : null}</td>
                    <td style={{ padding: 9 }}>{product.category || '—'}</td>
                    <td style={{ padding: 9 }}>{product.purchased}</td>
                    <td style={{ padding: 9, fontWeight: 700 }}>{product.lastPurchaseQuantity || '—'}{product.lastPurchaseInvoiceNumber ? <small style={{ display: 'block', color: 'var(--text-secondary)' }}>{product.lastPurchaseInvoiceNumber}</small> : null}</td>
                    <td style={{ padding: 9 }}>{product.linkedStock == null ? 'Not batch-tracked' : product.linkedStock}</td>
                    <td style={{ padding: 9 }}>{product.currentStock ?? '—'}{product.currentStock != null ? <small style={{ display: 'block', color: Number(product.currentStock) <= Number(product.lowStockThreshold || 2) ? 'var(--status-red)' : 'var(--status-green)' }}>{Number(product.currentStock) <= Number(product.lowStockThreshold || 2) ? 'Reorder recommended' : 'Stock sufficient'}</small> : null}</td>
                    <td style={{ padding: 9 }}>{product.sold || 0}</td>
                    <td style={{ padding: 9 }}>{product.unattributedSold ? `${product.unattributedSold} · source unknown` : '—'}</td>
                    <td style={{ padding: 9 }}>{product.lastPurchaseDate || '—'}</td>
                    <td style={{ padding: 9 }}>{product.lastPurchaseUnitCost == null ? '—' : `₹${Number(product.lastPurchaseUnitCost).toLocaleString('en-IN')}`}</td>
                    <td style={{ padding: 9 }}>{product.productId ? <button type="button" className="btn-outline" onClick={() => addSupplierReorderLine(product.productId, product.reorderQuantity || 1)}>Add {product.reorderQuantity || 1}</button> : '—'}</td>
                  </tr>) : <tr><td colSpan="11" style={{ padding: 14, textAlign: 'center', color: 'var(--text-secondary)' }}>No supplier-linked stock or purchase lines have been recorded.</td></tr>}</tbody>
                </table>
              </div>
              <div style={{ marginTop: 10, padding: 10, border: '1px solid var(--border-color)', borderRadius: 10, background: 'var(--surface-secondary, var(--surface-primary))' }}>
                <strong style={{ fontSize: '0.84rem' }}>Supplier reorder list</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(70px,90px) auto', gap: 8, marginTop: 8 }}>
                  <select className="input-field" value={reorderProductId} onChange={event => setReorderProductId(event.target.value)} aria-label="Choose inventory product to reorder">
                    <option value="">Choose any inventory product</option>
                    {inventory.map(product => <option key={product.id} value={product.id}>{product.brand} · {product.name} · Stock {product.stock}</option>)}
                  </select>
                  <input className="input-field" type="number" min="1" step="1" value={reorderQuantity} onChange={event => setReorderQuantity(event.target.value)} aria-label="Reorder quantity" />
                  <button type="button" className="btn-outline" disabled={!reorderProductId} onClick={() => addSupplierReorderLine(reorderProductId, reorderQuantity)}><Plus size={14} /> Add to list</button>
                </div>
                {supplierReorderLines.length ? <div style={{ display: 'grid', gap: 5, marginTop: 8 }}>{supplierReorderLines.map(line => {
                  const product = inventory.find(item => String(item.id) === String(line.productId));
                  return <div key={line.productId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0.4rem 0.55rem', border: '1px solid var(--border-color)', borderRadius: 7, fontSize: '0.78rem' }}><span>{product?.name || 'Product'} · stock {product?.stock ?? '—'}</span><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><label>Qty <input className="input-field" type="number" min="1" step="1" value={line.quantity} onChange={event => setSupplierReorderLines(previous => previous.map(item => item.productId === line.productId ? { ...item, quantity: Math.max(1, Number.parseInt(event.target.value, 10) || 1) } : item))} style={{ width: 75 }} /></label><button type="button" className="btn-outline" onClick={() => setSupplierReorderLines(previous => previous.filter(item => item.productId !== line.productId))}>Remove</button></div></div>;
                })}</div> : <div style={{ marginTop: 7, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Add low stock products above or choose any inventory item. The list becomes a draft supplier bill.</div>}
              </div>
            </section>

            <section style={{ marginTop: 16 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.98rem' }}>Supplier bills & purchase dates</h3>
              {selectedSupplierBills.length ? <div style={{ display: 'grid', gap: 8 }}>{[...selectedSupplierBills].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).map(bill => {
                const lines = bill.lines?.length ? bill.lines : [{ productName: bill.productName || 'Stock item', quantity: bill.quantity, unitCost: bill.unitCost }];
                return <article key={bill.id} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><strong>{bill.invoiceNumber || 'Supplier bill'}</strong><span style={{ color: 'var(--text-secondary)' }}>{bill.date || 'Date not recorded'}</span></div>
                  <div style={{ marginTop: 5, fontSize: '0.82rem' }}>{lines.map(line => `${line.productName || 'Stock item'} × ${Number(line.quantity || 0)} @ ₹${Number(line.unitCost || 0).toLocaleString('en-IN')}`).join(' · ')}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 7, fontSize: '0.8rem' }}><span>Total ₹{Number(bill.totalAmount || 0).toLocaleString('en-IN')} · Paid ₹{Number(bill.paidAmount || 0).toLocaleString('en-IN')} · Due ₹{Number(bill.balanceDue ?? Number(bill.totalAmount || 0) - Number(bill.paidAmount || 0)).toLocaleString('en-IN')}</span><span style={{ display: 'flex', gap: 6 }}>{bill.attachment && <button type="button" className="btn-outline" onClick={() => handleOpenSupplierBill(bill.attachment)}><FileCheck size={13} /> Open bill</button>}{role === 'admin' && <button type="button" className="btn-outline" onClick={() => { setSelectedSupplierProfileId(''); editSupplierBill(selectedSupplier.id, bill); }}>Edit bill</button>}</span></div>
                </article>;
              })}</div> : <div style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-secondary)' }}>No bills have been recorded for this supplier.</div>}
              {selectedSupplierUnbilledPurchases.length > 0 && <div style={{ marginTop: 10, padding: 10, border: '1px solid var(--border-color)', borderRadius: 10 }}>
                <strong style={{ fontSize: '0.82rem' }}>Older inventory purchase records not linked to a bill ({selectedSupplierUnbilledPurchases.length})</strong>
                <div style={{ overflowX: 'auto', marginTop: 6 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: 460 }}>
                  <thead><tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}><th style={{ padding: 7 }}>Date</th><th style={{ padding: 7 }}>Invoice ref</th><th style={{ padding: 7 }}>Product</th><th style={{ padding: 7 }}>Qty</th><th style={{ padding: 7 }}>Recorded unit cost</th></tr></thead>
                  <tbody>{[...selectedSupplierUnbilledPurchases].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).map((purchase, index) => <tr key={`${purchase.supplierId}-${purchase.productName}-${purchase.date}-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: 7 }}>{purchase.date || '—'}</td><td style={{ padding: 7 }}>{purchase.invoiceNumber || '—'}</td><td style={{ padding: 7 }}>{purchase.productName}</td><td style={{ padding: 7 }}>{purchase.quantity || '—'}</td><td style={{ padding: 7 }}>{purchase.unitCost == null ? '—' : `₹${Number(purchase.unitCost).toLocaleString('en-IN')}`}</td></tr>)}</tbody>
                </table></div>
              </div>}
            </section>

            <section style={{ marginTop: 16 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.98rem' }}>Recent sales from this supplier’s stock</h3>
              {supplierSaleRows.some(row => row.supplierId === String(selectedSupplier.id)) ? <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 620 }}>
                  <thead><tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}><th style={{ padding: 9 }}>Sale date</th><th style={{ padding: 9 }}>Invoice</th><th style={{ padding: 9 }}>Customer</th><th style={{ padding: 9 }}>Product</th><th style={{ padding: 9 }}>Qty</th></tr></thead>
                  <tbody>{supplierSaleRows.filter(row => row.supplierId === String(selectedSupplier.id)).map((row, index) => <tr key={`${row.invoiceNo}-${row.productName}-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: 9 }}>{row.date || '—'}</td><td style={{ padding: 9 }}>{row.invoiceNo}</td><td style={{ padding: 9 }}>{row.customerName}</td><td style={{ padding: 9 }}>{row.productName}</td><td style={{ padding: 9 }}>{row.quantity}</td></tr>)}</tbody>
                </table>
              </div> : <div style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-secondary)' }}>No POS sales have been attributed to this supplier yet.</div>}
            </section>

            <section style={{ marginTop: 16 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.98rem' }}>Supplier payment history</h3>
              {selectedSupplier.payments?.length ? <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 10 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 500 }}>
                <thead><tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}><th style={{ padding: 9 }}>Date</th><th style={{ padding: 9 }}>Mode</th><th style={{ padding: 9 }}>Reference / note</th><th style={{ padding: 9, textAlign: 'right' }}>Paid</th></tr></thead>
                <tbody>{[...selectedSupplier.payments].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).map(payment => <tr key={payment.id} style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: 9 }}>{payment.date || '—'}</td><td style={{ padding: 9 }}>{payment.mode || '—'}</td><td style={{ padding: 9 }}>{payment.note || '—'}</td><td style={{ padding: 9, textAlign: 'right', fontWeight: 700 }}>₹{Number(payment.amount || 0).toLocaleString('en-IN')}</td></tr>)}</tbody>
              </table></div> : <div style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-secondary)' }}>No supplier payments recorded.</div>}
              {selectedSupplier.khataEntries?.length > 0 && <div style={{ marginTop: 10, border: '1px solid var(--border-color)', borderRadius: 10, padding: 10 }}><strong style={{ fontSize: '0.82rem' }}>Other supplier Khata entries</strong><div style={{ display: 'grid', gap: 5, marginTop: 6 }}>{selectedSupplier.khataEntries.map(entry => <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '0.78rem' }}><span>{entry.date || '—'} · {entry.description || 'Khata adjustment'}</span><span>₹{Number(entry.amount || 0).toLocaleString('en-IN')} · Due ₹{Number(entry.balanceDue ?? Number(entry.amount || 0) - Number(entry.paidAmount || 0)).toLocaleString('en-IN')}</span></div>)}</div></div>}
            </section>
          </section>
        </div>
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

              {expenseNeedsPayeeName && <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  {expCategory === 'Staff Salary' ? 'Staff Name *' : 'Paid To / Person Name *'}
                </label>
                <input type="text" placeholder={expCategory === 'Staff Salary' ? 'Enter staff member name' : 'Enter person or business name'} value={expPayeeName} onChange={e => setExpPayeeName(e.target.value)} required className="input-field" />
              </div>}

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
                  {isImportingBill ? 'Reading bill…' : inwardDocument ? `${inwardDocument.name}${/\.(xlsx|xls|csv)$/i.test(inwardDocument.name) ? ' · spreadsheet rows loaded' : ' · attached'}${inwardGstHint ? ` · GST ${inwardGstHint.includesGst ? 'included' : 'extra'} detected; verify each line` : /\.pdf$/i.test(inwardDocument.name) ? ' · no clear GST wording detected; choose for each line' : ''}` : 'Drop a bill here. Excel/CSV rows can prefill products, quantities, costs and identifiers. Text-based PDFs are checked for GST inclusion wording.'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Products on this bill</label>
                <button type="button" className="btn-outline" onClick={() => setInwardItems(previous => [...previous, newInwardLine()])} style={{ padding: '0.35rem 0.6rem', fontSize: '0.76rem' }}><Plus size={13} /> Add product</button>
              </div>
              <div style={{ marginTop: -8, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Choose an inventory item or create a new unpublished product here. New mobile products need one IMEI per unit.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '32vh', overflowY: 'auto' }}>
                {inwardItems.map((line, index) => (
                  <div key={line.id} className="illoca-card" style={{ padding: '0.7rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Product {index + 1} *</label>
                      <select value={line.isNewProduct ? '__new__' : line.productId} onChange={event => {
                        if (event.target.value === '__new__') {
                          updateInwardLine(line.id, { productId: `NEW-${line.id}`, isNewProduct: true });
                          return;
                        }
                        const selectedProduct = inventory.find(product => String(product.id) === event.target.value);
                        const invoiceHint = line.unitCostIncludesGst !== null && line.unitCostIncludesGst !== undefined
                          ? line.unitCostIncludesGst
                          : inwardGstHint?.includesGst;
                        updateInwardLine(line.id, {
                          productId: event.target.value,
                          isNewProduct: false,
                          unitCostIncludesGst: invoiceHint ?? (selectedProduct?.buyPriceIncludesGst !== false),
                          gstInclusionSource: invoiceHint !== null && invoiceHint !== undefined
                            ? (line.gstInclusionSource || inwardGstHint?.source || 'uploaded bill')
                            : 'product setting'
                        });
                      }} required className="input-field">
                        <option value="">{line.importedName ? `Match: ${line.importedName}` : 'Choose inventory product'}</option>
                        {inventory.map(product => <option key={product.id} value={product.id}>{product.brand} · {product.name} (Stock: {product.stock})</option>)}
                        <option value="__new__">＋ Add a new product from this supplier</option>
                      </select>
                      {line.isNewProduct && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6, marginTop: 6 }}>
                        <input className="input-field" value={line.newProductName} onChange={event => updateInwardLine(line.id, { newProductName: event.target.value })} placeholder="Product name *" required aria-label={`New product ${index + 1} name`} />
                        <input className="input-field" value={line.newProductCategory} onChange={event => updateInwardLine(line.id, { newProductCategory: event.target.value })} placeholder="Category * (e.g. Accessories)" required aria-label={`New product ${index + 1} category`} />
                        <input className="input-field" value={line.newProductBrand} onChange={event => updateInwardLine(line.id, { newProductBrand: event.target.value })} placeholder="Brand (optional)" aria-label={`New product ${index + 1} brand`} />
                        <input className="input-field" type="text" inputMode="numeric" maxLength={8} value={line.newProductHsn || ''} onChange={event => updateInwardLine(line.id, { newProductHsn: event.target.value.replace(/[^0-9]/g, '').slice(0, 8) })} placeholder="HSN code (optional)" aria-label={`New product ${index + 1} HSN code`} />
                        <input className="input-field" type="number" min="0" step="0.01" value={line.newProductSellPrice} onChange={event => updateInwardLine(line.id, { newProductSellPrice: event.target.value })} placeholder="Selling price ₹ (defaults to cost)" aria-label={`New product ${index + 1} selling price`} />
                        <select className="input-field" value={line.newProductGstRate} onChange={event => updateInwardLine(line.id, { newProductGstRate: event.target.value })} aria-label={`New product ${index + 1} GST rate`}><option value="0">Non-GST</option><option value="5">5% GST</option><option value="12">12% GST</option><option value="18">18% GST</option><option value="28">28% GST</option></select>
                        <textarea className="input-field" value={isImeiTrackedCategory(line.newProductCategory) ? line.imei1Values.join('\n') : line.identifiers.join('\n')} onChange={event => {
                          const values = event.target.value.split(/[\n,;]+/).map(value => value.trim()).filter(Boolean);
                          updateInwardLine(line.id, isImeiTrackedCategory(line.newProductCategory) ? { imei1Values: values } : { identifiers: values });
                        }} placeholder={isImeiTrackedCategory(line.newProductCategory) ? 'IMEI 1 per unit, one per line *' : 'Serial numbers, one per line (optional)'} aria-label={`New product ${index + 1} identifiers`} rows={2} style={{ gridColumn: '1 / -1' }} />
                      </div>}
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Qty *</label>
                      <input type="number" min="1" step="1" value={line.quantity} onChange={event => updateInwardLine(line.id, { quantity: event.target.value })} required className="input-field" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Unit cost ₹ *</label>
                      <input type="number" min="0.01" step="0.01" value={line.unitCost} onChange={event => updateInwardLine(line.id, { unitCost: event.target.value })} required className="input-field" />
                      {(() => {
                        const product = inventory.find(item => String(item.id) === String(line.productId));
                        const rate = productGstRate(product);
                        const cost = getPurchaseCostBreakdown(line.unitCost, rate, line.unitCostIncludesGst);
                        return <>
                          {rate > 0 ? <>
                            <label style={{ display: 'block', marginTop: 5, fontSize: '0.66rem', color: 'var(--text-secondary)' }}>GST in this bill price? ({rate}%)</label>
                            <select value={line.unitCostIncludesGst ? 'included' : 'extra'} onChange={event => updateInwardLine(line.id, { unitCostIncludesGst: event.target.value === 'included', gstInclusionSource: 'admin' })} className="input-field" aria-label={`GST inclusion for product ${index + 1}`}>
                              <option value="included">Included in unit cost</option>
                              <option value="extra">Add GST to unit cost</option>
                            </select>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 3 }}>{line.gstInclusionSource === 'uploaded spreadsheet' || line.gstInclusionSource === 'uploaded PDF' || line.gstInclusionSource === 'uploaded bill' ? `Suggested from ${line.gstInclusionSource}; verify against invoice.` : line.gstInclusionSource === 'product setting' ? 'Prefilled from this product’s last purchase; change to match this invoice.' : 'Choose according to the supplier invoice.'}</div>
                            {Number(line.unitCost) > 0 && <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>{line.unitCostIncludesGst ? 'GST is already in this price' : `GST added: ₹${cost.gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} · Cost to stock: ₹{cost.gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
                          </> : <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4 }}>No GST applies to this product.</div>}
                        </>;
                      })()}
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
