import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { NewClient } from '@/lib/db/schema';

/**
 * GET /api/admin/clients
 * List all clients with pagination, search, and sorting
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
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'last_order_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const preferredContact = searchParams.get('preferredContact') || '';

    const offset = (page - 1) * limit;

    // Build query
    let query = (supabaseAdmin as any)
      .from('clients')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Apply preferred contact filter
    if (preferredContact) {
      query = query.eq('preferred_contact', preferredContact);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending, nullsFirst: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      clients: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/clients:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/clients
 * Create a new client manually
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
      name,
      email,
      phone,
      whatsapp,
      instagram_handle,
      preferred_contact,
      notes,
    } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate at least one contact method
    if (!email && !phone && !instagram_handle) {
      return NextResponse.json(
        { success: false, error: 'At least one contact method (email, phone, or Instagram) is required' },
        { status: 400 }
      );
    }

    // Create client - use snake_case for Supabase column names
    const newClient = {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      whatsapp: whatsapp?.trim() || phone?.trim() || null,
      instagram_handle: instagram_handle?.trim() || null,
      preferred_contact: preferred_contact || null,
      notes: notes?.trim() || null,
      total_orders: 0,
      total_spent: '0',
      first_order_date: null,
      last_order_date: null,
    };

    const { data: client, error: createError } = await (supabaseAdmin as any)
      .from('clients')
      .insert(newClient)
      .select()
      .single();

    if (createError) {
      // Check for unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A client with this email or phone already exists' },
          { status: 409 }
        );
      }

      console.error('Error creating client:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create client' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Client created successfully',
        client,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/clients:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
