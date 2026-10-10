import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Barcode, 
  TrendingUp, 
  Smartphone,
  CheckCircle,
  Copy,
  Check,
  MapPin,
  ArrowRightLeft,
  Globe,
  ShoppingCart,
  Grid,
  List,
  SlidersHorizontal,
  X,
  Tag,
  Shield,
  Layers,
  Sparkles,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import MarketPriceCompareModal from './MarketPriceCompareModal';

const standardBrands = [
  'Apple', 
  'Samsung', 
  'OnePlus', 
  'Vivo', 
  'Oppo', 
  'Realme', 
  'Xiaomi / Redmi', 
  'Motorola', 
  'Google Pixel', 
  'iQOO',
  'Nothing',
  'boAt', 
  'Noise', 
  'Universal'
];

export default function InventoryManager({ 
  inventory, 
  setInventory, 
  role, 
  onSelectBarcode,
  shopConfig,
  onQuickBill
}) {
  // View mode: 'cards' (Fast-Finder Visual Cards) | 'table' (Clean Data Grid)
  const [viewMode, setViewMode] = useState('cards');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in-stock' | 'low' | 'out'
  const [gstFilter, setGstFilter] = useState('all'); // 'all' | 'gst' | 'non-gst'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name' | 'stock-asc' | 'stock-desc' | 'price-asc' | 'price-desc' | 'margin'
  
  // Toast notification for copy/actions
  const [toastMessage, setToastMessage] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isCustomBrand, setIsCustomBrand] = useState(false);

  // 1-Click Online Price Compare Modal state
  const [compareProduct, setCompareProduct] = useState(null);

  // Stock Transfer (Rack/Bin Move) state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [transferFromLocationIndex, setTransferFromLocationIndex] = useState(0);
  const [transferToRack, setTransferToRack] = useState('R-02');
  const [transferToBin, setTransferToBin] = useState('B-01');
  const [transferQty, setTransferQty] = useState(1);

  // Form state for Add/Edit
  const [formData, setFormData] = useState({
    category: 'New Mobiles',
    brand: '',
    name: '',
    description: '',
    isGst: true,
    hsn: '851712',
    gstRate: 18,
    buyPrice: '',
    sellPrice: '',
    mrp: '',
    stock: 1,
    lowStockThreshold: 2,
    rack: 'R-01',
    bin: 'B-01',
    barcode: '',
    imeisText: '',
    warranty: '1 Year Brand Warranty',
  });

  const categories = ['All', 'New Mobiles', 'Used Mobiles', 'Mobile Accessories', 'Home Appliances', 'Spare Parts'];

  // Copy to clipboard helper with toast
  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setToastMessage(`✓ Copied ${label}: ${text}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Quick Bill action (sends product straight to POS billing cart)
  const handleSendToPos = (item) => {
    if (item.stock <= 0) {
      setToastMessage(`⚠️ "${item.name}" is currently Out of Stock!`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (onQuickBill) {
      onQuickBill(item);
    }
  };

  // Live Inventory Metrics for Counter
  const totalProducts = inventory.length;
  const inStockProducts = inventory.filter(i => i.stock > (i.lowStockThreshold || 2)).length;
  const lowStockProducts = inventory.filter(i => i.stock > 0 && i.stock <= (i.lowStockThreshold || 2)).length;
  const outOfStockProducts = inventory.filter(i => i.stock === 0).length;
  const totalStockUnits = inventory.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);

  // Available brands in inventory
  const availableBrands = useMemo(() => {
    const brandsSet = new Set();
    inventory.forEach(item => {
      if (item.brand) brandsSet.add(item.brand);
    });
    return Array.from(brandsSet);
  }, [inventory]);

  // Smart Filter and Sort products
  const filteredProducts = useMemo(() => {
    return inventory.filter(item => {
      // Category match
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;

      // Brand match
      const matchesBrand = brandFilter === 'All' || item.brand === brandFilter;

      // GST filter match
      const isItemGst = (item.gstRate && item.gstRate > 0) || item.isGst;
      const matchesGst = 
        gstFilter === 'all' || 
        (gstFilter === 'gst' && isItemGst) || 
        (gstFilter === 'non-gst' && !isItemGst);

      // Stock filter match
      const isLow = item.stock > 0 && item.stock <= (item.lowStockThreshold || 2);
      const isOut = item.stock === 0;
      const isInStock = item.stock > (item.lowStockThreshold || 2);

      const matchesStock = 
        stockFilter === 'all' ||
        (stockFilter === 'in-stock' && isInStock) ||
        (stockFilter === 'low' && isLow) ||
        (stockFilter === 'out' && isOut);

      // Multi-term keyword search
      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesCategory && matchesBrand && matchesGst && matchesStock;

      const words = q.split(/\s+/).filter(Boolean);
      const haystack = [
        item.name || '',
        item.brand || '',
        item.category || '',
        item.description || '',
        item.barcode || '',
        item.rack || '',
        item.bin || '',
        ...(item.imeis || [])
      ].join(' ').toLowerCase();

      const matchesAllWords = words.every(word => haystack.includes(word));
      return matchesCategory && matchesBrand && matchesGst && matchesStock && matchesAllWords;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock-asc') return a.stock - b.stock;
      if (sortBy === 'stock-desc') return b.stock - a.stock;
      if (sortBy === 'price-asc') return a.sellPrice - b.sellPrice;
      if (sortBy === 'price-desc') return b.sellPrice - a.sellPrice;
      if (sortBy === 'margin') return (b.sellPrice - b.buyPrice) - (a.sellPrice - a.buyPrice);
      return 0;
    });
  }, [inventory, categoryFilter, brandFilter, gstFilter, stockFilter, searchTerm, sortBy]);

  const openAddModal = () => {
    setEditingItem(null);
    setIsCustomBrand(false);
    setFormData({
      category: 'Mobile Accessories',
      brand: 'Universal',
      name: '',
      description: '',
      isGst: true,
      hsn: '392690',
      gstRate: 18,
      buyPrice: '',
      sellPrice: '',
      mrp: '',
      stock: 5,
      lowStockThreshold: 2,
      rack: 'R-01',
      bin: 'B-01',
      barcode: `ALZ-${Date.now().toString().slice(-6)}`,
      imeisText: '',
      warranty: 'Standard Warranty',
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsCustomBrand(Boolean(item.brand && !standardBrands.includes(item.brand)));
    const isItemGst = (item.gstRate && item.gstRate > 0) || item.isGst;
    setFormData({
      category: item.category,
      brand: item.brand || 'Apple',
      name: item.name,
      description: item.description || '',
      isGst: isItemGst,
      hsn: item.hsn || '851712',
      gstRate: item.gstRate !== undefined ? item.gstRate : 18,
      buyPrice: item.buyPrice,
      sellPrice: item.sellPrice,
      mrp: item.mrp || item.sellPrice,
      stock: item.stock,
      lowStockThreshold: item.lowStockThreshold || 2,
      rack: item.rack || (item.locations?.[0]?.rack) || 'R-01',
      bin: item.bin || (item.locations?.[0]?.bin) || 'B-01',
      barcode: item.barcode || '',
      imeisText: (item.imeis || []).join('\n'),
      warranty: item.warranty || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id, name) => {
    if (confirm(`Delete "${name}" from ALZINO inventory? This cannot be undone.`)) {
      setInventory(prev => prev.filter(i => i.id !== id));
    }
  };

  // Stock Transfer Modal Opener
  const handleOpenTransfer = (item) => {
    setTransferItem(item);
    setTransferFromLocationIndex(0);
    setTransferToRack('R-02');
    setTransferToBin('B-01');
    setTransferQty(1);
    setShowTransferModal(true);
  };

  // Execute Stock Transfer between Rack / Bin
  const handleExecuteTransfer = () => {
    if (!transferItem) return;
    const currentLocs = transferItem.locations && transferItem.locations.length > 0 
      ? JSON.parse(JSON.stringify(transferItem.locations)) 
      : [{ rack: transferItem.rack || 'R-01', bin: transferItem.bin || 'B-01', qty: transferItem.stock }];

    const fromLoc = currentLocs[transferFromLocationIndex];
    if (!fromLoc || fromLoc.qty < transferQty) {
      alert(`Cannot transfer ${transferQty} pcs. Selected source location only has ${fromLoc ? fromLoc.qty : 0} pcs.`);
      return;
    }

    if (!transferToRack.trim() || !transferToBin.trim()) {
      alert("Please specify destination Rack and Bin");
      return;
    }

    // Deduct from source
    fromLoc.qty -= transferQty;

    // Add to target
    const targetIdx = currentLocs.findIndex(
      l => l.rack?.toUpperCase() === transferToRack.trim().toUpperCase() && l.bin?.toUpperCase() === transferToBin.trim().toUpperCase()
    );

    if (targetIdx >= 0) {
      currentLocs[targetIdx].qty += transferQty;
    } else {
      currentLocs.push({
        rack: transferToRack.trim().toUpperCase(),
        bin: transferToBin.trim().toUpperCase(),
        qty: transferQty
      });
    }

    const finalLocs = currentLocs.filter(l => l.qty > 0);

    setInventory(prev => prev.map(p => {
      if (p.id === transferItem.id) {
        return {
          ...p,
          rack: finalLocs[0]?.rack || transferToRack.trim().toUpperCase(),
          bin: finalLocs[0]?.bin || transferToBin.trim().toUpperCase(),
          locations: finalLocs
        };
      }
      return p;
    }));

    setShowTransferModal(false);
    setToastMessage(`✓ Transferred ${transferQty} pcs of ${transferItem.name} to Rack: ${transferToRack.toUpperCase()} / Bin: ${transferToBin.toUpperCase()}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sellPrice) {
      alert("Please provide at least product name and selling price.");
      return;
    }

    const imeisArray = formData.imeisText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const calculatedStock = imeisArray.length > 0 ? imeisArray.length : parseInt(formData.stock, 10) || 0;
    const finalGstRate = formData.isGst ? (parseFloat(formData.gstRate) || 18) : 0;
    const rackVal = formData.rack.trim().toUpperCase() || 'R-01';
    const binVal = formData.bin.trim().toUpperCase() || 'B-01';

    if (editingItem) {
      setInventory(prev => prev.map(item => {
        if (item.id === editingItem.id) {
          const existingLocs = item.locations || [];
          const updatedLocs = existingLocs.length > 0 
            ? existingLocs.map((loc, idx) => idx === 0 ? { ...loc, rack: rackVal, bin: binVal, qty: calculatedStock } : loc)
            : [{ rack: rackVal, bin: binVal, qty: calculatedStock }];

          return {
            ...item,
            category: formData.category,
            brand: formData.brand,
            name: formData.name,
            description: formData.description.trim(),
            isGst: formData.isGst,
            hsn: formData.hsn,
            gstRate: finalGstRate,
            buyPrice: parseFloat(formData.buyPrice) || 0,
            sellPrice: parseFloat(formData.sellPrice) || 0,
            mrp: parseFloat(formData.mrp) || parseFloat(formData.sellPrice),
            stock: calculatedStock,
            lowStockThreshold: parseInt(formData.lowStockThreshold, 10) || 2,
            rack: rackVal,
            bin: binVal,
            locations: updatedLocs,
            barcode: formData.barcode,
            imeis: imeisArray,
            warranty: formData.warranty,
          };
        }
        return item;
      }));
    } else {
      const newItem = {
        id: `PROD-${Date.now().toString().slice(-4)}`,
        category: formData.category,
        brand: formData.brand,
        name: formData.name,
        description: formData.description.trim(),
        isGst: formData.isGst,
        hsn: formData.hsn,
        gstRate: finalGstRate,
        buyPrice: parseFloat(formData.buyPrice) || 0,
        sellPrice: parseFloat(formData.sellPrice) || 0,
        mrp: parseFloat(formData.mrp) || parseFloat(formData.sellPrice),
        stock: calculatedStock,
        lowStockThreshold: parseInt(formData.lowStockThreshold, 10) || 2,
        rack: rackVal,
        bin: binVal,
        locations: [{ rack: rackVal, bin: binVal, qty: calculatedStock }],
        barcode: formData.barcode || `ALZ-${Date.now().toString().slice(-6)}`,
        imeis: imeisArray,
        warranty: formData.warranty,
        status: 'Active',
      };
      setInventory(prev => [newItem, ...prev]);
    }

    setShowModal(false);
  };

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '4.5rem',
          right: '1.5rem',
          zIndex: 9999,
          background: '#0F251E',
          color: '#A9BC5C',
          border: '1.5px solid #A9BC5C',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 1.15rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.86rem',
          fontWeight: 700,
          fontFamily: 'var(--font-heading)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header: Title + View Switcher + Primary Actions */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '0.75rem',
        background: 'var(--surface-primary)',
        padding: '0.85rem 1.15rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(12, 91, 67, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)',
            border: '1px solid rgba(12, 91, 67, 0.2)'
          }}>
            <Package size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-heading)' }}>
                {role === 'cashier' ? '⚡ Stock & Price Fast-Lookup' : 'Stock & Price Management'}
              </h1>
              <span className="mono-tag" style={{ 
                background: role === 'cashier' ? '#FEF08A' : 'var(--status-green-bg)',
                color: role === 'cashier' ? '#854D0E' : 'var(--status-green)',
                fontWeight: 700,
                fontSize: '0.68rem',
                padding: '0.15rem 0.45rem'
              }}>
                {role === 'cashier' ? 'Cashier Mode' : 'Admin'}
              </span>
            </div>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {role === 'cashier' 
                ? 'Check instant selling price, stock counts & shelf rack locations for walk-in customers.'
                : 'Live warehouse inventory, buying rates, profit margins & multi-bin stock movements.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* View Mode Toggle: Cards vs Table */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-main)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: viewMode === 'cards' ? 700 : 500,
                background: viewMode === 'cards' ? 'var(--surface-primary)' : 'transparent',
                color: viewMode === 'cards' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
              title="Fast-Finder Visual Cards View"
            >
              <Grid size={14} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: viewMode === 'table' ? 700 : 500,
                background: viewMode === 'table' ? 'var(--surface-primary)' : 'transparent',
                color: viewMode === 'table' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
              title="Compact Spreadsheet Table View"
            >
              <List size={14} />
              <span>Table</span>
            </button>
          </div>

          {/* Admin Primary Actions */}
          {role === 'admin' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={() => {
                  if (inventory.length > 0) handleOpenTransfer(inventory[0]);
                }}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ArrowRightLeft size={14} />
                <span>Move Rack/Bin</span>
              </button>

              <button 
                onClick={openAddModal}
                className="btn-primary"
                style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={15} />
                <span>Add Product</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="mono-tag" style={{
                background: 'rgba(12, 91, 67, 0.08)',
                color: 'var(--accent-primary)',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Zap size={13} color="var(--accent-primary)" />
                <span>Barcode Scanner Active</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* High-Utility KPI Quick-Filter Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem'
      }}>
        {/* Metric 1: Total Models */}
        <div 
          onClick={() => setStockFilter('all')}
          style={{
            background: 'var(--surface-primary)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${stockFilter === 'all' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            boxShadow: stockFilter === 'all' ? '0 2px 8px rgba(12, 91, 67, 0.12)' : 'none'
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Catalog
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {totalProducts}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {totalStockUnits} units in store
            </span>
          </div>
        </div>

        {/* Metric 2: In Stock Ready */}
        <div 
          onClick={() => setStockFilter(stockFilter === 'in-stock' ? 'all' : 'in-stock')}
          style={{
            background: 'var(--surface-primary)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${stockFilter === 'in-stock' ? 'var(--status-green)' : 'var(--border-color)'}`,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            boxShadow: stockFilter === 'in-stock' ? '0 2px 8px rgba(31, 110, 72, 0.15)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--status-green)', fontWeight: 700, textTransform: 'uppercase' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-green)' }} />
            In Stock Ready
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--status-green)' }}>
              {inStockProducts}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {stockFilter === 'in-stock' ? '✓ Filtered' : 'Click to filter'}
            </span>
          </div>
        </div>

        {/* Metric 3: Low Stock Warning */}
        <div 
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          style={{
            background: 'var(--surface-primary)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${stockFilter === 'low' ? 'var(--status-amber)' : 'var(--border-color)'}`,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            boxShadow: stockFilter === 'low' ? '0 2px 8px rgba(172, 124, 32, 0.15)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--status-amber)', fontWeight: 700, textTransform: 'uppercase' }}>
            <AlertTriangle size={12} color="var(--status-amber)" />
            Low Stock Alert
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--status-amber)' }}>
              {lowStockProducts}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {stockFilter === 'low' ? '✓ Filtered' : 'Needs reorder'}
            </span>
          </div>
        </div>

        {/* Metric 4: Out of Stock */}
        <div 
          onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
          style={{
            background: 'var(--surface-primary)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${stockFilter === 'out' ? 'var(--status-red)' : 'var(--border-color)'}`,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            boxShadow: stockFilter === 'out' ? '0 2px 8px rgba(192, 70, 57, 0.15)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--status-red)', fontWeight: 700, textTransform: 'uppercase' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-red)' }} />
            Out of Stock
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--status-red)' }}>
              {outOfStockProducts}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {stockFilter === 'out' ? '✓ Filtered' : 'Sold out'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Controls Card: Search + Brand Quick-Chips + Categories + Sort */}
      <div style={{
        background: 'var(--surface-primary)',
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {/* Row 1: Hero Search Box & Sort Selection */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by product name, brand, model, barcode or IMEI (e.g. 'iPhone 15', 'pouch', '89012')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{
                paddingLeft: '2.3rem',
                paddingRight: searchTerm ? '2.5rem' : '1rem',
                height: '38px',
                fontSize: '0.86rem',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border-color)',
                width: '100%'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
                title="Clear Search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
              style={{ width: '160px', height: '38px', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
            >
              <option value="default">Default Catalog</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock-desc">Stock: High to Low</option>
              <option value="stock-asc">Stock: Low to High</option>
              <option value="name">Name (A-Z)</option>
              {role === 'admin' && <option value="margin">Profit Margin (Highest)</option>}
            </select>
          </div>
        </div>

        {/* Row 2: Category Tabs & Brand Chips */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '0.6rem', 
          flexWrap: 'wrap',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '0.65rem'
        }}>
          {/* Category Chips */}
          <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '2px' }}>
            {categories.map(cat => {
              const isActive = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.74rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? 'var(--accent-primary)' : 'var(--bg-main)',
                    color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                    border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    transition: 'var(--transition-smooth)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Quick Brand Filter Dropdown / Strip */}
          {availableBrands.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>BRAND:</span>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="input-field"
                style={{ height: '30px', fontSize: '0.74rem', padding: '0.15rem 0.5rem', minWidth: '120px' }}
              >
                <option value="All">All Brands</option>
                {availableBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Visual Cards Mode vs Table Mode */}
      {filteredProducts.length === 0 ? (
        /* Empty State */
        <div style={{
          background: 'var(--surface-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1.5px dashed var(--border-color)',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--bg-main)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)'
          }}>
            <Package size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.35rem 0' }}>
              No Products Found
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: 0 }}>
              {searchTerm 
                ? `No items match the search query "${searchTerm}". Try searching by another keyword, brand, or model.`
                : 'Your catalog is currently empty. Add products to enable fast price & stock lookup at the counter.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
              >
                Clear Search
              </button>
            )}
            {role === 'admin' && (
              <button 
                onClick={openAddModal} 
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
              >
                <Plus size={15} />
                <span>Add First Product</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* FAST-FINDER VISUAL CARDS GRID */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem'
        }}>
          {filteredProducts.map(item => {
            const isLow = item.stock > 0 && item.stock <= (item.lowStockThreshold || 2);
            const isOut = item.stock === 0;
            const isInStock = item.stock > (item.lowStockThreshold || 2);
            const savings = (item.mrp && item.mrp > item.sellPrice) ? item.mrp - item.sellPrice : 0;
            const savingsPct = item.mrp && item.mrp > item.sellPrice ? Math.round((savings / item.mrp) * 100) : 0;
            const isItemGst = (item.gstRate && item.gstRate > 0) || item.isGst;
            const marginAmt = item.sellPrice - item.buyPrice;
            const marginPct = item.sellPrice > 0 ? Math.round((marginAmt / item.sellPrice) * 100) : 0;

            return (
              <div 
                key={item.id}
                style={{
                  background: 'var(--surface-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: isOut ? '1.5px solid rgba(192, 70, 57, 0.3)' : isLow ? '1.5px solid rgba(172, 124, 32, 0.35)' : '1px solid var(--border-color)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  transition: 'var(--transition-smooth)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Out of Stock banner overlay if 0 */}
                {isOut && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '-32px',
                    transform: 'rotate(45deg)',
                    background: 'var(--status-red)',
                    color: '#FFFFFF',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 30px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}>
                    OUT OF STOCK
                  </div>
                )}

                {/* Top Strip: Brand & Stock Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(12, 91, 67, 0.08)',
                      color: 'var(--accent-primary)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      textTransform: 'uppercase'
                    }}>
                      {item.brand || 'UNIVERSAL'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {item.category}
                    </span>
                  </div>

                  {/* Stock Status Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    background: isOut 
                      ? 'var(--status-red-bg)' 
                      : isLow 
                        ? 'var(--status-amber-bg)' 
                        : 'var(--status-green-bg)',
                    color: isOut 
                      ? 'var(--status-red)' 
                      : isLow 
                        ? 'var(--status-amber)' 
                        : 'var(--status-green)',
                    border: `1px solid ${isOut ? 'rgba(192, 70, 57, 0.3)' : isLow ? 'rgba(172, 124, 32, 0.3)' : 'rgba(31, 110, 72, 0.3)'}`
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isOut ? 'var(--status-red)' : isLow ? 'var(--status-amber)' : 'var(--status-green)'
                    }} />
                    <span>
                      {isOut ? '0 Units (Sold Out)' : isLow ? `Only ${item.stock} left!` : `${item.stock} Units In Stock`}
                    </span>
                  </div>
                </div>

                {/* Product Name */}
                <div>
                  <h3 style={{ 
                    fontSize: '1.02rem', 
                    fontWeight: 700, 
                    margin: 0, 
                    lineHeight: 1.3,
                    color: 'var(--text-primary)'
                  }}>
                    {item.name}
                  </h3>
                </div>

                {/* HERO PRICE SECTION: Big Bold Selling Price + Savings */}
                <div style={{
                  background: 'var(--bg-main)',
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Counter Selling Rate
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.1rem' }}>
                      <span style={{
                        fontSize: '1.45rem',
                        fontWeight: 900,
                        fontFamily: 'var(--font-heading)',
                        color: 'var(--accent-primary)',
                        letterSpacing: '-0.02em'
                      }}>
                        ₹{item.sellPrice.toLocaleString()}
                      </span>
                      {item.mrp && item.mrp > item.sellPrice && (
                        <span style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          textDecoration: 'line-through'
                        }}>
                          ₹{item.mrp.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                    {savings > 0 ? (
                      <span style={{
                        background: 'var(--status-green-bg)',
                        color: 'var(--status-green)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-pill)',
                        border: '1px solid rgba(31, 110, 72, 0.25)'
                      }}>
                        Save ₹{savings.toLocaleString()} ({savingsPct}%)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        Net Rate
                      </span>
                    )}

                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {isItemGst ? `✓ Incl. ${item.gstRate}% GST` : 'Non-GST (0%)'}
                    </span>
                  </div>
                </div>

                {/* Warehouse Shelf Location & Identifier */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.76rem'
                }}>
                  {/* Location Chip */}
                  <div style={{
                    background: 'rgba(32, 112, 150, 0.08)',
                    border: '1px solid rgba(32, 112, 150, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.4rem 0.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.15rem'
                  }}>
                    <span style={{ fontSize: '0.64rem', color: 'var(--status-blue)', fontWeight: 700, textTransform: 'uppercase' }}>
                      📍 Shelf Location
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--status-blue)', fontFamily: 'var(--font-mono)' }}>
                      Rack {item.rack || 'R-01'} · Bin {item.bin || 'B-01'}
                    </span>
                  </div>

                  {/* Barcode / IMEI with 1-Click Copy */}
                  <div style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.4rem 0.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.15rem',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {item.imeis && item.imeis.length > 0 ? '📱 IMEI Serial' : '🏷️ Barcode'}
                      </span>
                      <button
                        onClick={() => handleCopy(item.imeis && item.imeis.length > 0 ? item.imeis[0] : item.barcode, 'Code')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--accent-primary)',
                          cursor: 'pointer'
                        }}
                        title="Copy to clipboard"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                    <span style={{ 
                      fontWeight: 700, 
                      color: 'var(--text-secondary)', 
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.imeis && item.imeis.length > 0 ? item.imeis[0] : (item.barcode || '—')}
                    </span>
                  </div>
                </div>

                {/* Admin Confidential Buy Price & Margin */}
                {role === 'admin' && (
                  <div style={{
                    background: 'rgba(12, 91, 67, 0.04)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.4rem 0.6rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.72rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Buy Rate: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{item.buyPrice.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Profit: </span>
                      <strong style={{ color: 'var(--status-green)', fontFamily: 'var(--font-mono)' }}>
                        ₹{marginAmt.toLocaleString()} ({marginPct}%)
                      </strong>
                    </div>
                  </div>
                )}

                {/* Primary Counter Actions (Useful interactive buttons) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '0.75rem',
                  marginTop: 'auto'
                }}>
                  {/* #1 HIGH UTILITY ACTION: Bill at Counter (Sends item directly to POS Billing) */}
                  <button
                    onClick={() => handleSendToPos(item)}
                    disabled={isOut}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isOut ? 'var(--bg-main)' : 'var(--accent-primary)',
                      color: isOut ? 'var(--text-muted)' : '#FFFFFF',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: isOut ? 'not-allowed' : 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                    title={isOut ? 'Cannot bill: Out of stock' : 'Send directly to POS Billing Counter'}
                  >
                    <ShoppingCart size={14} />
                    <span>Bill at POS</span>
                  </button>

                  {/* #2 Online Market Price Compare Button */}
                  {(item.category === 'New Mobiles' || item.category === 'Used Mobiles' || item.marketComparison) && (
                    <button
                      onClick={() => setCompareProduct(item)}
                      className="btn-secondary"
                      style={{ padding: '0.5rem 0.6rem', color: 'var(--accent-primary)', borderColor: 'var(--border-color)' }}
                      title="1-Click Online Compare (Amazon vs Flipkart vs Store)"
                    >
                      <Globe size={14} />
                    </button>
                  )}

                  {/* #3 Barcode Print Button */}
                  <button
                    onClick={() => onSelectBarcode && onSelectBarcode(item)}
                    className="btn-secondary"
                    style={{ padding: '0.5rem 0.6rem' }}
                    title="Print Barcode Sticker"
                  >
                    <Barcode size={14} />
                  </button>

                  {/* Admin Only Actions: Edit & Delete */}
                  {role === 'admin' && (
                    <>
                      <button
                        onClick={() => openEditModal(item)}
                        className="btn-secondary"
                        style={{ padding: '0.5rem 0.6rem' }}
                        title="Edit Item Details"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="btn-secondary"
                        style={{ padding: '0.5rem 0.6rem', color: 'var(--status-red)' }}
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* STREAMLINED TABLE SPREADSHEET MODE */
        <div style={{
          background: 'var(--surface-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.9rem' }}>Product & Brand</th>
                <th style={{ padding: '0.75rem 0.9rem' }}>Stock Status</th>
                <th style={{ padding: '0.75rem 0.9rem' }}>Shelf Location</th>
                <th style={{ padding: '0.75rem 0.9rem' }}>Selling Price & MRP</th>
                <th style={{ padding: '0.75rem 0.9rem' }}>Identifier (Barcode / IMEI)</th>
                {role === 'admin' && <th style={{ padding: '0.75rem 0.9rem' }}>Buy Cost & Margin</th>}
                <th style={{ padding: '0.75rem 0.9rem', textAlign: 'right' }}>Counter Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(item => {
                const isLow = item.stock > 0 && item.stock <= (item.lowStockThreshold || 2);
                const isOut = item.stock === 0;
                const savings = (item.mrp && item.mrp > item.sellPrice) ? item.mrp - item.sellPrice : 0;
                const marginAmt = item.sellPrice - item.buyPrice;
                const marginPct = item.sellPrice > 0 ? Math.round((marginAmt / item.sellPrice) * 100) : 0;

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                    {/* Product & Brand */}
                    <td style={{ padding: '0.75rem 0.9rem', maxWidth: '280px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.15rem' }}>
                        <span className="mono-tag" style={{ fontSize: '0.66rem', padding: '0.05rem 0.35rem' }}>
                          {item.brand || 'Universal'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {item.category}
                        </span>
                      </div>
                    </td>

                    {/* Stock Status */}
                    <td style={{ padding: '0.75rem 0.9rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: isOut ? 'var(--status-red)' : isLow ? 'var(--status-amber)' : 'var(--status-green)'
                        }} />
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color: isOut ? 'var(--status-red)' : isLow ? 'var(--status-amber)' : 'var(--status-green)'
                        }}>
                          {item.stock} {isOut ? '(Out)' : isLow ? '(Low)' : 'pcs'}
                        </span>
                      </div>
                    </td>

                    {/* Shelf Location */}
                    <td style={{ padding: '0.75rem 0.9rem' }}>
                      <span className="mono-tag" style={{
                        background: 'rgba(32, 112, 150, 0.1)',
                        color: 'var(--status-blue)',
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}>
                        📍 {item.rack || 'R-01'} / {item.bin || 'B-01'}
                      </span>
                    </td>

                    {/* Selling Price & MRP */}
                    <td style={{ padding: '0.75rem 0.9rem' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.98rem', color: 'var(--accent-primary)' }}>
                        ₹{item.sellPrice.toLocaleString()}
                      </div>
                      {item.mrp && item.mrp > item.sellPrice && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          MRP: ₹{item.mrp.toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* Identifier */}
                    <td style={{ padding: '0.75rem 0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {item.imeis && item.imeis.length > 0 ? item.imeis[0] : (item.barcode || '—')}
                        </span>
                        <button
                          onClick={() => handleCopy(item.imeis && item.imeis.length > 0 ? item.imeis[0] : item.barcode, 'Code')}
                          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-primary)', cursor: 'pointer' }}
                          title="Copy"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Buy Cost & Margin (Admin only) */}
                    {role === 'admin' && (
                      <td style={{ padding: '0.75rem 0.9rem', fontFamily: 'var(--font-mono)' }}>
                        <div>₹{item.buyPrice.toLocaleString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--status-green)', fontWeight: 700 }}>
                          +₹{marginAmt.toLocaleString()} ({marginPct}%)
                        </div>
                      </td>
                    )}

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 0.9rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleSendToPos(item)}
                          disabled={isOut}
                          className="btn-primary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Bill at POS"
                        >
                          <ShoppingCart size={13} />
                          <span>Bill</span>
                        </button>

                        {(item.category === 'New Mobiles' || item.category === 'Used Mobiles' || item.marketComparison) && (
                          <button
                            onClick={() => setCompareProduct(item)}
                            className="btn-secondary"
                            style={{ padding: '0.3rem 0.5rem' }}
                            title="Online Price Compare"
                          >
                            <Globe size={13} color="var(--accent-primary)" />
                          </button>
                        )}

                        <button
                          onClick={() => onSelectBarcode && onSelectBarcode(item)}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.5rem' }}
                          title="Print Barcode"
                        >
                          <Barcode size={13} />
                        </button>

                        {role === 'admin' && (
                          <>
                            <button
                              onClick={() => openEditModal(item)}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.5rem' }}
                              title="Edit"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', color: 'var(--status-red)' }}
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL (Admin) */}
      {showModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1100 }}>
          <form onSubmit={handleSave} className="illoca-card animate-fade-in" style={{ maxWidth: '640px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {editingItem ? 'Edit Product Details' : 'Add New Inventory Product'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field"
                >
                  <option value="New Mobiles">New Mobiles</option>
                  <option value="Used Mobiles">Used Mobiles</option>
                  <option value="Mobile Accessories">Mobile Accessories</option>
                  <option value="Home Appliances">Home Appliances</option>
                  <option value="Spare Parts">Spare Parts</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Brand *</label>
                <select
                  value={standardBrands.includes(formData.brand) ? formData.brand : 'Other'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setIsCustomBrand(true);
                      setFormData({ ...formData, brand: '' });
                    } else {
                      setIsCustomBrand(false);
                      setFormData({ ...formData, brand: val });
                    }
                  }}
                  className="input-field"
                  style={{ marginBottom: (isCustomBrand || !standardBrands.includes(formData.brand)) ? '0.35rem' : '0' }}
                >
                  {standardBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Other">Other (Add Custom Brand)</option>
                </select>

                {(isCustomBrand || !standardBrands.includes(formData.brand)) && (
                  <input
                    type="text"
                    placeholder="Enter custom brand name..."
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                    className="input-field animate-fade-in"
                    style={{ borderColor: 'var(--accent-primary)', fontSize: '0.85rem' }}
                    autoFocus
                  />
                )}
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Product Title / Model Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apple iPhone 15 (128GB - Black)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="input-field"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Product Description & Keywords:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 128GB Black A16 Bionic 48MP USB-C fast charging..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Tax Class *</label>
                <select
                  value={formData.isGst ? 'gst' : 'non-gst'}
                  onChange={(e) => setFormData({ ...formData, isGst: e.target.value === 'gst' })}
                  className="input-field"
                >
                  <option value="gst">GST Applicable Product</option>
                  <option value="non-gst">Non-GST / Tax Exempt (0%)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>GST Rate (%)</label>
                <select
                  value={formData.isGst ? formData.gstRate : 0}
                  disabled={!formData.isGst}
                  onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) })}
                  className="input-field"
                  style={{ opacity: formData.isGst ? 1 : 0.5 }}
                >
                  <option value={18}>18% (Standard Electronics)</option>
                  <option value={12}>12%</option>
                  <option value={28}>28%</option>
                  <option value={5}>5%</option>
                  <option value={0}>0% (Nil / Exempt)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Cost / Buying Price ₹ *</label>
                <input
                  type="number"
                  placeholder="Cost Price"
                  value={formData.buyPrice}
                  onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Selling Price ₹ *</label>
                <input
                  type="number"
                  placeholder="Selling Price"
                  value={formData.sellPrice}
                  onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                  required
                  className="input-field"
                  style={{ fontWeight: 700, color: 'var(--accent-primary)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Box MRP ₹</label>
                <input
                  type="number"
                  placeholder="Box MRP"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Stock Quantity (Units)</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Low Stock Alert Limit</label>
                <input
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Warehouse Rack No *</label>
                <input
                  type="text"
                  placeholder="e.g. R-01, R-02"
                  value={formData.rack}
                  onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                  className="input-field"
                  style={{ textTransform: 'uppercase', fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Warehouse Bin / Shelf No *</label>
                <input
                  type="text"
                  placeholder="e.g. B-01, B-02"
                  value={formData.bin}
                  onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                  className="input-field"
                  style={{ textTransform: 'uppercase', fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Barcode / EAN</label>
                <input
                  type="text"
                  placeholder="Scan or auto-generate"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="input-field"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>HSN Code</label>
                <input
                  type="text"
                  placeholder="e.g. 851712"
                  value={formData.hsn}
                  onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                  className="input-field"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Warranty Details</label>
                <input
                  type="text"
                  placeholder="e.g. 1 Year Official Brand Warranty"
                  value={formData.warranty}
                  onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  IMEI / Serial Numbers (One per line for mobiles/appliances):
                </label>
                <textarea
                  rows={2}
                  placeholder="Paste or scan IMEIs (one per line):&#10;358249110294821&#10;358249110294822"
                  value={formData.imeisText}
                  onChange={(e) => setFormData({ ...formData, imeisText: e.target.value })}
                  className="input-field"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STOCK TRANSFER MODAL (Rack/Bin Move) */}
      {showTransferModal && transferItem && (
        <div className="modal-backdrop no-print" style={{ zIndex: 1100 }}>
          <div className="modal-dialog" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowRightLeft size={20} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Stock Shelf Transfer (Rack / Bin Move)
                </h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{transferItem.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Brand: {transferItem.brand} • Total Stock: {transferItem.stock} pcs</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="input-label">From Current Source Location:</label>
                <select
                  value={transferFromLocationIndex}
                  onChange={(e) => setTransferFromLocationIndex(Number(e.target.value))}
                  className="input-field"
                >
                  {(transferItem.locations || [{ rack: transferItem.rack || 'R-01', bin: transferItem.bin || 'B-01', qty: transferItem.stock }]).map((loc, idx) => (
                    <option key={idx} value={idx}>
                      Rack: {loc.rack} | Bin: {loc.bin} (Available: {loc.qty} pcs)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="input-label">To Destination Rack No *:</label>
                  <input
                    type="text"
                    value={transferToRack}
                    onChange={(e) => setTransferToRack(e.target.value)}
                    placeholder="e.g. R-03"
                    className="input-field"
                    style={{ textTransform: 'uppercase', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label className="input-label">To Destination Bin No *:</label>
                  <input
                    type="text"
                    value={transferToBin}
                    onChange={(e) => setTransferToBin(e.target.value)}
                    placeholder="e.g. B-05"
                    className="input-field"
                    style={{ textTransform: 'uppercase', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Quantity to Transfer (Pcs):</label>
                <input
                  type="number"
                  min="1"
                  max={(transferItem.locations?.[transferFromLocationIndex]?.qty) || transferItem.stock}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
                  className="input-field"
                  style={{ fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowTransferModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleExecuteTransfer} className="btn-primary">
                <ArrowRightLeft size={15} />
                <span>Confirm Stock Transfer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-CLICK ONLINE PRICE COMPARE MODAL */}
      <MarketPriceCompareModal
        isOpen={Boolean(compareProduct)}
        onClose={() => setCompareProduct(null)}
        product={compareProduct}
        onUpdateProductPrices={(productId, updatedComparison) => {
          setInventory(prev => prev.map(p => p.id === productId ? { ...p, marketComparison: updatedComparison } : p));
        }}
        shopConfig={shopConfig}
      />

    </div>
  );
}
