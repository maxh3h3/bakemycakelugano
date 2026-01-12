-- ============================================
-- MIGRATION: Fix production_status constraint to use lowercase
-- ============================================
-- The original constraint used UPPERCASE values, but the app uses lowercase
-- This migration converts existing data and updates the constraint

-- STEP 1: Drop the old constraint FIRST (so we can modify the data)
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_production_status_check;

-- STEP 2: Update any existing uppercase values to lowercase
UPDATE order_items
SET production_status = LOWER(production_status)
WHERE production_status IS NOT NULL;

-- STEP 3: Add new constraint with lowercase values
ALTER TABLE order_items
  ADD CONSTRAINT order_items_production_status_check 
  CHECK (production_status IN (
    'draft', 'new', 'prepared', 'baked', 'creamed',
    'decorated', 'packaged', 'delivered', 'cancelled'
  ));

-- STEP 4: Set default to lowercase 'new'
ALTER TABLE order_items
  ALTER COLUMN production_status SET DEFAULT 'new';

