import React, { useEffect, useState, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Printer, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  Smartphone,
  Lock,
  ChevronRight,
  Receipt,
  FileText,
  DollarSign,
  Tag,
  ShieldCheck,
  Check,
  User,
  Phone,
  Box,
  X,
  Trash2
} from 'lucide-react';
import { openWhatsAppRepairUpdate } from '../utils/whatsappAutomation';
import { getCustomTechnicians, saveCustomTechnicians } from '../utils/customTaxonomy';
import { getUpiQrUrl } from '../utils/barcode';

const WhatsAppIcon = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function RepairLab({ 
  repairJobs = [], 
  setRepairJobs = () => {}, 
  invoices = [],
  setInvoices = () => {},
  customers = [],
  setCustomers = () => {},
  inventory = [],
  setInventory = () => {},
  shopConfig = {}, 
  onPrintRepairSlip = () => {},
  onPrintInvoice = () => {},
  role = 'admin'
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Success toast
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // =========================================================================
  // 1. NEW JOB INTAKE STATE
  // =========================================================================
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [color, setColor] = useState('');
  const [screenLock, setScreenLock] = useState('PIN: 1234');
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [customIssue, setCustomIssue] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [costInformedAfterChecking, setCostInformedAfterChecking] = useState(false);
  const [advancePaid, setAdvancePaid] = useState('0');
  // Persistent Custom Technicians Manager (Starts completely empty with no pre-assigned technicians)
  const [techniciansList, setTechniciansList] = useState(() => getCustomTechnicians());
  const [technician, setTechnician] = useState(() => {
    const list = getCustomTechnicians();
    return list.length > 0 ? list[0] : '';
  });
  const [customTechnician, setCustomTechnician] = useState('');

  useEffect(() => {
    const onTechniciansUpdated = event => {
      const list = Array.isArray(event.detail?.technicians) ? event.detail.technicians : getCustomTechnicians();
      setTechniciansList(list);
      setTechnician(current => list.includes(current) ? current : (list[0] || ''));
    };
    window.addEventListener('alzino:technicians-updated', onTechniciansUpdated);
    return () => window.removeEventListener('alzino:technicians-updated', onTechniciansUpdated);
  }, []);

  const commonIssues = [
    'Touch Screen Broken',
    'Blank / No Display',
    'Battery Fast Draining',
    'Charging Jack Dead',
    'Ear Speaker Crackling',
    'Mic Silent (Outgoing sound)',
    'Water Damaged',
    'Camera Lens Cracked',
    'Software Dead Boot / Logo Hang',
    'Network / SIM No Service'
  ];

  const statuses = ['All', 'Received', 'In Progress', 'Parts Awaiting', 'Ready for Delivery', 'Delivered'];

  const toggleIssue = (issue) => {
    setSelectedIssues(prev => 
      prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
    );
  };

  const handleCreateJob = (e) => {
    e.preventDefault();
    if (!customerName || !customerMobile || !deviceModel || (!costInformedAfterChecking && !estimatedCost)) {
      alert("Please fill customer name, mobile, device model, and estimated cost (or select 'Informed after checking').");
      return;
    }

    const finalIssues = [...selectedIssues];
    if (customIssue.trim()) finalIssues.push(customIssue.trim());

    const est = costInformedAfterChecking ? 0 : (parseFloat(estimatedCost) || 0);
    const adv = parseFloat(advancePaid) || 0;
    const balance = costInformedAfterChecking ? 0 : Math.max(0, est - adv);

    const jobId = `ALZ-REP-${String(repairJobs.length + 1024)}`;
    const today = new Date().toISOString().split('T')[0];

    const newJob = {
      jobId,
      date: today,
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      deviceModel: deviceModel.trim(),
      color: color.trim(),
      screenLock: screenLock.trim(),
      issues: finalIssues.length > 0 ? finalIssues : ['General Servicing'],
      technicianNotes: costInformedAfterChecking 
        ? 'Device received at bench. Estimated cost to be informed after checking.' 
        : 'Device received at bench. Initial check completed.',
      estimatedCost: est,
      costInformedAfterChecking: Boolean(costInformedAfterChecking),
      advancePaid: adv,
      balanceDue: balance,
      status: 'Received',
      technician: technician === 'Other' ? (customTechnician.trim() || 'Other') : (technician || 'Other'),
    };

    if (technician === 'Other' && customTechnician.trim()) {
      const newTechName = customTechnician.trim();
      if (!techniciansList.includes(newTechName)) {
        const updatedList = [...techniciansList, newTechName];
        setTechniciansList(updatedList);
        saveCustomTechnicians(updatedList);
      }
    }

    setRepairJobs(prev => [newJob, ...prev]);

    // Save/Update Customer Record in CRM
    if (newJob.customerMobile) {
      setCustomers(prev => {
        const norm = newJob.customerMobile.replace(/\D/g, '');
        const exists = prev.find(c => c.phone && c.phone.replace(/\D/g, '') === norm);
        if (exists) {
          return prev.map(c => c.phone && c.phone.replace(/\D/g, '') === norm ? {
            ...c,
            name: c.name && c.name !== 'Customer' ? c.name : (newJob.customerName || c.name),
            balanceDue: (c.balanceDue || 0) + (balance > 0 ? balance : 0),
          } : c);
        } else {
          return [
            {
              id: `CUST-${String(prev.length + 1).padStart(3, '0')}`,
              name: newJob.customerName || 'Customer',
              phone: newJob.customerMobile,
              address: 'Bodhan, Telangana',
              gstin: '',
              totalSpent: 0,
              balanceDue: balance > 0 ? balance : 0,
            },
            ...prev
          ];
        }
      });
    }

    setShowAddModal(false);

    // Reset fields
    setCustomerName('');
    setCustomerMobile('');
    setDeviceModel('');
    setColor('');
    setEstimatedCost('');
    setCostInformedAfterChecking(false);
    setAdvancePaid('0');
    setSelectedIssues([]);
    setCustomIssue('');
    setCustomTechnician('');
    setTechnician(techniciansList.length > 0 ? techniciansList[0] : '');

    showToast(`Job ${jobId} registered for ${newJob.customerName}! Claim token generated.`);

    // Trigger Print of Repair Token
    onPrintRepairSlip(newJob);
  };

  const handleUpdateCostAfterChecking = (job) => {
    const entered = prompt(`Enter confirmed estimated repair cost for ${job.deviceModel} (Customer: ${job.customerName}):`, job.estimatedCost > 0 ? String(job.estimatedCost) : '');
    if (entered !== null && entered.trim() !== '') {
      const newCost = parseFloat(entered);
      if (!isNaN(newCost) && newCost >= 0) {
        const newBalance = Math.max(0, newCost - (job.advancePaid || 0));
        setRepairJobs(prev => prev.map(j => {
          if (j.jobId === job.jobId) {
            return {
              ...j,
              estimatedCost: newCost,
              costInformedAfterChecking: false,
              balanceDue: newBalance,
              technicianNotes: `${j.technicianNotes || ''} [Cost informed after checking: ₹${newCost}]`.trim()
            };
          }
          return j;
        }));
        showToast(`✓ Estimated cost ₹${newCost} updated for ${job.jobId}!`);
      }
    }
  };

  // =========================================================================
  // 2. GENERATE BILL MODAL STATE (PRE-FILLED CUSTOMER DATA)
  // =========================================================================
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [jobToBill, setJobToBill] = useState(null);
  const [finalServicePrice, setFinalServicePrice] = useState('');
  const [repairDescription, setRepairDescription] = useState('');
  const [repairWarranty, setRepairWarranty] = useState('30 Days Display & Touch Warranty (No physical damage)');
  const [repairBillingType, setRepairBillingType] = useState('non-gst'); // 'non-gst' or 'gst'
  const [repairPaymentMode, setRepairPaymentMode] = useState('Cash');
  const [repairPaymentRef, setRepairPaymentRef] = useState('');
  const [repairDiscount, setRepairDiscount] = useState(0);
  const [repairNotes, setRepairNotes] = useState(
    'Device tested and confirmed working. 30 days warranty on replaced components only. Physical or liquid damage voids warranty.'
  );

  const repairWarrantyPresets = [
    'No Warranty',
    '30 Days Display & Touch Warranty (No physical damage)',
    '15 Days General Testing Warranty',
    '60 Days Battery Replacement Warranty',
    '90 Days Motherboard & IC Hardware Warranty',
    '6 Months Comprehensive Service Warranty',
    'No Warranty (Liquid / Water Damaged Board)',
    'Other (Custom Terms)'
  ];

  // Consumed Spare Parts state
  const [consumedParts, setConsumedParts] = useState([]);
  const [newPartName, setNewPartName] = useState('');
  const [newPartCost, setNewPartCost] = useState('');
  const [selectedInventoryPartId, setSelectedInventoryPartId] = useState('');
  const [inventoryPartSearch, setInventoryPartSearch] = useState('');
  const matchingInventoryParts = useMemo(() => {
    const query = inventoryPartSearch.trim().toLowerCase();
    return inventory.filter(item => {
      if (!(Number(item.stock) > 0)) return false;
      if (!query) return true;
      return [item.name, item.brand, item.category, item.barcode, item.serialNumber]
        .some(value => String(value || '').toLowerCase().includes(query));
    }).slice(0, 100);
  }, [inventory, inventoryPartSearch]);
  const repairUpiAccount = useMemo(() => {
    const accounts = Array.isArray(shopConfig.upiAccounts) ? shopConfig.upiAccounts.filter(account => account?.upiId) : [];
    return accounts.find(account => account.isDefault) || accounts[0] || {
      upiId: shopConfig.upiId || 'alzino.bodhan@okhdfcbank',
      accountName: shopConfig.name || 'ALZINO'
    };
  }, [shopConfig]);

  // QC Checklist Modal state
  const [qcJob, setQcJob] = useState(null);
  const [qcChecks, setQcChecks] = useState({});

  const defaultQcItems = [
    { id: 'display', label: 'Display & Touch Screen (No dead zones / phantom touch)' },
    { id: 'earSpeaker', label: 'Ear Speaker (Clear voice audibility on call)' },
    { id: 'mic', label: 'Microphone (Outgoing voice audibility)' },
    { id: 'loudspeaker', label: 'Loudspeaker / Ringer & Media Sound' },
    { id: 'charging', label: 'Charging Port & Amp Drawing (Fast Charge OK)' },
    { id: 'cameraFront', label: 'Front Selfie Camera & Proximity Sensor' },
    { id: 'cameraRear', label: 'Rear Camera, Autofocus & Flashlight LED' },
    { id: 'connectivity', label: 'WiFi, Bluetooth & Hotspot Signals' },
    { id: 'network', label: 'SIM 4G/5G Calling & Signal Reception' },
    { id: 'biometric', label: 'Fingerprint Sensor / Face Unlock' },
  ];

  const handleOpenQcModal = (job) => {
    setQcJob(job);
    setQcChecks(job.qcChecklist || {});
  };

  const handleToggleQcItem = (itemId) => {
    setQcChecks(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleMarkAllQcPassed = () => {
    const all = {};
    defaultQcItems.forEach(it => { all[it.id] = true; });
    setQcChecks(all);
  };

  const handleSaveQc = () => {
    if (!qcJob) return;
    const passedCount = defaultQcItems.filter(it => qcChecks[it.id]).length;
    const isAllPassed = passedCount === defaultQcItems.length;

    setRepairJobs(prev => prev.map(j => {
      if (j.jobId === qcJob.jobId) {
        return {
          ...j,
          qcChecklist: qcChecks,
          qcPassed: isAllPassed || passedCount >= 8,
          qcPassedCount: passedCount
        };
      }
      return j;
    }));

    showToast(`QC checklist saved for ${qcJob.jobId}! (${passedCount}/${defaultQcItems.length} tests passed)`);
    setQcJob(null);
  };

  // Open Generate Bill Modal for a specific job
  const handleOpenBillModal = (job) => {
    setJobToBill(job);
    setFinalServicePrice(String(job.estimatedCost || job.balanceDue || 500));
    setRepairDescription(`${job.deviceModel} Repair: ${job.issues.join(', ')}`);
    setRepairWarranty('30 Days Display & Touch Warranty (No physical damage)');
    setRepairBillingType('non-gst');
    setRepairPaymentMode('Cash');
    setRepairPaymentRef('');
    setRepairDiscount(0);
    setRepairNotes('Device tested and confirmed working. Keep bill for warranty claims.');
    setConsumedParts(job.consumedParts || []);
    setNewPartName('');
    setNewPartCost('');
    setSelectedInventoryPartId('');
    setInventoryPartSearch('');
    setBillModalOpen(true);
  };

  const handleAddConsumedPart = () => {
    if (!newPartName.trim()) {
      alert("Please enter a spare part name or select an inventory item.");
      return;
    }
    const cost = Math.max(0, parseFloat(newPartCost) || 0);
    const newPart = {
      id: `PART-${Date.now()}`,
      name: newPartName.trim(),
      cost,
      inventoryId: selectedInventoryPartId || null,
      qty: 1
    };
    setConsumedParts(prev => [...prev, newPart]);
    setNewPartName('');
    setNewPartCost('');
    setSelectedInventoryPartId('');
    setInventoryPartSearch('');
  };

  const handleRemoveConsumedPart = (partId) => {
    setConsumedParts(prev => prev.filter(p => p.id !== partId));
  };

  // Commit Bill & Generate Invoice
  const handleGenerateRepairInvoice = (printFormat = 'thermal') => {
    if (!jobToBill) return;

    const finalPrice = parseFloat(finalServicePrice);
    if (!finalPrice || finalPrice <= 0) {
      alert("Please enter a valid final service amount.");
      return;
    }
    const discountAmt = Math.max(0, Number(repairDiscount) || 0);
    const grandTotalPrice = Math.max(0, Math.round(finalPrice - discountAmt));

    const isNonGst = repairBillingType === 'non-gst';
    const prefix = isNonGst ? 'ALZ-SRV' : 'ALZ-INV';
    const invoiceNo = `${prefix}-${String(invoices.length + 201).padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const advance = Number(jobToBill.advancePaid) || 0;
    cons