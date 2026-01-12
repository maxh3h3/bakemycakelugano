-- ============================================
-- MIGRATION: Drop stripe_payment_status column
-- ============================================
-- We now use the `paid` boolean instead of `stripe_payment_status`
-- This migration ensures all paid stripe orders are marked as paid

-- Step 1: Ensure all successful stripe payments are marked as paid
UPDATE orders
SET paid = true
WHERE stripe_payment_status = 'succeeded' 
  AND (paid IS NULL OR paid = false);

-- Step 2: Drop the stripe_payment_status column
ALTER TABLE orders
DROP COLUMN IF EXISTS stripe_payment_status;

-- Done! Orders now use the `paid` boolean for payment tracking

