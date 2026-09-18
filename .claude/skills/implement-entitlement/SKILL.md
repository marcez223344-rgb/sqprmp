---
name: implement-entitlement
description: Implement or change a paid-access path (product, price, provider checkout, webhook processing, entitlement grant/revoke, promo code) in sandbox mode with idempotency and tests. Never enables live payments.
argument-hint: [product-or-flow]
disable-model-invocation: true
---

## Purpose
Implement "$ARGUMENTS" per `docs/PAYMENTS.md` and `docs/SECURITY.md` §6.

## Preconditions (stop if unmet)
- Decisions D-01, D-05, D-06 approved in `docs/DECISIONS.md` for the affected product.
- Sandbox credentials present in `.env.local` (check names only, never values).

## Procedure
1. Config: add/adjust product and price in `src/config/pricing.ts` (values from the approved decision) and seed rows.
2. Provider adapter implements `PaymentProvider` (`createCheckout`, `verifyWebhook`, `fetchPayment`, `refund`); no provider types leak outside `src/lib/payments`.
3. Webhook route: raw body → verify signature and timestamp → `payment_events` upsert (unique provider event id) → `fetchPayment` → RPC `apply_payment_event` (purchase + entitlement in one transaction) → 200.
4. Entitlement helpers used by `authorize()`: active, expiring, revoked, promo.
5. Admin: grant/revoke/extend with reason → `audit_logs`.
6. Tests: signature vectors (valid/invalid/stale), replay, out-of-order events, refund → revoke, chargeback → revoke + `suspicious_activity`, promo redemption limits; integration test against recorded sandbox payloads.
7. Manual sandbox purchase performed by the owner or with sandbox test users; record the outcome in the phase report.
8. Update `docs/PAYMENTS.md` runbook and `.env.example` names.

## Validation checklist
- [ ] Idempotent webhook · [ ] Provider re-fetch before grant · [ ] Server-side entitlement checks · [ ] No live keys · [ ] Audit logs · [ ] Tests green · [ ] E2E journeys 7–10

## Failure / rollback
If a webhook is misprocessed in sandbox, mark `payment_events.processing_error`, fix, and reprocess via the admin action; never hand-edit `entitlements` without an audit entry.
