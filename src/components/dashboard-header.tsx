"use client";

import {
  Activity,
  BarChart3,
  Briefcase,
  ChevronDown,
  Cloud,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Mail,
  MapPin,
  Server,
  Users,
  X,
  Zap,
  Timer,
  Gauge,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Terminal,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

interface SupabaseProject {
  name: string;
  ref: string;
  url: string;
  region: string;
  location: string;
  status: "Healthy" | "Unhealthy";
  compute: string;
  databaseSizeGb: number;
  egressGb: number;
  monthlyActiveUsers: number;
  concurrentUsers: number;
  storageSizeGb: number;
  edgeFunctionInvocations: number;
  database: string;
  databaseVersion: string;
  maxDbConnections: number;
}

interface LiveServerMetrics {
  latency: number;
  cpu: number;
  memory: number;
  connections: number;
  reqPerMin: number;
  uptime: number; 
  netIn: number;
  netOut: number;
  diskRead: number;
  diskWrite: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  dbConnections: number;
  cpuHistory: number[];
  memHistory: number[];
  connHistory: number[];
  netHistory: { in: number; out: number }[];
}

interface LogEntry {
  id: number;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
}

interface Profile {
  id: string;
  name: string | null;
  position: string | null;
  email: string | null;
  bio: string | null;
  website: string | null;
  avatar_url: string | null;
  media_url: string | null;
  created_at: string | null;
}

/* ========================================================================= */
/* STATIC PROJECT DATA                                                       */
/* ========================================================================= */

const project: SupabaseProject = {
  name: "Arithmia",
  ref: "ejyttbtaplohrluiaqrg",
  url: "https://ejyttbtaplohrluiaqrg.supabase.co",
  region: "ap-southeast-1",
  location: "Southeast Asia (Singapore)",
  status: "Healthy",
  compute: "Large (8 vCPU, 16GB RAM)",
  databaseSizeGb: 14.8,
  egressGb: 142.5,
  monthlyActiveUsers: 1024,
  concurrentUsers: 145,
  storageSizeGb: 32.1,
  edgeFunctionInvocations: 185400,
  database: "PostgreSQL",
  databaseVersion: "15.4",
  maxDbConnections: 200,
};

// Hardcoded Admin Profile matching your exact DB data
const adminProfile: Profile = {
  id: "1",
  name: "Swastik Naskar",
  position: "Administrator",
  email: "swastik@arithmia.com",
  bio: "Lead developer and system architect overseeing the OmniAgent Control infrastructure.",
  website: "www.arithmia.com",
  avatar_url: "https://ik.imagekit.io/xvqovhmcyr/image.jpg",
  media_url: "https://ik.imagekit.io/xvqovhmcyr/arithmia-removebg-preview.png",
  created_at: new Date().toISOString()
};

const environments = [
  { value: "production" as const, label: "Production", color: "bg-emerald-500" },
  { value: "staging" as const, label: "Staging", color: "bg-amber-500" },
];

/* ========================================================================= */
/* HELPER FUNCTIONS                                                          */
/* ========================================================================= */

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

function getLatencyColor(latency: number) {
  if (latency < 80) return "text-emerald-600";
  if (latency < 150) return "text-amber-600";
  return "text-red-600";
}

function getErrorColor(rate: number) {
  if (rate < 1) return "text-emerald-600";
  if (rate < 3) return "text-amber-600";
  return "text-red-600";
}

function getLogColor(level: LogEntry["level"]) {
  switch (level) {
    case "INFO": return "text-blue-600 font-semibold";
    case "WARN": return "text-amber-600 font-semibold";
    case "ERROR": return "text-red-600 font-semibold";
    case "DEBUG": return "text-gray-400 font-semibold";
    default: return "text-gray-700";
  }
}

const logMessages = [
  "GET /api/v1/users 200 12ms",
  "DB query executed in 4.2ms",
  "Cache hit for user_profile_884",
  "Connection pool allocating new client",
  "Failed login attempt for user admin",
  "POST /api/v1/transactions 201 45ms",
  "WebSocket client connected (ID: 9s8df)",
  "Background job 'cleanup_sessions' started",
  "Rate limit exceeded for IP 192.168.1.42",
  "Redis SET operation successful",
  "Auth token refreshed for user 2391",
  "GET /api/v1/settings 304 2ms",
  "Edge Function 'process-payment' deployed",
  "Database migration check completed",
  "S3 storage bucket sync finished"
];

/* ========================================================================= */
/* MAIN COMPONENT                                                            */
/* ========================================================================= */

export function DashboardHeader() {
  const [serverOpen, setServerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [environment, setEnvironment] = useState("production");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  const [metrics, setMetrics] = useState<LiveServerMetrics>({
    latency: 65,
    cpu: 48,
    memory: 62,
    connections: 145,
    reqPerMin: 1250,
    uptime: 86400 * 12,
    netIn: 4.2,
    netOut: 12.8,
    diskRead: 450,
    diskWrite: 180,
    errorRate: 0.2,
    p50: 65,
    p95: 140,
    p99: 210,
    dbConnections: 85,
    cpuHistory: Array(20).fill(0).map(() => Math.random() * 20 + 40),
    memHistory: Array(20).fill(0).map(() => Math.random() * 10 + 55),
    connHistory: Array(20).fill(0).map(() => Math.random() * 40 + 120),
    netHistory: Array(20).fill(0).map(() => ({ in: Math.random() * 2 + 3, out: Math.random() * 4 + 10 })),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        const newConn = Math.max(90, Math.min(200, prev.connections + Math.round((Math.random() - 0.5) * 20)));
        const newCpu = Math.max(25, Math.min(85, prev.cpu + (Math.random() - 0.5) * 15));
        const newMem = Math.max(45, Math.min(80, prev.memory + (Math.random() - 0.5) * 5));
        const newErr = Math.max(0, Math.min(2.5, Math.max(0, prev.errorRate + (Math.random() - 0.5) * 0.3)));
        
        return {
          latency: Math.max(35, Math.min(180, prev.latency + (Math.random() - 0.5) * 25)),
          cpu: newCpu,
          memory: newMem,
          connections: newConn,
          reqPerMin: Math.max(800, Math.min(2500, prev.reqPerMin + (Math.random() - 0.5) * 200)),
          uptime: prev.uptime + 2,
          netIn: Math.max(1.5, Math.min(8.5, prev.netIn + (Math.random() - 0.5) * 1.5)),
          netOut: Math.max(5.0, Math.min(25.0, prev.netOut + (Math.random() - 0.5) * 3.0)),
          diskRead: Math.max(100, Math.min(1500, prev.diskRead + (Math.random() - 0.5) * 200)),
          diskWrite: Math.max(50, Math.min(600, prev.diskWrite + (Math.random() - 0.5) * 80)),
          errorRate: newErr,
          p50: Math.max(40, Math.min(90, prev.p50 + (Math.random() - 0.5) * 10)),
          p95: Math.max(100, Math.min(220, prev.p95 + (Math.random() - 0.5) * 25)),
          p99: Math.max(150, Math.min(350, prev.p99 + (Math.random() - 0.5) * 40)),
          dbConnections: Math.max(40, Math.min(150, prev.dbConnections + Math.round((Math.random() - 0.5) * 15))),
          cpuHistory: [...prev.cpuHistory.slice(1), newCpu],
          memHistory: [...prev.memHistory.slice(1), newMem],
          connHistory: [...prev.connHistory.slice(1), newConn],
          netHistory: [...prev.netHistory.slice(1), { 
            in: Math.max(1.5, Math.min(8.5, prev.netIn + (Math.random() - 0.5) * 1.5)), 
            out: Math.max(5.0, Math.min(25.0, prev.netOut + (Math.random() - 0.5) * 3.0)) 
          }],
        };
      });

      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      
      const rand = Math.random();
      const level: LogEntry["level"] = rand > 0.95 ? "ERROR" : rand > 0.8 ? "WARN" : rand > 0.6 ? "DEBUG" : "INFO";
      const message = logMessages[Math.floor(Math.random() * logMessages.length)];
      
      logIdRef.current += 1;
      setLogs((prev) => [
        ...prev.slice(-50), 
        { id: logIdRef.current, timestamp, level, message }
      ]);

    }, 1500); 

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!serverOpen && !profileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setServerOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [serverOpen, profileOpen]);

  const healthScore = useMemo(() => {
    const latencyScore = Math.max(0, 100 - metrics.latency);
    const cpuScore = Math.max(0, 100 - metrics.cpu);
    const errScore = Math.max(0, 100 - (metrics.errorRate * 20));
    return Math.round((latencyScore + cpuScore + errScore) / 3);
  }, [metrics.latency, metrics.cpu, metrics.errorRate]);

  const healthColor = healthScore > 80 ? "#10b981" : healthScore > 50 ? "#f59e0b" : "#ef4444";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 flex h-16",
          "items-center gap-3 border-b",
          "border-gray-200 bg-white/95",
          "px-4 backdrop-blur",
          "supports-[backdrop-filter]:bg-white/80",
          "shadow-sm"
        )}
      >
        <SidebarTrigger className={cn("shrink-0 text-gray-600", "hover:bg-gray-100 hover:text-gray-900")} />

        <button
          type="button"
          onClick={() => setServerOpen(true)}
          className={cn(
            "hidden md:flex",
            "items-center gap-3",
            "rounded-xl border border-gray-200",
            "bg-white",
            "px-3 py-2",
            "text-left",
            "transition-all",
            "hover:border-gray-300",
            "hover:bg-gray-50",
            "hover:shadow-md",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-blue-500/30"
          )}
        >
          <div className={cn("relative flex size-9 items-center", "justify-center rounded-xl", "bg-blue-50")}>
            <Server className="size-4 text-blue-600" />
            <span className={cn("absolute -right-0.5 -top-0.5", "size-2.5 rounded-full", "border-2 border-white", "bg-emerald-500 animate-pulse")} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">{project.name}</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 uppercase">
                <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-gray-500 tabular-nums">
              <span>{project.location}</span>
              <span className="text-gray-300">·</span>
              <span className={getLatencyColor(metrics.latency)}>{metrics.latency.toFixed(0)}ms</span>
              <span className="text-gray-300">·</span>
              <span>{formatNumber(metrics.reqPerMin)} req/m</span>
            </div>
          </div>
          <ChevronDown className="ml-1 size-4 text-gray-400" />
        </button>

        <button
          type="button"
          onClick={() => setServerOpen(true)}
          aria-label="Open server observability"
          className={cn("flex size-9 items-center", "justify-center rounded-lg", "border border-gray-200", "text-gray-600", "hover:bg-gray-100", "md:hidden")}
        >
          <Server className="size-4" />
        </button>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className={cn("hidden items-center gap-1", "rounded-lg border border-gray-200", "bg-white p-1 sm:flex shadow-sm")}>
            {environments.map((item) => {
              const active = environment === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setEnvironment(item.value)}
                  className={cn(
                    "flex items-center gap-2",
                    "rounded-md px-2.5 py-1.5",
                    "text-[11px] font-semibold",
                    "transition-colors",
                    active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <span className={cn("size-2 rounded-full", item.color)} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="hidden h-6 w-px bg-gray-200 sm:block" />

          {/* Polished Profile Avatar Button */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-gray-100"
          >
            <div className="hidden text-right lg:block">
              <p className="text-xs font-bold leading-tight text-gray-900">Swastik Naskar</p>
              <p className="mt-0.5 text-[10px] font-medium text-gray-500">Administrator</p>
            </div>
            <Avatar className="size-9 border border-gray-200">
              <AvatarImage src={adminProfile.avatar_url} alt="Swastik Naskar" />
              <AvatarFallback className="bg-blue-50 text-xs font-bold text-blue-700">SN</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      {/* PROFILE POPUP */}
      {profileOpen && (
        <ProfileModal profile={adminProfile} onClose={() => setProfileOpen(false)} />
      )}

      {/* SERVER DRAWER */}
      {serverOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="Close server details"
            onClick={() => setServerOpen(false)}
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm"
          />

          <aside
            className={cn(
              "absolute right-0 top-0",
              "h-full w-full",
              "max-w-4xl",
              "overflow-y-auto",
              "border-l border-gray-200",
              "bg-gray-50",
              "shadow-2xl",
              "animate-in",
              "slide-in-from-right",
              "duration-200"
            )}
          >
            {/* PANEL HEADER */}
            <div className={cn("sticky top-0 z-20", "border-b border-gray-200", "bg-white/95", "backdrop-blur-xl")}>
              <div className="flex min-h-20 items-center justify-between gap-4 px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn("relative flex size-11 shrink-0", "items-center justify-center", "rounded-2xl", "bg-blue-50")}>
                    <Server className="size-5 text-blue-600" />
                    <span className={cn("absolute right-0.5 top-0.5", "size-2.5 rounded-full", "border-2 border-white", "bg-emerald-500 animate-pulse")} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-gray-900">{project.name}</h2>
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Stream
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-gray-500">
                      <span>{project.location} · {project.region}</span>
                      <span className="text-gray-300">·</span>
                      <span className="font-mono text-gray-500">Uptime: {formatUptime(metrics.uptime)}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setServerOpen(false)}
                  className={cn("shrink-0 rounded-lg p-2", "text-gray-500", "hover:bg-gray-100", "hover:text-gray-900")}
                  aria-label="Close server panel"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* CONTENT */}
            <div className="space-y-6 p-5">
              
              {/* HERO SECTION WITH HEALTH RING */}
              <section className={cn("overflow-hidden rounded-2xl", "border border-gray-200", "bg-white shadow-sm")}>
                <div className="flex flex-col sm:flex-row">
                  {/* Left: Health Ring */}
                  <div className="flex items-center justify-center border-b border-gray-200 bg-gray-50/50 p-6 sm:border-b-0 sm:border-r">
                    <HealthRing score={healthScore} color={healthColor} />
                  </div>
                  {/* Right: Live Metrics Text */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4">
                    <HeroMetric label="Active Users" value={formatNumber(project.concurrentUsers)} icon={Users} color="text-purple-600" />
                    <HeroMetric label="Req / Min" value={formatNumber(metrics.reqPerMin)} icon={Activity} color="text-blue-600" />
                    <HeroMetric label="CPU Usage" value={`${metrics.cpu.toFixed(0)}%`} icon={Cpu} color="text-cyan-600" />
                    <HeroMetric label="Mem Usage" value={`${metrics.memory.toFixed(0)}%`} icon={Gauge} color="text-indigo-600" />
                    <HeroMetric label="Latency (p95)" value={`${metrics.p95.toFixed(0)}ms`} icon={Timer} dynamicColor={getLatencyColor(metrics.p95)} />
                    <HeroMetric label="Error Rate" value={`${metrics.errorRate.toFixed(2)}%`} icon={AlertTriangle} dynamicColor={getErrorColor(metrics.errorRate)} />
                    <HeroMetric label="Net Out" value={`${metrics.netOut.toFixed(1)} MB/s`} icon={ArrowUpRight} color="text-emerald-600" />
                    <HeroMetric label="Net In" value={`${metrics.netIn.toFixed(1)} MB/s`} icon={ArrowDownLeft} color="text-teal-600" />
                  </div>
                </div>
              </section>

              {/* LIVE CHARTS */}
              <div className="grid gap-4 lg:grid-cols-2">
                <DashboardSection title="Compute Resources" description="CPU & Memory utilization" icon={Cpu}>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 text-[11px] font-medium text-gray-600">
                        <span className="flex items-center gap-1.5 text-cyan-600"><span className="size-2 rounded-full bg-cyan-500"/>CPU</span>
                        <span className="flex items-center gap-1.5 text-indigo-600"><span className="size-2 rounded-full bg-indigo-500"/>Memory</span>
                      </div>
                      <span className="text-[10px] font-medium text-gray-400">Live (30s window)</span>
                    </div>
                    <MultiLineGraph 
                      datasets={[
                        { data: metrics.cpuHistory, color: "#06b6d4" },
                        { data: metrics.memHistory, color: "#6366f1" }
                      ]} 
                    />
                  </div>
                </DashboardSection>

                <DashboardSection title="Network I/O" description="Inbound and Outbound traffic" icon={Cloud}>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 text-[11px] font-medium text-gray-600">
                        <span className="flex items-center gap-1.5 text-emerald-600"><span className="size-2 rounded-full bg-emerald-500"/>Out ({metrics.netOut.toFixed(1)} MB/s)</span>
                        <span className="flex items-center gap-1.5 text-teal-600"><span className="size-2 rounded-full bg-teal-500"/>In ({metrics.netIn.toFixed(1)} MB/s)</span>
                      </div>
                      <span className="text-[10px] font-medium text-gray-400">Live (30s window)</span>
                    </div>
                    <MultiLineGraph 
                      datasets={[
                        { data: metrics.netHistory.map(p => p.out), color: "#10b981" },
                        { data: metrics.netHistory.map(p => p.in), color: "#14b8a6" }
                      ]} 
                    />
                  </div>
                </DashboardSection>
              </div>

              {/* API PERFORMANCE & DATABASE */}
              <div className="grid gap-4 lg:grid-cols-2">
                <DashboardSection title="API Performance" description="Response times across requests" icon={Timer}>
                  <div className="space-y-2">
                    <PerfRow label="p50 (Median)" value={`${metrics.p50.toFixed(0)}ms`} max={150} current={metrics.p50} color="bg-emerald-500" />
                    <PerfRow label="p95" value={`${metrics.p95.toFixed(0)}ms`} max={300} current={metrics.p95} color="bg-amber-500" />
                    <PerfRow label="p99" value={`${metrics.p99.toFixed(0)}ms`} max={500} current={metrics.p99} color="bg-red-500" />
                  </div>
                </DashboardSection>

                <DashboardSection title="Database Health" description="PostgreSQL real-time metrics" icon={Database}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-xs font-medium text-gray-700 flex items-center gap-2"><Database className="size-3.5 text-purple-600"/> Active Connections</span>
                      <span className="text-xs font-bold text-gray-900 tabular-nums">{metrics.dbConnections} / {project.maxDbConnections}</span>
                    </div>
                    <UsageBar label="Connection Pool" percent={(metrics.dbConnections / project.maxDbConnections) * 100} />
                    <div className="grid grid-cols-2 gap-2">
                      <MiniMetric label="Read Ops/s" value={formatNumber(metrics.diskRead)} />
                      <MiniMetric label="Write Ops/s" value={formatNumber(metrics.diskWrite)} />
                    </div>
                  </div>
                </DashboardSection>
              </div>

              {/* LIVE TERMINAL LOGS */}
              <DashboardSection title="Live Server Logs" description="Real-time application console output" icon={Terminal}>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="flex gap-1.5">
                      <span className="size-2.5 rounded-full bg-red-400"></span>
                      <span className="size-2.5 rounded-full bg-amber-400"></span>
                      <span className="size-2.5 rounded-full bg-emerald-400"></span>
                    </div>
                    <span className="ml-2 text-[10px] font-mono text-gray-500">tail -f /var/log/omniagent.log</span>
                  </div>
                  <div 
                    ref={terminalRef}
                    className="h-64 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed custom-scroll bg-gray-50/50"
                  >
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors">
                        <span className="text-gray-400 shrink-0">{log.timestamp}</span>
                        <span className={cn("shrink-0 w-12", getLogColor(log.level))}>
                          [{log.level}]
                        </span>
                        <span className="text-gray-800">{log.message}</span>
                      </div>
                    ))}
                    {/* Blinking cursor effect */}
                    <div className="flex gap-2 px-2 py-1 mt-1">
                      <span className="text-gray-400">--:--:--</span>
                      <span className="text-gray-400 w-12">[...]</span>
                      <span className="text-blue-600 animate-pulse">█</span>
                    </div>
                  </div>
                </div>
              </DashboardSection>

              {/* INFRASTRUCTURE & USAGE STATS */}
              <div className="grid gap-4 lg:grid-cols-2">
                <DashboardSection title="Infrastructure" description="Provisioned project configuration" icon={Server}>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard label="Compute Size" value={project.compute} icon={Cpu} />
                    <InfoCard label="Region" value={project.location} icon={MapPin} />
                    <InfoCard label="Database" value={`${project.database} ${project.databaseVersion}`} icon={Database} />
                    <InfoCard label="Storage Used" value={`${project.storageSizeGb} GB`} icon={HardDrive} />
                  </div>
                </DashboardSection>

                <DashboardSection title="Monthly Stats" description="Aggregated usage for current cycle" icon={BarChart3}>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard label="Monthly Users" value={formatNumber(project.monthlyActiveUsers)} icon={Users} />
                    <InfoCard label="DB Size" value={`${project.databaseSizeGb} GB`} icon={Database} />
                    <InfoCard label="Bandwidth" value={`${project.egressGb} GB`} icon={Cloud} />
                    <InfoCard label="Edge Invocations" value={formatNumber(project.edgeFunctionInvocations)} icon={Zap} />
                  </div>
                </DashboardSection>
              </div>

            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/* ========================================================================= */
/* PROFILE MODAL COMPONENT                                                   */
/* ========================================================================= */

function ProfileModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close profile"
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
        
        {/* Sticky Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-full bg-white/80 p-2 text-gray-600 hover:bg-white hover:text-gray-900 transition-colors shadow-sm backdrop-blur-sm"
        >
          <X className="size-4" />
        </button>

        <div className="max-h-[85vh] overflow-y-auto">
          {/* Header / Cover Media */}
          <div className="relative h-44 shrink-0 bg-gray-100">
            {profile.media_url ? (
              <img src={profile.media_url} alt="Cover media" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-blue-50 to-indigo-50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Body */}
          <div className="px-8 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-16 sm:-mt-20 mb-8 relative z-10">
              {/* Avatar perfectly overlapping the banner */}
              <div className="flex shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-white shadow-lg size-32 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name || "User"} className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center bg-gray-50">
                    <Users className="size-10 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Name & Position */}
              <div className="flex-1 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{profile.name || "Unknown User"}</h2>
                <p className="text-sm font-medium text-blue-600 mt-1">{profile.position || "No position specified"}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
                <Mail className="size-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{profile.email || "Not provided"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
                <Briefcase className="size-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Position</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{profile.position || "Not provided"}</p>
                </div>
              </div>

              {profile.website && (
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 sm:col-span-2">
                  <Globe className="size-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Website</p>
                    <a href={`https://${profile.website}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">
                      {profile.website}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Bio Log / Details */}
            {profile.bio && (
              <div className="mt-4 p-5 rounded-2xl border border-gray-100 bg-white">
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-2">Biography</p>
                <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SUB-COMPONENTS                                                            */
/* ========================================================================= */

function DashboardSection({ title, description, icon: Icon, children }: { title: string; description: string; icon: ElementType; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-start gap-2">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 border border-gray-200">
          <Icon className="size-3.5 text-gray-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="mt-0.5 text-[11px] font-medium text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function HealthRing({ score, color }: { score: number; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex size-32 items-center justify-center">
      <svg className="size-32 -rotate-90" viewBox="0 0 100 100">
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          fill="none" 
          stroke="#e5e7eb" 
          strokeWidth="8" 
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-900 tabular-nums">{score}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Health</span>
      </div>
    </div>
  );
}

function HeroMetric({ label, value, icon: Icon, color, dynamicColor }: { label: string; value: string; icon: ElementType; color?: string; dynamicColor?: string }) {
  const textColor = dynamicColor || color || "text-gray-900";
  return (
    <div className={cn("border-b border-r border-gray-200", "p-4 last:border-r-0")}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5 text-gray-400", dynamicColor)} />
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      </div>
      <p className={cn("mt-1.5 text-xl font-bold tabular-nums", textColor)}>{value}</p>
    </div>
  );
}

function InfoCard({ label, value, icon: Icon }: { label: string; value: string; icon: ElementType }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-gray-400" />
        <p className="text-[11px] font-medium text-gray-500">{label}</p>
      </div>
      <p className={cn("mt-2 truncate text-sm font-bold text-gray-900")}>{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
      <p className="text-[10px] font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}

function PerfRow({ label, value, max, current, color }: { label: string; value: string; max: number; current: number; color: string }) {
  const percent = Math.min((current / max) * 100, 100);
  return (
    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-gray-700">{label}</span>
        <span className="text-[11px] font-bold text-gray-900 tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function UsageBar({ label, percent }: { label: string; percent: number }) {
  const safePercent = Math.min(Math.max(percent, 0), 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-gray-700">{label}</span>
        <span className="text-[11px] font-bold text-gray-900 tabular-nums">{safePercent.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${safePercent}%` }} />
      </div>
    </div>
  );
}

function MultiLineGraph({ datasets }: { datasets: { data: number[]; color: string }[] }) {
  const allValues = datasets.flatMap(d => d.data);
  const maxVal = Math.max(...allValues, 50);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;
  const stepX = 600 / (datasets[0].data.length - 1);

  return (
    <div className="h-32 overflow-hidden rounded-lg border border-gray-200 bg-white p-3">
      <div className="relative h-full">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="border-t border-dashed border-gray-200" />
          ))}
        </div>
        <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="relative h-full w-full">
          {datasets.map((ds, idx) => {
            const linePath = ds.data
              .map((val, i) => {
                const x = i * stepX;
                const y = 120 - ((val - minVal) / range) * 100 - 10;
                return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
              })
              .join(" ");

            return (
              <path
                key={idx}
                d={linePath}
                fill="none"
                stroke={ds.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}