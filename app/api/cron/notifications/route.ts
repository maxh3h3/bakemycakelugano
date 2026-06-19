import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendTelegramMessage } from '@/lib/telegram/client';
import {
  generateDailyDigestMessage,
  generateMeetingReminderMessage,
  generateDeliveryReminderMessage,
  type AgendaMeeting,
  type AgendaDelivery,
} from '@/lib/telegram/templates/agenda';
import type { DeliveryAddress } from '@/lib/schemas/delivery';

export const runtime = 'nodejs';
export const maxDuration = 60;

// The bakery operates on Milan time. The server (Railway) runs in UTC, and
// meeting_time / delivery_time are stored as local wall-clock text ("14:30").
// CET observes DST, so we resolve local wall-clock via Intl (timezone-aware)
// rather than a fixed offset.
const TIMEZONE = 'Europe/Rome';

// How far ahead the hourly job looks. The cron only fires once an hour, so we
// remind about anything starting within the next ~2 hours that hasn't been
// reminded yet — this guarantees ~1h notice without exact-time scheduling.
const REMINDER_WINDOW_MINUTES = 120;

// Milan-local hour at which the daily digest should be sent. The hourly
// reminders job self-gates on this so the 08:00 digest works on a UTC-only
// scheduler (e.g. Railway) without DST drift — see ?type=reminders below.
const DIGEST_HOUR = 8;

/** Current Milan-local date (YYYY-MM-DD) and minutes-since-midnight. */
function localNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const hour = parseInt(get('hour'), 10) % 24; // some runtimes emit "24" at midnight
  const minutes = hour * 60 + parseInt(get('minute'), 10);
  return { date, minutes };
}

/** Parse a "14:30"-style time to minutes-of-day, or null if not a clock time. */
function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const match = time.match(/^\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** True if `timeMinutes` falls in [now, now + window]. */
function isUpcoming(timeMinutes: number | null, nowMinutes: number): boolean {
  if (timeMinutes === null) return false;
  return timeMinutes >= nowMinutes && timeMinutes <= nowMinutes + REMINDER_WINDOW_MINUTES;
}

// ── Daily 08:00 digest ──────────────────────────────────────────────
async function runDailyDigest(today: string) {
  const [meetings, deliveries] = await Promise.all([
    fetchMeetings(today),
    fetchDeliveries(today),
  ]);

  const sent = await sendTelegramMessage({
    text: generateDailyDigestMessage(today, meetings, deliveries),
  });

  return { type: 'daily', meetings: meetings.length, deliveries: deliveries.length, sent };
}

// ── Hourly "~1 hour prior" reminders ────────────────────────────────
async function runReminders(today: string, nowMinutes: number) {
  let meetingReminders = 0;
  let deliveryReminders = 0;

  // Meetings not yet reminded, happening today
  const { data: meetingRows } = await (supabaseAdmin as any)
    .from('meetings')
    .select('id, meeting_time, reminder_sent_at, clients ( name, phone )')
    .eq('meeting_date', today)
    .is('reminder_sent_at', null);

  for (const row of meetingRows ?? []) {
    if (!isUpcoming(parseTimeToMinutes(row.meeting_time), nowMinutes)) continue;
    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
    const meeting: AgendaMeeting = {
      meeting_time: row.meeting_time,
      client_name: client?.name ?? null,
      client_phone: client?.phone ?? null,
    };
    const ok = await sendTelegramMessage({ text: generateMeetingReminderMessage(meeting) });
    if (ok) {
      await (supabaseAdmin as any)
        .from('meetings')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', row.id);
      meetingReminders++;
    }
  }

  // Deliveries/pickups not yet reminded, happening today
  const { data: orderRows } = await (supabaseAdmin as any)
    .from('orders')
    .select('id, order_number, customer_name, delivery_type, delivery_time, delivery_address, delivery_reminder_sent_at')
    .eq('delivery_date', today)
    .is('delivery_reminder_sent_at', null)
    .not('status', 'in', '(cancelled,completed)');

  for (const row of orderRows ?? []) {
    if (!isUpcoming(parseTimeToMinutes(row.delivery_time), nowMinutes)) continue;
    const delivery: AgendaDelivery = {
      order_number: row.order_number,
      customer_name: row.customer_name,
      delivery_type: row.delivery_type,
      delivery_time: row.delivery_time,
      delivery_address: row.delivery_address as DeliveryAddress | null,
    };
    const ok = await sendTelegramMessage({ text: generateDeliveryReminderMessage(delivery) });
    if (ok) {
      await (supabaseAdmin as any)
        .from('orders')
        .update({ delivery_reminder_sent_at: new Date().toISOString() })
        .eq('id', row.id);
      deliveryReminders++;
    }
  }

  return { type: 'reminders', meetingReminders, deliveryReminders };
}

// ── Shared fetch helpers (used by the digest) ───────────────────────
async function fetchMeetings(today: string): Promise<AgendaMeeting[]> {
  const { data } = await (supabaseAdmin as any)
    .from('meetings')
    .select('meeting_time, clients ( name, phone )')
    .eq('meeting_date', today)
    .order('meeting_time', { ascending: true });

  return (data ?? []).map((row: any) => {
    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
    return {
      meeting_time: row.meeting_time,
      client_name: client?.name ?? null,
      client_phone: client?.phone ?? null,
    };
  });
}

async function fetchDeliveries(today: string): Promise<AgendaDelivery[]> {
  const { data } = await (supabaseAdmin as any)
    .from('orders')
    .select('order_number, customer_name, delivery_type, delivery_time, delivery_address')
    .eq('delivery_date', today)
    .not('status', 'in', '(cancelled,completed)')
    .order('delivery_time', { ascending: true });

  return (data ?? []).map((row: any) => ({
    order_number: row.order_number,
    customer_name: row.customer_name,
    delivery_type: row.delivery_type,
    delivery_time: row.delivery_time,
    delivery_address: row.delivery_address as DeliveryAddress | null,
  }));
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type');
  const { date: today, minutes: nowMinutes } = localNow();

  try {
    if (type === 'daily') {
      return NextResponse.json({ success: true, ...(await runDailyDigest(today)) });
    }
    if (type === 'reminders') {
      const reminders = await runReminders(today, nowMinutes);

      // DST-proof daily digest: when this hourly run lands in the 08:xx Milan
      // hour, also send the digest. This avoids needing a timezone-aware cron.
      // (If you instead use a TZ-aware scheduler, drive the digest via
      // ?type=daily and this gate simply never matches.)
      let digest = null;
      if (Math.floor(nowMinutes / 60) === DIGEST_HOUR) {
        digest = await runDailyDigest(today);
      }

      return NextResponse.json({ success: true, ...reminders, digest });
    }
    return NextResponse.json(
      { error: 'Missing or invalid ?type= (use "daily" or "reminders")' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ notifications cron failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
