import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';
import { ImapFlow } from 'imapflow';
import type { AttachmentMeta } from '@/lib/email/imap-client';

function getImapClient() {
  return new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: { user: process.env.IMAP_USER!, pass: process.env.IMAP_PASSWORD! },
    logger: false,
  });
}

// POST /api/admin/emails/attachments
// Body: { emailId }  — the order_emails.id UUID
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  const { emailId } = await request.json();
  if (!emailId) return NextResponse.json({ error: 'emailId required' }, { status: 400 });

  // Load current attachment metadata
  const { data: emailRow, error } = await supabaseAdmin
    .from('order_emails')
    .select('id, attachments')
    .eq('id', emailId)
    .single();

  if (error || !emailRow) return NextResponse.json({ error: 'Email not found' }, { status: 404 });

  const metas: AttachmentMeta[] = (emailRow as any).attachments || [];
  const pending = metas.filter(a => !a.url);

  if (pending.length === 0) return NextResponse.json({ attachments: metas });

  // Connect to IMAP and download pending attachments
  const client = getImapClient();
  await client.connect();

  const updated = [...metas];

  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      for (const att of pending) {
        try {
          const buf = await client.download(`${att.uid}`, att.part, { uid: true });
          if (!buf?.content) continue;

          const chunks: Buffer[] = [];
          for await (const chunk of buf.content) chunks.push(chunk as Buffer);
          const fileBuffer = Buffer.concat(chunks);

          // Sanitize filename
          const safeName = att.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `${emailId}/${safeName}`;

          const { error: uploadError } = await supabaseAdmin.storage
            .from('email-attachments')
            .upload(storagePath, fileBuffer, {
              contentType: att.contentType,
              upsert: true,
            });

          if (uploadError) {
            console.error(`[attachments] Upload failed for ${att.name}:`, uploadError.message);
            continue;
          }

          const { data: urlData } = supabaseAdmin.storage
            .from('email-attachments')
            .getPublicUrl(storagePath);

          const idx = updated.findIndex(a => a.part === att.part && a.uid === att.uid);
          if (idx !== -1) updated[idx] = { ...updated[idx], url: urlData.publicUrl };

          console.log(`[attachments] Uploaded ${att.name} → ${urlData.publicUrl}`);
        } catch (err) {
          console.error(`[attachments] Failed to download ${att.name}:`, err);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  // Persist updated attachment URLs
  await (supabaseAdmin as any)
    .from('order_emails')
    .update({ attachments: updated })
    .eq('id', emailId);

  return NextResponse.json({ attachments: updated });
}
