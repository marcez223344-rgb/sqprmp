import type { QuestionDef } from "../schemas/question";

const section = "sql-con-ia";
const l1 = "ia-como-pedir-sql";
const l2 = "ia-varias-tablas-y-supuestos";
const l3 = "ia-verificar-antes-de-entregar";
const l4 = "ia-dialectos-e-invenciones";
const l5 = "ia-otros-usos-y-uso-responsable";

export const questions: QuestionDef[] = [
  {
    slug: "ia-q01-el-mejor-pedido",
    section,
    lesson: l1,
    type: "single",
    difficulty: "intermediate",
    topic: "Elegir el pedido más completo para una IA",
    tags: ["prompt", "contexto", "dialecto"],
    estimated_seconds: 75,
    prompt_md:
      "Necesitas la cantidad de pedidos entregados por canal en agosto de 2025, en la base de TiendaViva. ¿Cuál de estos pedidos a un asistente de IA tiene más probabilidades de producir una consulta correcta que puedas ejecutar sin cambios?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "«Uso PostgreSQL 18. Tabla `orders` (una fila por pedido): `status` (texto, por ejemplo 'delivered'), `created_at` (timestamptz, en UTC) y `channel` (texto). Quiero la cantidad de pedidos con `status = 'delivered'` de agosto de 2025, en UTC, por canal. Resultado: columnas `canal` y `pedidos`, ordenado por `pedidos` de mayor a menor.»",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "«Dame una consulta SQL con los pedidos por canal del mes pasado.»",
        is_correct: false,
        why_incorrect_md:
          "No dice el motor, ni las tablas, ni qué es un pedido válido. Además, «el mes pasado» depende del día en que se ejecute la consulta: la IA va a usar la fecha actual y no agosto de 2025.",
      },
      {
        key: "c",
        body_md:
          "«Escribe `SELECT channel, count(*) FROM orders GROUP BY channel` pero filtrado por agosto y por entregados.»",
        is_correct: false,
        why_incorrect_md:
          "Dicta una parte del SQL en lugar de describir el resultado, y deja sin definir lo que más importa: el motor, cómo se llama la columna de estado y en qué zona horaria se corta agosto.",
      },
      {
        key: "d",
        body_md:
          "«Aquí van 50 filas de la tabla `orders` copiadas de la base: [...]. Con esto, dime cuántos pedidos entregados hubo por canal en agosto.»",
        is_correct: false,
        why_incorrect_md:
          "Pegar filas no reemplaza al esquema y, en una empresa real, puede exponer datos de clientes. Tampoco dice el motor ni el formato de salida.",
      },
    ],
    explanation_md:
      "Un buen pedido tiene objetivo, contexto (tablas, columnas con su tipo y sus valores posibles, y el motor) y un resultado esperado descrito como columnas de salida. La línea «Uso PostgreSQL 18» evita la sintaxis de otros motores, y «en UTC» evita que la IA decida por su cuenta dónde empieza y termina el mes.",
    is_published: true,
  },
  {
    slug: "ia-q02-que-va-en-el-contexto",
    section,
    lesson: l1,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Qué información forma parte del contexto",
    tags: ["prompt", "contexto", "esquema"],
    estimated_seconds: 75,
    prompt_md:
      "Vas a pedirle a una IA una consulta que une `orders` con `customers`. ¿Qué elementos conviene incluir en el pedido? Marca todas las opciones correctas.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Los nombres de las tablas y qué representa una fila de cada una.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "La columna que une las dos tablas: `orders.customer_id` apunta a `customers.id`.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "Las columnas que esperas en el resultado, con sus encabezados.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "El motor: «Uso PostgreSQL 18».",
        is_correct: true,
      },
      {
        key: "e",
        body_md:
          "El usuario y la contraseña de la base, para que la IA pueda consultar las tablas por su cuenta.",
        is_correct: false,
        why_incorrect_md:
          "Para escribir la consulta, la IA necesita el esquema, no acceso a la base. Una credencial compartida con una herramienta externa da acceso a todos los datos, y nunca se pega en un chat.",
      },
    ],
    explanation_md:
      "Con las tablas, la columna de unión, el resultado esperado y el motor, la IA tiene lo que necesita para escribir la consulta. Lo que nunca va en el pedido son credenciales ni datos reales de personas: si hace falta mostrar un ejemplo, se inventan valores con la misma forma que los reales.",
    is_published: true,
  },
  {
    slug: "ia-q03-cual-respuesta-es-correcta",
    section,
    lesson: l2,
    type: "scenario",
    difficulty: "advanced",
    topic: "Elegir la respuesta correcta entre tres propuestas de IA",
    tags: ["left_join", "count", "supuestos"],
    estimated_seconds: 120,
    prompt_md:
      "Pediste: «todos los clientes de TiendaViva con su cantidad de pedidos cuyo `status` es igual al texto `'delivered'`; los que no tienen ninguno, con 0». Probaste el mismo pedido tres veces y recibiste tres respuestas distintas. ¿Cuál cumple el pedido?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "```sql\nSELECT c.id, count(o.id) AS entregados\nFROM customers AS c\nLEFT JOIN orders AS o\n  ON o.customer_id = c.id AND o.status = 'delivered'\nGROUP BY c.id;\n```",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "```sql\nSELECT c.id, count(o.id) AS entregados\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.id\nWHERE o.status = 'delivered'\nGROUP BY c.id;\n```",
        is_correct: false,
        why_incorrect_md:
          "La condición sobre `orders` está en el `WHERE`. Los clientes sin pedidos llegan con `o.status` en NULL, la condición no es verdadera y esas filas se descartan: el `LEFT JOIN` termina funcionando como un `INNER JOIN` y los ceros desaparecen.",
      },
      {
        key: "c",
        body_md:
          "```sql\nSELECT c.id, count(*) AS entregados\nFROM customers AS c\nLEFT JOIN orders AS o\n  ON o.customer_id = c.id AND o.status = 'delivered'\nGROUP BY c.id;\n```",
        is_correct: false,
        why_incorrect_md:
          "`count(*)` cuenta filas, y un cliente sin pedidos entregados sigue siendo una fila con las columnas de `orders` en NULL. Esos clientes aparecen con 1 en lugar de 0.",
      },
    ],
    explanation_md:
      "Las tres respuestas se ejecutan sin error y tienen la misma forma, y por eso hay que leerlas línea por línea. La correcta combina dos decisiones: la condición sobre la tabla opcional va en el `ON`, y se cuenta una columna de esa tabla con `count(o.id)`, que ignora los NULL. Que la IA dé tres respuestas distintas al mismo pedido es otra razón para verificar siempre con datos.",
    is_published: true,
  },
  {
    slug: "ia-q04-ifnull-y-date-format",
    section,
    lesson: l4,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Funciones de MySQL en PostgreSQL",
    tags: ["dialecto", "mysql", "coalesce", "to_char"],
    estimated_seconds: 75,
    prompt_md:
      "Una IA te dio esta consulta. Al ejecutarla en PostgreSQL 18 aparece el error `function date_format(timestamp with time zone, unknown) does not exist`. ¿Cuál es la causa y cómo se corrige?",
    code_md:
      "SELECT DATE_FORMAT(created_at, '%Y-%m') AS mes,\n       SUM(IFNULL(discount, 0)) AS descuento\nFROM orders\nGROUP BY mes;",
    options: [
      {
        key: "a",
        body_md:
          "La consulta está escrita en el dialecto de MySQL. Hay que reemplazar `DATE_FORMAT(created_at, '%Y-%m')` por `to_char(created_at, 'YYYY-MM')` e `IFNULL` por `coalesce`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Falta convertir `created_at` a texto con `created_at::text` antes de pasarlo a `DATE_FORMAT`.",
        is_correct: false,
        why_incorrect_md:
          "El problema no es el tipo del argumento: `DATE_FORMAT` no existe en PostgreSQL con ningún tipo. Convertir a texto solo cambia el mensaje de error.",
      },
      {
        key: "c",
        body_md: "Hay que reemplazar solo `DATE_FORMAT`; `IFNULL` sí existe en PostgreSQL.",
        is_correct: false,
        why_incorrect_md:
          "`IFNULL` tampoco existe en PostgreSQL. El motor informa un error por vez, así que después de corregir `DATE_FORMAT` aparecería `function ifnull(numeric, integer) does not exist`.",
      },
      {
        key: "d",
        body_md: "El `GROUP BY mes` es inválido: PostgreSQL no acepta alias en el `GROUP BY`.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL sí acepta en el `GROUP BY` el nombre de una columna de salida. El error que muestra el motor habla de la función, no de la agrupación.",
      },
    ],
    explanation_md:
      "Cuando el mensaje dice que una función no existe y el nombre es de otro motor, el problema es el dialecto. Conviene revisar toda la consulta de una vez, porque PostgreSQL se detiene en el primer error y no avisa de los siguientes. Y ojo con el patrón: `to_char` usa `'YYYY-MM'`, no `'%Y-%m'`.",
    is_published: true,
  },
  {
    slug: "ia-q05-equivalencias-de-dialecto",
    section,
    lesson: l4,
    type: "matching",
    difficulty: "intermediate",
    topic: "Equivalencias de MySQL y SQL Server en PostgreSQL",
    tags: ["dialecto", "mysql", "sql_server"],
    estimated_seconds: 90,
    prompt_md:
      "Relaciona cada construcción de MySQL o de SQL Server con su equivalente en PostgreSQL.",
    code_md: null,
    pairs: [
      { left: "IFNULL(x, 0), de MySQL", right: "coalesce(x, 0)" },
      { left: "SELECT TOP 10 ..., de SQL Server", right: "... LIMIT 10, al final de la consulta" },
      { left: "DATE_FORMAT(fecha, '%Y-%m'), de MySQL", right: "to_char(fecha, 'YYYY-MM')" },
      { left: "GETDATE(), de SQL Server", right: "now()" },
      {
        left: "Nombres entre acentos graves, de MySQL",
        right: "Nombres sin comillas o entre comillas dobles",
      },
    ],
    explanation_md:
      "Las cinco aparecen a menudo en respuestas de IA cuando el pedido no dice qué motor usas. `coalesce` es parte del estándar de SQL y funciona igual en MySQL, SQL Server y PostgreSQL, así que conviene preferirla a `IFNULL` o `ISNULL`. Para limitar filas no hay una forma única en los tres motores: `LIMIT` funciona en PostgreSQL y MySQL, y SQL Server usa `TOP`.",
    is_published: true,
  },
  {
    slug: "ia-q06-la-ia-no-se-audita-sola",
    section,
    lesson: l3,
    type: "true_false",
    difficulty: "intermediate",
    topic: "Por qué la misma IA no verifica su propia respuesta",
    tags: ["verificacion", "sesgo_de_confirmacion"],
    estimated_seconds: 45,
    prompt_md:
      "Preguntarle a la misma IA «¿esta consulta está bien?» es una verificación suficiente antes de entregar el resultado.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "La IA tiene el mismo contexto incompleto que cuando escribió la consulta y tiende a justificar su propia respuesta. Puede detectar un error de sintaxis, pero no sabe si el número es correcto.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "Es un caso de sesgo de confirmación: la tendencia a buscar argumentos que confirman lo que ya se cree. La verificación real es un dato calculado por otro camino, como una consulta de control más simple o un conteo de filas por paso, que coincide con el resultado.",
    is_published: true,
  },
  {
    slug: "ia-q07-ingreso-tras-unir-items",
    section,
    lesson: l3,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "Qué representa una suma después de un join 1:N",
    tags: ["grano", "join", "fan_out"],
    estimated_seconds: 90,
    prompt_md:
      "Una IA propuso esta consulta para el ingreso por canal. En TiendaViva, un pedido tiene entre una y cuatro filas en `order_items`. ¿Qué representa en realidad la columna `ingreso`?",
    code_md:
      "SELECT o.channel, sum(o.total_amount) AS ingreso\nFROM orders AS o\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nWHERE o.status = 'delivered'\nGROUP BY o.channel;",
    options: [
      {
        key: "a",
        body_md:
          "La suma de los totales de los pedidos, donde cada total se repite una vez por cada línea que tiene el pedido.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El ingreso correcto por canal, porque el join solo agrega columnas.",
        is_correct: false,
        why_incorrect_md:
          "Un join con una tabla que tiene varias filas por pedido también agrega filas: cada pedido aparece una vez por línea, y su total se suma esa misma cantidad de veces.",
      },
      {
        key: "c",
        body_md: "La suma del precio de cada línea (`quantity * unit_price`).",
        is_correct: false,
        why_incorrect_md:
          "La consulta suma `o.total_amount`, que es una columna del pedido, no de la línea. Para sumar líneas habría que usar las columnas de `order_items`.",
      },
      {
        key: "d",
        body_md: "El ingreso solo de los pedidos que tienen una única línea.",
        is_correct: false,
        why_incorrect_md:
          "El `INNER JOIN` conserva a todos los pedidos que tienen al menos una línea, no solo a los de una línea. Los de varias líneas entran, y entran repetidos.",
      },
    ],
    explanation_md:
      "Antes de sumar, pregúntate qué representa una fila. Después de este join, una fila es una línea de pedido, así que cualquier columna del pedido se repite. La corrección es agregar `order_items` por pedido antes de unir, o no unirla si la consulta no necesita ninguna de sus columnas.",
    is_published: true,
  },
  {
    slug: "ia-q08-rango-semiabierto",
    section,
    lesson: l3,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "El extremo final de un rango semiabierto",
    tags: ["fechas", "rango_semiabierto", "timestamptz"],
    estimated_seconds: 45,
    prompt_md:
      "Una IA filtró agosto con `BETWEEN '2025-08-01' AND '2025-08-31'` sobre una columna `timestamptz` (fecha y hora con zona horaria, parecido al `datetime` de otras bases de datos). Lo corriges con un rango semiabierto: `created_at >= '2025-08-01' AND created_at ___ '2025-09-01'`. ¿Qué operador completa el espacio? Escribe solo el operador.",
    code_md: null,
    answer: { accepted: ["<", "< '2025-09-01'"], case_sensitive: false },
    explanation_md:
      "El rango semiabierto incluye el inicio y excluye el fin. Con `<` entra todo el 31 de agosto, hasta la última fracción de segundo, y no entra nada del 1 de septiembre. Con `<=` entraría un movimiento registrado exactamente a las 00:00 del 1 de septiembre.",
    is_published: true,
  },
  {
    slug: "ia-q09-filas-de-clientes-en-una-ia",
    section,
    lesson: l5,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Datos personales y asistentes de IA públicos",
    tags: ["privacidad", "datos_personales", "anonimizar"],
    estimated_seconds: 90,
    prompt_md:
      "Un compañero quiere que la IA le ayude a escribir una consulta de segmentación. Propone pegar 200 filas de la tabla de clientes de la empresa, con correo y número de documento de identidad, «para que entienda bien los datos». La empresa no tiene una herramienta de IA aprobada. ¿Qué conviene hacer?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Pegar solo el esquema de la tabla (columnas y tipos) y, si hace falta un ejemplo, dos o tres filas con valores inventados que tengan la misma forma. Antes de usar la IA con información del trabajo, revisar la política de la empresa.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Pegar las 200 filas, pero borrar la conversación al terminar.",
        is_correct: false,
        why_incorrect_md:
          "Borrar la conversación no deshace el envío: los datos ya salieron de la empresa y llegaron a los servidores de otra. Y la IA no necesita filas reales para escribir SQL.",
      },
      {
        key: "c",
        body_md: "Pegar las filas quitando solo la columna del documento de identidad.",
        is_correct: false,
        why_incorrect_md:
          "El correo también identifica a una persona, igual que el nombre o el teléfono. Quitar una columna no anonimiza la fila.",
      },
      {
        key: "d",
        body_md: "Pegar 20 filas en lugar de 200, porque con menos datos el riesgo es menor.",
        is_correct: false,
        why_incorrect_md:
          "Exponer datos personales de 20 personas sigue siendo exponer datos personales. Con menos filas el problema no desaparece: los datos igual salen de la empresa.",
      },
    ],
    explanation_md:
      "Para escribir SQL, la IA necesita el esquema, no los datos. Los datos de personas (correos, documentos de identidad, sueldos, filas reales) no se pegan en una IA pública. Si hace falta un ejemplo, se anonimiza con valores inventados, y la política de la empresa sobre herramientas de IA manda sobre cualquier otra consideración.",
    is_published: true,
  },
  {
    slug: "ia-q10-senales-para-revisar",
    section,
    lesson: l3,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Señales de que un resultado necesita revisión",
    tags: ["verificacion", "conteos", "control"],
    estimated_seconds: 75,
    prompt_md:
      "Ejecutaste la consulta que te dio una IA. ¿Cuáles de estas situaciones son señales de que el resultado necesita revisión antes de entregarlo? Marca todas las opciones correctas.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "La cantidad de filas aumentó después de un join que esperabas que la mantuviera.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Un total es mayor que la cifra de referencia que conoce el área que lo pidió.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "La consulta devuelve cero filas para un período en el que sabes que hubo ventas.",
        is_correct: true,
      },
      {
        key: "d",
        body_md:
          "El resultado muestra exactamente tres filas por grupo cuando pediste «los tres primeros, con empates».",
        is_correct: true,
      },
      {
        key: "e",
        body_md: "La consulta usa alias con nombres largos, como `pedidos` o `clientes`.",
        is_correct: false,
        why_incorrect_md:
          "Los alias descriptivos facilitan la lectura y no cambian el resultado. No son una señal de error.",
      },
    ],
    explanation_md:
      "Filas que crecen tras un join, totales por encima de una referencia y resultados vacíos son las señales clásicas. La cuarta es más sutil: si pediste empates y siempre recibes exactamente tres filas por grupo, lo más probable es que la consulta use `row_number()`, que nunca empata. Una consulta con alias legibles, en cambio, es más fácil de revisar.",
    is_published: true,
  },
  {
    slug: "ia-q11-columna-inventada",
    section,
    lesson: l4,
    type: "single",
    difficulty: "intermediate",
    topic: "Qué hacer cuando la IA inventa una columna",
    tags: ["columnas_inventadas", "esquema", "errores"],
    estimated_seconds: 60,
    prompt_md:
      "La consulta de una IA falla con `column t.user_id does not exist` sobre la tabla `transactions` de Bolsillo. ¿Cuál es el mejor paso siguiente?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Revisar en el panel «Definiciones de tablas» cómo se llega de `transactions` a la persona usuaria y, si le pides la corrección a la IA, pegarle el error junto con las columnas reales de las tablas involucradas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Decirle a la IA «no funciona, corrígelo» y ejecutar lo que responda.",
        is_correct: false,
        why_incorrect_md:
          "Sin el esquema real, la IA vuelve a adivinar y lo más probable es que reemplace un nombre inventado por otro.",
      },
      {
        key: "c",
        body_md: "Cambiar `t.user_id` por `t.id`, que sí existe en la tabla.",
        is_correct: false,
        why_incorrect_md:
          "`t.id` identifica la transacción, no a la persona. La consulta se ejecutaría, pero uniría cada transacción con una persona equivocada.",
      },
      {
        key: "d",
        body_md: 'Envolver la columna en comillas dobles: `t."user_id"`.',
        is_correct: false,
        why_incorrect_md:
          "Las comillas dobles solo sirven para nombres que existen con mayúsculas o caracteres especiales. Una columna que no existe sigue sin existir entre comillas.",
      },
    ],
    explanation_md:
      "Los nombres reales salen del esquema, nunca de la memoria de la IA. En Bolsillo, la columna `account_id` de la tabla `transactions` apunta a la columna `id` de la tabla `accounts`, y la columna `user_id` de `accounts` apunta a la columna `id` de `users`: hacen falta dos joins. Y después de corregir, la consulta todavía necesita los controles de verificación.",
    is_published: true,
  },
  {
    slug: "ia-q12-prueba-tecnica-para-casa",
    section,
    lesson: l5,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Uso de IA en una prueba técnica para llevar a casa",
    tags: ["autoria", "entrevista", "uso_responsable"],
    estimated_seconds: 75,
    prompt_md:
      "Te envían una prueba técnica de SQL para resolver en tu casa en 48 horas. Las instrucciones dicen: «Puedes usar las herramientas que uses en tu trabajo diario; indica cuáles usaste». Resolviste parte de la prueba con ayuda de una IA. ¿Qué conviene hacer?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Entregar indicando que usaste una IA, para qué partes y cómo verificaste los resultados, y asegurarte de poder explicar cada consulta.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "No mencionarlo, porque las instrucciones permiten usar cualquier herramienta.",
        is_correct: false,
        why_incorrect_md:
          "Las instrucciones permiten las herramientas, pero también piden indicar cuáles usaste. Omitirlo incumple la regla, y suele notarse en la entrevista siguiente.",
      },
      {
        key: "c",
        body_md: "Reescribir las consultas con otros alias para que no parezcan de una IA.",
        is_correct: false,
        why_incorrect_md:
          "Disfrazar el origen no cambia el hecho y va contra lo que pidieron. Lo que la empresa quiere evaluar es tu criterio, no quién tipeó cada línea.",
      },
      {
        key: "d",
        body_md: "Entregar solo las partes que hiciste sin IA.",
        is_correct: false,
        why_incorrect_md:
          "La IA estaba permitida. Entregar una prueba incompleta por no usarla es perder puntos sin motivo.",
      },
    ],
    explanation_md:
      "Lee las reglas antes de empezar. Si permiten IA, decláralo y muestra cómo verificaste; si no la permiten, no la uses. En los dos casos, lo que entregas es tuyo: es habitual que en la entrevista siguiente te pidan explicar o modificar tus consultas en vivo.",
    is_published: true,
  },
];
