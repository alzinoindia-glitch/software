import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Barcode, 
  Smartphone,
  Copy,
  Check,
  MapPin,
  ArrowRightLeft,
  Globe,
  ShoppingCart,
  Grid,
  List,
  X,
  Zap,
  ArrowUpRight,
  Headphones,
  Tv,
  Wrench,
  Printer,
  Sparkles
} from 'lucide-react';
import MarketPriceCompareModal from './MarketPriceCompareModal';
import { ProductImagePicker, ProductImageViewer } from './ProductImages';
import { saveProductImage, getProductImage, deleteProductImages } from '../utils/productImageStore';
import { renderBarcodeSvg } from '../utils/barcode';

const standardBrands = [
  'Apple', 
  'Samsung', 
  'OnePlus', 
  'Vivo', 
  'Oppo', 
  'Realme', 
  'Xiaomi', 
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
  onPrintBarcodeSheet,
  shopConfig,
  onQuickBill,
  initialSearchTerm,
  onClearInitialSearchTerm
}) {
  // View mode: 'cards' | 'table'
  const [viewMode, setViewMode] = useState('cards');

  // Fast Filters
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in-stock' | 'low' | 'out'
  const [sortBy, setSortBy] = useState('default');

  // Synchronize when opened from Low Stock Alert Board or external trigger
  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      setCategoryFilter('All');
      setBrandFilter('All');
      setStockFilter('all');
    }
  }, [initialSearchTerm]);
  
  // Interactive copy state
  const [copiedId, setCopiedId] = useState(null);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [compareProduct, setCompareProduct] = useState(null);
  const [quickBarcodeItem, setQuickBarcodeItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  // Product photos (front & back) for the add/edit form
  const [formImages, setFormImages] = useState({ front: null, back: null });

  // Stock Transfer
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [transferFromLocationIndex, setTransferFromLocationIndex] = useState(0);
  const [transferToRack, setTransferToRack] = useState('R-02');
  const [transferToBin, setTransferToBin] = useState('B-01');
  const [transferQty, setTransferQty] = useState(1);

  // Form state
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
    warranty: '1 Year Warranty',
    receivedDate: new Date().toISOString().split('T')[0],
  });

  const categoryIcons = {
    'All': null,
    'New Mobiles': Smartphone,
    'Used Mobiles': Smartphone,
    'Mobile Accessories': Headphones,
    'Home Appliances': Tv,
    'Spare Parts': Wrench
  };

  const categories = ['All', 'New Mobiles', 'Used Mobiles', 'Mobile Accessories', 'Home Appliances', 'Spare Parts'];

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendToPos = (item) => {
    if (item.stock <= 0) return;
    if (onQuickBill) {
      onQuickBill(item);
    }
  };

  // Live Counts
  const totalProducts = inventory.length;
  const inStockProducts = inventory.filter(i => i.stock > (i.lowStockThreshold || 2)).length;
  const lowStockProducts = inventory.filter(i => i.stock > 0 && i.stock <= (i.lowStockThreshold || 2)).length;
  const outOfStockProducts = inventory.filter(i => i.stock === 0).length;

  const availableBrands = useMemo(() => {
    const brandsSet = new Set();
    inventory.forEach(item => {
      if (item.brand) brandsSet.add(item.brand);
    });
    return Array.from(brandsSet);
  }, [inventory]);

  // Fast Filter
  const filteredProducts = useMemo(() => {
    return inventory.filter(item => {
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesBrand = brandFilter === 'All' || item.brand === brandFilter;

      const isLow = item.stock > 0 && item.stock <= (item.lowStockThreshold || 2);
      const isOut = item.stock === 0;
      const isInStock = item.stock > (item.lowStockThreshold || 2);

      const matchesStock = 
        stockFilter === 'all' ||
        (stockFilter === 'in-stock' && isInStock) ||
        (stockFilter === 'low' && isLow) ||
        (stockFilter === 'out' && isOut);

      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesCategory && matchesBrand && matchesStock;

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

      return matchesCategory && matchesBrand && matchesStock && words.every(word => haystack.includes(word));
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock-asc') return a.stock - b.stock;
      if (sortBy === 'stock-desc') return b.stock - a.stock;
      if (sortBy === 'price-asc') return a.sellPrice - b.sellPrice;
      if (sortBy === 'price-desc') return b.sellPrice - a.sellPrice;
      if (sortBy === 'margin') return (b.sellPrice - b.buyPrice) - (a.sellPrice - a.buyPrice);
      return 0;
    });
  }, [inventory, categoryFilter, brandFilter, stockFilter, searchTerm, sortBy]);

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
      receivedDate: new Date().toISOString().split('T')[0],
    });
    setFormImages({ front: null, back: null });
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
      receivedDate: item.receivedDate || (item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    });
    setFormImages({ front: null, back: null });
    if (item.images?.front || item.images?.back) {
      Promise.all([getProductImage(item.id, 'front'), getProductImage(item.id, 'back')])
        .then(([front, back]) => setFormImages({ front, back }));
    }
    setShowModal(true);
  };

  const handleDelete = (item) => {
    setDeleteConfirmItem(item);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmItem) {
      setInventory(prev => prev.filter(i => i.id !== deleteConfirmItem.id));
      deleteProductImages(deleteConfirmItem.id).catch(() => {});
      setDeleteConfirmItem(null);
    }
  };

  const handleOpenTransfer = (item) => {
    setTransferItem(item);
    setTransferFromLocationIndex(0);
    setTransferToRack('R-02');
    setTransferToBin('B-01');
    setTransferQty(1);
    setShowTransferModal(true);
  };

  const handleExecuteTransfer = () => {
    if (!transferItem) return;
    const currentLocs = transferItem.locations && transferItem.locations.length > 0 
      ? JSON.parse(JSON.stringify(transferItem.locations)) 
      : [{ rack: transferItem.rack || 'R-01', bin: transferItem.bin || 'B-01', qty: transferItem.stock }];

    const fromLoc = currentLocs[transferFromLocationIndex];
    if (!fromLoc || fromLoc.qty < transferQty) {
      alert(`Invalid quantity.`);
      return;
    }

    if (!transferToRack.trim() || !transferToBin.trim()) {
      alert("Specify Rack and Bin");
      return;
    }

    fromLoc.qty -= transferQty;
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
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sellPrice) return;

    // Persist front/back photos to the on-device image store (not localStorage)
    const productId = editingItem ? editingItem.id : `PROD-${Date.now()}`;
    let imagesMeta = null;
    try {
      await Promise.all([
        saveProductImage(productId, 'front', formImages.front),
        saveProductImage(productId, 'back', formImages.back)
      ]);
      imagesMeta = (formImages.front || formImages.back)
        ? { front: Boolean(formImages.front), back: Boolean(formImages.back), v: Date.now() }
        : null;
    } catch (err) {
      console.error('Product image save failed:', err);
      alert('Product saved, but photos could not be stored on this device.');
      imagesMeta = editingItem?.images || null;
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
            receivedDate: formData.receivedDate || editingItem.receivedDate || new Date().toISOString().split('T')[0],
            offer: editingItem.offer,
            createdAt: editingItem.createdAt || new Date().toISOString(),
            images: imagesMeta,
          };
        }
        return item;
      }));
    } else {
      const newItem = {
        id: productId,
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
        receivedDate: formData.receivedDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        images: imagesMeta,
        status: 'Active',
      };
      setInventory(prev => [newItem, ...prev]);
    }

    setShowModal(false);
  };

  return (
    <div style={{ padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* HUD COMMAND BAR: Hyper-Minimalist, Zero Text Sentences */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap',
        background: 'var(--surface-primary)',
        padding: '0.55rem 0.85rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
      }}>
        {/* Left: Brand / HUD Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0C5B43 0%, #152620 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#A9BC5C',
            boxShadow: '0 0 10px rgba(169, 188, 92, 0.25)'
          }}>
            <Zap size={16} className="hud-pulse" />
          </div>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: '0.92rem',
            letterSpacing: '0.04em',
            color: 'var(--text-primary)'
          }}>
            STOCK HUB
          </span>
          <span style={{
            fontSize: '0.62rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            padding: '0.12rem 0.4rem',
            borderRadius: '4px',
            background: role === 'cashier' ? '#FEF08A' : 'var(--status-green-bg)',
            color: role === 'cashier' ? '#854D0E' : 'var(--status-green)'
          }}>
            {role === 'cashier' ? 'POS' : 'ADMIN'}
          </span>
        </div>

        {/* Center: Command Search Input */}
        <div style={{ flex: 1, maxWidth: '480px', minWidth: '220px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search / Scan barcode, model, IMEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{
              paddingLeft: '2.1rem',
              paddingRight: searchTerm ? '2.2rem' : '0.85rem',
              height: '34px',
              fontSize: '0.82rem',
              borderRadius: '8px',
              border: '1.5px solid var(--border-color)',
              width: '100%',
              background: 'var(--bg-main)'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                if (onClearInitialSearchTerm) onClearInitialSearchTerm();
              }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Right: View Toggle + Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-main)',
            borderRadius: '6px',
            padding: '2px',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                padding: '0.28rem 0.5rem',
                borderRadius: '4px',
                background: viewMode === 'cards' ? 'var(--surface-primary)' : 'transparent',
                color: viewMode === 'cards' ? 'var(--accent-primary)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer'
              }}
              title="Cards"
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.28rem 0.5rem',
                borderRadius: '4px',
                background: viewMode === 'table' ? 'var(--surface-primary)' : 'transparent',
                color: viewMode === 'table' ? 'var(--accent-primary)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer'
              }}
              title="List"
            >
              <List size={14} />
            </button>
          </div>

          {role === 'admin' && (
            <>
              <button 
                onClick={() => {
                  if (inventory.length > 0) handleOpenTransfer(inventory[0]);
                }}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.76rem', height: '32px' }}
                title="Transfer Shelf"
              >
                <ArrowRightLeft size={13} />
              </button>
              <button 
                onClick={openAddModal}
                className="btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem', height: '32px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* HUD TELEMETRY STRIP: Clickable Status Badges & Quick Categories */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.65rem',
        flexWrap: 'wrap',
        padding: '0.2rem 0'
      }}>
        {/* Telemetry Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
          <button 
            onClick={() => setStockFilter('all')}
            className={`hud-pill ${stockFilter === 'all' ? 'active' : ''}`}
          >
            <span>📦</span>
            <span>ALL: {totalProducts}</span>
          </button>

          <button 
            onClick={() => setStockFilter(stockFilter === 'in-stock' ? 'all' : 'in-stock')}
            className={`hud-pill ${stockFilter === 'in-stock' ? 'active' : ''}`}
          >
            <span style={{ color: 'var(--status-green)' }}>●</span>
            <span>IN: {inStockProducts}</span>
          </button>

          <button 
            onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
            className={`hud-pill ${stockFilter === 'low' ? 'active' : ''}`}
          >
            <span style={{ color: 'var(--status-amber)' }}>●</span>
            <span>LOW: {lowStockProducts}</span>
          </button>

          <button 
            onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
            className={`hud-pill ${stockFilter === 'out' ? 'active' : ''}`}
          >
            <span style={{ color: 'var(--status-red)' }}>●</span>
            <span>OUT: {outOfStockProducts}</span>
          </button>
        </div>

        {/* Categories Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {categories.map(cat => {
            const isActive = categoryFilter === cat;
            const Icon = categoryIcons[cat];
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`hud-pill ${isActive ? 'active' : ''}`}
                style={{ fontSize: '0.72rem', padding: '0.22rem 0.55rem' }}
              >
                {Icon && <Icon size={12} />}
                <span>{cat.replace('Mobile Accessories', 'Accessories').replace('Home Appliances', 'Appliances')}</span>
              </button>
            );
          })}

          {availableBrands.length > 0 && (
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="hud-pill"
              style={{ height: '28px', padding: '0 0.45rem', fontSize: '0.72rem' }}
            >
              <option value="All">All Brands</option>
              {availableBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="hud-pill"
            style={{ height: '28px', padding: '0 0.45rem', fontSize: '0.72rem' }}
          >
            <option value="default">Default</option>
            <option value="price-asc">₹ Low → High</option>
            <option value="price-desc">₹ High → Low</option>
            <option value="stock-desc">Stock High</option>
            <option value="stock-asc">Stock Low</option>
            <option value="name">A → Z</option>
          </select>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      {filteredProducts.length === 0 ? (
        /* Empty / Zero Match State */
        <div className="hud-card" style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          minHeight: '260px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(169, 188, 92, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}>
            <Package size={24} />
          </div>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '0.04em',
            color: 'var(--text-primary)'
          }}>
            {searchTerm ? '0 MATCHES' : 'CATALOG EMPTY'}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
              >
                Reset
              </button>
            )}
            {role === 'admin' && (
              <button 
                onClick={openAddModal} 
                className="btn-primary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.9rem' }}
              >
                <Plus size={13} />
                <span>Add Product</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* INSANE UI & UX: FAST-FINDER CARDS (ZERO BULK TEXT) */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.85rem'
        }}>
          {filteredProducts.map(item => {
            const isLow = item.stock > 0 && item.stock <= (item.lowStockThreshold || 2);
            const isOut = item.stock === 0;
            const savings = (item.mrp && item.mrp > item.sellPrice) ? item.mrp - item.sellPrice : 0;
            const savingsPct = item.mrp && item.mrp > item.sellPrice ? Math.round((savings / item.mrp) * 100) : 0;
            const isCopied = copiedId === item.id;
            const codeToCopy = item.imeis && item.imeis.length > 0 ? item.imeis[0] : (item.barcode || item.id);

            return (
              <div 
                key={item.id}
                className="hud-card"
                style={{
                  padding: '0.95rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}
              >
                {/* Top Row: Brand Chip + Stock Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--accent-primary)',
                    background: 'rgba(169, 188, 92, 0.12)',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '4px'
                  }}>
                    {item.brand || 'UNIVERSAL'}
                  </span>

                  {/* Stock Pill: Just ● count */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: isOut 
                      ? 'var(--status-red-bg)' 
                      : isLow 
                        ? 'var(--status-amber-bg)' 
                        : 'var(--status-green-bg)',
                    color: isOut 
                      ? 'var(--status-red)' 
                      : isLow 
                        ? 'var(--status-amber)' 
                        : 'var(--status-green)'
                  }}>
                    <span>●</span>
                    <span>{isOut ? 'OUT' : item.stock}</span>
                  </span>
                </div>

                {item.offer && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    color: '#d97706',
                    background: 'rgba(217, 119, 6, 0.12)',
                    border: '1px solid rgba(217, 119, 6, 0.3)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    {item.offer.label || `Deal (${item.offer.pct}% Off)`}
                  </div>
                )}

                {/* Product Photo (Front / Back toggle) */}
                {(item.images?.front || item.images?.back) && (
                  <ProductImageViewer product={item} height={150} />
                )}

                {/* Product Name (Bold, 1-2 lines, clean) */}
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '1rem',
                  lineHeight: 1.25,
                  color: 'var(--text-primary)',
                  minHeight: '2.5rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {item.name}
                </div>

                {/* Location Badge + ID Pill */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                  {/* Rack / Bin Badge */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: '#207096',
                    background: 'rgba(32, 112, 150, 0.1)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <MapPin size={11} />
                    <span>{item.rack || 'R-01'} : {item.bin || 'B-01'}</span>
                  </span>

                  {/* ID / Barcode / IMEI with 1-Click Copy */}
                  <button
                    onClick={() => handleCopy(codeToCopy, item.id)}
                    style={{
                      background: isCopied ? 'var(--status-green-bg)' : 'var(--bg-main)',
                      color: isCopied ? 'var(--status-green)' : 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '0.15rem 0.45rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Copy Code"
                  >
                    <span>{codeToCopy ? (codeToCopy.length > 10 ? codeToCopy.slice(0, 8) + '…' : codeToCopy) : 'ID'}</span>
                    {isCopied ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </div>

                {/* HERO PRICE: Visual Star of Card */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 900,
                      fontSize: '1.45rem',
                      letterSpacing: '-0.02em',
                      color: 'var(--accent-primary)'
                    }}>
                      ₹{item.sellPrice.toLocaleString()}
                    </span>
                    {item.mrp && item.mrp > item.sellPrice && (
                      <span style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        textDecoration: 'line-through'
                      }}>
                        ₹{item.mrp.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {savingsPct > 0 && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '0.68rem',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      background: 'var(--status-green-bg)',
                      color: 'var(--status-green)'
                    }}>
                      -{savingsPct}%
                    </span>
                  )}
                </div>

                {/* ACTION DOCK: Instant Tactile Interaction */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 'auto' }}>
                  {/* Primary: BILL BUTTON */}
                  <button
                    onClick={() => handleSendToPos(item)}
                    disabled={isOut}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      background: isOut ? 'var(--bg-main)' : 'var(--accent-primary)',
                      color: isOut ? 'var(--text-muted)' : 'var(--accent-contrast, #FFFFFF)',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      cursor: isOut ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isOut ? 'none' : '0 2px 8px rgba(12, 91, 67, 0.25)'
                    }}
                    title={isOut ? 'Out of Stock' : 'Add to POS Counter Cart'}
                  >
                    <ShoppingCart size={14} />
                    <span>BILL</span>
                  </button>

                  {/* Secondary Icon Dock */}
                  <button
                    onClick={() => setCompareProduct(item)}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '6px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer'
                    }}
                    title="Live Online Market Price (Amazon & Flipkart)"
                  >
                    <Globe size={14} />
                  </button>

                  <button
                    onClick={() => setQuickBarcodeItem(item)}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '6px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                    title="Print Barcode Tag"
                  >
                    <Barcode size={14} />
                  </button>

                  {role === 'admin' && (
                    <>
                      <button
                        onClick={() => openEditModal(item)}
                        style={{
                          padding: '0.45rem',
                          borderRadius: '6px',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        style={{
                          padding: '0.45rem',
                          borderRadius: '6px',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--status-red)',
                          cursor: 'pointer'
                        }}
                        title="Delete"
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
        /* STREAMLINED HUD LIST MODE */
        <div className="hud-card" style={{ padding: '0.25rem', overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.65rem 0.85rem' }}>PRODUCT</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>STOCK</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>SHELF</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>PRICE</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>ID</th>
                <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(item => {
                const isLow = item.stock > 0 && item.stock <= (item.lowStockThreshold || 2);
                const isOut = item.stock === 0;
                const isCopied = copiedId === item.id;
                const codeToCopy = item.imeis && item.imeis.length > 0 ? item.imeis[0] : (item.barcode || item.id);

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                        {item.brand || 'UNIVERSAL'}
                      </div>
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        color: isOut ? 'var(--status-red)' : isLow ? 'var(--status-amber)' : 'var(--status-green)'
                      }}>
                        ● {isOut ? '0' : item.stock}
                      </span>
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.74rem',
                        color: '#207096',
                        background: 'rgba(32, 112, 150, 0.1)',
                        padding: '0.12rem 0.4rem',
                        borderRadius: '4px'
                      }}>
                        {item.rack || 'R-01'}:{item.bin || 'B-01'}
                      </span>
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 900,
                          fontSize: '0.92rem',
                          color: 'var(--accent-primary)'
                        }}>
                          ₹{item.sellPrice.toLocaleString()}
                        </span>
                        {item.offer && (
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            color: '#d97706'
                          }}>
                            {item.offer.label || `${item.offer.pct}% Off`}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <button
                        onClick={() => handleCopy(codeToCopy, item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          color: isCopied ? 'var(--status-green)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          cursor: 'pointer'
                        }}
                      >
                        <span>{codeToCopy ? (codeToCopy.length > 8 ? codeToCopy.slice(0, 8) + '…' : codeToCopy) : '—'}</span>
                        {isCopied ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                        <button
                          onClick={() => handleSendToPos(item)}
                          disabled={isOut}
                          className="btn-primary"
                          style={{ padding: '0.28rem 0.65rem', fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-contrast, #FFFFFF)' }}
                        >
                          BILL
                        </button>
                        <button
                          onClick={() => setCompareProduct(item)}
                          className="btn-secondary"
                          style={{ padding: '0.28rem 0.45rem' }}
                          title="Live Online Market Price (Amazon & Flipkart)"
                        >
                          <Globe size={13} />
                        </button>
                        <button
                          onClick={() => setQuickBarcodeItem(item)}
                          className="btn-secondary"
                          style={{ padding: '0.28rem 0.45rem' }}
                          title="Print Barcode Tag"
                        >
                          <Barcode size={13} />
                        </button>
                        {role === 'admin' && (
                          <>
                            <button
                              onClick={() => openEditModal(item)}
                              className="btn-secondary"
                              style={{ padding: '0.28rem 0.45rem' }}
                              title="Edit Product"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="btn-secondary"
                              style={{ padding: '0.28rem 0.45rem', color: 'var(--status-red)' }}
                              title="Delete Product"
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

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmItem && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1200 }}>
          <div className="illoca-card animate-fade-in" style={{ maxWidth: '420px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)', border: '1px solid var(--status-red)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--status-red-bg)', color: 'var(--status-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Delete Product</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>ID: {deleteConfirmItem.id}</div>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-primary)', margin: '0 0 1.25rem' }}>
              Are you sure you want to remove <strong>{deleteConfirmItem.name}</strong> from stock? This will remove all associated barcode and rack allocations.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="btn-secondary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--status-red)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1100 }}>
          <form onSubmit={handleSave} className="illoca-card animate-fade-in" style={{ maxWidth: '580px', width: '100%', padding: '1.25rem', background: 'var(--surface-primary)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Package size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  {editingItem ? 'Edit Item' : 'New Product'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Category</label>
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
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Brand</label>
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
                >
                  {standardBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>

                {(isCustomBrand || !standardBrands.includes(formData.brand)) && (
                  <input
                    type="text"
                    placeholder="Brand name"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                    className="input-field animate-fade-in"
                    style={{ marginTop: '0.3rem' }}
                    autoFocus
                  />
                )}
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apple iPhone 15 128GB"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Selling Price ₹ *</label>
                <input
                  type="number"
                  placeholder="Sell ₹"
                  value={formData.sellPrice}
                  onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                  required
                  className="input-field"
                  style={{ fontWeight: 800, color: 'var(--accent-primary)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>MRP ₹</label>
                <input
                  type="number"
                  placeholder="Box MRP"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Buy Cost ₹ *</label>
                <input
                  type="number"
                  placeholder="Cost ₹"
                  value={formData.buyPrice}
                  onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Stock Units</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Rack</label>
                <input
                  type="text"
                  placeholder="e.g. R-01"
                  value={formData.rack}
                  onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                  className="input-field"
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Bin</label>
                <input
                  type="text"
                  placeholder="e.g. B-01"
                  value={formData.bin}
                  onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                  className="input-field"
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Barcode</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="input-field"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Tax %</label>
                <select
                  value={formData.isGst ? formData.gstRate : 0}
                  onChange={(e) => {
                    const r = parseFloat(e.target.value);
                    setFormData({ ...formData, isGst: r > 0, gstRate: r });
                  }}
                  className="input-field"
                >
                  <option value={18}>18% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={28}>28% GST</option>
                  <option value={5}>5% GST</option>
                  <option value={0}>0% Non-GST</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Inward Date (Aging)</label>
                <input
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>IMEIs (Optional, 1 per line)</label>
                <textarea
                  rows={2}
                  placeholder="358249..."
                  value={formData.imeisText}
                  onChange={(e) => setFormData({ ...formData, imeisText: e.target.value })}
                  className="input-field"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <ProductImagePicker value={formImages} onChange={setFormImages} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.55rem 1.25rem' }}>Save</button>
            </div>
          </form>
        </div>
      )}

      {/* STOCK TRANSFER MODAL */}
      {showTransferModal && transferItem && (
        <div className="modal-backdrop no-print" style={{ zIndex: 1100 }}>
          <div className="modal-dialog" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ArrowRightLeft size={16} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Shelf Move</h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="btn-secondary" style={{ padding: '0.2rem 0.4rem' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{transferItem.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stock: {transferItem.stock} pcs</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>To Rack:</label>
                  <input
                    type="text"
                    value={transferToRack}
                    onChange={(e) => setTransferToRack(e.target.value)}
                    className="input-field"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>To Bin:</label>
                  <input
                    type="text"
                    value={transferToBin}
                    onChange={(e) => setTransferToBin(e.target.value)}
                    className="input-field"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>Quantity:</label>
                <input
                  type="number"
                  min="1"
                  max={transferItem.stock}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => setShowTransferModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleExecuteTransfer} className="btn-primary">Move</button>
            </div>
          </div>
        </div>
      )}

      {/* ONLINE PRICE COMPARE MODAL */}
      <MarketPriceCompareModal
        isOpen={Boolean(compareProduct)}
        onClose={() => setCompareProduct(null)}
        product={compareProduct}
        onUpdateProductPrices={(productId, updatedComparison) => {
          setInventory(prev => prev.map(p => p.id === productId ? { ...p, marketComparison: updatedComparison } : p));
        }}
        shopConfig={shopConfig}
      />

      {/* QUICK BARCODE STICKER MODAL */}
      {quickBarcodeItem && (
        <div 
          className="modal-backdrop no-print" 
          onClick={() => setQuickBarcodeItem(null)}
          style={{ zIndex: 2500 }}
        >
          <div 
            className="modal-dialog animate-fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', width: '92%', padding: '1.25rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Barcode size={18} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Product Barcode Label</h3>
              </div>
              <button onClick={() => setQuickBarcodeItem(null)} className="btn-secondary" style={{ padding: '0.2rem 0.45rem' }}>
                <X size={15} />
              </button>
            </div>

            {/* Sticker Preview Box (50x25mm styled sticker) */}
            <div style={{
              background: '#FFFFFF',
              color: '#000000',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: '2px dashed #CBD5E1',
              textAlign: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0F251E', marginBottom: '2px' }}>
                {shopConfig?.name || 'ALZINO MOBILES'}
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px', lineHeight: 1.2 }}>
                {quickBarcodeItem.name}
              </div>

              {/* Barcode SVG Rendering */}
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: renderBarcodeSvg(quickBarcodeItem.barcode || `ALZ-${quickBarcodeItem.id}`, 220, 52, true) 
                }}
                style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px', padding: '0 0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', textDecoration: quickBarcodeItem.mrp > quickBarcodeItem.sellPrice ? 'line-through' : 'none' }}>
                  MRP: ₹{(quickBarcodeItem.mrp || quickBarcodeItem.sellPrice).toLocaleString()}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0C5B43' }}>
                  ₹{quickBarcodeItem.sellPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  if (onSelectBarcode) {
                    onSelectBarcode(quickBarcodeItem);
                  }
                  setQuickBarcodeItem(null);
                }}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Open Studio to print full 24 or 40 barcode label sheets"
              >
                <span>Full Sheet Studio ➔</span>
              </button>

              <button
                onClick={() => {
                  if (onPrintBarcodeSheet) {
                    onPrintBarcodeSheet({
                      title: quickBarcodeItem.name,
                      barcode: quickBarcodeItem.barcode || `ALZ-${quickBarcodeItem.id}`,
                      price: quickBarcodeItem.sellPrice,
                      mrp: quickBarcodeItem.mrp || quickBarcodeItem.sellPrice,
                      copies: 1,
                      format: 'single',
                    });
                    setQuickBarcodeItem(null);
                  } else {
                    window.print();
                  }
                }}
                className="btn-primary"
                style={{ flex: 1.2, padding: '0.55rem', fontSize: '0.82rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-contrast, #FFFFFF)' }}
              >
                <Printer size={15} />
                <span>Print Sticker</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
