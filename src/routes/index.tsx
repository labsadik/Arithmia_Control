import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  CreditCard,
  FileText,
  HelpCircle,
  Loader2,
  Plus,
  Rocket,
  UserPlus,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OmniAgent Control — Dashboard" },
      { name: "description", content: "Monitor active agents, costs, and approvals in real time." },
      { property: "og:title", content: "OmniAgent Control — Dashboard" },
      {
        property: "og:description",
        content: "Monitor active agents, costs, and approvals in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type ActivityStatus = "running" | "completed" | "action_required" | "failed";

function toActivityStatus(value: string): ActivityStatus {
  return value === "completed" || value === "action_required" || value === "failed"
    ? value
    : "running";
}

const STATUS_LABEL: Record<ActivityStatus, string> = {
  running: "Running",
  completed: "Completed",
  action_required: "Action Required",
  failed: "Failed",
};

const STATUS_ICON: Record<ActivityStatus, LucideIcon> = {
  running: Loader2,
  completed: CheckCircle2,
  action_required: AlertCircle,
  failed: XCircle,
};

const STATUS_BG: Record<ActivityStatus, string> = {
  running: "bg-info/10",
  completed: "bg-success/10",
  action_required: "bg-warning/10",
  failed: "bg-danger/10",
};

const STATUS_FG: Record<ActivityStatus, string> = {
  running: "text-info",
  completed: "text-success",
  action_required: "text-warning",
  failed: "text-danger",
};

function Dashboard() {
  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: approvals } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("approvals").select("id, status");
      if (error) throw error;
      return data;
    },
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["activity_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  useRealtimeTable("agents", ["agents"]);
  useRealtimeTable("approvals", ["approvals"]);
  useRealtimeTable("activity_events", ["activity_events"]);

  const runningAgents = agents?.filter((a) => a.status === "running") ?? [];
  const totalCost = agents
    ? runningAgents.reduce((sum, a) => sum + Number(a.cost_usd), 0)
    : undefined;
  const avgSuccess = runningAgents.length
    ? runningAgents.reduce((sum, a) => sum + Number(a.success_rate), 0) / runningAgents.length
    : undefined;
  const pendingCount = approvals?.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time overview of your AI workforce and operational health.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="status-dot bg-success animate-pulse" />
          Connected to live database
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Active Agents"
          value={agents ? String(runningAgents.length) : "—"}
          icon={Bot}
          trend="+2 this week"
          trendDirection="up"
        />
        <KpiCard
          title="Monthly Token Cost"
          value={totalCost !== undefined ? `$${Math.round(totalCost).toLocaleString()}` : "—"}
          icon={CreditCard}
          trend="-8% vs last month"
          trendDirection="up"
        />
        <KpiCard
          title="Success Rate"
          value={avgSuccess !== undefined ? `${avgSuccess.toFixed(1)}%` : "—"}
          icon={Activity}
          trend="0.1% above SLA"
          trendDirection="up"
        />
        <KpiCard
          title="Pending Approvals"
          value={pendingCount !== undefined ? String(pendingCount) : "—"}
          icon={Users}
          trend={pendingCount ? "Needs attention" : "Queue clear"}
          trendDirection={pendingCount ? "down" : "up"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="card-glow border-border bg-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Agent Activity Stream</CardTitle>
              <CardDescription className="text-xs">
                Live feed of agent runs and human handoffs
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="status-dot bg-success animate-pulse" />
              Live
            </div>
          </CardHeader>
          <CardContent>
            {eventsLoading && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Connecting to activity stream…
              </p>
            )}
            {!eventsLoading && events?.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No activity recorded yet.
              </p>
            )}
            <ul className="space-y-3">
              {events?.map((entry) => {
                const status = toActivityStatus(entry.status);
                const StatusIcon = STATUS_ICON[status];
                return (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3 transition-colors hover:bg-accent/30"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        STATUS_BG[status],
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "h-4 w-4",
                          STATUS_FG[status],
                          status === "running" && "animate-spin",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{entry.message}</p>
                        <StatusBadge
                          variant={status}
                          label={STATUS_LABEL[status]}
                          pulse={status === "running"}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.agent_name} • {formatRelativeTime(entry.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="card-glow border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            <CardDescription className="text-xs">
              Common commands to keep agents moving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              asChild
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              <Link to="/agents">
                <Rocket className="h-4 w-4" />
                Deploy New AI Agent
              </Link>
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="gap-2 border-border bg-background/60 hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="h-4 w-4" />
                New Workflow
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-border bg-background/60 hover:bg-accent hover:text-accent-foreground"
              >
                <UserPlus className="h-4 w-4" />
                Invite Operator
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-border bg-background/60 hover:bg-accent hover:text-accent-foreground"
              >
                <FileText className="h-4 w-4" />
                View Logs
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-border bg-background/60 hover:bg-accent hover:text-accent-foreground"
              >
                <HelpCircle className="h-4 w-4" />
                Help
              </Button>
            </div>
            <div className="rounded-md border border-border/50 bg-background/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">Pro tip</p>
              <p className="mt-1 text-xs text-foreground">
                Set approval thresholds in Settings to reduce human-in-the-loop bottlenecks.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
