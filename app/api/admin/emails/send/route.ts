import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';
import { resend, emailConfig } from '@/lib/resend/client';
import { appendToSent } from '@/lib/email/imap-client';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB per file

interface IncomingAttachment {
  filename: string;
  contentType: string;
  base64: string; // base64-encoded file content from browser
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  const { orderId, to, subject, body, inReplyToMessageId, attachments } = await request.json();
  if (!to || !body) {
    return NextResponse.json({ error: 'to and body required' }, { status: 400 });
  }

  const incomingAttachments: IncomingAttachment[] = attachments || [];

  // Upload each attachment to Supabase Storage and build Resend payload
  const storedAttachments: { name: string; contentType: string; size: number; url: string }[] = [];
  const resendAttachments: { filename: string; content: Buffer }[] = [];

  for (const att of incomingAttachments) {
    const fileBuffer = Buffer.from(att.base64, 'base64');

    if (fileBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: `${att.filename} exceeds 10MB limit` }, { status: 400 });
    }

    const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `outbound/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('email-attachments')
      .upload(storagePath, fileBuffer, { contentType: att.contentType, upsert: false });

    if (uploadError) {
      console.error('[send] Storage upload failed:', uploadError.message);
      return NextResponse.json({ error: `Failed to upload ${att.filename}` }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('email-attachments')
      .getPublicUrl(storagePath);

    storedAttachments.push({
      name: att.filename,
      contentType: att.contentType,
      size: fileBuffer.byteLength,
      url: urlData.publicUrl,
    });

    resendAttachments.push({ filename: att.filename, content: fileBuffer });
  }

  // Send via Resend
  const { data: sent, error: sendError } = await resend.emails.send({
    from: emailConfig.from,
    to,
    subject: subject || 'Re: Bake My Cake',
    text: body,
    headers: inReplyToMessageId
      ? { 'In-Reply-To': inReplyToMessageId, References: inReplyToMessageId }
      : undefined,
    attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
  });

  if (sendError) {
    console.error('[send] Resend error:', sendError);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  // Append to Infomaniak Sent folder so owner sees it in her mail client
  const sentDate = new Date().toUTCString();
  const rawMime = [
    `From: ${emailConfig.from}`,
    `To: ${to}`,
    `Subject: ${subject || 'Re: Bake My Cake'}`,
    `Date: ${sentDate}`,
    inReplyToMessageId ? `In-Reply-To: ${inReplyToMessageId}` : '',
    inReplyToMessageId ? `References: ${inReplyToMessageId}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].filter(Boolean).join('\r\n');

  appendToSent(rawMime).catch(err =>
    console.error('[send] IMAP append failed (non-fatal):', err)
  );

  // Store outbound email with attachment URLs
  await supabaseAdmin.from('order_emails').insert({
    order_id: orderId || null,
    direction: 'outbound',
    from_email: emailConfig.from,
    to_email: to,
    subject: subject || 'Re: Bake My Cake',
    body_text: body,
    resend_id: (sent as any)?.id || null,
    in_reply_to: inReplyToMessageId || null,
    email_date: new Date().toISOString(),
    attachments: storedAttachments,
  } as any);

  return NextResponse.json({ success: true });
}
