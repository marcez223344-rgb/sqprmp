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

Muchas tablas se apuntan a sí mismas: una categoría cuelga de otra categoría, un empleado reporta a otro empleado, un movimiento de dinero anula a otro movimiento. En todos esos casos la información que necesitas está en la **misma** tabla, pero en **otra** fila. Para traerla se une la tabla consigo misma, y esa operación se llama **self join** (en inglés, «unión de una tabla con ella misma»).

No hay sintaxis nueva. Es el mismo INNER JOIN o LEFT JOIN de las secciones 17 y 18; lo único que cambia es que ambos lados son la misma tabla.

## Los alias dejan de ser opcionales

Un **alias** es el nombre corto que le das a una tabla dentro de la consulta con \`AS\`. En un join entre dos tablas distintas, usarlo es una comodidad. En un self join es **obligatorio**, porque sin alias PostgreSQL no tiene forma de saber a cuál de las dos copias de la tabla te refieres en cada columna.

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

Piensa que el motor trabaja con dos copias independientes de la misma tabla: una se llama \`hija\` y la otra \`padre\`, y cada una se filtra y se lee por separado. Elegir alias con significado —\`hija\` y \`padre\`, \`emp\` y \`jefe\`, \`rev\` y \`orig\`— hace que la consulta se entienda sin necesidad de comentarios.

## Leer la condición en un solo sentido

La clave del self join es escribir la condición del \`ON\` en el sentido correcto. En **TiendaViva**, \`parent_id\` es una columna de la tabla \`categories\` que apunta a la columna \`id\` de esa misma tabla. En términos de negocio significa «esta categoría cuelga de esta otra»: por ejemplo, la subcategoría «Celulares» guarda en \`parent_id\` el \`id\` de «Tecnología».

- \`ON padre.id = hija.parent_id\` → cada fila del resultado es **una subcategoría con su padre**.
- \`ON hija.parent_id = padre.id\` → exactamente lo mismo escrito al revés.

Lo que sí cambia el resultado es confundir las columnas. \`ON padre.parent_id = hija.id\` invierte la jerarquía y devuelve las categorías padre en el lugar de las hijas. La consulta no falla y el resultado tiene la forma esperada, así que lo único que notas es un reporte equivocado. Verifica siempre el sentido del \`ON\` con dos o tres filas cuya jerarquía ya conozcas.

## Filas sin pareja: LEFT JOIN sobre sí misma

Las categorías raíz, las que están en el nivel más alto del árbol, tienen \`parent_id\` en NULL porque no cuelgan de ninguna otra. Un INNER JOIN las descarta y deja 24 filas de las 30, sin ningún aviso de que faltan seis. Si el reporte tiene que mostrar el árbol completo, usa LEFT JOIN, igual que harías con dos tablas distintas:

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

En este caso concreto, \`WHERE c.parent_id IS NULL\` responde lo mismo y es más directo, porque la información de «no tiene padre» ya está en la propia fila. El LEFT JOIN se justifica cuando además necesitas mostrar columnas de la categoría padre en la misma consulta.

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

Cada nivel del árbol agrega un JOIN. Ese método funciona mientras sepas de antemano cuántos niveles hay. Para jerarquías de profundidad desconocida, como un organigrama o un árbol de comentarios, no alcanza, porque no puedes escribir un número fijo de joins: esos casos se resuelven con CTE recursivas (CTE, por *common table expression*, el bloque \`WITH\` que nombra un paso intermedio y que en su forma recursiva puede llamarse a sí mismo), tema del nivel avanzado.

## Errores comunes

- Omitir los alias y recibir «table name specified more than once».
- Escribir \`ON\` con las columnas invertidas: resultado plausible pero incorrecto.
- Usar INNER JOIN cuando el reporte debía incluir las filas raíz.

## Resumen

Un self join une una tabla consigo misma usando dos alias distintos. La condición del \`ON\` conecta la clave foránea (FK, por *foreign key*) de una copia con la clave primaria (PK, por *primary key*) de la otra, es decir, la columna que apunta con la columna que identifica. Un LEFT JOIN conserva además las filas que no encontraron pareja, que en este caso son las categorías raíz del árbol.
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

En **Bolsillo**, cuando un pago se devuelve, el sistema no borra nada. Deja el pago original con \`status = 'reversed'\` y crea un movimiento nuevo con \`kind = 'reversal'\`. Ese movimiento nuevo guarda en la columna \`reversal_of\` el \`id\` del pago original, es decir, deja escrito a qué pago corresponde la devolución. Las dos filas, el pago y su reverso, viven en la misma tabla \`transactions\`.

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

El alias \`rev\` representa a los 297 reversos. Las demás filas de \`transactions\` tienen \`reversal_of\` en NULL, y una comparación con NULL nunca da verdadero, así que quedan fuera del resultado sin que haga falta filtrarlas. El alias \`orig\` representa a los pagos originales que fueron devueltos.

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

\`orig.kind\` describe el medio de pago del movimiento original y \`rev.status\` describe el estado de la devolución: son dos filas distintas de la misma tabla, y cada una tiene su propia condición. Sin alias no habría forma de escribir esta consulta, porque las dos columnas se llamarían igual.

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

Restar dos valores \`timestamptz\` devuelve un \`interval\`, que es una duración y no un número. \`extract(epoch FROM ...)\` convierte esa duración a segundos, y dividir entre 3600 la expresa en horas, que es la unidad en la que se mide la demora de una devolución.

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

Fíjate en que el comercio se toma de \`orig\` y no de \`rev\`. La columna \`merchant_id\` del reverso puede estar vacía, y en todo caso es el pago original el que dice en qué comercio ocurrió la compra que después se devolvió.

## Cuidado con las monedas

Bolsillo tiene cuentas en varias monedas, y cada movimiento está expresado en la moneda de su cuenta. Contar con \`count(*)\` es seguro, porque una operación es una operación en cualquier moneda. En cambio, \`sum(amount)\` sobre movimientos en ARS (pesos argentinos), MXN (pesos mexicanos) y USD (dólares) devuelve un número que no corresponde a ninguna cantidad de dinero real. Si necesitas importes, filtra una sola moneda o conviértelos con la tabla \`fx_rates\` (por *foreign exchange rates*, tipos de cambio).

## Resumen

El self join también sirve para poner dos filas relacionadas de la misma tabla una al lado de la otra, aunque entre ellas no haya ninguna jerarquía. Cada alias se filtra y se calcula por separado, y el resultado se puede combinar con otras tablas igual que cualquier otro join.
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

El tercer uso del self join no sigue ninguna clave foránea (FK, por *foreign key*, la columna que apunta a otra fila). Lo que hace es comparar filas de la misma tabla entre sí para encontrar parejas que cumplen una condición. «Productos del mismo vendedor, en la misma categoría y con precios casi iguales», que son posibles publicaciones duplicadas, es una pregunta de este tipo.

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

Nada impide que \`a\` y \`b\` sean la **misma** fila, porque el producto 456 tiene, por supuesto, el mismo vendedor y la misma categoría que el producto 456. El resultado se llena de pares de un producto consigo mismo, que no son hallazgos y además suman a cualquier conteo.

## Problema 2: pares espejados

Si los productos 456 y 684 cumplen la condición, la pareja aparece **dos** veces: una como (456, 684) y otra como (684, 456). Las dos filas describen el mismo hallazgo, así que cualquier conteo o suma que hagas después queda al doble del valor real.

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

Escribir \`b.id <> a.id\` **no** alcanza: elimina el emparejamiento de una fila consigo misma, pero deja pasar las dos versiones espejadas de cada pareja. Usa la desigualdad estricta \`<\` o \`>\` siempre que la pareja no tenga un orden propio. \`<>\` sí es correcto cuando la pareja tiene dirección y las dos versiones significan cosas distintas, por ejemplo al buscar «pagos de A anteriores a un pago de B».

## Cuenta las filas antes de confiar

Un self join con una condición demasiado floja crece de forma cuadrática, es decir, cada fila se combina con todas las demás: 1500 productos sin un \`ON\` que los restrinja producen 2 250 000 filas, que es 1500 por 1500. Antes de agregar columnas al \`SELECT\`, ejecuta \`count(*)\` y comprueba si el número es razonable. Si se parece al cuadrado de la cantidad de filas de la tabla, falta una condición en el \`ON\`.

## Cuándo una función de ventana es mejor

Comparar una fila con la **anterior** de su grupo —el pago previo del mismo usuario, el saldo del mes pasado— se puede resolver con un self join más una subconsulta que busque el máximo anterior, pero esa consulta es larga de escribir y lenta de ejecutar. Para eso existen las funciones de ventana \`LAG\`, \`LEAD\` y \`ROW_NUMBER\` (sección 27), que recorren los datos una sola vez y no duplican filas.

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
- Comparar precios con \`=\` esperando encontrar publicaciones «casi iguales». La igualdad exacta deja fuera dos precios que difieren en un centavo. Para una tolerancia del 5 %, escribe \`abs(a.list_price - b.list_price) <= 0.05 * least(a.list_price, b.list_price)\`.

## Resumen

Para comparar filas de una tabla entre sí, une la tabla consigo misma por los atributos que definen qué significa «parecido» y agrega una desigualdad entre los identificadores, como \`b.id > a.id\`. Sin esa desigualdad, el resultado incluye cada fila emparejada consigo misma y cada pareja repetida en los dos sentidos, y ambas cosas inflan cualquier conteo.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes resolver jerarquías con un self join, comparar filas de una misma tabla y evitar pares repetidos o filas emparejadas consigo mismas.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 20 · Joins de múltiples tablas. Vas a encadenar tres o más tablas sin duplicar importes.

**Para practicar (opcional):** ¿Qué pares de restaurantes de Pídelo comparten ciudad y tipo de cocina? Une \`restaurants\` consigo misma y usa la condición \`a.id < b.id\` para no repetir pares.
`,
  },
];
