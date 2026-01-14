-- Migration: Create expenses table
-- Description: Add expense tracking for accounting and financial management

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Expense details
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ingredients', 'utilities', 'labor', 'supplies', 'marketing', 'rent', 'other')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'CHF' NOT NULL,
  
  -- Description and documentation
  description TEXT NOT NULL,
  notes TEXT,
  receipt_url TEXT, -- URL to receipt image in storage
  
  -- Tracking
  created_by_user_id UUID, -- Admin who logged the expense
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
-- Index on date for filtering and sorting by date range
CREATE INDEX expenses_date_idx ON expenses (date DESC);

-- Index on category for filtering expenses by type
CREATE INDEX expenses_category_idx ON expenses (category);

-- Index on amount for financial queries
CREATE INDEX expenses_amount_idx ON expenses (amount);

-- Composite index for date + category queries (common use case)
CREATE INDEX expenses_date_category_idx ON expenses (date DESC, category);

-- Index for created_by tracking
CREATE INDEX expenses_created_by_user_id_idx ON expenses (created_by_user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on updates
CREATE TRIGGER expenses_updated_at_trigger
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_expenses_updated_at();

-- Add comments for documentation
COMMENT ON TABLE expenses IS 'Expense tracking for accounting and financial management';
COMMENT ON COLUMN expenses.date IS 'Date the expense occurred (not when it was logged)';
COMMENT ON COLUMN expenses.category IS 'Expense category: ingredients, utilities, labor, supplies, marketing, rent, or other';
COMMENT ON COLUMN expenses.amount IS 'Expense amount (must be positive)';
COMMENT ON COLUMN expenses.currency IS 'Currency code (default: CHF)';
COMMENT ON COLUMN expenses.description IS 'Brief description of the expense';
COMMENT ON COLUMN expenses.notes IS 'Additional notes or details about the expense';
COMMENT ON COLUMN expenses.receipt_url IS 'URL to receipt/invoice image stored in Supabase storage';
COMMENT ON COLUMN expenses.created_by_user_id IS 'ID of the admin user who logged this expense';
