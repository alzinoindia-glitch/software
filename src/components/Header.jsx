import React, { useState, useEffect } from 'react';
import { 
  Menu,
  X,
  LayoutDashboard,
  ShoppingCart, 
  Smartphone, 
  Wrench, 
  Package, 
  Barcode, 
  Users, 
  Receipt, 
  TrendingUp, 
  Settings, 
  Search, 
  SlidersHorizontal,
  Sun, 
  Moon,
  FileText,
  ChevronRight,
  ShieldCheck,
  Lock,
  Key,
  UserCheck
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme, 
  openSearch, 
  openPullout,
  lowStockCount,
  pendingRepairsCount,
  invoicesCount,
  shopConfig,
  role = 'admin',
  onLockToCashier = () => {},
  onOpenAdminAuth = () => {}
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on ESC key or toggle on M key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      } else if ((e.key === 'm' || e.key === 'M') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setMenuOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hotkey: 'F1' },
    { id: 'pos', label: 'POS Billing', icon: ShoppingCart, hotkey: 'F2' },
    { id: 'inventory', label: 'Stock & IMEIs', icon: Package, count: 5, alert: lowStockCount > 0 },
    { id: 'used-phones', label: 'Used or Refurbished Mobiles', icon: Smartphone, badge: 'Aadhaar', hotkey: 'F4' },
    { id: 'repairs', label: 'Repairs', icon: Wrench, count: 2, hotkey: 'F5' },
    { id: 'invoices', label: 'Invoices', icon: FileText, count: 2 },
    { id: 'barcodes', label: 'Barcodes', icon: Barcode },
    { id: 'khata', label: 'Khata', icon: Users },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'reports', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const cashierNavItems = [
    { id: 'pos', label: 'POS Billing Counter', icon: ShoppingCart, hotkey: 'F2' },
    { id: 'repairs', label: 'Repairs (Intake & Delivery)', icon: Wrench, count: pendingRepairsCount, hotkey: 'F5' },
    { id: 'inventory', label: 'Stock & Price Lookup', icon: Package, alert: lowStockCount > 0 },
  ];

  const navItems = role === 'cashier' ? cashierNavItems : allNavItems;

  const handleSelectTab = (id) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="no-print" style={{
        background: '#0F251E',
        borderBottom: '1px solid rgba(210, 222, 216, 0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box'
      }}>
        <div className="header-content-inner">
          {/* Left: 3 Lines Menu Button + Brand + Active Screen Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* 3 Lines Hamburger Main Menu Button (Visible in Desktop & Mobile) */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn-secondary main-menu-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.42rem 0.75rem',
                border: menuOpen ? '1px solid #A9BC5C' : '1px solid rgba(210, 222, 216, 0.22)',
                background: menuOpen ? '#A9BC5C' : 'rgba(241, 239, 229, 0.08)',
                color: menuOpen ? '#0F251E' : '#F1EFE5',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                transition: 'var(--transition-smooth)'
              }}
              title="Open Main Menu (Press M)"
            >
              <Menu size={18} color={menuOpen ? '#0F251E' : '#A9BC5C'} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                Menu
              </span>
              <kbd className="hide-on-mobile" style={{
                background: menuOpen ? 'rgba(15, 37, 30, 0.2)' : 'rgba(241, 239, 229, 0.14)',
                padding: '0.05rem 0.35rem',
                borderRadius: '3px',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: menuOpen ? '#0F251E' : 'rgba(241, 239, 229, 0.8)'
              }}>M</kbd>
            </button>

            {/* Brand Mark */}
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer' }}
              onClick={() => setActiveTab('dashboard')}
              title="Go to Dashboard (F1)"
            >
              <div style={{
                width: '28px',
                height: '28px',
                background: '#A9BC5C',
                color: '#0F251E',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontFamily: 'var(--font-heading)',
                fontSize: '0.95rem',
                letterSpacing: '-0.04em'
              }}>
                A
              </div>
              <span style={{ 
                fontFamily: 'var(--font-heading)', 
                fontWeight: 800, 
                fontSize: '1.15rem', 
                letterSpacing: '-0.03em',
                color: '#F1EFE5'
              }}>
                {shopConfig.name}
              </span>
            </div>
          </div>

          {/* Right Actions: Minimalist & Clean */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            
            {/* PORTAL ROLE SWITCHER BUTTON */}
            {role === 'admin' ? (
              <button
                onClick={onLockToCashier}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.65rem',
                  background: 'rgba(169, 188, 92, 0.16)',
                  border: '1px solid #A9BC5C',
                  color: '#F1EFE5',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  transition: 'var(--transition-fast)'
                }}
                title="Active: Store Owner Admin Portal. Click to open Cashier Portal."
              >
                <ShieldCheck size={14} color="#A9BC5C" />
                <span className="hide-on-mobile">👑 Admin</span>
                <span style={{ fontSize: '0.68rem', color: '#A9BC5C', marginLeft: '0.1rem' }}>Open Cashier ➔</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdminAuth}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.65rem',
                  background: 'rgba(234, 179, 8, 0.22)',
                  border: '1.5px solid #EAB308',
                  color: '#FEF08A',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-sm)',
                  animation: 'pulse 2s infinite',
                  transition: 'var(--transition-fast)'
                }}
                title="Active: Cashier Portal. Click to open Admin Portal."
              >
                <Lock size={14} color="#EAB308" />
                <span>👤 Cashier</span>
                <span style={{ fontSize: '0.68rem', color: '#FEF08A', marginLeft: '0.1rem' }}>Open Admin ➔</span>
              </button>
            )}

            {/* Quick Search */}
            <button 
              onClick={openSearch}
              className="btn-secondary"
              title="Global Search (Press ⌘K or F8)"
              style={{ 
                padding: '0.35rem 0.65rem', 
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(241, 239, 229, 0.08)',
                border: '1px solid rgba(210, 222, 216, 0.2)',
                color: '#F1EFE5'
              }}
            >
              <Search size={13} color="#A9BC5C" />
              <span className="hide-on-mobile" style={{ color: 'rgba(241, 239, 229, 0.85)' }}>Search</span>
              <kbd className="hide-on-mobile" style={{ 
                background: 'rgba(241, 239, 229, 0.12)', 
                padding: '0.05rem 0.3rem', 
                borderRadius: '3px', 
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                border: '1px solid rgba(210, 222, 216, 0.2)',
                color: 'rgba(241, 239, 229, 0.7)'
              }}>⌘K</kbd>
            </button>

            {/* Quick Tools & Bench Drawer in Header */}
            <button 
              onClick={openPullout}
              className="btn-secondary"
              style={{ 
                padding: '0.35rem 0.55rem',
                background: 'rgba(241, 239, 229, 0.08)',
                border: '1px solid rgba(210, 222, 216, 0.2)',
                color: '#F1EFE5'
              }}
              title="Quick Tools & Bench Drawer"
            >
              <SlidersHorizontal size={14} color="#A9BC5C" />
            </button>

            {/* Theme Switcher */}
            <button 
              onClick={toggleTheme}
              className="btn-secondary"
              style={{ 
                padding: '0.35rem 0.55rem',
                background: 'rgba(241, 239, 229, 0.08)',
                border: '1px solid rgba(210, 222, 216, 0.2)',
                color: '#F1EFE5'
              }}
              title={theme === 'cream' ? 'Switch to Dark Mode' : 'Switch to Warm Mode'}
            >
              {theme === 'cream' ? <Moon size={14} color="#F1EFE5" /> : <Sun size={14} color="#A9BC5C" />}
            </button>

            {/* Settings Icon Only in Header */}
            <button 
              onClick={() => {
                if (role === 'admin') {
                  setActiveTab('settings');
                } else {
                  onOpenAdminAuth();
                }
              }}
              className="btn-secondary"
              style={{ 
                padding: '0.35rem 0.55rem',
                border: activeTab === 'settings' ? '1px solid #A9BC5C' : '1px solid rgba(210, 222, 216, 0.2)',
                background: activeTab === 'settings' ? '#A9BC5C' : 'rgba(241, 239, 229, 0.08)',
                color: activeTab === 'settings' ? '#0F251E' : '#F1EFE5',
                cursor: 'pointer'
              }}
              title={role === 'admin' ? "Shop Settings & Backup" : "Shop Settings (Requires Google Authenticator)"}
            >
              <Settings size={14} color={activeTab === 'settings' ? '#0F251E' : '#F1EFE5'} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Menu Slide-Over Drawer (3 Lines Menu) */}
      {menuOpen && (
        <div 
          className="drawer-overlay no-print" 
          onClick={() => setMenuOpen(false)}
          style={{ zIndex: 1100 }}
        >
          <div 
            className="main-menu-drawer animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div style={{
              padding: '1.1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(210, 222, 216, 0.15)',
              background: '#0F251E',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#A9BC5C',
                  color: '#0F251E',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.05rem',
                }}>
                  A
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontFamily: 'var(--font-heading)', fontSize: '1.05rem', lineHeight: 1.1, color: '#F1EFE5' }}>
                    {shopConfig.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: role === 'cashier' ? '#FEF08A' : '#A9BC5C', fontFamily: 'var(--font-mono)' }}>
                    {role === 'cashier' ? '👤 Cashier Counter Mode · Bodhan' : '👑 Retail ERP · Admin Portal · Bodhan'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F1EFE5',
                  cursor: 'pointer',
                  border: '1px solid rgba(210, 222, 216, 0.2)',
                  background: 'rgba(241, 239, 229, 0.08)'
                }}
                title="Close Menu (Esc)"
              >
                <X size={15} />
              </button>
            </div>

            {/* Role Switcher Action Inside Drawer */}
            <div style={{ padding: '0.65rem 0.85rem 0 0.85rem', background: '#0F251E' }}>
              {role === 'cashier' ? (
                <button
                  onClick={() => { setMenuOpen(false); onOpenAdminAuth(); }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, #EAB308, #CA8A04)',
                    color: '#0F251E',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  <Key size={15} />
                  <span>Open Admin Portal</span>
                </button>
              ) : (
                <button
                  onClick={() => { setMenuOpen(false); onLockToCashier(); }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(241, 239, 229, 0.08)',
                    color: '#F1EFE5',
                    border: '1px solid rgba(210, 222, 216, 0.2)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  <UserCheck size={14} color="#A9BC5C" />
                  <span>Open Cashier Mode</span>
                </button>
              )}
            </div>

            {/* Menu Items List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.85rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              background: '#0F251E',
            }}>
              <div style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: 'rgba(241, 239, 229, 0.6)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '0.35rem 0.6rem',
                fontWeight: 700,
              }}>
                {role === 'cashier' ? 'Cashier Allowed Modules' : 'Main Modules'}
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? '#A9BC5C' : 'transparent',
                      color: isActive ? '#0F251E' : '#F1EFE5',
                      border: `1px solid ${isActive ? '#A9BC5C' : 'transparent'}`,
                      transition: 'var(--transition-smooth)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                      <Icon size={17} color={isActive ? '#0F251E' : '#A9BC5C'} />
                      <span style={{ 
                        fontFamily: 'var(--font-heading)', 
                        fontWeight: isActive ? 700 : 500, 
                        fontSize: '0.88rem' 
                      }}>
                        {item.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {item.hotkey && (
                        <kbd style={{
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '0.1rem 0.38rem',
                          borderRadius: '3px',
                          background: isActive ? 'rgba(15, 37, 30, 0.2)' : 'rgba(241, 239, 229, 0.08)',
                          border: `1px solid ${isActive ? 'rgba(15, 37, 30, 0.3)' : 'rgba(210, 222, 216, 0.15)'}`,
                          color: isActive ? '#0F251E' : 'rgba(241, 239, 229, 0.75)'
                        }}>
                          {item.hotkey}
                        </kbd>
                      )}

                      {item.count !== undefined && item.count !== null && (
                        <span style={{
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          padding: '0.12rem 0.45rem',
                          borderRadius: '999px',
                          background: isActive 
                            ? '#0F251E' 
                            : 'rgba(169, 188, 92, 0.22)',
                          color: isActive ? '#A9BC5C' : '#A9BC5C',
                          border: isActive ? 'none' : '1px solid rgba(169, 188, 92, 0.35)'
                        }}>
                          {item.count}
                        </span>
                      )}

                      {item.badge && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '3px',
                          background: isActive ? '#0F251E' : 'rgba(169, 188, 92, 0.22)',
                          color: isActive ? '#A9BC5C' : '#A9BC5C',
                          border: '1px solid rgba(169, 188, 92, 0.35)'
                        }}>
                          {item.badge}
                        </span>
                      )}

                      <ChevronRight size={13} color={isActive ? '#0F251E' : '#A9BC5C'} opacity={isActive ? 0.9 : 0.4} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Menu Footer */}
            <div style={{
              padding: '0.85rem 1rem',
              borderTop: '1px solid rgba(210, 222, 216, 0.15)',
              background: '#0F251E',
              fontSize: '0.72rem',
              color: 'rgba(241, 239, 229, 0.8)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: 600, color: '#F1EFE5' }}>ALZINO Retail ERP</span>
                <span className="mono-tag" style={{ fontSize: '0.65rem', background: 'rgba(169, 188, 92, 0.2)', color: '#A9BC5C', borderColor: 'rgba(169, 188, 92, 0.3)' }}>OFFLINE</span>
              </div>
              <div style={{ color: 'rgba(241, 239, 229, 0.6)' }}>
                GSTIN: {shopConfig.gstin}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Fixed at bottom on phones/tablets <= 768px) */}
      <nav className="mobile-bottom-nav no-print">
        <button
          onClick={() => setActiveTab('pos')}
          className={`mobile-bottom-item ${activeTab === 'pos' ? 'active' : ''}`}
        >
          <ShoppingCart size={18} />
          <span>POS</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`mobile-bottom-item ${activeTab === 'inventory' ? 'active' : ''}`}
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <Package size={18} />
            {lowStockCount > 0 && (
              <span className="mobile-nav-badge">{lowStockCount}</span>
            )}
          </div>
          <span>Stock</span>
        </button>

        {role === 'admin' && (
          <button
            onClick={() => setActiveTab('used-phones')}
            className={`mobile-bottom-item ${activeTab === 'used-phones' ? 'active' : ''}`}
          >
            <Smartphone size={18} />
            <span>Used</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('repairs')}
          className={`mobile-bottom-item ${activeTab === 'repairs' ? 'active' : ''}`}
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <Wrench size={18} />
            {pendingRepairsCount > 0 && (
              <span className="mobile-nav-badge">{pendingRepairsCount}</span>
            )}
          </div>
          <span>Repairs</span>
        </button>

        {role === 'admin' ? (
          <button
            onClick={() => setActiveTab('invoices')}
            className={`mobile-bottom-item ${activeTab === 'invoices' ? 'active' : ''}`}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <FileText size={18} />
              {invoicesCount > 0 && (
                <span className="mobile-nav-badge">{invoicesCount}</span>
              )}
            </div>
            <span>Invoices</span>
          </button>
        ) : (
          <button
            onClick={onOpenAdminAuth}
            className="mobile-bottom-item"
            style={{ color: '#EAB308' }}
          >
            <Lock size={18} color="#EAB308" />
            <span>Admin</span>
          </button>
        )}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`mobile-bottom-item ${menuOpen ? 'active' : ''}`}
        >
          <Menu size={18} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
