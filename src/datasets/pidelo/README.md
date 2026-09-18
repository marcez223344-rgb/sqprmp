# Pídelo (v1)

Delivery de comida en 8 ciudades (AR, MX, CO, CL, PE, UY). Generador determinista (`seed` en `config.ts`); "hoy": 2025-09-15. Esquema autoritativo: `src/content/datasets/pidelo.ts`.

Volúmenes: 8 ciudades, 400 restaurantes, 2989 ítems de menú, 5000 clientes, 600 repartidores, 6 promociones, 14 437 pedidos, 35 589 ítems, 69 724 eventos, 7353 calificaciones.

Reglas verificadas (`verify.ts`, 12 checks): `total = subtotal + delivery_fee - discount`, `subtotal = Σ ítems`; entregados ⇔ `delivered_at` y repartidor; eventos cronológicos y coherentes con el estado (el evento `delivered` coincide con `delivered_at`); calificaciones solo de pedidos entregados y únicas por pedido; promociones usadas dentro de su ventana; ~22 % de entregas tardías.

Problemas de calidad intencionales: abuso de promociones (clientes que superan `max_uses_per_customer`), restaurantes inactivos con pedidos, pedidos cancelados sin ítems, calificaciones parciales (sin puntaje de restaurante o repartidor), ratings de restaurante NULL en ~12 %.
