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
  ChevronRight
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
  shopConfig
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

  const navItems = [
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

  const currentTabObj = navItems.find(item => item.id === activeTab);

  const handleSelectTab = (id) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="no-print" style={{
        background: 'var(--surface-primary)',
        borderBottom: '1px solid var(--border-color)',
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
                border: menuOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: menuOpen ? 'var(--illoca-blue-subtle)' : 'var(--surface-card)',
                color: menuOpen ? 'var(--accent-primary)' : 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                transition: 'var(--transition-smooth)'
              }}
              title="Open Main Menu (Press M)"
            >
              <Menu size={18} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                Menu
              </span>
              <kbd className="hide-on-mobile" style={{
                background: 'rgba(0,0,0,0.12)',
                padding: '0.05rem 0.35rem',
                borderRadius: '3px',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)'
              }}>M</kbd>
            </button>

            {/* Brand Mark */}
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              onClick={() => setActiveTab('dashboard')}
              title="Go to Dashboard (F1)"
            >
              <div style={{
                width: '28px',
                height: '28px',
                background: 'var(--accent-primary)',
                color: '#FFFFFF',
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
                color: 'var(--text-primary)'
              }}>
                {shopConfig.name}
              </span>
            </div>

            {/* Active Screen Indicator Badge in Desktop Mode */}
            {currentTabObj && (
              <div className="hide-on-mobile" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                marginLeft: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-color)',
                fontSize: '0.78rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600
              }}>
                <currentTabObj.icon size={13} color="var(--accent-primary)" />
                <span>{currentTabObj.label}</span>
                {currentTabObj.count !== undefined && currentTabObj.count !== null && (
                  <span style={{
                    fontSize: '0.62rem',
                    background: 'var(--accent-primary)',
                    color: '#FFF',
                    padding: '0.05rem 0.35rem',
                    borderRadius: '999px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700
                  }}>
                    {currentTabObj.count}
                  </span>
                )}
                {currentTabObj.badge && (
                  <span style={{
                    fontSize: '0.62rem',
                    background: 'var(--badge-bg)',
                    color: 'var(--badge-text)',
                    padding: '0.05rem 0.35rem',
                    borderRadius: '3px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600
                  }}>
                    {currentTabObj.badge}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Actions: Minimalist & Clean */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
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
                gap: '0.4rem'
              }}
            >
              <Search size={13} color="var(--accent-primary)" />
              <span className="hide-on-mobile" style={{ color: 'var(--text-secondary)' }}>Search</span>
              <kbd className="hide-on-mobile" style={{ 
                background: 'var(--surface-card)', 
                padding: '0.05rem 0.3rem', 
                borderRadius: '3px', 
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)'
              }}>⌘K</kbd>
            </button>

            {/* Quick Tools & Bench Drawer in Header */}
            <button 
              onClick={openPullout}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.55rem' }}
              title="Quick Tools & Bench Drawer"
            >
              <SlidersHorizontal size={14} color="var(--accent-primary)" />
            </button>

            {/* Theme Switcher */}
            <button 
              onClick={toggleTheme}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.55rem' }}
              title={theme === 'cream' ? 'Switch to Dark Mode' : 'Switch to Warm Mode'}
            >
              {theme === 'cream' ? <Moon size={14} /> : <Sun size={14} color="#F59E0B" />}
            </button>

            {/* Settings Icon Only in Header */}
            <button 
              onClick={() => setActiveTab('settings')}
              className="btn-secondary"
              style={{ 
                padding: '0.35rem 0.55rem',
                border: activeTab === 'settings' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: activeTab === 'settings' ? 'var(--illoca-blue-subtle)' : 'var(--surface-card)',
                color: activeTab === 'settings' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              title="Shop Settings & Backup"
            >
              <Settings size={14} color={activeTab === 'settings' ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
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
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--surface-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  background: 'var(--accent-primary)',
                  color: '#FFFFFF',
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
                  <div style={{ fontWeight: 800, fontFamily: 'var(--font-heading)', fontSize: '1.05rem', lineHeight: 1.1 }}>
                    {shopConfig.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Retail ERP · Admin Portal · Bodhan
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
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-primary)'
                }}
                title="Close Menu (Esc)"
              >
                <X size={15} />
              </button>
            </div>

            {/* Menu Items List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.85rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
            }}>
              <div style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '0.35rem 0.6rem',
                fontWeight: 700,
              }}>
                Main Modules
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
                      background: isActive ? 'var(--accent-primary)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                      border: `1px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                      transition: 'var(--transition-smooth)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                      <Icon size={17} color={isActive ? '#FFFFFF' : 'var(--accent-primary)'} />
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
                          background: isActive ? 'rgba(255,255,255,0.22)' : 'var(--surface-primary)',
                          border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'var(--border-color)'}`,
                          color: isActive ? '#FFFFFF' : 'var(--text-muted)'
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
                            ? 'rgba(255,255,255,0.3)' 
                            : item.alert 
                              ? 'var(--status-amber)' 
                              : 'var(--accent-primary)',
                          color: item.alert && !isActive ? '#000' : '#FFF',
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
                          background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--badge-bg)',
                          color: isActive ? '#FFF' : 'var(--badge-text)',
                        }}>
                          {item.badge}
                        </span>
                      )}

                      <ChevronRight size={13} opacity={isActive ? 0.9 : 0.3} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Menu Footer */}
            <div style={{
              padding: '0.85rem 1rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--surface-card)',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: 600 }}>ALZINO Retail ERP</span>
                <span className="mono-tag" style={{ fontSize: '0.65rem' }}>OFFLINE</span>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
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

        <button
          onClick={() => setActiveTab('used-phones')}
          className={`mobile-bottom-item ${activeTab === 'used-phones' ? 'active' : ''}`}
        >
          <Smartphone size={18} />
          <span>Used</span>
        </button>

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
