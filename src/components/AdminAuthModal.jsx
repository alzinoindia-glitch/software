import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Smartphone, 
  Lock, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  QrCode, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  verifyTotpToken, 
  generateBase32Secret, 
  getOtpAuthUri,
  generateTotpToken
} from '../utils/totp';

export default function AdminAuthModal({
  isOpen,
  onClose,
  onSuccess,
  shopConfig,
  currentRole
}) {
  const [authMethod, setAuthMethod] = useState('pin'); // 'pin' | 'totp'
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [totpInput, setTotpInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [showQrSetup, setShowQrSetup] = useState(false);

  // Time remaining in current 30s TOTP cycle
  const [secondsRemaining, setSecondsRemaining] = useState(30 - (Math.floor(Date.now() / 1000) % 30));

  // Persistent TOTP Secret (stored in localStorage or generated once)
  const [totpSecret, setTotpSecret] = useState(() => {
    const saved = localStorage.getItem('ALZINO_ERP_TOTP_SECRET');
    if (saved && saved.length >= 16) return saved;
    // Default deterministic secret or new random secret
    const newSecret = generateBase32Secret(16);
    localStorage.setItem('ALZINO_ERP_TOTP_SECRET', newSecret);
    return newSecret;
  });

  // Keep countdown timer synced
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
      setSecondsRemaining(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset inputs when opened
  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setTotpInput('');
      setErrorMsg('');
      setShowQrSetup(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const adminPin = shopConfig?.adminPin || '1234';
  const otpAuthUri = getOtpAuthUri(totpSecret, `${shopConfig?.phone || 'admin'}@alzino`, shopConfig?.name || 'ALZINO');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpAuthUri)}&margin=1`;

  // Handle PIN verification
  const handleVerifyPin = (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (pinInput.trim() === adminPin) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg('Incorrect Master PIN. Please try again.');
    }
  };

  // Handle TOTP verification
  const handleVerifyTotp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (totpInput.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit code.');
      return;
    }

    const isValid = await verifyTotpToken(totpInput, totpSecret);
    if (isValid) {
      onSuccess();
      onClose();
    } else {
      // Also allow master PIN as emergency bypass
      if (totpInput.trim() === adminPin) {
        onSuccess();
        onClose();
        return;
      }
      setErrorMsg('Invalid Authenticator Code. Ensure your device time is accurate or check current code.');
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleResetSecret = () => {
    if (confirm('Regenerate a new Authenticator Secret Key? You will need to re-scan the QR code in Google Authenticator or Microsoft Authenticator.')) {
      const fresh = generateBase32Secret(16);
      setTotpSecret(fresh);
      localStorage.setItem('ALZINO_ERP_TOTP_SECRET', fresh);
      setErrorMsg('');
    }
  };

  return (
    <div className="modal-backdrop no-print" style={{ zIndex: 1200 }}>
      <div 
        className="modal-dialog animate-fade-in" 
        style={{ 
          maxWidth: '460px', 
          width: '95%',
          background: 'var(--surface-card, #FEFDFA)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 20px 45px rgba(15, 37, 30, 0.28)',
          border: '1.5px solid var(--border-color, #C2D2CB)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          background: '#0F251E',
          color: '#F1EFE5',
          padding: '1.25rem 1.4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: '#A9BC5C',
              color: '#0F251E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800
            }}>
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#F1EFE5' }}>
                Admin Portal Verification
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(241, 239, 229, 0.7)' }}>
                Elevate permissions from Cashier to Store Owner
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn-secondary"
            style={{ 
              background: 'rgba(241, 239, 229, 0.1)', 
              color: '#F1EFE5', 
              border: 'none',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Verification Method Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--surface-primary)'
        }}>
          <button
            onClick={() => { setAuthMethod('pin'); setErrorMsg(''); }}
            style={{
              padding: '0.75rem',
              border: 'none',
              borderBottom: authMethod === 'pin' ? '3px solid #0C5B43' : '3px solid transparent',
              background: authMethod === 'pin' ? 'var(--surface-card)' : 'transparent',
              color: authMethod === 'pin' ? '#0C5B43' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              transition: 'var(--transition-fast)'
            }}
          >
            <Key size={15} />
            <span>Master PIN</span>
          </button>

          <button
            onClick={() => { setAuthMethod('totp'); setErrorMsg(''); }}
            style={{
              padding: '0.75rem',
              border: 'none',
              borderBottom: authMethod === 'totp' ? '3px solid #0C5B43' : '3px solid transparent',
              background: authMethod === 'totp' ? 'var(--surface-card)' : 'transparent',
              color: authMethod === 'totp' ? '#0C5B43' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              transition: 'var(--transition-fast)'
            }}
          >
            <Smartphone size={15} />
            <span>Google / MS Authenticator</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.4rem' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(211, 63, 60, 0.1)',
              border: '1px solid var(--status-red, #D33F3C)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--status-red, #D33F3C)',
              fontSize: '0.82rem'
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* METHOD 1: MASTER PIN */}
          {authMethod === 'pin' && (
            <form onSubmit={handleVerifyPin}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  Enter Master Admin PIN
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    autoFocus
                    placeholder="Enter 4-digit PIN (default: 1234)"
                    maxLength={8}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.8rem 0.75rem 0.9rem',
                      fontSize: '1.2rem',
                      letterSpacing: showPin ? '0.1em' : '0.25em',
                      fontWeight: 700,
                      textAlign: 'center',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--surface-primary)',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem', textAlign: 'center' }}>
                  Default PIN: <strong style={{ color: 'var(--accent-primary)' }}>{adminPin}</strong> (Change anytime in Shop Settings)
                </div>
              </div>

              {/* Quick Numpad for Touch / Fast Entry */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.45rem',
                marginBottom: '1.25rem'
              }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => {
                      if (btn === 'C') setPinInput('');
                      else if (btn === '⌫') setPinInput(prev => prev.slice(0, -1));
                      else setPinInput(prev => (prev.length < 8 ? prev + btn : prev));
                    }}
                    style={{
                      padding: '0.6rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--surface-primary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    {btn}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.65rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2, padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                >
                  <ShieldCheck size={16} />
                  <span>Verify & Unlock Admin</span>
                </button>
              </div>
            </form>
          )}

          {/* METHOD 2: 2FA TOTP AUTHENTICATOR */}
          {authMethod === 'totp' && (
            <form onSubmit={handleVerifyTotp}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Enter 6-digit Code from Authenticator App
                  </label>
                  <div style={{
                    fontSize: '0.72rem',
                    color: secondsRemaining <= 5 ? 'var(--status-red)' : 'var(--accent-primary)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <RefreshCw size={11} className={secondsRemaining <= 5 ? 'animate-spin' : ''} />
                    <span>Resets in {secondsRemaining}s</span>
                  </div>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={totpInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTotpInput(val);
                    // Auto-submit on 6 digits
                    if (val.length === 6) {
                      verifyTotpToken(val, totpSecret).then((isValid) => {
                        if (isValid || val === adminPin) {
                          onSuccess();
                          onClose();
                        } else {
                          setErrorMsg('Invalid 6-digit Authenticator code. Check app code.');
                        }
                      });
                    }
                  }}
                  autoFocus
                  placeholder="000 000"
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1.4rem',
                    letterSpacing: '0.35em',
                    fontWeight: 800,
                    textAlign: 'center',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border-color)',
                    background: 'var(--surface-primary)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* QR Code Setup Toggle */}
              <div style={{
                background: 'var(--surface-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                marginBottom: '1.15rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <QrCode size={15} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Setup Authenticator on Phone
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrSetup(!showQrSetup)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {showQrSetup ? 'Hide QR' : 'Show QR Code'}
                  </button>
                </div>

                {showQrSetup && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Scan this QR code with <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong>:
                    </p>
                    
                    <div style={{ display: 'inline-block', padding: '0.5rem', background: '#FFFFFF', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <img 
                        src={qrCodeUrl} 
                        alt="Scan QR in Authenticator" 
                        style={{ width: '140px', height: '140px', display: 'block' }}
                      />
                    </div>

                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <span>Or enter key manually: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{totpSecret}</strong>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        style={{
                          marginLeft: '0.35rem',
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}
                      >
                        {copiedKey ? <Check size={12} color="var(--status-green)" /> : <Copy size={12} />}
                        <span style={{ fontSize: '0.7rem' }}>{copiedKey ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div style={{ marginTop: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={handleResetSecret}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--status-amber, #AC7C20)',
                          fontSize: '0.7rem',
                          cursor: 'pointer'
                        }}
                      >
                        Regenerate new 2FA secret
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.65rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2, padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                >
                  <ShieldCheck size={16} />
                  <span>Verify Code</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
