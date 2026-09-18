/**
 * Supabase database types.
 * Regenerate with: npx supabase gen types typescript --local > src/types/database.ts
 * CI (db-tests job) fails if this file drifts from the migrations.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      alias_blocklist: {
        Row: {
          id: string;
          pattern: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pattern: string;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pattern?: string;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: number;
          actor_id: string | null;
          actor_role: string;
          action: string;
          target_table: string | null;
          target_id: string | null;
          diff: Json | null;
          ip_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          actor_id?: string | null;
          actor_role: string;
          action: string;
          target_table?: string | null;
          target_id?: string | null;
          diff?: Json | null;
          ip_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          actor_id?: string | null;
          actor_role?: string;
          action?: string;
          target_table?: string | null;
          target_id?: string | null;
          diff?: Json | null;
          ip_hash?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      avatars: {
        Row: {
          id: string;
          slug: string;
          image_path: string;
          alt_text: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          image_path: string;
          alt_text: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          image_path?: string;
          alt_text?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      data_requests: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          status: string;
          requested_at: string;
          completed_at: string | null;
          file_path: string | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          status?: string;
          requested_at?: string;
          completed_at?: string | null;
          file_path?: string | null;
          note?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          status?: string;
          requested_at?: string;
          completed_at?: string | null;
          file_path?: string | null;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "data_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_flags: {
        Row: {
          key: string;
          enabled: boolean;
          is_public: boolean;
          payload: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          enabled?: boolean;
          is_public?: boolean;
          payload?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          enabled?: boolean;
          is_public?: boolean;
          payload?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_flags_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          alias: string | null;
          alias_normalized: string | null;
          avatar_id: string | null;
          country: string | null;
          birth_date: string | null;
          gender: string | null;
          sql_level: string | null;
          main_goal: string | null;
          weekly_goal_minutes: number | null;
          certificate_name: string | null;
          timezone: string;
          role: string;
          terms_accepted_at: string | null;
          terms_version: string | null;
          privacy_accepted_at: string | null;
          privacy_version: string | null;
          onboarding_completed_at: string | null;
          leaderboard_opt_in: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          alias?: string | null;
          alias_normalized?: string | null;
          avatar_id?: string | null;
          country?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          sql_level?: string | null;
          main_goal?: string | null;
          weekly_goal_minutes?: number | null;
          certificate_name?: string | null;
          timezone?: string;
          role?: string;
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          privacy_accepted_at?: string | null;
          privacy_version?: string | null;
          onboarding_completed_at?: string | null;
          leaderboard_opt_in?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          alias?: string | null;
          alias_normalized?: string | null;
          avatar_id?: string | null;
          country?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          sql_level?: string | null;
          main_goal?: string | null;
          weekly_goal_minutes?: number | null;
          certificate_name?: string | null;
          timezone?: string;
          role?: string;
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          privacy_accepted_at?: string | null;
          privacy_version?: string | null;
          onboarding_completed_at?: string | null;
          leaderboard_opt_in?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_id_fkey";
            columns: ["avatar_id"];
            isOneToOne: false;
            referencedRelation: "avatars";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: { key: string; tokens: number; refilled_at: string };
        Insert: { key: string; tokens: number; refilled_at?: string };
        Update: { key?: string; tokens?: number; refilled_at?: string };
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string | null;
          alias: string | null;
          avatar_path: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      check_alias_available: { Args: { candidate: string }; Returns: boolean };
      complete_onboarding: {
        Args: { payload: Json };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      consume_rate_limit: {
        Args: {
          p_key: string;
          p_capacity: number;
          p_refill_per_second: number;
          p_cost?: number;
        };
        Returns: boolean;
      };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      normalize_alias: { Args: { input: string }; Returns: string };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Profile = Tables<"profiles">;
export type Avatar = Tables<"avatars">;
