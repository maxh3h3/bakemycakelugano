-- Migration: Add client type classification
-- Description: Distinguish between individual customers and business clients
-- This enables B2B features like monthly invoicing, tax IDs, etc.

-- Add client_type column with default 'individual'
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'individual' 
CHECK (client_type IN ('individual', 'business'));

-- Add business-specific fields (optional, can be null)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS business_name TEXT;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- Create index for filtering by client type
CREATE INDEX IF NOT EXISTS clients_client_type_idx ON clients (client_type);

-- Add comments for documentation
COMMENT ON COLUMN clients.client_type IS 'Client classification: individual (B2C person) or business (B2B company)';
COMMENT ON COLUMN clients.business_name IS 'Official business/company name (for business clients, may differ from contact name)';
COMMENT ON COLUMN clients.tax_id IS 'Tax identification number, VAT number, or similar (for business clients)';

-- Note: All existing clients will default to 'individual'
-- Business clients can be updated manually through the admin UI or via SQL if needed
