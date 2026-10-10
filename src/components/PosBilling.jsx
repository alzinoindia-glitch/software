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
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getUpiQrUrl } from '../utils/barcode';

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
  const [paymentMode, setPaymentMode] = useState('UPI'); // Cash | UPI | Card | Khata | Split
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [isInterstate, setIsInterstate] = useState(false);
  
  // Checkout modal / complete state
  const [showPaymentVerifyModal, setShowPaymentVerifyModal] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [upiTxnRef, setUpiTxnRef] = useState('');
  const [cardAuthCode, setCardAuthCode] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState(0);
  const [splitUpiAmount, setSplitUpiAmount] = useState(0);
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
  
  const searchInputRef = useRef(null);

  // Tax Filter: 'all' | 'gst' | 'non-gst'
  const [posTaxFilter, setPosTaxFilter] = useState('all');

  // Categories
  const categories = ['All', 'New Mobiles', 'Used Mobiles', 'Mobile Accessories', 'Home Appliances'];

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
        item.category || '',
        item.description || '',
        item.barcode || '',
        ...(item.imeis || [])
      ].join(' ').toLowerCase();

      return matchesCategory && matchesTax && words.every(word => haystack.includes(word));
    });
  }, [inventory, selectedCategory, posTaxFilter, searchTerm]);

  // Handle Barcode scanner auto-enter
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const q = searchTerm.trim().toLowerCase();
      const exactMatch = inventory.find(item => 
        (item.barcode && item.barcode.toLowerCase() === q) ||
        (item.imeis && item.imeis.some(imei => imei.toLowerCase() === q))
      );
      if (exactMatch && exactMatch.stock > 0) {
        const matchedImei = exactMatch.imeis ? exactMatch.imeis.find(i => i.toLowerCase() === q) : null;
        addToCart(exactMatch, matchedImei);
        setSearchTerm('');
      }
    }
  };

  // Add product to cart
  const addToCart = (product, specificImei = null) => {
    if (product.stock <= 0) {
      alert(`"${product.name}" is currently out of stock!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const hasImeis = product.imeis && product.imeis.length > 0;
      
      if (existing) {
        if (existing.qty >= product.stock) {
          alert(`Cannot add more than available stock (${product.stock} pcs).`);
          return prev;
        }
        
        let assignedImei = specificImei;
        if (hasImeis && !assignedImei) {
          assignedImei = product.imeis.find(im => !existing.selectedImeis.includes(im)) || '';
        }

        return prev.map(item => {
          if (item.id === product.id) {
            return {
              ...item,
              qty: item.qty + 1,
              selectedImeis: assignedImei ? [...item.selectedImeis, assignedImei] : item.selectedImeis
            };
          }
          return item;
        });
      } else {
        const initialImei = specificImei || (hasImeis ? product.imeis[0] : '');
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
            qty: 1,
            availableStock: product.stock,
            allImeis: product.imeis || [],
            selectedImeis: initialImei ? [initialImei] : [],
            warranty: product.warranty || '1 Year Official Warranty',
          }
        ];
      }
    });
  };

  // Auto-add product when sent from Stock & Price Lookup
  useEffect(() => {
    if (quickBillProduct) {
      addToCart(quickBillProduct);
      if (clearQuickBillProduct) {
        clearQuickBillProduct();
      }
    }
  }, [quickBillProduct]);

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
        
        let updatedImeis = [...item.selectedImeis];
        if (delta > 0 && item.allImeis.length > 0) {
          const nextAvailable = item.allImeis.find(im => !updatedImeis.includes(im));
          if (nextAvailable) updatedImeis.push(nextAvailable);
        } else if (delta < 0) {
          updatedImeis.pop();
        }

        return { ...item, qty: newQty, selectedImeis: updatedImeis };
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
  const subtotalInclusive = cart.reduce((sum, item) => sum + (item.rate * item.qty), 0);
  
  const totalTaxable = isNonGst 
    ? subtotalInclusive 
    : cart.reduce((sum, item) => {
        const itemTotal = item.rate * item.qty;
        const rateToUse = item.gstRate || 18;
        const base = itemTotal / (1 + (rateToUse / 100));
        return sum + base;
      }, 0);

  const totalGst = isNonGst ? 0 : (subtotalInclusive - totalTaxable);
  const grandTotal = Math.max(0, Math.round(subtotalInclusive - Number(discount)));
  
  // Total line profit (for admin mode)
  const totalProfit = cart.reduce((sum, item) => {
    const itemProfit = (item.rate - item.buyPrice) * item.qty;
    return sum + itemProfit;
  }, 0) - Number(discount);

  // Sync paidAmount default
  useEffect(() => {
    setPaidAmount(grandTotal);
  }, [grandTotal]);

  // Step 1: Open Payment Verification Modal (NO invoice or stock deduction yet)
  const handleInitiatePayment = () => {
    if (cart.length === 0) {
      alert("Cart is empty! Add items to cart first.");
      return;
    }
    setCashTendered(grandTotal);
    setUpiTxnRef('');
    setCardAuthCode('');
    setSplitCashAmount(Math.round(grandTotal / 2));
    setSplitUpiAmount(grandTotal - Math.round(grandTotal / 2));
    setShowPaymentVerifyModal(true);
  };

  // Step 2: Finalize Sale ONLY AFTER Payment is Confirmed
  const handleConfirmAndGenerateInvoice = (verifiedPaymentRef = '') => {
    const prefix = isNonGst ? 'ALZ-EST' : 'ALZ-INV';
    const invoiceNo = `${prefix}-${String(invoices.length + 83).padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    // Compute GST breakdowns
    const cgstTotal = isNonGst ? 0 : (isInterstate ? 0 : totalGst / 2);
    const sgstTotal = isNonGst ? 0 : (isInterstate ? 0 : totalGst / 2);
    const igstTotal = isNonGst ? 0 : (isInterstate ? totalGst : 0);

    const actualPaid = paymentMode === 'Khata' ? 0 : Number(paidAmount);
    const khataDue = Math.max(0, grandTotal - actualPaid);

    const newInvoice = {
      invoiceNo,
      date: today,
      isNonGst,
      invoiceType: isNonGst ? 'Non-GST Cash Memo / Estimate' : 'GST Tax Invoice',
      customerName: customerName.trim() || 'Counter Customer',
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim() || 'Bodhan, Telangana',
      customerGstin: isNonGst ? '' : customerGstin.trim(),
      paymentMode,
      paymentStatus: paymentMode === 'Khata' ? 'KHATA_DUE' : 'PAID',
      paymentConfirmedAt: new Date().toISOString(),
      paymentRef: verifiedPaymentRef || upiTxnRef || cardAuthCode || (paymentMode === 'Cash' ? 'CASH_VERIFIED' : 'CONFIRMED'),
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
        taxable: isNonGst ? (item.rate * item.qty) : (item.rate * item.qty) / (1 + (item.gstRate / 100)),
        total: item.rate * item.qty,
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
        const remainingImeis = (invItem.imeis || []).filter(
          im => !cartItem.selectedImeis.includes(im)
        );
        return {
          ...invItem,
          stock: Math.max(0, invItem.stock - cartItem.qty),
          imeis: remainingImeis,
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

    // Close payment modal and open final print modal
    setShowPaymentVerifyModal(false);
    setShowCheckoutModal(true);

    try {
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}

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
    const grand = Math.max(0, Math.round(subtotal - disc));
    
    const taxable = isNonGstInv ? subtotal : invoiceToEdit.items.reduce((sum, item) => {
      const itTot = Number(item.rate) * Number(item.qty);
      const rate = item.gstRate || 18;
      return sum + (itTot / (1 + (rate / 100)));
    }, 0);

    const gst = isNonGstInv ? 0 : (subtotal - taxable);
    const cgst = isNonGstInv ? 0 : gst / 2;
    const sgst = isNonGstInv ? 0 : gst / 2;

    const paid = invoiceToEdit.paymentMode === 'Khata' ? 0 : grand;
    const khata = invoiceToEdit.paymentMode === 'Khata' ? grand : 0;

    const updatedInvoice = {
      ...invoiceToEdit,
      items: invoiceToEdit.items.map(it => ({
        ...it,
        total: Number(it.rate) * Number(it.qty),
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
        background: 'var(--surface-card)',
        padding: '0.65rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--illoca-blue-subtle)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShoppingCart size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
              POS Billing & Invoicing Counter
            </h2>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Create official GST tax invoices or cash memos, customize product lines, customer details & warranties, or edit past bills.
            </div>
          </div>
        </div>

        {/* View Switcher: POS Register vs Past Invoices */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button
            onClick={() => setActivePosTab('register')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: activePosTab === 'register' ? 700 : 500,
              background: activePosTab === 'register' ? 'var(--accent-primary)' : 'var(--surface-primary)',
              color: activePosTab === 'register' ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'var(--transition-smooth)'
            }}
          >
            <ShoppingCart size={14} />
            <span>Active Billing Counter ({cart.length})</span>
          </button>

          {role === 'admin' && (
            <button
              onClick={() => setActivePosTab('invoices')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: activePosTab === 'invoices' ? 700 : 500,
                background: activePosTab === 'invoices' ? 'var(--accent-primary)' : 'var(--surface-primary)',
                color: activePosTab === 'invoices' ? '#FFFFFF' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'var(--transition-smooth)'
              }}
            >
              <History size={14} />
              <span>Manage & Edit Invoices ({invoices.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ACTIVE BILLING REGISTER COUNTER                                        */}
      {/* ========================================================================= */}
      {activePosTab === 'register' && (
        <div className="pos-register-grid">
          
          {/* Left: Product Catalog & Fast Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            
            {/* Search & Mode Bar */}
            <div className="illoca-card" style={{ padding: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
                  <Search 
                    size={16} 
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search model, brand, IMEI (e.g. 'iphone', 'cable')..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="input-field"
                    style={{ minWidth: 0, width: '100%', boxSizing: 'border-box', paddingLeft: '2.2rem', paddingRight: searchTerm ? '2rem' : '0.75rem', height: '36px', fontSize: '0.84rem' }}
                    autoFocus
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      style={{ 
                        position: 'absolute', 
                        right: '10px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        color: 'var(--text-muted)', 
                        fontSize: '0.75rem',
                        cursor: 'pointer' 
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Billing Mode Segmented Pill */}
                <div className="segmented-bar" style={{ height: '36px', padding: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setBillingType('gst')}
                    className={`segmented-item ${billingType === 'gst' ? 'active-blue' : ''}`}
                    style={{ height: '30px', padding: '0 0.75rem' }}
                    title="Official GST Tax Invoice (18% / 12% with HSN breakdown)"
                  >
                    GST Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingType('non-gst')}
                    className={`segmented-item ${billingType === 'non-gst' ? 'active-blue' : ''}`}
                    style={{ height: '30px', padding: '0 0.75rem' }}
                    title="Cash Memo / Non-GST Estimate (0% tax)"
                  >
                    Non-GST Memo
                  </button>
                </div>
              </div>

              {/* Minimalist Categories & Tax Filter Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.55rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
                  {categories.map(cat => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          padding: '0.22rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-heading)',
                          border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          background: isActive ? 'var(--illoca-blue-subtle)' : 'var(--surface-primary)',
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: isActive ? 700 : 500,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setShowAddCustomModal(true)}
                    className="btn-outline"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                    title="Add an unlisted or custom service/product directly to bill"
                  >
                    <Plus size={12} />
                    <span>+ Custom Item</span>
                  </button>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {filteredProducts.length} items
                  </span>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="pos-product-catalog-grid" style={{
              maxHeight: 'calc(100vh - 250px)',
              overflowY: 'auto',
              paddingRight: '0.25rem'
            }}>
              {filteredProducts.map(prod => {
                const isOut = prod.stock <= 0;
                const isLowStock = prod.stock > 0 && prod.stock <= (prod.lowStockThreshold || 2);
                const isItemGst = (prod.gstRate && prod.gstRate > 0) || prod.isGst;

                return (
                  <div 
                    key={prod.id} 
                    className="illoca-card" 
                    onClick={() => !isOut && addToCart(prod)}
                    style={{ 
                      padding: '0.75rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      opacity: isOut ? 0.45 : 1,
                      cursor: isOut ? 'not-allowed' : 'pointer',
                      border: isLowStock ? '1px solid var(--status-amber)' : undefined,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span className="mono-tag" style={{ fontSize: '0.62rem' }}>
                          {prod.brand}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span className="mono-tag" style={{ fontSize: '0.6rem', background: 'var(--illoca-blue-subtle)', color: 'var(--accent-primary)', fontWeight: 700 }} title="Warehouse Storage Coordinates">
                            📍 {prod.rack || 'R-01'}/{prod.bin || 'B-01'}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            color: isOut ? 'var(--status-red)' : isLowStock ? 'var(--status-amber)' : 'var(--status-green)',
                          }}>
                            {isOut ? 'Out' : `${prod.stock} in stock`}
                          </span>
                        </div>
                      </div>

                      <h4 style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.2rem', lineHeight: 1.25 }}>
                        {prod.name}
                      </h4>

                      {prod.warranty && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                          🛡️ {prod.warranty}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)', marginTop: '0.35rem' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                        ₹{prod.sellPrice.toLocaleString()}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(prod);
                        }}
                        disabled={isOut}
                        className="btn-secondary"
                        style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Active Sale Cart & Customer Invoice Details */}
          <div className="illoca-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            
            {/* Cart Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingBottom: '0.65rem',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '0.75rem' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={17} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Current Invoice Cart</h3>
                <span className="mono-tag">{cart.length} Items</span>
              </div>

              {cart.length > 0 && (
                <button 
                  onClick={() => setCart([])} 
                  style={{ fontSize: '0.74rem', color: 'var(--status-red)', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', border: 'none', background: 'transparent' }}
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Customer Details Box with Autocomplete */}
            <div style={{ 
              background: 'var(--surface-primary)', 
              padding: '0.65rem 0.75rem', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border-color)',
              marginBottom: '0.75rem' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <User size={13} color="var(--accent-primary)" />
                  <span>Customer & WhatsApp Info</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMoreCustomerFields(!showMoreCustomerFields)}
                  style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', cursor: 'pointer', background: 'transparent', border: 'none', textDecoration: 'underline' }}
                >
                  {showMoreCustomerFields ? 'Hide Address/GST' : '+ Address & GSTIN'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.45rem' }}>
                <div>
                  <input
                    type="text"
                    placeholder="Customer Name (e.g. Ramesh)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Mobile No (10-digit)"
                    value={customerPhone}
                    onChange={(e) => handleCustomerPhoneInput(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              {/* Match hint from CRM */}
              {customerMatchHint && (
                <div 
                  onClick={() => handleSelectCustomer(customerMatchHint)}
                  style={{
                    marginTop: '0.35rem',
                    padding: '0.3rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--illoca-blue-subtle)',
                    border: '1px solid var(--accent-primary)',
                    fontSize: '0.72rem',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  title="Click to auto-apply customer profile"
                >
                  <span>Known Customer: <strong>{customerMatchHint.name}</strong></span>
                  <span>Spent: ₹{customerMatchHint.totalSpent?.toLocaleString()} (Click to use)</span>
                </div>
              )}

              {/* Extended Customer Address & GSTIN */}
              {showMoreCustomerFields && (
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginTop: '0.45rem' }}>
                  <input
                    type="text"
                    placeholder="Address (Bodhan, Telangana)"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.76rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Customer GSTIN (Optional)"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.76rem' }}
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div style={{ 
              flex: 1, 
              maxHeight: '300px', 
              overflowY: 'auto', 
              marginBottom: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem'
            }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={28} style={{ margin: '0 auto 0.4rem', opacity: 0.35 }} />
                  <p style={{ fontSize: '0.82rem' }}>Cart is empty. Scan barcode, tap products, or click "+ Custom Item".</p>
                </div>
              ) : (
                cart.map(item => (
                  <div 
                    key={item.id} 
                    style={{ 
                      padding: '0.55rem 0.7rem', 
                      borderRadius: 'var(--radius-sm)', 
                      background: 'var(--surface-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {/* Item Title and Delete */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <div style={{ flex: 1, marginRight: '0.5rem' }}>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItemName(item.id, e.target.value)}
                          className="input-field"
                          style={{
                            padding: '0.15rem 0.35rem',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            background: 'transparent',
                            border: '1px solid transparent',
                            width: '100%'
                          }}
                          onFocus={(e) => e.target.style.border = '1px solid var(--accent-primary)'}
                          onBlur={(e) => e.target.style.border = '1px solid transparent'}
                          title="Click to edit item name on invoice"
                        />
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', border: 'none', background: 'transparent' }}
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Warranty on invoice */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Warranty:</span>
                      <input
                        type="text"
                        placeholder="e.g. 1 Year Brand Warranty"
                        value={item.warranty || ''}
                        onChange={(e) => updateItemWarranty(item.id, e.target.value)}
                        className="input-field"
                        style={{ padding: '0.1rem 0.35rem', fontSize: '0.72rem', color: 'var(--accent-primary)' }}
                        title="Warranty text shown on printed bill"
                      />
                    </div>

                    {/* IMEI Selector & Custom IMEI input */}
                    {(item.allImeis.length > 0 || item.selectedImeis.length > 0) && (
                      <div style={{ marginBottom: '0.35rem', padding: '0.25rem 0.4rem', background: 'var(--badge-bg)', borderRadius: '3px' }}>
                        {item.selectedImeis.map((selectedImei, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                            <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--badge-text)' }}>IMEI #{idx + 1}:</span>
                            {item.allImeis.length > 0 ? (
                              <select
                                value={selectedImei}
                                onChange={(e) => updateItemImei(item.id, idx, e.target.value)}
                                className="input-field"
                                style={{ padding: '0.15rem 0.35rem', fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}
                              >
                                <option value="">-- Choose IMEI --</option>
                                {item.allImeis.map(im => (
                                  <option key={im} value={im}>{im}</option>
                                ))}
                              </select>
                            ) : null}
                            <input
                              type="text"
                              placeholder="Or type custom IMEI..."
                              value={selectedImei}
                              onChange={(e) => updateItemImei(item.id, idx, e.target.value)}
                              className="input-field"
                              style={{ padding: '0.15rem 0.35rem', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', flex: 1 }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Qty, Price and Line Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button 
                          onClick={() => updateQty(item.id, -1)}
                          className="btn-secondary"
                          style={{ padding: '0.15rem 0.35rem' }}
                        >
                          <Minus size={11} />
                        </button>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, minWidth: '20px', textAlign: 'center', fontSize: '0.82rem' }}>
                          {item.qty}
                        </span>
                        <button 
                          onClick={() => updateQty(item.id, 1)}
                          className="btn-secondary"
                          style={{ padding: '0.15rem 0.35rem' }}
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@ ₹</span>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItemRate(item.id, e.target.value)}
                          className="input-field"
                          style={{ width: '85px', padding: '0.2rem 0.35rem', fontSize: '0.84rem', fontWeight: 700 }}
                          title="Click to edit selling price"
                        />
                      </div>

                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem' }}>
                        ₹{(item.rate * item.qty).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Invoice Notes / Remarks Expander */}
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowNotesField(!showNotesField)}
                  style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', cursor: 'pointer', background: 'transparent', border: 'none', textDecoration: 'underline' }}
                >
                  {showNotesField ? 'Hide Invoice Notes' : '+ Add Invoice Remarks / Terms'}
                </button>
              </div>
              {showNotesField && (
                <textarea
                  placeholder="Special remarks or terms printed on invoice (e.g. 6-month warranty on original battery)..."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  rows={2}
                  className="input-field animate-fade-in"
                  style={{ marginTop: '0.35rem', fontSize: '0.78rem', resize: 'vertical' }}
                />
              )}
            </div>

            {/* Calculations & Taxes */}
            <div style={{ 
              borderTop: '1px solid var(--border-color)', 
              paddingTop: '0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
              fontSize: '0.82rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span className="font-mono">₹{subtotalInclusive.toFixed(2)}</span>
              </div>

              {!isNonGst ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>
                    GST (18%):
                    <button 
                      onClick={() => setIsInterstate(!isInterstate)}
                      style={{ marginLeft: '0.3rem', fontSize: '0.68rem', color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {isInterstate ? '[IGST]' : '[CGST+SGST]'}
                    </button>
                  </span>
                  <span className="font-mono">₹{totalGst.toFixed(2)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Tax Mode:</span>
                  <span className="font-mono">0% (Non-GST Memo)</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Discount (₹):</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="input-field"
                  style={{ width: '70px', padding: '0.18rem 0.35rem', fontSize: '0.8rem', textAlign: 'right' }}
                />
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'baseline', 
                marginTop: '0.3rem', 
                paddingTop: '0.45rem',
                borderTop: '1px dashed var(--border-color)'
              }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.05rem' }}>
                    Total:
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                    {isNonGst ? 'Non-GST' : 'Incl. GST'}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.35rem', color: 'var(--accent-primary)' }}>
                  ₹{grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div style={{ marginTop: '0.65rem' }}>
              <div className="segmented-bar" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                  { id: 'UPI', label: 'UPI / QR' },
                  { id: 'Cash', label: 'Cash' },
                  { id: 'Card', label: 'Card' },
                  { id: 'Khata', label: 'Khata' },
                ].map(pm => {
                  const isSelected = paymentMode === pm.id;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMode(pm.id)}
                      className={`segmented-item ${isSelected ? 'active-blue' : ''}`}
                      style={{ textAlign: 'center', padding: '0.35rem 0.2rem' }}
                    >
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proceed to Payment Verification Button */}
            <button
              onClick={handleInitiatePayment}
              disabled={cart.length === 0}
              className="btn-primary"
              style={{
                marginTop: '0.75rem',
                width: '100%',
                justifyContent: 'center',
                padding: '0.75rem',
                fontSize: '0.95rem',
                opacity: cart.length === 0 ? 0.5 : 1
              }}
            >
              <CheckCircle2 size={16} />
              <span>Proceed to Payment · ₹{grandTotal.toLocaleString()}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PAST INVOICES ARCHIVE & EDITING                                       */}
      {/* ========================================================================= */}
      {activePosTab === 'invoices' && (
        <div className="illoca-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Store Invoices Archive & Bill Editing
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Click "Edit Data" on any invoice to update customer name, mobile, address, line items, rates, or warranty terms.
              </div>
            </div>

            <div style={{ width: '320px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search invoice #, customer, phone, item..."
                value={invoiceSearchTerm}
                onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2rem', fontSize: '0.82rem' }}
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
              <label className="input-label" style={{ marginBottom: '0.4rem', fontWeight: 700 }}>
                Select Received Payment Method:
              </label>
              <div className="segmented-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                  { id: 'UPI', label: '📱 UPI / QR' },
                  { id: 'Cash', label: '💵 Cash' },
                  { id: 'Card', label: '💳 Card' },
                  { id: 'Khata', label: '📒 Khata' },
                ].map(pm => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMode(pm.id)}
                    className={`segmented-item ${paymentMode === pm.id ? 'active-blue' : ''}`}
                    style={{ textAlign: 'center', padding: '0.5rem 0.25rem', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. UPI QR PAYMENT PANEL */}
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
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                  Ask Customer to Scan Dynamic UPI QR Code
                </div>
                
                <div style={{
                  background: '#FFFFFF',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-block',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  marginBottom: '0.75rem'
                }}>
                  <img
                    src={getUpiQrUrl(shopConfig.upiId, shopConfig.name, grandTotal, 'BILL')}
                    alt="Scan UPI QR Code"
                    style={{ width: '190px', height: '190px', display: 'block', margin: '0 auto' }}
                  />
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0A0D14', marginTop: '0.35rem' }}>
                    Pay: ₹{grandTotal.toLocaleString()}
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  UPI ID: <strong style={{ color: 'var(--text-primary)' }}>{shopConfig.upiId}</strong> ({shopConfig.name})
                </div>

                <div style={{ textAlign: 'left', marginBottom: '0.85rem' }}>
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>
                    UPI Reference / UTR Number (Optional):
                  </label>
                  <input
                    type="text"
                    value={upiTxnRef}
                    onChange={(e) => setUpiTxnRef(e.target.value)}
                    placeholder="e.g. 428190284910"
                    className="input-field"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                  />
                </div>

                <button
                  onClick={() => handleConfirmAndGenerateInvoice(upiTxnRef ? `UPI:${upiTxnRef}` : 'UPI:QR_CONFIRMED')}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Confirm UPI Payment Received (₹{grandTotal.toLocaleString()})</span>
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
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>💵 Cash Payment Details</span>
                  <span className="mono-tag" style={{ background: 'var(--status-green-bg)', color: 'var(--status-green)' }}>
                    Tender & Change
                  </span>
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <label className="input-label">Cash Received from Customer (₹):</label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder="Enter cash given by customer"
                    className="input-field"
                    style={{ fontSize: '1.15rem', fontWeight: 800, padding: '0.5rem 0.75rem' }}
                  />
                </div>

                {/* Quick Cash Chips */}
                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                  {[
                    { label: `Exact (₹${grandTotal})`, val: grandTotal },
                    { label: '₹500', val: 500 },
                    { label: '₹1,000', val: 1000 },
                    { label: '₹2,000', val: 2000 },
                    { label: '₹5,000', val: 5000 },
                  ].filter(c => c.val >= grandTotal || c.val === grandTotal).map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashTendered(chip.val)}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      {chip.label}
                    </button>
                  ))}
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
                    color: Number(cashTendered) >= grandTotal ? 'var(--status-green)' : 'var(--status-amber)'
                  }}>
                    ₹{Math.max(0, (Number(cashTendered) || grandTotal) - grandTotal).toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => handleConfirmAndGenerateInvoice('CASH:TENDER_VERIFIED')}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Confirm Cash Received (₹{grandTotal.toLocaleString()})</span>
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. CARD PAYMENT PANEL */}
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
                  Swipe / Tap credit or debit card for ₹{grandTotal.toLocaleString()} on your physical EDC terminal.
                </p>

                <div style={{ marginBottom: '0.85rem' }}>
                  <label className="input-label">Terminal Auth / Approval Code (Optional):</label>
                  <input
                    type="text"
                    value={cardAuthCode}
                    onChange={(e) => setCardAuthCode(e.target.value)}
                    placeholder="e.g. AUTH-88219"
                    className="input-field"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <button
                  onClick={() => handleConfirmAndGenerateInvoice(cardAuthCode ? `CARD:${cardAuthCode}` : 'CARD:SWIPE_VERIFIED')}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Confirm Card Swipe Approved (₹{grandTotal.toLocaleString()})</span>
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. KHATA CREDIT SALE PANEL */}
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
                  onClick={() => handleConfirmAndGenerateInvoice('KHATA:CREDIT_AUTHORIZED')}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem', background: 'var(--status-amber)', borderColor: 'var(--status-amber)', color: '#000' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Confirm Khata Credit Sale (₹{grandTotal.toLocaleString()})</span>
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
                <strong>Payment Confirmation Safeguard Active:</strong> Final invoice barcode, sequential invoice number, and stock deduction will only trigger upon confirming payment above.
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Paid:</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.05rem' }}>
                  ₹{completedInvoice.paidAmount.toLocaleString()}
                </span>
              </div>
              {completedInvoice.khataDue > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-red)' }}>
                  <span>Added to Khata (Due):</span>
                  <span style={{ fontWeight: 700 }}>₹{completedInvoice.khataDue.toLocaleString()}</span>
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

              {completedInvoice.customerPhone && (
                <a
                  href={`https://wa.me/91${completedInvoice.customerPhone}?text=${encodeURIComponent(
                    `Namaste ${completedInvoice.customerName}, Thank you for shopping at ALZINO Bodhan! Your Invoice #${completedInvoice.invoiceNo} for Rs.${completedInvoice.grandTotal} is confirmed. Visit again!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.6rem', color: '#10B981' }}
                >
                  <Share2 size={16} />
                  <span>Send WhatsApp Confirmation</span>
                </a>
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

    </div>
  );
}
