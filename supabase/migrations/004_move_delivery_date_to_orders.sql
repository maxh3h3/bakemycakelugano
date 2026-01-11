-- ============================================
-- MOVE DELIVERY DATE FROM ORDER_ITEMS TO ORDERS
-- ============================================

-- Step 1: Add delivery_date to orders table
ALTER TABLE orders 
ADD COLUMN delivery_date DATE;

-- Step 2: Migrate existing delivery dates from order_items to orders
-- Use the earliest delivery_date from order_items for each order
UPDATE orders o
SET delivery_date = (
  SELECT MIN(oi.delivery_date)
  FROM order_items oi
  WHERE oi.order_id = o.id
  AND oi.delivery_date IS NOT NULL
);

-- Step 3: Remove delivery_date from order_items
ALTER TABLE order_items 
DROP COLUMN IF EXISTS delivery_date;

-- Step 4: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);

-- Add comment for documentation
COMMENT ON COLUMN orders.delivery_date IS 'Requested delivery or pickup date for the entire order';
