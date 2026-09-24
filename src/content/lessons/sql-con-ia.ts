import type { LessonDef } from "../schemas/curriculum";

const section = "sql-con-ia";

export const lessons: LessonDef[] = [
  {
    slug: "ia-como-pedir-sql",
    section,
    kind: "theory",
    title: "Cómo pedirle SQL a una IA",
    sort_order: 0,
    estimated_minutes: 12,
    is_free: true,
    is_published: true,
    prerequisites: [],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Hoy muchos analistas le piden consultas a un asistente de inteligencia artificial (IA), por ejemplo ChatGPT, Gemini o Claude. Bien usado, el asistente te ahorra tiempo en la parte mecánica de escribir SQL. Mal usado, te entrega una consulta que se ejecuta sin errores pero devuelve un número equivocado, y ese número termina en un informe con tu nombre.

En esta sección aprendes a hacer las dos cosas que el asistente no puede hacer por ti: darle el contexto que no tiene y demostrar con datos si su respuesta es correcta. Lo haces con tu propia cuenta del asistente que prefieras. Este curso no conecta ninguna IA y no envía tus consultas ni tus datos a ningún servicio de IA.

## Lo que la IA no sabe

Un asistente de IA funciona con un modelo de lenguaje, es decir, un programa entrenado con enormes cantidades de texto que genera la respuesta más probable para lo que le escribiste. No ve tu base de datos. No sabe cómo se llaman tus tablas ni tus columnas, qué significa «pedido válido» en tu empresa ni qué motor de base de datos usas.

Cuando le falta un dato, con frecuencia no lo pregunta: lo completa con un valor que suena razonable. Funciona como un colega nuevo muy rápido que nunca vio tu base: escribe bien, pero adivina todo lo que no le contaste.

## La receta en cinco pasos

1. **Objetivo.** Qué quieres saber y para qué. «Quiero saber qué canal de venta trae más pedidos entregados en México.»
2. **Contexto.** Las tablas, las columnas que importan, cómo se relacionan y el motor. Escribe siempre **«Uso PostgreSQL 18»**. El motor, también llamado dialecto, es la variante de SQL que entiende tu base de datos: MySQL, SQL Server y PostgreSQL comparten lo básico, pero cada uno tiene funciones propias, y si no lo dices la IA elige uno por su cuenta.
3. **Pedido claro.** Describe la tabla de resultado que esperas: qué columnas, con qué nombre, qué representa cada fila y en qué orden. No le dictes el SQL: descríbele el resultado.
4. **Revisar.** Lee la respuesta y pide explicaciones de lo que no entiendas: «explícame qué hace esta línea» o «¿por qué usaste \`INNER JOIN\` y no \`LEFT JOIN\`?».
5. **Seguir la conversación.** Si algo está mal, dilo con el dato concreto: «la columna \`user_id\` no existe en \`transactions\`; estas son las columnas reales». Cada mensaje corrige el anterior.

## Un pedido vago y uno completo

El pedido vago:

> Dame los pedidos por canal.

La IA tiene que adivinar qué cuenta como pedido, qué período, qué moneda y qué motor usas, y puede devolverte una consulta que se ejecuta pero responde otra pregunta.

El pedido completo:

> Trabajo con la base de un marketplace. Uso PostgreSQL 18. Responde solo con SQL válido para PostgreSQL.
> Tabla \`orders\` (una fila por pedido): \`id\`, \`status\` (texto, por ejemplo 'delivered' o 'cancelled'), \`created_at\` (timestamptz, en UTC), \`currency\` (código de moneda de tres letras) y \`channel\` (texto: 'app', 'web' o 'marketplace_partner').
> Pedido: cuántos pedidos con \`status = 'delivered'\` y \`currency = 'MXN'\` hubo en agosto de 2025, en UTC, por canal.
> Resultado esperado: columnas \`canal\` y \`pedidos\`, una fila por canal, ordenado por \`pedidos\` de mayor a menor.

Fíjate en tres detalles. Cada columna va con su tipo y, cuando es texto, con los valores posibles. \`timestamptz\` es el tipo de PostgreSQL para una marca de tiempo con zona horaria, es decir, un instante exacto con fecha y hora. El período dice en qué zona horaria se corta. UTC (por *Coordinated Universal Time*, su nombre en inglés) es la hora de referencia mundial: va tres horas adelantada respecto de Buenos Aires y seis respecto de Ciudad de México. Por eso «agosto» en UTC y «agosto» en la hora de México no incluyen los mismos pedidos. Y el resultado esperado describe las columnas de salida sin decir cómo escribir la consulta.

No hace falta pegar filas de datos: el esquema, es decir, la descripción de las tablas y de sus columnas, alcanza. La lección 5 explica por qué, además, es una cuestión de privacidad.

## Ejecuta la respuesta aquí

Una respuesta razonable a ese pedido es esta:

\`\`\`sql
SELECT channel AS canal, count(*) AS pedidos
FROM orders
WHERE status = 'delivered'
  AND currency = 'MXN'
  AND created_at >= '2025-08-01'
  AND created_at < '2025-09-01'
GROUP BY channel
ORDER BY pedidos DESC;
\`\`\`

Cópiala en el editor y ejecútala sobre TiendaViva. Ejecutarla es el primer control. Si da error, la IA usó algo que tu motor no entiende o un nombre de tabla o columna que no existe. Si se ejecuta, todavía tienes que comprobar que responda tu pregunta: eso practicas en las lecciones siguientes.

En los ejercicios de esta sección, el botón «Copiar contexto para tu IA» arma un texto parecido al pedido completo, con el esquema y el enunciado, sin datos reales ni la solución.

## Errores comunes

- Pedir sin decir el motor. La IA puede responder con sintaxis de MySQL o de SQL Server, que PostgreSQL no entiende.
- Copiar la respuesta en un informe sin ejecutarla ni revisarla.
- Corregir con un «está mal» sin decir qué está mal. La IA cambia algo al azar y el error puede seguir ahí.

## Resumen

1. La IA no ve tu base de datos: la calidad de su respuesta depende del contexto que le das.
2. Objetivo, contexto con «Uso PostgreSQL 18», un pedido que describe el resultado, revisión y conversación.
3. Toda respuesta se ejecuta y se revisa antes de usarla.
`,
  },
  {
    slug: "ia-varias-tablas-y-supuestos",
    section,
    kind: "theory",
    title: "Varias tablas y los supuestos de la IA",
    sort_order: 1,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["ia-como-pedir-sql"],
    dataset: "ritmo",
    body_md: `## Por qué importa

Con una sola tabla, la IA tiene poco para adivinar. Cuando la pregunta cruza varias tablas aparecen decisiones que cambian el resultado: qué tipo de join usar, qué pasa con las filas que no tienen pareja en la otra tabla y qué se cuenta. La IA toma esas decisiones por ti y con frecuencia no te avisa.

A eso lo llamamos un **supuesto silencioso**: una decisión que la consulta toma sin que nadie la haya pedido ni aprobado. Es como un presupuesto que llega con un ítem que no pediste: solo lo encuentras si lo lees línea por línea.

## Nombra las tablas y cómo se unen

Cuando el pedido involucra más de una tabla, el contexto necesita tres cosas de cada tabla: el nombre, qué representa una fila y las columnas que la unen con las demás. En Ritmo, la plataforma de música del curso, sería así:

> Tabla \`users\` (una fila por oyente): \`id\`, \`country\`.
> Tabla \`playlists\` (una fila por playlist): \`id\`, \`user_id\` (apunta a \`users.id\`), \`name\`.

La frase «\`user_id\` apunta a \`users.id\`» quiere decir que la columna \`user_id\` de la tabla \`playlists\` guarda el valor de la columna \`id\` de la tabla \`users\`, es decir, identifica a la persona dueña de la playlist. Sin esa frase, la IA tiene que deducir la relación por el nombre de las columnas, y a veces deduce mal.

## El supuesto del INNER JOIN

Si pides «la cantidad de oyentes y de playlists de cada país», puedes recibir algo así:

\`\`\`sql
SELECT u.country, count(DISTINCT u.id) AS oyentes, count(*) AS playlists
FROM users AS u
INNER JOIN playlists AS p ON p.user_id = u.id
GROUP BY u.country;
\`\`\`

La consulta se ejecuta y los números parecen razonables. Pero \`INNER JOIN\` conserva solo las filas que tienen pareja en las dos tablas, así que los oyentes sin ninguna playlist desaparecen del resultado. Mídelo antes de discutirlo:

\`\`\`sql
SELECT
  (SELECT count(*) FROM users) AS oyentes,
  (SELECT count(DISTINCT user_id) FROM playlists) AS oyentes_con_playlist;
\`\`\`

Ritmo tiene 5000 oyentes y solo 2010 tienen al menos una playlist. La consulta de la IA informa sobre menos de la mitad de los oyentes, y cualquier promedio de playlists por oyente que calcules con ella sale mucho más alto que el real. Nadie decidió excluir a quienes no tienen playlist: lo decidió el tipo de join.

Si el negocio quiere a todos los oyentes, la corrección tiene dos partes. Primero, \`LEFT JOIN\`, que conserva todas las filas de la tabla de la izquierda aunque no tengan pareja. Segundo, contar con \`count(p.id)\` en lugar de \`count(*)\`: con \`LEFT JOIN\`, un oyente sin playlists sigue siendo una fila, y \`count(*)\` la contaría como si fuera una playlist.

\`INNER JOIN\` no siempre está mal. Si la pregunta es «¿cuántas playlists tienen, en promedio, quienes ya crearon alguna?», es justo lo que corresponde. El problema no es el tipo de join: es que la decisión la tomó la IA y no tú.

## Otros supuestos que conviene escribir en el pedido

- **Grano**, es decir, qué representa cada fila del resultado: ¿una fila por oyente, por playlist o por país?
- **Empates:** si pides «los tres primeros», ¿qué pasa cuando dos empatan en el tercer lugar?
- **Zona horaria:** ¿«agosto» en UTC o en la hora local de cada país?
- **Universo**, es decir, qué filas entran en el análisis: ¿incluye cuentas dadas de baja, pedidos cancelados o pruebas internas?

Escribir cada uno cuesta una línea: «Incluye a los oyentes sin playlists, con 0» o «si hay empate en el tercer lugar, muéstralos a todos».

## Alias que se entienden

Las IA suelen usar alias de una letra (\`a\`, \`b\`, \`t1\`). Con tres o cuatro tablas, eso hace que la consulta sea difícil de revisar, porque tienes que volver al \`FROM\` cada vez que lees una columna. Pide «reescríbela con alias que digan qué es cada tabla». Es un pedido que no cuesta nada y te ahorra errores de lectura.

## Modo desafío

Cuando tengas que corregir una respuesta, pregúntate qué tendrías que haber escrito en el pedido para no tener que corregir nada. Reescribe el pedido con eso y vuelve a preguntar en una conversación nueva. Con práctica, tus pedidos se acercan tanto a la consulta final que la IA solo hace la parte mecánica.

## Errores comunes

- Aceptar un \`INNER JOIN\` sin preguntarte quién queda afuera del resultado.
- Cambiar \`INNER JOIN\` por \`LEFT JOIN\` y dejar \`count(*)\`, que cuenta como 1 a quien no tiene ninguna fila en la otra tabla.
- Pedir «por oyente» sin decir qué pasa con quienes no tienen datos.

## Resumen

1. Nombra cada tabla, qué representa una fila y las columnas que la unen con las demás.
2. El tipo de join es un supuesto: mide cuántas filas deja afuera antes de aceptarlo.
3. Escribe en el pedido el grano, los empates, la zona horaria y el universo.
`,
  },
  {
    slug: "ia-verificar-antes-de-entregar",
    section,
    kind: "theory",
    title: "Verificar la respuesta antes de entregarla",
    sort_order: 2,
    estimated_minutes: 15,
    is_free: false,
    is_published: true,
    prerequisites: ["ia-varias-tablas-y-supuestos", "depuracion-joins-que-multiplican"],
    dataset: "pidelo",
    body_md: `## Por qué importa

Una consulta que da error es un problema pequeño: lo ves y lo corriges. El problema grande es la consulta que se ejecuta, devuelve números que parecen razonables y está equivocada. Con una IA ese riesgo crece, porque escribe con seguridad y sin avisar sus supuestos.

Verificar significa demostrar con datos que el resultado responde la pregunta. Es la habilidad que califican los ejercicios de esta sección.

## Seis controles

1. **Filas en cada paso.** Ejecuta la consulta por partes: primero la tabla principal con sus filtros y después cada join. Anota cuántas filas quedan en cada paso. Si un join aumenta las filas cuando esperabas que se mantuvieran, algo se está multiplicando.
2. **Grano.** Pregúntate qué representa una fila del resultado y de cada paso intermedio. Si la respuesta es «una línea de pedido» y estás sumando el total del pedido, el total se repite.
3. **NULL.** Revisa qué columnas pueden estar vacías y qué hace la consulta con ellas. \`count(columna)\` y \`avg(columna)\` ignoran los NULL, y una comparación con NULL nunca es verdadera.
4. **Empates.** Si la consulta ordena y corta, con \`LIMIT\` o con \`row_number()\`, revisa qué pasa con las filas que empatan en el borde.
5. **Bordes de fecha.** Corta los períodos en UTC y con un rango semiabierto, es decir, que incluye el inicio y excluye el fin: \`>= '2025-08-01'\` y \`< '2025-09-01'\`. La IA escribe a menudo \`BETWEEN '2025-08-01' AND '2025-08-31'\`, que sobre una columna \`timestamptz\` deja afuera todo lo ocurrido el 31 después de la medianoche.
6. **Consulta de control.** Calcula el mismo total por un camino más simple, sin los joins ni las columnas extra. Las dos cifras tienen que coincidir.

## Un ejemplo: el join que duplica

El departamento Comercial de Pídelo pide el GMV de agosto de 2025 por ciudad. GMV es la sigla de *gross merchandise value*, el valor total de lo vendido; aquí es la suma de \`orders.total\`, la columna \`total\` de la tabla \`orders\`, de los pedidos entregados. También pide cuántas líneas de pedido hubo, y por eso la IA agrega la tabla \`order_items\`:

\`\`\`sql
SELECT c.name AS ciudad, count(oi.id) AS lineas, sum(o.total) AS gmv
FROM orders AS o
INNER JOIN restaurants AS r ON r.id = o.restaurant_id
INNER JOIN cities AS c ON c.id = r.city_id
INNER JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status = 'delivered'
  AND o.placed_at >= '2025-08-01'
  AND o.placed_at < '2025-09-01'
GROUP BY c.name;
\`\`\`

El control 1 lo detecta en una sola consulta:

\`\`\`sql
SELECT count(*) AS filas_tras_join, count(DISTINCT o.id) AS pedidos_distintos
FROM orders AS o
INNER JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status = 'delivered'
  AND o.placed_at >= '2025-08-01'
  AND o.placed_at < '2025-09-01';
\`\`\`

En agosto de 2025 hubo 1179 pedidos entregados, y el join con \`order_items\` los convierte en 2977 filas. Cada pedido aparece una vez por cada línea que tiene, así que \`sum(o.total)\` suma el total de cada pedido tantas veces como líneas tenga, y el GMV queda más que duplicado. Es el mismo problema que viste en la Sección 33, «Depuración de consultas», ahora escrito por otra persona.

El control 6 lo confirma: la misma consulta sin \`order_items\`, es decir, solo con \`orders\`, \`restaurants\` y \`cities\`, tiene que dar el mismo GMV en cada ciudad. No da lo mismo, así que el reporte no puede salir así.

La corrección es agregar cada tabla a su propio grano antes de unir: contar las líneas por pedido en una CTE (por *common table expression*, la consulta con nombre que se define en el \`WITH\`) y unir ese resultado, que tiene una fila por pedido.

## Por qué no alcanza con preguntarle a la IA

Preguntarle a la misma IA «¿esta consulta está bien?» no es verificar. La IA tiene el mismo contexto incompleto que cuando escribió la consulta, y tiende a justificar su propia respuesta. Es un caso de sesgo de confirmación, es decir, la tendencia a buscar argumentos que confirman lo que ya se cree. La IA puede ayudarte a leer la consulta o a encontrar un error de sintaxis, pero solo los datos demuestran que el número es correcto: una cifra calculada por otro camino que coincide.

## Errores comunes

- Mirar solo el resultado final y no las filas de cada paso.
- Creer que \`count(DISTINCT ...)\` arregla un total inflado: corrige el conteo, pero no la suma.
- Aceptar un rango con \`BETWEEN\` sobre marcas de tiempo porque «se ve bien».

## Resumen

1. Filas por paso, grano, NULL, empates, bordes de fecha y una consulta de control.
2. Si un join multiplica filas, agrega antes de unir.
3. La prueba es un número calculado por otro camino, no la opinión de la misma IA.
`,
  },
  {
    slug: "ia-dialectos-e-invenciones",
    section,
    kind: "theory",
    title: "Dialectos e invenciones",
    sort_order: 3,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["ia-como-pedir-sql"],
    dataset: "bolsillo",
    body_md: `## Por qué importa

Hay dos errores de la IA que sí producen un mensaje de error, y conviene reconocerlos al instante. El primero es escribir en otro dialecto de SQL, es decir, con funciones o sintaxis de otro motor, como MySQL o SQL Server. El segundo es inventar columnas o tablas con nombres que suenan correctos pero no existen en tu base. Los dos se corrigen rápido si sabes leer el mensaje y dónde buscar el nombre real.

## Equivalencias frecuentes

| Lo que escribe la IA | Motor de origen | En PostgreSQL |
| --- | --- | --- |
| \`IFNULL(x, 0)\` | MySQL | \`coalesce(x, 0)\` |
| \`ISNULL(x, 0)\` | SQL Server | \`coalesce(x, 0)\` |
| \`DATE_FORMAT(fecha, '%Y-%m')\` | MySQL | \`to_char(fecha, 'YYYY-MM')\` |
| \`SELECT TOP 10 ...\` | SQL Server | \`... LIMIT 10\`, al final de la consulta |
| \`\` \`orders\` \`\` (acentos graves) | MySQL | \`orders\`, sin comillas, o \`"orders"\` con comillas dobles |
| \`GETDATE()\` | SQL Server | \`now()\` |
| \`DATEDIFF(day, a, b)\` | SQL Server | \`b::date - a::date\`, que da la cantidad de días |

\`coalesce\` devuelve el primer valor que no es NULL de su lista, y es parte del estándar de SQL: funciona en los tres motores. Cuando la IA usa \`GETDATE()\` o \`now()\`, además, revisa el supuesto. «El mes pasado» calculado desde hoy no es «agosto de 2025»: si el pedido tiene fechas fijas, la consulta tiene que tener fechas fijas.

## Cómo reconocerlos en el mensaje

- **Sintaxis de otro motor** (acentos graves, \`TOP\`, \`ISNULL\`): el simulador responde que no pudo interpretar la consulta y te da la línea y la columna. Esa posición marca dónde empieza lo que PostgreSQL no entiende.
- **Función que no existe** (\`IFNULL\`, \`DATE_FORMAT\`, \`GETDATE\`): el motor responde algo como \`function ifnull(numeric, integer) does not exist\`, que significa «no existe una función con ese nombre para esos tipos de datos».
- **Un mensaje engañoso:** \`DATEDIFF(minute, a, b)\` produce \`column "minute" does not exist\`. PostgreSQL lee \`minute\` como el nombre de una columna. La causa real es el dialecto, no una columna faltante.
- **Columna inventada:** \`column t.user_id does not exist\`. **Tabla inventada:** \`relation "clientes" does not exist\`, porque PostgreSQL llama *relation* a las tablas.

## Columnas inventadas

La IA completa los nombres que no conoce con los que «deberían» existir. En Bolsillo, la billetera digital del curso, puede escribir \`transactions.user_id\`, porque suena lógico que cada transacción tenga una persona. Pero en este esquema una transacción pertenece a una cuenta y la cuenta pertenece a una persona:

- \`transactions.account_id\` es la columna \`account_id\` de la tabla \`transactions\`, y apunta a la columna \`id\` de la tabla \`accounts\`.
- \`accounts.user_id\` es la columna \`user_id\` de la tabla \`accounts\`, y apunta a la columna \`id\` de la tabla \`users\`.

Una persona puede tener varias cuentas, una por moneda, y por eso el camino tiene dos pasos. La corrección no se adivina: sale del panel «Definiciones de tablas», que muestra los nombres exactos de cada tabla y columna.

\`\`\`sql
SELECT u.country, count(*) AS retiros
FROM transactions AS t
INNER JOIN accounts AS a ON a.id = t.account_id
INNER JOIN users AS u ON u.id = a.user_id
WHERE t.kind = 'withdrawal'
  AND t.status = 'completed'
GROUP BY u.country
ORDER BY u.country;
\`\`\`

Lo mismo pasa con nombres parecidos: la IA puede escribir \`merchants.online\` cuando la columna real se llama \`is_online\`. Un error de una palabra alcanza para que la consulta no se ejecute.

## Devolverle el error a la IA

Si prefieres que la IA corrija, dale lo que le faltaba. Pega el mensaje exacto y el esquema real de las tablas involucradas:

> PostgreSQL responde: column t.user_id does not exist. Estas son las columnas reales: transactions(id, account_id, kind, status, created_at, merchant_id) y accounts(id, user_id, currency). Corrige la consulta usando solo estas columnas.

Un «no funciona» sin más datos la obliga a adivinar otra vez. Y después de la corrección, la consulta sigue necesitando los controles de la lección anterior: que se ejecute no significa que el resultado sea correcto.

## Errores comunes

- Reemplazar \`IFNULL\` por \`coalesce\` y no revisar el resto de la consulta, que puede tener más construcciones de otro dialecto.
- Traducir \`GETDATE()\` a \`now()\` sin notar que el pedido tenía fechas fijas.
- Corregir una columna inventada por otra columna inventada, en lugar de buscar el nombre en el esquema.

## Resumen

1. Di siempre «Uso PostgreSQL 18»; si igual llega otro dialecto, usa la tabla de equivalencias.
2. Lee el mensaje: no pudo interpretar la consulta, la función no existe o la columna no existe.
3. Los nombres reales salen del esquema, nunca de la memoria de la IA.
`,
  },
  {
    slug: "ia-otros-usos-y-uso-responsable",
    section,
    kind: "theory",
    title: "Otros usos y uso responsable",
    sort_order: 4,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["ia-como-pedir-sql"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Pedir consultas no es lo único para lo que sirve una IA en el trabajo con datos. También te ayuda a entender consultas ajenas y a pensar qué preguntas hacerle a una base. Y en cualquier uso hay límites que no dependen de la herramienta: qué datos puedes compartir y quién responde por el resultado.

## Explicar una consulta existente

Heredar una consulta larga de otra persona es habitual. Pégala y pide: «explícamela paso a paso, en español simple, y dime qué representa una fila en cada paso». Por ejemplo, esta consulta de TiendaViva:

\`\`\`sql
WITH por_cliente AS (
  SELECT customer_id, count(*) AS pedidos
  FROM orders
  WHERE status = 'delivered'
  GROUP BY customer_id
)
SELECT pedidos, count(*) AS clientes
FROM por_cliente
GROUP BY pedidos
ORDER BY pedidos;
\`\`\`

Una buena explicación dice que primero se cuentan los pedidos entregados de cada cliente y después se cuenta cuántos clientes tienen 1, 2, 3 o más pedidos. Pero la explicación también puede tener errores. Verifícala ejecutando la CTE sola, es decir, solo la consulta con nombre del \`WITH\`, y comprobando que devuelve una fila por cliente.

## Pensar ideas de análisis

Describe el dataset con su esquema y pide ideas: «Tengo estas tablas de un marketplace. Proponme cinco preguntas de negocio que se puedan responder con ellas». La IA es buena para abrir opciones. Tú eliges cuáles importan para tu área, defines cada métrica y verificas cada consulta con los controles de la lección 3.

## Qué nunca se comparte

Cuando pegas algo en un asistente de IA público, ese texto sale de tu empresa y puede quedar guardado en los servidores de otra. Por eso, en el trabajo, nunca pegues:

- Correos electrónicos, teléfonos o direcciones de clientes.
- Documentos de identidad, como el DNI en Argentina y Perú, el CPF en Brasil, el RUT en Chile o la CURP en México.
- Sueldos, saldos o cualquier dato financiero de personas.
- Filas reales de tablas con datos de clientes, aunque sean «solo unas pocas».
- Contraseñas, claves de acceso o cadenas de conexión a la base.

Para escribir SQL, la IA necesita el esquema, no los datos. Si hace falta un ejemplo, anonimiza, es decir, reemplaza los valores reales por valores inventados que tengan la misma forma: \`ana.perez@ejemplo.lat\` en lugar del correo real y \`12345678\` en lugar del documento.

La mayoría de los países de la región tiene leyes de protección de datos personales, y muchas empresas tienen su propia política sobre qué herramientas de IA se pueden usar. Algunas prohíben las públicas y ofrecen una aprobada. Esa política manda sobre cualquier consejo de este curso: consúltala antes de usar una IA con información de tu trabajo.

## Quién es el autor

En el trabajo, la consulta es tuya aunque la haya escrito una IA. Si el número está mal, nadie va a preguntar qué herramienta usaste: van a preguntar por qué no lo verificaste. Por eso conviene poder explicar cada línea de lo que entregas.

En una prueba técnica para llevar a casa, lee las reglas antes de empezar. Si permiten usar IA, dilo y cuenta cómo la usaste y cómo verificaste el resultado. Si no la permiten, no la uses. En la entrevista siguiente es habitual que te pidan explicar o modificar tu consulta en vivo, y ahí se nota si la entiendes.

## Errores comunes

- Pegar filas reales «para que la IA entienda mejor». El esquema alcanza.
- Aceptar la explicación de una consulta sin comprobarla contra los datos.
- Entregar una prueba técnica hecha con IA sin decirlo cuando las reglas pedían declararlo.

## Resumen

1. La IA también sirve para explicar consultas y proponer preguntas; ambas cosas se verifican.
2. Comparte el esquema, nunca datos de personas; anonimiza y sigue la política de tu empresa.
3. Lo que entregas es tuyo: tienes que poder explicarlo.

## Próximos pasos

**Lo que ya puedes hacer:** Pedirle SQL a una IA con contexto completo, detectar sus supuestos, corregir dialectos y columnas inventadas, y demostrar con datos si la respuesta es correcta.

**Antes de seguir:** resuelve los ejercicios, el desafío y el quiz de esta sección.

**Lo que sigue:** Sección 40 · Proyectos finales (capstone). Vas a hacer un análisis completo de punta a punta para tu portafolio, y puedes usar tu IA con este mismo método.

**Para practicar (opcional):** ¿Qué artista de Ritmo sumó más seguidores nuevos (tabla \`follows\`) en agosto de 2025, en UTC? Pídele la consulta a tu IA y verifícala con un conteo aparte.
`,
  },
];
