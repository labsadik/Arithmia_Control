"use client";

import { Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const environments = [
  { value: "production", label: "Production", color: "bg-success" },
  { value: "staging", label: "Staging", color: "bg-warning" },
];

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      <div className="hidden flex-1 md:block">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents, approvals, logs..."
            className="h-9 border-border bg-background/60 pl-9 text-sm placeholder:text-muted-foreground focus-visible:bg-background"
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4">
        <Select defaultValue="production">
          <SelectTrigger
            className="h-9 w-[10.5rem] gap-2 border-border bg-background/60 text-xs font-medium"
            aria-label="Select environment"
          >
            <span className="flex items-center gap-2">
              <EnvironmentDot value="production" />
              <SelectValue placeholder="Environment" />
            </span>
          </SelectTrigger>
          <SelectContent className="border-border bg-popover text-popover-foreground">
            {environments.map((env) => (
              <SelectItem
                key={env.value}
                value={env.value}
                className="text-xs focus:bg-accent focus:text-accent-foreground"
              >
                <span className="flex items-center gap-2">
                  <EnvironmentDot value={env.value} />
                  {env.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 pl-2 border-l border-border">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">Jane Doe</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-secondary text-sm font-medium text-secondary-foreground">
              JD
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

function EnvironmentDot({ value }: { value: string }) {
  const env = environments.find((e) => e.value === value);
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full ring-2 ring-background",
        env?.color ?? "bg-muted-foreground",
      )}
    />
  );
}
