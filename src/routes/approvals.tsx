import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Clock, ShieldAlert, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiskBadge } from "@/components/risk-badge";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Human-in-the-Loop Approvals — OmniAgent Control" },
      { name: "description", content: "Review and approve AI agent handoffs." },
      { property: "og:title", content: "Human-in-the-Loop Approvals — OmniAgent Control" },
      { property: "og:description", content: "Review and approve AI agent handoffs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApprovalsPage,
});

type Approval = Tables<"approvals">;

const RESOLUTION_STYLES: Record<string, { classes: string; dot: string; label: string }> = {
  pending: {
    classes: "border-warning/25 bg-warning/10 text-warning",
    dot: "bg-warning",
    label: "Pending",
  },
  approved: {
    classes: "border-success/25 bg-success/10 text-success",
    dot: "bg-success",
    label: "Approved",
  },
  rejected: {
    classes: "border-danger/25 bg-danger/10 text-danger",
    dot: "bg-danger",
    label: "Rejected",
  },
};

function ResolutionBadge({ status }: { status: string }) {
  const config = RESOLUTION_STYLES[status] ?? RESOLUTION_STYLES["pending"]!;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.classes,
      )}
    >
      <span className={cn("status-dot", config.dot)} />
      {config.label}
    </span>
  );
}

function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Approval | null>(null);

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("*")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useRealtimeTable("approvals", ["approvals"]);

  const resolveMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("approvals")
        .update({
          status: decision,
          resolved_at: new Date().toISOString(),
          resolved_by: "Jane Doe",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.decision === "approved" ? "Request approved" : "Request rejected", {
        description: "The agent has been notified of your decision.",
      });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setSelected(null);
    },
    onError: (error) => {
      toast.error("Could not resolve request", { description: error.message });
    },
  });

  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");
  const sorted = [...pending, ...resolved];
  const criticalPending = pending.filter((a) => a.risk_level === "critical").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Human-in-the-Loop Approvals
          </h1>
          <p className="text-sm text-muted-foreground">
            Review actions that require human verification before agents continue.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="status-dot bg-success animate-pulse" />
          Live queue
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-glow border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/10 text-warning">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{pending.length}</div>
          </CardContent>
        </Card>
        <Card className="card-glow border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">Critical Pending</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-danger/10 text-danger">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{criticalPending}</div>
          </CardContent>
        </Card>
        <Card className="card-glow border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">Resolved</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10 text-success">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{resolved.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-glow border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Approval Queue</CardTitle>
          <CardDescription className="text-xs">
            Click a row to inspect the full request log before deciding
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-6">Requested Action</TableHead>
                <TableHead className="hidden lg:table-cell">Details</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="hidden md:table-cell">Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading approval queue…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && sorted.length === 0 && (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No approval requests yet.
                  </TableCell>
                </TableRow>
              )}
              {sorted.map((approval) => (
                <TableRow
                  key={approval.id}
                  className="cursor-pointer border-border hover:bg-accent/40"
                  onClick={() => setSelected(approval)}
                >
                  <TableCell className="pl-6">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{approval.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{approval.agent_name}</span>
                        <Badge
                          variant="outline"
                          className="border-border text-[10px] uppercase tracking-wide text-muted-foreground"
                        >
                          {approval.action_type.replaceAll("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-xs lg:table-cell">
                    <p className="truncate text-xs text-muted-foreground">{approval.description}</p>
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={approval.risk_level} />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {formatRelativeTime(approval.requested_at)}
                  </TableCell>
                  <TableCell>
                    <ResolutionBadge status={approval.status} />
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-end gap-2">
                      {approval.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(approval);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-danger text-danger-foreground hover:bg-danger/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(approval);
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          by {approval.resolved_by ?? "—"}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-border bg-card sm:max-w-xl"
        >
          {selected && (
            <>
              <SheetHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge level={selected.risk_level} />
                  <ResolutionBadge status={selected.status} />
                </div>
                <SheetTitle className="text-lg text-foreground">{selected.title}</SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  {selected.description}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-4">
                <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-background/60 p-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Agent</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{selected.agent_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Action type</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {selected.action_type.replaceAll("_", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Requested</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {new Date(selected.requested_at).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="mt-0.5 font-medium capitalize text-foreground">
                      {selected.status}
                      {selected.resolved_by ? ` · ${selected.resolved_by}` : ""}
                    </dd>
                  </div>
                </dl>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Full request log (JSON)
                  </p>
                  <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/60 p-3 text-[11px] leading-relaxed text-foreground">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </div>
              </div>

              <SheetFooter className="border-t border-border">
                {selected.status === "pending" ? (
                  <div className="flex w-full flex-col gap-2 sm:flex-row">
                    <Button
                      className="flex-1 gap-2 bg-success text-success-foreground hover:bg-success/90"
                      disabled={resolveMutation.isPending}
                      onClick={() =>
                        resolveMutation.mutate({ id: selected.id, decision: "approved" })
                      }
                    >
                      <Check className="h-4 w-4" />
                      {resolveMutation.isPending ? "Submitting…" : "Confirm Approval"}
                    </Button>
                    <Button
                      className="flex-1 gap-2 bg-danger text-danger-foreground hover:bg-danger/90"
                      disabled={resolveMutation.isPending}
                      onClick={() =>
                        resolveMutation.mutate({ id: selected.id, decision: "rejected" })
                      }
                    >
                      <X className="h-4 w-4" />
                      {resolveMutation.isPending ? "Submitting…" : "Confirm Rejection"}
                    </Button>
                  </div>
                ) : (
                  <p className="w-full text-center text-xs text-muted-foreground">
                    This request was {selected.status} by {selected.resolved_by ?? "an operator"}
                    {selected.resolved_at
                      ? ` · ${new Date(selected.resolved_at).toLocaleString()}`
                      : ""}
                    .
                  </p>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
