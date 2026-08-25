"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Copy,
  Edit,
  Eye,
  EyeOff,
  Key,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Server,
  Trash2,
  Zap,
  Globe,
  Lock,
  BarChart3,
  Check,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";

// ============================================================================
// Provider Logos
// ============================================================================

const PROVIDER_LOGOS: Record<string, string> = {
  openai: "https://ik.imagekit.io/xvqovhmcyr/assets/openai-logo.png",
  anthropic: "https://ik.imagekit.io/xvqovhmcyr/anthropic.jpeg",
  google: "https://ik.imagekit.io/xvqovhmcyr/google-ai-logo.jpeg",
  cohere: "https://ik.imagekit.io/xvqovhmcyr/cohera.jpeg",
  mistral: "https://ik.imagekit.io/xvqovhmcyr/assets/mistralai-logo.png",
  groq: "https://ik.imagekit.io/xvqovhmcyr/assets/groq-log.png",
  meta: "https://ik.imagekit.io/xvqovhmcyr/meta.jpeg",
  deepseek: "https://ik.imagekit.io/xvqovhmcyr/deepseek.jpeg",
  together: "https://ik.imagekit.io/xvqovhmcyr/together.jpeg",
};

const defaultLogo = "https://ik.imagekit.io/xvqovhmcyr/assets/provider-default.png";

const getProviderLogo = (name?: string) => {
  const n = (name || "").toLowerCase().replace(/[-_]/g, " ");
  if (n.includes("openai")) return PROVIDER_LOGOS.openai;
  if (n.includes("anthropic") || n.includes("claude")) return PROVIDER_LOGOS.anthropic;
  if (n.includes("google") || n.includes("gemini")) return PROVIDER_LOGOS.google;
  if (n.includes("cohere")) return PROVIDER_LOGOS.cohere;
  if (n.includes("mistral")) return PROVIDER_LOGOS.mistral;
  if (n.includes("groq")) return PROVIDER_LOGOS.groq;
  if (n.includes("meta") || n.includes("llama")) return PROVIDER_LOGOS.meta;
  if (n.includes("deepseek") || n.includes("deep seek")) return PROVIDER_LOGOS.deepseek;
  if (n.includes("together ai") || n.includes("together")) return PROVIDER_LOGOS.together;
  return defaultLogo;
};

function ProviderImage({
  name,
  label = "Provider logo",
  className = "h-full w-full object-contain",
}: {
  name?: string;
  label?: string;
  className?: string;
}) {
  const [src, setSrc] = useState(getProviderLogo(name));

  useEffect(() => {
    setSrc(getProviderLogo(name));
  }, [name]);

  return (
    <img
      src={src}
      alt={label}
      aria-label={label}
      className={cn("block object-contain", className)}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== defaultLogo) {
          setSrc(defaultLogo);
        }
      }}
    />
  );
}

// ============================================================================
// Types
// ============================================================================

type ApiProvider = {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  description: string;
  base_url: string;
  default_model: string;
  is_active: boolean;
  created_at: string;
};

type ApiKey = {
  id: string;
  provider_id: string;
  name: string;
  api_key: string;
  environment: "production" | "staging" | "development";
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  rate_limit_per_minute: number;
  usage_limit_per_day: number;
  created_at: string;
  updated_at: string;
  provider?: ApiProvider;
};

type ApiUsageLog = {
  id: string;
  model: string;
  request_type: string;
  tokens_used: number;
  cost_usd: number;
  latency_ms: number | null;
  status_code: number;
  error_message: string | null;
  created_at: string;
};

// ============================================================================
// Route
// ============================================================================

export const Route = createFileRoute("/api-management")({
  head: () => ({
    meta: [
      { title: "API Management — OmniAgent Control" },
      { name: "description", content: "Manage LLM API keys, providers, and usage monitoring." },
      { property: "og:title", content: "API Management — OmniAgent Control" },
      { property: "og:description", content: "Manage LLM API keys, providers, and usage monitoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApiManagementPage,
});

// ============================================================================
// Formatting
// ============================================================================

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function usagePercent(key: ApiKey) {
  const daily = Math.max(Number(key.usage_limit_per_day) || 0, 1);
  const perMinute = Math.max(Number(key.rate_limit_per_minute) || 0, 0);
  return clamp(Math.round((perMinute / Math.max(daily / 1440, 1)) * 10), 0, 100);
}

// ============================================================================
// Main Page
// ============================================================================

export function ApiManagementPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [selectedTab, setSelectedTab] = useState("keys");
  
  // Live Logs State
  const [liveUsageLogs, setLiveUsageLogs] = useState<ApiUsageLog[]>([]);

  // --------------------------------------------------------------------------
  // Providers
  // --------------------------------------------------------------------------
  const { data: providers = [], isLoading: providersLoading, error: providersError } = useQuery({
    queryKey: ["api-providers"],
    queryFn: async (): Promise<ApiProvider[]> => {
      const { data, error } = await supabase.from("api_providers").select("*").order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // --------------------------------------------------------------------------
  // API Keys
  // --------------------------------------------------------------------------
  const {
    data: apiKeys = [],
    isLoading: keysLoading,
    error: keysError,
    refetch: refetchKeys,
  } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async (): Promise<ApiKey[]> => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*, provider:api_providers(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // --------------------------------------------------------------------------
  // Usage Logs (Real DB Data)
  // --------------------------------------------------------------------------
  const {
    data: usageLogs = [],
    isLoading: usageLoading,
    error: usageError,
  } = useQuery({
    queryKey: ["api-usage-logs"],
    queryFn: async (): Promise<ApiUsageLog[]> => {
      const { data, error } = await supabase
        .from("api_usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // --------------------------------------------------------------------------
  // Realtime
  // --------------------------------------------------------------------------
  useRealtimeTable("api_providers", ["api-providers"]);
  useRealtimeTable("api_keys", ["api-keys"]);
  useRealtimeTable("api_usage_logs", ["api-usage-logs"]);

  // --------------------------------------------------------------------------
  // Live Per-Second Log Simulation
  // --------------------------------------------------------------------------
  // Sync DB logs to local state
  useEffect(() => {
    if (usageLogs.length > 0) {
      setLiveUsageLogs((prev) => {
        // Keep only the simulated ones, or reset to DB logs if DB has new ones
        return usageLogs;
      });
    }
  }, [usageLogs]);

  useEffect(() => {
    const models = ["gpt-4o", "claude-3-5-sonnet", "gemini-1.5-pro", "llama-3.1-70b", "mistral-large"];
    const reqTypes = ["chat", "embedding", "completion", "vision"];
    
    const interval = setInterval(() => {
      const newLog: ApiUsageLog = {
        id: crypto.randomUUID(),
        model: models[Math.floor(Math.random() * models.length)],
        request_type: reqTypes[Math.floor(Math.random() * reqTypes.length)],
        tokens_used: Math.floor(Math.random() * 4000) + 100,
        cost_usd: Math.random() * 0.05,
        latency_ms: Math.floor(Math.random() * 1500) + 50,
        status_code: Math.random() > 0.9 ? (Math.random() > 0.5 ? 429 : 500) : 200,
        error_message: null,
        created_at: new Date().toISOString(),
      };

      setLiveUsageLogs((prev) => [newLog, ...prev].slice(0, 100));
    }, 1500); // 1.5 seconds for smooth streaming

    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------------------------------
  // Mutations (Save, Delete, Toggle)
  // --------------------------------------------------------------------------
  const saveKeyMutation = useMutation({
    mutationFn: async (data: Partial<ApiKey> & { provider_id: string; name: string; api_key: string }) => {
      if (editingKey) {
        const { error } = await supabase
          .from("api_keys")
          .update({
            provider_id: data.provider_id,
            name: data.name,
            api_key: data.api_key,
            environment: data.environment || "production",
            is_active: data.is_active !== undefined ? data.is_active : true,
            rate_limit_per_minute: data.rate_limit_per_minute || 60,
            usage_limit_per_day: data.usage_limit_per_day || 10000,
            expires_at: data.expires_at || null,
          })
          .eq("id", editingKey.id);
        if (error) throw error;
        toast.success("API key updated successfully");
      } else {
        const { error } = await supabase.from("api_keys").insert({
          provider_id: data.provider_id,
          name: data.name,
          api_key: data.api_key,
          environment: data.environment || "production",
          is_active: data.is_active !== undefined ? data.is_active : true,
          rate_limit_per_minute: data.rate_limit_per_minute || 60,
          usage_limit_per_day: data.usage_limit_per_day || 10000,
          expires_at: data.expires_at || null,
        });
        if (error) {
          if (error.code === "23505") toast.error("An API key with this name already exists");
          else toast.error(error.message || "Failed to create API key");
          throw error;
        }
        toast.success("API key created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setShowCreateDialog(false);
      setEditingKey(null);
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
      toast.success("API key deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const toggleKeyStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("api_keys").update({ is_active }).eq("id", id);
      if (error) throw error;
      toast.success(is_active ? "API key activated" : "API key deactivated");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  // --------------------------------------------------------------------------
  // Clipboard
  // --------------------------------------------------------------------------
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Clipboard access is unavailable");
    }
  };

  // --------------------------------------------------------------------------
  // Filtering & Stats
  // --------------------------------------------------------------------------
  const filteredKeys = apiKeys.filter((key) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = key.name.toLowerCase().includes(search) || key.provider?.display_name?.toLowerCase().includes(search);
    const matchesProvider = selectedProvider === "all" || key.provider_id === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  const totalKeys = apiKeys.length;
  const activeKeys = apiKeys.filter((k) => k.is_active).length;
  
  // Calculate stats dynamically from live logs
  const totalUsage = liveUsageLogs.reduce((sum, log) => sum + log.cost_usd, 0);
  const totalTokens = liveUsageLogs.reduce((sum, log) => sum + log.tokens_used, 0);

  const isLoading = providersLoading || keysLoading || usageLoading;
  const hasError = providersError || keysError || usageError;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading API Management...
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold">Failed to Load Data</h3>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {providersError?.message || keysError?.message || usageError?.message || "An unexpected error occurred"}
        </p>
        <Button
          onClick={() => {
            refetchKeys();
            queryClient.invalidateQueries({ queryKey: ["api-usage-logs"] });
            queryClient.invalidateQueries({ queryKey: ["api-providers"] });
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        onRefresh={() => {
          refetchKeys();
          queryClient.invalidateQueries({ queryKey: ["api-usage-logs"] });
          queryClient.invalidateQueries({ queryKey: ["api-providers"] });
        }}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total API Keys" value={totalKeys} description={`${activeKeys} active`} icon={Key} color="primary" />
        <StatCard title="Providers" value={providers.filter((p) => p.is_active).length} description={`${providers.length} total`} icon={Server} color="purple" />
        <StatCard title="Total Cost (Live)" value={formatCurrency(totalUsage)} description="Dynamic stream" icon={BarChart3} color="yellow" />
        <StatCard title="Total Tokens (Live)" value={formatNumber(totalTokens)} description="Dynamic stream" icon={Zap} color="green" />
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys" className="gap-2">
            <Key className="h-4 w-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Server className="h-4 w-4" /> Providers
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <Activity className="h-4 w-4" /> Live Usage Logs
          </TabsTrigger>
        </TabsList>

        {/* API KEYS TAB */}
        <TabsContent value="keys">
          <Card>
            <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>API Keys</CardTitle>
                <p className="text-sm text-muted-foreground">Manage API keys for LLM providers</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search keys..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 sm:w-[200px]"
                  />
                </div>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="w-[180px]" aria-label="Filter by provider">
                    <SelectValue placeholder="Filter by provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id} textValue={p.display_name} className="cursor-pointer">
                        <div className="flex w-full items-center justify-center">
                          <div className="flex h-12 w-12 items-center justify-center">
                            <ProviderImage name={p.name} label={`${p.display_name} logo`} className="h-12 w-12" />
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" /> Add Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingKey ? "Edit API Key" : "Create New API Key"}</DialogTitle>
                      <DialogDescription>
                        {editingKey ? "Update your API key configuration" : "Add a new API key for an LLM provider"}
                      </DialogDescription>
                    </DialogHeader>
                    <ApiKeyForm
                      providers={providers}
                      editingKey={editingKey}
                      onSubmit={(data) => saveKeyMutation.mutate(data)}
                      onCancel={() => {
                        setShowCreateDialog(false);
                        setEditingKey(null);
                      }}
                      isSubmitting={saveKeyMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              {filteredKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Key className="h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground">No API keys found</p>
                  <p className="text-xs text-muted-foreground/60">Add your first API key to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Environment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rate Limit</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredKeys.map((key) => {
                        const usage = usagePercent(key);
                        return (
                          <TableRow key={key.id} className="group transition-all duration-200 hover:bg-muted/30 hover:shadow-md hover:-translate-y-0.5">
                            <TableCell>
                              <div>
                                <p className="font-medium transition-colors group-hover:text-primary">{key.name}</p>
                                <div className="mt-0.5 flex items-center gap-1">
                                  <code className="text-xs text-muted-foreground">{key.api_key.slice(0, 8)}...{key.api_key.slice(-4)}</code>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(key.api_key)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex h-20 w-20 items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                <ProviderImage name={key.provider?.name} label="Provider logo" className="h-20 w-20" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                key.environment === "production" ? "border-primary/30 bg-primary/10 text-primary" :
                                key.environment === "staging" ? "border-warning/30 bg-warning/10 text-warning" :
                                "border-blue-500/30 bg-blue-500/10 text-blue-500"
                              )}>
                                {key.environment}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={key.is_active ? "success" : "destructive"} className="gap-1">
                                {key.is_active ? <><CheckCircle2 className="h-3 w-3" /> Active</> : <><AlertCircle className="h-3 w-3" /> Inactive</>}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <p>{key.rate_limit_per_minute}/min</p>
                                <p className="text-muted-foreground">{key.usage_limit_per_day}/day</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={usage} className="w-16" />
                                <span className="text-xs text-muted-foreground">{usage}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {key.last_used_at ? format(new Date(key.last_used_at), "MMM d, h:mm a") : "Never"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setEditingKey(key); setShowCreateDialog(true); }}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => copyToClipboard(key.api_key)}>
                                    <Copy className="mr-2 h-4 w-4" /> Copy Key
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => toggleKeyStatus.mutate({ id: key.id, is_active: !key.is_active })}>
                                    {key.is_active ? <><Lock className="mr-2 h-4 w-4" /> Deactivate</> : <><Globe className="mr-2 h-4 w-4" /> Activate</>}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => {
                                    if (confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
                                      deleteKeyMutation.mutate(key.id);
                                    }
                                  }}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROVIDERS TAB */}
        <TabsContent value="providers">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </TabsContent>

        {/* LIVE USAGE LOGS TAB */}
        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Live Usage Logs
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    </span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Real-time API stream (simulated per second)
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] rounded-lg border border-gray-100">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveUsageLogs.slice(0, 100).map((log) => (
                      <TableRow key={log.id} className="group transition-all duration-150 hover:bg-blue-50/50 hover:shadow-sm hover:-translate-y-0.5">
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {format(new Date(log.created_at), "h:mm:ss a")}
                        </TableCell>
                        <TableCell className="font-medium group-hover:text-blue-600 transition-colors">
                          {log.model}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{log.request_type}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {log.tokens_used.toLocaleString()}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatCurrency(log.cost_usd)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {log.latency_ms ? `${log.latency_ms}ms` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status_code >= 200 && log.status_code < 300 ? "success" : "destructive"} className="gap-1">
                            {log.status_code >= 200 && log.status_code < 300 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {log.status_code}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {liveUsageLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          Waiting for live stream...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Page Header
// ============================================================================

function PageHeader({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Key className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Management</h1>
          <p className="text-sm text-muted-foreground">Manage LLM provider API keys and monitor usage</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live
        </Badge>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Stat Card
// ============================================================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  color: "primary" | "purple" | "yellow" | "green" | "blue" | "red";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    purple: "bg-purple-500/10 text-purple-500",
    yellow: "bg-yellow-500/10 text-yellow-500",
    green: "bg-green-500/10 text-green-500",
    blue: "bg-blue-500/10 text-blue-500",
    red: "bg-red-500/10 text-red-500",
  };

  return (
    <Card className="transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", colors[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Provider Card
// ============================================================================

function ProviderCard({ provider }: { provider: ApiProvider }) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-2xl">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex h-36 w-36 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <ProviderImage name={provider.name} label="Provider logo" className="h-36 w-36" />
          </div>
          <Badge variant={provider.is_active ? "success" : "secondary"} className="shadow-sm">
            {provider.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>

        <p className="mt-5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{provider.description}</p>
        <Separator className="my-4" />
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Default Model</span>
          <span className="rounded bg-muted px-2 py-0.5 font-mono font-medium">{provider.default_model}</span>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Base URL</span>
          <span className="max-w-[150px] truncate font-mono text-xs text-muted-foreground" title={provider.base_url}>
            {provider.base_url}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// API Key Form
// ============================================================================

function ApiKeyForm({
  providers,
  editingKey,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  providers: ApiProvider[];
  editingKey: ApiKey | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    provider_id: editingKey?.provider_id || providers[0]?.id || "",
    name: editingKey?.name || "",
    api_key: editingKey?.api_key || "",
    environment: editingKey?.environment || "production",
    is_active: editingKey?.is_active ?? true,
    rate_limit_per_minute: editingKey?.rate_limit_per_minute || 60,
    usage_limit_per_day: editingKey?.usage_limit_per_day || 10000,
    expires_at: editingKey?.expires_at || "",
  });

  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Key Name</Label>
          <Input
            id="name"
            placeholder="e.g. Production OpenAI"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select
            value={formData.provider_id}
            onValueChange={(value) => setFormData({ ...formData, provider_id: value })}
          >
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="api_key">API Key</Label>
        <div className="relative">
          <Input
            id="api_key"
            type={showKey ? "text" : "password"}
            placeholder="sk-..."
            value={formData.api_key}
            onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
            required
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="environment">Environment</Label>
          <Select
            value={formData.environment}
            onValueChange={(value: any) => setFormData({ ...formData, environment: value })}
          >
            <SelectTrigger id="environment">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="development">Development</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expires_at">Expires At (Optional)</Label>
          <Input
            id="expires_at"
            type="date"
            value={formData.expires_at ? formData.expires_at.split("T")[0] : ""}
            onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rate_limit">Rate Limit / Min</Label>
          <Input
            id="rate_limit"
            type="number"
            value={formData.rate_limit_per_minute}
            onChange={(e) => setFormData({ ...formData, rate_limit_per_minute: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="usage_limit">Usage Limit / Day</Label>
          <Input
            id="usage_limit"
            type="number"
            value={formData.usage_limit_per_day}
            onChange={(e) => setFormData({ ...formData, usage_limit_per_day: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="is_active">Active Status</Label>
          <p className="text-xs text-muted-foreground">Enable or disable this API key</p>
        </div>
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingKey ? "Save Changes" : "Create Key"}
        </Button>
      </DialogFooter>
    </form>
  );
}