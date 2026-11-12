import React, { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Barcode, 
  Smartphone,
  Truck,
  FileCheck,
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
  Printer,
  Sparkles,
  Camera,
  RefreshCw,
  QrCode,
  Download,
  Layers
} from 'lucide-react';
const MarketPriceCompareModal = lazy(() => import('./MarketPriceCompareModal'));
import { ProductImagePicker, ProductImageViewer } from './ProductImages';
import { saveProductImage, getProductImage, deleteProductImages } from '../utils/productImageStore';
import { renderBarcodeSvg, renderCodeSvg, downloadStickerImage } from '../utils/barcode';
const CameraBarcodeScannerModal = lazy(() => import('./CameraBarcodeScannerModal'));
const BulkMobileVariantEntryModal = lazy(() => import('./BulkMobileVariantEntryModal'));
import { COMMON_RAM_OPTIONS, COMMON_STORAGE_OPTIONS } from '../utils/productEntryOptions';
import { POPULAR_COLORS } from '../utils/colorUtils';
import { getProductColorHex } from '../utils/colorUtils';
const ModelVariantImeiDirectory = lazy(() => import('./ModelVariantImeiDirectory'));
const ProductScanDetailsModal = lazy(() => import('./ProductScanDetailsModal'));
import { 
  STANDARD_PRODUCT_TERMS_PRESETS, 
  normalizeProductTerms, 
  findProductFromScan,
  buildProductScanUrl
} from '../utils/productTerms';
import {
  BASE_CATEGORIES,
  BASE_MOBILE_BRANDS,
  BASE_APPLIANCE_BRANDS,
  BASE_ACCESSORY_BRANDS,
  BASE_SPARE_PARTS_BRANDS,
  getAvailableCategories,
  normalizeProductCategory,
  isImeiTrackedCategory,
  productCategoriesMatch,
  isUsedMobileProduct,
  getAvailableBrandsForCategory,
  saveCustomCategory,
  saveCustomBrand,
  getAvailableSubcategories,
  saveCustomSubcategory
} from '../utils/customTaxonomy';
import { getProductSuggestions, lookupProductByBarcodeOrImei } from '../utils/productSuggestions';
import { getSupplierBillDocument } from '../utils/supplierBillStore';

export const MOBILE_BRANDS = BASE_MOBILE_BRANDS;
export const APPLIANCE_BRANDS = BASE_APPLIANCE_BRANDS;
export const ACCESSORY_BRANDS = BASE_ACCESSORY_BRANDS;
export const SPARE_PARTS_BRANDS = BASE_SPARE_PARTS_BRANDS;
export const STANDARD_CATEGORIES = BASE_CATEGORIES;
export const getBrandsForCategory = (category, inv = []) => getAvailableBrandsForCategory(category, inv);

const parseImeiLines = value => String(value || '').split(/[\n,;]+/).map(value => value.trim()).filter(Boolean);
const isMobileStockCategory = isImeiTrackedCategory;
const requiresPairedImeis = category => ['New Mobiles', 'Used Mobiles'].includes(normalizeProductCategory(category));
const getTrackedIdentifierCount = item => {
  const identifiers = isMobileStockCategory(item?.category)
    ? [
        ...(Array.isArray(item?.imeis) ? item.imeis.filter(value => typeof value === 'string') : []),
        item?.imei1, item?.imei2,
        ...(item?.units || []).flatMap(unit => [unit.imei1, unit.imei2])
      ]
    : [
        ...(item?.serialNumbers || []),
        ...(Array.isArray(item?.imeis) ? item.imeis.filter(value => typeof value === 'string') : []),
        ...(item?.units || []).flatMap(unit => [unit.serialNumber, unit.imei1, unit.imei2])
      ];
  return new Set(identifiers.filter(Boolean).map(value => String(value).trim())).size;
};
const getFirstTrackedIdentifier = item => isMobileStockCategory(item?.category)
  ? item?.imeis?.[0] || item?.imei1 || item?.units?.find(unit => unit.imei1 || unit.imei2)?.imei1 || item?.units?.find(unit => unit.imei2)?.imei2
  : item?.serialNumbers?.[0] || item?.imeis?.[0] || item?.units?.find(unit => unit.serialNumber || unit.imei1 || unit.imei2)?.serialNumber || item?.units?.find(unit => unit.imei1 || unit.imei2)?.imei1;

// Older inventory records can have IMEIs on the product (`imeis` / `imei1` /
// `imei2`) while newer records keep them on `units`. Prefer unit data when it
// exists, but fall back per SIM slot so an incomplete legacy `units` array
// cannot make previously saved IMEIs disappear from the edit form.
const readStoredImeiFields = item => {
  const units = Array.isArray(item?.units) ? item.units : [];
  const legacyImeis = Array.isArray(item?.imeis)
    ? item.imeis.flatMap(value => typeof value === 'string' ? parseImeiLines(value) : [value?.imei1, value?.imei2, value?.imei, value?.serialNumber].filter(Boolean))
    : parseImeiLines(item?.imeis);
  const legacyImei1 = parseImeiLines(item?.imei1);
  const legacyImei2 = parseImeiLines(item?.imei2);
  const alternatingImei1 = legacyImeis.filter((_, index) => index % 2 === 0);
  const alternatingImei2 = legacyImeis.filter((_, index) => index % 2 === 1);
  const unitImei1 = units.map(unit => parseImeiLines(unit?.imei1 || unit?.imei || unit?.serialNumber)[0] || '');
  const unitImei2 = units.map(unit => parseImeiLines(unit?.imei2 || unit?.secondImei)[0] || '');
  const hasUnitImei1 = unitImei1.some(Boolean);
  const hasUnitImei2 = unitImei2.some(Boolean);

  return {
    imei1: hasUnitImei1 ? unitImei1.map((value, index) => value || legacyImei1[index] || alternatingImei1[index] || '') : (legacyImei1.length ? legacyImei1 : alternatingImei1),
    imei2: hasUnitImei2 ? unitImei2.map((value, index) => value || legacyImei2[index] || alternatingImei2[index] || '') : (legacyImei2.length ? legacyImei2 : alternatingImei2),
    legacyImeis: Array.isArray(item?.imeis) ? item.imeis.filter(value => typeof value === 'string') : legacyImeis,
  };
};


export default function InventoryManager({ 
  inventory, 
  setInventory, 
  suppliers = [],
  setSuppliers,
  role, 
  onSelectBarcode,
  onPrintBarcodeSheet,
  shopConfig,
  onQuickBill,
  initialSearchTerm,
  onClearInitialSearchTerm,
  onOpenUsedMobileIntake
}) {
  // View mode: 'cards' | 'table'
  const [viewMode, setViewMode] = useState('cards');

  // Fast Filters
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [subcategoryFilter, setSubcategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in-stock' | 'low' | 'out'
  const [sortBy, setSortBy] = useState('default');
  const [inventoryDisplayLimit, setInventoryDisplayLimit] = useState(60);

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
  const [supplierHistoryItem, setSupplierHistoryItem] = useState(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierDetails, setNewSupplierDetails] = useState({ name: '', contactPerson: '', phone: '', city: '', gstin: '' });
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
    ram: '',
    storage: '',
    color: '',
    description: '',
    isGst: true,
    hsn: '851712',
    gstRate: 18,
    buyPrice: '',
    buyPriceIncludesGst: true,
    sellPrice: '',
    mrp: '',
    stock: 1,
    lowStockThreshold: 2,
    rack: 'R-01',
    bin: 'B-01',
    codeFormat: 'barcode',
    barcode: '',
    imei1: '',
    imei2: '',
    serialNumbers: '',
    warranty: '',
    termsAndConditions: [],
    receivedDate: new Date().toISOString().split('T')[0],
    isPublished: true,
    supplierId: '',
  });

  const [taxonomyVer, setTaxonomyVer] = useState(0);

  useEffect(() => {
    const handleTaxonomyUpdated = () => setTaxonomyVer(v => v + 1);
    window.addEventListener('alzino:taxonomy-updated', handleTaxonomyUpdated);
    return () => window.removeEventListener('alzino:taxonomy-updated', handleTaxonomyUpdated);
  }, []);

  const availableCategories = useMemo(() => {
    return getAvailableCategories(inventory);
  }, [inventory, taxonomyVer]);

  const productEntryCategories = useMemo(() => {
    const categoriesForEntry = availableCategories.filter(category => category !== 'Used Mobiles');
    // Keep an existing used phone's category visible while editing legacy stock,
    // but never offer it for a new generic stock entry.
    if (editingItem?.category === 'Used Mobiles' && !categoriesForEntry.includes('Used Mobiles')) {
      categoriesForEntry.push('Used Mobiles');
    }
    return categoriesForEntry;
  }, [availableCategories, editingItem]);

  const categories = useMemo(() => {
    const hasProducts = category => inventory.some(item => {
      const isUsedItem = isUsedMobileProduct(item);
      const normalized = normalizeProductCategory(category);
      return (normalized === 'Used Mobiles' && isUsedItem) ||
        (productCategoriesMatch(item.category, category) && !(normalized === 'New Mobiles' && isUsedItem));
    });
    return ['All', ...availableCategories.filter(hasProducts)];
  }, [availableCategories, inventory]);

  const categoryCounts = useMemo(() => {
    const counts = new Map([['All', inventory.length]]);
    availableCategories.forEach(category => {
      const normalized = normalizeProductCategory(category);
      counts.set(category, inventory.filter(item => {
        const isUsedItem = isUsedMobileProduct(item);
        return (normalized === 'Used Mobiles' && isUsedItem) ||
          (productCategoriesMatch(item.category, category) && !(normalized === 'New Mobiles' && isUsedItem));
      }).length);
    });
    return counts;
  }, [availableCategories, inventory]);

  const activeSubcategories = useMemo(() => {
    if (categoryFilter === 'All') return [];
    return [...new Set(inventory.filter(item => {
      const isUsedItem = isUsedMobileProduct(item);
      return categoryFilter === 'Used Mobiles' ? isUsedItem : productCategoriesMatch(item.category, categoryFilter) && !(categoryFilter === 'New Mobiles' && isUsedItem);
    }).map(item => String(item.subCategory || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [inventory, categoryFilter]);

  const activeSubcategoryCounts = useMemo(() => {
    const counts = new Map();
    if (categoryFilter === 'All') return counts;
    inventory.forEach(item => {
      const isUsedItem = isUsedMobileProduct(item);
      const isInCategory = categoryFilter === 'Used Mobiles'
        ? isUsedItem
        : productCategoriesMatch(item.category, categoryFilter) && !(categoryFilter === 'New Mobiles' && isUsedItem);
      const subcategory = String(item.subCategory || '').trim();
      if (isInCategory && subcategory) counts.set(subcategory, (counts.get(subcategory) || 0) + 1);
    });
    return counts;
  }, [inventory, categoryFilter]);

  useEffect(() => {
    if (!categories.includes(categoryFilter)) {
      setCategoryFilter('All');
      setSubcategoryFilter('All');
    } else if (subcategoryFilter !== 'All' && !activeSubcategories.includes(subcategoryFilter)) {
      setSubcategoryFilter('All');
    }
  }, [categories, categoryFilter, subcategoryFilter, activeSubcategories]);

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