import type { Cell, DatasetVerification, GeneratedDataset } from "../_shared/types";

/** Consistency rules for Bolsillo (documented in generate.ts header). */
export function verify(ds: GeneratedDataset): DatasetVerification[] {
  const t = (name: string) => ds.tables.find((x) => x.name === name)!;
  const col = (name: string, c: string) => t(name).columns.indexOf(c);
  const results: DatasetVerification[] = [];
  const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail });

  const users = t("users").rows;
  const accounts = t("accounts").rows;
  const tx = t("transactions").rows;
  const transfers = t("transfers").rows;
  const fx = t("fx_rates").rows;
  const kyc = t("kyc_events").rows;

  check("volume: users", users.length === 4000, `${users.length}`);
  check("volume: transactions", tx.length >= 25000, `${tx.length}`);
  check("volume: accounts ≥ users", accounts.length >= users.length, `${accounts.length}`);

  // Every user has exactly one local-currency account and at most one USD account.
  const perUser = new Map<number, string[]>();
  for (const a of accounts) {
    const u = a[col("accounts", "user_id")] as number;
    perUser.set(u, [...(perUser.get(u) ?? []), a[col("accounts", "currency")] as string]);
  }
  let badAccounts = 0;
  for (const [, curs] of perUser) {
    const usd = curs.filter((c) => c === "USD").length;
    if (curs.length - usd !== 1 || usd > 1) badAccounts++;
  }
  check("accounts: one local + optional USD per user", badAccounts === 0, `${badAccounts}`);

  // Balances of non-closed accounts equal the signed sum of completed/reversed movements.
  const ti = {
    acc: col("transactions", "account_id"),
    dir: col("transactions", "direction"),
    amt: col("transactions", "amount"),
    status: col("transactions", "status"),
    kind: col("transactions", "kind"),
    rev: col("transactions", "reversal_of"),
    created: col("transactions", "created_at"),
    completed: col("transactions", "completed_at"),
    cur: col("transactions", "currency"),
    flag: col("transactions", "is_flagged"),
  };
  const sums = new Map<number, number>();
  for (const r of tx) {
    const s = r[ti.status] as string;
    if (s !== "completed" && s !== "reversed") continue;
    const sign = r[ti.dir] === "credit" ? 1 : -1;
    const a = r[ti.acc] as number;
    sums.set(a, (sums.get(a) ?? 0) + sign * (r[ti.amt] as number));
  }
  let badBalance = 0;
  let closedNonZero = 0;
  for (const a of accounts) {
    const id = a[col("accounts", "id")] as number;
    const status = a[col("accounts", "status")] as string;
    const bal = a[col("accounts", "balance")] as number;
    if (status === "closed") {
      if (bal !== 0) closedNonZero++;
      continue;
    }
    if (Math.abs((sums.get(id) ?? 0) - bal) > 0.011) badBalance++;
  }
  check("accounts.balance reconciles for open accounts", badBalance === 0, `${badBalance}`);
  check("closed accounts carry balance 0 (documented quality issue)", closedNonZero === 0);

  // Reversals reference a payment that is marked reversed, same account and amount.
  const byId = new Map<number, Cell[]>(tx.map((r) => [r[0] as number, r]));
  let badReversal = 0;
  let reversals = 0;
  for (const r of tx) {
    if (r[ti.kind] !== "reversal") continue;
    reversals++;
    const orig = byId.get(r[ti.rev] as number);
    if (
      !orig ||
      orig[ti.status] !== "reversed" ||
      orig[ti.acc] !== r[ti.acc] ||
      orig[ti.amt] !== r[ti.amt]
    )
      badReversal++;
  }
  check(
    "reversals point to a reversed payment with same account/amount",
    badReversal === 0 && reversals > 100,
    `${reversals} reversals, ${badReversal} bad`,
  );

  // Completed transfers have a debit and a credit transaction; failed ones have none.
  const transferTx = new Map<string, number>();
  for (const r of tx) {
    const d = r[col("transactions", "description")];
    if (typeof d === "string" && d.startsWith("Transferencia #"))
      transferTx.set(d, (transferTx.get(d) ?? 0) + 1);
  }
  let badTransfers = 0;
  let failed = 0;
  for (const r of transfers) {
    const key = `Transferencia #${r[0]}`;
    const n = transferTx.get(key) ?? 0;
    const status = r[col("transfers", "status")] as string;
    if (status === "completed" ? n !== 2 : n !== 0) badTransfers++;
    if (status === "failed") failed++;
  }
  check(
    "transfers: completed ⇒ 2 movements, failed ⇒ 0",
    badTransfers === 0 && failed > 0,
    `${badTransfers} bad, ${failed} failed`,
  );

  // Currency of a transaction equals the account currency.
  const accCurrency = new Map<number, string>(
    accounts.map((a) => [
      a[col("accounts", "id")] as number,
      a[col("accounts", "currency")] as string,
    ]),
  );
  let badCurrency = 0;
  for (const r of tx) if (accCurrency.get(r[ti.acc] as number) !== r[ti.cur]) badCurrency++;
  check("transactions.currency = account currency", badCurrency === 0, `${badCurrency}`);

  // completed_at only for completed/reversed and never before created_at.
  let badTimes = 0;
  for (const r of tx) {
    const s = r[ti.status] as string;
    const c = r[ti.completed];
    if ((s === "completed" || s === "reversed") !== (c !== null)) badTimes++;
    else if (c !== null && Date.parse(c as string) < Date.parse(r[ti.created] as string))
      badTimes++;
  }
  check("completed_at consistent with status and created_at", badTimes === 0, `${badTimes}`);

  // Flags exist but are rare.
  const flagged = tx.filter((r) => r[ti.flag] === true).length;
  check(
    "is_flagged ≈ 1 %",
    flagged > tx.length * 0.004 && flagged < tx.length * 0.02,
    `${flagged}`,
  );

  // fx_rates: one row per day per currency, no gaps.
  const days = new Set(fx.map((r) => r[0] as string));
  const expected = Math.round((Date.parse(ds.today) - Date.parse("2024-01-01")) / 86_400_000) + 1;
  check(
    "fx_rates: daily rows for 6 currencies",
    days.size === expected && fx.length === expected * 6,
    `${days.size} days, ${fx.length} rows`,
  );

  // KYC: approved events per user equal kyc_level; levels increase by one.
  const approved = new Map<number, number>();
  let badKyc = 0;
  for (const r of kyc) {
    if (r[col("kyc_events", "to_level")] !== (r[col("kyc_events", "from_level")] as number) + 1)
      badKyc++;
    if (r[col("kyc_events", "outcome")] === "approved") {
      const u = r[col("kyc_events", "user_id")] as number;
      approved.set(u, (approved.get(u) ?? 0) + 1);
    }
  }
  for (const u of users)
    if ((approved.get(u[0] as number) ?? 0) !== (u[col("users", "kyc_level")] as number)) badKyc++;
  check("kyc_events reconcile with users.kyc_level", badKyc === 0, `${badKyc}`);

  // Some blocked users still have completed transactions (quality issue to detect).
  const blocked = new Set(
    users.filter((u) => u[col("users", "is_blocked")] === true).map((u) => u[0]),
  );
  const accUser = new Map<number, number>(
    accounts.map((a) => [
      a[col("accounts", "id")] as number,
      a[col("accounts", "user_id")] as number,
    ]),
  );
  const blockedWithTx = tx.some(
    (r) => r[ti.status] === "completed" && blocked.has(accUser.get(r[ti.acc] as number) ?? -1),
  );
  check("blocked users with historical transactions exist", blockedWithTx);

  return results;
}
