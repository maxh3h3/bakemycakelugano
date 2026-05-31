-- RLS policies for order_emails
-- Uses the same pattern as other tables in this project:
-- service_role bypasses RLS entirely (used by the app server)
-- anon/authenticated roles have no direct access (all access goes through API routes)

ALTER TABLE order_emails ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by supabaseAdmin in API routes and cron)
CREATE POLICY "service_role_all" ON order_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
