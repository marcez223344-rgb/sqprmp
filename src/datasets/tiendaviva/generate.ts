import { DAY_MS, Prng, toDate, toIso, utc } from "../_shared/prng";
import {
  countries,
  emailFor,
  givenNames,
  surnames,
  usdRate,
  type CountryCode,
} from "../_shared/latam";
import type { Cell, GeneratedDataset, GeneratedTable } from "../_shared/types";
import { config } from "./config";
import { schemaSql } from "./schema";

/**
 * TiendaViva generator — deterministic (seeded) synthetic marketplace data matching the spec
 * in src/content/datasets/tiendaviva.ts. Business rules and intentional quality issues are
 * documented in README.md; verify.ts asserts them.
 */
export function generate(): GeneratedDataset {
  const rng = new Prng(config.seed);
  const start = utc(2024, 1, 1);
  const today = utc(2025, 9, 15, 12, 0);

  // Sellers -----------------------------------------------------------------------------
  const sellers: Cell[][] = [];
  const sellerCountry: CountryCode[] = [];
  const storeWords = [
    "Casa",
    "Tienda",
    "Rincón",
    "Mercado",
    "Taller",
    "Punto",
    "Estudio",
    "Bazar",
    "Nube",
    "Barrio",
  ];
  const storeThemes = [
    "Verde",
    "Norte",
    "Sur",
    "Digital",
    "Creativo",
    "Andino",
    "Pampa",
    "Tropical",
    "Urbano",
    "Artesanal",
    "Express",
    "Vintage",
  ];
  for (let id = 1; id <= config.volumes.sellers; id++) {
    const c = rng.weighted(countries.map((k) => ({ value: k, weight: k.weight })));
    sellerCountry.push(c.code);
    const joined = start - rng.int(30, 700) * DAY_MS;
    const hasReviews = rng.chance(0.85);
    sellers.push([
      id,
      `${rng.pick(storeWords)} ${rng.pick(storeThemes)} ${id}`,
      c.code,
      toDate(joined),
      hasReviews ? rng.float(3.2, 5, 2) : null,
      rng.chance(0.6),
    ]);
  }

  // Categories (2 levels) --------------------------------------------------------------
  const roots = ["Tecnología", "Hogar", "Moda", "Deportes", "Belleza", "Juguetes"];
  const leaves: Record<string, string[]> = {
    Tecnología: ["Celulares", "Audio", "Computación", "Accesorios tech"],
    Hogar: ["Cocina", "Decoración", "Muebles", "Electrodomésticos"],
    Moda: ["Ropa mujer", "Ropa hombre", "Calzado", "Accesorios"],
    Deportes: ["Fitness", "Ciclismo", "Fútbol", "Outdoor"],
    Belleza: ["Cuidado de la piel", "Maquillaje", "Perfumes", "Cabello"],
    Juguetes: ["Educativos", "Juegos de mesa", "Construcción", "Bebés"],
  };
  const categories: Cell[][] = [];
  const leafIds: { id: number; root: string; usdMin: number; usdMax: number }[] = [];
  const priceRange: Record<string, [number, number]> = {
    Tecnología: [15, 900],
    Hogar: [8, 400],
    Moda: [6, 120],
    Deportes: [10, 300],
    Belleza: [4, 80],
    Juguetes: [5, 90],
  };
  let catId = 1;
  for (const root of roots) {
    const rootId = catId++;
    categories.push([rootId, root, null]);
    for (const leaf of leaves[root]!) {
      const [usdMin, usdMax] = priceRange[root]!;
      leafIds.push({ id: catId, root, usdMin, usdMax });
      categories.push([catId++, leaf, rootId]);
    }
  }

  // Products ------------------------------------------------------------------------------
  const products: Cell[][] = [];
  const productMeta: {
    id: number;
    sellerId: number;
    currency: string;
    price: number;
    country: CountryCode;
  }[] = [];
  const adjectives = [
    "Pro",
    "Clásico",
    "Compacto",
    "Premium",
    "Básico",
    "Plus",
    "Mini",
    "Max",
    "Eco",
    "Urbano",
  ];
  const nouns: Record<string, string[]> = {
    Tecnología: [
      "Auriculares",
      "Parlante",
      "Teclado",
      "Mouse",
      "Cargador",
      "Smartwatch",
      "Cable USB-C",
      "Funda",
    ],
    Hogar: [
      "Cafetera",
      "Sartén",
      "Lámpara",
      "Almohada",
      "Organizador",
      "Juego de sábanas",
      "Silla",
      "Licuadora",
    ],
    Moda: ["Remera", "Jean", "Zapatillas", "Campera", "Vestido", "Mochila", "Gorra", "Cinturón"],
    Deportes: [
      "Pelota",
      "Mancuernas",
      "Colchoneta",
      "Botella",
      "Casco",
      "Guantes",
      "Cuerda",
      "Banda elástica",
    ],
    Belleza: [
      "Crema",
      "Sérum",
      "Labial",
      "Perfume",
      "Shampoo",
      "Protector solar",
      "Máscara",
      "Aceite",
    ],
    Juguetes: [
      "Rompecabezas",
      "Bloques",
      "Peluche",
      "Juego de cartas",
      "Auto",
      "Muñeca",
      "Kit ciencia",
      "Pizarra",
    ],
  };
  for (let id = 1; id <= config.volumes.products; id++) {
    const sellerId = rng.int(1, config.volumes.sellers);
    const country = sellerCountry[sellerId - 1]!;
    const currency = countries.find((c) => c.code === country)!.currency;
    const leaf = rng.pick(leafIds);
    const usd = rng.float(leaf.usdMin, leaf.usdMax, 2);
    const price = Math.round(usd * usdRate[currency]! * 100) / 100;
    productMeta.push({ id, sellerId, currency, price, country });
    products.push([
      id,
      sellerId,
      leaf.id,
      `${rng.pick(nouns[leaf.root]!)} ${rng.pick(adjectives)} ${id}`,
      price,
      currency,
      rng.chance(0.08) ? 0 : rng.int(1, 250),
      rng.chance(0.9),
      toIso(start - rng.int(0, 400) * DAY_MS + rng.int(0, DAY_MS - 1)),
    ]);
  }
  const productsByCountry = new Map<CountryCode, typeof productMeta>();
  for (const p of productMeta) {
    if (!productsByCountry.has(p.country)) productsByCountry.set(p.country, []);
    productsByCountry.get(p.country)!.push(p);
  }

  // Customers -------------------------------------------------------------------------------
  const customers: Cell[][] = [];
  const customerMeta: {
    id: number;
    country: CountryCode;
    currency: string;
    signup: number;
    activity: number;
  }[] = [];
  const duplicateTargets = new Set<number>();
  for (let id = 1; id <= config.volumes.customers; id++) {
    const c = rng.weighted(countries.map((k) => ({ value: k, weight: k.weight })));
    const name = `${rng.pick(givenNames)} ${rng.pick(surnames)}`;
    const signup = start - rng.int(0, 365) * DAY_MS + rng.int(0, 620) * DAY_MS;
    const clampedSignup = Math.min(signup, today - DAY_MS);
    let email = emailFor(name, id);
    // Intentional quality issue: ~1.3% of customers are duplicate registrations of an earlier
    // customer with the same email in a different capitalization.
    if (id > 50 && rng.chance(0.013)) {
      const originalId = rng.int(1, id - 1);
      const original = customers[originalId - 1]!;
      email = String(original[2]).toUpperCase();
      duplicateTargets.add(id);
    }
    customerMeta.push({
      id,
      country: c.code,
      currency: c.currency,
      signup: clampedSignup,
      activity: rng.pareto(1.6, 40),
    });
    customers.push([
      id,
      name,
      email,
      c.code,
      rng.pick(c.cities),
      toIso(clampedSignup + rng.int(6, 23) * 3_600_000),
      rng.chance(0.12) ? null : rng.int(1968, 2006),
      rng.chance(0.55),
    ]);
  }

  // Orders / items / payments / shipments / returns ------------------------------------------
  const orders: Cell[][] = [];
  const orderItems: Cell[][] = [];
  const payments: Cell[][] = [];
  const shipments: Cell[][] = [];
  const returns: Cell[][] = [];
  const reviews: Cell[][] = [];
  let orderId = 0;
  let itemId = 0;
  let paymentId = 0;
  let shipmentId = 0;
  let returnId = 0;
  let reviewId = 0;
  const carriers = [
    "Andes Express",
    "Correo Regional",
    "Rápido Sur",
    "LatamPost",
    "Envíos del Norte",
  ];
  const seasonality = (ms: number): number => {
    const d = new Date(ms);
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    let f = 1;
    if (m === 5 && day >= 12 && day <= 18) f *= 2.2; // Hot Sale
    if (m === 11 && day >= 14 && day <= 20) f *= 2.0; // Buen Fin
    if (m === 12) f *= 1.5; // Navidad
    if (m === 1 || m === 2) f *= 0.8;
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) f *= 1.25;
    return f;
  };

  // Precompute a daily weight table to sample order dates with seasonality.
  const days: { ms: number; w: number }[] = [];
  for (let ms = start; ms < today; ms += DAY_MS) days.push({ ms, w: seasonality(ms) });
  const totalW = days.reduce((a, d) => a + d.w, 0);
  const sampleDay = (): number => {
    let r = rng.next() * totalW;
    for (const d of days) {
      r -= d.w;
      if (r <= 0) return d.ms;
    }
    return days[days.length - 1]!.ms;
  };

  const activeCustomers = customerMeta.filter(() => true);
  const totalActivity = activeCustomers.reduce((a, c) => a + c.activity, 0);
  while (orderId < config.volumes.orders) {
    // Pick a customer proportional to activity (power law).
    let r = rng.next() * totalActivity;
    let cust = activeCustomers[0]!;
    for (const c of activeCustomers) {
      r -= c.activity;
      if (r <= 0) {
        cust = c;
        break;
      }
    }
    const day = sampleDay();
    if (day < cust.signup) continue;
    const createdAt = day + rng.int(8, 23) * 3_600_000 + rng.int(0, 3_599_000);
    orderId++;
    const pool = productsByCountry.get(cust.country) ?? productMeta;
    const nItems = rng.weighted([
      { value: 1, weight: 55 },
      { value: 2, weight: 28 },
      { value: 3, weight: 12 },
      { value: 4, weight: 5 },
    ]);
    let subtotal = 0;
    const chosen = new Set<number>();
    for (let i = 0; i < nItems; i++) {
      const p = rng.pick(pool);
      if (chosen.has(p.id)) continue;
      chosen.add(p.id);
      const qty = rng.weighted([
        { value: 1, weight: 80 },
        { value: 2, weight: 15 },
        { value: 3, weight: 5 },
      ]);
      // Promotions: price at purchase may be below list.
      const unit = rng.chance(0.2)
        ? Math.round(p.price * rng.float(0.8, 0.95, 2) * 100) / 100
        : p.price;
      subtotal = Math.round((subtotal + unit * qty) * 100) / 100;
      orderItems.push([++itemId, orderId, p.id, qty, unit]);
    }
    const discount = rng.chance(0.15)
      ? Math.round(subtotal * rng.float(0.05, 0.2, 2) * 100) / 100
      : 0;
    const shippingFee = rng.chance(0.3)
      ? 0
      : Math.round(rng.float(2, 9, 2) * usdRate[cust.currency]! * 100) / 100;
    const total = Math.round((subtotal - discount + shippingFee) * 100) / 100;
    const ageDays = (today - createdAt) / DAY_MS;

    // Status via lifecycle; recent orders are more likely to be in transit.
    let status: string;
    if (ageDays < 2)
      status = rng.weighted([
        { value: "pending", weight: 40 },
        { value: "paid", weight: 45 },
        { value: "cancelled", weight: 15 },
      ]);
    else if (ageDays < 7)
      status = rng.weighted([
        { value: "paid", weight: 20 },
        { value: "shipped", weight: 45 },
        { value: "delivered", weight: 20 },
        { value: "cancelled", weight: 15 },
      ]);
    else
      status = rng.weighted([
        { value: "delivered", weight: 74 },
        { value: "cancelled", weight: 13 },
        { value: "returned", weight: 6 },
        { value: "shipped", weight: 4 },
        { value: "paid", weight: 3 },
      ]);
    const channel = rng.weighted([
      { value: "app", weight: 55 },
      { value: "web", weight: 38 },
      { value: "marketplace_partner", weight: 7 },
    ]);
    orders.push([
      orderId,
      cust.id,
      status,
      toIso(createdAt),
      cust.currency,
      subtotal,
      discount,
      shippingFee,
      total,
      channel,
    ]);

    // Payments: cancelled orders may have a rejected attempt; others have an approved payment,
    // sometimes preceded by a rejected one.
    const method = rng.weighted([
      { value: "credit_card", weight: 48 },
      { value: "debit_card", weight: 20 },
      { value: "wallet", weight: 18 },
      { value: "bank_transfer", weight: 9 },
      { value: "cash", weight: 5 },
    ]);
    const installments =
      method === "credit_card"
        ? rng.weighted([
            { value: 1, weight: 50 },
            { value: 3, weight: 25 },
            { value: 6, weight: 15 },
            { value: 12, weight: 10 },
          ])
        : 1;
    if (status === "pending") {
      if (rng.chance(0.3))
        payments.push([++paymentId, orderId, method, installments, total, "rejected", null]);
    } else if (status === "cancelled") {
      if (rng.chance(0.5))
        payments.push([++paymentId, orderId, method, installments, total, "rejected", null]);
    } else {
      if (rng.chance(0.08))
        payments.push([++paymentId, orderId, method, installments, total, "rejected", null]);
      const paidAt = createdAt + rng.int(1, 180) * 60_000;
      payments.push([
        ++paymentId,
        orderId,
        method,
        installments,
        total,
        status === "returned" ? "refunded" : "approved",
        toIso(paidAt),
      ]);

      // Shipments for paid+ orders.
      if (status !== "paid" || rng.chance(0.3)) {
        const shippedAt = paidAt + rng.int(4, 72) * 3_600_000;
        const deliveredAt =
          status === "delivered" || status === "returned"
            ? shippedAt + rng.int(24, 240) * 3_600_000
            : null;
        // Quality issue: ~1% of delivered shipments lack delivered_at.
        const missing = status === "delivered" && rng.chance(0.01);
        shipments.push([
          ++shipmentId,
          orderId,
          rng.pick(carriers),
          toIso(shippedAt),
          missing ? null : deliveredAt === null ? null : toIso(deliveredAt),
          String(customers[cust.id - 1]![4]),
        ]);
        if (status === "returned" && deliveredAt) {
          const requestedAt = deliveredAt + rng.int(1, 20) * DAY_MS;
          const refund = rng.chance(0.85)
            ? total
            : Math.round(total * rng.float(0.3, 0.9, 2) * 100) / 100;
          returns.push([
            ++returnId,
            orderId,
            rng.weighted([
              { value: "damaged", weight: 30 },
              { value: "wrong_item", weight: 20 },
              { value: "not_as_described", weight: 30 },
              { value: "changed_mind", weight: 20 },
            ]),
            toIso(requestedAt),
            refund,
          ]);
        }
        // Reviews: ~28% of delivered orders get a review on one of their products.
        if ((status === "delivered" || status === "returned") && deliveredAt && rng.chance(0.28)) {
          const pid = rng.pick([...chosen]);
          const rating =
            status === "returned"
              ? rng.int(1, 3)
              : rng.weighted([
                  { value: 5, weight: 45 },
                  { value: 4, weight: 30 },
                  { value: 3, weight: 13 },
                  { value: 2, weight: 7 },
                  { value: 1, weight: 5 },
                ]);
          const comments = [
            "Excelente calidad, llegó antes de lo esperado.",
            "Cumple con lo prometido.",
            "Buen producto, envío lento.",
            "No era lo que esperaba.",
            "Muy recomendable.",
            "Llegó dañado, pero el vendedor respondió rápido.",
            "Relación precio-calidad correcta.",
          ];
          reviews.push([
            ++reviewId,
            pid,
            cust.id,
            rating,
            rng.chance(0.35) ? null : rng.pick(comments),
            toIso(deliveredAt + rng.int(1, 15) * DAY_MS),
          ]);
        }
      }
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
        "customers",
        [
          "id",
          "full_name",
          "email",
          "country",
          "city",
          "signup_at",
          "birth_year",
          "marketing_opt_in",
        ],
        customers,
      ),
      table(
        "sellers",
        ["id", "store_name", "country", "joined_at", "rating", "is_verified"],
        sellers,
      ),
      table("categories", ["id", "name", "parent_id"], categories),
      table(
        "products",
        [
          "id",
          "seller_id",
          "category_id",
          "name",
          "list_price",
          "currency",
          "stock",
          "is_active",
          "created_at",
        ],
        products,
      ),
      table(
        "orders",
        [
          "id",
          "customer_id",
          "status",
          "created_at",
          "currency",
          "subtotal",
          "discount",
          "shipping_fee",
          "total_amount",
          "channel",
        ],
        orders,
      ),
      table("order_items", ["id", "order_id", "product_id", "quantity", "unit_price"], orderItems),
      table(
        "payments",
        ["id", "order_id", "method", "installments", "amount", "status", "paid_at"],
        payments,
      ),
      table(
        "shipments",
        ["id", "order_id", "carrier", "shipped_at", "delivered_at", "destination_city"],
        shipments,
      ),
      table(
        "reviews",
        ["id", "product_id", "customer_id", "rating", "comment", "created_at"],
        reviews,
      ),
      table("returns", ["id", "order_id", "reason", "requested_at", "refund_amount"], returns),
    ],
  };
}
