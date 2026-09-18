import { DAY_MS, Prng, toDate, toIso, utc } from "../_shared/prng";
import { countries, emailFor, givenNames, surnames, usdRate } from "../_shared/latam";
import type { Cell, GeneratedDataset, GeneratedTable } from "../_shared/types";
import { config } from "./config";
import { schemaSql } from "./schema";

/**
 * Pídelo generator — deterministic synthetic food-delivery data (docs/CURRICULUM.md §4).
 * Business rules: orders follow placed → accepted → preparing → picked_up → delivered, or are
 * cancelled at some stage; every step is an order_event; delivered orders have delivered_at
 * and a courier; totals = subtotal + delivery_fee - discount; ratings exist only for delivered
 * orders (and only for ~55 % of them); promotions have validity windows and per-customer caps.
 * Intentional quality issues: promo abuse (single-use promos redeemed several times by the
 * same customer), delivered orders past the promised time, inactive restaurants with recent
 * orders, ratings without restaurant or courier score, orders with no items (cancelled early).
 */
export function generate(): GeneratedDataset {
  const rng = new Prng(config.seed);
  const start = utc(2024, 3, 1);
  const today = utc(2025, 9, 15, 12, 0);
  const span = today - start;

  // Cities --------------------------------------------------------------------------------
  const cityDefs = [
    ["Buenos Aires", "AR"],
    ["Córdoba", "AR"],
    ["Ciudad de México", "MX"],
    ["Guadalajara", "MX"],
    ["Bogotá", "CO"],
    ["Santiago", "CL"],
    ["Lima", "PE"],
    ["Montevideo", "UY"],
  ] as const;
  const cities: Cell[][] = cityDefs.map(([name, code], i) => [
    i + 1,
    name,
    code,
    countries.find((c) => c.code === code)!.timezone,
  ]);
  const cityCurrency = cityDefs.map(([, code]) => countries.find((c) => c.code === code)!.currency);
  const local = (city: number, usd: number) =>
    Math.round(usd * (usdRate[cityCurrency[city - 1]!] ?? 1) * 100) / 100;
  const cityWeights = [22, 8, 24, 8, 14, 10, 9, 5];
  const pickCity = () => rng.weighted(cityWeights.map((weight, i) => ({ value: i + 1, weight })));

  // Restaurants + menu items --------------------------------------------------------------
  const cuisines = [
    "pizza",
    "hamburguesas",
    "sushi",
    "empanadas",
    "tacos",
    "vegetariana",
    "parrilla",
    "china",
    "cafetería",
    "helados",
  ];
  const restaurantWords = [
    "La Esquina",
    "Don",
    "Doña",
    "El Rincón",
    "Casa",
    "Lo de",
    "Sabor",
    "Fuego",
  ];
  const restaurants: Cell[][] = [];
  const restaurantCity: number[] = [];
  const menuItems: Cell[][] = [];
  const itemsOfRestaurant = new Map<number, number[]>();
  const itemPrice = new Map<number, number>();
  const menuByCuisine: Record<string, string[]> = {
    pizza: ["Muzzarella", "Napolitana", "Fugazzeta", "Calabresa"],
    hamburguesas: ["Clásica", "Doble", "Veggie", "Papas"],
    sushi: ["Roll salmón", "Niguiri", "Combo 20", "Edamame"],
    empanadas: ["Docena mixta", "Media docena", "Carne cortada", "Humita"],
    tacos: ["Pastor", "Barbacoa", "Quesadilla", "Guacamole"],
    vegetariana: ["Bowl", "Wrap", "Ensalada", "Falafel"],
    parrilla: ["Asado", "Choripán", "Provoleta", "Vacío"],
    china: ["Arroz frito", "Chow mein", "Rollitos", "Pollo agridulce"],
    cafetería: ["Café", "Medialunas", "Tostado", "Torta"],
    helados: ["Cuarto", "Medio kilo", "Kilo", "Paleta"],
  };
  for (let id = 1; id <= config.volumes.restaurants; id++) {
    const city = pickCity();
    const cuisine = rng.pick(cuisines);
    restaurantCity.push(city);
    restaurants.push([
      id,
      city,
      `${rng.pick(restaurantWords)} ${rng.pick(surnames)} ${id}`,
      cuisine,
      rng.chance(0.12) ? null : rng.float(3.5, 5, 1),
      rng.pick([12, 15, 18, 22]),
      toDate(start - rng.int(0, 400) * DAY_MS),
      rng.chance(0.9),
    ]);
    const names = menuByCuisine[cuisine]!;
    for (let k = 0; k < names.length + rng.int(2, 6); k++) {
      const itemId = menuItems.length + 1;
      const base = names[k % names.length]!;
      const price = local(city, rng.float(3, 18));
      menuItems.push([
        itemId,
        id,
        k < names.length ? base : `${base} ${k + 1}`,
        k % 4 === 3 ? "acompañamiento" : k % 5 === 4 ? "bebida" : "principal",
        price,
        rng.chance(0.93),
      ]);
      itemPrice.set(itemId, price);
      itemsOfRestaurant.set(id, [...(itemsOfRestaurant.get(id) ?? []), itemId]);
    }
  }

  // Customers and couriers ----------------------------------------------------------------
  const customers: Cell[][] = [];
  const customerCity: number[] = [];
  const customerSignup: number[] = [];
  for (let id = 1; id <= config.volumes.customers; id++) {
    const city = pickCity();
    const name = `${rng.pick(givenNames)} ${rng.pick(surnames)}`;
    const signup = start + Math.floor(Math.pow(rng.next(), 0.7) * span);
    customerCity.push(city);
    customerSignup.push(signup);
    customers.push([
      id,
      city,
      name,
      emailFor(name, id, "pidelo.lat"),
      toIso(signup),
      rng.chance(0.85),
    ]);
  }
  const couriers: Cell[][] = [];
  const couriersOfCity = new Map<number, number[]>();
  for (let id = 1; id <= config.volumes.couriers; id++) {
    const city = pickCity();
    couriers.push([
      id,
      city,
      `${rng.pick(givenNames)} ${rng.pick(surnames)}`,
      rng.weighted([
        { value: "bike", weight: 45 },
        { value: "moto", weight: 45 },
        { value: "car", weight: 10 },
      ]),
      toDate(start - rng.int(-300, 300) * DAY_MS),
      rng.chance(0.8),
    ]);
    couriersOfCity.set(city, [...(couriersOfCity.get(city) ?? []), id]);
  }

  // Promotions ----------------------------------------------------------------------------
  const promotions: Cell[][] = [];
  const promoDefs: [string, string, number, number, number, number | null][] = [
    ["BIENVENIDA", "percent", 30, 0, 600, 1],
    ["ENVIOGRATIS", "free_delivery", 0, 0, 600, null],
    ["VERANO25", "percent", 25, 300, 60, 2],
    ["FINDE", "fixed", 3, 100, 500, null],
    ["MUNDIAL", "percent", 15, 250, 45, 3],
    ["VUELVE", "fixed", 5, 400, 200, 1],
  ];
  for (const [i, [code, kind, value, offset, days, cap]] of promoDefs.entries()) {
    const s = start + offset * DAY_MS;
    promotions.push([i + 1, code, kind, value, toDate(s), toDate(s + days * DAY_MS), cap]);
  }

  // Orders, items, events, ratings --------------------------------------------------------
  const orders: Cell[][] = [];
  const orderItems: Cell[][] = [];
  const orderEvents: Cell[][] = [];
  const ratings: Cell[][] = [];
  const promoUses = new Map<string, number>();
  const restaurantsOfCity = new Map<number, number[]>();
  restaurantCity.forEach((c, i) =>
    restaurantsOfCity.set(c, [...(restaurantsOfCity.get(c) ?? []), i + 1]),
  );
  const customerWeight = customers.map(() => rng.pareto(1.3, 60));
  const wsum = customerWeight.reduce((a, b) => a + b, 0);
  const pushEvent = (orderId: number, event: string, at: number) =>
    orderEvents.push([orderEvents.length + 1, orderId, event, toIso(at)]);

  for (let c = 1; c <= config.volumes.customers; c++) {
    const n = Math.round((customerWeight[c - 1]! / wsum) * config.volumes.orders);
    const city = customerCity[c - 1]!;
    const options = restaurantsOfCity.get(city) ?? [1];
    const favorite = rng.pick(options);
    let t = customerSignup[c - 1]! + rng.int(0, 5) * DAY_MS;
    for (let i = 0; i < n; i++) {
      t += Math.floor(rng.float(0.5, 20) * DAY_MS);
      if (t >= today) break;
      // Evening peak: shift the hour toward 12–14 and 19–23.
      const hour = rng.chance(0.65) ? rng.int(19, 23) : rng.int(11, 15);
      const placed = t - (t % DAY_MS) + hour * 3_600_000 + rng.int(0, 3599) * 1000;
      if (placed >= today) break;
      const restaurant = rng.chance(0.45) ? favorite : rng.pick(options);
      const items = itemsOfRestaurant.get(restaurant) ?? [];
      const orderId = orders.length + 1;

      // Status machine with cancellation probability at each stage.
      const stages = ["placed", "accepted", "preparing", "picked_up", "delivered"];
      let reached = 0;
      let cancelled = false;
      for (let s = 1; s < stages.length; s++) {
        const pCancel = s === 1 ? 0.04 : s === 2 ? 0.02 : 0.01;
        if (rng.chance(pCancel)) {
          cancelled = true;
          break;
        }
        reached = s;
      }
      const status = cancelled ? "cancelled" : stages[reached]!;
      // Some recent orders are still in flight.
      const inFlight = !cancelled && today - placed < 2 * 3_600_000 && rng.chance(0.5);
      const finalStatus = inFlight ? rng.pick(["accepted", "preparing", "picked_up"]) : status;

      // Items (cancelled-at-placed orders sometimes have none: quality issue).
      let subtotal = 0;
      const nItems = cancelled && reached === 0 && rng.chance(0.3) ? 0 : rng.int(1, 4);
      for (let k = 0; k < nItems && items.length; k++) {
        const itemId = rng.pick(items);
        const qty = rng.weighted([
          { value: 1, weight: 70 },
          { value: 2, weight: 25 },
          { value: 3, weight: 5 },
        ]);
        const price = itemPrice.get(itemId)!;
        orderItems.push([orderItems.length + 1, orderId, itemId, qty, price]);
        subtotal += qty * price;
      }
      subtotal = Math.round(subtotal * 100) / 100;
      const deliveryFee = local(city, rng.pick([1.5, 2, 2.5, 3]));

      // Promotions: valid window; per-customer cap intentionally violated ~15 % of the time.
      let promotionId: number | null = null;
      let discount = 0;
      let fee = deliveryFee;
      if (rng.chance(0.18)) {
        const valid = promotions.filter(
          (p) =>
            placed >= Date.parse(p[4] as string) && placed <= Date.parse(p[5] as string) + DAY_MS,
        );
        if (valid.length) {
          const p = rng.pick(valid);
          const key = `${c}:${p[0]}`;
          const uses = promoUses.get(key) ?? 0;
          const cap = p[6] as number | null;
          if (cap === null || uses < cap || rng.chance(0.15)) {
            promotionId = p[0] as number;
            promoUses.set(key, uses + 1);
            if (p[2] === "percent") discount = Math.round(subtotal * (p[3] as number)) / 100;
            else if (p[2] === "fixed") discount = Math.min(subtotal, local(city, p[3] as number));
            else fee = 0;
          }
        }
      }
      const total = Math.round((subtotal + fee - discount) * 100) / 100;
      const promised = rng.pick([30, 35, 40, 45, 50, 60]);

      // Courier assigned from picked_up onwards (or accepted for in-flight).
      const cityCouriers = couriersOfCity.get(city) ?? [];
      const needsCourier =
        ["picked_up", "delivered"].includes(finalStatus) || (inFlight && rng.chance(0.5));
      const courierId = needsCourier && cityCouriers.length ? rng.pick(cityCouriers) : null;

      // Events timeline. Delivered orders fix the end time first so events stay chronological.
      let deliveredAt: number | null = null;
      if (finalStatus === "delivered") {
        // ~22 % of deliveries exceed the promise.
        const late = rng.chance(0.22);
        const minutes = late
          ? promised + rng.int(5, 40)
          : rng.int(Math.max(12, promised - 20), promised);
        deliveredAt = placed + minutes * 60_000;
      }
      pushEvent(orderId, "placed", placed);
      if (deliveredAt !== null) {
        const fractions = [0.08, 0.2, 0.7, 1];
        stages.slice(1).forEach((stage, i) => {
          pushEvent(orderId, stage, placed + Math.round((deliveredAt! - placed) * fractions[i]!));
        });
      } else {
        let at = placed;
        const finalIndex = finalStatus === "cancelled" ? reached : stages.indexOf(finalStatus);
        for (let s = 1; s <= finalIndex; s++) {
          at += rng.int(2, 12) * 60_000 + (s === 4 ? rng.int(5, 30) * 60_000 : 0);
          pushEvent(orderId, stages[s]!, at);
        }
        if (finalStatus === "cancelled") {
          at += rng.int(1, 15) * 60_000;
          pushEvent(orderId, "cancelled", at);
        }
      }

      orders.push([
        orderId,
        c,
        restaurant,
        courierId,
        promotionId,
        toIso(placed),
        finalStatus,
        subtotal,
        fee,
        discount,
        total,
        rng.weighted([
          { value: "card", weight: 55 },
          { value: "wallet", weight: 30 },
          { value: "cash", weight: 15 },
        ]),
        promised,
        deliveredAt === null ? null : toIso(deliveredAt),
      ]);

      // Ratings for ~55 % of delivered orders; some partial.
      if (deliveredAt !== null && rng.chance(0.55)) {
        const late = deliveredAt - placed > promised * 60_000;
        const rr = rng.chance(0.1)
          ? null
          : Math.min(5, Math.max(1, Math.round(rng.normal(4.3, 0.8))));
        const cr = rng.chance(0.2)
          ? null
          : Math.min(5, Math.max(1, Math.round(rng.normal(late ? 3.2 : 4.5, 0.8))));
        ratings.push([
          ratings.length + 1,
          orderId,
          rr,
          cr,
          rng.chance(0.3)
            ? rng.pick(["Todo bien", "Llegó frío", "Muy rápido", "Faltó una bebida", "Excelente"])
            : null,
          toIso(deliveredAt + rng.int(5, 240) * 60_000),
        ]);
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
      table("cities", ["id", "name", "country", "timezone"], cities),
      table(
        "restaurants",
        ["id", "city_id", "name", "cuisine", "rating", "commission_pct", "joined_at", "is_active"],
        restaurants,
      ),
      table(
        "menu_items",
        ["id", "restaurant_id", "name", "category", "price", "is_available"],
        menuItems,
      ),
      table(
        "customers",
        ["id", "city_id", "full_name", "email", "signup_at", "phone_verified"],
        customers,
      ),
      table(
        "couriers",
        ["id", "city_id", "full_name", "vehicle", "started_at", "is_active"],
        couriers,
      ),
      table(
        "promotions",
        ["id", "code", "kind", "value", "starts_at", "ends_at", "max_uses_per_customer"],
        promotions,
      ),
      table(
        "orders",
        [
          "id",
          "customer_id",
          "restaurant_id",
          "courier_id",
          "promotion_id",
          "placed_at",
          "status",
          "subtotal",
          "delivery_fee",
          "discount",
          "total",
          "payment_method",
          "promised_minutes",
          "delivered_at",
        ],
        orders,
      ),
      table(
        "order_items",
        ["id", "order_id", "menu_item_id", "quantity", "unit_price"],
        orderItems,
      ),
      table("order_events", ["id", "order_id", "event", "event_at"], orderEvents),
      table(
        "ratings",
        ["id", "order_id", "restaurant_rating", "courier_rating", "comment", "created_at"],
        ratings,
      ),
    ],
  };
}
