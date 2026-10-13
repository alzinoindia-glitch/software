import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, KeyRound, Mail, QrCode, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';
import { getActiveOrgId } from '../utils/cloudSyncService';

export default function AdminAuthModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('ALZINO');
  const [shopSlug, setShopSlug] = useState('alzino');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [qrVisible, setQrVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const codeRefs = useRef([]);
  const inspecting = useRef(false);
  const completed = useRef(false);

  const completeAdminAuth = async () => {
    if (completed.current) return;
    completed.current = true;
    window.dispatchEvent(new Event('alzino-cloud-auth-ready'));
    setMessage('Verified. Loading the shop data from cloud…');
    try {
      await onSuccess?.();
    } catch (error) {
      completed.current = false;
      throw error;
    }
  };

  const beginAuthenticatorEnrollment = async (client, oldFactorId) => {
    if (oldFactorId) {
      const { error: removeError } = await client.auth.mfa.unenroll({ factorId: oldFactorId });
      if (removeError) throw removeError;
    }
    const { data, error: enrollError } = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'ALZINO Admin Google Authenticator'
    });
    if (enrollError) throw enrollError;
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setCode('');
    setQrVisible(true);
    setStep('enroll-code');
  };

  const inspectSession = async () => {
    if (inspecting.current) return;
    inspecting.current = true;
    try {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return;
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;
    const { data: assurance } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel === 'aal2') {
      if (await getActiveOrgId(client)) await completeAdminAuth();
      else setStep('setup-shop');
      return;
    }
    const { data: factors } = await client.auth.mfa.listFactors();
    const verified = factors?.totp?.find(item => item.status === 'verified');
    if (verified) {
      setFactorId(verified.id);
      setStep('verify-code');
      setMessage('Enter the current code from Google Authenticator.');
      return;
    }
    const pending = factors?.totp?.find(item => item.status === 'unverified');
    if (pending) {
      // Supabase does not return an existing factor's QR/secret from listFactors.
      // Replace an unfinished enrollment so the setup screen always has a usable QR.
      await beginAuthenticatorEnrollment(client, pending.id);
      return;
    }
    await beginAuthenticatorEnrollment(client);
    } finally {
      inspecting.current = false;
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    completed.current = false;
    setError('');
    const client = getSupabaseClient();
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured for this deployment.');
      return undefined;
    }
    let active = true;
    inspectSession().catch(err => active && setError(err.message || 'Could not check admin sign-in.'));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (session && active) {
        // Defer Supabase queries until the auth event handler returns.
        setTimeout(() => inspectSession().catch(err => active && setError(err.message)), 0);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sendSignInLink = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const client = getSupabaseClient();
      const { error: authError } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin` }
      });
      if (authError) throw authError;
      setStep('sent');
      setMessage('Sign-in link sent. Open it on this device, then set up Google Authenticator if prompted.');
    } catch (err) {
      setError(err.message || 'Could not send sign-in link. Confirm this email has been invited in Supabase Auth.');
    } finally { setBusy(false); }
  };

  const verifyAuthenticatorCode = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const client = getSupabaseClient();
      const { error: verifyError } = await client.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (verifyError) throw verifyError;
      const { data: assurance } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== 'aal2') throw new Error('Authenticator verification did not establish an AAL2 session. Try a fresh code.');
      if (await getActiveOrgId(client)) await completeAdminAuth();
      else setStep('setup-shop');
    } catch (err) {
      setError(err.message || 'That code could not be verified.');
      setCode('');
    } finally { setBusy(false); }
  };

  const initializeShop = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const client = getSupabaseClient();
      const { error: setupError } = await client.rpc('bootstrap_invited_shop', {
        p_name: shopName.trim(),
        p_slug: shopSlug.trim().toLowerCase()
      });
      if (setupError) throw setupError;
      await completeAdminAuth();
    } catch (err) {
      setError(err.message || 'Could not set up the shop.');
    } finally { setBusy(false); }
  };

  const signOut = async () => {
    await getSupabaseClient()?.auth.signOut();
    setStep('email'); setCode(''); setError(''); setMessage('Signed out.');
  };

  const cancelAuthentication = async () => {
    await signOut();
    if (onClose) onClose();
    else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleCodeChange = (index, value) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setCode(current => `${current.slice(0, index)}${current.slice(index + 1)}`);
      return;
    }
    if (digits.length > 1) {
      const pasted = `${code.slice(0, index)}${digits}`.slice(0, 6);
      setCode(pasted);
      codeRefs.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }
    const next = `${code.slice(0, index)}${digits.slice(-1)}${code.slice(index + 1)}`.slice(0, 6);
    setCode(next);
    if (index < 5) codeRefs.current[index + 1]?.focus();
  };

  const handleCodePaste = (event, index = 0) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    const next = `${code.slice(0, index)}${digits}`.slice(0, 6);
    setCode(next);
    codeRefs.current[Math.min(next.length, 5)]?.focus();
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy the setup key. Select and copy it manually.');
    }
  };

  const regenerateSecret = async () => {
    setBusy(true); setError(''); setCode('');
    try {
      await beginAuthenticatorEnrollment(getSupabaseClient(), factorId);
    } catch (err) {
      setError(err.message || 'Could not create a new authenticator setup key.');
    } finally { setBusy(false); }
  };

  const renderCodeInputs = (label) => (
    <div role="group" aria-label={label} style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(0.35rem, 2vw, 0.75rem)', margin: '0.35rem 0 1.2rem' }}>
      {Array.from({ length: 6 }, (_, index) => (
        <input
          key={index}
          ref={node => { codeRefs.current[index] = node; }}
          autoFocus={index === 0}
          aria-label={`${label}, digit ${index + 1}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={1}
          value={code[index] || ''}
          onChange={event => handleCodeChange(index, event.target.value)}
          onPaste={event => handleCodePaste(event, index)}
          onKeyDown={event => {
            if (event.key === 'Backspace' && !code[index] && index > 0) codeRefs.current[index - 1]?.focus();
            if (event.key === 'ArrowLeft' && index > 0) codeRefs.current[index - 1]?.focus();
            if (event.key === 'ArrowRight' && index < 5) codeRefs.current[index + 1]?.focus();
          }}
          style={{ width: 'clamp(2.5rem, 11vw, 3.25rem)', height: 'clamp(3rem, 13vw, 3.75rem)', textAlign: 'center', fontSize: '1.45rem', fontWeight: 750, border: '2px solid var(--border-color)', borderRadius: 10, background: 'var(--surface-primary)', color: 'var(--text-primary)' }}
        />
      ))}
    </div>
  );

  const inputStyle = { width: '100%', padding: '0.7rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' };
  const primaryStyle = { width: '100%', padding: '0.75rem 1rem', border: 0, borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', fontWeight: 750, cursor: busy ? 'wait' : 'pointer' };

  return (
    <div className="modal-backdrop no-print" style={{ zIndex: 1200 }}>
      <section className="modal-dialog animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="admin-auth-title" style={{ maxWidth: 620, width: 'min(94vw, 620px)', maxHeight: '92dvh', overflowY: 'auto', padding: 'clamp(1rem, 4vw, 1.75rem)', background: 'var(--surface-card, #FEFDFA)', borderRadius: 16, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck color="var(--accent-primary)" />
            <div><h2 id="admin-auth-title" style={{ margin: 0, fontSize: '1.05rem' }}>Admin verification</h2><small style={{ color: 'var(--text-secondary)' }}>Google Authenticator required</small></div>
          </div>
          {onClose && <button type="button" aria-label="Close" onClick={onClose} className="btn-secondary"><X size={16} /></button>}
        </div>

        {error && <div role="alert" style={{ display: 'flex', gap: 8, padding: 10, marginBottom: 12, borderRadius: 8, background: 'rgba(211,63,60,.1)', color: 'var(--status-red)' }}><AlertCircle size={17} /><span>{error}</span></div>}
        {message && <p role="status" style={{ display: 'flex', gap: 8, color: 'var(--status-green)', lineHeight: 1.45 }}><CheckCircle2 size={17} />{message}</p>}

        {step === 'email' && <form onSubmit={sendSignInLink} style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.45 }}>Admin accounts are invited by the shop owner in Supabase Auth. We’ll email a one-time sign-in link; new admin devices must verify Google Authenticator.</p>
          <label>Email address<input autoComplete="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} /></label>
          <button style={primaryStyle} disabled={busy}><Mail size={16} /> {busy ? 'Sending…' : 'Email sign-in link'}</button>
        </form>}

        {step === 'sent' && <button type="button" style={primaryStyle} onClick={() => setStep('email')}>Use a different email</button>}

        {step === 'enroll-code' && <form onSubmit={verifyAuthenticatorCode} style={{ display: 'grid', gap: 12 }}>
          <p style={{ textAlign: 'center', margin: '0.25rem 0 0', color: 'var(--text-secondary)' }}>Enter the 6-digit code from Google Authenticator</p>
          {renderCodeInputs('Authenticator setup code')}
          <div style={{ border: '2px solid var(--border-color)', borderRadius: 14, padding: 'clamp(0.85rem, 3vw, 1.4rem)', textAlign: 'center', background: 'var(--surface-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: '1px dashed var(--border-color)', paddingBottom: 12, marginBottom: 12 }}>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><QrCode size={19} /> Scan QR in Google Authenticator</strong>
              <button type="button" className="btn-secondary" onClick={() => setQrVisible(visible => !visible)}>{qrVisible ? 'Hide QR code' : 'Show QR code'}</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0.25rem 0 1rem' }}>Open Google Authenticator on your phone, tap <strong>+</strong>, then scan this QR code.</p>
            {qrVisible && qrCode && <img src={qrCode} alt="Private Google Authenticator setup QR code" style={{ display: 'block', width: 'min(240px, 70vw)', height: 'auto', aspectRatio: '1', margin: '0 auto 1rem', padding: 8, background: '#fff', border: '2px solid var(--border-color)', borderRadius: 12, boxSizing: 'border-box' }} />}
            {secret && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
              <span>Can’t scan? Setup key:</span>
              <code style={{ fontWeight: 750, overflowWrap: 'anywhere', color: 'var(--text-primary)' }}>{secret}</code>
              <button type="button" className="btn-secondary" onClick={copySecret} aria-label="Copy authenticator setup key"><Copy size={15} /> {copied ? 'Copied' : 'Copy'}</button>
            </div>}
            <button type="button" onClick={regenerateSecret} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, border: 0, background: 'transparent', color: 'var(--status-amber, #b7791f)', textDecoration: 'underline', cursor: busy ? 'wait' : 'pointer' }}><RefreshCw size={14} /> Regenerate new secret key</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 10, marginTop: 6 }}>
            <button type="button" className="btn-secondary" onClick={cancelAuthentication} disabled={busy} style={{ minHeight: 48 }}>Cancel</button>
            <button style={{ ...primaryStyle, minHeight: 48 }} disabled={busy || code.length !== 6}><ShieldCheck size={17} /> {busy ? 'Verifying…' : 'Verify & Unlock Admin'}</button>
          </div>
        </form>}

        {step === 'verify-code' && <form onSubmit={verifyAuthenticatorCode} style={{ display: 'grid', gap: 12 }}>
          <p style={{ textAlign: 'center', margin: '0.25rem 0 0', color: 'var(--text-secondary)' }}>Enter your current Google Authenticator code.</p>
          {renderCodeInputs('Authenticator code')}
          <button style={primaryStyle} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify & Unlock Admin'}</button>
        </form>}

        {step === 'setup-shop' && <form onSubmit={initializeShop} style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>This invited admin account will become the shop owner. The first shop setup is allowed only once.</p>
          <label>Shop name<input required value={shopName} onChange={e => setShopName(e.target.value)} style={inputStyle} /></label>
          <label>Shop ID<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={shopSlug} onChange={e => setShopSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} style={inputStyle} /></label>
          <button style={primaryStyle} disabled={busy}><KeyRound size={16} /> {busy ? 'Setting up…' : 'Set up shop and continue'}</button>
        </form>}

        {step !== 'email' && step !== 'sent' && <button type="button" onClick={signOut} className="btn-secondary" style={{ marginTop: 12 }}>Sign out</button>}
      </section>
    </div>
  );
}
