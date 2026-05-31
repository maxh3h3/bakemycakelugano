import { supabaseAdmin } from '@/lib/supabase/server';
import { sendTelegramMessage } from '@/lib/telegram/client';
import type { FetchedEmail } from './imap-client';

export async function storeInboundEmail(email: FetchedEmail): Promise<'stored' | 'duplicate' | 'error'> {
  if (!email.messageId) return 'error';

  const { error } = await supabaseAdmin.from('order_emails').insert({
    direction: 'inbound',
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

  await sendTelegramMessage({
    text: `📧 <b>Новое письмо</b>\n👤 ${email.from}\n💬 ${email.subject}`,
    parse_mode: 'HTML',
  });

  return 'stored';
}
