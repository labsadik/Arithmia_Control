"use client";

import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import {
  Bot,
  BrainCircuit,
  LayoutDashboard,
  PanelLeft,
  Settings,
  UserCheck,
  BarChart3,
  Key,
  ChevronRight,
  Activity,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "destructive" | "info";
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "SUPER AI Brain",
    url: "/brain",
    icon: BrainCircuit,
    badge: "Live",
    badgeVariant: "success",
  },
  {
    title: "Active Agents",
    url: "/agents",
    icon: Bot,
    badge: "12",
    badgeVariant: "default",
  },
  {
    title: "Human Approvals",
    url: "/approvals",
    icon: UserCheck,
    badge: "3",
    badgeVariant: "warning",
  },
  {
    title: "Cost & Analytics",
    url: "/analytics",
    icon: BarChart3,
    badge: "Live",
    badgeVariant: "success",
  },
  {
    title: "API Management",
    url: "/api-management",
    icon: Key,
    badge: "New",
    badgeVariant: "info",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: NAV_ITEMS.slice(0, 5),
  },
  {
    label: "Configuration",
    items: NAV_ITEMS.slice(5, 6),
  },
  {
    label: "System",
    items: NAV_ITEMS.slice(6),
  },
];

export function AppSidebar() {
  const { state, toggleSidebar, isMobile } = useSidebar();

  const collapsed = state === "collapsed";

  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });

  const checkIsActive = useMemo(
    () => (url: string, exact?: boolean) => {
      if (exact) return currentPath === url;

      return (
        currentPath === url ||
        currentPath.startsWith(`${url}/`)
      );
    },
    [currentPath],
  );

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "fixed inset-y-0 left-0 z-50",
        "overflow-hidden",
        "border-r border-sidebar-border",
        "bg-sidebar",
        "shadow-[4px_0_24px_rgba(0,0,0,0.04)]",
      )}
    >
      {/* =====================================================
          GRAPH / LINE BACKGROUND
      ====================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(
              to right,
              hsl(var(--primary) / 0.4) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              hsl(var(--primary) / 0.4) 1px,
              transparent 1px
            )
          `,
          backgroundSize: "32px 32px",
          maskImage:
            "linear-gradient(to bottom, black 0%, transparent 92%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, transparent 92%)",
        }}
      />

      {/* Top graph glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -top-20
          left-1/2
          z-0
          h-64
          w-64
          -translate-x-1/2
          rounded-full
          bg-primary/10
          blur-3xl
        "
      />

      {/* =====================================================
          HEADER / IMAGE ONLY
      ====================================================== */}

      <div
        className="
          relative
          z-10
          flex
          h-20
          shrink-0
          items-center
          justify-center
          border-b
          border-sidebar-border
          px-3
        "
      >
        <Link
          to="/"
          aria-label="Go to Dashboard"
          className="
            block
            w-full
            rounded-xl
            outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        >
          <div
            className={cn(
              "relative flex w-full items-center justify-center overflow-hidden",
              "transition-all duration-200",
              collapsed && !isMobile
                ? "h-12"
                : "h-16",
            )}
          >
            <img
              src="https://ik.imagekit.io/xvqovhmcyr/arithmia-removebg-preview.png"
              alt="Arithmia"
              draggable={false}
              className="
                h-full
                w-full
                object-contain
                select-none
              "
            />
          </div>
        </Link>
      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <SidebarContent
        className="
          relative
          z-10
          flex-1
          overflow-y-auto
          overflow-x-hidden
          px-2
          py-4
        "
      >
        <div className="space-y-5">
          {NAV_GROUPS.map((group) => (
            <SidebarGroup
              key={group.label}
              className="p-0"
            >
              {/* Group label */}
              <SidebarGroupLabel
                className={cn(
                  "mb-1.5 h-7 px-3",
                  "text-[10px] font-semibold uppercase",
                  "tracking-[0.12em]",
                  "text-muted-foreground/60",
                  collapsed &&
                    !isMobile &&
                    "sr-only",
                )}
              >
                {group.label}
              </SidebarGroupLabel>

              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const isActive = checkIsActive(
                    item.url,
                    item.exact,
                  );

                  return (
                    <SidebarMenuItem
                      key={item.title}
                    >
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          /* Base */
                          "group relative h-11 rounded-lg px-3",
                          "text-sm",
                          "transition-all duration-200 ease-out",

                          /* Hover */
                          !isActive && [
                            "text-muted-foreground",
                            "hover:-translate-y-[1px]",
                            "hover:bg-sidebar-accent",
                            "hover:text-sidebar-foreground",
                            "hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)]",
                          ],

                          /* Active */
                          isActive && [
                            "bg-sidebar-accent",
                            "text-sidebar-foreground",
                            "shadow-[0_4px_14px_rgba(0,0,0,0.06)]",

                            /* Active indicator */
                            "before:absolute",
                            "before:left-0",
                            "before:top-1/2",
                            "before:h-6",
                            "before:w-[3px]",
                            "before:-translate-y-1/2",
                            "before:rounded-full",
                            "before:bg-primary",
                          ],

                          "focus-visible:outline-none",
                          "focus-visible:ring-2",
                          "focus-visible:ring-ring",
                        )}
                      >
                        <Link
                          to={item.url}
                          aria-current={
                            isActive
                              ? "page"
                              : undefined
                          }
                          className="
                            flex
                            h-full
                            w-full
                            items-center
                            gap-3
                          "
                        >
                          {/* Icon */}
                          <item.icon
                            className={cn(
                              "size-[18px] shrink-0",
                              "transition-all duration-200",

                              isActive
                                ? [
                                    "text-primary",
                                    "scale-105",
                                  ]
                                : [
                                    "text-muted-foreground",
                                    "group-hover:text-sidebar-foreground",
                                    "group-hover:scale-110",
                                  ],
                            )}
                            strokeWidth={
                              isActive
                                ? 2.25
                                : 1.8
                            }
                            aria-hidden="true"
                          />

                          {/* Text */}
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate",
                              "transition-all duration-200",

                              collapsed &&
                                !isMobile && [
                                  "w-0",
                                  "opacity-0",
                                  "overflow-hidden",
                                ],
                            )}
                          >
                            {item.title}
                          </span>

                          {/* Badge */}
                          {item.badge && (
                            <Badge
                              variant={
                                item.badgeVariant ||
                                "default"
                              }
                              className={cn(
                                "h-5 rounded-md px-1.5",
                                "text-[10px] font-semibold",
                                "shadow-none",

                                collapsed &&
                                  !isMobile &&
                                  "hidden",

                                "transition-transform duration-200",
                                "group-hover:scale-105",
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}

                          {/* Active arrow */}
                          {!collapsed &&
                            isActive && (
                              <ChevronRight
                                className="
                                  size-3.5
                                  shrink-0
                                  text-muted-foreground/60
                                  transition-transform
                                  duration-200
                                  group-hover:translate-x-0.5
                                "
                                aria-hidden="true"
                              />
                            )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </div>

        {/* =====================================================
            SYSTEM STATUS
        ====================================================== */}

        <div
          className={cn(
            "mt-auto px-1 pt-6",
            collapsed &&
              !isMobile &&
              "hidden",
          )}
        >
          <div
            className="
              rounded-xl
              border
              border-sidebar-border
              bg-sidebar-accent/30
              px-3
              py-2.5
            "
          >
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-2 shrink-0">
                <span
                  className="
                    absolute
                    inline-flex
                    size-full
                    animate-ping
                    rounded-full
                    bg-emerald-500/50
                  "
                />

                <span
                  className="
                    relative
                    size-2
                    rounded-full
                    bg-emerald-500
                  "
                />
              </div>

              <span className="text-xs font-medium text-sidebar-foreground">
                All systems operational
              </span>

              <Activity
                className="
                  ml-auto
                  size-3.5
                  text-emerald-500
                "
              />
            </div>

            <div
              className="
                mt-2
                flex
                items-center
                justify-between
                border-t
                border-sidebar-border/70
                pt-2
                text-[10px]
                text-muted-foreground
              "
            >
              <span>99.98% uptime</span>

              <span className="font-mono">
                us-east-1
              </span>
            </div>
          </div>
        </div>
      </SidebarContent>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <SidebarFooter
        className="
          relative
          z-10
          shrink-0
          border-t
          border-sidebar-border
          bg-sidebar/95
          p-2
          backdrop-blur-sm
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
            rounded-lg
            p-2
          "
        >
          {/* User Avatar - Updated with Image */}
          <div
            className="
              relative
              flex
              size-8
              shrink-0
              items-center
              justify-center
              rounded-full
              overflow-hidden
              ring-1
              ring-border/60
            "
          >
            <img
              src="https://ik.imagekit.io/xvqovhmcyr/image.jpg"
              alt="Swastik Naskar"
              className="size-full object-cover"
            />

            <span
              className="
                absolute
                bottom-0
                right-0
                size-2
                rounded-full
                border-2
                border-sidebar
                bg-emerald-500
              "
              aria-label="Online"
            />
          </div>

          {/* User information - Fixed Typo */}
          <div
            className={cn(
              "min-w-0 flex-1",
              collapsed &&
                !isMobile &&
                "hidden",
            )}
          >
            <div
              className="
                truncate
                text-xs
                font-semibold
                text-sidebar-foreground
              "
            >
              Swastik Naskar
            </div>

            <div
              className="
                truncate
                text-[10px]
                text-muted-foreground
              "
            >
              Administrator
            </div>
          </div>

          {/* Collapse */}
          {!collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="
                rounded-md
                p-1.5
                text-muted-foreground
                transition-all
                duration-200
                hover:bg-sidebar-accent
                hover:text-sidebar-foreground
                hover:scale-105
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
              "
              aria-label="Collapse sidebar"
            >
              <PanelLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Expand */}
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="
              mt-1
              flex
              h-8
              w-full
              items-center
              justify-center
              rounded-md
              text-muted-foreground
              transition-all
              duration-200
              hover:bg-sidebar-accent
              hover:text-sidebar-foreground
              hover:scale-105
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
            aria-label="Expand sidebar"
          >
            <PanelLeft className="size-4 rotate-180" />
          </button>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}