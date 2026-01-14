import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * PUT /api/admin/expenses/[id]
 * Update an existing expense
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      date,
      category,
      amount,
      currency,
      description,
      notes,
      receipt_url,
    } = body;

    // Validate required fields
    if (!date || !category || !amount || !description) {
      return NextResponse.json(
        { success: false, error: 'Date, category, amount, and description are required' },
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

    // Validate category
    const validCategories = ['ingredients', 'utilities', 'labor', 'supplies', 'marketing', 'rent', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if expense exists
    const { data: existingExpense, error: fetchError } = await (supabaseAdmin as any)
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingExpense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Update expense
    const updates = {
      date,
      category,
      amount: parseFloat(amount).toFixed(2),
      currency: currency || 'CHF',
      description: description.trim(),
      notes: notes?.trim() || null,
      receipt_url: receipt_url || null,
      updated_at: new Date().toISOString(),
    };

    const { data: expense, error: updateError } = await (supabaseAdmin as any)
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating expense:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update expense' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      expense,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/expenses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/expenses/[id]
 * Delete an expense
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if expense exists
    const { data: existingExpense, error: fetchError } = await (supabaseAdmin as any)
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingExpense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Delete expense
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('expenses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting expense:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete expense' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/expenses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
