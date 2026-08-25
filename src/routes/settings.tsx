import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  Save,
  Settings,
  Shield,
  SlidersHorizontal,
  Undo2,
  Globe2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      {
        title: "Settings — OmniAgent Control",
      },
      {
        name: "description",
        content:
          "Configure OmniAgent Control workspace, approval, notification, and security settings.",
      },
      {
        property: "og:title",
        content: "Settings — OmniAgent Control",
      },
      {
        property: "og:description",
        content:
          "Configure OmniAgent Control workspace, approval, notification, and security settings.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
    ],
  }),
  component: SettingsPage,
});

type WorkspaceSettings = Tables<"workspace_settings">;

type SettingsForm = {
  workspace_name: string;
  timezone: string;

  require_approval: boolean;
  auto_approve_low_risk: boolean;
  low_risk_threshold: number;
  critical_risk_threshold: number;

  email_notifications: boolean;
  slack_notifications: boolean;
  failure_alerts: boolean;
  daily_summary: boolean;

  require_authentication: boolean;
  protect_api_keys: boolean;
  restrict_external_access: boolean;
};

const DEFAULT_SETTINGS: SettingsForm = {
  workspace_name: "OmniAgent Control",
  timezone: "Asia/Kolkata",

  require_approval: true,
  auto_approve_low_risk: false,
  low_risk_threshold: 30,
  critical_risk_threshold: 80,

  email_notifications: true,
  slack_notifications: false,
  failure_alerts: true,
  daily_summary: true,

  require_authentication: true,
  protect_api_keys: true,
  restrict_external_access: false,
};

function SettingsPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  /**
   * Load workspace settings.
   */
  const {
    data: settings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["workspace-settings"],
    queryFn: async (): Promise<WorkspaceSettings | null> => {
      const { data, error } = await supabase
        .from("workspace_settings")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }
      return data;
    },
  });

  /**
   * Populate form when database settings arrive.
   */
  useEffect(() => {
    if (!settings) return;

    setSettingsId(settings.id);
    setForm({
      workspace_name: settings.workspace_name ?? DEFAULT_SETTINGS.workspace_name,
      timezone: settings.timezone ?? DEFAULT_SETTINGS.timezone,
      require_approval: settings.require_approval ?? DEFAULT_SETTINGS.require_approval,
      auto_approve_low_risk: settings.auto_approve_low_risk ?? DEFAULT_SETTINGS.auto_approve_low_risk,
      low_risk_threshold: settings.low_risk_threshold ?? DEFAULT_SETTINGS.low_risk_threshold,
      critical_risk_threshold: settings.critical_risk_threshold ?? DEFAULT_SETTINGS.critical_risk_threshold,
      email_notifications: settings.email_notifications ?? DEFAULT_SETTINGS.email_notifications,
      slack_notifications: settings.slack_notifications ?? DEFAULT_SETTINGS.slack_notifications,
      failure_alerts: settings.failure_alerts ?? DEFAULT_SETTINGS.failure_alerts,
      daily_summary: settings.daily_summary ?? DEFAULT_SETTINGS.daily_summary,
      require_authentication: settings.require_authentication ?? DEFAULT_SETTINGS.require_authentication,
      protect_api_keys: settings.protect_api_keys ?? DEFAULT_SETTINGS.protect_api_keys,
      restrict_external_access: settings.restrict_external_access ?? DEFAULT_SETTINGS.restrict_external_access,
    });
  }, [settings]);

  /**
   * Realtime settings updates.
   */
  useRealtimeTable("workspace_settings", ["workspace-settings"]);

  /**
   * Update one form value.
   */
  function updateField<K extends keyof SettingsForm>(
    field: K,
    value: SettingsForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /**
   * Save settings.
   */
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.workspace_name.trim()) throw new Error("Workspace name cannot be empty.");
      if (!form.timezone.trim()) throw new Error("Timezone cannot be empty.");
      if (form.low_risk_threshold < 0 || form.low_risk_threshold > 100)
        throw new Error("Low-risk threshold must be between 0 and 100.");
      if (form.critical_risk_threshold < 0 || form.critical_risk_threshold > 100)
        throw new Error("Critical-risk threshold must be between 0 and 100.");
      if (form.critical_risk_threshold < form.low_risk_threshold)
        throw new Error("Critical-risk threshold cannot be lower than the low-risk threshold.");

      if (settingsId) {
        const { data, error } = await supabase
          .from("workspace_settings")
          .update(form)
          .eq("id", settingsId)
          .select("*")
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("workspace_settings")
        .insert(form)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSettingsId(data.id);
      queryClient.setQueryData(["workspace-settings"], data);
      toast.success("Settings saved", {
        description: "Workspace settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast.error("Could not save settings", {
        description: error instanceof Error ? error.message : "An unexpected database error occurred.",
      });
    },
  });

  /**
   * Reset form to database values.
   */
  function resetChanges() {
    if (!settings) {
      setForm(DEFAULT_SETTINGS);
      return;
    }
    setForm({
      workspace_name: settings.workspace_name ?? DEFAULT_SETTINGS.workspace_name,
      timezone: settings.timezone ?? DEFAULT_SETTINGS.timezone,
      require_approval: settings.require_approval ?? DEFAULT_SETTINGS.require_approval,
      auto_approve_low_risk: settings.auto_approve_low_risk ?? DEFAULT_SETTINGS.auto_approve_low_risk,
      low_risk_threshold: settings.low_risk_threshold ?? DEFAULT_SETTINGS.low_risk_threshold,
      critical_risk_threshold: settings.critical_risk_threshold ?? DEFAULT_SETTINGS.critical_risk_threshold,
      email_notifications: settings.email_notifications ?? DEFAULT_SETTINGS.email_notifications,
      slack_notifications: settings.slack_notifications ?? DEFAULT_SETTINGS.slack_notifications,
      failure_alerts: settings.failure_alerts ?? DEFAULT_SETTINGS.failure_alerts,
      daily_summary: settings.daily_summary ?? DEFAULT_SETTINGS.daily_summary,
      require_authentication: settings.require_authentication ?? DEFAULT_SETTINGS.require_authentication,
      protect_api_keys: settings.protect_api_keys ?? DEFAULT_SETTINGS.protect_api_keys,
      restrict_external_access: settings.restrict_external_access ?? DEFAULT_SETTINGS.restrict_external_access,
    });
    toast.success("Changes discarded");
  }

  const isSaving = saveMutation.isPending;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 font-sans text-slate-900 selection:bg-blue-100">
      
      {/* Page Header */}
      <div className="mx-auto max-w-4xl px-6 pt-12 pb-8">
        <h1 className="text-3xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="mt-2 text-slate-500">
          Manage your environment preferences, operational limits, and security protocols.
        </p>
      </div>

      <main className="mx-auto max-w-4xl px-6">
        {/* ============================================================
            DATABASE ERROR STATE
        ============================================================ */}
        {isError && (
          <div className="mb-8 flex items-start gap-4 rounded-2xl border border-red-100 bg-red-50 p-5 text-red-600 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold">Failed to load settings</h3>
              <p className="mt-1 text-sm text-red-500">
                {error instanceof Error ? error.message : "An unexpected database error occurred."}
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
            LOADING STATE
        ============================================================ */}
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Loading workspace configuration...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* ========================================================
                GENERAL IDENTITY
            ======================================================== */}
            <SettingCard
              title="General Identity"
              description="Basic profile and regional settings for this workspace."
              icon={<Globe2 className="h-5 w-5 text-blue-500" />}
              iconBg="bg-blue-50"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <Label htmlFor="workspace-name" className="text-[13px] font-semibold text-slate-700">
                    Workspace Name
                  </Label>
                  <Input
                    id="workspace-name"
                    value={form.workspace_name}
                    onChange={(event) => updateField("workspace_name", event.target.value)}
                    placeholder="OmniAgent Control"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 shadow-none focus-visible:ring-blue-500"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="timezone" className="text-[13px] font-semibold text-slate-700">
                    Timezone
                  </Label>
                  <Input
                    id="timezone"
                    value={form.timezone}
                    onChange={(event) => updateField("timezone", event.target.value)}
                    placeholder="Asia/Kolkata"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 shadow-none focus-visible:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Used for schedules, alerts, and daily summaries.
                  </p>
                </div>
              </div>
            </SettingCard>

            {/* ========================================================
                APPROVAL POLICIES
            ======================================================== */}
            <SettingCard
              title="Approval Policies"
              description="Control when automated agents require human verification."
              icon={<SlidersHorizontal className="h-5 w-5 text-amber-500" />}
              iconBg="bg-amber-50"
            >
              <div className="space-y-2">
                <SettingRow
                  title="Require explicit approval"
                  description="Force human verification before any agent executes a sensitive action."
                  checked={form.require_approval}
                  onCheckedChange={(value) => updateField("require_approval", value)}
                />
                <SettingRow
                  title="Auto-approve low-risk actions"
                  description="Bypass verification for actions whose risk score falls below the designated threshold."
                  checked={form.auto_approve_low_risk}
                  onCheckedChange={(value) => updateField("auto_approve_low_risk", value)}
                />
              </div>

              {/* Added hover to the Risk Thresholds box here */}
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <div className="mb-5 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <h4 className="text-sm font-semibold text-slate-700">Risk Thresholds</h4>
                </div>
                <div className="grid gap-8 sm:grid-cols-2">
                  <ThresholdField
                    label="Low-Risk Threshold"
                    description="Scores 0 up to this value bypass approval."
                    value={form.low_risk_threshold}
                    onChange={(value) => updateField("low_risk_threshold", value)}
                  />
                  <ThresholdField
                    label="Critical-Risk Threshold"
                    description="Scores at or above this value trigger alerts."
                    value={form.critical_risk_threshold}
                    onChange={(value) => updateField("critical_risk_threshold", value)}
                  />
                </div>
              </div>
            </SettingCard>

            {/* ========================================================
                NOTIFICATIONS
            ======================================================== */}
            <SettingCard
              title="Notifications & Alerts"
              description="Configure how OmniAgent communicates workspace events."
              icon={<Bell className="h-5 w-5 text-indigo-500" />}
              iconBg="bg-indigo-50"
            >
              <div className="space-y-2">
                <SettingRow
                  title="Email Notifications"
                  description="Receive important system and workspace events directly to your inbox."
                  checked={form.email_notifications}
                  onCheckedChange={(value) => updateField("email_notifications", value)}
                />
                <SettingRow
                  title="Slack Integration"
                  description="Push real-time alerts and supported events to configured Slack channels."
                  checked={form.slack_notifications}
                  onCheckedChange={(value) => updateField("slack_notifications", value)}
                />
                <SettingRow
                  title="Failure Alerts"
                  description="Immediately notify active operators when an agent task or automation fails."
                  checked={form.failure_alerts}
                  onCheckedChange={(value) => updateField("failure_alerts", value)}
                />
                <SettingRow
                  title="Daily Summaries"
                  description="Receive a compiled daily digest of all workspace activity and executions."
                  checked={form.daily_summary}
                  onCheckedChange={(value) => updateField("daily_summary", value)}
                />
              </div>
            </SettingCard>

            {/* ========================================================
                SECURITY
            ======================================================== */}
            <SettingCard
              title="Access & Security"
              description="Enforce authentication policies and protect API credentials."
              icon={<Shield className="h-5 w-5 text-emerald-500" />}
              iconBg="bg-emerald-50"
            >
              <div className="space-y-2">
                <SettingRow
                  title="Require Authentication"
                  description="Mandate active session authentication for all workspace interactions."
                  checked={form.require_authentication}
                  onCheckedChange={(value) => updateField("require_authentication", value)}
                />
                <SettingRow
                  title="Protect API Keys"
                  description="Mask and encrypt API credentials, preventing unauthorized exposure."
                  checked={form.protect_api_keys}
                  onCheckedChange={(value) => updateField("protect_api_keys", value)}
                />
                <SettingRow
                  title="Restrict External Access"
                  description="Block inbound requests originating from external or untrusted environments."
                  checked={form.restrict_external_access}
                  onCheckedChange={(value) => updateField("restrict_external_access", value)}
                />
              </div>
            </SettingCard>

            {/* ============================================================
                BOTTOM ACTION BAR (Attached in standard flow)
            ============================================================ */}
            {/* Added hover to the Bottom Action Bar here */}
            <div className="mt-8 flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] sm:flex-row sm:items-center sm:rounded-full sm:px-6 sm:py-3">
              
              {/* Status Section */}
              <div className="flex items-center gap-3 px-2 sm:px-0">
                <div className="flex items-center justify-center rounded-full bg-emerald-100 p-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="hidden text-sm font-semibold text-slate-800 sm:block">
                    Settings Active
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {settings?.updated_at
                      ? `Saved ${new Date(settings.updated_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}`
                      : "Unsaved changes"}
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                <Button
                  variant="ghost"
                  onClick={resetChanges}
                  disabled={isSaving}
                  className="rounded-full px-5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  Discard
                </Button>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={isSaving}
                  className="rounded-full bg-slate-900 px-7 text-sm font-medium text-white shadow-md transition-all hover:bg-slate-800"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

/**
 * Beautifully spaced, rounded card for sectioning settings.
 */
function SettingCard({
  title,
  description,
  icon,
  iconBg,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] sm:p-8">
      <div className="mb-8 flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Modern toggle row design with Enabled/Disabled badge state.
 */
function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-start justify-between gap-6 rounded-2xl p-4 transition-all hover:bg-slate-50 ${
        checked ? "bg-slate-50/50" : ""
      }`}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {checked ? (
            <Badge variant="outline" className="h-5 border-blue-200 bg-blue-50 px-2 text-[10px] font-semibold text-blue-600">
              Enabled
            </Badge>
          ) : (
            <Badge variant="outline" className="h-5 border-slate-200 bg-slate-50 px-2 text-[10px] font-semibold text-slate-500">
              Disabled
            </Badge>
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-slate-500 transition-colors group-hover:text-slate-600">
          {description}
        </p>
      </div>
      <div className="pt-1 shrink-0">
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </label>
  );
}

/**
 * Clean numeric input for thresholds.
 */
function ThresholdField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={label} className="text-[13px] font-semibold text-slate-700">
          {label}
        </Label>
        <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-400">
          0–100%
        </span>
      </div>

      <div className="relative">
        <Input
          id={label}
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (Number.isNaN(nextValue)) return;
            onChange(Math.min(100, Math.max(0, nextValue)));
          }}
          className="h-11 rounded-xl border-slate-200 bg-white pr-10 text-sm font-medium shadow-none focus-visible:ring-blue-500"
        />
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center justify-center">
          <span className="font-mono text-xs font-medium text-slate-400">%</span>
        </div>
      </div>

      <p className="text-[12px] leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  );
}