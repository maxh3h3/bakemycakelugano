-- Remove legacy size fields (replaced by weight_kg)
ALTER TABLE order_items
  DROP COLUMN IF EXISTS selected_size,
  DROP COLUMN IF EXISTS size_label;
