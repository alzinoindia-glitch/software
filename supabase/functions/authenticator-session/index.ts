import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';

const PROJECT_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SESSION_API_KEY = Deno.env.get('SUPABASE_ANON_KEY') || SERVICE_KEY;
const SETUP_TOKEN = Deno.env.get('AUTH_SETUP_TOKEN') || '';
const CODE_WINDOW = 1;
const supabase = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store, max-age=0'
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
});

const encoder = new TextEncoder();
const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function randomBase32(length = 32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, byte => alphabet[byte & 31]).join('');
}

function randomPassword() {
  return base64Url(crypto.getRandomValues(new Uint8Array(48))) + 'aA1!';
}

function base32ToBytes(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = value.toUpperCase().replace(/=+$/g, '').replace(/[\s-]/g, '');
  let bits = '';
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid authenticator secret.');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(parseInt(bits.slice(offset, offset + 8), 2));
  }
  return new Uint8Array(bytes);
}

function equalCode(left: string, right: string) {
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    mismatch |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

async function totpAt(secret: string, counter: number) {
  const key = await crypto.subtle.importKey(
    'raw', base32ToBytes(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const data = new Uint8Array(8);
  new DataView(data.buffer).setBigUint64(0, BigInt(counter), false);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

async function verifyTotp(code: string, secret: string) {
  if (!/^\d{6}$/.test(code)) return null;
  const counter = Math.floor(Date.now() / 30_000);
  for (let delta = -CODE_WINDOW; delta <= CODE_WINDOW; delta += 1) {
    const step = counter + delta;
    if (equalCode(await totpAt(secret, step), code)) return step;
  }
  return null;
}

function toOtpAuth(secret: string, account: string) {
  const label = encodeURIComponent(`ALZINO ERP:${account}`);
  const issuer = encodeURIComponent('ALZINO ERP');
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

async function issueSupabaseSession(userId: string, organizationId: string, portal: 'admin' | 'cashier', staffRole: string) {
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  const user = userData?.user;
  if (userError || !user?.email) throw userError || new Error('Authenticator identity is unavailable.');

  // The service role marks this user as TOTP-verified immediately before
  // Supabase Auth issues its own signed session. This avoids a customer-managed
  // JWT signing key while keeping the browser-facing database access protected
  // by Supabase Auth and RLS.
  const appMetadata = {
    ...(user.app_metadata || {}),
    provider: 'email',
    providers: ['email'],
    portal,
    organization_id: organizationId,
    staff_role: staffRole,
    totp_verified_at: String(Math.floor(Date.now() / 1000))
  };
  const { error: metadataError } = await supabase.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
  if (metadataError) throw metadataError;

  // Generate and immediately exchange the one-time link hash server-side. No
  // email is sent or shown to the staff member; this only asks Supabase Auth
  // to mint the short-lived session required by the RLS-protected Data API.
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) throw linkError || new Error('Could not create a protected database session.');

  const sessionClient = createClient(PROJECT_URL, SESSION_API_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data: sessionData, error: sessionError } = await sessionClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink'
  });
  if (sessionError || !sessionData.session?.access_token || sessionData.session.user.id !== userId) {
    throw sessionError || new Error('Supabase did not return a valid staff session.');
  }
  return {
    accessToken: sessionData.session.access_token,
    expiresAt: sessionData.session.expires_at,
    portal
  };
}

async function ensureInternalUser(email: string, fullName: string) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const existing = listed.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) return existing;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { full_name: fullName, managed_by: 'alzino-authenticator' }
  });
  if (error || !data.user) throw error || new Error('Could not create the internal staff identity.');
  return data.user;
}

async function setupAuthenticator() {
  if (!SETUP_TOKEN) return json({ error: 'One-time authenticator setup is not configured.' }, 503);
  const { data: existing, error: credentialsError } = await supabase
    .from('authenticator_credentials').select('portal, secret, is_active').in('portal', ['admin', 'cashier']);
  if (credentialsError) throw credentialsError;
  if (existing?.some(row => row.is_active)) return json({ error: 'Authenticator setup has already been completed.' }, 409);
  if (existing?.length === 2 && existing.some(row => row.portal === 'admin') && existing.some(row => row.portal === 'cashier')) {
    const admin = existing.find(row => row.portal === 'admin')!;
    const cashier = existing.find(row => row.portal === 'cashier')!;
    return json({ setup: true, admin: { uri: toOtpAuth(admin.secret, 'admin'), secret: admin.secret }, cashier: { uri: toOtpAuth(cashier.secret, 'cashier'), secret: cashier.secret } });
  }
  if (existing?.length) return json({ error: 'Authenticator setup is incomplete. Contact the system administrator before retrying.' }, 409);

  const { data: orgs, error: orgReadError } = await supabase.from('organizations').select('id, name').limit(2);
  if (orgReadError) throw orgReadError;
  if ((orgs || []).length > 1) return json({ error: 'More than one shop exists. Contact the system administrator.' }, 409);
  let organizationId = orgs?.[0]?.id;
  if (!organizationId) {
    const { data: org, error } = await supabase.from('organizations')
      .insert({ name: 'ALZINO', slug: 'alzino' }).select('id').single();
    if (error || !org) throw error || new Error('Could not initialize the ALZINO shop.');
    organizationId = org.id;
  }

  const admin = await ensureInternalUser('authenticator-admin@alzino.invalid', 'ALZINO Admin');
  const cashier = await ensureInternalUser('authenticator-cashier@alzino.invalid', 'ALZINO Cashier');
  const { error: profileError } = await supabase.from('profiles').upsert([
    { id: admin.id, organization_id: organizationId, full_name: 'ALZINO Admin', role: 'admin', is_active: true },
    { id: cashier.id, organization_id: organizationId, full_name: 'ALZINO Cashier', role: 'manager', is_active: true }
  ], { onConflict: 'id' });
  if (profileError) throw profileError;

  const credentials = [
    { portal: 'admin', user_id: admin.id, secret: randomBase32(), is_active: false },
    { portal: 'cashier', user_id: cashier.id, secret: randomBase32(), is_active: false }
  ];
  const { error: insertError } = await supabase.from('authenticator_credentials').insert(credentials);
  if (insertError) throw insertError;
  return json({
    setup: true,
    admin: { uri: toOtpAuth(credentials[0].secret, 'admin'), secret: credentials[0].secret },
    cashier: { uri: toOtpAuth(credentials[1].secret, 'cashier'), secret: credentials[1].secret }
  });
}

async function isAttemptAllowed(bucketHash: string) {
  const { data, error } = await supabase.rpc('take_authenticator_login_attempt', { p_bucket_hash: bucketHash });
  if (error) throw error;
  return data === true;
}

async function clearAttempts(bucketHash: string) {
  const { error } = await supabase.rpc('clear_authenticator_login_attempt', { p_bucket_hash: bucketHash });
  if (error) throw error;
}

async function confirmSetup(adminCode: string, cashierCode: string, request: Request) {
  const adminBucket = await clientBucketHash(request, 'setup-admin');
  const cashierBucket = await clientBucketHash(request, 'setup-cashier');
  const [adminAllowed, cashierAllowed] = await Promise.all([
    isAttemptAllowed(adminBucket), isAttemptAllowed(cashierBucket)
  ]);
  if (!adminAllowed || !cashierAllowed) return json({ error: 'Too many setup attempts. Wait 15 minutes and try again.' }, 429);
  const { data: rows, error } = await supabase.from('authenticator_credentials')
    .select('portal, secret, is_active').in('portal', ['admin', 'cashier']);
  if (error) throw error;
  const admin = rows?.find(row => row.portal === 'admin');
  const cashier = rows?.find(row => row.portal === 'cashier');
  if (!admin || !cashier || admin.is_active || cashier.is_active) {
    return json({ error: 'Authenticator setup is unavailable or already completed.' }, 409);
  }
  const [adminStep, cashierStep] = await Promise.all([
    verifyTotp(adminCode, admin.secret), verifyTotp(cashierCode, cashier.secret)
  ]);
  if (adminStep === null || cashierStep === null) {
    return json({ error: 'One or both authenticator codes are invalid. Check both apps and try again.' }, 401);
  }
  const { data: activated, error: updateError } = await supabase.rpc('activate_authenticator_credentials', {
    p_admin_step: adminStep,
    p_cashier_step: cashierStep
  });
  if (updateError) throw updateError;
  if (!activated) return json({ error: 'Authenticator setup could not be activated. Restart setup and scan both codes again.' }, 409);
  await Promise.all([clearAttempts(adminBucket), clearAttempts(cashierBucket)]);
  return json({ setup: true, confirmed: true });
}

async function clientBucketHash(request: Request, portal: string) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(`${portal}:${ip}`)));
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

async function login(portal: 'admin' | 'cashier', code: string, request: Request) {
  const bucketHash = await clientBucketHash(request, portal);
  if (!await isAttemptAllowed(bucketHash)) return json({ error: 'Too many attempts. Wait 15 minutes and try again.' }, 429);

  const { data: credential, error: credentialError } = await supabase.from('authenticator_credentials')
    .select('portal, user_id, secret, is_active').eq('portal', portal).maybeSingle();
  if (credentialError) throw credentialError;
  const matchedStep = credential?.is_active ? await verifyTotp(code, credential.secret) : null;
  if (!credential?.is_active || matchedStep === null) {
    return json({ error: 'Invalid authenticator code. Check the current code and try again.' }, 401);
  }

  const { data: consumed, error: consumeError } = await supabase.rpc('consume_authenticator_step', {
    p_portal: portal,
    p_step: matchedStep
  });
  if (consumeError) throw consumeError;
  if (!consumed) return json({ error: 'That code was already used. Wait for the next code and try again.' }, 401);

  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('id, organization_id, role, is_active')
    .eq('id', credential.user_id).maybeSingle();
  if (profileError) throw profileError;
  const expectedRole = portal === 'admin' ? 'admin' : 'manager';
  if (!profile?.is_active || !profile.organization_id || profile.role !== expectedRole) {
    return json({ error: 'This authenticator is not linked to an active shop account.' }, 403);
  }

  const session = await issueSupabaseSession(profile.id, profile.organization_id, portal, profile.role);
  await clearAttempts(bucketHash);
  return json(session);
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const origin = request.headers.get('origin');
  if (origin && !['https://alzino.shop', 'https://www.alzino.shop', 'http://localhost:5173'].includes(origin)) {
    return json({ error: 'Origin not allowed.' }, 403);
  }
  try {
    const body = await request.json();
    if (body.action === 'setup') {
      if (!SETUP_TOKEN || typeof body.setupToken !== 'string' || !equalCode(body.setupToken, SETUP_TOKEN)) {
        return json({ error: 'Invalid setup authorization.' }, 401);
      }
      return await setupAuthenticator();
    }
    if (body.action === 'confirm-setup') {
      if (!SETUP_TOKEN || typeof body.setupToken !== 'string' || !equalCode(body.setupToken, SETUP_TOKEN)) {
        return json({ error: 'Invalid setup authorization.' }, 401);
      }
      return await confirmSetup(String(body.adminCode || '').replace(/\D/g, ''), String(body.cashierCode || '').replace(/\D/g, ''), request);
    }
    if (body.action === 'login') {
      if (!['admin', 'cashier'].includes(body.portal)) return json({ error: 'Choose a valid portal.' }, 400);
      return await login(body.portal, String(body.code || '').replace(/\D/g, ''), request);
    }
    return json({ error: 'Unsupported authenticator action.' }, 400);
  } catch (error) {
    console.error('[authenticator-session]', error instanceof Error ? error.message : 'Unknown failure');
    return json({ error: 'Authenticator service is temporarily unavailable.' }, 500);
  }
});
