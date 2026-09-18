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
          id?: number;
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
          id?: number;
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
      rate_limits: {
        Row: { key: string; tokens: number; refilled_at: string };
        Insert: { key: string; tokens: number; refilled_at?: string };
        Update: { key?: string; tokens?: number; refilled_at?: string };
        Relationships: [];
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
          pairs: Json | null;
          tags: string[] | null;
          estimated_seconds: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
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
