-- ============================================
-- ADD FLAVOUR COLUMNS TO ORDER_ITEMS TABLE
-- ============================================

-- Add flavour columns to order_items table
ALTER TABLE order_items 
  ADD COLUMN IF NOT EXISTS selected_flavour TEXT,
  ADD COLUMN IF NOT EXISTS flavour_name TEXT;

-- Create index for better query performance on flavour
CREATE INDEX IF NOT EXISTS idx_order_items_flavour ON order_items(selected_flavour);

-- Add comments for documentation
COMMENT ON COLUMN order_items.selected_flavour IS 'Flavour option ID from Sanity CMS (e.g., chocolate, vanilla)';
COMMENT ON COLUMN order_items.flavour_name IS 'Human-readable flavour name for display (e.g., "Chocolate", "Vanilla")';

