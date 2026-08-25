-- ============================================================================
-- API Management — LLM Model API Keys & Configuration
-- ============================================================================

-- ----------------------------------------------------------------------------
-- api_providers — Supported LLM providers
-- ----------------------------------------------------------------------------
CREATE TABLE public.api_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  base_url TEXT NOT NULL,
  default_model TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.api_providers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_providers TO authenticated;
GRANT ALL ON public.api_providers TO service_role;
ALTER TABLE public.api_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view api providers" ON public.api_providers
  FOR SELECT TO anon, authenticated USING (true);

-- ----------------------------------------------------------------------------
-- api_keys — Encrypted API keys for LLM providers
-- ----------------------------------------------------------------------------
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL, -- Will be encrypted at rest
  environment TEXT NOT NULL DEFAULT 'production', -- production | staging | development
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rate_limit_per_minute INTEGER DEFAULT 60,
  usage_limit_per_day INTEGER DEFAULT 10000,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.api_keys TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view api keys" ON public.api_keys
  FOR SELECT TO authenticated USING (auth.uid() = created_by OR auth.role() = 'service_role');
CREATE POLICY "Users can manage own api keys" ON public.api_keys
  FOR ALL TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- ----------------------------------------------------------------------------
-- api_usage_logs — Track API usage per key
-- ----------------------------------------------------------------------------
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.api_providers(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  request_type TEXT NOT NULL, -- completion | embedding | fine-tune
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.api_usage_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_usage_logs TO authenticated;
GRANT ALL ON public.api_usage_logs TO service_role;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view api usage" ON public.api_usage_logs
  FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- Insert default providers
-- ----------------------------------------------------------------------------
INSERT INTO public.api_providers (name, display_name, icon, description, base_url, default_model) VALUES
  ('openai', 'OpenAI', '🤖', 'OpenAI GPT models including GPT-4 and GPT-3.5', 'https://api.openai.com/v1', 'gpt-4o'),
  ('anthropic', 'Anthropic', '🧠', 'Anthropic Claude models', 'https://api.anthropic.com/v1', 'claude-3-5-sonnet-20241022'),
  ('google', 'Google AI', '🔬', 'Google Gemini and PaLM models', 'https://generativelanguage.googleapis.com/v1', 'gemini-1.5-pro'),
  ('cohere', 'Cohere', '📊', 'Cohere embedding and generation models', 'https://api.cohere.ai/v1', 'command-r'),
  ('mistral', 'Mistral AI', '⚡', 'Mistral open-source models', 'https://api.mistral.ai/v1', 'mistral-large-2411'),
  ('deepseek', 'DeepSeek', '🎯', 'DeepSeek reasoning models', 'https://api.deepseek.ai/v1', 'deepseek-chat');

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_providers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_keys;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_usage_logs;

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_api_providers_updated_at BEFORE UPDATE ON public.api_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();