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
  UserCheck,
  MapPin,
  Star
} from 'lucide-react';
import AlzinoLogo from './AlzinoLogo';

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
  onOpenAdminAuth = () => {},
  onNavigatePortal = () => {}
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
    { id: 'inventory', label: 'Stock & IMEIs', icon: Package },
    { id: 'used-phones', label: 'Used or Refurbished Mobiles', icon: Smartphone, hotkey: 'F4' },
    { id: 'repairs', label: 'Repairs', icon: Wrench, hotkey: 'F5' },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'barcodes', label: 'Barcodes', icon: Barcode },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'reports', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const cashierNavItems = [
    { id: 'pos', label: 'POS Billing Counter', icon: ShoppingCart, hotkey: 'F2' },
    { id: 'repairs', label: 'Repairs (Intake & Delivery)', icon: Wrench, hotkey: 'F5' },
    { id: 'inventory', label: 'Stock & Price Lookup', icon: Package },
    { id: 'barcodes', label: 'Print Barcodes', icon: Barcode },
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
          {/* Left: Unified Brand Logo & Portal Badge */}
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => setActiveTab('dashboard')}
            title="Go to Dashboard (F1)"
          >
            <AlzinoLogo height={24} textColor="#FFFFFF" swooshColor="#FACC15" />
            <span style={{
              background: role === 'admin' ? 'rgba(169, 188, 92, 0.2)' : 'rgba(234, 179, 8, 0.2)',
              color: role === 'admin' ? '#A9BC5C' : '#FEF08A',
              border: role === 'admin' ? '1px solid rgba(169, 188, 92, 0.4)' : '1px solid rgba(234, 179, 8, 0.4)',
              padding: '0.12rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.68rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.02em'
            }}>
              {role === 'admin' ? '/admin' : '/cashier'}
            </span>
          </div>

          {/* Middle: Quick Search (Desktop) */}
          <div className="header-search-middle" style={{ flex: 1, maxWidth: '420px', margin: '0 0.85rem' }}>
            <button 
              onClick={openSearch}
              className="btn-secondary"
              title="Global Search (Press ⌘K or F8)"
              style={{ 
                width: '100%',
                padding: '0.42rem 0.85rem', 
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(241, 239, 229, 0.08)',
                border: '1px solid rgba(210, 222, 216, 0.22)',
                color: '#F1EFE5',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={14} color="#A9BC5C" />
                <span style={{ color: 'rgba(241, 239, 229, 0.75)', fontWeight: 500, fontSize: '0.78rem' }}>
                  Search stock, IMEIs, customers...
                </span>
              </div>
              <kbd style={{ 
                background: 'rgba(241, 239, 229, 0.12)', 
                padding: '0.05rem 0.35rem', 
                borderRadius: '3px', 
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                border: '1px solid rgba(210, 222, 216, 0.2)',
                color: 'rgba(241, 239, 229, 0.75)'
              }}>⌘K</kbd>
            </button>
          </div>

          {/* Right: Search (on mobile before menu) + Menu on Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* View Customer Storefront Button */}
            <button
              onClick={() => onNavigatePortal('/')}
              style={{
                background: 'rgba(52, 211, 153, 0.12)',
                border: '1px solid rgba(52, 211, 153, 0.35)',
                color: '#34D399',
                padding: '0.38rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Open Customer Portal (alzino.shop)"
            >
              <span style={{ fontSize: '0.85rem' }}>🌐</span>
              <span className="hide-on-mobile">alzino.shop</span>
            </button>

            {/* Locate Us Button (Google Maps) */}
            <a
              href={shopConfig?.mapsUrl || "https://maps.app.goo.gl/dtJgpyb2mju1U3YM7"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#FBBF24',
                padding: '0.38rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none'
              }}
              title="Locate Us (Station Road, Bodhan - Google Maps)"
            >
              <MapPin size={13} color="#FBBF24" />
              <span className="hide-on-mobile">Locate Us</span>
            </a>

            {/* Rate Us Button */}
            <a
              href="https://g.page/r/CWxRHXGDCdZ7EBM/review"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                color: '#FACC15',
                padding: '0.38rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none'
              }}
              title="Rate ALZINO on Google Reviews"
            >
              <Star size={13} color="#FACC15" fill="#FACC15" />
              <span className="hide-on-mobile">Rate Us</span>
            </a>

            {/* Mobile Search Button (before Menu) */}
            <button 
              onClick={openSearch}
              className="btn-secondary header-search-mobile"
              title="Search (⌘K)"
              style={{ 
                padding: '0.42rem 0.55rem', 
                fontSize: '0.8rem',
                display: 'none',
                alignItems: 'center',
                background: 'rgba(241, 239, 229, 0.08)',
                border: '1px solid rgba(210, 222, 216, 0.22)',
                color: '#F1EFE5',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              <Search size={16} color="#A9BC5C" />
            </button>

            {/* 3 Lines Hamburger Main Menu Button (On the Right!) */}
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
                <AlzinoLogo height={22} textColor="#FFFFFF" swooshColor="#FACC15" />
                <span style={{
                  background: role === 'admin' ? 'rgba(169, 188, 92, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                  color: role === 'admin' ? '#A9BC5C' : '#FEF08A',
                  border: role === 'admin' ? '1px solid rgba(169, 188, 92, 0.4)' : '1px solid rgba(234, 179, 8, 0.4)',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '5px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {role === 'admin' ? '/admin' : '/cashier'}
                </span>
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

            {/* Quick Actions in Menu Drawer (Search, Tools, Theme) */}
            <div style={{
              padding: '0.55rem 0.75rem',
              borderTop: '1px solid rgba(210, 222, 216, 0.12)',
              background: '#0B1D17',
              display: 'flex',
              gap: '0.45rem',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={() => { setMenuOpen(false); openSearch(); }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.42rem 0.3rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(241, 239, 229, 0.08)',
                  border: '1px solid rgba(210, 222, 216, 0.18)',
                  color: '#F1EFE5',
                  fontSize: '0.74rem',
                  cursor: 'pointer'
                }}
              >
                <Search size={13} color="#A9BC5C" />
                <span>Search</span>
              </button>

              <button
                onClick={() => { setMenuOpen(false); openPullout(); }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.42rem 0.3rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(241, 239, 229, 0.08)',
                  border: '1px solid rgba(210, 222, 216, 0.18)',
                  color: '#F1EFE5',
                  fontSize: '0.74rem',
                  cursor: 'pointer'
                }}
              >
                <SlidersHorizontal size={13} color="#A9BC5C" />
                <span>Tools</span>
              </button>

              <button
                onClick={toggleTheme}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.42rem 0.3rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(241, 239, 229, 0.08)',
                  border: '1px solid rgba(210, 222, 216, 0.18)',
                  color: '#F1EFE5',
                  fontSize: '0.74rem',
                  cursor: 'pointer'
                }}
              >
                {theme === 'cream' ? <Moon size={13} color="#F1EFE5" /> : <Sun size={13} color="#A9BC5C" />}
                <span>{theme === 'cream' ? 'Dark' : 'Warm'}</span>
              </button>
            </div>

            {/* Portal Quick Navigation */}
            <div style={{
              padding: '0.65rem 0.85rem',
              background: '#0B1D17',
              borderTop: '1px solid rgba(210, 222, 216, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(241, 239, 229, 0.6)', textTransform: 'uppercase' }}>
                Portals & URL Navigation
              </div>
              <button 
                onClick={() => { setMenuOpen(false); onNavigatePortal('/'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem 0',
                  color: '#34D399',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600
                }}
              >
                <span>🌐</span>
                <span>Customer Storefront (alzino.shop)</span>
              </button>
              <button 
                onClick={() => { setMenuOpen(false); onNavigatePortal('/cashier'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem 0',
                  color: '#FEF08A',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600
                }}
              >
                <span>💳</span>
                <span>Cashier Counter (/cashier)</span>
              </button>
              <button 
                onClick={() => { setMenuOpen(false); onNavigatePortal('/admin'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem 0',
                  color: '#A9BC5C',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600
                }}
              >
                <span>👑</span>
                <span>Admin Management (/admin)</span>
              </button>
              <button 
                onClick={() => { setMenuOpen(false); onNavigatePortal('/admin/customers'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem 0',
                  color: '#93C5FD',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600
                }}
              >
                <span>📁</span>
                <span>Customer Data (/admin/customers)</span>
              </button>
            </div>

            {/* Menu Footer with Role Switcher Dropdown */}
            <div style={{
              padding: '0.85rem 1rem',
              borderTop: '1px solid rgba(210, 222, 216, 0.15)',
              background: '#0F251E',
              color: '#F1EFE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>{role === 'admin' ? '👑' : '👤'}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#F1EFE5' }}>
                    {role === 'admin' ? 'Admin Portal' : 'Cashier Counter'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: role === 'admin' ? '#A9BC5C' : '#FEF08A', fontFamily: 'var(--font-mono)' }}>
                    {role === 'admin' ? 'Store Management' : 'Counter Billing'}
                  </div>
                </div>
              </div>

              {/* Dropdown Button to Switch from Cashier to Admin or Admin to Cashier */}
              <select
                value={role}
                onChange={(e) => {
                  const targetRole = e.target.value;
                  if (targetRole === 'admin' && role !== 'admin') {
                    setMenuOpen(false);
                    onOpenAdminAuth();
                  } else if (targetRole === 'cashier' && role !== 'cashier') {
                    setMenuOpen(false);
                    onLockToCashier();
                  }
                }}
                style={{
                  background: role === 'admin' ? 'rgba(169, 188, 92, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                  border: role === 'admin' ? '1px solid #A9BC5C' : '1px solid #EAB308',
                  color: role === 'admin' ? '#A9BC5C' : '#FEF08A',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.38rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'var(--font-heading)'
                }}
                title="Switch Access Level"
              >
                <option value="admin" style={{ background: '#0F251E', color: '#F1EFE5' }}>👑 Admin</option>
                <option value="cashier" style={{ background: '#0F251E', color: '#F1EFE5' }}>👤 Cashier</option>
              </select>
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
