import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  running: { classes: "border-info/20 bg-info/10 text-info", dot: "bg-info" },
  completed: { classes: "border-success/20 bg-success/10 text-success", dot: "bg-success" },
  action_required: { classes: "border-warning/20 bg-warning/10 text-warning", dot: "bg-warning" },
  failed: { classes: "border-danger/20 bg-danger/10 text-danger", dot: "bg-danger" },
  idle: { classes: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  paused: { classes: "border-warning/20 bg-warning/10 text-warning", dot: "bg-warning" },
  error: { classes: "border-danger/20 bg-danger/10 text-danger", dot: "bg-danger" },
} as const;

export type StatusVariant = keyof typeof STATUS_CONFIG;

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: StatusVariant;
  label: string;
  pulse?: boolean;
}

export function StatusBadge({ className, variant, label, pulse = false }: StatusBadgeProps) {
  const config = STATUS_CONFIG[variant] ?? STATUS_CONFIG.running;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.classes,
        className,
      )}
    >
      <span
        className={cn(
          "status-dot",
          config.dot,
          variant === "running" && pulse && "animate-pulse-slow",
        )}
      />
      <span>{label}</span>
    </div>
  );
}
