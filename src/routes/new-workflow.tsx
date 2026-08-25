// src/routes/index.tsx

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  Key,
  Loader2,
  Plus,
  Rocket,
  UserPlus,
  Users,
  Workflow,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/new-workflow")({
  head: () => ({
    meta: [
      {
        title: "OmniAgent Control — Dashboard",
      },
      {
        name: "description",
        content:
          "Monitor active agents, costs, workflows, and approvals in real time.",
      },
      {
        property: "og:title",
        content: "OmniAgent Control — Dashboard",
      },
      {
        property: "og:description",
        content:
          "Monitor active agents, costs, workflows, and approvals in real time.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),

  component: Dashboard,
});

type ActivityStatus =
  | "running"
  | "completed"
  | "action_required"
  | "failed";

type WorkflowRecord = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  steps: unknown;
  created_at: string;
  updated_at: string | null;
};

type WorkflowPreview = {
  nodes: unknown[];
  edges: unknown[];
};

function toActivityStatus(value: string): ActivityStatus {
  if (
    value === "completed" ||
    value === "action_required" ||
    value === "failed"
  ) {
    return value;
  }

  return "running";
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

function getWorkflowPreview(value: unknown): WorkflowPreview {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const data = value as {
      nodes?: unknown[];
      edges?: unknown[];
    };

    if (
      Array.isArray(data.nodes) &&
      Array.isArray(data.edges)
    ) {
      return {
        nodes: data.nodes,
        edges: data.edges,
      };
    }
  }

  if (Array.isArray(value)) {
    return {
      nodes: value,
      edges: Array.from({
        length: Math.max(value.length - 1, 0),
      }),
    };
  }

  return {
    nodes: [],
    edges: [],
  };
}

function Dashboard() {
  const navigate = useNavigate();

  /*
   * AGENTS
   */
  const {
    data: agents,
    isLoading: agentsLoading,
  } = useQuery({
    queryKey: ["agents"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*");

      if (error) {
        throw error;
      }

      return data;
    },
  });

  /*
   * APPROVALS
   */
  const {
    data: approvals,
  } = useQuery({
    queryKey: ["approvals"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("id, status");

      if (error) {
        throw error;
      }

      return data;
    },
  });

  /*
   * ACTIVITY
   */
  const {
    data: events,
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: ["activity_events"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(12);

      if (error) {
        throw error;
      }

      return data;
    },
  });

  /*
   * WORKFLOWS
   *
   * Loads ALL existing workflows from Supabase.
   */
  const {
    data: workflows,
    isLoading: workflowsLoading,
  } = useQuery<WorkflowRecord[]>({
    queryKey: ["workflows"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select(
          "id,name,description,enabled,steps,created_at,updated_at",
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return (data ?? []) as WorkflowRecord[];
    },
  });

  /*
   * REALTIME
   */
  useRealtimeTable("agents", ["agents"]);

  useRealtimeTable("approvals", ["approvals"]);

  useRealtimeTable(
    "activity_events",
    ["activity_events"],
  );

  useRealtimeTable(
    "workflows",
    ["workflows"],
  );

  /*
   * DASHBOARD DATA
   */
  const runningAgents =
    agents?.filter(
      (agent) =>
        agent.status === "running",
    ) ?? [];

  const totalCost = agents
    ? runningAgents.reduce(
        (sum, agent) =>
          sum +
          Number(
            agent.cost_usd ?? 0,
          ),
        0,
      )
    : undefined;

  const avgSuccess =
    runningAgents.length
      ? runningAgents.reduce(
          (sum, agent) =>
            sum +
            Number(
              agent.success_rate ?? 0,
            ),
          0,
        ) / runningAgents.length
      : undefined;

  const pendingCount =
    approvals?.filter(
      (approval) =>
        approval.status === "pending",
    ).length ?? 0;

  /*
   * OPEN EXISTING WORKFLOW
   *
   * Both Preview and Edit open the same
   * existing workflow builder with the ID.
   */
  function openWorkflow(
    workflow: WorkflowRecord,
  ) {
    navigate({
      to: "/new-workflow",
      search: {
        id: workflow.id,
      },
    });
  }

  /*
   * CREATE NEW WORKFLOW
   */
  function createWorkflow() {
    navigate({
      to: "/new-workflow",
    });
  }

  return (
    <div className="space-y-6">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>

          <p className="text-sm text-muted-foreground">
            Real-time overview of your AI workforce and operational health.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="status-dot animate-pulse bg-success" />

          Connected to live database
        </div>
      </div>

      {/* ====================================================== */}
      {/* KPI */}
      {/* ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <KpiCard
          title="Total Active Agents"
          value={
            agentsLoading
              ? "—"
              : String(
                  runningAgents.length,
                )
          }
          icon={Bot}
          trend="+2 this week"
          trendDirection="up"
        />

        <KpiCard
          title="Monthly Token Cost"
          value={
            totalCost !== undefined
              ? `$${Math.round(
                  totalCost,
                ).toLocaleString()}`
              : "—"
          }
          icon={CreditCard}
          trend="-8% vs last month"
          trendDirection="up"
        />

        <KpiCard
          title="Success Rate"
          value={
            avgSuccess !== undefined
              ? `${avgSuccess.toFixed(
                  1,
                )}%`
              : "—"
          }
          icon={Activity}
          trend="0.1% above SLA"
          trendDirection="up"
        />

        <KpiCard
          title="Pending Approvals"
          value={String(
            pendingCount,
          )}
          icon={Users}
          trend={
            pendingCount
              ? "Needs attention"
              : "Queue clear"
          }
          trendDirection={
            pendingCount
              ? "down"
              : "up"
          }
        />
      </div>

      {/* ====================================================== */}
      {/* ALL WORKFLOWS */}
      {/* ====================================================== */}

      <Card className="card-glow border-border bg-card">

        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <div className="flex items-center gap-2">

              <Workflow className="h-5 w-5 text-primary" />

              <CardTitle className="text-base font-semibold">
                Workflows
              </CardTitle>

              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {workflows?.length ?? 0}
              </span>

            </div>

            <CardDescription className="mt-1 text-xs">
              All workflows saved in your database.
            </CardDescription>
          </div>

          <Button
            onClick={createWorkflow}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Workflow
          </Button>

        </CardHeader>

        <CardContent>

          {/* LOADING */}

          {workflowsLoading && (
            <div className="flex min-h-[180px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading workflows...
              </div>
            </div>
          )}

          {/* EMPTY */}

          {!workflowsLoading &&
            !workflows?.length && (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">

                <Workflow className="mx-auto h-8 w-8 text-muted-foreground" />

                <p className="mt-3 text-sm font-medium">
                  No workflows yet
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Create your first workflow to start automating tasks.
                </p>

                <Button
                  onClick={createWorkflow}
                  className="mt-4 gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Create your first workflow
                </Button>

              </div>
            )}

          {/* ALL EXISTING WORKFLOWS */}

          {!workflowsLoading &&
            workflows &&
            workflows.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                {workflows.map(
                  (workflow) => {
                    const preview =
                      getWorkflowPreview(
                        workflow.steps,
                      );

                    return (
                      <div
                        key={workflow.id}
                        className={cn(
                          "group rounded-xl border border-border",
                          "bg-background/50 p-4",
                          "transition-all",
                          "hover:-translate-y-0.5",
                          "hover:border-primary/40",
                          "hover:shadow-lg",
                        )}
                      >

                        {/* WORKFLOW HEADER */}

                        <div className="flex items-start justify-between gap-3">

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                              <Workflow className="h-5 w-5 text-primary" />
                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-sm font-semibold text-foreground">
                                {workflow.name ||
                                  "Untitled Workflow"}
                              </p>

                              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                                {workflow.description ||
                                  "No description"}
                              </p>

                            </div>

                          </div>

                          {/* ACTIVE */}

                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-1 text-[9px] font-medium",
                              workflow.enabled
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {workflow.enabled
                              ? "ACTIVE"
                              : "OFF"}
                          </span>

                        </div>

                        {/* MINI WORKFLOW */}

                        <div className="mt-4 overflow-hidden rounded-lg border border-border/50 bg-[#09090b] p-3">

                          {preview.nodes.length === 0 ? (
                            <div className="flex h-12 items-center justify-center text-[10px] text-muted-foreground">
                              No nodes configured
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 overflow-hidden">

                              {preview.nodes
                                .slice(0, 4)
                                .map(
                                  (
                                    node: any,
                                    index,
                                  ) => (
                                    <div
                                      key={
                                        node?.id ??
                                        index
                                      }
                                      className="flex min-w-0 items-center gap-2"
                                    >

                                      <div className="flex h-8 min-w-[80px] max-w-[110px] items-center justify-center rounded-md border border-border bg-card px-2 text-[9px] font-medium text-foreground">

                                        <span className="truncate">
                                          {node
                                            ?.data
                                            ?.label ??
                                            node
                                              ?.name ??
                                            node
                                              ?.type ??
                                            "Step"}
                                        </span>

                                      </div>

                                      {index <
                                        Math.min(
                                          preview
                                            .nodes
                                            .length,
                                          4,
                                        ) -
                                          1 && (
                                        <span className="text-primary">
                                          →
                                        </span>
                                      )}

                                    </div>
                                  ),
                                )}

                              {preview.nodes
                                .length > 4 && (
                                <span className="shrink-0 text-[9px] text-muted-foreground">
                                  +
                                  {preview
                                    .nodes
                                    .length -
                                    4}{" "}
                                  more
                                </span>
                              )}

                            </div>
                          )}

                        </div>

                        {/* META */}

                        <div className="mt-3 flex items-center justify-between">

                          <div className="flex gap-3 text-[10px] text-muted-foreground">

                            <span>
                              {preview.nodes.length}{" "}
                              {preview.nodes.length === 1
                                ? "node"
                                : "nodes"}
                            </span>

                            <span>
                              {preview.edges.length}{" "}
                              {preview.edges.length === 1
                                ? "connection"
                                : "connections"}
                            </span>

                          </div>

                          <div className="flex gap-1">

                            {/* PREVIEW */}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                openWorkflow(
                                  workflow,
                                )
                              }
                            >
                              Preview
                            </Button>

                            {/* EDIT */}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openWorkflow(
                                  workflow,
                                )
                              }
                            >
                              Edit
                            </Button>

                          </div>

                        </div>

                      </div>
                    );
                  },
                )}

              </div>
            )}

        </CardContent>
      </Card>

      {/* ====================================================== */}
      {/* MAIN CONTENT */}
      {/* ====================================================== */}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ACTIVITY */}

        <Card className="card-glow border-border bg-card lg:col-span-2">

          <CardHeader className="flex flex-row items-center justify-between pb-2">

            <div>
              <CardTitle className="text-base font-semibold">
                Agent Activity Stream
              </CardTitle>

              <CardDescription className="text-xs">
                Live feed of agent runs and human handoffs
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="status-dot animate-pulse bg-success" />
              Live
            </div>

          </CardHeader>

          <CardContent>

            {eventsLoading && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Connecting to activity stream…
              </p>
            )}

            {!eventsLoading &&
              events?.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              )}

            <ul className="space-y-3">

              {events?.map(
                (entry) => {
                  const status =
                    toActivityStatus(
                      entry.status,
                    );

                  const StatusIcon =
                    STATUS_ICON[
                      status
                    ];

                  return (
                    <li
                      key={entry.id}
                      className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3 transition-colors hover:bg-accent/30"
                    >

                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          STATUS_BG[
                            status
                          ],
                        )}
                      >

                        <StatusIcon
                          className={cn(
                            "h-4 w-4",
                            STATUS_FG[
                              status
                            ],
                            status ===
                              "running" &&
                              "animate-spin",
                          )}
                        />

                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <p className="text-sm font-medium text-foreground">
                            {entry.message}
                          </p>

                          <StatusBadge
                            variant={
                              status
                            }
                            label={
                              STATUS_LABEL[
                                status
                              ]
                            }
                            pulse={
                              status ===
                              "running"
                            }
                          />

                        </div>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {entry.agent_name}{" "}
                          •{" "}
                          {formatRelativeTime(
                            entry.created_at,
                          )}
                        </p>

                      </div>

                    </li>
                  );
                },
              )}

            </ul>

          </CardContent>

        </Card>

        {/* QUICK ACTIONS */}

        <Card className="card-glow border-border bg-card">

          <CardHeader>

            <CardTitle className="text-base font-semibold">
              Quick Actions
            </CardTitle>

            <CardDescription className="text-xs">
              Common commands to keep agents moving
            </CardDescription>

          </CardHeader>

          <CardContent className="space-y-3">

            <Button
              asChild
              className="w-full gap-2"
              size="lg"
            >
              <Link to="/agents">
                <Rocket className="h-4 w-4" />
                Deploy New AI Agent
              </Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={createWorkflow}
              className="w-full gap-2"
            >
              <Workflow className="h-4 w-4" />
              New Workflow
            </Button>

            <div className="grid grid-cols-2 gap-3">

              <Button
                type="button"
                variant="outline"
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>

              <Button
                asChild
                variant="outline"
                className="gap-2"
              >
                <Link to="/api-management">
                  <Key className="h-4 w-4" />
                  APIs
                </Link>
              </Button>

            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Button>

            <div className="rounded-md border border-border/50 bg-background/50 p-3">

              <p className="text-xs font-medium text-muted-foreground">
                Workflow tip
              </p>

              <p className="mt-1 text-xs text-foreground">
                Create a workflow, add nodes, connect your
                automation steps, then save it directly to
                Supabase.
              </p>

            </div>

          </CardContent>

        </Card>

      </div>

    </div>
  );
}