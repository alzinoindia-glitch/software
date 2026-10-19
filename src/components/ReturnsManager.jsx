import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign, PackageCheck, RefreshCw, Search, RotateCcw } from 'lucide-react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const keyFor = (invoice, index) => `${invoice.invoiceNo || invoice.id || 'invoice'}:${index}`;

export default function ReturnsManager({ invoices = [], setInvoices, inventory = [], setInventory }) {
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [selectedInvoiceKey, setSelectedInvoiceKey] = useState('');
  const [lineIndex, setLineIndex] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState('refund');
  const [condition, setCondition] = useState('damaged');
  const [restock, setRestock] = useState(false);
  const [replacementId, setReplacementId] = useState('');
  const [replacementImeis, setReplacementImeis] = useState([]);
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
  const replaceProduct = inventory.find((item) => String(item.id) === String(replacementId));
  const inStockProducts = inventory.filter((item) => Number(item.stock || 0) > 0);
  const invoiceLineGross = invoiceItems.reduce((sum, item) => sum + Number(item.total ?? (Number(item.rate || 0) * Number(item.qty || 1))), 0);
  const invoiceNetScale = invoice && invoiceLineGross > 0 ? Math.min(1, Number(invoice.grandTotal ?? invoiceLineGross) / invoiceLineGross) : 1;
  const lineUnitPaid = selectedLine
    ? Number(selectedLine.total ?? (Number(selectedLine.rate || 0) * Number(selectedLine.qty || 1))) * invoiceNetScale / Math.max(1, Number(selectedLine.qty || 1))
    : 0;
  const refundAmount = action === 'refund' ? lineUnitPaid * Number(quantity || 0) : 0;
  const refundableBalance = invoice
    ? Math.max(0, Number(invoice.paidAmount ?? invoice.grandTotal ?? 0) - (invoice.returnTransactions || [])
      .filter((entry) => entry.type === 'refund' && entry.status !== 'voided')
      .reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0))
    : 0;
  const replacementDelta = replaceProduct ? (Number(replaceProduct.sellPrice ?? replaceProduct.price ?? 0) - lineUnitPaid) * Number(quantity || 0) : 0;

  const selectInvoice = (item) => {
    setSelectedInvoiceKey(String(item.invoiceNo || item.id));
    setInvoiceQuery(String(item.invoiceNo || item.id));
    setLineIndex(''); setNotice(null); setReplacementId(''); setReplacementImeis([]);
  };

  const completeReturn = () => {
    if (!invoice || !selectedLine || maxQty < 1 || Number(quantity) < 1 || Number(quantity) > maxQty) {
      setNotice({ kind: 'error', text: 'Choose an invoice line and a quantity that has not already been returned.' }); return;
    }
    if (action === 'refund' && refundAmount > refundableBalance + 0.01) {
      setNotice({ kind: 'error', text: `Refund exceeds the remaining amount paid on this invoice (${money(refundableBalance)}). Apply any unpaid balance as Khata credit instead.` }); return;
    }
    if (action === 'replacement' && (!replaceProduct || Number(replaceProduct.stock || 0) < Number(quantity))) {
      setNotice({ kind: 'error', text: 'Choose an in-stock replacement product with enough available quantity.' }); return;
    }
    const tracked = action === 'replacement' && ((replaceProduct.imeis || []).length > 0 || (replaceProduct.units || []).length > 0);
    if (tracked && replacementImeis.length !== Number(quantity)) {
      setNotice({ kind: 'error', text: `Select ${quantity} available IMEI/unit${Number(quantity) === 1 ? '' : 's'} for the replacement.` }); return;
    }

    const returnedImeis = (selectedLine.imeis || []).slice(0, Number(quantity));
    const transaction = {
      id: `RET-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(), status: 'completed', type: action,
      originalItemIndex: Number(lineIndex), originalProductId: selectedLine.id,
      originalProductName: selectedLine.name, quantity: Number(quantity),
      originalUnitPaid: lineUnitPaid, refundAmount, refundMethod: action === 'refund' ? refundMethod : '',
      condition, restocked: Boolean(restock), returnedImeis,
      replacement: action === 'replacement' ? {
        productId: replaceProduct.id, productName: replaceProduct.name, quantity: Number(quantity),
        imeis: replacementImeis, unitPrice: Number(replaceProduct.sellPrice ?? replaceProduct.price ?? 0), valueDifference: replacementDelta,
      } : null,
    };

    if (restock) {
      setInventory((current) => current.map((item) => {
        if (String(item.id) !== String(selectedLine.id)) return item;
        const addImeis = returnedImeis;
        return { ...item, stock: Number(item.stock || 0) + Number(quantity), imeis: [...new Set([...(item.imeis || []), ...addImeis])] };
      }));
    }
    if (action === 'replacement') {
      setInventory((current) => current.map((item) => {
        if (String(item.id) !== String(replaceProduct.id)) return item;
        const consumed = new Set(replacementImeis);
        const remainingImeis = (item.imeis || []).filter((imei) => !consumed.has(String(imei)));
        const remainingUnits = (item.units || []).filter((unit) => !consumed.has(String(unit.imei1 || unit.imei2 || unit.barcode || unit.id)));
        return { ...item, stock: Math.max(0, Number(item.stock || 0) - Number(quantity)), imeis: item.imeis ? remainingImeis : item.imeis, units: item.units ? remainingUnits : item.units };
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
      : `Replacement recorded for ${invoice.invoiceNo}. Replacement stock was deducted${restock ? ' and the returned item was restocked' : ''}.` });
    setLineIndex(''); setReplacementId(''); setReplacementImeis([]); setRestock(false);
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

    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(0, 1.6fr)', gap: 16, alignItems: 'start' }}>
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
            return <button key={`${item.id || item.name}-${index}`} disabled={remaining < 1 || invoice.isCancelled || invoice.status === 'REFUNDED'} onClick={() => { setLineIndex(String(index)); setQuantity(1); setNotice(null); }} style={{ width: '100%', textAlign: 'left', border: `1px solid ${selected ? '#07835d' : '#d5e1dc'}`, borderRadius: 10, padding: 11, marginBottom: 8, background: selected ? '#eff9f4' : '#fff', color: '#17352d', cursor: remaining ? 'pointer' : 'not-allowed', opacity: remaining ? 1 : .6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>{item.name || 'Product'}</strong><span style={{ fontSize: 12, color: remaining ? '#087452' : '#a0433a', whiteSpace: 'nowrap' }}>{remaining} returnable / {item.qty || 0}</span></div>
              <div style={{ color: '#667a73', fontSize: 12, marginTop: 3 }}>Paid {money(item.total ?? (Number(item.rate || 0) * Number(item.qty || 1)))} · {money(Number(item.total ?? (Number(item.rate || 0) * Number(item.qty || 1))) / Math.max(1, Number(item.qty || 1)))} each</div>
            </button>;
          })}

          {selectedLine && <div style={{ borderTop: '1px solid #e4ece8', paddingTop: 14, marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Return quantity<input style={{ ...inputStyle, display: 'block', marginTop: 5 }} type="number" min="1" max={maxQty} value={quantity} onChange={(event) => setQuantity(Math.min(maxQty || 1, Math.max(1, Number(event.target.value) || 1)))} /></label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Condition<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={condition} onChange={(event) => { setCondition(event.target.value); if (event.target.value === 'damaged') setRestock(false); }}><option value="good">Good / sellable</option><option value="damaged">Damaged / inspect</option></select></label>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: 11, margin: '12px 0', border: '1px solid #d5e1dc', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={restock} onChange={(event) => setRestock(event.target.checked)} style={{ marginTop: 3 }} />
              <span><strong style={{ fontSize: 13 }}>Add returned item back to stock</strong><small style={{ display: 'block', color: '#667a73', marginTop: 3 }}>Leave unchecked for damaged or unsellable goods. Returned IMEIs will be restored when available on the invoice.</small></span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <button onClick={() => { setAction('refund'); setReplacementId(''); setReplacementImeis([]); }} style={{ ...inputStyle, cursor: 'pointer', borderColor: action === 'refund' ? '#087452' : '#d5e1dc', background: action === 'refund' ? '#e9f7f0' : '#fff', fontWeight: 700 }}><CircleDollarSign size={16} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Refund money</button>
              <button onClick={() => setAction('replacement')} style={{ ...inputStyle, cursor: 'pointer', borderColor: action === 'replacement' ? '#087452' : '#d5e1dc', background: action === 'replacement' ? '#e9f7f0' : '#fff', fontWeight: 700 }}><PackageCheck size={16} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Replacement product</button>
            </div>
            {action === 'refund' ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Refund method<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={refundMethod} onChange={(event) => setRefundMethod(event.target.value)}><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Khata credit</option></select></label>
              <div style={{ padding: 10, background: '#f3f7f5', borderRadius: 9 }}><small style={{ color: '#667a73' }}>Refund at original paid rate</small><strong style={{ display: 'block', fontSize: 20, color: '#087452', marginTop: 2 }}>{money(refundAmount)}</strong></div>
            </div> : <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Choose replacement from available stock<select style={{ ...inputStyle, display: 'block', marginTop: 5 }} value={replacementId} onChange={(event) => { setReplacementId(event.target.value); setReplacementImeis([]); }}><option value="">Select product</option>{inStockProducts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stock} available · {money(item.sellPrice ?? item.price)}</option>)}</select></label>
              {replaceProduct && <><div style={{ padding: 10, background: '#f3f7f5', borderRadius: 9, fontSize: 13 }}>Replacement {money(replaceProduct.sellPrice ?? replaceProduct.price)} each · Difference for {quantity}: <strong style={{ color: replacementDelta > 0 ? '#a35d00' : '#087452' }}>{replacementDelta > 0 ? `collect ${money(replacementDelta)}` : replacementDelta < 0 ? `refund ${money(Math.abs(replacementDelta))}` : 'even exchange'}</strong></div>
                {((replaceProduct.imeis || []).length > 0 || (replaceProduct.units || []).length > 0) && <label style={{ fontSize: 12, fontWeight: 700 }}>Select replacement IMEI / unit<select multiple style={{ ...inputStyle, display: 'block', marginTop: 5, minHeight: 100 }} value={replacementImeis} onChange={(event) => setReplacementImeis(Array.from(event.target.selectedOptions, (option) => option.value).slice(0, Number(quantity)))}>{(replaceProduct.units || []).map((unit) => { const value = String(unit.imei1 || unit.imei2 || unit.barcode || unit.id || ''); return value ? <option key={value} value={value}>{value}{unit.color ? ` · ${unit.color}` : ''}</option> : null; })}{(replaceProduct.imeis || []).filter((imei) => !(replaceProduct.units || []).some((unit) => [unit.imei1, unit.imei2, unit.barcode, unit.id].includes(imei))).map((imei) => <option key={imei} value={imei}>{imei}</option>)}</select><small style={{ color: '#667a73' }}>Hold Ctrl or Command to select multiple units.</small></label>}</>}
            </div>}
            <button onClick={completeReturn} disabled={invoice.isCancelled || invoice.status === 'REFUNDED'} style={{ ...inputStyle, marginTop: 14, border: 0, background: '#08634d', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><RefreshCw size={17} /> Complete {action === 'refund' ? 'refund' : 'replacement'}</button>
          </div>}
        </>}
      </div>
    </div>

    {invoice?.returnTransactions?.length > 0 && <div style={{ ...cardStyle, marginTop: 16 }}><h2 style={{ margin: '0 0 10px', fontSize: 16 }}>Return history · {invoice.invoiceNo}</h2>{invoice.returnTransactions.map((entry) => <div key={entry.id} style={{ padding: '10px 0', borderTop: '1px solid #edf1ef', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><span><strong>{entry.type === 'refund' ? 'Refund' : 'Replacement'} · {entry.originalProductName}</strong><small style={{ display: 'block', color: '#667a73', marginTop: 3 }}>{new Date(entry.date).toLocaleString()} · Qty {entry.quantity} · {entry.condition}{entry.restocked ? ' · restocked' : ' · not restocked'}{entry.replacement ? ` · replacement: ${entry.replacement.productName}` : ''}</small></span><strong>{entry.type === 'refund' ? money(entry.refundAmount) : entry.replacement?.valueDifference ? `Difference ${money(Math.abs(entry.replacement.valueDifference))}` : 'Exchange'}</strong></div>)}</div>}
    <style>{`@media(max-width:760px){.returns-layout{grid-template-columns:1fr!important}}`}</style>
  </section>;
}
