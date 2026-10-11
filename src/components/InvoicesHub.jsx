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
  ChevronDown,
  Eye,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function InvoicesHub({ 
  invoices = [], 
  setInvoices = () => {}, 
  customers = [],
  setCustomers = () => {},
  shopConfig = {}, 
  onPrintInvoice = () => {},
  onNavigateTab = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'pos' | 'refurb' | 'repair' | 'gst' | 'non-gst'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'month'

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Edit Invoice Modal State
  const [editingInvoiceModal, setEditingInvoiceModal] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);

  // View Invoice Modal State
  const [selectedViewInvoice, setSelectedViewInvoice] = useState(null);

  // Customer Profile Modal State (from Customer page)
  const [selectedCustomerModal, setSelectedCustomerModal] = useState(null);

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

  // 1-Click Bill Download in HTML/Printable format
  const handleDownloadInvoice = (inv) => {
    if (!inv) return;
    
    const itemsRows = (inv.items || []).map((it, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
          <strong style="color: #0f172a;">${it.name}</strong>
          ${it.imeis && it.imeis.length > 0 ? `<div style="font-size: 11px; color: #64748b; font-family: monospace;">IMEI/Ref: ${it.imeis.join(', ')}</div>` : ''}
          ${it.warranty ? `<div style="font-size: 11px; color: #4338ca;">🛡️ Warranty: ${it.warranty}</div>` : ''}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.qty || 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">₹${Number(it.rate || it.total || 0).toLocaleString('en-IN')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 700;">₹${Number(it.total || 0).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${inv.invoiceNo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 32px; color: #0f172a; max-width: 820px; margin: 0 auto; background: #fff; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
    .meta { font-size: 12px; color: #475569; margin-top: 3px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #e0e7ff; color: #3730a3; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f8fafc; text-align: left; padding: 10px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; color: #334155; }
    .summary-box { float: right; width: 300px; margin-top: 10px; font-size: 14px; }
    .summary-row { display: flex; justify-content: space-between; padding: 5px 0; color: #334155; }
    .total-row { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-weight: 800; font-size: 17px; padding: 8px 0; margin-top: 6px; color: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">${shopConfig?.name || 'ALZINO'}</h1>
      <div class="meta">${shopConfig?.tagline || 'Smart Mobiles • Used Devices • Electronics • Repairing Lab'}</div>
      <div class="meta">${shopConfig?.address || 'Station Road, Bodhan, Telangana - 503185'}</div>
      <div class="meta">Ph: ${shopConfig?.phone || '+91 91212 12292'} ${shopConfig?.gstin ? `| GSTIN: ${shopConfig.gstin}` : ''}</div>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; font-size: 18px; color: #1e1b4b; font-weight: 800;">${inv.invoiceType || (inv.isNonGst ? 'Cash Memo' : 'Tax Invoice')}</h2>
      <div class="badge">BILL #: ${inv.invoiceNo}</div>
      <div class="meta"><strong>Date:</strong> ${inv.date}</div>
      <div class="meta"><strong>Payment:</strong> ${inv.paymentMode}</div>
    </div>
  </div>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between;">
    <div>
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b;">Customer Details</div>
      <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${inv.customerName || 'Counter Customer'}</div>
      <div style="font-size: 13px; color: #475569; font-family: monospace;">Ph: ${inv.customerPhone || 'N/A'}</div>
      ${inv.customerAddress ? `<div style="font-size: 12px; color: #64748b;">${inv.customerAddress}</div>` : ''}
    </div>
    ${inv.customerGstin ? `
    <div style="text-align: right;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b;">GSTIN</div>
      <div style="font-size: 13px; font-weight: 700; font-family: monospace;">${inv.customerGstin}</div>
    </div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th>Item & Description</th>
        <th style="text-align: center; width: 60px;">Qty</th>
        <th style="text-align: right; width: 110px;">Rate</th>
        <th style="text-align: right; width: 120px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div style="overflow: hidden;">
    <div class="summary-box">
      <div class="summary-row">
        <span>Subtotal:</span>
        <span style="font-family: monospace;">₹${Number(inv.taxableAmount || inv.subtotal || inv.grandTotal).toLocaleString('en-IN')}</span>
      </div>
      ${inv.discount > 0 ? `
      <div class="summary-row" style="color: #047857;">
        <span>Discount:</span>
        <span style="font-family: monospace;">-₹${Number(inv.discount).toLocaleString('en-IN')}</span>
      </div>` : ''}
      ${!inv.isNonGst && inv.cgstTotal > 0 ? `
      <div class="summary-row">
        <span>CGST (9%):</span>
        <span style="font-family: monospace;">₹${Number(inv.cgstTotal).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>SGST (9%):</span>
        <span style="font-family: monospace;">₹${Number(inv.sgstTotal).toLocaleString('en-IN')}</span>
      </div>` : ''}
      <div class="summary-row total-row">
        <span>Grand Total:</span>
        <span style="font-family: monospace;">₹${Number(inv.grandTotal).toLocaleString('en-IN')}</span>
      </div>
      ${inv.advancePaid > 0 ? `
      <div class="summary-row" style="color: #64748b;">
        <span>Advance Paid:</span>
        <span style="font-family: monospace;">-₹${Number(inv.advancePaid).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row" style="font-weight: 700; color: #047857;">
        <span>Balance Collected:</span>
        <span style="font-family: monospace;">₹${Number(inv.balanceCollectedNow ?? (inv.grandTotal - inv.advancePaid)).toLocaleString('en-IN')}</span>
      </div>` : ''}
      ${inv.khataDue > 0 ? `
      <div class="summary-row" style="color: #dc2626; font-weight: 800;">
        <span>Balance Due (Khata):</span>
        <span style="font-family: monospace;">₹${Number(inv.khataDue).toLocaleString('en-IN')}</span>
      </div>` : ''}
    </div>
  </div>

  ${inv.warrantyNotes ? `
  <div style="margin-top: 32px; font-size: 12px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 12px;">
    <strong>Warranty Terms:</strong> ${inv.warrantyNotes}
  </div>` : ''}

  <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 12px;">
    Thank you for your business! • Generated by ${shopConfig?.name || 'ALZINO'} ERP & POS
  </div>
</body>
</html>`;

    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${inv.invoiceNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`✓ Invoice ${inv.invoiceNo} downloaded successfully!`);
  };

  // Open Customer details stored in Customer page
  const handleOpenCustomerProfile = (inv) => {
    const custPhone = (inv.customerPhone || '').replace(/\D/g, '');
    const custName = (inv.customerName || '').toLowerCase().trim();

    const matched = customers.find(c => {
      if (custPhone && c.phone && c.phone.replace(/\D/g, '') === custPhone) return true;
      if (custName && c.name && c.name.toLowerCase().trim() === custName) return true;
      return false;
    });

    if (matched) {
      setSelectedCustomerModal(matched);
    } else {
      setSelectedCustomerModal({
        id: `CUST-${inv.customerPhone ? inv.customerPhone.replace(/\D/g, '').slice(-4) : 'WALKIN'}`,
        name: inv.customerName || 'Counter Customer',
        phone: inv.customerPhone || 'N/A',
        address: inv.customerAddress || 'Bodhan, Telangana',
        gstin: inv.customerGstin || '',
        totalSpent: inv.grandTotal || 0,
        balanceDue: inv.khataDue || 0,
        isNew: true
      });
    }
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
                        <div style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {/* VIEW BILL BUTTON */}
                          <button
                            onClick={() => setSelectedViewInvoice(inv)}
                            className="btn-primary"
                            style={{ padding: '0.28rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Open full bill to view items, totals, and details"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>

                          {/* CUSTOMER PROFILE BUTTON */}
                          <button
                            onClick={() => handleOpenCustomerProfile(inv)}
                            className="btn-secondary"
                            style={{ padding: '0.28rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="View customer profile and Khata data stored in customer page"
                          >
                            <User size={12} color="var(--accent-primary)" />
                            <span>Customer</span>
                          </button>

                          {/* DOWNLOAD BUTTON */}
                          <button
                            onClick={() => handleDownloadInvoice(inv)}
                            className="btn-outline"
                            style={{ padding: '0.28rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Download invoice as formatted printable document"
                          >
                            <Download size={12} color="#10B981" />
                            <span>Download</span>
                          </button>

                          {/* REPRINT THERMAL */}
                          <button
                            onClick={() => onPrintInvoice(inv, 'thermal')}
                            className="btn-outline"
                            style={{ padding: '0.28rem 0.45rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            title="Print 3-inch 80mm POS Receipt"
                          >
                            <Printer size={12} />
                            <span>Thermal</span>
                          </button>

                          {/* REPRINT A4 */}
                          <button
                            onClick={() => onPrintInvoice(inv, 'a4')}
                            className="btn-outline"
                            style={{ padding: '0.28rem 0.45rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            title="Print Full Official A4 Invoice / Estimate"
                          >
                            <FileText size={12} />
                            <span>A4</span>
                          </button>

                          {/* EDIT DATA BUTTON */}
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            className="btn-secondary"
                            style={{ padding: '0.28rem 0.45rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center' }}
                            title="Edit customer name, phone, item price, or warranty"
                          >
                            <Edit2 size={12} color="var(--accent-primary)" />
                          </button>

                          {/* WHATSAPP CONFIRMATION */}
                          {inv.customerPhone && (
                            <a
                              href={`https://wa.me/91${inv.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Namaste ${inv.customerName || 'Customer'}, Thank you for visiting ALZINO Bodhan! Your Invoice #${inv.invoiceNo} for Rs.${inv.grandTotal} is recorded. Visit again!`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-outline"
                              style={{ padding: '0.28rem 0.4rem', color: '#10B981', display: 'flex', alignItems: 'center' }}
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

      {/* ========================================================================= */}
      {/* INVOICE DETAILS VIEW MODAL (OPEN TO VIEW WITH DOWNLOAD & CUSTOMER DATA)   */}
      {/* ========================================================================= */}
      {selectedViewInvoice && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1200 }}>
          <div 
            className="illoca-card animate-fade-in" 
            style={{ 
              width: '95%', 
              maxWidth: '750px', 
              maxHeight: '90vh', 
              borderRadius: '12px', 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'var(--surface-primary)', 
              overflow: 'hidden',
              boxShadow: '0 20px 48px rgba(0,0,0,0.4)',
              border: '1px solid var(--border-color)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.9rem 1.25rem',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <Receipt size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                    Invoice {selectedViewInvoice.invoiceNo}
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    {selectedViewInvoice.invoiceType || (selectedViewInvoice.isNonGst ? 'Cash Memo' : 'Tax Invoice')} • {selectedViewInvoice.date}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(selectedViewInvoice)}
                  className="btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Download size={13} />
                  <span>Download Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedViewInvoice(null)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFFFFF',
                    width: '30px',
                    height: '30px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Customer Box */}
              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Customer Information</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '2px' }}>
                    {selectedViewInvoice.customerName || 'Counter Customer'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    Ph: {selectedViewInvoice.customerPhone || 'N/A'} {selectedViewInvoice.customerGstin ? `• GSTIN: ${selectedViewInvoice.customerGstin}` : ''}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenCustomerProfile(selectedViewInvoice);
                  }}
                  className="btn-secondary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <User size={13} color="var(--accent-primary)" />
                  <span>View Customer Page Data</span>
                </button>
              </div>

              {/* Items List Table */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.55rem 0.65rem' }}>#</th>
                      <th style={{ padding: '0.55rem 0.65rem' }}>Item & Specifications</th>
                      <th style={{ padding: '0.55rem 0.65rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.55rem 0.65rem', textAlign: 'right' }}>Rate</th>
                      <th style={{ padding: '0.55rem 0.65rem', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedViewInvoice.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '0.55rem 0.65rem' }}>
                          <strong style={{ display: 'block', fontSize: '0.85rem' }}>{it.name}</strong>
                          {it.imeis && it.imeis.length > 0 && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              IMEI: {it.imeis.join(', ')}
                            </span>
                          )}
                          {it.warranty && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>
                              🛡️ {it.warranty}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center' }}>{it.qty || 1}</td>
                        <td style={{ padding: '0.55rem 0.65rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          ₹{Number(it.rate || it.total || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          ₹{Number(it.total || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Payment Summary Box */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                background: 'var(--surface-secondary)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div><strong>Payment Mode:</strong> <span className="mono-tag" style={{ marginLeft: '4px' }}>{selectedViewInvoice.paymentMode}</span></div>
                  {selectedViewInvoice.paymentRef && <div><strong>Reference #:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedViewInvoice.paymentRef}</span></div>}
                  {selectedViewInvoice.notes && <div style={{ color: 'var(--text-muted)' }}><strong>Notes:</strong> {selectedViewInvoice.notes}</div>}
                  {selectedViewInvoice.warrantyNotes && <div style={{ color: 'var(--accent-primary)' }}><strong>Warranty:</strong> {selectedViewInvoice.warrantyNotes}</div>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(selectedViewInvoice.taxableAmount || selectedViewInvoice.subtotal || selectedViewInvoice.grandTotal).toLocaleString('en-IN')}</strong>
                  </div>
                  {selectedViewInvoice.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-green)' }}>
                      <span>Discount:</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>-₹{Number(selectedViewInvoice.discount).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  {!selectedViewInvoice.isNonGst && selectedViewInvoice.cgstTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>GST (CGST+SGST):</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{(Number(selectedViewInvoice.cgstTotal) + Number(selectedViewInvoice.sgstTotal)).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.2rem', color: 'var(--accent-primary)' }}>
                    <span>Grand Total:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(selectedViewInvoice.grandTotal).toLocaleString('en-IN')}</strong>
                  </div>
                  {selectedViewInvoice.advancePaid > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Advance Paid Earlier:</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>-₹{Number(selectedViewInvoice.advancePaid).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  {selectedViewInvoice.khataDue > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-red)', fontWeight: 800 }}>
                      <span>Khata Balance Due:</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(selectedViewInvoice.khataDue).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1.25rem',
              background: 'var(--surface-secondary)',
              borderTop: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={() => setSelectedViewInvoice(null)}
                className="btn-outline"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              >
                Close
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadInvoice(selectedViewInvoice);
                  }}
                  className="btn-secondary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Download size={14} color="#10B981" />
                  <span>Download File</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrintInvoice(selectedViewInvoice, 'thermal')}
                  className="btn-outline"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Printer size={14} />
                  <span>Thermal Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrintInvoice(selectedViewInvoice, 'a4')}
                  className="btn-primary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <FileText size={14} />
                  <span>Print A4</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOMER PROFILE POPUP MODAL (SHOWS DATA STORED IN CUSTOMER PAGE)         */}
      {/* ========================================================================= */}
      {selectedCustomerModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1300 }}>
          <div 
            className="illoca-card animate-fade-in" 
            style={{ 
              width: '95%', 
              maxWidth: '650px', 
              maxHeight: '88vh', 
              borderRadius: '12px', 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'var(--surface-primary)', 
              overflow: 'hidden',
              boxShadow: '0 20px 48px rgba(0,0,0,0.4)',
              border: '1px solid var(--border-color)'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.9rem 1.25rem',
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
              color: '#FFFFFF',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#6366F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800
                }}>
                  <User size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                    {selectedCustomerModal.name}
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#A5B4FC' }}>
                    Customer Profile & Khata Records
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lifetime Spend</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    ₹{Number(selectedCustomerModal.totalSpent || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Khata Balance Due</div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: (selectedCustomerModal.balanceDue || 0) > 0 ? 'var(--status-red)' : 'var(--status-green)',
                    marginTop: '2px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    ₹{Number(selectedCustomerModal.balanceDue || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Khata Status</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '4px', color: (selectedCustomerModal.balanceDue || 0) > 0 ? 'var(--status-red)' : 'var(--status-green)' }}>
                    {(selectedCustomerModal.balanceDue || 0) > 0 ? '⚠️ Payment Due' : '✓ Good Standing'}
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.82rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.65rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Customer ID</span>
                  <strong>{selectedCustomerModal.id || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Mobile Number</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedCustomerModal.phone || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Store Address / Location</span>
                  <span>{selectedCustomerModal.address || 'Bodhan, Telangana'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>GSTIN Number</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedCustomerModal.gstin || 'Unregistered Consumer'}</span>
                </div>
              </div>

              {/* Invoices by this Customer */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', fontWeight: 800 }}>
                  Order History for this Customer
                </h4>
                {invoices.filter(i => 
                  (selectedCustomerModal.phone && i.customerPhone && i.customerPhone.replace(/\D/g, '') === selectedCustomerModal.phone.replace(/\D/g, '')) ||
                  (selectedCustomerModal.name && i.customerName && i.customerName.toLowerCase() === selectedCustomerModal.name.toLowerCase())
                ).length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    No recorded order history yet.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '0.45rem 0.6rem' }}>Bill #</th>
                          <th style={{ padding: '0.45rem 0.6rem' }}>Date</th>
                          <th style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '0.45rem 0.6rem' }}>Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.filter(i => 
                          (selectedCustomerModal.phone && i.customerPhone && i.customerPhone.replace(/\D/g, '') === selectedCustomerModal.phone.replace(/\D/g, '')) ||
                          (selectedCustomerModal.name && i.customerName && i.customerName.toLowerCase() === selectedCustomerModal.name.toLowerCase())
                        ).map((histInv, hIdx) => (
                          <tr key={hIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.45rem 0.6rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{histInv.invoiceNo}</td>
                            <td style={{ padding: '0.45rem 0.6rem', color: 'var(--text-secondary)' }}>{histInv.date}</td>
                            <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{Number(histInv.grandTotal).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '0.45rem 0.6rem' }}><span className="mono-tag" style={{ fontSize: '0.68rem' }}>{histInv.paymentMode}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1.25rem',
              background: 'var(--surface-secondary)',
              borderTop: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={() => setSelectedCustomerModal(null)}
                className="btn-outline"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              >
                Close
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedCustomerModal.phone && (
                  <a
                    href={`https://wa.me/91${selectedCustomerModal.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Namaste ${selectedCustomerModal.name}, from ALZINO Bodhan! Your account status: Total Spent: Rs.${selectedCustomerModal.totalSpent || 0}, Current Khata Balance: Rs.${selectedCustomerModal.balanceDue || 0}. Thank you!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <span>💬 WhatsApp Statement</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerModal(null);
                    if (onNavigateTab) onNavigateTab('customers');
                  }}
                  className="btn-primary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <ExternalLink size={13} />
                  <span>Open in Customer Page</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
