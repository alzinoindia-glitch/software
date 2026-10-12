import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  IndianRupee,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  Smartphone,
  Wrench,
  Receipt,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  FileText,
  Search,
  RefreshCw,
  Printer,
  ChevronRight,
  Layers,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Send,
  Plus
} from 'lucide-react';
import { getAgingDays, applyOffer, removeOffer, recommendedOfferPct } from '../utils/stockOffers';

export default function ExecutiveDashboard({
  invoices = [],
  expenses = [],
  inventory = [],
  setInventory = null,
  customers = [],
  usedPurchases = [],
  repairJobs = [],
  warrantyClaims = [],
  setWarrantyClaims = () => {},
  shopConfig = {},
  onNavigateTab = () => {},
  onPrintInvoice = () => {},
  onOpenProductInventory = () => {}
}) {
  const [agingFilter, setAgingFilter] = useState('all'); // 'all' | '30' | '60' | '90'
  const [showAddClaimModal, setShowAddClaimModal] = useState(false);
  const [newClaim, setNewClaim] = useState({
    type: 'Customer',
    customerName: '',
    phone: '',
    supplierName: '',
    productName: '',
    serialOrImei: '',
    issueDescription: '',
    claimDate: new Date().toISOString().split('T')[0],
    status: 'Received at Shop',
    expectedReturnDate: ''
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // 1. AAJ KI SALE (Today's Total ₹ and Bills count)
  const todayInvoices = useMemo(() => {
    return invoices.filter(inv => inv.date === todayStr);
  }, [invoices, todayStr]);

  const todayBillsCount = todayInvoices.length;
  const todayTotalSale = todayInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  const todayPaidReceived = todayInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);

  // 2. AAJ KA GROSS PROFIT (Gross Profit after purchase cost)
  const todayGrossProfit = todayInvoices.reduce((sum, inv) => {
    if (inv.totalProfit !== undefined) return sum + Number(inv.totalProfit);
    // Line-item fallback
    const itemsProfit = (inv.items || []).reduce((itemSum, item) => {
      const buyRate = Number(item.buyPrice) || 0;
      const sellRate = Number(item.rate) || 0;
      return itemSum + ((sellRate - buyRate) * (Number(item.qty) || 1));
    }, 0);
    return sum + (itemsProfit - (Number(inv.discount) || 0));
  }, 0);

  const todayProfitMarginPercent = todayTotalSale > 0 
    ? ((todayGrossProfit / todayTotalSale) * 100).toFixed(1) 
    : 0;

  // 3. CASH / UPI ALAG COLLECTION
  const todayCashCollection = todayInvoices
    .filter(inv => inv.paymentMode === 'Cash')
    .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);

  const todayUpiCollection = todayInvoices
    .filter(inv => inv.paymentMode === 'UPI' || inv.paymentMode === 'UPI / QR' || inv.paymentMode?.includes('UPI'))
    .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);

  const todayOtherCollection = todayInvoices
    .filter(inv => inv.paymentMode !== 'Cash' && !inv.paymentMode?.includes('UPI'))
    .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);

  // 4. STOCK VALUE AT PURCHASE RATE
  const totalStockUnits = inventory.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
  const totalStockPurchaseValue = inventory.reduce((sum, i) => sum + ((Number(i.buyPrice) || 0) * (Number(i.stock) || 0)), 0);
  const totalStockRetailValue = inventory.reduce((sum, i) => sum + ((Number(i.sellPrice) || 0) * (Number(i.stock) || 0)), 0);
  const potentialInventoryMargin = totalStockRetailValue - totalStockPurchaseValue;

  // 5. USED MOBILES METRICS
  const usedMobilesInStock = inventory
    .filter(i => i.category === 'Used Mobiles')
    .reduce((sum, i) => sum + (Number(i.stock) || 0), 0);

  const usedMobilesBoughtCount = usedPurchases.length;
  const usedMobilesBoughtValuation = usedPurchases.reduce((sum, p) => sum + (Number(p.buyPrice) || 0), 0);

  const usedMobilesSoldInvoices = invoices.filter(
    inv => inv.isRefurbishedResale || (inv.items && inv.items.some(it => it.category === 'Used Mobiles'))
  );
  const usedMobilesSoldCount = usedMobilesSoldInvoices.length;

  // 6. LOW STOCK ALERT (Items below threshold with Rack & Bin)
  const lowStockItems = useMemo(() => {
    return inventory.filter(i => (Number(i.stock) || 0) <= (Number(i.lowStockThreshold) || 2));
  }, [inventory]);

  // 7. PURANA STOCK (Aging analysis: 30 / 60 / 90+ days without sale)
  const agedInventory = useMemo(
    () => inventory.map(item => ({ ...item, computedAgingDays: getAgingDays(item) })),
    [inventory]
  );
  const oldStockReminderMonths = Number(shopConfig.oldStockReminderMonths === 'custom' ? shopConfig.oldStockReminderCustomMonths : shopConfig.oldStockReminderMonths) || 3;
  const oldStockReminderDays = oldStockReminderMonths === 12 ? 365 : oldStockReminderMonths * 30;

  const agingStockItems = useMemo(() => {
    return agedInventory.filter(item => {
      if (!(Number(item.stock) > 0)) return false;
      if (agingFilter === '30') return item.computedAgingDays >= 30 && item.computedAgingDays < 60;
      if (agingFilter === '60') return item.computedAgingDays >= 60 && item.computedAgingDays < 90;
      if (agingFilter === '90') return item.computedAgingDays >= 90;
      return item.computedAgingDays >= oldStockReminderDays;
    }).sort((a, b) => b.computedAgingDays - a.computedAgingDays);
  }, [agedInventory, agingFilter, oldStockReminderDays]);

  const inStockAged = agedInventory.filter(i => Number(i.stock) > 0);
  const deadStockCount90 = inStockAged.filter(i => i.computedAgingDays >= 90).length;
  const slowStockCount60 = inStockAged.filter(i => i.computedAgingDays >= 60 && i.computedAgingDays < 90).length;
  const slowStockCount30 = inStockAged.filter(i => i.computedAgingDays >= 30 && i.computedAgingDays < 60).length;

  // Offer actions (update live sellPrice -> reflected in POS + alzino.shop)
  const [offerDraft, setOfferDraft] = useState({}); // { [productId]: pct }
  const handleApplyOffer = (item, type) => {
    if (!setInventory) return;
    const pct = Number(offerDraft[item.id] ?? (recommendedOfferPct(item) || 5));
    if (!(pct > 0)) return;
    setInventory(prev => prev.map(p => (p.id === item.id ? applyOffer(p, pct, type) : p)));
  };

  const handleRemoveOffer = (item) => {
    if (!setInventory) return;
    setInventory(prev => prev.map(p => (p.id === item.id ? removeOffer(p) : p)));
  };

  const renderOfferButton = (item, type) => (
    item.offer ? (
      <button
        onClick={() => handleRemoveOffer(item)}
        className="btn-secondary"
        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', color: 'var(--status-red)' }}
        title={`Live offer: ${item.offer.label}. Click to restore ₹${Number(item.offer.regularPrice).toLocaleString()}`}
      >
        Remove {item.offer.pct}% Offer
      </button>
    ) : (
      <span style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
        <select
          aria-label={`Offer percent for ${item.name}`}
          value={offerDraft[item.id] ?? (recommendedOfferPct(item) || 5)}
          onChange={(e) => setOfferDraft(d => ({ ...d, [item.id]: Number(e.target.value) }))}
          className="input-field"
          style={{ padding: '0.2rem 0.3rem', fontSize: '0.74rem', width: 'auto' }}
        >
          {[5, 8, 10, 12, 15, 20, 25].map(p => <option key={p} value={p}>{p}%</option>)}
        </select>
        <button
          onClick={() => handleApplyOffer(item, type)}
          className="btn-secondary"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', color: 'var(--status-green)', fontWeight: 700 }}
          title={`Apply discount — shown on alzino.shop and used in POS billing. Never below buy cost ₹${Number(item.buyPrice || 0).toLocaleString()}`}
          disabled={!setInventory}
        >
          Apply Offer
        </button>
      </span>
    )
  );

  const totalCapitalLockedInAging = agingStockItems.reduce(
    (sum, item) => sum + ((Number(item.buyPrice) || 0) * (Number(item.stock) || 0)), 
    0
  );

  // 8. REPAIR PENDING STAGES
  const repairStats = useMemo(() => {
    const received = repairJobs.filter(j => j.status === 'Received').length;
    const inProgress = repairJobs.filter(j => j.status === 'In Progress' || j.status === 'Parts Awaiting').length;
    const ready = repairJobs.filter(j => j.status === 'Ready for Delivery').length;
    const delivered = repairJobs.filter(j => j.status === 'Delivered').length;
    const totalPending = received + inProgress + ready;
    const totalPendingBalance = repairJobs
      .filter(j => j.status !== 'Delivered')
      .reduce((sum, j) => sum + (Number(j.balanceDue) || 0), 0);

    return { received, inProgress, ready, delivered, totalPending, totalPendingBalance };
  }, [repairJobs]);

  // 9. EXPENSES (Aaj aur Is Mahine ka Kharcha)
  const todayExpenses = useMemo(() => {
    return expenses.filter(exp => exp.date === todayStr);
  }, [expenses, todayStr]);
  const todayExpensesTotal = todayExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  const monthExpenses = useMemo(() => {
    return expenses.filter(exp => exp.date && exp.date.startsWith(currentMonthStr));
  }, [expenses, currentMonthStr]);
  const monthExpensesTotal = monthExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  // 10. WARRANTY / RETURNS TRACKING
  const pendingCustomerClaims = (warrantyClaims || []).filter(c => c.type === 'Customer' && c.status !== 'Resolved');
  const pendingSupplierClaims = (warrantyClaims || []).filter(c => c.type === 'Supplier' && c.status !== 'Credit Note Received');

  const handleAddClaim = () => {
    if (!newClaim.productName) {
      alert("Please enter product name");
      return;
    }
    const claimObj = {
      ...newClaim,
      id: `CLM-${String((warrantyClaims || []).length + 1).padStart(3, '0')}`
    };
    setWarrantyClaims(prev => [claimObj, ...prev]);
    setShowAddClaimModal(false);
    setNewClaim({
      type: 'Customer',
      customerName: '',
      phone: '',
      supplierName: '',
      productName: '',
      serialOrImei: '',
      issueDescription: '',
      claimDate: todayStr,
      status: 'Received at Shop',
      expectedReturnDate: ''
    });
  };

  return (
    <div className="app-module-container" style={{ paddingBottom: '2.5rem' }}>
      
      {/* Top Banner: Store Operational Control Center */}
      <div style={{
        background: 'var(--surface-card)',
        padding: '0.85rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                ALZINO Executive Command Center
              </h2>
              <span className="mono-tag" style={{ background: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 800 }}>
                ● LIVE SYNC
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Old Bus Stand, Bodhan, Nizamabad, Telangana – 503185 • Today: {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigateTab('pos')}
            className="btn-primary"
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}
          >
            <Smartphone size={15} />
            <span>Open POS Counter (F2)</span>
          </button>
          <button
            onClick={() => onNavigateTab('inventory')}
            className="btn-secondary"
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}
          >
            <Package size={15} />
            <span>Stock & Rack/Bin</span>
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary"
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}
          >
            <Printer size={15} />
            <span>Print Day Report</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 PRIMARY METRIC CARDS (AAJ KI SALE, AAJ KA PROFIT, CASH/UPI, STOCK VALUE) */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        
        {/* ITEM 1: AAJ KI SALE */}
        <div className="illoca-card" style={{ padding: '1.1rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              1. Aaj Ki Sale (Today's Sales)
            </span>
            <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)', fontWeight: 800 }}>
              {todayBillsCount} Bills Made
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>
            ₹{todayTotalSale.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Received: <strong style={{ color: 'var(--status-green)' }}>₹{todayPaidReceived.toLocaleString()}</strong></span>
            {todayTotalSale - todayPaidReceived > 0 && (
              <span style={{ color: 'var(--status-red)' }}>Khata: ₹{(todayTotalSale - todayPaidReceived).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* ITEM 2: AAJ KA PROFIT */}
        <div className="illoca-card" style={{ padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              2. Aaj Ka Gross Profit
            </span>
            <span className="mono-tag" style={{ background: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 800 }}>
              {todayProfitMarginPercent}% Margin
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--status-green)', fontFamily: 'var(--font-heading)' }}>
            ₹{todayGrossProfit.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Pure Gross Profit after purchase cost deduction
          </div>
        </div>

        {/* ITEM 3: CASH / UPI COLLECTION ALAG */}
        <div className="illoca-card" style={{ padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              3. Cash / UPI Collections
            </span>
            <span className="mono-tag">Split View</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.3rem' }}>
            <div style={{ background: 'var(--surface-primary)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>💵 CASH COLLECTION</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                ₹{todayCashCollection.toLocaleString()}
              </div>
            </div>
            <div style={{ background: 'var(--surface-primary)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>📱 UPI / QR COLLECTION</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-primary)', marginTop: '0.15rem' }}>
                ₹{todayUpiCollection.toLocaleString()}
              </div>
            </div>
          </div>
          {todayOtherCollection > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem', textAlign: 'right' }}>
              Card / Other: ₹{todayOtherCollection.toLocaleString()}
            </div>
          )}
        </div>

        {/* ITEM 4: STOCK VALUE (PURCHASE RATE PAR) */}
        <div className="illoca-card" style={{ padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              4. Total Stock Valuation
            </span>
            <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)' }}>
              {totalStockUnits} Total Units
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            ₹{totalStockPurchaseValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Retail Value: <strong>₹{totalStockRetailValue.toLocaleString()}</strong></span>
            <span style={{ color: 'var(--status-green)' }}>+₹{potentialInventoryMargin.toLocaleString()} Gain</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2ND ROW: ITEM 5 - USED MOBILES OVERVIEW                                   */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="illoca-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Smartphone size={18} color="var(--accent-primary)" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                5. Used & Refurbished Mobiles
              </h4>
            </div>
            <button
              onClick={() => onNavigateTab('used-phones')}
              className="btn-secondary"
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
            >
              Open Module <ChevronRight size={12} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
            <div style={{ background: 'var(--surface-primary)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>IN STOCK</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
                {usedMobilesInStock}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Ready for Sale</div>
            </div>

            <div style={{ background: 'var(--surface-primary)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>PURCHASED</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--status-amber-text, #AC7C20)', marginTop: '0.2rem' }}>
                {usedMobilesBoughtCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Total ₹{usedMobilesBoughtValuation.toLocaleString()}</div>
            </div>

            <div style={{ background: 'var(--surface-primary)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>RESOLD</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--status-green-text, #1F6E48)', marginTop: '0.2rem' }}>
                {usedMobilesSoldCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Customer Invoices</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3RD ROW: LOW STOCK ALERT (ITEM 6) WITH RACK/BIN LOCATION                  */}
      {/* ========================================================================= */}
      <div className="illoca-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--status-amber-bg)',
              color: 'var(--status-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                6. Low Stock Alert — Kaunse Items Dobara Mangwana Hai
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Products at or below reorder threshold. Direct Rack & Bin locations displayed for rapid warehouse inspection.
              </p>
            </div>
          </div>
          <span className="mono-tag" style={{ background: 'var(--status-amber-bg)', color: 'var(--status-amber)', fontWeight: 800 }}>
            {lowStockItems.length} Items Require Reorder
          </span>
        </div>

        {lowStockItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--status-green)' }}>
            <CheckCircle2 size={24} style={{ display: 'inline', marginBottom: '0.35rem' }} />
            <p style={{ margin: 0, fontWeight: 700 }}>All stock levels healthy! No items below threshold.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Product Name & Brand</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Current Stock</th>
                  <th style={{ textAlign: 'center' }}>Min Limit</th>
                  <th>Warehouse Location (Rack / Bin)</th>
                  <th style={{ textAlign: 'right' }}>Buy Rate</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map(item => (
                  <tr key={item.id}>
                    <td 
                      onClick={() => onOpenProductInventory && onOpenProductInventory(item)}
                      style={{ cursor: 'pointer' }}
                      title="Tap to open respective product in Stock & Inventory"
                    >
                      <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)' }}>
                        <span>{item.name}</span>
                        <ArrowUpRight size={13} />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Brand: {item.brand} • Item ID: {item.id}</div>
                    </td>
                    <td>
                      <span className="mono-tag">{item.category}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="mono-tag" style={{
                        background: item.stock === 0 ? 'var(--status-red-bg)' : 'var(--status-amber-bg)',
                        color: item.stock === 0 ? 'var(--status-red)' : 'var(--status-amber)',
                        fontWeight: 900
                      }}>
                        {item.stock === 0 ? 'OUT OF STOCK' : `${item.stock} left`}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {item.lowStockThreshold || 2}
                    </td>
                    <td>
                      <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                        <MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />
                        Rack: {item.rack || 'R-01'} | Bin: {item.bin || 'B-01'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      ₹{Number(item.buyPrice).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => onOpenProductInventory && onOpenProductInventory(item)}
                          className="btn-primary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          title="View Product in Stock Hub"
                        >
                          View Stock
                        </button>
                        <button
                          onClick={() => onNavigateTab('expenses')}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-primary)' }}
                        >
                          Call Supplier
                        </button>
                        {Number(item.stock) > 0 && renderOfferButton(item, 'low-stock')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4TH ROW: PURANA STOCK (AGING: 30 / 60 / 90+ DAYS) (ITEM 7)                */}
      {/* ========================================================================= */}
      <div className="illoca-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--status-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                7. Purana Stock (Aging Analysis — 30 / 60 / 90+ Din Se Nahi Bika)
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Capital locked in slow-moving inventory: <strong style={{ color: 'var(--status-red)' }}>₹{totalCapitalLockedInAging.toLocaleString()}</strong>
              </p>
            </div>
          </div>

          {/* Aging Filter Pills */}
          <div className="segmented-bar">
            <button
              onClick={() => setAgingFilter('all')}
              className={`segmented-item ${agingFilter === 'all' ? 'active-blue' : ''}`}
              style={{ fontSize: '0.78rem' }}
            >
              All Slow ({deadStockCount90 + slowStockCount60 + slowStockCount30})
            </button>
            <button
              onClick={() => setAgingFilter('30')}
              className={`segmented-item ${agingFilter === '30' ? 'active-blue' : ''}`}
              style={{ fontSize: '0.78rem' }}
            >
              30-60 Days ({slowStockCount30})
            </button>
            <button
              onClick={() => setAgingFilter('60')}
              className={`segmented-item ${agingFilter === '60' ? 'active-blue' : ''}`}
              style={{ fontSize: '0.78rem' }}
            >
              60-90 Days ({slowStockCount60})
            </button>
            <button
              onClick={() => setAgingFilter('90')}
              className={`segmented-item ${agingFilter === '90' ? 'active-blue' : ''}`}
              style={{ fontSize: '0.78rem', color: deadStockCount90 > 0 ? 'var(--status-red)' : 'inherit' }}
            >
              🚨 90+ Days Dead ({deadStockCount90})
            </button>
          </div>
        </div>

        {agingStockItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0 }}>No items in this aging duration. Inventory turnover is active!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock Qty</th>
                  <th>Rack / Bin</th>
                  <th>Aging Days</th>
                  <th style={{ textAlign: 'right' }}>Capital Locked</th>
                  <th>Recommended Shop Action</th>
                </tr>
              </thead>
              <tbody>
                {agingStockItems.map(item => {
                  const days = item.computedAgingDays;
                  const isCritical = days >= 90;
                  const isModerate = days >= 60;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 800 }}>{item.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Brand: {item.brand} • Inward: {item.receivedDate || 'Older stock'}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {item.stock} pcs
                      </td>
                      <td>
                        <span className="mono-tag">
                          Rack: {item.rack || 'R-01'} | Bin: {item.bin || 'B-01'}
                        </span>
                      </td>
                      <td>
                        <span className="mono-tag" style={{
                          background: isCritical ? 'var(--status-red-bg)' : isModerate ? 'var(--status-amber-bg)' : 'var(--illoca-blue-subtle)',
                          color: isCritical ? 'var(--status-red)' : isModerate ? 'var(--status-amber)' : 'var(--accent-primary)',
                          fontWeight: 800
                        }}>
                          {days} Days Old
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--status-red)' }}>
                        ₹{(Number(item.buyPrice) * Number(item.stock)).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {isCritical ? '🔥 Offer 15% Clearance / Bundle with Mobile' : isModerate ? 'Offer 5-8% Counter Discount to clear' : 'Keep visible on display showcase'}
                          </span>
                          {renderOfferButton(item, 'old-stock')}
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
      {/* 5TH ROW: REPAIR PIPELINE (ITEM 8) & EXPENSES (ITEM 9)                     */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* ITEM 8: REPAIR LAB PENDING PIPELINE */}
        <div className="illoca-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={18} color="var(--accent-primary)" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                8. Repair Lab Status Pipeline
              </h4>
            </div>
            <span className="mono-tag chip-amber" style={{ fontWeight: 800 }}>
              {repairStats.totalPending} Pending Jobs
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ background: 'var(--surface-primary)', padding: '0.5rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700 }}>RECEIVED</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-primary)', marginTop: '0.15rem' }}>
                {repairStats.received}
              </div>
            </div>
            <div style={{ background: 'var(--surface-primary)', padding: '0.5rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700 }}>REPAIRING</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--status-amber-text, #AC7C20)', marginTop: '0.15rem' }}>
                {repairStats.inProgress}
              </div>
            </div>
            <div style={{ background: 'var(--surface-primary)', padding: '0.5rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700 }}>READY</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--status-green-text, #1F6E48)', marginTop: '0.15rem' }}>
                {repairStats.ready}
              </div>
            </div>
            <div style={{ background: 'var(--surface-primary)', padding: '0.5rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700 }}>DELIVERED</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {repairStats.delivered}
              </div>
            </div>
          </div>

          {/* Structured Table with visible lines */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th style={{ textAlign: 'center' }}>Job Count</th>
                  <th>Status Description</th>
                  <th style={{ textAlign: 'right' }}>Pending Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>RECEIVED</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{repairStats.received}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>Intake awaiting bench inspection</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>-</td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--status-amber-text, #AC7C20)' }}>REPAIRING</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{repairStats.inProgress}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>Active repair in progress</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>-</td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--status-green-text, #1F6E48)' }}>READY</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{repairStats.ready}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>Completed & ready for pickup</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--status-green-text, #1F6E48)' }}>₹{repairStats.totalPendingBalance.toLocaleString()}</td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--text-secondary)' }}>DELIVERED</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{repairStats.delivered}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>Handed over to customer</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>₹0</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Pending collection on ready devices:</span>
            <strong style={{ color: 'var(--status-green-text, #1F6E48)' }}>₹{repairStats.totalPendingBalance.toLocaleString()}</strong>
          </div>
        </div>

        {/* ITEM 9: EXPENSES (AAJ AUR IS MAHINE KA KHARCHA) */}
        <div className="illoca-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={18} color="var(--color-danger, #D33F3C)" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                9. Expenses (Aaj aur Is Mahine)
              </h4>
            </div>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="btn-secondary"
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
            >
              Manage <ChevronRight size={12} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div style={{ background: 'var(--surface-primary)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>AAJ KA KHARCHA (TODAY)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-danger, #D33F3C)', marginTop: '0.15rem' }}>
                ₹{todayExpensesTotal.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{todayExpenses.length} Expense Entries</div>
            </div>

            <div style={{ background: 'var(--surface-primary)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>THIS MONTH (TOTAL)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                ₹{monthExpensesTotal.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{monthExpenses.length} Monthly Entries</div>
            </div>
          </div>

          {/* Structured Table with visible lines */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th style={{ textAlign: 'center' }}>Total Entries</th>
                  <th style={{ textAlign: 'right' }}>Total Expense</th>
                  <th style={{ textAlign: 'center' }}>Budget Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>AAJ KA KHARCHA (TODAY)</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{todayExpenses.length} Entries</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-danger, #D33F3C)' }}>₹{todayExpensesTotal.toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}><span className="mono-tag chip-green">Within daily budget</span></td>
                </tr>
                <tr>
                  <td><strong>THIS MONTH (TOTAL)</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{monthExpenses.length} Entries</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>₹{monthExpensesTotal.toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}><span className="mono-tag chip-blue">Within monthly budget</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6TH ROW: WARRANTY & RETURNS (ITEM 10)                                     */}
      {/* ========================================================================= */}
      <div className="illoca-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--illoca-blue-subtle)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                10. Warranty & Returns (Pending Customer & Supplier Claims)
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Track devices sent to brand service centers and supplier DOA replacements.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="mono-tag" style={{ background: 'var(--status-amber-bg)', color: 'var(--status-amber)', fontWeight: 800 }}>
              {pendingCustomerClaims.length} Customer Claims
            </span>
            <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)', fontWeight: 800 }}>
              {pendingSupplierClaims.length} Supplier RMAs
            </span>
            <button
              onClick={() => setShowAddClaimModal(true)}
              className="btn-primary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              <Plus size={14} />
              <span>New Warranty Claim</span>
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Type</th>
                <th>Party Name & Contact</th>
                <th>Product & Serial / IMEI</th>
                <th>Issue Reported</th>
                <th>Claim Date</th>
                <th>Status</th>
                <th>Expected Date</th>
              </tr>
            </thead>
            <tbody>
              {(warrantyClaims || []).map(claim => (
                <tr key={claim.id}>
                  <td style={{ fontWeight: 800, fontFamily: 'monospace' }}>{claim.id}</td>
                  <td>
                    <span className="mono-tag" style={{
                      background: claim.type === 'Customer' ? 'var(--illoca-blue-subtle)' : 'var(--status-amber-bg)',
                      color: claim.type === 'Customer' ? 'var(--accent-primary)' : 'var(--status-amber)',
                      fontWeight: 800
                    }}>
                      {claim.type}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{claim.customerName || claim.supplierName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{claim.phone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{claim.productName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>S/N: {claim.serialOrImei || 'NA'}</div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {claim.issueDescription}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {claim.claimDate}
                  </td>
                  <td>
                    <span className="mono-tag" style={{
                      background: claim.status.includes('Resolved') || claim.status.includes('Replaced') ? 'var(--status-green-bg)' : 'var(--status-amber-bg)',
                      color: claim.status.includes('Resolved') || claim.status.includes('Replaced') ? 'var(--status-green)' : 'var(--status-amber)',
                      fontWeight: 700
                    }}>
                      {claim.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {claim.expectedReturnDate || 'Under Review'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW CLAIM MODAL */}
      {showAddClaimModal && (
        <div className="modal-backdrop no-print">
          <div className="modal-dialog" style={{ maxWidth: '540px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontWeight: 800 }}>Create New Warranty / Return Claim</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label className="input-label">Claim Type</label>
                <select
                  value={newClaim.type}
                  onChange={(e) => setNewClaim({ ...newClaim, type: e.target.value })}
                  className="input-field"
                >
                  <option value="Customer">Customer Warranty Claim (To Service Center)</option>
                  <option value="Supplier">Supplier Return / RMA (Dead on Arrival / Defective)</option>
                </select>
              </div>

              <div>
                <label className="input-label">{newClaim.type === 'Customer' ? 'Customer Name' : 'Supplier Name'}</label>
                <input
                  type="text"
                  value={newClaim.type === 'Customer' ? newClaim.customerName : newClaim.supplierName}
                  onChange={(e) => setNewClaim(newClaim.type === 'Customer' ? { ...newClaim, customerName: e.target.value } : { ...newClaim, supplierName: e.target.value })}
                  className="input-field"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label className="input-label">Mobile Number</label>
                <input
                  type="text"
                  value={newClaim.phone}
                  onChange={(e) => setNewClaim({ ...newClaim, phone: e.target.value })}
                  className="input-field"
                  placeholder="10-digit mobile"
                />
              </div>

              <div>
                <label className="input-label">Product Name & Model</label>
                <input
                  type="text"
                  value={newClaim.productName}
                  onChange={(e) => setNewClaim({ ...newClaim, productName: e.target.value })}
                  className="input-field"
                  placeholder="e.g. OnePlus Nord CE 4"
                />
              </div>

              <div>
                <label className="input-label">Serial Number or IMEI</label>
                <input
                  type="text"
                  value={newClaim.serialOrImei}
                  onChange={(e) => setNewClaim({ ...newClaim, serialOrImei: e.target.value })}
                  className="input-field"
                  placeholder="15-digit IMEI or S/N"
                />
              </div>

              <div>
                <label className="input-label">Issue / Defect Description</label>
                <textarea
                  value={newClaim.issueDescription}
                  onChange={(e) => setNewClaim({ ...newClaim, issueDescription: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="e.g. Screen flickering or sound cracking"
                />
              </div>

              <div>
                <label className="input-label">Expected Return / Resolution Date</label>
                <input
                  type="date"
                  value={newClaim.expectedReturnDate}
                  onChange={(e) => setNewClaim({ ...newClaim, expectedReturnDate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowAddClaimModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddClaim} className="btn-primary">
                Save Claim
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
