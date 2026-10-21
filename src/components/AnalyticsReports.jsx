import React, { useState, useMemo } from 'react';
import { getInvoiceReturns, getInvoiceTransactions, isDateInReportRange, sumRefunds, sumReturnProfitAdjustments, sumReplacementRevenueAdjustments, sumReplacementProfitAdjustments, sumReplacementSettlement } from '../utils/returnAccounting';
import { 
  TrendingUp, 
  IndianRupee, 
  Download, 
  Printer, 
  Calendar, 
  DollarSign, 
  PieChart, 
  ShoppingBag, 
  FileSpreadsheet,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Smartphone,
  Wrench,
  Package,
  Layers,
  Search,
  Percent,
  Tag,
  Clock,
  ShieldCheck,
  Calculator,
  Receipt,
  FileText,
  AlertTriangle,
  Coins,
  Check
} from 'lucide-react';

export default function AnalyticsReports({ 
  invoices = [], 
  expenses = [], 
  inventory = [], 
  customers = [], 
  usedPurchases = [],
  repairJobs = [],
  onPrintInvoice = () => {},
  onPrintZReport = () => {},
  shopConfig = {},
  role = 'admin' 
}) {
  // Navigation: 'overview' | 'z-report' | 'gstr1' | 'products'
  const [activeReportTab, setActiveReportTab] = useState('overview');

  const [dateFilter, setDateFilter] = useState('all'); // 'today' | 'month' | 'all'
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('All');
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Day-End Z-Report Cash Drawer State
  const [openingCash, setOpeningCash] = useState(2000); // Default drawer float in Bodhan
  const [denominations, setDenominations] = useState({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    coins: 0
  });
  const [cashierName, setCashierName] = useState('Admin / Cashier');
  const [closingRemarks, setClosingRemarks] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // 1. Filtered Invoices by Date
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (dateFilter === 'today') return inv.date === todayStr;
      if (dateFilter === 'month') return inv.date && inv.date.startsWith(currentMonthStr);
      return true;
    });
  }, [invoices, dateFilter, todayStr, currentMonthStr]);
  const inSelectedRange = (entry) => isDateInReportRange(entry.date, dateFilter, todayStr, currentMonthStr);
  const selectedReturnEntries = useMemo(
    () => getInvoiceReturns(invoices, inSelectedRange),
    [invoices, dateFilter, todayStr, currentMonthStr]
  );
  const selectedTransactionEntries = useMemo(
    () => getInvoiceTransactions(invoices, inSelectedRange),
    [invoices, dateFilter, todayStr, currentMonthStr]
  );
  const selectedRefundTotal = selectedReturnEntries.reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0);
  const selectedCashRefunds = selectedReturnEntries.filter((entry) => entry.refundMethod === 'Cash').reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0);
  const selectedUpiRefunds = selectedReturnEntries.filter((entry) => String(entry.refundMethod || '').includes('UPI')).reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0);
  const selectedCardRefunds = selectedReturnEntries.filter((entry) => String(entry.refundMethod || '').includes('Card')).reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0);
  const selectedCashSettlement = sumReplacementSettlement(invoices, inSelectedRange, (method) => method === 'Cash');
  const selectedUpiSettlement = sumReplacementSettlement(invoices, inSelectedRange, (method) => method.includes('UPI'));
  const selectedCardSettlement = sumReplacementSettlement(invoices, inSelectedRange, (method) => method.includes('Card'));
  const selectedPosSettlement = sumReplacementSettlement(invoices, inSelectedRange, (method, _direction, entry) => method !== 'Khata credit' && method !== 'Khata due' && !entry.isRefurbishedResale && !entry.isRepairInvoice && entry.originalCategory !== 'Used Mobiles' && entry.originalCategory !== 'Repair Services');
  const selectedRefurbSettlement = sumReplacementSettlement(invoices, inSelectedRange, (method, _direction, entry) => method !== 'Khata credit' && method !== 'Khata due' && (entry.isRefurbishedResale || entry.originalCategory === 'Used Mobiles'));
  const selectedRepairSettlement = sumReplacementSettlement(invoices, inSelectedRange, (method, _direction, entry) => method !== 'Khata credit' && method !== 'Khata due' && (entry.isRepairInvoice || entry.repairJobRef || entry.originalCategory === 'Repair Services'));
  const selectedKhataSettlement = sumReplacementSettlement(invoices, inSelectedRange, (method) => method === 'Khata due' || method === 'Khata credit');

  // 2. Filtered Expenses by Date
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (dateFilter === 'today') return exp.date === todayStr;
      if (dateFilter === 'month') return exp.date && exp.date.startsWith(currentMonthStr);
      return true;
    });
  }, [expenses, dateFilter, todayStr, currentMonthStr]);

  // 3. Filtered Inward Purchases (Outflow for buying used phones)
  const filteredUsedPurchases = useMemo(() => {
    return usedPurchases.filter(p => {
      if (dateFilter === 'today') return p.date === todayStr;
      if (dateFilter === 'month') return p.date && p.date.startsWith(currentMonthStr);
      return true;
    });
  }, [usedPurchases, dateFilter, todayStr, currentMonthStr]);

  // =========================================================================
  // CASH INFLOW TRACKING
  // =========================================================================
  // Inflow from POS product sales
  const posInflow = filteredInvoices
    .filter(i => !i.isRefurbishedResale && !i.isRepairInvoice)
    .reduce((s, i) => s + (Number(i.paidAmount) || 0), 0) - selectedReturnEntries
      .filter((entry) => entry.refundMethod !== 'Khata credit' && !entry.isRefurbishedResale && !entry.isRepairInvoice && entry.originalCategory !== 'Used Mobiles' && entry.originalCategory !== 'Repair Services')
      .reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0) + selectedPosSettlement;

  // Inflow from Refurbished Mobiles sales
  const refurbInflow = filteredInvoices
    .filter(i => i.isRefurbishedResale || (i.items && i.items.some(it => it.category === 'Used Mobiles')))
    .reduce((s, i) => s + (Number(i.paidAmount) || 0), 0) - selectedReturnEntries
      .filter((entry) => entry.refundMethod !== 'Khata credit' && (entry.isRefurbishedResale || entry.originalCategory === 'Used Mobiles'))
      .reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0) + selectedRefurbSettlement;

  // Inflow from Mobile Repairs & Servicing
  const repairInflow = filteredInvoices
    .filter(i => i.isRepairInvoice || i.repairJobRef || (i.items && i.items.some(it => it.category === 'Repair Services')))
    .reduce((s, i) => s + (Number(i.paidAmount) || 0), 0) - selectedReturnEntries
      .filter((entry) => entry.refundMethod !== 'Khata credit' && (entry.isRepairInvoice || entry.repairJobRef || entry.originalCategory === 'Repair Services'))
      .reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0) + selectedRepairSettlement;

  // Repair intake advance payments collected
  const repairAdvancesCollected = repairJobs
    .filter(j => {
      if (dateFilter === 'today') return j.date === todayStr;
      if (dateFilter === 'month') return j.date && j.date.startsWith(currentMonthStr);
      return true;
    })
    .reduce((s, j) => s + (Number(j.advancePaid) || 0), 0);

  const totalCashInflow = posInflow + refurbInflow + repairInflow;

  // Breakdown by payment instrument
  const cashInflow = filteredInvoices.filter(i => i.paymentMode === 'Cash').reduce((s, i) => s + (Number(i.paidAmount) || 0), 0) - selectedCashRefunds + selectedCashSettlement;
  const upiInflow = filteredInvoices.filter(i => i.paymentMode?.includes('UPI')).reduce((s, i) => s + (Number(i.paidAmount) || 0), 0) - selectedUpiRefunds + selectedUpiSettlement;
  const cardInflow = filteredInvoices.filter(i => i.paymentMode === 'Card' || i.paymentMode?.includes('Card')).reduce((s, i) => s + (Number(i.paidAmount) || 0), 0) - selectedCardRefunds + selectedCardSettlement;
  const totalKhataGiven = filteredInvoices.reduce((s, i) => s + (Number(i.khataDue) || 0), 0) - selectedReturnEntries.filter((entry) => entry.refundMethod === 'Khata credit').reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0) + selectedKhataSettlement;

  // =========================================================================
  // CASH OUTFLOW TRACKING
  // =========================================================================
  // Admin recorded operational expenses (Rent, Electricity, Salaries, Tea, Logistics)
  const totalExpensesAmt = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Cash paid out to customers for buying second-hand devices
  const usedPhoneBuyPayouts = filteredUsedPurchases.reduce((sum, p) => sum + (Number(p.buyPrice) || 0), 0);

  const totalCashOutflow = totalExpensesAmt + usedPhoneBuyPayouts;

  // Net Cash Register Balance (Inflow - Outflow)
  const netCashFlow = totalCashInflow - totalCashOutflow;

  // =========================================================================
  // FINANCIAL P&L AND PROFIT TRACKING (MRP vs SELLING vs BUY COST)
  // =========================================================================
  const totalRevenue = filteredInvoices.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0) - selectedRefundTotal + sumReplacementRevenueAdjustments(invoices, inSelectedRange);
  const totalGrossProfit = filteredInvoices.reduce((sum, i) => sum + (Number(i.totalProfit) || 0), 0) - sumReturnProfitAdjustments(invoices, inSelectedRange) + sumReplacementProfitAdjustments(invoices, inSelectedRange);
  const netProfit = totalGrossProfit - totalExpensesAmt;

  // =========================================================================
  // INDIVIDUAL PRODUCT PROFIT ANALYSIS & CATEGORY AGGREGATION
  // =========================================================================
  const productAnalytics = useMemo(() => {
    const map = {};

    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const key = item.name?.trim() || 'Unknown Product';
        const qty = Number(item.qty) || 1;
        const sellTotal = Number(item.total) || (Number(item.rate) * qty) || 0;
        const unitSell = qty > 0 ? sellTotal / qty : Number(item.rate) || 0;
        
        // Find matching inventory item for MRP and Buy Price reference if not stored on item
        const invMatch = inventory.find(invIt => invIt.id === item.id || invIt.name?.toLowerCase() === item.name?.toLowerCase());
        const unitBuy = item.buyPrice !== undefined ? Number(item.buyPrice) : (invMatch?.buyPrice || Math.round(unitSell * 0.7));
        const unitMrp = invMatch?.mrp || item.mrp || Math.round(unitSell * 1.12);
        const category = item.category || invMatch?.category || (inv.isRepairInvoice ? 'Repair Services' : 'Mobile Accessories');
        const profit = item.profit !== undefined ? Number(item.profit) : (sellTotal - (unitBuy * qty));

        if (!map[key]) {
          map[key] = {
            name: key,
            category,
            brand: invMatch?.brand || 'ALZINO',
            unitsSold: 0,
            unitMrp,
            totalMrp: 0,
            unitBuy,
            totalBuyCost: 0,
            totalRevenue: 0,
            totalProfit: 0,
            avgSellPrice: 0,
          };
        }

        map[key].unitsSold += qty;
        map[key].totalMrp += (unitMrp * qty);
        map[key].totalBuyCost += (unitBuy * qty);
        map[key].totalRevenue += sellTotal;
        map[key].totalProfit += profit;
      });
    });

    selectedReturnEntries.forEach((entry) => {
      const key = entry.originalProductName?.trim() || 'Returned Product';
      const qty = Number(entry.quantity || 0);
      const returnedAmount = Number(entry.refundAmount || 0);
      const unitBuy = Number(entry.originalUnitCost || 0);
      const profitAdjustment = Number(entry.originalUnitProfit || 0) * qty + (entry.restocked ? 0 : unitBuy * qty);
      const invMatch = inventory.find((invIt) => String(invIt.id) === String(entry.originalProductId) || invIt.name?.toLowerCase() === key.toLowerCase());
      const category = entry.originalCategory || invMatch?.category || 'Mobile Accessories';
      if (!map[key]) map[key] = { name: key, category, brand: invMatch?.brand || 'ALZINO', unitsSold: 0, unitMrp: invMatch?.mrp || 0, totalMrp: 0, unitBuy, totalBuyCost: 0, totalRevenue: 0, totalProfit: 0, avgSellPrice: 0 };
      map[key].unitsSold -= qty;
      map[key].totalRevenue -= returnedAmount;
      map[key].totalProfit -= profitAdjustment;
      if (entry.restocked) map[key].totalBuyCost -= unitBuy * qty;
    });
    selectedTransactionEntries.filter((entry) => entry.type === 'replacement').forEach((entry) => {
      const qty = Number(entry.quantity || 0);
      const originalName = entry.originalProductName?.trim() || 'Returned Product';
      const originalMatch = inventory.find((invIt) => String(invIt.id) === String(entry.originalProductId) || invIt.name?.toLowerCase() === originalName.toLowerCase());
      const original = map[originalName] || (map[originalName] = { name: originalName, category: entry.originalCategory || originalMatch?.category || 'Mobile Accessories', brand: originalMatch?.brand || 'ALZINO', unitsSold: 0, unitMrp: originalMatch?.mrp || 0, totalMrp: 0, unitBuy: Number(entry.originalUnitCost || 0), totalBuyCost: 0, totalRevenue: 0, totalProfit: 0, avgSellPrice: 0 });
      original.unitsSold -= qty;
      original.totalRevenue -= Number(entry.originalUnitPaid || 0) * qty;
      original.totalProfit -= Number(entry.originalUnitProfit || 0) * qty;
      if (entry.restocked) original.totalBuyCost -= Number(entry.originalUnitCost || 0) * qty;

      (entry.replacements || (entry.replacement ? [entry.replacement] : [])).forEach((replacementLine) => {
        const replacementName = replacementLine.productName?.trim() || 'Replacement Product';
        const replacementMatch = inventory.find((invIt) => String(invIt.id) === String(replacementLine.productId) || invIt.name?.toLowerCase() === replacementName.toLowerCase());
        const replacement = map[replacementName] || (map[replacementName] = { name: replacementName, category: replacementLine.category || replacementMatch?.category || 'Mobile Accessories', brand: replacementMatch?.brand || 'ALZINO', unitsSold: 0, unitMrp: replacementMatch?.mrp || 0, totalMrp: 0, unitBuy: Number(replacementLine.unitCost || 0), totalBuyCost: 0, totalRevenue: 0, totalProfit: 0, avgSellPrice: 0 });
        replacement.unitsSold += Number(replacementLine.quantity || 0);
        replacement.totalRevenue += Number(replacementLine.unitPrice || 0) * Number(replacementLine.quantity || 0);
        replacement.totalProfit += Number(replacementLine.unitProfit || 0) * Number(replacementLine.quantity || 0);
        replacement.totalBuyCost += Number(replacementLine.unitCost || 0) * Number(replacementLine.quantity || 0);
      });
    });

    return Object.values(map).map(p => {
      p.avgSellPrice = p.unitsSold > 0 ? Math.round(p.totalRevenue / p.unitsSold) : 0;
      p.marginPct = p.totalRevenue > 0 ? Math.round((p.totalProfit / p.totalRevenue) * 100) : 0;
      p.discountFromMrp = p.totalMrp > p.totalRevenue ? Math.round(((p.totalMrp - p.totalRevenue) / p.totalMrp) * 100) : 0;
      return p;
    });
  }, [filteredInvoices, inventory, selectedReturnEntries, selectedTransactionEntries]);

  // Aggregate Category Level Stats
  const categoryStats = useMemo(() => {
    const cats = ['New Mobiles', 'Used Mobiles', 'Mobile Accessories', 'Home Appliances', 'Repair Services'];
    return cats.map(catName => {
      const itemsInCat = productAnalytics.filter(p => p.category === catName);
      const catRevenue = itemsInCat.reduce((s, p) => s + p.totalRevenue, 0);
      const catCost = itemsInCat.reduce((s, p) => s + p.totalBuyCost, 0);
      const catProfit = itemsInCat.reduce((s, p) => s + p.totalProfit, 0);
      const catUnits = itemsInCat.reduce((s, p) => s + p.unitsSold, 0);
      const margin = catRevenue > 0 ? Math.round((catProfit / catRevenue) * 100) : 0;

      return {
        category: catName,
        unitsSold: catUnits,
        revenue: catRevenue,
        cost: catCost,
        profit: catProfit,
        marginPct: margin,
        productCount: itemsInCat.length
      };
    });
  }, [productAnalytics]);

  // Total Catalog MRP of Sold items vs Realized Selling Price
  const totalMrpValue = productAnalytics.reduce((s, p) => s + p.totalMrp, 0);
  const totalCustomerSavings = Math.max(0, totalMrpValue - totalRevenue);
  const avgDiscountGivenPct = totalMrpValue > 0 ? Math.round((totalCustomerSavings / totalMrpValue) * 100) : 0;

  // Filter individual product table by selected category & search
  const filteredProductsTable = useMemo(() => {
    return productAnalytics.filter(p => {
      const matchesCat = selectedCategoryTab === 'All' || p.category === selectedCategoryTab;
      const q = productSearchTerm.toLowerCase().trim();
      if (!q) return matchesCat;
      return matchesCat && (
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [productAnalytics, selectedCategoryTab, productSearchTerm]);

  // =========================================================================
  // DAY-END CASH DRAWER (Z-REPORT) CALCULATIONS
  // =========================================================================
  const todayInvoices = useMemo(() => invoices.filter(inv => inv.date === todayStr), [invoices, todayStr]);
  const todayReportReturn = (entry) => String(entry.date || '').slice(0, 10) === todayStr;
  const todayCashRefundTotal = sumRefunds(invoices, todayReportReturn, (method) => method === 'Cash');
  const todayCashSales = useMemo(() => {
    return todayInvoices
      .filter(inv => inv.paymentMode === 'Cash' || inv.paymentMode?.includes('Cash'))
      .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) - todayCashRefundTotal;
  }, [todayInvoices, todayCashRefundTotal]);

  const todayUpiSales = useMemo(() => {
    return todayInvoices
      .filter(inv => inv.paymentMode?.includes('UPI'))
      .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) - sumRefunds(invoices, todayReportReturn, (method) => String(method).includes('UPI'));
  }, [todayInvoices, todayReportReturn, invoices]);

  const todayCardSales = useMemo(() => {
    return todayInvoices
      .filter(inv => inv.paymentMode === 'Card' || inv.paymentMode?.includes('Card'))
      .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) - sumRefunds(invoices, todayReportReturn, (method) => String(method).includes('Card'));
  }, [todayInvoices, todayReportReturn, invoices]);

  const todayExpensesList = useMemo(() => expenses.filter(e => e.date === todayStr), [expenses, todayStr]);
  const todayCashExpenses = useMemo(() => {
    return todayExpensesList
      .filter(e => e.paidBy === 'Cash')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [todayExpensesList]);

  const todayUsedPhonePayouts = useMemo(() => {
    return usedPurchases
      .filter(p => p.date === todayStr && p.paymentMode === 'Cash')
      .reduce((sum, p) => sum + (Number(p.buyPrice) || 0), 0);
  }, [usedPurchases, todayStr]);

  const expectedCashInDrawer = Math.max(0, openingCash + todayCashSales - todayCashExpenses - todayUsedPhonePayouts);

  const totalCountedCash = (
    (Number(denominations[500]) || 0) * 500 +
    (Number(denominations[200]) || 0) * 200 +
    (Number(denominations[100]) || 0) * 100 +
    (Number(denominations[50]) || 0) * 50 +
    (Number(denominations[20]) || 0) * 20 +
    (Number(denominations[10]) || 0) * 10 +
    (Number(denominations.coins) || 0)
  );

  const cashDiscrepancy = totalCountedCash - expectedCashInDrawer;

  // =========================================================================
  // GSTR-1 TAX DATA CALCULATIONS (B2B, B2C, HSN SUMMARY)
  // =========================================================================
  const b2bInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => 
      !inv.isNonGst && inv.customerGstin && inv.customerGstin.trim().length >= 10
    );
  }, [filteredInvoices]);

  const b2cInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => !b2bInvoices.includes(inv));
  }, [filteredInvoices, b2bInvoices]);

  const b2bTaxableTotal = b2bInvoices.reduce((s, inv) => s + (Number(inv.taxableAmount) || Number(inv.subtotal) || 0), 0);
  const b2bCgstTotal = b2bInvoices.reduce((s, inv) => s + (Number(inv.cgstTotal) || 0), 0);
  const b2bSgstTotal = b2bInvoices.reduce((s, inv) => s + (Number(inv.sgstTotal) || 0), 0);
  const b2bGrandTotal = b2bInvoices.reduce((s, inv) => s + (Number(inv.grandTotal) || 0), 0);

  const b2cTaxableTotal = b2cInvoices.reduce((s, inv) => s + (Number(inv.taxableAmount) || Number(inv.subtotal) || 0), 0);
  const b2cCgstTotal = b2cInvoices.reduce((s, inv) => s + (Number(inv.cgstTotal) || 0), 0);
  const b2cSgstTotal = b2cInvoices.reduce((s, inv) => s + (Number(inv.sgstTotal) || 0), 0);
  const b2cGrandTotal = b2cInvoices.reduce((s, inv) => s + (Number(inv.grandTotal) || 0), 0);

  const totalGstLiability = b2bCgstTotal + b2bSgstTotal + b2cCgstTotal + b2cSgstTotal;

  // HSN Summary Aggregation
  const hsnSummaryList = useMemo(() => {
    const map = {};
    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach(it => {
        const hsn = it.hsn || '851712';
        if (!map[hsn]) {
          map[hsn] = {
            hsn,
            desc: hsn === '851712' ? 'Smartphones & Mobile Devices' : hsn === '851770' ? 'Accessories & Spare Parts' : hsn === '8516' ? 'Home Appliances' : 'Consumer Goods',
            uqc: 'NOS',
            qty: 0,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            totalTax: 0
          };
        }
        const itQty = Number(it.qty) || 1;
        const itTaxable = Number(it.taxable) || Number(it.total) || 0;
        const itRate = Number(it.gstRate) || (inv.isNonGst ? 0 : 18);
        const itTax = inv.isNonGst ? 0 : Math.round((itTaxable * itRate) / 100);

        map[hsn].qty += itQty;
        map[hsn].taxable += itTaxable;
        map[hsn].cgst += Math.round(itTax / 2);
        map[hsn].sgst += Math.round(itTax / 2);
        map[hsn].totalTax += itTax;
      });
    });
    return Object.values(map);
  }, [filteredInvoices]);

  // Export GSTR-1 to CSV (CA Ready Format)
  const handleExportGstr1CSV = () => {
    let csv = "data:text/csv;charset=utf-8,";
    csv += "Section,Invoice Number,Invoice Date,Customer Name,Customer GSTIN,Place of Supply,Reverse Charge,Taxable Value,CGST Amount,SGST Amount,IGST Amount,Total Invoice Value\n";

    b2bInvoices.forEach(inv => {
      const taxable = Number(inv.taxableAmount) || Number(inv.subtotal) || 0;
      csv += `"B2B","${inv.invoiceNo}","${inv.date}","${inv.customerName || 'B2B Client'}","${inv.customerGstin}","36-Telangana","N",${taxable},${inv.cgstTotal || 0},${inv.sgstTotal || 0},0,${inv.grandTotal}\n`;
    });

    b2cInvoices.forEach(inv => {
      const taxable = Number(inv.taxableAmount) || Number(inv.subtotal) || 0;
      csv += `"B2C Small","${inv.invoiceNo}","${inv.date}","${inv.customerName || 'Retail Customer'}","URP","36-Telangana","N",${taxable},${inv.cgstTotal || 0},${inv.sgstTotal || 0},0,${inv.grandTotal}\n`;
    });

    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `ALZINO_GSTR1_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Complete Financial & Product Analytics to CSV
  const handleExportAnalyticsCSV = () => {
    let csv = "data:text/csv;charset=utf-8,";
    csv += "Product Name,Category,Brand,Units Sold,Unit MRP,Avg Selling Price,Buy Cost,Unit Profit,Total Profit,Margin %,MRP Discount %\n";

    productAnalytics.forEach(p => {
      const unitProfit = p.avgSellPrice - p.unitBuy;
      const row = [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${p.brand}"`,
        p.unitsSold,
        p.unitMrp,
        p.avgSellPrice,
        p.unitBuy,
        unitProfit,
        p.totalProfit,
        `${p.marginPct}%`,
        `${p.discountFromMrp}%`
      ];
      csv += row.join(",") + "\n";
    });

    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `ALZINO_Product_Profit_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      
      {/* Top Header & Period Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Financial Intelligence & Store Reports</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--status-green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            Net Store Profit: ₹{netProfit.toLocaleString()}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period selector */}
          <div className="segmented-bar">
            {[
              { id: 'today', label: "Today" },
              { id: 'month', label: "This Month" },
              { id: 'all', label: "All Time" },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setDateFilter(p.id)}
                className={`segmented-item ${dateFilter === p.id ? 'active-blue' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {activeReportTab === 'gstr1' ? (
            <button
              onClick={handleExportGstr1CSV}
              className="btn-primary"
              style={{ padding: '0.38rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={14} />
              <span>Export GSTR-1 CSV (CA Format)</span>
            </button>
          ) : (
            <button
              onClick={handleExportAnalyticsCSV}
              className="btn-secondary"
              style={{ padding: '0.38rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Download product-wise profit analysis in CSV"
            >
              <FileSpreadsheet size={14} color="#10B981" />
              <span>Export P&L</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="segmented-bar" style={{ alignSelf: 'flex-start', flexWrap: 'wrap', gap: '0.25rem' }}>
        {[
          { id: 'overview', label: '📊 Financial Overview & P&L', icon: TrendingUp },
          { id: 'z-report', label: '💵 Day-End Cash Z-Report', icon: Calculator },
          { id: 'gstr1', label: '📑 GSTR-1 Tax Return (CA Export)', icon: FileText },
          { id: 'products', label: '🏷️ Product Margins & Pricing', icon: Tag },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className={`segmented-item ${activeReportTab === tab.id ? 'active-blue' : ''}`}
            style={{ fontSize: '0.82rem', padding: '0.38rem 0.85rem' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. CASH INFLOW & CASH OUTFLOW DUAL REGISTER (OVERVIEW TAB)                */}
      {/* ========================================================================= */}
      {activeReportTab === 'overview' && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem'
          }}>
        {/* CASH INFLOW CARD */}
        <div className="illoca-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <ArrowDownRight size={18} color="var(--status-green)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--status-green)' }}>
                Total Cash Inflow (Money Received)
              </h3>
            </div>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--status-green)' }}>
              ₹{totalCashInflow.toLocaleString()}
            </span>
          </div>

          {/* Inflow Streams Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• POS Products:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{posInflow.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• Refurbished Mobiles:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{refurbInflow.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• Repair Lab Services:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{repairInflow.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '0.35rem', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Cash ₹{cashInflow.toLocaleString()} | UPI ₹{upiInflow.toLocaleString()} | Card ₹{cardInflow.toLocaleString()}</span>
              {totalKhataGiven > 0 && <span style={{ color: 'var(--status-red)', fontSize: '0.74rem', fontWeight: 600 }}>Due: ₹{totalKhataGiven.toLocaleString()}</span>}
            </div>
          </div>
        </div>

        {/* CASH OUTFLOW CARD */}
        <div className="illoca-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-red)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <ArrowUpRight size={18} color="var(--status-red)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--status-red)' }}>
                Total Cash Outflow (Money Paid Out)
              </h3>
            </div>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--status-red)' }}>
              ₹{totalCashOutflow.toLocaleString()}
            </span>
          </div>

          {/* Outflow Streams Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• Store Expenses:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-red)' }}>₹{totalExpensesAmt.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• Used Phone Buyouts:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-red)' }}>₹{usedPhoneBuyPayouts.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '0.35rem', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>NET BALANCE:</span>
              <strong style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.95rem',
                color: netCashFlow >= 0 ? 'var(--status-green)' : 'var(--status-red)'
              }}>
                {netCashFlow >= 0 ? `+₹${netCashFlow.toLocaleString()}` : `-₹${Math.abs(netCashFlow).toLocaleString()}`}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MRP vs SELLING PRICE vs BUY COST PRICING INTELLIGENCE                   */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem'
      }}>
        {/* Total Catalog MRP */}
        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Printed MRP Value
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            ₹{totalMrpValue.toLocaleString()}
          </div>
        </div>

        {/* Realized Selling Price */}
        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Selling Revenue
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
            ₹{totalRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-green)', fontWeight: 600, marginTop: '0.2rem' }}>
            Avg discount: {avgDiscountGivenPct}%
          </div>
        </div>

        {/* Customer MRP Savings */}
        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Customer Savings Below MRP
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#8B5CF6', marginTop: '0.2rem' }}>
            ₹{totalCustomerSavings.toLocaleString()}
          </div>
        </div>

        {/* Total Realized Gross Profit */}
        <div className="stat-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Gross Profit
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--status-green)', marginTop: '0.2rem' }}>
            ₹{totalGrossProfit.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-green)', fontWeight: 600, marginTop: '0.2rem' }}>
            {totalRevenue > 0 ? `${Math.round((totalGrossProfit / totalRevenue) * 100)}% Margin` : ''}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CATEGORY LEVEL PROFIT & VOLUME CARDS                                   */}
      {/* ========================================================================= */}
      <div className="illoca-card" style={{ padding: '1.25rem' }}>
        <div style={{ marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
            Category-Wise Profit & Margin
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
          {categoryStats.map(cat => (
            <div
              key={cat.category}
              onClick={() => setSelectedCategoryTab(cat.category === selectedCategoryTab ? 'All' : cat.category)}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: selectedCategoryTab === cat.category ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: selectedCategoryTab === cat.category ? 'var(--illoca-blue-subtle)' : 'var(--surface-primary)',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)'
              }}
              title={`Click to filter individual products for ${cat.category}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                  {cat.category}
                </span>
                <span className="mono-tag" style={{ fontSize: '0.66rem' }}>
                  {cat.unitsSold} sold
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Revenue:</div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
                  ₹{cat.revenue.toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.2rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Profit:</div>
                <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--status-green)', fontSize: '0.92rem' }}>
                  +₹{cat.profit.toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed var(--border-color)' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Margin %:</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                  {cat.marginPct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )}

  {/* ========================================================================= */}
  {/* TAB 2: DAY-END CASH DRAWER RECONCILIATION (Z-REPORT)                       */}
  {/* ========================================================================= */}
  {activeReportTab === 'z-report' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      
      {/* Top Banner with Print Action */}
      <div className="illoca-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--accent-primary)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              Day-End Cash Drawer Reconciliation (Z-Report)
            </h3>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Date: <strong>{todayStr}</strong> • Bodhan Counter Sign-off. Verify physical cash in drawer against counter billing.
          </p>
        </div>

        <button
          onClick={() => {
            onPrintZReport({
              date: todayStr,
              openingCash,
              todayCashSales,
              todayUpiSales,
              todayCardSales,
              todayCashExpenses,
              todayUsedPhonePayouts,
              expectedCashInDrawer,
              denominations,
              totalCountedCash,
              cashDiscrepancy,
              cashierName,
              closingRemarks,
              shopConfig
            });
          }}
          className="btn-primary"
          style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}
        >
          <Printer size={15} />
          <span>Print Day-End Z-Report Slip</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.25rem' }}>
        
        {/* Left: System Cash Drawer Flow */}
        <div className="illoca-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
            1. System Calculated Cash Drawer Flow
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', background: 'var(--surface-primary)', borderRadius: 'var(--radius-sm)' }}>
              <span>Opening Cash in Drawer (Float):</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>₹</span>
                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
                  className="input-field"
                  style={{ width: '100px', padding: '0.25rem 0.5rem', fontWeight: 700, textAlign: 'right' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.65rem', background: 'rgba(31, 110, 72, 0.08)', borderRadius: 'var(--radius-sm)', color: 'var(--status-green)' }}>
              <span>(+) Today's Cash Collected (POS Sales):</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>+₹{todayCashSales.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.65rem', background: 'rgba(211, 63, 60, 0.08)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger, #D33F3C)' }}>
              <span>(-) Cash Paid Out for Shop Expenses:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>-₹{todayCashExpenses.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.65rem', background: 'rgba(211, 63, 60, 0.08)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger, #D33F3C)' }}>
              <span>(-) Cash Paid for Buying Second-hand Mobiles:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>-₹{todayUsedPhonePayouts.toLocaleString()}</strong>
            </div>

            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>EXPECTED CASH IN DRAWER:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                ₹{expectedCashInDrawer.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Digital Collections (Not in physical drawer) */}
          <div style={{ background: 'var(--surface-primary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Digital Collections Today (Bank Account / UPI / Card):
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span>• UPI Payments (PhonePe / GPay / Paytm):</span>
              <strong>₹{todayUpiSales.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>• Card Machine (POS Swipes):</span>
              <strong>₹{todayCardSales.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Right: Physical Denomination Counter */}
        <div className="illoca-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
              2. Physical Cash Tender Counter
            </h4>
            <span className="mono-tag" style={{ fontSize: '0.72rem' }}>Count Notes in Hand</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.82rem' }}>
            {[500, 200, 100, 50, 20, 10].map(val => (
              <div key={val} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.55rem', background: 'var(--surface-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 700, minWidth: '55px' }}>₹{val} x</span>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={denominations[val] || ''}
                  onChange={(e) => setDenominations({ ...denominations, [val]: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="input-field"
                  style={{ width: '65px', padding: '0.2rem 0.4rem', textAlign: 'center', fontWeight: 700 }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', minWidth: '60px', textAlign: 'right', fontWeight: 600 }}>
                  = ₹{((denominations[val] || 0) * val).toLocaleString()}
                </span>
              </div>
            ))}

            {/* Coins */}
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.55rem', background: 'var(--surface-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontWeight: 700 }}>Loose Coins (Total ₹):</span>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={denominations.coins || ''}
                onChange={(e) => setDenominations({ ...denominations, coins: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="input-field"
                style={{ width: '100px', padding: '0.2rem 0.4rem', textAlign: 'right', fontWeight: 700 }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', minWidth: '60px', textAlign: 'right', fontWeight: 600 }}>
                = ₹{(Number(denominations.coins) || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Total Counted vs Discrepancy */}
          <div style={{ marginTop: '0.35rem', padding: '0.85rem', background: 'var(--surface-primary)', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 800 }}>TOTAL PHYSICAL CASH COUNTED:</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                ₹{totalCountedCash.toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '0.45rem' }}>
              <span>Drawer Discrepancy:</span>
              {cashDiscrepancy === 0 ? (
                <span className="mono-tag chip-green" style={{ fontWeight: 800, padding: '0.25rem 0.6rem' }}>
                  ✓ Perfect Match (₹0 Difference)
                </span>
              ) : cashDiscrepancy > 0 ? (
                <span className="mono-tag chip-amber" style={{ fontWeight: 800, padding: '0.25rem 0.6rem' }}>
                  🟡 Cash Excess: +₹{cashDiscrepancy.toLocaleString()}
                </span>
              ) : (
                <span className="mono-tag chip-red" style={{ fontWeight: 800, padding: '0.25rem 0.6rem' }}>
                  🔴 Cash Shortage: -₹{Math.abs(cashDiscrepancy).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Cashier Sign-off details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.2rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Cashier / Signee Name</label>
              <input
                type="text"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.8rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Closing Remarks</label>
              <input
                type="text"
                placeholder="e.g. Handed to owner"
                value={closingRemarks}
                onChange={(e) => setClosingRemarks(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.8rem' }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )}

  {/* ========================================================================= */}
  {/* TAB 3: GSTR-1 TAX RETURN & CHARTERED ACCOUNTANT (CA) EXPORT               */}
  {/* ========================================================================= */}
  {activeReportTab === 'gstr1' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top GST Summary Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="illoca-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>TOTAL TAXABLE VALUE</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, marginTop: '0.25rem' }}>
            ₹{(b2bTaxableTotal + b2cTaxableTotal).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Net value subject to GST</div>
        </div>

        <div className="illoca-card" style={{ padding: '1rem', borderLeft: '4px solid var(--status-green)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>TOTAL CGST (CENTRAL)</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--status-green)', marginTop: '0.25rem' }}>
            ₹{(b2bCgstTotal + b2cCgstTotal).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>9% Rate on eligible items</div>
        </div>

        <div className="illoca-card" style={{ padding: '1rem', borderLeft: '4px solid var(--status-green)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>TOTAL SGST (TELANGANA 36)</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--status-green)', marginTop: '0.25rem' }}>
            ₹{(b2bSgstTotal + b2cSgstTotal).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>9% State Tax</div>
        </div>

        <div className="illoca-card" style={{ padding: '1rem', borderLeft: '4px solid var(--status-amber)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>TOTAL OUTPUT GST PAYABLE</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--status-amber-text, #AC7C20)', marginTop: '0.25rem' }}>
            ₹{totalGstLiability.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Payable to GST Department</div>
        </div>
      </div>

      {/* Table 1: B2B Invoices (Table 4) */}
      <div className="illoca-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
              1. GSTR-1 Table 4: B2B Invoices (Sales to GST Registered Dealers)
            </h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Invoices issued with customer GSTIN (Mandatory for input tax credit claiming).
            </div>
          </div>
          <span className="mono-tag chip-blue">{b2bInvoices.length} B2B Invoices</span>
        </div>

        {b2bInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            No B2B sales in this date range. (All sales were retail counter B2C customers).
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Customer GSTIN</th>
                  <th style={{ textAlign: 'right' }}>Taxable Value</th>
                  <th style={{ textAlign: 'right' }}>CGST (9%)</th>
                  <th style={{ textAlign: 'right' }}>SGST (9%)</th>
                  <th style={{ textAlign: 'right' }}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {b2bInvoices.map(inv => (
                  <tr key={inv.id || inv.invoiceNo}>
                    <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{inv.invoiceNo}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.date}</td>
                    <td style={{ fontWeight: 700 }}>{inv.customerName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{inv.customerGstin}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{(Number(inv.taxableAmount) || Number(inv.subtotal) || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>₹{(Number(inv.cgstTotal) || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>₹{(Number(inv.sgstTotal) || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>₹{(Number(inv.grandTotal) || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Table 2: B2C Small Invoices Summary (Table 7) */}
      <div className="illoca-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
              2. GSTR-1 Table 7: B2C Small (Retail Counter Walk-in Sales)
            </h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Intrastate retail sales in Telangana (State Code: 36) to consumers without GSTIN.
            </div>
          </div>
          <span className="mono-tag chip-green">{b2cInvoices.length} Retail Invoices</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Place of Supply</th>
                <th>Applicable Tax Rate</th>
                <th style={{ textAlign: 'right' }}>Total Taxable Value</th>
                <th style={{ textAlign: 'right' }}>CGST Amount</th>
                <th style={{ textAlign: 'right' }}>SGST Amount</th>
                <th style={{ textAlign: 'right' }}>Total Retail Invoice Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>B2C Others (Counter Retail)</strong></td>
                <td>36-Telangana</td>
                <td>18% (Smartphones & Electronics)</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{b2cTaxableTotal.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>₹{b2cCgstTotal.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>₹{b2cSgstTotal.toLocaleString()}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-primary)' }}>₹{b2cGrandTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 3: HSN Summary (Table 12) */}
      <div className="illoca-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
              3. GSTR-1 Table 12: HSN Summary of Outward Supplies
            </h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Mandatory HSN-wise aggregation required by GST department.
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th>HSN Code</th>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>UQC</th>
                <th style={{ textAlign: 'center' }}>Total Qty</th>
                <th style={{ textAlign: 'right' }}>Total Taxable Value</th>
                <th style={{ textAlign: 'right' }}>CGST Amount</th>
                <th style={{ textAlign: 'right' }}>SGST Amount</th>
                <th style={{ textAlign: 'right' }}>Total Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {hsnSummaryList.map(h => (
                <tr key={h.hsn}>
                  <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{h.hsn}</td>
                  <td>{h.desc}</td>
                  <td style={{ textAlign: 'center' }}>{h.uqc}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{h.qty}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{h.taxable.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>₹{h.cgst.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>₹{h.sgst.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--status-green)' }}>₹{h.totalTax.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )}

  {/* ========================================================================= */}
  {/* TAB 4: INDIVIDUAL PRODUCT PROFIT ANALYSIS TABLE                            */}
  {/* ========================================================================= */}
  {activeReportTab === 'products' && (
    <div className="illoca-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tag size={17} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Individual Product Profit & Margin Performance
              </h3>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Realized profit on each individual product model based on actual selling price, MRP, and buy cost.
            </div>
          </div>

          {/* Category Selector Tabs & Search */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="segmented-bar" style={{ overflowX: 'auto' }}>
              {['All', 'New Mobiles', 'Used Mobiles', 'Mobile Accessories', 'Home Appliances', 'Repair Services'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryTab(cat)}
                  className={`segmented-item ${selectedCategoryTab === cat ? 'active-blue' : ''}`}
                  style={{ fontSize: '0.74rem', padding: '0.2rem 0.55rem', whiteSpace: 'nowrap' }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ width: '220px', position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search product..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '1.75rem', fontSize: '0.78rem' }}
              />
            </div>
          </div>
        </div>

        {filteredProductsTable.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No sales recorded in this category or date range.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Product & Brand</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Category</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>Units Sold</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Unit MRP</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Avg Selling Price</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Buy / Cost Price</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Total Profit (₹)</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Margin %</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>MRP Savings</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductsTable.map((prod, idx) => {
                  const unitProfit = prod.avgSellPrice - prod.unitBuy;

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          Brand: {prod.brand}
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span className="mono-tag" style={{ fontSize: '0.68rem' }}>
                          {prod.category}
                        </span>
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {prod.unitsSold}
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)', textDecoration: prod.unitMrp > prod.avgSellPrice ? 'line-through' : 'none', fontFamily: 'var(--font-mono)' }}>
                        ₹{prod.unitMrp.toLocaleString()}
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                        ₹{prod.avgSellPrice.toLocaleString()}
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        ₹{prod.unitBuy.toLocaleString()}
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: prod.totalProfit >= 0 ? 'var(--status-green)' : 'var(--status-red)', fontSize: '0.92rem' }}>
                        {prod.totalProfit >= 0 ? `+₹${prod.totalProfit.toLocaleString()}` : `-₹${Math.abs(prod.totalProfit).toLocaleString()}`}
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '3px',
                          background: prod.marginPct >= 30 ? 'var(--status-green-bg)' : 'var(--illoca-blue-subtle)',
                          color: prod.marginPct >= 30 ? 'var(--status-green)' : 'var(--accent-primary)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {prod.marginPct}%
                        </span>
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        {prod.discountFromMrp > 0 ? (
                          <span style={{ fontSize: '0.7rem', color: '#8B5CF6', fontWeight: 600 }}>
                            {prod.discountFromMrp}% off
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>At MRP</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

  </div>
);
}
