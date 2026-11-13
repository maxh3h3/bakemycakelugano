import { fetchNewEmails, MAILBOXES, type Mailbox } from './imap-client';
import { storeEmail } from './store-email';

export type SyncCounts = Record<Mailbox, { stored: number; duplicates: number; errors: number }>;

/**
 * Syncs both halves of every conversation (INBOX → inbound, Sent → outbound)
 * for the last `lookbackDays`. Throws if a mailbox cannot be read.
 */
export async function syncMailboxes(lookbackDays: number): Promise<SyncCounts> {
  const counts = {} as SyncCounts;
  for (const mailbox of Object.keys(MAILBOXES) as Mailbox[]) {
    const c = { stored: 0, duplicates: 0, errors: 0 };
    for (const email of await fetchNewEmails(mailbox, lookbackDays)) {
      const result = await storeEmail(email);
      if (result === 'stored') c.stored++;
      else if (result === 'duplicate') c.duplicates++;
      else c.errors++;
    }
    counts[mailbox] = c;
  }
  return counts;
}
