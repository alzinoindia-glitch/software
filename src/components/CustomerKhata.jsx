import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  IndianRupee, 
  Share2, 
  CreditCard, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Phone,
  Printer,
  History,
  QrCode,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  ExternalLink,
  Wrench,
  ShoppingBag,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Filter,
  Eye,
  RefreshCw,
  MessageSquare,
  Check,
  Layers,
  LayoutGrid,
  List
} from 'lucide-react';
import { getUpiQrUrl } from '../utils/barcode';
import { openWhatsAppKhataReminder } from '../utils/whatsappAutomation';

export default function CustomerKhata({ 
  initialView = 'customers',
  customers = [], 
  setCustomers = () => {}, 
  suppliers = [],
  setSuppliers = () => {},
  invoices = [],
  repairJobs = [],
  shopConfig = {},
  onPrintKhataStatement = () => {},
  onPrintInvoice = () => {},
  onPrintRepairSlip = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(initialView === 'khata' ? 'due' : 'all'); // all | both | sales | repairs | due
  const [viewLayout, setViewLayout] = useState('table'); // table | cards
  const [showAddModal, setShowAddModal] = useState(false);
  const [portalEntity, setPortalEntity] = useState('customers');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierCity, setNewSupplierCity] = useState('');
  const [newSupplierGstin, setNewSupplierGstin] = useState('');
  
  // Payment Modal state
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI'); // UPI | Cash | Bank
  const [paymentUtr, setPaymentUtr] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Customer Statement / Full Profile Modal state
  const [statementCustomer, setStatementCustomer] = useState(null);
  const [profileActiveTab, setProfileActiveTab] = useState('dual'); // dual | sales | repairs | ledger

  // Dynamic UPI QR Modal state
  const [qrCustomer, setQrCustomer] = useState(null);

  // New customer form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newGstin, setNewGstin] = useState('');

  // ---------------------------------------------------------------------------
  // Helper: Normalize 10-digit Phone
  // ---------------------------------------------------------------------------
  const normalizePhone = (p) => {
    if (!p) return '';
    const digits = String(p).replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };

  // ---------------------------------------------------------------------------
  // UNIFIED CUSTOMER ENGINE: Aggregate across CRM + Sales Invoices + Repair Jobs
  // ---------------------------------------------------------------------------
  const unifiedCustomers = useMemo(() => {
    const map = new Map();

    // 1. Seed from registered customers CRM
    customers.forEach((c, idx) => {
      const pNorm = normalizePhone(c.phone);
      const key = pNorm ? `p_${pNorm}` : `n_${(c.name || 'cust').trim().toLowerCase()}`;
      map.set(key, {
        id: c.id || `CUST-${String(idx + 1).padStart(3, '0')}`,
        name: c.name || 'Customer',
        phone: c.phone || '',
        address: c.address || 'Bodhan, Telangana',
        gstin: c.gstin || '',
        totalSpent: Number(c.totalSpent) || 0,
        balanceDue: Number(c.balanceDue) || 0,
        createdAt: c.createdAt || new Date().toISOString().split('T')[0],
        invoices: [],
        repairs: [],
        isFromCrm: true
      });
    });

    // 2. Aggregate from Sales Invoices
    invoices.forEach(inv => {
      const pNorm = normalizePhone(inv.customerPhone || inv.phone);
      const name = (inv.customerName || 'Customer').trim();
      const key = pNorm ? `p_${pNorm}` : `n_${name.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          id: `CUST-S-${String(map.size + 1).padStart(3, '0')}`,
          name: name,
          phone: inv.customerPhone || inv.phone || '',
          address: inv.customerAddress || 'Bodhan, Telangana',
          gstin: inv.customerGstin || '',
          totalSpent: 0,
          balanceDue: 0,
          createdAt: inv.date || new Date().toISOString().split('T')[0],
          invoices: [],
          repairs: [],
          isFromCrm: false
        });
      }

      const rec = map.get(key);
      if (!rec.name || rec.name === 'Customer') rec.name = name;
      if (!rec.phone && (inv.customerPhone || inv.phone)) rec.phone = inv.customerPhone || inv.phone;
      if ((!rec.address || rec.address === 'Bodhan, Telangana') && inv.customerAddress) rec.address = inv.customerAddress;
      if (!rec.gstin && inv.customerGstin) rec.gstin = inv.customerGstin;
      
      // Avoid duplicate invoices in list
      if (!rec.invoices.some(i => (i.invoiceNo && i.invoiceNo === inv.invoiceNo) || (i.id && i.id === inv.id))) {
        rec.invoices.push(inv);
      }
    });

    // 3. Aggregate from Repair Jobs
    repairJobs.forEach(rep => {
      const pNorm = normalizePhone(rep.customerMobile || rep.customerPhone);
      const name = (rep.customerName || 'Customer').trim();
      const key = pNorm ? `p_${pNorm}` : `n_${name.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          id: `CUST-R-${String(map.size + 1).padStart(3, '0')}`,
          name: name,
          phone: rep.customerMobile || rep.customerPhone || '',
          address: 'Bodhan, Telangana',
          gstin: '',
          totalSpent: 0,
          balanceDue: 0,
          createdAt: rep.date || new Date().toISOString().split('T')[0],
          invoices: [],
          repairs: [],
          isFromCrm: false
        });
      }

      const rec = map.get(key);
      if (!rec.name || rec.name === 'Customer') rec.name = name;
      if (!rec.phone && (rep.customerMobile || rep.customerPhone)) rec.phone = rep.customerMobile || rep.customerPhone;
      
      // Avoid duplicate repairs in list
      if (!rec.repairs.some(r => r.id === rep.id)) {
        rec.repairs.push(rep);
      }
    });

    // 4. Compute relations, classifications, smart ID and financials
    const list = Array.from(map.values()).map(rec => {
      const hasPurchases = rec.invoices.length > 0;
      const hasRepairs = rec.repairs.length > 0;
      
      let type = 'registered';
      if (hasPurchases && hasRepairs) type = 'both';
      else if (hasPurchases) type = 'sales';
      else if (hasRepairs) type = 'repairs';

      // Smart ID formatting showing relation
      let smartId = rec.id;
      if (smartId.startsWith('CUST-') && !smartId.includes('-SR-') && !smartId.includes('-S-') && !smartId.includes('-R-')) {
        const numPart = smartId.replace('CUST-', '');
        if (type === 'both') smartId = `CUST-SR-${numPart}`;
        else if (type === 'sales') smartId = `CUST-S-${numPart}`;
        else if (type === 'repairs') smartId = `CUST-R-${numPart}`;
      }

      // Compute total lifetime spend
      const salesSpend = rec.invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      const repairSpend = rec.repairs.reduce((sum, rep) => sum + (Number(rep.finalPrice || rep.finalCost || rep.estimatedCost) || 0), 0);
      const computedTotal = salesSpend + repairSpend;
      const totalSpent = Math.max(rec.totalSpent, computedTotal);

      // Compute balance dues
      const salesDue = rec.invoices.reduce((sum, inv) => sum + (Number(inv.balanceDue || inv.khataDue) || 0), 0);
      const repairDue = rec.repairs.reduce((sum, rep) => {
        const cost = Number(rep.finalPrice || rep.finalCost || rep.estimatedCost) || 0;
        const advance = Number(rep.advancePaid) || 0;
        const remaining = Math.max(0, cost - advance);
        return sum + (rep.status !== 'Delivered' ? remaining : 0);
      }, 0);
      const computedDue = salesDue + repairDue;
      const balanceDue = rec.balanceDue > 0 ? rec.balanceDue : computedDue;

      return {
        ...rec,
        id: smartId,
        type,
        hasPurchases,
        hasRepairs,
        salesSpend,
        repairSpend,
        totalSpent,
        balanceDue
      };
    });

    // Sort by highest balance due first, then highest spend
    return list.sort((a, b) => (b.balanceDue - a.balanceDue) || (b.totalSpent - a.totalSpent));
  }, [customers, invoices, repairJobs]);

  // ---------------------------------------------------------------------------
  // Auto-sync unified customers back into CRM state so they are persistently stored
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unpersisted = unifiedCustomers.filter(u => !u.isFromCrm);
    if (unpersisted.length > 0) {
      setCustomers(prev => {
        const prevPhones = new Set(prev.map(c => normalizePhone(c.phone)).filter(Boolean));
        const prevNames = new Set(prev.map(c => (c.name || '').toLowerCase().trim()));

        const toAdd = unpersisted.filter(m => {
          const pNorm = normalizePhone(m.phone);
          if (pNorm && prevPhones.has(pNorm)) return false;
          if (prevNames.has((m.name || '').toLowerCase().trim())) return false;
          return true;
        }).map(m => ({
          id: m.id,
          name: m.name,
          phone: m.phone,
          address: m.address,
          gstin: m.gstin,
          totalSpent: m.totalSpent,
          balanceDue: m.balanceDue,
          createdAt: m.createdAt
        }));

        if (toAdd.length === 0) return prev;
        return [...prev, ...toAdd];
      });
    }
  }, [unifiedCustomers, setCustomers]);

  // ---------------------------------------------------------------------------
  // Filtered Customers based on Search Term & Type Filter
  // ---------------------------------------------------------------------------
  const filteredCustomers = useMemo(() => {
    let list = unifiedCustomers;

    // Filter by type
    if (typeFilter === 'both') {
      list = list.filter(c => c.type === 'both');
    } else if (typeFilter === 'sales') {
      list = list.filter(c => c.hasPurchases);
    } else if (typeFilter === 'repairs') {
      list = list.filter(c => c.hasRepairs);
    } else if (typeFilter === 'due') {
      list = list.filter(c => c.balanceDue > 0);
    }

    // Search query
    const q = searchTerm.toLowerCase().trim();
    if (!q) return list;

    return list.filter(c => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchId = c.id.toLowerCase().includes(q);
      const matchAddress = c.address && c.address.toLowerCase().includes(q);
      const matchInvoices = c.invoices.some(inv => 
        (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(q)) ||
        (inv.items && inv.items.some(it => it.name && it.name.toLowerCase().includes(q)))
      );
      const matchRepairs = c.repairs.some(rep => 
        (rep.id && rep.id.toLowerCase().includes(q)) ||
        (rep.deviceModel && rep.deviceModel.toLowerCase().includes(q))
      );
      return matchName || matchPhone || matchId || matchAddress || matchInvoices || matchRepairs;
    });
  }, [unifiedCustomers, searchTerm, typeFilter]);

  // KPI Totals
  const countTotal = unifiedCustomers.length;
  const countBoth = unifiedCustomers.filter(c => c.type === 'both').length;
  const countSales = unifiedCustomers.filter(c => c.hasPurchases).length;
  const countRepairs = unifiedCustomers.filter(c => c.hasRepairs).length;
  const countDue = unifiedCustomers.filter(c => c.balanceDue > 0).length;
  const totalReceivables = unifiedCustomers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);

  // ---------------------------------------------------------------------------
  // Build Chronological Ledger for Customer Statement Modal
  // ---------------------------------------------------------------------------
  const getCustomerLedger = (cust) => {
    if (!cust) return [];
    const entries = [];

    // Invoices
    cust.invoices.forEach(inv => {
      entries.push({
        id: inv.id || inv.invoiceNo,
        date: inv.date,
        type: 'INVOICE',
        refNo: inv.invoiceNo || 'INV-SALES',
        description: inv.items ? inv.items.map(it => it.name).join(', ') : 'Store Purchase',
        debit: Number(inv.grandTotal) || 0,
        credit: Number(inv.paidAmount) || 0,
        balanceChange: (Number(inv.grandTotal) || 0) - (Number(inv.paidAmount) || 0),
        mode: inv.paymentMode || 'Counter',
        raw: inv
      });
    });

    // Repairs
    cust.repairs.forEach(rep => {
      // Check if already represented in invoices
      const alreadyInvoiced = cust.invoices.some(inv => inv.repairJobRef === rep.id);
      if (!alreadyInvoiced) {
        const cost = Number(rep.finalPrice || rep.finalCost || rep.estimatedCost) || 0;
        const advance = Number(rep.advancePaid) || 0;
        entries.push({
          id: rep.id,
          date: rep.date,
          type: 'REPAIR',
          refNo: rep.id,
          description: `Repair: ${rep.deviceModel} (${rep.issues ? rep.issues.join(', ') : 'Service'})`,
          debit: cost,
          credit: advance,
          balanceChange: cost - advance,
          mode: rep.status === 'Delivered' ? 'Delivered' : `Repair (${rep.status})`,
          raw: rep
        });
      }
    });

    // Sort chronologically
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let runningBal = 0;
    return entries.map(item => {
      runningBal += item.balanceChange;
      return {
        ...item,
        runningBalance: runningBal
      };
    });
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      alert("Please provide customer name and phone number.");
      return;
    }

    const normalizedNewPhone = normalizePhone(newPhone);
    const existingCustomer = customers.find(customer => normalizePhone(customer.phone) === normalizedNewPhone && normalizedNewPhone);
    if (existingCustomer) {
      alert(`${existingCustomer.name} is already in the customer directory. Select that existing customer instead.`);
      return;
    }

    const newCust = {
      id: `CUST-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      address: newAddress.trim() || 'Bodhan, Telangana',
      gstin: newGstin.trim(),
      totalSpent: 0,
      balanceDue: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setCustomers(prev => [newCust, ...prev]);
    setShowAddModal(false);
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewGstin('');
  };

  const handleAddPortalSupplier = (e) => {
    e.preventDefault();
    if (!newSupplierName.trim() || !newSupplierPhone.trim()) {
      alert('Please provide a supplier name and phone number.');
      return;
    }
    const phone = normalizePhone(newSupplierPhone);
    const existingSupplier = suppliers.find(supplier => normalizePhone(supplier.phone) === phone && phone);
    if (existingSupplier) {
      alert(`${existingSupplier.name} is already in the supplier directory. Select that existing supplier instead.`);
      return;
    }
    setSuppliers(prev => [{
      id: `SUPP-${Date.now()}`,
      name: newSupplierName.trim(),
      contactPerson: newSupplierContact.trim(),
      phone: newSupplierPhone.trim(),
      city: newSupplierCity.trim(),
      gstin: newSupplierGstin.trim().toUpperCase(),
      balancePayable: 0,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setShowAddSupplierModal(false);
    setNewSupplierName('');
    setNewSupplierContact('');
    setNewSupplierPhone('');
    setNewSupplierCity('');
    setNewSupplierGstin('');
  };

  const filteredPortalSuppliers = suppliers.filter(supplier => {
    const query = searchTerm.trim().toLowerCase();
    return !query || [supplier.name, supplier.contactPerson, supplier.phone, supplier.city, supplier.gstin]
      .some(value => String(value || '').toLowerCase().includes(query));
  });

  const handleReceiveKhataPayment = (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    setCustomers(prev => prev.map(c => {
      const match = c.id === selectedCustomerForPayment.id || 
                    (c.phone && normalizePhone(c.phone) === normalizePhone(selectedCustomerForPayment.phone));
      if (match) {
        const newBal = Math.max(0, (c.balanceDue || 0) - amt);
        return {
          ...c,
          balanceDue: newBal
        };
      }
      return c;
    }));

    alert(`Received ₹${amt.toLocaleString()} via ${paymentMode} from ${selectedCustomerForPayment.name}. Account balance updated!`);
    setSelectedCustomerForPayment(null);
    setPaymentAmount('');
    setPaymentUtr('');
    setPaymentNote('');
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

  if (portalEntity === 'suppliers') {
    return (
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <div className="illoca-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Customer & Supplier Portal</h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Supplier records created here are shared with Suppliers & Payables and stock inward.</div>
          </div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-outline" onClick={() => { setPortalEntity('customers'); setSearchTerm(''); }}>Customers ({unifiedCustomers.length})</button>
            <button type="button" className="btn-primary" onClick={() => { setPortalEntity('suppliers'); setSearchTerm(''); }}>Suppliers ({suppliers.length})</button>
            <button type="button" className="btn-primary" onClick={() => setShowAddSupplierModal(true)}><Plus size={14} /> New Supplier</button>
          </div>
        </div>

        <div className="illoca-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ position: 'relative', maxWidth: '520px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-field" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search supplier name, phone, city, or GSTIN..." style={{ paddingLeft: '2rem' }} />
          </div>
          {filteredPortalSuppliers.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead><tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.6rem' }}>Supplier</th><th style={{ padding: '0.6rem' }}>Contact</th><th style={{ padding: '0.6rem' }}>Phone</th><th style={{ padding: '0.6rem' }}>City</th><th style={{ padding: '0.6rem' }}>GSTIN</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Payable</th>
                </tr></thead>
                <tbody>{filteredPortalSuppliers.map(supplier => (
                  <tr key={supplier.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.7rem 0.6rem', fontWeight: 700 }}>{supplier.name}</td><td style={{ padding: '0.7rem 0.6rem' }}>{supplier.contactPerson || '—'}</td><td style={{ padding: '0.7rem 0.6rem' }}>{supplier.phone || '—'}</td><td style={{ padding: '0.7rem 0.6rem' }}>{supplier.city || '—'}</td><td style={{ padding: '0.7rem 0.6rem' }}>{supplier.gstin || '—'}</td><td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>₹{(Number(supplier.balancePayable) || 0).toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{searchTerm ? 'No suppliers match your search.' : 'No suppliers added yet. Add a supplier here or from Suppliers & Payables.'}</div>}
        </div>

        {showAddSupplierModal && (
          <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
            <form onSubmit={handleAddPortalSupplier} className="illoca-card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '1.4rem', background: 'var(--surface-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><h3 style={{ margin: 0 }}>Add Supplier</h3><button type="button" className="btn-outline" onClick={() => setShowAddSupplierModal(false)}>✕</button></div>
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Supplier / Business Name *<input required className="input-field" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Business or supplier name" /></label>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Contact Person<input className="input-field" value={newSupplierContact} onChange={e => setNewSupplierContact(e.target.value)} placeholder="Contact person" /></label>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Mobile / Phone *<input required className="input-field" value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} placeholder="Supplier phone number" /></label>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>City<input className="input-field" value={newSupplierCity} onChange={e => setNewSupplierCity(e.target.value)} placeholder="City" /></label>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>GSTIN<input className="input-field" value={newSupplierGstin} onChange={e => setNewSupplierGstin(e.target.value.toUpperCase())} placeholder="Optional GSTIN" /></label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}><button type="button" className="btn-outline" onClick={() => setShowAddSupplierModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save Supplier</button></div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      
      {/* --------------------------------------------------------------------- */}
      {/* 1. TOP HEADER & HUD STATS                                              */}
      {/* --------------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Customers Directory
            </h2>
            <span style={{ 
              fontSize: '0.68rem', 
              fontFamily: 'var(--font-mono)', 
              fontWeight: 700, 
              padding: '0.2rem 0.5rem', 
              borderRadius: 'var(--radius-pill)',
              background: 'var(--badge-bg)',
              color: 'var(--badge-text)'
            }}>
              ADMIN PORTAL • /admin/customers
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Unified client records across Sales counter, Repairing Lab & Khata ledger
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => { setPortalEntity('customers'); setSearchTerm(''); }}
            className="btn-primary"
            style={{ padding: '0.42rem 0.85rem', fontSize: '0.8rem' }}
          >Customers ({unifiedCustomers.length})</button>
          <button
            type="button"
            onClick={() => { setPortalEntity('suppliers'); setSearchTerm(''); }}
            className="btn-outline"
            style={{ padding: '0.42rem 0.85rem', fontSize: '0.8rem' }}
          >Suppliers ({suppliers.length})</button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ padding: '0.42rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={14} />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. KPI METRIC STRIP (5 HUD Counters)                                   */}
      {/* --------------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
        
        {/* Total Customers */}
        <div 
          onClick={() => setTypeFilter('all')}
          style={{ 
            background: typeFilter === 'all' ? 'var(--surface-card-hover)' : 'var(--surface-primary)', 
            padding: '0.65rem 0.85rem', 
            borderRadius: 'var(--radius-sm)', 
            border: `1px solid ${typeFilter === 'all' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Total Clients</span>
            <Users size={12} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--text-primary)' }}>
            {countTotal}
          </div>
        </div>

        {/* Both Sales & Repairs (VIP) */}
        <div 
          onClick={() => setTypeFilter('both')}
          style={{ 
            background: typeFilter === 'both' ? 'var(--surface-card-hover)' : 'var(--surface-primary)', 
            padding: '0.65rem 0.85rem', 
            borderRadius: 'var(--radius-sm)', 
            border: `1px solid ${typeFilter === 'both' ? 'var(--status-teal)' : 'var(--border-color)'}`,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--status-teal)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>⭐ Sales & Repairs (Both)</span>
            <Sparkles size={12} color="var(--status-teal)" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--status-teal)' }}>
            {countBoth}
          </div>
        </div>

        {/* Sales Invoices Only */}
        <div 
          onClick={() => setTypeFilter('sales')}
          style={{ 
            background: typeFilter === 'sales' ? 'var(--surface-card-hover)' : 'var(--surface-primary)', 
            padding: '0.65rem 0.85rem', 
            borderRadius: 'var(--radius-sm)', 
            border: `1px solid ${typeFilter === 'sales' ? 'var(--status-blue)' : 'var(--border-color)'}`,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--status-blue)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>🛒 Sales Counter Clients</span>
            <ShoppingBag size={12} color="var(--status-blue)" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--status-blue)' }}>
            {countSales}
          </div>
        </div>

        {/* Repair Jobs Only */}
        <div 
          onClick={() => setTypeFilter('repairs')}
          style={{ 
            background: typeFilter === 'repairs' ? 'var(--surface-card-hover)' : 'var(--surface-primary)', 
            padding: '0.65rem 0.85rem', 
            borderRadius: 'var(--radius-sm)', 
            border: `1px solid ${typeFilter === 'repairs' ? 'var(--status-amber)' : 'var(--border-color)'}`,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--status-amber)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>🔧 Repair Lab Clients</span>
            <Wrench size={12} color="var(--status-amber)" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--status-amber)' }}>
            {countRepairs}
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div 
          onClick={() => setTypeFilter('due')}
          style={{ 
            background: typeFilter === 'due' ? 'var(--surface-card-hover)' : 'var(--surface-primary)', 
            padding: '0.65rem 0.85rem', 
            borderRadius: 'var(--radius-sm)', 
            border: `1px solid ${typeFilter === 'due' ? 'var(--status-red)' : 'var(--border-color)'}`,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--status-red)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>⚠️ Balance Due ({countDue})</span>
            <IndianRupee size={12} color="var(--status-red)" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--status-red)', fontFamily: 'var(--font-mono)' }}>
            ₹{totalReceivables.toLocaleString()}
          </div>
        </div>

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. FILTER TABS & SEARCH BAR                                            */}
      {/* --------------------------------------------------------------------- */}
      <div style={{ 
        background: 'var(--surface-primary)', 
        border: '1px solid var(--border-color)', 
        borderRadius: 'var(--radius-sm)', 
        padding: '0.55rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.6rem'
      }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'all', label: `All (${countTotal})` },
            { id: 'both', label: `⭐ Both (${countBoth})` },
            { id: 'sales', label: `🛒 Sales (${countSales})` },
            { id: 'repairs', label: `🔧 Repairs (${countRepairs})` },
            { id: 'due', label: `⚠️ Due (${countDue})` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              style={{
                padding: '0.28rem 0.65rem',
                fontSize: '0.74rem',
                fontWeight: typeFilter === f.id ? 700 : 500,
                borderRadius: 'var(--radius-pill)',
                border: typeFilter === f.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: typeFilter === f.id ? 'var(--badge-bg)' : 'transparent',
                color: typeFilter === f.id ? 'var(--badge-text)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 320px', maxWidth: '440px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Name, Phone/WhatsApp, Invoice #, Repair #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ 
                paddingLeft: '2rem', 
                fontSize: '0.8rem', 
                paddingTop: '0.35rem', 
                paddingBottom: '0.35rem',
                width: '100%'
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <button
              onClick={() => setViewLayout('table')}
              style={{
                padding: '0.35rem 0.5rem',
                background: viewLayout === 'table' ? 'var(--badge-bg)' : 'transparent',
                color: viewLayout === 'table' ? 'var(--badge-text)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer'
              }}
              title="Table View"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewLayout('cards')}
              style={{
                padding: '0.35rem 0.5rem',
                background: viewLayout === 'cards' ? 'var(--badge-bg)' : 'transparent',
                color: viewLayout === 'cards' ? 'var(--badge-text)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer'
              }}
              title="Cards View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 4. CUSTOMERS MAIN LIST (TABLE OR CARDS)                                */}
      {/* --------------------------------------------------------------------- */}
      {filteredCustomers.length === 0 ? (
        <div style={{ 
          background: 'var(--surface-primary)', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-sm)', 
          padding: '3rem 1.5rem', 
          textAlign: 'center' 
        }}>
          <Users size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No matching customers found</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {searchTerm ? `No results for "${searchTerm}" in selected filter.` : 'No customers recorded yet in the system.'}
          </div>
        </div>
      ) : viewLayout === 'table' ? (
        /* TABLE VIEW */
        <div style={{ 
          background: 'var(--surface-primary)', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-sm)', 
          overflowX: 'auto' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Customer ID & Type</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Name & Location</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>WhatsApp / Mobile</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Sales Purchases (Invoices)</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Repair Service Bills</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Total Spent</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Balance Due</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(cust => {
                const hasDue = cust.balanceDue > 0;
                return (
                  <tr 
                    key={cust.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-card-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* ID & TYPE BADGE */}
                    <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                          {cust.id}
                        </span>
                        {cust.type === 'both' ? (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 700, 
                            padding: '0.15rem 0.45rem', 
                            borderRadius: 'var(--radius-pill)',
                            background: 'var(--status-teal-bg)', 
                            color: 'var(--status-teal)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            width: 'fit-content'
                          }}>
                            <Sparkles size={10} /> Both (Sales + Repair)
                          </span>
                        ) : cust.hasPurchases ? (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 700, 
                            padding: '0.15rem 0.45rem', 
                            borderRadius: 'var(--radius-pill)',
                            background: 'var(--status-blue-bg)', 
                            color: 'var(--status-blue)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            width: 'fit-content'
                          }}>
                            <ShoppingBag size={10} /> Sales Customer
                          </span>
                        ) : cust.hasRepairs ? (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 700, 
                            padding: '0.15rem 0.45rem', 
                            borderRadius: 'var(--radius-pill)',
                            background: 'var(--status-amber-bg)', 
                            color: 'var(--status-amber)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            width: 'fit-content'
                          }}>
                            <Wrench size={10} /> Repair Customer
                          </span>
                        ) : (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 600, 
                            padding: '0.15rem 0.45rem', 
                            borderRadius: 'var(--radius-pill)',
                            background: 'var(--border-color)', 
                            color: 'var(--text-secondary)',
                            width: 'fit-content'
                          }}>
                            Khata Reg
                          </span>
                        )}
                      </div>
                    </td>

                    {/* NAME & LOCATION */}
                    <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                        {cust.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {cust.address || 'Bodhan, Telangana'}
                      </div>
                    </td>

                    {/* WHATSAPP & PHONE */}
                    <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8rem' }}>
                          {cust.phone || '—'}
                        </span>
                        {cust.phone && (
                          <a
                            href={getWhatsAppUrl(cust)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ 
                              color: '#10B981', 
                              display: 'inline-flex', 
                              alignItems: 'center',
                              padding: '0.15rem 0.35rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(16, 185, 129, 0.1)',
                              textDecoration: 'none'
                            }}
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare size={12} />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* SALES PURCHASES (INVOICES) */}
                    <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'top' }}>
                      {cust.hasPurchases ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--status-blue)' }}>
                            {cust.invoices.length} {cust.invoices.length === 1 ? 'Invoice' : 'Invoices'} • ₹{cust.salesSpend.toLocaleString()}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {cust.invoices.slice(0, 3).map((inv, i) => (
                              <button
                                key={i}
                                onClick={() => onPrintInvoice(inv, 'thermal')}
                                style={{
                                  fontSize: '0.68rem',
                                  fontFamily: 'var(--font-mono)',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--status-blue-bg)',
                                  color: 'var(--status-blue)',
                                  border: '1px solid rgba(32, 112, 150, 0.3)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}
                                title="Click to Print Invoice"
                              >
                                <Printer size={10} />
                                <span>{inv.invoiceNo || 'INV'}</span>
                              </button>
                            ))}
                            {cust.invoices.length > 3 && (
                              <button
                                onClick={() => {
                                  setStatementCustomer(cust);
                                  setProfileActiveTab('sales');
                                }}
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '0.15rem 0.35rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'transparent',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer'
                                }}
                              >
                                +{cust.invoices.length - 3} more
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* REPAIR SERVICE BILLS */}
                    <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'top' }}>
                      {cust.hasRepairs ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--status-amber)' }}>
                            {cust.repairs.length} {cust.repairs.length === 1 ? 'Repair Bill' : 'Repair Bills'} • ₹{cust.repairSpend.toLocaleString()}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {cust.repairs.slice(0, 3).map((rep, r) => (
                              <button
                                key={r}
                                onClick={() => onPrintRepairSlip(rep)}
                                style={{
                                  fontSize: '0.68rem',
                                  fontFamily: 'var(--font-mono)',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--status-amber-bg)',
                                  color: 'var(--status-amber)',
                                  border: '1px solid rgba(172, 124, 32, 0.3)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}
                                title={`Click to Print Slip: ${rep.deviceModel}`}
                              >
                                <Wrench size={10} />
                                <span>{rep.id}</span>
                              </button>
                            ))}
                            {cust.repairs.length > 3 && (
                              <button
                                onClick={() => {
                                  setStatementCustomer(cust);
                                  setProfileActiveTab('repairs');
                                }}
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '0.15rem 0.35rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'transparent',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer'
                                }}
                              >
                                +{cust.repairs.length - 3} more
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* TOTAL SPENT */}
                    <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'top', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      ₹{cust.totalSpent.toLocaleString()}
                    </td>

                    {/* BALANCE DUE */}
                    <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'top' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: hasDue ? 'var(--status-red)' : 'var(--status-green)'
                      }}>
                        ₹{cust.balanceDue.toLocaleString()}
                      </span>
                      {hasDue && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--status-red)', fontWeight: 700 }}>
                          DUE PENDING
                        </div>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'top', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {/* Profile / All Bills Modal */}
                        <button
                          onClick={() => {
                            setStatementCustomer(cust);
                            setProfileActiveTab('dual');
                          }}
                          className="btn-secondary"
                          style={{ padding: '0.28rem 0.55rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          title="View Invoices, Repair Bills & Statement"
                        >
                          <FileText size={12} />
                          <span>Bills</span>
                        </button>

                        {hasDue && (
                          <>
                            {/* UPI QR */}
                            <button
                              onClick={() => setQrCustomer(cust)}
                              className="btn-secondary"
                              style={{ padding: '0.28rem 0.5rem', fontSize: '0.74rem', color: 'var(--accent-primary)' }}
                              title="Show UPI QR Code"
                            >
                              <QrCode size={12} />
                            </button>

                            {/* 1-Click WhatsApp Reminder */}
                            {cust.phone && (
                              <button
                                type="button"
                                onClick={() => openWhatsAppKhataReminder(cust, shopConfig)}
                                className="btn-secondary"
                                style={{ padding: '0.28rem 0.5rem', fontSize: '0.74rem', color: '#10B981', borderColor: 'rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                title="1-Click WhatsApp Payment Reminder with UPI ID"
                              >
                                <Share2 size={12} />
                                <span>Remind</span>
                              </button>
                            )}

                            {/* Collect Payment */}
                            <button
                              onClick={() => {
                                setSelectedCustomerForPayment(cust);
                                setPaymentAmount(cust.balanceDue.toString());
                              }}
                              className="btn-primary"
                              style={{ padding: '0.28rem 0.55rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <IndianRupee size={12} />
                              <span>Collect</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
          {filteredCustomers.map(cust => {
            const hasDue = cust.balanceDue > 0;
            return (
              <div 
                key={cust.id}
                style={{
                  background: 'var(--surface-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                {/* Top Card Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {cust.id}
                      </span>
                      {cust.type === 'both' ? (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: 'var(--status-teal-bg)', color: 'var(--status-teal)' }}>
                          ⭐ Both
                        </span>
                      ) : cust.hasPurchases ? (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: 'var(--status-blue-bg)', color: 'var(--status-blue)' }}>
                          🛒 Sales
                        </span>
                      ) : cust.hasRepairs ? (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: 'var(--status-amber-bg)', color: 'var(--status-amber)' }}>
                          🔧 Repair
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                      {cust.name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {cust.address || 'Bodhan'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Balance Due</div>
                    <div style={{ 
                      fontSize: '1.05rem', 
                      fontWeight: 800, 
                      fontFamily: 'var(--font-mono)', 
                      color: hasDue ? 'var(--status-red)' : 'var(--status-green)' 
                    }}>
                      ₹{cust.balanceDue.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Contact Pill */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: 'var(--bg-main)', 
                  padding: '0.4rem 0.65rem', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                    <Phone size={12} color="var(--text-muted)" />
                    <span>{cust.phone || 'No phone'}</span>
                  </div>
                  {cust.phone && (
                    <a
                      href={getWhatsAppUrl(cust)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 600, 
                        color: '#10B981', 
                        textDecoration: 'none', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem' 
                      }}
                    >
                      <MessageSquare size={12} /> WhatsApp
                    </a>
                  )}
                </div>

                {/* Purchases & Repairs Dual Dock */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
                  
                  {/* Sales Invoices */}
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--status-blue)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShoppingBag size={11} />
                      <span>Purchases: {cust.invoices.length}</span>
                    </div>
                    {cust.hasPurchases ? (
                      <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {cust.invoices.slice(0, 2).map((inv, i) => (
                          <button
                            key={i}
                            onClick={() => onPrintInvoice(inv, 'thermal')}
                            style={{
                              fontSize: '0.65rem',
                              fontFamily: 'var(--font-mono)',
                              background: 'var(--surface-primary)',
                              border: '1px solid var(--border-color)',
                              padding: '0.15rem 0.35rem',
                              borderRadius: 'var(--radius-sm)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{inv.invoiceNo || 'INV'}</span>
                            <span style={{ fontWeight: 700 }}>₹{(Number(inv.grandTotal) || 0).toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>None</div>
                    )}
                  </div>

                  {/* Repairs */}
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--status-amber)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Wrench size={11} />
                      <span>Repairs: {cust.repairs.length}</span>
                    </div>
                    {cust.hasRepairs ? (
                      <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {cust.repairs.slice(0, 2).map((rep, r) => (
                          <button
                            key={r}
                            onClick={() => onPrintRepairSlip(rep)}
                            style={{
                              fontSize: '0.65rem',
                              fontFamily: 'var(--font-mono)',
                              background: 'var(--surface-primary)',
                              border: '1px solid var(--border-color)',
                              padding: '0.15rem 0.35rem',
                              borderRadius: 'var(--radius-sm)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65px' }}>{rep.deviceModel}</span>
                            <span style={{ fontWeight: 700 }}>₹{(Number(rep.finalPrice || rep.estimatedCost) || 0).toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>None</div>
                    )}
                  </div>

                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: 'auto', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => {
                      setStatementCustomer(cust);
                      setProfileActiveTab('dual');
                    }}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.35rem', fontSize: '0.74rem', justifyContent: 'center' }}
                  >
                    <FileText size={12} />
                    <span>View Profile & Bills</span>
                  </button>

                  {hasDue && (
                    <>
                      <button
                        onClick={() => setQrCustomer(cust)}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.55rem', fontSize: '0.74rem', color: 'var(--accent-primary)' }}
                        title="UPI QR"
                      >
                        <QrCode size={13} />
                      </button>

                      {cust.phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsAppKhataReminder(cust, shopConfig)}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.74rem', color: '#10B981', borderColor: 'rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                          title="1-Click WhatsApp Payment Reminder with UPI ID"
                        >
                          <Share2 size={12} />
                          <span>Remind</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedCustomerForPayment(cust);
                          setPaymentAmount(cust.balanceDue.toString());
                        }}
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
                      >
                        <IndianRupee size={12} />
                        <span>Collect</span>
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. FULL CUSTOMER PROFILE & STATEMENT MODAL                            */}
      {/* ===================================================================== */}
      {statementCustomer && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div className="illoca-card animate-fade-in" style={{ 
            maxWidth: '880px', 
            width: '100%', 
            maxHeight: '92vh', 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'var(--surface-primary)', 
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)'
          }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                    {statementCustomer.name}
                  </h3>
                  <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    padding: '0.15rem 0.5rem', 
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--badge-bg)',
                    color: 'var(--badge-text)'
                  }}>
                    {statementCustomer.id}
                  </span>
                  {statementCustomer.type === 'both' ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--status-teal-bg)', color: 'var(--status-teal)' }}>
                      ⭐ Both: Sales & Repair Client
                    </span>
                  ) : statementCustomer.hasPurchases ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--status-blue-bg)', color: 'var(--status-blue)' }}>
                      🛒 Sales Counter Client
                    </span>
                  ) : statementCustomer.hasRepairs ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--status-amber-bg)', color: 'var(--status-amber)' }}>
                      🔧 Repairing Lab Client
                    </span>
                  ) : null}
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <span>Phone: <strong style={{ fontFamily: 'var(--font-mono)' }}>{statementCustomer.phone || '—'}</strong></span>
                  <span>Town: <strong>{statementCustomer.address || 'Bodhan, Telangana'}</strong></span>
                  {statementCustomer.gstin && <span>GSTIN: <strong style={{ fontFamily: 'var(--font-mono)' }}>{statementCustomer.gstin}</strong></span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {statementCustomer.phone && (
                  <a
                    href={getWhatsAppUrl(statementCustomer)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.76rem', color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <MessageSquare size={13} />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    const ledger = getCustomerLedger(statementCustomer);
                    onPrintKhataStatement({
                      customer: statementCustomer,
                      ledger,
                      shopConfig
                    });
                  }}
                  className="btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Printer size={13} />
                  <span>Print Ledger</span>
                </button>

                {statementCustomer.balanceDue > 0 && statementCustomer.phone && (
                  <button
                    type="button"
                    onClick={() => openWhatsAppKhataReminder(statementCustomer, shopConfig)}
                    className="btn-primary"
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: '#10B981',
                      borderColor: '#10B981',
                      color: '#FFFFFF'
                    }}
                    title="Send instant WhatsApp payment reminder with UPI ID"
                  >
                    <Share2 size={13} />
                    <span>WhatsApp Reminder</span>
                  </button>
                )}

                <button
                  onClick={() => setStatementCustomer(null)}
                  className="btn-outline"
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Financial Summary Ribbon */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ background: 'var(--surface-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Sales Purchases Total</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--status-blue)', fontFamily: 'var(--font-mono)' }}>
                  ₹{(statementCustomer.salesSpend || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ background: 'var(--surface-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Repair Services Total</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--status-amber)', fontFamily: 'var(--font-mono)' }}>
                  ₹{(statementCustomer.repairSpend || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ background: 'var(--surface-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Total Lifetime Billed</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  ₹{(statementCustomer.totalSpent || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ background: 'var(--surface-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Balance Due</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: statementCustomer.balanceDue > 0 ? 'var(--status-red)' : 'var(--status-green)', fontFamily: 'var(--font-mono)' }}>
                  ₹{(statementCustomer.balanceDue || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              <button
                onClick={() => setProfileActiveTab('dual')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: profileActiveTab === 'dual' ? 700 : 500,
                  borderRadius: 'var(--radius-pill)',
                  border: profileActiveTab === 'dual' ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  background: profileActiveTab === 'dual' ? 'var(--badge-bg)' : 'transparent',
                  color: profileActiveTab === 'dual' ? 'var(--badge-text)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                🌟 All Bills (Sales & Repairs)
              </button>

              <button
                onClick={() => setProfileActiveTab('sales')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: profileActiveTab === 'sales' ? 700 : 500,
                  borderRadius: 'var(--radius-pill)',
                  border: profileActiveTab === 'sales' ? '1px solid var(--status-blue)' : '1px solid transparent',
                  background: profileActiveTab === 'sales' ? 'var(--status-blue-bg)' : 'transparent',
                  color: profileActiveTab === 'sales' ? 'var(--status-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                🛒 Sales Invoices ({statementCustomer.invoices.length})
              </button>

              <button
                onClick={() => setProfileActiveTab('repairs')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: profileActiveTab === 'repairs' ? 700 : 500,
                  borderRadius: 'var(--radius-pill)',
                  border: profileActiveTab === 'repairs' ? '1px solid var(--status-amber)' : '1px solid transparent',
                  background: profileActiveTab === 'repairs' ? 'var(--status-amber-bg)' : 'transparent',
                  color: profileActiveTab === 'repairs' ? 'var(--status-amber)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                🔧 Repair Bills ({statementCustomer.repairs.length})
              </button>

              <button
                onClick={() => setProfileActiveTab('ledger')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: profileActiveTab === 'ledger' ? 700 : 500,
                  borderRadius: 'var(--radius-pill)',
                  border: profileActiveTab === 'ledger' ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  background: profileActiveTab === 'ledger' ? 'var(--badge-bg)' : 'transparent',
                  color: profileActiveTab === 'ledger' ? 'var(--badge-text)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                📒 Khata Ledger Statement
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              
              {/* TAB 1: DUAL OVERVIEW (SHOW BOTH SALES INVOICES & REPAIR BILLS) */}
              {profileActiveTab === 'dual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Sales Invoices Section */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--status-blue)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <ShoppingBag size={14} />
                        <span>Sales Counter Invoices ({statementCustomer.invoices.length})</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Total: ₹{statementCustomer.salesSpend.toLocaleString()}
                      </span>
                    </div>

                    {statementCustomer.invoices.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', textAlign: 'center' }}>
                        No product purchases or store sales on record.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {statementCustomer.invoices.map((inv, idx) => (
                          <div 
                            key={idx}
                            style={{
                              background: 'var(--surface-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.5rem 0.75rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.78rem'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-blue)' }}>
                                  {inv.invoiceNo || 'INV-SALES'}
                                </span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                                  {inv.date}
                                </span>
                                <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)', background: 'var(--badge-bg)', color: 'var(--badge-text)' }}>
                                  {inv.paymentMode || 'Counter'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                {inv.items ? inv.items.map(it => it.name).join(', ') : 'Store item'}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                                  ₹{(Number(inv.grandTotal) || 0).toLocaleString()}
                                </div>
                                {(inv.balanceDue || inv.khataDue) > 0 && (
                                  <div style={{ fontSize: '0.65rem', color: 'var(--status-red)', fontWeight: 700 }}>
                                    Due: ₹{(inv.balanceDue || inv.khataDue).toLocaleString()}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button
                                  onClick={() => onPrintInvoice(inv, 'thermal')}
                                  className="btn-secondary"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                  title="Print Thermal Bill"
                                >
                                  <Printer size={11} /> <span>Thermal</span>
                                </button>
                                <button
                                  onClick={() => onPrintInvoice(inv, 'a4')}
                                  className="btn-secondary"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                  title="Print A4 Tax Invoice"
                                >
                                  <FileText size={11} /> <span>A4</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Repair Service Bills Section */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--status-amber)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Wrench size={14} />
                        <span>Repair Service Bills & Job Sheets ({statementCustomer.repairs.length})</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Total: ₹{statementCustomer.repairSpend.toLocaleString()}
                      </span>
                    </div>

                    {statementCustomer.repairs.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', textAlign: 'center' }}>
                        No device repair jobs on record.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {statementCustomer.repairs.map((rep, idx) => (
                          <div 
                            key={idx}
                            style={{
                              background: 'var(--surface-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.5rem 0.75rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.78rem'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-amber)' }}>
                                  {rep.id}
                                </span>
                                <span style={{ fontWeight: 700 }}>
                                  {rep.deviceModel}
                                </span>
                                <span style={{ 
                                  fontSize: '0.65rem', 
                                  padding: '0.1rem 0.35rem', 
                                  borderRadius: 'var(--radius-sm)', 
                                  background: rep.status === 'Delivered' ? 'var(--status-green-bg)' : 'var(--status-amber-bg)', 
                                  color: rep.status === 'Delivered' ? 'var(--status-green)' : 'var(--status-amber)',
                                  fontWeight: 700
                                }}>
                                  {rep.status}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                Issues: {rep.issues ? rep.issues.join(', ') : 'Servicing'} {rep.imei ? `• IMEI: ${rep.imei}` : ''}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                                  ₹{(Number(rep.finalPrice || rep.finalCost || rep.estimatedCost) || 0).toLocaleString()}
                                </div>
                                {rep.advancePaid > 0 && (
                                  <div style={{ fontSize: '0.65rem', color: 'var(--status-green)', fontWeight: 600 }}>
                                    Adv: ₹{Number(rep.advancePaid).toLocaleString()}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => onPrintRepairSlip(rep)}
                                className="btn-primary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Print Repair Bill / Token"
                              >
                                <Printer size={11} /> <span>Print Slip</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: SALES INVOICES ONLY */}
              {profileActiveTab === 'sales' && (
                <div>
                  {statementCustomer.invoices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No sales purchase invoices found for this customer.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.5rem' }}>Date</th>
                          <th style={{ padding: '0.5rem' }}>Invoice #</th>
                          <th style={{ padding: '0.5rem' }}>Items Purchased</th>
                          <th style={{ padding: '0.5rem' }}>Mode</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementCustomer.invoices.map((inv, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{inv.date}</td>
                            <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--status-blue)' }}>{inv.invoiceNo}</td>
                            <td style={{ padding: '0.6rem 0.5rem' }}>{inv.items ? inv.items.map(it => it.name).join(', ') : 'Item'}</td>
                            <td style={{ padding: '0.6rem 0.5rem' }}>{inv.paymentMode || 'Counter'}</td>
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>₹{(Number(inv.grandTotal) || 0).toLocaleString()}</td>
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                                <button onClick={() => onPrintInvoice(inv, 'thermal')} className="btn-secondary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}>Thermal</button>
                                <button onClick={() => onPrintInvoice(inv, 'a4')} className="btn-secondary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}>A4</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 3: REPAIR BILLS ONLY */}
              {profileActiveTab === 'repairs' && (
                <div>
                  {statementCustomer.repairs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No repair service jobs found for this customer.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.5rem' }}>Date</th>
                          <th style={{ padding: '0.5rem' }}>Job ID</th>
                          <th style={{ padding: '0.5rem' }}>Device & Issues</th>
                          <th style={{ padding: '0.5rem' }}>Status</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cost</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementCustomer.repairs.map((rep, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{rep.date}</td>
                            <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--status-amber)' }}>{rep.id}</td>
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              <div style={{ fontWeight: 700 }}>{rep.deviceModel}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{rep.issues ? rep.issues.join(', ') : 'Service'}</div>
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: rep.status === 'Delivered' ? 'var(--status-green)' : 'var(--status-amber)' }}>
                                {rep.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                              ₹{(Number(rep.finalPrice || rep.finalCost || rep.estimatedCost) || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                              <button onClick={() => onPrintRepairSlip(rep)} className="btn-primary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}>
                                Print Slip
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 4: CHRONOLOGICAL KHATA LEDGER STATEMENT */}
              {profileActiveTab === 'ledger' && (
                <div>
                  {(() => {
                    const ledger = getCustomerLedger(statementCustomer);
                    if (ledger.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                          No past ledger transactions or bills found.
                        </div>
                      );
                    }
                    return (
                      <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Ref # / Type</th>
                            <th>Description</th>
                            <th style={{ textAlign: 'right' }}>Billed (Debit)</th>
                            <th style={{ textAlign: 'right' }}>Paid (Credit)</th>
                            <th style={{ textAlign: 'right' }}>Balance Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledger.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{item.date}</td>
                              <td>
                                <span className="mono-tag" style={{
                                  background: item.type === 'INVOICE' ? 'var(--status-blue-bg)' : 'var(--status-amber-bg)',
                                  color: item.type === 'INVOICE' ? 'var(--status-blue)' : 'var(--status-amber)'
                                }}>
                                  {item.refNo}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{item.description}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Mode: {item.mode || 'Counter'}</div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                                {item.debit > 0 ? `₹${item.debit.toLocaleString()}` : '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-green)', fontFamily: 'var(--font-mono)' }}>
                                {item.credit > 0 ? `₹${item.credit.toLocaleString()}` : '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: item.runningBalance > 0 ? 'var(--status-red)' : 'var(--status-green)', fontFamily: 'var(--font-mono)' }}>
                                ₹{item.runningBalance.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. DYNAMIC UPI QR SCAN MODAL                                          */}
      {/* ===================================================================== */}
      {qrCustomer && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div className="illoca-card animate-fade-in" style={{ maxWidth: '380px', width: '100%', textAlign: 'center', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Scan & Pay Due</h3>
              <button onClick={() => setQrCustomer(null)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Client: <strong>{qrCustomer.name}</strong> ({qrCustomer.phone})
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--status-red)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              ₹{qrCustomer.balanceDue.toLocaleString()}
            </div>

            <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '1rem' }}>
              <img
                src={getUpiQrUrl(shopConfig.upiId || 'alzino.bodhan@okhdfcbank', shopConfig.name || 'ALZINO', qrCustomer.balanceDue, `KHATA-${qrCustomer.id}`)}
                alt="UPI QR Code"
                style={{ width: '190px', height: '190px', display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '1.25rem' }}>
              UPI ID: {shopConfig.upiId || 'alzino.bodhan@okhdfcbank'}
            </div>

            <button
              onClick={() => {
                setSelectedCustomerForPayment(qrCustomer);
                setPaymentAmount(qrCustomer.balanceDue.toString());
                setQrCustomer(null);
              }}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.55rem' }}
            >
              <CheckCircle2 size={16} />
              <span>Mark Paid After Scan</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. COLLECT PAYMENT MODAL                                              */}
      {/* ===================================================================== */}
      {selectedCustomerForPayment && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <form onSubmit={handleReceiveKhataPayment} className="illoca-card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800 }}>Receive Payment</h3>
              <button type="button" onClick={() => setSelectedCustomerForPayment(null)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem', background: 'var(--surface-card)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Customer:</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedCustomerForPayment.name} ({selectedCustomerForPayment.phone})</div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--status-red)', fontWeight: 800 }}>
                Total Due: ₹{selectedCustomerForPayment.balanceDue.toLocaleString()}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Payment Amount Received (₹) *
              </label>
              <input
                type="number"
                placeholder={`Max ₹${selectedCustomerForPayment.balanceDue}`}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
                className="input-field"
                style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)' }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Payment Instrument / Mode *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                {['UPI', 'Cash', 'Bank'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`btn-secondary ${paymentMode === mode ? 'btn-primary' : ''}`}
                    style={{ padding: '0.45rem', fontSize: '0.8rem', justifyContent: 'center' }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {paymentMode === 'UPI' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  UPI Ref / UTR Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 428901928472"
                  value={paymentUtr}
                  onChange={(e) => setPaymentUtr(e.target.value)}
                  className="input-field"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Payment Note / Remarks:
              </label>
              <input
                type="text"
                placeholder="e.g. Received at counter / via Google Pay"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="input-field"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button type="button" onClick={() => setSelectedCustomerForPayment(null)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.55rem 1.25rem' }}>
                Save Payment & Settle Ledger
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. ADD NEW CUSTOMER MODAL                                             */}
      {/* ===================================================================== */}
      {showAddModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleAddCustomer} className="illoca-card animate-fade-in" style={{ maxWidth: '460px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Add New Customer</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Customer Name *</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Mobile / WhatsApp Number *</label>
                <input
                  type="text"
                  placeholder="10-digit Phone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Address / Area</label>
                <input
                  type="text"
                  placeholder="Street / Colony, Bodhan"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="GST Number"
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.55rem 1.25rem' }}>
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
