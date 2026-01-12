import { NextRequest, NextResponse } from 'next/server';
import { createSession, verifyPassword, verifyAdminPassword, type UserRole } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, role, rememberMe = false } = body;

    // Validate required fields
    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // Support both old (admin) and new (role-based) login
    let validRole: UserRole;
    let isValid: boolean;

    if (role) {
      // New role-based login
      if (!['owner', 'cook', 'delivery'].includes(role)) {
        return NextResponse.json(
          { success: false, error: 'Invalid role' },
          { status: 400 }
        );
      }
      validRole = role as UserRole;
      isValid = verifyPassword(password, validRole);
    } else {
      // Legacy admin login (maps to owner)
      validRole = 'owner';
      isValid = verifyAdminPassword(password);
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Create session with role
    await createSession(validRole, rememberMe);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Login successful',
        role: validRole 
      },
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

