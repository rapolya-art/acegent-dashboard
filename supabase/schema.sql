-- Acegent Dashboard Schema
-- Run this in Supabase SQL Editor after creating a project

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'trial',
  minutes_limit INT DEFAULT 10,
  minutes_used INT DEFAULT 0,
  timezone TEXT DEFAULT 'Europe/Kyiv',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  is_superadmin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  language TEXT DEFAULT 'uk',
  system_prompt TEXT,
  first_message TEXT,
  llm_provider TEXT DEFAULT 'groq',
  llm_model TEXT DEFAULT 'meta-llama/llama-4-scout-17b-16e-instruct',
  llm_temperature REAL DEFAULT 0.1,
  stt_provider TEXT DEFAULT 'deepgram',
  stt_model TEXT DEFAULT 'nova-3',
  stt_language TEXT DEFAULT 'uk',
  tts_provider TEXT DEFAULT 'elevenlabs',
  tts_model TEXT DEFAULT 'eleven_flash_v2_5',
  tts_voice_id TEXT DEFAULT 'U4IxWQ3B5B0suleGgLcn',
  tts_language TEXT DEFAULT 'uk',
  tts_speed REAL DEFAULT 1.2,
  tts_stability REAL DEFAULT 0.6,
  tts_similarity_boost REAL DEFAULT 0.75,
  vad_min_speech_duration REAL DEFAULT 0.2,
  vad_min_silence_duration REAL DEFAULT 0.0,
  min_endpointing_delay REAL DEFAULT 0.05,
  max_endpointing_delay REAL DEFAULT 1.0,
  total_calls INT DEFAULT 0,
  success_rate REAL DEFAULT 0,
  avg_duration_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  parameters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  provider TEXT DEFAULT 'zadarma',
  country TEXT DEFAULT 'UA',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  caller_phone TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'missed', 'failed')),
  duration_seconds INT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score REAL,
  outcome TEXT,
  summary TEXT,
  recording_url TEXT,
  cost_llm REAL DEFAULT 0,
  cost_stt REAL DEFAULT 0,
  cost_tts REAL DEFAULT 0,
  livekit_room_name TEXT,
  livekit_room_sid TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('agent', 'caller', 'system')),
  text TEXT NOT NULL,
  start_time REAL,
  end_time REAL,
  tool_call TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'markdown',
  content TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'error')),
  chunks INT DEFAULT 0,
  size_bytes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'calendly',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  api_key TEXT,
  calendly_user_uri TEXT,
  calendly_event_type_uri TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMPTZ,
  google_calendar_id TEXT DEFAULT 'primary',
  connected_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Simple policies: allow all for authenticated users (single-org for now)
CREATE POLICY "authenticated_all" ON organizations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON user_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON organization_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON agents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON agent_tools FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON phone_numbers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON calls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON transcript_segments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON knowledge_base_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON calendar_integrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON ticket_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- AUTO-CREATE user_profile + org membership ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');

  -- Get default org (first one)
  SELECT id INTO org_id FROM organizations LIMIT 1;

  -- Add user to org if exists
  IF org_id IS NOT NULL THEN
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (org_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED DATA (from real agent at Livekit/agent/)
-- ============================================================

INSERT INTO organizations (id, name, slug, plan, minutes_limit, minutes_used)
VALUES ('00000000-0000-0000-0000-000000000001', 'Lumina Denta', 'lumina-denta', 'trial', 10, 0);

INSERT INTO agents (id, organization_id, name, status, language,
  system_prompt, first_message,
  llm_provider, llm_model, llm_temperature,
  stt_provider, stt_model, stt_language,
  tts_provider, tts_model, tts_voice_id, tts_language, tts_speed, tts_stability, tts_similarity_boost,
  vad_min_speech_duration, vad_min_silence_duration,
  min_endpointing_delay, max_endpointing_delay)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Lumina Denta',
  'active', 'uk',
  E'Ти - голосовий асистент стоматологічної клініки Lumina Denta. Відповідай українською мовою.\n\nПРАВИЛА:\n- Відповідай коротко, одне-два речення.\n- Кажи "у нас" замість "у клініці Люміна Дента".\n- Числа та ціни — словами (тисяча п''ятсот гривень, а не 1500 грн).\n- Коли тулза повертає відповідь що починається з "Скажи клієнту:" — перекажи цей текст клієнту дослівно, нічого не додаючи від себе.\n\nЗАПИС НА ПРИЙОМ:\n- Якщо клієнт каже "завтра", "в понеділок" тощо — вирахуй дату сам.\n- Якщо клієнт не назвав лікаря — запитай що саме турбує або яка послуга потрібна, і запропонуй відповідного лікаря: Олена Ковальчук — терапевт (карієс, пломби, чистка, консультація), Максим Бондаренко — хірург-імплантолог (видалення, імплантація), Ірина Савченко — ортодонт (брекети, елайнери). Якщо клієнт каже "будь-який" або "без різниці" — запиши до Олени Ковальчук.\n- Дізнайся лікаря і дату, потім виклич check_slots.\n- Коли клієнт обрав час — запитай ім''я, потім підтверди номер телефону. Якщо клієнт підтвердив — виклич book.\n- Після успішного запису НЕ додавай нічого від себе — просто перекажи відповідь тулзи.',
  'Клініка Lumina Denta! Чим можу допомогти?',
  'groq', 'meta-llama/llama-4-scout-17b-16e-instruct', 0.1,
  'deepgram', 'nova-3', 'uk',
  'elevenlabs', 'eleven_flash_v2_5', 'U4IxWQ3B5B0suleGgLcn', 'uk', 1.2, 0.6, 0.75,
  0.2, 0.0,
  0.05, 1.0
);

INSERT INTO agent_tools (agent_id, name, description, enabled) VALUES
  ('00000000-0000-0000-0000-000000000002', 'check_slots', 'Перевірити вільні слоти лікаря. Викликається коли клієнт хоче записатися і вже назвав лікаря та дату.', true),
  ('00000000-0000-0000-0000-000000000002', 'book', 'Записати клієнта на прийом. Викликається ТІЛЬКИ коли клієнт назвав ім''я І підтвердив номер телефону.', true),
  ('00000000-0000-0000-0000-000000000002', 'price', 'Дізнатися ціну на послугу клініки.', true);

INSERT INTO phone_numbers (organization_id, agent_id, number, provider, country, status)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
        '+380 44 XXX XXXX', 'zadarma', 'UA', 'active');

INSERT INTO knowledge_base_documents (organization_id, agent_id, title, type, status, chunks, size_bytes) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'dental_info_short.md', 'markdown', 'ready', 8, 4096),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'dental_info.md', 'markdown', 'ready', 24, 12288);
