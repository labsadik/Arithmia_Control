-- ============================================================================
-- OmniAgent Control — workspace_settings
-- ============================================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Workspace
  workspace_name TEXT NOT NULL DEFAULT 'OmniAgent Control',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',

  -- Approval policy
  require_approval BOOLEAN NOT NULL DEFAULT true,
  auto_approve_low_risk BOOLEAN NOT NULL DEFAULT false,

  low_risk_threshold INTEGER NOT NULL DEFAULT 30
    CHECK (low_risk_threshold >= 0 AND low_risk_threshold <= 100),

  critical_risk_threshold INTEGER NOT NULL DEFAULT 80
    CHECK (critical_risk_threshold >= 0 AND critical_risk_threshold <= 100),

  -- Notifications
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  slack_notifications BOOLEAN NOT NULL DEFAULT false,
  failure_alerts BOOLEAN NOT NULL DEFAULT true,
  daily_summary BOOLEAN NOT NULL DEFAULT true,

  -- Security
  require_authentication BOOLEAN NOT NULL DEFAULT true,
  protect_api_keys BOOLEAN NOT NULL DEFAULT true,
  restrict_external_access BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Critical threshold cannot be below low-risk threshold
  CONSTRAINT workspace_settings_threshold_order
    CHECK (
      critical_risk_threshold >= low_risk_threshold
    )
);


-- ============================================================================
-- 2. Permissions
-- ============================================================================

GRANT SELECT
ON public.workspace_settings
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.workspace_settings
TO authenticated;

GRANT ALL
ON public.workspace_settings
TO service_role;


-- ============================================================================
-- 3. Row Level Security
-- ============================================================================

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Anyone can view workspace settings"
ON public.workspace_settings;

CREATE POLICY "Anyone can view workspace settings"
ON public.workspace_settings
FOR SELECT
TO anon, authenticated
USING (true);


DROP POLICY IF EXISTS "Authenticated users can manage workspace settings"
ON public.workspace_settings;

CREATE POLICY "Authenticated users can manage workspace settings"
ON public.workspace_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- ============================================================================
-- 4. updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$
LANGUAGE plpgsql
SET search_path = public;


-- ============================================================================
-- 5. updated_at trigger
-- ============================================================================

DROP TRIGGER IF EXISTS update_workspace_settings_updated_at
ON public.workspace_settings;

CREATE TRIGGER update_workspace_settings_updated_at
BEFORE UPDATE ON public.workspace_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 6. Realtime
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'workspace_settings'
  ) THEN

    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.workspace_settings;

  END IF;
END
$$;


-- ============================================================================
-- 7. MOCK / DEMO DATA
-- ============================================================================

INSERT INTO public.workspace_settings (
  workspace_name,
  timezone,

  require_approval,
  auto_approve_low_risk,
  low_risk_threshold,
  critical_risk_threshold,

  email_notifications,
  slack_notifications,
  failure_alerts,
  daily_summary,

  require_authentication,
  protect_api_keys,
  restrict_external_access
)
VALUES (
  'OmniAgent Control',
  'Asia/Kolkata',

  true,
  false,
  30,
  80,

  true,
  false,
  true,
  true,

  true,
  true,
  false
);


-- ============================================================================
-- 8. Verify
-- ============================================================================

SELECT *
FROM public.workspace_settings
ORDER BY created_at DESC;