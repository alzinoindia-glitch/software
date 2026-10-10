import React, { useState } from 'react';
import { 
  X, 
  Barcode, 
  Calculator, 
  QrCode, 
  AlertTriangle, 
  Keyboard, 
  Sparkles, 
  CheckCircle2, 
  Search,
  IndianRupee,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { getUpiQrUrl, renderBarcodeSvg } from '../utils/barcode';

export default function IllocaPulloutDrawer({ 
  isOpen, 
  onClose, 
  inventory, 
  shopConfig, 
  onSelectProduct,
  onOpenProductInventory
}) {
  const [activeTool, setActiveTool] = useState('scanner'); // scanner | margin | upi | lowstock | shortcuts
  
  // Scanner bench state
  const [testScanValue, setTestScanValue] = useState('');
  const [matchedItem, setMatchedItem] = useState(null);

  // Margin calculator state
  const [calcCost, setCalcCost] = useState('1000');
  const [calcMarginPct, setCalcMarginPct] = useState('20');
  const [calcGst, setCalcGst] = useState('18');

  // Quick UPI QR state
  const [upiAmount, setUpiAmount] = useState('500');

  // Low stock list
  const lowStockItems = inventory.filter(i => i.stock <= i.lowStockThreshold);

  // Scanner test handler
  const handleTestScan = (val) => {
    setTestScanValue(val);
    const q = val.trim().toLowerCase();
    if (!q) {
      setMatchedItem(null);
      return;
    }

    const found = inventory.find(i => 
      (i.barcode && i.barcode.toLowerCase() === q) ||
      (i.imeis && i.imeis.some(im => im.toLowerCase() === q)) ||
      i.name.toLowerCase().includes(q)
    );
    setMatchedItem(found || null);
  };

  // Margin calculation math
  const cost = parseFloat(calcCost) || 0;
  const marginPercent = parseFloat(calcMarginPct) || 0;
  const gstPercent = parseFloat(calcGst) || 0;

  const targetSellBeforeGst = cost * (1 + (marginPercent / 100));
  const gstAmount = targetSellBeforeGst * (gstPercent / 100);
  const targetFinalMrp = Math.round(targetSellBeforeGst + gstAmount);
  const estimatedProfit = Math.round(targetSellBeforeGst - cost);

  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div 
          className="drawer-overlay no-print" 
          onClick={onClose} 
        />
      )}

      {/* Signature Illoca Feature Demo Pullout */}
      <div className={`illoca-drawer no-print ${isOpen ? 'open' : ''}`}>
        
        {/* Drawer Header */}
        <div style={{
          padding: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-primary)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.15rem' }}>Quick Tools & Bench Drawer</h3>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Inspired by Illoca Architectural Engine UI
            </div>
          </div>

          <button 
            onClick={onClose}
            className="btn-outline"
            style={{ padding: '0.35rem 0.55rem' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tool Navigation Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--surface-card)'
        }}>
          {[
            { id: 'scanner', label: 'Scanner', icon: Barcode },
            { id: 'margin', label: 'Margin', icon: Calculator },
            { id: 'upi', label: 'UPI QR', icon: QrCode },
            { id: 'lowstock', label: 'Low Stock', icon: AlertTriangle, count: lowStockItems.length },
            { id: 'shortcuts', label: 'Keys', icon: Keyboard },
          ].map(tool => {
            const Icon = tool.icon;
            const isSel = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                style={{
                  padding: '0.65rem 0.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: isSel ? 700 : 500,
                  color: isSel ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${isSel ? 'var(--accent-primary)' : 'transparent'}`,
                  background: isSel ? 'var(--surface-primary)' : 'transparent',
                  position: 'relative'
                }}
              >
                <Icon size={16} />
                <span>{tool.label}</span>
                {tool.count > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '8px',
                    background: 'var(--status-amber)',
                    color: '#FFF',
                    fontSize: '0.6rem',
                    padding: '0.05rem 0.3rem',
                    borderRadius: '999px',
                    fontWeight: 700
                  }}>
                    {tool.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tool Content Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          
          {/* Tool 1: Barcode Scanner Test Bench */}
          {activeTool === 'scanner' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>USB / Bluetooth Barcode Scanner Test</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Point your handheld laser scanner at any product barcode box or mobile IMEI label to verify instant decoding.
                </p>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Scan or type Barcode / IMEI here..."
                  value={testScanValue}
                  onChange={(e) => handleTestScan(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '1rem', padding: '0.75rem', fontFamily: 'var(--font-mono)' }}
                  autoFocus
                />
              </div>

              {matchedItem ? (
                <div style={{
                  background: 'var(--status-green-bg)',
                  border: '1px solid var(--status-green)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-green)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <CheckCircle2 size={16} />
                    <span>ITEM IDENTIFIED IN ALZINO INVENTORY:</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{matchedItem.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Brand: {matchedItem.brand} | Category: {matchedItem.category}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Available Stock: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{matchedItem.stock} pcs</strong>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      ₹{matchedItem.sellPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : testScanValue ? (
                <div style={{
                  background: 'var(--status-amber-bg)',
                  border: '1px solid var(--status-amber)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  fontSize: '0.85rem'
                }}>
                  <span style={{ fontWeight: 600 }}>Decoded: "{testScanValue}"</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Not yet cataloged in inventory. You can add it in Stock & IMEIs.
                  </div>
                </div>
              ) : null}

              {/* Sample test barcodes for the user to try */}
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Try Clicking Quick Sample Barcodes:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {inventory.slice(0, 3).map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleTestScan(p.barcode || p.imeis[0])}
                      style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: '4px',
                        background: 'var(--surface-card)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.78rem',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{p.name.substring(0, 28)}...</span>
                      <span className="font-mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {p.barcode || p.imeis[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tool 2: Margin & Selling Price Calculator */}
          {activeTool === 'margin' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>Margin & Selling Price Calculator</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Calculate customer price from dealer purchase cost and desired shop profit margin %.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Dealer Buying Cost (₹):</label>
                  <input
                    type="number"
                    value={calcCost}
                    onChange={(e) => setCalcCost(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Desired Profit Margin (%):</label>
                  <input
                    type="number"
                    value={calcMarginPct}
                    onChange={(e) => setCalcMarginPct(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>GST Tax Rate (%):</label>
                  <select 
                    value={calcGst} 
                    onChange={(e) => setCalcGst(e.target.value)}
                    className="input-field"
                  >
                    <option value="18">18% (Standard Mobiles/Electronics)</option>
                    <option value="12">12%</option>
                    <option value="28">28%</option>
                    <option value="0">0% (Nil)</option>
                  </select>
                </div>
              </div>

              {/* Calculated Results Box */}
              <div style={{
                background: 'var(--illoca-blue-subtle)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                marginTop: '0.5rem'
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Recommended Selling Price:</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)', margin: '0.2rem 0' }}>
                  ₹{targetFinalMrp.toLocaleString()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span>Net Profit to Shop:</span>
                  <strong style={{ color: 'var(--status-green)' }}>+₹{estimatedProfit.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.3rem', color: 'var(--text-secondary)' }}>
                  <span>GST Collected:</span>
                  <span>₹{Math.round(gstAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tool 3: Instant Dynamic UPI QR */}
          {activeTool === 'upi' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.85rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>Counter UPI Payment QR</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Customer can scan with PhonePe, Google Pay, Paytm, or BHIM.
                </p>
              </div>

              <div style={{ width: '100%', maxWidth: '200px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Bill Amount (₹):</label>
                <input
                  type="number"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(e.target.value)}
                  className="input-field"
                  style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)' }}
                />
              </div>

              {/* Dynamic QR image */}
              <div style={{
                background: '#FFFFFF',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '2px solid var(--border-color)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <img
                  src={getUpiQrUrl(shopConfig.upiId, shopConfig.name, parseFloat(upiAmount) || 0)}
                  alt="UPI QR"
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0A0D14', marginTop: '0.4rem' }}>
                  ₹{parseFloat(upiAmount || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'var(--font-mono)' }}>
                  {shopConfig.upiId}
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Funds credit directly into your HDFC Bodhan shop account.
              </div>
            </div>
          )}

          {/* Tool 4: Low Stock Alert Drawer */}
          {activeTool === 'lowstock' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>Low Stock Alert Board</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Items that have reached or dropped below their minimum reorder point.
                </p>
              </div>

              {lowStockItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--status-green)' }}>
                  <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>All stock levels are healthy!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {lowStockItems.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => onOpenProductInventory && onOpenProductInventory(item)}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--surface-card)',
                        border: '1.5px solid var(--status-amber)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                      }}
                      className="hud-card"
                      title="Tap to view in Stock & Inventory"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{item.name}</span>
                            <ArrowUpRight size={13} color="var(--accent-primary)" />
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {item.brand} • Selling: ₹{item.sellPrice?.toLocaleString?.() || item.sellPrice}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontWeight: 800, 
                          color: item.stock === 0 ? 'var(--status-red)' : 'var(--status-amber)',
                          fontSize: '0.92rem'
                        }}>
                          {item.stock} left
                        </span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Min: {item.lowStockThreshold} pcs
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tool 5: Keyboard Shortcuts Matrix */}
          {activeTool === 'shortcuts' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>Keyboard Shortcuts</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Speed up billing and navigation at the shop counter:
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {[
                  { key: 'F2', desc: 'Jump to POS Billing Counter' },
                  { key: 'F4', desc: 'Open Used Mobile KYC Entry' },
                  { key: 'F5', desc: 'Open Mobile Repairing Lab' },
                  { key: '⌘K / F8', desc: 'Universal Barcode / IMEI Search' },
                  { key: 'Enter', desc: 'Add scanned barcode / IMEI to bill' },
                  { key: 'Esc', desc: 'Close modals & drawers' },
                ].map((s, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--surface-card)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.82rem'
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{s.desc}</span>
                    <kbd style={{ 
                      background: 'var(--border-color)', 
                      padding: '0.15rem 0.45rem', 
                      borderRadius: '4px', 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: 700,
                      color: 'var(--text-primary)'
                    }}>
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </>
  );
}
