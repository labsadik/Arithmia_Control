export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };

  public: {
    Tables: {
<<<<<<< HEAD
      agents: {
        Row: {
          id: string;
          name: string;
          model: string;
          status: "running" | "idle" | "paused" | "error";
          environment: "production" | "staging";
          tasks_completed: number;
          success_rate: number;
          tokens_used: number;
          cost_usd: number;
          last_active_at: string;
          created_at: string;
          updated_at: string;
        };

        Insert: {
          id?: string;
          name: string;
          model?: string;
          status?: "running" | "idle" | "paused" | "error";
          environment?: "production" | "staging";
          tasks_completed?: number;
          success_rate?: number;
          tokens_used?: number;
          cost_usd?: number;
          last_active_at?: string;
          created_at?: string;
          updated_at?: string;
        };

        Update: {
          id?: string;
          name?: string;
          model?: string;
          status?: "running" | "idle" | "paused" | "error";
          environment?: "production" | "staging";
          tasks_completed?: number;
          success_rate?: number;
          tokens_used?: number;
          cost_usd?: number;
          last_active_at?: string;
          created_at?: string;
          updated_at?: string;
        };

        Relationships: [];
      };

      approvals: {
        Row: {
          id: string;
          agent_id: string | null;
          agent_name: string;
          action_type: string;
          title: string;
          description: string | null;
          risk_level: "low" | "high" | "critical";
          status: "pending" | "approved" | "rejected";
          payload: Json;
          requested_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };

        Insert: {
          id?: string;
          agent_id?: string | null;
          agent_name: string;
          action_type: string;
          title: string;
          description?: string | null;
          risk_level?: "low" | "high" | "critical";
          status?: "pending" | "approved" | "rejected";
          payload?: Json;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };

        Update: {
          id?: string;
          agent_id?: string | null;
          agent_name?: string;
          action_type?: string;
          title?: string;
          description?: string | null;
          risk_level?: "low" | "high" | "critical";
          status?: "pending" | "approved" | "rejected";
          payload?: Json;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };

        Relationships: [
          {
            foreignKeyName: "approvals_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };

      activity_events: {
        Row: {
          id: string;
          agent_name: string;
          status: "running" | "completed" | "action_required" | "failed";
          message: string;
          created_at: string;
        };

        Insert: {
          id?: string;
          agent_name: string;
          status?: "running" | "completed" | "action_required" | "failed";
          message: string;
          created_at?: string;
        };

        Update: {
          id?: string;
          agent_name?: string;
          status?: "running" | "completed" | "action_required" | "failed";
          message?: string;
          created_at?: string;
        };

        Relationships: [];
      };

      workspace_settings: {
        Row: {
          id: string;

          workspace_name: string;
          timezone: string;

          require_approval: boolean;
          auto_approve_low_risk: boolean;
          low_risk_threshold: number;
          critical_risk_threshold: number;

          email_notifications: boolean;
          slack_notifications: boolean;
          failure_alerts: boolean;
          daily_summary: boolean;

          require_authentication: boolean;
          protect_api_keys: boolean;
          restrict_external_access: boolean;

          created_at: string;
          updated_at: string;
        };

        Insert: {
          id?: string;

          workspace_name?: string;
          timezone?: string;

          require_approval?: boolean;
          auto_approve_low_risk?: boolean;
          low_risk_threshold?: number;
          critical_risk_threshold?: number;

          email_notifications?: boolean;
          slack_notifications?: boolean;
          failure_alerts?: boolean;
          daily_summary?: boolean;

          require_authentication?: boolean;
          protect_api_keys?: boolean;
          restrict_external_access?: boolean;

          created_at?: string;
          updated_at?: string;
        };

        Update: {
          id?: string;

          workspace_name?: string;
          timezone?: string;

          require_approval?: boolean;
          auto_approve_low_risk?: boolean;
          low_risk_threshold?: number;
          critical_risk_threshold?: number;

          email_notifications?: boolean;
          slack_notifications?: boolean;
          failure_alerts?: boolean;
          daily_summary?: boolean;

          require_authentication?: boolean;
          protect_api_keys?: boolean;
          restrict_external_access?: boolean;

          created_at?: string;
          updated_at?: string;
        };

        Relationships: [];
      };
    };

=======
      activity_events: {
        Row: {
          agent_name: string
          created_at: string
          id: string
          message: string
          status: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          id?: string
          message: string
          status?: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          cost_usd: number
          created_at: string
          environment: string
          id: string
          last_active_at: string
          model: string
          name: string
          status: string
          success_rate: number
          tasks_completed: number
          tokens_used: number
          updated_at: string
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          environment?: string
          id?: string
          last_active_at?: string
          model?: string
          name: string
          status?: string
          success_rate?: number
          tasks_completed?: number
          tokens_used?: number
          updated_at?: string
        }
        Update: {
          cost_usd?: number
          created_at?: string
          environment?: string
          id?: string
          last_active_at?: string
          model?: string
          name?: string
          status?: string
          success_rate?: number
          tasks_completed?: number
          tokens_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      approvals: {
        Row: {
          action_type: string
          agent_id: string | null
          agent_name: string
          created_at: string
          description: string | null
          id: string
          payload: Json
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          risk_level: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          agent_id?: string | null
          agent_name: string
          created_at?: string
          description?: string | null
          id?: string
          payload?: Json
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          agent_id?: string | null
          agent_name?: string
          created_at?: string
          description?: string | null
          id?: string
          payload?: Json
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
>>>>>>> 04fca09acba815cc267434882d91a334a589231c
    Views: {
      [_ in never]: never;
    };

    Functions: {
      [_ in never]: never;
    };

    Enums: {
      [_ in never]: never;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema =
  DatabaseWithoutInternals[
    Extract<keyof Database, "public">
  ];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },

  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (
        DatabaseWithoutInternals[
          DefaultSchemaTableNameOrOptions["schema"]
        ]["Tables"] &
          DatabaseWithoutInternals[
            DefaultSchemaTableNameOrOptions["schema"]
          ]["Views"]
      )
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (
      DatabaseWithoutInternals[
        DefaultSchemaTableNameOrOptions["schema"]
      ]["Tables"] &
        DatabaseWithoutInternals[
          DefaultSchemaTableNameOrOptions["schema"]
        ]["Views"]
    )[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (
        DefaultSchema["Tables"] &
          DefaultSchema["Views"]
      )
    ? (
        DefaultSchema["Tables"] &
          DefaultSchema["Views"]
      )[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },

  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[
        DefaultSchemaTableNameOrOptions["schema"]
      ]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[
      DefaultSchemaTableNameOrOptions["schema"]
    ]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][
        DefaultSchemaTableNameOrOptions
      ] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },

  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[
        DefaultSchemaTableNameOrOptions["schema"]
      ]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[
      DefaultSchemaTableNameOrOptions["schema"]
    ]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][
        DefaultSchemaTableNameOrOptions
      ] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },

  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[
        DefaultSchemaEnumNameOrOptions["schema"]
      ]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[
      DefaultSchemaEnumNameOrOptions["schema"]
    ]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },

  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[
        PublicCompositeTypeNameOrOptions["schema"]
      ]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[
      PublicCompositeTypeNameOrOptions["schema"]
    ]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][
        PublicCompositeTypeNameOrOptions
      ]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;