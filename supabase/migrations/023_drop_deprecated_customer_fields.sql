-- ============================================
-- Drop Deprecated Customer Fields from Orders
-- ============================================
-- This migration removes the deprecated customer fields from the orders table.
-- All customer information is now stored in the clients table and referenced via client_id.
--
-- IMPORTANT: Before running this migration, ensure:
-- 1. All orders have been backfilled with client_id (migration 011)
-- 2. All queries have been updated to join with clients table
-- 3. All components have been updated to use client data

-- Drop the deprecated customer fields
ALTER TABLE orders
  DROP COLUMN IF EXISTS customer_email,
  DROP COLUMN IF EXISTS customer_name,
  DROP COLUMN IF EXISTS customer_phone,
  DROP COLUMN IF EXISTS customer_ig_handle;

-- Drop the old index on customer_email (if it exists)
DROP INDEX IF EXISTS idx_orders_customer_email;

-- Add index on client_id for better join performance
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);

-- Add comment to document the change
COMMENT ON TABLE orders IS 'Orders table - customer information is stored in clients table and referenced via client_id';
