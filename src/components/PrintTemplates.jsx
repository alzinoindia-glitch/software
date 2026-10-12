import React, { useState } from 'react';
import { renderBarcodeSvg, renderCodeSvg, getUpiQrUrl } from '../utils/barcode';
import { buildProductScanUrl } from '../utils/productTerms';

// Number to Words converter for Indian Rupee
function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'Overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str;
}

export default function PrintTemplates({ 
  printData, 
  printMode, 
  shopConfig, 
  onClosePrint 
}) {
  const [activeFormat, setActiveFormat] = useState(() => {
    if (printMode === 'a4') return 'a4';
    if (printMode === 'thermal-58') return 'thermal-58';
    return printMode || 'thermal';
  });
  const [copies, setCopies] = useState(shopConfig?.normalPrintCopies || 1);

  if (!printData) return null;

  const isInvoiceBill = Boolean(printData.invoiceNo || printData.items);

  return (
    <div className="print-modal-container" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Top Floating Control Bar (Hidden on actual print) */}
      <div className="no-print" style={{ 
        background: '#111622', 
        color: '#FFF', 
        padding: '0.65rem 1.25rem', 
        borderRadius: '8px', 
        display: 'flex', 
        gap: '0.75rem', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: '1rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }}>
        {/* Format Switcher if document is an invoice / cash memo */}
        {isInvoiceBill && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.08)', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#AAA', fontWeight: 600 }}>Printer:</span>
            <button
              onClick={() => setActiveFormat('thermal')}
              style={{
                background: activeFormat === 'thermal' ? 'var(--accent-primary)' : 'transparent',
                color: '#FFF',
                border: 'none',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🧾 3" Thermal (80mm)
            </button>
            <button
              onClick={() => setActiveFormat('thermal-58')}
              style={{
                background: activeFormat === 'thermal-58' ? 'var(--accent-primary)' : 'transparent',
                color: '#FFF',
                border: 'none',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🧾 2" Thermal (58mm)
            </button>
            <button
              onClick={() => setActiveFormat('a4')}
              style={{
                background: activeFormat === 'a4' ? 'var(--accent-primary)' : 'transparent',
                color: '#FFF',
                border: 'none',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📄 Normal Printer (A4)
            </button>
          </div>
        )}

        {/* Copies selector for A4 normal printer */}
        {activeFormat === 'a4' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
            <span style={{ color: '#AAA' }}>Copies:</span>
            <select
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              style={{ background: '#222', color: '#FFF', border: '1px solid #444', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
            >
              <option value={1}>1 Copy (Original for Buyer)</option>
              <option value={2}>2 Copies (Original + Shop Duplicate)</option>
            </select>
          </div>
        )}

        <button
          onClick={() => window.print()}
          style={{
            background: 'var(--accent-primary)',
            color: '#FFF',
            padding: '0.45rem 1.1rem',
            borderRadius: '4px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          🖨️ Print Now
        </button>

        <button
          onClick={onClosePrint}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#FFF',
            padding: '0.45rem 0.9rem',
            borderRadius: '4px',
            cursor: 'pointer',
            border: 'none'
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Actual Printable Document Container */}
      <div className={`print-container${activeFormat === 'a4' ? ' print-invoice-a4' : ''}`} style={{ background: '#FFFFFF', color: '#000000', margin: '0 auto', boxShadow: '0 0 20px rgba(0,0,0,0.2)' }}>
        
        {/* ========================================================== */}
        {/* MODE 1A: 3-INCH (80mm) THERMAL POS RECEIPT                 */}
        {/* ========================================================== */}
        {activeFormat === 'thermal' && (
          <div className="thermal-receipt-80mm" style={{ width: '78mm', padding: '3mm', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.3 }}>
            
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '3mm', marginBottom: '3mm' }}>
              <img
                src={shopConfig.logo || "/alzino-logo.png"}
                alt="ALZINO"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                  margin: '0 auto 2mm auto',
                  filter: 'grayscale(100%) contrast(140%)'
                }}
              />
              <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>{shopConfig.name}</div>
              <div style={{ fontSize: '10px' }}>{shopConfig.tagline}</div>
              <div style={{ fontSize: '10px' }}>{shopConfig.address}</div>
              <div style={{ fontSize: '10px' }}>Tel: {shopConfig.phone}</div>
              {!printData.isNonGst ? (
                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>GSTIN: {shopConfig.gstin}</div>
              ) : (
                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>*** ESTIMATE / CASH MEMO (NON-GST) ***</div>
              )}
            </div>

            {/* Invoice Meta */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '2mm', marginBottom: '2mm', fontSize: '10px' }}>
              <div><strong>{printData.isNonGst ? 'ESTIMATE NO:' : 'INVOICE:'}</strong> {printData.invoiceNo}</div>
              <div><strong>DATE:</strong> {printData.date} | <strong>ADMIN:</strong> ALZINO POS</div>
              <div><strong>CUSTOMER:</strong> {printData.customerName || 'Walk-in'}</div>
              {printData.customerPhone && <div><strong>PHONE:</strong> {printData.customerPhone}</div>}
              {!printData.isNonGst && printData.customerGstin && <div><strong>GSTIN:</strong> {printData.customerGstin}</div>}
            </div>

            {/* Items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '3mm' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                  <th style={{ width: '50%' }}>ITEM</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>QTY</th>
                  <th style={{ width: '35%', textAlign: 'right' }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {printData.items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <tr>
                      <td style={{ paddingTop: '2px', fontWeight: 'bold' }}>{item.name}</td>
                      <td style={{ textAlign: 'center', paddingTop: '2px' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right', paddingTop: '2px' }}>₹{item.total.toLocaleString()}</td>
                    </tr>
                    {/* Print IMEIs if present */}
                    {item.imeis && item.imeis.length > 0 && (
                      <tr>
                        <td colSpan={3} style={{ fontSize: '9px', paddingLeft: '4px', color: '#222' }}>
                          IMEI: {item.imeis.join(', ')}
                        </td>
                      </tr>
                    )}
                    {/* Print Refurbished / Device Condition, Warranty, Accessories */}
                    {(item.condition || item.warranty || item.accessories) && (
                      <tr>
                        <td colSpan={3} style={{ fontSize: '8.5px', paddingLeft: '4px', color: '#444', lineHeight: 1.25 }}>
                          {item.condition && <div>• Cond: {item.condition}</div>}
                          {item.warranty && <div>• Warranty: {item.warranty}</div>}
                          {item.accessories && <div>• Included: {item.accessories}</div>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ borderTop: '1px dashed #000', paddingTop: '2mm', marginBottom: '2mm', fontSize: '10px' }}>
              {!printData.isNonGst ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>TAXABLE SUB-TOTAL:</span>
                    <span>₹{printData.taxableAmount ? printData.taxableAmount.toFixed(2) : printData.subtotal}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CGST (9%):</span>
                    <span>₹{printData.cgstTotal ? printData.cgstTotal.toFixed(2) : '0.00'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>SGST (9%):</span>
                    <span>₹{printData.sgstTotal ? printData.sgstTotal.toFixed(2) : '0.00'}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>ITEM SUB-TOTAL:</span>
                  <span>₹{printData.taxableAmount ? printData.taxableAmount.toFixed(2) : printData.subtotal}</span>
                </div>
              )}

              {printData.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>DISCOUNT:</span>
                  <span>-₹{printData.discount}</span>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', borderTop: '1px solid #000', marginTop: '2mm', paddingTop: '1mm' }}>
                <span>{printData.isRepairInvoice ? 'TOTAL SERVICE CHARGE:' : 'NET TOTAL:'}</span>
                <span>₹{printData.grandTotal.toLocaleString()}</span>
              </div>

              {printData.advancePaid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '1mm', color: '#333' }}>
                  <span>LESS ADVANCE (INTAKE):</span>
                  <span>-₹{Number(printData.advancePaid).toLocaleString()}</span>
                </div>
              )}

              {printData.advancePaid > 0 && printData.khataDue === 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 'bold', marginTop: '1mm', borderTop: '1px dotted #000', paddingTop: '0.8mm' }}>
                  <span>COLLECTED TODAY ({printData.paymentMode}):</span>
                  <span>₹{Number(printData.balanceCollectedNow ?? (printData.grandTotal - printData.advancePaid)).toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '1mm' }}>
                <span>TOTAL AMOUNT PAID:</span>
                <span>₹{Number(printData.paidAmount ?? (printData.khataDue > 0 ? (printData.advancePaid || 0) : printData.grandTotal)).toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '0.5mm' }}>
                <span>PAYMENT MODE:</span>
                <span>{printData.paymentMode}</span>
              </div>

              {printData.advancePaid > 0 && printData.khataDue === 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: 'bold', marginTop: '0.5mm', color: '#047857' }}>
                  <span>BALANCE REMAINING DUE:</span>
                  <span>₹0 (PAID IN FULL)</span>
                </div>
              )}

              {/* Thermal EMI Details */}
              {printData.emiDetails && (
                <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '1.5mm 0', margin: '1.5mm 0', fontSize: '9px' }}>
                  <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '10px', marginBottom: '1mm' }}>
                    *** EMI FINANCE DETAILS ***
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>FINANCIER:</span>
                    <strong>{printData.emiDetails.financier}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>DOWN PAYMENT:</span>
                    <span>₹{Number(printData.emiDetails.downPayment || 0).toLocaleString()} ({printData.emiDetails.downPaymentMode || 'PAID'})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>LOAN AMOUNT:</span>
                    <span>₹{Number(printData.emiDetails.loanAmount || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>TENURE:</span>
                    <span>{printData.emiDetails.tenureMonths} Months @ ₹{Number(printData.emiDetails.monthlyEmi || 0).toLocaleString()}/mo</span>
                  </div>
                  {printData.emiDetails.approvalCode && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>APPROVAL / DO:</span>
                      <strong>{printData.emiDetails.approvalCode}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Thermal Split Details */}
              {printData.splitDetails && (
                <div style={{ borderTop: '1px dashed #000', padding: '1.5mm 0', margin: '1.5mm 0', fontSize: '9px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CASH RECEIVED:</span>
                    <span>₹{Number(printData.splitDetails.cashAmount || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ONLINE UPI:</span>
                    <span>₹{Number(printData.splitDetails.upiAmount || 0).toLocaleString()}</span>
                  </div>
                  {printData.splitDetails.upiRef && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>UPI UTR:</span>
                      <span>{printData.splitDetails.upiRef}</span>
                    </div>
                  )}
                </div>
              )}

              {printData.paymentRef && !printData.emiDetails && !printData.splitDetails && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '1mm' }}>
                  <span>REF / UTR:</span>
                  <span>{printData.paymentRef}</span>
                </div>
              )}

              {printData.khataDue > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#D00', marginTop: '1mm' }}>
                  <span>KHATA / DUE BALANCE:</span>
                  <span>₹{printData.khataDue.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* UPI QR for counter receipt */}
            {(() => {
              const qrAmount = (printData.advancePaid > 0 && printData.khataDue === 0)
                ? Number(printData.balanceCollectedNow ?? Math.max(0, printData.grandTotal - printData.advancePaid))
                : (printData.khataDue > 0 ? Number(printData.khataDue) : Number(printData.grandTotal));

              if (qrAmount <= 0) {
                return (
                  <div style={{ textAlign: 'center', marginTop: '2.5mm', padding: '1.5mm 0', borderTop: '1px dashed #000', fontSize: '9px', fontWeight: 'bold' }}>
                    ✓ ALL CHARGES FULLY PAID
                  </div>
                );
              }

              return (
                <div style={{ textAlign: 'center', marginTop: '3mm', padding: '2mm 0', borderTop: '1px dashed #000' }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '1mm' }}>
                    SCAN TO PAY ₹{qrAmount.toLocaleString()} VIA ANY UPI APP
                  </div>
                  <img 
                    src={shopConfig.qrCodeImage || getUpiQrUrl(shopConfig.upiId, shopConfig.name, qrAmount, printData.invoiceNo)} 
                    alt="UPI QR"
                    style={{ width: '32mm', height: '32mm', margin: '0 auto', display: 'block', objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '8px', marginTop: '1mm' }}>{shopConfig.upiId}</div>
                </div>
              );
            })()}

            {/* Custom Notes */}
            {printData.notes && (
              <div style={{ borderTop: '1px dashed #000', paddingTop: '1.5mm', marginTop: '1.5mm', fontSize: '9px', fontStyle: 'italic', textAlign: 'center' }}>
                Note: {printData.notes}
              </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '3mm', borderTop: '1px dashed #000', paddingTop: '2mm' }}>
              <div>*** THANK YOU! VISIT AGAIN ***</div>
              <div>Save Paper, Save Trees</div>
              <div style={{ fontSize: '8px', color: '#555', marginTop: '1mm' }}>Software by ALZINO ERP Bodhan</div>
            </div>

          </div>
        )}

        {/* ========================================================== */}
        {/* MODE 1B: 2-INCH (58mm) COMPACT THERMAL POS RECEIPT         */}
        {/* ========================================================== */}
        {activeFormat === 'thermal-58' && (
          <div className="thermal-receipt-58mm" style={{ width: '54mm', padding: '2mm 1mm', fontFamily: 'monospace', fontSize: '9px', lineHeight: 1.25, color: '#000' }}>
            
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '2mm', marginBottom: '2mm' }}>
              <img
                src={shopConfig.logo || "/alzino-logo.png"}
                alt="ALZINO"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                  margin: '0 auto 1.5mm auto',
                  filter: 'grayscale(100%) contrast(140%)'
                }}
              />
              <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{shopConfig.name}</div>
              <div style={{ fontSize: '8.5px' }}>{shopConfig.tagline}</div>
              <div style={{ fontSize: '8px' }}>{shopConfig.address}</div>
              <div style={{ fontSize: '8.5px' }}>Tel: {shopConfig.phone}</div>
              {!printData.isNonGst ? (
                <div style={{ fontSize: '8.5px', fontWeight: 'bold' }}>GST: {shopConfig.gstin}</div>
              ) : (
                <div style={{ fontSize: '8.5px', fontWeight: 'bold' }}>* ESTIMATE / CASH MEMO *</div>
              )}
            </div>

            {/* Meta */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '1.5mm', marginBottom: '1.5mm', fontSize: '8.5px' }}>
              <div><strong>{printData.isNonGst ? 'EST:' : 'INV:'}</strong> {printData.invoiceNo}</div>
              <div><strong>DT:</strong> {printData.date}</div>
              <div><strong>CUST:</strong> {printData.customerName || 'Walk-in'}</div>
              {printData.customerPhone && <div><strong>PH:</strong> {printData.customerPhone}</div>}
            </div>

            {/* Items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px', marginBottom: '2mm' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                  <th style={{ width: '50%' }}>ITEM</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Q</th>
                  <th style={{ width: '35%', textAlign: 'right' }}>AMT</th>
                </tr>
              </thead>
              <tbody>
                {printData.items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <tr>
                      <td style={{ paddingTop: '2px', fontWeight: 'bold', wordBreak: 'break-word' }}>{item.name}</td>
                      <td style={{ textAlign: 'center', paddingTop: '2px' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right', paddingTop: '2px' }}>₹{item.total.toLocaleString()}</td>
                    </tr>
                    {item.imeis && item.imeis.length > 0 && (
                      <tr>
                        <td colSpan={3} style={{ fontSize: '7.5px', paddingLeft: '2px', color: '#333' }}>
                          IMEI: {item.imeis.join(', ')}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ borderTop: '1px dashed #000', paddingTop: '1.5mm', marginBottom: '1.5mm', fontSize: '8.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', borderTop: '1px solid #000', marginTop: '1mm', paddingTop: '1mm' }}>
                <span>{printData.isRepairInvoice ? 'TOTAL CHARGES:' : 'NET TOTAL:'}</span>
                <span>₹{printData.grandTotal.toLocaleString()}</span>
              </div>

              {printData.advancePaid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', marginTop: '1px', color: '#333' }}>
                  <span>ADVANCE (INTAKE):</span>
                  <span>-₹{Number(printData.advancePaid).toLocaleString()}</span>
                </div>
              )}

              {printData.advancePaid > 0 && printData.khataDue === 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: 'bold', marginTop: '1px', borderTop: '1px dotted #000', paddingTop: '1px' }}>
                  <span>COLLECTED TODAY:</span>
                  <span>₹{Number(printData.balanceCollectedNow ?? (printData.grandTotal - printData.advancePaid)).toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', marginTop: '1px' }}>
                <span>MODE:</span>
                <span>{printData.paymentMode}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', marginTop: '1px' }}>
                <span>TOTAL PAID:</span>
                <span>₹{Number(printData.paidAmount ?? (printData.khataDue > 0 ? (printData.advancePaid || 0) : printData.grandTotal)).toLocaleString()}</span>
              </div>

              {printData.khataDue > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', color: '#D00', marginTop: '1px' }}>
                  <span>DUE (KHATA):</span>
                  <span>₹{printData.khataDue.toLocaleString()}</span>
                </div>
              )}

              {printData.advancePaid > 0 && printData.khataDue === 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', fontWeight: 'bold', color: '#047857', marginTop: '1px' }}>
                  <span>BALANCE:</span>
                  <span>₹0 (PAID IN FULL)</span>
                </div>
              )}
            </div>

            {/* QR */}
            {(() => {
              const qrAmount = (printData.advancePaid > 0 && printData.khataDue === 0)
                ? Number(printData.balanceCollectedNow ?? Math.max(0, printData.grandTotal - printData.advancePaid))
                : (printData.khataDue > 0 ? Number(printData.khataDue) : Number(printData.grandTotal));

              if (qrAmount <= 0) {
                return (
                  <div style={{ textAlign: 'center', marginTop: '1.5mm', padding: '1mm 0', borderTop: '1px dashed #000', fontSize: '8px', fontWeight: 'bold' }}>
                    ✓ ALL CHARGES FULLY PAID
                  </div>
                );
              }

              return (
                <div style={{ textAlign: 'center', marginTop: '2mm', padding: '1mm 0', borderTop: '1px dashed #000' }}>
                  <div style={{ fontSize: '7.5px', fontWeight: 'bold', marginBottom: '1px' }}>PAY ₹{qrAmount.toLocaleString()} VIA UPI</div>
                  <img 
                    src={shopConfig.qrCodeImage || getUpiQrUrl(shopConfig.upiId, shopConfig.name, qrAmount, printData.invoiceNo)} 
                    alt="UPI QR"
                    style={{ width: '26mm', height: '26mm', margin: '0 auto', display: 'block' }}
                  />
                  <div style={{ fontSize: '7px', marginTop: '1px' }}>{shopConfig.upiId}</div>
                </div>
              );
            })()}

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '7.5px', marginTop: '2mm', borderTop: '1px dashed #000', paddingTop: '1.5mm' }}>
              <div>THANK YOU! VISIT AGAIN</div>
              <div>ALZINO ERP • Bodhan</div>
            </div>

          </div>
        )}

        {/* ========================================================== */}
        {/* MODE 2: FULL A4 TAX INVOICE / NON-GST ESTIMATE             */}
        {/* ========================================================== */}
        {activeFormat === 'a4' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8mm' }}>
            {[1, ...(copies === 2 ? [2] : [])].map((copyNum) => (
              <div className="invoice-a4-sheet"
                key={copyNum} 
                style={{ 
                  width: '210mm', 
                  minHeight: '297mm', 
                  padding: '12mm', 
                  fontFamily: "'Plus Jakarta Sans', sans-serif", 
                  fontSize: '12px', 
                  color: '#111', 
                  boxSizing: 'border-box',
                  pageBreakBefore: copyNum === 2 ? 'always' : 'auto'
                }}
              >
                {/* Tax Invoice Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #3B60C5', paddingBottom: '6mm', marginBottom: '6mm' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img
                      src={shopConfig.logo || "/alzino-logo.png"}
                      alt="ALZINO"
                      style={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #3B60C5',
                        boxShadow: '0 2px 8px rgba(59,96,197,0.15)',
                        flexShrink: 0
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#3B60C5', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                        {shopConfig.name}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#444', marginTop: '2px' }}>{shopConfig.tagline}</div>
                      <div style={{ fontSize: '11px', color: '#555', marginTop: '2px', maxWidth: '380px' }}>{shopConfig.address}</div>
                      <div style={{ fontSize: '11px', color: '#333', marginTop: '2px' }}>
                        <strong>Phone:</strong> {shopConfig.phone} | <strong>Email:</strong> {shopConfig.email}
                      </div>
                      {!printData.isNonGst && (
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginTop: '3px' }}>
                          GSTIN: {shopConfig.gstin} | State: Telangana (Code: {shopConfig.stateCode})
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {printData.isNonGst ? 'ESTIMATE / CASH MEMO' : 'TAX INVOICE'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: 700 }}>
                      {printData.isNonGst 
                        ? (copyNum === 1 ? '(COMMERCIAL ESTIMATE / BILL OF SUPPLY)' : '(SHOP RECORD COPY)') 
                        : (copyNum === 1 ? '(ORIGINAL FOR RECIPIENT)' : '(DUPLICATE FOR SUPPLIER / SHOP RECORD)')}
                    </div>
                    <div style={{ marginTop: '4mm', fontSize: '12px' }}>
                      <div><strong>{printData.isNonGst ? 'Estimate No:' : 'Invoice No:'}</strong> {printData.invoiceNo}</div>
                      <div><strong>Date:</strong> {printData.date}</div>
                      <div><strong>Place of Supply:</strong> Telangana (36)</div>
                      {!printData.isNonGst && <div><strong>Reverse Charge:</strong> No</div>}
                    </div>
                  </div>
                </div>

                {/* Bill To & Ship To Details Box */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #CCC', borderRadius: '4px', padding: '4mm', marginBottom: '6mm', background: '#FBFBFB' }}>
                  <div>
                    <div style={{ fontWeight: 700, borderBottom: '1px solid #DDD', paddingBottom: '2px', marginBottom: '3px', color: '#3B60C5' }}>
                      BILLED TO (BUYER DETAILS)
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{printData.customerName || 'Cash Customer'}</div>
                    <div>Address: {printData.customerAddress || 'Bodhan, Telangana'}</div>
                    <div>Phone: {printData.customerPhone || '—'}</div>
                    {!printData.isNonGst && <div>GSTIN / Unique ID: {printData.customerGstin || 'URP (Unregistered)'}</div>}
                    <div>State: Telangana (Code: 36)</div>
                  </div>

                  <div style={{ paddingLeft: '6mm', borderLeft: '1px solid #DDD' }}>
                    <div style={{ fontWeight: 700, borderBottom: '1px solid #DDD', paddingBottom: '2px', marginBottom: '3px', color: '#3B60C5' }}>
                      PAYMENT & DISPATCH DETAILS
                    </div>
                    <div>Payment Terms: {printData.paymentMode}</div>
                    <div>Payment Status: {printData.khataDue > 0 ? 'Partially Paid' : 'Paid in Full'}</div>
                    <div>Amount Paid: ₹{printData.paidAmount?.toLocaleString()}</div>
                    {printData.khataDue > 0 && (
                      <div style={{ color: '#D00', fontWeight: 700 }}>
                        Balance Receivable (Khata): ₹{printData.khataDue.toLocaleString()}
                      </div>
                    )}
                    <div>Dispatched By: Hand Delivery (Over Counter)</div>
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '6mm' }}>
                  <thead>
                    <tr style={{ background: '#3B60C5', color: '#FFF', textAlign: 'left' }}>
                      <th style={{ padding: '6px 4px', border: '1px solid #3B60C5' }}>#</th>
                      <th style={{ padding: '6px 4px', border: '1px solid #3B60C5' }}>ITEM DESCRIPTION & SPECIFICATIONS</th>
                      <th style={{ padding: '6px 4px', border: '1px solid #3B60C5' }}>HSN</th>
                      <th style={{ padding: '6px 4px', border: '1px solid #3B60C5', textAlign: 'center' }}>QTY</th>
                      <th style={{ padding: '6px 4px', border: '1px solid #3B60C5', textAlign: 'right' }}>RATE</th>
                      {!printData.isNonGst && (
                        <>
                          <th style={{ padding: '6px 4px', border: '1px solid #3B60C5', textAlign: 'right' }}>TAXABLE</th>
                          <th style={{ padding: '6px 4px', border: '1px solid #3B60C5', textAlign: 'right' }}>CGST</th>
                          <th style={{ padding: '6px 4px', border: '1px solid #3B60C5', textAlign: 'right' }}>SGST</th>
                        </>
                      )}
                      <th style={{ padding: '6px 4px', border: '1px solid #3B60C5', textAlign: 'right' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.items.map((item, idx) => {
                      const rateVal = printData.isNonGst ? item.rate : (item.rate / (1 + (item.gstRate / 100)));
                      const taxVal = item.taxable || (item.total / (1 + (item.gstRate / 100)));
                      const cgstVal = (item.total - taxVal) / 2;
                      const sgstVal = cgstVal;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #DDD' }}>
                          <td style={{ padding: '6px 4px', border: '1px solid #EEE' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 4px', border: '1px solid #EEE' }}>
                            <div style={{ fontWeight: 700 }}>{item.name}</div>
                            {item.imeis && item.imeis.length > 0 && (
                              <div style={{ fontSize: '10px', color: '#333', fontFamily: 'monospace', marginTop: '2px' }}>
                                IMEI/Serial: {item.imeis.join(', ')}
                              </div>
                            )}
                            {(item.condition || item.warranty || item.accessories) && (
                              <div style={{ fontSize: '9.5px', color: '#555', marginTop: '2px', lineHeight: 1.3 }}>
                                {item.condition && <div><span style={{ fontWeight: 600 }}>Condition:</span> {item.condition}</div>}
                                {item.warranty && <div><span style={{ fontWeight: 600, color: '#3B60C5' }}>Warranty:</span> {item.warranty}</div>}
                                {item.accessories && <div><span style={{ fontWeight: 600 }}>Included Accessories:</span> {item.accessories}</div>}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '6px 4px', border: '1px solid #EEE', fontFamily: 'monospace' }}>{item.hsn || '—'}</td>
                          <td style={{ padding: '6px 4px', border: '1px solid #EEE', textAlign: 'center' }}>{item.qty} PCS</td>
                          <td style={{ padding: '6px 4px', border: '1px solid #EEE', textAlign: 'right', fontFamily: 'monospace' }}>
                            ₹{rateVal.toFixed(2)}
                          </td>
                          {!printData.isNonGst && (
                            <>
                              <td style={{ padding: '6px 4px', border: '1px solid #EEE', textAlign: 'right', fontFamily: 'monospace' }}>
                                ₹{taxVal.toFixed(2)}
                              </td>
                              <td style={{ padding: '6px 4px', border: '1px solid #EEE', textAlign: 'right', fontFamily: 'monospace' }}>
                                ₹{cgstVal.toFixed(2)} ({item.gstRate / 2}%)
                              </td>
                              <td style={{ padding: '6px 4px', border: '1px solid #EEE', textAlign: 'right', fontFamily: 'monospace' }}>
                                ₹{sgstVal.toFixed(2)} ({item.gstRate / 2}%)
                              </td>
                            </>
                          )}
                          <td style={{ padding: '6px 4px', border: '1px solid #EEE', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                            ₹{item.total.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Calculations & Total Table */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8mm', marginBottom: '6mm' }}>
                  <div>
                    <div style={{ padding: '3mm', background: '#F8F9FA', border: '1px solid #E5E5E5', borderRadius: '4px', marginBottom: '4mm' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#3B60C5', marginBottom: '2px' }}>INVOICE AMOUNT IN WORDS:</div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>
                        {numberToWords(printData.grandTotal)}
                      </div>
                    </div>

                    {/* A4 EMI Finance Sanction Details */}
                    {printData.emiDetails && (
                      <div style={{ padding: '3mm', background: '#F0FDF4', border: '1.5px solid #16A34A', borderRadius: '4px', marginBottom: '4mm' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#15803D', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>CONSUMER FINANCE / EMI DETAILS:</span>
                          <span style={{ background: '#DCFCE7', color: '#166534', padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontWeight: 700 }}>SANCTIONED</span>
                        </div>
                        <div style={{ fontSize: '10.5px', lineHeight: 1.45 }}>
                          <div><strong>Financier Partner:</strong> {printData.emiDetails.financier}</div>
                          <div><strong>Down Payment Received:</strong> ₹{Number(printData.emiDetails.downPayment || 0).toLocaleString()} ({printData.emiDetails.downPaymentMode || 'PAID'})</div>
                          <div><strong>Loan / Financed Amount:</strong> ₹{Number(printData.emiDetails.loanAmount || 0).toLocaleString()}</div>
                          <div><strong>Tenure & Installments:</strong> {printData.emiDetails.tenureMonths} Months @ ₹{Number(printData.emiDetails.monthlyEmi || 0).toLocaleString()} / month</div>
                          {printData.emiDetails.approvalCode && (
                            <div><strong>Approval / DO Number:</strong> {printData.emiDetails.approvalCode}</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ padding: '3mm', background: '#F8F9FA', border: '1px solid #E5E5E5', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#3B60C5', marginBottom: '2px' }}>BANK DETAILS FOR NEFT/RTGS:</div>
                        <div><strong>Bank:</strong> {shopConfig.bankName}</div>
                        <div><strong>Account No:</strong> {shopConfig.accountNo}</div>
                        <div><strong>IFSC Code:</strong> {shopConfig.ifsc}</div>
                        <div><strong>UPI ID:</strong> {shopConfig.upiId}</div>
                      </div>
                      <div style={{ textAlign: 'center', marginLeft: '3mm' }}>
                        <img 
                          src={shopConfig.qrCodeImage || getUpiQrUrl(shopConfig.upiId, shopConfig.name, printData.grandTotal, printData.invoiceNo)} 
                          alt="UPI QR"
                          style={{ width: '22mm', height: '22mm', objectFit: 'contain', display: 'block', margin: '0 auto', border: '1px solid #E5E5E5', padding: '1mm', background: '#FFF' }}
                        />
                        <div style={{ fontSize: '7.5px', fontWeight: 800, marginTop: '1px' }}>SCAN & PAY</div>
                      </div>
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div style={{ border: '1px solid #CCC', borderRadius: '4px', padding: '4mm', background: '#FFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>{printData.isNonGst ? 'Subtotal Amount:' : 'Total Taxable Value:'}</span>
                      <span style={{ fontFamily: 'monospace' }}>₹{printData.taxableAmount ? printData.taxableAmount.toFixed(2) : printData.subtotal}</span>
                    </div>
                    {!printData.isNonGst && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>Central GST (CGST 9%):</span>
                          <span style={{ fontFamily: 'monospace' }}>₹{printData.cgstTotal ? printData.cgstTotal.toFixed(2) : '0.00'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>State GST (SGST 9%):</span>
                          <span style={{ fontFamily: 'monospace' }}>₹{printData.sgstTotal ? printData.sgstTotal.toFixed(2) : '0.00'}</span>
                        </div>
                      </>
                    )}
                    {printData.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#10B981' }}>
                        <span>Special Discount:</span>
                        <span style={{ fontFamily: 'monospace' }}>-₹{printData.discount}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #3B60C5', marginTop: '3mm', paddingTop: '2mm', fontSize: '16px', fontWeight: 800, color: '#3B60C5' }}>
                      <span>{printData.isRepairInvoice ? 'TOTAL SERVICE AMOUNT:' : (printData.isNonGst ? 'TOTAL ESTIMATE AMOUNT:' : 'GRAND TOTAL:')}</span>
                      <span>₹{printData.grandTotal.toLocaleString()}</span>
                    </div>

                    {printData.advancePaid > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2mm', fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                        <span>Less Advance Paid at Intake:</span>
                        <span>-₹{Number(printData.advancePaid).toLocaleString()}</span>
                      </div>
                    )}

                    {printData.advancePaid > 0 && printData.khataDue === 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2mm', fontSize: '13px', fontWeight: 800, color: '#111827', borderTop: '1px solid #E5E7EB', paddingTop: '1.5mm' }}>
                        <span>Net Collected Today ({printData.paymentMode}):</span>
                        <span>₹{Number(printData.balanceCollectedNow ?? (printData.grandTotal - printData.advancePaid)).toLocaleString()}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5mm', fontSize: '11px', color: '#374151' }}>
                      <span>Total Amount Paid (Advance + Today):</span>
                      <strong>₹{Number(printData.paidAmount ?? (printData.khataDue > 0 ? (printData.advancePaid || 0) : printData.grandTotal)).toLocaleString()}</strong>
                    </div>

                    {/* Payment Mode & Reference info */}
                    <div style={{ marginTop: '2mm', paddingTop: '2mm', borderTop: '1px dashed #DDD', fontSize: '10.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                        <span>Payment Mode:</span>
                        <strong>{printData.paymentMode}</strong>
                      </div>
                      {printData.paymentRef && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '10px' }}>
                          <span>Ref / UTR Number:</span>
                          <span style={{ fontFamily: 'monospace' }}>{printData.paymentRef}</span>
                        </div>
                      )}
                      {printData.khataDue > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626', fontWeight: 700, marginTop: '1px' }}>
                          <span>Khata Balance Due:</span>
                          <span style={{ fontFamily: 'monospace' }}>₹{printData.khataDue.toLocaleString()}</span>
                        </div>
                      )}
                      {printData.advancePaid > 0 && printData.khataDue === 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 700, marginTop: '1px' }}>
                          <span>Remaining Balance:</span>
                          <span>₹0 (PAID IN FULL)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Special Remarks / Invoice Notes */}
                {printData.notes && (
                  <div style={{ marginBottom: '4mm', padding: '2mm 3mm', background: '#F8FAFC', borderLeft: '3px solid #3B60C5', fontSize: '10px', color: '#334155' }}>
                    <strong>Special Remarks / Notes:</strong> {printData.notes}
                  </div>
                )}

                {/* Terms and Signatures */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8mm', borderTop: '1px solid #CCC', paddingTop: '4mm' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', marginBottom: '2px' }}>TERMS & CONDITIONS:</div>
                    <div style={{ fontSize: '9px', color: '#666', lineHeight: 1.4 }}>
                      {shopConfig.termsConditions}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '24mm' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700 }}>For {shopConfig.name}</div>
                    <div style={{ borderTop: '1px dashed #777', width: '80%', margin: '0 auto', paddingTop: '2px', fontSize: '10px', color: '#444' }}>
                      Authorized Signatory & Stamp
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* ========================================================== */}
        {/* MODE 3: USED MOBILE STATUTORY POLICE DECLARATION VOUCHER   */}
        {/* ========================================================== */}
        {/* ========================================================== */}
        {/* MODE 3: USED MOBILE PURCHASE VOUCHER                       */}
        {/* ========================================================== */}
        {(activeFormat === 'voucher' || printMode === 'voucher') && (
          <div style={{ width: '210mm', padding: '14mm', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#111', boxSizing: 'border-box' }}>
            
            {/* Clean Store Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #3B60C5', paddingBottom: '4mm', marginBottom: '5mm' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={shopConfig.logo || "/alzino-logo.png"}
                  alt="ALZINO"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid #3B60C5',
                    flexShrink: 0
                  }}
                />
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#3B60C5', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    {shopConfig.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                    {shopConfig.address}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555' }}>
                    Phone: {shopConfig.phone} | GSTIN: {shopConfig.gstin}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', color: '#111' }}>
                  PURCHASE VOUCHER
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                  <strong>VOUCHER #:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{printData.voucherNo}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  <strong>DATE:</strong> {printData.date}
                </div>
              </div>
            </div>

            {/* Seller & Device Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '5mm', marginBottom: '5mm' }}>
              
              {/* Seller Particulars */}
              <div style={{ border: '1px solid #D5D5D5', borderRadius: '4px', padding: '4mm', background: '#FAFAFA' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#3B60C5', textTransform: 'uppercase', marginBottom: '3mm', borderBottom: '1px solid #E5E5E5', paddingBottom: '1.5mm' }}>
                  Seller Information
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2mm', fontSize: '11.5px' }}>
                  <div><strong>Name:</strong> {printData.sellerName}</div>
                  {printData.fatherName && <div><strong>Father / Relative:</strong> {printData.fatherName}</div>}
                  <div><strong>Mobile:</strong> {printData.mobile}</div>
                  <div><strong>ID Type:</strong> {printData.idType} ({printData.aadhaarNo})</div>
                  <div><strong>Address:</strong> {printData.address || 'Bodhan, Telangana'}</div>
                </div>

                {printData.idImage && (
                  <div style={{ marginTop: '3mm', paddingTop: '2.5mm', borderTop: '1px dashed #DDD' }}>
                    <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#666', marginBottom: '1.5mm' }}>
                      Attached {printData.idType || 'ID Document'}:
                    </div>
                    <img
                      src={printData.idImage}
                      alt="ID Proof"
                      style={{ maxHeight: '28mm', maxWidth: '100%', objectFit: 'contain', border: '1px solid #CCC', borderRadius: '2px' }}
                    />
                  </div>
                )}
              </div>

              {/* Handset Specifications */}
              <div style={{ border: '1px solid #D5D5D5', borderRadius: '4px', padding: '4mm', background: '#FAFAFA' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#3B60C5', textTransform: 'uppercase', marginBottom: '3mm', borderBottom: '1px solid #E5E5E5', paddingBottom: '1.5mm' }}>
                  Handset Specifications
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2mm', fontSize: '11.5px' }}>
                  <div><strong>Device:</strong> {printData.brand} {printData.model}</div>
                  <div><strong>Color / Appearance:</strong> {printData.color || 'Standard'}</div>
                  <div><strong>Condition:</strong> {printData.condition}</div>
                  <div><strong>Primary IMEI:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{printData.imei1}</span></div>
                  {printData.imei2 && <div><strong>Secondary IMEI:</strong> <span style={{ fontFamily: 'monospace' }}>{printData.imei2}</span></div>}
                </div>

                {(printData.billImage || (printData.deviceImages && printData.deviceImages.length > 0)) && (
                  <div style={{ marginTop: '3mm', paddingTop: '2.5mm', borderTop: '1px dashed #DDD', display: 'flex', gap: '3mm', flexWrap: 'wrap' }}>
                    {printData.billImage && (
                      <div>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', marginBottom: '1mm' }}>Original Bill:</div>
                        <img src={printData.billImage} alt="Original Bill" style={{ maxHeight: '24mm', maxWidth: '35mm', objectFit: 'contain', border: '1px solid #CCC', borderRadius: '2px' }} />
                      </div>
                    )}
                    {printData.deviceImages && printData.deviceImages.map((img, i) => (
                      <div key={i}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', marginBottom: '1mm' }}>Device Photo {i + 1}:</div>
                        <img src={img} alt={`Device ${i + 1}`} style={{ maxHeight: '24mm', maxWidth: '35mm', objectFit: 'contain', border: '1px solid #CCC', borderRadius: '2px' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Summary Box */}
            <div style={{ border: '1px solid #3B60C5', borderRadius: '4px', padding: '4mm', background: '#F4F7FD', marginBottom: '6mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>Payment Mode</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>{printData.paymentMode}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>Total Amount Paid to Seller</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#3B60C5', fontFamily: 'monospace' }}>
                  ₹{printData.buyPrice?.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Simple Clean Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm', marginTop: '8mm' }}>
              <div style={{ borderTop: '1px solid #444', paddingTop: '3mm', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>Seller's Signature</div>
                <div style={{ fontSize: '9px', color: '#666' }}>({printData.sellerName})</div>
              </div>

              <div style={{ borderTop: '1px solid #444', paddingTop: '3mm', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>For {shopConfig.name} Bodhan</div>
                <div style={{ fontSize: '9px', color: '#666' }}>Authorized Signatory</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', color: '#888', marginTop: '6mm' }}>
              Thank you for choosing {shopConfig.name}. Official Retail Purchase Voucher.
            </div>

          </div>
        )}

        {/* ========================================================== */}
        {/* MODE 4: REPAIR CLAIM TOKEN SLIP                           */}
        {/* ========================================================== */}
        {(activeFormat === 'repair' || printMode === 'repair') && (
          <div style={{ width: '78mm', padding: '3mm', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.3 }}>
            
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '2mm', marginBottom: '2mm' }}>
              <img
                src={shopConfig.logo || "/alzino-logo.png"}
                alt="ALZINO"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                  margin: '0 auto 1.5mm auto',
                  filter: 'grayscale(100%) contrast(140%)'
                }}
              />
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{shopConfig.name} REPAIR LAB</div>
              <div style={{ fontSize: '10px' }}>Bodhan, Telangana • Ph: {shopConfig.phone}</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2mm' }}>JOB TOKEN: {printData.jobId}</div>
            </div>

            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '2mm', marginBottom: '2mm', fontSize: '10px' }}>
              <div><strong>DATE:</strong> {printData.date}</div>
              <div><strong>CUSTOMER:</strong> {printData.customerName} ({printData.customerMobile})</div>
              <div><strong>DEVICE:</strong> {printData.deviceModel} {printData.color ? `(${printData.color})` : ''}</div>
              {printData.screenLock && <div><strong>LOCK INFO:</strong> {printData.screenLock}</div>}
              <div><strong>TECH ASSIGNED:</strong> {printData.technician}</div>
            </div>

            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '2mm', marginBottom: '2mm', fontSize: '10px' }}>
              <div style={{ fontWeight: 'bold' }}>REPORTED ISSUES:</div>
              {printData.issues.map((iss, i) => (
                <div key={i}>• {iss}</div>
              ))}
            </div>

            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '2mm', marginBottom: '2mm', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ESTIMATED COST:</span>
                <span>{printData.costInformedAfterChecking ? 'Informed after checking' : `₹${printData.estimatedCost || 0}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ADVANCE RECEIVED:</span>
                <span>₹{printData.advancePaid || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                <span>BALANCE DUE:</span>
                <span>{printData.costInformedAfterChecking ? 'Informed after checking' : `₹${printData.balanceDue || 0}`}</span>
              </div>
            </div>

            {/* Token Barcode */}
            <div 
              style={{ margin: '2mm 0' }}
              dangerouslySetInnerHTML={{ __html: renderBarcodeSvg(printData.jobId, 220, 50, true) }} 
            />

            <div style={{ textAlign: 'center', fontSize: '8px', color: '#333', marginTop: '2mm' }}>
              <div>* Present this slip at delivery counter to collect phone.</div>
              <div>* Shop not responsible for uncollected phones beyond 30 days.</div>
            </div>

          </div>
        )}

        {/* ========================================================== */}
        {/* MODE 5: BARCODE LABELS PRINT SHEET / SINGLE STICKER        */}
        {/* ========================================================== */}
        {(activeFormat === 'barcodes' || printMode === 'barcodes') && (
          printData.copies === 1 || printData.format === 'single' ? (
            <div style={{ width: '50mm', minHeight: '28mm', padding: '2.5mm', boxSizing: 'border-box', textAlign: 'center', background: '#FFF' }}>
              <div style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.5px' }}>{shopConfig.name} • BODHAN</div>
              <div style={{ fontSize: '8.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '1px 0' }}>
                {printData.title}
              </div>
              {(() => {
                const isBoth = printData.codeFormat === 'both';
                const isQr = printData.codeFormat === 'qr' || printData.barcode?.includes('QR-');
                const effectiveFormat = isBoth ? 'both' : (isQr ? 'qr' : 'barcode');
                const effectiveCode = (isQr || isBoth) && !printData.barcode?.startsWith('http')
                  ? buildProductScanUrl({ id: printData.id || printData.barcode, barcode: printData.barcode })
                  : printData.barcode;

                return (
                  <div 
                    style={{ margin: '1.5mm 0' }}
                    dangerouslySetInnerHTML={{ 
                      __html: renderCodeSvg(effectiveCode, effectiveFormat, 160, 48, true) 
                    }} 
                  />
                );
              })()}
              <div style={{ fontSize: '10.5px', fontWeight: 900 }}>
                ₹{Number(printData.price || 0).toLocaleString()} {printData.mrp && printData.mrp > printData.price ? <span style={{ textDecoration: 'line-through', fontSize: '7.5px', color: '#666', marginLeft: '4px' }}>MRP: ₹{Number(printData.mrp).toLocaleString()}</span> : null}
              </div>
            </div>
          ) : (
            <div style={{ width: '210mm', minHeight: '297mm', padding: '10mm', boxSizing: 'border-box' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: printData.format === 'sheet40' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', 
                gap: '4mm' 
              }}>
                {(() => {
                  const isBoth = printData.codeFormat === 'both';
                  const isQr = printData.codeFormat === 'qr' || printData.barcode?.includes('QR-');
                  const effectiveFormat = isBoth ? 'both' : (isQr ? 'qr' : 'barcode');
                  const effectiveCode = (isQr || isBoth) && !printData.barcode?.startsWith('http')
                    ? buildProductScanUrl({ id: printData.id || printData.barcode, barcode: printData.barcode })
                    : printData.barcode;

                  return Array.from({ length: printData.copies || 24 }).map((_, idx) => (
                    <div 
                      key={idx}
                      style={{
                        border: '1px solid #CCC',
                        borderRadius: '4px',
                        padding: '2mm',
                        textAlign: 'center',
                        background: '#FFF',
                        pageBreakInside: 'avoid'
                      }}
                    >
                      <div style={{ fontSize: '9px', fontWeight: 800 }}>{shopConfig.name} • BODHAN</div>
                      <div style={{ fontSize: '8px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {printData.title}
                      </div>
                      <div 
                        style={{ margin: '1mm 0' }}
                        dangerouslySetInnerHTML={{ 
                          __html: renderCodeSvg(effectiveCode, effectiveFormat, 160, 44, true) 
                        }} 
                      />
                      <div style={{ fontSize: '9px', fontWeight: 800 }}>
                        ₹{printData.price} {printData.mrp ? <span style={{ textDecoration: 'line-through', fontSize: '7px', color: '#666' }}>MRP: ₹{printData.mrp}</span> : null}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )
        )}

        {/* ========================================================== */}
        {/* MODE 6: CUSTOMER KHATA ACCOUNT STATEMENT (A4)              */}
        {/* ========================================================== */}
        {(activeFormat === 'khata-statement' || printMode === 'khata-statement') && (
          <div style={{ width: '210mm', minHeight: '297mm', padding: '14mm', boxSizing: 'border-box', fontFamily: 'var(--font-sans, system-ui, sans-serif)', fontSize: '12px', lineHeight: 1.4, color: '#152620' }}>
            
            {/* Header / Shop Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #0F251E', paddingBottom: '10px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src={shopConfig.logo || "/alzino-logo.png"}
                  alt="ALZINO"
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #0F251E',
                    flexShrink: 0
                  }}
                />
                <div>
                  <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#0F251E', letterSpacing: '-0.5px' }}>
                    {shopConfig.name || 'ALZINO'}
                  </h1>
                  <div style={{ fontSize: '11px', color: '#63756E', fontWeight: 600, marginTop: '2px' }}>
                    {shopConfig.tagline || 'Mobile Sales • Service • Accessories'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#152620', marginTop: '2px' }}>
                    {shopConfig.address || 'Station Road, Bodhan, Nizamabad Dist, Telangana - 503185'}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '2px' }}>
                    <strong>Phone:</strong> {shopConfig.phone || '+91 98490 00000'} | <strong>GSTIN:</strong> {shopConfig.gstin || '36ABCDE1234F1Z5'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ background: '#0F251E', color: '#F1EFE5', padding: '6px 14px', borderRadius: '4px', fontWeight: 800, fontSize: '13px', display: 'inline-block', letterSpacing: '0.5px' }}>
                  CUSTOMER KHATA STATEMENT
                </div>
                <div style={{ fontSize: '11px', marginTop: '8px' }}>
                  <strong>Statement Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '10px', color: '#63756E' }}>
                  Generated from ALZINO Offline POS
                </div>
              </div>
            </div>

            {/* Customer Details & Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ border: '1px solid #D2DED8', borderRadius: '6px', padding: '10px', background: '#FEFDFA' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#63756E', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Customer Details
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F251E' }}>
                  {printData.customer?.name}
                </div>
                <div style={{ fontSize: '12px', marginTop: '2px' }}>
                  <strong>Mobile:</strong> {printData.customer?.phone}
                </div>
                {printData.customer?.address && (
                  <div style={{ fontSize: '11px', color: '#63756E', marginTop: '2px' }}>
                    <strong>Address:</strong> {printData.customer?.address}
                  </div>
                )}
                {printData.customer?.gstin && (
                  <div style={{ fontSize: '11px', color: '#0C5B43', marginTop: '2px' }}>
                    <strong>GSTIN:</strong> {printData.customer?.gstin}
                  </div>
                )}
              </div>

              {/* Outstanding Balance Highlight Box */}
              <div style={{ border: '1.5px solid #0C5B43', borderRadius: '6px', padding: '10px', background: '#E1EEE5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '11px', color: '#0C5B43', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Current Outstanding Due (Baqaya)
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: printData.customer?.balanceDue > 0 ? '#D33F3C' : '#1F6E48', margin: '4px 0', fontFamily: 'monospace' }}>
                  ₹{(printData.customer?.balanceDue || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '10px', color: '#63756E' }}>
                  {printData.customer?.balanceDue > 0 ? 'Payment pending in ledger account' : 'Account is fully settled and cleared'}
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#0F251E', color: '#F1EFE5', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', width: '75px' }}>Date</th>
                  <th style={{ padding: '8px 6px', width: '90px' }}>Ref # / Type</th>
                  <th style={{ padding: '8px 6px' }}>Particulars / Items</th>
                  <th style={{ padding: '8px 6px', width: '85px', textAlign: 'right' }}>Debit (Billed)</th>
                  <th style={{ padding: '8px 6px', width: '85px', textAlign: 'right' }}>Credit (Paid)</th>
                  <th style={{ padding: '8px 6px', width: '95px', textAlign: 'right' }}>Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {(printData.ledger || []).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #D2DED8', background: idx % 2 === 0 ? '#FFFFFF' : '#F8F7F1' }}>
                    <td style={{ padding: '7px 6px', fontFamily: 'monospace' }}>{row.date}</td>
                    <td style={{ padding: '7px 6px', fontWeight: 700 }}>
                      <span style={{ 
                        fontSize: '9px', 
                        padding: '2px 5px', 
                        borderRadius: '3px',
                        background: row.type === 'INVOICE' ? '#DCF2FE' : '#D8F6E3',
                        color: row.type === 'INVOICE' ? '#207096' : '#1F6E48'
                      }}>
                        {row.refNo}
                      </span>
                    </td>
                    <td style={{ padding: '7px 6px' }}>
                      <div style={{ fontWeight: 600 }}>{row.description}</div>
                      <div style={{ fontSize: '9px', color: '#63756E' }}>Mode: {row.mode || 'Counter'}</div>
                    </td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                      {row.debit > 0 ? `₹${row.debit.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 700, color: '#1F6E48', fontFamily: 'monospace' }}>
                      {row.credit > 0 ? `₹${row.credit.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: row.runningBalance > 0 ? '#D33F3C' : '#1F6E48' }}>
                      ₹{row.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bottom Section: Payment UPI QR & Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '2px solid #0F251E', paddingTop: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid #D2DED8', borderRadius: '6px', padding: '10px', background: '#FEFDFA' }}>
                <img 
                  src={getUpiQrUrl(shopConfig.upiId || 'alzino.bodhan@okhdfcbank', shopConfig.name || 'ALZINO', printData.customer?.balanceDue || 0, `KHATA-${printData.customer?.id}`)} 
                  alt="UPI QR" 
                  style={{ width: '80px', height: '80px', display: 'block' }}
                />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F251E' }}>Scan to Pay via UPI</div>
                  <div style={{ fontSize: '10px', color: '#63756E', marginTop: '2px' }}>GPay / PhonePe / Paytm / BHIM</div>
                  <div style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', color: '#0C5B43', marginTop: '3px' }}>
                    {shopConfig.upiId || 'alzino.bodhan@okhdfcbank'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4px 0' }}>
                <div style={{ fontSize: '10px', color: '#63756E', fontStyle: 'italic' }}>
                  * For any balance discrepancy or confirmation, please contact our counter.
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F251E' }}>For {shopConfig.name || 'ALZINO'}</div>
                  <div style={{ marginTop: '28px', fontSize: '10px', borderTop: '1px dashed #63756E', display: 'inline-block', paddingTop: '3px', minWidth: '150px', textAlign: 'center' }}>
                    Authorized Signatory / Cashier
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================== */}
        {/* MODE 7: DAY-END CASH REGISTER Z-REPORT (3-INCH THERMAL)   */}
        {/* ========================================================== */}
        {(activeFormat === 'z-report' || printMode === 'z-report') && (
          <div style={{ width: '78mm', padding: '3mm', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.3, color: '#000000' }}>
            
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '3mm', marginBottom: '3mm' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{shopConfig.name || 'ALZINO'}</div>
              <div style={{ fontSize: '10px' }}>{shopConfig.address || 'Station Road, Bodhan'}</div>
              <div style={{ fontSize: '10px' }}>Tel: {shopConfig.phone || '+91 98490 00000'}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', margin: '3mm 0 1mm 0' }}>
                *** DAY-END CASH DRAWER Z-REPORT ***
              </div>
              <div style={{ fontSize: '9px' }}>CLOSING DATE: {printData.today || new Date().toISOString().split('T')[0]}</div>
              <div style={{ fontSize: '9px' }}>PRINTED AT: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            {/* 1. System Cash Drawer Flow */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '2.5mm', marginBottom: '2.5mm' }}>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '1.5mm' }}>
                1. SYSTEM CASH REGISTER FLOW
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Opening Cash Float:</span>
                <span>₹{(printData.openingCash || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>(+) Cash Sales (POS):</span>
                <span>+₹{(printData.todayCashSales || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>(-) Cash Expenses:</span>
                <span>-₹{(printData.todayCashExpenses || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>(-) Used Mobiles Payout:</span>
                <span>-₹{(printData.todayUsedPhonePayouts || 0).toLocaleString()}</span>
              </div>
              <div style={{ borderTop: '1px solid #000', marginTop: '1.5mm', paddingTop: '1.5mm', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>EXPECTED DRAWER CASH:</span>
                <span>₹{(printData.expectedCashInDrawer || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* 2. Physical Cash Tender Count */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '2.5mm', marginBottom: '2.5mm' }}>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '1.5mm' }}>
                2. PHYSICAL NOTE COUNT
              </div>
              {[500, 200, 100, 50, 20, 10].map(den => {
                const count = printData.denominations?.[den] || 0;
                if (count === 0) return null;
                return (
                  <div key={den} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>₹{den} x {count}:</span>
                    <span>₹{(den * count).toLocaleString()}</span>
                  </div>
                );
              })}
              {printData.denominations?.coins > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Coins:</span>
                  <span>₹{Number(printData.denominations.coins).toLocaleString()}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid #000', marginTop: '1.5mm', paddingTop: '1.5mm', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>TOTAL PHYSICAL CASH:</span>
                <span>₹{(printData.totalCountedCash || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* 3. Variance / Reconciliation */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '2.5mm', marginBottom: '2.5mm' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                <span>DRAWER VARIANCE:</span>
                <span>
                  {printData.cashDiscrepancy === 0 
                    ? '₹0 (PERFECT MATCH)' 
                    : printData.cashDiscrepancy > 0 
                      ? `+₹${printData.cashDiscrepancy.toLocaleString()} (EXCESS)` 
                      : `-₹${Math.abs(printData.cashDiscrepancy).toLocaleString()} (SHORTAGE)`}
                </span>
              </div>
            </div>

            {/* 4. Cashier Sign-off */}
            <div style={{ fontSize: '10px', lineHeight: 1.4 }}>
              <div><strong>CASHIER:</strong> {printData.cashierName || 'Counter Admin'}</div>
              {printData.closingRemarks && (
                <div><strong>REMARKS:</strong> {printData.closingRemarks}</div>
              )}
              <div style={{ marginTop: '8mm', borderTop: '1px dotted #000', paddingTop: '1.5mm', textAlign: 'center' }}>
                MANAGER / OWNER SIGNATURE
              </div>
              <div style={{ textAlign: 'center', marginTop: '2mm', fontSize: '8px' }}>
                --- END OF Z-REPORT ---
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
