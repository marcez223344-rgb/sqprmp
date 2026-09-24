import type { LessonDef } from "../schemas/curriculum";

const section = "indices-y-planes-de-ejecucion";

/**
 * Section 35 — theory. Two constraints for whoever edits this file next.
 *
 * 1. A learner cannot execute `EXPLAIN`. `src/lib/sandbox/gate.ts` parses every statement
 *    with `pgsql-ast-parser`, which has no grammar for `EXPLAIN`, so the gate fails with
 *    `parse_error` before the statement-kind allowlist is consulted. No exercise of this
 *    section may require it; plans belong to this prose only.
 *
 * 2. Every plan printed in a lesson must be a real capture against the dataset snapshot,
 *    never an invented one (CLAUDE.md: do not invent results). The lesson
 *    `indices-leer-un-plan-de-ejecucion` still needs a "Planes capturados de Pídelo"
 *    section built from the verbatim output of these three commands:
 *
 *      npx tsx scripts/dataset-query.ts pidelo "EXPLAIN (ANALYZE, BUFFERS) SELECT count(*)
 *        FROM orders WHERE placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'
 *        AND placed_at < TIMESTAMPTZ '2025-08-01 00:00:00+00'"
 *      npx tsx scripts/dataset-query.ts pidelo "EXPLAIN (ANALYZE, BUFFERS) SELECT count(*)
 *        FROM orders WHERE status = 'delivered'"
 *      npx tsx scripts/dataset-query.ts pidelo "EXPLAIN (ANALYZE, BUFFERS) SELECT r.name,
 *        count(*) FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
 *        WHERE o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'
 *        AND o.placed_at < TIMESTAMPTZ '2025-09-01 00:00:00+00' GROUP BY r.name"
 *
 *    Those three captures landed on 2026-09-23 in `indices-leer-un-plan-de-ejecucion`
 *    ("Tres planes reales de Pídelo"), verbatim and unedited. Two of them are on the same
 *    table and show the index used and not used, which is the section's core lesson. The
 *    accompanying prose states that the snapshot is small (14 437 orders) and that the
 *    captures show `shared hit` only, so the cost of a scattered row fetch is invisible here.
 *    The snapshot's real indexes are in `public/datasets/pidelo/v1/schema.sql`.
 *
 * The section, its three lessons, seven exercises and twelve questions are published as of
 * 2026-09-23.
 */
export const lessons: LessonDef[] = [
  {
    slug: "indices-que-es-un-indice",
    section,
    kind: "theory",
    title: "Qué es un índice y por qué el motor no siempre lo usa",
    sort_order: 0,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["optimizacion-predicados-sargables"],
    dataset: "pidelo",
    body_md: `## Por qué importa

En la sección anterior escribiste consultas que no desperdician trabajo. Acá vas un paso más adentro: cómo decide el motor el camino para resolver tu consulta, y qué le puedes pedir a ingeniería de datos cuando el problema ya no está en tu SQL.

La meta concreta es que puedas decir algo mejor que «la consulta está lenta»: qué filtro usa tu consulta, cuántas filas deja pasar ese filtro y qué índice haría falta. Eso es una conversación técnica.

## Qué es un índice

Un **índice** es una estructura auxiliar que el motor guarda aparte de la tabla y que contiene los valores de una o varias columnas **ya ordenados**, junto con la dirección de la fila que le corresponde a cada valor dentro de la tabla.

El anclaje es el índice de un libro. El libro está en orden de páginas; el índice del final está en orden alfabético y al lado de cada tema dice la página. Para encontrar un tema puedes leer el libro entero o ir al índice, ubicarlo en pocos saltos y abrir directo la página.

En PostgreSQL el tipo de índice por defecto se llama **B-tree** (por *balanced tree*, «árbol balanceado», su nombre en inglés): los valores están ordenados y se llega a cualquiera en muy pocos saltos, incluso con cientos de millones de filas. Ese orden explica que un B-tree sirva para tres cosas: buscar un valor exacto, recorrer un rango y **entregar filas ya ordenadas**, así un \`ORDER BY\` por esa columna no necesita ordenar nada.

## Usar el índice son dos pasos

1. Buscar en el índice los valores que cumplen el filtro y obtener las direcciones de esas filas.
2. Ir a la tabla, a cada dirección, y leer la fila completa.

El paso 2 es el caro, porque esas filas están dispersas y cada una puede estar en un bloque distinto del disco. De ahí sale la idea central de la lección: **si hay que buscar demasiadas filas de a una, leer la tabla entera de corrido sale más barato**.

## Selectividad y cardinalidad

La **selectividad** de un filtro es la proporción de filas de la tabla que ese filtro deja pasar. Un filtro muy selectivo deja pasar poquísimas filas.

En \`orders\`, la tabla de pedidos de Pídelo, hay 14 437 filas, y 13 284 tienen \`status = 'delivered'\`, o sea el 92 %. Aunque existiera un índice sobre la columna \`status\` de \`orders\`, el motor haría bien en ignorarlo: recorrer el índice y después ir a buscar 13 284 filas dispersas cuesta más que leer las 14 437 de corrido. Un filtro por \`status = 'cancelled'\` deja pasar una fracción chica, y ahí el índice sí paga.

La **cardinalidad** es la cantidad de valores distintos de una columna. \`orders.status\`, es decir la columna \`status\` de la tabla \`orders\`, tiene un puñado de valores distintos (cardinalidad baja) y por eso cada valor frecuente abarca muchas filas. \`orders.customer_id\`, que identifica al cliente del pedido, tiene miles (cardinalidad alta) y por eso un filtro por un cliente deja pasar pocas filas. La regla para conversar con ingeniería: **los índices rinden en columnas de cardinalidad alta, y en las de cardinalidad baja solo cuando buscas el valor raro**.

Las dos cosas se miden con SQL común, sin ver ningún plan:

\`\`\`sql
SELECT status,
       count(*) AS pedidos,
       round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS pct_del_total
FROM orders
GROUP BY status
ORDER BY pedidos DESC;

SELECT count(DISTINCT customer_id) AS clientes_distintos,
       count(DISTINCT status) AS estados_distintos,
       count(*) AS filas
FROM orders;
\`\`\`

## Quién decide

Tú no eliges el índice. Lo elige el **planificador**, el componente de PostgreSQL que antes de ejecutar arma varias formas posibles de resolver la consulta, le estima un costo a cada una y se queda con la más barata. Estima a partir de estadísticas que el motor guarda de cada tabla: cuántas filas tiene, qué valores son los más frecuentes en cada columna, cuántos valores distintos hay. Esas estadísticas se actualizan con el comando \`ANALYZE\` y pueden quedar desactualizadas, que es una de las causas más comunes de que el motor elija un plan malo con una consulta bien escrita.

Dos consecuencias: un índice existente no garantiza que se use, y «actualizar las estadísticas de esta tabla» es una pregunta legítima para ingeniería de datos.

## Errores comunes

- Pedir un índice sobre una columna de pocos valores distintos porque se filtra seguido por ahí.
- Suponer que si el índice existe, el motor lo usa.
- Concluir que un índice no sirve porque en un entorno chico no cambió nada.

## Resumen

1. Un índice es una copia ordenada de algunas columnas más la dirección de cada fila; sirve para buscar, recorrer rangos y entregar filas ordenadas.
2. La selectividad del filtro decide si conviene: si deja pasar casi toda la tabla, recorrerla completa es más barato.
3. El planificador elige con estimaciones basadas en estadísticas, y esas estadísticas pueden estar viejas.
`,
  },
  {
    slug: "indices-leer-un-plan-de-ejecucion",
    section,
    kind: "theory",
    title: "Cómo se lee un plan de ejecución",
    sort_order: 1,
    estimated_minutes: 14,
    is_free: false,
    is_published: true,
    prerequisites: ["indices-que-es-un-indice"],
    dataset: "pidelo",
    body_md: `## Qué es un plan de ejecución

Un **plan de ejecución** es la descripción, paso a paso, de cómo el motor va a resolver tu consulta: qué tabla lee primero, si la lee completa o por índice, en qué orden combina las tablas y dónde ordena o agrupa. Cada paso se llama **nodo**, y los nodos forman un árbol: cada nodo recibe filas de sus hijos, hace su trabajo y entrega filas a su padre.

Se pide con \`EXPLAIN\` delante de la consulta: muestra el plan que **piensa** usar, con números estimados, sin ejecutar nada. \`EXPLAIN ANALYZE\` sí ejecuta y agrega, en cada nodo, cuántas filas pasaron y cuánto tardó.

En este simulador \`EXPLAIN\` no corre: el filtro de seguridad admite solo \`SELECT\`. Los ejercicios de la sección no lo necesitan.

## La forma del árbol

El esquema de un plan, con las cifras en puntos suspensivos:

\`\`\`text
Aggregate  (cost=… rows=… width=…)
  ->  Hash Join  (cost=… rows=… width=…)
        Hash Cond: (o.restaurant_id = r.id)
        ->  Index Scan using orders_placed_at_idx on orders o  (cost=… rows=… width=…)
              Index Cond: (placed_at >= … AND placed_at < …)
        ->  Hash  (cost=… rows=… width=…)
              ->  Seq Scan on restaurants r  (cost=… rows=… width=…)
\`\`\`

Tres reglas para leerlo:

1. **De adentro hacia afuera.** Los nodos más indentados corren primero; arriba está el último paso, el que devuelve el resultado.
2. Cada nodo trae su **costo estimado** (\`cost=inicio..total\`, una unidad interna para comparar planes, no segundos), las **filas** que espera producir y el **ancho** promedio de la fila en bytes.
3. El costo de un nodo **incluye** el de sus hijos. Para encontrar el paso caro no busques el número más grande: busca el nodo donde el costo salta respecto de sus hijos.

## Estimado contra real

Con \`EXPLAIN ANALYZE\` cada nodo trae dos pares de números:

\`\`\`text
->  Index Scan using orders_placed_at_idx on orders  (cost=… rows=1200 width=…)
      (actual time=… rows=1214 loops=1)
\`\`\`

\`rows=1200\` es lo que el planificador **estimó**; \`actual rows=1214\` es lo que pasó. Si están cerca, el plan se eligió con buena información. Si el estimado es 100 y el real 900 000, el planificador armó el plan para un puñado de filas: eligió un \`Nested Loop\` suponiendo pocas repeticiones y termina repitiendo la búsqueda interna casi un millón de veces. Ese hueco es **la causa más frecuente de un plan malo**, y suele venir de estadísticas viejas, una columna muy desbalanceada o un filtro que el motor no sabe estimar.

\`loops\` es cuántas veces se ejecutó el nodo, y es fácil leerlo mal: el tiempo y las filas son **por ejecución**. Un nodo de 0,3 milisegundos con \`loops=50000\` consumió 15 segundos.

La opción \`BUFFERS\` agrega cuántos bloques leyó cada nodo y cuáles vinieron del disco (\`shared read\`) o ya estaban en memoria (\`shared hit\`). Distingue «hace mucho trabajo» de «hizo mucho trabajo la primera vez».

## Los nodos de lectura

- **Seq Scan** (*sequential scan*, «recorrido secuencial»): lee la tabla completa de corrido. Correcto cuando el filtro deja pasar gran parte de las filas, o cuando la tabla es chica.
- **Index Scan**: recorre el índice y busca en la tabla cada fila que coincide. Conviene con pocas coincidencias.
- **Index Only Scan**: responde con el índice solo, sin tocar la tabla, porque todas las columnas pedidas están ahí.
- **Bitmap Index Scan** más **Bitmap Heap Scan**: el camino intermedio. Marca las coincidencias en un mapa de bits y después las lee de la tabla en orden físico, sin saltar de un lado a otro del disco.

Un \`Seq Scan\` no es un defecto por sí mismo: molesta cuando la tabla es grande **y** el filtro deja pasar pocas filas.

## Tres planes reales de Pídelo

Capturas con \`EXPLAIN (ANALYZE, BUFFERS)\` sobre el snapshot de Pídelo de la práctica. \`orders\` tiene 14 437 filas y un índice sobre \`placed_at\`.

**Uno. Un rango de julio: el índice se usa.**

\`\`\`text
Aggregate  (cost=261.75..261.76 rows=1 width=8) (actual time=2.185..2.188 rows=1.00 loops=1)
  Buffers: shared hit=210
  ->  Bitmap Heap Scan on orders  (cost=32.65..258.74 rows=1206 width=0) (actual time=0.227..1.527 rows=1214.00 loops=1)
        Recheck Cond: ((placed_at >= '2025-07-01 00:00:00+00'::timestamp with time zone) AND (placed_at < '2025-08-01 00:00:00+00'::timestamp with time zone))
        Heap Blocks: exact=204
        Buffers: shared hit=210
        ->  Bitmap Index Scan on orders_placed_at_idx  (cost=0.00..32.34 rows=1206 width=0) (actual time=0.177..0.177 rows=1214.00 loops=1)
              Index Cond: ((placed_at >= '2025-07-01 00:00:00+00'::timestamp with time zone) AND (placed_at < '2025-08-01 00:00:00+00'::timestamp with time zone))
              Index Searches: 1
              Buffers: shared hit=6
Planning Time: 0.291 ms
Execution Time: 2.303 ms
\`\`\`

Pasan 1214 filas de 14 437: el motor marca las coincidencias en el índice y las lee de la tabla en orden físico, en 2,3 ms.

**Dos. Un filtro por estado, misma tabla: el índice no se usa.**

\`\`\`text
Aggregate  (cost=421.67..421.68 rows=1 width=8) (actual time=24.354..24.356 rows=1.00 loops=1)
  Buffers: shared hit=208
  ->  Seq Scan on orders  (cost=0.00..388.46 rows=13284 width=0) (actual time=0.049..16.654 rows=13284.00 loops=1)
        Filter: (status = 'delivered'::text)
        Rows Removed by Filter: 1153
        Buffers: shared hit=208
Planning Time: 0.234 ms
Execution Time: 24.457 ms
\`\`\`

Pasan 13 284 de 14 437 y el motor elige \`Seq Scan\`: 24,5 ms. \`Rows Removed by Filter: 1153\` prueba que leyó la tabla entera. Es la decisión correcta.

**Tres. Join con agrupación.**

\`\`\`text
HashAggregate  (cost=284.60..288.60 rows=400 width=26) (actual time=23.132..23.318 rows=375.00 loops=1)
  Group Key: r.name
  Batches: 1  Memory Usage: 72kB
  ->  Hash Join  (cost=47.47..278.17 rows=1286 width=18) (actual time=19.415..22.094 rows=1280.00 loops=1)
        Hash Cond: (o.restaurant_id = r.id)
        ->  Bitmap Heap Scan on orders o  (cost=33.47..260.76 rows=1286 width=4) (actual time=0.205..1.036 rows=1280.00 loops=1)
              Recheck Cond: ((placed_at >= '2025-08-01 00:00:00+00'::timestamp with time zone) AND (placed_at < '2025-09-01 00:00:00+00'::timestamp with time zone))
              Heap Blocks: exact=199
              ->  Bitmap Index Scan on orders_placed_at_idx  (cost=0.00..33.14 rows=1286 width=0) (actual time=0.154..0.155 rows=1280.00 loops=1)
                    Index Cond: ((placed_at >= '2025-08-01 00:00:00+00'::timestamp with time zone) AND (placed_at < '2025-09-01 00:00:00+00'::timestamp with time zone))
                    Index Searches: 1
        ->  Hash  (cost=9.00..9.00 rows=400 width=22) (actual time=19.130..19.131 rows=400.00 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 23kB
              ->  Seq Scan on restaurants r  (cost=0.00..9.00 rows=400 width=22) (actual time=0.054..0.781 rows=400.00 loops=1)
Planning Time: 3.013 ms
Execution Time: 23.622 ms
\`\`\`

\`Hash\` arma la tabla de búsqueda con las 400 filas de \`restaurants\`, el lado chico; \`Hash Join\` pasa por encima los 1280 pedidos de agosto leídos por índice; \`HashAggregate\` agrupa por nombre y devuelve 375 filas.

Los pares estimado/real son 1206/1214, 1286/1280 y 400/375: cerca en los tres, que es cómo se ve un plan elegido con buena información.

Dos advertencias. El dataset tiene 14 437 filas: en una tabla de cientos de millones, la distancia entre los dos primeros planes se mide en minutos. Y las capturas muestran solo \`shared hit\`, o sea que todo estaba ya en memoria, así que acá no se ve el costo de buscar filas dispersas en disco, que es lo que vuelve caro un índice mal elegido.

## Errores comunes

- Buscar el nodo de costo más alto en vez del nodo donde el costo salta respecto de sus hijos.
- Leer el tiempo de un nodo con \`loops\` alto como si fuera el tiempo total.
- Comparar el \`cost\` de dos servidores como si midiera segundos.

## Resumen

1. Un plan es un árbol de nodos que se lee de adentro hacia afuera, y el costo de cada nodo incluye el de sus hijos.
2. \`EXPLAIN\` muestra la estimación y \`EXPLAIN ANALYZE\` la ejecución real; el hueco entre las dos es la pista más valiosa.
3. \`Seq Scan\` es un problema solo cuando la tabla es grande y el filtro deja pasar pocas filas.
`,
  },
  {
    slug: "indices-joins-y-pedidos-a-ingenieria",
    section,
    kind: "theory",
    title: "Estrategias de join, índices compuestos y qué pedir a ingeniería",
    sort_order: 2,
    estimated_minutes: 14,
    is_free: false,
    is_published: true,
    prerequisites: ["indices-leer-un-plan-de-ejecucion", "optimizacion-reducir-antes-de-unir"],
    dataset: "pidelo",
    body_md: `## Las tres formas de unir dos tablas

Cuando escribes un \`JOIN\`, el motor decide **cómo** hacerlo. Hay tres estrategias, y reconocerlas en el plan te dice si el problema es el join o es otra cosa.

**Nested Loop** («bucle anidado»): toma cada fila de la tabla de afuera y busca sus coincidencias en la de adentro. Es excelente cuando la de afuera aporta pocas filas y la de adentro tiene un índice por la columna del join. Se vuelve terrible cuando la de afuera aporta muchas más filas de las que el planificador estimó, porque el costo es filas de afuera por costo de cada búsqueda.

**Hash Join**: arma en memoria una tabla de búsqueda por valor, llamada *hash*, con el lado más chico, y después pasa el lado grande por encima buscando coincidencias. Es la estrategia típica para unir dos conjuntos grandes por igualdad y no necesita ningún índice. Su punto débil es la memoria: si el lado chico no entra, el motor parte el trabajo en tandas que van a disco.

**Merge Join** («unión por mezcla»): necesita las dos entradas ordenadas por la columna del join y avanza en paralelo por las dos, como cuando cruzas dos listas ordenadas. Muy bueno si ese orden ya lo da un índice, caro si hay que ordenar antes.

Un \`Hash Join\` que construye el *hash* con la tabla grande indica algo mal estimado. Un \`Nested Loop\` con muchas repeticiones explica la mayoría de las consultas que andaban bien y de pronto tardan veinte minutos.

## Índice compuesto: el orden de las columnas

Un **índice compuesto** es un índice sobre varias columnas, por ejemplo \`(restaurant_id, placed_at)\` en la tabla \`orders\`. Está ordenado primero por \`restaurant_id\`, el restaurante del pedido, y dentro de cada restaurante por \`placed_at\`, el momento en que se hizo. Funciona como una guía ordenada por apellido y, dentro de cada apellido, por nombre.

De ese orden sale la **regla del prefijo izquierdo**: el índice sirve si el filtro usa la primera columna, o la primera y la segunda, pero no si usa solamente la segunda.

\`\`\`sql
-- Aprovecha el índice: filtra por la primera columna
WHERE restaurant_id = 42

-- Lo aprovecha completo: igualdad en la primera, rango en la segunda
WHERE restaurant_id = 42
  AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'
  AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'

-- No lo aprovecha: saltea la primera columna
WHERE placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'
\`\`\`

De ahí la recomendación al armar uno: **las columnas de igualdad primero y la de rango al final**. Una columna de rango en el medio corta el orden para todo lo que viene después.

Hay un beneficio extra: ese mismo índice resuelve \`ORDER BY placed_at\` dentro de un restaurante sin ordenar nada, porque las filas ya salen en ese orden. En el plan lo notas por la ausencia de un nodo \`Sort\`.

## Índice cubriente

Un **índice cubriente** (*covering index*) contiene todas las columnas que la consulta necesita, así que el motor responde sin tocar la tabla. Si pides \`restaurant_id\` y \`placed_at\` y el índice es \`(restaurant_id, placed_at)\`, la consulta está cubierta. Si agregas \`total\` al \`SELECT\`, el atajo desaparece, porque esa columna solo está en la tabla.

PostgreSQL permite pedir columnas que viajan dentro del índice sin formar parte de su orden, con la cláusula \`INCLUDE\`: \`CREATE INDEX ... ON orders (restaurant_id, placed_at) INCLUDE (total)\`.

Cuando el filtro necesita una función alrededor de la columna, lo que se pide es un índice por expresión.

## Un índice no es gratis

Cada índice es una estructura más que el motor mantiene actualizada. Un \`INSERT\` no escribe una fila: escribe la fila más una entrada en cada índice de la tabla, y lo mismo vale para un \`UPDATE\` que toque una columna indexada. Además ocupa disco y memoria.

Por eso una tabla con veinte índices suele tener un problema, no veinte soluciones. Los índices que nadie usa son puro costo, y el motor guarda vistas del sistema que dicen cuántas veces se usó cada uno.

## Cómo se pide un índice

Un pedido que un ingeniero de datos puede evaluar en cinco minutos trae cinco cosas:

1. La consulta exacta, con sus filtros.
2. Cuántas filas deja pasar el filtro y sobre cuántas filas de la tabla, medido con \`count(*)\`.
3. Cada cuánto corre y quién la espera: un panel, un proceso diario, una persona.
4. El índice que propones, con las columnas en orden y el motivo de ese orden.
5. Qué mediste antes y qué esperas después.

Lo que ese pedido no es: «ponle un índice a \`orders\`». Y hay una pregunta previa que a veces lo vuelve innecesario: ¿se puede reescribir la consulta para leer menos filas? Un índice acelera el acceso a las filas que pides, y no arregla una consulta que pide filas que no necesita.

## Errores comunes

- Proponer un índice compuesto con la columna de fecha primero y la de igualdad después.
- Pedir un índice sin haber medido cuántas filas deja pasar el filtro.
- Olvidar que cada índice se paga en cada escritura de la tabla.

## Resumen

1. \`Nested Loop\`, \`Hash Join\` y \`Merge Join\` son las tres formas de unir; el \`Nested Loop\` con muchas repeticiones es el patrón de las consultas que se degradan.
2. En un índice compuesto van primero las columnas de igualdad y al final la de rango, y el índice también puede ahorrar el \`Sort\`.
3. Un índice cuesta en cada escritura, así que el pedido se hace con la consulta, la selectividad medida y el índice propuesto.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes leer un plan de ejecución básico, explicar cuándo un índice ayuda y proponer una mejora de consulta o de índice con evidencia.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 36 · SQL analítico avanzado. Empieza el nivel Profesional: vas a combinar ventanas, CTE, arrays y JSON en análisis completos.

**Para practicar (opcional):** ¿Serviría un índice sobre \`status\` en la tabla \`transactions\` de Bolsillo? Mide la selectividad, es decir, qué proporción de filas tiene cada estado, y decide.
`,
  },
];
