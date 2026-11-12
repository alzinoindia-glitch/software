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
      : `${replacementMode === 'full-replacement' ? 'Full replacement' : replacementMode === 'partial-replacement' ? 'Partial replacement' : 'Product exchange'} recorded for ${invoice.invoiceNo}. ${settlementDirection === 'collect' ? `${money(settlementAmount)} to collect` : settlementDirection === 'refund' ? `${money(settlementAmount)} refund due` : 'No balance due'}. Replacement stock was deducted${restock ? ' and the returned item was restocked' : ''}.` });
    setLineIndex(''); setReplacementLines([]); setAdditionalReplacementDiscount(0); setRestock(false);
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
        <strong style={{ textAlign: 'right', color: entry.settlement?.direction === 'collect' ? '#a35d00' : '#087452' }}>{entry.type === 'refund' ? `Refund ${money(entry.refundAmount)}` : entry.settlement?.direction === 'collect' ? `Collect ${money(entry.settlement.amount)}` : entry.settlement?.direction === 'refund' ? `Refund ${money(entry.settlement.amount)}` : 'Settled even'}</strong>
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
          <div style={{ fontSize: 12, color: '#667a73', marginTop: 4 }}>Invoice total {money(invoice.grandTotal)} · Paid {money(invoice.paidAmount)}</div>
          {invoice.isCancelled || invoice.status === 'REFUNDED' ? <p style={{ color: '#b42318', fontWeight: 700, marginBottom: 0 }}>This invoice is already cancelled or fully refunded.</p> : null}
        </div>}
        <p style={{ color: '#71837c', fontSize: 12, lineHeight: 1.5, marginBottom: 0 }}>Completed returns remain attached to the invoice for audit and sync with the existing invoice records.</p>
      </div>

      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>2. Choose returned item</h2>
        {!invoice ? <div style={{ padding: '30px 10px', textAlign: 'center', color: '#71837c' }}>Search and select an invoice to continue.</div> : <>
          {invoiceItems.map((item, index) => {
            const remaining = availableQty(index);
            const selected = String(lineIndex) === String(index);
            const itemTotalPaid = Number(item.total ?? (Number(item.rate || 0) * Number(item.qty || 1))) * invoiceNetScale;
            return <button key={`${item.id || item.name}-${index}`} disabled={remaining < 1 || invoice.isCancelled || invoice.status === 'REFUNDED'} onClick={() => { setLineIndex(String(index)); setQuantity(1); setAdditionalReplacementDiscount(0); setNotice(null); }} style={{ width: '100%', textAlign: 'left', border: `1px solid ${selected ? '#07835d' : '#d5e1dc'}`, borderRadius: 10, padding: 11, marginBottom: 8, background: selected ? '#eff9f4' : '#fff', color: '#17352d', cursor: remaining ? 'pointer' : 'not-allowed', opacity: remaining ? 1 : .6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>{item.name || 'Product'}</strong><span style={{ fontSize: 12, color: remaining ? '#087452' : '#a0433a', whiteSpace: 'nowrap' }}>{remaining} returnable / {item.qty || 0}</span></div>
              <div style={{ color: '#667a73', fontSize: 12, marginTop: 3 }}>Paid {money(itemTotalPaid)} · {money(itemTotalPaid / Math.max(1, Number(item.qty || 1)))} each</div>
            </button>;
          })}

          {selectedLine && <div style={{ borderTop: '1px solid #e4ece8', paddingTop: 14, marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Return quantity<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} type="number" min="1" max={maxQty} value={quantity} disabled={action === 'replacement' && replacementMode === 'full-replacement'} onChange={(event) => setQuantity(Math.min(maxQty || 1, Math.max(1, Number(event.target.value) || 1)))} />{action === 'replacement' && replacementMode === 'full-replacement' && <small style={{ display: 'block', color: '#667a73', marginTop: 4 }}>Full replacement returns all {maxQty} remaining unit(s) from this invoice line.</small>}</label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Condition<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={condition} onChange={(event) => { setCondition(event.target.value); if (event.target.value === 'damaged') setRestock(false); }}><option value="good">Good / sellable</option><option value="damaged">Damaged / inspect</option></select></label>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: 11, margin: '12px 0', border: '1px solid #d5e1dc', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={restock} onChange={(event) => setRestock(event.target.checked)} style={{ marginTop: 3 }} />
              <span><strong style={{ fontSize: 13 }}>Add returned item back to stock</strong><small style={{ display: 'block', color: '#667a73', marginTop: 3 }}>Leave unchecked for damaged or unsellable goods. Returned IMEIs will be restored when available on the invoice.</small></span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8, marginBottom: 12 }}>
              <button onClick={() => { setAction('refund'); setReplacementLines([]); setAdditionalReplacementDiscount(0); }} style={{ ...inputStyle, cursor: 'pointer', borderColor: action === 'refund' ? '#087452' : '#d5e1dc', background: action === 'refund' ? '#e9f7f0' : '#fff', fontWeight: 700 }}><CircleDollarSign size={16} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Full refund</button>
              {[
                ['full-replacement', 'Full replacement'],
                ['partial-replacement', 'Partial replacement'],
                ['product-exchange', 'Product exchange'],
              ].map(([mode, label]) => <button key={mode} disabled={mode === 'partial-replacement' && maxQty < 2} title={mode === 'partial-replacement' && maxQty < 2 ? 'This invoice line has no smaller partial quantity available.' : undefined} onClick={() => {
                setAction('replacement'); setReplacementMode(mode);
                if (!replacementLines.length) setReplacementLines([{ rowId: `replacement-${Date.now()}`, productId: '', quantity: 1, imeis: [], discountPerUnit: 0 }]);
                if (mode === 'full-replacement') setQuantity(maxQty);
                else if (mode === 'partial-replacement') setQuantity(Math.min(Number(quantity) || 1, Math.max(1, maxQty - 1)));
              }} style={{ ...inputStyle, cursor: mode === 'partial-replacement' && maxQty < 2 ? 'not-allowed' : 'pointer', opacity: mode === 'partial-replacement' && maxQty < 2 ? 0.5 : 1, borderColor: action === 'replacement' && replacementMode === mode ? '#087452' : '#d5e1dc', background: action === 'replacement' && replacementMode === mode ? '#e9f7f0' : '#fff', fontWeight: 700 }}><PackageCheck size={16} style={{ verticalAlign: 'middle', marginRight: 5 }} />{label}</button>)}
            </div>
            {action === 'refund' ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Refund method<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={refundMethod} onChange={(event) => setRefundMethod(event.target.value)}><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Khata credit</option></select></label>
              <div style={{ padding: 10, background: '#f3f7f5', borderRadius: 9 }}><small style={{ color: '#667a73' }}>Refund at original paid rate</small><strong style={{ display: 'block', fontSize: 20, color: '#087452', marginTop: 2 }}>{money(refundAmount)}</strong></div>
            </div> : <div style={{ display: 'grid', gap: 10 }}>
              <p style={{ margin: '0 0 2px', color: '#667a73', fontSize: 13 }}>{replacementMode === 'full-replacement' ? 'Replace all remaining units on this invoice line.' : replacementMode === 'partial-replacement' ? 'Return only the quantity selected above; the remaining units stay on the original invoice.' : 'Exchange the selected returned item for one or more products from stock.'} Return value: <strong>{money(returnValue)}</strong>. Set discounts on each replacement product; the discounted total is compared with the amount paid for the returned item.</p>
              {resolvedReplacementLines.map((line, index) => {
                const otherQty = replacementLines.filter((other) => other.rowId !== line.rowId && String(other.productId) === String(line.productId)).reduce((sum, other) => sum + Number(other.quantity || 0), 0);
                const maxAvailable = Number(line.product?.stock || 0) - otherQty;
                const isTracked = line.product && ((line.product.imeis || []).length > 0 || (line.product.units || []).length > 0);
                const availableImeiOptions = line.product ? [
                  ...(line.product.units || []).map((unit) => ({ value: String(unit.imei1 || unit.imei2 || unit.barcode || unit.id || ''), label: `${unit.imei1 || unit.imei2 || unit.barcode || unit.id || ''}${unit.color ? ` · ${unit.color}` : ''}` })).filter((option) => option.value),
                  ...(line.product.imeis || []).filter((imei) => !(line.product.units || []).some((unit) => [unit.imei1, unit.imei2, unit.barcode, unit.id].includes(imei))).map((imei) => ({ value: String(imei), label: String(imei) })),
                ] : [];
                return <div key={line.rowId} className="replacement-product-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 2fr) minmax(70px, .6fr) minmax(105px, .9fr) auto', gap: 8, alignItems: 'end', padding: 10, background: '#f7faf8', border: '1px solid #dfe9e4', borderRadius: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Product<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={line.productId} onChange={(event) => setReplacementLines((current) => current.map((entry) => entry.rowId === line.rowId ? { ...entry, productId: event.target.value, quantity: 1, imeis: [], discountPerUnit: 0 } : entry))}><option value="">Choose stock product</option>{inStockProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.stock} in stock · {money(product.sellPrice ?? product.price)}</option>)}</select></label>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Qty<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} type="number" min="1" max={Math.max(1, maxAvailable)} value={line.quantity} onChange={(event) => setReplacementLines((current) => current.map((entry) => entry.rowId === line.rowId ? { ...entry, quantity: Math.min(Math.max(1, maxAvailable), Math.max(1, Number(event.target.value) || 1)), imeis: (entry.imeis || []).slice(0, Math.max(1, Number(event.target.value) || 1)) } : entry))} /></label>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Discount / unit (₹)<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} type="number" min="0" max={line.listPrice} step="0.01" value={line.discountPerUnit ?? 0} disabled={!line.product} onChange={(event) => setReplacementLines((current) => current.map((entry) => entry.rowId === line.rowId ? { ...entry, discountPerUnit: Math.min(line.listPrice, Math.max(0, Number(event.target.value) || 0)) } : entry))} /></label>
                  <button type="button" aria-label="Remove replacement product" onClick={() => setReplacementLines((current) => current.filter((entry) => entry.rowId !== line.rowId))} style={{ ...inputStyle, width: 44, color: '#a33224', cursor: 'pointer' }}>×</button>
                  {isTracked && <label style={{ gridColumn: '1 / -1', fontSize: 12, fontWeight: 700 }}>Select {line.quantity} replacement IMEI / unit<select multiple style={{ ...inputStyle, display: 'block', marginTop: 5, minHeight: 84 }} value={line.imeis || []} onChange={(event) => { const values = Array.from(event.target.selectedOptions, (option) => option.value).slice(0, Number(line.quantity)); setReplacementLines((current) => current.map((entry) => entry.rowId === line.rowId ? { ...entry, imeis: values } : entry)); }}>{availableImeiOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small style={{ color: '#667a73' }}>Hold Ctrl or Command to select multiple units.</small></label>}
                  {line.product && <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#61756d' }}>{line.product.name}: {money(line.listPrice)} − {money(Math.min(line.discountPerUnit, line.listPrice))} discount = <strong>{money(line.netUnitPrice)} each × {line.quantity} = {money(line.netUnitPrice * Number(line.quantity))}</strong></div>}
                </div>;
              })}
              <button type="button" onClick={() => setReplacementLines((current) => [...current, { rowId: `replacement-${Date.now()}-${current.length}`, productId: '', quantity: 1, imeis: [], discountPerUnit: 0 }])} style={{ ...inputStyle, cursor: 'pointer', background: '#fff', fontWeight: 700 }}>+ Add another replacement product</button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, padding: 12, background: '#edf6f1', borderRadius: 10, alignItems: 'center' }}>
                <span>Returned item value<strong style={{ display: 'block', marginTop: 4 }}>{money(returnValue)}</strong></span>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Extra discount on replacement (₹)<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} type="number" min="0" max={replacementSubtotal} step="0.01" value={appliedAdditionalReplacementDiscount} disabled={!replacementSubtotal} onChange={(event) => setAdditionalReplacementDiscount(Math.min(replacementSubtotal, Math.max(0, Number(event.target.value) || 0)))} /><small style={{ display: 'block', marginTop: 3, color: '#667a73' }}>In addition to per-product discounts</small><strong style={{ display: 'block', marginTop: 3 }}>Total discount: {money(replacementDiscountTotal)}</strong></label>
                <span>Replacement total<strong style={{ display: 'block', marginTop: 4 }}>{money(replacementTotal)}</strong></span>
                <span>{settlementDirection === 'collect' ? 'Collect from customer' : settlementDirection === 'refund' ? 'Refund to customer' : 'Balance'}<strong style={{ display: 'block', marginTop: 4, color: settlementDirection === 'even' ? '#087452' : '#a35d00' }}>{money(settlementAmount)}</strong></span>
              </div>
              {settlementDirection !== 'even' && <label style={{ fontSize: 12, fontWeight: 700 }}>{settlementDirection === 'collect' ? 'Collect / record difference by' : 'Refund / credit difference by'}<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={effectiveSettlementMethod} onChange={(event) => setSettlementMethod(event.target.value)}>{exchangeSettlementOptions.map((method) => <option key={method}>{method}</option>)}</select></label>}
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
