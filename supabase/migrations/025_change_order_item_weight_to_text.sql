-- Allow storing text weights from Stripe and manual entry
ALTER TABLE order_items
  ALTER COLUMN weight_kg TYPE text
  USING weight_kg::text;
