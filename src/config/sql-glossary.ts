/**
 * Spanish glosses for the English identifiers used in the datasets.
 *
 * Table and column names stay in English because that is what every data job uses (docs/
 * CONTENT_GUIDELINES.md), but a learner whose English is shaky should not have to guess what
 * `shipped_at` or `seller_id` means. The schema panel shows these next to each name.
 *
 * Lookup order: exact name, then a suffix rule, then a word-by-word translation. Anything that
 * resolves to nothing simply shows no gloss — a wrong gloss would be worse than none.
 */
const EXACT: Record<string, string> = {
  id: "identificador",
  customers: "clientes",
  orders: "pedidos",
  order_items: "líneas del pedido",
  products: "productos",
  sellers: "vendedores",
  categories: "categorías",
  payments: "pagos",
  shipments: "envíos",
  reviews: "reseñas",
  returns: "devoluciones",
  accounts: "cuentas",
  transactions: "movimientos",
  cards: "tarjetas",
  merchants: "comercios",
  restaurants: "restaurantes",
  couriers: "repartidores",
  cities: "ciudades",
  menu_items: "ítems del menú",
  users: "usuarios",
  artists: "artistas",
  albums: "álbumes",
  tracks: "canciones",
  plays: "reproducciones",
  playlists: "listas de reproducción",
  playlist_tracks: "canciones de la lista",
  subscriptions: "suscripciones",
  follows: "seguimientos",
  full_name: "nombre completo",
  name: "nombre",
  email: "correo",
  country: "país",
  city: "ciudad",
  status: "estado",
  amount: "importe",
  total_amount: "importe total",
  subtotal: "subtotal",
  discount: "descuento",
  shipping_fee: "costo de envío",
  currency: "moneda",
  quantity: "cantidad",
  unit_price: "precio unitario",
  list_price: "precio de lista",
  stock: "stock disponible",
  rating: "calificación",
  comment: "comentario",
  installments: "cuotas",
  channel: "canal",
  carrier: "transportista",
  description: "descripción",
  kind: "tipo",
  direction: "sentido (entrada o salida)",
  balance: "saldo",
  is_flagged: "marcado como sospechoso",
  reversal_of: "reverso de",
  store_name: "nombre de la tienda",
  parent_id: "categoría padre",
  cuisine: "tipo de cocina",
  device: "dispositivo",
  plan: "plan",
  duration_seconds: "duración en segundos",
  seconds_played: "segundos escuchados",
  is_explicit: "contenido explícito",
  is_public: "pública",
  genre: "género",
  monthly_listeners: "oyentes mensuales",
};

/** Suffix rules, applied when the full name is not in the table above. */
const SUFFIXES: [RegExp, (stem: string) => string][] = [
  [/_id$/, (stem) => `identificador de ${glossWord(stem)}`],
  [/_at$/, (stem) => `fecha y hora de ${glossWord(stem)}`],
  [/_on$/, (stem) => `fecha de ${glossWord(stem)}`],
  [/_date$/, (stem) => `fecha de ${glossWord(stem)}`],
  [/_count$/, (stem) => `cantidad de ${glossWord(stem)}`],
  [/_minor$/, (stem) => `${glossWord(stem)} en centavos`],
  [/^is_/, (stem) => `indica si ${glossWord(stem)}`],
];

const WORDS: Record<string, string> = {
  created: "creación",
  updated: "actualización",
  signup: "registro",
  shipped: "despacho",
  delivered: "entrega",
  completed: "finalización",
  cancelled: "cancelación",
  released: "publicación",
  started: "inicio",
  ended: "fin",
  churned: "baja",
  followed: "seguimiento",
  played: "reproducción",
  order: "pedido",
  customer: "cliente",
  seller: "vendedor",
  product: "producto",
  category: "categoría",
  account: "cuenta",
  card: "tarjeta",
  merchant: "comercio",
  restaurant: "restaurante",
  courier: "repartidor",
  city: "ciudad",
  user: "usuario",
  artist: "artista",
  album: "álbum",
  track: "canción",
  playlist: "lista",
  promo: "promoción",
  refund: "reembolso",
  amount: "importe",
  redemptions: "canjes",
  attempts: "intentos",
};

function glossWord(stem: string): string {
  const key = stem.replace(/^is_/, "").replace(/_(id|at|on|date|count|minor)$/, "");
  return WORDS[key] ?? EXACT[key] ?? key.replace(/_/g, " ");
}

/** Returns a short Spanish gloss for a table or column name, or null when none is confident. */
export function glossFor(identifier: string): string | null {
  const name = identifier.toLowerCase();
  if (EXACT[name]) return EXACT[name];
  for (const [pattern, build] of SUFFIXES) {
    if (pattern.test(name)) {
      const gloss = build(name);
      return gloss.includes("undefined") ? null : gloss;
    }
  }
  return WORDS[name] ?? null;
}
