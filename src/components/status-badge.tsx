import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        running: "border-info/20 bg-info/10 text-info",
        completed: "border-success/20 bg-success/10 text-success",
        action_required: "border-warning/20 bg-warning/10 text-warning",
        failed: "border-danger/20 bg-danger/10 text-danger",
      },
    },
    defaultVariants: {
      variant: "running",
    },
  },
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof statusBadgeVariants> {
  label: string;
  pulse?: boolean;
}

export function StatusBadge({ className, variant, label, pulse = false }: StatusBadgeProps) {
  return (
    <div className={cn(statusBadgeVariants({ variant }), className)}>
      <span
        className={cn(
          "status-dot",
          variant === "running" && pulse && "animate-pulse-slow",
          variant === "running" && !pulse && "bg-info",
          variant === "completed" && "bg-success",
          variant === "action_required" && "bg-warning",
          variant === "failed" && "bg-danger",
        )}
      />
      <span>{label}</span>
    </div>
  );
}
