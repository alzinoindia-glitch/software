'IMEI' : 'Serial No.',
            selectedImeis: initialImeis,
            allTrackedUnits: trackedUnits,
            selectedUnitIds: initialUnits.map(unit => unit.id),
            supplierId: product.supplierId || '',
            supplierName: product.supplierName || '',
            supplierPurchases: product.supplierPurchases || [],
            color: product.color || '',
            ram: product.ram || '',
            storage: product.storage || '',
            warranty: product.warranty || '',
            termsAndConditions: normalizeProductTerms(product.termsAndConditions || product.terms),
            warrantyIncluded: false,
          }
        ];
      }
    });
    return true;
  };

  const handleProcessBarcodeScan = (scannedCode) => {
    const clean = scannedCode.trim().toLowerCase();
    const exactMatch = findProductFromScan(scannedCode, inventory);

    if (exactMatch) {
      if (exactMatch.stock <= 0) {
        playDeviceBeep('error');
        setScanNotification(`⚠️ OUT OF STOCK: "${exactMatch.name}" (${scannedCode})`);
        setTimeout(() => setScanNotification(''), 3500);
        return;
      }
      let matchedUnit = (exactMatch.units || []).find(un =>
        [un.barcode, un.imei1, un.imei2, un.serialNumber].some(value => value && value.trim().toLowerCase() === clean)
      );
      let matchedImei = [...(exactMatch.serialNumbers || []), ...(exactMatch.imeis || [])].find(i => i.trim().toLowerCase() === clean) || null;
      if (!matchedImei && exactMatch.units) {
        if (matchedUnit) matchedImei = matchedUnit.imei1 || matchedUnit.imei2 || matchedUnit.serialNumber;
      }
      const trackedUnitId = matchedUnit
        ? (matchedUnit.imei1 || matchedUnit.imei2 || matchedUnit.serialNumber || matchedUnit.barcode || null)
        : (matchedImei || null);
      const added = addToCart(exactMatch, matchedImei, 1, trackedUnitId);
      if (!added) {
        playDeviceBeep('error');
        return;
      }
      playDeviceBeep('success');
      setScanNotification(`✓ Added 1 × ${exactMatch.name}. Scan each unit; matching scans combine in the bill.`);
      setTimeout(() => setScanNotification(''), 2500);
    } else {
      playDeviceBeep('error');
      const catalogMatch = lookupProductByBarcodeOrImei(scannedCode, inventory);
      if (catalogMatch) {
        setScanNotification(`⚠️ Found: ${catalogMatch.name} [Code: ${scannedCode}] — NOT in store stock! Inward/Add it to inventory first.`);
      } else {
        setScanNotification(`⚠️ Scanned Barcode/IMEI not in inventory: "${scannedCode}"`);
      }
      setTimeout(() => setScanNotification(''), 4500);
    }
  };

  scanHandlerRef.current = handleProcessBarcodeScan;

  // Global Hardware Barcode Scanner Listener for POS Billing Counter
  useEffect(() => {
    const scanner = new HardwareBarcodeScannerEngine({
      soundEnabled: shopConfig?.barcodeScannerBeep !== false,
      onScan: (scannedCode) => {
        scanHandlerRef.current?.(scannedCode);
      }
    });

    scanner.start();
    return () => scanner.stop();
  }, [inventory, shopConfig?.barcodeScannerBeep]);

  // Handle Barcode scanner auto-enter inside manual search box
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        handleProcessBarcodeScan(searchTerm.trim());
        setSearchTerm('');
      }
    }
  };

  // Auto-add product when sent from Stock & Price Lookup
  useEffect(() => {
    if (quickBillProduct) {
      addToCart(quickBillProduct);
      if (clearQuickBillProduct) {
        clearQuickBillProduct();
      }
    }
  }, [quickBillProduct, clearQuickBillProduct]);

  // Adjust cart quantity
  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        if (newQty > item.availableStock) {
          alert(`Maximum available stock is ${item.availableStock}`);
          return item;
        }
        
        const trackedUnits = item.allTrackedUnits || [];
        let selectedUnitIds = [...(item.selectedUnitIds || [])];
        let updatedImeis = [...item.selectedImeis];
        if (delta > 0 && trackedUnits.length > 0) {
          const nextUnit = trackedUnits.find(unit => !selectedUnitIds.includes(unit.id));
          if (!nextUnit) return item;
          selectedUnitIds.push(nextUnit.id);
          if (nextUnit.imei) updatedImeis.push(nextUnit.imei);
        } else if (delta < 0 && selectedUnitIds.length > 0) {
          const removedId = selectedUnitIds.pop();
          const removedUnit = trackedUnits.find(unit => unit.id === removedId);
          if (removedUnit?.imei) updatedImeis = updatedImeis.filter(imei => imei !== removedUnit.imei);
        } else if (delta > 0 && item.allImeis.length > 0) {
          const nextAvailable = item.allImeis.find(im => !updatedImeis.includes(im));
          if (!nextAvailable) return item;
          updatedImeis.push(nextAvailable);
        } else if (delta < 0) {
          updatedImeis.pop();
        }

        return { ...item, qty: newQty, selectedImeis: updatedImeis, selectedUnitIds };
      }
      return item;
    }).filter(Boolean));
  };

  // Remove from cart
  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Update selected IMEI for an index
  const updateItemImei = (productId, imeiIndex, newImei) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newImeis = [...item.selectedImeis];
        newImeis[imeiIndex] = newImei;
        return { ...item, selectedImeis: newImeis };
      }
      return item;
    }));
  };

  // Set typed custom IMEI
  const addCustomImeiToItem = (productId, customImei) => {
    if (!customImei.trim()) return;
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        return {
          ...item,
          allImeis: Array.from(new Set([...item.allImeis, customImei.trim()])),
          selectedImeis: [customImei.trim(), ...item.selectedImeis.slice(1)]
        };
      }
      return item;
    }));
  };

  // Update line rate
  const updateItemRate = (id, newRate) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, rate: parseFloat(newRate) || 0 };
      }
      return item;
    }));
  };

  // Update line item name
  const updateItemName = (id, newName) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, name: newName };
      }
      return item;
    }));
  };

  // Update line item warranty
  const updateItemWarranty = (id, newWarranty) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, warranty: newWarranty };
      }
      return item;
    }));
  };

  const toggleItemWarranty = (id, included) => {
    setCart(prev => prev.map(item => item.id === id
      ? { ...item, warrantyIncluded: included }
      : item));
  };

  const toggleCartProductTerm = (id, term) => {
    setCart(previous => previous.map(item => {
      if (item.id !== id) return item;
      const terms = normalizeProductTerms(item.termsAndConditions);
      return {
        ...item,
        termsAndConditions: terms.includes(term) ? terms.filter(value => value !== term) : [...terms, term],
      };
    }));
  };

  // Add custom / unlisted item to cart
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customItemName.trim()) {
      alert("Please enter product name.");
      return;
    }
    const price = parseFloat(customItemPrice);
    if (!price || price <= 0) {
      alert("Please enter a valid price.");
      return;
    }
    const qty = parseInt(customItemQty, 10) || 1;
    const buyCost = parseFloat(customItemBuyCost) || 0;

    const newItem = {
      id: `CUSTOM-${Date.now().toString().slice(-4)}`,
      name: customItemName.trim(),
      brand: 'Custom',
      category: 'Accessories & Services',
      hsn: customItemHsn.trim() || '851712',
      rate: price,
      mrp: Math.round(price * 1.1),
      buyPrice: buyCost,
      gstRate: billingType === 'gst' ? 18 : 0,
      qty,
      availableStock: 999,
      allImeis: customItemImei ? [customItemImei.trim()] : [],
      selectedImeis: customItemImei ? [customItemImei.trim()] : [],
      warranty: customItemWarranty.trim(),
      warrantyIncluded: false,
      termsAndConditions: [],
      isCustom: true
    };

    setCart(prev => [...prev, newItem]);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemBuyCost('0');
    setCustomItemQty('1');
    setCustomItemImei('');
    setCustomItemWarranty('');
    setShowAddCustomModal(false);
  };

  // Customer phone auto-detection
  const handleCustomerPhoneInput = (val) => {
    setCustomerPhone(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 4) {
      const match = customers.find(c => c.phone && c.phone.replace(/\D/g, '').includes(clean));
      if (match) {
        setCustomerMatchHint(match);
        if (customerName === 'Counter Customer' || !customerName) {
          setCustomerName(match.name);
          if (match.address) setCustomerAddress(match.address);
          if (match.gstin) setCustomerGstin(match.gstin);
        }
      } else {
        setCustomerMatchHint(null);
      }
    } else {
      setCustomerMatchHint(null);
    }
  };

  // Select customer from list
  const handleSelectCustomer = (c) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    if (c.address) setCustomerAddress(c.address);
    if (c.gstin) setCustomerGstin(c.gstin);
    setCustomerMatchHint(null);
  };

  // Calculations
  const isNonGst = billingType === 'non-gst';
  const subtotalBeforeTax = cart.reduce((sum, item) => sum + (item.rate * item.qty), 0);
  const totalTaxable = subtotalBeforeTax;
  const totalGst = isNonGst ? 0 : cart.reduce((sum, item) => {
    const itemTaxable = item.rate * item.qty;
    return sum + itemTaxable * ((item.gstRate || 18) / 100);
  }, 0);
  const grandTotal = Math.max(0, subtotalBeforeTax + totalGst - Number(discount));
  
  // Total line profit (for admin mode)
  const totalProfit = cart.reduce((sum, item) => {
    const itemProfit = (item.rate - item.buyPrice) * item.qty;
    return sum + itemProfit;
  }, 0) - Number(discount);

  // EMI auto-calculated loan amount
  const emiLoanAmount = Math.max(0, grandTotal - (Number(emiDownPayment) || 0));

  // Sync monthly EMI calculation when loan amount or tenure changes
  useEffect(() => {
    if (emiTenureMonths > 0) {
      setEmiMonthlyAmount(Math.round(emiLoanAmount / emiTenureMonths));
    }
  }, [emiLoanAmount, emiTenureMonths]);

  // Sync paidAmount default
  useEffect(() => {
    setPaidAmount(grandTotal);
  }, [grandTotal]);

  // Keyboard shortcut for toggling GST billing mode.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F8') {
        e.preventDefault();
        setBillingType(prev => prev === 'gst' ? 'non-gst' : 'gst');
        playDeviceBeep('scanner');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, grandTotal, customerName, customerPhone, customerAddress, isNonGst, shopConfig, invoices.length]);

  // Step 1: Open Payment Verification Modal (NO invoice or stock deduction yet)
  const handleInitiatePayment = (initialMode = paymentMode, sendWhatsApp = false) => {
    if (cart.length === 0) {
      alert("Cart is empty! Add items to cart first.");
      return;
    }
    const def = upiAccountsList.find(a => a.isDefault) || upiAccountsList[0];
    setPaymentMode(initialMode);
    if (def) setSelectedUpiAccountId(def.id);
    setQrDisplayMode('dynamic');
    setCashReceivedAmount(0);
    setSendInvoiceWhatsApp(sendWhatsApp);
    setUpiTxnRef('');
    setUpiVerified(false);
    setCopiedUpi(false);
    setCardAuthCode('');
    setSplitCashAmount(Math.round(grandTotal / 2));
    setSplitUpiAmount(grandTotal - Math.round(grandTotal / 2));
    setSplitUpiTxnRef('');
    setSplitVerified(false);
    setAdvancePaymentAmount('');
    setAdvancePaymentMethod('Cash');
    setAdvancePaymentReference('');
    setAdvancePaymentConfirmed(false);
    setEmiDownPayment(0);
    setEmiDownPaymentMode('Cash');
    setEmiDownPaymentUpiRef('');
    setEmiTenureMonths(6);
    setEmiMonthlyAmount(Math.round(grandTotal / 6));
    setEmiApprovalCode('');
    setEmiVerified(false);
    setShowPaymentVerifyModal(true);
  };

  // Step 2: Finalize Sale ONLY AFTER Payment is Confirmed
  const handleConfirmAndGenerateInvoice = () => {
    const cashReceived = paymentMode === 'Cash' ? (Number(cashReceivedAmount) || 0) : 0;
    if (paymentMode === 'UPI' && (!upiTxnRef.trim() || !upiVerified)) {
      alert('Enter the UPI UTR / transaction ID and verify that payment was received before completing this sale.');
      return;
    }
    if (paymentMode === 'Cash' && cashReceived < grandTotal) {
      alert('Enter the cash received. The amount must cover the total due.');
      return;
    }
    if (paymentMode === 'EMI' && (!emiApprovalCode.trim() || !emiVerified || (emiDownPaymentMode === 'UPI' && Number(emiDownPayment) > 0 && !emiDownPaymentUpiRef.trim()))) {
      alert('Enter the EMI approval / transaction ID and confirm finance approval. If the down payment was by UPI, enter its UTR too.');
      return;
    }
    if (paymentMode === 'Split' && (!splitVerified || (Number(splitUpiAmount) > 0 && !splitUpiTxnRef.trim()))) {
      alert('Verify both payment portions and enter the UPI UTR / transaction ID before completing the sale.');
      return;
    }
    if (paymentMode === 'Card' && !cardAuthCode.trim()) {
      alert('Enter the card terminal approval / transaction ID before completing the sale.');
      return;
    }
    if (paymentMode === 'Advance') {
      const amount = Number(advancePaymentAmount);
      if (!Number.isFinite(amount) || amount <= 0 || amount >= grandTotal) {
        alert(`Enter an advance greater than ₹0 and less than the bill total of ₹${grandTotal.toLocaleString()}.`);
        return;
      }
      if (!advancePaymentConfirmed) {
        alert('Confirm that the advance payment has been received before completing the sale.');
        return;
      }
      if (advancePaymentMethod !== 'Cash' && !advancePaymentReference.trim()) {
        alert(`Enter the ${advancePaymentMethod} transaction or approval reference.`);
        return;
      }
    }
    const stockChanged = cart.find(cartItem => {
      const currentProduct = inventory.find(item => item.id === cartItem.id);
      return !currentProduct || Number(currentProduct.stock) < Number(cartItem.qty);
    });
    if (stockChanged) {
      const liveStock = Number(inventory.find(item => item.id === stockChanged.id)?.stock || 0);
      alert(`Sale not completed: ${stockChanged.name} has only ${liveStock} unit(s) in stock now. Update the bill quantity and try again.`);
      return;
    }
    const prefix = isNonGst ? 'ALZ-EST' : 'ALZ-INV';
    const invoiceNo = `${prefix}-${String(invoices.length + 83).padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    // Compute GST breakdowns
    const cgstTotal = isNonGst ? 0 : (isInterstate ? 0 : totalGst / 2);
    const sgstTotal = isNonGst ? 0 : (isInterstate ? 0 : totalGst / 2);
    const igstTotal = isNonGst ? 0 : (isInterstate ? totalGst : 0);

    const isEmi = paymentMode === 'EMI';
    const isSplit = paymentMode === 'Split';
    const isAdvance = paymentMode === 'Advance';

    let actualPaid = 0;
    let khataDue = 0;
    let effectivePaymentMode = paymentMode;

    if (paymentMode === 'Khata') {
      actualPaid = 0;
      khataDue = grandTotal;
      effectivePaymentMode = 'Khata';
    } else if (isEmi) {
      actualPaid = Number(emiDownPayment) || 0;
      khataDue = 0; // Balance is funded by 