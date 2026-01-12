-- ============================================
-- REFACTOR DELIVERY FIELDS
-- Consolidate address fields into JSONB and add delivery_time
-- ============================================

-- ============================================
-- STEP 1: Add new columns to orders table
-- ============================================

-- Add delivery_time column (flexible text for times like "14:30", "afternoon", "2-4pm")
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time TEXT;

-- Add temporary JSONB column for new address structure
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_new JSONB;

-- ============================================
-- STEP 2: Migrate existing data in orders table
-- Build JSONB from existing separate columns
-- ============================================

UPDATE orders
SET delivery_address_new = jsonb_build_object(
  'street', COALESCE(delivery_address, ''),
  'city', COALESCE(delivery_city, ''),
  'postalCode', COALESCE(delivery_postal_code, ''),
  'country', COALESCE(delivery_country, 'Switzerland')
)
WHERE delivery_type = 'delivery';

-- For pickup orders, set to null or empty object
UPDATE orders
SET delivery_address_new = NULL
WHERE delivery_type = 'pickup' OR delivery_type IS NULL;

-- ============================================
-- STEP 3: Drop old columns and rename new column
-- ============================================

-- Drop old delivery address columns
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_address;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_city;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_postal_code;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_country;

-- Rename new column to delivery_address
ALTER TABLE orders RENAME COLUMN delivery_address_new TO delivery_address;

-- ============================================
-- STEP 4: Update checkout_attempts table
-- ============================================

-- Add temporary JSONB column
ALTER TABLE checkout_attempts ADD COLUMN IF NOT EXISTS delivery_address_new JSONB;

-- Migrate existing data
UPDATE checkout_attempts
SET delivery_address_new = jsonb_build_object(
  'street', COALESCE(delivery_address, ''),
  'city', COALESCE(delivery_city, ''),
  'postalCode', COALESCE(delivery_postal_code, ''),
  'country', COALESCE(delivery_country, 'Switzerland')
)
WHERE delivery_type = 'delivery';

-- For pickup orders, set to null
UPDATE checkout_attempts
SET delivery_address_new = NULL
WHERE delivery_type = 'pickup' OR delivery_type IS NULL;

-- Drop old columns
ALTER TABLE checkout_attempts DROP COLUMN IF EXISTS delivery_address;
ALTER TABLE checkout_attempts DROP COLUMN IF EXISTS delivery_city;
ALTER TABLE checkout_attempts DROP COLUMN IF EXISTS delivery_postal_code;
ALTER TABLE checkout_attempts DROP COLUMN IF EXISTS delivery_country;

-- Rename new column
ALTER TABLE checkout_attempts RENAME COLUMN delivery_address_new TO delivery_address;

-- ============================================
-- STEP 5: Add comments for documentation
-- ============================================

COMMENT ON COLUMN orders.delivery_address IS 'JSONB structure: {street, city, postalCode, country}. NULL for pickup orders.';
COMMENT ON COLUMN orders.delivery_time IS 'Flexible time specification: "14:30", "afternoon", "2-4pm", etc.';
COMMENT ON COLUMN checkout_attempts.delivery_address IS 'JSONB structure: {street, city, postalCode, country}. NULL for pickup orders.';

