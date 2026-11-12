 - reversed;
          bill.balanceDue = Math.max(0, Number(bill.totalAmount || 0) - bill.paidAmount);
          if (reversed) allocations.push({ type: 'bill', id: bill.id, amount: -reversed });
          remaining -= reversed;
        }
      }
      const entryOrder = delta > 0 ? [...khataEntries.keys()].reverse() : [...khataEntries.keys()];
      for (const index of entryOrder) {
        if (!remaining) break;
        const entry = khataEntries[index];
        if (delta > 0) {
          const due = Math.max(0, Number(entry.balanceDue ?? Number(entry.amount || 0) - Number(entry.paidAmount || 0)) || 0);
          const applied = Math.min(due, remaining);
          entry.paidAmount = Number(entry.paidAmount || 0) + applied;
          entry.balanceDue = due - applied;
          if (applied) allocations.push({ type: 'khata', id: entry.id, amount: applied });
          remaining -= applied;
        } else {
          const paid = Number(entry.paidAmount || 0);
          const reversed = Math.min(paid, remaining);
          entry.paidAmount = paid - reversed;
          entry.balanceDue = Math.max(0, Number(entry.amount || 0) - entry.paidAmount);
          if (reversed) allocations.push({ type: 'khata', id: entry.id, amount: -reversed });
          remaining -= reversed;
        }
      }
      if (remaining > 0.01) return supplier;
      return {
        ...supplier,
        balancePayable: Math.max(0, (Number(supplier.balancePayable) || 0) - delta),
        purchaseBills,
        khataEntries,
        payments: (supplier.payments || []).map(payment => payment.id === currentPayment.id ? {
          ...payment, amount, mode: editSupplierPaymentMode, note: editSupplierPaymentNote.trim(), date: editSupplierPaymentDate,
          allocations: allocations.length ? allocations : payment.allocations || []
        } : payment),
      };
    }));
    setEditingSupplierPayment(null);
  };

  // WhatsApp Message Composer Helper
  const getWhatsAppUrl = (cust, customMessage = '') => {
    const cleanPhone = normalizePhone(cust.phone);
    if (!cleanPhone) return '#';
    let msg = customMessage;
    if (!msg) {
      if (cust.balanceDue > 0) {
        msg = `Namaste ${cust.name} ji, ALZINO Mobiles Bodhan se reminder: Aapke account mein Rs.${cust.balanceDue.toLocaleString()} ka balance pending hai. GooglePay/PhonePe UPI: ${shopConfig.upiId || 'alzino.bodhan@okhdfcbank'} par pay kar sakte hain. Dhanyawaad!`;
      } else {
        msg = `Namaste ${cust.name} ji, ALZINO Mobiles Bodhan par shopping aur servicing ke liye dhanyawaad! Kisi bhi naye phone, accessories ya repair support ke liye humein contact karein.`;
      }
    }
    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  if (initialView === 'khata' && portalEntity === 'suppliers') {
    const totalSupplierDue = suppliers.reduce((sum, supplier) => sum + (Number(supplier.balancePayable) || 0), 0);
    const supplierBills = suppliers.flatMap(supplier => (supplier.purchaseBills || []).map(bill => ({ ...bill, supplierName: supplier.name, supplierId: supplier.id })))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const supplierPayments = suppliers.flatMap(supplier => (supplier.payments || []).map(payment => ({ ...payment, supplierId: supplier.id, supplierName: supplier.name })))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const supplierActivity = [
      ...supplierBills.map(bill => ({ ...bill, kind: 'Bill', detail: `${bill.invoiceNumber || 'Supplier bill'} · ${bill.productName || ''}`, debit: bill.totalAmount, credit: 0 })),
      ...suppliers.flatMap(supplier => (supplier.khataEntries || []).map(entry => ({ ...entry, supplierId: supplier.id, supplierName: supplier.name, kind: 'Manual Khata', detail: `${entry.description}${entry.reference ? ` · ${entry.reference}` : ''}`, debit: entry.amount, credit: 0 }))),
      ...supplierPayments.map(payment => ({ ...payment, kind: 'Payment', detail: `${payment.mode}${payment.note ? ` · ${payment.note}` : ''}`, debit: 0, credit: payment.amount, paymentRecord: payment }))
    ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return (
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div className="illoca-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div><h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Khata Ledger · Supplier Payables</h2><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Supplier bills and payments from the Supplier Portal are recorded here.</div></div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}><button type="button" className="btn-outline" onClick={() => { setPortalEntity('customers'); setSearchTerm(''); }}>Customer Khata ({unifiedCustomers.length})</button><button type="button" className="btn-primary">Supplier Khata ({suppliers.length})</button><button type="button" className="btn-primary" onClick={() => { setKhataEntityType('supplier'); setKhataEntityId(''); setShowKhataModal(true); }}><Plus size={14} /> Add Khata</button></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.65rem' }}>
          <div className="illoca-card" style={{ padding: '0.85rem 1rem' }}><div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>SUPPLIERS</div><strong style={{ fontSize: '1.25rem' }}>{suppliers.length}</strong></div>
          <div className="illoca-card" style={{ padding: '0.85rem 1rem' }}><div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>OUTSTANDING PAYABLE</div><strong style={{ fontSize: '1.25rem', color: 'var(--status-amber)' }}>₹{totalSupplierDue.toLocaleString()}</strong></div>
          <div className="illoca-card" style={{ padding: '0.85rem 1rem' }}><div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>RECORDED BILLS</div><strong style={{ fontSize: '1.25rem' }}>{supplierBills.length}</strong></div>
        </div>
        <div className="illoca-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <div style={{ position: 'relative', maxWidth: '520px', marginBottom: '0.75rem' }}><Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} /><input className="input-field" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search supplier, phone, or GSTIN..." style={{ paddingLeft: '2rem' }} /></div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}><thead><tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}><th style={{ padding: '0.6rem' }}>Supplier</th><th style={{ padding: '0.6rem' }}>Phone</th><th style={{ padding: '0.6rem' }}>Bills</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Payable Due</th><th style={{ padding: '0.6rem' }}>Due Date</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>{filteredPortalSuppliers.map(supplier => { const supplierDueStatus = dueStatus([...(supplier.purchaseBills || []).map(bill => ({ ...bill, balanceDue: Number(bill.balanceDue ?? (Number(bill.totalAmount) - Number(bill.paidAmount))) || 0 })), ...(supplier.khataEntries || [])]); return <tr key={supplier.id} style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: '0.7rem 0.6rem', fontWeight: 700 }}>{supplier.name}<div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{supplier.gstin || supplier.city || 'Supplier account'}</div></td><td style={{ padding: '0.7rem 0.6rem' }}>{supplier.phone || '—'}</td><td style={{ padding: '0.7rem 0.6rem' }}>{(supplier.purchaseBills || []).length}</td><td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', fontWeight: 700, color: Number(supplier.balancePayable) > 0 ? 'var(--status-red)' : 'var(--status-green)' }}>₹{(Number(supplier.balancePayable) || 0).toLocaleString()}</td><td style={{ padding: '0.7rem 0.6rem', color: supplierDueStatus?.overdue ? 'var(--status-red)' : 'var(--text-secondary)', fontWeight: supplierDueStatus?.overdue ? 800 : 500 }}>{supplierDueStatus ? `${supplierDueStatus.date} · ${supplierDueStatus.overdue ? `${Math.abs(supplierDueStatus.days)}d overdue` : `${supplierDueStatus.days}d left`}` : '—'}</td><td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', whiteSpace: 'nowrap' }}><button type="button" className="btn-outline" title="Share Khata on WhatsApp" onClick={() => shareKhata(supplier, 'supplier')}><Share2 size={14} /></button> {Number(supplier.balancePayable) > 0 && <button type="button" className="btn-primary" onClick={() => setSelectedSupplierForPayment(supplier)}>Record Payment</button>}</td></tr>; })}</tbody>
          </table>
          {!filteredPortalSuppliers.length && <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No supplier balances match your search.</div>}
        </div>
        <div className="illoca-card" style={{ padding: '1rem', overflowX: 'auto' }}><h3 style={{ margin: '0 0 0.7rem', fontSize: '1rem' }}>Supplier Account Activity</h3>
          {supplierActivity.length ? <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}><thead><tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}><th style={{ padding: '0.6rem' }}>Date</th><th style={{ padding: '0.6rem' }}>Supplier</th><th style={{ padding: '0.6rem' }}>Entry</th><th style={{ padding: '0.6rem' }}>Reference / Details</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Debit</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Credit</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Action</th></tr></thead><tbody>
            {supplierActivity.map(row => <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: '0.65rem' }}>{row.date || '—'}</td><td style={{ padding: '0.65rem', fontWeight: 600 }}>{row.supplierName}</td><td style={{ padding: '0.65rem' }}>{row.kind}</td><td style={{ padding: '0.65rem' }}>{row.detail}</td><td style={{ padding: '0.65rem', textAlign: 'right' }}>{row.debit ? `₹${Number(row.debit).toLocaleString()}` : '—'}</td><td style={{ padding: '0.65rem', textAlign: 'right', color: 'var(--status-green)' }}>{row.credit ? `₹${Number(row.credit).toLocaleString()}` : '—'}</td><td style={{ padding: '0.65rem', textAlign: 'right' }}>{row.kind === 'Payment' && <button type="button" className="btn-outline" onClick={() => { const supplier = suppliers.find(item => String(item.id) === String(row.supplierId)); if (supplier && row.paymentRecord) openSupplierPaymentEdit(supplier, row.paymentRecord); }} style={{ padding: '0.3rem 0.5rem' }}>Edit</button>}</td></tr>)}
          </tbody></table> : <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No supplier bills or payments are recorded yet.</div>}
        </div>
        {selectedSupplierForPayment && <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}><form onSubmit={handlePaySupplierKhata} className="illoca-card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '1.4rem', background: 'var(--surface-primary)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><h3 style={{ margin: 0 }}>Pay Supplier Khata</h3><button type="button" className="btn-outline" onClick={() => setSelectedSupplierForPayment(null)}>✕</button></div><p style={{ marginTop: 0 }}>{selectedSupplierForPayment.name} · Due ₹{(Number(selectedSupplierForPayment.balancePayable) || 0).toLocaleString()}</p><label className="input-label">Payment Amount ₹<input type="number" min="0.01" max={Number(selectedSupplierForPayment.balancePayable) || 0} step="0.01" required className="input-field" value={supplierPaymentAmount} onChange={e => setSupplierPaymentAmount(e.target.value)} /></label><label className="input-label">Paid Via<select className="input-field" value={supplierPaymentMode} onChange={e => setSupplierPaymentMode(e.target.value)}><option>Bank Transfer</option><option>Cash</option><option>UPI</option><option>Cheque</option></select></label><label className="input-label">Reference / Note<input className="input-field" value={supplierPaymentNote} onChange={e => setSupplierPaymentNote(e.target.value)} placeholder="Optional transaction reference" /></label><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}><button type="button" className="btn-outline" onClick={() => setSelectedSupplierForPayment(null)}>Cancel</button><button type="submit" className="btn-primary">Save Payment</button></div></form></div>}
        {editingSupplierPayment && <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1001 }}><form onSubmit={saveSupplierPaymentEdit} className="illoca-card animate-fade-in" style={{ maxWidth: 460, width: '100%', padding: '1.4rem', background: 'var(--surface-primary)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><h3 style={{ margin: 0 }}>Edit Supplier Payment</h3><button type="button" className="btn-outline" onClick={() => setEditingSupplierPayment(null)}>✕</button></div><label className="input-label">Payment Date<input type="date" required className="input-field" value={editSupplierPaymentDate} onChange={event => setEditSupplierPaymentDate(event.target.value)} /></label><label className="input-label">Amount ₹<input type="number" min="0.01" step="0.01" required className="input-field" value={editSupplierPaymentAmount} onChange={event => setEditSupplierPaymentAmount(event.target.value)} /></label><label className="input-label">Paid Via<select className="input-field" value={editSupplierPaymentMode} onChange={event => setEditSupplierPaymentMode(event.target.value)}><option>Bank Transfer</option><option>Cash</option><option>UPI</option><option>Cheque</option></select></label><label className="input-label">Reference / Note<input className="input-field" value={editSupplierPaymentNote} onChange={event => setEditSupplierPaymentNote(event.target.value)} /></label><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}><button type="button" className="btn-outline" onClick={() => setEditingSupplierPayment(null)}>Cancel</button><button type="submit" className="btn-primary">Save Payment Changes</button></div></form></div>}
        {showKhataModal && <KhataEntryModal customers={unifiedCustomers} suppliers={suppliers} entityType={khataEntityType} setEntityType={setKhataEntityType} entityId={khataEntityId} setEntityId={setKhataEntityId} amount={khataAmount} setAmount={setKhataAmount} date={khataDate} setDate={setKhataDate} dueDate={khataDueDate} setDueDate={setKhataDueDate} description={khataDescription} setDescription={setKhataDescription} reference={khataReference} setReference={setKhataReference} onSubmit={saveManualKhata} onClose={() => setShowKhataModal(false)} />}
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      
      {/* --------------------------------------------------------------------- */}
      {/* 1. TOP HEADER & HUD STATS                                              */}
      {/* --------------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',