 role={role}
            onPrintInvoice={handlePrintInvoice}
            quickBillProduct={quickBillProduct}
            clearQuickBillProduct={() => setQuickBillProduct(null)}
          />
        )}

        {activeTab === 'used-phones' && role === 'admin' && (
          <UsedMobileModule
            usedPurchases={usedPurchases}
            setUsedPurchases={setUsedPurchases}
            inventory={inventory}
            setInventory={setInventory}
            invoices={invoices}
            setInvoices={setInvoices}
            customers={customers}
            setCustomers={setCustomers}
            onPrintVoucher={handlePrintVoucher}
            onPrintInvoice={handlePrintInvoice}
            shopConfig={shopConfig}
          />
        )}

        {activeTab === 'repairs' && (
          <RepairLab
            repairJobs={repairJobs}
            setRepairJobs={setRepairJobs}
            invoices={invoices}
            setInvoices={setInvoices}
            customers={customers}
            setCustomers={setCustomers}
            inventory={inventory}
            setInventory={setInventory}
            shopConfig={shopConfig}
            role={role}
            onPrintRepairSlip={handlePrintRepairSlip}
            onPrintInvoice={handlePrintInvoice}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            inventory={inventory}
            setInventory={setInventory}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            role={role}
            shopConfig={shopConfig}
            onSelectBarcode={handleSelectBarcodeFromInventory}
            onPrintBarcodeSheet={handlePrintBarcodeSheet}
            onQuickBill={handleQuickBill}
            initialSearchTerm={inventorySearchTerm}
            onClearInitialSearchTerm={() => setInventorySearchTerm('')}
            onOpenUsedMobileIntake={() => handleSelectTab('used-phones')}
          />
        )}

        {activeTab === 'invoices' && role === 'admin' && (
          <InvoicesHub
            invoices={invoices}
            setInvoices={setInvoices}
            customers={customers}
            setCustomers={setCustomers}
            shopConfig={shopConfig}
            role={role}
            onPrintInvoice={handlePrintInvoice}
            onNavigateTab={handleSelectTab}
          />
        )}

        {activeTab === 'returns' && role === 'admin' && (
          <ReturnsManager
            invoices={invoices}
            setInvoices={setInvoices}
            inventory={inventory}
            setInventory={setInventory}
          />
        )}

        {activeTab === 'barcodes' && (
          <BarcodeGenerator
            inventory={inventory}
            selectedItemForBarcode={selectedItemForBarcode}
            shopConfig={shopConfig}
            onPrintBarcodeSheet={handlePrintBarcodeSheet}
          />
        )}

        {(activeTab === 'khata' || activeTab === 'customers') && role === 'admin' && (
          <CustomerKhata
            key={activeTab}
            initialView={activeTab === 'khata' ? 'khata' : 'customers'}
            customers={customers}
            setCustomers={setCustomers}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            invoices={invoices}
            setInvoices={setInvoices}
            repairJobs={repairJobs}
            setRepairJobs={setRepairJobs}
            shopConfig={shopConfig}
            onPrintKhataStatement={handlePrintKhataStatement}
            onPrintInvoice={handlePrintInvoice}
            onPrintRepairSlip={handlePrintRepairSlip}
          />
        )}

        {(activeTab === 'expenses' || activeTab === 'suppliers') && role === 'admin' && (
          <ExpenseSupplier
            key={activeTab}
            initialSubTab={activeTab === 'suppliers' ? 'suppliers' : 'expenses'}
            expenses={expenses}
            setExpenses={setExpenses}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            inventory={inventory}
            setInventory={setInventory}
            invoices={invoices}
            role={role}
          />
        )}

        {activeTab === 'reports' && role === 'admin' && (
          <AnalyticsReports
            invoices={invoices}
            expenses={expenses}
            inventory={inventory}
            customers={customers}
            usedPurchases={usedPurchases}
            repairJobs={repairJobs}
            shopConfig={shopConfig}
            onPrintInvoice={handlePrintInvoice}
            onPrintZReport={handlePrintZReport}
            role={role}
          />
        )}

        {activeTab === 'settings' && role === 'admin' && (
          <SettingsBackup
            shopConfig={shopConfig}
            setShopConfig={setShopConfig}
            inventory={inventory}
            setInventory={setInventory}
            usedPurchases={usedPurchases}
            setUsedPurchases={setUsedPurchases}
            repairJobs={repairJobs}
            setRepairJobs={setRepairJobs}
            customers={customers}
            setCustomers={setCustomers}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            expenses={expenses}
            setExpenses={setExpenses}
            invoices={invoices}
            setInvoices={setInvoices}
            warrantyClaims={warrantyClaims}
            setWarrantyClaims={setWarrantyClaims}
            role={role}
            setRole={setRole}
            onPrintInvoice={handlePrintInvoice}
          />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="no-print" style={{
        padding: '0.65rem 1.25rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--surface-primary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{shopConfig.name} ERP</span>
          <span>• Old Bus Stand, Bodhan, Nizamabad, Telangana – 503185</span>
        </div>
        <div>
          <span>Keyboard: <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>F2: POS</kbd> <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>F3: Stock</kbd> <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>F4: Used Phone</kbd> <kbd style={{ background: 'var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>⌘K: Search</kbd></span>
        </div>
      </footer>

    </div>
    )}

      {/* Signature Illoca Feature Demo Pullout Drawer (Admin/Cashier only) */}
      {portal !== 'customer' && (
        <IllocaPulloutDrawer
          isOpen={isPulloutOpen}
          onClose={() => setIsPulloutOpen(false)}
          inventory={inventory}
          shopConfig={shopConfig}
          onSelectProduct={(p) => {
            setIsPulloutOpen(false);
            handleSelectTab('pos');
          }}
          onOpenProductInventory={handleOpenProductInventory}
        />
      )}

      {/* Universal Search Modal (Cmd+K / F8) */}
      <UniversalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        inventory={inventory}
        repairJobs={repairJobs}
        usedPurchases={usedPurchases}
        customers={customers}
        invoices={invoices}
        onSelectAction={handleSearchAction}
      />

      {/* Print Document Modal */}
      {printData && (
        <PrintTemplates
          printData={printData}
          printMode={printMode}
          shopConfig={shopConfig}
          onClosePrint={() => setPrintData(null)}
        />
      )}

      {/* Admin authenticator gate */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={portal === 'admin' ? undefined : () => setIsAdminAuthModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Global Product QR Scan Specifications, Colours & Terms Modal */}
      {scannedProductModal && (
        <ProductScanDetailsModal
          product={scannedProductModal}
          inventory={inventory}
          isOpen={!!scannedProductModal}
          onClose={() => {
            setScannedProductModal(null);
            if (typeof window !== 'undefined' && window.location.search.includes('product=')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
          onQuickBill={handleQuickBill}
          shopConfig={shopConfig}
          role={role}
        />
      )}

    </>
    </Suspense>
  );
}
