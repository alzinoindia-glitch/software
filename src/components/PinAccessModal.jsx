import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, X } from 'lucide-react';
import { generateBase32Secret, verifyTotpToken } from '../utils/totp';

const getRoleStorageKeys = role => ({
  secret: `ALZINO_ERP_TOTP_SECRET_${role.toUpperCase()}`,
  enrolled: `ALZINO_ERP_TOTP_ENROLLED_${role.toUpperCase()}`
});

export default function PinAccessModal({ isOpen, role = 'admin', onClose, onSuccess }) {
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30 - (Math.floor(Date.now() / 1000) % 30));
  const isAdmin = role === 'admin';
  const portalName = isAdmin ? 'Admin' : 'Cashier';

  useEffect(() => {
    if (!isOpen) return undefined;
    const keys = getRoleStorageKeys(role);
    let savedSecret = localStorage.getItem(keys.secret);
    // Preserve the earlier admin authenticator setup on this browser.
    if (!savedSecret && isAdmin) {
      savedSecret = localStorage.getItem('ALZINO_ERP_TOTP_SECRET');
      if (savedSecret) localStorage.setItem(keys.secret, savedSecret);
    }
    if (!savedSecret) {
      savedSecret = generateBase32Secret(20);
      localStorage.setItem(keys.secret, savedSecret);
    }

    setSecret(savedSecret);
    setCode('');
    setError('');

  }, [isOpen, role, isAdmin]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const interval = setInterval(() => {
      setSecondsRemaining(30 - (Math.floor(Date.now() / 1000) % 30));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const close = () => {
    setCode('');
    setError('');
    if (onClose) onClose();
    else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (code.length !== 6 || !secret) return;
    setBusy(true);
    setError('');
    try {
      const valid = await verifyTotpToken(code, secret);
      if (!valid) {
        setError('Invalid code. Check the current code in Microsoft or Google Authenticator.');
        setCode('');
        return;
      }
      localStorage.setItem(getRoleStorageKeys(role).enrolled, 'true');
      await onSuccess?.();
    } catch (err) {
      setError(err.message || 'Could not verify the authenticator code.');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop no-print" style={{ zIndex: 1200 }}>
      <section className="modal-dialog animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="portal-auth-title" style={{ maxWidth: 460, width: '95%', padding: '1.25rem', background: 'var(--surface-card, #FEFDFA)', borderRadius: 14, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 id="portal-auth-title" style={{ margin: 0 }}>{portalName} Authenticator</h2>
          <button type="button" className="btn-secondary" aria-label="Close" onClick={close}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginTop: 16 }}>
          <div>
            <label htmlFor="authenticator-code" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 8 }}>
              <span>Enter 6-digit code from authenticator</span>
              <span style={{ fontSize: '0.75rem', color: secondsRemaining <= 5 ? 'var(--status-red)' : 'var(--text-secondary)' }}><RefreshCw size={12} /> {secondsRemaining}s</span>
            </label>
            <input
              id="authenticator-code"
              autoFocus
              aria-label="Authenticator code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000 000"
              required
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-field"
              style={{ fontSize: '1.5rem', letterSpacing: '0.35em', textAlign: 'center', fontWeight: 800 }}
            />
          </div>

          {error && <p role="alert" style={{ color: 'var(--status-red)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-secondary" onClick={close} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy || code.length !== 6} style={{ flex: 2 }}>
              <ShieldCheck size={16} /> {busy ? 'Verifying…' : `Verify & Unlock ${portalName}`}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
