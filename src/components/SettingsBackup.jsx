import React, { useMemo, useState } from 'react';
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
  QrCode
} from 'lucide-react';
import { buildSsdArchive, openSsdArchive, saveSsdArchive } from '../utils/localArchive';
import { purgeArchivedCloudRecords } from '../utils/cloudSyncService';
import { compressImageFile } from '../utils/productImageStore';

const parseInvoiceTerms = (value) => {
  const normalized = String(value || '').replace(/\.\s+(?=\d+\.\s)/g, '.\n');
  const terms = normalized
    .split(/\r?\n+/)
    .map(term => term.replace(/^\s*\d+\.\s*/, '').trim())
    .filter(Boolean);
  return terms.length ? terms : [''];
};

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
  warrantyClaims = [],
  setWarrantyClaims,
  role = 'admin',
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
      oldStockReminderMonths: shopConfig.oldStockReminderMonths || 3,
      oldStockReminderCustomMonths: shopConfig.oldStockReminderCustomMonths || 6,
      oldStockReminderCustomUnit: shopConfig.oldStockReminderCustomUnit || 'months',
      barcodeScannerBeep: shopConfig.barcodeScannerBeep !== false,
      barcodeScannerAutoAdd: shopConfig.barcodeScannerAutoAdd !== false,
      storageMode: shopConfig.storageMode || 'ssd-local',
      ssdAutoSave: shopConfig.ssdAutoSave !== false,
      upiAccounts: initialAccounts,
      qrCodeImage: shopConfig.qrCodeImage || initialAccounts.find(a => a.isDefault)?.qrCodeImage || null
    };
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [termsList, setTermsList] = useState(() => parseInvoiceTerms(shopConfig.termsConditions));
  const [archiveCutoff, setArchiveCutoff] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().slice(0, 10);
  });
  const [archivePassword, setArchivePassword] = useState('');
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveMessage, setArchiveMessage] = useState('');
  const [attachedArchive, setAttachedArchive] = useState(null);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveDomain, setArchiveDomain] = useState('all');
  const [deletePhrase, setDeletePhrase] = useState('');

  const handleCreateSsdArchive = async () => {
    if (archivePassword.length < 12) {
      setArchiveMessage('Set an archive password of at least 12 characters and keep it safe.');
      return;
    }
    setArchiveBusy(true);
    setArchiveMessage('Collecting cloud records and product photos…');
    try {
      const result = await buildSsdArchive({ cutoff: archiveCutoff, password: archivePassword });
      const dateLabel = new Date().toISOString().slice(0, 10);
      await saveSsdArchive(result.file, `ALZINO_ARCHIVE_${dateLabel}.alzino.json`);
      setArchiveMessage(`Archive saved. It includes ${Object.values(result.recordCounts).reduce((sum, count) => sum + count, 0)} records and ${Object.values(result.purgeCounts).reduce((sum, count) => sum + count, 0)} old closed records eligible for cloud cleanup. Attach the saved file below to verify it before deletion.`);
    } catch (error) {
      if (error?.name !== 'AbortError') setArchiveMessage(error.message || 'Could not create archive.');
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleAttachArchive = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (archivePassword.length < 12) {
      setArchiveMessage('Enter the archive password before attaching the SSD archive.');
      return;
    }
    setArchiveBusy(true);
    try {
      const archive = await openSsdArchive(file, archivePassword);
      setAttachedArchive({ archive, fileName: file.name });
      setDeletePhrase('');
      setArchiveMessage('Archive decrypted and checked. You can search its records. Cloud deletion is enabled only for old, closed transactions in this verified file.');
    } catch (error) {
      setArchiveMessage(error.message || 'Could not open this archive.');
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleDetachArchive = () => {
    setAttachedArchive(null);
    setArchiveSearch('');
    setDeletePhrase('');
    setArchiveMessage('Archive detached from this browser session.');
  };

  const handlePurgeArchivedData = async () => {
    if (!attachedArchive || deletePhrase !== 'DELETE') return;
    if (!window.confirm('Permanently remove the eligible archived records from the shop cloud database? The attached SSD archive is the recovery copy.')) return;
    setArchiveBusy(true);
    setArchiveMessage('Checking the cloud snapshot and removing archived records…');
    try {
      const { archive } = attachedArchive;
      const result = await purgeArchivedCloudRecords(archive.organizationId, archive.cutoff, archive.domains, archive.purgePlan);
      if (!result.success) throw new Error(result.reason || 'Cloud cleanup failed.');
      const updated = result.updatedDomains || {};
      if (updated.invoices) setInvoices?.(updated.invoices);
      if (updated.expenses) setExpenses?.(updated.expenses);
      if (updated.repairJobs) setRepairJobs?.(updated.repairJobs);
      if (updated.usedPurchases) setUsedPurchases?.(updated.usedPurchases);
      if (updated.warrantyClaims) setWarrantyClaims?.(updated.warrantyClaims);
      const count = Object.values(archive.purgePlan || {}).reduce((sum, ids) => sum + ids.length, 0);
      setArchiveMessage(`Removed ${count} archived closed records from the cloud database. The attached SSD archive remains available until detached.`);
      setAttachedArchive(null);
      setDeletePhrase('');
    } catch (error) {
      setArchiveMessage(error.message || 'Cloud cleanup failed. Keep the archive file and try again after resolving the issue.');
    } finally {
      setArchiveBusy(false);
    }
  };

  const attachedRecords = useMemo(() => {
    if (!attachedArchive?.archive) return [];
    const rows = [];
    for (const [domain, snapshot] of Object.entries(attachedArchive.archive.domains || {})) {
      if (archiveDomain !== 'all' && archiveDomain !== domain) continue;
      (Array.isArray(snapshot?.payload) ? snapshot.payload : []).forEach((record, index) => {
        const text = [record?.name, record?.productName, record?.model, record?.customerName, record?.supplierName, record?.invoiceNo, record?.jobId, record?.phone, record?.customerMobile, record?.date, record?.status].filter(Boolean).join(' ');
        if (!archiveSearch || text.toLowerCase().includes(archiveSearch.toLowerCase())) {
          rows.push({ domain, record, key: `${domain}-${record?.id || record?.invoiceNo || record?.jobId || index}`, text });
        }
      });
    }
    return rows.slice(0, 250);
  }, [attachedArchive, archiveDomain, archiveSearch]);

  const handleTermChange = (index, value) => {
    setTermsList(previous => previous.map((term, termIndex) => termIndex === index ? value : term));
  };

  const handleAddTerm = () => setTermsList(previous => [...previous, '']);

  const handleRemoveTerm = (index) => {
    setTermsList(previous => {
      const next = previous.filter((_, termIndex) => termIndex !== index);
      return next.length ? next : [''];
    });
  };

  // Multi-Bank UPI & QR Code Management Handlers
  const handleQrImageUpload = async (e, accountId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is larger than 5MB. Please upload an image under 5MB.");
      return;
    }

    try {
      // Keep one compact, legible standee image in shop settings instead of
      // persisting a phone-sized original (often several MB) as base64.
      const base64Data = await compressImageFile(file, 900, 0.84);
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
    } catch (error) {
      alert(error.message || 'Could not process this QR image. Please try another image.');
    }
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
      upiId: defaultAcc ? defaultAcc.upiId : formData.upiId,
      // The account owns its QR image. Keeping a root-level duplicate wastes
      // database space because the whole shopConfig is synced as JSON.
      qrCodeImage: null,
      bankName: defaultAcc ? defaultAcc.bankName : formData.bankName,
      termsConditions: termsList.map(term => term.trim()).filter(Boolean).map((term, index) => `${index + 1}. ${term}`).join('\n')
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
        <form onSubmit={handleSaveProfile} className="illoca-card settings-shop-profile-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#FBF7ED', borderColor: '#E8DFC7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Building size={18} color="var(--accent-primary)" />
                <span>ALZINO Shop Profile & Invoice Header</span>
              </h3>
              <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)' }}>Store information used on invoices and receipts</p>
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
                required
                readOnly
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


            <div className="settings-terms-section" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Invoice Terms & Conditions</label>
                <button type="button" onClick={handleAddTerm} className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Plus size={14} /> Add term
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {termsList.map((term, index) => (
                  <div key={`invoice-term-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span aria-hidden="true" style={{ minWidth: '1.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{index + 1}.</span>
                    <input
                      type="text"
                      value={term}
                      onChange={(event) => handleTermChange(index, event.target.value)}
                      className="input-field"
                      aria-label={`Invoice term ${index + 1}`}
                      placeholder="Enter an invoice term or condition"
                      style={{ flex: 1, minWidth: 0, fontSize: '0.8rem' }}
                    />
                    <button type="button" onClick={() => handleRemoveTerm(index)} className="btn-outline" aria-label={`Remove invoice term ${index + 1}`} title="Remove term" style={{ padding: '0.45rem', color: 'var(--status-red)', borderColor: 'var(--status-red)' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-primary)' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Old stock reminder</label>
              <p style={{ margin: '0 0 0.55rem', color: 'var(--text-secondary)', fontSize: '0.73rem' }}>Show in-stock products on the dashboard once they have been held for this long.</p>
              <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="input-field" value={formData.oldStockReminderMonths === 'custom' ? 'custom' : String(formData.oldStockReminderMonths)} onChange={e => setFormData({ ...formData, oldStockReminderMonths: e.target.value === 'custom' ? 'custom' : Number(e.target.value) })} style={{ width: 'auto', minWidth: '150px' }}>
                  <option value="3">3 months</option>
                  <option value="12">1 year</option>
                  <option value="custom">Custom</option>
                </select>
                {formData.oldStockReminderMonths === 'custom' && <>
                  <input className="input-field" type="number" min="1" max="3650" value={formData.oldStockReminderCustomMonths} onChange={e => setFormData({ ...formData, oldStockReminderCustomMonths: Math.max(1, Number(e.target.value) || 1) })} aria-label="Custom old stock reminder duration" style={{ width: '120px' }} />
                  <select className="input-field" value={formData.oldStockReminderCustomUnit} onChange={e => setFormData({ ...formData, oldStockReminderCustomUnit: e.target.value })} aria-label="Custom old stock reminder unit" style={{ width: 'auto', minWidth: '130px' }}>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
              <Save size={16} />
              <span>Save Shop Settings</span>
            </button>
          </div>
        </form>

        {/* Right: Offline Backup & Restore */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Backup Section */}
          <div className="illoca-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Database size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.15rem' }}>Offline Backup & Restore</h3>
            </div>
            
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
              Download a local backup regularly to keep a safe copy on a USB drive or external drive.
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

          <section className="illoca-card" style={{ padding: '1.25rem', borderTop: '3px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.45rem' }}>
              <Database size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>SSD Archive & Cloud Cleanup</h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 0.8rem' }}>
              Create an encrypted archive of the cloud records and product photos, save it to the SSD, then attach that file here to search it. Only old, closed transactions can be removed. Current stock, shop settings, customers, suppliers, and records with balances due stay in the cloud.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', marginBottom: '0.7rem' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700 }}>Archive records before
                <input className="input-field" type="date" value={archiveCutoff} onChange={e => setArchiveCutoff(e.target.value)} style={{ display: 'block', marginTop: '0.3rem', width: '100%' }} />
              </label>
              <label style={{ fontSize: '0.74rem', fontWeight: 700 }}>Archive password (12+ characters)
                <input className="input-field" type="password" autoComplete="new-password" value={archivePassword} onChange={e => setArchivePassword(e.target.value)} placeholder="Create a password and store it safely" style={{ display: 'block', marginTop: '0.3rem', width: '100%' }} />
              </label>
            </div>
            <button type="button" className="btn-primary" disabled={archiveBusy || role !== 'admin'} onClick={handleCreateSsdArchive} style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }}>
              <Download size={16} /> {archiveBusy ? 'Working…' : 'Create encrypted archive on SSD'}
            </button>
            <label className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.7rem', marginTop: '0.5rem', cursor: 'pointer', boxSizing: 'border-box' }}>
              <Upload size={16} /> Attach / verify an archive file
              <input type="file" accept=".json,.alzino.json,application/json" onChange={handleAttachArchive} disabled={archiveBusy} style={{ display: 'none' }} />
            </label>
            {archiveMessage && <div role="status" style={{ marginTop: '0.65rem', padding: '0.65rem', borderRadius: '8px', background: 'var(--surface-secondary)', color: 'var(--text-primary)', fontSize: '0.75rem', lineHeight: 1.4 }}>{archiveMessage}</div>}

            {attachedArchive && <div style={{ marginTop: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem', background: 'var(--surface-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.8rem', overflowWrap: 'anywhere' }}>Attached: {attachedArchive.fileName}</strong>
                <button type="button" className="btn-outline" onClick={handleDetachArchive} disabled={archiveBusy} style={{ padding: '0.35rem 0.55rem' }}>Detach</button>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Created {new Date(attachedArchive.archive.createdAt).toLocaleString()} · {Object.values(attachedArchive.archive.recordCounts || {}).reduce((sum, count) => sum + Number(count || 0), 0)} records · {Object.keys(attachedArchive.archive.assets || {}).length} photos
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.5rem', marginTop: '0.65rem' }}>
                <input className="input-field" value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} placeholder="Search attached archive" aria-label="Search attached archive" />
                <select className="input-field" value={archiveDomain} onChange={e => setArchiveDomain(e.target.value)} aria-label="Archive record type">
                  <option value="all">All record types</option>
                  {Object.keys(attachedArchive.archive.domains || {}).map(domain => <option key={domain} value={domain}>{domain}</option>)}
                </select>
              </div>
              <div style={{ maxHeight: '260px', overflow: 'auto', marginTop: '0.55rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                {attachedRecords.length ? <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                  <thead><tr style={{ position: 'sticky', top: 0, background: 'var(--surface-secondary)', textAlign: 'left' }}><th style={{ padding: '0.45rem' }}>Type</th><th style={{ padding: '0.45rem' }}>Record</th><th style={{ padding: '0.45rem' }}>Date</th></tr></thead>
                  <tbody>{attachedRecords.map(({ domain, record, key, text }) => <tr key={key} style={{ borderTop: '1px solid var(--border-color)' }}><td style={{ padding: '0.45rem', whiteSpace: 'nowrap' }}>{domain}</td><td style={{ padding: '0.45rem' }}>{text || 'Archived record'}</td><td style={{ padding: '0.45rem', whiteSpace: 'nowrap' }}>{record?.date || record?.createdAt || '—'}</td></tr>)}</tbody>
                </table> : <p style={{ padding: '0.65rem', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>No matching records in the attached archive.</p>}
              </div>
              {Object.entries(attachedArchive.archive.assets || {}).slice(0, 8).map(([assetKey, imageUrl]) => (
                <div key={assetKey} style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem', margin: '0.45rem 0.45rem 0 0', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  <img src={imageUrl} alt={`Archived product photo ${assetKey}`} loading="lazy" style={{ width: '72px', height: '72px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'white' }} />
                  <span>{assetKey}</span>
                </div>
              ))}
              <div style={{ marginTop: '0.7rem', padding: '0.7rem', border: '1px solid var(--status-red)', borderRadius: '8px' }}>
                <strong style={{ fontSize: '0.77rem', color: 'var(--status-red)' }}>Permanent cloud cleanup</strong>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0.5rem' }}>
                  {Object.entries(attachedArchive.archive.purgePlan || {}).map(([domain, ids]) => `${domain}: ${ids.length}`).join(' · ') || 'No eligible old closed transactions are in this archive.'} · The cloud snapshot must still match the archive exactly.
                </p>
                <input className="input-field" value={deletePhrase} onChange={e => setDeletePhrase(e.target.value)} placeholder="Type DELETE to enable cleanup" aria-label="Type DELETE to confirm archive cleanup" />
                <button type="button" className="btn-danger" disabled={archiveBusy || deletePhrase !== 'DELETE' || !Object.keys(attachedArchive.archive.purgePlan || {}).length || role !== 'admin'} onClick={handlePurgeArchivedData} style={{ width: '100%', justifyContent: 'center', marginTop: '0.45rem', padding: '0.65rem' }}>
                  <Trash2 size={15} /> Permanently delete archived closed records from cloud
                </button>
              </div>
            </div>}
          </section>
        </div>

      </div>

    </div>
  );
}
