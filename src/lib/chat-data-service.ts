// lib/chat-data-service.ts
import { supabase } from "@/lib/supabase"; // adjust to your supabase client path

export async function fetchSystemSummary() {
  const [agentsRes, usageLogsRes, approvalsRes] = await Promise.all([
    supabase.from("agents").select("status, tokens_used, cost_usd"),
    supabase.from("api_usage_logs").select("tokens_used, cost_usd"),
    supabase.from("approvals").select("id").eq("status", "pending"),
  ]);

  const agents = agentsRes.data || [];
  const usageLogs = usageLogsRes.data || [];
  const pendingApprovals = approvalsRes.data?.length || 0;

  const totalCost = agents.reduce((acc, curr) => acc + Number(curr.cost_usd || 0), 0);
  const totalTokens = agents.reduce((acc, curr) => acc + Number(curr.tokens_used || 0), 0);
  const activeAgents = agents.filter((a) => a.status === "running").length;

  return {
    activeAgents,
    totalAgents: agents.length,
    totalCost: totalCost.toFixed(2),
    totalTokens: totalTokens.toLocaleString(),
    pendingApprovals,
  };
}