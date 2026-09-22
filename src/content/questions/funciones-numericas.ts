import type { QuestionDef } from "../schemas/question";

const section = "funciones-numericas";
const redondeo = "redondeo-y-truncamiento";
const division = "division-entera-y-porcentajes";
const utiles = "abs-mod-power-y-limites";

export const questions: QuestionDef[] = [
  {
    slug: "fnum-q01-division-entera",
    section,
    lesson: division,
    type: "single",
    difficulty: "easy",
    topic: "División entera",
    tags: ["numeric_functions", "tipos"],
    estimated_seconds: 40,
    prompt_md: "En PostgreSQL, ¿qué devuelve `SELECT 1 / 2;`?",
    code_md: null,
    options: [
      { key: "a", body_md: "`0`", is_correct: true },
      {
        key: "b",
        body_md: "`0.5`",
        is_correct: false,
        why_incorrect_md:
          "Para obtener `0.5` al menos uno de los operandos debe ser `numeric`: `1.0 / 2`.",
      },
      {
        key: "c",
        body_md: "`1`",
        is_correct: false,
        why_incorrect_md:
          "La división entera no redondea: trunca hacia cero, y el cociente de 1 entre 2 es 0.",
      },
      {
        key: "d",
        body_md: "Un error de tipos.",
        is_correct: false,
        why_incorrect_md:
          "No hay error: la operación es válida y por eso el problema pasa desapercibido en los reportes.",
      },
    ],
    explanation_md:
      "`integer / integer` devuelve `integer` y descarta la parte decimal. La consulta corre sin fallar, que es lo que vuelve peligroso este comportamiento.",
    is_published: true,
  },
  {
    slug: "fnum-q02-porcentaje-por-cuota",
    section,
    lesson: division,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Casteos en porcentajes",
    tags: ["numeric_functions", "cast"],
    estimated_seconds: 60,
    prompt_md:
      "`payments.installments` es `integer`. Para un pago en 3 cuotas, ¿qué valor devuelve `share`?",
    code_md:
      "```sql\nSELECT ROUND(100 / installments, 2) AS share\nFROM payments\nWHERE installments = 3;\n```",
    options: [
      {
        key: "a",
        body_md: "`33.00`, porque la división entera da 33 y `ROUND` solo agrega los decimales.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`33.33`, porque `ROUND` con dos decimales corrige la división.",
        is_correct: false,
        why_incorrect_md:
          "`ROUND` se aplica **después** de la división: los decimales ya se perdieron y no se pueden recuperar.",
      },
      {
        key: "c",
        body_md: "`33`, sin decimales, porque el resultado sigue siendo `integer`.",
        is_correct: false,
        why_incorrect_md:
          "`ROUND(entero, 2)` convierte el valor a `numeric` con dos decimales; el problema es el valor, no el formato.",
      },
      {
        key: "d",
        body_md: "Error: `ROUND` no acepta un valor entero.",
        is_correct: false,
        why_incorrect_md: "El entero se convierte a `numeric` automáticamente; no hay error.",
      },
    ],
    explanation_md:
      "El orden de evaluación manda: primero `100 / 3` entre enteros (33) y después el redondeo. La solución es castear el numerador: `ROUND(100.0 / installments, 2)` o `ROUND(100::numeric / installments, 2)`.",
    is_published: true,
  },
  {
    slug: "fnum-q03-trunc-vs-round",
    section,
    lesson: redondeo,
    type: "true_false",
    difficulty: "easy",
    topic: "TRUNC y ROUND",
    tags: ["numeric_functions"],
    estimated_seconds: 30,
    prompt_md: "`TRUNC(9.99, 1)` devuelve `9.9` y `ROUND(9.99, 1)` devuelve `10.0`.",
    code_md: null,
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "`TRUNC` corta los decimales sobrantes sin mirar el siguiente dígito; `ROUND` sí lo mira y sube.",
      },
    ],
    explanation_md:
      "`TRUNC` corta hacia cero y `ROUND` elige el valor más cercano. Con importes que se cobran, el estándar contable es `ROUND`; `TRUNC` se usa cuando el negocio dice «solo cuentan las unidades completas».",
    is_published: true,
  },
  {
    slug: "fnum-q04-nullif-division-cero",
    section,
    lesson: division,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "División por cero",
    tags: ["numeric_functions", "null_handling"],
    estimated_seconds: 45,
    prompt_md:
      "Completa la función que evita el error *division by zero* convirtiendo el denominador en NULL cuando vale 0: `ROUND(discount * 100 / ___(subtotal, 0), 2)`.",
    code_md: null,
    answer: { accepted: ["nullif"], case_sensitive: false },
    explanation_md:
      "`NULLIF(subtotal, 0)` devuelve NULL cuando `subtotal` es 0; la división con NULL devuelve NULL y la fila sobrevive en vez de abortar la consulta. A diferencia de la división entera, dividir por cero **sí** lanza un error.",
    is_published: true,
  },
  {
    slug: "fnum-q05-max-dos-argumentos",
    section,
    lesson: utiles,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "GREATEST y LEAST",
    tags: ["numeric_functions", "sintaxis"],
    estimated_seconds: 45,
    prompt_md:
      "Esta consulta falla con `function max(numeric, numeric) does not exist`. ¿Cuál es la corrección?",
    code_md: "```sql\nSELECT id,\n       MAX(amount * 0.015, 5.00) AS fee\nFROM transactions;\n```",
    options: [
      {
        key: "a",
        body_md: "Usar `GREATEST(amount * 0.015, 5.00)`: compara valores de la misma fila.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Agregar `GROUP BY id`, porque `MAX` es una función de agregación.",
        is_correct: false,
        why_incorrect_md:
          "`MAX` agrega **filas** y recibe un solo argumento; agrupar no resuelve la comparación entre dos valores de una misma fila.",
      },
      {
        key: "c",
        body_md: "Castear el segundo argumento con `5.00::numeric`.",
        is_correct: false,
        why_incorrect_md:
          "El problema no son los tipos: `MAX` simplemente no existe con dos argumentos.",
      },
      {
        key: "d",
        body_md: "Usar `LEAST(amount * 0.015, 5.00)`.",
        is_correct: false,
        why_incorrect_md:
          "`LEAST` existe y no daría error, pero devuelve el menor de los dos: impondría un **tope** de 5.00, no un mínimo.",
      },
    ],
    explanation_md:
      "`MAX`/`MIN` comparan filas dentro de un grupo; `GREATEST`/`LEAST` comparan columnas o expresiones dentro de una misma fila. Para un piso de comisión se usa `GREATEST`.",
    is_published: true,
  },
  {
    slug: "fnum-q06-evitar-division-entera",
    section,
    lesson: division,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Formas de evitar la división entera",
    tags: ["numeric_functions", "cast"],
    estimated_seconds: 70,
    prompt_md:
      "`rating` es `integer` con valores de 1 a 5. ¿Qué expresiones dan como resultado el valor 40 para un `rating` de 2? Selecciona todas las correctas.",
    code_md: null,
    options: [
      { key: "a", body_md: "`rating * 100 / 5`", is_correct: true },
      { key: "b", body_md: "`rating::numeric / 5 * 100`", is_correct: true },
      { key: "c", body_md: "`rating * 100.0 / 5`", is_correct: true },
      {
        key: "d",
        body_md: "`rating / 5 * 100`",
        is_correct: false,
        why_incorrect_md:
          "`2 / 5` entre enteros da 0, y 0 multiplicado por 100 sigue siendo 0: el daño ya está hecho antes de multiplicar.",
      },
      {
        key: "e",
        body_md: "`ROUND(rating / 5, 2) * 100`",
        is_correct: false,
        why_incorrect_md:
          "`ROUND` actúa después de la división entera: redondea 0 y devuelve 0.00, luego 0.00.",
      },
    ],
    explanation_md:
      "Hay dos caminos válidos: castear un operando a `numeric` o multiplicar antes de dividir para que el numerador sea mayor que el denominador. El casteo es más seguro porque no depende del orden de los operadores.",
    is_published: true,
  },
  {
    slug: "fnum-q07-funciones-por-necesidad",
    section,
    lesson: utiles,
    type: "matching",
    difficulty: "easy",
    topic: "Elegir la función numérica",
    tags: ["numeric_functions"],
    estimated_seconds: 70,
    prompt_md: "Relaciona cada necesidad del negocio con la función adecuada.",
    code_md: null,
    pairs: [
      { left: "Cuántas cajas completas de 12 se arman", right: "División entera" },
      { left: "Cuántas unidades quedan fuera de caja", right: "MOD" },
      { left: "Aplicar una comisión mínima de 5.00", right: "GREATEST" },
      { left: "Cuánto se desvía un pago del promedio, sin signo", right: "ABS" },
      { left: "Capital acumulado con 5 % mensual durante 3 meses", right: "POWER" },
    ],
    explanation_md:
      "Cada regla de negocio tiene una función que la expresa directamente. Escribir `CASE` para imponer un mínimo o multiplicar la tasa por los períodos son señales de que falta conocer estas funciones.",
    is_published: true,
  },
  {
    slug: "fnum-q08-cuando-redondear",
    section,
    lesson: redondeo,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Redondeo de dinero en reportes",
    tags: ["numeric_functions", "readability"],
    estimated_seconds: 60,
    prompt_md:
      "En un reporte de facturación, el total no coincide por unos centavos con la suma que calcula Finanzas. Cada línea se redondea a dos decimales y después se suman las líneas. ¿Qué conviene hacer?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Calcular con la precisión completa y redondear una sola vez, al presentar el resultado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Redondear cada línea a cuatro decimales en lugar de dos.",
        is_correct: false,
        why_incorrect_md:
          "Reduce la diferencia, pero no la elimina: el error de redondeo se sigue acumulando línea por línea.",
      },
      {
        key: "c",
        body_md: "Usar `TRUNC` en vez de `ROUND` para que el total nunca quede por encima.",
        is_correct: false,
        why_incorrect_md:
          "Cambia el sesgo del error, no su causa, y además subfactura de forma sistemática.",
      },
      {
        key: "d",
        body_md: "Convertir los importes a `double precision` para ganar precisión.",
        is_correct: false,
        why_incorrect_md:
          "`double precision` es aproximado: para dinero es peor que `numeric`, no mejor.",
      },
    ],
    explanation_md:
      "La regla profesional es redondear al final, una sola vez. Cuando el negocio exige que cada línea se facture redondeada, hay que documentarlo y aceptar que el total es la suma de las líneas redondeadas: son dos definiciones distintas del mismo total.",
    is_published: true,
  },
  {
    slug: "fnum-q09-ceil-floor-negativos",
    section,
    lesson: redondeo,
    type: "single",
    difficulty: "intermediate",
    topic: "Comportamiento con negativos",
    tags: ["numeric_functions"],
    estimated_seconds: 45,
    prompt_md: "¿Qué devuelven `FLOOR(-9.1)` y `TRUNC(-9.1)`?",
    code_md: null,
    options: [
      { key: "a", body_md: "`-10` y `-9`", is_correct: true },
      {
        key: "b",
        body_md: "`-9` y `-9`",
        is_correct: false,
        why_incorrect_md: "`FLOOR` va siempre hacia el número menor, y -10 es menor que -9.1.",
      },
      {
        key: "c",
        body_md: "`-10` y `-10`",
        is_correct: false,
        why_incorrect_md:
          "`TRUNC` corta hacia cero: descarta los decimales y deja -9, no baja a -10.",
      },
      {
        key: "d",
        body_md: "`-9` y `-10`",
        is_correct: false,
        why_incorrect_md: "Es al revés: `FLOOR` baja y `TRUNC` corta hacia cero.",
      },
    ],
    explanation_md:
      "Con números positivos `FLOOR` y `TRUNC` coinciden; con negativos no. Por eso conviene elegirlas pensando en saldos y ajustes, donde los valores negativos son normales.",
    is_published: true,
  },
  {
    slug: "fnum-q10-numeric-vs-double",
    section,
    lesson: redondeo,
    type: "single",
    difficulty: "advanced",
    topic: "numeric vs double precision",
    tags: ["numeric_functions", "tipos"],
    estimated_seconds: 50,
    prompt_md: "¿Por qué el dinero se guarda en `numeric(12,2)` y no en `double precision`?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`numeric` es exacto y su redondeo es predecible; `double precision` es aproximado y `ROUND` no admite decimales sobre él.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`numeric` ocupa menos espacio en disco.",
        is_correct: false,
        why_incorrect_md:
          "Suele ocupar más y ser más lento: se elige por exactitud, no por rendimiento.",
      },
      {
        key: "c",
        body_md: "`double precision` no admite valores negativos.",
        is_correct: false,
        why_incorrect_md: "Ambos tipos admiten negativos.",
      },
      {
        key: "d",
        body_md: "`numeric` redondea automáticamente a dos decimales en cualquier operación.",
        is_correct: false,
        why_incorrect_md:
          "La escala se define en la columna; una división intermedia puede devolver muchos decimales y hay que redondearla explícitamente.",
      },
    ],
    explanation_md:
      "`ROUND(2.5)` sobre `numeric` devuelve 3, pero `ROUND(2.5::double precision)` devuelve 2 (redondeo bancario), y `ROUND(valor, decimales)` ni siquiera existe para `double precision`. Con dinero, exactitud antes que velocidad.",
    is_published: true,
  },
];
