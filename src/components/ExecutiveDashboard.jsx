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
import { sumRefunds, sumReturnProfitAdjustments, sumReplacementRevenueAdjustments, sumReplacementProfitAdjustments, sumReplacementSettlement } from '../utils/returnAccounting';

export default function ExecutiveDashboard({
  invoices = [],
  expenses = [],
  inventory = [],
  suppliers = [],
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
  const [lowStockDisplayLimit, setLowStockDisplayLimit] = useState(5);
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
  const todayReturnDate = (entry) => String(entry.date || '').slice(0, 10) === todayStr;
  const todayRefundTotal = sumRefunds(invoices, todayReturnDate);
  const todayReplacementDelta = sumReplacementRevenueAdjustments(invoices, todayReturnDate);
  const todayCashRefunds = sumRefunds(invoices, todayReturnDate, (method) => method === 'Cash');
  const todayUpiRefunds = sumRefunds(invoices, todayReturnDate, (method) => method.includes('UPI'));
  const todayOtherRefunds = sumRefunds(invoices, todayReturnDate, (method) => method !== 'Cash' && !method.includes('UPI') && method !== 'Khata credit');
  const todayCashExchangeSettlement = sumReplacementSettlement(invoices, todayReturnDate, (method) => method === 'Cash');
  const todayUpiExchangeSettlement = sumReplacementSettlement(invoices, todayReturnDate, (method) => method.includes('UPI'));
  const todayOtherExchangeSettlement = sumReplacementSettlement(invoices, todayReturnDate, (method) => !['Cash', 'Khata due', 'Khata credit'].includes(method) && !method.includes('UPI'));
  const todayTotalSale = todayInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0) - todayRefundTotal + todayReplacementDelta;
  const todayPaidReceived = todayInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) - todayCashRefunds - todayUpiRefunds - todayOtherRefunds + todayCashExchangeSettlement + todayUpiExchangeSettlement + todayOtherExchangeSettlement;

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
  }, 0) - sumReturnProfitAdjustments(invoices, todayReturnDate) + sumReplacementProfitAdjustments(invoices, todayReturnDate);

  const todayProfitMarginPercent = todayTotalSale > 0 
    ? ((todayGrossProfit / todayTotalSale) * 100).toFixed(1) 
    : 0;

  // 3. CASH / UPI ALAG COLLECTION
  const todayCashCollection = todayInvoices
    .filter(inv => inv.paymentMode === 'Cash')
    .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) - todayCashRefunds + todayCashExchangeSettlement;

  const todayUpiCollection = todayInvoices
    .filter(inv => inv.paymentMode === 'UPI' || inv.paymentMode === 'UPI / QR' || inv.paymentMode?.includes('UPI'))
    .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) - todayUpiRefunds + todayUpiExchangeSettlement;

  const todayOtherCollection = todayInvoices
    .filter(inv => inv.paymentMode !== 'Cash' && !inv.paymentMode?.includes('UPI'))
    .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) - todayOtherRefunds + todayOtherExchangeSettlement;

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

  const supplierNameById = useMemo(
    () => new Map(suppliers.map(supplier => [String(supplier.id), supplier.name])),
    [suppliers]
  );

  const getProductSupplierNames = item => {
    const names = [
      ...(item.supplierPurchases || []).map(purchase => supplierNameById.get(String(purchase.supplierId)) || purchase.supplierName),
      ...(item.units || []).map(unit => supplierNameById.get(String(unit.supplierId)) || unit.supplierName),
      supplierNameById.get(String(item.supplierId)) || item.supplierName,
    ].map(name => String(name || '').trim()).filter(Boolean);
    return [...new Set(names)];
  };

  // 7. PURANA STOCK (Aging analysis: 30 / 60 / 90+ days without sale)
  const agedInventory = useMemo(
    () => inventory.map(item => ({ ...item, computedAgingDays: getAgingDays(item) })),
    [inventory]
  );
  const oldStockReminderDays = shopConfig.oldStockReminderMonths === 'custom'
    ? (Number(shopConfig.oldStockReminderCustomMonths) || 1) * ({ days: 1, months: 30, years: 365 }[shopConfig.oldStockReminderCustomUnit] || 30)
    : (Number(shopConfig.oldStockReminderMonths) === 12 ? 365 : (Number(shopConfig.oldStockReminderMonths) || 3) * 30);

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
        gap: 