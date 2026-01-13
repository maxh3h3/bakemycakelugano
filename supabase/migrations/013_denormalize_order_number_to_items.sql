-- Migration 013: Denormalize order_number to order_items
-- Purpose: Enable production view to query order_items directly without joins
-- Context: delivery_date was already denormalized in migration 005 for the same reason

-- Step 1: Add order_number column to order_items
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Step 2: Backfill order_number for all existing order_items
UPDATE order_items oi
SET order_number = (
  SELECT o.order_number
  FROM orders o
  WHERE o.id = oi.order_id
)
WHERE oi.order_number IS NULL;

-- Step 3: Create index for production queries (by date and order number)
CREATE INDEX IF NOT EXISTS idx_order_items_order_number 
  ON order_items(order_number);

-- Step 4: Add composite index for common production queries
CREATE INDEX IF NOT EXISTS idx_order_items_delivery_order 
  ON order_items(delivery_date, order_number);

-- Step 5: Add comment explaining the denormalization
COMMENT ON COLUMN order_items.order_number IS 'Denormalized order number for production view - copied from orders.order_number. Enables fast queries without joins.';

-- RATIONALE:
-- Production view (cook interface) needs to:
--   1. Query items by delivery_date (already denormalized in migration 005)
--   2. Display order_number for identification (now denormalized here)
--   3. Work without expensive joins to orders table
--
-- This follows the same pattern as delivery_date denormalization:
--   - orders.order_number = Owner's order management view
--   - order_items.order_number = Cook's production view (no joins!)
--
-- Query performance:
--   BEFORE: SELECT * FROM orders JOIN order_items WHERE delivery_date = X
--   AFTER:  SELECT * FROM order_items WHERE delivery_date = X  (much faster!)
