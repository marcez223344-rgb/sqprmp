import type { DatasetDef } from "../schemas/curriculum";

/**
 * Ritmo — servicio ficticio de streaming musical latinoamericano. Column names in English;
 * descriptions in Spanish. The generator in src/datasets/ritmo must produce exactly this schema.
 */
const col = (
  name: string,
  data_type: string,
  description: string,
  opts: { pk?: boolean; fk?: string | null } = {},
) => ({ name, data_type, description, is_pk: opts.pk ?? false, fk_ref: opts.fk ?? null });

export const ritmo: DatasetDef = {
  slug: "ritmo",
  version: 1,
  title: "Ritmo",
  domain: "Streaming de música",
  description:
    "Servicio de streaming musical en seis mercados (MX, BR, AR, CO, CL, PE) con catálogo inventado de artistas, álbumes y canciones, historial de reproducciones minuto a minuto, listas de reproducción, seguidores y suscripciones pagas. Pensado para cohortes y retención, embudos (alta → primera reproducción → lista → pago), totales acumulados, medias móviles, rankings por país y mes, LAG/LEAD sobre el historial de escucha, deduplicación y limpieza de datos sucios.",
  is_active: true,
  tables: [
    {
      name: "users",
      description:
        "Oyentes registrados. plan_tier es el estado actual: coincide con la suscripción abierta o es 'free' si no hay ninguna. churned_at marca el abandono; después de esa fecha no hay reproducciones.",
      columns: [
        col("id", "integer", "Identificador del oyente", { pk: true }),
        col("country", "char(2)", "Mercado ISO-2: MX, BR, AR, CO, CL o PE"),
        col("signup_at", "timestamptz", "Alta en el servicio (UTC)"),
        col("plan_tier", "text", "Plan vigente: free, premium o familiar"),
        col("age_band", "text", "Banda etaria declarada: 18-24, 25-34, 35-44, 45-54 o 55+"),
        col("churned_at", "timestamptz", "Momento del abandono; NULL si sigue activo"),
      ],
    },
    {
      name: "artists",
      description:
        "Artistas ficticios del catálogo. monthly_listeners es la cifra publicada en la ficha del artista, nunca menor que los oyentes distintos observados en los últimos 30 días.",
      columns: [
        col("id", "integer", "Identificador del artista", { pk: true }),
        col("name", "text", "Nombre artístico inventado"),
        col("country", "char(2)", "País de origen"),
        col("genre", "text", "Género principal (cumbia, reguetón, samba, sertanejo, etc.)"),
        col("monthly_listeners", "integer", "Oyentes mensuales publicados"),
      ],
    },
    {
      name: "albums",
      description: "Álbumes publicados por cada artista, entre 2018 y junio de 2025.",
      columns: [
        col("id", "integer", "Identificador del álbum", { pk: true }),
        col("artist_id", "integer", "Artista", { fk: "artists.id" }),
        col("title", "text", "Título inventado"),
        col("released_on", "date", "Fecha de publicación"),
      ],
    },
    {
      name: "tracks",
      description:
        "Canciones de cada álbum. duration_seconds va de 95 a 560 segundos; las dos primeras canciones de cada álbum concentran las reproducciones (singles).",
      columns: [
        col("id", "integer", "Identificador de la canción", { pk: true }),
        col("album_id", "integer", "Álbum", { fk: "albums.id" }),
        col("title", "text", "Título inventado"),
        col("duration_seconds", "integer", "Duración en segundos"),
        col("is_explicit", "boolean", "Marcada como explícita (~17 %)"),
      ],
    },
    {
      name: "plays",
      description:
        "Tabla de hechos: cada reproducción con su momento, segundos escuchados y dispositivo. completed es verdadero cuando se escuchó al menos el 90 % de la canción. Contiene problemas de calidad deliberados: filas duplicadas exactas, device NULL, seconds_played NULL, negativo o mayor que la duración.",
      columns: [
        col("id", "integer", "Identificador de la reproducción", { pk: true }),
        col("user_id", "integer", "Oyente", { fk: "users.id" }),
        col("track_id", "integer", "Canción", { fk: "tracks.id" }),
        col("played_at", "timestamptz", "Inicio de la reproducción (UTC)"),
        col(
          "seconds_played",
          "integer",
          "Segundos escuchados; NULL en 90 filas y con valores imposibles en otras",
        ),
        col("device", "text", "mobile, desktop, web, tv o speaker; NULL en ~1,6 %"),
        col("completed", "boolean", "Se escuchó al menos el 90 % de la canción"),
      ],
    },
    {
      name: "playlists",
      description: "Listas creadas por los oyentes, siempre después de su primera reproducción.",
      columns: [
        col("id", "integer", "Identificador de la lista", { pk: true }),
        col("user_id", "integer", "Oyente dueño de la lista", { fk: "users.id" }),
        col("name", "text", "Nombre de la lista"),
        col("created_at", "timestamptz", "Creación (UTC)"),
        col("is_public", "boolean", "Visible para otras personas (~34 %)"),
      ],
    },
    {
      name: "playlist_tracks",
      description:
        "Canciones de cada lista, sin repetidos dentro de la misma lista y numeradas de 1 a n.",
      columns: [
        col("id", "integer", "Identificador", { pk: true }),
        col("playlist_id", "integer", "Lista", { fk: "playlists.id" }),
        col("track_id", "integer", "Canción", { fk: "tracks.id" }),
        col("position", "integer", "Orden dentro de la lista (1..n)"),
        col("added_at", "timestamptz", "Momento en que se agregó (UTC)"),
      ],
    },
    {
      name: "subscriptions",
      description:
        "Períodos de suscripción paga. No se superponen entre sí para un mismo oyente; ended_on NULL indica el período vigente. amount_minor está en unidades menores de la moneda del mercado (centavos, o pesos enteros donde no hay centavos).",
      columns: [
        col("id", "integer", "Identificador", { pk: true }),
        col("user_id", "integer", "Oyente", { fk: "users.id" }),
        col("plan", "text", "premium o familiar"),
        col("started_on", "date", "Inicio del período"),
        col("ended_on", "date", "Fin del período; NULL si sigue vigente"),
        col("amount_minor", "integer", "Precio mensual en unidades menores"),
        col("currency", "char(3)", "MXN, BRL, ARS, COP, CLP o PEN"),
      ],
    },
    {
      name: "follows",
      description: "Seguimientos de artistas; un oyente sigue a un artista una sola vez.",
      columns: [
        col("id", "integer", "Identificador", { pk: true }),
        col("user_id", "integer", "Oyente", { fk: "users.id" }),
        col("artist_id", "integer", "Artista seguido", { fk: "artists.id" }),
        col("followed_at", "timestamptz", "Momento en que empezó a seguirlo (UTC)"),
      ],
    },
  ],
};
