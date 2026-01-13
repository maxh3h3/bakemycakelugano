-- Migration: Migrate existing order customers to clients table
-- Description: Extract unique customers from orders and populate clients table, then link orders to clients

-- Step 1: Create temporary table to aggregate customer data from orders
-- Group by email OR phone to identify unique customers
CREATE TEMP TABLE temp_client_aggregates AS
WITH customer_groups AS (
  -- Group customers by email (case-insensitive) or phone
  SELECT 
    COALESCE(LOWER(customer_email), 'email_' || MD5(COALESCE(customer_phone, customer_name))) as group_key,
    customer_name,
    customer_email,
    customer_phone,
    customer_ig_handle,
    channel,
    MIN(created_at) as first_order_date,
    MAX(created_at) as last_order_date,
    COUNT(*) as total_orders,
    SUM(total_amount) as total_spent
  FROM orders
  WHERE customer_name IS NOT NULL -- Ensure we have at least a name
  GROUP BY 
    COALESCE(LOWER(customer_email), 'email_' || MD5(COALESCE(customer_phone, customer_name))),
    customer_name,
    customer_email,
    customer_phone,
    customer_ig_handle,
    channel
),
-- For each unique customer (by email or phone), pick the most complete record
unique_customers AS (
  SELECT DISTINCT ON (group_key)
    group_key,
    customer_name as name,
    customer_email as email,
    customer_phone as phone,
    customer_phone as whatsapp, -- Default whatsapp to phone
    customer_ig_handle as instagram_handle,
    -- Infer preferred contact from channel
    CASE 
      WHEN channel = 'instagram' THEN 'instagram'
      WHEN channel = 'email' THEN 'email'
      WHEN channel IN ('whatsapp', 'phone', 'walk_in') THEN 
        CASE 
          WHEN customer_phone IS NOT NULL THEN 'phone'
          WHEN customer_email IS NOT NULL THEN 'email'
          ELSE NULL
        END
      ELSE 
        CASE 
          WHEN customer_email IS NOT NULL THEN 'email'
          WHEN customer_phone IS NOT NULL THEN 'phone'
          WHEN customer_ig_handle IS NOT NULL THEN 'instagram'
          ELSE NULL
        END
    END as preferred_contact,
    first_order_date::date as first_order_date,
    last_order_date::date as last_order_date,
    total_orders::integer as total_orders,
    total_spent as total_spent
  FROM customer_groups
  ORDER BY 
    group_key,
    -- Prefer records with more contact information
    (CASE WHEN customer_email IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN customer_phone IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN customer_ig_handle IS NOT NULL THEN 1 ELSE 0 END) DESC,
    last_order_date DESC
)
SELECT * FROM unique_customers;

-- Step 2: Insert unique customers into clients table
INSERT INTO clients (
  name,
  email,
  phone,
  whatsapp,
  instagram_handle,
  preferred_contact,
  first_order_date,
  last_order_date,
  total_orders,
  total_spent,
  created_at,
  updated_at
)
SELECT 
  name,
  email,
  phone,
  whatsapp,
  instagram_handle,
  preferred_contact,
  first_order_date,
  last_order_date,
  total_orders,
  total_spent,
  NOW(),
  NOW()
FROM temp_client_aggregates
WHERE email IS NOT NULL OR phone IS NOT NULL; -- Ensure at least one contact method

-- Step 3: Update orders with client_id based on email match (case-insensitive)
UPDATE orders o
SET client_id = c.id
FROM clients c
WHERE 
  o.customer_email IS NOT NULL 
  AND c.email IS NOT NULL
  AND LOWER(o.customer_email) = LOWER(c.email);

-- Step 4: Update orders with client_id based on phone match (for orders without email match)
UPDATE orders o
SET client_id = c.id
FROM clients c
WHERE 
  o.client_id IS NULL -- Only update if not already matched
  AND o.customer_phone IS NOT NULL
  AND c.phone IS NOT NULL
  AND o.customer_phone = c.phone;

-- Step 5: Log migration results
DO $$
DECLARE
  total_clients INTEGER;
  total_orders INTEGER;
  linked_orders INTEGER;
  unlinked_orders INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_clients FROM clients;
  SELECT COUNT(*) INTO total_orders FROM orders;
  SELECT COUNT(*) INTO linked_orders FROM orders WHERE client_id IS NOT NULL;
  SELECT COUNT(*) INTO unlinked_orders FROM orders WHERE client_id IS NULL;
  
  RAISE NOTICE '=== Client Migration Summary ===';
  RAISE NOTICE 'Total clients created: %', total_clients;
  RAISE NOTICE 'Total orders: %', total_orders;
  RAISE NOTICE 'Orders linked to clients: %', linked_orders;
  RAISE NOTICE 'Orders without client link: %', unlinked_orders;
  RAISE NOTICE '================================';
END $$;

-- Drop temporary table
DROP TABLE IF EXISTS temp_client_aggregates;

-- Verification queries (commented out, but useful for manual testing)
-- SELECT COUNT(*) as total_clients FROM clients;
-- SELECT COUNT(*) as orders_with_client FROM orders WHERE client_id IS NOT NULL;
-- SELECT COUNT(*) as orders_without_client FROM orders WHERE client_id IS NULL;
-- SELECT * FROM clients ORDER BY total_orders DESC LIMIT 10;
