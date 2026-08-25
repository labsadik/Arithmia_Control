"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  Cpu,
  Database,
  Eye,
  Gauge,
  Globe2,
  History,
  Link2,
  Plus,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Webhook,
  X,
  Zap,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/* ============================================================================
   ROUTE
============================================================================ */

export const Route = createFileRoute("/brain")({
  head: () => ({
    meta: [
      {
        title: "SUPER AI Brain",
      },
      {
        name: "description",
        content:
          "Autonomous AI workflow control canvas with 360 vision.",
      },
    ],
  }),

  component: BrainPage,
});

/* ============================================================================
   TYPES
============================================================================ */

type Tone =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "indigo"
  | "cyan";

type BrainIcon =
  | "clients"
  | "leads"
  | "scan"
  | "brain"
  | "server"
  | "database"
  | "analytics"
  | "notification"
  | "agent"
  | "webhook"
  | "approval";

type BrainData = {
  title: string;
  subtitle: string;
  tone: Tone;
  icon: BrainIcon;
  status: string;
  throughput: number;
  inbound: number;
  outbound: number;
  description: string;
  autonomous: boolean;
};

type BrainNode = Node<BrainData, "brain">;

type DbNode = {
  id: string;
  node_key: string;
  title: string;
  subtitle: string;
  node_type: string;
  icon: string;
  tone: string;
  status: string;
  description: string | null;
  position_x: number | null;
  position_y: number | null;
  enabled: boolean;
  autonomous: boolean;
};

type DbConnection = {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  direction: string | null;
  enabled: boolean;
  throughput_per_second: number | null;
  packets_total: number | null;
  latency_ms: number | null;
  last_packet_at: string | null;
};

type SimMetric = {
  throughput: number;
  packets: number;
  latency: number;
};

type SimMetricMap = Record<string, SimMetric>;

type ScanResult = {
  sessionId: string;
  quality: number;
  frames: number;
  processingMs: number;
};

/* ============================================================================
   SUPABASE SAFE CLIENT
============================================================================ */

const sb = supabase as any;

/**
 * Optional tables must never be allowed to crash the route.
 */
async function safeSelect<T>(
  table: string,
  queryBuilder: (
    query: any,
  ) => any,
  fallback: T,
): Promise<T> {
  try {
    const query = sb.from(table);
    const result = await queryBuilder(query);

    if (result?.error) {
      console.warn(
        `[Brain] ${table}:`,
        result.error.message,
      );

      return fallback;
    }

    return (result?.data ?? fallback) as T;
  } catch (error) {
    console.warn(
      `[Brain] ${table} unavailable`,
      error,
    );

    return fallback;
  }
}

/* ============================================================================
   ICONS / TONES
============================================================================ */

const ICONS: Record<
  BrainIcon,
  ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>
> = {
  clients: Globe2,
  leads: Users,
  scan: Eye,
  brain: BrainCircuit,
  server: Server,
  database: Database,
  analytics: BarChart3,
  notification: Bell,
  agent: Cpu,
  webhook: Webhook,
  approval: ShieldCheck,
};

const TONES: Record<
  Tone,
  {
    bg: string;
    border: string;
    text: string;
    line: string;
  }
> = {
  blue: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-600",
    line: "#0ea5e9",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-600",
    line: "#8b5cf6",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-600",
    line: "#10b981",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-600",
    line: "#f59e0b",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-600",
    line: "#f43f5e",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-600",
    line: "#6366f1",
  },
  cyan: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-600",
    line: "#06b6d4",
  },
};

function toTone(value?: string): Tone {
  return value && value in TONES
    ? (value as Tone)
    : "blue";
}

function toIcon(value?: string): BrainIcon {
  return value && value in ICONS
    ? (value as BrainIcon)
    : "agent";
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    max,
    Math.max(min, value),
  );
}

/* ============================================================================
   NODE MAPPING
============================================================================ */

function buildNodes(
  rows: DbNode[],
  connections: DbConnection[],
  simulated: SimMetricMap,
): BrainNode[] {
  return rows.map((row) => {
    const incoming = connections.filter(
      (x) =>
        x.target_node_id === row.id,
    );

    const outgoing = connections.filter(
      (x) =>
        x.source_node_id === row.id,
    );

    const throughput = [
      ...incoming,
      ...outgoing,
    ].reduce(
      (total, connection) => {
        const real =
          Number(
            connection.throughput_per_second ??
              0,
          );

        const demo =
          simulated[
            connection.id
          ]?.throughput ?? 0;

        return total + (
          real > 0
            ? real
            : demo
        );
      },
      0,
    );

    return {
      id: row.id,
      type: "brain",

      position: {
        x: Number(
          row.position_x ??
            100,
        ),
        y: Number(
          row.position_y ??
            100,
        ),
      },

      data: {
        title: row.title,
        subtitle: row.subtitle,
        tone: toTone(row.tone),
        icon: toIcon(row.icon),
        status:
          row.status ||
          "READY",

        throughput:
          Math.round(
            throughput,
          ),

        inbound:
          incoming.length,

        outbound:
          outgoing.length,

        description:
          row.description ??
          "",

        autonomous:
          Boolean(
            row.autonomous,
          ),
      },
    };
  });
}

/* ============================================================================
   EDGE
============================================================================ */

function FlowEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const gap = Math.max(
    80,
    Math.abs(
      targetX - sourceX,
    ) * 0.3,
  );

  const sourceCurve =
    sourcePosition ===
    Position.Right
      ? sourceX + gap
      : sourceX - gap;

  const targetCurve =
    targetPosition ===
    Position.Left
      ? targetX - gap
      : targetX + gap;

  const path = `
    M ${sourceX},${sourceY}
    C ${sourceCurve},${sourceY}
      ${targetCurve},${targetY}
      ${targetX},${targetY}
  `;

  const color =
    typeof style?.stroke ===
    "string"
      ? style.stroke
      : "#10b981";

  return (
    <>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeOpacity={0.07}
        strokeWidth={12}
      />

      <path
        d={path}
        fill="none"
        stroke={color}
        strokeOpacity={0.16}
        strokeWidth={5}
        strokeLinecap="round"
      />

      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        markerEnd={markerEnd}
      />

      <circle
        r="3.5"
        fill={color}
      >
        <animateMotion
          dur="1.45s"
          repeatCount="indefinite"
          path={path}
        />
      </circle>

      {label ? (
        <foreignObject
          x={
            (sourceX +
              targetX) /
              2 -
            60
          }
          y={
            (sourceY +
              targetY) /
              2 -
            13
          }
          width={120}
          height={26}
          className="pointer-events-none overflow-visible"
        >
          <div className="flex h-full items-center justify-center">
            <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[8px] font-semibold text-slate-500 shadow-sm">
              {label}
            </span>
          </div>
        </foreignObject>
      ) : null}
    </>
  );
}

const edgeTypes = {
  flow: FlowEdge,
};

/* ============================================================================
   NODE CARD
============================================================================ */

function FlowNode({
  data,
  selected,
}: NodeProps<BrainNode>) {
  const Icon = ICONS[data.icon];
  const tone = TONES[data.tone];

  return (
    <div
      className={cn(
        "relative w-[245px] rounded-2xl border bg-white shadow-[0_8px_28px_rgba(15,23,42,.08)]",
        selected &&
          "ring-2 ring-emerald-400 ring-offset-2",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!-left-1.5 !h-3 !w-3 !border-2 !border-white !bg-white"
      />

      <Handle
        type="source"
        position={Position.Right}
        className="!-right-1.5 !h-3 !w-3 !border-2 !border-white !bg-emerald-500"
      />

      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              tone.bg,
              tone.border,
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                tone.text,
              )}
              strokeWidth={1.8}
            />
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {data.title}
            </div>

            <div className="truncate text-[10px] text-slate-400">
              {data.subtitle}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />

          <span className="text-[8px] font-semibold uppercase text-emerald-600">
            {data.status}
          </span>
        </div>
      </div>

      <div className="p-4">
        <p className="min-h-[32px] text-[10px] leading-4 text-slate-400">
          {data.description}
        </p>

        {data.autonomous ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />

            <div>
              <div className="text-[9px] font-semibold text-emerald-700">
                AUTONOMOUS
              </div>

              <div className="text-[8px] text-emerald-600/70">
                Brain controlled
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-3 gap-2">
          <TinyMetric
            label="IN"
            value={String(
              data.inbound,
            )}
          />

          <TinyMetric
            label="OUT"
            value={String(
              data.outbound,
            )}
          />

          <TinyMetric
            label="FLOW"
            value={`${data.throughput.toLocaleString()}/s`}
          />
        </div>

        <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-violet-400 to-sky-400 transition-all duration-700"
            style={{
              width: `${clamp(
                data.throughput /
                  5,
                8,
                100,
              )}%`,
            }}
          />
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-2 text-[8px] font-medium text-slate-300">
        FLOW NODE
      </div>
    </div>
  );
}

const nodeTypes = {
  brain: FlowNode,
};

/* ============================================================================
   MAIN PAGE
============================================================================ */

function BrainPage() {
  return (
    <ReactFlowProvider>
      <BrainWorkspace />
    </ReactFlowProvider>
  );
}

function BrainWorkspace() {
  const queryClient =
    useQueryClient();

  const {
    fitView,
  } = useReactFlow();

  const [
    nodes,
    setNodes,
    onNodesChange,
  ] =
    useNodesState<BrainNode>(
      [],
    );

  const [
    edges,
    setEdges,
    onEdgesChange,
  ] =
    useEdgesState<Edge>([]);

  const [
    selectedNodeId,
    setSelectedNodeId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    showAdd,
    setShowAdd,
  ] =
    useState(false);

  const [
    showActivity,
    setShowActivity,
  ] =
    useState(false);

  const [
    showVision,
    setShowVision,
  ] =
    useState(false);

  const [
    autoFlow,
    setAutoFlow,
  ] =
    useState(true);

  const [
    simulated,
    setSimulated,
  ] =
    useState<SimMetricMap>({});

  /* --------------------------------------------------------------------------
     CAMERA
  -------------------------------------------------------------------------- */

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const mediaStreamRef =
    useRef<MediaStream | null>(
      null,
    );

  const lastVideoTimeRef =
    useRef(-1);

  const [
    cameraState,
    setCameraState,
  ] =
    useState<
      | "idle"
      | "requesting"
      | "ready"
      | "scanning"
      | "complete"
      | "error"
    >("idle");

  const [
    detector,
    setDetector,
  ] =
    useState<any>(
      null,
    );

  const [
    detectorError,
    setDetectorError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    faceDetected,
    setFaceDetected,
  ] =
    useState(false);

  const [
    faceConfidence,
    setFaceConfidence,
  ] =
    useState(0);

  const [
    faceBox,
    setFaceBox,
  ] =
    useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(
      null,
    );

  const [
    videoSize,
    setVideoSize,
  ] =
    useState({
      width: 1,
      height: 1,
    });

  const [
    scanProgress,
    setScanProgress,
  ] =
    useState(0);

  const [
    scanAngle,
    setScanAngle,
  ] =
    useState(0);

  const [
    wavePhase,
    setWavePhase,
  ] =
    useState(0);

  const [
    scanResult,
    setScanResult,
  ] =
    useState<ScanResult | null>(
      null,
    );

  /* ==========================================================================
     LOAD GRAPH
  ========================================================================== */

  const nodesQuery =
    useQuery({
      queryKey: [
        "brain",
        "nodes",
      ],

      queryFn: () =>
        safeSelect<DbNode[]>(
          "brain_nodes",
          (q) =>
            q
              .select("*")
              .eq(
                "enabled",
                true,
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                },
              ),
          [],
        ),

      retry: false,

      refetchInterval:
        5000,
    });

  const connectionsQuery =
    useQuery({
      queryKey: [
        "brain",
        "connections",
      ],

      queryFn: () =>
        safeSelect<
          DbConnection[]
        >(
          "brain_connections",
          (q) =>
            q
              .select("*")
              .eq(
                "enabled",
                true,
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                },
              ),
          [],
        ),

      retry: false,

      refetchInterval:
        3000,
    });

  const agentsQuery =
    useQuery({
      queryKey: [
        "brain",
        "agents",
      ],

      queryFn: () =>
        safeSelect<any[]>(
          "agents",
          (q) =>
            q.select(
              "id,name,status,tasks_completed,tokens_used",
            ),
          [],
        ),

      refetchInterval:
        5000,
    });

  const approvalsQuery =
    useQuery({
      queryKey: [
        "brain",
        "approvals",
      ],

      queryFn: () =>
        safeSelect<any[]>(
          "approvals",
          (q) =>
            q
              .select(
                "id,status,risk_level,title,created_at",
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(50),
          [],
        ),

      refetchInterval:
        4000,
    });

  const activityQuery =
    useQuery({
      queryKey: [
        "brain",
        "activity",
      ],

      queryFn: () =>
        safeSelect<any[]>(
          "activity_events",
          (q) =>
            q
              .select(
                "id,agent_name,status,message,created_at",
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(50),
          [],
        ),

      refetchInterval:
        3000,
    });

  const usageQuery =
    useQuery({
      queryKey: [
        "brain",
        "usage",
      ],

      queryFn: () =>
        safeSelect<any[]>(
          "api_usage_logs",
          (q) =>
            q
              .select(
                "id,latency_ms,tokens_used,created_at",
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(100),
          [],
        ),

      refetchInterval:
        5000,
    });

  const scanQuery =
    useQuery({
      queryKey: [
        "brain",
        "scans",
      ],

      queryFn: () =>
        safeSelect<any[]>(
          "brain_scan_sessions",
          (q) =>
            q
              .select("*")
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(12),
          [],
        ),

      retry: false,

      refetchInterval:
        5000,
    });

  const auditQuery =
    useQuery({
      queryKey: [
        "brain",
        "audit",
      ],

      queryFn: () =>
        safeSelect<any[]>(
          "brain_workflow_audit",
          (q) =>
            q
              .select("*")
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(30),
          [],
        ),

      retry: false,

      refetchInterval:
        5000,
    });

  const dbNodes =
    nodesQuery.data ?? [];

  const dbConnections =
    connectionsQuery.data ??
    [];

  /* ==========================================================================
     SIMULATED TELEMETRY
  ========================================================================== */

  useEffect(() => {
    if (!dbConnections.length) {
      return;
    }

    const tick =
      () => {
        setSimulated(
          (previous) => {
            const next: SimMetricMap =
              {
                ...previous,
              };

            for (
              const connection of dbConnections
            ) {
              const realFlow =
                Number(
                  connection.throughput_per_second ??
                    0,
                );

              const realLatency =
                Number(
                  connection.latency_ms ??
                    0,
                );

              const realPackets =
                Number(
                  connection.packets_total ??
                    0,
                );

              if (
                realFlow > 0 ||
                realLatency > 0 ||
                realPackets > 0
              ) {
                next[
                  connection.id
                ] = {
                  throughput:
                    realFlow,

                  latency:
                    realLatency,

                  packets:
                    realPackets,
                };

                continue;
              }

              const old =
                previous[
                  connection.id
                ];

              const target =
                40 +
                Math.floor(
                  Math.random() *
                    300,
                );

              const current =
                old?.throughput ??
                target;

              next[
                connection.id
              ] = {
                throughput:
                  Math.max(
                    8,
                    Math.round(
                      current *
                        0.7 +
                        target *
                          0.3,
                    ),
                  ),

                latency:
                  8 +
                  Math.floor(
                    Math.random() *
                      24,
                  ),

                packets:
                  (old?.packets ??
                    0) +
                  1 +
                  Math.floor(
                    Math.random() *
                      5,
                  ),
              };
            }

            return next;
          },
        );
      };

    tick();

    const timer =
      window.setInterval(
        tick,
        1000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [
    dbConnections,
  ]);

  /* ==========================================================================
     DRAW GRAPH
  ========================================================================== */

  useEffect(() => {
    if (
      !nodesQuery.isFetched ||
      !connectionsQuery.isFetched
    ) {
      return;
    }

    setNodes(
      buildNodes(
        dbNodes,
        dbConnections,
        simulated,
      ),
    );

    const graphEdges =
      dbConnections.map(
        (connection) => {
          const source =
            dbNodes.find(
              (x) =>
                x.id ===
                connection.source_node_id,
            );

          const real =
            Number(
              connection.throughput_per_second ??
                0,
            );

          const flow =
            real > 0
              ? real
              : simulated[
                    connection.id
                  ]?.throughput ??
                0;

          const color =
            source
              ? TONES[
                  toTone(
                    source.tone,
                  )
                ].line
              : "#10b981";

          return {
            id: connection.id,

            source:
              connection.source_node_id,

            target:
              connection.target_node_id,

            type: "flow",

            animated:
              autoFlow &&
              connection.enabled,

            label: `${
              connection.label ??
              "DATA"
            } • ${Math.round(
              flow,
            )}/s`,

            style: {
              stroke:
                color,
              strokeWidth:
                2,
            },

            labelBgStyle: {
              fill: "#fff",
              fillOpacity:
                0.95,
              stroke:
                "#e2e8f0",
            },

            labelStyle: {
              fill:
                "#64748b",
              fontSize: 8,
              fontWeight:
                600,
            },

            data: {
              simulated:
                real <= 0,
            },
          };
        },
      );

    setEdges(
      graphEdges,
    );
  }, [
    dbNodes,
    dbConnections,
    simulated,
    autoFlow,
    nodesQuery.isFetched,
    connectionsQuery.isFetched,
    setNodes,
    setEdges,
  ]);

  /* ==========================================================================
     STATS
  ========================================================================== */

  const stats =
    useMemo(() => {
      const activeAgents =
        agentsQuery.data?.filter(
          (agent: any) =>
            agent.status ===
            "running",
        ).length ?? 0;

      const pendingApprovals =
        approvalsQuery.data?.filter(
          (item: any) =>
            item.status ===
            "pending",
        ).length ?? 0;

      const now =
        Date.now();

      const eventsMinute =
        activityQuery.data?.filter(
          (item: any) =>
            now -
              new Date(
                item.created_at,
              ).getTime() <
            60_000,
        ).length ?? 0;

      const latencies =
        usageQuery.data
          ?.map(
            (row: any) =>
              Number(
                row.latency_ms ??
                  0,
              ),
          )
          .filter(
            (value: number) =>
              value > 0,
          ) ?? [];

      const averageLatency =
        latencies.length
          ? Math.round(
              latencies.reduce(
                (
                  sum,
                  value,
                ) =>
                  sum + value,
                0,
              ) /
                latencies.length,
            )
          : 0;

      const throughput =
        dbConnections.reduce(
          (
            sum,
            connection,
          ) => {
            const real =
              Number(
                connection.throughput_per_second ??
                  0,
              );

            return (
              sum +
              (real > 0
                ? real
                : simulated[
                    connection
                      .id
                  ]?.throughput ??
                  0)
            );
          },
          0,
        );

      const packets =
        dbConnections.reduce(
          (
            sum,
            connection,
          ) => {
            const real =
              Number(
                connection.packets_total ??
                  0,
              );

            return (
              sum +
              (real > 0
                ? real
                : simulated[
                    connection
                      .id
                  ]?.packets ??
                  0)
            );
          },
          0,
        );

      const realTelemetry =
        dbConnections.some(
          (connection) =>
            Number(
              connection.throughput_per_second ??
                0,
            ) > 0 ||
            Number(
              connection.latency_ms ??
                0,
            ) > 0,
        );

      const inbound =
        dbConnections.filter(
          (connection) =>
            dbNodes.some(
              (node) =>
                node.id ===
                  connection.target_node_id &&
                node.node_key ===
                  "brain",
            ),
        ).length;

      const outbound =
        dbConnections.filter(
          (connection) =>
            dbNodes.some(
              (node) =>
                node.id ===
                  connection.source_node_id &&
                node.node_key ===
                  "brain",
            ),
        ).length;

      return {
        activeAgents,
        pendingApprovals,
        eventsMinute,
        averageLatency,
        throughput:
          Math.round(
            throughput,
          ),
        packets,
        realTelemetry,
        inbound,
        outbound,
      };
    }, [
      agentsQuery.data,
      approvalsQuery.data,
      activityQuery.data,
      usageQuery.data,
      dbNodes,
      dbConnections,
      simulated,
    ]);

  /* ==========================================================================
     AUDIT
  ========================================================================== */

  const audit =
    useCallback(
      async (
        action: string,
        description: string,
        payload: Record<
          string,
          unknown
        > = {},
      ) => {
        try {
          await sb
            .from(
              "brain_workflow_audit",
            )
            .insert({
              action,
              description,
              actor_type:
                "operator",
              payload,
            });
        } catch {
          // Audit is optional.
        }

        queryClient.invalidateQueries({
          queryKey: [
            "brain",
            "audit",
          ],
        });
      },
      [queryClient],
    );

  /* ==========================================================================
     MOVE NODE
  ========================================================================== */

  const handleNodesChange =
    useCallback(
      (changes: any[]) => {
        onNodesChange(
          changes,
        );

        const moved =
          changes.filter(
            (change) =>
              change.type ===
                "position" &&
              change.dragging ===
                false &&
              change.position,
          );

        if (!moved.length) {
          return;
        }

        void Promise.all(
          moved.map(
            (change) =>
              sb
                .from(
                  "brain_nodes",
                )
                .update({
                  position_x:
                    change
                      .position
                      .x,

                  position_y:
                    change
                      .position
                      .y,
                })
                .eq(
                  "id",
                  change.id,
                ),
          ),
        );

        void audit(
          "node_moved",
          "Brain node moved",
          {
            ids:
              moved.map(
                (
                  x,
                ) =>
                  x.id,
              ),
          },
        );
      },
      [
        onNodesChange,
        audit,
      ],
    );

  /* ==========================================================================
     CONNECT
  ========================================================================== */

  const handleConnect =
    useCallback(
      async (
        connection: Connection,
      ) => {
        if (
          !connection.source ||
          !connection.target ||
          connection.source ===
            connection.target
        ) {
          return;
        }

        const duplicate =
          dbConnections.some(
            (item) =>
              item.source_node_id ===
                connection.source &&
              item.target_node_id ===
                connection.target,
          );

        if (duplicate) {
          return;
        }

        const source =
          dbNodes.find(
            (node) =>
              node.id ===
              connection.source,
          );

        try {
          const { error } =
            await sb
              .from(
                "brain_connections",
              )
              .insert({
                source_node_id:
                  connection.source,

                target_node_id:
                  connection.target,

                label:
                  source?.node_key ===
                  "brain"
                    ? "AI DATA"
                    : "LIVE DATA",

                direction:
                  source?.node_key ===
                  "brain"
                    ? "outbound"
                    : "bidirectional",

                enabled:
                  true,

                throughput_per_second:
                  0,

                packets_total:
                  0,

                latency_ms:
                  0,
              });

          if (error) {
            console.warn(
              "[Brain] Connection failed:",
              error,
            );

            return;
          }

          await audit(
            "connection_added",
            "New Brain connection",
            {
              source:
                connection.source,
              target:
                connection.target,
            },
          );

          queryClient.invalidateQueries({
            queryKey: [
              "brain",
              "connections",
            ],
          });
        } catch (error) {
          console.warn(
            "[Brain] connect error:",
            error,
          );
        }
      },
      [
        dbNodes,
        dbConnections,
        audit,
        queryClient,
      ],
    );

  /* ==========================================================================
     DELETE EDGE
  ========================================================================== */

  const handleEdgesChange =
    useCallback(
      (changes: any[]) => {
        onEdgesChange(
          changes,
        );

        const removed =
          changes.filter(
            (change) =>
              change.type ===
              "remove",
          );

        if (!removed.length) {
          return;
        }

        void Promise.all(
          removed.map(
            (change) =>
              sb
                .from(
                  "brain_connections",
                )
                .delete()
                .eq(
                  "id",
                  change.id,
                ),
          ),
        );

        queryClient.invalidateQueries({
          queryKey: [
            "brain",
            "connections",
          ],
        });

        void audit(
          "connection_removed",
          "Brain connection removed",
          {
            ids:
              removed.map(
                (
                  x,
                ) =>
                  x.id,
              ),
          },
        );
      },
      [
        onEdgesChange,
        queryClient,
        audit,
      ],
    );

  /* ==========================================================================
     ADD NODE
  ========================================================================== */

  const addNode =
    async (
      title: string,
      subtitle: string,
      type: string,
      icon: BrainIcon,
      tone: Tone,
    ) => {
      try {
        const {
          error,
        } = await sb
          .from(
            "brain_nodes",
          )
          .insert({
            node_key:
              `${title
                .toLowerCase()
                .replace(
                  /[^a-z0-9]+/g,
                  "-",
                )}-${Date.now()}`,

            title,
            subtitle,
            node_type:
              type,
            icon,
            tone,
            status:
              "READY",

            description:
              "Connected to SUPER AI.",

            position_x:
              350 +
              Math.random() *
                500,

            position_y:
              100 +
              Math.random() *
                400,

            enabled:
              true,

            autonomous:
              false,
          });

        if (error) {
          console.warn(
            "[Brain] Add node:",
            error,
          );

          return;
        }

        setShowAdd(false);

        queryClient.invalidateQueries({
          queryKey: [
            "brain",
            "nodes",
          ],
        });
      } catch (error) {
        console.warn(
          "[Brain] add node error:",
          error,
        );
      }
    };

  /* ==========================================================================
     DELETE NODE
  ========================================================================== */

  const deleteNode =
    async () => {
      if (!selectedNodeId) {
        return;
      }

      const row =
        dbNodes.find(
          (x) =>
            x.id ===
            selectedNodeId,
        );

      if (
        !row ||
        row.node_key ===
          "brain"
      ) {
        return;
      }

      try {
        const { error } =
          await sb
            .from(
              "brain_nodes",
            )
            .delete()
            .eq(
              "id",
              selectedNodeId,
            );

        if (error) {
          console.warn(
            "[Brain] Delete node:",
            error,
          );

          return;
        }

        setSelectedNodeId(
          null,
        );

        queryClient.invalidateQueries({
          queryKey: [
            "brain",
            "nodes",
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            "brain",
            "connections",
          ],
        });
      } catch (error) {
        console.warn(
          "[Brain] delete node error:",
          error,
        );
      }
    };

  /* ==========================================================================
     LAZY MEDIAPIPE
  ========================================================================== */

  useEffect(() => {
    let alive = true;

    const loadVision =
      async () => {
        try {
          const module =
            await import(
              "@mediapipe/tasks-vision"
            );

          const vision =
            await module.FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
            );

          const instance =
            await module.FaceDetector.createFromOptions(
              vision,
              {
                baseOptions: {
                  modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                  delegate:
                    "GPU",
                },

                runningMode:
                  "VIDEO",

                minDetectionConfidence:
                  0.6,
              },
            );

          if (alive) {
            setDetector(
              instance,
            );

            setDetectorError(
              null,
            );
          }
        } catch (error) {
          console.warn(
            "[Brain] Vision detector unavailable:",
            error,
          );

          if (alive) {
            setDetectorError(
              "Vision detector unavailable",
            );
          }
        }
      };

    void loadVision();

    return () => {
      alive = false;
    };
  }, []);

  /* ==========================================================================
     CAMERA SIZE
  ========================================================================== */

  useEffect(() => {
    if (
      !showVision ||
      !videoRef.current
    ) {
      return;
    }

    const video =
      videoRef.current;

    const update =
      () => {
        setVideoSize({
          width:
            video.videoWidth ||
            1,

          height:
            video.videoHeight ||
            1,
        });
      };

    video.addEventListener(
      "loadedmetadata",
      update,
    );

    update();

    return () => {
      video.removeEventListener(
        "loadedmetadata",
        update,
      );
    };
  }, [
    showVision,
  ]);

  /* ==========================================================================
     CAMERA CLEANUP
  ========================================================================== */

  const stopCamera =
    useCallback(
      () => {
        try {
          const stream =
            mediaStreamRef.current;

          if (stream) {
            stream
              .getTracks()
              .forEach(
                (
                  track,
                ) => {
                  try {
                    track.stop();
                  } catch {
                    // noop
                  }
                },
              );
          }

          mediaStreamRef.current =
            null;

          if (
            videoRef.current
          ) {
            videoRef.current.pause();
            videoRef.current.srcObject =
              null;
          }
        } finally {
          lastVideoTimeRef.current =
            -1;
        }
      },
      [],
    );

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [
    stopCamera,
  ]);

  /* ==========================================================================
     LIVE FACE DETECTION
  ========================================================================== */

  useEffect(() => {
    if (
      !detector ||
      cameraState !==
        "ready" ||
      !videoRef.current
    ) {
      return;
    }

    let active = true;

    let raf = 0;

    const loop =
      () => {
        if (
          !active ||
          !videoRef.current
        ) {
          return;
        }

        const video =
          videoRef.current;

        if (
          video.readyState >=
            2 &&
          video.currentTime !==
            lastVideoTimeRef.current
        ) {
          lastVideoTimeRef.current =
            video.currentTime;

          try {
            const result =
              detector.detectForVideo(
                video,
                performance.now(),
              );

            const detections =
              result?.detections ??
              [];

            if (
              !detections.length
            ) {
              setFaceDetected(
                false,
              );

              setFaceConfidence(
                0,
              );

              setFaceBox(
                null,
              );
            } else {
              const best =
                detections.reduce(
                  (
                    current: any,
                    item: any,
                  ) => {
                    if (
                      !current
                    ) {
                      return item;
                    }

                    const a =
                      current
                        .categories?.[0]
                        ?.score ??
                      0;

                    const b =
                      item
                        .categories?.[0]
                        ?.score ??
                      0;

                    return b > a
                      ? item
                      : current;
                  },
                  null,
                );

              const confidence =
                best
                  ?.categories?.[0]
                  ?.score ?? 0;

              const box =
                best?.boundingBox;

              setFaceDetected(
                confidence >=
                  0.6,
              );

              setFaceConfidence(
                Math.round(
                  confidence *
                    100,
                ),
              );

              if (box) {
                setFaceBox({
                  x:
                    box.originX,
                  y:
                    box.originY,
                  width:
                    box.width,
                  height:
                    box.height,
                });
              }
            }
          } catch {
            // Never crash the route because of one camera frame.
          }
        }

        raf =
          requestAnimationFrame(
            loop,
          );
      };

    raf =
      requestAnimationFrame(
        loop,
      );

    return () => {
      active = false;
      cancelAnimationFrame(
        raf,
      );
    };
  }, [
    detector,
    cameraState,
  ]);

  /* ==========================================================================
     VISUAL CAMERA ANIMATION
  ========================================================================== */

  useEffect(() => {
    if (
      !showVision ||
      cameraState ===
        "idle" ||
      cameraState ===
        "error"
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setScanAngle(
            (value) =>
              (value + 6) %
              360,
          );

          setWavePhase(
            (value) =>
              (value + 1) %
              100,
          );
        },
        90,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [
    showVision,
    cameraState,
  ]);

  /* ==========================================================================
     CAMERA OPEN
  ========================================================================== */

  const openVision =
    () => {
      stopCamera();

      setShowVision(
        true,
      );

      setCameraState(
        "idle",
      );

      setScanProgress(
        0,
      );

      setScanResult(
        null,
      );

      setFaceDetected(
        false,
      );

      setFaceConfidence(
        0,
      );

      setFaceBox(
        null,
      );

      setVideoSize({
        width: 1,
        height: 1,
      });
    };

  /* ==========================================================================
     CAMERA REQUEST
  ========================================================================== */

  const requestCamera =
    async () => {
      if (
        typeof navigator ===
          "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraState(
          "error",
        );

        return;
      }

      setCameraState(
        "requesting",
      );

      try {
        stopCamera();

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: false,

              video: {
                facingMode:
                  "user",

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },
              },
            },
          );

        mediaStreamRef.current =
          stream;

        const video =
          videoRef.current;

        if (!video) {
          stopCamera();

          setCameraState(
            "error",
          );

          return;
        }

        video.srcObject =
          stream;

        await video.play();

        setCameraState(
          "ready",
        );
      } catch (error) {
        console.warn(
          "[Brain] Camera permission:",
          error,
        );

        stopCamera();

        setCameraState(
          "error",
        );
      }
    };

  /* ==========================================================================
     CLOSE CAMERA
  ========================================================================== */

  const closeVision =
    () => {
      stopCamera();

      setShowVision(
        false,
      );

      setCameraState(
        "idle",
      );

      setScanProgress(
        0,
      );

      setScanResult(
        null,
      );

      setFaceDetected(
        false,
      );

      setFaceConfidence(
        0,
      );

      setFaceBox(
        null,
      );
    };

  /* ==========================================================================
     RUN SCAN
  ========================================================================== */

  const runScan =
    async () => {
      if (
        !faceDetected ||
        cameraState !==
          "ready"
      ) {
        return;
      }

      setCameraState(
        "scanning",
      );

      setScanProgress(
        0,
      );

      const start =
        performance.now();

      try {
        for (
          let i = 0;
          i <= 100;
          i += 4
        ) {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                35,
              ),
          );

          setScanProgress(
            i,
          );
        }

        const processingMs =
          Math.max(
            50,
            Math.round(
              performance.now() -
                start,
            ),
          );

        const frames =
          Math.max(
            1,
            Math.round(
              processingMs /
                16.67,
            ),
          );

        const quality =
          clamp(
            Math.round(
              faceConfidence *
                0.72 +
                30,
            ),
            85,
            99,
          );

        const sessionId =
          crypto.randomUUID();

        const result: ScanResult =
          {
            sessionId,
            quality,
            frames,
            processingMs,
          };

        setScanResult(
          result,
        );

        setCameraState(
          "complete",
        );

        try {
          await sb
            .from(
              "brain_scan_sessions",
            )
            .insert({
              id:
                sessionId,

              scan_type:
                "360_face_scan",

              status:
                "completed",

              progress:
                100,

              quality_score:
                quality,

              frames_processed:
                frames,

              ai_latency_ms:
                processingMs,

              throughput_per_second:
                stats.throughput,

              metadata: {
                source:
                  "browser_camera",

                coverage_degrees:
                  360,

                biometric_identity_match:
                  false,
              },

              started_at:
                new Date().toISOString(),

              completed_at:
                new Date().toISOString(),
            });
        } catch (error) {
          console.warn(
            "[Brain] Scan table unavailable:",
            error,
          );
        }

        void audit(
          "vision_scan_completed",
          "360 Vision scan completed",
          {
            session_id:
              sessionId,
            quality,
            frames,
            processing_ms:
              processingMs,
          },
        );

        queryClient.invalidateQueries({
          queryKey: [
            "brain",
            "scans",
          ],
        });
      } catch (error) {
        console.warn(
          "[Brain] Scan error:",
          error,
        );

        setCameraState(
          "ready",
        );
      }
    };

  /* ==========================================================================
     REALTIME
  ========================================================================== */

  useEffect(() => {
    const channel =
      supabase
        .channel(
          "brain-safe-live",
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "brain_nodes",
          },
          () =>
            queryClient.invalidateQueries(
              {
                queryKey: [
                  "brain",
                  "nodes",
                ],
              },
            ),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "brain_connections",
          },
          () =>
            queryClient.invalidateQueries(
              {
                queryKey: [
                  "brain",
                  "connections",
                ],
              },
            ),
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    queryClient,
  ]);

  /* ==========================================================================
     SELECTED NODE
  ========================================================================== */

  const selectedNode =
    nodes.find(
      (node) =>
        node.id ===
        selectedNodeId,
    );

  const brainNode =
    dbNodes.find(
      (node) =>
        node.node_key ===
        "brain",
    );

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-4">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Autonomous Control Plane
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            SUPER AI Brain
          </h1>

          <p className="mt-1 max-w-4xl text-sm text-slate-500">
            Database-connected AI flow for clients,
            leads, vision, agents, servers and
            human controls.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-[10px] shadow-sm",

              dbNodes.length &&
                dbConnections.length
                ? "border-emerald-200 text-emerald-600"
                : "border-slate-200 text-slate-500",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                dbNodes.length &&
                  dbConnections.length
                  ? "bg-emerald-500"
                  : "bg-amber-400",
              )}
            />

            {dbNodes.length
              ? "DATABASE ONLINE"
              : "DATABASE EMPTY"}
          </div>

          {!stats.realTelemetry &&
          dbConnections.length ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[9px] text-amber-700">
              <Activity className="h-3 w-3" />
              FLOW PREVIEW
            </div>
          ) : null}

          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              setAutoFlow(
                (value) =>
                  !value,
              )
            }
          >
            <Zap className="h-4 w-4" />

            {autoFlow
              ? "Flow ON"
              : "Flow OFF"}
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              fitView({
                duration: 500,
                padding: 0.18,
              })
            }
          >
            <RefreshCw className="h-4 w-4" />
            Fit
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              setShowActivity(
                (value) =>
                  !value,
              )
            }
          >
            <History className="h-4 w-4" />
            Activity
          </Button>

          <Button
            className="gap-2"
            onClick={() =>
              setShowAdd(
                true,
              )
            }
          >
            <Plus className="h-4 w-4" />
            Add Node
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric
          icon={Activity}
          label="Flow"
          value={stats.throughput.toLocaleString()}
          suffix="/sec"
        />

        <Metric
          icon={Link2}
          label="Brain Out"
          value={String(
            stats.outbound,
          )}
          suffix="routes"
        />

        <Metric
          icon={Radio}
          label="Brain In"
          value={String(
            stats.inbound,
          )}
          suffix="routes"
        />

        <Metric
          icon={Gauge}
          label="Latency"
          value={String(
            stats.averageLatency ||
              12,
          )}
          suffix="ms"
        />

        <Metric
          icon={Database}
          label="Packets"
          value={stats.packets.toLocaleString()}
          suffix="total"
        />

        <Metric
          icon={Cpu}
          label="Agents"
          value={String(
            stats.activeAgents,
          )}
          suffix="active"
        />
      </div>

      {/* CANVAS */}
      <Card className="relative h-[730px] overflow-hidden border-slate-200 bg-white">
        <ReactFlow
          nodes={nodes.map(
            (node) => ({
              ...node,
              selected:
                node.id ===
                selectedNodeId,
            }),
          )}

          edges={
            autoFlow
              ? edges
              : edges.map(
                  (edge) => ({
                    ...edge,
                    animated:
                      false,
                  }),
                )
          }

          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}

          onNodesChange={
            handleNodesChange
          }

          onEdgesChange={
            handleEdgesChange
          }

          onConnect={
            handleConnect
          }

          onNodeClick={(
            _event,
            node,
          ) => {
            setSelectedNodeId(
              node.id,
            );

            if (
              node.data.icon ===
              "scan"
            ) {
              openVision();
            }
          }}

          onPaneClick={() =>
            setSelectedNodeId(
              null,
            )
          }

          fitView

          fitViewOptions={{
            padding: 0.2,
          }}

          snapToGrid

          snapGrid={[
            15,
            15,
          ]}

          minZoom={0.25}
          maxZoom={2.2}

          panOnDrag
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick

          deleteKeyCode={[
            "Backspace",
            "Delete",
          ]}

          connectionLineStyle={{
            stroke:
              "#10b981",
            strokeWidth:
              2,
          }}

          proOptions={{
            hideAttribution:
              true,
          }}
        >
          <Background
            variant={
              BackgroundVariant.Dots
            }
            gap={20}
            size={1}
            color="#cbd5e1"
          />

          <Background
            variant={
              BackgroundVariant.Lines
            }
            gap={100}
            size={0.5}
            color="#f1f5f9"
          />

          <Controls
            showInteractive
            position="bottom-left"
            className="!m-4 !overflow-hidden !rounded-xl !border !border-slate-200 !bg-white !shadow-lg"
          />

          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            className="!m-4 !overflow-hidden !rounded-xl !border !border-slate-200 !bg-white"
            maskColor="rgba(241,245,249,.55)"
            nodeColor={(node) => {
              const data =
                node.data as BrainData;

              return TONES[
                data.tone
              ].line;
            }}
          />

          <Panel
            position="top-left"
            className="!m-4"
          >
            <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <BrainCircuit className="h-5 w-5 text-emerald-600" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {brainNode?.title ??
                        "SUPER AI"}
                    </span>

                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-semibold text-emerald-600">
                      {brainNode?.status ??
                        "ONLINE"}
                    </span>
                  </div>

                  <div className="text-[9px] text-slate-400">
                    {stats.inbound} inbound ·{" "}
                    {stats.outbound} outbound
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            position="top-right"
            className="!m-4"
          >
            <div className="flex gap-2">
              <RuntimeBadge
                label="NODES"
                value={String(
                  nodes.length,
                )}
              />

              <RuntimeBadge
                label="LINKS"
                value={String(
                  edges.length,
                )}
              />

              <RuntimeBadge
                label="FLOW"
                value={`${stats.throughput.toLocaleString()}/s`}
              />
            </div>
          </Panel>
        </ReactFlow>

        {/* ADD */}
        {showAdd ? (
          <div className="absolute right-4 top-4 z-50 w-[310px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Add connection node
                </div>

                <div className="mt-1 text-[10px] text-slate-400">
                  Saved directly to Supabase.
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setShowAdd(false)
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <AddNodeButton
                icon={Globe2}
                title="Web Client"
                description="Client traffic"
                onClick={() =>
                  addNode(
                    "Web Client",
                    "Client traffic",
                    "client",
                    "clients",
                    "blue",
                  )
                }
              />

              <AddNodeButton
                icon={Users}
                title="Lead Stream"
                description="Lead events"
                onClick={() =>
                  addNode(
                    "Lead Stream",
                    "Lead events",
                    "lead",
                    "leads",
                    "amber",
                  )
                }
              />

              <AddNodeButton
                icon={Database}
                title="Data Store"
                description="Persistent data"
                onClick={() =>
                  addNode(
                    "Data Store",
                    "Persistent data",
                    "database",
                    "database",
                    "indigo",
                  )
                }
              />

              <AddNodeButton
                icon={Cpu}
                title="AI Worker"
                description="Autonomous worker"
                onClick={() =>
                  addNode(
                    "AI Worker",
                    "Autonomous worker",
                    "agent",
                    "agent",
                    "violet",
                  )
                }
              />

              <AddNodeButton
                icon={Webhook}
                title="Webhook"
                description="External integration"
                onClick={() =>
                  addNode(
                    "Webhook",
                    "External integration",
                    "webhook",
                    "webhook",
                    "cyan",
                  )
                }
              />

              <AddNodeButton
                icon={ShieldCheck}
                title="Human Control"
                description="Approval route"
                onClick={() =>
                  addNode(
                    "Human Control",
                    "Approval route",
                    "approval",
                    "approval",
                    "rose",
                  )
                }
              />
            </div>
          </div>
        ) : null}

        {/* TOOLBAR */}
        {selectedNode ? (
          <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="px-2">
                <div className="text-[10px] font-semibold text-slate-900">
                  {selectedNode.data.title}
                </div>

                <div className="text-[8px] text-slate-400">
                  IN {selectedNode.data.inbound} · OUT{" "}
                  {selectedNode.data.outbound}
                </div>
              </div>

              <div className="h-6 w-px bg-slate-200" />

              {selectedNode.data.icon ===
              "scan" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-[10px]"
                  onClick={
                    openVision
                  }
                >
                  <Eye className="h-3 w-3" />
                  360 Vision
                </Button>
              ) : null}

              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-[10px]"
                onClick={() =>
                  fitView({
                    nodes: [
                      {
                        id:
                          selectedNode.id,
                      },
                    ],
                    duration:
                      450,
                    padding:
                      0.8,
                  })
                }
              >
                <Eye className="h-3 w-3" />
                Focus
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-[10px] text-red-500"
                onClick={
                  deleteNode
                }
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* LOWER */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* VISION */}
        <Card className="overflow-hidden border-slate-200 bg-white lg:col-span-2">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                  <Eye className="h-5 w-5 text-violet-600" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      360 Vision
                    </CardTitle>

                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[8px] font-semibold",
                        faceDetected
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-400",
                      )}
                    >
                      {faceDetected
                        ? "DETECTED"
                        : "STANDBY"}
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] text-slate-400">
                    Camera · face detection · scan
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={
                  openVision
                }
                className="gap-2"
              >
                <Eye className="h-3.5 w-3.5" />
                Open Vision
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid lg:grid-cols-[1.4fr_1fr]">
              <div className="bg-slate-50 p-5">
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {showVision ? (
                    <video
                      ref={
                        videoRef
                      }
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-50">
                          <Eye className="h-6 w-6 text-violet-600" />
                        </div>

                        <div className="mt-3 text-sm font-semibold text-slate-800">
                          Vision ready
                        </div>

                        <div className="mt-1 text-[10px] text-slate-400">
                          Camera starts only after permission.
                        </div>
                      </div>
                    </div>
                  )}

                  {showVision ? (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,.08),transparent_58%)]" />

                      {cameraState !==
                        "idle" &&
                      cameraState !==
                        "error" ? (
                        <>
                          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[42%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />

                          <div
                            className="pointer-events-none absolute left-1/2 top-1/2 h-[46%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/30"
                            style={{
                              transform: `translate(-50%, -50%) rotate(${scanAngle}deg)`,
                            }}
                          >
                            <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,.9)]" />
                          </div>
                        </>
                      ) : null}

                      {faceDetected &&
                      faceBox ? (
                        <div
                          className="pointer-events-none absolute rounded-xl border-2 border-emerald-400 shadow-[0_0_22px_rgba(16,185,129,.25)]"
                          style={{
                            left: `${
                              (faceBox.x /
                                videoSize.width) *
                              100
                            }%`,

                            top: `${
                              (faceBox.y /
                                videoSize.height) *
                              100
                            }%`,

                            width: `${
                              (faceBox.width /
                                videoSize.width) *
                              100
                            }%`,

                            height: `${
                              (faceBox.height /
                                videoSize.height) *
                              100
                            }%`,
                          }}
                        >
                          <div className="absolute -left-px -top-8 rounded-lg bg-emerald-500 px-2 py-1 text-[8px] font-semibold text-white shadow">
                            FACE{" "}
                            {faceConfidence}%
                          </div>
                        </div>
                      ) : null}

                      {cameraState ===
                      "scanning" ? (
                        <div
                          className="pointer-events-none absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent"
                          style={{
                            top: `${
                              15 +
                              scanProgress *
                                0.7
                            }%`,
                          }}
                        />
                      ) : null}
                    </>
                  ) : null}

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          faceDetected
                            ? "bg-emerald-500"
                            : "bg-slate-300",
                        )}
                      />

                      <span className="text-[10px] font-medium text-slate-700">
                        {faceDetected
                          ? "Face detected"
                          : "Searching"}
                      </span>
                    </div>

                    <span className="font-mono text-[9px] text-slate-400">
                      {faceDetected
                        ? `${faceConfidence}%`
                        : "--"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex h-11 items-end gap-1 overflow-hidden rounded-xl border border-slate-200 bg-white px-2 py-1">
                  {Array.from({
                    length: 48,
                  }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-full transition-all",
                          faceDetected
                            ? "bg-gradient-to-t from-violet-500 to-emerald-400"
                            : "bg-slate-200",
                        )}
                        style={{
                          height: `${
                            20 +
                            Math.abs(
                              Math.sin(
                                (i +
                                  wavePhase) *
                                  0.42,
                              ),
                            ) *
                              65
                          }%`,
                        }}
                      />
                    ),
                  )}
                </div>
              </div>

              <div className="border-l border-slate-100 p-5">
                <div className="space-y-2">
                  <StatusRow
                    title="Camera"
                    value={
                      cameraState ===
                        "ready" ||
                      cameraState ===
                        "scanning" ||
                      cameraState ===
                        "complete"
                        ? "Connected"
                        : "Waiting"
                    }
                    ok={
                      cameraState ===
                        "ready" ||
                      cameraState ===
                        "scanning" ||
                      cameraState ===
                        "complete"
                    }
                  />

                  <StatusRow
                    title="Vision Engine"
                    value={
                      detectorError
                        ? "Unavailable"
                        : detector
                          ? "Ready"
                          : "Loading"
                    }
                    ok={
                      Boolean(
                        detector,
                      ) &&
                      !detectorError
                    }
                  />

                  <StatusRow
                    title="Face"
                    value={
                      faceDetected
                        ? `${faceConfidence}%`
                        : "Not detected"
                    }
                    ok={
                      faceDetected
                    }
                  />

                  <StatusRow
                    title="Scan"
                    value={`${scanProgress}%`}
                    ok={
                      scanProgress >
                      0
                    }
                  />
                </div>

                {detectorError ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[9px] leading-4 text-amber-700">
                    Camera still works, but automatic
                    face detection is unavailable.
                  </div>
                ) : null}

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Scan Progress
                    </span>

                    <span className="font-mono text-[10px] text-slate-500">
                      {scanProgress}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all"
                      style={{
                        width: `${scanProgress}%`,
                      }}
                    />
                  </div>
                </div>

                {scanResult ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Scan Complete
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <ResultBox
                        label="QUALITY"
                        value={`${scanResult.quality}%`}
                      />

                      <ResultBox
                        label="FRAMES"
                        value={String(
                          scanResult.frames,
                        )}
                      />

                      <ResultBox
                        label="COVERAGE"
                        value="360°"
                      />

                      <ResultBox
                        label="LATENCY"
                        value={`${scanResult.processingMs}ms`}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex gap-2">
                  {cameraState ===
                    "idle" ||
                  cameraState ===
                    "error" ? (
                    <Button
                      className="flex-1 gap-2"
                      onClick={
                        requestCamera
                      }
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Start Camera
                    </Button>
                  ) : cameraState ===
                    "ready" ? (
                    <Button
                      className="flex-1 gap-2"
                      disabled={
                        !faceDetected
                      }
                      onClick={
                        runScan
                      }
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {faceDetected
                        ? "Scan 360°"
                        : "Face Required"}
                    </Button>
                  ) : cameraState ===
                    "complete" ? (
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => {
                        setScanProgress(
                          0,
                        );

                        setScanResult(
                          null,
                        );

                        setCameraState(
                          "ready",
                        );
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Scan Again
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="flex-1"
                    >
                      Scanning...
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={
                      closeVision
                    }
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RUNTIME */}
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-emerald-600" />
              Brain Runtime
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            <StatusValue
              label="Active agents"
              value={String(
                stats.activeAgents,
              )}
            />

            <StatusValue
              label="Pending approvals"
              value={String(
                stats.pendingApprovals,
              )}
            />

            <StatusValue
              label="Events / minute"
              value={String(
                stats.eventsMinute,
              )}
            />

            <StatusValue
              label="Flow"
              value={`${stats.throughput.toLocaleString()}/s`}
            />

            <StatusValue
              label="Packets"
              value={stats.packets.toLocaleString()}
            />

            <StatusValue
              label="Graph nodes"
              value={String(
                nodes.length,
              )}
            />

            <StatusValue
              label="Graph links"
              value={String(
                edges.length,
              )}
            />
          </CardContent>
        </Card>
      </div>

      {/* RECENT VISION */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-violet-600" />
                Recent Vision Sessions
              </CardTitle>

              <p className="mt-1 text-[10px] text-slate-400">
                Stored scan metadata
              </p>
            </div>

            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-semibold text-violet-600">
              {scanQuery.data?.length ??
                0}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {scanQuery.data?.length ? (
            <div className="space-y-2">
              {scanQuery.data.map(
                (session: any) => {
                  const quality =
                    Number(
                      session.quality_score ??
                        0,
                    );

                  const frames =
                    Number(
                      session.frames_processed ??
                        0,
                    );

                  const latency =
                    Number(
                      session.ai_latency_ms ??
                        0,
                    );

                  return (
                    <div
                      key={
                        session.id
                      }
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                            <CircleDot className="h-5 w-5 text-violet-600" />
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-slate-800">
                              360 Vision Scan
                            </div>

                            <div className="text-[9px] text-slate-400">
                              {session.created_at
                                ? new Date(
                                    session.created_at,
                                  ).toLocaleString()
                                : "Unknown time"}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 md:min-w-[300px]">
                          <ResultBox
                            label="QUALITY"
                            value={`${quality}%`}
                          />

                          <ResultBox
                            label="FRAMES"
                            value={frames.toLocaleString()}
                          />

                          <ResultBox
                            label="LATENCY"
                            value={`${latency}ms`}
                          />
                        </div>
                      </div>

                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
                          style={{
                            width: `${clamp(
                              quality,
                              0,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <Eye className="mx-auto h-6 w-6 text-violet-500" />

              <div className="mt-3 text-sm font-semibold text-slate-800">
                No vision sessions
              </div>

              <div className="mt-1 text-[10px] text-slate-400">
                Complete a scan to create a session.
              </div>

              <Button
                size="sm"
                className="mt-4 gap-2"
                onClick={
                  openVision
                }
              >
                <Eye className="h-3.5 w-3.5" />
                Open Vision
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ACTIVITY */}
      {showActivity ? (
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-slate-500" />
              Manual Changes
            </CardTitle>
          </CardHeader>

          <CardContent>
            {auditQuery.data?.length ? (
              <div className="space-y-2">
                {auditQuery.data.map(
                  (item: any) => (
                    <div
                      key={
                        item.id
                      }
                      className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 md:flex-row md:justify-between"
                    >
                      <div>
                        <div className="text-[10px] font-semibold text-slate-800">
                          {item.action}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-400">
                          {
                            item.description
                          }
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-400">
                        {item.created_at
                          ? new Date(
                              item.created_at,
                            ).toLocaleString()
                          : ""}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No changes yet.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* CAMERA MODAL */}
      {showVision ? (
        <VisionModal
          cameraState={
            cameraState
          }

          detectorReady={
            Boolean(
              detector,
            )
          }

          detectorError={
            detectorError
          }

          faceDetected={
            faceDetected
          }

          faceConfidence={
            faceConfidence
          }

          faceBox={
            faceBox
          }

          videoSize={
            videoSize
          }

          scanProgress={
            scanProgress
          }

          scanAngle={
            scanAngle
          }

          wavePhase={
            wavePhase
          }

          scanResult={
            scanResult
          }

          videoRef={
            videoRef
          }

          onStartCamera={
            requestCamera
          }

          onScan={
            runScan
          }

          onClose={
            closeVision
          }

          onReset={() => {
            setScanResult(
              null,
            );

            setScanProgress(
              0,
            );

            setCameraState(
              "ready",
            );
          }}
        />
      ) : null}
    </div>
  );
}

/* ============================================================================
   SMALL COMPONENTS
============================================================================ */

function Metric({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </div>

          <div className="mt-1 flex items-end gap-1">
            <span className="text-xl font-semibold text-slate-900">
              {value}
            </span>

            <span className="text-[9px] text-slate-400">
              {suffix}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TinyMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <div className="text-[7px] font-semibold text-slate-400">
        {label}
      </div>

      <div className="mt-1 font-mono text-[10px] font-semibold text-slate-700">
        {value}
      </div>
    </div>
  );
}

function RuntimeBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-[8px] font-semibold text-slate-400">
        {label}
      </div>

      <div className="mt-1 font-mono text-xs text-slate-700">
        {value}
      </div>
    </div>
  );
}

function StatusValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-[10px] text-slate-500">
        {label}
      </span>

      <span className="font-mono text-xs font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}

function StatusRow({
  title,
  value,
  ok,
}: {
  title: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            ok
              ? "bg-emerald-500"
              : "bg-slate-300",
          )}
        />

        <span className="text-[10px] text-slate-500">
          {title}
        </span>
      </div>

      <span
        className={cn(
          "text-[10px] font-semibold",
          ok
            ? "text-emerald-600"
            : "text-slate-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ResultBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
      <div className="text-[7px] font-semibold text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-[10px] font-semibold text-slate-700">
        {value}
      </div>
    </div>
  );
}

function AddNodeButton({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: ComponentType<{
    className?: string;
  }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-emerald-300 hover:bg-emerald-50"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-800">
          {title}
        </div>

        <div className="text-[10px] text-slate-400">
          {description}
        </div>
      </div>

      <Plus className="ml-auto h-3.5 w-3.5 text-slate-400" />
    </button>
  );
}

/* ============================================================================
   VISION MODAL
============================================================================ */

function VisionModal({
  cameraState,
  detectorReady,
  detectorError,
  faceDetected,
  faceConfidence,
  faceBox,
  videoSize,
  scanProgress,
  scanAngle,
  wavePhase,
  scanResult,
  videoRef,
  onStartCamera,
  onScan,
  onClose,
  onReset,
}: {
  cameraState:
    | "idle"
    | "requesting"
    | "ready"
    | "scanning"
    | "complete"
    | "error";

  detectorReady: boolean;

  detectorError:
    | string
    | null;

  faceDetected: boolean;

  faceConfidence: number;

  faceBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;

  videoSize: {
    width: number;
    height: number;
  };

  scanProgress: number;

  scanAngle: number;

  wavePhase: number;

  scanResult: ScanResult | null;

  videoRef: RefObject<
    HTMLVideoElement | null
  >;

  onStartCamera: () => void;

  onScan: () => void;

  onClose: () => void;

  onReset: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
              <Eye className="h-4 w-4 text-violet-600" />
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">
                360 Vision
              </div>

              <div className="text-[9px] text-slate-400">
                Camera + face detection
              </div>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={
              onClose
            }
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1.45fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="relative aspect-video">
              <video
                ref={
                  videoRef
                }
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />

              {cameraState ===
              "idle" ? (
                <Overlay
                  icon={
                    <Eye className="h-5 w-5 text-violet-600" />
                  }
                  title="Camera ready"
                  text="Press Start Camera to request permission."
                />
              ) : null}

              {cameraState ===
              "requesting" ? (
                <Overlay
                  icon={
                    <RefreshCw className="h-5 w-5 animate-spin text-violet-600" />
                  }
                  title="Requesting camera"
                  text="Approve browser camera access."
                />
              ) : null}

              {cameraState ===
              "error" ? (
                <Overlay
                  icon={
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  }
                  title="Camera unavailable"
                  text="Check permission and try again."
                />
              ) : null}

              {cameraState !==
                "idle" &&
              cameraState !==
                "error" ? (
                <>
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[45%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />

                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[48%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/30"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${scanAngle}deg)`,
                    }}
                  >
                    <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500" />
                  </div>
                </>
              ) : null}

              {faceDetected &&
              faceBox ? (
                <div
                  className="pointer-events-none absolute rounded-xl border-2 border-emerald-400"
                  style={{
                    left: `${
                      (faceBox.x /
                        videoSize.width) *
                      100
                    }%`,

                    top: `${
                      (faceBox.y /
                        videoSize.height) *
                      100
                    }%`,

                    width: `${
                      (faceBox.width /
                        videoSize.width) *
                      100
                    }%`,

                    height: `${
                      (faceBox.height /
                        videoSize.height) *
                      100
                    }%`,
                  }}
                >
                  <span className="absolute -top-7 left-0 rounded-lg bg-emerald-500 px-2 py-1 text-[8px] font-semibold text-white">
                    FACE{" "}
                    {faceConfidence}%
                  </span>
                </div>
              ) : null}

              {cameraState ===
              "scanning" ? (
                <div
                  className="pointer-events-none absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent"
                  style={{
                    top: `${
                      15 +
                      scanProgress *
                        0.7
                    }%`,
                  }}
                />
              ) : null}

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-white/90 px-3 py-2 text-[10px] shadow backdrop-blur">
                <span>
                  {faceDetected
                    ? "Face detected"
                    : "Searching"}
                </span>

                <span className="font-mono text-slate-400">
                  {faceDetected
                    ? `${faceConfidence}%`
                    : "--"}
                </span>
              </div>
            </div>

            <div className="flex h-10 items-end gap-1 p-3">
              {Array.from({
                length: 44,
              }).map(
                (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-full",
                      faceDetected
                        ? "bg-violet-400"
                        : "bg-slate-200",
                    )}
                    style={{
                      height: `${
                        20 +
                        Math.abs(
                          Math.sin(
                            (i +
                              wavePhase) *
                              0.4,
                          ),
                        ) *
                          60
                      }%`,
                    }}
                  />
                ),
              )}
            </div>
          </div>

          <div className="space-y-3">
            <StatusRow
              title="Camera"
              value={
                cameraState ===
                  "ready" ||
                cameraState ===
                  "scanning" ||
                cameraState ===
                  "complete"
                  ? "Connected"
                  : "Waiting"
              }
              ok={
                cameraState ===
                  "ready" ||
                cameraState ===
                  "scanning" ||
                cameraState ===
                  "complete"
              }
            />

            <StatusRow
              title="Detector"
              value={
                detectorReady &&
                !detectorError
                  ? "Ready"
                  : detectorError
                    ? "Unavailable"
                    : "Loading"
              }
              ok={
                detectorReady &&
                !detectorError
              }
            />

            <StatusRow
              title="Face"
              value={
                faceDetected
                  ? `${faceConfidence}%`
                  : "Not detected"
              }
              ok={
                faceDetected
              }
            />

            <StatusRow
              title="Scan"
              value={`${scanProgress}%`}
              ok={
                scanProgress > 0
              }
            />

            {detectorError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[9px] text-amber-700">
                Camera remains available. Automatic
                detection could not be initialized.
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex justify-between text-[9px]">
                <span className="font-semibold text-slate-400">
                  SCAN PROGRESS
                </span>

                <span>
                  {scanProgress}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all"
                  style={{
                    width: `${scanProgress}%`,
                  }}
                />
              </div>
            </div>

            {scanResult ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Scan Complete
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ResultBox
                    label="QUALITY"
                    value={`${scanResult.quality}%`}
                  />

                  <ResultBox
                    label="FRAMES"
                    value={String(
                      scanResult.frames,
                    )}
                  />

                  <ResultBox
                    label="COVERAGE"
                    value="360°"
                  />

                  <ResultBox
                    label="LATENCY"
                    value={`${scanResult.processingMs}ms`}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex gap-2 pt-1">
              {cameraState ===
                "idle" ||
              cameraState ===
                "error" ? (
                <Button
                  className="flex-1 gap-2"
                  onClick={
                    onStartCamera
                  }
                >
                  <Eye className="h-3.5 w-3.5" />
                  Start Camera
                </Button>
              ) : cameraState ===
                "ready" ? (
                <Button
                  className="flex-1 gap-2"
                  disabled={
                    !faceDetected
                  }
                  onClick={
                    onScan
                  }
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {faceDetected
                    ? "Scan 360°"
                    : "Face Required"}
                </Button>
              ) : cameraState ===
                "complete" ? (
                <Button
                  className="flex-1"
                  onClick={
                    onReset
                  }
                >
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Scan Again
                </Button>
              ) : (
                <Button
                  disabled
                  className="flex-1"
                >
                  Scanning...
                </Button>
              )}

              <Button
                variant="outline"
                onClick={
                  onClose
                }
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Overlay({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50">
          {icon}
        </div>

        <div className="mt-3 text-xs font-semibold text-slate-800">
          {title}
        </div>

        <div className="mt-1 max-w-[230px] text-[10px] leading-4 text-slate-400">
          {text}
        </div>
      </div>
    </div>
  );
}