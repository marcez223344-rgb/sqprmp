# Positioning review — widening the audience to every Spanish speaker

Date: 2026-09-24 · Author: `architect` (marketing positioning and copy pass)
Scope: **read-only audit + proposed copy.** No source file was modified by this review. The only
file written is this one.

Owner instruction (2026-09-24, verbatim): _"i would like to welcome everyone who speaks spanish,
i understand data is related to latin america and that is fine i do not want you to do any changes
to the database, but from a marketing perspective i want everyone to feel welcome"_ and _"the main
goal here is to try to attract any customer that want to use it, it would be so dumb to make them
go away"_.

The brief is settled: **maximise the addressable audience of Spanish speakers.** Datasets,
currencies (ARS/MXN/COP) and cities stay exactly as they are. Only the description of the product
changes.

> **Skills note.** The task asked for the `marketing:brand-review` and `design:ux-copy` skills.
> Neither exists in this installation — `.claude/skills/` holds the 22 project skills (all
> engineering/workflow) and the synced personal skill pack contains `brand-guidelines` and
> `canvas-design`, which are visual-identity tools, not positioning ones. This review was done
> without them; if the owner wants those two skills they have to be authored.

---

## 1. The trade-off, stated once

Specificity sells. "Datos de e-commerce, fintech y delivery de América Latina" is the single line
that separates this from the dozens of generic Spanish SQL courses, and it is the line a Mexican or
Argentine buyer recognises as _made for me_. Softening it costs some of that edge and some LATAM
long-tail SEO. The counterweight is arithmetic: Spain alone is roughly 47 million Spanish speakers
with far higher card-payment willingness, plus US Hispanics, and every one of them who reads
"América Latina" in the hero as an eligibility rule leaves without clicking. The owner has weighed
this and chosen reach. **The rest of this document serves that decision.**

The way to keep most of the specificity while removing the exclusion is a single move, applied
consistently below: **"América Latina" stops describing _the audience_ and only ever describes
_the data_** — and it appears where a buyer is already reading detail (FAQ, /nosotros,
/como-funciona, the demo), never in the hero, the meta description, the footer tagline or
`brand.description`. That also keeps the copy honest: a learner in Madrid will meet `ARS`, `COP`
and Bogotá in the exercises, and will have been told so before paying.

The reframing that does the work: multiple currencies and countries are not parochialism, they are
**realistic analytical difficulty**. Any analyst anywhere has to handle several currencies, time
zones and messy regional data. Said that way, the LATAM dataset is a feature for a reader in Spain
instead of a signal that the course is not for them.

---

## 2. Full inventory of audience/region statements

Every place the product states who it is for or where it is from. Nothing else in the codebase
matches `América|latino|latina|LATAM|Argentina|región` in a marketing surface — public page `.tsx`
files carry no hardcoded region strings (verified: all region copy lives in messages/config).

### 2.1 Blocking — reads as an audience restriction (change)

| #   | Location                        | Key / field               | Surface                                                                                  |
| --- | ------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | `src/messages/es-419.json:42`   | `landing.hero.subtitle`   | Landing hero — the string the owner reacted to                                           |
| 2   | `src/messages/es-419.json:38`   | `landing.metaDescription` | `<meta description>` on every page (root layout) + landing OG description                |
| 3   | `src/messages/es-419.json:34`   | `footer.madeIn`           | Footer, every page                                                                       |
| 4   | `src/config/brand.ts:10`        | `brand.description`       | Product description of record; the string any future OG/JSON-LD/store listing will reuse |
| 5   | `src/messages/es-419.json:1488` | `about.company.body`      | `/nosotros` — the second string the owner reacted to                                     |
| 6   | `src/messages/es-419.json:1465` | `about.intro`             | `/nosotros` lead paragraph                                                               |
| 7   | `src/messages/es-419.json:356`  | `curriculum.intro`        | `/curriculo` lead paragraph                                                              |
| 8   | `src/config/founder.ts:4`       | `founder.bio`             | Rendered on **both** the landing founder card and `/nosotros`                            |

### 2.2 Describes the data, not the audience — keep, with a light edit

| #   | Location                        | Key                          | Note                                                                                                                               |
| --- | ------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 9   | `src/messages/es-419.json:703`  | `demo.intro`                 | "marketplace ficticio de América Latina" — the reader is already inside the product looking at the data. Small edit for tone only. |
| 10  | `src/messages/es-419.json:1471` | `about.principles.real.body` | Already frames currencies as realism. Strengthen rather than remove.                                                               |

### 2.3 Payment/currency copy that excludes by implication (see §5)

| #   | Location                        | Key                    | Problem                                                                                                                            |
| --- | ------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 11  | `src/messages/es-419.json:813`  | `pricing.faq.manual`   | Lists only ARS channels + Wallbit; a reader outside Argentina concludes they cannot pay                                            |
| 12  | `src/messages/es-419.json:1551` | `faq.items.payments.a` | Same, **and** promises Hotmart card checkout that D-32 disabled at launch                                                          |
| 13  | `src/messages/es-419.json:815`  | `pricing.faq.refund`   | Says **7 días**; `brand.refundDays` is **10** (Ley 24.240 floor). Under-promising a legal right, and inconsistent with `/terminos` |

### 2.4 Correctly Argentine — do **not** touch

`src/content/legal/terminos.ts` (governing law, jurisdiction), `src/content/legal/privacidad.ts`
(data-transfer disclosure, AAIP), `brand.jurisdiction`, `brand.legalName`, `brand.refundDays`,
`brand.defaultTimezone`, `src/config/pricing.ts` (ARS price, transfer details). These are legal and
operational facts. `/terminos` §12 already ends with _"sin perjuicio de los derechos que te
correspondan como consumidor en tu domicilio"_, which is the right handling for a foreign buyer.

### 2.5 Adjacent findings (not positioning, worth fixing while someone is in the file)

- `src/config/founder.ts:8` — `links.website: "https://dataminds.example"` is a **placeholder
  domain**. Nothing renders it today (the `/nosotros` card renders only LinkedIn), but it is one
  line of JSX away from shipping a dead link. Replace with `brand.website` or delete the field.
- `certificates.issue.errors.not_eligible`: _"Todavía no **cumplís** todos los requisitos"_ — voseo,
  violates CLAUDE.md rule 6 (neutral es-419, "tú"). Should be `cumples`.
- `curriculum.intro` says "datos de negocio **reales**", while `/nosotros` and the landing correctly
  say the companies are fictitious but credible. Fix to `realistas` — it is also a claim risk.
- `src/config/countries.ts` has España, Estados Unidos and Puerto Rico plus "Otro país", so
  onboarding does not exclude anyone. A Spanish speaker in Canada lands on "Otro país", which is
  functional. Adding CA/other countries is optional and is a separate config change, not copy.

---

## 3. Copy table — key → current → proposed

Neutral es-419, "tú", no Spain-specific vocabulary, no invented numbers, no testimonials, no
reassurance tics. Placeholders (`{free}`, `{org}`, `{product}`, `{email}`) are preserved exactly.

### 3.1 Landing

| Key                                    | Current                                                                                                                                                                        | Proposed                                                                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `landing.hero.subtitle`                | Practica con datos de e-commerce, fintech y delivery de América Latina. Ejecuta consultas en el navegador, recibe retroalimentación útil y consigue certificados verificables. | **Practica con datos de negocio realistas: e-commerce, fintech y delivery. Ejecuta consultas en el navegador, recibe retroalimentación útil y consigue certificados verificables.**                                           |
| `landing.metaDescription`              | Ejercicios prácticos con datos de empresas latinoamericanas, retroalimentación inmediata, pistas progresivas y certificados verificables.                                      | **Curso de SQL en español: ejercicios prácticos con datos de empresas realistas, retroalimentación inmediata, pistas progresivas y certificados verificables.**                                                               |
| `landing.benefits.title`               | Diseñado para personas que trabajan con datos                                                                                                                                  | **Para quien trabaja con datos, en cualquier país**                                                                                                                                                                           |
| `landing.benefits.items.practice.body` | Cada ejercicio parte de una pregunta de negocio con datos ficticios pero creíbles: pedidos, pagos, clientes, cohortes.                                                         | **Cada ejercicio parte de una pregunta de negocio con datos ficticios pero creíbles: pedidos, pagos, clientes, cohortes. Vas a trabajar con varias monedas y países, como en cualquier empresa con operación internacional.** |

`landing.benefits.title` is the one place on the landing where the new "any country" message is
stated positively instead of merely omitted. That matters: silence removes the exclusion, a single
explicit line removes the doubt.

### 3.2 Footer

| Key             | Current                                      | Proposed                                                        |
| --------------- | -------------------------------------------- | --------------------------------------------------------------- |
| `footer.madeIn` | Hecho en América Latina para toda la región. | **Hecho en América Latina, para quien aprende SQL en español.** |

Rationale: origin is authentic and worth keeping — the problem was "**para** toda la región", which
named the audience. Alternative if the owner prefers to drop origin entirely: _"Para quien aprende
SQL en español."_ Recommendation: keep the origin.

### 3.3 `brand.ts` and `founder.ts` (config, not messages)

| Field                   | Current                                                                                                                                                                                        | Proposed                                                                                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `brand.description`     | Plataforma de aprendizaje de SQL para profesionales de América Latina: ejercicios con datos de negocio realistas, retroalimentación inmediata y certificados verificables.                     | **Plataforma de aprendizaje de SQL en español: ejercicios con datos de negocio realistas, retroalimentación inmediata y certificados verificables.**                                                                                                         |
| `brand.tagline`         | Aprende SQL con datos reales de negocio                                                                                                                                                        | **unchanged** — no region signal, and it is the strongest line in the brand                                                                                                                                                                                  |
| `founder.bio`           | Especialista en datos y SQL con experiencia en analítica de negocio en América Latina. Creó Data Minds SQL Academy para que más personas accedan a una carrera en datos con práctica realista. | **Especialista en datos y SQL. Dirige Data Minds Solutions, una consultora de datos e inteligencia artificial con más de 15 años de experiencia, y creó Data Minds SQL Academy para que más personas accedan a una carrera en datos con práctica realista.** |
| `founder.links.website` | `https://dataminds.example`                                                                                                                                                                    | **`https://www.datamindssolutions.com/`** (or delete the field and read `brand.website`)                                                                                                                                                                     |

Note on the 15-year claim: `datamindssolutions.com` states "más de 15 años de experiencia" about the
consultancy. The wording above attributes it to the consultancy, which is exactly what the public
site says. Attributing it to Marcelo personally would go one step beyond the source — it is almost
certainly true for a solo consultancy, but it is his call, so it is listed in §6.

### 3.4 `/nosotros`

| Key                              | Current                                                                                                                                                                                                | Proposed                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `about.intro`                    | {product} nace de una convicción: SQL se aprende resolviendo problemas de negocio reales, con datos que se parecen a los de una empresa latinoamericana y con retroalimentación que explica el porqué. | **{product} nace de una convicción: SQL se aprende resolviendo problemas de negocio reales, con datos que se parecen a los de una empresa de verdad y con retroalimentación que explica el porqué. El curso es en español y está abierto a cualquier país; los datos de práctica son de empresas latinoamericanas, con sus monedas y sus ciudades.** |
| `about.company.body`             | {org} es una consultora de datos con base en Argentina que trabaja con equipos de toda América Latina. La academia es nuestra forma de compartir lo que enseñamos en proyectos reales.                 | **{org} es una consultora de datos e inteligencia artificial con más de 15 años de experiencia, con base en Argentina y proyectos con equipos de distintos países. La academia es nuestra forma de compartir lo que enseñamos en esos proyectos.**                                                                                                   |
| `about.company.site` _(new key)_ | —                                                                                                                                                                                                      | **Conoce la consultora**                                                                                                                                                                                                                                                                                                                             |
| `about.principles.real.body`     | Tres empresas ficticias pero verosímiles: un marketplace, una billetera digital y un delivery. Monedas, estacionalidad y problemas de calidad reales.                                                  | **Tres empresas ficticias pero verosímiles: un marketplace, una billetera digital y un delivery, con operación en varios países de América Latina. Varias monedas, estacionalidad y problemas de calidad de datos reales: la misma complejidad que vas a encontrar en cualquier empresa.**                                                           |

`about.intro` is where the bait-and-switch is neutralised: the buyer is told, before paying, that
the exercise data is Latin-American — and in the same sentence that this is not a restriction on who
may enroll.

### 3.5 `/curriculo`

| Key                | Current                                                                                                                                                                                                                   | Proposed                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `curriculum.intro` | Seis niveles, treinta y nueve secciones. Cada sección combina teoría breve, ejercicios sobre datos de negocio reales de América Latina y un quiz. Las secciones marcadas como «Próximamente» se publican semana a semana. | **Seis niveles, treinta y nueve secciones. Cada sección combina teoría breve, ejercicios sobre datos de negocio realistas y un quiz. Las secciones marcadas como «Próximamente» se publican semana a semana.** |

### 3.6 `/demo`

| Key          | Current                                                                                                                                                                                                                                                      | Proposed                                                                                                                                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo.intro` | Este es el dataset TiendaViva, un marketplace ficticio de América Latina. Las consultas se ejecutan en un PostgreSQL real dentro de tu navegador: nada sale de tu computadora. Inicia sesión para resolver ejercicios con validación, pistas y certificados. | **Este es el dataset TiendaViva, un marketplace ficticio con operación en varios países de América Latina. Las consultas se ejecutan en un PostgreSQL real dentro de tu navegador: nada sale de tu computadora. Inicia sesión para resolver ejercicios con validación, pistas y certificados.** |

### 3.7 `/preguntas-frecuentes`

| Key                              | Current                                                                                                                                                                                                                                      | Proposed                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `faq.items.who.a`                | Para personas adultas que trabajan o quieren trabajar con datos: análisis, producto, finanzas, operaciones, marketing. No necesitas saber programar; empezamos desde cero y llegamos a funciones de ventana, cohortes y casos de entrevista. | **Para personas adultas que trabajan o quieren trabajar con datos: análisis, producto, finanzas, operaciones, marketing. Vivas donde vivas, si trabajas en español el curso es para ti. No necesitas saber programar; empezamos desde cero y llegamos a funciones de ventana, cohortes y casos de entrevista.**                                                                                                                               |
| `faq.items.region.q` _(new key)_ | —                                                                                                                                                                                                                                            | **¿Sirve si no vivo en América Latina?**                                                                                                                                                                                                                                                                                                                                                                                                      |
| `faq.items.region.a` _(new key)_ | —                                                                                                                                                                                                                                            | **Sí. El curso es en español neutro y el SQL que enseñamos es PostgreSQL estándar, igual en cualquier país. Los datos de práctica son de empresas latinoamericanas ficticias, así que vas a ver pesos argentinos, pesos colombianos y ciudades de la región; eso agrega una dificultad útil, porque trabajar con varias monedas y zonas horarias es parte del trabajo real con datos. Nada de lo que aprendes depende del país donde estés.** |

Placement: insert `region` immediately after `who` in the FAQ order, so it is the second thing a
doubting reader sees. The FAQ page renders items from an ordered list in the page component, so
`frontend-engineer` must add `"region"` to that array as well as the strings to the JSON.

### 3.8 Payments copy (see §5 for the underlying decision)

| Key                    | Current                                                                                                                                                                                                                         | Proposed                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pricing.faq.refund`   | Reembolsos: si el curso no es para ti, escríbenos dentro de los 7 días de la compra y te devolvemos el dinero.                                                                                                                  | **Reembolsos: si el curso no es para ti, escríbenos dentro de los {refundDays} días de la compra y te devolvemos el dinero.** (requires passing `refundDays: brand.refundDays` at the call site — it is already passed to `faq.items.refund.a`)              |
| `pricing.faq.manual`   | Transferencias: aceptamos transferencia bancaria y Mercado Pago en pesos argentinos y Wallbit en dólares. Un humano revisa cada pago; por eso puede tardar unas horas.                                                          | **Transferencias: aceptamos transferencia bancaria y Mercado Pago en pesos argentinos, y Wallbit en dólares desde cualquier país. Revisamos cada pago a mano, así que puede tardar unas horas.**                                                             |
| `faq.items.payments.q` | ¿Cómo puedo pagar desde mi país?                                                                                                                                                                                                | **unchanged** — the question is already the right one                                                                                                                                                                                                        |
| `faq.items.payments.a` | Con tarjeta a través de Hotmart (acepta cuotas y métodos locales según el país) o por transferencia: banco o Mercado Pago en pesos argentinos y Wallbit en dólares. Las transferencias se validan manualmente en horas hábiles. | **Por transferencia: banco o Mercado Pago en pesos argentinos, o Wallbit en dólares desde cualquier país. Validamos las transferencias a mano en horas hábiles. Si ninguno de esos medios te sirve, escríbenos a {email} y coordinamos otra forma de pago.** |

The Hotmart sentence has to go regardless of positioning: D-32 launches with manual transfer only,
`enabledPaymentProviders = ["manual"]`, and the page currently promises a card checkout that is not
there. Promising a payment method that does not exist is worse for conversion than offering one
fewer. The `{email}` sentence is the smallest honest commitment that stops a non-Argentine buyer
from bouncing; it commits only to answering an email, which support already does.

---

## 4. The consultancy — placement and wording

`https://www.datamindssolutions.com/` (verified live; already in `brand.website`). It answers "who
is teaching me and why should I trust them", which nothing on the site currently does — the
`/nosotros` founder card renders an initials avatar, a one-line bio and a LinkedIn link, and
`founder.links.website` points at a placeholder domain. For a US$20 purchase from an unknown brand,
a real consultancy with 15 years behind it is the strongest trust asset available, and it is
currently invisible.

Four placements, in priority order.

**1. `/nosotros` → "La empresa" section (required).** Use the rewritten `about.company.body` from
§3.4 and add a link below it, in the existing contact line, with the new key `about.company.site`
("Conoce la consultora") pointing at `brand.website`, `target="_blank" rel="noreferrer"`, with the
`ExternalLink` icon already imported in that file. It should sit before the `mailto:` and LinkedIn
links, since it is the primary destination.

**2. Landing founder card (required).** The card renders `founder.bio`; with the §3.3 rewrite the
consultancy is named in the bio itself, so no extra link is needed there — the card's "Conoce a
Marcelo" button already routes to `/nosotros`, where the link lives. This is deliberate: one
outbound link on the landing page is one way to lose a visitor.

**3. Footer (recommended).** Add one line under the existing `founder.role · founder.name`:

| Key                              | Proposed                                             |
| -------------------------------- | ---------------------------------------------------- |
| `footer.consultancy` _(new key)_ | **Una iniciativa de {org} — datamindssolutions.com** |

Render the domain as the link text (not a bare URL in an `href`-less span, not "haz clic aquí"),
`rel="noreferrer"`, `target="_blank"`. Displaying the bare domain rather than a label is the one
place where it reads as a credential instead of an ad.

**4. Certificate (optional, low priority).** `certificates.pdf` already has `issuedOn`, `verifyAt`,
`id` and an `issuer` field on `/verificar`. Adding the domain under the issuer name —
**"Data Minds Solutions · datamindssolutions.com"** — makes a certificate shown to a recruiter
resolve to a real company. It is a change to the PDF layout and to the verification page, so it
belongs to whoever owns certificates, after the copy above ships. Do **not** hyperlink it in the
PDF; a printed URL is enough and avoids a broken-link surface in a document that outlives deploys.

Claims discipline: only "consultora de datos e inteligencia artificial" and "más de 15 años de
experiencia" are used, both stated on the public site. No client names, no project counts, no
student counts, no testimonials.

---

## 5. Currency and pricing sanity check

**Displayed price — fine.** `/precios` renders the USD price through `next-intl`'s formatter
(`US$ 20,00`), and the ARS price is `country: "AR"`-scoped in `src/config/pricing.ts`. A visitor in
Spain or Mexico sees a dollar figure they can evaluate. No change needed, and no change recommended:
a currency selector is scope the launch does not need.

**Payment channels — the real exclusion, and it is not a copy problem.** The three enabled channels
are bank transfer in ARS (Argentina only), Mercado Pago in ARS (Argentina only) and Wallbit in USD.
Wallbit is nominally international but is a LATAM-freelancer product; a buyer in Spain will
realistically not have an account. So the site can now say "welcome, wherever you are" and then,
at the checkout, offer only instruments a non-LATAM buyer cannot use. **That is the same
self-exclusion, moved to the most expensive possible moment — after the buyer has decided to pay.**

Copy can only mitigate it, and §3.8 does: it stops promising Hotmart, and it invites anyone the
channels do not cover to write to `{email}`. Solving it properly is an owner decision about payment
channels, not a copy task. The options, for the record, without a recommendation (this is the
owner's call and touches money and provider risk):

- enable the already-integrated Hotmart card checkout once payout eligibility and credentials exist
  (it is literally re-adding `"hotmart"` to `enabledPaymentProviders`);
- add an international card provider (Stripe / Paddle / Lemon Squeezy — different tax and payout
  consequences for an Argentine monotributista);
- keep manual-only and handle foreign buyers case by case over email, which is viable at low volume
  and is what the proposed copy promises.

This should be filed in `docs/OWNER_ACTIONS.md` as a decision item, and referenced from
`docs/DECISIONS.md` alongside D-32. **Filing it is not in this review's write permissions** — see §7.

---

## 6. Open questions for the owner

1. **Footer origin line.** Keep "Hecho en América Latina, para quien aprende SQL en español", or
   drop the origin entirely ("Para quien aprende SQL en español")? Recommendation: keep it —
   it is authentic and it is not an eligibility statement.
2. **The 15-year claim on the founder.** §3.3 attributes it to the consultancy, matching the public
   site word for word. Confirm whether it may also be stated about Marcelo personally
   ("con más de 15 años de experiencia en datos") — that is a stronger line on the landing card.
3. **Payment channels for buyers outside LATAM** (§5). Which of the three options, and when? The
   proposed FAQ copy commits to coordinating payment by email in the meantime; confirm that is
   acceptable.
4. **New FAQ entry.** Confirm `faq.items.region` goes in as item #2, right after "¿Para quién es
   este curso?".
5. **LinkedIn.** `founder.links.linkedin` is `https://www.linkedin.com/` — the platform home page,
   a dead end, and it is **rendered** on `/nosotros` behind "Ver perfil en LinkedIn". `social.ts`
   already has the real company profile. This needs Marcelo's personal profile URL or the button
   should point at the company page. (Pre-existing, found during this audit; CLAUDE.md rule 9.)

---

## 7. Handoff — who changes what

No file below may be edited by two agents at once. This review touched none of them.

| Owner agent                               | Files                                                                                                                                                                | Work                                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| whoever currently holds the messages file | `src/messages/es-419.json`                                                                                                                                           | Apply §3 strings; add keys `about.company.site`, `faq.items.region.{q,a}`, `footer.consultancy`; fix `certificates.issue.errors.not_eligible` voseo |
| `frontend-engineer`                       | `src/app/(public)/nosotros/page.tsx`, `src/components/layout/site-footer.tsx`, `src/app/(public)/preguntas-frecuentes/page.tsx`, `src/app/(public)/precios/page.tsx` | Render `brand.website` link on /nosotros and in the footer; add `"region"` to the FAQ item order; pass `refundDays` to `pricing.faq.refund`         |
| `frontend-engineer` (same pass)           | `src/config/brand.ts`, `src/config/founder.ts`                                                                                                                       | `brand.description`; `founder.bio`; fix `founder.links.website` placeholder and the LinkedIn dead end (pending Q5)                                  |
| `qa-engineer`                             | `tests/unit/message-keys.test.ts`, `tests/e2e/*`                                                                                                                     | New keys must be covered; any e2e assertion on the hero/about copy will break and needs updating                                                    |
| `docs-keeper`                             | `docs/OWNER_ACTIONS.md`, `docs/DECISIONS.md`, `docs/FEEDBACK_LOG.md`                                                                                                 | File §5 (payment channels for non-LATAM buyers) and §6 questions; log the 2026-09-24 owner feedback and this review's outcome                       |

Nothing here changes the database, the datasets, the exercises or any price.
