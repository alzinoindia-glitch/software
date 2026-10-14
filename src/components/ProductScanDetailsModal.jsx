import React, { useState, useMemo } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Tag, 
  Cpu, 
  HardDrive, 
  Smartphone, 
  Layers, 
  AlertCircle, 
  FileText, 
  Share2, 
  Check, 
  Copy, 
  MapPin, 
  ShoppingCart, 
  Receipt, 
  Printer,
  ChevronRight,
  Package
} from 'lucide-react';
import { ProductImageViewer } from './ProductImages';
import { getRealProductImage } from './CustomerStorefront';
import { firstPositiveAmount, getProductSellingPrice } from '../utils/storefrontProductRules';
import { 
  normalizeProductTerms, 
  findAvailableColorsForProduct, 
  buildProductScanUrl 
} from '../utils/productTerms';

const WhatsAppIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const getSpecificationEntries = (product, variant, hasColorVariants) => {
  const entries = new Map();
  const add = (key, value) => {
    const cleanValue = value == null ? '' : String(value).trim();
    if (!cleanValue) return;
    const label = String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
    if (!label) return;
    entries.set(label.toLowerCase(), { label, value: cleanValue });
  };
  const addSpecificationObject = value => {
    if (Array.isArray(value)) value.forEach(item => add(item?.label || item?.name || item?.key, item?.value));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => add(key, item));
  };
  addSpecificationObject(product?.specifications);
  addSpecificationObject(variant?.specifications);
  ['ram', 'storage', 'capacity'].forEach(key => add(key, variant?.[key] || product?.[key]));
  if (product?.color || hasColorVariants) add('Colour Finish', variant?.color || product?.color);
  return [...entries.values()];
};

export default function ProductScanDetailsModal({
  product,
  inventory = [],
  isOpen,
  onClose,
  onAddToCart,
  onQuickBill,
  shopConfig = {},
  role = 'customer'
}) {
  // Find all color variants of this model across inventory
  const availableColors = useMemo(() => {
    if (!product) return [];
    return findAvailableColorsForProduct(product, inventory);
  }, [product, inventory]);

  // Selected color variant in the modal (defaults to current product's color)
  const [selectedColorKey, setSelectedColorKey] = useState(() => {
    return (product?.color || '').toLowerCase();
  });

  const activeVariant = useMemo(() => {
    if (!product) return null;
    const found = availableColors.find(c => c.color.toLowerCase() === selectedColorKey.toLowerCase());
    return found || availableColors[0] || {
      color: product.color || 'Standard',
      colorHex: product.colorHex || '#333333',
      image: product.image,
      stock: product.stock,
      sellPrice: getProductSellingPrice(product),
      mrp: product.mrp
    };
  }, [availableColors, selectedColorKey, product]);

  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  // Parse terms and conditions
  const termsList = useMemo(() => {
    if (!product) return [];
    const explicitTerms = product.termsAndConditions || product.terms;
    const hasExplicitTerms = Array.isArray(explicitTerms)
      ? explicitTerms.some(term => (typeof term === 'string' ? term : term?.text || '').trim())
      : typeof explicitTerms === 'string' && Boolean(explicitTerms.trim());
    return hasExplicitTerms ? normalizeProductTerms(explicitTerms) : [];
  }, [product]);

  if (!isOpen || !product) return null;

  const effectivePrice = getProductSellingPrice(activeVariant, getProductSellingPrice(product));
  const effectiveMrp = firstPositiveAmount(activeVariant.mrp, product.mrp, effectivePrice);
  const discountSavings = Math.max(0, effectiveMrp - effectivePrice);
  const discountPct = effectiveMrp > effectivePrice ? Math.round((discountSavings / effectiveMrp) * 100) : 0;
  const specifications = getSpecificationEntries(product, activeVariant, availableColors.length > 0);
  const hasSpecifications = specifications.length > 0;
  const productInformation = String(product.description || '').trim();

  // Active display image
  const displayImage = activeVariant.image || product.image || getRealProductImage(product);

  const copyScanUrl = async () => {
    const scanUrl = buildProductScanUrl(product);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(scanUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = scanUrl;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
      return scanUrl;
    } catch (error) {
      console.error('Could not copy product link', error);
      return null;
    }
  };

  const handleWhatsAppShare = () => {
    const scanUrl = buildProductScanUrl(product);
    const text = `Check out ${product.brand || ''} ${product.name || ''} at ALZINO: ${scanUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    setShowShareOptions(false);
  };

  const handleInstagramShare = async () => {
    const scanUrl = await copyScanUrl();
    if (!scanUrl) return;
    setShowShareOptions(false);
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  };

  const handleMoreShare = async () => {
    const scanUrl = buildProductScanUrl(product);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.brand || ''} ${product.name || ''}`.trim(),
          text: 'View this product at ALZINO',
          url: scanUrl
        });
      } catch (error) {
        if (error.name !== 'AbortError') console.error('Could not share product link', error);
      }
    } else {
      await copyScanUrl();
    }
    setShowShareOptions(false);
  };

  const handleWhatsAppEnquiry = () => {
    const phone = (shopConfig.whatsappNumber || shopConfig.phone || '919121212292').replace(/[^0-9]/g, '');
    const configuration = specifications
      .filter(item => ['ram', 'storage'].includes(item.label.toLowerCase()))
      .map(item => `${item.value} ${item.label}`)
      .join(' / ');
    const text = encodeURIComponent(
      `Hello ALZINO Mobiles, I scanned the QR code for *${product.brand || ''} ${product.name || ''}*.\n` +
      (activeVariant.color && activeVariant.color !== 'Standard' ? `Colour: ${activeVariant.color}\n` : '') +
      (configuration ? `Configuration: ${configuration}\n` : '') +
      `Price: ₹${effectivePrice.toLocaleString()}\n` +
      `Is this available right now at your Bodhan counter?`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div 
      className="modal-backdrop no-print"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 12, 10, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          overflow: 'hidden',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #F0F2F1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0F251E 0%, #17382E 100%)',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)'
            }}>
              <Smartphone size={20} color="#6EE7B7" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, letterSpacing: '-0.2px' }}>
                  {shopConfig.name || 'ALZINO MOBILES'}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  padding: '0.12rem 0.45rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}>
                  <ShieldCheck size={10} /> Verified QR
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#A7F3D0', fontWeight: 500 }}>
                Official Product Specifications & Terms Directory
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowShareOptions((open) => !open)}
              title="Share product"
              aria-label="Share product"
              aria-expanded={showShareOptions}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#FFFFFF',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {copiedLink ? <Check size={16} color="#6EE7B7" /> : <Share2 size={16} />}
            </button>

            {showShareOptions && (
              <div role="menu" aria-label="Share product" style={{
                position: 'absolute',
                zIndex: 5,
                top: '42px',
                right: '42px',
                width: '210px',
                padding: '0.4rem',
                borderRadius: '12px',
                background: '#FFFFFF',
                color: '#17241F',
                boxShadow: '0 12px 32px rgba(0,0,0,0.24)',
                border: '1px solid #E2E8E5'
              }}>
                {[
                  { label: copiedLink ? 'Link copied' : 'Copy product link', action: async () => { await copyScanUrl(); setShowShareOptions(false); } },
                  { label: 'Share on WhatsApp', action: handleWhatsAppShare },
                  { label: 'Share on Instagram', action: handleInstagramShare },
                  { label: 'More sharing apps', action: handleMoreShare }
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    type="button"
                    role="menuitem"
                    onClick={action}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.7rem',
                      border: 'none',
                      borderRadius: '8px',
                      background: 'transparent',
                      color: '#17382E',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {label}
                  </button>
                ))}
                <div style={{ padding: '0.35rem 0.7rem 0.5rem', color: '#64746D', fontSize: '0.68rem', lineHeight: 1.35 }}>
                  Instagram opens with the link copied. Paste it into a message or your profile.
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#FFFFFF',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {/* Main Showcase: Image + Pricing + Title */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 220px) 1fr',
            gap: '1.25rem',
            alignItems: 'center',
            background: 'linear-gradient(180deg, #F9FBFA 0%, #F3F6F4 100%)',
            padding: '1.1rem',
            borderRadius: '18px',
            border: '1px solid #E5EBE8'
          }}>
            {/* High-res Image Showcase */}
            <div style={{
              height: '210px',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
            }}>
              {product.images ? (
                <ProductImageViewer product={product} height={200} />
              ) : (
                <img 
                  src={displayImage} 
                  alt={product.name}
                  style={{
                    maxHeight: '190px',
                    maxWidth: '90%',
                    objectFit: 'contain',
                    transition: 'transform 0.25s ease'
                  }}
                />
              )}
              {activeVariant.color && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(4px)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#152620',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  border: '1px solid rgba(0,0,0,0.06)'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: activeVariant.colorHex || '#333',
                    border: '1px solid rgba(0,0,0,0.2)'
                  }} />
                  {activeVariant.color}
                </div>
              )}
            </div>

            {/* Info & Pricing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#0F251E',
                  backgroundColor: '#D1FAE5',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px'
                }}>
                  {product.brand || 'MOBILE'}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#4B5563',
                  backgroundColor: '#E5E7EB',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px'
                }}>
                  {product.category || 'New Mobiles'}
                </span>
                {product.barcode && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#6B7280',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '6px'
                  }}>
                    {product.barcode}
                  </span>
                )}
              </div>

              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 900,
                color: '#111827',
                margin: '0.2rem 0',
                lineHeight: 1.3
              }}>
                {product.name}
              </h2>

              {/* Price Banner */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F251E' }}>
                  ₹{effectivePrice.toLocaleString()}
                </span>
                {effectiveMrp > effectivePrice && (
                  <span style={{ fontSize: '0.95rem', color: '#9CA3AF', textDecoration: 'line-through', fontWeight: 600 }}>
                    ₹{effectiveMrp.toLocaleString()}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="gold-discount-badge" style={{
                    fontSize: '0.75rem',
                    fontWeight: 850,
                    padding: '0.18rem 0.55rem',
                    borderRadius: '6px'
                  }}>
                    {discountPct}% OFF
                  </span>
                )}
              </div>

              {discountSavings > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 800 }}>
                  ✓ Instant Counter Savings: Save ₹{discountSavings.toLocaleString()}
                </div>
              )}

              {/* Stock & Location (Privacy guarded: customers see clean verified status, admin sees rack & exact units) */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                {(role === 'admin' || role === 'cashier') ? (
                  <>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: activeVariant.stock > 0 ? '#065F46' : '#991B1B',
                      backgroundColor: activeVariant.stock > 0 ? '#D1FAE5' : '#FEE2E2',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      <Package size={12} />
                      {activeVariant.stock > 0 ? `In Stock (${activeVariant.stock} available)` : 'Out of Stock'}
                    </span>

                    {product.rack && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#1F2937',
                        backgroundColor: '#F3F4F6',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <MapPin size={11} color="#4F46E5" />
                        <span>Rack {product.rack} • Bin {product.bin}</span>
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: activeVariant.stock > 0 ? '#065F46' : '#991B1B',
                    backgroundColor: activeVariant.stock > 0 ? '#D1FAE5' : '#FEE2E2',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <CheckCircle2 size={12} />
                    {activeVariant.stock > 0 ? 'Verified In Stock' : 'Currently Unavailable'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {productInformation && <section style={{
            padding: '0.85rem 1rem',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', color: '#374151', fontSize: '0.78rem', fontWeight: 850 }}>
              <FileText size={15} color="#059669" />
              <span>Product Information</span>
            </div>
            <p style={{ margin: 0, color: '#374151', fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{productInformation}</p>
          </section>}

          {/* Show only product details that were actually supplied. */}
          {hasSpecifications && <div>
            <div style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Cpu size={15} color="#059669" />
              <span>Key Hardware Specifications</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
              gap: '0.65rem'
            }}>
              {specifications.map(({ label, value }) => <div key={label.toLowerCase()} style={{
                padding: '0.75rem',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#111827', marginTop: '2px' }}>
                  {value}
                </div>
              </div>)}

            </div>
          </div>}

          {/* Section 2: WHAT COLORS AVAILABLE IN THEM WITH THEIR IMAGES */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.6rem'
            }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Layers size={15} color="#059669" />
                <span>Available Colours & Finishes ({availableColors.length})</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                Tap to view colour & real photo
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '0.65rem'
            }}>
              {availableColors.map((variant, idx) => {
                const isSelected = variant.color.toLowerCase() === selectedColorKey.toLowerCase();
                const variantImg = variant.image || displayImage;

                return (
                  <div
                    key={variant.id || `${variant.color}-${idx}`}
                    onClick={() => setSelectedColorKey(variant.color)}
                    style={{
                      border: isSelected ? '2px solid #0F251E' : '1px solid #E5E7EB',
                      backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                      borderRadius: '14px',
                      padding: '0.55rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 14px rgba(15, 37, 30, 0.12)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                  >
                    {/* Color Image Preview */}
                    <div style={{
                      width: '100%',
                      height: '75px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      marginBottom: '0.4rem'
                    }}>
                      <img
                        src={variantImg}
                        alt={variant.color}
                        style={{
                          maxHeight: '70px',
                          maxWidth: '90%',
                          objectFit: 'contain'
                        }}
                      />
                    </div>

                    {/* Color Swatch Dot + Name */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: isSelected ? '#0F251E' : '#374151',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%'
                    }}>
                      <span style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: variant.colorHex || '#333',
                        border: '1px solid rgba(0,0,0,0.2)',
                        flexShrink: 0
                      }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {variant.color}
                      </span>
                    </div>

                    {/* Stock status for this colour */}
                    <div style={{
                      fontSize: '0.68rem',
                      color: variant.stock > 0 ? '#059669' : '#DC2626',
                      fontWeight: 700,
                      marginTop: '0.2rem'
                    }}>
                      {variant.stock > 0 ? `${variant.stock} In Stock` : 'Out of Stock'}
                    </div>

                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: '#0F251E',
                        color: '#FFFFFF',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: TERMS AND CONDITIONS OF RESPECTIVE PRODUCT */}
          {termsList.length > 0 && <div style={{
            backgroundColor: '#F8FAF9',
            border: '1.5px solid #E2E8E5',
            borderRadius: '16px',
            padding: '1.1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              borderBottom: '1px solid #E5EBE8',
              paddingBottom: '0.6rem'
            }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 900,
                color: '#0F251E',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}>
                <FileText size={17} color="#059669" />
                <span>Product Terms, Warranty & Store Conditions</span>
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#059669',
                backgroundColor: '#D1FAE5',
                padding: '0.15rem 0.45rem',
                borderRadius: '6px'
              }}>
                Official Policy
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {termsList.map((term, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.55rem',
                    fontSize: '0.78rem',
                    color: '#26332E',
                    lineHeight: 1.45,
                    backgroundColor: '#FFFFFF',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #E5EBE8'
                  }}
                >
                  <span style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.68rem',
                    flexShrink: 0,
                    marginTop: '1px'
                  }}>
                    {index + 1}
                  </span>
                  <span style={{ flex: 1, fontWeight: 500 }}>
                    {term}
                  </span>
                </div>
              ))}
            </div>

            {/* Assistance Trust Callout */}
            {isHandsetProduct && <div style={{
              marginTop: '0.85rem',
              padding: '0.65rem 0.85rem',
              backgroundColor: '#ECFDF5',
              borderRadius: '10px',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.75rem',
              color: '#065F46'
            }}>
              <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0 }} />
              <div>
                <strong>100% Verified ALZINO Guarantee:</strong> For all warranty assistance, bring your original invoice to our store at Old Bus Stand, Bodhan, Nizamabad, Telangana – 503185. Direct Helpline: <strong>+91 91212 12292</strong>.
              </div>
            </div>}
          </div>}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '0.9rem 1.25rem',
          borderTop: '1px solid #F0F2F1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          backgroundColor: '#FFFFFF'
        }}>
          <button
            type="button"
            onClick={handleWhatsAppEnquiry}
            style={{
              flex: 1,
              backgroundColor: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
              transition: 'transform 0.15s ease'
            }}
          >
            <WhatsAppIcon size={17} color="#FFFFFF" />
            <span>Enquire on WhatsApp</span>
          </button>

          {role === 'customer' ? (
            <button
              type="button"
              onClick={() => {
                if (onAddToCart) onAddToCart({ ...product, sellPrice: effectivePrice, price: effectivePrice });
                onClose();
              }}
              style={{
                flex: 1,
                backgroundColor: '#0F251E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(15, 37, 30, 0.2)'
              }}
            >
              <ShoppingCart size={16} />
              <span>Add to Cart (₹{effectivePrice.toLocaleString()})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onQuickBill) onQuickBill(product);
                onClose();
              }}
              style={{
                flex: 1,
                backgroundColor: '#0F251E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(15, 37, 30, 0.2)'
              }}
            >
              <Receipt size={16} />
              <span>Bill in POS (₹{effectivePrice.toLocaleString()})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
