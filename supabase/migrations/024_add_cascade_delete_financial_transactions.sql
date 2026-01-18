-- ============================================
-- ADD CASCADE DELETE FOR FINANCIAL TRANSACTIONS
-- ============================================
-- This migration adds a foreign key constraint to ensure that when an order
-- is deleted, its associated financial transaction (revenue) is also deleted.

-- First, check if the column already exists and has data
DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'financial_transactions_source_id_fkey' 
    AND table_name = 'financial_transactions'
  ) THEN
    ALTER TABLE financial_transactions 
    DROP CONSTRAINT financial_transactions_source_id_fkey;
  END IF;
END $$;

-- Add foreign key constraint with CASCADE delete
-- This will automatically delete financial_transactions when the referenced order is deleted
ALTER TABLE financial_transactions
ADD CONSTRAINT financial_transactions_source_id_fkey
FOREIGN KEY (source_id)
REFERENCES orders(id)
ON DELETE CASCADE;

-- Add index for better performance on cascading deletes
CREATE INDEX IF NOT EXISTS idx_financial_transactions_source 
ON financial_transactions(source_type, source_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT financial_transactions_source_id_fkey 
ON financial_transactions IS 'Cascades delete to financial transactions when source order is deleted';

COMMENT ON INDEX idx_financial_transactions_source IS 'Improves performance for cascading deletes and source lookups';
