import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { generateStaffNoteMessage } from '@/lib/telegram/templates/staff-note-notification';

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdminRole(['owner', 'cook']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { itemId, note } = body;

    if (!itemId || !note?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Item ID and note are required' },
        { status: 400 }
      );
    }

    // Fetch current item to get existing notes and order details for the Telegram message
    const { data: item, error: fetchError } = await (supabaseAdmin
      .from('order_items') as any)
      .select('id, order_number, staff_notes, product_name, quantity, weight_kg, flavour_name, writing_on_cake, delivery_date, delivery_type')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    // Append the new note with a timestamp separator
    const timestamp = new Date().toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const newNoteEntry = `[${timestamp}] ${note.trim()}`;
    const updatedNotes = item.staff_notes
      ? `${item.staff_notes}\n${newNoteEntry}`
      : newNoteEntry;

    const { data: updatedItem, error: updateError } = await (supabaseAdmin
      .from('order_items') as any)
      .update({ staff_notes: updatedNotes, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating staff notes:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save note' },
        { status: 500 }
      );
    }

    // Fire Telegram notification — non-blocking, failure must not affect the response
    try {
      const message = generateStaffNoteMessage({
        orderNumber: item.order_number || 'N/A',
        deliveryDate: item.delivery_date,
        deliveryType: item.delivery_type,
        productName: item.product_name,
        quantity: item.quantity,
        weightKg: item.weight_kg,
        flavourName: item.flavour_name,
        writingOnCake: item.writing_on_cake,
        note: note.trim(),
      });
      await sendTelegramMessage({ text: message });
    } catch (telegramError) {
      console.error('Failed to send Telegram notification for staff note:', telegramError);
    }

    return NextResponse.json(
      { success: true, item: updatedItem },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in staff notes update:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
