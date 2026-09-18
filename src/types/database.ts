/**
 * GENERATED FILE placeholder. Regenerate with:
 *   npx supabase gen types typescript --local > src/types/database.ts
 * Until the local Supabase stack runs, this minimal shape keeps typecheck green.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
