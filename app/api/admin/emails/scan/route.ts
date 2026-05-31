import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';
import { ImapFlow } from 'imapflow';

function getImapClient() {
  return new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: { user: process.env.IMAP_USER!, pass: process.env.IMAP_PASSWORD! },
    logger: false,
  });
}

function collectAttachments(node: any, uid: number, out: any[] = []): any[] {
  if (!node) return out;
  const isAttachment = node.disposition === 'attachment' || node.disposition === 'inline';
  const isMedia = node.type?.startsWith('image/') || node.type === 'application/pdf';
  if (isAttachment && isMedia && node.part) {
    out.push({
      name: node.dispositionParameters?.filename || node.parameters?.name || `file-${node.part}`,
      contentType: node.type,
      size: node.size || 0,
      part: node.part,
      uid,
      url: null,
    });
  }
  if (node.childNodes) for (const c of node.childNodes) collectAttachments(c, uid, out);
  return out;
}

// POST /api/admin/emails/scan — scans IMAP for attachment metadata for a stored email
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  const { emailId } = await request.json();
  if (!emailId) return NextResponse.json({ error: 'emailId required' }, { status: 400 });

  const { data: emailRow } = await (supabaseAdmin as any)
    .from('order_emails')
    .select('id, message_id, direction')
    .eq('id', emailId)
    .single();

  if (!emailRow?.message_id) return NextResponse.json({ attachments: [] });

  const client = getImapClient();
  await client.connect();

  let attachments: any[] = [];

  try {
    // Search in INBOX for inbound, Sent for outbound
    const folder = emailRow.direction === 'outbound' ? 'Sent' : 'INBOX';
    const lock = await client.getMailboxLock(folder);
    try {
      // imapflow can search by header
      for await (const msg of client.fetch(
        { header: { 'message-id': emailRow.message_id } } as any,
        { bodyStructure: true },
        { uid: true }
      )) {
        attachments = collectAttachments(msg.bodyStructure, msg.uid);
        break; // only need the first match
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  // Update the DB row with the found metadata
  if (attachments.length > 0) {
    await (supabaseAdmin as any)
      .from('order_emails')
      .update({ attachments })
      .eq('id', emailId);
  }

  return NextResponse.json({ attachments, found: attachments.length });
}
