/**
 * ALZINO ERP — Hardware Devices Integration Layer
 * External Devices Supported:
 * 1. USB & Bluetooth HID Laser / 2D Barcode Scanners (Keyboard wedge buffer)
 * 2. Thermal Receipt Printers (80mm / 3-inch and 58mm / 2-inch ESC/POS compatible)
 * 3. Normal Standard Printers (A4 / Letter Laser & Inkjet desktop printers)
 */

// 1. Audio Feedback using HTML5 Web Audio API (100% Offline, Zero external files)
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playDeviceBeep(type = 'success') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // Crisp 1800Hz retail scanner confirmation beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'double') {
      // Rapid double chirp for barcode verified
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1900, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);

      setTimeout(() => {
        const ctx2 = getAudioContext();
        if (!ctx2) return;
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        const t2 = ctx2.currentTime;
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2400, t2);
        gain2.gain.setValueAtTime(0.15, t2);
        gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.06);
        osc2.start(t2);
        osc2.stop(t2 + 0.06);
      }, 50);
    } else if (type === 'error') {
      // Low buzz error tone (350Hz)
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'cash') {
      // Dual register chime (1100Hz -> 1650Hz)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1050, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    console.debug('Audio context notice:', err);
  }
}

/**
 * 2. Hardware Barcode Scanner Listener (USB / Bluetooth HID Keyboard Wedge)
 * Detects rapid burst input (< 45ms per character) terminated by 'Enter'
 */
export class HardwareBarcodeScannerEngine {
  constructor({ onScan, soundEnabled = true, minLength = 3, maxIntervalMs = 50 }) {
    this.onScan = onScan;
    this.soundEnabled = soundEnabled;
    this.minLength = minLength;
    this.maxIntervalMs = maxIntervalMs;

    this.buffer = '';
    this.lastKeyTime = 0;
    this.startTime = 0;
    this.isListening = false;
    this.handler = this.handleKeyDown.bind(this);
  }

  start() {
    if (typeof window === 'undefined' || this.isListening) return;
    window.addEventListener('keydown', this.handler, true); // Capture phase
    this.isListening = true;
  }

  stop() {
    if (typeof window === 'undefined' || !this.isListening) return;
    window.removeEventListener('keydown', this.handler, true);
    this.isListening = false;
    this.buffer = '';
  }

  handleKeyDown(e) {
    const now = Date.now();
    const interval = now - this.lastKeyTime;

    // Check if focused element is a multiline text area or explicitly exempted
    const activeEl = document.activeElement;
    const isTextArea = activeEl && activeEl.tagName === 'TEXTAREA';
    if (isTextArea) return;

    if (e.key === 'Enter') {
      // If buffer has enough chars and was typed faster than normal human typing
      const totalDuration = now - this.startTime;
      const charCount = this.buffer.length;
      const avgSpeed = charCount > 0 ? totalDuration / charCount : 999;

      // Most handheld laser scanners burst at 5-35ms per character
      const isScannerSpeed = (avgSpeed < this.maxIntervalMs && charCount >= this.minLength);
      const isBufferValid = this.buffer.trim().length >= this.minLength;

      if (isScannerSpeed || (isBufferValid && !activeEl?.isContentEditable && activeEl?.tagName !== 'INPUT')) {
        const scannedCode = this.buffer.trim();
        this.buffer = '';
        this.lastKeyTime = 0;
        this.startTime = 0;

        if (scannedCode) {
          // Prevent submitting forms or adding newlines
          e.preventDefault();
          e.stopPropagation();

          if (this.soundEnabled) {
            playDeviceBeep('success');
          }

          if (this.onScan) {
            this.onScan(scannedCode);
          }
          return;
        }
      }

      this.buffer = '';
      this.lastKeyTime = 0;
      this.startTime = 0;
      return;
    }

    // Single character keys
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (interval > 120) {
        // Reset buffer if delay is too long (human typing)
        this.buffer = e.key;
        this.startTime = now;
      } else {
        this.buffer += e.key;
      }
      this.lastKeyTime = now;
    }
  }
}

/**
 * 3. Printer Device Profiles & Test Payloads
 */
export const PRINTER_PROFILES = {
  THERMAL_80: {
    id: 'thermal-80mm',
    name: '3-Inch Thermal Roll (80mm)',
    description: 'Standard retail POS receipt printer (Epson, TVS, Citizen, NGX, POS-80)',
    widthMm: 80,
    printableWidthMm: 74,
    charWidth: 48,
    dpi: 203
  },
  THERMAL_58: {
    id: 'thermal-58mm',
    name: '2-Inch Compact Thermal (58mm)',
    description: 'Portable Bluetooth/USB receipt printer (Everycom, POS-58)',
    widthMm: 58,
    printableWidthMm: 50,
    charWidth: 32,
    dpi: 203
  },
  NORMAL_A4: {
    id: 'normal-a4',
    name: 'Normal Printer (A4 GST Tax Invoice)',
    description: 'Standard Desktop/Office Laser, Inkjet or Deskjet printer (HP, Canon, Brother, Epson)',
    widthMm: 210,
    heightMm: 297,
    dpi: 300
  }
};

/**
 * Generate a Sample Test Invoice for Hardware Printer Diagnostics
 */
export function getSampleDeviceTestInvoice(shopConfig) {
  const today = new Date().toISOString().split('T')[0];
  return {
    invoiceNo: 'ALZ-TEST-9999',
    date: today,
    customerName: 'Hardware Diagnostic Test',
    customerPhone: '+91 98490 00000',
    customerAddress: 'Bodhan Retail Store Test',
    paymentMode: 'Cash',
    subTotal: 1599,
    discount: 100,
    taxableAmount: 1270.34,
    cgst: 114.33,
    sgst: 114.33,
    totalTax: 228.66,
    grandTotal: 1499,
    paidAmount: 1499,
    khataDue: 0,
    paymentStatus: 'PAID',
    items: [
      {
        id: 'test-item-1',
        name: 'Device Test Item: 65W Fast Charger',
        hsn: '85044090',
        qty: 1,
        rate: 899,
        gstRate: 18,
        total: 899,
        selectedImeis: ['SN-TEST-8492041']
      },
      {
        id: 'test-item-2',
        name: 'Tempered Screen Guard 11D Edge',
        hsn: '70071900',
        qty: 1,
        rate: 600,
        gstRate: 18,
        total: 600,
        selectedImeis: []
      }
    ],
    notes: 'ALZINO Hardware Device Test — Barcode Scanner, Thermal & Normal Printer Verified OK.'
  };
}
