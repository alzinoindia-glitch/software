import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';

const getAdminProfile = async (client, shopName) => {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) throw new Error('Your sign-in session expired. Please sign in again.');

  let { data: profile, error } = await client
    .from('profiles')
    .select('organization_id, role, is_active')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;

  if (!profile) {
    const { error: setupError } = await client.rpc('bootstrap_invited_shop', {
      p_name: shopName || 'ALZINO',
      p_slug: 'alzino-bodhan'
    });
    if (setupError) throw setupError;
    const result = await client.from('profiles')
      .select('organization_id, role, is_active')
      .eq('id', user.id)
      .maybeSingle();
    profile = result.data;
    error = result.error;
  }
  if (error) throw error;
  if (!profile?.is_active || profile.role !== 'admin' || !profile.organization_id) {
    throw new Error('This invited account is not an active shop administrator.');
  }
};

export default function PinAccessModal({ isOpen, role = 'admin', onClose, onSuccess, shopName = 'ALZINO' }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('checking');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const admin = role === 'admin';

  const finishAdminSignIn = useCallback(async client => {
    await getAdminProfile(client, shopName);
    window.dispatchEvent(new Event('alzino-cloud-auth-ready'));
    await onSuccess?.();
  }, [onSuccess, shopName]);

  const continueSignedInAdmin = useCallback(async (client, session) => {
    if (!session?.user) {
      setStep('email');
      return;
    }
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw assuranceError;
    if (assurance?.currentLevel === 'aal2') {
      await finishAdminSignIn(client);
      return;
    }

    const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
    if (factorsError) throw factorsError;
    const verified = factors?.totp?.find(factor => factor.status === 'verified');
    if (verified) {
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: verified.id });
      if (challengeError) throw challengeError;
      setFactorId(verified.id);
      setChallengeId(challenge.id);
      setStep('verify');
      return;
    }

    const pending = factors?.all?.find(factor => factor.factor_type === 'totp' && factor.status === 'unverified');
    if (pending) {
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: pending.id });
      if (challengeError) throw challengeError;
      setFactorId(pending.id);
      setChallengeId(challenge.id);
      setStep('enroll');
      return;
    }

    const { data: enrollment, error: enrollmentError } = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'ALZINO Admin'
    });
    if (enrollmentError) throw enrollmentError;
    setFactorId(enrollment.id);
    setQrCode(enrollment.totp.qr_code);
    setManualSecret(enrollment.totp.secret);
    setStep('enroll');
  }, [finishAdminSignIn]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    setError('');
    if (!admin) {
      setStep('cashier');
      return undefined;
    }
    if (!isSupabaseConfigured()) {
      setStep('email');
      setError('Cloud sign-in is not configured on this deployment.');
      return undefined;
    }
    setStep('checking');
    const client = getSupabaseClient();
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) throw sessionError;
      return continueSignedInAdmin(client, data.session);
    }).catch(err => {
      if (!active) return;
      setError(err.message || 'Could not verify the admin session.');
      setStep('email');
    });
    return () => { active = false; };
  }, [isOpen, admin, continueSignedInAdmin]);

  const handleEmailSubmit = async event => {
    event.preventDefault();
    if (!admin) return;
    setBusy(true);
    setError('');
    try {
      const client = getSupabaseClient();
      if (!client) throw new Error('Cloud sign-in is not configured on this deployment.');
      const { error: signInError } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`
        }
      });
      if (signInError) throw signInError;
      setStep('sent');
    } catch (err) {
      setError(err.message || 'Could not send the sign-in link.');
    } finally {
      setBusy(false);
    }
  };

  const handleTotpSubmit = async event => {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client || !factorId) return;
    setBusy(true);
    setError('');
    try {
      let currentChallengeId = challengeId;
      if (!currentChallengeId) {
        const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId });
        if (challengeError) throw challengeError;
        currentChallengeId = challenge.id;
        setChallengeId(challenge.id);
      }
      const { error: verifyError } = await client.auth.mfa.verify({ factorId, challengeId: currentChallengeId, code: code.trim() });
      if (verifyError) throw verifyError;
      if (step === 'enroll') {
        const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assuranceError) throw assuranceError;
        if (assurance?.currentLevel !== 'aal2') throw new Error('Authenticator verification did not complete. Try the latest 6-digit code.');
      }
      await finishAdminSignIn(client);
    } catch (err) {
      setError(err.message || 'That authenticator code could not be verified.');
      setCode('');
      setChallengeId('');
    } finally {
      setBusy(false);
    }
  };

  const handleCashierSubmit = async event => {
    event.preventDefault();
    if (code !== '4848') {
      setError('Incorrect cashier PIN.');
      setCode('');
      return;
    }
    setBusy(true);
    setError('');
    try { await onSuccess?.(); } catch (err) {
      setError(err.message || 'Could not open the cashier portal.');
      setBusy(false);
    }
  };

  const close = () => {
    setEmail('');
    setCode('');
    setError('');
    if (onClose) onClose();
    else {
      const client = getSupabaseClient();
      client?.auth.signOut();
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  if (!isOpen) return null;
  const qrSrc = qrCode.startsWith('data:') ? qrCode : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode)}`;

  return (
    <div className="modal-backdrop no-print" style={{ zIndex: 1200 }}>
      <section className="modal-dialog animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="portal-auth-title" style={{ maxWidth: 440, width: '92%', padding: '1.25rem', background: 'var(--surface-card, #FEFDFA)', borderRadius: 14, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 id="portal-auth-title" style={{ marginTop: 0 }}>{admin ? 'Admin sign-in' : 'Cashier PIN'}</h2>
          {onClose && <button type="button" className="btn-secondary" aria-label="Close" onClick={close}><X size={16} /></button>}
        </div>
        {!admin ? (
          <>
            <p style={{ color: 'var(--text-secondary)' }}>Enter the 4-digit cashier PIN to open the counter.</p>
            {error && <p role="alert" style={{ color: 'var(--status-red)' }}>{error}</p>}
            <form onSubmit={handleCashierSubmit} style={{ display: 'grid', gap: 12 }}>
              <input autoFocus aria-label="Cashier PIN" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))} className="input-field" />
              <button className="btn-primary" type="submit" disabled={busy || code.length !== 4}><KeyRound size={16} />{busy ? 'Opening…' : 'Unlock cashier'}</button>
            </form>
          </>
        ) : (
          <>
            {step === 'checking' && <p style={{ color: 'var(--text-secondary)' }}>Checking your secure admin session…</p>}
            {step === 'email' && <>
              <p style={{ color: 'var(--text-secondary)' }}>Sign in with the email invited to manage this shop. Admin access requires Google Authenticator.</p>
              <form onSubmit={handleEmailSubmit} style={{ display: 'grid', gap: 12 }}>
                <label htmlFor="admin-email">Invited admin email</label>
                <input id="admin-email" aria-label="Invited admin email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="input-field" />
                <button className="btn-primary" type="submit" disabled={busy || !email.trim()}><ShieldCheck size={16} />{busy ? 'Sending…' : 'Email sign-in link'}</button>
              </form>
            </>}
            {step === 'sent' && <div role="status"><p>Check {email} for the sign-in link, then return here to continue setup.</p><button type="button" className="btn-secondary" onClick={() => setStep('email')}>Use a different email</button></div>}
            {step === 'enroll' && <>
              <p style={{ color: 'var(--text-secondary)' }}>Scan this QR code in Google Authenticator, then enter the current 6-digit code.</p>
              {qrCode && <img src={qrSrc} alt="Google Authenticator setup QR code" style={{ display: 'block', width: 200, height: 200, margin: '0 auto 12px', background: '#fff' }} />}
              {manualSecret && <p style={{ overflowWrap: 'anywhere' }}>Setup key: <strong>{manualSecret}</strong></p>}
              <form onSubmit={handleTotpSubmit} style={{ display: 'grid', gap: 12 }}>
                <label htmlFor="admin-totp">Authenticator code</label>
                <input id="admin-totp" autoFocus aria-label="Authenticator code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="input-field" />
                <button className="btn-primary" type="submit" disabled={busy || code.length !== 6}><ShieldCheck size={16} />{busy ? 'Verifying…' : 'Verify and open admin'}</button>
              </form>
            </>}
            {step === 'verify' && <>
              <p style={{ color: 'var(--text-secondary)' }}>Enter the current 6-digit code from Google Authenticator.</p>
              <form onSubmit={handleTotpSubmit} style={{ display: 'grid', gap: 12 }}>
                <label htmlFor="admin-totp">Authenticator code</label>
                <input id="admin-totp" autoFocus aria-label="Authenticator code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="input-field" />
                <button className="btn-primary" type="submit" disabled={busy || code.length !== 6}><ShieldCheck size={16} />{busy ? 'Verifying…' : 'Verify and open admin'}</button>
              </form>
            </>}
            {error && <p role="alert" style={{ color: 'var(--status-red)' }}>{error}</p>}
          </>
        )}
      </section>
    </div>
  );
}
