ALTER TABLE order_emails ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN order_emails.attachments IS 'Array of {name, contentType, size, part, uid, url}. url is null until downloaded to Supabase Storage.';
