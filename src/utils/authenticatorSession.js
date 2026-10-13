const TOKEN_KEY = 'ALZINO_ERP_AUTHENTICATOR_TOKEN';
const ROLE_KEY = 'ALZINO_ERP_AUTHENTICATOR_PORTAL';
let expiryTimer = null;

const decodeJwtPayload = token => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='));
    return JSON.parse(decodeURIComponent(Array.from(decoded, char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')));
  } catch {
    return null;
  }
};

const getStorage = () => {
  try { return typeof window !== 'undefined' ? window.sessionStorage : null; } catch { return null; }
};

export const getAuthenticatorAccessToken = () => {
  const token = getStorage()?.getItem(TOKEN_KEY) || '';
  const claims = decodeJwtPayload(token);
  if (!token || !claims?.exp || claims.exp <= Math.floor(Date.now() / 1000)) {
    if (token) clearAuthenticatorSession();
    return null;
  }
  return token;
};

export const getAuthenticatorIdentity = () => {
  const token = getAuthenticatorAccessToken();
  if (!token) return null;
  const claims = decodeJwtPayload(token);
  const metadata = claims?.app_metadata || {};
  if (!claims?.sub || !metadata.organization_id || !['admin', 'cashier'].includes(metadata.portal)) return null;
  return {
    id: claims.sub,
    organizationId: metadata.organization_id,
    portal: metadata.portal,
    staffRole: metadata.staff_role,
    expiresAt: claims.exp
  };
};

export const storeAuthenticatorSession = (accessToken, portal) => {
  const storage = getStorage();
  if (!storage || !accessToken || !['admin', 'cashier'].includes(portal)) throw new Error('Could not save the authenticator session.');
  const claims = decodeJwtPayload(accessToken);
  if (!claims?.exp || claims.exp <= Math.floor(Date.now() / 1000) || claims?.app_metadata?.portal !== portal || !claims?.sub || !claims?.app_metadata?.organization_id) {
    throw new Error('The server returned an invalid or expired session. Try a fresh code.');
  }
  storage.setItem(TOKEN_KEY, accessToken);
  storage.setItem(ROLE_KEY, portal);
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => {
    clearAuthenticatorSession();
    window.dispatchEvent(new CustomEvent('alzino-cloud-auth-expired', { detail: { portal } }));
  }, Math.max(0, claims.exp * 1000 - Date.now()));
  window.dispatchEvent(new CustomEvent('alzino-cloud-auth-changed', { detail: { portal } }));
};

export const clearAuthenticatorSession = () => {
  const storage = getStorage();
  storage?.removeItem(TOKEN_KEY);
  storage?.removeItem(ROLE_KEY);
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = null;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('alzino-cloud-auth-changed'));
};

export const getAuthenticatorPortal = () => getStorage()?.getItem(ROLE_KEY) || null;
