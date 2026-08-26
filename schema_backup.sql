-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  model text NOT NULL DEFAULT 'gpt-4o'::text,
  status text NOT NULL DEFAULT 'running'::text,
  environment text NOT NULL DEFAULT 'production'::text,
  tasks_completed integer NOT NULL DEFAULT 0,
  success_rate numeric NOT NULL DEFAULT 100,
  tokens_used bigint NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0,
  last_active_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid,
  agent_name text NOT NULL,
  action_type text NOT NULL,
  title text NOT NULL,
  description text,
  risk_level text NOT NULL DEFAULT 'low'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT approvals_pkey PRIMARY KEY (id),
  CONSTRAINT approvals_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id)
);
CREATE TABLE public.activity_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  status text NOT NULL DEFAULT 'running'::text,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.workspace_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_name text NOT NULL DEFAULT 'OmniAgent Control'::text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata'::text,
  require_approval boolean NOT NULL DEFAULT true,
  auto_approve_low_risk boolean NOT NULL DEFAULT false,
  low_risk_threshold integer NOT NULL DEFAULT 30 CHECK (low_risk_threshold >= 0 AND low_risk_threshold <= 100),
  critical_risk_threshold integer NOT NULL DEFAULT 80 CHECK (critical_risk_threshold >= 0 AND critical_risk_threshold <= 100),
  email_notifications boolean NOT NULL DEFAULT true,
  slack_notifications boolean NOT NULL DEFAULT false,
  failure_alerts boolean NOT NULL DEFAULT true,
  daily_summary boolean NOT NULL DEFAULT true,
  require_authentication boolean NOT NULL DEFAULT true,
  protect_api_keys boolean NOT NULL DEFAULT true,
  restrict_external_access boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workspace_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.api_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  icon text,
  description text,
  base_url text NOT NULL,
  default_model text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT api_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  name text NOT NULL,
  api_key text NOT NULL,
  environment text NOT NULL DEFAULT 'production'::text CHECK (environment = ANY (ARRAY['production'::text, 'staging'::text, 'development'::text])),
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone,
  rate_limit_per_minute integer DEFAULT 60,
  usage_limit_per_day integer DEFAULT 10000,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.api_providers(id)
);
CREATE TABLE public.api_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_key_id uuid,
  provider_id uuid,
  model text NOT NULL,
  request_type text NOT NULL CHECK (request_type = ANY (ARRAY['completion'::text, 'embedding'::text, 'fine-tune'::text, 'chat'::text, 'vision'::text])),
  tokens_used integer NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0,
  latency_ms integer,
  status_code integer,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT api_usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT api_usage_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id),
  CONSTRAINT api_usage_logs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.api_providers(id)
);
CREATE TABLE public.workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT ''::text,
  enabled boolean NOT NULL DEFAULT true,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workflows_pkey PRIMARY KEY (id)
);
CREATE TABLE public.brain_scan_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scan_type text NOT NULL DEFAULT '360_face_scan'::text,
  status text NOT NULL DEFAULT 'idle'::text CHECK (status = ANY (ARRAY['idle'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])),
  progress numeric NOT NULL DEFAULT 0 CHECK (progress >= 0::numeric AND progress <= 100::numeric),
  quality_score numeric NOT NULL DEFAULT 0 CHECK (quality_score >= 0::numeric AND quality_score <= 100::numeric),
  frames_processed integer NOT NULL DEFAULT 0,
  ai_latency_ms integer NOT NULL DEFAULT 0,
  throughput_per_second integer NOT NULL DEFAULT 0,
  source_type text DEFAULT 'web'::text,
  client_id uuid,
  lead_id uuid,
  model_name text,
  model_version text,
  storage_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT brain_scan_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.brain_workflow_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_id uuid,
  action text NOT NULL,
  description text NOT NULL,
  actor_type text NOT NULL DEFAULT 'operator'::text CHECK (actor_type = ANY (ARRAY['operator'::text, 'system'::text, 'ai'::text])),
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT brain_workflow_audit_pkey PRIMARY KEY (id),
  CONSTRAINT brain_workflow_audit_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id)
);
CREATE TABLE public.brain_nodes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  node_key text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT ''::text,
  node_type text NOT NULL,
  icon text NOT NULL DEFAULT 'cpu'::text,
  tone text NOT NULL DEFAULT 'blue'::text,
  status text NOT NULL DEFAULT 'online'::text,
  description text NOT NULL DEFAULT ''::text,
  position_x numeric NOT NULL DEFAULT 100,
  position_y numeric NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  autonomous boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT brain_nodes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.brain_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_node_id uuid NOT NULL,
  target_node_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'LIVE DATA'::text,
  direction text NOT NULL DEFAULT 'outbound'::text CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text, 'bidirectional'::text])),
  enabled boolean NOT NULL DEFAULT true,
  throughput_per_second integer NOT NULL DEFAULT 0,
  packets_total bigint NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  last_packet_at timestamp with time zone,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT brain_connections_pkey PRIMARY KEY (id),
  CONSTRAINT brain_connections_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.brain_nodes(id),
  CONSTRAINT brain_connections_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES public.brain_nodes(id)
);
CREATE TABLE public.brain_flow_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  connection_id uuid,
  source_node_id uuid,
  target_node_id uuid,
  event_type text NOT NULL DEFAULT 'data'::text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT brain_flow_events_pkey PRIMARY KEY (id),
  CONSTRAINT brain_flow_events_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.brain_connections(id),
  CONSTRAINT brain_flow_events_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.brain_nodes(id),
  CONSTRAINT brain_flow_events_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES public.brain_nodes(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  position text,
  email text,
  bio text,
  website text,
  avatar_url text,
  media_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);