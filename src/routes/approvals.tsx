import { createFileRoute } from "@tanstack/react-router";
import { UserCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Human-in-the-Loop Approvals — OmniAgent Control" },
      { name: "description", content: "Review and approve AI agent handoffs." },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Human-in-the-Loop Approvals
        </h1>
        <p className="text-sm text-muted-foreground">
          Review actions that require human approval before agents continue.
        </p>
      </div>

      <Card className="card-glow border-border bg-card">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">3 pending approvals</CardTitle>
            <CardDescription className="text-xs">
              All items are within SLA and awaiting your review.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            An approvals queue with approve/reject actions, notes, and audit history will be added
            here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
