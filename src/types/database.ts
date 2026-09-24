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
      analytics_events: {
        Row: {
          id: number;
          user_id: string | null;
          anonymous_id: string | null;
          name: string;
          properties: Json;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id?: string | null;
          anonymous_id?: string | null;
          name: string;
          properties?: Json;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: string | null;
          anonymous_id?: string | null;
          name?: string;
          properties?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      attempts: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          sql: string;
          status: string;
          feedback: Json;
          execution_ms: number | null;
          row_count: number | null;
          is_genuine: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          sql: string;
          status: string;
          feedback?: Json;
          execution_ms?: number | null;
          row_count?: number | null;
          is_genuine?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string;
          sql?: string;
          status?: string;
          feedback?: Json;
          execution_ms?: number | null;
          row_count?: number | null;
          is_genuine?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      badges: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          icon: string;
          criteria: Json;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description: string;
          icon: string;
          criteria: Json;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          icon?: string;
          criteria?: Json;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      certificate_requirements: {
        Row: {
          id: string;
          slug: string;
          title: string;
          skills: string[];
          rules: Json;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          skills?: string[];
          rules: Json;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          skills?: string[];
          rules?: Json;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          id: string;
          public_id: string;
          verification_code: string;
          user_id: string;
          requirement_id: string;
          recipient_name: string;
          issued_at: string;
          revoked_at: string | null;
          revoked_reason: string | null;
        };
        Insert: {
          id?: string;
          public_id: string;
          verification_code: string;
          user_id: string;
          requirement_id: string;
          recipient_name: string;
          issued_at?: string;
          revoked_at?: string | null;
          revoked_reason?: string | null;
        };
        Update: {
          id?: string;
          public_id?: string;
          verification_code?: string;
          user_id?: string;
          requirement_id?: string;
          recipient_name?: string;
          issued_at?: string;
          revoked_at?: string | null;
          revoked_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_requirement_id_fkey";
            columns: ["requirement_id"];
            isOneToOne: false;
            referencedRelation: "certificate_requirements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          sort_order: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description: string;
          sort_order?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          sort_order?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_activity: {
        Row: {
          user_id: string;
          activity_date: string;
          xp_earned: number;
          minutes_active: number;
          exercises_completed: number;
          last_touch_at: string;
        };
        Insert: {
          user_id: string;
          activity_date: string;
          xp_earned?: number;
          minutes_active?: number;
          exercises_completed?: number;
          last_touch_at?: string;
        };
        Update: {
          user_id?: string;
          activity_date?: string;
          xp_earned?: number;
          minutes_active?: number;
          exercises_completed?: number;
          last_touch_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_activity_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      dataset_columns: {
        Row: {
          id: string;
          table_id: string;
          name: string;
          data_type: string;
          description: string;
          is_pk: boolean;
          fk_ref: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          table_id: string;
          name: string;
          data_type: string;
          description: string;
          is_pk?: boolean;
          fk_ref?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          table_id?: string;
          name?: string;
          data_type?: string;
          description?: string;
          is_pk?: boolean;
          fk_ref?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "dataset_columns_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "dataset_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      dataset_tables: {
        Row: {
          id: string;
          dataset_id: string;
          name: string;
          description: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          dataset_id: string;
          name: string;
          description: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          dataset_id?: string;
          name?: string;
          description?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "dataset_tables_dataset_id_fkey";
            columns: ["dataset_id"];
            isOneToOne: false;
            referencedRelation: "datasets";
            referencedColumns: ["id"];
          },
        ];
      };
      datasets: {
        Row: {
          id: string;
          slug: string;
          version: number;
          title: string;
          domain: string;
          description: string;
          snapshot_path: string | null;
          snapshot_sha256: string | null;
          row_counts: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          version?: number;
          title: string;
          domain: string;
          description: string;
          snapshot_path?: string | null;
          snapshot_sha256?: string | null;
          row_counts?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          version?: number;
          title?: string;
          domain?: string;
          description?: string;
          snapshot_path?: string | null;
          snapshot_sha256?: string | null;
          row_counts?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          source_id: string | null;
          scope: string;
          starts_at: string;
          ends_at: string | null;
          revoked_at: string | null;
          revoked_reason: string | null;
          acknowledged_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: string;
          source_id?: string | null;
          scope?: string;
          starts_at?: string;
          ends_at?: string | null;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          acknowledged_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: string;
          source_id?: string | null;
          scope?: string;
          starts_at?: string;
          ends_at?: string | null;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          acknowledged_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entitlements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entitlements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_expected_results: {
        Row: {
          exercise_id: string;
          dataset_version: number;
          columns: Json;
          rows: Json;
          row_count: number;
          computed_at: string;
        };
        Insert: {
          exercise_id: string;
          dataset_version: number;
          columns: Json;
          rows: Json;
          row_count: number;
          computed_at?: string;
        };
        Update: {
          exercise_id?: string;
          dataset_version?: number;
          columns?: Json;
          rows?: Json;
          row_count?: number;
          computed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_expected_results_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: true;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_hints: {
        Row: {
          id: string;
          exercise_id: string;
          level: number;
          body_md: string;
          coin_cost: number;
          xp_penalty_percent: number;
        };
        Insert: {
          id?: string;
          exercise_id: string;
          level: number;
          body_md: string;
          coin_cost?: number;
          xp_penalty_percent?: number;
        };
        Update: {
          id?: string;
          exercise_id?: string;
          level?: number;
          body_md?: string;
          coin_cost?: number;
          xp_penalty_percent?: number;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_hints_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_prerequisites: {
        Row: {
          exercise_id: string;
          requires_exercise_id: string;
        };
        Insert: {
          exercise_id: string;
          requires_exercise_id: string;
        };
        Update: {
          exercise_id?: string;
          requires_exercise_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_prerequisites_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercise_prerequisites_requires_exercise_id_fkey";
            columns: ["requires_exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_progress: {
        Row: {
          user_id: string;
          exercise_id: string;
          status: string;
          started_at: string;
          first_completed_at: string | null;
          attempts_count: number;
          genuine_attempts_count: number;
          hints_used: number;
          solution_revealed_at: string | null;
          best_attempt_id: string | null;
          draft_sql: string | null;
          draft_saved_at: string | null;
          last_activity_at: string;
        };
        Insert: {
          user_id: string;
          exercise_id: string;
          status?: string;
          started_at?: string;
          first_completed_at?: string | null;
          attempts_count?: number;
          genuine_attempts_count?: number;
          hints_used?: number;
          solution_revealed_at?: string | null;
          best_attempt_id?: string | null;
          draft_sql?: string | null;
          draft_saved_at?: string | null;
          last_activity_at?: string;
        };
        Update: {
          user_id?: string;
          exercise_id?: string;
          status?: string;
          started_at?: string;
          first_completed_at?: string | null;
          attempts_count?: number;
          genuine_attempts_count?: number;
          hints_used?: number;
          solution_revealed_at?: string | null;
          best_attempt_id?: string | null;
          draft_sql?: string | null;
          draft_saved_at?: string | null;
          last_activity_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_progress_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercise_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_solutions: {
        Row: {
          id: string;
          exercise_id: string;
          sql: string;
          is_reference: boolean;
          approach_label: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          exercise_id: string;
          sql: string;
          is_reference?: boolean;
          approach_label?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          exercise_id?: string;
          sql?: string;
          is_reference?: boolean;
          approach_label?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_solutions_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          lesson_id: string | null;
          section_id: string;
          slug: string;
          title: string;
          scenario_md: string;
          business_question_md: string;
          learning_objective: string;
          difficulty: string;
          estimated_minutes: number;
          concepts: string[];
          tables_used: string[];
          dataset_id: string;
          dataset_version: number;
          theory_ref_slug: string | null;
          allowed_statements: string[];
          expected_columns: Json;
          validation_rules: Json;
          common_mistakes: Json;
          expert_explanation_md: string;
          improvement_feedback: Json;
          reward_config: Json;
          solution_unlock: Json;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id?: string | null;
          section_id: string;
          slug: string;
          title: string;
          scenario_md: string;
          business_question_md: string;
          learning_objective: string;
          difficulty: string;
          estimated_minutes?: number;
          concepts?: string[];
          tables_used?: string[];
          dataset_id: string;
          dataset_version?: number;
          theory_ref_slug?: string | null;
          allowed_statements?: string[];
          expected_columns?: Json;
          validation_rules?: Json;
          common_mistakes?: Json;
          expert_explanation_md: string;
          improvement_feedback?: Json;
          reward_config?: Json;
          solution_unlock?: Json;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string | null;
          section_id?: string;
          slug?: string;
          title?: string;
          scenario_md?: string;
          business_question_md?: string;
          learning_objective?: string;
          difficulty?: string;
          estimated_minutes?: number;
          concepts?: string[];
          tables_used?: string[];
          dataset_id?: string;
          dataset_version?: number;
          theory_ref_slug?: string | null;
          allowed_statements?: string[];
          expected_columns?: Json;
          validation_rules?: Json;
          common_mistakes?: Json;
          expert_explanation_md?: string;
          improvement_feedback?: Json;
          reward_config?: Json;
          solution_unlock?: Json;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_dataset_id_fkey";
            columns: ["dataset_id"];
            isOneToOne: false;
            referencedRelation: "datasets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercises_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: true;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercises_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
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
      hint_usage: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          hint_level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          hint_level: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string;
          hint_level?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hint_usage_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hint_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_goals: {
        Row: {
          user_id: string;
          daily_xp_target: number;
          weekly_minutes_target: number;
          reminder_opt_in: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          daily_xp_target?: number;
          weekly_minutes_target?: number;
          reminder_opt_in?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          daily_xp_target?: number;
          weekly_minutes_target?: number;
          reminder_opt_in?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_prerequisites: {
        Row: {
          lesson_id: string;
          requires_lesson_id: string;
        };
        Insert: {
          lesson_id: string;
          requires_lesson_id: string;
        };
        Update: {
          lesson_id?: string;
          requires_lesson_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_prerequisites_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_prerequisites_requires_lesson_id_fkey";
            columns: ["requires_lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_progress: {
        Row: {
          user_id: string;
          lesson_id: string;
          status: string;
          completed_at: string | null;
          last_viewed_at: string;
        };
        Insert: {
          user_id: string;
          lesson_id: string;
          status?: string;
          completed_at?: string | null;
          last_viewed_at?: string;
        };
        Update: {
          user_id?: string;
          lesson_id?: string;
          status?: string;
          completed_at?: string | null;
          last_viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          section_id: string;
          slug: string;
          kind: string;
          title: string;
          sort_order: number;
          estimated_minutes: number;
          body_md: string | null;
          ref_slug: string | null;
          dataset_id: string | null;
          is_free: boolean;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          slug: string;
          kind: string;
          title: string;
          sort_order?: number;
          estimated_minutes?: number;
          body_md?: string | null;
          ref_slug?: string | null;
          dataset_id?: string | null;
          is_free?: boolean;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          section_id?: string;
          slug?: string;
          kind?: string;
          title?: string;
          sort_order?: number;
          estimated_minutes?: number;
          body_md?: string | null;
          ref_slug?: string | null;
          dataset_id?: string | null;
          is_free?: boolean;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_dataset_id_fkey";
            columns: ["dataset_id"];
            isOneToOne: false;
            referencedRelation: "datasets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_events: {
        Row: {
          id: string;
          provider: string;
          provider_event_id: string;
          event_type: string;
          payload: Json;
          signature_valid: boolean;
          processed_at: string | null;
          processing_error: string | null;
          received_at: string;
          payment_ref: string | null;
          status: string | null;
          amount_minor: number | null;
          currency: string | null;
          reconciled_at: string | null;
        };
        Insert: {
          id?: string;
          provider: string;
          provider_event_id: string;
          event_type: string;
          payload?: Json;
          signature_valid?: boolean;
          processed_at?: string | null;
          processing_error?: string | null;
          received_at?: string;
          payment_ref?: string | null;
          status?: string | null;
          amount_minor?: number | null;
          currency?: string | null;
          reconciled_at?: string | null;
        };
        Update: {
          id?: string;
          provider?: string;
          provider_event_id?: string;
          event_type?: string;
          payload?: Json;
          signature_valid?: boolean;
          processed_at?: string | null;
          processing_error?: string | null;
          received_at?: string;
          payment_ref?: string | null;
          status?: string | null;
          amount_minor?: number | null;
          currency?: string | null;
          reconciled_at?: string | null;
        };
        Relationships: [];
      };
      prices: {
        Row: {
          id: string;
          product_id: string;
          provider: string;
          provider_price_ref: string | null;
          currency: string;
          amount_minor: number;
          country: string | null;
          interval: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          provider: string;
          provider_price_ref?: string | null;
          currency: string;
          amount_minor: number;
          country?: string | null;
          interval?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          provider?: string;
          provider_price_ref?: string | null;
          currency?: string;
          amount_minor?: number;
          country?: string | null;
          interval?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          kind: string;
          title: string;
          description: string;
          access_days: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          kind: string;
          title: string;
          description: string;
          access_days?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          kind?: string;
          title?: string;
          description?: string;
          access_days?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          leaderboard_opt_in_at: string | null;
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
          leaderboard_opt_in_at?: string | null;
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
          leaderboard_opt_in_at?: string | null;
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
      promo_codes: {
        Row: {
          id: string;
          code: string;
          kind: string;
          access_days: number | null;
          discount_percent: number | null;
          max_redemptions: number | null;
          redemptions_count: number;
          expires_at: string | null;
          is_active: boolean;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          kind: string;
          access_days?: number | null;
          discount_percent?: number | null;
          max_redemptions?: number | null;
          redemptions_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          kind?: string;
          access_days?: number | null;
          discount_percent?: number | null;
          max_redemptions?: number | null;
          redemptions_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      promo_redemptions: {
        Row: {
          id: string;
          promo_code_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          promo_code_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          promo_code_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey";
            columns: ["promo_code_id"];
            isOneToOne: false;
            referencedRelation: "promo_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promo_redemptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          price_id: string;
          provider: string;
          provider_payment_id: string | null;
          reference_code: string | null;
          channel: string | null;
          status: string;
          amount_minor: number;
          currency: string;
          note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          price_id: string;
          provider: string;
          provider_payment_id?: string | null;
          reference_code?: string | null;
          channel?: string | null;
          status?: string;
          amount_minor: number;
          currency: string;
          note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          price_id?: string;
          provider?: string;
          provider_payment_id?: string | null;
          reference_code?: string | null;
          channel?: string | null;
          status?: string;
          amount_minor?: number;
          currency?: string;
          note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "prices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      query_executions: {
        Row: {
          id: number;
          attempt_id: string | null;
          user_id: string | null;
          dataset_slug: string;
          engine: string;
          sql_sha256: string;
          sql_length: number;
          duration_ms: number | null;
          status: string;
          sqlstate: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          attempt_id?: string | null;
          user_id?: string | null;
          dataset_slug: string;
          engine: string;
          sql_sha256: string;
          sql_length: number;
          duration_ms?: number | null;
          status: string;
          sqlstate?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          attempt_id?: string | null;
          user_id?: string | null;
          dataset_slug?: string;
          engine?: string;
          sql_sha256?: string;
          sql_length?: number;
          duration_ms?: number | null;
          status?: string;
          sqlstate?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "query_executions_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "query_executions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      question_options: {
        Row: {
          id: string;
          question_id: string;
          key: string;
          body_md: string;
          is_correct: boolean;
          why_incorrect_md: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          question_id: string;
          key: string;
          body_md: string;
          is_correct?: boolean;
          why_incorrect_md?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          question_id?: string;
          key?: string;
          body_md?: string;
          is_correct?: boolean;
          why_incorrect_md?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "theory_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_answers: {
        Row: {
          id: string;
          quiz_attempt_id: string;
          user_id: string;
          question_id: string;
          answer: Json;
          is_correct: boolean;
          answered_at: string;
        };
        Insert: {
          id?: string;
          quiz_attempt_id: string;
          user_id: string;
          question_id: string;
          answer: Json;
          is_correct: boolean;
          answered_at?: string;
        };
        Update: {
          id?: string;
          quiz_attempt_id?: string;
          user_id?: string;
          question_id?: string;
          answer?: Json;
          is_correct?: boolean;
          answered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "theory_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_answers_quiz_attempt_id_fkey";
            columns: ["quiz_attempt_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_answers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          section_id: string;
          score: number;
          total: number;
          passed: boolean;
          status: string;
          question_ids: string[];
          started_at: string;
          submitted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          section_id: string;
          score?: number;
          total?: number;
          passed?: boolean;
          status?: string;
          question_ids?: string[];
          started_at?: string;
          submitted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          section_id?: string;
          score?: number;
          total?: number;
          passed?: boolean;
          status?: string;
          question_ids?: string[];
          started_at?: string;
          submitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
      reward_ledger: {
        Row: {
          id: string;
          user_id: string;
          event_key: string;
          source: string;
          xp_delta: number;
          coin_delta: number;
          metadata: Json;
          activity_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_key: string;
          source: string;
          xp_delta?: number;
          coin_delta?: number;
          metadata?: Json;
          activity_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_key?: string;
          source?: string;
          xp_delta?: number;
          coin_delta?: number;
          metadata?: Json;
          activity_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reward_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_queries: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string | null;
          dataset_slug: string;
          title: string;
          sql: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id?: string | null;
          dataset_slug: string;
          title: string;
          sql: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string | null;
          dataset_slug?: string;
          title?: string;
          sql?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_queries_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_queries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      section_progress: {
        Row: {
          user_id: string;
          section_id: string;
          completed_at: string;
        };
        Insert: {
          user_id: string;
          section_id: string;
          completed_at?: string;
        };
        Update: {
          user_id?: string;
          section_id?: string;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "section_progress_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "section_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sections: {
        Row: {
          id: string;
          course_id: string;
          slug: string;
          number: number;
          level: string;
          title: string;
          summary: string;
          objectives: Json;
          requires_section_id: string | null;
          is_free_theory: boolean;
          is_published: boolean;
          certificate_slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          slug: string;
          number: number;
          level: string;
          title: string;
          summary: string;
          objectives?: Json;
          requires_section_id?: string | null;
          is_free_theory?: boolean;
          is_published?: boolean;
          certificate_slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          slug?: string;
          number?: number;
          level?: string;
          title?: string;
          summary?: string;
          objectives?: Json;
          requires_section_id?: string | null;
          is_free_theory?: boolean;
          is_published?: boolean;
          certificate_slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sections_requires_section_id_fkey";
            columns: ["requires_section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
      solution_reveals: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string;
          reason?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "solution_reveals_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solution_reveals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      streak_freezes: {
        Row: {
          id: string;
          user_id: string;
          used_on: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          used_on: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          used_on?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "streak_freezes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      streaks: {
        Row: {
          user_id: string;
          current_length: number;
          longest_length: number;
          last_activity_date: string | null;
          freezes_available: number;
          freezes_refilled_month: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          current_length?: number;
          longest_length?: number;
          last_activity_date?: string | null;
          freezes_available?: number;
          freezes_refilled_month?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          current_length?: number;
          longest_length?: number;
          last_activity_date?: string | null;
          freezes_available?: number;
          freezes_refilled_month?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          price_id: string;
          provider: string;
          provider_subscription_id: string | null;
          status: string;
          current_period_end: string | null;
          cancel_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          price_id: string;
          provider: string;
          provider_subscription_id?: string | null;
          status: string;
          current_period_end?: string | null;
          cancel_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          price_id?: string;
          provider?: string;
          provider_subscription_id?: string | null;
          status?: string;
          current_period_end?: string | null;
          cancel_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "prices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      suspicious_activity: {
        Row: {
          id: string;
          user_id: string | null;
          kind: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          kind: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          kind?: string;
          details?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suspicious_activity_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      theory_questions: {
        Row: {
          id: string;
          section_id: string;
          lesson_id: string | null;
          slug: string;
          type: string;
          difficulty: string;
          topic: string;
          prompt_md: string;
          code_md: string | null;
          explanation_md: string;
          answer: Json | null;
          pairs: Json | null;
          tags: string[];
          estimated_seconds: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          lesson_id?: string | null;
          slug: string;
          type: string;
          difficulty: string;
          topic: string;
          prompt_md: string;
          code_md?: string | null;
          explanation_md: string;
          answer?: Json | null;
          pairs?: Json | null;
          tags?: string[];
          estimated_seconds?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          section_id?: string;
          lesson_id?: string | null;
          slug?: string;
          type?: string;
          difficulty?: string;
          topic?: string;
          prompt_md?: string;
          code_md?: string | null;
          explanation_md?: string;
          answer?: Json | null;
          pairs?: Json | null;
          tags?: string[];
          estimated_seconds?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "theory_questions_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "theory_questions_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
      user_badges: {
        Row: {
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_badges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_totals: {
        Row: {
          user_id: string;
          xp_total: number;
          coin_balance: number;
          level: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          xp_total?: number;
          coin_balance?: number;
          level?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          xp_total?: number;
          coin_balance?: number;
          level?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_totals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      exercises_public: {
        Row: {
          id: string | null;
          lesson_id: string | null;
          section_id: string | null;
          slug: string | null;
          title: string | null;
          scenario_md: string | null;
          business_question_md: string | null;
          learning_objective: string | null;
          difficulty: string | null;
          estimated_minutes: number | null;
          concepts: string[] | null;
          tables_used: string[] | null;
          dataset_id: string | null;
          dataset_version: number | null;
          theory_ref_slug: string | null;
          allowed_statements: string[] | null;
          expected_columns: Json | null;
          is_published: boolean | null;
        };
        Relationships: [];
      };
      lessons_public: {
        Row: {
          id: string | null;
          section_id: string | null;
          slug: string | null;
          kind: string | null;
          title: string | null;
          sort_order: number | null;
          estimated_minutes: number | null;
          ref_slug: string | null;
          dataset_id: string | null;
          is_free: boolean | null;
          is_published: boolean | null;
          body_md_free: string | null;
        };
        Relationships: [];
      };
      public_profiles: {
        Row: {
          id: string | null;
          alias: string | null;
          avatar_path: string | null;
        };
        Relationships: [];
      };
      question_options_public: {
        Row: {
          id: string | null;
          question_id: string | null;
          key: string | null;
          body_md: string | null;
          sort_order: number | null;
        };
        Relationships: [];
      };
      questions_public: {
        Row: {
          id: string | null;
          section_id: string | null;
          lesson_id: string | null;
          slug: string | null;
          type: string | null;
          difficulty: string | null;
          topic: string | null;
          prompt_md: string | null;
          code_md: string | null;
          tags: string[] | null;
          estimated_seconds: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      lesson_id_for_exercise: { Args: { p_exercise_id: string }; Returns: string | null };
      sync_exercise_lesson_progress: {
        Args: { p_user_id: string; p_exercise_id: string; p_completed: boolean };
        Returns: string | null;
      };
      backfill_exercise_lesson_progress: { Args: Record<string, never>; Returns: number };
      leaderboards_enabled: { Args: Record<string, never>; Returns: boolean };
      leaderboard: {
        Args: { p_user_id: string; p_period: string; p_limit: number };
        Returns: {
          rank_position: number;
          alias: string;
          avatar_path: string | null;
          level: number;
          xp: number;
          is_self: boolean;
        }[];
      };
      leaderboard_participants: { Args: { p_user_id: string; p_period: string }; Returns: number };
      admin_user_directory: {
        Args: {
          p_search?: string | null;
          p_country?: string | null;
          p_entitlement?: string | null;
          p_include_deleted?: boolean;
          p_sort?: string;
          p_desc?: boolean;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          total_count: number;
          id: string;
          alias: string | null;
          display_name: string | null;
          country: string | null;
          age: number | null;
          created_at: string;
          onboarded: boolean;
          role: string;
          entitlement: string;
          exercises_started: number;
          exercises_completed: number;
          level: number;
          xp_total: number;
          last_activity: string | null;
          is_deleted: boolean;
        }[];
      };
      admin_user_stats: { Args: { p_free_limit: number }; Returns: Json };
      admin_find_user: {
        Args: { p_query: string };
        Returns: {
          id: string;
          alias: string | null;
          display_name: string | null;
          email: string | null;
          role: string;
          country: string | null;
          created_at: string;
          onboarding_completed_at: string | null;
          deleted_at: string | null;
        }[];
      };
      admin_grant_access: {
        Args: {
          p_user_id: string;
          p_kind: string;
          p_access_days: number | null;
          p_actor: string;
          p_reason: string;
          p_price_id?: string | null;
          p_amount_minor?: number | null;
          p_currency?: string | null;
          p_reference?: string | null;
        };
        Returns: string;
      };
      admin_search_learners: {
        Args: { p_query: string; p_limit?: number };
        Returns: {
          id: string;
          alias: string | null;
          display_name: string | null;
          entitlement: string;
          is_deleted: boolean;
        }[];
      };
      admin_audit: {
        Args: {
          p_actor: string;
          p_action: string;
          p_target_table: string | null;
          p_target_id: string | null;
          p_diff: Json;
        };
        Returns: undefined;
      };
      acknowledge_entitlements: { Args: Record<string, never>; Returns: number };
      admin_metrics: { Args: { p_free_limit: number }; Returns: Json };
      create_promo_code: {
        Args: {
          p_code: string;
          p_kind: string;
          p_access_days: number | null;
          p_discount_percent: number | null;
          p_max_redemptions: number | null;
          p_expires_at: string | null;
          p_note: string | null;
          p_actor: string;
        };
        Returns: string;
      };
      reconcile_payment_event: {
        Args: {
          p_event_id: string;
          p_actor: string;
          p_user_id: string;
          p_price_id: string;
          p_reason: string;
        };
        Returns: string;
      };
      set_feature_flag: {
        Args: {
          p_key: string;
          p_enabled: boolean;
          p_is_public: boolean;
          p_actor: string;
          p_reason: string;
        };
        Returns: undefined;
      };
      set_promo_code_active: {
        Args: { p_id: string; p_active: boolean; p_actor: string };
        Returns: undefined;
      };
      apply_payment_event: {
        Args: {
          p_provider: string;
          p_event_id: string;
          p_event_type: string;
          p_payload: Json;
          p_signature_valid: boolean;
          p_payment_ref: string | null;
          p_status: string | null;
          p_amount_minor: number | null;
          p_currency: string | null;
          p_user_id: string | null;
          p_price_id: string | null;
        };
        Returns: string;
      };
      cancel_manual_purchase: { Args: { p_purchase_id: string }; Returns: undefined };
      create_manual_purchase: {
        Args: { p_price_id: string; p_channel: string };
        Returns: {
          purchase_id: string;
          reference_code: string;
          amount_minor: number;
          currency: string;
        }[];
      };
      grant_entitlement: {
        Args: {
          p_user_id: string;
          p_source: string;
          p_source_id: string | null;
          p_access_days: number | null;
          p_created_by: string | null;
          p_reason: string;
        };
        Returns: string;
      };
      redeem_promo: {
        Args: { p_code: string };
        Returns: { kind: string; access_days: number | null; discount_percent: number | null }[];
      };
      review_manual_purchase: {
        Args: {
          p_purchase_id: string;
          p_actor: string | null;
          p_approve: boolean;
          p_note: string | null;
        };
        Returns: undefined;
      };
      revoke_entitlement: {
        Args: { p_entitlement_id: string; p_actor: string | null; p_reason: string };
        Returns: undefined;
      };
      user_id_by_email: { Args: { p_email: string }; Returns: string | null };
      award_reward: {
        Args: {
          p_user_id: string;
          p_event_key: string;
          p_source: string;
          p_xp: number;
          p_coins: number;
          p_metadata: Json;
          p_activity_date: string;
          p_daily_xp_cap: number;
        };
        Returns: {
          awarded: boolean;
          xp_awarded: number;
          coins_awarded: number;
          xp_total: number;
          level: number;
          streak_length: number;
        }[];
      };
      evaluate_badges: { Args: { p_user_id: string }; Returns: string[] };
      level_for_xp: { Args: { p_xp: number }; Returns: number };
      touch_daily_activity: {
        Args: { p_user_id: string; p_activity_date: string; p_max_gap_minutes: number };
        Returns: undefined;
      };
      touch_streak: {
        Args: { p_user_id: string; p_activity_date: string };
        Returns: Database["public"]["Tables"]["streaks"]["Row"];
      };
      can_access_exercise: {
        Args: { p_user_id: string; p_exercise_id: string; p_free_limit: number };
        Returns: string;
      };
      exercise_is_gated: { Args: { p_exercise_id: string }; Returns: boolean };
      free_exercises_used: { Args: { p_user_id: string }; Returns: number };
      has_active_entitlement: { Args: { p_user_id: string }; Returns: boolean };
      log_query_execution: {
        Args: {
          p_user_id: string | null;
          p_attempt_id: string | null;
          p_dataset_slug: string;
          p_engine: string;
          p_sql_sha256: string;
          p_sql_length: number;
          p_duration_ms: number | null;
          p_status: string;
          p_sqlstate: string | null;
        };
        Returns: undefined;
      };
      record_attempt: {
        Args: {
          p_user_id: string;
          p_exercise_id: string;
          p_sql: string;
          p_status: string;
          p_feedback: Json;
          p_execution_ms: number | null;
          p_row_count: number | null;
          p_is_genuine: boolean;
        };
        Returns: {
          attempt_id: string;
          first_completion: boolean;
          attempts_count: number;
          genuine_attempts_count: number;
        }[];
      };
      reveal_solution: {
        Args: { p_user_id: string; p_exercise_id: string; p_reason: string };
        Returns: undefined;
      };
      save_exercise_draft: { Args: { p_exercise_id: string; p_sql: string }; Returns: undefined };
      start_exercise: { Args: { p_user_id: string; p_exercise_id: string }; Returns: undefined };
      unlock_hint: {
        Args: { p_user_id: string; p_exercise_id: string; p_level: number };
        Returns: {
          body_md: string;
          coin_cost: number;
          xp_penalty_percent: number;
          hints_used: number;
        }[];
      };
      certificate_eligible: {
        Args: { p_user_id: string; p_requirement_slug: string };
        Returns: boolean;
      };
      check_section_completion: {
        Args: { p_user_id: string; p_section_id: string };
        Returns: boolean;
      };
      issue_certificate: {
        Args: { p_user_id: string; p_requirement_slug: string; p_recipient_name: string };
        Returns: { public_id: string; verification_code: string; already_issued: boolean }[];
      };
      start_quiz_attempt: {
        Args: { p_user_id: string; p_lesson_id: string; p_question_ids: string[] };
        Returns: { attempt_id: string; question_ids: string[]; resumed: boolean }[];
      };
      discard_quiz_attempt: {
        Args: { p_user_id: string; p_attempt_id: string };
        Returns: boolean;
      };
      record_quiz_answer: {
        Args: {
          p_user_id: string;
          p_attempt_id: string;
          p_question_id: string;
          p_answer: Json;
          p_is_correct: boolean;
        };
        Returns: { recorded: boolean; answered_count: number; total: number }[];
      };
      finalize_quiz_attempt: {
        Args: { p_user_id: string; p_attempt_id: string; p_pass_threshold_percent: number };
        Returns: { score: number; total: number; passed: boolean; already_submitted: boolean }[];
      };
      record_quiz_attempt: {
        Args: {
          p_user_id: string;
          p_lesson_id: string;
          p_score: number;
          p_total: number;
          p_passed: boolean;
          p_answers: Json;
        };
        Returns: string;
      };
      revoke_certificate: {
        Args: { p_public_id: string; p_actor: string | null; p_reason: string };
        Returns: undefined;
      };
      verify_certificate: {
        Args: { p_code: string };
        Returns: {
          public_id: string;
          recipient_name: string;
          title: string;
          skills: string[];
          issued_at: string;
          revoked: boolean;
        }[];
      };
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
      mark_lesson_viewed: {
        Args: { p_lesson_slug: string; p_completed?: boolean };
        Returns: undefined;
      };
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
