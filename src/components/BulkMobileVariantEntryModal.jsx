delCode}-${colorSlug}-${String(unit.unitNo).padStart(2, '0')}`
      };
    }));
  };

  // 1-Click Print Stickers for all units
  const handlePrintAllStickers = () => {
    if (!onPrintBarcodeSheet || units.length === 0) return;
    onPrintBarcodeSheet({
      title: `${modelDetails.brand} ${modelDetails.model} (${modelDetails.ram}/${modelDetails.storage})`,
      barcode: units[0]?.barcode || 'ALZ-001',
      codeFormat,
      price: modelDetails.sellPrice || 0,
      mrp: Number(modelDetails.mrp) || 0,
      copies: units.length,
      format: 'sheet24'
    });
  };

  // =========================================================================
  // SUBMIT MANUAL BULK ENTRY: Save All Units to Inventory
  // =========================================================================
  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();

    if (modelDetails.category === 'Used Mobiles') {
      alert('Add used phones through the Used Phones section so purchase and IMEI records stay linked.');
      return;
    }

    if (!modelDetails.model.trim()) {
      alert('Please enter a product name or model.');
      return;
    }
    if (!modelDetails.sellPrice || parseFloat(modelDetails.sellPrice) <= 0) {
      alert('Please enter a valid Selling Price.');
      return;
    }
    if (totalStockCount <= 0) {
      alert('Please add at least 1 unit quantity.');
      return;
    }
    if (requiresDualImei(modelDetails.category)) {
      const missingImei = units.find(unit => !unit.imei1?.trim() || !unit.imei2?.trim());
      if (missingImei) {
        alert(`Enter both IMEI 1 (SIM 1) and IMEI 2 (SIM 2 / eSIM) for every mobile unit. Check unit ${missingImei.unitNo}.`);
        return;
      }
    }
    if (!isImeiCategory(modelDetails.category)) {
      const serialValues = units.map(unit => String(unit.serialNumber || '').trim()).filter(Boolean);
      if (serialValues.length > 0 && serialValues.length !== totalStockCount) {
        alert(`Enter a serial number for every unit (${totalStockCount}) or clear the serial numbers to leave them untracked.`);
        return;
      }
    }

    const brandName = modelDetails.brand.trim() || 'Universal';
    saveCustomCategory(modelDetails.category);
    saveCustomBrand(brandName, modelDetails.category);
    saveCustomSubcategory(modelDetails.subCategory, modelDetails.category);
    const modelName = modelDetails.model.trim();
    const buyPrice = parseFloat(modelDetails.buyPrice) || 0;
    const sellPrice = parseFloat(modelDetails.sellPrice) || 0;
    const mrp = parseFloat(modelDetails.mrp) || sellPrice;
    const finalGstRate = parseFloat(modelDetails.gstRate) || 18;
    const rackVal = (modelDetails.rack || 'R-01').trim().toUpperCase();
    const binVal = (modelDetails.bin || 'B-01').trim().toUpperCase();

    // Group units by colour variant to create distinct inventory items
    // (One inventory item per Colour Variant, each holding its stock & distinct IMEIs)
    const newInventoryItems = [];
    for (const variant of colourVariants) {
      const variantUnits = units.filter(u => u.variantId === variant.id);
      const variantQty = variantUnits.length;

      // Extract all IMEIs for fast POS lookup (both IMEI 1 and IMEI 2)
      const variantImeis = [];
      const variantSerialNumbers = [];
      variantUnits.forEach(u => {
        if (u.imei1) variantImeis.push(u.imei1.trim());
        if (u.imei2) variantImeis.push(u.imei2.trim());
        if (u.serialNumber?.trim()) variantSerialNumbers.push(u.serialNumber.trim());
      });

      const isPhoneCategory = isPhoneSpecificationCategory(modelDetails.category);
      const specs = isPhoneCategory ? `${effectiveRam}/${effectiveStorage}` : [modelDetails.subCategory, modelDetails.capacity].filter(Boolean).join(' · ');
      const variantName = `${brandName} ${modelName}${specs ? ` (${specs})` : ''}${variant.color ? ` - ${variant.color}` : ''}`;
      const primaryBarcode = variantUnits.find(u => u.barcode && u.barcode.trim())?.barcode?.trim() || '';
      const allBarcodes = variantUnits.map(u => (u.barcode || '').trim()).filter(Boolean);
      const variantCodeFormat = variantUnits.find(u => u.barcode)?.codeFormat || codeFormat;
      const prodId = `PROD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

      const frontImg = variant.frontImage || variant.image || null;
      const backImg = variant.backImage || null;

      if (frontImg) {
        try {
          await saveProductImage(prodId, 'front', frontImg);
        } catch (err) {
          console.warn('Could not save front image to IndexedDB:', err);
        }
      }
      if (backImg) {
        try {
          await saveProductImage(prodId, 'back', backImg);
        } catch (err) {
          console.warn('Could not save back image to IndexedDB:', err);
        }
      }

      newInventoryItems.push({
        id: prodId,
        category: modelDetails.category,
        subCategory: modelDetails.subCategory,
        capacity: modelDetails.capacity,
        brand: brandName,
        model: modelName,
        name: variantName,
        ram: effectiveRam,
        storage: effectiveStorage,
        color: variant.color,
        colorHex: variant.hex || getProductColorHex(variant.color),
        image: frontImg || backImg || null,
        frontImage: frontImg,
        backImage: backImg,
        images: (frontImg || backImg) ? { front: Boolean(frontImg), back: Boolean(backImg), v: Date.now() } : undefined,
        description: `${brandName} ${modelName}${specs ? ` ${specs}` : ''}${variant.color ? ` in ${variant.color}` : ''}. Bulk stock entry.`,
        isGst: finalGstRate > 0,
        hsn: modelDetails.hsn || '851712',
        gstRate: finalGstRate,
        buyPrice,
        sellPrice,
        mrp,
        stock: variantQty,
        lowStockThreshold: 2,
        rack: rackVal,
        bin: binVal,
        locations: [{ rack: rackVal, bin: binVal, qty: variantQty }],
        barcode: primaryBarcode,
        barcodes: allBarcodes,
        codeFormat: variantCodeFormat,
        imeis: isImeiCategory(modelDetails.category) ? variantImeis : [],
        serialNumbers: isImeiCategory(modelDetails.category) ? [] : variantSerialNumbers,
        units: variantUnits.map(u => ({
          unitId: u.id,
          ...(isImeiCategory(modelDetails.category)
            ? { imei1: u.imei1.trim(), imei2: u.imei2.trim() }
            : { serialNumber: (u.serialNumber || '').trim() }),
          barcode: (u.barcode || '').trim(),
          codeFormat: u.codeFormat || 'barcode',
          color: variant.color,
          colorHex: variant.hex || getProductColorHex(variant.color),
          image: variant.image || null,
          rack: rackVal,
          bin: binVal,
          status: 'In Stock'
        })),
        warranty: modelDetails.warranty,
        termsAndConditions: normalizeProductTerms(termsAndConditions),
        receivedDate: modelDetails.receivedDate,
        createdAt: new Date().toISOString(),
        status: 'Active'
      });
    }

    onSaveBatch(newInventoryItems);
    alert(`✓ Successfully added ${totalStockCount} ${modelDetails.category.toLowerCase()} units across ${colourVariants.length} variants into inventory!`);
    onClose();
  };

  // =========================================================================
  // EXCEL / CSV BULK IMPORT ENGINE
  // =========================================================================
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        Category: 'New Mobiles',
        Subcategory: 'Smartphones',
        Brand: 'Samsung',
        Model: 'Galaxy S24 5G',
        RAM: '8GB',
        Storage: '256GB',
        Colour: 'Onyx Black',
        Quantity: 2,
        IMEI1: '863456051234561',
        IMEI2: '863456051234562',
        Barcode: 'ALZ-SAM-S24-BLK-01',
        PurchasePrice: 65000,
        SellingPrice: 74999,
        MRP: 79999,
        Rack: 'R-01',
        Bin: 'B-01',
        HSN: '851712',
        GSTRate: 18,
        Warranty: '1 Year Brand Warranty'
      },
      {
        Category: 'New Mobiles',
        Subcategory: 'Smartphones',
        Brand: 'Samsung',
        Model: 'Galaxy S24 5G',
        RAM: '8GB',
        Storage: '256GB',
        Colour: 'Marble Gray',
        Quantity: 3,
        IMEI1: '863456051234563',
        IMEI2: '863456051234564',
        Barcode: 'ALZ-SAM-S24-GRY-01',
        PurchasePrice: 65000,
        SellingPrice: 74999,
        MRP: 79999,
        Rack: 'R-01',
        Bin: 'B-02',
        HSN: '851712',
        GSTRate: 18,
        Warranty: '1 Year Brand Warranty'
      },
      {
        Category: 'New Mobiles',
        Subcategory: 'Smartphones',
        Brand: 'Apple',
        Model: 'iPhone 15',
        RAM: '6GB',
        Storage: '128GB',
        Colour: 'Blue',
        Quantity: 2,
        IMEI1: '358249051234567',
        IMEI2: '358249051234568',
        Barcode: 'ALZ-APP-IP15-BLU-01',
        PurchasePrice: 58000,
        SellingPrice: 65999,
        MRP: 69900,
        Rack: 'R-02',
        Bin: 'B-01',
        HSN: '851712',
        GSTRate: 18,
        Warranty: '1 Year Apple Warranty'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk_Products_Template');
    XLSX.writeFile(wb, 'ALZINO_Bulk_Products_Template.xlsx');
  };

  const updateExcelRow = (rowIndex, field, value) => {
    setExcelRows(rows => rows.map((row, index) => index === rowIndex ? { ...row, [field]: value } : row));
  };

  const parsePdfToDraftRows = (lines, fileName) => {
    const text = lines.join('\n');
    const field = (pattern) => {
      const match = text.match(pattern);
      return match?.[1]?.trim() || '';
    };
    const money = value => Number(String(value || '').replace(/[^\d.]/g, '')) || 0;
    const labeledProducts = lines.flatMap(line => {
      const match = line.match(/(?:product(?:\s+name)?|item(?:\s+description)?|description|material)\s*[:\-]\s*(.+)/i);
      return match ? [match[1].trim()] : [];
    });
    const candidateLines = lines.filter(line => {
      if (/\b(sub\s?total|grand\s?total|tax\s?(?:amount|able)?|invoice\s?total|round\s?off|balance\s?due|total\s?(?:amount|qty|quantity))\b/i.test(line)) return false;
      const hasItemMarker = /\b(?:qty|quantity|nos?\.?|pcs?\.?|units?)\b/i.test(line);
      const hasTwoPrices = (line.match(/(?:₹|rs\.?\s*|inr\s*)\s*\d[\d,]*(?:\.\d{1,2})?/gi) || []).length >= 2;
      return hasItemMarker || hasTwoPrices;
    });
    const productNames = [...new Set([...labeledProducts, ...candidateLines.map(line => line.replace(/(?:₹|rs\.?\s*|inr\s*)\s*\d[\d,]*(?:\.\d{1,2})?/gi, '').replace(/\b(?:qty|quantity|nos?\.?|pcs?\.?|units?)\b.*$/i, '').replace(/^\s*\d+[.)\-:]?\s*/, '').trim()).filter(name => name.length > 2 && /[a-z]/i.test(name))])];
    const brandFromText = MOBILE_BRANDS.find(brand => text.toLowerCase().includes(String(brand).toLowerCase())) || '';
    const category = field(/(?:category|product\s*type)\s*[:\-]\s*([^\n]+)/i);
    const subCategory = field(/(?:sub\s*category|subcategory)\s*[:\-]\s*([^\n]+)/i);
    const ram = field(/\bRAM\s*[:\-]\s*([^\n,;]+)/i);
    const storage = field(/\b(?:storage|memory)\s*[:\-]\s*([^\n,;]+)/i);
    const colour = field(/\bcolou?r\s*[:\-]\s*([^\n,;]+)/i);
    const quantityValue = Number.parseInt(field(/\b(?:qty|quantity|units?)\s*[:\-]?\s*(\d+)/i), 10);
    const quantity = Number.isFinite(quantityValue) ? Math.max(0, quantityValue) : 0;
    const purchasePrice = money(field(/\b(?:purchase\s*(?:price|cost)|buy\s*cost|unit\s*cost|rate)\s*[:\-]?\s*(?:₹|rs\.?\s*)?([\d,]+(?:\.\d{1,2})?)/i));
    const sellPrice = money(field(/\b(?:selling\s*price|sell\s*price|sale\s*price)\s*[:\-]?\s*(?:₹|rs\.?\s*)?([\d,]+(?:\.\d{1,2})?)/i));
    const mrp = money(field(/\bMRP\s*[:\-]?\s*(?:₹|rs\.?\s*)?([\d,]+(?:\.\d{1,2})?)/i));
    const gstRate = Number.parseFloat(field(/\b(?:GST|tax\s*rate)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%?/i)) || 0;
    const hsn = field(/\bHSN\s*[:\-]?\s*(\d{4,8})/i);
    const imeiMatches = text.match(/\b\d{15}\b/g) || [];
    const serialNumbers = field(/\b(?:serial\s*(?:no|number)?|S\/N)\s*[:\-]?\s*([^\n]+)/i).split(/[\s,;]+/).filter(Boolean);
    const rack = field(/\bRack\s*[:\-]?\s*([^\n,;]+)/i) || 'R-01';
    const bin = field(/\bBin\s*[:\-]?\s*([^\n,;]+)/i) || 'B-01';
    const warranty = field(/\bWarranty\s*[:\-]?\s*([^\n]+)/i);
    const receivedDate = field(/\b(?:received|invoice)\s*date\s*[:\-]?\s*(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})/i);
    const models = productNames.length ? productNames : [field(/(?:product(?:\s*name)?|item(?:\s*name)?)\s*[:\-]\s*([^\n]+)/i)];

    return models.map((model, index) => {
      const imei1 = imeiMatches[index * 2] || (index === 0 ? field(/\bIMEI\s*1?\s*[:\-]?\s*(\d{14,16})/i) : '');
      const imei2 = imeiMatches[index * 2 + 1] || (index === 0 ? field(/\bIMEI\s*2\s*[:\-]?\s*(\d{14,16})/i) : '');
      const listedLine = candidateLines.find(line => line.toLowerCase().includes(model.toLowerCase()));
      const linePrices = listedLine?.match(/(?:₹|rs\.?\s*|inr\s*)\s*([\d,]+(?:\.\d{1,2})?)/gi) || [];
      const lineQuantity = Number.parseInt(listedLine?.match(/\b(\d+)\s*(?:qty|quantity|nos?\.?|pcs?\.?|units?)\b/i)?.[1], 10) || 0;
      const rowQuantity = productNames.length > 1 ? lineQuantity : quantity;
      return {
        rowNo: index + 1,
        category,
        subCategory,
        capacity: '',
        brand: brandFromText,
        model: String(model).trim(),
        isMasterRow: false,
        ram,
        storage,
        colour,
        quantity: imei1 ? 1 : rowQuantity,
        imei1,
        imei2,
        serialNumbers: imei1 ? [] : serialNumbers.slice(index, index + rowQuantity),
        barcode: `ALZ-${String(Date.now()).slice(-6)}-${String(index + 1).padStart(2, '0')}`,
        codeFormat: 'barcode',
        hsn,
        gstRate,
        purchasePrice: purchasePrice || (linePrices.length > 1 ? money(linePrices[0]) : 0),
        sellPrice,
        mrp,
        rack,
        bin,
        warranty,
        receivedDate,
        description: '',
        source: 'pdf',
        needsReview: true,
        sourceFileName: fileName,
      };
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setExcelErrors([]);
    setExcelRows([]);

    if (/\.pdf$/i.test(file.name)) {
      setIsExtractingPdf(true);
      try {
        const [pdfjs, workerUrl] = await Promise.all([
          import('pdfjs-dist/build/pdf.mjs'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;
        const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const pageLines = [];
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
          const page = await document.getPage(pageNumber);
          const content = await page.getTextContent();
          const textItems = content.items.filter(item => item.str?.trim()).map(item => ({
            text: item.str.trim(),
            x: item.transform?.[4] || 0,
            y: item.transform?.[5] || 0,
          })).sort((a, b) => b.y - a.y || a.x - b.x);
          const lines = [];
          textItems.forEach(item => {
            let line = lines.find(candidate => Math.abs(candidate.y - item.y) < 2.5);
            if (!line) { line = { y: item.y, parts: [] }; lines.push(line); }
            line.parts.push(item);
          });
          pageLines.push(...lines.sort((a, b) => b.y - a.y).map(line => line.parts.sort((a, b) => a.x - b.x).map(part => part.text).join(' ').replace(/\s+/g, ' ').trim()));
        }
        const extractedText = pageLines.join('\n').trim();
        if (!extractedText) {
          setExcelRows([]);
          setExcelErrors(['No selectable tex