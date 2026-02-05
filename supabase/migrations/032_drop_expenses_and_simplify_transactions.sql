-- Migration: Drop expenses table and remove notes from financial_transactions
-- Description: Clean up legacy expenses table and simplify financial_transactions

-- Step 1: Drop the expenses table (legacy, replaced by financial_transactions)
DROP TABLE IF EXISTS expenses CASCADE;

-- Step 2: Remove notes column from financial_transactions (redundant field)
ALTER TABLE financial_transactions DROP COLUMN IF EXISTS notes;

-- Add comments for documentation
COMMENT ON TABLE financial_transactions IS 'Unified ledger for all revenues and expenses - simplified without redundant notes field';
