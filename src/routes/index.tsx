import { createFileRoute, Link } from "@tanstack/react-router";
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
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
import { WorkflowBuilder } from "@/components/workflow-builder";

import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Arithmia Control — Dashboard",
      },
      {
        name: "description",
        content:
          "Monitor active agents, costs, workflows, and approvals in real time.",
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

type WorkflowStep = {
  id?: string;
  type?: string;
  name?: string;
  description?: string;
  position?: {
    x?: number;
    y?: number;
  };
  config?: Record<string, unknown>;
  data?: {
    label?: string;
    [key: string]: unknown;
  };
};

type WorkflowPreview = {
  nodes: WorkflowStep[];
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

/**
 * Converts workflows.steps into a safe preview format.
 *
 * Supported:
 *
 * 1. React Flow:
 * {
 *   nodes: [...],
 *   edges: [...]
 * }
 *
 * 2. {
 *   steps: [...]
 * }
 *
 * 3. [...]
 */
function getWorkflowPreview(value: unknown): WorkflowPreview {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const data = value as Record<string, unknown>;

    if (
      Array.isArray(data.nodes) &&
      Array.isArray(data.edges)
    ) {
      return {
        nodes: data.nodes as WorkflowStep[],
        edges: data.edges,
      };
    }

    if (Array.isArray(data.steps)) {
      const steps = data.steps as WorkflowStep[];

      return {
        nodes: steps,
        edges: steps.slice(1).map((_, index) => ({
          source: steps[index]?.id,
          target: steps[index + 1]?.id,
        })),
      };
    }
  }

  if (Array.isArray(value)) {
    const steps = value as WorkflowStep[];

    return {
      nodes: steps,
      edges: steps.slice(1).map((_, index) => ({
        source: steps[index]?.id,
        target: steps[index + 1]?.id,
      })),
    };
  }

  return {
    nodes: [],
    edges: [],
  };
}

function getStepLabel(
  step: WorkflowStep,
  index: number,
) {
  return (
    step.data?.label ||
    step.name ||
    step.type ||
    `Step ${index + 1}`
  );
}

function getStepType(step: WorkflowStep) {
  return step.type || "action";
}

function Dashboard() {
  const [workflowOpen, setWorkflowOpen] =
    useState(false);

  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowRecord | null>(null);

  const [workflowMode, setWorkflowMode] =
    useState<"create" | "preview" | "edit">(
      "create",
    );

  /*
   * ============================================================
   * MODAL SCROLL / ESCAPE
   * ============================================================
   */

  useEffect(() => {
    if (!workflowOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setWorkflowOpen(false);
        setSelectedWorkflow(null);
        setWorkflowMode("create");
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [workflowOpen]);

  /*
   * ============================================================
   * AGENTS
   * ============================================================
   */

  const {
    data: agents = [],
    isLoading: agentsLoading,
  } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*");

      if (error) {
        console.error(
          "Failed to load agents:",
          error,
        );

        throw error;
      }

      return data ?? [];
    },
  });

  /*
   * ============================================================
   * APPROVALS
   * ============================================================
   */

  const {
    data: approvals = [],
  } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("id,status");

      if (error) {
        console.error(
          "Failed to load approvals:",
          error,
        );

        throw error;
      }

      return data ?? [];
    },
  });

  /*
   * ============================================================
   * ACTIVITY
   * ============================================================
   */

  const {
    data: events = [],
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
        console.error(
          "Failed to load activity:",
          error,
        );

        throw error;
      }

      return data ?? [];
    },
  });

  /*
   * ============================================================
   * WORKFLOWS
   * ============================================================
   */

  const {
    data: workflows = [],
    isLoading: workflowsLoading,
    refetch: refetchWorkflows,
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
        console.error(
          "Failed to load workflows:",
          error,
        );

        throw error;
      }

      return (data ?? []) as WorkflowRecord[];
    },

    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  /*
   * ============================================================
   * REALTIME
   *
   * IMPORTANT:
   * useRealtimeTable(tableName, queryKey)
   * ============================================================
   */

  useRealtimeTable("agents", ["agents"]);

  useRealtimeTable(
    "approvals",
    ["approvals"],
  );

  useRealtimeTable(
    "activity_events",
    ["activity_events"],
  );

  useRealtimeTable(
    "workflows",
    ["workflows"],
  );

  /*
   * ============================================================
   * DASHBOARD CALCULATIONS
   * ============================================================
   */

  const runningAgents = useMemo(() => {
    return agents.filter(
      (agent) =>
        agent.status === "running",
    );
  }, [agents]);

  const totalCost = useMemo(() => {
    if (!agents.length) {
      return 0;
    }

    return runningAgents.reduce(
      (sum, agent) =>
        sum +
        Number(agent.cost_usd ?? 0),
      0,
    );
  }, [agents, runningAgents]);

  const avgSuccess = useMemo(() => {
    if (!runningAgents.length) {
      return undefined;
    }

    return (
      runningAgents.reduce(
        (sum, agent) =>
          sum +
          Number(
            agent.success_rate ?? 0,
          ),
        0,
      ) / runningAgents.length
    );
  }, [runningAgents]);

  const pendingCount = useMemo(() => {
    return approvals.filter(
      (approval) =>
        approval.status === "pending",
    ).length;
  }, [approvals]);

  /*
   * ============================================================
   * WORKFLOW ACTIONS
   * ============================================================
   */

  function openCreateWorkflow() {
    setSelectedWorkflow(null);
    setWorkflowMode("create");
    setWorkflowOpen(true);
  }

  function openPreviewWorkflow(
    workflow: WorkflowRecord,
  ) {
    setSelectedWorkflow(workflow);
    setWorkflowMode("preview");
    setWorkflowOpen(true);
  }

  function openEditWorkflow(
    workflow: WorkflowRecord,
  ) {
    setSelectedWorkflow(workflow);
    setWorkflowMode("edit");
    setWorkflowOpen(true);
  }

  function closeWorkflow() {
    setWorkflowOpen(false);
    setSelectedWorkflow(null);
    setWorkflowMode("create");

    void refetchWorkflows();
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <>
      <div className="space-y-6 pb-8">
        {/* HEADER */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>

            <p className="text-sm text-muted-foreground">
              Real-time overview of your AI
              workforce and operational health.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="status-dot animate-pulse bg-success" />
            Connected to live database
          </div>
        </div>

        {/* KPI */}

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
            className="transition-all duration-300 cursor-pointer hover:shadow-xl hover:[transform:perspective(1000px)_translateY(-10px)_rotateX(10deg)]"
          />

          <KpiCard
            title="Monthly Token Cost"
            value={
              agentsLoading
                ? "—"
                : `$${Math.round(
                    totalCost,
                  ).toLocaleString()}`
            }
            icon={CreditCard}
            trend="-8% vs last month"
            trendDirection="up"
            className="transition-all duration-300 cursor-pointer hover:shadow-xl hover:[transform:perspective(1000px)_translateY(-10px)_rotateX(10deg)]"
          />

          <KpiCard
            title="Success Rate"
            value={
              avgSuccess !== undefined
                ? `${avgSuccess.toFixed(1)}%`
                : "—"
            }
            icon={Activity}
            trend="0.1% above SLA"
            trendDirection="up"
            className="transition-all duration-300 cursor-pointer hover:shadow-xl hover:[transform:perspective(1000px)_translateY(-10px)_rotateX(10deg)]"
          />

          <KpiCard
            title="Pending Approvals"
            value={String(pendingCount)}
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
            className="transition-all duration-300 cursor-pointer hover:shadow-xl hover:[transform:perspective(1000px)_translateY(-10px)_rotateX(10deg)]"
          />
        </div>

        {/* WORKFLOWS */}

        <Card className="card-glow border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Workflow className="h-4 w-4 text-primary" />
                </div>

                <CardTitle className="text-base font-semibold">
                  Workflows
                </CardTitle>

                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {workflows.length}
                </span>
              </div>

              <CardDescription className="mt-2 text-xs">
                All workflows saved in your
                Supabase database.
              </CardDescription>
            </div>

            <Button
              onClick={openCreateWorkflow}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Workflow
            </Button>
          </CardHeader>

          <CardContent>
            {/* LOADING */}

            {workflowsLoading && (
              <div className="flex min-h-[180px] items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading workflows from
                  database...
                </div>
              </div>
            )}

            {/* EMPTY */}

            {!workflowsLoading &&
              workflows.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-muted/10 p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Workflow className="h-6 w-6 text-primary" />
                  </div>

                  <p className="mt-4 text-sm font-semibold">
                    No workflows yet
                  </p>

                  <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                    Create your first workflow to
                    connect agents, conditions,
                    actions and data.
                  </p>

                  <Button
                    onClick={
                      openCreateWorkflow
                    }
                    className="mt-4 gap-2"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                    Create Workflow
                  </Button>
                </div>
              )}

            {/* WORKFLOW CARDS */}

            {!workflowsLoading &&
              workflows.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {workflows.map(
                    (workflow) => {
                      const preview =
                        getWorkflowPreview(
                          workflow.steps,
                        );

                      return (
                        <WorkflowCard
                          key={workflow.id}
                          workflow={workflow}
                          preview={preview}
                          onPreview={() =>
                            openPreviewWorkflow(
                              workflow,
                            )
                          }
                          onEdit={() =>
                            openEditWorkflow(
                              workflow,
                            )
                          }
                        />
                      );
                    },
                  )}
                </div>
              )}
          </CardContent>
        </Card>

        {/* ACTIVITY + QUICK ACTIONS */}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ACTIVITY */}

          <Card className="card-glow border-border bg-card lg:col-span-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  Agent Activity Stream
                </CardTitle>

                <CardDescription className="text-xs">
                  Live feed of agent runs and
                  human handoffs.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="status-dot animate-pulse bg-success" />
                Live
              </div>
            </CardHeader>

            <CardContent>
              {eventsLoading && (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading activity...
                </div>
              )}

              {!eventsLoading &&
                !events.length && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No activity recorded yet.
                  </p>
                )}

              <ul className="space-y-3">
                {events.map((entry) => {
                  const status =
                    toActivityStatus(
                      entry.status,
                    );

                  const StatusIcon =
                    STATUS_ICON[status];

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
                            status ===
                              "running" &&
                              "animate-spin",
                          )}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">
                            {entry.message}
                          </p>

                          <StatusBadge
                            variant={status}
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
                          {entry.agent_name} •{" "}
                          {formatRelativeTime(
                            entry.created_at,
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* QUICK ACTIONS */}

          <Card className="card-glow border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Quick Actions
              </CardTitle>

              <CardDescription className="text-xs">
                Common commands to keep agents
                moving.
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
                onClick={
                  openCreateWorkflow
                }
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
                type="button"
                variant="outline"
                className="w-full gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Help
              </Button>

              <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Workflow tip
                </p>

                <p className="mt-1 text-xs leading-5">
                  Existing workflows are loaded
                  directly from Supabase. Preview
                  or edit any saved workflow.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* WORKFLOW MODAL */}

      {workflowOpen && (
        <div className="fixed inset-0 z-[200]">
          {/* BACKDROP */}

          <button
            type="button"
            aria-label="Close workflow"
            onClick={closeWorkflow}
            className="absolute inset-0 bg-slate-950/10 backdrop-blur-[2px]"
          />

          {/* MODAL */}

          <div className="relative flex h-full w-full items-center justify-center p-2 sm:p-4">
            <div className="relative flex h-full max-h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.22)]">
              {/* MODAL HEADER */}

              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <Workflow className="h-4 w-4 text-blue-600" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-slate-900">
                      {workflowMode ===
                      "create"
                        ? "Create Workflow"
                        : selectedWorkflow?.name ||
                          "Workflow"}
                    </h2>

                    <p className="truncate text-[11px] text-slate-500">
                      {workflowMode ===
                      "preview"
                        ? "Preview saved workflow and data flow"
                        : workflowMode ===
                            "edit"
                          ? "Edit saved workflow"
                          : "Build a new automation workflow"}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={closeWorkflow}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* BUILDER */}

              <div className="min-h-0 flex-1 overflow-hidden">
                <WorkflowBuilder
                  workflowId={
                    selectedWorkflow?.id ??
                    null
                  }
                  initialName={
                    selectedWorkflow?.name
                  }
                  initialDescription={
                    selectedWorkflow?.description ??
                    ""
                  }
                  initialEnabled={
                    selectedWorkflow?.enabled ??
                    true
                  }
                  initialSteps={
                    selectedWorkflow?.steps
                  }
                  readOnly={
                    workflowMode ===
                    "preview"
                  }
                  onClose={closeWorkflow}
                  onSaved={() => {
                    void refetchWorkflows();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================ */
/* WORKFLOW CARD                                                    */
/* ================================================================ */

type WorkflowCardProps = {
  workflow: WorkflowRecord;
  preview: WorkflowPreview;
  onPreview: () => void;
  onEdit: () => void;
};

function WorkflowCard({
  workflow,
  preview,
  onPreview,
  onEdit,
}: WorkflowCardProps) {
  const visibleNodes =
    preview.nodes.slice(0, 4);

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-xl",
        "border border-border",
        "bg-background/50",
        "transition-all duration-300",
        "hover:-translate-y-1",
        "hover:border-primary/40",
        "hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
      )}
    >
      {/* HEADER */}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Workflow className="h-5 w-5 text-primary" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {workflow.name}
              </p>

              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                {workflow.description ||
                  "No description"}
              </p>
            </div>
          </div>

          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold",
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

        {/* MINI FLOW */}

        <div className="mt-4 rounded-lg border border-border bg-slate-50 p-3">
          {preview.nodes.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-[10px] text-muted-foreground">
              No workflow nodes
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-hidden">
              {visibleNodes.map(
                (node, index) => (
                  <div
                    key={
                      node.id ??
                      `${workflow.id}-${index}`
                    }
                    className="flex min-w-0 shrink-0 items-center gap-2"
                  >
                    <div className="flex h-9 w-[86px] items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 shadow-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[8px] font-semibold text-slate-500">
                        {index + 1}
                      </span>

                      <span className="truncate text-[9px] font-medium text-slate-700">
                        {getStepLabel(
                          node,
                          index,
                        )}
                      </span>
                    </div>

                    {index <
                      visibleNodes.length -
                        1 && (
                      <span className="shrink-0 text-xs font-semibold text-primary">
                        →
                      </span>
                    )}
                  </div>
                ),
              )}

              {preview.nodes.length >
                4 && (
                <span className="shrink-0 text-[9px] text-muted-foreground">
                  +
                  {preview.nodes.length -
                    4}{" "}
                  more
                </span>
              )}
            </div>
          )}
        </div>

        {/* META */}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
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

          <span className="text-[9px] text-muted-foreground">
            {workflow.updated_at
              ? formatRelativeTime(
                  workflow.updated_at,
                )
              : formatRelativeTime(
                  workflow.created_at,
                )}
          </span>
        </div>
      </div>

      {/* ACTIONS */}

      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5">
        <span className="text-[9px] text-muted-foreground">
          {getWorkflowTypeLabel(
            preview.nodes,
          )}
        </span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onPreview}
            className="h-7 px-2 text-[10px]"
          >
            Preview
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="h-7 px-2 text-[10px]"
          >
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ */
/* WORKFLOW TYPE                                                    */
/* ================================================================ */

function getWorkflowTypeLabel(
  nodes: WorkflowStep[],
) {
  if (!nodes.length) {
    return "Empty workflow";
  }

  const types = new Set(
    nodes.map(getStepType),
  );

  if (
    types.has("agent") &&
    types.has("condition")
  ) {
    return "Agent + branching";
  }

  if (types.has("agent")) {
    return "AI automation";
  }

  if (types.has("condition")) {
    return "Conditional workflow";
  }

  if (types.has("delay")) {
    return "Scheduled workflow";
  }

  return "Automation";
}