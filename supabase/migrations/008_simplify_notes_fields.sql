-- ============================================
-- MIGRATION: Simplify Notes & Instructions Fields
-- ============================================
-- 1. Remove allergy_notes (not needed on admin side)
-- 2. Rename special_instructions to customer_notes (clearer naming)
-- 3. Add writing_on_cake to order_items (customer input for decorations)

-- ============================================
-- ORDERS TABLE
-- ============================================

-- Remove allergy fields
ALTER TABLE orders
DROP COLUMN IF EXISTS allergy_notes;

ALTER TABLE orders
DROP COLUMN IF EXISTS reference_photo_url;

-- Rename special_instructions to customer_notes
ALTER TABLE orders
RENAME COLUMN special_instructions TO customer_notes;

-- Add comment
COMMENT ON COLUMN orders.customer_notes IS 'Customer delivery/pickup requests (e.g., "Call when arrived")';

-- ============================================
-- ORDER_ITEMS TABLE
-- ============================================

-- Add writing_on_cake field
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS writing_on_cake TEXT;

-- Add comment
COMMENT ON COLUMN order_items.writing_on_cake IS 'Text that customer wants written on the cake (e.g., "Happy Birthday John")';

-- Rename decoration_notes to internal_decoration_notes for clarity
ALTER TABLE order_items
RENAME COLUMN decoration_notes TO internal_decoration_notes;

COMMENT ON COLUMN order_items.internal_decoration_notes IS 'Internal staff notes about decoration details';

-- Rename production_notes to staff_notes for clarity
ALTER TABLE order_items
RENAME COLUMN production_notes TO staff_notes;

COMMENT ON COLUMN order_items.staff_notes IS 'Internal staff notes added during production';

-- ============================================
-- DONE ✅
-- ============================================
-- SUMMARY:
--   ✅ Removed allergy_notes and reference_photo_url from orders
--   ✅ Renamed special_instructions → customer_notes
--   ✅ Added writing_on_cake to order_items (for customer input)
--   ✅ Renamed decoration_notes → internal_decoration_notes
--   ✅ Renamed production_notes → staff_notes

