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

Imagina un marketplace como **TiendaViva**, es decir, un sitio donde muchos vendedores distintos ofrecen sus productos a muchos compradores. Miles de clientes en México, Argentina y Colombia compran a cientos de vendedores todos los días. Cada compra deja registrados decenas de datos: quién compró, qué producto, cuánto pagó, en cuántas cuotas y a qué dirección se envió.

Si guardas todo eso en hojas de cálculo sueltas, a los pocos meses tienes varias versiones del mismo archivo, el mismo cliente cargado dos veces y ninguna forma de saber cuál es la cifra correcta. Una **base de datos** es el programa que resuelve ese problema: guarda la información de forma organizada y única, permite que varias personas la usen al mismo tiempo sin pisarse y responde preguntas sobre esos datos en segundos.

## El concepto: tablas, filas y columnas

La mayoría de las bases de datos de empresa son **relacionales**, lo que significa que guardan los datos en **tablas**, parecidas a las de una hoja de cálculo pero con reglas más estrictas.

- Una **tabla** representa un tipo de cosa del negocio: una tabla de clientes, una de pedidos, una de productos.
- Una **columna** es un dato que se guarda de todos ellos: el nombre del cliente, su país, la fecha en que se registró.
- Una **fila** es un caso concreto: un cliente puntual, con su nombre y su país.

Así se ve una tabla de clientes con dos filas:

| id | full_name | country |
|---|---|---|
| 1 | Valentina Rojas | CO |
| 2 | Mateo Fernández | AR |

Lo que hace «relacional» a esta forma de guardar datos es que las tablas se conectan entre sí mediante identificadores. Cada cliente tiene un número que lo identifica, su \`id\`. Cuando ese cliente hace un pedido, la tabla de pedidos no repite su nombre completo: guarda ese número en la columna \`customer_id\` de la tabla \`orders\`, que en términos de negocio significa «el cliente que hizo este pedido».

Esa separación tiene dos ventajas concretas. Si el cliente corrige su nombre, se corrige en un solo lugar. Y cuando necesitas los datos juntos, puedes combinar las dos tablas: para responder «los pedidos de clientes de Colombia» combinas la tabla \`orders\` con la tabla \`customers\`.

## Datos operativos y datos analíticos

Las empresas usan sus bases de datos con dos fines distintos:

| Uso | Ejemplo en TiendaViva | Preguntas típicas |
|---|---|---|
| **Operativo** | La app registra un pedido nuevo | ¿Cuál es el estado del pedido 8123? |
| **Analítico** | El equipo de finanzas cierra el mes | ¿Cuánto vendimos por país en agosto? |

El uso operativo hace funcionar el negocio día a día: anota cada pedido, cada pago y cada envío. El uso analítico responde preguntas sobre todo ese historial acumulado.

Como analista vas a trabajar sobre todo con el segundo uso, pero los datos nacen en el primero, y saber de dónde vienen te ayuda a interpretarlos. Por ejemplo, si ves un pedido cancelado a las 3 de la mañana, lo más probable es que lo haya cancelado un proceso automático del sistema y no una persona.

## Qué es una consulta y qué hace SQL

Una **consulta** es una pregunta escrita que le haces a la base de datos, y que la base responde devolviéndote una tabla de resultados.

Esas preguntas se escriben en **SQL** (por *Structured Query Language*, lenguaje de consulta estructurado, su nombre en inglés), el lenguaje estándar para pedirle datos a una base relacional. Su particularidad es que no describes *cómo* buscar la información, recorriendo filas una por una: describes *qué* quieres obtener, y el motor de la base de datos se encarga de encontrar la manera más rápida de dártelo.

\`\`\`sql
SELECT country, COUNT(*) AS customers
FROM customers
GROUP BY country;
\`\`\`

Esa consulta responde «cuántos clientes hay por país». Se lee así: de la tabla \`customers\`, agrupa las filas según el valor de la columna \`country\` y, para cada país, cuenta cuántas filas hay. El resultado es una tabla con una fila por país. La sintaxis la vas a aprender palabra por palabra en las próximas secciones.

En una hoja de cálculo harías lo mismo con una tabla dinámica. La diferencia es que estas tres líneas funcionan igual con mil filas o con cien millones, y además puedes guardarlas, versionarlas y compartirlas para que otra persona obtenga exactamente el mismo número.

## Quiénes usan SQL

En una empresa de la región usan SQL los analistas de datos, de producto, de marketing y de finanzas, y también los ingenieros de datos, los científicos de datos y muchas personas del área de operaciones. En los procesos de selección para roles de datos, SQL es casi siempre la primera prueba técnica que te van a tomar.

## En resumen

- Una base de datos relacional guarda información en tablas, y las tablas se conectan entre sí por identificadores.
- Los datos operativos hacen funcionar el negocio; los analíticos responden preguntas sobre él.
- SQL es el lenguaje con el que escribes consultas: describes qué datos quieres y el motor decide cómo buscarlos.
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

La mayoría de los errores en análisis de datos no son errores de sintaxis: esos los marca el motor apenas ejecutas la consulta. Son errores de **definición**, es decir, la consulta funciona y devuelve un número, pero ese número responde una pregunta distinta de la que te hicieron.

«¿Cuánto vendimos en agosto?» parece simple hasta que preguntas: ¿cuentas los pedidos creados en agosto o los entregados en agosto? ¿Incluyes los cancelados? ¿En qué moneda, si vendemos en varios países? Un buen analista aclara todo eso *antes* de escribir la consulta, porque después ya es tarde: el número existe y alguien lo va a usar para decidir.

## El método en cuatro preguntas

1. **¿Qué pregunta el negocio?** Reescríbela con tus palabras, sin ambigüedad. «Ventas de agosto» se convierte en «suma del importe total de los pedidos entregados que se crearon en agosto de 2025, separada por país y en moneda local».
2. **¿Qué tablas la responden?** En TiendaViva son dos: \`orders\`, que guarda un pedido por fila, y \`customers\`, que guarda el país de cada cliente.
3. **¿Qué filas participan?** Solo las que cumplen las condiciones que definiste: estado entregado y fecha de creación dentro de agosto.
4. **¿Qué forma tiene el resultado?** Una fila por país, con dos columnas: \`country\` y \`total_sales\`.

Con esas cuatro respuestas, la consulta casi se escribe sola:

\`\`\`sql
SELECT c.country, SUM(o.total_amount) AS total_sales
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'delivered'
  AND o.created_at >= DATE '2025-08-01'
  AND o.created_at <  DATE '2025-09-01'
GROUP BY c.country;
\`\`\`

Todavía no hace falta que entiendas cada palabra: en las próximas secciones vas a aprender \`SELECT\`, \`WHERE\`, \`JOIN\` y \`GROUP BY\` paso a paso. Lo que importa ahora es el **orden de razonamiento**, porque ese orden es el mismo sin importar qué tan complicada sea la consulta.

## Ejemplo resuelto

Llega un pedido del área de marketing: «Quiero saber qué tan bien funcionó el Hot Sale».

- **Pregunta precisa**: cantidad de pedidos y ventas totales durante la semana del Hot Sale (del 12 al 18 de mayo de 2025), comparadas con las de la semana anterior.
- **Tablas**: alcanza con \`orders\`.
- **Filas**: los pedidos creados en esas dos semanas, excluyendo los cancelados.
- **Forma del resultado**: dos filas, una por semana, con la cantidad de pedidos y las ventas.

Escribir esa definición y confirmarla con quien te pidió el dato toma cinco minutos, y evita que tengas que rehacer todo el trabajo cuando esa persona vea el resultado y te diga que esperaba otra cosa.

## Errores comunes

- Empezar a escribir SQL sin haber definido qué significa exactamente la métrica que te pidieron.
- Dar por hecho que «fecha del pedido» y «fecha de entrega» son lo mismo: un pedido de fin de mes se entrega al mes siguiente y cae en otro período.
- No preguntar por la moneda cuando la empresa vende en varios países, y terminar sumando importes de monedas distintas como si fueran comparables.

## En resumen

- Antes de escribir SQL define cuatro cosas: la pregunta, las tablas, las filas y la forma del resultado.
- Las métricas de negocio necesitan una definición explícita de estado, fechas y moneda.
- Confirmar esa definición con quien pide el dato ahorra tiempo y evita entregar el número equivocado.
`,
  },
];
