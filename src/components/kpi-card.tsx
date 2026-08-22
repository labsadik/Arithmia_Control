import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  className?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection = "neutral",
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("card-glow border-border bg-card text-card-foreground", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {trend && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              trendDirection === "up" && "text-success",
              trendDirection === "down" && "text-danger",
              trendDirection === "neutral" && "text-muted-foreground",
            )}
          >
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
