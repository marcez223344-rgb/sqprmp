# Database Design — Supabase (application database)

**Scope:** application data only. Learning datasets live in isolated PGlite snapshots ([SQL_SANDBOX.md](SQL_SANDBOX.md)) and are _never_ in this database.
**Conventions:** `snake_case`, `uuid` PKs (`gen_random_uuid()`) except content tables which use stable `text` slugs as natural keys plus uuid PKs; `created_at`/`updated_at timestamptz` with trigger; soft delete only where legally required; every exposed table has RLS enabled in the same migration that creates it; `check` constraints for enums (or Postgres enums for stable sets); money as `integer` minor units + `currency char(3)`.

## 1. Entity map

```
auth.users ─1:1─ profiles ─┬─ n:1 avatars
                           ├─ 1:n exercise_progress ─ n:1 exercises ─ n:1 lessons ─ n:1 sections ─ n:1 courses
                           ├─ 1:n lesson_progress                 └─ n:1 datasets ─ 1:n dataset_tables ─ 1:n dataset_columns
                           ├─ 1:n attempts ─ 1:n query_executions
                           ├─ 1:n hint_usage ─ n:1 exercise_hints
                           ├─ 1:n solution_reveals
                           ├─ 1:n quiz_attempts ─ 1:n quiz_answers ─ n:1 theory_questions ─ 1:n question_options
                           ├─ 1:n saved_queries
                           ├─ 1:1 learning_goals, 1:1 streaks, 1:n streak_freezes
                           ├─ 1:n xp_events, coin_events, reward_ledger, user_badges ─ n:1 badges
                           ├─ 1:n purchases ─ n:1 prices ─ n:1 products
                           ├─ 1:n subscriptions, 1:n entitlements, 1:n promo_redemptions ─ n:1 promo_codes
                           ├─ 1:n certificates ─ n:1 certificate_requirements
                           └─ 1:n analytics_events, audit_logs, data_requests
payment_events (provider-keyed, idempotent) · feature_flags · rate_limits · alias_blocklist
```

## 2. Tables (key columns only; full DDL lives in `supabase/migrations/`)

### Identity

- **profiles** `id uuid PK = auth.users.id`, `display_name`, `alias citext UNIQUE`, `alias_normalized`, `avatar_id → avatars`, `country char(2)`, `birth_date date`, `gender text CHECK IN ('female','male','non_binary','other','prefer_not_to_say') NULL`, `sql_level`, `main_goal`, `weekly_goal_minutes int`, `certificate_name`, `role text CHECK IN ('learner','admin') DEFAULT 'learner'`, `terms_accepted_at`, `terms_version`, `privacy_accepted_at`, `privacy_version`, `onboarding_completed_at`, `leaderboard_opt_in bool DEFAULT false`, `deleted_at`, timestamps.
- **avatars** `id`, `slug UNIQUE`, `image_path`, `alt_text`, `is_active`, `sort_order`.
- **alias_blocklist** `pattern text` (normalized substrings/regex), `reason`.
- **data_requests** `id`, `user_id`, `type ('export','deletion')`, `status`, `requested_at`, `completed_at`, `file_path`.

### Curriculum (authored content; write access admin/service only)

- **courses** `id`, `slug UNIQUE`, `title`, `description`, `sort_order`, `is_published`.
- **sections** `id`, `course_id`, `slug UNIQUE`, `title`, `summary`, `objectives jsonb[]`, `level ('beginner','intermediate','advanced','expert')`, `sort_order`, `is_published`, `certificate_requirement_id NULL`.
- **lessons** `id`, `section_id`, `slug UNIQUE`, `title`, `kind ('theory','exercise','quiz','challenge')`, `sort_order`, `estimated_minutes`, `body_mdx text NULL` (theory), `is_free bool`, `is_published`.
- **lesson_prerequisites** `lesson_id`, `requires_lesson_id` (PK pair).
- **datasets** `id`, `slug UNIQUE`, `version int`, `title`, `domain`, `description`, `snapshot_path`, `snapshot_sha256`, `row_counts jsonb`, `is_active`.
- **dataset_tables** `id`, `dataset_id`, `name`, `description`, `sort_order`; **dataset_columns** `id`, `table_id`, `name`, `data_type`, `description`, `is_pk`, `fk_ref text NULL`, `sort_order`.
- **exercises** `id`, `lesson_id UNIQUE`, `slug UNIQUE`, `title`, `scenario_md`, `business_question_md`, `learning_objective`, `difficulty ('very_easy','easy','intermediate','advanced','expert')`, `estimated_minutes`, `concepts text[]`, `dataset_id`, `allowed_statements text[] DEFAULT '{select}'`, `expected_columns jsonb`, `validation_rules jsonb` (comparator config: order_matters, tolerance, dedupe, required/prohibited concepts, max_execution_ms), `common_mistakes_md`, `expert_explanation_md`, `improvement_feedback jsonb`, `reward_config jsonb` (xp, coins, penalties), `solution_unlock jsonb` (min_attempts, min_hints, min_minutes, allow_explicit), `is_published`.
- **exercise_solutions** `id`, `exercise_id`, `sql`, `is_reference bool`, `explanation_md`, `approach_label`. _(Hidden from learners until unlock.)_
- **exercise_expected_results** `exercise_id PK`, `dataset_version`, `columns jsonb`, `rows jsonb`, `row_count`, `computed_at`. _(Never readable by learners.)_
- **exercise_hints** `id`, `exercise_id`, `level int CHECK 1..3`, `body_md`, `coin_cost int`, `xp_penalty int`. _(Served by server only.)_
- **theory_questions** `id`, `lesson_id NULL`, `section_id`, `slug UNIQUE`, `type ('single','multiple','true_false','fill_blank','query_interpretation','error_diagnosis','matching','scenario')`, `difficulty`, `prompt_md`, `code_md NULL`, `explanation_md`, `tags text[]`, `estimated_seconds`, `is_published`.
- **question_options** `id`, `question_id`, `body_md`, `is_correct bool`, `why_incorrect_md NULL`, `match_key text NULL`, `sort_order`. _(`is_correct`, `why_incorrect_md` and `explanation_md` only via server after submission; RLS denies direct learner select on this table; a view `question_options_public` exposes body only.)_

### Learning activity (learner-owned rows)

- **attempts** `id`, `user_id`, `exercise_id`, `sql text`, `status ('error','incorrect','correct')`, `feedback jsonb`, `execution_ms`, `row_count`, `is_genuine bool` (server heuristic: parsed, executed, differs from previous attempt), `created_at`.
- **query_executions** `id`, `attempt_id NULL`, `user_id`, `dataset_id`, `engine ('browser_fallback','server')`, `sql_sha256`, `sql_length`, `duration_ms`, `status`, `sqlstate NULL`, `created_at`.
- **exercise_progress** `user_id`, `exercise_id` (PK pair), `status ('not_started','in_progress','completed')`, `first_completed_at`, `best_attempt_id`, `attempts_count`, `hints_used int`, `solution_revealed_at NULL`, `draft_sql text NULL`, `draft_saved_at`.
- **lesson_progress** `user_id`, `lesson_id` (PK), `status`, `completed_at`, `last_viewed_at`.
- **hint_usage** `id`, `user_id`, `exercise_id`, `hint_level`, `created_at` UNIQUE `(user_id, exercise_id, hint_level)`.
- **solution_reveals** `id`, `user_id`, `exercise_id`, `reason ('attempts','hints','time','explicit')`, `created_at` UNIQUE `(user_id, exercise_id)`.
- **quiz_attempts** `id`, `user_id`, `lesson_id`, `score int`, `total int`, `passed bool`, `started_at`, `submitted_at`; **quiz_answers** `id`, `quiz_attempt_id`, `question_id`, `answer jsonb`, `is_correct`, `answered_at`.
- **saved_queries** `id`, `user_id`, `exercise_id NULL`, `dataset_id`, `title`, `sql`, timestamps.
- **learning_goals** `user_id PK`, `daily_xp_target`, `weekly_minutes_target`, `reminder_opt_in`.
- **streaks** `user_id PK`, `current_length`, `longest_length`, `last_activity_date date`, `timezone text`, `freezes_available int DEFAULT 1`; **streak_freezes** `id`, `user_id`, `used_on date`.
- **daily_activity** `user_id`, `activity_date` (PK pair), `xp_earned`, `minutes_active`, `exercises_completed`. _(Source for streaks/goals; `activity_date` computed in the user's timezone.)_

### Rewards (server-written only)

- **reward_ledger** `id`, `user_id`, `event_key text UNIQUE` (e.g. `exercise_completed:<exercise_id>`), `source ('exercise','quiz','streak','badge','section','admin')`, `xp_delta`, `coin_delta`, `metadata jsonb`, `created_at`. _(Single idempotent ledger; `xp_events`/`coin_events` are views over it.)_
- **user_totals** `user_id PK`, `xp_total`, `coin_balance`, `level`, `updated_at` (maintained by trigger on ledger).
- **badges** `id`, `slug UNIQUE`, `title`, `description`, `icon`, `criteria jsonb`, `is_active`; **user_badges** `user_id`, `badge_id` (PK pair), `earned_at`.
- **suspicious_activity** `id`, `user_id`, `kind`, `details jsonb`, `created_at`.

### Commerce

- **products** `id`, `slug UNIQUE`, `kind ('lifetime','subscription','promo')`, `title`, `description`, `access_days int NULL`, `is_active`.
- **prices** `id`, `product_id`, `provider ('mercadopago','stripe','manual')`, `provider_price_ref NULL`, `currency char(3)`, `amount_minor int`, `country char(2) NULL`, `interval ('one_time','month','year')`, `is_active`.
- **purchases** `id`, `user_id`, `price_id`, `provider`, `provider_payment_id UNIQUE`, `status ('pending','approved','refunded','chargeback','rejected')`, `amount_minor`, `currency`, `created_at`, `updated_at`.
- **subscriptions** `id`, `user_id`, `price_id`, `provider`, `provider_subscription_id UNIQUE`, `status`, `current_period_end`, `cancel_at`, timestamps. _(Modeled, unused in MVP.)_
- **entitlements** `id`, `user_id`, `source ('purchase','subscription','promo','admin')`, `source_id uuid NULL`, `scope ('full_course')`, `starts_at`, `ends_at NULL` (NULL = lifetime), `revoked_at NULL`, `revoked_reason`, `created_by uuid NULL`.
- **promo_codes** `id`, `code citext UNIQUE`, `kind ('scholarship','discount')`, `access_days NULL`, `discount_percent NULL`, `max_redemptions`, `expires_at`, `is_active`; **promo_redemptions** `id`, `promo_code_id`, `user_id`, `created_at` UNIQUE pair.
- **payment_events** `id`, `provider`, `provider_event_id text`, `event_type`, `payload jsonb` (secrets stripped), `signature_valid bool`, `processed_at NULL`, `processing_error NULL`, `received_at` UNIQUE `(provider, provider_event_id)`.

### Certificates

- **certificate_requirements** `id`, `slug UNIQUE`, `title`, `skills text[]`, `rules jsonb` (required section ids, min quiz score, required exercises), `is_active`.
- **certificates** `id uuid`, `public_id text UNIQUE` (ULID), `verification_code text UNIQUE`, `user_id`, `requirement_id`, `recipient_name`, `issued_at`, `revoked_at NULL`, `revoked_reason`, `pdf_path NULL`.

### Platform

- **feature_flags** `key PK`, `enabled bool`, `payload jsonb`, `updated_by`, `updated_at`.
- **audit_logs** `id`, `actor_id NULL`, `actor_role`, `action`, `target_table`, `target_id`, `diff jsonb`, `ip_hash`, `created_at`.
- **analytics_events** `id`, `user_id NULL`, `anonymous_id`, `name`, `properties jsonb` (spec-validated, no PII), `created_at`.
- **rate_limits** `key text PK` (e.g. `submit:<user_id>`), `tokens`, `refilled_at`.

## 3. Key functions (RPC, `SECURITY DEFINER`, `search_path` pinned, callable only by service role or with explicit checks)

`complete_onboarding(payload)`, `check_alias_available(alias)`, `award_reward(user_id, event_key, source, xp, coins, meta)` (idempotent), `record_attempt(...)`, `unlock_hint(user_id, exercise_id, level)`, `reveal_solution(...)`, `grant_entitlement(...)`, `apply_payment_event(...)`, `redeem_promo(...)`, `issue_certificate(...)`, `consume_rate_limit(key, cost, capacity, refill_per_sec)`, `free_exercises_used(user_id)`, `has_active_entitlement(user_id)`, `touch_daily_activity(...)`, `evaluate_streaks()` (pg_cron nightly), `delete_user_data(user_id)`.

## 4. RLS policy matrix

Roles: `anon` (public visitor), `learner` (authenticated, `profiles.role='learner'`), `admin` (`profiles.role='admin'`, checked via `is_admin()` helper reading a JWT claim set by a custom access token hook or the profile row), `service` (secret key, server only, bypasses RLS).

| Table                                                                                 | anon                                                                                                                 | learner                                                                  | admin                   | Notes                                                                                               |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------- |
| profiles                                                                              | –                                                                                                                    | S/U own (not `role`, not `deleted_at`)                                   | S all, U all            | Public alias/avatar exposed via view `public_profiles` (alias, avatar) only if `leaderboard_opt_in` |
| avatars                                                                               | S active                                                                                                             | S active                                                                 | CRUD                    |                                                                                                     |
| alias_blocklist                                                                       | –                                                                                                                    | –                                                                        | CRUD                    | used by RPC                                                                                         |
| courses/sections/lessons                                                              | S published                                                                                                          | S published                                                              | CRUD                    | `body_mdx` of premium lessons filtered by `has_access()` in a view                                  |
| datasets/dataset_tables/columns                                                       | S active                                                                                                             | S active                                                                 | CRUD                    |                                                                                                     |
| exercises                                                                             | S published, columns limited by view `exercises_public` (no `validation_rules` internals, no `improvement_feedback`) | same                                                                     | CRUD                    | full row only via service                                                                           |
| exercise_solutions                                                                    | –                                                                                                                    | – (server serves after unlock)                                           | CRUD                    |                                                                                                     |
| exercise_expected_results                                                             | –                                                                                                                    | –                                                                        | S                       | service only                                                                                        |
| exercise_hints                                                                        | –                                                                                                                    | – (server serves)                                                        | CRUD                    |                                                                                                     |
| theory_questions                                                                      | –                                                                                                                    | S published (via `questions_public` view without explanation)            | CRUD                    |                                                                                                     |
| question_options                                                                      | –                                                                                                                    | S via `question_options_public` (no `is_correct`, no `why_incorrect_md`) | CRUD                    |                                                                                                     |
| attempts, query_executions, hint_usage, solution_reveals, quiz_attempts, quiz_answers | –                                                                                                                    | S own (insert via server/RPC only)                                       | S all                   | learners never insert directly                                                                      |
| exercise_progress, lesson_progress                                                    | –                                                                                                                    | S own; U own only `draft_sql`, `draft_saved_at`                          | S all                   | status changed by RPC                                                                               |
| saved_queries                                                                         | –                                                                                                                    | CRUD own                                                                 | S all                   |                                                                                                     |
| learning_goals                                                                        | –                                                                                                                    | S/I/U own                                                                | S all                   |                                                                                                     |
| streaks, daily_activity, streak_freezes                                               | –                                                                                                                    | S own                                                                    | S all                   | written by RPC/cron                                                                                 |
| reward_ledger, user_totals, user_badges, suspicious_activity                          | –                                                                                                                    | S own (not suspicious_activity)                                          | S all                   | written by RPC                                                                                      |
| badges                                                                                | S active                                                                                                             | S active                                                                 | CRUD                    |                                                                                                     |
| products, prices                                                                      | S active                                                                                                             | S active                                                                 | CRUD                    |                                                                                                     |
| purchases, subscriptions, entitlements, promo_redemptions                             | –                                                                                                                    | S own                                                                    | S all, entitlements I/U | writes via RPC/service                                                                              |
| promo_codes                                                                           | –                                                                                                                    | – (RPC validates)                                                        | CRUD                    |                                                                                                     |
| payment_events                                                                        | –                                                                                                                    | –                                                                        | S                       | service writes                                                                                      |
| certificate_requirements                                                              | S active                                                                                                             | S active                                                                 | CRUD                    |                                                                                                     |
| certificates                                                                          | S via `certificate_verification` view by `verification_code` (name, title, issued_at, status)                        | S own                                                                    | S all, U revoke         | insert via RPC                                                                                      |
| feature_flags                                                                         | S (public flags only)                                                                                                | S                                                                        | CRUD                    |                                                                                                     |
| audit_logs                                                                            | –                                                                                                                    | –                                                                        | S                       | service writes                                                                                      |
| analytics_events                                                                      | –                                                                                                                    | –                                                                        | S                       | server writes                                                                                       |
| rate_limits                                                                           | –                                                                                                                    | –                                                                        | –                       | RPC only                                                                                            |
| data_requests                                                                         | –                                                                                                                    | S/I own                                                                  | S/U all                 |                                                                                                     |

Every migration that creates a table must: `enable row level security`, add policies, and add a pgTAP test in `supabase/tests/` proving `anon` and a foreign `learner` cannot read/write another user's rows.

## 4b. Implementation notes (Phase 1, migration `20260918170000_foundation.sql`)

- `is_admin()` checks the `user_role` JWT claim first and falls back to `profiles.role`, so it works before the custom access token hook exists.
- Learners get column-level `update` grants on `profiles` (never `role`, consent timestamps or `onboarding_completed_at`); the `profiles_before_write` trigger additionally freezes those columns for non-admins and maintains `alias_normalized` (`normalize_alias()` folds `0134578` → `oieastb`).
- `public_profiles` is intentionally a definer view exposing only `alias` + avatar of opted-in learners (documented exception to the invoker-view rule).
- `rate_limits` has RLS enabled and no policies; only `consume_rate_limit()` (service role) touches it.
- Local validation without Docker: `npm run db:validate` (PGlite). pgTAP: `supabase/tests/0001_foundation.test.sql`.

### 4c. Implementation notes (Phase 2, migration `20260918180000_onboarding.sql`)

- `complete_onboarding(payload jsonb)`: single transaction that validates alias (blocklist + normalized uniqueness), avatar and both consents, writes consent versions/timestamps and `onboarding_completed_at`, and audit-logs `onboarding.completed`. Raises `P0001` with `detail` in {`alias_unavailable`, `avatar_invalid`, `consent_required`} so the server action maps them to field errors.
- `data_requests`: learners insert/cancel their own pending requests (partial unique index: one pending per type); fulfilment is an admin/cron job (Phase 8).
- `custom_access_token_hook`: adds `user_role` claim; enabled in `supabase/config.toml` and must be enabled in the cloud dashboard (Auth → Hooks) per environment.
- Alias blocklist seeded with impersonation/brand/slur patterns (regex on the normalized alias).

## 5. Indexes (initial)

`attempts (user_id, exercise_id, created_at desc)`, `exercise_progress (user_id, status)`, `reward_ledger (user_id, created_at)`, `entitlements (user_id) WHERE revoked_at IS NULL`, `payment_events (provider, provider_event_id)`, `certificates (verification_code)`, `analytics_events (name, created_at)`, `lessons (section_id, sort_order)`, `daily_activity (user_id, activity_date desc)`.

## 6. Data lifecycle and privacy

- Account deletion: `delete_user_data()` anonymizes `profiles` (alias → `usuario-eliminado-<short>`), deletes attempts/saved queries/analytics, keeps purchases and certificates with `recipient_name` retained only where legally needed (invoicing), and records the request in `data_requests`.
- Export: server job builds a JSON bundle of all learner-owned tables into a private bucket with a 24-hour signed URL.
- Retention: `query_executions` 180 days; `analytics_events` 24 months; `payment_events` payloads keep no card data (providers never send it).
