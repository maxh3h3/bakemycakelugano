-- Migration: Backfill client statistics
-- Description: Update total_orders, total_spent, first_order_date, and last_order_date for all existing clients

-- Function to recalculate stats for a single client
CREATE OR REPLACE FUNCTION recalculate_client_stats(p_client_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_orders INTEGER;
  v_total_spent NUMERIC(10, 2);
  v_first_order_date DATE;
  v_last_order_date DATE;
BEGIN
  -- Calculate stats from orders
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(total_amount), 0),
    MIN(created_at::DATE),
    MAX(created_at::DATE)
  INTO 
    v_total_orders,
    v_total_spent,
    v_first_order_date,
    v_last_order_date
  FROM orders
  WHERE client_id = p_client_id;
  
  -- Update client record
  UPDATE clients
  SET 
    total_orders = v_total_orders,
    total_spent = v_total_spent,
    first_order_date = v_first_order_date,
    last_order_date = v_last_order_date,
    updated_at = NOW()
  WHERE id = p_client_id;
END;
$$ LANGUAGE plpgsql;

-- Backfill stats for all clients that have orders
DO $$
DECLARE
  client_record RECORD;
BEGIN
  FOR client_record IN 
    SELECT DISTINCT client_id 
    FROM orders 
    WHERE client_id IS NOT NULL
  LOOP
    PERFORM recalculate_client_stats(client_record.client_id);
  END LOOP;
  
  RAISE NOTICE 'Client stats backfilled successfully';
END $$;

-- Create trigger function to automatically update client stats when orders change
CREATE OR REPLACE FUNCTION update_client_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.client_id IS NOT NULL THEN
      PERFORM recalculate_client_stats(NEW.client_id);
    END IF;
    
    -- If client_id changed, update old client too
    IF (TG_OP = 'UPDATE' AND OLD.client_id IS NOT NULL AND OLD.client_id != NEW.client_id) THEN
      PERFORM recalculate_client_stats(OLD.client_id);
    END IF;
  END IF;
  
  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    IF OLD.client_id IS NOT NULL THEN
      PERFORM recalculate_client_stats(OLD.client_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS orders_update_client_stats ON orders;

-- Create trigger on orders table
CREATE TRIGGER orders_update_client_stats
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_client_stats_trigger();

-- Add comment
COMMENT ON FUNCTION recalculate_client_stats IS 'Recalculates and updates aggregate statistics for a client based on their orders';
COMMENT ON FUNCTION update_client_stats_trigger IS 'Trigger function to automatically update client stats when orders are created, updated, or deleted';
