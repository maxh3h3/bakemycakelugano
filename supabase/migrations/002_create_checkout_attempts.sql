-- Checkout attempts table (tracks all checkout initiations)
CREATE TABLE IF NOT EXISTS checkout_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to Stripe
  stripe_session_id TEXT UNIQUE NOT NULL,
  
  -- Customer info (captured at checkout start)
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Cart snapshot
  cart_items JSONB NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  
  -- Delivery info snapshot
  delivery_type TEXT,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_postal_code TEXT,
  delivery_country TEXT DEFAULT 'Switzerland',
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  special_instructions TEXT,
  
  -- Metadata
  locale TEXT DEFAULT 'it',
  
  -- Conversion tracking (THIS IS ALL WE NEED!)
  converted BOOLEAN DEFAULT FALSE,  -- false = abandoned, true = paid
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,  -- When payment completed (if ever)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_checkout_attempts_converted ON checkout_attempts(converted);
CREATE INDEX idx_checkout_attempts_created_at ON checkout_attempts(created_at DESC);
CREATE INDEX idx_checkout_attempts_stripe_session ON checkout_attempts(stripe_session_id);
CREATE INDEX idx_checkout_attempts_customer_email ON checkout_attempts(customer_email);

-- Trigger for updated_at
CREATE TRIGGER update_checkout_attempts_updated_at
    BEFORE UPDATE ON checkout_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE checkout_attempts IS 'Tracks all checkout initiations - converted=false means abandoned';
COMMENT ON COLUMN checkout_attempts.converted IS 'FALSE = abandoned (never paid), TRUE = successfully paid';