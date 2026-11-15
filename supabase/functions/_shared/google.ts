export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
// openid + email dipakai hanya untuk menampilkan akun Google mana yang terhubung.
export const GOOGLE_SCOPES = ['openid', 'email', CALENDAR_SCOPE];

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Secret ${name} belum diatur di Supabase.`);
  return value;
}

export function callbackUrl(): string {
  return `${requiredEnv('SUPABASE_URL')}/functions/v1/google-calendar-callback`;
}

/* ---------- State OAuth bertanda tangan (mencegah CSRF dan open redirect) ---------- */

export interface StatePayload {
  uid: string;
  origin: string;
  exp: number;
  n: string;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(requiredEnv('GOOGLE_STATE_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signState(payload: StatePayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await hmacKey(), encoder.encode(body)),
  );
  return `${body}.${toBase64Url(signature)}`;
}

export async function verifyState(state: string): Promise<StatePayload | null> {
  const [body, signature] = state.split('.');
  if (!body || !signature) return null;
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      fromBase64Url(signature),
      encoder.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as StatePayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ---------- Token Google ---------- */

export class GoogleAuthRevokedError extends Error {
  constructor() {
    super('Akses Google Calendar dicabut atau sudah kedaluwarsa.');
    this.name = 'GoogleAuthRevokedError';
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  expires_in: number;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: callbackUrl(),
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Gagal menukar kode Google: ${data.error_description ?? data.error ?? res.status}`);
  }
  return data as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === 'invalid_grant') throw new GoogleAuthRevokedError();
    throw new Error(`Gagal memperbarui token Google: ${data.error_description ?? data.error ?? res.status}`);
  }
  return data.access_token as string;
}

export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch (e) {
    console.warn('Gagal mencabut token Google (diabaikan):', e);
  }
}

/** id_token diterima langsung dari Google lewat TLS, jadi payload-nya aman dibaca tanpa verifikasi ulang. */
export function emailFromIdToken(idToken?: string): string | null {
  try {
    const payload = idToken?.split('.')[1];
    if (!payload) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return typeof data.email === 'string' ? data.email : null;
  } catch {
    return null;
  }
}
