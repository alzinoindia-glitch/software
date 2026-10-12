import React, { useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';

export default function PinAccessModal({ isOpen, role = 'admin', onClose, onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!isOpen) return null;

  const isAdmin = role === 'admin';
  const expectedPin = isAdmin ? '4488' : '4848';
  const title = isAdmin ? 'Admin PIN' : 'Cashier PIN';

  const handleSubmit = async event => {
    event.preventDefault();
    if (pin !== expectedPin) {
      setError('Incorrect PIN. Try again.');
      setPin('');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSuccess?.();
    } catch (err) {
      setError(err?.message || 'Could not open this portal.');
      setBusy(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    if (onClose) onClose();
    else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="modal-backdrop no-print" style={{ zIndex: 1200 }}>
      <section className="modal-dialog animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="portal-pin-title" style={{ maxWidth: 360, width: '92%', padding: '1.25rem', background: 'var(--surface-card, #FEFDFA)', borderRadius: 14, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 id="portal-pin-title" style={{ marginTop: 0 }}>{title}</h2>
          <button type="button" className="btn-secondary" aria-label="Close" onClick={handleClose}><X size={16} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Enter the 4-digit {isAdmin ? 'admin' : 'cashier'} PIN to continue.</p>
        {error && <p role="alert" style={{ color: 'var(--status-red)' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <input autoFocus aria-label={`${isAdmin ? 'Admin' : 'Cashier'} PIN`} type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" required value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} className="input-field" />
          <button className="btn-primary" type="submit" disabled={busy || pin.length !== 4}>
            {isAdmin ? <ShieldCheck size={16} /> : <KeyRound size={16} />}
            {busy ? 'Opening…' : `Unlock ${isAdmin ? 'admin' : 'cashier'}`}
          </button>
        </form>
      </section>
    </div>
  );
}
