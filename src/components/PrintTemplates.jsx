nancier}</strong>
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
              <AlzinoLogo height={20} textColor="#0F251E" swooshColor="#C99A20" style={{ margin: '0 auto 1.5mm' }} />
              {shopConfig.name && shopConfig.name.trim().toUpperCase() !== 'ALZINO' && <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{shopConfig.name}</div>}
              <div style={{ fontSize: '8.5px' }}>{shopConfig.tagline}</div>
              <div style={{ fontSize: '8px' }}>{shopConfig.address}</div>
              <div style={{ fontSize: '8.5px' }}>Tel: {shopConfig.phone}</div>
              {!printData.isNonGst ? (
                <div style={{ fontSize: '8.5px', fontWeight: 'bold' }}>GST: {shopConfig.gstin}</div>
              ) : (
                <div style={{ fontSize: '8.5px', fontWeight: 'bold' }}>* CASH MEMO *</div>
              )}
            </div>

            {/* Meta */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '1.5mm', marginBottom: '1.5mm', fontSize: '8.5px' }}>
              <div><strong>{printData.isNonGst ? 'BILL:' : 'INV:'}</strong> {printData.invoiceNo}</div>
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
                          {isMobileItem(item) ? 'IMEI' : 'Serial No.'}: {item.imeis.join(', ')}
                        </td>
                      </tr>
                    )}
                    {(item.warranty || normalizeProductTerms(item.termsAndConditions).length > 0) && (
                      <tr>
                        <td colSpan={3} style={{ fontSize: '7px', paddingLeft: '2px', color: '#333', lineHeight: 1.2 }}>
                          {item.warranty && <div>Warranty: {item.warranty}</div>}
                          {normalizeProductTerms(item.termsAndConditions).map((term, termIndex) => <div key={termIndex}>• {term}</div>)}
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
            {[1].map((copyNum) => (
              <div className="invoice-a4-sheet"
                key={copyNum} 
                style={{ 
                  width: '210mm', 
                  minHeight: 0,
                  padding: '12mm', 
                  fontFamily: "'Plus Jakarta Sans', sans-serif", 
                  fontSize: '12px', 
                  color: '#111', 
                  boxSizing: 'border-box',
                  pageBreakBefore: 'auto'
                }}
              >
                {/* Tax Invoice Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #3B60C5', paddingBottom: '6mm', marginBottom: '6mm' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <AlzinoLogo height={40} textColor="#0F251E" swooshColor="#C99A20" style={{ flexShrink: 0 }} />
                    <div>
                      {shopConfig.name && shopConfig.name.trim().toUpperCase() !== 'ALZINO' && <div style={{ fontSize: '18px', fontWeight: 800, color: '#3B60C5', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{shopConfig.name}</div>}
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
                      {printData.isNonGst ? 'CASH MEMO' : 'TAX INVOICE'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: 700 }}>
                      {printData.isNonGst 
                        ? (copyNum === 1 ? '(CUSTOMER COPY)' : '(SHOP RECORD COPY)')
                        : (copyNum === 1 ? '(ORIGINAL FOR RECIPIENT)' : '(DUPLICATE FOR SUPPLIER / SHOP RECORD)')}
                    </div>
                    <div style={{ marginTop: '4mm', fontSize: '12px' }}>
                      <div><strong>{printData.isNonGst ? 'Bill No:' : 'Invoice No:'}</strong> {printData.invoiceNo}</div>
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
                      <div style={{ color: '#D00', fontWeight: 