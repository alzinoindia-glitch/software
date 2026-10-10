import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  X, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';
import { 
  verifyTotpToken, 
  generateBase32Secret 
} from '../utils/totp';

export default function AdminAuthModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const [totpInput, setTotpInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Time remaining in current 30s TOTP cycle
  const [secondsRemaining, setSecondsRemaining] = useState(30 - (Math.floor(Date.now() / 1000) % 30));

  // Persistent TOTP Secret (stored in localStorage or generated once)
  const [totpSecret] = useState(() => {
    const saved = localStorage.getItem('ALZINO_ERP_TOTP_SECRET');
    if (saved && saved.length >= 16) return saved;
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
      setTotpInput('');
      setErrorMsg('');
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real Google Authenticator TOTP verification
  const handleVerifyTotp = async (codeToVerify) => {
    const code = (codeToVerify || totpInput).trim().replace(/\D/g, '');
    setErrorMsg('');

    if (code.length !== 6) {
      setErrorMsg('Please enter the 6-digit code from Google Authenticator.');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyTotpToken(code, totpSecret);
      if (isValid) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg('Invalid code. Please check Google Authenticator on the owner\'s phone.');
      }
    } catch (err) {
      console.error('Auth verification error:', err);
      setErrorMsg('Verification error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="modal-backdrop no-print" style={{ zIndex: 1200 }}>
      <div 
        className="modal-dialog animate-fade-in" 
        style={{ 
          maxWidth: '420px', 
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
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              background: '#A9BC5C',
              color: '#0F251E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800
            }}>
              <Smartphone size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#F1EFE5' }}>
                Google Authenticator
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(241, 239, 229, 0.7)' }}>
                Owner verification required to open Admin Portal
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
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
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

          <form onSubmit={(e) => { e.preventDefault(); handleVerifyTotp(); }}>
            <div style={{ marginBottom: '1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Enter 6-Digit Rolling Code
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
                  <span>Refreshes in {secondsRemaining}s</span>
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
                  setErrorMsg('');
                  // Automatically verify when all 6 digits are typed
                  if (val.length === 6) {
                    handleVerifyTotp(val);
                  }
                }}
                autoFocus
                placeholder="000 000"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  fontSize: '1.6rem',
                  letterSpacing: '0.4em',
                  fontWeight: 800,
                  textAlign: 'center',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--border-color)',
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ marginTop: '0.55rem', fontSize: '0.74rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Open <strong>Google Authenticator</strong> on the store owner's phone to view the code.
              </div>
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
                disabled={isVerifying || totpInput.length !== 6}
                className="btn-primary"
                style={{ 
                  flex: 2, 
                  padding: '0.65rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.45rem',
                  opacity: (isVerifying || totpInput.length !== 6) ? 0.6 : 1,
                  cursor: (isVerifying || totpInput.length !== 6) ? 'not-allowed' : 'pointer'
                }}
              >
                <ShieldCheck size={16} />
                <span>{isVerifying ? 'Verifying...' : 'Open Admin Portal'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
