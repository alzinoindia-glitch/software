import React, { useState, useMemo } from 'react';
import { 
  Smartphone, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Printer, 
  ShoppingCart, 
  Search, 
  Download, 
  Layers, 
  Barcode, 
  MapPin, 
  Tag, 
  CheckCircle,
  Hash
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ModelVariantImeiDirectory({
  inventory = [],
  onSelectBarcode,
  onPrintBarcodeSheet,
  onQuickBill
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModels, setExpandedModels] = useState({});
  const [copiedText, setCopiedText] = useState(null);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const toggleModelExpand = (modelKey) => {
    setExpandedModels(prev => ({
      ...prev,
      [modelKey]: !prev[modelKey]
    }));
  };

  // Group inventory items by Model
  const modelGroups = useMemo(() => {
    const groups = {};

    inventory.forEach(item => {
      // Determine model name
      let modelName = item.model;
      if (!modelName) {
        // Parse from name: remove parentheses and bracket details
        modelName = item.name.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      }
      const brand = item.brand || 'Universal';
      const key = `${brand}::${modelName}`.toLowerCase();

      if (!groups[key]) {
        groups[key] = {
          key,
          brand,
          modelName,
          category: item.category || 'Mobiles',
          items: [],
          totalStock: 0,
          totalValue: 0,
          colors: new Set(),
          variants: new Set(),
          allUnits: []
        };
      }

      groups[key].items.push(item);
      groups[key].totalStock += (item.stock || 0);
      groups[key].totalValue += ((item.sellPrice || 0) * (item.stock || 0));

      if (item.color) groups[key].colors.add(item.color);
      if (item.ram || item.storage) {
        groups[key].variants.add(`${item.ram || ''} ${item.storage || ''}`.trim());
      }

      // Collect physical units
      if (item.units && item.units.length > 0) {
        item.units.forEach(u => {
          groups[key].allUnits.push({
            ...u,
            productName: item.name,
            productId: item.id,
            ram: item.ram,
            storage: item.storage,
            sellPrice: item.sellPrice,
            rack: u.rack || item.rack || 'R-01',
            bin: u.bin || item.bin || 'B-01',
            barcode: u.barcode || item.barcode,
            color: u.color || item.color || 'Standard',
            status: u.status || (item.stock > 0 ? 'In Stock' : 'Sold')
          });
        });
      } else if (item.imeis && item.imeis.length > 0) {
        // Fallback for items with just imeis array
        item.imeis.forEach((im, idx) => {
          groups[key].allUnits.push({
            unitId: `${item.id}-u-${idx}`,
            imei1: im,
            imei2: '',
            productName: item.name,
            productId: item.id,
            ram: item.ram,
            storage: item.storage,
            sellPrice: item.sellPrice,
            rack: item.rack || 'R-01',
            bin: item.bin || 'B-01',
            barcode: item.barcode,
            color: item.color || 'Standard',
            status: item.stock > 0 ? 'In Stock' : 'Sold'
          });
        });
      }
    });

    return Object.values(groups);
  }, [inventory]);

  // Filter model groups by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return modelGroups;
    const q = searchQuery.toLowerCase().trim();

    return modelGroups.filter(g => {
      const matchHeader = g.modelName.toLowerCase().includes(q) || g.brand.toLowerCase().includes(q);
      const matchColors = Array.from(g.colors).some(c => c.toLowerCase().includes(q));
      const matchUnits = g.allUnits.some(u => 
        (u.imei1 && u.imei1.toLowerCase().includes(q)) ||
        (u.imei2 && u.imei2.toLowerCase().includes(q)) ||
        (u.barcode && u.barcode.toLowerCase().includes(q)) ||
        (u.color && u.color.toLowerCase().includes(q))
      );
      return matchHeader || matchColors || matchUnits;
    });
  }, [modelGroups, searchQuery]);

  // Export Directory to Excel
  const handleExportDirectoryExcel = () => {
    const exportData = [];

    modelGroups.forEach(g => {
      if (g.allUnits.length > 0) {
        g.allUnits.forEach((u, idx) => {
          exportData.push({
            Brand: g.brand,
            Model: g.modelName,
            RAM: u.ram || '',
            Storage: u.storage || '',
            Colour: u.color || '',
            UnitNo: idx + 1,
            IMEI1: u.imei1 || '',
            IMEI2: u.imei2 || '',
            Barcode: u.barcode || '',
            Price: u.sellPrice || 0,
            Rack: u.rack || '',
            Bin: u.bin || '',
            Status: u.status || 'In Stock'
          });
        });
      } else {
        g.items.forEach(item => {
          exportData.push({
            Brand: g.brand,
            Model: g.modelName,
            RAM: item.ram || '',
            Storage: item.storage || '',
            Colour: item.color || 'Standard',
            Stock: item.stock || 0,
            Price: item.sellPrice || 0,
            Rack: item.rack || '',
            Bin: item.bin || '',
            Barcode: item.barcode || ''
          });
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Model_IMEI_Directory');
    XLSX.writeFile(wb, `ALZINO_Model_IMEI_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Top Filter and Export Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: 'var(--surface-primary, #FFFFFF)',
        padding: '0.85rem 1.1rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color, #E5E7EB)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '240px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Model, Colour, IMEI, or Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.1rem', fontSize: '0.8rem' }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {filteredGroups.length} Models ({filteredGroups.reduce((a, b) => a + b.totalStock, 0)} Units)
          </span>
        </div>

        <button
          type="button"
          onClick={handleExportDirectoryExcel}
          className="btn-secondary"
          style={{
            padding: '0.45rem 0.95rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            borderColor: '#10B981',
            color: '#10B981'
          }}
        >
          <Download size={14} />
          <span>Export Model & IMEI Directory (.xlsx)</span>
        </button>
      </div>

      {/* Models Directory List */}
      {filteredGroups.length === 0 ? (
        <div style={{
          background: 'var(--surface-primary, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #E5E7EB)',
          padding: '3rem 1rem',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <Smartphone size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            No Matching Models or IMEIs
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem' }}>
            Try a different search term or add stock using the Bulk Add Mobiles button.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredGroups.map(group => {
            const isExpanded = expandedModels[group.key] !== false; // Default expanded

            return (
              <div
                key={group.key}
                style={{
                  background: 'var(--surface-primary, #FFFFFF)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #E5E7EB)',
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                }}
              >
                {/* Model Header */}
                <div
                  onClick={() => toggleModelExpand(group.key)}
                  style={{
                    padding: '0.85rem 1.15rem',
                    background: 'var(--surface-header, #F9FAFB)',
                    borderBottom: isExpanded ? '1px solid var(--border-color, #E5E7EB)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          background: 'rgba(0,0,0,0.08)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          {group.brand}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {group.modelName}
                        </h3>
                        {group.variants.size > 0 && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            [{Array.from(group.variants).join(', ')}]
                          </span>
                        )}
                      </div>

                      {/* Colour-Wise Breakdown Chips */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Colours in Stock:</span>
                        {group.items.map(item => (
                          <span
                            key={item.id}
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'var(--bg-main, #FFFFFF)',
                              border: '1px solid var(--border-color, #E5E7EB)',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: item.color === 'Onyx Black' ? '#111' : '#4F46E5' }} />
                            <span>{item.color || 'Standard'}:</span>
                            <strong style={{ color: item.stock > 0 ? '#10B981' : '#EF4444' }}>{item.stock} pcs</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stock & Value Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '0.88rem',
                        fontWeight: 900,
                        color: group.totalStock > 0 ? '#10B981' : '#EF4444',
                        background: group.totalStock > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px'
                      }}>
                        {group.totalStock} in stock
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Val: ₹{group.totalValue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Unit-by-Unit IMEI & Colour Matrix */}
                {isExpanded && (
                  <div style={{ padding: '0.85rem 1.15rem' }}>
                    {group.allUnits.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color, #E5E7EB)', color: 'var(--text-muted)' }}>
                              <th style={{ padding: '0.45rem 0.5rem', width: '40px' }}>#</th>
                              <th style={{ padding: '0.45rem 0.5rem' }}>Colour Variant</th>
                              <th style={{ padding: '0.45rem 0.5rem' }}>Spec</th>
                              <th style={{ padding: '0.45rem 0.5rem' }}>IMEI 1 (SIM 1)</th>
                              <th style={{ padding: '0.45rem 0.5rem' }}>IMEI 2 (SIM 2)</th>
                              <th style={{ padding: '0.45rem 0.5rem' }}>Barcode / SKU</th>
                              <th style={{ padding: '0.45rem 0.5rem' }}>Shelf</th>
                              <th style={{ padding: '0.45rem 0.5rem' }}>Status</th>
                              <th style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.allUnits.map((unit, uIdx) => {
                              const copyKey1 = `im1-${uIdx}`;
                              const copyKey2 = `im2-${uIdx}`;

                              return (
                                <tr
                                  key={unit.unitId || uIdx}
                                  style={{
                                    borderBottom: '1px solid var(--border-color, #F3F4F6)',
                                    background: uIdx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'
                                  }}
                                >
                                  <td style={{ padding: '0.45rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                    {uIdx + 1}
                                  </td>

                                  <td style={{ padding: '0.45rem 0.5rem' }}>
                                    <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: unit.color === 'Onyx Black' ? '#111' : '#4F46E5' }} />
                                      {unit.color}
                                    </span>
                                  </td>

                                  <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted)' }}>
                                    {unit.ram && unit.storage ? `${unit.ram}/${unit.storage}` : '—'}
                                  </td>

                                  {/* IMEI 1 */}
                                  <td style={{ padding: '0.45rem 0.5rem' }}>
                                    {unit.imei1 ? (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10B981' }}>
                                          {unit.imei1}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopy(unit.imei1, copyKey1)}
                                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
                                          title="Copy IMEI 1"
                                        >
                                          {copiedText === copyKey1 ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                                        </button>
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                  </td>

                                  {/* IMEI 2 */}
                                  <td style={{ padding: '0.45rem 0.5rem' }}>
                                    {unit.imei2 ? (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                          {unit.imei2}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopy(unit.imei2, copyKey2)}
                                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
                                          title="Copy IMEI 2"
                                        >
                                          {copiedText === copyKey2 ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                                        </button>
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                  </td>

                                  {/* Barcode / SKU */}
                                  <td style={{ padding: '0.45rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--accent-primary, #4F46E5)' }}>
                                    {unit.barcode || '—'}
                                  </td>

                                  {/* Shelf Location */}
                                  <td style={{ padding: '0.45rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                                    {unit.rack}/{unit.bin}
                                  </td>

                                  {/* Status */}
                                  <td style={{ padding: '0.45rem 0.5rem' }}>
                                    <span style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      padding: '0.12rem 0.45rem',
                                      borderRadius: '4px',
                                      background: unit.status === 'In Stock' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                      color: unit.status === 'In Stock' ? '#10B981' : '#EF4444'
                                    }}>
                                      {unit.status || 'In Stock'}
                                    </span>
                                  </td>

                                  {/* Actions */}
                                  <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                                      {onPrintBarcodeSheet && unit.barcode && (
                                        <button
                                          type="button"
                                          onClick={() => onPrintBarcodeSheet({
                                            title: unit.productName || group.modelName,
                                            barcode: unit.barcode,
                                            codeFormat: unit.codeFormat || (unit.barcode?.includes('QR-') ? 'qr' : 'barcode'),
                                            price: unit.sellPrice || 0,
                                            mrp: unit.sellPrice || 0,
                                            copies: 1,
                                            format: 'single'
                                          })}
                                          className="btn-secondary"
                                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                          title="Print 50x25mm Sticker for this physical mobile"
                                        >
                                          <Printer size={11} />
                                          <span>Sticker</span>
                                        </button>
                                      )}

                                      {onQuickBill && unit.status !== 'Sold' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const item = group.items.find(i => i.id === unit.productId) || group.items[0];
                                            if (item) onQuickBill(item);
                                          }}
                                          className="btn-primary"
                                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#10B981' }}
                                          title="Fast add to Cashier POS cart"
                                        >
                                          <ShoppingCart size={11} />
                                          <span>POS Bill</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Fallback view if no physical IMEIs registered */
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.65rem' }}>
                        {group.items.map(item => (
                          <div
                            key={item.id}
                            style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color, #E5E7EB)',
                              background: 'var(--bg-main, #F9FAFB)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{item.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Shelf: {item.rack}/{item.bin} • Barcode: {item.barcode}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: '#10B981' }}>{item.stock} pcs</div>
                              <div style={{ fontSize: '0.74rem', fontWeight: 700 }}>₹{item.sellPrice?.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
