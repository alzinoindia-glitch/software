import React, { useState } from 'react';
import { 
  Barcode, 
  Printer, 
  Copy, 
  CheckCircle, 
  Layers, 
  Sparkles, 
  Tag,
  QrCode,
  Search,
  PackageCheck
} from 'lucide-react';
import { renderBarcodeSvg, renderCodeSvg } from '../utils/barcode';
import { buildProductScanUrl } from '../utils/productTerms';

export default function BarcodeGenerator({ 
  inventory, 
  selectedItemForBarcode, 
  shopConfig, 
  onPrintBarcodeSheet 
}) {
  const initialProduct = selectedItemForBarcode || inventory[0] || null;
  const [selectedProductId, setSelectedProductId] = useState(
    initialProduct?.id || ''
  );
  const [selectedProductIds, setSelectedProductIds] = useState(() => selectedItemForBarcode?.id ? [String(selectedItemForBarcode.id)] : []);
  const [stockSearch, setStockSearch] = useState(initialProduct ? `${initialProduct.brand || ''} ${initialProduct.name || ''}`.trim() : '');

  const [customTitle, setCustomTitle] = useState(
    initialProduct?.name || '65W SuperVOOC Fast Power Adapter'
  );
  const [customBarcode, setCustomBarcode] = useState(
    initialProduct ? (initialProduct.barcode || initialProduct.barcodes?.[0] || initialProduct.units?.find(unit => unit.barcode)?.barcode || initialProduct.imeis?.[0] || `ALZ-${initialProduct.id}`) : '8901234567890'
  );
  const [customPrice, setCustomPrice] = useState(
    initialProduct?.sellPrice ?? '1299'
  );
  const [customMrp, setCustomMrp] = useState(
    initialProduct?.mrp ?? '1999'
  );

  const [labelCopies, setLabelCopies] = useState(24);
  const [labelFormat, setLabelFormat] = useState('sheet24'); // sheet24 | sheet40 | thermalSingle
  const [codeFormat, setCodeFormat] = useState(
    selectedItemForBarcode?.codeFormat || (selectedItemForBarcode?.barcode?.includes('QR-') ? 'qr' : 'barcode')
  );

  // Sync if selectedItemForBarcode changes
  React.useEffect(() => {
    if (selectedItemForBarcode) {
      setSelectedProductId(selectedItemForBarcode.id);
      setSelectedProductIds([String(selectedItemForBarcode.id)]);
      setStockSearch(`${selectedItemForBarcode.brand || ''} ${selectedItemForBarcode.name || ''}`.trim());
      setCustomTitle(selectedItemForBarcode.name);
      setCustomBarcode(selectedItemForBarcode.barcode || `ALZ-${selectedItemForBarcode.id}`);
      setCustomPrice(selectedItemForBarcode.sellPrice);
      setCustomMrp(selectedItemForBarcode.mrp || selectedItemForBarcode.sellPrice);
      if (selectedItemForBarcode.codeFormat) {
        setCodeFormat(selectedItemForBarcode.codeFormat);
      } else if (selectedItemForBarcode.barcode?.includes('QR-')) {
        setCodeFormat('qr');
      }
    }
  }, [selectedItemForBarcode]);

  const handleProductSelect = (id) => {
    setSelectedProductId(id);
    const prod = inventory.find(p => p.id === id);
    if (prod) {
      setStockSearch(`${prod.brand || ''} ${prod.name || ''}`.trim());
      setCustomTitle(prod.name);
      const existingCode = prod.barcode || prod.barcodes?.[0] || prod.units?.find(unit => unit.barcode)?.barcode || prod.imeis?.[0] || prod.units?.find(unit => unit.imei1 || unit.imei2)?.imei1 || `ALZ-${prod.id}`;
      setCustomBarcode(existingCode);
      setCustomPrice(prod.sellPrice);
      setCustomMrp(prod.mrp || prod.sellPrice);
      if (prod.codeFormat) {
        setCodeFormat(prod.codeFormat);
      } else if (prod.barcode?.includes('QR-')) {
        setCodeFormat('qr');
      }
    }
  };

  React.useEffect(() => {
    if (!selectedItemForBarcode && !selectedProductId && inventory.length) {
      handleProductSelect(inventory[0].id);
    }
  }, [inventory, selectedItemForBarcode, selectedProductId]);

  const stockMatches = inventory.filter(item => {
    const query = stockSearch.trim().toLowerCase();
    if (!query) return true;
    const identifiers = [
      item.id,
      item.barcode,
      ...(item.barcodes || []),
      ...(item.imeis || []),
      ...(item.units || []).flatMap(unit => [unit.barcode, unit.imei1, unit.imei2]),
    ];
    return [item.name, item.brand, item.model, item.category, ...identifiers]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(query));
  });

  const handlePrint = () => {
    onPrintBarcodeSheet({
      id: selectedProductId,
      title: customTitle,
      barcode: customBarcode,
      codeFormat,
      price: customPrice,
      mrp: customMrp,
      copies: parseInt(labelCopies, 10) || 24,
      format: labelFormat,
    });
  };

  const getProductStockCount = (item) => Math.max(0, Math.floor(Number(item.stock ?? item.quantity ?? item.units?.length ?? 0) || 0));
  const inStockLabelCount = inventory.reduce((sum, item) => sum + getProductStockCount(item), 0);
  const selectedProducts = inventory.filter(item => selectedProductIds.includes(String(item.id)));
  const selectedLabelCount = selectedProducts.reduce((sum, item) => sum + getProductStockCount(item), 0);
  const bulkPageCapacity = labelFormat === 'sheet40' ? 40 : labelFormat === 'thermalSingle' ? 1 : 24;
  const estimatedBulkPages = Math.ceil(inStockLabelCount / bulkPageCapacity);
  const estimatedSelectedPages = Math.ceil(selectedLabelCount / bulkPageCapacity);

  const buildProductLabels = (products) => products.flatMap(item => {
      const quantity = getProductStockCount(item);
      if (!quantity) return [];
      const unitCodes = (item.units || []).map(unit => unit.barcode || unit.imei1 || unit.imei2).filter(Boolean);
      const codes = unitCodes.length ? unitCodes : (item.barcodes || []).filter(Boolean);
      const fallbackCode = item.barcode || `ALZ-${item.id}`;
      return Array.from({ length: quantity }, (_, index) => ({
        id: item.id,
        title: [item.brand, item.name].filter(Boolean).join(' '),
        barcode: codes[index] || fallbackCode,
        codeFormat: item.codeFormat || (String(codes[index] || fallbackCode).includes('QR-') ? 'qr' : codeFormat),
        price: item.sellPrice ?? item.price ?? 0,
        mrp: item.mrp ?? '',
      }));
    });

  const handlePrintProducts = (products, emptyMessage) => {
    const labels = buildProductLabels(products);
    if (!labels.length) {
      alert(emptyMessage);
      return;
    }
    onPrintBarcodeSheet({ bulk: true, labels, copies: labels.length, format: labelFormat, codeFormat });
  };

  const toggleProductSelection = (id) => setSelectedProductIds(previous => previous.includes(String(id)) ? previous.filter(value => value !== String(id)) : [...previous, String(id)]);

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      
      {/* Sleek Minimalist Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Barcode & Label Studio</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Code-128 · 50x25mm / A4 Sheets
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => handlePrintProducts(selectedProducts, 'Selected products have no available stock.')} className="btn-outline" disabled={!selectedLabelCount} style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }} title="Create labels for all units of the selected products">
            <Printer size={15} /><span>Print Selected ({selectedLabelCount})</span>
          </button>
          <button type="button" onClick={() => handlePrintProducts(inventory, 'There are no in-stock product units to print.')} className="btn-outline" disabled={!inStockLabelCount} style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }} title="Create one label for every unit currently in stock">
            <PackageCheck size={15} /><span>Print All In-Stock ({inStockLabelCount})</span>
          </button>
          <button onClick={handlePrint} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
            <Printer size={15} /><span>Print Barcodes</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.25rem' }}>
        
        {/* Left: Configuration Form */}
        <div className="illoca-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Barcode & Label Settings</h3>

          {/* Search existing stock items and their saved barcode / QR values */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Search Existing Stock / Barcode / QR / IMEI:
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="search"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Search product, brand, barcode, QR value, or IMEI..."
                className="input-field"
                style={{ paddingLeft: '2rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{selectedProductIds.length} product{selectedProductIds.length === 1 ? '' : 's'} selected · {selectedLabelCount} labels</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button type="button" className="btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => setSelectedProductIds(previous => Array.from(new Set([...previous, ...stockMatches.map(item => String(item.id))])))}>Select matching</button>
                <button type="button" className="btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => setSelectedProductIds([])}>Clear</button>
              </div>
            </div>
            <div style={{ marginTop: '0.4rem', maxHeight: '190px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-primary)' }}>
              {stockMatches.length ? stockMatches.map(item => {
                const codes = [item.barcode, ...(item.barcodes || []), ...(item.units || []).map(unit => unit.barcode), ...(item.imeis || []), ...(item.units || []).flatMap(unit => [unit.imei1, unit.imei2])].filter(Boolean);
                return (
                  <div
                    key={item.id}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.5rem 0.65rem', borderBottom: '1px solid var(--border-color)', background: selectedProductIds.includes(String(item.id)) ? 'var(--illoca-blue-subtle)' : 'transparent' }}
                  >
                    <input type="checkbox" aria-label={`Select ${item.name} for barcode printing`} checked={selectedProductIds.includes(String(item.id))} onChange={() => toggleProductSelection(item.id)} style={{ width: 16, height: 16, flex: '0 0 auto', accentColor: 'var(--accent-primary)' }} />
                    <button type="button" onClick={() => handleProductSelect(item.id)} style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.15rem', border: 'none', background: 'transparent', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{item.brand || 'Stock'} · {item.name} · ₹{item.sellPrice || 0} <span style={{ color: 'var(--status-green)' }}>({getProductStockCount(item)} in stock)</span></span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{codes.length ? `Saved codes: ${codes.join(' · ')}` : `Product code: ALZ-${item.id}`}</span>
                    </button>
                  </div>
                );
              }) : (
                <div style={{ padding: '0.65rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {inventory.length ? 'No stock items match that search.' : 'Stock is still loading or no stock items are available.'}
                </div>
              )}
            </div>
          </div>

          {/* Code Format Choice */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Sticker Code Format:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setCodeFormat('barcode')}
                style={{
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${codeFormat === 'barcode' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: codeFormat === 'barcode' ? 'var(--illoca-blue-subtle)' : 'var(--surface-primary)',
                  color: codeFormat === 'barcode' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer'
                }}
              >
                <Barcode size={14} />
                <span>1D Barcode (Code-128)</span>
              </button>
              <button
                type="button"
                onClick={() => setCodeFormat('qr')}
                style={{
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${codeFormat === 'qr' ? '#4F46E5' : 'var(--border-color)'}`,
                  background: codeFormat === 'qr' ? 'rgba(79, 70, 229, 0.08)' : 'var(--surface-primary)',
                  color: codeFormat === 'qr' ? '#4F46E5' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer'
                }}
              >
                <QrCode size={14} />
                <span>2D QR Code</span>
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Product Label Title:
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Barcode Value / EAN:
              </label>
              <input
                type="text"
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value)}
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Selling Price (₹):
              </label>
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="input-field"
                style={{ fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                MRP (₹):
              </label>
              <input
                type="number"
                value={customMrp}
                onChange={(e) => setCustomMrp(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Number of Labels to Print:
              </label>
              <input
                type="number"
                value={labelCopies}
                onChange={(e) => setLabelCopies(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Paper Format */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Sticker Paper Layout:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {[
                { id: 'sheet24', label: 'A4 (24 Labels/Sheet)', desc: '3 x 8 layout' },
                { id: 'sheet40', label: 'A4 (40 Labels/Sheet)', desc: '4 x 10 compact' },
                { id: 'thermalSingle', label: 'Thermal Barcode (50x25mm)', desc: 'Single roll label' },
              ].map(fmt => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setLabelFormat(fmt.id)}
                  style={{
                    padding: '0.65rem 0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${labelFormat === fmt.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    background: labelFormat === fmt.id ? 'var(--illoca-blue-subtle)' : 'var(--surface-primary)',
                    color: labelFormat === fmt.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{fmt.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{fmt.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: '0.55rem', padding: '0.55rem 0.7rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card-hover)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Selected products: <strong style={{ color: 'var(--text-primary)' }}>{selectedLabelCount}</strong> labels across <strong style={{ color: 'var(--text-primary)' }}>{estimatedSelectedPages}</strong> {estimatedSelectedPages === 1 ? 'page' : 'pages'}. All in-stock products: {inStockLabelCount} labels across {estimatedBulkPages} {estimatedBulkPages === 1 ? 'page' : 'pages'}.
            </div>
          </div>
        </div>

        {/* Right: Live Label Preview */}
        <div className="illoca-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            Live Sticker Label Preview:
          </h4>

          {/* Sticker Preview Card */}
          <div style={{
            width: '260px',
            background: '#FFFFFF',
            color: '#0A0D14',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '2px solid #E0CFAE',
            boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            {/* Header */}
            <div style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' }}>
              {shopConfig.name} • BODHAN
            </div>
            
            {/* Product Title */}
            <div style={{ fontSize: '0.75rem', fontWeight: 600, margin: '0.2rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {customTitle}
            </div>

            {/* SVG Barcode or QR Code */}
            <div 
              style={{ margin: '0.35rem 0', display: 'flex', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: renderCodeSvg(customBarcode, codeFormat, 220, codeFormat === 'qr' ? 100 : 55, true, buildProductScanUrl({ id: selectedProductId, barcode: customBarcode }, '', { addToCart: true })) }}
            />

            {/* Pricing */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem', padding: '0 0.5rem' }}>
              {customMrp && (
                <span style={{ fontSize: '0.72rem', textDecoration: 'line-through', color: '#666' }}>
                  MRP: ₹{customMrp}
                </span>
              )}
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0A0D14' }}>
                OUR PRICE: ₹{customPrice}
              </span>
            </div>
          </div>


          <button
            onClick={handlePrint}
            className="btn-primary"
            style={{ marginTop: '1rem' }}
          >
            <Printer size={16} />
            <span>Print {labelCopies} Labels Now</span>
          </button>
        </div>

      </div>

    </div>
  );
}
