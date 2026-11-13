import { ImapFlow } from 'imapflow';
import { knownMessageIds } from './store-email';

export interface FetchedEmail {
  uid: number;
  direction: Direction;
  messageId: string;
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

/**
 * IMAP part number of a body node. A single-part message (no multipart
 * wrapper, e.g. a plain HTML reply from bluewin or Gmail) is a root node with
 * no `part` from imapflow, but IMAP addresses its body as part "1". Missing
 * this stored ~10% of inbound emails with an empty body.
 */
function partNumber(node: any, isRoot: boolean): string | null {
  return node.part || (isRoot && !node.childNodes ? '1' : null);
}

function findPartNumber(node: any, mimeType: string, isRoot = true): string | null {
  if (!node) return null;
  if (node.type === mimeType && node.disposition !== 'attachment') {
    const part = partNumber(node, isRoot);
    if (part) return part;
  }
  for (const child of node.childNodes ?? []) {
    const found = findPartNumber(child, mimeType, false);
    if (found) return found;
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

function collectAttachments(node: any, uid: number, out: AttachmentMeta[] = [], isRoot = true): AttachmentMeta[] {
  if (!node) return out;
  const isAttachment = node.disposition === 'attachment' || node.disposition === 'inline';
  const isMedia = node.type?.startsWith('image/') || node.type === 'application/pdf';
  const part = partNumber(node, isRoot);
  if (isAttachment && isMedia && part) {
    out.push({
      name: node.dispositionParameters?.filename || node.parameters?.name || `attachment-${part}`,
      contentType: node.type,
      size: node.size || 0,
      part,
      uid,
      url: null,
    });
  }
  for (const child of node.childNodes ?? []) collectAttachments(child, uid, out, false);
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
 * Re-reads the body and attachment list of stored emails by Message-ID, for
 * repairing rows saved with a missing body. Returns only the ones found.
 */
export async function refetchBodies(
  mailbox: 'INBOX' | 'Sent',
  messageIds: string[],
): Promise<Map<string, { textBody: string; htmlBody: string; attachments: AttachmentMeta[] }>> {
  const found = new Map<string, { textBody: string; htmlBody: string; attachments: AttachmentMeta[] }>();
  const client = getImapClient();
  await client.connect();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      for (const messageId of messageIds) {
        const uids = await client.search({ header: { 'message-id': messageId } }, { uid: true });
        if (!uids || uids.length === 0) continue;
        found.set(messageId, await fetchBodyParts(client, uids[0]));
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
  return found;
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
 * The two halves of every conversation: what customers send (INBOX) and what
 * the bakery sends (Sent), whichever app it was written in.
 */
export const MAILBOXES = {
  INBOX: 'inbound',
  Sent: 'outbound',
} as const;
export type Mailbox = keyof typeof MAILBOXES;
export type Direction = (typeof MAILBOXES)[Mailbox];

/**
 * Fetches emails that arrived in `mailbox` in the last `lookbackDays` and are
 * not yet in order_emails.
 *
 * The window is wide on purpose: a message is picked up on any run until it is
 * stored, so slow delivery (Outlook/greylisting), a wrong sender clock or the
 * poller being down (deploy, IMAP login failing) no longer loses it. SINCE uses
 * the server's arrival date, not the sender's Date header.
 */
export async function fetchNewEmails(mailbox: Mailbox, lookbackDays = 3): Promise<FetchedEmail[]> {
  const direction = MAILBOXES[mailbox];
  const client = getImapClient();
  const emails: FetchedEmail[] = [];
  const bakeryEmail = (process.env.BAKERY_OWNER_EMAIL || 'info@bakemycakelugano.ch').toLowerCase();
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  await client.connect();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const uidValidity = client.mailbox ? String(client.mailbox.uidValidity) : '0';
      const candidates: Omit<FetchedEmail, 'textBody' | 'htmlBody' | 'attachments'>[] = [];

      for await (const msg of client.fetch({ since }, { envelope: true }, { uid: true })) {
        const from = (msg.envelope?.from?.[0]?.address || '').toLowerCase();
        const to = (msg.envelope?.to?.[0]?.address || '').toLowerCase();
        let messageId = msg.envelope?.messageId || null;

        if (direction === 'inbound') {
          if (from === bakeryEmail || shouldSkipSender(from)) continue;
          // A few senders omit Message-ID; a stable stand-in keeps dedup working.
          messageId ??= `<imap-${uidValidity}-${msg.uid}@bakemycakelugano.ch>`;
        } else {
          if (!to || to === bakeryEmail) continue;
          // Every mail app sets a Message-ID. Copies without one are admin-UI
          // sends appended before UI sends carried an ID; those rows exist.
          if (!messageId) continue;
        }

        candidates.push({
          uid: msg.uid,
          direction,
          from,
          to,
          subject: msg.envelope?.subject || '(no subject)',
          messageId,
          inReplyTo: msg.envelope?.inReplyTo || null,
          date: msg.envelope?.date || new Date(),
        });
      }

      // Only download bodies for messages we have not stored yet.
      const known = await knownMessageIds(candidates.map(c => c.messageId));

      for (const env of candidates.filter(c => !known.has(c.messageId))) {
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
