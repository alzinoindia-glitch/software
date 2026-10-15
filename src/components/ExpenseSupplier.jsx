import React, { useState } from 'react';
import { 
  Receipt, 
  Truck, 
  Plus, 
  Trash2, 
  TrendingDown, 
  Search, 
  IndianRupee,
  Calendar,
  Building2,
  FileCheck
} from 'lucide-react';

export default function ExpenseSupplier({ 
  initialSubTab = 'expenses',
  expenses, 
  setExpenses, 
  suppliers, 
  setSuppliers, 
  inventory, 
  setInventory, 
  role 
}) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab); // expenses | suppliers
  
  // Expense form state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('Tea & Refreshments');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expPaidBy, setExpPaidBy] = useState('Cash');

  // Supplier form state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [suppName, setSuppName] = useState('');
  const [suppContact, setSuppContact] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppCity, setSuppCity] = useState('');
  const [suppGstin, setSuppGstin] = useState('');

  // Stock Purchase Inward state
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [inwardProductId, setInwardProductId] = useState('');
  const [inwardQty, setInwardQty] = useState('5');
  const [inwardUnitCost, setInwardUnitCost] = useState('');
  const [inwardImeisText, setInwardImeisText] = useState('');
  const [inwardInvoiceNumber, setInwardInvoiceNumber] = useState('');
  const [inwardDate, setInwardDate] = useState(new Date().toISOString().split('T')[0]);

  const expenseCategories = [
    'Shop Rent',
    'Electricity Bill',
    'Tea & Refreshments',
    'Staff Salary',
    'Repair Tools & Consumables',
    'Courier & Freight',
    'Internet & Telephone',
    'Cleaning & Maintenance',
    'Marketing & Banners',
    'Miscellaneous'
  ];

  // Calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expAmount) return;

    const newExp = {
      id: `EXP-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      category: expCategory,
      amount: parseFloat(expAmount),
      notes: expNotes.trim() || expCategory,
      paidBy: expPaidBy,
    };

    setExpenses(prev => [newExp, ...prev]);
    setShowExpenseModal(false);
    setExpAmount('');
    setExpNotes('');
  };

  const handleDeleteExpense = (id) => {
    if (role !== 'admin') {
      alert("Only Admin can delete expense records.");
      return;
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleAddSupplier = (e) => {
    e.preventDefault();
    if (!suppName || !suppPhone) return;

    const phoneDigits = String(suppPhone).replace(/\D/g, '').slice(-10);
    const existingSupplier = suppliers.find(supplier => {
      const existingDigits = String(supplier.phone || '').replace(/\D/g, '').slice(-10);
      return phoneDigits && existingDigits === phoneDigits;
    });
    if (existingSupplier) {
      alert(`${existingSupplier.name} is already in the supplier directory. Please use that existing supplier.`);
      return;
    }

    const newSupp = {
      id: `SUPP-${Date.now()}`,
      name: suppName.trim(),
      contactPerson: suppContact.trim(),
      phone: suppPhone.trim(),
      city: suppCity.trim() || 'Hyderabad',
      gstin: suppGstin.trim(),
      balancePayable: 0,
    };

    setSuppliers(prev => [newSupp, ...prev]);
    setShowSupplierModal(false);
    setSuppName('');
    setSuppContact('');
    setSuppPhone('');
    setSuppCity('');
    setSuppGstin('');
  };

  const handleStockInward = (e) => {
    e.preventDefault();
    if (!selectedSupplierId || !inwardProductId || !inwardQty || !inwardUnitCost) return;

    const qty = parseInt(inwardQty, 10);
    const cost = parseFloat(inwardUnitCost) || 0;
    if (!Number.isInteger(qty) || qty < 1 || cost <= 0) return;
    const imeis = inwardImeisText.split('\n').map(s => s.trim()).filter(Boolean);
    const product = inventory.find(item => item.id === inwardProductId);
    const billTotal = cost * qty;
    const bill = {
      id: `BILL-${Date.now()}`,
      invoiceNumber: inwardInvoiceNumber.trim() || `SUP-${Date.now().toString().slice(-6)}`,
      date: inwardDate,
      productId: inwardProductId,
      productName: product?.name || 'Stock item',
      brand: product?.brand || '',
      quantity: qty,
      unitCost: cost,
      totalAmount: billTotal,
      paidAmount: 0,
      balanceDue: billTotal,
      imeis,
    };

    // Increment inventory
    setInventory(prev => prev.map(p => {
      if (p.id === inwardProductId) {
        return {
          ...p,
          stock: (Number(p.stock) || 0) + qty,
          buyPrice: cost > 0 ? cost : p.buyPrice,
          imeis: [...(p.imeis || []), ...imeis]
        };
      }
      return p;
    }));

    setSuppliers(prev => prev.map(s => s.id === selectedSupplierId ? {
      ...s,
      balancePayable: (Number(s.balancePayable) || 0) + billTotal,
      purchaseBills: [bill, ...(s.purchaseBills || [])],
    } : s));

    alert(`Received ${qty} units from ${suppliers.find(s => s.id === selectedSupplierId)?.name || 'supplier'} and recorded bill ${bill.invoiceNumber}.`);
    setShowInwardModal(false);
    setInwardProductId('');
    setInwardQty('5');
    setInwardUnitCost('');
    setInwardImeisText('');
    setInwardInvoiceNumber('');
    setInwardDate(new Date().toISOString().split('T')[0]);
  };

  const supplierBills = suppliers.flatMap(supplier => (supplier.purchaseBills || []).map(bill => ({
    ...bill,
    supplierName: supplier.name,
  }))).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      
      {/* Sleek Minimalist Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{activeSubTab === 'suppliers' ? 'Supplier Portal' : 'Shop Expenses'}</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {activeSubTab === 'suppliers' ? `${suppliers.length} supplier records` : `Total Outflow: ₹${totalExpenses.toLocaleString()}`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.45rem' }}>
          {activeSubTab === 'expenses' && <button
            onClick={() => setShowExpenseModal(true)}
            className="btn-primary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
          >
            <Plus size={15} />
            <span>Add Expense</span>
          </button>}

          {activeSubTab === 'suppliers' && <button
            onClick={() => setShowInwardModal(true)}
            className="btn-primary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
          >
            <Truck size={14} color="var(--accent-primary)" />
            <span>Receive Stock & Add Bill</span>
          </button>}
          {activeSubTab === 'suppliers' && <button onClick={() => setShowSupplierModal(true)} className="btn-outline" style={{ fontSize: '0.82rem' }}><Plus size={14} /> Add Supplier</button>}
        </div>
      </div>

      {/* Expenses Table */}
      {activeSubTab === 'expenses' && (
        <div className="illoca-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Date</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Category</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Amount (₹)</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Paid By</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Notes / Description</th>
                <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{exp.date}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className="mono-tag">{exp.category}</span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--status-red)', fontSize: '0.95rem' }}>
                    ₹{exp.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{exp.paidBy}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{exp.notes}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    {role === 'admin' && (
                      <button 
                        onClick={() => handleDeleteExpense(exp.id)} 
                        className="btn-outline"
                        style={{ padding: '0.25rem 0.45rem', color: 'var(--status-red)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Suppliers Table */}
      {activeSubTab === 'suppliers' && (
        <>
        <div className="illoca-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Supplier Name</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Contact Person & Phone</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>City / Hub</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>GSTIN</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Bills</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(sup => (
                <tr key={sup.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{sup.name}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div>{sup.contactPerson || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{sup.phone}</div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{sup.city}</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{sup.gstin || '—'}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{(sup.purchaseBills || []).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="illoca-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Received Products & Supplier Bills</h3>
          {supplierBills.length ? <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '0.6rem' }}>Date</th><th style={{ padding: '0.6rem' }}>Supplier</th><th style={{ padding: '0.6rem' }}>Bill No.</th><th style={{ padding: '0.6rem' }}>Product Received</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Qty</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Bill Total</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>Due (Khata)</th>
            </tr></thead>
            <tbody>{supplierBills.map(bill => <tr key={bill.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.65rem' }}>{bill.date || '—'}</td><td style={{ padding: '0.65rem', fontWeight: 600 }}>{bill.supplierName}</td><td style={{ padding: '0.65rem' }}>{bill.invoiceNumber}</td><td style={{ padding: '0.65rem' }}>{bill.productName}</td><td style={{ padding: '0.65rem', textAlign: 'right' }}>{bill.quantity}</td><td style={{ padding: '0.65rem', textAlign: 'right' }}>₹{(Number(bill.totalAmount) || 0).toLocaleString()}</td><td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 700 }}>₹{(Number(bill.balanceDue ?? bill.totalAmount) || 0).toLocaleString()}</td>
            </tr>)}</tbody>
          </table> : <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem' }}>No supplier bills yet. Use “Receive Stock & Add Bill” when products arrive.</div>}
        </div>
        </>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleAddExpense} className="illoca-card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Record Shop Expense</h3>
              <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Expense Category *</label>
                <select 
                  value={expCategory} 
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="input-field"
                >
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  required
                  className="input-field"
                  style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--status-red)' }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Paid Via</label>
                <select 
                  value={expPaidBy} 
                  onChange={(e) => setExpPaidBy(e.target.value)}
                  className="input-field"
                >
                  <option value="Cash">Cash Drawer</option>
                  <option value="UPI">Shop UPI (GPay/PhonePe)</option>
                  <option value="Bank Transfer">Bank Transfer (HDFC)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Tea for customers or TSSPDCL bill"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stock Inward Modal */}
      {showInwardModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleStockInward} className="illoca-card animate-fade-in" style={{ maxWidth: '520px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Purchase Stock Inward (From Supplier)</h3>
              <button type="button" onClick={() => setShowInwardModal(false)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Select Supplier</label>
                <select 
                  value={selectedSupplierId} 
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.city})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Supplier Bill / Invoice No.</label>
                  <input type="text" value={inwardInvoiceNumber} onChange={e => setInwardInvoiceNumber(e.target.value)} placeholder="e.g. INV-1042" className="input-field" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Received Date *</label>
                  <input type="date" value={inwardDate} onChange={e => setInwardDate(e.target.value)} required className="input-field" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Stock Product Item *</label>
                <select 
                  value={inwardProductId} 
                  onChange={(e) => setInwardProductId(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="">-- Choose Stock Item to Restock --</option>
                  {inventory.map(p => <option key={p.id} value={p.id}>{p.brand} - {p.name} (Current: {p.stock} pcs)</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Quantity Added (Pcs) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={inwardQty}
                    onChange={(e) => setInwardQty(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Unit Purchase Cost ₹</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="New Cost Price"
                    value={inwardUnitCost}
                    onChange={(e) => setInwardUnitCost(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  IMEIs / Serial Numbers (If mobiles/appliances, one per line):
                </label>
                <textarea
                  rows={3}
                  placeholder="358201948291048&#10;358201948291049"
                  value={inwardImeisText}
                  onChange={(e) => setInwardImeisText(e.target.value)}
                  className="input-field"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowInwardModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                Inward to Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleAddSupplier} className="illoca-card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Add New Supplier</h3>
              <button type="button" onClick={() => setShowSupplierModal(false)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Supplier Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabad Mobile Hub"
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Contact Person Name</label>
                <input
                  type="text"
                  placeholder="Manager / Sales Rep"
                  value={suppContact}
                  onChange={(e) => setSuppContact(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Phone Number *</label>
                <input
                  type="text"
                  placeholder="10-digit Phone"
                  value={suppPhone}
                  onChange={(e) => setSuppPhone(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>City / Location</label>
                <input
                  type="text"
                  placeholder="Hyderabad / Nizamabad"
                  value={suppCity}
                  onChange={(e) => setSuppCity(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>GSTIN</label>
                <input
                  type="text"
                  placeholder="GST Number"
                  value={suppGstin}
                  onChange={(e) => setSuppGstin(e.target.value.toUpperCase())}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowSupplierModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
