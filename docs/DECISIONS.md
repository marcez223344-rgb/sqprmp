# Decision Log (ADR-style)

Format: **D-nn · Title** — Status (Proposed / Approved / Rejected / Superseded) · Date · Context · Decision · Alternatives rejected · Consequences. Agents append here; owner approval changes status to Approved.

## Approved / proposed decisions

### D-01 · Free-exercise limit

Status: **Approved (owner, 2026-09-18)**
Context: brief said 3 in three places and 5 in one. Decision: `FREE_EXERCISE_LIMIT` in `src/config/limits.ts` = **5**, counted as distinct completed gated exercises, enforced server-side. Consequence: E2E journeys 7–8 and the free part of the curriculum use 5.

### D-02 · Technology stack

Status: Proposed · 2026-09-18
Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, shadcn/ui, Supabase (Postgres/Auth/RLS), `@supabase/ssr`, Zod, React Hook Form, CodeMirror 6, PGlite, `pgsql-ast-parser`, next-intl, `@react-pdf/renderer`, Vitest/RTL/Playwright, ESLint/Prettier, GitHub Actions, Vercel. Rejected: Monaco (heavy, weaker mobile/a11y), Prisma/Drizzle (Supabase generated types + RPC suffice; avoids second migration system), Redis (Postgres rate limiting suffices for MVP).

### D-03 · Safe SQL execution: hybrid PGlite (browser Run + server Submit)

Status: Proposed · 2026-09-18 · See [SQL_SANDBOX.md](SQL_SANDBOX.md). Rejected: RPC in app DB (isolation), separate service (cost), browser-only (grading trust). Fallback: second Supabase project with read-only role. Consequence: learner SQL never reaches the app database; datasets are versioned static snapshots.

### D-04 · Authorization model

Status: Proposed · 2026-09-18 · Single `authorize()` on the server + RLS mirror; admin via custom JWT claim; entitlements table is the only access source; free limit counted server-side.

### D-05 · Payment channels for MVP

Status: **Approved (owner, 2026-09-18): manual channel + Hotmart** · Owner facts: entity in Argentina, sell to all LATAM from day one, price ≈ US$20. Proposed: `manual` provider (ARS bank/Mercado Pago transfer, Wallbit USD, wire) with admin approval **plus** one automated Merchant-of-Record for cards (Hotmart recommended; Paddle alternative), all behind `PaymentProvider`; Mercado Pago Checkout Pro in Phase 6b. Rejected: Stripe (no Argentine sellers), Lemon Squeezy (no payouts to Argentina), subscriptions at launch. Also considered (2026-09-18, owner question): Gumroad — simple webhook ("Ping") integration, but ≈13% effective fees, cards-only in USD (no Mercado Pago/PIX), and no local-bank payouts to Argentina (PayPal only); kept as a fallback card provider if Hotmart onboarding fails. See [PAYMENTS.md](PAYMENTS.md) §2b–3.

### D-06 · Pricing

Status: **Approved (owner, 2026-09-18)** · Lifetime access ≈ **US$20** equivalent (local currency where a channel prices locally); promo/scholarship codes from day one.

### D-07 · Content volume at launch

Status: Proposed · 8 fully authored sections, 38 exercises + 8 challenges, ~104 questions, 3 datasets; all 39 sections visible as outlines. See [CURRICULUM.md](CURRICULUM.md).

### D-08 · Analytics

Status: Proposed · First-party `analytics_events` table with a documented spec ([ANALYTICS.md](ANALYTICS.md)); no third-party analytics in MVP. PostHog may be added later with a consent decision.

### D-09 · Legal pages

Status: **Partially answered (owner, 2026-09-19)** · The service is offered by the founder as an individual taxpayer (monotributo); "Data Minds Solutions" is a trade name, not a company. Legal drafts (`src/content/legal/*`) now name the founder as provider and mention type-C invoices. Still pending: street address and CUIT in `src/config/brand.ts` (the pages show a visible draft notice until then) and a lawyer's review of the wording. Jurisdiction assumed Argentina.

### D-10 · Rate limiting in Postgres

Status: Proposed · token-bucket RPC; revisit if Supabase compute becomes the bottleneck.

### D-11 · Certificates are non-accredited

Status: Proposed · wording "Certificado de finalización emitido por Data Minds Solutions"; no academic accreditation implied.

### D-12 · Claude Code operating system

Status: Proposed · 15 agents, 22 skills (doubling as slash commands), 4 hook scripts, 11 rules, 12 templates. See [CLAUDE_CODE_SETUP.md](CLAUDE_CODE_SETUP.md).

### P-2 · Visual direction

Status: **Approved (owner, 2026-09-18)** · Proceed with [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md); wordmark generated in-repo, replaceable via `src/config/brand.ts`.

### D-13 · Leaderboards deferred

Status: Proposed · Schema supports opt-in; UI not in MVP.

### D-14 · Curated avatars, no uploads

Status: Proposed · 24 illustrated avatars; uploads require moderation + storage security, deferred.

### D-15 · Analytics scope at launch

Status: **Accepted (2026-09-18)**. First-party events only, written server-side after Zod validation (docs/ANALYTICS.md). Not emitted at launch: `page_viewed` (would need an anonymous cookie id and a per-request write from the proxy; deferred until there is traffic worth measuring), `signup_started/completed` (Google OAuth happens off-site; `onboarding_completed` is the practical signup signal), `query_run` (browser runs never reach the server by design), `streak_frozen` (SQL-side). Owner metrics are computed on request by `admin_metrics()`; a materialized view is planned only if the RPC exceeds ~1 s.

### D-16 · Cloud environments and the assistant's operating authority

Status: **Accepted (2026-09-19)**. Single Supabase project `sqprmp` (ref `pgkbmhuehmotjctzjwxx`, Free, us-west-2) is the launch database (P-4: free tiers). Migrations 0001–0008 and seeds 0001–0003 were applied on 2026-09-19 with the CLI (`supabase migration up --linked`, `db query --file`); auth settings (custom access token hook, redirect URLs, email confirmations off, Google provider enabled) are managed from `supabase/config.toml` via `supabase config push` — the Google client id/secret are owner-provided env values, never committed. Code lives in `github.com/marcez223344-rgb/sqprmp`; Vercel team `sqprmp` (Hobby) hosts the app via the Git integration. The owner instructed: "do not ask me to type commands again … I approve you do it yourself" and "do not ask me permission for any more commands, I approve them all". The assistant therefore runs setup/deploy commands directly; the standing prohibitions that need a _fresh_ written go remain: production payment credentials, destructive/remote resets, force-push, pricing/legal changes.

### D-17 · Launch pricing (proposed, owner decides)

Status: **Proposed (2026-09-22)** — nothing in `src/config/pricing.ts` changed; changing price needs the owner's go (CLAUDE.md).

Market research (2026-09-22, sources in the session log): Coderhouse AR sells a _live_ 11-week SQL course at ARS 243.936 (~USD 163 discounted, list ARS 304.920); LearnSQL.es — the closest product shape, Spanish, browser exercises, lifetime — sells a single course at €29 and all-access at €99; Udemy Spanish SQL courses effectively sell at USD 10–15 but are video-only and the marketplace keeps ~68 %; Platzi ARS 359.900/year and DataCamp USD 168–336/year are subscriptions. Blue dollar 2026-09-22: ARS 1.535/1.555. Junior analyst salary in AR: ARS 450.000–900.000/month.

Recommendation: **USD 29 founder / USD 49 regular**, and **ARS 39.900 founder / ARS 69.900 regular** as an independent round number (not an FX conversion), with 3 cuotas sin interés on Mercado Pago. Founder price for the first 50 students with a _real_ counter, an intermediate step (USD 39 / ARS 54.900) for students 51–200, then full price. Keep the one-time model: the curriculum is finite, and neither bank transfer nor Wallbit supports recurring charges. USD 15 was rejected as sitting inside Udemy's commodity band while leaving no room to raise later.

Open: the owner's answer. Unverified in the research: Udemy's actual ARS pricing, Coderhouse "SQL Flex" self-paced price, Digital House's price, and whether the 30 % Ganancias perception on USD card spend still applies in 2026.

### D-18 · Parser gate rewrites INTERSECT/EXCEPT for analysis

Status: **Accepted (2026-09-22)** — reviewed twice by `security-engineer`
(`docs/reviews/2026-09-23-security.md`, review and re-review): no finding against
`normalizeSetOperators` in either pass; the set-operator positions are now also covered by the
standing traversal corpus.

`pgsql-ast-parser` 12 (the gate's parser) implements `UNION` / `UNION ALL` but has **no grammar for `INTERSECT` or `EXCEPT`**: every query using them failed the gate with a parse error, which made section 23 (operaciones de conjuntos) impossible to author or to practice. `src/lib/sandbox/gate.ts` now runs `normalizeSetOperators()` before `parse()`: outside string literals, dollar-quoted strings, quoted identifiers and comments, it replaces those keywords with a `UNION` variant of the **same length** (`INTERSECT` → `UNION` + padding, `EXCEPT ALL` → `UNION ALL`, …), so branches are parsed and visited exactly as written and the parser's line/column positions still match the learner's SQL.

Why this is safe: the rewrite only ever swaps one set-operator keyword for another, never changes structure, and execution always uses the **original** SQL (PGlite is real PostgreSQL and supports all four operators). Set-operator semantics are irrelevant to what the gate checks — statement kind, single statement, schemas, denied functions, locking clauses. Concept detection keeps working because both map to `set_operations`. Two known limitations: `INTERSECT`/`EXCEPT` split across lines from their `ALL`/`DISTINCT` modifier are handled as the plain form, and an `EXCEPT
DISTINCT` written across a line break would still fail to parse (educational error, no security impact).

Alternative considered and rejected for now: replacing the parser or writing a dedicated set-operation splitter — more code in the security-critical path for the same guarantee. Revisit if the parser gains the grammar upstream.

### D-19 · Parser gate supports named windows and interval frame bounds; OVER clauses are now analysed

Status: **Proposed (2026-09-22)** — needs review by `security-engineer`.

Three gaps in `src/lib/sandbox/gate.ts` blocked SQL that the published curriculum teaches (sections 25 and 27) and, in one case, let learner SQL through unchecked.

1. **Named windows.** `pgsql-ast-parser` has no grammar for `WINDOW w AS (...)` / `OVER w`, so every query using them got a parse error. `rewriteNamedWindows()` now blanks the clause (same length, line breaks preserved) and rewrites `OVER w` into `OVER ( )` of the same length, **only** for names actually declared in the clause, never inside literals, quoted identifiers or comments, never across a line break. The blanked definitions are **not** dropped: each one is parsed separately as `select count(*) over (<definition>)` and goes through the same statement-kind, schema and denied-function analysis, with its functions and tables merged into `GateResult` for concept detection. A definition that does not parse rejects the query (fail closed). The definition text is extracted with a depth-balanced scan, so it can never close its own parenthesis early and inject a second statement.
2. **Interval frame bounds.** `FRAME_BOUND` in `stripWindowFrames()` now also accepts `INTERVAL '…' PRECEDING|FOLLOWING`, `'…'::interval PRECEDING|FOLLOWING` and decimal numeric offsets. The grammar stays closed: the only learner-controlled part is a single-quoted literal with no embedded quote or newline, which is a complete token — no call, identifier or subexpression can hide inside, and a literal with `''` simply ends the match, leaves the frame in place and fails the parse. Frame matches that start inside a literal or a comment are now ignored, and blanking preserves line breaks (both were latent position bugs).
3. **Vulnerability fixed: `OVER (...)` was never visited.** `astVisitor`'s default traversal does not descend into a call's `over` node, so `select count(*) over (partition by pg_sleep(1))` **passed the gate** — no named window needed. The call handler now visits `over.partitionBy` and `over.orderBy` explicitly. Layers 1–2 and 5–7 (read-only role, ephemeral instance, statement timeout, hard worker kill) meant this was never a full escape, but it defeated layer 4 for any denied function or system-schema subquery placed in a window specification. Regression tests cover both the inline and the named-window form.

Execution always uses the **original** SQL; all rewrites are analysis-only. Known limitations (verified, no security impact): concept detection for a named window matches the inline form exactly (`over: {}` is still a window function), but AST-shape concepts that live **only inside** a blanked definition (a CASE in PARTITION BY, say) are not detected — function names are, because they are merged into `gate.functions`; and the gate drops frame clauses from the AST, so `required_concepts` cannot assert anything about frames — a "frame" concept would need a validator change (not done here).

**Review outcome (2026-09-23, `docs/reviews/2026-09-23-security.md`): changes required.** The
mandated review accepted D-18 unchanged and confirmed the `over` fix, but found two further
bypasses of the same class (the parser's default traversal skips a node) plus one control gap:

- **SEC-01 (High) — `DISTINCT ON (...)`** holds a full `Expr[]` that `AstDefaultMapper.selection()`
  never visits, so `select distinct on (pg_sleep(1)) a from t` passed the gate.
- **SEC-02 (High) — `FromCall.join`** is dropped by `AstDefaultMapper.fromCall()`, so the `ON`
  predicate of a JOIN hanging off a set-returning function was never analysed. Demonstrated end to
  end against PGlite with the `learner` role: the row count of `pg_catalog.pg_class` left the
  sandbox through the join column, a general numeric/oracle read channel.
- **SEC-03 (Low) — `FOR UPDATE/SHARE` inside a sublink** was missed by the hand-rolled
  `hasLockingClause()` walk (not exploitable: the `learner` role has `SELECT` only).

Fixed on 2026-09-23 in `analyzeStatement()`, all in the same `astVisitor` pass and with the same
ordering rule as the `over` fix (explicit `visitor.expr(...)` before `map.super()`): a `selection`
handler visits `distinct` when it is an array and records `for`; a `fromCall` handler visits
`join.on`. `hasLockingClause()` was deleted — locking is now detected wherever a select node
appears, including sublinks. **Two more unvisited nodes were found while building the regression
test** and fixed in the same change: `ExprRef.table` (a schema-qualified column reference such as
`pg_catalog.pg_tables.tablename` never reached the `tableRef` handler; not exploitable on its own,
since PostgreSQL still requires the table in `FROM`, but it defeated the schema allowlist as a
control) and `OnConflictAction.where` (the predicate of `INSERT ... ON CONFLICT DO UPDATE ... WHERE`
was not visited — relevant for the write exercises, where `insert` is in `allowed_statements`).

New standing regression: `tests/sandbox/traversal.test.ts` drives the gate from a list of **87
expression positions and 16 table positions**, asserting for each that (a) a harmless call planted
there is reported in `GateResult.functions`, (b) a denied function is rejected, (c) a system-schema
subquery or qualified reference is rejected, and (d) a reflection walk of the accepted AST finds no
call, table or schema the gate did not report. Adding a newly discovered position is one line. The
malicious corpus grew to 237 inputs (256 after the re-review fixes below) with every proof of concept from the review.

**Re-review outcome (2026-09-22, same file, section "Re-review — parser gate fixes"): Accepted**,
conditional on logging SEC-05 — satisfied by the fix below. SEC-01, SEC-02, the statement-level part
of SEC-03 and the two nodes found while building the regression are confirmed closed against the
real worker; no control was weakened; error-code priority is unchanged. The re-review raised three
new items, none of them caused by D-19:

- **SEC-05 (Low) — a locking clause inside a named window definition.** `analyzeStatement()` returned
  `locking`, but `gateSql()` kept only `inner.violation` from each window-definition analysis and
  discarded `inner.locking`, and the check ran before the definitions loop, so
  `select rank() over w from t window w as (partition by (select a from u for update))` returned
  `ok: true`. Not a regression (the old hand-rolled walk never saw window definitions either) and not
  exploitable (layer 5 answers `permission denied for table …`). **Fixed 2026-09-22:** `locking` is
  threaded through the definitions loop and the check moved after it, still ahead of the `violation`
  return so a locking clause keeps priority over a schema or function violation found in the same
  statement. Both proofs of concept are in the corpus.
- **SEC-06 (Medium)** — the schema allowlist did not deny the system catalog; see D-21.
- **SEC-07 (Info)** — three traversal positions did not plant their payload where their name said.
  `"AT TIME ZONE operand"`, `"JOIN USING, where"` and `"WITH ORDINALITY FROM item"` all wrote into
  `WHERE`, so they duplicated `"binary right operand"` instead of covering their node. No gap behind
  any of them (`AT TIME ZONE` is an ordinary `ExprBinary` with both operands visited, `using` is
  `Name[]`, `withOrdinality` is a boolean), but a coverage file whose labels are wrong is worse than a
  shorter one. **Fixed 2026-09-22:** `AT TIME ZONE` is now two positions that plant into the real left
  and zone operands; the other two are renamed for what they actually cover (the `WHERE` of a
  `USING` join) or re-targeted to the node's only expression (`FromCall.args`). The unnecessary
  `noQualifiedRef` flag was dropped, and the file header now states that the 87 positions map to
  roughly 55 distinct AST fields, plus an inventory of the fields that are unvisited and carry no
  expression (`ExprBinary.opSchema` / `ExprUnary.opSchema`, `OnConflictOnConstraint.constraint`,
  `SelectFromStatement.skip`, `JoinClause.using`, `FromCall.withOrdinality`).

Status: **Accepted (2026-09-22)**.

### D-20 · The sandbox session time zone is pinned to UTC

Status: **Proposed (2026-09-23)** — bug fix; recorded as a decision because it fixes the value of
already-published expected results and changes what a dataset's `timestamptz` columns mean.

Nothing pinned PostgreSQL's `TimeZone` in any of the three sandbox execution paths, so PGlite
inherited it from the host at initdb: `Etc/GMT+3` on the owner's machine (Argentina), `Etc/GMT0` on
GitHub Actions and on Vercel. `timestamptz` arithmetic and rendering are resolved in the session
zone, so the same correct query returned different rows depending on where it ran — most visibly
month arithmetic, where `TIMESTAMPTZ '2025-07-01 00:00:00+00' + INTERVAL '1 month'` is
`2025-08-01 00:00Z` under UTC and `2025-07-31 21:00-03` under `Etc/GMT+3`.

The damage ran through `content:verify`, not through grading: expected results were generated on
the owner's machine at `Etc/GMT+3` and committed, while the graded worker on Vercel runs at UTC.
Three exercises already in the committed seed carried expected results a UTC learner can never
produce (`cumplimiento-de-entregas-de-septiembre`, `dias-de-entrega-por-envio`,
`bebidas-por-ciudad-y-cocina`) — a correct answer was marked wrong. Three more were affected in
uncommitted content.

Decision: `sandbox-runtime/engine-core.mjs` pins the zone to `SANDBOX_TIME_ZONE = "UTC"`, as a
database default and on the open session at dataset load, and again on the session immediately
before every graded statement. That one file is the only PGlite setup path: the browser worker
imports a byte copy of it (`scripts/copy-pglite-assets.ts`), the `worker_threads` worker imports it
directly, and `scripts/content-verify.ts` imports it directly.

Alternatives rejected: setting `process.env.TZ=UTC` in npm scripts and CI (does not cover the
browser, and the value would then depend on the host again on a developer machine that missed it);
storing the authoring zone alongside each expected result (keeps three behaviours instead of
removing the variable); pinning per call site (three copies, which is how this was missed).

Consequences: UTC is now the sandbox's meaning of "local time", so an exercise about business hours
must say which zone it means in the statement rather than rely on the session. Datasets whose
`timestamptz` values were authored assuming an Argentine session will read three hours earlier in
wall-clock terms. Regression: `tests/sandbox/timezone.test.ts` (setting plus a zone-sensitive
result, per path); production can be checked with `GET /api/health/sandbox`, which now reports the
observed zone.

### D-21 · The parser gate denies the system catalog by relation name and by OID-alias cast, not only by schema

Status: **Accepted (2026-09-22)** — closes SEC-06 from the re-review in
`docs/reviews/2026-09-23-security.md`; enforcement chosen by the owner over acceptance.

Layer 4's documented control was "schema references outside `public` rejected", and the gate
implemented exactly that: it rejected an **explicit** schema. But `pg_catalog` is implicitly first in
every session's `search_path`, so a learner never has to write it. `select * from pg_tables`,
`select count(*) from pg_class`, `pg_settings`, `pg_roles`, `pg_type` and
`select * from t join generate_series(1,5000) g on g = (select count(*) from pg_class)` all passed
the gate and executed as `learner` on the real worker: 461 `pg_class` rows, 380 settings including
`listen_addresses`, `port` and `ssl`, 18 role names, 3413 `pg_proc` rows. Credentials were never
reachable — `pg_authid` and `pg_shadow` are denied by the role, and `current_setting` by the layer-5
`REVOKE` — and the instance is ephemeral, single-tenant and holds only public dataset data, which is
why the re-review rated it Medium. It also means the earlier SEC-02 exploit had a schema-free twin
that the SEC-02 fix did not touch.

Decision: enforce the control the docs claimed. `tableRef` now rejects an **unqualified** relation
name matching `^pg_` (and one literally named `information_schema`), with the Spanish message "El
catálogo del sistema (…) no está disponible; usa las tablas del dataset." Verified against all four
dataset snapshots (38 tables: TiendaViva, Bolsillo, Pídelo, Ritmo) — none is named `pg_*`, and no
authored exercise or solution references `pg_` or `information_schema`, so nothing legitimate is
rejected. `npm run content:verify` stays green.

The same decision covers the smaller channel the re-review named alongside it: the OID-alias cast
family. `select 'customers'::regclass::oid`, `select 'public'::regnamespace::text` and
`select 1::oid::regrole::text` read the catalog while naming neither a schema nor a relation.
**Blocked**, for the same reason: resolving a name against the system catalog is the _only_ thing
`regclass`/`regnamespace`/`regrole`/`regproc`/… do, so there is no legitimate analytics use to lose;
leaving them would have kept open exactly the channel just closed for `pg_*` relations. The list is
enumerated explicitly rather than matched as `^reg`, so a dataset column, alias or type named
`region`, `registro`, … is never caught (covered by a test). Implementing it required visiting
`ExprCast.to`, which the default traversal drops, so the cast target's **schema** is now checked too
(`select '1'::information_schema.cardinal_number` was previously accepted).

Alternative rejected: accept the exposure and soften the §4 wording. The information is not secret,
but "system schemas denied" is a control learners, reviewers and the next engineer rely on, and the
enforcement costs one comparison per table reference with a provably empty false-positive set.
Residual risk, accepted and explicit: this is a **name-based** rule at layer 4, not a permission. A
future catalog relation not named `pg_*` would slip past it; layer 5 (`learner` role, `REVOKE
EXECUTE`, ephemeral instance) remains the control that actually holds. Corpus: 17 new inputs in
`tests/sandbox/gate.test.ts`.

### D-22 · The catalog is denied by function name too, by prefix rather than by list

Status: **Accepted (2026-09-22)** — closes SEC-08 from the final pass in
`docs/reviews/2026-09-23-security.md`.

D-21 closed two of the three spellings of a catalog read: the relation (`pg_settings`) and the cast
(`::regclass`). The third, the **function**, was untouched, because the gate's `call` handler only
ever checked `DENIED_FUNCTIONS` plus an explicit schema. Executed as `learner` on PGlite 0.5.8 /
PG 18.3 with `lockDown()` applied, the gate said `ok` and the engine answered:
`pg_show_all_settings()` → the same 380 settings as `pg_settings`, including
`listen_addresses = localhost`, `port = 5432` and `ssl = off`; `pg_get_userbyid(10)` → `postgres`;
`to_regclass('customers')::oid` → `16384`; `regclass('customers')` → `customers`;
`pg_stat_get_activity(null)` → 1 row. Pre-existing, not a D-21 regression — but it made the §4
sentence read as if the catalog were closed when it was closed only against two of three names.

Decision: deny catalog functions **by prefix**, `pg_` and `to_reg`, unqualified or
`pg_catalog`-qualified, plus the eleven OID alias types written in function syntax. A prefix rule
rather than the enumeration the review suggested, for one reason: an enumeration reopens silently
on a PGlite upgrade that adds a function, which is the same drift the review flagged for the alias
list. `pg_` alone is insufficient (`to_reg*` does not match it) and the two prefixes together cover
all 416 catalog-resolver functions this engine ships. The prefixes live in
`sandbox-runtime/denied-functions.mjs`, so the layer-5 `REVOKE EXECUTE` applies the same rule
(`permission denied for function pg_show_all_settings` as `learner`, verified) and the two layers
cannot disagree.

Verified before shipping, because the review warned about it: the broadened `REVOKE` does **not**
break `lockDown()`. Its `p.oid::regprocedure` is a cast, not a call — no EXECUTE is checked — and
the block runs as the instance owner, whose privileges a `REVOKE ... from public, learner` cannot
reduce. `lockDown()` was run twice on the same instance (idempotent), and after it the learner
still runs ordinary SQL: `content:verify` re-executes all **202** authored solutions against the
four snapshots, green, and `tests/sandbox` is 41/41.

Over-blocking is bounded and checked: no authored exercise calls a `pg_*` or `to_reg*` function, a
learner cannot create one (`revoke create on schema public`), the alias block is an exact-name match
so `region`, `registro`, `regexp_*` and the `regr_*` statistical aggregates are untouched, and
`to_char` / `to_date` / `to_timestamp` / `to_number` do not match `to_reg`. All are in the corpus.

Residual risk, accepted and explicit, and the same shape as D-21's: this is still a **name** rule at
layer 4. A catalog function named outside `pg_*` / `to_reg*` would slip past it; layer 5 (`learner`
role, prefix `REVOKE EXECUTE`, ephemeral single-tenant instance) is the control that actually holds.
One spelling has **no** layer-5 control at all: PostgreSQL parses `regclass('customers')` as a cast
in function syntax, so no EXECUTE privilege is consulted — verified by revoking the function and
watching the call still succeed. For that one the gate is the only line, and it is a name match.
Drift is now a test rather than a promise: `tests/sandbox/catalog.test.ts` boots the real engine and
fails if `pg_type` holds an OID alias the gate would accept, or if `pg_catalog` holds a resolver
function it would let through.

SEC-09 (Info, same report) is answered in the message, not in the rule: a CTE named `pg_x` stays
rejected — exempting CTE names would mean tracking declared names through every scope in the
security-critical path, and a CTE that shadows a catalog name is worth rejecting anyway — and the
Spanish message now adds "los nombres que empiezan con pg_ están reservados: tampoco puedes usarlos
para nombrar un CTE". Corpus: 23 new malicious inputs and 8 new legitimate ones in
`tests/sandbox/gate.test.ts` (279 total).

### D-23 · Prose is rewritten for a reader meeting the idea for the first time

Status: Accepted (owner feedback, 2026-09-23). See `docs/CONTENT_GUIDELINES.md` §9.

The owner rejected two passages as "not clear enough and lacking context" and supplied his own
rewrites. Both originals were factually correct; what failed was that they used a term in the
sentence that introduced it ("leer su esquema"), left acronyms and qualified identifiers
unexpanded (`PK`, `orders.customer_id`), and closed on a compressed contrast instead of naming the
consequence ("uno que no, multiplica filas sin darse cuenta").

Seven rules follow from those two examples and are now binding on all authored prose. The reference
implementation is the "Por qué importa" paragraph and the PK/FK bullets of
`anatomia-de-una-tabla` in `src/content/lessons/tablas-filas-columnas-tipos.ts`. All 37 lesson files
were passed against the rules.

One correction to the owner's own example, applied deliberately: he wrote that
`orders.customer_id` "apunta a la columna `customer_id` en la tabla `customers`". A foreign key
points at the _primary key_ of the other table, which in TiendaViva is `customers.id`. The
published text uses the correct target with his explicit-naming style.

Cost: lessons grew roughly 20–35 % and several now sit close to the 900-word cap that
`content:validate` enforces. That cap is the brake on this rule turning into padding.

### D-24 · The learning path recommends an order; it does not enforce one

Status: Accepted (owner feedback, 2026-09-23).

`/ruta` told the learner "Avanza en orden: cada sección desbloquea la siguiente." No such gate
exists: `canReadLesson` and `can_access_exercise` decide on published/free/entitled/free-limit
only, never on whether the previous section was completed. The owner asked what happens to someone
who wants to start with an advanced topic — the honest answer is "nothing stops them", so the copy
now says the order is a recommendation and that any section can be entered directly.

Rejected: adding real sequential locking. The audience is working adults who often arrive to fill
one specific gap (window functions, a join they keep getting wrong); making them replay
fundamentals to reach it would cost more than the pedagogical tidiness is worth. Prerequisites
stay visible as guidance in each lesson.

### D-25 · The login screen does not advertise the free limit

Status: Accepted (owner feedback, 2026-09-23).

The subtitle read "Los primeros 5 ejercicios son gratis." Two problems: login is a post-decision
moment, where naming a ceiling reads as a restriction rather than an offer; and the number is
wrong in the learner's favour — `limits.freeExerciseSections` makes two whole sections free on top
of the five gated exercises, so "the first 5" understates what they get. The subtitle now explains
that the account is created on the spot and that no card is needed. The free offer is still stated
on the landing, pricing, FAQ and "cómo funciona" pages, where the learner is actually deciding.

Open: the same understatement is on the landing page (`home.hero.note`) and the pricing page
intro. Changing marketing copy about the offer is the owner's call, so it is left as it is and
raised in the pending table.

### D-26 · The avatar set grows to 116, appended rather than reshuffled

Status: Accepted (owner feedback, 2026-09-23). Extends D-14.

Added 8 abstract compositions × 4 palettes (32), 5 character styles × 4 skin tones (20) and 8
mascots with a Latin American accent (8): 56 → 116. Still generated SVG only — no third-party art,
no licensing question, deterministic output.

The new entries are emitted by separate arrays (`extraShapes`, `extraCharacterAvatars()`) that run
_after_ everything that existed before, so every pre-existing slug keeps its `sort_order` and no
learner's grid position moves. Verified: the first 56 rows of `supabase/seed/0001_avatars.sql` are
byte-identical to the previous version.

The picker is now a scrollable region capped at `max-h-72`; 116 tiles in an 8-column grid would
otherwise have buried the rest of the onboarding step.

Deployment note: avatars live in a table, so the new rows only appear after
`npx supabase db query --linked --file supabase/seed/0001_avatars.sql` is run. The seed is
idempotent on `slug`.

### D-27 · Revealing the solution with no hints spent warns first

Status: Accepted (owner feedback, 2026-09-23).

The owner asked whether offering the solution to someone who has not tried a single hint makes
sense. The escape hatch stays — a learner stuck at midnight who cannot see the answer simply
leaves — but the confirmation now points at the cheaper option when `hints.length === 0`: a hint
costs 10 % of the exercise XP and leaves the exercise solvable, revealing costs 75 % of it.

Rejected: requiring a hint before the reveal. It converts a nudge into a wall, and the learner who
genuinely already knows the answer and wants to check it is punished for the learner who does not.

## Owner-only follow-ups from 2026-09-23

- **`SUPABASE_SECRET_KEY` is invalid in production** (see the runbook note in
  `docs/DEPLOYMENT.md`). `/api/health/access` returns `read_exercise: "Invalid API key"`, which is
  why every hint request and every submission shows "No pudimos verificar tu acceso ahora mismo":
  `can_access_exercise` runs through the service-role client and fails, and the action reports
  `unavailable`. The value must be copied from the Supabase dashboard; `npx supabase projects
api-keys` returns it masked and the masked string is what is currently deployed.

## Pending owner decisions (need an answer before the referenced phase)

| #    | Question                                                                                                                                                                                                                                                                                                                       | Needed by       | Default if no answer               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ---------------------------------- |
| D-09 | Street address + CUIT for legal pages; lawyer review of the drafts. **Owner, 2026-09-22: not published for now** — `brand.legalAddress`/`taxId` are empty, the texts identify the provider by name + support email, and the draft banner is off. Required before charging in Argentina (Ley 24.240 and AFIP e-commerce rules). | Before charging | Name + support email only          |
| P-1  | Domain name (e.g. `academia.dataminds…`)?                                                                                                                                                                                                                                                                                      | Phase 9         | Vercel subdomain                   |
| P-3  | Google Workspace / support email for OAuth consent screen                                                                                                                                                                                                                                                                      | Phase 2         | Owner's Gmail                      |
| P-4  | Free tiers for soft launch. **Owner, 2026-09-22: stay on Vercel Hobby while testing with first customers, upgrade later.** Hobby's terms forbid commercial use, so the risk (project suspension on review, no SLA) is accepted knowingly; Supabase Free pauses after 7 days idle — the nightly keep-alive covers it.           | Before scaling  | Free tiers, keep-alive workflow on |
| P-5  | Content style: use "tú" (recommended) or "usted"?                                                                                                                                                                                                                                                                              | Phase 3         | "tú"                               |
| D-17 | Launch price: USD 29 founder / USD 49 regular, ARS 39.900 / ARS 69.900 (recommended above) — or a different number                                                                                                                                                                                                             | Before selling  | Current USD 20 stays               |
| D-28 | Refund window: keep the 10-day refund promise in the terms? In Argentina the 10-day revocation right for online consumer sales is **mandatory** (Ley 24.240 art. 34), so removing the sentence removes the disclosure, not the obligation. Recommendation: keep it, reworded as the legal right rather than a company promise. | Before charging | Text stays as it is                |
| D-29 | Landing and pricing copy says "{free} ejercicios gratis", which understates the offer (two whole sections are free on top of the five gated exercises). Restate it?                                                                                                                                                            | Before launch   | Current wording stays              |
| P-6  | Certificate name shown: founder as "Instructor" and company as issuer?                                                                                                                                                                                                                                                         | Phase 7         | Yes                                |

## Rejected alternatives (summary)

Monaco editor · Prisma/Drizzle · Redis for rate limits · Stripe · Lemon Squeezy (no AR payouts) · subscriptions-first · RPC-based learner SQL in the app DB · third-party analytics by default · avatar uploads · leaderboards at launch.
