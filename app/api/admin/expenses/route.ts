import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/admin/expenses
 * List expenses from financial_transactions with filtering, pagination, and date range support
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const category = searchParams.get('category') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build query for expense transactions
    let query = (supabaseAdmin as any)
      .from('financial_transactions')
      .select('*', { count: 'exact' })
      .eq('type', 'expense'); // Only get expenses

    // Apply category filter
    if (category) {
      query = query.eq('expense_category', category);
    }

    // Apply date range filter
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch expenses' },
        { status: 500 }
      );
    }

    // Transform to match old Expense type for backward compatibility
    const expenses = data?.map((t: any) => ({
      id: t.id,
      date: t.date,
      category: t.expense_category,
      amount: t.amount,
      currency: t.currency,
      description: t.description,
      receiptUrl: t.receipt_url,
      createdByUserId: t.created_by_user_id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    return NextResponse.json({
      success: true,
      expenses: expenses || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/expenses
 * Create a new expense as a financial transaction
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
      category,
      amount,
      currency,
      description,
      receipt_url,
      created_by_user_id,
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
    const validCategories = ['ingredients', 'utilities', 'labor', 'supplies', 'marketing', 'rent', 'equipment', 'delivery', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Create expense transaction
    const newTransaction = {
      type: 'expense',
      date,
      amount: parseFloat(amount).toFixed(2),
      currency: currency || 'CHF',
      description: description.trim(),
      source_type: 'manual',
      source_id: null,
      client_id: null,
      payment_method: null,
      channel: null,
      expense_category: category,
      receipt_url: receipt_url || null,
      created_by_user_id: created_by_user_id || null,
    };

    const { data: transaction, error: createError } = await (supabaseAdmin as any)
      .from('financial_transactions')
      .insert(newTransaction)
      .select()
      .single();

    if (createError) {
      console.error('Error creating expense transaction:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create expense' },
        { status: 500 }
      );
    }

    // Transform back to Expense format for compatibility
    const expense = {
      id: transaction.id,
      date: transaction.date,
      category: transaction.expense_category,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      receiptUrl: transaction.receipt_url,
      createdByUserId: transaction.created_by_user_id,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Expense created successfully',
        expense,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
