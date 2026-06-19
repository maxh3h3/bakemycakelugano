import { NextRequest, NextResponse } from 'next/server';
import { runDailyDigest, runReminders } from '@/lib/notifications/agenda-jobs';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Manual trigger for the agenda jobs. The real schedule runs in-process via
// node-cron in instrumentation.ts (same pattern as email polling); this route
// just lets you fire a run on demand for testing/debugging:
//   GET /api/cron/notifications?type=daily      → send today's digest now
//   GET /api/cron/notifications?type=reminders  → run the reminder sweep now
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type');

  try {
    if (type === 'daily') {
      return NextResponse.json({ success: true, ...(await runDailyDigest()) });
    }
    if (type === 'reminders') {
      return NextResponse.json({ success: true, ...(await runReminders()) });
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
