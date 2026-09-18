# Payments for LATAM — Analysis and Recommendation

**Decision:** D-05 (pending owner input on legal entity and target countries). **Status:** analysis complete; implementation in Phase 6 in sandbox mode only.

## 1. The deciding constraint
Payment options depend less on the buyer's country than on **where the seller's legal entity and bank account are**. Working assumption (to confirm): Data Minds Solutions operates from **Argentina**.

## 2. Options compared

| Provider | Coverage for buyers | Seller requirements | Local methods / installments | Currency & taxes | Recurring | Fees (approx.) | Refunds/chargebacks | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Mercado Pago – Checkout Pro** | Buyers in the seller's country (AR, BR, CL, CO, MX, PE, UY each need a **separate local account**) | Local account per country with local tax ID | Excellent: local cards, cuotas, wallet balance, transfers, cash | Local currency only; seller handles local tax (Argentina: factura electrónica AFIP/ARCA) | Yes (`/preapproval` subscriptions) | ~4–6 % + tax | Native dispute handling; API refunds | **Best for the seller's home country** |
| **Stripe** (Checkout + Billing) | Global cards | Entity in a Stripe-supported country; **Argentina is not supported** → needs e.g. a US LLC (Stripe Atlas) | International cards only in most LATAM; no cuotas; Argentine buyers pay 30 %+ surcharges on foreign-currency card purchases | USD (or MXN/BRL with local entity); seller handles taxes | Excellent | 2.9 % + 0.30 + 1 % cross-border | Mature | Strong technically, weak commercially for AR/CO buyers unless local entity |
| **Merchant of Record (Paddle, Lemon Squeezy)** | Global; the MoR is the legal seller, collects VAT/IVA where applicable | Sign-up as a foreign vendor; payouts in USD to PayPal/bank (check Argentina payout support) | Cards, PayPal; limited local methods; few local currencies (MXN, COP, BRL, CLP vary) | MoR handles taxes and invoices | Yes | ~5 % + 0.50 | Handled by MoR | Best "one integration for all LATAM" option; higher fees, USD pricing |
| **Hotmart** (LATAM course-focused MoR) | Very strong in BR, MX, CO, AR, CL, PE (Pix, OXXO, boleto, cuotas) | Foreign vendor OK; payouts to AR possible | Excellent local methods | Handles local taxes and currencies | Yes | ~10 % + 1 (high) | Handled | Highest reach for digital courses in LATAM; higher fees, less control over checkout UX |
| dLocal / EBANX | Full LATAM local methods | Enterprise contracts, minimum volumes | Excellent | Handles local | Yes | Negotiated | Handled | Not for an MVP |

## 3. Recommendation

**MVP (Phase 6): Mercado Pago Checkout Pro, one product (lifetime access), one-time payment, sandbox mode**, in the seller's country currency, with a `PaymentProvider` abstraction so a second provider can be added without touching entitlement logic.

Why: it is the cheapest, most trusted checkout for the founder's home market, supports cuotas (a real conversion driver in AR/MX), needs no foreign entity, and has a clean sandbox with signed webhooks. Subscriptions are modeled in the schema but not launched: for a curriculum-based product, lifetime access converts better and avoids involuntary churn from failed local card renewals.

**Phase 6b (before marketing outside the home country): add one MoR provider (Paddle or Lemon Squeezy, or Hotmart if reach matters more than fees)** through the same abstraction, routed by the learner's country. The owner must confirm payout eligibility for the chosen MoR from Argentina before committing.

Rejected for MVP: Stripe (needs foreign entity; poor local UX in AR/CO), dLocal/EBANX (enterprise), launching subscriptions (complexity, churn).

## 4. Product and pricing (config-driven, `src/config/pricing.ts`)

| Product slug | Kind | Suggested price (to be approved, D-06) |
|---|---|---|
| `full-lifetime` | Lifetime access | ARS equivalent of ~US$39–59 in home currency; USD 49 for MoR |
| `full-monthly` | Subscription (modeled, off) | — |
| `full-annual` | Subscription (modeled, off) | — |
| `scholarship` | Promo code (100 %, N days or lifetime) | free |
| `promo-discount` | Promo code (percentage) | — |

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
