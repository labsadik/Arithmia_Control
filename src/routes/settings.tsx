import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — OmniAgent Control" },
      { name: "description", content: "Configure OmniAgent Control workspace and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage workspace preferences, thresholds, and integrations.
        </p>
      </div>

      <Card className="card-glow border-border bg-card">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Workspace settings</CardTitle>
            <CardDescription className="text-xs">
              Configure notification channels, approval policies, and roles.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A full settings form with tabs for profile, integrations, and billing will be added
            here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
