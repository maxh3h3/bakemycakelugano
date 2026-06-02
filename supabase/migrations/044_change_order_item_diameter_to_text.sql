-- Allow storing free-form diameter values (e.g. "20", "20-22", "approx 18")
ALTER TABLE order_items
  ALTER COLUMN diameter_cm TYPE text
  USING diameter_cm::text;
