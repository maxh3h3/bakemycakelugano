-- Email thread storage for inbound/outbound emails tied to orders
-- message_id is the RFC 2822 Message-ID header used for deduplication and threading

CREATE TABLE IF NOT EXISTS order_emails (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES orders(id) ON DELETE SET NULL,
  direction    TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_email   TEXT NOT NULL,
  to_email     TEXT NOT NULL,
  subject      TEXT,
  body_text    TEXT,
  body_html    TEXT,
  message_id   TEXT UNIQUE,   -- RFC 2822 Message-ID, used for dedup
  in_reply_to  TEXT,          -- RFC 2822 In-Reply-To, used for thread linking
  resend_id    TEXT,          -- Resend email ID returned on outbound sends
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_emails_order_id   ON order_emails(order_id);
CREATE INDEX IF NOT EXISTS idx_order_emails_direction  ON order_emails(direction);
CREATE INDEX IF NOT EXISTS idx_order_emails_created_at ON order_emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_emails_message_id ON order_emails(message_id);

COMMENT ON TABLE order_emails IS 'Inbound and outbound emails linked to orders. message_id prevents duplicate ingestion.';
