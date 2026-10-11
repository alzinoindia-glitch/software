import React, { useState, useMemo } from 'react';
import { ProductImageViewer } from './ProductImages';
import { getAgingDays } from '../utils/stockOffers';
import { 
  Smartphone, 
  MapPin, 
  Clock, 
  Phone, 
  Search, 
  Wrench, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  MessageCircle, 
  Navigation, 
  Layers, 
  Award, 
  Tag, 
  Zap, 
  ChevronRight, 
  ChevronDown,
  BatteryCharging, 
  Lock, 
  Star,
  Tv,
  Flame,
  Percent,
  Truck,
  RotateCcw,
  Cpu,
  BadgePercent,
  Check,
  Shield,
  Eye,
  SlidersHorizontal,
  ExternalLink,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  ArrowRight,
  Package,
  CheckCircle,
  HelpCircle,
  FileText
} from 'lucide-react';

const InstagramIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const YoutubeIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
    <polygon points="10 15 15 12 10 9" fill={color}/>
  </svg>
);

const FacebookIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

export default function CustomerStorefront({
  shopConfig = {},
  inventory = [],
  usedPurchases = [],
  repairJobs = [],
  onNavigatePortal = () => {},
  theme = 'cream'
}) {
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('featured'); 
  const [repairSearch, setRepairSearch] = useState('');
  const [selectedProductModal, setSelectedProductModal] = useState(null);

  // Quick Commerce Cart State (Blinkit / Zepto / Instamart style)
  const [cart, setCart] = useState({}); // { [productId]: quantity }
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState('doorstep'); // 'doorstep' | 'pickup'

  // Curated showcase of Mobiles & Home Appliances when inventory is fresh
  const fallbackShowroomCatalog = [
    {
      id: 'SHOW-APP-01',
      name: 'Samsung 55" Crystal 4K iSmart Ultra HD Smart LED TV',
      category: 'Home Appliances',
      department: 'appliances',
      brand: 'Samsung',
      price: 43990,
      mrp: 64900,
      stock: 3,
      condition: 'In-Store Deal',
      discountPct: 32,
      warranty: '2 Years Comprehensive Samsung Warranty',
      specs: 'Crystal Processor 4K • HDR 10+ • Q-Symphony Audio • SolarCell Remote',
      rack: 'AP-01',
      bin: 'B-01',
      deliveryTime: 'Same-Day Bodhan',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
      type: 'appliance'
    },
    {
      id: 'SHOW-MOB-01',
      name: 'Samsung Galaxy S24 Ultra 5G (256GB - Titanium Gray)',
      category: 'New Mobiles',
      department: 'mobiles',
      brand: 'Samsung',
      price: 114999,
      mrp: 129999,
      stock: 4,
      condition: 'Low Stock Deal',
      discountPct: 12,
      warranty: '1 Year Samsung India Official Warranty',
      specs: 'Snapdragon 8 Gen 3 • Galaxy AI • 200MP Quad Camera • S-Pen',
      rack: 'R-04',
      bin: 'B-12',
      deliveryTime: '15-30 Mins',
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=80',
      type: 'new'
    },
    {
      id: 'SHOW-APP-02',
      name: 'Voltas 1.5 Ton 5-Star Adjustable Inverter Split AC',
      category: 'Home Appliances',
      department: 'appliances',
      brand: 'Voltas',
      price: 36990,
      mrp: 75990,
      stock: 2,
      condition: 'Old Stock Clearance',
      discountPct: 51,
      warranty: '10 Years Inverter Compressor Warranty',
      specs: '100% Copper Condenser • 4-in-1 Cooling • Superdry Mode • Anti-Dust Filter',
      rack: 'AP-02',
      bin: 'B-02',
      deliveryTime: 'Same-Day Bodhan',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
      type: 'appliance'
    },
    {
      id: 'SHOW-MOB-02',
      name: 'Apple iPhone 15 Pro (128GB - Natural Titanium)',
      category: 'New Mobiles',
      department: 'mobiles',
      brand: 'Apple',
      price: 119900,
      mrp: 134900,
      stock: 3,
      condition: 'Brand New Sealed',
      discountPct: 11,
      warranty: '1 Year Apple Official Warranty',
      specs: 'A17 Pro Chip • Super Retina XDR • 48MP Pro System • Ceramic Shield',
      rack: 'R-01',
      bin: 'B-01',
      deliveryTime: '15-30 Mins',
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
      type: 'new'
    },
    {
      id: 'SHOW-APP-03',
      name: 'LG 8.0 Kg 5-Star Smart Inverter Front Load Washing Machine',
      category: 'Home Appliances',
      department: 'appliances',
      brand: 'LG',
      price: 33990,
      mrp: 49990,
      stock: 2,
      condition: 'In-Store Deal',
      discountPct: 32,
      warranty: '10 Years Direct Drive Motor Warranty',
      specs: 'AI DD Steam Wash • 6 Motion Tech • Stainless Steel Tub • TurboWash',
      rack: 'AP-03',
      bin: 'B-03',
      deliveryTime: 'Same-Day Bodhan',
      image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&auto=format&fit=crop&q=80',
      type: 'appliance'
    },
    {
      id: 'SHOW-MOB-03',
      name: 'Apple iPhone 13 (128GB - Midnight Black)',
      category: 'Used Mobiles',
      department: 'mobiles',
      brand: 'Apple',
      price: 36999,
      mrp: 59900,
      stock: 2,
      condition: 'Certified Grade A+',
      discountPct: 38,
      warranty: '6 Months ALZINO Comprehensive Hardware Warranty',
      specs: 'A15 Bionic • Ceramic Shield • Dual 12MP Camera • Tested 24-Point QC Check',
      rack: 'R-02',
      bin: 'B-04',
      deliveryTime: '15-30 Mins',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
      type: 'refurbished'
    },
    {
      id: 'SHOW-APP-04',
      name: 'Symphony Diet 3D 55i Personal Tower Air Cooler (55 Litres)',
      category: 'Home Appliances',
      department: 'appliances',
      brand: 'Symphony',
      price: 9499,
      mrp: 13999,
      stock: 5,
      condition: 'Old Stock Clearance',
      discountPct: 32,
      warranty: '1 Year Manufacturer Warranty',
      specs: '3D Cooling Honeycomb Pads • i-Pure Air Tech • Low Power Consumption • Remote',
      rack: 'AP-04',
      bin: 'B-04',
      deliveryTime: 'Same-Day Bodhan',
      image: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80',
      type: 'appliance'
    },
    {
      id: 'SHOW-ACC-01',
      name: 'ALZINO 65W GaN Ultra-Fast Multi-Port Charger (Dual Type-C + USB)',
      category: 'Mobile Accessories',
      department: 'mobiles',
      brand: 'ALZINO Tech',
      price: 1499,
      mrp: 2999,
      stock: 15,
      condition: 'In-Store Deal',
      discountPct: 50,
      warranty: '1 Year Instant Counter Replacement Warranty',
      specs: 'GaN III Tech • Power Delivery 3.0 • Fast charges Laptops, iPhones & Androids',
      rack: 'R-03',
      bin: 'B-08',
      deliveryTime: '15 Mins',
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
      type: 'new'
    }
  ];

  // Helper to extract clean condition text without noisy emojis
  const cleanBadgeText = (text) => {
    if (!text) return 'Verified Stock';
    return text.replace(/[⚡🏷️🔥✨🎉●]/g, '').trim();
  };

  // Build live showroom products list combining real admin inventory & refurbished
  const liveProducts = useMemo(() => {
    const list = [];

    // 1. Add active inventory items
    if (inventory && inventory.length > 0) {
      inventory.forEach(item => {
        const isAppliance = item.category === 'Home Appliances' || 
                            (item.name && (item.name.toLowerCase().includes('tv') || 
                                           item.name.toLowerCase().includes('ac') || 
                                           item.name.toLowerCase().includes('cooler') || 
                                           item.name.toLowerCase().includes('washing machine') || 
                                           item.name.toLowerCase().includes('fridge')));

        const department = isAppliance ? 'appliances' : 'mobiles';
        const agingDays = getAgingDays(item);
        const hasOffer = item.offer && item.offer.pct > 0;
        const regularPrice = item.offer?.regularPrice || item.mrp || (item.sellPrice * 1.15);
        const sellPrice = item.sellPrice || 0;
        const discount = regularPrice > sellPrice ? Math.round(((regularPrice - sellPrice) / regularPrice) * 100) : 0;

        let condition = 'Brand New';
        if (hasOffer) {
          condition = cleanBadgeText(item.offer.label || `Special Deal (${item.offer.pct}% Off)`);
        } else if (agingDays >= 60) {
          condition = `Clearance Deal (${discount}% Off)`;
        } else if (discount > 10) {
          condition = `In-Store Deal (${discount}% Off)`;
        }

        list.push({
          id: item.id,
          name: item.name,
          category: item.category || (isAppliance ? 'Home Appliances' : 'New Mobiles'),
          department,
          brand: item.brand || item.name.split(' ')[0] || 'ALZINO',
          price: sellPrice,
          mrp: regularPrice,
          discountPct: discount,
          stock: Number(item.stock) || 0,
          condition,
          warranty: item.warranty || '1 Year Official Manufacturer Warranty',
          rack: item.rack || 'R-01',
          bin: item.bin || 'B-01',
          deliveryTime: isAppliance ? 'Same-Day Bodhan' : '15-30 Mins',
          specs: item.description || item.specs || 'Genuine Bodhan In-Store Stock • Official GST Bill',
          image: null,
          images: item.images || null,
          type: isAppliance ? 'appliance' : 'new'
        });
      });
    }

    // 2. Add refurbished purchases if in-stock
    if (usedPurchases && usedPurchases.length > 0) {
      usedPurchases.forEach(item => {
        if (item.status !== 'Sold') {
          const buyP = Number(item.purchasePrice || 0);
          const sellP = Number(item.expectedSellingPrice || buyP * 1.25);
          const mrpVal = Number(sellP * 1.35);
          const disc = mrpVal > sellP ? Math.round(((mrpVal - sellP) / mrpVal) * 100) : 0;
          list.push({
            id: item.id || `USED-${Math.random()}`,
            name: `${item.brand || ''} ${item.model || ''} (${item.storage || ''} ${item.color || ''})`,
            category: 'Used Mobiles',
            department: 'mobiles',
            brand: item.brand || 'Refurbished',
            price: sellP,
            mrp: mrpVal,
            discountPct: disc,
            stock: 1,
            condition: `Certified ${item.conditionGrade || 'Grade A+'} (${disc}% Off)`,
            batteryHealth: item.batteryHealth ? `${item.batteryHealth}%` : '90%+',
            warranty: '6 Months ALZINO Hardware Warranty',
            rack: 'R-02',
            bin: 'B-04',
            deliveryTime: '15-30 Mins',
            specs: `IMEI: ${item.imei1 ? item.imei1.slice(0, 8) + '...' : 'Verified'} • Tested 24-Point QC Check`,
            image: null,
            type: 'refurbished'
          });
        }
      });
    }

    if (list.length === 0) {
      return fallbackShowroomCatalog;
    }

    return list;
  }, [inventory, usedPurchases]);

  // Cart Quantities & Helpers
  const addToCart = (product) => {
    setCart(prev => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
  };

  const removeFromCart = (product) => {
    setCart(prev => {
      const cur = prev[product.id] || 0;
      if (cur <= 1) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return { ...prev, [product.id]: cur - 1 };
    });
  };

  const cartItems = useMemo(() => {
    return Object.entries(cart).map(([id, qty]) => {
      const prod = liveProducts.find(p => String(p.id) === String(id));
      return prod ? { ...prod, qty } : null;
    }).filter(Boolean);
  }, [cart, liveProducts]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  }, [cartItems]);

  const cartMrpTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + ((item.mrp || item.price) * item.qty), 0);
  }, [cartItems]);

  const cartSavings = cartMrpTotal - cartTotal;
  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }, [cart]);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    let result = liveProducts.filter(item => {
      // 1. Category Filter
      if (selectedCategory === 'smartphones' && item.department !== 'mobiles') return false;
      if (selectedCategory === 'appliances' && item.department !== 'appliances') return false;
      if (selectedCategory === 'refurbished' && item.type !== 'refurbished') return false;
      if (selectedCategory === 'accessories' && item.category !== 'Mobile Accessories') return false;
      if (selectedCategory === 'clearance') {
        const hasDiscount = (item.discountPct && item.discountPct >= 10) || 
                            (item.condition && (item.condition.includes('Clearance') || item.condition.includes('Deal') || item.condition.includes('Off')));
        if (!hasDiscount) return false;
      }

      // 2. Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesBrand = (item.brand || '').toLowerCase().includes(q);
        const matchesSpecs = (item.specs || '').toLowerCase().includes(q);
        const matchesCat = (item.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBrand && !matchesSpecs && !matchesCat) return false;
      }

      return true;
    });

    // 3. Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'discount') {
      result.sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0));
    }

    return result;
  }, [liveProducts, selectedCategory, searchTerm, sortBy]);

  // Quick Category Pills
  const categoriesList = [
    { id: 'all', label: 'All Products', icon: Layers },
    { id: 'smartphones', label: 'Smartphones & 5G', icon: Smartphone },
    { id: 'appliances', label: '4K TVs & Appliances', icon: Tv },
    { id: 'refurbished', label: 'Refurbished Mobiles', icon: Award },
    { id: 'accessories', label: 'Fast Chargers & Audio', icon: Zap },
    { id: 'clearance', label: 'Clearance Hub', icon: BadgePercent },
  ];

  // Repair tracking status lookup
  const trackedRepairs = useMemo(() => {
    if (!repairSearch.trim()) return [];
    const q = repairSearch.toLowerCase().trim();
    return repairJobs.filter(job => 
      (job.jobId && job.jobId.toLowerCase().includes(q)) ||
      (job.phone && job.phone.includes(q)) ||
      (job.customerName && job.customerName.toLowerCase().includes(q)) ||
      (job.model && job.model.toLowerCase().includes(q))
    );
  }, [repairJobs, repairSearch]);

  const handleWhatsAppCheckout = () => {
    const phone = (shopConfig.whatsappNumber || '+91 98490 82741').replace(/[^0-9]/g, '');
    let orderSummary = `*ALZINO STOREFRONT ORDER* 🛍️\n`;
    orderSummary += `Customer: ${customerName || 'Bodhan Customer'}\n`;
    orderSummary += `Phone: ${customerPhone || 'Not provided'}\n`;
    orderSummary += `Mode: ${deliveryType === 'doorstep' ? 'Doorstep Delivery' : 'Showroom Counter Pickup'}\n`;
    if (customerAddress) orderSummary += `Address: ${customerAddress}\n`;
    orderSummary += `\n*ITEMS ORDERED:*\n`;

    cartItems.forEach((item, index) => {
      orderSummary += `${index + 1}. ${item.name} x ${item.qty} = ₹${(item.price * item.qty).toLocaleString()} (Rack: ${item.rack || 'R-01'})\n`;
    });

    orderSummary += `\n*TOTAL BILL:* ₹${cartTotal.toLocaleString()}`;
    if (cartSavings > 0) {
      orderSummary += ` (Saved: ₹${cartSavings.toLocaleString()})`;
    }
    orderSummary += `\n\nPlease confirm availability for instant processing. Thank you!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(orderSummary)}`;
    window.open(url, '_blank');
  };

  const handleSingleWhatsAppInquiry = (product) => {
    const phone = (shopConfig.whatsappNumber || '+91 98490 82741').replace(/[^0-9]/g, '');
    const priceFormatted = `₹${(product.price || 0).toLocaleString()}`;
    const mrpFormatted = product.mrp ? ` (Box MRP: ₹${product.mrp.toLocaleString()})` : '';
    const discountText = product.discountPct > 0 ? ` [${product.discountPct}% Discount Applied]` : '';
    const locText = product.rack ? ` [Location: Rack ${product.rack}, Bin ${product.bin}]` : '';
    
    const message = `Hello ALZINO Mobiles & Home Appliances Bodhan! 👋\n\n` +
      `I want to buy:\n` +
      `📦 Product: ${product.name}\n` +
      `💰 Special Price: ${priceFormatted}${mrpFormatted}${discountText}\n` +
      `⚡ Delivery: ${product.deliveryTime || 'Same-Day'}\n` +
      `${locText}\n\n` +
      `Please confirm stock for immediate delivery/pickup at Station Road, Bodhan.`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F4F6F8',
      color: '#1A1C1E',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      paddingBottom: cartCount > 0 ? '5rem' : '0'
    }}>

      {/* ========================================================================= */}
      {/* 1. QUICK-COMMERCE APP HEADER (BLINKIT / ZEPTO / INSTAMART STYLE) */}
      {/* ========================================================================= */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        {/* Main Bar */}
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {/* Brand + Location Selector (Blinkit Style) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
            {/* Logo */}
            <div 
              onClick={() => { setSelectedCategory('all'); setSearchTerm(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#0C5B43',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.25rem',
                letterSpacing: '-0.02em'
              }}>
                A
              </div>
              <div>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#0C5B43' }}>
                  {shopConfig.name || 'ALZINO'}
                </span>
                <span style={{
                  marginLeft: '0.35rem',
                  backgroundColor: '#E8F5E9',
                  color: '#1B5E20',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.35rem',
                  borderRadius: '3px',
                  textTransform: 'uppercase'
                }}>
                  express
                </span>
              </div>
            </div>

            {/* Delivery Location Pill (Blinkit / Zepto Style) */}
            <div className="hide-on-mobile" style={{
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#1B5E20' }}>
                <Zap size={14} fill="#1B5E20" color="#1B5E20" />
                <span>Superfast In-Store &amp; Doorstep</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', color: '#6B7280' }}>
                <span>Station Road, Bodhan - 503185</span>
                <ChevronDown size={12} />
              </div>
            </div>
          </div>

          {/* Quick-Commerce Omnibox Search Bar */}
          <div style={{ flex: 1, maxWidth: '620px', position: 'relative' }}>
            <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder='Search "iPhone 15", "Samsung 4K TV", "Inverter AC", "Charger"...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.6rem',
                backgroundColor: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '0.88rem',
                color: '#1F2937',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  fontSize: '0.85rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Right: Quick Action Controls + Cart Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <a 
              href={`tel:${(shopConfig.phone || '9849082741').replace(/[^0-9]/g, '')}`}
              className="hide-on-mobile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#4B5563',
                textDecoration: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: '#F3F4F6'
              }}
            >
              <Phone size={14} />
              <span>Call Desk</span>
            </a>

            {/* Zepto/Blinkit Green Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              style={{
                backgroundColor: '#0C5B43',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.15rem',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 2px 10px rgba(12, 91, 67, 0.25)',
                transition: 'transform 0.15s ease'
              }}
            >
              <ShoppingCart size={17} />
              {cartCount > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
                  <span>•</span>
                  <span>₹{cartTotal.toLocaleString()}</span>
                </div>
              ) : (
                <span>My Cart</span>
              )}
            </button>
          </div>
        </div>

        {/* Categories Bar (Horizontal Pills Scroll - Blinkit Style) */}
        <div style={{
          borderTop: '1px solid #F3F4F6',
          backgroundColor: '#FFFFFF',
          padding: '0.4rem 1rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            gap: '0.5rem'
          }}>
            {categoriesList.map(cat => {
              const isActive = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    backgroundColor: isActive ? '#0C5B43' : '#F9FAFB',
                    color: isActive ? '#FFFFFF' : '#374151',
                    border: `1px solid ${isActive ? '#0C5B43' : '#E5E7EB'}`,
                    padding: '0.45rem 0.95rem',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={14} color={isActive ? '#FFFFFF' : '#0C5B43'} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. PROMOTIONAL QUICK-COMMERCE HERO BANNERS (ZEPTO / INSTAMART STYLE) */}
      {/* ========================================================================= */}
      <section style={{ maxWidth: '1280px', margin: '1.25rem auto 0', padding: '0 1rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '0.85rem'
        }}>
          {/* Banner 1: Live Counter Price Match */}
          <div style={{
            background: 'linear-gradient(135deg, #0C5B43 0%, #177A5C 100%)',
            color: '#FFFFFF',
            padding: '1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(12, 91, 67, 0.15)'
          }}>
            <div>
              <span style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>
                Counter Price Match
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0.35rem 0 0.2rem' }}>
                Cheaper Than Amazon &amp; Flipkart
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#E1EBE6' }}>
                Show us lower pricing today at the Bodhan counter &amp; we match it live!
              </p>
            </div>
            <div style={{ fontSize: '2.4rem', opacity: 0.9 }}>🏷️</div>
          </div>

          {/* Banner 2: Same-day Appliances Delivery & Demo */}
          <div style={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            color: '#FFFFFF',
            padding: '1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
          }}>
            <div>
              <span style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>
                Free Bodhan Delivery
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0.35rem 0 0.2rem' }}>
                4K TVs, Inverter ACs &amp; Washers
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#DBEAFE' }}>
                Free doorstep transportation &amp; live unboxing demo across Bodhan.
              </p>
            </div>
            <div style={{ fontSize: '2.4rem', opacity: 0.9 }}>📺</div>
          </div>

          {/* Banner 3: 30-Minute Lab Repair */}
          <div style={{
            background: 'linear-gradient(135deg, #78350F 0%, #B45309 100%)',
            color: '#FFFFFF',
            padding: '1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(180, 83, 9, 0.15)'
          }}>
            <div>
              <span style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>
                In-Store Precision Lab
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0.35rem 0 0.2rem' }}>
                30-Min Screen &amp; Battery Fix
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#FEF3C7' }}>
                Genuine displays &amp; chip restoration done right inside our Bodhan store.
              </p>
            </div>
            <div style={{ fontSize: '2.4rem', opacity: 0.9 }}>⚡</div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PRODUCT CATALOG GRID WITH BLINKIT / ZEPTO STYLE CARDS */}
      {/* ========================================================================= */}
      <section style={{ maxWidth: '1280px', margin: '1.5rem auto 3rem', padding: '0 1rem' }}>
        {/* Section Title & Sort Dropdown */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: '#111827' }}>
              {selectedCategory === 'appliances' ? '4K Smart TVs & Home Appliances' : 
               selectedCategory === 'smartphones' ? 'Smartphones & 5G Devices' : 
               selectedCategory === 'refurbished' ? 'Certified Refurbished Smartphones' : 
               selectedCategory === 'clearance' ? 'Old-Stock Clearance Deals' : 
               'Fresh In-Store Inventory'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
              {filteredProducts.length} items available right now at Station Road, Bodhan
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#374151',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="featured">Featured Deals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount">Highest Savings %</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px dashed #D1D5DB'
          }}>
            <Package size={48} color="#9CA3AF" style={{ marginBottom: '0.85rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#111827' }}>
              No items match current filter
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', maxWidth: '380px', margin: '0.4rem auto 1.25rem' }}>
              We receive new smartphone stock and home appliances daily at our Bodhan counter.
            </p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchTerm(''); }}
              style={{
                backgroundColor: '#0C5B43',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.15rem',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              View All Products
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem'
          }}>
            {filteredProducts.map(prod => {
              const qtyInCart = cart[prod.id] || 0;
              const savings = (prod.mrp && prod.mrp > prod.price) ? prod.mrp - prod.price : 0;

              return (
                <div
                  key={prod.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'box-shadow 0.15s ease, transform 0.15s ease'
                  }}
                >
                  <div>
                    {/* Top Badges (Delivery Time + Discount Pill) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        <Clock size={10} color="#10B981" />
                        <span>{prod.deliveryTime || '15-30 Mins'}</span>
                      </span>

                      {prod.discountPct > 0 && (
                        <span style={{
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          {prod.discountPct}% OFF
                        </span>
                      )}
                    </div>

                    {/* Product Photo Showcase */}
                    <div 
                      onClick={() => setSelectedProductModal(prod)}
                      style={{
                        height: '150px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        marginBottom: '0.65rem',
                        cursor: 'pointer'
                      }}
                      title="Click to view details & photos"
                    >
                      {prod.images ? (
                        <ProductImageViewer product={prod} height={150} />
                      ) : prod.image ? (
                        <img 
                          src={prod.image} 
                          alt={prod.name} 
                          style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain' }} 
                        />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                          {prod.type === 'appliance' ? <Tv size={42} /> : <Smartphone size={42} />}
                          <div style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>{prod.brand}</div>
                        </div>
                      )}
                    </div>

                    {/* Brand & Category */}
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0C5B43', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      {prod.brand} • {prod.category}
                    </div>

                    {/* Product Title */}
                    <h3 
                      onClick={() => setSelectedProductModal(prod)}
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        color: '#111827',
                        margin: '0 0 0.35rem',
                        lineHeight: 1.35,
                        minHeight: '2.4rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                      title="Click to view details"
                    >
                      {prod.name}
                    </h3>

                    {/* Micro Specs */}
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#6B7280',
                      marginBottom: '0.5rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {prod.specs}
                    </div>

                    {/* Showroom Rack Location */}
                    {prod.rack && (
                      <div style={{
                        fontSize: '0.65rem',
                        color: '#4B5563',
                        backgroundColor: '#F3F4F6',
                        padding: '0.2rem 0.45rem',
                        borderRadius: '4px',
                        display: 'inline-block',
                        marginBottom: '0.65rem',
                        fontWeight: 600
                      }}>
                        Aisle: {prod.rack} • Bin: {prod.bin}
                      </div>
                    )}
                  </div>

                  {/* Pricing Row & Blinkit-Style ADD Button */}
                  <div style={{
                    borderTop: '1px solid #F3F4F6',
                    paddingTop: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#111827' }}>
                          ₹{prod.price.toLocaleString()}
                        </span>
                        {prod.mrp && prod.mrp > prod.price && (
                          <span style={{ fontSize: '0.72rem', color: '#9CA3AF', textDecoration: 'line-through' }}>
                            ₹{prod.mrp.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {savings > 0 && (
                        <div style={{ fontSize: '0.62rem', color: '#16A34A', fontWeight: 700 }}>
                          Save ₹{savings.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Quick-Commerce Stepper ADD Button (Blinkit/Zepto Style) */}
                    <div>
                      {qtyInCart > 0 ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: '#0C5B43',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          overflow: 'hidden'
                        }}>
                          <button
                            onClick={() => removeFromCart(prod)}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#FFFFFF',
                              padding: '0.4rem 0.55rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Minus size={13} />
                          </button>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '0 0.35rem' }}>
                            {qtyInCart}
                          </span>
                          <button
                            onClick={() => addToCart(prod)}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#FFFFFF',
                              padding: '0.4rem 0.55rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(prod)}
                          style={{
                            backgroundColor: '#FFFFFF',
                            color: '#0C5B43',
                            border: '1.5px solid #0C5B43',
                            borderRadius: '6px',
                            padding: '0.38rem 1rem',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>ADD</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 4. LIVE DEVICE REPAIR TRACKER (QUICK-COMMERCE LIVE TIMELINE STYLE) */}
      {/* ========================================================================= */}
      <section style={{ maxWidth: '1280px', margin: '0 auto 3rem', padding: '0 1rem' }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '1.75rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Wrench size={16} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#111827' }}>
              Track Device Repair in Real Time
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 1.25rem' }}>
            Have a phone or TV in our Bodhan repair lab? Enter your Job ID (e.g. REP-1021) or mobile number:
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '520px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input 
              type="text"
              placeholder="Enter Job ID (REP-...) or 10-digit mobile number"
              value={repairSearch}
              onChange={(e) => setRepairSearch(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                backgroundColor: '#F9FAFB',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#111827',
                outline: 'none',
                minWidth: '220px'
              }}
            />
            {repairSearch && (
              <button
                onClick={() => setRepairSearch('')}
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '0 0.85rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Results Display */}
          {repairSearch.trim() && (
            <div>
              {trackedRepairs.length === 0 ? (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  border: '1px dashed #D1D5DB',
                  fontSize: '0.82rem',
                  color: '#6B7280'
                }}>
                  No active repair job matched "{repairSearch}". Please check the Job ID on your receipt or call the counter desk.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {trackedRepairs.map(job => (
                    <div 
                      key={job.id || job.jobId}
                      style={{
                        backgroundColor: '#F9FAFB',
                        border: '1.5px solid #0C5B43',
                        borderRadius: '10px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0C5B43' }}>
                            Job #{job.jobId}
                          </span>
                          <span style={{ fontWeight: 700, marginLeft: '0.5rem', color: '#111827', fontSize: '0.88rem' }}>
                            {job.brand} {job.model}
                          </span>
                        </div>
                        <span style={{
                          backgroundColor: job.status === 'Delivered' ? '#D1FAE5' : '#FEF3C7',
                          color: job.status === 'Delivered' ? '#065F46' : '#92400E',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800
                        }}>
                          {job.status || 'Diagnostic Lab'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '0.35rem' }}>
                        Customer: {job.customerName} • Issue: {job.issueDescription || job.problem || 'Hardware Diagnostic'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SHOWROOM LOCATION & CONTACT CARDS */}
      {/* ========================================================================= */}
      <section style={{ maxWidth: '1280px', margin: '0 auto 3.5rem', padding: '0 1rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          {/* Showroom Address */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <MapPin size={18} color="#0C5B43" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                Flagship Showroom
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.5, margin: '0 0 0.85rem' }}>
              {shopConfig.address || 'Station Road, Near Old Bus Stand, Bodhan, Telangana - 503185'}<br />
              <strong style={{ color: '#0C5B43' }}>Landmark:</strong> Opposite State Bank of India (SBI)
            </p>
            <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: '1rem' }}>
              <strong>Hours:</strong> {shopConfig.storeTimings || '9:30 AM – 10:00 PM (All 7 Days)'}
            </div>
            <a
              href={shopConfig.mapsUrl || 'https://maps.google.com/?q=Station+Road+Bodhan+Telangana+503185'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#F3F4F6',
                color: '#0C5B43',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <Navigation size={14} />
              <span>Get GPS Directions</span>
            </a>
          </div>

          {/* Social Channels */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#111827' }}>
              Connect with ALZINO Bodhan
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 1rem' }}>
              Follow unboxings, clearance drops and giveaways on our official channels:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <a
                href={shopConfig.whatsappUrl || 'https://wa.me/919849082741'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.65rem',
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                <MessageCircle size={15} />
                <span>WhatsApp</span>
              </a>

              <a
                href={shopConfig.instagramUrl || 'https://instagram.com/alzino.bodhan'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.65rem',
                  backgroundColor: '#FDF2F8',
                  color: '#BE185D',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                <InstagramIcon size={15} color="#BE185D" />
                <span>Instagram</span>
              </a>

              <a
                href={shopConfig.youtubeUrl || 'https://youtube.com/@AlzinoTechBodhan'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.65rem',
                  backgroundColor: '#FEF2F2',
                  color: '#B91C1C',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                <YoutubeIcon size={15} color="#B91C1C" />
                <span>YouTube</span>
              </a>

              <a
                href={shopConfig.facebookUrl || 'https://facebook.com/alzinomobiles'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.65rem',
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                <FacebookIcon size={15} color="#1D4ED8" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. BLINKIT / ZEPTO STYLE QUICK-COMMERCE CART DRAWER */}
      {/* ========================================================================= */}
      {isCartOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end'
        }}
        onClick={() => setIsCartOpen(false)}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            width: '100%',
            maxWidth: '420px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            boxSizing: 'border-box'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Cart Header */}
            <div style={{
              padding: '1.15rem',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={20} color="#0C5B43" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0, color: '#111827' }}>
                  My Cart ({cartCount})
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                style={{
                  backgroundColor: '#F3F4F6',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <ShoppingCart size={48} color="#D1D5DB" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.35rem', color: '#111827' }}>
                    Your cart is empty
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 1.5rem' }}>
                    Browse our live smartphone stock, 4K TVs and appliances to add items.
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    style={{
                      backgroundColor: '#0C5B43',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {cartItems.map(item => (
                    <div 
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                          ₹{item.price.toLocaleString()} each
                        </div>
                        {item.rack && (
                          <div style={{ fontSize: '0.65rem', color: '#0C5B43', fontWeight: 700 }}>
                            Rack: {item.rack} • Bin: {item.bin}
                          </div>
                        )}
                      </div>

                      {/* Stepper */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#0C5B43',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}>
                        <button
                          onClick={() => removeFromCart(item)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#FFFFFF',
                            padding: '0.35rem 0.5rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '0 0.35rem' }}>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#FFFFFF',
                            padding: '0.35rem 0.5rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Delivery & Customer Info */}
                  <div style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    border: '1px solid #E5E7EB',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
                      Delivery / Pickup Details
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem' }}>
                      <button
                        onClick={() => setDeliveryType('doorstep')}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          borderRadius: '6px',
                          border: `1px solid ${deliveryType === 'doorstep' ? '#0C5B43' : '#D1D5DB'}`,
                          backgroundColor: deliveryType === 'doorstep' ? '#E8F5E9' : '#FFFFFF',
                          color: deliveryType === 'doorstep' ? '#0C5B43' : '#4B5563',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🚚 Doorstep Delivery
                      </button>
                      <button
                        onClick={() => setDeliveryType('pickup')}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          borderRadius: '6px',
                          border: `1px solid ${deliveryType === 'pickup' ? '#0C5B43' : '#D1D5DB'}`,
                          backgroundColor: deliveryType === 'pickup' ? '#E8F5E9' : '#FFFFFF',
                          color: deliveryType === 'pickup' ? '#0C5B43' : '#4B5563',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🏪 Showroom Pickup
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <input 
                        type="text"
                        placeholder="Your Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          outline: 'none'
                        }}
                      />
                      <input 
                        type="tel"
                        placeholder="10-Digit Mobile Number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          outline: 'none'
                        }}
                      />
                      {deliveryType === 'doorstep' && (
                        <input 
                          type="text"
                          placeholder="Delivery Address in Bodhan"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          style={{
                            padding: '0.45rem 0.65rem',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            outline: 'none'
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Bill Summary */}
                  <div style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.78rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
                      <span>Item Total</span>
                      <span>₹{cartMrpTotal.toLocaleString()}</span>
                    </div>
                    {cartSavings > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: 700 }}>
                        <span>ALZINO Counter Discount</span>
                        <span>- ₹{cartSavings.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
                      <span>Delivery Fee</span>
                      <span style={{ color: '#16A34A', fontWeight: 700 }}>FREE (Bodhan)</span>
                    </div>
                    <div style={{
                      borderTop: '1px solid #E5E7EB',
                      paddingTop: '0.45rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      color: '#111827'
                    }}>
                      <span>To Pay</span>
                      <span>₹{cartTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Footer CTA */}
            {cartItems.length > 0 && (
              <div style={{ padding: '1rem', borderTop: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
                <button
                  onClick={handleWhatsAppCheckout}
                  style={{
                    width: '100%',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)'
                  }}
                >
                  <MessageCircle size={18} />
                  <span>Order on WhatsApp (₹{cartTotal.toLocaleString()})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. FLOATING QUICK-COMMERCE BOTTOM CART BAR (BLINKIT / ZEPTO STYLE) */}
      {/* ========================================================================= */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          right: '1rem',
          maxWidth: '560px',
          margin: '0 auto',
          zIndex: 90
        }}>
          <div 
            onClick={() => setIsCartOpen(true)}
            style={{
              backgroundColor: '#0C5B43',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(12, 91, 67, 0.45)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.78rem',
                fontWeight: 900
              }}>
                {cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900 }}>
                ₹{cartTotal.toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800 }}>
              <span>View Cart</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. QUICK-SPECS & PHOTO PREVIEW MODAL */}
      {/* ========================================================================= */}
      {selectedProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
        onClick={() => setSelectedProductModal(null)}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProductModal(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                backgroundColor: '#F3F4F6',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>

            {/* Photo */}
            <div style={{
              height: '200px',
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              {selectedProductModal.images ? (
                <ProductImageViewer product={selectedProductModal} height={200} />
              ) : selectedProductModal.image ? (
                <img src={selectedProductModal.image} alt={selectedProductModal.name} style={{ maxHeight: '190px', maxWidth: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                  {selectedProductModal.type === 'appliance' ? <Tv size={56} /> : <Smartphone size={56} />}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0C5B43', backgroundColor: '#E8F5E9', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                {selectedProductModal.brand}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4B5563', backgroundColor: '#F3F4F6', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                {selectedProductModal.deliveryTime || 'Same-Day Bodhan'}
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#111827', margin: '0 0 0.5rem' }}>
              {selectedProductModal.name}
            </h3>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#111827' }}>
                ₹{selectedProductModal.price.toLocaleString()}
              </span>
              {selectedProductModal.mrp && selectedProductModal.mrp > selectedProductModal.price && (
                <span style={{ fontSize: '0.88rem', color: '#9CA3AF', textDecoration: 'line-through' }}>
                  ₹{selectedProductModal.mrp.toLocaleString()}
                </span>
              )}
              {selectedProductModal.discountPct > 0 && (
                <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  {selectedProductModal.discountPct}% OFF
                </span>
              )}
            </div>

            <div style={{ backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '0.85rem', border: '1px solid #E5E7EB', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
              <div><strong>Specifications:</strong> {selectedProductModal.specs}</div>
              <div><strong>Warranty:</strong> {selectedProductModal.warranty || '1 Year Official Warranty'}</div>
              {selectedProductModal.rack && (
                <div style={{ color: '#0C5B43', fontWeight: 700 }}>
                  <strong>In-Store Shelf Location:</strong> Aisle Rack {selectedProductModal.rack} • Bin {selectedProductModal.bin}
                </div>
              )}
              <div><strong>Stock Status:</strong> {selectedProductModal.stock > 0 ? `In Stock (${selectedProductModal.stock} units in Bodhan)` : 'On Order'}</div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                onClick={() => {
                  addToCart(selectedProductModal);
                  setSelectedProductModal(null);
                  setIsCartOpen(true);
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#0C5B43',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <ShoppingCart size={16} />
                <span>Add to Cart</span>
              </button>

              <button
                onClick={() => handleSingleWhatsAppInquiry(selectedProductModal)}
                style={{
                  flex: 1,
                  backgroundColor: '#25D366',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <MessageCircle size={16} />
                <span>Reserve on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. REFINED CLEAN FOOTER WITH DISCREET STAFF ACCESS */}
      {/* ========================================================================= */}
      <footer style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        padding: '2.5rem 1rem 1.5rem',
        fontSize: '0.8rem',
        color: '#6B7280'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid #F3F4F6'
        }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0C5B43', marginBottom: '0.25rem' }}>
              {shopConfig.name || 'ALZINO'} Express
            </div>
            <div>Station Road, Bodhan, Telangana - 503185 • GSTIN: {shopConfig.gstin || '36AABCA1234M1Z8'}</div>
          </div>

          {/* Discreet Staff Portal Links (Tucked away neatly in footer) */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Store Staff:</span>
            <button 
              onClick={() => onNavigatePortal('/cashier')}
              style={{
                background: 'none',
                border: 'none',
                color: '#4B5563',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Lock size={11} />
              <span>Cashier POS</span>
            </button>
            <button 
              onClick={() => onNavigatePortal('/admin')}
              style={{
                background: 'none',
                border: 'none',
                color: '#4B5563',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <ShieldCheck size={11} />
              <span>Admin ERP</span>
            </button>
          </div>
        </div>

        <div style={{
          maxWidth: '1280px',
          margin: '1rem auto 0',
          textAlign: 'center',
          fontSize: '0.72rem',
          color: '#9CA3AF'
        }}>
          © {new Date().getFullYear()} {shopConfig.name || 'ALZINO'}. All Rights Reserved. Superfast Showroom Delivery &amp; Counter Pickup across Bodhan.
        </div>
      </footer>

    </div>
  );
}
