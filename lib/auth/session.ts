import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'crypto';

export type UserRole = 'owner' | 'cook' | 'delivery';

export interface SessionData {
  isLoggedIn: boolean;
  role: UserRole | null;
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

// Create a new session with role
export async function createSession(role: UserRole, rememberMe: boolean = true): Promise<void> {
  const session = await getSession();
  const now = Date.now();
  const expirationDays = rememberMe ? 7 : 1; // 7 days if remembered, 1 day otherwise
  const expiresAt = now + expirationDays * 24 * 60 * 60 * 1000;

  session.isLoggedIn = true;
  session.role = role;
  session.rememberMe = rememberMe;
  session.createdAt = now;
  session.expiresAt = expiresAt;

  await session.save();
}

// Validate if session is still valid
export async function validateSession(): Promise<boolean> {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return false;
  }

  // Check if session has expired
  if (session.expiresAt && Date.now() > session.expiresAt) {
    await destroySession();
    return false;
  }

  return true;
}

// Get current user role
export async function getUserRole(): Promise<UserRole | null> {
  const session = await getSession();
  return session.role ?? null;
}

// Check if user has specific role
export async function hasRole(role: UserRole): Promise<boolean> {
  const userRole = await getUserRole();
  return userRole === role;
}

// Check if user is owner (has full access)
export async function isOwner(): Promise<boolean> {
  return await hasRole('owner');
}

// Destroy the session (logout)
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

// Verify password and role
export function verifyPassword(password: string, role: UserRole): boolean {
  let correctPassword: string | undefined;
  
  switch (role) {
    case 'owner':
      correctPassword = process.env.OWNER_PASSWORD;
      break;
    case 'cook':
      correctPassword = process.env.COOK_PASSWORD;
      break;
    case 'delivery':
      correctPassword = process.env.DELIVERY_PASSWORD;
      break;
    default:
      return false;
  }
  
  if (!correctPassword) {
    throw new Error(
      `❌ ${role.toUpperCase()}_PASSWORD environment variable is not set. ` +
      `Add ${role.toUpperCase()}_PASSWORD=your_password to .env.local`
    );
  }

  // Constant-time comparison to prevent timing attacks
  const a = createHash('sha256').update(password).digest();
  const b = createHash('sha256').update(correctPassword).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

