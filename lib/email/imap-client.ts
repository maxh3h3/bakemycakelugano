import { ImapFlow } from 'imapflow';

export interface FetchedEmail {
  uid: number;
  messageId: string | null;
  inReplyTo: string | null;
  from: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  date: Date;
  attachments: AttachmentMeta[];
}

const SKIP_SENDER_PATTERNS = [
  /^no-?reply@/i,
  /^mailer-daemon@/i,
  /^postmaster@/i,
  /^noreply@/i,
  /@infomaniak\.com$/i,
  /^do-not-reply@/i,
  /^bounce[+@]/i,
];

function shouldSkipSender(from: string): boolean {
  if (!from) return true;
  return SKIP_SENDER_PATTERNS.some(p => p.test(from));
}

function getImapClient(): ImapFlow {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASSWORD;
  if (!host || !user || !pass) throw new Error('Missing IMAP_HOST, IMAP_USER, IMAP_PASSWORD');
  return new ImapFlow({
    host,
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: { user, pass },
    logger: false,
  });
}

function findPartNumber(node: any, mimeType: string): string | null {
  if (!node) return null;
  if (node.type === mimeType && node.part) return node.part;
  if (node.childNodes) {
    for (const child of node.childNodes) {
      const found = findPartNumber(child, mimeType);
      if (found) return found;
    }
  }
  return null;
}

export interface AttachmentMeta {
  name: string;
  contentType: string;
  size: number;
  part: string;
  uid: number;
  url: string | null; // null until downloaded to storage
}

function collectAttachments(node: any, uid: number, out: AttachmentMeta[] = []): AttachmentMeta[] {
  if (!node) return out;
  const isAttachment = node.disposition === 'attachment' || node.disposition === 'inline';
  const isMedia = node.type?.startsWith('image/') || node.type === 'application/pdf';
  if (isAttachment && isMedia && node.part) {
    out.push({
      name: node.dispositionParameters?.filename || node.parameters?.name || `attachment-${node.part}`,
      contentType: node.type,
      size: node.size || 0,
      part: node.part,
      uid,
      url: null,
    });
  }
  if (node.childNodes) {
    for (const child of node.childNodes) collectAttachments(child, uid, out);
  }
  return out;
}

async function fetchBodyParts(client: ImapFlow, uid: number): Promise<{
  textBody: string;
  htmlBody: string;
  attachments: AttachmentMeta[];
}> {
  let textBody = '';
  let htmlBody = '';

  const meta = await client.fetchOne(`${uid}`, { bodyStructure: true }, { uid: true });
  if (!meta) return { textBody, htmlBody, attachments: [] };

  const attachments = collectAttachments(meta.bodyStructure, uid);

  for (const [part, key] of [
    [findPartNumber(meta.bodyStructure, 'text/plain'), 'text'],
    [findPartNumber(meta.bodyStructure, 'text/html'), 'html'],
  ] as [string | null, string][]) {
    if (!part) continue;
    try {
      const buf = await client.download(`${uid}`, part, { uid: true });
      if (!buf?.content) continue;
      const chunks: Buffer[] = [];
      for await (const chunk of buf.content) chunks.push(chunk as Buffer);
      const decoded = Buffer.concat(chunks).toString('utf-8');
      if (key === 'text') textBody = decoded;
      else htmlBody = decoded;
    } catch { /* part unavailable */ }
  }

  if (!textBody && htmlBody) {
    textBody = htmlBody
      .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n').trim();
  }

  return { textBody, htmlBody, attachments };
}

/**
 * Appends a raw MIME message to the Infomaniak Sent folder so the owner
 * sees outbound messages sent via Resend in her own mail client.
 */
export async function appendToSent(rawMime: string): Promise<void> {
  if (!process.env.IMAP_HOST || !process.env.IMAP_PASSWORD) {
    console.warn('[appendToSent] skipped — IMAP env vars not set');
    return;
  }
  const client = getImapClient();
  await client.connect();
  try {
    // imapflow returns a BigInt UID which may throw on serialization — the append itself succeeds
    await client.append('Sent', Buffer.from(rawMime), ['\\Seen']).catch((err: Error) => {
      if (!err.message.includes('BigInt')) throw err;
    });
  } finally {
    await client.logout();
  }
}

/**
 * Fetches emails received in the last WINDOW_MINUTES from INBOX.
 * Skips system/no-reply senders. Deduplication happens in the DB via message_id UNIQUE.
 */
const WINDOW_MINUTES = 5;

export async function fetchRecentEmails(): Promise<FetchedEmail[]> {
  const client = getImapClient();
  const emails: FetchedEmail[] = [];
  const bakeryEmail = (process.env.BAKERY_OWNER_EMAIL || 'info@bakemycakelugano.ch').toLowerCase();
  const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const candidates: { uid: number; from: string; to: string; subject: string; messageId: string | null; inReplyTo: string | null; date: Date }[] = [];

      for await (const msg of client.fetch({ since: today }, { envelope: true }, { uid: true })) {
        const emailDate = msg.envelope?.date || new Date(0);
        if (emailDate < cutoff) continue;
        const fromAddr = (msg.envelope?.from?.[0]?.address || '').toLowerCase();
        if (fromAddr === bakeryEmail || shouldSkipSender(fromAddr)) continue;
        candidates.push({
          uid: msg.uid,
          from: msg.envelope?.from?.[0]?.address || '',
          to: msg.envelope?.to?.[0]?.address || '',
          subject: msg.envelope?.subject || '(no subject)',
          messageId: (msg.envelope as any)?.messageId || null,
          inReplyTo: (msg.envelope as any)?.inReplyTo || null,
          date: emailDate,
        });
      }

      for (const env of candidates) {
        try {
          const { textBody, htmlBody, attachments } = await fetchBodyParts(client, env.uid);
          emails.push({ ...env, textBody, htmlBody, attachments });
        } catch (err) {
          console.error(`[imap] UID ${env.uid} failed:`, err);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return emails;
}
