import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  Share2, 
  Edit2, 
  Download, 
  Receipt, 
  Calendar, 
  Smartphone, 
  Wrench, 
  ShoppingBag, 
  CheckCircle2, 
  Tag, 
  DollarSign,
  Save,
  X,
  User,
  Phone,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

export default function InvoicesHub({ 
  invoices = [], 
  setInvoices = () => {}, 
  customers = [],
  setCustomers = () => {},
  shopConfig = {}, 
  onPrintInvoice = () => {} 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'pos' | 'refurb' | 'repair' | 'gst' | 'non-gst'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'month'

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Edit Invoice Modal State
  const [editingInvoiceModal, setEditingInvoiceModal] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);

  // Toast message
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Date filter
      if (dateFilter === 'today' && inv.date !== todayStr) return false;
      if (dateFilter === 'month' && (!inv.date || !inv.date.startsWith(currentMonthStr))) return false;

      // Type filter
      if (typeFilter === 'refurb' && !inv.isRefurbishedResale && !(inv.items && inv.items.some(it => it.category === 'Used Mobiles'))) return false;
      if (typeFilter === 'repair' && !inv.isRepairInvoice && !inv.repairJobRef && !(inv.items && inv.items.some(it => it.category === 'Repair Services'))) return false;
      if (typeFilter === 'pos' && (inv.isRefurbishedResale || inv.isRepairInvoice)) return false;
      if (typeFilter === 'gst' && inv.isNonGst) return false;
      if (typeFilter === 'non-gst' && !inv.isNonGst) return false;

      // Search term
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;

      const words = q.split(/\s+/).filter(Boolean);
      const haystack = [
        inv.invoiceNo || '',
        inv.customerName || '',
        inv.customerPhone || '',
        inv.date || '',
        inv.paymentMode || '',
        inv.paymentRef || '',
        inv.emiDetails ? `${inv.emiDetails.financier || ''} ${inv.emiDetails.approvalCode || ''} ${inv.emiDetails.customerAadhaar || ''} emi finance loan` : '',
        inv.splitDetails ? `split cash ${inv.splitDetails.cashAmount || ''} upi ${inv.splitDetails.upiAmount || ''} ${inv.splitDetails.upiTxnRef || ''}` : '',
        inv.notes || '',
        inv.warrantyNotes || '',
        ...(inv.items || []).map(it => `${it.name} ${it.imeis ? it.imeis.join(' ') : ''} ${it.warranty || ''}`)
      ].join(' ').toLowerCase();

      return words.every(w => haystack.includes(w));
    });
  }, [invoices, typeFilter, dateFilter, searchTerm, todayStr, currentMonthStr]);

  // Overall Financial Stats
  const totalBilled = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  const totalProfit = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.totalProfit) || 0), 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
  const totalDueKhata = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.khataDue) || 0), 0);

  // Breakdown by Category
  const posCount = invoices.filter(i => !i.isRefurbishedResale && !i.isRepairInvoice).length;
  const refurbCount = invoices.filter(i => i.isRefurbishedResale || (i.items && i.items.some(it => it.category === 'Used Mobiles'))).length;
  const repairCount = invoices.filter(i => i.isRepairInvoice || i.repairJobRef || (i.items && i.items.some(it => it.category === 'Repair Services'))).length;

  // Open Edit Modal
  const handleOpenEdit = (inv) => {
    setInvoiceToEdit(JSON.parse(JSON.stringify(inv)));
    setEditingInvoiceModal(true);
  };

  // Save Edit Changes
  const handleSaveInvoiceEdit = (reprintFormat = null) => {
    if (!invoiceToEdit) return;

    const isNonGstInv = invoiceToEdit.isNonGst;
    const subtotal = invoiceToEdit.items.reduce((s, it) => s + (Number(it.rate) * Number(it.qty)), 0);
    const disc = Number(invoiceToEdit.discount) || 0;
    const grand = Math.max(0, Math.round(subtotal - disc));
    
    const taxable = isNonGstInv ? subtotal : invoiceToEdit.items.reduce((sum, item) => {
      const itTot = Number(item.rate) * Number(item.qty);
      const rate = item.gstRate || 18;
      return sum + (itTot / (1 + (rate / 100)));
    }, 0);

    const gst = isNonGstInv ? 0 : (subtotal - taxable);
    const cgst = isNonGstInv ? 0 : gst / 2;
    const sgst = isNonGstInv ? 0 : gst / 2;

    const paid = invoiceToEdit.paymentMode === 'Khata' ? 0 : grand;
    const khata = invoiceToEdit.paymentMode === 'Khata' ? grand : 0;

    const updatedInvoice = {
      ...invoiceToEdit,
      items: invoiceToEdit.items.map(it => ({
        ...it,
        total: Number(it.rate) * Number(it.qty),
        profit: (Number(it.rate) - (Number(it.buyPrice) || 0)) * Number(it.qty)
      })),
      taxableAmount: taxable,
      cgstTotal: cgst,
      sgstTotal: sgst,
      grandTotal: grand,
      paidAmount: paid,
      khataDue: khata,
      totalProfit: invoiceToEdit.items.reduce((s, it) => s + ((Number(it.rate) - (Number(it.buyPrice) || 0)) * Number(it.qty)), 0) - disc
    };

    setInvoices(prev => prev.map(inv => inv.invoiceNo === updatedInvoice.invoiceNo ? updatedInvoice : inv));

    // Update customer if exists
    if (updatedInvoice.customerPhone) {
      setCustomers(prev => prev.map(c => {
        if (c.phone && c.phone.replace(/\D/g, '') === updatedInvoice.customerPhone.replace(/\D/g, '')) {
          return {
            ...c,
            name: updatedInvoice.customerName || c.name,
            address: updatedInvoice.customerAddress || c.address,
            gstin: updatedInvoice.customerGstin || c.gstin
          };
        }
        return c;
      }));
    }

    setEditingInvoiceModal(false);
    setInvoiceToEdit(null);

    showToast(`Invoice ${updatedInvoice.invoiceNo} successfully updated!`);

    if (reprintFormat) {
      onPrintInvoice(updatedInvoice, reprintFormat);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,";
    csv += "Invoice No,Date,Category,Type,Customer Name,Phone,Address,Items,Payment Mode,Subtotal,Taxable,GST Amount,Discount,Grand Total,Profit,Khata Due\n";

    filteredInvoices.forEach(inv => {
      const typeDesc = inv.isRepairInvoice ? 'Repair Service' : inv.isRefurbishedResale ? 'Refurbished Mobile' : 'POS Product Sale';
      const itemsDesc = (inv.items || []).map(i => `${i.name} (x${i.qty})`).join('; ');
      const gstAmt = (inv.cgstTotal || 0) + (inv.sgstTotal || 0);

      const row = [
        inv.invoiceNo,
        inv.date,
        typeDesc,
        inv.isNonGst ? 'Non-GST' : 'GST Tax Invoice',
        `"${(inv.customerName || '').replace(/"/g, '""')}"`,
        inv.customerPhone || '',
        `"${(inv.customerAddress || '').replace(/"/g, '""')}"`,
        `"${itemsDesc.replace(/"/g, '""')}"`,
        inv.paymentMode || '',
        inv.subtotal || inv.grandTotal,
        inv.taxableAmount || 0,
        gstAmt.toFixed(2),
        inv.discount || 0,
        inv.grandTotal || 0,
        inv.totalProfit || 0,
        inv.khataDue || 0
      ];
      csv += row.join(",") + "\n";
    });

    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `ALZINO_Invoices_Register_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Toast Banner */}
      {toast && (
        <div className="animate-fade-in" style={{
          padding: '0.65rem 1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--status-green-bg)',
          border: '1px solid var(--status-green)',
          color: 'var(--status-green)',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Export Bar */}
      <div style={{
        background: 'var(--surface-card)',
        padding: '0.85rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--illoca-blue-subtle)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Store Invoices & Bills Central Register
              </h2>
              <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                {invoices.length} Total Bills
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Track all store sales, refurbished handset invoices, and repair service bills. Search, edit customer or price details, and reprint.
            </div>
          </div>
        </div>

        {/* Export & Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Download complete invoices register in Excel/CSV format"
          >
            <Download size={14} color="#10B981" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '0.75rem'
      }}>
        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Filtered Invoices Count
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {filteredInvoices.length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Bills</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            POS: {posCount} • Refurb: {refurbCount} • Repair: {repairCount}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Billed Revenue
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
            ₹{totalBilled.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-green)', fontWeight: 600, marginTop: '0.2rem' }}>
            Cash/Bank Collected: ₹{totalPaid.toLocaleString()}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Realized Gross Margin
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--status-green)', marginTop: '0.2rem' }}>
            ₹{totalProfit.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {totalBilled > 0 ? `${Math.round((totalProfit / totalBilled) * 100)}% overall margin` : 'Gross margin earned'}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Khata Balance
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: totalDueKhata > 0 ? 'var(--status-red)' : 'var(--text-primary)', marginTop: '0.2rem' }}>
            ₹{totalDueKhata.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Uncollected credit bills
          </div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="illoca-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        
        {/* Category Pill Filters */}
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Invoices' },
            { id: 'pos', label: 'POS Product Sales' },
            { id: 'refurb', label: 'Refurbished Mobiles' },
            { id: 'repair', label: 'Repair Services' },
            { id: 'gst', label: 'GST Tax Invoices' },
            { id: 'non-gst', label: 'Cash Memos / Non-GST' },
          ].map(tab => {
            const isSelected = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                style={{
                  padding: '0.32rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.76rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? 'var(--accent-primary)' : 'var(--surface-primary)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Date Filter & Search */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="segmented-bar">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'month', label: 'This Month' },
            ].map(df => (
              <button
                key={df.id}
                onClick={() => setDateFilter(df.id)}
                className={`segmented-item ${dateFilter === df.id ? 'active-blue' : ''}`}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
              >
                {df.label}
              </button>
            ))}
          </div>

          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search invoice #, customer, phone, IMEI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2rem', fontSize: '0.8rem' }}
            />
          </div>
        </div>
      </div>

      {/* Invoices Master Table */}
      <div className="illoca-card" style={{ padding: '1.25rem' }}>
        {filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              No Invoices Found
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
              No invoices match the selected type or search criteria.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Invoice # & Type</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Date</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Customer Details</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Items, IMEIs & Warranty</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Grand Total</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Profit Margin</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Payment</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const isRefurb = inv.isRefurbishedResale || (inv.items && inv.items.some(it => it.category === 'Used Mobiles'));
                  const isRepair = inv.isRepairInvoice || inv.repairJobRef || (inv.items && inv.items.some(it => it.category === 'Repair Services'));

                  return (
                    <tr key={inv.invoiceNo} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {/* Invoice # & Badges */}
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                            {inv.invoiceNo}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            padding: '0.05rem 0.35rem',
                            borderRadius: '3px',
                            background: isRepair ? 'var(--status-amber-bg)' : isRefurb ? 'var(--status-purple-bg)' : 'var(--surface-primary)',
                            color: isRepair ? 'var(--status-amber)' : isRefurb ? '#8B5CF6' : 'var(--text-secondary)',
                            border: '1px solid var(--border-color)'
                          }}>
                            {isRepair ? 'Repair Lab' : isRefurb ? 'Refurbished' : 'POS Retail'}
                          </span>
                          <span style={{
                            fontSize: '0.64rem',
                            padding: '0.05rem 0.35rem',
                            borderRadius: '3px',
                            background: inv.isNonGst ? 'var(--status-amber-bg)' : 'var(--status-green-bg)',
                            color: inv.isNonGst ? 'var(--status-amber)' : 'var(--status-green)',
                          }}>
                            {inv.isNonGst ? 'Non-GST' : 'GST 18%'}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {inv.date}
                      </td>

                      {/* Customer Info */}
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {inv.customerName || 'Counter Customer'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {inv.customerPhone ? `Ph: ${inv.customerPhone}` : 'No phone'}
                        </div>
                        {inv.customerAddress && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {inv.customerAddress}
                          </div>
                        )}
                      </td>

                      {/* Items & IMEIs */}
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {inv.items && inv.items.map((it, idx) => (
                          <div key={idx} style={{ marginBottom: '0.25rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                              {it.name} <span style={{ color: 'var(--text-muted)' }}>x{it.qty}</span>
                            </div>
                            {it.imeis && it.imeis.length > 0 && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                IMEI/Ref: {it.imeis.join(', ')}
                              </div>
                            )}
                            {it.warranty && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)' }}>
                                🛡️ {it.warranty}
                              </div>
                            )}
                            {it.accessories && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                Incl: {it.accessories}
                              </div>
                            )}
                          </div>
                        ))}
                        {inv.notes && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Note: {inv.notes}
                          </div>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.98rem', color: 'var(--accent-primary)' }}>
                        ₹{inv.grandTotal?.toLocaleString()}
                      </td>

                      {/* Profit */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--status-green)' }}>
                        +₹{(inv.totalProfit || 0).toLocaleString()}
                      </td>

                      {/* Payment */}
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {inv.emiDetails ? (
                          <div>
                            <span className="mono-tag" style={{ background: '#EEF2FF', color: '#4F46E5', fontWeight: 700 }}>
                              🏷️ EMI: {inv.emiDetails.financier}
                            </span>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                              DP: ₹{Number(inv.emiDetails.downPayment || 0).toLocaleString()} • {inv.emiDetails.tenureMonths}M @ ₹{Number(inv.emiDetails.monthlyInstallment || 0).toLocaleString()}/m
                            </div>
                            {inv.emiDetails.approvalCode && (
                              <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', marginTop: '0.1rem' }}>
                                DO #{inv.emiDetails.approvalCode}
                              </div>
                            )}
                          </div>
                        ) : inv.splitDetails ? (
                          <div>
                            <span className="mono-tag" style={{ background: '#ECFDF5', color: '#047857', fontWeight: 700 }}>
                              ⚡ Split: Cash+UPI
                            </span>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              Cash ₹{inv.splitDetails.cashAmount?.toLocaleString()} + UPI ₹{inv.splitDetails.upiAmount?.toLocaleString()}
                            </div>
                            {inv.splitDetails.upiTxnRef && (
                              <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                UTR: {inv.splitDetails.upiTxnRef}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="mono-tag">{inv.paymentMode}</span>
                            {inv.paymentRef && inv.paymentMode !== 'Cash' && (
                              <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                Ref: {inv.paymentRef}
                              </div>
                            )}
                          </div>
                        )}
                        {inv.khataDue > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--status-red)', fontWeight: 700, marginTop: '0.15rem' }}>
                            Due: ₹{inv.khataDue.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                          {/* EDIT DATA BUTTON */}
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            className="btn-secondary"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Edit customer name, phone, item price, or warranty"
                          >
                            <Edit2 size={12} color="var(--accent-primary)" />
                            <span>Edit</span>
                          </button>

                          {/* REPRINT THERMAL */}
                          <button
                            onClick={() => onPrintInvoice(inv, 'thermal')}
                            className="btn-outline"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Print 3-inch 80mm POS Receipt"
                          >
                            <Printer size={12} />
                            <span>Thermal</span>
                          </button>

                          {/* REPRINT A4 */}
                          <button
                            onClick={() => onPrintInvoice(inv, 'a4')}
                            className="btn-outline"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Print Full Official A4 Invoice / Estimate"
                          >
                            <FileText size={12} />
                            <span>A4</span>
                          </button>

                          {/* WHATSAPP CONFIRMATION */}
                          {inv.customerPhone && (
                            <a
                              href={`https://wa.me/91${inv.customerPhone}?text=${encodeURIComponent(
                                `Namaste ${inv.customerName}, Thank you for visiting ALZINO Bodhan! Your Invoice #${inv.invoiceNo} for Rs.${inv.grandTotal} is recorded. Visit again!`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-outline"
                              style={{ padding: '0.3rem 0.5rem', color: '#10B981', display: 'flex', alignItems: 'center' }}
                              title="Send WhatsApp confirmation to customer"
                            >
                              <Share2 size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* EDIT INVOICE MODAL                                                        */}
      {/* ========================================================================= */}
      {editingInvoiceModal && invoiceToEdit && (
        <div 
          className="drawer-overlay" 
          onClick={() => setEditingInvoiceModal(false)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: '1rem' }}
        >
          <div 
            className="illoca-card animate-fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '680px', 
              width: '100%', 
              maxHeight: '92vh', 
              overflowY: 'auto',
              padding: '1.5rem', 
              background: 'var(--surface-primary)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-accent)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit2 size={18} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                    Edit Invoice Data — #{invoiceToEdit.invoiceNo}
                  </h3>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Update customer name, contact details, item titles, prices, serials, and warranty terms.
                </div>
              </div>
              <button onClick={() => setEditingInvoiceModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            {/* Customer Details Editing */}
            <div style={{ background: 'var(--surface-card)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-primary)' }}>
                Customer Information on Bill
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    value={invoiceToEdit.customerName}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, customerName: e.target.value })}
                    required
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Customer Mobile Number *
                  </label>
                  <input
                    type="text"
                    value={invoiceToEdit.customerPhone || ''}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, customerPhone: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={invoiceToEdit.customerAddress || ''}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, customerAddress: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Customer GSTIN
                  </label>
                  <input
                    type="text"
                    value={invoiceToEdit.customerGstin || ''}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, customerGstin: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Editing */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-primary)' }}>
                Invoice Items & Pricing
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {invoiceToEdit.items.map((item, idx) => (
                  <div key={idx} style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--surface-primary)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Item Title</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...invoiceToEdit.items];
                            newItems[idx].name = e.target.value;
                            setInvoiceToEdit({ ...invoiceToEdit, items: newItems });
                          }}
                          className="input-field"
                          style={{ fontSize: '0.8rem', fontWeight: 600 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rate / Price (₹)</label>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => {
                            const newItems = [...invoiceToEdit.items];
                            newItems[idx].rate = parseFloat(e.target.value) || 0;
                            setInvoiceToEdit({ ...invoiceToEdit, items: newItems });
                          }}
                          className="input-field"
                          style={{ fontSize: '0.8rem', fontWeight: 700 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Quantity</label>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...invoiceToEdit.items];
                            newItems[idx].qty = parseInt(e.target.value, 10) || 1;
                            setInvoiceToEdit({ ...invoiceToEdit, items: newItems });
                          }}
                          className="input-field"
                          style={{ fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IMEI(s) / Serial (Comma separated)</label>
                        <input
                          type="text"
                          value={(item.imeis && item.imeis.join(', ')) || ''}
                          onChange={(e) => {
                            const newItems = [...invoiceToEdit.items];
                            newItems[idx].imeis = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            setInvoiceToEdit({ ...invoiceToEdit, items: newItems });
                          }}
                          className="input-field"
                          style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Warranty Term</label>
                        <input
                          type="text"
                          value={item.warranty || ''}
                          onChange={(e) => {
                            const newItems = [...invoiceToEdit.items];
                            newItems[idx].warranty = e.target.value;
                            setInvoiceToEdit({ ...invoiceToEdit, items: newItems });
                          }}
                          className="input-field"
                          style={{ fontSize: '0.75rem' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Remarks & Payment Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Invoice Notes / Terms
                </label>
                <textarea
                  value={invoiceToEdit.notes || ''}
                  onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, notes: e.target.value })}
                  rows={2}
                  className="input-field"
                  style={{ fontSize: '0.78rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Payment Mode
                </label>
                <select
                  value={invoiceToEdit.paymentMode}
                  onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, paymentMode: e.target.value })}
                  className="input-field"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Khata">Khata (Credit)</option>
                </select>

                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginTop: '0.4rem', marginBottom: '0.25rem' }}>
                  Discount (₹)
                </label>
                <input
                  type="number"
                  value={invoiceToEdit.discount || 0}
                  onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, discount: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              <button 
                type="button" 
                onClick={() => setEditingInvoiceModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>

              <button 
                type="button" 
                onClick={() => handleSaveInvoiceEdit()}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={15} />
                <span>Save Changes</span>
              </button>

              <button 
                type="button" 
                onClick={() => handleSaveInvoiceEdit('thermal')}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={15} />
                <span>Save & Print Thermal</span>
              </button>

              <button 
                type="button" 
                onClick={() => handleSaveInvoiceEdit('a4')}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#10B981', borderColor: '#10B981' }}
              >
                <FileText size={15} />
                <span>Save & Print A4</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
