import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Active Agents — OmniAgent Control" },
      { name: "description", content: "Manage active AI agents and their workloads." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Active Agents</h1>
        <p className="text-sm text-muted-foreground">
          View and manage the agents currently running in your environment.
        </p>
      </div>

      <Card className="card-glow border-border bg-card">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">All agents operational</CardTitle>
            <CardDescription className="text-xs">
              14 agents active across production and staging.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A detailed agent list, status filters, and runtime controls will be added here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
