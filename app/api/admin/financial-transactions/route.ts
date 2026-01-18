import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { createManualRevenue } from '@/lib/accounting/transactions';

/**
 * POST /api/admin/financial-transactions
 * Create a manual financial transaction (revenue entry without an order)
 * Used for bulk revenue entries like Divoraa monthly totals, restaurant invoices, etc.
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      date,
      amount,
      description,
      client_id,
      payment_method,
      channel,
      notes,
      created_by_user_id,
    } = body;

    // Validate required fields
    if (!date || !amount || !description) {
      return NextResponse.json(
        { success: false, error: 'Date, amount, and description are required' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Create manual revenue entry
    const result = await createManualRevenue({
      date,
      amount: parseFloat(amount),
      description: description.trim(),
      clientId: client_id || null,
      paymentMethod: payment_method || null,
      channel: channel || 'other',
      notes: notes?.trim() || null,
      createdByUserId: created_by_user_id || null,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to create revenue entry' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Revenue entry created successfully',
        transaction: result.data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/financial-transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
