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
  Area,
  AreaChart,
  CartesianGrid,
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
      { title: "Cost & Analytics — OmniAgent Control" },
      { name: "description", content: "Track token usage, spend, success rates, and agent performance." },
      { property: "og:title", content: "Cost & Analytics — OmniAgent Control" },
      { property: "og:description", content: "Track token usage, spend, success rates, and agent performance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

type Agent = Tables<"agents">;

const ANALYTICS_QUERY_KEY = ["analytics-agents"];

const CHART_COLORS = [
  "#111827", // gray-900
  "#374151", // gray-700
  "#6b7280", // gray-500
  "#9ca3af", // gray-400
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
];

/* ============================================================================ Helpers ============================================================================ */

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
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatNumber(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function statusClasses(status: string) {
  switch (status) {
    case "running": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "idle": return "border-gray-200 bg-gray-50 text-gray-600";
    case "paused": return "border-amber-200 bg-amber-50 text-amber-700";
    case "error": return "border-red-200 bg-red-50 text-red-700";
    default: return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

function getStatusLabel(status: string) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/* ============================================================================ Page ============================================================================ */

function AnalyticsPage() {
  const queryClient = useQueryClient();
  const [animate, setAnimate] = useState(false);

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
        .order("cost_usd", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  useRealtimeTable("agents", [ANALYTICS_QUERY_KEY]);

  useEffect(() => {
    setAnimate(false);
    const timer = window.setTimeout(() => setAnimate(true), 100);
    return () => window.clearTimeout(timer);
  }, [agents]);

  const refreshAnalytics = () => {
    queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
  };

  const analytics = useMemo(() => {
    const totalCost = agents.reduce((sum, agent) => sum + Number(agent.cost_usd ?? 0), 0);
    const totalTokens = agents.reduce((sum, agent) => sum + Number(agent.tokens_used ?? 0), 0);
    const totalTasks = agents.reduce((sum, agent) => sum + Number(agent.tasks_completed ?? 0), 0);

    const averageSuccessRate = agents.length > 0
      ? agents.reduce((sum, agent) => sum + Number(agent.success_rate ?? 0), 0) / agents.length
      : 0;

    const runningAgents = agents.filter((agent) => agent.status === "running").length;
    const failedAgents = agents.filter((agent) => agent.status === "error").length;
    const productionAgents = agents.filter((agent) => agent.environment === "production").length;
    const stagingAgents = agents.filter((agent) => agent.environment === "staging").length;

    const costPerTask = totalTasks > 0 ? totalCost / totalTasks : 0;
    const tokensPerTask = totalTasks > 0 ? totalTokens / totalTasks : 0;

    const topCostAgent = agents.length > 0
      ? agents.reduce((highest, agent) => Number(agent.cost_usd ?? 0) > Number(highest.cost_usd ?? 0) ? agent : highest)
      : null;

    const topSuccessAgent = agents.length > 0
      ? agents.reduce((highest, agent) => Number(agent.success_rate ?? 0) > Number(highest.success_rate ?? 0) ? agent : highest)
      : null;

    const modelCosts = agents.reduce<Record<string, number>>((result, agent) => {
      const model = agent.model || "Unknown";
      result[model] = (result[model] ?? 0) + Number(agent.cost_usd ?? 0);
      return result;
    }, {});

    const chartData = Object.entries(modelCosts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));

    const productionCost = agents.filter((agent) => agent.environment === "production")
      .reduce((sum, agent) => sum + Number(agent.cost_usd ?? 0), 0);

    const stagingCost = agents.filter((agent) => agent.environment === "staging")
      .reduce((sum, agent) => sum + Number(agent.cost_usd ?? 0), 0);

    return {
      totalCost, totalTokens, totalTasks, averageSuccessRate, runningAgents, failedAgents,
      productionAgents, stagingAgents, costPerTask, tokensPerTask, topCostAgent, topSuccessAgent,
      modelCosts, chartData, productionCost, stagingCost,
    };
  }, [agents]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader isFetching={false} />
        <Card className="border-gray-200 bg-white">
          <CardContent className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading analytics from Supabase...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader isFetching={false} />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-700">Could not load analytics</p>
                <p className="mt-1 text-xs text-gray-500">
                  {error instanceof Error ? error.message : "An unexpected database error occurred."}
                </p>
                <button type="button" onClick={refreshAnalytics} className="mt-3 text-xs font-medium text-gray-900 hover:underline">
                  Try again
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader isFetching={isFetching} />

      {/* PRIMARY METRICS */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Spend" value={formatCurrency(analytics.totalCost)} description="Across all agents" icon={Coins} />
        <MetricCard title="Tokens Used" value={formatTokens(analytics.totalTokens)} description={`${formatTokens(analytics.tokensPerTask)} per task`} icon={Zap} />
        <MetricCard title="Success Rate" value={formatPercent(analytics.averageSuccessRate)} description="Average across agents" icon={CheckCircle2} />
        <MetricCard title="Active Agents" value={`${analytics.runningAgents}/${agents.length}`} description={`${analytics.failedAgents} currently in error`} icon={Bot} />
      </div>

      {/* CHARTS - STOCK MARKET STYLE */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Area Chart */}
        <Card className="border-gray-200 bg-white lg:col-span-2 rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Model-wise Cost Trend</CardTitle>
                <p className="mt-1 text-xs text-gray-500">Live spend breakdown by AI model</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <BarChart3 className="h-4 w-4" strokeWidth={2.5} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-[320px] w-full">
              {analytics.chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  No cost data available in the agents table.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#111827" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={50} />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff', padding: '8px 12px' }} 
                      labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                      formatter={(value: number) => [formatCurrency(value), "Cost"]} 
                    />
                    <Area type="monotone" dataKey="value" stroke="#111827" strokeWidth={2} fill="url(#costGradient)" animationDuration={800} animationEasing="ease-out" isAnimationActive={animate} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Premium Market Share List (Replaces Pie Chart) */}
        <Card className="border-gray-200 bg-white rounded-xl shadow-sm">
          <CardHeader className="p-5 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-900">Cost Distribution</CardTitle>
            <p className="text-xs text-gray-500">Market share by model</p>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-5">
              {analytics.chartData.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">No data available.</div>
              ) : (
                analytics.chartData.map((entry, index) => {
                  const total = analytics.chartData.reduce((sum, d) => sum + d.value, 0);
                  const percent = total > 0 ? (entry.value / total) * 100 : 0;
                  return (
                    <div key={`dist-${index}`} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">{entry.name}</span>
                        <span className="text-gray-500 tabular-nums">{formatCurrency(entry.value)} <span className="text-gray-400">({percent.toFixed(1)}%)</span></span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${percent}%`, backgroundColor: entry.color || '#111827' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Total Models</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">{analytics.chartData.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Highest Cost</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">
                  {analytics.chartData.length > 0 ? formatCurrency(analytics.chartData[0].value) : "$0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COST SUMMARY */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Production" value={formatCurrency(analytics.productionCost)} icon={Database} />
        <SummaryCard label="Staging" value={formatCurrency(analytics.stagingCost)} icon={Activity} />
        <SummaryCard label="Cost / Task" value={formatCurrency(analytics.costPerTask)} icon={TrendingDown} />
        <SummaryCard label="Total Tasks" value={formatNumber(analytics.totalTasks)} icon={CheckCircle2} />
      </div>

      {/* TOP PERFORMERS */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="p-5 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-900">Highest Spend</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {analytics.topCostAgent ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-all hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-10 bg-gray-900 rounded-full"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{analytics.topCostAgent.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{analytics.topCostAgent.model}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(Number(analytics.topCostAgent.cost_usd ?? 0))}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatTokens(Number(analytics.topCostAgent.tokens_used ?? 0))} tokens</p>
                </div>
              </div>
            ) : <EmptyState />}
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="p-5 border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-900">Highest Success Rate</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {analytics.topSuccessAgent ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-all hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-10 bg-emerald-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{analytics.topSuccessAgent.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{analytics.topSuccessAgent.model}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600 tabular-nums">{formatPercent(Number(analytics.topSuccessAgent.success_rate ?? 0))}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatNumber(Number(analytics.topSuccessAgent.tasks_completed ?? 0))} tasks</p>
                </div>
              </div>
            ) : <EmptyState />}
          </CardContent>
        </Card>
      </div>

      {/* AGENT PERFORMANCE TABLE */}
      <Card className="border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">Agent-level Analytics</CardTitle>
          <p className="text-xs text-gray-500">Live data from the agents table.</p>
        </CardHeader>
        <CardContent className="p-0">
          {agents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">No agent analytics available.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 hover:bg-transparent">
                    <TableHead className="pl-6 text-gray-500">Agent</TableHead>
                    <TableHead className="text-gray-500">Model</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                    <TableHead className="text-right text-gray-500">Tasks</TableHead>
                    <TableHead className="text-right text-gray-500">Success</TableHead>
                    <TableHead className="text-right text-gray-500">Tokens</TableHead>
                    <TableHead className="pr-6 text-right text-gray-500">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id} className="border-gray-50 transition-colors hover:bg-gray-50">
                      <TableCell className="pl-6">
                        <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{agent.environment}</p>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{agent.model}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] font-medium", statusClasses(agent.status))}>
                          {getStatusLabel(agent.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-gray-700 tabular-nums">{formatNumber(Number(agent.tasks_completed ?? 0))}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("text-xs font-semibold tabular-nums", Number(agent.success_rate ?? 0) >= 99 ? "text-emerald-600" : Number(agent.success_rate ?? 0) >= 95 ? "text-amber-600" : "text-red-600")}>
                          {formatPercent(Number(agent.success_rate ?? 0))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-gray-500 tabular-nums">{formatTokens(Number(agent.tokens_used ?? 0))}</TableCell>
                      <TableCell className="pr-6 text-right text-xs font-semibold text-gray-900 tabular-nums">{formatCurrency(Number(agent.cost_usd ?? 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DATABASE STATUS */}
      <Card className="border-gray-200 bg-white rounded-xl shadow-sm transition-colors hover:border-gray-300">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Activity className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Analytics connected to Supabase</p>
              <p className="text-xs text-gray-500">All metrics are calculated from the live agents table.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", isFetching ? "animate-ping bg-amber-500" : "animate-ping bg-emerald-500")} />
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", isFetching ? "bg-amber-500" : "bg-emerald-500")} />
            </span>
            <Badge variant="outline" className={cn("text-[10px]", isFetching ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
              {isFetching ? "Updating" : "Live"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================================ Components ============================================================================ */

function PageHeader({ isFetching }: { isFetching: boolean }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
            <BarChart3 className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cost & Analytics</h1>
            <p className="text-sm text-gray-500">Monitor token usage, success rates, and cost trends across agents.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <span className="relative flex h-2 w-2">
          <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", isFetching ? "animate-ping bg-amber-500" : "bg-emerald-500")} />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", isFetching ? "bg-amber-500" : "bg-emerald-500")} />
        </span>
        {isFetching ? "Updating analytics..." : "Live analytics"}
      </div>
    </div>
  );
}

function MetricCard({ title, value, description, icon: Icon }: { title: string; value: string; description: string; icon: React.ElementType; }) {
  return (
    <Card className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-gray-300">
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition-all duration-300 group-hover:bg-gray-900 group-hover:text-white">
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">{value}</div>
        <p className="mt-2 text-xs font-medium text-gray-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType; }) {
  return (
    <Card className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-gray-300">
      <CardContent className="p-0 flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition-all duration-300 group-hover:bg-gray-900 group-hover:text-white">
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">
      No agent data available.
    </div>
  );
}