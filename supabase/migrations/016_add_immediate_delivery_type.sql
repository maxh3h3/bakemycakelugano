-- Migration: Add 'immediate' delivery type for walk-in shelf sales
-- This allows tracking orders that are fulfilled immediately from the shelf
-- without needing production time or client tracking

-- Drop the existing constraint on delivery_type in orders table
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_delivery_type_check;

-- Add new constraint including 'immediate'
ALTER TABLE orders 
ADD CONSTRAINT orders_delivery_type_check 
CHECK (delivery_type IN ('pickup', 'delivery', 'immediate'));

-- Drop the existing constraint on delivery_type in checkout_attempts table (if exists)
ALTER TABLE checkout_attempts 
DROP CONSTRAINT IF EXISTS checkout_attempts_delivery_type_check;

-- Add comment explaining the new delivery type
COMMENT ON COLUMN orders.delivery_type IS 
'Delivery type: pickup (customer picks up at store), delivery (home delivery), immediate (fulfilled from shelf on-site)';
