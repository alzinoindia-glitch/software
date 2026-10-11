import React, { useState, useMemo, useEffect } from 'react';
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
  FileText,
  Headphones,
  Watch,
  LayoutGrid,
  Cable,
  RefreshCw
} from 'lucide-react';

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

export function getRealProductImage(product) {
  if (product?.image && typeof product.image === 'string' && product.image.startsWith('http')) {
    return product.image;
  }
  const name = (product?.name || '').toLowerCase();
  const brand = (product?.brand || '').toLowerCase();
  const cat = (product?.category || '').toLowerCase();

  // 1. AUDIO & WIRELESS EARBUDS (Check first before brand names!)
  if (name.includes('airdopes') || name.includes('earbuds') || name.includes('airpods') || name.includes('buds') || 
      name.includes('headphone') || name.includes('earphone') || name.includes('neckband') || name.includes('tws') || 
      cat.includes('audio') || (brand.includes('boat') && !name.includes('watch'))) {
    if (name.includes('airpods')) {
      return 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80';
  }

  // 2. CHARGERS, ADAPTERS, POWER BANKS & CABLES (Check before brand names!)
  if (name.includes('charger') || name.includes('adapter') || name.includes('supervooc') || name.includes('power bank') || 
      name.includes('powerbank') || name.includes('gan') || name.includes('cable') || name.includes('warp charge') || 
      name.includes('flash charge') || name.includes('type-c') || name.includes('lightning')) {
    if (name.includes('power bank') || name.includes('powerbank')) {
      return 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=800&auto=format&fit=crop&q=80';
    }
    if (name.includes('apple') || name.includes('20w')) {
      return 'https://images.unsplash.com/photo-1622445262464-84b14e32452e?w=800&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80';
  }

  // 3. SMARTWATCHES & WEARABLES (Check before brand names!)
  if (name.includes('watch') || name.includes('colorfit') || name.includes('noise') || name.includes('smartwatch') || name.includes('band')) {
    if (name.includes('apple watch')) {
      return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80';
  }

  // 4. SCREEN GUARDS & TEMPERED GLASS
  if (name.includes('tempered') || name.includes('glass') || name.includes('screen guard') || name.includes('protector') || name.includes('9d')) {
    return 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&auto=format&fit=crop&q=80';
  }

  // 5. CASES & COVERS
  if (name.includes('case') || name.includes('cover') || name.includes('silicon') || name.includes('magsafe') || name.includes('pouch')) {
    return 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&auto=format&fit=crop&q=80';
  }

  // 6. HOME APPLIANCES
  // Smart TVs
  if (name.includes('tv') || name.includes('television') || name.includes('bravia') || name.includes('oled') || name.includes('crystal 4k') || name.includes('led tv')) {
    if (name.includes('crystal') || name.includes('samsung')) {
      return 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80';
  }

  // AC / Air Conditioners
  if (name.includes(' ac') || name.includes('air conditioner') || name.includes('split ac') || name.includes('voltas') || name.includes('daikin') || name.includes('inverter ac')) {
    return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80';
  }

  // Washing Machines
  if (name.includes('washing machine') || name.includes('washer') || name.includes('dryer')) {
    return 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&auto=format&fit=crop&q=80';
  }

  // Air Coolers
  if (name.includes('cooler') || name.includes('symphony') || name.includes('diet 3d')) {
    return 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80';
  }

  // Refrigerators
  if (name.includes('fridge') || name.includes('refrigerator')) {
    return 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&auto=format&fit=crop&q=80';
  }

  // 7. CERTIFIED REFURBISHED / USED PHONES
  if (product?.type === 'refurbished' || cat.includes('used') || name.includes('used') || name.includes('refurbished')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80';
  }

  // 8. NEW SMARTPHONES BY BRAND
  // Apple iPhones
  if (name.includes('iphone') || (brand.includes('apple') && !cat.includes('accessories'))) {
    if (name.includes('15 pro')) {
      return 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80';
  }

  // Samsung Galaxy Flagships
  if (name.includes('galaxy') || name.includes('s24') || name.includes('s23') || name.includes('s22') || (brand.includes('samsung') && !cat.includes('appliance'))) {
    return 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=80';
  }

  // OnePlus
  if (name.includes('oneplus') || brand.includes('oneplus')) {
    return 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80';
  }

  // Vivo / Realme / Xiaomi / Redmi / Oppo / iQOO / Poco
  if (brand.includes('vivo') || brand.includes('realme') || brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('oppo') || brand.includes('iqoo') || brand.includes('poco')) {
    return 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80';
  }

  // Home Appliances fallback
  if (cat.includes('appliance') || product?.type === 'appliance') {
    return 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80';
  }

  // Default Smartphone image
  return 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80';
}


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

  // Curated showcase of Mobiles, Audio, Accessories & Home Appliances with 100% verified matching images
  const fallbackShowroomCatalog = [
    {
      id: 'SHOW-MOB-01',
      name: 'Samsung Galaxy S24 Ultra 5G (256GB - Titanium Gray)',
      category: 'New Mobiles',
      department: 'mobiles',
      brand: 'Samsung',
      price: 114999,
      mrp: 129999,
      stock: 4,
      condition: 'Flagship Deal',
      discountPct: 12,
      warranty: '1 Year Samsung India Official Warranty',
      specs: 'Snapdragon 8 Gen 3 • Galaxy AI • 200MP Quad Camera • S-Pen Included',
      rack: 'R-04',
      bin: 'B-12',
      deliveryTime: '15-30 Mins',
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=80',
      type: 'new'
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
      warranty: '1 Year Apple Official India Warranty',
      specs: 'A17 Pro Chip • Super Retina XDR • 48MP Pro System • Aerospace Titanium',
      rack: 'R-01',
      bin: 'B-01',
      deliveryTime: '15-30 Mins',
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
      type: 'new'
    },
    {
      id: 'SHOW-MOB-03',
      name: 'OnePlus 12R 5G (16GB RAM / 256GB - Cool Blue)',
      category: 'New Mobiles',
      department: 'mobiles',
      brand: 'OnePlus',
      price: 42999,
      mrp: 45999,
      stock: 6,
      condition: 'Featured Flagship',
      discountPct: 7,
      warranty: '1 Year Official OnePlus Warranty',
      specs: 'Snapdragon 8 Gen 2 • 1.5K 120Hz ProXDR • 100W SUPERVOOC • 5500mAh Battery',
      rack: 'R-02',
      bin: 'B-05',
      deliveryTime: '15-30 Mins',
      image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80',
      type: 'new'
    },
    {
      id: 'SHOW-MOB-04',
      name: 'Vivo V30 Pro 5G (512GB - Andaman Blue)',
      category: 'New Mobiles',
      department: 'mobiles',
      brand: 'Vivo',
      price: 41999,
      mrp: 46999,
      stock: 5,
      condition: 'ZEISS Portrait Master',
      discountPct: 11,
      warranty: '1 Year Vivo India Warranty',
      specs: 'ZEISS Professional Optics • 50MP Eye-AF Front • 80W FlashCharge • Slim Design',
      rack: 'R-03',
      bin: 'B-02',
      deliveryTime: '15-30 Mins',
      image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
      type: 'new'
    },
    {
      id: 'SHOW-MOB-05',
      name: 'Realme 12 Pro+ 5G (256GB - Submarine Blue)',
      category: 'New Mobiles',
      department: 'mobiles',
      brand: 'Realme',
      price: 29999,
      mrp: 34999,
      stock: 7,
      condition: 'Periscope Camera Deal',
      discountPct: 14,
      warranty: '1 Year Realme Official Warranty',
      specs: '64MP Periscope Portrait Camera • Snapdragon 7s Gen 2 • 120Hz Curved OLED',
      rack: 'R-03',
      bin: 'B-07',
      deliveryTime: '15-30 Mins',
      image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80',
      type: 'new'
    },
    {
      id: 'SHOW-REF-01',
      name: 'Apple iPhone 14 (128GB - Midnight Blue)',
      category: 'Used Mobiles',
      department: 'mobiles',
      brand: 'Apple',
      price: 44999,
      mrp: 69900,
      stock: 2,
      condition: 'Certified Grade A+',
      discountPct: 36,
      warranty: '6 Months ALZINO Comprehensive Hardware Warranty',
      specs: 'Battery Health 94% • A15 Bionic • Ceramic Shield • Tested 24-Point QC Check',
      rack: 'R-02',
      bin: 'B-04',
      deliveryTime: '15-30 Mins',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
      type: 'refurbished'
    },
    {
      id: 'SHOW-REF-02',
      name: 'OnePlus 11 5G (256GB - Titan Black)',
      category: 'Used Mobiles',
      department: 'mobiles',
      brand: 'OnePlus',
      price: 36999,
      mrp: 61999,
      stock: 1,
      condition: 'Certified Grade A+',
      discountPct: 40,
      warranty: '6 Months ALZINO Comprehensive Hardware Warranty',
      specs: 'Battery Health 96% • Hasselblad Triple Camera • 100W Charging • Original Box',
      rack: 'R-02',
      bin: 'B-06',
      deliveryTime: '15-30 Mins',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
      type: 'refurbished'
    },
    {
      id: 'SHOW-ACC-01',
      name: 'Apple 20W USB-C Power Adapter (Original Box)',
      category: 'Mobile Accessories',
      department: 'accessories',
      brand: 'Apple',
      price: 1699,
      mrp: 1900,
      stock: 12,
      condition: '100% Genuine Box',
      discountPct: 11,
      warranty: '1 Year Apple Official Warranty',
      specs: 'Original Apple 20W Fast Charging • Works with iPhone 15/14/13/12 & iPad • BIS Mark',
      rack: 'R-03',
      bin: 'B-01',
      deliveryTime: '15 Mins',
      image: 'https://images.unsplash.com/photo-1622445262464-84b14e32452e?w=800&auto=format&fit=crop&q=80',
      type: 'accessory'
    },
    {
      id: 'SHOW-ACC-02',
      name: 'OnePlus 80W SUPERVOOC Power Adapter + Type-C Cable',
      category: 'Mobile Accessories',
      department: 'accessories',
      brand: 'OnePlus',
      price: 2499,
      mrp: 3499,
      stock: 10,
      condition: 'Flash Charge Deal',
      discountPct: 29,
      warranty: '1 Year Instant Replacement Warranty',
      specs: 'Original OnePlus 80W Flash Charge • GaN Technology • 10-Layer Safety Protection • Type-C Cable',
      rack: 'R-03',
      bin: 'B-03',
      deliveryTime: '15 Mins',
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
      type: 'accessory'
    },
    {
      id: 'SHOW-ACC-03',
      name: 'boAt Airdopes 141 True Wireless Earbuds (42H Playtime)',
      category: 'Mobile Accessories',
      department: 'accessories',
      brand: 'boAt',
      price: 1199,
      mrp: 4490,
      stock: 20,
      condition: 'Mega Price Drop',
      discountPct: 73,
      warranty: '1 Year boAt India Warranty',
      specs: '42H Total Playtime • Beast Mode 80ms Low Latency • ENx Tech Mic • ASAP Fast Charge',
      rack: 'R-03',
      bin: 'B-05',
      deliveryTime: '15 Mins',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
      type: 'accessory'
    },
    {
      id: 'SHOW-ACC-04',
      name: 'Noise ColorFit Pulse 3 AMOLED Bluetooth Calling Smartwatch',
      category: 'Mobile Accessories',
      department: 'accessories',
      brand: 'Noise',
      price: 1799,
      mrp: 6999,
      stock: 15,
      condition: '74% Clearance Deal',
      discountPct: 74,
      warranty: '1 Year Noise Official Warranty',
      specs: '1.96" AMOLED Always-On Display • BT Calling with Dialpad • 100+ Sports Modes • SpO2',
      rack: 'R-03',
      bin: 'B-08',
      deliveryTime: '15 Mins',
      image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
      type: 'accessory'
    },
    {
      id: 'SHOW-ACC-05',
      name: 'Anker 20,000mAh 22.5W Fast Charging Power Bank',
      category: 'Mobile Accessories',
      department: 'accessories',
      brand: 'Anker',
      price: 2199,
      mrp: 3999,
      stock: 8,
      condition: 'Fast PD Power',
      discountPct: 45,
      warranty: '18 Months Anker Warranty',
      specs: 'Dual USB-A + Type-C PD Output • PowerIQ 3.0 • MultiProtect Safety • Smart LED Display',
      rack: 'R-03',
      bin: 'B-10',
      deliveryTime: '15 Mins',
      image: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=800&auto=format&fit=crop&q=80',
      type: 'accessory'
    },
    {
      id: 'SHOW-ACC-06',
      name: 'Premium 9D Curved Tempered Glass with Free Installation',
      category: 'Mobile Accessories',
      department: 'accessories',
      brand: 'ALZINO Armor',
      price: 199,
      mrp: 499,
      stock: 50,
      condition: 'Instant Fit Deal',
      discountPct: 60,
      warranty: 'Bubble-Free In-Store Installation Included',
      specs: '9H Diamond Hardness • Edge-to-Edge Full Glue • Oleophobic Anti-Fingerprint Coating',
      rack: 'R-03',
      bin: 'B-14',
      deliveryTime: '15 Mins',
      image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&auto=format&fit=crop&q=80',
      type: 'accessory'
    },
    {
      id: 'SHOW-ACC-07',
      name: 'MagSafe Shockproof Magnetic Protective Case with Camera Guard',
      category: 'Mobile Accessories',
      department: 'accessories',
      brand: 'ALZINO Armor',
      price: 399,
      mrp: 999,
      stock: 35,
      condition: 'Drop-Tested Deal',
      discountPct: 60,
      warranty: 'Military Grade Drop Certified',
      specs: 'Strong N52 Magnetic Ring • Raised 1.5mm Camera Lip • Scratch-Resistant Matte Finish',
      rack: 'R-03',
      bin: 'B-15',
      deliveryTime: '15 Mins',
      image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&auto=format&fit=crop&q=80',
      type: 'accessory'
    },
    {
      id: 'SHOW-APP-01',
      name: 'Sony Bravia 55" 4K Ultra HD Smart Google TV (KD-55X74L)',
      category: 'Home Appliances',
      department: 'appliances',
      brand: 'Sony',
      price: 57990,
      mrp: 89900,
      stock: 3,
      condition: 'Cinema 4K Deal',
      discountPct: 35,
      warranty: '3 Years Comprehensive Sony India Warranty',
      specs: 'X1 4K HDR Processor • Live Color • Dolby Audio • Google TV with Voice Remote',
      rack: 'AP-01',
      bin: 'B-01',
      deliveryTime: 'Same-Day Bodhan',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
      type: 'appliance'
    },
    {
      id: 'SHOW-APP-02',
      name: 'Samsung 43" Crystal 4K Vivid Pro Smart LED TV',
      category: 'Home Appliances',
      department: 'appliances',
      brand: 'Samsung',
      price: 28990,
      mrp: 42900,
      stock: 4,
      condition: 'In-Store Deal',
      discountPct: 32,
      warranty: '2 Years Comprehensive Samsung Warranty',
      specs: 'Crystal Processor 4K • PurColor • Motion Xcelerator • 20W Q-Symphony Audio',
      rack: 'AP-01',
      bin: 'B-03',
      deliveryTime: 'Same-Day Bodhan',
      image: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800&auto=format&fit=crop&q=80',
      type: 'appliance'
    },
    {
      id: 'SHOW-APP-03',
      name: 'Voltas 1.5 Ton 5-Star Adjustable Inverter Split AC',
      category: 'Home Appliances',
      department: 'appliances',
      brand: 'Voltas',
      price: 36990,
      mrp: 75990,
      stock: 3,
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
      id: 'SHOW-APP-04',
      name: 'LG 8.0 Kg 5-Star AI Direct Drive Front Load Washing Machine',
      category: 'Home Appliances',
      department: 'appliances',
      brand: 'LG',
      price: 33990,
      mrp: 49990,
      stock: 2,
      condition: 'In-Store Deal',
      discountPct: 32,
      warranty: '10 Years Direct Drive Motor Warranty',
      specs: 'AI DD Steam Wash • 6 Motion Tech • Stainless Steel Tub • TurboWash Quick Cycle',
      rack: 'AP-03',
      bin: 'B-03',
      deliveryTime: 'Same-Day Bodhan',
      image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&auto=format&fit=crop&q=80',
      type: 'appliance'
    },
    {
      id: 'SHOW-APP-05',
      name: 'Symphony Diet 3D 55i Personal Tower Air Cooler (55 Litres)',
      category: 'Home Appliances',
      department: 'appliances',
      brand: 'Symphony',
      price: 9499,
      mrp: 13999,
      stock: 5,
      condition: 'Summer Special',
      discountPct: 32,
      warranty: '1 Year Manufacturer Warranty',
      specs: '3D Cooling Honeycomb Pads • i-Pure Air Tech • Low Power Consumption • Remote',
      rack: 'AP-04',
      bin: 'B-04',
      deliveryTime: 'Same-Day Bodhan',
      image: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80',
      type: 'appliance'
    }
  ];

  // Helper to extract clean condition text without noisy emojis
  const cleanBadgeText = (text) => {
    if (!text) return 'Verified Stock';
    return text.replace(/[⚡🏷️🔥✨🎉●]/g, '').trim();
  };

  // Build live showroom products list combining real admin inventory & refurbished & showcase
  const liveProducts = useMemo(() => {
    const list = [];
    const seenNames = new Set();

    // 1. Add active inventory items
    if (inventory && inventory.length > 0) {
      inventory.forEach(item => {
        const cleanName = (item.name || '').replace(/^sSamsung/i, 'Samsung');
        seenNames.add(cleanName.toLowerCase());

        const isAppliance = item.category === 'Home Appliances' || 
                            (cleanName && (cleanName.toLowerCase().includes('tv') || 
                                           cleanName.toLowerCase().includes('ac') || 
                                           cleanName.toLowerCase().includes('cooler') || 
                                           cleanName.toLowerCase().includes('washing machine') || 
                                           cleanName.toLowerCase().includes('fridge')));

        const isAccessory = item.category === 'Mobile Accessories' && 
                            !cleanName.toLowerCase().includes('galaxy') && 
                            !cleanName.toLowerCase().includes('iphone');

        const department = isAppliance ? 'appliances' : (isAccessory ? 'accessories' : 'mobiles');
        const agingDays = getAgingDays(item);
        const hasOffer = item.offer && item.offer.pct > 0;
        const regularPrice = item.offer?.regularPrice || item.mrp || Math.round((item.sellPrice || 0) * 1.08);
        const sellPrice = item.sellPrice || 0;
        const discount = regularPrice > sellPrice ? Math.round(((regularPrice - sellPrice) / regularPrice) * 100) : 0;

        let condition = 'In-Store Stock';
        if (hasOffer) {
          condition = cleanBadgeText(item.offer.label || `Special Deal (${item.offer.pct}% Off)`);
        } else if (agingDays >= 60) {
          condition = `Clearance Deal (${discount}% Off)`;
        } else if (discount > 5) {
          condition = `${discount}% OFF Deal`;
        }

        list.push({
          id: item.id,
          name: cleanName,
          category: item.category || (isAppliance ? 'Home Appliances' : (isAccessory ? 'Mobile Accessories' : 'New Mobiles')),
          department,
          brand: item.brand || cleanName.split(' ')[0] || 'Samsung',
          price: sellPrice,
          mrp: regularPrice,
          discountPct: discount,
          stock: Number(item.stock) || 0,
          condition,
          warranty: item.warranty || '1 Year Official Manufacturer Warranty',
          rack: item.rack || 'R-01',
          bin: item.bin || 'B-01',
          deliveryTime: isAppliance ? 'Same-Day Bodhan' : '15-30 Mins',
          specs: item.description || 'Genuine Bodhan In-Store Stock • Official GST Bill',
          image: null,
          images: item.images || null,
          type: isAppliance ? 'appliance' : (isAccessory ? 'accessory' : 'new')
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
          const uName = `${item.brand || ''} ${item.model || ''} (${item.storage || ''} ${item.color || ''})`.trim();
          seenNames.add(uName.toLowerCase());

          list.push({
            id: item.id || `USED-${Math.random()}`,
            name: uName,
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

    // 3. Always include showcase catalog so the customer store has full product variety across all categories
    fallbackShowroomCatalog.forEach(showcaseItem => {
      if (!seenNames.has(showcaseItem.name.toLowerCase())) {
        list.push(showcaseItem);
      }
    });

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
      if (selectedCategory === 'smartphones') {
        const isSmart = (item.department === 'mobiles' || item.category === 'New Mobiles') && 
                        item.type !== 'refurbished' && 
                        item.category !== 'Mobile Accessories';
        if (!isSmart) return false;
      }
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
  const categoriesList = [
    { id: 'all', label: 'All Products', icon: LayoutGrid },
    { id: 'smartphones', label: 'Smartphones & 5G', icon: Smartphone },
    { id: 'audio', label: 'Earbuds & Audio', icon: Headphones },
    { id: 'chargers', label: 'Fast Chargers & Cables', icon: Cable },
    { id: 'wearables', label: 'Smartwatches', icon: Watch },
    { id: 'protection', label: 'Glass & Cases', icon: ShieldCheck },
    { id: 'refurbished', label: 'Certified Refurbished', icon: RefreshCw },
    { id: 'appliances', label: '4K TVs & Appliances', icon: Tv },
    { id: 'clearance', label: 'Clearance Hub', icon: Flame },
  ];

  // Category item counts for badges
  const categoryCounts = useMemo(() => {
    const counts = { all: liveProducts.length };
    categoriesList.forEach(cat => {
      if (cat.id === 'all') return;
      counts[cat.id] = liveProducts.filter(item => {
        const cleanName = (item.name || '').toLowerCase();
        if (cat.id === 'smartphones') return (item.department === 'mobiles' || item.category === 'New Mobiles') && item.type !== 'refurbished';
        if (cat.id === 'audio') return cleanName.includes('earbuds') || cleanName.includes('airpods') || cleanName.includes('airdopes') || cleanName.includes('audio') || cleanName.includes('headphone');
        if (cat.id === 'chargers') return cleanName.includes('charger') || cleanName.includes('adapter') || cleanName.includes('cable') || cleanName.includes('power bank');
        if (cat.id === 'wearables') return cleanName.includes('watch') || cleanName.includes('band') || cleanName.includes('pulse');
        if (cat.id === 'protection') return cleanName.includes('glass') || cleanName.includes('case') || cleanName.includes('cover') || cleanName.includes('armor');
        if (cat.id === 'appliances') return item.type === 'appliance' || item.department === 'appliances' || item.category === 'Home Appliances';
        if (cat.id === 'refurbished') return item.type === 'refurbished' || item.category === 'Used Mobiles';
        if (cat.id === 'clearance') return (item.discountPct && item.discountPct >= 10) || (item.condition && (item.condition.includes('Clearance') || item.condition.includes('Deal')));
        return false;
      }).length;
    });
    return counts;
  }, [liveProducts, categoriesList]);

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
      if (item.rack) {
        message += `   • Shelf: Rack ${item.rack}${item.bin ? `, Bin ${item.bin}` : ''}\n`;
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

    message += `Please confirm stock availability and best counter deal for me at your Station Road, Bodhan showroom. Thank you! 🙏`;

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
    const stockText = product.stock > 0 ? `\n✅ *Stock Status:* Available right now in Bodhan (${product.stock} units)` : `\n⚡ *Availability:* Same-day arrival at Bodhan store`;
    const locText = product.rack ? `\n📍 *Shelf Location:* Rack ${product.rack}${product.bin ? `, Bin ${product.bin}` : ''}` : '';

    const message = `Namaste ALZINO Mobiles & Home Appliances Bodhan! 👋\n\n` +
      `I am enquiring from your store website about this product:\n\n` +
      `📱 *Product:* ${product.name}` +
      `${variantText}\n` +
      `💰 *Special Online Price:* ${priceFormatted}${mrpFormatted}${discountText}` +
      `${warrantyText}` +
      `${stockText}` +
      `${locText}\n\n` +
      `Please let me know if this is available for instant pickup/delivery at Station Road, Bodhan. Thank you!`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
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
              <img
                src="/alzino-logo.png"
                alt="ALZINO"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #0C5B43',
                  boxShadow: '0 2px 8px rgba(12, 91, 67, 0.25)',
                  flexShrink: 0
                }}
              />
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
          </div>

          {/* Quick-Commerce Omnibox Search Bar */}
          <div style={{ flex: 1, maxWidth: '620px', position: 'relative' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
            {/* Locate Us (Google Maps) */}
            <a 
              href={shopConfig.mapsUrl || "https://maps.google.com/?q=Station+Road+Bodhan+Telangana+503185"}
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
          @media (max-width: 768px) {
            .storefront-catalog-section {
              padding: 0 0.5rem !important;
              margin: 1.25rem auto 2.5rem !important;
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
      <section className="storefront-catalog-section" style={{ maxWidth: '1280px', margin: '1.5rem auto 3rem', padding: '0 1rem' }}>
        {/* Category Filter Pills (Placed Above Product Listing) */}
        <div style={{
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
                    {/* Top Badges (Discount Pill in Red, 15-30 Mins removed) */}
                    <div className="storefront-card-top-badges" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.45rem', minHeight: '1.25rem' }}>
                      {prod.discountPct > 0 ? (
                        <span className="storefront-card-badge" style={{
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          fontSize: '0.65rem',
                          fontWeight: 800,
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
                      {prod.images ? (
                        <ProductImageViewer product={prod} height={155} />
                      ) : (
                        <img 
                          src={getRealProductImage(prod)} 
                          alt={prod.name} 
                          className="storefront-card-img"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = prod.type === 'appliance'
                              ? 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80'
                              : 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80';
                          }}
                          style={{ 
                            maxHeight: '145px', 
                            maxWidth: '92%', 
                            objectFit: 'contain',
                            borderRadius: '6px',
                            transition: 'transform 0.25s ease'
                          }} 
                        />
                      )}
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

                    {/* Showroom Rack Location */}
                    {prod.rack && (
                      <div className="storefront-card-rack" style={{
                        fontSize: '0.65rem',
                        color: '#4B5563',
                        backgroundColor: '#F3F4F6',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        display: 'inline-block',
                        marginBottom: '0.65rem',
                        fontWeight: 600
                      }}>
                        Aisle: {prod.rack} • Bin: {prod.bin}
                      </div>
                    )}
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
              <span>Get GPS Directions (Locate Us)</span>
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
                href={shopConfig.whatsappUrl || 'https://wa.me/919121212292'}
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
                href={shopConfig.mapsUrl || 'https://maps.google.com/?q=Station+Road+Bodhan+Telangana+503185'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.65rem',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                <Navigation size={15} color="#D97706" />
                <span>Locate Us (Maps)</span>
              </a>

              <a
                href={shopConfig.reviewUrl || 'https://g.page/r/CWxRHXGDCdZ7EBM/review'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.65rem',
                  backgroundColor: '#FFFBEB',
                  color: '#B45309',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                <Star size={15} color="#F59E0B" fill="#F59E0B" />
                <span>Rate Us (5★)</span>
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
              ) : (
                <img 
                  src={getRealProductImage(selectedProductModal)} 
                  alt={selectedProductModal.name} 
                  style={{ maxHeight: '190px', maxWidth: '90%', objectFit: 'contain' }} 
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0C5B43', backgroundColor: '#E8F5E9', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                {selectedProductModal.brand}
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#111827', margin: '0 0 0.5rem' }}>
              {selectedProductModal.name}
            </h3>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#111827' }}>
                ₹{selectedProductModal.price.toLocaleString()}
              </span>
              {selectedProductModal.mrp && selectedProductModal.mrp > selectedProductModal.price && (
                <span style={{ fontSize: '0.88rem', color: '#9CA3AF', textDecoration: 'line-through' }}>
                  ₹{selectedProductModal.mrp.toLocaleString()}
                </span>
              )}
              {selectedProductModal.discountPct > 0 && (
                <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  {selectedProductModal.discountPct}% OFF
                </span>
              )}
              {selectedProductModal.mrp && selectedProductModal.mrp > selectedProductModal.price && (
                <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  Save ₹{(selectedProductModal.mrp - selectedProductModal.price).toLocaleString()}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => handleSingleWhatsAppInquiry(selectedProductModal)}
                style={{
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
                  gap: '0.45rem',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
                }}
              >
                <WhatsAppIcon size={17} color="#FFFFFF" />
                <span>Enquire on WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  addToCart(selectedProductModal);
                  setSelectedProductModal(null);
                  setIsCartOpen(true);
                }}
                style={{
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
                <Plus size={16} />
                <span>Add to Cart</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <img 
              src="/alzino-logo.png" 
              alt="ALZINO" 
              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E5E7EB' }} 
            />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0C5B43', marginBottom: '0.2rem' }}>
                {shopConfig.name || 'ALZINO'} Express
              </div>
              <div>Station Road, Bodhan, Telangana - 503185 • GSTIN: {shopConfig.gstin || '36AABCA1234M1Z8'}</div>
            </div>
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
