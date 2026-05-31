-- Store the actual email send/receive date (from the email headers)
-- separate from created_at (which is the ingestion time).
ALTER TABLE order_emails ADD COLUMN IF NOT EXISTS email_date TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_order_emails_email_date ON order_emails(email_date);
