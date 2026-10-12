import React, { useState } from 'react';
import { 
  Barcode, 
  Printer, 
  Copy, 
  CheckCircle, 
  Layers, 
  Sparkles, 
  Tag,
  QrCode
} from 'lucide-react';
import { renderBarcodeSvg, renderCodeSvg } from '../utils/barcode';

export default function BarcodeGenerator({ 
  inventory, 
  selectedItemForBarcode, 
  shopConfig, 
  onPrintBarcodeSheet 
}) {
  const [selectedProductId, setSelectedProductId] = useState(
    selectedItemForBarcode ? selectedItemForBarcode.id : (inventory[0] ? inventory[0].id : '')
  );

  const [customTitle, setCustomTitle] = useState(
    selectedItemForBarcode ? selectedItemForBarcode.name : '65W SuperVOOC Fast Power Adapter'
  );
  const [customBarcode, setCustomBarcode] = useState(
    selectedItemForBarcode ? (selectedItemForBarcode.barcode || '8901234567890') : '8901234567890'
  );
  const [customPrice, setCustomPrice] = useState(
    selectedItemForBarcode ? selectedItemForBarcode.sellPrice : '1299'
  );
  const [customMrp, setCustomMrp] = useState(
    selectedItemForBarcode ? selectedItemForBarcode.mrp : '1999'
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
      setCustomTitle(prod.name);
      setCustomBarcode(prod.barcode || `ALZ-${prod.id}`);
      setCustomPrice(prod.sellPrice);
      setCustomMrp(prod.mrp || prod.sellPrice);
      if (prod.codeFormat) {
        setCodeFormat(prod.codeFormat);
      } else if (prod.barcode?.includes('QR-')) {
        setCodeFormat('qr');
      }
    }
  };

  const handlePrint = () => {
    onPrintBarcodeSheet({
      title: customTitle,
      barcode: customBarcode,
      codeFormat,
      price: customPrice,
      mrp: customMrp,
      copies: parseInt(labelCopies, 10) || 24,
      format: labelFormat,
    });
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

        <button 
          onClick={handlePrint}
          className="btn-primary"
          style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
        >
          <Printer size={15} />
          <span>Print Barcodes</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.25rem' }}>
        
        {/* Left: Configuration Form */}
        <div className="illoca-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Barcode & Label Settings</h3>

          {/* Quick Select from Inventory */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Load from Existing Stock Item:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="input-field"
            >
              <option value="">-- Choose Stock Item --</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.brand} - {item.name} (₹{item.sellPrice})
                </option>
              ))}
            </select>
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
              dangerouslySetInnerHTML={{ __html: renderCodeSvg(customBarcode, codeFormat, 220, codeFormat === 'qr' ? 100 : 55, true) }} 
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

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px' }}>
            Ready to print on adhesive barcode labels. Scannable by any standard USB/Bluetooth handheld barcode reader.
          </p>

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
