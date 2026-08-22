import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Cost & Analytics — OmniAgent Control" },
      { name: "description", content: "Track token spend, success rates, and agent performance." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Cost & Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Monitor token usage, success rates, and cost trends across agents.
        </p>
      </div>

      <Card className="card-glow border-border bg-card">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">$1,240 spent this month</CardTitle>
            <CardDescription className="text-xs">
              Down 8% compared to last month.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Charts, cost breakdowns, and agent-level metrics will be added here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
