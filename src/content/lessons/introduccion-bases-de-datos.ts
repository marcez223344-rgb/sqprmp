import type { LessonDef } from "../schemas/curriculum";

export const lessons: LessonDef[] = [
  {
    slug: "que-es-una-base-de-datos",
    section: "introduccion-bases-de-datos",
    kind: "theory",
    title: "Qué es una base de datos y por qué las empresas la necesitan",
    sort_order: 0,
    estimated_minutes: 6,
    is_free: true,
    is_published: true,
    prerequisites: [],
    body_md: `## Por qué importa

Imagina un marketplace como **TiendaViva**: miles de clientes en México, Argentina y Colombia compran a cientos de vendedores todos los días. Cada pedido genera decenas de datos: quién compró, qué, cuánto pagó, en cuántas cuotas, a dónde se envió. Guardar eso en hojas de cálculo sueltas dura poco: se pierden versiones, se duplican clientes y nadie sabe cuál es «la cifra correcta».

Una **base de datos** resuelve ese problema: es un sistema que guarda la información de forma organizada, consistente y compartida, y que responde preguntas sobre ella con rapidez.

## El concepto

Una base de datos **relacional** organiza los datos en **tablas**. Cada tabla representa un tipo de cosa del negocio (clientes, pedidos, productos) y cada fila es un caso concreto (un cliente, un pedido). Las tablas se **relacionan** entre sí mediante identificadores: un pedido guarda el \`customer_id\` del cliente que lo hizo, no su nombre completo repetido.

Esa separación evita duplicar información y permite combinar tablas cuando hace falta: «los pedidos de clientes de Colombia» une \`orders\` con \`customers\`.

## Datos operativos y datos analíticos

Las empresas usan bases de datos con dos fines distintos:

| Uso | Ejemplo en TiendaViva | Preguntas típicas |
|---|---|---|
| **Operativo** | La app registra un pedido nuevo | ¿Cuál es el estado del pedido 8123? |
| **Analítico** | El equipo de finanzas cierra el mes | ¿Cuánto vendimos por país en agosto? |

Como analista trabajarás sobre todo con el segundo tipo, pero los datos nacen en el primero. Entender de dónde vienen te ayuda a interpretar problemas: un pedido «cancelado» a las 3 a. m. probablemente lo canceló el sistema, no una persona.

## Qué hace SQL

**SQL** (Structured Query Language) es el lenguaje con el que le pides datos a una base relacional. No describes *cómo* buscar: describes *qué* quieres, y el motor decide cómo obtenerlo.

\`\`\`sql
SELECT country, COUNT(*) AS customers
FROM customers
GROUP BY country;
\`\`\`

Esa consulta responde «cuántos clientes hay por país». Con una hoja de cálculo harías una tabla dinámica; con SQL escribes tres líneas que funcionan igual con mil o con cien millones de filas, y que puedes guardar, versionar y compartir.

## Quiénes usan SQL

En una empresa de la región lo usan analistas de datos, de producto, de marketing y de finanzas; también ingenieros de datos, científicos de datos y muchas personas de operaciones. En procesos de selección para roles de datos, SQL es casi siempre la primera prueba técnica.

## En resumen

- Una base de datos relacional guarda información en tablas relacionadas por identificadores.
- Los datos operativos alimentan el negocio; los analíticos responden preguntas sobre él.
- SQL es el lenguaje para pedir esos datos: describes qué quieres, no cómo buscarlo.
`,
  },
  {
    slug: "como-piensa-un-analista",
    section: "introduccion-bases-de-datos",
    kind: "theory",
    title: "Cómo piensa un analista antes de escribir SQL",
    sort_order: 1,
    estimated_minutes: 5,
    is_free: true,
    is_published: true,
    prerequisites: ["que-es-una-base-de-datos"],
    body_md: `## Por qué importa

La mayoría de los errores en análisis de datos no son de sintaxis: son de **definición**. «¿Cuánto vendimos en agosto?» parece simple hasta que preguntas: ¿pedidos creados o entregados? ¿incluye cancelados? ¿en qué moneda? Un buen analista aclara eso *antes* de escribir la consulta.

## El método en cuatro preguntas

1. **¿Qué pregunta el negocio?** Reescríbela con tus palabras. «Ventas de agosto» → «Suma del importe total de pedidos entregados cuyo pedido se creó en agosto de 2025, por país, en moneda local».
2. **¿Qué tablas la responden?** En TiendaViva: \`orders\` (pedidos) y \`customers\` (país del cliente).
3. **¿Qué filas participan?** Solo las que cumplen las condiciones: estado entregado, rango de fechas.
4. **¿Qué forma tiene el resultado?** Una fila por país con dos columnas: \`country\` y \`total_sales\`.

Con esas respuestas, la consulta casi se escribe sola:

\`\`\`sql
SELECT c.country, SUM(o.total_amount) AS total_sales
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'delivered'
  AND o.created_at >= DATE '2025-08-01'
  AND o.created_at <  DATE '2025-09-01'
GROUP BY c.country;
\`\`\`

No te preocupes si todavía no entiendes cada palabra: en las próximas secciones aprenderás \`SELECT\`, \`WHERE\`, \`JOIN\` y \`GROUP BY\` paso a paso. Lo importante ahora es el **orden de razonamiento**.

## Ejemplo resuelto

Pedido de marketing: «Quiero saber qué tan bien funcionó el Hot Sale».

- Pregunta precisa: número de pedidos y ventas totales durante la semana del Hot Sale (12 al 18 de mayo de 2025), comparados con la semana anterior.
- Tablas: \`orders\`.
- Filas: pedidos creados en esas dos semanas, excluyendo cancelados.
- Forma: dos filas (semana previa, semana Hot Sale) con pedidos y ventas.

Escribir esa definición y confirmarla con quien pidió el dato evita rehacer el trabajo.

## Errores comunes

- Empezar a escribir SQL sin definir qué significa la métrica.
- Asumir que «fecha del pedido» y «fecha de entrega» son intercambiables.
- Olvidar preguntar por la moneda cuando hay varios países.

## En resumen

- Antes de escribir SQL, define pregunta, tablas, filas y forma del resultado.
- Las métricas de negocio necesitan definiciones explícitas (estado, fechas, moneda).
- Confirmar la definición con quien pide el dato ahorra tiempo y errores.
`,
  },
];
