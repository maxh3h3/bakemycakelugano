import { createHmac, timingSafeEqual } from 'crypto';

const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function secret(): string {
  return process.env.SESSION_SECRET ?? '';
}

export function signBuilderToken(): string {
  const ts = Date.now().toString();
  const mac = createHmac('sha256', secret()).update(ts).digest('hex');
  return `${ts}.${mac}`;
}

export function verifyBuilderToken(token: string | null | undefined): boolean {
  const s = secret();
  if (!s || !token) return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const ts = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > TTL_MS) return false;
  const expected = createHmac('sha256', s).update(ts).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
