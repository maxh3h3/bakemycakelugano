-- Migration: Create clients table
-- Description: Add centralized clients table to manage customer information separately from orders

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic information
  name TEXT NOT NULL,
  
  -- Contact methods (at least one required - enforced at application level)
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  instagram_handle TEXT,
  
  -- Preferred contact method
  preferred_contact TEXT CHECK (preferred_contact IN ('email', 'phone', 'whatsapp', 'instagram')),
  
  -- Metadata for client relationship management
  first_order_date DATE,
  last_order_date DATE,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10, 2) DEFAULT 0,
  
  -- Admin notes (internal only)
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create unique constraint on email (case-insensitive)
-- Partial index: only applies when email IS NOT NULL
CREATE UNIQUE INDEX clients_email_unique_idx ON clients (LOWER(email)) WHERE email IS NOT NULL;

-- Create unique constraint on phone
-- Partial index: only applies when phone IS NOT NULL
CREATE UNIQUE INDEX clients_phone_unique_idx ON clients (phone) WHERE phone IS NOT NULL;

-- Create search indexes for performance
-- Full-text search on name
CREATE INDEX clients_name_search_idx ON clients USING gin(to_tsvector('english', name));

-- Regular index on email for quick lookups
CREATE INDEX clients_email_idx ON clients (email) WHERE email IS NOT NULL;

-- Regular index on phone for quick lookups
CREATE INDEX clients_phone_idx ON clients (phone) WHERE phone IS NOT NULL;

-- Index on preferred_contact for filtering
CREATE INDEX clients_preferred_contact_idx ON clients (preferred_contact);

-- Index on last_order_date for sorting by recency
CREATE INDEX clients_last_order_date_idx ON clients (last_order_date DESC NULLS LAST);

-- Index on total_orders for filtering by customer type
CREATE INDEX clients_total_orders_idx ON clients (total_orders DESC);

-- Add client_id column to orders table
-- Nullable to maintain backward compatibility with existing orders
-- ON DELETE SET NULL ensures orders remain if client is deleted
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Create index on orders.client_id for joins
CREATE INDEX orders_client_id_idx ON orders (client_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on updates
CREATE TRIGGER clients_updated_at_trigger
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_clients_updated_at();

-- Add comments for documentation
COMMENT ON TABLE clients IS 'Centralized customer/client information management';
COMMENT ON COLUMN clients.email IS 'Email address (unique, case-insensitive)';
COMMENT ON COLUMN clients.phone IS 'Phone number (unique)';
COMMENT ON COLUMN clients.whatsapp IS 'WhatsApp number (can differ from phone)';
COMMENT ON COLUMN clients.instagram_handle IS 'Instagram handle without @ symbol';
COMMENT ON COLUMN clients.preferred_contact IS 'Preferred method of contact: email, phone, whatsapp, or instagram';
COMMENT ON COLUMN clients.notes IS 'Internal admin notes about the client';
COMMENT ON COLUMN clients.total_orders IS 'Cached count of total orders for this client';
COMMENT ON COLUMN clients.total_spent IS 'Cached sum of all order amounts (CHF)';
