import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

type ActivityType = {
  status: ActivityStatus;
  label: string;
  action: string;
  agent: string;
};

type ActivityEntry = ActivityType & {
  id: string;
  time: Date;
};

const ACTIVITY_TYPES: ActivityType[] = [
  {
    status: "running",
    label: "Running",
    action: "Processing invoice batch",
    agent: "InvoiceBot-02",
  },
  {
    status: "completed",
    label: "Completed",
    action: "Customer onboarding workflow",
    agent: "OnboardAgent-1",
  },
  {
    status: "action_required",
    label: "Action Required",
    action: "Refund approval over $500",
    agent: "PolicyAgent-07",
  },
  { status: "failed", label: "Failed", action: "CRM sync timeout", agent: "SyncAgent-04" },
  {
    status: "running",
    label: "Running",
    action: "Data enrichment pipeline",
    agent: "EnrichBot-09",
  },
  {
    status: "completed",
    label: "Completed",
    action: "Weekly analytics rollup",
    agent: "Analytics-01",
  },
  { status: "running", label: "Running", action: "Email triage queue", agent: "MailBot-03" },
  {
    status: "action_required",
    label: "Action Required",
    action: "High-value contract review",
    agent: "LegalAgent-05",
  },
];

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

function makeEntry(): ActivityEntry {
  const type = ACTIVITY_TYPES[Math.floor(Math.random() * ACTIVITY_TYPES.length)]!;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: type.status,
    label: type.label,
    action: type.action,
    agent: type.agent,
    time: new Date(),
  };
}

function Dashboard() {
  const [activities, setActivities] = useState<ActivityEntry[]>(() =>
    Array.from({ length: 6 }).map(() => makeEntry()),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) => [makeEntry(), ...prev].slice(0, 12));
    }, 5500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time overview of your AI workforce and operational health.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Last updated {new Date().toLocaleTimeString()}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Active Agents"
          value="14"
          icon={Bot}
          trend="+2 this week"
          trendDirection="up"
        />
        <KpiCard
          title="Monthly Token Cost"
          value="$1,240"
          icon={CreditCard}
          trend="-8% vs last month"
          trendDirection="up"
        />
        <KpiCard
          title="Success Rate"
          value="99.2%"
          icon={Activity}
          trend="0.1% above SLA"
          trendDirection="up"
        />
        <KpiCard
          title="Pending Approvals"
          value="3"
          icon={Users}
          trend="Needs attention"
          trendDirection="down"
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
            <ul className="space-y-3">
              {activities.map((entry) => {
                const StatusIcon = STATUS_ICON[entry.status];
                return (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3 transition-colors hover:bg-accent/30"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        STATUS_BG[entry.status],
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "h-4 w-4",
                          STATUS_FG[entry.status],
                          entry.status === "running" && "animate-spin",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{entry.action}</p>
                        <StatusBadge
                          variant={entry.status}
                          label={entry.label}
                          pulse={entry.status === "running"}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.agent} •{" "}
                        {entry.time.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
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
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              <Rocket className="h-4 w-4" />
              Deploy New AI Agent
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
