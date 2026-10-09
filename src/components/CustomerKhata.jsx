import React, { useState, useMemo } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { getUpiQrUrl } from '../utils/barcode';

export default function CustomerKhata({ 
  customers = [], 
  setCustomers = () => {}, 
  invoices = [],
  repairJobs = [],
  shopConfig = {},
  onPrintKhataStatement = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Collect Payment Modal state
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI'); // UPI | Cash | Bank
  const [paymentUtr, setPaymentUtr] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Customer Ledger Statement Modal state
  const [statementCustomer, setStatementCustomer] = useState(null);

  // Dynamic UPI QR Reminder Modal state
  const [qrCustomer, setQrCustomer] = useState(null);

  // New customer form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newGstin, setNewGstin] = useState('');

  // Totals
  const totalReceivables = customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
  const customersWithDue = customers.filter(c => c.balanceDue > 0);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, searchTerm]);

  // Build Comprehensive Transaction Ledger for a customer
  const getCustomerLedger = (cust) => {
    if (!cust) return [];
    const entries = [];

    // 1. Invoices
    const custInvoices = invoices.filter(inv => 
      (inv.customerPhone && inv.customerPhone === cust.phone) ||
      (inv.customerName && inv.customerName.toLowerCase() === cust.name.toLowerCase())
    );

    custInvoices.forEach(inv => {
      entries.push({
        id: inv.id || inv.invoiceNo,
        date: inv.date,
        type: 'INVOICE',
        refNo: inv.invoiceNo,
        description: inv.items ? inv.items.map(it => it.name).join(', ') : 'Store Purchase',
        debit: Number(inv.grandTotal) || 0,
        credit: Number(inv.paidAmount) || 0,
        balanceChange: (Number(inv.grandTotal) || 0) - (Number(inv.paidAmount) || 0),
        mode: inv.paymentMode
      });
    });

    // 2. Repairs
    const custRepairs = repairJobs.filter(rep => 
      rep.customerMobile === cust.phone || rep.customerName === cust.name
    );

    custRepairs.forEach(rep => {
      // Avoid double counting if already converted to invoice
      const alreadyInvoiced = custInvoices.some(inv => inv.repairJobRef === rep.id);
      if (!alreadyInvoiced) {
        entries.push({
          id: rep.id,
          date: rep.date,
          type: 'REPAIR',
          refNo: rep.id,
          description: `Repair: ${rep.deviceModel} (${rep.issues ? rep.issues.join(', ') : 'Servicing'})`,
          debit: Number(rep.estimatedCost) || 0,
          credit: Number(rep.advancePaid) || 0,
          balanceChange: (Number(rep.estimatedCost) || 0) - (Number(rep.advancePaid) || 0),
          mode: 'Repair Token'
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

  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      alert("Please provide customer name and phone number.");
      return;
    }

    const newCust = {
      id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
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

  const handleReceiveKhataPayment = (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    setCustomers(prev => prev.map(c => {
      if (c.id === selectedCustomerForPayment.id) {
        const newBal = Math.max(0, (c.balanceDue || 0) - amt);
        return {
          ...c,
          balanceDue: newBal
        };
      }
      return c;
    }));

    alert(`Received ₹${amt.toLocaleString()} via ${paymentMode} from ${selectedCustomerForPayment.name}. Khata balance updated!`);
    setSelectedCustomerForPayment(null);
    setPaymentAmount('');
    setPaymentUtr('');
    setPaymentNote('');
  };

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      
      {/* Sleek Minimalist Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Customer Khata Ledger</h2>
          <span style={{ fontSize: '0.78rem', color: totalReceivables > 0 ? 'var(--status-red)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {totalReceivables > 0 ? `Pending Due: ₹${totalReceivables.toLocaleString()} (${customersWithDue.length} accounts)` : 'All accounts settled'}
          </span>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
        >
          <Plus size={15} />
          <span>New Customer</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="illoca-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="mono-tag">{customers.length} Total Customers</span>
          <span className="mono-tag" style={{ background: 'var(--status-amber-bg)', color: 'var(--status-amber)' }}>
            {customersWithDue.length} with Pending Due
          </span>
        </div>

        <div style={{ width: '320px' }}>
          <input
            type="text"
            placeholder="Search by Customer Name or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Customer Ledger Table */}
      <div className="illoca-card" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.65rem 0.5rem' }}>Customer Details</th>
              <th style={{ padding: '0.65rem 0.5rem' }}>Phone & WhatsApp</th>
              <th style={{ padding: '0.65rem 0.5rem' }}>Town / Location</th>
              <th style={{ padding: '0.65rem 0.5rem' }}>GSTIN</th>
              <th style={{ padding: '0.65rem 0.5rem' }}>Lifetime Purchases</th>
              <th style={{ padding: '0.65rem 0.5rem' }}>Pending Udhaari</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(cust => {
              const hasDue = cust.balanceDue > 0;
              return (
                <tr key={cust.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ fontWeight: 600 }}>{cust.name}</div>
                    <span className="mono-tag" style={{ fontSize: '0.7rem' }}>{cust.id}</span>
                  </td>

                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                    {cust.phone}
                  </td>

                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                    {cust.address || 'Bodhan'}
                  </td>

                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    {cust.gstin || '—'}
                  </td>

                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                    ₹{cust.totalSpent.toLocaleString()}
                  </td>

                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: hasDue ? 'var(--status-red)' : 'var(--status-green)'
                    }}>
                      ₹{cust.balanceDue.toLocaleString()}
                    </span>
                    {hasDue && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--status-red)', fontWeight: 600 }}>
                        DUE PENDING
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {/* Full Ledger Statement Button */}
                      <button
                        onClick={() => setStatementCustomer(cust)}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                        title="View Full Ledger Statement"
                      >
                        <FileText size={13} />
                        <span>Statement</span>
                      </button>

                      {hasDue && (
                        <>
                          {/* Dynamic UPI QR Modal Button */}
                          <button
                            onClick={() => setQrCustomer(cust)}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: 'var(--accent-primary)' }}
                            title="Show Instant UPI QR Code"
                          >
                            <QrCode size={13} />
                            <span>QR</span>
                          </button>

                          {/* Collect Cash/UPI Payment */}
                          <button
                            onClick={() => {
                              setSelectedCustomerForPayment(cust);
                              setPaymentAmount(cust.balanceDue.toString());
                            }}
                            className="btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                          >
                            <IndianRupee size={13} />
                            <span>Collect</span>
                          </button>

                          {/* WhatsApp Reminder */}
                          <a
                            href={`https://wa.me/91${cust.phone}?text=${encodeURIComponent(
                              `Namaste ${cust.name} ji, ALZINO Mobiles Bodhan se reminder: Aapke account mein Rs.${cust.balanceDue.toLocaleString()} ka balance due hai. Aap shop counter par ya direct GooglePay/PhonePe UPI (${shopConfig.upiId || 'alzino.bodhan@okhdfcbank'}) par pay kar sakte hain. Payment ke baad receipt share karein. Dhanyawaad!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-outline"
                            style={{ padding: '0.35rem 0.55rem', color: '#10B981', display: 'flex', alignItems: 'center' }}
                            title="Send WhatsApp Payment Reminder"
                          >
                            <Share2 size={13} />
                          </a>
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

      {/* ========================================================================= */}
      {/* 1. FULL CUSTOMER LEDGER STATEMENT MODAL                                   */}
      {/* ========================================================================= */}
      {statementCustomer && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div className="illoca-card animate-fade-in" style={{ maxWidth: '780px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-primary)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={18} color="var(--accent-primary)" />
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    Customer Account Statement & Ledger
                  </h3>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <strong>{statementCustomer.name}</strong> • Phone: {statementCustomer.phone} • {statementCustomer.address}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                >
                  <Printer size={14} />
                  <span>Print Statement</span>
                </button>

                <button
                  onClick={() => setStatementCustomer(null)}
                  className="btn-outline"
                  style={{ padding: '0.3rem 0.6rem' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Statement Summary Ribbon */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--surface-card)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Total Lifetime Billed</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{(statementCustomer.totalSpent || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ background: 'var(--surface-card)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Total Credit Pending (Due)</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: statementCustomer.balanceDue > 0 ? 'var(--status-red)' : 'var(--status-green)' }}>
                  ₹{(statementCustomer.balanceDue || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ background: 'var(--surface-card)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Status</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.15rem' }}>
                  {statementCustomer.balanceDue > 0 ? (
                    <span className="mono-tag chip-amber">Payment Pending</span>
                  ) : (
                    <span className="mono-tag chip-green">All Cleared (Zero Due)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {(() => {
                const ledger = getCustomerLedger(statementCustomer);
                if (ledger.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                      No past transactions or bills found for this customer phone number.
                    </div>
                  );
                }
                return (
                  <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Ref # / Type</th>
                        <th>Description / Items</th>
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
                              background: item.type === 'INVOICE' ? 'var(--illoca-blue-subtle)' : 'var(--status-amber-bg)',
                              color: item.type === 'INVOICE' ? 'var(--accent-primary)' : 'var(--status-amber)'
                            }}>
                              {item.refNo}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.description}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Mode: {item.mode || 'Counter'}</div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.debit > 0 ? `₹${item.debit.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-green)' }}>
                            {item.credit > 0 ? `₹${item.credit.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: item.runningBalance > 0 ? 'var(--status-red)' : 'var(--status-green)' }}>
                            ₹{item.runningBalance.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DYNAMIC UPI QR REMINDER MODAL                                          */}
      {/* ========================================================================= */}
      {qrCustomer && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div className="illoca-card animate-fade-in" style={{ maxWidth: '380px', width: '100%', textAlign: 'center', padding: '1.75rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Scan & Pay Khata Due</h3>
              <button onClick={() => setQrCustomer(null)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Customer: <strong>{qrCustomer.name}</strong>
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--status-red)', marginBottom: '1rem' }}>
              ₹{qrCustomer.balanceDue.toLocaleString()}
            </div>

            <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '1rem' }}>
              <img
                src={getUpiQrUrl(shopConfig.upiId || 'alzino.bodhan@okhdfcbank', shopConfig.name || 'ALZINO', qrCustomer.balanceDue, `KHATA-${qrCustomer.id}`)}
                alt="UPI QR Code"
                style={{ width: '200px', height: '200px', display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '1.25rem' }}>
              UPI ID: {shopConfig.upiId || 'alzino.bodhan@okhdfcbank'}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setSelectedCustomerForPayment(qrCustomer);
                  setPaymentAmount(qrCustomer.balanceDue.toString());
                  setQrCustomer(null);
                }}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <CheckCircle2 size={16} />
                <span>Mark Paid After Scan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. COLLECT PAYMENT MODAL                                                  */}
      {/* ========================================================================= */}
      {selectedCustomerForPayment && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <form onSubmit={handleReceiveKhataPayment} className="illoca-card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>Receive Khata Payment</h3>
              <button type="button" onClick={() => setSelectedCustomerForPayment(null)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem', background: 'var(--surface-card)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Customer:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{selectedCustomerForPayment.name} ({selectedCustomerForPayment.phone})</div>
              <div style={{ marginTop: '0.4rem', fontSize: '0.88rem', color: 'var(--status-red)', fontWeight: 800 }}>
                Total Due: ₹{selectedCustomerForPayment.balanceDue.toLocaleString()}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
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
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Payment Instrument / Mode *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {['UPI', 'Cash', 'Bank'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`btn-secondary ${paymentMode === mode ? 'btn-primary' : ''}`}
                    style={{ padding: '0.45rem', fontSize: '0.82rem', justifyContent: 'center' }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {paymentMode === 'UPI' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
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
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Payment Note / Remarks:
              </label>
              <input
                type="text"
                placeholder="e.g. Cleared via PhonePe / Given in shop"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="input-field"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setSelectedCustomerForPayment(null)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                Save Payment & Update Ledger
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleAddCustomer} className="illoca-card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Add New Customer</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
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
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Mobile Number *</label>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
