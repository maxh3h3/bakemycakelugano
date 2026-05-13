-- Stores cake builder configurations submitted by customers.
-- The full builder state lives in `configuration` (JSONB) so schema
-- changes to the builder never require a migration here.

CREATE TABLE cake_configurations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'reviewed', 'ordered', 'cancelled')),
  configuration    jsonb       NOT NULL,
  thumbnail_url    text,
  estimated_price  numeric(10, 2)
);

-- GIN index lets Postgres query into the JSONB without a full scan,
-- e.g. WHERE configuration @> '{"tiers":[{"flavor":"chocolate"}]}'
CREATE INDEX cake_configurations_configuration_gin
  ON cake_configurations USING GIN (configuration);

-- Newest submissions first is the natural admin queue order.
CREATE INDEX cake_configurations_created_at_idx
  ON cake_configurations (created_at DESC);

-- All access goes through the service-role key (supabaseAdmin),
-- so RLS policies are intentionally minimal here.
ALTER TABLE cake_configurations ENABLE ROW LEVEL SECURITY;
