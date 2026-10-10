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
  setStorageData
} from './data/initialData';

export default function App() {
  // Theme State & Portal Role Mode ('admin' | 'cashier')
  const [theme, setTheme] = useState(() => getStorageData('THEME', 'cream')); // cream | dark
  const [role, setRole] = useState(() => getStorageData('ROLE', 'admin')); // 'admin' | 'cashier'
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const savedRole = getStorageData('ROLE', 'admin');
    return savedRole === 'cashier' ? 'pos' : 'dashboard';
  });

  // Core Persistent Data States
  const [shopConfig, setShopConfig] = useState(() => getStorageData('SHOP_CONFIG', defaultShopConfig));
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

  // Quick Bill Product (from Stock Lookup to POS)
  const [quickBillProduct, setQuickBillProduct] = useState(null);

  const handleQuickBill = (product) => {
    setQuickBillProduct(product);
    setActiveTab('pos');
  };

  // Inventory targeted search term (when tapped from Low Stock alert)
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');

  const handleOpenProductInventory = (product) => {
    setInventorySearchTerm(product.name || product.id || '');
    setActiveTab('inventory');
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

  // Enforce Cashier Access Control: Cashier can ONLY access 'pos', 'repairs', 'inventory'
  useEffect(() => {
    if (role === 'cashier' && !['pos', 'repairs', 'inventory'].includes(activeTab)) {
      setActiveTab('pos');
    }
  }, [role, activeTab]);

  // Role Switcher Actions
  const handleLockToCashier = () => {
    setRole('cashier');
    setActiveTab('pos');
  };

  const handleOpenAdminAuth = () => {
    setIsAdminAuthModalOpen(true);
  };

  const handleAdminAuthSuccess = () => {
    setRole('admin');
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
    setActiveTab('barcodes');
  };

  // Search Jump Action
  const handleSearchAction = (targetTab, item) => {
    setActiveTab(targetTab);
    if (targetTab === 'inventory') {
      // jump
    }
  };

  // Badge Counts
  const lowStockCount = inventory.filter(i => i.stock <= i.lowStockThreshold).length;
  const pendingRepairsCount = repairJobs.filter(j => j.status !== 'Delivered').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
      />

      {/* Main Tab Content */}
      <main style={{ flex: 1, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        {activeTab === 'dashboard' && role === 'admin' && (
          <ExecutiveDashboard
            invoices={invoices}
            inventory={inventory}
            usedPurchases={usedPurchases}
            repairJobs={repairJobs}
            expenses={expenses}
            warrantyClaims={warrantyClaims}
            setWarrantyClaims={setWarrantyClaims}
            shopConfig={shopConfig}
            setActiveTab={setActiveTab}
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

        {activeTab === 'barcodes' && role === 'admin' && (
          <BarcodeGenerator
            inventory={inventory}
            selectedItemForBarcode={selectedItemForBarcode}
            shopConfig={shopConfig}
            onPrintBarcodeSheet={handlePrintBarcodeSheet}
          />
        )}

        {activeTab === 'khata' && role === 'admin' && (
          <CustomerKhata
            customers={customers}
            setCustomers={setCustomers}
            invoices={invoices}
            repairJobs={repairJobs}
            shopConfig={shopConfig}
            onPrintKhataStatement={handlePrintKhataStatement}
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
          />
        )}
      </main>

      {/* Signature Illoca Feature Demo Pullout Drawer */}
      <IllocaPulloutDrawer
        isOpen={isPulloutOpen}
        onClose={() => setIsPulloutOpen(false)}
        inventory={inventory}
        shopConfig={shopConfig}
        onSelectProduct={(p) => {
          setIsPulloutOpen(false);
          setActiveTab('pos');
        }}
        onOpenProductInventory={handleOpenProductInventory}
      />

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
          <span className="mono-tag" style={{ fontSize: '0.65rem' }}>100% OFFLINE</span>
        </div>
        <div>
          <span>Keyboard: <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>F2: POS</kbd> <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>F4: Used Phone</kbd> <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>⌘K: Search</kbd></span>
        </div>
      </footer>

    </div>
  );
}
