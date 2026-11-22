import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAuthenticatorSession, getAuthenticatorIdentity, needsAuthenticatorLogin } from '../src/utils/authenticatorSession.js';

const tokenFor = (portal, expiresAt = Math.floor(Date.now() / 1000) + 300) => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({
    sub: 'staff-1',
    exp: expiresAt,
    app_metadata: { portal, organization_id: 'shop-1', staff_role: 'admin' }
  })}.signature`;
};

const installWindow = (token, portal) => {
  const values = new Map([
    ['ALZINO_ERP_AUTHENTICATOR_TOKEN', token],
    ['ALZINO_ERP_AUTHENTICATOR_PORTAL', portal]
  ]);
  globalThis.window = {
    sessionStorage: {
      getItem: key => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key)
    },
    dispatchEvent: () => true,
    _values: values
  };
  return globalThis.window;
};

test('valid saved admin session does not require login after a page reload', t => {
  const previousWindow = globalThis.window;
  t.after(() => { clearAuthenticatorSession(); if (previousWindow) globalThis.window = previousWindow; else delete globalThis.window; });
  installWindow(tokenFor('admin'), 'admin');
  assert.equal(getAuthenticatorIdentity()?.portal, 'admin');
  assert.equal(needsAuthenticatorLogin('admin'), false);
  assert.equal(needsAuthenticatorLogin('cashier'), true);
});

test('expired saved session is cleared and requires fresh authentication', t => {
  const previousWindow = globalThis.window;
  t.after(() => { clearAuthenticatorSession(); if (previousWindow) globalThis.window = previousWindow; else delete globalThis.window; });
  const fakeWindow = installWindow(tokenFor('admin', Math.floor(Date.now() / 1000) - 1), 'admin');
  assert.equal(getAuthenticatorIdentity(), null);
  assert.equal(needsAuthenticatorLogin('admin'), true);
  assert.equal(fakeWindow.sessionStorage.getItem('ALZINO_ERP_AUTHENTICATOR_TOKEN'), null);
});

test('a valid cashier session is reused only for the cashier portal', t => {
  const previousWindow = globalThis.window;
  t.after(() => { clearAuthenticatorSession(); if (previousWindow) globalThis.window = previousWindow; else delete globalThis.window; });
  installWindow(tokenFor('cashier'), 'cashier');
  assert.equal(needsAuthenticatorLogin('cashier'), false);
  assert.equal(needsAuthenticatorLogin('admin'), true);
});
