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

    // Agenda notifications: daily digest + hourly "~1h prior" reminders.
    // node-cron's timezone option handles Milan DST, so these fire at the
    // correct local wall-clock time year-round.
    const { runDailyDigest, runReminders } = await import('./lib/notifications/agenda-jobs');

    cron.schedule(
      '0 8 * * *',
      async () => {
        try {
          await runDailyDigest();
        } catch (err) {
          console.error('[agenda-digest]', err);
        }
      },
      { timezone: 'Europe/Rome' }
    );

    cron.schedule(
      '0 * * * *',
      async () => {
        try {
          await runReminders();
        } catch (err) {
          console.error('[agenda-reminders]', err);
        }
      },
      { timezone: 'Europe/Rome' }
    );

    console.log('[agenda] schedulers started — digest 08:00, reminders hourly (Europe/Rome)');
  }
}
