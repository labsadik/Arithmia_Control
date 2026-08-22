import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to Supabase Realtime changes on a table and invalidates the
 * given React Query key whenever a row is inserted, updated, or deleted.
 */
export function useRealtimeTable(table: string, queryKey: string[]) {
  const queryClient = useQueryClient();
  const keyFingerprint = queryKey.join("|");

  useEffect(() => {
    const channel = supabase
      .channel(`public:${table}:${keyFingerprint}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, keyFingerprint, queryClient]);
}
