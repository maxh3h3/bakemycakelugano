import { supabaseAdmin } from '@/lib/supabase/server';
import { sendTelegramMessage } from '@/lib/telegram/client';
import type { FetchedEmail } from './imap-client';

/** Which of these Message-IDs are already in order_emails. Throws on DB error. */
export async function knownMessageIds(messageIds: string[]): Promise<Set<string>> {
  const known = new Set<string>();
  for (let i = 0; i < messageIds.length; i += 100) {
    const { data, error } = await (supabaseAdmin as any)
      .from('order_emails')
      .select('message_id')
      .in('message_id', messageIds.slice(i, i + 100));
    if (error) throw new Error(`[store-email] known ids lookup failed: ${error.message}`);
    for (const row of data ?? []) known.add(row.message_id);
  }
  return known;
}

const NOTIFY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Stores one synced email (either half). Pings Telegram only for customer
 * emails from the last 24 h, so catch-ups and backfills stay quiet.
 */
export async function storeEmail(email: FetchedEmail): Promise<'stored' | 'duplicate' | 'error'> {
  const { error } = await supabaseAdmin.from('order_emails').insert({
    direction: email.direction,
    from_email: email.from,
    to_email: email.to,
    subject: email.subject,
    body_text: email.textBody,
    body_html: email.htmlBody,
    message_id: email.messageId,
    in_reply_to: email.inReplyTo,
    email_date: email.date.toISOString(),
    order_id: null,
    attachments: email.attachments ?? [],
  } as any);

  if (error) {
    if (error.code === '23505') return 'duplicate';
    console.error('[store-email] Insert failed:', error.message);
    return 'error';
  }

  if (email.direction === 'inbound' && Date.now() - email.date.getTime() < NOTIFY_MAX_AGE_MS) {
    await sendTelegramMessage({
      text: `📧 <b>Новое письмо</b>\n👤 ${email.from}\n💬 ${email.subject}`,
      parse_mode: 'HTML',
    });
  }

  return 'stored';
}
