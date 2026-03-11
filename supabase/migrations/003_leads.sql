-- ============================================================
-- LEADS TABLE
-- ============================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  company TEXT,
  position TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','appointment','won','lost')),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique phone per org (deduplication)
CREATE UNIQUE INDEX idx_leads_org_phone ON leads(organization_id, phone);
CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_org_status ON leads(organization_id, status);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- Link calls to leads
ALTER TABLE calls ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calls_lead ON calls(lead_id);

-- Link campaign_contacts to leads
ALTER TABLE campaign_contacts ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_lead ON campaign_contacts(lead_id);

-- ============================================================
-- RPC: Bulk insert leads (ON CONFLICT skip duplicates)
-- ============================================================

CREATE OR REPLACE FUNCTION bulk_insert_leads(
  p_org_id UUID,
  p_leads JSONB
)
RETURNS INT AS $$
DECLARE
  inserted_count INT;
BEGIN
  WITH ins AS (
    INSERT INTO leads (organization_id, phone, name, email, company, position, tags, notes, custom_fields, source)
    SELECT
      p_org_id,
      elem->>'phone',
      elem->>'name',
      elem->>'email',
      elem->>'company',
      elem->>'position',
      COALESCE(
        (SELECT array_agg(t::text) FROM jsonb_array_elements_text(elem->'tags') AS t),
        '{}'
      ),
      elem->>'notes',
      COALESCE(elem->'custom_fields', '{}'),
      COALESCE(elem->>'source', 'csv_import')
    FROM jsonb_array_elements(p_leads) AS elem
    ON CONFLICT (organization_id, phone) DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO inserted_count FROM ins;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: Create campaign_contacts from selected leads
-- ============================================================

CREATE OR REPLACE FUNCTION create_campaign_contacts_from_leads(
  p_campaign_id UUID,
  p_lead_ids UUID[]
)
RETURNS INT AS $$
DECLARE
  inserted_count INT;
BEGIN
  WITH ins AS (
    INSERT INTO campaign_contacts (campaign_id, phone_number, name, variables, lead_id)
    SELECT
      p_campaign_id,
      l.phone,
      l.name,
      jsonb_build_object(
        'email', l.email,
        'company', l.company,
        'position', l.position,
        'custom_fields', l.custom_fields
      ),
      l.id
    FROM unnest(p_lead_ids) AS lid
    JOIN leads l ON l.id = lid
    RETURNING id
  )
  SELECT count(*) INTO inserted_count FROM ins;

  -- Update campaign total_contacts
  UPDATE campaigns
  SET total_contacts = (
    SELECT count(*) FROM campaign_contacts WHERE campaign_id = p_campaign_id
  ), updated_at = now()
  WHERE id = p_campaign_id;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
