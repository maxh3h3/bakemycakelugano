-- Migration: Fix revenue transaction dates to use order date
-- Description: Revenue transactions should reflect the order's date (delivery_date or created_at),
-- not when the payment was recorded. This aligns with the updated mark-paid logic.
--
-- Updates all revenue transactions with source_type='order' to use:
-- - order.delivery_date when available
-- - order.created_at::DATE when delivery_date is null

DO $$
DECLARE
  updated_count INT;
BEGIN
  WITH updated AS (
    UPDATE financial_transactions ft
    SET 
      date = COALESCE(o.delivery_date, o.created_at::DATE),
      updated_at = NOW()
    FROM orders o
    WHERE ft.type = 'revenue'
      AND ft.source_type = 'order'
      AND ft.source_id = o.id
      AND ft.date IS DISTINCT FROM COALESCE(o.delivery_date, o.created_at::DATE)
    RETURNING ft.id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;
  
  RAISE NOTICE 'Revenue transaction dates aligned: % rows updated to order dates', updated_count;
END $$;
