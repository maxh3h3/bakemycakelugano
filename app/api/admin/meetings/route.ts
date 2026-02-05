import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { findOrCreateClient } from '@/lib/clients/utils';

// GET all meetings
export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch meetings with client details
    const { data: meetings, error } = await supabaseAdmin
      .from('meetings')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone,
          whatsapp,
          instagram_handle
        )
      `)
      .order('meeting_date', { ascending: true })
      .order('meeting_time', { ascending: true });

    if (error) {
      console.error('Error fetching meetings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch meetings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      meetings: meetings || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/meetings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new meeting
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      meeting_date,
      meeting_time,
      client_id,
      customer_name,
      customer_email,
      customer_phone,
      customer_ig_handle,
      channel,
    } = body;

    // Validate required fields
    if (!meeting_date || !meeting_time) {
      return NextResponse.json(
        { success: false, error: 'Meeting date and time are required' },
        { status: 400 }
      );
    }

    // Determine final client_id
    let finalClientId: string | null = null;

    if (client_id) {
      // Use provided client_id
      finalClientId = client_id;
    } else if (customer_name) {
      // Auto-create or find client based on contact info
      try {
        const { client } = await findOrCreateClient(
          {
            name: customer_name,
            email: customer_email || null,
            phone: customer_phone || null,
            whatsapp: customer_phone || null,
            instagramHandle: customer_ig_handle || null,
          },
          channel || 'phone'
        );
        finalClientId = client.id;
        console.log('Auto-created/found client for meeting:', finalClientId);
      } catch (clientError) {
        console.error('Failed to create/find client:', clientError);
        // Continue without client - it's optional for meetings
      }
    }

    // Create meeting
    const { data: meeting, error } = await supabaseAdmin
      .from('meetings')
      .insert({
        meeting_date,
        meeting_time,
        client_id: finalClientId,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating meeting:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create meeting' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Meeting created successfully',
        meeting,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/meetings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
