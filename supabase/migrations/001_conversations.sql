-- Contacts (Telegram users / future channels)
CREATE TABLE IF NOT EXISTS contacts (
  id          BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  name        TEXT NOT NULL,
  username    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations (one per contact-channel pair, "open" = active)
CREATE TABLE IF NOT EXISTS conversations (
  id              BIGSERIAL PRIMARY KEY,
  contact_id      BIGINT REFERENCES contacts(id),
  channel         TEXT NOT NULL DEFAULT 'telegram',
  status          TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (incoming from user, outgoing from agent, private = AI suggestion)
CREATE TABLE IF NOT EXISTS messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  message_type    TEXT NOT NULL DEFAULT 'incoming',
  private         BOOLEAN NOT NULL DEFAULT FALSE,
  sender_type     TEXT DEFAULT 'contact',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id, created_at);

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- RLS (service role key bypasses; anon has no access)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
