-- ============================================
-- ADD opening_hours TO b2b_prospects  (⚠️ TEMPORARY table — see migration 045)
-- ============================================
-- Stores Google Places "regularOpeningHours.weekdayDescriptions" — an array of
-- human-readable strings, e.g. ["Monday: 9:00 AM – 6:00 PM", ...]. JSONB keeps
-- it flexible without modelling a full hours schema on a temporary table.

ALTER TABLE b2b_prospects
  ADD COLUMN IF NOT EXISTS opening_hours JSONB;

COMMENT ON COLUMN b2b_prospects.opening_hours IS
  'Google Places weekday opening-hours descriptions (array of strings). Populated at seed time.';

-- ============================================
-- MIGRATION COMPLETE ✅
-- ============================================
