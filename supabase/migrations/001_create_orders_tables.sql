-- ============================================
-- ORDERS AND ORDER ITEMS TABLES
-- ============================================

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe payment info
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT DEFAULT 'pending'
    CHECK (stripe_payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
  
  -- Customer information
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Order details
  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  
  -- Order status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  
  -- Delivery information
  delivery_type TEXT 
    CHECK (delivery_type IN ('pickup', 'delivery')),
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_postal_code TEXT,
  delivery_country TEXT DEFAULT 'Switzerland',
  
  -- Additional info
  special_instructions TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to orders
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Product information (snapshot from Sanity at time of order)
  product_id TEXT NOT NULL,n  -- Sanity product _id
  product_name TEXT NOT NULL,
  product_image_url TEXT,
  
  -- Order specifics
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  
  -- Product options
  selected_size TEXT,  -- Size value (e.g., "1kg", "1.5kg") - NULL if no size
  size_label TEXT,     -- Human-readable size (e.g., "1 kg for 5-8 persons")
  delivery_date DATE,  -- Requested delivery date for this item
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for orders table
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE orders IS 'Main orders table storing customer orders from the bakery website';
COMMENT ON TABLE order_items IS 'Individual items within each order, including size and delivery date options';
COMMENT ON COLUMN order_items.selected_size IS 'Size option value if product has size variants (e.g., 1kg, 2kg)';
COMMENT ON COLUMN order_items.delivery_date IS 'Requested delivery date for this specific item';

