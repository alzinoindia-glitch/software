import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Smartphone, 
  Plus, 
  Trash2, 
  Barcode, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  FileSpreadsheet, 
  Camera, 
  X, 
  Copy, 
  Check, 
  ArrowRight,
  Layers,
  Printer,
  Hash,
  QrCode,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MOBILE_BRANDS } from './InventoryManager';
import { getAvailableBrandsForCategory, saveCustomBrand } from '../utils/customTaxonomy';
import { getProductSuggestions } from '../utils/productSuggestions';
import { renderCodeSvg } from '../utils/barcode';
import CameraBarcodeScannerModal from './CameraBarcodeScannerModal';
import { POPULAR_COLORS, getProductColorHex } from '../utils/colorUtils';
import { compressImageFile, saveProductImage } from '../utils/productImageStore';

export const COMMON_RAM_OPTIONS = ['3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '24GB', 'Other'];
export const COMMON_STORAGE_OPTIONS = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', 'Other'];
export { POPULAR_COLORS, getProductColorHex };

export default function BulkMobileVariantEntryModal({ 
  isOpen, 
  onClose, 
  onSaveBatch, 
  onPrintBarcodeSheet 
}) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'excel'

  // Common Model Details
  const [modelDetails, setModelDetails] = useState({
    brand: 'Samsung',
    model: '',
    ram: '8GB',
    customRam: '',
    storage: '256GB',
    customStorage: '',
    category: 'New Mobiles',
    buyPrice: '',
    sellPrice: '',
    mrp: '',
    hsn: '851712',
    gstRate: 18,
    rack: 'R-01',
    bin: 'B-01',
    warranty: '1 Year Brand Warranty',
    receivedDate: new Date().toISOString().split('T')[0],
  });

  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const availableBrands = useMemo(() => {
    return getAvailableBrandsForCategory('New Mobiles');
  }, []);

  // Fast Model Auto-Suggestions
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [modelSuggestionIndex, setModelSuggestionIndex] = useState(-1);

  const modelSuggestions = useMemo(() => {
    if (!modelDetails.model || modelDetails.model.trim().length < 2) return [];
    return getProductSuggestions(modelDetails.model, [], 6);
  }, [modelDetails.model]);

  const handleSelectModelSuggestion = (sug) => {
    setModelDetails(prev => ({
      ...prev,
      brand: sug.brand || prev.brand,
      model: sug.model || sug.name,
      ram: sug.ram || prev.ram,
      storage: sug.storage || prev.storage,
      buyPrice: prev.buyPrice ? prev.buyPrice : (sug.suggestedBuy ? String(sug.suggestedBuy) : ''),
      sellPrice: prev.sellPrice ? prev.sellPrice : (sug.suggestedSell ? String(sug.suggestedSell) : ''),
      mrp: prev.mrp ? prev.mrp : (sug.suggestedSell ? String(sug.suggestedSell) : '')
    }));
    setShowModelSuggestions(false);
    setModelSuggestionIndex(-1);
  };

  // Colour Variants list: [{ id, color, hex, qty, image }]
  const [colourVariants, setColourVariants] = useState([
    { id: 'cv-1', color: 'Onyx Black', hex: '#1C1C1E', qty: 2, image: null },
    { id: 'cv-2', color: 'Marble Gray', hex: '#686B6F', qty: 2, image: null }
  ]);
  const [newColorInput, setNewColorInput] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#EC4899');
  const [previewImage, setPreviewImage] = useState(null); // { url, title }

  // Physical Units matrix: [{ id, variantId, color, unitNo, imei1, imei2, barcode }]
  const [units, setUnits] = useState([]);
  const [codeFormat, setCodeFormat] = useState('barcode'); // 'barcode' | 'qr'
  const [previewUnit, setPreviewUnit] = useState(null);

  // Batch paste modal state
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteTargetField, setPasteTargetField] = useState('imei1'); // 'imei1' | 'imei2'

  // Camera scanner state
  const [activeScanUnitIndex, setActiveScanUnitIndex] = useState(null);
  const [activeScanField, setActiveScanField] = useState('imei1'); // 'imei1' | 'imei2' | 'barcode'

  // Excel Import state
  const [excelRows, setExcelRows] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelErrors, setExcelErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-generate units whenever colourVariants change in count or quantity
  useEffect(() => {
    setUnits(prevUnits => {
      const newUnits = [];
      const brandCode = (modelDetails.brand || 'MOB').slice(0, 3).toUpperCase();
      const modelCode = (modelDetails.model || 'GEN').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
      const prefix = codeFormat === 'qr' ? 'ALZ-QR' : 'ALZ';
      let globalIndex = 1;

      colourVariants.forEach(variant => {
        const colorName = variant.color || 'Standard';
        const colorSlug = colorName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
        const qty = Math.max(0, parseInt(variant.qty, 10) || 0);

        for (let i = 1; i <= qty; i++) {
          const unitKey = `${variant.id}-${i}`;
          // Preserve already typed IMEI/barcode if user previously entered it
          const existing = prevUnits.find(u => u.unitKey === unitKey) || prevUnits[globalIndex - 1];

          const defaultBarcode = `${prefix}-${brandCode}-${modelCode}-${colorSlug}-${String(i).padStart(2, '0')}`;

          newUnits.push({
            id: `UNIT-${Date.now()}-${globalIndex}`,
            unitKey,
            variantId: variant.id,
            color: colorName,
            colorHex: variant.hex || getProductColorHex(colorName),
            image: variant.image || null,
            unitNo: i,
            globalIndex,
            imei1: existing?.imei1 || '',
            imei2: existing?.imei2 || '',
            barcode: existing?.barcode || defaultBarcode
          });
          globalIndex++;
        }
      });

      return newUnits;
    });
  }, [colourVariants, modelDetails.brand, modelDetails.model, codeFormat]);

  // Total quantity of units
  const totalStockCount = useMemo(() => {
    return colourVariants.reduce((sum, v) => sum + (Math.max(0, parseInt(v.qty, 10) || 0)), 0);
  }, [colourVariants]);

  // Effective RAM & Storage
  const effectiveRam = modelDetails.ram === 'Other' ? (modelDetails.customRam || '') : modelDetails.ram;
  const effectiveStorage = modelDetails.storage === 'Other' ? (modelDetails.customStorage || '') : modelDetails.storage;

  // Add a new colour to the variants list
  const handleAddColor = (colorName, hex = null, image = null) => {
    if (!colorName.trim()) return;
    const exists = colourVariants.some(c => c.color.toLowerCase() === colorName.trim().toLowerCase());
    if (exists) {
      alert(`Colour "${colorName}" is already in this model.`);
      return;
    }
    const resolvedHex = hex || getProductColorHex(colorName, customColorHex || '#EC4899');
    setColourVariants(prev => [
      ...prev,
      { id: `cv-${Date.now()}`, color: colorName.trim(), hex: resolvedHex, qty: 1, image: image || null }
    ]);
    setNewColorInput('');
    setCustomColorHex('#EC4899');
  };

  const handleUpdateColorHex = (id, newHex) => {
    setColourVariants(prev => prev.map(c => c.id === id ? { ...c, hex: newHex } : c));
  };

  const handleUpdateColorImage = async (id, file) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 720, 0.8);
      setColourVariants(prev => prev.map(c => c.id === id ? { ...c, image: compressed } : c));
    } catch (err) {
      alert(err.message || 'Could not load photo');
    }
  };

  const handleRemoveColorImage = (id) => {
    setColourVariants(prev => prev.map(c => c.id === id ? { ...c, image: null } : c));
  };

  const handleRemoveColor = (id) => {
    if (colourVariants.length <= 1) {
      alert('At least one colour variant is required.');
      return;
    }
    setColourVariants(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateColorQty = (id, newQty) => {
    const parsed = Math.max(0, parseInt(newQty, 10) || 0);
    setColourVariants(prev => prev.map(c => c.id === id ? { ...c, qty: parsed } : c));
  };

  // Update a specific unit's field (IMEI 1, IMEI 2, Barcode)
  const handleUnitChange = (index, field, value) => {
    setUnits(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  // Auto-advance input on barcode scanner enter press
  const handleUnitKeyDown = (e, index, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Jump to next field or next unit's IMEI 1
      const nextInput = document.querySelector(`input[data-unit-idx="${index}"][data-field="${field === 'imei1' ? 'imei2' : 'imei1'}"]`) ||
                         document.querySelector(`input[data-unit-idx="${index + 1}"][data-field="imei1"]`);
      if (nextInput) nextInput.focus();
    }
  };

  // Auto-Fill Mock IMEIs for rapid testing
  const handleAutoFillMockImeis = () => {
    const timestampPrefix = Date.now().toString().slice(-9);
    setUnits(prev => prev.map((unit, idx) => ({
      ...unit,
      imei1: unit.imei1 || `86345${timestampPrefix}${String(idx + 1).padStart(2, '0')}`,
      imei2: unit.imei2 || `86346${timestampPrefix}${String(idx + 1).padStart(2, '0')}`
    })));
  };

  // Toggle Admin Choice: Barcode (Code-128) vs QR Code (2D)
  const handleToggleCodeFormat = (newFormat) => {
    setCodeFormat(newFormat);
    const brandCode = (modelDetails.brand || 'MOB').slice(0, 3).toUpperCase();
    const modelCode = (modelDetails.model || 'GEN').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const prefix = newFormat === 'qr' ? 'ALZ-QR' : 'ALZ';
    setUnits(prev => prev.map(unit => {
      const colorSlug = unit.color.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
      return {
        ...unit,
        barcode: `${prefix}-${brandCode}-${modelCode}-${colorSlug}-${String(unit.unitNo).padStart(2, '0')}`
      };
    }));
  };

  // Regenerate clean barcodes/QR codes for all physical units
  const handleRegenerateBarcodes = () => {
    const brandCode = (modelDetails.brand || 'MOB').slice(0, 3).toUpperCase();
    const modelCode = (modelDetails.model || 'GEN').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const prefix = codeFormat === 'qr' ? 'ALZ-QR' : 'ALZ';
    setUnits(prev => prev.map(unit => {
      const colorSlug = unit.color.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
      return {
        ...unit,
        barcode: `${prefix}-${brandCode}-${modelCode}-${colorSlug}-${String(unit.unitNo).padStart(2, '0')}`
      };
    }));
  };

  // 1-Click Print Stickers for all units
  const handlePrintAllStickers = () => {
    if (!onPrintBarcodeSheet || units.length === 0) return;
    onPrintBarcodeSheet({
      title: `${modelDetails.brand} ${modelDetails.model} (${modelDetails.ram}/${modelDetails.storage})`,
      barcode: units[0]?.barcode || 'ALZ-001',
      codeFormat,
      price: modelDetails.sellPrice || 0,
      mrp: modelDetails.mrp || modelDetails.sellPrice || 0,
      copies: units.length,
      format: 'sheet24'
    });
  };

  // Batch paste IMEIs from clipboard or supplier list
  const handleApplyPasteImeis = () => {
    const lines = pasteText
      .split(/[\n,\t\r]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      alert('Please enter or paste at least one IMEI.');
      return;
    }

    setUnits(prev => {
      const copy = [...prev];
      lines.forEach((line, idx) => {
        if (copy[idx]) {
          copy[idx] = { ...copy[idx], [pasteTargetField]: line };
        }
      });
      return copy;
    });

    setShowPasteModal(false);
    setPasteText('');
  };

  // =========================================================================
  // SUBMIT MANUAL BULK ENTRY: Save All Units to Inventory
  // =========================================================================
  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();

    if (!modelDetails.model.trim()) {
      alert('Please enter Mobile Model Name (e.g. Galaxy S24 5G, iPhone 15).');
      return;
    }
    if (!modelDetails.sellPrice || parseFloat(modelDetails.sellPrice) <= 0) {
      alert('Please enter a valid Selling Price.');
      return;
    }
    if (totalStockCount <= 0) {
      alert('Please add at least 1 unit quantity.');
      return;
    }

    const brandName = modelDetails.brand.trim() || 'Universal';
    saveCustomBrand(brandName, 'New Mobiles');
    const modelName = modelDetails.model.trim();
    const buyPrice = parseFloat(modelDetails.buyPrice) || 0;
    const sellPrice = parseFloat(modelDetails.sellPrice) || 0;
    const mrp = parseFloat(modelDetails.mrp) || sellPrice;
    const finalGstRate = parseFloat(modelDetails.gstRate) || 18;
    const rackVal = (modelDetails.rack || 'R-01').trim().toUpperCase();
    const binVal = (modelDetails.bin || 'B-01').trim().toUpperCase();

    // Group units by colour variant to create distinct inventory items
    // (One inventory item per Colour Variant, each holding its stock & distinct IMEIs)
    const newInventoryItems = [];
    for (const variant of colourVariants) {
      const variantUnits = units.filter(u => u.variantId === variant.id);
      const variantQty = variantUnits.length;

      // Extract all IMEIs for fast POS lookup (both IMEI 1 and IMEI 2)
      const variantImeis = [];
      variantUnits.forEach(u => {
        if (u.imei1) variantImeis.push(u.imei1.trim());
        if (u.imei2) variantImeis.push(u.imei2.trim());
      });

      const variantName = `${brandName} ${modelName} (${effectiveRam}/${effectiveStorage} - ${variant.color})`;
      const primaryBarcode = variantUnits[0]?.barcode || `ALZ-${Date.now().toString().slice(-6)}`;
      const allBarcodes = variantUnits.map(u => u.barcode).filter(Boolean);
      const prodId = `PROD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

      if (variant.image) {
        try {
          await saveProductImage(prodId, 'front', variant.image);
        } catch (err) {
          console.warn('Could not save variant image to IndexedDB:', err);
        }
      }

      newInventoryItems.push({
        id: prodId,
        category: modelDetails.category,
        brand: brandName,
        model: modelName,
        name: variantName,
        ram: effectiveRam,
        storage: effectiveStorage,
        color: variant.color,
        colorHex: variant.hex || getProductColorHex(variant.color),
        image: variant.image || null,
        images: variant.image ? { front: true, back: false, v: Date.now() } : undefined,
        description: `${brandName} ${modelName} ${effectiveRam}/${effectiveStorage} with ${variant.color} finish. Official GST Inward.`,
        isGst: finalGstRate > 0,
        hsn: modelDetails.hsn || '851712',
        gstRate: finalGstRate,
        buyPrice,
        sellPrice,
        mrp,
        stock: variantQty,
        lowStockThreshold: 2,
        rack: rackVal,
        bin: binVal,
        locations: [{ rack: rackVal, bin: binVal, qty: variantQty }],
        barcode: primaryBarcode,
        barcodes: allBarcodes,
        codeFormat: codeFormat,
        imeis: variantImeis,
        units: variantUnits.map(u => ({
          unitId: u.id,
          imei1: u.imei1.trim(),
          imei2: u.imei2.trim(),
          barcode: u.barcode.trim(),
          codeFormat: codeFormat,
          color: variant.color,
          colorHex: variant.hex || getProductColorHex(variant.color),
          image: variant.image || null,
          rack: rackVal,
          bin: binVal,
          status: 'In Stock'
        })),
        warranty: modelDetails.warranty,
        receivedDate: modelDetails.receivedDate,
        createdAt: new Date().toISOString(),
        status: 'Active'
      });
    }

    onSaveBatch(newInventoryItems);
    alert(`✓ Successfully added ${totalStockCount} mobiles across ${colourVariants.length} colour variants into inventory!`);
    onClose();
  };

  // =========================================================================
  // EXCEL / CSV BULK IMPORT ENGINE
  // =========================================================================
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        Brand: 'Samsung',
        Model: 'Galaxy S24 5G',
        RAM: '8GB',
        Storage: '256GB',
        Colour: 'Onyx Black',
        Quantity: 2,
        IMEI1: '863456051234561',
        IMEI2: '863456051234562',
        Barcode: 'ALZ-SAM-S24-BLK-01',
        PurchasePrice: 65000,
        SellingPrice: 74999,
        MRP: 79999,
        Rack: 'R-01',
        Bin: 'B-01',
        Warranty: '1 Year Brand Warranty'
      },
      {
        Brand: 'Samsung',
        Model: 'Galaxy S24 5G',
        RAM: '8GB',
        Storage: '256GB',
        Colour: 'Marble Gray',
        Quantity: 3,
        IMEI1: '863456051234563',
        IMEI2: '863456051234564',
        Barcode: 'ALZ-SAM-S24-GRY-01',
        PurchasePrice: 65000,
        SellingPrice: 74999,
        MRP: 79999,
        Rack: 'R-01',
        Bin: 'B-02',
        Warranty: '1 Year Brand Warranty'
      },
      {
        Brand: 'Apple',
        Model: 'iPhone 15',
        RAM: '6GB',
        Storage: '128GB',
        Colour: 'Blue',
        Quantity: 2,
        IMEI1: '358249051234567',
        IMEI2: '358249051234568',
        Barcode: 'ALZ-APP-IP15-BLU-01',
        PurchasePrice: 58000,
        SellingPrice: 65999,
        MRP: 69900,
        Rack: 'R-02',
        Bin: 'B-01',
        Warranty: '1 Year Apple Warranty'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk_Mobiles_Template');
    XLSX.writeFile(wb, 'ALZINO_Bulk_Mobiles_Template.xlsx');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setExcelErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!json || json.length === 0) {
          setExcelErrors(['Uploaded file contains no data rows.']);
          return;
        }

        const errors = [];
        const parsedRows = json.map((row, idx) => {
          const brand = row.Brand || row.brand || 'Universal';
          saveCustomBrand(String(brand).trim(), 'New Mobiles');
          const model = row.Model || row.model || '';
          const sellPrice = parseFloat(row.SellingPrice || row.SellPrice || row.price || 0);

          if (!model) errors.push(`Row ${idx + 2}: Missing Model name`);
          if (!sellPrice || sellPrice <= 0) errors.push(`Row ${idx + 2}: Missing or invalid Selling Price`);

          return {
            rowNo: idx + 2,
            brand: String(brand).trim(),
            model: String(model).trim(),
            ram: String(row.RAM || row.ram || '8GB').trim(),
            storage: String(row.Storage || row.storage || '128GB').trim(),
            colour: String(row.Colour || row.Color || row.colour || row.color || 'Standard').trim(),
            quantity: Math.max(1, parseInt(row.Quantity || row.quantity || row.Qty || row.qty || 1, 10)),
            imei1: String(row.IMEI1 || row.imei1 || row.IMEI || row.imei || '').trim(),
            imei2: String(row.IMEI2 || row.imei2 || '').trim(),
            barcode: String(row.Barcode || row.barcode || `ALZ-EX-${Date.now().toString().slice(-4)}-${idx + 1}`).trim(),
            purchasePrice: parseFloat(row.PurchasePrice || row.BuyPrice || row.buyPrice || 0),
            sellPrice,
            mrp: parseFloat(row.MRP || row.mrp || sellPrice),
            rack: String(row.Rack || row.rack || 'R-01').trim().toUpperCase(),
            bin: String(row.Bin || row.bin || 'B-01').trim().toUpperCase(),
            warranty: String(row.Warranty || row.warranty || '1 Year Brand Warranty').trim(),
          };
        });

        setExcelRows(parsedRows);
        setExcelErrors(errors);
      } catch (err) {
        console.error('Failed to parse Excel file:', err);
        setExcelErrors(['Invalid file format. Please upload a valid .xlsx or .csv file.']);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportExcelRows = () => {
    if (excelRows.length === 0) {
      alert('No rows found to import.');
      return;
    }
    if (excelErrors.length > 0) {
      if (!confirm(`There are ${excelErrors.length} validation warnings. Do you still want to import valid rows?`)) {
        return;
      }
    }

    setIsImporting(true);

    // Group rows by Brand + Model + RAM + Storage + Colour
    const grouped = {};
    excelRows.forEach(row => {
      const key = `${row.brand}|${row.model}|${row.ram}|${row.storage}|${row.colour}`.toLowerCase();
      if (!grouped[key]) {
        grouped[key] = {
          brand: row.brand,
          model: row.model,
          ram: row.ram,
          storage: row.storage,
          colour: row.colour,
          purchasePrice: row.purchasePrice,
          sellPrice: row.sellPrice,
          mrp: row.mrp,
          rack: row.rack,
          bin: row.bin,
          warranty: row.warranty,
          units: []
        };
      }

      // Add physical units for this row
      for (let i = 0; i < row.quantity; i++) {
        const uBarcode = row.quantity === 1 ? row.barcode : `${row.barcode}-${i + 1}`;
        grouped[key].units.push({
          unitId: `UNIT-EX-${Date.now()}-${Math.random()}`,
          imei1: i === 0 ? row.imei1 : '',
          imei2: i === 0 ? row.imei2 : '',
          barcode: uBarcode,
          color: row.colour,
          rack: row.rack,
          bin: row.bin,
          status: 'In Stock'
        });
      }
    });

    const newInventoryItems = Object.values(grouped).map((group, gIdx) => {
      const variantName = `${group.brand} ${group.model} (${group.ram}/${group.storage} - ${group.colour})`;
      const variantImeis = [];
      group.units.forEach(u => {
        if (u.imei1) variantImeis.push(u.imei1);
        if (u.imei2) variantImeis.push(u.imei2);
      });

      return {
        id: `PROD-EX-${Date.now()}-${gIdx + 1}`,
        category: 'New Mobiles',
        brand: group.brand,
        model: group.model,
        name: variantName,
        ram: group.ram,
        storage: group.storage,
        color: group.colour,
        description: `${group.brand} ${group.model} ${group.ram}/${group.storage} (${group.colour}) Imported via Excel.`,
        isGst: true,
        hsn: '851712',
        gstRate: 18,
        buyPrice: group.purchasePrice,
        sellPrice: group.sellPrice,
        mrp: group.mrp,
        stock: group.units.length,
        lowStockThreshold: 2,
        rack: group.rack,
        bin: group.bin,
        locations: [{ rack: group.rack, bin: group.bin, qty: group.units.length }],
        barcode: group.units[0]?.barcode || `ALZ-EX-${Date.now().toString().slice(-6)}`,
        barcodes: group.units.map(u => u.barcode).filter(Boolean),
        imeis: variantImeis,
        units: group.units,
        warranty: group.warranty,
        receivedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        status: 'Active'
      };
    });

    onSaveBatch(newInventoryItems);
    setIsImporting(false);
    alert(`✓ Successfully imported ${excelRows.reduce((acc, r) => acc + r.quantity, 0)} mobile units into ALZINO inventory!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop no-print" style={{ zIndex: 1200, padding: '1rem' }}>
      <div 
        className="modal-dialog" 
        style={{ 
          maxWidth: '1100px', 
          width: '100%', 
          maxHeight: '92vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Modal Top Header */}
        <div style={{
          padding: '1.1rem 1.4rem',
          background: 'var(--surface-header, #1F2937)',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              padding: '0.5rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
            }}>
              <Smartphone size={22} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Bulk Add Mobiles / Variants / IMEI Batch Entry
                </h3>
                <span style={{ 
                  fontSize: '0.7rem', 
                  background: 'rgba(16, 185, 129, 0.2)', 
                  color: '#34D399', 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '20px', 
                  fontWeight: 700 
                }}>
                  Retail Fast-Inward
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF', marginTop: '0.15rem' }}>
                Enter Model & Price once • Add Colour variants • Input IMEI 1 & 2 per piece • Save all units together
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Tab Switcher */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'manual' ? '#10B981' : 'transparent',
                  color: activeTab === 'manual' ? '#FFFFFF' : '#9CA3AF',
                  transition: 'all 0.15s ease'
                }}
              >
                ⚡ Fast Variant Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'excel' ? '#10B981' : 'transparent',
                  color: activeTab === 'excel' ? '#FFFFFF' : '#9CA3AF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileSpreadsheet size={13} />
                <span>Excel / CSV Bulk Import</span>
              </button>
            </div>

            <button 
              onClick={onClose} 
              style={{ 
                background: 'rgba(255,255,255,0.1)', 
                border: 'none', 
                color: '#FFF', 
                borderRadius: '8px', 
                padding: '0.4rem', 
                cursor: 'pointer' 
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', background: 'var(--bg-main, #F9FAFB)' }}>
          {activeTab === 'manual' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* STEP 1: MODEL & SPECIFICATIONS CARD (ENTER ONLY ONCE) */}
              <div style={{
                background: 'var(--surface-primary, #FFFFFF)',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #E5E7EB)',
                padding: '1.1rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem', borderBottom: '1px solid var(--border-color, #E5E7EB)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      width: '22px', 
                      height: '22px', 
                      borderRadius: '50%', 
                      background: '#10B981', 
                      color: '#FFF', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '0.75rem', 
                      fontWeight: 800 
                    }}>
                      1
                    </span>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Common Model & Purchase Details (Enter Once)
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Applies automatically across all colour variants
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  {/* Brand */}
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Brand *</label>
                    <select
                      value={isCustomBrand ? 'Other' : (availableBrands.includes(modelDetails.brand) ? modelDetails.brand : (modelDetails.brand || 'Other'))}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Other') {
                          setIsCustomBrand(true);
                          setModelDetails({ ...modelDetails, brand: '' });
                        } else {
                          setIsCustomBrand(false);
                          setModelDetails({ ...modelDetails, brand: val });
                        }
                      }}
                      className="input-field"
                    >
                      {availableBrands.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      {modelDetails.brand && !availableBrands.includes(modelDetails.brand) && !isCustomBrand && (
                        <option key={modelDetails.brand} value={modelDetails.brand}>{modelDetails.brand}</option>
                      )}
                      <option value="Other">Other (Add Custom)</option>
                    </select>

                    {isCustomBrand && (
                      <input
                        type="text"
                        placeholder="Enter custom brand..."
                        value={modelDetails.brand}
                        onChange={(e) => setModelDetails({ ...modelDetails, brand: e.target.value })}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            saveCustomBrand(e.target.value.trim(), 'New Mobiles');
                          }
                        }}
                        required
                        className="input-field animate-fade-in"
                        style={{ marginTop: '0.3rem' }}
                        autoFocus
                      />
                    )}
                  </div>

                  {/* Model Name */}
                  <div style={{ gridColumn: 'span 2', position: 'relative' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                      Model Name * <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 600 }}>(type half name for instant suggestions)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. apple 18 pro, Galaxy S24, Nord CE4"
                      value={modelDetails.model}
                      onChange={(e) => {
                        setModelDetails({ ...modelDetails, model: e.target.value });
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
                          handleSelectModelSuggestion(modelSuggestions[modelSuggestionIndex]);
                        } else if (e.key === 'Escape') {
                          setShowModelSuggestions(false);
                        }
                      }}
                      className="input-field"
                      style={{ fontWeight: 700 }}
                      autoComplete="off"
                    />

                    {/* Floating Model Suggestions */}
                    {showModelSuggestions && modelSuggestions.length > 0 && (
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
                          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                          marginTop: '4px',
                          maxHeight: '230px',
                          overflowY: 'auto'
                        }}
                      >
                        <div style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: 'var(--accent-primary)',
                          background: 'var(--surface-secondary)',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span>⚡ Fast Model Pick (Click or Enter ↵)</span>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Auto-fills brand, specs & price</span>
                        </div>
                        {modelSuggestions.map((sug, idx) => (
                          <div
                            key={idx}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectModelSuggestion(sug);
                            }}
                            onMouseEnter={() => setModelSuggestionIndex(idx)}
                            style={{
                              padding: '0.5rem 0.65rem',
                              cursor: 'pointer',
                              background: idx === modelSuggestionIndex ? 'var(--surface-hover)' : 'transparent',
                              borderBottom: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                {sug.model || sug.name}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', gap: '0.3rem', alignItems: 'center', marginTop: '0.1rem' }}>
                                <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{sug.brand}</span>
                                {sug.ram && sug.storage ? <span>• {sug.ram}/{sug.storage}</span> : null}
                              </div>
                            </div>
                            {sug.suggestedSell > 0 && (
                              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                ₹{sug.suggestedSell.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RAM */}
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>RAM *</label>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <select
                        value={modelDetails.ram}
                        onChange={(e) => setModelDetails({ ...modelDetails, ram: e.target.value })}
                        className="input-field"
                      >
                        {COMMON_RAM_OPTIONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {modelDetails.ram === 'Other' && (
                        <input
                          type="text"
                          placeholder="e.g. 18GB"
                          value={modelDetails.customRam}
                          onChange={(e) => setModelDetails({ ...modelDetails, customRam: e.target.value })}
                          className="input-field"
                          style={{ width: '80px' }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Storage */}
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Storage *</label>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <select
                        value={modelDetails.storage}
                        onChange={(e) => setModelDetails({ ...modelDetails, storage: e.target.value })}
                        className="input-field"
                      >
                        {COMMON_STORAGE_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {modelDetails.storage === 'Other' && (
                        <input
                          type="text"
                          placeholder="e.g. 2TB"
                          value={modelDetails.customStorage}
                          onChange={(e) => setModelDetails({ ...modelDetails, customStorage: e.target.value })}
                          className="input-field"
                          style={{ width: '80px' }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Buy Price */}
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Purchase Cost ₹</label>
                    <input
                      type="number"
                      placeholder="Cost ₹"
                      value={modelDetails.buyPrice}
                      onChange={(e) => setModelDetails({ ...modelDetails, buyPrice: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Selling Price ₹ *</label>
                    <input
                      type="number"
                      placeholder="Sell ₹"
                      value={modelDetails.sellPrice}
                      onChange={(e) => setModelDetails({ ...modelDetails, sellPrice: e.target.value })}
                      className="input-field"
                      style={{ fontWeight: 800, color: 'var(--accent-primary, #10B981)' }}
                    />
                  </div>

                  {/* MRP */}
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Box MRP ₹</label>
                    <input
                      type="number"
                      placeholder="Box MRP"
                      value={modelDetails.mrp}
                      onChange={(e) => setModelDetails({ ...modelDetails, mrp: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  {/* Rack & Bin */}
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Shelf Rack & Bin</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                      <input
                        type="text"
                        placeholder="R-01"
                        value={modelDetails.rack}
                        onChange={(e) => setModelDetails({ ...modelDetails, rack: e.target.value })}
                        className="input-field"
                        style={{ textTransform: 'uppercase' }}
                      />
                      <input
                        type="text"
                        placeholder="B-01"
                        value={modelDetails.bin}
                        onChange={(e) => setModelDetails({ ...modelDetails, bin: e.target.value })}
                        className="input-field"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>

                  {/* Warranty */}
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Warranty</label>
                    <input
                      type="text"
                      placeholder="e.g. 1 Year Brand Warranty"
                      value={modelDetails.warranty}
                      onChange={(e) => setModelDetails({ ...modelDetails, warranty: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: COLOUR VARIANTS & QUANTITIES */}
              <div style={{
                background: 'var(--surface-primary, #FFFFFF)',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #E5E7EB)',
                padding: '1.1rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem', borderBottom: '1px solid var(--border-color, #E5E7EB)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      width: '22px', 
                      height: '22px', 
                      borderRadius: '50%', 
                      background: '#10B981', 
                      color: '#FFF', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '0.75rem', 
                      fontWeight: 800 
                    }}>
                      2
                    </span>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Colour Variants & Stock Quantities
                    </h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 800, 
                      color: '#10B981', 
                      background: 'rgba(16, 185, 129, 0.1)', 
                      padding: '0.25rem 0.65rem', 
                      borderRadius: '8px' 
                    }}>
                      Total Stock: {totalStockCount} Physical Mobiles
                    </span>
                  </div>
                </div>

                {/* Popular Color Chips for 1-Click Adding */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Quick-Add Popular Mobile Colours:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {POPULAR_COLORS.map(c => {
                      const isAdded = colourVariants.some(v => v.color.toLowerCase() === c.name.toLowerCase());
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleAddColor(c.name, c.hex)}
                          disabled={isAdded}
                          style={{
                            padding: '0.22rem 0.55rem',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            borderRadius: '20px',
                            border: '1px solid var(--border-color, #D1D5DB)',
                            background: isAdded ? 'rgba(0,0,0,0.05)' : 'var(--bg-main, #FFFFFF)',
                            color: isAdded ? 'var(--text-muted)' : 'var(--text-primary)',
                            cursor: isAdded ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            opacity: isAdded ? 0.6 : 1
                          }}
                        >
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: c.hex, border: '1px solid rgba(0,0,0,0.2)' }} />
                          <span>{c.name}</span>
                          {isAdded ? <Check size={11} color="#10B981" /> : <Plus size={11} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colour Variant Rows */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  {colourVariants.map((variant, idx) => (
                    <div 
                      key={variant.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color, #E5E7EB)',
                        background: 'var(--bg-main, #F9FAFB)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.65rem'
                      }}
                    >
                      {/* Left: Swatch + Variant info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                        <label title="Click to adjust color shade" style={{ cursor: 'pointer', position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ 
                            width: '20px', 
                            height: '20px', 
                            borderRadius: '50%', 
                            backgroundColor: variant.hex || getProductColorHex(variant.color), 
                            border: '2px solid rgba(0,0,0,0.15)',
                            display: 'inline-block',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }} />
                          <input
                            type="color"
                            value={variant.hex || getProductColorHex(variant.color)}
                            onChange={(e) => handleUpdateColorHex(variant.id, e.target.value)}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                          />
                        </label>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {variant.color}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            Variant #{idx + 1}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Colour Image Upload & Preview */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                        {variant.image ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <div 
                              onClick={() => setPreviewImage({ url: variant.image, title: `${variant.color} finish photo` })}
                              title="Click to zoom image"
                              style={{ 
                                width: '36px', 
                                height: '36px', 
                                borderRadius: '6px', 
                                overflow: 'hidden', 
                                border: '1px solid var(--border-color, #D1D5DB)', 
                                cursor: 'pointer',
                                background: '#FFF',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <img 
                                src={variant.image} 
                                alt={variant.color} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <label 
                                title="Change photo" 
                                style={{ 
                                  cursor: 'pointer', 
                                  color: 'var(--accent-primary)', 
                                  padding: '1px', 
                                  display: 'flex', 
                                  alignItems: 'center' 
                                }}
                              >
                                <Camera size={13} />
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  style={{ display: 'none' }} 
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleUpdateColorImage(variant.id, e.target.files[0]);
                                  }} 
                                />
                              </label>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveColorImage(variant.id)}
                                title="Remove photo"
                                style={{ 
                                  background: 'transparent', 
                                  border: 'none', 
                                  color: '#EF4444', 
                                  cursor: 'pointer', 
                                  padding: '1px', 
                                  display: 'flex', 
                                  alignItems: 'center' 
                                }}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label 
                            title={`Upload photo for ${variant.color}`} 
                            style={{ 
                              cursor: 'pointer', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.25rem', 
                              fontSize: '0.72rem', 
                              fontWeight: 700,
                              padding: '0.3rem 0.55rem', 
                              borderRadius: '6px', 
                              background: 'rgba(79, 70, 229, 0.08)', 
                              color: 'var(--accent-primary, #4F46E5)', 
                              border: '1px dashed var(--accent-primary, #4F46E5)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Camera size={13} />
                            <span>Add Photo</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              style={{ display: 'none' }} 
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleUpdateColorImage(variant.id, e.target.files[0]);
                              }} 
                            />
                          </label>
                        )}
                      </div>

                      {/* Right: Quantity & Remove */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Qty:</span>
                          <input
                            type="number"
                            min="0"
                            value={variant.qty}
                            onChange={(e) => handleUpdateColorQty(variant.id, e.target.value)}
                            style={{
                              width: '50px',
                              padding: '0.25rem 0.35rem',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              textAlign: 'center',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color, #D1D5DB)'
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveColor(variant.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '0.2rem'
                          }}
                          title="Remove colour variant"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Colour Input */}
                <div style={{ display: 'flex', gap: '0.4rem', maxWidth: '420px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Enter custom colour (e.g. Pink, Coral, Mint)..."
                      value={newColorInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewColorInput(val);
                        if (val.trim()) {
                          setCustomColorHex(getProductColorHex(val));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddColor(newColorInput, customColorHex);
                        }
                      }}
                      className="input-field"
                      style={{ fontSize: '0.78rem', paddingRight: '2.5rem' }}
                    />
                    <label 
                      title="Custom colour shade" 
                      style={{ 
                        position: 'absolute', 
                        right: '8px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center' 
                      }}
                    >
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: customColorHex || getProductColorHex(newColorInput),
                        border: '1px solid rgba(0,0,0,0.2)',
                        display: 'inline-block'
                      }} />
                      <input
                        type="color"
                        value={customColorHex || '#EC4899'}
                        onChange={(e) => setCustomColorHex(e.target.value)}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddColor(newColorInput, customColorHex)}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Plus size={13} />
                    <span>Add Colour</span>
                  </button>
                </div>
              </div>

              {/* STEP 3: PHYSICAL MOBILE UNITS & IMEI 1 / IMEI 2 ENTRY MATRIX */}
              <div style={{
                background: 'var(--surface-primary, #FFFFFF)',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #E5E7EB)',
                padding: '1.1rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color, #E5E7EB)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      width: '22px', 
                      height: '22px', 
                      borderRadius: '50%', 
                      background: '#10B981', 
                      color: '#FFF', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '0.75rem', 
                      fontWeight: 800 
                    }}>
                      3
                    </span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Unit-by-Unit IMEI 1 & IMEI 2 Matrix ({units.length} Physical Phones)
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Type or laser scan IMEIs • Alzino auto-generates 100% scannable Barcodes or QR Codes
                      </span>
                    </div>
                  </div>

                  {/* Fast Helper Actions */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Admin Choice: Barcode vs QR Code */}
                    <div style={{ display: 'inline-flex', background: 'var(--bg-main, #F3F4F6)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color, #E5E7EB)' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleCodeFormat('barcode')}
                        style={{
                          padding: '0.24rem 0.55rem',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          background: codeFormat === 'barcode' ? '#10B981' : 'transparent',
                          color: codeFormat === 'barcode' ? '#FFFFFF' : 'var(--text-muted, #6B7280)',
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
                        onClick={() => handleToggleCodeFormat('qr')}
                        style={{
                          padding: '0.24rem 0.55rem',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          background: codeFormat === 'qr' ? '#4F46E5' : 'transparent',
                          color: codeFormat === 'qr' ? '#FFFFFF' : 'var(--text-muted, #6B7280)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <QrCode size={12} />
                        <span>QR Code</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPasteModal(true)}
                      className="btn-secondary"
                      style={{ padding: '0.28rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Paste multi-line IMEIs from invoice or email"
                    >
                      <Copy size={12} />
                      <span>Batch Paste IMEIs</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAutoFillMockImeis}
                      className="btn-secondary"
                      style={{ padding: '0.28rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10B981' }}
                      title="Generate mock 15-digit IMEIs for testing"
                    >
                      <Sparkles size={12} />
                      <span>Auto-Generate Demo IMEIs</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRegenerateBarcodes}
                      className="btn-secondary"
                      style={{ padding: '0.28rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Regenerate unique SKU/Barcodes for each unit"
                    >
                      <RefreshCw size={12} />
                      <span>Reset {codeFormat === 'qr' ? 'QR Codes' : 'Barcodes'}</span>
                    </button>

                    {onPrintBarcodeSheet && (
                      <button
                        type="button"
                        onClick={handlePrintAllStickers}
                        disabled={units.length === 0}
                        className="btn-secondary"
                        style={{ padding: '0.28rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#4F46E5' }}
                        title="Print stickers for all physical units"
                      >
                        <Printer size={12} />
                        <span>Print Labels</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Units List */}
                {units.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No physical units configured. Please add colour variants and quantities above.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                    {units.map((unit, idx) => (
                      <div 
                        key={unit.unitKey || idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 2fr 2fr 1.6fr',
                          gap: '0.65rem',
                          alignItems: 'center',
                          padding: '0.55rem 0.75rem',
                          background: idx % 2 === 0 ? 'var(--bg-main, #F9FAFB)' : 'var(--surface-primary, #FFFFFF)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color, #E5E7EB)'
                        }}
                      >
                        {/* Unit Label & Colour */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 800, 
                            fontFamily: 'var(--font-mono)', 
                            background: 'rgba(0,0,0,0.06)', 
                            padding: '0.15rem 0.4rem', 
                            borderRadius: '4px' 
                          }}>
                            #{unit.globalIndex}
                          </span>
                          {unit.image && (
                            <img 
                              src={unit.image} 
                              alt={unit.color}
                              onClick={() => setPreviewImage({ url: unit.image, title: `${unit.color} - Unit #${unit.unitNo}` })}
                              title="Click to zoom image"
                              style={{ width: '26px', height: '26px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer', flexShrink: 0 }}
                            />
                          )}
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: unit.colorHex || getProductColorHex(unit.color), border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {unit.color}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                              Unit {unit.unitNo} of {unit.color}
                            </span>
                          </div>
                        </div>

                        {/* IMEI 1 (SIM 1) */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                            <label style={{ fontSize: '0.66rem', fontWeight: 700, color: '#10B981' }}>
                              IMEI 1 (SIM 1) *
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveScanUnitIndex(idx);
                                setActiveScanField('imei1');
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#10B981', cursor: 'pointer', padding: 0 }}
                              title="Scan IMEI 1 with phone camera"
                            >
                              <Camera size={11} />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. 86345605..."
                            data-unit-idx={idx}
                            data-field="imei1"
                            value={unit.imei1}
                            onChange={(e) => handleUnitChange(idx, 'imei1', e.target.value)}
                            onKeyDown={(e) => handleUnitKeyDown(e, idx, 'imei1')}
                            className="input-field"
                            style={{ 
                              padding: '0.28rem 0.5rem', 
                              fontSize: '0.78rem', 
                              fontFamily: 'var(--font-mono)', 
                              border: unit.imei1 ? '1px solid #10B981' : '1px solid var(--border-color, #D1D5DB)' 
                            }}
                          />
                        </div>

                        {/* IMEI 2 (SIM 2 / eSIM) */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                            <label style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              IMEI 2 (Optional)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveScanUnitIndex(idx);
                                setActiveScanField('imei2');
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                              title="Scan IMEI 2 with phone camera"
                            >
                              <Camera size={11} />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. 86345606..."
                            data-unit-idx={idx}
                            data-field="imei2"
                            value={unit.imei2}
                            onChange={(e) => handleUnitChange(idx, 'imei2', e.target.value)}
                            onKeyDown={(e) => handleUnitKeyDown(e, idx, 'imei2')}
                            className="input-field"
                            style={{ padding: '0.28rem 0.5rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
                          />
                        </div>

                        {/* Unique Unit Barcode / SKU */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                            <label style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              Unit {codeFormat === 'qr' ? 'QR Code' : 'Barcode'}
                            </label>
                            <button
                              type="button"
                              onClick={() => setPreviewUnit(unit)}
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: codeFormat === 'qr' ? '#4F46E5' : '#10B981', 
                                cursor: 'pointer', 
                                padding: 0, 
                                fontSize: '0.66rem', 
                                fontWeight: 800, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '2px' 
                              }}
                              title={`Preview & Print ${codeFormat === 'qr' ? 'QR Code' : 'Barcode'} Sticker`}
                            >
                              <Eye size={11} />
                              <span>View</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={unit.barcode}
                            onChange={(e) => handleUnitChange(idx, 'barcode', e.target.value)}
                            className="input-field"
                            style={{ 
                              padding: '0.28rem 0.5rem', 
                              fontSize: '0.74rem', 
                              fontFamily: 'var(--font-mono)', 
                              color: codeFormat === 'qr' ? '#4F46E5' : '#10B981',
                              fontWeight: 700
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MODAL FOOTER SAVE ACTIONS */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-color, #E5E7EB)'
              }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  📦 Ready to inward: <strong style={{ color: 'var(--text-primary)' }}>{totalStockCount} units</strong> in <strong style={{ color: 'var(--text-primary)' }}>{colourVariants.length} variants</strong>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button type="button" onClick={onClose} className="btn-secondary">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="btn-primary"
                    style={{
                      padding: '0.6rem 1.6rem',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <CheckCircle size={17} />
                    <span>Save All {totalStockCount} Mobiles to Inventory</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* EXCEL / CSV BULK IMPORT TAB */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                background: 'var(--surface-primary, #FFFFFF)',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #E5E7EB)',
                padding: '1.4rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Bulk Mobile Stock Import via Excel / CSV
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Import large distributor purchase invoices with Model, RAM, Storage, Colours, and IMEIs in 1 second.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadSampleExcel}
                    className="btn-secondary"
                    style={{
                      padding: '0.45rem 0.95rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      borderColor: '#10B981',
                      color: '#10B981'
                    }}
                  >
                    <Download size={15} />
                    <span>Download Sample Excel / CSV Template</span>
                  </button>
                </div>

                {/* Drag and Drop / Upload Box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border-color, #D1D5DB)',
                    borderRadius: '12px',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-main, #F9FAFB)',
                    transition: 'all 0.2s ease',
                    marginBottom: '1rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10B981'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color, #D1D5DB)'}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                    color: '#10B981'
                  }}>
                    <Upload size={24} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                    {excelFileName ? `Selected: ${excelFileName}` : 'Click or Drag & Drop Excel (.xlsx, .xls) or .csv File'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Supports distributor purchase bills with Brand, Model, Colour, RAM, Storage, and IMEIs
                  </div>
                </div>

                {/* Validation warnings if any */}
                {excelErrors.length > 0 && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid #EF4444',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#EF4444', fontWeight: 800, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <AlertCircle size={15} />
                      <span>Validation Notes:</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.74rem', color: '#B91C1C' }}>
                      {excelErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Parsed Rows Preview Table */}
                {excelRows.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                        Parsed Rows Preview ({excelRows.length} models / {excelRows.reduce((a, b) => a + b.quantity, 0)} total units)
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 700 }}>
                        Total Purchase Value: ₹{excelRows.reduce((acc, r) => acc + (r.purchasePrice * r.quantity), 0).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ overflowX: 'auto', maxHeight: '340px', border: '1px solid var(--border-color, #E5E7EB)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                        <thead style={{ background: 'var(--surface-header, #1F2937)', color: '#FFF', position: 'sticky', top: 0 }}>
                          <tr>
                            <th style={{ padding: '0.5rem' }}>#</th>
                            <th style={{ padding: '0.5rem' }}>Brand & Model</th>
                            <th style={{ padding: '0.5rem' }}>Variant (RAM/ROM)</th>
                            <th style={{ padding: '0.5rem' }}>Colour</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                            <th style={{ padding: '0.5rem' }}>IMEI 1</th>
                            <th style={{ padding: '0.5rem' }}>Selling ₹</th>
                            <th style={{ padding: '0.5rem' }}>Cost ₹</th>
                            <th style={{ padding: '0.5rem' }}>Shelf</th>
                          </tr>
                        </thead>
                        <tbody>
                          {excelRows.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color, #E5E7EB)', background: idx % 2 === 0 ? 'var(--bg-main, #FFF)' : 'var(--surface-primary, #F9FAFB)' }}>
                              <td style={{ padding: '0.45rem', fontFamily: 'var(--font-mono)' }}>{row.rowNo}</td>
                              <td style={{ padding: '0.45rem', fontWeight: 700 }}>{row.brand} {row.model}</td>
                              <td style={{ padding: '0.45rem' }}>{row.ram} / {row.storage}</td>
                              <td style={{ padding: '0.45rem', fontWeight: 600 }}>{row.colour}</td>
                              <td style={{ padding: '0.45rem', textAlign: 'center', fontWeight: 800 }}>{row.quantity}</td>
                              <td style={{ padding: '0.45rem', fontFamily: 'var(--font-mono)' }}>{row.imei1 || '—'}</td>
                              <td style={{ padding: '0.45rem', fontWeight: 800, color: '#10B981' }}>₹{row.sellPrice.toLocaleString()}</td>
                              <td style={{ padding: '0.45rem' }}>₹{row.purchasePrice.toLocaleString()}</td>
                              <td style={{ padding: '0.45rem', fontFamily: 'var(--font-mono)' }}>{row.rack}/{row.bin}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                      <button
                        type="button"
                        onClick={handleImportExcelRows}
                        disabled={isImporting}
                        className="btn-primary"
                        style={{
                          padding: '0.6rem 1.6rem',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <CheckCircle size={16} />
                        <span>Confirm & Import All {excelRows.reduce((a, b) => a + b.quantity, 0)} Units</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BATCH PASTE IMEIS MODAL */}
      {showPasteModal && (
        <div className="modal-backdrop no-print" style={{ zIndex: 1300 }}>
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Copy size={16} color="#10B981" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Paste Multi-Line IMEIs</h4>
              </div>
              <button onClick={() => setShowPasteModal(false)} className="btn-secondary" style={{ padding: '0.2rem 0.4rem' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ marginBottom: '0.65rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                Paste Target Field:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="pasteField"
                    checked={pasteTargetField === 'imei1'}
                    onChange={() => setPasteTargetField('imei1')}
                  />
                  <span>IMEI 1 (SIM 1)</span>
                </label>
                <label style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="pasteField"
                    checked={pasteTargetField === 'imei2'}
                    onChange={() => setPasteTargetField('imei2')}
                  />
                  <span>IMEI 2 (SIM 2)</span>
                </label>
              </div>
            </div>

            <textarea
              rows={8}
              placeholder="Paste IMEIs here (1 per line or separated by commas)...&#10;863456051234561&#10;863456051234562&#10;863456051234563"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="input-field"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginBottom: '0.8rem' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowPasteModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleApplyPasteImeis} className="btn-primary" style={{ padding: '0.45rem 1rem', background: '#10B981' }}>
                Apply to Units
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA SCANNER MODAL */}
      {activeScanUnitIndex !== null && (
        <CameraBarcodeScannerModal
          isOpen={true}
          onClose={() => setActiveScanUnitIndex(null)}
          onScan={(scannedCode) => {
            handleUnitChange(activeScanUnitIndex, activeScanField, scannedCode);
            setActiveScanUnitIndex(null);
          }}
          onScanSuccess={(scannedCode) => {
            handleUnitChange(activeScanUnitIndex, activeScanField, scannedCode);
            setActiveScanUnitIndex(null);
          }}
        />
      )}

      {/* Code Preview & Instant Sticker Modal */}
      {previewUnit && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1350, padding: '1rem' }}>
          <div className="illoca-card animate-fade-in" style={{ maxWidth: '380px', width: '100%', background: 'var(--surface-primary)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {codeFormat === 'qr' ? <QrCode size={18} color="#4F46E5" /> : <Barcode size={18} color="#10B981" />}
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>
                  Unit {codeFormat === 'qr' ? 'QR Code' : 'Barcode'} Sticker
                </h4>
              </div>
              <button 
                type="button" 
                onClick={() => setPreviewUnit(null)} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              background: '#FFFFFF',
              color: '#0A0D14',
              padding: '0.9rem',
              borderRadius: '8px',
              border: '2px dashed #CBD5E1',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.04em' }}>ALZINO • BODHAN</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, margin: '2px 0' }}>
                {modelDetails.brand} {modelDetails.model}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                {modelDetails.ram}/{modelDetails.storage} • {previewUnit.color}
              </div>

              <div 
                style={{ margin: '0.6rem 0', display: 'flex', justifyContent: 'center' }}
                dangerouslySetInnerHTML={{ 
                  __html: renderCodeSvg(previewUnit.barcode, codeFormat, 220, codeFormat === 'qr' ? 95 : 55, true) 
                }} 
              />

              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0F172A' }}>
                ₹{Number(modelDetails.sellPrice || 0).toLocaleString()} 
                {modelDetails.mrp && Number(modelDetails.mrp) > Number(modelDetails.sellPrice) && (
                  <span style={{ textDecoration: 'line-through', fontSize: '0.72rem', color: '#94A3B8', marginLeft: '6px' }}>
                    MRP: ₹{Number(modelDetails.mrp).toLocaleString()}
                  </span>
                )}
              </div>
              {previewUnit.imei1 && (
                <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: '#475569', marginTop: '4px' }}>
                  IMEI: {previewUnit.imei1}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPreviewUnit(null)}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
              >
                Close
              </button>
              {onPrintBarcodeSheet && (
                <button
                  type="button"
                  onClick={() => {
                    onPrintBarcodeSheet({
                      title: `${modelDetails.brand} ${modelDetails.model} (${modelDetails.ram}/${modelDetails.storage} - ${previewUnit.color})`,
                      barcode: previewUnit.barcode,
                      codeFormat,
                      price: modelDetails.sellPrice || 0,
                      mrp: modelDetails.mrp || modelDetails.sellPrice || 0,
                      copies: 1,
                      format: 'single'
                    });
                    setPreviewUnit(null);
                  }}
                  className="btn-primary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Printer size={13} />
                  <span>Print Sticker</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Preview Image Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface-primary, #FFFFFF)',
              borderRadius: '12px',
              padding: '1rem',
              maxWidth: '460px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '0.9rem' }}>{previewImage.title || 'Colour Variant Photo'}</strong>
              <button 
                type="button" 
                onClick={() => setPreviewImage(null)} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ borderRadius: '8px', overflow: 'hidden', maxHeight: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
              <img src={previewImage.url} alt="Variant" style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
