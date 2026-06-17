-- ============================================
-- CREATE B2B PROSPECTS TABLE  (⚠️ TEMPORARY)
-- ============================================
-- Lightweight B2B CRM for the restaurant/hotel cake outreach strategy.
--
-- ⚠️ THIS IS A TEMPORARY TABLE. It is intentionally minimal so the owner is
-- not overwhelmed. When we build a real CRM, prospects should be migrated into
-- the proper schema and this table dropped. Do not build heavy logic on top of it.
--
-- The owner manages only 4 fields from the admin B2B page:
--   name, address, reviews_count, status
-- The remaining columns are populated once at seed time (from Google Places)
-- purely to render the presentation map; they are not edited by hand.

CREATE TABLE IF NOT EXISTS b2b_prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Owner-managed fields
  name          TEXT NOT NULL,
  address       TEXT,
  reviews_count INTEGER,
  status        TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'contacted', 'negotiating', 'won', 'lost')),

  -- Seed-time fields (for the map / context — not edited in the simple UI)
  category  TEXT,               -- temporary tag: 'japanese' | 'asian' | 'hotel'
  phone     TEXT,
  website   TEXT,
  rating    NUMERIC(2,1),
  lat       DOUBLE PRECISION,
  lng       DOUBLE PRECISION,
  place_id  TEXT UNIQUE,        -- Google Places id, for de-dup on re-seed

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_b2b_prospects_status   ON b2b_prospects(status);
CREATE INDEX IF NOT EXISTS idx_b2b_prospects_category ON b2b_prospects(category);

-- Comments
COMMENT ON TABLE  b2b_prospects               IS 'TEMPORARY lightweight B2B CRM for restaurant/hotel cake outreach. Migrate + drop when a real CRM is built.';
COMMENT ON COLUMN b2b_prospects.name          IS 'Business name';
COMMENT ON COLUMN b2b_prospects.address       IS 'Business address';
COMMENT ON COLUMN b2b_prospects.reviews_count IS 'Number of Google reviews (proxy for business size)';
COMMENT ON COLUMN b2b_prospects.status        IS 'Outreach pipeline stage: new | contacted | negotiating | won | lost';
COMMENT ON COLUMN b2b_prospects.place_id      IS 'Google Places id — used to avoid duplicates when re-seeding';

-- ============================================
-- MIGRATION COMPLETE ✅
-- ============================================
