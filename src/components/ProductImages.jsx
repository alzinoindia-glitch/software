import React, { useRef, useState } from 'react';
import { Camera, X, RotateCcw, ImageOff } from 'lucide-react';
import { compressImageFile, getPublicProductImageUrlFromSignedUrl, useProductImages } from '../utils/productImageStore';

const SIDE_LABELS = { front: 'Front', back: 'Back' };

/**
 * Two-slot (front / back) photo picker used inside the product form.
 * value: { front: dataUrl|null, back: dataUrl|null }
 */
export function ProductImagePicker({ value = { front: null, back: null }, onChange }) {
  const inputs = { front: useRef(null), back: useRef(null) };
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const handleFile = async (side, file) => {
    if (!file) return;
    setError('');
    setBusy(side);
    try {
      const dataUrl = await compressImageFile(file);
      onChange({ ...value, [side]: dataUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
      if (inputs[side].current) inputs[side].current.value = '';
    }
  };

  return (
    <div>
      <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
        Product Photos (Front &amp; Back)
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        {['front', 'back'].map((side) => {
          const src = value[side];
          return (
            <div key={side}>
              <input
                ref={inputs[side]}
                id={`product-image-${side}`}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(side, e.target.files?.[0])}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputs[side].current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputs[side].current?.click(); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(side, e.dataTransfer.files?.[0]); }}
                title={`Upload or capture ${SIDE_LABELS[side].toLowerCase()} photo`}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  borderRadius: '8px',
                  border: src ? '1px solid var(--border-color)' : '1.5px dashed var(--border-color)',
                  background: 'var(--bg-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                {src ? (
                  <img src={src} alt={`${SIDE_LABELS[side]} view`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.72rem', padding: '0.5rem' }}>
                    <Camera size={20} style={{ marginBottom: '0.25rem' }} />
                    <div style={{ fontWeight: 700 }}>{busy === side ? 'Processing…' : `${SIDE_LABELS[side]} Photo`}</div>
                    <div style={{ fontSize: '0.65rem' }}>Tap, capture or drop</div>
                  </div>
                )}

                <span style={{
                  position: 'absolute', top: 6, left: 6, fontSize: '0.62rem', fontWeight: 800,
                  padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff'
                }}>
                  {SIDE_LABELS[side].toUpperCase()}
                </span>

                {src && (
                  <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); inputs[side].current?.click(); }}
                      title="Replace photo"
                      style={{ border: 'none', borderRadius: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '0.2rem', cursor: 'pointer', display: 'flex' }}
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onChange({ ...value, [side]: null }); }}
                      title="Remove photo"
                      style={{ border: 'none', borderRadius: '4px', background: 'rgba(220,38,38,0.85)', color: '#fff', padding: '0.2rem', cursor: 'pointer', display: 'flex' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && <div style={{ color: 'var(--status-red)', fontSize: '0.72rem', marginTop: '0.3rem' }}>{error}</div>}
    </div>
  );
}

/**
 * Displays a product's stored photo with a Front/Back toggle.
 * Renders a placeholder when the product has no photos.
 */
export function ProductImageViewer({ product, height = 140, dark = false, placeholder = null }) {
  const hasImages = Boolean(product?.images?.front || product?.images?.back);
  // Always check this browser's IndexedDB by product ID. Some older/imported
  // rows have saved photos but lost the lightweight `images` marker. When no
  // marker exists, keep this local-only to avoid private Storage lookups for
  // every public catalog card.
  const images = useProductImages(product?.id, product?.images?.v, hasImages);
  const [side, setSide] = useState('front');
  const [sourceFailures, setSourceFailures] = useState({ key: '', sources: [] });

  const available = ['front', 'back'].filter((s) => images[s]);
  const activeSide = images[side] ? side : available[0];
  const sourceKey = `${product?.id || ''}:${side}`;
  const failedSources = sourceFailures.key === sourceKey ? sourceFailures.sources : [];
  const savedImageSources = [product?.imageUrl, product?.image_url, product?.image];
  const sources = [
    activeSide ? images[activeSide] : null,
    ...savedImageSources,
    ...savedImageSources.map(getPublicProductImageUrlFromSignedUrl),
    ...(Array.isArray(product?.imageFallbacks) ? product.imageFallbacks : [])
  ].filter((source, index, all) => typeof source === 'string' && source && all.indexOf(source) === index);
  const src = sources.find((source) => !failedSources.includes(source)) || null;

  if (!src) {
    if (placeholder) return placeholder;
    return (
      <div style={{
        height, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: dark ? 'rgba(255,255,255,0.03)' : 'var(--bg-main)',
        color: dark ? '#6B7280' : 'var(--text-secondary)', fontSize: '0.7rem', gap: '0.35rem'
      }}>
        <ImageOff size={16} /> No photo
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', height, borderRadius: '8px', overflow: 'hidden',
      background: dark ? '#FFFFFF' : 'var(--bg-main)'
    }}>
      <img
        src={src}
        alt={`${product.name} – ${activeSide || 'product'} view`}
        loading="lazy"
        onError={() => setSourceFailures(current => ({
          key: sourceKey,
          sources: [...(current.key === sourceKey ? current.sources : failedSources), src]
        }))}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      {available.length > 1 && (
        <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.25rem' }}>
          {available.map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => { e.stopPropagation(); setSide(s); }}
              style={{
                border: 'none', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 800,
                padding: '0.15rem 0.45rem', borderRadius: '999px',
                background: activeSide === s ? '#10B981' : 'rgba(0,0,0,0.55)', color: '#fff'
              }}
            >
              {SIDE_LABELS[s].toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
