// RFC 6238 Time-based One-Time Password (TOTP) & Base32 Implementation
// 100% Offline, runs locally in browser using Web Crypto API.
// Compatible with Google Authenticator, Microsoft Authenticator, and 2FAS.

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Generate a random 16-character Base32 Secret Key
export function generateBase32Secret(length = 16) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[bytes[i] % 32];
  }
  return secret;
}

// Decode Base32 string to Uint8Array
function base32ToBytes(base32) {
  const clean = base32.toUpperCase().replace(/[\s-]/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

// Generate 6-digit TOTP token using native Web Crypto HMAC-SHA1
export async function generateTotpToken(secretBase32, timeStepOffset = 0) {
  try {
    const keyBytes = base32ToBytes(secretBase32);
    if (keyBytes.length === 0) return '';

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const epochSeconds = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epochSeconds / 30) + timeStepOffset;

    // 8-byte big-endian buffer for counter
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(0, 0, false);
    counterView.setUint32(4, counter, false);

    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
    const sigBytes = new Uint8Array(signature);

    const offset = sigBytes[sigBytes.length - 1] & 0x0f;
    const binary =
      ((sigBytes[offset] & 0x7f) << 24) |
      ((sigBytes[offset + 1] & 0xff) << 16) |
      ((sigBytes[offset + 2] & 0xff) << 8) |
      (sigBytes[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  } catch (err) {
    console.error('TOTP generation error:', err);
    return '';
  }
}

// Verify entered 6-digit code (checks window t-1, t, t+1 for clock tolerance)
export async function verifyTotpToken(enteredCode, secretBase32) {
  if (!enteredCode || !secretBase32) return false;
  const cleanEntered = enteredCode.trim().replace(/\s+/g, '');
  if (cleanEntered.length !== 6) return false;

  const offsets = [0, -1, 1];
  for (const offset of offsets) {
    const expected = await generateTotpToken(secretBase32, offset);
    if (expected && expected === cleanEntered) {
      return true;
    }
  }
  return false;
}

// Format otpauth URL for Google Authenticator / Microsoft Authenticator
export function getOtpAuthUri(secretBase32, accountName = 'admin@bodhan', issuer = 'ALZINO ERP') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
