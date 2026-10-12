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
  Star,
  Cloud,
  CloudOff,
  RefreshCw,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  isSupabaseConfigured, 
  saveSupabaseCredentials 
} from '../utils/supabaseClient';
import { 
  pullAllFromCloud, 
  pushAllToCloud,
  purgeAllLegacyOfflineData
} from '../utils/cloudSyncService';

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

  // Cloud Sync State & Handlers (Supabase)
  const [cloudCreds, setCloudCreds] = useState(() => getSupabaseCredentials());
  const [cloudConnected, setCloudConnected] = useState(() => isSupabaseConfigured());
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  const handleSaveCloudConfig = (e) => {
    e.preventDefault();
    if (!cloudCreds.url.trim() || !cloudCreds.anonKey.trim()) {
      alert("Please enter both the Supabase Project URL and Public Anon Key.");
      return;
    }
    saveSupabaseCredentials(cloudCreds.url, cloudCreds.anonKey);
    setCloudConnected(isSupabaseConfigured());
    setSyncStatusMsg('Connecting and syncing with Supabase...');
    setIsSyncingCloud(true);
    pullAllFromCloud({
      INVENTORY: setInventory,
      INVOICES: setInvoices,
      CUSTOMERS: setCustomers,
      REPAIR_JOBS: setRepairJobs,
      USED_PURCHASES: setUsedPurchases,
      SUPPLIERS: setSuppliers,
      EXPENSES: setExpenses,
      WARRANTY_CLAIMS: setWarrantyClaims,
      SHOP_CONFIG: setShopConfig
    }).then(res => {
      setIsSyncingCloud(false);
      if (res.success) {
        setSyncStatusMsg('✓ Connected! Synced ' + (res.count || 0) + ' collections from cloud.');
        alert('✓ Successfully connected to Supabase Cloud! Real-time multi-device sync is now active.');
      } else {
        setSyncStatusMsg('Connected to Supabase. Click "Push Local Data to Cloud" to initialize table.');
        alert('Connected to Supabase! If you have local products on this device, click "Push Local Data to Cloud" to upload them.');
      }
    });
  };

  const handleDisconnectCloud = () => {
    if (confirm("Disconnect Supabase cloud sync? Your local data will remain intact on this device.")) {
      saveSupabaseCredentials('', '');
      setCloudCreds({ url: '', anonKey: '' });
      setCloudConnected(false);
      setSyncStatusMsg('Disconnected from cloud sync.');
    }
  };

  const handleManualPull = async () => {
    setIsSyncingCloud(true);
    setSyncStatusMsg('Pulling latest data from cloud...');
    const res = await pullAllFromCloud({
      INVENTORY: setInventory,
      INVOICES: setInvoices,
      CUSTOMERS: setCustomers,
      REPAIR_JOBS: setRepairJobs,
      USED_PURCHASES: setUsedPurchases,
      SUPPLIERS: setSuppliers,
      EXPENSES: setExpenses,
      WARRANTY_CLAIMS: setWarrantyClaims,
      SHOP_CONFIG: setShopConfig
    });
    setIsSyncingCloud(false);
    if (res.success) {
      alert('✓ Data successfully pulled from cloud! Your desktop now has the latest stock and invoices.');
      setSyncStatusMsg('✓ Successfully pulled ' + (res.count || 0) + ' collections from cloud.');
    } else {
      alert('Could not pull from cloud: ' + (res.error || res.reason || 'Unknown error'));
      setSyncStatusMsg('Error: ' + (res.error || 'Failed'));
    }
  };

  const handleManualPush = async () => {
    setIsSyncingCloud(true);
    setSyncStatusMsg('Pushing local data to cloud...');
    const res = await pushAllToCloud({
      INVENTORY: inventory,
      INVOICES: invoices,
      CUSTOMERS: customers,
      REPAIR_JOBS: repairJobs,
      USED_PURCHASES: usedPurchases,
      SUPPLIERS: suppliers,
      EXPENSES: expenses,
      WARRANTY_CLAIMS: warrantyClaims,
      SHOP_CONFIG: shopConfig
    });
    setIsSyncingCloud(false);
    if (res.success) {
      alert('✓ Complete local catalog (' + inventory.length + ' items) successfully uploaded to Supabase! All other logins can now see this data.');
      setSyncStatusMsg('✓ Uploaded local database to cloud.');
    } else {
      alert('Could not push to cloud: ' + (res.error || res.reason || 'Check table schema'));
      setSyncStatusMsg('Error: ' + (res.error || 'Failed'));
    }
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

  // Clear Database / Fresh Clean Slate (Zero Demo Data & Purge Offline Test Records)
  const handleClearAllData = async () => {
    if (confirm("Are you sure you want to clear all offline test data? This will permanently wipe all test products, inventory, sales invoices, repair tokens, and customer records from LocalStorage, SSD IndexedDB, and Cloud Sync.")) {
      await purgeAllLegacyOfflineData({
        setInventory,
        setUsedPurchases,
        setRepairJobs,
        setCustomers,
        setSuppliers,
        setExpenses,
        setInvoices
      });
      alert("All offline test data and local/cloud records cleared! Your store database is now completely clean.");
    }
  };

  return (
    <div className="settings-page" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      
      {/* Sleek Minimalist Title Header */}
      <div className="settings-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="settings-title-group" style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
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

      <div className="settings-layout-grid">
        
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

          <div className="settings-profile-grid">
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

        {/* Right: Cloud Sync & Offline Backup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Cloud Sync (Multi-Device Login) Section */}
          <div className="illoca-card" style={{ padding: '1.25rem', borderLeft: cloudConnected ? '4px solid var(--status-green)' : '4px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cloud size={18} color={cloudConnected ? 'var(--status-green)' : 'var(--accent-primary)'} />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Cloud Sync &amp; Multi-Login</h3>
              </div>
              <span className="mono-tag" style={{
                background: cloudConnected ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-primary)',
                color: cloudConnected ? 'var(--status-green)' : 'var(--text-secondary)',
                fontWeight: 800
              }}>
                {cloudConnected ? '🟢 Live Cloud Sync Active' : '⚪ Local Only'}
              </span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.4 }}>
              Connect Supabase to keep all desktop computers, mobile phones, and cashier terminals 100% in sync in real time. Products added on your phone will instantly appear on your desktop.
            </p>

            <form onSubmit={handleSaveCloudConfig} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-project-id.supabase.co"
                  value={cloudCreds.url}
                  onChange={(e) => setCloudCreds({ ...cloudCreds, url: e.target.value })}
                  className="input-field"
                  style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                  Supabase Public Anon Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={cloudCreds.anonKey}
                  onChange={(e) => setCloudCreds({ ...cloudCreds, anonKey: e.target.value })}
                  className="input-field"
                  style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <button
                  type="submit"
                  disabled={isSyncingCloud}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.45rem 0.85rem', fontSize: '0.78rem', justifyContent: 'center' }}
                >
                  <Save size={14} />
                  <span>{cloudConnected ? 'Update Cloud Keys' : 'Save & Connect Cloud'}</span>
                </button>

                {cloudConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectCloud}
                    className="btn-outline"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--status-red)' }}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </form>

            {/* Manual Sync Actions */}
            {cloudConnected && (
              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.65rem' }}>
                <button
                  type="button"
                  onClick={handleManualPull}
                  disabled={isSyncingCloud}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  <RefreshCw size={13} className={isSyncingCloud ? 'animate-spin' : ''} />
                  <span>⬇️ Pull from Cloud</span>
                </button>

                <button
                  type="button"
                  onClick={handleManualPush}
                  disabled={isSyncingCloud}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  <Upload size={13} />
                  <span>⬆️ Push Local to Cloud</span>
                </button>
              </div>
            )}

            {syncStatusMsg && (
              <div style={{ fontSize: '0.73rem', marginTop: '0.5rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {syncStatusMsg}
              </div>
            )}
          </div>

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
