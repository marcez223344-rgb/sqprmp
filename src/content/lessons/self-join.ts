import type { LessonDef } from "../schemas/curriculum";

const section = "self-join";

export const lessons: LessonDef[] = [
  {
    slug: "self-join-jerarquias",
    section,
    kind: "theory",
    title: "Self join: la misma tabla, dos alias",
    sort_order: 0,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["right-full-join-y-cardinalidad"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Muchas tablas se apuntan a sí mismas: una categoría cuelga de otra categoría, un empleado reporta a otro empleado, un movimiento reversa a otro movimiento. La información que necesitas está en la **misma** tabla, en **otra** fila. Para traerla, unes la tabla consigo misma: eso es un **self join**.

No hay sintaxis nueva. Es el mismo INNER JOIN o LEFT JOIN de las secciones 17 y 18; lo único que cambia es que ambos lados son la misma tabla.

## Los alias dejan de ser opcionales

En un join entre dos tablas distintas, los alias son comodidad. En un self join son **obligatorios**: sin ellos PostgreSQL no puede distinguir de cuál de las dos copias hablas.

\`\`\`sql
-- Error: "table name categories specified more than once"
SELECT name
FROM categories
INNER JOIN categories ON categories.id = categories.parent_id;
\`\`\`

Con alias, cada copia tiene su propio nombre y la consulta se lee sola:

\`\`\`sql
SELECT
  padre.name AS categoria,
  hija.name  AS subcategoria
FROM categories AS hija
INNER JOIN categories AS padre
  ON padre.id = hija.parent_id;
\`\`\`

Piensa que el motor trabaja con dos copias independientes de la tabla: una llamada \`hija\` y otra llamada \`padre\`. Elegir alias con significado (\`hija\`/\`padre\`, \`emp\`/\`jefe\`, \`rev\`/\`orig\`) vale más que cualquier comentario.

## Leer la condición en un solo sentido

La clave del self join es escribir el \`ON\` en el sentido correcto. En **TiendaViva**, \`categories.parent_id\` apunta al \`id\` de la categoría padre:

- \`ON padre.id = hija.parent_id\` → cada fila del resultado es **una subcategoría con su padre**.
- \`ON hija.parent_id = padre.id\` → exactamente lo mismo escrito al revés.

Lo que sí cambia el resultado es confundir las columnas: \`ON padre.parent_id = hija.id\` invierte la jerarquía y te devuelve los padres como si fueran hijos. No da error; da un reporte equivocado. Verifica siempre con dos o tres filas conocidas.

## Filas sin pareja: LEFT JOIN sobre sí misma

Las categorías raíz tienen \`parent_id\` en NULL: no tienen padre. Un INNER JOIN las descarta (24 filas de 30). Si el reporte debe mostrar el árbol completo, usa LEFT JOIN, igual que con dos tablas distintas:

\`\`\`sql
SELECT
  c.id,
  c.name             AS categoria,
  padre.name         AS categoria_padre
FROM categories AS c
LEFT JOIN categories AS padre
  ON padre.id = c.parent_id
ORDER BY c.id;
\`\`\`

Las 30 categorías aparecen; las 6 raíces salen con \`categoria_padre\` en NULL. Y si lo que buscas son justamente las filas «sin padre», reaparece el patrón de la sección 18:

\`\`\`sql
...
LEFT JOIN categories AS padre ON padre.id = c.parent_id
WHERE padre.id IS NULL;
\`\`\`

En este caso concreto \`WHERE c.parent_id IS NULL\` responde lo mismo y es más directo; el LEFT JOIN se gana su lugar cuando además necesitas columnas del padre en la misma consulta.

## Dos niveles, dos joins

TiendaViva tiene un árbol de dos niveles, así que llegar del producto a la categoría raíz pide dos saltos:

\`\`\`sql
SELECT
  p.name              AS producto,
  hija.name           AS subcategoria,
  raiz.name           AS categoria
FROM products AS p
INNER JOIN categories AS hija ON hija.id = p.category_id
INNER JOIN categories AS raiz ON raiz.id = hija.parent_id;
\`\`\`

Cada nivel del árbol es un JOIN más. Para jerarquías de profundidad desconocida (organigramas, árboles de comentarios) esto no alcanza: se resuelve con CTE recursivas, tema del nivel avanzado.

## Errores comunes

- Omitir los alias y recibir «table name specified more than once».
- Escribir \`ON\` con las columnas invertidas: resultado plausible pero incorrecto.
- Usar INNER JOIN cuando el reporte debía incluir las filas raíz.

## Resumen

Un self join une una tabla consigo misma con dos alias distintos. El \`ON\` conecta la clave foránea de una copia con la clave primaria de la otra. LEFT JOIN conserva las filas que no tienen pareja (las raíces del árbol).
`,
  },
  {
    slug: "self-join-emparejar-filas",
    section,
    kind: "theory",
    title: "Emparejar una fila con su fila relacionada",
    sort_order: 1,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["self-join-jerarquias"],
    dataset: "bolsillo",
    body_md: `## No todo self join es una jerarquía

En **Bolsillo**, cuando un pago se devuelve, el sistema no borra nada: deja el pago original con \`status = 'reversed'\` y crea un movimiento nuevo con \`kind = 'reversal'\` cuyo \`reversal_of\` apunta al \`id\` del pago original. Las dos filas viven en \`transactions\`.

Para un reporte de operaciones («¿cuánto tardamos en devolver el dinero?») necesitas las dos filas **en la misma fila del resultado**. Ese emparejamiento es un self join.

\`\`\`sql
SELECT
  rev.id        AS reversal_id,
  orig.id       AS original_id,
  orig.amount,
  rev.created_at - orig.created_at AS demora
FROM transactions AS rev
INNER JOIN transactions AS orig
  ON orig.id = rev.reversal_of;
\`\`\`

\`rev\` son los 297 reversos (las demás filas tienen \`reversal_of\` en NULL y la igualdad nunca se cumple, así que quedan fuera sin necesidad de filtrarlas). \`orig\` son los pagos que devolvieron.

## De dónde parte la consulta

Las dos formas son equivalentes:

\`\`\`sql
FROM transactions AS rev
INNER JOIN transactions AS orig ON orig.id = rev.reversal_of

FROM transactions AS orig
INNER JOIN transactions AS rev ON rev.reversal_of = orig.id
\`\`\`

Elige la que haga que el \`SELECT\` se lea mejor. Si el reporte es «un renglón por reverso», empezar por \`rev\` suele ser más claro; si es «pagos reversados y su devolución», empieza por \`orig\`.

## Filtrar cada copia por separado

Cada alias se filtra por su cuenta, y ahí está la potencia del patrón:

\`\`\`sql
SELECT rev.id, orig.id, orig.amount
FROM transactions AS rev
INNER JOIN transactions AS orig ON orig.id = rev.reversal_of
WHERE orig.kind = 'card_payment'     -- el original fue con tarjeta
  AND rev.status = 'completed';      -- la devolución se acreditó
\`\`\`

\`orig.kind\` y \`rev.status\` hablan de filas distintas de la misma tabla. Sin alias, esta consulta sería imposible de escribir.

## Calcular entre las dos filas

Una vez emparejadas, puedes restarlas, compararlas o agregarlas:

\`\`\`sql
SELECT
  (extract(epoch FROM (rev.created_at - orig.created_at)) / 3600)::int AS horas,
  count(*) AS reversos
FROM transactions AS rev
INNER JOIN transactions AS orig ON orig.id = rev.reversal_of
GROUP BY horas
ORDER BY horas;
\`\`\`

Restar dos \`timestamptz\` da un \`interval\`; \`extract(epoch ...)\` lo convierte a segundos y dividir entre 3600 lo lleva a horas.

## Combinar con otras tablas

Nada impide agregar joins normales después del self join. Para saber en qué comercios se concentran las devoluciones:

\`\`\`sql
SELECT m.name, count(*) AS reversos
FROM transactions AS rev
INNER JOIN transactions AS orig ON orig.id = rev.reversal_of
INNER JOIN merchants AS m ON m.id = orig.merchant_id
GROUP BY m.id, m.name
ORDER BY reversos DESC;
\`\`\`

Nota que el comercio se toma de \`orig\`: es el pago original el que identifica dónde ocurrió la operación.

## Cuidado con las monedas

Bolsillo tiene cuentas en varias monedas. \`count(*)\` es seguro; \`sum(amount)\` mezclando ARS, MXN y USD no significa nada. Si necesitas importes, filtra una moneda o convierte con \`fx_rates\`.

## Resumen

El self join también sirve para poner dos filas relacionadas de la misma tabla una al lado de la otra. Cada alias se filtra y se calcula por separado, y el resultado se combina con otras tablas como cualquier join.
`,
  },
  {
    slug: "self-join-comparar-filas",
    section,
    kind: "theory",
    title: "Comparar filas entre sí y evitar pares duplicados",
    sort_order: 2,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["self-join-emparejar-filas"],
    dataset: "tiendaviva",
    body_md: `## Comparar cada fila con las demás

El tercer uso del self join no sigue ninguna clave foránea: compara filas de la misma tabla entre sí. «Productos del mismo vendedor en la misma categoría con precios casi iguales» (posibles publicaciones duplicadas) es una pregunta de este tipo.

La condición de unión ya no es \`clave = clave\`, sino los atributos que definen «parecido»:

\`\`\`sql
SELECT a.id, b.id, a.list_price, b.list_price
FROM products AS a
INNER JOIN products AS b
  ON b.seller_id   = a.seller_id
 AND b.category_id = a.category_id;
\`\`\`

Esta consulta tiene dos problemas graves, y los dos son clásicos.

## Problema 1: cada fila se une consigo misma

Nada impide que \`a\` y \`b\` sean la **misma** fila: el producto 456 tiene el mismo vendedor y la misma categoría que el producto 456. El resultado se llena de pares inútiles.

## Problema 2: pares espejados

Si los productos 456 y 684 cumplen la condición, aparecen **dos** veces: una como (456, 684) y otra como (684, 456). Son el mismo hallazgo contado dos veces; si luego cuentas o sumas, todos los números quedan al doble.

## La solución: una desigualdad en el ON

Agregar \`b.id > a.id\` resuelve los dos problemas de una vez:

\`\`\`sql
SELECT
  a.seller_id,
  a.id AS producto_a,
  b.id AS producto_b
FROM products AS a
INNER JOIN products AS b
  ON b.seller_id   = a.seller_id
 AND b.category_id = a.category_id
 AND b.id > a.id;
\`\`\`

- \`b.id > a.id\` es falso cuando \`a\` y \`b\` son la misma fila: desaparece el auto-emparejamiento.
- De cada par espejado sobrevive solo la versión en la que el segundo \`id\` es mayor.

\`b.id <> a.id\` **no** alcanza: elimina el auto-emparejamiento pero deja los espejos. Usa siempre la desigualdad estricta \`<\` o \`>\` cuando el par no tenga orden propio; \`<>\` es correcto cuando sí lo tiene (por ejemplo, «pagos de A antes que B», donde la dirección importa).

## Cuenta las filas antes de confiar

Un self join sin condición suficiente crece de forma cuadrática: 1500 productos sin \`ON\` útil son 2 250 000 filas. Antes de agregar columnas al \`SELECT\`, ejecuta \`count(*)\` y pregúntate si el número tiene sentido; si se parece al cuadrado del tamaño de la tabla, falta una condición.

## Cuándo una función de ventana es mejor

Comparar una fila con la **anterior** de su grupo (el pago previo del mismo usuario, el saldo del mes pasado) se puede hacer con self join y una subconsulta de máximos, pero es engorroso y lento. Para eso están \`LAG\`, \`LEAD\` y \`ROW_NUMBER\` (sección 27): una sola pasada, sin duplicar filas.

Guía rápida:

| Necesitas | Herramienta |
| --- | --- |
| La fila padre o la fila referenciada | Self join |
| Todos los pares que cumplen una condición | Self join + desigualdad |
| La fila anterior o siguiente en un orden | Función de ventana |
| Un ranking dentro de cada grupo | Función de ventana |

## Errores comunes

- Olvidar la desigualdad y duplicar cada par (y cada total).
- Usar \`<>\` cuando el par no tiene dirección: los espejos sobreviven.
- Comparar precios con \`=\` en columnas \`numeric\` esperando encontrar «casi iguales»: usa \`abs(a.list_price - b.list_price) <= 0.05 * least(a.list_price, b.list_price)\`.

## Resumen

Para comparar filas de una tabla entre sí, une la tabla consigo misma por los atributos que definen «parecido» y agrega una desigualdad de ids. Sin ella obtienes auto-emparejamientos y pares espejados que inflan cualquier conteo.
`,
  },
];
