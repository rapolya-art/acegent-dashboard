export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  minutes_limit: number;
  minutes_used: number;
  timezone: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_superadmin: boolean;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "viewer";
  created_at: string;
  user_profiles?: UserProfile;
}

export interface Agent {
  id: string;
  organization_id: string;
  name: string;
  status: "active" | "inactive" | "error";
  language: string;
  system_prompt: string | null;
  first_message: string | null;
  llm_provider: string;
  llm_model: string;
  llm_temperature: number;
  stt_provider: string;
  stt_model: string;
  stt_language: string;
  tts_provider: string;
  tts_model: string;
  tts_voice_id: string;
  tts_language: string;
  tts_speed: number;
  tts_stability: number;
  tts_similarity_boost: number;
  vad_min_speech_duration: number;
  vad_min_silence_duration: number;
  min_endpointing_delay: number;
  max_endpointing_delay: number;
  total_calls: number;
  success_rate: number;
  avg_duration_seconds: number;
  active_workflow_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentTool {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  parameters: Record<string, unknown>;
  created_at: string;
}

export interface PhoneNumber {
  id: string;
  organization_id: string;
  agent_id: string | null;
  number: string;
  provider: string;
  country: string;
  status: "active" | "inactive";
  created_at: string;
  agents?: Agent;
}

export interface Call {
  id: string;
  organization_id: string;
  agent_id: string | null;
  caller_phone: string | null;
  status: "in_progress" | "completed" | "missed" | "failed";
  duration_seconds: number | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  sentiment_score: number | null;
  outcome: string | null;
  summary: string | null;
  recording_url: string | null;
  cost_llm: number;
  cost_stt: number;
  cost_tts: number;
  livekit_room_name: string | null;
  livekit_room_sid: string | null;
  metadata: Record<string, unknown>;
  started_at: string;
  ended_at: string | null;
  direction: "inbound" | "outbound" | null;
  campaign_id: string | null;
  lead_id: string | null;
  agents?: Agent;
  leads?: { name: string | null; phone: string } | null;
}

export interface TranscriptSegment {
  id: string;
  call_id: string;
  speaker: "agent" | "caller" | "system";
  text: string;
  start_time: number | null;
  end_time: number | null;
  tool_call: string | null;
  created_at: string;
}

export interface KBDocument {
  id: string;
  organization_id: string;
  agent_id: string | null;
  title: string;
  type: string;
  content: string | null;
  file_url: string | null;
  status: "processing" | "ready" | "error";
  chunks: number;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  agents?: Agent;
}

export interface SupportTicket {
  id: string;
  organization_id: string;
  user_id: string | null;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string | null;
  message: string;
  is_staff: boolean;
  created_at: string;
}

export interface CalendarIntegration {
  id: string;
  organization_id: string;
  agent_id: string | null;
  provider: "calendly" | "google";
  status: "active" | "inactive" | "error";
  api_key: string | null;
  calendly_user_uri: string | null;
  calendly_event_type_uri: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expires_at: string | null;
  google_calendar_id: string | null;
  connected_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  agents?: Agent;
}

export interface CallStats {
  calls_today: number;
  avg_duration_seconds: number;
  success_rate: number;
  minutes_used: number;
  minutes_limit: number;
}

// ============================================================
// WORKFLOWS
// ============================================================

export type WorkflowNodeType =
  | "greeting"
  | "question"
  | "rag_lookup"
  | "tool_call"
  | "condition"
  | "transfer"
  | "hangup"
  | "llm_response"
  | "set_variable";

export type WorkflowEdgeType =
  | "default"
  | "success"
  | "failure"
  | "timeout"
  | "intent";

export interface Workflow {
  id: string;
  agent_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  version: number;
  status: "draft" | "active" | "archived";
  viewport: { x: number; y: number; zoom: number };
  state_schema: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  type: WorkflowNodeType;
  label: string;
  position_x: number;
  position_y: number;
  config: Record<string, unknown>;
  instructions: string | null;
  tools: string[];
  kb_document_ids: string[];
  is_entry: boolean;
  created_at: string;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  condition: Record<string, unknown>;
  priority: number;
  edge_type: WorkflowEdgeType;
  created_at: string;
}

// ============================================================
// CAMPAIGNS
// ============================================================

export interface Campaign {
  id: string;
  organization_id: string;
  agent_id: string | null;
  workflow_id: string | null;
  name: string;
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  max_concurrent_calls: number;
  calls_per_minute: number;
  total_contacts: number;
  calls_made: number;
  calls_answered: number;
  calls_failed: number;
  max_retries: number;
  retry_delay_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  phone_number: string;
  name: string | null;
  variables: Record<string, unknown>;
  status: "pending" | "queued" | "calling" | "completed" | "failed" | "no_answer" | "skipped";
  attempts: number;
  last_attempt_at: string | null;
  call_id: string | null;
  lead_id: string | null;
  created_at: string;
}

// ============================================================
// LEADS
// ============================================================

export type LeadStatus = "new" | "contacted" | "qualified" | "appointment" | "won" | "lost";

export interface Lead {
  id: string;
  organization_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  company: string | null;
  position: string | null;
  tags: string[];
  notes: string | null;
  custom_fields: Record<string, unknown>;
  status: LeadStatus;
  source: string | null;
  created_at: string;
  updated_at: string;
}
