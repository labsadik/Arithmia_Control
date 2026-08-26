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
  Users,
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
    title: "Employees",
    url: "/emplys",
    icon: Users,
    exact: true,
    badge: "New",
    badgeVariant: "info",
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
    items: NAV_ITEMS.slice(0, 6),
  },
  {
    label: "Configuration",
    items: NAV_ITEMS.slice(6, 7),
  },
  {
    label: "System",
    items: NAV_ITEMS.slice(7),
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
      if (exact) {
        return currentPath === url;
      }

      return (
        currentPath === url ||
        currentPath.startsWith(`${url}/`)
      );
    },
    [currentPath],
  );

  return (
    <>
      {/* =====================================================
          ANIMATIONS
      ====================================================== */}

      <style>
        {`
          @keyframes sidebar-shimmer {
            0% {
              transform: translateX(-120%);
            }

            45%,
            100% {
              transform: translateX(120%);
            }
          }

          @keyframes sidebar-glow {
            0%,
            100% {
              opacity: 0.35;
            }

            50% {
              opacity: 0.8;
            }
          }

          @keyframes sidebar-float {
            0%,
            100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-2px);
            }
          }
        `}
      </style>

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
            BACKGROUND GRID
        ====================================================== */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            z-0
            opacity-[0.055]
          "
          style={{
            backgroundImage: `
              linear-gradient(
                to right,
                hsl(var(--primary) / 0.45) 1px,
                transparent 1px
              ),
              linear-gradient(
                to bottom,
                hsl(var(--primary) / 0.45) 1px,
                transparent 1px
              )
            `,
            backgroundSize: "32px 32px",
            maskImage:
              "linear-gradient(to bottom, black 0%, transparent 90%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, transparent 90%)",
          }}
        />

        {/* =====================================================
            TOP GLOW
        ====================================================== */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -top-24
            left-1/2
            z-0
            h-72
            w-72
            -translate-x-1/2
            rounded-full
            bg-primary/[0.08]
            blur-3xl
          "
        />

        {/* =====================================================
            HEADER
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
            bg-sidebar/80
            px-3
            backdrop-blur-xl
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
                "relative flex w-full items-center justify-center",
                "overflow-hidden rounded-xl",
                "transition-all duration-300 ease-out",
                collapsed && !isMobile
                  ? "h-12"
                  : "h-16",
              )}
            >
              <div
                aria-hidden="true"
                className="
                  absolute
                  inset-0
                  rounded-xl
                  bg-primary/[0.025]
                  opacity-0
                  transition-opacity
                  duration-300
                  hover:opacity-100
                "
              />

              <img
                src="https://ik.imagekit.io/xvqovhmcyr/arithmia-removebg-preview.png"
                alt="Arithmia"
                draggable={false}
                className="
                  relative
                  z-10
                  h-full
                  w-full
                  select-none
                  object-contain
                  transition-transform
                  duration-300
                  hover:scale-[1.02]
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
                {/* Group Label */}
                <SidebarGroupLabel
                  className={cn(
                    "mb-1.5 h-7 px-3",
                    "text-[10px] font-semibold uppercase",
                    "tracking-[0.14em]",
                    "text-muted-foreground/55",
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

                    const isNew =
                      item.badge === "New";

                    return (
                      <SidebarMenuItem
                        key={item.title}
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className={cn(
                            /* =================================================
                               BASE
                            ================================================== */

                            "group relative h-11 rounded-xl px-3",
                            "text-sm",
                            "transition-all duration-200 ease-out",

                            /* =================================================
                               HOVER
                            ================================================== */

                            !isActive && [
                              "text-muted-foreground",
                              "hover:-translate-y-[1px]",
                              "hover:bg-sidebar-accent/75",
                              "hover:text-sidebar-foreground",
                              "hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)]",
                              "hover:ring-1",
                              "hover:ring-sidebar-border/70",
                            ],

                            /* =================================================
                               ACTIVE
                            ================================================== */

                            isActive && [
                              "bg-sidebar-accent",
                              "text-sidebar-foreground",
                              "shadow-[0_5px_18px_rgba(0,0,0,0.07)]",
                              "ring-1",
                              "ring-sidebar-border/70",

                              /* Left indicator */
                              "before:absolute",
                              "before:left-0",
                              "before:top-1/2",
                              "before:h-6",
                              "before:w-[3px]",
                              "before:-translate-y-1/2",
                              "before:rounded-full",
                              "before:bg-primary",
                              "before:shadow-[0_0_10px_hsl(var(--primary)/0.55)]",
                            ],

                            /* =================================================
                               NEW EMPLOYEE HIGHLIGHT
                            ================================================== */

                            isNew && !isActive && [
                              "hover:bg-primary/[0.045]",
                              "hover:ring-primary/20",
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
                            {/* =================================================
                                ICON
                            ================================================== */}

                            <div
                              className={cn(
                                "relative flex shrink-0 items-center justify-center",
                                "transition-all duration-200",
                                isNew &&
                                  !isActive &&
                                  "group-hover:animate-[sidebar-float_2s_ease-in-out_infinite]",
                              )}
                            >
                              {isNew && (
                                <span
                                  aria-hidden="true"
                                  className="
                                    absolute
                                    inset-0
                                    rounded-full
                                    bg-primary/20
                                    opacity-0
                                    blur-md
                                    transition-opacity
                                    duration-300
                                    group-hover:opacity-100
                                  "
                                />
                              )}

                              <item.icon
                                className={cn(
                                  "relative size-[18px]",
                                  "transition-all duration-200",

                                  isActive
                                    ? [
                                        "scale-105",
                                        "text-primary",
                                        "drop-shadow-[0_0_5px_hsl(var(--primary)/0.3)]",
                                      ]
                                    : [
                                        "text-muted-foreground",
                                        "group-hover:scale-110",
                                        "group-hover:text-sidebar-foreground",
                                      ],
                                )}
                                strokeWidth={
                                  isActive
                                    ? 2.25
                                    : 1.8
                                }
                                aria-hidden="true"
                              />
                            </div>

                            {/* =================================================
                                TITLE
                            ================================================== */}

                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate",
                                "font-medium",
                                "transition-all duration-200",

                                collapsed &&
                                  !isMobile && [
                                    "w-0",
                                    "overflow-hidden",
                                    "opacity-0",
                                  ],
                              )}
                            >
                              {item.title}
                            </span>

                            {/* =================================================
                                BADGE
                            ================================================== */}

                            {item.badge && (
                              <Badge
                                variant={
                                  item.badgeVariant ||
                                  "default"
                                }
                                className={cn(
                                  "relative h-5 rounded-md px-1.5",
                                  "border border-current/10",
                                  "text-[9px] font-bold uppercase",
                                  "tracking-wide",
                                  "shadow-sm",
                                  "transition-all duration-200",

                                  collapsed &&
                                    !isMobile &&
                                    "hidden",

                                  "group-hover:scale-105",

                                  /* New */
                                  isNew && [
                                    "overflow-hidden",
                                    "bg-primary/10",
                                    "text-primary",
                                    "border-primary/20",
                                    "shadow-[0_0_12px_hsl(var(--primary)/0.12)]",
                                  ],
                                )}
                              >
                                {isNew && (
                                  <span
                                    aria-hidden="true"
                                    className="
                                      pointer-events-none
                                      absolute
                                      inset-0
                                      -translate-x-[120%]
                                      bg-gradient-to-r
                                      from-transparent
                                      via-white/30
                                      to-transparent
                                      animate-[sidebar-shimmer_2.8s_ease-in-out_infinite]
                                    "
                                  />
                                )}

                                <span className="relative z-10 flex items-center gap-1">
                                  {isNew && (
                                    <span
                                      className="
                                        size-1.5
                                        rounded-full
                                        bg-primary
                                        shadow-[0_0_6px_hsl(var(--primary)/0.75)]
                                        animate-pulse
                                      "
                                    />
                                  )}

                                  {item.badge}
                                </span>
                              </Badge>
                            )}

                            {/* =================================================
                                ACTIVE ARROW
                            ================================================== */}

                            {!collapsed &&
                              isActive && (
                                <ChevronRight
                                  className="
                                    size-3.5
                                    shrink-0
                                    text-muted-foreground/50
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
                group
                relative
                overflow-hidden
                rounded-xl
                border
                border-sidebar-border
                bg-sidebar-accent/30
                px-3
                py-2.5
                backdrop-blur-sm
                transition-all
                duration-200
                hover:bg-sidebar-accent/50
              "
            >
              {/* Status glow */}
              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  -right-6
                  -top-6
                  size-20
                  rounded-full
                  bg-emerald-500/10
                  blur-2xl
                "
              />

              <div className="relative flex items-center gap-2.5">
                {/* Status indicator */}
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
                      shadow-[0_0_8px_rgba(16,185,129,0.55)]
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
                    transition-transform
                    duration-300
                    group-hover:scale-110
                  "
                />
              </div>

              <div
                className="
                  relative
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
            bg-sidebar/90
            p-2
            backdrop-blur-xl
          "
        >
          <div
            className="
              group
              flex
              items-center
              gap-2
              rounded-xl
              p-2
              transition-all
              duration-200
              hover:bg-sidebar-accent/50
            "
          >
            {/* =================================================
                USER AVATAR
            ================================================== */}

            <div
              className="
                relative
                flex
                size-8
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-full
                ring-1
                ring-border/60
                transition-all
                duration-200
                group-hover:ring-primary/30
              "
            >
              <img
                src="https://ik.imagekit.io/xvqovhmcyr/image.jpg"
                alt="Swastik Naskar"
                className="
                  size-full
                  object-cover
                  transition-transform
                  duration-300
                  group-hover:scale-105
                "
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
                  shadow-[0_0_6px_rgba(16,185,129,0.6)]
                "
                aria-label="Online"
              />
            </div>

            {/* =================================================
                USER INFORMATION
            ================================================== */}

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

            {/* =================================================
                COLLAPSE BUTTON
            ================================================== */}

            {!collapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                className="
                  rounded-lg
                  p-1.5
                  text-muted-foreground
                  transition-all
                  duration-200
                  hover:scale-105
                  hover:bg-sidebar-accent
                  hover:text-sidebar-foreground
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

          {/* =================================================
              EXPAND BUTTON
          ================================================== */}

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
                rounded-lg
                text-muted-foreground
                transition-all
                duration-200
                hover:scale-105
                hover:bg-sidebar-accent
                hover:text-sidebar-foreground
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
    </>
  );
}