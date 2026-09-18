import type { DatasetDef } from "../schemas/curriculum";

/**
 * Pídelo — delivery de comida en ocho ciudades latinoamericanas. Column names in English;
 * descriptions in Spanish. The generator in src/datasets/pidelo must produce exactly this schema.
 */
const col = (
  name: string,
  data_type: string,
  description: string,
  opts: { pk?: boolean; fk?: string | null } = {},
) => ({ name, data_type, description, is_pk: opts.pk ?? false, fk_ref: opts.fk ?? null });

export const pidelo: DatasetDef = {
  slug: "pidelo",
  version: 1,
  title: "Pídelo",
  domain: "Delivery de comida",
  description:
    "Plataforma de delivery con restaurantes, menús, clientes, repartidores, pedidos con línea de tiempo de eventos (funnel), promociones con ventana de validez, tiempos prometidos vs. reales y calificaciones parciales. Incluye abuso de promociones, entregas tardías y restaurantes inactivos con pedidos.",
  is_active: true,
  tables: [
    {
      name: "cities",
      description: "Ciudades donde opera Pídelo, con su zona horaria IANA.",
      columns: [
        col("id", "integer", "Identificador de la ciudad", { pk: true }),
        col("name", "text", "Nombre"),
        col("country", "char(2)", "País ISO-2"),
        col("timezone", "text", "Zona horaria (por ejemplo America/Lima)"),
      ],
    },
    {
      name: "restaurants",
      description:
        "Restaurantes adheridos. Algunos inactivos conservan pedidos recientes (problema de calidad intencional).",
      columns: [
        col("id", "integer", "Identificador del restaurante", { pk: true }),
        col("city_id", "integer", "Ciudad", { fk: "cities.id" }),
        col("name", "text", "Nombre ficticio"),
        col(
          "cuisine",
          "text",
          "Tipo de cocina: pizza, hamburguesas, sushi, empanadas, tacos, vegetariana, parrilla, china, cafetería, helados",
        ),
        col("rating", "numeric(2,1)", "Calificación promedio publicada; NULL en ~12 %"),
        col("commission_pct", "numeric(4,2)", "Comisión de la plataforma (%)"),
        col("joined_at", "date", "Fecha de alta"),
        col("is_active", "boolean", "Visible en la app"),
      ],
    },
    {
      name: "menu_items",
      description: "Platos y bebidas de cada restaurante, con precio en la moneda de la ciudad.",
      columns: [
        col("id", "integer", "Identificador del ítem", { pk: true }),
        col("restaurant_id", "integer", "Restaurante", { fk: "restaurants.id" }),
        col("name", "text", "Nombre del plato"),
        col("category", "text", "principal, acompañamiento o bebida"),
        col("price", "numeric(10,2)", "Precio de lista actual"),
        col("is_available", "boolean", "Disponible hoy"),
      ],
    },
    {
      name: "customers",
      description: "Clientes de la app.",
      columns: [
        col("id", "integer", "Identificador del cliente", { pk: true }),
        col("city_id", "integer", "Ciudad", { fk: "cities.id" }),
        col("full_name", "text", "Nombre y apellido ficticios"),
        col("email", "text", "Correo ficticio (@pidelo.lat)"),
        col("signup_at", "timestamptz", "Alta (UTC)"),
        col("phone_verified", "boolean", "Teléfono verificado"),
      ],
    },
    {
      name: "couriers",
      description: "Repartidores por ciudad.",
      columns: [
        col("id", "integer", "Identificador del repartidor", { pk: true }),
        col("city_id", "integer", "Ciudad", { fk: "cities.id" }),
        col("full_name", "text", "Nombre ficticio"),
        col("vehicle", "text", "bike, moto o car"),
        col("started_at", "date", "Inicio de actividad"),
        col("is_active", "boolean", "Activo"),
      ],
    },
    {
      name: "promotions",
      description:
        "Códigos promocionales con ventana de validez y tope de usos por cliente (no siempre respetado).",
      columns: [
        col("id", "integer", "Identificador", { pk: true }),
        col("code", "text", "Código"),
        col("kind", "text", "percent, fixed o free_delivery"),
        col(
          "value",
          "numeric(10,2)",
          "Porcentaje (percent) o monto en USD equivalente (fixed); 0 para free_delivery",
        ),
        col("starts_at", "date", "Inicio de validez"),
        col("ends_at", "date", "Fin de validez (inclusive)"),
        col("max_uses_per_customer", "integer", "Tope por cliente; NULL = sin tope"),
      ],
    },
    {
      name: "orders",
      description:
        "Pedidos. status: placed, accepted, preparing, picked_up, delivered o cancelled. total = subtotal + delivery_fee - discount. delivered_at solo en entregados; promised_minutes es la promesa al cliente.",
      columns: [
        col("id", "integer", "Identificador del pedido", { pk: true }),
        col("customer_id", "integer", "Cliente", { fk: "customers.id" }),
        col("restaurant_id", "integer", "Restaurante", { fk: "restaurants.id" }),
        col(
          "courier_id",
          "integer",
          "Repartidor asignado; NULL antes de la recogida o si se canceló",
          { fk: "couriers.id" },
        ),
        col("promotion_id", "integer", "Promoción aplicada; NULL si ninguna", {
          fk: "promotions.id",
        }),
        col("placed_at", "timestamptz", "Momento del pedido (UTC)"),
        col("status", "text", "Estado actual"),
        col("subtotal", "numeric(10,2)", "Suma de ítems"),
        col("delivery_fee", "numeric(10,2)", "Costo de envío (0 con envío gratis)"),
        col("discount", "numeric(10,2)", "Descuento aplicado"),
        col("total", "numeric(10,2)", "Total cobrado"),
        col("payment_method", "text", "card, wallet o cash"),
        col("promised_minutes", "integer", "Tiempo prometido de entrega"),
        col("delivered_at", "timestamptz", "Entrega real; NULL si no se entregó"),
      ],
    },
    {
      name: "order_items",
      description:
        "Detalle de cada pedido con el precio al momento de la compra. Algunos pedidos cancelados no tienen ítems.",
      columns: [
        col("id", "integer", "Identificador del ítem de pedido", { pk: true }),
        col("order_id", "integer", "Pedido", { fk: "orders.id" }),
        col("menu_item_id", "integer", "Plato", { fk: "menu_items.id" }),
        col("quantity", "integer", "Cantidad"),
        col("unit_price", "numeric(10,2)", "Precio unitario cobrado"),
      ],
    },
    {
      name: "order_events",
      description:
        "Línea de tiempo de cada pedido: placed, accepted, preparing, picked_up, delivered, cancelled. Base para funnels y SLA.",
      columns: [
        col("id", "integer", "Identificador del evento", { pk: true }),
        col("order_id", "integer", "Pedido", { fk: "orders.id" }),
        col("event", "text", "Nombre del evento"),
        col("event_at", "timestamptz", "Momento (UTC)"),
      ],
    },
    {
      name: "ratings",
      description:
        "Calificaciones posteriores a la entrega (solo ~55 % de los pedidos entregados); puede faltar la del restaurante o la del repartidor.",
      columns: [
        col("id", "integer", "Identificador", { pk: true }),
        col("order_id", "integer", "Pedido entregado", { fk: "orders.id" }),
        col("restaurant_rating", "integer", "1–5 o NULL"),
        col("courier_rating", "integer", "1–5 o NULL"),
        col("comment", "text", "Comentario libre; NULL en la mayoría"),
        col("created_at", "timestamptz", "Momento de la calificación (UTC)"),
      ],
    },
  ],
};
