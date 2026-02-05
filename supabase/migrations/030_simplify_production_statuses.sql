-- ============================================
-- MIGRATION: Simplify Production Status Values
-- ============================================
-- Remove unnecessary production statuses and keep only core workflow stages
-- 
-- REMOVED: draft, prepared, packaged, delivered, cancelled
-- KEEPING: new, baked, creamed, decorated
--
-- Business rationale: Simplify the production workflow to focus on 
-- essential baking stages rather than pre/post production logistics

-- STEP 1: Update any existing items with removed statuses to appropriate alternatives
-- Convert 'draft' → 'new' (not yet started)
UPDATE order_items
SET production_status = 'new'
WHERE production_status = 'draft';

-- Convert 'prepared' → 'new' (preparation is part of starting production)
UPDATE order_items
SET production_status = 'new'
WHERE production_status = 'prepared';

-- Convert 'packaged' → 'decorated' (decoration is the final production step)
UPDATE order_items
SET production_status = 'decorated'
WHERE production_status = 'packaged';

-- Convert 'delivered' → 'decorated' (delivery tracking happens elsewhere)
UPDATE order_items
SET production_status = 'decorated'
WHERE production_status = 'delivered';

-- Convert 'cancelled' → 'new' (cancelled orders can be handled at order level)
UPDATE order_items
SET production_status = 'new'
WHERE production_status = 'cancelled';

-- STEP 2: Drop the old constraint
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_production_status_check;

-- STEP 3: Add new simplified constraint with only core production stages
ALTER TABLE order_items
  ADD CONSTRAINT order_items_production_status_check 
  CHECK (production_status IN (
    'new', 'baked', 'creamed', 'decorated'
  ));

-- STEP 4: Ensure default is still 'new'
ALTER TABLE order_items
  ALTER COLUMN production_status SET DEFAULT 'new';

-- ============================================
-- MIGRATION COMPLETE ✅
-- ============================================
-- Production workflow is now: new → baked → creamed → decorated
-- This focuses on core baking/decoration stages only
