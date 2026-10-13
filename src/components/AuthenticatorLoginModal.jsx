import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, ShieldCheck, X } from 'lucide-react';
import QRCode from 'qrcode';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';
import { clearAuthenticatorSession, storeAuthenticatorSession } from '../utils/authenticatorSession';

const inputStyle = { width: '100%', padding: '0.7rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' };

export default function AuthenticatorLoginModal({ portal, isOpen, onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [setupData, setSetupData] = useState(null);
  const [qrUrls, setQrUrls] = useState({});
  const [adminCode, setAdminCode] = useState('');
  const [cashierCode, setCashierCode] = useState('');
  const [copied, setCopied] = useState('');
  const codeRef = useRef(null);
  const label = portal === 'cashier' ? 'Cashier' : 'Admin';

  useEffect(() => {
    if (!isOpen) return;
    clearAuthenticatorSession();
    setCode(''); setError(''); setMessage(''); setSetupMode(false); setSetupData(null);
    const timer = setTimeout(() => codeRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [isOpen, portal]);

  useEffect(() => {
    let cancelled = false;
    if (!setupData) { setQrUrls({}); return undefined; }
    Promise.all(['admin', 'cashier'].map(async role => [role, await QRCode.toDataURL(setupData[role].uri, { width: 240, margin: 2 })]))
      .then(entries => { if (!cancelled) setQrUrls(Object.fromEntries(entries)); })
      .catch(() => { if (!cancelled) setError('Could not display setup QR codes. Use the manual setup keys.'); });
    return () => { cancelled = true; };
  }, [setupData]);

  if (!isOpen) return null;

  const close = () => {
    setCode(''); setError(''); setMessage(''); setSetupMode(false); setSetupData(null);
    if (onClose) onClose();
    else { window.history.pushState(null, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }
  };

  const submitCode = async event => {
    event.preventDefault();
    if (code.length !== 6) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const client = getSupabaseClient();
      if (!client || !isSupabaseConfigured()) throw new Error('Cloud authentication is not configured for this deployment.');
      const { data, error: invokeError } = await client.functions.invoke('authenticator-session', { body: { action: 'login', portal, code } });
      if (invokeError) throw new Error(data?.error || invokeError.message || 'Could not verify the authenticator code.');
      if (data?.error || !data?.accessToken) throw new Error(data?.error || 'The authenticator service returned no session.');
      storeAuthenticatorSession(data.accessToken, portal);
      window.dispatchEvent(new Event('alzino-cloud-auth-ready'));
      setMessage('Code verified. Loading the shop data…');
      await onSuccess?.();
    } catch (err) {
      setError(err.message || 'Invalid authenticator code. Check the current code and try again.');
      setCode(''); codeRef.current?.focus();
    } finally { setBusy(false); }
  };

  const beginSetup = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const client = getSupabaseClient();
      if (!client || !isSupabaseConfigured()) throw new Error('Cloud authentication is not configured.');
      const { data, error: invokeError } = await client.functions.invoke('authenticator-session', { body: { action: 'setup', setupToken } });
      if (invokeError) throw new Error(data?.error || invokeError.message);
      if (data?.error) throw new Error(data.error);
      setSetupData(data);
      setMessage('Scan each QR code with the matching authenticator app. This setup key is shown only once.');
    } catch (err) { setError(err.message || 'Could not initialize authenticator setup.'); }
    finally { setBusy(false); }
  };

  const confirmSetup = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const client = getSupabaseClient();
      const { data, error: invokeError } = await client.functions.invoke('authenticator-session', {
        body: { action: 'confirm-setup', setupToken, adminCode, cashierCode }
      });
      if (invokeError) throw new Error(data?.error || invokeError.message);
      if (data?.error) throw new Error(data.error);
      setSetupData(null); setSetupMode(false); setSetupToken(''); setAdminCode(''); setCashierCode(''); setCode('');
      setMessage('Both authenticator apps are active. Sign in with a fresh code.');
    } catch (err) { setError(err.message || 'Could not verify both authenticator apps.'); }
    finally { setBusy(false); }
  };

  const copy = async (role, secret) => {
    try { await navigator.clipboard.writeText(secret); setCopied(role); setTimeout(() => setCopied(''), 1500); }
    catch { setError('Could not copy the setup key. Select and copy it manually.'); }
  };

  const primary = { width: '100%', padding: '0.75rem 1rem', border: 0, borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', fontWeight: 750, cursor: busy ? 'wait' : 'pointer' };
  const authCodeInput = (value, setter, name) => <input aria-label={`${name} authenticator code`} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={value} onChange={e => setter(e.target.value.replace(/\D/g, '').slice(0, 6))} className="input-field" style={{ ...inputStyle, fontSize: '1.4rem', letterSpacing: '.3em', textAlign: 'center', fontWeight: 800 }} required />;

  return <div className="modal-backdrop no-print" style={{ zIndex: 1200 }}>
    <section className="modal-dialog animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="portal-auth-title" style={{ maxWidth: setupData ? 760 : 460, width: 'min(95vw, 760px)', maxHeight: '92dvh', overflowY: 'auto', padding: 'clamp(1rem, 4vw, 1.5rem)', background: 'var(--surface-card, #FEFDFA)', borderRadius: 14, boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h2 id="portal-auth-title" style={{ margin: 0 }}>{setupData ? 'Set up authenticators' : `${label} Authenticator`}</h2>
        {onClose && <button type="button" className="btn-secondary" aria-label="Close" onClick={close}><X size={16} /></button>}
      </header>
      {error && <p role="alert" style={{ display: 'flex', gap: 8, color: 'var(--status-red)' }}><AlertCircle size={17} />{error}</p>}
      {message && <p role="status" style={{ display: 'flex', gap: 8, color: 'var(--status-green)', lineHeight: 1.45 }}><CheckCircle2 size={17} />{message}</p>}

      {!setupMode && <form onSubmit={submitCode} style={{ display: 'grid', gap: 14, marginTop: 16 }}>
        <label htmlFor="authenticator-code" style={{ fontWeight: 700 }}>Enter 6-digit code from Microsoft Authenticator</label>
        <input ref={codeRef} id="authenticator-code" autoFocus type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="000 000" required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="input-field" style={{ ...inputStyle, fontSize: '1.5rem', letterSpacing: '.35em', textAlign: 'center', fontWeight: 800 }} />
        <button type="submit" className="btn-primary" disabled={busy || code.length !== 6} style={primary}><ShieldCheck size={16} /> {busy ? 'Verifying…' : `Verify & Unlock ${label}`}</button>
      </form>}

      {setupMode && !setupData && <form onSubmit={beginSetup} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <p>Initial setup creates separate admin and cashier authenticator entries. Enter the one-time setup authorization configured on the server.</p>
        <label>One-time setup authorization<input type="password" autoComplete="off" required minLength={32} value={setupToken} onChange={e => setSetupToken(e.target.value)} style={inputStyle} /></label>
        <button className="btn-primary" disabled={busy || setupToken.length < 32} style={primary}>{busy ? 'Preparing…' : 'Generate setup QR codes'}</button>
      </form>}

      {setupData && <form onSubmit={confirmSetup} style={{ display: 'grid', gap: 16, marginTop: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14 }}>
          {['admin', 'cashier'].map(roleName => <article key={roleName} style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>{roleName === 'admin' ? 'Admin' : 'Cashier'} authenticator</h3>
            <p>Scan this code with Microsoft Authenticator.</p>
            {qrUrls[roleName] ? <img src={qrUrls[roleName]} alt={`${roleName} authenticator QR code`} style={{ width: 'min(220px, 65vw)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 6 }} /> : <p>Preparing QR…</p>}
            <p style={{ overflowWrap: 'anywhere' }}>Manual key: <code>{setupData[roleName].secret}</code></p>
            <button type="button" className="btn-secondary" onClick={() => copy(roleName, setupData[roleName].secret)}><Copy size={14} /> {copied === roleName ? 'Copied' : 'Copy setup key'}</button>
          </article>)}
        </div>
        <label>Admin six-digit code{authCodeInput(adminCode, setAdminCode, 'Admin')}</label>
        <label>Cashier six-digit code{authCodeInput(cashierCode, setCashierCode, 'Cashier')}</label>
        <button className="btn-primary" disabled={busy || adminCode.length !== 6 || cashierCode.length !== 6} style={primary}>{busy ? 'Activating…' : 'Verify and activate both authenticators'}</button>
      </form>}

      {setupMode && <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setSetupMode(false); setSetupData(null); setError(''); }} style={{ marginTop: 12 }}>Back to code entry</button>}
      {onClose && <button type="button" className="btn-secondary" disabled={busy} onClick={close} style={{ width: '100%', marginTop: 12 }}>Cancel</button>}
    </section>
  </div>;
}
