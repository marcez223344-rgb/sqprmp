import type { DatasetDef } from "../schemas/curriculum";

/**
 * Bolsillo — billetera digital latinoamericana. Column names in English; descriptions in
 * Spanish. The generator in src/datasets/bolsillo must produce exactly this schema.
 */
const col = (
  name: string,
  data_type: string,
  description: string,
  opts: { pk?: boolean; fk?: string | null } = {},
) => ({ name, data_type, description, is_pk: opts.pk ?? false, fk_ref: opts.fk ?? null });

export const bolsillo: DatasetDef = {
  slug: "bolsillo",
  version: 1,
  title: "Bolsillo",
  domain: "Billetera digital / fintech",
  description:
    "Billetera digital con cuentas en moneda local y USD, cargas, pagos con tarjeta y QR, transferencias entre personas, reversos, comisiones, eventos KYC y tipos de cambio diarios. Incluye transiciones de estado, transacciones marcadas por fraude y problemas de calidad documentados.",
  is_active: true,
  tables: [
    {
      name: "users",
      description:
        "Personas usuarias. kyc_level 0–3 (0 = sin verificar). Algunas cuentas bloqueadas conservan su historial (problema de calidad intencional).",
      columns: [
        col("id", "integer", "Identificador de la persona", { pk: true }),
        col("full_name", "text", "Nombre y apellido ficticios"),
        col("email", "text", "Correo ficticio (@bolsillo.lat)"),
        col("country", "char(2)", "País ISO-2: AR, MX, CO, CL, PE, UY"),
        col("city", "text", "Ciudad de residencia"),
        col("birth_date", "date", "Fecha de nacimiento; NULL en ~7 % de los registros"),
        col("signup_at", "timestamptz", "Fecha y hora de alta (UTC)"),
        col("kyc_level", "integer", "Nivel de verificación de identidad alcanzado (0–3)"),
        col("is_blocked", "boolean", "Bloqueada por riesgo/fraude"),
      ],
    },
    {
      name: "accounts",
      description:
        "Cuentas por moneda: una en moneda local por persona y, opcionalmente, una en USD (solo kyc_level ≥ 2). Las cuentas cerradas muestran saldo 0 aunque tengan movimientos.",
      columns: [
        col("id", "integer", "Identificador de la cuenta", { pk: true }),
        col("user_id", "integer", "Persona titular", { fk: "users.id" }),
        col("currency", "char(3)", "Moneda de la cuenta: ARS, MXN, COP, CLP, PEN, UYU o USD"),
        col("opened_at", "timestamptz", "Apertura (UTC)"),
        col("balance", "numeric(14,2)", "Saldo actual = suma de movimientos completados"),
        col("status", "text", "active, frozen o closed"),
      ],
    },
    {
      name: "merchants",
      description: "Comercios que reciben pagos con tarjeta o QR.",
      columns: [
        col("id", "integer", "Identificador del comercio", { pk: true }),
        col("name", "text", "Nombre ficticio"),
        col(
          "category",
          "text",
          "Rubro: supermercado, restaurante, transporte, farmacia, servicios, entretenimiento, ropa, tecnologia, combustible, educacion",
        ),
        col("country", "char(2)", "País ISO-2"),
        col("is_online", "boolean", "Comercio electrónico (sin local físico)"),
      ],
    },
    {
      name: "cards",
      description:
        "Tarjetas prepagas virtuales y físicas asociadas a una persona (requiere kyc_level ≥ 1).",
      columns: [
        col("id", "integer", "Identificador de la tarjeta", { pk: true }),
        col("user_id", "integer", "Persona titular", { fk: "users.id" }),
        col("kind", "text", "virtual o physical"),
        col("last4", "char(4)", "Últimos cuatro dígitos"),
        col("issued_at", "date", "Fecha de emisión"),
        col("expires_at", "date", "Fecha de vencimiento"),
        col("status", "text", "active, blocked o expired"),
      ],
    },
    {
      name: "transactions",
      description:
        "Movimientos de cuenta. kind: topup, card_payment, qr_payment, transfer_out, transfer_in, withdrawal, fee, reversal. direction: credit (suma) o debit (resta). status: pending, completed, failed, reversed. Un pago reversado conserva status = reversed y tiene un movimiento reversal que lo referencia.",
      columns: [
        col("id", "integer", "Identificador del movimiento", { pk: true }),
        col("account_id", "integer", "Cuenta afectada", { fk: "accounts.id" }),
        col("kind", "text", "Tipo de movimiento"),
        col("direction", "text", "credit o debit"),
        col("amount", "numeric(14,2)", "Importe positivo en la moneda de la cuenta"),
        col("currency", "char(3)", "Moneda (igual a la de la cuenta)"),
        col("status", "text", "pending, completed, failed o reversed"),
        col("created_at", "timestamptz", "Creación (UTC)"),
        col("completed_at", "timestamptz", "Confirmación; NULL si pending o failed"),
        col("merchant_id", "integer", "Comercio, solo en pagos y reversos", { fk: "merchants.id" }),
        col("card_id", "integer", "Tarjeta usada, solo en card_payment", { fk: "cards.id" }),
        col("reversal_of", "integer", "Pago original, solo en reversal", { fk: "transactions.id" }),
        col("is_flagged", "boolean", "Marcado por el motor antifraude (~1 %)"),
        col("description", "text", "Texto libre; NULL en la mayoría"),
      ],
    },
    {
      name: "transfers",
      description:
        "Transferencias entre cuentas de la misma moneda. Las completadas generan dos movimientos (transfer_out y transfer_in); las fallidas no generan ninguno.",
      columns: [
        col("id", "integer", "Identificador de la transferencia", { pk: true }),
        col("from_account_id", "integer", "Cuenta origen", { fk: "accounts.id" }),
        col("to_account_id", "integer", "Cuenta destino", { fk: "accounts.id" }),
        col("amount", "numeric(14,2)", "Importe"),
        col("currency", "char(3)", "Moneda"),
        col("status", "text", "completed, failed o pending"),
        col("created_at", "timestamptz", "Creación (UTC)"),
        col("note", "text", "Concepto opcional"),
      ],
    },
    {
      name: "kyc_events",
      description: "Intentos de subir de nivel KYC: aprobados o rechazados con motivo.",
      columns: [
        col("id", "integer", "Identificador del evento", { pk: true }),
        col("user_id", "integer", "Persona", { fk: "users.id" }),
        col("from_level", "integer", "Nivel anterior"),
        col("to_level", "integer", "Nivel solicitado (from_level + 1)"),
        col("outcome", "text", "approved o rejected"),
        col("reason", "text", "Motivo del rechazo; NULL si aprobado"),
        col("event_at", "timestamptz", "Fecha y hora (UTC)"),
      ],
    },
    {
      name: "fx_rates",
      description:
        "Tipo de cambio diario de cada moneda local respecto al dólar (unidades por USD).",
      columns: [
        col("rate_date", "date", "Día", { pk: true }),
        col("currency", "char(3)", "Moneda local"),
        col("usd_rate", "numeric(12,4)", "Unidades de moneda local por 1 USD"),
      ],
    },
  ],
};
