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

                      <ChevronRight size={13} color={isActive ? '#0F251E' : '#A9BC5C'} opacity={isActive ? 0.9 : 0.4} style={isPortalGroup && customerPortalOpen ? { transform: 'rotate(90deg)' } : undefined} />
                    </div>
                  </button>
                  {isPortalGroup && customerPortalOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', margin: '0.1rem 0 0.35rem 1.1rem', paddingLeft: '0.65rem', borderLeft: '1px solid rgba(169,188,92,0.35)' }}>
                      {[['customers', 'Customers'], ['suppliers', 'Suppliers'], ['khata', 'Khata']].map(([id, label]) => (
                        <button key={id} onClick={() => handleSelectTab(id)} style={{ textAlign: 'left', padding: '0.48rem 0.7rem', border: 0, borderRadius: 'var(--radius-sm)', background: activeTab === id || (id === 'khata' && activeTab === 'customers') ? 'rgba(169,188,92,0.18)' : 'transparent', color: '#F1EFE5', cursor: 'pointer', fontSize: '0.82rem' }}>{label}</button>
                      ))}
                    </div>
                  )}
                  </React.Fragment>
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
              <button type="button" onClick={() => setPortalNavigationOpen(open => !open)} aria-expanded={portalNavigationOpen} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0.15rem 0', border: 0, background: 'transparent', color: 'rgba(241, 239, 229, 0.72)', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Portals & URL Navigation</span>
                <ChevronRight size={14} aria-hidden="true" style={{ transform: portalNavigationOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }} />
              </button>
              {portalNavigationOpen && <>
              {[
                { path: '/', icon: '🌐', label: 'Customer Storefront (alzino.shop)', color: '#34D399' },
                { path: '/cashier', icon: '💳', label: 'Cashier Counter (/cashier)', color: '#FEF08A' },
                { path: '/admin', icon: '👑', label: 'Admin Management (/admin)', color: '#A9BC5C' },
                { path: '/admin/customers', icon: '📁', label: 'Customer Data (/admin/customers)', color: '#93C5FD' }
              ].map((portal) => (
                <div key={portal.path} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: 0 }}>
                  <button
                    onClick={() => { setMenuOpen(false); onNavigatePortal(portal.path); }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'none',
                      border: 'none',
                      padding: '0.2rem 0',
                      color: portal.color,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: 600
                    }}
                  >
                    <span>{portal.icon}</span>
                    <span>{portal.label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyPortalUrl(portal.path)}
                    aria-label={`Copy ${portal.label} URL`}
                    title={copiedPortalPath === portal.path && !copyPortalError ? 'Copied!' : 'Copy URL'}
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      borderRadius: '5px',
                      border: '1px solid rgba(210, 222, 216, 0.18)',
                      background: copiedPortalPath === portal.path && !copyPortalError ? 'rgba(52, 211, 153, 0.15)' : 'rgba(241, 239, 229, 0.06)',
                      color: copiedPortalPath === portal.path && !copyPortalError ? '#34D399' : '#A9BC5C',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedPortalPath === portal.path && !copyPortalError ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
              <span role="status" aria-live="polite" style={{ minHeight: '0.9rem', fontSize: '0.65rem', color: copyPortalError ? '#FCA5A5' : '#34D399' }}>
                {copiedPortalPath ? (copyPortalError ? 'Could not copy link' : 'URL copied to clipboard') : ''}
              </span>
              </>}
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
                {role === 'cashier' && <span style={{ fontSize: '1rem' }}>👤</span>}
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
