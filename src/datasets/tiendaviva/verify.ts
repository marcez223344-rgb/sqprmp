import type { Cell, DatasetVerification, GeneratedDataset } from "../_shared/types";

/** Consistency rules for TiendaViva (documented in README.md). */
export function verify(ds: GeneratedDataset): DatasetVerification[] {
  const t = (name: string) => ds.tables.find((x) => x.name === name)!;
  const idx = (name: string, col: string) => t(name).columns.indexOf(col);
  const results: DatasetVerification[] = [];
  const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail });

  const orders = t("orders").rows;
  const items = t("order_items").rows;
  const payments = t("payments").rows;
  const shipments = t("shipments").rows;
  const returns = t("returns").rows;
  const customers = t("customers").rows;

  // Volumes in expected ranges.
  check("volume: orders", orders.length >= 17000, `${orders.length}`);
  check("volume: order_items > orders", items.length > orders.length, `${items.length}`);
  check("volume: customers", customers.length === 3000, `${customers.length}`);

  // Totals reconcile: total = subtotal - discount + shipping; subtotal = sum(items).
  const oi = {
    id: idx("orders", "id"),
    sub: idx("orders", "subtotal"),
    disc: idx("orders", "discount"),
    ship: idx("orders", "shipping_fee"),
    tot: idx("orders", "total_amount"),
    status: idx("orders", "status"),
    created: idx("orders", "created_at"),
    cust: idx("orders", "customer_id"),
  };
  const ii = {
    order: idx("order_items", "order_id"),
    qty: idx("order_items", "quantity"),
    price: idx("order_items", "unit_price"),
  };
  const itemSum = new Map<number, number>();
  for (const r of items) {
    const o = r[ii.order] as number;
    itemSum.set(
      o,
      Math.round(((itemSum.get(o) ?? 0) + (r[ii.qty] as number) * (r[ii.price] as number)) * 100) /
        100,
    );
  }
  let badTotals = 0;
  let badSubtotals = 0;
  for (const r of orders) {
    const expected =
      Math.round(((r[oi.sub] as number) - (r[oi.disc] as number) + (r[oi.ship] as number)) * 100) /
      100;
    if (Math.abs(expected - (r[oi.tot] as number)) > 0.011) badTotals++;
    if (Math.abs((itemSum.get(r[oi.id] as number) ?? 0) - (r[oi.sub] as number)) > 0.011)
      badSubtotals++;
  }
  check(
    "orders.total_amount = subtotal - discount + shipping_fee",
    badTotals === 0,
    `${badTotals} mismatches`,
  );
  check("orders.subtotal = sum(order_items)", badSubtotals === 0, `${badSubtotals} mismatches`);

  // Every order has ≥ 1 item.
  const orderIds = new Set(orders.map((r) => r[oi.id] as number));
  const ordersWithItems = new Set(items.map((r) => r[ii.order] as number));
  check(
    "every order has items",
    [...orderIds].every((id) => ordersWithItems.has(id)),
  );

  // FK resolution.
  const productIds = new Set(t("products").rows.map((r) => r[idx("products", "id")] as number));
  const customerIds = new Set(customers.map((r) => r[idx("customers", "id")] as number));
  check(
    "order_items.product_id resolves",
    items.every((r) => productIds.has(r[idx("order_items", "product_id")] as number)),
  );
  check(
    "orders.customer_id resolves",
    orders.every((r) => customerIds.has(r[oi.cust] as number)),
  );
  check(
    "payments.order_id resolves",
    payments.every((r) => orderIds.has(r[idx("payments", "order_id")] as number)),
  );

  // Status lifecycle: delivered/returned orders have an approved/refunded payment and a shipment.
  const pi = {
    order: idx("payments", "order_id"),
    status: idx("payments", "status"),
    amount: idx("payments", "amount"),
    paidAt: idx("payments", "paid_at"),
  };
  const approvedByOrder = new Map<number, number>();
  for (const r of payments)
    if (r[pi.status] !== "rejected")
      approvedByOrder.set(r[pi.order] as number, r[pi.amount] as number);
  const shippedOrders = new Set(shipments.map((r) => r[idx("shipments", "order_id")] as number));
  let lifecycleErrors = 0;
  for (const r of orders) {
    const s = r[oi.status];
    const id = r[oi.id] as number;
    if (
      (s === "delivered" || s === "returned" || s === "shipped") &&
      !(approvedByOrder.has(id) && shippedOrders.has(id))
    )
      lifecycleErrors++;
    if ((s === "pending" || s === "cancelled") && approvedByOrder.has(id)) lifecycleErrors++;
  }
  check("status lifecycle consistent", lifecycleErrors === 0, `${lifecycleErrors} violations`);
  check(
    "rejected payments have NULL paid_at",
    payments.every((r) => r[pi.status] !== "rejected" || r[pi.paidAt] === null),
  );

  // Chronology: shipped_at ≥ paid_at; delivered_at ≥ shipped_at; return after delivery.
  const paidAtByOrder = new Map<number, number>();
  for (const r of payments)
    if (r[pi.paidAt]) paidAtByOrder.set(r[pi.order] as number, Date.parse(r[pi.paidAt] as string));
  const si = {
    order: idx("shipments", "order_id"),
    shipped: idx("shipments", "shipped_at"),
    delivered: idx("shipments", "delivered_at"),
  };
  let chrono = 0;
  const deliveredAtByOrder = new Map<number, number>();
  for (const r of shipments) {
    const o = r[si.order] as number;
    const shipped = Date.parse(r[si.shipped] as string);
    if ((paidAtByOrder.get(o) ?? 0) > shipped) chrono++;
    if (r[si.delivered]) {
      const d = Date.parse(r[si.delivered] as string);
      if (d < shipped) chrono++;
      deliveredAtByOrder.set(o, d);
    }
  }
  for (const r of returns) {
    const o = r[idx("returns", "order_id")] as number;
    const req = Date.parse(r[idx("returns", "requested_at")] as string);
    if ((deliveredAtByOrder.get(o) ?? Infinity) > req) chrono++;
  }
  check("timestamps chronological", chrono === 0, `${chrono} violations`);

  // Refunds never exceed the approved payment.
  check(
    "refund_amount ≤ payment",
    returns.every(
      (r) =>
        (r[idx("returns", "refund_amount")] as number) <=
        (approvedByOrder.get(r[idx("returns", "order_id")] as number) ?? 0) + 0.011,
    ),
  );

  // Currency matches customer country.
  const currencyByCountry: Record<string, string> = {
    AR: "ARS",
    MX: "MXN",
    CO: "COP",
    CL: "CLP",
    PE: "PEN",
    UY: "UYU",
  };
  const countryByCustomer = new Map(
    customers.map((r) => [
      r[idx("customers", "id")] as number,
      r[idx("customers", "country")] as string,
    ]),
  );
  check(
    "orders.currency matches customer country",
    orders.every(
      (r) =>
        currencyByCountry[countryByCustomer.get(r[oi.cust] as number)!] ===
        r[idx("orders", "currency")],
    ),
  );

  // Documented quality issues exist (so exercises can rely on them).
  const emails = customers.map((r) => (r[idx("customers", "email")] as string).toLowerCase());
  const dupEmails = emails.length - new Set(emails).size;
  check(
    "quality issue: duplicate emails (case)",
    dupEmails >= 20 && dupEmails <= 80,
    `${dupEmails}`,
  );
  const nullBirth = customers.filter((r) => r[idx("customers", "birth_year")] === null).length;
  check("quality issue: NULL birth_year ~12%", nullBirth > 250 && nullBirth < 500, `${nullBirth}`);
  const deliveredMissing = shipments.filter((r) => r[si.delivered] === null).length;
  check("shipments with NULL delivered_at exist", deliveredMissing > 100, `${deliveredMissing}`);

  // Seasonality: Hot Sale week has more orders than the previous week.
  const count = (from: string, to: string) =>
    orders.filter((r) => (r[oi.created] as string) >= from && (r[oi.created] as string) < to)
      .length;
  check(
    "seasonality: Hot Sale 2025 > previous week",
    count("2025-05-12", "2025-05-19") > count("2025-05-05", "2025-05-12") * 1.5,
  );

  return results;
}

export function cellToString(c: Cell): string {
  return c === null ? "" : String(c);
}
