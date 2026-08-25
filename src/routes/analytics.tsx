import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Bot,
  CheckCircle2,
  Coins,
  Database,
  Loader2,
  TrendingDown,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      {
        title: "Cost & Analytics — OmniAgent Control",
      },
      {
        name: "description",
        content:
          "Track token usage, spend, success rates, and agent performance.",
      },
      {
        property: "og:title",
        content: "Cost & Analytics — OmniAgent Control",
      },
      {
        property: "og:description",
        content:
          "Track token usage, spend, success rates, and agent performance.",
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

  component: AnalyticsPage,
});

type Agent = Tables<"agents">;

const ANALYTICS_QUERY_KEY = ["analytics-agents"];

const CHART_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

/* ============================================================================
   Helpers
============================================================================ */

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatTokens(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return formatNumber(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function statusClasses(status: string) {
  switch (status) {
    case "running":
      return "border-success/25 bg-success/10 text-success";

    case "idle":
      return "border-border bg-muted text-muted-foreground";

    case "paused":
      return "border-warning/25 bg-warning/10 text-warning";

    case "error":
      return "border-danger/25 bg-danger/10 text-danger";

    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function getStatusLabel(status: string) {
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

/* ============================================================================
   Page
============================================================================ */

function AnalyticsPage() {
  const queryClient = useQueryClient();

  const [animate, setAnimate] = useState(false);

  /*
   * ==========================================================================
   * REAL DATABASE QUERY
   * ==========================================================================
   *
   * This is the ONLY source of analytics data.
   *
   * No fake data.
   * No hardcoded agents.
   * No local demo data.
   */
  const {
    data: agents = [],
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<Agent[], Error>({
    queryKey: ANALYTICS_QUERY_KEY,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("cost_usd", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return data ?? [];
    },

    /*
     * Always consider the database authoritative.
     */
    staleTime: 0,

    /*
     * Keep data in React Query cache.
     */
    gcTime: 1000 * 60 * 30,

    /*
     * Refresh when user comes back to the browser tab.
     */
    refetchOnWindowFocus: true,

    /*
     * Don't automatically poll.
     * Realtime is responsible for updates.
     */
    refetchInterval: false,
  });

  /*
   * ==========================================================================
   * SUPABASE REALTIME
   * ==========================================================================
   *
   * Your existing realtime hook should invalidate:
   *
   * ["analytics-agents"]
   *
   * whenever agents are INSERTED / UPDATED / DELETED.
   */
  useRealtimeTable("agents", [ANALYTICS_QUERY_KEY]);

  /*
   * Animate charts whenever real database data changes.
   */
  useEffect(() => {
    setAnimate(false);

    const timer = window.setTimeout(() => {
      setAnimate(true);
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [agents]);

  /*
   * ==========================================================================
   * MANUAL REFRESH
   * ==========================================================================
   */

  const refreshAnalytics = () => {
    queryClient.invalidateQueries({
      queryKey: ANALYTICS_QUERY_KEY,
    });
  };

  /*
   * ==========================================================================
   * DYNAMIC ANALYTICS
   * ==========================================================================
   *
   * Everything below is calculated directly from `agents`.
   *
   * When Supabase changes the agents table:
   *
   * Supabase
   *   ↓
   * realtime
   *   ↓
   * React Query
   *   ↓
   * agents
   *   ↓
   * this useMemo
   *   ↓
   * UI / charts / table
   */
  const analytics = useMemo(() => {
    const totalCost = agents.reduce(
      (sum, agent) => sum + Number(agent.cost_usd ?? 0),
      0,
    );

    const totalTokens = agents.reduce(
      (sum, agent) => sum + Number(agent.tokens_used ?? 0),
      0,
    );

    const totalTasks = agents.reduce(
      (sum, agent) => sum + Number(agent.tasks_completed ?? 0),
      0,
    );

    const averageSuccessRate =
      agents.length > 0
        ? agents.reduce(
            (sum, agent) =>
              sum + Number(agent.success_rate ?? 0),
            0,
          ) / agents.length
        : 0;

    const runningAgents = agents.filter(
      (agent) => agent.status === "running",
    ).length;

    const failedAgents = agents.filter(
      (agent) => agent.status === "error",
    ).length;

    const productionAgents = agents.filter(
      (agent) => agent.environment === "production",
    ).length;

    const stagingAgents = agents.filter(
      (agent) => agent.environment === "staging",
    ).length;

    const costPerTask =
      totalTasks > 0
        ? totalCost / totalTasks
        : 0;

    const tokensPerTask =
      totalTasks > 0
        ? totalTokens / totalTasks
        : 0;

    const topCostAgent =
      agents.length > 0
        ? agents.reduce((highest, agent) =>
            Number(agent.cost_usd ?? 0) >
            Number(highest.cost_usd ?? 0)
              ? agent
              : highest,
          )
        : null;

    const topSuccessAgent =
      agents.length > 0
        ? agents.reduce((highest, agent) =>
            Number(agent.success_rate ?? 0) >
            Number(highest.success_rate ?? 0)
              ? agent
              : highest,
          )
        : null;

    /*
     * Model cost distribution.
     */
    const modelCosts = agents.reduce<Record<string, number>>(
      (result, agent) => {
        const model = agent.model || "Unknown";

        result[model] =
          (result[model] ?? 0) +
          Number(agent.cost_usd ?? 0);

        return result;
      },
      {},
    );

    const chartData = Object.entries(modelCosts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        color:
          CHART_COLORS[index % CHART_COLORS.length],
      }));

    /*
     * Environment costs.
     */
    const productionCost = agents
      .filter(
        (agent) =>
          agent.environment === "production",
      )
      .reduce(
        (sum, agent) =>
          sum + Number(agent.cost_usd ?? 0),
        0,
      );

    const stagingCost = agents
      .filter(
        (agent) =>
          agent.environment === "staging",
      )
      .reduce(
        (sum, agent) =>
          sum + Number(agent.cost_usd ?? 0),
        0,
      );

    return {
      totalCost,
      totalTokens,
      totalTasks,
      averageSuccessRate,
      runningAgents,
      failedAgents,
      productionAgents,
      stagingAgents,
      costPerTask,
      tokensPerTask,
      topCostAgent,
      topSuccessAgent,
      modelCosts,
      chartData,
      productionCost,
      stagingCost,
    };
  }, [agents]);

  /*
   * ==========================================================================
   * LOADING
   * ==========================================================================
   */

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader isFetching={false} />

        <Card className="card-glow border-border bg-card">
          <CardContent className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading analytics from Supabase...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /*
   * ==========================================================================
   * ERROR
   * ==========================================================================
   */

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader isFetching={false} />

        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-danger" />

              <div>
                <p className="text-sm font-medium text-danger">
                  Could not load analytics
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : "An unexpected database error occurred."}
                </p>

                <button
                  type="button"
                  onClick={refreshAnalytics}
                  className="mt-3 text-xs font-medium text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /*
   * ==========================================================================
   * UI
   * ==========================================================================
   */

  return (
    <div className="space-y-6 pb-10">
      <PageHeader isFetching={isFetching} />

      {/* ================================================================
          PRIMARY METRICS
      ================================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Spend"
          value={formatCurrency(analytics.totalCost)}
          description="Across all agents"
          icon={Coins}
          iconClass="bg-primary/10 text-primary"
        />

        <MetricCard
          title="Tokens Used"
          value={formatTokens(analytics.totalTokens)}
          description={`${formatTokens(analytics.tokensPerTask)} per task`}
          icon={Zap}
          iconClass="bg-warning/10 text-warning"
        />

        <MetricCard
          title="Success Rate"
          value={formatPercent(
            analytics.averageSuccessRate,
          )}
          description="Average across agents"
          icon={CheckCircle2}
          iconClass="bg-success/10 text-success"
        />

        <MetricCard
          title="Active Agents"
          value={`${analytics.runningAgents}/${agents.length}`}
          description={`${analytics.failedAgents} currently in error`}
          icon={Bot}
          iconClass="bg-primary/10 text-primary"
        />
      </div>

      {/* ================================================================
          COST OVERVIEW
      ================================================================= */}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-glow border-border bg-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Model-wise Cost Distribution
                </CardTitle>

                <p className="mt-1 text-xs text-muted-foreground">
                  Live spend breakdown by AI model
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="h-[300px] w-full">
              {analytics.chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No cost data available in the agents table.
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={analytics.chartData}
                    margin={{
                      top: 20,
                      right: 10,
                      left: 10,
                      bottom: 20,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                    />

                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      angle={-15}
                      textAnchor="end"
                      height={50}
                    />

                    <YAxis
                      tickFormatter={(value) =>
                        formatCurrency(value)
                      }
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      width={70}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor:
                          "hsl(var(--background))",
                        border:
                          "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Cost",
                      ]}
                    />

                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      animationDuration={800}
                      animationEasing="ease-out"
                      isAnimationActive={animate}
                    >
                      {analytics.chartData.map(
                        (entry, index) => (
                          <Cell
                            key={`bar-cell-${entry.name}-${index}`}
                            fill={entry.color}
                          />
                        ),
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pie */}

        <Card className="card-glow border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Cost Distribution
            </CardTitle>

            <p className="text-xs text-muted-foreground">
              Percentage by model
            </p>
          </CardHeader>

          <CardContent>
            <div className="h-[280px] w-full">
              {analytics.chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No data available.
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={analytics.chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      paddingAngle={2}
                      animationDuration={1000}
                      animationEasing="ease-out"
                      isAnimationActive={animate}
                      label={({
                        name,
                        percent,
                      }) =>
                        `${name} ${(
                          percent * 100
                        ).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {analytics.chartData.map(
                        (entry, index) => (
                          <Cell
                            key={`pie-cell-${entry.name}-${index}`}
                            fill={entry.color}
                          />
                        ),
                      )}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        backgroundColor:
                          "hsl(var(--background))",
                        border:
                          "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Cost",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <div className="text-center">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Total Models
                </p>

                <p className="text-sm font-semibold text-foreground">
                  {analytics.chartData.length}
                </p>
              </div>

              <div className="text-center">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Highest Cost
                </p>

                <p className="text-sm font-semibold text-foreground">
                  {analytics.chartData.length > 0
                    ? formatCurrency(
                        analytics.chartData[0].value,
                      )
                    : "$0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          COST SUMMARY
      ================================================================= */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Production"
          value={formatCurrency(
            analytics.productionCost,
          )}
          icon={Database}
          className="border-primary/20 bg-primary/5"
        />

        <SummaryCard
          label="Staging"
          value={formatCurrency(
            analytics.stagingCost,
          )}
          icon={Activity}
          className="border-warning/20 bg-warning/5"
        />

        <SummaryCard
          label="Cost / Task"
          value={formatCurrency(
            analytics.costPerTask,
          )}
          icon={TrendingDown}
          className="border-success/20 bg-success/5"
        />

        <SummaryCard
          label="Total Tasks"
          value={formatNumber(
            analytics.totalTasks,
          )}
          icon={CheckCircle2}
          className="border-blue-500/20 bg-blue-500/5"
        />
      </div>

      {/* ================================================================
          TOP PERFORMERS
      ================================================================= */}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-glow border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Highest spend
            </CardTitle>
          </CardHeader>

          <CardContent>
            {analytics.topCostAgent ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-4 transition-all hover:border-primary/30 hover:bg-background/60">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {analytics.topCostAgent.name}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {analytics.topCostAgent.model}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(
                      Number(
                        analytics.topCostAgent
                          .cost_usd ?? 0,
                      ),
                    )}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTokens(
                      Number(
                        analytics.topCostAgent
                          .tokens_used ?? 0,
                      ),
                    )}{" "}
                    tokens
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card className="card-glow border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Highest success rate
            </CardTitle>
          </CardHeader>

          <CardContent>
            {analytics.topSuccessAgent ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-4 transition-all hover:border-success/30 hover:bg-background/60">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {analytics.topSuccessAgent.name}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {analytics.topSuccessAgent.model}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-success">
                    {formatPercent(
                      Number(
                        analytics.topSuccessAgent
                          .success_rate ?? 0,
                      ),
                    )}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatNumber(
                      Number(
                        analytics.topSuccessAgent
                          .tasks_completed ?? 0,
                      ),
                    )}{" "}
                    tasks
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          AGENT PERFORMANCE
      ================================================================= */}

      <Card className="card-glow border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Agent-level analytics
          </CardTitle>

          <p className="text-xs text-muted-foreground">
            Live data from the agents table.
          </p>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          {agents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No agent analytics available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="pl-6">
                      Agent
                    </TableHead>

                    <TableHead>
                      Model
                    </TableHead>

                    <TableHead>
                      Status
                    </TableHead>

                    <TableHead className="text-right">
                      Tasks
                    </TableHead>

                    <TableHead className="text-right">
                      Success
                    </TableHead>

                    <TableHead className="text-right">
                      Tokens
                    </TableHead>

                    <TableHead className="pr-6 text-right">
                      Cost
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {agents.map((agent) => (
                    <TableRow
                      key={agent.id}
                      className="border-border transition-colors hover:bg-muted/20"
                    >
                      <TableCell className="pl-6">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {agent.name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {agent.environment}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {agent.model}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            statusClasses(
                              agent.status,
                            ),
                          )}
                        >
                          {getStatusLabel(
                            agent.status,
                          )}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right text-xs">
                        {formatNumber(
                          Number(
                            agent.tasks_completed ?? 0,
                          ),
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            Number(
                              agent.success_rate ?? 0,
                            ) >= 99
                              ? "text-success"
                              : Number(
                                    agent.success_rate ??
                                      0,
                                  ) >= 95
                                ? "text-warning"
                                : "text-danger",
                          )}
                        >
                          {formatPercent(
                            Number(
                              agent.success_rate ?? 0,
                            ),
                          )}
                        </span>
                      </TableCell>

                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatTokens(
                          Number(
                            agent.tokens_used ?? 0,
                          ),
                        )}
                      </TableCell>

                      <TableCell className="pr-6 text-right">
                        <span className="text-xs font-semibold text-foreground">
                          {formatCurrency(
                            Number(
                              agent.cost_usd ?? 0,
                            ),
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          DATABASE STATUS
      ================================================================= */}

      <Card className="border-border bg-card transition-colors hover:border-primary/20">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
              <Activity className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">
                Analytics connected to Supabase
              </p>

              <p className="text-xs text-muted-foreground">
                All metrics are calculated from the live agents table.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-75",
                  isFetching
                    ? "animate-ping bg-warning"
                    : "animate-ping bg-success",
                )}
              />

              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  isFetching
                    ? "bg-warning"
                    : "bg-success",
                )}
              />
            </span>

            <Badge
              variant="outline"
              className={cn(
                isFetching
                  ? "border-warning/25 bg-warning/5 text-warning"
                  : "border-success/25 bg-success/5 text-success",
              )}
            >
              {isFetching ? "Updating" : "Live"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================================
   Components
============================================================================ */

function PageHeader({
  isFetching,
}: {
  isFetching: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Cost & Analytics
            </h1>

            <p className="text-sm text-muted-foreground">
              Monitor token usage, success rates, and cost trends across agents.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75",
              isFetching
                ? "animate-ping bg-warning"
                : "bg-success",
            )}
          />

          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              isFetching
                ? "bg-warning"
                : "bg-success",
            )}
          />
        </span>

        {isFetching
          ? "Updating analytics..."
          : "Live analytics"}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  iconClass: string;
}) {
  return (
    <Card className="card-glow border-border bg-card transition-all hover:border-primary/20 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-sm font-medium text-muted-foreground">
          {title}
        </p>

        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            iconClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border bg-card transition-all hover:shadow-md",
        className,
      )}
    >
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/50 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {label}
          </p>

          <p className="mt-0.5 text-lg font-semibold text-foreground">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
      No agent data available.
    </div>
  );
}