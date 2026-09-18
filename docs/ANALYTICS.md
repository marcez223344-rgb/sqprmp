# Analytics Specification (first-party)

Storage: `analytics_events (user_id NULL, anonymous_id, name, properties jsonb, created_at)`; written server-side only through `track(name, props)` which validates against the Zod schema in `src/lib/analytics/events.ts`. **No PII, no raw SQL, no emails** in properties. `anonymous_id` is a random cookie id linked to `user_id` after login.

| Event | Properties | Funnel |
|---|---|---|
| `page_viewed` | path (public pages only), referrer_domain | acquisition |
| `signup_started` | provider | signup |
| `signup_completed` | provider, country | signup |
| `onboarding_step_completed` | step (1–3) | onboarding |
| `onboarding_completed` | sql_level, main_goal, weekly_goal_minutes, age_band | onboarding |
| `exercise_started` | exercise_slug, difficulty, is_free | learning |
| `query_run` | exercise_slug, engine (browser/server), status (ok/error), duration_ms, sqlstate | learning |
| `exercise_submitted` | exercise_slug, status (correct/incorrect/error), attempt_number, feedback_categories[] | learning |
| `exercise_completed` | exercise_slug, attempts, hints_used, solution_revealed, minutes | learning |
| `hint_requested` | exercise_slug, level | learning |
| `solution_revealed` | exercise_slug, reason | learning |
| `lesson_viewed` | lesson_slug, kind | learning |
| `quiz_submitted` | lesson_slug, score, total, passed | assessment |
| `review_session_started` | question_count | assessment |
| `section_completed` | section_slug | progression |
| `certificate_issued` | requirement_slug | progression |
| `paywall_viewed` | trigger (limit_reached/locked_lesson/pricing_page), exercise_slug? | monetization |
| `checkout_started` | product_slug, provider, currency | monetization |
| `purchase_completed` | product_slug, provider, currency, amount_minor | monetization |
| `promo_redeemed` | kind | monetization |
| `streak_frozen` | length | engagement |
| `badge_earned` | badge_slug | engagement |

Owner dashboard queries (SQL views): signup conversion, onboarding completion, first exercise started/completed, free consumption, paywall→checkout→purchase, course completion, drop-off per section, hardest exercises (attempts, hint rate, reveal rate), frequent SQLSTATEs, weekly active learners, D1/D7/D30 retention.
