# Payments for LATAM — Analysis and Recommendation

**Decision:** D-05 (pending owner input on legal entity and target countries). **Status:** analysis complete; implementation in Phase 6 in sandbox mode only.

## 1. The deciding constraint

Payment options depend less on the buyer's country than on **where the seller's legal entity and bank account are**. Working assumption (to confirm): Data Minds Solutions operates from **Argentina**.

## 2. Options compared

| Provider                                       | Coverage for buyers                                                                                | Seller requirements                                                                                       | Local methods / installments                                                                                                | Currency & taxes                                                                         | Recurring                          | Fees (approx.)                  | Refunds/chargebacks                  | Verdict                                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| **Mercado Pago – Checkout Pro**                | Buyers in the seller's country (AR, BR, CL, CO, MX, PE, UY each need a **separate local account**) | Local account per country with local tax ID                                                               | Excellent: local cards, cuotas, wallet balance, transfers, cash                                                             | Local currency only; seller handles local tax (Argentina: factura electrónica AFIP/ARCA) | Yes (`/preapproval` subscriptions) | ~4–6 % + tax                    | Native dispute handling; API refunds | **Best for the seller's home country**                                                 |
| **Stripe** (Checkout + Billing)                | Global cards                                                                                       | Entity in a Stripe-supported country; **Argentina is not supported** → needs e.g. a US LLC (Stripe Atlas) | International cards only in most LATAM; no cuotas; Argentine buyers pay 30 %+ surcharges on foreign-currency card purchases | USD (or MXN/BRL with local entity); seller handles taxes                                 | Excellent                          | 2.9 % + 0.30 + 1 % cross-border | Mature                               | Strong technically, weak commercially for AR/CO buyers unless local entity             |
| **Merchant of Record (Paddle, Lemon Squeezy)** | Global; the MoR is the legal seller, collects VAT/IVA where applicable                             | Sign-up as a foreign vendor; payouts in USD to PayPal/bank (check Argentina payout support)               | Cards, PayPal; limited local methods; few local currencies (MXN, COP, BRL, CLP vary)                                        | MoR handles taxes and invoices                                                           | Yes                                | ~5 % + 0.50                     | Handled by MoR                       | Best "one integration for all LATAM" option; higher fees, USD pricing                  |
| **Hotmart** (LATAM course-focused MoR)         | Very strong in BR, MX, CO, AR, CL, PE (Pix, OXXO, boleto, cuotas)                                  | Foreign vendor OK; payouts to AR possible                                                                 | Excellent local methods                                                                                                     | Handles local taxes and currencies                                                       | Yes                                | ~10 % + 1 (high)                | Handled                              | Highest reach for digital courses in LATAM; higher fees, less control over checkout UX |
| dLocal / EBANX                                 | Full LATAM local methods                                                                           | Enterprise contracts, minimum volumes                                                                     | Excellent                                                                                                                   | Handles local                                                                            | Yes                                | Negotiated                      | Handled                              | Not for an MVP                                                                         |

## 2b. Deeper analysis requested by the owner (2026-09-18): manual transfer channels

Owner input: entity in **Argentina**, sell to **all LATAM from day one**, price **≈ US$20** lifetime. At this price point, fixed per-transaction fees matter a lot (a US$0.50 fixed fee is 2.5 % of the ticket), and Lemon Squeezy is excluded (no payouts to Argentine sellers because it relies on Stripe payouts).

| Channel                               | Who can pay                                                                                                                       | Cost to us                                             | Learner effort                                                                                            | Automation                                                        | Taxes / invoicing                                                                                                          | Risk                                                      | Notes                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Bank transfer in ARS (CBU/alias)**  | Argentina only                                                                                                                    | ~0 %                                                   | Copy alias, transfer, report payment                                                                      | Manual: admin verifies against bank statement and grants access   | We invoice (ARCA)                                                                                                          | Fake receipts (mitigated: access only after verification) | Ubiquitous in AR for courses; instant for the learner                             |
| **Mercado Pago transfer (CVU/alias)** | Argentina only                                                                                                                    | ~0 % (personal) / small % (seller account)             | Same as above, most Argentines already use MP                                                             | Manual, or semi-automatic by polling the MP account movements API | We invoice                                                                                                                 | Same                                                      | Zero-integration variant of Mercado Pago                                          |
| **Mercado Pago Checkout Pro (link)**  | Argentina (per-country accounts)                                                                                                  | ~4–6 % + IVA                                           | Cards, cuotas, MP balance                                                                                 | Automatic (webhook)                                               | We invoice                                                                                                                 | Chargebacks handled by MP                                 | Best automated option for AR; needs the AR account only                           |
| **Wallbit transfer (USD)**            | Any LATAM learner **who has Wallbit** (AR, BR, CO, MX, CL, PE, DO, …) via Wallbit TAG; anyone with a US bank account via ACH/wire | 0 % Wallbit-to-Wallbit; ACH/wire withdrawals from ~1 % | Learner needs a Wallbit account (adoption is meaningful among tech/freelance audiences but not universal) | Manual (no merchant API yet; the owner checks the app)            | We invoice (export of services; BCRA "A" 8417 allows individuals to collect exported services without forced pesification) | Same as transfers                                         | Cheapest cross-border USD channel; good fit for the data/tech audience            |
| **Hotmart (MoR)**                     | All LATAM, local methods (Pix, boleto, OXXO, MP, cuotas)                                                                          | ~10 % + fixed (≈ US$2.5–3 on a US$20 ticket)           | Familiar course checkout in LATAM                                                                         | Automatic (webhooks)                                              | Hotmart invoices the buyer; we invoice Hotmart                                                                             | Handled by Hotmart                                        | Highest conversion for cards outside AR; most expensive                           |
| **Paddle (MoR)**                      | Global cards/PayPal                                                                                                               | ~5 % + US$0.50 (≈ 7.5 % on US$20)                      | Standard card checkout, USD                                                                               | Automatic                                                         | Paddle handles                                                                                                             | Handled                                                   | Cleaner UX, fewer local methods; Argentina payout via PayPal/wire to be confirmed |

Observations:

1. At US$20, **manual transfer channels are nearly free** and are culturally normal in LATAM for courses, but every sale costs the owner a manual verification (a few minutes) and delays access until verified.
2. A **manual channel is easy to build safely**: it is just a `manual` provider in the same abstraction: pending purchase with a unique reference code → learner marks "ya pagué" (optional receipt upload later) → admin approves in the admin panel → entitlement granted → email. Access is never granted automatically, so fake receipts cannot unlock content.
3. Automated card checkout is what scales and what non-Argentine, non-Wallbit learners need. Between MoRs, Hotmart wins on LATAM reach/local methods, Paddle on fees/UX.
4. **Combining channels is cheap** because `PaymentProvider` isolates each one; the pricing page simply lists the methods available for the learner's country.

## 3. Recommendation (revised)

**Phase 6 MVP: launch with two channels behind the abstraction**

- `manual` provider with three instruction sets: bank/Mercado Pago transfer in ARS (Argentina), Wallbit TAG in USD (LATAM), and international wire as fallback. Zero fees, zero external dependency, works day one; admin approval flow and audit log already in the data model.
- **One automated MoR for cards**: **Hotmart** if LATAM local methods and conversion matter most (recommended for a course product), **Paddle** if lower fees and a cleaner embedded checkout matter more. Owner picks; eligibility for Argentine payouts is verified during Phase 6 before code is written.

**Phase 6b:** Mercado Pago Checkout Pro for Argentine buyers who want cards/cuotas without leaving the flow (replaces part of the manual ARS volume). Subscriptions remain off.

### Previous recommendation (superseded 2026-09-18)

**MVP (Phase 6): Mercado Pago Checkout Pro, one product (lifetime access), one-time payment, sandbox mode**, in the seller's country currency, with a `PaymentProvider` abstraction so a second provider can be added without touching entitlement logic.

Why: it is the cheapest, most trusted checkout for the founder's home market, supports cuotas (a real conversion driver in AR/MX), needs no foreign entity, and has a clean sandbox with signed webhooks. Subscriptions are modeled in the schema but not launched: for a curriculum-based product, lifetime access converts better and avoids involuntary churn from failed local card renewals.

**Phase 6b (before marketing outside the home country): add one MoR provider (Paddle or Lemon Squeezy, or Hotmart if reach matters more than fees)** through the same abstraction, routed by the learner's country. The owner must confirm payout eligibility for the chosen MoR from Argentina before committing.

Rejected for MVP: Stripe (needs foreign entity; poor local UX in AR/CO), dLocal/EBANX (enterprise), launching subscriptions (complexity, churn).

## 4. Product and pricing (config-driven, `src/config/pricing.ts`)

| Product slug     | Kind                                   | Suggested price (to be approved, D-06)                       |
| ---------------- | -------------------------------------- | ------------------------------------------------------------ |
| `full-lifetime`  | Lifetime access                        | ARS equivalent of ~US$39–59 in home currency; USD 49 for MoR |
| `full-monthly`   | Subscription (modeled, off)            | —                                                            |
| `full-annual`    | Subscription (modeled, off)            | —                                                            |
| `scholarship`    | Promo code (100 %, N days or lifetime) | free                                                         |
| `promo-discount` | Promo code (percentage)                | —                                                            |

Prices carry `currency`, `amount_minor`, `country`, `provider`; the checkout picks the active price for the learner's country/provider; a fallback USD price via MoR covers other countries once Phase 6b ships.

## 5. Integration design

```
PaymentProvider (interface)
  createCheckout({userId, priceId, successUrl, cancelUrl}) → {redirectUrl, providerRef}
  verifyWebhook(rawBody, headers) → {valid, eventId, type, paymentRef}
  fetchPayment(paymentRef) → {status, amountMinor, currency, payerEmail?}
  refund(paymentRef) → {...}       // admin-only
providers/mercadopago.ts, providers/stripe.ts (stub), providers/manual.ts (admin grants)
```

Flow: server action `createCheckout` → provider → redirect → webhook (`/api/webhooks/[provider]`) → verify signature → store `payment_events` (idempotent) → `fetchPayment` → RPC `apply_payment_event` (insert `purchases` + `entitlements` transactionally) → email receipt (later) → learner sees access on next request.

Tests: signature verification vectors, replayed event, out-of-order events (approved before pending), refund → revoke, chargeback → revoke + flag, sandbox end-to-end with Mercado Pago test users.

## 6. Legal and accounting notes for the owner (not implemented by the app)

- Argentina: electronic invoicing obligations for digital services; monotributo vs. responsable inscripto categories affect pricing and net revenue.
- Foreign buyers via MoR: MoR issues invoices; the seller invoices the MoR (export of services).
- Refund policy (e.g. 7 days) must appear in Terms; chargeback handling documented in the admin runbook.
