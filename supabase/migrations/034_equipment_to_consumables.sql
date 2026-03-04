-- Migration: Rename expense category equipment -> consumables
-- Description: "Equipment" becomes "Consumables" (Расходные материалы) — disposables, consumables.
-- Updates all existing expenses and the DB constraint.

-- Step 1: Update all financial_transactions with expense_category = 'equipment' to 'consumables'
UPDATE financial_transactions
SET expense_category = 'consumables'
WHERE type = 'expense'
  AND expense_category = 'equipment';

-- Step 2: Drop the old CHECK constraint (find by definition) and add new one
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT c.conname INTO con_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'financial_transactions'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%expense_category%';
  
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE financial_transactions DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE financial_transactions
  ADD CONSTRAINT financial_transactions_expense_category_check
  CHECK (
    expense_category IS NULL OR
    expense_category IN (
      'ingredients', 'utilities', 'labor', 'supplies',
      'marketing', 'rent', 'consumables', 'packaging', 'delivery', 'other'
    )
  );

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Expense category equipment -> consumables: migration complete';
END $$;
