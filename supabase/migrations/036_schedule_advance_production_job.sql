-- ============================================
-- Migration: Schedule nightly job to advance new → in_progress
-- ============================================
-- Requires pg_cron extension. On Supabase Pro, enable it first:
--   Dashboard → Database → Extensions → pg_cron → Enable
--
-- Job runs daily at 02:00 UTC. Items with status 'new' and created_at > 24h ago
-- are advanced to 'in_progress'.

-- Step 1: Enable pg_cron (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Step 2: Grant usage to postgres (pg_cron runs as postgres)
-- On Supabase this is typically already set up

-- Step 3: Unschedule if exists (idempotent - safe to re-run migration)
DO $$
BEGIN
  PERFORM cron.unschedule('advance-new-to-in-progress');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Job may not exist on first run, ignore
END $$;

-- Step 4: Schedule the job - daily at 02:00 UTC
SELECT cron.schedule(
  'advance-new-to-in-progress',
  '0 2 * * *',
  'SELECT advance_new_to_in_progress()'
);
