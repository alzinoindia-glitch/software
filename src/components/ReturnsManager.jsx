import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign, PackageCheck, RefreshCw, Search, RotateCcw } from 'lucide-react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const describeReplacement = (entry) => (entry.replacements || (entry.replacement ? [entry.replacement] : []))
  .map((item) => `${item.productName} × ${item.quantity}${Number(item.discountPerUnit || 0) > 0 ? ` (${money(item.discountPerUnit)} discount each)` : ''}`).join(', ');

export default function ReturnsManager({ invoices = [], setInvoices, inventory = [], setInventory }) {
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [selectedInvoiceKey, setSelectedInvoiceKey] = useState('');
  const [lineIndex, setLineIndex] = useState('');
  const [quantity, setQuantity] = useState(1);
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
  const [notice, setNotice] = useState(null);

  const matchingInvoices = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();
    if (!q) return [];
    return invoices.filter((invoice) => [invoice.invoiceNo, invoice.customerName, invoice.customerPhone]
      .some((value) => String(value || '').toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 12);
  }, [invoices, invoiceQuery]);
  const invoice = invoices.find((item) => String(item.invoiceNo || item.id) === selectedInvoiceKey) || null;
  const invoiceItems = invoice?.items || [];
  const availableQty = (index) => {
    const sold = Number(invoiceItems[index]?.qty || 0);
    const already = (invoice?.returnTransactions || []).filter((entry) => Number(entry.originalItemIndex) === index && entry.status !== 'voided')
      .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    return Math.max(0, sold - already);
  };
  const selectedLine = lineIndex === '' ? null : invoiceItems[Number(lineIndex)];
  const maxQty = lineIndex === '' ? 0 : availableQty(Number(lineIndex));
  const inStockProducts = inventory.filter((item) => Number(item.stock || 0) > 0);
  const invoiceLineGross = invoiceItems.reduce((sum, item) => sum + Number(item.total ?? (Number(item.rate || 0) * Number(item.qty || 1))), 0);
  const invoiceNetScale = invoice && invoiceLineGross > 0 ? Math.min(1, Number(invoice.grandTotal ?? invoiceLineGross) / invoiceLineGross) : 1;
  const lineUnitPaid = selectedLine
    ? Number(selectedLine.total ?? (Number(selectedLine.rate || 0) * Number(selectedLine.qty || 1))) * invoiceNetScale / Math.max(1, Number(selectedLine.qty || 1))
    : 0;
  const returnValue = lineUnitPaid * Number(quantity || 0);
  const refundAmount = action === 'refund' ? returnValue : 0;
  const refundableBalance = invoice
    ? Math.max(0, Number(invoice.paidAmount ?? invoice.grandTotal ?? 0) - (invoice.returnTransactions || [])
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
  const replacementDelta = replacementTotal - returnValue;
  const settlementAmount = Math.abs(replacementDelta);
  const settlementDirection = replacementDelta > 0 ? 'collect' : replacementDelta < 0 ? 'refund' : 'even';
  const exchangeSettlementOptions = settlementDirection === 'collect' ? ['Cash', 'UPI', 'Card', 'Khata due'] : ['Cash', 'UPI', 'Bank transfer', 'Khata credit'];
  const effectiveSettlementMethod = exchangeSettlementOptions.includes(settlementMethod) ? settlementMethod : exchangeSettlementOptions[0];
  const returnHistory = useMemo(() => invoices.flatMap((item) => (item.returnTransactions || [])
    .filter((entry) => entry.status !== 'voided')
    .map((entry) => ({ invoice: item, entry })))
    .filter(({ invoice: item, entry }) => [item.invoiceNo, item.customerName, item.customerPhone, entry.originalProductName, entry.type, entry.replacementMode, describeReplacement(entry)]
      .some((value) => String(value || '').toLowerCase().includes(historyQuery.trim().toLowerCase())))
    .sort((a, b) => new Date(b.entry.date || 0) - new Date(a.entry.date || 0)), [invoices, historyQuery]);

  const selectInvoice = (item) => {
    setSelectedInvoiceKey(String(item.invoiceNo || item.id));
    setInvoiceQuery(String(item.invoiceNo || item.id));
    setLineIndex(''); setNotice(null); setReplacementLines([]); setAdditionalReplacementDiscount(0); setAction('refund');
  };

  const completeReturn = () => {
    if (!invoice || !selectedLine || maxQty < 1 || Number(quantity) < 1 || Number(quantity) > maxQty) {
      setNotice({ kind: 'error', text: 'Choose an invoice line and a quantity that has not already been returned.' }); return;
    }
    if (action === 'refund' && refundAmount > refundableBalance + 0.01) {
      setNotice({ kind: 'error', text: `Refund exceeds the remaining amount paid on this invoice (${money(refundableBalance)}). Apply any unpaid balance as Khata credit instead.` }); return;
    }
    if (action === 'replacement' && (!replacementLines.length || resolvedReplacementLines.some((line) => !line.product || Number(line.quantity) < 1))) {
      setNotice({ kind: 'error', text: 'Add at least one replacement product and set a valid quantity.' }); return;
    }
    if (action === 'replacement' && replacementMode === 'full-replacement' && Number(quantity) !== maxQty) {
      setNotice({ kind: 'error', text: 'A full replacement must include every remaining unit on this invoice line.' }); return;
    }
    if (action === 'replacement' && replacementMode === 'partial-replacement' && Number(quantity) >= maxQty) {
      setNotice({ kind: 'error', text: 'Partial replacement quantity must be less than the remaining quantity. Choose full replacement to return all remaining units.' }); return;
    }
    if (action === 'replacement' && resolvedReplacementLines.some((line) => !Number.isFinite(line.discountPerUnit) || line.discountPerUnit < 0 || line.discountPerUnit > line.listPrice)) {
      setNotice({ kind: 'error', text: 'Each replacement discount must be zero or more and cannot exceed that product’s selling price.' }); return;
    }
    if (action === 'replacement' && settlementDirection === 'refund' && settlementAmount > refundableBalance + 0.01) {
      setNotice({ kind: 'error', text: `The exchange refund exceeds the remaining amount paid on this invoice (${money(refundableBalance)}). Record the excess as Khata credit instead.` }); return;
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

    const returnedImeis = (selectedLine.imeis || []).slice(0, Number(quantity));
    const transaction = {
      id: `RET-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(), status: 'completed', type: action, ...(action === 'replacement' ? { replacementMode } : {}),
      originalItemIndex: Number(lineIndex), originalProductId: selectedLine.id,
      originalProductName: selectedLine.name, originalCategory: selectedLine.category,
      replacementDiscountTotal: action === 'replacement' ? replacementDiscountTotal : 0,
      additionalReplacementDiscount: action === 'replacement' ? appliedAdditionalReplacementDiscount : 0,
      originalUnitProfit: Number(selectedLine.profit ?? ((Number(selectedLine.rate || 0) - Number(selectedLine.buyPrice || 0)) * Number(selectedLine.qty || 1))) / Math.max(1, Number(selectedLine.qty || 1)),
      originalUnitCost: Number(selectedLine.buyPrice || 0), quantity: Number(quantity),
      originalUnitPaid: lineUnitPaid, refundAmount, refundMethod: action === 'refund' ? refundMethod : '',
      condition, restocked: Boolean(restock), returnedImeis,
      settlement: action === 'replacement' ? { direction: settlementDirection, amount: settlementAmount, method: settlementDirection === 'even' ? '' : effectiveSettlementMethod } : null,
      replacements: action === 'replacement' ? resolvedReplacementLines.map((line) => ({
        productId: line.product.id, productName: line.product.name, category: line.product.category,
        quantity: Number(line.quantity), imeis: line.imeis || [],
        listPrice: line.listPrice,
        discountPerUnit: Math.min(line.discountPerUnit, line.listPrice),
        additionalDiscountShare: replacementSubtotal > 0 ? appliedAdditionalReplacementDiscount * (line.netUnitPrice * Number(line.quantity) / replacementSubtotal) : 0,
        unitPrice: getReplacementNetUnitPrice(line),
        unitProfit: getReplacementNetUnitPrice(line) - Number(line.product.buyPrice || 0),
        unitCost: Number(line.product.buyPrice || 0),
      })) : [],
      replacement: action === 'replacement' ? {
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
      } : null,
    };

    if (restock || action === 'replacement') {
      setInventory((current) => current.map((item) => {
        const isReturnedProduct = restock && String(item.id) === String(selectedLine.id);
        const consumedLines = action === 'replacement' ? resolvedReplacementLines.filter((line) => String(line.product.id) === String(item.id)) : [];
        if (!isReturnedProduct && !consumedLines.length) return item;
        const consumedQty = consumedLines.reduce((sum, line) => sum + Number(line.quantity), 0);
        const consumedImeis = new Set(consumedLines.flatMap((line) => line.imeis || []).map(String));
        const returnedIdentifiers = isReturnedProduct ? returnedImeis : [];
        const returnedUnitEntries = isReturnedProduct ? returnedImeis.map((imei) => ({ imei1: imei, returnedFromInvoice: invoice.invoiceNo })) : [];
        const remainingImeis = (item.imeis || []).filter((imei) => !consumedImeis.has(String(imei)));
        const remainingUnits = (item.units || []).filter((unit) => !consumedImeis.has(String(unit.imei1 || unit.imei2 || unit.barcode || unit.id)));
        return {
          ...item,
          stock: Math.max(0, Number(item.stock || 0) + (isReturnedProduct ? Number(quantity) : 0) - consumedQty),
          imeis: item.imeis ? [...new Set([...remainingImeis, ...returnedIdentifiers])] : item.imeis,
          units: item.units ? [...remainingUnits, ...returnedUnitEntries] : item.units,
        };
      }));
    }
    setInvoices((current) => current.map((item) => {
      if (String(item.invoiceNo || item.id) !== selectedInvoiceKey) return item;
      const returnTransactions = [...(item.returnTransactions || []), transaction];
      const isFullyRefunded = (item.items || []).every((line, index) => {
        const returned = returnTransactions.filter((entry) => Number(entry.originalItemIndex) === index && entry.type === 'refund' && entry.status !== 'voided')
          .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
        return returned >= Number(line.qty || 0);
      });
      return { ...item, returnTransactions, ...(isFullyRefunded ? { status: 'REFUNDED', paymentStatus: 'REFUNDED', isCancelled: true, cancelledAt: transaction.date } : {}) };
    }));
    setNotice({ kind: 'success', text: action === 'refund'
      ? `${money(refundAmount)} refund recorded for ${invoice.invoiceNo}. ${restock ? 'Returned stock was added back.' : 'Returned item was kept out of sellable stock.'}`
      : `${replacementMode === 'full-replacement' ? 'Full replacement' : replacementMode === 'partial-replacement' ? 'Partial replacement' : 'Product exchange'} recorded for ${invoice.invoiceNo}. ${settlementDirection === 'collect' ? `${money(settlementAmount)} to collect` : settlementDirection === 'refun