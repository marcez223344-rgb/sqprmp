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

Un pedido real casi nunca llega con la consulta adentro. Llega así: «necesito saber cómo venimos con las entregas tarde». Si abres el editor y empiezas a escribir, vas a entregar un número que nadie puede usar o, peor, uno que alguien va a usar mal.

Los analistas que rinden en su primera semana no escriben SQL más rápido: escriben **menos** SQL porque deciden antes. Este es el orden de esas decisiones.

## 1. Convierte el pedido en una pregunta con respuesta

Una pregunta está lista cuando puedes escribir, en una línea, **qué devuelve cada fila del resultado**. «Cómo venimos con las entregas» no lo dice. «Una fila por ciudad y mes, con el porcentaje de pedidos entregados fuera del tiempo prometido» sí.

Esa frase fija tres cosas de golpe: la **granularidad** (ciudad × mes), el **universo** (pedidos entregados) y la **métrica** (porcentaje sobre ese universo).

## 2. Escribe la definición de la métrica

Toda métrica de negocio esconde una decisión. «Tarde» puede significar:

- \`delivered_at > placed_at + promised_minutes\`, o
- lo mismo con cinco minutos de tolerancia, o
- comparar contra el momento en que el repartidor retiró el pedido y no contra el momento en que se hizo.

Ninguna es la correcta: son tres métricas distintas. Tu trabajo es elegir una, escribirla junto al resultado y que quien lo lea pueda discutirla. Un número sin definición no se puede auditar.

Lo mismo pasa con el denominador. ¿El porcentaje de tardíos se calcula sobre los pedidos entregados o sobre todos, incluidos los cancelados? Cambia el número y cambia la conclusión.

## 3. Fija el período y el huso

Los rangos se escriben cerrados a la izquierda y abiertos a la derecha:

\`\`\`sql
WHERE o.placed_at AT TIME ZONE 'UTC' >= '2025-01-01'
  AND o.placed_at AT TIME ZONE 'UTC' <  '2025-07-01'
\`\`\`

\`BETWEEN '2025-01-01' AND '2025-06-30'\` pierde todo lo que ocurrió después de la medianoche del 30 de junio. Y como las marcas son \`timestamptz\`, sin \`AT TIME ZONE 'UTC'\` el mes al que cae cada pedido depende de la zona de la sesión (UTC en el sandbox, para que tus resultados sean reproducibles; en el servidor de tu empresa, la que hayan configurado). Deja el huso escrito en la consulta y declarado en el informe.

## 4. Dibuja el camino de tablas y cuenta filas

Antes de unir nada, escribe el camino: \`orders → restaurants → cities\`. Para cada salto contesta: ¿esta unión puede multiplicar filas?

- \`orders → restaurants\`: muchos a uno. No multiplica.
- \`orders → order_items\`: uno a muchos. **Multiplica**, y si sumas \`orders.total\` después de ese join, cuentas cada pedido tantas veces como ítems tenga.

La regla práctica: agrega primero al nivel de detalle que necesitas y recién después une. Una CTE por paso hace visible ese nivel.

## 5. Elige el nivel donde vive cada métrica

En un mismo informe conviven métricas de niveles distintos: la cantidad de pedidos vive en \`orders\`, el importe de los ítems vive en \`order_items\` y la calificación vive en \`ratings\`. Mezclarlas en un solo \`FROM\` con tres joins es la causa número uno de informes inflados.

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

La CTE deja una fila por pedido; el \`GROUP BY\` decide el nivel del informe. Cualquiera que lea la consulta ve los dos niveles por separado.

## 6. Anota los supuestos que vas a declarar

Mientras planificas van a aparecer huecos: pedidos sin ítems, pagos que faltan, una moneda distinta por país. No los resuelvas en silencio. Anótalos y decide: los excluyo, los muestro aparte o los dejo y lo aclaro. Esa lista corta es la mitad del valor de tu entrega.

## Errores comunes al planificar

- Empezar por el \`SELECT\` y descubrir la granularidad cuando el resultado ya tiene filas de más.
- Definir la métrica después de ver el número, para que el número quede «lindo».
- Sumar importes de países con monedas distintas porque el esquema no tiene una columna que lo impida.

## Resumen

- Una pregunta está lista cuando puedes describir en una línea qué es una fila del resultado.
- Toda métrica necesita definición explícita: numerador, denominador, período y huso.
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

El error que te va a costar caro no es el de sintaxis: ese lo marca el motor. Es la consulta que corre, devuelve un número creíble y está mal. Nadie lo nota hasta que alguien toma una decisión con él.

Por eso, entre «la consulta anda» y «esto se entrega» hay un paso obligatorio: revisarla como si la hubiera escrito otra persona. Son cinco chequeos y tardan menos que escribir la consulta.

## 1. ¿Cuántas filas esperabas?

Antes de mirar el resultado, di cuántas filas debería tener. Un informe por país y mes sobre seis países y 21 meses tiene como máximo 126 filas. Si devuelve 1200, hay un join que multiplica; si devuelve 40, hay un filtro que borró grupos enteros.

Es el chequeo más barato y el que más errores encuentra.

## 2. ¿Los totales cierran contra la tabla base?

Toma una métrica del informe y recalcúlala sin joins:

\`\`\`sql
SELECT sum(amount) AS cobrado
FROM payments
WHERE status IN ('approved', 'refunded');
\`\`\`

Si la suma del informe no coincide con ese total, el join agregó o borró filas. Cuando no coincide **de menos**, sospecha de un \`INNER JOIN\` que descartó registros sin correspondencia; cuando no coincide **de más**, sospecha de una relación uno a muchos.

Este chequeo tiene una versión aún más útil: comparar dos caminos hacia el mismo número. En TiendaViva, todo pedido con envío debería tener un pago cobrado. Si cuentas los envíos y filtras los pagos solo por \`status = 'approved'\`, te van a sobrar envíos: los pedidos devueltos tienen su pago en \`refunded\`, no en \`approved\`. La diferencia no es un error del dato, es un error de tu definición.

## 3. ¿El join cambió la cantidad de filas de la tabla principal?

Cuando agregas un \`LEFT JOIN\` a un informe ya armado, verifica que la cantidad de filas no cambió:

\`\`\`sql
SELECT count(*) AS solo_pedidos FROM orders;

SELECT count(*) AS con_devoluciones
FROM orders o
LEFT JOIN returns r ON r.order_id = o.id;
\`\`\`

Si el segundo número es mayor, la tabla de la derecha tiene más de una fila por clave y tu \`sum()\` está contando de más. La solución no es \`DISTINCT\`: es agregar la tabla de la derecha en una CTE antes de unirla.

## 4. ¿Hay NULL donde no los esperas?

Revisa cada columna del resultado. Un \`NULL\` puede ser correcto —«ningún pedido llegó tarde, así que no hay demora promedio»— o puede ser el síntoma de un \`LEFT JOIN\` sin correspondencia que estás tratando como cero.

Y recuerda la trampa clásica: un promedio ignora los nulos, así que \`avg(rating)\` sobre 100 pedidos con 40 calificaciones es el promedio de esos 40, no de los 100. Si eso importa, dilo en el informe.

## 5. ¿El resultado es estable?

Ejecuta la consulta dos veces. Si el orden de las filas cambia, te falta un \`ORDER BY\` determinista: cuando ordenas por una columna con empates, el motor puede devolver los empates en cualquier orden. Agrega un criterio de desempate único (un id, un nombre) y el resultado deja de moverse.

Lo mismo con \`LIMIT\`: un top 10 sin desempate no es reproducible, y un informe que no se puede reproducir no se puede auditar.

## El chequeo de razonabilidad

El último es el menos técnico y el que más veces salva: mira los extremos. ¿El mes con más ventas es diciembre? ¿La ciudad más grande tiene más pedidos? ¿Algún porcentaje da más de 100? ¿Alguna tasa da exactamente 0,00 % en todas las filas?

Cuando un número te sorprende, la explicación correcta casi nunca es «los datos son raros». Suele ser tu consulta.

## Cómo se entrega

Junto al resultado van cuatro líneas: la definición de cada métrica, el período y el huso, los registros excluidos y por qué, y la limitación más grande que tenga el análisis. Eso convierte una tabla en un entregable.

## Resumen

- Predice la cantidad de filas antes de mirar el resultado; la diferencia te dice qué join falló.
- Reconcilia cada métrica contra la tabla base sin joins y contra un segundo camino.
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

Terminaste una ruta que va de \`SELECT\` a cohortes, funnels, ventanas, deduplicación y auditoría de calidad. Eso cubre, con holgura, lo que se pide en una vacante de analista de datos junior o semi senior en la región. Lo que falta no es más SQL: es el contexto alrededor del SQL.

## Cómo se ve esto en un trabajo real

Un día típico no es una consulta grande: son cinco pedidos chicos y uno grande. Estos son los que vas a ver desde la primera semana, con lo que ya practicaste al lado:

| Pedido real                                   | Lo que ya sabes hacer                         |
| --------------------------------------------- | --------------------------------------------- |
| «¿Cuánto facturamos el mes pasado por país?»  | Agregación por período con moneda por país    |
| «¿Los clientes nuevos vuelven?»               | Cohortes y retención                          |
| «¿Dónde se cae la gente en el registro?»      | Funnels con orden temporal                    |
| «Este informe no coincide con el de finanzas» | Reconciliación y auditoría de calidad         |
| «Necesito el top 10 de vendedores por región» | Rankings con criterio de desempate explícito  |
| «¿Podemos confiar en esta tabla?»             | Perfilado, duplicados, integridad referencial |

La diferencia entre un pedido del curso y uno real es que el real llega sin definición. Ese hueco lo llenas tú, con la pregunta de vuelta: «¿cuenta el pedido cancelado?».

## Qué agregar después

Tres cosas, en este orden de retorno:

1. **Modelado y herramientas del equipo**: cómo se documenta una métrica, qué es una tabla de hechos y una dimensión, y qué hace una herramienta de transformación cuando el equipo ya la usa.
2. **Visualización**: la misma tabla en un gráfico de líneas convence diez veces más. Cualquier herramienta sirve para aprender el criterio: escala, comparación y una idea por gráfico.
3. **Un lenguaje de propósito general** (Python suele ser el primero) para lo que SQL no hace: automatizar, consumir una API, probar una hipótesis estadística.

Nada de esto reemplaza al SQL. Todo lo demás se apoya en la consulta que escribes bien.

## Cómo se arma un portafolio que sirve

El error común es publicar un cuaderno con veinte consultas. Nadie lo lee. Lo que se lee es **un análisis corto y bien cerrado**:

- Una pregunta de negocio en una línea.
- El dataset y su alcance, con volumen y período.
- Las definiciones de las métricas, explícitas.
- Dos o tres resultados, cada uno con la consulta al lado.
- Una conclusión accionable y una limitación honesta.

Los proyectos de esta sección tienen exactamente esa forma. Tomar uno, reescribir el contexto con tus palabras y agregar un gráfico es un proyecto de portafolio terminado.

Y algo que casi nadie hace y siempre destaca: incluye el chequeo de calidad que corriste **antes** de confiar en los datos. Mostrar que encontraste 178 pedidos sin ítems y decidiste qué hacer con ellos dice más de ti que la consulta más larga.

## En una entrevista técnica

Vas a resolver un problema con alguien mirando. Tres hábitos valen más que la respuesta:

- Repite el enunciado con tus palabras y pregunta por la definición ambigua antes de escribir.
- Di qué devuelve cada fila del resultado antes de tipear el \`SELECT\`.
- Al terminar, menciona un caso borde que tu consulta no cubre. Nadie espera perfección; esperan criterio.

## El certificado

El certificado **Analista SQL Profesional** se emite cuando completas las secciones del tramo aplicado y profesional —desde cohortes y retención hasta estos proyectos finales— con al menos 80 % en los cuestionarios. Certifica que resolviste estos análisis con datos sucios de verdad, no que viste los videos.

Úsalo como lo que es: una línea verificable en tu perfil. Lo que te va a conseguir la entrevista es el proyecto que puedes explicar en cinco minutos.

## Resumen

- Lo que falta después de este curso no es SQL: es modelado, visualización y contexto de negocio.
- Un proyecto de portafolio bien cerrado vale más que veinte consultas sueltas.
- En la entrevista, el criterio para preguntar y declarar supuestos pesa más que la consulta perfecta.
`,
  },
];
