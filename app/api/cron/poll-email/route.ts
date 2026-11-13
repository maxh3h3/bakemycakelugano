import { NextRequest, NextResponse } from 'next/server';
import { syncMailboxes } from '@/lib/email/sync';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Manual trigger / backfill: GET with x-cron-secret, optional ?days=1..365
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get('days')) || 3, 1), 365);
  const counts = await syncMailboxes(days);

  return NextResponse.json({ success: true, days, counts, duration: Date.now() - startTime });
}
