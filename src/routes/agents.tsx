import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  Bot,
  CreditCard,
  Rocket,
  Users,
  Loader2,
  Server,
  Cpu,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      {
        name: "description",
        content: "Manage active AI agents and their workloads.",
      },
      {
        property: "og:title",
        content: "Active Agents — OmniAgent Control",
      },
      {
        property: "og:description",
        content: "Manage active AI agents and their workloads.",
      },
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

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const MODELS = [
  {
    value: "gpt-4o",
    label: "GPT-4o",
    description: "OpenAI general purpose model",
  },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    description: "Fast and cost efficient",
  },
  {
    value: "claude-3-5-sonnet",
    label: "Claude 3.5 Sonnet",
    description: "Anthropic reasoning model",
  },
  {
    value: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    description: "Google multimodal model",
  },
];

function AgentsPage() {
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<Filter>("all");

  const [deployOpen, setDeployOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [agentName, setAgentName] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [environment, setEnvironment] = useState("production");
  const [status, setStatus] = useState("running");

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("last_active_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    },
  });

  useRealtimeTable("agents", ["agents"]);

  const running = agents.filter((a) => a.status === "running");

  const avgSuccess = running.length
    ? running.reduce(
        (sum, a) => sum + Number(a.success_rate),
        0,
      ) / running.length
    : 0;

  const totalCost = agents.reduce(
    (sum, a) => sum + Number(a.cost_usd),
    0,
  );

  const visible =
    filter === "all"
      ? agents
      : agents.filter((a) => a.status === filter);

  const resetForm = () => {
    setAgentName("");
    setModel("gpt-4o");
    setEnvironment("production");
    setStatus("running");
  };

  const closeDeployDialog = () => {
    if (creating) return;

    setDeployOpen(false);
    resetForm();
  };

  const createAgent = async () => {
    const name = agentName.trim();

    if (!name) {
      toast.error("Agent name is required.");
      return;
    }

    if (name.length < 2) {
      toast.error("Agent name is too short.");
      return;
    }

    if (name.length > 100) {
      toast.error("Agent name must be less than 100 characters.");
      return;
    }

    try {
      setCreating(true);

      /*
       * These are the only fields we need to insert.
       *
       * Your database supplies:
       * - id
       * - tasks_completed
       * - success_rate
       * - tokens_used
       * - cost_usd
       * - last_active_at
       * - created_at
       * - updated_at
       */
      const { data, error } = await supabase
        .from("agents")
        .insert({
          name,
          model,
          status,
          environment,
        })
        .select()
        .single();

      if (error) {
        /*
         * PostgreSQL unique constraint:
         * agents.name is UNIQUE.
         */
        if (error.code === "23505") {
          toast.error("Agent already exists.", {
            description: `"${name}" is already registered.`,
          });
        } else {
          toast.error("Could not create agent.", {
            description: error.message,
          });
        }

        return;
      }

      /*
       * Immediately update React Query.
       * This makes the new agent appear without waiting
       * for realtime events.
       */
      await queryClient.invalidateQueries({
        queryKey: ["agents"],
      });

      toast.success("Agent deployed successfully.", {
        description: `${data.name} is now available in ${data.environment}.`,
      });

      setDeployOpen(false);
      resetForm();
    } catch (error) {
      console.error("Create agent error:", error);

      toast.error("Something went wrong.", {
        description:
          error instanceof Error
            ? error.message
            : "Unable to create the agent.",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------- */}
      {/* Page Header                                                    */}
      {/* -------------------------------------------------------------- */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="size-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Active Agents
              </h1>

              <p className="text-sm text-muted-foreground">
                Live view of every agent running across your environments.
              </p>
            </div>
          </div>
        </div>

        <Button
          className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          onClick={() => setDeployOpen(true)}
        >
          <Rocket className="size-4" />
          Deploy New AI Agent
        </Button>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* KPI Cards                                                      */}
      {/* -------------------------------------------------------------- */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Agents"
          value={String(agents.length)}
          icon={Bot}
          className="transition-all duration-300 cursor-pointer hover:shadow-xl hover:[transform:perspective(1000px)_translateY(-10px)_rotateX(10deg)]"
        />

        <KpiCard
          title="Running Now"
          value={String(running.length)}
          icon={Users}
          trend="Live from database"
          trendDirection="neutral"
          className="transition-all duration-300 cursor-pointer hover:shadow-xl hover:[transform:perspective(1000px)_translateY(-10px)_rotateX(10deg)]"
        />

        <KpiCard
          title="Avg Success Rate"
          value={`${avgSuccess.toFixed(1)}%`}
          icon={Activity}
          trend="Running agents only"
          trendDirection="neutral"
          className="transition-all duration-300 cursor-pointer hover:shadow-xl hover:[transform:perspective(1000px)_translateY(-10px)_rotateX(10deg)]"
        />

        <KpiCard
          title="Monthly Cost"
          value={`$${Math.round(totalCost).toLocaleString()}`}
          icon={CreditCard}
          trend="All environments"
          trendDirection="neutral"
          className="transition-all duration-300 cursor-pointer hover:shadow-xl hover:[transform:perspective(1000px)_translateY(-10px)_rotateX(10deg)]"
        />
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Fleet Table                                                    */}
      {/* -------------------------------------------------------------- */}

      <Card className="card-glow border-border bg-card">
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Fleet Overview
            </CardTitle>

            <CardDescription className="text-xs">
              Updates in real time as agent state changes
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
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
                <TableHead className="hidden md:table-cell">
                  Environment
                </TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  Tasks
                </TableHead>
                <TableHead className="text-right">
                  Success
                </TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  Tokens
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Cost
                </TableHead>
                <TableHead className="pr-6 text-right">
                  Last Active
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading && (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading agents…
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && visible.length === 0 && (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <Bot className="size-5 text-muted-foreground" />
                      </div>

                      <p className="mt-3 text-sm font-medium text-foreground">
                        No agents found
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Deploy an AI agent to get started.
                      </p>

                      <Button
                        size="sm"
                        className="mt-4 gap-2"
                        onClick={() => setDeployOpen(true)}
                      >
                        <Rocket className="size-3.5" />
                        Deploy Agent
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {visible.map((agent) => (
                <TableRow
                  key={agent.id}
                  className="border-border hover:bg-accent/40"
                >
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Bot className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {agent.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {agent.model}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <StatusBadge
                      variant={agent.status as StatusVariant}
                      label={
                        STATUS_LABELS[agent.status] ??
                        agent.status
                      }
                      pulse={agent.status === "running"}
                    />
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-border text-[10px] uppercase tracking-wide",
                        agent.environment === "production"
                          ? "text-success"
                          : "text-warning",
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

      {/* -------------------------------------------------------------- */}
      {/* Deploy Agent Dialog                                            */}
      {/* -------------------------------------------------------------- */}

      <Dialog
        open={deployOpen}
        onOpenChange={(value) => {
          if (!creating) {
            setDeployOpen(value);

            if (!value) {
              resetForm();
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Rocket className="size-5" />
            </div>

            <DialogTitle>Deploy New AI Agent</DialogTitle>

            <DialogDescription>
              Configure the agent and add it to your OmniAgent fleet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="agent-name">
                Agent name
              </Label>

              <Input
                id="agent-name"
                value={agentName}
                onChange={(event) =>
                  setAgentName(event.target.value)
                }
                placeholder="e.g. Customer Support Agent"
                disabled={creating}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !creating) {
                    createAgent();
                  }
                }}
              />

              <p className="text-[11px] text-muted-foreground">
                Must be unique within your workspace.
              </p>
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label>AI model</Label>

              <Select
                value={model}
                onValueChange={setModel}
                disabled={creating}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Cpu className="size-4 text-muted-foreground" />
                    <SelectValue placeholder="Select model" />
                  </div>
                </SelectTrigger>

                <SelectContent>
                  {MODELS.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                    >
                      <div className="flex flex-col">
                        <span>{item.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Environment + Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Environment</Label>

                <Select
                  value={environment}
                  onValueChange={setEnvironment}
                  disabled={creating}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Server className="size-4 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="production">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        Production
                      </span>
                    </SelectItem>

                    <SelectItem value="staging">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-amber-500" />
                        Staging
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Initial status</Label>

                <Select
                  value={status}
                  onValueChange={setStatus}
                  disabled={creating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="running">
                      Running
                    </SelectItem>

                    <SelectItem value="idle">
                      Idle
                    </SelectItem>

                    <SelectItem value="paused">
                      Paused
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {agentName.trim() || "New AI Agent"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {model} · {environment}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="text-[10px] capitalize"
                >
                  {status}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeployDialog}
              disabled={creating}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={createAgent}
              disabled={creating || !agentName.trim()}
              className="gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deploying…
                </>
              ) : (
                <>
                  <Rocket className="size-4" />
                  Deploy Agent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}