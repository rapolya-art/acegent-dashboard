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
  agents?: Agent;
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
