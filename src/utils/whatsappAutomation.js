// ALZINO Automated WhatsApp Customer Hub
// Automatically generates and opens official branded WhatsApp receipts, repair updates, and Khata payment links

/**
 * Format clean, professional WhatsApp text receipt
 */
export function generateWhatsAppInvoiceText(invoice, shopConfig = {}) {
  const shopName = shopConfig.name || 'ALZINO';
  const shopPhone = shopConfig.phone || '98490 82741';
  const shopAddress = shopConfig.address || 'Station Road, Bodhan, Telangana';
  const gstin = shopConfig.gstin || '';

  const isNonGst = Boolean(invoice.isNonGst);
  const title = isNonGst ? 'ESTIMATE / CASH MEMO' : 'GST TAX INVOICE';

  const itemsList = (invoice.items || []).map((item, idx) => {
    const imeisStr = (item.imeis && item.imeis.length > 0) ? `\n   IMEI: ${item.imeis.join(', ')}` : '';
    const warrantyStr = item.warranty ? `\n   🛡️ Warranty: ${item.warranty}` : '';
    return `${idx + 1}. *${item.name}*\n   Qty: ${item.qty} × ₹${Number(item.rate).toLocaleString('en-IN')}${imeisStr}${warrantyStr}`;
  }).join('\n\n');

  const paymentMode = invoice.paymentMode || 'Cash';
  const paymentStatus = invoice.paymentStatus === 'KHATA_DUE' 
    ? '⚠️ Khata Credit (Payment Due)' 
    : 'PAID ✅';

  let text = `🧾 *${shopName.toUpperCase()} • ${title}*\n`;
  text += `📍 ${shopAddress}\n`;
  text += `📞 Helpline: ${shopPhone}\n`;
  if (!isNonGst && gstin) {
    text += `🏛️ GSTIN: ${gstin}\n`;
  }
  text += `--------------------------------\n`;
  text += `📄 *Bill No:* ${invoice.invoiceNo}\n`;
  text += `📅 *Date:* ${invoice.date}\n`;
  text += `👤 *Customer:* ${invoice.customerName || 'Walk-in'}\n`;
  if (invoice.customerPhone) {
    text += `📱 *Phone:* ${invoice.customerPhone}\n`;
  }
  text += `--------------------------------\n`;
  text += `📦 *ITEMS PURCHASED:*\n\n${itemsList}\n`;
  text += `--------------------------------\n`;
  if (invoice.discount > 0) {
    text += `🏷️ *Discount Applied:* ₹${Number(invoice.discount).toLocaleString('en-IN')}\n`;
  }
  text += `💰 *Total Bill Amount:* ₹${Number(invoice.grandTotal).toLocaleString('en-IN')}\n`;
  if (invoice.advancePaid > 0) {
    text += `💵 *Advance Paid Earlier (Intake):* -₹${Number(invoice.advancePaid).toLocaleString('en-IN')}\n`;
    if (invoice.khataDue === 0) {
      text += `✅ *Amount Collected Today:* ₹${Number(invoice.balanceCollectedNow ?? (invoice.grandTotal - invoice.advancePaid)).toLocaleString('en-IN')} (${paymentMode})\n`;
      text += `✨ *Total Paid (Advance + Today):* ₹${Number(invoice.grandTotal).toLocaleString('en-IN')}\n`;
      text += `🏁 *Balance Remaining Due:* ₹0 (Paid in Full)\n`;
    }
  } else {
    text += `💳 *Paid via:* ${paymentMode} (${paymentStatus})\n`;
  }
  
  if (invoice.khataDue > 0) {
    text += `⚠️ *Balance Remaining (Khata):* ₹${Number(invoice.khataDue).toLocaleString('en-IN')}\n`;
  }
  text += `--------------------------------\n`;
  text += `🙏 *Thank you for choosing ${shopName}!* Official box with warranty registered.\n`;
  text += `💬 Need assistance or accessories? Reply to this message anytime.`;

  return text;
}

/**
 * Open WhatsApp directly with invoice text prefilled for customer
 */
export function openWhatsAppInvoice(invoice, shopConfig = {}) {
  if (!invoice) return false;
  const rawPhone = String(invoice.customerPhone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : (rawPhone.startsWith('91') && rawPhone.length === 12 ? rawPhone : null);

  const text = generateWhatsAppInvoiceText(invoice, shopConfig);
  const encodedText = encodeURIComponent(text);

  if (cleanPhone) {
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(url, '_blank');
    return true;
  } else {
    // If no valid phone, open WhatsApp Web with message ready to pick contact
    const url = `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
    return true;
  }
}

/**
 * Repair Lab Service Status WhatsApp Message
 */
export function generateWhatsAppRepairText(job, shopConfig = {}, statusType = 'received') {
  const shopName = shopConfig.name || 'ALZINO';
  const shopPhone = shopConfig.phone || '98490 82741';

  if (statusType === 'completed') {
    return `✅ *DEVICE READY FOR PICKUP • ${shopName.toUpperCase()} REPAIR LAB*\n\n` +
      `Hello ${job.customerName},\n` +
      `Your device *${job.deviceModel}* is fully repaired and tested!\n\n` +
      `🔧 *Job Token:* ${job.jobId}\n` +
      `💵 *Total Amount:* ₹${Number(job.estimatedCost || 0).toLocaleString('en-IN')}\n` +
      `💳 *Advance Paid:* ₹${Number(job.advancePaid || 0).toLocaleString('en-IN')}\n` +
      `👉 *Balance to Pay:* ₹${Number((job.estimatedCost || 0) - (job.advancePaid || 0)).toLocaleString('en-IN')}\n\n` +
      `📍 Please collect your device from ${shopConfig.address || 'Station Road, Bodhan'}.\n` +
      `📞 Questions? Call us at ${shopPhone}.`;
  }

  return `🔬 *DEVICE RECEIVED FOR SERVICE • ${shopName.toUpperCase()} REPAIR LAB*\n\n` +
    `Hello ${job.customerName},\n` +
    `We have received your device *${job.deviceModel}* at our precision restoration lab.\n\n` +
    `📋 *Job Token:* ${job.jobId}\n` +
    `📅 *Date:* ${job.date}\n` +
    `⚠️ *Reported Issues:* ${(job.issues || []).join(', ')}\n` +
    `💰 *Estimated Cost:* ₹${Number(job.estimatedCost || 0).toLocaleString('en-IN')}\n` +
    `💳 *Advance Paid:* ₹${Number(job.advancePaid || 0).toLocaleString('en-IN')}\n\n` +
    `We use 100% genuine spares. We will notify you via WhatsApp as soon as your device is ready!\n` +
    `📞 Support: ${shopPhone}`;
}

export function openWhatsAppRepairUpdate(job, shopConfig = {}, statusType = 'received') {
  if (!job) return false;
  const rawPhone = String(job.customerMobile || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : (rawPhone.startsWith('91') && rawPhone.length === 12 ? rawPhone : null);
  const text = generateWhatsAppRepairText(job, shopConfig, statusType);
  const encoded = encodeURIComponent(text);

  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
  return true;
}

/**
 * Customer Khata Pending Balance WhatsApp Reminder
 */
export function generateWhatsAppKhataReminderText(customer, shopConfig = {}) {
  const shopName = shopConfig.name || 'ALZINO';
  const upiId = shopConfig.upiId || 'alzino.bodhan@okhdfcbank';
  const balance = Number(customer.balanceDue || 0).toLocaleString('en-IN');

  return `🔔 *PAYMENT REMINDER • ${shopName.toUpperCase()}*\n\n` +
    `Dear ${customer.name},\n` +
    `This is a gentle balance reminder regarding your store Khata account at ${shopName}, Bodhan.\n\n` +
    `💰 *Outstanding Balance:* ₹${balance}\n\n` +
    `You can clear your balance via UPI directly using the ID below:\n` +
    `📱 *UPI ID:* ${upiId}\n\n` +
    `Or visit our showroom at ${shopConfig.address || 'Station Road, Bodhan'}.\n` +
    `Thank you for your business! 🙏`;
}

export function openWhatsAppKhataReminder(customer, shopConfig = {}) {
  if (!customer) return false;
  const rawPhone = String(customer.phone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : (rawPhone.startsWith('91') && rawPhone.length === 12 ? rawPhone : null);
  const text = generateWhatsAppKhataReminderText(customer, shopConfig);
  const encoded = encodeURIComponent(text);

  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
  return true;
}
