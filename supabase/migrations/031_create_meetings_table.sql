-- ============================================
-- CREATE MEETINGS TABLE
-- ============================================
-- Simple meetings tracking for admin to schedule client meetings
-- Lean implementation: just date, time, and client reference

CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Meeting details
  meeting_date DATE NOT NULL,
  meeting_time TEXT NOT NULL,
  
  -- Client reference
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_meetings_date 
  ON meetings(meeting_date);

CREATE INDEX IF NOT EXISTS idx_meetings_client 
  ON meetings(client_id);

CREATE INDEX IF NOT EXISTS idx_meetings_date_time 
  ON meetings(meeting_date, meeting_time);

-- Comments
COMMENT ON TABLE meetings IS 'Admin meetings with clients';
COMMENT ON COLUMN meetings.meeting_date IS 'Date of the meeting';
COMMENT ON COLUMN meetings.meeting_time IS 'Time of the meeting (e.g., "14:30")';
COMMENT ON COLUMN meetings.client_id IS 'Reference to client (optional for internal meetings)';

-- ============================================
-- MIGRATION COMPLETE ✅
-- ============================================
