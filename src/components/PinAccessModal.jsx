import React, { useEffect, useState } from 'react';
import { Copy, QrCode, RefreshCw, ShieldCheck, X } from 'lucide-react';
import QRCode from 'qrcode';
import { generateBase32Secret, getOtpAuthUri, verifyTotpToken } from '../utils/totp';

const getRoleStorageKeys = role => ({
  secret: `ALZINO_ERP_TOTP_SECRET_${role.toUpperCase()}`,
  enrolled: `ALZINO_ERP_TOTP_ENROLLED_${role.toUpperCase()}`
});

export default function PinAccessModal({ isOpen, role = 'admin', onClose, onSuccess, shopName = 'ALZINO' }) {
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [code, setCode] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30 - (Math.floor(Date.now() / 1000) % 30));
  const isAdmin = role === 'admin';
  const portalName = isAdmin ? 'Admin' : 'Cashier';

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    const keys = getRoleStorageKeys(role);
    let savedSecret = localStorage.getItem(keys.secret);
    const isEnrolled = localStorage.getItem(keys.enrolled) === 'true';

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
    setSetupComplete(isEnrolled);
    setCode('');
    setError('');

    const account = `${role}@alzino.shop`;
    const otpAuthUri = getOtpAuthUri(savedSecret, account, shopName || 'ALZINO');
    QRCode.toDataURL(otpAuthUri, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      .then(dataUrl => { if (active) setQrDataUrl(dataUrl); })
      .catch(() => { if (active) setError('Could not create the setup QR code. You can enter the setup key manually.'); });

    return () => { active = false; };
  }, [isOpen, role, isAdmin, shopName]);

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
      if (!setupComplete) {
        localStorage.setItem(getRoleStorageKeys(role).enrolled, 'true');
        setSetupComplete(true);
      }
      await onSuccess?.();
    } catch (err) {
      setError(err.message || 'Could not verify the authenticator code.');
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy the setup key. You can select and copy it manually.');
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

          {!setupComplete && <div style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderBottom: '1px dashed var(--border-color)', paddingBottom: 10, marginBottom: 10 }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}><QrCode size={17} /> Scan QR in Microsoft Authenticator</strong>
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 10px' }}>Open Microsoft Authenticator, tap +, choose Other account, then scan this QR code.</p>
            {qrDataUrl ? <img src={qrDataUrl} alt={`${portalName} authenticator setup QR code`} style={{ width: 220, height: 220, maxWidth: '100%', background: '#fff', borderRadius: 8, border: '1px solid var(--border-color)' }} /> : <p>Preparing QR code…</p>}
            <p style={{ color: 'var(--text-secondary)', margin: '10px 0 0', overflowWrap: 'anywhere' }}>
              Setup key: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{secret}</strong>
              <button type="button" onClick={copySecret} className="btn-secondary" style={{ marginLeft: 8, padding: '0.25rem 0.45rem' }}><Copy size={13} /> {copied ? 'Copied' : 'Copy'}</button>
            </p>
          </div>}

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
