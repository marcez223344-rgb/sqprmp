import type { LessonDef } from "../schemas/curriculum";

const section = "desafios-de-entrevista";

export const lessons: LessonDef[] = [
  {
    slug: "entrevista-patrones-clasicos",
    section,
    kind: "theory",
    title: "Los patrones que se repiten en las entrevistas",
    sort_order: 0,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["ranking-top-n-por-grupo", "brechas-y-valores-de-referencia"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Una entrevista técnica de datos en LATAM rara vez inventa un problema nuevo. Casi siempre te pide una variante de siete u ocho patrones conocidos, con nombres de tablas distintos. Si reconoces el patrón en los primeros treinta segundos, te queda todo el tiempo para lo que de verdad evalúan: **cómo piensas y cómo explicas**.

## El catálogo corto

**1. El segundo valor más alto.** «El segundo sueldo más alto», «el segundo producto más vendido de cada categoría». La pregunta real es qué significa "segundo" cuando hay empates: \`dense_rank()\` numera **niveles de valor** distintos, \`rank()\` deja huecos y \`row_number()\` elige una fila arbitraria entre las empatadas.

**2. Top-N por grupo.** \`PARTITION BY\` + ranking + filtro en una capa externa. \`LIMIT\` no sirve: corta el resultado completo, no cada grupo.

**3. Eventos consecutivos.** «Tres compras seguidas en el mismo comercio», «el mismo estado tres veces». Se resuelve mirando la fila anterior con \`lag()\` (una o dos posiciones) sobre una ventana ordenada por tiempo.

**4. Brechas e islas (gaps and islands).** «La racha más larga de días con actividad», «los períodos sin ventas». El truco clásico: a cada fecha réstale su número de fila dentro del grupo; todas las fechas consecutivas comparten el mismo resultado y ese valor identifica la isla.

**5. Totales acumulados y Pareto.** «¿Cuántos vendedores explican la mitad de la facturación?». Agregas, ordenas, acumulas con \`sum(...) OVER (ORDER BY ...)\` y comparas contra el total.

**6. Autouniones.** Comparar filas de la misma tabla: el empleado contra su jefe, el pedido contra el anterior del mismo cliente, dos cobros idénticos con minutos de diferencia.

**7. Duplicados.** Detectar con \`GROUP BY ... HAVING count(*) > 1\` y elegir la fila que sobrevive con \`DISTINCT ON\` o \`row_number() = 1\`. La trampa suele estar en la normalización: mayúsculas, espacios, acentos.

**8. Trampas de NULL.** \`NOT IN\` con una subconsulta que devuelve algún NULL da cero filas. \`count(columna)\` ignora nulos y \`count(*)\` no. Un filtro en el \`WHERE\` sobre la tabla derecha convierte un \`LEFT JOIN\` en un \`INNER JOIN\`.

## Cómo se ve un patrón disfrazado

\`\`\`sql
-- "El segundo producto más vendido de cada categoría"
WITH ventas AS (
  SELECT p.category_id, p.id, sum(oi.quantity) AS unidades
  FROM order_items AS oi
  INNER JOIN products AS p ON p.id = oi.product_id
  GROUP BY p.category_id, p.id
),
niveles AS (
  SELECT
    category_id,
    id,
    unidades,
    dense_rank() OVER (PARTITION BY category_id ORDER BY unidades DESC) AS nivel
  FROM ventas
)
SELECT * FROM niveles WHERE nivel = 2;
\`\`\`

Es el patrón 1 y el 2 a la vez. El entrevistador no espera que lo escribas de memoria: espera que digas «esto es un top-N por grupo con un problema de empates» antes de escribir la primera línea.

## Lo que el patrón no decide

Reconocer el patrón resuelve la forma de la consulta, no las definiciones. Siguen abiertas preguntas que **tú** debes plantear: ¿cuentan los pedidos cancelados?, ¿el mes se corta en UTC o en la hora local?, ¿"cliente" es una fila de la tabla o una persona con varios correos? Esas respuestas cambian el resultado mucho más que la elección entre CTE y subconsulta.

## Errores comunes

- Empezar a escribir SQL antes de nombrar el patrón: pierdes la oportunidad de mostrar criterio.
- Memorizar una plantilla sin entender el empate, el huso horario o el grano que asume.
- Creer que el entrevistador busca la consulta más corta; busca la que puedas defender.

## Resumen

1. Casi toda pregunta de entrevista es una variante de ocho patrones conocidos.
2. Nombrar el patrón en voz alta vale tanto como escribirlo.
3. El patrón define la forma; las definiciones de negocio definen el resultado.
`,
  },
  {
    slug: "entrevista-como-razonar-en-voz-alta",
    section,
    kind: "theory",
    title: "Cómo encarar una pregunta que no viste antes",
    sort_order: 1,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["entrevista-patrones-clasicos"],
    dataset: "pidelo",
    body_md: `## Por qué importa

En una entrevista técnica te evalúan dos cosas a la vez: si llegas al resultado y si se puede trabajar contigo. Lo segundo solo se ve si hablas. Un candidato que piensa en silencio durante ocho minutos y entrega una consulta perfecta puntúa peor que uno que explica su camino y llega al 90 %.

## Un guion de cuatro pasos

**1. Repite el pedido con tus palabras.** «Quieres los repartidores activos que no entregaron ningún pedido en agosto, uno por fila, ¿es así?». Treinta segundos que evitan resolver el problema equivocado.

**2. Pregunta lo mínimo imprescindible.** Dos o tres preguntas bien elegidas muestran criterio; diez muestran inseguridad. Las que casi siempre valen la pena:

- **Grano:** ¿una fila por pedido, por ítem o por cliente?
- **Universo:** ¿incluimos cancelados, pruebas internas, cuentas bloqueadas?
- **Tiempo:** ¿qué zona horaria y qué extremos del rango?

**3. Declara los supuestos que no vas a preguntar.** Un supuesto dicho en voz alta es una decisión; el mismo supuesto callado es un error. «Voy a tomar \`status = 'delivered'\` como pedido válido y a cortar los meses en UTC; si prefieres hora local, cambia solo la conversión.»

**4. Describe la consulta antes de escribirla.** «Primero agrego por restaurante, después acumulo el total ordenado de mayor a menor y al final me quedo con las filas hasta llegar al 50 %.» Si el entrevistador ve un paso equivocado, te corrige ahí y no al final.

## Escribe en capas

Las CTE son tu mejor aliada bajo presión: cada paso se nombra, se explica y se puede mostrar por separado.

\`\`\`sql
WITH gmv AS (            -- 1. una fila por restaurante
  SELECT restaurant_id, sum(total) AS gmv
  FROM orders
  WHERE status = 'delivered'
  GROUP BY restaurant_id
),
acumulado AS (           -- 2. el acumulado y el total en la misma fila
  SELECT
    restaurant_id,
    gmv,
    sum(gmv) OVER (ORDER BY gmv DESC, restaurant_id) AS gmv_acumulado,
    sum(gmv) OVER () AS gmv_total
  FROM gmv
)
SELECT * FROM acumulado WHERE gmv_acumulado - gmv < 0.5 * gmv_total;
\`\`\`

Si te trabas, una capa parcial ya demuestra que el camino era correcto. Una consulta monolítica a medio escribir no demuestra nada.

## La verificación de treinta segundos

Antes de decir «listo», haz tres comprobaciones que cuestan muy poco y evitan la respuesta incorrecta con cara de correcta:

- **Cuenta filas.** ¿El total tiene el orden de magnitud que esperabas? 400 restaurantes no pueden dar 12 000 filas salvo que algo se haya multiplicado.
- **Revisa una fila a mano.** Elige un caso y recórrelo mentalmente de punta a punta.
- **Busca los casos borde.** ¿Qué pasa con quien no tiene ningún pedido, con los empates y con los nulos? Nombrarlos, aunque no los resuelvas, es parte de la respuesta.

## Cuando no sabes la función exacta

Decir «lo resolvería con una función de ventana que compare cada fila con la anterior; creo que es \`lag\`, lo confirmaría en la documentación» es una respuesta profesional. Inventar sintaxis con seguridad es lo único que no se perdona.

## Errores comunes

- Callarte mientras piensas y dejar al entrevistador sin señales.
- Preguntarlo todo, sin proponer nunca un supuesto propio.
- Entregar sin verificar el orden de magnitud del resultado.

## Resumen

1. Repite el pedido, pregunta poco, declara tus supuestos y describe el plan.
2. Construye en capas: cada CTE es un paso que puedes defender.
3. Reserva treinta segundos para contar filas, revisar un caso y nombrar los bordes.
`,
  },
  {
    slug: "entrevista-errores-que-cuestan-la-oferta",
    section,
    kind: "theory",
    title: "Los errores que cuestan la oferta",
    sort_order: 2,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["entrevista-patrones-clasicos", "subconsultas-in-exists-y-null"],
    dataset: "bolsillo",
    body_md: `## Por qué importa

Casi nadie pierde una entrevista de SQL por no recordar una función. Se pierde por errores que producen un resultado **plausible pero falso**, y por no detectarlos a tiempo. Estos son los que más se repiten.

## 1. \`NOT IN\` con una subconsulta que tiene NULL

\`\`\`sql
-- Devuelve cero filas si algún courier_id es NULL
SELECT * FROM couriers
WHERE id NOT IN (SELECT courier_id FROM orders);
\`\`\`

\`id NOT IN (1, 2, NULL)\` se evalúa como «desconocido», nunca como verdadero, así que **ninguna** fila pasa el filtro. La salida no es un error: es una tabla vacía, y una tabla vacía se puede confundir con «no hay casos». Usa \`NOT EXISTS\`, que trata el nulo como ausencia, o agrega \`WHERE courier_id IS NOT NULL\` dentro de la subconsulta.

## 2. Filtrar la tabla derecha de un \`LEFT JOIN\` en el \`WHERE\`

\`\`\`sql
-- El LEFT JOIN queda convertido en INNER JOIN
FROM merchants AS m
LEFT JOIN transactions AS t ON t.merchant_id = m.id
WHERE t.is_flagged;
\`\`\`

Las filas sin coincidencia llegan con \`t.is_flagged = NULL\` y el \`WHERE\` las descarta. Si la condición pertenece a la tabla opcional, va en el \`ON\`; el \`WHERE\` solo debe llevar condiciones sobre la tabla obligatoria.

## 3. \`count(*)\` después de un \`LEFT JOIN\`

\`count(*)\` cuenta filas, y una fila sin coincidencia sigue siendo una fila: los comercios sin transacciones marcadas te van a devolver 1 en lugar de 0. \`count(t.id)\` cuenta solo los valores no nulos y da el cero correcto.

## 4. Truncar fechas sin fijar el huso

\`created_at\` es \`timestamptz\`. \`date_trunc('month', created_at)\` usa la zona de la sesión, así que la misma consulta da otro reparto por mes en un servidor configurado en otra zona. El sandbox fija UTC —resultados reproducibles para todos— y por eso aquí las dos versiones coinciden; el entrevistador no te está preguntando por este entorno sino por el suyo. Escribe \`date_trunc('month', created_at AT TIME ZONE 'UTC')\` y **dilo**: «los meses están cortados en UTC; si el estándar de la empresa es otro, lo cambio».

## 5. \`BETWEEN\` con marcas de tiempo

\`BETWEEN '2025-08-01' AND '2025-08-31'\` deja fuera casi todo el 31 de agosto, porque el extremo se interpreta como medianoche. El rango semiabierto \`>= '2025-08-01' AND < '2025-09-01'\` no tiene ese borde y funciona igual con fechas y con marcas de tiempo.

## 6. Confundir el grano

Unir pedidos con sus ítems multiplica las filas de pedido. Sumar \`orders.total\` después de ese join infla el total tantas veces como ítems tenga cada pedido. Antes de agregar, pregúntate siempre: **¿una fila de este resultado es qué cosa?**

## 7. Suponer que una fila es una persona

Dos cuentas con el mismo correo escrito con distinta capitalización son la misma persona para el negocio y dos filas para el motor. En cualquier pregunta sobre clientes únicos, normaliza antes de contar y dilo en voz alta.

## 8. Entregar sin verificar

El error más caro no es ninguno de los anteriores: es no mirar el resultado. Si una consulta sobre 300 comercios devuelve 0 filas o 40 000, hay algo roto. Contar filas y revisar un caso a mano toma menos de un minuto y evita defender un número falso.

## Cómo se ve la recuperación

Encontrar tu propio error durante la entrevista suma puntos, no los resta. «Me devolvió cero filas y eso no puede ser; el \`NOT IN\` debe estar chocando con un nulo, lo cambio por \`NOT EXISTS\`» es exactamente lo que el entrevistador quiere escuchar de alguien que va a tocar datos de producción.

## Resumen

1. Los errores caros producen resultados plausibles: nulos, joins que filtran de más y husos horarios.
2. Verifica el grano y el orden de magnitud antes de entregar.
3. Detectar y corregir tu propio error en voz alta juega a favor.
`,
  },
];
