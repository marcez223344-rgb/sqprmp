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

Una entrevista técnica de datos en LATAM rara vez inventa un problema nuevo. Casi siempre te pide una variante de siete u ocho patrones conocidos, con nombres de tablas distintos. Un **patrón** es una forma de consulta que se repite: el mismo esqueleto de pasos sirve para muchas preguntas diferentes.

Si reconoces el patrón en los primeros treinta segundos, te queda todo el tiempo restante para lo que de verdad evalúan, que es **cómo piensas y cómo explicas lo que haces**.

## El catálogo corto

**1. El segundo valor más alto.** «El segundo sueldo más alto», «el segundo producto más vendido de cada categoría». La pregunta real es qué significa «segundo» cuando hay empates, y la respuesta depende de qué función uses: \`dense_rank()\` numera **niveles de valor** distintos, \`rank()\` repite el puesto y después deja huecos, y \`row_number()\` elige una fila arbitraria entre las empatadas.

**2. Top-N por grupo.** Se arma con \`PARTITION BY\`, una función de ranking y un filtro en una capa externa. \`LIMIT\` no sirve para esto, porque corta el resultado completo y no cada grupo por separado.

**3. Eventos consecutivos.** «Tres compras seguidas en el mismo comercio», «el mismo estado repetido tres veces». Se resuelve comparando cada fila con la anterior mediante \`lag()\`, una función de ventana que trae el valor de una o más filas hacia atrás, sobre una ventana ordenada por tiempo.

**4. Brechas e islas** (*gaps and islands*, su nombre en inglés). «La racha más larga de días con actividad», «los períodos sin ventas». El truco clásico consiste en restarle a cada fecha su número de fila dentro del grupo: todas las fechas consecutivas dan el mismo resultado, y ese valor común identifica a cada racha, o isla.

**5. Totales acumulados y Pareto.** «¿Cuántos vendedores explican la mitad de la facturación?». Agregas por vendedor, ordenas de mayor a menor, acumulas con \`sum(...) OVER (ORDER BY ...)\` y comparas ese acumulado contra el total general.

**6. Autouniones.** Es unir una tabla consigo misma para comparar filas entre sí: el empleado contra su jefe, el pedido contra el anterior del mismo cliente, dos cobros idénticos con minutos de diferencia.

**7. Duplicados.** Se detectan con \`GROUP BY ... HAVING count(*) > 1\` y se elige cuál fila sobrevive con \`DISTINCT ON\` o con \`row_number() = 1\`. La trampa suele estar en la normalización previa: mayúsculas, espacios de más y acentos hacen que dos filas iguales para una persona sean distintas para el motor.

**8. Trampas de NULL.** \`NOT IN\` con una subconsulta que devuelve algún NULL no devuelve ninguna fila. \`count(columna)\` ignora los nulos y \`count(*)\` no. Un filtro escrito en el \`WHERE\` sobre la tabla derecha convierte un \`LEFT JOIN\` en un \`INNER JOIN\`.

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

Esta consulta combina el patrón 1 y el patrón 2. El entrevistador no espera que la escribas de memoria: espera que digas «esto es un top-N por grupo con un problema de empates» antes de escribir la primera línea.

## Lo que el patrón no decide

Reconocer el patrón resuelve la forma de la consulta, pero no las definiciones de negocio. Quedan abiertas preguntas que **tú** tienes que plantear: ¿cuentan los pedidos cancelados?, ¿el mes se corta en UTC o en la hora local?, ¿«cliente» es una fila de la tabla o una persona que puede tener varios correos? Esas respuestas cambian el resultado mucho más que la elección entre escribir una CTE (por *common table expression*, la consulta con nombre del \`WITH\`) o una subconsulta.

## Errores comunes

- Empezar a escribir SQL antes de nombrar el patrón. Pierdes la única oportunidad de mostrar tu criterio.
- Memorizar una plantilla sin entender qué supone sobre los empates, el huso horario o el grano de las filas.
- Creer que el entrevistador busca la consulta más corta. Busca la consulta que puedas defender cuando te pregunte por qué.

## Resumen

1. Casi toda pregunta de entrevista es una variante de ocho patrones conocidos.
2. Nombrar el patrón en voz alta vale tanto como escribirlo.
3. El patrón define la forma de la consulta; las definiciones de negocio definen el resultado.
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

En una entrevista técnica evalúan dos cosas a la vez: si llegas al resultado y si se puede trabajar contigo. Lo segundo solo se puede evaluar si hablas mientras piensas. Un candidato que se queda en silencio ocho minutos y entrega una consulta perfecta suele puntuar peor que otro que explica su camino y llega al 90 % de la solución, porque del primero nadie sabe cómo razona.

## Un guion de cuatro pasos

**1. Repite el pedido con tus palabras.** «Quieres los repartidores activos que no entregaron ningún pedido en agosto, uno por fila, ¿es así?». Son treinta segundos que evitan que resuelvas el problema equivocado.

**2. Pregunta lo mínimo imprescindible.** Dos o tres preguntas bien elegidas muestran criterio; diez preguntas seguidas dan la impresión de que no te animas a decidir nada. Las que casi siempre valen la pena son:

- **Grano:** ¿el resultado lleva una fila por pedido, por ítem o por cliente?
- **Universo:** ¿incluimos los pedidos cancelados, las pruebas internas, las cuentas bloqueadas?
- **Tiempo:** ¿qué zona horaria usamos y qué extremos del rango entran?

**3. Declara los supuestos que no vas a preguntar.** Cuando dices un supuesto en voz alta se convierte en una decisión que el entrevistador puede corregir ahí mismo. Si te lo guardas y resulta equivocado, el resultado queda mal y además nadie puede saber por qué. Por ejemplo: «Voy a tomar \`status = 'delivered'\` como pedido válido y a cortar los meses en UTC; si prefieres hora local, cambia solo la conversión».

**4. Describe la consulta antes de escribirla.** «Primero agrego por restaurante, después acumulo el total ordenado de mayor a menor y al final me quedo con las filas hasta llegar al 50 %.» Si un paso está equivocado, te corrigen ahí y no después de diez minutos de escritura.

## Escribe en capas

Las CTE (por *common table expression*, las consultas con nombre que se definen en el \`WITH\`) son tus mejores aliadas bajo presión, porque cada paso queda con nombre, se puede explicar solo y se puede ejecutar por separado.

El ejemplo calcula el GMV por restaurante, sigla de *gross merchandise value*, que es el valor total de lo vendido antes de descontar comisiones:

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

Si te trabas a mitad de camino, una capa terminada ya demuestra que el enfoque era correcto. Una consulta monolítica a medio escribir no demuestra nada.

## La verificación de treinta segundos

Antes de decir «listo», haz tres comprobaciones que cuestan muy poco y evitan entregar un resultado incorrecto con apariencia de correcto:

- **Cuenta las filas.** ¿El total tiene el orden de magnitud que esperabas? Si hay 400 restaurantes, un resultado de 12 000 filas significa que algo se multiplicó en un join.
- **Revisa una fila a mano.** Elige un caso concreto y recórrelo mentalmente de punta a punta.
- **Busca los casos borde.** ¿Qué pasa con quien no tiene ningún pedido, con los empates y con los nulos? Nombrarlos, aunque no llegues a resolverlos, es parte de la respuesta.

## Cuando no sabes la función exacta

Decir «lo resolvería con una función de ventana que compare cada fila con la anterior; creo que es \`lag\`, lo confirmaría en la documentación» es una respuesta profesional y nadie la castiga. En cambio, inventar sintaxis con tono seguro deja la peor impresión posible, porque sugiere que harías lo mismo con un dato de producción.

## Errores comunes

- Quedarte callado mientras piensas y dejar al entrevistador sin ninguna señal de tu razonamiento.
- Preguntarlo todo y no proponer nunca un supuesto propio.
- Entregar el resultado sin haber verificado su orden de magnitud.

## Resumen

1. Repite el pedido, pregunta poco, declara tus supuestos y describe el plan antes de escribir.
2. Construye en capas: cada CTE es un paso que puedes defender por separado.
3. Reserva treinta segundos para contar filas, revisar un caso y nombrar los casos borde.
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

Casi nadie pierde una entrevista de SQL por no recordar el nombre de una función. Se pierde por errores que producen un resultado **plausible pero falso**, y por no detectarlos antes de entregarlo. Estos son los que más se repiten.

## 1. \`NOT IN\` con una subconsulta que tiene NULL

\`\`\`sql
-- Devuelve cero filas si algún courier_id es NULL
SELECT * FROM couriers
WHERE id NOT IN (SELECT courier_id FROM orders);
\`\`\`

La comparación \`id NOT IN (1, 2, NULL)\` se evalúa como «desconocido» y nunca como verdadero, porque el motor no puede descartar que ese NULL sea justamente el valor buscado. El resultado es que **ninguna** fila pasa el filtro. No recibes un error: recibes una tabla vacía, y una tabla vacía se confunde fácilmente con «no hay casos que reportar». Usa \`NOT EXISTS\`, que trata al nulo como ausencia de fila, o agrega \`WHERE courier_id IS NOT NULL\` dentro de la subconsulta.

## 2. Filtrar la tabla derecha de un \`LEFT JOIN\` en el \`WHERE\`

\`\`\`sql
-- El LEFT JOIN queda convertido en INNER JOIN
FROM merchants AS m
LEFT JOIN transactions AS t ON t.merchant_id = m.id
WHERE t.is_flagged;
\`\`\`

Las filas sin coincidencia llegan al \`WHERE\` con \`t.is_flagged\` en NULL, la condición no da verdadero y esas filas se descartan. Así desaparecen del reporte justamente los comercios sin transacciones marcadas. Si la condición se refiere a la tabla opcional, escríbela en el \`ON\`; el \`WHERE\` solo debe llevar condiciones sobre la tabla obligatoria.

## 3. \`count(*)\` después de un \`LEFT JOIN\`

\`count(*)\` cuenta filas, y una fila sin coincidencia sigue siendo una fila. Por eso los comercios sin ninguna transacción marcada te devuelven 1 en lugar de 0, y el informe muestra que todos tienen al menos un caso. \`count(t.id)\` cuenta solo los valores que no son nulos y devuelve el cero correcto.

## 4. Truncar fechas sin fijar el huso

\`created_at\` es de tipo \`timestamptz\`, así que guarda un instante absoluto. \`date_trunc('month', created_at)\` corta ese instante según la zona horaria configurada en la sesión, y por eso la misma consulta reparte los datos entre meses distintos en un servidor configurado en otra zona. El simulador de este curso fija UTC para que los resultados sean reproducibles, pero el entrevistador no te está preguntando por este entorno sino por el suyo. Escribe \`date_trunc('month', created_at AT TIME ZONE 'UTC')\` y **dilo en voz alta**: «los meses están cortados en UTC; si el estándar de la empresa es otro, lo cambio».

## 5. \`BETWEEN\` con marcas de tiempo

\`BETWEEN '2025-08-01' AND '2025-08-31'\` deja afuera casi todo el 31 de agosto, porque ese extremo se interpreta como la medianoche del día 31 y los movimientos posteriores quedan fuera del rango. El rango semiabierto \`>= '2025-08-01' AND < '2025-09-01'\` no tiene ese problema y funciona igual con fechas y con marcas de tiempo.

## 6. Confundir el grano

Unir pedidos con sus ítems multiplica las filas de pedido, porque cada pedido aparece una vez por cada ítem que contiene. Si después sumas \`orders.total\`, el total de cada pedido se suma tantas veces como ítems tenga y el resultado queda inflado. Antes de agregar, pregúntate siempre: **una fila de este resultado, ¿qué representa exactamente?**

## 7. Suponer que una fila es una persona

Dos cuentas con el mismo correo, una escrita con mayúsculas y otra con minúsculas, son la misma persona para el negocio y dos filas distintas para el motor. En cualquier pregunta sobre clientes únicos, normaliza el texto antes de contar y menciona que lo estás haciendo.

## 8. Entregar sin verificar

El error más caro no es ninguno de los anteriores: es no mirar el resultado antes de entregarlo. Si una consulta sobre 300 comercios devuelve 0 filas o 40 000, hay algo roto. Contar filas y revisar un caso a mano toma menos de un minuto y te evita defender un número falso.

## Cómo se ve la recuperación

Encontrar tu propio error durante la entrevista suma puntos en lugar de restarlos. «Me devolvió cero filas y eso no puede ser; el \`NOT IN\` debe estar chocando con un nulo, lo cambio por \`NOT EXISTS\`» es exactamente lo que el entrevistador quiere escuchar de alguien que va a trabajar con datos de producción.

## Resumen

1. Los errores caros producen resultados plausibles: nulos, joins que filtran de más y husos horarios.
2. Verifica el grano y el orden de magnitud antes de entregar.
3. Detectar y corregir tu propio error en voz alta juega a tu favor.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes resolver bajo tiempo problemas típicos de entrevista, como los primeros N por grupo, rachas y duplicados, y explicar en voz alta tu razonamiento.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 39 · Proyectos finales (capstone). Vas a hacer un análisis completo de punta a punta para tu portafolio.

**Para practicar (opcional):** ¿Cuál es la racha más larga de días seguidos con pagos con tarjeta de cada cuenta de Bolsillo? Usa \`transactions\` con \`kind\` igual a \`'card_payment'\`.
`,
  },
];
