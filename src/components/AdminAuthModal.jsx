import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Mail, ShieldCheck, X } from 'lucide-react';
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
  const inspecting = useRef(false);
  const completed = useRef(false);

  const completeAdminAuth = () => {
    if (completed.current) return;
    completed.current = true;
    window.dispatchEvent(new Event('alzino-cloud-auth-ready'));
    onSuccess?.();
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
      if (await getActiveOrgId(client)) completeAdminAuth();
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
      setFactorId(pending.id);
      setStep('enroll-code');
      return;
    }
    const { data, error: enrollError } = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'ALZINO Admin Google Authenticator'
    });
    if (enrollError) throw enrollError;
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep('enroll-code');
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
      if (await getActiveOrgId(client)) completeAdminAuth();
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
      completeAdminAuth();
    } catch (err) {
      setError(err.message || 'Could not set up the shop.');
    } finally { setBusy(false); }
  };

  const signOut = async () => {
    await getSupabaseClient()?.auth.signOut();
    setStep('email'); setCode(''); setError(''); setMessage('Signed out.');
  };

  const inputStyle = { width: '100%', padding: '0.7rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' };
  const primaryStyle = { width: '100%', padding: '0.75rem 1rem', border: 0, borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', fontWeight: 750, cursor: busy ? 'wait' : 'pointer' };

  return (
    <div className="modal-backdrop no-print" style={{ zIndex: 1200 }}>
      <section className="modal-dialog animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="admin-auth-title" style={{ maxWidth: 440, width: '92%', padding: '1.25rem', background: 'var(--surface-card, #FEFDFA)', borderRadius: 14 }}>
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
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.45 }}>Scan this QR code with Google Authenticator, then enter its 6-digit code.</p>
          {qrCode && <img src={qrCode} alt="Google Authenticator setup QR code" style={{ width: 190, height: 190, margin: '0 auto', padding: 10, background: '#fff', borderRadius: 8 }} />}
          {secret && <details><summary>Can’t scan? Show setup key</summary><code style={{ display: 'block', overflowWrap: 'anywhere' }}>{secret}</code></details>}
          <label>6-digit authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={inputStyle} /></label>
          <button style={primaryStyle} disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify and enable admin access'}</button>
        </form>}

        {step === 'verify-code' && <form onSubmit={verifyAuthenticatorCode} style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Enter the current 6-digit code from Google Authenticator.</p>
          <label>Authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={inputStyle} /></label>
          <button style={primaryStyle} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify admin access'}</button>
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
