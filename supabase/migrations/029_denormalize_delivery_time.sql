-- Migration: Denormalize delivery_time to order_items for decoration view
-- This allows decoration PDFs to show delivery time without joins

-- Add delivery_time column to order_items (denormalized from orders)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS delivery_time TEXT;

-- Populate from orders table for existing data
UPDATE order_items oi
SET delivery_time = (
  SELECT o.delivery_time 
  FROM orders o 
  WHERE o.id = oi.order_id
),
updated_at = NOW()
WHERE oi.delivery_time IS NULL;

-- Add comment explaining the denormalization
COMMENT ON COLUMN order_items.delivery_time IS 
'Denormalized delivery time for decoration view without joins. Copied from orders.delivery_time';

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled delivery_time for % order_items', updated_count;
END $$;
