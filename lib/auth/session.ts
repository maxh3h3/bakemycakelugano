import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  isAdmin: boolean;
  rememberMe: boolean;
  createdAt: number;
  expiresAt: number;
}

// Validate SESSION_SECRET on startup
if (!process.env.SESSION_SECRET) {
  throw new Error(
    '❌ SESSION_SECRET environment variable is not set. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

if (process.env.SESSION_SECRET.length < 32) {
  throw new Error(
    `❌ SESSION_SECRET must be at least 32 characters long (current: ${process.env.SESSION_SECRET.length}). ` +
    'This is an iron-session requirement for secure encryption. ' +
    'Generate a new one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

// Session configuration
const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'bmc_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  },
};

// Get session from cookies
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Create a new admin session
export async function createSession(rememberMe: boolean = true): Promise<void> {
  const session = await getSession();
  const now = Date.now();
  const expirationDays = rememberMe ? 7 : 1; // 7 days if remembered, 1 day otherwise
  const expiresAt = now + expirationDays * 24 * 60 * 60 * 1000;

  session.isAdmin = true;
  session.rememberMe = rememberMe;
  session.createdAt = now;
  session.expiresAt = expiresAt;

  await session.save();
}

// Validate if session is still valid
export async function validateSession(): Promise<boolean> {
  const session = await getSession();

  if (!session.isAdmin) {
    return false;
  }

  // Check if session has expired
  if (session.expiresAt && Date.now() > session.expiresAt) {
    await destroySession();
    return false;
  }

  return true;
}

// Destroy the session (logout)
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

// Verify password against environment variable
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    throw new Error(
      '❌ ADMIN_PASSWORD environment variable is not set. ' +
      'Set this to your desired login password (can be any length, e.g., 6+ characters).'
    );
  }

  // Note: ADMIN_PASSWORD can be any length you want (e.g., 6 characters)
  // Don't confuse this with SESSION_SECRET which must be 32+ characters
  return password === adminPassword;
}

