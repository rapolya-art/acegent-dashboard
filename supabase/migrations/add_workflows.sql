-- Migration: Add workflows, workflow_nodes, workflow_edges, campaigns, campaign_contacts
-- Run this in Supabase SQL Editor AFTER the initial schema.sql

-- ============================================================
-- NEW TABLES
-- ============================================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version INT DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  state_schema JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'greeting', 'question', 'rag_lookup', 'tool_call',
    'condition', 'transfer', 'hangup', 'llm_response', 'set_variable'
  )),
  label TEXT NOT NULL,
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  config JSONB DEFAULT '{}',
  instructions TEXT,
  tools TEXT[] DEFAULT '{}',
  kb_document_ids UUID[] DEFAULT '{}',
  is_entry BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  label TEXT,
  condition JSONB DEFAULT '{}',
  priority INT DEFAULT 0,
  edge_type TEXT DEFAULT 'default' CHECK (edge_type IN ('default', 'success', 'failure', 'timeout', 'intent')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  max_concurrent_calls INT DEFAULT 1,
  calls_per_minute INT DEFAULT 2,
  total_contacts INT DEFAULT 0,
  calls_made INT DEFAULT 0,
  calls_answered INT DEFAULT 0,
  calls_failed INT DEFAULT 0,
  max_retries INT DEFAULT 2,
  retry_delay_minutes INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  name TEXT,
  variables JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'calling', 'completed', 'failed', 'no_answer', 'skipped')),
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ALTER EXISTING TABLES (nullable columns, zero risk)
-- ============================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS active_workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound'));
ALTER TABLE calls ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON workflows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON workflow_nodes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON workflow_edges FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON campaign_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_workflows_agent ON workflows(agent_id);
CREATE INDEX idx_workflows_org ON workflows(organization_id);
CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_edges_workflow ON workflow_edges(workflow_id);
CREATE INDEX idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX idx_campaign_contacts_campaign ON campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_status ON campaign_contacts(campaign_id, status);

-- ============================================================
-- RPC FUNCTIONS (for atomic counter increments from worker)
-- ============================================================

CREATE OR REPLACE FUNCTION increment_campaign_calls_made(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET calls_made = calls_made + 1, updated_at = now()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_calls_answered(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET calls_answered = calls_answered + 1, updated_at = now()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_calls_failed(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET calls_failed = calls_failed + 1, updated_at = now()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_contact_attempts(p_contact_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaign_contacts
  SET attempts = attempts + 1
  WHERE id = p_contact_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
