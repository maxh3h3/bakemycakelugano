import { NextRequest, NextResponse } from 'next/server';
import { fetchNewEmails } from '@/lib/email/imap-client';
import { storeInboundEmail } from '@/lib/email/store-email';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let stored = 0, duplicates = 0, errors = 0;

  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get('days')) || 3, 1), 90);
  const emails = await fetchNewEmails(days);

  for (const email of emails) {
    const result = await storeInboundEmail(email);
    if (result === 'stored') stored++;
    else if (result === 'duplicate') duplicates++;
    else errors++;
  }

  return NextResponse.json({
    success: true,
    fetched: emails.length,
    stored,
    duplicates,
    errors,
    duration: Date.now() - startTime,
  });
}
