# TiendaViva (v1)

Marketplace de vendedores independientes en AR, MX, CO, CL, PE y UY. Generador determinista (`seed` en `config.ts`); "hoy" del dataset: 2025-09-15. Esquema autoritativo: `src/content/datasets/tiendaviva.ts`.

Volúmenes: 3000 clientes, 180 vendedores, 30 categorías (2 niveles), 1500 productos, 18 000 pedidos, 30 067 ítems, 18 050 pagos, 15 201 envíos, 3985 reseñas, 1073 devoluciones.

Reglas de negocio verificadas (`verify.ts`, 19 checks): totales conciliados (`total = subtotal - discount + shipping_fee`, `subtotal = Σ ítems`), estados de pedido coherentes con pagos/envíos/devoluciones, estacionalidad (Hot Sale, Buen Fin, Navidad), cuotas solo 1/3/6/12.

Problemas de calidad intencionales: correos de clientes duplicados con distinta capitalización (39), vendedores sin `rating` (28), reseñas sin comentario (1391), envíos sin `delivered_at` (1110), pedidos con más de un intento de pago (2502).
