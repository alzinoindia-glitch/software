import React, { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { openWhatsAppRepairUpdate } from '../utils/whatsappAutomation';

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
  const getStoredTechnicians = () => {
    try {
      const raw = localStorage.getItem('ALZINO_CUSTOM_TECHNICIANS');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(t => t && !t.includes('Anwar') && !t.includes('Srinivas') && !t.includes('Mohsin'));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  const saveStoredTechnicians = (list) => {
    try {
      localStorage.setItem('ALZINO_CUSTOM_TECHNICIANS', JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  const [techniciansList, setTechniciansList] = useState(() => getStoredTechnicians());
  const [technician, setTechnician] = useState(() => {
    const list = getStoredTechnicians();
    return list.length > 0 ? list[0] : '';
  });
  const [customTechnician, setCustomTechnician] = useState('');

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
        saveStoredTechnicians(updatedList);
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
    setRepairDiscount(0);
    setRepairNotes('Device tested and confirmed working. Keep bill for warranty claims.');
    setConsumedParts(job.consumedParts || []);
    setNewPartName('');
    setNewPartCost('');
    setSelectedInventoryPartId('');
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
    const netBalanceToCollect = Math.max(0, grandTotalPrice - advance);
    const actualPaid = repairPaymentMode === 'Khata' ? advance : grandTotalPrice;
    const khataDue = repairPaymentMode === 'Khata' ? netBalanceToCollect : 0;

    // Calculate spare parts cost vs profit
    const totalSparePartsCost = consumedParts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    const buyPrice = totalSparePartsCost > 0 ? totalSparePartsCost : Math.round(finalPrice * 0.35);
    const calculatedProfit = Math.max(0, grandTotalPrice - buyPrice);

    // Spare parts summary text for notes
    const partsText = consumedParts.length > 0 
      ? ` | Parts Replaced: ${consumedParts.map(p => p.name).join(', ')}`
      : '';

    // Construct official Invoice
    const newInvoice = {
      invoiceNo,
      date: today,
      isNonGst,
      isRepairInvoice: true,
      repairJobRef: jobToBill.jobId,
      invoiceType: isNonGst ? 'Repair Service Cash Memo' : 'GST Tax Invoice (Service & Maintenance)',
      customerName: jobToBill.customerName,
      customerPhone: jobToBill.customerMobile,
      customerAddress: 'Bodhan, Telangana',
      customerGstin: '',
      paymentMode: repairPaymentMode,
      warrantyNotes: repairWarranty,
      notes: `${repairNotes.trim()} [Intake Job: ${jobToBill.jobId} | Advance paid: ₹${advance}${partsText}]`,
      items: [
        {
          id: `SVC-${jobToBill.jobId}`,
          name: repairDescription.trim() || `${jobToBill.deviceModel} Service`,
          category: 'Repair Services',
          hsn: '998713', // Official GST SAC code for mobile repairing & servicing
          qty: 1,
          imeis: jobToBill.screenLock ? [`Ref: ${jobToBill.jobId} • Lock: ${jobToBill.screenLock}`] : [`Ref: ${jobToBill.jobId}`],
          rate: finalPrice,
          buyPrice: buyPrice,
          gstRate: isNonGst ? 0 : 18,
          taxable: isNonGst ? finalPrice : parseFloat((finalPrice / 1.18).toFixed(2)),
          total: finalPrice,
          profit: calculatedProfit,
          warranty: repairWarranty,
          condition: `Repaired & Tested (${jobToBill.issues.join(', ')})`,
        }
      ],
      taxableAmount: isNonGst ? grandTotalPrice : parseFloat((grandTotalPrice / 1.18).toFixed(2)),
      cgstTotal: isNonGst ? 0 : parseFloat(((grandTotalPrice - (grandTotalPrice / 1.18)) / 2).toFixed(2)),
      sgstTotal: isNonGst ? 0 : parseFloat(((grandTotalPrice - (grandTotalPrice / 1.18)) / 2).toFixed(2)),
      igstTotal: 0,
      discount: discountAmt,
      grandTotal: grandTotalPrice,
      advancePaid: advance,
      balanceCollectedNow: repairPaymentMode === 'Khata' ? 0 : netBalanceToCollect,
      netBalanceToCollect: netBalanceToCollect,
      paidAmount: actualPaid,
      khataDue,
      totalProfit: calculatedProfit,
    };

    // 1. Add to invoices
    setInvoices(prev => [newInvoice, ...prev]);

    // 2. Deduct inventory if spare parts were drawn from store inventory
    const inventoryItemsToDeduct = consumedParts.filter(p => p.inventoryId);
    if (inventoryItemsToDeduct.length > 0 && typeof setInventory === 'function') {
      setInventory(prev => prev.map(invItem => {
        const matched = inventoryItemsToDeduct.find(p => p.inventoryId === invItem.id);
        if (matched) {
          return {
            ...invItem,
            stock: Math.max(0, (invItem.stock || 1) - (matched.qty || 1))
          };
        }
        return invItem;
      }));
    }

    // 3. Update repair job status to Delivered & record invoiceNo & consumed parts
    setRepairJobs(prev => prev.map(job => {
      if (job.jobId === jobToBill.jobId) {
        return {
          ...job,
          status: 'Delivered',
          balanceDue: 0,
          invoiceNo: invoiceNo,
          billedAt: finalPrice,
          deliveredDate: today,
          consumedParts: consumedParts,
          partsCost: totalSparePartsCost
        };
      }
      return job;
    }));

    // 3. Update customer record
    setCustomers(prev => {
      const matchIndex = prev.findIndex(c => c.phone && c.phone.replace(/\D/g, '') === jobToBill.customerMobile.replace(/\D/g, ''));
      if (matchIndex >= 0) {
        const updated = [...prev];
        updated[matchIndex] = {
          ...updated[matchIndex],
          totalSpent: (updated[matchIndex].totalSpent || 0) + finalPrice,
          balanceDue: (updated[matchIndex].balanceDue || 0) + khataDue,
        };
        return updated;
      } else {
        const newCust = {
          id: `CUST-${String(prev.length + 1).padStart(3, '0')}`,
          name: jobToBill.customerName,
          phone: jobToBill.customerMobile,
          address: 'Bodhan, Telangana',
          gstin: '',
          totalSpent: finalPrice,
          balanceDue: khataDue,
        };
        return [newCust, ...prev];
      }
    });

    // Close modal
    setBillModalOpen(false);
    setJobToBill(null);

    showToast(`Invoice ${invoiceNo} generated for ${jobToBill.customerName}! Device marked as Delivered.`);

    // Trigger Print Invoice
    onPrintInvoice(newInvoice, printFormat);
  };

  const updateStatus = (jobId, newStatus) => {
    const targetJob = repairJobs.find(j => j.jobId === jobId);
    setRepairJobs(prev => prev.map(job => {
      if (job.jobId === jobId) {
        let newBalance = job.balanceDue;
        if (newStatus === 'Delivered' && job.balanceDue > 0) {
          const collect = confirm(`Collect remaining balance ₹${job.balanceDue} for ${job.deviceModel}?`);
          if (collect) newBalance = 0;
        }
        return { ...job, status: newStatus, balanceDue: newBalance };
      }
      return job;
    }));

    if (newStatus === 'Ready for Delivery' && targetJob?.customerMobile) {
      setTimeout(() => {
        const sendWA = confirm(`🚀 ${targetJob.deviceModel} is READY!\n\nSend instant "Ready for Pickup" WhatsApp message to ${targetJob.customerName} (${targetJob.customerMobile})?`);
        if (sendWA) {
          openWhatsAppRepairUpdate({ ...targetJob, status: 'Ready for Delivery' }, shopConfig, 'completed');
        }
      }, 150);
    }
  };

  const filteredJobs = useMemo(() => {
    return repairJobs.filter(job => {
      const matchesStatus = selectedStatusFilter === 'All' || job.status === selectedStatusFilter;
      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesStatus;
      return (
        matchesStatus && (
          job.jobId.toLowerCase().includes(q) ||
          job.customerName.toLowerCase().includes(q) ||
          job.customerMobile.includes(q) ||
          job.deviceModel.toLowerCase().includes(q) ||
          (job.invoiceNo && job.invoiceNo.toLowerCase().includes(q))
        )
      );
    });
  }, [repairJobs, selectedStatusFilter, searchTerm]);

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="animate-fade-in" style={{
          padding: '0.65rem 1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--status-green-bg)',
          border: '1px solid var(--status-green)',
          color: 'var(--status-green)',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sleek Minimalist Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Repairing Lab & Diagnostics Bench</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {repairJobs.filter(j => j.status !== 'Delivered').length} active bench jobs
          </span>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
        >
          <Plus size={15} />
          <span>New Job Card</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="illoca-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
          {statuses.map(st => {
            const count = st === 'All' ? repairJobs.length : repairJobs.filter(j => j.status === st).length;
            const isSelected = selectedStatusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? 'var(--accent-primary)' : 'var(--surface-primary)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                <span>{st}</span>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontFamily: 'var(--font-mono)', 
                  background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--border-color)',
                  padding: '0.05rem 0.35rem',
                  borderRadius: '3px'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ width: '280px' }}>
          <input
            type="text"
            placeholder="Search Job ID, Mobile, Customer, Invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Repair Cards Pipeline */}
      <div className="repair-jobs-grid">
        {filteredJobs.map(job => {
          const isReady = job.status === 'Ready for Delivery';
          const isDelivered = job.status === 'Delivered';
          const isBilled = Boolean(job.invoiceNo);

          return (
            <div 
              key={job.jobId} 
              className="illoca-card" 
              style={{ 
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: `4px solid ${
                  isDelivered ? 'var(--status-green)' : 
                  isReady ? 'var(--illoca-blue)' : 
                  'var(--status-amber)'
                }`
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="mono-tag" style={{ fontSize: '0.8rem' }}>
                      {job.jobId}
                    </span>
                    {job.qcPassed && (
                      <span className="mono-tag chip-green" style={{ fontSize: '0.68rem', fontWeight: 800 }}>
                        ✓ QC PASSED
                      </span>
                    )}
                    {isBilled && (
                      <span className="mono-tag" style={{ background: 'var(--status-green-bg)', color: 'var(--status-green)', fontSize: '0.7rem', fontWeight: 700 }}>
                        ✓ {job.invoiceNo}
                      </span>
                    )}
                  </div>

                  <select
                    value={job.status}
                    onChange={(e) => updateStatus(job.jobId, e.target.value)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: isDelivered ? 'var(--status-green-bg)' : isReady ? 'var(--illoca-blue-subtle)' : 'var(--status-amber-bg)',
                      color: isDelivered ? 'var(--status-green)' : isReady ? 'var(--accent-primary)' : 'var(--status-amber)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Received">Received</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Parts Awaiting">Parts Awaiting</option>
                    <option value="Ready for Delivery">Ready for Delivery</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>

                {/* Device & Customer Info */}
                <div style={{ marginBottom: '0.6rem' }}>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '0.2rem', fontWeight: 800 }}>
                    {job.deviceModel} {job.color ? `(${job.color})` : ''}
                  </h4>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Customer: <strong style={{ color: 'var(--text-primary)' }}>{job.customerName}</strong> ({job.customerMobile})
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Intake: {job.date} | Tech: {job.technician}
                  </div>
                </div>

                {/* Lock info */}
                {job.screenLock && (
                  <div style={{ 
                    background: 'var(--surface-primary)', 
                    padding: '0.35rem 0.6rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem',
                    marginBottom: '0.6rem',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <Lock size={12} color="var(--accent-primary)" />
                    <span>Lock: {job.screenLock}</span>
                  </div>
                )}

                {/* Issues Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                  {job.issues.map((iss, i) => (
                    <span key={i} style={{
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '3px',
                      background: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}>
                      {iss}
                    </span>
                  ))}
                </div>

                {/* Notes */}
                {job.technicianNotes && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                    "{job.technicianNotes}"
                  </div>
                )}
              </div>

              {/* Financial & Actions */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {job.costInformedAfterChecking ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateCostAfterChecking(job)}
                        style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 700,
                          color: '#D97706',
                          background: 'rgba(217, 119, 6, 0.1)',
                          border: '1px dashed #D97706',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer'
                        }}
                        title="Click to enter agreed cost once device has been checked by technician"
                      >
                        🔍 Informed after checking (Set ₹)
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Est: ₹{job.estimatedCost}</span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--status-green)' }}>Adv: ₹{job.advancePaid}</span>
                  </div>
                  <div>
                    <span style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: 700, 
                      fontSize: '0.9rem',
                      color: job.costInformedAfterChecking ? '#D97706' : (job.balanceDue > 0 ? 'var(--status-red)' : 'var(--status-green)')
                    }}>
                      {job.costInformedAfterChecking ? 'Due: After check' : `Due: ₹${job.balanceDue}`}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Row with Generate Bill */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {/* GENERATE BILL BUTTON (PRE-FILLED WITH CUSTOMER & DEVICE) */}
                  <button
                    onClick={() => handleOpenBillModal(job)}
                    className="btn-primary"
                    style={{
                      flex: 1.3,
                      padding: '0.4rem 0.6rem',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                    title="Generate official repair invoice with custom final price & warranty"
                  >
                    <Receipt size={14} />
                    <span>{isBilled ? 'Re-generate Bill' : 'Generate Bill'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenQcModal(job)}
                    className="btn-outline"
                    style={{
                      padding: '0.4rem 0.55rem',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      borderColor: job.qcPassed ? 'var(--status-green)' : undefined,
                      color: job.qcPassed ? 'var(--status-green)' : undefined,
                      fontWeight: job.qcPassed ? 700 : 500
                    }}
                    title="Pre-delivery Quality & Functional Checklist"
                  >
                    <ShieldCheck size={13} />
                    <span>{job.qcPassed ? 'QC OK' : 'QC Check'}</span>
                  </button>

                  <button
                    onClick={() => onPrintRepairSlip(job)}
                    className="btn-outline"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    title="Print Claim Token Slip for customer"
                  >
                    <Printer size={13} />
                    <span>Token</span>
                  </button>

                  {job.customerMobile && (
                    <button
                      type="button"
                      onClick={() => {
                        const type = (job.status === 'Ready for Delivery' || job.status === 'Delivered') ? 'completed' : 'received';
                        openWhatsAppRepairUpdate(job, shopConfig, type);
                      }}
                      className="btn-outline"
                      style={{
                        padding: '0.4rem 0.65rem',
                        color: '#25D366',
                        borderColor: '#25D366',
                        background: 'rgba(37, 211, 102, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                      title="1-Click WhatsApp Status & Pickup Alert to Customer"
                    >
                      <WhatsAppIcon size={14} color="#25D366" />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: GENERATE BILL / INVOICE FOR REPAIR (PRE-FILLED CUSTOMER DATA)      */}
      {/* ========================================================================= */}
      {billModalOpen && jobToBill && (
        <div 
          className="drawer-overlay" 
          onClick={() => setBillModalOpen(false)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}
        >
          <div 
            className="illoca-card animate-fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '640px', 
              width: '100%', 
              maxHeight: '92vh', 
              overflowY: 'auto',
              padding: '1.5rem', 
              background: 'var(--surface-primary)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-accent)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={20} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                    Generate Repair Bill — {jobToBill.jobId}
                  </h3>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Customer name & device details are pre-filled. Adjust final service price, parts, and warranty.
                </div>
              </div>
              <button 
                onClick={() => setBillModalOpen(false)}
                style={{ fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)', border: 'none', background: 'transparent' }}
              >
                ✕
              </button>
            </div>

            {/* Pre-filled Customer & Device Summary Card */}
            <div style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer Details (From Intake)</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                    {jobToBill.customerName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    Phone: {jobToBill.customerMobile}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Device & Faults</div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--accent-primary)', marginTop: '0.1rem' }}>
                    {jobToBill.deviceModel} {jobToBill.color && `(${jobToBill.color})`}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Faults: {jobToBill.issues.join(', ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Final Price & Advance Adjustment */}
            <div style={{
              background: 'var(--illoca-blue-subtle)',
              border: '1px solid var(--accent-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '1rem',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  Final Repair & Service Charges (₹) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-primary)' }}>₹</span>
                  <input
                    type="number"
                    value={finalServicePrice}
                    onChange={(e) => setFinalServicePrice(e.target.value)}
                    required
                    className="input-field"
                    style={{
                      paddingLeft: '1.75rem',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      background: 'var(--surface-primary)',
                      borderColor: 'var(--accent-primary)'
                    }}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Advance Paid at Intake: <strong>₹{jobToBill.advancePaid}</strong>
                </div>
                {(() => {
                  const finalAmount = parseFloat(finalServicePrice) || 0;
                  const disc = Math.max(0, Number(repairDiscount) || 0);
                  const afterDiscount = Math.max(0, Math.round(finalAmount - disc));
                  const adv = Number(jobToBill.advancePaid) || 0;
                  const netDue = Math.max(0, afterDiscount - adv);

                  return (
                    <div style={{ marginTop: '0.2rem' }}>
                      {disc > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--status-green)', fontWeight: 600 }}>
                          After Discount: ₹{afterDiscount.toLocaleString()}
                        </div>
                      )}
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Net Balance to Collect Now:</div>
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: netDue > 0 ? 'var(--status-green)' : 'var(--text-primary)'
                      }}>
                        ₹{netDue.toLocaleString()}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Service Title / Replaced Parts Description */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Service & Spare Parts Description (Printed on Invoice Item)
              </label>
              <input
                type="text"
                value={repairDescription}
                onChange={(e) => setRepairDescription(e.target.value)}
                placeholder="e.g. Display OLED Folder Replacement & OCA Lamination"
                className="input-field"
                style={{ fontSize: '0.84rem', fontWeight: 600 }}
              />
            </div>

            {/* Consumed Spare Parts Section */}
            <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
                  <Box size={14} color="var(--accent-primary)" />
                  <span>Consumed Spare Parts & Hardware (Tracks Net Profit & Stock)</span>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Total Parts Cost: <strong style={{ color: 'var(--text-primary)' }}>₹{consumedParts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0).toLocaleString()}</strong>
                </span>
              </div>

              {/* Inputs to add a consumed part */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr 90px auto', gap: '0.4rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Part name (e.g. OLED Display Folder)"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.78rem' }}
                />
                <select
                  value={selectedInventoryPartId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedInventoryPartId(id);
                    if (id) {
                      const invItem = inventory.find(i => i.id === id);
                      if (invItem) {
                        setNewPartName(invItem.name);
                        setNewPartCost(String(invItem.buyPrice || invItem.costPrice || 0));
                      }
                    }
                  }}
                  className="input-field"
                  style={{ fontSize: '0.76rem' }}
                >
                  <option value="">Or Pick from Store Stock...</option>
                  {inventory.filter(i => i.stock > 0).map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.stock} left - ₹{i.buyPrice || i.price})</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cost ₹"
                  value={newPartCost}
                  onChange={(e) => setNewPartCost(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.78rem' }}
                />
                <button
                  type="button"
                  onClick={handleAddConsumedPart}
                  className="btn-primary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                >
                  + Add
                </button>
              </div>

              {/* List of added parts */}
              {consumedParts.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
                  {consumedParts.map(part => (
                    <span key={part.id} className="mono-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: 'var(--surface-primary)', border: '1px solid var(--border-color)' }}>
                      <strong>{part.name}</strong> (Cost: ₹{part.cost})
                      <button type="button" onClick={() => handleRemoveConsumedPart(part.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--status-red)', padding: 0, fontWeight: 900 }}>✕</button>
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  No extra spare parts logged. Standard repair labor margins applied.
                </div>
              )}
            </div>

            {/* Warranty & Payment Configuration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Repair Warranty Printed on Bill
                </label>
                <select
                  value={repairWarrantyPresets.includes(repairWarranty) ? repairWarranty : 'Other (Custom Terms)'}
                  onChange={(e) => {
                    if (e.target.value === 'Other (Custom Terms)') {
                      setRepairWarranty(repairWarrantyPresets.includes(repairWarranty) ? '' : repairWarranty);
                    } else {
                      setRepairWarranty(e.target.value);
                    }
                  }}
                  className="input-field"
                  style={{ marginBottom: (!repairWarrantyPresets.includes(repairWarranty) || repairWarranty === 'Other (Custom Terms)') ? '0.35rem' : '0' }}
                >
                  {repairWarrantyPresets.map((w, idx) => (
                    <option key={idx} value={w}>{w}</option>
                  ))}
                </select>

                {(!repairWarrantyPresets.includes(repairWarranty) || repairWarranty === 'Other (Custom Terms)' || repairWarranty === '') && (
                  <input
                    type="text"
                    placeholder="Enter custom warranty terms to print on bill..."
                    value={repairWarranty === 'Other (Custom Terms)' ? '' : repairWarranty}
                    onChange={(e) => setRepairWarranty(e.target.value)}
                    className="input-field"
                    style={{ fontSize: '0.76rem', marginTop: '0.35rem' }}
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Invoice Format
                </label>
                <select
                  value={repairBillingType}
                  onChange={(e) => setRepairBillingType(e.target.value)}
                  className="input-field"
                >
                  <option value="non-gst">Service Cash Memo (Non-GST)</option>
                  <option value="gst">GST Tax Invoice (18% SAC 998713)</option>
                </select>

                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginTop: '0.45rem', marginBottom: '0.25rem' }}>
                  Payment Mode
                </label>
                <select
                  value={repairPaymentMode}
                  onChange={(e) => setRepairPaymentMode(e.target.value)}
                  className="input-field"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI / PhonePe / GPay">UPI / PhonePe / GPay</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Khata">Khata (Customer Credit)</option>
                </select>

                <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginTop: '0.45rem', marginBottom: '0.25rem' }}>
                  Discount on Bill (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--status-green)', fontWeight: 700, fontSize: '0.9rem' }}>−</span>
                  <input
                    type="number"
                    min="0"
                    value={repairDiscount}
                    onChange={(e) => setRepairDiscount(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '1.5rem', color: repairDiscount > 0 ? 'var(--status-green)' : undefined, fontWeight: 600 }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Repair Notes / Terms on Bill */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Invoice Notes & Disclaimer (Printed on Bill)
              </label>
              <textarea
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                rows={2}
                className="input-field"
                style={{ fontSize: '0.78rem', resize: 'vertical' }}
              />
            </div>

            {/* Commit Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              <button 
                type="button" 
                onClick={() => setBillModalOpen(false)}
                className="btn-outline"
                style={{ padding: '0.55rem 1rem' }}
              >
                Cancel
              </button>

              <button 
                type="button" 
                onClick={() => handleGenerateRepairInvoice('thermal')}
                className="btn-primary"
                style={{ padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Printer size={15} />
                <span>
                  {(() => {
                    const finalAmount = parseFloat(finalServicePrice) || 0;
                    const disc = Math.max(0, Number(repairDiscount) || 0);
                    const afterDisc = Math.max(0, Math.round(finalAmount - disc));
                    const adv = Number(jobToBill.advancePaid) || 0;
                    const netToCollect = Math.max(0, afterDisc - adv);
                    if (repairPaymentMode === 'Khata') {
                      return `Bill to Khata (Due: ₹${netToCollect.toLocaleString()})`;
                    }
                    if (adv > 0) {
                      return `Print Thermal & Collect ₹${netToCollect.toLocaleString()} (Adv ₹${adv.toLocaleString()} Deducted)`;
                    }
                    return `Print Thermal & Collect ₹${netToCollect.toLocaleString()}`;
                  })()}
                </span>
              </button>

              <button 
                type="button" 
                onClick={() => handleGenerateRepairInvoice('a4')}
                className="btn-primary"
                style={{ padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#10B981', borderColor: '#10B981' }}
              >
                <FileText size={15} />
                <span>
                  {(() => {
                    const finalAmount = parseFloat(finalServicePrice) || 0;
                    const disc = Math.max(0, Number(repairDiscount) || 0);
                    const afterDisc = Math.max(0, Math.round(finalAmount - disc));
                    const adv = Number(jobToBill.advancePaid) || 0;
                    const netToCollect = Math.max(0, afterDisc - adv);
                    if (repairPaymentMode === 'Khata') {
                      return `A4 Bill to Khata (Due: ₹${netToCollect.toLocaleString()})`;
                    }
                    if (adv > 0) {
                      return `Print A4 & Collect ₹${netToCollect.toLocaleString()} (Adv ₹${adv.toLocaleString()} Deducted)`;
                    }
                    return `Print Official A4 Invoice (₹${netToCollect.toLocaleString()})`;
                  })()}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRE-DELIVERY QUALITY / TESTING CHECKLIST                           */}
      {/* ========================================================================= */}
      {qcJob && (
        <div 
          className="drawer-overlay" 
          onClick={() => setQcJob(null)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 3500 }}
        >
          <div 
            className="illoca-card animate-fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '540px', 
              width: '100%', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              padding: '1.5rem', 
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.5)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} color="var(--status-green)" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                    Pre-Delivery QC Checklist — {qcJob.jobId}
                  </h3>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {qcJob.deviceModel} • Customer: {qcJob.customerName} ({qcJob.customerMobile})
                </div>
              </div>
              <button 
                onClick={() => setQcJob(null)}
                style={{ fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)', border: 'none', background: 'transparent' }}
              >
                ✕
              </button>
            </div>

            {/* Sub-bar with quick pass */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'var(--surface-card)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.82rem' }}>
                Tested: <strong style={{ color: 'var(--status-green)' }}>{defaultQcItems.filter(it => qcChecks[it.id]).length}</strong> / {defaultQcItems.length} Features
              </div>
              <button
                type="button"
                onClick={handleMarkAllQcPassed}
                className="btn-outline"
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', color: 'var(--status-green)', borderColor: 'var(--status-green)' }}
              >
                ✓ Mark All Passed
              </button>
            </div>

            {/* Checklist Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {defaultQcItems.map(item => {
                const isPassed = Boolean(qcChecks[item.id]);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleQcItem(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${isPassed ? 'var(--status-green)' : 'var(--border-color)'}`,
                      background: isPassed ? 'rgba(31, 110, 72, 0.08)' : 'var(--surface-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: isPassed ? 700 : 500, color: isPassed ? 'var(--status-green)' : 'var(--text-primary)' }}>
                      {item.label}
                    </span>
                    <span className="mono-tag" style={{
                      background: isPassed ? 'var(--status-green-bg)' : 'var(--border-color)',
                      color: isPassed ? 'var(--status-green)' : 'var(--text-muted)',
                      fontWeight: 800,
                      fontSize: '0.72rem'
                    }}>
                      {isPassed ? 'PASSED ✓' : 'NOT TESTED'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Save Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              <button 
                type="button" 
                onClick={() => setQcJob(null)}
                className="btn-outline"
                style={{ padding: '0.55rem 1rem' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveQc}
                className="btn-primary"
                style={{ padding: '0.55rem 1.25rem' }}
              >
                Save QC Certification
              </button>
            </div>

          </div>
        </div>
      )}

      {/* New Job Modal */}
      {showAddModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 3000 }}>
          <form onSubmit={handleCreateJob} className="illoca-card animate-fade-in" style={{ maxWidth: '580px', width: '100%', padding: '1.5rem', background: 'var(--surface-primary)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wrench size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>New Repair Job Card</h3>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Customer Name *</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Mobile Number *</label>
                <input
                  type="text"
                  placeholder="10-digit Phone"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Device Make & Model *</label>
                <input
                  type="text"
                  placeholder="e.g. Vivo V29 5G"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Device Color / Appearance</label>
                <input
                  type="text"
                  placeholder="e.g. Himalayan Blue"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Screen Lock / Pattern / PIN</label>
              <input
                type="text"
                placeholder="PIN: 1234 or Pattern description"
                value={screenLock}
                onChange={(e) => setScreenLock(e.target.value)}
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Reported Faults */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Reported Problems / Faults</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {commonIssues.map((iss, i) => {
                  const isChecked = selectedIssues.includes(iss);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleIssue(iss)}
                      style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        border: isChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: isChecked ? 'var(--illoca-blue-subtle)' : 'var(--surface-primary)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: isChecked ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: isChecked ? 600 : 400,
                      }}
                    >
                      {isChecked ? '✓ ' : '+ '} {iss}
                    </div>
                  );
                })}
              </div>

              <input
                type="text"
                placeholder="Other specific problem..."
                value={customIssue}
                onChange={(e) => setCustomIssue(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.8rem' }}
              />
            </div>

            {/* Financial Estimates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Estimated Cost (₹) *
                </label>
                <input
                  type="number"
                  placeholder={costInformedAfterChecking ? "Informed after checking" : "e.g. 1800"}
                  value={costInformedAfterChecking ? '' : estimatedCost}
                  onChange={(e) => {
                    setEstimatedCost(e.target.value);
                    if (costInformedAfterChecking) setCostInformedAfterChecking(false);
                  }}
                  disabled={costInformedAfterChecking}
                  required={!costInformedAfterChecking}
                  className="input-field"
                  style={{ 
                    fontWeight: 700, 
                    opacity: costInformedAfterChecking ? 0.6 : 1,
                    background: costInformedAfterChecking ? 'rgba(0,0,0,0.06)' : undefined 
                  }}
                />

                {/* Option to select "Informed after checking" */}
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.35rem', 
                  marginTop: '0.35rem', 
                  cursor: 'pointer', 
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: costInformedAfterChecking ? '#D97706' : 'var(--text-secondary)'
                }}>
                  <input
                    type="checkbox"
                    checked={costInformedAfterChecking}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCostInformedAfterChecking(checked);
                      if (checked) setEstimatedCost('');
                    }}
                    style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                  />
                  <span>🔍 Informed after checking</span>
                </label>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Advance Paid (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Assign Technician
                </label>
                <select
                  value={technician}
                  onChange={(e) => {
                    setTechnician(e.target.value);
                    if (e.target.value !== 'Other') setCustomTechnician('');
                  }}
                  className="input-field"
                  style={{ marginBottom: technician === 'Other' ? '0.35rem' : '0' }}
                >
                  <option value="">-- Select Technician --</option>
                  {techniciansList.map(tech => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                  <option value="Other">+ Other (Add New Technician)</option>
                </select>

                {technician === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter technician name..."
                    value={customTechnician}
                    onChange={(e) => setCustomTechnician(e.target.value)}
                    className="input-field"
                    autoFocus
                  />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline">
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
                <Printer size={16} />
                <span>Save & Print Claim Token</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
