import type { LessonDef } from "../schemas/curriculum";

export const lessons: LessonDef[] = [
  {
    slug: "agregacion-count-sum-avg",
    section: "funciones-de-agregacion",
    kind: "theory",
    title: "Resumir una tabla en un número",
    sort_order: 0,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["null-coalesce-y-nullif"],
    dataset: "pidelo",
    body_md: `## Por qué importa

«¿Cuántos pedidos entregamos?», «¿cuál es el ticket promedio?», «¿cuándo fue el primer pedido?». Las **funciones de agregación** toman muchas filas y devuelven un valor. Son la base de cualquier indicador de negocio.

En esta sección trabajas con **Pídelo**, una plataforma de delivery: \`orders\` (pedidos), \`ratings\` (calificaciones), \`restaurants\`, \`couriers\`.

## Las cinco básicas

\`\`\`sql
SELECT
  count(*)              AS pedidos,
  sum(total)            AS facturado,
  round(avg(total), 2)  AS ticket_promedio,
  min(placed_at)        AS primero,
  max(placed_at)        AS ultimo
FROM orders
WHERE status = 'delivered';
\`\`\`

Sin \`GROUP BY\` (sección 15), la consulta devuelve **una sola fila**. \`WHERE\` filtra antes de agregar: aquí solo cuentan los entregados.

## COUNT tiene tres formas

- \`count(*)\`: cuenta filas.
- \`count(columna)\`: cuenta filas donde la columna **no es NULL**.
- \`count(DISTINCT columna)\`: cuenta valores distintos no nulos.

\`\`\`sql
SELECT
  count(*)                    AS calificaciones,
  count(restaurant_rating)    AS con_puntaje_restaurante,
  count(DISTINCT order_id)    AS pedidos_calificados
FROM ratings;
\`\`\`

En \`ratings\`, algunas filas no tienen puntaje de restaurante o de repartidor: las tres cifras difieren.

## NULL y los promedios

\`avg\`, \`sum\`, \`min\` y \`max\` **ignoran NULL**. \`avg(restaurant_rating)\` promedia solo las calificaciones existentes. Si reemplazas los NULL por 0 con \`COALESCE\` antes de promediar, el promedio baja artificialmente. Decide con el negocio qué significa la ausencia.

Si **todas** las filas son NULL (o no hay filas), \`sum\` y \`avg\` devuelven NULL, no 0. \`count\` siempre devuelve un número.

## Promedios engañosos

- Mezclar monedas: en Pídelo los totales están en la moneda de cada ciudad. Un promedio de \`total\` sobre todas las ciudades mezcla pesos mexicanos con soles. Filtra por ciudad o convierte antes.
- Promediar promedios: el promedio de las calificaciones por restaurante no es la calificación promedio de todas las calificaciones.
- Enteros: \`avg\` de una columna entera devuelve \`numeric\`; \`sum\` de enteros devuelve \`bigint\`. Redondea con \`round(x, 2)\` para presentar.

## Ejemplo resuelto

Pedido: «¿Cumplimos la promesa de entrega? Compara el tiempo prometido con el real, en promedio».

\`\`\`sql
SELECT
  count(*) AS entregados,
  round(avg(promised_minutes), 1) AS promesa_promedio,
  round(avg(extract(epoch FROM (delivered_at - placed_at)) / 60), 1) AS real_promedio
FROM orders
WHERE status = 'delivered';
\`\`\`

\`delivered_at - placed_at\` es un intervalo; \`extract(epoch FROM ...)\` lo convierte a segundos, y \`/ 60\` a minutos.

## Errores comunes

- Mezclar una columna sin agregar con agregados (\`SELECT customer_id, count(*) FROM orders\`): error «must appear in the GROUP BY clause». Lo resuelves en la sección 15.
- Usar \`count(columna)\` esperando contar filas cuando la columna tiene NULL.
- Olvidar \`round\` y entregar 14 decimales.
`,
  },
];
