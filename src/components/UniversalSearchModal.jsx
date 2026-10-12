import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Smartphone, 
  Package, 
  Wrench, 
  User, 
  Receipt, 
  ArrowRight,
  Barcode
} from 'lucide-react';

export default function UniversalSearchModal({ 
  isOpen, 
  onClose, 
  inventory, 
  repairJobs, 
  usedPurchases, 
  customers, 
  invoices, 
  onSelectAction 
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const words = q ? q.split(/\s+/).filter(Boolean) : [];

  // Search Results grouping
  const matchedInventory = q ? inventory.filter(i => {
    const unitCodes = (i.units || []).flatMap(u => [u.barcode, u.imei1, u.imei2, u.color]).filter(Boolean);
    const allBarcodes = (i.barcodes || []).filter(Boolean);
    const haystack = [
      i.name || '',
      i.brand || '',
      i.category || '',
      i.model || '',
      i.color || '',
      i.ram || '',
      i.storage || '',
      i.description || '',
      i.barcode || '',
      i.rack || '',
      i.bin || '',
      ...(i.imeis || []),
      ...unitCodes,
      ...allBarcodes
    ].join(' ').toLowerCase();
    return words.every(w => haystack.includes(w));
  }).slice(0, 6) : [];

  const matchedRepairs = q ? repairJobs.filter(r => 
    r.jobId.toLowerCase().includes(q) ||
    r.customerName.toLowerCase().includes(q) ||
    r.customerMobile.includes(q) ||
    r.deviceModel.toLowerCase().includes(q)
  ).slice(0, 3) : [];

  const matchedUsedPurchases = q ? usedPurchases.filter(u => 
    u.voucherNo.toLowerCase().includes(q) ||
    u.sellerName.toLowerCase().includes(q) ||
    u.mobile.includes(q) ||
    u.imei1.includes(q) ||
    (u.imei2 && u.imei2.includes(q)) ||
    u.model.toLowerCase().includes(q)
  ).slice(0, 3) : [];

  const matchedCustomers = q ? customers.filter(c => 
    c.name.toLowerCase().includes(q) ||
    c.phone.includes(q)
  ).slice(0, 3) : [];

  const totalResults = matchedInventory.length + matchedRepairs.length + matchedUsedPurchases.length + matchedCustomers.length;

  return (
    <div className="drawer-overlay no-print" onClick={onClose} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
      <div 
        className="illoca-card animate-fade-in" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '620px', 
          width: '92%', 
          background: 'var(--surface-primary)', 
          boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Search Input Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--surface-card)'
        }}>
          <Search size={20} color="var(--accent-primary)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type Barcode, 15-digit IMEI, Customer Phone, Model, or Token #..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ 
              flex: 1, 
              border: 'none', 
              background: 'transparent', 
              fontSize: '1.05rem', 
              color: 'var(--text-primary)',
              fontFamily: 'inherit'
            }}
          />
          <kbd style={{ background: 'var(--border-color)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '1rem' }}>
          
          {!q ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.88rem' }}>Type any Barcode, Phone IMEI, Customer Mobile or Token to search instantly.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                <span className="mono-tag">IMEI: 3582...</span>
                <span className="mono-tag">Barcode: 89012...</span>
                <span className="mono-tag">Job: ALZ-REP...</span>
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
              No matches found for "{query}".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Matched Inventory */}
              {matchedInventory.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                    STOCK ITEMS ({matchedInventory.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {matchedInventory.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          onSelectAction('inventory', item);
                          onClose();
                        }}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Package size={16} color="var(--accent-primary)" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                            {item.description && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', marginBottom: '2px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px' }}>
                                {item.description}
                              </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                              <span>Stock: {item.stock} pcs</span>
                              <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                                📍 Rack: {item.rack || 'R-01'} | Bin: {item.bin || 'B-01'}
                              </span>
                              <span>• {item.brand} • {(item.gstRate && item.gstRate > 0) || item.isGst ? 'GST' : 'Non-GST'} • {item.imeis?.length > 0 ? `IMEI: ${item.imeis[0]}` : `Barcode: ${item.barcode}`}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                          ₹{item.sellPrice.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Repairs */}
              {matchedRepairs.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-amber)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                    REPAIR JOB CARDS ({matchedRepairs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {matchedRepairs.map(job => (
                      <div
                        key={job.jobId}
                        onClick={() => {
                          onSelectAction('repairs', job);
                          onClose();
                        }}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Wrench size={16} color="var(--status-amber)" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{job.jobId} • {job.deviceModel}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Customer: {job.customerName} ({job.customerMobile}) • Status: {job.status}
                            </div>
                          </div>
                        </div>
                        <span className="mono-tag" style={{ color: 'var(--status-amber)' }}>
                          Due: ₹{job.balanceDue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Used Purchases */}
              {matchedUsedPurchases.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-green)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                    USED PHONE PURCHASE KYC ({matchedUsedPurchases.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {matchedUsedPurchases.map(u => (
                      <div
                        key={u.voucherNo}
                        onClick={() => {
                          onSelectAction('used-phones', u);
                          onClose();
                        }}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Smartphone size={16} color="var(--status-green)" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.voucherNo} • {u.brand} {u.model}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Seller: {u.sellerName} • IMEI: {u.imei1}
                            </div>
                          </div>
                        </div>
                        <span className="mono-tag">₹{u.buyPrice.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
