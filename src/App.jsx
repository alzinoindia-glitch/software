import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import PosBilling from './components/PosBilling';
import UsedMobileModule from './components/UsedMobileModule';
import RepairLab from './components/RepairLab';
import InventoryManager from './components/InventoryManager';
import BarcodeGenerator from './components/BarcodeGenerator';
import CustomerKhata from './components/CustomerKhata';
import ExpenseSupplier from './components/ExpenseSupplier';
import AnalyticsReports from './components/AnalyticsReports';
import InvoicesHub from './components/InvoicesHub';
import SettingsBackup from './components/SettingsBackup';
import IllocaPulloutDrawer from './components/IllocaPulloutDrawer';
import UniversalSearchModal from './components/UniversalSearchModal';
import PrintTemplates from './components/PrintTemplates';
import AdminAuthModal from './components/AdminAuthModal';
import CustomerStorefront from './components/CustomerStorefront';
import { Lock, ShieldCheck, Key } from 'lucide-react';

import {
  defaultShopConfig,
  initialInventory,
  initialUsedPurchases,
  initialRepairJobs,
  initialCustomers,
  initialSuppliers,
  initialExpenses,
  initialInvoices,
  initialWarrantyClaims,
  getStorageData,
  setStorageData,
  purgeDemoRecords
} from './data/initialData';

// Parse active portal and tab from URL path and domain
export function parseRoute() {
  if (typeof window === 'undefined') {
    return { portal: 'customer', role: 'customer', tab: 'storefront' };
  }
  const host = (window.location.hostname || '').toLowerCase();
  let path = (window.location.pathname || '/').replace(/\\/g, '/').toLowerCase();

  // 1. Domain detection for alzino.shop
  if (host === 'alzino.shop' || host.endsWith('.alzino.shop')) {
    if (path.startsWith('/admin')) {
      const sub = path.replace(/^\/admin\/?/, '').trim();
      const tab = (sub === 'customers' || sub === 'khata') ? 'customers' : (sub || 'dashboard');
      return { portal: 'admin', role: 'admin', tab };
    }
    if (path.startsWith('/cashier')) {
      const sub = path.replace(/^\/cashier\/?/, '').trim();
      return { portal: 'cashier', role: 'cashier', tab: sub || 'pos' };
    }
    return { portal: 'customer', role: 'customer', tab: 'storefront' };
  }

  // 2. Direct /admin or /admin/customers path
  if (path.startsWith('/admin')) {
    const sub = path.replace(/^\/admin\/?/, '').trim();
    const tab = (sub === 'customers' || sub === 'khata') ? 'customers' : (sub || 'dashboard');
    return { portal: 'admin', role: 'admin', tab };
  }

  // 3. Direct /cashier path
  if (path.startsWith('/cashier')) {
    const sub = path.replace(/^\/cashier\/?/, '').trim();
    return { portal: 'cashier', role: 'cashier', tab: sub || 'pos' };
  }

  // 4. Default: Customer portal (alzino.shop)
  return { portal: 'customer', role: 'customer', tab: 'storefront' };
}

export default function App() {
  const initialRoute = parseRoute();
  // Portal Mode ('customer' | 'admin' | 'cashier')
  const [portal, setPortal] = useState(() => initialRoute.portal);
  // Theme State
  const [theme, setTheme] = useState(() => getStorageData('THEME', 'cream')); // cream | dark
  // Role Mode ('admin' | 'cashier')
  const [role, setRole] = useState(() => initialRoute.role !== 'customer' ? initialRoute.role : getStorageData('ROLE', 'admin'));
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => initialRoute.tab !== 'storefront' ? initialRoute.tab : 'dashboard');

  const [shopConfig, setShopConfig] = useState(() => {
    const cfg = getStorageData('SHOP_CONFIG', defaultShopConfig);
    if (!cfg?.adminPin || cfg.adminPin === '4488') {
      return { ...cfg, adminPin: '4848' };
    }
    return cfg;
  });
  const [inventory, setInventory] = useState(() => getStorageData('INVENTORY', initialInventory));
  const [usedPurchases, setUsedPurchases] = useState(() => getStorageData('USED_PURCHASES', initialUsedPurchases));
  const [repairJobs, setRepairJobs] = useState(() => getStorageData('REPAIR_JOBS', initialRepairJobs));
  const [customers, setCustomers] = useState(() => getStorageData('CUSTOMERS', initialCustomers));
  const [suppliers, setSuppliers] = useState(() => getStorageData('SUPPLIERS', initialSuppliers));
  const [expenses, setExpenses] = useState(() => getStorageData('EXPENSES', initialExpenses));
  const [invoices, setInvoices] = useState(() => getStorageData('INVOICES', initialInvoices));
  const [warrantyClaims, setWarrantyClaims] = useState(() => getStorageData('WARRANTY_CLAIMS', initialWarrantyClaims));

  // Modals & Drawers
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPulloutOpen, setIsPulloutOpen] = useState(false);
  const [selectedItemForBarcode, setSelectedItemForBarcode] = useState(null);

  // Printing state
  const [printData, setPrintData] = useState(null);
  const [printMode, setPrintMode] = useState(''); // thermal | a4 | voucher | repair | barcodes

  // Synchronize Tab and URL Path
  const handleSelectTab = (tabId) => {
    const normTab = tabId === 'khata' ? 'customers' : tabId;
    setActiveTab(normTab);
    if (portal === 'admin') {
      const url = normTab === 'dashboard' ? '/admin' : `/admin/${normTab}`;
      window.history.pushState(null, '', url);
    } else if (portal === 'cashier') {
      const url = normTab === 'pos' ? '/cashier' : `/cashier/${normTab}`;
      window.history.pushState(null, '', url);
    }
  };

  const handleNavigatePortal = (targetPath) => {
    const cleanPath = targetPath.replace(/\\/g, '/');
    if (cleanPath.startsWith('/admin') && role !== 'admin') {
      setIsAdminAuthModalOpen(true);
      return;
    }
    window.history.pushState(null, '', cleanPath);
    const r = parseRoute();
    setPortal(r.portal);
    if (r.portal === 'admin') {
      setRole('admin');
      setActiveTab(r.tab || 'dashboard');
    } else if (r.portal === 'cashier') {
      setRole('cashier');
      setActiveTab(r.tab || 'pos');
    } else {
      setRole('customer');
      setActiveTab('storefront');
    }
  };

  // Handle browser Back & Forward Navigation
  useEffect(() => {
    const onPopState = () => {
      const r = parseRoute();
      setPortal(r.portal);
      if (r.portal === 'admin') {
        setRole('admin');
        setActiveTab(r.tab || 'dashboard');
      } else if (r.portal === 'cashier') {
        setRole('cashier');
        setActiveTab(r.tab || 'pos');
      } else {
        setRole('customer');
        setActiveTab('storefront');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Quick Bill Product (from Stock Lookup to POS)
  const [quickBillProduct, setQuickBillProduct] = useState(null);

  const handleQuickBill = (product) => {
    setQuickBillProduct(product);
    if (portal === 'customer') {
      handleNavigatePortal('/cashier');
    } else {
      handleSelectTab('pos');
    }
  };

  // Inventory targeted search term (when tapped from Low Stock alert)
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');

  const handleOpenProductInventory = (product) => {
    setInventorySearchTerm(product.name || product.id || '');
    handleSelectTab('inventory');
    setIsPulloutOpen(false);
  };

  // Save to LocalStorage whenever state changes
  useEffect(() => { setStorageData('THEME', theme); }, [theme]);
  useEffect(() => { setStorageData('ROLE', role); }, [role]);
  useEffect(() => { setStorageData('SHOP_CONFIG', shopConfig); }, [shopConfig]);
  useEffect(() => { setStorageData('INVENTORY', inventory); }, [inventory]);
  useEffect(() => { setStorageData('USED_PURCHASES', usedPurchases); }, [usedPurchases]);
  useEffect(() => { setStorageData('REPAIR_JOBS', repairJobs); }, [repairJobs]);
  useEffect(() => { setStorageData('CUSTOMERS', customers); }, [customers]);
  useEffect(() => { setStorageData('SUPPLIERS', suppliers); }, [suppliers]);
  useEffect(() => { setStorageData('EXPENSES', expenses); }, [expenses]);
  useEffect(() => { setStorageData('INVOICES', invoices); }, [invoices]);
  useEffect(() => { setStorageData('WARRANTY_CLAIMS', warrantyClaims); }, [warrantyClaims]);

  // Purge any residual demo data on mount
  useEffect(() => {
    setInventory(prev => purgeDemoRecords(prev));
    setInvoices(prev => purgeDemoRecords(prev));
    setRepairJobs(prev => purgeDemoRecords(prev));
    setCustomers(prev => purgeDemoRecords(prev));
    setUsedPurchases(prev => purgeDemoRecords(prev));
    setSuppliers(prev => purgeDemoRecords(prev));
    setExpenses(prev => purgeDemoRecords(prev));
    setWarrantyClaims(prev => purgeDemoRecords(prev));
  }, []);

  // Enforce Cashier Access Control: Cashier can access 'pos', 'repairs', 'inventory', 'barcodes'
  useEffect(() => {
    if (role === 'cashier' && !['pos', 'repairs', 'inventory', 'barcodes'].includes(activeTab)) {
      handleSelectTab('pos');
    }
  }, [role, activeTab]);

  // Role Switcher Actions
  const handleLockToCashier = () => {
    handleNavigatePortal('/cashier');
  };

  const handleOpenAdminAuth = () => {
    setIsAdminAuthModalOpen(true);
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthModalOpen(false);
    setRole('admin');
    setPortal('admin');
    setActiveTab('dashboard');
    window.history.pushState(null, '', '/admin');
  };

  // Apply theme class to <body>
  useEffect(() => {
    document.body.className = theme === 'cream' ? 'theme-cream' : 'theme-dark';
  }, [theme]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K or F8 -> Open Universal Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === 'F1') {
        if (role === 'admin') {
          e.preventDefault();
          setActiveTab('dashboard');
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F4') {
        if (role === 'admin') {
          e.preventDefault();
          setActiveTab('used-phones');
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('repairs');
      } else if (e.key === 'F12') {
        e.preventDefault();
        if (role === 'admin') {
          handleLockToCashier();
        } else {
          handleOpenAdminAuth();
        }
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsPulloutOpen(false);
        setIsAdminAuthModalOpen(false);
        setPrintData(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [role]);

  // Theme Toggle
  const toggleTheme = () => {
    setTheme(prev => prev === 'cream' ? 'dark' : 'cream');
  };

  // Printing Handlers
  const handlePrintInvoice = (inv, mode = 'thermal') => {
    setPrintData(inv);
    setPrintMode(mode);
  };

  const handlePrintVoucher = (voucher) => {
    setPrintData(voucher);
    setPrintMode('voucher');
  };

  const handlePrintRepairSlip = (repair) => {
    setPrintData(repair);
    setPrintMode('repair');
  };

  const handlePrintBarcodeSheet = (sheetConfig) => {
    setPrintData(sheetConfig);
    setPrintMode('barcodes');
  };

  const handlePrintKhataStatement = (statementData) => {
    setPrintData(statementData);
    setPrintMode('khata-statement');
  };

  const handlePrintZReport = (zData) => {
    setPrintData(zData);
    setPrintMode('z-report');
  };

  // Barcode Jump helper from Inventory
  const handleSelectBarcodeFromInventory = (item) => {
    setSelectedItemForBarcode(item);
    handleSelectTab('barcodes');
  };

  // Search Jump Action
  const handleSearchAction = (targetTab, item) => {
    handleSelectTab(targetTab);
  };

  // Badge Counts
  const lowStockCount = inventory.filter(i => i.stock <= i.lowStockThreshold).length;
  const pendingRepairsCount = repairJobs.filter(j => j.status !== 'Delivered').length;

  return (
    <>
      {portal === 'customer' ? (
        <CustomerStorefront
          shopConfig={shopConfig}
          inventory={inventory}
          usedPurchases={usedPurchases}
          repairJobs={repairJobs}
          onNavigatePortal={handleNavigatePortal}
          theme={theme}
        />
      ) : (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
          
          {/* Header */}
          <Header
            activeTab={activeTab}
            setActiveTab={handleSelectTab}
            theme={theme}
            toggleTheme={toggleTheme}
            openSearch={() => setIsSearchOpen(true)}
            openPullout={() => setIsPulloutOpen(true)}
            lowStockCount={lowStockCount}
            pendingRepairsCount={pendingRepairsCount}
            invoicesCount={invoices.length}
            shopConfig={shopConfig}
            role={role}
            onLockToCashier={handleLockToCashier}
            onOpenAdminAuth={handleOpenAdminAuth}
            onNavigatePortal={handleNavigatePortal}
          />

          {/* Main Tab Content */}
          <main style={{ flex: 1, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        {activeTab === 'dashboard' && role === 'admin' && (
          <ExecutiveDashboard
            invoices={invoices}
            inventory={inventory}
            setInventory={setInventory}
            customers={customers}
            usedPurchases={usedPurchases}
            repairJobs={repairJobs}
            expenses={expenses}
            warrantyClaims={warrantyClaims}
            setWarrantyClaims={setWarrantyClaims}
            shopConfig={shopConfig}
            setActiveTab={setActiveTab}
            onNavigateTab={handleSelectTab}
            onPrintInvoice={handlePrintInvoice}
            onOpenProductInventory={handleOpenProductInventory}
          />
        )}

        {activeTab === 'pos' && (
          <PosBilling
            inventory={inventory}
            setInventory={setInventory}
            customers={customers}
            setCustomers={setCustomers}
            invoices={invoices}
            setInvoices={setInvoices}
            shopConfig={shopConfig}
            role={role}
            onPrintInvoice={handlePrintInvoice}
            quickBillProduct={quickBillProduct}
            clearQuickBillProduct={() => setQuickBillProduct(null)}
          />
        )}

        {activeTab === 'used-phones' && role === 'admin' && (
          <UsedMobileModule
            usedPurchases={usedPurchases}
            setUsedPurchases={setUsedPurchases}
            inventory={inventory}
            setInventory={setInventory}
            invoices={invoices}
            setInvoices={setInvoices}
            customers={customers}
            setCustomers={setCustomers}
            onPrintVoucher={handlePrintVoucher}
            onPrintInvoice={handlePrintInvoice}
            shopConfig={shopConfig}
          />
        )}

        {activeTab === 'repairs' && (
          <RepairLab
            repairJobs={repairJobs}
            setRepairJobs={setRepairJobs}
            invoices={invoices}
            setInvoices={setInvoices}
            customers={customers}
            setCustomers={setCustomers}
            inventory={inventory}
            setInventory={setInventory}
            shopConfig={shopConfig}
            role={role}
            onPrintRepairSlip={handlePrintRepairSlip}
            onPrintInvoice={handlePrintInvoice}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            inventory={inventory}
            setInventory={setInventory}
            role={role}
            shopConfig={shopConfig}
            onSelectBarcode={handleSelectBarcodeFromInventory}
            onPrintBarcodeSheet={handlePrintBarcodeSheet}
            onQuickBill={handleQuickBill}
            initialSearchTerm={inventorySearchTerm}
            onClearInitialSearchTerm={() => setInventorySearchTerm('')}
          />
        )}

        {activeTab === 'invoices' && role === 'admin' && (
          <InvoicesHub
            invoices={invoices}
            setInvoices={setInvoices}
            customers={customers}
            setCustomers={setCustomers}
            shopConfig={shopConfig}
            onPrintInvoice={handlePrintInvoice}
          />
        )}

        {activeTab === 'barcodes' && (
          <BarcodeGenerator
            inventory={inventory}
            selectedItemForBarcode={selectedItemForBarcode}
            shopConfig={shopConfig}
            onPrintBarcodeSheet={handlePrintBarcodeSheet}
          />
        )}

        {(activeTab === 'khata' || activeTab === 'customers') && role === 'admin' && (
          <CustomerKhata
            customers={customers}
            setCustomers={setCustomers}
            invoices={invoices}
            repairJobs={repairJobs}
            shopConfig={shopConfig}
            onPrintKhataStatement={handlePrintKhataStatement}
            onPrintInvoice={handlePrintInvoice}
            onPrintRepairSlip={handlePrintRepairSlip}
          />
        )}

        {activeTab === 'expenses' && role === 'admin' && (
          <ExpenseSupplier
            expenses={expenses}
            setExpenses={setExpenses}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            inventory={inventory}
            setInventory={setInventory}
            role={role}
          />
        )}

        {activeTab === 'reports' && role === 'admin' && (
          <AnalyticsReports
            invoices={invoices}
            expenses={expenses}
            inventory={inventory}
            customers={customers}
            usedPurchases={usedPurchases}
            repairJobs={repairJobs}
            shopConfig={shopConfig}
            onPrintInvoice={handlePrintInvoice}
            onPrintZReport={handlePrintZReport}
            role={role}
          />
        )}

        {activeTab === 'settings' && role === 'admin' && (
          <SettingsBackup
            shopConfig={shopConfig}
            setShopConfig={setShopConfig}
            inventory={inventory}
            setInventory={setInventory}
            usedPurchases={usedPurchases}
            setUsedPurchases={setUsedPurchases}
            repairJobs={repairJobs}
            setRepairJobs={setRepairJobs}
            customers={customers}
            setCustomers={setCustomers}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            expenses={expenses}
            setExpenses={setExpenses}
            invoices={invoices}
            setInvoices={setInvoices}
            role={role}
            setRole={setRole}
            onPrintInvoice={handlePrintInvoice}
          />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="no-print" style={{
        padding: '0.65rem 1.25rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--surface-primary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{shopConfig.name} ERP</span>
          <span>• Station Road, Bodhan, Telangana</span>
        </div>
        <div>
          <span>Keyboard: <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>F2: POS</kbd> <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>F4: Used Phone</kbd> <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>⌘K: Search</kbd></span>
        </div>
      </footer>

    </div>
    )}

      {/* Signature Illoca Feature Demo Pullout Drawer (Admin/Cashier only) */}
      {portal !== 'customer' && (
        <IllocaPulloutDrawer
          isOpen={isPulloutOpen}
          onClose={() => setIsPulloutOpen(false)}
          inventory={inventory}
          shopConfig={shopConfig}
          onSelectProduct={(p) => {
            setIsPulloutOpen(false);
            handleSelectTab('pos');
          }}
          onOpenProductInventory={handleOpenProductInventory}
        />
      )}

      {/* Universal Search Modal (Cmd+K / F8) */}
      <UniversalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        inventory={inventory}
        repairJobs={repairJobs}
        usedPurchases={usedPurchases}
        customers={customers}
        invoices={invoices}
        onSelectAction={handleSearchAction}
      />

      {/* Print Document Modal */}
      {printData && (
        <PrintTemplates
          printData={printData}
          printMode={printMode}
          shopConfig={shopConfig}
          onClosePrint={() => setPrintData(null)}
        />
      )}

      {/* Admin Authentication Modal (Master PIN or Google / Microsoft Authenticator 2FA) */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
        shopConfig={shopConfig}
        currentRole={role}
      />

    </>
  );
}
