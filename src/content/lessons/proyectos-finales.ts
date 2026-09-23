import type { LessonDef } from "../schemas/curriculum";

const section = "proyectos-finales";

export const lessons: LessonDef[] = [
  {
    slug: "proyectos-finales-planificar-antes-de-escribir",
    section,
    kind: "theory",
    title: "Planificar el análisis antes de escribir SQL",
    sort_order: 0,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["calidad-de-datos-perfilar-una-tabla", "definir-una-cohorte"],
    dataset: "pidelo",
    body_md: `## Por qué importa

Un pedido real casi nunca llega con la consulta adentro. Llega así: «necesito saber cómo venimos con las entregas tarde». Si abres el editor y empiezas a escribir, lo más probable es que entregues un número que nadie pueda usar o, peor, uno que alguien use para decidir sin saber qué mide exactamente.

Los analistas que rinden desde su primera semana no escriben SQL más rápido: escriben **menos** SQL porque deciden antes de escribir. Este es el orden de esas decisiones.

Vas a verlo sobre **Pídelo**, la app de delivery.

## 1. Convierte el pedido en una pregunta con respuesta

Una pregunta está lista cuando puedes escribir en una sola línea **qué representa cada fila del resultado**. «Cómo venimos con las entregas» no lo dice. «Una fila por ciudad y mes, con el porcentaje de pedidos entregados fuera del tiempo prometido» sí lo dice.

Esa frase fija tres cosas de golpe: la **granularidad** (una fila por ciudad y mes), el **universo** (solo los pedidos entregados) y la **métrica** (un porcentaje calculado sobre ese universo).

## 2. Escribe la definición de la métrica

Toda métrica de negocio esconde una decisión. «Tarde» puede significar al menos tres cosas distintas:

- \`delivered_at > placed_at + promised_minutes\`, es decir, que la entrega ocurrió después del tiempo prometido al hacer el pedido; o
- lo mismo, pero admitiendo cinco minutos de tolerancia; o
- comparar contra el momento en que el repartidor retiró el pedido, en lugar del momento en que el cliente lo hizo.

Ninguna de las tres es la correcta: son tres métricas distintas que van a dar tres porcentajes distintos. Tu trabajo es elegir una, escribir la definición junto al resultado y permitir que quien lo lea la discuta. Un número sin definición no se puede auditar, porque nadie puede reproducirlo.

Lo mismo pasa con el denominador. ¿El porcentaje de tardíos se calcula sobre los pedidos entregados o sobre todos, incluidos los cancelados? Cambia el número y cambia la conclusión.

## 3. Fija el período y el huso

Los rangos de fechas se escriben cerrados a la izquierda y abiertos a la derecha, es decir, incluyendo el primer instante y excluyendo el último:

\`\`\`sql
WHERE o.placed_at AT TIME ZONE 'UTC' >= '2025-01-01'
  AND o.placed_at AT TIME ZONE 'UTC' <  '2025-07-01'
\`\`\`

Escribirlo como \`BETWEEN '2025-01-01' AND '2025-06-30'\` pierde todos los pedidos hechos después de la medianoche del 30 de junio, porque esa fecha sin hora se interpreta como las 00:00 de ese día: perderías casi un día entero de datos.

Y como las marcas de tiempo son de tipo \`timestamptz\`, sin el \`AT TIME ZONE 'UTC'\` el mes al que cae cada pedido dependería del huso configurado en la sesión, que en esta plataforma es UTC para que tus resultados sean reproducibles, y en el servidor de tu empresa será el que hayan configurado. Deja el huso escrito en la consulta y declarado en el informe.

## 4. Dibuja el camino de tablas y cuenta filas

Antes de unir nada, escribe el camino que vas a recorrer: \`orders → restaurants → cities\`. Para cada salto contesta una sola pregunta: ¿esta unión puede multiplicar filas?

- De \`orders\` a \`restaurants\` la relación es de muchos a uno, porque cada pedido pertenece a un solo restaurante. No multiplica.
- De \`orders\` a \`order_items\` la relación es de uno a muchos, porque un pedido tiene varios ítems. **Multiplica**: si después de ese join sumas \`orders.total\`, que es la columna \`total\` de la tabla \`orders\`, cuentas el importe de cada pedido tantas veces como ítems tenga, y el total del informe queda inflado.

La regla práctica es agregar primero al nivel de detalle que necesitas y unir recién después. Una CTE por paso hace visible en qué nivel está cada cosa.

## 5. Elige el nivel donde vive cada métrica

En un mismo informe conviven métricas que viven en niveles distintos: la cantidad de pedidos vive en \`orders\`, el importe de los ítems vive en \`order_items\` y la calificación vive en \`ratings\`. Mezclarlas en un solo \`FROM\` con tres joins es la causa número uno de informes con números inflados.

\`\`\`sql
WITH por_pedido AS (
  SELECT o.id, o.restaurant_id, o.total,
         o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute' AS is_late
  FROM orders o
  WHERE o.status = 'delivered'
)
SELECT r.name,
       count(*) AS pedidos,
       round(100.0 * count(*) FILTER (WHERE p.is_late) / count(*), 2) AS late_pct
FROM por_pedido p
JOIN restaurants r ON r.id = p.restaurant_id
GROUP BY r.id, r.name;
\`\`\`

La CTE deja una fila por pedido, con una columna que dice si ese pedido llegó tarde; el \`GROUP BY\` decide el nivel del informe final, que es el restaurante. Quien lea la consulta ve los dos niveles por separado.

## 6. Anota los supuestos que vas a declarar

Mientras planificas van a ir apareciendo huecos: pedidos sin ítems, pagos que faltan, una moneda distinta por país. No los resuelvas en silencio. Anótalos y decide para cada uno si lo excluyes, si lo muestras aparte o si lo dejas y lo aclaras en el informe.

Esa lista corta de supuestos es la mitad del valor de tu entrega: le permite a quien recibe el número saber hasta dónde puede confiar en él.

## Errores comunes al planificar

- Empezar por el \`SELECT\` y descubrir cuál era la granularidad recién cuando el resultado ya tiene filas de más.
- Definir la métrica después de ver el número, para que el número quede más favorable.
- Sumar importes de países con monedas distintas porque el esquema permite hacerlo y nada lo impide.

## Resumen

- Una pregunta está lista cuando puedes describir en una línea qué representa una fila del resultado.
- Toda métrica necesita una definición explícita: numerador, denominador, período y huso horario.
- Dibuja el camino de tablas y pregúntate en cada salto si multiplica filas; agrega antes de unir.
`,
  },
  {
    slug: "proyectos-finales-revisar-tu-propio-trabajo",
    section,
    kind: "theory",
    title: "Revisar tu propio trabajo antes de entregarlo",
    sort_order: 1,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["calidad-de-datos-validez-y-huecos", "dedup-clave-de-negocio"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

El error que te va a costar caro no es el de sintaxis: ese lo marca el motor y lo corriges en un minuto. Es la consulta que se ejecuta sin problemas, devuelve un número creíble y está mal. Nadie lo nota hasta que alguien toma una decisión con ese número.

Por eso, entre «la consulta anda» y «esto se entrega» hay un paso obligatorio: revisarla como si la hubiera escrito otra persona. Son cinco chequeos y juntos tardan menos que escribir la consulta.

## 1. ¿Cuántas filas esperabas?

Antes de mirar el resultado, di en voz alta cuántas filas debería tener. Un informe por país y mes, sobre seis países y 21 meses, tiene como máximo 126 filas. Si la consulta devuelve 1200, hay un join que está multiplicando filas; si devuelve 40, hay un filtro que borró grupos enteros.

Es el chequeo más barato de todos y el que más errores encuentra.

## 2. ¿Los totales cierran contra la tabla base?

Toma una métrica del informe y vuelve a calcularla sin ningún join:

\`\`\`sql
SELECT sum(amount) AS cobrado
FROM payments
WHERE status IN ('approved', 'refunded');
\`\`\`

Si la suma del informe no coincide con ese total, algún join agregó o eliminó filas. Cuando el informe da **de menos**, sospecha de un \`INNER JOIN\` que descartó los registros sin correspondencia; cuando da **de más**, sospecha de una relación de uno a muchos que multiplicó filas.

Este chequeo tiene una versión todavía más útil: comparar dos caminos distintos hacia el mismo número. En TiendaViva, todo pedido con envío debería tener un pago cobrado. Si cuentas los envíos y filtras los pagos solo por \`status = 'approved'\`, te van a sobrar envíos, porque los pedidos devueltos tienen su pago registrado con estado \`refunded\` y no \`approved\`. Esa diferencia no es un error de los datos: es un error de tu definición, y solo aparece cuando comparas dos caminos.

## 3. ¿El join cambió la cantidad de filas de la tabla principal?

Cuando agregas un \`LEFT JOIN\` a un informe que ya estaba armado, verifica que la cantidad de filas no haya cambiado:

\`\`\`sql
SELECT count(*) AS solo_pedidos FROM orders;

SELECT count(*) AS con_devoluciones
FROM orders o
LEFT JOIN returns r ON r.order_id = o.id;
\`\`\`

Si el segundo número es mayor que el primero, la tabla de la derecha tiene más de una fila por cada pedido y cualquier \`sum()\` que hagas después está contando importes repetidos.

La solución no es agregar \`DISTINCT\`, porque eso esconde las filas de más pero no corrige las sumas. La solución es agregar la tabla de la derecha en una CTE, dejándola con una sola fila por pedido, y recién entonces unirla.

## 4. ¿Hay NULL donde no los esperas?

Revisa columna por columna el resultado. Un \`NULL\` puede ser perfectamente correcto —«ningún pedido de esa ciudad llegó tarde, así que no hay demora promedio»— o puede ser el síntoma de un \`LEFT JOIN\` sin correspondencia que estás interpretando como si fuera un cero.

Y recuerda la trampa clásica: un promedio ignora los valores nulos, así que \`avg(rating)\` sobre 100 pedidos de los cuales solo 40 tienen calificación es el promedio de esos 40, no de los 100. Si esa diferencia importa para la conclusión, dilo en el informe.

## 5. ¿El resultado es estable?

Ejecuta la consulta dos veces seguidas. Si el orden de las filas cambia entre una y otra, te falta un \`ORDER BY\` determinista: cuando ordenas por una columna en la que hay empates, el motor puede devolver esas filas empatadas en cualquier orden. Agrega un criterio de desempate único, como un identificador, y el resultado deja de moverse.

Lo mismo vale con \`LIMIT\`: un top 10 sin criterio de desempate no es reproducible, porque los puestos del final pueden cambiar en cada ejecución, y un informe que no se puede reproducir no se puede auditar.

## El chequeo de razonabilidad

El último es el menos técnico y el que más veces salva un entregable: mira los extremos del resultado. ¿El mes con más ventas es diciembre, como esperarías? ¿La ciudad más grande tiene más pedidos? ¿Hay algún porcentaje que dé más de 100? ¿Hay alguna tasa que dé exactamente 0,00 % en todas las filas, lo que suele indicar una división entera?

Cuando un número te sorprende, la explicación correcta casi nunca es que los datos sean raros. Lo más probable es que haya un problema en tu consulta, así que revísala antes de salir a explicar el hallazgo.

## Cómo se entrega

Junto al resultado van cuatro líneas: la definición de cada métrica, el período y el huso horario, los registros que excluiste y por qué, y la limitación más importante que tenga el análisis. Esas cuatro líneas son lo que convierte una tabla de números en un entregable.

## Resumen

- Predice la cantidad de filas antes de mirar el resultado; la diferencia te dice qué join falló.
- Reconcilia cada métrica contra la tabla base sin joins, y después contra un segundo camino.
- Entrega definición, período, exclusiones y limitaciones: sin eso, el número no se puede auditar.
`,
  },
  {
    slug: "proyectos-finales-del-curso-al-trabajo",
    section,
    kind: "theory",
    title: "Del curso al trabajo: qué hacer con esto",
    sort_order: 2,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["matriz-de-retencion", "agregacion-condicional-tasas-y-proporciones"],
    dataset: "ritmo",
    body_md: `## Dónde estás

Terminaste una ruta que va desde \`SELECT\` hasta cohortes, funnels, funciones de ventana, deduplicación y auditoría de calidad de datos. Eso cubre con holgura lo que se pide en una vacante de analista de datos junior o semi senior en la región.

Lo que todavía te falta no es más SQL: es el contexto que rodea al SQL, es decir, cómo se organiza el trabajo de datos dentro de una empresa y cómo se comunican los resultados.

## Cómo se ve esto en un trabajo real

Un día típico no es una consulta grande: son cinco pedidos chicos y uno grande. Estos son los pedidos que vas a recibir desde tu primera semana, con lo que ya practicaste al lado:

| Pedido real                                   | Lo que ya sabes hacer                         |
| --------------------------------------------- | --------------------------------------------- |
| «¿Cuánto facturamos el mes pasado por país?»  | Agregación por período con moneda por país    |
| «¿Los clientes nuevos vuelven?»               | Cohortes y retención                          |
| «¿Dónde se cae la gente en el registro?»      | Funnels con orden temporal                    |
| «Este informe no coincide con el de finanzas» | Reconciliación y auditoría de calidad         |
| «Necesito el top 10 de vendedores por región» | Rankings con criterio de desempate explícito  |
| «¿Podemos confiar en esta tabla?»             | Perfilado, duplicados, integridad referencial |

La diferencia entre un pedido del curso y uno real es que el real llega sin definición. Ese hueco lo llenas tú, con la pregunta de vuelta: «¿cuentan los pedidos cancelados?».

## Qué agregar después

Tres cosas, ordenadas por lo que más te va a devolver al principio:

1. **Modelado y herramientas del equipo**: cómo se documenta una métrica para que todos calculen lo mismo, qué es una tabla de hechos y qué es una dimensión, y qué hace una herramienta de transformación de datos cuando el equipo ya usa una.
2. **Visualización**: la misma tabla presentada en un gráfico de líneas convence mucho más que una planilla. Cualquier herramienta sirve para aprender el criterio, que es lo que importa: elegir bien la escala, mostrar una comparación clara y transmitir una sola idea por gráfico.
3. **Un lenguaje de propósito general**, normalmente Python, para lo que SQL no hace: automatizar una tarea que se repite, consumir datos de una API o probar una hipótesis estadística.

Nada de esto reemplaza al SQL. Todo lo demás se apoya en la consulta que escribes bien.

## Cómo se arma un portafolio que sirve

El error común es publicar un cuaderno con veinte consultas sueltas. Nadie lo lee, porque no hay forma de saber por dónde empezar. Lo que sí se lee es **un análisis corto y bien cerrado**, con estas partes:

- Una pregunta de negocio en una línea.
- El dataset y su alcance, con la cantidad de filas y el período que cubre.
- Las definiciones de las métricas, escritas de forma explícita.
- Dos o tres resultados, cada uno con la consulta que lo produjo al lado.
- Una conclusión sobre la que se pueda decidir algo y una limitación declarada con honestidad.

Los proyectos de esta sección tienen exactamente esa forma. Tomar uno, reescribir el contexto con tus palabras y agregarle un gráfico ya es un proyecto de portafolio terminado.

Hay algo que casi nadie incluye y que siempre destaca: el chequeo de calidad que corriste **antes** de confiar en los datos. Mostrar que encontraste 178 pedidos sin ítems y que decidiste qué hacer con ellos dice más sobre tu criterio profesional que la consulta más larga del cuaderno.

## En una entrevista técnica

Vas a resolver un problema con alguien mirándote escribir. Hay tres hábitos que valen más que llegar a la respuesta:

- Repite el enunciado con tus palabras y pregunta por la definición ambigua antes de empezar a escribir.
- Di qué va a representar cada fila del resultado antes de escribir el \`SELECT\`.
- Al terminar, menciona un caso borde que tu consulta no cubre. Nadie espera una solución perfecta en una entrevista; lo que se evalúa es el criterio.

## El certificado

El certificado **Analista SQL Profesional** se emite cuando completas las secciones del tramo aplicado y profesional —desde cohortes y retención hasta estos proyectos finales— con al menos 80 % de respuestas correctas en los cuestionarios. Certifica que resolviste estos análisis sobre datos sucios de verdad, no que leíste la teoría.

Úsalo como lo que es: una línea verificable en tu perfil profesional. Lo que te va a conseguir la entrevista es el proyecto que puedas explicar en cinco minutos.

## Resumen

- Lo que falta después de este curso no es SQL: es modelado, visualización y contexto de negocio.
- Un proyecto de portafolio bien cerrado vale más que veinte consultas sueltas.
- En la entrevista pesa más el criterio para preguntar y declarar supuestos que la consulta perfecta.
`,
  },
];
