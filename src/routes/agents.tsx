import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Bot, CreditCard, Rocket, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Active Agents — OmniAgent Control" },
      { name: "description", content: "Manage active AI agents and their workloads." },
      { property: "og:title", content: "Active Agents — OmniAgent Control" },
      { property: "og:description", content: "Manage active AI agents and their workloads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentsPage,
});

const STATUS_LABELS: Record<string, string> = {
  running: "Running",
  idle: "Idle",
  paused: "Paused",
  error: "Error",
};

const FILTERS = ["all", "running", "idle", "paused"] as const;
type Filter = (typeof FILTERS)[number];

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function AgentsPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("last_active_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useRealtimeTable("agents", ["agents"]);

  const running = agents.filter((a) => a.status === "running");
  const avgSuccess = running.length
    ? running.reduce((sum, a) => sum + Number(a.success_rate), 0) / running.length
    : 0;
  const totalCost = agents.reduce((sum, a) => sum + Number(a.cost_usd), 0);
  const visible = filter === "all" ? agents : agents.filter((a) => a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Active Agents</h1>
          <p className="text-sm text-muted-foreground">
            Live view of every agent running across your environments.
          </p>
        </div>
        <Button
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() =>
            toast.info("Deployment pipeline not connected", {
              description: "This prototype uses demo data — agent provisioning is not wired up yet.",
            })
          }
        >
          <Rocket className="h-4 w-4" />
          Deploy New AI Agent
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Agents" value={String(agents.length)} icon={Bot} />
        <KpiCard
          title="Running Now"
          value={String(running.length)}
          icon={Users}
          trend="Live from database"
          trendDirection="neutral"
        />
        <KpiCard
          title="Avg Success Rate"
          value={`${avgSuccess.toFixed(1)}%`}
          icon={Activity}
          trend="Running agents only"
          trendDirection="neutral"
        />
        <KpiCard
          title="Monthly Cost"
          value={`$${Math.round(totalCost).toLocaleString()}`}
          icon={CreditCard}
          trend="All environments"
          trendDirection="neutral"
        />
      </div>

      <Card className="card-glow border-border bg-card">
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Fleet Overview</CardTitle>
            <CardDescription className="text-xs">
              Updates in real time as agent state changes
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                  filter === value
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-6">Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Environment</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Tasks</TableHead>
                <TableHead className="text-right">Success</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Tokens</TableHead>
                <TableHead className="hidden md:table-cell text-right">Cost</TableHead>
                <TableHead className="pr-6 text-right">Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Loading agents…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && visible.length === 0 && (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No agents match this filter.
                  </TableCell>
                </TableRow>
              )}
              {visible.map((agent) => (
                <TableRow key={agent.id} className="border-border hover:bg-accent/40">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.model}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={agent.status as StatusVariant}
                      label={STATUS_LABELS[agent.status] ?? agent.status}
                      pulse={agent.status === "running"}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-border text-[10px] uppercase tracking-wide",
                        agent.environment === "production" ? "text-success" : "text-warning",
                      )}
                    >
                      {agent.environment}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-right text-sm text-foreground lg:table-cell">
                    {agent.tasks_completed.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-sm text-foreground">
                    {Number(agent.success_rate).toFixed(1)}%
                  </TableCell>
                  <TableCell className="hidden text-right text-sm text-muted-foreground lg:table-cell">
                    {compactNumber.format(agent.tokens_used)}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm text-foreground md:table-cell">
                    ${Number(agent.cost_usd).toLocaleString()}
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs text-muted-foreground">
                    {formatRelativeTime(agent.last_active_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
