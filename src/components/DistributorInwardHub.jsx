// ALZINO High-Speed Distributor Inward Hub & Continuous Gun Scanner
// Automates inward stock for 20-50 units in seconds with zero manual typing

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Barcode, 
  FileText, 
  Upload, 
  Check, 
  Trash2, 
  AlertCircle, 
  Layers, 
  Plus, 
  ArrowRight, 
  Building, 
  Sparkles,
  Camera,
  CheckCircle2,
  X
} from 'lucide-react';
import { getAvailableCategories, getAvailableBrandsForCategory, saveCustomBrand } from '../utils/customTaxonomy';
import { getProductSuggestions } from '../utils/productSuggestions';
import { playDeviceBeep } from '../utils/hardwareDevices';
import CameraBarcodeScannerModal from './CameraBarcodeScannerModal';

export default function DistributorInwardHub({
  isOpen,
  onClose,
  inventory = [],
  setInventory = () => {},
  suppliers = [],
  setSuppliers = () => {},
  shopConfig = {}
}) {
  if (!isOpen) return null;

  // Active inward mode: 'gun' (continuous scanner) | 'paste' (distributor bill text parser)
  const [inwardMode, setInwardMode] = useState('gun');

  // Supplier & Invoice info
  const [supplierName, setSupplierName] = useState(suppliers[0]?.name || 'Universal Telecom Distributor');
  const [distributorBillNo, setDistributorBillNo] = useState(`DIST-${Date.now().toString().slice(-4)}`);
  const [inwardDate, setInwardDate] = useState(new Date().toISOString().split('T')[0]);

  // Common Model specs for continuous scanning batch
  const [brand, setBrand] = useState('Samsung');
  const [model, setModel] = useState('Galaxy S24 5G');
  const [ram, setRam] = useState('8GB');
  const [storage, setStorage] = useState('256GB');
  const [color, setColor] = useState('Onyx Black');
  const [category, setCategory] = useState('New Mobiles');
  const [buyPrice, setBuyPrice] = useState('64000');
  const [sellPrice, setSellPrice] = useState('74999');
  const [mrp, setMrp] = useState('79999');
  const [gstRate, setGstRate] = useState(18);
  const [warranty, setWarranty] = useState('1 Year Official Brand Warranty');
  const [rack, setRack] = useState('R-01');
  const [bin, setBin] = useState('B-01');

  // Scanning options
  const [dualImeiMode, setDualImeiMode] = useState(true);
  const [currentImeiBuffer, setCurrentImeiBuffer] = useState({ imei1: '', imei2: '' });
  const [scanInputVal, setScanInputVal] = useState('');
  const [scannedUnits, setScannedUnits] = useState([]);
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Auto-suggestions for rapid model picking
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const modelSuggestions = useMemo(() => {
    if (!model || model.trim().length < 2) return [];
    return getProductSuggestions(model, inventory, 6);
  }, [model, inventory]);

  // Paste / Text Parser state
  const [pastedInvoiceText, setPastedInvoiceText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);

  // Focus ref for continuous scanner
  const scanInputRef = useRef(null);

  useEffect(() => {
    if (inwardMode === 'gun' && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [inwardMode, scannedUnits.length, currentImeiBuffer]);

  // Handle barcode scanner gun input (fires on Enter key)
  const handleScannerKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = scanInputVal.trim();
      if (!code) return;

      playDeviceBeep('scanner');

      if (dualImeiMode) {
        if (!currentImeiBuffer.imei1) {
          // Captured IMEI 1
          setCurrentImeiBuffer({ imei1: code, imei2: '' });
          setScanInputVal('');
        } else {
          // Captured IMEI 2 -> Finalize Unit
          const newUnit = {
            id: `UNIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            unitNo: scannedUnits.length + 1,
            imei1: currentImeiBuffer.imei1,
            imei2: code,
            barcode: `ALZ-${brand.slice(0, 3).toUpperCase()}-${model.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase()}-${String(scannedUnits.length + 1).padStart(3, '0')}`,
            color: color
          };
          setScannedUnits(prev => [newUnit, ...prev]);
          setCurrentImeiBuffer({ imei1: '', imei2: '' });
          setScanInputVal('');
          playDeviceBeep('success');
        }
      } else {
        // Single IMEI mode
        const newUnit = {
          id: `UNIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          unitNo: scannedUnits.length + 1,
          imei1: code,
          imei2: '',
          barcode: `ALZ-${brand.slice(0, 3).toUpperCase()}-${model.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase()}-${String(scannedUnits.length + 1).padStart(3, '0')}`,
          color: color
        };
        setScannedUnits(prev => [newUnit, ...prev]);
        setScanInputVal('');
        playDeviceBeep('success');
      }
    }
  };

  // Fast pick from auto-suggestions
  const handleSelectSuggestion = (sug) => {
    setBrand(sug.brand || brand);
    setModel(sug.model || sug.name);
    if (sug.ram) setRam(sug.ram);
    if (sug.storage) setStorage(sug.storage);
    if (sug.color) setColor(sug.color);
    if (sug.category) setCategory(sug.category);
    if (sug.suggestedBuy) setBuyPrice(String(sug.suggestedBuy));
    if (sug.suggestedSell) setSellPrice(String(sug.suggestedSell));
    if (sug.suggestedSell) setMrp(String(sug.suggestedSell));
    setShowModelSuggestions(false);
    if (scanInputRef.current) scanInputRef.current.focus();
  };

  // Remove a scanned unit
  const handleRemoveUnit = (id) => {
    setScannedUnits(prev => prev.filter(u => u.id !== id));
  };

  // Parse pasted distributor text / invoice
  const handleParsePastedText = () => {
    if (!pastedInvoiceText.trim()) return;

    const lines = pastedInvoiceText.split('\n').map(l => l.trim()).filter(Boolean);
    const extracted = [];

    // Regex to find 15-digit IMEIs
    const imeiRegex = /\b(\d{15})\b/g;

    lines.forEach((line, idx) => {
      const imeisFound = line.match(imeiRegex) || [];
      const cleanLineWithoutImeis = line.replace(imeiRegex, '').replace(/[-/|,]/g, ' ').trim();

      if (imeisFound.length > 0) {
        extracted.push({
          id: `PARSED-${idx}-${Date.now()}`,
          name: cleanLineWithoutImeis || `${brand} ${model}`,
          brand: brand,
          imei1: imeisFound[0] || '',
          imei2: imeisFound[1] || '',
          buyPrice: parseFloat(buyPrice) || 0,
          sellPrice: parseFloat(sellPrice) || 0,
          qty: 1
        });
      }
    });

    if (extracted.length === 0) {
      alert("No 15-digit IMEIs detected in the pasted text. Please paste text containing standard 15-digit serial numbers.");
      return;
    }

    setParsedItems(extracted);
    playDeviceBeep('success');
  };

  // Commit Gun Scanned Units to Inventory in 1 Click
  const handleCommitGunInward = () => {
    if (scannedUnits.length === 0) {
      alert("Please scan at least one unit before committing.");
      return;
    }

    saveCustomBrand(brand, category);

    const fullProductName = `${brand} ${model} (${ram}/${storage} - ${color})`.trim();
    const cleanBuy = parseFloat(buyPrice) || 0;
    const cleanSell = parseFloat(sellPrice) || 0;
    const cleanMrp = parseFloat(mrp) || cleanSell;
    const cleanGst = parseFloat(gstRate) || 18;
    const totalQty = scannedUnits.length;

    // Collect all IMEIs
    const allImeis = [];
    scannedUnits.forEach(u => {
      if (u.imei1) allImeis.push(u.imei1);
      if (u.imei2) allImeis.push(u.imei2);
    });

    // Check if item already exists in inventory (same brand, model, ram, storage, color)
    const existingIndex = inventory.findIndex(i => 
      i.brand?.toLowerCase() === brand.toLowerCase() &&
      i.model?.toLowerCase() === model.toLowerCase() &&
      i.ram === ram &&
      i.storage === storage &&
      i.color?.toLowerCase() === color.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Merge into existing item
      setInventory(prev => prev.map((item, idx) => {
        if (idx === existingIndex) {
          const mergedUnits = [...(item.units || []), ...scannedUnits];
          const mergedImeis = Array.from(new Set([...(item.imeis || []), ...allImeis]));
          return {
            ...item,
            stock: item.stock + totalQty,
            buyPrice: cleanBuy || item.buyPrice,
            sellPrice: cleanSell || item.sellPrice,
            mrp: cleanMrp || item.mrp,
            units: mergedUnits,
            imeis: mergedImeis,
            receivedDate: inwardDate
          };
        }
        return item;
      }));
    } else {
      // Create new inventory item
      const newItem = {
        id: `PROD-${Date.now()}`,
        name: fullProductName,
        brand: brand,
        model: model,
        ram: ram,
        storage: storage,
        color: color,
        category: category,
        buyPrice: cleanBuy,
        sellPrice: cleanSell,
        mrp: cleanMrp,
        stock: totalQty,
        lowStockThreshold: 2,
        isGst: cleanGst > 0,
        gstRate: cleanGst,
        hsn: '851712',
        barcode: scannedUnits[0]?.barcode || `ALZ-${Date.now().toString().slice(-6)}`,
        units: scannedUnits,
        imeis: allImeis,
        warranty: warranty,
        rack: rack.toUpperCase(),
        bin: bin.toUpperCase(),
        supplier: supplierName,
        supplierBillNo: distributorBillNo,
        receivedDate: inwardDate,
        createdAt: new Date().toISOString(),
        status: 'Active'
      };

      setInventory(prev => [newItem, ...prev]);
    }

    playDeviceBeep('cash');
    alert(`✓ SUCCESS! ${totalQty} units of ${fullProductName} inwarded into store stock in 1 click!`);
    onClose();
  };

  return (
    <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1200 }}>
      <div 
        className="illoca-card animate-fade-in" 
        style={{ 
          maxWidth: '820px', 
          width: '100%', 
          maxHeight: '92vh', 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--surface-primary)', 
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
          border: '1.5px solid var(--accent-primary)'
        }}
      >
        {/* Header Banner */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.9rem 1.25rem',
          background: 'linear-gradient(135deg, #0F251E 0%, #152620 100%)',
          borderBottom: '1px solid rgba(169, 188, 92, 0.3)',
          color: '#F1EFE5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(169, 188, 92, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}>
              <Zap size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F1EFE5' }}>
                Distributor Inward Hub & Gun Scanner
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#A9BC5C' }}>
                Bulk 20-50 phone units inwarded in 30 seconds • Zero manual typing
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Mode Switcher */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setInwardMode('gun')}
                style={{
                  padding: '0.28rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: inwardMode === 'gun' ? 'var(--accent-primary)' : 'transparent',
                  color: inwardMode === 'gun' ? '#0F251E' : '#F1EFE5'
                }}
              >
                🔫 Continuous Gun Scan
              </button>
              <button
                type="button"
                onClick={() => setInwardMode('paste')}
                style={{
                  padding: '0.28rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: inwardMode === 'paste' ? 'var(--accent-primary)' : 'transparent',
                  color: inwardMode === 'paste' ? '#0F251E' : '#F1EFE5'
                }}
              >
                📋 Paste Invoice Text
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '0.25rem 0.6rem', color: '#F1EFE5' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.1rem 1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          
          {/* Supplier & Bill Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.65rem', padding: '0.65rem 0.85rem', background: 'var(--surface-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>Distributor / Supplier *</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Distributor Name"
                className="input-field"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>Purchase Bill # *</label>
              <input
                type="text"
                value={distributorBillNo}
                onChange={(e) => setDistributorBillNo(e.target.value)}
                placeholder="Bill / Challan Ref"
                className="input-field"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>Inward Date</label>
              <input
                type="date"
                value={inwardDate}
                onChange={(e) => setInwardDate(e.target.value)}
                className="input-field"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
              />
            </div>
          </div>

          {/* Model Specification Setup */}
          <div style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-primary)' }}>
                Target Model & Rates
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Type half name to auto-fill specs & prices
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 0.8fr 0.8fr 1fr', gap: '0.55rem', marginBottom: '0.55rem' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700 }}>Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 700 }}>Model Name (Auto-Suggest)</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setShowModelSuggestions(true);
                  }}
                  onFocus={() => setShowModelSuggestions(true)}
                  placeholder="e.g. S24, iPhone 16"
                  className="input-field"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', fontWeight: 700 }}
                  autoComplete="off"
                />

                {showModelSuggestions && modelSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1400,
                    background: 'var(--surface-primary)',
                    border: '1.5px solid var(--accent-primary)',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    marginTop: '2px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {modelSuggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => handleSelectSuggestion(sug)}
                        style={{
                          padding: '0.4rem 0.55rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          fontSize: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{sug.name}</span>
                        {sug.suggestedBuy > 0 && (
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>
                            Buy ₹{sug.suggestedBuy.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700 }}>RAM</label>
                <input
                  type="text"
                  value={ram}
                  onChange={(e) => setRam(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700 }}>Storage</label>
                <input
                  type="text"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700 }}>Colour</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.8fr 0.8fr', gap: '0.55rem' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700 }}>Distributor Net Rate (Buy ₹)</label>
                <input
                  type="number"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem', fontWeight: 800 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700 }}>Retail Selling Price (Sell ₹)</label>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-primary)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700 }}>Box MRP ₹</label>
                <input
                  type="number"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700 }}>Rack</label>
                <input
                  type="text"
                  value={rack}
                  onChange={(e) => setRack(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700 }}>Bin</label>
                <input
                  type="text"
                  value={bin}
                  onChange={(e) => setBin(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                />
              </div>
            </div>
          </div>

          {/* MODE A: CONTINUOUS GUN SCANNER */}
          {inwardMode === 'gun' && (
            <div style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '2px dashed var(--accent-primary)',
              background: 'rgba(169, 188, 92, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Barcode size={18} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>
                    CONTINUOUS BEEP SCANNER ACTIVE
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    background: 'var(--accent-primary)',
                    color: '#0F251E'
                  }}>
                    READY TO BEEP
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={dualImeiMode}
                      onChange={(e) => setDualImeiMode(e.target.checked)}
                    />
                    <span>Dual IMEI (IMEI 1 + IMEI 2)</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowCameraScanner(true)}
                    className="btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Camera size={12} />
                    <span>Mobile Cam</span>
                  </button>
                </div>
              </div>

              {/* Perpetual Scanning Input Bar */}
              <div style={{ position: 'relative' }}>
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInputVal}
                  onChange={(e) => setScanInputVal(e.target.value)}
                  onKeyDown={handleScannerKeyDown}
                  placeholder={
                    dualImeiMode 
                      ? (currentImeiBuffer.imei1 ? `Box Unit #${scannedUnits.length + 1} - Scan IMEI 2...` : `Box Unit #${scannedUnits.length + 1} - Scan IMEI 1 (Point gun & trigger)...`)
                      : `Box Unit #${scannedUnits.length + 1} - Scan IMEI...`
                  }
                  className="input-field"
                  style={{
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    borderColor: 'var(--accent-primary)',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxShadow: '0 0 12px rgba(169, 188, 92, 0.3)'
                  }}
                  autoFocus
                />

                {currentImeiBuffer.imei1 && (
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: 'var(--status-green)',
                    background: 'var(--status-green-bg)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    ✓ IMEI 1: {currentImeiBuffer.imei1} (Now scan IMEI 2)
                  </div>
                )}
              </div>

              {/* Scanned Units Stats & Grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--accent-primary)' }}>
                  Units Scanned: {scannedUnits.length}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Total Inward Value: ₹{(scannedUnits.length * (parseFloat(buyPrice) || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              {scannedUnits.length > 0 && (
                <div style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'var(--surface-primary)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.35rem 0.5rem' }}>#</th>
                        <th style={{ padding: '0.35rem 0.5rem' }}>IMEI 1</th>
                        <th style={{ padding: '0.35rem 0.5rem' }}>IMEI 2</th>
                        <th style={{ padding: '0.35rem 0.5rem' }}>Barcode</th>
                        <th style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedUnits.map((unit, idx) => (
                        <tr key={unit.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.35rem 0.5rem', fontWeight: 800 }}>{idx + 1}</td>
                          <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{unit.imei1}</td>
                          <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{unit.imei2 || '—'}</td>
                          <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{unit.barcode}</td>
                          <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveUnit(unit.id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--status-red)', cursor: 'pointer', padding: '0 0.3rem' }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MODE B: PASTE DISTRIBUTOR INVOICE TEXT */}
          {inwardMode === 'paste' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Paste the text, WhatsApp message, or invoice copy sent by your distributor. The AI scanner automatically detects all 15-digit serial numbers and models.
              </div>
              <textarea
                rows={5}
                value={pastedInvoiceText}
                onChange={(e) => setPastedInvoiceText(e.target.value)}
                placeholder="Paste distributor invoice text containing 15-digit IMEIs here..."
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.4 }}
              />
              <button
                type="button"
                onClick={handleParsePastedText}
                className="btn-secondary"
                style={{ alignSelf: 'flex-start', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 700 }}
              >
                ⚡ Parse IMEIs & Generate Items
              </button>

              {parsedItems.length > 0 && (
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '0.35rem 0.5rem' }}>#</th>
                        <th style={{ padding: '0.35rem 0.5rem' }}>Item</th>
                        <th style={{ padding: '0.35rem 0.5rem' }}>IMEI 1</th>
                        <th style={{ padding: '0.35rem 0.5rem' }}>IMEI 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedItems.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.35rem 0.5rem', fontWeight: 800 }}>{idx + 1}</td>
                          <td style={{ padding: '0.35rem 0.5rem' }}>{item.name}</td>
                          <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{item.imei1}</td>
                          <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{item.imei2 || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--surface-secondary)'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.45rem 1rem' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCommitGunInward}
            disabled={scannedUnits.length === 0}
            className="btn-primary"
            style={{
              padding: '0.55rem 1.5rem',
              fontSize: '0.88rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: scannedUnits.length === 0 ? 0.5 : 1,
              cursor: scannedUnits.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <CheckCircle2 size={16} />
            <span>SAVE ALL {scannedUnits.length} UNITS TO INVENTORY (1-CLICK)</span>
          </button>
        </div>
      </div>

      {/* Camera scanner fallback if no barcode gun connected */}
      {showCameraScanner && (
        <CameraBarcodeScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onScanSuccess={(detectedCode) => {
            setShowCameraScanner(false);
            setScanInputVal(detectedCode);
            handleScannerKeyDown({ key: 'Enter', preventDefault: () => {} });
          }}
          title="Mobile Camera Serial / Barcode Inward"
        />
      )}
    </div>
  );
}
