import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProductImageViewer } from './ProductImages';
import { getAgingDays } from '../utils/stockOffers';
import { 
  Smartphone, 
  Phone, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Navigation,
  MapPin,
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
  FileText,
  Headphones,
  Watch,
  LayoutGrid,
  Cable,
  RefreshCw,
  Camera,
  QrCode,
  Home,
  MoreHorizontal
} from 'lucide-react';
import ProductScanDetailsModal from './ProductScanDetailsModal';
import CameraBarcodeScannerModal from './CameraBarcodeScannerModal';
import { findProductFromScan } from '../utils/productTerms';
import AlzinoLogo from './AlzinoLogo';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';
import { firstPositiveAmount, getProductSellingPrice } from '../utils/storefrontProductRules';
import { getAvailableCategories, isUsedMobileProduct, normalizeProductCategory } from '../utils/customTaxonomy';
import { sanitizePublicSpecifications } from '../utils/productSpecifications';

const InstagramIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);


const WhatsAppIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function CustomerStorefront({
  shopConfig = {},
  inventory = [],
  usedPurchases = [],
  onNavigatePortal = () => {},
  theme = 'cream'
}) {
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('featured'); 
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [scanAddedNotice, setScanAddedNotice] = useState('');
  const handledScanRef = useRef('');
  const [isStorefrontScannerOpen, setIsStorefrontScannerOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [publicCatalog, setPublicCatalog] = useState([]);
  const storePhoneDigits = String(shopConfig.phone || '9121212292').replace(/\D/g, '');
  const storePhoneHref = storePhoneDigits.length === 10 ? `+91${storePhoneDigits}` : `+${storePhoneDigits}`;
  const storePhoneLabel = storePhoneDigits.length === 10
    ? `+91 ${storePhoneDigits}`
    : storePhoneDigits.startsWith('91')
      ? `+91 ${storePhoneDigits.slice(2)}`
      : `+${storePhoneDigits}`;
  const storeWhatsAppDigits = String(shopConfig.whatsappNumber || shopConfig.phone || '9121212292').replace(/\D/g, '');
  const storeWhatsAppHref = `https://wa.me/${storeWhatsAppDigits.length === 10 ? `91${storeWhatsAppDigits}` : storeWhatsAppDigits}`;

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;
    const client = getSupabaseClient();
    if (!client) return undefined;
    let active = true;
    let requestRevision = 0;
    let refreshTimer;
    const loadCatalog = async () => {
      const revision = ++requestRevision;
      let { data, error } = await client
        .from('catalog_products')
        .select('id, name, brand, category, sell_price, mrp, stock_status, image_url, offer_text, specifications, description')
        .eq('is_published', true)
        .eq('stock_status', 'Available in store')
        .order('updated_at', { ascending: false });
      // Keep existing storefront data available until the catalog migration is applied.
      if (error && /specifications|description|column/i.test(error.message || '')) {
        ({ data, error } = await client
          .from('catalog_products')
          .select('id, name, brand, category, sell_price, mrp, stock_status, image_url, offer_text')
          .eq('is_published', true)
          .eq('stock_status', 'Available in store')
          .order('updated_at', { ascending: false }));
      }
      if (!active || revision !== requestRevision) return;
      if (error) {
        console.warn('[PublicCatalog] Could not load storefront products:', error.message);
        return;
      }
      setPublicCatalog(data || []);
    };
    loadCatalog();
    const scheduleCatalogRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(loadCatalog, 150);
    };
    const channel = client.channel('published-store-catalog')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalog_products' }, scheduleCatalogRefresh)
      .subscribe();
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') loadCatalog(); };
    const refreshInterval = window.setInterval(loadCatalog, 60_000);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      active = false;
      window.clearTimeout(refreshTimer);
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
      client.removeChannel(channel);
    };
  }, []);

  // Quick Commerce Cart State (Blinkit / Zepto / Instamart style)
  const [cart, setCart] = useState({}); // { [productId]: quantity }
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState('doorstep'); // 'doorstep' | 'pickup'

  // Rotating Value Proposition Hero Banners ("cards come, show text, go, and again come")
  const promoBanners = useMemo(() => [
    {
      id: 'price-match',
      tag: 'Counter Price Match',
      title: 'Cheaper Than Amazon & Flipkart',
      desc: 'Show us lower pricing today at the Bodhan counter & we match it live!',
      icon: '🏷️',
      gradient: 'linear-gradient(135deg, #0C5B43 0%, #177A5C 100%)',
      glowColor: 'rgba(12, 91, 67, 0.28)',
      textColor: '#E1EBE6',
      badgeBg: 'rgba(255, 255, 255, 0.22)'
    },
    {
      id: 'delivery',
      tag: 'Free Bodhan Delivery',
      title: '4K TVs, Inverter ACs & Washers',
      desc: 'Free doorstep transportation & live unboxing demo across Bodhan.',
      icon: '📺',
      gradient: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
      glowColor: 'rgba(37, 99, 235, 0.28)',
      textColor: '#DBEAFE',
      badgeBg: 'rgba(255, 255, 255, 0.22)'
    },
    {
      id: 'repair-lab',
      tag: 'In-Store Precision Lab',
      title: '30-Min Screen & Battery Fix',
      desc: 'Genuine displays & chip restoration done right inside our Bodhan store.',
      icon: '⚡',
      gradient: 'linear-gradient(135deg, #78350F 0%, #B45309 100%)',
      glowColor: 'rgba(180, 83, 9, 0.28)',
      textColor: '#FEF3C7',
      badgeBg: 'rgba(255, 255, 255, 0.22)'
    }
  ], []);

  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [bannerAnimPhase, setBannerAnimPhase] = useState('visible'); // 'visible' | 'exiting' | 'entering'
  const [isBannerHovered, setIsBannerHovered] = useState(false);

  useEffect(() => {
    if (isBannerHovered) return;

    // Show current card for 3800ms
    const timer = setTimeout(() => {
      // 1. Trigger exit animation ("and go")
      setBannerAnimPhase('exiting');

      const exitTimer = setTimeout(() => {
        // 2. Advance to next card ("again come")
        setActiveBannerIdx(prev => (prev + 1) % promoBanners.length);
        setBannerAnimPhase('entering');

        // 3. Trigger entrance to visible
        const enterTimer = setTimeout(() => {
          setBannerAnimPhase('visible');
        }, 50);

        return () => clearTimeout(enterTimer);
      }, 380);

      return () => clearTimeout(exitTimer);
    }, 3800);

    return () => clearTimeout(timer);
  }, [activeBannerIdx, isBannerHovered, promoBanners.length]);

  const currentBanner = promoBanners[activeBannerIdx] || promoBanners[0];

  // Helper to extract clean condition text without noisy emojis
  const cleanBadgeText = (text) => {
    if (!text) return 'Verified Stock';
    return text.replace(/[⚡🏷️🔥✨🎉●]/g, '').trim();
  };

  // Merge the shared public catalog with this device's Stock Hub inventory.
  // Local stock must remain visible immediately even when cloud publishing is
  // not configured yet; ProductImageViewer resolves its photos from local
  // IndexedDB when the catalog entry has image metadata.
  const liveProducts = useMemo(() => {
    const cloudProducts = isSupabaseConfigured()
      ? publicCatalog.map(item => {
        const specifications = sanitizePublicSpecifications(item.specifications) || {};
        const category = normalizeProductCategory(item.category || 'New Mobiles');
        const isUsed = category === 'Used Mobiles';
        const isAppliance = category === 'Home Appliances';
        const isAccessory = category === 'Mobile Accessories';
        const price = getProductSellingPrice(item);
        return {
          id: item.id,
          name: item.name,
          category,
          department: isAppliance ? 'appliances' : (isAccessory ? 'accessories' : 'mobiles'),
          brand: item.brand || item.name.split(' ')[0],
          price,
          mrp: Number(item.mrp) || price,
          discountPct: item.mrp > price ? Math.round(((item.mrp - price) / item.mrp) * 100) : 0,
          stock: 1,
          condition: item.offer_text || (isUsed ? 'Certified Refurbished' : 'In-Store Stock'),
          warranty: isUsed ? '15 Days ALZINO Testing Warranty' : 'Ask in store for warranty details',
          rack: '',
          bin: '',
          deliveryTime: 'Counter pickup / Bodhan delivery',
          specs: '',
          specifications,
          description: item.description || '',
          ram: specifications.ram || '',
          storage: specifications.storage || '',
          capacity: specifications.capacity || '',
          color: specifications.color || '',
          image: item.image_url || null,
          type: isUsed ? 'refurbished' : (isAppliance ? 'appliance' : (isAccessory ? 'accessory' : 'new'))
        };
      })
      : [];

    const list = [];
    const seenVouchers = new Set();
    const seenImeis = new Set();
    const seenNames = new Set();

    // 1. Add active inventory items
    if (inventory && inventory.length > 0) {
      inventory.forEach(item => {
        const cleanName = (item.name || '').replace(/^sSamsung/i, 'Samsung');
        if ((Number(item.stock) || 0) <= 0 || getProductSellingPrice(item) <= 0 || item.isPublished === false || item.status === 'Archived') return;
        if (item.kycRef) seenVouchers.add(item.kycRef);
        if (item.imeis && Array.isArray(item.imeis)) item.imeis.forEach(im => seenImeis.add(im));
        if (item.imei1) seenImeis.add(item.imei1);

        const normalizedCategory = normalizeProductCategory(item.category);
        const isUsedMobile = isUsedMobileProduct(item);

        const isAppliance = !isUsedMobile && (item.category === 'Home Appliances' || 
                            (cleanName && (cleanName.toLowerCase().includes('tv') || 
                                           cleanName.toLowerCase().includes('ac') || 
                                           cleanName.toLowerCase().includes('cooler') || 
                                           cleanName.toLowerCase().includes('washing machine') || 
                                           cleanName.toLowerCase().includes('fridge'))));

        const isAccessory = !isUsedMobile && (item.category === 'Mobile Accessories' && 
                            !cleanName.toLowerCase().includes('galaxy') && 
                            !cleanName.toLowerCase().includes('iphone'));

        const department = isAppliance ? 'appliances' : (isAccessory ? 'accessories' : 'mobiles');
        const agingDays = getAgingDays(item);
        const hasOffer = item.offer && item.offer.pct > 0;
        const sellPrice = getProductSellingPrice(item);
        const regularPrice = firstPositiveAmount(item.offer?.regularPrice, item.mrp, Math.round(sellPrice * 1.08));
        const discount = regularPrice > sellPrice ? Math.round(((regularPrice - sellPrice) / regularPrice) * 100) : 0;

        let condition = isUsedMobile
          ? (item.condition || 'Certified Refurbished (15-Day Testing Warranty)')
          : 'In-Store Stock';
        if (!isUsedMobile) {
          if (hasOffer) {
            condition = cleanBadgeText(item.offer.label || `Special Deal (${item.offer.pct}% Off)`);
          } else if (agingDays >= 60) {
            condition = `Clearance Deal (${discount}% Off)`;
          } else if (discount > 5) {
            condition = `${discount}% OFF Deal`;
          }
        }

        const itemType = isUsedMobile ? 'refurbished' : (isAppliance ? 'appliance' : (isAccessory ? 'accessory' : 'new'));

        list.push({
          id: item.id,
          name: cleanName,
          category: isUsedMobile ? 'Used Mobiles' : (normalizedCategory || (isAppliance ? 'Home Appliances' : (isAccessory ? 'Mobile Accessories' : 'New Mobiles'))),
          department,
          brand: item.brand || cleanName.split(' ')[0] || (isUsedMobile ? 'Refurbished' : 'Samsung'),
          price: sellPrice,
          mrp: regularPrice,
          discountPct: discount,
          stock: Number(item.stock) || 0,
          condition,
          warranty: item.warranty || (isUsedMobile ? '15 Days ALZINO Testing Warranty' : '1 Year Official Manufacturer Warranty'),
          rack: item.rack || (isUsedMobile ? 'R-02' : 'R-01'),
          bin: item.bin || (isUsedMobile ? 'B-04' : 'B-01'),
          deliveryTime: isAppliance ? 'Same-Day Bodhan' : 'Instant Counter Pickup / Delivery',
          specs: item.description || (isUsedMobile ? (item.condition || 'Tested 24-Point Diagnostic QC Check') : 'Genuine Bodhan In-Store Stock • Official GST Bill'),
          specifications: item.specifications || {},
          description: item.description || '',
          ram: item.ram || '',
          storage: item.storage || '',
          capacity: item.capacity || '',
          color: item.color || '',
          image: item.image || item.frontImage || null,
          images: item.images || null,
          type: itemType
        });
      });
    }

    // 2. Add refurbished purchases if in-stock and not already in inventory
    if (usedPurchases && usedPurchases.length > 0) {
      usedPurchases.forEach(item => {
        if (item.status !== 'Sold' && item.status !== 'Archived') {
          if (item.voucherNo && seenVouchers.has(item.voucherNo)) return;
          if (item.imei1 && seenImeis.has(item.imei1)) return;
          if (item.id && inventory.some(i => i.id === item.id)) return;

          const buyP = Number(item.buyPrice || item.purchasePrice || 0);
          const sellP = getProductSellingPrice(item, buyP > 0 ? Math.round(buyP * 1.18) : 0);
          const mrpVal = Number(item.mrp || (sellP > 0 ? Math.round(sellP * 1.1) : 0));
          const disc = mrpVal > sellP ? Math.round(((mrpVal - sellP) / mrpVal) * 100) : 0;
          const uColor = item.color ? ` (${item.color})` : '';
          const uName = item.name || `Used ${item.brand || ''} ${item.model || ''}${uColor}`.trim();
          const normalizedName = uName.toLowerCase();
          if (seenNames.has(normalizedName)) return;
          seenNames.add(normalizedName);

          list.push({
            id: item.id || `USED-${item.voucherNo || Math.random()}`,
            name: uName,
            category: 'Used Mobiles',
            department: 'mobiles',
            brand: item.brand || 'Refurbished',
            price: sellP,
            mrp: mrpVal,
            discountPct: disc,
            stock: 1,
            condition: item.condition || `Certified Grade A+ (${disc}% Off)`,
            batteryHealth: item.batteryHealth ? `${item.batteryHealth}%` : '90%+',
            warranty: item.warranty || '15 Days ALZINO Testing Warranty',
            rack: item.rack || 'R-02',
            bin: item.bin || 'B-04',
            deliveryTime: 'Same-Day Bodhan',
            specs: `IMEI: ${item.imei1 ? item.imei1.slice(0, 8) + '...' : 'Verified'} • Tested 24-Point Diagnostic Check`,
            specifications: item.specifications || {},
            description: item.description || '',
            ram: item.ram || '',
            storage: item.storage || '',
            capacity: item.capacity || '',
            color: item.color || '',
            image: item.image || (item.deviceImages && item.deviceImages[0]) || null,
            images: item.images || null,
            type: 'refurbished'
          });
        }
      });
    }

    const localIds = new Set(list.map(item => String(item.id)));
    const uniqueProducts = new Map();
    [...list, ...cloudProducts.filter(item => !localIds.has(String(item.id)))].forEach(item => {
      const id = String(item.id);
      if (!uniqueProducts.has(id)) uniqueProducts.set(id, item);
    });
    return [...uniqueProducts.values()];
  }, [inventory, usedPurchases, publicCatalog]);

  // Cart Quantities & Helpers
  const addToCart = (product) => {
    setCart(prev => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
  };

  // QR links open this public storefront directly. Resolve the product after
  // inventory loads, add one unit to the cart, and show its product details.
  useEffect(() => {
    if (typeof window === 'undefined' || liveProducts.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const scanCode = params.get('product') || params.get('scan') || params.get('code');
    if (!scanCode || handledScanRef.current === scanCode) return;
    const shouldAddToCart = params.get('addToCart') === '1';
    const found = findProductFromScan(scanCode, liveProducts) || findProductFromScan(scanCode, inventory);
    if (!found) return;

    const product = liveProducts.find(item => String(item.id) === String(found.id)) || found;
    handledScanRef.current = scanCode;
    if (shouldAddToCart) addToCart(product);
    setSelectedProductModal(product);
    if (shouldAddToCart) {
      setScanAddedNotice(`${product.name} added to your cart`);
      window.setTimeout(() => setScanAddedNotice(''), 4000);
    }
    params.delete('product');
    params.delete('scan');
    params.delete('code');
    params.delete('addToCart');
    const nextQuery = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`);
  }, [liveProducts, inventory]);

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
      if (selectedCategory === 'smartphones') {
        const isSmart = (item.department === 'mobiles' || item.category === 'New Mobiles') && 
                        item.type !== 'refurbished' && 
                        item.category !== 'Mobile Accessories';
        if (!isSmart) return false;
      }
      if (selectedCategory === 'used-mobiles' && item.category !== 'Used Mobiles' && item.type !== 'refurbished') return false;
      if (selectedCategory === 'audio') {
        const name = (item.name || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const isAudio = name.includes('airdopes') || name.includes('earbuds') || name.includes('airpods') || 
                        name.includes('buds') || name.includes('headphone') || name.includes('earphone') || 
                        name.includes('neckband') || cat.includes('audio');
        if (!isAudio) return false;
      }
      if (selectedCategory === 'chargers') {
        const name = (item.name || '').toLowerCase();
        const isCharger = name.includes('charger') || name.includes('adapter') || name.includes('supervooc') || 
                          name.includes('power bank') || name.includes('powerbank') || name.includes('gan') || 
                          name.includes('cable');
        if (!isCharger) return false;
      }
      if (selectedCategory === 'wearables') {
        const name = (item.name || '').toLowerCase();
        const isWatch = name.includes('watch') || name.includes('colorfit') || name.includes('smartwatch');
        if (!isWatch) return false;
      }
      if (selectedCategory === 'protection') {
        const name = (item.name || '').toLowerCase();
        const isProt = name.includes('glass') || name.includes('case') || name.includes('guard') || 
                       name.includes('cover') || name.includes('tempered') || name.includes('magsafe');
        if (!isProt) return false;
      }
      if (selectedCategory === 'appliances') {
        const isAppliance = item.department === 'appliances' || item.category === 'Home Appliances';
        if (!isAppliance) return false;
      }
      if (selectedCategory === 'refurbished') {
        if (item.type !== 'refurbished' && item.category !== 'Used Mobiles') return false;
      }
      if (selectedCategory.startsWith('category:')) {
        const category = selectedCategory.slice('category:'.length);
        if (normalizeProductCategory(item.category).toLowerCase() !== normalizeProductCategory(category).toLowerCase()) return false;
      }
      if (selectedCategory === 'accessories') {
        if (item.department !== 'accessories' && item.category !== 'Mobile Accessories') return false;
      }
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
  const fixedCategories = [
    { id: 'all', label: 'All Products', icon: LayoutGrid },
    { id: 'smartphones', label: 'Smartphones & 5G', icon: Smartphone },
    { id: 'used-mobiles', label: 'Used Mobiles', icon: RefreshCw },
    { id: 'audio', label: 'Earbuds & Audio', icon: Headphones },
    { id: 'chargers', label: 'Fast Chargers & Cables', icon: Cable },
    { id: 'wearables', label: 'Smartwatches', icon: Watch },
    { id: 'protection', label: 'Glass & Cases', icon: ShieldCheck },
    { id: 'refurbished', label: 'Certified Refurbished', icon: RefreshCw },
    { id: 'appliances', label: '4K TVs & Appliances', icon: Tv },
    { id: 'clearance', label: 'Clearance Hub', icon: Flame },
  ];
  const coveredCategories = new Set(['new mobiles', 'used mobiles', 'home appliances', 'mobile accessories']);
  const dynamicCategories = getAvailableCategories(liveProducts)
    .filter(category => !coveredCategories.has(category.trim().toLowerCase()))
    .map(category => ({ id: `category:${category}`, label: category, icon: Package, productCategory: category }));
  const categoriesList = [...fixedCategories, ...dynamicCategories];

  // Category item counts for badges
  const categoryCounts = useMemo(() => {
    const counts = { all: liveProducts.length };
    categoriesList.forEach(cat => {
      if (cat.id === 'all') return;
      counts[cat.id] = liveProducts.filter(item => {
        const cleanName = (item.name || '').toLowerCase();
        if (cat.id === 'smartphones') return (item.department === 'mobiles' || item.category === 'New Mobiles') && item.type !== 'refurbished';
        if (cat.id === 'used-mobiles') return item.type === 'refurbished' || item.category === 'Used Mobiles';
        if (cat.id === 'audio') return cleanName.includes('earbuds') || cleanName.includes('airpods') || cleanName.includes('airdopes') || cleanName.includes('audio') || cleanName.includes('headphone');
        if (cat.id === 'chargers') return cleanName.includes('charger') || cleanName.includes('adapter') || cleanName.includes('cable') || cleanName.includes('power bank');
        if (cat.id === 'wearables') return cleanName.includes('watch') || cleanName.includes('band') || cleanName.includes('pulse');
        if (cat.id === 'protection') return cleanName.includes('glass') || cleanName.includes('case') || cleanName.includes('cover') || cleanName.includes('armor');
        if (cat.id === 'appliances') return item.type === 'appliance' || item.department === 'appliances' || item.category === 'Home Appliances';
        if (cat.id === 'refurbished') return item.type === 'refurbished' || item.category === 'Used Mobiles';
        if (cat.id === 'clearance') return (item.discountPct && item.discountPct >= 10) || (item.condition && (item.condition.includes('Clearance') || item.condition.includes('Deal')));
        if (cat.productCategory) return normalizeProductCategory(item.category).toLowerCase() === normalizeProductCategory(cat.productCategory).toLowerCase();
        return false;
      }).length;
    });
    return counts;
  }, [liveProducts, categoriesList]);

  const handleWhatsAppCheckout = () => {
    const targetPhone = '919121212292'; // Destination: 9121212292
    let message = `Namaste ALZINO Bodhan! 👋\n\n`;
    message += `I am enquiring from your store website about the following *${cartCount} item(s)* in my cart:\n\n`;
    message += `🛍️ *PRODUCTS ENQUIRED:*\n`;

    cartItems.forEach((item, index) => {
      const itemTotal = (item.price * item.qty).toLocaleString('en-IN');
      const itemMrp = item.mrp ? ` (Box MRP: ₹${(item.mrp * item.qty).toLocaleString('en-IN')})` : '';
      const itemSavings = (item.mrp && item.mrp > item.price) ? (item.mrp - item.price) * item.qty : 0;
      const savingsText = itemSavings > 0 ? ` [Save ₹${itemSavings.toLocaleString('en-IN')}]` : '';

      message += `\n*${index + 1}. ${item.name}*\n`;
      message += `   • Quantity: *${item.qty}*\n`;
      message += `   • Special Price: *₹${itemTotal}*${itemMrp}${savingsText}\n`;
      
      const details = [];
      if (item.brand) details.push(`Brand: ${item.brand}`);
      if (item.category) details.push(`Category: ${item.category}`);
      if (item.ram || item.storage) details.push(`Spec: ${[item.ram, item.storage].filter(Boolean).join('/')}`);
      if (item.color) details.push(`Colour: ${item.color}`);
      if (details.length > 0) {
        message += `   • Specs: ${details.join(' • ')}\n`;
      }

      if (item.warranty) {
        message += `   • Warranty: ${item.warranty}\n`;
      }
    });

    message += `\n-----------------------------------\n`;
    message += `📦 *Total Items:* ${cartCount} unit(s)\n`;
    message += `💰 *Total Enquired Amount:* ₹${cartTotal.toLocaleString('en-IN')}\n`;
    if (cartSavings > 0) {
      message += `🎉 *Total Savings:* ₹${cartSavings.toLocaleString('en-IN')}\n`;
    }
    message += `-----------------------------------\n\n`;

    if (customerName.trim() || customerPhone.trim()) {
      message += `👤 *Customer Name:* ${customerName.trim() || 'Walk-in Customer'}\n`;
      if (customerPhone.trim()) message += `📱 *Phone:* ${customerPhone.trim()}\n\n`;
    }

    message += `Please confirm stock availability and best counter deal for me at your Old Bus Stand, Bodhan, Nizamabad, Telangana – 503185 showroom. Thank you! 🙏`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSingleWhatsAppInquiry = (product) => {
    // Client inquiry number: 9121212292 -> WhatsApp format: 919121212292
    const targetPhone = '919121212292';
    const priceFormatted = `₹${(product.price || 0).toLocaleString('en-IN')}`;
    const mrpFormatted = product.mrp && product.mrp > product.price ? ` (Box MRP: ₹${product.mrp.toLocaleString('en-IN')})` : '';
    const savings = (product.mrp && product.mrp > product.price) ? product.mrp - product.price : 0;
    const discountText = product.discountPct > 0 ? ` [${product.discountPct}% OFF • Save ₹${savings.toLocaleString('en-IN')}]` : '';
    
    // Extract variant attributes
    const variantParts = [];
    if (product.brand) variantParts.push(`Brand: ${product.brand}`);
    if (product.category) variantParts.push(`Category: ${product.category}`);
    if (product.ram || product.storage) variantParts.push(`Spec: ${[product.ram, product.storage].filter(Boolean).join('/')}`);
    if (product.color) variantParts.push(`Colour: ${product.color}`);

    const variantText = variantParts.length > 0 ? `\n⚙️ *Details:* ${variantParts.join(' • ')}` : '';
    const warrantyText = `\n🛡️ *Warranty:* ${product.warranty || '1 Year Official Brand Warranty'}`;

    const message = `Namaste ALZINO Mobiles & Home Appliances Bodhan! 👋\n\n` +
      `I am enquiring from your store website about this product:\n\n` +
      `📱 *Product:* ${product.name}` +
      `${variantText}\n` +
      `💰 *Special Online Price:* ${priceFormatted}${mrpFormatted}${discountText}` +
      `${warrantyText}\n\n` +
      `Please let me know if this is available for instant pickup/delivery at Old Bus Stand, Bodhan, Nizamabad, Telangana – 503185. Thank you!`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F4F6F8',
      color: '#1A1C1E',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      paddingBottom: '5.25rem'
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
          <div className="storefront-brand-location-group" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
            {/* Logo */}
            <div 
              onClick={() => { setSelectedCategory('all'); setSearchTerm(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}
            >
              <AlzinoLogo height={28} textColor="#0C5B43" swooshColor="#EAB308" />
            </div>
            <div className="storefront-mobile-contact-actions" aria-label="Contact ALZINO">
              <a
                href={storeWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="storefront-mobile-whatsapp-link"
                aria-label="Chat with ALZINO on WhatsApp"
                title="Chat with ALZINO on WhatsApp"
              >
                <WhatsAppIcon size={20} color="#FFFFFF" />
              </a>
              <a
                href={`tel:${storePhoneHref}`}
                className="storefront-mobile-call-link"
                aria-label={`Call ALZINO at ${storePhoneLabel}`}
                title={`Call ALZINO at ${storePhoneLabel}`}
              >
                <Phone size={16} aria-hidden="true" />
                <span>{storePhoneLabel}</span>
              </a>
            </div>
          </div>

          {/* Quick-Commerce Omnibox Search Bar */}
          <div className="storefront-search-bar" style={{ flex: 1, maxWidth: '620px', position: 'relative' }}>
            <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder='Search "iPhone 15", "OnePlus 80W Charger", "boAt Earbuds", "4K TV"...'
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
                  right: '90px',
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
            <button
              type="button"
              onClick={() => setIsStorefrontScannerOpen(true)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#0F251E',
                border: 'none',
                color: '#6EE7B7',
                borderRadius: '8px',
                padding: '4px 9px',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 6px rgba(15, 37, 30, 0.2)'
              }}
              title="Scan Product Box QR Code / Barcode"
            >
              <Camera size={13} />
              <span>Scan QR</span>
            </button>
          </div>

          {/* Right: Quick Action Controls + Cart Button */}
          <div className="storefront-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
            {/* Locate Us (Google Maps) */}
            <a 
              href={shopConfig.mapsUrl || "https://www.google.com/maps/search/?api=1&query=Old+Bus+Stand%2C+Bodhan%2C+Nizamabad%2C+Telangana+503185"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                border: '1.5px solid #FCD34D',
                borderRadius: '10px',
                padding: '0.55rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Locate ALZINO Flagship Showroom on Google Maps"
            >
              <Navigation size={15} color="#D97706" />
              <span>Locate Us</span>
            </a>

            {/* Rate Us on Google */}
            <a 
              href={shopConfig.reviewUrl || "https://g.page/r/CWxRHXGDCdZ7EBM/review"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#FFFBEB',
                color: '#B45309',
                border: '1.5px solid #FDE68A',
                borderRadius: '10px',
                padding: '0.55rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Leave a 5-Star Review for ALZINO Bodhan on Google"
            >
              <Star size={15} color="#F59E0B" fill="#F59E0B" />
              <span>Rate Us</span>
            </a>

            <a 
              href={`tel:${(shopConfig.phone || '9121212292').replace(/[^0-9]/g, '')}`}
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
      </header>

      {/* ========================================================================= */}
      {/* 2. PROMOTIONAL HERO VALUE PROPOSITIONS (ANIMATED ROTATING SHOWCASE) */}
      {/* ========================================================================= */}
      <section style={{ maxWidth: '1280px', margin: '1.25rem auto 0', padding: '0 1rem' }}>
        <style>{`
          .storefront-desktop-promo-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.85rem;
          }
          .storefront-mobile-promo-slider {
            display: none;
          }
          .storefront-products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
            gap: 1rem;
          }
          @media (max-width: 900px) {
            .storefront-desktop-promo-grid {
              display: none !important;
            }
            .storefront-mobile-promo-slider {
              display: block !important;
            }
          }
          .storefront-mobile-category-select, .storefront-mobile-bottom-nav, .storefront-mobile-more-menu { display: none; }
          .storefront-mobile-contact-actions { display: none; }
          @media (max-width: 768px) {
            .storefront-search-bar, .storefront-header-actions { display: none !important; }
            .storefront-brand-location-group { flex: 1; justify-content: space-between; gap: 0.45rem !important; min-width: 0; }
            .storefront-mobile-contact-actions { display: flex !important; align-items: center; gap: 0.4rem; flex-shrink: 0; }
            .storefront-mobile-whatsapp-link { width: 36px; height: 36px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: #25D366; color: #FFFFFF; text-decoration: none; box-shadow: 0 2px 6px rgba(37,211,102,0.25); }
            .storefront-mobile-call-link { min-height: 36px; padding: 0 0.5rem; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; background: #F3F4F6; color: #0C5B43; text-decoration: none; font-size: 0.7rem; line-height: 1; font-weight: 800; white-space: nowrap; }
            .storefront-mobile-category-select { display: block !important; width: 100%; margin-bottom: 0.75rem; padding: 0.7rem 0.8rem; border: 1px solid #D1D5DB; border-radius: 10px; background: #FFFFFF; color: #1F2937; font-size: 0.9rem; font-weight: 700; }
            .storefront-category-pills { display: none !important; }
            .storefront-mobile-bottom-nav { display: flex !important; }
            .storefront-mobile-more-menu { display: block; }
            .storefront-cart-cta { bottom: 70px !important; }
            .storefront-catalog-section {
              padding: 0.75rem 0.5rem !important;
              margin: 1.25rem auto 2.5rem !important;
              background-color: #F1EFE5 !important;
              border-radius: 12px;
            }
            .storefront-products-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 0.5rem !important;
            }
            .storefront-card {
              padding: 0.55rem 0.5rem !important;
              border-radius: 12px !important;
            }
            .storefront-card-top-badges {
              margin-bottom: 0.3rem !important;
            }
            .storefront-card-badge {
              font-size: 0.58rem !important;
              padding: 0.1rem 0.32rem !important;
            }
            .storefront-card-img-box {
              height: 125px !important;
              padding: 0.25rem !important;
              margin-bottom: 0.35rem !important;
            }
            .storefront-card-img {
              max-height: 115px !important;
            }
            .storefront-card-brand {
              font-size: 0.62rem !important;
            }
            .storefront-card-rating {
              font-size: 0.58rem !important;
              padding: 0.08rem 0.28rem !important;
            }
            .storefront-card-title {
              font-size: 0.78rem !important;
              line-height: 1.25 !important;
              min-height: 1.95rem !important;
              margin-bottom: 0.15rem !important;
            }
            .storefront-card-specs {
              font-size: 0.62rem !important;
              margin-bottom: 0.25rem !important;
            }
            .storefront-card-rack {
              display: none !important;
            }
            .storefront-card-price-row {
              margin-bottom: 0.35rem !important;
              padding-top: 0.4rem !important;
            }
            .storefront-card-price {
              font-size: 1.02rem !important;
            }
            .storefront-card-mrp {
              font-size: 0.65rem !important;
            }
            .storefront-card-save {
              font-size: 0.55rem !important;
              padding: 0.08rem 0.24rem !important;
            }
            .storefront-card-actions {
              gap: 0.3rem !important;
            }
            .storefront-card-btn {
              padding: 0.4rem 0.15rem !important;
              font-size: 0.68rem !important;
              border-radius: 6px !important;
            }
          }
        `}</style>

        {/* Desktop View: All 3 Cards Displayed Simultaneously Side-by-Side */}
        <div className="storefront-desktop-promo-grid">
          {promoBanners.map((b) => (
            <div
              key={b.id}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '14px',
                background: b.gradient,
                color: '#FFFFFF',
                boxShadow: `0 6px 18px ${b.glowColor}`,
                padding: '1.2rem 1.35rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
                transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 10px 24px ${b.glowColor}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 6px 18px ${b.glowColor}`;
              }}
            >
              <div>
                <h3 style={{
                  fontSize: '1.12rem',
                  fontWeight: 900,
                  margin: '0 0 0.3rem',
                  lineHeight: 1.25
                }}>
                  {b.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: b.textColor,
                  lineHeight: 1.38
                }}>
                  {b.desc}
                </p>
              </div>
              <div style={{
                fontSize: '2.6rem',
                lineHeight: 1,
                opacity: 0.95,
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
                flexShrink: 0
              }}>
                {b.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile View: Rotating Showcase Slider */}
        <div className="storefront-mobile-promo-slider">
          <div 
            onMouseEnter={() => setIsBannerHovered(true)}
            onMouseLeave={() => setIsBannerHovered(false)}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '16px',
              background: currentBanner.gradient,
              color: '#FFFFFF',
              boxShadow: `0 8px 24px ${currentBanner.glowColor}`,
              minHeight: '115px',
              transition: 'background 0.4s ease, box-shadow 0.4s ease'
            }}
          >
            {/* Animated Card Content */}
            <div style={{
              padding: '1.25rem 1.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              opacity: bannerAnimPhase === 'visible' ? 1 : 0,
              transform: bannerAnimPhase === 'visible' 
                ? 'translateY(0) scale(1)' 
                : (bannerAnimPhase === 'entering' ? 'translateY(24px) scale(0.97)' : 'translateY(-24px) scale(0.97)'),
              transition: 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.38s ease'
            }}>
              <div>
                <h3 style={{ 
                  fontSize: '1.22rem', 
                  fontWeight: 900, 
                  margin: '0 0 0.3rem',
                  lineHeight: 1.2
                }}>
                  {currentBanner.title}
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.82rem', 
                  color: currentBanner.textColor,
                  lineHeight: 1.38
                }}>
                  {currentBanner.desc}
                </p>
              </div>

              {/* Giant Icon Visual */}
              <div style={{ 
                fontSize: '3rem', 
                lineHeight: 1,
                filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.18))',
                transform: bannerAnimPhase === 'visible' ? 'scale(1)' : 'scale(0.8)',
                transition: 'transform 0.38s ease',
                flexShrink: 0
              }}>
                {currentBanner.icon}
              </div>
            </div>

            {/* Progress Countdown Bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '3px',
              backgroundColor: 'rgba(255,255,255,0.85)',
              width: bannerAnimPhase === 'visible' && !isBannerHovered ? '100%' : '0%',
              transition: bannerAnimPhase === 'visible' && !isBannerHovered ? 'width 3.8s linear' : 'none'
            }} />
          </div>

          {/* Minimal Indicator Dots Below Mobile Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            marginTop: '0.65rem'
          }}>
            {promoBanners.map((b, idx) => {
              const isActive = activeBannerIdx === idx;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setActiveBannerIdx(idx);
                    setBannerAnimPhase('visible');
                  }}
                  aria-label={`Slide ${idx + 1}`}
                  style={{
                    width: isActive ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '999px',
                    backgroundColor: isActive ? '#059669' : '#D1D5DB',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PRODUCT CATALOG GRID WITH QUICK-COMMERCE CATEGORY PILLS */}
      {/* ========================================================================= */}
      <section className="storefront-catalog-section" style={{ maxWidth: '1280px', margin: '1.5rem auto 3rem', padding: '1rem', backgroundColor: '#F1EFE5', borderRadius: '16px' }}>
        {/* Mobile category dropdown */}
        <select className="storefront-mobile-category-select" aria-label="Filter products by category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} id="storefront-mobile-category">
          {categoriesList.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}{categoryCounts[cat.id] !== undefined ? ' (' + categoryCounts[cat.id] + ')' : ''}</option>)}
        </select>
        {/* Category Filter Pills (Placed Above Product Listing) */}
        <div className="storefront-category-pills" style={{
          marginBottom: '1.25rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          paddingBottom: '0.35rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {categoriesList.map(cat => {
              const isActive = selectedCategory === cat.id;
              const Icon = cat.icon;
              const count = categoryCounts[cat.id];
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    backgroundColor: isActive ? '#0C5B43' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#374151',
                    border: `1.5px solid ${isActive ? '#0C5B43' : '#E5E7EB'}`,
                    padding: '0.48rem 0.95rem',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: isActive ? '0 2px 8px rgba(12, 91, 67, 0.25)' : '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <Icon size={14} color={isActive ? '#FFFFFF' : '#0C5B43'} />
                  <span>{cat.label}</span>
                  {count !== undefined && (
                    <span style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
                      color: isActive ? '#FFFFFF' : '#6B7280',
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      padding: '0.08rem 0.35rem',
                      borderRadius: '999px'
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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
               selectedCategory === 'smartphones' ? 'Smartphones & 5G Flagships' : 
               selectedCategory === 'audio' ? 'Wireless Earbuds, TWS & Audio' :
               selectedCategory === 'chargers' ? 'Fast Adapters, GaN Chargers & Cables' :
               selectedCategory === 'wearables' ? 'Smartwatches & Fitness Bands' :
               selectedCategory === 'protection' ? '9D Tempered Glass & Shockproof Cases' :
               selectedCategory === 'refurbished' ? 'Certified Pre-Owned & Refurbished' : 
               selectedCategory === 'clearance' ? 'Old-Stock Clearance Deals' : 
               'Fresh In-Store Showroom Inventory'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
              {filteredProducts.length} items available right now at Old Bus Stand, Bodhan, Nizamabad, Telangana – 503185
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
            borderRadius: '14px',
            border: '1px dashed #D1D5DB'
          }}>
            <Package size={48} color="#9CA3AF" style={{ marginBottom: '0.85rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#111827' }}>
              No items match current filter
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', maxWidth: '380px', margin: '0.4rem auto 1.25rem' }}>
              We receive new smartphone stock, accessories and home appliances daily at our Bodhan counter.
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
          <div className="storefront-products-grid">
            {filteredProducts.map(prod => {
              const qtyInCart = cart[prod.id] || 0;
              const savings = (prod.mrp && prod.mrp > prod.price) ? prod.mrp - prod.price : 0;

              return (
                <div
                  key={prod.id}
                  className="storefront-card"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '14px',
                    border: '1px solid #E5E7EB',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                >
                  <div>
                    {/* Top Badges (Discount Pill in Gold with 5-Second Shining Sweep) */}
                    <div className="storefront-card-top-badges" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.45rem', minHeight: '1.25rem' }}>
                      {prod.discountPct > 0 ? (
                        <span className="storefront-card-badge gold-discount-badge" style={{
                          fontSize: '0.65rem',
                          fontWeight: 850,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          {prod.discountPct}% OFF
                        </span>
                      ) : <span style={{ visibility: 'hidden' }}>&nbsp;</span>}
                    </div>

                    {/* Product Photo Showcase */}
                    <div 
                      onClick={() => setSelectedProductModal(prod)}
                      className="storefront-card-img-box"
                      style={{
                        height: '155px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: '0.45rem',
                        marginBottom: '0.6rem',
                        cursor: 'pointer',
                        border: '1px solid #F1F5F9'
                      }}
                      title="Click to view details & photos"
                    >
                      <ProductImageViewer
                        product={prod}
                        height={155}
                        placeholder={<div aria-label="No product photo" style={{ width: '100%', height: '100%' }} />}
                      />
                    </div>

                    {/* Brand & Category & Rating Pill */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span className="storefront-card-brand" style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0C5B43', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        {prod.brand}
                      </span>
                      <span className="storefront-card-rating" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.15rem',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        backgroundColor: '#FEF3C7',
                        color: '#B45309',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px'
                      }}>
                        <Star size={10} fill="#F59E0B" color="#F59E0B" />
                        <span>4.8</span>
                      </span>
                    </div>

                    {/* Product Title */}
                    <h3 
                      onClick={() => setSelectedProductModal(prod)}
                      className="storefront-card-title"
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
                    <div className="storefront-card-specs" style={{
                      fontSize: '0.7rem',
                      color: '#6B7280',
                      marginBottom: '0.45rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {prod.specs}
                    </div>

                    </div>

                  {/* Pricing Row & Blinkit/Zepto-Style Actions */}
                  <div style={{
                    borderTop: '1px solid #F3F4F6',
                    paddingTop: '0.65rem',
                    marginTop: '0.45rem',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    {/* Price & Savings Header */}
                    <div className="storefront-card-price-row" style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span className="storefront-card-price" style={{ fontSize: '1.18rem', fontWeight: 900, color: '#111827' }}>
                          ₹{prod.price.toLocaleString()}
                        </span>
                        {prod.mrp && prod.mrp > prod.price && (
                          <span className="storefront-card-mrp" style={{ fontSize: '0.72rem', color: '#9CA3AF', textDecoration: 'line-through' }}>
                            ₹{prod.mrp.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {savings > 0 && (
                        <span className="storefront-card-save" style={{
                          fontSize: '0.62rem',
                          color: '#DC2626',
                          fontWeight: 800,
                          backgroundColor: '#FEE2E2',
                          border: '1px solid #FECACA',
                          padding: '0.12rem 0.38rem',
                          borderRadius: '4px'
                        }}>
                          Save ₹{savings.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Quick Actions Grid: 50% Enquire + 50% ADD/Stepper (Fits 100% inside container) */}
                    <div className="storefront-card-actions" style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.45rem',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleWhatsAppInquiry(prod);
                        }}
                        title="Enquire on WhatsApp"
                        className="storefront-card-btn"
                        style={{
                          backgroundColor: '#25D366',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.45rem 0.25rem',
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.28rem',
                          boxShadow: '0 1px 3px rgba(37,211,102,0.25)',
                          transition: 'all 0.15s ease',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        <WhatsAppIcon size={13} color="#FFFFFF" />
                        <span>Enquire</span>
                      </button>

                      {/* Quick-Commerce Stepper ADD Button (Zepto / Instamart Style) */}
                      {qtyInCart > 0 ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#0C5B43',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          width: '100%',
                          boxSizing: 'border-box',
                          overflow: 'hidden'
                        }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCart(prod);
                            }}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#FFFFFF',
                              padding: '0.42rem 0.45rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flex: 1
                            }}
                          >
                            <Minus size={13} />
                          </button>
                          <span style={{ fontSize: '0.8rem', fontWeight: 900, padding: '0 0.15rem' }}>
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(prod);
                            }}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#FFFFFF',
                              padding: '0.42rem 0.45rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flex: 1
                            }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(prod);
                          }}
                          className="storefront-card-btn"
                          style={{
                            backgroundColor: '#FFFFFF',
                            color: '#0C5B43',
                            border: '1.5px solid #0C5B43',
                            borderRadius: '8px',
                            padding: '0.45rem 0.25rem',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.15s ease',
                            width: '100%',
                            boxSizing: 'border-box'
                          }}
                        >
                          <span>+ ADD</span>
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

                  {/* Optional Customer Contact for WhatsApp Enquiry */}
                  <div style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    border: '1px solid #E5E7EB',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <WhatsAppIcon size={14} color="#25D366" />
                      <span>Customer Details (Optional)</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
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
                        placeholder="Mobile Number"
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
                      <span>Total MRP Value ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
                      <span>₹{cartMrpTotal.toLocaleString()}</span>
                    </div>
                    {cartSavings > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: 700 }}>
                        <span>ALZINO Counter Discount</span>
                        <span>- ₹{cartSavings.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{
                      borderTop: '1px solid #E5E7EB',
                      paddingTop: '0.45rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      color: '#111827'
                    }}>
                      <span>Special Enquired Price</span>
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
                  <WhatsAppIcon size={18} color="#FFFFFF" />
                  <span>Enquire Cart on WhatsApp ({cartCount} {cartCount === 1 ? 'Item' : 'Items'} • ₹{cartTotal.toLocaleString()})</span>
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
        <div className="storefront-cart-cta" style={{
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
                backgroundColor: '#25D366',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.78rem',
                fontWeight: 900,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <WhatsAppIcon size={13} color="#FFFFFF" />
                <span>{cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}</span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900 }}>
                ₹{cartTotal.toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800 }}>
              <span>View & Enquire on WhatsApp</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. QUICK-SPECS & PHOTO PREVIEW MODAL */}
      {/* Full Product Specifications, Colours & Terms Modal */}
      {selectedProductModal && (
        <ProductScanDetailsModal
          product={selectedProductModal}
          inventory={inventory}
          isOpen={!!selectedProductModal}
          onClose={() => setSelectedProductModal(null)}
          onAddToCart={(prod) => {
            addToCart(prod);
            setIsCartOpen(true);
          }}
          shopConfig={shopConfig}
          role="customer"
        />
      )}

      {/* Camera Barcode / QR Scanner for Storefront */}
      {isStorefrontScannerOpen && (
        <CameraBarcodeScannerModal
          isOpen={isStorefrontScannerOpen}
          onClose={() => setIsStorefrontScannerOpen(false)}
          onScan={(scannedCode) => {
            setIsStorefrontScannerOpen(false);
            const matched = findProductFromScan(scannedCode, liveProducts) || findProductFromScan(scannedCode, inventory);
            if (matched) {
              const product = liveProducts.find(item => String(item.id) === String(matched.id)) || matched;
              addToCart(product);
              setSelectedProductModal(product);
              setScanAddedNotice(`${product.name} added to your cart`);
              window.setTimeout(() => setScanAddedNotice(''), 4000);
            } else {
              alert(`Product matching code "${scannedCode}" was not found in active inventory.`);
            }
          }}
          title="Scan Product Box QR Code / Barcode"
          description="Point camera at the QR code sticker on the phone box to inspect full specifications, available colours & terms"
        />
      )}

      <style>{'.storefront-mobile-bottom-nav{position:fixed;inset:auto 0 0;min-height:62px;z-index:1200;align-items:stretch;justify-content:space-around;gap:0;padding:.25rem .15rem max(.25rem,env(safe-area-inset-bottom));background:#fff;border-top:1px solid #E5E7EB;box-shadow:0 -4px 18px rgba(15,23,42,.12)}.storefront-mobile-bottom-nav button{position:relative;flex:1;min-width:0;border:0;background:transparent;color:#52606D;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.18rem;font-size:.62rem;font-weight:700}.storefront-mobile-bottom-nav button:active{color:#0C5B43}.storefront-mobile-more-menu{position:fixed;z-index:1201;bottom:68px;right:.5rem;width:min(220px,calc(100vw - 1rem));padding:.4rem;background:#fff;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 8px 28px rgba(15,23,42,.18)}.storefront-mobile-more-menu a{display:flex;align-items:center;gap:.6rem;padding:.7rem;color:#1F2937;text-decoration:none;font-size:.86rem;font-weight:700}'} </style>
      {scanAddedNotice && <div role="status" style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 2200, padding: '.7rem 1rem', borderRadius: '999px', background: '#0C5B43', color: '#fff', fontWeight: 800, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>{scanAddedNotice}</div>}
      <nav className="storefront-mobile-bottom-nav" aria-label="Mobile storefront navigation">
        <button type="button" onClick={() => { setSelectedCategory('all'); setSearchTerm(''); document.querySelector('.storefront-catalog-section')?.scrollIntoView({ behavior: 'smooth' }); }} aria-label="Home and all products">
          <Home size={19} /><span>Home</span>
        </button>
        <button type="button" onClick={() => { setIsMobileMoreOpen(false); setIsMobileCategoriesOpen(true); }} aria-label="Choose product category" aria-expanded={isMobileCategoriesOpen}>
          <LayoutGrid size={19} /><span>Categories</span>
        </button>
        <button type="button" onClick={() => setIsStorefrontScannerOpen(true)} aria-label="Scan QR code">
          <Camera size={19} /><span>Scan</span>
        </button>
        <button type="button" onClick={() => setIsCartOpen(true)} aria-label="Open cart">
          <ShoppingCart size={19} /><span>Cart</span>
        </button>
        <button type="button" onClick={() => setIsMobileMoreOpen((open) => !open)} aria-label="More store options" aria-expanded={isMobileMoreOpen}>
          <MoreHorizontal size={19} /><span>More</span>
        </button>
      </nav>
      {isMobileCategoriesOpen && <div
        role="presentation"
        onClick={() => setIsMobileCategoriesOpen(false)}
        style={{ position: 'fixed', inset: '0 0 62px', zIndex: 1201, display: 'flex', alignItems: 'flex-end', background: 'rgba(15, 23, 42, 0.38)' }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-categories-title"
          onClick={event => event.stopPropagation()}
          style={{ width: '100%', maxHeight: 'min(70vh, 560px)', overflowY: 'auto', padding: '1rem 0.9rem max(1rem, env(safe-area-inset-bottom))', boxSizing: 'border-box', background: '#FFFFFF', borderRadius: '18px 18px 0 0', boxShadow: '0 -8px 30px rgba(15, 23, 42, 0.18)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: '0.85rem' }}>
            <h2 id="mobile-categories-title" style={{ margin: 0, color: '#111827', fontSize: '1.05rem' }}>Choose a category</h2>
            <button type="button" onClick={() => setIsMobileCategoriesOpen(false)} aria-label="Close categories" style={{ border: 0, borderRadius: 999, width: 36, height: 36, display: 'grid', placeItems: 'center', background: '#F3F4F6', color: '#374151' }}><X size={19} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.55rem' }}>
            {categoriesList.map(category => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              return <button
                key={category.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setIsMobileCategoriesOpen(false);
                  window.setTimeout(() => document.querySelector('.storefront-catalog-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
                style={{ minHeight: 58, padding: '0.65rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.55rem', textAlign: 'left', border: `1px solid ${isActive ? '#0C5B43' : '#E5E7EB'}`, borderRadius: 12, background: isActive ? '#E8F3EE' : '#FFFFFF', color: isActive ? '#0C5B43' : '#263238', fontWeight: 750, fontSize: '0.78rem', lineHeight: 1.2, cursor: 'pointer' }}
              >
                <Icon size={19} aria-hidden="true" style={{ flex: '0 0 auto', color: '#0C5B43' }} />
                <span style={{ flex: 1 }}>{category.label}</span>
                {categoryCounts[category.id] !== undefined && <span style={{ flex: '0 0 auto', borderRadius: 999, padding: '0.12rem 0.38rem', background: isActive ? '#D0E8DC' : '#F3F4F6', color: '#52606D', fontSize: '0.67rem' }}>{categoryCounts[category.id]}</span>}
              </button>;
            })}
          </div>
        </section>
      </div>}
      {isMobileMoreOpen && <div className="storefront-mobile-more-menu" role="menu">
        <a role="menuitem" href={shopConfig.mapsUrl || 'https://www.google.com/maps/search/?api=1&query=Old+Bus+Stand%2C+Bodhan%2C+Nizamabad%2C+Telangana+503185'} target="_blank" rel="noopener noreferrer"><Navigation size={17} /> Locate store</a>
        <a role="menuitem" href={shopConfig.reviewUrl || 'https://g.page/r/CWxRHXGDCdZ7EBM/review'} target="_blank" rel="noopener noreferrer"><Star size={17} /> Rate us</a>
        <a role="menuitem" href={'tel:' + (shopConfig.phone || '9121212292').replace(/[^0-9]/g, '')}><Phone size={17} /> Call desk</a>
      </div>}

      {/* ========================================================================= */}
      {/* 8. REFINED CLEAN FOOTER WITH DISCREET STAFF ACCESS */}
      {/* ========================================================================= */}
      <footer className="storefront-footer" style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        padding: '2.5rem 1rem 1.5rem',
        fontSize: '0.8rem',
        color: '#6B7280'
      }}>
        <div className="storefront-footer-main" style={{
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
          <div className="storefront-footer-identity">
            <AlzinoLogo height={32} textColor="#0C5B43" swooshColor="#EAB308" />
            <div className="storefront-footer-business-info">
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1F2937' }}>
                Official Sales, Service & Accessories
              </div>
              <div>{shopConfig.address || 'Old Bus Stand, Bodhan, Nizamabad, Telangana – 503185'} • GSTIN: {shopConfig.gstin || '36AABCA1234M1Z8'}</div>
            </div>
          </div>
          <nav className="storefront-footer-social-links" aria-label="ALZINO social and store links">
            <a href={shopConfig.whatsappUrl || 'https://wa.me/919121212292'} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp">
              <WhatsAppIcon size={19} color="#15803D" />
            </a>
            <a href={shopConfig.instagramUrl || 'https://instagram.com/alzino.shop?rpxt=MXJscnloZGEyMmhiNw%3D%3D&utm_source=qr'} target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram">
              <InstagramIcon size={19} color="#BE185D" />
            </a>
            <a href={shopConfig.mapsUrl || 'https://www.google.com/maps/search/?api=1&query=Old+Bus+Stand%2C+Bodhan%2C+Nizamabad%2C+Telangana+503185'} target="_blank" rel="noopener noreferrer" aria-label="Locate ALZINO" title="Locate ALZINO">
              <MapPin size={19} color="#B45309" />
            </a>
            <a href={shopConfig.reviewUrl || 'https://g.page/r/CWxRHXGDCdZ7EBM/review'} target="_blank" rel="noopener noreferrer" aria-label="Review ALZINO" title="Review ALZINO">
              <Star size={19} color="#D97706" fill="#F59E0B" />
            </a>
          </nav>
        </div>

        <div style={{
          maxWidth: '1280px',
          margin: '1rem auto 0',
          textAlign: 'center',
          fontSize: '0.72rem',
          color: '#9CA3AF'
        }}>
          © {new Date().getFullYear()} {shopConfig.name || 'ALZINO'}. All Rights Reserved.
        </div>
      </footer>

    </div>
  );
}
