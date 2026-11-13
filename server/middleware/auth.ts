import { Router, type Request, type Response, type NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

const AUTH_USERNAME = process.env.AUTH_USERNAME;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

if (!AUTH_USERNAME || !AUTH_PASSWORD) {
  throw new Error('AUTH_USERNAME and AUTH_PASSWORD must be set in the environment');
}

// Session cookie: "<expiresAtMs>.<hmac>". The HMAC key is derived from the
// password, so changing AUTH_PASSWORD invalidates every outstanding cookie and
// no extra secret needs to be configured. Expiry is fixed at login (no sliding).
const COOKIE_NAME = 'lp_session';
const MAX_AGE_SECONDS = 21 * 24 * 60 * 60; // 3 weeks
const KEY = createHmac('sha256', 'claude-launchpad-session').update(AUTH_PASSWORD).digest();

function sign(expiresAt: number): string {
  return createHmac('sha256', KEY).update(String(expiresAt)).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function isValidToken(token: string | null): boolean {
  if (!token) return false;
  const [expiresRaw, sig] = token.split('.');
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || !sig) return false;
  return safeEqual(sig, sign(expiresAt)) && expiresAt > Date.now();
}

function cookieAttributes(maxAge: number): string {
  return `Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isValidToken(readCookie(req, COOKIE_NAME))) {
    next();
    return;
  }
  res.status(401).json({ error: 'Not authenticated' });
}

// Public routes, mounted before requireAuth.
export const loginRouter = Router();

loginRouter.post('/login', (req, res) => {
  const { username, password } = (req.body ?? {}) as { username?: unknown; password?: unknown };
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    !safeEqual(username, AUTH_USERNAME) ||
    !safeEqual(password, AUTH_PASSWORD)
  ) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${expiresAt}.${sign(expiresAt)}; ${cookieAttributes(MAX_AGE_SECONDS)}`);
  res.json({ ok: true });
});

loginRouter.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; ${cookieAttributes(0)}`);
  res.json({ ok: true });
});
