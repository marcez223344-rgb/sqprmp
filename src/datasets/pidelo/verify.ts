import type { DatasetVerification, GeneratedDataset } from "../_shared/types";

/** Consistency rules for Pídelo (documented in generate.ts header). */
export function verify(ds: GeneratedDataset): DatasetVerification[] {
  const t = (name: string) => ds.tables.find((x) => x.name === name)!;
  const col = (name: string, c: string) => t(name).columns.indexOf(c);
  const results: DatasetVerification[] = [];
  const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail });

  const orders = t("orders").rows;
  const items = t("order_items").rows;
  const events = t("order_events").rows;
  const ratings = t("ratings").rows;
  const restaurants = t("restaurants").rows;
  const promotions = t("promotions").rows;

  check("volume: orders", orders.length >= 12000, `${orders.length}`);
  check("volume: events > 3 × orders", events.length > orders.length * 3, `${events.length}`);

  const o = {
    id: col("orders", "id"),
    status: col("orders", "status"),
    sub: col("orders", "subtotal"),
    fee: col("orders", "delivery_fee"),
    disc: col("orders", "discount"),
    total: col("orders", "total"),
    placed: col("orders", "placed_at"),
    delivered: col("orders", "delivered_at"),
    courier: col("orders", "courier_id"),
    promised: col("orders", "promised_minutes"),
    promo: col("orders", "promotion_id"),
    customer: col("orders", "customer_id"),
    restaurant: col("orders", "restaurant_id"),
  };

  // Totals and item sums.
  const itemSum = new Map<number, number>();
  for (const r of items) {
    const id = r[col("order_items", "order_id")] as number;
    itemSum.set(
      id,
      Math.round(
        ((itemSum.get(id) ?? 0) +
          (r[col("order_items", "quantity")] as number) *
            (r[col("order_items", "unit_price")] as number)) *
          100,
      ) / 100,
    );
  }
  let badTotal = 0;
  let badSub = 0;
  let noItems = 0;
  for (const r of orders) {
    const expected =
      Math.round(((r[o.sub] as number) + (r[o.fee] as number) - (r[o.disc] as number)) * 100) / 100;
    if (Math.abs(expected - (r[o.total] as number)) > 0.011) badTotal++;
    const sum = itemSum.get(r[o.id] as number);
    if (sum === undefined) noItems++;
    else if (Math.abs(sum - (r[o.sub] as number)) > 0.011) badSub++;
  }
  check("orders.total = subtotal + delivery_fee - discount", badTotal === 0, `${badTotal}`);
  check("orders.subtotal = sum(items)", badSub === 0, `${badSub}`);
  check(
    "orders without items exist only when cancelled (documented)",
    noItems > 0 &&
      orders.every((r) => itemSum.has(r[o.id] as number) || r[o.status] === "cancelled"),
    `${noItems}`,
  );

  // Delivered ⇔ delivered_at and courier; delivered_at after placed_at.
  let badDelivered = 0;
  let late = 0;
  let delivered = 0;
  for (const r of orders) {
    const isDelivered = r[o.status] === "delivered";
    const has = r[o.delivered] !== null;
    if (isDelivered !== has) badDelivered++;
    if (isDelivered) {
      delivered++;
      if (r[o.courier] === null) badDelivered++;
      const minutes =
        (Date.parse(r[o.delivered] as string) - Date.parse(r[o.placed] as string)) / 60_000;
      if (minutes <= 0) badDelivered++;
      if (minutes > (r[o.promised] as number)) late++;
    }
  }
  check("delivered orders have delivered_at and courier", badDelivered === 0, `${badDelivered}`);
  check(
    "late deliveries ≈ 22 %",
    late > delivered * 0.15 && late < delivered * 0.3,
    `${late}/${delivered}`,
  );

  // Events: every order has a placed event; delivered orders have a delivered event with the same time.
  const eventsOf = new Map<number, { event: string; at: string }[]>();
  for (const r of events) {
    const id = r[col("order_events", "order_id")] as number;
    eventsOf.set(id, [
      ...(eventsOf.get(id) ?? []),
      {
        event: r[col("order_events", "event")] as string,
        at: r[col("order_events", "event_at")] as string,
      },
    ]);
  }
  let badEvents = 0;
  for (const r of orders) {
    const ev = eventsOf.get(r[o.id] as number) ?? [];
    if (ev[0]?.event !== "placed") badEvents++;
    for (let i = 1; i < ev.length; i++)
      if (Date.parse(ev[i]!.at) < Date.parse(ev[i - 1]!.at)) badEvents++;
    if (r[o.status] === "delivered") {
      const d = ev.find((e) => e.event === "delivered");
      if (!d || d.at !== r[o.delivered]) badEvents++;
    }
    if (r[o.status] === "cancelled" && !ev.some((e) => e.event === "cancelled")) badEvents++;
  }
  check("order_events are chronological and match status", badEvents === 0, `${badEvents}`);

  // Ratings only for delivered orders, at most one per order, some partial.
  const deliveredIds = new Set(
    orders.filter((r) => r[o.status] === "delivered").map((r) => r[o.id]),
  );
  const seen = new Set<number>();
  let badRatings = 0;
  let partial = 0;
  for (const r of ratings) {
    const id = r[col("ratings", "order_id")] as number;
    if (!deliveredIds.has(id) || seen.has(id)) badRatings++;
    seen.add(id);
    if (
      r[col("ratings", "restaurant_rating")] === null ||
      r[col("ratings", "courier_rating")] === null
    )
      partial++;
  }
  check("ratings only for delivered orders, unique per order", badRatings === 0, `${badRatings}`);
  check("partial ratings exist (documented quality issue)", partial > 0, `${partial}`);

  // Promotions: used inside their window; some customers exceed the per-customer cap.
  const promoById = new Map(promotions.map((p) => [p[0] as number, p]));
  const uses = new Map<string, number>();
  let outsideWindow = 0;
  for (const r of orders) {
    const pid = r[o.promo] as number | null;
    if (pid === null) continue;
    const p = promoById.get(pid)!;
    const placed = Date.parse(r[o.placed] as string);
    if (placed < Date.parse(p[4] as string) || placed > Date.parse(p[5] as string) + 86_400_000)
      outsideWindow++;
    const key = `${r[o.customer]}:${pid}`;
    uses.set(key, (uses.get(key) ?? 0) + 1);
  }
  let abuse = 0;
  for (const [key, n] of uses) {
    const cap = promoById.get(Number(key.split(":")[1]))![6] as number | null;
    if (cap !== null && n > cap) abuse++;
  }
  check("promotions used within validity window", outsideWindow === 0, `${outsideWindow}`);
  check("promo abuse cases exist (documented quality issue)", abuse > 10, `${abuse}`);

  // Inactive restaurants with orders (documented).
  const inactive = new Set(
    restaurants.filter((r) => r[col("restaurants", "is_active")] === false).map((r) => r[0]),
  );
  check(
    "inactive restaurants with orders exist (documented quality issue)",
    orders.some((r) => inactive.has(r[o.restaurant])),
  );

  return results;
}
