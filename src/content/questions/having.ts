import type { QuestionDef } from "../schemas/question";

const section = "having";
const basico = "having-filtrar-grupos";
const decidir = "having-vs-where";
const patrones = "having-patrones";

export const questions: QuestionDef[] = [
  {
    slug: "having-q01-que-filtra",
    section,
    lesson: basico,
    type: "single",
    difficulty: "easy",
    topic: "Qué filtra HAVING",
    tags: ["having", "group_by"],
    estimated_seconds: 40,
    prompt_md: "¿Sobre qué actúa `HAVING`?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Sobre los grupos ya formados, después de calcular los agregados.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Sobre las filas individuales, antes de agrupar.",
        is_correct: false,
        why_incorrect_md: "Eso hace `WHERE`. `HAVING` se ejecuta después de `GROUP BY`.",
      },
      {
        key: "c",
        body_md: "Sobre el resultado final, después de `ORDER BY`.",
        is_correct: false,
        why_incorrect_md:
          "`ORDER BY` es lo último en ejecutarse; para cortar el resultado final se usa `LIMIT`.",
      },
      {
        key: "d",
        body_md: "Sobre las columnas del `SELECT`, eliminando las vacías.",
        is_correct: false,
        why_incorrect_md:
          "Ninguna cláusula elimina columnas: `HAVING` decide qué filas-grupo salen.",
      },
    ],
    explanation_md:
      "El orden de ejecución es `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`. `HAVING` descarta grupos completos usando valores agregados.",
    is_published: true,
  },
  {
    slug: "having-q02-agregado-en-where",
    section,
    lesson: basico,
    type: "error_diagnosis",
    difficulty: "easy",
    topic: "Agregado en WHERE",
    tags: ["having", "where", "sintaxis"],
    estimated_seconds: 45,
    prompt_md: "Esta consulta falla. ¿Cuál es la causa y la corrección?",
    code_md:
      "```sql\nSELECT restaurant_id, count(*) AS entregados\nFROM orders\nWHERE status = 'delivered' AND count(*) >= 60\nGROUP BY restaurant_id;\n```",
    options: [
      {
        key: "a",
        body_md:
          "`count(*)` no puede usarse en `WHERE`; esa condición debe ir en `HAVING count(*) >= 60`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta `ORDER BY`, obligatorio cuando se usa `GROUP BY`.",
        is_correct: false,
        why_incorrect_md: "`ORDER BY` nunca es obligatorio; su ausencia no produce un error.",
      },
      {
        key: "c",
        body_md: "Hay que agrupar también por `status`.",
        is_correct: false,
        why_incorrect_md:
          "`status` está filtrado a un único valor y no aparece en el `SELECT`, así que no necesita estar en el `GROUP BY`.",
      },
      {
        key: "d",
        body_md: "El alias `entregados` debe declararse antes del `WHERE`.",
        is_correct: false,
        why_incorrect_md:
          "Los alias no se declaran por adelantado; el problema es el agregado dentro de `WHERE`.",
      },
    ],
    explanation_md:
      "PostgreSQL responde «aggregate functions are not allowed in WHERE». Cuando `WHERE` evalúa cada fila los grupos aún no existen, así que `count(*)` no tiene valor. La condición pertenece a `HAVING`.",
    is_published: true,
  },
  {
    slug: "having-q03-alias",
    section,
    lesson: basico,
    type: "true_false",
    difficulty: "intermediate",
    topic: "Alias en HAVING",
    tags: ["having", "alias"],
    estimated_seconds: 40,
    prompt_md:
      "Verdadero o falso: en PostgreSQL, si en el `SELECT` definiste `count(*) AS pedidos`, puedes escribir `HAVING pedidos > 100`.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          '`GROUP BY` y `ORDER BY` aceptan el alias, pero `HAVING` se evalúa antes de que exista la lista del `SELECT`: devuelve «column "pedidos" does not exist».',
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "`HAVING` no ve los alias del `SELECT`. Repite la expresión agregada completa; si te molesta la repetición, envuelve la agregación en una subconsulta o CTE y filtra afuera.",
    is_published: true,
  },
  {
    slug: "having-q04-donde-va-el-filtro",
    section,
    lesson: decidir,
    type: "matching",
    difficulty: "intermediate",
    topic: "WHERE o HAVING",
    tags: ["having", "where"],
    estimated_seconds: 80,
    prompt_md: "Relaciona cada condición de negocio con la cláusula donde corresponde escribirla.",
    code_md: null,
    pairs: [
      { left: "El pedido está entregado", right: "WHERE: se ve en una sola fila" },
      { left: "El cliente hizo 8 o más pedidos", right: "HAVING: exige contar varias filas" },
      { left: "El producto está activo", right: "WHERE: se ve en una sola fila" },
      {
        left: "El gasto acumulado del cliente supera 200 000",
        right: "HAVING: exige sumar varias filas",
      },
    ],
    explanation_md:
      "La prueba es siempre la misma: si la condición se puede responder mirando una fila, va en `WHERE`; si necesita todo el grupo, va en `HAVING`. Poner en `WHERE` lo que se puede es además más rápido, porque reduce las filas antes de agrupar.",
    is_published: true,
  },
  {
    slug: "having-q05-interpretar",
    section,
    lesson: decidir,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Lectura de consultas",
    tags: ["having", "group_by", "where"],
    estimated_seconds: 60,
    prompt_md: "¿Qué pregunta de negocio responde esta consulta?",
    code_md:
      "```sql\nSELECT category_id, count(*) AS productos\nFROM products\nWHERE is_active\nGROUP BY category_id\nHAVING count(*) >= 60;\n```",
    options: [
      {
        key: "a",
        body_md: "Qué categorías tienen 60 o más productos **activos**, y cuántos tienen.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Qué categorías tienen 60 o más productos en total, contando los inactivos.",
        is_correct: false,
        why_incorrect_md:
          "`WHERE is_active` descarta los inactivos antes de contar, así que el umbral se aplica solo a los activos.",
      },
      {
        key: "c",
        body_md: "Los 60 productos activos más vendidos de cada categoría.",
        is_correct: false,
        why_incorrect_md:
          "No hay ninguna métrica de ventas ni `LIMIT`: 60 es el umbral de cantidad de productos por categoría.",
      },
      {
        key: "d",
        body_md: "Las categorías con menos de 60 productos activos.",
        is_correct: false,
        why_incorrect_md:
          "`>=` conserva los grupos que alcanzan o superan el umbral, no los que quedan debajo.",
      },
    ],
    explanation_md:
      "`WHERE` define el universo (productos activos), `GROUP BY` arma un grupo por categoría y `HAVING` deja solo los grupos que llegan a 60.",
    is_published: true,
  },
  {
    slug: "having-q06-sin-group-by",
    section,
    lesson: decidir,
    type: "single",
    difficulty: "advanced",
    topic: "HAVING sin GROUP BY",
    tags: ["having", "aggregate"],
    estimated_seconds: 60,
    prompt_md: "`orders` tiene 13 284 pedidos entregados. ¿Qué devuelve esta consulta?",
    code_md:
      "```sql\nSELECT count(*) AS entregados\nFROM orders\nWHERE status = 'delivered'\nHAVING count(*) > 20000;\n```",
    options: [
      { key: "a", body_md: "Cero filas.", is_correct: true },
      {
        key: "b",
        body_md: "Una fila con el valor 13 284.",
        is_correct: false,
        why_incorrect_md:
          "El único grupo (toda la tabla filtrada) no cumple `count(*) > 20000`, así que `HAVING` lo descarta.",
      },
      {
        key: "c",
        body_md: "Una fila con el valor 0.",
        is_correct: false,
        why_incorrect_md: "`HAVING` elimina la fila entera; no la reemplaza por un cero.",
      },
      {
        key: "d",
        body_md: "Un error: `HAVING` requiere `GROUP BY`.",
        is_correct: false,
        why_incorrect_md:
          "`HAVING` sin `GROUP BY` es válido: la tabla completa se trata como un único grupo.",
      },
    ],
    explanation_md:
      "Sin `GROUP BY`, la consulta agregada produce exactamente una fila. `HAVING` decide si esa fila sale o no; con 13 284 ≤ 20 000, el resultado queda vacío. Es el patrón típico de una alerta: «devuélveme algo solo si se rompió el umbral».",
    is_published: true,
  },
  {
    slug: "having-q07-completar",
    section,
    lesson: patrones,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Sintaxis de HAVING",
    tags: ["having", "group_by"],
    estimated_seconds: 45,
    prompt_md:
      "Completa la palabra clave que falta para quedarte solo con los platos que vendieron 40 unidades o más:\n\n```sql\nSELECT menu_item_id, sum(quantity) AS unidades\nFROM order_items\nGROUP BY menu_item_id\n____ sum(quantity) >= 40;\n```\n\nEscribe solo la palabra clave.",
    answer: { accepted: ["HAVING", "having"], case_sensitive: false },
    explanation_md:
      "El umbral se aplica a `sum(quantity)`, un valor que solo existe una vez formado el grupo: corresponde a `HAVING`.",
    is_published: true,
  },
  {
    slug: "having-q08-dos-agregados",
    section,
    lesson: patrones,
    type: "single",
    difficulty: "advanced",
    topic: "Comparar agregados",
    tags: ["having", "aggregate", "distinct"],
    estimated_seconds: 60,
    prompt_md: "¿Qué grupos devuelve esta consulta?",
    code_md:
      "```sql\nSELECT promotion_id\nFROM orders\nWHERE promotion_id IS NOT NULL\nGROUP BY promotion_id\nHAVING count(*) > count(DISTINCT customer_id);\n```",
    options: [
      {
        key: "a",
        body_md: "Las promociones que al menos un cliente usó más de una vez.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Las promociones usadas por más de un cliente.",
        is_correct: false,
        why_incorrect_md:
          "Eso sería `HAVING count(DISTINCT customer_id) > 1`. Aquí se comparan usos contra clientes distintos.",
      },
      {
        key: "c",
        body_md: "Las promociones sin ningún uso.",
        is_correct: false,
        why_incorrect_md:
          "Una promoción sin uso no aparece en `orders`, así que no forma grupo y nunca puede salir en el resultado.",
      },
      {
        key: "d",
        body_md: "Ninguna: `HAVING` solo compara contra números fijos.",
        is_correct: false,
        why_incorrect_md:
          "`HAVING` admite cualquier expresión sobre agregados, incluida la comparación entre dos de ellos.",
      },
    ],
    explanation_md:
      "Si el número de usos supera al de clientes distintos, alguien repitió. `count(*) - count(DISTINCT customer_id)` cuantifica cuántas repeticiones hubo.",
    is_published: true,
  },
  {
    slug: "having-q09-promedio-muestra",
    section,
    lesson: patrones,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Rankings por promedio",
    tags: ["having", "aggregate", "readability"],
    estimated_seconds: 60,
    prompt_md:
      "Marketing pide el ranking de productos mejor calificados. Con `GROUP BY product_id` y `HAVING avg(rating) >= 4.4`, el primer puesto lo ocupan productos con una única reseña de 5 estrellas. ¿Cuál es la corrección adecuada?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Agregar un mínimo de muestra al mismo `HAVING`, por ejemplo `AND count(*) >= 5`, y acordarlo con negocio.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Subir el umbral a `avg(rating) >= 4.9`.",
        is_correct: false,
        why_incorrect_md:
          "No cambia el problema: un producto con una sola reseña de 5 estrellas sigue cumpliendo y sigue siendo primero.",
      },
      {
        key: "c",
        body_md: "Agregar `LIMIT 10` para quedarte con los diez primeros.",
        is_correct: false,
        why_incorrect_md:
          "Corta la lista pero no la ordena por confiabilidad: los productos con una sola reseña seguirían encabezándola.",
      },
      {
        key: "d",
        body_md: "Cambiar `avg(rating)` por `sum(rating)`.",
        is_correct: false,
        why_incorrect_md:
          "`sum` premia el volumen y deja de medir satisfacción: un producto mediocre con 30 reseñas superaría a uno excelente con 6.",
      },
    ],
    explanation_md:
      "Todo ranking por promedio necesita un mínimo de observaciones explícito. `HAVING count(*) >= 5 AND avg(rating) >= 4.4` combina confiabilidad y calidad; el número mínimo es una decisión de negocio que conviene documentar.",
    is_published: true,
  },
  {
    slug: "having-q10-afirmaciones",
    section,
    lesson: patrones,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Reglas de HAVING",
    tags: ["having", "where", "group_by"],
    estimated_seconds: 70,
    prompt_md:
      "¿Cuáles de estas afirmaciones sobre `HAVING` son correctas? Selecciona todas las que apliquen.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Puede combinar varias condiciones con `AND` y `OR`, igual que `WHERE`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Puede comparar dos agregados entre sí, no solo contra constantes.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "`HAVING count(*) = 0` sirve para encontrar los grupos vacíos.",
        is_correct: false,
        why_incorrect_md:
          "Un grupo sin filas no se forma, así que nunca hay un grupo con `count(*) = 0`. Las categorías sin ventas se obtienen con un `LEFT JOIN`.",
      },
      {
        key: "d",
        body_md: "Solo puede usarse junto con `GROUP BY`.",
        is_correct: false,
        why_incorrect_md:
          "Sin `GROUP BY` la tabla entera es un único grupo y `HAVING` decide si esa fila se devuelve.",
      },
      {
        key: "e",
        body_md: "Filtrar en `HAVING` lo que se podía filtrar en `WHERE` mejora el rendimiento.",
        is_correct: false,
        why_incorrect_md:
          "Es al revés: `WHERE` reduce las filas antes de agrupar, así que el motor trabaja con menos datos.",
      },
    ],
    explanation_md:
      "`HAVING` es tan expresivo como `WHERE`, pero opera sobre grupos. No inventa grupos vacíos, no requiere `GROUP BY` y no debe usarse para condiciones que pertenecen a `WHERE`.",
    is_published: true,
  },
];
