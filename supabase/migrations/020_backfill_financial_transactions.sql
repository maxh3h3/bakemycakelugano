-- Migration: Backfill financial_transactions from existing data
-- Description: Migrate historical expenses and create revenue transactions for all paid orders
-- This ensures complete financial history in the new unified ledger

-- PART 1: Migrate existing expenses to financial_transactions
-- Transform expense records into expense transactions
INSERT INTO financial_transactions (
  date,
  type,
  amount,
  currency,
  description,
  notes,
  source_type,
  source_id,
  client_id,
  payment_method,
  channel,
  expense_category,
  receipt_url,
  created_by_user_id,
  created_at,
  updated_at
)
SELECT 
  date,
  'expense' AS type,
  amount,
  currency,
  description,
  notes,
  'manual' AS source_type, -- All existing expenses were manually entered
  NULL AS source_id, -- No source reference for expenses
  NULL AS client_id, -- Expenses don't have clients
  NULL AS payment_method,
  NULL AS channel,
  category AS expense_category,
  receipt_url,
  created_by_user_id,
  created_at,
  updated_at
FROM expenses
WHERE NOT EXISTS (
  -- Avoid duplicates if migration is run multiple times
  SELECT 1 FROM financial_transactions ft 
  WHERE ft.source_type = 'manual' 
    AND ft.type = 'expense' 
    AND ft.date = expenses.date 
    AND ft.amount = expenses.amount
    AND ft.description = expenses.description
);

-- PART 2: Create revenue transactions for all paid orders
-- This establishes the financial record for historical order payments
INSERT INTO financial_transactions (
  date,
  type,
  amount,
  currency,
  description,
  notes,
  source_type,
  source_id,
  client_id,
  payment_method,
  channel,
  expense_category,
  receipt_url,
  created_by_user_id,
  created_at,
  updated_at
)
SELECT 
  -- Use created_at date for historical orders (payment date)
  o.created_at::DATE AS date,
  'revenue' AS type,
  o.total_amount AS amount,
  o.currency,
  -- Create descriptive text for the transaction
  CASE 
    WHEN o.order_number IS NOT NULL THEN 'Order #' || o.order_number || ' - ' || o.customer_name
    ELSE 'Order - ' || o.customer_name
  END AS description,
  o.customer_notes AS notes,
  'order' AS source_type,
  o.id AS source_id, -- Link back to the order
  o.client_id,
  o.payment_method,
  COALESCE(o.channel, 'website') AS channel, -- Default to website if not specified
  NULL AS expense_category, -- Revenue transactions don't have expense categories
  NULL AS receipt_url,
  o.created_by_user_id,
  o.created_at,
  o.updated_at
FROM orders o
WHERE o.paid = true -- Only paid orders create revenue transactions
  AND NOT EXISTS (
    -- Avoid duplicates: check if transaction already exists for this order
    SELECT 1 FROM financial_transactions ft 
    WHERE ft.source_type = 'order' 
      AND ft.source_id = o.id
  );

-- Add informational comment
COMMENT ON TABLE financial_transactions IS 'Unified financial ledger tracking all revenues and expenses for accounting. Backfilled from existing orders and expenses.';

-- Log migration success (optional, for tracking)
DO $$ 
DECLARE
  expense_count INT;
  revenue_count INT;
BEGIN
  SELECT COUNT(*) INTO expense_count FROM financial_transactions WHERE type = 'expense';
  SELECT COUNT(*) INTO revenue_count FROM financial_transactions WHERE type = 'revenue';
  
  RAISE NOTICE 'Financial transactions backfill complete:';
  RAISE NOTICE '  - % expense transactions migrated', expense_count;
  RAISE NOTICE '  - % revenue transactions created from paid orders', revenue_count;
END $$;
