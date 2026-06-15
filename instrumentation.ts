export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: cron } = await import('node-cron');
    const { fetchRecentEmails } = await import('./lib/email/imap-client');
    const { storeInboundEmail } = await import('./lib/email/store-email');

    cron.schedule('*/2 * * * *', async () => {
      if (!process.env.IMAP_HOST || !process.env.IMAP_PASSWORD) return;

      try {
        const emails = await fetchRecentEmails();
        for (const email of emails) {
          await storeInboundEmail(email);
        }
      } catch (err) {
        console.error('[email-poll]', err);
      }
    });

    console.log('[email-poll] scheduler started — polling every 2 min');
  }
}
