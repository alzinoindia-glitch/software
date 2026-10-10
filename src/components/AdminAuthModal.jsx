import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Key, 
  X, 
  AlertCircle 
} from 'lucide-react';

export default function AdminAuthModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  // Reset & autofocus when modal opens
  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setErrorMsg('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyPin = (codeToVerify) => {
    const code = (codeToVerify !== undefined ? codeToVerify : pinInput).trim();
    setErrorMsg('');

    if (code === '4488') {
      onSuccess();
      onClose();
    } else {
      setErrorMsg('Incorrect PIN. Enter 4488 to open Admin Portal.');
    }
  };

  return (
    <div className="modal-backdrop no-print" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-dialog animate-fade-in" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '380px', 
          width: '92%',
          background: 'var(--surface-card, #FEFDFA)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 20px 45px rgba(15, 37, 30, 0.32)',
          border: '1.5px solid var(--border-color, #C2D2CB)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          background: '#0F251E',
          color: '#F1EFE5',
          padding: '1.15rem 1.35rem',
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
              <Key size={17} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#F1EFE5' }}>
                Admin Portal Passcode
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(241, 239, 229, 0.7)' }}>
                Enter 4488 to unlock store management
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
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.35rem' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(211, 63, 60, 0.1)',
              border: '1px solid var(--status-red, #D33F3C)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 0.8rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--status-red, #D33F3C)',
              fontSize: '0.8rem'
            }}>
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleVerifyPin(); }}>
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.45rem', textAlign: 'center' }}>
                Enter 4-Digit Admin Code
              </label>

              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinInput(val);
                  setErrorMsg('');
                  if (val.length === 4) {
                    handleVerifyPin(val);
                  }
                }}
                autoFocus
                placeholder="••••"
                maxLength={4}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '1.8rem',
                  letterSpacing: '0.5em',
                  fontWeight: 800,
                  textAlign: 'center',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--border-color)',
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />

              {/* Quick Numpad Helper Chips */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '0.75rem' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(digit => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => {
                      if (pinInput.length < 4) {
                        const nextVal = pinInput + digit;
                        setPinInput(nextVal);
                        setErrorMsg('');
                        if (nextVal.length === 4) {
                          handleVerifyPin(nextVal);
                        }
                      }
                    }}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--surface-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {digit}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.6rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pinInput.length !== 4}
                className="btn-primary"
                style={{ 
                  flex: 2, 
                  padding: '0.6rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.45rem',
                  opacity: pinInput.length !== 4 ? 0.6 : 1,
                  cursor: pinInput.length !== 4 ? 'not-allowed' : 'pointer'
                }}
              >
                <ShieldCheck size={16} />
                <span>Open Admin Portal</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
