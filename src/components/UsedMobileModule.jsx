import React, { useState, useMemo } from 'react';
import { 
  Smartphone, 
  UserCheck, 
  FileText, 
  Printer, 
  Plus, 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  Search, 
  Eye, 
  AlertTriangle, 
  History,
  Package,
  Receipt,
  Tag,
  Sparkles,
  ArrowUpRight,
  Check,
  Percent,
  CheckSquare,
  Square,
  DollarSign,
  Globe,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import MarketPriceCompareModal from './MarketPriceCompareModal';
import { getAvailableBrandsForCategory, saveCustomBrand } from '../utils/customTaxonomy';
import { saveProductImage, compressImageFile } from '../utils/productImageStore';

export default function UsedMobileModule({ 
  usedPurchases = [], 
  setUsedPurchases = () => {}, 
  inventory = [], 
  setInventory = () => {}, 
  invoices = [],
  setInvoices = () => {},
  customers = [],
  setCustomers = () => {},
  onPrintVoucher = () => {},
  onPrintInvoice = () => {},
  shopConfig = {}
}) {
  const [marketCompareDevice, setMarketCompareDevice] = useState(null);
  // Main view navigation: 'stock' (Refurbished Stock & Resell), 'buy' (Inward KYC), 'resold' (Billing Archive), 'purchases' (Inward History)
  const [activeSubTab, setActiveSubTab] = useState('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewModalImage, setPreviewModalImage] = useState(null);

  // Success feedback banner
  const [notification, setNotification] = useState(null);
  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  // =========================================================================
  // 1. BUY USED PHONE (INWARD KYC FORM STATE)
  // =========================================================================
  const [sellerName, setSellerName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [address, setAddress] = useState('');

  const [brand, setBrand] = useState('Apple');
  const [customBrand, setCustomBrand] = useState('');
  const availableBrands = useMemo(() => {
    return getAvailableBrandsForCategory('Used Mobiles', inventory);
  }, [inventory]);
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [batteryHealth, setBatteryHealth] = useState('90');
  const [condition, setCondition] = useState('Grade A+ (Like New, Zero scratches)');
  const [buyPrice, setBuyPrice] = useState('');
  const [targetSellPrice, setTargetSellPrice] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [docAttached, setDocAttached] = useState(true);
  const [idImage, setIdImage] = useState(null);
  const [billImage, setBillImage] = useState(null);
  const [deviceImages, setDeviceImages] = useState([]);

  // =========================================================================
  // 2. RESELL / GENERATE BILL MODAL STATE
  // =========================================================================
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [resellPrice, setResellPrice] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('Bodhan, Telangana');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [refurbWarranty, setRefurbWarranty] = useState('15 Days ALZINO Testing Warranty');
  const [resellBillingType, setResellBillingType] = useState('non-gst'); // 'non-gst' (Margin scheme) or 'gst'
  const [resellPaymentMode, setResellPaymentMode] = useState('Cash');
  const [resellDiscount, setResellDiscount] = useState(0);
  const [selectedAccessories, setSelectedAccessories] = useState([
    'Fast Charger & Adapter',
    'Type-C / Lightning Cable',
    'Tempered Glass Applied'
  ]);
  const [invoiceNotes, setInvoiceNotes] = useState(
    'Refurbished device tested with 28-point diagnostics. Screen, camera, battery & network fully functional.'
  );

  const accessoryOptions = [
    'Original / Compatible Box',
    'Fast Charger & Adapter',
    'Type-C / Lightning Cable',
    'Tempered Glass Applied',
    'Protective Back Case',
    'Original Purchase Bill Attached'
  ];

  const warrantyOptions = [
    '15 Days ALZINO Testing Warranty',
    '30 Days Store Warranty',
    '3 Months Shop Hardware Warranty',
    '6 Months Refurbished Warranty',
    'Brand Warranty Valid',
    'No Warranty (Sold As-Is)'
  ];

  // =========================================================================
  // FILE UPLOAD HANDLERS
  // =========================================================================
  const handleImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert("Image file size should be under 8MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdImage(reader.result);
        setDocAttached(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBillUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert("Bill file size should be under 8MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeviceImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const processedImages = await Promise.all(
        files.map(async (file) => {
          try {
            return await compressImageFile(file, 900, 0.82);
          } catch {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(file);
            });
          }
        })
      );
      const validImages = processedImages.filter(Boolean);
      if (validImages.length > 0) {
        setDeviceImages(prev => [...prev, ...validImages]);
      }
    } catch (err) {
      console.error("Error uploading handset photos:", err);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const removeDeviceImage = (index) => {
    setDeviceImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Toggle accessory checkbox in billing modal
  const toggleAccessory = (acc) => {
    setSelectedAccessories(prev => 
      prev.includes(acc) ? prev.filter(a => a !== acc) : [...prev, acc]
    );
  };

  // Customer phone autocompletion in billing modal
  const handleBuyerPhoneChange = (val) => {
    setBuyerPhone(val);
    const existing = customers.find(c => c.phone && c.phone.replace(/\D/g, '') === val.replace(/\D/g, ''));
    if (existing && !buyerName) {
      setBuyerName(existing.name);
      if (existing.address) setBuyerAddress(existing.address);
      if (existing.gstin) setBuyerGstin(existing.gstin);
    }
  };

  // =========================================================================
  // SUBMIT INWARD USED PHONE (BUY FROM CUSTOMER)
  // =========================================================================
  const handleInwardSubmit = async (e) => {
    e.preventDefault();
    if (!sellerName || !mobile || !imei1 || !buyPrice || !model) {
      alert("Please fill in Seller Name, Mobile, Model, IMEI 1 and Buy Price.");
      return;
    }

    const voucherNo = `ALZ-VOUCH-${String(usedPurchases.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const effectiveBrand = brand === 'Other' ? (customBrand.trim() || 'Other') : brand;
    if (effectiveBrand && effectiveBrand !== 'Other') {
      saveCustomBrand(effectiveBrand, 'Used Mobiles');
    }
    const cleanBuy = parseFloat(buyPrice);
    const calculatedSell = targetSellPrice ? parseFloat(targetSellPrice) : Math.round(cleanBuy * 1.18);
    const prodId = `PROD-USED-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const frontImg = (deviceImages && deviceImages[0]) || null;
    const backImg = (deviceImages && deviceImages[1]) || null;

    if (frontImg) {
      try { await saveProductImage(prodId, 'front', frontImg); } catch (e) {}
    }
    if (backImg) {
      try { await saveProductImage(prodId, 'back', backImg); } catch (e) {}
    }

    const newPurchase = {
      id: prodId,
      voucherNo,
      date: today,
      sellerName: sellerName.trim(),
      fatherName: fatherName.trim(),
      mobile: mobile.trim(),
      idType,
      aadhaarNo: aadhaarNo.trim(),
      address: address.trim() || 'Bodhan, Telangana',
      brand: effectiveBrand,
      model: model.trim(),
      color: color.trim() || 'Standard',
      imei1: imei1.trim(),
      imei2: imei2.trim(),
      condition: `${condition} (Battery: ${batteryHealth}%)`,
      batteryHealth: batteryHealth,
      buyPrice: cleanBuy,
      purchasePrice: cleanBuy,
      sellPrice: calculatedSell,
      targetSellPrice: calculatedSell,
      expectedSellingPrice: calculatedSell,
      paymentMode,
      documentAttached: docAttached || Boolean(idImage) || Boolean(billImage),
      idImage: idImage || null,
      billImage: billImage || null,
      deviceImages: deviceImages || [],
      image: frontImg || null,
      addedToInventory: true,
      status: 'In Stock',
      warranty: '15 Days ALZINO Testing Warranty'
    };

    // Add this device directly to Inventory under "Used Mobiles"
    const newInventoryItem = {
      id: prodId,
      category: 'Used Mobiles',
      brand: effectiveBrand,
      model: model.trim(),
      name: `Used ${effectiveBrand} ${model.trim()} (${color || 'Standard'})`,
      hsn: '851712',
      gstRate: 18,
      buyPrice: cleanBuy,
      sellPrice: calculatedSell,
      mrp: Math.round(calculatedSell * 1.1),
      stock: 1,
      lowStockThreshold: 1,
      barcode: `ALZ-USED-${imei1.slice(-6)}`,
      imeis: imei2 ? [imei1.trim(), imei2.trim()] : [imei1.trim()],
      imei1: imei1.trim(),
      imei2: imei2 ? imei2.trim() : '',
      condition: `${condition} (Battery: ${batteryHealth}%)`,
      kycRef: voucherNo,
      warranty: '15 Days ALZINO Testing Warranty',
      status: 'Active',
      color: color.trim() || 'Standard',
      department: 'mobiles',
      type: 'refurbished',
      image: frontImg || backImg || (deviceImages && deviceImages[0]) || null,
      deviceImages: deviceImages || [],
      images: (frontImg || backImg) ? { front: Boolean(frontImg), back: Boolean(backImg), v: Date.now() } : undefined,
      description: `Certified Pre-Owned ${effectiveBrand} ${model.trim()} with ${condition} (Battery Health: ${batteryHealth}%). Tested 24-point diagnostic QC check with 15-day ALZINO testing warranty.`,
      addedAt: new Date().toISOString()
    };

    setInventory(prev => [newInventoryItem, ...prev]);
    setUsedPurchases(prev => [newPurchase, ...prev]);

    // Reset Form
    setSellerName('');
    setFatherName('');
    setMobile('');
    setAadhaarNo('');
    setAddress('');
    setBrand('Apple');
    setCustomBrand('');
    setModel('');
    setColor('');
    setImei1('');
    setImei2('');
    setBuyPrice('');
    setTargetSellPrice('');
    setIdImage(null);
    setBillImage(null);
    setDeviceImages([]);

    showToast(`Device ${effectiveBrand} ${model} inwarded successfully and added to Refurbished Stock!`);
    
    // Auto-trigger print of legal voucher
    onPrintVoucher(newPurchase);

    // Switch to Stock tab to see newly inwarded device
    setActiveSubTab('stock');
  };

  // =========================================================================
  // OPEN RESELL / GENERATE BILL MODAL FOR A DEVICE
  // =========================================================================
  const handleOpenResellModal = (device) => {
    setSelectedDevice(device);
    setResellDiscount(0);
    setResellPrice(String(device.sellPrice || Math.round((device.buyPrice || 15000) * 1.15)));
    setBuyerName('');
    setBuyerPhone('');
    setBuyerAddress('Bodhan, Telangana');
    setBuyerGstin('');
    setRefurbWarranty(device.warranty || '15 Days ALZINO Testing Warranty');
    setResellBillingType('non-gst');
    setResellPaymentMode('Cash');
    setBillModalOpen(true);
  };

  // =========================================================================
  // COMMIT RESELL BILL (GENERATE INVOICE & DEDUCT STOCK)
  // =========================================================================
  const handleGenerateResellInvoice = (printFormat = 'thermal') => {
    if (!selectedDevice) return;
    if (!buyerName.trim()) {
      alert("Please enter the Buyer / Customer Full Name.");
      return;
    }
    if (!buyerPhone.trim()) {
      alert("Please enter the Buyer Mobile Number.");
      return;
    }
    const finalPrice = parseFloat(resellPrice);
    const discountAmt = Math.max(0, Number(resellDiscount) || 0);
    const grandTotalPrice = Math.max(0, Math.round(finalPrice - discountAmt));
    if (!finalPrice || finalPrice <= 0) {
      alert("Please enter a valid final selling price.");
      return;
    }

    const isNonGst = resellBillingType === 'non-gst';
    const prefix = isNonGst ? 'ALZ-REF' : 'ALZ-INV';
    const invoiceNo = `${prefix}-${String(invoices.length + 101).padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const deviceCost = Number(selectedDevice.buyPrice) || 0;
    const marginProfit = Math.round(grandTotalPrice - deviceCost);
    const primaryImei = selectedDevice.imeis && selectedDevice.imeis.length > 0 
      ? selectedDevice.imeis 
      : [selectedDevice.barcode || ''];

    // Construct official Invoice
    const newInvoice = {
      invoiceNo,
      date: today,
      isNonGst,
      isRefurbishedResale: true,
      invoiceType: isNonGst ? 'Refurbished Device Cash Memo' : 'GST Tax Invoice (Refurbished)',
      customerName: buyerName.trim(),
      customerPhone: buyerPhone.trim(),
      customerAddress: buyerAddress.trim() || 'Bodhan, Telangana',
      customerGstin: isNonGst ? '' : buyerGstin.trim(),
      paymentMode: resellPaymentMode,
      items: [
        {
          id: selectedDevice.id,
          name: selectedDevice.name,
          category: 'Used Mobiles',
          hsn: selectedDevice.hsn || '851712',
          qty: 1,
          imeis: primaryImei,
          rate: finalPrice,
          buyPrice: deviceCost,
          gstRate: isNonGst ? 0 : 18,
          taxable: isNonGst ? finalPrice : parseFloat((finalPrice / 1.18).toFixed(2)),
          total: finalPrice,
          profit: marginProfit,
          condition: selectedDevice.condition || 'Tested & Certified',
          warranty: refurbWarranty,
          accessories: selectedAccessories.join(', '),
        }
      ],
      taxableAmount: isNonGst ? grandTotalPrice : parseFloat((grandTotalPrice / 1.18).toFixed(2)),
      cgstTotal: isNonGst ? 0 : parseFloat(((grandTotalPrice - (grandTotalPrice / 1.18)) / 2).toFixed(2)),
      sgstTotal: isNonGst ? 0 : parseFloat(((grandTotalPrice - (grandTotalPrice / 1.18)) / 2).toFixed(2)),
      igstTotal: 0,
      discount: discountAmt,
      grandTotal: grandTotalPrice,
      paidAmount: resellPaymentMode === 'Khata' ? 0 : grandTotalPrice,
      khataDue: resellPaymentMode === 'Khata' ? grandTotalPrice : 0,
      totalProfit: marginProfit,
      warrantyNotes: refurbWarranty,
      accessoriesNotes: selectedAccessories.join(', '),
      notes: invoiceNotes.trim()
    };

    // 1. Commit to invoices state
    setInvoices(prev => [newInvoice, ...prev]);

    // 2. Deduct stock from inventory (set stock to 0)
    setInventory(prev => prev.map(inv => {
      if (inv.id === selectedDevice.id) {
        return {
          ...inv,
          stock: 0,
          status: 'Sold',
          soldTo: buyerName.trim(),
          soldAt: finalPrice,
          soldDate: today,
          soldInvoiceNo: invoiceNo
        };
      }
      return inv;
    }));

    // 3. Update customers list
    setCustomers(prev => {
      const matchIndex = prev.findIndex(c => c.phone && c.phone.replace(/\D/g, '') === buyerPhone.replace(/\D/g, ''));
      if (matchIndex >= 0) {
        const updated = [...prev];
        updated[matchIndex] = {
          ...updated[matchIndex],
          totalSpent: (updated[matchIndex].totalSpent || 0) + grandTotalPrice,
          balanceDue: (updated[matchIndex].balanceDue || 0) + (resellPaymentMode === 'Khata' ? grandTotalPrice : 0),
        };
        return updated;
      } else {
        const newCust = {
          id: `CUST-${String(prev.length + 1).padStart(3, '0')}`,
          name: buyerName.trim(),
          phone: buyerPhone.trim(),
          address: buyerAddress.trim() || 'Bodhan',
          gstin: buyerGstin.trim(),
          totalSpent: grandTotalPrice,
          balanceDue: resellPaymentMode === 'Khata' ? grandTotalPrice : 0,
        };
        return [newCust, ...prev];
      }
    });

    // Close modal
    setBillModalOpen(false);
    setSelectedDevice(null);

    showToast(`Invoice ${invoiceNo} generated! Stock deducted and sale registered.`);

    // Trigger Print Invoice
    onPrintInvoice(newInvoice, printFormat);
  };

  // =========================================================================
  // DATA FILTERING & STATS
  // =========================================================================
  // All Used Mobiles in inventory
  const usedInventory = useMemo(() => {
    return inventory.filter(item => item.category === 'Used Mobiles');
  }, [inventory]);

  const inStockMobiles = useMemo(() => {
    return usedInventory.filter(item => (item.stock || 0) > 0);
  }, [usedInventory]);

  const soldMobiles = useMemo(() => {
    return usedInventory.filter(item => (item.stock || 0) === 0);
  }, [usedInventory]);

  // Refurbished sales from invoices
  const refurbishedInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.isRefurbishedResale || 
      (inv.items && inv.items.some(it => it.category === 'Used Mobiles' || it.id?.includes('USED')))
    );
  }, [invoices]);

  // Filtered Stock Search
  const filteredStock = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return inStockMobiles;
    return inStockMobiles.filter(item => 
      item.name.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      (item.imeis && item.imeis.some(im => im.includes(q))) ||
      (item.barcode && item.barcode.includes(q))
    );
  }, [inStockMobiles, searchTerm]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return usedPurchases;
    return usedPurchases.filter(p => 
      p.sellerName.toLowerCase().includes(q) ||
      p.mobile.includes(q) ||
      p.imei1.includes(q) ||
      (p.imei2 && p.imei2.includes(q)) ||
      p.model.toLowerCase().includes(q) ||
      p.voucherNo.toLowerCase().includes(q)
    );
  }, [usedPurchases, searchTerm]);

  // Stats
  const totalStockBuyCost = inStockMobiles.reduce((sum, item) => sum + (Number(item.buyPrice) || 0), 0);
  const totalStockSellValue = inStockMobiles.reduce((sum, item) => sum + (Number(item.sellPrice) || 0), 0);
  const totalProjectedProfit = totalStockSellValue - totalStockBuyCost;
  const totalRefurbRevenue = refurbishedInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  const totalRefurbProfit = refurbishedInvoices.reduce((sum, inv) => sum + (Number(inv.totalProfit) || 0), 0);

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div className="animate-fade-in" style={{
          padding: '0.65rem 1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--status-green-bg)',
          border: '1px solid var(--status-green)',
          color: 'var(--status-green)',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header & Operational Mode Tabs */}
      <div style={{
        background: 'var(--surface-card)',
        padding: '0.85rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.85rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Smartphone size={20} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Used Mobiles & Refurbished Lifecycle
            </h2>
            <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)', fontWeight: 700 }}>
              {inStockMobiles.length} Ready in Stock
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Manage refurbished stock, generate instant resale invoices with warranty & accessory details, and verify inward seller KYC.
          </div>
        </div>

        {/* Action Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setActiveSubTab('stock'); setSearchTerm(''); }}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: activeSubTab === 'stock' ? 700 : 500,
              background: activeSubTab === 'stock' ? 'var(--accent-primary)' : 'var(--surface-primary)',
              color: activeSubTab === 'stock' ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'var(--transition-smooth)'
            }}
          >
            <Package size={14} />
            <span>Manage Stock ({inStockMobiles.length})</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('buy'); }}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: activeSubTab === 'buy' ? 700 : 500,
              background: activeSubTab === 'buy' ? 'var(--accent-primary)' : 'var(--surface-primary)',
              color: activeSubTab === 'buy' ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'var(--transition-smooth)'
            }}
          >
            <Plus size={14} />
            <span>Buy Used Phone (KYC)</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('resold'); setSearchTerm(''); }}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: activeSubTab === 'resold' ? 700 : 500,
              background: activeSubTab === 'resold' ? 'var(--accent-primary)' : 'var(--surface-primary)',
              color: activeSubTab === 'resold' ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'var(--transition-smooth)'
            }}
          >
            <Receipt size={14} />
            <span>Resold Bills ({refurbishedInvoices.length})</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('purchases'); setSearchTerm(''); }}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: activeSubTab === 'purchases' ? 700 : 500,
              background: activeSubTab === 'purchases' ? 'var(--accent-primary)' : 'var(--surface-primary)',
              color: activeSubTab === 'purchases' ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'var(--transition-smooth)'
            }}
          >
            <History size={14} />
            <span>Inward KYC Archive ({usedPurchases.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem'
      }}>
        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            In-Stock Handsets
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {inStockMobiles.length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Devices</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Capital tied: ₹{totalStockBuyCost.toLocaleString()}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Expected Resale Value
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
            ₹{totalStockSellValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-green)', fontWeight: 600, marginTop: '0.2rem' }}>
            Projected Margin: +₹{totalProjectedProfit.toLocaleString()}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Refurbished Sales Revenue
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            ₹{totalRefurbRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-green)', fontWeight: 600, marginTop: '0.2rem' }}>
            Realized Net Profit: +₹{totalRefurbProfit.toLocaleString()}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Inward KYC Verified
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {usedPurchases.length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Vouchers</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Police Undertakings Active
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: MANAGE STOCK & RESELL REFURBISHED MOBILES                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'stock' && (
        <div className="illoca-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Refurbished Mobiles Inventory & Direct Billing
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Click "Generate Bill" on any handset to edit price, add buyer information, attach warranty & accessories, and print instant receipt.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search model, brand, IMEI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2rem', fontSize: '0.82rem' }}
                />
              </div>

              <button
                onClick={() => setActiveSubTab('buy')}
                className="btn-primary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              >
                <Plus size={14} />
                <span>Buy Used Phone</span>
              </button>
            </div>
          </div>

          {filteredStock.length === 0 ? (
            <div style={{
              padding: '2.5rem',
              textAlign: 'center',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-primary)',
            }}>
              <Smartphone size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                No Refurbished Phones in Stock
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '400px', margin: '0.25rem auto' }}>
                All inwarded phones have been sold, or no devices match your search query.
              </div>
              <button
                onClick={() => setActiveSubTab('buy')}
                className="btn-primary"
                style={{ marginTop: '0.85rem', padding: '0.45rem 0.95rem', fontSize: '0.8rem' }}
              >
                + Inward New Used Phone (KYC)
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Device & Model</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Condition & Battery</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>IMEI / Serial</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Buy Cost</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Target Price</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Margin</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((phone) => {
                    const margin = (phone.sellPrice || 0) - (phone.buyPrice || 0);
                    const marginPct = phone.buyPrice ? Math.round((margin / phone.buyPrice) * 100) : 0;
                    const primaryImei = (phone.imeis && phone.imeis[0]) || phone.barcode || '—';

                    return (
                      <tr key={phone.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <div 
                              onClick={() => {
                                const photo = (phone.deviceImages && phone.deviceImages[0]) || phone.image;
                                if (photo) setPreviewModalImage(photo);
                              }}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--illoca-blue-subtle)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-primary)',
                                flexShrink: 0,
                                overflow: 'hidden',
                                border: '1px solid var(--border-color)',
                                cursor: (phone.deviceImages?.length > 0 || phone.image) ? 'pointer' : 'default'
                              }}
                              title={phone.deviceImages?.length > 0 ? "Click to view handset photos" : ""}
                            >
                              {(phone.deviceImages && phone.deviceImages[0]) || phone.image ? (
                                <img 
                                  src={(phone.deviceImages && phone.deviceImages[0]) || phone.image} 
                                  alt={phone.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                              ) : (
                                <Smartphone size={16} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span>{phone.name}</span>
                                {phone.deviceImages?.length > 1 && (
                                  <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--accent-primary)' }}>
                                    📷 {phone.deviceImages.length} photos
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                Brand: <strong style={{ color: 'var(--text-primary)' }}>{phone.brand}</strong> {phone.kycRef && `• KYC: ${phone.kycRef}`}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                            {phone.condition || 'Tested & Clean'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginTop: '0.1rem' }}>
                            {phone.warranty || '15 Days ALZINO Testing'}
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          <span className="mono-tag" style={{ background: 'var(--surface-primary)' }}>
                            {primaryImei}
                          </span>
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          ₹{(phone.buyPrice || 0).toLocaleString()}
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          ₹{(phone.sellPrice || 0).toLocaleString()}
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            color: margin >= 0 ? 'var(--status-green)' : 'var(--status-red)',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            {margin >= 0 ? `+₹${margin.toLocaleString()} (${marginPct}%)` : `-₹${Math.abs(margin)}`}
                          </span>
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '999px',
                            background: 'var(--status-green-bg)',
                            color: 'var(--status-green)',
                            border: '1px solid var(--status-green)',
                          }}>
                            ● Ready to Resell
                          </span>
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenResellModal(phone)}
                            className="btn-primary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.78rem',
                              whiteSpace: 'nowrap'
                            }}
                            title="Generate Refurbished Invoice with custom selling price & warranty"
                          >
                            <Receipt size={14} />
                            <span>Generate Bill</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: BUY USED PHONE & KYC VERIFICATION FORM                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'buy' && (
        <form onSubmit={handleInwardSubmit} className="illoca-card animate-fade-in" style={{ padding: '1.5rem', background: 'var(--surface-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={20} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Customer (Seller) Verification & Inward KYC</h3>
            </div>
            <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)', fontWeight: 700 }}>
              AUTO-INWARDS TO REFURBISHED STOCK
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Customer Details */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Seller Full Name *
              </label>
              <input
                type="text"
                placeholder="Customer Name as per ID"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Father / Guardian Name
              </label>
              <input
                type="text"
                placeholder="Father's Name"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Mobile Number *
              </label>
              <input
                type="text"
                placeholder="10-digit Phone"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                ID Proof Type & Aadhaar No. *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.45rem' }}>
                <select 
                  value={idType} 
                  onChange={(e) => setIdType(e.target.value)}
                  className="input-field"
                  style={{ width: '130px' }}
                >
                  <option value="Aadhaar Card">Aadhaar</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Driving License">DL</option>
                  <option value="PAN Card">PAN</option>
                </select>
                <input
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={aadhaarNo}
                  onChange={(e) => setAadhaarNo(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              {/* ID Proof / Aadhaar Photo Upload */}
              <div>
                <input
                  type="file"
                  id="aadhaar-upload-file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />

                {!idImage ? (
                  <label
                    htmlFor="aadhaar-upload-file"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px dashed var(--border-accent)',
                      background: 'var(--surface-primary)',
                      cursor: 'pointer',
                      fontSize: '0.74rem',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <Upload size={14} />
                    <span>Upload Aadhaar / ID Card Photo</span>
                  </label>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.35rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--status-green)',
                    background: 'var(--status-green-bg)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img 
                        src={idImage} 
                        alt="ID Preview" 
                        onClick={() => setPreviewModalImage(idImage)}
                        style={{ width: '36px', height: '24px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #FFF', cursor: 'pointer' }} 
                        title="Click to view full photo"
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--status-green)', fontWeight: 700 }}>
                        {idType} Attached
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setPreviewModalImage(idImage)}
                        style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        View
                      </button>
                      <label 
                        htmlFor="aadhaar-upload-file" 
                        style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Change
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setIdImage(null)}
                        style={{ fontSize: '0.7rem', color: 'var(--status-red)', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Full Residential Address (Bodhan / Mandal)
              </label>
              <input
                type="text"
                placeholder="House No, Street, Landmark, Bodhan, Telangana"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Device Details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <Smartphone size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Mobile Phone Specifications & Condition</h3>
            <span className="mono-tag">STEP 2 OF 2: DEVICE & PRICE</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Brand
              </label>
              <select 
                value={brand} 
                onChange={(e) => setBrand(e.target.value)}
                className="input-field"
                style={{ marginBottom: brand === 'Other' ? '0.4rem' : '0' }}
              >
                {availableBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
                {brand && !availableBrands.includes(brand) && brand !== 'Other' && (
                  <option key={brand} value={brand}>{brand}</option>
                )}
                <option value="Other">Other (Custom Brand)</option>
              </select>

              {brand === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter custom brand name..."
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      saveCustomBrand(e.target.value.trim(), 'Used Mobiles');
                    }
                  }}
                  required
                  className="input-field animate-fade-in"
                  style={{ borderColor: 'var(--accent-primary)', fontSize: '0.85rem' }}
                  autoFocus
                />
              )}
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Model & Storage *
              </label>
              <input
                type="text"
                placeholder="e.g. iPhone 13 (128GB)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Color
              </label>
              <input
                type="text"
                placeholder="e.g. Midnight Black"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Battery Health %
              </label>
              <input
                type="number"
                placeholder="e.g. 88%"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Primary IMEI 1 (15 digits) *
              </label>
              <input
                type="text"
                placeholder="Scan or Type IMEI 1"
                value={imei1}
                onChange={(e) => setImei1(e.target.value)}
                required
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Secondary IMEI 2 (Optional)
              </label>
              <input
                type="text"
                placeholder="IMEI 2"
                value={imei2}
                onChange={(e) => setImei2(e.target.value)}
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Condition Grade
              </label>
              <select 
                value={condition} 
                onChange={(e) => setCondition(e.target.value)}
                className="input-field"
              >
                <option value="Grade A+ (Like New, Zero scratches)">Grade A+ (Like New)</option>
                <option value="Grade A (Clean, minor edge scuffs)">Grade A (Clean)</option>
                <option value="Grade B (Normal wear, screen original)">Grade B (Normal wear)</option>
                <option value="Grade C (Display changed / minor dent)">Grade C (Fair)</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>
                  Buy Price Paid to Customer (₹) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const tempDevice = {
                      id: 'TEMP-BUY-EVAL',
                      name: model ? `${brand} ${model}` : 'Selected Smartphone',
                      brand: brand || 'Apple',
                      buyPrice: parseFloat(buyPrice) || 20000,
                      sellPrice: parseFloat(targetSellPrice) || 25000,
                      mrp: parseFloat(targetSellPrice) ? Math.round(parseFloat(targetSellPrice) * 1.15) : 30000,
                      ram: ram || '8GB',
                      storage: storage || '128GB',
                      color: color || 'Black'
                    };
                    setMarketCompareDevice(tempDevice);
                  }}
                  className="btn-secondary"
                  style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Check Live Online Price & Calculate Max Safe Buying Quote"
                >
                  <Globe size={12} />
                  <span>Check Safe Buy Rate</span>
                </button>
              </div>
              <input
                type="number"
                placeholder="e.g. 24000"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                required
                className="input-field"
                style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-primary)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Target Resale Price in Shop (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 28500"
                value={targetSellPrice}
                onChange={(e) => setTargetSellPrice(e.target.value)}
                className="input-field"
                style={{ fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Payment Mode Given to Seller
              </label>
              <select 
                value={paymentMode} 
                onChange={(e) => setPaymentMode(e.target.value)}
                className="input-field"
              >
                <option value="Cash">Cash</option>
                <option value="UPI Transfer">UPI Transfer</option>
                <option value="Bank Account Transfer">Bank Account Transfer</option>
              </select>
            </div>

            {/* Customer Original Bill Upload */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Customer's Original Purchase Bill / Tax Invoice (If available)
              </label>
              
              <input
                type="file"
                id="original-bill-upload-file"
                accept="image/*,.pdf"
                onChange={handleBillUpload}
                style={{ display: 'none' }}
              />

              {!billImage ? (
                <label
                  htmlFor="original-bill-upload-file"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-accent)',
                    background: 'var(--surface-primary)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: 'var(--accent-primary)',
                    fontWeight: 600,
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <Upload size={14} />
                  <span>Upload Original Purchase Bill (Optional)</span>
                </label>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--status-green)',
                  background: 'var(--status-green-bg)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img 
                      src={billImage} 
                      alt="Bill Preview" 
                      onClick={() => setPreviewModalImage(billImage)}
                      style={{ width: '36px', height: '26px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #FFF', cursor: 'pointer' }} 
                      title="Click to view original bill"
                    />
                    <span style={{ fontSize: '0.74rem', color: 'var(--status-green)', fontWeight: 700 }}>
                      Original Bill Attached
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewModalImage(billImage)}
                      style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      View
                    </button>
                    <label 
                      htmlFor="original-bill-upload-file" 
                      style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Change
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setBillImage(null)}
                      style={{ fontSize: '0.72rem', color: 'var(--status-red)', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Device Photos Upload */}
            <div style={{ gridColumn: 'span 2', background: 'var(--surface-secondary, rgba(0,0,0,0.02))', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)' }}>
                  <Camera size={15} color="var(--accent-primary)" />
                  <span>Mobile Handset Photos (Front, Back, Display Condition)</span>
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {deviceImages.length > 0 ? `${deviceImages.length} photo${deviceImages.length > 1 ? 's' : ''} attached` : 'Upload multiple photos'}
                </span>
              </div>

              <input
                type="file"
                id="device-photos-upload-file"
                accept="image/*"
                multiple
                onChange={handleDeviceImagesUpload}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label
                  htmlFor="device-photos-upload-file"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px dashed var(--accent-primary)',
                    background: 'var(--surface-primary)',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                  title="Choose multiple photos or take photos from camera"
                >
                  <Plus size={14} />
                  <span>Add Mobile Photos</span>
                </label>

                {deviceImages.map((imgSrc, idx) => {
                  const label = idx === 0 ? 'Front' : idx === 1 ? 'Back' : idx === 2 ? 'Display' : `Extra #${idx + 1}`;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        position: 'relative', 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden',
                        background: '#FFFFFF',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                      }}
                    >
                      <img
                        src={imgSrc}
                        alt={`Device photo ${idx + 1}`}
                        onClick={() => setPreviewModalImage(imgSrc)}
                        style={{ width: '56px', height: '48px', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                        title="Click to preview full-size device photo"
                      />
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 800, 
                        color: '#475569', 
                        background: '#F1F5F9', 
                        width: '100%', 
                        textAlign: 'center', 
                        padding: '1px 0', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em'
                      }}>
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDeviceImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          background: 'rgba(0,0,0,0.65)',
                          color: '#FFF',
                          fontSize: '11px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          border: 'none',
                          padding: 0
                        }}
                        title="Remove this photo"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setActiveSubTab('stock')}
              className="btn-outline"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              style={{ padding: '0.7rem 1.5rem' }}
            >
              <Printer size={18} />
              <span>Inward Device & Print Purchase Voucher</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: RESOLD REFURBISHED INVOICES ARCHIVE                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'resold' && (
        <div className="illoca-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Resold Refurbished Handset Invoices
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Official sales records, customer invoices, and realized profit margins on refurbished mobiles.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search buyer, invoice #, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2rem', fontSize: '0.82rem' }}
                />
              </div>
            </div>
          </div>

          {refurbishedInvoices.length === 0 ? (
            <div style={{
              padding: '2.5rem',
              textAlign: 'center',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-primary)',
            }}>
              <Receipt size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                No Refurbished Mobile Invoices Generated Yet
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Go to "Manage Stock" and click "Generate Bill" on any in-stock phone to create your first refurbished invoice!
              </div>
              <button
                onClick={() => setActiveSubTab('stock')}
                className="btn-primary"
                style={{ marginTop: '0.85rem', padding: '0.45rem 0.95rem', fontSize: '0.8rem' }}
              >
                Go to Refurbished Stock
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Invoice #</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Date</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Buyer Details</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Device Sold</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>IMEI / Serial</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Warranty & Accessories</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Bill Amount</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Profit Margin</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>Reprint</th>
                  </tr>
                </thead>
                <tbody>
                  {refurbishedInvoices.map((inv) => {
                    const item = inv.items && inv.items[0];
                    const imei = (item && item.imeis && item.imeis.join(', ')) || '—';

                    return (
                      <tr key={inv.invoiceNo} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                          <span className="mono-tag" style={{ background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)' }}>
                            {inv.invoiceNo}
                          </span>
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                          {inv.date}
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: 600 }}>{inv.customerName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            Ph: {inv.customerPhone}
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: 600 }}>{item ? item.name : 'Refurbished Device'}</div>
                          {item?.condition && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {item.condition}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {imei}
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                            {inv.warrantyNotes || item?.warranty || '15 Days Testing Warranty'}
                          </div>
                          {(inv.accessoriesNotes || item?.accessories) && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              Incl: {inv.accessoriesNotes || item?.accessories}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                          ₹{inv.grandTotal.toLocaleString()}
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--status-green)' }}>
                          +₹{(inv.totalProfit || 0).toLocaleString()}
                        </td>

                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => onPrintInvoice(inv, 'thermal')}
                              className="btn-outline"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}
                              title="Print 3-inch POS Thermal Receipt"
                            >
                              <Printer size={12} />
                              <span>Thermal</span>
                            </button>
                            <button
                              onClick={() => onPrintInvoice(inv, 'a4')}
                              className="btn-outline"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}
                              title="Print Full A4 Tax Invoice / Estimate"
                            >
                              <FileText size={12} />
                              <span>A4</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: INWARD PURCHASES & KYC VOUCHERS ARCHIVE                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'purchases' && (
        <div className="illoca-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <History size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Past Used Phone Purchases & KYC Archive</h3>
              <span className="mono-tag">{filteredPurchases.length} Records</span>
            </div>

            <div style={{ width: '300px' }}>
              <input
                type="text"
                placeholder="Search by Seller, Phone, or IMEI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Voucher #</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Date</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Seller & ID Info</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Phone Model</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>IMEI 1</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Buy Price</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Payment</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Purchase Voucher</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.voucherNo} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                      <span className="mono-tag">{purchase.voucherNo}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                      {purchase.date}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {purchase.idImage && (
                          <img
                            src={purchase.idImage}
                            alt="ID"
                            onClick={() => setPreviewModalImage(purchase.idImage)}
                            style={{ width: '32px', height: '22px', objectFit: 'cover', borderRadius: '2px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                            title="Click to view Aadhaar document"
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{purchase.sellerName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            Ph: {purchase.mobile} | {purchase.idType}: {purchase.aadhaarNo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{purchase.brand} {purchase.model}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {purchase.condition}
                      </div>
                      {(purchase.billImage || (purchase.deviceImages && purchase.deviceImages.length > 0)) && (
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem', alignItems: 'center' }}>
                          {purchase.billImage && (
                            <img
                              src={purchase.billImage}
                              alt="Bill"
                              onClick={() => setPreviewModalImage(purchase.billImage)}
                              style={{ width: '24px', height: '18px', objectFit: 'cover', borderRadius: '2px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                              title="Click to view Customer Original Bill"
                            />
                          )}
                          {purchase.deviceImages && purchase.deviceImages.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt={`Device ${i + 1}`}
                              onClick={() => setPreviewModalImage(img)}
                              style={{ width: '24px', height: '18px', objectFit: 'cover', borderRadius: '2px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                              title="Click to view Mobile Device Photo"
                            />
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                      {purchase.imei1}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      ₹{purchase.buyPrice.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className="mono-tag">{purchase.paymentMode}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <button
                        onClick={() => onPrintVoucher(purchase)}
                        className="btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}
                      >
                        <Printer size={14} color="var(--accent-primary)" />
                        <span>Print Voucher</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GENERATE BILL / RESELL REFURBISHED MOBILE                          */}
      {/* ========================================================================= */}
      {billModalOpen && selectedDevice && (
        <div 
          className="drawer-overlay" 
          onClick={() => setBillModalOpen(false)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}
        >
          <div 
            className="illoca-card animate-fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '100%', 
              maxWidth: '680px', 
              maxHeight: '92vh', 
              overflowY: 'auto',
              padding: '1.5rem', 
              background: 'var(--surface-primary)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-accent)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={20} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                    Resell Refurbished Mobile — Generate Bill
                  </h3>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Add final selling price, warranty terms, accessories, and customer details to generate an official store invoice.
                </div>
              </div>
              <button 
                onClick={() => setBillModalOpen(false)}
                style={{ fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)', border: 'none', background: 'transparent' }}
              >
                ✕
              </button>
            </div>

            {/* Handset Summary Pill */}
            <div style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {selectedDevice.name}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  IMEI: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{(selectedDevice.imeis && selectedDevice.imeis.join(', ')) || selectedDevice.barcode}</span> • {selectedDevice.condition}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inward Buy Cost</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  ₹{(selectedDevice.buyPrice || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Price & Realized Margin Config */}
            <div style={{
              background: 'var(--illoca-blue-subtle)',
              border: '1px solid var(--accent-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  Final Selling Price on Invoice (₹) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-primary)' }}>₹</span>
                  <input
                    type="number"
                    value={resellPrice}
                    onChange={(e) => setResellPrice(e.target.value)}
                    required
                    className="input-field"
                    style={{
                      paddingLeft: '1.75rem',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      background: 'var(--surface-primary)',
                      borderColor: 'var(--accent-primary)'
                    }}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Net Payable / Store Margin</div>
                {(() => {
                  const currentSell = parseFloat(resellPrice) || 0;
                  const disc = Math.max(0, Number(resellDiscount) || 0);
                  const netPayable = Math.max(0, Math.round(currentSell - disc));
                  const currentBuy = Number(selectedDevice.buyPrice) || 0;
                  const profit = netPayable - currentBuy;
                  const marginPct = currentBuy ? Math.round((profit / currentBuy) * 100) : 0;

                  return (
                    <div>
                      {disc > 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textDecoration: 'line-through' }}>
                          ₹{currentSell.toLocaleString()}
                        </div>
                      )}
                      <div style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent-primary)',
                        marginTop: '0.1rem'
                      }}>
                        ₹{netPayable.toLocaleString()}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: profit >= 0 ? 'var(--status-green)' : 'var(--status-red)',
                        marginTop: '0.1rem'
                      }}>
                        {profit >= 0 ? `Profit: +₹${profit.toLocaleString()} (${marginPct}%)` : `Loss: -₹${Math.abs(profit).toLocaleString()}`}
                      </div>
                    </div>
                  );
                })()}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Reflected in ALZINO Analytics Profit
                </div>
              </div>
            </div>

            {/* Buyer Details */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
                Buyer / Customer Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Buyer Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Buyer Mobile Number *
                  </label>
                  <input
                    type="text"
                    placeholder="10-digit Phone"
                    value={buyerPhone}
                    onChange={(e) => handleBuyerPhoneChange(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Customer Address
                  </label>
                  <input
                    type="text"
                    placeholder="Bodhan, Telangana"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Customer GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 36AAAAA0000A1Z5"
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Warranty & Invoice Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Refurbished Warranty Printed on Bill
                </label>
                <select
                  value={refurbWarranty}
                  onChange={(e) => setRefurbWarranty(e.target.value)}
                  className="input-field"
                  style={{ marginBottom: '0.35rem' }}
                >
                  {warrantyOptions.map((w, idx) => (
                    <option key={idx} value={w}>{w}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or customize warranty text..."
                  value={refurbWarranty}
                  onChange={(e) => setRefurbWarranty(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Invoice Format Type
                </label>
                <select
                  value={resellBillingType}
                  onChange={(e) => setResellBillingType(e.target.value)}
                  className="input-field"
                >
                  <option value="non-gst">Second-Hand Cash Memo (Margin Scheme)</option>
                  <option value="gst">GST Tax Invoice (18% with HSN 851712)</option>
                </select>

                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginTop: '0.45rem', marginBottom: '0.25rem' }}>
                  Payment Mode
                </label>
                <select
                  value={resellPaymentMode}
                  onChange={(e) => setResellPaymentMode(e.target.value)}
                  className="input-field"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI / PhonePe / GPay">UPI / PhonePe / GPay</option>
                  <option value="Debit / Credit Card">Debit / Credit Card</option>
                  <option value="Khata">Khata (Add to Credit Ledger)</option>
                </select>

                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginTop: '0.45rem', marginBottom: '0.25rem' }}>
                  Discount on Cart (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--status-green)', fontWeight: 700, fontSize: '0.9rem' }}>−</span>
                  <input
                    type="number"
                    min="0"
                    value={resellDiscount}
                    onChange={(e) => setResellDiscount(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '1.5rem', color: resellDiscount > 0 ? 'var(--status-green)' : undefined, fontWeight: 600 }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Included Accessories Checkboxes */}
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Included Accessories with Handset (Printed on Invoice)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                {accessoryOptions.map((acc, idx) => {
                  const isChecked = selectedAccessories.includes(acc);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleAccessory(acc)}
                      style={{
                        padding: '0.35rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        border: isChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: isChecked ? 'var(--illoca-blue-subtle)' : 'var(--surface-card)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.74rem',
                        color: isChecked ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: isChecked ? 600 : 400,
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      {isChecked ? <CheckSquare size={14} color="var(--accent-primary)" /> : <Square size={14} color="var(--text-muted)" />}
                      <span>{acc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Remarks */}
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Additional Notes / Handset Condition Remarks (Printed on Invoice)
              </label>
              <textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={2}
                className="input-field"
                style={{ fontSize: '0.78rem', resize: 'vertical' }}
              />
            </div>

            {/* Commit Resale Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              <button 
                type="button" 
                onClick={() => setBillModalOpen(false)}
                className="btn-outline"
                style={{ padding: '0.55rem 1rem' }}
              >
                Cancel
              </button>

              <button 
                type="button" 
                onClick={() => handleGenerateResellInvoice('thermal')}
                className="btn-primary"
                style={{ padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Printer size={15} />
                <span>Print Thermal Receipt</span>
              </button>

              <button 
                type="button" 
                onClick={() => handleGenerateResellInvoice('a4')}
                className="btn-primary"
                style={{ padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#10B981', borderColor: '#10B981' }}
              >
                <FileText size={15} />
                <span>Print A4 Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Photo Preview Modal */}
      {previewModalImage && (
        <div 
          className="drawer-overlay" 
          onClick={() => setPreviewModalImage(null)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}
        >
          <div 
            className="illoca-card animate-fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', padding: '1rem', background: 'var(--surface-primary)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Attached Document / Photo Preview</span>
              <button 
                onClick={() => setPreviewModalImage(null)}
                style={{ fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)', border: 'none', background: 'transparent' }}
              >
                ✕
              </button>
            </div>
            <img 
              src={previewModalImage} 
              alt="Preview" 
              style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            />
          </div>
        </div>
      )}

      {/* 1-CLICK MARKET PRICE COMPARE & SAFE USED BUYING EVALUATION MODAL */}
      <MarketPriceCompareModal
        isOpen={Boolean(marketCompareDevice)}
        onClose={() => setMarketCompareDevice(null)}
        product={marketCompareDevice}
        shopConfig={shopConfig}
      />
    </div>
  );
}
