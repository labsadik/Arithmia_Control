import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Coins, Cpu, Gauge, TrendingDown } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Cost & Analytics — OmniAgent Control" },
      { name: "description", content: "Track token spend, latency, and cost per AI agent." },
      { property: "og:title", content: "Cost & Analytics — OmniAgent Control" },
      { property: "og:description", content: "Track token spend, latency, and cost per AI agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

function providerOf(model: string): "OpenAI" | "Anthropic" | "Gemini" {
  const m = (model ?? "").toLowerCase();
  if (m.includes("claude")) return "Anthropic";
  if (m.includes("gemini")) return "Gemini";
  return "OpenAI";
}

// Deterministic pseudo-random so the demo series is stable between renders.
function seeded(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const PROVIDER_COLOR: Record<string, string> = {
  OpenAI: "hsl(160 84% 39%)",
  Anthropic: "hsl(24 90% 55%)",
  Gemini: "hsl(221 83% 53%)",
};

function AnalyticsPage() {
  const [range, setRange] = useState<"7" | "30">("7");
  const [provider, setProvider] = useState<string>("all");

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("*").order("cost_usd", {
        ascending: false,
      });
      if (error) throw error;
      return data;
    },
  });

  useRealtimeTable("agents", ["agents"]);

  const rows = useMemo(() => {
    const days = Number(range);
    const scale = days / 30;
    return agents
      .map((a, i) => {
        const p = providerOf(a.model);
        const tokens = Math.round(Number(a.tokens_used ?? 0) * scale);
        const cost = Number(a.cost_usd ?? 0) * scale;
        const latency = 320 + Math.round(seeded(i + 1) * 900);
        return { ...a, provider: p, tokens, cost, latency };
      })
      .filter((r) => provider === "all" || r.provider === provider);
  }, [agents, range, provider]);

  const series = useMemo(() => {
    const days = Number(range);
    const base: Record<string, number> = { OpenAI: 0, Anthropic: 0, Gemini: 0 };
    for (const r of rows) base[r.provider] = (base[r.provider] ?? 0) + r.tokens;
    return Array.from({ length: days }, (_, d) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - d));
      const point: Record<string, string | number> = {
        day: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      };
      for (const key of Object.keys(base)) {
        const jitter = 0.7 + seeded(d * 7 + key.length) * 0.6;
        point[key] = Math.round(((base[key] ?? 0) / days) * jitter);
      }
      return point;
    });
  }, [rows, range]);

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalTokens = rows.reduce((s, r) => s + r.tokens, 0);
  const avgLatency = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.latency, 0) / rows.length)
    : 0;
  const avgSuccess = rows.length
    ? rows.reduce((s, r) => s + Number(r.success_rate ?? 0), 0) / rows.length
    : 0;

  const providers = provider === "all" ? ["OpenAI", "Anthropic", "Gemini"] : [provider];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cost & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Token consumption, latency, and spend across your agent fleet.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as "7" | "30")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              <SelectItem value="OpenAI">OpenAI</SelectItem>
              <SelectItem value="Anthropic">Anthropic</SelectItem>
              <SelectItem value="Gemini">Gemini</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Coins className="h-4 w-4" />}
          label="Total spend"
          value={`$${totalCost.toFixed(2)}`}
          hint={`Last ${range} days`}
        />
        <SummaryCard
          icon={<Cpu className="h-4 w-4" />}
          label="Tokens consumed"
          value={totalTokens.toLocaleString()}
          hint={`${rows.length} agents`}
        />
        <SummaryCard
          icon={<Gauge className="h-4 w-4" />}
          label="Avg latency"
          value={`${avgLatency} ms`}
          hint="Across selected agents"
        />
        <SummaryCard
          icon={<TrendingDown className="h-4 w-4" />}
          label="Avg success rate"
          value={`${avgSuccess.toFixed(1)}%`}
          hint="Rolling window"
        />
      </div>

      <Card className="card-glow border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">API token consumption</CardTitle>
          <CardDescription className="text-xs">
            Daily tokens by model provider over the last {range} days.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                {providers.map((p) => (
                  <linearGradient key={p} id={`fill-${p}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PROVIDER_COLOR[p]} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={PROVIDER_COLOR[p]} stopOpacity={0.03} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={56} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => v.toLocaleString()}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {providers.map((p) => (
                <Area
                  key={p}
                  type="monotone"
                  dataKey={p}
                  stackId="1"
                  stroke={PROVIDER_COLOR[p]}
                  fill={`url(#fill-${p})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-glow border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Cost per agent</CardTitle>
          <CardDescription className="text-xs">
            Model, token volume, latency, and spend for each agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="pl-6">Agent</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="hidden sm:table-cell">Provider</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="hidden text-right md:table-cell">Avg latency</TableHead>
                <TableHead className="pr-6 text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Loading usage data…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No agents match this filter.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="border-border">
                  <TableCell className="pl-6 font-medium text-foreground">{r.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.model}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="border-border text-[10px]">
                      {r.provider}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">{r.tokens.toLocaleString()}</TableCell>
                  <TableCell className="hidden text-right text-sm md:table-cell">
                    {r.latency} ms
                  </TableCell>
                  <TableCell className="pr-6 text-right font-medium">
                    ${r.cost.toFixed(2)}
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

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="card-glow border-border bg-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </span>
          {label}
        </div>
        <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
