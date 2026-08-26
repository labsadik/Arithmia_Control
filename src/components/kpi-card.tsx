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
    <Card 
      className={cn(
        "group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-gray-300",
        className
      )}
    >
      {/* Subtle premium background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10" />
      
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        
        {/* Premium Icon Box - turns dark gray on hover for a sleek effect */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition-all duration-300 group-hover:bg-gray-900 group-hover:text-white">
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Value: Large, bold, and uses tabular-nums so numbers don't jiggle when they update */}
        <div className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">{value}</div>
        
        {trend && (
          <div className="flex items-center gap-1.5 mt-2">
            {/* Dynamic Trend Arrow */}
            {trendDirection !== "neutral" && (
              <span className={cn(
                "flex items-center",
                trendDirection === "up" ? "text-emerald-600" : "text-red-600 rotate-90" // Rotates the up-arrow to point down if trend is down
              )}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
              </span>
            )}
            
            <p
              className={cn(
                "text-xs font-semibold tracking-wide",
                trendDirection === "up" && "text-emerald-600",
                trendDirection === "down" && "text-red-600",
                trendDirection === "neutral" && "text-gray-500",
              )}
            >
              {trend}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}