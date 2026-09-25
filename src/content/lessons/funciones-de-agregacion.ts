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

«¿Cuántos pedidos entregamos?», «¿cuál es el ticket promedio?», «¿cuándo fue el primer pedido?». Todas esas preguntas se responden con **funciones de agregación**, es decir, funciones que recorren muchas filas y devuelven un solo valor que las resume. Funcionan como la fila de totales al pie de una planilla: en lugar de mirar los pedidos uno por uno, obtienes la cifra que los representa. Son la base de cualquier indicador de negocio.

En esta sección trabajas con **Pídelo**, una plataforma de delivery. Sus tablas principales son \`orders\` (una fila por pedido), \`ratings\` (las calificaciones que deja cada cliente), \`restaurants\` (los locales que cocinan) y \`couriers\` (las personas que reparten).

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

Cuando la consulta solo pide funciones de agregación y no lleva \`GROUP BY\` —la cláusula que parte la tabla en grupos y calcula un resultado por grupo, que verás en la sección 15—, el resultado es **una sola fila** que resume la tabla entera. El \`WHERE\` se aplica antes de agregar, así que estas cinco cifras describen únicamente los pedidos entregados y dejan afuera los cancelados.

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

En \`ratings\` hay filas sin puntaje de restaurante y filas sin puntaje de repartidor, porque el cliente puede calificar solo una parte del servicio. Por eso las tres cifras dan distinto, y si informas \`count(*)\` como «calificaciones al restaurante» estarás contando también las que quedaron vacías.

## NULL y los promedios

\`avg\`, \`sum\`, \`min\` y \`max\` **ignoran los valores NULL**, es decir, las celdas que quedaron sin dato. \`avg(restaurant_rating)\` promedia solo las calificaciones que alguien escribió y divide por esa misma cantidad. Si antes de promediar reemplazas los NULL por 0 con \`COALESCE\`, estás afirmando que esas personas calificaron con un cero y el promedio baja sin que nadie haya puesto esa nota. Acuerda con el área de negocio qué significa la ausencia antes de decidir.

Si **todas** las filas son NULL, o si no hay ninguna fila, \`sum\` y \`avg\` devuelven NULL y no 0, porque sumar un conjunto vacío no da cero: no hay nada que sumar. \`count\`, en cambio, siempre devuelve un número, aunque ese número sea 0.

## Promedios engañosos

- **Mezclar monedas.** La columna \`total\` de la tabla \`orders\` guarda el importe del pedido en la moneda de su ciudad. Si promedias \`total\` sobre todas las ciudades a la vez, estás combinando pesos mexicanos con soles peruanos y el resultado no corresponde a ningún importe real. Filtra por una ciudad o convierte los importes a una moneda común antes de promediar.
- **Promediar promedios.** Si primero calculas la calificación promedio de cada restaurante y después promedias esos promedios, un local con 3 calificaciones pesa lo mismo que uno con 300. Ese número no es la calificación promedio de la plataforma; para obtenerla hay que promediar todas las calificaciones juntas.
- **Tipos enteros.** \`avg\` sobre una columna de enteros devuelve un valor \`numeric\` con muchos decimales, y \`sum\` sobre una columna \`integer\` devuelve un \`bigint\` (sobre una \`bigint\`, devuelve un \`numeric\`). Para presentar el resultado, redondea con \`round(x, 2)\`.

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

Restar dos marcas de tiempo, \`delivered_at\` menos \`placed_at\`, devuelve un valor de tipo \`interval\`, que es una duración y no un número. \`extract(epoch FROM ...)\` convierte esa duración a segundos, que sí es un número que se puede promediar, y dividir entre 60 la deja en minutos, que es la unidad en la que el negocio promete la entrega.

## Errores comunes

- Pedir en el mismo \`SELECT\` una columna sin agregar y una función de agregación (\`SELECT customer_id, count(*) FROM orders\`). PostgreSQL responde «must appear in the GROUP BY clause», porque no sabe qué \`customer_id\` mostrar al lado de un conteo que resume miles de filas. La solución es \`GROUP BY\`, en la sección 15.
- Usar \`count(columna)\` creyendo que cuenta filas, cuando en realidad deja afuera todas las filas donde esa columna es NULL.
- Entregar un promedio con catorce decimales por no haber usado \`round\` al presentar.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes resumir filas con COUNT, SUM, AVG, MIN y MAX, distinguir \`COUNT(*)\` de \`COUNT(columna)\` y detectar cuándo un promedio engaña.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 15 · GROUP BY: resumir por categoría. Vas a calcular esas métricas por grupo, por ejemplo por país o por mes.

**Para practicar (opcional):** ¿Cuántas reseñas tiene TiendaViva, cuántas traen comentario y cuál es la calificación promedio? En \`reviews\`, compara \`COUNT(*)\` con \`COUNT(comment)\` y calcula \`AVG(rating)\`.
`,
  },
];
