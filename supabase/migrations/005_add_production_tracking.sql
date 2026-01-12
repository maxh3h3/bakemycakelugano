-- ============================================
-- ADD PRODUCTION TRACKING FEATURES
-- ============================================
-- This migration adds production-specific fields to support
-- kitchen workflow, staff management, and order tracking
-- 
-- CONTEXT: Migration 004 moved delivery_date from order_items to orders
-- NOW: We're adding it BACK to order_items (denormalized) for fast production queries
--
-- WHY DENORMALIZE?
-- - Cook queries: "Show me all items to bake today" → Only needs order_items table
-- - No joins = faster queries = better UX for kitchen staff
-- - orders.delivery_date = Owner's financial/planning view
-- - order_items.delivery_date = Cook's production view

-- ============================================
-- 1. ADD DELIVERY_DATE BACK TO ORDER_ITEMS (Denormalized)
-- ============================================

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- Populate from orders table for existing data
UPDATE order_items oi
SET delivery_date = (
  SELECT o.delivery_date 
  FROM orders o 
  WHERE o.id = oi.order_id
)
WHERE oi.delivery_date IS NULL;

-- Index for fast production queries (by date + status)
CREATE INDEX IF NOT EXISTS idx_order_items_delivery_date 
  ON order_items(delivery_date);

COMMENT ON COLUMN order_items.delivery_date IS 'Denormalized delivery date for fast production queries without joins. Copied from orders.delivery_date';

-- ============================================
-- 2. ADD PRODUCTION STATUS TO ORDER_ITEMS
-- ============================================
-- Production workflow: new → prepared → baked → creamed → decorated → packaged → delivered

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'new' 
  CHECK (production_status IN ('new', 'prepared', 'baked', 'creamed', 'decorated', 'packaged', 'delivered', 'cancelled'));

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS decoration_notes TEXT;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS production_notes TEXT;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add category for filtering (denormalized from Sanity)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS product_category TEXT;

-- Add weight and diameter (optional, for cakes)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(6, 3);

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS diameter_cm DECIMAL(5, 2);

-- Indexes for production queries
CREATE INDEX IF NOT EXISTS idx_order_items_production_status 
  ON order_items(production_status);

CREATE INDEX IF NOT EXISTS idx_order_items_delivery_production 
  ON order_items(delivery_date, production_status);

CREATE INDEX IF NOT EXISTS idx_order_items_category 
  ON order_items(product_category);

-- Comments
COMMENT ON COLUMN order_items.production_status IS 'Current production status for kitchen workflow';
COMMENT ON COLUMN order_items.decoration_notes IS 'Decoration instructions (e.g., "Happy Birthday John")';
COMMENT ON COLUMN order_items.production_notes IS 'Internal staff notes';
COMMENT ON COLUMN order_items.started_at IS 'When production started on this item';
COMMENT ON COLUMN order_items.completed_at IS 'When production completed on this item';
COMMENT ON COLUMN order_items.product_category IS 'Product category for filtering (CAKES, PASTRIES, etc)';
COMMENT ON COLUMN order_items.weight_kg IS 'Weight in kg (optional, for cakes)';
COMMENT ON COLUMN order_items.diameter_cm IS 'Diameter in cm (optional, for cakes)';

-- ============================================
-- 3. ADD PRODUCTION FIELDS TO ORDERS
-- ============================================

-- Human-readable order number (DD-MM-NN format)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Instagram handle
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_ig_handle TEXT;

-- Payment tracking (simpler than stripe_payment_status)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT false;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT 
  CHECK (payment_method IN ('cash', 'stripe', 'twint'));

-- Allergy notes (separate from special instructions - more visible!)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS allergy_notes TEXT;

-- Reference photo URL (for custom orders)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS reference_photo_url TEXT;

-- Channel tracking (where order came from)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'website' 
  CHECK (channel IN ('website', 'whatsapp', 'phone', 'walk_in', 'instagram', 'email'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_number 
  ON orders(order_number);

CREATE INDEX IF NOT EXISTS idx_orders_delivery_date_status 
  ON orders(delivery_date, status);

CREATE INDEX IF NOT EXISTS idx_orders_paid 
  ON orders(paid);

-- Comments
COMMENT ON COLUMN orders.order_number IS 'Human-readable order number format: DD-MM-NN (e.g., 15-01-03 = Jan 15th, 3rd order)';
COMMENT ON COLUMN orders.paid IS 'Simple boolean for payment status';
COMMENT ON COLUMN orders.payment_method IS 'Payment method: cash, stripe, or twint';
COMMENT ON COLUMN orders.channel IS 'Source channel: website, whatsapp, phone, walk_in, instagram, email';
COMMENT ON COLUMN orders.customer_ig_handle IS 'Customer Instagram handle (if applicable)';
COMMENT ON COLUMN orders.allergy_notes IS 'Allergy warnings and dietary restrictions (IMPORTANT!)';
COMMENT ON COLUMN orders.reference_photo_url IS 'Reference photo URL for custom orders';

-- ============================================
-- 4. POPULATE INITIAL DATA
-- ============================================

-- Mark existing paid Stripe orders
UPDATE orders 
SET paid = true 
WHERE stripe_payment_status = 'succeeded' 
  AND paid IS NULL;

-- Set channel for existing orders (all from website)
UPDATE orders 
SET channel = 'website' 
WHERE channel IS NULL;

-- ============================================
-- 5. GENERATE ORDER NUMBERS FOR EXISTING ORDERS
-- ============================================

-- Create a function to generate order numbers in format: DD-MM-NN
CREATE OR REPLACE FUNCTION generate_order_number(order_date DATE)
RETURNS TEXT AS $$
DECLARE
  day TEXT;
  month TEXT;
  seq_num INTEGER;
  order_num TEXT;
BEGIN
  -- Format: DD-MM-NN (e.g., 15-01-03 = Jan 15th, 3rd order of that day)
  day := TO_CHAR(order_date, 'DD');
  month := TO_CHAR(order_date, 'MM');
  
  -- Get next sequence number for this day
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM orders
  WHERE order_number LIKE day || '-' || month || '-%'
    AND delivery_date = order_date;
  
  order_num := day || '-' || month || '-' || LPAD(seq_num::TEXT, 2, '0');
  
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Generate order numbers for existing orders (if they don't have one)
DO $$
DECLARE
  order_record RECORD;
BEGIN
  FOR order_record IN 
    SELECT id, delivery_date 
    FROM orders 
    WHERE order_number IS NULL 
      AND delivery_date IS NOT NULL
    ORDER BY created_at
  LOOP
    UPDATE orders 
    SET order_number = generate_order_number(order_record.delivery_date)
    WHERE id = order_record.id;
  END LOOP;
END $$;

-- ============================================
-- MIGRATION COMPLETE ✅
-- ============================================
--
-- SUMMARY OF CHANGES:
--   ✅ Added delivery_date BACK to order_items (denormalized for performance)
--   ✅ Added production_status workflow tracking to order_items
--   ✅ Added decoration_notes, production_notes, weight_kg, diameter_cm
--   ✅ Added order_number (human-readable: DD-MM-NN format)
--   ✅ Added paid, payment_method, allergy_notes, customer_ig_handle
--   ✅ Added channel tracking (website, whatsapp, phone, etc.)
--   ✅ Created indexes for fast queries
--   ✅ Generated order numbers for existing orders
--
-- WHY TWO delivery_date COLUMNS?
--   orders.delivery_date = Owner/Manager view (joins with customer info, payments)
--   order_items.delivery_date = Cook view (fast queries, no joins needed)
--   
-- NEXT STEPS:
--   1. Run this migration in Supabase SQL Editor
--   2. Update auth system to support 3 roles (owner/cook/delivery)
--   3. Create /admin/production page for kitchen workflow
--   4. Test with existing orders
