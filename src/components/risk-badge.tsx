import { ShieldAlert, ShieldCheck, ShieldHalf, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type RiskLevel = "low" | "high" | "critical";

const RISK_CONFIG: Record<RiskLevel, { label: string; classes: string; icon: LucideIcon }> = {
  low: {
    label: "Low",
    classes: "border-success/25 bg-success/10 text-success",
    icon: ShieldCheck,
  },
  high: {
    label: "High",
    classes: "border-warning/25 bg-warning/10 text-warning",
    icon: ShieldHalf,
  },
  critical: {
    label: "Critical",
    classes: "border-danger/25 bg-danger/10 text-danger",
    icon: ShieldAlert,
  },
};

export function RiskBadge({ level, className }: { level: string; className?: string }) {
  const config = RISK_CONFIG[(level as RiskLevel) in RISK_CONFIG ? (level as RiskLevel) : "low"];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.classes,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
