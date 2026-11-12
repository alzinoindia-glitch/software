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
import { firstPositiveAmount, getProductSellingPrice, isFeaturePhoneProduct, isSmartphoneProduct } from '../utils/storefrontProductRules';
import { getAvailableCategories, isUsedMobileProduct, normalizeProductCategory } from '../utils/customTaxonomy';

const getPublicProductFrontImageUrl = (organizationId, productId) => {
  const client = getSupabaseClient();
  if (!client || !organizationId || !productId) return null;
  const path = `${organizationId}/${productId}/front.jpg`;
  return client.storage.from('product-images').getPublicUrl(path).data?.publicUrl || null;
};

// Model photos are a last-resort storefront fallback for older catalog rows
// that have no saved photo in Storage. Prefer the product's own uploaded photo
// whenever one exists.
const getKnownProductImageFallback = product => {
  const name = `${product?.brand || ''} ${product?.name || ''} ${product?.model || ''} ${product?.color || ''}`.toLowerCase();
  if (/oppo.*a6s|a6s.*oppo/.test(name)) {
    if (/plum\s*purple|purple/.test(name)) return 'https://opsg-img-cdn-gl.heytapimg.com/epb/202603/10/ATKWjNX5OFSMmlH4.png';
    if (/aurora\s*gold|gold/.test(name)) return 'https://opsg-img-cdn-gl.heytapimg.com/epb/202603/10/lFrFr2dJltWRMqku.png';
    return 'https://www.oppo.com/content/dam/oppo_com/common/mkt/v2-2/a6-series/a6s-5g-in/product/purple-glod.png';
  }
  if (/realme.*p4x|p4x.*realme/.test(name)) {
    return 'https://rukminim2.flixcart.com/image/960/1280/xif0q/mobile/2/x/l/-original-imahgdr4xzbh4yhz.jpeg?q=60';
  }
  if (/realme.*p4\s*lite|p4\s*lite.*realme/.test(name)) {
    return 'https://image.rakuten.co.jp/cellux/cabinet/2026/realme/p4lite5g_1i.jpg';
  }
  if (/oppo.*a6x|a6x.*oppo/.test(name)) {
    return 'https://www.oppo.com/content/dam/oppo_com/oppo/product-asset-library/series-a/a6-series/a6x-5g-in/images/pc/colordetail.png';
  }
  return null;
};
import { sanitizePublicSpecifications } from '../utils/productSpecifications';

// The public catalog must always be scoped to exactly one tenant. This
// deployment ID comes from the product-images/<organization-id>/... object
// paths; SaaS deployments can set VITE_PUBLIC_ORGANIZATION_ID at build time.
const PUBLIC_ORGANIZATION_ID = import.meta.env.VITE_PUBLIC_ORGANIZATION_ID || '04d8b5ac-56a9-4f88-937c-85f36b2f88d7';

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
      const fetchAllPages = async columns => {
        const rows = [];
        const pageSize = 500;
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await client
            .from('catalog_products')
            .select(columns)
            .eq('organization_id', PUBLIC_ORGANIZATION_ID)
            .eq('is_published', true)
            .eq('stock_status', 'Available in store')
            .order('id', { ascending: true })
            .range(from, from + pageSize - 1);
          if (error) return { data: null, error };
          rows.push(...(data || []));
          if (!data || data.length < pageSize) return { data: rows, error: null };
        }
      };
      let { data, error } = await fetchAllPages('organization_id, id, name, brand, category, sell_price, mrp, stock_status, image_url, offer_text, specifications, description');
      // Keep existing storefront data available until the catalog migration is applied.
      if (error && /specifications|description|column/i.test(error.message || '')) {
        ({ data, error } = await fetchAllPages('organization_id, id, name, brand, category, sell_price, mrp, stock_status, image_url, offer_text'));
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
        const category = normalizeProductCategory(item.category || 'Universal');
        const isUsed = category === 'Used Mobiles';
        const isAppliance = category === 'Home Appliances';
        const isAccessory = /accessor/i.test(category);
        const isMobileCategory = ['New Mobiles', 'Used Mobiles', 'Tablets'].includes(category);
        const price = getProductSellingPrice(item);
        return {
          id: item.id,
          name: item.name,
          category,
          department: isAppliance ? 'appliances' : (isAccessory ? 'accessories' : (isMobileCategory ? 'mobiles' : 'other')),
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
          imageFallbacks: [
            getPublicProductFrontImageUrl(item.organization_id, item.id),
            getKnownProductImageFallback(item)
          ].filter(Boolean),
          type: isUsed ? 'refurbished' : (isAppliance ? 'appliance' : (isAccessory ? 'accessory' : (isMobileCategory ? 'new' : 'other')))
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

        const normalizedCategory = normalizeProductCategory(item.category || 'Universal');
        const isUsedMobile = isUsedMobileProduct(item);

        const isAppliance = !isUsedMobile && normalizedCategory === 'Home Appliances';
        const isAccessory = !isUsedMobile && /accessor/i.test(normalizedCategory);
        const isMobileCategory = isUsedMobile || ['New Mobiles', 'Used Mobiles', 'Tablets'].includes(normalizedCategory);

        const department = isAppliance ? 'appliances' : (isAccessory ? 'accessories' : (isMobileCategory ? 'mobiles' : 'other'));
        const agingDays = getAgingDays(item);
        const hasOffer = item.offer && item.offer.pct > 0;
        const sellPrice = getProductSellingPrice(it