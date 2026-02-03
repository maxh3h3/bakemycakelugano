-- Migration: Backfill NULL delivery_type values in order_items
-- This fixes website orders created via Stripe webhook that were missing delivery_type
-- (Bug: Stripe webhook wasn't denormalizing delivery_type until this fix)

-- Backfill NULL delivery_type from parent orders
UPDATE order_items oi
SET delivery_type = (
  SELECT o.delivery_type 
  FROM orders o 
  WHERE o.id = oi.order_id
),
updated_at = NOW()
WHERE oi.delivery_type IS NULL;

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled delivery_type for % order_items', updated_count;
END $$;
