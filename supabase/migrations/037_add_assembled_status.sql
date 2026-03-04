-- ============================================
-- Migration: Add assembled status to order_items
-- ============================================
-- Workflow: new → in_progress → baked → creamed → assembled → decorated

-- Step 1: Drop existing constraint
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_production_status_check;

-- Step 2: Add constraint with assembled
ALTER TABLE order_items
  ADD CONSTRAINT order_items_production_status_check
  CHECK (production_status IN (
    'new', 'in_progress', 'baked', 'creamed', 'assembled', 'decorated'
  ));
