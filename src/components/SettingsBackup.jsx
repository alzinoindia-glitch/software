import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  Building, 
  Save, 
  Trash2,
  Plus,
  Landmark,
  Image as ImageIcon,
  Star
} from 'lucide-react';

export default function SettingsBackup({ 
  shopConfig, 
  setShopConfig, 
  inventory, 
  setInventory, 
  usedPurchases, 
  setUsedPurchases, 
  repairJobs, 
  setRepairJobs, 
  customers, 
  setCustomers, 
  suppliers, 
  setSuppliers, 
  expenses, 
  setExpenses, 
  invoices, 
  setInvoices, 
  role, 
  setRole,
  onPrintInvoice 
}) {
  const [formData, setFormData] = useState(() => {
    const initialAccounts = (shopConfig.upiAccounts && shopConfig.upiAccounts.length > 0)
      ? shopConfig.upiAccounts
      : [
          {
            id: 'upi-1',
            bankName: shopConfig.bankName || 'HDFC Bank, Bodhan',
            upiId: shopConfig.upiId || 'alzino.bodhan@okhdfcbank',
            accountName: shopConfig.name || 'ALZINO MOBILES',
            qrCodeImage: shopConfig.qrCodeImage || null,
            isDefault: true
          }
        ];
    return {
      ...shopConfig,
      defaultPrinter: shopConfig.defaultPrinter || 'thermal-80mm',
      thermalRollWidth: shopConfig.thermalRollWidth || '80mm',
      autoPrintOnCheckout: shopConfig.autoPrintOnCheckout !== false,
      normalPrintCopies: shopConfig.normalPrintCopies || 1,
      barcodeScannerBeep: shopConfig.barcodeScannerBeep !== false,
      barcodeScannerAutoAdd: shopConfig.barcodeScannerAutoAdd !== false,
      storageMode: shopConfig.storageMode || 'ssd-local',
      ssdAutoSave: shopConfig.ssdAutoSave !== false,
      upiAccounts: initialAccounts,
      qrCodeImage: shopConfig.qrCodeImage || initialAccounts.find(a => a.isDefault)?.qrCodeImage || null
    };
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Multi-Bank UPI & QR Code Management Handlers
  const handleQrImageUpload = (e, accountId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is larger than 5MB. Please upload an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      setFormData(prev => {
        const accounts = (prev.upiAccounts || []).map(acc => {
          if (acc.id === accountId) {
            return { ...acc, qrCodeImage: base64Data };
          }
          return acc;
        });

        const defaultAcc = accounts.find(a => a.isDefault);
        return {
          ...prev,
          upiAccounts: accounts,
          qrCodeImage: defaultAcc ? defaultAcc.qrCodeImage : base64Data
        };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrImage = (accountId) => {
    setFormData(prev => {
      const accounts = (prev.upiAccounts || []).map(acc => {
        if (acc.id === accountId) {
          return { ...acc, qrCodeImage: null };
        }
        return acc;
      });
      const defaultAcc = accounts.find(a => a.isDefault);
      return {
        ...prev,
        upiAccounts: accounts,
        qrCodeImage: defaultAcc ? defaultAcc.qrCodeImage : null
      };
    });
  };

  const handleAddUpiAccount = () => {
    const newId = `upi-${Date.now()}`;
    const newAccount = {
      id: newId,
      bankName: '',
      upiId: '',
      accountName: formData.name || 'ALZINO',
      qrCodeImage: null,
      isDefault: (formData.upiAccounts || []).length === 0
    };
    setFormData(prev => ({
      ...prev,
      upiAccounts: [...(prev.upiAccounts || []), newAccount]
    }));
  };

  const handleUpdateUpiAccount = (id, field, value) => {
    setFormData(prev => {
      const accounts = (prev.upiAccounts || []).map(acc => {
        if (acc.id === id) {
          return { ...acc, [field]: value };
        }
        return acc;
      });
      const defaultAcc = accounts.find(a => a.isDefault);
      return {
        ...prev,
        upiAccounts: accounts,
        upiId: defaultAcc?.upiId || prev.upiId
      };
    });
  };

  const handleSetDefaultUpiAccount = (id) => {
    setFormData(prev => {
      const accounts = (prev.upiAccounts || []).map(acc => ({
        ...acc,
        isDefault: acc.id === id
      }));
      const selected = accounts.find(a => a.id === id);
      return {
        ...prev,
        upiAccounts: accounts,
        upiId: selected?.upiId || prev.upiId,
        qrCodeImage: selected?.qrCodeImage || null,
        bankName: selected?.bankName || prev.bankName
      };
    });
  };

  const handleRemoveUpiAccount = (id) => {
    if ((formData.upiAccounts || []).length <= 1) {
      alert("At least one UPI QR account must remain active.");
      return;
    }
    setFormData(prev => {
      const accounts = (prev.upiAccounts || []).filter(acc => acc.id !== id);
      if (!accounts.some(a => a.isDefault) && accounts.length > 0) {
        accounts[0].isDefault = true;
      }
      const defaultAcc = accounts.find(a => a.isDefault);
      return {
        ...prev,
        upiAccounts: accounts,
        upiId: defaultAcc?.upiId || accounts[0]?.upiId || prev.upiId,
        qrCodeImage: defaultAcc?.qrCodeImage || null
      };
    });
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const defaultAcc = (formData.upiAccounts || []).find(a => a.isDefault) || (formData.upiAccounts || [])[0];
    const updated = {
      ...formData,
      adminPin: shopConfig.adminPin || '4848',
      upiId: defaultAcc ? defaultAcc.upiId : formData.upiId,
      qrCodeImage: defaultAcc ? defaultAcc.qrCodeImage : (formData.qrCodeImage || null),
      bankName: defaultAcc ? defaultAcc.bankName : formData.bankName
    };
    setShopConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // 1-Click Offline Backup
  const handleDownloadBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      shopConfig,
      inventory,
      usedPurchases,
      repairJobs,
      customers,
      suppliers,
      expenses,
      invoices
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ALZINO_ERP_BACKUP_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 1-Click Offline Restore
  const handleRestoreFile = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.inventory && parsed.invoices) {
            if (confirm("Restore this database backup? Existing unsaved entries will be overwritten with the backup file.")) {
              if (parsed.shopConfig) setShopConfig(parsed.shopConfig);
              if (parsed.inventory) setInventory(parsed.inventory);
              if (parsed.usedPurchases) setUsedPurchases(parsed.usedPurchases);
              if (parsed.repairJobs) setRepairJobs(parsed.repairJobs);
              if (parsed.customers) setCustomers(parsed.customers);
              if (parsed.suppliers) setSuppliers(parsed.suppliers);
              if (parsed.expenses) setExpenses(parsed.expenses);
              if (parsed.invoices) setInvoices(parsed.invoices);
              alert("Backup restored successfully!");
            }
          } else {
            alert("Invalid backup file structure.");
          }
        } catch (err) {
          alert("Error parsing JSON backup file: " + err.message);
        }
      };
    }
  };

  // Clear Database / Fresh Clean Slate (Zero Demo Data)
  const handleClearAllData = () => {
    if (confirm("Are you sure you want to clear all data? This will remove all items, sales invoices, repair tokens, and customer records to start fresh with a clean database.")) {
      setInventory([]);
      setUsedPurchases([]);
      setRepairJobs([]);
      setCustomers([]);
      setSuppliers([]);
      setExpenses([]);
      setInvoices([]);
      try {
        localStorage.removeItem('ALZINO_ERP_INVENTORY');
        localStorage.removeItem('ALZINO_ERP_USED_PURCHASES');
        localStorage.removeItem('ALZINO_ERP_REPAIR_JOBS');
        localStorage.removeItem('ALZINO_ERP_CUSTOMERS');
        localStorage.removeItem('ALZINO_ERP_SUPPLIERS');
        localStorage.removeItem('ALZINO_ERP_EXPENSES');
        localStorage.removeItem('ALZINO_ERP_INVOICES');
        localStorage.removeItem('ALZINO_ERP_WARRANTY_CLAIMS');
      } catch (e) {}
      alert("All demo and transactional data cleared! Store database is now completely clean.");
    }
  };

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      
      {/* Sleek Minimalist Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Store Settings & Backup</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Offline SQLite / Local Storage
          </span>
        </div>

        {saveSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-green)', fontWeight: 600, fontSize: '0.82rem' }}>
            <CheckCircle2 size={15} />
            <span>Saved successfully!</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr', gap: '1.25rem' }}>
        
        {/* Left: Shop Details Form */}
        <form onSubmit={handleSaveProfile} className="illoca-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <img
              src={formData.logo || "/alzino-logo.png"}
              alt="Store Logo"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--accent-primary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                flexShrink: 0
              }}
            />
            <div>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Building size={18} color="var(--accent-primary)" />
                <span>ALZINO Shop Profile & Invoice Header</span>
              </h3>
              <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)' }}>Official badge logo active across browser tab, POS headers, and customer invoices</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Shop Business Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="input-field"
                style={{ fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>GSTIN Number *</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                required
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Tagline / Shop Specialization</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="input-field"
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Full Shop Address (Printed on Invoices) *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Primary Phone (WhatsApp) *</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
            </div>

            {/* Multi-Bank & Standee Payment QR Codes Section */}
            <div style={{
              gridColumn: 'span 2',
              background: 'var(--surface-primary)',
              border: '1.5px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.15rem',
              marginTop: '0.4rem',
              marginBottom: '0.4rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <QrCode size={18} color="var(--accent-primary)" />
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      Shop UPI IDs & Payment QR Codes
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Configure multiple UPI accounts (HDFC, ICICI, SBI, PhonePe, Paytm). Upload merchant standee QRs or generate live dynamic QRs.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddUpiAccount}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={14} color="var(--accent-primary)" />
                  <span>Add Bank / QR</span>
                </button>
              </div>

              {/* List of Configured UPI Accounts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(formData.upiAccounts || []).map((acc, index) => (
                  <div
                    key={acc.id}
                    style={{
                      background: acc.isDefault ? 'rgba(59, 130, 246, 0.04)' : 'var(--surface-card)',
                      border: acc.isDefault ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    {/* Top Row: Account Badge, Default Selector, Delete */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Landmark size={15} color="var(--accent-primary)" />
                        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          Account #{index + 1} {acc.bankName ? `• ${acc.bankName}` : ''}
                        </span>
                        {acc.isDefault && (
                          <span className="mono-tag" style={{ background: 'var(--accent-primary)', color: '#FFF', fontSize: '0.64rem', fontWeight: 700, padding: '0.05rem 0.4rem' }}>
                            ★ Primary / Default
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {!acc.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultUpiAccount(acc.id)}
                            className="btn-secondary"
                            style={{ padding: '0.2rem 0.55rem', fontSize: '0.7rem' }}
                            title="Make this the default UPI account for billing"
                          >
                            Set Default
                          </button>
                        )}
                        {(formData.upiAccounts || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveUpiAccount(acc.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--status-red)',
                              cursor: 'pointer',
                              padding: '0.2rem'
                            }}
                            title="Delete this UPI account"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inputs Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem', color: 'var(--text-secondary)' }}>
                          Bank / Standee Provider
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC Bank, ICICI Soundbox, PhonePe"
                          value={acc.bankName}
                          onChange={(e) => handleUpdateUpiAccount(acc.id, 'bankName', e.target.value)}
                          className="input-field"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem', color: 'var(--text-secondary)' }}>
                          UPI ID (VPA) *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. alzino.bodhan@okhdfcbank"
                          value={acc.upiId}
                          onChange={(e) => handleUpdateUpiAccount(acc.id, 'upiId', e.target.value)}
                          required={acc.isDefault}
                          className="input-field"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem', color: 'var(--text-secondary)' }}>
                          Payee / Display Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. ALZINO MOBILES"
                          value={acc.accountName}
                          onChange={(e) => handleUpdateUpiAccount(acc.id, 'accountName', e.target.value)}
                          className="input-field"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem' }}
                        />
                      </div>
                    </div>

                    {/* QR Image Upload & Preview Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--surface-primary)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem 0.75rem',
                      marginTop: '0.2rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {acc.qrCodeImage ? (
                          <div style={{ position: 'relative' }}>
                            <img
                              src={acc.qrCodeImage}
                              alt="Uploaded QR Code"
                              style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#FFF' }}
                            />
                          </div>
                        ) : (
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '4px',
                            background: 'var(--surface-card)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)'
                          }}>
                            <ImageIcon size={20} />
                          </div>
                        )}

                        <div>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {acc.qrCodeImage ? 'Standee QR Image Uploaded' : 'Upload Standee / Soundbox QR Image'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                            {acc.qrCodeImage ? 'Active for billing and prints' : 'Optional. Upload photo or screenshot of your physical standee QR'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <label
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Upload size={12} />
                          <span>{acc.qrCodeImage ? 'Replace QR' : 'Upload QR'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleQrImageUpload(e, acc.id)}
                          />
                        </label>

                        {acc.qrCodeImage && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQrImage(acc.id)}
                            className="btn-outline"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.72rem', color: 'var(--status-red)' }}
                            title="Remove uploaded QR image"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Invoice Terms & Conditions</label>
              <textarea
                rows={3}
                value={formData.termsConditions}
                onChange={(e) => setFormData({ ...formData, termsConditions: e.target.value })}
                className="input-field"
                style={{ fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
              <Save size={16} />
              <span>Save Shop Settings</span>
            </button>
          </div>
        </form>

        {/* Right: Backup, Restore & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Backup Section */}
          <div className="illoca-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Database size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.15rem' }}>Offline Backup & Restore</h3>
            </div>
            
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
              Your ALZINO database runs 100% locally on your shop computer with zero cloud dependency. Download a backup file regularly to keep a safe copy on a USB Pendrive or external drive.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleDownloadBackup}
                className="btn-primary"
                style={{ justifyContent: 'center', padding: '0.75rem' }}
              >
                <Download size={18} />
                <span>1-Click Download Database Backup (.JSON)</span>
              </button>

              <label 
                className="btn-secondary"
                style={{ justifyContent: 'center', padding: '0.75rem', cursor: 'pointer', textAlign: 'center' }}
              >
                <Upload size={18} color="var(--accent-primary)" />
                <span>Restore Database from File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>


          {/* Clear Store Database */}
          <div className="illoca-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
              <Trash2 size={18} color="var(--color-danger)" />
              <h3 style={{ fontSize: '1.1rem' }}>Clear Store Database</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              Wipes all demo records and transactional data across inventory, billing counter, repair lab, and customer ledgers to start 100% fresh.
            </p>
            <button
              onClick={handleClearAllData}
              className="btn-outline"
              style={{ fontSize: '0.85rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
            >
              Clear All Data (Fresh Start)
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
