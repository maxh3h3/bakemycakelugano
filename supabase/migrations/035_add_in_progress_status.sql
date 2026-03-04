-- ============================================
-- Migration: Add in_progress status to order_items
-- ============================================
-- Order items that remain "new" for 24+ hours are auto-advanced to "in_progress"
-- by a nightly job (see migration 036).
-- Workflow: new → in_progress → baked → creamed → decorated

-- Step 1: Drop existing constraint
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_production_status_check;

-- Step 2: Add constraint with in_progress
ALTER TABLE order_items
  ADD CONSTRAINT order_items_production_status_check
  CHECK (production_status IN (
    'new', 'in_progress', 'baked', 'creamed', 'decorated'
  ));

-- Step 3: Create function to advance new items to in_progress (created_at > 24h ago)
CREATE OR REPLACE FUNCTION advance_new_to_in_progress()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE order_items
  SET production_status = 'in_progress', updated_at = NOW()
  WHERE production_status = 'new'
    AND created_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'advance_new_to_in_progress: % order items advanced from new to in_progress', updated_count;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION advance_new_to_in_progress() IS 'Advances order items from new to in_progress when created_at is more than 24 hours ago. Called by pg_cron job daily.';
