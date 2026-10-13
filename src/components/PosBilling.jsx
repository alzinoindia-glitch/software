import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  QrCode, 
  CreditCard, 
  IndianRupee, 
  User, 
  Phone, 
  FileText, 
  CheckCircle2, 
  Share2, 
  AlertCircle,
  Tag,
  Sparkles,
  ArrowRight,
  Edit2,
  History,
  Save,
  X,
  ShieldCheck,
  Check,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Calendar,
  Copy,
  Landmark,
  Percent,
  Clock,
  Image as ImageIcon,
  Barcode,
  Camera,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getUpiQrUrl } from '../utils/barcode';
import { HardwareBarcodeScannerEngine, playDeviceBeep } from '../utils/hardwareDevices';
import CameraBarcodeScannerModal from './CameraBarcodeScannerModal';
import { openWhatsAppInvoice } from '../utils/whatsappAutomation';
import { lookupProductByBarcodeOrImei } from '../utils/productSuggestions';
import { findProductFromScan } from '../utils/productTerms';


export default function PosBilling({ 
  inventory, 
  setInventory, 
  customers, 
  setCustomers, 
  invoices, 
  setInvoices, 
  shopConfig, 
  role,
  onPrintInvoice,
  quickBillProduct,
  clearQuickBillProduct
}) {
  // Navigation: 'register' (Active Counter) | 'invoices' (Past Invoices Archive & Edit)
  const [activePosTab, setActivePosTab] = useState('register');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [catalogLimit, setCatalogLimit] = useState(80);
  
  // Billing Type: GST Invoice vs Non-GST Estimate
  const [billingType, setBillingType] = useState('gst'); // 'gst' | 'non-gst'

  // Customer details
  const [customerName, setCustomerName] = useState('Counter Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('Bodhan, Telangana');
  const [customerGstin, setCustomerGstin] = useState('');
  const [showMoreCustomerFields, setShowMoreCustomerFields] = useState(false);
  const [customerMatchHint, setCustomerMatchHint] = useState(null);
  
  // Invoice remarks / notes
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);

  // Billing options
  const [paymentMode, setPaymentMode] = useState('UPI'); // Cash | UPI | Card | Khata | Split | EMI
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [isInterstate, setIsInterstate] = useState(false);
  
  // Checkout modal / complete state
  const [showPaymentVerifyModal, setShowPaymentVerifyModal] = useState(false);
  const [cashDenominationCounts, setCashDenominationCounts] = useState({});
  const [sendInvoiceWhatsApp, setSendInvoiceWhatsApp] = useState(false);
  const [upiTxnRef, setUpiTxnRef] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [cardAuthCode, setCardAuthCode] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState(0);
  const [splitUpiAmount, setSplitUpiAmount] = useState(0);
  const [splitUpiTxnRef, setSplitUpiTxnRef] = useState('');
  const [splitVerified, setSplitVerified] = useState(false);

  // Multi-Bank UPI & Standee QR state
  const upiAccountsList = useMemo(() => {
    if (shopConfig.upiAccounts && shopConfig.upiAccounts.length > 0) {
      return shopConfig.upiAccounts;
    }
    return [{
      id: 'default',
      bankName: shopConfig.bankName || 'Primary Bank (HDFC)',
      upiId: shopConfig.upiId || 'alzino.bodhan@okhdfcbank',
      accountName: shopConfig.name || 'ALZINO MOBILES',
      qrCodeImage: shopConfig.qrCodeImage || null,
      isDefault: true
    }];
  }, [shopConfig]);

  const [selectedUpiAccountId, setSelectedUpiAccountId] = useState(() => {
    const list = (shopConfig.upiAccounts && shopConfig.upiAccounts.length > 0)
      ? shopConfig.upiAccounts
      : [{ id: 'default', isDefault: true }];
    return (list.find(a => a.isDefault) || list[0]).id;
  });

  const [qrDisplayMode, setQrDisplayMode] = useState('dynamic'); // 'dynamic' | 'standee'

  const currentUpiAccount = useMemo(() => {
    return upiAccountsList.find(a => a.id === selectedUpiAccountId) || upiAccountsList[0];
  }, [upiAccountsList, selectedUpiAccountId]);

  const cashDenominations = [500, 200, 100, 50, 20, 10, 5, 2, 1];
  const cashDenominationTotal = cashDenominations.reduce(
    (total, denomination) => total + denomination * (Number(cashDenominationCounts[denomination]) || 0),
    0
  );

  // EMI Financing State (Manual Counter Entry)
  const [emiFinancier, setEmiFinancier] = useState('Bajaj Finserv');
  const [customFinancier, setCustomFinancier] = useState('');
  const [emiDownPayment, setEmiDownPayment] = useState(0);
  const [emiDownPaymentMode, setEmiDownPaymentMode] = useState('Cash'); // Cash | UPI
  const [emiDownPaymentUpiRef, setEmiDownPaymentUpiRef] = useState('');
  const [emiTenureMonths, setEmiTenureMonths] = useState(6);
  const [emiMonthlyAmount, setEmiMonthlyAmount] = useState(0);
  const [emiApprovalCode, setEmiApprovalCode] = useState('');
  const [emiCustomerAadhaar, setEmiCustomerAadhaar] = useState('');
  const [emiVerified, setEmiVerified] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);

  // Custom / Unlisted Item Modal State
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemBuyCost, setCustomItemBuyCost] = useState('0');
  const [customItemQty, setCustomItemQty] = useState('1');
  const [customItemHsn, setCustomItemHsn] = useState('851712');
  const [customItemWarranty, setCustomItemWarranty] = useState('Standard Shop Warranty');
  const [customItemImei, setCustomItemImei] = useState('');

  // Editing Line Item Modal / Inline state
  const [editingLineItemId, setEditingLineItemId] = useState(null);
  const [tempLineName, setTempLineName] = useState('');
  const [tempLineWarranty, setTempLineWarranty] = useState('');
  const [tempCustomImei, setTempCustomImei] = useState('');

  // Past Invoices & Edit Invoice Modal State
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [editingInvoiceModal, setEditingInvoiceModal] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [scanNotification, setScanNotification] = useState('');
  
  const searchInputRef = useRef(null);
  const scanHandlerRef = useRef(null);

  // Tax Filter: 'all' | 'gst' | 'non-gst'
  const [posTaxFilter, setPosTaxFilter] = useState('all');
  const [showPosCameraScanner, setShowPosCameraScanner] = useState(false);

  // Categories
  const categories = useMemo(() => {
    const baseCats = ['All', 'Mobile Accessories', 'New Mobiles', 'Used Mobiles', 'Home Appliances', 'Universal'];
    const set = new Set(baseCats);
    inventory.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [inventory]);

  // Smart Multi-keyword filter inventory (matches name, brand, description, barcode, imeis)
  const filteredProducts = useMemo(() => {
    return inventory.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const isItemGst = (item.gstRate && item.gstRate > 0) || item.isGst;
      const matchesTax = 
        posTaxFilter === 'all' ||
        (posTaxFilter === 'gst' && isItemGst) ||
        (posTaxFilter === 'non-gst' && !isItemGst);

      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesCategory && matchesTax;

      const words = q.split(/\s+/).filter(Boolean);
      const haystack = [
        item.name || '',
        item.brand || '',
        item.model || '',
        item.color || '',
        item.ram || '',
        item.storage || '',
        item.category || '',
        item.description || '',
        item.barcode || '',
        ...(item.barcodes || []),
        ...(item.imeis || []),
        ...((item.units || []).flatMap(u => [u.imei1, u.imei2, u.barcode, u.color].filter(Boolean)))
      ].join(' ').toLowerCase();

      return matchesCategory && matchesTax && words.every(word => haystack.includes(word));
    });
  }, [inventory, selectedCategory, posTaxFilter, searchTerm]);

  useEffect(() => {
    setCatalogLimit(80);
  }, [selectedCategory, posTaxFilter, searchTerm]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, catalogLimit),
    [filteredProducts, catalogLimit]
  );

  const getTrackedUnits = (product) => {
    if (Array.isArray(product.units) && product.units.length > 0) {
      return product.units.map(unit => ({
        id: unit.imei1 || unit.imei2 || unit.barcode || '',
        imei: unit.imei1 || unit.imei2 || '',
        barcode: unit.barcode || ''
      })).filter(unit => unit.id);
    }
    return (product.imeis || []).map(imei => ({ id: imei, imei, barcode: '' }));
  };

  // Add product to cart
  const addToCart = (product, specificImei = null, requestedQty = 1, specificUnitId = null) => {
    const quantity = Math.max(1, Math.floor(Number(requestedQty) || 1));
    const trackedUnits = getTrackedUnits(product);
    if (product.stock <= 0) {
      alert(`"${product.name}" is currently out of stock!`);
      return false;
    }
    const currentLine = cart.find(item => item.id === product.id);
    if (specificUnitId && currentLine?.selectedUnitIds?.includes(specificUnitId)) {
      setScanNotification(`⚠️ This unit was already scanned: ${product.name}.`);
      setTimeout(() => setScanNotification(''), 2500);
      return false;
    }
    if ((currentLine?.qty || 0) + quantity > product.stock) {
      setScanNotification(`⚠️ Only ${product.stock} ${product.name} unit(s) are in stock.`);
      setTimeout(() => setScanNotification(''), 2500);
      return false;
    }
    if (trackedUnits.length > 0) {
      const availableUnits = trackedUnits.filter(unit => !currentLine?.selectedUnitIds?.includes(unit.id));
      const requestedUnits = specificUnitId
        ? trackedUnits.some(unit => unit.id === specificUnitId && !currentLine?.selectedUnitIds?.includes(unit.id)) ? 1 : 0
        : availableUnits.length;
      if (requestedUnits < quantity) {
        setScanNotification(`⚠️ No additional individually identified ${product.name} unit is available.`);
        setTimeout(() => setScanNotification(''), 2500);
        return false;
      }
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const hasTrackedUnits = trackedUnits.length > 0;
      if (existing) {
        if (specificUnitId && existing.selectedUnitIds?.includes(specificUnitId)) {
          alert('This exact IMEI/unit is already in the bill. Scan a different unit.');
          return prev;
        }
        if (existing.qty + quantity > product.stock) {
          alert(`Cannot add more than available stock (${product.stock} pcs).`);
          return prev;
        }
        
        const availableUnits = hasTrackedUnits
          ? trackedUnits.filter(unit => !existing.selectedUnitIds?.includes(unit.id))
          : [];
        const assignedUnits = specificUnitId
          ? trackedUnits.filter(unit => unit.id === specificUnitId)
          : availableUnits.slice(0, quantity);
        if (hasTrackedUnits && assignedUnits.length < quantity) {
          alert(`Only ${existing.qty + assignedUnits.length} individually identified unit(s) are available to add.`);
          return prev;
        }

        const assignedImeis = assignedUnits.map(unit => unit.imei).filter(Boolean);

        return prev.map(item => {
          if (item.id === product.id) {
            return {
              ...item,
              qty: item.qty + quantity,
              selectedImeis: [...item.selectedImeis, ...assignedImeis],
              selectedUnitIds: [...(item.selectedUnitIds || []), ...assignedUnits.map(unit => unit.id)]
            };
          }
          return item;
        });
      } else {
        if (quantity > product.stock) {
          alert(`Cannot add more than available stock (${product.stock} pcs).`);
          return prev;
        }
        const initialUnits = specificUnitId
          ? trackedUnits.filter(unit => unit.id === specificUnitId)
          : (hasTrackedUnits ? trackedUnits.slice(0, quantity) : []);
        if (hasTrackedUnits && initialUnits.length < quantity) {
          alert(`Only ${initialUnits.length} individually identified unit(s) are available to add.`);
          return prev;
        }
        const initialImeis = specificImei
          ? [specificImei]
          : initialUnits.map(unit => unit.imei).filter(Boolean);
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            brand: product.brand,
            category: product.category,
            hsn: product.hsn || '851712',
            rate: product.sellPrice,
            mrp: product.mrp,
            buyPrice: product.buyPrice,
            gstRate: product.gstRate || 18,
            qty: quantity,
            availableStock: product.stock,
            allImeis: product.imeis || [],
            selectedImeis: initialImeis,
            allTrackedUnits: trackedUnits,
            selectedUnitIds: initialUnits.map(unit => unit.id),
            color: product.color || '',
            ram: product.ram || '',
            storage: product.storage || '',
            warranty: product.warranty || '1 Year Official Warranty',
          }
        ];
      }
    });
    return true;
  };

  const handleProcessBarcodeScan = (scannedCode) => {
    const clean = scannedCode.trim().toLowerCase();
    const exactMatch = findProductFromScan(scannedCode, inventory);

    if (exactMatch) {
      if (exactMatch.stock <= 0) {
        playDeviceBeep('error');
        setScanNotification(`⚠️ OUT OF STOCK: "${exactMatch.name}" (${scannedCode})`);
        setTimeout(() => setScanNotification(''), 3500);
        return;
      }
      let matchedUnit = (exactMatch.units || []).find(un =>
        [un.barcode, un.imei1, un.imei2].some(value => value && value.trim().toLowerCase() === clean)
      );
      let matchedImei = exactMatch.imeis ? exactMatch.imeis.find(i => i.trim().toLowerCase() === clean) : null;
      if (!matchedImei && exactMatch.units) {
        if (matchedUnit) matchedImei = matchedUnit.imei1 || matchedUnit.imei2;
      }
      const trackedUnitId = matchedUnit
        ? (matchedUnit.imei1 || matchedUnit.imei2 || matchedUnit.barcode || null)
        : (matchedImei || null);
      const added = addToCart(exactMatch, matchedImei, 1, trackedUnitId);
      if (!added) {
        playDeviceBeep('error');
        return;
      }
      playDeviceBeep('success');
      setScanNotification(`✓ Added 1 × ${exactMatch.name}. Scan each unit; matching scans combine in the bill.`);
      setTimeout(() => setScanNotification(''), 2500);
    } else {
      playDeviceBeep('error');
      const catalogMatch = lookupProductByBarcodeOrImei(scannedCode, inventory);
      if (catalogMatch) {
        setScanNotification(`⚠️ Found: ${catalogMatch.name} [Code: ${scannedCode}] — NOT in store stock! Inward/Add it to inventory first.`);
      } else {
        setScanNotification(`⚠️ Scanned Barcode/IMEI not in inventory: "${scannedCode}"`);
      }
      setTimeout(() => setScanNotification(''), 4500);
    }
  };

  scanHandlerRef.current = handleProcessBarcodeScan;

  // Global Hardware Barcode Scanner Listener for POS Billing Counter
  useEffect(() => {
    const scanner = new HardwareBarcodeScannerEngine({
      soundEnabled: shopConfig?.barcodeScannerBeep !== false,
      onScan: (scannedCode) => {
        scanHandlerRef.current?.(scannedCode);
      }
    });

    scanner.start();
    return () => scanner.stop();
  }, [inventory, shopConfig?.barcodeScannerBeep]);

  // Handle Barcode scanner auto-enter inside manual search box
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        handleProcessBarcodeScan(searchTerm.trim());
        setSearchTerm('');
      }
    }
  };

  // Auto-add product when sent from Stock & Price Lookup
  useEffect(() => {
    if (quickBillProduct) {
      addToCart(quickBillProduct);
      if (clearQuickBillProduct) {
        clearQuickBillProduct();
      }
    }
  }, [quickBillProduct, clearQuickBillProduct]);

  // Adjust cart quantity
  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        if (newQty > item.availableStock) {
          alert(`Maximum available stock is ${item.availableStock}`);
          return item;
        }
        
        const trackedUnits = item.allTrackedUnits || [];
        let selectedUnitIds = [...(item.selectedUnitIds || [])];
        let updatedImeis = [...item.selectedImeis];
        if (delta > 0 && trackedUnits.length > 0) {
          const nextUnit = trackedUnits.find(unit => !selectedUnitIds.includes(unit.id));
          if (!nextUnit) return item;
          selectedUnitIds.push(nextUnit.id);
          if (nextUnit.imei) updatedImeis.push(nextUnit.imei);
        } else if (delta < 0 && selectedUnitIds.length > 0) {
          const removedId = selectedUnitIds.pop();
          const removedUnit = trackedUnits.find(unit => unit.id === removedId);
          if (removedUnit?.imei) updatedImeis = updatedImeis.filter(imei => imei !== removedUnit.imei);
        } else if (delta > 0 && item.allImeis.length > 0) {
          const nextAvailable = item.allImeis.find(im => !updatedImeis.includes(im));
          if (!nextAvailable) return item;
          updatedImeis.push(nextAvailable);
        } else if (delta < 0) {
          updatedImeis.pop();
        }

        return { ...item, qty: newQty, selectedImeis: updatedImeis, selectedUnitIds };
      }
      return item;
    }).filter(Boolean));
  };

  // Remove from cart
  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Update selected IMEI for an index
  const updateItemImei = (productId, imeiIndex, newImei) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newImeis = [...item.selectedImeis];
        newImeis[imeiIndex] = newImei;
        return { ...item, selectedImeis: newImeis };
      }
      return item;
    }));
  };

  // Set typed custom IMEI
  const addCustomImeiToItem = (productId, customImei) => {
    if (!customImei.trim()) return;
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        return {
          ...item,
          allImeis: Array.from(new Set([...item.allImeis, customImei.trim()])),
          selectedImeis: [customImei.trim(), ...item.selectedImeis.slice(1)]
        };
      }
      return item;
    }));
  };

  // Update line rate
  const updateItemRate = (id, newRate) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, rate: parseFloat(newRate) || 0 };
      }
      return item;
    }));
  };

  // Update line item name
  const updateItemName = (id, newName) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, name: newName };
      }
      return item;
    }));
  };

  // Update line item warranty
  const updateItemWarranty = (id, newWarranty) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, warranty: newWarranty };
      }
      return item;
    }));
  };

  // Add custom / unlisted item to cart
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customItemName.trim()) {
      alert("Please enter product name.");
      return;
    }
    const price = parseFloat(customItemPrice);
    if (!price || price <= 0) {
      alert("Please enter a valid price.");
      return;
    }
    const qty = parseInt(customItemQty, 10) || 1;
    const buyCost = parseFloat(customItemBuyCost) || 0;

    const newItem = {
      id: `CUSTOM-${Date.now().toString().slice(-4)}`,
      name: customItemName.trim(),
      brand: 'Custom',
      category: 'Accessories & Services',
      hsn: customItemHsn.trim() || '851712',
      rate: price,
      mrp: Math.round(price * 1.1),
      buyPrice: buyCost,
      gstRate: billingType === 'gst' ? 18 : 0,
      qty,
      availableStock: 999,
      allImeis: customItemImei ? [customItemImei.trim()] : [],
      selectedImeis: customItemImei ? [customItemImei.trim()] : [],
      warranty: customItemWarranty.trim() || 'Standard Shop Warranty',
      isCustom: true
    };

    setCart(prev => [...prev, newItem]);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemBuyCost('0');
    setCustomItemQty('1');
    setCustomItemImei('');
    setShowAddCustomModal(false);
  };

  // Customer phone auto-detection
  const handleCustomerPhoneInput = (val) => {
    setCustomerPhone(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 4) {
      const match = customers.find(c => c.phone && c.phone.replace(/\D/g, '').includes(clean));
      if (match) {
        setCustomerMatchHint(match);
        if (customerName === 'Counter Customer' || !customerName) {
          setCustomerName(match.name);
          if (match.address) setCustomerAddress(match.address);
          if (match.gstin) setCustomerGstin(match.gstin);
        }
      } else {
        setCustomerMatchHint(null);
      }
    } else {
      setCustomerMatchHint(null);
    }
  };

  // Select customer from list
  const handleSelectCustomer = (c) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    if (c.address) setCustomerAddress(c.address);
    if (c.gstin) setCustomerGstin(c.gstin);
    setCustomerMatchHint(null);
  };

  // Calculations
  const isNonGst = billingType === 'non-gst';
  const subtotalBeforeTax = cart.reduce((sum, item) => sum + (item.rate * item.qty), 0);
  const totalTaxable = subtotalBeforeTax;
  const totalGst = isNonGst ? 0 : cart.reduce((sum, item) => {
    const itemTaxable = item.rate * item.qty;
    return sum + itemTaxable * ((item.gstRate || 18) / 100);
  }, 0);
  const grandTotal = Math.max(0, subtotalBeforeTax + totalGst - Number(discount));
  
  // Total line profit (for admin mode)
  const totalProfit = cart.reduce((sum, item) => {
    const itemProfit = (item.rate - item.buyPrice) * item.qty;
    return sum + itemProfit;
  }, 0) - Number(discount);

  // EMI auto-calculated loan amount
  const emiLoanAmount = Math.max(0, grandTotal - (Number(emiDownPayment) || 0));

  // Sync monthly EMI calculation when loan amount or tenure changes
  useEffect(() => {
    if (emiTenureMonths > 0) {
      setEmiMonthlyAmount(Math.round(emiLoanAmount / emiTenureMonths));
    }
  }, [emiLoanAmount, emiTenureMonths]);

  // Sync paidAmount default
  useEffect(() => {
    setPaidAmount(grandTotal);
  }, [grandTotal]);

  // Express 5-Second Checkout (Zero Popups • 1-Hit Print • Optional Auto-WhatsApp)
  const handleExpressCheckout = (mode = 'Cash', sendWhatsApp = false) => {
    if (cart.length === 0) {
      playDeviceBeep('error');
      alert("Cart is empty! Scan a barcode or add an item first.");
      return;
    }

    handleInitiatePayment(mode, sendWhatsApp);
  };

  // Keyboard Hotkey Automation for Counter Cashiers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F-Keys for instant operations
      if (['F2', 'F3', 'F4', 'F8'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'F2') {
          handleExpressCheckout('Cash', false);
        } else if (e.key === 'F3') {
          handleExpressCheckout('UPI', false);
        } else if (e.key === 'F4') {
          handleExpressCheckout('UPI', true);
        } else if (e.key === 'F8') {
          setBillingType(prev => prev === 'gst' ? 'non-gst' : 'gst');
          playDeviceBeep('scanner');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, grandTotal, customerName, customerPhone, customerAddress, isNonGst, shopConfig, invoices.length]);

  // Step 1: Open Payment Verification Modal (NO invoice or stock deduction yet)
  const handleInitiatePayment = (initialMode = paymentMode, sendWhatsApp = false) => {
    if (cart.length === 0) {
      alert("Cart is empty! Add items to cart first.");
      return;
    }
    const def = upiAccountsList.find(a => a.isDefault) || upiAccountsList[0];
    setPaymentMode(initialMode);
    if (def) setSelectedUpiAccountId(def.id);
    setQrDisplayMode('dynamic');
    setCashDenominationCounts({});
    setSendInvoiceWhatsApp(sendWhatsApp);
    setUpiTxnRef('');
    setUpiVerified(false);
    setCopiedUpi(false);
    setCardAuthCode('');
    setSplitCashAmount(Math.round(grandTotal / 2));
    setSplitUpiAmount(grandTotal - Math.round(grandTotal / 2));
    setSplitUpiTxnRef('');
    setSplitVerified(false);
    setEmiDownPayment(0);
    setEmiDownPaymentMode('Cash');
    setEmiDownPaymentUpiRef('');
    setEmiTenureMonths(6);
    setEmiMonthlyAmount(Math.round(grandTotal / 6));
    setEmiApprovalCode('');
    setEmiVerified(false);
    setShowPaymentVerifyModal(true);
  };

  // Step 2: Finalize Sale ONLY AFTER Payment is Confirmed
  const handleConfirmAndGenerateInvoice = () => {
    const cashReceived = paymentMode === 'Cash' ? cashDenominationTotal : 0;
    if (paymentMode === 'UPI' && (!upiTxnRef.trim() || !upiVerified)) {
      alert('Enter the UPI UTR / transaction ID and verify that payment was received before completing this sale.');
      return;
    }
    if (paymentMode === 'Cash' && cashReceived < grandTotal) {
      alert('Enter the cash note and coin counts. The amount received must cover the total due.');
      return;
    }
    if (paymentMode === 'EMI' && (!emiApprovalCode.trim() || !emiVerified || (emiDownPaymentMode === 'UPI' && Number(emiDownPayment) > 0 && !emiDownPaymentUpiRef.trim()))) {
      alert('Enter the EMI approval / transaction ID and confirm finance approval. If the down payment was by UPI, enter its UTR too.');
      return;
    }
    if (paymentMode === 'Split' && (!splitVerified || (Number(splitUpiAmount) > 0 && !splitUpiTxnRef.trim()))) {
      alert('Verify both payment portions and enter the UPI UTR / transaction ID before completing the sale.');
      return;
    }
    if (paymentMode === 'Card' && !cardAuthCode.trim()) {
      alert('Enter the card terminal approval / transaction ID before completing the sale.');
      return;
    }
    const stockChanged = cart.find(cartItem => {
      const currentProduct = inventory.find(item => item.id === cartItem.id);
      return !currentProduct || Number(currentProduct.stock) < Number(cartItem.qty);
    });
    if (stockChanged) {
      const liveStock = Number(inventory.find(item => item.id === stockChanged.id)?.stock || 0);
      alert(`Sale not completed: ${stockChanged.name} has only ${liveStock} unit(s) in stock now. Update the bill quantity and try again.`);
      return;
    }
    const prefix = isNonGst ? 'ALZ-EST' : 'ALZ-INV';
    const invoiceNo = `${prefix}-${String(invoices.length + 83).padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    // Compute GST breakdowns
    const cgstTotal = isNonGst ? 0 : (isInterstate ? 0 : totalGst / 2);
    const sgstTotal = isNonGst ? 0 : (isInterstate ? 0 : totalGst / 2);
    const igstTotal = isNonGst ? 0 : (isInterstate ? totalGst : 0);

    const isEmi = paymentMode === 'EMI';
    const isSplit = paymentMode === 'Split';

    let actualPaid = 0;
    let khataDue = 0;
    let effectivePaymentMode = paymentMode;

    if (paymentMode === 'Khata') {
      actualPaid = 0;
      khataDue = grandTotal;
      effectivePaymentMode = 'Khata';
    } else if (isEmi) {
      actualPaid = Number(emiDownPayment) || 0;
      khataDue = 0; // Balance is funded by loan partner
      const activeFinancier = emiFinancier === 'Other' ? (customFinancier.trim() || 'Third-Party Finance') : emiFinancier;
      effectivePaymentMode = `EMI (${activeFinancier})`;
    } else if (isSplit) {
      actualPaid = (Number(splitCashAmount) || 0) + (Number(splitUpiAmount) || 0);
      khataDue = Math.max(0, grandTotal - actualPaid);
      effectivePaymentMode = 'Split (Cash + UPI)';
    } else {
      actualPaid = Number(paidAmount);
      khataDue = Math.max(0, grandTotal - actualPaid);
    }

    const emiDetails = isEmi ? {
      isEmi: true,
      financier: emiFinancier === 'Other' ? (customFinancier.trim() || 'Third-Party Finance') : emiFinancier,
      downPayment: Number(emiDownPayment) || 0,
      downPaymentMode: emiDownPaymentMode,
      downPaymentRef: emiDownPaymentMode === 'UPI' ? emiDownPaymentUpiRef : 'CASH',
      loanAmount: emiLoanAmount,
      tenureMonths: Number(emiTenureMonths) || 1,
      monthlyEmi: Number(emiMonthlyAmount) || Math.round(emiLoanAmount / (Number(emiTenureMonths) || 1)),
      approvalCode: emiApprovalCode.trim(),
      customerAadhaar: emiCustomerAadhaar.trim()
    } : null;

    const splitDetails = isSplit ? {
      cashAmount: Number(splitCashAmount) || 0,
      upiAmount: Number(splitUpiAmount) || 0,
      upiRef: splitUpiTxnRef.trim()
    } : null;

    const newInvoice = {
      invoiceNo,
      date: today,
      isNonGst,
      priceIncludesGst: false,
      invoiceType: isNonGst ? 'Non-GST Cash Memo / Estimate' : 'GST Tax Invoice',
      customerName: customerName.trim() || 'Counter Customer',
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim() || 'Bodhan, Telangana',
      customerGstin: isNonGst ? '' : customerGstin.trim(),
      paymentMode: effectivePaymentMode,
      paymentStatus: paymentMode === 'Khata' ? 'KHATA_DUE' : (isEmi ? 'EMI_SANCTIONED' : 'PAID'),
      paymentConfirmedAt: new Date().toISOString(),
      paymentRef: paymentMode === 'UPI' ? upiTxnRef.trim() : (isEmi ? emiApprovalCode.trim() : (isSplit ? splitUpiTxnRef.trim() : (paymentMode === 'Card' ? cardAuthCode.trim() : ''))),
      emiDetails,
      splitDetails,
      cashTendered: paymentMode === 'Cash' ? cashReceived : null,
      cashDenominations: paymentMode === 'Cash' ? { ...cashDenominationCounts } : null,
      changeReturned: paymentMode === 'Cash' ? Math.max(0, cashReceived - grandTotal) : 0,
      hidePaymentQr: true,
      notes: invoiceNotes.trim(),
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        hsn: item.hsn,
        qty: item.qty,
        imeis: item.selectedImeis,
        rate: item.rate,
        buyPrice: item.buyPrice,
        gstRate: isNonGst ? 0 : item.gstRate,
        taxable: item.rate * item.qty,
        total: item.rate * item.qty + (isNonGst ? 0 : item.rate * item.qty * ((item.gstRate || 18) / 100)),
        profit: (item.rate - item.buyPrice) * item.qty,
        warranty: item.warranty || '',
        rack: item.rack || 'R-01',
        bin: item.bin || 'B-01'
      })),
      taxableAmount: totalTaxable,
      cgstTotal,
      sgstTotal,
      igstTotal,
      discount: Number(discount),
      grandTotal,
      paidAmount: actualPaid,
      khataDue,
      totalProfit,
      isInterstate,
    };

    // Deduct stock and remove sold IMEIs (skip custom items)
    setInventory(prev => prev.map(invItem => {
      const cartItem = cart.find(c => c.id === invItem.id);
      if (cartItem) {
        const removedUnitImeis = (invItem.units || [])
          .filter(unit => cartItem.selectedUnitIds?.includes(unit.imei1 || unit.imei2 || unit.barcode))
          .flatMap(unit => [unit.imei1, unit.imei2].filter(Boolean));
        const remainingImeis = (invItem.imeis || []).filter(
          im => !cartItem.selectedImeis.includes(im) &&
            !cartItem.selectedUnitIds?.includes(im) &&
            !removedUnitImeis.includes(im)
        );
        const remainingUnits = (invItem.units || []).filter(
          u => !cartItem.selectedUnitIds?.includes(u.imei1) &&
            !cartItem.selectedUnitIds?.includes(u.imei2) &&
            !cartItem.selectedUnitIds?.includes(u.barcode) &&
            !cartItem.selectedImeis.includes(u.imei1) &&
            !cartItem.selectedImeis.includes(u.imei2)
        );
        return {
          ...invItem,
          stock: Number(invItem.stock || 0) - Number(cartItem.qty || 0),
          imeis: remainingImeis,
          units: remainingUnits.length > 0 ? remainingUnits : (invItem.units ? [] : undefined)
        };
      }
      return invItem;
    }));

    // Update Customer CRM
    if (customerPhone.trim()) {
      setCustomers(prev => {
        const exists = prev.find(c => c.phone === customerPhone.trim());
        if (exists) {
          return prev.map(c => c.phone === customerPhone.trim() ? {
            ...c,
            totalSpent: c.totalSpent + grandTotal,
            balanceDue: c.balanceDue + khataDue,
          } : c);
        } else {
          return [
            ...prev,
            {
              id: `CUST-${String(prev.length + 1).padStart(3, '0')}`,
              name: customerName.trim() || 'Customer',
              phone: customerPhone.trim(),
              address: customerAddress.trim() || 'Bodhan',
              gstin: customerGstin.trim(),
              totalSpent: grandTotal,
              balanceDue: khataDue,
            }
          ];
        }
      });
    }

    // Save final verified invoice
    setInvoices(prev => [newInvoice, ...prev]);
    setCompletedInvoice(newInvoice);

    if (sendInvoiceWhatsApp || (customerPhone && customerPhone.length >= 10)) {
      openWhatsAppInvoice(newInvoice, shopConfig);
    }

    // Close payment modal and open final print modal
    setShowPaymentVerifyModal(false);
    setShowCheckoutModal(true);

    try {
      playDeviceBeep('cash');
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}

    // Auto-Print invoice based on shopConfig default printer preference
    if (shopConfig?.autoPrintOnCheckout) {
      const mode = shopConfig.defaultPrinter === 'normal-a4' ? 'a4' : (shopConfig.defaultPrinter === 'thermal-58mm' ? 'thermal-58' : 'thermal');
      onPrintInvoice(newInvoice, mode);
    }

    // Reset cart & notes
    setCart([]);
    setDiscount(0);
    setInvoiceNotes('');
  };

  // =========================================================================
  // EDIT INVOICE (EXISTING / PAST INVOICES)
  // =========================================================================
  const handleOpenEditInvoice = (inv) => {
    // Clone invoice to edit
    setInvoiceToEdit(JSON.parse(JSON.stringify(inv)));
    setEditingInvoiceModal(true);
  };

  const handleSaveInvoiceEdit = (reprintFormat = null) => {
    if (!invoiceToEdit) return;

    // Recalculate totals for edited invoice
    const isNonGstInv = invoiceToEdit.isNonGst;
    const subtotal = invoiceToEdit.items.reduce((s, it) => s + (Number(it.rate) * Number(it.qty)), 0);
    const disc = Number(invoiceToEdit.discount) || 0;
    const usesExclusivePrices = invoiceToEdit.priceIncludesGst === false;
    const taxable = isNonGstInv || usesExclusivePrices ? subtotal : invoiceToEdit.items.reduce((sum, item) => {
      const itTot = Number(item.rate) * Number(item.qty);
      const rate = item.gstRate || 18;
      return sum + (itTot / (1 + (rate / 100)));
    }, 0);

    const gst = isNonGstInv ? 0 : usesExclusivePrices
      ? invoiceToEdit.items.reduce((sum, item) => sum + (Number(item.rate) * Number(item.qty) * ((item.gstRate || 18) / 100)), 0)
      : (subtotal - taxable);
    const grand = Math.max(0, subtotal + (usesExclusivePrices ? gst : 0) - disc);
    const cgst = isNonGstInv ? 0 : gst / 2;
    const sgst = isNonGstInv ? 0 : gst / 2;

    const paid = invoiceToEdit.paymentMode === 'Khata' ? 0 : grand;
    const khata = invoiceToEdit.paymentMode === 'Khata' ? grand : 0;

    const updatedInvoice = {
      ...invoiceToEdit,
      items: invoiceToEdit.items.map(it => ({
        ...it,
        total: Number(it.rate) * Number(it.qty) + (usesExclusivePrices && !isNonGstInv
          ? Number(it.rate) * Number(it.qty) * ((it.gstRate || 18) / 100)
          : 0),
        profit: (Number(it.rate) - (Number(it.buyPrice) || 0)) * Number(it.qty)
      })),
      taxableAmount: taxable,
      cgstTotal: cgst,
      sgstTotal: sgst,
      grandTotal: grand,
      paidAmount: paid,
      khataDue: khata,
      totalProfit: invoiceToEdit.items.reduce((s, it) => s + ((Number(it.rate) - (Number(it.buyPrice) || 0)) * Number(it.qty)), 0) - disc
    };

    // Update in invoices
    setInvoices(prev => prev.map(inv => inv.invoiceNo === updatedInvoice.invoiceNo ? updatedInvoice : inv));
    
    // If completedInvoice is currently showing this invoice, update it too
    if (completedInvoice && completedInvoice.invoiceNo === updatedInvoice.invoiceNo) {
      setCompletedInvoice(updatedInvoice);
    }

    setEditingInvoiceModal(false);
    setInvoiceToEdit(null);

    alert(`Invoice ${updatedInvoice.invoiceNo} successfully updated!`);

    if (reprintFormat) {
      onPrintInvoice(updatedInvoice, reprintFormat);
    }
  };

  // Filter past invoices
  const filteredInvoices = useMemo(() => {
    const q = invoiceSearchTerm.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter(inv => 
      inv.invoiceNo?.toLowerCase().includes(q) ||
      inv.customerName?.toLowerCase().includes(q) ||
      inv.customerPhone?.includes(q) ||
      inv.date?.includes(q) ||
      (inv.items && inv.items.some(it => it.name?.toLowerCase().includes(q) || it.imeis?.some(im => im.includes(q))))
    );
  }, [invoices, invoiceSearchTerm]);

  return (
    <div className="app-module-container">
      
      {/* Top Header & Sub-Navigation */}
      <div style={{
        background: 'var(--surface-primary)',
        padding: '0.65rem 1rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0C5B43 0%, #152620 100%)',
            color: '#A9BC5C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(169, 188, 92, 0.25)'
          }}>
            <ShoppingCart size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '0.02em' }}>
                POS BILLING COUNTER
              </h2>
              <span className="mono-tag" style={{ background: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 800, fontSize: '0.62rem' }}>
                TERMINAL #01
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher: POS Register vs Past Invoices */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button
            onClick={() => setActivePosTab('register')}
            className={`hud-pill ${activePosTab === 'register' ? 'active' : ''}`}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
          >
            <ShoppingCart size={13} />
            <span>COUNTER ({cart.length})</span>
          </button>

          {role === 'admin' && (
            <button
              onClick={() => setActivePosTab('invoices')}
              className={`hud-pill ${activePosTab === 'invoices' ? 'active' : ''}`}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              <History size={13} />
              <span>INVOICES ({invoices.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ACTIVE BILLING REGISTER COUNTER                                        */}
      {/* ========================================================================= */}
      {activePosTab === 'register' && (
        <div className="pos-register-grid" style={{ marginTop: '0.75rem' }}>
          
          {/* Left: Product Catalog & Fast Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            
            {/* Search & Mode Bar */}
            <div className="hud-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Live Scanner Banner */}
              {scanNotification && (
                <div style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  background: scanNotification.includes('⚠️') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  border: `1.5px solid ${scanNotification.includes('⚠️') ? 'var(--status-red)' : 'var(--status-green)'}`,
                  color: scanNotification.includes('⚠️') ? 'var(--status-red)' : 'var(--status-green)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Barcode size={16} />
                  <span>{scanNotification}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search / Scan Box */}
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
                  <Search 
                    size={15} 
                    style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search model, barcode, or IMEI (Enter to scan)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="input-field"
                    style={{
                      width: '100%',
                      paddingLeft: '2.1rem',
                      paddingRight: searchTerm ? '2.1rem' : '0.75rem',
                      height: '36px',
                      fontSize: '0.84rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-main)'
                    }}
                    autoFocus
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
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

                {/* Mobile / Webcam Barcode Scanner Button */}
                <button
                  type="button"
                  onClick={() => setShowPosCameraScanner(true)}
                  className="btn-primary"
                  style={{
                    height: '36px',
                    padding: '0 0.85rem',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    background: 'var(--accent-primary)',
                    color: '#FFFFFF',
                    fontWeight: 700
                  }}
                  title="Scan product barcode directly using your mobile phone camera or webcam without barcode reader"
                >
                  <Camera size={15} color="#FFFFFF" />
                  <span style={{ color: '#FFFFFF' }}>Mobile Scan</span>
                </button>

                {/* Tax Mode Segmented Pills */}
                <div style={{ display: 'inline-flex', gap: '0.25rem', background: 'var(--bg-main)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setBillingType('gst')}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      background: billingType === 'gst' ? 'var(--accent-primary)' : 'transparent',
                      color: billingType === 'gst' ? 'var(--accent-contrast)' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    GST 18%
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingType('non-gst')}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      background: billingType === 'non-gst' ? 'var(--accent-primary)' : 'transparent',
                      color: billingType === 'non-gst' ? 'var(--accent-contrast)' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    CASH MEMO (0%)
                  </button>
                </div>
              </div>

              {/* Minimalist Categories & Custom Item button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '2px' }}>
                  {categories.map(cat => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`hud-pill ${isActive ? 'active' : ''}`}
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                      >
                        {cat.replace('Mobile Accessories', 'Accessories').replace('Home Appliances', 'Appliances')}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setShowAddCustomModal(true)}
                    className="hud-pill"
                    style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                    title="Add custom item to bill"
                  >
                    <Plus size={12} />
                    <span>Custom</span>
                  </button>

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {filteredProducts.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Grid: High-speed tap cards */}
            <div className="pos-product-catalog-grid" style={{
              maxHeight: 'calc(100vh - 230px)',
              overflowY: 'auto',
              padding: '0 0.35rem 0.35rem 0',
              alignContent: 'start'
            }}>
              {visibleProducts.map(prod => {
                const isOut = prod.stock <= 0;
                const isLowStock = prod.stock > 0 && prod.stock <= (prod.lowStockThreshold || 2);
                const inCartItem = cart.find(c => c.id === prod.id);

                return (
                  <div 
                    key={prod.id} 
                    className="hud-card"
                    onClick={() => !isOut && addToCart(prod)}
                    style={{ 
                      padding: '0.75rem', 
                      minHeight: '116px',
                      boxSizing: 'border-box',
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      opacity: isOut ? 0.45 : 1,
                      cursor: isOut ? 'not-allowed' : 'pointer',
                      border: inCartItem ? '1.5px solid var(--accent-primary)' : isLowStock ? '1px solid var(--status-amber)' : undefined,
                      position: 'relative'
                    }}
                  >
                    {inCartItem && (
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'var(--accent-primary)',
                        color: 'var(--accent-contrast)',
                        borderRadius: '999px',
                        padding: '0.1rem 0.4rem',
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {inCartItem.qty} in cart
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{
                          fontSize: '0.62rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: 'var(--accent-primary)',
                          background: 'rgba(169, 188, 92, 0.1)',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px'
                        }}>
                          {prod.brand}
                        </span>
                        
                        {!inCartItem && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: isOut ? 'var(--status-red)' : isLowStock ? 'var(--status-amber)' : 'var(--status-green)'
                          }}>
                            ● {isOut ? 'OUT' : prod.stock}
                          </span>
                        )}
                      </div>

                      <h4 style={{ 
                        fontSize: '0.86rem', 
                        fontWeight: 700, 
                        marginBottom: '0.3rem', 
                        lineHeight: 1.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {prod.name}
                      </h4>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>📍 {prod.rack || 'R-01'}:{prod.bin || 'B-01'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.45rem', borderTop: '1px solid var(--border-color)', marginTop: '0.4rem' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)' }}>
                        ₹{prod.sellPrice.toLocaleString()}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(prod);
                        }}
                        disabled={isOut}
                        className="btn-primary"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.74rem', fontWeight: 800 }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
              {visibleProducts.length < filteredProducts.length && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCatalogLimit(limit => Math.min(limit + 80, filteredProducts.length))}
                  style={{ gridColumn: '1 / -1', justifySelf: 'center', margin: '0.25rem 0 0.5rem' }}
                >
                  Show more products ({filteredProducts.length - visibleProducts.length} remaining)
                </button>
              )}
              {filteredProducts.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No products match this category or search.
                </div>
              )}
            </div>
          </div>

          {/* Right: Active Sale Cart & Customer Invoice Details */}
          <div className="hud-card" style={{ padding: '0.95rem', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            
            {/* Cart Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingBottom: '0.55rem',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '0.65rem' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShoppingCart size={16} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 900, margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' }}>
                  ACTIVE CART
                </h3>
                <span className="mono-tag" style={{ background: 'rgba(169, 188, 92, 0.15)', color: 'var(--accent-primary)', fontWeight: 800 }}>
                  {cart.length} ITEMS
                </span>
              </div>

              {cart.length > 0 && (
                <button 
                  onClick={() => setCart([])} 
                  style={{ fontSize: '0.72rem', color: 'var(--status-red)', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', border: 'none', background: 'transparent' }}
                  title="Clear Cart"
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Customer Quick Info */}
            <div style={{ 
              background: 'var(--bg-main)', 
              padding: '0.55rem 0.65rem', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              marginBottom: '0.65rem' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <User size={12} color="var(--accent-primary)" />
                  <span>CUSTOMER INFO</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMoreCustomerFields(!showMoreCustomerFields)}
                  style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', cursor: 'pointer', background: 'transparent', border: 'none' }}
                >
                  {showMoreCustomerFields ? 'Hide Details' : '+ Address & GSTIN'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.4rem' }}>
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', fontWeight: 600, height: '32px' }}
                />
                <input
                  type="text"
                  placeholder="Mobile (10 digits)"
                  value={customerPhone}
                  onChange={(e) => handleCustomerPhoneInput(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', height: '32px' }}
                />
              </div>

              {customerMatchHint && (
                <div 
                  onClick={() => handleSelectCustomer(customerMatchHint)}
                  style={{
                    marginTop: '0.35rem',
                    padding: '0.25rem 0.45rem',
                    borderRadius: '4px',
                    background: 'rgba(169, 188, 92, 0.15)',
                    border: '1px solid var(--accent-primary)',
                    fontSize: '0.7rem',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <span>✓ Known: <strong>{customerMatchHint.name}</strong></span>
                  <span>₹{customerMatchHint.totalSpent?.toLocaleString()} spent</span>
                </div>
              )}

              {showMoreCustomerFields && (
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="Address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.25rem 0.45rem', fontSize: '0.74rem', height: '30px' }}
                  />
                  <input
                    type="text"
                    placeholder="GSTIN (Optional)"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.25rem 0.45rem', fontSize: '0.74rem', height: '30px' }}
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div style={{ 
              flex: 1, 
              maxHeight: '260px', 
              overflowY: 'auto', 
              marginBottom: '0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={24} style={{ margin: '0 auto 0.35rem', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>Cart empty. Scan or tap items on left.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div 
                    key={item.id} 
                    style={{ 
                      padding: '0.5rem 0.65rem', 
                      borderRadius: '8px', 
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {/* Item Title and Delete */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)', flex: 1 }}>
                        {item.name}
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', border: 'none', background: 'transparent' }}
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* IMEI selector if present */}
                    {(item.allImeis.length > 0 || item.selectedImeis.length > 0) && (
                      <div style={{ marginBottom: '0.3rem', padding: '0.2rem 0.35rem', background: 'rgba(169, 188, 92, 0.08)', borderRadius: '4px' }}>
                        {item.selectedImeis.map((selectedImei, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>IMEI:</span>
                            {item.allImeis.length > 0 ? (
                              <select
                                value={selectedImei}
                                onChange={(e) => updateItemImei(item.id, idx, e.target.value)}
                                className="input-field"
                                style={{ padding: '0.1rem 0.3rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', height: '24px' }}
                              >
                                <option value="">-- Choose IMEI --</option>
                                {item.allImeis.map(im => (
                                  <option key={im} value={im}>{im}</option>
                                ))}
                              </select>
                            ) : null}
                            <input
                              type="text"
                              placeholder="Or type IMEI..."
                              value={selectedImei}
                              onChange={(e) => updateItemImei(item.id, idx, e.target.value)}
                              className="input-field"
                              style={{ padding: '0.1rem 0.3rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', flex: 1, height: '24px' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quantity Stepper & Price */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button 
                          onClick={() => updateQty(item.id, -1)}
                          className="btn-secondary"
                          style={{ padding: '0.15rem 0.35rem', height: '22px' }}
                        >
                          <Minus size={11} />
                        </button>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, minWidth: '18px', textAlign: 'center', fontSize: '0.8rem' }}>
                          {item.qty}
                        </span>
                        <button 
                          onClick={() => updateQty(item.id, 1)}
                          className="btn-secondary"
                          style={{ padding: '0.15rem 0.35rem', height: '22px' }}
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@ ₹</span>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItemRate(item.id, e.target.value)}
                          className="input-field"
                          style={{ width: '75px', padding: '0.15rem 0.3rem', fontSize: '0.78rem', fontWeight: 700, height: '24px' }}
                        />
                      </div>

                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        ₹{(item.rate * item.qty).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Financial Summary */}
            <div style={{ 
              borderTop: '1px solid var(--border-color)', 
              paddingTop: '0.55rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              fontSize: '0.78rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>{isNonGst ? 'Subtotal:' : 'Subtotal (before GST):'}</span>
                <span className="font-mono">₹{subtotalBeforeTax.toFixed(2)}</span>
              </div>

              {!isNonGst ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>
                    GST added:
                    <button 
                      onClick={() => setIsInterstate(!isInterstate)}
                      style={{ marginLeft: '0.25rem', fontSize: '0.65rem', color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer', border: 'none', background: 'none' }}
                    >
                      {isInterstate ? '[IGST]' : '[CGST+SGST]'}
                    </button>
                  </span>
                  <span className="font-mono">+₹{totalGst.toFixed(2)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Tax Class:</span>
                  <span className="font-mono">0% Non-GST</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Discount (₹):</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="input-field"
                  style={{ width: '65px', padding: '0.15rem 0.3rem', fontSize: '0.78rem', textAlign: 'right', height: '24px' }}
                />
              </div>

              {/* GRAND TOTAL SPOTLIGHT */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'baseline', 
                marginTop: '0.35rem', 
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                background: 'var(--bg-main)',
                border: '1.5px solid var(--border-color)'
              }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.04em' }}>
                  TOTAL DUE
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.45rem', color: 'var(--accent-primary)', letterSpacing: '-0.02em' }}>
                  ₹{grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Express 5-Second Checkout Toolbar (Zero Popups • 1-Hit Thermal Print) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1.2fr', gap: '0.45rem', marginTop: '0.65rem' }}>
              <button
                type="button"
                onClick={() => handleExpressCheckout('Cash', false)}
                disabled={cart.length === 0}
                style={{
                  padding: '0.6rem 0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: cart.length === 0 ? 0.5 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.15rem',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
                title="Open cash payment collection and denomination entry [Shortcut: F2]"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Zap size={14} />
                  <span>[F2] CASH</span>
                </div>
                <span style={{ fontSize: '0.62rem', opacity: 0.9 }}>Collect cash, then finish</span>
              </button>

              <button
                type="button"
                onClick={() => handleExpressCheckout('UPI', false)}
                disabled={cart.length === 0}
                style={{
                  padding: '0.6rem 0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #3B60C5, #254399)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: cart.length === 0 ? 0.5 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.15rem',
                  boxShadow: '0 2px 8px rgba(59, 96, 197, 0.3)'
                }}
                title="Open UPI QR payment and transaction verification [Shortcut: F3]"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <QrCode size={14} />
                  <span>[F3] UPI</span>
                </div>
                <span style={{ fontSize: '0.62rem', opacity: 0.9 }}>Collect UTR, then finish</span>
              </button>

              <button
                type="button"
                onClick={() => handleExpressCheckout('UPI', true)}
                disabled={cart.length === 0}
                style={{
                  padding: '0.6rem 0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: cart.length === 0 ? 0.5 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.15rem',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                }}
                title="Open UPI payment; send invoice on WhatsApp after confirmation [Shortcut: F4]"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>💬</span>
                  <span>[F4] UPI + WhatsApp</span>
                </div>
                <span style={{ fontSize: '0.62rem', opacity: 0.9 }}>WhatsApp & Print</span>
              </button>
            </div>

            {/* Detailed Multi-Payment / EMI / Split Button */}
            <button
              onClick={handleInitiatePayment}
              disabled={cart.length === 0}
              style={{
                marginTop: '0.45rem',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.55rem',
                borderRadius: '6px',
                background: cart.length === 0 ? 'var(--bg-main)' : 'var(--surface-secondary)',
                color: cart.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.82rem',
                fontWeight: 800,
                border: '1px solid var(--border-color)',
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Open full split payment, EMI, or custom Khata modal"
            >
              <CreditCard size={15} />
              <span>Pay / Make Payment (₹{grandTotal.toLocaleString()})</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PAST INVOICES ARCHIVE & EDITING                                       */}
      {/* ========================================================================= */}
      {activePosTab === 'invoices' && (
        <div className="hud-card" style={{ padding: '1rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={16} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 900, margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' }}>
                INVOICES ARCHIVE
              </h3>
              <span className="mono-tag" style={{ background: 'rgba(169, 188, 92, 0.15)', color: 'var(--accent-primary)', fontWeight: 800 }}>
                {filteredInvoices.length} RECORDS
              </span>
            </div>

            <div style={{ width: '300px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search invoice #, customer, phone, item..."
                value={invoiceSearchTerm}
                onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2rem', height: '32px', fontSize: '0.8rem', borderRadius: '8px' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Invoice #</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Date</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Customer Details</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Items & IMEIs</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Total Amount</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Payment</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.invoiceNo} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                      <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)' }}>
                        {inv.invoiceNo}
                      </span>
                      {inv.isNonGst && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--status-amber)', fontWeight: 600 }}>Non-GST</div>
                      )}
                    </td>

                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {inv.date}
                    </td>

                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {inv.customerName}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {inv.customerPhone ? `Ph: ${inv.customerPhone}` : 'No phone recorded'}
                      </div>
                      {inv.customerAddress && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {inv.customerAddress}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {inv.items && inv.items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600 }}>{it.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}> x{it.qty}</span>
                          {it.imeis && it.imeis.length > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                              IMEI: {it.imeis.join(', ')}
                            </div>
                          )}
                          {it.warranty && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)' }}>
                              🛡️ {it.warranty}
                            </div>
                          )}
                        </div>
                      ))}
                      {inv.notes && (
                        <div style={{ fontSize: '0.7rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                          Note: {inv.notes}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                      ₹{inv.grandTotal?.toLocaleString()}
                    </td>

                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className="mono-tag">{inv.paymentMode}</span>
                      {inv.khataDue > 0 && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--status-red)', fontWeight: 700 }}>
                          Due: ₹{inv.khataDue.toLocaleString()}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                        <button
                          onClick={() => handleOpenEditInvoice(inv)}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Edit Customer Name, Mobile, Items, and Rates"
                        >
                          <Edit2 size={12} color="var(--accent-primary)" />
                          <span>Edit Data</span>
                        </button>

                        <button
                          onClick={() => onPrintInvoice(inv, 'thermal')}
                          className="btn-outline"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}
                          title="Print Thermal 3-inch Receipt"
                        >
                          <Printer size={12} />
                          <span>Thermal</span>
                        </button>

                        <button
                          onClick={() => onPrintInvoice(inv, 'a4')}
                          className="btn-outline"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}
                          title="Print Full A4 Invoice"
                        >
                          <FileText size={12} />
                          <span>A4</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CUSTOM / UNLISTED ITEM TO CART                                 */}
      {/* ========================================================================= */}
      {showAddCustomModal && (
        <div 
          className="drawer-overlay" 
          onClick={() => setShowAddCustomModal(false)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}
        >
          <div 
            className="illoca-card animate-fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>+ Add Custom / Unlisted Item to Invoice</div>
              <button onClick={() => setShowAddCustomModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleAddCustomItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Product Name / Service Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tempered Glass + Matte Back Cover Combo"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  required
                  className="input-field"
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    required
                    className="input-field"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Warranty Term
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 6 Months Store Warranty"
                    value={customItemWarranty}
                    onChange={(e) => setCustomItemWarranty(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Serial / IMEI (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Scan or type serial"
                    value={customItemImei}
                    onChange={(e) => setCustomItemImei(e.target.value)}
                    className="input-field"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowAddCustomModal(false)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT INVOICE DATA (CUSTOMER NAME, MOBILE, ITEMS, PRICE, WARRANTY)  */}
      {/* ========================================================================= */}
      {editingInvoiceModal && invoiceToEdit && (
        <div 
          className="drawer-overlay" 
          onClick={() => setEditingInvoiceModal(false)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: '1rem' }}
        >
          <div 
            className="illoca-card animate-fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '680px', 
              width: '100%', 
              maxHeight: '92vh', 
              overflowY: 'auto',
              padding: '1.5rem', 
              background: 'var(--surface-primary)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-accent)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit2 size={18} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                    Edit Invoice Data — #{invoiceToEdit.invoiceNo}
                  </h3>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Update customer information, contact details, item titles, prices, serials, and warranty terms.
                </div>
              </div>
              <button onClick={() => setEditingInvoiceModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            {/* Customer Details Editing */}
            <div style={{ background: 'var(--surface-card)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-primary)' }}>
                Customer Information on Bill
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    value={invoiceToEdit.customerName}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, customerName: e.target.value })}
                    required
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Customer Mobile Number *
                  </label>
                  <input
                    type="text"
                    value={invoiceToEdit.customerPhone || ''}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, customerPhone: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={invoiceToEdit.customerAddress || ''}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, customerAddress: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Customer GSTIN
                  </label>
                  <input
                    type="text"
                    value={invoiceToEdit.customerGstin || ''}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, customerGstin: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Editing */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-primary)' }}>
                Invoice Items & Pricing
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {invoiceToEdit.items.map((item, idx) => (
                  <div key={idx} style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--surface-primary)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Item Title</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...invoiceToEdit.items];
                            newItems[idx].name = e.target.value;
                            setInvoiceToEdit({ ...invoiceToEdit, items: newItems });
                          }}
                          className="input-field"
                          style={{ fontSize: '0.8rem', fontWeight: 600 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rate / Price (₹)</label>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => {
                            const newItems = [...invoiceToEdit.items];
                            newItems[idx].rate = parseFloat(e.target.value) || 0;
                            setInvoiceToEdit({ ...invoiceToEdit, items: newItems });
                          }}
                          className="input-field"
                          style={{ fontSize: '0.8rem', fontWeight: 700 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Quantity</label>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...invoiceToEdit.items];
                            newItems[idx].qty = parseInt(e.target.value, 10) || 1;
                            setInvoiceToEdit({ ...invoiceToEdit, items: newItems });
                          }}
                          className="input-field"
                          style={{ fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IMEI(s) / Serial (Comma separated)</label>
                        <input
                          type="text"
                          value={(item.imeis && item.imeis.join(', ')) || ''}
                          onChange={(e) => {
                            const newItems = [...invoiceToEdit.items];
                            newItems[idx].imeis = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            setInvoiceToEdit({ ...invoiceToEdit, items: newItems });
                          }}
                          className="input-field"
                          style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Warranty Term</label>
                        <input
                          type="text"
                          value={item.warranty || ''}
                          onChange={(e) => {
                            const newItems = [...invoiceToEdit.items];
                            newItems[idx].warranty = e.target.value;
                            setInvoiceToEdit({ ...invoiceToEdit, items: newItems });
                          }}
                          className="input-field"
                          style={{ fontSize: '0.75rem' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoice Remarks & Payment Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Invoice Notes / Terms
                </label>
                <textarea
                  value={invoiceToEdit.notes || ''}
                  onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, notes: e.target.value })}
                  rows={2}
                  className="input-field"
                  style={{ fontSize: '0.78rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Payment Mode
                </label>
                <select
                  value={invoiceToEdit.paymentMode}
                  onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, paymentMode: e.target.value })}
                  className="input-field"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Khata">Khata (Credit)</option>
                </select>

                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginTop: '0.4rem', marginBottom: '0.25rem' }}>
                  Discount (₹)
                </label>
                <input
                  type="number"
                  value={invoiceToEdit.discount || 0}
                  onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, discount: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              <button 
                type="button" 
                onClick={() => setEditingInvoiceModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>

              <button 
                type="button" 
                onClick={() => handleSaveInvoiceEdit()}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={15} />
                <span>Save Changes</span>
              </button>

              <button 
                type="button" 
                onClick={() => handleSaveInvoiceEdit('thermal')}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={15} />
                <span>Save & Print Thermal</span>
              </button>

              <button 
                type="button" 
                onClick={() => handleSaveInvoiceEdit('a4')}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#10B981', borderColor: '#10B981' }}
              >
                <FileText size={15} />
                <span>Save & Print A4</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT VERIFICATION MODAL — Bill payment receive hone ke baad hi generate/print ho */}
      {showPaymentVerifyModal && (
        <div className="drawer-overlay no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 3000 }}>
          <div className="illoca-card animate-fade-in" style={{ maxWidth: '540px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)', maxHeight: '92vh', overflowY: 'auto' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span className="mono-tag" style={{ background: 'var(--status-amber-bg)', color: 'var(--status-amber)', fontWeight: 800 }}>
                    ⚠️ STEP 1: PAYMENT VERIFICATION
                  </span>
                </div>
                <h3 style={{ margin: '0.35rem 0 0 0', fontSize: '1.25rem', fontWeight: 800 }}>
                  Collect & Confirm Payment
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Final Invoice # and stock deduction will occur only after payment is received.
                </p>
              </div>
              <button 
                onClick={() => setShowPaymentVerifyModal(false)}
                className="btn-secondary"
                style={{ padding: '0.3rem 0.55rem' }}
                title="Cancel & Return to Cart"
              >
                <X size={16} />
              </button>
            </div>

            {/* Bill Amount Spotlight Card */}
            <div style={{
              background: 'var(--surface-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Net Amount To Collect
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>
                  ₹{grandTotal.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {cart.length} Items • Customer: <strong>{customerName || 'Counter Customer'}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="mono-tag" style={{
                  background: isNonGst ? 'var(--status-amber-bg)' : 'var(--status-green-bg)',
                  color: isNonGst ? 'var(--status-amber)' : 'var(--status-green)',
                  fontWeight: 700
                }}>
                  {isNonGst ? 'Non-GST Estimate' : 'GST Tax Invoice'}
                </span>
                {customerPhone && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    📱 {customerPhone}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="input-label" style={{ marginBottom: '0.45rem', fontWeight: 700, fontSize: '0.82rem' }}>
                Select Received Payment Method:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}>
                {[
                  { id: 'UPI', label: 'Online UPI', Icon: QrCode },
                  { id: 'Cash', label: 'Cash', Icon: IndianRupee },
                  { id: 'Split', label: 'Split Cash + UPI', Icon: Zap },
                  { id: 'EMI', label: 'EMI Finance', Icon: Landmark },
                  { id: 'Card', label: 'Card', Icon: CreditCard },
                  { id: 'Khata', label: 'Khata', Icon: FileText },
                ].map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMode(pm.id)}
                    aria-pressed={paymentMode === pm.id}
                    style={{
                      minHeight: '72px',
                      padding: '0.65rem 0.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      fontSize: '0.78rem',
                      lineHeight: 1.2,
                      fontWeight: paymentMode === pm.id ? 850 : 650,
                      borderRadius: '10px',
                      border: paymentMode === pm.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: paymentMode === pm.id ? 'var(--accent-primary)' : 'var(--bg-main)',
                      color: paymentMode === pm.id ? 'var(--accent-contrast, #FFFFFF)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'var(--transition-smooth)',
                      boxShadow: paymentMode === pm.id ? '0 3px 10px rgba(12, 91, 67, 0.22)' : '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <pm.Icon size={19} strokeWidth={2.2} />
                    <span>{pm.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. ONLINE UPI QR PAYMENT PANEL WITH MANUAL VERIFICATION */}
            {/* ========================================================================= */}
            {paymentMode === 'UPI' && (
              <div style={{
                background: 'var(--surface-primary)',
                border: '1.5px solid var(--accent-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '1.15rem',
                marginBottom: '1.25rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                  Customer Scans Dynamic UPI QR Code
                </div>

                {/* Multiple Bank / UPI Account Selector (If > 1 account configured) */}
                {upiAccountsList.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {upiAccountsList.map(acc => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setSelectedUpiAccountId(acc.id)}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: '20px',
                          fontSize: '0.74rem',
                          fontWeight: selectedUpiAccountId === acc.id ? 800 : 500,
                          background: selectedUpiAccountId === acc.id ? 'var(--accent-primary)' : 'var(--surface-card)',
                          color: selectedUpiAccountId === acc.id ? '#FFFFFF' : 'var(--text-secondary)',
                          border: selectedUpiAccountId === acc.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Landmark size={12} />
                        <span>{acc.bankName || 'UPI Bank'}</span>
                        {acc.isDefault && <span style={{ fontSize: '0.65rem', color: '#FEF08A' }}>★</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Toggle: Dynamic QR (Amount pre-filled) vs Uploaded Standee QR */}
                {currentUpiAccount.qrCodeImage && (
                  <div style={{ display: 'inline-flex', background: 'var(--surface-card)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => setQrDisplayMode('dynamic')}
                      style={{
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.72rem',
                        fontWeight: qrDisplayMode === 'dynamic' ? 800 : 500,
                        background: qrDisplayMode === 'dynamic' ? 'var(--accent-primary)' : 'transparent',
                        color: qrDisplayMode === 'dynamic' ? '#FFF' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Dynamic QR (₹{grandTotal})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrDisplayMode('standee')}
                      style={{
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.72rem',
                        fontWeight: qrDisplayMode === 'standee' ? 800 : 500,
                        background: qrDisplayMode === 'standee' ? 'var(--accent-primary)' : 'transparent',
                        color: qrDisplayMode === 'standee' ? '#FFF' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      🖼️ Shop Standee QR
                    </button>
                  </div>
                )}
                
                <div style={{
                  background: '#FFFFFF',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-block',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  marginBottom: '0.65rem'
                }}>
                  {qrDisplayMode === 'standee' && currentUpiAccount.qrCodeImage ? (
                    <div>
                      <img
                        src={currentUpiAccount.qrCodeImage}
                        alt="Shop Standee QR"
                        style={{ width: '190px', height: '190px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                      />
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0A0D14', marginTop: '0.35rem' }}>
                        Scan Standee & Enter ₹{grandTotal.toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <img
                        src={getUpiQrUrl(currentUpiAccount.upiId || 'alzino.bodhan@okhdfcbank', currentUpiAccount.accountName || shopConfig.name || 'ALZINO', grandTotal, 'BILL')}
                        alt="Scan Dynamic UPI QR Code"
                        style={{ width: '190px', height: '190px', display: 'block', margin: '0 auto' }}
                      />
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0A0D14', marginTop: '0.35rem' }}>
                        Pay: ₹{grandTotal.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      UPI ID: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{currentUpiAccount.upiId || 'alzino.bodhan@okhdfcbank'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(currentUpiAccount.upiId || 'alzino.bodhan@okhdfcbank');
                        setCopiedUpi(true);
                        setTimeout(() => setCopiedUpi(false), 2000);
                      }}
                      style={{
                        background: 'var(--surface-card)',
                        border: '1px solid var(--border-color)',
                        padding: '0.2rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: copiedUpi ? 'var(--status-green)' : 'var(--text-secondary)'
                      }}
                    >
                      {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  {currentUpiAccount.bankName && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      🏦 {currentUpiAccount.bankName} {currentUpiAccount.accountName ? `(${currentUpiAccount.accountName})` : ''}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'left', marginBottom: '0.75rem' }}>
                  <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    UPI UTR / transaction ID (required):
                  </label>
                  <input
                    type="text"
                    value={upiTxnRef}
                    onChange={(e) => setUpiTxnRef(e.target.value)}
                    placeholder="Enter the transaction ID shown in the payment app"
                    className="input-field"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                {/* Manual Verification Checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', background: 'var(--surface-card)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '0.95rem', cursor: 'pointer', fontSize: '0.78rem' }}>
                  <input
                    type="checkbox"
                    checked={upiVerified}
                    onChange={(e) => setUpiVerified(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>
                    <strong>Payment Alert Verified</strong> in PhonePe / GPay Soundbox or Bank SMS
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => handleConfirmAndGenerateInvoice()}
                  disabled={!upiTxnRef.trim() || !upiVerified}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.92rem' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Payment Done · Create Invoice (₹{grandTotal.toLocaleString()})</span>
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. CASH PAYMENT PANEL */}
            {/* ========================================================================= */}
            {paymentMode === 'Cash' && (
              <div style={{
                background: 'var(--surface-primary)',
                border: '1.5px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.15rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>💵 Cash Payment Counter</span>
                  <span className="mono-tag" style={{ background: 'var(--status-green-bg)', color: 'var(--status-green)' }}>
                    Exact Tender & Change
                  </span>
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Count the notes and coins received:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(82px, 1fr))', gap: '0.4rem' }}>
                    {cashDenominations.map(denomination => (
                      <label key={denomination} style={{ display: 'grid', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        ₹{denomination} notes / coins
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={cashDenominationCounts[denomination] ?? ''}
                          onChange={event => setCashDenominationCounts(current => ({ ...current, [denomination]: Math.max(0, Math.floor(Number(event.target.value) || 0)) }))}
                          className="input-field"
                          inputMode="numeric"
                          aria-label={`Count of ₹${denomination} notes or coins`}
                          style={{ padding: '0.4rem', fontFamily: 'var(--font-mono)' }}
                        />
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontWeight: 800 }}>
                    <span>Cash received</span><span>₹{cashDenominationTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Live Return Change Calculator */}
                <div style={{
                  background: 'var(--surface-card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  padding: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Change to Return to Customer:
                  </span>
                  <span style={{
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: cashDenominationTotal >= grandTotal ? 'var(--status-green)' : 'var(--status-amber)'
                  }}>
                    ₹{Math.max(0, cashDenominationTotal - grandTotal).toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmAndGenerateInvoice()}
                  disabled={cashDenominationTotal < grandTotal}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.92rem' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Payment Done · Create Invoice (₹{grandTotal.toLocaleString()})</span>
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. SPLIT PAYMENT PANEL (CASH + ONLINE UPI QR) */}
            {/* ========================================================================= */}
            {paymentMode === 'Split' && (
              <div style={{
                background: 'var(--surface-primary)',
                border: '1.5px solid var(--accent-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '1.15rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)' }}>
                    ⚡ Split Payment: Cash + Online UPI QR
                  </span>
                  <span className="mono-tag" style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}>
                    Total: ₹{grandTotal.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label className="input-label" style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                      💵 Cash Portion (₹):
                    </label>
                    <input
                      type="number"
                      value={splitCashAmount}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(grandTotal, Number(e.target.value) || 0));
                        setSplitCashAmount(val);
                        setSplitUpiAmount(Math.max(0, grandTotal - val));
                      }}
                      className="input-field"
                      style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div>
                    <label className="input-label" style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                      📱 Online UPI Balance (₹):
                    </label>
                    <input
                      type="number"
                      value={splitUpiAmount}
                      readOnly
                      className="input-field"
                      style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', background: 'var(--surface-card)' }}
                    />
                  </div>
                </div>

                {/* Dynamic QR for Split UPI Amount */}
                {splitUpiAmount > 0 && (
                  <div style={{ textAlign: 'center', background: 'var(--surface-card)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Customer Scans QR for Remaining UPI Portion: <strong>₹{splitUpiAmount.toLocaleString()}</strong>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '0.5rem', borderRadius: 'var(--radius-sm)', display: 'inline-block', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <img
                        src={getUpiQrUrl(currentUpiAccount.upiId || 'alzino.bodhan@okhdfcbank', currentUpiAccount.accountName || shopConfig.name || 'ALZINO', splitUpiAmount, 'SPLIT')}
                        alt="Split UPI QR"
                        style={{ width: '140px', height: '140px', display: 'block', margin: '0 auto' }}
                      />
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        value={splitUpiTxnRef}
                        onChange={(e) => setSplitUpiTxnRef(e.target.value)}
                        placeholder="UPI UTR / Reference No. (e.g. 428190284910)"
                        className="input-field"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)', width: '100%', maxWidth: '320px', margin: '0 auto' }}
                      />
                    </div>
                  </div>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '0.95rem', cursor: 'pointer', fontSize: '0.78rem' }}>
                  <input
                    type="checkbox"
                    checked={splitVerified}
                    onChange={(e) => setSplitVerified(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', width: '15px', height: '15px' }}
                  />
                  <span>
                    <strong>Verified:</strong> Received ₹{Number(splitCashAmount || 0).toLocaleString()} in cash and ₹{Number(splitUpiAmount || 0).toLocaleString()} via Online UPI
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => handleConfirmAndGenerateInvoice()}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.92rem' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Payment Done · Create Invoice (₹{grandTotal.toLocaleString()})</span>
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. MANUAL EMI FINANCING PANEL (BAJAJ, HDB, IDFC, TVS, CC EMI, IN-HOUSE) */}
            {/* ========================================================================= */}
            {paymentMode === 'EMI' && (
              <div style={{
                background: 'var(--surface-primary)',
                border: '1.5px solid var(--status-teal)',
                borderRadius: 'var(--radius-md)',
                padding: '1.15rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Landmark size={16} color="var(--status-teal)" />
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--status-teal)' }}>
                      Consumer Durable / Smartphone EMI Finance
                    </span>
                  </div>
                  <span className="mono-tag" style={{ background: 'var(--status-teal-bg)', color: 'var(--status-teal)', fontWeight: 700 }}>
                    Total: ₹{grandTotal.toLocaleString()}
                  </span>
                </div>

                {/* Financier Selector */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <label className="input-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>
                    Select Finance Partner / Loan Provider:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.35rem', marginBottom: '0.45rem' }}>
                    {[
                      'Bajaj Finserv',
                      'HDB Financial Services',
                      'IDFC First Bank',
                      'TVS Credit',
                      'Home Credit / DMI',
                      'Credit Card EMI',
                      'Store In-House EMI',
                      'Other'
                    ].map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setEmiFinancier(f)}
                        style={{
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.74rem',
                          fontWeight: emiFinancier === f ? 800 : 500,
                          borderRadius: 'var(--radius-sm)',
                          border: emiFinancier === f ? '1px solid var(--status-teal)' : '1px solid var(--border-color)',
                          background: emiFinancier === f ? 'var(--status-teal-bg)' : 'var(--surface-card)',
                          color: emiFinancier === f ? 'var(--status-teal)' : 'var(--text-primary)',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {emiFinancier === 'Other' && (
                    <input
                      type="text"
                      value={customFinancier}
                      onChange={(e) => setCustomFinancier(e.target.value)}
                      placeholder="Enter Custom Financier / Bank Name"
                      className="input-field"
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem', marginTop: '0.3rem' }}
                    />
                  )}
                </div>

                {/* Down Payment & Loan Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', background: 'var(--surface-card)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '0.85rem' }}>
                  <div>
                    <label className="input-label" style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                      Upfront Down Payment Received (₹):
                    </label>
                    <input
                      type="number"
                      value={emiDownPayment}
                      onChange={(e) => setEmiDownPayment(Math.max(0, Math.min(grandTotal, Number(e.target.value) || 0)))}
                      placeholder="0 for Zero Down Payment"
                      className="input-field"
                      style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                    />

                    {Number(emiDownPayment) > 0 && (
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
                        {['Cash', 'UPI'].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setEmiDownPaymentMode(m)}
                            className="btn-secondary"
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.72rem',
                              background: emiDownPaymentMode === m ? 'var(--badge-bg)' : 'transparent',
                              color: emiDownPaymentMode === m ? 'var(--badge-text)' : 'var(--text-secondary)'
                            }}
                          >
                            {m === 'Cash' ? '💵 Cash Down Payment' : '📱 UPI Down Payment'}
                          </button>
                        ))}
                      </div>
                    )}

                    {Number(emiDownPayment) > 0 && emiDownPaymentMode === 'UPI' && (
                      <div style={{ marginTop: '0.4rem', textAlign: 'center', background: '#FFFFFF', padding: '0.4rem', borderRadius: '4px' }}>
                        <img
                          src={getUpiQrUrl(currentUpiAccount.upiId || 'alzino.bodhan@okhdfcbank', currentUpiAccount.accountName || shopConfig.name || 'ALZINO', Number(emiDownPayment), 'DOWNPAY')}
                          alt="Down Payment QR"
                          style={{ width: '90px', height: '90px', display: 'block', margin: '0 auto' }}
                        />
                        <span style={{ fontSize: '0.65rem', color: '#111', fontWeight: 700 }}>Scan ₹{Number(emiDownPayment).toLocaleString()} DP</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Financed / Loan Balance:</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--status-teal)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                      ₹{emiLoanAmount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Disbursed by {emiFinancier === 'Other' ? (customFinancier || 'Financier') : emiFinancier}
                    </div>
                  </div>
                </div>

                {/* Tenure Selector & Monthly EMI */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="input-label" style={{ fontWeight: 700, fontSize: '0.75rem', margin: 0 }}>
                      Loan Tenure Duration:
                    </label>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--status-teal)', fontFamily: 'var(--font-mono)' }}>
                      EMI: ₹{Number(emiMonthlyAmount || 0).toLocaleString()} / month
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {[3, 6, 8, 9, 10, 12, 18, 24].map(months => (
                      <button
                        key={months}
                        type="button"
                        onClick={() => setEmiTenureMonths(months)}
                        style={{
                          padding: '0.3rem 0.55rem',
                          fontSize: '0.74rem',
                          fontWeight: emiTenureMonths === months ? 800 : 500,
                          borderRadius: 'var(--radius-sm)',
                          border: emiTenureMonths === months ? '1px solid var(--status-teal)' : '1px solid var(--border-color)',
                          background: emiTenureMonths === months ? 'var(--status-teal-bg)' : 'transparent',
                          color: emiTenureMonths === months ? 'var(--status-teal)' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {months}M
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.72rem' }}>Monthly Installment (₹/mo):</label>
                      <input
                        type="number"
                        value={emiMonthlyAmount}
                        onChange={(e) => setEmiMonthlyAmount(Number(e.target.value) || 0)}
                        className="input-field"
                        style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.72rem' }}>DO / Approval No. *:</label>
                      <input
                        type="text"
                        value={emiApprovalCode}
                        onChange={(e) => setEmiApprovalCode(e.target.value)}
                        placeholder="e.g. DO-982142 / Loan Ref"
                        className="input-field"
                        style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Verification Checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '0.95rem', cursor: 'pointer', fontSize: '0.78rem' }}>
                  <input
                    type="checkbox"
                    checked={emiVerified}
                    onChange={(e) => setEmiVerified(e.target.checked)}
                    style={{ accentColor: 'var(--status-teal)', width: '15px', height: '15px' }}
                  />
                  <span>
                    <strong>Verified:</strong> EMI Loan Sanctioned & Delivery Order (DO) confirmed on partner terminal
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => handleConfirmAndGenerateInvoice()}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.92rem', background: 'var(--status-teal)', borderColor: 'var(--status-teal)', color: '#FFFFFF' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Payment Done · Create Invoice (DP: ₹{Number(emiDownPayment || 0).toLocaleString()} | Loan: ₹{emiLoanAmount.toLocaleString()})</span>
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. CARD PAYMENT PANEL */}
            {/* ========================================================================= */}
            {paymentMode === 'Card' && (
              <div style={{
                background: 'var(--surface-primary)',
                border: '1.5px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.15rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  💳 Card Terminal / POS Machine Swipe
                </div>
                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Swipe / Tap credit or debit card for ₹{grandTotal.toLocaleString()} on physical EDC terminal.
                </p>

                <div style={{ marginBottom: '0.85rem' }}>
                  <label className="input-label">Card terminal approval / transaction ID (required):</label>
                  <input
                    type="text"
                    value={cardAuthCode}
                    onChange={(e) => setCardAuthCode(e.target.value)}
                    placeholder="e.g. AUTH-88219"
                    className="input-field"
                    style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmAndGenerateInvoice()}
                  disabled={!cardAuthCode.trim()}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.92rem' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Payment Done · Create Invoice (₹{grandTotal.toLocaleString()})</span>
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 6. KHATA CREDIT SALE PANEL */}
            {/* ========================================================================= */}
            {paymentMode === 'Khata' && (
              <div style={{
                background: 'var(--surface-primary)',
                border: '1.5px solid var(--status-amber)',
                borderRadius: 'var(--radius-md)',
                padding: '1.15rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--status-amber)', marginBottom: '0.5rem' }}>
                  📒 Customer Credit / Khata Sale Authorization
                </div>
                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  This bill of <strong>₹{grandTotal.toLocaleString()}</strong> will be added to customer's ledger due balance.
                </p>

                <div style={{
                  background: 'var(--surface-card)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Customer Name:</span>
                    <strong>{customerName || 'Customer'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Phone:</span>
                    <strong>{customerPhone || 'Not specified'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-red)' }}>
                    <span>Amount to be Added to Khata:</span>
                    <strong>₹{grandTotal.toLocaleString()}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmAndGenerateInvoice()}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.92rem', background: 'var(--status-amber)', borderColor: 'var(--status-amber)', color: '#000' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Confirm Khata · Create Invoice (₹{grandTotal.toLocaleString()})</span>
                </button>
              </div>
            )}

            {/* Security Guarantee Note */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShieldCheck size={16} color="var(--accent-primary)" />
              <span>
                <strong>Store Counter Safeguard Active:</strong> Real-time inventory deduction and sequential invoice numbers trigger only after payment verification above.
              </span>
            </div>

            {/* Security Guarantee Note */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShieldCheck size={16} color="var(--accent-primary)" />
              <span>
                <strong>Store Counter Safeguard Active:</strong> Real-time inventory deduction and sequential invoice numbers trigger only after payment verification above.
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Sale Completed Modal */}
      {showCheckoutModal && completedInvoice && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 3000 }}>
          <div className="illoca-card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ 
                width: '54px', 
                height: '54px', 
                background: 'var(--status-green-bg)', 
                color: 'var(--status-green)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 0.75rem' 
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>
                {completedInvoice.isNonGst ? 'Non-GST Estimate Completed!' : 'GST Tax Invoice Completed!'}
              </h2>
              <span className="mono-tag" style={{ fontSize: '0.85rem' }}>
                {completedInvoice.isNonGst ? 'Estimate #' : 'Invoice #'}{completedInvoice.invoiceNo}
              </span>
            </div>

            {/* Quick Bill Details */}
            <div style={{ 
              background: 'var(--surface-card)', 
              padding: '0.85rem', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border-color)',
              marginBottom: '1.25rem',
              fontSize: '0.88rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Format:</span>
                <span className="mono-tag" style={{
                  background: completedInvoice.isNonGst ? 'var(--status-amber-bg)' : 'var(--status-green-bg)',
                  color: completedInvoice.isNonGst ? 'var(--status-amber)' : 'var(--status-green)'
                }}>
                  {completedInvoice.isNonGst ? 'Non-GST / Estimate' : 'GST Tax Invoice'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Customer:</span>
                <span style={{ fontWeight: 600 }}>{completedInvoice.customerName} {completedInvoice.customerPhone && `(${completedInvoice.customerPhone})`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Payment Mode:</span>
                <span className="mono-tag">{completedInvoice.paymentMode}</span>
              </div>
              
              {/* EMI Details Spotlight */}
              {completedInvoice.emiDetails && (
                <div style={{ background: 'var(--status-teal-bg)', color: 'var(--status-teal)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', margin: '0.45rem 0', fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 800, marginBottom: '0.15rem' }}>
                    🏷️ EMI Financed by {completedInvoice.emiDetails.financier}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                    <span>Down Payment: ₹{Number(completedInvoice.emiDetails.downPayment || 0).toLocaleString()}</span>
                    <span>Loan: ₹{Number(completedInvoice.emiDetails.loanAmount || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', marginTop: '0.15rem' }}>
                    Tenure: {completedInvoice.emiDetails.tenureMonths} Months @ ₹{Number(completedInvoice.emiDetails.monthlyEmi || 0).toLocaleString()} / mo
                    {completedInvoice.emiDetails.approvalCode && ` • DO: ${completedInvoice.emiDetails.approvalCode}`}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Amount Paid:</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.05rem', fontFamily: 'var(--font-mono)' }}>
                  ₹{completedInvoice.paidAmount.toLocaleString()}
                </span>
              </div>
              {completedInvoice.khataDue > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-red)' }}>
                  <span>Added to Khata (Due):</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>₹{completedInvoice.khataDue.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Action Buttons: 3" Thermal vs A4 GST Invoice vs Edit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  onPrintInvoice(completedInvoice, 'thermal');
                }}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
              >
                <Printer size={18} />
                <span>Print 3" (80mm) Thermal {completedInvoice.isNonGst ? 'Cash Memo' : 'Receipt'}</span>
              </button>

              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  onPrintInvoice(completedInvoice, 'thermal-58');
                }}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}
              >
                <Printer size={16} />
                <span>Print 2" (58mm) Compact Thermal</span>
              </button>

              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  onPrintInvoice(completedInvoice, 'a4');
                }}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', borderColor: 'var(--border-accent)' }}
              >
                <FileText size={18} color="var(--accent-primary)" />
                <span>Print Official A4 {completedInvoice.isNonGst ? 'Estimate Bill' : 'GST Tax Invoice'}</span>
              </button>

              {/* Edit Invoice Button */}
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  handleOpenEditInvoice(completedInvoice);
                }}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.6rem', color: 'var(--accent-primary)' }}
              >
                <Edit2 size={15} />
                <span>✏️ Edit Customer / Price / Warranty on this Bill</span>
              </button>

              {completedInvoice && (
                <button
                  type="button"
                  onClick={() => openWhatsAppInvoice(completedInvoice, shopConfig)}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.6rem', color: '#10B981', fontWeight: 700 }}
                >
                  <Share2 size={16} />
                  <span>Send Itemized WhatsApp Invoice with Warranty</span>
                </button>
              )}

              <button
                onClick={() => setShowCheckoutModal(false)}
                className="btn-outline"
                style={{ width: '100%', marginTop: '0.35rem' }}
              >
                Done / Next Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile / Webcam Barcode Scanner for POS Billing */}
      {showPosCameraScanner && (
        <CameraBarcodeScannerModal
          isOpen={showPosCameraScanner}
          onClose={() => setShowPosCameraScanner(false)}
          onScan={(scannedCode) => {
            handleProcessBarcodeScan(scannedCode);
          }}
          continuous
          title="POS Camera Barcode Scanner"
          description="Scan every unit barcode; matching items combine as quantities in the cart"
        />
      )}

    </div>
  );
}
