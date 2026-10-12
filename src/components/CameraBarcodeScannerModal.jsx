import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Zap, Flashlight, Volume2, CheckCircle2, AlertCircle, Keyboard } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { playDeviceBeep } from '../utils/hardwareDevices';

/**
 * CameraBarcodeScannerModal
 * Mobile-ready, high-speed camera barcode scanner powered by Html5Qrcode.
 * Supports:
 * - 100% Mobile Phone Camera scanning (rear camera with autofocus & torch)
 * - Tablet & Laptop webcam scanning
 * - Code-128, Code-39, EAN-13, EAN-8, UPC-A, UPC-E, QR Code
 * - Audio beep + haptic vibration feedback
 * - Manual barcode input fallback
 */
export default function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Scan Barcode with Mobile / Camera",
  description = "Point your camera at the barcode on the product box or label",
  continuous = false
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastScanned, setLastScanned] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const isHandlingScanRef = useRef(false);
  const containerId = 'alzino-camera-scanner-view';

  // Initialize and enumerate video devices
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setLastScanned(null);
    isHandlingScanRef.current = false;
    let isCancelled = false;

    Html5Qrcode.getCameras()
      .then(devices => {
        if (isCancelled) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera on phones
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          );
          const chosenId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(chosenId);
          startCamera(chosenId);
        } else {
          // Attempt generic facingMode environment
          startCamera({ facingMode: "environment" });
        }
      })
      .catch(err => {
        console.warn('Camera enumeration error, trying facingMode environment:', err);
        startCamera({ facingMode: "environment" });
      });

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async (cameraSource) => {
    try {
      if (html5QrCodeRef.current && isScanning) {
        await stopCamera();
      }

      setErrorMsg('');
      const qrCode = new Html5Qrcode(containerId);
      html5QrCodeRef.current = qrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 160 },
        aspectRatio: 1.3333,
        disableFlip: false,
      };

      await qrCode.start(
        cameraSource,
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Ignore individual frame non-detections
        }
      );

      setIsScanning(true);

      // Check if torch/flashlight is supported
      try {
        const capabilities = qrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      setIsScanning(false);
      setErrorMsg(
        err?.message?.includes('Permission') 
          ? 'Camera permission was denied. Please allow camera access in browser settings.' 
          : 'Unable to start camera. Please verify device permissions or use manual entry below.'
      );
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
      setTorchOn(false);
    }
  };

  const handleSuccessfulScan = (decodedText) => {
    if (!decodedText) return;
    const clean = decodedText.trim();
    if (!clean) return;
    if (isHandlingScanRef.current && !continuous) return;
    isHandlingScanRef.current = true;

    // Trigger audio beep confirmation
    try {
      playDeviceBeep('success');
    } catch {}

    // Trigger mobile haptic vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 30, 60]);
      } catch {}
    }

    setLastScanned(clean);

    if (onScan) {
      onScan(clean);
    }

    if (!continuous) {
      setTimeout(() => {
        onClose();
      }, 400);
    }
  };

  const handleSwitchCamera = async (newId) => {
    setSelectedCameraId(newId);
    await startCamera(newId);
  };

  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleSuccessfulScan(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="drawer-overlay animate-fade-in" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '1rem', 
        zIndex: 99999,
        background: 'rgba(5, 10, 16, 0.88)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div 
        className="illoca-card" 
        style={{ 
          maxWidth: '460px', 
          width: '100%', 
          background: '#0B111A', 
          border: '1px solid #1E293B',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top Header */}
        <div style={{ padding: '0.85rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', background: '#0F172A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <Camera size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#F8FAFC' }}>
                {title}
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: 0 }}>
                {description}
              </p>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.3rem 0.55rem', borderRadius: '8px', background: '#1E293B', color: '#94A3B8' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Video Viewfinder Container */}
        <div style={{ position: 'relative', width: '100%', minHeight: '300px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Target for Html5Qrcode video */}
          <div 
            id={containerId} 
            ref={scannerRef}
            style={{ width: '100%', minHeight: '300px', overflow: 'hidden' }}
          />

          {/* Laser guide line overlay when scanning */}
          {isScanning && !lastScanned && (
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '12%',
                right: '12%',
                height: '2px',
                background: '#10B981',
                boxShadow: '0 0 12px #10B981, 0 0 4px #34D399',
                pointerEvents: 'none',
                animation: 'pulse 1.5s infinite alternate'
              }}
            />
          )}

          {/* Scanned Success Feedback Banner */}
          {lastScanned && (
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(16, 185, 129, 0.92)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                zIndex: 20,
                padding: '1rem',
                textAlign: 'center'
              }}
            >
              <CheckCircle2 size={42} style={{ marginBottom: '0.5rem', animation: 'bounce 0.5s' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Barcode Scanned!</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'monospace', marginTop: '0.2rem', letterSpacing: '1px' }}>
                {lastScanned}
              </div>
            </div>
          )}

          {/* Camera Error / Permission Banner */}
          {errorMsg && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', textAlign: 'center' }}>
              <AlertCircle size={36} color="#EF4444" style={{ marginBottom: '0.6rem' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.4rem' }}>
                Camera Unavailable
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '1rem', maxWidth: '320px', lineHeight: 1.4 }}>
                {errorMsg}
              </div>
              <button 
                type="button" 
                onClick={() => startCamera(selectedCameraId || { facingMode: "environment" })}
                className="btn-primary"
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <RefreshCw size={13} />
                <span>Retry Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Camera Controls Toolbar */}
        <div style={{ padding: '0.65rem 1rem', background: '#0F172A', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {cameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => handleSwitchCamera(e.target.value)}
                style={{
                  background: '#1E293B',
                  color: '#CBD5E1',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '0.28rem 0.5rem',
                  fontSize: '0.72rem',
                  maxWidth: '180px'
                }}
              >
                {cameras.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}

            {hasTorch && (
              <button
                type="button"
                onClick={handleToggleTorch}
                className="btn-secondary"
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  background: torchOn ? '#10B981' : '#1E293B',
                  color: torchOn ? '#000' : '#CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  borderRadius: '6px'
                }}
              >
                <Flashlight size={13} />
                <span>{torchOn ? 'Torch ON' : 'Torch'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowManualInput(prev => !prev)}
            className="btn-secondary"
            style={{
              padding: '0.3rem 0.6rem',
              fontSize: '0.72rem',
              background: '#1E293B',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              borderRadius: '6px'
            }}
          >
            <Keyboard size={13} />
            <span>Type Code</span>
          </button>
        </div>

        {/* Manual Keyboard Entry Drawer */}
        {showManualInput && (
          <form 
            onSubmit={handleManualSubmit}
            style={{ 
              padding: '0.75rem 1rem', 
              background: '#0B111A', 
              borderTop: '1px solid #1E293B', 
              display: 'flex', 
              gap: '0.4rem' 
            }}
          >
            <input
              type="text"
              placeholder="Type barcode or laser scan..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="input-field"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem', fontFamily: 'monospace' }}
              autoFocus
            />
            <button 
              type="submit" 
              className="btn-primary"
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              Confirm
            </button>
          </form>
        )}

        {/* Help Tip */}
        <div style={{ padding: '0.45rem 1rem', background: '#070C14', fontSize: '0.68rem', color: '#64748B', textAlign: 'center' }}>
          📱 Works seamlessly on Mobile Chrome, Safari, and Desktop Webcams
        </div>
      </div>
    </div>
  );
}
