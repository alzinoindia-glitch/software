import React, { useState } from 'react';
import { 
  Barcode, 
  Printer, 
  QrCode,
  Search,
} from 'lucide-react';
import { renderCodeSvg } from '../utils/barcode';
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
  const [manualProductId, setManualProductId] = useState(initialProduct?.id ? String(initialProduct.id) : '');
  const [selectedProductIds, setSelectedProductIds] = useState(() => selectedItemForBarcode?.id ? [String(selectedItemForBarcode.id)] : []);
  const [stockSearch, setStockSearch] = useState(initialProduct ? `${initialProduct.brand || ''} ${initialProduct.name || ''}`.trim() : '');
  const [printCategory, setPrintCategory] = useState('all');
  const [bulkPreviewKind, setBulkPreviewKind] = useState(null);
  const [previewPage, setPreviewPage] = useState(0);
  const [labelFormat, setLabelFormat] = useState('sheet24'); // sheet24 | sheet40 | thermalSingle
  const [codeFormat, setCodeFormat] = useState(
    selectedItemForBarcode?.codeFormat || (selectedItemForBarcode?.barcode?.includes('QR-') ? 'qr' : 'barcode')
  );

  // Sync if selectedItemForBarcode changes
  React.useEffect(() => {
    if (selectedItemForBarcode) {
      setSelectedProductId(selectedItemForBarcode.id);
      setManualProductId(String(selectedItemForBarcode.id));
      setSelectedProductIds([String(selectedItemForBarcode.id)]);
      setStockSearch(`${selectedItemForBarcode.brand || ''} ${selectedItemForBarcode.name || ''}`.trim());
      if (selectedItemForBarcode.codeFormat) {
        setCodeFormat(selectedItemForBarcode.codeFormat);
      } else if (selectedItemForBarcode.barcode?.includes('QR-')) {
        setCodeFormat('qr');
      }
    }
  }, [selectedItemForBarcode]);

  const handleProductSelect = (id) => {
    setSelectedProductId(id);
    setManualProductId(String(id));
    setSelectedProductIds([]);
    setBulkPreviewKind(null);
    setPreviewPage(0);
    const prod = inventory.find(p => p.id === id);
    if (prod) {
      setStockSearch(`${prod.brand || ''} ${prod.name || ''}`.trim());
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

  const getProductStockCount = (item) => Math.max(0, Math.floor(Number(item.stock ?? item.quantity ?? item.units?.length ?? 0) || 0));
  const selectedProduct = inventory.find(item => String(item.id) === String(selectedProductId));
  const categories = Array.from(new Set(inventory.map(item => String(item.category || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const categoryProducts = printCategory === 'all' ? inventory : inventory.filter(item => String(item.category || '').trim() === printCategory);
  const categoryBarcodeCount = categoryProducts.reduce((sum, item) => sum + getProductStockCount(item), 0);
  const selectedProducts = inventory.filter(item => selectedProductIds.includes(String(item.id)));
  const selectedLabelCount = selectedProducts.reduce((sum, item) => sum + getProductStockCount(item), 0);
  const bulkPageCapacity = labelFormat === 'sheet40' ? 40 : labelFormat === 'thermalSingle' ? 1 : 24;
  const bulkProducts = selectedProducts.length ? selectedProducts : categoryProducts;
  const bulkBarcodeCount = selectedProducts.length ? selectedLabelCount : categoryBarcodeCount;
  const bulkQrCount = bulkProducts.length;
  const estimatedBulkQrPages = Math.ceil(bulkQrCount / bulkPageCapacity);
  const estimatedBulkBarcodePages = Math.ceil(bulkBarcodeCount / bulkPageCapacity);

  const buildProductLabels = (products, kind = 'barcode') => products.flatMap(item => {
      if (kind === 'qr') {
        const productCode = item.barcode || item.barcodes?.[0] || item.units?.find(unit => unit.barcode)?.barcode || `ALZ-${item.id}`;
        return [{ id: item.id, title: [item.brand, item.name].filter(Boolean).join(' '), barcode: productCode, codeFormat: 'qr', price: item.sellPrice ?? item.price ?? 0, mrp: item.mrp ?? '' }];
      }
      const quantity = getProductStockCount(item);
      if (!quantity) return [];
      const unitCodes = (item.units || []).map(unit => unit.barcode || unit.imei1 || unit.imei2).filter(Boolean);
      const codes = unitCodes.length ? unitCodes : (item.barcodes || []).filter(Boolean);
      const fallbackCode = item.barcode || `ALZ-${item.id}`;
      return Array.from({ length: quantity }, (_, index) => ({
        id: item.id,
        title: [item.brand, item.name].filter(Boolean).join(' '),
        barcode: codes[index] || fallbackCode,
        codeFormat: item.codeFormat || (String(codes[index] || fallbackCode).includes('QR-') ? 'qr' : 'barcode'),
        price: item.sellPrice ?? item.price ?? 0,
        mrp: item.mrp ?? '',
      }));
    });

  const manualPreviewProducts = selectedProducts.length
    ? selectedProducts
    : manualProductId
      ? inventory.filter(item => String(item.id) === manualProductId)
      : stockSearch.trim()
        ? stockMatches
        : selectedProduct ? [selectedProduct] : [];
  const previewKind = bulkPreviewKind || (codeFormat === 'qr' ? 'qr' : 'barcode');
  const previewProducts = bulkPreviewKind ? bulkProducts : manualPreviewProducts;
  const previewLabels = buildProductLabels(previewProducts, previewKind);
  const previewPageCount = Math.max(1, Math.ceil(previewLabels.length / bulkPageCapacity));
  const safePreviewPage = Math.min(previewPage, previewPageCount - 1);
  const pagePreviewLabels = previewLabels.slice(safePreviewPage * bulkPageCapacity, (safePreviewPage + 1) * bulkPageCapacity);

  const handlePrint = () => {
    if (!previewLabels.length) {
      alert(previewKind === 'qr' ? 'No products are available for QR labels.' : 'No in-stock units are available for barcode labels.');
      return;
    }
    onPrintBarcodeSheet({ bulk: true, labels: previewLabels, copies: previewLabels.length, format: labelFormat, codeFormat: previewKind === 'qr' ? 'qr' : 'barcode', labelKind: previewKind });
  };

  const toggleProductSelection = (id) => {
    setManualProductId('');
    setBulkPreviewKind(null);
    setPreviewPage(0);
    setSelectedProductIds(previous => previous.includes(String(id)) ? previous.filter(value => value !== String(id)) : [...previous, String(id)]);
  };

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
          <button onClick={handlePrint} className="btn-primary" disabled={!previewLabels.length} style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
            <Printer size={15} /><span>Print {previewLabels.length} {previewKind === 'qr' ? 'QR Labels' : 'Barcode Labels'}</span>
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
                onChange={(e) => { setManualProductId(''); setSelectedProductIds([]); setBulkPreviewKind(null); setPreviewPage(0); setStockSearch(e.target.value); }}
                placeholder="Search product, brand, barcode, QR value, or IMEI..."
                className="input-field"
                style={{ paddingLeft: '2rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{selectedProductIds.length} product{selectedProductIds.length === 1 ? '' : 's'} selected · {selectedLabelCount} labels</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button type="button" className="btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => { setBulkPreviewKind(null); setPreviewPage(0); setSelectedProductIds(previous => Array.from(new Set([...previous, ...stockMatches.map(item => String(item.id))]))); }}>Select matching</button>
                <button type="button" className="btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => { setBulkPreviewKind(null); setPreviewPage(0); setSelectedProductIds([]); }}>Clear</button>
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

          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.82rem' }}>Bulk product labels</strong>
              <select className="input-field" aria-label="Category for bulk barcode and QR printing" value={printCategory} onChange={event => { setPreviewPage(0); setPrintCategory(event.target.value); }} style={{ maxWidth: '240px', padding: '0.35rem 0.55rem' }}>
                <option value="all">All categories ({inventory.length})</option>
                {categories.map(category => <option key={category} value={category}>{category} ({inventory.filter(item => String(item.category || '').trim() === category).length})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              <button type="button" className={bulkPreviewKind === 'qr' ? 'btn-primary' : 'btn-outline'} disabled={!bulkQrCount} onClick={() => { setPreviewPage(0); setBulkPreviewKind('qr'); }}><QrCode size={14} /> Preview QR Codes ({bulkQrCount} products)</button>
              <button type="button" className={bulkPreviewKind === 'barcode' ? 'btn-primary' : 'btn-outline'} disabled={!bulkBarcodeCount} onClick={() => { setPreviewPage(0); setBulkPreviewKind('barcode'); }}><Barcode size={14} /> Preview Barcodes ({bulkBarcodeCount} units)</button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{selectedProducts.length ? `Using ${selectedProducts.length} individually selected products.` : `Using ${printCategory === 'all' ? 'all categories' : printCategory} from the category dropdown.`} QR: one storefront product link per product ({bulkQrCount} labels · about {estimatedBulkQrPages} {estimatedBulkQrPages === 1 ? 'page' : 'pages'}). Barcodes: one saved unit code per in-stock unit ({bulkBarcodeCount} labels · about {estimatedBulkBarcodePages} {estimatedBulkBarcodePages === 1 ? 'page' : 'pages'}).</div>
          </div>

          {/* Code Format Choice */}
          {!bulkPreviewKind && <div>
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
          </div>}

          {/* Paper Format */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Sticker Paper Layout:
            </label>
            <select className="input-field" value={labelFormat} onChange={event => setLabelFormat(event.target.value)}>
              <option value="sheet24">A4 · 24 labels per sheet (3 × 8)</option>
              <option value="sheet40">A4 · 40 labels per sheet (4 × 10)</option>
              <option value="thermalSingle">Thermal roll · 50 × 25 mm</option>
            </select>
            <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              Labels automatically flow onto pages. {previewLabels.length} {previewKind === 'qr' ? 'QR labels' : 'barcode labels'} · about {previewPageCount} {previewPageCount === 1 ? 'page' : 'pages'}.
            </div>
          </div>
        </div>

        {/* Right: Live Label Preview */}
        <div className="illoca-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', minHeight: 0 }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            {bulkPreviewKind ? `Bulk ${previewKind === 'qr' ? 'QR' : 'Barcode'} Preview (${previewLabels.length})` : `Product ${previewKind === 'qr' ? 'QR' : 'Barcode'} Preview (${previewLabels.length})`}
          </h4>
          <div style={{ maxHeight: '580px', minHeight: '220px', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.65rem', background: 'var(--surface-secondary, #f7f8fa)' }}>
            {pagePreviewLabels.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: labelFormat === 'sheet40' ? 'repeat(4, minmax(0, 1fr))' : labelFormat === 'thermalSingle' ? 'minmax(0, 1fr)' : 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}>
                {pagePreviewLabels.map((label, index) => {
                  const isQr = label.codeFormat === 'qr' || String(label.barcode || '').includes('QR-');
                  const scanUrl = buildProductScanUrl({ id: label.id || label.barcode, barcode: label.barcode }, '', { addToCart: !isQr });
                  return (
                    <article key={`${label.id}-${label.barcode}-${safePreviewPage}-${index}`} style={{ minWidth: 0, minHeight: labelFormat === 'thermalSingle' ? '180px' : '132px', padding: '0.45rem', border: '1px solid #d7dce2', borderRadius: '6px', background: '#fff', color: '#111', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.6rem', lineHeight: 1, fontWeight: 800 }}>{shopConfig.name} · BODHAN</div>
                      <div title={label.title} style={{ fontSize: '0.62rem', lineHeight: 1.1, fontWeight: 700, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{label.title}</div>
                      <div style={{ height: labelFormat === 'sheet40' ? '58px' : '72px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: renderCodeSvg(label.barcode, isQr ? 'qr' : 'barcode', 130, 52, true, scanUrl) }} />
                      <div style={{ fontSize: '0.62rem', fontWeight: 800 }}>₹{Number(label.price || 0).toLocaleString()}{label.mrp && Number(label.mrp) > Number(label.price) ? <span style={{ marginLeft: '0.25rem', color: '#777', textDecoration: 'line-through', fontWeight: 500 }}>₹{Number(label.mrp).toLocaleString()}</span> : null}</div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div style={{ minHeight: '200px', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                {previewKind === 'qr' ? 'No products match this selection for QR labels.' : 'No in-stock units match this selection for barcode labels.'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
            <button type="button" className="btn-outline" disabled={safePreviewPage === 0} onClick={() => setPreviewPage(page => Math.max(0, page - 1))}>Previous page</button>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Page {previewLabels.length ? safePreviewPage + 1 : 0} of {previewLabels.length ? previewPageCount : 0} · {pagePreviewLabels.length} labels shown</span>
            <button type="button" className="btn-outline" disabled={safePreviewPage >= previewPageCount - 1} onClick={() => setPreviewPage(page => Math.min(previewPageCount - 1, page + 1))}>Next page</button>
          </div>
          <button
            onClick={handlePrint}
            className="btn-primary"
            style={{ marginTop: '0.8rem', alignSelf: 'center' }}
            disabled={!previewLabels.length}
          >
            <Printer size={16} />
            <span>Print All {previewLabels.length} {previewKind === 'qr' ? 'QR Labels' : 'Barcode Labels'}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
