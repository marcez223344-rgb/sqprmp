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

Nadie firma un reporte de ventas con importes de ocho decimales. Redondear no es una cuestión de presentación: la forma en que redondeas define cuánto se factura, cuánto se reembolsa y con qué cifra cierra la caja. Las cuatro funciones de esta lección resuelven casi todo el trabajo diario con dinero y con cantidades.

## ROUND: al más cercano

\`\`\`sql
SELECT ROUND(1234.5678, 2) AS dos_decimales,   -- 1234.57
       ROUND(1234.5678)     AS entero,          -- 1235
       ROUND(1234.5678, -2) AS a_cientos;       -- 1200
\`\`\`

El segundo argumento es la cantidad de decimales que quieres conservar. También puede ser **negativo**, y entonces redondea a decenas, centenas o miles: \`ROUND(1234.5678, -2)\` devuelve 1200. Sirve para presentar precios por rangos, cuando el detalle exacto no aporta nada a quien lee.

Sobre una columna real:

\`\`\`sql
SELECT id, list_price, ROUND(list_price, 0) AS precio_entero
FROM products
WHERE currency = 'UYU';
\`\`\`

## TRUNC: cortar, no redondear

\`TRUNC\` descarta los decimales sobrantes sin mirar el dígito siguiente, así que nunca sube el valor, ni siquiera cuando el resto es casi una unidad completa.

\`\`\`sql
SELECT ROUND(9.99, 1) AS redondeado,  -- 10.0
       TRUNC(9.99, 1) AS truncado;    -- 9.9
\`\`\`

Úsalo cuando la regla de negocio dice que solo cuentan las unidades completas: comisiones, puntos de fidelidad, cupos disponibles. Para los importes que efectivamente se le cobran a alguien, el estándar contable es \`ROUND\`.

## CEIL y FLOOR: siempre hacia arriba o hacia abajo

\`\`\`sql
SELECT CEIL(4.01)  AS cajas,     -- 5
       FLOOR(4.99) AS completas; -- 4
\`\`\`

\`CEIL\` (o su sinónimo \`CEILING\`) sube siempre al entero siguiente, y responde preguntas del tipo «cuántas cajas necesito» o «cuántos viajes hay que hacer»: con 4,01 cajas hacen falta 5, porque media caja igual ocupa un lugar. \`FLOOR\` baja siempre al entero anterior, y responde «cuántas unidades completas alcanzo a armar».

Con negativos las cuatro se comportan distinto, y conviene tenerlo claro:

| Valor | ROUND | TRUNC | CEIL | FLOOR |
| ----- | ----- | ----- | ---- | ----- |
| 9.5   | 10    | 9     | 10   | 9     |
| -9.1  | -9    | -9    | -9   | -10   |

La diferencia se ve con los números negativos. \`TRUNC\` corta hacia el cero, así que \`TRUNC(-9.1)\` da −9. \`FLOOR\` va siempre hacia el número menor, así que \`FLOOR(-9.1)\` da −10. Con valores positivos las dos coinciden, y por eso la confusión aparece recién el día que aparece un importe negativo.

## El detalle que sorprende: numeric vs double precision

En PostgreSQL, \`ROUND\` sobre un valor \`numeric\` (decimal exacto) redondea el medio hacia arriba: 2,5 pasa a 3. Sobre un \`double precision\` (decimal aproximado) aplica el llamado redondeo bancario, que lleva el medio al número par más cercano: 2,5 pasa a 2 y 3,5 pasa a 4.

\`\`\`sql
SELECT ROUND(2.5)                    AS numeric_25,  -- 3
       ROUND(2.5::double precision)  AS double_25,   -- 2
       ROUND(3.5::double precision)  AS double_35;   -- 4
\`\`\`

Además, la forma de dos argumentos \`ROUND(valor, decimales)\` **solo existe para \`numeric\`**. Por eso el dinero se guarda en columnas \`numeric(12,2)\`, como \`total_amount\`, la columna de la tabla \`orders\` con el importe del pedido: ese tipo guarda el valor exacto y redondea de forma predecible. Si el valor que tienes es \`double precision\`, conviértelo primero con \`::numeric\`.

## Errores comunes

- Redondear demasiado temprano. Si redondeas cada línea y después las sumas, el total no coincide con el total calculado en precisión completa y redondeado al final, y la diferencia crece con la cantidad de líneas. Regla práctica: calcula con toda la precisión y redondea **una sola vez**, al presentar.
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

Este es uno de los errores más caros y más silenciosos de SQL: la consulta corre, no falla y devuelve ceros. Quien no conoce la regla entrega un reporte que afirma que ningún cliente convierte, y como el cero es un resultado posible, nadie sospecha nada hasta la reunión.

## La trampa

\`\`\`sql
SELECT 1 / 2 AS resultado;  -- 0
\`\`\`

No es un error del motor. En PostgreSQL, dividir un \`integer\` por otro \`integer\` devuelve un \`integer\`, y la parte decimal se **corta hacia cero** en lugar de redondearse. Con números negativos eso significa que \`-7 / 2\` da \`-3\` y no \`-4\`.

La trampa aparece cada vez que divides columnas enteras, y en TiendaViva hay varias: \`installments\` de la tabla \`payments\` (en cuántas cuotas se pagó), \`stock\` de \`products\` (unidades disponibles), \`quantity\` de \`order_items\` (unidades compradas de ese producto) y \`rating\` de \`reviews\` (las estrellas de una reseña).

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

Basta con que **uno** de los dos operandos sea \`numeric\` para que toda la división se resuelva con decimales. Escribir \`100.0\` es la forma más corta. Escribir \`::numeric\` es la más explícita y la que se lee mejor dentro de una consulta larga, porque deja dicho que ahí hubo una conversión intencional. Las tres formas son igualmente correctas.

Atención también al orden de las operaciones: multiplicar antes de dividir evita el problema, porque agranda el numerador y el cociente entero deja de ser cero.

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

Si \`subtotal\` vale 0, \`NULLIF\` lo convierte en NULL, la división devuelve NULL y la fila sigue apareciendo en el resultado en lugar de cortar la consulta. Si prefieres mostrar 0 en lugar de NULL, envuelve la división en \`COALESCE(..., 0)\`. Cuál de las dos corresponde es una decisión de negocio, porque «no se puede calcular» y «el resultado es cero» no significan lo mismo para quien lee el reporte.

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

1. Define el denominador antes de escribir el SQL. ¿El porcentaje se calcula sobre el subtotal o sobre el total cobrado? Según cuál elijas, el número cambia, y con él la conclusión del reporte.
2. Decide si devuelves 18.00 (porcentaje) o 0.18 (proporción) y dilo en el nombre de la columna (\`_percent\` vs \`_ratio\`).
3. Redondea al final, con los decimales que pide el reporte.

## Variación porcentual

Para comparar dos importes, la fórmula es \`(nuevo - anterior) * 100 / anterior\`: la diferencia dividida por el punto de partida. Multiplicar por 100 antes de dividir evita la división entera, y si el valor anterior puede ser 0 hay que proteger el denominador otra vez con \`NULLIF\`.

## Resumen

- Una división entre dos enteros corta los decimales. Convierte uno de los dos a \`numeric\` o multiplica antes de dividir.
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

Las reglas comerciales reales casi nunca son una multiplicación limpia. Suenan más bien así: «2 % de comisión, con un mínimo de 5 y un máximo de 12», «reparte en cajas de 12 y dime cuántas unidades sobran», «cuánto se desvía este pago del promedio». Las funciones de esta lección traducen cada una de esas frases a una expresión de SQL.

## ABS: distancia sin signo

\`ABS\` devuelve el valor absoluto, es decir, el número sin su signo: tanto 30 como −30 se convierten en 30. Sirve para medir cuánto se aparta un valor de una referencia, sin que importe si se pasó o si se quedó corto:

\`\`\`sql
SELECT id, amount, ABS(amount - 500) AS desvio
FROM transactions
WHERE kind = 'withdrawal';
\`\`\`

También es la forma correcta de comparar dos importes admitiendo una tolerancia: \`ABS(a - b) <= 0.01\` dice «estos dos valores no difieren en más de un centavo», sin importar cuál de los dos es mayor.

## MOD: el resto de la división

\`MOD(a, b)\`, que también se escribe \`a % b\`, devuelve el resto de dividir \`a\` entre \`b\`. Combinado con la división entera responde preguntas de empaque: cuántos paquetes completos salen y qué queda suelto.

\`\`\`sql
SELECT stock / 12     AS cajas_completas,
       MOD(stock, 12) AS unidades_sueltas
FROM products;
\`\`\`

Aquí la división entera es justamente **lo que quieres**, porque no existe media caja: \`stock / 12\` da las cajas llenas y \`MOD(stock, 12)\` las unidades que sobran. Otro uso habitual es detectar múltiplos, por ejemplo \`MOD(x, 2) = 0\` para quedarte con los números pares. Con valores negativos, el resto conserva el signo del dividendo: \`MOD(-7, 2)\` da \`-1\`.

## POWER: potencias e interés compuesto

\`POWER(base, exponente)\` eleva a una potencia; también existe el operador \`^\`.

\`\`\`sql
SELECT ROUND(1000 * POWER(1.05, 3), 2) AS a_tres_periodos;  -- 1157.63
\`\`\`

Es la base de cualquier cálculo de crecimiento compuesto, es decir, de un crecimiento que en cada período se aplica sobre el resultado del período anterior: un 5 % mensual durante 3 meses no acumula 15 %, sino 15,76 %. Dos funciones relacionadas: \`SQRT\` calcula la raíz cuadrada y \`LOG\` sirve para trabajar en escalas logarítmicas.

## GREATEST y LEAST: pisos y techos

\`GREATEST\` y \`LEAST\` no son funciones de agregación: no miran varias filas, sino varios **valores de una misma fila**, y devuelven el mayor o el menor de ellos.

\`\`\`sql
SELECT id,
       LEAST(GREATEST(ROUND(amount * 0.015, 2), 5.00), 12.00) AS fee
FROM transactions
WHERE kind = 'withdrawal';
\`\`\`

Léelo de adentro hacia afuera: primero se calcula el 1,5 % del importe, después \`GREATEST\` impone el mínimo de 5 (si la comisión dio menos, queda en 5) y por último \`LEAST\` impone el tope de 12 (si dio más, queda en 12). Escribirlo al revés, como \`GREATEST(5.00, LEAST(12.00, ...))\`, da exactamente el mismo resultado mientras el mínimo sea menor que el máximo. Elige la versión que tu equipo lea con más facilidad.

Cuidado con los NULL: si uno de los argumentos es NULL, \`GREATEST\` y \`LEAST\` lo **ignoran** y devuelven el mayor o el menor de los demás. Se comportan distinto de una suma, donde un solo NULL entre los sumandos hace que todo el resultado sea NULL. Y no confundas \`GREATEST\` con \`MAX\`: \`MAX\` recorre muchas filas y devuelve un valor por grupo, mientras que \`GREATEST\` compara varias columnas dentro de una misma fila y devuelve un valor por fila.

## Errores comunes

- Usar \`MAX(a, b)\`: no existe con dos argumentos; es \`GREATEST(a, b)\`.
- Aplicar \`ABS\` por precaución a un importe que ya era positivo, y borrar con eso el signo negativo que identificaba a una devolución.
- Calcular interés compuesto multiplicando la tasa por la cantidad de períodos.

## Resumen

- \`ABS\` para desvíos y tolerancias; \`MOD\` para restos y múltiplos.
- \`POWER\` para crecimiento compuesto, nunca una multiplicación de tasas.
- \`GREATEST\`/\`LEAST\` aplican mínimos y topes fila por fila.
`,
  },
];
