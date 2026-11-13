-- Conversations show both halves: INBOX syncs as inbound, the Sent folder as outbound.

-- Thread delete hides rows instead of removing them. The IMAP sync re-reads a
-- lookback window and dedups on message_id, so a removed row would come back.
ALTER TABLE order_emails ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
COMMENT ON COLUMN order_emails.hidden_at IS 'Set when the owner deletes the thread; the row stays so the sync never re-imports it.';

-- The contact address (inbound sender / outbound recipient) is stored lowercase
-- so both halves of a conversation group under one contact.
UPDATE order_emails SET from_email = lower(from_email)
  WHERE direction = 'inbound' AND from_email <> lower(from_email);
UPDATE order_emails SET to_email = lower(to_email)
  WHERE direction = 'outbound' AND to_email <> lower(to_email);
