export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: cron } = await import('node-cron');
    const { fetchNewEmails } = await import('./lib/email/imap-client');
    const { storeInboundEmail } = await import('./lib/email/store-email');
    const { sendTelegramMessage } = await import('./lib/telegram/client');

    // A failing poll (e.g. IMAP password changed) used to stay silent for hours.
    // Alert on Telegram, at most once an hour, and once more when it recovers.
    let lastAlertAt = 0;
    let failing = false;

    const pollEmails = async (lookbackDays: number) => {
      if (!process.env.IMAP_HOST || !process.env.IMAP_PASSWORD) return;

      try {
        const emails = await fetchNewEmails(lookbackDays);
        for (const email of emails) {
          await storeInboundEmail(email);
        }
        if (failing) {
          failing = false;
          await sendTelegramMessage({ text: '✅ Почта снова синхронизируется' });
        }
      } catch (err) {
        console.error('[email-poll]', err);
        failing = true;
        if (Date.now() - lastAlertAt > 60 * 60 * 1000) {
          lastAlertAt = Date.now();
          const msg = err instanceof Error ? err.message : String(err);
          await sendTelegramMessage({
            text: `⚠️ Почта не синхронизируется: ${msg}`.slice(0, 500),
          });
        }
      }
    };

    // On boot, look back a month so anything missed while down gets caught up.
    void pollEmails(30);
    cron.schedule('*/2 * * * *', () => pollEmails(3));

    console.log('[email-poll] scheduler started — polling every 2 min (3-day lookback)');

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
