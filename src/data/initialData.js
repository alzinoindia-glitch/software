// ALZINO POS & ERP Initial Data & LocalStorage Database Manager

export const defaultShopConfig = {
  name: "ALZINO",
  logo: "/alzino-logo.png",
  tagline: "Smart Mobiles • Used Devices • Electronics • Repairing Lab",
  address: "Station Road, Near Old Bus Stand, Bodhan, Telangana - 503185",
  phone: "+91 91212 12292",
  altPhone: "+91 98490 82741",
  email: "alzino.bodhan@gmail.com",
  gstin: "36AABCA1234M1Z8",
  state: "Telangana",
  stateCode: "36",
  upiId: "alzino.bodhan@okhdfcbank",
  qrCodeImage: null,
  upiAccounts: [
    {
      id: "upi-1",
      bankName: "HDFC Bank, Bodhan Branch",
      upiId: "alzino.bodhan@okhdfcbank",
      accountName: "ALZINO MOBILES",
      qrCodeImage: null,
      isDefault: true
    }
  ],
  bankName: "HDFC Bank, Bodhan Branch",
  accountNo: "50200038918234",
  ifsc: "HDFC0001823",
  termsConditions: "1. Goods once sold will not be returned. 2. Mobile phones carry manufacturer warranty. 3. Used phones carry 15-day testing warranty from ALZINO. 4. Display/Touch screen repair has 30 days shop warranty (no physical damage covered).",
  // External Hardware Devices & Printer Defaults
  defaultPrinter: "thermal-80mm", // 'thermal-80mm' | 'thermal-58mm' | 'normal-a4'
  thermalRollWidth: "80mm", // '80mm' | '58mm'
  autoPrintOnCheckout: true,
  normalPrintCopies: 1, // 1 | 2 (Original + Shop Duplicate)
  barcodeScannerBeep: true,
  barcodeScannerAutoAdd: true,
  // SSD Hardware Storage Settings
  storageMode: "ssd-local", // 'ssd-local' (IndexedDB SSD) | 'ssd-mounted' (Direct SSD File)
  ssdAutoSave: true,
  // Customer Portal (alzino.shop) & Social Media
  website: "https://alzino.shop",
  instagram: "@alzino.bodhan",
  instagramUrl: "https://instagram.com/alzino.bodhan",
  whatsappNumber: "+91 91212 12292",
  whatsappUrl: "https://wa.me/919121212292",
  mapsUrl: "https://maps.app.goo.gl/dtJgpyb2mju1U3YM7",
  reviewUrl: "https://g.page/r/CWxRHXGDCdZ7EBM/review",
  storeTimings: "Monday – Sunday: 9:30 AM to 10:00 PM",
  landmark: "Opposite State Bank of India, 200m from Railway Station",
};

// All clean initial states - Zero demo data
export const initialInventory = [];
export const initialWarrantyClaims = [];
export const initialUsedPurchases = [];
export const initialRepairJobs = [];
export const initialCustomers = [];
export const initialSuppliers = [];
export const initialExpenses = [];
export const initialInvoices = [];

// Known Demo IDs & signatures to purge from any legacy local storage
export const DEMO_SIGNATURE_IDS = new Set([
  'PROD-101', 'PROD-102', 'PROD-201', 'PROD-202',
  'PROD-301', 'PROD-302', 'PROD-303', 'PROD-304', 'PROD-305', 'PROD-306', 'PROD-307',
  'PROD-401', 'PROD-402', 'PROD-403',
  'ALZ-INV-0081', 'ALZ-INV-0082',
  'ALZ-REP-1021', 'ALZ-REP-1022', 'ALZ-REP-1023',
  'ALZ-VOUCH-001', 'ALZ-VOUCH-002',
  'CUST-001', 'CUST-002', 'CUST-003',
  'SUPP-001', 'SUPP-002', 'SUPP-003',
  'EXP-001', 'EXP-002', 'EXP-003', 'EXP-004',
  'CLM-001', 'CLM-002', 'CLM-003',
  'SHOW-01', 'SHOW-02', 'SHOW-03', 'SHOW-04', 'SHOW-05', 'SHOW-06', 'SHOW-07', 'SHOW-08'
]);

export const purgeDemoRecords = (list) => {
  if (!Array.isArray(list)) return list;
  return list.filter(item => {
    if (!item || typeof item !== 'object') return false;
    const id = item.id || item.invoiceNo || item.jobId || item.voucherNo;
    if (id && DEMO_SIGNATURE_IDS.has(id)) return false;

    // Filter out known legacy demo product names
    if (item.name === "Apple iPhone 15 (128GB - Black)" || 
        item.name === "Samsung Galaxy S24 5G (256GB - Onyx Black)" ||
        item.name === "Samsung Galaxy S24 5G" ||
        item.name === "Google Pixel 8 Pro (Bay Blue)" ||
        item.name === "Apple iPhone 15 Pro (128GB - Natural Titanium)" ||
        item.name === "Samsung Galaxy S24 Ultra 5G (256GB - Titanium Gray)" ||
        item.name === "OnePlus 12 5G (16GB RAM / 512GB - Flowy Emerald)" ||
        item.name === "Apple AirPods Pro 2nd Gen (Type-C MagSafe)" ||
        item.name === "65W GaN Ultra-Fast Multi-Port Charger (Dual Type-C + USB)" ||
        item.name === "Premium 9D Curved Tempered Glass with Installation" ||
        item.name === "Used iPhone 13 (128GB - Midnight)" ||
        item.name === "Used OnePlus 11R 5G (8GB / 128GB - Sonic Black)" ||
        item.name === "Matte 11D Ceramic Screen Guard (Universal Series)" ||
        item.name === "MagSafe Silicon Magnetic Shockproof Case") {
      return false;
    }

    // Filter out legacy demo contacts
    if (item.customerName === "Mohammed Rizwan" && (item.phone === "98480 12345" || item.customerPhone === "98480 12345")) return false;
    if (item.customerName === "P. Rajeshwar Rao") return false;
    if (item.customerName === "K. Ramesh Kumar" || item.customerName === "Syed Imran" || item.customerName === "Anand Reddy") return false;
    if (item.customerName === "Rahul Sharma" || item.customerName === "Vikram Reddy") return false;
    if (item.sellerName === "Mohammed Rizwan" || item.sellerName === "B. Venkatesh Goud") return false;
    if (item.name === "Hyderabad Mobile Hub" || item.name === "Telangana Electronics Distributor" || item.name === "Sri Balaji Spares & Tools") return false;
    if (item.notes === "Monthly shop rent - Station road premise" || item.notes === "TSSPDCL electricity bill for Sept") return false;

    return true;
  });
};

// LocalStorage Helper
const STORAGE_PREFIX = "ALZINO_ERP_";

export const getStorageData = (key, fallback) => {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key);
    if (!data) return fallback;
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      const cleaned = purgeDemoRecords(parsed);
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(cleaned));
      }
      return cleaned;
    }
    return parsed;
  } catch (e) {
    console.error("Storage error:", e);
    return fallback;
  }
};

import { saveToSsdIndexedDb } from '../utils/syncAndStorageEngine';

export const setStorageData = (key, data) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage write notice (falling back to SSD IndexedDB):", e);
  }
  // Always persist to high-capacity local SSD IndexedDB store
  try {
    saveToSsdIndexedDb(STORAGE_PREFIX + key, data);
  } catch (err) {
    console.debug("IndexedDB SSD persist notice:", err);
  }
};
