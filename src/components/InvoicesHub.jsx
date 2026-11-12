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
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

const isMobileStockCategory = category => {
  const value = String(category || '').trim().toLowerCase();
  return ['new mobiles', 'used mobiles', 'feature phones', 'mobile', 'mobiles'].includes(value) || /smartphone|feature phone|handset/.test(value);
};

export default function InvoicesHub({ 
  invoices = [], 
  setInvoices = () => {}, 
  customers = [],
  setCustomers = () => {},
  role = 'cashier',
  shopConfig = {}, 
  onPrintInvoice = () => {},
  onNavigateTab = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // invoice register filters
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'month'

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Edit Invoice Modal State
  const [editingInvoiceModal, setEditingInvoiceModal] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);

  // View Invoice Modal State
  const [selectedViewInvoice, setSelectedViewInvoice] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMode, setCollectMode] = useState('Cash');
  const [collectReference, setCollectReference] = useState('');

  // Customer Profile Modal State (from Customer page)
  const [selectedCustomerModal, setSelectedCustomerModal] = useState(null);

  // Toast message
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const getInvoiceBalance = invoice => Math.max(0, Number(invoice?.balanceDue ?? invoice?.khataDue ?? 0));

  const handleCollectBalance = invoice => {
    const due = getInvoiceBalance(invoice);
    const amount = Number(collectAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > due) {
      showToast(`Enter an amount between ₹1 and ₹${due.toLocaleString('en-IN')}.`);
      return;
    }
    if (collectMode !== 'Cash' && !collectReference.trim()) {
      showToast(`Enter the ${collectMode} transaction or approval reference.`);
      return;
    }
    const newDue = due - amount;
    const updatedInvoice = {
      ...invoice,
      paidAmount: Number(invoice.paidAmount || 0) + amount,
      balanceDue: newDue,
      khataDue: newDue,
      paymentStatus: newDue > 0 ? 'PARTIAL' : 'PAID',
      payments: [...(invoice.payments || []), { id: `PAY-${Date.now()}`, date: new Date().toISOString(), amount, mode: collectMode, reference: collectReference.trim() }]
    };
    setInvoices(prev => prev.map(row => row.invoiceNo === invoice.invoiceNo ? updatedInvoice : row));
    if (invoice.customerPhone) {
      const phone = invoice.customerPhone.replace(/\D/g, '');
      setCustomers(prev => prev.map(customer => customer.phone?.replace(/\D/g, '') === phone
        ? { ...customer, balanceDue: Math.max(0, Number(customer.balanceDue || 0) - amount) }
        : customer));
    }
    setSelectedViewInvoice(updatedInvoice);
    setCollectAmount('');
    setCollectReference('');
    showToast(`₹${amount.toLocaleString('en-IN')} received for ${invoice.invoiceNo}.`);
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
      if (typeFilter === 'returns' && !(inv.returnTransactions || []).some(entry => entry.status !== 'voided')) return false;

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
        ...(inv.items || []).map(it => `${it.name} ${it.imeis ? it.imeis.join(' ') : ''} ${it.warranty || ''}`),
        ...(inv.returnTransactions || []).filter(entry => entry.status !== 'voided').map(entry => `${entry.type} return replacement ${entry.originalProductName || ''} ${entry.replacements?.map(line => line.productName).join(' ') || entry.replacement?.productName || ''}`)
      ].join(' ').toLowerCase();

      return words.every(w => haystack.includes(w));
    });
  }, [invoices, typeFilter, dateFilter, searchTerm, todayStr, currentMonthStr]);

  // Overall Financial Stats
  const totalBilled = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  const totalProfit = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.totalProfit) || 0), 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
  const totalDueKhata = filteredInvoices.reduce((sum, inv) => sum + getInvoiceBalance(inv), 0);

  // Breakdown by Category
  const posCount = invoices.filter(i => !i.isRefurbishedResale && !i.isRepairInvoice).length;
  const refurbCount = invoices.filter(i => i.isRefurbishedResale || (i.items && i.items.some(it => it.category === 'Used Mobiles'))).length;
  const repairCount = invoices.filter(i => i.isRepairInvoice || i.repairJobRef || (i.items && i.items.some(it => it.category === 'Repair Services'))).length;
  const returnsCount = invoices.filter(invoice => (invoice.returnTransactions || []).some(entry => entry.status !== 'voided')).length;

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

    const originalInvoice = invoices.find(invoice => invoice.invoiceNo === invoiceToEdit.invoiceNo) || invoiceToEdit;
    const previousDue = getInvoiceBalance(originalInvoice);
    const existingPaid = Number(invoiceToEdit.paidAmount ?? (originalInvoice.paymentMode === 'Khata' ? 0 : originalInvoice.grandTotal)) || 0;
    const paid = Math.min(grand, Math.max(0, existingPaid));
    const khata = invoiceToEdit.emiDetails || String(invoiceToEdit.paymentMode || '').startsWith('EMI')
      ? 0
      : Math.max(0, grand - paid);

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
      balanceDue: khata,
      khataDue: khata,
      paymentStatus: invoiceToEdit.emiDetails || String(invoiceToEdit.paymentMode || '').startsWith('EMI')
        ? 'EMI_SANCTIONED'
        : (khata > 0 ? 'PARTIAL' : 'PAID'),
      totalProfit: invoiceToEdit.items.reduce((s, it) => s + ((Number(it.rate) - (Number(it.buyPrice) || 0)) * Number(it.qty)), 0) - disc
    };

    setInvoices(prev => prev.map(inv => inv.invoiceNo === updatedInvoice.invoiceNo ? updatedInvoice : inv));

    // Update customer if exists
    if (updatedInvoice.customerPhone) {
      setCustomers(prev => prev.map(c => {
        if (c.phone && c.phone.replace(/\D/g, '') === updatedInvoice.customerPhone.replace(/\D/g, '')) {
          const updatedCustomerDue = Math.max(0, Number(c.balanceDue || 0) + khata - previousDue);
          return {
            ...c,
            balanceDue: updatedCustomerDue,
            totalSpent: Math.max(0, Number(c.totalSpent || 0) + grand - (Number(originalInvoice.grandTotal) || 0)),
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
          ${it.imeis && it.imeis.length > 0 ? `<div style="font-size: 11px; color: #64748b; font-family: monospace;">${isMobileStockCategory(it.category) ? 'IMEI' : 'Serial No.'}: ${it.imeis.join(', ')}</div>` : ''}
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
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice - ${inv.invoiceNo}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; width: 100%; max-width: 820px; margin: 0 auto; background: #fff; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
    .alzino-wordmark { display: flex; align-items: center; gap: 2px; color: #0F251E; font-size: 26px; line-height: 1; font-weight: 900; letter-spacing: -0.04em; margin-bottom: 5px; }
    .alzino-wordmark svg { width: 28px; height: 28px; flex: 0 0 auto; }
    .meta { font-size: 12px; color: #475569; margin-top: 3px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #e0e7ff; color: #3730a3; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; table-layout: fixed; }
    td { overflow-wrap: anywhere; }
    th { background: #f8fafc; text-align: left; padding: 10px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; color: #334155; }
    .summary-box { float: right; width: min(300px, 100%); margin-top: 10px; font-size: 14px; }
    .summary-row { display: flex; justify-content: space-between; padding: 5px 0; color: #334155; }
    .total-row { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-weight: 800; font-size: 17px; padding: 8px 0; margin-top: 6px; color: #0f172a; }
    @media screen and (max-width: 600px) {
      body { padding: 16px; }
      .header { flex-wrap: wrap; gap: 12px; }
      .header > div { min-width: 0; max-width: 100%; }
      .title { font-size: 22px; overflow-wrap: anywhere; }
      table { font-size: 11px; }
      th, td { padding: 5px 3px !important; }
      .summary-box { width: 100%; }
    }
    @page { size: A4; margin: 8mm; }
    @media print {
      body { width: 100%; max-width: none; padding: 3mm; zoom: .92; }
      .header, table, tr, .summary-box, .total-row { break-inside: avoid-page; page-break-inside: avoid; }
      table { font-size: 9px; margin: 3mm 0; }
      th, td { padding: 4px !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="alzino-wordmark" aria-label="ALZINO"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#0F251E" d="M15.8 2.2 2.5 28.5h5.7l3.9-7.7h7.4l3.9 7.7h5.7L15.8 2.2Zm0 9 2.3 5.3h-4.6l2.3-5.3Z"/><path fill="#C99A20" d="M4.2 24.2C8.6 20.8 15.2 13.8 29.8 9.2 21.4 13.2 14.8 19.4 6.8 26.5c-1 .9-2-.3-2.6-2.3Z"/></svg><span>LZINO</span></div>
      ${shopConfig?.name && shopConfig.name.trim().toUpperCase() !== 'ALZINO' ? `<h1 class="title">${shopConfig.name}<