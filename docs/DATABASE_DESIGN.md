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

- **profiles** `id uuid PK = auth.users.id`, `display_name`, `alias citext UNIQUE`, `alias_normalized`, `avatar_id → avatars`, `country char(2)`, `birth_date date`, `gender text CHECK IN ('female','male','non_binary','other','prefer_not_to_say') NULL`, `sql_level`, `main_goal`, `weekly_goal_minutes int`, `certificate_name`, `role text CHECK IN ('learner','admin') DEFAULT 'learner'`, `terms_accepted_at`, `terms_version`, `privacy_accepted_at`, `privacy_version`, `onboarding_completed_at`, `leaderboard_opt_in bool DEFAULT false`, `leaderboard_opt_in_at` (stamped by trigger on every change; null = predates the column), `deleted_at`, timestamps.
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
- **quiz_attempts** `id`, `user_id`, `lesson_id`, `section_id`, `score int`, `total int`, `passed bool`, `status ('in_progress'|'submitted')`, `question_ids uuid[]`, `started_at`, `submitted_at` (null while open); **quiz_answers** `id`, `quiz_attempt_id`, `user_id`, `question_id`, `answer jsonb`, `is_correct`, `answered_at`. An attempt row is created when the learner opens the quiz and holds the sampled questions in delivery order; unique `(user_id, lesson_id) where status = 'in_progress'` allows one open attempt per quiz and unique `(quiz_attempt_id, question_id)` makes each answer final.
- **saved_queries** `id`, `user_id`, `exercise_id NULL`, `dataset_id`, `title`, `sql`, timestamps.
- **exercise_reports** `id`, `user_id`, `exercise_id NULL` (`on delete set null`), `exercise_slug` (set by trigger from the id), `category ('confusing_statement','marked_wrong','data_error','other')`, `note` (10–1000 chars), `learner_sql NULL` (≤ 8192 chars), `status ('open','resolved')`, `resolved_at`, `resolved_by`, `resolution_note`, timestamps. Private report to the owner (D-42); see §4p.
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
- **entitlements** `id`, `user_id`, `source ('purchase','subscription','promo','admin')`, `source_id uuid NULL`, `scope ('full_course')`, `starts_at`, `ends_at NULL` (NULL = lifetime), `revoked_at NULL`, `revoked_reason`, `acknowledged_at NULL` (when the learner dismissed the in-app "your access is active" notice; the product sends no email — docs/PAYMENTS.md §5c), `created_by uuid NULL`. `source` is the difference between money and no money: an admin-recorded bank transfer is `'purchase'` with a `purchases` row behind it, a scholarship or courtesy grant is `'admin'`.
- **promo_codes** `id`, `code citext UNIQUE`, `kind ('scholarship','discount')`, `access_days NULL`, `discount_percent NULL`, `max_redemptions DEFAULT 1` (NULL = unlimited, written only when an admin ticks «sin límite»; `>= 1` when stated — `20260924130000`), `expires_at`, `is_active`; **promo_redemptions** `id`, `promo_code_id`, `user_id`, `created_at` UNIQUE pair.
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

`complete_onboarding(payload)`, `check_alias_available(alias)`, `award_reward(user_id, event_key, source, xp, coins, meta)` (idempotent), `record_attempt(...)`, `unlock_hint(user_id, exercise_id, level)`, `reveal_solution(...)`, `grant_entitlement(...)`, `apply_payment_event(...)`, `redeem_promo(...)`, `issue_certificate(...)`, `consume_rate_limit(key, cost, capacity, refill_per_sec)`, `admin_user_directory(...)`, `admin_user_stats(free_limit)`, `admin_resolve_exercise_report(report_id, actor, reason)`, `free_exercises_used(user_id)`, `has_active_entitlement(user_id)`, `touch_daily_activity(...)`, `sync_exercise_lesson_progress(...)`, `leaderboard(period, limit)`, `evaluate_streaks()` (pg_cron nightly), `delete_user_data(user_id)`.

## 4. RLS policy matrix

Roles: `anon` (public visitor), `learner` (authenticated, `profiles.role='learner'`), `admin` (`profiles.role='admin'`, checked via `is_admin()` helper reading a JWT claim set by a custom access token hook or the profile row), `service` (secret key, server only, bypasses RLS).

| Table                                                                                 | anon                                                                                                                 | learner                                                                  | admin                   | Notes                                                                                                                                  |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| profiles                                                                              | –                                                                                                                    | S/U own (not `role`, not `deleted_at`)                                   | S all, U all            | Public alias/avatar exposed via view `public_profiles` and RPC `leaderboard()` (alias, avatar, level, XP) only if `leaderboard_opt_in` |
| avatars                                                                               | S active                                                                                                             | S active                                                                 | CRUD                    |                                                                                                                                        |
| alias_blocklist                                                                       | –                                                                                                                    | –                                                                        | CRUD                    | used by RPC                                                                                                                            |
| courses/sections/lessons                                                              | S published                                                                                                          | S published                                                              | CRUD                    | `body_mdx` of premium lessons filtered by `has_access()` in a view                                                                     |
| datasets/dataset_tables/columns                                                       | S active                                                                                                             | S active                                                                 | CRUD                    |                                                                                                                                        |
| exercises                                                                             | S published, columns limited by view `exercises_public` (no `validation_rules` internals, no `improvement_feedback`) | same                                                                     | CRUD                    | full row only via service                                                                                                              |
| exercise_solutions                                                                    | –                                                                                                                    | – (server serves after unlock)                                           | CRUD                    |                                                                                                                                        |
| exercise_expected_results                                                             | –                                                                                                                    | –                                                                        | S                       | service only                                                                                                                           |
| exercise_hints                                                                        | –                                                                                                                    | – (server serves)                                                        | CRUD                    |                                                                                                                                        |
| theory_questions                                                                      | –                                                                                                                    | S published (via `questions_public` view without explanation)            | CRUD                    |                                                                                                                                        |
| question_options                                                                      | –                                                                                                                    | S via `question_options_public` (no `is_correct`, no `why_incorrect_md`) | CRUD                    |                                                                                                                                        |
| attempts, query_executions, hint_usage, solution_reveals, quiz_attempts, quiz_answers | –                                                                                                                    | S own (insert via server/RPC only)                                       | S all                   | learners never insert directly                                                                                                         |
| exercise_progress, lesson_progress                                                    | –                                                                                                                    | S own; U own only `draft_sql`, `draft_saved_at`                          | S all                   | status changed by RPC                                                                                                                  |
| saved_queries                                                                         | –                                                                                                                    | CRUD own                                                                 | S all                   |                                                                                                                                        |
| exercise_reports                                                                      | –                                                                                                                    | S own; I own (content columns only)                                      | S all, U all            | resolved via `admin_resolve_exercise_report` (service role, audited)                                                                   |
| learning_goals                                                                        | –                                                                                                                    | S/I/U own                                                                | S all                   |                                                                                                                                        |
| streaks, daily_activity, streak_freezes                                               | –                                                                                                                    | S own                                                                    | S all                   | written by RPC/cron                                                                                                                    |
| reward_ledger, user_totals, user_badges, suspicious_activity                          | –                                                                                                                    | S own (not suspicious_activity)                                          | S all                   | written by RPC                                                                                                                         |
| badges                                                                                | S active                                                                                                             | S active                                                                 | CRUD                    |                                                                                                                                        |
| products, prices                                                                      | S active                                                                                                             | S active                                                                 | CRUD                    |                                                                                                                                        |
| purchases, subscriptions, entitlements, promo_redemptions                             | –                                                                                                                    | S own                                                                    | S all, entitlements I/U | writes via RPC/service                                                                                                                 |
| promo_codes                                                                           | –                                                                                                                    | – (RPC validates)                                                        | CRUD                    |                                                                                                                                        |
| payment_events                                                                        | –                                                                                                                    | –                                                                        | S                       | service writes                                                                                                                         |
| certificate_requirements                                                              | S active                                                                                                             | S active                                                                 | CRUD                    |                                                                                                                                        |
| certificates                                                                          | S via `certificate_verification` view by `verification_code` (name, title, issued_at, status)                        | S own                                                                    | S all, U revoke         | insert via RPC                                                                                                                         |
| feature_flags                                                                         | S (public flags only)                                                                                                | S                                                                        | CRUD                    |                                                                                                                                        |
| audit_logs                                                                            | –                                                                                                                    | –                                                                        | S                       | service writes                                                                                                                         |
| analytics_events                                                                      | –                                                                                                                    | –                                                                        | S                       | server writes                                                                                                                          |
| rate_limits                                                                           | –                                                                                                                    | –                                                                        | –                       | RPC only                                                                                                                               |
| data_requests                                                                         | –                                                                                                                    | S/I own                                                                  | S/U all                 |                                                                                                                                        |

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

### 4d. Implementation notes (Phase 3, migration `20260918190000_curriculum.sql`)

- Learners never get table-level `select` on `lessons`, `exercises`, `theory_questions` or `question_options`: they receive **column-level grants** (a column revoke would not subtract from a table grant), so `body_md`, `validation_rules`, `explanation_md`, `answer`, `is_correct` and `why_incorrect_md` are unreachable through PostgREST. `exercise_solutions`, `exercise_hints`, `exercise_expected_results` have admin-only policies.
- `lessons_public` is a definer view (documented exception) exposing `body_md_free` only for free published lessons; premium bodies are read server-side with the admin client after `canReadLesson()`. `questions_public`, `question_options_public`, `exercises_public` are invoker views over the granted columns.
- `sections` are readable by everyone (outlines on the path); `is_published` gates starting them.
- Content rows are written only by the seed pipeline (`npm run content:build` → `supabase/seed/0002_content.sql`, idempotent upserts by slug). Quiz lessons are derived per section at build time.
- Writers of `lesson_progress`: `mark_lesson_viewed(slug, completed)` (learner-callable), `record_quiz_attempt`
  on a pass, and `sync_exercise_lesson_progress` (see 4j). Nothing else, and never the browser directly.

### 4e. Implementation notes (Phase 4, migration `20260918200000_exercise_activity.sql`)

- Free limit (D-01) is **start-based**: `free_exercises_used()` counts gated exercises with a progress row, because opening an exercise reveals its statement and enables the local engine. `can_access_exercise()` returns `ok | locked | unavailable` and keeps already-started exercises accessible; admins and active entitlements bypass (`has_active_entitlement()` tolerates the entitlements table not existing until Phase 6).
- Activity RPCs are service-role only (`start_exercise`, `record_attempt`, `unlock_hint`, `reveal_solution`, `log_query_execution`); the server has already authorized, gated and executed the SQL. `save_exercise_draft` is learner-callable (own row).
- `record_attempt` returns `first_completion` exactly once per (user, exercise); Phase 5 awards rewards from that flag. Hints unlock sequentially (`P0001/hint_sequence`).
- `promo_codes.code` and `profiles.alias` are `extensions.citext`: any function comparing them must include `extensions` in its pinned `search_path`, otherwise both sides fall back to `text` and the comparison silently becomes case-sensitive. Fixed for `redeem_promo` and `admin_find_user` in `20260922130000_citext_comparisons.sql`.
- `record_attempt` names two of its OUT columns after table columns (`attempts_count`, `genuine_attempts_count`); its UPDATE must qualify every right-hand reference with the table alias, or Postgres raises `42702 column reference is ambiguous` (PGlite does not, which is why `db:validate` missed it). Fixed in `20260922120000_fix_record_attempt_ambiguity.sql`; covered by `supabase/tests/0004_exercise_activity.test.sql`.
- `query_executions` stores SQL hash/length/duration/SQLSTATE only (raw SQL lives in `attempts`, learner-readable).

### 4f. Implementation notes (Phase 5, migration `20260918210000_gamification.sql`)

- `award_reward(user, event_key, source, xp, coins, metadata, activity_date, daily_cap)` is the only writer of `reward_ledger`, `user_totals`, `daily_activity` and (via `touch_streak`) `streaks`; service role only. Idempotency = unique `(user_id, event_key)`; the XP cap applies per `activity_date` (learner timezone, computed by the server).
- `level_for_xp()` (SQL) and `levelForXp()` (TS) implement the same curve; both are tested.
- Badges: `evaluate_badges(user)` reads real progress and inserts `user_badges` idempotently, returning new slugs. Since `20260925120000` the section-completion part is `completed_section_slugs(user)` (§4o).
- `learning_goals` is learner-writable (own row); everything else is read-only for learners.
- Rules narrative: [GAMIFICATION.md](GAMIFICATION.md).

### 4g. Implementation notes (Phase 6, migration `20260918220000_commerce.sql`)

- Learners never write commerce tables directly: `create_manual_purchase` / `cancel_manual_purchase` / `redeem_promo` are learner-callable RPCs; `review_manual_purchase`, `grant_entitlement`, `revoke_entitlement`, `apply_payment_event`, `user_id_by_email` are service-role only and audit-log every decision.
- `apply_payment_event` is idempotent on `(provider, provider_event_id)` and transactional: approved → purchase + entitlement; refunded/chargeback → entitlement revoked (+ `suspicious_activity`); invalid signature → stored, never applied.
- `has_active_entitlement` now reads `entitlements` (Phase 4 fallback removed). Admins always have access.
- Products/prices are seeded from `src/config/pricing.ts` by `content:build` (unique per product/provider/currency/country).

### 4h. Implementation notes (Phase 7, migration `20260918230000_assessments_certificates.sql`)

- Grading happens in `src/lib/quizzes/service.ts` with the answer key read through the admin client; the browser only receives `questions_public` / `question_options_public` (shuffled, no `is_correct`, no explanations). `record_quiz_attempt` (service role) stores a whole attempt in one call; it is kept for older rows and superseded by the per-question RPCs in §4i.
- `check_section_completion` defines "section complete" as every published exercise completed **and** the section quiz passed (theory lessons are not required); it inserts `section_progress` idempotently and is called after each exercise completion and quiz pass. `certificate_eligible` re-evaluates late completions so a requirement can be satisfied even if the check never ran.
- Requirements are data (`certificate_requirements.rules`: `{"sections":[slug…],"min_quiz_score_percent":n}`); the seed carries the four paths in [CURRICULUM.md](CURRICULUM.md). `issue_certificate` is idempotent per (user, requirement), generates `public_id` `DMSA-YYYY-XXXXXXXX` and a 20-char `verification_code`, and audit-logs. Only `verify_certificate(code)` is callable by anon and returns name, title, skills, date and revoked flag — no user ids.
- Review sessions (`/repaso`) grade the learner's most recent wrong answers without writing attempts or rewards.
- PDFs are rendered on demand by `/certificados/[publicId]/pdf` (owner or admin, RLS) with `@react-pdf/renderer`; no Storage bucket yet (deferred until volume justifies caching).

### 4i. Implementation notes (Phase 8, migration `20260918240000_admin_analytics.sql`)

- `analytics_events` is written only by the server (`track()` in `src/lib/analytics/track.ts`, admin client) after Zod validation against the spec in `src/lib/analytics/events.ts`; admins read, learners and anon never. `anonymous_id` exists but is unused until `page_viewed` is implemented (D-15).
- `payment_events` now stores the normalized `payment_ref/status/amount_minor/currency` so an approved webhook that could not be matched to an account can be assigned later by `reconcile_payment_event` (admin, audited, one-shot via `reconciled_at`).
- Admin writes that used to be direct table access go through audited RPCs: `set_feature_flag`, `create_promo_code`, `set_promo_code_active`, `revoke_certificate`, `reconcile_payment_event`. `admin_find_user` joins `auth.users` for email lookup without exposing the auth schema to the client.
- `admin_metrics(p_free_limit)` computes the owner dashboard in one JSON document (signups, learning funnel, WAU/MAU, D1/D7/D30 retention from `daily_activity`, monetization, hardest exercises, frequent SQLSTATEs, section completions). Service role only; computed on request (no materialized view until volume justifies it). Its `quiz_pass_rate` was corrected in §4l once quiz attempts gained an in-progress state.

### 4j. Implementation notes (2026-09-23 owner feedback, migrations `20260923120000_exercise_lesson_progress_sync.sql` and `20260923121000_leaderboard.sql`)

- **Exercise progress was invisible on the learning path.** `/ruta` reads `lesson_progress`, exercises write `exercise_progress`, and nothing connected the two, so a lesson of kind `exercise` stayed `not_started` after the learner solved it. `sync_exercise_lesson_progress(user, exercise, completed)` (service role) upserts the lesson row behind an exercise — resolved by `lesson_id_for_exercise()`, which prefers `exercises.lesson_id` and falls back to `lessons.ref_slug` — and is monotonic: a `completed` lesson is never sent back to `in_progress` and the first `completed_at` is kept. `backfill_exercise_lesson_progress()` derives the same rows from existing `exercise_progress` and **runs once when the migration is applied**, repairing learners who solved exercises before the fix. It is idempotent, so it can be re-run.
- Scope of the bug: only display surfaces were affected. `check_section_completion`, `certificate_eligible`, `evaluate_badges` and the dashboard's mastery bars all read `exercise_progress` / `quiz_attempts` directly, so section completion, badges and certificates were never blocked by it.
- `getLearningPath()` additionally derives an exercise lesson's status from `exercise_progress` when reading (`src/lib/progress/lesson-status.ts`, same rule as the SQL), so a failed sync cannot hide real progress.
- **Leaderboard (D-35).** `leaderboard(p_user_id, p_period, p_limit)` and `leaderboard_participants(p_user_id, p_period)` are definer functions with the consent filter baked in (`leaderboard_opt_in and deleted_at is null and alias is not null`), **service-role only** — execute is revoked from `anon` _and_ `authenticated`, because a grant to `authenticated` let any signed-in learner read the board through PostgREST while the feature flag was off (security review 2026-09-23, F-3). The server calls them with the admin client, which carries no JWT, so the caller is a parameter: it drives the `is_self` flag and the timezone of the weekly window. They also call `leaderboards_enabled()` themselves and return nothing while the flag row is absent or disabled, so a caller that forgets the check leaks nothing. Returned columns: alias, avatar path, level, XP — no RLS policy was widened, so a learner still cannot select another learner's `profiles`, `user_totals` or `daily_activity` row. `p_period = 'week'` sums `daily_activity.xp_earned` over the last 7 days ending on the caller's current date; `'all'` uses `user_totals.xp_total`. Learners with no XP in the window are not ranked; the caller's own row is always returned, even outside the top N.
- **Ranking consent is dated.** `profiles.leaderboard_opt_in_at` is maintained by the `profiles_stamp_leaderboard_consent` trigger: set on every change of `leaderboard_opt_in` (in either direction), preserved on unrelated profile edits, and overwritten on any attempt to supply it — so it cannot be forged, by the learner or by application code. The column is absent from the learner update grant. Existing rows were left null rather than back-dated; what is disclosed and to whom is documented in [SECURITY.md](SECURITY.md) §7.2.

### 4k. Admin user directory and audience statistics (migration `20260923150000_admin_user_directory.sql`)

- The admin panel had no way to see _who_ the learners are: `/admin/usuarios` rendered a search box and nothing until you typed. Two service-role RPCs replace that, and both aggregate in Postgres — the server never counts rows in TypeScript.
- `admin_user_directory(p_search, p_country, p_entitlement, p_include_deleted, p_sort, p_desc, p_limit, p_offset)` returns one page of profiles plus `total_count` as a window count over the filtered set, so page and total arrive in one round trip. Per-user aggregates (`exercises_started/completed` from `exercise_progress`, `level`/`xp_total` from `user_totals`, `last_activity` from `daily_activity`, access class from live `entitlements`) are computed inside the function. Live profiles only unless `p_include_deleted`; `p_limit` is clamped to 5000 (the CSV export reads the filtered set in one call; the on-screen page asks for `limits.admin.directoryPageSize`).
- `admin_grant_access(p_user_id, p_kind, p_access_days, p_actor, p_reason, p_price_id, p_amount_minor, p_currency, p_reference)` — the admin says whether money changed hands. `'comp'` writes an `admin` entitlement only; `'payment'` writes an approved `purchases` row (or approves the learner's pending one) plus a `purchase` entitlement, so revenue aggregates are truthful. Audit: `access.comp_granted` / `access.payment_recorded`.
- `admin_search_learners(p_query, p_limit)` — alias/display-name picker for the admin forms; returns no email. `admin_audit(...)` — generic audit writer for admin actions without their own RPC (the users CSV export).
- `acknowledge_entitlements()` — the learner marks their own active entitlements as seen (definer, scoped to `auth.uid()`; learners have no update policy on `entitlements` and must not get one).
- The `order by` is dynamic (PostgREST cannot sort a set-returning function) but `p_sort` is **never interpolated**: it selects one fragment from a fixed whitelist and everything the caller supplies is bound with `using`. An unknown value falls back to `created_at desc`.
- `admin_user_stats(p_free_limit)` returns one JSON document: learners by country, by age bracket, by signup month (cohorts, last 12 months, with activated and paying counts), by access class, activation (started/completed at least one exercise, median and p90 exercises completed, distribution buckets) and friction (hit the free allowance without paying, quiz pass rate, certificate holders). Ratios whose denominator is empty come back `null`, never `0` or `NaN`, and the UI renders "not enough data yet" below `MIN_LEARNERS_FOR_RATES` (`src/lib/admin/directory.ts`).
- **Privacy.** Neither function returns an email, and neither returns `profiles.birth_date`: the age is derived server-side (`extract(year from age(current_date, birth_date))`) and only the integer crosses the boundary. Email stays in `admin_find_user`, which the UI calls only for the per-person detail card. Both functions are `revoke execute … from public, anon, authenticated` + `grant execute … to service_role`, and both additionally raise `42501` when `auth.uid()` is set and `is_admin()` is false, so widening a grant later cannot hand a learner the whole cohort's country, age and behaviour. `requireAdmin()` gates the pages; the admin client (secret key) is the only caller.
- Access class is derived, not stored: `admin` (role) > `paid` (live purchase/subscription entitlement) > `promo` > `granted` (manual admin grant) > `free`.
- Scale: the per-user aggregates are hash aggregates over `exercise_progress`, `daily_activity` and `entitlements` on every page, which is index-only and fine into the tens of thousands of profiles. Past that, the directory wants a materialized view refreshed on a schedule rather than a bigger index.
- Tests: `supabase/tests/0011_admin_user_directory.test.sql` (anon and learner are denied by grant _and_ by the internal check; no `birth_date` column exists in the result; derived age, access class, counts, sorting, paging, case-insensitive search and country filter; learners-only statistics; `quiz_pass_rate` null with no attempts) and `tests/unit/admin-directory.test.ts` for the URL-parameter whitelist and the small-sample rules.

### 4l. Quiz pass rate counts submitted attempts only (migration `20260923160000_quiz_pass_rate_submitted.sql`)

- `20260923140000_quiz_attempt_progress.sql` made a `quiz_attempts` row exist from the moment a learner _opens_ a quiz (`status = 'in_progress'`, `passed = false`). Both reporting functions divided by every row in the table, so every open and every abandoned attempt was counted as a failure. `admin_metrics(p_free_limit) -> learning.quiz_pass_rate` and `admin_user_stats(p_free_limit) -> friction.quiz_pass_rate` now filter `status = 'submitted'`. The migration is a faithful `create or replace` of both bodies with only that change.
- `admin_user_stats` also splits the counter instead of filtering it: `friction.quiz_attempts_submitted` is the denominator of the pass rate, `friction.quiz_attempts_open` is the abandonment signal (started and never finished). The old ambiguous `friction.quiz_attempts` key is gone so nobody can read one as the other.
- Nothing else was touched: `check_section_completion`, `certificate_eligible` and `evaluate_badges` read `passed`, which is `false` while an attempt is open, so section completion, badges and certificates were never affected.
- Because this replaces `admin_metrics`, `supabase/tests/0008_admin_analytics.test.sql` must be re-run together with `supabase/tests/0011_admin_user_directory.test.sql` (which asserts that one open attempt next to one passed submitted attempt yields 100%, not 50%).

### 4m. Badge icons reconciled with the config (migration `20260923170000_badge_icons.sql`)

- `badges.icon` is **not** authoritative: `src/config/badges.ts` is the slug → icon map that `/logros` and `/aprender` render from (`getBadgeVisual(slug)`). `getProgressSnapshot` still selects the column and passes it through as `badges[].icon`, but no component reads that field, so the column is documentation of intent for whoever reads the schema. If a consumer ever renders it, that consumer — not this note — decides who wins.
- Six rows seeded by `20260918210000_gamification.sql` named an icon the UI no longer uses, because building the config resolved collisions with icons reserved elsewhere in the design system (`Trophy` = desafío lesson kind, `CircleCheck` = correct-answer marker, `Layers` = intermediate level, `Award` = the badges feature itself). The migration updates `veinte-ejercicios → trending-up`, `seccion-completa → book-check`, `tres-secciones → library`, `racha-7 → calendar-range`, `racha-30 → flame`, `nivel-5 → medal`; the other six already matched.
- The column keeps the kebab-case lucide names it already held; the PascalCase components exist only in TypeScript. A data migration does not change a naming convention.
- Idempotent and loud: each `update` matches `slug` **and** an expected current value (old or new), and a `row_count <> 1` raises `P0002` naming the value actually found, so a missing or drifted slug cannot pass as a successful no-op. A final check raises `P0001` if any two active badges end up sharing an icon — the invariant the six changes exist to protect. Covered by two assertions in `supabase/tests/0005_gamification.test.sql`.

### 4n. Per-question quiz grading (migration `20260923140000_quiz_attempt_progress.sql`, D-33/D-34)

An attempt is now a session, not a single write. Four service-role RPCs own the lifecycle; the
learner keeps select-only grants on both tables and `insert/update/delete` are revoked, so every
write goes through them:

- `start_quiz_attempt(user, lesson, question_ids[])` → `(attempt_id, question_ids, resumed)`. Opens
  an attempt with the sample the server drew (`sampleQuestions` in `src/lib/quizzes/sampling.ts`),
  or returns the open one and **ignores** the proposed sample, so reloading cannot re-roll the
  questions. A concurrent second tab loses the unique index and resumes the same attempt.
- `record_quiz_answer(user, attempt, question, answer, is_correct)` → `(recorded, answered_count, total)`.
  Rejects a foreign attempt (`P0002`), a closed attempt and a question outside the stored sample
  (`P0001`); `recorded = false` means the question was already answered. Answers are final: that is
  what makes it safe to reveal the correct answer immediately after each one.
- `finalize_quiz_attempt(user, attempt, pass_threshold_percent)` → `(score, total, passed, already_submitted)`.
  Recomputes the score from the recorded answers **inside the database** (a client tally can never
  influence it), refuses an attempt with unanswered questions, closes it, and completes the lesson
  on a pass. Idempotent.
- `discard_quiz_attempt(user, attempt)` deletes an open attempt (answers cascade). Used only when
  the stored sample contains a question that has since been unpublished, which would otherwise
  leave an attempt nobody can finish. No reward exists before `finalize`, so this cannot farm XP.

Consequences: `check_section_completion` and `certificate_eligible` read `passed`, which is false
while an attempt is open, so neither needs changing. `admin_metrics.quiz_pass_rate` divided by all
attempt rows and therefore counted every open attempt as a failure; that was fixed in §4l, in the
same session. `quiz_answers` now fills progressively, so
the review queue (`/repaso`) reflects a wrong answer as soon as it is given.

**Answer-key surface (migration `20260923180000_questions_public_no_answer_key.sql`, security F-1).**
`theory_questions.pairs` is the grading key for `matching` questions, so the column grant to
`anon, authenticated` is revoked and `questions_public` no longer selects it: the server reads it
with the service role and delivers the left labels and the right candidates as two separate,
shuffled lists (`matchingSides()` in `src/lib/quizzes/service.ts`). The view is also no longer
granted to `anon` — it published every quiz prompt including paid sections, and nothing anonymous
in the product reads it. `pgTAP 0003` asserts the new posture where it used to assert the old one.

### 4o. Badge for a specific section (migration `20260925120000_badge_section_completed.sql`)

- New criteria kind `{"kind":"section_completed","section":"<slug>"}`, first used by
  `verificador-de-ia` (section `sql-con-ia`, D-40, owner approval 2026-09-25).
- "Section completed" has one definition, `completed_section_slugs(user)` (service role only): every
  **published exercise** of the section has `exercise_progress.status = 'completed'`; a section with
  no published exercises never counts. It is the query that used to sit inline in
  `evaluate_badges()`, moved verbatim, so the `sections_completed` count and the new slug criterion
  cannot disagree. It is **not** `check_section_completion()` (certificates), which also requires the
  section quizzes; badges never did.
- Backfill in the same migration: any learner whose completed set already contains a
  `section_completed` badge's section gets the badge (`on conflict do nothing`). Evaluation on the
  next reward would miss a learner who finished the section and earns nothing afterwards.
- No table, column, policy or table grant changed. `pgTAP 0015` covers not-earned-before,
  earned-on-completion, idempotency, no effect on other badges, and execute revoked from learners.

### 4p. Private exercise reports (migration `20260925150000_exercise_reports.sql`, D-42)

- «Reportar un problema con este ejercicio» writes one `exercise_reports` row with the learner's
  own session (server action `src/lib/reports/actions.ts`: Zod → session → rate limit
  `exercise-report:<uid>` → insert). It is one of the few learner-writable tables, on purpose: RLS
  (`with check (user_id = auth.uid())`) is what pins the reporter, not the application.
- Column-level grants: a learner may insert only `user_id, exercise_id, exercise_slug, category,
note, learner_sql`; the before-insert trigger (security definer) overwrites `exercise_slug` with
  the slug of `exercise_id` and forces `status = 'open'` with the `resolved_*` columns null, so the
  browser can neither forge the exercise reference nor file a report as already resolved.
- No learner update or delete policy. Admins read all and have an update policy, but the app
  resolves through `admin_resolve_exercise_report(report, actor, reason)` (service role only), which
  flips the status and writes `audit_logs` (`exercise_report.resolved`) in the same transaction and
  refuses an already resolved report (`P0002`).
- `exercise_id` is `on delete set null` and the slug is kept, so re-seeding or retiring an exercise
  never erases what learners reported. `user_id` cascades with the profile (the report is the
  learner's personal data).
- Indexes: `(user_id, created_at desc)`, `(status, created_at desc)` for the admin list,
  `(exercise_id)`. `pgTAP 0016` covers anon denied, own insert/read, cross-user insert and read
  denied, learner cannot set status or resolve, slug derived from the id, checks, admin reads all,
  audited resolve, no double resolve, and the FK delete rule.

## 5. Indexes (initial)

`attempts (user_id, exercise_id, created_at desc)`, `exercise_progress (user_id, status)`, `reward_ledger (user_id, created_at)`, `entitlements (user_id) WHERE revoked_at IS NULL`, `payment_events (provider, provider_event_id)`, `certificates (verification_code)`, `analytics_events (name, created_at)`, `lessons (section_id, sort_order)`, `daily_activity (user_id, activity_date desc)`, `profiles (created_at desc)`, `profiles (country) WHERE deleted_at IS NULL`, `certificates (user_id) WHERE revoked_at IS NULL`.

## 6. Data lifecycle and privacy

- Account deletion: `delete_user_data()` anonymizes `profiles` (alias → `usuario-eliminado-<short>`), deletes attempts/saved queries/analytics, keeps purchases and certificates with `recipient_name` retained only where legally needed (invoicing), and records the request in `data_requests`.
- Export: server job builds a JSON bundle of all learner-owned tables into a private bucket with a 24-hour signed URL.
- Retention: `query_executions` 180 days; `analytics_events` 24 months; `payment_events` payloads keep no card data (providers never send it).
