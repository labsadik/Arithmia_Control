CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  status TEXT NOT NULL DEFAULT 'running',
  environment TEXT NOT NULL DEFAULT 'production',
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC(5,2) NOT NULL DEFAULT 100,
  tokens_used BIGINT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view agents" ON public.agents FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.approvals TO anon;
GRANT UPDATE (status, resolved_at, resolved_by) ON public.approvals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approvals" ON public.approvals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can resolve pending approvals" ON public.approvals FOR UPDATE TO anon, authenticated USING (status = 'pending') WITH CHECK (status IN ('approved', 'rejected'));

CREATE TABLE public.activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view activity events" ON public.activity_events FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;

INSERT INTO public.agents (name, model, status, environment, tasks_completed, success_rate, tokens_used, cost_usd, last_active_at) VALUES
  ('Agent Alpha', 'gpt-4o', 'running', 'production', 1284, 99.50, 4200000, 120.00, now() - interval '12 seconds'),
  ('Agent Beta', 'claude-sonnet-4', 'running', 'production', 986, 99.10, 3100000, 95.00, now() - interval '40 seconds'),
  ('Agent Gamma', 'gpt-4o-mini', 'running', 'staging', 2210, 98.90, 5600000, 150.00, now() - interval '1 minute'),
  ('Agent Delta', 'gpt-4o', 'running', 'production', 764, 99.40, 2400000, 80.00, now() - interval '2 minutes'),
  ('Agent Epsilon', 'llama-4-maverick', 'running', 'production', 1532, 99.60, 4800000, 110.00, now() - interval '3 minutes'),
  ('Agent Zeta', 'gpt-4o-mini', 'running', 'staging', 640, 98.70, 1900000, 60.00, now() - interval '5 minutes'),
  ('Agent Eta', 'claude-sonnet-4', 'running', 'production', 1876, 99.30, 5200000, 140.00, now() - interval '8 seconds'),
  ('Agent Theta', 'gpt-4o', 'running', 'production', 432, 99.00, 1400000, 75.00, now() - interval '6 minutes'),
  ('Agent Iota', 'gpt-4o-mini', 'running', 'staging', 918, 99.20, 2900000, 90.00, now() - interval '25 seconds'),
  ('Agent Kappa', 'llama-4-maverick', 'running', 'production', 355, 99.50, 1100000, 55.00, now() - interval '4 minutes'),
  ('Agent Lambda', 'gpt-4o', 'running', 'production', 1103, 98.50, 3600000, 65.00, now() - interval '50 seconds'),
  ('Agent Mu', 'gpt-4o-mini', 'running', 'staging', 1490, 99.70, 4100000, 70.00, now() - interval '1 minute'),
  ('Agent Nu', 'claude-sonnet-4', 'running', 'production', 287, 99.00, 900000, 45.00, now() - interval '7 minutes'),
  ('Agent Xi', 'gpt-4o', 'running', 'production', 829, 99.40, 2700000, 85.00, now() - interval '90 seconds'),
  ('Agent Omicron', 'gpt-4o-mini', 'idle', 'staging', 512, 98.20, 1600000, 38.00, now() - interval '3 hours'),
  ('Agent Pi', 'gpt-4o', 'paused', 'production', 2044, 97.80, 7300000, 162.00, now() - interval '1 day');

INSERT INTO public.approvals (agent_id, agent_name, action_type, title, description, risk_level, status, payload, requested_at) VALUES
  ((SELECT id FROM public.agents WHERE name = 'Agent Alpha'), 'Agent Alpha', 'stripe_payout', 'Stripe payout of $500.00', 'Agent Alpha requested a $500 Stripe payout to the connected affiliate account as part of the monthly settlement workflow.', 'high', 'pending', '{"request_id": "req_9f2ka71m", "tool": "stripe.create_payout", "method": "POST", "endpoint": "https://api.stripe.com/v1/payouts", "parameters": {"amount": 50000, "currency": "usd", "destination": "ba_1NqW2eLkdIwHu7ix", "statement_descriptor": "AFFILIATE SETTLEMENT"}, "context": {"workflow": "monthly_affiliate_settlement", "trigger": "cron:0 0 1 * *", "prior_payouts_90d": 3}, "risk_analysis": {"amount_above_auto_threshold": true, "auto_approve_limit_usd": 250, "destination_verified": true}, "reasoning_trace": ["Detected unsettled affiliate balance of $500.00", "Auto-approve limit is $250.00 — escalating to human", "Prepared payout payload, awaiting approval"]}'::jsonb, now() - interval '18 minutes'),
  ((SELECT id FROM public.agents WHERE name = 'Agent Beta'), 'Agent Beta', 'data_deletion', 'Delete 50 inactive user records', 'Agent Beta requested deletion of 50 user records flagged inactive for 400+ days during the data-retention cleanup job.', 'critical', 'pending', '{"request_id": "req_4bx88q2d", "tool": "supabase.bulk_delete", "method": "DELETE", "endpoint": "https://db.internal/v1/users", "parameters": {"filter": "last_login_at < now() - interval ''400 days''", "row_count": 50, "sample_ids": ["u_1029", "u_2044", "u_3110"]}, "context": {"workflow": "gdpr_retention_cleanup", "trigger": "scheduled_weekly", "backup_snapshot": "snap_2026_08_22_001"}, "risk_analysis": {"destructive": true, "reversible": false, "pii_affected": true}, "reasoning_trace": ["Identified 50 records past retention policy", "Verified snapshot snap_2026_08_22_001 exists", "Deletion is irreversible — escalating to human"]}'::jsonb, now() - interval '42 minutes'),
  ((SELECT id FROM public.agents WHERE name = 'Agent Gamma'), 'Agent Gamma', 'email_campaign', 'Send 1,200 onboarding emails', 'Agent Gamma requested to send the onboarding sequence to 1,200 newly imported trial users.', 'low', 'pending', '{"request_id": "req_7tm41c9p", "tool": "resend.send_batch", "method": "POST", "endpoint": "https://api.resend.com/emails/batch", "parameters": {"template": "onboarding_v3", "recipient_count": 1200, "segment": "trial_users_aug22", "send_window": "09:00-11:00 local"}, "context": {"workflow": "trial_onboarding", "trigger": "csv_import_completed"}, "risk_analysis": {"destructive": false, "unsubscribe_link_present": true, "suppression_list_checked": true}, "reasoning_trace": ["Imported 1,200 trial users", "Rendered template onboarding_v3 successfully", "Batch within daily sending quota — queued for approval"]}'::jsonb, now() - interval '1 hour'),
  ((SELECT id FROM public.agents WHERE name = 'Agent Delta'), 'Agent Delta', 'key_rotation', 'Rotate staging API keys', 'Agent Delta requested rotation of 3 staging API keys older than 90 days.', 'low', 'approved', '{"request_id": "req_2zz90r5k", "tool": "vault.rotate_keys", "method": "POST", "endpoint": "https://vault.internal/v1/keys/rotate", "parameters": {"keys": ["staging_openai", "staging_resend", "staging_stripe"], "grace_period_hours": 24}, "context": {"workflow": "security_hygiene", "trigger": "scheduled_monthly"}, "risk_analysis": {"destructive": false, "grace_period": true}, "reasoning_trace": ["3 keys exceed 90-day rotation policy", "Staging only — production untouched"]}'::jsonb, now() - interval '5 hours'),
  ((SELECT id FROM public.agents WHERE name = 'Agent Epsilon'), 'Agent Epsilon', 'data_export', 'Export full customer database', 'Agent Epsilon requested a full export of the customer database to an external S3 bucket for the analytics sync job.', 'critical', 'rejected', '{"request_id": "req_8qw33v8n", "tool": "s3.bulk_export", "method": "PUT", "endpoint": "s3://ext-analytics-mirror/customers/", "parameters": {"tables": ["customers", "orders", "payment_methods"], "row_estimate": 184220, "encryption": "none"}, "context": {"workflow": "analytics_mirror_sync", "trigger": "manual_agent_decision"}, "risk_analysis": {"destructive": false, "pii_affected": true, "unencrypted_destination": true, "external_bucket": true}, "reasoning_trace": ["Analytics mirror requested full refresh", "Destination bucket lacks encryption policy", "Flagged: unencrypted PII export to external bucket"]}'::jsonb, now() - interval '7 hours');

UPDATE public.approvals SET resolved_at = now() - interval '4 hours', resolved_by = 'Jane Doe' WHERE action_type = 'key_rotation';
UPDATE public.approvals SET resolved_at = now() - interval '6 hours', resolved_by = 'Jane Doe' WHERE action_type = 'data_export';

INSERT INTO public.activity_events (agent_name, status, message, created_at) VALUES
  ('Agent Eta', 'running', 'Processing batch #4821 of support tickets', now() - interval '20 seconds'),
  ('Agent Iota', 'running', 'Crawling knowledge base for re-index', now() - interval '1 minute'),
  ('Agent Alpha', 'completed', 'Completed Q3 revenue reconciliation report', now() - interval '3 minutes'),
  ('Agent Beta', 'action_required', 'Waiting on approval: delete 50 user records', now() - interval '5 minutes'),
  ('Agent Gamma', 'completed', 'Sent weekly digest to 1,240 subscribers', now() - interval '9 minutes'),
  ('Agent Delta', 'running', 'Rotating staging API keys', now() - interval '14 minutes'),
  ('Agent Epsilon', 'failed', 'CRM sync failed: timeout after 30s', now() - interval '22 minutes'),
  ('Agent Zeta', 'completed', 'Generated 38 product descriptions', now() - interval '31 minutes');