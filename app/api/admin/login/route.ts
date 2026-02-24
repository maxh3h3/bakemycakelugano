import { NextRequest, NextResponse } from 'next/server';
import { createSession, verifyPassword, type UserRole } from '@/lib/auth/session';

const VALID_ROLES: UserRole[] = ['owner', 'cook', 'delivery'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, role, rememberMe = false } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Valid role is required (owner, cook, delivery)' },
        { status: 400 }
      );
    }

    const validRole = role as UserRole;
    let isValid: boolean;
    try {
      isValid = verifyPassword(password, validRole);
    } catch {
      // Missing env or other error: don't leak details, same response as wrong password
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    await createSession(validRole, rememberMe);

    return NextResponse.json(
      { success: true, message: 'Login successful', role: validRole },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

