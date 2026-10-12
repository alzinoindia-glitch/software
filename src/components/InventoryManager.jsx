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
  Sparkles,
  Camera,
  RefreshCw,
  QrCode,
  Download,
  Layers
} from 'lucide-react';
import MarketPriceCompareModal from './MarketPriceCompareModal';
import { ProductImagePicker, ProductImageViewer } from './ProductImages';
import { saveProductImage, getProductImage, deleteProductImages } from '../utils/productImageStore';
import { renderBarcodeSvg, renderCodeSvg, downloadStickerImage } from '../utils/barcode';
import CameraBarcodeScannerModal from './CameraBarcodeScannerModal';
import BulkMobileVariantEntryModal, { COMMON_RAM_OPTIONS, COMMON_STORAGE_OPTIONS, POPULAR_COLORS } from './BulkMobileVariantEntryModal';
import { getProductColorHex } from '../utils/colorUtils';
import ModelVariantImeiDirectory from './ModelVariantImeiDirectory';
import ProductScanDetailsModal from './ProductScanDetailsModal';
import { 
  STANDARD_PRODUCT_TERMS_PRESETS, 
  DEFAULT_PRODUCT_TERMS, 
  normalizeProductTerms, 
  findProductFromScan 
} from '../utils/productTerms';
import {
  BASE_CATEGORIES,
  BASE_MOBILE_BRANDS,
  BASE_APPLIANCE_BRANDS,
  BASE_ACCESSORY_BRANDS,
  BASE_SPARE_PARTS_BRANDS,
  getAvailableCategories,
  getAvailableBrandsForCategory,
  saveCustomCategory,
  saveCustomBrand,
  getAvailableSubcategories,
  saveCustomSubcategory
} from '../utils/customTaxonomy';
import { getProductSuggestions, lookupProductByBarcodeOrImei } from '../utils/productSuggestions';
import { purgeAllLegacyOfflineData } from '../utils/cloudSyncService';

export const MOBILE_BRANDS = BASE_MOBILE_BRANDS;
export const APPLIANCE_BRANDS = BASE_APPLIANCE_BRANDS;
export const ACCESSORY_BRANDS = BASE_ACCESSORY_BRANDS;
export const SPARE_PARTS_BRANDS = BASE_SPARE_PARTS_BRANDS;
export const STANDARD_CATEGORIES = BASE_CATEGORIES;
export const getBrandsForCategory = (category, inv = []) => getAvailableBrandsForCategory(category, inv);


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
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [activeImeiViewerItem, setActiveImeiViewerItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);
  const [isCustomStorage, setIsCustomStorage] = useState(false);
  const [isCustomRam, setIsCustomRam] = useState(false);
  const [compareProduct, setCompareProduct] = useState(null);
  const [quickBarcodeItem, setQuickBarcodeItem] = useState(null);
  const [quickLabelFormat, setQuickLabelFormat] = useState(null);
  const [quickLabelQty, setQuickLabelQty] = useState(1);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState('scan'); // 'scan' | 'generate'
  const [activeScanPreviewItem, setActiveScanPreviewItem] = useState(null);
  const [customTermInput, setCustomTermInput] = useState('');
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
    subCategory: '',
    capacity: '',
    brand: 'Samsung',
    name: '',
    model: '',
    ram: '8GB',
    storage: '256GB',
    color: 'Onyx Black',
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
    codeFormat: 'barcode',
    barcode: '',
    imeisText: '',
    imei1: '',
    imei2: '',
    warranty: '1 Year Brand Warranty',
    termsAndConditions: [...DEFAULT_PRODUCT_TERMS],
    receivedDate: new Date().toISOString().split('T')[0],
  });

  const categoryIcons = {
    'All': null,
    'New Mobiles': Smartphone,
    'Used Mobiles': Smartphone,
    'Mobile Accessories': Headphones,
    'Home Appliances': Tv,
    'Spare Parts': Wrench,
    'Universal': Package
  };

  const [taxonomyVer, setTaxonomyVer] = useState(0);

  useEffect(() => {
    const handleTaxonomyUpdated = () => setTaxonomyVer(v => v + 1);
    window.addEventListener('alzino:taxonomy-updated', handleTaxonomyUpdated);
    return () => window.removeEventListener('alzino:taxonomy-updated', handleTaxonomyUpdated);
  }, []);

  const availableCategories = useMemo(() => {
    return getAvailableCategories(inventory);
  }, [inventory, taxonomyVer]);

  const categories = useMemo(() => {
    return ['All', ...availableCategories];
  }, [availableCategories]);

  // Product Auto-Suggestions for rapid data entry
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [nameSuggestionIndex, setNameSuggestionIndex] = useState(-1);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [modelSuggestionIndex, setModelSuggestionIndex] = useState(-1);

  const productNameSuggestions = useMemo(() => {
    if (!formData.name || formData.name.trim().length < 2) return [];
    return getProductSuggestions(formData.name, inventory, 8);
  }, [formData.name, inventory]);

  const modelSuggestions = useMemo(() => {
    if (!formData.model || formData.model.trim().length < 2) return [];
    return getProductSuggestions(formData.model, inventory, 8);
  }, [formData.model, inventory]);

  const handleSelectSuggestion = (suggestion) => {
    setFormData(prev => {
      const validBrands = getAvailableBrandsForCategory(suggestion.category || prev.category, inventory);
      const targetBrand = suggestion.brand && validBrands.includes(suggestion.brand)
        ? suggestion.brand
        : (suggestion.brand || prev.brand);

      return {
        ...prev,
        name: suggestion.name,
        brand: targetBrand,
        category: suggestion.category || prev.category,
        model: suggestion.model || prev.model,
        ram: suggestion.ram || prev.ram,
        storage: suggestion.storage || prev.storage,
        color: suggestion.color || prev.color,
        hsn: suggestion.hsn || prev.hsn,
        gstRate: suggestion.gstRate !== undefined ? suggestion.gstRate : prev.gstRate,
        buyPrice: prev.buyPrice ? prev.buyPrice : (suggestion.suggestedBuy ? String(suggestion.suggestedBuy) : ''),
        sellPrice: prev.sellPrice ? prev.sellPrice : (suggestion.suggestedSell ? String(suggestion.suggestedSell) : ''),
        mrp: prev.mrp ? prev.mrp : (suggestion.suggestedSell ? String(suggestion.suggestedSell) : '')
      };
    });
    setIsCustomCategory(false);
    setIsCustomBrand(false);
    setIsCustomSubcategory(false);
    setIsCustomStorage(false);
    setIsCustomRam(false);
    setShowNameSuggestions(false);
    setShowModelSuggestions(false);
    setNameSuggestionIndex(-1);
    setModelSuggestionIndex(-1);
  };

  const [cameraScanTarget, setCameraScanTarget] = useState('barcode'); // 'barcode' | 'imei1' | 'imei2'

  const handleBarcodeOrImeiScanned = (scannedCode, targetField = cameraScanTarget) => {
    const raw = (scannedCode || '').trim();
    if (!raw) return;

    if (targetField === 'search' || targetField === 'specScan') {
      const directMatch = findProductFromScan(raw, inventory);
      if (directMatch) {
        setShowCameraScanner(false);
        setActiveScanPreviewItem(directMatch);
        return;
      }
      setSearchTerm(raw);
      setShowCameraScanner(false);
      return;
    }

    const digitsOnly = raw.replace(/[^0-9a-zA-Z]/g, '');
    const is15DigitImei = digitsOnly.length === 15 && /^\d+$/.test(digitsOnly);

    // Look up in catalog / inventory for auto-filling details
    const matched = lookupProductByBarcodeOrImei(raw, inventory);

    setFormData(prev => {
      const next = { ...prev };

      // 1. Assign to barcode or IMEI fields
      if (is15DigitImei || targetField === 'imei1' || targetField === 'imei2') {
        if (targetField === 'imei2') {
          next.imei2 = raw;
        } else if (targetField === 'imei1' || !next.imei1) {
          next.imei1 = raw;
        } else if (!next.imei2) {
          next.imei2 = raw;
        }
      } else {
        next.barcode = raw;
      }

      // 2. If matched catalog template (e.g. Karbonn K9 from barcode 8903888001263 or TAC)
      if (matched) {
        if (!next.name || next.name.trim() === '') next.name = matched.name || '';
        if (matched.brand) next.brand = matched.brand;
        if (matched.model && (!next.model || next.model.trim() === '')) next.model = matched.model;
        if (matched.category) next.category = matched.category;
        if (matched.color && (!next.color || next.color === 'Onyx Black')) next.color = matched.color;
        if (matched.ram) next.ram = matched.ram;
        if (matched.storage) next.storage = matched.storage;
        if (matched.description && !next.description) next.description = matched.description;
        if (matched.hsn) next.hsn = matched.hsn;
        if (matched.gstRate) next.gstRate = matched.gstRate;
        if (matched.suggestedBuy && !next.buyPrice) next.buyPrice = String(matched.suggestedBuy);
        if (matched.suggestedSell && !next.sellPrice) next.sellPrice = String(matched.suggestedSell);
        if (matched.mrp && !next.mrp) next.mrp = String(matched.mrp);
        if (matched.barcode && !next.barcode) next.barcode = matched.barcode;
        if (matched.warranty && !next.warranty) next.warranty = matched.warranty;
      }

      return next;
    });

    setBarcodeMode('scan');
  };

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
    if (categoryFilter !== 'All') {
      const catBrands = getAvailableBrandsForCategory(categoryFilter, inventory);
      catBrands.forEach(b => brandsSet.add(b));
    }
    return Array.from(brandsSet);
  }, [inventory, categoryFilter, taxonomyVer]);

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
      const unitCodes = (item.units || []).flatMap(u => [u.barcode, u.imei1, u.imei2, u.color]).filter(Boolean);
      const allBarcodes = (item.barcodes || []).filter(Boolean);
      const haystack = [
        item.name || '',
        item.brand || '',
        item.category || '',
        item.subCategory || '',
        item.capacity || '',
        item.model || '',
        item.color || '',
        item.ram || '',
        item.storage || '',
        item.description || '',
        item.barcode || '',
        item.rack || '',
        item.bin || '',
        ...(item.imeis || []),
        ...unitCodes,
        ...allBarcodes
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
    setIsCustomCategory(false);
    setIsCustomBrand(false);
    setIsCustomStorage(false);
    setIsCustomRam(false);
    setBarcodeMode('generate');
    const defaultCat = availableCategories.includes('New Mobiles') ? 'New Mobiles' : (availableCategories[0] || 'New Mobiles');
    const validBrands = getAvailableBrandsForCategory(defaultCat, inventory);
    const defaultBrand = validBrands.includes('Samsung') ? 'Samsung' : (validBrands[0] || 'Universal');
    setFormData({
      category: defaultCat,
      subCategory: '',
      capacity: '',
      brand: defaultBrand,
      name: '',
      model: '',
      ram: '8GB',
      storage: '256GB',
      color: 'Onyx Black',
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
      codeFormat: 'barcode',
      barcode: `ALZ-${Date.now().toString().slice(-6)}`,
      imeisText: '',
      imei1: '',
      imei2: '',
      warranty: '1 Year Brand Warranty',
      termsAndConditions: [...DEFAULT_PRODUCT_TERMS],
      receivedDate: new Date().toISOString().split('T')[0],
    });
    setCustomTermInput('');
    setFormImages({ front: null, back: null });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    const isCatCustom = Boolean(item.category && !availableCategories.includes(item.category));
    setIsCustomCategory(isCatCustom);
    const validBrands = getAvailableBrandsForCategory(item.category, inventory);
    const isBrCustom = Boolean(item.brand && !validBrands.includes(item.brand));
    setIsCustomBrand(isBrCustom);
    setIsCustomStorage(Boolean(item.storage && !COMMON_STORAGE_OPTIONS.filter(s => s !== 'Other').includes(item.storage)));
    setIsCustomRam(Boolean(item.ram && !COMMON_RAM_OPTIONS.filter(r => r !== 'Other').includes(item.ram)));
    const isGenerated = Boolean(item.barcode && (item.barcode.startsWith('ALZ-') || item.barcode.startsWith('ALZ-QR-')));
    setBarcodeMode(isGenerated ? 'generate' : 'scan');
    const isItemGst = (item.gstRate && item.gstRate > 0) || item.isGst;
    const itemCodeFormat = item.codeFormat || (item.barcode?.includes('QR-') ? 'qr' : 'barcode');
    setFormData({
      category: item.category || 'New Mobiles',
      subCategory: item.subCategory || item.applianceType || item.accessoryType || item.partType || '',
      capacity: item.capacity || '',
      brand: item.brand || 'Universal',
      name: item.name,
      model: item.model || '',
      ram: item.ram || '',
      storage: item.storage || '',
      color: item.color || '',
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
      codeFormat: itemCodeFormat,
      barcode: item.barcode || '',
      imeisText: (item.imeis || []).join('\n'),
      imei1: item.units?.[0]?.imei1 || item.imeis?.[0] || '',
      imei2: item.units?.[0]?.imei2 || item.imeis?.[1] || '',
      warranty: item.warranty || '',
      termsAndConditions: normalizeProductTerms(item.termsAndConditions || item.terms),
      receivedDate: item.receivedDate || (item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    });
    setCustomTermInput('');
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

  const handleSaveBatchMobiles = (newBatchItems) => {
    newBatchItems.forEach(item => {
      if (item.category) saveCustomCategory(item.category);
      if (item.brand) saveCustomBrand(item.brand, item.category);
    });
    setInventory(prev => [...newBatchItems, ...prev]);
    setTaxonomyVer(v => v + 1);
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

    const imeisArray = (formData.imeisText || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (formData.imei1 && !imeisArray.includes(formData.imei1.trim())) {
      imeisArray.unshift(formData.imei1.trim());
    }
    if (formData.imei2 && !imeisArray.includes(formData.imei2.trim())) {
      imeisArray.push(formData.imei2.trim());
    }

    const calculatedStock = imeisArray.length > 0 ? imeisArray.length : parseInt(formData.stock, 10) || 0;
    const finalGstRate = formData.isGst ? (parseFloat(formData.gstRate) || 18) : 0;
    const rackVal = formData.rack.trim().toUpperCase() || 'R-01';
    const binVal = formData.bin.trim().toUpperCase() || 'B-01';

    const unitRecords = (formData.imei1 || formData.imei2) ? [{
      unitId: editingItem?.units?.[0]?.unitId || `UNIT-${Date.now()}`,
      imei1: formData.imei1?.trim() || '',
      imei2: formData.imei2?.trim() || '',
      barcode: formData.barcode,
      color: formData.color,
      rack: rackVal,
      bin: binVal,
      status: 'In Stock'
    }] : (editingItem?.units || []);

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
            subCategory: formData.subCategory.trim(),
            capacity: formData.capacity,
            brand: formData.brand,
            name: formData.name,
            model: formData.model || item.model,
            ram: formData.ram,
            storage: formData.storage,
            color: formData.color,
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
            barcode: (formData.barcode || '').trim(),
            codeFormat: formData.codeFormat || (formData.barcode?.includes('QR-') ? 'qr' : 'barcode'),
            imeis: imeisArray,
            units: unitRecords,
            warranty: formData.warranty,
            termsAndConditions: normalizeProductTerms(formData.termsAndConditions),
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
        subCategory: formData.subCategory.trim(),
        capacity: formData.capacity,
        brand: formData.brand,
        name: formData.name,
        model: formData.model,
        ram: formData.ram,
        storage: formData.storage,
        color: formData.color,
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
        barcode: (formData.barcode || '').trim(),
        codeFormat: formData.codeFormat || (formData.barcode?.includes('QR-') ? 'qr' : 'barcode'),
        imeis: imeisArray,
        units: unitRecords,
        warranty: formData.warranty,
        termsAndConditions: normalizeProductTerms(formData.termsAndConditions),
        receivedDate: formData.receivedDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        images: imagesMeta,
        status: 'Active',
      };
      setInventory(prev => [newItem, ...prev]);
    }

    // Persist custom category & custom brand so they permanently appear in options next time
    if (formData.category && formData.category.trim()) {
      saveCustomCategory(formData.category.trim());
    }
    if (formData.brand && formData.brand.trim()) {
      saveCustomBrand(formData.brand.trim(), formData.category ? formData.category.trim() : 'General');
    }
    if (formData.category && formData.subCategory.trim()) {
      saveCustomSubcategory(formData.subCategory.trim(), formData.category.trim());
    }
    setTaxonomyVer(v => v + 1);

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
              paddingRight: searchTerm ? '5.6rem' : '4.4rem',
              height: '34px',
              fontSize: '0.82rem',
              borderRadius: '8px',
              border: '1.5px solid var(--border-color)',
              width: '100%',
              background: 'var(--bg-main)'
            }}
          />
          <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  if (onClearInitialSearchTerm) onClearInitialSearchTerm();
                }}
                style={{
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
            <button
              type="button"
              onClick={() => {
                setCameraScanTarget('search');
                setShowCameraScanner(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                borderRadius: '5px',
                color: '#FFFFFF',
                padding: '3px 7px',
                cursor: 'pointer',
                fontSize: '0.68rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                boxShadow: '0 1px 4px rgba(16, 185, 129, 0.3)'
              }}
              title="Scan Barcode or QR Code with Camera"
            >
              <Camera size={12} />
              <span>Scan</span>
            </button>
          </div>
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
              title="Table View"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('models')}
              style={{
                padding: '0.28rem 0.5rem',
                borderRadius: '4px',
                background: viewMode === 'models' ? 'var(--surface-primary)' : 'transparent',
                color: viewMode === 'models' ? '#10B981' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
              title="Model-Wise, Colour-Wise & IMEI Directory"
            >
              <Smartphone size={14} />
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
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="btn-primary"
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.76rem',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                }}
                title="Bulk Add products with variants and optional serial tracking"
              >
                <Smartphone size={14} />
                <span>Bulk Add</span>
              </button>

              <button 
                onClick={openAddModal}
                className="btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem', height: '32px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Plus size={14} />
                <span>Add</span>
              </button>

              {inventory.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to remove all ${inventory.length} items from inventory? This will clear test products from local storage, SSD IndexedDB, and Cloud Sync to start fresh.`)) {
                      await purgeAllLegacyOfflineData({ setInventory });
                    }
                  }}
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.74rem',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    color: 'var(--color-danger)',
                    borderColor: 'rgba(239, 68, 68, 0.35)'
                  }}
                  title="Clear All Test Products & Reset Catalog"
                >
                  <Trash2 size={13} color="var(--color-danger)" />
                  <span className="hide-on-mobile">Clear Test Stock</span>
                </button>
              )}
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
      {viewMode === 'models' ? (
        <ModelVariantImeiDirectory
          inventory={inventory}
          onSelectBarcode={onSelectBarcode}
          onPrintBarcodeSheet={onPrintBarcodeSheet}
          onQuickBill={handleSendToPos}
        />
      ) : filteredProducts.length === 0 ? (
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
                  <div className="gold-discount-badge" style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 850,
                    fontSize: '0.68rem',
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

                {/* Variant Specs: Colour / RAM / Storage / IMEIs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {(item.subCategory || item.capacity) && <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(12, 91, 67, 0.08)', color: 'var(--accent-primary)', padding: '0.12rem 0.45rem', borderRadius: '12px' }}>{[item.subCategory, item.capacity].filter(Boolean).join(' · ')}</span>}
                  {item.color && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: 'rgba(0,0,0,0.06)',
                      padding: '0.12rem 0.45rem',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: 'var(--text-primary)'
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.colorHex || getProductColorHex(item.color), border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                      <span>{item.color}</span>
                    </span>
                  )}

                  {(item.ram || item.storage) && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: 'rgba(79, 70, 229, 0.08)',
                      color: 'var(--accent-primary)',
                      padding: '0.12rem 0.45rem',
                      borderRadius: '12px'
                    }}>
                      {[item.ram, item.storage].filter(Boolean).join(' / ')}
                    </span>
                  )}

                  {((item.imeis && item.imeis.length > 0) || (item.units && item.units.length > 0)) && (
                    <button
                      type="button"
                      onClick={() => setActiveImeiViewerItem(item)}
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10B981',
                        border: 'none',
                        padding: '0.12rem 0.45rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      title="Inspect all registered IMEIs for this model"
                    >
                      <Smartphone size={10} />
                      <span>{item.units?.length || item.imeis?.length} IMEIs</span>
                    </button>
                  )}
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

                  {/* QR Specs & Details Scan View */}
                  <button
                    onClick={() => setActiveScanPreviewItem(item)}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '6px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      color: '#059669',
                      cursor: 'pointer'
                    }}
                    title="View QR Specs, Colour Variants & Terms (Customer & Staff Scan View)"
                  >
                    <QrCode size={14} />
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                          {item.brand || 'UNIVERSAL'}
                        </span>
                        {item.color && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.colorHex || getProductColorHex(item.color), border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                            <span>{item.color}</span>
                          </span>
                        )}
                        {(item.ram || item.storage) && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(79,70,229,0.08)', color: 'var(--accent-primary)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                            {[item.ram, item.storage].filter(Boolean).join('/')}
                          </span>
                        )}
                        {((item.imeis && item.imeis.length > 0) || (item.units && item.units.length > 0)) && (
                          <button
                            type="button"
                            onClick={() => setActiveImeiViewerItem(item)}
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#10B981',
                              border: 'none',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            📱 {item.units?.length || item.imeis?.length} IMEIs
                          </button>
                        )}
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
                          <span className="gold-discount-badge" style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.62rem',
                            fontWeight: 850,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px'
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
                        {/* QR Specs Preview */}
                        <button
                          onClick={() => setActiveScanPreviewItem(item)}
                          className="btn-secondary"
                          style={{ padding: '0.28rem 0.45rem', color: '#059669' }}
                          title="View QR Specs, Colour Variants & Terms"
                        >
                          <QrCode size={13} />
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
                  value={isCustomCategory ? 'Other' : formData.category}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setIsCustomCategory(true);
                      setIsCustomSubcategory(false);
                      setIsCustomBrand(false);
                      setFormData(prev => ({ ...prev, category: '', subCategory: '', capacity: '', ram: '', storage: '' }));
                    } else {
                      setIsCustomCategory(false);
                      setIsCustomSubcategory(false);
                      setIsCustomBrand(false);
                      const validBrands = getAvailableBrandsForCategory(val, inventory);
                      const brandStillValid = validBrands.includes(formData.brand);
                      setFormData(prev => ({
                        ...prev,
                        category: val,
                        subCategory: '',
                        capacity: '',
                        ram: ['New Mobiles', 'Used Mobiles'].includes(val) ? (prev.ram || '8GB') : '',
                        storage: ['New Mobiles', 'Used Mobiles'].includes(val) ? (prev.storage || '128GB') : '',
                        brand: brandStillValid ? prev.brand : (validBrands.includes('Universal') ? 'Universal' : validBrands[0])
                      }));
                    }
                  }}
                  className="input-field"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="Other">Other (Add Custom)</option>
                </select>

                {isCustomCategory && (
                  <input
                    type="text"
                    placeholder="Enter custom category..."
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        saveCustomCategory(e.target.value.trim());
                        setTaxonomyVer(v => v + 1);
                      }
                    }}
                    required
                    className="input-field animate-fade-in"
                    style={{ marginTop: '0.3rem' }}
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Subcategory</label>
                <select className="input-field" value={isCustomSubcategory ? 'Other' : formData.subCategory} onChange={(e) => {
                  if (e.target.value === 'Other') { setIsCustomSubcategory(true); setFormData(prev => ({ ...prev, subCategory: '', capacity: '' })); }
                  else { setIsCustomSubcategory(false); setFormData(prev => ({ ...prev, subCategory: e.target.value, capacity: '' })); }
                }}>
                  <option value="">Select subcategory</option>
                  {getAvailableSubcategories(formData.category, inventory).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  <option value="Other">Other (Add Custom)</option>
                </select>
                {isCustomSubcategory && <input type="text" placeholder="Enter custom subcategory..." aria-label="Custom subcategory name" value={formData.subCategory} onChange={(e) => setFormData(prev => ({ ...prev, subCategory: e.target.value }))} onBlur={(e) => { if (e.target.value.trim()) { saveCustomSubcategory(e.target.value, formData.category); setTaxonomyVer(v => v + 1); } }} required className="input-field animate-fade-in" style={{ marginTop: '0.3rem' }} />}
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Brand</label>
                {(() => {
                  const currentBrands = getAvailableBrandsForCategory(formData.category, inventory);
                  const isBrandInList = currentBrands.includes(formData.brand);
                  const selectValue = isCustomBrand ? 'Other' : (isBrandInList ? formData.brand : (formData.brand ? formData.brand : 'Other'));

                  return (
                    <>
                      <select
                        value={selectValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Other') {
                            setIsCustomBrand(true);
                            setFormData(prev => ({ ...prev, brand: '' }));
                          } else {
                            setIsCustomBrand(false);
                            setFormData(prev => ({ ...prev, brand: val }));
                          }
                        }}
                        className="input-field"
                      >
                        {currentBrands.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                        {formData.brand && !currentBrands.includes(formData.brand) && !isCustomBrand && (
                          <option key={formData.brand} value={formData.brand}>{formData.brand}</option>
                        )}
                        <option value="Other">Other (Add Custom)</option>
                      </select>

                      {isCustomBrand && (
                        <input
                          type="text"
                          placeholder="Enter custom brand..."
                          value={formData.brand}
                          onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              saveCustomBrand(e.target.value.trim(), formData.category);
                              setTaxonomyVer(v => v + 1);
                            }
                          }}
                          required
                          className="input-field animate-fade-in"
                          style={{ marginTop: '0.3rem' }}
                          autoFocus={isCustomBrand}
                        />
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Product Specifications: only phones use RAM and storage */}
              {['New Mobiles', 'Used Mobiles'].includes(formData.category) && <><div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>RAM</label>
                <select
                  value={
                    COMMON_RAM_OPTIONS.filter(r => r !== 'Other').includes(formData.ram)
                      ? formData.ram
                      : (formData.ram ? 'Other' : (isCustomRam ? 'Other' : ''))
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setIsCustomRam(true);
                      setFormData(prev => ({ ...prev, ram: '' }));
                    } else {
                      setIsCustomRam(false);
                      setFormData(prev => ({ ...prev, ram: val }));
                    }
                  }}
                  className="input-field"
                >
                  <option value="">Select RAM</option>
                  {COMMON_RAM_OPTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {(isCustomRam || (!COMMON_RAM_OPTIONS.filter(r => r !== 'Other').includes(formData.ram) && formData.ram)) && (
                  <input
                    type="text"
                    placeholder="Type custom RAM (e.g. 32MB, 24GB)..."
                    value={formData.ram}
                    onChange={(e) => setFormData(prev => ({ ...prev, ram: e.target.value }))}
                    className="input-field"
                    style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Storage</label>
                <select
                  value={
                    COMMON_STORAGE_OPTIONS.filter(s => s !== 'Other').includes(formData.storage)
                      ? formData.storage
                      : (formData.storage ? 'Other' : (isCustomStorage ? 'Other' : ''))
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setIsCustomStorage(true);
                      setFormData(prev => ({ ...prev, storage: '' }));
                    } else {
                      setIsCustomStorage(false);
                      setFormData(prev => ({ ...prev, storage: val }));
                    }
                  }}
                  className="input-field"
                >
                  <option value="">Select Storage</option>
                  {COMMON_STORAGE_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {(isCustomStorage || (!COMMON_STORAGE_OPTIONS.filter(s => s !== 'Other').includes(formData.storage) && formData.storage)) && (
                  <input
                    type="text"
                    placeholder="Type custom storage (e.g. 32MB, 2TB)..."
                    value={formData.storage}
                    onChange={(e) => setFormData(prev => ({ ...prev, storage: e.target.value }))}
                    className="input-field"
                    style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}
                    autoFocus
                  />
                )}
              </div>

              </>}

              {formData.category === 'Home Appliances' && <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Capacity / Size</label>
                <input className="input-field" type="text" placeholder="e.g. 240L, 1.5 Ton, 7kg, 55 inch" value={formData.capacity} onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))} />
              </div>}

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Colour</label>
                <select
                  value={POPULAR_COLORS.some(c => c.name === formData.color) ? formData.color : (formData.color ? 'Other' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setFormData(prev => ({ ...prev, color: '' }));
                    } else {
                      setFormData(prev => ({ ...prev, color: val }));
                    }
                  }}
                  className="input-field"
                >
                  <option value="">Select Colour</option>
                  {POPULAR_COLORS.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Other">Other (Custom)</option>
                </select>
                {(!POPULAR_COLORS.some(c => c.name === formData.color) || formData.color === '') && (
                  <input
                    type="text"
                    placeholder="Type custom colour..."
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="input-field"
                    style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}
                  />
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Product Name / Model</label>
                <input
                  type="text"
                  placeholder="e.g. Galaxy S24 5G, iPhone 18 Pro"
                  value={formData.model || ''}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, model: e.target.value }));
                    setShowModelSuggestions(true);
                  }}
                  onFocus={() => setShowModelSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowModelSuggestions(false), 250)}
                  onKeyDown={(e) => {
                    if (!showModelSuggestions || modelSuggestions.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setModelSuggestionIndex(prev => (prev + 1) % modelSuggestions.length);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setModelSuggestionIndex(prev => (prev <= 0 ? modelSuggestions.length - 1 : prev - 1));
                    } else if (e.key === 'Enter' && modelSuggestionIndex >= 0) {
                      e.preventDefault();
                      handleSelectSuggestion(modelSuggestions[modelSuggestionIndex]);
                    } else if (e.key === 'Escape') {
                      setShowModelSuggestions(false);
                    }
                  }}
                  className="input-field"
                  autoComplete="off"
                />

                {showModelSuggestions && modelSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1250,
                      background: 'var(--surface-primary)',
                      border: '1.5px solid var(--accent-primary)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      marginTop: '4px',
                      maxHeight: '240px',
                      overflowY: 'auto'
                    }}
                  >
                    <div style={{
                      padding: '0.3rem 0.55rem',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--accent-primary)',
                      background: 'var(--surface-secondary)',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>Quick Model Auto-Fill</span>
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Enter ↵ to pick</span>
                    </div>
                    {modelSuggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestion(sug);
                        }}
                        onMouseEnter={() => setModelSuggestionIndex(idx)}
                        style={{
                          padding: '0.45rem 0.6rem',
                          cursor: 'pointer',
                          background: idx === modelSuggestionIndex ? 'var(--surface-hover)' : 'transparent',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.4rem'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sug.model || sug.name}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {sug.brand} • {sug.category}
                          </div>
                        </div>
                        {sug.suggestedSell > 0 && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            ₹{sug.suggestedSell.toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ gridColumn: 'span 2', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    Product Name * <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 600 }}>(Auto Suggest)</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="e.g. apple 18 pro, Galaxy S24, Nord CE4"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setShowNameSuggestions(true);
                  }}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 250)}
                  onKeyDown={(e) => {
                    if (!showNameSuggestions || productNameSuggestions.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setNameSuggestionIndex(prev => (prev + 1) % productNameSuggestions.length);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setNameSuggestionIndex(prev => (prev <= 0 ? productNameSuggestions.length - 1 : prev - 1));
                    } else if (e.key === 'Enter' && nameSuggestionIndex >= 0) {
                      e.preventDefault();
                      handleSelectSuggestion(productNameSuggestions[nameSuggestionIndex]);
                    } else if (e.key === 'Escape') {
                      setShowNameSuggestions(false);
                    }
                  }}
                  required
                  className="input-field"
                  autoComplete="off"
                />

                {/* Auto Suggestions Floating Dropdown */}
                {showNameSuggestions && productNameSuggestions.length > 0 && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1300,
                      background: 'var(--surface-primary)',
                      border: '1.5px solid var(--accent-primary)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                      marginTop: '4px',
                      maxHeight: '270px',
                      overflowY: 'auto'
                    }}
                  >
                    <div style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--accent-primary)',
                      background: 'var(--surface-secondary)',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>⚡ Fast Suggestions (Click or Enter to Auto-Fill)</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>↑↓ Arrows to navigate</span>
                    </div>
                    {productNameSuggestions.map((sug, idx) => {
                      const isSelected = idx === nameSuggestionIndex;
                      return (
                        <div
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(sug);
                          }}
                          onMouseEnter={() => setNameSuggestionIndex(idx)}
                          style={{
                            padding: '0.55rem 0.75rem',
                            cursor: 'pointer',
                            background: isSelected ? 'var(--surface-hover)' : 'transparent',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.6rem',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {sug.name}
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '0.08rem 0.38rem',
                                borderRadius: '4px',
                                background: 'rgba(169, 188, 92, 0.18)',
                                color: 'var(--accent-primary)'
                              }}>
                                {sug.brand}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {sug.category} {sug.ram && sug.storage ? `• ${sug.ram}/${sug.storage}` : ''} {sug.color ? `• ${sug.color}` : ''}
                              </span>
                            </div>
                          </div>
                          {sug.suggestedSell > 0 && (
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                ₹{sug.suggestedSell.toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                {sug.source === 'inventory' ? 'Stock ₹' : 'Est. ₹'}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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

              {/* Product Barcode & QR Code (Matches Bulk Design) */}
              <div style={{ gridColumn: 'span 2', background: 'var(--surface-secondary, rgba(255,255,255,0.03))', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                {/* Header row with Title and [Barcode | QR] Switcher */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', margin: 0 }}>
                    {formData.codeFormat === 'qr' ? <QrCode size={16} color="#4F46E5" /> : <Barcode size={16} color="#10B981" />}
                    <span>Barcode & QR Code</span>
                  </label>

                  {/* Compact Pill Switcher: Barcode vs QR vs Both */}
                  <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.12)', padding: '2px', borderRadius: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        let nextCode = formData.barcode;
                        if (nextCode && nextCode.includes('ALZ-QR-')) {
                          nextCode = nextCode.replace('ALZ-QR-', 'ALZ-');
                        }
                        setFormData(prev => ({ ...prev, codeFormat: 'barcode', barcode: nextCode }));
                      }}
                      style={{
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: (formData.codeFormat || 'barcode') === 'barcode' ? '#10B981' : 'transparent',
                        color: (formData.codeFormat || 'barcode') === 'barcode' ? '#FFFFFF' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Set 1D Barcode (Code-128)"
                    >
                      <Barcode size={12} />
                      <span>Barcode</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        let nextCode = formData.barcode;
                        if (nextCode && nextCode.startsWith('ALZ-') && !nextCode.includes('ALZ-QR-')) {
                          nextCode = nextCode.replace('ALZ-', 'ALZ-QR-');
                        } else if (!nextCode) {
                          nextCode = `ALZ-QR-${Date.now().toString().slice(-6)}`;
                        }
                        setFormData(prev => ({ ...prev, codeFormat: 'qr', barcode: nextCode }));
                      }}
                      style={{
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: formData.codeFormat === 'qr' ? '#4F46E5' : 'transparent',
                        color: formData.codeFormat === 'qr' ? '#FFFFFF' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Set 2D QR Code"
                    >
                      <QrCode size={12} />
                      <span>QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        let nextCode = formData.barcode;
                        if (!nextCode) {
                          nextCode = `ALZ-${Date.now().toString().slice(-6)}`;
                        }
                        setFormData(prev => ({ ...prev, codeFormat: 'both', barcode: nextCode }));
                      }}
                      style={{
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: formData.codeFormat === 'both' ? '#2563EB' : 'transparent',
                        color: formData.codeFormat === 'both' ? '#FFFFFF' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Include both 1D Barcode & 2D QR Code on the same sticker"
                    >
                      <Layers size={12} />
                      <span>Both</span>
                    </button>
                  </div>
                </div>

                {/* Input row: allows typing own barcode / QR code or scanning / generating */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={formData.codeFormat === 'qr' ? "e.g. ALZ-QR-429177 or custom QR text / link" : "e.g. 8901234567890 or ALZ-429177"}
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    className="input-field"
                    style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '0.85rem', 
                      fontWeight: 700,
                      flex: 1,
                      color: formData.barcode ? (formData.codeFormat === 'qr' ? '#4F46E5' : 'var(--text-primary)') : 'var(--text-muted)'
                    }}
                  />

                  {/* Camera Scanner Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCameraScanTarget('barcode');
                      setShowCameraScanner(true);
                    }}
                    className="btn-secondary"
                    style={{
                      padding: '0.42rem 0.65rem',
                      fontSize: '0.74rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      whiteSpace: 'nowrap'
                    }}
                    title="Scan box barcode or QR with phone camera"
                  >
                    <Camera size={13} />
                    <span>Scan</span>
                  </button>

                  {/* Reset / New Auto Code */}
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = formData.codeFormat === 'qr' ? 'ALZ-QR' : 'ALZ';
                      setFormData(prev => ({ ...prev, barcode: `${prefix}-${Date.now().toString().slice(-6)}` }));
                    }}
                    className="btn-secondary"
                    style={{
                      padding: '0.42rem 0.65rem',
                      fontSize: '0.74rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      whiteSpace: 'nowrap'
                    }}
                    title="Generate new unique ALZ code"
                  >
                    <RefreshCw size={12} />
                    <span>New</span>
                  </button>

                  {/* Download Sticker button */}
                  {formData.barcode && (
                    <button
                      type="button"
                      onClick={() => downloadStickerImage({
                        title: formData.name || 'Product',
                        barcode: formData.barcode,
                        codeFormat: formData.codeFormat || (formData.barcode.includes('QR-') ? 'qr' : 'barcode'),
                        price: formData.sellPrice || 0,
                        mrp: formData.mrp || formData.sellPrice || 0,
                        shopName: shopConfig?.name || 'ALZINO MOBILES'
                      })}
                      className="btn-secondary"
                      style={{
                        padding: '0.42rem 0.65rem',
                        fontSize: '0.74rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: '#2563EB',
                        whiteSpace: 'nowrap'
                      }}
                      title="Download 50x25mm label sticker as PNG image"
                    >
                      <Download size={12} />
                      <span>Download</span>
                    </button>
                  )}

                  {/* Print Sticker button */}
                  {formData.barcode && onPrintBarcodeSheet && (
                    <button
                      type="button"
                      onClick={() => onPrintBarcodeSheet({
                        title: formData.name || 'Product',
                        barcode: formData.barcode,
                        codeFormat: formData.codeFormat || (formData.barcode.includes('QR-') ? 'qr' : 'barcode'),
                        price: formData.sellPrice || 0,
                        mrp: formData.mrp || formData.sellPrice || 0,
                        copies: 1,
                        format: 'single'
                      })}
                      className="btn-secondary"
                      style={{
                        padding: '0.42rem 0.65rem',
                        fontSize: '0.74rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: formData.codeFormat === 'qr' ? '#4F46E5' : '#10B981',
                        whiteSpace: 'nowrap'
                      }}
                      title="Print 50x25mm single sticker"
                    >
                      <Printer size={12} />
                      <span>Print</span>
                    </button>
                  )}

                  {/* Delete / Clear Button */}
                  {formData.barcode ? (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, barcode: '' }))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '0.35rem 0.5rem',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Delete code (stores as empty in database)"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = formData.codeFormat === 'qr' ? 'ALZ-QR' : 'ALZ';
                        setFormData(prev => ({ ...prev, barcode: `${prefix}-${Date.now().toString().slice(-6)}` }));
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#10B981',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.35rem 0.45rem',
                        whiteSpace: 'nowrap'
                      }}
                      title="Add code"
                    >
                      + Add
                    </button>
                  )}
                </div>

                {/* Status & Live Preview */}
                <div style={{ marginTop: '0.45rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.68rem', color: formData.barcode ? 'var(--text-muted)' : '#EF4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {formData.barcode ? (
                      `Format: ${formData.codeFormat === 'both' ? 'Both (1D Barcode + 2D QR)' : formData.codeFormat === 'qr' ? '2D QR Code' : '1D Barcode (Code-128)'} • Type custom code or scan`
                    ) : (
                      '⚠️ No barcode or QR code assigned (will be stored as empty in database)'
                    )}
                  </span>
                </div>

                {/* Vector SVG Live Preview */}
                {formData.barcode && (
                  <div style={{ 
                    marginTop: '0.45rem', 
                    background: '#FFFFFF', 
                    padding: '0.45rem', 
                    borderRadius: '6px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    border: '1px solid #E2E8F0' 
                  }}>
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: renderCodeSvg(formData.barcode, formData.codeFormat || (formData.barcode.includes('QR-') ? 'qr' : 'barcode'), 190, 50, true) 
                      }} 
                    />
                  </div>
                )}
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

              {/* IMEI 1 & IMEI 2 with Camera Scanner */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>IMEI 1 (SIM 1)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraScanTarget('imei1');
                      setShowCameraScanner(true);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#10B981', cursor: 'pointer', padding: 0 }}
                    title="Camera Scan IMEI 1"
                  >
                    <Camera size={13} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="15-digit IMEI 1"
                  value={formData.imei1 || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, imei1: e.target.value }))}
                  className="input-field"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>IMEI 2 (SIM 2 / eSIM)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraScanTarget('imei2');
                      setShowCameraScanner(true);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#10B981', cursor: 'pointer', padding: 0 }}
                    title="Camera Scan IMEI 2"
                  >
                    <Camera size={13} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="15-digit IMEI 2 (optional)"
                  value={formData.imei2 || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, imei2: e.target.value }))}
                  className="input-field"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                />
              </div>

              {/* TERMS & CONDITIONS (SHOWN UPON SCANNING QR OR BARCODE) */}
              <div style={{
                gridColumn: 'span 2',
                backgroundColor: 'var(--bg-main)',
                padding: '0.85rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>📜 Product Terms & Conditions</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      (Displayed upon scanning QR or Barcode)
                    </span>
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                    {(formData.termsAndConditions || []).length} active policies
                  </span>
                </div>

                {/* Quick Pre-set Pills */}
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Quick-Add Pre-set Policies (Tap to add/remove):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {STANDARD_PRODUCT_TERMS_PRESETS.map((preset) => {
                      const isSelected = (formData.termsAndConditions || []).some(t => t.includes(preset.text) || preset.text.includes(t));
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => {
                              const current = prev.termsAndConditions || [];
                              if (isSelected) {
                                return { ...prev, termsAndConditions: current.filter(t => !t.includes(preset.text) && !preset.text.includes(t)) };
                              } else {
                                return { ...prev, termsAndConditions: [...current, preset.text] };
                              }
                            });
                          }}
                          style={{
                            padding: '0.25rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-primary)',
                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Terms List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '160px', overflowY: 'auto' }}>
                  {(formData.termsAndConditions || []).map((term, tIdx) => (
                    <div 
                      key={tIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        padding: '0.35rem 0.6rem',
                        backgroundColor: 'var(--surface-primary)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.4rem', flex: 1 }}>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{tIdx + 1}.</span>
                        <span style={{ color: 'var(--text-primary)', lineHeight: 1.35 }}>{term}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            termsAndConditions: (prev.termsAndConditions || []).filter((_, idx) => idx !== tIdx)
                          }));
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                        title="Delete condition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Custom Condition Input */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <input
                    type="text"
                    placeholder="Type custom condition (e.g. Free tempered glass & cover, Festive store offer)..."
                    value={customTermInput}
                    onChange={(e) => setCustomTermInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customTermInput.trim()) {
                          setFormData(prev => ({
                            ...prev,
                            termsAndConditions: [...(prev.termsAndConditions || []), customTermInput.trim()]
                          }));
                          setCustomTermInput('');
                        }
                      }
                    }}
                    className="input-field"
                    style={{ fontSize: '0.74rem', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customTermInput.trim()) {
                        setFormData(prev => ({
                          ...prev,
                          termsAndConditions: [...(prev.termsAndConditions || []), customTermInput.trim()]
                        }));
                        setCustomTermInput('');
                      }
                    }}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', fontWeight: 700 }}
                  >
                    + Add
                  </button>
                </div>
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
          onClick={() => { setQuickBarcodeItem(null); setQuickLabelFormat(null); setQuickLabelQty(1); }}
          style={{ zIndex: 1200 }}
        >
          <div 
            className="modal-dialog animate-fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', width: '92%', padding: '1.25rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <QrCode size={18} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Product Barcode / QR Label</h3>
              </div>
              <button onClick={() => { setQuickBarcodeItem(null); setQuickLabelFormat(null); setQuickLabelQty(1); }} className="btn-secondary" style={{ padding: '0.2rem 0.45rem' }}>
                <X size={15} />
              </button>
            </div>

            {(() => {
              const activeFormat = quickLabelFormat || quickBarcodeItem.codeFormat || (quickBarcodeItem.barcode?.includes('QR-') ? 'qr' : 'barcode');
              const effectiveBarcode = quickBarcodeItem.barcode || `ALZ-${quickBarcodeItem.id}`;
              return (
                <>
                  {/* Selector: Barcode vs QR vs Both */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Label Format:
                    </div>
                    <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.08)', padding: '2px', borderRadius: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setQuickLabelFormat('barcode')}
                        style={{
                          padding: '0.22rem 0.55rem',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: activeFormat === 'barcode' ? '#10B981' : 'transparent',
                          color: activeFormat === 'barcode' ? '#FFFFFF' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Barcode size={12} />
                        <span>Barcode</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickLabelFormat('qr')}
                        style={{
                          padding: '0.22rem 0.55rem',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: activeFormat === 'qr' ? '#4F46E5' : 'transparent',
                          color: activeFormat === 'qr' ? '#FFFFFF' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <QrCode size={12} />
                        <span>QR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickLabelFormat('both')}
                        style={{
                          padding: '0.22rem 0.55rem',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: activeFormat === 'both' ? '#2563EB' : 'transparent',
                          color: activeFormat === 'both' ? '#FFFFFF' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title="Include both 1D Barcode & 2D QR Code on the same sticker"
                      >
                        <Layers size={12} />
                        <span>Both</span>
                      </button>
                    </div>
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
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0F251E', marginBottom: '2px' }}>
                      {shopConfig?.name || 'ALZINO MOBILES'}
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px', lineHeight: 1.2 }}>
                      {quickBarcodeItem.name}
                    </div>

                    {/* Barcode / QR SVG Rendering */}
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: renderCodeSvg(
                          effectiveBarcode, 
                          activeFormat, 
                          240, 
                          activeFormat === 'both' ? 55 : (activeFormat === 'qr' ? 80 : 60), 
                          true
                        ) 
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

                  {/* Quantity Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0.45rem 0.65rem', background: 'var(--surface-secondary, rgba(0,0,0,0.03))', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Copies / Qty:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setQuickLabelQty(Math.max(1, quickLabelQty - 1))}
                        className="btn-secondary"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.8rem', fontWeight: 800 }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={quickLabelQty}
                        onChange={(e) => setQuickLabelQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        style={{ width: '48px', textAlign: 'center', padding: '0.2rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setQuickLabelQty(quickLabelQty + 1)}
                        className="btn-secondary"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.8rem', fontWeight: 800 }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        if (onSelectBarcode) {
                          onSelectBarcode({ ...quickBarcodeItem, codeFormat: activeFormat });
                        }
                        setQuickBarcodeItem(null);
                        setQuickLabelFormat(null);
                      }}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '0.55rem', fontSize: '0.78rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
                      title="Open Studio to print full 24 or 40 barcode label sheets"
                    >
                      <span>Full Sheet Studio ➔</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        downloadStickerImage({
                          title: quickBarcodeItem.name,
                          barcode: effectiveBarcode,
                          codeFormat: activeFormat,
                          price: quickBarcodeItem.sellPrice,
                          mrp: quickBarcodeItem.mrp || quickBarcodeItem.sellPrice,
                          shopName: shopConfig?.name || 'ALZINO MOBILES'
                        });
                      }}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '0.55rem', fontSize: '0.78rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#2563EB', whiteSpace: 'nowrap' }}
                      title="Download sticker as high-resolution PNG image"
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>

                    <button
                      onClick={() => {
                        if (onPrintBarcodeSheet) {
                          onPrintBarcodeSheet({
                            title: quickBarcodeItem.name,
                            barcode: effectiveBarcode,
                            codeFormat: activeFormat,
                            price: quickBarcodeItem.sellPrice,
                            mrp: quickBarcodeItem.mrp || quickBarcodeItem.sellPrice,
                            copies: quickLabelQty,
                            format: 'single',
                          });
                          setQuickBarcodeItem(null);
                          setQuickLabelFormat(null);
                        } else {
                          window.print();
                        }
                      }}
                      className="btn-primary"
                      style={{ flex: 1.1, padding: '0.55rem', fontSize: '0.8rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-contrast, #FFFFFF)', whiteSpace: 'nowrap' }}
                    >
                      <Printer size={14} />
                      <span>Print Sticker</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Mobile / Webcam Barcode Scanner Modal */}
      {showCameraScanner && (
        <CameraBarcodeScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onScan={(scannedCode) => {
            handleBarcodeOrImeiScanned(scannedCode, cameraScanTarget);
          }}
          title={cameraScanTarget === 'imei1' ? "Scan IMEI 1 Barcode" : cameraScanTarget === 'imei2' ? "Scan IMEI 2 Barcode" : "Scan Product Box Barcode"}
          description="Point your phone camera or webcam at the barcode on the box"
        />
      )}

      {/* Bulk Add products, variants, and optional serial tracking */}
      {showBulkModal && (
        <BulkMobileVariantEntryModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          onSaveBatch={handleSaveBatchMobiles}
          onPrintBarcodeSheet={onPrintBarcodeSheet}
          inventory={inventory}
        />
      )}

      {/* Product QR Specs & Terms Details Modal */}
      {activeScanPreviewItem && (
        <ProductScanDetailsModal
          product={activeScanPreviewItem}
          inventory={inventory}
          isOpen={!!activeScanPreviewItem}
          onClose={() => setActiveScanPreviewItem(null)}
          onQuickBill={onQuickBill}
          shopConfig={shopConfig}
          role={role}
        />
      )}

      {/* Quick IMEI Inspector Modal */}
      {activeImeiViewerItem && (
        <div className="modal-backdrop no-print" style={{ zIndex: 1250, padding: '1rem' }}>
          <div className="modal-dialog" style={{ maxWidth: '650px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Smartphone size={18} color="#10B981" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Registered IMEIs & Units</h3>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {activeImeiViewerItem.name} ({activeImeiViewerItem.stock} in stock)
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveImeiViewerItem(null)} className="btn-secondary" style={{ padding: '0.2rem 0.45rem' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '450px' }}>
              {activeImeiViewerItem.units && activeImeiViewerItem.units.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {activeImeiViewerItem.units.map((u, idx) => (
                    <div 
                      key={u.unitId || idx}
                      style={{
                        padding: '0.6rem 0.8rem',
                        background: 'var(--bg-main)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>#{idx + 1}</span>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{u.color || activeImeiViewerItem.color || 'Standard'}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Shelf: {u.rack || activeImeiViewerItem.rack}/{u.bin || activeImeiViewerItem.bin}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                          {u.imei1 && (
                            <span style={{ color: '#10B981', fontWeight: 700 }}>IMEI 1: {u.imei1}</span>
                          )}
                          {u.imei2 && (
                            <span style={{ color: 'var(--text-muted)' }}>IMEI 2: {u.imei2}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        {onPrintBarcodeSheet && u.barcode && (
                          <button
                            type="button"
                            onClick={() => onPrintBarcodeSheet({
                              title: activeImeiViewerItem.name,
                              barcode: u.barcode,
                              price: activeImeiViewerItem.sellPrice,
                              mrp: activeImeiViewerItem.mrp || activeImeiViewerItem.sellPrice,
                              copies: 1,
                              format: 'single'
                            })}
                            className="btn-secondary"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <Printer size={11} />
                            <span>Sticker</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(u.imei1 || u.barcode, `view-${idx}`)}
                          className="btn-secondary"
                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem' }}
                        >
                          {copiedId === `view-${idx}` ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeImeiViewerItem.imeis && activeImeiViewerItem.imeis.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {activeImeiViewerItem.imeis.map((im, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'var(--bg-main)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#10B981' }}>#{idx + 1} IMEI: {im}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(im, `raw-${idx}`)}
                        className="btn-secondary"
                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem' }}
                      >
                        {copiedId === `raw-${idx}` ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No IMEIs assigned to this item.
                </div>
              )}
            </div>

            <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setActiveImeiViewerItem(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
