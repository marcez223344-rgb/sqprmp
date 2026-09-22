import type { LessonDef } from "../schemas/curriculum";

const section = "funciones-numericas";

export const lessons: LessonDef[] = [
  {
    slug: "redondeo-y-truncamiento",
    section,
    kind: "theory",
    title: "Redondear y truncar: ROUND, TRUNC, CEIL y FLOOR",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["null-coalesce-y-nullif"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Un reporte de ventas con importes de ocho decimales no lo firma nadie. Redondear no es cosmética: define cuánto se factura, cuánto se reembolsa y cuánto cierra la caja. Estas cuatro funciones resuelven casi todo el trabajo diario con dinero y cantidades.

## ROUND: al más cercano

\`\`\`sql
SELECT ROUND(1234.5678, 2) AS dos_decimales,   -- 1234.57
       ROUND(1234.5678)     AS entero,          -- 1235
       ROUND(1234.5678, -2) AS a_cientos;       -- 1200
\`\`\`

El segundo argumento es la cantidad de decimales. Puede ser **negativo**: redondea a decenas, centenas o miles, muy útil para presentar rangos de precios.

Sobre una columna real:

\`\`\`sql
SELECT id, list_price, ROUND(list_price, 0) AS precio_entero
FROM products
WHERE currency = 'UYU';
\`\`\`

## TRUNC: cortar, no redondear

\`TRUNC\` descarta los decimales sobrantes sin mirar si el siguiente dígito es 5 o 9.

\`\`\`sql
SELECT ROUND(9.99, 1) AS redondeado,  -- 10.0
       TRUNC(9.99, 1) AS truncado;    -- 9.9
\`\`\`

Úsalo cuando el negocio dice "solo cuentan los pesos completos" (comisiones, puntos de fidelidad, cupos). Para importes que se cobran, el estándar es \`ROUND\`.

## CEIL y FLOOR: siempre hacia arriba o hacia abajo

\`\`\`sql
SELECT CEIL(4.01)  AS cajas,     -- 5
       FLOOR(4.99) AS completas; -- 4
\`\`\`

\`CEIL\` (o \`CEILING\`) sube al entero siguiente: cuántas cajas necesitas, cuántos viajes hay que hacer. \`FLOOR\` baja: cuántas unidades completas alcanzas a armar.

Con negativos las cuatro se comportan distinto, y conviene tenerlo claro:

| Valor | ROUND | TRUNC | CEIL | FLOOR |
| ----- | ----- | ----- | ---- | ----- |
| 9.5   | 10    | 9     | 10   | 9     |
| -9.1  | -9    | -9    | -9   | -10   |

\`TRUNC\` corta hacia cero; \`FLOOR\` siempre va hacia el número menor.

## El detalle que sorprende: numeric vs double precision

En PostgreSQL, \`ROUND\` sobre \`numeric\` redondea "medio hacia arriba", pero sobre \`double precision\` usa redondeo bancario (al par más cercano):

\`\`\`sql
SELECT ROUND(2.5)                    AS numeric_25,  -- 3
       ROUND(2.5::double precision)  AS double_25,   -- 2
       ROUND(3.5::double precision)  AS double_35;   -- 4
\`\`\`

Además \`ROUND(valor, decimales)\` con dos argumentos **solo existe para \`numeric\`**. Por eso el dinero se guarda en \`numeric(12,2)\`, como \`orders.total_amount\`: exacto y sin sorpresas. Si trabajas con un \`double precision\`, conviértelo primero con \`::numeric\`.

## Errores comunes

- Redondear demasiado temprano: si redondeas cada línea y después sumas, el total puede diferir del total redondeado al final. Regla práctica: calcula con la precisión completa y redondea **una sola vez**, al presentar.
- Usar \`TRUNC\` donde el negocio espera \`ROUND\` (o al revés) sin preguntar. Es una decisión contable, no técnica.
- Suponer que \`ROUND\` cambia el tipo de la columna: devuelve \`numeric\`; la tabla no se modifica.

## Resumen

- \`ROUND(x, n)\` para importes que se muestran o se cobran; \`n\` negativo agrupa por decenas o centenas.
- \`TRUNC\` corta hacia cero, \`CEIL\` sube, \`FLOOR\` baja: elige según la regla de negocio.
- El dinero vive en \`numeric\`; ahí el redondeo es predecible.
`,
  },
  {
    slug: "division-entera-y-porcentajes",
    section,
    kind: "theory",
    title: "División entera, casteos y porcentajes",
    sort_order: 1,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["redondeo-y-truncamiento"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Este es el error más caro y más silencioso de SQL: la consulta corre, no falla, y devuelve ceros. Quien no conoce la regla entrega un reporte donde "ningún cliente convierte" y nadie nota el problema hasta la reunión.

## La trampa

\`\`\`sql
SELECT 1 / 2 AS resultado;  -- 0
\`\`\`

No es un error: en PostgreSQL, \`integer / integer\` devuelve \`integer\`, y el resultado se **trunca hacia cero** (no se redondea). Con negativos: \`-7 / 2\` da \`-3\`, no \`-4\`.

La trampa aparece con columnas enteras como \`payments.installments\`, \`products.stock\`, \`order_items.quantity\` o \`reviews.rating\`:

\`\`\`sql
SELECT 100 / installments AS porcentaje_por_cuota
FROM payments;         -- en 3 cuotas devuelve 33, no 33.33
\`\`\`

## Las tres formas de arreglarlo

\`\`\`sql
SELECT 100.0 / installments                AS con_literal_decimal,
       100::numeric / installments         AS con_cast_explicito,
       CAST(100 AS numeric) / installments AS con_cast_sql_estandar
FROM payments;
\`\`\`

Basta con que **uno** de los dos operandos sea \`numeric\` para que toda la división sea numérica. Escribir \`100.0\` es lo más corto; \`::numeric\` es lo más explícito y el que se lee mejor en una consulta larga. Cualquiera de los tres es correcto.

Ojo con el orden: multiplicar antes de dividir también evita el problema, porque agranda el numerador.

\`\`\`sql
SELECT rating * 100 / 5 AS base_100      -- 40 para rating 2: correcto
FROM reviews;
SELECT rating / 5 * 100 AS base_100_mal  -- 0 para rating 2: el cociente ya era 0
FROM reviews;
\`\`\`

Aun así, castear es más seguro que confiar en el orden.

## Dividir por cero

La división por cero **sí** lanza un error y aborta la consulta. El patrón estándar es convertir el cero en NULL con \`NULLIF\`:

\`\`\`sql
SELECT ROUND(discount * 100 / NULLIF(subtotal, 0), 2) AS descuento_pct
FROM orders;
\`\`\`

Si \`subtotal\` es 0, \`NULLIF\` devuelve NULL, la división devuelve NULL y la fila sobrevive. Si prefieres mostrar 0 en vez de NULL, envuélvelo en \`COALESCE(..., 0)\`; es una decisión de negocio: "no se puede calcular" y "es cero" no significan lo mismo.

## Porcentajes que se leen bien

Dos preguntas distintas, misma mecánica:

\`\`\`sql
-- ¿Qué porcentaje del subtotal representó el descuento?
SELECT id, ROUND(discount * 100 / subtotal, 2) AS discount_percent
FROM orders
WHERE discount > 0;

-- ¿Qué peso tiene el envío dentro del total cobrado?
SELECT id, ROUND(shipping_fee * 100 / total_amount, 2) AS shipping_percent
FROM orders;
\`\`\`

Tres criterios para no equivocarte:

1. Define el denominador antes de escribir SQL: ¿sobre el subtotal o sobre el total? Cambia el número y la conclusión.
2. Decide si devuelves 18.00 (porcentaje) o 0.18 (proporción) y dilo en el nombre de la columna (\`_percent\` vs \`_ratio\`).
3. Redondea al final, con los decimales que pide el reporte.

## Variación porcentual

Para comparar dos importes: \`(nuevo - anterior) * 100 / anterior\`. Si el valor anterior puede ser 0, otra vez \`NULLIF\`.

## Resumen

- \`entero / entero\` trunca: castea a \`numeric\` o multiplica primero.
- Divide por \`NULLIF(denominador, 0)\` cuando el denominador puede ser cero.
- Nombra las columnas de porcentaje para que nadie dude de la escala.
`,
  },
  {
    slug: "abs-mod-power-y-limites",
    section,
    kind: "theory",
    title: "ABS, MOD, POWER y los límites GREATEST/LEAST",
    sort_order: 2,
    estimated_minutes: 8,
    is_free: false,
    is_published: true,
    prerequisites: ["division-entera-y-porcentajes"],
    dataset: "bolsillo",
    body_md: `## Por qué importa

Las reglas comerciales reales casi nunca son una multiplicación limpia: "2 % de comisión, mínimo 5 y máximo 12", "reparte en cajas de 12 y dime qué sobra", "cuánto se desvía este pago del promedio". Estas funciones convierten esas frases en SQL directo.

## ABS: distancia sin signo

\`ABS\` devuelve el valor absoluto. Sirve para medir desvíos sin importar la dirección:

\`\`\`sql
SELECT id, amount, ABS(amount - 500) AS desvio
FROM transactions
WHERE kind = 'withdrawal';
\`\`\`

También es el modo correcto de comparar dos importes con tolerancia: \`ABS(a - b) <= 0.01\`.

## MOD: el resto de la división

\`MOD(a, b)\` (o \`a % b\`) devuelve el resto. Combinado con la división entera responde preguntas de empaque:

\`\`\`sql
SELECT stock / 12     AS cajas_completas,
       MOD(stock, 12) AS unidades_sueltas
FROM products;
\`\`\`

Aquí la división entera es **lo que quieres**: no existen media caja. Otro uso típico es detectar múltiplos: \`MOD(x, 2) = 0\` identifica pares. Con negativos, el resto conserva el signo del dividendo: \`MOD(-7, 2)\` es \`-1\`.

## POWER: potencias e interés compuesto

\`POWER(base, exponente)\` eleva a una potencia; también existe el operador \`^\`.

\`\`\`sql
SELECT ROUND(1000 * POWER(1.05, 3), 2) AS a_tres_periodos;  -- 1157.63
\`\`\`

Es la base de cualquier cálculo de crecimiento compuesto: un 5 % mensual durante 3 meses no es 15 %, es 15.76 %. Complementos: \`SQRT\` para la raíz cuadrada y \`LOG\` para escalas logarítmicas.

## GREATEST y LEAST: pisos y techos

No son funciones de agregación: comparan **valores de la misma fila** y devuelven el mayor o el menor.

\`\`\`sql
SELECT id,
       LEAST(GREATEST(ROUND(amount * 0.015, 2), 5.00), 12.00) AS fee
FROM transactions
WHERE kind = 'withdrawal';
\`\`\`

Léelo de adentro hacia afuera: calcula el 1.5 %, \`GREATEST\` impone el mínimo de 5, \`LEAST\` impone el tope de 12. El orden inverso (\`GREATEST(5.00, LEAST(12.00, ...))\`) da el mismo resultado mientras el mínimo sea menor que el máximo; elige la versión que se lea mejor en tu equipo.

Cuidado con NULL: si un argumento es NULL, \`GREATEST\` y \`LEAST\` lo **ignoran** (a diferencia de la suma, que se contagia de NULL). Y no confundas \`GREATEST\` con \`MAX\`: \`MAX\` compara filas, \`GREATEST\` compara columnas dentro de una fila.

## Errores comunes

- Usar \`MAX(a, b)\`: no existe con dos argumentos; es \`GREATEST(a, b)\`.
- Aplicar \`ABS\` a un importe que ya es positivo "por las dudas" y esconder así un signo que indicaba un reverso.
- Calcular interés compuesto multiplicando la tasa por la cantidad de períodos.

## Resumen

- \`ABS\` para desvíos y tolerancias; \`MOD\` para restos y múltiplos.
- \`POWER\` para crecimiento compuesto, nunca una multiplicación de tasas.
- \`GREATEST\`/\`LEAST\` aplican mínimos y topes fila por fila.
`,
  },
];
