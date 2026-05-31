/**
 * Standalone IMAP connection test — run with:
 *   node scripts/test-imap.mjs
 *
 * Does NOT modify any emails or create any orders.
 * Just connects, lists unseen messages, and exits.
 */

import { ImapFlow } from 'imapflow';

const IMAP_HOST = process.env.IMAP_HOST || 'mail.infomaniak.com';
const IMAP_PORT = parseInt(process.env.IMAP_PORT || '993');
const IMAP_USER = process.env.IMAP_USER || 'info@bakemycakelugano.ch';
const IMAP_PASSWORD = process.env.IMAP_PASSWORD;

const client = new ImapFlow({
  host: IMAP_HOST,
  port: IMAP_PORT,
  secure: true,
  auth: { user: IMAP_USER, pass: IMAP_PASSWORD },
  logger: { debug(){}, info(){}, warn: m => console.warn('IMAP WARN:', m), error: m => console.error('IMAP ERROR:', m) },
});

console.log(`\nConnecting to ${IMAP_HOST}:${IMAP_PORT} as ${IMAP_USER}...\n`);

try {
  await client.connect();
  console.log('✅ Connected successfully\n');

  const lock = await client.getMailboxLock('INBOX');
  try {
    const status = await client.status('INBOX', { messages: true, unseen: true });
    console.log(`📬 Inbox: ${status.messages} total, ${status.unseen} unseen\n`);

    const unseen = [];
    for await (const msg of client.fetch({ seen: false }, { envelope: true }, { uid: true })) {
      unseen.push({
        uid: msg.uid,
        subject: msg.envelope.subject || '(no subject)',
        from: msg.envelope.from?.[0]?.address || '(unknown)',
        date: msg.envelope.date,
      });
    }

    if (unseen.length === 0) {
      console.log('📭 No unseen messages found.\n');
    } else {
      console.log(`📨 ${unseen.length} unseen message(s):\n`);
      for (const m of unseen) {
        console.log(`  UID ${m.uid} | From: ${m.from}`);
        console.log(`           | Subject: ${m.subject}`);
        console.log(`           | Date: ${m.date}\n`);
      }
    }
  } finally {
    lock.release();
  }

  await client.logout();
  console.log('✅ Disconnected cleanly\n');
} catch (err) {
  console.error('\n❌ Error:', err.message);
  console.error('\nCommon causes:');
  console.error('  - Wrong password');
  console.error('  - IMAP not enabled in Infomaniak settings');
  console.error('  - Firewall blocking port 993\n');
  process.exit(1);
}
