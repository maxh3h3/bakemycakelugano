-- ============================================
-- ADD NOTIFICATION REMINDER FLAGS
-- ============================================
-- Supports the daily 8am digest + hourly "1 hour prior" Telegram reminders.
-- The hourly cron uses these timestamps for idempotency: once a reminder is
-- sent the column is stamped, so subsequent hourly runs skip the same item.

-- Meetings: stamp when the "upcoming" reminder was sent
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN meetings.reminder_sent_at IS
  'When the ~1h-prior Telegram reminder was sent. NULL = not yet reminded.';

-- Orders: stamp when the delivery reminder was sent
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.delivery_reminder_sent_at IS
  'When the ~1h-prior delivery Telegram reminder was sent. NULL = not yet reminded.';

-- ============================================
-- MIGRATION COMPLETE ✅
-- ============================================
