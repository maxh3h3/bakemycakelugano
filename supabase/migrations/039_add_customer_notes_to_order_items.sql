-- Denormalize customer_notes from orders into order_items
-- This follows the existing pattern (order_number, delivery_date, delivery_type)
-- so the production view stays a single-table query with no JOINs.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS customer_notes TEXT;

COMMENT ON COLUMN order_items.customer_notes IS 'Denormalized from orders.customer_notes for production view queries';
