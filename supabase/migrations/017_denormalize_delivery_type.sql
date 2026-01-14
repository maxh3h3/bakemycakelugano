-- Migration: Denormalize delivery_type to order_items for filtering immediate sales
-- This allows us to filter out immediate sales in production view without joins

-- Add delivery_type column to order_items (denormalized from orders)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS delivery_type TEXT;

-- Populate from orders table for existing data
UPDATE order_items oi
SET delivery_type = (
  SELECT o.delivery_type 
  FROM orders o 
  WHERE o.id = oi.order_id
)
WHERE oi.delivery_type IS NULL;

-- Add comment explaining the denormalization
COMMENT ON COLUMN order_items.delivery_type IS 
'Denormalized delivery type for filtering immediate sales in production view without joins. Copied from orders.delivery_type';

-- Create index for fast filtering of immediate sales
CREATE INDEX IF NOT EXISTS idx_order_items_delivery_type 
  ON order_items(delivery_type);
