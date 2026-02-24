import { NextResponse } from 'next/server';
import { validateSession, getUserRole, type UserRole } from '@/lib/auth/session';

/**
 * Ensures the request has a valid session and the user's role is in the allowed list.
 * Use in admin API routes to enforce role-based access.
 *
 * @param allowedRoles - Roles that may access this API (e.g. ['owner'] or ['owner', 'cook'])
 * @returns On success: { role }. On failure: NextResponse to return (401 Unauthorized or 403 Forbidden)
 */
export async function requireAdminRole(
  allowedRoles: UserRole[]
): Promise<{ role: UserRole } | NextResponse> {
  const valid = await validateSession();
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = await getUserRole();
  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { role };
}
