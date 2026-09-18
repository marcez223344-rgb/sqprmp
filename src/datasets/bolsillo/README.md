# Bolsillo (v1)

Billetera digital latinoamericana. Generador determinista (`seed` en `config.ts`); "hoy": 2025-09-15. Esquema autoritativo: `src/content/datasets/bolsillo.ts`.

Volúmenes: 4000 personas, 4462 cuentas (462 en USD), 300 comercios, 3043 tarjetas, 32 243 movimientos, 4625 transferencias, 7449 eventos KYC, 3744 tipos de cambio diarios (624 días × 6 monedas).

Reglas verificadas (`verify.ts`, 14 checks): una cuenta local por persona y a lo sumo una USD; saldo = Σ movimientos completados (cuentas abiertas); reversos apuntan a un pago `reversed` de la misma cuenta e importe; transferencias completadas generan débito + crédito, fallidas ninguno; moneda del movimiento = moneda de la cuenta; `completed_at` coherente; KYC concilia con `users.kyc_level`; series FX sin huecos.

Problemas de calidad intencionales: cuentas cerradas con saldo 0 pese a tener movimientos, personas bloqueadas con historial completado, transferencias fallidas (336), pagos pendientes sin confirmación, ~1 % de movimientos marcados por antifraude, `birth_date` NULL en ~7 %.
