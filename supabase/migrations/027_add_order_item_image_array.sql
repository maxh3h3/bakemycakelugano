-- Support multiple images per order item
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_image_urls JSONB;

UPDATE order_items
SET product_image_urls = CASE
  WHEN product_image_url IS NOT NULL AND product_image_url <> '' THEN jsonb_build_array(product_image_url)
  ELSE NULL
END
WHERE product_image_urls IS NULL;

ALTER TABLE order_items
  DROP COLUMN IF EXISTS product_image_url;
