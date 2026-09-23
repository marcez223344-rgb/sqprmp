import type { QuestionDef } from "../schemas/question";

const section = "desafios-de-entrevista";
const l1 = "entrevista-patrones-clasicos";
const l2 = "entrevista-como-razonar-en-voz-alta";
const l3 = "entrevista-errores-que-cuestan-la-oferta";

export const questions: QuestionDef[] = [
  {
    slug: "entrevista-q01-segundo-valor-mas-alto",
    section,
    lesson: l1,
    type: "single",
    difficulty: "intermediate",
    topic: "El segundo valor más alto con empates",
    tags: ["ranking", "dense_rank", "empates"],
    estimated_seconds: 60,
    prompt_md:
      "En una entrevista te piden «el segundo salario más alto de cada área, mostrando a todas las personas que lo tengan». Varias áreas tienen dos personas empatadas en el salario más alto. ¿Qué función de ranking responde exactamente esa pregunta?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "`dense_rank()` sobre el salario descendente, filtrando el valor 2.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`rank()` sobre el salario descendente, filtrando el valor 2.",
        is_correct: false,
        why_incorrect_md:
          "`rank()` deja huecos: si dos personas empatan en el primer lugar, el puesto siguiente es 3 y esas áreas desaparecen del resultado sin ningún aviso.",
      },
      {
        key: "c",
        body_md: "`row_number()` sobre el salario descendente, filtrando el valor 2.",
        is_correct: false,
        why_incorrect_md:
          "`row_number()` devuelve exactamente una fila por área y elige entre empatados de forma arbitraria, así que oculta justo a las personas que te pidieron mostrar.",
      },
      {
        key: "d",
        body_md: "`ORDER BY salario DESC` con `LIMIT 1 OFFSET 1` dentro de cada área.",
        is_correct: false,
        why_incorrect_md:
          "`LIMIT`/`OFFSET` operan sobre el resultado completo, no por área, y aunque los aplicaras por grupo devolverían una sola fila, sin los empatados.",
      },
    ],
    explanation_md:
      "«Segundo valor» casi siempre significa **segundo valor distinto**, y eso es lo que numera `dense_rank()`. La pregunta que conviene hacerle al entrevistador antes de escribir es precisamente esa: «¿segundo puesto o segundo monto distinto, y quieres ver a los empatados?». La respuesta cambia la función, no la estructura de la consulta.",
    is_published: true,
  },
  {
    slug: "entrevista-q02-not-in-con-nulos",
    section,
    lesson: l3,
    type: "true_false",
    difficulty: "intermediate",
    topic: "NOT IN con una subconsulta que devuelve NULL",
    tags: ["null", "not_in", "antiunion"],
    estimated_seconds: 45,
    prompt_md:
      "`SELECT * FROM couriers WHERE id NOT IN (SELECT courier_id FROM orders);` devuelve cero filas si `orders.courier_id` contiene algún NULL, aunque existan repartidores sin pedidos.",
    code_md: null,
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "`id NOT IN (1, 7, NULL)` equivale a `id <> 1 AND id <> 7 AND id <> NULL`. La última comparación es desconocida, así que la condición nunca llega a ser verdadera y ninguna fila pasa el filtro.",
      },
    ],
    explanation_md:
      "Es la trampa más frecuente de las entrevistas de SQL, y lo peligroso es que **no produce un error**: produce una tabla vacía, que se puede confundir con «no hay casos». Las dos salidas son `NOT EXISTS` (que trata el nulo como ausencia de coincidencia) o agregar `WHERE courier_id IS NOT NULL` dentro de la subconsulta.",
    is_published: true,
  },
  {
    slug: "entrevista-q03-filtro-en-where-de-left-join",
    section,
    lesson: l3,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Filtrar la tabla opcional de un LEFT JOIN",
    tags: ["left_join", "where", "null"],
    estimated_seconds: 75,
    prompt_md:
      "El pedido era: «todos los comercios, con la cantidad de transacciones marcadas de 2025; los que no tienen, con cero». La consulta devuelve solo 51 filas de 300 comercios. ¿Qué la rompe?",
    code_md:
      "SELECT m.id, m.name, count(t.id) AS marcadas\nFROM merchants AS m\nLEFT JOIN transactions AS t ON t.merchant_id = m.id\nWHERE t.is_flagged\n  AND t.created_at >= timestamptz '2025-01-01 00:00:00+00'\nGROUP BY m.id, m.name;",
    options: [
      {
        key: "a",
        body_md:
          "Las condiciones sobre `transactions` están en el `WHERE`: descartan las filas sin coincidencia y el `LEFT JOIN` termina comportándose como un `INNER JOIN`. Deben ir en el `ON`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta `coalesce(count(t.id), 0)` para que los comercios sin alertas muestren 0.",
        is_correct: false,
        why_incorrect_md:
          "`count()` nunca devuelve NULL: sobre un grupo sin valores devuelve 0. El problema es que esos comercios ni siquiera llegan al `GROUP BY`.",
      },
      {
        key: "c",
        body_md:
          "`count(t.id)` debería ser `count(*)` para contar también los comercios sin alertas.",
        is_correct: false,
        why_incorrect_md:
          "Al revés: `count(*)` contaría la fila del comercio aunque no tenga transacción y devolvería 1 donde corresponde 0. `count(t.id)` es la forma correcta.",
      },
      {
        key: "d",
        body_md: "El `GROUP BY` debería incluir `t.merchant_id` para no perder comercios.",
        is_correct: false,
        why_incorrect_md:
          "Agrupar por una columna de la tabla opcional no recupera ninguna fila; solo agregaría un nulo más al resultado.",
      },
    ],
    explanation_md:
      "En un `LEFT JOIN`, las filas sin coincidencia llegan con todas las columnas de la tabla derecha en `NULL`. Cualquier condición sobre esa tabla en el `WHERE` evalúa a desconocido y las elimina. Regla práctica: **condiciones sobre la tabla opcional → `ON`; condiciones sobre la tabla obligatoria → `WHERE`**.",
    is_published: true,
  },
  {
    slug: "entrevista-q04-count-estrella-tras-left-join",
    section,
    lesson: l3,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "count(*) frente a count(columna) tras un LEFT JOIN",
    tags: ["count", "left_join", "null"],
    estimated_seconds: 60,
    prompt_md:
      "El comercio 77 no tiene ninguna transacción marcada en 2025. ¿Qué devuelve esta consulta en su fila?",
    code_md:
      "SELECT m.id, count(*) AS marcadas\nFROM merchants AS m\nLEFT JOIN transactions AS t\n  ON t.merchant_id = m.id\n AND t.is_flagged\n AND t.created_at >= timestamptz '2025-01-01 00:00:00+00'\nGROUP BY m.id;",
    options: [
      { key: "a", body_md: "`marcadas = 1`", is_correct: true },
      {
        key: "b",
        body_md: "`marcadas = 0`",
        is_correct: false,
        why_incorrect_md:
          "Ese sería el resultado de `count(t.id)`, que ignora los nulos. `count(*)` cuenta filas, y el comercio 77 aporta una fila con las columnas de `transactions` en NULL.",
      },
      {
        key: "c",
        body_md: "`marcadas = NULL`",
        is_correct: false,
        why_incorrect_md:
          "`count()` nunca devuelve NULL: como mínimo devuelve 0. El nulo aparecería con `sum()`, no con `count()`.",
      },
      {
        key: "d",
        body_md: "El comercio 77 no aparece en el resultado.",
        is_correct: false,
        why_incorrect_md:
          "Las condiciones están en el `ON`, así que el `LEFT JOIN` conserva la fila del comercio; lo que cambia es el valor que informa el conteo.",
      },
    ],
    explanation_md:
      "El `LEFT JOIN` está bien escrito (el filtro vive en el `ON`), pero `count(*)` cuenta filas y la fila sin coincidencia también cuenta: todos los comercios sin alertas informarían 1. `count(t.id)` cuenta solo valores no nulos y devuelve el 0 correcto. Son dos errores independientes y en una entrevista se cometen juntos con frecuencia.",
    is_published: true,
  },
  {
    slug: "entrevista-q05-antiunion-palabra-clave",
    section,
    lesson: l3,
    type: "fill_blank",
    difficulty: "easy",
    topic: "La antiunión segura ante nulos",
    tags: ["not_exists", "antiunion", "null"],
    estimated_seconds: 40,
    prompt_md:
      "Completa el operador que hace segura la antiunión cuando la subconsulta puede devolver nulos:\n\n`SELECT * FROM couriers AS c WHERE ______ (SELECT 1 FROM orders AS o WHERE o.courier_id = c.id);`\n\nEscribe las dos palabras.",
    code_md: null,
    answer: { accepted: ["NOT EXISTS", "not exists"], case_sensitive: false },
    explanation_md:
      "`NOT EXISTS` pregunta si la subconsulta devuelve **alguna** fila, no compara valores, así que un nulo simplemente no coincide y no contamina el resultado. Es la forma preferida para antiuniones en PostgreSQL y además suele planificarse igual o mejor que `NOT IN`.",
    is_published: true,
  },
  {
    slug: "entrevista-q06-patron-y-tecnica",
    section,
    lesson: l1,
    type: "matching",
    difficulty: "intermediate",
    topic: "Reconocer el patrón detrás del enunciado",
    tags: ["patrones", "ventanas", "diagnostico"],
    estimated_seconds: 110,
    prompt_md:
      "Relaciona cada pedido típico de entrevista con la técnica que lo resuelve de forma natural.",
    code_md: null,
    pairs: [
      {
        left: "Las 3 canciones más escuchadas de cada género",
        right: "row_number() con PARTITION BY y filtro en una capa externa",
      },
      {
        left: "La racha más larga de días consecutivos con actividad",
        right: "Brechas e islas: fecha menos su número de fila",
      },
      {
        left: "La misma canción reproducida tres veces seguidas",
        right: "lag(columna) y lag(columna, 2) sobre una ventana ordenada por tiempo",
      },
      {
        left: "Qué vendedores explican el 50 % de la facturación",
        right: "Total acumulado con sum(...) OVER (ORDER BY ...) y un corte sobre el total",
      },
      {
        left: "Clientes registrados dos veces con el mismo correo",
        right: "GROUP BY sobre la clave normalizada con HAVING count(*) > 1",
      },
      {
        left: "Repartidores que no tomaron ningún pedido en agosto",
        right: "NOT EXISTS correlacionado con el rango dentro de la subconsulta",
      },
    ],
    explanation_md:
      "Casi toda pregunta de entrevista es una variante de estos patrones con otros nombres de tablas. Nombrar el patrón en voz alta antes de escribir la primera línea es parte de la respuesta: le muestra al entrevistador que reconoces la forma del problema y le da la oportunidad de corregir el rumbo temprano.",
    is_published: true,
  },
  {
    slug: "entrevista-q07-pedido-ambiguo",
    section,
    lesson: l2,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Qué hacer con un enunciado ambiguo",
    tags: ["supuestos", "comunicacion", "entrevista"],
    estimated_seconds: 70,
    prompt_md:
      "El entrevistador dice: «dame los clientes activos del último mes». No aclara qué significa activo, qué mes ni qué zona horaria. Quedan 20 minutos. ¿Cuál es la mejor jugada?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Proponer una definición concreta en voz alta («activo = al menos un pedido entregado; último mes = los 30 días previos al corte, en UTC»), confirmar que le sirve y escribir sobre esa base.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Escribir la consulta con la interpretación que te parezca más probable y aclarar los supuestos al final, si queda tiempo.",
        is_correct: false,
        why_incorrect_md:
          "Un supuesto callado se lee como un error. Si la interpretación no era la esperada, pierdes los 20 minutos y el entrevistador no puede saber si fue un descuido o una decisión.",
      },
      {
        key: "c",
        body_md:
          "Pedir que te aclare las tres cosas y esperar la respuesta antes de tocar el teclado.",
        is_correct: false,
        why_incorrect_md:
          "Preguntar está bien, pero delegarle todas las definiciones no muestra criterio. Muchas entrevistas dejan la ambigüedad a propósito para ver si propones una definición razonable.",
      },
      {
        key: "d",
        body_md:
          "Entregar tres consultas, una por cada interpretación posible, para cubrir todos los casos.",
        is_correct: false,
        why_incorrect_md:
          "Triplica el trabajo bajo presión y evita la decisión, que es justamente lo que se evalúa. En el trabajo real tampoco se entregan tres reportes para que el negocio elija.",
      },
    ],
    explanation_md:
      "La ambigüedad es parte del ejercicio. La respuesta profesional es proponer una definición, decirla, confirmarla en una frase y dejarla escrita como comentario o en la explicación del resultado. Así, si la definición era otra, el cambio se limita a una línea del `WHERE` y no a rehacer el análisis.",
    is_published: true,
  },
  {
    slug: "entrevista-q08-brechas-e-islas",
    section,
    lesson: l1,
    type: "multiple",
    difficulty: "advanced",
    topic: "El truco de brechas e islas",
    tags: ["gaps_and_islands", "window_function", "fechas"],
    estimated_seconds: 100,
    prompt_md:
      "Para medir rachas de días consecutivos se usa `dia - (row_number() OVER (PARTITION BY user_id ORDER BY dia))::int AS grupo`. ¿Qué afirmaciones sobre esa expresión son correctas? (Marca todas las que correspondan.)",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Devuelve el mismo valor para todos los días de una racha, porque la fecha y el número de fila avanzan de a uno.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Exige que antes se reduzca el detalle a días distintos por usuario; si hay varias filas del mismo día, la numeración deja de coincidir con el calendario.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "El valor de `grupo` no tiene significado propio: sirve únicamente como identificador de la isla para agrupar después.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "El valor de `grupo` indica cuántos días dura la racha.",
        is_correct: false,
        why_incorrect_md:
          "El largo se obtiene después, con `count(*)` al agrupar por `user_id` y `grupo`. El valor en sí es una fecha desplazada, sin interpretación de negocio.",
      },
      {
        key: "e",
        body_md:
          "Funciona igual sin `PARTITION BY user_id`, porque la resta ya separa a cada usuario.",
        is_correct: false,
        why_incorrect_md:
          "Sin `PARTITION BY`, `row_number()` numera todo el conjunto y mezcla usuarios: dos personas con actividad en días cercanos pueden caer en la misma isla.",
      },
    ],
    explanation_md:
      "El patrón se apoya en una coincidencia aritmética: dentro de un grupo ordenado, una secuencia de fechas consecutivas y una secuencia de enteros consecutivos se anulan al restarse. Todo lo demás (largo, inicio, fin) sale del `GROUP BY` posterior. Las dos condiciones para que funcione son el grano correcto (un día por fila) y la partición adecuada.",
    is_published: true,
  },
  {
    slug: "entrevista-q09-between-con-marcas-de-tiempo",
    section,
    lesson: l3,
    type: "single",
    difficulty: "easy",
    topic: "Rangos de fecha sobre timestamptz",
    tags: ["fechas", "between", "rango_semiabierto"],
    estimated_seconds: 55,
    prompt_md:
      "`placed_at` es `timestamptz`. Quieres los pedidos de agosto de 2025 en UTC. ¿Cuál es la condición correcta?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`placed_at >= timestamptz '2025-08-01 00:00:00+00' AND placed_at < timestamptz '2025-09-01 00:00:00+00'`",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`placed_at BETWEEN '2025-08-01' AND '2025-08-31'`",
        is_correct: false,
        why_incorrect_md:
          "El extremo superior se interpreta como `2025-08-31 00:00:00`, así que pierdes casi todo el último día del mes: 24 horas de pedidos que sí pertenecen a agosto.",
      },
      {
        key: "c",
        body_md: "`date_part('month', placed_at) = 8 AND date_part('year', placed_at) = 2025`",
        is_correct: false,
        why_incorrect_md:
          "Aplica una función sobre la columna (impide usar el índice) y, sobre `timestamptz`, el mes depende de la zona horaria de la sesión: el mismo pedido puede caer en julio o en agosto según quién ejecute.",
      },
      {
        key: "d",
        body_md: "`placed_at::date BETWEEN '2025-08-01' AND '2025-08-31'`",
        is_correct: false,
        why_incorrect_md:
          "El rango queda completo, pero el `cast` de un `timestamptz` a `date` usa la zona horaria de la sesión, así que el resultado cambia según quién ejecute la consulta.",
      },
    ],
    explanation_md:
      "El rango semiabierto (`>=` … `<`) es la forma que funciona igual con fechas, marcas de tiempo y cualquier precisión, y no tiene el borde que se pierde con `BETWEEN`. Si además fijas los extremos con `timestamptz` y desplazamiento explícito, la consulta deja de depender del huso horario de quien la ejecuta.",
    is_published: true,
  },
  {
    slug: "entrevista-q10-grano-y-multiplicacion",
    section,
    lesson: l2,
    type: "single",
    difficulty: "advanced",
    topic: "El grano del resultado tras unir pedidos con sus ítems",
    tags: ["grano", "join", "duplicacion"],
    estimated_seconds: 70,
    prompt_md:
      "Unes `orders` con `order_items` para poder filtrar por producto y calculas `sum(o.total)` por ciudad. El número te da mucho más alto de lo esperado. ¿Cuál es la causa?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "El join multiplica cada pedido por su cantidad de ítems, así que `o.total` se suma tantas veces como líneas tenga el pedido.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`sum()` incluye los pedidos cancelados, que deberían excluirse.",
        is_correct: false,
        why_incorrect_md:
          "Los cancelados pueden inflar el total, pero eso ocurriría también sin el join. Aquí el salto viene de que el grano dejó de ser «una fila por pedido».",
      },
      {
        key: "c",
        body_md: "Falta `DISTINCT` en el `SELECT` para eliminar las filas repetidas.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` no arregla una suma: dos pedidos distintos pueden tener el mismo total y `DISTINCT` eliminaría uno legítimo. La solución es agregar al grano correcto, por ejemplo sumando `quantity * unit_price` o agregando los pedidos antes de unir.",
      },
      {
        key: "d",
        body_md: "El `INNER JOIN` descarta pedidos sin ítems y eso desbalancea el total.",
        is_correct: false,
        why_incorrect_md:
          "Descartar filas haría bajar el total, no subirlo. Además los pedidos sin ítems son una anomalía de datos, no la causa de una suma inflada.",
      },
    ],
    explanation_md:
      "Antes de agregar, pregúntate siempre **qué representa una fila** del resultado intermedio. Después de unir pedidos con ítems, una fila es una línea de pedido, así que sumar una columna del pedido la repite. Las salidas habituales son sumar `quantity * unit_price` (que sí vive en el grano de la línea) o agregar los ítems en una subconsulta antes de unir.",
    is_published: true,
  },
  {
    slug: "entrevista-q11-corte-del-acumulado",
    section,
    lesson: l2,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "Dónde cortar un total acumulado",
    tags: ["acumulado", "window_function", "pareto"],
    estimated_seconds: 90,
    prompt_md:
      "Te piden «el grupo más chico de restaurantes que explica el 50 % del GMV». ¿Qué tiene de malo el filtro de esta consulta?",
    code_md:
      "SELECT restaurant_name, gmv, gmv_acumulado\nFROM acumulado\nWHERE gmv_acumulado <= 0.5 * gmv_total\nORDER BY gmv DESC;",
    options: [
      {
        key: "a",
        body_md:
          "Deja afuera al restaurante que cruza la mitad, así que el grupo devuelto acumula menos del 50 %. El corte correcto compara el acumulado **previo**: `gmv_acumulado - gmv < 0.5 * gmv_total`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Incluye un restaurante de más: debería ser `gmv_acumulado < 0.5 * gmv_total`.",
        is_correct: false,
        why_incorrect_md:
          "Ese filtro es aún más restrictivo y agrava el problema: el grupo resultante se queda todavía más lejos del 50 %.",
      },
      {
        key: "c",
        body_md: "El problema es el `ORDER BY`: debería ordenar por `gmv_acumulado`.",
        is_correct: false,
        why_incorrect_md:
          "Ordenar por el acumulado o por el GMV descendente produce el mismo orden. El error está en el filtro, no en la presentación.",
      },
      {
        key: "d",
        body_md: "No hay problema: acumular hasta el 50 % es exactamente lo que se pidió.",
        is_correct: false,
        why_incorrect_md:
          "«Explicar el 50 %» significa alcanzar o superar esa mitad. Un grupo cuyo acumulado se queda en 49,3 % no cumple el pedido.",
      },
    ],
    explanation_md:
      "Es un error de un solo elemento, del tipo que produce un número creíble y equivocado. Comparar el acumulado **antes** de sumar la fila actual (`gmv_acumulado - gmv`) incluye al restaurante que cruza el umbral y hace que el grupo devuelto sí supere el 50 %. El mismo razonamiento aparece en deciles de ingreso, curvas de Pareto y cortes de inventario.",
    is_published: true,
  },
  {
    slug: "entrevista-q12-no-se-la-funcion",
    section,
    lesson: l2,
    type: "single",
    difficulty: "intermediate",
    topic: "Qué decir cuando no recuerdas la sintaxis",
    tags: ["comunicacion", "entrevista", "honestidad"],
    estimated_seconds: 50,
    prompt_md:
      "A mitad de una pregunta necesitas comparar cada fila con la anterior, pero no recuerdas el nombre exacto ni el orden de los argumentos de la función. ¿Qué conviene hacer?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Decir qué necesitas («una función de ventana que traiga el valor de la fila anterior, creo que `lag`»), escribirla con tu mejor recuerdo y aclarar que confirmarías la firma en la documentación.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Escribir la sintaxis con seguridad aunque no estés seguro, para no mostrar dudas.",
        is_correct: false,
        why_incorrect_md:
          "Afirmar con seguridad algo que puede estar mal es lo que más preocupa a quien va a revisar tu trabajo sobre datos de producción. El error de sintaxis se perdona; la falsa certeza, no.",
      },
      {
        key: "c",
        body_md: "Cambiar el enfoque a una autounión para evitar la función que no recuerdas.",
        is_correct: false,
        why_incorrect_md:
          "Es una salida válida si la explicas, pero elegir un camino más largo solo para esconder una duda cuesta tiempo y no evita la pregunta de seguimiento.",
      },
      {
        key: "d",
        body_md: "Pedir permiso para buscar en internet antes de seguir.",
        is_correct: false,
        why_incorrect_md:
          "En el trabajo real es lo normal, pero en una entrevista corta interrumpe el hilo. Nombrar la función y seguir razonando demuestra lo mismo sin perder el ritmo.",
      },
    ],
    explanation_md:
      "En una entrevista técnica se evalúa el razonamiento, no la memoria. Nombrar el concepto correcto y reconocer el límite exacto de lo que recuerdas transmite exactamente lo que busca un equipo de datos: criterio y honestidad sobre el propio nivel de certeza.",
    is_published: true,
  },
];
