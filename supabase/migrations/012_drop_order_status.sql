-- Drop the status column from orders table
-- Order status will be derived from order_items.production_status and orders.paid
-- Individual items have their own production status, which is more granular and useful

ALTER TABLE orders DROP COLUMN IF EXISTS status;

-- Add comment to orders table explaining status management
COMMENT ON TABLE orders IS 'Orders table without status field. Order status is derived from order_items.production_status and orders.paid field.';
