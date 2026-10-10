// ALZINO POS & ERP Initial Data & LocalStorage Database Manager

export const defaultShopConfig = {
  name: "ALZINO",
  tagline: "Smart Mobiles • Used Devices • Electronics • Repairing Lab",
  address: "Station Road, Near Old Bus Stand, Bodhan, Telangana - 503185",
  phone: "+91 98490 82741",
  altPhone: "+91 8467 223344",
  email: "alzino.bodhan@gmail.com",
  gstin: "36AABCA1234M1Z8",
  state: "Telangana",
  stateCode: "36",
  upiId: "alzino.bodhan@okhdfcbank",
  bankName: "HDFC Bank, Bodhan Branch",
  accountNo: "50200038918234",
  ifsc: "HDFC0001823",
  adminPin: "1234",
  termsConditions: "1. Goods once sold will not be returned. 2. Mobile phones carry manufacturer warranty. 3. Used phones carry 15-day testing warranty from ALZINO. 4. Display/Touch screen repair has 30 days shop warranty (no physical damage covered).",
};

export const initialInventory = [];

export const initialWarrantyClaims = [];

export const initialUsedPurchases = [];

export const initialRepairJobs = [];

export const initialCustomers = [];

export const initialSuppliers = [];

export const initialExpenses = [];

export const initialInvoices = [];

// LocalStorage Helper
const STORAGE_PREFIX = "ALZINO_ERP_";

export const getStorageData = (key, fallback) => {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error("Storage error:", e);
    return fallback;
  }
};

export const setStorageData = (key, data) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error("Storage write error:", e);
  }
};
