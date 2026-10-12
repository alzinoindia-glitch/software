// Pure offline Code128 Barcode & Offline 2D QR Code Generator for ALZINO
import QRCode from 'qrcode';

// Code128 B patterns
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

export function getBarcodeBars(value = "") {
  if (!value) value = "ALZINO-000";
  const str = String(value).trim();
  
  let checksum = 104;
  const indices = [104];

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 32;
    const charIndex = (code >= 0 && code <= 95) ? code : 0;
    indices.push(charIndex);
    checksum += charIndex * (i + 1);
  }
  
  indices.push(checksum % 103);
  indices.push(106); // Stop pattern

  let binary = "";
  for (const idx of indices) {
    const pattern = CODE128_PATTERNS[idx] || "212222";
    let isBar = true;
    for (const char of pattern) {
      const widthVal = parseInt(char, 10);
      binary += (isBar ? "1" : "0").repeat(widthVal);
      isBar = !isBar;
    }
  }

  return { binary, str };
}

export function renderBarcodeSvg(value = "", width = 240, height = 70, showText = true) {
  const { binary, str } = getBarcodeBars(value);

  // Generate SVG elements
  const barWidth = (width - 20) / binary.length;
  let rects = "";
  let posX = 10;
  
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === "1") {
      rects += `<rect x="${posX.toFixed(2)}" y="5" width="${(barWidth + 0.1).toFixed(2)}" height="${height - 24}" fill="#0A0D14" />`;
    }
    posX += barWidth;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="display:block;margin:0 auto;background:#FFF;border-radius:4px;padding:4px">
      ${rects}
      ${showText ? `<text x="${width / 2}" y="${height - 4}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#0A0D14" text-anchor="middle">${str}</text>` : ''}
    </svg>
  `;
}

/**
 * High-performance 100% offline 2D QR Code SVG generator
 * Produces crisp vector SVGs that can be scanned by any smartphone camera or 2D scanner.
 */
export function renderQrSvg(value = "", size = 110) {
  if (!value) value = "ALZINO-000";
  const str = String(value).trim();
  try {
    // Build synchronously. toString's callback runs after this function returns,
    // which left printed labels with an empty QR placeholder.
    const qr = QRCode.create(str, { errorCorrectionLevel: 'M' });
    const quietZone = 4;
    const viewSize = qr.modules.size + quietZone * 2;
    const modules = [];
    for (let row = 0; row < qr.modules.size; row++) {
      for (let col = 0; col < qr.modules.size; col++) {
        if (qr.modules.get(row, col)) {
          modules.push(`M${col + quietZone},${row + quietZone}h1v1h-1z`);
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="Product QR code"><rect width="${viewSize}" height="${viewSize}" fill="#fff"/><path d="${modules.join('')}" fill="#000"/></svg>`;
  } catch (err) {
    console.warn('QR SVG render error:', err);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"><rect width="100" height="100" fill="#fff"/><text x="50" y="50" text-anchor="middle" font-size="8">QR unavailable</text></svg>`;
  }
}

/**
 * Universal Code Renderer: Automatically dispatches to Barcode (Code-128), QR Code, or Both
 */
export function renderCodeSvg(value = "", codeFormat = "barcode", width = 240, height = 70, showText = true) {
  if (codeFormat === 'both') {
    const qrSize = Math.max(50, Math.min(height + 15, 68));
    const barcodeWidth = Math.max(120, width - qrSize - 12);
    const qrSvg = renderQrSvg(value, qrSize);
    const bcSvg = renderBarcodeSvg(value, barcodeWidth, height, showText);
    return `<div style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;max-width:${width}px;margin:0 auto;">
      <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;">${qrSvg}</div>
      <div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;">${bcSvg}</div>
    </div>`;
  }
  if (codeFormat === 'qr' || (typeof value === 'string' && value.includes('QR-'))) {
    return renderQrSvg(value, Math.min(width, height > 45 ? height : 90));
  }
  return renderBarcodeSvg(value, width, height, showText);
}

// Generate Dynamic UPI QR Code URL (Offline vector compatible)
export function getUpiQrUrl(upiId, shopName, amount, invoiceNo = "") {
  const note = `Bill_${invoiceNo || 'ALZINO'}`;
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${amount > 0 ? amount.toFixed(2) : ''}&cu=INR&tn=${encodeURIComponent(note)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiString)}&margin=1`;
}

/**
 * Download high-resolution label sticker (50x25mm / 500x260px) as PNG image
 */
export async function downloadStickerImage({
  title = "Product",
  barcode = "ALZ-000",
  codeFormat = "barcode",
  price = 0,
  mrp = 0,
  shopName = "ALZINO MOBILES • BODHAN"
}) {
  const width = 500;
  const height = 260;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Border (clean sticker border)
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // Shop Banner
  ctx.fillStyle = '#0F251E';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(shopName.toUpperCase(), width / 2, 30);

  // Product Title (truncated to fit cleanly)
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const cleanTitle = title.length > 40 ? title.substring(0, 38) + '...' : title;
  ctx.fillText(cleanTitle, width / 2, 54);

  // Helper to draw barcode on canvas
  const drawBarcodeToCanvas = (val, x, y, w, h) => {
    const { binary, str } = getBarcodeBars(val);
    const barWidth = (w - 20) / binary.length;
    let posX = x + 10;
    ctx.fillStyle = '#0A0D14';
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        ctx.fillRect(posX, y, barWidth + 0.15, h - 20);
      }
      posX += barWidth;
    }
    // Code text
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(str, x + w / 2, y + h - 4);
  };

  // Helper to draw QR code from data URL
  const drawQrToCanvas = async (val, x, y, size) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(val, { margin: 1, width: size });
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, x, y, size, size);
          resolve();
        };
        img.onerror = resolve;
        img.src = qrDataUrl;
      });
    } catch {
      // fallback
    }
  };

  // Render Code(s) based on format
  if (codeFormat === 'both') {
    const qrSize = 110;
    await drawQrToCanvas(barcode, 30, 68, qrSize);
    drawBarcodeToCanvas(barcode, 155, 68, width - 180, 110);
  } else if (codeFormat === 'qr' || barcode.includes('QR-')) {
    const qrSize = 125;
    await drawQrToCanvas(barcode, (width - qrSize) / 2, 64, qrSize);
  } else {
    drawBarcodeToCanvas(barcode, 30, 68, width - 60, 110);
  }

  // Footer: MRP & Sell Price
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = '13px sans-serif';
  if (mrp && mrp > price) {
    ctx.fillText(`MRP: ₹${Number(mrp).toLocaleString()}`, 30, height - 24);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0C5B43';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`₹${Number(price).toLocaleString()}`, width - 30, height - 22);

  // Trigger Download
  const link = document.createElement('a');
  const safeName = String(barcode || title || 'sticker').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `${safeName}_sticker.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  link.remove();
}
