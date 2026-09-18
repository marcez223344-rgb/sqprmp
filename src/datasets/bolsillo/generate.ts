import { DAY_MS, Prng, toDate, toIso, utc } from "../_shared/prng";
import { countries, emailFor, givenNames, surnames, usdRate } from "../_shared/latam";
import type { Cell, GeneratedDataset, GeneratedTable } from "../_shared/types";
import { config } from "./config";
import { schemaSql } from "./schema";

/**
 * Bolsillo generator — deterministic synthetic digital-wallet data (docs/CURRICULUM.md §4).
 * Business rules: every user has a local-currency account (some also USD); card and QR
 * payments reference merchants; transfers between accounts produce a debit and a credit
 * transaction; a fraction of payments is reversed (reversal_of); ~1 % of transactions are
 * flagged; KYC upgrades are audited; fx_rates has one row per day and currency.
 * Intentional quality issues: failed transfers without transactions, blocked users with
 * completed transactions before the block, balances that do not reconcile for closed accounts.
 */
export function generate(): GeneratedDataset {
  const rng = new Prng(config.seed);
  const start = utc(2024, 1, 1);
  const today = utc(2025, 9, 15, 12, 0);
  const span = today - start;

  // Users ---------------------------------------------------------------------------------
  const users: Cell[][] = [];
  const userCountry: string[] = [];
  const userSignup: number[] = [];
  for (let id = 1; id <= config.volumes.users; id++) {
    const c = rng.weighted(countries.map((k) => ({ value: k, weight: k.weight })));
    const name = `${rng.pick(givenNames)} ${rng.pick(surnames)}`;
    // Signups accelerate over time (growth curve).
    const signup = start + Math.floor(Math.pow(rng.next(), 0.6) * span);
    const kyc = rng.weighted([
      { value: 0, weight: 8 },
      { value: 1, weight: 42 },
      { value: 2, weight: 35 },
      { value: 3, weight: 15 },
    ]);
    userCountry.push(c.code);
    userSignup.push(signup);
    users.push([
      id,
      name,
      emailFor(name, id, "bolsillo.lat"),
      c.code,
      rng.pick(c.cities),
      rng.chance(0.07) ? null : toDate(utc(rng.int(1960, 2006), rng.int(1, 12), rng.int(1, 28))),
      toIso(signup),
      kyc,
      rng.chance(0.012),
    ]);
  }

  // Accounts (local currency; 22 % also USD) ---------------------------------------------
  const accounts: Cell[][] = [];
  const accountUser: number[] = [];
  const accountCurrency: string[] = [];
  const accountsOfUser = new Map<number, number[]>();
  let accountId = 0;
  for (let u = 1; u <= config.volumes.users; u++) {
    const cur = countries.find((c) => c.code === userCountry[u - 1])!.currency;
    const list: string[] = [cur];
    if ((users[u - 1]![7] as number) >= 2 && rng.chance(0.22)) list.push("USD");
    for (const currency of list) {
      accountId++;
      const opened = userSignup[u - 1]! + (currency === "USD" ? rng.int(1, 200) * DAY_MS : 0);
      const status = rng.weighted([
        { value: "active", weight: 92 },
        { value: "frozen", weight: 3 },
        { value: "closed", weight: 5 },
      ]);
      accounts.push([accountId, u, currency, toIso(Math.min(opened, today)), 0, status]);
      accountUser.push(u);
      accountCurrency.push(currency);
      accountsOfUser.set(u, [...(accountsOfUser.get(u) ?? []), accountId]);
    }
  }

  // Merchants -----------------------------------------------------------------------------
  const merchantCats = [
    "supermercado",
    "restaurante",
    "transporte",
    "farmacia",
    "servicios",
    "entretenimiento",
    "ropa",
    "tecnologia",
    "combustible",
    "educacion",
  ];
  const merchantWords = [
    "Super",
    "Café",
    "Farmacia",
    "Kiosco",
    "Tienda",
    "Club",
    "Taxi",
    "Escuela",
  ];
  const merchants: Cell[][] = [];
  const merchantCountry: string[] = [];
  for (let id = 1; id <= config.volumes.merchants; id++) {
    const c = rng.weighted(countries.map((k) => ({ value: k, weight: k.weight })));
    merchantCountry.push(c.code);
    merchants.push([
      id,
      `${rng.pick(merchantWords)} ${rng.pick(surnames)} ${id}`,
      rng.pick(merchantCats),
      c.code,
      rng.chance(0.35),
    ]);
  }

  // Cards (users with kyc ≥ 1; 70 % have one, some two) ----------------------------------
  const cards: Cell[][] = [];
  const cardsOfUser = new Map<number, number[]>();
  let cardId = 0;
  for (let u = 1; u <= config.volumes.users; u++) {
    if ((users[u - 1]![7] as number) < 1 || !rng.chance(0.7)) continue;
    const n = rng.chance(0.2) ? 2 : 1;
    for (let k = 0; k < n; k++) {
      cardId++;
      const issued = userSignup[u - 1]! + rng.int(0, 90) * DAY_MS;
      const expires = issued + rng.int(2, 4) * 365 * DAY_MS;
      const status = expires < today ? "expired" : rng.chance(0.06) ? "blocked" : "active";
      cards.push([
        cardId,
        u,
        k === 0 ? "virtual" : "physical",
        String(rng.int(1000, 9999)),
        toDate(issued),
        toDate(expires),
        status,
      ]);
      cardsOfUser.set(u, [...(cardsOfUser.get(u) ?? []), cardId]);
    }
  }

  // Transactions + transfers --------------------------------------------------------------
  const transactions: Cell[][] = [];
  const transfers: Cell[][] = [];
  const balances = new Map<number, number>();
  const localAmount = (usd: number, currency: string) =>
    Math.round(usd * (usdRate[currency] ?? 1) * 100) / 100;
  const pushTx = (
    accountId: number,
    kind: string,
    direction: "credit" | "debit",
    amount: number,
    createdAt: number,
    status: string,
    extras: {
      merchantId?: number | null;
      cardId?: number | null;
      reversalOf?: number | null;
      flagged?: boolean;
      description?: string | null;
    } = {},
  ): number => {
    const id = transactions.length + 1;
    const currency = accountCurrency[accountId - 1]!;
    const completed =
      status === "completed" || status === "reversed" ? createdAt + rng.int(0, 90) * 1000 : null;
    transactions.push([
      id,
      accountId,
      kind,
      direction,
      amount,
      currency,
      status,
      toIso(createdAt),
      completed === null ? null : toIso(completed),
      extras.merchantId ?? null,
      extras.cardId ?? null,
      extras.reversalOf ?? null,
      extras.flagged ?? false,
      extras.description ?? null,
    ]);
    if (status === "completed" || status === "reversed") {
      const sign = direction === "credit" ? 1 : -1;
      balances.set(accountId, (balances.get(accountId) ?? 0) + sign * amount);
    }
    return id;
  };

  // Activity per account: pareto-distributed; accounts opened later have less time.
  const txTarget = config.volumes.transactions;
  const weights = accounts.map((a) => {
    const opened = Date.parse(a[3] as string);
    return rng.pareto(1.2, 40) * Math.max(0.1, (today - opened) / span);
  });
  const weightSum = weights.reduce((x, y) => x + y, 0);
  let transferId = 0;
  for (let a = 1; a <= accounts.length; a++) {
    const opened = Date.parse(accounts[a - 1]![3] as string);
    const user = accountUser[a - 1]!;
    const currency = accountCurrency[a - 1]!;
    const n = Math.max(1, Math.round((weights[a - 1]! / weightSum) * txTarget));
    const userCards = cardsOfUser.get(user) ?? [];
    let t = opened + rng.int(1, 3) * DAY_MS;
    // First movement is always a top-up so balances make sense.
    pushTx(a, "topup", "credit", localAmount(rng.float(20, 300), currency), t, "completed", {
      description: "Carga inicial",
    });
    for (let i = 1; i < n && t < today; i++) {
      t += Math.floor(rng.float(0.2, 6) * DAY_MS);
      if (t >= today) break;
      const kind = rng.weighted([
        { value: "topup", weight: 14 },
        { value: "card_payment", weight: userCards.length ? 34 : 0 },
        { value: "qr_payment", weight: 22 },
        { value: "transfer", weight: 16 },
        { value: "withdrawal", weight: 8 },
        { value: "fee", weight: 4 },
      ]);
      const status = rng.weighted([
        { value: "completed", weight: 93 },
        { value: "failed", weight: 5 },
        { value: "pending", weight: 2 },
      ]);
      const flagged = rng.chance(0.01);
      if (kind === "topup") {
        pushTx(a, "topup", "credit", localAmount(rng.float(10, 400), currency), t, status, {
          flagged,
        });
      } else if (kind === "card_payment" || kind === "qr_payment") {
        const merchantId = rng.int(1, config.volumes.merchants);
        const amount = localAmount(rng.float(2, 120), currency);
        const id = pushTx(a, kind, "debit", amount, t, status, {
          merchantId,
          cardId: kind === "card_payment" ? rng.pick(userCards) : null,
          flagged,
        });
        // 3 % of completed payments are reversed a few days later.
        if (status === "completed" && rng.chance(0.03)) {
          const rt = t + rng.int(1, 10) * DAY_MS;
          if (rt < today) {
            transactions[id - 1]![6] = "reversed";
            pushTx(a, "reversal", "credit", amount, rt, "completed", {
              merchantId,
              reversalOf: id,
              description: "Reverso de pago",
            });
          }
        }
      } else if (kind === "transfer") {
        // Same-currency peer transfer; the counterpart account gets a credit.
        const candidates = accounts.filter(
          (acc, i) => i !== a - 1 && accountCurrency[i] === currency && acc[5] !== "closed",
        );
        if (!candidates.length) continue;
        const to = candidates[rng.int(0, Math.min(candidates.length - 1, 400))]![0] as number;
        const amount = localAmount(rng.float(5, 250), currency);
        transferId++;
        const tStatus = status === "pending" ? "pending" : status;
        transfers.push([
          transferId,
          a,
          to,
          amount,
          currency,
          tStatus,
          toIso(t),
          rng.chance(0.3) ? rng.pick(["Cena", "Alquiler", "Regalo", "Cuota", "Préstamo"]) : null,
        ]);
        if (tStatus === "completed") {
          pushTx(a, "transfer_out", "debit", amount, t, "completed", {
            flagged,
            description: `Transferencia #${transferId}`,
          });
          pushTx(to, "transfer_in", "credit", amount, t + 1000, "completed", {
            description: `Transferencia #${transferId}`,
          });
        }
      } else if (kind === "withdrawal") {
        pushTx(a, "withdrawal", "debit", localAmount(rng.float(20, 300), currency), t, status, {
          flagged,
        });
      } else {
        pushTx(a, "fee", "debit", localAmount(rng.float(0.5, 3), currency), t, "completed", {
          description: "Comisión mensual",
        });
      }
    }
  }
  // Balances: closed accounts are intentionally left at 0 (do not reconcile: quality issue).
  for (const acc of accounts) {
    const id = acc[0] as number;
    acc[4] = acc[5] === "closed" ? 0 : Math.round((balances.get(id) ?? 0) * 100) / 100;
  }

  // KYC events ----------------------------------------------------------------------------
  const kycEvents: Cell[][] = [];
  const reasons = ["documento ilegible", "selfie no coincide", "datos inconsistentes"];
  for (let u = 1; u <= config.volumes.users; u++) {
    const level = users[u - 1]![7] as number;
    let t = userSignup[u - 1]!;
    for (let l = 0; l < level; l++) {
      t += rng.int(0, 40) * DAY_MS;
      if (rng.chance(0.18)) {
        kycEvents.push([
          kycEvents.length + 1,
          u,
          l,
          l + 1,
          "rejected",
          rng.pick(reasons),
          toIso(t),
        ]);
        t += rng.int(1, 15) * DAY_MS;
      }
      kycEvents.push([
        kycEvents.length + 1,
        u,
        l,
        l + 1,
        "approved",
        null,
        toIso(Math.min(t, today)),
      ]);
    }
  }

  // FX rates: one row per day and currency, with a mild drift (ARS depreciates faster). --
  const fxRates: Cell[][] = [];
  const drift: Record<string, number> = {
    ARS: 0.0012,
    MXN: 0.00005,
    COP: 0.0002,
    CLP: 0.0001,
    PEN: 0.00003,
    UYU: 0.0001,
  };
  const level: Record<string, number> = Object.fromEntries(
    Object.entries(usdRate).map(([k, v]) => [k, v * 0.55]),
  );
  for (let d = start; d <= today; d += DAY_MS) {
    for (const cur of Object.keys(usdRate)) {
      level[cur] = level[cur]! * (1 + (drift[cur] ?? 0) + rng.float(-0.004, 0.004, 5));
      fxRates.push([toDate(d), cur, Math.round(level[cur]! * 10000) / 10000]);
    }
  }

  const table = (name: string, columns: string[], rows: Cell[][]): GeneratedTable => ({
    name,
    columns,
    rows,
  });
  return {
    slug: config.slug,
    version: config.version,
    today: toDate(today),
    schemaSql,
    tables: [
      table(
        "users",
        [
          "id",
          "full_name",
          "email",
          "country",
          "city",
          "birth_date",
          "signup_at",
          "kyc_level",
          "is_blocked",
        ],
        users,
      ),
      table("accounts", ["id", "user_id", "currency", "opened_at", "balance", "status"], accounts),
      table("merchants", ["id", "name", "category", "country", "is_online"], merchants),
      table(
        "cards",
        ["id", "user_id", "kind", "last4", "issued_at", "expires_at", "status"],
        cards,
      ),
      table(
        "transactions",
        [
          "id",
          "account_id",
          "kind",
          "direction",
          "amount",
          "currency",
          "status",
          "created_at",
          "completed_at",
          "merchant_id",
          "card_id",
          "reversal_of",
          "is_flagged",
          "description",
        ],
        transactions,
      ),
      table(
        "transfers",
        [
          "id",
          "from_account_id",
          "to_account_id",
          "amount",
          "currency",
          "status",
          "created_at",
          "note",
        ],
        transfers,
      ),
      table(
        "kyc_events",
        ["id", "user_id", "from_level", "to_level", "outcome", "reason", "event_at"],
        kycEvents,
      ),
      table("fx_rates", ["rate_date", "currency", "usd_rate"], fxRates),
    ],
  };
}
