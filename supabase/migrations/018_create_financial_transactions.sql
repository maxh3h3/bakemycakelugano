-- Migration: Create financial_transactions table
-- Description: Unified ledger for all financial activity (revenues and expenses)
-- This replaces the separate revenue/expense tracking with a single source of truth

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core transaction details
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'CHF' NOT NULL,
  
  -- Description and notes
  description TEXT NOT NULL,
  notes TEXT,
  
  -- Source tracking (where did this transaction originate?)
  source_type TEXT NOT NULL CHECK (source_type IN ('order', 'manual', 'recurring')),
  source_id UUID, -- Reference to order.id if source_type = 'order', otherwise null
  
  -- Client relationship (for revenue transactions, null for expenses)
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Revenue-specific fields (null for expense transactions)
  payment_method TEXT, -- 'cash', 'card', 'twint', 'bank_transfer', 'invoice', etc.
  channel TEXT, -- 'website', 'divoraa', 'walk_in', 'restaurant', 'phone', 'instagram', etc.
  
  -- Expense-specific fields (null for revenue transactions)
  expense_category TEXT CHECK (
    expense_category IS NULL OR 
    expense_category IN ('ingredients', 'utilities', 'labor', 'supplies', 'marketing', 'rent', 'equipment', 'packaging', 'delivery', 'other')
  ),
  receipt_url TEXT, -- URL to receipt/invoice image in storage
  
  -- Metadata
  created_by_user_id UUID, -- Admin who created this transaction
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
-- Primary queries: by date range, by type, by client
CREATE INDEX financial_transactions_date_idx ON financial_transactions (date DESC);
CREATE INDEX financial_transactions_type_idx ON financial_transactions (type);
CREATE INDEX financial_transactions_client_id_idx ON financial_transactions (client_id);

-- Composite index for accounting queries (date + type is very common)
CREATE INDEX financial_transactions_date_type_idx ON financial_transactions (date DESC, type);

-- Index for source tracking (to find transaction from order)
CREATE INDEX financial_transactions_source_idx ON financial_transactions (source_type, source_id);

-- Index for revenue by channel analysis
CREATE INDEX financial_transactions_channel_idx ON financial_transactions (channel) WHERE type = 'revenue';

-- Index for expense by category analysis
CREATE INDEX financial_transactions_expense_category_idx ON financial_transactions (expense_category) WHERE type = 'expense';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_financial_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on updates
CREATE TRIGGER financial_transactions_updated_at_trigger
BEFORE UPDATE ON financial_transactions
FOR EACH ROW
EXECUTE FUNCTION update_financial_transactions_updated_at();

-- Add comprehensive comments for documentation
COMMENT ON TABLE financial_transactions IS 'Unified financial ledger tracking all revenues and expenses for accounting';
COMMENT ON COLUMN financial_transactions.date IS 'Date the transaction occurred (not when it was logged)';
COMMENT ON COLUMN financial_transactions.type IS 'Transaction type: revenue (money in) or expense (money out)';
COMMENT ON COLUMN financial_transactions.amount IS 'Transaction amount (always positive, type determines debit/credit)';
COMMENT ON COLUMN financial_transactions.currency IS 'Currency code (default: CHF)';
COMMENT ON COLUMN financial_transactions.description IS 'Human-readable description of the transaction';
COMMENT ON COLUMN financial_transactions.notes IS 'Additional notes or details';
COMMENT ON COLUMN financial_transactions.source_type IS 'Origin: order (from paid order), manual (directly entered), recurring (automated)';
COMMENT ON COLUMN financial_transactions.source_id IS 'Foreign key to source record (e.g., order_id) if applicable';
COMMENT ON COLUMN financial_transactions.client_id IS 'Client associated with revenue transaction (null for expenses)';
COMMENT ON COLUMN financial_transactions.payment_method IS 'Payment method for revenue transactions';
COMMENT ON COLUMN financial_transactions.channel IS 'Sales channel for revenue transactions (website, walk_in, divoraa, etc.)';
COMMENT ON COLUMN financial_transactions.expense_category IS 'Category for expense transactions (ingredients, rent, etc.)';
COMMENT ON COLUMN financial_transactions.receipt_url IS 'URL to receipt/invoice document in storage';
COMMENT ON COLUMN financial_transactions.created_by_user_id IS 'Admin user who created this transaction';
