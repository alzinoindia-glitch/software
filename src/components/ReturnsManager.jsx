import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign, PackageCheck, RefreshCw, Search, RotateCcw } from 'lucide-react';
import { getUpiQrUrl } from '../utils/barcode';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const getInvoiceUnitCodes = (item) => [
  ...(Array.isArray(item?.imeis) ? item.imeis : []),
  ...(Array.isArray(item?.units) ? item.units : []),
  ...(Array.isArray(item?.soldUnitRecords) ? item.soldUnitRecords.map(unit => unit?.identifier || unit?.imei || unit?.serialNumber || unit?.barcode || '') : [])
].map((unit) => typeof unit === 'string' ? unit : unit?.imei1 || unit?.imei || unit?.serialNumber || unit?.imei2 || unit?.barcode || unit?.identifier || unit?.id || '')
  .map((value) => String(value).trim()).filter(Boolean).filter((value, index, values) => values.indexOf(value) === index);
const describeReplacement = (entry) => (entry.replacements || (entry.replacement ? [entry.replacement] : []))
  .map((item) => `${item.productName} × ${item.quantity}${Number(item.discountPerUnit || 0) > 0 ? ` (${money(item.discountPerUnit)} discount each)` : ''}`).join(', ');

export default function ReturnsManager({ invoices = [], setInvoices, inventory = [], setInventory, customers = [], setCustomers = () => {}, suppliers = [], shopConfig = {} }) {
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [selectedInvoiceKey, setSelectedInvoiceKey] = useState('');
  const [lineIndices, setLineIndices] = useState([]);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [selectedReturnIdentifiers, setSelectedReturnIdentifiers] = useState({});
  const [action, setAction] = useState('refund');
  const [replacementMode, setReplacementMode] = useState('product-exchange');
  const [pageView, setPageView] = useState('process');
  const [historyQuery, setHistoryQuery] = useState('');
  const [condition, setCondition] = useState('damaged');
  const [restock, setRestock] = useState(false);
  const [replacementLines, setReplacementLines] = useState([]);
  const [additionalReplacementDiscount, setAdditionalReplacementDiscount] = useState(0);
  const [settlementMethod, setSettlementMethod] = useState('Cash');
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [returnAllowanceInput, setReturnAllowanceInput] = useState('');
  const [settlementReference, setSettlementReference] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [selectedUpiAccountId, setSelectedUpiAccountId] = useState('');
  const [replacementProductQuery, setReplacementProductQuery] = useState('');
  const [notice, setNotice] = useState(null);
  const returnSubmissionRef = useRef(false);
  useEffect(() => { returnSubmissionRef.current = false; }, [invoices]);

  const matchingInvoices = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();
    if (!q) return [];
    return invoices.filter((invoice) => [invoice.invoiceNo, invoice.customerName, invoice.customerPhone]
      .some((value) => String(value || '').toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 12);
  }, [invoices, invoiceQuery]);
  const invoice = invoices.find((item) => String(item.invoiceNo || item.id) === selectedInvoiceKey) || null;
  const invoiceItems = invoice?.items || [];
  const invoiceLineGross = invoiceItems.reduce((sum, item) => sum + Number(item.total ?? (Number(item.rate || 0) * Number(item.qty || 1))), 0);
  const invoiceNetScale = invoice && invoiceLineGross > 0 ? Math.min(1, Number(invoice.grandTotal ?? invoiceLineGross) / invoiceLineGross) : 1;
  const availableQty = (index) => {
    const sold = Number(invoiceItems[index]?.qty || 0);
    const priorEntries = (invoice?.returnTransactions || []).filter((entry) => Number(entry.originalItemIndex) === index && entry.status !== 'voided');
    const already = priorEntries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    return Math.max(0, sold - already);
  };
  const selectedReturnLines = lineIndices.map((index) => {
    const item = invoiceItems[index];
    const maxQty = availableQty(index);
    const itemValue = Number(item?.total ?? (Number(item?.rate || 0) * Number(item?.qty || 1))) * invoiceNetScale;
    const quantity = Math.min(maxQty, Math.max(1, Number(returnQuantities[index]) || 1));
    const unitCodes = getInvoiceUnitCodes(item);
    const priorEntries = (invoice?.returnTransactions || []).filter((entry) => Number(entry.originalItemIndex) === index && entry.status !== 'voided');
    const explicitReturnedCodes = priorEntries.flatMap((entry) => Array.isArray(entry.returnedImeis) ? entry.returnedImeis.map(String) : []);
    const legacyReturnedCount = priorEntries.filter((entry) => !Array.isArray(entry.returnedImeis) || !entry.returnedImeis.length)
      .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    const excludedCodes = new Set([...explicitReturnedCodes, ...unitCodes.slice(0, legacyReturnedCount)]);
    const availableReturnIdentifiers = unitCodes.filter((code) => !excludedCodes.has(code));
    const returnIdentifiers = selectedReturnIdentifiers[index] || [];
    const soldUnitRecords = Array.isArray(item?.soldUnitRecords) ? item.soldUnitRecords : [];
    const returnUnits = returnIdentifiers.map(identifier => {
      const soldRecord = soldUnitRecords.find(record => String(record.identifier || record.imei || record.barcode || record.serialNumber || '') === String(identifier));
      const original = soldRecord?.unitRecord || {};
      const legacyIsImei = (item?.imeis || []).map(String).includes(String(identifier));
      const legacyIsSerial = (item?.serialNumbers || []).map(String).includes(String(identifier));
      const legacyIsBarcode = (item?.barcodes || []).map(String).includes(String(identifier));
      return {
        ...original,
        ...(soldRecord?.imei1 || original.imei1 ? { imei1: soldRecord?.imei1 || original.imei1 } : (legacyIsImei ? { imei1: String(identifier) } : {})),
        ...(soldRecord?.imei2 || original.imei2 ? { imei2: soldRecord?.imei2 || original.imei2 } : {}),
        ...(soldRecord?.serialNumber || original.serialNumber ? { serialNumber: soldRecord?.serialNumber || original.serialNumber } : (legacyIsSerial ? { serialNumber: String(identifier) } : {})),
        ...(soldRecord?.barcode || original.barcode ? { barcode: soldRecord?.barcode || original.barcode } : (legacyIsBarcode ? { barcode: String(identifier) } : {})),
        ...(soldRecord?.supplierId || original.supplierId ? { supplierId: soldRecord?.supplierId || original.supplierId } : {}),
        ...(soldRecord?.supplierName || original.supplierName ? { supplierName: soldRecord?.supplierName || original.supplierName } : {}),
        ...(soldRecord?.supplierBillId || original.supplierBillId ? { supplierBillId: soldRecord?.supplierBillId || original.supplierBillId } : {}),
        ...(soldRecord?.purchaseCost != null || original.purchaseCost != null ? { purchaseCost: soldRecord?.purchaseCost ?? original.purchaseCost } : {}),
        returnedFromInvoice: invoice?.invoiceNo || '',
        status: 'In Stock'
      };
    });
    return {
      index, item, maxQty, quantity, unitCodes, availableReturnIdentifiers, hasTrackedUnits: unitCodes.length > 0,
      returnIdentifiers, returnUnits,
      unitPaid: itemValue / Math.max(1, Number(item?.qty || 1)),
      returnValue: itemValue / Math.max(1, Number(item?.qty || 1)) * quantity    };
  }).filter((line) => line.item && line.maxQty > 0);
  const returnValue = selectedReturnLines.reduce((sum, line) => sum + line.returnValue, 0);
  const inStockProducts = inventory.filter((item) => Number(item.stock || 0) > 0);
  const matchingStockProducts = inStockProducts.filter((item) => [item.name, item.brand, item.category, item.barcode, item.serialNumber, item.model]
    .some((value) => String(value || '').toLowerCase().includes(replacementProductQuery.trim().toLowerCase())));
  const returnAllowance = Math.min(returnValue, Math.max(0, returnAllowanceInput === '' ? returnValue : Number(returnAllowanceInput) || 0));
  const invoicePaid = invoice ? Math.max(0, Number(invoice.paidAmount ?? (String(invoice.paymentMode || '').toLowerCase() === 'khata' ? 0 : Number(invoice.grandTotal || 0) - Number(invoice.balanceDue ?? invoice.khataDue ?? 0))) || 0) : 0;
  const invoiceOutstanding = invoice ? Math.max(0, Number(invoice.balanceDue ?? invoice.khataDue ?? (Number(invoice.grandTotal || 0) - invoicePaid)) || 0) : 0;
  const originalInvoiceOutstanding = invoice ? Math.max(0, Number(invoice.returnOriginalBalanceDue ?? invoiceOutstanding) || 0) : 0;
  // Allocate invoice-level Khata proportionally to the returned item's net value.
  // The allowance first cancels the unpaid share; only the remainder is cash/store credit.
  const returnOutstandingShare = invoice && Number(invoice.grandTotal || 0) > 0
    ? Math.min(invoiceOutstanding, returnValue * (originalInvoiceOutstanding / Number(invoice.grandTotal)))
    : 0;
  const outstandingCleared = Math.min(returnOutstandingShare, returnAllowance);
  const availableReturnCredit = Math.max(0, returnAllowance - outstandingCleared);
  const refundAmount = action === 'refund' ? availableReturnCredit : 0;
  const refundableBalance = invoice
    ? Math.max(0, invoicePaid - (invoice.returnTransactions || [])
      .filter((entry) => entry.status !== 'voided')
      .reduce((sum, entry) => sum + (entry.type === 'refund' ? Number(entry.refundAmount || 0) : (entry.settlement?.direction === 'refund' ? Number(entry.settlement.amount || 0) : 0)), 0))
    : 0;
  const resolvedReplacementLines = replacementLines.map((line) => {
    const product = inventory.find((item) => String(item.id) === String(line.productId));
    const listPrice = Number(product?.sellPrice ?? product?.price ?? 0);
    const discountPerUnit = Math.max(0, Number(line.discountPerUnit) || 0);
    return { ...line, product, listPrice, discountPerUnit, netUnitPrice: Math.max(0, listPrice - discountPerUnit) };
  });
  const replacementSubtotal = resolvedReplacementLines.reduce((sum, line) => sum + line.netUnitPrice * Number(line.quantity || 0), 0);
  const appliedAdditionalReplacementDiscount = Math.min(Math.max(0, Number(additionalReplacementDiscount) || 0), replacementSubtotal);
  const replacementTotal = Math.max(0, replacementSubtotal - appliedAdditionalReplacementDiscount);
  const getReplacementNetUnitPrice = (line) => {
    const lineTotal = line.netUnitPrice * Number(line.quantity || 0);
    const allocatedDiscount = replacementSubtotal > 0 ? appliedAdditionalReplacementDiscount * (lineTotal / replacementSubtotal) : 0;
    return Math.max(0, line.netUnitPrice - allocatedDiscount / Math.max(1, Number(line.quantity || 0)));
  };
  const replacementDiscountTotal = resolvedReplacementLines.reduce((sum, line) => sum + Math.min(line.discountPerUnit, line.listPrice) * Number(line.quantity || 0), 0) + appliedAdditionalReplacementDiscount;
  const replacementDelta = replacementTotal - availableReturnCredit;
  const settlementAmount = Math.abs(replacementDelta);
  const settlementDirection = replacementDelta > 0 ? 'collect' : replacementDelta < 0 ? 'refund' : 'even';
  const exchangeSettlementOptions = settlementDirection === 'collect' ? ['Cash', 'UPI', 'Card', 'Khata due'] : ['Cash', 'UPI', 'Bank transfer'];
  const effectiveSettlementMethod = exchangeSettlementOptions.includes(settlementMethod) ? settlementMethod : exchangeSettlementOptions[0];
  const upiAccounts = useMemo(() => {
    const configured = Array.isArray(shopConfig.upiAccounts) ? shopConfig.upiAccounts.filter((account) => account?.upiId) : [];
    return configured.length ? configured : (shopConfig.upiId ? [{ id: 'legacy', upiId: shopConfig.upiId, accountName: shopConfig.name || 'ALZINO', isDefault: true }] : []);
  }, [shopConfig]);
  const selectedUpiAccount = upiAccounts.find((account) => String(account.id) === String(selectedUpiAccountId)) || upiAccounts.find((account) => account.isDefault) || upiAccounts[0];
  const getProductSourceSummary = (product) => {
    if (!product) return { suppliers: [], cost: Number(product?.buyPrice || 0) };
    const purchases = [...(product.supplierPurchases || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const sourceIds = [...new Set([...purchases.map((purchase) => purchase.supplierId), product.supplierId].filter(Boolean).map(String))];
    const names = sourceIds.map((id) => suppliers.find((supplier) => String(supplier.id) === id)?.name || purchases.find((purchase) => String(purchase.supplierId) === id)?.supplierName || product.supplierName).filter(Boolean);
    const unitSources = (product.units || []).filter((unit) => unit.supplierId || unit.supplierName);
    const allNames = [...names, ...unitSources.map((unit) => suppliers.find((supplier) => String(supplier.id) === String(unit.supplierId))?.name || unit.supplierName)].filter(Boolean);
    return { suppliers: [...new Set(allNames)], cost: Number(purchases[0]?.unitCost ?? unitSources[0]?.unitCost ?? unitSources[0]?.buyPrice ?? product.buyPrice ?? 0) };
  };
  const returnHistory = useMemo(() => invoices.flatMap((item) => (item.returnTransactions || [])
    .filter((entry) => entry.status !== 'voided')
    .map((entry) => ({ invoice: item, entry })))
    .filter(({ invoice: item, entry }) => [item.invoiceNo, item.customerName, item.customerPhone, entry.originalProductName, entry.type, entry.replacementMode, entry.refundMethod, describeReplacement(entry)]
      .some((value) => String(value || '').toLowerCase().includes(historyQuery.trim().toLowerCase())))
    .sort((a, b) => new Date(b.entry.date || 0) - new Date(a.entry.date || 0)), [invoices, historyQuery]);

  const selectInvoice = (item) => {
    setSelectedInvoiceKey(String(item.invoiceNo || item.id));
    setInvoiceQuery(String(item.invoiceNo || item.id));
    setLineIndices([]); setReturnQuantities({}); setSelectedReturnIdentifiers({}); setNotice(null); setReplacementLines([]); setAdditionalReplacementDiscount(0); setReplacementProductQuery(''); setAction('refund');
    setReturnAllowanceInput(''); setSettlementReference(''); setPaymentConfirmed(false);
  };

  const completeReturn = () => {
    if (returnSubmissionRef.current) return;
    if (!invoice || !selectedReturnLines.length || selectedReturnLines.some((line) => line.quantity < 1 || line.quantity > line.maxQty)) {
      setNotice({ kind: 'error', text: 'Choose one or more invoice lines and valid quantities that have not already been returned.' }); return;
    }
    if (selectedReturnLines.some((line) => line.hasTrackedUnits && (line.availableReturnIdentifiers.length < line.quantity || line.returnIdentifiers.length !== line.quantity))) {
      setNotice({ kind: 'error', text: 'Select a valid, unique IMEI or serial number for every tracked unit being returned.' }); return;
    }
    if (action === 'refund' && refundAmount > refundableBalance + 0.01) {
      setNotice({ kind: 'error', text: `Refund exceeds the remaining amount paid on this invoice (${money(refundableBalance)}). Apply any unpaid balance as Khata credit instead.` }); return;
    }
    if (Number(returnAllowanceInput) < 0 || (returnAllowanceInput !== '' && Number(returnAllowanceInput) > returnValue + 0.01)) {
      setNotice({ kind: 'error', text: 'Return allowance must be between ₹0 and the original amount paid for the selected units.' }); return;
    }
    if (action === 'refund' && refundAmount > 0 && refundMethod === 'UPI' && !settlementReference.trim()) {
      setNotice({ kind: 'error', text: 'Enter the UPI transfer reference after sending the refund.' }); return;
    }
    if (action === 'replacement' && (!replacementLines.length || resolvedReplacementLines.some((line) => !line.product || Number(line.quantity) < 1))) {
      setNotice({ kind: 'error', text: 'Add at least one replacement product and set a valid quantity.' }); return;
    }
    if (action === 'replacement' && replacementMode === 'full-replacement' && selectedReturnLines.some((line) => line.quantity !== line.maxQty)) {
      setNotice({ kind: 'error', text: 'A full replacement must include every remaining unit on each selected invoice line.' }); return;
    }
    if (action === 'replacement' && replacementMode === 'partial-replacement' && selectedReturnLines.some((line) => line.quantity >= line.maxQty)) {
      setNotice({ kind: 'error', text: 'For a partial replacement, return less than the remaining quantity on each selected line. Choose full replacement to return all remaining units.' }); return;
    }
    if (action === 'replacement' && resolvedReplacementLines.some((line) => !Number.isFinite(line.discountPerUnit) || line.discountPerUnit < 0 || line.discountPerUnit > line.listPrice)) {
      setNotice({ kind: 'error', text: 'Each replacement discount must be zero or more and cannot exceed that product’s selling price.' }); return;
    }
    if (action === 'replacement' && settlementDirection === 'refund' && settlementAmount > refundableBalance + 0.01) {
      setNotice({ kind: 'error', text: `The exchange refund exceeds the remaining amount paid on this invoice (${money(refundableBalance)}). Record the excess as Khata credit instead.` }); return;
    }
    if (action === 'replacement' && settlementDirection === 'collect' && effectiveSettlementMethod === 'UPI' && (!settlementReference.trim() || !paymentConfirmed)) {
      setNotice({ kind: 'error', text: 'Confirm the UPI payment was received and enter its UTR before completing this exchange.' }); return;
    }
    if (action === 'replacement') {
      const requestedByProduct = new Map();
      resolvedReplacementLines.forEach((line) => requestedByProduct.set(String(line.productId), (requestedByProduct.get(String(line.productId)) || 0) + Number(line.quantity)));
      const hasInsufficientStock = [...requestedByProduct.entries()].some(([productId, requested]) => {
        const product = inventory.find((item) => String(item.id) === productId);
        return !product || requested > Number(product.stock || 0);
      });
      if (hasInsufficientStock) { setNotice({ kind: 'error', text: 'A replacement product does not have enough available stock for the requested quantities.' }); return; }
      const invalidImeiSelection = resolvedReplacementLines.some((line) => {
        const tracked = (line.product.imeis || []).length > 0 || (line.product.units || []).length > 0;
        return tracked && (line.imeis || []).length !== Number(line.quantity);
      });
      if (invalidImeiSelection) { setNotice({ kind: 'error', text: 'Select the required IMEI or unit for every tracked replacement quantity.' }); return; }
      const selectedReplacementCodes = resolvedReplacementLines.flatMap((line) => line.imeis || []).map(String);
      if (new Set(selectedReplacementCodes).size !== selectedReplacementCodes.length) { setNotice({ kind: 'error', text: 'The same IMEI or unit cannot be assigned to multiple replacement items.' }); return; }
    }

    returnSubmissionRef.current = true;
    const transactionDate = new Date().toISOString();
    const groupId = `RET-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const replacementRecords = action === 'replacement' ? resolvedReplacementLines.map((line) => ({
        productId: line.product.id, productName: line.product.name, category: line.product.category,
        quantity: Number(line.quantity), imeis: line.imeis || [],
        listPrice: line.listPrice,
        discountPerUnit: Math.min(line.discountPerUnit, line.listPrice),
        additionalDiscountShare: replacementSubtotal > 0 ? appliedAdditionalReplacementDiscount * (line.netUnitPrice * Number(line.quantity) / replacementSubtotal) : 0,
        unitPrice: getReplacementNetUnitPrice(line),
        unitProfit: getReplacementNetUnitPrice(line) - Number(line.product.buyPrice || 0),
        unitCost: Number(line.product.buyPrice || 0),
      })) : [];
    const replacementRecord = action === 'replacement' ? {
        ...(resolvedReplacementLines[0] ? {
          productId: resolvedReplacementLines[0].product.id,
          productName: resolvedReplacementLines[0].product.name,
          quantity: resolvedReplacementLines[0].quantity,
          imeis: resolvedReplacementLines[0].imeis || [],
          listPrice: resolvedReplacementLines[0].listPrice,
          discountPerUnit: Math.min(resolvedReplacementLines[0].discountPerUnit, resolvedReplacementLines[0].listPrice),
          additionalDiscountShare: replacementSubtotal > 0 ? appliedAdditionalReplacementDiscount * (resolvedReplacementLines[0].netUnitPrice * Number(resolvedReplacementLines[0].quantity) / replacementSubtotal) : 0,
          unitPrice: getReplacementNetUnitPrice(resolvedReplacementLines[0]),
          unitProfit: getReplacementNetUnitPrice(resolvedReplacementLines[0]) - Number(resolvedReplacementLines[0].product.buyPrice || 0),
          unitCost: Number(resolvedReplacementLines[0].product.buyPrice || 0),
        } : {}),
        quantity: resolvedReplacementLines.reduce((sum, line) => sum + Number(line.quantity), 0),
        valueDifference: replacementDelta,
      } : null;
    const transactions = selectedReturnLines.map((returnLine, linePosition) => {
      const lineAllowance = returnValue > 0 ? returnAllowance * returnLine.returnValue / returnValue : 0;
      const lineOutstandingShare = returnValue > 0 ? returnOutstandingShare * returnLine.returnValue / returnValue : 0;
      const lineOutstandingCleared = Math.min(lineOutstandingShare, lineAllowance);
      const lineCredit = Math.max(0, lineAllowance - lineOutstandingCleared);
      const item = returnLine.item;
      return {
        id: `${groupId}-${linePosition + 1}`, groupId, date: transactionDate, status: 'completed', type: action, ...(action === 'replacement' ? { replacementMode } : {}),
        originalItemIndex: Number(returnLine.index), originalProductId: item.id,
        originalProductName: item.name, originalCategory: item.category,
        replacementDiscountTotal: action === 'replacement' && linePosition === 0 ? replacementDiscountTotal : 0,
        additionalReplacementDiscount: action === 'replacement' && linePosition === 0 ? appliedAdditionalReplacementDiscount : 0,
        originalUnitProfit: Number(item.profit ?? ((Number(item.rate || 0) - Number(item.buyPrice || 0)) * Number(item.qty || 1))) / Math.max(1, Number(item.qty || 1)),
        originalUnitCost: Number(item.buyPrice || 0), quantity: returnLine.quantity,
        originalUnitPaid: returnLine.unitPaid, returnValue: returnLine.returnValue, returnAllowance: lineAllowance, allowanceReduction: Math.max(0, returnLine.returnValue - lineAllowance),
        invoicePaidAtReturn: invoicePaid, invoiceOutstandingAtReturn: invoiceOutstanding,
        outstandingCleared: lineOutstandingCleared, availableReturnCredit: lineCredit,
        allowanceReason: lineAllowance + 0.01 < returnLine.returnValue ? 'Admin-approved partial return / used item allowance' : '',
        refundAmount: action === 'refund' ? lineCredit : 0, refundMethod: action === 'refund' ? refundMethod : '',
        refundPaidAmount: action === 'refund' && refundMethod !== 'Khata (pay later)' ? lineCredit : 0,
        refundPendingAmount: action === 'refund' && refundMethod === 'Khata (pay later)' ? lineCredit : 0,
        refundStatus: action === 'refund' ? (refundMethod === 'Khata (pay later)' ? 'pending' : 'paid') : '',
        refundReference: action === 'refund' ? settlementReference.trim() : '',
        condition, restocked: Boolean(restock), returnedImeis: returnLine.returnIdentifiers,
        settlement: action === 'replacement' && linePosition === 0 ? { direction: settlementDirection, amount: settlementAmount, method: settlementDirection === 'even' ? '' : effectiveSettlementMethod, reference: settlementReference.trim(), upiAccountId: effectiveSettlementMethod === 'UPI' ? selectedUpiAccount?.id || '' : '', paymentConfirmed: settlementDirection === 'collect' && effectiveSettlementMethod === 'UPI' ? paymentConfirmed : undefined } : null,
        replacements: action === 'replacement' && linePosition === 0 ? replacementRecords : [],
        replacement: action === 'replacement' && linePosition === 0 ? replacementRecord : null,
      };
    });

    if (restock || action === 'replacement') {
      setInventory((current) => current.map((item) => {
        const returnedLines = restock ? selectedReturnLines.filter((line) => String(item.id) === String(line.item.id)) : [];
        const returnedQty = returnedLines.reduce((sum, line) => sum + line.quantity, 0);
        const returnedIdentifiers = returnedLines.flatMap(line => line.returnIdentifiers);
        const returnedUnits = returnedLines.flatMap(line => line.returnUnits || []);
        const returnedImeis = returnedUnits.flatMap(unit => [unit.imei1, unit.imei2].filter(Boolean).map(String));
        const returnedSerialNumbers = returnedUnits.map(unit => String(unit.serialNumber || '')).filter(Boolean);
        const returnedBarcodes = returnedUnits.map(unit => String(unit.barcode || '')).filter(Boolean);
        const isReturnedProduct = returnedQty > 0;
        const consumedLines = action === 'replacement' ? resolvedReplacementLines.filter(line => String(line.product.id) === String(item.id)) : [];
        if (!isReturnedProduct && !consumedLines.length) return item;
        const consumedQty = consumedLines.reduce((sum, line) => sum + Number(line.quantity), 0);
        const consumedImeis = new Set(consumedLines.flatMap(line => line.imeis || []).map(String));
        const returnedUnitEntries = isReturnedProduct ? returnedLines.flatMap(line => line.returnUnits?.length ? line.returnUnits : line.returnIdentifiers.map(identifier => {
          const isImei = (line.item?.imeis || []).map(String).includes(String(identifier));
          const isSerial = (line.item?.serialNumbers || []).map(String).includes(String(identifier));
          const isBarcode = (line.item?.barcodes || []).map(String).includes(String(identifier));
          return {
            ...(isImei ? { imei1: String(identifier) } : {}),
            ...(isSerial ? { serialNumber: String(identifier) } : {}),
            ...(isBarcode ? { barcode: String(identifier) } : {}),
            returnedFromInvoice: invoice.invoiceNo,
            status: 'In Stock'
          };
        })) : [];
        const legacyImeis = returnedLines.flatMap(line => !line.returnUnits?.length ? line.returnIdentifiers.filter(identifier => (line.item?.imeis || []).map(String).includes(String(identifier))) : []);
        const legacySerials = returnedLines.flatMap(line => !line.returnUnits?.length ? line.returnIdentifiers.filter(identifier => (line.item?.serialNumbers || []).map(String).includes(String(identifier))) : []);
        const legacyBarcodes = returnedLines.flatMap(line => !line.returnUnits?.length ? line.returnIdentifiers.filter(identifier => (line.item?.barcodes || []).map(String).includes(String(identifier))) : []);
        const remainingImeis = (item.imeis || []).filter(imei => !consumedImeis.has(String(imei)));
        const remainingSerialNumbers = (item.serialNumbers || []).filter(serial => !consumedImeis.has(String(serial)));
        const remainingBarcodes = (item.barcodes || []).filter(barcode => !consumedImeis.has(String(barcode)));
        const remainingUnits = (item.units || []).filter(unit => !consumedImeis.has(String(unit.imei1 || unit.imei2 || unit.serialNumber || unit.barcode || unit.id)));
        return {
          ...item,
          stock: Math.max(0, Number(item.stock || 0) + returnedQty - consumedQty),
          imeis: item.imeis ? [...new Set([...remainingImeis, ...returnedImeis, ...legacyImeis.map(String)])] : item.imeis,
          serialNumbers: item.serialNumbers ? [...new Set([...remainingSerialNumbers, ...returnedSerialNumbers, ...legacySerials.map(String)])] : item.serialNumbers,
          barcodes: item.barcodes ? [...new Set([...remainingBarcodes, ...returnedBarcodes, ...legacyBarcodes.map(String)])] : item.barcodes,
          units: item.units ? [...remainingUnits, ...returnedUnitEntries] : item.units,
        };
      }));
    }
    setInvoices((current) => current.map((item) => {
      if (String(item.invoiceNo || item.id) !== selectedInvoiceKey) return item;
      const returnTransactions = [...(item.returnTransactions || []), ...transactions];
      const isFullyRefunded = (item.items || []).every((line, index) => {
        const returned = returnTransactions.filter((entry) => Number(entry.originalItemIndex) === index && entry.type === 'refund' && entry.status !== 'voided')
          .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
        return returned >= Number(line.qty || 0);
      });
      const balanceDue = Math.max(0, invoiceOutstanding - outstandingCleared);
      return { ...item, returnOriginalBalanceDue: Number(item.returnOriginalBalanceDue ?? invoiceOutstanding), balanceDue, khataDue: balanceDue, returnTransactions, ...(isFullyRefunded && balanceDue <= 0 ? { status: 'REFUNDED', paymentStatus: 'REFUNDED', isCancelled: true, cancelledAt: transactionDate } : {}) };
    }));
    if (action === 'replacement' && settlementDirection === 'collect' && effectiveSettlementMethod === 'Khata due' && settlementAmount > 0) {
      const phoneDigits = String(invoice.customerPhone || '').replace(/\D/g, '').slice(-10);
      setCustomers((current) => {
        const list = Array.isArray(current) ? current : [];
        const matchIndex = list.findIndex((customer) => {
          const customerPhone = String(customer.phone || customer.mobile || '').replace(/\D/g, '').slice(-10);
          return phoneDigits ? customerPhone === phoneDigits : String(customer.name || '').trim().toLowerCase() === String(invoice.customerName || '').trim().toLowerCase();
        });
        const entry = { id: `KH-RET-${Date.now()}`, date: new Date().toISOString().slice(0, 10), amount: settlementAmount, paidAmount: 0, balanceDue: settlementAmount, description: `Return/exchange balance for ${invoice.invoiceNo}`, reference: transactions[0]?.groupId || transactions[0]?.id };
        if (matchIndex >= 0) return list.map((customer, index) => index === matchIndex ? { ...customer, balanceDue: Math.max(0, Number(customer.balanceDue || 0) - outstandingCleared) + settlementAmount, khataEntries: [...(customer.khataEntries || []), entry] } : customer);
        return [...list, { id: `CUST-${Date.now()}`, name: invoice.customerName || 'Customer', phone: invoice.customerPhone || '', address: invoice.customerAddress || '', totalSpent: 0, balanceDue: settlementAmount, khataEntries: [entry] }];
      });
    }
    setNotice({ kind: 'success', text: action === 'refund'
      ? refundMethod === 'Khata (pay later)'
        ? `${money(refundAmount)} refund kept as a pending customer Khata credit for ${invoice.invoiceNo}. Pay it when the customer collects it. ${restock ? 'Returned stock was added back.' : 'Returned items were kept out of sellable stock.'}`
        : `${money(refundAmount)} refund recorded for ${invoice.invoiceNo} (${selectedReturnLines.length} item line(s)). ${restock ? 'Returned stock was added back.' : 'Returned items were kept out of sellable stock.'}`
      : `${replacementMode === 'full-replacement' ? 'Full replacement' : replacementMode === 'partial-replacement' ? 'Partial replacement' : 'Product exchange'} recorded for ${invoice.invoiceNo} (${selectedReturnLines.length} item line(s)). ${settlementDirection === 'collect' ? `${money(settlementAmount)} to collect` : settlementDirection === 'refund' ? `${money(settlementAmount)} refund due` : 'No balance due'}. Replacement stock was deducted${restock ? ' and returned items were restocked' : ''}.` });
    setLineIndices([]); setReturnQuantities({}); setReplacementLines([]); setAdditionalReplacementDiscount(0); setRestock(false);
  };

  const markKhataRefundPaid = (targetInvoice, targetEntry) => {
    const groupId = targetEntry.groupId || targetEntry.id;
    const pendingAmount = (targetInvoice.returnTransactions || [])
      .filter((entry) => entry.status !== 'voided' && (entry.groupId || entry.id) === groupId)
      .reduce((sum, entry) => sum + Math.max(0, Number(entry.refundPendingAmount) || 0), 0);
    if (!pendingAmount || !window.confirm(`Confirm that the pending Khata refund of ${money(pendingAmount)} was paid to ${targetInvoice.customerName || 'the customer'}?`)) return;
    const paidAt = new Date().toISOString();
    setInvoices((current) => current.map((item) => {
      if (String(item.invoiceNo || item.id) !== String(targetInvoice.invoiceNo || targetInvoice.id)) return item;
      return {
        ...item,
        returnTransactions: (item.returnTransactions || []).map((entry) => (entry.groupId || entry.id) === groupId && Number(entry.refundPendingAmount) > 0
          ? { ...entry, refundPaidAmount: Number(entry.refundPaidAmount || 0) + Number(entry.refundPendingAmount), refundPendingAmount: 0, refundStatus: 'paid', refundPaidDate: paidAt, refundPaidMethod: 'Admin recorded payment' }
          : entry)
      };
    }));
    setNotice({ kind: 'success', text: `Khata refund of ${money(pendingAmount)} marked as paid for ${targetInvoice.invoiceNo || targetInvoice.id}.` });
  };

  const inputStyle = { width: '100%', minHeight: 42, border: '1px solid #cbd8d3', borderRadius: 9, padding: '0.6rem 0.75rem', background: '#fff', color: '#17352d', boxSizing: 'border-box' };
  const cardStyle = { background: '#fff', border: '1px solid #d5e1dc', borderRadius: 14, padding: '1rem', boxShadow: '0 3px 12px rgba(15,37,30,.04)' };

  return <section style={{ maxWidth: 1440, margin: '0 auto', padding: '1rem', color: '#17352d' }}>
    <header style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#e5f5ec', color: '#087452' }}><RotateCcw size={21} /></div>
      <div><h1 style={{ margin: 0, fontSize: 22 }}>Returns & Replacements</h1><p style={{ margin: '4px 0 0', color: '#667a73' }}>Find the original invoice, select returned items, then issue a refund or replacement.</p></div>
    </header>

    {notice && <div role="status" style={{ ...cardStyle, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 9, color: notice.kind === 'error' ? '#b42318' : '#087452' }}>
      {notice.kind === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}{notice.text}
    </div>}

    <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button onClick={() => setPageView('process')} style={{ ...inputStyle, width: 'auto', cursor: 'pointer', fontWeight: 800, color: pageView === 'process' ? '#fff' : '#17352d', background: pageView === 'process' ? '#08634d' : '#fff' }}>Process return / exchange</button>
      <button onClick={() => setPageView('history')} style={{ ...inputStyle, width: 'auto', cursor: 'pointer', fontWeight: 800, color: pageView === 'history' ? '#fff' : '#17352d', background: pageView === 'history' ? '#08634d' : '#fff' }}>Returned & replaced invoices ({returnHistory.length})</button>
    </div>

    {pageView === 'history' ? <div style={cardStyle}>
      <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>Return & replacement register</h2>
      <p style={{ margin: '0 0 12px', color: '#667a73', fontSize: 13 }}>Completed refunds, full replacements, partial replacements, and product exchanges across all invoices.</p>
      <div style={{ position: 'relative', marginBottom: 12 }}><Search size={17} style={{ position: 'absolute', top: 12, left: 11, color: '#70847c' }} /><input style={{ ...inputStyle, paddingLeft: 36 }} value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search invoice, customer, product, or exchange type" /></div>
      {returnHistory.length ? returnHistory.map(({ invoice: item, entry }) => <article key={`${item.invoiceNo || item.id}-${entry.id}`} style={{ padding: 13, border: '1px solid #e1eae6', borderRadius: 11, marginBottom: 9, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'center' }}>
        <div><strong>{item.invoiceNo || item.id} · {entry.type === 'refund' ? 'Refund' : entry.replacementMode === 'full-replacement' ? 'Full replacement' : entry.replacementMode === 'partial-replacement' ? 'Partial replacement' : 'Product exchange'}</strong><div style={{ color: '#667a73', fontSize: 13, marginTop: 4 }}>{item.customerName || 'Counter Customer'}{item.customerPhone ? ` · ${item.customerPhone}` : ''} · {new Date(entry.date || 0).toLocaleString()}</div><div style={{ marginTop: 5, fontSize: 13 }}>Returned: {entry.originalProductName} × {entry.quantity}{entry.type === 'replacement' ? ` · Replaced with: ${describeReplacement(entry) || '—'}` : ''}</div><small style={{ color: '#667a73' }}>{entry.restocked ? 'Returned item restocked' : 'Returned item not restocked'} · {entry.condition || 'Condition not recorded'}</small></div>
        <div style={{ display: 'grid', justifyItems: 'end', gap: 6 }}><strong style={{ textAlign: 'right', color: entry.refundPendingAmount > 0 || entry.settlement?.direction === 'collect' ? '#a35d00' : '#087452' }}>{entry.type === 'refund' ? entry.refundPendingAmount > 0 ? `Khata refund pending ${money(entry.refundPendingAmount)}` : `Refund ${money(entry.refundAmount)}` : entry.settlement?.direction === 'collect' ? `Collect ${money(entry.settlement.amount)}` : entry.settlement?.direction === 'refund' ? `Refund ${money(entry.settlement.amount)}` : 'Settled even'}</strong>{entry.refundPendingAmount > 0 && <button type="button" onClick={() => markKhataRefundPaid(item, entry)} style={{ ...inputStyle, minHeight: 34, padding: '0.35rem 0.6rem', width: 'auto', cursor: 'pointer', color: '#fff', background: '#08634d', fontWeight: 700 }}>Mark refund paid</button>}</div>
      </article>) : <div style={{ padding: 28, textAlign: 'center', color: '#71837c' }}>No completed return or replacement records found.</div>}
    </div> : <div className="returns-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(0, 1.6fr)', gap: 16, alignItems: 'start' }}>

      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>1. Find invoice</h2>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Invoice ID, customer name or phone</label>
        <div style={{ position: 'relative' }}><Search size={17} style={{ position: 'absolute', top: 12, left: 11, color: '#70847c' }} /><input style={{ ...inputStyle, paddingLeft: 36 }} value={invoiceQuery} onChange={(event) => { setInvoiceQuery(event.target.value); setSelectedInvoiceKey(''); }} placeholder="e.g. ALZ-000123" /></div>
        {invoiceQuery && !invoice && <div style={{ border: '1px solid #d5e1dc', borderRadius: 10, marginTop: 8, maxHeight: 300, overflow: 'auto' }}>
          {matchingInvoices.length ? matchingInvoices.map((item, index) => <button key={`${item.invoiceNo || item.id}-${index}`} onClick={() => selectInvoice(item)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 0, borderBottom: '1px solid #edf1ef', background: '#fff', cursor: 'pointer', color: '#17352d' }}>
            <strong>{item.invoiceNo || item.id}</strong><div style={{ fontSize: 12, color: '#667a73', marginTop: 3 }}>{item.customerName || 'Counter Customer'} · {new Date(item.date || Date.now()).toLocaleDateString()} · {money(item.grandTotal)}</div>
          </button>) : <div style={{ padding: 12, color: '#71837c', fontSize: 13 }}>No invoices match this search.</div>}
        </div>}
        {invoice && <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: '#f3f7f5' }}>
          <div style={{ fontWeight: 800 }}>{invoice.invoiceNo || invoice.id}</div><div style={{ fontSize: 13, marginTop: 4 }}>{invoice.customerName || 'Counter Customer'}{invoice.customerPhone ? ` · ${invoice.customerPhone}` : ''}</div>
          <div style={{ fontSize: 12, color: '#667a73', marginTop: 4 }}>Invoice total {money(invoice.grandTotal)} · Paid {money(invoicePaid)} · Khata pending {money(invoiceOutstanding)}</div>
          {invoice.isCancelled || invoice.status === 'REFUNDED' ? <p style={{ color: '#b42318', fontWeight: 700, marginBottom: 0 }}>This invoice is already cancelled or fully refunded.</p> : null}
        </div>}
        <p style={{ color: '#71837c', fontSize: 12, lineHeight: 1.5, marginBottom: 0 }}>Completed returns remain attached to the invoice for audit and sync with the existing invoice records.</p>
      </div>

      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>2. Choose returned item</h2>
        {!invoice ? <div style={{ padding: '30px 10px', textAlign: 'center', color: '#71837c' }}>Search and select an invoice to continue.</div> : <>
          <p style={{ margin: '0 0 10px', color: '#667a73', fontSize: 12 }}>Select one or more products from this invoice. You can set a return quantity for each selected product.</p>
          {invoiceItems.map((item, index) => {
            const remaining = availableQty(index);
            const selected = lineIndices.includes(index);
            const itemTotalPaid = Number(item.total ?? (Number(item.rate || 0) * Number(item.qty || 1))) * invoiceNetScale;
            const currentQuantity = Math.min(remaining, Math.max(1, Number(returnQuantities[index]) || 1));
            return <article key={`${item.id || item.name}-${index}`} style={{ border: `1px solid ${selected ? '#07835d' : '#d5e1dc'}`, borderRadius: 10, padding: 11, marginBottom: 8, background: selected ? '#eff9f4' : '#fff', color: '#17352d', opacity: remaining ? 1 : .6 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: remaining && !invoice.isCancelled && invoice.status !== 'REFUNDED' ? 'pointer' : 'not-allowed' }}>
                <input type="checkbox" checked={selected} disabled={remaining < 1 || invoice.isCancelled || invoice.status === 'REFUNDED'} onChange={() => {
                  setLineIndices(current => selected ? current.filter(value => value !== index) : [...current, index]);
                  setReturnQuantities(current => selected ? Object.fromEntries(Object.entries(current).filter(([key]) => Number(key) !== index)) : { ...current, [index]: 1 });
                  setSelectedReturnIdentifiers(current => {
                    if (!selected) return current;
                    const next = { ...current }; delete next[index]; return next;
                  });
                  setReturnAllowanceInput(''); setSettlementReference(''); setPaymentConfirmed(false); setAdditionalReplacementDiscount(0); setNotice(null);
                }} style={{ marginTop: 3 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>{item.name || 'Product'}</strong><span style={{ fontSize: 12, color: remaining ? '#087452' : '#a0433a', whiteSpace: 'nowrap' }}>{remaining} returnable / {item.qty || 0}</span></span>
                  <span style={{ display: 'block', color: '#667a73', fontSize: 12, marginTop: 3 }}>Line value {money(itemTotalPaid)} · {money(itemTotalPaid / Math.max(1, Number(item.qty || 1)))} each</span>
                </span>
              </label>
              {selected && <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 0 24px', fontSize: 12, fontWeight: 700 }}>Return quantity
                <input style={{ ...inputStyle, width: 100, minHeight: 36 }} type="number" min="1" max={remaining} value={currentQuantity} disabled={action === 'replacement' && replacementMode === 'full-replacement'} onChange={event => {
                  const nextQuantity = Math.min(remaining || 1, Math.max(1, Number(event.target.value) || 1));
                  setReturnQuantities(current => ({ ...current, [index]: nextQuantity }));
                  setSelectedReturnIdentifiers(current => ({ ...current, [index]: (current[index] || []).slice(0, nextQuantity) }));
                }} />
                {action === 'replacement' && replacementMode === 'full-replacement' && <small style={{ color: '#667a73', fontWeight: 500 }}>All {remaining} remaining units</small>}
              </label>}
              {selected && getInvoiceUnitCodes(item).length > 0 && <div style={{ margin: '10px 0 0 24px' }}>
                <strong style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Select the IMEI / serial being returned ({(selectedReturnIdentifiers[index] || []).length}/{currentQuantity})</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(() => {
                    const priorEntries = (invoice?.returnTransactions || []).filter((entry) => Number(entry.originalItemIndex) === index && entry.status !== 'voided');
                    const codes = getInvoiceUnitCodes(item);
                    const explicit = priorEntries.flatMap((entry) => Array.isArray(entry.returnedImeis) ? entry.returnedImeis.map(String) : []);
                    const legacyCount = priorEntries.filter((entry) => !Array.isArray(entry.returnedImeis) || !entry.returnedImeis.length).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
                    const excluded = new Set([...explicit, ...codes.slice(0, legacyCount)]);
                    return codes.filter((code) => !excluded.has(code)).map((code) => {
                      const checked = (selectedReturnIdentifiers[index] || []).includes(code);
                      const atLimit = (selectedReturnIdentifiers[index] || []).length >= currentQuantity;
                      return <label key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #d5e1dc', borderRadius: 6, padding: '4px 7px', fontSize: 11, background: checked ? '#e7f5ef' : '#fff' }}>
                        <input type="checkbox" checked={checked} disabled={!checked && atLimit} onChange={() => setSelectedReturnIdentifiers((current) => {
                          const chosen = current[index] || [];
                          return { ...current, [index]: checked ? chosen.filter((value) => value !== code) : [...chosen, code] };
                        })} />
                        {code}
                      </label>;
                    });
                  })()}
                </div>
              </div>}
            </article>;
          })}

          {selectedReturnLines.length > 0 && <div style={{ borderTop: '1px solid #e4ece8', paddingTop: 14, marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, padding: '10px 0' }}>Selected items: {selectedReturnLines.length} · Return quantity: {selectedReturnLines.reduce((sum, line) => sum + line.quantity, 0)}</div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Condition<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={condition} onChange={(event) => { setCondition(event.target.value); if (event.target.value === 'damaged') setRestock(false); }}><option value="good">Good / sellable</option><option value="damaged">Damaged / inspect</option></select></label>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: 11, margin: '12px 0', border: '1px solid #d5e1dc', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={restock} onChange={(event) => setRestock(event.target.checked)} style={{ marginTop: 3 }} />
              <span><strong style={{ fontSize: 13 }}>Add returned item back to stock</strong><small style={{ display: 'block', color: '#667a73', marginTop: 3 }}>Leave unchecked for damaged or unsellable goods. Returned IMEIs will be restored when available on the invoice.</small></span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, padding: 10, margin: '10px 0', borderRadius: 9, background: '#f3f7f5', fontSize: 12 }}>
              <span>Invoice paid<strong style={{ display: 'block', marginTop: 3 }}>{money(invoicePaid)}</strong></span>
              <span>Khata pending<strong style={{ display: 'block', marginTop: 3, color: invoiceOutstanding ? '#a35d00' : '#087452' }}>{money(invoiceOutstanding)}</strong></span>
              <span>Pending share for returned units<strong style={{ display: 'block', marginTop: 3 }}>{money(returnOutstandingShare)}</strong></span>
              <span>Allowance applied to Khata<strong style={{ display: 'block', marginTop: 3 }}>{money(outstandingCleared)}</strong></span>
              <span>Credit left for refund / exchange<strong style={{ display: 'block', marginTop: 3, color: '#087452' }}>{money(availableReturnCredit)}</strong></span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8, marginBottom: 12 }}>
              <button onClick={() => { setAction('refund'); setReplacementLines([]); setAdditionalReplacementDiscount(0); }} style={{ ...inputStyle, cursor: 'pointer', borderColor: action === 'refund' ? '#087452' : '#d5e1dc', background: action === 'refund' ? '#e9f7f0' : '#fff', fontWeight: 700 }}><CircleDollarSign size={16} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Full refund</button>
              {[
                ['full-replacement', 'Full replacement'],
                ['partial-replacement', 'Partial replacement'],
                ['product-exchange', 'Product exchange'],
              ].map(([mode, label]) => <button key={mode} disabled={mode === 'partial-replacement' && selectedReturnLines.some(line => line.maxQty < 2)} title={mode === 'partial-replacement' && selectedReturnLines.some(line => line.maxQty < 2) ? 'At least one selected line has no smaller partial quantity available.' : undefined} onClick={() => {
                setAction('replacement'); setReplacementMode(mode);
                if (!replacementLines.length) setReplacementLines([{ rowId: `replacement-${Date.now()}`, productId: '', quantity: 1, imeis: [], discountPerUnit: 0 }]);
                if (mode === 'full-replacement') setReturnQuantities(Object.fromEntries(selectedReturnLines.map(line => [line.index, line.maxQty])));
                else if (mode === 'partial-replacement') setReturnQuantities(Object.fromEntries(selectedReturnLines.map(line => [line.index, Math.min(line.quantity, Math.max(1, line.maxQty - 1))])));
              }} style={{ ...inputStyle, cursor: mode === 'partial-replacement' && selectedReturnLines.some(line => line.maxQty < 2) ? 'not-allowed' : 'pointer', opacity: mode === 'partial-replacement' && selectedReturnLines.some(line => line.maxQty < 2) ? 0.5 : 1, borderColor: action === 'replacement' && replacementMode === mode ? '#087452' : '#d5e1dc', background: action === 'replacement' && replacementMode === mode ? '#e9f7f0' : '#fff', fontWeight: 700 }}><PackageCheck size={16} style={{ verticalAlign: 'middle', marginRight: 5 }} />{label}</button>)}
            </div>
            {action === 'refund' ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, alignItems: 'end' }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Refund amount / approved allowance (₹)<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} type="number" min="0" max={returnValue} step="0.01" value={returnAllowanceInput === '' ? returnValue : returnAllowanceInput} onChange={(event) => setReturnAllowanceInput(event.target.value)} /><small style={{ color: '#667a73' }}>Returned line value: {money(returnValue)}. Enter a lower amount for a partial refund; any unpaid Khata share is cleared first.</small></label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Refund method<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={refundMethod} onChange={(event) => setRefundMethod(event.target.value)}><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Khata (pay later)</option></select>{refundMethod === 'Khata (pay later)' && <small style={{ display: 'block', marginTop: 4, color: '#a35d00' }}>This amount will be recorded as pending for the customer to collect later.</small>}</label>
              {refundMethod === 'UPI' && <label style={{ fontSize: 12, fontWeight: 700 }}>Refund UTR / transfer reference<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={settlementReference} onChange={(event) => setSettlementReference(event.target.value)} placeholder="Enter transfer reference" /></label>}
              <div style={{ padding: 10, background: refundMethod === 'Khata (pay later)' ? '#fff8e8' : '#f3f7f5', borderRadius: 9 }}><small style={{ color: '#667a73' }}>{refundMethod === 'Khata (pay later)' ? 'Customer Khata refund pending' : 'Refund to customer'}</small><strong style={{ display: 'block', fontSize: 20, color: refundMethod === 'Khata (pay later)' ? '#a35d00' : '#087452', marginTop: 2 }}>{money(refundAmount)}</strong></div>
            </div> : <div style={{ display: 'grid', gap: 10 }}>
              <p style={{ margin: '0 0 2px', color: '#667a73', fontSize: 13 }}>{replacementMode === 'full-replacement' ? 'Replace all remaining units on each selected invoice line.' : replacementMode === 'partial-replacement' ? 'Return only the quantity selected for each line; the remaining units stay on the original invoice.' : 'Exchange the selected returned items for one or more products from stock.'}</p>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Approved return / exchange allowance (₹)<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} type="number" min="0" max={returnValue} step="0.01" value={returnAllowanceInput === '' ? returnValue : returnAllowanceInput} onChange={(event) => setReturnAllowanceInput(event.target.value)} /><small style={{ color: '#667a73' }}>Returned line value: {money(returnValue)}. Reduce this for a used / depreciated item. Unpaid Khata is carried into the new balance; available credit updates below.</small></label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Search replacement stock<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={replacementProductQuery} onChange={(event) => setReplacementProductQuery(event.target.value)} placeholder="Search product, model, barcode or brand" /><small style={{ display: 'block', color: '#667a73', marginTop: 4 }}>{matchingStockProducts.length} in-stock result(s). Supplier, buy cost, sell price and stock appear in product choices.</small></label>
              {resolvedReplacementLines.map((line) => {
                const otherQty = replacementLines.filter((other) => other.rowId !== line.rowId && String(other.productId) === String(line.productId)).reduce((sum, other) => sum + Number(other.quantity || 0), 0);
                const maxAvailable = Number(line.product?.stock || 0) - otherQty;
                const isTracked = line.product && ((line.product.imeis || []).length > 0 || (line.product.units || []).length > 0);
                const availableImeiOptions = line.product ? [
                  ...(line.product.units || []).map((unit) => ({ value: String(unit.imei1 || unit.imei2 || unit.barcode || unit.id || ''), label: `${unit.imei1 || unit.imei2 || unit.barcode || unit.id || ''}${unit.color ? ` · ${unit.color}` : ''}` })).filter((option) => option.value),
                  ...(line.product.imeis || []).filter((imei) => !(line.product.units || []).some((unit) => [unit.imei1, unit.imei2, unit.barcode, unit.id].includes(imei))).map((imei) => ({ value: String(imei), label: String(imei) })),
                ] : [];
                return <div key={line.rowId} className="replacement-product-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 2fr) minmax(70px, .6fr) minmax(105px, .9fr) auto', gap: 8, alignItems: 'end', padding: 10, background: '#f7faf8', border: '1px solid #dfe9e4', borderRadius: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Product<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={line.productId} onChange={(event) => setReplacementLines((current) => current.map((entry) => entry.rowId === line.rowId ? { ...entry, productId: event.target.value, quantity: 1, imeis: [], discountPerUnit: 0 } : entry))}><option value="">Choose stock product</option>{[...matchingStockProducts, ...(line.product && !matchingStockProducts.some((product) => String(product.id) === String(line.product.id)) ? [line.product] : [])].map((product) => { const source = getProductSourceSummary(product); return <option key={product.id} value={product.id}>{product.name} · {product.stock} left · supplier {source.suppliers.join(', ') || product.supplierName || '—'} · buy {money(source.cost)} · sell {money(product.sellPrice ?? product.price)}</option>; })}</select></label>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Qty<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} type="number" min="1" max={Math.max(1, maxAvailable)} value={line.quantity} onChange={(event) => setReplacementLines((current) => current.map((entry) => entry.rowId === line.rowId ? { ...entry, quantity: Math.min(Math.max(1, maxAvailable), Math.max(1, Number(event.target.value) || 1)), imeis: (entry.imeis || []).slice(0, Math.max(1, Number(event.target.value) || 1)) } : entry))} /></label>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Discount / unit (₹)<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} type="number" min="0" max={line.listPrice} step="0.01" value={line.discountPerUnit ?? 0} disabled={!line.product} onChange={(event) => setReplacementLines((current) => current.map((entry) => entry.rowId === line.rowId ? { ...entry, discountPerUnit: Math.min(line.listPrice, Math.max(0, Number(event.target.value) || 0)) } : entry))} /></label>
                  <button type="button" aria-label="Remove replacement product" onClick={() => setReplacementLines((current) => current.filter((entry) => entry.rowId !== line.rowId))} style={{ ...inputStyle, width: 44, color: '#a33224', cursor: 'pointer' }}>×</button>
                  {isTracked && <label style={{ gridColumn: '1 / -1', fontSize: 12, fontWeight: 700 }}>Select {line.quantity} replacement IMEI / unit<select multiple style={{ ...inputStyle, display: 'block', marginTop: 5, minHeight: 84 }} value={line.imeis || []} onChange={(event) => { const values = Array.from(event.target.selectedOptions, (option) => option.value).slice(0, Number(line.quantity)); setReplacementLines((current) => current.map((entry) => entry.rowId === line.rowId ? { ...entry, imeis: values } : entry)); }}>{availableImeiOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small style={{ color: '#667a73' }}>Hold Ctrl or Command to select multiple units.</small></label>}
                  {line.product && <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#61756d' }}>{line.product.name}: {money(line.listPrice)} − {money(Math.min(line.discountPerUnit, line.listPrice))} discount = <strong>{money(line.netUnitPrice)} each × {line.quantity} = {money(line.netUnitPrice * Number(line.quantity))}</strong><div style={{ marginTop: 4 }}>Supplier: <strong>{getProductSourceSummary(line.product).suppliers.join(', ') || line.product.supplierName || 'Not recorded'}</strong> · Buy cost: <strong>{money(getProductSourceSummary(line.product).cost)}</strong> · Available stock: <strong>{Number(line.product.stock || 0)}</strong></div></div>}
                </div>;
              })}
              <button type="button" onClick={() => setReplacementLines((current) => [...current, { rowId: `replacement-${Date.now()}-${current.length}`, productId: '', quantity: 1, imeis: [], discountPerUnit: 0 }])} style={{ ...inputStyle, cursor: 'pointer', background: '#fff', fontWeight: 700 }}>+ Add another replacement product</button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, padding: 12, background: '#edf6f1', borderRadius: 10, alignItems: 'center' }}>
                <span>Return value<strong style={{ display: 'block', marginTop: 4 }}>{money(returnValue)}</strong></span>
                <span>Approved allowance<strong style={{ display: 'block', marginTop: 4 }}>{money(returnAllowance)}</strong></span>
                <span>Less Khata cleared<strong style={{ display: 'block', marginTop: 4 }}>{money(outstandingCleared)}</strong></span>
                <span>Credit applied to replacement<strong style={{ display: 'block', marginTop: 4 }}>{money(availableReturnCredit)}</strong></span>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Extra discount on replacement (₹)<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} type="number" min="0" max={replacementSubtotal} step="0.01" value={appliedAdditionalReplacementDiscount} disabled={!replacementSubtotal} onChange={(event) => setAdditionalReplacementDiscount(Math.min(replacementSubtotal, Math.max(0, Number(event.target.value) || 0)))} /><small style={{ display: 'block', marginTop: 3, color: '#667a73' }}>In addition to per-product discounts</small><strong style={{ display: 'block', marginTop: 3 }}>Total discount: {money(replacementDiscountTotal)}</strong></label>
                <span>Replacement total<strong style={{ display: 'block', marginTop: 4 }}>{money(replacementTotal)}</strong></span>
                <span>{settlementDirection === 'collect' ? 'Collect from customer' : settlementDirection === 'refund' ? 'Refund to customer' : 'Balance'}<strong style={{ display: 'block', marginTop: 4, color: settlementDirection === 'even' ? '#087452' : '#a35d00' }}>{money(settlementAmount)}</strong></span>
              </div>
              {settlementDirection !== 'even' && <label style={{ fontSize: 12, fontWeight: 700 }}>{settlementDirection === 'collect' ? 'Collect / record difference by' : 'Refund / credit difference by'}<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={effectiveSettlementMethod} onChange={(event) => setSettlementMethod(event.target.value)}>{exchangeSettlementOptions.map((method) => <option key={method}>{method}</option>)}</select></label>}
              {settlementDirection === 'collect' && effectiveSettlementMethod === 'UPI' && <div style={{ padding: 12, border: '1px solid #d5e1dc', borderRadius: 10, background: '#f7faf8' }}>
                {upiAccounts.length > 1 && <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Receive payment into<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={selectedUpiAccount?.id || ''} onChange={(event) => setSelectedUpiAccountId(event.target.value)}>{upiAccounts.map((account, index) => <option key={account.id || index} value={account.id || ''}>{account.bankName || account.accountName || 'UPI account'} · {account.upiId}</option>)}</select></label>}
                {selectedUpiAccount && <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><img src={getUpiQrUrl(selectedUpiAccount.upiId, selectedUpiAccount.accountName || shopConfig.name || 'ALZINO', settlementAmount, `${invoice?.invoiceNo || 'RETURN'}-EXCHANGE`)} alt={`UPI QR for ${money(settlementAmount)}`} width="120" height="120" style={{ objectFit: 'contain', background: '#fff', border: '1px solid #e1eae6', borderRadius: 8 }} /><div><strong>Collect {money(settlementAmount)} by UPI</strong><div style={{ fontSize: 12, color: '#667a73', marginTop: 4 }}>{selectedUpiAccount.bankName || selectedUpiAccount.accountName || 'Shop account'} · {selectedUpiAccount.upiId}</div></div></div>}
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 8 }}>UPI UTR / transaction reference<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={settlementReference} onChange={(event) => setSettlementReference(event.target.value)} placeholder="Enter UTR after payment is received" /></label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12 }}><input type="checkbox" checked={paymentConfirmed} onChange={(event) => setPaymentConfirmed(event.target.checked)} />I verified the payment arrived in the selected shop account.</label>
              </div>}
            </div>}
            <button onClick={completeReturn} disabled={invoice.isCancelled || invoice.status === 'REFUNDED'} style={{ ...inputStyle, marginTop: 14, border: 0, background: '#08634d', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><RefreshCw size={17} /> Complete {action === 'refund' ? 'refund' : 'replacement'}</button>
          </div>}
        </>}
      </div>
    </div>}

    {invoice?.returnTransactions?.length > 0 && <div style={{ ...cardStyle, marginTop: 16 }}><h2 style={{ margin: '0 0 10px', fontSize: 16 }}>Return history · {invoice.invoiceNo}</h2>{invoice.returnTransactions.map((entry) => <div key={entry.id} style={{ padding: '10px 0', borderTop: '1px solid #edf1ef', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><span><strong>{entry.type === 'refund' ? 'Refund' : 'Replacement'} · {entry.originalProductName}</strong><small style={{ display: 'block', color: '#667a73', marginTop: 3 }}>{new Date(entry.date).toLocaleString()} · Qty {entry.quantity} · {entry.condition}{entry.restocked ? ' · restocked' : ' · not restocked'}{entry.type === 'replacement' ? ` · replacement: ${describeReplacement(entry)}${entry.replacementDiscountTotal ? ` · total discount ${money(entry.replacementDiscountTotal)}` : ''}` : ''}</small></span><strong>{entry.type === 'refund' ? money(entry.refundAmount) : entry.settlement?.direction === 'collect' ? `Collected / due ${money(entry.settlement.amount)}` : entry.settlement?.direction === 'refund' ? `Refunded / credited ${money(entry.settlement.amount)}` : 'Even exchange'}</strong></div>)}</div>}
    <style>{`@media(max-width:760px){.returns-layout{grid-template-columns:1fr!important}.replacement-product-row{grid-template-columns:minmax(0,1fr) minmax(75px,.75fr) auto!important}.replacement-product-row>label:first-child{grid-column:1/-1}}`}</style>
  </section>;
}
